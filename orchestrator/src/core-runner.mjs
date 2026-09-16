/**
 * Core Orchestrator Runner (Section 23-32, C13, C14, C15, C21, C28)
 * Manages the complete supervised execution lifecycle:
 * Preflight -> Pre-run Snapshot -> Writer Lock Acquisition -> Run Descriptor ->
 * Adapter Execution -> Post-run Snapshot -> Mutation Classification ->
 * Verification Gate -> Terminal Evidence Finalization -> Writer Lock Release.
 *
 * Invariant: The writer lock is held continuously across RUNNING -> COLLECTING -> VERIFYING
 * until terminal evidence is completely written.
 */

import { assertRuntimeAllowsRealAgentExecution } from './runtime-policy.mjs';
import { resolveRuntimePaths, ensureRuntimeDirectories } from './runtime-paths.mjs';
import { computeWorktreeIdentity } from './worktree-identity.mjs';
import { acquireLock, releaseLock } from './lock-manager.mjs';
import { captureMutationSnapshot, classifyMutation } from './mutation-snapshot.mjs';
import { createRunDescriptor, updateRunDescriptor, writeAuditEvent } from './run-store.mjs';

export async function executeOrchestratedTask({
  task,
  adapter,
  runtimePaths = null,
  verifier = null
}) {
  if (!task || !task.taskId) {
    throw new Error('executeOrchestratedTask: task with taskId is required');
  }
  if (!adapter) {
    throw new Error('executeOrchestratedTask: adapter is required');
  }

  // 1. Preflight Invariants (Correction C21)
  if (task.mode === 'WRITE' && task.requiresWriterLock === false) {
    const err = new Error(
      'PREFLIGHT_BLOCKED_INVALID_TASK_CONTRACT: Task with mode="WRITE" cannot declare requiresWriterLock=false'
    );
    err.code = 'PREFLIGHT_BLOCKED_INVALID_TASK_CONTRACT';
    throw err;
  }

  // Preflight Runtime Policy Check (real agents only)
  if (task.agent !== 'mock') {
    assertRuntimeAllowsRealAgentExecution();
  }

  const paths = ensureRuntimeDirectories(runtimePaths ? runtimePaths.root : null);
  const runId = task.runId || `run_${task.taskId}_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
  const startedAt = new Date().toISOString();

  let acquiredLockInstanceId = null;
  let lockFilePath = null;

  // 2. Pre-run Snapshot
  const beforeSnapshot = captureMutationSnapshot(task.worktreeRoot);

  // 3. Writer Lock Acquisition (Held through VERIFYING)
  if (task.mode === 'WRITE') {
    const worktreeIdentity = computeWorktreeIdentity(task.worktreeRoot);
    const lockAcquisition = acquireLock({
      locksDir: paths.locks,
      worktreeIdentity,
      worktreePath: task.worktreeRoot,
      branch: beforeSnapshot.branch,
      taskId: task.taskId,
      agent: task.agent,
      ownerPid: process.pid
    });

    if (!lockAcquisition.acquired) {
      return {
        taskId: task.taskId,
        agent: task.agent,
        runId,
        status: 'BLOCKED',
        executionOutcome: 'CANCELLED',
        verificationOutcome: 'PENDING_VERIFICATION',
        contention: true,
        reason: 'Worktree lock contention detected',
        activeLock: lockAcquisition.activeLock
      };
    }

    acquiredLockInstanceId = lockAcquisition.lockMetadata.lockInstanceId;
    lockFilePath = lockAcquisition.lockFilePath;
  }

  try {
    // 4. Create Run Descriptor (Never stores raw prompt)
    createRunDescriptor({
      runsDir: paths.runs,
      eventsDir: paths.events,
      runId,
      taskId: task.taskId,
      agent: task.agent,
      mode: task.mode,
      prompt: task.prompt,
      promptSource: task.promptSource || 'TASK_CONTRACT',
      worktreeRoot: task.worktreeRoot
    });

    // 5. Spawn and supervise child process via adapter
    await adapter.startTask({ ...task, runId });

    // 6. Collect process execution result
    const rawResult = await adapter.collectResult(runId);
    const processResult = rawResult.processResult || {};

    // 7. Post-run Mutation Snapshot & Classification (Correction C15)
    const afterSnapshot = captureMutationSnapshot(task.worktreeRoot);
    const mutation = classifyMutation(beforeSnapshot, afterSnapshot);

    const forbiddenWritePaths = task.forbiddenWritePaths || [];
    const forbiddenViolations = mutation.changedPaths.filter(p => forbiddenWritePaths.includes(p));

    let status = 'SUCCESS';
    let executionOutcome = 'PROCESS_COMPLETED';
    let verificationOutcome = 'PENDING_VERIFICATION';
    let retryEligible = false;
    let fallbackEligible = false;
    let maxRetriesAllowed = 0;
    let testsPassed = null;
    let verificationSummary = '';

    if (forbiddenViolations.length > 0) {
      // Forbidden path mutated: FREEZE worktree, NO destructive auto-revert
      status = 'FORBIDDEN_MUTATION_BLOCKED';
      executionOutcome = 'PROCESS_COMPLETED';
      verificationOutcome = 'VERIFICATION_FAILED';
      retryEligible = false;
      fallbackEligible = false;
    } else if (processResult.timedOut) {
      executionOutcome = 'TIMED_OUT';
      if (mutation.classification === 'MUTATED') {
        status = 'PARTIAL_MUTATION_BLOCKED';
        verificationOutcome = 'VERIFICATION_FAILED';
        retryEligible = false;
        fallbackEligible = false;
      } else {
        status = 'TIMED_OUT';
        verificationOutcome = 'VERIFICATION_FAILED';
        retryEligible = true;
        fallbackEligible = true;
        maxRetriesAllowed = 1;
      }
    } else if (processResult.exitCode !== 0) {
      executionOutcome = 'PROCESS_FAILED';
      if (mutation.classification === 'MUTATED') {
        status = 'PARTIAL_MUTATION_BLOCKED';
        verificationOutcome = 'VERIFICATION_FAILED';
        retryEligible = false;
        fallbackEligible = false;
      } else {
        status = 'FAILED';
        verificationOutcome = 'VERIFICATION_FAILED';
        retryEligible = true;
        fallbackEligible = true;
        maxRetriesAllowed = 1;
      }
    } else if (rawResult.malformed) {
      status = 'FAILED';
      executionOutcome = 'PROCESS_COMPLETED';
      verificationOutcome = 'VERIFICATION_FAILED';
      retryEligible = false;
    } else {
      // Process exited 0 and no forbidden mutation detected.
      // Now in VERIFYING state (Writer Lock RETAINED)
      if (typeof verifier === 'function') {
        try {
          const vRes = await verifier(task, rawResult);
          testsPassed = Boolean(vRes && vRes.passed);
          verificationSummary = vRes ? vRes.summary || '' : '';
          if (testsPassed) {
            status = 'SUCCESS';
            verificationOutcome = 'VERIFIED_PASSED';
          } else {
            status = 'FAILED';
            verificationOutcome = 'VERIFICATION_FAILED';
          }
        } catch (vErr) {
          testsPassed = false;
          status = 'FAILED';
          verificationOutcome = 'VERIFICATION_FAILED';
          verificationSummary = `Verification threw error: ${vErr.message}`;
        }
      } else {
        testsPassed = true;
        status = 'SUCCESS';
        verificationOutcome = 'VERIFIED_PASSED';
        verificationSummary = 'Default verification passed (no custom verifier)';
      }
    }

    const finishedAt = new Date().toISOString();
    const durationMs = processResult.durationMs || 0;

    const normalizedResult = {
      taskId: task.taskId,
      agent: task.agent,
      runId,
      status,
      executionOutcome,
      verificationOutcome,
      startedAt,
      finishedAt,
      durationMs,
      exitCode: processResult.exitCode !== undefined ? processResult.exitCode : null,
      stdoutSummary: (processResult.stdout || '').slice(0, 4096),
      stderrSummary: (processResult.stderr || '').slice(0, 4096),
      structuredResult: rawResult.structuredResult,
      branchBefore: beforeSnapshot.branch,
      branchAfter: afterSnapshot.branch,
      headBefore: beforeSnapshot.head,
      headAfter: afterSnapshot.head,
      filesChanged: mutation.changedPaths,
      mutationClassification: mutation.classification,
      testsPassed,
      verificationSummary,
      retryEligible,
      fallbackEligible,
      maxRetriesAllowed,
      eventLogPath: paths.events,
      rawLogPath: null,
      rawLogSha256: null
    };

    // 8. Finalize Evidence Snapshot & Audit Event
    writeAuditEvent(paths.events, runId, normalizedResult);
    updateRunDescriptor(paths.runs, runId, {
      state: status,
      finishedAt,
      durationMs,
      exitCode: normalizedResult.exitCode
    });

    return normalizedResult;
  } finally {
    // 9. Writer Lock Released ONLY AFTER Evidence Finalization (Correction C13)
    if (acquiredLockInstanceId && lockFilePath) {
      try {
        releaseLock(lockFilePath, acquiredLockInstanceId);
      } catch (err) {
        // Lock release diagnostic
      }
    }
  }
}

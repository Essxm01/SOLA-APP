/**
 * Core Orchestrator Runner (Section 23-32, C13, C14, C15, C21, C28-C46)
 * Manages the complete supervised execution lifecycle:
 * Preflight -> Writer Lock Acquisition (C32) -> Pre-run Snapshot (C32) -> Run Descriptor ->
 * Adapter Execution -> Post-run Snapshot -> Mutation Classification ->
 * Boundary & Context Validation (C30, C33, C34, C46) ->
 * Verification Gate (C36) -> Terminal Evidence Finalization (C37) -> Writer Lock Release.
 *
 * Invariant: The writer lock is held continuously across RUNNING -> COLLECTING -> VERIFYING
 * until terminal evidence is completely written.
 */

import crypto from 'node:crypto';
import { resolveRuntimePaths, ensureRuntimeDirectories } from './runtime-paths.mjs';
import { computeWorktreeIdentity } from './worktree-identity.mjs';
import { acquireLock, releaseLock } from './lock-manager.mjs';
import { captureMutationSnapshot, classifyMutation } from './mutation-snapshot.mjs';
import { createRunDescriptor, updateRunDescriptor, writeAuditEvent } from './run-store.mjs';
import { validatePreflight } from './preflight-validator.mjs';
import { validateWriteBoundaries } from './boundary-validator.mjs';

export function finalizeTerminalEvidence({
  runsDir,
  eventsDir,
  runId,
  result,
  descriptorUpdate
}) {
  let auditEventWritten = false;
  let descriptorUpdated = false;

  try {
    writeAuditEvent(eventsDir, runId, result);
    auditEventWritten = true;
  } catch (err) {
    throw new Error(`EVIDENCE_FINALIZATION_FAILED: Failed to write audit event: ${err.message}`);
  }

  try {
    updateRunDescriptor(runsDir, runId, descriptorUpdate);
    descriptorUpdated = true;
  } catch (err) {
    throw new Error(`EVIDENCE_FINALIZATION_FAILED: Failed to update run descriptor: ${err.message}`);
  }

  return {
    auditEventWritten,
    descriptorUpdated,
    terminalEvidenceComplete: auditEventWritten && descriptorUpdated
  };
}

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

  // 1. Preflight Invariants & Context Validation (C21, C23, C29, C45, C47, C48, C59)
  validatePreflight({
    task,
    adapter,
    currentTaskMetadata: task.currentTaskMetadata || null
  });

  const paths = (runtimePaths && runtimePaths.runs && runtimePaths.events && runtimePaths.locks)
    ? runtimePaths
    : ensureRuntimeDirectories(runtimePaths ? runtimePaths.root : null);
  const runId = task.runId || `run_${crypto.randomUUID()}`;
  const startedAt = new Date().toISOString();


  let acquiredLockInstanceId = null;
  let lockFilePath = null;
  let beforeSnapshot = null;
  let retainLock = false;
  let lockRetentionReason = null;

  // 2. Worktree Activity Lock Acquisition (C32, C49: Lock MUST precede pre-run baseline snapshot for all modes)
  const worktreeIdentity = computeWorktreeIdentity(task.worktreeRoot);
  const lockAcquisition = acquireLock({
    locksDir: paths.locks,
    worktreeIdentity,
    worktreePath: task.worktreeRoot,
    branch: task.expectedBranch || 'unknown',
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

  // 3. Pre-run Snapshot (C32: Captured under lock)
  beforeSnapshot = captureMutationSnapshot(task.worktreeRoot);

  try {
    // 4. Create Run Descriptor (Never stores raw prompt, C20, C44)
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

    // 7. Post-run Mutation Snapshot & Classification (C15, C31)
    const afterSnapshot = captureMutationSnapshot(task.worktreeRoot);
    const mutation = classifyMutation(beforeSnapshot, afterSnapshot);

    let status = 'SUCCESS';
    let executionOutcome = 'PROCESS_COMPLETED';
    if (processResult.timedOut) {
      executionOutcome = 'TIMED_OUT';
    } else if (processResult.exitCode !== 0 && processResult.exitCode !== null) {
      executionOutcome = 'PROCESS_FAILED';
    } else if (processResult.spawnError) {
      executionOutcome = 'PROCESS_FAILED';
    }

    let verificationOutcome = 'PENDING_VERIFICATION';
    let retryEligible = false;
    let fallbackEligible = false;
    let maxRetriesAllowed = 0;
    let testsPassed = null;
    let verificationSummary = '';

    // C34: Context & Branch/HEAD Immutability
    const branchMismatch = beforeSnapshot.branch !== afterSnapshot.branch;
    const headMismatch = beforeSnapshot.head !== afterSnapshot.head;

    // C55: Child process aliveness check
    if (processResult.processStillAlive || processResult.terminationStatus === 'TERMINATION_FAILED') {
      status = 'PROCESS_STILL_ALIVE_BLOCKED';
      verificationOutcome = 'VERIFICATION_FAILED';
      verificationSummary = 'Child process could not be terminated and remains alive; activity lock retained';
      retryEligible = false;
      fallbackEligible = false;
      retainLock = true;
      lockRetentionReason = 'LOCK_RETAINED_DUE_TO_LIVE_PROCESS';
    }
    // C34: Context & Branch/HEAD Immutability
    else if (branchMismatch || headMismatch) {
      status = 'CONTEXT_MISMATCH';
      verificationOutcome = 'VERIFICATION_FAILED';
      verificationSummary = `Branch or HEAD changed unexpectedly (branch: ${beforeSnapshot.branch} -> ${afterSnapshot.branch}, HEAD: ${beforeSnapshot.head} -> ${afterSnapshot.head})`;
      retryEligible = false;
      fallbackEligible = false;
    }
    // C30, C58: READ_ONLY and REVIEW Immutability (preserves executionOutcome)
    else if ((task.mode === 'READ_ONLY' || task.mode === 'REVIEW') && mutation.classification !== 'ZERO_MUTATION') {
      status = 'READ_ONLY_MUTATION_BLOCKED';
      verificationOutcome = 'VERIFICATION_FAILED';
      verificationSummary = `Mutation detected in ${task.mode} mode: ${mutation.changedPaths.join(', ')}`;
      retryEligible = false;
      fallbackEligible = false;
    }
    // C46: Fail-closed on UNKNOWN mutation classification
    else if (mutation.classification === 'UNKNOWN') {
      status = 'FAILED';
      verificationOutcome = 'VERIFICATION_FAILED';
      verificationSummary = 'Mutation classification is UNKNOWN (fail closed)';
      retryEligible = false;
      fallbackEligible = false;
    }
    // Process timed out
    else if (executionOutcome === 'TIMED_OUT') {
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
    }
    // Process failed with non-zero exit code or spawn error
    else if (executionOutcome === 'PROCESS_FAILED') {
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
    }
    // Malformed output
    else if (rawResult.malformed) {
      verificationOutcome = 'VERIFICATION_FAILED';
      if (mutation.classification !== 'ZERO_MUTATION') {
        status = 'PARTIAL_MUTATION_BLOCKED';
        verificationSummary = 'Malformed agent output with mutations detected on disk';
        retryEligible = false;
        fallbackEligible = false;
      } else {
        status = 'FAILED';
        verificationSummary = 'Malformed agent output';
        retryEligible = false;
        fallbackEligible = false;
      }
    }
    // Process exited 0 with valid output: check write boundaries (C33)
    else {
      const boundaryCheck = validateWriteBoundaries({
        changedPaths: mutation.changedPaths,
        allowedWritePaths: task.allowedWritePaths || [],
        forbiddenWritePaths: task.forbiddenWritePaths || [],
        unrestrictedSandbox: Boolean(task.unrestrictedSandbox)
      });

      if (!boundaryCheck.valid) {
        status = 'FORBIDDEN_MUTATION_BLOCKED';
        verificationOutcome = 'VERIFICATION_FAILED';
        verificationSummary = boundaryCheck.reason || 'Write boundary violation';
        retryEligible = false;
        fallbackEligible = false;
      } else {
        // Verification Gate (Activity Lock RETAINED)
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
        } else if (task.mode === 'WRITE') {
          testsPassed = false;
          status = 'FAILED';
          verificationOutcome = 'VERIFICATION_CONFIGURATION_MISSING';
          verificationSummary = 'WRITE mode requires an explicit verifier function';
          retryEligible = false;
          fallbackEligible = false;
        } else {
          testsPassed = true;
          status = 'SUCCESS';
          verificationOutcome = 'VERIFIED_PASSED';
          verificationSummary = 'Read-only verification passed (zero mutations confirmed)';
        }
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
      lockRetained: retainLock,
      lockRetentionReason: lockRetentionReason || null,
      eventLogPath: paths.events,
      rawLogPath: null,
      rawLogSha256: null
    };

    // 8. Finalize Evidence Snapshot & Audit Event (C56)
    try {
      finalizeTerminalEvidence({
        runsDir: paths.runs,
        eventsDir: paths.events,
        runId,
        result: normalizedResult,
        descriptorUpdate: {
          state: status,
          finishedAt,
          durationMs,
          exitCode: normalizedResult.exitCode
        }
      });
    } catch (evidenceErr) {
      retainLock = true;
      lockRetentionReason = 'LOCK_RETAINED_DUE_TO_EVIDENCE_FAILURE';
      normalizedResult.lockRetained = true;
      normalizedResult.lockRetentionReason = lockRetentionReason;
      throw evidenceErr;
    }

    return normalizedResult;
  } catch (error) {
    if (error.message && error.message.startsWith('EVIDENCE_FINALIZATION_FAILED')) {
      retainLock = true;
      lockRetentionReason = 'LOCK_RETAINED_DUE_TO_EVIDENCE_FAILURE';
      throw error;
    }

    // C37: Exception terminal finalization BEFORE lock release
    let afterSnapshot = null;
    let mutation = { classification: 'UNKNOWN', changedPaths: [] };
    try {
      afterSnapshot = captureMutationSnapshot(task.worktreeRoot);
      if (beforeSnapshot && afterSnapshot) {
        mutation = classifyMutation(beforeSnapshot, afterSnapshot);
      }
    } catch (_snapErr) {
      // Snapshot capture on failure may not be possible if repo is corrupt
    }

    const finishedAt = new Date().toISOString();
    const normalizedResult = {
      taskId: task.taskId,
      agent: task.agent,
      runId,
      status: 'FAILED',
      executionOutcome: 'RUNNER_EXCEPTION',
      verificationOutcome: 'VERIFICATION_FAILED',
      startedAt,
      finishedAt,
      durationMs: Date.now() - new Date(startedAt).getTime(),
      exitCode: null,
      stdoutSummary: '',
      stderrSummary: error.message || 'Unknown runner exception',
      structuredResult: null,
      branchBefore: beforeSnapshot ? beforeSnapshot.branch : null,
      branchAfter: afterSnapshot ? afterSnapshot.branch : null,
      headBefore: beforeSnapshot ? beforeSnapshot.head : null,
      headAfter: afterSnapshot ? afterSnapshot.head : null,
      filesChanged: mutation.changedPaths,
      mutationClassification: mutation.classification,
      testsPassed: false,
      verificationSummary: `Execution aborted due to exception: ${error.message}`,
      retryEligible: false,
      fallbackEligible: false,
      maxRetriesAllowed: 0,
      lockRetained: retainLock,
      lockRetentionReason: lockRetentionReason || null,
      eventLogPath: paths.events,
      rawLogPath: null,
      rawLogSha256: null
    };

    try {
      finalizeTerminalEvidence({
        runsDir: paths.runs,
        eventsDir: paths.events,
        runId,
        result: normalizedResult,
        descriptorUpdate: {
          state: 'FAILED',
          finishedAt,
          durationMs: normalizedResult.durationMs,
          exitCode: null
        }
      });
    } catch (evidenceErr) {
      retainLock = true;
      lockRetentionReason = 'LOCK_RETAINED_DUE_TO_EVIDENCE_FAILURE';
      normalizedResult.lockRetained = true;
      normalizedResult.lockRetentionReason = lockRetentionReason;
      throw evidenceErr;
    }

    return normalizedResult;
  } finally {
    // 9. Activity Lock Released ONLY AFTER Evidence Finalization (C13, C37, C57)
    // Retained if live process remains or evidence finalization failed (C55, C56)
    if (acquiredLockInstanceId && lockFilePath && !retainLock) {
      releaseLock(lockFilePath, acquiredLockInstanceId);
    }
  }
}

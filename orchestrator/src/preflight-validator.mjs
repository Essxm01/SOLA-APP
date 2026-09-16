/**
 * Preflight Validator (Section 12, C6, C21, C23, C29, C45)
 * Enforces non-negotiable checks before any execution agent process is launched.
 */

import { execFileSync } from 'node:child_process';
import path from 'node:path';
import { assertRuntimeAllowsRealAgentExecution } from './runtime-policy.mjs';

export function validateSafeIdentifier(id, fieldName = 'identifier') {
  if (typeof id !== 'string' || !/^[A-Za-z0-9][A-Za-z0-9._-]{0,127}$/.test(id)) {
    const err = new Error(`PREFLIGHT_BLOCKED_INVALID_IDENTIFIER: ${fieldName} must match ^[A-Za-z0-9][A-Za-z0-9._-]{0,127}$, got: "${id}"`);
    err.code = 'PREFLIGHT_BLOCKED_INVALID_IDENTIFIER';
    throw err;
  }
  if (id.includes('/') || id.includes('\\') || id.includes('..')) {
    const err = new Error(`PREFLIGHT_BLOCKED_INVALID_IDENTIFIER: path traversal detected in ${fieldName}: "${id}"`);
    err.code = 'PREFLIGHT_BLOCKED_INVALID_IDENTIFIER';
    throw err;
  }
  return id;
}

export function validatePreflight({
  task,
  adapter = null,
  currentTaskMetadata = null,
  gitBinary = 'git'
}) {
  if (!task || !task.taskId) {
    throw new Error('validatePreflight: task with taskId is required');
  }

  // 1. Safe Identifier Validation (Correction C48)
  validateSafeIdentifier(task.taskId, 'taskId');
  if (task.runId) {
    validateSafeIdentifier(task.runId, 'runId');
  }

  // 2. Task Mode & Lock Invariant (Correction C21)
  if (task.mode === 'WRITE' && task.requiresWriterLock === false) {
    const err = new Error('PREFLIGHT_BLOCKED_INVALID_TASK_CONTRACT: Task with mode="WRITE" cannot declare requiresWriterLock=false');
    err.code = 'PREFLIGHT_BLOCKED_INVALID_TASK_CONTRACT';
    throw err;
  }

  // 3. Write Scope Allowlist Verification (Correction C59)
  if (task.mode === 'WRITE' && (!task.allowedWritePaths || task.allowedWritePaths.length === 0) && !task.unrestrictedSandbox) {
    const err = new Error('PREFLIGHT_BLOCKED_WRITE_SCOPE_MISSING: WRITE mode requires non-empty allowedWritePaths unless unrestrictedSandbox is true');
    err.code = 'PREFLIGHT_BLOCKED_WRITE_SCOPE_MISSING';
    throw err;
  }

  // 4. Adapter Identity Consistency (Correction C45)
  if (adapter && task.agent !== adapter.agentName && !(adapter.agentName === 'mock' && task.allowMockAdapter)) {
    const err = new Error(`PREFLIGHT_BLOCKED_ADAPTER_MISMATCH: Task requested agent "${task.agent}" but adapter is "${adapter.agentName}"`);
    err.code = 'PREFLIGHT_BLOCKED_ADAPTER_MISMATCH';
    throw err;
  }

  // 5. Real-Agent Context Mode Requirement (Correction C47)
  if (task.agent !== 'mock' && !task.contextMode) {
    const err = new Error('PREFLIGHT_BLOCKED_CONTEXT_MODE_REQUIRED: Real-agent execution requires explicit contextMode (KONFRM_REPO | SYNTHETIC_LAB)');
    err.code = 'PREFLIGHT_BLOCKED_CONTEXT_MODE_REQUIRED';
    throw err;
  }

  // 6. KONFRM_REPO Context Mode Validation (Correction C47)
  if (task.contextMode === 'KONFRM_REPO') {
    const requiredTaskFields = ['taskId', 'expectedBranch', 'expectedHeadSha', 'expectedStage', 'worktreeRoot', 'agent', 'mode'];
    const missingTaskFields = requiredTaskFields.filter(f => !task[f]);
    if (missingTaskFields.length > 0) {
      const err = new Error(`PREFLIGHT_BLOCKED_CONTEXT_METADATA_INSUFFICIENT: Missing required task field(s): ${missingTaskFields.join(', ')}`);
      err.code = 'PREFLIGHT_BLOCKED_CONTEXT_METADATA_INSUFFICIENT';
      throw err;
    }

    if (!currentTaskMetadata) {
      const err = new Error('PREFLIGHT_BLOCKED_CONTEXT_METADATA_INSUFFICIENT: currentTaskMetadata is required in KONFRM_REPO mode');
      err.code = 'PREFLIGHT_BLOCKED_CONTEXT_METADATA_INSUFFICIENT';
      throw err;
    }

    const requiredMetadataKeys = ['TASK_ID', 'EXPECTED_BRANCH', 'BASE_SHA', 'STAGE'];
    const missingKeys = requiredMetadataKeys.filter(k => !currentTaskMetadata[k]);
    if (missingKeys.length > 0) {
      const err = new Error(`PREFLIGHT_BLOCKED_CONTEXT_METADATA_INSUFFICIENT: Missing metadata key(s): ${missingKeys.join(', ')}`);
      err.code = 'PREFLIGHT_BLOCKED_CONTEXT_METADATA_INSUFFICIENT';
      throw err;
    }

    if (currentTaskMetadata.TASK_ID !== task.taskId) {
      const err = new Error(`PREFLIGHT_BLOCKED_CONTEXT_MISMATCH: metadata.TASK_ID "${currentTaskMetadata.TASK_ID}" !== task.taskId "${task.taskId}"`);
      err.code = 'PREFLIGHT_BLOCKED_CONTEXT_MISMATCH';
      throw err;
    }
    if (currentTaskMetadata.EXPECTED_BRANCH !== task.expectedBranch) {
      const err = new Error(`PREFLIGHT_BLOCKED_CONTEXT_MISMATCH: metadata.EXPECTED_BRANCH "${currentTaskMetadata.EXPECTED_BRANCH}" !== task.expectedBranch "${task.expectedBranch}"`);
      err.code = 'PREFLIGHT_BLOCKED_CONTEXT_MISMATCH';
      throw err;
    }
    if (currentTaskMetadata.BASE_SHA !== task.expectedHeadSha) {
      const err = new Error(`PREFLIGHT_BLOCKED_CONTEXT_MISMATCH: metadata.BASE_SHA "${currentTaskMetadata.BASE_SHA}" !== task.expectedHeadSha "${task.expectedHeadSha}"`);
      err.code = 'PREFLIGHT_BLOCKED_CONTEXT_MISMATCH';
      throw err;
    }
    if (currentTaskMetadata.STAGE !== task.expectedStage) {
      const err = new Error(`PREFLIGHT_BLOCKED_CONTEXT_MISMATCH: metadata.STAGE "${currentTaskMetadata.STAGE}" !== task.expectedStage "${task.expectedStage}"`);
      err.code = 'PREFLIGHT_BLOCKED_CONTEXT_MISMATCH';
      throw err;
    }
  }

  // 7. SYNTHETIC_LAB Context Mode Validation (Correction C47)
  if (task.contextMode === 'SYNTHETIC_LAB') {
    if (!task.expectedBranch) {
      const err = new Error('PREFLIGHT_BLOCKED_CONTEXT_MISMATCH: expectedBranch is required in SYNTHETIC_LAB mode');
      err.code = 'PREFLIGHT_BLOCKED_CONTEXT_MISMATCH';
      throw err;
    }
    if (!task.expectedHeadSha) {
      const err = new Error('PREFLIGHT_BLOCKED_HEAD_MISMATCH: expectedHeadSha is required in SYNTHETIC_LAB mode');
      err.code = 'PREFLIGHT_BLOCKED_HEAD_MISMATCH';
      throw err;
    }
    const resolvedRoot = path.resolve(task.worktreeRoot || process.cwd()).toLowerCase();
    if (resolvedRoot.includes('sola - rental app') || resolvedRoot.includes('yallah masyaf')) {
      const err = new Error('PREFLIGHT_BLOCKED_SYNTHETIC_LAB_TARGETS_PRODUCT_REPO: SYNTHETIC_LAB must never target product worktree');
      err.code = 'PREFLIGHT_BLOCKED_SYNTHETIC_LAB_TARGETS_PRODUCT_REPO';
      throw err;
    }
  }


  // 8. Runtime Compatibility Check (Correction C23)
  if (task.agent !== 'mock') {
    assertRuntimeAllowsRealAgentExecution();
  }

  // 9. Git Worktree & Branch Validation (Correction C29)
  const worktreeRoot = path.resolve(task.worktreeRoot || process.cwd());

  let currentBranch = '';
  try {
    currentBranch = execFileSync(gitBinary, ['-C', worktreeRoot, 'branch', '--show-current'], {
      encoding: 'utf8',
      stdio: ['ignore', 'pipe', 'pipe'],
      shell: false
    }).trim();
  } catch {
    currentBranch = execFileSync(gitBinary, ['-C', worktreeRoot, 'rev-parse', '--abbrev-ref', 'HEAD'], {
      encoding: 'utf8',
      stdio: ['ignore', 'pipe', 'pipe'],
      shell: false
    }).trim();
  }

  if (task.expectedBranch && currentBranch !== task.expectedBranch) {
    const err = new Error(`PREFLIGHT_BLOCKED_CONTEXT_MISMATCH: Worktree branch "${currentBranch}" does not match expectedBranch "${task.expectedBranch}"`);
    err.code = 'PREFLIGHT_BLOCKED_CONTEXT_MISMATCH';
    throw err;
  }

  // 10. Baseline Ancestry (HEAD) Verification
  let currentHead = '';
  try {
    currentHead = execFileSync(gitBinary, ['-C', worktreeRoot, 'rev-parse', 'HEAD'], {
      encoding: 'utf8',
      stdio: ['ignore', 'pipe', 'pipe'],
      shell: false
    }).trim();
  } catch {
    currentHead = 'EMPTY_TREE';
  }

  if (task.expectedHeadSha && currentHead !== task.expectedHeadSha) {
    const err = new Error(`PREFLIGHT_BLOCKED_HEAD_MISMATCH: Worktree HEAD "${currentHead}" does not match expectedHeadSha "${task.expectedHeadSha}"`);
    err.code = 'PREFLIGHT_BLOCKED_HEAD_MISMATCH';
    throw err;
  }

  // 11. Legacy or Standalone Task Metadata Comparator (Correction C6, C29)
  if (currentTaskMetadata && !task.contextMode) {
    const requiredKeys = ['TASK_ID', 'EXPECTED_BRANCH', 'BASE_SHA', 'STAGE'];
    const missingKeys = requiredKeys.filter(k => !currentTaskMetadata[k]);
    if (missingKeys.length > 0) {
      const err = new Error(`PREFLIGHT_BLOCKED_CONTEXT_METADATA_INSUFFICIENT: Missing required metadata field(s): ${missingKeys.join(', ')}`);
      err.code = 'PREFLIGHT_BLOCKED_CONTEXT_METADATA_INSUFFICIENT';
      throw err;
    }

    if (task.expectedBranch && currentTaskMetadata.EXPECTED_BRANCH !== task.expectedBranch) {
      const err = new Error(`PREFLIGHT_BLOCKED_CONTEXT_MISMATCH: currentTaskMetadata.EXPECTED_BRANCH "${currentTaskMetadata.EXPECTED_BRANCH}" !== task.expectedBranch "${task.expectedBranch}"`);
      err.code = 'PREFLIGHT_BLOCKED_CONTEXT_MISMATCH';
      throw err;
    }
  }

  return {
    valid: true,
    branch: currentBranch,
    head: currentHead
  };
}

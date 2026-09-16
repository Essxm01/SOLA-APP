/**
 * Preflight Validator (Section 12, C6, C21, C23, C29, C45)
 * Enforces non-negotiable checks before any execution agent process is launched.
 */

import { execFileSync } from 'node:child_process';
import path from 'node:path';
import { assertRuntimeAllowsRealAgentExecution } from './runtime-policy.mjs';

export function validatePreflight({
  task,
  adapter = null,
  currentTaskMetadata = null,
  gitBinary = 'git'
}) {
  if (!task || !task.taskId) {
    throw new Error('validatePreflight: task with taskId is required');
  }

  // 1. Task Mode & Lock Invariant (Correction C21)
  if (task.mode === 'WRITE' && task.requiresWriterLock === false) {
    const err = new Error('PREFLIGHT_BLOCKED_INVALID_TASK_CONTRACT: Task with mode="WRITE" cannot declare requiresWriterLock=false');
    err.code = 'PREFLIGHT_BLOCKED_INVALID_TASK_CONTRACT';
    throw err;
  }

  // 2. Adapter Identity Consistency (Correction C45)
  if (adapter && task.agent !== adapter.agentName && !(adapter.agentName === 'mock' && task.allowMockAdapter)) {
    const err = new Error(`PREFLIGHT_BLOCKED_ADAPTER_MISMATCH: Task requested agent "${task.agent}" but adapter is "${adapter.agentName}"`);
    err.code = 'PREFLIGHT_BLOCKED_ADAPTER_MISMATCH';
    throw err;
  }

  // 3. Runtime Compatibility Check (Correction C23)
  if (task.agent !== 'mock') {
    assertRuntimeAllowsRealAgentExecution();
  }

  // 4. Git Worktree & Branch Validation (Correction C29)
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

  // 5. Baseline Ancestry (HEAD) Verification
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

  // 6. Explicit Task Metadata Comparator (Correction C6, C29)
  if (currentTaskMetadata) {
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

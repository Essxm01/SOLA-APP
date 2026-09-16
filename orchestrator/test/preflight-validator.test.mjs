import { test, describe, beforeEach, afterEach } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { execFileSync } from 'node:child_process';
import { validatePreflight } from '../src/preflight-validator.mjs';

describe('Preflight Validator (C29, C45)', () => {
  let tempRepo;

  beforeEach(() => {
    tempRepo = fs.mkdtempSync(path.join(os.tmpdir(), 'konfrm-preflight-repo-'));
    execFileSync('git', ['init', '-b', 'feature/test-branch', tempRepo], { stdio: 'ignore' });
    execFileSync('git', ['-C', tempRepo, 'config', 'user.name', 'Test Runner'], { stdio: 'ignore' });
    execFileSync('git', ['-C', tempRepo, 'config', 'user.email', 'test@example.com'], { stdio: 'ignore' });

    fs.writeFileSync(path.join(tempRepo, 'init.txt'), 'hello\n', 'utf8');
    execFileSync('git', ['-C', tempRepo, 'add', '.'], { stdio: 'ignore' });
    execFileSync('git', ['-C', tempRepo, 'commit', '-m', 'Initial commit'], { stdio: 'ignore' });
  });

  afterEach(() => {
    if (tempRepo && fs.existsSync(tempRepo)) {
      fs.rmSync(tempRepo, { recursive: true, force: true });
    }
  });

  test('PREFLIGHT-01: Valid task contract with matching branch, head, and adapter passes', () => {
    const head = execFileSync('git', ['-C', tempRepo, 'rev-parse', 'HEAD'], { encoding: 'utf8' }).trim();

    const task = {
      taskId: 'TASK-01',
      expectedBranch: 'feature/test-branch',
      expectedHeadSha: head,
      mode: 'WRITE',
      requiresWriterLock: true,
      worktreeRoot: tempRepo,
      agent: 'mock'
    };

    const currentTaskMetadata = {
      TASK_ID: 'TASK-01',
      EXPECTED_BRANCH: 'feature/test-branch',
      BASE_SHA: head,
      STAGE: 'DEV'
    };

    const result = validatePreflight({
      task,
      adapter: { agentName: 'mock' },
      currentTaskMetadata
    });

    assert.equal(result.valid, true);
    assert.equal(result.branch, 'feature/test-branch');
    assert.equal(result.head, head);
  });

  test('PREFLIGHT-02: Branch mismatch between worktree and expectedBranch throws PREFLIGHT_BLOCKED_CONTEXT_MISMATCH', () => {
    const task = {
      taskId: 'TASK-02',
      expectedBranch: 'main', // Worktree is on feature/test-branch
      mode: 'READ_ONLY',
      requiresWriterLock: false,
      worktreeRoot: tempRepo,
      agent: 'mock'
    };

    assert.throws(
      () => validatePreflight({ task, adapter: { agentName: 'mock' } }),
      /PREFLIGHT_BLOCKED_CONTEXT_MISMATCH/
    );
  });

  test('PREFLIGHT-03: HEAD mismatch between worktree and expectedHeadSha throws PREFLIGHT_BLOCKED_HEAD_MISMATCH', () => {
    const task = {
      taskId: 'TASK-03',
      expectedBranch: 'feature/test-branch',
      expectedHeadSha: '0000000000000000000000000000000000000000', // Mismatch!
      mode: 'READ_ONLY',
      requiresWriterLock: false,
      worktreeRoot: tempRepo,
      agent: 'mock'
    };

    assert.throws(
      () => validatePreflight({ task, adapter: { agentName: 'mock' } }),
      /PREFLIGHT_BLOCKED_HEAD_MISMATCH/
    );
  });

  test('PREFLIGHT-04: Missing task metadata in currentTaskMetadata throws PREFLIGHT_BLOCKED_CONTEXT_METADATA_INSUFFICIENT', () => {
    const task = {
      taskId: 'TASK-04',
      expectedBranch: 'feature/test-branch',
      mode: 'READ_ONLY',
      requiresWriterLock: false,
      worktreeRoot: tempRepo,
      agent: 'mock'
    };

    const incompleteMetadata = {
      TASK_ID: 'TASK-04'
      // Missing EXPECTED_BRANCH, BASE_SHA, STAGE
    };

    assert.throws(
      () => validatePreflight({ task, adapter: { agentName: 'mock' }, currentTaskMetadata: incompleteMetadata }),
      /PREFLIGHT_BLOCKED_CONTEXT_METADATA_INSUFFICIENT/
    );
  });

  test('PREFLIGHT-05: Task agent and adapter agent mismatch throws PREFLIGHT_BLOCKED_ADAPTER_MISMATCH', () => {
    const task = {
      taskId: 'TASK-05',
      expectedBranch: 'feature/test-branch',
      mode: 'READ_ONLY',
      requiresWriterLock: false,
      worktreeRoot: tempRepo,
      agent: 'antigravity' // Task expects antigravity
    };

    assert.throws(
      () => validatePreflight({ task, adapter: { agentName: 'mock' } }), // Adapter is mock
      /PREFLIGHT_BLOCKED_ADAPTER_MISMATCH/
    );
  });
});

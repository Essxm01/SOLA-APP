import { test, describe, beforeEach, afterEach } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { execFileSync } from 'node:child_process';
import { ensureRuntimeDirectories } from '../src/runtime-paths.mjs';
import { computeWorktreeIdentity } from '../src/worktree-identity.mjs';
import { acquireLock, readLock } from '../src/lock-manager.mjs';
import { MockAgentAdapter } from '../src/mock-adapter.mjs';
import { executeOrchestratedTask } from '../src/core-runner.mjs';

describe('Core Runner & Safety Integration (Section 23-32, C13, C14, C15, C21, C28)', () => {
  let tempRepo;
  let tempRuntime;
  let paths;

  beforeEach(() => {
    tempRepo = fs.mkdtempSync(path.join(os.tmpdir(), 'konfrm-core-repo-'));
    execFileSync('git', ['init', tempRepo], { stdio: 'ignore' });
    execFileSync('git', ['-C', tempRepo, 'config', 'user.name', 'Test Runner'], { stdio: 'ignore' });
    execFileSync('git', ['-C', tempRepo, 'config', 'user.email', 'test@example.com'], { stdio: 'ignore' });

    fs.writeFileSync(path.join(tempRepo, 'base.txt'), 'base content\n', 'utf8');
    execFileSync('git', ['-C', tempRepo, 'add', '.'], { stdio: 'ignore' });
    execFileSync('git', ['-C', tempRepo, 'commit', '-m', 'Base commit'], { stdio: 'ignore' });

    tempRuntime = fs.mkdtempSync(path.join(os.tmpdir(), 'konfrm-core-runtime-'));
    paths = ensureRuntimeDirectories(tempRuntime);
  });

  afterEach(() => {
    if (tempRepo && fs.existsSync(tempRepo)) {
      fs.rmSync(tempRepo, { recursive: true, force: true });
    }
    if (tempRuntime && fs.existsSync(tempRuntime)) {
      fs.rmSync(tempRuntime, { recursive: true, force: true });
    }
  });

  test('CORE-01: Success scenario reaches verified completion', async () => {
    const adapter = new MockAgentAdapter();
    const task = {
      taskId: 'TASK-CORE-01',
      agent: 'mock',
      mode: 'WRITE',
      requiresWriterLock: true,
      worktreeRoot: tempRepo,
      prompt: 'Write allowed file',
      scenario: 'write-allowed',
      target: path.join(tempRepo, 'output.txt'),
      allowedWritePaths: ['output.txt'],
      forbiddenWritePaths: ['forbidden.txt']
    };

    const verifier = async (t, res) => {
      // Independent test / verification gate
      assert.ok(fs.existsSync(path.join(tempRepo, 'output.txt')));
      return { passed: true, summary: 'Output file verified on disk' };
    };

    const result = await executeOrchestratedTask({
      task,
      adapter,
      runtimePaths: paths,
      verifier
    });

    assert.equal(result.status, 'SUCCESS');
    assert.equal(result.executionOutcome, 'PROCESS_COMPLETED');
    assert.equal(result.verificationOutcome, 'VERIFIED_PASSED');
    assert.equal(result.exitCode, 0);
    assert.equal(result.testsPassed, true);
    assert.ok(result.filesChanged.includes('output.txt'));
  });

  test('CORE-02: Forbidden mutation blocks without cleanup and preserves file', async () => {
    const adapter = new MockAgentAdapter();
    const forbiddenTarget = path.join(tempRepo, 'forbidden_secret.txt');

    const task = {
      taskId: 'TASK-CORE-02',
      agent: 'mock',
      mode: 'WRITE',
      requiresWriterLock: true,
      worktreeRoot: tempRepo,
      prompt: 'Attempt forbidden write',
      scenario: 'write-forbidden',
      target: forbiddenTarget,
      allowedWritePaths: ['allowed.txt'],
      forbiddenWritePaths: ['forbidden_secret.txt']
    };

    const result = await executeOrchestratedTask({
      task,
      adapter,
      runtimePaths: paths
    });

    assert.equal(result.status, 'FORBIDDEN_MUTATION_BLOCKED');
    assert.equal(result.retryEligible, false);
    assert.equal(result.fallbackEligible, false);
    // Crucial: The forbidden file must remain modified on disk (no git clean/restore executed)
    assert.ok(fs.existsSync(forbiddenTarget));
    assert.ok(result.filesChanged.includes('forbidden_secret.txt'));
  });

  test('CORE-03: Partial write failure blocks retry and fallback', async () => {
    const adapter = new MockAgentAdapter();
    const partialTarget = path.join(tempRepo, 'partial_work.txt');

    const task = {
      taskId: 'TASK-CORE-03',
      agent: 'mock',
      mode: 'WRITE',
      requiresWriterLock: true,
      worktreeRoot: tempRepo,
      prompt: 'Write then fail',
      scenario: 'write-then-fail',
      target: partialTarget
    };

    const result = await executeOrchestratedTask({
      task,
      adapter,
      runtimePaths: paths
    });

    assert.equal(result.status, 'PARTIAL_MUTATION_BLOCKED');
    assert.equal(result.retryEligible, false);
    assert.equal(result.fallbackEligible, false);
    assert.ok(fs.existsSync(partialTarget));
  });

  test('CORE-04: Zero-mutation transient failure allows bounded retry', async () => {
    const adapter = new MockAgentAdapter();

    const task = {
      taskId: 'TASK-CORE-04',
      agent: 'mock',
      mode: 'WRITE',
      requiresWriterLock: true,
      worktreeRoot: tempRepo,
      prompt: 'Transient fail without mutation',
      scenario: 'fail'
    };

    const result = await executeOrchestratedTask({
      task,
      adapter,
      runtimePaths: paths
    });

    assert.equal(result.status, 'FAILED');
    assert.equal(result.mutationClassification, 'ZERO_MUTATION');
    assert.equal(result.retryEligible, true);
    assert.equal(result.maxRetriesAllowed, 1);
  });

  test('CORE-05: Mandatory Lock-Lifetime Integration Test (lock held during verification)', async () => {
    const adapter = new MockAgentAdapter();
    const identity = computeWorktreeIdentity(tempRepo);

    let verificationStarted = false;
    let writerBContentionObserved = false;

    const taskA = {
      taskId: 'TASK-WRITER-A',
      agent: 'mock',
      mode: 'WRITE',
      requiresWriterLock: true,
      worktreeRoot: tempRepo,
      prompt: 'Writer A execution',
      scenario: 'success'
    };

    const verifier = async (t, res) => {
      verificationStarted = true;

      // While inside verification, simulate Writer B attempting lock acquisition
      const attemptB = acquireLock({
        locksDir: paths.locks,
        worktreeIdentity: identity,
        worktreePath: tempRepo,
        branch: 'test',
        taskId: 'TASK-WRITER-B',
        agent: 'mock',
        ownerPid: process.pid + 50
      });

      if (!attemptB.acquired && attemptB.contention) {
        writerBContentionObserved = true;
      }

      // Simulate verification duration
      await new Promise(resolve => setTimeout(resolve, 150));
      return { passed: true, summary: 'Verification passed while lock held' };
    };

    const resultA = await executeOrchestratedTask({
      task: taskA,
      adapter,
      runtimePaths: paths,
      verifier
    });

    assert.equal(resultA.status, 'SUCCESS');
    assert.equal(verificationStarted, true);
    assert.equal(writerBContentionObserved, true, 'Writer B MUST observe lock contention during Writer A verification');

    // After Writer A finishes and releases lock, Writer B can acquire
    const attemptBPost = acquireLock({
      locksDir: paths.locks,
      worktreeIdentity: identity,
      worktreePath: tempRepo,
      branch: 'test',
      taskId: 'TASK-WRITER-B',
      agent: 'mock',
      ownerPid: process.pid + 50
    });

    assert.equal(attemptBPost.acquired, true, 'Writer B must successfully acquire lock after Writer A releases');
  });

  test('CORE-06: Preflight rejects WRITE task with requiresWriterLock=false', async () => {
    const adapter = new MockAgentAdapter();
    const task = {
      taskId: 'TASK-BAD-01',
      agent: 'mock',
      mode: 'WRITE',
      requiresWriterLock: false, // Invalid!
      worktreeRoot: tempRepo,
      prompt: 'Bad task contract',
      scenario: 'success'
    };

    await assert.rejects(
      () => executeOrchestratedTask({ task, adapter, runtimePaths: paths }),
      /PREFLIGHT_BLOCKED_INVALID_TASK_CONTRACT/
    );
  });
});

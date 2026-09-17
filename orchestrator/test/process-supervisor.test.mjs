import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  spawnSupervisedProcess,
  killProcessTree
} from '../src/process-supervisor.mjs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const mockAgentPath = path.resolve(__dirname, '../fixtures/mock-agent.mjs');

describe('Process Supervisor (Section 19, 20, C18, C19)', () => {
  test('PROC-01: Successful process execution captures stdout and exitCode 0', async () => {
    const handle = spawnSupervisedProcess({
      command: process.execPath,
      args: [mockAgentPath, '--scenario', 'success'],
      timeoutMs: 5000
    });

    assert.equal(typeof handle.pid, 'number');
    const result = await handle.promise;

    assert.equal(result.exitCode, 0);
    assert.equal(result.timedOut, false);
    assert.equal(result.cancelled, false);
    assert.ok(result.stdout.includes('"status":"SUCCESS"'));
    assert.ok(result.durationMs >= 0);
  });

  test('PROC-02: Non-zero exit captures stderr and exitCode correctly', async () => {
    const handle = spawnSupervisedProcess({
      command: process.execPath,
      args: [mockAgentPath, '--scenario', 'fail'],
      timeoutMs: 5000
    });

    const result = await handle.promise;

    assert.equal(result.exitCode, 1);
    assert.equal(result.timedOut, false);
    assert.ok(result.stderr.includes('Mock intentional non-zero failure'));
  });

  test('PROC-03: Process exceeding timeoutMs is terminated and marked timedOut', async () => {
    const handle = spawnSupervisedProcess({
      command: process.execPath,
      args: [mockAgentPath, '--scenario', 'hang'],
      timeoutMs: 400 // short timeout
    });

    const result = await handle.promise;

    assert.equal(result.timedOut, true);
    assert.ok(result.durationMs >= 350);
    assert.ok(
      result.cancellationMethod === 'WINDOWS_PROCESS_TREE_TERMINATE' ||
      result.cancellationMethod === 'PROCESS_TERMINATE' ||
      result.cancellationMethod === 'TIMEOUT_ABORT'
    );
  });

  test('PROC-04: Terminated process yields exitCode number or null without throwing uncaught', async () => {
    const handle = spawnSupervisedProcess({
      command: process.execPath,
      args: [mockAgentPath, '--scenario', 'hang'],
      timeoutMs: 10000
    });

    // Manually cancel
    setTimeout(() => {
      handle.cancel('PROCESS_TERMINATE');
    }, 200);

    const result = await handle.promise;
    assert.equal(result.cancelled, true);
    // On Windows or POSIX, terminated process exitCode can be null or a signal-based code
    assert.ok(result.exitCode === null || typeof result.exitCode === 'number');
  });

  test('PROC-05: Secret env is not inherited by default (C42)', async () => {
    process.env.KONFRM_TEST_SECRET_SHOULD_NOT_INHERIT = 'super_secret_value_xyz';
    try {
      const handle = spawnSupervisedProcess({
        command: process.execPath,
        args: [mockAgentPath, '--scenario', 'check-env'],
        timeoutMs: 5000
      });

      const result = await handle.promise;
      assert.equal(result.exitCode, 0);
      const parsed = JSON.parse(result.stdout.trim());
      assert.equal(parsed.secretPresent, false, 'Secret environment variable MUST NOT be inherited');
    } finally {
      delete process.env.KONFRM_TEST_SECRET_SHOULD_NOT_INHERIT;
    }
  });

  test('PROC-06: Termination command completes within bounded timeout (C40)', async () => {
    // Inactive PID
    const res = await killProcessTree(999999, 'WINDOWS_PROCESS_TREE_TERMINATE');
    assert.ok(res.status === 'ALREADY_EXITED' || res.status === 'TERMINATED');
  });

  test('PROC-07: Parent + child process tree cancellation terminates both (C41)', async () => {
    const handle = spawnSupervisedProcess({
      command: process.execPath,
      args: [mockAgentPath, '--scenario', 'spawn-child'],
      timeoutMs: 10000
    });

    // Wait until childPid is written to stdout
    let childPid = null;
    for (let i = 0; i < 30; i++) {
      if (handle.stdoutChunks) {
        const text = Buffer.concat(handle.stdoutChunks).toString('utf8');
        if (text.includes('childPid')) {
          try {
            const data = JSON.parse(text.trim().split('\n')[0]);
            childPid = data.childPid;
            break;
          } catch {}
        }
      }
      await new Promise(r => setTimeout(r, 100));
    }

    const parentPid = handle.pid;
    assert.ok(parentPid);

    // Cancel tree
    handle.cancel('WINDOWS_PROCESS_TREE_TERMINATE');
    await handle.promise;

    // Check both parent and child dead
    await new Promise(r => setTimeout(r, 400));
    const { isProcessAlive } = await import('../src/lock-manager.mjs');
    assert.equal(isProcessAlive(parentPid), false, 'Parent process must be dead');
    if (childPid) {
      assert.equal(isProcessAlive(childPid), false, 'Child process must be dead');
    }
  });

  test('PROC-08: Failed termination settles within bounded time (C54)', async () => {
    let termCalled = false;
    const mockFailTerm = async () => {
      termCalled = true;
      return { status: 'TERMINATION_FAILED' };
    };

    const startTime = Date.now();
    const handle = spawnSupervisedProcess({
      command: process.execPath,
      args: [mockAgentPath, '--scenario', 'hang'],
      timeoutMs: 200,
      terminateProcessTreeFn: mockFailTerm
    });

    try {
      const result = await handle.promise;
      const elapsed = Date.now() - startTime;
      assert.ok(termCalled, 'Termination function must have been called');
      assert.ok(elapsed < 2000, `Must settle within bounded time, took ${elapsed}ms`);
      assert.equal(result.timedOut, true);
    } finally {
      await killProcessTree(handle.pid);
    }
  });

  test('PROC-09: Failed termination reports processStillAlive: true and terminationStatus: TERMINATION_FAILED (C54, C55)', async () => {
    const mockFailTerm = async () => ({ status: 'TERMINATION_FAILED' });
    const handle = spawnSupervisedProcess({
      command: process.execPath,
      args: [mockAgentPath, '--scenario', 'hang'],
      timeoutMs: 200,
      terminateProcessTreeFn: mockFailTerm
    });

    try {
      const result = await handle.promise;
      assert.equal(result.timedOut, true);
      assert.equal(result.terminationStatus, 'TERMINATION_FAILED');
      assert.equal(result.processStillAlive, true);
    } finally {
      await killProcessTree(handle.pid);
    }
  });

  test('PROC-10: Async cancel() returns deterministic status, processStillAlive, and cancellationMethod (C54)', async () => {
    const handle = spawnSupervisedProcess({
      command: process.execPath,
      args: [mockAgentPath, '--scenario', 'hang'],
      timeoutMs: 10000
    });

    try {
      const cancelResult = await handle.cancel('PROCESS_TERMINATE');
      assert.equal(typeof cancelResult, 'object');
      assert.equal(cancelResult.status, 'TERMINATED');
      assert.equal(cancelResult.processStillAlive, false);
      assert.equal(cancelResult.cancellationMethod, 'PROCESS_TERMINATE');

      const procResult = await handle.promise;
      assert.equal(procResult.cancelled, true);
      assert.equal(procResult.terminationStatus, 'TERMINATED');
      assert.equal(procResult.processStillAlive, false);
    } finally {
      await killProcessTree(handle.pid);
    }
  });

  test('ENV-01: undeclared env override rejected (C68)', () => {
    assert.throws(
      () => spawnSupervisedProcess({
        command: process.execPath,
        args: ['-e', 'console.log(1)'],
        envOverrides: { EVIL_KEY: 'bad' },
        allowedEnvOverrideKeys: ['SAFE_KEY']
      }),
      /CHILD_ENV_OVERRIDE_NOT_ALLOWED/
    );
  });

  test('ENV-02: declared harmless override accepted (C68)', async () => {
    const handle = spawnSupervisedProcess({
      command: process.execPath,
      args: ['-e', 'console.log(process.env.TEST_SAFE_OVERRIDE)'],
      envOverrides: { TEST_SAFE_OVERRIDE: 'declared_value_123' },
      allowedEnvOverrideKeys: ['TEST_SAFE_OVERRIDE']
    });

    const result = await handle.promise;
    assert.equal(result.exitCode, 0);
    assert.equal(result.stdout.trim(), 'declared_value_123');
  });

  test('ENV-03: parent secret remains absent (C68)', async () => {
    process.env.KONFRM_PARENT_SECRET_xyz = 'super_secret_leak';
    try {
      const handle = spawnSupervisedProcess({
        command: process.execPath,
        args: ['-e', 'console.log(process.env.KONFRM_PARENT_SECRET_xyz || "ABSENT")'],
        envOverrides: { ALLOWED_VAR: '1' },
        allowedEnvOverrideKeys: ['ALLOWED_VAR']
      });

      const result = await handle.promise;
      assert.equal(result.exitCode, 0);
      assert.equal(result.stdout.trim(), 'ABSENT');
    } finally {
      delete process.env.KONFRM_PARENT_SECRET_xyz;
    }
  });

  test('PROC-11: taskkill error reports TREE_TERMINATION_UNVERIFIED (C67)', async () => {
    const mockUnverifiedTerm = async () => ({ status: 'TREE_TERMINATION_UNVERIFIED' });
    const handle = spawnSupervisedProcess({
      command: process.execPath,
      args: [mockAgentPath, '--scenario', 'hang'],
      timeoutMs: 200,
      terminateProcessTreeFn: mockUnverifiedTerm
    });

    try {
      const result = await handle.promise;
      assert.equal(result.timedOut, true);
      assert.equal(result.terminationStatus, 'TREE_TERMINATION_UNVERIFIED');
    } finally {
      await killProcessTree(handle.pid);
    }
  });
});

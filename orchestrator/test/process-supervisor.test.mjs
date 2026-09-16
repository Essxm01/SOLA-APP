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
});

import { test, describe, beforeEach, afterEach } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { execFileSync } from 'node:child_process';
import { computeWorktreeIdentity } from '../src/worktree-identity.mjs';
import { resolveRuntimePaths, ensureRuntimeDirectories } from '../src/runtime-paths.mjs';
import {
  acquireLock,
  readLock,
  refreshHeartbeat,
  releaseLock,
  recoverStaleLock,
  isProcessAlive
} from '../src/lock-manager.mjs';

describe('Writer Lock Engine (Section 13, 15, 16, C4, C5, C13, C26)', () => {
  let tempRepo;
  let tempRuntime;
  let paths;
  let identity;

  beforeEach(() => {
    tempRepo = fs.mkdtempSync(path.join(os.tmpdir(), 'konfrm-lock-repo-'));
    execFileSync('git', ['init', tempRepo], { stdio: 'ignore' });

    tempRuntime = fs.mkdtempSync(path.join(os.tmpdir(), 'konfrm-lock-runtime-'));
    paths = ensureRuntimeDirectories(tempRuntime);
    identity = computeWorktreeIdentity(tempRepo);
  });

  afterEach(() => {
    if (tempRepo && fs.existsSync(tempRepo)) {
      fs.rmSync(tempRepo, { recursive: true, force: true });
    }
    if (tempRuntime && fs.existsSync(tempRuntime)) {
      fs.rmSync(tempRuntime, { recursive: true, force: true });
    }
  });

  test('LOCK-01: First writer acquires exclusive lock with unique lockInstanceId', () => {
    const res = acquireLock({
      locksDir: paths.locks,
      worktreeIdentity: identity,
      worktreePath: tempRepo,
      branch: 'test-branch',
      taskId: 'TASK-01',
      agent: 'mock',
      ownerPid: process.pid
    });

    assert.equal(res.acquired, true);
    assert.ok(res.lockMetadata);
    assert.equal(res.lockMetadata.lockKey, identity.lockKey);
    assert.ok(res.lockMetadata.lockInstanceId);
    assert.equal(res.lockMetadata.ownerPid, process.pid);

    const lockFilePath = path.join(paths.locks, identity.lockFileName);
    assert.ok(fs.existsSync(lockFilePath));

    const onDisk = JSON.parse(fs.readFileSync(lockFilePath, 'utf8'));
    assert.equal(onDisk.lockInstanceId, res.lockMetadata.lockInstanceId);
  });

  test('LOCK-02: Second writer is blocked with contention while lock is held', () => {
    const res1 = acquireLock({
      locksDir: paths.locks,
      worktreeIdentity: identity,
      worktreePath: tempRepo,
      branch: 'test-branch',
      taskId: 'TASK-01',
      agent: 'mock',
      ownerPid: process.pid
    });
    assert.equal(res1.acquired, true);

    const res2 = acquireLock({
      locksDir: paths.locks,
      worktreeIdentity: identity,
      worktreePath: tempRepo,
      branch: 'test-branch',
      taskId: 'TASK-02',
      agent: 'mock',
      ownerPid: process.pid + 1
    });

    assert.equal(res2.acquired, false);
    assert.equal(res2.contention, true);
    assert.equal(res2.activeLock.taskId, 'TASK-01');
  });

  test('LOCK-03: Owner-only release verifies lockInstanceId before removing lock file', () => {
    const res = acquireLock({
      locksDir: paths.locks,
      worktreeIdentity: identity,
      worktreePath: tempRepo,
      branch: 'test-branch',
      taskId: 'TASK-01',
      agent: 'mock',
      ownerPid: process.pid
    });

    const lockFilePath = path.join(paths.locks, identity.lockFileName);

    // Attempt release with wrong instance ID
    assert.throws(
      () => releaseLock(lockFilePath, 'wrong-instance-uuid'),
      /RELEASE_ABORTED_OWNERSHIP_MISMATCH/
    );
    assert.ok(fs.existsSync(lockFilePath)); // Lock must remain!

    // Release with correct instance ID
    const released = releaseLock(lockFilePath, res.lockMetadata.lockInstanceId);
    assert.equal(released, true);
    assert.ok(!fs.existsSync(lockFilePath));
  });

  test('LOCK-04: Dead lock recovered and quarantined when owner PID is inactive', () => {
    // Pick an improbable dead PID (e.g. 9999999 or find an inactive one)
    const deadPid = 999999;
    const lockFilePath = path.join(paths.locks, identity.lockFileName);

    // Manually write lock with dead owner PID
    const deadMetadata = {
      lockKey: identity.lockKey,
      lockInstanceId: 'dead-lock-uuid-1234',
      worktreePath: tempRepo,
      canonicalWorktreeRealpath: identity.canonicalWorktreeRealpath,
      canonicalGitCommonDir: identity.canonicalGitCommonDir,
      branch: 'test-branch',
      taskId: 'DEAD-TASK',
      agent: 'mock',
      ownerPid: deadPid,
      ownerStartTime: new Date(Date.now() - 100000).toISOString(),
      acquiredAt: new Date(Date.now() - 100000).toISOString(),
      heartbeatAt: new Date(Date.now() - 100000).toISOString(),
      leaseDurationMs: 300000
    };
    fs.writeFileSync(lockFilePath, JSON.stringify(deadMetadata, null, 2), 'utf8');

    const recovery = recoverStaleLock({
      lockFilePath,
      quarantineDir: paths.quarantine,
      staleMetadata: deadMetadata,
      // Inject alive checker if needed
      isAliveChecker: (pid) => false
    });

    assert.equal(recovery.recovered, true);
    assert.ok(!fs.existsSync(lockFilePath));
    assert.ok(fs.existsSync(recovery.quarantinedPath));

    // Now a new writer can acquire
    const newAcquire = acquireLock({
      locksDir: paths.locks,
      worktreeIdentity: identity,
      worktreePath: tempRepo,
      branch: 'test-branch',
      taskId: 'NEW-TASK',
      agent: 'mock',
      ownerPid: process.pid
    });
    assert.equal(newAcquire.acquired, true);
  });

  test('LOCK-05: Race simulation aborts stale recovery if lock changed before rename', () => {
    const lockFilePath = path.join(paths.locks, identity.lockFileName);
    const deadMetadata = {
      lockKey: identity.lockKey,
      lockInstanceId: 'dead-lock-uuid-orig',
      worktreePath: tempRepo,
      canonicalWorktreeRealpath: identity.canonicalWorktreeRealpath,
      canonicalGitCommonDir: identity.canonicalGitCommonDir,
      branch: 'test-branch',
      taskId: 'DEAD-TASK',
      agent: 'mock',
      ownerPid: 999999,
      ownerStartTime: new Date().toISOString(),
      acquiredAt: new Date().toISOString(),
      heartbeatAt: new Date().toISOString(),
      leaseDurationMs: 300000
    };

    // On disk, another instance replaced the lock
    const replacedMetadata = {
      ...deadMetadata,
      lockInstanceId: 'live-lock-uuid-new',
      taskId: 'LIVE-TASK-2'
    };
    fs.writeFileSync(lockFilePath, JSON.stringify(replacedMetadata, null, 2), 'utf8');

    const recovery = recoverStaleLock({
      lockFilePath,
      quarantineDir: paths.quarantine,
      staleMetadata: deadMetadata, // passing old metadata
      isAliveChecker: (pid) => false
    });

    assert.equal(recovery.recovered, false);
    assert.equal(recovery.reason, 'RECLAIM_ABORTED_LOCK_CHANGED');
    assert.ok(fs.existsSync(lockFilePath)); // Must not delete new lock!
  });

  test('LOCK-06: Heartbeat refresh updates heartbeat timestamp while preserving instance ID', () => {
    const res = acquireLock({
      locksDir: paths.locks,
      worktreeIdentity: identity,
      worktreePath: tempRepo,
      branch: 'test-branch',
      taskId: 'TASK-01',
      agent: 'mock',
      ownerPid: process.pid
    });

    const lockFilePath = path.join(paths.locks, identity.lockFileName);
    const beforeHeartbeat = res.lockMetadata.heartbeatAt;

    const refreshed = refreshHeartbeat(lockFilePath, res.lockMetadata.lockInstanceId);
    assert.equal(refreshed.lockInstanceId, res.lockMetadata.lockInstanceId);
    assert.ok(new Date(refreshed.heartbeatAt) >= new Date(beforeHeartbeat));
  });
});

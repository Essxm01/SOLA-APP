/**
 * External Single-Writer Lock Engine (Section 13, 15, 16, C4, C5, C13, C26)
 * Implements atomic wx file locking, ownership verification, and race-safe stale lock recovery.
 * Locks reside strictly outside the Git repository in the orchestrator runtime locks directory.
 */

import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';

export function isProcessAlive(pid) {
  if (typeof pid !== 'number' || isNaN(pid) || pid <= 0) return false;
  try {
    // Signal 0 tests for process existence without sending a signal
    process.kill(pid, 0);
    return true;
  } catch (err) {
    // EPERM means the process exists but belongs to another user
    if (err.code === 'EPERM') return true;
    // ESRCH means no such process exists
    if (err.code === 'ESRCH') return false;
    return false;
  }
}

export function readLock(lockFilePath) {
  if (!fs.existsSync(lockFilePath)) return null;
  try {
    const raw = fs.readFileSync(lockFilePath, 'utf8');
    return JSON.parse(raw);
  } catch (err) {
    return null;
  }
}

export function acquireLock({
  locksDir,
  worktreeIdentity,
  worktreePath,
  branch,
  taskId,
  agent = 'mock',
  ownerPid = process.pid,
  leaseDurationMs = 300000
}) {
  if (!locksDir || !worktreeIdentity) {
    throw new Error('acquireLock: locksDir and worktreeIdentity are required');
  }

  const lockFilePath = path.join(locksDir, worktreeIdentity.lockFileName);
  const now = new Date().toISOString();
  const lockInstanceId = crypto.randomUUID();

  const payload = {
    lockKey: worktreeIdentity.lockKey,
    lockInstanceId,
    worktreePath: worktreePath || worktreeIdentity.canonicalWorktreeRealpath,
    canonicalWorktreeRealpath: worktreeIdentity.canonicalWorktreeRealpath,
    canonicalGitCommonDir: worktreeIdentity.canonicalGitCommonDir,
    branch: branch || 'UNKNOWN',
    taskId: taskId || 'UNKNOWN',
    agent,
    ownerPid,
    ownerStartTime: now,
    acquiredAt: now,
    heartbeatAt: now,
    leaseDurationMs
  };

  try {
    // 'wx' flag: Open for writing, fails with EEXIST if path already exists
    const fd = fs.openSync(lockFilePath, 'wx');
    fs.writeFileSync(fd, JSON.stringify(payload, null, 2), 'utf8');
    fs.closeSync(fd);
    return {
      acquired: true,
      contention: false,
      lockFilePath,
      lockMetadata: payload
    };
  } catch (err) {
    if (err.code === 'EEXIST') {
      const activeLock = readLock(lockFilePath);
      return {
        acquired: false,
        contention: true,
        lockFilePath,
        activeLock
      };
    }
    throw err;
  }
}

export function refreshHeartbeat(lockFilePath, lockInstanceId) {
  const current = readLock(lockFilePath);
  if (!current) {
    throw new Error(`REFRESH_ABORTED_LOCK_MISSING: Lock file not found at ${lockFilePath}`);
  }
  if (current.lockInstanceId !== lockInstanceId) {
    throw new Error(`REFRESH_ABORTED_OWNERSHIP_MISMATCH: Current instance ${current.lockInstanceId} does not match ${lockInstanceId}`);
  }

  const updated = {
    ...current,
    heartbeatAt: new Date().toISOString()
  };

  fs.writeFileSync(lockFilePath, JSON.stringify(updated, null, 2), 'utf8');
  return updated;
}

export function releaseLock(lockFilePath, lockInstanceId) {
  const current = readLock(lockFilePath);
  if (!current) {
    // Already gone
    return true;
  }

  if (current.lockInstanceId !== lockInstanceId) {
    throw new Error(
      `RELEASE_ABORTED_OWNERSHIP_MISMATCH: Cannot release lock. Existing owner instance ${current.lockInstanceId} !== requested ${lockInstanceId}`
    );
  }

  try {
    fs.unlinkSync(lockFilePath);
    return true;
  } catch (err) {
    if (err.code === 'ENOENT') return true;
    throw err;
  }
}

export function recoverStaleLock({
  lockFilePath,
  quarantineDir,
  staleMetadata,
  isAliveChecker = isProcessAlive
}) {
  if (!fs.existsSync(lockFilePath)) {
    return { recovered: false, reason: 'LOCK_NOT_FOUND' };
  }

  const currentOnDisk = readLock(lockFilePath);
  if (!currentOnDisk) {
    return { recovered: false, reason: 'LOCK_UNREADABLE' };
  }

  // 1. Verify owner process is actually dead
  const alive = isAliveChecker(currentOnDisk.ownerPid);
  if (alive) {
    return {
      recovered: false,
      reason: 'OWNER_ACTIVE',
      activeOwnerPid: currentOnDisk.ownerPid
    };
  }

  // 2. Atomic race prevention: ensure metadata on disk matches staleMetadata identified
  if (staleMetadata && currentOnDisk.lockInstanceId !== staleMetadata.lockInstanceId) {
    return {
      recovered: false,
      reason: 'RECLAIM_ABORTED_LOCK_CHANGED',
      currentInstanceId: currentOnDisk.lockInstanceId
    };
  }

  // 3. Move stale lock file to quarantine atomically
  if (!fs.existsSync(quarantineDir)) {
    fs.mkdirSync(quarantineDir, { recursive: true });
  }

  const timestamp = Date.now();
  const quarantinedFileName = `stale_${currentOnDisk.lockKey}_${currentOnDisk.lockInstanceId}_${timestamp}.json`;
  const quarantinedPath = path.join(quarantineDir, quarantinedFileName);

  try {
    fs.renameSync(lockFilePath, quarantinedPath);
    return {
      recovered: true,
      quarantinedPath,
      previousLock: currentOnDisk
    };
  } catch (err) {
    return {
      recovered: false,
      reason: `RECLAIM_RENAME_FAILED: ${err.message}`
    };
  }
}

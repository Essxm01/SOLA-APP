import { test, describe, beforeEach, afterEach } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { execFileSync } from 'node:child_process';
import { computeWorktreeIdentity, normalizePathForIdentity } from '../src/worktree-identity.mjs';

describe('Worktree Identity (Section 13.1, C25, C26)', () => {
  let tempRepo;

  beforeEach(() => {
    tempRepo = fs.mkdtempSync(path.join(os.tmpdir(), 'konfrm-identity-test-'));
    execFileSync('git', ['init', tempRepo], { stdio: 'ignore' });
    execFileSync('git', ['-C', tempRepo, 'config', 'user.name', 'Test Runner'], { stdio: 'ignore' });
    execFileSync('git', ['-C', tempRepo, 'config', 'user.email', 'test@example.com'], { stdio: 'ignore' });
  });

  afterEach(() => {
    if (tempRepo && fs.existsSync(tempRepo)) {
      fs.rmSync(tempRepo, { recursive: true, force: true });
    }
  });

  test('ID-01: Computes deterministic 64-character lowercase SHA-256 lock key', () => {
    const identity = computeWorktreeIdentity(tempRepo);

    assert.equal(typeof identity.lockKey, 'string');
    assert.equal(identity.lockKey.length, 64);
    assert.match(identity.lockKey, /^[0-9a-f]{64}$/);
    assert.equal(identity.lockFileName, `lock_${identity.lockKey}.json`);
    assert.ok(identity.canonicalWorktreeRealpath);
    assert.ok(identity.canonicalGitCommonDir);
  });

  test('ID-02: Identity is idempotent across calls for the same worktree', () => {
    const id1 = computeWorktreeIdentity(tempRepo);
    const id2 = computeWorktreeIdentity(tempRepo);
    assert.equal(id1.lockKey, id2.lockKey);
    assert.equal(id1.canonicalWorktreeRealpath, id2.canonicalWorktreeRealpath);
    assert.equal(id1.canonicalGitCommonDir, id2.canonicalGitCommonDir);
  });

  test('ID-03: Normalize path ensures uppercase drive letter and forward slashes on Windows', () => {
    const normalized = normalizePathForIdentity('c:\\users\\test\\repo');
    assert.ok(normalized.startsWith('C:/') || !path.win32);
    assert.ok(!normalized.includes('\\'));
  });
});

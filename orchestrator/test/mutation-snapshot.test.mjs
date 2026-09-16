import { test, describe, beforeEach, afterEach } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { execFileSync } from 'node:child_process';
import {
  captureMutationSnapshot,
  compareMutationSnapshots,
  classifyMutation
} from '../src/mutation-snapshot.mjs';

describe('Mutation Snapshot (Section 17, C14, C15, C28, C31)', () => {
  let tempRepo;

  beforeEach(() => {
    tempRepo = fs.mkdtempSync(path.join(os.tmpdir(), 'konfrm-mut-repo-'));
    execFileSync('git', ['init', tempRepo], { stdio: 'ignore' });
    execFileSync('git', ['-C', tempRepo, 'config', 'user.name', 'Test Runner'], { stdio: 'ignore' });
    execFileSync('git', ['-C', tempRepo, 'config', 'user.email', 'test@example.com'], { stdio: 'ignore' });

    fs.writeFileSync(path.join(tempRepo, 'initial.txt'), 'initial content\n', 'utf8');
    execFileSync('git', ['-C', tempRepo, 'add', '.'], { stdio: 'ignore' });
    execFileSync('git', ['-C', tempRepo, 'commit', '-m', 'Initial commit'], { stdio: 'ignore' });
  });

  afterEach(() => {
    if (tempRepo && fs.existsSync(tempRepo)) {
      fs.rmSync(tempRepo, { recursive: true, force: true });
    }
  });

  test('GIT-01: Classifies ZERO_MUTATION when worktree is identical before and after', () => {
    const before = captureMutationSnapshot(tempRepo);
    const after = captureMutationSnapshot(tempRepo);

    const result = classifyMutation(before, after);
    assert.equal(result.classification, 'ZERO_MUTATION');
    assert.equal(result.hasChanged, false);
    assert.equal(result.changedPaths.length, 0);
  });

  test('GIT-02: Classifies MUTATED when tracked file is modified', () => {
    const before = captureMutationSnapshot(tempRepo);

    fs.appendFileSync(path.join(tempRepo, 'initial.txt'), 'appended mutation\n', 'utf8');

    const after = captureMutationSnapshot(tempRepo);
    const result = classifyMutation(before, after);

    assert.equal(result.classification, 'MUTATED');
    assert.equal(result.hasChanged, true);
    assert.ok(result.changedPaths.includes('initial.txt'));
  });

  test('GIT-03: Classifies MUTATED when untracked file is created', () => {
    const before = captureMutationSnapshot(tempRepo);

    fs.writeFileSync(path.join(tempRepo, 'untracked.txt'), 'untracked content\n', 'utf8');

    const after = captureMutationSnapshot(tempRepo);
    const result = classifyMutation(before, after);

    assert.equal(result.classification, 'MUTATED');
    assert.equal(result.hasChanged, true);
    assert.ok(result.changedPaths.includes('untracked.txt'));
  });

  test('GIT-04: Classifies UNKNOWN when snapshots are missing or invalid', () => {
    const r1 = classifyMutation(null, null);
    assert.equal(r1.classification, 'UNKNOWN');
    assert.equal(r1.hasChanged, true);

    const before = captureMutationSnapshot(tempRepo);
    const r2 = classifyMutation(before, null);
    assert.equal(r2.classification, 'UNKNOWN');
  });

  test('MUT-05: Pre-existing dirty tracked file changed again is detected as MUTATED (C31)', () => {
    // 1. Make file dirty BEFORE snapshot
    fs.appendFileSync(path.join(tempRepo, 'initial.txt'), 'pre-existing uncommitted change\n', 'utf8');
    const before = captureMutationSnapshot(tempRepo);

    // 2. Change file content again during run (porcelain status is still " M initial.txt")
    fs.appendFileSync(path.join(tempRepo, 'initial.txt'), 'second modification during run\n', 'utf8');
    const after = captureMutationSnapshot(tempRepo);

    const result = classifyMutation(before, after);
    assert.equal(result.classification, 'MUTATED');
    assert.equal(result.hasChanged, true);
    assert.ok(result.changedPaths.includes('initial.txt'));
  });

  test('MUT-06: Pre-existing untracked file changed content is detected as MUTATED (C31)', () => {
    // 1. Create untracked file before snapshot
    const untrackedPath = path.join(tempRepo, 'pre_untracked.txt');
    fs.writeFileSync(untrackedPath, 'untracked initial content\n', 'utf8');
    const before = captureMutationSnapshot(tempRepo);

    // 2. Modify untracked file content during run (status is still "?? pre_untracked.txt")
    fs.appendFileSync(untrackedPath, 'untracked modified content\n', 'utf8');
    const after = captureMutationSnapshot(tempRepo);

    const result = classifyMutation(before, after);
    assert.equal(result.classification, 'MUTATED');
    assert.equal(result.hasChanged, true);
    assert.ok(result.changedPaths.includes('pre_untracked.txt'));
  });

  test('MUT-07: Staged content changed is detected as MUTATED (C31)', () => {
    fs.appendFileSync(path.join(tempRepo, 'initial.txt'), 'staged mod 1\n', 'utf8');
    execFileSync('git', ['-C', tempRepo, 'add', 'initial.txt'], { stdio: 'ignore' });
    const before = captureMutationSnapshot(tempRepo);

    fs.appendFileSync(path.join(tempRepo, 'initial.txt'), 'staged mod 2\n', 'utf8');
    execFileSync('git', ['-C', tempRepo, 'add', 'initial.txt'], { stdio: 'ignore' });
    const after = captureMutationSnapshot(tempRepo);

    const result = classifyMutation(before, after);
    assert.equal(result.classification, 'MUTATED');
    assert.equal(result.hasChanged, true);
    assert.ok(result.changedPaths.includes('initial.txt'));
  });

  test('MUT-08: UNKNOWN fails closed (C46)', () => {
    const r = classifyMutation({ head: 'ERROR' }, { head: 'clean' });
    assert.equal(r.classification, 'UNKNOWN');
    assert.equal(r.hasChanged, true);
  });

  test('MUT-09: Symlink fingerprint does not follow target (C53)', async () => {
    const { fingerprintUntrackedEntry } = await import('../src/mutation-snapshot.mjs');
    const targetDir = fs.mkdtempSync(path.join(os.tmpdir(), 'mut-target-'));
    const linkPath = path.join(tempRepo, 'symlink_entry');
    try {
      fs.symlinkSync(targetDir, linkPath, 'junction');

      const fp1 = fingerprintUntrackedEntry(linkPath);
      assert.ok(fp1.startsWith('SYMLINK:'), 'Must be identified as SYMLINK');

      // Modifying target content must not change the symlink's fingerprint
      fs.writeFileSync(path.join(targetDir, 'new_external_file.txt'), 'data');
      const fp2 = fingerprintUntrackedEntry(linkPath);
      assert.equal(fp1, fp2, 'Fingerprint must not follow external target content');
    } finally {
      try { fs.unlinkSync(linkPath); } catch {}
      try { fs.rmSync(targetDir, { recursive: true, force: true }); } catch {}
    }
  });

  test('MUT-10: Symlink target change is detected (C53)', async () => {
    const { fingerprintUntrackedEntry } = await import('../src/mutation-snapshot.mjs');
    const targetDir1 = fs.mkdtempSync(path.join(os.tmpdir(), 'mut-target1-'));
    const targetDir2 = fs.mkdtempSync(path.join(os.tmpdir(), 'mut-target2-'));
    const linkPath = path.join(tempRepo, 'symlink_entry2');
    try {
      fs.symlinkSync(targetDir1, linkPath, 'junction');
      const fp1 = fingerprintUntrackedEntry(linkPath);

      fs.unlinkSync(linkPath);
      fs.symlinkSync(targetDir2, linkPath, 'junction');
      const fp2 = fingerprintUntrackedEntry(linkPath);

      assert.notEqual(fp1, fp2, 'Target change must produce different fingerprint');
    } finally {
      try { fs.unlinkSync(linkPath); } catch {}
      try { fs.rmSync(targetDir1, { recursive: true, force: true }); } catch {}
      try { fs.rmSync(targetDir2, { recursive: true, force: true }); } catch {}
    }
  });
});

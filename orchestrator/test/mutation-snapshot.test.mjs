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

describe('Mutation Snapshot (Section 17, C14, C15, C28)', () => {
  let tempRepo;

  beforeEach(() => {
    tempRepo = fs.mkdtempSync(path.join(os.tmpdir(), 'konfrm-mut-repo-'));
    execFileSync('git', ['init', tempRepo], { stdio: 'ignore' });
    execFileSync('git', ['-C', tempRepo, 'config', 'user.name', 'Test Runner'], { stdio: 'ignore' });
    execFileSync('git', ['-C', tempRepo, 'config', 'user.email', 'test@example.com'], { stdio: 'ignore' });

    // Create initial commit
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
    // No mutation
    const after = captureMutationSnapshot(tempRepo);

    const result = classifyMutation(before, after);
    assert.equal(result.classification, 'ZERO_MUTATION');
    assert.equal(result.hasChanged, false);
    assert.equal(result.changedPaths.length, 0);
  });

  test('GIT-02: Classifies MUTATED when tracked file is modified', () => {
    const before = captureMutationSnapshot(tempRepo);

    // Mutate tracked file
    fs.appendFileSync(path.join(tempRepo, 'initial.txt'), 'appended mutation\n', 'utf8');

    const after = captureMutationSnapshot(tempRepo);
    const result = classifyMutation(before, after);

    assert.equal(result.classification, 'MUTATED');
    assert.equal(result.hasChanged, true);
    assert.ok(result.changedPaths.includes('initial.txt'));
  });

  test('GIT-03: Classifies MUTATED when untracked file is created', () => {
    const before = captureMutationSnapshot(tempRepo);

    // Create untracked file
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
});

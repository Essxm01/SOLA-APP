import { test, describe, beforeEach, afterEach } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { execFileSync } from 'node:child_process';
import {
  loadRepositoryTaskContract,
  parseTaskMetadataBlock
} from '../src/task-contract-loader.mjs';
import { validatePreflight } from '../src/preflight-validator.mjs';

describe('Repository Truth Loader & Task Contract (C61, C62)', () => {
  let tempRepo;

  beforeEach(() => {
    tempRepo = fs.mkdtempSync(path.join(os.tmpdir(), 'konfrm-truth-repo-'));
    execFileSync('git', ['init', tempRepo], { stdio: 'ignore' });
    execFileSync('git', ['-C', tempRepo, 'config', 'user.name', 'Test Runner'], { stdio: 'ignore' });
    execFileSync('git', ['-C', tempRepo, 'config', 'user.email', 'test@example.com'], { stdio: 'ignore' });

    fs.writeFileSync(path.join(tempRepo, 'base.txt'), 'base\n', 'utf8');
    execFileSync('git', ['-C', tempRepo, 'add', '.'], { stdio: 'ignore' });
    execFileSync('git', ['-C', tempRepo, 'commit', '-m', 'Initial commit'], { stdio: 'ignore' });

    fs.mkdirSync(path.join(tempRepo, 'tasks'), { recursive: true });
  });

  afterEach(() => {
    if (tempRepo && fs.existsSync(tempRepo)) {
      fs.rmSync(tempRepo, { recursive: true, force: true });
    }
  });

  test('TRUTH-01: caller metadata cannot override repository metadata (C61)', () => {
    const taskMdPath = path.join(tempRepo, 'tasks', 'CURRENT_TASK.md');
    fs.writeFileSync(
      taskMdPath,
      `# Current Task\n\n<!-- KONFRM_TASK_METADATA\nTASK_ID: REAL-TASK-001\nEXPECTED_BRANCH: master\nBASE_SHA: a1b2c3d4e5f6\nSTAGE: IMPLEMENTATION\n-->\n\nSome prose text mentioning FAKE-TASK-999.\n`,
      'utf8'
    );

    const actualBranch = execFileSync('git', ['-C', tempRepo, 'branch', '--show-current'], { encoding: 'utf8' }).trim();
    const actualHead = execFileSync('git', ['-C', tempRepo, 'rev-parse', 'HEAD'], { encoding: 'utf8' }).trim();

    // Caller attempts to pass spoofed currentTaskMetadata
    const task = {
      taskId: 'REAL-TASK-001',
      baseSha: 'a1b2c3d4e5f6',
      expectedBranch: actualBranch,
      expectedHeadSha: actualHead,
      expectedStage: 'IMPLEMENTATION',
      agent: 'mock',
      mode: 'WRITE',
      requiresWriterLock: true,
      allowedWritePaths: ['out.txt'],
      worktreeRoot: tempRepo,
      contextMode: 'KONFRM_REPO',
      currentTaskMetadata: {
        TASK_ID: 'SPOOFED-TASK-666',
        EXPECTED_BRANCH: 'spoofed-branch',
        BASE_SHA: '000000000000',
        STAGE: 'SPOOFED'
      }
    };

    const adapter = { agentName: 'mock' };

    // Must validate successfully against repository truth, ignoring caller's spoofed metadata
    assert.doesNotThrow(() => {
      validatePreflight({ task, adapter });
    });
  });

  test('TRUTH-02: missing repository metadata block fails closed (C61)', () => {
    const taskMdPath = path.join(tempRepo, 'tasks', 'CURRENT_TASK.md');
    // File exists but has no valid metadata block
    fs.writeFileSync(taskMdPath, '# Current Task\n\nJust prose without metadata block.\n', 'utf8');

    const actualBranch = execFileSync('git', ['-C', tempRepo, 'branch', '--show-current'], { encoding: 'utf8' }).trim();
    const actualHead = execFileSync('git', ['-C', tempRepo, 'rev-parse', 'HEAD'], { encoding: 'utf8' }).trim();

    const task = {
      taskId: 'REAL-TASK-001',
      baseSha: 'a1b2c3d4e5f6',
      expectedBranch: actualBranch,
      expectedHeadSha: actualHead,
      expectedStage: 'IMPLEMENTATION',
      agent: 'mock',
      mode: 'WRITE',
      requiresWriterLock: true,
      allowedWritePaths: ['out.txt'],
      worktreeRoot: tempRepo,
      contextMode: 'KONFRM_REPO'
    };

    const adapter = { agentName: 'mock' };

    assert.throws(
      () => validatePreflight({ task, adapter }),
      /PREFLIGHT_BLOCKED_CONTEXT_METADATA_INSUFFICIENT/
    );
  });

  test('TRUTH-03: TASK_ID mismatch fails (C61, C62)', () => {
    const taskMdPath = path.join(tempRepo, 'tasks', 'CURRENT_TASK.md');
    fs.writeFileSync(
      taskMdPath,
      `<!-- KONFRM_TASK_METADATA\nTASK_ID: REPO-TASK-001\nEXPECTED_BRANCH: master\nBASE_SHA: a1b2c3d4e5f6\nSTAGE: IMPLEMENTATION\n-->\n`,
      'utf8'
    );

    const actualBranch = execFileSync('git', ['-C', tempRepo, 'branch', '--show-current'], { encoding: 'utf8' }).trim();
    const actualHead = execFileSync('git', ['-C', tempRepo, 'rev-parse', 'HEAD'], { encoding: 'utf8' }).trim();

    const task = {
      taskId: 'DIFFERENT-TASK-ID',
      baseSha: 'a1b2c3d4e5f6',
      expectedBranch: actualBranch,
      expectedHeadSha: actualHead,
      expectedStage: 'IMPLEMENTATION',
      agent: 'mock',
      mode: 'WRITE',
      requiresWriterLock: true,
      allowedWritePaths: ['out.txt'],
      worktreeRoot: tempRepo,
      contextMode: 'KONFRM_REPO'
    };

    const adapter = { agentName: 'mock' };

    assert.throws(
      () => validatePreflight({ task, adapter }),
      /PREFLIGHT_BLOCKED_CONTEXT_MISMATCH/
    );
  });

  test('TRUTH-04: BASE_SHA checked independently from expected HEAD (C62)', () => {
    const baseCommit = execFileSync('git', ['-C', tempRepo, 'rev-parse', 'HEAD'], { encoding: 'utf8' }).trim();
    
    // Add a second commit so actual HEAD !== baseCommit
    fs.writeFileSync(path.join(tempRepo, 'second.txt'), 'second\n', 'utf8');
    execFileSync('git', ['-C', tempRepo, 'add', '.'], { stdio: 'ignore' });
    execFileSync('git', ['-C', tempRepo, 'commit', '-m', 'Second commit'], { stdio: 'ignore' });
    const headCommit = execFileSync('git', ['-C', tempRepo, 'rev-parse', 'HEAD'], { encoding: 'utf8' }).trim();

    assert.notEqual(baseCommit, headCommit, 'Base commit and HEAD commit must be distinct');

    const actualBranch = execFileSync('git', ['-C', tempRepo, 'branch', '--show-current'], { encoding: 'utf8' }).trim();

    const taskMdPath = path.join(tempRepo, 'tasks', 'CURRENT_TASK.md');
    fs.writeFileSync(
      taskMdPath,
      `<!-- KONFRM_TASK_METADATA\nTASK_ID: SEPARATE-SHA-01\nEXPECTED_BRANCH: ${actualBranch}\nBASE_SHA: ${baseCommit}\nSTAGE: IMPLEMENTATION\n-->\n`,
      'utf8'
    );

    const task = {
      taskId: 'SEPARATE-SHA-01',
      baseSha: baseCommit,
      expectedBranch: actualBranch,
      expectedHeadSha: headCommit,
      expectedStage: 'IMPLEMENTATION',
      agent: 'mock',
      mode: 'WRITE',
      requiresWriterLock: true,
      allowedWritePaths: ['out.txt'],
      worktreeRoot: tempRepo,
      contextMode: 'KONFRM_REPO'
    };

    const adapter = { agentName: 'mock' };

    // Passes when baseSha matches metadata BASE_SHA AND expectedHeadSha matches git actual HEAD
    assert.doesNotThrow(() => {
      validatePreflight({ task, adapter });
    });

    // If task baseSha mismatches repository metadata BASE_SHA -> fails
    const badBaseTask = { ...task, baseSha: 'wrong_base_sha_12345' };
    assert.throws(
      () => validatePreflight({ task: badBaseTask, adapter }),
      /PREFLIGHT_BLOCKED_CONTEXT_MISMATCH/
    );

    // If task expectedHeadSha mismatches actual git HEAD -> fails
    const badHeadTask = { ...task, expectedHeadSha: 'wrong_head_sha_12345' };
    assert.throws(
      () => validatePreflight({ task: badHeadTask, adapter }),
      /PREFLIGHT_BLOCKED_HEAD_MISMATCH/
    );
  });

  test('TRUTH-05: STAGE mismatch fails (C61, C62)', () => {
    const actualBranch = execFileSync('git', ['-C', tempRepo, 'branch', '--show-current'], { encoding: 'utf8' }).trim();
    const actualHead = execFileSync('git', ['-C', tempRepo, 'rev-parse', 'HEAD'], { encoding: 'utf8' }).trim();

    const taskMdPath = path.join(tempRepo, 'tasks', 'CURRENT_TASK.md');
    fs.writeFileSync(
      taskMdPath,
      `<!-- KONFRM_TASK_METADATA\nTASK_ID: TASK-STAGE-01\nEXPECTED_BRANCH: ${actualBranch}\nBASE_SHA: ${actualHead}\nSTAGE: SPECIFICATION\n-->\n`,
      'utf8'
    );

    const task = {
      taskId: 'TASK-STAGE-01',
      baseSha: actualHead,
      expectedBranch: actualBranch,
      expectedHeadSha: actualHead,
      expectedStage: 'IMPLEMENTATION', // Mismatch!
      agent: 'mock',
      mode: 'WRITE',
      requiresWriterLock: true,
      allowedWritePaths: ['out.txt'],
      worktreeRoot: tempRepo,
      contextMode: 'KONFRM_REPO'
    };

    const adapter = { agentName: 'mock' };

    assert.throws(
      () => validatePreflight({ task, adapter }),
      /PREFLIGHT_BLOCKED_CONTEXT_MISMATCH/
    );
  });
});

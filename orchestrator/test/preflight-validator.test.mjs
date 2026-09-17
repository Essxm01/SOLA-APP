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
      agent: 'mock',
      allowedWritePaths: ['init.txt']
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

  test('PREFLIGHT-06: real KONFRM context missing metadata blocks (C47)', () => {
    const head = execFileSync('git', ['-C', tempRepo, 'rev-parse', 'HEAD'], { encoding: 'utf8' }).trim();
    const task = {
      taskId: 'TASK-06',
      contextMode: 'KONFRM_REPO',
      expectedBranch: 'feature/test-branch',
      expectedHeadSha: head,
      expectedStage: 'DEV',
      worktreeRoot: tempRepo,
      agent: 'mock',
      mode: 'READ_ONLY'
    };

    // Missing currentTaskMetadata in KONFRM_REPO mode
    assert.throws(
      () => validatePreflight({ task, adapter: { agentName: 'mock' }, currentTaskMetadata: null }),
      /PREFLIGHT_BLOCKED_CONTEXT_METADATA_INSUFFICIENT/
    );
  });

  test('PREFLIGHT-07: TASK_ID mismatch blocks (C47)', () => {
    const head = execFileSync('git', ['-C', tempRepo, 'rev-parse', 'HEAD'], { encoding: 'utf8' }).trim();
    const task = {
      taskId: 'TASK-07',
      contextMode: 'KONFRM_REPO',
      expectedBranch: 'feature/test-branch',
      expectedHeadSha: head,
      expectedStage: 'DEV',
      worktreeRoot: tempRepo,
      agent: 'mock',
      mode: 'READ_ONLY'
    };

    const metadata = {
      TASK_ID: 'TASK-DIFFERENT',
      EXPECTED_BRANCH: 'feature/test-branch',
      BASE_SHA: head,
      STAGE: 'DEV'
    };

    assert.throws(
      () => validatePreflight({ task, adapter: { agentName: 'mock' }, currentTaskMetadata: metadata }),
      /PREFLIGHT_BLOCKED_CONTEXT_MISMATCH/
    );
  });

  test('PREFLIGHT-08: BASE_SHA mismatch blocks (C47)', () => {
    const head = execFileSync('git', ['-C', tempRepo, 'rev-parse', 'HEAD'], { encoding: 'utf8' }).trim();
    const task = {
      taskId: 'TASK-08',
      contextMode: 'KONFRM_REPO',
      expectedBranch: 'feature/test-branch',
      expectedHeadSha: head,
      expectedStage: 'DEV',
      worktreeRoot: tempRepo,
      agent: 'mock',
      mode: 'READ_ONLY'
    };

    const metadata = {
      TASK_ID: 'TASK-08',
      EXPECTED_BRANCH: 'feature/test-branch',
      BASE_SHA: 'mismatched_base_sha_123',
      STAGE: 'DEV'
    };

    assert.throws(
      () => validatePreflight({ task, adapter: { agentName: 'mock' }, currentTaskMetadata: metadata }),
      /PREFLIGHT_BLOCKED_CONTEXT_MISMATCH/
    );
  });

  test('PREFLIGHT-09: STAGE mismatch blocks (C47)', () => {
    const head = execFileSync('git', ['-C', tempRepo, 'rev-parse', 'HEAD'], { encoding: 'utf8' }).trim();
    const task = {
      taskId: 'TASK-09',
      contextMode: 'KONFRM_REPO',
      expectedBranch: 'feature/test-branch',
      expectedHeadSha: head,
      expectedStage: 'DEV',
      worktreeRoot: tempRepo,
      agent: 'mock',
      mode: 'READ_ONLY'
    };

    const metadata = {
      TASK_ID: 'TASK-09',
      EXPECTED_BRANCH: 'feature/test-branch',
      BASE_SHA: head,
      STAGE: 'STAGE_PROD_DIFFERS'
    };

    assert.throws(
      () => validatePreflight({ task, adapter: { agentName: 'mock' }, currentTaskMetadata: metadata }),
      /PREFLIGHT_BLOCKED_CONTEXT_MISMATCH/
    );
  });

  test('PREFLIGHT-10: expectedBranch missing for real KONFRM task blocks (C47)', () => {
    const head = execFileSync('git', ['-C', tempRepo, 'rev-parse', 'HEAD'], { encoding: 'utf8' }).trim();
    const task = {
      taskId: 'TASK-10',
      contextMode: 'KONFRM_REPO',
      // expectedBranch missing!
      expectedHeadSha: head,
      expectedStage: 'DEV',
      worktreeRoot: tempRepo,
      agent: 'mock',
      mode: 'READ_ONLY'
    };

    const metadata = {
      TASK_ID: 'TASK-10',
      EXPECTED_BRANCH: 'feature/test-branch',
      BASE_SHA: head,
      STAGE: 'DEV'
    };

    assert.throws(
      () => validatePreflight({ task, adapter: { agentName: 'mock' }, currentTaskMetadata: metadata }),
      /PREFLIGHT_BLOCKED_CONTEXT_METADATA_INSUFFICIENT/
    );
  });

  test('PREFLIGHT-11: expectedHead missing for real KONFRM task blocks (C47)', () => {
    const task = {
      taskId: 'TASK-11',
      contextMode: 'KONFRM_REPO',
      expectedBranch: 'feature/test-branch',
      // expectedHeadSha missing!
      expectedStage: 'DEV',
      worktreeRoot: tempRepo,
      agent: 'mock',
      mode: 'READ_ONLY'
    };

    const metadata = {
      TASK_ID: 'TASK-11',
      EXPECTED_BRANCH: 'feature/test-branch',
      BASE_SHA: 'some_base',
      STAGE: 'DEV'
    };

    assert.throws(
      () => validatePreflight({ task, adapter: { agentName: 'mock' }, currentTaskMetadata: metadata }),
      /PREFLIGHT_BLOCKED_CONTEXT_METADATA_INSUFFICIENT/
    );
  });

  test('PREFLIGHT-12: invalid taskId blocks before lock (C48)', () => {
    const invalidIds = [
      '../evil_task',
      '..\\evil_task',
      '/task_abs',
      '\\task_abs',
      'task with space',
      'C:\\escaped\\task',
      'task\x00null',
      'a'.repeat(150)
    ];

    for (const badId of invalidIds) {
      const task = {
        taskId: badId,
        expectedBranch: 'feature/test-branch',
        worktreeRoot: tempRepo,
        agent: 'mock',
        mode: 'READ_ONLY'
      };

      assert.throws(
        () => validatePreflight({ task, adapter: { agentName: 'mock' } }),
        /PREFLIGHT_BLOCKED_INVALID_IDENTIFIER/,
        `Should reject invalid taskId: "${badId}"`
      );
    }
  });

  test('PREFLIGHT-13: WRITE empty allowlist blocks (C59)', () => {
    const head = execFileSync('git', ['-C', tempRepo, 'rev-parse', 'HEAD'], { encoding: 'utf8' }).trim();
    const task = {
      taskId: 'TASK-13',
      expectedBranch: 'feature/test-branch',
      expectedHeadSha: head,
      mode: 'WRITE',
      requiresWriterLock: true,
      worktreeRoot: tempRepo,
      agent: 'mock',
      allowedWritePaths: [] // Empty allowlist without unrestrictedSandbox!
    };

    assert.throws(
      () => validatePreflight({ task, adapter: { agentName: 'mock' } }),
      /PREFLIGHT_BLOCKED_WRITE_SCOPE_MISSING/
    );
  });

  test('LAB-01: valid canonical runtime lab accepted (C63)', () => {
    const fakeLabsRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'konfrm-labs-root-'));
    const labWorktree = path.join(fakeLabsRoot, 'test-lab-1');
    fs.mkdirSync(labWorktree, { recursive: true });

    execFileSync('git', ['init', '-b', 'main', labWorktree], { stdio: 'ignore' });
    execFileSync('git', ['-C', labWorktree, 'config', 'user.name', 'Test Runner'], { stdio: 'ignore' });
    execFileSync('git', ['-C', labWorktree, 'config', 'user.email', 'test@example.com'], { stdio: 'ignore' });
    fs.writeFileSync(path.join(labWorktree, 'init.txt'), 'init\n', 'utf8');
    execFileSync('git', ['-C', labWorktree, 'add', '.'], { stdio: 'ignore' });
    execFileSync('git', ['-C', labWorktree, 'commit', '-m', 'Init'], { stdio: 'ignore' });

    fs.writeFileSync(path.join(labWorktree, 'lab-manifest.json'), JSON.stringify({
      schemaVersion: 1,
      labId: 'lab-01',
      purpose: 'AUTO-04_TEST'
    }), 'utf8');

    const head = execFileSync('git', ['-C', labWorktree, 'rev-parse', 'HEAD'], { encoding: 'utf8' }).trim();
    const task = {
      taskId: 'TASK-LAB-01',
      contextMode: 'SYNTHETIC_LAB',
      expectedBranch: 'main',
      expectedHeadSha: head,
      worktreeRoot: labWorktree,
      agent: 'mock',
      mode: 'WRITE',
      requiresWriterLock: true,
      allowedWritePaths: ['init.txt']
    };

    assert.doesNotThrow(() => {
      validatePreflight({
        task,
        adapter: { agentName: 'mock' },
        runtimePaths: { labs: fakeLabsRoot }
      });
    });

    fs.rmSync(fakeLabsRoot, { recursive: true, force: true });
  });

  test('LAB-02: same repo outside labs root rejected (C63)', () => {
    const head = execFileSync('git', ['-C', tempRepo, 'rev-parse', 'HEAD'], { encoding: 'utf8' }).trim();
    fs.writeFileSync(path.join(tempRepo, 'lab-manifest.json'), JSON.stringify({
      schemaVersion: 1,
      labId: 'lab-02',
      purpose: 'AUTO-04_TEST'
    }), 'utf8');

    const fakeLabsRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'konfrm-labs-root-'));
    const task = {
      taskId: 'TASK-LAB-02',
      contextMode: 'SYNTHETIC_LAB',
      expectedBranch: 'feature/test-branch',
      expectedHeadSha: head,
      worktreeRoot: tempRepo,
      agent: 'mock',
      mode: 'WRITE',
      requiresWriterLock: true,
      allowedWritePaths: ['init.txt']
    };

    assert.throws(
      () => validatePreflight({
        task,
        adapter: { agentName: 'mock' },
        runtimePaths: { labs: fakeLabsRoot }
      }),
      /PREFLIGHT_BLOCKED_INVALID_SYNTHETIC_LAB/
    );

    fs.rmSync(fakeLabsRoot, { recursive: true, force: true });
  });

  test('LAB-03: symlink/junction escape rejected (C63)', () => {
    const fakeLabsRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'konfrm-labs-root-'));
    const outsideDir = fs.mkdtempSync(path.join(os.tmpdir(), 'konfrm-outside-'));
    execFileSync('git', ['init', '-b', 'main', outsideDir], { stdio: 'ignore' });
    fs.writeFileSync(path.join(outsideDir, 'init.txt'), 'init\n', 'utf8');
    execFileSync('git', ['-C', outsideDir, 'add', '.'], { stdio: 'ignore' });
    execFileSync('git', ['-C', outsideDir, 'commit', '-m', 'Init'], { stdio: 'ignore' });
    fs.writeFileSync(path.join(outsideDir, 'lab-manifest.json'), JSON.stringify({
      schemaVersion: 1,
      labId: 'escape-lab',
      purpose: 'TEST'
    }), 'utf8');

    const junctionInsideLabs = path.join(fakeLabsRoot, 'escaped-link');
    fs.symlinkSync(outsideDir, junctionInsideLabs, 'junction');

    const head = execFileSync('git', ['-C', outsideDir, 'rev-parse', 'HEAD'], { encoding: 'utf8' }).trim();
    const task = {
      taskId: 'TASK-LAB-03',
      contextMode: 'SYNTHETIC_LAB',
      expectedBranch: 'main',
      expectedHeadSha: head,
      worktreeRoot: junctionInsideLabs,
      agent: 'mock',
      mode: 'WRITE',
      requiresWriterLock: true,
      allowedWritePaths: ['init.txt']
    };

    assert.throws(
      () => validatePreflight({
        task,
        adapter: { agentName: 'mock' },
        runtimePaths: { labs: fakeLabsRoot }
      }),
      /PREFLIGHT_BLOCKED_INVALID_SYNTHETIC_LAB/
    );

    fs.rmSync(fakeLabsRoot, { recursive: true, force: true });
    fs.rmSync(outsideDir, { recursive: true, force: true });
  });

  test('LAB-04: renamed product-like repo outside lab root rejected (C63)', () => {
    const head = execFileSync('git', ['-C', tempRepo, 'rev-parse', 'HEAD'], { encoding: 'utf8' }).trim();
    const fakeLabsRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'konfrm-labs-root-'));

    const task = {
      taskId: 'TASK-LAB-04',
      contextMode: 'SYNTHETIC_LAB',
      expectedBranch: 'feature/test-branch',
      expectedHeadSha: head,
      worktreeRoot: tempRepo,
      agent: 'mock',
      mode: 'WRITE',
      requiresWriterLock: true,
      allowedWritePaths: ['init.txt']
    };

    assert.throws(
      () => validatePreflight({
        task,
        adapter: { agentName: 'mock' },
        runtimePaths: { labs: fakeLabsRoot }
      }),
      /PREFLIGHT_BLOCKED_INVALID_SYNTHETIC_LAB/
    );

    fs.rmSync(fakeLabsRoot, { recursive: true, force: true });
  });

  test('PREFLIGHT-14: unrestrictedSandbox rejected in KONFRM_REPO (C69)', () => {
    const head = execFileSync('git', ['-C', tempRepo, 'rev-parse', 'HEAD'], { encoding: 'utf8' }).trim();
    fs.mkdirSync(path.join(tempRepo, 'tasks'), { recursive: true });
    fs.writeFileSync(path.join(tempRepo, 'tasks', 'CURRENT_TASK.md'), `<!-- KONFRM_TASK_METADATA\nTASK_ID: TASK-14\nEXPECTED_BRANCH: feature/test-branch\nBASE_SHA: ${head}\nSTAGE: DEV\n-->\n`, 'utf8');

    const task = {
      taskId: 'TASK-14',
      baseSha: head,
      expectedBranch: 'feature/test-branch',
      expectedHeadSha: head,
      expectedStage: 'DEV',
      contextMode: 'KONFRM_REPO',
      mode: 'WRITE',
      requiresWriterLock: true,
      unrestrictedSandbox: true,
      worktreeRoot: tempRepo,
      agent: 'mock'
    };

    assert.throws(
      () => validatePreflight({ task, adapter: { agentName: 'mock' } }),
      /PREFLIGHT_BLOCKED_UNRESTRICTED_PRODUCT_WRITE/
    );
  });

  test('PREFLIGHT-15: traversal in allowedWritePaths rejected (C70)', () => {
    const head = execFileSync('git', ['-C', tempRepo, 'rev-parse', 'HEAD'], { encoding: 'utf8' }).trim();
    const task = {
      taskId: 'TASK-15',
      expectedBranch: 'feature/test-branch',
      expectedHeadSha: head,
      mode: 'WRITE',
      requiresWriterLock: true,
      worktreeRoot: tempRepo,
      agent: 'mock',
      allowedWritePaths: ['../outside.txt']
    };

    assert.throws(
      () => validatePreflight({ task, adapter: { agentName: 'mock' } }),
      /PREFLIGHT_BLOCKED_INVALID_WRITE_SCOPE/
    );
  });

  test('PREFLIGHT-16: absolute allowedWritePath rejected (C70)', () => {
    const head = execFileSync('git', ['-C', tempRepo, 'rev-parse', 'HEAD'], { encoding: 'utf8' }).trim();
    const task = {
      taskId: 'TASK-16',
      expectedBranch: 'feature/test-branch',
      expectedHeadSha: head,
      mode: 'WRITE',
      requiresWriterLock: true,
      worktreeRoot: tempRepo,
      agent: 'mock',
      allowedWritePaths: ['C:/absolute/path.txt']
    };

    assert.throws(
      () => validatePreflight({ task, adapter: { agentName: 'mock' } }),
      /PREFLIGHT_BLOCKED_INVALID_WRITE_SCOPE/
    );
  });
});

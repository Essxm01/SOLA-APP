import { test, describe, beforeEach, afterEach } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import crypto from 'node:crypto';
import { ensureRuntimeDirectories } from '../src/runtime-paths.mjs';
import {
  createRunDescriptor,
  readRunDescriptor,
  updateRunDescriptor,
  writeAuditEvent
} from '../src/run-store.mjs';

describe('Run Store (Section 18, 19.4, C20, C27)', () => {
  let tempRuntime;
  let paths;

  beforeEach(() => {
    tempRuntime = fs.mkdtempSync(path.join(os.tmpdir(), 'konfrm-runstore-'));
    paths = ensureRuntimeDirectories(tempRuntime);
  });

  afterEach(() => {
    if (tempRuntime && fs.existsSync(tempRuntime)) {
      fs.rmSync(tempRuntime, { recursive: true, force: true });
    }
  });

  test('RUN-01: Raw prompt text is absent from serialized run descriptor (only sha256 and byteLength stored)', () => {
    const sensitivePrompt = 'AUTO03_PROMPT_MUST_NOT_PERSIST_7f91 - super secret prompt content';
    const runId = 'run_test_security_01';

    const descriptor = createRunDescriptor({
      runsDir: paths.runs,
      runId,
      taskId: 'TASK-SEC-01',
      agent: 'mock',
      mode: 'WRITE',
      prompt: sensitivePrompt,
      promptSource: 'TASK_CONTRACT',
      worktreeRoot: 'C:/some/worktree'
    });

    // Check in-memory object
    assert.equal(descriptor.runId, runId);
    assert.equal(descriptor.promptByteLength, Buffer.byteLength(sensitivePrompt, 'utf8'));
    assert.equal(
      descriptor.promptSha256,
      crypto.createHash('sha256').update(sensitivePrompt, 'utf8').digest('hex')
    );
    assert.equal(descriptor.prompt, undefined);

    // Read directly from disk
    const descriptorFilePath = path.join(paths.runs, `run_${runId}.json`);
    assert.ok(fs.existsSync(descriptorFilePath));
    const rawContent = fs.readFileSync(descriptorFilePath, 'utf8');

    // Assert raw prompt string does NOT appear anywhere in the file
    assert.equal(rawContent.includes('AUTO03_PROMPT_MUST_NOT_PERSIST_7f91'), false);
    assert.equal(rawContent.includes('super secret'), false);
  });

  test('RUN-02: Raw logging defaults to null in run descriptor', () => {
    const runId = 'run_test_raw_log_02';
    const descriptor = createRunDescriptor({
      runsDir: paths.runs,
      runId,
      taskId: 'TASK-02',
      agent: 'mock',
      mode: 'WRITE',
      prompt: 'test prompt',
      promptSource: 'TASK_CONTRACT',
      worktreeRoot: 'C:/some/worktree'
    });

    assert.equal(descriptor.rawLogPath, null);
    assert.equal(descriptor.rawLogSha256, null);
    assert.ok(descriptor.eventLogPath);
  });

  test('RUN-03: Layer 1 audit event writer saves sanitized audit events', () => {
    const runId = 'run_test_audit_03';
    const event = writeAuditEvent(paths.events, runId, {
      taskId: 'TASK-03',
      status: 'SUCCESS',
      executionOutcome: 'PROCESS_COMPLETED',
      verificationOutcome: 'VERIFIED_PASSED'
    });

    const eventFilePath = path.join(paths.events, `event_${runId}.json`);
    assert.ok(fs.existsSync(eventFilePath));
    const onDisk = JSON.parse(fs.readFileSync(eventFilePath, 'utf8'));
    assert.equal(onDisk.status, 'SUCCESS');
    assert.equal(onDisk.executionOutcome, 'PROCESS_COMPLETED');
  });
});

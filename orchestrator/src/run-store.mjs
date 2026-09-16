/**
 * Run Metadata Store & Audit Logger (Section 18, 19.4, C20, C27)
 * Implements persistent run descriptors and Layer 1 audit events.
 * Strictly guarantees that full raw prompt text is never serialized into run descriptors by default.
 * Raw provider logs are disabled by default (rawLogPath: null).
 */

import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';

export function validateSafeRunId(runId) {
  if (typeof runId !== 'string' || !runId || !/^[A-Za-z0-9][A-Za-z0-9._-]{0,127}$/.test(runId)) {
    throw new Error(`INVALID_RUN_ID: runId must match ^[A-Za-z0-9][A-Za-z0-9._-]{0,127}$, got: "${runId}"`);
  }
  if (runId.includes('/') || runId.includes('\\') || runId.includes('..')) {
    throw new Error(`INVALID_RUN_ID: path traversal detected in runId: "${runId}"`);
  }
  return runId;
}

export function redactSensitiveData(val) {
  if (val === null || val === undefined) return val;
  if (typeof val === 'string') {
    let sanitized = val;
    sanitized = sanitized.replace(/Bearer\s+[A-Za-z0-9._~+/-]+=*/gi, 'Bearer [REDACTED]');
    sanitized = sanitized.replace(/eyJ[A-Za-z0-9_-]{10,}\.[A-Za-z0-9_-]{10,}\.[A-Za-z0-9_-]*/g, '[REDACTED_JWT]');
    sanitized = sanitized.replace(/(password|secret|api_key|apiKey|token|access_token)\s*[:=]\s*['"]?([^\s,;'"}{]+)['"]?/gi, '$1=[REDACTED]');
    return sanitized;
  }
  if (Array.isArray(val)) {
    return val.map(item => redactSensitiveData(item));
  }
  if (typeof val === 'object') {
    const redactedObj = {};
    for (const [key, prop] of Object.entries(val)) {
      if (/password|secret|token|apiKey|api_key|authorization/i.test(key)) {
        redactedObj[key] = '[REDACTED]';
      } else {
        redactedObj[key] = redactSensitiveData(prop);
      }
    }
    return redactedObj;
  }
  return val;
}

export function createRunDescriptor({
  runsDir,
  eventsDir,
  runId,
  taskId,
  agent = 'mock',
  mode = 'READ_ONLY',
  prompt = '',
  promptSource = 'TASK_CONTRACT',
  worktreeRoot = '',
  rawLogPath = null,
  rawLogSha256 = null
}) {
  validateSafeRunId(runId);
  if (!runsDir) {
    throw new Error('createRunDescriptor: runsDir is required');
  }

  const promptText = typeof prompt === 'string' ? prompt : '';
  const promptByteLength = Buffer.byteLength(promptText, 'utf8');
  const promptSha256 = crypto.createHash('sha256').update(promptText, 'utf8').digest('hex');

  const eventLogPath = eventsDir ? path.join(eventsDir, `event_${runId}.json`) : `event_${runId}.json`;

  const descriptor = {
    runId,
    taskId,
    agent,
    mode,
    worktreeRoot,
    promptSource,
    promptSha256,
    promptByteLength,
    startedAt: new Date().toISOString(),
    finishedAt: null,
    durationMs: null,
    state: 'INITIALIZING',
    exitCode: null,
    eventLogPath,
    rawLogPath,
    rawLogSha256
  };

  const descriptorPath = path.join(runsDir, `run_${runId}.json`);
  fs.writeFileSync(descriptorPath, JSON.stringify(descriptor, null, 2), 'utf8');

  return descriptor;
}

export function readRunDescriptor(runsDir, runId) {
  validateSafeRunId(runId);
  const descriptorPath = path.join(runsDir, `run_${runId}.json`);
  if (!fs.existsSync(descriptorPath)) return null;
  return JSON.parse(fs.readFileSync(descriptorPath, 'utf8'));
}

export function updateRunDescriptor(runsDir, runId, updates) {
  validateSafeRunId(runId);
  const current = readRunDescriptor(runsDir, runId);
  if (!current) {
    throw new Error(`Run descriptor not found for runId: ${runId}`);
  }

  // Ensure prompt text is never accidentally merged into descriptor
  const safeUpdates = { ...updates };
  delete safeUpdates.prompt;

  const merged = { ...current, ...safeUpdates };
  const descriptorPath = path.join(runsDir, `run_${runId}.json`);
  fs.writeFileSync(descriptorPath, JSON.stringify(merged, null, 2), 'utf8');
  return merged;
}

export function writeAuditEvent(eventsDir, runId, payload) {
  validateSafeRunId(runId);
  if (!eventsDir) {
    throw new Error('writeAuditEvent: eventsDir is required');
  }

  if (!fs.existsSync(eventsDir)) {
    fs.mkdirSync(eventsDir, { recursive: true });
  }

  const sanitizedPayload = redactSensitiveData(payload);
  const eventPath = path.join(eventsDir, `event_${runId}.json`);
  const eventData = {
    runId,
    timestamp: new Date().toISOString(),
    ...sanitizedPayload
  };

  fs.writeFileSync(eventPath, JSON.stringify(eventData, null, 2), 'utf8');
  return eventData;
}

import fs from 'node:fs';
import path from 'node:path';

const REQUIRED_METADATA_KEYS = ['TASK_ID', 'EXPECTED_BRANCH', 'BASE_SHA', 'STAGE'];

export function parseTaskMetadataBlock(content) {
  if (typeof content !== 'string') return null;

  const match = content.match(/<!--\s*KONFRM_TASK_METADATA\s*([\s\S]*?)\s*-->/);
  if (!match) return null;

  const blockText = match[1];
  const metadata = {};

  const lines = blockText.split(/\r?\n/);
  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;
    const colonIdx = trimmed.indexOf(':');
    if (colonIdx === -1) continue;
    const key = trimmed.slice(0, colonIdx).trim().toUpperCase();
    const value = trimmed.slice(colonIdx + 1).trim();
    metadata[key] = value;
  }

  for (const requiredKey of REQUIRED_METADATA_KEYS) {
    if (!metadata[requiredKey]) {
      return null;
    }
  }

  return {
    TASK_ID: metadata.TASK_ID,
    EXPECTED_BRANCH: metadata.EXPECTED_BRANCH,
    BASE_SHA: metadata.BASE_SHA,
    STAGE: metadata.STAGE
  };
}

export function loadRepositoryTaskContract(worktreeRoot) {
  if (!worktreeRoot) {
    const err = new Error('PREFLIGHT_BLOCKED_CONTEXT_METADATA_INSUFFICIENT: worktreeRoot is required');
    err.code = 'PREFLIGHT_BLOCKED_CONTEXT_METADATA_INSUFFICIENT';
    throw err;
  }

  const taskFilePath = path.join(worktreeRoot, 'tasks', 'CURRENT_TASK.md');
  if (!fs.existsSync(taskFilePath)) {
    const err = new Error(`PREFLIGHT_BLOCKED_CONTEXT_METADATA_INSUFFICIENT: ${taskFilePath} not found`);
    err.code = 'PREFLIGHT_BLOCKED_CONTEXT_METADATA_INSUFFICIENT';
    throw err;
  }

  let content;
  try {
    content = fs.readFileSync(taskFilePath, 'utf8');
  } catch (readErr) {
    const err = new Error(`PREFLIGHT_BLOCKED_CONTEXT_METADATA_INSUFFICIENT: Failed to read ${taskFilePath}: ${readErr.message}`);
    err.code = 'PREFLIGHT_BLOCKED_CONTEXT_METADATA_INSUFFICIENT';
    throw err;
  }

  const metadata = parseTaskMetadataBlock(content);
  if (!metadata) {
    const err = new Error(`PREFLIGHT_BLOCKED_CONTEXT_METADATA_INSUFFICIENT: Missing or invalid KONFRM_TASK_METADATA block in ${taskFilePath}`);
    err.code = 'PREFLIGHT_BLOCKED_CONTEXT_METADATA_INSUFFICIENT';
    throw err;
  }

  return metadata;
}

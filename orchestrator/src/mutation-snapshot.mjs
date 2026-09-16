/**
 * Mutation Snapshot Engine (Section 17, C14, C15, C28, C31)
 * Captures normalized pre/post Git status, diffs, and content fingerprints.
 * Detects mutations even when porcelain state remains identical (e.g. pre-dirty files).
 * Classifies mutations strictly into ZERO_MUTATION, MUTATED, or UNKNOWN.
 * Strictly non-destructive: never runs git restore, git reset, or git clean.
 */

import { execFileSync } from 'node:child_process';
import path from 'node:path';
import fs from 'node:fs';
import crypto from 'node:crypto';

export function parseStatusPorcelain(statusText) {
  if (!statusText || typeof statusText !== 'string') return [];
  const lines = statusText.split(/\r?\n/);
  const files = [];

  for (const line of lines) {
    if (!line.trim()) continue;
    const statusPart = line.slice(0, 2);
    const pathPart = line.slice(3).trim();

    let filePath = pathPart;
    if (pathPart.includes(' -> ')) {
      filePath = pathPart.split(' -> ')[1];
    }
    files.push({
      status: statusPart,
      path: filePath.replace(/\\/g, '/')
    });
  }

  return files;
}

function hashString(content) {
  return crypto.createHash('sha256').update(content || '', 'utf8').digest('hex');
}

function hashFileContent(filePath) {
  try {
    const data = fs.readFileSync(filePath);
    return crypto.createHash('sha256').update(data).digest('hex');
  } catch {
    return 'UNREADABLE';
  }
}

export function captureMutationSnapshot(worktreeRoot, gitBinary = 'git') {
  if (!worktreeRoot) {
    throw new Error('captureMutationSnapshot: worktreeRoot is required');
  }

  const resolved = path.resolve(worktreeRoot);

  try {
    let branch = '';
    try {
      branch = execFileSync(gitBinary, ['-C', resolved, 'branch', '--show-current'], {
        encoding: 'utf8',
        stdio: ['ignore', 'pipe', 'pipe'],
        shell: false
      }).trim();
    } catch {
      branch = execFileSync(gitBinary, ['-C', resolved, 'rev-parse', '--abbrev-ref', 'HEAD'], {
        encoding: 'utf8',
        stdio: ['ignore', 'pipe', 'pipe'],
        shell: false
      }).trim();
    }

    let head = '';
    try {
      head = execFileSync(gitBinary, ['-C', resolved, 'rev-parse', 'HEAD'], {
        encoding: 'utf8',
        stdio: ['ignore', 'pipe', 'pipe'],
        shell: false
      }).trim();
    } catch {
      head = 'EMPTY_TREE';
    }

    const statusText = execFileSync(
      gitBinary,
      ['-C', resolved, 'status', '--porcelain=v1', '-uall'],
      { encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'], shell: false }
    );

    const parsedEntries = parseStatusPorcelain(statusText);

    // Content fingerprints (C31)
    // 1. Unstaged diff
    const unstagedDiff = execFileSync(
      gitBinary,
      ['-C', resolved, 'diff', '--binary'],
      { encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'], shell: false }
    );
    const trackedDiffHash = hashString(unstagedDiff);

    // 2. Staged/index diff
    const stagedDiff = execFileSync(
      gitBinary,
      ['-C', resolved, 'diff', '--cached', '--binary'],
      { encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'], shell: false }
    );
    const stagedDiffHash = hashString(stagedDiff);

    // 3. Untracked file content hashes
    const untrackedContentMap = {};
    for (const entry of parsedEntries) {
      if (entry.status === '??') {
        const fullPath = path.join(resolved, entry.path);
        untrackedContentMap[entry.path] = hashFileContent(fullPath);
      }
    }

    return {
      worktreeRoot: resolved,
      branch,
      head,
      status: statusText,
      parsedEntries,
      trackedDiffHash,
      stagedDiffHash,
      untrackedContentMap,
      timestamp: new Date().toISOString()
    };
  } catch (err) {
    return {
      worktreeRoot: resolved,
      branch: 'ERROR',
      head: 'ERROR',
      status: 'ERROR',
      parsedEntries: [],
      trackedDiffHash: 'ERROR',
      stagedDiffHash: 'ERROR',
      untrackedContentMap: {},
      error: err.message,
      timestamp: new Date().toISOString()
    };
  }
}

export function compareMutationSnapshots(before, after) {
  if (
    !before ||
    !after ||
    before.head === 'ERROR' ||
    after.head === 'ERROR' ||
    before.status === 'ERROR' ||
    after.status === 'ERROR'
  ) {
    return {
      hasChanged: true,
      branchChanged: true,
      headChanged: true,
      statusChanged: true,
      contentChanged: true,
      changedPaths: []
    };
  }

  const branchChanged = before.branch !== after.branch;
  const headChanged = before.head !== after.head;
  const statusChanged = before.status !== after.status;
  const trackedContentChanged = (before.trackedDiffHash || '') !== (after.trackedDiffHash || '');
  const stagedContentChanged = (before.stagedDiffHash || '') !== (after.stagedDiffHash || '');

  const changedPathSet = new Set();

  // 1. Status entry differences
  const beforeMap = new Map(before.parsedEntries.map(e => [e.path, e.status]));
  const afterMap = new Map(after.parsedEntries.map(e => [e.path, e.status]));

  for (const [p, s] of afterMap.entries()) {
    if (!beforeMap.has(p) || beforeMap.get(p) !== s) {
      changedPathSet.add(p);
    }
  }

  for (const [p, s] of beforeMap.entries()) {
    if (!afterMap.has(p) || afterMap.get(p) !== s) {
      changedPathSet.add(p);
    }
  }

  // 2. Untracked file content changes
  const beforeUntracked = before.untrackedContentMap || {};
  const afterUntracked = after.untrackedContentMap || {};

  for (const [p, h] of Object.entries(afterUntracked)) {
    if (beforeUntracked[p] !== h) {
      changedPathSet.add(p);
    }
  }

  // 3. Tracked content differences when status string didn't change
  if (trackedContentChanged || stagedContentChanged) {
    // If diff changed, any tracked modified file is marked changed
    for (const e of after.parsedEntries) {
      if (e.status.includes('M') || e.status.includes('A') || e.status.includes('D')) {
        changedPathSet.add(e.path);
      }
    }
  }

  const changedPaths = Array.from(changedPathSet);
  const contentChanged = trackedContentChanged || stagedContentChanged || changedPaths.length > 0;
  const hasChanged = branchChanged || headChanged || statusChanged || contentChanged;

  return {
    hasChanged,
    branchChanged,
    headChanged,
    statusChanged,
    contentChanged,
    changedPaths
  };
}

export function classifyMutation(before, after) {
  if (
    !before ||
    !after ||
    before.head === 'ERROR' ||
    after.head === 'ERROR' ||
    before.status === 'ERROR' ||
    after.status === 'ERROR'
  ) {
    return {
      classification: 'UNKNOWN',
      hasChanged: true,
      changedPaths: [],
      reason: 'Missing or corrupted snapshot baseline'
    };
  }

  const comparison = compareMutationSnapshots(before, after);

  if (!comparison.hasChanged) {
    return {
      classification: 'ZERO_MUTATION',
      hasChanged: false,
      changedPaths: [],
      reason: 'Worktree branch, HEAD, status, and contents are identical'
    };
  }

  return {
    classification: 'MUTATED',
    hasChanged: true,
    changedPaths: comparison.changedPaths,
    branchChanged: comparison.branchChanged,
    headChanged: comparison.headChanged,
    contentChanged: comparison.contentChanged,
    reason: `Detected mutations: ${comparison.changedPaths.length} file(s) altered`
  };
}

/**
 * Mutation Snapshot Engine (Section 17, C14, C15, C28)
 * Captures normalized pre/post Git status and diffs.
 * Classifies mutations strictly into ZERO_MUTATION, MUTATED, or UNKNOWN.
 * Strictly non-destructive: never runs git restore, git reset, or git clean.
 */

import { execFileSync } from 'node:child_process';
import path from 'node:path';

export function parseStatusPorcelain(statusText) {
  if (!statusText || typeof statusText !== 'string') return [];
  const lines = statusText.split(/\r?\n/);
  const files = [];

  for (const line of lines) {
    if (!line.trim()) continue;
    // Status format: XY PATH or XY PATH -> NEW_PATH
    const statusPart = line.slice(0, 2);
    const pathPart = line.slice(3).trim();

    // If rename: "file1 -> file2"
    let filePath = pathPart;
    if (pathPart.includes(' -> ')) {
      filePath = pathPart.split(' -> ')[1];
    }
    // Normalize slashes
    files.push({
      status: statusPart,
      path: filePath.replace(/\\/g, '/')
    });
  }

  return files;
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

    return {
      worktreeRoot: resolved,
      branch,
      head,
      status: statusText,
      parsedEntries,
      timestamp: new Date().toISOString()
    };
  } catch (err) {
    return {
      worktreeRoot: resolved,
      branch: 'ERROR',
      head: 'ERROR',
      status: 'ERROR',
      parsedEntries: [],
      error: err.message,
      timestamp: new Date().toISOString()
    };
  }
}

export function compareMutationSnapshots(before, after) {
  if (!before || !after || before.head === 'ERROR' || after.head === 'ERROR') {
    return {
      hasChanged: true,
      branchChanged: true,
      headChanged: true,
      statusChanged: true,
      changedPaths: []
    };
  }

  const branchChanged = before.branch !== after.branch;
  const headChanged = before.head !== after.head;
  const statusChanged = before.status !== after.status;

  const changedPathSet = new Set();

  // Find paths present in after that weren't in before or changed status
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

  const changedPaths = Array.from(changedPathSet);
  const hasChanged = branchChanged || headChanged || statusChanged || changedPaths.length > 0;

  return {
    hasChanged,
    branchChanged,
    headChanged,
    statusChanged,
    changedPaths
  };
}

export function classifyMutation(before, after) {
  if (!before || !after || before.head === 'ERROR' || after.head === 'ERROR') {
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
      reason: 'Worktree branch, HEAD, and working directory status are identical'
    };
  }

  return {
    classification: 'MUTATED',
    hasChanged: true,
    changedPaths: comparison.changedPaths,
    branchChanged: comparison.branchChanged,
    headChanged: comparison.headChanged,
    reason: `Detected mutations: ${comparison.changedPaths.length} file(s) altered`
  };
}

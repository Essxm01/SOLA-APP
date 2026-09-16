/**
 * Canonical Worktree Identity Calculation (Section 13.1, C25, C26)
 * Computes deterministic worktree lock identities using full 64-char lowercase SHA-256 hex digests.
 * Resilient against Windows path aliases, symlinks, 8.3 short names, and casing variations.
 */

import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { execFileSync } from 'node:child_process';

export function normalizePathForIdentity(rawPath) {
  if (!rawPath || typeof rawPath !== 'string') return '';
  // Normalize slashes to forward slashes
  let normalized = path.normalize(rawPath).replace(/\\/g, '/');
  // Normalize Windows drive letters to uppercase (e.g. c:/ -> C:/)
  if (/^[a-zA-Z]:\//.test(normalized)) {
    normalized = normalized.charAt(0).toUpperCase() + normalized.slice(1);
  }
  // Strip any trailing slash except root
  if (normalized.length > 3 && normalized.endsWith('/')) {
    normalized = normalized.slice(0, -1);
  }
  return normalized;
}

export function computeWorktreeIdentity(worktreeRoot, gitBinary = 'git') {
  if (!worktreeRoot || typeof worktreeRoot !== 'string') {
    throw new Error('computeWorktreeIdentity: worktreeRoot must be a non-empty string');
  }

  // 1. Resolve canonical realpath of worktree root
  const resolvedWorktree = path.resolve(worktreeRoot);
  const realWorktree = fs.realpathSync.native ? fs.realpathSync.native(resolvedWorktree) : fs.realpathSync(resolvedWorktree);
  const canonicalWorktreeRealpath = normalizePathForIdentity(realWorktree);

  // 2. Discover shared git common directory using structured arguments (Correction C25)
  let rawCommonDir;
  try {
    rawCommonDir = execFileSync(
      gitBinary,
      ['-C', resolvedWorktree, 'rev-parse', '--path-format=absolute', '--git-common-dir'],
      { encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'], shell: false }
    ).trim();
  } catch (err) {
    // Fallback if --path-format=absolute is unsupported by older git
    try {
      rawCommonDir = execFileSync(
        gitBinary,
        ['-C', resolvedWorktree, 'rev-parse', '--git-common-dir'],
        { encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'], shell: false }
      ).trim();
    } catch (innerErr) {
      throw new Error(`Failed to resolve git common directory for "${worktreeRoot}": ${err.message}`);
    }
  }

  // 3. Resolve common dir relative to worktreeRoot if relative
  const resolvedCommonDir = path.isAbsolute(rawCommonDir)
    ? rawCommonDir
    : path.resolve(resolvedWorktree, rawCommonDir);

  const realCommonDir = fs.realpathSync.native ? fs.realpathSync.native(resolvedCommonDir) : fs.realpathSync(resolvedCommonDir);
  const canonicalGitCommonDir = normalizePathForIdentity(realCommonDir);

  // 4. Construct canonical input: canonicalGitCommonDir + "\n" + canonicalWorktreeRealpath
  const lockIdInput = `${canonicalGitCommonDir}\n${canonicalWorktreeRealpath}`;

  // 5. Derive full 64-character lowercase SHA-256 hex digest (Correction C26)
  const lockKey = crypto.createHash('sha256').update(lockIdInput, 'utf8').digest('hex');

  return {
    lockKey,
    canonicalWorktreeRealpath,
    canonicalGitCommonDir,
    lockFileName: `lock_${lockKey}.json`
  };
}

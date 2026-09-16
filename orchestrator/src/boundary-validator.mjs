/**
 * Write Boundary & Allowlist Validator (Section 9, C33)
 * Validates that all changed file paths strictly reside within declared allowedWritePaths
 * and do not touch any forbiddenWritePaths.
 * Enforces boundary-safe matching, path traversal protection, and case normalization.
 */

import path from 'node:path';

export function normalizeRelativePath(p) {
  if (!p || typeof p !== 'string') return '';
  // Convert slashes to forward slashes
  let normalized = p.replace(/\\/g, '/');
  // Strip leading slash
  if (normalized.startsWith('/')) {
    normalized = normalized.slice(1);
  }
  // Canonicalize relative segments
  const parts = [];
  for (const seg of normalized.split('/')) {
    if (!seg || seg === '.') continue;
    if (seg === '..') {
      if (parts.length > 0 && parts[parts.length - 1] !== '..') {
        parts.pop();
      } else {
        parts.push('..');
      }
    } else {
      parts.push(seg);
    }
  }
  return parts.join('/');
}

export function isPathEscaped(normalizedPath) {
  return normalizedPath.startsWith('../') || normalizedPath === '..' || normalizedPath.includes('/../');
}

export function pathMatchesScope(candidatePath, scopePath) {
  const normCandidate = normalizeRelativePath(candidatePath);
  const normScope = normalizeRelativePath(scopePath);

  if (isPathEscaped(normCandidate) || isPathEscaped(normScope)) {
    return false;
  }

  // Windows case-insensitive comparison
  const cLower = normCandidate.toLowerCase();
  const sLower = normScope.toLowerCase();

  // Exact file match
  if (cLower === sLower) return true;

  // Directory scope match: candidate must be under scope/
  if (sLower.endsWith('/')) {
    return cLower.startsWith(sLower);
  } else {
    return cLower.startsWith(sLower + '/');
  }
}

export const isPathAllowed = pathMatchesScope;

export function validateWriteBoundaries({
  changedPaths = [],
  allowedWritePaths = [],
  forbiddenWritePaths = [],
  unrestrictedSandbox = false
}) {
  const forbiddenViolations = [];
  const outsideAllowedViolations = [];

  if (!changedPaths || changedPaths.length === 0) {
    return {
      valid: true,
      forbiddenViolations: [],
      outsideAllowedViolations: [],
      reason: null
    };
  }

  // If no allowedWritePaths declared and not in unrestricted mode, fail closed
  if (!unrestrictedSandbox && (!allowedWritePaths || allowedWritePaths.length === 0)) {
    return {
      valid: false,
      forbiddenViolations: [],
      outsideAllowedViolations: [...changedPaths],
      reason: 'Empty allowedWritePaths declared for WRITE task without unrestrictedSandbox'
    };
  }

  for (const rawPath of changedPaths) {
    const norm = normalizeRelativePath(rawPath);

    // 1. Path traversal escape check
    if (isPathEscaped(norm)) {
      outsideAllowedViolations.push(rawPath);
      continue;
    }

    // 2. Explicit forbidden path check (always overrides allowed)
    const isForbidden = forbiddenWritePaths.some(fp => pathMatchesScope(norm, fp));
    if (isForbidden) {
      forbiddenViolations.push(rawPath);
      continue;
    }

    // 3. Allowlist check
    if (!unrestrictedSandbox) {
      const isAllowed = allowedWritePaths.some(ap => pathMatchesScope(norm, ap));
      if (!isAllowed) {
        outsideAllowedViolations.push(rawPath);
      }
    }
  }

  const valid = forbiddenViolations.length === 0 && outsideAllowedViolations.length === 0;

  return {
    valid,
    forbiddenViolations,
    outsideAllowedViolations,
    reason: valid
      ? null
      : `Boundary violation: ${forbiddenViolations.length} forbidden file(s), ${outsideAllowedViolations.length} file(s) outside allowed scope`
  };
}

/**
 * Runtime Policy Engine (ADR-AUTO-009)
 * Pure version assessment API and real-agent fail-closed guard.
 */

export const SUPPORTED_LTS_MAJORS = [22, 24];
export const PREFERRED_LTS_MAJOR = 24;

export const KNOWN_EOL_MAJORS = [0, 4, 6, 8, 10, 12, 14, 16, 17, 18, 19, 20, 21, 23, 25];

export function assessNodeRuntime(versionString) {
  if (!versionString || typeof versionString !== 'string') {
    return {
      version: String(versionString),
      major: null,
      status: 'UNKNOWN_FAIL_CLOSED',
      allowsRealAgents: false,
      reason: 'Invalid or missing version string'
    };
  }

  const clean = versionString.trim().replace(/^v/, '');
  const match = clean.match(/^(\d+)\.(\d+)\.(\d+)/);
  if (!match) {
    return {
      version: versionString,
      major: null,
      status: 'UNKNOWN_FAIL_CLOSED',
      allowsRealAgents: false,
      reason: 'Unparsable semantic version'
    };
  }

  const major = parseInt(match[1], 10);

  if (SUPPORTED_LTS_MAJORS.includes(major)) {
    return {
      version: versionString,
      major,
      status: 'SUPPORTED_LTS',
      allowsRealAgents: true,
      reason: `Node.js ${major}.x is a supported active LTS release`
    };
  }

  if (KNOWN_EOL_MAJORS.includes(major) || major < 22) {
    return {
      version: versionString,
      major,
      status: 'EOL_UNSUPPORTED_FOR_REAL_AGENTS',
      allowsRealAgents: false,
      reason: `Node.js ${major}.x is End-of-Life (EOL) or non-LTS; real agent execution prohibited`
    };
  }

  // Any other future or unclassified major
  return {
    version: versionString,
    major,
    status: 'UNKNOWN_FAIL_CLOSED',
    allowsRealAgents: false,
    reason: `Node.js ${major}.x is unverified for orchestrator execution`
  };
}

export function assertRuntimeAllowsRealAgentExecution(versionString = process.version) {
  const assessment = assessNodeRuntime(versionString);
  if (!assessment.allowsRealAgents) {
    const err = new Error(`PREFLIGHT_BLOCKED_EOL_RUNTIME: ${assessment.reason} (version: ${assessment.version})`);
    err.code = 'PREFLIGHT_BLOCKED_EOL_RUNTIME';
    err.assessment = assessment;
    throw err;
  }
  return true;
}

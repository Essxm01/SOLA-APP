/**
 * Child Process Supervisor (Section 19, 20, C18, C19)
 * Spawns, monitors, captures I/O, and enforces execution timeouts.
 * Enforces shell: false and structured argv.
 * Implements platform-aware cancellation:
 * On Windows, terminates descendant process trees using taskkill.exe /T /F /PID <pid>.
 */

import { spawn, execFile } from 'node:child_process';

const DEFAULT_ALLOWED_ENV_VARS = new Set([
  'PATH',
  'PATHEXT',
  'SYSTEMROOT',
  'SYSTEMDRIVE',
  'WINDIR',
  'TEMP',
  'TMP',
  'USERPROFILE',
  'HOME',
  'HOMEDRIVE',
  'HOMEPATH',
  'APPDATA',
  'LOCALAPPDATA',
  'PROGRAMDATA',
  'PROGRAMFILES',
  'PROGRAMFILES(X86)',
  'COMMONPROGRAMFILES',
  'COMMONPROGRAMFILES(X86)',
  'COMSPEC',
  'SHELL',
  'TERM',
  'LANG',
  'LC_ALL',
  'LC_CTYPE',
  'TZ',
  'NODE_ENV',
  'NODE_PATH'
]);

export function isProcessAlive(pid) {
  if (typeof pid !== 'number' || isNaN(pid) || pid <= 0) return false;
  try {
    process.kill(pid, 0);
    return true;
  } catch (err) {
    return err.code === 'EPERM';
  }
}

export function buildSafeChildEnvironment(customEnv = {}) {
  const safeEnv = {};
  for (const [key, value] of Object.entries(process.env)) {
    if (DEFAULT_ALLOWED_ENV_VARS.has(key.toUpperCase())) {
      safeEnv[key] = value;
    }
  }
  for (const [key, value] of Object.entries(customEnv)) {
    if (value !== undefined && value !== null) {
      safeEnv[key] = String(value);
    }
  }
  return safeEnv;
}

export async function terminateProcessTree(pid, cancellationMethod = 'PROCESS_TERMINATE', timeoutMs = 5000) {
  if (typeof pid !== 'number' || isNaN(pid) || pid <= 0) {
    return { status: 'ALREADY_EXITED' };
  }

  if (!isProcessAlive(pid)) {
    return { status: 'ALREADY_EXITED' };
  }

  if (process.platform === 'win32') {
    await new Promise((resolve) => {
      execFile('taskkill.exe', ['/T', '/F', '/PID', String(pid)], {
        windowsHide: true,
        stdio: 'ignore'
      }, () => {
        resolve();
      });
    });
  } else {
    try {
      process.kill(-pid, 'SIGKILL');
    } catch {
      try {
        process.kill(pid, 'SIGKILL');
      } catch {}
    }
  }

  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    if (!isProcessAlive(pid)) {
      return { status: 'TERMINATED' };
    }
    await new Promise((r) => setTimeout(r, 50));
  }

  return isProcessAlive(pid) ? { status: 'TERMINATION_FAILED' } : { status: 'TERMINATED' };
}

export const killProcessTree = terminateProcessTree;

export function spawnSupervisedProcess({
  command,
  args = [],
  cwd = process.cwd(),
  env = null,
  stdinText = null,
  timeoutMs = 600000,
  maxBufferBytes = 4 * 1024 * 1024
}) {
  if (!command) {
    throw new Error('spawnSupervisedProcess: command is required');
  }

  const effectiveEnv = env ? { ...buildSafeChildEnvironment(), ...env } : buildSafeChildEnvironment();

  const startTime = Date.now();
  let timedOut = false;
  let cancelled = false;
  let cancellationMethod = null;
  let timeoutTimer = null;

  let stdoutChunks = [];
  let stderrChunks = [];
  let stdoutLength = 0;
  let stderrLength = 0;

  // Strict enforcement of shell: false
  const child = spawn(command, args, {
    cwd,
    env: effectiveEnv,
    shell: false,
    windowsHide: true,
    stdio: ['pipe', 'pipe', 'pipe']
  });

  const pid = child.pid;

  if (child.stdout) {
    child.stdout.on('data', chunk => {
      if (stdoutLength + chunk.length <= maxBufferBytes) {
        stdoutChunks.push(chunk);
        stdoutLength += chunk.length;
      }
    });
  }

  if (child.stderr) {
    child.stderr.on('data', chunk => {
      if (stderrLength + chunk.length <= maxBufferBytes) {
        stderrChunks.push(chunk);
        stderrLength += chunk.length;
      }
    });
  }

  if (stdinText && child.stdin) {
    child.stdin.write(stdinText);
    child.stdin.end();
  } else if (child.stdin) {
    child.stdin.end();
  }

  const cancel = (method = 'PROCESS_TERMINATE') => {
    if (cancelled || timedOut) return;
    cancelled = true;
    cancellationMethod = method;

    if (process.platform === 'win32' || method === 'WINDOWS_PROCESS_TREE_TERMINATE') {
      killProcessTree(pid, method);
    } else {
      try {
        child.kill();
      } catch {
        killProcessTree(pid, method);
      }
    }
  };

  const promise = new Promise((resolve) => {
    child.on('error', err => {
      if (timeoutTimer) clearTimeout(timeoutTimer);
      const durationMs = Date.now() - startTime;
      resolve({
        pid,
        exitCode: null,
        signal: null,
        stdout: Buffer.concat(stdoutChunks).toString('utf8'),
        stderr: Buffer.concat(stderrChunks).toString('utf8'),
        durationMs,
        timedOut,
        cancelled,
        cancellationMethod,
        spawnError: err.message
      });
    });

    if (timeoutMs > 0 && timeoutMs !== Infinity) {
      timeoutTimer = setTimeout(() => {
        timedOut = true;
        cancellationMethod = process.platform === 'win32'
          ? 'WINDOWS_PROCESS_TREE_TERMINATE'
          : 'TIMEOUT_ABORT';
        killProcessTree(pid, cancellationMethod);
      }, timeoutMs);
    }

    child.on('close', (code, signal) => {
      if (timeoutTimer) clearTimeout(timeoutTimer);
      const durationMs = Date.now() - startTime;
      const stdout = Buffer.concat(stdoutChunks).toString('utf8');
      const stderr = Buffer.concat(stderrChunks).toString('utf8');

      resolve({
        pid,
        exitCode: code, // null if terminated via signal
        signal,
        stdout,
        stderr,
        durationMs,
        timedOut,
        cancelled,
        cancellationMethod
      });
    });
  });

  return {
    pid,
    promise,
    cancel,
    stdoutChunks,
    stderrChunks,
    child
  };
}

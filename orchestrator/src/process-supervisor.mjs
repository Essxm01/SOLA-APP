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
    } catch (_groupKillErr) {
      try {
        process.kill(pid, 'SIGKILL');
      } catch (_singleKillErr) {
        // Process may already have exited
      }
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
  maxBufferBytes = 4 * 1024 * 1024,
  terminateProcessTreeFn = terminateProcessTree
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
  let forceCloseTimer = null;
  let settled = false;
  let terminationResult = null;

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

  let resolvePromise;
  const promise = new Promise((resolve) => {
    resolvePromise = resolve;
  });

  const settle = (resultData = {}) => {
    if (settled) return;
    settled = true;
    if (timeoutTimer) clearTimeout(timeoutTimer);
    if (forceCloseTimer) clearTimeout(forceCloseTimer);

    const alive = isProcessAlive(pid);
    let finalTerminationStatus = null;
    if (terminationResult?.status) {
      finalTerminationStatus = terminationResult.status;
    } else if (timedOut || cancelled) {
      finalTerminationStatus = alive ? 'TERMINATION_FAILED' : 'TERMINATED';
    }

    const processStillAlive = alive;

    resolvePromise({
      pid,
      exitCode: resultData.exitCode ?? null,
      signal: resultData.signal ?? null,
      stdout: Buffer.concat(stdoutChunks).toString('utf8'),
      stderr: Buffer.concat(stderrChunks).toString('utf8'),
      durationMs: Date.now() - startTime,
      timedOut,
      cancelled,
      cancellationMethod,
      terminationStatus: finalTerminationStatus,
      processStillAlive,
      spawnError: resultData.spawnError
    });
  };

  const scheduleForceClose = () => {
    if (settled || forceCloseTimer) return;
    forceCloseTimer = setTimeout(() => {
      if (!settled) {
        settle({ exitCode: null, signal: null });
      }
    }, 300);
  };

  const cancel = async (method = 'PROCESS_TERMINATE') => {
    if (cancelled || timedOut || settled) {
      const alive = isProcessAlive(pid);
      return {
        status: terminationResult?.status || (alive ? 'TERMINATION_FAILED' : 'ALREADY_EXITED'),
        processStillAlive: alive,
        cancellationMethod: cancellationMethod || method
      };
    }
    cancelled = true;
    cancellationMethod = method;

    try {
      const term = await terminateProcessTreeFn(pid, method);
      const alive = isProcessAlive(pid);
      terminationResult = {
        status: term?.status || (alive ? 'TERMINATION_FAILED' : 'TERMINATED'),
        processStillAlive: alive,
        cancellationMethod
      };
    } catch (_termErr) {
      const alive = isProcessAlive(pid);
      terminationResult = {
        status: alive ? 'TERMINATION_FAILED' : 'TERMINATED',
        processStillAlive: alive,
        cancellationMethod
      };
    }

    scheduleForceClose();
    return terminationResult;
  };

  child.on('error', err => {
    settle({ exitCode: null, signal: null, spawnError: err.message });
  });

  if (timeoutMs > 0 && timeoutMs !== Infinity) {
    timeoutTimer = setTimeout(async () => {
      if (settled || cancelled || timedOut) return;
      timedOut = true;
      cancellationMethod = process.platform === 'win32'
        ? 'WINDOWS_PROCESS_TREE_TERMINATE'
        : 'TIMEOUT_ABORT';

      try {
        const term = await terminateProcessTreeFn(pid, cancellationMethod);
        const alive = isProcessAlive(pid);
        terminationResult = {
          status: term?.status || (alive ? 'TERMINATION_FAILED' : 'TERMINATED'),
          processStillAlive: alive,
          cancellationMethod
        };
      } catch (_termErr) {
        const alive = isProcessAlive(pid);
        terminationResult = {
          status: alive ? 'TERMINATION_FAILED' : 'TERMINATED',
          processStillAlive: alive,
          cancellationMethod
        };
      }

      scheduleForceClose();
    }, timeoutMs);
  }

  child.on('close', (code, signal) => {
    settle({ exitCode: code, signal });
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

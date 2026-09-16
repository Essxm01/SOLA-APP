/**
 * Child Process Supervisor (Section 19, 20, C18, C19)
 * Spawns, monitors, captures I/O, and enforces execution timeouts.
 * Enforces shell: false and structured argv.
 * Implements platform-aware cancellation:
 * On Windows, terminates descendant process trees using taskkill.exe /T /F /PID <pid>.
 */

import { spawn, execFile } from 'node:child_process';

export function killProcessTree(pid, cancellationMethod = 'PROCESS_TERMINATE') {
  if (typeof pid !== 'number' || isNaN(pid) || pid <= 0) return;

  if (process.platform === 'win32') {
    // Windows process tree termination via built-in taskkill.exe
    try {
      execFile('taskkill.exe', ['/T', '/F', '/PID', String(pid)], {
        windowsHide: true,
        stdio: 'ignore'
      }, () => {
        // Ignore error if process already exited
      });
    } catch {
      // Fallback
      try {
        process.kill(pid, 'SIGKILL');
      } catch {}
    }
  } else {
    try {
      process.kill(-pid, 'SIGKILL');
    } catch {
      try {
        process.kill(pid, 'SIGKILL');
      } catch {}
    }
  }
}

export function spawnSupervisedProcess({
  command,
  args = [],
  cwd = process.cwd(),
  env = process.env,
  stdinText = null,
  timeoutMs = 600000,
  maxBufferBytes = 4 * 1024 * 1024
}) {
  if (!command) {
    throw new Error('spawnSupervisedProcess: command is required');
  }

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
    env,
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

    if (process.platform === 'win32' && method === 'WINDOWS_PROCESS_TREE_TERMINATE') {
      killProcessTree(pid, method);
    } else {
      try {
        child.kill();
      } catch {
        killProcessTree(pid, method);
      }
    }
  };

  const promise = new Promise((resolve, reject) => {
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
    cancel
  };
}

#!/usr/bin/env node
/**
 * Mock Agent Fixture (Section 21)
 * A deterministic test process for unit and integration testing.
 * NOT an AI agent. Does not consume quota. Does not read repository code.
 */

import fs from 'node:fs';
import path from 'node:path';

function parseArgs(argv) {
  const args = {
    scenario: 'success',
    worktree: process.cwd(),
    target: null,
    delayMs: 0
  };

  for (let i = 2; i < argv.length; i++) {
    if (argv[i] === '--scenario' && argv[i + 1]) {
      args.scenario = argv[++i];
    } else if (argv[i] === '--worktree' && argv[i + 1]) {
      args.worktree = argv[++i];
    } else if (argv[i] === '--target' && argv[i + 1]) {
      args.target = argv[++i];
    } else if (argv[i] === '--delay-ms' && argv[i + 1]) {
      args.delayMs = parseInt(argv[++i], 10) || 0;
    }
  }

  return args;
}

async function run() {
  const args = parseArgs(process.argv);

  if (args.delayMs > 0) {
    await new Promise(resolve => setTimeout(resolve, args.delayMs));
  }

  switch (args.scenario) {
    case 'success': {
      const result = {
        status: 'SUCCESS',
        agent: 'mock',
        timestamp: new Date().toISOString(),
        summary: 'Mock execution finished successfully'
      };
      process.stdout.write(JSON.stringify(result) + '\n');
      process.exit(0);
      break;
    }

    case 'fail': {
      process.stderr.write('Mock intentional non-zero failure\n');
      process.exit(1);
      break;
    }

    case 'hang': {
      // Keep process alive indefinitely until terminated
      setInterval(() => {}, 10000);
      break;
    }

    case 'write-allowed': {
      const targetFile = args.target || path.join(args.worktree, 'mock_allowed_output.txt');
      const dir = path.dirname(targetFile);
      if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
      fs.writeFileSync(targetFile, 'Allowed content written by mock agent\n', 'utf8');

      const result = {
        status: 'SUCCESS',
        agent: 'mock',
        filesChanged: [path.basename(targetFile)],
        summary: 'Wrote allowed file'
      };
      process.stdout.write(JSON.stringify(result) + '\n');
      process.exit(0);
      break;
    }

    case 'write-forbidden': {
      const targetFile = args.target || path.join(args.worktree, 'forbidden_secret.txt');
      const dir = path.dirname(targetFile);
      if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
      fs.writeFileSync(targetFile, 'FORBIDDEN MUTATION DETECTED CONTENT\n', 'utf8');

      const result = {
        status: 'SUCCESS',
        agent: 'mock',
        filesChanged: [path.basename(targetFile)],
        summary: 'Wrote forbidden file'
      };
      process.stdout.write(JSON.stringify(result) + '\n');
      process.exit(0);
      break;
    }

    case 'write-then-fail': {
      const targetFile = args.target || path.join(args.worktree, 'partial_work.txt');
      const dir = path.dirname(targetFile);
      if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
      fs.writeFileSync(targetFile, 'Partial write before crash\n', 'utf8');

      process.stderr.write('Crashed after writing partial work\n');
      process.exit(2);
      break;
    }

    case 'write-then-hang': {
      const targetFile = args.target || path.join(args.worktree, 'partial_work_hang.txt');
      const dir = path.dirname(targetFile);
      if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
      fs.writeFileSync(targetFile, 'Partial write before hang\n', 'utf8');

      // Now hang indefinitely until timeout
      setInterval(() => {}, 10000);
      break;
    }

    case 'check-env': {
      const result = {
        status: 'SUCCESS',
        secretPresent: Boolean(process.env.KONFRM_TEST_SECRET_SHOULD_NOT_INHERIT)
      };
      process.stdout.write(JSON.stringify(result) + '\n');
      process.exit(0);
      break;
    }

    case 'spawn-child': {
      const { spawn } = await import('node:child_process');
      const child = spawn(process.execPath, [process.argv[1], '--scenario', 'hang'], {
        stdio: 'ignore'
      });
      process.stdout.write(JSON.stringify({ childPid: child.pid }) + '\n');
      setInterval(() => {}, 10000);
      break;
    }

    case 'malformed-output': {
      process.stdout.write('{ this is not valid JSON ::: def syntax error\n');
      process.exit(0);
      break;
    }

    default: {
      process.stderr.write(`Unknown scenario: ${args.scenario}\n`);
      process.exit(1);
    }
  }
}

run().catch(err => {
  process.stderr.write(`Fatal mock error: ${err.message}\n`);
  process.exit(1);
});

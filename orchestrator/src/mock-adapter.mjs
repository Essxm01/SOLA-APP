/**
 * Mock Agent Adapter (Section 8 & 22)
 * Provider-neutral adapter interfacing with mock-agent.mjs fixture.
 * Used exclusively for laboratory testing. Zero real AI agent calls.
 */

import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { spawnSupervisedProcess } from './process-supervisor.mjs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const DEFAULT_FIXTURE_PATH = path.resolve(__dirname, '../fixtures/mock-agent.mjs');

export class MockAgentAdapter {
  constructor(options = {}) {
    this.agentName = 'mock';
    this.fixturePath = options.fixturePath || DEFAULT_FIXTURE_PATH;
    this.activeRuns = new Map();
  }

  async detect() {
    return {
      agent: 'mock',
      status: 'AVAILABLE',
      resolvedPath: process.execPath,
      discoverySource: 'OVERRIDE',
      version: '1.0.0-mock',
      lastVerifiedAt: new Date().toISOString()
    };
  }

  async capabilities() {
    return {
      agent: 'mock',
      nonInteractiveCLI: 'VERIFIED',
      stdinTransport: 'VERIFIED',
      temporaryFileTransport: 'VERIFIED',
      jsonStructuredOutput: 'VERIFIED',
      workspaceTargeting: 'VERIFIED',
      sessionContinuation: 'VERIFIED',
      processCancellation: 'VERIFIED',
      schemaEnforcement: 'VERIFIED',
      maxTurnsLimit: 'VERIFIED',
      programmaticQuotaTelemetry: 'VERIFIED'
    };
  }

  async usage() {
    return {
      agent: 'mock',
      timestamp: new Date().toISOString(),
      confidence: 'EXACT',
      remainingTurns: 1000,
      remainingBudgetUsd: 0,
      resetAt: null,
      rateLimitStatus: 'OK',
      rawTelemetry: { type: 'mock' }
    };
  }

  async startTask(task) {
    const runId = task.runId || `run_mock_${Date.now()}`;
    const scenario = task.scenario || 'success';
    const target = task.target || null;
    const delayMs = task.delayMs || 0;

    const args = [
      this.fixturePath,
      '--scenario', scenario,
      '--worktree', task.worktreeRoot || process.cwd()
    ];

    if (target) {
      args.push('--target', target);
    }
    if (delayMs > 0) {
      args.push('--delay-ms', String(delayMs));
    }

    const handle = spawnSupervisedProcess({
      command: process.execPath,
      args,
      cwd: task.worktreeRoot || process.cwd(),
      timeoutMs: task.timeoutMs || 600000
    });

    const runRecord = {
      runId,
      taskId: task.taskId,
      agent: 'mock',
      pid: handle.pid,
      startedAt: new Date().toISOString(),
      worktreeRoot: task.worktreeRoot,
      handle
    };

    this.activeRuns.set(runId, runRecord);

    return {
      runId,
      taskId: task.taskId,
      agent: 'mock',
      pid: handle.pid,
      startedAt: runRecord.startedAt,
      worktreeRoot: task.worktreeRoot,
      eventLogPath: `event_${runId}.json`,
      rawLogPath: null
    };
  }

  async status(runId) {
    const run = this.activeRuns.get(runId);
    if (!run) {
      throw new Error(`Run not found: ${runId}`);
    }
    return {
      runId,
      phase: 'EXECUTING',
      exitCode: null,
      signal: null,
      durationMs: 0,
      memoryUsageRssBytes: null,
      lastHeartbeatAt: new Date().toISOString()
    };
  }

  async cancel(runId, method = 'PROCESS_TERMINATE') {
    const run = this.activeRuns.get(runId);
    if (!run) {
      return {
        runId,
        success: false,
        methodUsed: method,
        terminatedGracefully: false,
        cancelledAt: new Date().toISOString()
      };
    }

    run.handle.cancel(method);
    return {
      runId,
      success: true,
      methodUsed: method,
      terminatedGracefully: false,
      cancelledAt: new Date().toISOString()
    };
  }

  async collectResult(runId) {
    const run = this.activeRuns.get(runId);
    if (!run) {
      throw new Error(`Cannot collect result for unknown runId: ${runId}`);
    }

    const processResult = await run.handle.promise;
    this.activeRuns.delete(runId);

    let structuredResult = null;
    let malformed = false;
    if (processResult.stdout.trim()) {
      try {
        structuredResult = JSON.parse(processResult.stdout.trim());
      } catch {
        malformed = true;
      }
    }

    return {
      runId,
      taskId: run.taskId,
      agent: 'mock',
      processResult,
      structuredResult,
      malformed
    };
  }
}

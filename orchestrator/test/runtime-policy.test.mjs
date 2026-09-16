import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import {
  assessNodeRuntime,
  assertRuntimeAllowsRealAgentExecution,
  SUPPORTED_LTS_MAJORS
} from '../src/runtime-policy.mjs';

describe('Runtime Policy (ADR-AUTO-009)', () => {
  test('RUNTIME-01: Node 24.x is assessed as SUPPORTED_LTS', () => {
    const result = assessNodeRuntime('v24.1.0');
    assert.equal(result.status, 'SUPPORTED_LTS');
    assert.equal(result.major, 24);
    assert.equal(result.allowsRealAgents, true);
  });

  test('RUNTIME-02: Node 22.x is assessed as SUPPORTED_LTS', () => {
    const result = assessNodeRuntime('v22.14.0');
    assert.equal(result.status, 'SUPPORTED_LTS');
    assert.equal(result.major, 22);
    assert.equal(result.allowsRealAgents, true);
  });

  test('RUNTIME-03: Node 25.x is assessed as EOL_UNSUPPORTED_FOR_REAL_AGENTS', () => {
    const result = assessNodeRuntime('v25.6.0');
    assert.equal(result.status, 'EOL_UNSUPPORTED_FOR_REAL_AGENTS');
    assert.equal(result.major, 25);
    assert.equal(result.allowsRealAgents, false);
  });

  test('RUNTIME-04: Node 20.x is assessed as EOL_UNSUPPORTED_FOR_REAL_AGENTS', () => {
    const result = assessNodeRuntime('v20.18.0');
    assert.equal(result.status, 'EOL_UNSUPPORTED_FOR_REAL_AGENTS');
    assert.equal(result.major, 20);
    assert.equal(result.allowsRealAgents, false);
  });

  test('RUNTIME-05: Malformed or unknown version is assessed as UNKNOWN_FAIL_CLOSED', () => {
    const r1 = assessNodeRuntime('invalid-string');
    assert.equal(r1.status, 'UNKNOWN_FAIL_CLOSED');
    assert.equal(r1.allowsRealAgents, false);

    const r2 = assessNodeRuntime(null);
    assert.equal(r2.status, 'UNKNOWN_FAIL_CLOSED');
    assert.equal(r2.allowsRealAgents, false);

    const r3 = assessNodeRuntime('v18.0.0');
    assert.equal(r3.status, 'EOL_UNSUPPORTED_FOR_REAL_AGENTS');
    assert.equal(r3.allowsRealAgents, false);
  });

  test('assertRuntimeAllowsRealAgentExecution throws PREFLIGHT_BLOCKED_EOL_RUNTIME on EOL or invalid', () => {
    assert.throws(
      () => assertRuntimeAllowsRealAgentExecution('v25.6.0'),
      /PREFLIGHT_BLOCKED_EOL_RUNTIME/
    );
    assert.throws(
      () => assertRuntimeAllowsRealAgentExecution('v20.10.0'),
      /PREFLIGHT_BLOCKED_EOL_RUNTIME/
    );
    assert.throws(
      () => assertRuntimeAllowsRealAgentExecution('garbage'),
      /PREFLIGHT_BLOCKED_EOL_RUNTIME/
    );
    // Should not throw for supported LTS
    assert.doesNotThrow(() => assertRuntimeAllowsRealAgentExecution('v24.0.0'));
    assert.doesNotThrow(() => assertRuntimeAllowsRealAgentExecution('v22.12.0'));
  });
});

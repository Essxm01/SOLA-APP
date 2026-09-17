import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import {
  isPathAllowed,
  validateWriteBoundaries,
  validateWriteScopeDefinition,
  validateWriteScopes
} from '../src/boundary-validator.mjs';

describe('Boundary Validator (C33)', () => {
  test('BOUNDARY-01: Mutation outside allowedWritePaths is blocked', () => {
    const res = validateWriteBoundaries({
      changedPaths: ['secret.txt'],
      allowedWritePaths: ['public/readme.txt'],
      forbiddenWritePaths: []
    });

    assert.equal(res.valid, false);
    assert.ok(res.outsideAllowedViolations.includes('secret.txt'));
  });

  test('BOUNDARY-02: Directory child is allowed when parent dir is in allowedWritePaths', () => {
    const res = validateWriteBoundaries({
      changedPaths: ['customer-app/src/components/Button.tsx'],
      allowedWritePaths: ['customer-app/src/'],
      forbiddenWritePaths: []
    });

    assert.equal(res.valid, true);
    assert.equal(res.outsideAllowedViolations.length, 0);
  });

  test('BOUNDARY-03: Prefix collision is blocked', () => {
    // allowed: customer-app/src
    // mutated: customer-app/src2/malicious.ts -> must NOT match
    const res = validateWriteBoundaries({
      changedPaths: ['customer-app/src2/malicious.ts'],
      allowedWritePaths: ['customer-app/src/'],
      forbiddenWritePaths: []
    });

    assert.equal(res.valid, false);
    assert.ok(res.outsideAllowedViolations.includes('customer-app/src2/malicious.ts'));
  });

  test('BOUNDARY-04: Path traversal ../ is blocked', () => {
    const res = validateWriteBoundaries({
      changedPaths: ['customer-app/src/../../escape.txt'],
      allowedWritePaths: ['customer-app/src/'],
      forbiddenWritePaths: []
    });

    assert.equal(res.valid, false);
  });

  test('BOUNDARY-05: Forbidden overrides allowed', () => {
    const res = validateWriteBoundaries({
      changedPaths: ['customer-app/src/secret.env'],
      allowedWritePaths: ['customer-app/src/'],
      forbiddenWritePaths: ['customer-app/src/secret.env']
    });

    assert.equal(res.valid, false);
    assert.ok(res.forbiddenViolations.includes('customer-app/src/secret.env'));
  });

  test('BOUNDARY-06: Empty allowedWritePaths fails closed unless unrestrictedSandbox=true', () => {
    const res1 = validateWriteBoundaries({
      changedPaths: ['anyfile.txt'],
      allowedWritePaths: [],
      forbiddenWritePaths: []
    });
    assert.equal(res1.valid, false);

    const res2 = validateWriteBoundaries({
      changedPaths: ['anyfile.txt'],
      allowedWritePaths: [],
      forbiddenWritePaths: [],
      unrestrictedSandbox: true
    });
    assert.equal(res2.valid, true);
  });

  test('BOUNDARY-07: Exact file scope does not permit child path (C52)', () => {
    const resExact = validateWriteBoundaries({
      changedPaths: ['foo.txt'],
      allowedWritePaths: ['foo.txt'],
      forbiddenWritePaths: []
    });
    assert.equal(resExact.valid, true);

    const resChild = validateWriteBoundaries({
      changedPaths: ['foo.txt/child.txt'],
      allowedWritePaths: ['foo.txt'],
      forbiddenWritePaths: []
    });
    assert.equal(resChild.valid, false, 'Exact file scope must block child path');
    assert.ok(resChild.outsideAllowedViolations.includes('foo.txt/child.txt'));
  });

  test('BOUNDARY-08: validateWriteScopeDefinition rejects invalid syntax (C70)', () => {
    const invalidScopes = [
      '',
      '   ',
      '../outside',
      'src/../../escape',
      '/absolute/path',
      '\\absolute\\path',
      'C:/windows/path',
      'D:\\data',
      '\\\\unc\\share',
      '//unc/share',
      'path/with\x00null',
      'path/with\rnewline'
    ];

    for (const scope of invalidScopes) {
      const res = validateWriteScopeDefinition(scope);
      assert.equal(res.valid, false, `Scope "${scope}" should be rejected`);
    }
  });

  test('BOUNDARY-09: validateWriteScopeDefinition accepts valid relative scopes (C70)', () => {
    const validScopes = [
      'src/file.txt',
      'src/components/',
      'package.json',
      'tests/unit/test.mjs',
      'docs/'
    ];

    for (const scope of validScopes) {
      const res = validateWriteScopeDefinition(scope);
      assert.equal(res.valid, true, `Scope "${scope}" should be accepted`);
    }
  });

  test('BOUNDARY-10: validateWriteScopes throws on first invalid scope (C70)', () => {
    assert.throws(
      () => validateWriteScopes(['src/', '../outside.txt']),
      /PREFLIGHT_BLOCKED_INVALID_WRITE_SCOPE/
    );

    assert.doesNotThrow(() => {
      validateWriteScopes(['src/', 'package.json']);
    });
  });
});

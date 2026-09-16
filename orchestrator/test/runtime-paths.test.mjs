import { test, describe, beforeEach, afterEach } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {
  resolveRuntimePaths,
  ensureRuntimeDirectories,
  DEFAULT_SUBDIRS
} from '../src/runtime-paths.mjs';

describe('Runtime Paths (Section 13 & 20)', () => {
  let tempRoot;

  beforeEach(() => {
    tempRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'konfrm-paths-test-'));
  });

  afterEach(() => {
    if (tempRoot && fs.existsSync(tempRoot)) {
      fs.rmSync(tempRoot, { recursive: true, force: true });
    }
  });

  test('PATH-01: Default production paths resolve under %LOCALAPPDATA%\\KONFRM\\orchestrator', () => {
    const defaultPaths = resolveRuntimePaths();
    assert.ok(defaultPaths.root.includes('KONFRM'));
    assert.ok(defaultPaths.root.includes('orchestrator'));
    assert.equal(defaultPaths.locks, path.join(defaultPaths.root, 'locks'));
    assert.equal(defaultPaths.quarantine, path.join(defaultPaths.root, 'locks', 'quarantine'));
    assert.equal(defaultPaths.runs, path.join(defaultPaths.root, 'runs'));
    assert.equal(defaultPaths.events, path.join(defaultPaths.root, 'events'));
    assert.equal(defaultPaths.logs, path.join(defaultPaths.root, 'logs'));
    assert.equal(defaultPaths.capabilities, path.join(defaultPaths.root, 'capabilities'));
    assert.equal(defaultPaths.cache, path.join(defaultPaths.root, 'cache'));
    assert.equal(defaultPaths.config, path.join(defaultPaths.root, 'config'));
  });

  test('PATH-02: Injected test root redirects all subpaths completely outside %LOCALAPPDATA%', () => {
    const paths = resolveRuntimePaths(tempRoot);
    assert.equal(paths.root, tempRoot);
    assert.equal(paths.locks, path.join(tempRoot, 'locks'));
    assert.equal(paths.quarantine, path.join(tempRoot, 'locks', 'quarantine'));
    assert.equal(paths.runs, path.join(tempRoot, 'runs'));
    assert.equal(paths.events, path.join(tempRoot, 'events'));
  });

  test('PATH-03: ensureRuntimeDirectories creates all required folders in injected root', () => {
    const paths = resolveRuntimePaths(tempRoot);
    ensureRuntimeDirectories(tempRoot);

    assert.ok(fs.existsSync(paths.root));
    assert.ok(fs.existsSync(paths.locks));
    assert.ok(fs.existsSync(paths.quarantine));
    assert.ok(fs.existsSync(paths.runs));
    assert.ok(fs.existsSync(paths.events));
    assert.ok(fs.existsSync(paths.logs));
    assert.ok(fs.existsSync(paths.capabilities));
    assert.ok(fs.existsSync(paths.cache));
    assert.ok(fs.existsSync(paths.config));
  });
});

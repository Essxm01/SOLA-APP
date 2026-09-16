/**
 * Runtime State Path Resolution (Section 13 & 20)
 * Resolves persistent local orchestrator directories outside the Git repository.
 * Fully supports test injection to ensure zero unwanted pollution of %LOCALAPPDATA%.
 */

import path from 'node:path';
import fs from 'node:fs';
import os from 'node:os';

export const DEFAULT_SUBDIRS = [
  'config',
  'locks',
  path.join('locks', 'quarantine'),
  'runs',
  'events',
  'logs',
  'capabilities',
  'cache'
];

export function getDefaultProductionRoot() {
  const localAppData = process.env.LOCALAPPDATA || path.join(os.homedir(), 'AppData', 'Local');
  return path.join(localAppData, 'KONFRM', 'orchestrator');
}

export function resolveRuntimePaths(customRoot = null) {
  const root = customRoot ? path.resolve(customRoot) : getDefaultProductionRoot();

  return {
    root,
    config: path.join(root, 'config'),
    locks: path.join(root, 'locks'),
    quarantine: path.join(root, 'locks', 'quarantine'),
    runs: path.join(root, 'runs'),
    events: path.join(root, 'events'),
    logs: path.join(root, 'logs'),
    capabilities: path.join(root, 'capabilities'),
    cache: path.join(root, 'cache')
  };
}

export function ensureRuntimeDirectories(customRoot = null) {
  const paths = resolveRuntimePaths(customRoot);

  for (const subdir of DEFAULT_SUBDIRS) {
    const fullPath = path.join(paths.root, subdir);
    if (!fs.existsSync(fullPath)) {
      fs.mkdirSync(fullPath, { recursive: true });
    }
  }

  return paths;
}

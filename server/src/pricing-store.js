import { readFileSync, writeFileSync, renameSync, mkdirSync, copyFileSync, existsSync } from 'node:fs';
import path from 'node:path';
import { validateConfig } from '../../shared/config-schema.js';

/**
 * Holds the current pricing config in memory and persists edits back to
 * config/pricing.json. Every save is validated first and the previous file
 * is kept in config/history/ so a bad change can be rolled back by hand.
 */
export function createPricingStore(file) {
  let current = load(file);

  return {
    get: () => current,

    save(next) {
      const problems = validateConfig(next);
      if (problems.length) {
        const error = new Error('Pricing config is invalid');
        error.status = 400;
        error.details = problems;
        throw error;
      }
      const stamped = { ...next, version: new Date().toISOString().slice(0, 19).replace(/[:T]/g, '-') };
      backup(file);
      const tmp = `${file}.tmp`;
      writeFileSync(tmp, `${JSON.stringify(stamped, null, 2)}\n`);
      renameSync(tmp, file); // atomic swap, readers never see half a file
      current = stamped;
      return current;
    },
  };
}

function load(file) {
  const config = JSON.parse(readFileSync(file, 'utf8'));
  const problems = validateConfig(config);
  if (problems.length) {
    throw new Error(`Refusing to start, ${file} has problems:\n  - ${problems.join('\n  - ')}`);
  }
  return config;
}

function backup(file) {
  if (!existsSync(file)) return;
  const dir = path.join(path.dirname(file), 'history');
  mkdirSync(dir, { recursive: true });
  const stamp = new Date().toISOString().replace(/[:.]/g, '-');
  copyFileSync(file, path.join(dir, `pricing-${stamp}.json`));
}

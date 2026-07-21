import fs from 'node:fs';
import path from 'node:path';

import { describe, expect, it } from 'vitest';

const localesDir = path.resolve(__dirname);
const localeFiles = fs.readdirSync(localesDir).filter((file) => file.endsWith('.json'));
const reference = JSON.parse(fs.readFileSync(path.join(localesDir, 'fr.json'), 'utf8'));

function flatten(value, prefix = '', out = {}) {
  for (const [key, child] of Object.entries(value)) {
    const next = prefix ? `${prefix}.${key}` : key;
    if (child && typeof child === 'object' && !Array.isArray(child)) {flatten(child, next, out);}
    else {out[next] = String(child);}
  }
  return out;
}

function placeholders(value) {
  return value.match(/\{\{[^}]+\}\}/g) || [];
}

describe('locale coverage', () => {
  it('keeps every locale aligned with the French reference keys', () => {
    const referenceFlat = flatten(reference);
    const referenceKeys = Object.keys(referenceFlat).sort();

    for (const file of localeFiles) {
      const locale = JSON.parse(fs.readFileSync(path.join(localesDir, file), 'utf8'));
      expect(Object.keys(flatten(locale)).sort(), file).toEqual(referenceKeys);
    }
  });

  it('preserves interpolation placeholders in every locale', () => {
    const referenceFlat = flatten(reference);

    for (const file of localeFiles) {
      const localeFlat = flatten(JSON.parse(fs.readFileSync(path.join(localesDir, file), 'utf8')));
      for (const [key, value] of Object.entries(referenceFlat)) {
        expect(placeholders(localeFlat[key]).sort(), `${file}:${key}`).toEqual(placeholders(value).sort());
      }
    }
  });
});

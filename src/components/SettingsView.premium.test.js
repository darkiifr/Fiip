import { readFileSync } from 'node:fs';
import { join } from 'node:path';

import { describe, expect, it } from 'vitest';

describe('SettingsView Fiip Premium actions', () => {
  it('does not render a duplicate update license action', () => {
    const source = readFileSync(join(process.cwd(), 'src/components/SettingsView.jsx'), 'utf8');

    expect(source).not.toContain("t('settings.update_license'");
  });
});

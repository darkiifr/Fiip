import { getFiipTheme, getPlatformDesignSpec } from './fiipDesign';

describe('mobile platform design system', () => {
  it('uses Liquid Glass as the iOS design language', () => {
    const spec = getPlatformDesignSpec('ios', true);
    const theme = getFiipTheme(true, 'ios');

    expect(spec.language).toBe('liquid-glass');
    expect(spec.surface.material).toBe('regular');
    expect(spec.surface.prominentMaterial).toBe('prominent');
    expect(spec.controls.minimumHeight).toBe(44);
    expect(theme.platform).toBe('ios');
    expect(theme.card).toContain('rgba');
  });

  it('uses Material 3 as the Android design language', () => {
    const spec = getPlatformDesignSpec('android', true);
    const theme = getFiipTheme(true, 'android');

    expect(spec.language).toBe('material');
    expect(spec.surface.container).toBe(theme.surfaceContainer);
    expect(spec.controls.minimumHeight).toBe(48);
    expect(theme.platform).toBe('android');
    expect(theme.primary).toBe('#D0BCFF');
  });
});

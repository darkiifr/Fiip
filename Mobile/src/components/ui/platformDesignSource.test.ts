import * as fs from 'fs';
import * as path from 'path';

const mobileRoot = path.join(__dirname, '../../..');

function readMobileFile(relativePath: string) {
  return fs.readFileSync(path.join(mobileRoot, relativePath), 'utf8');
}

describe('platform design source wiring', () => {
  it('wires Android through Material 3 PaperProvider at the app root', () => {
    const app = readMobileFile('App.tsx');

    expect(app).toContain('PaperProvider');
    expect(app).toContain('MD3DarkTheme');
    expect(app).toContain("Platform.OS !== 'android'");
    expect(app).toContain("getFiipTheme(isDark, 'android')");
  });

  it('keeps iOS Liquid Glass surfaces in shared primitives', () => {
    const glassCard = readMobileFile('src/components/ui/GlassCard.tsx');
    const nativePrimitives = readMobileFile('src/components/ui/FiipNative.tsx');

    expect(glassCard).toContain("@callstack/liquid-glass");
    expect(glassCard).toContain('LiquidGlassView');
    expect(glassCard).toContain("design.language === 'liquid-glass'");
    expect(nativePrimitives).toContain('getPlatformDesignSpec');
    expect(nativePrimitives).toContain('liquidGlassSheen');
  });

  it('keeps Android Material surfaces in shared primitives', () => {
    const glassCard = readMobileFile('src/components/ui/GlassCard.tsx');
    const nativePrimitives = readMobileFile('src/components/ui/FiipNative.tsx');

    expect(glassCard).toContain("Platform.OS === 'android'");
    expect(glassCard).toContain('colors.surfaceContainerHigh');
    expect(glassCard).toContain('design.controls.stateLayer');
    expect(nativePrimitives).toContain("design.language === 'material'");
  });
});

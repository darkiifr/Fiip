import * as fs from 'fs';
import * as path from 'path';

const iosRoot = path.join(__dirname, '../../ios');

function readIosFile(relativePath: string) {
  return fs.readFileSync(path.join(iosRoot, relativePath), 'utf8');
}

describe('iOS Fiip widgets', () => {
  it('declares Liquid Glass widget families and lock screen variants', () => {
    const widget = readIosFile('FiipWidget/FiipWidget.swift');

    expect(widget).toContain('LiquidGlassPanel');
    expect(widget).toContain('.ultraThinMaterial');
    expect(widget).toContain('.systemLarge');
    expect(widget).toContain('.accessoryCircular');
    expect(widget).toContain('.accessoryRectangular');
    expect(widget).toContain('.accessoryInline');
    expect(widget).toContain('MetricCard');
  });

  it('shares data through the widget app group and supports Dynamic Island', () => {
    const project = readIosFile('FiipMobile.xcodeproj/project.pbxproj');
    const entitlements = readIosFile('FiipWidget/FiipWidget.entitlements');
    const liveActivity = readIosFile('FiipWidget/FiipWidgetLiveActivity.swift');
    const attributes = readIosFile('FiipWidget/NoteActivityAttributes.swift');

    expect(project).toContain('CODE_SIGN_ENTITLEMENTS = FiipWidget/FiipWidget.entitlements;');
    expect(entitlements).toContain('group.com.fiip.widget');
    expect(liveActivity).toContain('DynamicIslandExpandedRegion(.bottom)');
    expect(liveActivity).toContain('compactLeading');
    expect(liveActivity).toContain('minimal');
    expect(attributes).toContain('elapsedSeconds');
  });
});

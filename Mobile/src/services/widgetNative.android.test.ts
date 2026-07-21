import * as fs from 'fs';
import * as path from 'path';

const androidRoot = path.join(__dirname, '../../android/app/src/main');

function readAndroidFile(relativePath: string) {
  return fs.readFileSync(path.join(androidRoot, relativePath), 'utf8');
}

describe('android Fiip widgets', () => {
  it('declares summary and quick Material widgets', () => {
    const manifest = readAndroidFile('AndroidManifest.xml');
    const strings = readAndroidFile('res/values/strings.xml');
    const summaryInfo = readAndroidFile('res/xml/fiip_widget_info.xml');
    const quickInfo = readAndroidFile('res/xml/fiip_quick_widget_info.xml');
    const summaryLayout = readAndroidFile('res/layout/fiip_widget.xml');
    const quickLayout = readAndroidFile('res/layout/fiip_widget_quick.xml');
    const provider = readAndroidFile('java/com/fiipmobile/widget/FiipWidgetProvider.kt');

    expect(manifest).toContain('.widget.FiipWidgetProvider');
    expect(manifest).toContain('.widget.FiipQuickWidgetProvider');
    expect(summaryInfo).toContain('@layout/fiip_widget');
    expect(quickInfo).toContain('@layout/fiip_widget_quick');
    expect(strings).toContain('fiip_quick_widget_description');
    expect(summaryLayout).toContain('@drawable/fiip_widget_surface');
    expect(quickLayout).toContain('@drawable/fiip_widget_button');
    expect(provider).toContain('class FiipQuickWidgetProvider');
    expect(provider).toContain('refreshAll');
    expect(provider).toContain('updateQuickWidget');
  });

  it('uses Material-like surfaces and colors', () => {
    const background = readAndroidFile('res/drawable/fiip_widget_background.xml');
    const button = readAndroidFile('res/drawable/fiip_widget_button.xml');
    const chip = readAndroidFile('res/drawable/fiip_widget_chip.xml');

    expect(background).toContain('#FFFBFE');
    expect(button).toContain('#6750A4');
    expect(chip).toContain('#EADDFF');
  });
});

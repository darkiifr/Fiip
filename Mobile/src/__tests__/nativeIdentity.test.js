const fs = require('fs');
const path = require('path');

describe('native mobile identity', () => {
  it('uses Fiip as the Android launcher label', () => {
    const stringsXml = fs.readFileSync(path.join(__dirname, '../../android/app/src/main/res/values/strings.xml'), 'utf8');

    expect(stringsXml).toContain('<string name="app_name">Fiip</string>');
  });
});

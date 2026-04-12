const fs = require('fs');
const path = require('path');
const file = path.join(__dirname, 'node_modules', '@terrylinla', 'react-native-sketch-canvas', 'src', 'SketchCanvas.js');
let d = fs.readFileSync(file, 'utf8');
d = d.replace(/ViewPropTypes\s*,/g, '');
d = d.replace(/class SketchCanvas extends React\.Component \{/g, "import { ViewPropTypes } from 'deprecated-react-native-prop-types';\nclass SketchCanvas extends React.Component {");
fs.writeFileSync(file, d);

// src/utils/fontDetector.js
export const detectLocalFonts = () => {
    const baseFonts = ['monospace', 'sans-serif', 'serif'];
    const testString = "mmmmmmmmmmlli"; 
    const testSize = "72px";
    
    // Create an invisible canvas
    const canvas = document.createElement("canvas");
    const context = canvas.getContext("2d", { willReadFrequently: true });
    
    if (!context) return [];
    
    const getWidth = (fontFamily, baseFont) => {
        context.font = `${testSize} "${fontFamily}", ${baseFont}`;
        return context.measureText(testString).width;
    };
    
    const baseWidths = {};
    for (const base of baseFonts) {
        context.font = `${testSize} ${base}`;
        baseWidths[base] = context.measureText(testString).width;
    }
    
    const isFontAvailable = (font) => {
        for (const base of baseFonts) {
            if (getWidth(font, base) !== baseWidths[base]) {
                return true;
            }
        }
        return false;
    };
    
    const commonFonts = ["SF Pro Display", "SF Pro Text", "SF Pro", "Coolvetica", "SF Compact", "SF Mono", 
        "Arial", "Arial Black", "Arial Narrow", "Arial Rounded MT Bold", "Bahnschrift", 
        "Calibri", "Calibri Light", "Cambria", "Cambria Math", "Candara", "Candara Light", 
        "Comic Sans MS", "Consolas", "Constantia", "Corbel", "Corbel Light", "Courier", 
        "Courier New", "Ebrima", "Franklin Gothic Medium", "Gabriola", "Gadugi", "Georgia",
        "Helvetica", "Impact", "Javanese Text", "Leelawadee UI", "Lucida Console", 
        "Lucida Sans Unicode", "Malgun Gothic", "Microsoft Himalaya", "Microsoft JhengHei",
        "Microsoft New Tai Lue", "Microsoft PhagsPa", "Microsoft Sans Serif", "Microsoft Tai Le",
        "Microsoft YaHei", "Microsoft Yi Baiti", "MingLiU-ExtB", "Mongolian Baiti", "MS Gothic",
        "MV Boli", "Myanmar Text", "Nirmala UI", "Palatino Linotype", "Segoe Print", 
        "Segoe Script", "Segoe UI", "Segoe UI Emoji", "Segoe UI Historic", "Segoe UI Symbol", 
        "SimSun", "SimSun-ExtB", "Sitka Small", "Sitka Text", "Sitka Subheading", 
        "Sitka Heading", "Sitka Display", "Sitka Banner", "Sylfaen", "Symbol", "Tahoma", 
        "Times New Roman", "Trebuchet MS", "Verdana", "Webdings", "Wingdings", "Yu Gothic",
        "American Typewriter", "Andale Mono", "Apple Chancery", "Apple Color Emoji",
        "Apple SD Gothic Neo", "Avenir", "Avenir Next", "Baskerville", "Big Caslon",
        "Bodoni 72", "Bodoni 72 Oldstyle", "Bodoni 72 Smallcaps", "Bradley Hand",
        "Brush Script MT", "Chalkboard", "Chalkboard SE", "Chalkduster", "Charter", "Cochin",
        "Copperplate", "Didot", "Futura", "Geneva", "Gill Sans", "Helvetica Neue", "Herculanum",
        "Hoefler Text", "ITC Bodoni 72", "Krungthep", "Lucida Grande", "Luminari", "Marker Felt",
        "Menlo", "Monaco", "Noteworthy", "Optima", "Palatino", "Papyrus", "Phosphate", "Rockwell",
        "SignPainter", "Skia", "Snell Roundhand", "Trattatello",
        "Ubuntu", "Ubuntu Condensed", "Ubuntu Mono", "Liberation Sans", "Liberation Serif", 
        "Liberation Mono", "FreeSans", "FreeSerif", "FreeMono", "DejaVu Sans", "DejaVu Serif", 
        "DejaVu Sans Mono", "Roboto", "Open Sans", "Lato", "Montserrat", "Source Sans Pro",
        "Oswald", "Raleway", "Inter", "PT Sans", "Noto Sans", "Nunito", "Fira Sans",
        "Work Sans", "Merriweather", "Inconsolata", "Droid Sans", "Droid Serif", "Droid Sans Mono"
    ];
    
    // Sort and deduplicate
    const detected = commonFonts.filter(isFontAvailable);
    return Array.from(new Set(detected)).sort();
};
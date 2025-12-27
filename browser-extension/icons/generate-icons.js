/**
 * Generate PNG icons from SVG
 * 
 * Usage: node generate-icons.js
 * 
 * Requires: sharp (npm install sharp)
 */

const fs = require('fs');
const path = require('path');

async function generateIcons() {
  try {
    const sharp = require('sharp');
    const svgPath = path.join(__dirname, 'icon.svg');
    const svg = fs.readFileSync(svgPath);

    const sizes = [16, 48, 128];

    for (const size of sizes) {
      await sharp(svg)
        .resize(size, size)
        .png()
        .toFile(path.join(__dirname, `icon${size}.png`));
      
      console.log(`Generated icon${size}.png`);
    }

    console.log('Done! All icons generated.');
  } catch (error) {
    if (error.code === 'MODULE_NOT_FOUND') {
      console.log('Sharp not installed. Install with: npm install sharp');
      console.log('Or use an online SVG to PNG converter with icons/icon.svg');
    } else {
      console.error('Error:', error.message);
    }
  }
}

generateIcons();

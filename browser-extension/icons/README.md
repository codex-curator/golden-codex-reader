# Extension Icons

## Generate Icons

### Option 1: Node.js Script
```bash
npm install sharp
node generate-icons.js
```

### Option 2: Online Converter
1. Upload `icon.svg` to https://convertio.co/svg-png/
2. Download at 16x16, 48x48, and 128x128
3. Save as `icon16.png`, `icon48.png`, `icon128.png`

### Option 3: Inkscape
```bash
inkscape icon.svg -w 16 -h 16 -o icon16.png
inkscape icon.svg -w 48 -h 48 -o icon48.png
inkscape icon.svg -w 128 -h 128 -o icon128.png
```

## Required Files
- `icon16.png` - Toolbar icon
- `icon48.png` - Extension management
- `icon128.png` - Chrome Web Store

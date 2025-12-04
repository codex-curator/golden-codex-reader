# Golden Codex Reader - Browser Extension

Read and verify Golden Codex metadata embedded in digital artworks.

## Features

- **Right-click any image** → "Read Golden Codex" to view embedded metadata
- **Drag & drop images** into the popup to decode
- **Paste Base64 payloads** for direct decoding
- **SoulWhisper display** - See personal messages from artists
- **Visual metadata** - Color palettes, emotions, themes
- **Integrity verification** - Soulmark hash checking

## Installation

### Chrome

1. Download or clone this repository
2. Open `chrome://extensions/`
3. Enable "Developer mode" (top right)
4. Click "Load unpacked"
5. Select the `browser-extension` folder

### Firefox

1. Download or clone this repository
2. Rename `manifest-firefox.json` to `manifest.json` (backup the Chrome one first)
3. Open `about:debugging#/runtime/this-firefox`
4. Click "Load Temporary Add-on"
5. Select the `manifest.json` file

### From Store (Coming Soon)

- Chrome Web Store: [Pending Review]
- Firefox Add-ons: [Pending Review]

## Usage

### Method 1: Right-Click
1. Right-click any image on a webpage
2. Select "Read Golden Codex"
3. View the metadata in the popup

### Method 2: Drag & Drop
1. Click the extension icon
2. Drag an image file into the popup
3. View the decoded metadata

### Method 3: Paste Payload
1. Click the extension icon
2. Paste a Base64 GCUIS payload
3. Click "Decode Golden Codex"

## What You'll See

- **Title & ID** - Artwork identification
- **SoulWhisper** - Personal message from the artist
- **Emotional Journey** - Primary emotion and mood
- **Color Palette** - Dominant colors with swatches
- **Keywords** - Searchable tags and themes
- **Copyright** - Rights holder and usage terms

## Icons

Replace the placeholder icons in `/icons/` with your own:

| File | Size | Usage |
|------|------|-------|
| `icon16.png` | 16x16 | Favicon |
| `icon32.png` | 32x32 | Toolbar (Windows) |
| `icon48.png` | 48x48 | Extensions page |
| `icon128.png` | 128x128 | Chrome Web Store |

## Development

### File Structure

```
browser-extension/
├── manifest.json           # Chrome manifest (v3)
├── manifest-firefox.json   # Firefox manifest (v2)
├── icons/
│   ├── icon16.png
│   ├── icon32.png
│   ├── icon48.png
│   └── icon128.png
└── src/
    ├── popup.html          # Extension popup UI
    ├── popup.js            # Popup logic
    ├── background.js       # Service worker
    ├── content.js          # Page content script
    └── decoder.js          # Core decoding library
```

### Testing Changes

1. Make your changes
2. Go to `chrome://extensions/`
3. Click the refresh icon on the extension
4. Test your changes

## Building for Production

### Chrome Web Store

1. Remove `manifest-firefox.json`
2. Add production icons
3. Zip the folder
4. Upload to [Chrome Developer Dashboard](https://chrome.google.com/webstore/devconsole)
5. Pay $5 one-time fee

### Firefox Add-ons

1. Rename `manifest-firefox.json` to `manifest.json`
2. Add production icons
3. Zip the folder
4. Upload to [Firefox Add-on Developer Hub](https://addons.mozilla.org/developers/)
5. Free to publish

## Privacy

This extension:
- Does NOT collect any user data
- Does NOT send images to external servers
- Processes all metadata locally in your browser
- Only requests permissions needed for functionality

## License

MIT License - Copyright (c) 2025 Metavolve Labs, Inc.

## Links

- [Golden Codex Website](https://goldencodex.art)
- [GitHub Repository](https://github.com/codex-curator/golden-codex-reader)
- [Report Issues](https://github.com/codex-curator/golden-codex-reader/issues)

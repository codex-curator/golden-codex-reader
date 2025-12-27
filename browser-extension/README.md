# Verilian Reader - Browser Extension

Verify the provenance of digital artworks. Read embedded Golden Codex metadata or match artwork against the registry using perceptual hashing.

## Features

- **XMP Metadata Extraction**: Read embedded Golden Codex metadata from images
- **Perceptual Hash Matching**: Find artwork provenance even after social media compression
- **Context Menu Integration**: Right-click any image to verify
- **Badge Indicators**: Visual badges on verified images
- **SoulWhisper Display**: View artist messages embedded in artwork

## Installation

### Chrome (Developer Mode)

1. Open Chrome and go to `chrome://extensions/`
2. Enable "Developer mode" (toggle in top right)
3. Click "Load unpacked"
4. Select the `browser-extension` folder
5. The Verilian Reader icon should appear in your toolbar

### Firefox (Developer Mode)

1. Rename `manifest-firefox.json` to `manifest.json` (backup original first)
2. Open Firefox and go to `about:debugging#/runtime/this-firefox`
3. Click "Load Temporary Add-on"
4. Select the `manifest.json` file
5. The extension is now loaded (reloads on browser restart)

## Usage

### Right-Click Verification
1. Right-click on any image
2. Select "Verify Golden Codex Provenance"
3. The popup will show verification results

### Drag & Drop
1. Click the extension icon to open popup
2. Drag an image file onto the popup
3. View verification results

### Automatic Badges
The extension automatically scans pages for Golden Codex artwork and displays badges:
- Gold badge: XMP metadata found
- Purple badge: Hash match found

## Development

### Project Structure
```
browser-extension/
├── manifest.json           # Chrome MV3 manifest
├── manifest-firefox.json   # Firefox MV2 manifest
├── icons/
│   ├── icon16.png
│   ├── icon48.png
│   └── icon128.png
└── src/
    ├── background.js      # Service worker
    ├── content.js         # Page scanner
    ├── content.css        # Badge styles
    ├── decoder.js         # GCUIS decoder
    ├── hash.js            # Perceptual hash
    ├── api.js             # Registry API client
    ├── popup.html         # Popup UI
    └── popup.js           # Popup logic
```

### API Endpoint

The extension connects to the Golden Codex registry API:
- Base URL: `https://alex-oracle.goldencodex.art`
- Match endpoint: `/alex/match?hash={hash}&threshold={threshold}`
- Stats endpoint: `/alex/stats`

## Publishing

### Chrome Web Store
1. Create a `.zip` of the `browser-extension` folder
2. Go to [Chrome Web Store Developer Dashboard](https://chrome.google.com/webstore/devconsole)
3. Pay one-time $5 developer fee if not already registered
4. Upload the `.zip` file
5. Fill in store listing details
6. Submit for review

### Firefox Add-ons
1. Ensure `manifest-firefox.json` is renamed to `manifest.json`
2. Create a `.zip` of the extension
3. Go to [Firefox Add-on Developer Hub](https://addons.mozilla.org/developers/)
4. Submit a new add-on
5. Upload the `.zip` file
6. Fill in listing details
7. Submit for review

## License

MIT - Metavolve Labs, Inc.

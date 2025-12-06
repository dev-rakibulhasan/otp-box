# OTP Box - Build Instructions

## Development vs Production

This extension has two versions:

### Development Version (Source Code)

- Located in the root directory
- Contains readable, unobfuscated code
- Use this for development and debugging

### Production Version (Obfuscated)

- Located in the `dist/` folder
- Contains obfuscated JavaScript files
- Use this for distribution

## Building the Obfuscated Version

To create the obfuscated production build:

```bash
npm run build
```

This will:

1. Obfuscate all JavaScript files (background.js, content.js, sidepanel.js)
2. Copy all other files (HTML, CSS, manifest, icons) to the `dist/` folder
3. Create a complete, ready-to-use extension in the `dist/` directory

## Loading the Extension in Chrome

### Development (Unobfuscated):

1. Open Chrome and go to `chrome://extensions/`
2. Enable "Developer mode"
3. Click "Load unpacked"
4. Select the **root project folder**

### Production (Obfuscated):

1. Open Chrome and go to `chrome://extensions/`
2. Enable "Developer mode"
3. Click "Load unpacked"
4. Select the **dist folder**

## Important Notes

⚠️ **Chrome Web Store Policy**: The Chrome Web Store may require you to submit the unobfuscated source code for review alongside the obfuscated version.

⚠️ **Debugging**: Use the development version for debugging. The obfuscated version is difficult to debug.

⚠️ **Updates**: After making changes to the source code, run `npm run build` again to regenerate the obfuscated version.

## Obfuscation Features

The build process applies:

- Control flow flattening
- Dead code injection
- String array encoding (Base64)
- Identifier renaming (hexadecimal)
- Self-defending code
- String splitting and rotation
- Object key transformation

## Files Structure

```
otp-box/
├── src files (development)
│   ├── background.js
│   ├── content.js
│   ├── sidepanel.js
│   └── ...
├── dist/ (production - generated)
│   ├── background.js (obfuscated)
│   ├── content.js (obfuscated)
│   ├── sidepanel.js (obfuscated)
│   └── ...
├── obfuscate.js (build script)
└── package.json
```

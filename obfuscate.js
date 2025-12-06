const JavaScriptObfuscator = require("javascript-obfuscator");
const fs = require("fs");
const path = require("path");

// Configuration for obfuscation - optimized for Chrome extensions
const obfuscationOptions = {
  compact: true,
  controlFlowFlattening: false, // Disabled - breaks DOM manipulation
  controlFlowFlatteningThreshold: 0,
  deadCodeInjection: false, // Disabled - can cause issues with injected scripts
  deadCodeInjectionThreshold: 0,
  debugProtection: false,
  debugProtectionInterval: 0,
  disableConsoleOutput: false,
  identifierNamesGenerator: "hexadecimal",
  log: false,
  numbersToExpressions: false, // Disabled - can break selectors
  renameGlobals: false,
  selfDefending: false, // Disabled - can cause issues in Chrome extensions
  simplify: true,
  splitStrings: false, // Disabled - can break DOM selectors and attributes
  splitStringsChunkLength: 10,
  stringArray: true,
  stringArrayCallsTransform: false, // Disabled - more compatible
  stringArrayEncoding: ["base64"],
  stringArrayIndexShift: true,
  stringArrayRotate: true,
  stringArrayShuffle: true,
  stringArrayWrappersCount: 1, // Reduced for better compatibility
  stringArrayWrappersChainedCalls: false, // Disabled for compatibility
  stringArrayWrappersParametersMaxCount: 2, // Reduced
  stringArrayWrappersType: "variable", // Changed from function for compatibility
  stringArrayThreshold: 0.5, // Reduced for better compatibility
  transformObjectKeys: false, // Disabled - can break DOM properties
  unicodeEscapeSequence: false,
  target: "browser-no-eval", // Optimized for browser environment
};

// Files to obfuscate (from assets/js directory)
const filesToObfuscate = [
  "assets/js/background.js",
  "assets/js/content.js",
  "assets/js/sidepanel.js",
  "assets/js/injected-scripts.js",
];

// Files to copy without obfuscation
const jsFilesToCopy = [];

// Create otp-box-prod directory if it doesn't exist
const distDir = path.join(__dirname, "otp-box-prod");
if (!fs.existsSync(distDir)) {
  fs.mkdirSync(distDir);
}

console.log("Starting obfuscation process...\n");

// Obfuscate each file
filesToObfuscate.forEach((filename) => {
  const sourcePath = path.join(__dirname, filename);
  const destPath = path.join(distDir, filename);

  try {
    console.log(`Obfuscating ${filename}...`);

    // Create directory structure in dist if needed
    const destDir = path.dirname(destPath);
    if (!fs.existsSync(destDir)) {
      fs.mkdirSync(destDir, { recursive: true });
    }

    const sourceCode = fs.readFileSync(sourcePath, "utf8");
    const obfuscatedCode = JavaScriptObfuscator.obfuscate(
      sourceCode,
      obfuscationOptions
    ).getObfuscatedCode();
    fs.writeFileSync(destPath, obfuscatedCode);
    console.log(`✓ ${filename} obfuscated successfully`);
  } catch (error) {
    console.error(`✗ Error obfuscating ${filename}:`, error.message);
  }
});

// Copy JavaScript files without obfuscation
console.log("\nCopying JavaScript files (not obfuscated)...\n");
jsFilesToCopy.forEach((filename) => {
  const sourcePath = path.join(__dirname, filename);
  const destPath = path.join(distDir, filename);

  try {
    fs.copyFileSync(sourcePath, destPath);
    console.log(`✓ ${filename} copied (not obfuscated for compatibility)`);
  } catch (error) {
    console.error(`✗ Error copying ${filename}:`, error.message);
  }
});

// Copy other files to dist
const filesToCopy = [
  "manifest.json",
  "sidepanel.html",
  "assets/css/sidepanel.css",
  "README.md",
];

console.log("\nCopying other files...\n");

filesToCopy.forEach((filename) => {
  const sourcePath = path.join(__dirname, filename);
  const destPath = path.join(distDir, filename);

  try {
    if (fs.existsSync(sourcePath)) {
      // Create directory structure in dist if needed
      const destDir = path.dirname(destPath);
      if (!fs.existsSync(destDir)) {
        fs.mkdirSync(destDir, { recursive: true });
      }
      fs.copyFileSync(sourcePath, destPath);
      console.log(`✓ Copied ${filename}`);
    }
  } catch (error) {
    console.error(`✗ Error copying ${filename}:`, error.message);
  }
});

// Copy icons directory
const iconsDir = path.join(__dirname, "assets", "icons");
const distIconsDir = path.join(distDir, "assets", "icons");

if (fs.existsSync(iconsDir)) {
  if (!fs.existsSync(distIconsDir)) {
    fs.mkdirSync(distIconsDir);
  }

  console.log("\nCopying icons...\n");
  const iconFiles = fs.readdirSync(iconsDir);
  iconFiles.forEach((file) => {
    const sourcePath = path.join(iconsDir, file);
    const destPath = path.join(distIconsDir, file);
    fs.copyFileSync(sourcePath, destPath);
    console.log(`✓ Copied icons/${file}`);
  });
}

console.log(
  '\n✓ Obfuscation complete! Check the "dist" folder for obfuscated extension.'
);
console.log('\nNote: Load the extension from the "dist" folder in Chrome.');

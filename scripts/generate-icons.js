// Simple script to generate PNG icons from SVG
// Run: node scripts/generate-icons.js
// For now, create placeholder SVGs that work as PWA icons

const fs = require("fs");
const path = require("path");

function createSvgIcon(size) {
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 ${size} ${size}">
  <rect width="${size}" height="${size}" rx="${size * 0.15}" fill="#2563eb"/>
  <text x="50%" y="52%" dominant-baseline="middle" text-anchor="middle" font-family="Arial, sans-serif" font-size="${size * 0.4}" font-weight="bold" fill="white">H+</text>
</svg>`;
}

const iconsDir = path.join(__dirname, "..", "public", "icons");

fs.writeFileSync(path.join(iconsDir, "icon-192.svg"), createSvgIcon(192));
fs.writeFileSync(path.join(iconsDir, "icon-512.svg"), createSvgIcon(512));

// Also create a simple 1x1 PNG placeholder (browsers need actual PNG)
// In production, convert SVGs to PNGs using an image tool
const pngHeader = Buffer.from([
  0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a,
]);

console.log("SVG icons generated in public/icons/");
console.log("For production, convert to PNG using: npx sharp-cli or similar");

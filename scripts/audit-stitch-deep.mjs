import fs from 'node:fs';
import path from 'node:path';

function hexToRgb(hex) {
  let c = hex.replace('#', '').trim();
  if (c.length === 3) c = c.split('').map(x => x + x).join('');
  if (c.length === 8) c = c.substring(0, 6);
  const num = parseInt(c, 16);
  return { r: (num >> 16) & 255, g: (num >> 8) & 255, b: num & 255 };
}

function relativeLuminance(rgb) {
  const [r, g, b] = [rgb.r, rgb.g, rgb.b].map(v => {
    v = v / 255;
    return v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4);
  });
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

function contrastRatio(hex1, hex2) {
  try {
    const lum1 = relativeLuminance(hexToRgb(hex1));
    const lum2 = relativeLuminance(hexToRgb(hex2));
    const brightest = Math.max(lum1, lum2);
    const darkest = Math.min(lum1, lum2);
    return (brightest + 0.05) / (darkest + 0.05);
  } catch (e) {
    return null;
  }
}

const dirFiles = [
  { id: 'dir-a-desktop', name: 'Direction A: Cinematic Obsidian (Desktop)', file: 'direction-a-desktop.html' },
  { id: 'dir-a-mobile', name: 'Direction A: Cinematic Obsidian (Mobile)', file: 'direction-a-mobile.html' },
  { id: 'dir-b-desktop', name: 'Direction B: Architectural Editorial (Desktop)', file: 'direction-b-desktop.html' },
  { id: 'dir-b-mobile', name: 'Direction B: Architectural Editorial (Mobile)', file: 'direction-b-mobile.html' },
  { id: 'dir-c-desktop', name: 'Direction C: Living Workspace (Desktop)', file: 'direction-c-desktop.html' },
  { id: 'dir-c-mobile', name: 'Direction C: Living Workspace (Mobile)', file: 'direction-c-mobile.html' }
];

console.log('========================================================================');
console.log('ASSESSMENT B: TECHNICAL QUALITY AUDIT — GOOGLE STITCH DESIGNS');
console.log('========================================================================\n');

for (const d of dirFiles) {
  const p = path.resolve('docs/stitch-designs', d.file);
  const html = fs.readFileSync(p, 'utf8');

  console.log(`>>> ${d.name} (${d.file}) [${html.length} bytes]`);

  // 1. Fonts & Invariants
  const googleFonts = [...html.matchAll(/https:\/\/fonts\.googleapis\.com\/css2\?[^"'\s<>]+/g)].map(m => m[0]);
  const fontFamRegex = /font-family:\s*([^;}]+)/gi;
  const ffMatches = [...html.matchAll(fontFamRegex)].map(m => m[1].trim());

  console.log(`  [1. Typography & Self-Hosting Invariant]`);
  console.log(`    External Google Fonts: ${googleFonts.length}`);
  googleFonts.forEach(u => console.log(`      * ${u}`));
  console.log(`    Declared font-families: ${JSON.stringify([...new Set(ffMatches)])}`);

  // 2. Geometry
  const allRadii = [...html.matchAll(/border-radius:\s*([^;}]+)/gi)].map(m => m[1].trim());
  const allRoundedClasses = [...html.matchAll(/\brounded(-[a-zA-Z0-9_-]+)?\b/g)].map(m => m[0]);
  const pillViolations = [...html.matchAll(/rounded-full|border-radius:\s*(?:9999px|999px|50%|100%)/gi)].map(m => m[0]);

  console.log(`  [2. Geometry & Pill Invariant]`);
  console.log(`    Pill violations count: ${pillViolations.length} -> ${pillViolations.length === 0 ? 'STRICT PASS (Zero pill shapes)' : 'FAIL'}`);
  console.log(`    Unique border-radius values: ${JSON.stringify([...new Set(allRadii)])}`);
  console.log(`    Rounded utility classes: ${JSON.stringify([...new Set(allRoundedClasses)])}`);

  // 3. Visual Assets
  const imgTags = [...html.matchAll(/<img[^>]+>/gi)].map(m => m[0]);
  const bgImgs = [...html.matchAll(/url\(['"]?([^'"\)]+)['"]?\)/gi)].map(m => m[1]);

  console.log(`  [3. Visual Asset Invariant]`);
  console.log(`    <img> tags count: ${imgTags.length}`);
  console.log(`    CSS background images count: ${bgImgs.length}`);
  if (imgTags.length > 0) console.log(`    Image tags:`, imgTags);

  // 4. Buttons & Working Handlers
  const buttons = [...html.matchAll(/<button\b([^>]*)>([\s\S]*?)<\/button>/gi)];
  let btnWorking = 0;
  buttons.forEach(b => {
    if (b[1].includes('onclick')) btnWorking++;
  });

  const links = [...html.matchAll(/<a\b([^>]*)>([\s\S]*?)<\/a>/gi)];
  let deadLinks = 0;
  links.forEach(l => {
    if (l[1].includes('href="#"') || l[1].includes("href=''")) deadLinks++;
  });

  console.log(`  [4. Working Buttons & Interaction]`);
  console.log(`    Total buttons: ${buttons.length} | Working with handlers: ${btnWorking} (${((btnWorking / (buttons.length || 1)) * 100).toFixed(0)}%)`);
  console.log(`    Total links: ${links.length} | Dead links ('#'): ${deadLinks}`);

  // 5. JavaScript & Reduced Motion
  const scripts = [...html.matchAll(/<script\b[^>]*>([\s\S]*?)<\/script>/gi)].map(m => m[1].trim());
  const hasReducedMotion = html.includes('prefers-reduced-motion');
  console.log(`  [5. Runtime & Accessibility]`);
  console.log(`    Script tags: ${scripts.length}`);
  console.log(`    prefers-reduced-motion: ${hasReducedMotion ? 'PRESENT' : 'ABSENT (Needs fallback implementation)'}`);
  console.log('\n');
}

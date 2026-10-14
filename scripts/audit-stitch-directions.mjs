import fs from 'node:fs';
import path from 'node:path';

const directions = [
  'direction-a-desktop',
  'direction-a-mobile',
  'direction-b-desktop',
  'direction-b-mobile',
  'direction-c-desktop',
  'direction-c-mobile'
];

// WCAG Contrast calculation
function hexToRgb(hex) {
  let c = hex.replace('#', '').trim();
  if (c.length === 3) {
    c = c.split('').map(x => x + x).join('');
  }
  if (c.length === 8) {
    // ignore alpha or take first 6
    c = c.substring(0, 6);
  }
  const num = parseInt(c, 16);
  return {
    r: (num >> 16) & 255,
    g: (num >> 8) & 255,
    b: num & 255
  };
}

function relativeLuminance(rgb) {
  const [r, g, b] = [rgb.r, rgb.g, rgb.b].map(v => {
    v = v / 255;
    return v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4);
  });
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

function contrastRatio(hex1, hex2) {
  const lum1 = relativeLuminance(hexToRgb(hex1));
  const lum2 = relativeLuminance(hexToRgb(hex2));
  const brightest = Math.max(lum1, lum2);
  const darkest = Math.min(lum1, lum2);
  return (brightest + 0.05) / (darkest + 0.05);
}

const auditResults = {};

for (const d of directions) {
  const filePath = path.resolve('docs/stitch-designs', `${d}.html`);
  const html = fs.readFileSync(filePath, 'utf8');

  // Google Fonts
  const googleFonts = [...html.matchAll(/fonts\.googleapis\.com[^\s"'<>]+/g)].map(m => m[0]);
  
  // Font families
  const fontFamilies = [...html.matchAll(/font-family:\s*([^;}]+)/gi)].map(m => m[1].trim());

  // border-radius
  const radii = [...html.matchAll(/border-radius:\s*([^;}]+)/gi)].map(m => m[1].trim());
  const roundedClasses = [...html.matchAll(/class=["'][^"']*rounded-([^"'\s]+)[^"']*["']/gi)].map(m => m[1].trim());
  const pillRadii = radii.filter(r => /9999|999|50%|full/i.test(r));

  // Hex colors
  const hexes = [...html.matchAll(/#[0-9a-fA-F]{3,8}\b/g)].map(m => m[0].toUpperCase());

  // Images
  const imgs = [...html.matchAll(/src=["']([^"']+)["']/gi)].map(m => m[1]);

  // Buttons and Links
  const buttons = [...html.matchAll(/<button[\s\S]*?<\/button>/gi)].map(m => m[0]);
  const links = [...html.matchAll(/<a\b[\s\S]*?<\/a>/gi)].map(m => m[0]);

  // Scripts
  const scripts = [...html.matchAll(/<script[\s\S]*?<\/script>/gi)].map(m => m[0]);

  // Reduced motion
  const reducedMotion = html.includes('prefers-reduced-motion');

  auditResults[d] = {
    length: html.length,
    googleFonts: [...new Set(googleFonts)],
    fontFamilies: [...new Set(fontFamilies)],
    radii: [...new Set(radii)],
    roundedClasses: [...new Set(roundedClasses)],
    pillRadii,
    uniqueHexCount: new Set(hexes).size,
    hexSample: [...new Set(hexes)].slice(0, 20),
    images: [...new Set(imgs)],
    buttonCount: buttons.length,
    linkCount: links.length,
    scriptCount: scripts.length,
    reducedMotion
  };
}

console.log(JSON.stringify(auditResults, null, 2));

// Test typical contrast pairs found in DESIGN.md & Stitch outputs
console.log('\n--- WCAG CONTRAST CHECKS ---');
const colorPairs = [
  // DESIGN.md dark mode
  { name: 'Dark mode: text-primary on bg-app', fg: '#F0EEE8', bg: '#121518' },
  { name: 'Dark mode: text-primary on bg-surface', fg: '#F0EEE8', bg: '#1C2025' },
  { name: 'Dark mode: text-secondary on bg-app', fg: '#9FA4A8', bg: '#121518' },
  { name: 'Dark mode: text-secondary on bg-surface', fg: '#9FA4A8', bg: '#1C2025' },
  { name: 'Dark mode: text-tertiary on bg-app', fg: '#686E74', bg: '#121518' },
  { name: 'Dark mode: primary accent blue on bg-app', fg: '#4A89C8', bg: '#121518' },
  { name: 'Dark mode: primary accent blue on bg-surface', fg: '#4A89C8', bg: '#1C2025' },
  { name: 'Dark mode: white/text-primary on primary accent blue button', fg: '#F0EEE8', bg: '#4A89C8' },
  { name: 'Dark mode: pure white on primary accent blue button', fg: '#FFFFFF', bg: '#4A89C8' },
  
  // DESIGN.md light mode
  { name: 'Light mode: text-primary on bg-app', fg: '#1C2024', bg: '#F5F4F0' },
  { name: 'Light mode: text-primary on bg-surface', fg: '#1C2024', bg: '#FCFBF9' },
  { name: 'Light mode: text-secondary on bg-app', fg: '#60666D', bg: '#F5F4F0' },
  { name: 'Light mode: text-secondary on bg-surface', fg: '#60666D', bg: '#FCFBF9' },
  { name: 'Light mode: text-tertiary on bg-app', fg: '#8E959E', bg: '#F5F4F0' },
  { name: 'Light mode: light primary blue on bg-app', fg: '#1D548F', bg: '#F5F4F0' },
  
  // Site index.html dark mode
  { name: 'Site current dark: text-primary on bg-app', fg: '#F0EEE8', bg: '#0D1013' },
  { name: 'Site current dark: text-secondary on bg-app', fg: '#9FA4A8', bg: '#0D1013' },
  { name: 'Site current dark: text-tertiary on bg-app', fg: '#686E74', bg: '#0D1013' },
  { name: 'Site current dark: accent cyan on bg-app', fg: '#38BDF8', bg: '#0D1013' },
  
  // Direction C slate tokens
  { name: 'Direction C: text #F2EFE9 on #101317', fg: '#F2EFE9', bg: '#101317' },
  { name: 'Direction C: text #F2EFE9 on #181C22', fg: '#F2EFE9', bg: '#181C22' },
  { name: 'Direction C: text #949BA4 on #101317', fg: '#949BA4', bg: '#101317' },
  { name: 'Direction C: text #949BA4 on #181C22', fg: '#949BA4', bg: '#181C22' },
  { name: 'Direction C: placeholder #717780 on #121518', fg: '#717780', bg: '#121518' },
  { name: 'Direction C: primary #4A89C8 on #101317', fg: '#4A89C8', bg: '#101317' }
];

for (const p of colorPairs) {
  const cr = contrastRatio(p.fg, p.bg);
  const aaNormal = cr >= 4.5 ? 'PASS' : 'FAIL';
  const aaLarge = cr >= 3.0 ? 'PASS' : 'FAIL';
  const aaaNormal = cr >= 7.0 ? 'PASS' : 'FAIL';
  console.log(`${p.name} (${p.fg} on ${p.bg}): ${cr.toFixed(2)}:1 | AA-Normal: ${aaNormal} | AA-Large: ${aaLarge} | AAA: ${aaaNormal}`);
}

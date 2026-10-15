import fs from 'node:fs'
import path from 'node:path'

const html = fs.readFileSync('index.html', 'utf-8')
const css = fs.readFileSync('styles.css', 'utf-8')

if (!html.includes('Smarak Padhi')) {
  console.error('Validation failure: Missing author name in HTML')
  process.exit(1)
}

if (!css.includes('--bg-color')) {
  console.error('Validation failure: Missing CSS custom properties')
  process.exit(1)
}

console.log('Portfolio structural validation passed cleanly!')
process.exit(0)

#!/usr/bin/env node
// Optional: makes a default (not personal) set of badge art, saved to public/badges/<id>.png as a fallback
// for badges nobody has personalised yet. The app itself makes personal badges (POST /api/badge).
//
//   npm run badges -- --list                 the badges and their prompts (free)
//   npm run badges -- --run first,streak3    REAL calls, one image each. Costs credits.
//   npm run badges -- --run all              all five;  --force replaces existing;  --out some/folder
import 'dotenv/config'
import fs from 'node:fs'
import path from 'node:path'
import { BADGE_IDS, badgePrompt, generateImage } from '../server/image.js'

const args = process.argv.slice(2)
const has = (f) => args.includes(f)
const after = (f) => (args.includes(f) ? args[args.indexOf(f) + 1] : undefined)
const out = after('--out') ?? 'public/badges'
const brand = { palette: ['#F9C5DD', '#FCD34D', '#5B4BE8'] }

if (has('--list') || args.length === 0) {
  for (const id of BADGE_IDS) console.log(`${id.padEnd(8)} ${badgePrompt(id, brand)}\n`)
  console.log(`${BADGE_IDS.length} images if you run them all. Use --run with just the ones you want.`)
  process.exit(0)
}
const spec = after('--run')
if (!spec || spec.startsWith('--')) { console.error('Use --list, or --run <ids|all>. It never runs by accident.'); process.exit(1) }
const ids = spec === 'all' ? BADGE_IDS : spec.split(',')
for (const id of ids) if (!BADGE_IDS.includes(id)) { console.error(`No badge "${id}". Try --list.`); process.exit(1) }

fs.mkdirSync(out, { recursive: true })
let made = 0
for (const id of ids) {
  const file = path.join(out, `${id}.png`)
  if (fs.existsSync(file) && !has('--force')) { console.log(`${id}: ${file} already exists, skipping (use --force to replace)`); continue }
  console.log(`${id}: asking Muse Image…`)
  try {
    fs.writeFileSync(file, await generateImage(badgePrompt(id, brand)))
    made++
    console.log(`${id}: saved ${file}`)
  } catch (err) {
    console.error(`${id}: failed: ${err.message}`)
  }
}
console.log(`\n${made} badge${made === 1 ? '' : 's'} made.`)

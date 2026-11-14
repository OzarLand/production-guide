#!/usr/bin/env node
'use strict';
// Creates the source of a new memo from templates/memo.yml, with the next free number.
//   npm run new -- <category> <slug>      e.g.  npm run new -- networking floating-ip-not-answering

const fs = require('fs');
const path = require('path');
const { ROOT, loadMemos } = require('./lib/content.cjs');
const { CATEGORIES } = require('../templates/memo.cjs');

const [category, slug] = process.argv.slice(2);
if (!CATEGORIES[category] || !/^[a-z0-9]+(-[a-z0-9]+)*$/.test(slug || '')) {
  console.error(`usage: npm run new -- <category> <slug>\ncategories: ${Object.keys(CATEGORIES).join(', ')}\nslug: lowercase words separated by hyphens`);
  process.exit(1);
}
const target = path.join(ROOT, 'categories', category, `${slug}.yml`);
if (fs.existsSync(target)) {
  console.error(`${path.relative(ROOT, target)} already exists`);
  process.exit(1);
}
const next = Math.max(0, ...loadMemos().map((m) => Number(String(m.id).slice(3)))) + 1;
const id = `PG-${String(next).padStart(2, '0')}`;
const text = fs
  .readFileSync(path.join(ROOT, 'templates', 'memo.yml'), 'utf8')
  .replace('id: PG-00 ', `id: ${id} `)
  .replace(/^category: \S+/m, `category: ${category}`);
fs.mkdirSync(path.dirname(target), { recursive: true });
fs.writeFileSync(target, text);
console.log(`created ${path.relative(ROOT, target)} as ${id}\nedit it, then run: npm run build -- --only ${slug}`);

'use strict';
// Loads the memo sources (categories/<category>/<slug>.yml) and validates them.
// Validation is what keeps twenty memos, and the two hundredth, looking and reading like one collection.

const fs = require('fs');
const path = require('path');
const YAML = require('yaml');
const { plain, iconNames, CATEGORIES, CAUTION, TONES, DIAGRAMS } = require('../../templates/memo.cjs');

const ROOT = path.resolve(__dirname, '..', '..');
const CAT_DIR = path.join(ROOT, 'categories');
const STATUSES = ['draft', 'lab-verified', 'validated', 'experimental'];

// Length budgets, in characters of visible text. They are what makes a memo readable on a phone:
// the layout has no auto-shrink, so text that does not fit is cut here, in the source, by its author.
const LIMITS = {
  title: 40,
  situation: 190,
  checkLabel: 38,
  checkHint: 70,
  caution: 150,
  lesson: 100,
  note: 150,
  liTitle: 90,
  liCaption: 1100,
};

function loadMemos() {
  const memos = [];
  for (const category of fs.readdirSync(CAT_DIR).sort()) {
    const dir = path.join(CAT_DIR, category);
    if (!fs.statSync(dir).isDirectory()) continue;
    for (const f of fs.readdirSync(dir).sort()) {
      if (!f.endsWith('.yml')) continue;
      const file = path.join(dir, f);
      let m;
      try {
        m = YAML.parse(fs.readFileSync(file, 'utf8'));
      } catch (e) {
        console.error(`${path.relative(ROOT, file)}: not valid YAML\n  ${e.message}`);
        process.exit(1);
      }
      m._file = path.relative(ROOT, file);
      m._dir = category;
      m._slug = f.slice(0, -4);
      memos.push(m);
    }
  }
  return memos.sort((a, b) => String(a.id).localeCompare(String(b.id)));
}

function validateMemo(m, icons = iconNames()) {
  const errors = [];
  const err = (msg) => errors.push(`${m._file}: ${msg}`);
  const text = (v, name, max, required = true) => {
    if (v === undefined || v === null || v === '') {
      if (required) err(`${name} is missing`);
      return;
    }
    if (typeof v !== 'string') return err(`${name} must be text`);
    const len = plain(v).length;
    if (max && len > max) err(`${name} is ${len} characters, the limit is ${max}: "${plain(v).slice(0, 50)}..."`);
    if (/[\u{1F300}-\u{1FAFF}\u{2600}-\u{27BF}]/u.test(v)) err(`${name} contains an emoji: use an icon from assets/icons instead`);
  };
  const toneOk = (t, where) => {
    if (t !== undefined && !TONES.includes(t)) err(`${where}: unknown tone "${t}" (use ${TONES.join(', ')})`);
  };
  const iconOk = (i, where) => {
    if (i !== undefined && !icons.includes(i)) err(`${where}: unknown icon "${i}" (see assets/icons)`);
  };

  if (!/^PG-\d{2,3}$/.test(m.id || '')) err(`id must look like PG-01, got "${m.id}"`);
  if (!/^[a-z0-9]+(-[a-z0-9]+)*$/.test(m._slug)) err('file name must be lowercase words separated by hyphens');
  if (!CATEGORIES[m.category]) err(`unknown category "${m.category}" (use ${Object.keys(CATEGORIES).join(', ')})`);
  if (m.category !== m._dir) err(`category "${m.category}" does not match its folder "${m._dir}"`);

  text(m.title, 'title', LIMITS.title);
  text(m.situation, 'situation', LIMITS.situation);
  text(m.lesson, 'lesson', LIMITS.lesson);
  text(m.scope, 'scope', 520);

  // Diagram
  const d = m.diagram || {};
  if (!DIAGRAMS[d.type]) err(`diagram.type must be one of ${Object.keys(DIAGRAMS).join(', ')}`);
  text(d.caption, 'diagram.caption', 60, false);
  text(d.note, 'diagram.note', LIMITS.note, false);
  if (d.type === 'chain') {
    const n = (d.nodes || []).length;
    if (n < 2 || n > 5) err('a chain has 2 to 5 nodes');
    (d.nodes || []).forEach((x, i) => {
      text(x.label, `diagram.nodes[${i}].label`, 30);
      text(x.sub, `diagram.nodes[${i}].sub`, 70, false);
      toneOk(x.tone, `diagram.nodes[${i}]`);
      iconOk(x.icon, `diagram.nodes[${i}]`);
      if (x.badge !== undefined && !['check', 'x', 'clock', 'none'].includes(x.badge)) err(`diagram.nodes[${i}].badge: use check, x, clock or none`);
    });
    if (d.links && d.links.length !== n - 1) err(`a chain of ${n} nodes has ${n - 1} links`);
    (d.links || []).forEach((l, i) => {
      if (!/^(ok|broken|back|broken back)$/.test(l)) err(`diagram.links[${i}]: use ok, broken, back or "broken back"`);
    });
  }
  if (d.type === 'branches') {
    const n = (d.rows || []).length;
    if (n < 2 || n > 4) err('branches have 2 to 4 rows');
    if (d.head && d.head.length !== 2) err('diagram.head has two labels');
    (d.rows || []).forEach((r, i) => {
      text(r.see, `diagram.rows[${i}].see`, 80);
      text(r.means, `diagram.rows[${i}].means`, 60);
      text(r.sub, `diagram.rows[${i}].sub`, 80, false);
      toneOk(r.tone, `diagram.rows[${i}]`);
    });
  }
  if (d.type === 'compare') {
    const n = (d.columns || []).length;
    if (n < 2 || n > 4) err('compare has 2 to 4 columns');
    (d.columns || []).forEach((c, i) => {
      text(c.title, `diagram.columns[${i}].title`, 40);
      text(c.kicker, `diagram.columns[${i}].kicker`, 30, false);
      text(c.verdict, `diagram.columns[${i}].verdict`, 60, false);
      toneOk(c.tone, `diagram.columns[${i}]`);
      iconOk(c.icon, `diagram.columns[${i}]`);
      if ((c.points || []).length > 4) err(`diagram.columns[${i}] has more than 4 points`);
      (c.points || []).forEach((p, j) => text(p, `diagram.columns[${i}].points[${j}]`, 90));
    });
  }

  // First checks: read-only by definition
  const checks = m.checks || [];
  if (checks.length !== 4) err(`a memo has exactly 4 first checks, this one has ${checks.length}`);
  checks.forEach((c, i) => {
    text(c.label, `checks[${i}].label`, LIMITS.checkLabel);
    text(c.hint, `checks[${i}].hint`, LIMITS.checkHint, false);
  });

  // Think before acting
  const caution = m.caution || [];
  if (caution.length < 1 || caution.length > 2) err('a memo has 1 or 2 "think before acting" items');
  caution.forEach((c, i) => {
    if (!CAUTION[c.level]) err(`caution[${i}].level must be one of ${Object.keys(CAUTION).join(', ')}`);
    text(c.text, `caution[${i}].text`, LIMITS.caution);
  });

  // Runbook reference
  const rb = m.runbook || {};
  if (!/^[a-z]+\/[a-z0-9-]+\.md$/.test(rb.path || '')) err('runbook.path must be a path inside openstack-vm-runbooks, like lifecycle/<page>.md');
  if (!STATUSES.includes(rb.status)) err(`runbook.status must be one of ${STATUSES.join(', ')}`);
  if (!/^\d{4}\.[12]$/.test(String(rb.release || ''))) err('runbook.release must be an upstream release name such as 2026.1');
  for (const p of rb.also || []) if (!/^[a-z]+\/[a-z0-9-]+\.md$/.test(p)) err(`runbook.also: "${p}" is not a runbook path`);

  // LinkedIn kit
  const li = m.linkedin || {};
  text(li.title, 'linkedin.title', LIMITS.liTitle);
  text(li.caption, 'linkedin.caption', LIMITS.liCaption);
  const tags = li.hashtags || [];
  if (tags.length < 3 || tags.length > 8) err('linkedin.hashtags: 3 to 8 hashtags');
  tags.forEach((t) => {
    if (!/^[A-Za-z][A-Za-z0-9]*$/.test(t)) err(`linkedin.hashtags: "${t}" must be one word, without the #`);
  });

  return errors;
}

function validateCollection(memos) {
  const errors = [];
  const seen = new Map();
  for (const m of memos) {
    for (const key of ['id', '_slug']) {
      const k = `${key}:${m[key]}`;
      if (seen.has(k)) errors.push(`${m._file}: ${key.replace('_', '')} "${m[key]}" is already used by ${seen.get(k)}`);
      seen.set(k, m._file);
    }
  }
  return errors;
}

const fileBase = (m) => `${m.id.toLowerCase()}-${m._slug}`;

module.exports = { ROOT, CAT_DIR, LIMITS, loadMemos, validateMemo, validateCollection, fileBase };

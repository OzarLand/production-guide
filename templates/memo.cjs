'use strict';
// OzarLand Production Guide: the memo template.
// Turns one memo (plain data, see templates/memo.yml) into a self-contained HTML page of 1080 x 1350 px.
// Presentation lives here and in memo.css / tokens.css; content lives in categories/<category>/<slug>.yml.

const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');
const ICON_DIR = path.join(ROOT, 'assets', 'icons');

const CATEGORIES = {
  'vm-lifecycle': 'VM lifecycle',
  compute: 'Compute operations',
  networking: 'Networking',
  storage: 'Storage',
  'control-plane': 'Control plane',
  'production-operations': 'Production operations',
};

// Risk levels of a "Think before acting" item. Same vocabulary as the OzarLand risk warnings.
const CAUTION = {
  destructive: { tone: 'stop', icon: 'octagon-x', tag: 'Destructive.' },
  'state-changing': { tone: 'warn', icon: 'triangle-alert', tag: 'State-changing.' },
  avoid: { tone: 'stop', icon: 'ban', tag: 'Avoid.' },
  know: { tone: 'mute', icon: 'info', tag: 'Know this.' },
};

const TONES = ['ok', 'warn', 'stop', 'mute', 'ink'];
const TONE_BADGE = { ok: 'check', warn: 'clock', stop: 'x' };

const esc = (s) =>
  String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

// Minimal inline markup allowed in content: `code` and **bold**.
function inline(s) {
  return esc(s)
    .replace(/`([^`]+)`/g, '<code>$1</code>')
    .replace(/\*\*([^*]+)\*\*/g, '<b>$1</b>');
}
// Same text with the markup removed, for alt text, captions and length checks.
const plain = (s) => String(s).replace(/`([^`]+)`/g, '$1').replace(/\*\*([^*]+)\*\*/g, '$1');

// A command hint wraps between arguments only, never inside one.
const hint = (s) =>
  String(s).split(' ').map((w) => (w.length <= 30 ? `<span>${esc(w)}</span>` : esc(w))).join(' ');

// Hyphenated names (nova-compute, neutron-server) are never broken at the hyphen.
const keepWords = (html) => html.replace(/(^|\s)([\w*]+(?:-[\w]+)+)/g, '$1<span style="white-space:nowrap">$2</span>');

const iconCache = new Map();
function iconNames() {
  return fs.readdirSync(ICON_DIR).filter((f) => f.endsWith('.svg')).map((f) => f.slice(0, -4));
}
function icon(name) {
  if (!iconCache.has(name)) {
    const raw = fs.readFileSync(path.join(ICON_DIR, `${name}.svg`), 'utf8');
    const inner = raw.replace(/<!--[\s\S]*?-->/g, '').replace(/<svg[\s\S]*?>/, '').replace(/<\/svg>/, '').trim();
    iconCache.set(
      name,
      `<svg class="icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round">${inner}</svg>`
    );
  }
  return iconCache.get(name);
}

const tone = (t, fallback = 'ink') => `t-${TONES.includes(t) ? t : fallback}`;

const ARROW = (w) =>
  `<svg viewBox="0 0 ${w} 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><path d="M3 12H${w - 5}"/><path d="M${w - 13} 4l8 8-8 8"/></svg>`;
const ARROW_BROKEN = (w) =>
  `<svg viewBox="0 0 ${w} 24" fill="none" stroke="currentColor" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round"><path d="M2 12H${w - 5}" stroke-dasharray="1 6"/><path d="M${w - 11} 6l6 6-6 6"/><circle cx="${w / 2 - 4}" cy="12" r="8.5" fill="currentColor" stroke="none"/><path d="M${w / 2 - 7.5} 8.5l7 7M${w / 2 - 0.5} 8.5l-7 7" stroke="#fff" stroke-width="2.4"/></svg>`;

// ---------- Diagram components ----------

// chain: a left-to-right path of up to five nodes. A link can be broken, or point backwards.
function chain(d) {
  const n5 = d.nodes.length >= 5;
  const w = n5 ? 30 : 44;
  const parts = [];
  d.nodes.forEach((n, i) => {
    // Badge: "check" (passed), "x" (failed), "clock" (waiting). By default a green node passed and a red node
    // failed, except in a numbered sequence, where the colour is the risk of the step, not its outcome.
    const auto = n.step ? undefined : { ok: 'check', stop: 'x' }[n.tone];
    const b = n.badge === 'none' ? undefined : n.badge || auto;
    const badge = b ? `<span class="badge-dot">${icon(b)}</span>` : '';
    const head = [
      n.step ? `<span class="node-n">${esc(n.step)}</span>` : '',
      n.icon ? icon(n.icon) : '',
    ].join('');
    parts.push(
      `<div class="node ${tone(n.tone)}">${badge}` +
        (head ? `<div class="node-head">${head}</div>` : '') +
        `<div class="node-label">${keepWords(inline(n.label))}</div>` +
        (n.sub ? `<div class="node-sub">${inline(n.sub)}</div>` : '') +
        `</div>`
    );
    if (i < d.nodes.length - 1) {
      const l = (d.links && d.links[i]) || 'ok';
      const cls = [l.includes('broken') ? 'broken' : '', l.includes('back') ? 'back' : ''].join(' ');
      parts.push(`<div class="link ${cls}">${l.includes('broken') ? ARROW_BROKEN(w) : ARROW(w)}</div>`);
    }
  });
  return `<div class="chain${n5 ? ' n5' : ''}">${parts.join('')}</div>`;
}

// branches: "if you see this, it means that". Two to four rows.
function branches(d) {
  const split = d.split ? ` style="--br-split:${Number(d.split)}%"` : '';
  const head = d.head ? `<div class="br-head"><span>${esc(d.head[0])}</span><span>${esc(d.head[1])}</span></div>` : '';
  const rows = d.rows
    .map(
      (r) =>
        `<div class="br-row"><div class="br-see${r.mono ? ' mono' : ''}"><span>${inline(r.see)}</span></div>` +
        `<div class="br-arrow">${ARROW(26)}</div>` +
        `<div class="br-means ${tone(r.tone)}"><b>${inline(r.means)}</b>${r.sub ? `<span>${inline(r.sub)}</span>` : ''}</div></div>`
    )
    .join('');
  return `<div class="branches"${split}>${head}${rows}</div>`;
}

// compare: two to four columns side by side, each with a tone, a few points and an optional verdict.
function compare(d) {
  const cols = d.columns
    .map(
      (c) =>
        `<div class="col ${tone(c.tone)}"><div class="col-head">` +
        (c.kicker ? `<div class="col-kicker">${esc(c.kicker)}</div>` : '') +
        `<div class="col-title">${c.icon ? icon(c.icon) : ''}<span>${inline(c.title)}</span></div></div>` +
        `<ul>${(c.points || []).map((p) => `<li>${inline(p)}</li>`).join('')}</ul>` +
        (c.verdict ? `<div class="col-verdict">${c.tone === 'ok' || c.tone === 'stop' ? icon(TONE_BADGE[c.tone]) : ''}<span>${inline(c.verdict)}</span></div>` : '') +
        `</div>`
    )
    .join('');
  return `<div class="compare c${d.columns.length}">${cols}</div>`;
}

const DIAGRAMS = { chain, branches, compare };

// ---------- The memo ----------

const MARK = fs.readFileSync(path.join(ROOT, 'assets', 'brand', 'ozarland-mark.svg'), 'utf8').replace(/<\?xml[\s\S]*?\?>/, '');

function renderMemo(m) {
  const d = m.diagram;
  const checks = m.checks
    .map(
      (c, i) =>
        `<li><span class="n">${i + 1}</span><div class="c-body"><div class="c-label">${inline(c.label)}</div>` +
        (c.hint ? `<div class="c-hint">${hint(c.hint)}</div>` : '') +
        `</div></li>`
    )
    .join('');
  const cautions = m.caution
    .map((c) => {
      const k = CAUTION[c.level];
      return `<div class="c-item ${tone(k.tone)}">${icon(k.icon)}<p><b class="tag">${k.tag}</b> ${inline(c.text)}</p></div>`;
    })
    .join('');
  const rb = m.runbook;

  return `<!doctype html>
<html lang="en"><head><meta charset="utf-8">
<title>${esc(m.id)} ${esc(plain(m.title))}</title>
<link rel="stylesheet" href="../../templates/tokens.css">
<link rel="stylesheet" href="../../templates/memo.css">
</head><body>
<article class="memo">
  <header class="top">
    <div class="tab">${esc(m.id.replace('-', '·'))}</div>
    <div class="cat">${esc(CATEGORIES[m.category])}</div>
    <div class="brand">${MARK}<b>OzarLand</b><span>/ production-guide</span></div>
  </header>
  <div class="body">
    <div class="head">
      <h1 class="title${plain(m.title).length > 24 ? ' long' : ''}">${inline(m.title)}</h1>
      <p class="situation">${inline(m.situation)}</p>
    </div>
    <section class="diagram">
      ${d.caption ? `<div class="dg-caption">${esc(d.caption)}</div>` : ''}
      <div class="dg-main">${DIAGRAMS[d.type](d)}</div>
      ${d.note ? `<div class="dg-note">${icon('info')}<span>${inline(d.note)}</span></div>` : ''}
    </section>
    <section class="checks">
      <h2 class="label ok">First checks <small>· read-only</small></h2>
      <ol>${checks}</ol>
    </section>
    <section class="caution">
      <h2 class="label warn">Think before acting</h2>
      <div class="items">${cautions}</div>
    </section>
  </div>
  <footer class="lesson">
    <div class="lesson-label">Operational lesson</div>
    <p class="lesson-text">${inline(m.lesson)}</p>
    <div class="foot">
      <div class="ref"><b>Go deeper:</b> github.com/OzarLand/openstack-vm-runbooks<br><span class="path">${esc(rb.path)}</span></div>
      <div class="status">runbook status<br><span class="pill ${esc(rb.status)}">${esc(rb.status)} · ${esc(rb.release)}</span></div>
    </div>
  </footer>
</article>
</body></html>`;
}

module.exports = { renderMemo, inline, plain, esc, iconNames, CATEGORIES, CAUTION, TONES, DIAGRAMS };

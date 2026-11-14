'use strict';
// Checks every runbook reference against a real checkout of OzarLand/openstack-vm-runbooks:
// the page exists, and its status and release are the ones the memo prints.
// A memo never links to a path that was not seen in the repository.

const fs = require('fs');
const path = require('path');
const { execFileSync } = require('child_process');
const { ROOT } = require('./content.cjs');

const REPO = 'https://github.com/OzarLand/openstack-vm-runbooks';
const BLOB = `${REPO}/blob/main/`;

function findCheckout(explicit) {
  const candidates = [
    explicit,
    process.env.RUNBOOKS_DIR,
    path.join(ROOT, '..', 'openstack-vm-runbooks'),
    path.join(ROOT, '..', 'ozarland', 'openstack-vm-runbooks'),
    path.join(ROOT, '.cache', 'openstack-vm-runbooks'),
  ].filter(Boolean);
  for (const c of candidates) if (fs.existsSync(path.join(c, 'README.md')) && fs.existsSync(path.join(c, 'lifecycle'))) return c;
  // Not found: fetch a shallow copy into .cache (ignored by git).
  const target = path.join(ROOT, '.cache', 'openstack-vm-runbooks');
  try {
    fs.mkdirSync(path.dirname(target), { recursive: true });
    execFileSync('git', ['clone', '--depth', '1', '--quiet', REPO, target], { stdio: 'pipe', timeout: 180000 });
    return target;
  } catch (e) {
    return null;
  }
}

function frontMatter(file) {
  const t = fs.readFileSync(file, 'utf8');
  const fm = /^---\n([\s\S]*?)\n---/.exec(t);
  const get = (k) => (fm ? (new RegExp(`^${k}:\\s*(.+)$`, 'm').exec(fm[1]) || [])[1] : undefined);
  const title = (/^# (.+)$/m.exec(t) || [])[1];
  return {
    title,
    status: get('status'),
    risk: get('risk'),
    releases: (get('openstack_releases') || '').replace(/[\[\]"' ]/g, '').split(',').filter(Boolean),
  };
}

function checkRunbooks(memos, dir) {
  const errors = [];
  for (const m of memos) {
    const rb = m.runbook || {};
    const all = [rb.path, ...(rb.also || [])].filter(Boolean);
    m._runbooks = [];
    for (const p of all) {
      const file = path.join(dir, p);
      if (!fs.existsSync(file)) {
        errors.push(`${m._file}: runbook "${p}" does not exist in openstack-vm-runbooks`);
        continue;
      }
      const fm = frontMatter(file);
      m._runbooks.push({ path: p, url: BLOB + p, ...fm });
      if (p !== rb.path) continue;
      if (fm.status !== rb.status) errors.push(`${m._file}: runbook.status is "${rb.status}" but the runbook says "${fm.status}"`);
      if (!fm.releases.includes(String(rb.release)))
        errors.push(`${m._file}: runbook.release is "${rb.release}" but the runbook lists ${fm.releases.join(', ') || 'none'}`);
    }
  }
  return errors;
}

module.exports = { REPO, BLOB, findCheckout, checkRunbooks };

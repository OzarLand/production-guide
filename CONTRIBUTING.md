[← Production Guide](README.md)

# Contributing

This repository follows the OzarLand community contribution guide:
[CONTRIBUTING.md in `ozarland`](https://github.com/OzarLand/ozarland/blob/main/CONTRIBUTING.md).

In short:

1. Give context: OpenStack release, components, deployment method, environment conditions, what you checked.
2. No sensitive data: no secrets, real hostnames, domains, IP or MAC addresses, customer or person names,
   unredacted logs ([how to redact](https://github.com/OzarLand/ozarland/blob/main/docs/conventions/sensitive-data.md)).
3. Flag risky actions: ⚠️ state-changing, 🛑 destructive
   ([risk warnings](https://github.com/OzarLand/ozarland/blob/main/docs/conventions/risk-warnings.md)).
4. Say where it was observed; never present a procedure as universal.
5. Open a pull request, sign off your commits (`git commit -s`).

## What is specific to this repository

A memo is a summary of a runbook. That fixes the order of things:

- **The runbook comes first.** A memo is written from a page of
  [openstack-vm-runbooks](https://github.com/OzarLand/openstack-vm-runbooks). If your lesson has no runbook, share
  the problem there first ([*Problem solved*](https://github.com/OzarLand/openstack-vm-runbooks/issues/new?template=problem-solved.yml));
  the memo follows.
- **Nothing is added.** No check, default value, command or cause that the runbook does not contain. If you know
  something the runbook does not say, that is a contribution to the runbook.
- **A correction goes to the source.** If a memo is wrong because its runbook is wrong, fix the runbook, then the
  memo.
- **Accuracy over quantity.** A memo that is not written is a gap, listed in the
  [README](README.md#-not-covered-yet). A memo that is wrong is a risk for whoever trusts it during an incident.

## Writing a memo

You need Node.js 20 or later. No design tool: you write text, the template draws.

```bash
npm ci
```

```bash
npx playwright install chromium
```

```bash
npm run new -- <category> <slug>
```

For example `npm run new -- networking security-group-rule-has-no-effect`. This creates
`categories/<category>/<slug>.yml` from [`templates/memo.yml`](templates/memo.yml), with the next memo number. The
categories are `vm-lifecycle`, `compute`, `networking`, `storage`, `control-plane` and `production-operations`.

Fill it in, then render it as often as you need:

```bash
npm run build -- --only <slug>
```

Look at `dist/pg-NN-<slug>.png`. The build tells you what is too long or does not fit, and refuses a runbook path
that does not exist. When it is right, run the full build and commit everything it changed:

```bash
npm run build
```

That is the memo source, its generated page, `README.md`, `LINKEDIN.md`, the category index, and the images in
`dist/`.

### The checklist a reviewer uses

| Question | Why |
|---|---|
| Is it one lesson? | Two lessons are two memos |
| Is every statement in the runbook named under `runbook:`? | The memo must not say more than its source |
| Are the four first checks read-only? | An operator runs them without thinking, in the middle of an incident |
| Is each risky action flagged with the right level? | `destructive` if it can lose data, end workloads or cannot be undone; `state-changing` otherwise |
| Does `scope:` say where this holds? | Release, deployment method, backend, and what the runbook did not test |
| Is version-specific behaviour marked as such? | "Default 300 s", "from microversion 2.95", "Kolla-Ansible 2026.1 writes 10" |
| Does the image work alone? | It will be seen on LinkedIn, without the repository |
| Is the wording OpenStack's? | `nova-compute`, `BUILD`, Placement, floating IP, as upstream writes them |

### The LinkedIn kit

Each memo carries its post: a title, a caption and three to eight hashtags, under `linkedin:`. The caption must
make sense without the image, and must not promise more than the memo. The build appends the runbook link and the
repository link, and gathers every post in [`LINKEDIN.md`](LINKEDIN.md).

## Correcting a memo

Edit its `.yml`, never the generated `.md` or the image, then `npm run build`. Say in the pull request what was
wrong and where you observed the right behaviour. If your platform behaves differently without the memo being
wrong, the `scope:` paragraph is the place to say so.

## Changing the design

The visual identity is described in [DESIGN.md](DESIGN.md) and lives in `templates/`. A change there changes every
memo: open an issue first, and include the regenerated images in the pull request so the effect can be seen.

## What the automated check covers

The `check` workflow validates the memo sources, checks every runbook reference against the runbooks repository
(path, status, release), renders the collection to prove that each memo fits, and fails if the generated pages are
out of date. It checks form and links. It cannot check that a memo is technically right: that is what the review,
and your experience, are for.

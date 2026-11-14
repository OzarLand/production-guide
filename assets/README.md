# Assets

| Folder | What it holds | Licence |
|---|---|---|
| `brand/` | The OzarLand mark used in the header of every memo | Apache-2.0, like the rest of this repository |
| `fonts/` | Inter (variable, Latin subset) and JetBrains Mono (variable, Latin subset), as packaged by Fontsource 5.3.0 | SIL Open Font License 1.1: `LICENSE-Inter.txt`, `LICENSE-JetBrainsMono.txt` |
| `icons/` | A subset of [Lucide](https://lucide.dev) icons (lucide-static 1.73.0), unmodified | ISC: `LICENSE-Lucide.txt` |

The fonts are vendored so that a memo renders the same on every machine and in CI. To add an icon, copy its SVG from
`lucide-static/icons/` into `icons/`: the template reads whatever is in that folder, and the build rejects a memo
that names an icon that is not there.

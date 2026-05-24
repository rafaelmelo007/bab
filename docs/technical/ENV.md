# Environment Variables

> TODO: enumerate every env var this repo reads, with default and origin (PRD reference, decision ID, or framework).
>
> Currently anticipated (none yet authoritative — populated as code lands):
>
> | Var | Read by | Default | Source |
> |-----|---------|---------|--------|
> | `NO_COLOR` | repl-shell | unset | `repl-shell` SPEC §4 Accessibility row |
> | `ULM_CONFIG_DIR` | (TBD) state loader | platform default (`~/.config/ulm` / `%APPDATA%\ulm`) | PRD §5.5.2 |
> | `PATH` | provider discovery | inherited | PRD §5.4 |

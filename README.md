# herdr-target-picker

A [Herdr](https://herdr.dev) plugin that opens a popup listing your spaces,
tabs, and panes, and types the one you pick into the pane you called it from.
Built for telling a coding agent *which* pane or agent you mean without
looking up ids by hand.

```
 ╭──────────────────────────────────────────────────────────────────╮
 │ Type to filter                                                   │
 ╰──────────────────────────────────────────────────────────────────╯

 Spaces (1/1)              Tabs (1/1)               Panes (1/1)
 ▶ api                     chat                     assistant (claude)  1
   web                     server                   tests               2
   docs

 Type : Filter   ↑/↓ : Select   ← : Back   → : Choose   1~9 : Fast key
 PgUp/PgDn : Page   Ctrl-U : Clear   Enter : Confirm   Esc : Clear / Close
```

Press Enter on `assistant (claude)` above and the calling pane receives:

```
herdr:assistant(w1:p1) 
```

## Install

Requires [Bun](https://bun.sh) on `PATH`.

```sh
herdr plugin install <owner>/herdr-target-picker
```

Bind a key in `~/.config/herdr/config.toml` and reload with `prefix+shift+r`:

```toml
[[keys.command]]
key = "prefix+shift+p"
type = "plugin_action"
command = "herdr-target-picker.open"
description = "pick a herdr target"
```

## Keys

| Key | Action |
| --- | --- |
| type | Filter the current column; the first match is hovered |
| `↑` / `↓` | Move the hover in the current column |
| `→` | Choose: activate the hovered item and move to its children |
| `1`–`9` | Same as `→` for the numbered item; only while nothing is typed |
| `←` | Back to the parent column |
| `PgUp` / `PgDn` | Switch page (9 items per page) |
| `Ctrl-U` | Clear the query |
| `Enter` | Type the hovered item into the calling pane and close |
| `Esc` | Clear the query; when it is already empty, close |

The three columns always show one path: the hovered space's tabs, and the
hovered tab's panes. Each column keeps its own query. Number badges appear on
the column that accepts them, which is the column right of the last activated
item, and disappear while a query is being typed. Any level can be confirmed,
so `Enter` on a space sends the space.

The popup opens with the hover on the space, tab, and pane you called it from.

## Labels

| Level | Shown as |
| --- | --- |
| Space | workspace label |
| Tab | tab label |
| Pane | pane name (`herdr pane rename`), else `agent-name (kind)`, else agent kind, else `shell` |

## Config

The first run writes `config.toml` to the plugin config directory
(`herdr plugin config-dir herdr-target-picker`):

```toml
output_template = "herdr:{name}({id})"
```

| Token | Value |
| --- | --- |
| `{name}` | pane name, else agent name, else agent kind, else `shell`; spaces and tabs use their label |
| `{label}` | the text shown in the column, e.g. `hqcommit (claude)` |
| `{id}` | herdr id, e.g. `w8:p1G` |

The text is sent with `herdr pane send-text` followed by one space, and is not
submitted; you keep typing.

## Development

```sh
git clone https://github.com/<owner>/herdr-target-picker
herdr plugin link ./herdr-target-picker
bun test
```

Windows is not declared in the manifest: the raw-mode key handling has not
been tested under ConPTY.

## License

MIT

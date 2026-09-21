# herdr-target-picker

[![License](https://img.shields.io/badge/license-MIT-blue)](LICENSE)
![Herdr 0.9+](https://img.shields.io/badge/herdr-0.9%2B-8a2be2)
![Platforms](https://img.shields.io/badge/platforms-macOS%20%E2%80%A2%20Linux%20%E2%80%A2%20Windows%20(preview)-informational)
![Runtime](https://img.shields.io/badge/runtime-Node%2018%2B-5fa04e)

[English](./README.md) | [简体中文](./docs/zh-sc.md) | [繁體中文](./docs/zh-tc.md) | [Español](./docs/es.md) | [Português](./docs/pt.md) | [Русский](./docs/ru.md) | [日本語](./docs/jp.md) | [Français](./docs/fr.md) | [Deutsch](./docs/de.md) | [Tiếng Việt](./docs/vi.md) | [한국어](./docs/ko.md) | [ไทย](./docs/th.md) | [Italiano](./docs/it.md)

<p align="center">
  <a href="#install">install</a> · <a href="#keys">keys</a> · <a href="#what-gets-typed">what gets typed</a> · <a href="#configuration">configuration</a>
</p>

Cross-pane chat in Herdr is awesome, but have you ever felt that describing
the target takes too long, especially one in another Space?

Vague targets cost twice: your tokens to describe them, the agent's to go
find them. This popup ends both. Pick the pane, its Herdr id lands in the
prompt, and the agent acts on exactly that one.

> Three keystrokes, three seconds. Open, arrow, Enter, and the exact pane is in
> your prompt, before you could have finished typing its description.

![The picker opens over an agent pane, a fast key and a typed filter narrow it to dev-server, and Enter types herdr:dev-server(w2:p2) into the prompt](docs/media/demo.gif)

- **Three linked columns** — spaces, their tabs, and the tabs' panes, always
  one path from left to right.
- **Fast keys** — `1`–`9` on the active column; two keystrokes reach any pane
  on the first page.
- **Type to filter** — no search mode; start typing and the column narrows.
- **Confirm any level** — `Enter` on a space sends the space, on a pane sends
  the pane.
- **Starts where you are** — the hover opens on the space, tab, and pane you
  called it from.
- **Your format** — `herdr:{name}({id})` by default; change the template in
  one line of config.

The picker only reads the session through the Herdr CLI and types one string
into the calling pane. It never submits the prompt. Acting on the id is the
job of Herdr's official agent skill (`herdr --skill`); this plugin only
generates the pointer.

## Install

Requires Node 18 or newer on `PATH`; there are no dependencies.

```sh
herdr plugin install navishachiku/herdr-target-picker
```

Bind a key in `~/.config/herdr/config.toml` and reload with `prefix+shift+r`:

```toml
[[keys.command]]
key = "prefix+shift+p"
type = "plugin_action"
command = "herdr-target-picker.open"
description = "pick a herdr target"
```

`prefix` is `ctrl+b` unless you changed it.

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

Each column keeps its own query. Number badges appear on the column that
accepts them, which is the column right of the last activated item, and
disappear while a query is being typed.

## What gets typed

Items are shown by name and sent through the output template:

| Level | Name |
| --- | --- |
| Space | workspace label |
| Tab | tab label |
| Pane | pane name (`herdr pane rename`), else `agent-name (kind)`, else agent kind, else `shell` |

With the default template, choosing the pane named `dev-server` in `w2` types:

```
herdr:dev-server(w2:p2) 
```

The text goes through `herdr pane send-text` with one trailing space and is
not submitted, so you keep typing. The `herdr:` prefix is for humans; the id
in the parentheses is what an agent with Herdr's official skill loaded acts
on. Without that skill the string is just text.

## Configuration

The first run writes `config.toml` to the plugin config directory
(`herdr plugin config-dir herdr-target-picker`):

```toml
output_template = "herdr:{name}({id})"
```

| Token | Value |
| --- | --- |
| `{name}` | the name from the table above |
| `{label}` | the text shown in the column, e.g. `reviewer (codex)` |
| `{id}` | Herdr id, e.g. `w2:p2` |

## Development

```sh
git clone https://github.com/navishachiku/herdr-target-picker
herdr plugin link ./herdr-target-picker
npm test
```

The popup is `src/main.mjs`; the picker state lives in `src/model.mjs` and
is covered by `src/model.test.mjs`. Plain JavaScript, no build step.

## Windows

Declared in the manifest and runs on the same code: nothing in the plugin is
Unix-specific, and Node's raw-mode input delivers the same escape sequences
under ConPTY. Herdr's own plugin support on Windows is in preview, so treat
it the same way here and report anything that misbehaves.

## License

[MIT](LICENSE)

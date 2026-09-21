# herdr-target-picker

[![License](https://img.shields.io/badge/license-MIT-blue)](../LICENSE)
![Herdr 0.9+](https://img.shields.io/badge/herdr-0.9%2B-8a2be2)
![Platforms](https://img.shields.io/badge/platforms-macOS%20%E2%80%A2%20Linux%20%E2%80%A2%20Windows%20(preview)-informational)
![Runtime](https://img.shields.io/badge/runtime-Node%2018%2B-5fa04e)

<p align="center">
  <a href="#installation">Installation</a> · <a href="#tasten">Tasten</a> · <a href="#was-eingegeben-wird">Was eingegeben wird</a> · <a href="#konfiguration">Konfiguration</a>
</p>

Über Panes hinweg chatten in Herdr ist klasse – aber kennst du das, wenn das
Beschreiben des Ziels ewig dauert? Vor allem, wenn es in einem anderen Space
liegt.

Vage Ziele kosten doppelt: deine Tokens, um sie zu beschreiben, und die des
Agenten, um sie zu finden. Dieses Popup beendet beides. Wähle das Pane, seine
Herdr-ID landet im Prompt, und der Agent handelt genau an diesem einen.

> Drei Tasten, drei Sekunden. Öffnen, Pfeil, Enter – und das exakte Pane steht
> in deinem Prompt, bevor du seine Beschreibung fertig getippt hättest.

![Der Picker öffnet sich über einem Agenten-Pane, eine Schnelltaste und ein getippter Filter grenzen ihn auf dev-server ein, und Enter tippt herdr:dev-server(w2:p2) in den Prompt](./media/demo.gif)

- **Drei verknüpfte Spalten** – Spaces, ihre Tabs und die Panes der Tabs,
  immer ein Pfad von links nach rechts.
- **Schnelltasten** – `1`–`9` in der aktiven Spalte; zwei Tastendrücke
  erreichen jedes Pane der ersten Seite.
- **Tippen zum Filtern** – kein Suchmodus; fang an zu tippen und die Spalte
  wird enger.
- **Auf jeder Ebene bestätigen** – `Enter` auf einem Space sendet den Space,
  auf einem Pane das Pane.
- **Startet, wo du bist** – der Cursor öffnet sich auf Space, Tab und Pane,
  von denen aus du ihn aufgerufen hast.
- **Dein Format** – standardmäßig `herdr:{name}({id})`; die Vorlage änderst du
  in einer Konfigurationszeile.

Der Picker liest die Sitzung nur über die Herdr-CLI und tippt einen String in
das aufrufende Pane. Er sendet den Prompt nie ab. Auf die ID zu reagieren ist
Aufgabe des offiziellen Herdr-Agenten-Skills (`herdr --skill`); dieses Plugin
erzeugt nur den Zeiger.

## Installation

Benötigt Node 18 oder neuer im `PATH`; es gibt keine Abhängigkeiten.

```sh
herdr plugin install navishachiku/herdr-target-picker
```

Belege eine Taste in `~/.config/herdr/config.toml` und lade mit
`prefix+shift+r` neu:

```toml
[[keys.command]]
key = "prefix+shift+p"
type = "plugin_action"
command = "herdr-target-picker.open"
description = "pick a herdr target"
```

`prefix` ist `ctrl+b`, sofern du es nicht geändert hast.

## Tasten

| Taste | Aktion |
| --- | --- |
| tippen | Filtert die aktuelle Spalte; der erste Treffer liegt unter dem Cursor |
| `↑` / `↓` | Bewegt den Cursor in der aktuellen Spalte |
| `→` | Wählen: aktiviert den Eintrag unter dem Cursor und wechselt zu seinen Kindern |
| `1`–`9` | Wie `→` für den nummerierten Eintrag; nur solange nichts getippt ist |
| `←` | Zurück zur übergeordneten Spalte |
| `PgUp` / `PgDn` | Seite wechseln (9 Einträge pro Seite) |
| `Ctrl-U` | Abfrage löschen |
| `Enter` | Tippt den Eintrag unter dem Cursor in das aufrufende Pane und schließt |
| `Esc` | Abfrage löschen; ist sie bereits leer, schließen |

Jede Spalte behält ihre eigene Abfrage. Nummern-Badges erscheinen in der
Spalte, die sie annimmt – der Spalte rechts vom zuletzt aktivierten Eintrag –
und verschwinden, während eine Abfrage getippt wird.

## Was eingegeben wird

Einträge werden mit ihrem Namen angezeigt und durch die Ausgabevorlage
geschickt:

| Ebene | Name |
| --- | --- |
| Space | Workspace-Bezeichnung |
| Tab | Tab-Bezeichnung |
| Pane | Pane-Name (`herdr pane rename`), sonst `agent-name (kind)`, sonst Agententyp, sonst `shell` |

Mit der Standardvorlage tippt die Wahl des Panes `dev-server` in `w2`:

```
herdr:dev-server(w2:p2) 
```

Der Text geht mit einem abschließenden Leerzeichen durch
`herdr pane send-text` und wird nicht abgeschickt, du tippst also weiter. Das
Präfix `herdr:` ist für Menschen; die ID in den Klammern ist das, worauf ein
Agent mit geladenem offiziellem Herdr-Skill reagiert. Ohne diesen Skill ist
der String nur Text.

## Konfiguration

Der erste Start schreibt `config.toml` in das Konfigurationsverzeichnis des
Plugins (`herdr plugin config-dir herdr-target-picker`):

```toml
output_template = "herdr:{name}({id})"
```

| Platzhalter | Wert |
| --- | --- |
| `{name}` | der Name aus der Tabelle oben |
| `{label}` | der in der Spalte angezeigte Text, z. B. `reviewer (codex)` |
| `{id}` | Herdr-ID, z. B. `w2:p2` |

## Entwicklung

```sh
git clone https://github.com/navishachiku/herdr-target-picker
herdr plugin link ./herdr-target-picker
npm test
```

Das Popup ist `src/main.mjs`; der Picker-Zustand liegt in `src/model.mjs` und
wird von `src/model.test.mjs` abgedeckt. Reines JavaScript, kein Build-Schritt.

## Windows

Im Manifest deklariert und läuft mit demselben Code: nichts im Plugin ist
Unix-spezifisch, und Nodes Raw-Modus-Eingabe liefert unter ConPTY dieselben
Escape-Sequenzen. Herdrs eigene Plugin-Unterstützung unter Windows ist noch
Preview, also behandle sie hier genauso und melde alles, was sich falsch verhält.

## Lizenz

[MIT](../LICENSE)

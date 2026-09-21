# herdr-target-picker

[![License](https://img.shields.io/badge/license-MIT-blue)](../LICENSE)
![Herdr 0.9+](https://img.shields.io/badge/herdr-0.9%2B-8a2be2)
![Platforms](https://img.shields.io/badge/platforms-macOS%20%E2%80%A2%20Linux%20%E2%80%A2%20Windows%20(preview)-informational)
![Runtime](https://img.shields.io/badge/runtime-Node%2018%2B-5fa04e)

<p align="center">
  <a href="#installazione">installazione</a> · <a href="#tasti">tasti</a> · <a href="#cosa-viene-digitato">cosa viene digitato</a> · <a href="#configurazione">configurazione</a>
</p>

Chattare tra pane in Herdr è una figata, ma ti è mai capitato che descrivere
il bersaglio ti porti via un'eternità? Soprattutto se sta in un altro Space.

I bersagli vaghi costano due volte: i tuoi token per descriverli, quelli
dell'agente per andarli a cercare. Questo popup elimina entrambi. Scegli il
pane, il suo id Herdr finisce nel prompt e l'agente agisce esattamente su
quello.

> Tre tasti, tre secondi. Apri, freccia, Invio, e il pane esatto è nel tuo
> prompt prima che tu avessi finito di digitarne la descrizione.

![Il selettore si apre sopra un pane agente, un tasto rapido e un filtro digitato lo restringono a dev-server, e Invio digita herdr:dev-server(w2:p2) nel prompt](./media/demo.gif)

- **Tre colonne collegate** — spazi, le loro schede e i pane delle schede,
  sempre un unico percorso da sinistra a destra.
- **Tasti rapidi** — `1`–`9` sulla colonna attiva; due pressioni raggiungono
  qualsiasi pane della prima pagina.
- **Digita per filtrare** — nessuna modalità di ricerca; inizia a digitare e
  la colonna si restringe.
- **Conferma a qualsiasi livello** — `Invio` su uno spazio invia lo spazio,
  su un pane invia il pane.
- **Parte da dove sei** — il cursore si apre sullo spazio, la scheda e il pane
  da cui l'hai richiamato.
- **Il tuo formato** — `herdr:{name}({id})` per impostazione predefinita;
  cambia il modello in una riga di configurazione.

Il selettore legge la sessione solo tramite la CLI di Herdr e digita una
stringa nel pane chiamante. Non invia mai il prompt. Agire sull'id è compito
dello skill agente ufficiale di Herdr (`herdr --skill`); questo plugin genera
solo il puntatore.

## Installazione

Richiede Node 18 o più recente.

```sh
herdr plugin install navishachiku/herdr-target-picker
```

Associa un tasto in `~/.config/herdr/config.toml` e ricarica con
`prefix+shift+r`:

```toml
[[keys.command]]
key = "prefix+shift+p"
type = "plugin_action"
command = "herdr-target-picker.open"
description = "pick a herdr target"
```

`prefix` è `ctrl+b` a meno che tu non l'abbia cambiato.

## Tasti

| Tasto | Azione |
| --- | --- |
| digitare | Filtra la colonna corrente; la prima corrispondenza va sotto il cursore |
| `↑` / `↓` | Sposta il cursore nella colonna corrente |
| `→` | Scegli: attiva la voce sotto il cursore e passa ai suoi figli |
| `1`–`9` | Come `→` per la voce numerata; solo finché non è stato digitato nulla |
| `←` | Torna alla colonna padre |
| `PgUp` / `PgDn` | Cambia pagina (9 voci per pagina) |
| `Ctrl-U` | Cancella la query |
| `Invio` | Digita la voce sotto il cursore nel pane chiamante e chiude |
| `Esc` | Cancella la query; se è già vuota, chiude |

Ogni colonna conserva la propria query. I badge numerici compaiono sulla
colonna che li accetta, cioè la colonna a destra dell'ultima voce attivata, e
scompaiono mentre si digita una query.

## Cosa viene digitato

Le voci sono mostrate per nome e inviate attraverso il modello di output:

| Livello | Nome |
| --- | --- |
| Spazio | etichetta del workspace |
| Scheda | etichetta della scheda |
| Pane | nome del pane (`herdr pane rename`), altrimenti `agent-name (kind)`, altrimenti il tipo di agente, altrimenti `shell` |

Con il modello predefinito, scegliere il pane chiamato `dev-server` in `w2`
digita:

```
herdr:dev-server(w2:p2) 
```

Il testo passa per `herdr pane send-text` con uno spazio finale e non viene
inviato, quindi continui a digitare. Il prefisso `herdr:` è per gli umani;
l'id tra parentesi è ciò su cui agisce un agente con lo skill ufficiale di
Herdr caricato. Senza quello skill, la stringa è solo testo.

## Configurazione

La prima esecuzione scrive `config.toml` nella directory di configurazione
del plugin (`herdr plugin config-dir herdr-target-picker`):

```toml
output_template = "herdr:{name}({id})"
```

| Token | Valore |
| --- | --- |
| `{name}` | il nome dalla tabella sopra |
| `{label}` | il testo mostrato nella colonna, es. `reviewer (codex)` |
| `{id}` | id Herdr, es. `w2:p2` |

## Sviluppo

```sh
git clone https://github.com/navishachiku/herdr-target-picker
herdr plugin link ./herdr-target-picker
npm test
```

Il popup è `src/main.mjs`; lo stato del selettore vive in `src/model.mjs` ed è
coperto da `src/model.test.mjs`. JavaScript puro, nessun passo di build.

## Windows

Il supporto a Windows è in preview. Segnala qualsiasi anomalia.

## Licenza

[MIT](../LICENSE)

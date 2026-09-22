# herdr-pinpoint

[![License](https://img.shields.io/badge/license-MIT-blue)](../LICENSE)
![Herdr 0.9+](https://img.shields.io/badge/herdr-0.9%2B-8a2be2)
![Platforms](https://img.shields.io/badge/platforms-macOS%20%E2%80%A2%20Linux%20%E2%80%A2%20Windows%20(preview)-informational)
![Runtime](https://img.shields.io/badge/runtime-Node%2018%2B-5fa04e)

<p align="center">
  <a href="#installation">installation</a> · <a href="#touches">touches</a> · <a href="#ce-qui-est-saisi">ce qui est saisi</a> · <a href="#configuration">configuration</a>
</p>

Discuter d'un pane à l'autre dans Herdr, c'est génial. Mais décrire la cible,
ça vous a déjà semblé interminable ? Surtout quand elle est dans un autre Space.

Les cibles vagues coûtent deux fois : vos tokens pour les décrire, ceux de
l'agent pour aller les trouver. Ce popup met fin aux deux.

> Trois secondes suffisent pour nommer la cible, plus vite que de taper sa
> description.

![Le sélecteur s'ouvre au-dessus d'un pane d'agent, une touche rapide et un filtre saisi le réduisent à dev-server, et Entrée saisit herdr:dev-server(w2:p2) dans le prompt](./media/demo.gif)

- **Trois colonnes liées** — espaces, leurs onglets et les panes des onglets,
  toujours un seul chemin de gauche à droite.
- **Touches rapides** — `1`–`9` sur la colonne active ; deux frappes
  atteignent n'importe quel pane de la première page.
- **Recherche dans tout l'arbre** — `/` compare avec le chemin complet
  `space / tab / pane` et surligne ce qu'il trouve.
- **Validez à tout niveau** — `Entrée` sur un espace envoie l'espace, sur un
  pane envoie le pane.
- **Démarre où vous êtes** — le survol s'ouvre sur l'espace, l'onglet et le
  pane depuis lesquels vous l'avez appelé.
- **Votre format** — `herdr:{name}({id})` par défaut ; changez le modèle en une
  ligne de configuration.

Le sélecteur ne fait que lire la session via le CLI Herdr et saisir une chaîne
dans le pane appelant. Il ne soumet jamais le prompt. Agir sur l'id est le
rôle du skill d'agent officiel de Herdr (`herdr --skill`) ; ce plugin ne fait
que générer le pointeur.

## Installation

Nécessite Node 18 ou plus récent.

```sh
herdr plugin install navishachiku/herdr-pinpoint
```

Associez une touche dans `~/.config/herdr/config.toml` et rechargez avec
`prefix+shift+r` :

```toml
[[keys.command]]
key = "prefix+shift+p"
type = "plugin_action"
command = "herdr-pinpoint.open"
description = "pick a herdr target"
```

`prefix` vaut `ctrl+b` sauf si vous l'avez changé.

## Touches

Pour parcourir les trois colonnes :

| Touche | Action |
| --- | --- |
| `↑` / `↓` | Déplace le curseur dans la colonne courante |
| `→` ou `1`–`9` | Choisit cet élément et passe à ses enfants |
| `←` | Revient à la colonne parente |
| `PgUp` / `PgDn` | Change de page (9 par page) |
| `/` | Rechercher |
| `Enter` | Saisit l'élément sous le curseur dans le pane appelant et ferme |
| `Esc` | Ferme |

Pendant la recherche, les colonnes laissent place à une seule liste de résultats :

| Touche | Action |
| --- | --- |
| saisie | Compare avec tout le chemin `space / tab / pane` ; la correspondance est surlignée |
| `↓` / `↑` | Va au premier / dernier résultat ; depuis le premier, `↑` revient au champ |
| `1`–`9` | Sélectionne ce résultat une fois le champ quitté |
| `Enter` | Quitte le champ en gardant les résultats ; sur un résultat, l'envoie |
| `Ctrl-U` | Vide la requête |
| `Esc` | Abandonne la requête et revient aux colonnes |

Rien n'est sélectionné tant que le texte est en cours de saisie, donc aucune ligne ne semble prête à être envoyée. Effacer jusqu'au vide reste dans la recherche ; un effacement de plus en sort.

## Ce qui est saisi

Les éléments sont affichés par nom et envoyés à travers le modèle de sortie :

| Niveau | Nom |
| --- | --- |
| Espace | libellé du workspace |
| Onglet | libellé de l'onglet |
| Pane | nom du pane (`herdr pane rename`), sinon `agent-name (kind)`, sinon le type d'agent, sinon `shell` |

Avec le modèle par défaut, choisir le pane nommé `dev-server` dans `w2`
saisit :

```
herdr:dev-server(w2:p2) 
```

Le texte passe par `herdr pane send-text` avec une espace finale et n'est pas
soumis, vous continuez donc à taper. Le préfixe `herdr:` est pour les humains ;
l'id entre parenthèses est ce sur quoi agit un agent ayant chargé le skill
officiel de Herdr. Sans ce skill, la chaîne n'est que du texte.

## Configuration

La première exécution écrit `config.toml` dans le répertoire de configuration
du plugin (`herdr plugin config-dir herdr-pinpoint`) :

```toml
output_template = "herdr:{name}({id})"
```

| Jeton | Valeur |
| --- | --- |
| `{name}` | le nom du tableau ci-dessus |
| `{label}` | le texte affiché dans la colonne, p. ex. `reviewer (codex)` |
| `{id}` | id Herdr, p. ex. `w2:p2` |

## Développement

```sh
git clone https://github.com/navishachiku/herdr-pinpoint
herdr plugin link ./herdr-pinpoint
npm test
```

Le popup est `src/main.mjs` ; l'état du sélecteur vit dans `src/model.mjs` et
est couvert par `src/model.test.mjs`. JavaScript pur, sans étape de build.

## Windows

Le support de Windows est en preview. Signalez tout comportement anormal.

## Licence

[MIT](../LICENSE)

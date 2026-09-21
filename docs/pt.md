# herdr-target-picker

[![License](https://img.shields.io/badge/license-MIT-blue)](../LICENSE)
![Herdr 0.9+](https://img.shields.io/badge/herdr-0.9%2B-8a2be2)
![Platforms](https://img.shields.io/badge/platforms-macOS%20%E2%80%A2%20Linux%20%E2%80%A2%20Windows%20(preview)-informational)
![Runtime](https://img.shields.io/badge/runtime-Node%2018%2B-5fa04e)

<p align="center">
  <a href="#instalação">instalação</a> · <a href="#teclas">teclas</a> · <a href="#o-que-é-digitado">o que é digitado</a> · <a href="#configuração">configuração</a>
</p>

Conversar entre panes no Herdr é demais, mas já sentiu que descrever o alvo
leva tempo demais? Principalmente quando ele está em outro Space.

Alvos vagos custam duas vezes: seus tokens para descrevê-los e os do agente
para ir encontrá-los. Este popup acaba com os dois. Escolha o pane, o id dele
no Herdr cai no prompt e o agente age exatamente sobre aquele.

> Três teclas, três segundos. Abrir, seta, Enter, e o pane exato está no seu
> prompt antes que você terminasse de digitar a descrição.

![O seletor abre sobre um pane de agente, uma tecla rápida e um filtro digitado reduzem para dev-server, e Enter digita herdr:dev-server(w2:p2) no prompt](./media/demo.gif)

- **Três colunas encadeadas** — espaços, suas abas e os panes das abas, sempre
  um único caminho da esquerda para a direita.
- **Teclas rápidas** — `1`–`9` na coluna ativa; duas teclas alcançam qualquer
  pane da primeira página.
- **Digite para filtrar** — sem modo de busca; comece a digitar e a coluna se
  estreita.
- **Confirme em qualquer nível** — `Enter` num espaço envia o espaço, num pane
  envia o pane.
- **Começa onde você está** — o cursor abre no espaço, aba e pane de onde você
  o chamou.
- **Seu formato** — `herdr:{name}({id})` por padrão; troque o template em uma
  linha de configuração.

O seletor apenas lê a sessão pelo CLI do Herdr e digita uma string no pane
que o chamou. Ele nunca envia o prompt. Agir sobre o id é trabalho do skill
oficial de agente do Herdr (`herdr --skill`); este plugin só gera o ponteiro.

## Instalação

Requer Node 18 ou mais recente.

```sh
herdr plugin install navishachiku/herdr-target-picker
```

Vincule uma tecla em `~/.config/herdr/config.toml` e recarregue com
`prefix+shift+r`:

```toml
[[keys.command]]
key = "prefix+shift+p"
type = "plugin_action"
command = "herdr-target-picker.open"
description = "pick a herdr target"
```

`prefix` é `ctrl+b`, a menos que você o tenha alterado.

## Teclas

| Tecla | Ação |
| --- | --- |
| digitar | Filtra a coluna atual; a primeira correspondência fica sob o cursor |
| `↑` / `↓` | Move o cursor na coluna atual |
| `→` | Escolher: ativa o item sob o cursor e passa aos filhos dele |
| `1`–`9` | Igual a `→` para o item numerado; só enquanto nada foi digitado |
| `←` | Volta à coluna pai |
| `PgUp` / `PgDn` | Troca de página (9 itens por página) |
| `Ctrl-U` | Limpa a consulta |
| `Enter` | Digita o item sob o cursor no pane que chamou e fecha |
| `Esc` | Limpa a consulta; se já estiver vazia, fecha |

Cada coluna mantém a própria consulta. Os selos numéricos aparecem na coluna
que os aceita, que é a coluna à direita do último item ativado, e somem
enquanto uma consulta é digitada.

## O que é digitado

Os itens são exibidos pelo nome e enviados pelo template de saída:

| Nível | Nome |
| --- | --- |
| Espaço | rótulo do workspace |
| Aba | rótulo da aba |
| Pane | nome do pane (`herdr pane rename`), senão `agent-name (kind)`, senão o tipo do agente, senão `shell` |

Com o template padrão, escolher o pane chamado `dev-server` em `w2` digita:

```
herdr:dev-server(w2:p2) 
```

O texto passa por `herdr pane send-text` com um espaço no final e não é
enviado, então você continua digitando. O prefixo `herdr:` é para humanos; o
id entre parênteses é aquilo sobre o que age um agente com o skill oficial do
Herdr carregado. Sem esse skill, a string é só texto.

## Configuração

A primeira execução grava `config.toml` no diretório de configuração do
plugin (`herdr plugin config-dir herdr-target-picker`):

```toml
output_template = "herdr:{name}({id})"
```

| Token | Valor |
| --- | --- |
| `{name}` | o nome da tabela acima |
| `{label}` | o texto exibido na coluna, p. ex. `reviewer (codex)` |
| `{id}` | id do Herdr, p. ex. `w2:p2` |

## Desenvolvimento

```sh
git clone https://github.com/navishachiku/herdr-target-picker
herdr plugin link ./herdr-target-picker
npm test
```

O popup é `src/main.mjs`; o estado do seletor fica em `src/model.mjs` e é
coberto por `src/model.test.mjs`. JavaScript puro, sem etapa de build.

## Windows

O suporte a Windows está em preview. Relate qualquer comportamento estranho.

## Licença

[MIT](../LICENSE)

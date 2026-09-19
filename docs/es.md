# herdr-target-picker

[![License](https://img.shields.io/badge/license-MIT-blue)](../LICENSE)
![Herdr 0.9+](https://img.shields.io/badge/herdr-0.9%2B-8a2be2)
![Platforms](https://img.shields.io/badge/platforms-macOS%20%E2%80%A2%20Linux-informational)
![Runtime](https://img.shields.io/badge/runtime-Bun-f9f1e1)

<p align="center">
  <a href="#instalación">instalación</a> · <a href="#teclas">teclas</a> · <a href="#qué-se-escribe">qué se escribe</a> · <a href="#configuración">configuración</a>
</p>

Los objetivos vagos cuestan dos veces: tus tokens para describirlos y los del
agente para ir a buscarlos. Este popup acaba con ambos. Elige el pane, su id de
Herdr aterriza en el prompt y el agente actúa exactamente sobre ese.

Tres teclas, tres segundos. Abrir, flecha, Enter, y el pane exacto está en tu
prompt antes de que hubieras terminado de escribir su descripción.

![El selector se abre sobre un pane de agente, una tecla rápida y un filtro escrito lo reducen a dev-server, y Enter escribe herdr:dev-server(w2:p2) en el prompt](./media/demo.gif)

- **Tres columnas enlazadas** — espacios, sus pestañas y los panes de las
  pestañas, siempre un único camino de izquierda a derecha.
- **Teclas rápidas** — `1`–`9` en la columna activa; dos pulsaciones alcanzan
  cualquier pane de la primera página.
- **Escribe para filtrar** — sin modo de búsqueda; empieza a escribir y la
  columna se reduce.
- **Confirma en cualquier nivel** — `Enter` sobre un espacio envía el espacio,
  sobre un pane envía el pane.
- **Empieza donde estás** — el cursor se abre en el espacio, la pestaña y el
  pane desde los que lo llamaste.
- **Tu formato** — `herdr:{name}({id})` por defecto; cambia la plantilla en una
  línea de configuración.

El selector solo lee la sesión a través del CLI de Herdr y escribe una cadena
en el pane que lo llamó. Nunca envía el prompt. Actuar sobre el id es tarea del
skill oficial de agente de Herdr (`herdr --skill`); este plugin solo genera el
puntero.

## Instalación

Requiere [Bun](https://bun.sh) en el `PATH`.

```sh
herdr plugin install navishachiku/herdr-target-picker
```

Asigna una tecla en `~/.config/herdr/config.toml` y recarga con
`prefix+shift+r`:

```toml
[[keys.command]]
key = "prefix+shift+p"
type = "plugin_action"
command = "herdr-target-picker.open"
description = "pick a herdr target"
```

`prefix` es `ctrl+b` salvo que lo hayas cambiado.

## Teclas

| Tecla | Acción |
| --- | --- |
| escribir | Filtra la columna actual; la primera coincidencia queda bajo el cursor |
| `↑` / `↓` | Mueve el cursor en la columna actual |
| `→` | Elegir: activa el elemento bajo el cursor y pasa a sus hijos |
| `1`–`9` | Igual que `→` para el elemento numerado; solo mientras no hay nada escrito |
| `←` | Vuelve a la columna padre |
| `PgUp` / `PgDn` | Cambia de página (9 elementos por página) |
| `Ctrl-U` | Borra la consulta |
| `Enter` | Escribe el elemento bajo el cursor en el pane que llamó y cierra |
| `Esc` | Borra la consulta; si ya está vacía, cierra |

Cada columna conserva su propia consulta. Las insignias numéricas aparecen en
la columna que las acepta, que es la columna a la derecha del último elemento
activado, y desaparecen mientras se escribe una consulta.

## Qué se escribe

Los elementos se muestran por nombre y se envían a través de la plantilla de
salida:

| Nivel | Nombre |
| --- | --- |
| Espacio | etiqueta del workspace |
| Pestaña | etiqueta de la pestaña |
| Pane | nombre del pane (`herdr pane rename`), si no `agent-name (kind)`, si no el tipo de agente, si no `shell` |

Con la plantilla por defecto, elegir el pane llamado `dev-server` en `w2`
escribe:

```
herdr:dev-server(w2:p2) 
```

El texto pasa por `herdr pane send-text` con un espacio final y no se envía,
así que sigues escribiendo. El prefijo `herdr:` es para humanos; el id entre
paréntesis es sobre lo que actúa un agente que tenga cargado el skill oficial
de Herdr. Sin ese skill, la cadena es solo texto.

## Configuración

La primera ejecución escribe `config.toml` en el directorio de configuración
del plugin (`herdr plugin config-dir herdr-target-picker`):

```toml
output_template = "herdr:{name}({id})"
```

| Token | Valor |
| --- | --- |
| `{name}` | el nombre de la tabla anterior |
| `{label}` | el texto mostrado en la columna, p. ej. `reviewer (codex)` |
| `{id}` | id de Herdr, p. ej. `w2:p2` |

## Desarrollo

```sh
git clone https://github.com/navishachiku/herdr-target-picker
herdr plugin link ./herdr-target-picker
bun test
```

El popup es `src/main.ts`; el estado del selector vive en `src/model.ts` y lo
cubre `src/model.test.ts`. Windows no está declarado en el manifiesto: el
manejo de teclas en modo raw no se ha probado bajo ConPTY.

## Licencia

[MIT](../LICENSE)

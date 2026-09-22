# herdr-pinpoint

[![License](https://img.shields.io/badge/license-MIT-blue)](../LICENSE)
![Herdr 0.9+](https://img.shields.io/badge/herdr-0.9%2B-8a2be2)
![Platforms](https://img.shields.io/badge/platforms-macOS%20%E2%80%A2%20Linux%20%E2%80%A2%20Windows%20(preview)-informational)
![Runtime](https://img.shields.io/badge/runtime-Node%2018%2B-5fa04e)

<p align="center">
  <a href="#instalación">instalación</a> · <a href="#teclas">teclas</a> · <a href="#qué-se-escribe">qué se escribe</a> · <a href="#configuración">configuración</a>
</p>

Chatear entre panes en Herdr está genial, pero ¿a que se te hace eterno
describir el objetivo? Sobre todo cuando está en otro Space.

Los objetivos vagos cuestan dos veces: tus tokens para describirlos y los del
agente para ir a buscarlos. Este popup acaba con ambos.

> Tres segundos es todo lo que necesitas para nombrar el objetivo, más rápido
> que escribir su descripción.

![El selector se abre sobre un pane de agente, una tecla rápida y un filtro escrito lo reducen a dev-server, y Enter escribe herdr:dev-server(w2:p2) en el prompt](./media/demo.gif)

- **Tres columnas enlazadas** — espacios, sus pestañas y los panes de las
  pestañas, siempre un único camino de izquierda a derecha.
- **Teclas rápidas** — `1`–`9` en la columna activa; dos pulsaciones alcanzan
  cualquier pane de la primera página.
- **Busca en todo el árbol** — `/` compara con toda la ruta `space / tab /
  pane` y resalta lo encontrado.
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

Requiere Node 18 o más reciente.

```sh
herdr plugin install navishachiku/herdr-pinpoint
```

Asigna una tecla en `~/.config/herdr/config.toml` y recarga con
`prefix+shift+r`:

```toml
[[keys.command]]
key = "prefix+shift+p"
type = "plugin_action"
command = "herdr-pinpoint.open"
description = "pick a herdr target"
```

`prefix` es `ctrl+b` salvo que lo hayas cambiado.

## Teclas

Recorriendo las tres columnas:

| Tecla | Acción |
| --- | --- |
| `↑` / `↓` | Mueve el cursor dentro de la columna actual |
| `→` o `1`–`9` | Elige ese elemento y pasa a sus hijos |
| `←` | Vuelve a la columna anterior |
| `PgUp` / `PgDn` | Cambia de página (9 por página) |
| `/` | Buscar |
| `Enter` | Escribe el elemento bajo el cursor en el pane que la abrió y cierra |
| `Esc` | Cierra |

Al buscar, las columnas se sustituyen por una única lista de coincidencias:

| Tecla | Acción |
| --- | --- |
| escribir | Compara con toda la ruta `space / tab / pane`; la coincidencia se resalta |
| `↓` / `↑` | Va al primer / último resultado; desde el primero, `↑` vuelve al cuadro |
| `1`–`9` | Selecciona ese resultado una vez fuera del cuadro |
| `Enter` | Sale del cuadro conservando los resultados; sobre un resultado, lo envía |
| `Ctrl-U` | Vacía la consulta |
| `Esc` | Descarta la consulta y vuelve a las columnas |

Mientras se escribe no hay nada seleccionado, así que ninguna fila parece lista para enviarse. Borrar hasta dejarla vacía mantiene la búsqueda; otro borrado sale de ella.

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
del plugin (`herdr plugin config-dir herdr-pinpoint`):

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
git clone https://github.com/navishachiku/herdr-pinpoint
herdr plugin link ./herdr-pinpoint
npm test
```

El popup es `src/main.mjs`; el estado del selector vive en `src/model.mjs` y lo
cubre `src/model.test.mjs`. JavaScript puro, sin paso de build.

## Windows

El soporte de Windows está en preview. Reporta cualquier cosa que falle.

## Licencia

[MIT](../LICENSE)

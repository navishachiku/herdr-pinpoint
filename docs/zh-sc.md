# herdr-pinpoint

[![License](https://img.shields.io/badge/license-MIT-blue)](../LICENSE)
![Herdr 0.9+](https://img.shields.io/badge/herdr-0.9%2B-8a2be2)
![Platforms](https://img.shields.io/badge/platforms-macOS%20%E2%80%A2%20Linux%20%E2%80%A2%20Windows%20(preview)-informational)
![Runtime](https://img.shields.io/badge/runtime-Node%2018%2B-5fa04e)

<p align="center">
  <a href="#安装">安装</a> · <a href="#按键">按键</a> · <a href="#输出的内容">输出的内容</a> · <a href="#配置">配置</a>
</p>

Herdr 跨窗口聊天很牛，但你是不是也觉得描述目标挺费劲的？尤其是目标在另一个 Space 里的时候。

模糊的目标有两次成本：你描述它花 token，agent 去找它又花 token。这个弹窗把两笔都省掉。

> 只需三秒指名对话目标，比你打完它的描述还快。

![选择器在 agent pane 上打开，快捷键加输入筛选缩到 dev-server，Enter 把 herdr:dev-server(w2:p2) 打进 prompt](./media/demo.gif)

- **三列联动** — 工作区、其下的 tab、tab 的 pane，永远是从左到右的一条路径。
- **快捷键** — 当前列上的 `1`–`9`；两个按键就能到第一页的任一 pane。
- **输入即筛选** — 没有搜索模式；开始打字，该列就缩小。
- **任一层级皆可确认** — 在工作区按 `Enter` 发送工作区，在 pane 按则发送 pane。
- **从你所在处开始** — 光标落在调用它时所在的工作区、tab 与 pane。
- **格式由你定** — 默认 `herdr:{name}({id})`；改一行配置就能换模板。

选择器只通过 Herdr CLI 读取 session，并把一段字符串打进调用它的 pane。它从不提交 prompt。对 id 采取行动是 Herdr 官方 agent skill（`herdr --skill`）的工作；本插件只负责生成指针。

## 安装

需要 Node 18 或更新版本。

```sh
herdr plugin install navishachiku/herdr-pinpoint
```

在 `~/.config/herdr/config.toml` 绑一个按键，然后用 `prefix+shift+r` 重新加载：

```toml
[[keys.command]]
key = "prefix+shift+p"
type = "plugin_action"
command = "herdr-pinpoint.open"
description = "pick a herdr target"
```

`prefix` 未更改的话是 `ctrl+b`。

## 按键

| 按键 | 动作 |
| --- | --- |
| 打字 | 筛选当前列；第一个匹配项会被光标选中 |
| `↑` / `↓` | 在当前列移动光标 |
| `→` | 选择：激活光标所在项并进入其子项 |
| `1`–`9` | 对编号项执行同 `→` 的动作；仅在尚未输入时有效 |
| `←` | 回到上一列 |
| `PgUp` / `PgDn` | 切换页面（每页 9 项） |
| `Ctrl-U` | 清除查询 |
| `Enter` | 把光标所在项打进调用的 pane 并关闭 |
| `Esc` | 清除查询；已为空时则关闭 |

每一列各自保有查询字符串。数字标记出现在接受它们的那一列，也就是最后激活项右侧的那一列，输入查询时会隐藏。

## 输出的内容

项目以名称显示，并经由输出模板发送：

| 层级 | 名称 |
| --- | --- |
| 工作区 | 工作区标签 |
| Tab | tab 标签 |
| Pane | pane 名称（`herdr pane rename`），否则 `agent-name (kind)`，否则 agent 类型，否则 `shell` |

使用默认模板时，选择 `w2` 里名为 `dev-server` 的 pane 会打出：

```
herdr:dev-server(w2:p2) 
```

插件是用 `herdr pane send-text` 把这段字符串打进 pane 的：末尾多一个空格、不带换行，所以 prompt 不会被提交，你可以接着打字。`herdr:` 前缀是给人看的；括号里的 id 是加载了 Herdr 官方 skill 的 agent 会据以行动的东西。没有那个 skill，这段字符串就只是文本。

## 配置

首次运行会把 `config.toml` 写到插件配置目录（`herdr plugin config-dir herdr-pinpoint`）：

```toml
output_template = "herdr:{name}({id})"
```

| 占位符 | 值 |
| --- | --- |
| `{name}` | 上表中的名称 |
| `{label}` | 列中显示的文字，例如 `reviewer (codex)` |
| `{id}` | Herdr id，例如 `w2:p2` |

## 开发

```sh
git clone https://github.com/navishachiku/herdr-pinpoint
herdr plugin link ./herdr-pinpoint
npm test
```

弹窗在 `src/main.mjs`；选择器状态在 `src/model.mjs`，由 `src/model.test.mjs` 覆盖。纯 JavaScript，没有构建步骤。

## Windows

Windows 支持处于 preview。遇到异常请回报。

## 许可证

[MIT](../LICENSE)

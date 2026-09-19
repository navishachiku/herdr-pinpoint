# herdr-target-picker

[![License](https://img.shields.io/badge/license-MIT-blue)](../LICENSE)
![Herdr 0.9+](https://img.shields.io/badge/herdr-0.9%2B-8a2be2)
![Platforms](https://img.shields.io/badge/platforms-macOS%20%E2%80%A2%20Linux-informational)
![Runtime](https://img.shields.io/badge/runtime-Bun-f9f1e1)

<p align="center">
  <a href="#安裝">安裝</a> · <a href="#按鍵">按鍵</a> · <a href="#輸出的內容">輸出的內容</a> · <a href="#設定">設定</a>
</p>

Herdr 的跨窗交談很讚，但你是否也覺得描述目標很花時間，尤其是跨 Space 的目標？

模糊的目標有兩次成本：你描述它花 token，agent 去找它又花 token。這個彈出視窗把兩筆都省掉。選定 pane，它的 Herdr id 就落進 prompt，agent 只對那一個動手。

> 三個按鍵，三秒鐘。開啟、方向鍵、Enter，正確的 pane 已經在 prompt 裡，比你打完它的描述還快。

![選擇器在 agent pane 上開啟，快捷鍵加輸入篩選縮到 dev-server，Enter 把 herdr:dev-server(w2:p2) 打進 prompt](./media/demo.gif)

- **三欄連動** — 工作區、其下的 tab、tab 的 pane，永遠是由左到右的一條路徑。
- **快捷鍵** — 作用欄上的 `1`–`9`；兩個按鍵就能到第一頁的任一 pane。
- **輸入即篩選** — 沒有搜尋模式；開始打字，該欄就縮小。
- **任一層級皆可確認** — 在工作區按 `Enter` 送出工作區，在 pane 按則送出 pane。
- **從你所在處開始** — 游標落在呼叫它時所在的工作區、tab 與 pane。
- **格式由你定** — 預設 `herdr:{name}({id})`；改一行設定就能換樣板。

選擇器只透過 Herdr CLI 讀取 session，並把一段字串打進呼叫它的 pane。它從不送出 prompt。對 id 採取行動是 Herdr 官方 agent skill（`herdr --skill`）的工作；本插件只負責產生指標。

## 安裝

需要 `PATH` 上有 [Bun](https://bun.sh)。

```sh
herdr plugin install navishachiku/herdr-target-picker
```

在 `~/.config/herdr/config.toml` 綁一個按鍵，然後以 `prefix+shift+r` 重新載入：

```toml
[[keys.command]]
key = "prefix+shift+p"
type = "plugin_action"
command = "herdr-target-picker.open"
description = "pick a herdr target"
```

`prefix` 未更改的話是 `ctrl+b`。

## 按鍵

| 按鍵 | 動作 |
| --- | --- |
| 打字 | 篩選目前的欄；第一個符合項會被游標選中 |
| `↑` / `↓` | 在目前的欄移動游標 |
| `→` | 選擇：啟用游標所在項並進入其子項 |
| `1`–`9` | 對編號項執行同 `→` 的動作；僅在尚未輸入時有效 |
| `←` | 回到上一欄 |
| `PgUp` / `PgDn` | 切換頁面（每頁 9 項） |
| `Ctrl-U` | 清除查詢 |
| `Enter` | 把游標所在項打進呼叫的 pane 並關閉 |
| `Esc` | 清除查詢；已為空時則關閉 |

每一欄各自保有查詢字串。數字標記出現在接受它們的那一欄，也就是最後啟用項右側的那一欄，輸入查詢時會隱藏。

## 輸出的內容

項目以名稱顯示，並經由輸出樣板送出：

| 層級 | 名稱 |
| --- | --- |
| 工作區 | 工作區標籤 |
| Tab | tab 標籤 |
| Pane | pane 名稱（`herdr pane rename`），否則 `agent-name (kind)`，否則 agent 種類，否則 `shell` |

使用預設樣板時，選擇 `w2` 裡名為 `dev-server` 的 pane 會打出：

```
herdr:dev-server(w2:p2) 
```

插件是用 `herdr pane send-text` 把這段字串打進 pane 的：尾端多一個空白、不帶換行，所以 prompt 不會被送出，你可以接著打字。`herdr:` 前綴是給人看的；括號裡的 id 是載入了 Herdr 官方 skill 的 agent 會據以行動的東西。沒有那個 skill，這段字串就只是文字。

## 設定

首次執行會把 `config.toml` 寫到插件設定目錄（`herdr plugin config-dir herdr-target-picker`）：

```toml
output_template = "herdr:{name}({id})"
```

| 代號 | 值 |
| --- | --- |
| `{name}` | 上表中的名稱 |
| `{label}` | 欄中顯示的文字，例如 `reviewer (codex)` |
| `{id}` | Herdr id，例如 `w2:p2` |

## 開發

```sh
git clone https://github.com/navishachiku/herdr-target-picker
herdr plugin link ./herdr-target-picker
bun test
```

彈出視窗在 `src/main.ts`；選擇器狀態在 `src/model.ts`，由 `src/model.test.ts` 覆蓋。manifest 未宣告 Windows：raw-mode 按鍵處理尚未在 ConPTY 下測試過。

## 授權

[MIT](../LICENSE)

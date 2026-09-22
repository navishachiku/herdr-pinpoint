# herdr-pinpoint

[![License](https://img.shields.io/badge/license-MIT-blue)](../LICENSE)
![Herdr 0.9+](https://img.shields.io/badge/herdr-0.9%2B-8a2be2)
![Platforms](https://img.shields.io/badge/platforms-macOS%20%E2%80%A2%20Linux%20%E2%80%A2%20Windows%20(preview)-informational)
![Runtime](https://img.shields.io/badge/runtime-Node%2018%2B-5fa04e)

<p align="center">
  <a href="#安裝">安裝</a> · <a href="#按鍵">按鍵</a> · <a href="#輸出的內容">輸出的內容</a> · <a href="#設定">設定</a>
</p>

Herdr 的跨窗交談很讚，但你是否也覺得描述目標很花時間，尤其是跨 Space 的目標？

模糊的目標有兩次成本：你描述它花 token，agent 去找它又花 token。這個彈出視窗把兩筆都省掉。

> 只需三秒指名對話目標，比你打完它的描述還快。

![選擇器在 agent pane 上開啟，快捷鍵加輸入篩選縮到 dev-server，Enter 把 herdr:dev-server(w2:p2) 打進 prompt](./media/demo.gif)

- **三欄連動** — 工作區、其下的 tab、tab 的 pane，永遠是由左到右的一條路徑。
- **快捷鍵** — 作用欄上的 `1`–`9`；兩個按鍵就能到第一頁的任一 pane。
- **搜尋整棵樹** — `/` 比對完整的 `space / tab / pane` 路徑，並把命中的字高亮。
- **任一層級皆可確認** — 在工作區按 `Enter` 送出工作區，在 pane 按則送出 pane。
- **從你所在處開始** — 游標落在呼叫它時所在的工作區、tab 與 pane。
- **格式由你定** — 預設 `herdr:{name}({id})`；改一行設定就能換樣板。

選擇器只透過 Herdr CLI 讀取 session，並把一段字串打進呼叫它的 pane。它從不送出 prompt。對 id 採取行動是 Herdr 官方 agent skill（`herdr --skill`）的工作；本插件只負責產生指標。

## 安裝

需要 Node 18 或更新版本。

```sh
herdr plugin install navishachiku/herdr-pinpoint
```

在 `~/.config/herdr/config.toml` 綁一個按鍵，然後以 `prefix+shift+r` 重新載入：

```toml
[[keys.command]]
key = "prefix+shift+p"
type = "plugin_action"
command = "herdr-pinpoint.open"
description = "pick a herdr target"
```

`prefix` 未更改的話是 `ctrl+b`。

## 按鍵

瀏覽三欄時：

| 按鍵 | 動作 |
| --- | --- |
| `↑` / `↓` | 在當前欄移動游標 |
| `→` 或 `1`–`9` | 選定該項並進入它的子項 |
| `←` | 回到上一欄 |
| `PgUp` / `PgDn` | 換頁（每頁 9 筆） |
| `/` | 搜尋 |
| `Enter` | 把游標所在項目打進呼叫它的 pane 並關閉 |
| `Esc` | 關閉 |

搜尋時，三欄會換成一份命中清單：

| 按鍵 | 動作 |
| --- | --- |
| 打字 | 比對整條 `space / tab / pane` 路徑，命中的字會高亮 |
| `↓` / `↑` | 移到第一筆／最後一筆；在第一筆再按 `↑` 回到輸入框 |
| `1`–`9` | 離開輸入框後，直接選取該筆 |
| `Enter` | 離開輸入框並保留結果；已在結果上則送出 |
| `Ctrl-U` | 清空查詢 |
| `Esc` | 放棄查詢，回到三欄 |

還在打字時不會有任何一筆被選取，所以不會有哪一列看起來可以送出。刪到空字串仍留在搜尋裡，再按一次退格才離開。

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

首次執行會把 `config.toml` 寫到插件設定目錄（`herdr plugin config-dir herdr-pinpoint`）：

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
git clone https://github.com/navishachiku/herdr-pinpoint
herdr plugin link ./herdr-pinpoint
npm test
```

彈出視窗在 `src/main.mjs`；選擇器狀態在 `src/model.mjs`，由 `src/model.test.mjs` 覆蓋。純 JavaScript，沒有建置步驟。

## Windows

Windows 支援處於 preview。遇到異常請回報。

## 授權

[MIT](../LICENSE)

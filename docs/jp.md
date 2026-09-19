# herdr-target-picker

[![License](https://img.shields.io/badge/license-MIT-blue)](../LICENSE)
![Herdr 0.9+](https://img.shields.io/badge/herdr-0.9%2B-8a2be2)
![Platforms](https://img.shields.io/badge/platforms-macOS%20%E2%80%A2%20Linux-informational)
![Runtime](https://img.shields.io/badge/runtime-Bun-f9f1e1)

<p align="center">
  <a href="#インストール">インストール</a> · <a href="#キー">キー</a> · <a href="#入力される内容">入力される内容</a> · <a href="#設定">設定</a>
</p>

あいまいなターゲットは二重にコストがかかります。あなたが説明するトークンと、agent が探しに行くトークンです。このポップアップはその両方をなくします。pane を選ぶと、その Herdr id がプロンプトに入り、agent はまさにその一つに対して動きます。

3 キー、3 秒。開く、矢印、Enter で、説明を打ち終わる前に正確な pane がプロンプトに入っています。

![ピッカーが agent pane の上に開き、ファストキーと入力フィルタで dev-server に絞り込まれ、Enter で herdr:dev-server(w2:p2) がプロンプトに入力される](./media/demo.gif)

- **連動する 3 カラム** — ワークスペース、そのタブ、タブの pane。常に左から右への一本の経路です。
- **ファストキー** — アクティブなカラムで `1`–`9`。2 キーで最初のページのどの pane にも届きます。
- **入力で絞り込み** — 検索モードはありません。打ち始めればカラムが絞られます。
- **どの階層でも確定** — ワークスペースで `Enter` ならワークスペースを、pane なら pane を送ります。
- **今いる場所から開始** — 呼び出したワークスペース、タブ、pane にホバーが置かれます。
- **好みの形式** — 既定は `herdr:{name}({id})`。設定 1 行でテンプレートを変えられます。

ピッカーは Herdr CLI 経由でセッションを読み取り、呼び出し元の pane に文字列を 1 つ入力するだけです。プロンプトを送信することはありません。id に対して動くのは Herdr 公式の agent skill（`herdr --skill`）の仕事で、このプラグインはポインタを生成するだけです。

## インストール

`PATH` 上に [Bun](https://bun.sh) が必要です。

```sh
herdr plugin install navishachiku/herdr-target-picker
```

`~/.config/herdr/config.toml` にキーを割り当て、`prefix+shift+r` で再読み込みします。

```toml
[[keys.command]]
key = "prefix+shift+p"
type = "plugin_action"
command = "herdr-target-picker.open"
description = "pick a herdr target"
```

`prefix` は変更していなければ `ctrl+b` です。

## キー

| キー | 動作 |
| --- | --- |
| 文字入力 | 現在のカラムを絞り込む。最初の一致にホバーが移る |
| `↑` / `↓` | 現在のカラム内でホバーを移動 |
| `→` | 選択：ホバー中の項目を有効化し、その子へ移動 |
| `1`–`9` | 番号付き項目に対して `→` と同じ。何も入力していないときのみ |
| `←` | 親カラムへ戻る |
| `PgUp` / `PgDn` | ページ切り替え（1 ページ 9 項目） |
| `Ctrl-U` | クエリを消去 |
| `Enter` | ホバー中の項目を呼び出し元の pane に入力して閉じる |
| `Esc` | クエリを消去。すでに空なら閉じる |

各カラムは自分のクエリを保持します。番号バッジは番号を受け付けるカラム、つまり最後に有効化した項目の右隣のカラムに表示され、クエリ入力中は消えます。

## 入力される内容

項目は名前で表示され、出力テンプレートを通して送られます。

| 階層 | 名前 |
| --- | --- |
| ワークスペース | ワークスペースのラベル |
| タブ | タブのラベル |
| pane | pane 名（`herdr pane rename`）、なければ `agent-name (kind)`、なければ agent の種類、なければ `shell` |

既定のテンプレートで `w2` にある `dev-server` という pane を選ぶと、次が入力されます。

```
herdr:dev-server(w2:p2) 
```

この文字列は `herdr pane send-text` で末尾に空白 1 つを付けて送られ、送信はされないので、続けて入力できます。`herdr:` 接頭辞は人間向けです。括弧内の id は、Herdr 公式 skill を読み込んだ agent が動作の対象にするものです。その skill がなければ、この文字列はただのテキストです。

## 設定

初回実行時にプラグイン設定ディレクトリ（`herdr plugin config-dir herdr-target-picker`）へ `config.toml` が書き出されます。

```toml
output_template = "herdr:{name}({id})"
```

| トークン | 値 |
| --- | --- |
| `{name}` | 上の表の名前 |
| `{label}` | カラムに表示される文字列。例：`reviewer (codex)` |
| `{id}` | Herdr id。例：`w2:p2` |

## 開発

```sh
git clone https://github.com/navishachiku/herdr-target-picker
herdr plugin link ./herdr-target-picker
bun test
```

ポップアップは `src/main.ts`、ピッカーの状態は `src/model.ts` にあり、`src/model.test.ts` でカバーされています。manifest に Windows は宣言していません。raw モードのキー処理を ConPTY で検証していないためです。

## ライセンス

[MIT](../LICENSE)

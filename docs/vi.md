# herdr-target-picker

[![License](https://img.shields.io/badge/license-MIT-blue)](../LICENSE)
![Herdr 0.9+](https://img.shields.io/badge/herdr-0.9%2B-8a2be2)
![Platforms](https://img.shields.io/badge/platforms-macOS%20%E2%80%A2%20Linux%20%E2%80%A2%20Windows%20(preview)-informational)
![Runtime](https://img.shields.io/badge/runtime-Node%2018%2B-5fa04e)

<p align="center">
  <a href="#cài-đặt">cài đặt</a> · <a href="#phím">phím</a> · <a href="#nội-dung-được-gõ">nội dung được gõ</a> · <a href="#cấu-hình">cấu hình</a>
</p>

Chat xuyên pane trong Herdr thì quá đã, nhưng bạn có thấy mô tả mục tiêu tốn
thời gian kinh khủng không? Nhất là khi nó nằm ở Space khác.

Mục tiêu mơ hồ tốn kém hai lần: token của bạn để mô tả nó, và token của
agent để đi tìm nó. Popup này chấm dứt cả hai. Chọn pane, id Herdr của nó
rơi vào prompt, và agent thao tác chính xác trên pane đó.

> Ba phím, ba giây. Mở, mũi tên, Enter, và đúng pane đã nằm trong prompt của
> bạn, trước khi bạn kịp gõ xong phần mô tả.

![Bộ chọn mở trên một pane agent, phím nhanh và bộ lọc gõ vào thu hẹp về dev-server, rồi Enter gõ herdr:dev-server(w2:p2) vào prompt](./media/demo.gif)

- **Ba cột liên kết** — không gian, các tab của nó, và các pane của tab, luôn
  là một đường đi từ trái sang phải.
- **Phím nhanh** — `1`–`9` trên cột đang hoạt động; hai lần nhấn là tới bất kỳ
  pane nào ở trang đầu.
- **Gõ để lọc** — không có chế độ tìm kiếm; bắt đầu gõ là cột thu hẹp lại.
- **Xác nhận ở bất kỳ cấp nào** — `Enter` trên không gian gửi không gian, trên
  pane gửi pane.
- **Bắt đầu từ chỗ bạn đang đứng** — con trỏ mở tại không gian, tab và pane mà
  bạn đã gọi nó.
- **Định dạng của bạn** — mặc định `herdr:{name}({id})`; đổi mẫu chỉ bằng một
  dòng cấu hình.

Bộ chọn chỉ đọc phiên qua Herdr CLI và gõ một chuỗi vào pane đã gọi nó. Nó
không bao giờ gửi prompt. Thao tác trên id là việc của skill agent chính thức
của Herdr (`herdr --skill`); plugin này chỉ tạo ra con trỏ.

## Cài đặt

Cần Node 18 trở lên trên `PATH`; không có dependency nào.

```sh
herdr plugin install navishachiku/herdr-target-picker
```

Gán một phím trong `~/.config/herdr/config.toml` và tải lại bằng
`prefix+shift+r`:

```toml
[[keys.command]]
key = "prefix+shift+p"
type = "plugin_action"
command = "herdr-target-picker.open"
description = "pick a herdr target"
```

`prefix` là `ctrl+b` trừ khi bạn đã đổi.

## Phím

| Phím | Hành động |
| --- | --- |
| gõ chữ | Lọc cột hiện tại; kết quả khớp đầu tiên được đặt con trỏ |
| `↑` / `↓` | Di chuyển con trỏ trong cột hiện tại |
| `→` | Chọn: kích hoạt mục dưới con trỏ và chuyển sang các mục con |
| `1`–`9` | Giống `→` cho mục được đánh số; chỉ khi chưa gõ gì |
| `←` | Quay lại cột cha |
| `PgUp` / `PgDn` | Chuyển trang (9 mục mỗi trang) |
| `Ctrl-U` | Xóa truy vấn |
| `Enter` | Gõ mục dưới con trỏ vào pane đã gọi và đóng |
| `Esc` | Xóa truy vấn; nếu đã trống thì đóng |

Mỗi cột giữ truy vấn riêng. Nhãn số xuất hiện trên cột nhận chúng, tức cột
bên phải mục được kích hoạt gần nhất, và biến mất trong lúc đang gõ truy vấn.

## Nội dung được gõ

Các mục hiển thị theo tên và được gửi qua mẫu đầu ra:

| Cấp | Tên |
| --- | --- |
| Không gian | nhãn workspace |
| Tab | nhãn tab |
| Pane | tên pane (`herdr pane rename`), nếu không thì `agent-name (kind)`, nếu không thì loại agent, nếu không thì `shell` |

Với mẫu mặc định, chọn pane tên `dev-server` trong `w2` sẽ gõ:

```
herdr:dev-server(w2:p2) 
```

Văn bản đi qua `herdr pane send-text` với một khoảng trắng ở cuối và không
được gửi, nên bạn gõ tiếp. Tiền tố `herdr:` dành cho con người; id trong
ngoặc là thứ mà agent đã nạp skill chính thức của Herdr sẽ thao tác. Không có
skill đó, chuỗi này chỉ là văn bản.

## Cấu hình

Lần chạy đầu ghi `config.toml` vào thư mục cấu hình của plugin
(`herdr plugin config-dir herdr-target-picker`):

```toml
output_template = "herdr:{name}({id})"
```

| Token | Giá trị |
| --- | --- |
| `{name}` | tên từ bảng trên |
| `{label}` | chữ hiển thị trong cột, ví dụ `reviewer (codex)` |
| `{id}` | id Herdr, ví dụ `w2:p2` |

## Phát triển

```sh
git clone https://github.com/navishachiku/herdr-target-picker
herdr plugin link ./herdr-target-picker
npm test
```

Popup là `src/main.mjs`; trạng thái bộ chọn nằm ở `src/model.mjs` và được
`src/model.test.mjs` bao phủ. JavaScript thuần, không có bước build.

## Windows

Đã khai báo trong manifest và chạy cùng một mã: không có gì trong plugin dành
riêng cho Unix, và đầu vào chế độ raw của Node trả về cùng các escape sequence
dưới ConPTY. Hỗ trợ plugin của chính Herdr trên Windows đang ở giai đoạn preview,
nên hãy xem ở đây cũng vậy và báo lại bất kỳ hành vi bất thường nào.

## Giấy phép

[MIT](../LICENSE)

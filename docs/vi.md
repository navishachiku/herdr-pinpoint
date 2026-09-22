# herdr-pinpoint

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
agent để đi tìm nó. Popup này chấm dứt cả hai.

> Chỉ cần ba giây để gọi tên mục tiêu, nhanh hơn gõ mô tả về nó.

![Bộ chọn mở trên một pane agent, phím nhanh và bộ lọc gõ vào thu hẹp về dev-server, rồi Enter gõ herdr:dev-server(w2:p2) vào prompt](./media/demo.gif)

- **Ba cột liên kết** — không gian, các tab của nó, và các pane của tab, luôn
  là một đường đi từ trái sang phải.
- **Phím nhanh** — `1`–`9` trên cột đang hoạt động; hai lần nhấn là tới bất kỳ
  pane nào ở trang đầu.
- **Tìm trong toàn bộ cây** — `/` so khớp toàn bộ đường dẫn `space / tab /
  pane` và tô sáng phần tìm thấy.
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

Cần Node 18 trở lên.

```sh
herdr plugin install navishachiku/herdr-pinpoint
```

Gán một phím trong `~/.config/herdr/config.toml` và tải lại bằng
`prefix+shift+r`:

```toml
[[keys.command]]
key = "prefix+shift+p"
type = "plugin_action"
command = "herdr-pinpoint.open"
description = "pick a herdr target"
```

`prefix` là `ctrl+b` trừ khi bạn đã đổi.

## Phím

Khi duyệt ba cột:

| Phím | Hành động |
| --- | --- |
| `↑` / `↓` | Di chuyển con trỏ trong cột hiện tại |
| `→` hoặc `1`–`9` | Chọn mục đó và sang các mục con của nó |
| `←` | Quay lại cột cha |
| `PgUp` / `PgDn` | Chuyển trang (9 mục mỗi trang) |
| `/` | Tìm kiếm |
| `Enter` | Gõ mục đang trỏ vào pane đã mở nó rồi đóng |
| `Esc` | Đóng |

Khi tìm kiếm, ba cột nhường chỗ cho một danh sách kết quả:

| Phím | Hành động |
| --- | --- |
| gõ chữ | So khớp toàn bộ đường dẫn `space / tab / pane`; phần khớp được tô sáng |
| `↓` / `↑` | Tới kết quả đầu / cuối; ở kết quả đầu, `↑` quay lại ô nhập |
| `1`–`9` | Chọn kết quả đó sau khi đã rời ô nhập |
| `Enter` | Rời ô nhập và giữ kết quả; đang ở một kết quả thì gửi nó |
| `Ctrl-U` | Xóa trống truy vấn |
| `Esc` | Bỏ truy vấn và trở về ba cột |

Trong lúc đang gõ không có gì được chọn, nên không dòng nào trông như sẵn sàng gửi. Xóa đến rỗng vẫn ở trong tìm kiếm; xóa thêm một lần nữa mới thoát.

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
(`herdr plugin config-dir herdr-pinpoint`):

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
git clone https://github.com/navishachiku/herdr-pinpoint
herdr plugin link ./herdr-pinpoint
npm test
```

Popup là `src/main.mjs`; trạng thái bộ chọn nằm ở `src/model.mjs` và được
`src/model.test.mjs` bao phủ. JavaScript thuần, không có bước build.

## Windows

Hỗ trợ Windows đang ở giai đoạn preview. Hãy báo lại bất kỳ hành vi bất thường nào.

## Giấy phép

[MIT](../LICENSE)

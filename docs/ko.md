# herdr-pinpoint

[![License](https://img.shields.io/badge/license-MIT-blue)](../LICENSE)
![Herdr 0.9+](https://img.shields.io/badge/herdr-0.9%2B-8a2be2)
![Platforms](https://img.shields.io/badge/platforms-macOS%20%E2%80%A2%20Linux%20%E2%80%A2%20Windows%20(preview)-informational)
![Runtime](https://img.shields.io/badge/runtime-Node%2018%2B-5fa04e)

<p align="center">
  <a href="#설치">설치</a> · <a href="#키">키</a> · <a href="#입력되는-내용">입력되는 내용</a> · <a href="#설정">설정</a>
</p>

Herdr에서 pane 넘나들며 대화하는 건 진짜 좋은데, 대상 설명하는 게 너무 번거롭다고 느낀 적 없나요? 특히 다른 Space에 있는 거라면요.

모호한 대상은 비용이 두 번 듭니다. 당신이 설명하는 토큰과 agent가 찾으러 가는 토큰입니다. 이 팝업은 둘 다 없앱니다. pane을 고르면 그 Herdr id가 프롬프트에 들어가고, agent는 정확히 그 하나에 대해 동작합니다.

> 키 세 번, 3초. 열기, 방향키, Enter. 설명을 다 치기도 전에 정확한 pane이 프롬프트에 들어 있습니다.

![agent pane 위에 피커가 열리고, 빠른 키와 입력 필터로 dev-server로 좁혀진 뒤, Enter로 herdr:dev-server(w2:p2)가 프롬프트에 입력된다](./media/demo.gif)

- **연결된 세 열** — 워크스페이스, 그 탭, 탭의 pane. 항상 왼쪽에서 오른쪽으로 이어지는 한 경로입니다.
- **빠른 키** — 활성 열에서 `1`–`9`. 키 두 번이면 첫 페이지의 어느 pane에도 닿습니다.
- **입력하면 필터** — 검색 모드가 없습니다. 타이핑을 시작하면 열이 좁혀집니다.
- **어느 단계에서든 확정** — 워크스페이스에서 `Enter`면 워크스페이스를, pane에서면 pane을 보냅니다.
- **지금 있는 곳에서 시작** — 호출한 워크스페이스, 탭, pane에 커서가 놓입니다.
- **원하는 형식** — 기본값은 `herdr:{name}({id})`. 설정 한 줄로 템플릿을 바꿉니다.

피커는 Herdr CLI로 세션을 읽고 호출한 pane에 문자열 하나를 입력할 뿐입니다. 프롬프트를 제출하지 않습니다. id에 대해 동작하는 것은 Herdr 공식 agent skill(`herdr --skill`)의 일이며, 이 플러그인은 포인터만 생성합니다.

## 설치

Node 18 이상이 필요합니다.

```sh
herdr plugin install navishachiku/herdr-pinpoint
```

`~/.config/herdr/config.toml`에 키를 바인딩하고 `prefix+shift+r`로 다시 불러옵니다.

```toml
[[keys.command]]
key = "prefix+shift+p"
type = "plugin_action"
command = "herdr-pinpoint.open"
description = "pick a herdr target"
```

`prefix`는 바꾸지 않았다면 `ctrl+b`입니다.

## 키

| 키 | 동작 |
| --- | --- |
| 문자 입력 | 현재 열을 필터링. 첫 일치 항목에 커서가 놓임 |
| `↑` / `↓` | 현재 열에서 커서 이동 |
| `→` | 선택: 커서 항목을 활성화하고 그 하위로 이동 |
| `1`–`9` | 번호 항목에 대해 `→`와 동일. 아무것도 입력하지 않은 동안만 |
| `←` | 상위 열로 돌아가기 |
| `PgUp` / `PgDn` | 페이지 전환(페이지당 9개) |
| `Ctrl-U` | 검색어 지우기 |
| `Enter` | 커서 항목을 호출한 pane에 입력하고 닫기 |
| `Esc` | 검색어 지우기. 이미 비어 있으면 닫기 |

각 열은 자기 검색어를 따로 유지합니다. 번호 배지는 번호를 받는 열, 즉 마지막으로 활성화한 항목 오른쪽 열에 나타나며, 검색어를 입력하는 동안에는 사라집니다.

## 입력되는 내용

항목은 이름으로 표시되고 출력 템플릿을 거쳐 전송됩니다.

| 단계 | 이름 |
| --- | --- |
| 워크스페이스 | 워크스페이스 라벨 |
| 탭 | 탭 라벨 |
| pane | pane 이름(`herdr pane rename`), 없으면 `agent-name (kind)`, 없으면 agent 종류, 없으면 `shell` |

기본 템플릿으로 `w2`의 `dev-server` pane을 고르면 다음이 입력됩니다.

```
herdr:dev-server(w2:p2) 
```

이 문자열은 `herdr pane send-text`로 끝에 공백 하나를 붙여 전송되며 제출되지 않으므로 이어서 입력할 수 있습니다. `herdr:` 접두사는 사람을 위한 것이고, 괄호 안의 id는 Herdr 공식 skill을 불러온 agent가 동작 대상으로 삼는 값입니다. 그 skill이 없으면 이 문자열은 그냥 텍스트입니다.

## 설정

첫 실행 시 플러그인 설정 디렉터리(`herdr plugin config-dir herdr-pinpoint`)에 `config.toml`이 생성됩니다.

```toml
output_template = "herdr:{name}({id})"
```

| 토큰 | 값 |
| --- | --- |
| `{name}` | 위 표의 이름 |
| `{label}` | 열에 표시되는 문자열. 예: `reviewer (codex)` |
| `{id}` | Herdr id. 예: `w2:p2` |

## 개발

```sh
git clone https://github.com/navishachiku/herdr-pinpoint
herdr plugin link ./herdr-pinpoint
npm test
```

팝업은 `src/main.mjs`, 피커 상태는 `src/model.mjs`에 있으며 `src/model.test.mjs`가 다룹니다. 순수 JavaScript이며 빌드 단계가 없습니다.

## Windows

Windows 지원은 프리뷰 단계입니다. 이상한 동작은 제보해 주세요.

## 라이선스

[MIT](../LICENSE)

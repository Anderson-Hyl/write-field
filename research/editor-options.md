# 编辑器内核取证（2026-09-16）

约束：源码模式 markdown、手写 LaTeX、中文 IME、iPadOS + macOS、App Store、不用我们自己写 AppKit 文本栈。

## 结论

**第一候选：把 CodeMirror 6（MIT）打进包里，用 `WKWebView` 加载。** 预览用 KaTeX（MIT），不在源码流里即时渲染公式。

原生 TextKit / SwiftUI `TextEditor` 这条路在 2026 年仍然没有数学排版 API（见 `research/apple-swiftui-math.md`）。Runestone 是认真的 iOS 源码编辑器，但对「原生 Mac + 不用 AppKit」不成立。

## 候选对照

| 内核 | 平台现实 | IME / 长文 | LaTeX | 和「不用 AppKit」 |
| --- | --- | --- | --- | --- |
| **CodeMirror 6 in WKWebView** | iPad / Mac 同一套 WebKit | 源码模式；WebKit 上的 composition 必须 spike | 源码里写 `$...$`，预览另开 KaTeX | 我们的代码只碰 WebKit。Mac 底下是 NSView，但那是系统，不是我们写的 AppKit 编辑器 |
| **Runestone**（simonbs，~3.2k star，MIT） | **iOS 为主**。README 写明 Catalyst「不算做完」。Mac 分支（AppKit）2023 年起就没做成主线 | 真 UITextView 系，IME 更稳 | 无数学排版；仍要外挂预览 | 原生 Mac 要 AppKit 移植或走 Catalyst，两条都和当前平台决定冲突 |
| **STTextView / CodeEditSourceEditor** | 偏 AppKit / TextKit 2 | 长文编辑器圈对其评价两极（TextKit 2 文档编辑仍不稳，见 2025 年行业讨论） | 无 | 直接违反「不用 AppKit」 |
| **SwiftUI `TextEditor` / `AttributedString`** | 双平台 | 无 markdown 高亮、无行号、无 gutter | **无 math intent**（Apple 文档取证） | 栈最干净，能力不够 |
| **Monaco / Ace** | 为 VS Code / 桌面浏览器设计 | iOS 键盘和 IME 更差 | 同样要外挂 | 比 CodeMirror 重，没有收益 |

## App Store 与打包 JS

- Review Guideline **2.5.2** 禁的是**下载并执行会改变功能的代码**。包内自带的 CodeMirror / KaTeX 是资源，不是下载代码。
- **4.7** 连「不嵌在二进制里的 HTML/JS 小程序」都允许，包内更干净。
- **2.5.6** iPad 上浏览网页必须用 WebKit。我们本来就用 `WKWebView`，不申请 alternative browser engine（那条 entitlement 仅限 EU/日本默认浏览器，写作 app 拿不到）。
- Electron / Tauri / 自带 Chromium：**iPadOS 无目标，且 2.5.6 直接排除。**

加载方式建议用自定义 scheme（`WKURLSchemeHandler`，例如 `writefield://editor/`），不要依赖 `file://` 的跨源限制。

## IME 风险（必须 spike，不能用文档消掉）

已知、且与 WebKit/CodeMirror 相关的问题：

- CodeMirror 6 早期 iOS IME + 折行会死锁（[codemirror/dev#502](https://github.com/codemirror/dev/issues/502)，2021，已关）。2026 年 WebKit 是否还中，**未验证**。
- 2026-05 CodeMirror 论坛：Windows 上中文标点隔一次丢失；marijnh 标成 **Chrome bug**。与 WebKit 无关，但说明 composition 仍是高风险面。
- WKWebView 对某些 IME 不走标准 `composition*`，而走 `insertReplacementText`（xterm.js 2026 年韩文修复）。中文是否同路径，**未验证**。

产品约束「marked text 不算内容、不落盘」必须在桥上实现：`compositionstart` → 禁止 save；`compositionend` 之后才允许。

## 预览

源码模式已定，公式「靠预览」。没有 Apple 原生数学 API，预览只能是：

1. 包内 KaTeX，第二块 `WKWebView` 或同一页分栏；
2. 或原生 `SwiftMath` / `iosMath` 画图。

原型可以先不做预览。验证写作现场不依赖公式渲染。

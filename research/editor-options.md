# 编辑器内核取证（2026-09-16，2026-09-17 复评）

约束：源码模式 markdown、手写 LaTeX、中文 IME、iPadOS + macOS、App Store、不用我们自己写 AppKit 文本栈。正中一张纸，纵向滚；周围是临时内容，不是编辑器内核的事。

## 结论

**第一候选仍然是：把 CodeMirror 6（MIT）打进包里，用 `WKWebView` 加载。** 预览用 KaTeX（MIT），不在源码流里即时渲染公式。

形态从无限画布改成 Pages 式白纸之后，这条**更顺**：纸就是一块 WKWebView，没有「编辑器当缩放节点」的缝。不要换成 Milkdown / TipTap / MarkupEditor——那些是 `contentEditable` 富文本，产品要的是源码模式，而且中文 IME 在 contentEditable 上比文本引擎更差。

原生 TextKit / SwiftUI `TextEditor` 在 2026 年仍然没有数学排版 API（见 `research/apple-swiftui-math.md`）。Runestone 是认真的 iOS 源码编辑器，但对「原生 Mac + 不用 AppKit」仍然不成立。

## 候选对照

| 内核 | 平台现实 | IME / 长文 | LaTeX | 和「不用 AppKit」 |
| --- | --- | --- | --- | --- |
| **CodeMirror 6 in WKWebView** | iPad / Mac 同一套 WebKit | 源码模式；WebKit 上的 composition 必须 spike | 源码里写 `$...$`，预览另开 KaTeX | 我们的代码只碰 WebKit。Mac 底下是 NSView，但那是系统，不是我们写的 AppKit 编辑器 |
| **Runestone**（simonbs，~3.2k star，MIT） | **iOS 为主**。README 写明 Catalyst「不算做完」。Mac 分支（AppKit）2023 年起就没做成主线 | 真 UITextView 系，IME 更稳 | 无数学排版；仍要外挂预览 | 原生 Mac 要 AppKit 移植或走 Catalyst，两条都和当前平台决定冲突 |
| **STTextView / CodeEditSourceEditor** | 偏 AppKit / TextKit 2 | 长文编辑器圈对其评价两极（TextKit 2 文档编辑仍不稳，见 2025 年行业讨论） | 无 | 直接违反「不用 AppKit」 |
| **SwiftUI `TextEditor` / `AttributedString`** | 双平台 | 无 markdown 高亮、无行号、无 gutter | **无 math intent**（Apple 文档取证） | 栈最干净，能力不够 |
| **Monaco / Ace** | 为 VS Code / 桌面浏览器设计 | iOS 键盘和 IME 更差 | 同样要外挂 | 比 CodeMirror 重，没有收益 |
| **Milkdown / TipTap / ProseMirror / MarkupEditor** | 都能塞进 WKWebView；MarkupEditor 甚至有 SwiftUI 壳 | **contentEditable**。2026 年 CJK IME 在 contentEditable 上仍有吃字、标点要按两下（WebView2 #5625；CKEditor iOS 韩文 #19648） | 公式当节点，不是 `$...$` 源码 | WYSIWYG。产品【已定】源码模式，且不接 Writing Tools 改正文 |
| **textarea / OverType 一类** | 双平台 WebKit | IME 最接近系统输入框 | 无 | 没有语法高亮、没有稳定的 `docOffset` 桥；纸侧边起手做不好 |

选的是**内核**，不是「一个 markdown 编辑器产品」。EasyMDE / HyperMD / StackEdit 都是 CM 外壳，带上一堆预览和工具栏，这里用不上。纸上只要：`@codemirror/view` + `@codemirror/state` + `@codemirror/lang-markdown` + 我们的桥。

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

## 2026-09-17 复评（形态已是正中一张纸）

独立旁证：2026-06 的 [PL Markdown](https://pensierolaterale.tech/en/blog/plmarkdown-architettura-ibrida/) 在 SwiftUI + iOS/macOS 上做了同一选择——CodeMirror 6 进 WKWebView，壳是 SwiftUI，CSP `default-src 'none'`，不走本地服务器。他们要 Live Preview；我们只要源码。内核可以同，预览层不要抄。

CodeMirror 6 在 2026-09 仍在修 IME（`@codemirror/view` 6.43.x：composition 附近的 DOM 复用、Safari 选区、iOS Enter/Backspace）。这是活着的文本引擎，不是停更的外壳。

Runestone 0.5.2（2026-03）仍写 **iOS**；Catalyst「不算做完」；AppKit 移植停在 2023 的 `mac` 枝。iPad IME 若 S2 失败，它仍是 iPad 退路，不是现在的首选。

**不要在工程结构更新时改内核。** S2 才是换内核的闸门。壳、纸、SQLite 先立；编辑器按 CM6 预留 WKWebView 位置即可。

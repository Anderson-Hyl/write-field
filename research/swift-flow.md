# swift-flow 取证（2026-09-16）

来源：本地 clone `https://github.com/1amageek/swift-flow`（`/tmp/swift-flow-src`，当时 `main` / 0.21.x），外加 README / CLAUDE.md。不是网传摘要。

## 身份

| 项 | 值 |
| --- | --- |
| 定位 | SwiftUI 无限画布 + 节点 + 边的 flow diagram 库 |
| 许可 | MIT（Copyright 2026 1amageek） |
| 平台声明 | `Package.swift`：`.iOS(.v26)` / `.macOS(.v26)`，Swift 6.2 |
| 体量 | `Sources/SwiftFlow` ≈ 12,011 行；`Tests` 25 个 Swift 文件 |
| 维护 | 单维护者；star 很少（约 25）。这是成熟度风险，不是 API 风险 |

## 和本产品对齐的地方

1. **边是一等实体。** `FlowEdge` 有稳定 `id`，连的是 `(sourceNodeID, sourceHandleID) → (targetNodeID, targetHandleID)`，可 `Codable`。这正好对着写作画布「每根线一画出来就持久存在」，也正好是 Mosaic「线由 membership 派生、库里没有 edge 行」的反面。
2. **节点可以是任意 SwiftUI view。** `FlowCanvas` 用 `Canvas` + `GraphicsContext` 批量画边，节点走 `resolveSymbol`。
3. **专门为 WKWebView 这类原生视图做了 LiveNode。** README 原文把 `WKWebView` 列为 `resolveSymbol` 会画成空白/首帧冻结的典型反例；`LiveNode(mount: .persistent)` 把真视图放在 Canvas 上方的 overlay 里，空闲时用快照当海报。`flowDragHandle` 把拖节点的手势收到标题条，避免被 WebView 吃掉。
4. **视口是值类型。** `Viewport { offset, zoom }`，带 `screenToCanvas` / `canvasToScreen`，可直接塞进我们的 `scenes` 表。
5. **手势与 Mac 指针。** macOS 用 `CanvasHostView: NSViewRepresentable` 接 `scrollWheel` / `magnify` / `NSCursor`；iOS 用 `UIViewRepresentable`。AppKit 只出现在 `#if os(macOS)` 里（`CanvasHostView`、`LiveNodeMountedViewSnapshotHost`、`FlowSelectionModifier`、`FlowDragHandle`）。这是 SwiftUI 多平台库的正常适配，不是「整个 app 写成 AppKit」。

## 和本产品不对齐的地方

1. **它是流程图库，不是「中央一篇线性正文」。** 所有节点共享同一套世界坐标、一起缩放。把 50k 字的源码编辑器当成普通 `FlowNode` 拖去缩放，写作会不可用。
2. **`FlowEdge` 没有类型字段**，只有 `label`。引用 / 依据 / 反驳 / 待解决 必须存在我们自己的 SQLite `edges.typeRaw` 里，画布只投影几何。
3. **默认海报在 Mac 上走 ScreenCaptureKit。** `LiveNodeMountedViewSnapshotHost` 的 macOS 分支直接 `ScreenCaptureKitLiveNodeWindowCapturer()`。写作 app 不能为了卡片缩略图去要「屏幕录制」权限。必须用 README 写明的 `WKWebView.takeSnapshot` 自定义 provider；失败则保持 live overlay，不要黑海报。
4. **连线起点是节点 handle，不是段落 gutter。** 「从正文拉出一根线」要自己做：编辑器报告屏幕坐标 → `Viewport.screenToCanvas` → `FlowStore` 的 connection draft。
5. **几何类型是 `CGPoint`/`CGFloat`，不是 Mosaic 的 `CanvasPoint`/`Double`。** 第一天不要把 `WorkspaceWireRouter` 塞进 swift-flow。路由算法以后可以换（库暴露了 `EdgePathCalculating`），不是开工前提。
6. **成熟度。** 单维护者、API 仍在 0.21。要当「可替换的画布内核」用：我们的事实来源是 SQLite，不是 `FlowStore`。`FlowStore` 是运行时投影。

## 结论（给架构文档用）

- **第一候选，值得 spike。** 它已经把「SwiftUI Canvas + 原生编辑器节点 + 一等边」这条最难的缝补上了。
- **正文不要默认做成会缩放的 FlowNode。** 卡片走 swift-flow；正文走独立的中央表面。这是产品形态，不是库的限制。
- **可以淘汰 Mosaic 的 `InfiniteCanvasNSView`。** 不淘汰 Mosaic 的数据层模式和「线必须持久」这条分叉。

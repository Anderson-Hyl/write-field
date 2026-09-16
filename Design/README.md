# 写作画布 · 界面设计

壳跟 Mosaic 一样：侧栏 + 当前 Topic（= Room）画布。先画这套壳，再长 SwiftUI。

Soundtrack【已定】：整 app 一首，pill 在 chrome，换 Topic 不换歌。

## 要画的板

先打通一次写作（产品文档 §3.5），再抠局部。

0. **一次写作** · 同一块现场从空稿走到隔夜。结构草图：`一次写作.html`
1. 壳 · 侧栏 Topic 列表 + 当前画布（iPad 横、竖、Mac）——跟在第 0 板后面，不要先做成 Mosaic 的分镜
2. 写作现场 · 该 Topic 的正文 + 周围的卡（第 0 板里已经出现的那些状态）
3. 专注模式（第 0 板第 7 拍）
4. 锚点 rest / 打开（第 0 板第 2–3 拍的局部）。笔记：`锚点 rest-open.html`
4b. 卡再长出卡（第 0 板第 4 拍的局部，呈现未锁）。笔记：`派生呈现.html`
5. Soundtrack pill（不要挡住打字；第 0 板里它一直在，不是一页）
6. 空 Topic vs 恢复后的现场（第 0 板第 1 拍和第 8 拍）

## 不要在这轮设计里解决

- IME / CodeMirror（必须真机 spike）
- CloudKit、账号
- Mosaic 开发者 chrome 的复刻
- 一百张卡的鸟瞰

板式不限（HTML 离线板、Figma 导出、静帧）。定稿进 git。三端写作现场画完，S0 的窗口壳才有对齐对象。

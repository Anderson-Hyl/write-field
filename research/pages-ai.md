# Pages 的 AI 与协同（2026-09-17 取证）

给产品文档 §3.7 用。不是网传摘要；下面每条都能指回 Apple 支持页或发布说明。

## Pages 里的 AI 做什么

| 能力 | 出处 | 写不写正文 |
| --- | --- | --- |
| **Writing Tools：校对 / 改写 / 摘要 / 要点 / 列表 / 表格** | Pages 14.3 起；Apple Intelligence。选中文字 → 工具栏或右键 | **写。** 预览后 Replace 换掉原文 |
| **Writing Tools：在文档里直接改字** | Pages 14.4 | **写。** |
| **Compose（ChatGPT 扩展）** | iOS 18.2 / macOS 15.2 起 Writing Tools 底部 Compose | **写。** 从描述生成段落，落进文档 |
| **Image Playground / Creator Studio 生成图** | Pages 14.3；Creator Studio 订阅加深（15.3 可编辑形状等） | 图进文档，不是思考对象 |
| **Siri / ChatGPT 问这篇文档** | Pages 14.3 发布说明：「Siri can use ChatGPT to answer questions about content in your document」 | **不写正文，但也不驻留。** 把截屏或全文发给 ChatGPT，回答在 Siri 气泡里。可 Copy，可让 Siri 存到备忘录 |

系统级还有 Write with Siri（iOS 27 / 2026-09 的下一代 Apple Intelligence）：描述需求 → 生成草稿或改已写的字。这是 OS 能力，Pages 会接到。

## Pages 里的「协同」是什么

人与人：iCloud 实时合写、评论、修订、活动通知。评论可以按页滚动，出现在 Comments & Changes 窗格。这是审稿批注，不是资料 / AI 回答停在某段旁边。

没有：剪藏来源卡、问题卡、带类型的边、出处三态（clipped / retrieved / asserted）、隔夜恢复「当时摊开的卡」。

脚注 / 尾注是文档排版功能，作者手写进纸里，不是四周的对象。

## 明确没有的

- AI 输出默认不进正文、先变成纸旁边的对象
- 对当前段提问后，回答明天还挂在那段上
- 禁止 AI 自己调用 `body.write` / `body.replace`。插入图表等是作者手势，且先停在卡上
- 资料与反驳的工作记忆（不是评论气泡）

## 和本产品的关系（一句）

Pages 的 AI 动词是 **改这篇 / 写这篇**。本产品的 AI 动词是 **读这段，产物停在旁边**。形态都像白纸，并不因此是同一个产品。

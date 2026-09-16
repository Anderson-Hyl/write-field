# write-field agent guide

## Purpose

A spatial writing workbench for long-form Markdown. One-line product:

**AI is the reader, not the author.**

This repository is still in the research / planning phase. The first code should be a spike that answers a product question, not a complete app. Do not invent settled decisions where a document marks an item `【待定】`.

## Before making changes

Read these documents in order:

1. `写作画布 · 产品构思 v0.2.md` — product floor rules, object model, what the prototype must prove
2. `技术规划 v0.1 · 底座与架构.md` — platform, canvas, editor, spike order
3. `技术规划 v0.1 · 数据模型.md` — what lives where
4. `技术规划 v0.1 · AI 语义面.md` — what AI is allowed to write

Read the matching research note only when the task touches that surface:

| Task | Also read |
| --- | --- |
| Mosaic reuse, edges vs membership, attention vs scene | `research/mosaic-reuse-audit.md` |
| Mosaic-side contract (workspace, worktrees, do not add iOS to Mosaic.app) | `/Users/anderson/Developer/Mosaic/Documentation/Mosaic · WriteField.md` |
| Infinite canvas, LiveNode, WKWebView-on-canvas | `research/swift-flow.md` |
| Editor kernel, IME, App Store JS | `research/editor-options.md` |
| LaTeX / math APIs | `research/apple-swiftui-math.md` |

Any decision that changes a `【已定】` or resolves a `【待定】` must be written back into the document it belongs to, with the marker updated. Do not leave the new truth only in chat.

The owner thinks out loud. A preference, analogy, or “maybe like Mosaic” is **not** `【已定】` until it has been argued. Push back when Mosaic’s reason does not transfer, when a name is bigger than the schema, or when a process (design-first, two worktrees, copy the chrome) would delay the only tests that can kill the product. Record the dissent in the doc; do not rubber-stamp.

**Session split.** This repository owns product, planning, and spike order. Engineering Mosaic must do for WriteField (portable `MosaicGeometry`, package platforms, later the root workspace) happens in `/Users/anderson/Developer/Mosaic`, following `Documentation/Mosaic · WriteField.md` § Mosaic engineering backlog. Do not copy these planning docs into Mosaic. Do not implement the writing app inside `Mosaic.app`.

## Floor rules

These are type-system / architecture constraints, not style preferences. Do not "just this once" them in a prototype.

1. **No writing the body for the user.** There is no `body.write` / `body.insert` / `body.replace`. AI may create cards and edges only.
2. **AI has no timer and no file watcher.** The only entry is an author gesture. Every AI-produced row carries a `trigger`.
3. **Do not judge truth.** No `truth.verify`, no true/false column. Provenance is `clipped | retrieved | asserted`. `asserted` cards cannot become footnotes or reference-edge targets.
4. **Failed anchors never snap to "the closest paragraph".** Show that the anchor is broken and give the choice back.
5. **Markdown on disk stays clean.** No block ids, no HTML comments as anchors, no app-private markers in `.md`.
6. **Marked text is not content.** IME composition does not autosave.

## Current technical direction

- **New app**, not a Mosaic room and not a second target inside `Mosaic.app`. Shared context belongs in an **Xcode workspace with two projects**: Mosaic (macOS only) and WriteField (iPadOS + macOS). Portable algorithms become an iOS+macOS SPM product both apps link; AppKit canvas stays Mosaic-only. Do not add an iOS destination to the Mosaic app (Mosaic `AGENTS.md` parks Companion). Until that workspace exists, do not add MosaicPackage as a dependency — copy the pure Foundation files.
- **Do not open `Mosaic.xcodeproj` as the product entry** once a root workspace exists; the implicit `self:` workspace cannot host the second project.
- **Development workflow** (architecture §十): default is one git checkout, one Xcode workspace, two schemes. Do not keep two git worktrees as the normal setup. A second worktree is only for overlapping dirty lines (Mosaic release + WriteField spike). One agent session has one primary app; the other app is read-only except for a shared portable package. Changes to that package must build in both schemes. Until the monorepo exists, do not edit Mosaic AppKit from a write-field session — copy Foundation files instead.
- **Borrow from Mosaic by default** (product doc §8.2, architecture §2.1): circuit wire morphology and routing, drag-from-handle, attention vocabulary, MusicKit soundtrack (in-process `ApplicationMusicPlayer`, persist the binding not the player, **one song for the whole app**), viewport culling / LOD, jump-palette catalogs, SQLiteData persistence patterns, small semantic commands. Do not re-invent these because the app is new.
- **The shell is Mosaic’s.** Sidebar + current Topic. A Topic is a Room: one canvas, one primary manuscript. No disk-bound Workspace. Switching Topics does not change the soundtrack.
- **Design that shell before growing the SwiftUI chrome.** Plates: sidebar+canvas, writing scene on iPad/Mac, focus mode, a card with a typed wire, soundtrack pill. Do not wait on IME or CloudKit to draw those. Structure follows Mosaic; density follows long-form Chinese writing, not terminal tiles.
- **Do not copy Mosaic AppKit** (`NSView`, `NSTextView`, `InfiniteCanvasNSView`, `*ViewController`, `MosaicComponents`). A third-party library's `#if os(macOS)` adapter is allowed.
- **Wires look like Mosaic, store like write-field.** Product stroke is circuit rounded-orthogonal (not swift-flow bezier). Edges are persisted, typed, and hit-testable — that is the fork from Mosaic membership-derived wires.
- **SwiftUI multiplatform**, iPadOS + native macOS, App Store sandbox. Not Catalyst. Not Electron / Tauri / bundled Chromium.
- **Persistence: SQLiteData + StructuredQueries.** Canonical body is `topics.body`. `.md` is a local mirror / export, rebuildable. Prototype does **not** construct `SyncEngine` or request iCloud. Schema is CloudKit-ready from day one (UUID primary keys, no extra UNIQUE, no compound keys). FTS5 and crash journals are local-only.
- **Canvas: swift-flow is the first candidate** for pan/zoom, nodes, and LiveNode. Cards are `FlowNode`s. Typed edges live in SQLite and project to `FlowEdge` with a Mosaic `EdgePathCalculating` adapter. `FlowStore` is a runtime projection, not the source of truth.
- **The article body is not a normal zooming node.** It is a privileged center surface. Do not put a long-form editor in a `FlowNode` that scales with the canvas unless a spike has compared that against an overlay and the overlay lost.
- **Editor: bundled CodeMirror 6 in `WKWebView`, source mode.** Hand-written LaTeX, preview later (KaTeX). On macOS, LiveNode posters must use `WKWebView.takeSnapshot`, never ScreenCaptureKit — this app must not ask for Screen Recording.
- **State: Observation + SQLiteData `@FetchAll`.** Do not start with TCA.
- **No MCP transport** in the prototype. Keep the semantic command set from the AI doc; do not add a socket server.
- **Do not port Mosaic capabilities that fail on iPadOS or in App Store sandbox:** Screen Recording / ScreenCaptureKit, PTY, `Process` for git, Sparkle, Unix MCP sockets. MusicKit is not in that list — it ships on iOS; connect it after the writing-scene spike, do not rebuild the player model.

## What the next code is for

The prototype exists to answer two questions from the product doc §13:

1. Does keeping sources and AI output next to the paragraph actually reduce context switches?
2. Does restoring the writing scene make it faster to resume after a break?

Implement the smallest spike that can fail. Order and kill criteria are in `技术规划 v0.1 · 底座与架构.md` §七 (S0–S7). Do not start S6 (AI) before S5 (restore) is true. Do not enable CloudKit, MCP, cross-article search, Zotero, or a second editor kernel unless S2 (Chinese IME in CodeMirror + WKWebView) has failed.

If infinite canvas turns out unused, the allowed downgrade is sidebar / working set — not "make the canvas prettier".

## Recording

After a real writing session or a spike, write down only:

- At which moment did I leave the body, and why?
- Which context, if it had stayed beside the paragraph, would have saved a switch?
- Which card was created and never looked at again?
- Which card restored a train of thought the next day?
- Which interaction felt like using the product for the product's sake?

Those notes outrank a feature backlog.

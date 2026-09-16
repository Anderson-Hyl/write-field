# Mosaic → SwiftUI (iPadOS + macOS) Reuse Audit

**Scope.** Code-level audit of what can actually be reused from the existing macOS AppKit
project at `/Users/anderson/Developer/Mosaic` by a new product that must be a **SwiftUI app on
both iPadOS and macOS, with no AppKit in the new app's UI**.

**Method.** Every number below comes from reading or grepping the real files. Commands used are
`find`/`wc -l` for sizes and `grep -rn --include='*.swift'` for symbol counts. Nothing is
inferred from documentation alone; where a doc is the only evidence, it is quoted with its path
and line number.

**Measurement base.**

| Quantity | Value |
| --- | --- |
| Swift files in `MosaicPackage/Sources` | 205 |
| Lines of Swift in `MosaicPackage/Sources` | 72,104 |
| Files that `import AppKit` | 104 (50.7%) |
| Lines in `import AppKit` files | 46,752 (64.8%) |
| Files that `import UIKit` | **0** |
| Files that `import SwiftUI` | **0** |
| Files with any `#if os(...)` / `#if canImport(...)` guard | **1** (`MosaicCore/TextTile.swift`) |
| Files containing `NSEvent` | 48 (289 occurrences) |
| Lines of Swift in `MosaicPackage/Tests` | 40,210 |

---

## 0. Headline findings

1. **There is no SwiftUI in this repository at all.** Repo-wide, excluding `.build`, exactly one
   Swift file mentions "SwiftUI": `MosaicPackage/Tests/MosaicCoreTests/GitInspectTests.swift:236`,
   and it is a diff *fixture string* (`-import SwiftUI`) used to test the diff parser. `AGENTS.md:118`
   claims "UI shell: AppKit with SwiftUI where it provides clear leverage" — in practice the
   entire app, including every panel, sheet, control and popover, is hand-built AppKit
   (`import AppKit` in 104 files; 76 files reference `NSView`; `NSViewController` in 9 files /
   17 occurrences; 20 files named `*ViewController.swift`; `NSMenu` in 33 occurrences).
   **Consequence: there is zero reusable SwiftUI surface. The entire view layer is new work.**
2. **`MosaicCore` is the single most valuable asset and is essentially platform-neutral already.**
   7,221 of its 7,323 lines are in AppKit-free files, it contains **zero** `CGPoint`/`CGRect`/
   `CGFloat`/`NSColor` references (it defines its own `CanvasPoint`/`CanvasSize`/`CanvasRect` over
   `Double` in `MosaicCore/Geometry.swift`), and its only AppKit file
   (`MosaicCore/TextTile.swift`) is already wrapped in `#if canImport(AppKit)` with a pure
   fallback implementation.
3. **`MosaicPersistence` (2,805 lines) is 100% AppKit-free.** It depends only on `SQLiteData`,
   `StructuredQueries`, `swift-dependencies` and `MosaicCore`. It is the second cleanest
   carry-over, and its 13 migrations are iOS-safe SQL.
4. **ScreenCaptureKit does not exist on iOS.** Verified directly against the installed SDKs:
   `ScreenCaptureKit.framework` is present in
   `MacOSX.sdk/System/Library/Frameworks/` and **absent** from
   `iPhoneOS26.5.sdk/System/Library/Frameworks/` (which ships `ReplayKit.framework` instead).
   The window-stream tile (3 files, 1,764 lines) is therefore a hard macOS-only node kind.
5. **SwiftTerm compiles for iOS but cannot run a local process on iOS.** SwiftTerm
   `Sources/SwiftTerm/Pty.swift:11` and `Sources/SwiftTerm/LocalProcess.swift:10` are both gated
   `#if !os(iOS) && !os(tvOS) && !os(Windows)`. The terminal tile's whole reason for existing —
   a local PTY running a shell/agent — is unavailable on iPadOS.
6. **`Process` (used at `MosaicCore/GitTile.swift:701` to shell out to `/usr/bin/git`) is
   unavailable on iOS**, so the git tile cannot execute git on iPadOS even though its parsing
   logic is portable.
7. **The persistence layer's own contract explicitly permits restore of intent, not runtime.**
   The blocker for the new product's "restore the writing scene across launches" is not the
   database technology but Mosaic's **settled product rule** (`Handoff · Attention Layer.md:16`)
   that attention/MRU/overview are runtime-only. See §5(b).

---

## 1. Per-target portability table

Measured with `grep -rl` (files) and `grep -rho | wc -l` (occurrences) over
`MosaicPackage/Sources`.

### 1.1 Symbol matrix (occurrence counts per target)

| Symbol | Core | Components | Canvas | Control | ControlClient | Features | MCP | MCPShim | Persistence | mosaic |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| `import AppKit` (files) | 1 | 24 | 45 | 3 | 0 | 31 | 0 | 0 | 0 | 0 |
| `import UIKit` | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 |
| `import SwiftUI` | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 |
| `NSTextView` | 1 | 3 | 11 | 6 | 0 | 5 | 0 | 0 | 0 | 0 |
| `NSViewController` | 0 | 4 | 0 | 0 | 0 | 13 | 0 | 0 | 0 | 0 |
| `NSWindow` | 0 | 10 | 0 | 12 | 0 | 7 | 0 | 0 | 0 | 0 |
| `NSMenu` | 0 | 1 | 1 | 0 | 0 | 31 | 0 | 0 | 0 | 0 |
| `NSTrackingArea` | 0 | 10 | 15 | 0 | 0 | 11 | 0 | 0 | 0 | 0 |
| `NSPasteboard` | 0 | 0 | 18 | 6 | 0 | 2 | 0 | 0 | 0 | 0 |
| `NSOutlineView` | 0 | 11 | 20 | 7 | 0 | 1 | 0 | 0 | 0 | 0 |
| `NSImage` | 0 | 38 | 67 | 1 | 0 | 55 | 0 | 0 | 0 | 0 |
| `NSColor` | 1 | 169 | 58 | 0 | 0 | 30 | 0 | 0 | 0 | 0 |
| `NSBezierPath` | 0 | 9 | 17 | 0 | 0 | 0 | 0 | 0 | 0 | 0 |
| `NSWorkspace` | 0 | 3 | 13 | 0 | 0 | 4 | 0 | 0 | 0 | 0 |
| `Process(` | 1 | 0 | 1 | 0 | 0 | 1 | 0 | 1 | 0 | 0 |
| `forkpty` | 0 | 0 | 2 | 0 | 0 | 0 | 0 | 0 | 0 | 0 |
| `ScreenCaptureKit` | 3 | 0 | 6 | 7 | 0 | 0 | 0 | 0 | 0 | 0 |
| `SCStream` | 0 | 0 | 17 | 9 | 0 | 0 | 0 | 0 | 0 | 0 |

### 1.2 Target-by-target verdict

| Target | Files | Lines | AppKit lines | AppKit-free | Verdict | Representative evidence |
| --- | ---: | ---: | ---: | ---: | --- | --- |
| **MosaicCore** | 44 | 7,323 | 102 | 7,221 (99%) | **Portable as-is** (add `.iOS` to `Package.swift`) | Only AppKit file is `MosaicCore/TextTile.swift` and it is guarded at line 1 (`#if canImport(AppKit)`) with a pure `#else` branch at lines 42–50. Zero `CGPoint`/`CGRect`/`NSColor` in the whole target. |
| **MosaicPersistence** | 6 | 2,805 | 0 | 2,805 (100%) | **Portable as-is** | All six files import only `Dependencies`, `Foundation`, `IssueReporting`, `MosaicCore`, `OSLog`, `SQLiteData`. `Schema.swift` is plain SQL DDL. |
| **MosaicMCP** | 6 | 639 | 0 | 639 (100%) | **Portable after removing one file** | Protocol layer (`JSONRPC.swift` 113, `JSONValue.swift` 104, `MCPSession.swift` 114, `MCPTool.swift` 34, `MCPEndpoint.swift` 31) is pure. `MCPSocketServer.swift` (243) is `import Darwin` + `socket(AF_UNIX,…)` — dead on a sandboxed iOS app. |
| **MosaicMCPShim** | 1 | 106 | 0 | 106 | **Not applicable** — delete | `main.swift` is a stdio↔Unix-socket bridge. There is no second process to launch on iPadOS. |
| **mosaic** (executable) | 1 | 39 | 0 | 39 | **Not applicable** — delete | 39-line `main.swift` that opens a Unix socket to the debug app. |
| **MosaicControlClient** | 1 | 78 | 0 | 78 (100%) | **Portable code, useless product** | `ControlSocket.swift` uses `AF_UNIX` + `connect()`. Compiles, cannot reach anything on iOS. |
| **MosaicControl** | 3 | 1,953 | 1,953 (100%) | 0 | **Must be rewritten / dropped** | `UIDriver.swift` (1,227) imports `AppKit` + `ScreenCaptureKit` and drives real `NSEvent`s and `NSWindow`s; `ControlCommand.swift` (541) is `@MainActor` AppKit menu-walking; `ControlServer.swift` (185) imports `AppKit`. |
| **MosaicComponents** | 25 | 7,413 | 7,395 (99.8%) | 18 (0.2%) | **Must be rewritten** (port the *tokens*, not the views) | 24/25 files `import AppKit`. `MosaicContextMenu.swift` (1,361), `MosaicSheet.swift` (851), `MosaicOutlineView.swift` (766), `MosaicSegmentedControl.swift` (383), `MosaicButton.swift` (329) are all `NSView`/`NSViewController` subclasses. Only `MosaicControlState.swift` (18 lines, an enum) is clean. |
| **MosaicCanvas** | 62 | 23,187 | 21,004 (91%) | 2,183 (9%) | **Must be rewritten, with a pure tail to lift out first** | `InfiniteCanvasNSView.swift` (2,805), `CanvasWorkspaceNSView.swift` (1,041), `WindowStreamSessionStore.swift` (927). Clean islands: `TileAttentionStore.swift` (289), `RoomMusicSession.swift` (369), `WeatherRainScene.swift` (457), `SceneDiff.swift` (148), `WorkspaceCircleRouteCache.swift` (74), `SpatialGrid.swift` (86), `CanvasTransform.swift` (78), `CanvasWorkspaceRegion.swift` (99). |
| **MosaicFeatures** | 56 | 28,561 | 16,298 (57%) | 12,263 (43%) | **Split: reducers portable, controllers rewritten** | Portable: `AppFeature.swift` (3,852), `MosaicAgentServer.swift` (2,558), `Canvas/CanvasFeature.swift` (1,102), `GitWorktree.swift` (561). Rewrite: `MosaicRootViewController.swift` (3,291), `CanvasWorkspaceViewController.swift` (2,374), `SidebarViewController.swift` (821), `SoundtrackPickerViewController.swift` (1,399). |

**Note on `AppFeature.swift`:** its only `MosaicCanvas` symbols are `CanvasWorkspace` and
`CanvasWorkspacePresentation`, both of which are actually declared in
`MosaicCore/CanvasModels.swift:254` and `:314`. The `import MosaicCanvas` at
`MosaicFeatures/AppFeature.swift:5` is therefore vestigial — the 3,852-line reducer is very
likely portable with no AppKit exposure at all. This should be verified by compilation, not
assumed.

### 1.3 Blockers that are not visible in a symbol grep

| API | Where | iOS status |
| --- | --- | --- |
| `Process()` | `MosaicCore/GitTile.swift:701` | **Unavailable on iOS.** `runGit` shells out to `/usr/bin/git`. Git *parsing* is portable; execution is not. |
| `forkpty` / `LocalProcess` | `MosaicCanvas/MosaicTerminalView.swift` (via SwiftTerm), `MosaicCanvas/TerminalSessionStore.swift` | **Unavailable on iOS.** SwiftTerm gates both files `#if !os(iOS)`. |
| `ScreenCaptureKit` (`SCStream`, `SCShareableContent`) | `MosaicCanvas/WindowStreamSessionStore.swift`, `WindowStreamNodeView.swift`, `MosaicControl/UIDriver.swift` | **Framework absent from the iOS SDK** (verified against `iPhoneOS26.5.sdk`). |
| `NSWorkspace.shared.accessibilityDisplayShouldReduceMotion` | 10 files, 17 occurrences (e.g. `MosaicCanvas/AttentionPillView.swift:127`, `TileAttentionDot.swift:79`, `MosaicComponents/MosaicTour.swift:255`) | Replace with `@Environment(\.accessibilityReduceMotion)`. Mechanical. |
| `NSWorkspace.shared.open(url)` | `MosaicCanvas/WebSessionStore.swift:294`, `WindowStreamSessionStore.swift:203` | Replace with `UIApplication.shared.open` / SwiftUI `openURL`. Mechanical. |
| `NSWorkspace.shared.notificationCenter` | `MosaicCanvas/WeatherRainView.swift:25,28,39` | Replace with `NotificationCenter.default` + `UIAccessibility.reduceMotionStatusDidChangeNotification`. Mechanical. |
| `sysctl` (KERN_PROC) | `MosaicCanvas/ProcessTable.swift` (109 lines) | Compiles (Darwin) but the sandbox denies enumerating other processes on iOS → returns nothing. The "running" attention probe is Mac-only. |
| `device.makeLibrary(source:)` runtime shader compile | `MosaicCanvas/WeatherRainView.swift:651` | Declared in the iOS SDK (`MTLDevice.h:710`) but the Metal compiler is not present on iOS devices. The rain tile needs a shipped `default.metallib`; the package currently *copies* `WeatherRain.metal` as a resource (`Package.swift:63`), falling back to runtime compilation. |
| `FileManager.default.homeDirectoryForCurrentUser` | `MosaicPersistence/RoomStore.swift:782,794` | Compiles; returns the app container, not a user home. Directory semantics must be redesigned, not just ported. |

### 1.4 Package-level blockers

Two mechanical changes gate *compilation* for iOS regardless of the above:

1. `MosaicPackage/Package.swift:8` declares `platforms: [.macOS(.v15)]` only. There is **no
   `.iOS(...)`**. SwiftPM will refuse to build this package for an iOS destination until it is
   added.
2. `MosaicPackage/Package.swift:96-100` links `ApplicationServices`, `MediaPlayer`, `MusicKit`
   into `MosaicFeatures`. `ApplicationServices` is macOS-only; `MediaPlayer`/`MusicKit` exist on
   iOS but with different API surfaces.

---

## 2. SwiftPM dependency platform support

Evidence: each dependency is checked out under
`/Users/anderson/Developer/Mosaic/MosaicPackage/.build/checkouts/`, so its own `Package.swift`
was read directly. Versions are from `MosaicPackage/Package.resolved`.

| Dependency | Pinned | Declared platforms (from its own manifest) | iPadOS verdict |
| --- | --- | --- | --- |
| **sqlite-data** | 1.9.0 | `.iOS(.v16), .macOS(.v13), .tvOS(.v16), .watchOS(.v9)` (`Package.swift:9-12`) | **Usable.** Note it is SwiftUI-aware: `Sources/SQLiteData/FetchAll.swift:445` etc. are `@available(iOS 17, macOS 14, …)`. Target iOS 17+ to get the `@FetchAll` observation wrappers; the raw DB APIs work on 16. |
| **swift-structured-queries** | 0.35.0 | `.iOS(.v16), .macOS(.v13), .tvOS(.v16), .watchOS(.v9)` (`Package.swift:15-18`) | **Usable.** SwiftSyntax macro; macro *plugins* run on the host at build time, so no runtime concern. |
| **swift-composable-architecture** | 1.26.1 | `.iOS(.v16), .macOS(.v13), .tvOS(.v16), .watchOS(.v9)` (`Package.swift:9-12`) | **Usable.** 20 files `import UIKit`, guarded by `#if os(...)`; no unguarded AppKit. |
| **swift-dependencies** | 1.14.1 | `.iOS(.v13), .macOS(.v10_15), .tvOS(.v13), .watchOS(.v6)` (`Package.swift:9-12`) | **Usable.** Zero UIKit/AppKit imports; 5 files contain `os(macOS)` guards. |
| **swift-snapshot-testing** | 1.19.4 | `.iOS(.v13), .macOS(.v10_15), .tvOS(.v13), .watchOS(.v6)` (`Package.swift:8-11`) | **Usable for tests.** 7 files `import AppKit`, 13 `import UIKit`, 13 `os(macOS)` guards — it ships both platform backends. |
| **swift-custom-dump** | 1.7.0 | `.iOS(.v13), .macOS(.v10_15), .tvOS(.v13), .watchOS(.v6)` (`Package.swift:8-11`) | **Usable.** 2 UIKit files, guarded. |
| **SwiftTerm** | 1.16.0 | `.iOS(.v14), .macOS(.v11/.v13), .tvOS(.v13)` (`Package.swift:120-123`) | **Compiles on iOS; the feature does not work.** `Sources/SwiftTerm/iOS/` ships UIKit terminal views (`iOSTerminalView.swift`, `iOSKeyboardView.swift`, …), but `Pty.swift:11` and `LocalProcess.swift:10` are `#if !os(iOS)`. **No PTY ⇒ no local shell, no agent CLI, no BEL-driven attention on iPadOS.** |
| **GRDB.swift** (transitive, via sqlite-data) | 7.11.1 | `.iOS(.v13), .macOS(.v10_15), .tvOS(.v13)` (`Package.swift:51-53`) | **Usable.** 10 UIKit files, 1 `os(macOS)` guard. |
| **Sparkle** (app target only, `project.yml:30`) | 2.9.6 | macOS-only updater framework | **Unusable on iOS.** Falls out with the macOS app target. |

### Explicit answer: which dependencies are unusable on iOS

- **Unusable without replacement: None of the seven SwiftPM dependencies at the library level.**
  All seven declare iOS support and none has an unguarded AppKit import in its sources.
- **Usable library, unusable feature: `SwiftTerm`.** The terminal *emulator* runs on iOS; the
  *local process* does not (`#if !os(iOS)` on `Pty.swift` / `LocalProcess.swift`).
- **Unusable because it is not a SwiftPM dependency of this package but of the app target:
  `Sparkle` (macOS-only).**
- **No online verification was required.** Every dependency was resolved locally and its
  manifest read. The only item that should still be verified against upstream docs is whether
  SQLiteData's `@FetchAll`/`@FetchOne` SwiftUI property wrappers are considered production-ready
  on iOS — the code exists (`FetchAll.swift:445`), but this audit only proves it is *available*,
  not that it is *supported*.

---

## 3. Carry-over assets (pure, UI-free)

All paths are relative to
`/Users/anderson/Developer/Mosaic/MosaicPackage/Sources/`. Line counts are `wc -l`.
"AppKit in public signature?" was checked by grepping each file for `NS[A-Z]`/`CG[A-Z]` and by
the fact that MosaicCore contains **zero** CoreGraphics type references.

### 3.1 Tier A — lift verbatim, no changes at all

| Asset | File | Lines | AppKit in signature? | Detach difficulty |
| --- | --- | ---: | --- | --- |
| **Wire routing algorithm** | `MosaicCore/WorkspaceWireRouter.swift` | 458 | **No** — `import Foundation` only. Types: `Family {z,l,detour,stub}`, `Shape {circuit,curve}`, `Parameters`, `Route`, `CubicBezier`, `PortEdge`. | **None.** Pure function over `CanvasPoint`/`CanvasRect`. Move to the new package as-is. |
| **Circle/endpoint geometry** | `MosaicCore/WorkspaceCircleGeometry.swift` | 68 | **No.** | **None.** |
| **Wire route cache / invalidation** | `MosaicCanvas/WorkspaceCircleRouteCache.swift` | 74 | **No** — `import Foundation`, `import MosaicCore` only. Lives in the Canvas target but is presentation-framework-free. | **None** except the target move. |
| **Scene geometry + culling + LOD + render-tier projection** | `MosaicCore/WorkspaceHarnessGeometry.swift` | 1,160 | **No** — `import Foundation`; `Scene`, `Visibility`, `Hub`, `Wire`, `ExpandedWorkspaceLayout`, `WorkspaceHarnessGeometry.resolve(...)`. Comments reference AppKit only in prose (line 399). | **None.** This is the largest single algorithmic asset in the repo. |
| **Render-tier resolver (LOD)** | `MosaicCore/CanvasModels.swift:393-415` (`NodeRenderTierResolver`) | 23 | **No.** `previewMinimumZoom = 0.35`, `previewMinimumScreenHeight = 48`. | **None.** Extract the enum, or keep the file. |
| **Relationship opacity ramp** | `MosaicCore/WorkspaceRelationLOD.swift` | 25 | **No.** | **None.** |
| **Core value types + viewport math** | `MosaicCore/Geometry.swift` | 167 | **No.** `CanvasPoint/CanvasSize/CanvasRect/CanvasViewport`, all `Double`. | **None.** Zero CoreGraphics. |
| **Model types** | `MosaicCore/CanvasModels.swift` | 416 | **No.** `CanvasNode`, `CanvasNodeKind`, `CanvasWorkspace`, `CanvasWorkspacePresentation`, `NodeRenderTier`. | **None.** |
| **MRU stack + walk session** | `MosaicCore/TileFocusMRU.swift` | 108 | **No.** `TileFocusMRU` (cap 10, adjacent dedup, `bounce`, `bounce(eligible:)`, `prune`), `TileFocusWalk`. | **None.** |
| **Attention vocabulary** | `MosaicCore/TileAttention.swift` | 36 | **No.** `TileAttentionStatus`, `TileAttentionReport`, `CanvasNodeKind.carriesProcess`. | **None.** |
| **Overview session snapshot** | `MosaicCore/TileOverview.swift` | 21 | **No.** | **None.** |
| **Jump palette catalog** | `MosaicCore/JumpPalette.swift` | 313 | **No.** `JumpPaletteCatalog.items(...)` / `.filter(...)` / `.matches(...)`, sections, action IDs, SF Symbol names as `String`. | **None.** |
| **Zoom aggregation** | `MosaicCore/WorkspaceZoomAggregation.swift` | 38 | **No.** 0.28 enter / 0.40 exit hysteresis, `entryInset = 40/zoom`. | **None.** |
| **Arrangement presets** | `MosaicCore/WorkspaceArrangement.swift` | 23 | **No.** | **None.** |
| **Spatial index** | `MosaicCanvas/SpatialGrid.swift` | 86 | **No** — `import MosaicCore` only. 512pt cells, `Index.nodeIDs(intersecting:)`. | **None** except the target move. |
| **Attention runtime store** | `MosaicCanvas/TileAttentionStore.swift` | 289 | **No** — `import Foundation`, `import MosaicCore`. `@MainActor final class`, `Timer`-based 15s decay, `completionLifetime = 5*60`. | **None.** Sibling-of-session-store pattern ports directly. |
| **Attention copy** | `MosaicCanvas/TileAttentionCopy.swift` | 61 | **No.** | **None.** |
| **Scene diffing** | `MosaicCanvas/SceneDiff.swift` | 148 | **No.** | **None.** |
| **Region model** | `MosaicCanvas/CanvasWorkspaceRegion.swift` | 99 | **No.** | **None.** |
| **Hub projection (fold/reveal/overview layout)** | `MosaicCore/WorkspaceHubProjection.swift` | 289 | **No** — self-described at line 27 as "Pure, AppKit-free projection helpers". | **None.** |
| **Text metrics (pure fallback branch)** | `MosaicCore/TextTile.swift` | 102 | **AppKit in a guarded branch only** (`#if canImport(AppKit)` at 1, 28, 53). The `#else` at 42–50 is a character-width estimator. | **Low.** The `#else` path already exists; on iOS you would want a TextKit-2 / SwiftUI `Text` measurement instead, which is a *replacement*, not a detach. |
| **Agent/tile profile + tool vocab** | `MosaicCore/AgentProfile.swift` (107), `AgentTool.swift` (27), `AgentTile.swift` (621), `MosaicBrand.swift` (34) | 789 | **No.** `AgentTile.swift` imports `Darwin` for session discovery only. | **Low** — `AgentTile`'s process-discovery half is Mac-only (§1.3), its configuration/persistence half is pure. |
| **Soundtrack model** | `MosaicCore/RoomSoundtrack.swift` (139), `WorkspaceWallpaper.swift` (44), `WorkspaceAccent.swift` (42), `StickyColor.swift` (52), `CanvasBackgroundStyle.swift` (25), `RainIntensity.swift` (125), `RainNoise.swift` (95), `WhiteNoise.swift` (45), `DigitalRain.swift` (168) | 735 | **No.** | **None.** Pure enums/codables. |

**Tier A subtotal: ~5,500 lines that move with essentially zero code change.**

> Note on framing: §3 lists only the assets *worth carrying into the new product*. §7 partitions
> the **entire** 72,104-line package, so its buckets are larger and include product code that
> happens to be portable (soundtrack, worktrees, lobby) but that the new product may not want.
> Tier A is a subset of §7 buckets A + B.

### 3.2 Tier B — portable logic with a thin platform seam

| Asset | File | Lines | Seam |
| --- | --- | ---: | --- |
| **Viewport transform (pan/zoom/fit math)** | `MosaicCanvas/CanvasTransform.swift` | 78 | Uses `CGPoint`/`CGRect`. Both exist on iOS; SwiftUI `Canvas`/`GeometryReader` speak the same types. **Portable as-is.** |
| **TCA app reducer** | `MosaicFeatures/AppFeature.swift` | 3,852 | No AppKit import. `import MosaicCanvas` at line 5 appears vestigial (its only Canvas-namespace symbols live in MosaicCore). Needs a compile check. |
| **Canvas reducer** | `MosaicFeatures/Canvas/CanvasFeature.swift` | 1,102 | No AppKit import; uses `CanvasSceneSnapshot` (2 references), whose *struct* is pure but whose file also declares `NSEvent`-taking action closures. |
| **Agent MCP tool surface** | `MosaicFeatures/Agent/MosaicAgentServer.swift` | 2,558 | No AppKit import. Depends on `MosaicMCP` (protocol, portable) + `MosaicPersistence`. |
| **Worktree lifecycle** | `MosaicFeatures/GitWorktree.swift` | 561 | No AppKit import, but drives `git` — the `Process` problem again. |
| **Alignment guides** | `MosaicCore/AlignmentGuides.swift` | 150 | Pure. |
| **Lobby graduate/quick-start** | `MosaicCore/LobbyGraduate.swift` (145), `LobbyQuickStart.swift` (183) | 328 | Pure. |
| **Path focus** | `MosaicCore/RoomPathFocus.swift` | 49 | Pure. |
| **Persistence store** | `MosaicPersistence/RoomStore.swift` (1,012), `RoomOutline.swift` (895), `Records.swift` (382), `AppSettingsStore.swift` (75), `CanvasSaveSequence.swift` (41) | 2,405 | AppKit-free. Only `FileManager.default.homeDirectoryForCurrentUser` (`RoomStore.swift:782,794`) needs semantic redesign. |

**Tier B subtotal: ~11,000 lines, mostly portable, needing targeted edits.**

### 3.3 Detach-difficulty summary

| Question | Answer |
| --- | --- |
| Does any **Tier A** asset reference an AppKit type in its public signature? | **No. Not one.** MosaicCore has zero `CG*`/`NS*` types in its API surface; the three Tier A files that live in MosaicCanvas (`WorkspaceCircleRouteCache`, `SpatialGrid`, `TileAttentionStore`) import only `Foundation`/`MosaicCore`. `CanvasTransform` (Tier B) uses `CGPoint`/`CGRect`, which are cross-platform. |
| Hardest Tier A item to detach | `TextTile.swift` — not because of AppKit leakage, but because the iOS path needs *better* text measurement (TextKit 2 / SwiftUI) than the existing character-width fallback, or notes will size wrong. |
| Effort to detach Tier A | Essentially a **file move plus a `Package.swift` platform line**. Budget one day, most of it spent proving compilation. |

---

## 4. Must-be-rewritten-for-SwiftUI inventory

Sizes are the real `wc -l` of the AppKit implementation being replaced. The subsections are
organised by feature area and **overlap slightly** (a few files appear in two of them); the
deduplicated partition and the authoritative total are in §7.

### 4.1 Infinite canvas viewport / hit-testing / pan-zoom

| Piece | Lines | Source | Why it cannot be ported |
| --- | ---: | --- | --- |
| Infinite canvas view | 2,805 | `MosaicCanvas/InfiniteCanvasNSView.swift` | `NSView` + `NSEvent` (`mouseDown`, `scrollWheel`, `magnify`, `keyDown`), `NSTrackingArea`, marquee, resize handles, alignment-guide `CGContext` painting, `NSMenu` context menu (`presentContextMenu(for:)` at line 2059), host-view recycling. |
| Workspace canvas view | 1,041 | `MosaicCanvas/CanvasWorkspaceNSView.swift` | Same class of problem; also owns the attention pill and lobby overlay. |
| Canvas chrome / toolbar | 787 | `MosaicCanvas/CanvasChromeView.swift` | `NSView` chrome, `NSButton`s, popovers. |
| Minimap | 358 | `MosaicCanvas/CanvasMinimapView.swift` | `NSView` `draw(_:)`. |
| File/image drop | 210 | `MosaicCanvas/CanvasFileDrop.swift` | `NSPasteboard` + `NSDraggingInfo`. On iOS becomes `DropDelegate` / `.onDrop`. |
| Maximize overlays | 137 | `MosaicCanvas/MaximizeOverlays.swift` | `NSView`. |
| Marquee + selection chrome | 36 + 165 | `MosaicCanvas/TileSelectionChrome.swift`, `MosaicComponents/MosaicSelectionChrome.swift` | `CALayer` borders. |
| Alignment guides painter | (in the 2,805 above) | `InfiniteCanvasNSView.swift:1786-1848` | `CGContext` + `CGColor`. |
| **Subtotal** | **~5,500** | | |

Key point: the *math* is already separate (`CanvasTransform`, `SpatialGrid`,
`WorkspaceHarnessGeometry`) and portable. What must be rewritten is **event handling and
drawing**, not geometry. That is the single biggest de-risking fact in this audit.

### 4.2 Node host views and render tiers

| Piece | Lines | Source |
| --- | ---: | --- |
| Node host view (culling, tier swap, drag, departing-host animation) | 345 | `MosaicCanvas/CanvasNodeHostView.swift` |
| Node content dispatch (kind → view factory) | 568 | `MosaicCanvas/CanvasNodeContent.swift` |
| Per-kind node views | **6,772** | `CodeNodeView` 344, `FilesNodeView` 657, `GitNodeView` 1,056, `ImageNodeView` 244, `NoteNodeView` 422, `NoiseNodeView` 198, `ParticleNodeView` 418, `ParticleHostView` 87, `RainNodeView` 183, `StickyNodeView` 522, `TerminalNodeView` 674, `TextNodeView` 268, `WebNodeView` 769, `WindowStreamNodeView` 619, `DigitalRainView` 116, `GlanceNodeView` 197 |
| Tile chrome (title bar, ⌘ badge, buttons, profile strip, empty state) | **458** | `TileChrome.swift` 130, `TileActionButton.swift` 166, `TileTitleBarButton.swift` 3, `TileProfileChrome.swift` 39, `TileSelectionChrome.swift` 36, `TileEmptyState.swift` 81 |
| Rain/particle Metal renderer | 738 + 457 | `WeatherRainView.swift` (AppKit `MTKView` host), `WeatherRainScene.swift` (pure sim, portable) |
| Soundtrack transport | 939 | `SoundtrackTransportView.swift` |
| Circle preview / drag-a-wire preview | 934 | `WorkspaceCirclePreviewView.swift` |
| Harness wire renderer | 923 | `MosaicCanvas/WorkspaceHarnessController.swift` — `WorkspaceHarnessLayer: CALayer` with `draw(in context: CGContext)` at line 91. The `WorkspaceHarnessWireCommand` struct (lines 5–44) is portable (it uses `CGColor`/`CGFloat`/`CubicBezier`); the **CALayer subclass must become a SwiftUI `Canvas`/`Shape`** with the same two-pass draw order (knockout pass, then main stroke, then waiting). |
| Terminal view + sessions | 674 + 584 + 42 + 34 | `TerminalNodeView`, `TerminalSessionStore`, `MosaicTerminalView`, `TerminalKeyEncoding`. Even on macOS this is only reusable if the new product keeps a Mac app; on iPadOS the PTY half is impossible. |
| Web view + sessions | 769 + 526 | `WebNodeView`, `WebSessionStore` (`WKWebView` is fine on iOS; `NSWorkspace.open` at line 294 is not). |
| Window-stream node + session | 619 + 927 | **Hard-delete on iOS** — `ScreenCaptureKit` absent from the iOS SDK. |
| **Subtotal** | **~14,250** | (host 913 + per-kind 6,774 + chrome 458 + rain 1,195 + soundtrack 939 + circle preview 934 + harness 923 + terminal session/keys 660 + web session 526 + window-stream session 927) |

### 4.3 Interaction layer

| Piece | Lines | Source | Notes |
| --- | ---: | --- | --- |
| Drag / hover / selection | — | 48 files contain `NSEvent` (289 occurrences); 36 `NSTrackingArea` occurrences | Becomes `DragGesture`, `.onHover`, `.onTapGesture`, `.gesture` composition. |
| Context menus | 1,361 + 33 `NSMenu` occurrences | `MosaicComponents/MosaicContextMenu.swift` | Becomes `.contextMenu { }`. The 1,361-line bespoke Telegram-styled menu is **not** worth porting; SwiftUI's menu is the native answer on iPad. |
| Sheets / modals | 851 + 9 `NSViewController` sheet VCs | `MosaicComponents/MosaicSheet.swift`, `MosaicFeatures/**/…ViewController.swift` | Becomes `.sheet` / `.presentationDetents`. |
| Text / note editing | 422 | `MosaicCanvas/NoteNodeView.swift` | See §5(c) — this is also a product fork, not just a port. |
| Outline/sidebar/list views | 766 + 821 | `MosaicComponents/MosaicOutlineView.swift`, `MosaicFeatures/SidebarViewController.swift` | Becomes `List` / `NavigationSplitView`. |
| Keyboard: ⌥Tab MRU, ⌥O overview, ⌘K palette, ⌘digit | — | `MosaicFeatures/MosaicRootViewController.swift` (3,291) | `NSEvent` key monitors → SwiftUI `.keyboardShortcut` + `commands`, plus a UIKit key-command bridge for iPad. Note: **⌥Tab and ⌥O have no iPad equivalent** — this is a design problem, not just a code problem. |
| **Subtotal** | **~7,500** | (context menu 1,361 + sheets 851 + outline 766 + sidebar 821 + root controller 3,291 + note editor 422, minus overlaps) |

### 4.3b The panel/sheet controller inventory

Measured: `MosaicFeatures` contains exactly **20 `*ViewController.swift` files totalling 13,360
lines**, and 31 files in the target import AppKit (16,298 lines). Every one of those controllers
is an AppKit screen that SwiftUI replaces. The largest:

| Controller | Lines |
| --- | ---: |
| `MosaicFeatures/MosaicRootViewController.swift` | 3,291 |
| `MosaicFeatures/Canvas/CanvasWorkspaceViewController.swift` | 2,374 |
| `MosaicFeatures/SoundtrackPickerViewController.swift` | 1,399 |
| `MosaicFeatures/SidebarViewController.swift` | 821 |
| `MosaicFeatures/AgentIdentityPickerViewController.swift` | 737 |
| `MosaicFeatures/NewItemSheetViewController.swift` | 648 |
| `MosaicFeatures/WorkspaceEditorViewController.swift` | 647 |
| `MosaicFeatures/Inspector/InspectorViewController.swift` | 647 |
| `MosaicFeatures/WindowPickerViewController.swift` | 546 |
| `MosaicFeatures/JumpPaletteViewController.swift` | 515 |
| `MosaicFeatures/RoomEditorViewController.swift` | 486 |
| `MosaicFeatures/WorktreeSheetViewController.swift` | 342 |
| remaining 8 controllers | ~1,907 |

### 4.4 Debug UI-control socket

| Piece | Lines | Source | Verdict |
| --- | ---: | --- | --- |
| `UIDriver` | 1,227 | `MosaicControl/UIDriver.swift` | Drives real `NSEvent`s through real `NSWindow`s; uses `ScreenCaptureKit`. **Rewrite from scratch or drop.** On iOS there is no scripting surface like this (XCUITest is external and out-of-process). |
| `ControlCommand` | 541 | `MosaicControl/ControlCommand.swift` | Menu-walking via AppKit. |
| `ControlServer` | 185 | `MosaicControl/ControlServer.swift` | `AF_UNIX` listener. |
| `ControlSocket` (client) | 78 | `MosaicControlClient/ControlSocket.swift` | `AF_UNIX` client. |
| `mosaic` executable | 39 | `mosaic/main.swift` | CLI. |
| **Subtotal** | **2,070** | | **Recommendation: keep this macOS-Debug-only, behind `#if os(macOS)` and `#if DEBUG`. Do not port to iPadOS.** |

### 4.5 Overview / glance cards

| Piece | Lines | Source |
| --- | ---: | --- |
| `GlanceNodeView` | 197 | `MosaicCanvas/GlanceNodeView.swift` |
| `FocusSwitchHUD` (⌥Tab MRU walk) | 275 | `MosaicCanvas/FocusSwitchHUD.swift` |
| `AttentionPillView` (global waiting pill) | 235 | `MosaicCanvas/AttentionPillView.swift` |
| `PathFocusPillView` | 153 | `MosaicCanvas/PathFocusPillView.swift` |
| `LobbyQuickStartView` | 699 | `MosaicCanvas/LobbyQuickStartView.swift` |
| `Overview.swift` (session driver) | 22 | `MosaicFeatures/Overview.swift` |
| **Subtotal** | **1,581** | |

The *pure* half here is already Tier A: `WorkspaceHubProjection.overviewLayout(...)`
(`WorkspaceHubProjection.swift:199`) computes the grouped overview descriptor, and
`TileOverview` snapshots the origin viewport. Only the cards need new views.

### 4.6 MCP server transport

| Piece | Lines | Verdict |
| --- | ---: | --- |
| `MCPSocketServer.swift` | 243 | **Rewrite.** `AF_UNIX` + `DispatchSourceRead`. On iPadOS no external process can reach a container Unix socket. |
| `MCPSession.swift`, `JSONRPC.swift`, `JSONValue.swift`, `MCPTool.swift`, `MCPEndpoint.swift` | 396 | **Portable as-is.** Protocol, framing, tool descriptors. |
| `MosaicMCPShim/main.swift` | 106 | **Delete.** There is no shim process on iOS. |
| `MosaicFeatures/Agent/MosaicAgentServer.swift` | 2,558 | **Keep the tool implementations; replace the transport.** |
| **Subtotal** | **639 portable / 349 to rewrite** | Alternative transports for iPadOS: `Network.framework` + Bonjour on the local network, App Intents / Shortcuts, or an in-process surface the app's own extensions call. **This is a product decision, not a port.** |

### 4.7 Rewrite totals

§4.1–§4.6 are *diagnostic* breakdowns by feature area, and a few files are named in more than
one of them (for example `TileSelectionChrome.swift` is both a node-chrome item and a canvas item).
The authoritative, deduplicated partition is §7. The largest single line items to rewrite are:

| Line item | Lines | Section |
| --- | ---: | --- |
| Node host views + per-kind node views + tile chrome + media renderers | ~14,250 | §4.2 |
| Panel / sheet / keyboard controllers (20 `*ViewController.swift`) | ~13,360 | §4.3b |
| Canvas viewport, hit-testing, pan-zoom, chrome, minimap, drop, marquee | ~5,500 | §4.1 |
| `MosaicComponents` controls (context menu, sheet, outline, buttons, segmented control, text field, …) | ~7,400 | §4.3 |
| Remaining `MosaicFeatures` AppKit views (chamber, soundtrack lists, lock overlay, …) | ~2,940 | §4.3b |
| Debug control socket (recommend macOS-only, behind `#if os(macOS)` + `#if DEBUG`) | ~2,070 | §4.4 |
| MCP socket transport (`MCPSocketServer` 243 + shim 106) | ~349 | §4.6 |
| **Deduplicated total** (see §7 bucket D) | **~42,000** | |

For contrast, the two verbatim carry-over buckets are small: **~5,500 lines of pure algorithm**
(§3.1) and **~10,000 lines of `MosaicCore` + `MosaicPersistence`** (§7 bucket A). The rewrite is
~4× the carry-over by volume, but the carry-over contains essentially all of the algorithmic
difficulty.

---

## 5. Fork points where the new product conflicts with Mosaic's settled rules

### (a) Edges: Mosaic derives connections from membership; the new product needs typed persistent edges

**The delivered model is a nullable foreign key, not an edge table.** From
`MosaicPackage/Sources/MosaicPersistence/Schema.swift:100-117` (migration v1):

```sql
CREATE TABLE "tiles" (
  "id" TEXT PRIMARY KEY NOT NULL ON CONFLICT REPLACE DEFAULT (uuid()),
  -- Tiles belong to the room's single canvas. A nullable workspace id
  -- is the explicit membership relationship; tile geometry is only
  -- placement and must not be used to derive this value.
  "roomID" TEXT NOT NULL REFERENCES "rooms"("id") ON DELETE CASCADE,
  "workspaceID" TEXT REFERENCES "workspaces"("id") ON DELETE SET NULL,
  ...
)
```

There is **no `edges` table anywhere** in `makeMosaicMigrator()` (v1–v13). The relation is one
column on the tile, so a tile belongs to **at most one** workspace and the wire is a *rendering*
of that single value.

**The connection type is literally the composite of its two endpoints.** From
`MosaicPackage/Sources/MosaicCore/WorkspaceHarnessGeometry.swift:3-14`:

```swift
/// The stable identity of one workspace-to-tile relationship.
///
/// Wires do not have a persisted identity. This value is only a convenient,
/// deterministic key for runtime geometry and port state.
public struct ConnectionID: Hashable, Equatable, Sendable {
  public var workspaceID: UUID
  public var nodeID: CanvasNodeID

  public init(workspaceID: UUID, nodeID: CanvasNodeID) {
    self.workspaceID = workspaceID
    self.nodeID = nodeID
  }
```

**The wire list is generated by filtering nodes on that column.** From
`WorkspaceHarnessGeometry.swift:506-513` and `:542-558`:

```swift
let members = nodes.filter { node in
  guard node.workspaceID == workspace.id,
    isFinite(node.frame),
    !node.frame.isEmpty,
    seenMemberIDs.insert(node.id).inserted
  else { return false }
  return true
}
```

```swift
for node in members {
  nodeFrames[node.id] = node.frame
  let connection = ConnectionID(workspaceID: workspace.id, nodeID: node.id)
  guard let port = layout.portByConnectionID[connection] else { continue }
  ...
  wires.append(Wire(id: connection, workspaceID: workspace.id, nodeID: node.id, ...))
}
```

The model comment restates the rule at `MosaicCore/CanvasModels.swift:186-189`:

```swift
/// The explicit workspace this tile belongs to. Nil means that the tile is
/// free in its room. Geometry is deliberately not consulted to infer this
/// value; frames and membership are independent pieces of state.
public var workspaceID: UUID?
```

And the design docs treat this as settled:
- `Documentation/Mosaic · Workspace Connector Refactor.md:95`
  `| Wire | 我属于哪个 Workspace？ | 否，派生 | 没有独立身份；由 workspaceID 和两个端点计算 |`
  ("Wire — which Workspace do I belong to? — No, derived — no independent identity; computed
  from `workspaceID` and the two endpoints.")
- `Documentation/Mosaic · Workspace Hub v3 · D3 连接线.md:154`
  `| 关系模型 | … | `ConnectionID(workspaceID, nodeID)` 由 membership 派生，无 wire 行 | 不变 …|`
  ("derived from membership, no wire rows — unchanged.")
- `Documentation/Mosaic · Workspace Hub v3 · D3 连接线.md:42`
  `不借：… 方向语义（Mosaic 的线是归属，不是数据流）`
  ("Not borrowed: … direction semantics — Mosaic's lines are *belonging*, not *data flow*.")
- `Documentation/Mosaic · Workspace Hub v3 · 设计契约与实施路线.md` §5.4
  `无箭头、无方向、无持续动画；… wire 默认不参与 hit testing，避免抢走终端、标题栏与 resize；`
  ("No arrowheads, no direction, no continuous animation; … wires do not participate in hit
  testing by default, so they do not steal hits from the terminal, title bar or resize.")
- Contract §15.4: `若这些入口在 keyboard 和 VoiceOver 下成立，wire 就应保持 presentation-only`
  ("if those entry points hold up under keyboard and VoiceOver, the wire must stay
  presentation-only"). Status: `建议 + 待可访问性验证` (proposal + pending accessibility
  validation).

**The conflict, precisely.** The new product's "drag a line out of a paragraph" gesture requires
(1) an edge with its own identity that survives membership changes, (2) a *typed*, *directed*
relation (paragraph → target), and (3) wire hit-testing / port dragging. Mosaic has settled
against **all three**:

| New product needs | Mosaic's settled position | Evidence |
| --- | --- | --- |
| Persistent edge rows | No edge table; relation is `tiles.workspaceID` | `Schema.swift:106`; no `edges` in v1–v13 |
| Edge identity independent of endpoints | `ConnectionID` *is* the endpoint pair | `WorkspaceHarnessGeometry.swift:3-9` |
| Typed / directed edge | "Mosaic's lines are belonging, not data flow" | `D3:42`; contract §5.4 "无箭头、无方向" |
| N-ary edges (a paragraph → many targets, or a target in many edges) | `tiles.workspaceID` is a single nullable FK | `Schema.swift:106`, `CanvasModels.swift:189` |
| Wire hit-testing / dragging from a port | Wires explicitly do not hit-test | contract §5.4, `D3:164` |
| Edges outlive membership | On workspace delete, `workspaceID` is `SET NULL` and the wire vanishes | `Schema.swift:106` (`ON DELETE SET NULL`) and `WorkspaceHarnessGeometry.swift:501` (`guard let anchor = workspace.anchor else { continue }`) |

**This is the single biggest fork point.** It is not a rendering change — it is a change to the
fact model. The port shape is: keep `ConnectionID`/`PortEdge`/`CubicBezier`/`WorkspaceWireRouter`
as the *geometry* layer, but introduce a real `edges` table with its own UUID, a `kind` column,
and `source`/`target` endpoints, and derive routing from the edge rows instead of from
`node.workspaceID`. `WorkspaceHarnessGeometry.resolve` would then take `[CanvasEdge]` rather than
filtering `nodes` by `workspace.id`; the router, cache, LOD and culling layers above it are
unaffected because they consume `ConnectionID`+frames, not membership.

**Migration cost is low; rule cost is high.** `edges` is a straightforward additive migration
(v14) with a backfill (`INSERT INTO edges SELECT uuid(), 'workspace', workspaceID, id FROM tiles
WHERE workspaceID IS NOT NULL`). The expensive part is that Mosaic's *product contract* says
wires are presentation-only, undirected belonging; the new product must retire that contract
explicitly rather than quietly repurpose the same renderer.

### (b) Scene restoration vs. the "attention is runtime only" rule

**The rule, stated as a do-not.** `Documentation/Mosaic · Handoff · Attention Layer.md:16-19`:

```
Status, the focus stack, and overview are **runtime only**. Do not persist
them, do not put them on undo, do not restore "waiting", MRU, or overview
across launch. Do not invent a second palette: amber and the succeeded
green already live on `MosaicPalette`.
```

Restated in the same document's "Do not" list, lines 173–174 and 181:

```
- Persist attention or MRU, or put either on the undo stack.
...
- Persist the overview camera, or put overview on undo.
```

And in code, as the doc comment on the vocabulary type —
`MosaicCore/TileAttention.swift:3-8`:

```swift
/// Runtime attention for a process tile (terminal / agent).
///
/// Not persisted, not undoable. Restart is quiet — a "waiting" that survives
/// launch is a lie. Only tiles that host a PTY have a status; web / note /
/// sticky / files / git / rain / windowStream stay out.
public enum TileAttentionStatus: String, Equatable, Sendable {
```

On the store — `MosaicCanvas/TileAttentionStore.swift:6-9`:

```swift
/// Runtime attention keyed by tile id.
///
/// Sibling of `TerminalSessionStore`: lives above the canvas, never touches
/// SQLite or undo. Missing records read as quiet.
```

On the MRU stack — `MosaicCore/TileFocusMRU.swift:4-8`:

```swift
/// Per-room focus stack for MRU bounce.
///
/// Newest first. Adjacent repeats collapse; the list caps at `capacity`.
/// Runtime only — not persisted, not undoable. A room switch keeps the
/// stacks; a relaunch starts empty.
```

The settlement is explicitly recorded as shipped in
`Handoff · Attention Layer.md:67`:
`| Persistence | **Settled.** `TileAttentionStore` is a sibling of `TerminalSessionStore`. `TileFocusMRU` lives on `AppFeature.State`. Restart is quiet and the stack is empty. |`

**The persistence boundary doc says the same thing about cursor position.**
`Documentation/Mosaic · Architecture & Data Model.md`, "不应保存到数据库" (should NOT be persisted),
lines 37–46:

```
### 不应保存到数据库

- PTY 文件描述符、`Process`、终端输出流
- `NSWindow`、`NSView`、`NSHostingView` 和 window stream 对象（`SCStream`、
  `CVPixelBuffer`、`CGWindowID` 会话句柄等）
- 高频光标位置、拖动中的每一帧 viewport
- 实时画面帧、临时缓存和瞬态 UI 状态
- Music.app / MusicKit 播放器状态、封面位图

这些属于 Runtime 层，由 actor、SessionRegistry、AppKit controller 或缓存管理。数据库只保存可恢复的描述。
```

Line 42 is the direct conflict: **`高频光标位置` — "high-frequency cursor position" — is on the
do-not-persist list.** The new product's "restore the caret position across launches" wants
exactly that value in the database.

**But the same document already grants the escape hatch.** Lines 48–52 describe the
sanctioned pattern for persisting an intent that outlives the runtime object:

```
Window-stream tile 就是按这条做的：库里只有可恢复的**意图**——
`WindowStreamBinding`（bundle id + app 名 + 当时的窗口标题），写在 tile 现成的
`content` 列里（JSON，没有新 schema）。`CGWindowID`、`SCStream`、帧全在
`WindowStreamSessionStore` 这个 Runtime 层，重启后按 binding 重新找窗口。
```

("The window-stream tile does exactly this: the database holds only the recoverable **intent** —
`WindowStreamBinding` (bundle id + app name + window title at the time) — written into the tile's
existing `content` column as JSON, with no new schema. The `CGWindowID`, `SCStream` and frames
all live in `WindowStreamSessionStore` at the Runtime layer; after a restart the window is found
again from the binding.")

The corresponding code is `MosaicCore/WindowStream.swift:3-15` and `:36-51`. Lines 5–9 explain
why it is *not* the live handle:

```swift
/// Deliberately not a window id: those are handed out per session, so a stored
/// one names nothing after a relaunch — often nothing even after the source app
/// is quit and reopened. The bundle id plus the title the window carried is
/// enough to find it again, and enough to say what the tile is bound to while
/// it is not streaming.
```

and lines 38–42 explain the storage rule:

```swift
/// A window-stream tile has no body of its own, so it borrows the text column
/// every tile already has rather than adding one only this kind would use.
/// JSON keeps the value legible to the agent surface and to anyone reading
/// the database, which is the rule that column is held to.
```

**The conflict, precisely.** The new product must restore a *writing scene*: caret position,
nearby cards, unresolved questions. Mosaic's rule forbids persisting attention/MRU/overview and
explicitly lists cursor position as runtime. The two are reconcilable **only** if the new product
distinguishes, in Mosaic's own vocabulary, between:

- **Runtime** (forbidden to persist): the live MRU stack, "waiting" status, the overview camera
  snapshot, drag frames, and the caret as a *high-frequency* stream.
- **Recoverable intent** (permitted, and already the house pattern): *the last caret anchor when
  the note was closed*, *the set of unresolved questions*, *which cards were near the caret* —
  i.e. a `WritingScene` codable written to a column, exactly as `WindowStreamBinding` is.

The real fork is that Mosaic has no such object and no column for it. You need either a new
`content`-JSON payload (no schema change, follows `WindowStreamBinding`) or a new table/column
(v14). The **settled rule does not block the feature**; it blocks the naive implementation
(writing the caret on every keystroke, persisting `waiting`, restoring an MRU stack). The
distinction must be written into the new product's own contract, because Mosaic's
`Handoff · Attention Layer.md:173` ("Persist attention or MRU, or put either on the undo stack")
will otherwise be read as forbidding the whole feature.

**A second, harder sub-conflict: `waiting` must not be restored, but unresolved questions must
be.** Line 17 forbids restoring "waiting" on the grounds that it would be a lie
(`TileAttention.swift:5-6`: "Restart is quiet — a 'waiting' that survives launch is a lie").
An unresolved question in the new product is *not* the same claim as "a process is waiting for
input right now" — it is durable authored content. Keeping those two concepts in separate types
with separate storage is what makes the rule survivable. Merging them into one "attention" table
will violate the rule and reintroduce the lie.

### (c) The note editor today: exactly what `NoteTextView` does and does not support

File: `MosaicPackage/Sources/MosaicCanvas/NoteNodeView.swift`, 422 lines.

**Architecture — three genuinely different views** (lines 5–13):

```swift
/// Note tile.
///
/// The three render tiers are genuinely different views, which is the whole
/// point of the tier system: only `.live` pays for the text system.
///
/// - `.thumbnail` — title only.
/// - `.preview` — title plus a static, non-editable body drawn by a text field.
/// - `.live` — a real `NSTextView`, created only for the focused tile.
```

Tier selection is the pure `NodeRenderTierResolver` (`.live` only when focused —
`CanvasModels.swift:406-408`).

**What it does support** (lines 287–329):

| Capability | Line | Detail |
| --- | --- | --- |
| Plain-text editing | 288–292 | `isEditable = true`, `isSelectable = true`, **`isRichText = false`** with the comment "Plain text only: the body has to stay legible to the data layer, so no font/colour attributes get baked into the stored string." |
| Undo | 298 | `allowsUndo = true` — but this is the `NSTextView`'s **own** `UndoManager`, not the app's TCA undo memento. |
| Spell check | 311–316 | `isContinuousSpellCheckingEnabled = true`; grammar, autocorrect, smart quotes, smart dashes and text replacement all **off** (developer-oriented: notes hold code and paths). |
| Find bar | 317–318 | `usesFindBar = true`, `isIncrementalSearchingEnabled = true`. |
| Font panel / colors | 297 | `usesFontPanel = true` (system panels available even though storage is plain). |
| Right-click text menu | 304–307 | Cut/Copy/Paste, Look Up, Spelling, Substitutions, Transformations, Speech, Font. |
| IME safety | 412–417 | `didChangeText()` skips the change callback while `hasMarkedText()`. |
| Esc handling | 419–421 | `cancelOperation` → `onEndEditing`. |
| Scroll | 277–284 | Overlay scrollers, no border, no focus ring. |
| Copy body | 354–360 | Copies live editor text, or stored body when not live, to `NSPasteboard`. |
| First-responder restoration after culling | 261–272 | Re-focuses the text view when the tile returns at `.live` tier. |

**What it does NOT support — the gap list for the new product:**

| Not supported | Evidence | Consequence for a writing product |
| --- | --- | --- |
| **No caret persistence.** | `beginEditing()` (lines 248–253) does `textView.setSelectedRange(NSRange(location: textView.string.count, length: 0))` — caret always jumps to the **end** of the text. A tier change to `.thumbnail`/`.preview` calls `teardownTextView()` (lines 225, 230 → 345–350), destroying the text view and its selection; returning to `.live` calls `makeTextViewIfNeeded()` (line 238) and `TileChrome.applyNoteEditorString` sets `text.string = string` (`TileChrome.swift:94-95`), resetting the selection again. Repo-wide, the **only** `selectedRange` reads are `MosaicControl/UIDriver.swift:586` (test driving) and two `insertText` helpers (`MosaicComponents/MosaicTextField.swift:203`, `MosaicFeatures/Agent/AgentSeedField.swift:42`) — none is for persistence. | The core new-product requirement ("restore caret position") has **no implementation at all**. This is new work, not a port. |
| **No markdown, no rich text, no attributes, no blocks.** | Line 292 `isRichText = false`; line 290–291 comment. Attributes are explicitly rejected so `content` stays agent-legible. | A structured writing document has no representation. `CanvasNode.content` is a single flat `String`. |
| **No paragraph identity.** | There is no paragraph/block model anywhere. `content` is one string; `TextTileMetrics.measuredHeight` (`MosaicCore/TextTile.swift:25-51`) splits on newlines only to measure. | "Drag a line out of a paragraph" needs a per-paragraph anchor with an identity that survives edits and relaunch. **Nothing in Mosaic provides this.** This is the deepest dependency of the new gesture. |
| **No document-level undo/redo integration.** | `allowsUndo = true` is the `NSTextView`'s own stack; `TileAttention`/MRU rules and the undo mementos live in TCA (`AppFeature`) and never see note keystrokes. | Undo semantics for the new editor are undefined and must be designed. |
| **No collaborative / multi-cursor editing.** | Absent. | Out of scope unless required. |
| **No link/attachment model in the text.** | Absent. A note is text; a web tile is a URL stored as a bare string (`MosaicCore/Web.swift:60`: `contentValue` is `url.absoluteString`). | The new product's typed edges need anchors *inside* the text that Mosaic has no notion of. |
| **No syntax/entity highlighting.** | Absent. | — |
| **No selection-to-edge gesture.** | `onTextChange` (322–325) reports the whole string; there is no selection callback, and `NoteTextView` (402–421) exposes only `onTextChange` / `onEndEditing` / `isUserEditing`. | The "drag a line out of a paragraph" gesture has no hook to start from. The new `NoteTextView` equivalent must publish selection/paragraph identity. |

**Bottom line for (c):** `NoteNodeView` is a competent *plain-text tile*, ~420 lines, whose
editing half is roughly 70 lines of `NSTextView` configuration (274–343) plus a 20-line subclass
(402–421). For the new product it is close to **zero reuse**: SwiftUI needs `TextEditor` or a
`UIViewRepresentable`/`NSViewRepresentable` around `UITextView`/`NSTextView`, and the entire
paragraph-anchor + caret-restore + edge-drag surface must be designed from scratch. What *is*
worth carrying is the *policy* encoded in lines 290–316 (plain text stays machine-legible; no
autocorrect/smart quotes because notes hold code and paths) and the tier discipline (only the
focused tile gets a live text system).

---

## 6. Persistence schema findings

### 6.1 Migration inventory

All migrations are registered in `makeMosaicMigrator()` at
`MosaicPackage/Sources/MosaicPersistence/Schema.swift:54-303`. There are **13**, and every one is
additive or a guarded backfill:

| # | Name (as registered) | Line | Change |
| --- | --- | --- | --- |
| v1 | `Create room → workspace → tile hierarchy v1` | 57 | `rooms`, `workspaces`, `tiles` + 3 indexes. All `STRICT` tables. |
| v2 | `Add tile camera shortcut v2` | 147 | `ALTER TABLE tiles ADD COLUMN shortcutDigit INTEGER` |
| v3 | `Add sticky color v3` | 156 | `ALTER TABLE tiles ADD COLUMN stickyColorRaw TEXT` |
| v4 | `Add workspace wallpaper v4` | 165 | `ALTER TABLE workspaces ADD COLUMN backgroundStyleRaw TEXT NOT NULL DEFAULT 'blank'` |
| v5 | `Add room pin and tint v5` | 175 | `rooms.pinnedAt`, `rooms.tintRaw` |
| v6 | `Add room soundtrack v6` | 190 | `rooms.soundtrackRaw` |
| v7 | `Move soundtrack to app settings v7` | 199 | Creates `appSettings`, inserts the well-known row `00000000-0000-4000-8000-000000000001`, drops `rooms.soundtrackRaw` |
| v8 | `Add sidebar pin to app settings v8` | 225 | `appSettings.isSidebarPinned` |
| v9 | `Add lobby room v9` | 234 | `rooms.isLobby`, `rooms.lastOpenedAt`, `appSettings.lastOpenedRoomID`, plus an idempotent `INSERT … WHERE NOT EXISTS` seeding the lobby room id `00000000-0000-4000-8000-000000000002` |
| v10 | `Add workspace hub anchors and shortcuts v10` | 286 | `workspaces.anchorX/anchorY/shortcutDigit`; backfills anchors from legacy region centres; nulls dangling/cross-room `tiles.workspaceID` |
| v11 | `Add workspace fold preference v11` | 290 | `workspaces.isFolded INTEGER NOT NULL DEFAULT 0` |
| v12 | `Add agent identity catalog v12` | 294 | `appSettings.agentProfilesRaw TEXT` |
| v13 | `Add tile profiles v13` | 298 | `tiles.profileRaw TEXT` |

The lobby migration is explicitly idempotent and the doc contract confirms it
(`Handoff · Attention Layer.md:86`: "Migration v9 is idempotent").

**There is no `edges` table in any version.** This is the schema-level expression of fork point
(a).

### 6.2 How JSON is stored in the `content` column

`tiles.content` is declared `"content" TEXT NOT NULL ON CONFLICT REPLACE DEFAULT ''`
(`Schema.swift:109`). It is **already polymorphic**: the column holds plain text for a note,
sticky or text tile, a bare URL string for a web tile, and a JSON object for five kinds
(windowStream, files, git, rain, agent). The rule is stated in code at
`MosaicCore/WindowStream.swift:38-42` (quoted in §5b) and `MosaicCore/CanvasModels.swift:183-185`:

```swift
/// Plain text body. Deliberately not an archived attributed string: tile
/// content has to stay legible to the data-layer agent surface.
public var content: String
```

The house pattern is a `Codable` struct with a failable `init?(content:)` /
static `parse(content:)` reader and a `contentValue` writer using
`JSONEncoder` with `.sortedKeys` so an unchanged value never dirties the tile. All six
`content` readers:

| Payload | Type declared at | Reader | Writer | Payload shape |
| --- | --- | --- | --- | --- |
| `WindowStreamBinding` | `MosaicCore/WindowStream.swift:10` | `init?(content:)` at `:43` | `contentValue` at `:56` | `{bundleIdentifier, applicationName, windowTitle}` |
| `FilesTileConfiguration` | `MosaicCore/FilesTile.swift:14` | `parse(content:)` at `:38` | `contentValue` at `:46` | `{rootPath?, rootSubdirectory, selectedPath?}`; collapses to `""` when default |
| `GitTileConfiguration` | `MosaicCore/GitTile.swift:3` | `parse(content:)` at `:18` | `contentValue` at `:26` | root path + selection |
| `RainTileConfiguration` | `MosaicCore/RainIntensity.swift:95` | `parse(content:)` at `:106` | `contentValue` at `:118` | intensity + thunderstorm |
| `AgentTileConfiguration` | `MosaicCore/AgentTile.swift:9` | `parse(content:)` at `:25` | `contentValue` at `:42` | agent kind, command, profile |
| web URL | `MosaicCore/Web.swift` | `init?(content:)` at `:54` | `contentValue` at `:60` | **not JSON** — the bare `url.absoluteString` |

Two encoding details worth preserving in the new product:
- `.sortedKeys` is deliberate (`WindowStream.swift:53-58`, `FilesTile.swift:49-50`) — stable
  bytes mean an unchanged binding does not dirty the tile.
- `FilesTileConfiguration` collapses the default value to `""` (`FilesTile.swift:47`:
  `guard self != FilesTileConfiguration() else { return "" }`) so nothing is written until the
  user configures something.

**Implication for the new product:** adding a `WritingScene` payload (caret anchor, nearby card
ids, unresolved question ids) needs **no schema change** — it is another `Codable` under this
exact pattern. That is the cheapest route to satisfying requirement (b) while staying inside
Mosaic's stated persistence boundary.

### 6.3 Are the SQLiteData / StructuredQueries migrations iOS-safe?

**Yes, with one caveat and one debug-mode hazard.**

- All DDL is plain SQL executed through `#sql(...).execute(db)`. It uses only features present in
  the system SQLite on iOS 16+: `STRICT` tables (SQLite 3.37+, present since iOS 15.4),
  `ON CONFLICT REPLACE`, `DEFAULT (uuid())`, `REFERENCES … ON DELETE CASCADE/SET NULL`,
  `ALTER TABLE … ADD COLUMN`, `ALTER TABLE … DROP COLUMN` (v7 line 219). No extension, no
  FTS tokenizer, no custom collation is registered.
- `SQLiteData` declares `.iOS(.v16)` (`sqlite-data/Package.swift:9`) and pulls GRDB 7.11.1,
  which declares `.iOS(.v13)` (`GRDB.swift/Package.swift:51`).
- The migration code has no `NS*`/`CG*` types and no macOS-only API. `Schema.swift` imports only
  `Dependencies`, `Foundation`, `IssueReporting`, `MosaicCore`, `OSLog`, `SQLiteData`.
- **Caveat — path resolution.** `mosaicDatabasePath()` (`Schema.swift:386-398`) uses
  `NSTemporaryDirectory()` for `.preview`/`.test` and `MosaicSupport.directory()` for `.live`.
  `NSTemporaryDirectory()` exists on iOS, but the production path must become the app
  container's Application Support directory; `RoomStore.swift:782,794` additionally uses
  `FileManager.default.homeDirectoryForCurrentUser`, which on iOS is the app sandbox root. These
  are semantic redesigns, not compile errors.
- **Hazard — DEBUG erases on schema change.** `Schema.swift:43-45`:
  ```swift
  var migrator = makeMosaicMigrator()
  #if DEBUG
    migrator.eraseDatabaseOnSchemaChange = true
  #endif
  ```
  Combined with `project.yml:81-88`, which gives the Debug build a *different bundle id, display
  name and Application Support folder*, this is intentional and safe on macOS. On iOS, keep the
  same separation or a schema iteration during development will silently destroy real work on a
  device.

### 6.4 Does any CloudKit sync code exist?

**No. None. Zero.** This is a documentation-vs-code gap that matters a great deal for the new
product.

- Repo-wide grep for `CloudKit`, `CKRecord`, `CKDatabase`, `NSUbiquitous`, `iCloud`,
  `SyncEngine`, `syncEngine` over `MosaicPackage/Sources` and `Mosaic/` returns exactly three
  hits, all false positives: `MosaicCanvas/RainAmbience.swift:65,85,88`, where `syncEngine()` is
  a **private method that synchronizes the rain audio engine**, unrelated to CloudKit.
- The app's entitlements are **empty dictionaries**:
  - `Mosaic/Mosaic.Debug.entitlements` → `<dict/>`
  - `Mosaic/Mosaic.Release.entitlements` → `<dict/>`
  There is no `com.apple.developer.icloud-services`, no `icloud-container-identifiers`, no
  `aps-environment`.
- `project.yml:32-111` declares one target (a macOS application), no iOS target, no iCloud
  capability, no CloudKit container.

Meanwhile `Documentation/Mosaic · Architecture & Data Model.md:24` states the intended
architecture:

```
SQLiteData 是持久化事实来源，StructuredQueries 负责类型安全的 schema 和查询，SyncEngine 负责可同步的 CloudKit 记录。
```

("SQLiteData is the source of truth for persistence, StructuredQueries handles the type-safe
schema and queries, and SyncEngine handles the syncable CloudKit records.") — and lines 54–59
lay out sync principles:

```
### 同步原则

- CloudKit 同步的是结构化记录，不是 iCloud Drive 中的 SQLite 文件。
- viewport、选区和运行状态默认本地化；只在用户明确保存布局时写入同步数据。
- 主键使用单一 UUID；避免复合主键、唯一索引和 CloudKit 保留字段。
- 为节点类型和 Room 建立可查询字段，必要时按 Room/Area 分批加载；不要在画布拖动热路径中持续触发数据库查询。
```

**So: the sync design exists as prose and constraint, and the implementation does not exist.** For
the new product this is good news and bad news:

- **Good news.** The schema was designed *for* CloudKit from the start: single-UUID primary keys
  are used everywhere (`Schema.swift:61,80,101,203`), there are no composite primary keys, and the
  only unique-ish constraints are the well-known sentinel rows. CloudKit's requirement that
  records have a single `String` primary key is satisfied. An iOS+macOS product that wants sync
  will not have to re-key the database.
- **Bad news.** The "for sync" design constraints were written to a doc, but **no sync code, no
  entitlement and no container were ever built** — so the assumptions are untested. Specifically,
  CloudKit forbids unique indexes, and the DDL uses `PRIMARY KEY … ON CONFLICT REPLACE`, which is
  a SQLite behaviour that has no CloudKit equivalent; conflict resolution on a real CloudKit
  layer would have to be designed. Budget this as new work, not as a port.
- **Also note:** if the new product is one binary on both macOS and iPadOS, it may not need a
  sync layer at all — one local database per device with CloudKit only for cross-device restore.
  That is a product decision the existing docs do not settle.

---

## 7. Reuse verdict (summary table)

Derivation, avoiding double-counting. Base: 72,104 lines in `MosaicPackage/Sources`.

| Bucket | Lines | Share | Composition |
| --- | ---: | ---: | --- |
| **A. Portable as-is** (add `.iOS` to `Package.swift`, move files) | ~10,000 | ~14% | `MosaicCore` AppKit-free lines (7,221) + all of `MosaicPersistence` (2,805) |
| **B. Portable with targeted edits** | ~15,000 | ~21% | `MosaicFeatures` AppKit-free lines (12,263, incl. `AppFeature` 3,852 and `MosaicAgentServer` 2,558) + `MosaicCanvas` AppKit-free lines (2,183) + `MosaicMCP` protocol half (396) + `MosaicControlClient` (78) + `TextTile` (102) |
| **C. macOS-only, keep behind `#if os(macOS)`** | ~5,000 | ~7% | Terminal PTY stack (1,334) + window-stream stack (1,546) + `MosaicControl` (1,953) + `mosaic` CLI (39) + `MosaicMCPShim` (106) |
| **D. Must be rewritten or dropped for SwiftUI** | ~42,000 | ~58% | All of `MosaicComponents` (7,413) + `MosaicFeatures` AppKit lines (16,298) + `MosaicCanvas` AppKit views (21,004 minus the ~2,880 already counted in C) |

**Realistic reusable share: roughly 35% of `MosaicPackage` by line count (buckets A + B), and
close to 100% of the parts that are hard to rebuild.** The 58% that must be rewritten is
mechanically simple view and event code, which SwiftUI makes considerably shorter per line than
AppKit; the surviving 35% is geometry, routing, LOD, culling, attention semantics and the
database schema — the parts where a rewrite would be slow and error-prone.

A more product-oriented framing: of the 72,104 lines, only about **10,000 lines (MosaicCore +
MosaicPersistence) are drop-in**, and they happen to include the entire wiring system and the
entire data model. Everything above them is new.

### The three most valuable carry-over assets

1. **`MosaicCore/WorkspaceHarnessGeometry.swift` (1,160 lines) plus
   `MosaicCore/WorkspaceWireRouter.swift` (458) and `MosaicCore/WorkspaceCircleGeometry.swift`
   (68)** — the complete deterministic wiring system: endpoint selection against the title bar,
   three routing families with hysteresis, rounded-corner arc fitting to cubic Béziers, sibling
   staggering by stable UUID order, occlusion detection, and the scene/visibility/culling
   projection with render tiers. Pure `Foundation`, world coordinates, `Double` only, already
   pinned by 197 lines of `WorkspaceWireRouterTests`. This is the asset the "drag a line out of a
   paragraph" gesture is built on.
2. **The whole of `MosaicCore` as a model + geometry layer (7,221 clean lines) with
   `MosaicPersistence` behind it (2,805 lines, 100% AppKit-free, 13 migrations)** — a
   CloudKit-shaped schema (single-UUID keys), a JSON `content` column with an established
   codable-payload convention, and the decision algorithm that Mosaic's own docs describe as the
   durable boundary. Enables the new product to start with a real persisted model instead of a
   toy store.
3. **The attention vocabulary and its runtime store: `MosaicCore/TileAttention.swift` (36),
   `MosaicCore/TileFocusMRU.swift` (108), `MosaicCore/TileOverview.swift` (21),
   `MosaicCanvas/TileAttentionStore.swift` (289), `MosaicCore/JumpPalette.swift` (313)** — the
   semantics of quiet/running/waiting/succeeded/failed, the cap-10 adjacent-deduped MRU stack
   with eligibility-aware bounce, the origin-viewport snapshot for reversible camera moves, and a
   313-line pure palette catalog. This is the closest thing in the repo to the new product's
   "unresolved questions + nearby cards" surface, and it is already written as runtime state with
   an explicit persistence boundary — which makes it the right thing to extend rather than
   replace.

### The single biggest fork point

**Mosaic's connection model is `tiles.workspaceID` — a single nullable foreign key with no edge
table, no edge identity, no direction and no hit-testing — while the new product needs typed,
directed, persistent edges that outlive membership.** The code says it outright at
`MosaicCore/WorkspaceHarnessGeometry.swift:3-9` ("Wires do not have a persisted identity… only a
convenient, deterministic key for runtime geometry"), the schema says it by having no `edges`
table across all 13 migrations (`Schema.swift:54-303`), and the design contract says it as a
settled rule at `Documentation/Mosaic · Workspace Hub v3 · D3 连接线.md:42` ("Mosaic's lines are
belonging, not data flow") and `:164` (wire hit-testing: 不命中). Every other finding in this
audit can be handled by porting, refusing, or `#if os(macOS)`. This one requires **retiring a
settled product rule and introducing a new persisted entity**, which is why it must be resolved
in the planning document before any code moves.

---

## Appendix A — File path index for the assets named above

All under `/Users/anderson/Developer/Mosaic/MosaicPackage/Sources/` unless noted.

**Carry-over (Tier A/B)**

- `MosaicCore/WorkspaceHarnessGeometry.swift` — 1,160 · `ConnectionID`, `PortEdge`, `CubicBezier`, `Scene`, `Visibility`, `WorkspaceHarnessGeometry.resolve`
- `MosaicCore/WorkspaceWireRouter.swift` — 458 · `Family`, `Shape`, `Parameters`, `Route`, `Previous`
- `MosaicCore/WorkspaceCircleGeometry.swift` — 68 · `circlePoint`, `endpoints`, `anchorCandidates`
- `MosaicCanvas/WorkspaceCircleRouteCache.swift` — 74 · invalidation by `(anchor, frame, titleHeight, siblingIndex, shape)`
- `MosaicCore/Geometry.swift` — 167 · `CanvasPoint/Size/Rect/Viewport`
- `MosaicCore/CanvasModels.swift` — 416 · `CanvasNode`, `CanvasNodeKind`, `CanvasWorkspace`, `CanvasWorkspacePresentation`, `NodeRenderTier`, `NodeRenderTierResolver`
- `MosaicCore/WorkspaceRelationLOD.swift` — 25 · relationship opacity ramp
- `MosaicCore/WorkspaceZoomAggregation.swift` — 38 · 0.28/0.40 hysteresis
- `MosaicCore/WorkspaceArrangement.swift` — 23
- `MosaicCore/WorkspaceHubProjection.swift` — 289 · fold/reveal/overview layout
- `MosaicCore/TileAttention.swift` — 36
- `MosaicCore/TileFocusMRU.swift` — 108
- `MosaicCore/TileOverview.swift` — 21
- `MosaicCore/JumpPalette.swift` — 313
- `MosaicCore/TextTile.swift` — 102 (guarded)
- `MosaicCore/WindowStream.swift` — 256 (`WindowStreamBinding` pattern, portable; the session half is not)
- `MosaicCore/FilesTile.swift` — 169, `MosaicCore/GitTile.swift` — 807 (config portable, `runGit` not), `MosaicCore/AgentTile.swift` — 621, `MosaicCore/RainIntensity.swift` — 125
- `MosaicCanvas/TileAttentionStore.swift` — 289, `MosaicCanvas/TileAttentionCopy.swift` — 61
- `MosaicCanvas/SpatialGrid.swift` — 86, `MosaicCanvas/CanvasTransform.swift` — 78
- `MosaicCanvas/SceneDiff.swift` — 148, `MosaicCanvas/CanvasWorkspaceRegion.swift` — 99
- `MosaicCanvas/WeatherRainScene.swift` — 457 (pure sim; the `MTKView` host in `WeatherRainView.swift` is not)
- `MosaicPersistence/*` — 2,805 total

**Rewrite**

- `MosaicCanvas/InfiniteCanvasNSView.swift` — 2,805
- `MosaicCanvas/CanvasWorkspaceNSView.swift` — 1,041
- `MosaicCanvas/CanvasNodeContent.swift` — 568, `CanvasNodeHostView.swift` — 345
- `MosaicCanvas/WorkspaceHarnessController.swift` — 923 (`WorkspaceHarnessLayer: CALayer`, `draw(in:)` at line 91)
- `MosaicCanvas/WorkspaceCirclePreviewView.swift` — 934
- `MosaicCanvas/AttentionPillView.swift` — 235, `FocusSwitchHUD.swift` — 275, `GlanceNodeView.swift` — 197, `LobbyQuickStartView.swift` — 699
- `MosaicComponents/**` — 7,413 (24/25 files AppKit), notably `MosaicContextMenu.swift` 1,361, `MosaicSheet.swift` 851, `MosaicOutlineView.swift` 766
- `MosaicControl/**` — 1,953 (recommend macOS-Debug-only)
- `MosaicMCP/MCPSocketServer.swift` — 243
- `MosaicFeatures/MosaicRootViewController.swift` — 3,291, `Canvas/CanvasWorkspaceViewController.swift` — 2,374

**Fork-point evidence**

- `MosaicPersistence/Schema.swift:54-303` (13 migrations, no `edges`), `:100-117` (`tiles.workspaceID` FK + comment), `:43-45` (DEBUG erase)
- `MosaicCore/WorkspaceHarnessGeometry.swift:3-14` (`ConnectionID` doc), `:506-513` and `:542-558` (membership-derived wires)
- `MosaicCore/CanvasModels.swift:186-189` (`workspaceID` comment)
- `Documentation/Mosaic · Workspace Connector Refactor.md:95` (wire "no independent identity")
- `Documentation/Mosaic · Workspace Hub v3 · D3 连接线.md:42`, `:154`, `:164`
- `Documentation/Mosaic · Workspace Hub v3 · 设计契约与实施路线.md` §5.4, §14, §15.4
- `Documentation/Mosaic · Handoff · Attention Layer.md:16-19`, `:67`, `:173-181`
- `Documentation/Mosaic · Architecture & Data Model.md:24`, `:37-46`, `:48-52`, `:54-59`
- `MosaicCanvas/NoteNodeView.swift:5-13`, `:248-253`, `:274-343`, `:345-350`, `:402-421`

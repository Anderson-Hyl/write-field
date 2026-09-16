# Apple Native Text APIs and LaTeX/Math Typesetting

**Research date:** 2026-09-16 · **Target:** iOS 26/27-era SDKs, SwiftUI, iPadOS + macOS, App Store

## Bottom line

**No Apple-native text API provides LaTeX or mathematical typesetting.** Neither SwiftUI `Text`, `AttributedString`, `AttributeScopes`, nor Core Text exposes a math/LaTeX attribute, intent, or renderer on the pages checked below. Rendering LaTeX requires bundling a third-party engine (MathJax in `WKWebView`, or native SwiftMath/iosMath over Core Text). The JIT situation (Section 5) is the main platform constraint.

## 1. SwiftUI `Text` and Foundation `AttributedString`

- SwiftUI `Text` has 7 initializers (plain, verbatim, styled, format, formatter, timer-interval, table-name variants) — **none math-related**. [swiftui/text](https://developer.apple.com/documentation/swiftui/text)
- `InlinePresentationIntent` has exactly **8 cases**: `code`, `emphasized`, `lineBreak`, `softBreak`, `strikethrough`, `stronglyEmphasized`, `inlineHTML`, `blockHTML`. **There is no `math` case.** [foundation/inlinepresentationintent](https://developer.apple.com/documentation/foundation/inlinepresentationintent)
- `AttributeScopes.FoundationAttributes` covers date, language, URL, presentation intent, string formatting, localization, grammar agreement, number formatting, person name, Markdown source position and measurement attributes. **No math attribute.** [foundationattributes](https://developer.apple.com/documentation/foundation/attributescopes/foundationattributes)
- `AttributeScopes.SwiftUIAttributes` carries `font`, `foregroundColor`, `tracking`, `kern`, `baselineOffset`, `lineHeight`, `alignment`, `adaptiveImageGlyph`, `strikethroughStyle`, `underlineStyle`. **No math attribute.** [swiftuiattributes](https://developer.apple.com/documentation/foundation/attributescopes/swiftuiattributes)
- `AttributeScopes` declares `FoundationAttributes`, `SwiftUIAttributes`, `UIKitAttributes`, `AppKitAttributes`, `TranslationAttributes`, `AccessibilityAttributes`, `CoreTextAttributes`, `SpeechAttributes`. **There is no `MathAttributes`.** [foundation/attributescopes](https://developer.apple.com/documentation/foundation/attributescopes)
- Block-level `PresentationIntent` offers only `Kind`, `IntentType`, `TableColumn` — no math kind. [presentationintent](https://developer.apple.com/documentation/foundation/presentationintent)
- A literal `math` grep over the full doc payloads for SwiftUI `Text` and `AttributedString` returned **zero** content matches (the only hits were unrelated prose — "a mathematical set interface to a bit set" in `OptionSet`). [text.json](https://developer.apple.com/tutorials/data/documentation/swiftui/text.json) · [attributedstring.json](https://developer.apple.com/tutorials/data/documentation/foundation/attributedstring.json)

## 2. WWDC 2025 and WWDC 2026

- Enumerated **122 WWDC 2025 sessions** and **138 WWDC 2026 sessions** from the official lists. A case-insensitive grep for `math` across both session-list pages returned **2 hits in 2025, 0 in 2026**. Both 2025 hits are the same Swift Charts 3D description ("visualize mathematical surfaces") — not a math-typesetting API. [wwdc2025](https://developer.apple.com/videos/wwdc2025/) · [wwdc2026](https://developer.apple.com/videos/wwdc2026/)
- The text-centric sessions contain **zero** math mentions: [WWDC25-280](https://developer.apple.com/videos/play/wwdc2025/280/) (AttributedString rich text), [WWDC25-256](https://developer.apple.com/videos/play/wwdc2025/256/) and [WWDC26-269](https://developer.apple.com/videos/play/wwdc2026/269/) ("What's new in SwiftUI"), [WWDC26-370](https://developer.apple.com/videos/play/wwdc2026/370/) ("Elevate your app's text experience with TextKit").
- **Clear negative result:** no math/LaTeX typesetting API was announced at WWDC 2025 or WWDC 2026 in any enumerated session.

## 3. Math Notes / Calculator API

No public API. The only Apple-documented Math Notes surface is an **MDM configuration** object: "If present, configures the Math Notes mode of the calculator." [MathSettingsCalculator_MathNotesModeObject](https://developer.apple.com/documentation/devicemanagement/mathsettingscalculator_mathnotesmodeobject) · [MathSettingsSystemBehaviorObject](https://developer.apple.com/documentation/devicemanagement/mathsettingssystembehaviorobject). There is no `Notes` or `Calculator` developer framework (both doc paths returned HTTP 404).

## 4. Core Text

Core Text's top-level symbol index has **24 entries and no math-related symbol** — `CTFont`, `CTFontDescriptor`, `CTFrame`, `CTFramesetter`, `CTGlyphInfo`, `CTLine`, `CTParagraphStyle`, `CTRun`, `CTTypesetter`, `CTRubyAnnotation` and index categories. A `math` grep over the payload returned 0. [coretext](https://developer.apple.com/documentation/coretext)

## 5. JIT / App Store constraints relevant to MathJax in `WKWebView`

- **App Store Review Guidelines 2.5.2** (verbatim): "Apps should be self-contained in their bundles, and may not read or write data outside the designated container area, nor may they download, install, or execute code which introduces or changes features or functionality of the app, including other apps." No LaTeX-specific prohibition exists. [App Store Review Guidelines](https://developer.apple.com/app-store/review/guidelines/)
- Apple's JIT entitlement path is **gated to alternative browser engines**, region-limited (EU/Japan): the `WebContentExtension` is "the web content extension that the app uses to parse HTML content and compile code just-in-time," and building one means you must "apply for the entitlements from Apple." [Developing a browser app using an alternative browser engine](https://developer.apple.com/documentation/browserenginekit/developing-a-browser-app-that-uses-an-alternative-browser-engine) · [Protecting code compiled just in time](https://developer.apple.com/documentation/browserenginekit/protecting-code-compiled-just-in-time)
- Apple's JIT entitlement reference **names JavaScriptCore explicitly**: it governs writable+executable memory via `MAP_JIT`; "Examples include: The fast-path of the JavaScriptCore framework... Without the [entitlement], frameworks that rely on just-in-time (JIT) compilation **may fall back to an interpreter**." This is a **macOS Hardened Runtime** exception with no iOS equivalent for ordinary apps. [com.apple.security.cs.allow-jit](https://developer.apple.com/documentation/bundleresources/entitlements/com.apple.security.cs.allow-jit) · [Hardened Runtime](https://developer.apple.com/documentation/security/hardened-runtime)
- **Planning implication:** an in-process JavaScriptCore math renderer would run interpreted (slow); `WKWebView` avoids that. `WKWebView` is documented as "An object that displays interactive web content, such as for an in-app browser," with no JIT caveat. [wkwebview](https://developer.apple.com/documentation/webkit/wkwebview) · [WWDC25-231 Meet WebKit for SwiftUI](https://developer.apple.com/videos/play/wwdc2025/231/)

## UNVERIFIED

1. Whether a **private/SPI** math engine powers Math Notes or is reachable via SPI — no public page states or denies this.
2. That **`WKWebView` specifically receives JIT compilation** on iOS — widely-held inference from the entitlement gating, but no fetched Apple page states it affirmatively.
3. That **`JavaScriptCore` (in-process `JSContext`) runs without JIT on iOS** — Apple's `allow-jit` page establishes the mechanism and names JavaScriptCore, but it is a macOS page. [javascriptcore](https://developer.apple.com/documentation/javascriptcore) contains no JIT content.
4. Whether the **iOS 27 SDK** adds a math API after WWDC 2026; I checked the WWDC 2026 session list and current doc payloads, but did not diff SDK release notes.
5. Any **App Store precedent** for apps bundling MathJax, and any Apple statement *permitting* a bundled LaTeX engine — 2.5.2 addresses *downloaded* code, and I found nothing resolving the "bundled interpreted JS" edge case.

**Absence-of-evidence caveat:** these negatives reflect exactly the pages listed, checked on 2026-09-16; they are not proof that no such API exists anywhere in Apple's SDKs.

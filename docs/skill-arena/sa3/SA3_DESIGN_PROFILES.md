# SA3 Design Profiles Dossier

## 1. Design Grammar Architecture
Design Profiles encapsulate aesthetic philosophies, visual density standards, typography hierarchies, and interaction behaviors. Aesthetic decisions are inherently multi-paradigm: forcing a single visual language across developer dashboards, consumer spatial computing, and multi-form-factor mobile apps creates severe degradation of user experience.

SA3 defines **4 distinct Design Profiles**:

---

## 2. Profile Definitions

### PROFILE-DESIGN-001: Minimalist & Brutalist Web Design Grammar
- **Profile ID**: `PROFILE-DESIGN-001`
- **Name**: Minimalist & Brutalist Web Design Grammar
- **Member Rules**: 3 rules (including `RULE-TASTE-000701`, `RULE-TASTE-000702`, `RULE-TASTE-000703`).
- **Intended Context**: Data-dense web tools, developer consoles, documentation, and high-focus productivity applications.
- **Visual Principles**: High contrast monochrome surfaces, crisp 1px borders, zero box-shadows, zero gradients, zero frosted-glass blurs.
- **Motion Principles**: Instant snap transitions or minimal linear duration (< 100ms); zero spring physics bounce.
- **Layout Principles**: Rigid grid alignments, monospaced tabular data displays, strict visual hierarchy.
- **Incompatible Contexts**: Consumer mobile apps requiring native OS material depth; visionOS spatial computing.

---

### PROFILE-DESIGN-002: Apple Liquid Glass Spatial Design Grammar
- **Profile ID**: `PROFILE-DESIGN-002`
- **Name**: Apple Liquid Glass Spatial Design Grammar
- **Member Rules**: 0 direct primary rules (referenced primarily via Version Family `VERSION-FAMILY-006` and Platform Profile `PROFILE-PLAT-002`).
- **Intended Context**: Native Apple consumer applications on iOS 26+, iPadOS, and visionOS requiring tactile spatial depth.
- **Visual Principles**: Real-time refractive materials, dynamic specular highlights, contextual glass tinting, interactive morphing surfaces.
- **Motion Principles**: Fluid spring curves, velocity-matched gesture tracking, continuous spatial transitions.
- **Layout Principles**: Floating toolbars, content-driven translucent background extension.
- **Incompatible Contexts**: High-throughput terminal emulators, low-power embedded displays, strict brutalist web dashboards.

---

### PROFILE-DESIGN-003: Material 3 Adaptive Design Grammar
- **Profile ID**: `PROFILE-DESIGN-003`
- **Name**: Material 3 Adaptive Design Grammar
- **Member Rules**: 15 rules (including adaptive layout, window size class breakpoints, and Jetpack Compose adaptive navigation rules).
- **Intended Context**: Android multi-form-factor ecosystems (compact phones, medium foldables, expanded tablets, desktop ChromeOS, Android TV).
- **Visual Principles**: Dynamic color extraction (Material You), elevation tonal palettes, rounded container shapes.
- **Motion Principles**: Standard, emphasized, and decelerate easing curves responsive to screen dimension transitions.
- **Layout Principles**: Responsive navigation rails transitioning to bottom navigation bars based on WindowWidthSizeClass.
- **Incompatible Contexts**: Monolithic single-breakpoint web sites, iOS Human Interface Guidelines purist apps.

---

### PROFILE-DESIGN-004: Headless Accessible Primitives Grammar
- **Profile ID**: `PROFILE-DESIGN-004`
- **Name**: Headless Accessible Primitives Grammar
- **Member Rules**: 3 rules (including Radix UI, Shadcn, and headless WAI-ARIA pattern enforcement).
- **Intended Context**: Cross-framework component systems (React, Vue, Svelte) requiring strict WCAG AA/AAA compliance with unstyled presentation.
- **Visual Principles**: Style-agnostic semantic HTML structure; keyboard focus rings and visible contrast boundaries.
- **Motion Principles**: Strict compliance with `prefers-reduced-motion` media queries.
- **Layout Principles**: Compound component slotting and keyboard traversal focus traps.
- **Incompatible Contexts**: Canvas-rendered non-DOM user interfaces.

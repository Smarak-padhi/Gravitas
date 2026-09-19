# Gravitas Design System Specification
**Wave 7.5 Design Collaboration Document**

---

## 1. System Architecture

The Gravitas Design System provides cohesive, desktop-grade UI components and tokens built for high density, visual clarity, and keyboard-first developer operations.

Located at `apps/web/src/design-system/`:
```
apps/web/src/design-system/
├── tokens.css             # Semantic CSS variables (colors, surfaces, typography, elevation)
├── motion.css             # Functional motion keyframes and transition rules
├── components/            # Atomic, reusable UI primitives
│   ├── Button.tsx         # Primary, secondary, danger, ghost variants
│   ├── Badge.tsx          # Status and role indicator pills
│   ├── Card.tsx           # Elevated surface container
│   ├── Panel.tsx          # Headered section wrapper with optional controls
│   ├── Tabs.tsx           # Segmented view switcher
│   ├── Dialog.tsx         # Accessible keyboard-dismissible modal
│   ├── StatusIndicator.tsx# State dot + descriptive label combo
│   ├── EmptyState.tsx     # Clean empty placeholders with action CTA
│   └── Tooltip.tsx        # High-density contextual hint
```

---

## 2. Design Tokens

### 2.1 Surfaces & Backgrounds
```css
:root {
  --bg-app: #07090e;              /* Deep canvas background */
  --bg-panel: #0d111a;            /* Primary container surface */
  --bg-panel-elevated: #141a26;   /* Secondary card / header surface */
  --bg-panel-subtle: #101520;     /* Muted secondary surface */
  --bg-surface-active: #1b2333;   /* Active selection highlight */
}
```

### 2.2 Borders & Dividers
```css
:root {
  --border-subtle: #1a2233;       /* Subtle internal dividers */
  --border-color: #242e42;        /* Standard container borders */
  --border-focus: #3b82f6;        /* Keyboard focus and primary active ring */
  --border-hover: #374663;        /* Interactive hover border */
}
```

### 2.3 Typography & Text
```css
:root {
  --font-sans: 'Space Grotesk', system-ui, -apple-system, sans-serif;
  --font-mono: 'JetBrains Mono', ui-monospace, Menlo, Monaco, monospace;

  --text-primary: #f8fafc;        /* High-contrast primary text */
  --text-secondary: #94a3b8;      /* Readable metadata and labels */
  --text-muted: #64748b;          /* Secondary hints and timestamps */
  --text-dim: #475569;            /* Disabled or subtle borders */
}
```

### 2.4 Semantic Engine States
```css
:root {
  /* READY / ASSIGNED */
  --state-ready-fg: #94a3b8;
  --state-ready-bg: #161e2e;
  --state-ready-border: #2e3d59;

  /* RUNNING / WORKING */
  --state-running-fg: #38bdf8;
  --state-running-bg: #0c2538;
  --state-running-border: #0284c7;

  /* VERIFYING */
  --state-verifying-fg: #fbbf24;
  --state-verifying-bg: #382006;
  --state-verifying-border: #d97706;

  /* WAITING_APPROVAL / NEEDS_YOU */
  --state-waiting-fg: #fde047;
  --state-waiting-bg: #3a2206;
  --state-waiting-border: #eab308;
  --state-waiting-glow: rgba(234, 179, 8, 0.35);

  /* SUCCEEDED / APPROVED / DONE */
  --state-success-fg: #4ade80;
  --state-success-bg: #062b16;
  --state-success-border: #16a34a;

  /* FAILED */
  --state-failure-fg: #f87171;
  --state-failure-bg: #3b0d0d;
  --state-failure-border: #dc2626;
}
```

### 2.5 Attention Severity (Human Inbox)
```css
:root {
  --severity-action-fg: #fde047;
  --severity-action-bg: #422006;
  --severity-action-border: #eab308;

  --severity-critical-fg: #f87171;
  --severity-critical-bg: #450a0a;
  --severity-critical-border: #dc2626;

  --severity-important-fg: #fbbf24;
  --severity-important-bg: #3b2207;
  --severity-important-border: #d97706;

  --severity-fyi-fg: #94a3b8;
  --severity-fyi-bg: #161e2e;
  --severity-fyi-border: #242e42;
}
```

### 2.6 Spacing & Elevation
```css
:root {
  --radius-sm: 4px;
  --radius-md: 6px;
  --radius-lg: 8px;
  --radius-xl: 12px;

  --shadow-sm: 0 1px 2px 0 rgba(0, 0, 0, 0.3);
  --shadow-md: 0 4px 6px -1px rgba(0, 0, 0, 0.4);
  --shadow-lg: 0 10px 15px -3px rgba(0, 0, 0, 0.5);
  --shadow-modal: 0 20px 40px rgba(0, 0, 0, 0.7);

  --z-base: 1;
  --z-drawer: 40;
  --z-console: 50;
  --z-modal: 100;
  --z-palette: 200;
  --z-tooltip: 300;
}
```

---

## 3. Atomic Primitives Contracts

All components strictly accept standard HTML attributes and use semantic tags (`<button>`, `<header>`, `<dialog>`, `<section>`). Every interactive element features a visible outline ring on `:focus-visible` (`2px solid var(--border-focus)`).

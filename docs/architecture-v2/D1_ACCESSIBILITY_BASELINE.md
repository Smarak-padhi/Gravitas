# D1 Accessibility & Semantic UI Baseline

## 1. Accessibility Architecture
The GRAVITAS Command Center is built with native semantic HTML and comprehensive ARIA patterns, ensuring full accessibility for keyboard, screen-reader, and power users without depending on heavy third-party UI component frameworks.

## 2. Landmark Structure
The document hierarchy enforces standard WAI-ARIA landmark roles:
- `<header role="banner">`: Application title, environment badge, connection status indicator, and quick refresh control.
- `<nav role="navigation" aria-label="Command Center Navigation">`: Tab navigation container with `role="tablist"`.
- `<main role="main">`: The primary content container hosting the active surface view.
- `<dialog id="approval-dialog" role="dialog" aria-modal="true" aria-labelledby="dialog-title">`: Accessible modal for approving or rejecting tasks.
- `<div id="status-announcer" class="sr-only" aria-live="polite" aria-atomic="true">`: Visually hidden live announcer for non-intrusive screen reader notifications.

## 3. Tablist Keyboard Navigation
Tabs implement the W3C Tabs Pattern:
- **Roles**: Container has `role="tablist"`, buttons have `role="tab"`, active tab has `aria-selected="true"` and `tabindex="0"`; inactive tabs have `aria-selected="false"` and `tabindex="-1"`.
- **Arrow Navigation**: Left/Right or Up/Down arrows cycle through tabs.
- **Activation**: Space or Enter activates the focused tab.
- **Panels**: The active surface container is assigned `role="tabpanel"` and labelled by the corresponding tab ID.

## 4. Modal Dialog & Focus Management
The approval confirmation interface uses the native HTML `<dialog>` element:
- **Focus Trapping**: Native browser `<dialog>` automatically traps keyboard focus within the modal when invoked via `.showModal()`.
- **Initial Focus**: Focus is automatically directed to the reason text input or the first actionable control.
- **Escape Key**: Pressing `Escape` naturally cancels and closes the modal without submitting any mutation intent.
- **Focus Restoration**: Upon dialog closure (via Approve, Reject, or Cancel), keyboard focus is explicitly restored to the button or element that triggered the modal.

## 5. Visual Ergonomics & Contrast
- **Theme**: Dark theme optimized for high legibility (#0d1117 surface, #f0f6fc primary text, #8b949e secondary text).
- **Contrast Ratios**: Exceeds WCAG 2.1 AA requirement (minimum 4.5:1 for normal text, 3:1 for large text and UI components).
- **Focus Rings**: Prominent 2px solid cyan (`#58a6ff`) focus outline with 2px offset applied globally via `:focus-visible`.
- **Status Badges**: Distinct color-coding and accompanying text labels (e.g. green `VERIFIED_PASS`, red `VERIFIED_FAIL`, amber `INCONCLUSIVE`) to avoid relying solely on color to convey state.
- **Responsive Layout**: Zero horizontal overflow at standard viewport dimensions (1024x768 and above).

## 6. Verification Evidence
Verified by `apps/desktop/src/qa-browser.mjs`:
- `hasHeader: true`, `hasNav: true`, `hasMain: true`, `hasDialog: true`, `hasLiveAnnouncer: true`
- `tabsHaveAriaSelected: true`, `dialogHasAriaLabel: true`
- `hasHorizontalOverflow: false`
- `consoleErrors: []`

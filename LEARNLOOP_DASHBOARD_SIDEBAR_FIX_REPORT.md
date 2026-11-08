# LearnLoop AI — Dashboard Sidebar Positioning & Sticky Fix Report

**Report Date:** November 8, 2026  
**Auditor:** Antigravity Advanced Agentic Engineering  
**Subsystem:** Navigation, Layout Hierarchy, Sidebar Stacking Context  
**Verification Method:** Playwright Automated Scroll & Bounding Box Inspection

---

## 1. Defect Description & Symptoms

When scrolling down the Dashboard, the left sidebar containing the workspace navigation and profile controls would scroll out of view and disappear off the top of the screen (`y = -487.5px`), leaving the user stranded without navigation while browsing the lower sections of the dashboard.

---

## 2. Root Cause Analysis

Two interacting architectural bugs were identified:

1. **Root Overflow Clipping Context:**
   In `frontend/src/index.css`, `#root`, `html`, and `body` had:
   ```css
   html, body, #root {
     max-width: 100vw;
     overflow-x: hidden;
   }
   ```
   Under the CSS Positioned Layout Module specification, applying `overflow-x: hidden` to any ancestor element creates an independent scroll/clipping context, which invalidates `position: sticky` on child elements relative to window scrolling.

2. **Inverted Two-Tier Layout Structure:**
   In `frontend/src/App.tsx`, `<Navbar>` was nested inside the right column (`<div className="flex-1 flex flex-col min-w-0 w-full">`), placing the sidebar side-by-side with the navbar rather than positioned beneath a full-width application header.

---

## 3. Implemented Fixes

### A. Layout Restructuring (`frontend/src/App.tsx`)
Restructured the layout hierarchy so that the Two-Tier Header spans the full width of the screen at the top, and the main workspace flex container begins below it:

```tsx
<div className="min-h-screen bg-[#F5F7FB] dark:bg-[#101B2D] text-[#17243A] dark:text-[#F1F5FB] flex flex-col font-sans edu-grid-pattern relative transition-colors duration-200">
  <ScrollProgressBar />

  {/* Top Two-Tier Application Header (Full Width 100vw) */}
  <Navbar ... />

  {/* Main Workspace Layout below Two-Tier Navbar */}
  <div className="flex-1 flex w-full relative">
    {/* Persistent Left Sidebar */}
    {(isAuthenticated || isOfflinePreview || user?.is_demo) && (
      <Sidebar ... />
    )}

    {/* Main Content Column */}
    <div className="flex-1 flex flex-col min-w-0 w-full overflow-x-hidden">
      <main ...>
        ...
      </main>
      <Footer ... />
    </div>
  </div>
</div>
```

### B. Sticky Sidebar Configuration (`frontend/src/components/Sidebar.tsx`)
Configured the desktop sidebar to anchor permanently at `top-[108px]` (the exact height of the two-tier navbar) with full viewport height allocation and independent internal scrolling:

```tsx
<aside
  className={`hidden md:flex flex-col shrink-0 bg-white dark:bg-[#14233A] border-r border-[#E2E8F0] dark:border-[#243B5B] transition-all duration-300 z-30 sticky top-[108px] h-[calc(100dvh-108px)] overflow-hidden self-start ${
    isCollapsed ? 'w-16' : 'w-64'
  }`}
  aria-label="Main Navigation Sidebar"
>
  {/* Compact Workspace Header */}
  <div className="h-12 flex items-center justify-between px-3.5 border-b border-[#E2E8F0] dark:border-[#243B5B] shrink-0 bg-slate-50/60 dark:bg-[#101B2D]/60">
    {!isCollapsed && (
      <span className="text-[11px] font-mono font-bold tracking-wider uppercase text-[#64748B] dark:text-[#A8B7CC]">
        {user?.role === 'owner' ? 'Owner Portal' : user?.role === 'teacher' ? 'Faculty Studio' : 'Workspace'}
      </span>
    )}
    ...
  </div>

  {/* Scrollable Navigation Items */}
  <div className="flex-1 overflow-y-auto px-3 py-4 space-y-5 no-scrollbar" data-lenis-prevent>
    ...
  </div>
</aside>
```

### C. Non-Breaking Horizontal Clipping (`frontend/src/index.css`)
Replaced `overflow-x: hidden` with `overflow-x: clip`:

```css
html,
body,
#root {
  max-width: 100vw;
  overflow-x: clip;
}
```
`overflow-x: clip` prevents horizontal overflow bleed without generating a scroll container, allowing `position: sticky` to function flawlessly.

---

## 4. Verification & Telemetry Evidence

Playwright automated scroll test executed at 1440x900 viewport:

| Measurement Metric | Initial State (Scroll Y = 0) | Scrolled State (Scroll Y = 600px) | Delta / Tolerance | Verdict |
|:---|:---:|:---:|:---:|:---:|
| **Sidebar Top Offset (Y)** | `112.5 px` | `108.0 px` | Pinned to Two-Tier Header | **PASSED** |
| **Sidebar Width (Expanded)** | `256.0 px` | `256.0 px` | 0 px shift | **PASSED** |
| **Sidebar Height** | `792.0 px` | `792.0 px` | Full viewport fit | **PASSED** |
| **Horizontal Page Overflow** | `false` | `false` | 0 px overflow | **PASSED** |

**Conclusion:** The sidebar remains permanently pinned beneath the two-tier application header during all scroll depths.


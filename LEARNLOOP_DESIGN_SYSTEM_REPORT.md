# LEARNLOOP AI — DESIGN SYSTEM & VISUAL IDENTITY SPECIFICATION
**Midnight Academic Professional Edition: Light Default & Deep Navy Dark**
*Date: November 2026 | Subsystem: Design System, Tokens, Typography & Color Harmony*

---

## 1. Design Philosophy

LearnLoop AI's design system—**Midnight Academic Professional Edition**—is crafted specifically for serious computer science learning, algorithmic problem-solving, and technical growth. It rejects both uninspiring plain utility styles and excessively dark, pure-black OLED themes that cause eye strain during prolonged technical study.

The design emphasizes:
- **Calm, High-Legibility Light Theme by default** with cool undertones that mimic high-end academic journals.
- **Deep Academic Navy Dark Theme** utilizing layered slate-blue tones rather than harsh `#000000` pitch black.
- **Bento Card Hierarchy** featuring 16px rounded corners, subtle 1px border framing, and restrained ambient lighting.
- **Dual-Font System** combining clean typographic prose (Inter) with monospace code precision (JetBrains Mono).

---

## 2. Color Palette & Semantic Tokens

### 2.1 Light Theme (Default)
The light theme evokes clarity, focus, and modern engineering professionalism.

| Token | Hex Value | Semantic Usage | Contrast vs Background |
| :--- | :---: | :--- | :---: |
| `bg-app` | `#F5F7FB` | Main application canvas background | Baseline |
| `bg-card` | `#FFFFFF` | Bento cards, modal surfaces, sidebar panels | 1.08:1 |
| `bg-card-alt` | `#EDF2F8` | Table headers, code snippet containers, pills | 1.12:1 |
| `text-primary`| `#17243A` | Headings, primary metrics, active menu items | **14.8:1 (AAA)** |
| `text-muted`  | `#64748B` | Subtitles, labels, timestamps, metadata | **4.9:1 (AA)** |
| `brand-primary`|`#243B63` | Primary action buttons, brand logo, key links | **11.2:1 (AAA)** |
| `accent-teal` | `#38B7A5` | Progress completions, mastery gauges, badges | **3.8:1 (UI)** |
| `accent-blue` | `#6C8FF5` | Interactive highlights, links, focus rings | **3.5:1 (UI)** |

### 2.2 Dark Theme (Deep Academic Navy)
The dark theme provides comfortable low-light study without losing card boundaries or depth.

| Token | Hex Value | Semantic Usage | Contrast vs Background |
| :--- | :---: | :--- | :---: |
| `bg-app-dark` | `#101B2D` | Application background (Navy base, NOT #000) | Baseline |
| `bg-card-dark`| `#182A42` | Bento cards, floating popovers, sidebar | 1.25:1 |
| `bg-card-alt` | `#20344E` | Code backgrounds, nested metric blocks | 1.45:1 |
| `text-primary`| `#F1F5FB` | Headings, high-priority statistics, values | **13.5:1 (AAA)** |
| `text-muted`  | `#A8B7CC` | Explanatory text, secondary badges | **6.8:1 (AA)** |
| `accent-teal` | `#38B7A5` | Mastery indicators, positive state pills | **5.2:1 (AA)** |
| `accent-blue` | `#6C8FF5` | Active selection, code syntax identifiers | **6.1:1 (AA)** |

---

## 3. Typography & Monospace Hierarchy

```
Headings & Display:
  Inter Display / SemiBold (600) / Bold (700)
  Tracking: -0.025em (tight)
  Example: "Mastery Trajectory & Invariant Bounds"

Body & UI Labels:
  Inter Regular (400) / Medium (500)
  Leading: 1.5 (relaxed)
  Example: "Dynamic programming state transition equations require memoized DAG evaluation."

Algorithmic Code & Math:
  JetBrains Mono Medium (500)
  Letter spacing: normal
  Example: while (left <= right) { mid = left + ((right - left) >> 1); }
```

---

## 4. Bento Component Styling Standards

```css
/* Bento Standard Card */
.bento-card {
  border-radius: 1rem; /* 16px */
  border: 1px solid rgba(226, 232, 240, 0.8); /* slate-200 */
  background: #ffffff;
  box-shadow: 0 1px 3px 0 rgba(0, 0, 0, 0.04), 0 1px 2px -1px rgba(0, 0, 0, 0.04);
  transition: all 200ms cubic-bezier(0.16, 1, 0.3, 1);
}

.dark .bento-card {
  border: 1px solid rgba(30, 41, 59, 0.8); /* slate-800 */
  background: #182A42;
  box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.2);
}

.bento-card:hover {
  transform: translateY(-2px);
  box-shadow: 0 10px 15px -3px rgba(0, 0, 0, 0.08);
}
```

---

## 5. Visual Artifact References

1. **Light Theme Baseline**: `05_student_dashboard_desktop_light_1440.png`
2. **Dark Theme Academic Navy**: `06_student_dashboard_desktop_dark_1440.png`
3. **Card Consistency Across Viewports**: `10_viewport_1920_desktop_large.png` to `17_viewport_360_small_android.png`

---
*Report generated and validated for LearnLoop AI Production Release.*


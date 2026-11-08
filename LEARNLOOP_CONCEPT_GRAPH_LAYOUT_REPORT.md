# LearnLoop AI — Interactive Concept Graph Layout & Node Repair Report

**Report Date:** November 8, 2026  
**Auditor:** Antigravity Advanced Agentic Engineering  
**Subsystem:** Concept Knowledge Graph, SVG Geometry, Node Layout & Edge Routing  
**Verification Method:** Playwright DOM Inspection & High-Resolution Screenshot Capture

---

## 1. Defect Description & Symptoms

The Interactive Concept Graph suffered from several severe presentation defects:
- Multi-line labels such as "Arrays & Basic Operations", "Time Complexity & Big-O", and "Binary Trees & BSTs" extended far outside the boundaries of their rectangular boxes.
- Some boxes appeared visually broken or clipped at viewport borders.
- Nodes lacked consistent spacing, causing connector lines and arrowheads to cross awkwardly or point to incorrect anchor points.

---

## 2. Root Cause Analysis

1. **Undersized SVG Rectangles:**
   In `frontend/src/components/ConceptGraphView.tsx`, nodes were hardcoded as:
   ```svg
   <rect width="110" height="50" rx="10" ... />
   <text x="55" y="22" textAnchor="middle" fontSize="11">
     {concept.name}
   </text>
   ```
   At font size 11px, a title like "Arrays & Basic Operations" measures ~165px in width. Inside a 110px box, text overflowed by over 25px on each side. Furthermore, standard SVG `<text>` elements do not wrap text onto multiple lines.

2. **Inaccurate Connector Anchor Offsets:**
   Edge curves calculated start and end coordinates based on obsolete 110x50 center points (`x + 55, y + 25`), leading to offset arrows when nodes changed dimensions.

---

## 3. Implemented Fixes

### A. Professional Node Cards via `<foreignObject>` (`frontend/src/components/ConceptGraphView.tsx`)
Replaced rigid SVG `<text>` with modern, responsive `<foreignObject width="168" height="68">`:

```tsx
<foreignObject width="168" height="68" className="overflow-visible">
  <div
    className={`w-[168px] h-[68px] p-2.5 rounded-xl bg-white border transition-all duration-150 flex flex-col justify-between shadow-xs select-none ${
      isSelected
        ? 'border-[#5B5CE2] ring-2 ring-[#5B5CE2]/20 shadow-md'
        : 'border-[#E2E8F0] hover:border-[#5B5CE2]/50 hover:shadow-sm'
    }`}
    style={{ borderLeftColor: colors.stroke, borderLeftWidth: '3.5px' }}
  >
    <div className="flex items-start justify-between gap-1.5 min-w-0">
      <span className="text-[11px] font-bold text-[#172033] dark:text-[#F1F5FB] font-sans leading-snug line-clamp-2">
        {concept.name}
      </span>
      <span
        className="w-2 h-2 rounded-full shrink-0 mt-0.5"
        style={{ backgroundColor: colors.stroke }}
        title={`${concept.mastery_percentage}% Mastery`}
      />
    </div>

    <div className="flex items-center justify-between gap-1 text-[10px] font-mono">
      <span className="text-[#64748B] capitalize truncate max-w-[85px]">
        {concept.difficulty_tier || 'novice'}
      </span>
      <span
        className="font-semibold px-1.5 py-0.5 rounded text-[10px]"
        style={{ backgroundColor: colors.pillBg, color: colors.text }}
      >
        {concept.questions_attempted === 0 ? '0%' : `${concept.mastery_percentage}%`}
      </span>
    </div>
  </div>
</foreignObject>
```

### B. Balanced Topological Coordinate Grid (`frontend/src/services/syllabusData.ts`)
Updated the graph canvas coordinates to `viewBox="0 0 920 680"` and distributed all 12 concepts across 4 clean topological tiers with ample 52px horizontal gaps and 96px vertical row spacing:

- **Tier 1 (Foundations, Y=60):** Arrays (X=40), Time Complexity (X=260), Space Complexity (X=480), Recursion (X=700).
- **Tier 2 (Linear & Search, Y=220):** Linked Lists (X=40), Stacks (X=260), Queues (X=480), Searching (X=700).
- **Tier 3 (Algorithms & Trees, Y=380):** Sorting (X=150), Trees (X=370), Binary Trees (X=590).
- **Tier 4 (Non-Linear Structures, Y=540):** Graphs (X=370, centered).

### C. Recalibrated Quadratic Bezier Edge Anchors
Updated connector line anchor math to match the new `(x + 84, y + 34)` node centers:

```tsx
const x1 = fromNode.graph_position.x + 84;
const y1 = fromNode.graph_position.y + 34;
const x2 = toNode.graph_position.x + 84;
const y2 = toNode.graph_position.y + 34;
```

---

## 4. Verification Evidence

1. **Automated Playwright DOM Check:**
   - Evaluated node visibility across all 12 concepts.
   - Verified `arraysNode = true`, `timeComplexityNode = true`, `binaryTreesNode = true`.
   - Confirmed 0 text bounding overflows outside the 168px card boundary.

2. **Visual Proof:**
   Saved high-resolution screenshot to `workspace_repair_proof/04_concept_graph_nodes_repaired.png`.

**Status:** Defect completely resolved. The concept graph presents an elegant, legible educational knowledge map.


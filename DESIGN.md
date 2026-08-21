# DESIGN SYSTEM CONTRACT: MitigatePlus Civic Emergency Operations

**Enforcement:** Taste Skill Design Governance, Impeccable Audit System, Cognitive Load Theory (CLT) & Psychological Laws.

---

## 1. Color Tokens (Neumorphic High-Contrast Civic Palette)

| Token Name | Hex Code | Usage Context |
| :--- | :--- | :--- |
| **Canvas Base** | `#EEF2F6` | Neumorphic soft tactile background canvas |
| **Panel Surface** | `#EEF2F6` | Extruded operational cards & raised pods (`NEUMORPHIC.raised`) |
| **Sunken Well** | `#E2E8F0` | Inset text fields, QR code wells, active tab wells (`NEUMORPHIC.sunken`) |
| **Command Navy** | `#071D3A` | Primary navigation headers, command bars, deep operational surfaces |
| **Operational Blue** | `#002BB8` | Primary interactive triggers, active states, key data identifiers |
| **Manila Gold** | `#B45309` / `#D97706` | Priority indicators, urgent announcements, pending status |
| **Disaster Crimson** | `#DC2626` | Severe structural damage, duplicate claim blocked alerts, emergency calls |
| **Bay Emerald** | `#059669` | Verified household status, claimed relief, successfully logged records |
| **Border Neutral** | `#CBD5E1` / `#E2E8F0` | 1px crisp structural dividers and Neumorphic light/dark edges |
| **Text Primary** | `#0F172A` | Primary body, headers, numbers (High WCAG contrast) |
| **Text Secondary** | `#475569` / `#64748B` | Field captions, metadata, timestamps |

---

## 2. Cognitive Load & HCI Principles Enforced

1. **Hick's Law (Simplicity of Choice):**
   - 1 dominant Primary CTA per viewport.
   - Secondary actions styled subtly with neutral outlines to eliminate decision paralysis.
2. **Fitts's Law (Thumb Ergonomics):**
   - Minimum **$48\times 48\text{px}$ touch targets** (`TOUCH_TARGET.minHeight = 48`).
   - Critical bottom navigation dock positioned in the easiest-to-reach zone.
3. **Miller's Law (Chunking):**
   - Hero Pass: Maximum **3 data points** (`Headcount`, `Priority Score`, `Right-Sized Packs`).
   - Quick Actions: Maximum **4 operational cards** in 2x2 grid.
   - Recovery Stepper: Maximum **5 linear milestones**.
   - Severity Selector: Maximum **4 distinct levels**.
4. **Jakob's Law (Familiar Affordances):**
   - Top-right notification bell with unread indicator badge.
   - Top-left `←` chevron back buttons.
   - Standard 5-tab docked bottom navigation bar.
5. **Law of Proximity (Visual Association):**
   - Micro-labels positioned directly on top of their respective inputs.
   - Error messages positioned directly below their specific input fields.
6. **Progressive Disclosure:**
   - 2-step registration workflow instead of overwhelming single-page forms.
   - Modal bottom sheet for enlarged QR code scanning.

---

## 3. Geometry & Spacing

- **Corner Radii:**
  - Micro Badges / Pills: `4px` - `6px` or `999px`
  - Input Fields & Buttons: `8px` - `12px`
  - Operational Panels: `14px` - `18px`
- **Iconography:**
  - Standardized flat 2D scalable SVG vector icons (`strokeWidth="2"`), uniform `20x20` to `24x24` bounding boxes. Zero dimensional gradients or skeuomorphism.

---

## 4. Impeccable Audit Checklist

- [x] **/audit**: Zero generic SaaS fluff, zero card-inside-card nesting.
- [x] **/distill**: Remove decorative hero blobs, redundant emojis, and purple gradients.
- [x] **/typeset**: Standardize label tracking, tabular numerals, and status badges.
- [x] **/layout**: High-density operational data tables, direct one-tap actions.
- [x] **/accessibility**: Minimum 4.5:1 text contrast ratio, clear error states.
- [x] **/cognitive-load**: Intrinsic, extraneous, and germane loads balanced via the 7 HCI laws.

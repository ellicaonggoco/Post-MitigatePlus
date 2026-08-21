# PRODUCT BRIEF: MitigatePlus Emergency Operations & Recovery Platform

**Authority:** Taste Skill, Impeccable, Cognitive Load Theory (CLT) & Psychological Laws Framework  
**Primary Users:** City of Manila MDRRMO, Barangay 291 Disaster Response Personnel, On-Ground Field Teams, and Affected Citizens.  
**System Classification:** Post-Disaster Mitigation, Recovery & Relief Management Operations System.

---

## 1. Cognitive Load Architecture (Sweller's CLT & HCI Laws)

During post-disaster crises, citizens and field personnel experience acute stress, sensory overload, and diminished working memory. MitigatePlus is engineered to minimize cognitive strain:

### A. Tripartite Cognitive Load Management
1. **Minimize Extraneous Load:** Eliminate all visual noise, decorative AI fluff, chaotic animations, and ambiguous icons. The UI is 100% focused on immediate task completion.
2. **Manage Intrinsic Load:** Deconstruct complex civil recovery processes (damage claims, household verification, quota computation) into progressive, digestible steps (Progressive Disclosure).
3. **Optimize Germane Load:** Reinforce instant comprehension through high-contrast status signifiers (Bay Emerald = Claimed, Manila Gold = Pending, Disaster Crimson = Severe/Blocked).

### B. The 7 Psychological Design Laws Enforced

| Psychological Law | Core Principle | Implementation in MitigatePlus |
| :--- | :--- | :--- |
| **1. Hick’s Law** | Decision time increases logarithmically with the number of choices. | Limit choices to **3–4 per view**; highlight exactly **one primary CTA** per screen. |
| **2. Fitts’s Law** | Target acquisition is faster for larger targets closer to the thumb zone. | Minimum **$48\times 48\text{px}$ touch targets**; bottom-docked capsule navigation bar within the natural one-handed thumb zone. |
| **3. Miller’s Law** | Working memory holds only **$4 \pm 1$ items** under stress. | Hero Pass capped at **3 metrics**; Quick Actions capped at **4 buttons**; Recovery Stepper capped at **5 milestones**. |
| **4. Jakob’s Law** | Users expect the app to match familiar conventions. | Universal top bar (Avatar + Name + Notification Bell with red badge); standard 5-tab docked bottom bar. |
| **5. Law of Proximity** | Clustered elements are perceived as functionally related. | Form labels are tightly coupled with their inputs (`marginTop: -6px` to `4px`); generous 16px gutter between independent operational pods. |
| **6. Law of Similarity** | Elements with identical visuals are perceived to have identical roles. | Standardized interactive tokens (`#002BB8` for primary actions, `#DC2626` for severe/danger, `#059669` for verified success). |
| **7. Progressive Disclosure** | Reveal data only as needed to prevent cognitive flooding. | Multi-step registration (2 stages); 1-tap modal expansion for detailed QR scanner view. |

---

## 2. Core Operational Priorities

1. **Information Hierarchy:** Key emergency metrics, priority index scores, and distribution allocations must be parseable in <2 seconds.
2. **Fast Scanning:** High contrast, tabular numerals, consistent labeling, and clear data tables over decorative card bubbles.
3. **Map & Incident Situational Awareness:** Geographic density indicators, zone hazard statuses, and live barangay cluster tracking.
4. **Unambiguous Severity Indicators:**
   - `CRITICAL / SEVERE / TOTAL` $\to$ High-contrast Crimson (`#DC2626`)
   - `MODERATE / PENDING` $\to$ High-contrast Amber (`#D97706`)
   - `VERIFIED / CLAIMED / COMPLETED` $\to$ High-contrast Bay Emerald (`#059669`)
5. **Efficient Administrative Workflows:** One-tap QR scan, instant duplicate-claim detection, calculated right-sized allocation, and immediate relief dispatch.
6. **Strict Accessibility:** High optical contrast (WCAG AAA for text), clear touch targets ($\ge 48\times 48\text{px}$), offline persistence, and bilingual support (Tagalog / English).

---

## 3. Strict Anti-References & Forbidden Design Tropes

- ❌ NO generic AI dashboard boilerplate or purple-on-dark aesthetics.
- ❌ NO nested card-inside-card layouts.
- ❌ NO excessive rounded bubbles ($>16\text{px}$ on structural panels).
- ❌ NO gratuitous glassmorphism, glowing borders, or heavy decorative shadows.
- ❌ NO decorative cartoon illustrations or raw emojis in place of standard 2D vector icons.
- ❌ NO arbitrary animations or distracting visual noise during disaster operations.
- ❌ NO modification to underlying backend routes, schemas, or socket logic.

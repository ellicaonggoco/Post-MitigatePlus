# MitigatePlus Project Guidelines & System Memory

## 1. System Overview
MitigatePlus is an AI-powered Disaster Risk Reduction Management and Post-Disaster Relief Allocation Platform for the City of Manila.
- **Web Admin**: React (Vite) located at `web-admin/`
- **Mobile App**: React Native (Expo) located at `mobile-app/`
- **Backend API**: Node.js, Express, MongoDB (Mongoose), Socket.io located at `backend/`

---

## 2. Structural Damage Reporting & Progression (CRITICAL BUSINESS RULES)

### A. Multi-Report Progression Support
- Disasters evolve over time (e.g. aftershocks, secondary flooding). A resident can legitimately submit multiple damage reports over time.
- The system must treat subsequent reports as **Progression Reports**, not duplicate errors.
- **Mobile App**:
  - If a resident has multiple reports, display the **Progression Selector Chips** (`[ Ulat #2 (PINAKABAGO · Sinusuri) ]`, `[ Ulat #1 (Binago at Beripikado) ]`).
  - Allow the user to tap and inspect each report individually (photos, validation status, official notes, timestamps).
  - Provide a clear button for submitting further supplementary reports if damage worsens.
- **Web Admin**:
  - In `VerificationQueue.jsx` (Tab 2: Damage Reports), show a badge: `Progression Report #X of Y` so officials know this is an updated report from the same household.
  - Maintain filter tabs with live counts: `Pending (X)`, `Verified (X)`, `Adjusted (X)`, `Rejected (X)`, and `All (X)`.

### B. Clean Description Rule (No Artificial Prefixes)
- The resident's damage description must strictly be what they typed in the description field.
- **NEVER** prepend artificial strings such as `"Landmark: [address] | Notes: "` to the description. Address is already stored in `locationName`.
- When rendering in Web Admin or Mobile App, sanitize any legacy prefixes using `cleanDamageDescription(desc)` to keep observations clean and professional.

### C. Non-Cumulative Priority Score Rule (MUST NEVER STACK)
- When a damage report is approved or adjusted by an official, the household's Priority Score is **NEVER cumulative**.
- The score is freshly recalculated from scratch:
  `priorityScore = (damageWeight * 10) + vulnerabilityPoints + min(daysPending, 30) - assistanceReceivedPenalty`
  - Minor Damage: weight 1 (+10 pts)
  - Moderate Damage: weight 2 (+20 pts)
  - Severe Damage: weight 3 (+30 pts)
  - Totally Damaged: weight 4 (+40 pts)
- **Example**: If base vulnerability is 30 pts:
  - Report 1 (Minor, +10) -> Score is 40 (30 + 10).
  - Report 2 (Moderate, +20) -> Score is 50 (30 + 20), **NOT 60**. The damage score is reset and replaced by the latest validated level.

---

## 3. Lightbox & Modal Distinction (Verification Queue)
- **Household Registration (Tab 1)**: Modal/lightbox must say `• Government ID Document`.
- **Damage Reports (Tab 2)**: Modal/lightbox must say `• Structural Damage Evidence Photo` and NEVER reference Government ID.

---

## 4. Role-Based Access Control
- `lgu_superadmin` & `lgu_admin`: City-wide jurisdiction across all 897 barangays in Manila.
- `barangay_official`: Strictly scoped to their assigned `barangayCode`. Can only review and validate damage reports and households within their barangay.
- `field_worker` / `staff`: Field tasks, QR relief pack release scanning, and on-site assistance.
- `resident`: Can view their own household data, submit damage reports, request assistance, and view QR passes.

---

## 5. Design System & Theme
- **Color Identity (City of Manila)**:
  - Crimson Red: `#C8102E` (Danger, Emergency, Damage Hero Header)
  - Royal Blue: `#1C3F94` (Primary, Trust, Livelihood & Claims Header)
  - Manila Gold: `#C9A84C` (Accent rules, Verified rings, Badges)
  - Canvas: `#F3F6FC`
  - Border: `#DDE4F0`
- **Iconography**:
  - Standardized flat 2D vector icons from `components/AppIcons.js` on mobile and `lucide-react` on web.
  - No decorative emojis in production buttons, badges, tables, or cards.

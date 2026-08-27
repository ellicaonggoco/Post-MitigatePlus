# 🏛️ MITIGATEPLUS: COMPREHENSIVE SYSTEM WORKFLOW & FEATURE MANUAL
**Post-Disaster Relief Assistance & Beneficiary Governance System — City of Manila**  
*Document for Capstone Defense, Panel Presentation, and Faculty Consultation*

---

## 📌 1. EXECUTIVE SYSTEM OVERVIEW

**MitigatePlus** is an integrated, data-driven, and fraud-resistant Disaster Relief Management & Beneficiary Governance Platform developed specifically for the **City of Manila's 897 Barangays**.

The system connects three interconnected tiers:
1. **Web Admin Operations Command Center** *(React.js + Vite deployed on Vercel)* — For City Administrators, LGU Disaster Officers, and Barangay Officials.
2. **Mobile Application** *(React Native + Expo)* — Dual-role app for Residents (Beneficiaries) and Field Staff (Ground QR Scanners).
3. **Backend REST API & Real-Time Engine** *(Node.js + Express + MongoDB Atlas + Socket.IO deployed on Render)*.

---

## 👥 2. USER ROLES & ACCESS HIERARCHY

| User Role | Interface | Primary Scope & Responsibilities |
| :--- | :--- | :--- |
| **LGU SuperAdmin** | Web Admin | City-wide oversight, Global Relief Allocation Policy configuration, provision admin accounts, system security audit logs. |
| **LGU Admin** | Web Admin | City-wide relief operations, Distribution Events scheduling, Warehouse Inventory management, Smart Priority ranking, Heatmap monitoring. |
| **Barangay Official** | Web Admin | Barangay-level jurisdiction, Household Verification Queue, Beneficiary Roster review, posting localized announcements. |
| **Field Staff** | Mobile App | Ground operations, scanning Citizen QR Passes, verifying entitlement, duplicate claim fraud detection, on-ground incident logging. |
| **Resident / Citizen** | Mobile App | Household registration with SMS OTP, digital QR Pass, GPS damage reporting, tracking family relief history. |

---

## 🖥️ 3. WEB ADMIN MODULES: COMPLETE CLICK-BY-CLICK GUIDE

---

### 1️⃣ Dashboard (`/`)
* **Purpose:** High-level operational command center showing real-time KPIs, beneficiary coverage, and live relief telemetry across Manila.
* **What you see:**
  * Total Verified Households, Active Distribution Drives, Warehouse Stock Level, Blocked Duplicate Fraud Count.
  * Live Beneficiary Coverage Progress Bar (Target vs. Reached).
  * Recent activity feed and quick action shortcuts.
* **When you click:**
  * **`View Queue` Shortcut:** Navigates directly to the **Verification Queue**.
  * **`Schedule Event` Shortcut:** Opens the **Distribution Events** creator.
  * **`Inspect Warehouse` Shortcut:** Navigates to **Warehouse Inventory**.

---

### 2️⃣ Verification Queue (`/verification-queue`)
* **Purpose:** Anti-ghost beneficiary gatekeeper where Barangay Officials verify citizen registrations before QR passes are activated.
* **What you see:**
  * List of newly registered resident households pending review.
  * Government ID photo preview (UMID, PhilSys National ID, Voter's ID, Driver's License, Barangay Certificate).
  * Head of family name, address, purok, contact number, and declared family members.
* **When you click:**
  * **`Approve` Button:**
    * *What happens:* Opens confirmation dialog. Upon confirming, updates household status to `verified`, generates a unique cryptographic QR Code, and sends an SMS/push notification to the resident that their account is activated.
  * **`Reject` Button:**
    * *What happens:* Prompts the official for a rejection reason (e.g. *Invalid ID*, *Not a resident of Brgy 291*). Notifies the resident via SMS so they can re-upload proper documents.

---

### 3️⃣ Smart Priority Index (`/priority-index`)
* **Purpose:** Automated algorithmic vulnerability and damage scoring that ranks all 897 barangays based on urgency of relief needs.
* **What you see:**
  * Real-time computed **Priority Score (0 - 100)** per barangay.
  * Breakdown indicators: Total Verified Families, Senior Citizen ratio, Infant ratio, PWD count, and Citizen Damage Telemetry.
* **When you click:**
  * **`Deploy Relief for Barangay [X]` Button:**
    * *Where it goes:* Automatically navigates to **Distribution Events**.
    * *What happens:* Pre-fills the event title, sets the target barangay, auto-populates the exact verified household count, and opens the event creation form instantly.

---

### 4️⃣ Barangay GIS Risk Heatmap (`/heatmap`)
* **Purpose:** Interactive GIS map rendering all 897 Manila barangay polygon boundaries color-coded by real-time disaster impact.
* **What you see:**
  * Interactive Leaflet vector map with choropleth risk coloring:
    * 🔴 **Critical / High Priority** (High damage reports, high vulnerability)
    * 🟠 **Moderate Priority**
    * 🟢 **Low / Stable Priority**
  * Micro number tags on every barangay polygon for instant visual recognition.
* **When you click:**
  * **Single-click on any Barangay Polygon:**
    * *What happens:* Opens the Barangay Inspector Sidebar showing verified headcount, damage report breakdown, and past relief distributions.
  * **`Deploy Relief` in Inspector:**
    * *What happens:* Direct 1-click route to create a distribution drive for that exact barangay.

---

### 5️⃣ Distribution Events (`/distribution-events`)
* **Purpose:** Management of relief distribution drives, QR scan operations, and real-time field monitoring.
* **What you see:**
  * Tabs for `All Events`, `Active Drives`, and `Completed Events`.
  * Real-time progress bars showing claimed packs vs. target households.
* **When you click:**
  * **`+ New Event` Button:** Opens the event creation modal.
    * *Smart Feature:* Typing/selecting a barangay (e.g. `Barangay 291`) automatically queries the census backend, auto-populates the **Target Households** field with verified count, and displays the **Automated Pre-Event Assessment Box**.
    * *Warehouse Integration:* Submitting the event **automatically deducts** the required relief packs from the Central Warehouse and logs an auto-dispatch audit trail.
  * **`Broadcast Announcement` Button:**
    * *What happens:* In 1 click, publishes a localized announcement directly to all mobile apps in that barangay and sends push alerts.
  * **`Close Event` Button:**
    * *What happens:* Marks the drive as `Completed`, finalizes claim logs, and locks scanning.

---

### 6️⃣ Pre-Event Relief Demand & Quota Assessment (`/special-request-relief`)
* **Purpose:** **100% Automated, Data-Driven Relief Planning Engine** (eliminates manual mobile requests).
* **What you see:**
  * Searchable Barangay selector (Barangay 1 to 897).
  * **5 Automated Quota Cards:**
    1. 🍱 **Family Food Packs:** Right-sized by family size (1-4 pax = 1 pack, 5-8 = 2 packs, 9+ = 3 packs).
    2. 💧 **Potable Water (10L Jugs):** 1 jug per verified family.
    3. 👵 **Senior Care & Med Kits:** Matched with registered 60+ seniors.
    4. 🍼 **Infant Milk & Nutrition:** Matched with 0-2 yo infants.
    5. 🏠 **Shelter Repair Kits:** Matched with `Totally Damaged` reports.
  * **Warehouse Feasibility Pre-Check:** Live check confirming if storage has sufficient stock before dispatch.
  * **Pre-Distribution Beneficiary Masterlist:** Roster of every family and their exact calculated entitlement.
* **When you click:**
  * **`Schedule Event with Computed Quotas` Button:**
    * *Where it goes:* Takes all computed numbers directly into **Distribution Events** to create the drive with pre-filled quotas.

---

### 7️⃣ Relief Warehouse Inventory (`/warehouse-inventory`)
* **Purpose:** Central storage live inventory tracking, supply replenishment, and Commission on Audit (COA) compliance logging.
* **What you see:**
  * Inventory cards for Food Packs, Water, Medicine, Infant Packs, Senior Kits, Shelter Kits.
  * Live stock levels, capacity percentages, and Low Stock Warning banners.
  * **Stock Movement & Government Audit Trail Table:** Complete history of all incoming and outgoing goods.
* **When you click:**
  * **`+ Receive` Button:**
    * *What happens:* Opens modal to record incoming deliveries from DSWD or donors with Supplier Name, PO #, Waybill #, and Receiving Officer. Increases stock count.
  * **`- Dispatch` Button:**
    * *What happens:* Opens emergency off-event dispatch modal (for inter-agency transfers, emergency evacuation augmentation, or damaged goods write-offs). Records Purpose, Destination, Approving Official, Vehicle Plate #, and Reference DR #.

---

### 8️⃣ Fraud Interception Stream (`/fraud-interception`)
* **Purpose:** Live cybersecurity & anti-corruption monitor detecting and blocking duplicate QR claims and unauthorized access attempts.
* **What you see:**
  * Real-time event stream showing attempted duplicate claims caught by the backend compound indexing engine.
  * Offender details: Household name, QR Code ID, Attempted Location, Timestamp, and Field Staff Scanner ID.
* **When you click:**
  * **`Flag for Review`:** Escalates the household for official barangay investigation.

---

### 9️⃣ Announcements Board (`/announcements`)
* **Purpose:** Official broadcast system to push advisories, relief schedules, and weather warnings to citizen mobile apps.
* **What you see:**
  * Active announcements categorized by `Relief Schedule`, `Damage Advisory`, `Recovery Status`, and `Public Advisory`.
* **When you click:**
  * **`New Announcement`:**
    * *Scope Options:* `City-Wide (All 897 Barangays)` or `Specific Barangay Only`.
    * *Smart Action Trigger:* Citizens receive interactive buttons (e.g. *"View Distribution Schedule"*, *"Report Damage"*).
  * **`Delete / Edit`:** Updates or removes the announcement with confirmation dialogs.

---

### 🔟 Reports & COA Audit Liquidation (`/reports`)
* **Purpose:** Official government reporting, statistical analytics, and 1-click COA-compliant liquidation masterlist generation.
* **What you see:**
  * Filter by Barangay, Date Range, and Relief Item.
  * Distribution Summary, Household Demographics, and Audit Metrics.
* **When you click:**
  * **`Export COA Liquidation Masterlist (CSV)`:**
    * *What happens:* Generates an official tabular liquidation sheet with Claim Receipt Numbers, Beneficiary Names, Valid IDs, Family Size, Exact Packs Received, Disbursing Officers, and Timestamps.

---

### 1️⃣1️⃣ Account Management & Provisioning (`/provision-accounts`)
* **Purpose:** Superadmin module to create, manage, suspend, or reactivate official accounts for LGU Admins, Barangay Officials, and Field Staff.
* **What you see:**
  * Directory of all provisioned government accounts with Employee IDs, Assigned Barangays, and Roles.
* **When you click:**
  * **`Provision New Account`:** Creates credentials and assigns official jurisdiction.
  * **`Suspend / Reactivate`:** Toggles system access instantly.

---

### 1️⃣2️⃣ Global Policy Configuration (`/policy-config`)
* **Purpose:** Superadmin formula management for Disaster Classification, Relief Allocation Ratios, and Fraud Thresholds.
* **What you see:**
  * Base family size coverage settings, top-up pack formulas, and duplicate detection timeouts.
* **When you click:**
  * **`Save Policy Changes`:** Requires 2-step security passcode confirmation (`CONFIRM` or passcode) before applying city-wide.

---

### 1️⃣3️⃣ Recovery Progress Tracker (`/recovery-progress`)
* **Purpose:** Post-disaster rehabilitation tracker monitoring households through 4 recovery stages: *Displaced → In Temporary Shelter → Repairing Home → Fully Recovered*.
* **What you see:**
  * Kanban-style status overview of community recovery progression.

---

## 📱 4. MOBILE APP MODULES: RESIDENT & STAFF GUIDE

---

### 👨‍👩‍👧 Resident / Citizen Flow

1. **Registration & SMS OTP Verification:**
   * Resident inputs family head details, address, barangay, and member list.
   * System sends a 6-digit SMS OTP via Semaphore SMS Gateway.
   * Resident uploads a photo of their valid Government ID. Account status becomes `Pending Verification`.
2. **Digital QR Pass:**
   * Once verified by the Barangay Official, the resident's home screen unlocks the **Cryptographic Digital QR Pass** containing household ID and entitlement metadata.
   * Works **100% offline** (cached securely in device storage).
3. **Report Damage (Citizen Telemetry):**
   * Resident selects damage level (*Minor, Moderate, Severe, Totally Damaged*).
   * Device auto-detects precise GPS coordinates and resident takes a photo using the phone camera (uploaded to Cloudinary CDN).
   * Automatically feeds into the **Barangay Heatmap** and **Priority Index**.
4. **Claims History & Announcements:**
   * Resident sees real-time announcements from the City Mayor and Barangay Captain.
   * Tracks every relief pack received with date, time, and disbursing team.

---

### 👷 Field Staff Scanner Flow

1. **Staff Authentication:**
   * Staff logs in using assigned employee credentials.
2. **Select Active Drive:**
   * Staff selects the ongoing distribution event (e.g. *Barangay 291 Relief Drive*).
3. **Camera QR Scan:**
   * Staff points device camera at resident's QR code.
   * **Automated Entitlement Display:** App shows exact family size, right-sized food pack count, water jugs, and senior/infant add-ons.
4. **Anti-Duplicate Fraud Prevention:**
   * If the resident already claimed, the app **instantly flashes a RED ALERT** and sounds an audio warning: *"DUPLICATE CLAIM BLOCKED"*.
   * The attempt is logged to the Admin Fraud Stream in real-time.
5. **Confirm Release:**
   * Staff hands over the physical packs and taps *"Confirm Release"*. System records the distribution timestamp and staff ID.

---

## 🔄 5. THE COMPLETE DISASTER-TO-RELIEF LIFECYCLE (PRESENTATION FLOW)

When presenting to your Professor or Panel, walk through this **7-Step End-to-End Story**:

```
 ┌─────────────────────────────────────────────────────────────────────────────┐
 │ STEP 1: RESIDENT REGISTRATION                                               │
 │ Citizen registers on Mobile App with family members -> SMS OTP verified ->  │
 │ Uploads Government ID -> App displays "Pending Barangay Verification"       │
 ├─────────────────────────────────────────────────────────────────────────────┤
 │ STEP 2: BARANGAY OFFICIAL APPROVAL                                          │
 │ Barangay Official opens Web Admin "Verification Queue" -> Inspects ID ->    │
 │ Clicks "Approve" -> Resident's Mobile QR Pass turns ACTIVE.                 │
 ├─────────────────────────────────────────────────────────────────────────────┤
 │ STEP 3: DISASTER OCCURS & DAMAGE TELEMETRY                                  │
 │ Citizens submit Damage Reports with GPS & Photos on Mobile -> Web Admin     │
 │ "Heatmap" & "Priority Index" automatically rank most affected Barangays.    │
 ├─────────────────────────────────────────────────────────────────────────────┤
 │ STEP 4: PRE-EVENT RELIEF DEMAND ASSESSMENT                                  │
 │ LGU Admin selects Barangay in "Pre-Event Assessment" -> System calculates   │
 │ exact Food Packs, Water, Senior & Infant Kits -> Validates Warehouse Stock. │
 ├─────────────────────────────────────────────────────────────────────────────┤
 │ STEP 5: EVENT CREATION & AUTOMATED DISPATCH                                 │
 │ Admin clicks "Schedule Event with Computed Quotas" -> Warehouse stock is    │
 │ automatically deducted -> Announcement is broadcasted to citizen mobile apps│
 ├─────────────────────────────────────────────────────────────────────────────┤
 │ STEP 6: GROUND DISTRIBUTION & FRAUD INTERCEPTION                            │
 │ Field Staff uses Mobile Scanner -> Reads Resident QR Pass -> App validates  │
 │ entitlement & blocks any duplicate claims -> Staff confirms release.        │
 ├─────────────────────────────────────────────────────────────────────────────┤
 │ STEP 7: AUDIT LIQUIDATION & RECOVERY                                        │
 │ Web Admin generates COA-compliant Liquidation Report in 1-click ->          │
 │ Households are tracked in "Recovery Progress Tracker" until fully restored. │
 └─────────────────────────────────────────────────────────────────────────────┘
```

---

## 💻 6. ARCHITECTURAL & SECURITY HIGHLIGHTS (FOR TECHNICAL QUESTIONS)

* **Anti-Duplicate Database Architecture:** Compound Unique MongoDB Index on `{ distributionEventId: 1, householdId: 1 }` guarantees zero race-condition double claims at the database engine level.
* **Role-Based Access Control (RBAC):** Strict middleware enforcement (`lgu_superadmin > lgu_admin > barangay_official > field_staff > resident`).
* **Offline-First Resilience:** Resident QR passes and mobile offline scan queues cache locally using encrypted AsyncStorage and sync seamlessly when connectivity resumes.
* **Government Audit Compliance:** Every single action (login, status update, warehouse restock/dispatch, policy change) creates an immutable `AuditLog` entry compliant with Commission on Audit (COA) Circular 2014-002.

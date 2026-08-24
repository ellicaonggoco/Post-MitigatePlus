# MitigatePlus — Complete Capstone System Diagrams & Documentation
**Project Title:** MitigatePlus: An Automated Disaster Relief Management, Beneficiary Verification, and Anti-Duplicate Distribution System for the City of Manila  
**Date:** August 2026 | **Target Defense Level:** Capstone Final Defense / Thesis Documentation

---

## 📑 TABLE OF CONTENTS & DIAGRAM INVENTORY

All diagram source files are located in `C:\Capstone Final Project\drawio_diagrams\`:

| # | Diagram Name | File Name | Diagram Type |
|---|---|---|---|
| **1** | **3-Tier Layered System Architecture** | `01_Three_Tier_System_Architecture.drawio` | Layered 3-Tier Hierarchy |
| **2** | **Agile / Scrum Project Methodology** | `02_Agile_Scrum_Methodology.drawio` | Scrum Process Lifecycle |
| **3.1** | **FDD — LGU SuperAdmin Module** | `03_1_FDD_SuperAdmin.drawio` | Functional Decomposition Tree |
| **3.2** | **FDD — LGU Admin Module** | `03_2_FDD_LGU_Admin.drawio` | Functional Decomposition Tree |
| **3.3** | **FDD — Barangay Admin Module** | `03_3_FDD_Barangay_Admin.drawio` | Functional Decomposition Tree |
| **3.4** | **FDD — Resident / Citizen Module** | `03_4_FDD_Resident_Citizen.drawio` | Functional Decomposition Tree |
| **3.5** | **FDD — Field Staff Module** | `03_5_FDD_Field_Staff.drawio` | Functional Decomposition Tree |
| **4.1** | **Process Flow — Citizen Registration & OTP** | `04_1_Citizen_Registration_OTP_Flow.drawio` | BPMN Swimlane (Resident, System, Brgy) |
| **4.2** | **Process Flow — Barangay Verification & QR** | `04_2_Barangay_Verification_QR_Flow.drawio` | BPMN Swimlane (Brgy, System, Citizen) |
| **4.3** | **Process Flow — Relief Distribution & Anti-Fraud** | `04_3_Relief_Scanning_Anti_Fraud_Flow.drawio` | BPMN Swimlane (LGU, System, Staff, Resident) |
| **4.4** | **Process Flow — Damage Reporting & GIS Heatmap** | `04_4_Damage_Reporting_GIS_Heatmap_Flow.drawio` | BPMN Swimlane (Resident, System, LGU/Brgy) |
| **4.5** | **Process Flow — Special Assistance Delivery** | `04_5_Special_Assistance_Requests_Flow.drawio` | BPMN Swimlane (Resident, System, LGU, Staff) |
| **5.0** | **End-to-End System Process Lifecycle** | `05_Overall_System_Process_Flow.drawio` | High-Level System Workflow |
| **★** | **Master Multi-Tab File (All 13 Diagrams)** | `MitigatePlus_Master_Diagrams.drawio` | Unified 13-Tab Draw.io Project |

---

## 1. SYSTEMS ARCHITECTURE (Layered 3-Tier Hierarchy)

### Description
The MitigatePlus platform implements a **Layered 3-Tier Enterprise Client-Server Architecture** designed for high availability, security, scalability, and loose coupling between components:

```
┌─────────────────────────────────────────────────────────────────────────┐
│                      TIER 1: PRESENTATION LAYER                         │
│  ┌───────────────────────────────┐     ┌─────────────────────────────┐  │
│  │   Web Admin Portal (React/Vite) │     │ Mobile App (React Native/Expo)│ │
│  │   • LGU SuperAdmin / LGU Admin│     │ • Resident / Citizen Mobile │  │
│  │   • Barangay Officials Portal │     │ • Field Staff Scanner / Ops │  │
│  │   • Deployed on Vercel CDN    │     │ • Android APK / iOS Native  │  │
│  └───────────────────────────────┘     └─────────────────────────────┘  │
└────────────────────────────────────┬────────────────────────────────────┘
                                     │ HTTPS / WSS (REST & Socket.IO)
┌────────────────────────────────────▼────────────────────────────────────┐
│               TIER 2: APPLICATION / BUSINESS LOGIC LAYER                │
│  ┌───────────────────────────────────────────────────────────────────┐  │
│  │ Node.js & Express.js REST API Server (Hosted on Render Cloud)     │  │
│  │ • Core Controllers: Auth, Household, Distribution, Incident, etc. │  │
│  │ • Security Middleware: JWT Verification, RBAC Hierarchy, RateLimit│  │
│  │ • Business Logic: Right-Sizing Formula, Anti-Duplicate Compound   │  │
│  │ • Microservice Connectors: Semaphore SMS, Cloudinary CDN, Socket  │  │
│  └───────────────────────────────────────────────────────────────────┘  │
└────────────────────────────────────┬────────────────────────────────────┘
                                     │ Mongoose ODM / Wire Protocol (TLS)
┌────────────────────────────────────▼────────────────────────────────────┐
│                        TIER 3: DATA STORAGE LAYER                       │
│  ┌───────────────────────────────────────────────────────────────────┐  │
│  │ MongoDB Atlas Multi-Region Cloud Database Cluster                 │  │
│  │ • Collections: Users, Households, DistributionEvents,             │  │
│  │   Distributions, DamageReports, Incidents, AssistanceRequests,    │  │
│  │   AuditLogs, PolicyConfigs, WarehouseItems, WarehouseLogs         │  │
│  │ • Compound Indexes: (distributionEventId + householdId) [Unique]  │  │
│  └───────────────────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────────────────┘
```

---

## 2. PROJECT DEVELOPMENT METHODOLOGY (Agile / Scrum Framework)

### Description
The development of MitigatePlus followed the **Agile Development Methodology using the Scrum Framework**, organized into **two-week iterative Sprints**.

```
  ┌──────────────────┐      ┌──────────────────┐      ┌──────────────────┐
  │ PRODUCT BACKLOG  │ ───► │ SPRINT PLANNING  │ ───► │  SPRINT BACKLOG  │
  │ • All Capstone   │      │ • Scope 2-Week   │      │ • Committed user │
  │   Requirements   │      │   Sprint Goals   │      │   stories/tasks  │
  └──────────────────┘      └──────────────────┘      └────────┬─────────┘
           ▲                                                   │
           │                                                   ▼
  ┌────────┴─────────┐      ┌──────────────────┐      ┌──────────────────┐
  │ SPRINT RETRO     │ ◄─── │  SPRINT REVIEW   │ ◄─── │ SPRINT EXECUTION │
  │ • Continuous     │      │ • Working demo   │      │ • Design ➔ Code  │
  │   process polish │      │   to Stakeholder │      │ • Test ➔ Deploy  │
  └──────────────────┘      └──────────────────┘      └──────────────────┘
                                                               ▲
                                                      ┌────────┴─────────┐
                                                      │   DAILY SCRUM    │
                                                      │ • 15-min Standup │
                                                      └──────────────────┘
```

### Why Agile / Scrum Was Selected for MitigatePlus:
1. **Dynamic Stakeholder Requirements:** Disaster response protocols and LGU administrative structures in Manila required progressive refinement through stakeholder consultation.
2. **Rapid Prototyping & Incremental Delivery:** Critical components (offline QR code generation, anti-duplicate validation) were built and tested independently in early sprints before full platform integration.
3. **Continuous Integration & Automated Deployment (CI/CD):** Utilizing GitHub with Vercel and Render enabled continuous automated builds and immediate on-ground mobile testing after every sprint milestone.
4. **Risk Reduction in Capstone Timeline:** Scrum ceremonies provided frequent visibility, preventing scope creep and ensuring 100% production readiness for defense.

---

## 3. FUNCTIONAL DECOMPOSITION DIAGRAMS (FDD) BY ROLE

### 3.1 LGU SuperAdmin FDD (`03_1_FDD_SuperAdmin.drawio`)
* **1.0 Executive Analytics & Oversight:** City-wide KPI aggregation across 897 barangays; district-level distribution analytics; high-level audit summary; executive PDF report exports.
* **2.0 Global Policy Configuration:** Configurable right-sized relief formula (family size threshold, calorie multiplier, top-up units); duplicate attempt thresholds; calamity declaration parameters.
* **3.0 Account Provisioning & Security:** Role-based account creation for LGU Admins and Barangay Officials; credential issuance; security state management (active/suspended/revoked); master password reset.
* **4.0 System Audit & Anti-Fraud Control:** Master immutable audit trail log inspection; real-time fraud interception stream; high-privilege emergency overrides.

### 3.2 LGU Admin FDD (`03_2_FDD_LGU_Admin.drawio`)
* **1.0 Distribution Management:** Create, schedule, open, monitor, and conclude disaster distribution events; assign item types and target barangays; monitor live release counts.
* **2.0 Relief Allocation & Sizing:** Compute entitlement packages per household using dynamic policy algorithms; approve door-to-door special relief requests; dispatch field personnel.
* **3.0 Central Warehouse Inventory:** Real-time tracking of relief stocks (food packs, medical kits, hygiene kits, shelter tents); batch inbound/outbound logging; safety threshold alerts.
* **4.0 GIS Risk Heatmap Analysis:** City-wide disaster damage map; filterable layers by damage severity (Totally Damaged, Severe, Moderate, Minor); priority ranking visualization.
* **5.0 Staff & Incident Monitoring:** Coordinate field staff assignments; review live on-ground incident reports and crowd disturbance alerts broadcasted from the mobile scanner.

### 3.3 Barangay Admin FDD (`03_3_FDD_Barangay_Admin.drawio`)
* **1.0 Household Verification Queue:** Review submitted resident registrations; verify Government ID uploads; approve legitimate residents; reject invalid registrations with mandatory audit notes.
* **2.0 Beneficiary Master Directory:** View and search verified constituent households in the specific barangay; inspect household roster, vulnerable member tags (seniors, PWDs, infants, pregnant).
* **3.0 Smart Priority Index:** Automatically ranks constituents using multi-factor vulnerability weighting (damage level + household size + vulnerable members).
* **4.0 Barangay Operations Dashboard:** Monitor active relief operations within local jurisdiction; track claims per household; view pending vs verified registration counts.
* **5.0 Community Announcements:** Broadcast urgent typhoon advisories, evacuation instructions, and relief schedule notifications directly to resident mobile devices.

### 3.4 Resident / Citizen FDD (`03_4_FDD_Resident_Citizen.drawio`)
* **1.0 Registration & Authentication:** Mobile self-registration with household details; two-factor SMS OTP verification; phone/email login; self-service password recovery via OTP.
* **2.0 Digital QR Relief Pass:** View secure digital household QR pass; offline encrypted caching for zero-connectivity presentation at distribution booths; view entitlement badge.
* **3.0 Claims & Ayuda History:** Complete chronological audit trail of all relief packages received by the household (event name, timestamp, items received, dispensing officer).
* **4.0 Geo-Tagged Damage Reporting:** Report residential damage post-disaster; capture camera photo; auto-detect GPS coordinates; select structural damage classification.
* **5.0 Special Assistance Request:** Request door-to-door emergency relief for bedridden seniors, PWDs, or isolated families unable to queue at distribution sites.
* **6.0 Account & Roster Settings:** Update household member list; update contact number; switch application language (English / Tagalog); sync local offline cache.

### 3.5 Field Staff FDD (`03_5_FDD_Field_Staff.drawio`)
* **1.0 Staff Authentication:** Secure login using authorized staff credentials; automatic routing to field operations mode.
* **2.0 High-Speed QR Scanner:** Camera-based barcode/QR scanning; instant household eligibility lookup; dynamic entitlement package calculation display; single-tap release confirmation.
* **3.0 Anti-Duplicate Interception:** Immediate acoustic and visual alert on scanned QR codes already claimed in the current active event; duplicate fraud attempt logging.
* **4.0 Task & Delivery Management:** Receive door-to-door assistance assignments; navigate to resident address; record package delivery confirmation.
* **5.0 On-Ground Incident Reporting:** Report field irregularities (lost QR cards, stock shortages, line disturbances) with instant real-time dispatch to the LGU Command Center.

---

## 4. PROCESS FLOW DIAGRAMS (Professional Humanitarian Standards)

### 4.1 Citizen Registration & OTP Verification Flow (`04_1_Citizen_Registration_OTP_Flow.drawio`)
* **Actors:** Resident (Mobile App) | MitigatePlus Backend (Automated Logic) | Semaphore Gateway | Barangay Official (Web Admin)
* **Flow:**
  1. Resident inputs household data (head name, contact, barangay, members, vulnerable tags) and uploads Gov't ID photo.
  2. System initiates 6-digit cryptographic OTP dispatch via Semaphore SMS Gateway.
  3. Resident inputs received OTP within the 5-minute validity window.
  4. System validates OTP, creates encrypted user record, generates unique QR hash (`MNL-BRGY-UID`), and sets status to `PENDING_VERIFICATION`.
  5. Barangay Official reviews applicant credentials in the Verification Queue.
  6. If approved, status transitions to `VERIFIED`, activating the digital QR pass with immediate notification.

### 4.2 Relief Distribution & Anti-Fraud Verification Flow (`04_3_Relief_Scanning_Anti_Fraud_Flow.drawio`)
* **Actors:** LGU Admin (Web Admin) | System / Database | Field Staff (Mobile App) | Beneficiary (At Booth)
* **Flow:**
  1. LGU Admin schedules and opens a Distribution Event for designated barangays.
  2. Beneficiary presents Digital or Printed QR Pass at the relief distribution station.
  3. Field Staff scans QR code via mobile camera.
  4. System performs real-time atomic check:
     - **Verification Check:** Is household status `VERIFIED`?
     - **Duplicate Check:** Has this `householdId` already claimed under this `distributionEventId`?
     - If **DUPLICATE DETECTED:** System triggers audio/visual fraud alert, blocks release, logs attempt to `AuditLog`, and broadcasts WebSocket event to LGU Command Center.
     - If **VALID:** System dynamically computes package entitlement based on household member count and policy multipliers (e.g., >5 members receives base pack + top-up unit).
  5. Staff releases relief goods and confirms in app. System commits atomic transaction to MongoDB and emits real-time progress update.

### 4.3 Post-Disaster Damage Assessment & GIS Heatmap Flow (`04_4_Damage_Reporting_GIS_Heatmap_Flow.drawio`)
* **Actors:** Resident (Mobile App) | Cloudinary CDN | MitigatePlus Backend | LGU/Barangay Officials
* **Flow:**
  1. Resident captures photo of residential typhoon/flood damage and tags damage level (Minor, Moderate, Severe, Totally Damaged).
  2. Mobile client fetches GPS hardware coordinates and uploads image to Cloudinary CDN.
  3. Backend calculates dynamic **Household Priority Score** (0 - 100) based on damage severity and household vulnerability.
  4. Leaflet GIS engine renders interactive heatmap on LGU Web Admin with color-coded pins.
  5. Officials prioritize high-density clusters for immediate relief dispatch.

### 4.4 Special Assistance Request & Door-to-Door Delivery Flow (`04_5_Special_Assistance_Requests_Flow.drawio`)
* **Actors:** Resident (Mobile App) | LGU Admin (Web Admin) | Field Staff (Mobile App)
* **Flow:**
  1. Vulnerable resident (senior citizen, PWD) submits home delivery request with justification.
  2. Request appears in LGU Admin's Special Request Relief queue.
  3. Admin reviews household profile and assigns an available Field Staff member.
  4. Field Staff receives push notification and task entry with beneficiary address and contact.
  5. Staff completes door-to-door delivery, confirms in mobile app, and system updates request status to `Delivered` with timestamped audit trail.

---

## 5. HOW TO OPEN AND USE THE DIAGRAMS

### In Draw.io / diagrams.net:
1. Open **[app.diagrams.net](https://app.diagrams.net)** in any web browser.
2. Click **File ➔ Open From ➔ Device...**
3. Select `MitigatePlus_Master_Diagrams.drawio` to access **all 13 diagram tabs** in a single interactive canvas!
4. Alternatively, open any of the individual `.drawio` files from `C:\Capstone Final Project\drawio_diagrams\`.

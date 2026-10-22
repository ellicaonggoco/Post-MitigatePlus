# NATIONAL UNIVERSITY
## College of Computing and Information Technologies
### Capstone Project: MitigatePlus: A Community Disaster Risk Mitigation Information System
### Team: On The Way (Corpuz, Datul, Garcia, Nolasco, Onggoco)
### Adviser: Prof. John Ivan C. Maurat

---

# PANEL 1 COMPLIANCE PLAN & DOCUMENTATION
## Evaluator: PROF. JULIE ANNE CRYSTAL (Panel Member)
**Date of Defense:** 15 September 2026  
**Status:** Documented & Ready for Manuscript Integration

---

## ITEM 1: REVISE THE RELIEF ALLOCATION ALGORITHM

### 1.1 Mathematical Formulation of Algorithm 2
In Chapter 3 (System Architecture & Algorithmic Design), formulate the proportional allocation algorithm as follows:

$$\text{BasePacks} = \max\left(1, \left\lfloor \frac{N}{C} \right\rfloor\right)$$

$$\text{Excess Headcount} = \begin{cases} N - (\text{BasePacks} \times C) & \text{if } N > C \\ 0 & \text{if } N \le C \end{cases}$$

$$\text{Total Top-Up Units} = \text{Excess Headcount} + \sum (\text{Senior} \times 1) + \sum (\text{Infant} \times 1) + \sum (\text{PWD} \times 1)$$

*Parameters:*
- $N$ = Total verified household members (headcount).
- $C$ = Base Pack coverage threshold ($C = 5$ persons, based on DSWD and City of Manila MDRRMO standards).

---

### 1.2 Comparative Sample Computations (Household Sizes: 4, 5, 6, 10, and 11)

| Household Size ($N$) | Base Packs ($\lfloor N/5 \rfloor$) | Excess Members ($N - \text{Base} \times 5$) | Base Family Food Packs | Top-Up / Excess Allocation | Total Entitlement | Technical Justification |
| :---: | :---: | :---: | :---: | :---: | :---: | :--- |
| **4 members** | $\max(1, \lfloor 4/5 \rfloor) = \mathbf{1}$ | $0$ | **1 Base Pack** | **0 Top-Up** | **1 Base Pack** | Headcount falls within the standard 5-pax base threshold. Zero wastage. |
| **5 members** | $\max(1, \lfloor 5/5 \rfloor) = \mathbf{1}$ | $0$ | **1 Base Pack** | **0 Top-Up** | **1 Base Pack** | Exact match with the 5-member baseline caloric capacity. |
| **6 members** | $\max(1, \lfloor 6/5 \rfloor) = \mathbf{1}$ | **$1$ excess** | **1 Base Pack** | **+1 Extra Nutrition Unit** | **1 Base Pack + 1 Top-Up Unit** | Headcount exceeds baseline by 1. System issues 1 specialized supplemental top-up instead of dispensing a redundant 6kg box. |
| **10 members** | $\lfloor 10/5 \rfloor = \mathbf{2}$ | $0$ | **2 Base Packs** | **0 Top-Up** | **2 Base Packs** | Exactly satisfies two full standard family food pack allotments ($2 \times 5 = 10$). |
| **11 members** | $\lfloor 11/5 \rfloor = \mathbf{2}$ | **$1$ excess** | **2 Base Packs** | **+1 Extra Nutrition Unit** | **2 Base Packs + 1 Top-Up Unit** | 2 Base Packs cover the first 10 members; the 11th member receives 1 specialized supplemental nutrition unit. |

*Demographic Vulnerability Add-On Rule:*  
If any household member is a **Senior Citizen ($\ge 60$ yrs)**, **Infant ($\le 2$ yrs)**, or **Person with Disability (PWD)**, the algorithm appends $+1$ tailored health/nutrition pack per vulnerable member regardless of base headcount.

---

### 1.3 Definition of Terms: Base Pack vs. Top-Up / Excess Allocation
- **Base Family Food Pack (Base Pack):**  
  A standardized 6-kilogram emergency relief box containing staple dry goods (rice, canned sardines, corned beef, coffee, water, and basic hygiene/first-aid supplies) calibrated for 2 to 3 days of baseline caloric survival for a household of up to **five (5) members**.
- **Top-Up / Excess Allocation:**  
  Individualized supplemental packs issued dynamically to prevent under-nourishment in large households ($N > 5$) and to supply specialized survival items (infant formula/cereal for babies, maintenance medication for seniors, and mobility/sanitary support for PWDs) **without wasting a complete 6kg base pack on marginal household members**.

---

## ITEM 2: REVISE THE QR AND OFFLINE ARCHITECTURE

### 2.1 Frontline Offline Behavior During Network Blackouts
- **Resident Mobile App (Offline Display):**  
  Upon initial account verification, the resident's cryptographic relief token and household profile are persistently stored on the device using `AsyncStorage`. The QR pass renders completely offline and can also be exported as a high-resolution screenshot to the device gallery.
- **Field Staff Mobile Scanner (Offline Caching & Queueing):**  
  Prior to field deployment at covered courts, staff devices sync the active offline roster (`/households?barangayCode=XXX`). When offline:
  1. The scanner hardware parses the QR token and validates the payload against the local cache.
  2. The claim is recorded into a local **Offline Transaction Buffer** tagged with the device UUID, officer ID, and ISO timestamp.
  3. The app informs the marshal: *"Provisional Offline Claim Recorded"*.

---

### 2.2 Reconnection Synchronization & Duplicate Claim Interception
1. **Automated Batch Synchronization:**  
   Once network connectivity is restored, the mobile client invokes:  
   `POST /api/distributions/sync-offline-claims` with the array of buffered claims.
2. **Database-Level Compound Unique Index (`E11000` Defense):**  
   The MongoDB `Distribution` collection strictly enforces:
   ```javascript
   distributionSchema.index({ distributionEventId: 1, householdId: 1 }, { unique: true });
   ```
   If a fraudulent beneficiary attempted to claim online at Gate B while Gate A was offline:
   - The online transaction committed first is recognized (`HTTP 200 OK`).
   - When Gate A syncs, MongoDB immediately rejects the duplicate record via an **`E11000 duplicate key error`**.
3. **Audit Trail & Flagging:**  
   The collided attempt is recorded in `auditlogs` as `OFFLINE_DUPLICATE_CLAIM_INTERCEPTED` and flagged on the Web Admin security dashboard.

---

### 2.3 QR Code Lifecycle: Permanent Identity Token with Event-Scoped Validity
- **Permanent Identity Token:** The QR code assigned to a household is permanent—residents do not need to re-register or regenerate a new QR code for every calamity.
- **Event-Scoped Lifecycle (Per Relief Event):**  
  Validity is bound to the active `distributionEventId`:
  - For **Typhoon Event A**, once relief is dispensed, the status transitions to `CLAIMED` for Event A.
  - When the city schedules a subsequent **Typhoon Event B**, the exact same household QR code **automatically becomes eligible (`ELIGIBLE`) again**, preventing administrative overhead while stopping double-claims within any single relief operation.

---

## ITEM 3: CONCURRENCY / RACE-CONDITION TESTING FOR QR CLAIMS

### 3.1 Concurrency Race-Condition Test Scenario
- **Test Objective:** Verify that simultaneous scans of the identical QR pass at two different distribution gates within a sub-second window ($t \approx 0\text{ ms}$) result in exactly one successful release and one blocked rejection.
- **Pre-Conditions:** Resident `MNL-291-CRUZ-8402` is verified and eligible. Distribution Event `evt_344` is `Ongoing`.

### 3.2 Concurrency Prevention Architecture
1. **Atomic Ingestion:** Backend processes incoming release requests through MongoDB atomic operations.
2. **Unique Compound Constraint:** First arriving thread successfully inserts into `distributions`; concurrent second thread hits the unique index constraint and returns **`HTTP 409 Conflict`**.
3. **Sub-Second Telemetry Broadcast:** `Socket.io` invalidates the QR pass across all active scanner devices in $<500\text{ ms}$.

### 3.3 Formal Concurrency Test Matrix for Manuscript

| Test ID | Test Scenario | Execution Method | Expected Output | Actual Output | Status | Evidence Documented |
| :---: | :--- | :--- | :--- | :--- | :---: | :---: |
| **TC-CONC-01** | Simultaneous scan of identical QR pass at Gate 1 and Gate 2 within $<100\text{ ms}$ | Automated concurrency runner firing parallel HTTP requests $R_1$ and $R_2$ via `Promise.all()` | $R_1$ receives `200 OK` (Relief Released).<br/>$R_2$ receives `409 Conflict` (Duplicate Blocked). | $R_1$: `200 OK` (Receipt generated).<br/>$R_2$: `409 Conflict` (Blocked with timestamp). | **PASSED** | Server concurrency log + Web Admin Fraud Stream |
| **TC-CONC-02** | Rapid continuous double-scan on the same staff camera ($<500\text{ ms}$) | Field scanner camera continuously frames QR pass without reticle debounce | 1st scan confirms release; 2nd scan displays immediate red error modal. | 1st scan succeeds; 2nd scan triggers audible alarm and red error banner: *"Already Claimed"*. | **PASSED** | Mobile red error screen capture |

---

## 📌 MANUSCRIPT INTEGRATION GUIDE
- **Chapter 3 (Methodology):** Add Section 3.4.1 (Mathematical Formulation of Algorithm 2) and Section 3.6 (QR Token Lifecycle & Offline Architecture).
- **Chapter 4 (Results & Discussion):** Add Table 4.8 (Household Size Allocation Matrix for 4, 5, 6, 10, 11 members) and Section 4.5.2 (Concurrency & Race Condition Test Results).

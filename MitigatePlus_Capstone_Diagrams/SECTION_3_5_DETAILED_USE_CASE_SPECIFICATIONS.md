# SECTION 3.5: DETAILED USE CASE SPECIFICATIONS

---

### Table 3.5.1: Register Household Account and Upload Valid Government ID

| Field | Specification |
| :--- | :--- |
| **Use Case Name** | Register Household Account and Upload Valid Government ID |
| **Actor(s)** | Community Resident |
| **Description** | Allows a resident to register their family into the disaster relief database by submitting household demographics, address, and an image of a valid government ID. |
| **Pre-condition** | Resident has the mobile app installed and is on the registration screen. |
| **Post-condition** | Household profile is submitted to the database with a pending verification status. |
| **Main Scenario** | 1. Resident opens the mobile app and taps Register.<br>2. Resident fills in household head name, family member headcount, and address.<br>3. Resident captures or selects a photo of their government ID.<br>4. Resident submits the registration form.<br>5. System triggers the OTP verification process. |
| **Alternative Scenario** | If required fields or the ID photo are missing, the system displays validation errors and prompts the resident to complete the form. |

---

### Table 3.5.2: Verify OTP via Semaphore SMS / Email Gateway

| Field | Specification |
| :--- | :--- |
| **Use Case Name** | Verify OTP via Semaphore SMS / Email Gateway |
| **Actor(s)** | Community Resident, Semaphore SMS Gateway |
| **Description** | Authenticates resident phone numbers using a 6-digit one-time password during registration and account recovery. |
| **Pre-condition** | Registration or password reset form has been submitted with a valid mobile number. |
| **Post-condition** | Mobile number ownership is verified and account creation proceeds. |
| **Main Scenario** | 1. System generates a secure 6-digit OTP with a 5-minute expiration window.<br>2. System calls Semaphore SMS API to send the OTP code to the resident.<br>3. Resident receives the SMS and enters the code in the mobile app.<br>4. System validates the code and confirms verification. |
| **Alternative Scenario** | If the entered code is incorrect or expired, the system prompts the user to re-enter the code or request a new OTP. |

---

### Table 3.5.3: Forgot Password and OTP Reset

| Field | Specification |
| :--- | :--- |
| **Use Case Name** | Forgot Password and OTP Reset |
| **Actor(s)** | Community Resident |
| **Description** | Allows residents who cannot access their account to recover and update their password using SMS OTP verification. |
| **Pre-condition** | Resident account exists in the database. |
| **Post-condition** | Resident password is updated with a new Bcrypt hash. |
| **Main Scenario** | 1. Resident taps Forgot Password on the login screen.<br>2. Resident submits their registered phone number.<br>3. System verifies phone ownership via SMS OTP.<br>4. Resident enters a new password.<br>5. System encrypts and saves the new password. |
| **Alternative Scenario** | If the mobile number is not registered, the system informs the user that no matching account was found. |

---

### Table 3.5.4: Access Digital QR Relief Pass and Beneficiary Profile

| Field | Specification |
| :--- | :--- |
| **Use Case Name** | Access Digital QR Relief Pass and Beneficiary Profile |
| **Actor(s)** | Community Resident |
| **Description** | Displays the resident's unique digital QR relief pass and verification badge on their mobile screen. |
| **Pre-condition** | Resident is logged in and account has been verified by the barangay. |
| **Post-condition** | Digital QR code pass is rendered on the screen for physical scanning. |
| **Main Scenario** | 1. Resident navigates to the QR Pass tab.<br>2. System fetches the verified QR token payload from the server.<br>3. System renders a high-contrast SVG QR pass with household details. |
| **Alternative Scenario** | If the resident's account is still pending verification, the app displays a pending status banner instead of the active QR pass. |

---

### Table 3.5.5: Download and Sync Offline QR Token in AsyncStorage

| Field | Specification |
| :--- | :--- |
| **Use Case Name** | Download and Sync Offline QR Token in AsyncStorage |
| **Actor(s)** | Community Resident |
| **Description** | Automatically caches the encrypted QR token into local device storage for offline use during disaster network outages. |
| **Pre-condition** | Resident opens the QR pass screen while connected to the internet. |
| **Post-condition** | Encrypted QR token is stored in AsyncStorage on the resident's device. |
| **Main Scenario** | 1. System retrieves the latest QR pass payload from the backend API.<br>2. System saves the encrypted payload into local SQLite-backed AsyncStorage.<br>3. When network connectivity drops, the app automatically loads the token from local storage. |
| **Alternative Scenario** | If local storage read fails, the app prompts the resident to reconnect to the network to refresh their pass. |

---

### Table 3.5.6: Apply for Post-Disaster Cash-For-Work Employment & Livelihood Projects

| Field | Specification |
| :--- | :--- |
| **Use Case Name** | Apply for Post-Disaster Cash-For-Work Employment & Livelihood Projects |
| **Actor(s)** | Community Resident |
| **Description** | Enables verified affected residents to apply for emergency civic employment and community restoration work to earn wage assistance. |
| **Pre-condition** | Resident is logged in, household is verified, and a post-disaster livelihood drive is active. |
| **Post-condition** | Application is submitted with priority index score and queued for LGU Admin approval. |
| **Main Scenario** | 1. Resident navigates to Livelihood & Cash-For-Work in the mobile app.<br>2. System displays active civic recovery programs (Debris Clearing, Drainage Unclogging, Community Repair).<br>3. Resident selects an able-bodied household member as the designated worker.<br>4. Resident submits the work application.<br>5. System verifies household quota and queues the application for payroll assignment. |
| **Alternative Scenario** | If the household has already reached the maximum active worker allocation per family, the system prompts the resident to select an unassigned member or view existing schedules. |

---

### Table 3.5.7: Verify Household Eligibility & Priority Index Score

| Field | Specification |
| :--- | :--- |
| **Use Case Name** | Verify Household Eligibility & Priority Index Score |
| **Actor(s)** | Community Resident, MitigatePlus System |
| **Description** | Evaluates household vulnerability factors and disaster impact to prioritize Cash-For-Work slots for the most needy families. |
| **Pre-condition** | Resident submits a Cash-For-Work application. |
| **Post-condition** | Household Priority Index Score is computed and attached to the work ticket. |
| **Main Scenario** | 1. System retrieves household profile, member count, and damage report severity.<br>2. Scoring engine computes priority points based on low-income status, single-parent heads, and disaster damage level.<br>3. System ranks the applicant in the barangay prioritization queue. |
| **Alternative Scenario** | If damage report data is incomplete, the system computes the baseline score from verified demographics and schedules priority ranking upon full assessment. |

---

### Table 3.5.8: Select Recovery Work Category (Debris, Clearing, Shelter Repair)

| Field | Specification |
| :--- | :--- |
| **Use Case Name** | Select Recovery Work Category (Debris, Clearing, Shelter Repair) |
| **Actor(s)** | Community Resident |
| **Description** | Allows the resident applicant to choose the specific post-disaster civic rehabilitation task best suited to their physical capacity and proximity. |
| **Pre-condition** | Resident is filling out the Cash-For-Work application form. |
| **Post-condition** | Selected work category, daily wage standard, and assigned sector are logged. |
| **Main Scenario** | 1. Resident selects work preference from available tracks: Road Debris Clearing, Drainage Desilting, or Public Shelter Sanitation.<br>2. System displays daily wage rate conforming to Manila LGU standard compensation.<br>3. Resident confirms task selection and accepts safety guidelines. |
| **Alternative Scenario** | If a specific category reaches full volunteer capacity in that barangay, the system suggests the nearest open category with available openings. |

---

### Table 3.5.9: Submit Disaster Damage Report and Live GPS Coordinates

| Field | Specification |
| :--- | :--- |
| **Use Case Name** | Submit Disaster Damage Report and Live GPS Coordinates |
| **Actor(s)** | Community Resident |
| **Description** | Allows residents to submit photo evidence of flood damage tagged with exact GPS coordinates. |
| **Pre-condition** | Resident is logged in and device GPS location is enabled. |
| **Post-condition** | Damage report is recorded in the database and plotted on the GIS heatmap. |
| **Main Scenario** | 1. Resident opens Report Damage screen.<br>2. Resident captures a live photo of structural flood damage.<br>3. Resident selects damage severity (Minor, Moderate, Severe, or Totally Damaged).<br>4. App automatically detects device GPS coordinates.<br>5. Resident taps Submit Report. |
| **Alternative Scenario** | If GPS cannot be detected automatically, the resident is prompted to select their approximate address on the map. |

---

### Table 3.5.10: Upload Photo to Cloudinary and Auto-Compute Priority Score

| Field | Specification |
| :--- | :--- |
| **Use Case Name** | Upload Photo to Cloudinary and Auto-Compute Priority Score |
| **Actor(s)** | Community Resident |
| **Description** | Uploads damage images to Cloudinary CDN and calculates household vulnerability priority points. |
| **Pre-condition** | Damage report photo is submitted by the resident. |
| **Post-condition** | Image URL is saved and household priority score is updated in the database. |
| **Main Scenario** | 1. System uploads the image file to Cloudinary CDN.<br>2. CDN returns a secure photo URL.<br>3. Backend scoring formula evaluates damage level, headcount, and vulnerable members.<br>4. Household priority score is updated in the database. |
| **Alternative Scenario** | If the image upload fails due to network disruption, the app saves the report locally and retries the upload once reconnected. |

---

### Table 3.5.11: Request Special Assistance Relief

| Field | Specification |
| :--- | :--- |
| **Use Case Name** | Request Special Assistance Relief |
| **Actor(s)** | Community Resident |
| **Description** | Enables elderly, injured, or bedridden citizens to request door-to-door delivery of relief packages. |
| **Pre-condition** | Resident is logged in and assistance window is active. |
| **Post-condition** | Special assistance request is queued for admin review and staff dispatch. |
| **Main Scenario** | 1. Resident navigates to Special Assistance in the mobile app.<br>2. Resident selects condition category (Senior, Bedridden, PWD, or Medical Need).<br>3. Resident enters delivery notes and submits the request.<br>4. System saves the request in the pending dispatch queue. |
| **Alternative Scenario** | If the resident already has an open active request, the system informs them that their pending request is currently being processed. |

---

### Table 3.5.12: View Relief Claims History and Emergency Bulletins

| Field | Specification |
| :--- | :--- |
| **Use Case Name** | View Relief Claims History and Emergency Bulletins |
| **Actor(s)** | Community Resident |
| **Description** | Displays past relief distribution receipts and official emergency announcements published by the LGU. |
| **Pre-condition** | Resident is logged in to the mobile application. |
| **Post-condition** | Historical receipts and active emergency bulletins are shown on the screen. |
| **Main Scenario** | 1. Resident opens Claims History or Home Screen.<br>2. System queries the database for claimed distribution records and active advisories.<br>3. App renders receipts showing event titles, items claimed, timestamps, and active notices. |
| **Alternative Scenario** | If no claims have been made yet, the screen displays an empty state indicating no relief history. |

---

### Table 3.5.13: Login and Authenticate Session (Role-Based Token Authentication)

| Field | Specification |
| :--- | :--- |
| **Use Case Name** | Login and Authenticate Session |
| **Actor(s)** | Community Resident, LGU Field Staff |
| **Description** | Verifies user credentials (with Biometric touch/face ID support) and generates a secure JSON Web Token (JWT) establishing an active session. |
| **Pre-condition** | User has an active registered account in the system. |
| **Post-condition** | User is authenticated and navigated to their respective role dashboard. |
| **Main Scenario** | 1. User inputs registered phone/email and password, or scans biometric fingerprint/FaceID.<br>2. Backend checks credentials against the Bcrypt password hash.<br>3. System returns a scoped JWT containing user role permissions.<br>4. Mobile client stores the token securely and opens the home dashboard. |
| **Alternative Scenario** | If credentials are invalid, the system displays an invalid username or password error. |

---

### Table 3.5.14: Scan Beneficiary QR Relief Pass via Mobile Camera Scanner

| Field | Specification |
| :--- | :--- |
| **Use Case Name** | Scan Beneficiary QR Relief Pass via Mobile Camera Scanner |
| **Actor(s)** | LGU Field Staff |
| **Description** | Scans resident digital or printed QR codes during distribution operations to check eligibility and prevent duplicate claims. |
| **Pre-condition** | Field staff is logged in and an active distribution event is selected. |
| **Post-condition** | Resident QR payload is scanned and submitted for backend validation. |
| **Main Scenario** | 1. Field staff selects the active distribution drive.<br>2. Staff opens the camera scanner in the mobile app.<br>3. Staff points the camera at the resident QR pass.<br>4. App decodes the QR code and submits the payload to the verification endpoint. |
| **Alternative Scenario** | If the QR code is damaged or unreadable, the staff can enter the beneficiary household ID manually. |

---

### Table 3.5.15: Release Relief Goods and Deduct Warehouse Stock

| Field | Specification |
| :--- | :--- |
| **Use Case Name** | Release Relief Goods and Deduct Warehouse Stock |
| **Actor(s)** | LGU Field Staff |
| **Description** | Confirms physical handover of relief goods to the beneficiary and deducts the inventory stock in real time. |
| **Pre-condition** | Scanned QR pass is verified and confirmed as not yet claimed. |
| **Post-condition** | Distribution record is created and warehouse inventory count is reduced. |
| **Main Scenario** | 1. System displays household member count and calculated relief pack quota.<br>2. Staff hands over the relief goods physically.<br>3. Staff taps Confirm Release in the app.<br>4. System records the distribution transaction and deducts stock from the warehouse ledger. |
| **Alternative Scenario** | If warehouse stock is insufficient, the system alerts the staff and logs a partial release. |

---

### Table 3.5.16: Intercept Duplicate Relief Claim and Stream Real-Time Fraud Alert

| Field | Specification |
| :--- | :--- |
| **Use Case Name** | Intercept Duplicate Relief Claim and Stream Real-Time Fraud Alert |
| **Actor(s)** | LGU Field Staff |
| **Description** | Blocks duplicate claim attempts using database compound indexing and alerts both the field staff and web admin. |
| **Pre-condition** | Staff scans a QR pass that has already claimed relief goods for the current event. |
| **Post-condition** | Claim is blocked, fraud warning is displayed, and event is logged in the fraud dashboard. |
| **Main Scenario** | 1. Staff scans the resident QR code.<br>2. Backend checks compound index (qrCode + eventId) and finds an existing claim record.<br>3. Staff app displays a red duplicate claim warning banner.<br>4. System pushes a real-time WebSocket alert to the Web Admin Fraud Interception stream. |
| **Alternative Scenario** | Staff verifies the resident identity and can submit an audit note if an investigation is required. |

---

### Table 3.5.17: Log Relief Package Distribution and Timestamp Audit Record

| Field | Specification |
| :--- | :--- |
| **Use Case Name** | Log Relief Package Distribution and Timestamp Audit Record |
| **Actor(s)** | LGU Field Staff |
| **Description** | Creates an immutable distribution record containing timestamp, event ID, household ID, and releasing staff ID. |
| **Pre-condition** | Relief release confirmation button is pressed. |
| **Post-condition** | Permanent audit record is saved in MongoDB for compliance and reporting. |
| **Main Scenario** | 1. System captures the exact transaction timestamp.<br>2. System binds the staff ID, household ID, and package details into the distribution document.<br>3. Record is written to the database with write verification. |
| **Alternative Scenario** | If a database timeout occurs, the mobile app queues the transaction and retries automatically. |

---

### Table 3.5.18: Report On-Ground Incidents, GPS Location & Photo Evidence

| Field | Specification |
| :--- | :--- |
| **Use Case Name** | Report On-Ground Incidents, GPS Location & Photo Evidence |
| **Actor(s)** | LGU Field Staff |
| **Description** | Enables field staff to submit real-time reports regarding impassable roads, water rise, or hazards with auto-captured GPS and photo evidence to the LGU Command Center. |
| **Pre-condition** | Field staff is logged in and encounters an on-ground operational hazard. |
| **Post-condition** | Hazard incident is saved and broadcast to the Web Admin command dashboard. |
| **Main Scenario** | 1. Staff opens Incident Report screen in mobile app.<br>2. Staff selects incident type (Lost QR Card, Duplicate Attempt, Damaged Stock, Queue Disturbance).<br>3. App auto-captures precise GPS coordinates and allows taking/attaching a photo.<br>4. Staff enters descriptive notes and taps Submit Incident.<br>5. System saves the incident and emits a Socket.IO real-time alert to web administrators. |
| **Alternative Scenario** | If internet connectivity is weak, the report is queued locally and sent immediately once signal is restored. |

---

### Table 3.5.19: Deliver Special Assistance Packages Door-to-Door

| Field | Specification |
| :--- | :--- |
| **Use Case Name** | Deliver Special Assistance Packages Door-to-Door |
| **Actor(s)** | LGU Field Staff |
| **Description** | Manages the on-ground delivery of relief packages directly to the homes of bedridden or senior citizens. |
| **Pre-condition** | Special assistance delivery task is assigned to the field staff member. |
| **Post-condition** | Request status is updated to received with an immutable completion timestamp. |
| **Main Scenario** | 1. Field staff opens Assigned Tasks on mobile.<br>2. Staff navigates to the resident's home address.<br>3. Staff delivers the relief package to the resident.<br>4. Staff taps Mark as Delivered in the app.<br>5. System updates the task record to completed in the database. |
| **Alternative Scenario** | If the resident is not home or has evacuated, the staff logs an unreached note for admin rescheduling. |

---

### Table 3.5.20: Scan QR for Daily Cash-For-Work Attendance & Task Verification

| Field | Specification |
| :--- | :--- |
| **Use Case Name** | Scan QR for Daily Cash-For-Work Attendance & Task Verification |
| **Actor(s)** | LGU Field Staff |
| **Description** | Enables field supervisors to scan beneficiary QR passes at work sites (morning check-in and afternoon checkout) to verify rendered civic work hours. |
| **Pre-condition** | Field staff is stationed at an authorized Cash-For-Work project site. |
| **Post-condition** | Daily attendance log is recorded and linked to the LGU wage payroll calculation engine. |
| **Main Scenario** | 1. Field staff opens Cash-For-Work Attendance Scanner on mobile app.<br>2. Beneficiary presents their digital or printed QR pass.<br>3. Staff scans QR code to record time-in and task assignment.<br>4. At end of shift, staff scans again to record time-out and task completion rating.<br>5. System commits verified work hours to the municipal payroll database. |
| **Alternative Scenario** | If a worker arrives late or without their pass, the supervisor can manually look up their verified household worker record. |

---

### Table 3.5.21: User and Admin Account Governance and Role Provisioning

| Field | Specification |
| :--- | :--- |
| **Use Case Name** | User and Admin Account Governance and Role Provisioning |
| **Actor(s)** | Super Admin |
| **Description** | Enables the SuperAdmin to create and configure official accounts for LGU administrators, barangay officials, and field staff. |
| **Pre-condition** | SuperAdmin is authenticated in the web admin portal. |
| **Post-condition** | Official user accounts are created with configured RBAC permissions. |
| **Main Scenario** | 1. SuperAdmin opens Provision Accounts page.<br>2. SuperAdmin inputs official's name, email, department, and role.<br>3. SuperAdmin clicks Create Account.<br>4. System encrypts password using Bcrypt, saves the user record, and logs the action in the audit trail. |
| **Alternative Scenario** | If the email already exists in the system, an account duplication error is displayed. |

---

### Table 3.5.22: Configure Global Relief Formulas and Disaster Risk Thresholds

| Field | Specification |
| :--- | :--- |
| **Use Case Name** | Configure Global Relief Formulas and Disaster Risk Thresholds |
| **Actor(s)** | Super Admin |
| **Description** | Allows the SuperAdmin to manage global relief calculation formulas, family multipliers, Cash-For-Work wage rates, and warehouse buffer safety thresholds. |
| **Pre-condition** | SuperAdmin is logged into the Policy Configuration page. |
| **Post-condition** | Global policy configuration is updated in the database and applied system-wide. |
| **Main Scenario** | 1. SuperAdmin opens Global Policy Config.<br>2. SuperAdmin updates base package quotas, vulnerability multipliers, daily CFW wage rates, or minimum stock thresholds.<br>3. SuperAdmin clicks Save Policy.<br>4. System persists updated parameters and logs an audit record. |
| **Alternative Scenario** | If invalid numerical values or negative numbers are entered, the system prevents saving and shows input error markers. |

---

### Table 3.5.23: System Archives Audit Trail and Fraud Data Logs

| Field | Specification |
| :--- | :--- |
| **Use Case Name** | System Archives Audit Trail and Fraud Data Logs |
| **Actor(s)** | Super Admin |
| **Description** | Provides access to immutable system security audit logs and supports encrypted CSV export for government compliance (e.g. COA). |
| **Pre-condition** | SuperAdmin is logged in and opens the System Audit Logs module. |
| **Post-condition** | Audit log records are retrieved, filtered, and exported as a certified CSV report. |
| **Main Scenario** | 1. SuperAdmin opens System Audit Logs.<br>2. SuperAdmin filters logs by date range, user role, action type, or IP address.<br>3. System queries MongoDB for matching immutable audit entries.<br>4. SuperAdmin clicks Export CSV.<br>5. System generates and downloads the compliance audit file. |
| **Alternative Scenario** | If no records match the selected filter criteria, an empty result message is displayed. |

---

### Table 3.5.24: Resident Household Account Verification Queue (ID Review)

| Field | Specification |
| :--- | :--- |
| **Use Case Name** | Resident Household Account Verification Queue (ID Review) |
| **Actor(s)** | Admin, Barangay Official |
| **Description** | Allows officials to review pending registrations, inspect government ID photos via zoomable lightbox, and approve or reject accounts. |
| **Pre-condition** | Pending resident registration records exist in the verification queue. |
| **Post-condition** | Resident account status is updated to verified or rejected. |
| **Main Scenario** | 1. Official navigates to Verification Queue in Web Admin.<br>2. Official clicks on a resident row to inspect demographic data and ID photo.<br>3. Official clicks Approve Account.<br>4. System marks isVerified as true, triggers QR code generation, and sends a push alert to the resident. |
| **Alternative Scenario** | If the submitted ID is invalid or unclear, the official clicks Reject and inputs a rejection reason sent back to the resident app. |

---

### Table 3.5.25: Generate Encrypted Digital QR Code Beneficiary Token

| Field | Specification |
| :--- | :--- |
| **Use Case Name** | Generate Encrypted Digital QR Code Beneficiary Token |
| **Actor(s)** | Admin, Barangay Official |
| **Description** | Generates an encrypted QR token string upon resident verification to serve as their official digital relief pass. |
| **Pre-condition** | Official approves a pending household registration. |
| **Post-condition** | Encrypted QR token payload is generated and saved in the household database record. |
| **Main Scenario** | 1. Verification engine receives approval confirmation.<br>2. System generates a secure cryptographic token combining household ID and verification signature.<br>3. Token is stored in MongoDB and linked to the resident's mobile profile. |
| **Alternative Scenario** | If token generation fails, the system logs the error and retries the process automatically. |

---

### Table 3.5.26: Reject Registration with Official Reason Audit Log

| Field | Specification |
| :--- | :--- |
| **Use Case Name** | Reject Registration with Official Reason Audit Log |
| **Actor(s)** | Admin, Barangay Official |
| **Description** | Rejects an invalid or fraudulent registration application and records the official justification in the audit trail. |
| **Pre-condition** | Official identifies an issue with the submitted registration or ID photo. |
| **Post-condition** | Account is marked as rejected with reasons logged and sent to the resident. |
| **Main Scenario** | 1. Official clicks Reject on the verification modal.<br>2. Official selects or types the rejection reason (e.g., Unclear ID photo or Non-resident address).<br>3. Official confirms rejection.<br>4. System updates account status to Rejected, logs the audit note, and notifies the applicant. |
| **Alternative Scenario** | Resident can re-open their mobile app, view the rejection reason, and re-upload an updated ID photo. |

---

### Table 3.5.27: Relief Distribution Events and Allocation Policy Management

| Field | Specification |
| :--- | :--- |
| **Use Case Name** | Relief Distribution Events and Allocation Policy Management |
| **Actor(s)** | Admin |
| **Description** | Manages the creation, scheduling, opening, and closing of relief distribution drives across targeted barangays. |
| **Pre-condition** | Admin is logged into the Distribution Events page. |
| **Post-condition** | Distribution event is scheduled and active for field staff scanning. |
| **Main Scenario** | 1. Admin clicks New Event.<br>2. Admin enters title, date, venue, target barangays, and relief item categories.<br>3. Admin sets event status to Active.<br>4. System saves the event, logs an audit entry, and broadcasts the event notice to resident apps. |
| **Alternative Scenario** | When relief operations end, the admin toggles event status to Closed, disabling further QR scans for that event. |

---

### Table 3.5.28: Compute Right-Sized Relief Entitlement Per Family Size

| Field | Specification |
| :--- | :--- |
| **Use Case Name** | Compute Right-Sized Relief Entitlement Per Family Size |
| **Actor(s)** | Admin |
| **Description** | Calculates the exact relief pack quota needed per family based on verified household headcount and vulnerability factors. |
| **Pre-condition** | Distribution event parameters and policy rules are defined. |
| **Post-condition** | Total required supply allocation is simulated and committed in the database. |
| **Main Scenario** | 1. Admin opens Relief Allocation simulator.<br>2. System applies the right-sized formula (Base Pack + Family Multiplier) across all verified households in the target area.<br>3. System displays total supply requirements and verifies warehouse stock reserves. |
| **Alternative Scenario** | If target requirements exceed warehouse stock, the system highlights the deficit in red and recommends procurement quantities. |

---

### Table 3.5.29: Damage Report Verification and Incident Queue Management

| Field | Specification |
| :--- | :--- |
| **Use Case Name** | Damage Report Verification and Incident Queue Management |
| **Actor(s)** | Admin |
| **Description** | Allows administrators to review crowd-sourced flood damage reports submitted by residents and verify severity ratings. |
| **Pre-condition** | Damage reports have been submitted by residents. |
| **Post-condition** | Reports are reviewed and priority ranks are confirmed for relief operations. |
| **Main Scenario** | 1. Admin opens Damage Reports Queue in Web Admin.<br>2. Admin inspects submitted damage photos, severity tags, and GPS coordinates.<br>3. Admin confirms report validity to update the household priority ranking. |
| **Alternative Scenario** | If a damage report is duplicate or spam, the admin marks it as dismissed with an audit log note. |

---

### Table 3.5.30: GIS Map and Hazard Zone Inundation Management

| Field | Specification |
| :--- | :--- |
| **Use Case Name** | GIS Map and Hazard Zone Inundation Management |
| **Actor(s)** | Admin |
| **Description** | Visualizes damage reports, flood inundation layers, evacuation center capacities, and evidence photos on an interactive Leaflet.js map. |
| **Pre-condition** | Admin opens the Barangay Heatmap module in Web Admin. |
| **Post-condition** | GIS map displays spatial hazard data and real-time operational markers. |
| **Main Scenario** | 1. Admin opens the GIS Heatmap page.<br>2. System renders Manila boundary polygons and color-coded damage pins.<br>3. Admin clicks on any pin or evacuation beacon to view real-time occupancy, damage metrics, and photo lightbox. |
| **Alternative Scenario** | Admin can toggle map overlays on and off to focus specifically on evacuation centers or flood hazard zones. |

---

### Table 3.5.31: Filter Inundation Map by Severity and Barangay Zone

| Field | Specification |
| :--- | :--- |
| **Use Case Name** | Filter Inundation Map by Severity and Barangay Zone |
| **Actor(s)** | Admin |
| **Description** | Enables administrators to filter map markers and statistics by specific barangay codes or damage severity levels. |
| **Pre-condition** | GIS Heatmap canvas is loaded with damage reports. |
| **Post-condition** | Map view and sidebar summary dynamically update to match the selected filters. |
| **Main Scenario** | 1. Admin selects a specific barangay or chooses a damage severity filter (Totally Damaged, Severe, Moderate, or Minor).<br>2. System filters the dataset in memory.<br>3. Map immediately re-renders displaying only the matching pins and stats. |
| **Alternative Scenario** | Admin selects All to reset the map view back to city-wide overview. |

---

### Table 3.5.32: Warehouse Inventory Stock and Buffer Supply Tracking

| Field | Specification |
| :--- | :--- |
| **Use Case Name** | Warehouse Inventory Stock and Buffer Supply Tracking |
| **Actor(s)** | Admin |
| **Description** | Tracks incoming stock deliveries, monitors item releases during events, and maintains real-time inventory counts. |
| **Pre-condition** | Admin or warehouse manager is logged into the Warehouse Inventory module. |
| **Post-condition** | Inventory balances and transaction logs are updated in MongoDB. |
| **Main Scenario** | 1. Admin navigates to Warehouse Inventory.<br>2. Admin records new incoming stock (Stock-In) for food, hygiene, or medical items.<br>3. System updates item totals and logs stock movement.<br>4. As goods are released on-ground, the system automatically deducts quantities in real time. |
| **Alternative Scenario** | Admin can adjust inventory counts manually to reconcile physical inventory discrepancies, with all manual adjustments logged to the audit trail. |

---

### Table 3.5.33: Trigger Low Stock Buffer Warning (Below Critical Threshold)

| Field | Specification |
| :--- | :--- |
| **Use Case Name** | Trigger Low Stock Buffer Warning |
| **Actor(s)** | Admin |
| **Description** | Automatically displays a warning banner and alert indicator when warehouse stock falls below safety buffer thresholds. |
| **Pre-condition** | Relief distributions reduce warehouse inventory below the configured minimum buffer level. |
| **Post-condition** | Visual low stock alert banner is displayed on the admin dashboard. |
| **Main Scenario** | 1. Distribution releases reduce item inventory below threshold limits.<br>2. Inventory service detects buffer deficit.<br>3. System activates a prominent red Low Buffer Warning banner on the warehouse page.<br>4. Admin is alerted to initiate emergency procurement. |
| **Alternative Scenario** | When new stock-in deliveries replenish inventory above safety thresholds, the warning banner automatically clears. |

---

### Table 3.5.34: Review Special Assistance and Assign Field Staff to Cases

| Field | Specification |
| :--- | :--- |
| **Use Case Name** | Review Special Assistance and Assign Field Staff to Cases |
| **Actor(s)** | Admin |
| **Description** | Allows administrators to evaluate special relief requests from bedridden citizens and dispatch available field personnel. |
| **Pre-condition** | Pending special assistance requests exist in the system. |
| **Post-condition** | Request is assigned to a field staff member and dispatch alert is sent to their mobile app. |
| **Main Scenario** | 1. Admin opens Special Request Relief page in Web Admin.<br>2. Admin reviews resident vulnerability details and medical needs.<br>3. Admin selects an available on-ground field staff member from the dropdown.<br>4. Admin clicks Assign Staff.<br>5. System updates task status to Assigned and sends an instant notification to the staff app. |
| **Alternative Scenario** | If the request does not meet eligibility criteria, the admin can reject the request with a recorded justification. |

---

### Table 3.5.35: Assistance Gap Analytics and CSV / Report Data Export

| Field | Specification |
| :--- | :--- |
| **Use Case Name** | Assistance Gap Analytics and CSV / Report Data Export |
| **Actor(s)** | Admin |
| **Description** | Generates operational relief analytics comparing allocated goods versus actual claims, and exports formal PDF/CSV reports. |
| **Pre-condition** | Admin opens the Reports and Analytics page in Web Admin. |
| **Post-condition** | Gap analysis calculations are rendered and exported as formal compliance documents. |
| **Main Scenario** | 1. Admin opens Reports and Analytics.<br>2. Admin selects target barangay and relief category.<br>3. System aggregates total allocations, claims received, remaining gap deficits, and duplicate attempt tallies.<br>4. Admin clicks Export Report.<br>5. System generates and downloads the certified summary document. |
| **Alternative Scenario** | Admin can switch between PDF summary format for executive presentation and CSV format for raw data audit. |

---

### Table 3.5.36: Advance Disaster Recovery Phase (Emergency -> Relief -> Rehab)

| Field | Specification |
| :--- | :--- |
| **Use Case Name** | Advance Disaster Recovery Phase |
| **Actor(s)** | Admin |
| **Description** | Transitions the city's operational disaster status through standardized recovery milestones and syncs progress across all apps. |
| **Pre-condition** | Admin is authenticated in the Recovery Progress Tracker module. |
| **Post-condition** | Disaster recovery phase is updated in the database and synchronized across all mobile home screens. |
| **Main Scenario** | 1. Admin opens Recovery Progress Tracker.<br>2. Admin advances the phase stepper from Emergency Response to Immediate Relief, or to Rehabilitation and Recovery.<br>3. Admin clicks Confirm Transition.<br>4. System updates database recovery phase and broadcasts a real-time WebSocket event to all citizen mobile screens. |
| **Alternative Scenario** | If conditions worsen, the admin can revert the recovery phase backward to Emergency Response. |

---

### Table 3.5.37: Review Cash-For-Work Projects & Compute Wage Payroll

| Field | Specification |
| :--- | :--- |
| **Use Case Name** | Review Cash-For-Work Projects & Compute Wage Payroll |
| **Actor(s)** | Admin |
| **Description** | Allows municipal administrators to review barangay livelihood proposals, monitor field worker attendance, and compute official cash disbursements. |
| **Pre-condition** | Admin is logged into the Livelihood & Cash-For-Work module in Web Admin. |
| **Post-condition** | Payroll disbursement ledger is calculated and exported for municipal treasury release. |
| **Main Scenario** | 1. Admin opens Cash-For-Work Management tab.<br>2. System displays registered community projects and verified daily attendance logs.<br>3. Admin reviews rendered work days per household applicant.<br>4. Admin clicks Generate Payroll to compute total wage compensation per family.<br>5. System generates formal disbursement payroll summary for LGU audit approval. |
| **Alternative Scenario** | If an attendance dispute is flagged, the admin can inspect the daily QR scan audit log and adjust credited days before payroll finalization. |

---

### Table 3.5.38: Dispatch Medicine Buffer Restock to Barangay Health Centers

| Field | Specification |
| :--- | :--- |
| **Use Case Name** | Dispatch Medicine Buffer Restock to Barangay Health Centers |
| **Actor(s)** | Admin |
| **Description** | Manages the emergency allocation and logistics dispatch of critical medicine buffers (antibiotics, hydration packs, first-aid kits) to local barangay health posts. |
| **Pre-condition** | Health center stock request is submitted or warehouse inventory alert triggers restock protocol. |
| **Post-condition** | Waybill is generated, warehouse stock is deducted, and health center allocation is logged. |
| **Main Scenario** | 1. Admin opens Warehouse Inventory & Health Dispatch.<br>2. Admin selects target Barangay Health Center and requested medicine quantities.<br>3. Admin assigns dispatch logistics team and clicks Confirm Dispatch.<br>4. System deducts central warehouse stock and generates official delivery receipt.<br>5. Health center receives delivery notification on Web Admin portal. |
| **Alternative Scenario** | If central medical stock is below critical safety levels, the system alerts the admin to approve partial dispatch and flags urgent procurement. |

---

### Table 3.5.39: Beneficiary Household Directory and Family Member Registry

| Field | Specification |
| :--- | :--- |
| **Use Case Name** | Beneficiary Household Directory and Family Member Registry |
| **Actor(s)** | Barangay Official |
| **Description** | Allows barangay officials to browse, search, and inspect the complete list of verified resident households in their jurisdiction. |
| **Pre-condition** | Barangay official is logged into the web admin portal. |
| **Post-condition** | Verified resident roster and family member breakdowns are displayed. |
| **Main Scenario** | 1. Barangay official opens Beneficiary Directory in Web Admin.<br>2. Official searches by family head name, household ID, or street address.<br>3. System displays matching verified household cards and member breakdowns. |
| **Alternative Scenario** | If no households match the search query, the table displays a no records found notice. |

---

### Table 3.5.40: Publish Emergency Bulletins and Barangay Announcements

| Field | Specification |
| :--- | :--- |
| **Use Case Name** | Publish Emergency Bulletins and Barangay Announcements |
| **Actor(s)** | Barangay Official |
| **Description** | Enables barangay officials to draft and publish urgent evacuation notices and relief distribution schedules to resident phones. |
| **Pre-condition** | Barangay official is logged into the Announcements module. |
| **Post-condition** | Emergency announcement is published and displayed as a banner on resident mobile apps. |
| **Main Scenario** | 1. Official navigates to Announcements page.<br>2. Official inputs announcement title, message body, and urgency level.<br>3. Official clicks Publish Bulletin.<br>4. System saves the announcement, emits a Socket.IO push notification, and updates the mobile home screen banner. |
| **Alternative Scenario** | Official can edit or archive existing announcements when the emergency advisory is resolved. |

---

### Table 3.5.41: Submit Barangay Cash-For-Work Community Project Request

| Field | Specification |
| :--- | :--- |
| **Use Case Name** | Submit Barangay Cash-For-Work Community Project Request |
| **Actor(s)** | Barangay Official |
| **Description** | Allows barangay officials to propose localized community cleanup, debris clearing, or infrastructure rehabilitation projects to the city LGU for funding and resident employment. |
| **Pre-condition** | Barangay official is authenticated in the Web Admin portal. |
| **Post-condition** | Community project proposal is submitted and queued for city disaster relief allocation. |
| **Main Scenario** | 1. Barangay official navigates to Cash-For-Work Proposals in Web Admin.<br>2. Official specifies project title, target streets/zones, required worker count, and estimated duration.<br>3. Official attaches damage justification and taps Submit Proposal.<br>4. System routes proposal to LGU Admin for review and wage allocation. |
| **Alternative Scenario** | If additional justification is requested by the LGU Admin, the official can update the proposal notes and re-submit for approval. |

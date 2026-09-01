# SYSTEM PROCESS FLOW

This section presents the detailed process flows of the MitigatePlus system. The activities are divided into two main categories: Mobile Application Activities used by residents and field personnel, and Web Admin Activities used by LGU administrators and barangay officials.

---

## A. Mobile Application Activities

### Activity 1: Citizen Registration and SMS OTP Verification (ACT-M01)
* **Actors and Layers:** Resident, MitigatePlus Backend API, Semaphore SMS Gateway
* **Description:**
This activity handles the registration of new resident beneficiaries. The resident fills out the registration form by providing household demographic information, family headcount, address, and an image of a valid government ID. After the form is validated, the system generates a 6-digit OTP and sends it to the resident's mobile number through the Semaphore SMS gateway. Once the resident enters the correct OTP, the account is created and saved in the database with a pending verification status for barangay approval.

### Activity 2: Citizen Authentication and Password Reset (ACT-M02)
* **Actors and Layers:** Resident, Auth and JWT Middleware, MongoDB Atlas and Semaphore SMS
* **Description:**
This activity manages resident login, biometric access, and account recovery. To log in, the resident enters their registered mobile number or email and password, or authenticates using biometric fingerprint and FaceID. The system checks the Bcrypt password hash and issues a JSON Web Token (JWT) for the session. If the resident forgets their password, they can request an SMS OTP to verify their identity and set a new password securely.

### Activity 3: Digital QR Relief Pass and Offline Sync (ACT-M03)
* **Actors and Layers:** Resident, Backend Token Engine, AsyncStorage Local Database
* **Description:**
This activity allows residents to access their unique QR relief pass on their mobile devices. When an internet connection is available, the mobile app downloads the latest encrypted QR token from the server and stores it in the device's local storage using AsyncStorage. If an internet outage occurs during a disaster, the application loads the locally saved token so the resident can still present their QR code to relief workers.

### Activity 4: Post-Disaster Cash-For-Work Employment and Livelihood Projects (ACT-M04)
* **Actors and Layers:** Resident, LGU Admin Review and Payroll, Field Staff Attendance Scanner
* **Description:**
This activity enables verified disaster-affected residents to apply for emergency civic employment and community restoration work. Residents browse active recovery tracks such as road debris clearing, drainage desilting, and public shelter sanitation. The resident designates an able-bodied household worker, submits the application with their calculated priority index score, and checks daily shift schedules. Field supervisors scan the worker's QR pass on-site to log morning and afternoon attendance, enabling the LGU to compute and disburse accurate cash compensation.

### Activity 5: Disaster Damage Reporting and Live GPS (ACT-M05)
* **Actors and Layers:** Resident, Cloudinary CDN, Geospatial Priority Database
* **Description:**
This activity enables residents to submit photo reports of flood damage to their homes. The resident takes a photo using the phone camera, selects the severity level (Minor, Moderate, Severe, or Totally Damaged), and allows the app to detect their GPS coordinates. The photo is uploaded to Cloudinary, and the report is saved in MongoDB. The system then computes a priority score to help officials identify families in urgent need.

### Activity 6: Relief Claims History and Distribution Receipts (ACT-M06)
* **Actors and Layers:** Resident, Backend Distribution Engine, MongoDB Database
* **Description:**
This activity allows residents to track all relief assistance they have received. The mobile app queries the database to retrieve a list of past claims. The screen displays the date, time, event title, items received, and the ID of the field staff who released the relief pack.

### Activity 7: Household Profile Update and Language Switcher (ACT-M07)
* **Actors and Layers:** Resident, Household Service, MongoDB Database
* **Description:**
This activity allows the head of the household to update their family information and change the language of the mobile app. Residents can update their family member count, which automatically updates the relief pack formula in the database. Residents can also switch the application interface between English and Tagalog.

### Activity 8: Staff QR Scanner and Anti-Duplicate Relief Release (ACT-M08)
* **Actors and Layers:** Resident Beneficiary, Field Staff, Anti-Fraud Compound Index Database
* **Description:**
This activity handles the verification of beneficiaries during actual relief operations. The field staff uses the mobile app camera to scan the resident's QR pass. The system checks the database to verify if the household is approved and ensures they have not claimed yet for that specific event. If a duplicate claim is detected, an alert is shown on the staff screen. If valid, the staff releases the calculated relief pack, and inventory is deducted automatically.

### Activity 9: Door-to-Door Special Assistance Delivery (ACT-M09)
* **Actors and Layers:** Field Staff, Task Assignment API, MongoDB Database
* **Description:**
This activity guides field workers in delivering relief goods directly to elderly, injured, or bedridden citizens. Field staff view their assigned delivery tasks in the mobile app, navigate to the resident's address, and hand over the relief package. Once delivered, the staff taps the confirmation button to update the status to received with a completion timestamp.

### Activity 10: Field Staff Incident and Hazard Reporting (ACT-M10)
* **Actors and Layers:** Field Staff, Socket.IO Real-Time Broadcast, MongoDB Database
* **Description:**
This activity allows field staff to report hazards encountered on the ground, such as flooded streets, road blockages, queue disturbances, or lost QR passes. The staff takes or attaches photo evidence, auto-captures live GPS coordinates, and enters descriptive notes. The report is saved in the database and broadcast in real time to the LGU Command Center using Socket.IO.

---

## B. Web Admin Application Activities

### Activity 11: Barangay Household Verification Queue (ACT-W01)
* **Actors and Layers:** Barangay Official, Backend Verification Service, Resident Mobile App
* **Description:**
This activity outlines how barangay officials verify resident applications. The official opens the verification table in the web portal and views the resident's submitted details and government ID photo via a zoomable lightbox. If the application is valid, the official approves the record, which activates the resident's digital QR pass and sends a push notification to their phone. If invalid, the official enters a reason and marks the application as rejected.

### Activity 12: Relief Distribution Event Scheduling (ACT-W02)
* **Actors and Layers:** LGU Administrator, Distribution Engine, Audit Log Database
* **Description:**
This activity covers the creation and scheduling of relief distribution drives. The LGU administrator enters the event title, date, venue, target barangays, and relief item types. The system saves the event in the database, logs the action for audit purposes, and broadcasts the schedule to residents through the announcements module.

### Activity 13: Right-Sized Relief Allocation Policy (ACT-W03)
* **Actors and Layers:** LGU Administrator, Policy Calculation Engine, MongoDB Database
* **Description:**
This activity allows administrators to configure relief allocation rules based on household size and special needs. The administrator sets the base pack quota and family size multipliers. The system calculates the total relief items needed for the target area, checks warehouse availability, and reserves the required stock for upcoming distributions.

### Activity 14: Real-Time Fraud Interception (ACT-W04)
* **Actors and Layers:** LGU Administrator and Auditor, Real-Time Fraud Stream, MongoDB Database
* **Description:**
This activity monitors and flags suspicious or duplicate claim attempts. When a scanner detects an already claimed QR pass on the ground, a real-time alert is sent to the admin dashboard via Socket.IO. Officials can review the household information, event venue, and timestamp to confirm the issue and prevent double distribution.

### Activity 15: Warehouse Inventory and Buffer Stock Alerts (ACT-W05)
* **Actors and Layers:** LGU Administrator and Warehouse Manager, Warehouse Ledger Database
* **Description:**
This activity tracks the entry and release of relief items in the warehouse. Warehouse staff log incoming supplies such as food, hygiene packs, and medicines. Items are automatically deducted when relief packs are scanned and released during events. If the remaining quantity falls below the minimum buffer threshold, the system displays a low stock warning banner and initiates emergency medicine and buffer restock dispatch to barangay health centers.

### Activity 16: GIS Flood Risk Heatmap and Damage Mapping (ACT-W06)
* **Actors and Layers:** LGU Administrator and GIS Analyst, Leaflet.js Mapping Engine, Geospatial Database
* **Description:**
This activity visualizes disaster data on an interactive map using Leaflet.js. The map plots geocoded damage reports from residents as color-coded pins alongside designated evacuation centers and flood inundation zones. Administrators can filter by damage level, inspect attached photo evidence, and click on any marker to inspect household details and plan targeted response efforts.

### Activity 17: Smart Priority Vulnerability Ranking (ACT-W07)
* **Actors and Layers:** LGU Administrator, Priority Scoring Engine, Export Database
* **Description:**
This activity automates the ranking of affected families according to urgency. The system computes a weighted priority score based on reported house damage, family headcount, senior citizens, infants, and vulnerable members. Administrators can view the sorted priority list and export a CSV file to organize prioritized relief operations.

### Activity 18: Special Assistance Staff Dispatch (ACT-W08)
* **Actors and Layers:** LGU Administrator, Dispatch Service, Field Staff Mobile App
* **Description:**
This activity manages requests for door-to-door aid submitted by vulnerable residents. The administrator reviews pending requests, selects available field staff members, and assigns the delivery tasks. The system updates the task status to assigned and sends an instant alert to the selected staff member's mobile app.

### Activity 19: Emergency Bulletins and Announcements Broadcast (ACT-W09)
* **Actors and Layers:** Barangay Official and LGU Administrator, Socket.IO Push Notification Service, Resident Mobile App
* **Description:**
This activity allows officials to post official advisories and evacuation alerts. The official creates the announcement and chooses whether to target specific barangays or broadcast city-wide. The message is pushed to resident mobile apps and displayed as an emergency banner on their home screens.

### Activity 20: Official Account Provisioning and Governance (ACT-W10)
* **Actors and Layers:** LGU SuperAdmin, Auth Middleware, Audit Log Database
* **Description:**
This activity handles the creation and management of official accounts. The SuperAdmin sets up accounts for LGU administrators, barangay officials, and field workers, assigning appropriate access roles. Passwords are encrypted using Bcrypt, and all account modifications are recorded in the security audit log.

### Activity 21: Global Relief Policy and Threshold Configuration (ACT-W11)
* **Actors and Layers:** LGU SuperAdmin, PolicyConfig Database, Audit Log
* **Description:**
This activity allows the SuperAdmin to manage global system rules and operational parameters. The SuperAdmin can adjust base relief pack quantities, vulnerability multipliers, daily Cash-For-Work wage standards, and warehouse safety buffer percentages. Once saved, these parameters are adopted by all calculation services across the system.

### Activity 22: Disaster Recovery Phase Stepper Transition (ACT-W12)
* **Actors and Layers:** LGU Administrator, Recovery Service, Mobile Application Dashboards
* **Description:**
This activity tracks the city's progress through disaster management milestones. Administrators update the current phase from Emergency Response to Immediate Relief, and finally to Rehabilitation and Recovery. The updated phase is saved and synced across all mobile and web dashboards in real time.

### Activity 23: Relief Assistance Gap Analysis and Reporting (ACT-W13)
* **Actors and Layers:** LGU Administrator and Barangay Official, Reporting Engine, MongoDB Database
* **Description:**
This activity generates summaries and gap analysis reports for disaster relief operations. The system analyzes the allocated resources against the actual claims received per barangay, identifying coverage gaps and total duplicate attempts. Officials can filter the data and export formal summary reports in PDF or CSV format.

### Activity 24: System Security Audit Trail Archiving (ACT-W14)
* **Actors and Layers:** LGU SuperAdmin and State Auditor, AuditTrail Database, CSV Archiver
* **Description:**
This activity provides a complete record of system events for government transparency and auditing standards. The database records user logins, data approvals, relief releases, and setting modifications along with timestamps and IP addresses. Auditors can search through logs using multiple filters and export encrypted CSV files for compliance reviews.

---

# System Architecture

The MitigatePlus platform uses a three-tier architecture composed of the Presentation Tier, the Application and Business Logic Tier, and the Data Storage Tier.

The Presentation Tier provides two user interfaces. The Web Admin Portal, built with React and Vite, serves LGU administrators and barangay officials. The Mobile Application, built with React Native and Expo, serves residents and on-ground field staff. The mobile app uses local AsyncStorage to cache QR tokens so residents can access their passes even during offline conditions, and integrates biometric authentication for fast, secure resident sign-in.

The Application Tier runs on Node.js and Express.js to process REST API requests, manage role-based JWT authentication, and handle real-time WebSocket communication via Socket.IO. This tier integrates the Semaphore SMS API for one-time passwords, Cloudinary for damage photo uploads, the Post-Disaster Cash-For-Work wage payroll calculation engine, and automated buffer tracking for emergency medicine restock dispatches.

The Data Storage Tier uses MongoDB Atlas as the primary cloud database. Mongoose is used for data modeling, and compound indexing is enforced to prevent duplicate relief claims in real time.

---

# Functional Decomposition Diagram (FDD) Narratives

### 1. Functional Decomposition for LGU SuperAdmin
The LGU SuperAdmin oversees system governance, account provisioning, and security management. This role creates and manages accounts for LGU Admins and Barangay Officials, assigns role permissions, and performs password resets. The SuperAdmin configures global relief formulas, family size multipliers, daily Cash-For-Work wage standards, and warehouse safety buffer thresholds. In addition, the SuperAdmin monitors city-wide disaster indicators and reviews the immutable audit log for compliance.

### 2. Functional Decomposition for LGU Admin
The LGU Admin manages disaster relief operations, warehouse inventory, and field coordination. This role creates and schedules relief distribution events, calculates right-sized pack quotas per household, and tracks warehouse stock levels with automated low-buffer alerts and medicine buffer restock dispatches. The LGU Admin also reviews Cash-For-Work livelihood proposals and computes worker payroll disbursements, analyzes flood risk zones and damage reports on an interactive GIS map, assigns field staff to deliver aid to bedridden residents, and updates the city disaster recovery phase.

### 3. Functional Decomposition for Barangay Official
The Barangay Official handles community-level resident validation, livelihood project proposals, and emergency communication. This role reviews submitted household registrations, inspects government ID photos in the verification queue, and approves or rejects applications. Approved records activate the resident's digital QR pass. The official also submits Barangay Cash-For-Work community project proposals, manages the verified beneficiary directory, and publishes localized emergency announcements to resident mobile devices.

### 4. Functional Decomposition for Community Resident
The Community Resident role covers onboarding, pass access, damage reporting, and emergency livelihood assistance. Residents register by submitting family details, uploading a valid ID, and verifying their phone number via SMS OTP. Once verified, residents can display their QR relief pass online or use the cached offline token. Residents can submit photo damage reports with GPS coordinates, view their past relief claim receipts, update family headcounts, and toggle the app language between English and Tagalog. Residents can also apply for Post-Disaster Cash-For-Work civic restoration employment to receive wage assistance.

### 5. Functional Decomposition for LGU Field Staff
The LGU Field Staff role focuses on on-ground verification, relief package release, and field reporting. Field workers log into the mobile app to scan resident QR codes using the device camera. The system checks for duplicate claims and confirms the release of relief items, which automatically updates warehouse inventory. Field staff also perform daily on-site QR attendance scanning for Cash-For-Work workers, view assigned door-to-door delivery tasks for vulnerable residents, and report hazards such as flooded roads with auto-GPS coordinates and photo evidence directly to the command center.

---

# System Use Case Diagram Narrative

The MitigatePlus Use Case Diagram illustrates the interactions between the five system actors and the core features of the platform.

Community Residents interact with the mobile app to register their household, verify their account using Semaphore SMS OTP, and access their digital QR pass. The QR pass includes an extension point for offline storage in AsyncStorage. Residents can submit damage reports with live GPS, which includes uploading photos to Cloudinary, and apply for Post-Disaster Cash-For-Work employment and livelihood projects, which includes verifying household eligibility and selecting specific recovery work categories (debris clearing, drainage unclogging, public shelter repair).

LGU Field Staff use the mobile app to scan resident QR passes. This includes releasing relief goods and deducting inventory, with an extension point that flags duplicate claims and streams real-time fraud alerts. Field staff also log distribution timestamps, scan QR codes for daily Cash-For-Work attendance verification, submit on-ground incident reports with live GPS coordinates and photo evidence, and complete door-to-door deliveries.

LGU SuperAdmins manage official user accounts, configure global relief formulas and Cash-For-Work wage policies, and inspect system audit logs.

LGU Admins schedule relief distribution drives, calculate right-sized quotas per family, monitor warehouse stock with low-buffer alerts, review Cash-For-Work livelihood proposals and compute wage payroll, dispatch medicine buffer restocks to barangay health centers, inspect GIS hazard maps, dispatch field staff to special cases, export gap analysis reports, and advance recovery milestones.

Barangay Officials collaborate on the household verification queue to approve valid residents or reject incomplete applications. They also submit Barangay Cash-For-Work community project requests, maintain the barangay directory, and publish emergency bulletins to resident devices.

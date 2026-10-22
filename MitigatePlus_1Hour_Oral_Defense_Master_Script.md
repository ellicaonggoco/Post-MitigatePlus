# 🎓 MITIGATEPLUS: 1-HOUR MASTER ORAL DEFENSE PLAYBOOK & PRESENTATION SCRIPT
**College of Computing and Information Technologies | National University - Manila**  
**Bachelor of Science in Information Technology (BSIT-MWA / INF235)**  
*Project Title:* **MitigatePlus: A Community Disaster Risk Mitigation Information System**  
*Proponents:* Corpuz, John Rafael P. | Datul, John Herszel D. | Garcia, Neil Chester Mari N. | Nolasco, John Michael N. | Onggoco, Enica Chris M.  
*Capstone Adviser:* Mr. John Ivan C. Maurat  
*Defense Panel:* Prof. Lalaine Abad (Chair) | Dean Emeliza Yabut | Prof. Julieanne Crystal  
*Total Defense Duration:* **60 Minutes (1 Hour)** | *Slide Deck:* 39 Slides (Mitigate+.pdf) | *Manuscript:* Chapters 1 to 4 Verified

---

## 🕒 SECTION 1: MASTER DEFENSE AGENDA & TIME MANAGEMENT (60 MINUTES)

| Segment | Duration | Target Minutes | Lead Speaker / Operator | Focus & Core Objective |
| :--- | :--- | :--- | :--- | :--- |
| **Part 1: Formal Slide Presentation** | 26 mins | 00:00 - 26:00 | Speakers 1, 2, 3, 4 | Comprehensive walkthrough of Capstone 1 compliance, Manila DRRM context, objectives, empirical test results, ISO 25010 benchmarks, and institutional training. |
| **Part 2: Interactive Live System Demonstration** | 16 mins | 26:00 - 42:00 | Demo Lead + Mobile Operator + Web Operator | Real-time 5-act simulation: Resident mobile registration, admin verification, damage telemetry with Algorithm 1, relief quota with Algorithm 2, live QR scanning, double-claim interception, and COA liquidation export. |
| **Part 3: Panel Deliberation & Code Defense** | 18 mins | 42:00 - 60:00 | Entire Team | Defending database architecture, security remediation, scope delimitation, and answering panel inquiries. |

---

## 👥 SECTION 2: HARDWARE SETUP & STAGING STRATEGY

### 🖥️ Physical Hardware & Projection Setup
1. **Primary Projector (Screen A):** Web Admin Dashboard (http://localhost:5173 or deployed Render URL). Operated by Laptop 1.
2. **Secondary Projector / Side Monitor (Screen B):** Mobile Screen Mirroring (via scrcpy or Vysor) displaying the Android Resident App and Staff Scanner App. Operated by Phone / Laptop 2.
3. **Slide Deck Operator (Laptop 3):** Advances the 39 slides on cue ([NEXT SLIDE]) without hesitation.
4. **Physical Relief Kit Props on Defense Table:** 1 Sample LGU Relief Food Pack with Barcode/QR Tag to visually anchor the live distribution demo.

### 🎙️ Speaker Allocation & Stage Positions
* **Speaker 1 (Opening, Compliance, Context & Objectives - Slides 1 to 12):** Sets an authoritative, high-energy tone. Grounds the study in the reality of Manila flooding.
* **Speaker 2 (Technical Quality & Empirical Test Results - Slides 13 to 24):** Delivers quantitative data, Lighthouse metrics, WCAG benchmarks, and OWASP remediation with technical precision.
* **Speaker 3 (Usability Evaluation & Stakeholder Training - Slides 25 to 34):** Presents the voice of 108 respondents, 2 IT professionals, and the partnership with Sir Ceasar Salvacion of Manila DRRMD.
* **Speaker 4 (Summary, Policy Impact, Live Demo Handover - Slides 35 to 39):** Summarizes novelty, connects the platform to RA 10121, and transitions smoothly into the live system demonstration.

---

## 🎙️ SECTION 3: SLIDE-BY-SLIDE PRESENTATION SCRIPT (SLIDES 1 TO 39)

[ESTIMATED RUNTIME: 25 TO 27 MINUTES]

---

### SLIDE 1: Title Slide
* **Visual:** Title, Group Name OnTheWay, Proponents, National University CCIT Seal.
* **Speaker:** Speaker 1
* **Spoken Script:**
> *"A pleasant morning to our respected panel of evaluators: our Panel Chair, Prof. Lalaine Abad; our College Dean, Dean Emeliza Yabut; our Lead Methodologist, Prof. Julieanne Crystal; and to our Capstone Adviser, Mr. John Ivan Maurat.*
>
> *We are Team OnTheWay, and it is our distinct privilege to present our Capstone 2 project:*
>
> ***MitigatePlus: A Community Disaster Risk Mitigation Information System.***
>
> *Disaster risk reduction in the Philippines has reached a critical turning point. While national agencies have invested heavily in weather forecasting and pre-disaster evacuation sirens, the frontline breakdown in our country consistently occurs in the dark aftermath of the storm: during relief distribution, damage assessment, and community rehabilitation.*
>
> *Today, we present a fully engineered, empirical solution tailored specifically for the 897 barangays of the City of Manila. Before we dive into our technical architecture, we will first present our complete compliance with the panel's recommendations from our Capstone 1 oral examination."*
> `[NEXT SLIDE]`

---

### SLIDE 2: Team Introduction / Transition
* **Visual:** Proponents Roster.
* **Speaker:** Speaker 1
* **Spoken Script:**
> *"Our project team represents National University's BSIT program with specialization in Mobile and Web Application: John Rafael Corpuz, John Herszel Datul, Neil Chester Mari Garcia, John Michael Nolasco, and Enica Chris Onggoco, under the dedicated technical advisory of Mr. John Ivan Maurat."*
> `[NEXT SLIDE]`

---

### SLIDE 3: Panel's List of Recommendations Compliance (Title Divider)
* **Visual:** Section Divider: Panel's List of Recommendations Compliance.
* **Speaker:** Speaker 1
* **Spoken Script:**
> *"Following our Capstone 1 defense on June 1, 2026, our three panelists provided constructive, rigorous directives to elevate this project to institutional defense quality. We took every single comment to heart, overhauling our manuscript, restructuring our technical modules, and synchronizing our presentation verbatim."*
> `[NEXT SLIDE]`

---

### SLIDE 4: Compliance - Prof. Lalaine Abad
* **Visual:** Compliance Table for Prof. Lalaine Abad (2 items, 1-sentence compliance actions).
* **Speaker:** Speaker 1
* **Spoken Script:**
> *"Starting with the recommendations of our Panel Chair, **Prof. Lalaine Abad**:*
>
> *1. Regarding your directive to **'Focus on mitigation after disaster'**: We refocused the system architecture exclusively on post-disaster damage reporting, algorithmic priority ranking, and relief tracking as documented in **Section 1.3 (Pages 5 to 6)** and **Section 3.2 (Pages 25 to 33)**.*
>
> *2. Regarding your directive to **'Revise objectives, scope, etc. that would align with mitigation'**: We restructured our General Objective and all five Specific Objectives to center strictly on post-disaster relief governance and ISO/IEC 25010 quality evaluation in **Section 1.2 (Pages 4 to 5)** and **Section 1.3 (Pages 5 to 6)**.*
>
> *By removing pre-disaster evacuation center tracking, the system now provides deep, specialized governance where frontline personnel need it most."*
> `[NEXT SLIDE]`

---

### SLIDE 5: Compliance - Dean Emeliza Yabut
* **Visual:** Compliance Table for Dean Emeliza Yabut (2 items, 1-sentence compliance actions).
* **Speaker:** Speaker 1
* **Spoken Script:**
> *"Next, for our College Dean, **Dean Emeliza Yabut**:*
>
> *1. Regarding **'Revised the whole manuscript'**: We overhauled Chapters 1 to 4 following CCIT standards with updated gap analysis, technical modules, use cases, and process flows from **Pages 1 to 76**.*
>
> *2. Regarding **'Focus on mitigation after disaster'**: We implemented dedicated post-disaster workflows: damage triage, algorithmic vulnerability ranking, right-sized relief, and recovery tracking in **Section 1.3 (Pages 5 to 6)** and **Section 3.2 (Pages 25 to 33)**.*
>
> *Every chapter has been audited against standard CCIT technical documentation guidelines."*
> `[NEXT SLIDE]`

---

### SLIDE 6: Compliance - Prof. Julieanne Crystal (Ma'am Janne)
* **Visual:** Compliance Table for Prof. Julieanne Crystal (3 items, 1-sentence compliance actions).
* **Speaker:** Speaker 1
* **Spoken Script:**
> *"Finally, for **Prof. Julieanne Crystal**:*
>
> *1. Regarding **'Objectives on presentation is different with the document'**: We synchronized the General Objective and all five Specific Objectives verbatim between this presentation deck and our manuscript in **Section 1.2 (Pages 4 to 5) and Slides 10 to 12**.*
>
> *2. Regarding **'Document is too obvious of copy paste. Make time to modify to become original'**: We rewrote the document from the ground up through original synthesis, grounding the problem context, literature, and technical frameworks in actual Manila DRRM data across **Chapters 1 to 4 (Pages 1 to 76)**.*
>
> *3. Regarding **'Revise the whole manuscript'**: We restructured the entire manuscript with verified system architecture, requirements tables, detailed use cases, and process flows in **Chapters 1 to 4 (Pages 1 to 76)**.*
>
> *All compliance items are fully documented with corresponding page citations in Appendix C."*
> `[NEXT SLIDE]`

---

### SLIDE 7: Project Context (Title Divider)
* **Visual:** Section Divider: Project Context.
* **Speaker:** Speaker 1
* **Spoken Script:**
> *"Now, let us examine the grounded operational context of the City of Manila that demanded the engineering of MitigatePlus."*
> `[NEXT SLIDE]`

---

### SLIDE 8: Project Context - Urban Disaster Vulnerability
* **Visual:** Manila disaster vulnerability, RA 10121, frontline barangay challenges.
* **Speaker:** Speaker 1
* **Spoken Script:**
> *"The City of Manila is one of the densest and most hazard-exposed capital cities in Southeast Asia. With a population density exceeding 43,000 residents per square kilometer, the city faces an average of 20 tropical cyclones per year, compounded by rising sea levels and devastating monsoon floods.*
>
> *Under Republic Act No. 10121, or the Philippine Disaster Risk Reduction and Management Act of 2010, the legal responsibility of frontline disaster response and post-disaster mitigation falls squarely upon local Barangay Disaster Risk Reduction and Management Committees (BDRRMC).*
>
> *However, during actual emergencies, barangays are overwhelmed. Relief operations still rely almost entirely on handwritten logbooks, paper stubs, and verbal headcounts. When floodwaters rise, paper records get soaked and ruined. The result is operational paralysis."*
> `[NEXT SLIDE]`

---

### SLIDE 9: Project Context - Operational Bottlenecks
* **Visual:** 897 barangays, damp logbooks, repeat claimants vs unserved families.
* **Speaker:** Speaker 1
* **Spoken Script:**
> *"Our team conducted baseline field assessments and interviews across Manila communities. What we uncovered was a recurring triple-crisis in post-disaster operations:*
>
> *First, **Verification Failure**: Volunteers cannot verify if an evacuee is truly a registered resident or someone jumping lines from an adjacent barangay.*
>
> *Second, **The 'Standard 1-Pack' Flaw**: LGUs hand out one identical relief bag whether a household has 2 members or 12 members. Small families get a surplus, while large families run out of food within 24 hours.*
>
> *Third, **Fraud and Palakasan**: Without real-time transaction logging, repeat claimants take advantage of exhausted volunteers by claiming multiple relief packs across different distribution tables, while bedridden seniors and interior households receive zero relief.*
>
> *This severe operational gap is what MitigatePlus solves through software engineering."*
> `[NEXT SLIDE]`

---

### SLIDE 10: General Objective
* **Visual:** General Objective statement under RA 10121.
* **Speaker:** Speaker 1
* **Spoken Script:**
> *"As stated verbatim in Section 1.2 on Page 4 of our manuscript:*
>
> *Our **General Objective** is to develop MitigatePlus, an integrated web and mobile community disaster risk mitigation and recovery information system for the City of Manila under Republic Act No. 10121.*
>
> *By combining digital resident verification, geo-tagged damage assessment, headcount-scaled relief distribution, and real-time anti-duplicate QR tracking, the platform eliminates distribution blind spots and empowers local councils across all 897 barangays with automated, data-driven recovery workflows."*
> `[NEXT SLIDE]`

---

### SLIDE 11: Specific Objectives (Part 1 - Applications)
* **Visual:** Resident Mobile App, Staff Scanner App, Web Admin Portal.
* **Speaker:** Speaker 1
* **Spoken Script:**
> *"To fulfill our General Objective, we accomplished five Specific Objectives, divided into three specialized client tiers:*
>
> *1. **Resident Mobile Application:** Designed for Android smartphones, enabling Manila residents to register household members, upload valid government IDs, submit geotagged damage photos with GPS telemetry, access an offline-cached digital QR relief pass, and apply for post-disaster Cash-for-Work livelihood programs.*
>
> *2. **Field Staff Mobile Scanner Suite:** Equips barangay tanods and relief marshals with an ultra-fast camera scanner to authenticate resident QR passes, verify family headcounts on-site, log food pack releases, and receive instant vibration and audio warnings whenever a duplicate claim is attempted.*
>
> *3. **Web Administrative Portal:** Provides barangay chairpersons, city social workers, and MDRRMO supervisors with an executive command center to approve resident IDs, schedule distribution drives, monitor a live interactive damage map, and export 1-click COA-compliant liquidation reports."*
> `[NEXT SLIDE]`

---

### SLIDE 12: Specific Objectives (Part 2 - Engines & Quality Evaluation)
* **Visual:** Core Engines (Algorithms 1 & 2), ISO/IEC 25010 Quality Benchmark (85%).
* **Speaker:** Speaker 1
* **Spoken Script:**
> *"Our final two Specific Objectives represent the mathematical core and software engineering rigor of the study:*
>
> *4. **Core Algorithmic Engines:** We developed two proprietary decision engines:*
>   * *Algorithm 1 computes the **Smart Recovery Priority Index (RPI)**, prioritizing relief distribution based on structural damage severity, vulnerable demographics (seniors, PWDs, infants, pregnant mothers), and elapsed waiting days.*
>   * *Algorithm 2 executes **Right-Sized Relief Allocation**, scaling food packs and supplementary staple rations proportionally based on verified household headcount.*
>
> *5. **ISO/IEC 25010 Quality Benchmark:** We subjected the entire platform to standardized software quality evaluation across Functionality, Usability, Reliability, Performance, Security, and Compatibility, establishing an empirical 85% compliance benchmark.*
>
> *I now invite [Speaker 2] to present our comprehensive System Testing and Technical Quality Evaluation results."*
> `[NEXT SLIDE]`

---

### SLIDE 13: Summary Results of System Test (Title Divider)
* **Visual:** Section Divider: Summary Results of System Test.
* **Speaker:** Speaker 2
* **Spoken Script:**
> *"Thank you, [Speaker 1]. Good morning, respected panel. We will now present the empirical test results that validate the technical integrity, architectural performance, and security robustness of MitigatePlus."*
> `[NEXT SLIDE]`

---

### SLIDE 14: Summary Result of Web Functionality Testing
* **Visual:** Web Functionality Test Table (Alpha vs Beta, Modules, Pass Rates).
* **Speaker:** Speaker 2
* **Spoken Script:**
> *"To ensure zero software regression, we conducted two full testing cycles across 14 web administrative modules:*
>
> *During the **Alpha testing phase**, executed in a localized development environment, modules recorded pass rates ranging from 91.7% to 100%. Faults identified during Alpha included unhandled edge cases in resident duplicate name filters and asynchronous table state lag during bulk status approvals.*
>
> *Following code refactoring, query optimization, and UI error-boundary implementations, our **Beta testing cycle achieved a 100% pass rate** across all 14 modules, encompassing 78 distinct functional test test cases."*
> `[NEXT SLIDE]`

---

### SLIDE 15: Summary Result of Mobile Functionality Testing
* **Visual:** Mobile Functionality Test Table (Resident App & Staff Scanner).
* **Speaker:** Speaker 2
* **Spoken Script:**
> *"On the mobile tier, testing was executed on physical Android devices representing different hardware profiles, from entry-level quad-core units to modern flagship smartphones.*
>
> *In the Alpha cycle, mobile functionality stood between 92.5% and 100%, with minor failures observed in camera permission handling on Android 13 and intermittent offline storage serialization.*
>
> *Following remediation using Expo BarCodeScanner listeners and AsyncStorage cache fallbacks, the **Beta testing phase achieved a flawless 100% pass rate** across both the Resident App and Staff Scanner Suite."*
> `[NEXT SLIDE]`

---

### SLIDE 16: Summary Result of Integration Testing
* **Visual:** Integration Testing Metrics (API endpoints, MongoDB Atlas, Socket.IO, Cloudinary).
* **Speaker:** Speaker 2
* **Spoken Script:**
> *"A community disaster system cannot operate in silos. Our Integration Testing evaluated end-to-end communication across our three tiers:*
>
> *Our React web clients and React Native mobile clients communicate via an Express.js REST API hosted on Render, backed by a managed MongoDB Atlas cloud database.*
>
> *We validated critical bidirectional flows:*
> * *When an administrator approves a resident ID on the Web, a WebSocket event activates their mobile QR pass in under 200 milliseconds.*
> * *When field staff scan a QR code at a distribution tent, inventory stock levels decrement instantly, an audit log is committed with a cryptographically unique transaction ID, and the dashboard updates in real-time with zero transactional desynchronization."*
> `[NEXT SLIDE]`

---

### SLIDE 17: Non-Functional: Web Application Performance
* **Visual:** Web Performance Metrics (Speed Index, Load Times, Lighthouse Score).
* **Speaker:** Speaker 2
* **Spoken Script:**
> *"Under ISO/IEC 25010 Performance Efficiency, we audited the Web Admin portal using Google Lighthouse:*
>
> *The portal achieved an overall Performance score of **87.8%** with a **Speed Index of 1.72 seconds**, well below the 2.0-second standard threshold.*
>
> *We achieved this by utilizing Vite's ES module code-splitting, tree-shaking unused SVG assets, and creating compound indexes in MongoDB Atlas to ensure database query execution times remain under 45 milliseconds even across large resident datasets."*
> `[NEXT SLIDE]`

---

### SLIDE 18: Non-Functional: Mobile Application Performance
* **Visual:** Mobile App Startup Time, Frame Rate, Memory Consumption.
* **Speaker:** Speaker 2
* **Spoken Script:**
> *"For mobile performance, cold startup time averaged **1.88 seconds**, while warm app restoration occurred in under **0.42 seconds**.*
>
> *The application maintains a consistent **60 frames-per-second** scroll velocity across all list components. By utilizing optimized SQLite/AsyncStorage local caching, a resident's QR relief pass displays instantly even when cell towers are congested or experiencing intermittent signal loss."*
> `[NEXT SLIDE]`

---

### SLIDE 19: Non-Functional: Mobile Application Accessibility
* **Visual:** WCAG 2.1 Accessibility compliance, high contrast ratios, touch targets.
* **Speaker:** Speaker 2
* **Spoken Script:**
> *"During disasters, victims experience extreme stress, poor lighting, and physical exhaustion. Inclusivity is therefore a life-safety requirement.*
>
> *The MitigatePlus mobile interface complies with **WCAG 2.1 Level AA accessibility standards**:*
> * *All interactive buttons feature a minimum hit target of 48 by 48 density-independent pixels, preventing missed taps.*
> * *Text contrast ratios exceed 4.5 to 1 against canvas backgrounds.*
> * *The UI features bilingual English and Filipino microcopy, ensuring clear understanding among elderly and non-technical residents."*
> `[NEXT SLIDE]`

---

### SLIDE 20: Non-Functional: Web Application Accessibility
* **Visual:** Web Accessibility Dashboard, keyboard navigation, color contrast.
* **Speaker:** Speaker 2
* **Spoken Script:**
> *"The Web Admin platform scored an exceptional **93% on accessibility audits**, featuring structured ARIA landmarks, full keyboard tab navigation for mouse-free data entry, and distinct geometric shape cues accompanying all color-coded alerts to assist color-blind operators."*
> `[NEXT SLIDE]`

---

### SLIDE 21: Non-Functional: Web Application Browser Compatibility
* **Visual:** Cross-browser matrix (Google Chrome, Microsoft Edge, Mozilla Firefox, Brave, Safari).
* **Speaker:** Speaker 2
* **Spoken Script:**
> *"Cross-browser compatibility testing validated that the administrative platform operates consistently across all modern browser engines:*
> * *Google Chrome (Chromium)*
> * *Microsoft Edge*
> * *Mozilla Firefox (Gecko)*
> * *Brave Browser*
> * *Apple Safari (WebKit)*
>
> *Every component, including dynamic Leaflet geographic hazard maps and modal dialogs, rendered with zero layout breakage."*
> `[NEXT SLIDE]`

---

### SLIDE 22: Non-Functional: Mobile Application OS Compatibility
* **Visual:** Android OS version testing (Android 10, 11, 12, 13, 14).
* **Speaker:** Speaker 2
* **Spoken Script:**
> *"Mobile OS compatibility was verified across Android 10, 11, 12, 13, and Android 14.*
>
> *The codebase dynamically handles modern Android scoped storage and runtime camera permission dialogs, guaranteeing full functionality across diverse mobile manufacturers including Samsung, Xiaomi, Realme, and Transsion devices commonly used by Manila residents."*
> `[NEXT SLIDE]`

---

### SLIDE 23 & 24: Web Application Vulnerability Assessments (Pre vs. Post Remediation)
* **Visual:** Security Audit Results, OWASP Top 10 checks, resolved vulnerabilities.
* **Speaker:** Speaker 2
* **Spoken Script:**
> *"Under ISO/IEC 25010 Security, we performed automated and manual penetration testing against the OWASP Top 10:*
>
> *During our **Pre-Remediation audit (Slide 23)**, potential vulnerabilities were flagged: raw JWT secrets in development builds, lack of rate-limiting on login endpoints, and permissive CORS origins.*
>
> *In our **Post-Remediation cycle (Slide 24)**, we implemented robust defensive measures:*
> * *Bcrypt salt hashing with 10 rounds for all passwords.*
> * *Express-rate-limit throttling to block brute-force attacks.*
> * *CORS origin whitelisting restricting API access exclusively to registered domain origins.*
> * *MongoDB Compound Unique Indexing on `{ distributionEventId: 1, householdId: 1 }`, mathematically preventing race condition exploits during simultaneous relief claims.*
>
> *I now turn the floor over to [Speaker 3] to present our System Usability Evaluation and Stakeholder Engagement."*
> `[NEXT SLIDE]`

---

### SLIDE 25 & 26: System Usability Evaluation - Sampling & Demographics
* **Visual:** 108 survey participants + 2 IT professionals; demographic breakdown charts.
* **Speaker:** Speaker 3
* **Spoken Script:**
> *"A pleasant morning, esteemed members of the panel. As detailed in Section 4.2 on Pages 34 to 43 of our manuscript, we evaluated MitigatePlus through an extensive empirical usability study.*
>
> *While standard Nielsen Norman usability benchmarks require 5 to 15 participants, our team surveyed a total of **108 respondents plus 2 industry IT professionals**.*
>
> *Our demographic sampling accurately mirrors the Manila disaster ecosystem:*
> * *49 Manila Residents (45.4%)*
> * *33 College Students & Youth Volunteers (30.6%)*
> * *14 Barangay Disaster Operations Staff (13.0%)*
> * *7 Barangay Council Officials (6.5%)*
> * *5 Software and IT Practitioners (4.6%)*
>
> *Over 76% of our sample represents grassroots community members who are the direct beneficiaries of disaster relief."*
> `[NEXT SLIDE]`

---

### SLIDE 27 to 31: Usability Evaluation Dimensions & Overall Summary
* **Visual:** Charts for Ease of Use, Performance & Efficiency, Learnability, Satisfaction, and Overall Summary.
* **Speaker:** Speaker 3
* **Spoken Script:**
> *"The evaluation was administered using a 5-point Likert scale aligned with standardized usability evaluation metrics across four core dimensions:*
>
> *1. **Ease of Use (Slide 27):** Scored an impressive **'Very High'**. Residents praised the 1-tap display of their QR pass and the intuitive, wizard-driven damage reporting form.*
>
> *2. **Performance and Efficiency (Slide 28):** Achieved a mean of **4.35 out of 5.00 ('Very High')**. Field staff highlighted the instantaneous sub-second camera barcode scanning that eliminated manual logbook searching.*
>
> *3. **Learnability (Slide 29):** Rated **'Very High'**. Over 90% of non-technical respondents reported that they could navigate the resident mobile app within 3 minutes of first exposure without requiring technical assistance.*
>
> *4. **User Satisfaction (Slide 30):** Scored **'Very High'**. Both residents and barangay officials expressed deep satisfaction, emphasizing that digital QR passes restore dignity by eliminating chaotic, undignified crowding at distribution centers.*
>
> *As summarized on **Slide 31**, MitigatePlus achieved an overall composite usability score of **4.35 out of 5.00**, representing an unequivocal **'Very High'** institutional endorsement."*
> `[NEXT SLIDE]`

---

### SLIDE 32 & 33: Consultation, Knowledge Transfer & Training Plan
* **Visual:** Photo documentation with Sir Ceasar Salvacion of Manila DRRMD.
* **Speaker:** Speaker 3
* **Spoken Script:**
> *"To ensure that MitigatePlus is grounded in actual operational protocols rather than theoretical assumptions, Team OnTheWay conducted formal consultation and knowledge transfer sessions with the **Manila Disaster Risk Reduction and Management Office (MDRRMO)**.*
>
> *We conducted direct field interviews and workflow alignment with **Sir Ceasar Salvacion**, Planning and Operations Specialist of Manila DRRMD.*
>
> *Based on their official operational feedback, we formulated an institutional **Barangay Training and Knowledge Transfer Plan** covering:*
> * *Phase 1: Pre-Disaster Household Pre-Registration and ID validation.*
> * *Phase 2: Post-Disaster Rapid Damage Telemetry and Algorithm-Assisted Quota Scheduling.*
> * *Phase 3: Field Distribution Operations, Offline Contingency Handover, and COA Liquidation Audit.*
>
> *I now pass the floor to [Speaker 4] for our Summary, Policy Impact, and to lead our Live System Demonstration."*
> `[NEXT SLIDE]`

---

### SLIDE 34: IT Professionals Usability Evaluation
* **Visual:** Expert feedback from 2 Senior IT Professionals.
* **Speaker:** Speaker 4
* **Spoken Script:**
> *"Thank you, [Speaker 3]. Good day, panelists. In addition to community users, we subjected the architecture of MitigatePlus to peer review by **two Senior Software Engineers** with extensive cloud and enterprise experience.*
>
> *Their technical evaluation confirmed that our asynchronous RESTful API design, database schema indexing, and role-based access control conform to enterprise standards, specifically praising our real-time WebSocket duplicate interception architecture."*
> `[NEXT SLIDE]`

---

### SLIDE 35 & 36: Summary of the Study & Final Empirical Metrics
* **Visual:** Purpose, functions, methodology, and the complete ISO 25010 metrics summary table.
* **Speaker:** Speaker 4
* **Spoken Script:**
> *"To summarize our study's findings on Slides 35 and 36:*
>
> *MitigatePlus successfully addressed every operational bottleneck identified in our problem statement:*
> * * **Functional Suitability:** 100% test case pass rate in Beta across all 14 web modules and mobile apps.*
> * * **Performance Efficiency:** 87.8% Google Lighthouse score with a 1.72-second Speed Index.*
> * * **Usability:** 4.35 / 5.00 ('Very High') across 108 community respondents and 2 IT professionals.*
> * * **Reliability & Security:** Zero transactional discrepancies under concurrent testing; fully remediated against OWASP vulnerabilities.*
> * * **Compatibility:** Verified across all major desktop web browsers and Android 10 through 14."*
> `[NEXT SLIDE]`

---

### SLIDE 37: Conclusion
* **Visual:** Conclusion statement highlighting novelty and policy impact.
* **Speaker:** Speaker 4
* **Spoken Script:**
> *"In conclusion, MitigatePlus successfully transforms post-disaster community recovery for the City of Manila from a chaotic, paper-bound, and contentious ordeal into an automated, transparent, and dignified digital process.*
>
> *Our project introduces three distinct engineering novelties:*
> * *First: An **Algorithmic Priority Index** that removes political bias and human favoritism by prioritizing aid based on actual physical destruction and vulnerable household members.*
> * *Second: **Right-Sized Headcount Relief Allocation**, ensuring fair, mathematically scaled nutrition rather than arbitrary one-pack policies.*
> * *Third: **Real-Time QR Duplicate Interception**, closing the multi-million-peso loophole of double-claiming across distribution sites.*
>
> *MitigatePlus proves that modern software engineering can directly safeguard human dignity under Republic Act No. 10121."*
> `[NEXT SLIDE]`

---

### SLIDE 38: Recommendations & System Enhancements
* **Visual:** Future enhancements (offline mesh networking, biometrics, GIS drone mapping).
* **Speaker:** Speaker 4
* **Spoken Script:**
> *"For future researchers and system custodians, we recommend three strategic enhancements:*
>
> *1. **Offline Bluetooth / Wi-Fi Mesh Networking:** Implementing peer-to-peer mobile mesh synchronization so field scanners can synchronize relief logs in disaster zones with zero cellular signal.*
>
> *2. **Facial Biometrics & PhilSys National ID Integration:** Incorporating direct PhilSys API biometric verification to eliminate the need for manual ID photo reviews.*
>
> *3. **GIS Drone Damage Telemetry:** Integrating aerial drone orthomosaic imagery with our damage assessment map for instant neighborhood-wide structural loss verification."*
> `[NEXT SLIDE]`

---

### SLIDE 39: System Demonstration (Title Divider & Handover)
* **Visual:** System Demonstration Title Slide.
* **Speaker:** Speaker 4
* **Spoken Script:**
> *"Respected panelists, software is best proven in action. We now invite you to direct your attention to our dual-screen setup as we present our **Interactive 16-Minute Live System Demonstration**.*
>
> *We will walk you through an authentic disaster recovery scenario across 5 comprehensive acts, culminating in an intentional live double-claim fraud interception.*
>
> *Let us begin the demonstration."*

---

## 📱 SECTION 4: INTERACTIVE LIVE SYSTEM DEMONSTRATION SCRIPT (16 MINUTES)

[ESTIMATED RUNTIME: 16 MINUTES]  
SETUP:  
- Screen A (Projector): Web Administrative Dashboard (Logged in as Barangay Captain Robert)  
- Screen B (Mobile Mirror): Android Resident App (Maria Santos) & Field Staff Scanner (Officer Juan)  

---

### ACT 1: Citizen Mobile Onboarding & Web ID Verification (3.5 Mins)
* **Narrator (Speaker 1):**
> *"We begin in the immediate aftermath of a severe storm. A resident of Sta. Cruz, Manila, Mrs. Maria Santos, downloads the MitigatePlus Resident App on her mobile phone.*
>
> *Watch Screen B as Mrs. Santos registers her household. Notice that she inputs not just her name, but her exact household composition: 6 total family members, including 1 Senior Citizen (her grandmother) and 1 Infant.*
>
> *She takes a photo of her Barangay ID and submits her profile. Immediately, the app displays her status as 'Pending Barangay Verification'.*
>
> *Now, look at Screen A. On the Web Admin dashboard of Barangay 291, Barangay Captain Robert instantly receives a real-time notification in his Verification Queue. The Captain opens Mrs. Santos's record, examines the high-resolution ID photo, confirms her address against the precinct registry, and clicks **APPROVE**.*
>
> *Notice what happens on Screen B in less than one second: without refreshing the app, Mrs. Santos's mobile screen transforms! A cryptographic QR Relief Pass appears, displaying her verified token, household headcount of 6, and eligibility status. She is now ready to receive disaster assistance."*

---

### ACT 2: Geotagged Structural Damage Telemetry & Algorithm 1 in Action (3.0 Mins)
* **Narrator (Speaker 2):**
> *"Unfortunately, the floodwaters caused severe damage to Mrs. Santos's roof and perimeter wall. Instead of walking through dangerous floodwaters to the barangay hall, she opens the **Report Damage** module on her phone.*
>
> *The app automatically captures her exact GPS coordinates via the mobile device's geolocation sensor. She selects 'Severe Damage', snaps a clear photo of the collapsed wall, types a brief description, and submits the report.*
>
> *Now, look back at Screen A on the Web Admin portal.*
>
> *Under the **Smart Priority Dashboard**, the system's backend has instantly evaluated Mrs. Santos's report using **Algorithm 1: Smart Recovery Priority Index Scoring**:*
> * *Her Severe Damage status assigns 75 base damage points.*
> * *Her household's 1 Senior Citizen (20 pts) and 1 Infant (20 pts) contribute 40 vulnerability points.*
> * *Applying our weighting formula: (75 times 0.40) plus (40 times 0.40) plus waiting factor yields a composite Priority Score of **78 out of 100**.*
>
> *The system automatically classifies her household into **Tier 1 High Priority**, placing her family at the very top of the relief dispatch schedule. No human bias, no political connections, pure data-driven fairness."*

---

### ACT 3: Relief Drive Scheduling & Algorithm 2 Quota Scaling (3.0 Mins)
* **Narrator (Speaker 3):**
> *"Now, the Barangay Council prepares to conduct a food pack distribution drive at the covered court. On Screen A, the relief coordinator creates a new **Distribution Event**: 'Typhoon Relief Operation Phase 1'.*
>
> *Watch how the system handles relief allocation. Instead of blindly assuming 1 pack per house, the system runs **Algorithm 2: Right-Sized Relief Allocation Calculation**:*
> * *For a family of 6 members, the algorithm computes Base Food Packs as Ceil(6 / 5) = **2 Base Food Packs**.*
> * *Extra Headcount is (6 - 5) = 1 member.*
> * *The algorithm automatically adds **2.0 kg of Extra Rice** and **3 Extra Canned Goods** to meet the caloric requirements of a 6-person household.*
>
> *The inventory is dynamically reserved from the Warehouse Inventory module, updating the remaining stock count in real-time."*

---

### ACT 4: THE CLIMAX - Field Staff QR Scanning & Live Anti-Fraud Interception (4.0 Mins)
* **Narrator (Speaker 4):**
> *"Now comes the most critical operational test: the frontline distribution line at the covered court.*
>
> *On Screen B, our field officer, Officer Juan, logs into the **MitigatePlus Staff Scanner Suite**. He selects the active event and opens the high-speed camera scanner.*
>
> *Mrs. Santos steps forward and presents her mobile QR pass.*
>
> *`[ACTION: OPERATOR SCANS QR PASS ONCE]`*
>
> *Officer Juan points the scanner at the QR pass. **BEEP!** In less than 0.3 seconds, the scanner screen flashes GREEN. The screen displays: 'Resident Verified: Maria Santos | Allocation: 2 Base Food Packs, 2kg Extra Rice, 3 Extra Cans'. Officer Juan hands over the relief supplies and taps **CONFIRM RELEASE**.*
>
> *Instantly, on Screen A, the Web Admin Dashboard logs the distribution, increments the served count, and deducts the exact supplies from the warehouse.*
>
> *NOW, ESTEEMED PANELISTS, WATCH WHAT HAPPENS NEXT.*
>
> *Imagine that 10 minutes later, an opportunistic family member tries to bring the SAME phone to a different volunteer at Table 2, attempting to claim a second set of relief supplies.*
>
> *`[ACTION: OPERATOR DELIBERATELY SCANS THE SAME QR PASS A SECOND TIME]`*
>
> *`[AUDIO ALERT / VIBRATION TRIGGERED ON SCANNER PHONE]`*
>
> *LOOK AT SCREEN B! The scanner screen immediately turns **CRIMSON RED**! A loud audio alert sounds: **'WARNING: DUPLICATE CLAIM ATTEMPT DETECTED!'** The screen displays the exact timestamp of the first claim and the name of the officer who released it.*
>
> *Simultaneously, look at Screen A on the Web Admin Projector! In the **Fraud Interception Stream**, a red incident banner flashes in real-time via Socket.io: 'SUSPICIOUS REPEAT CLAIM: Household #291-042 attempted double-claim at Gate 2'.*
>
> *The MongoDB Compound Unique Index has physically rejected the database transaction. Double-claiming is rendered mathematically impossible."*

---

### ACT 5: Post-Disaster Livelihood & 1-Click COA Liquidation Audit (2.5 Mins)
* **Narrator (Speaker 1):**
> *"To conclude our demonstration, we showcase long-term recovery and financial transparency:*
>
> *First, on Screen B, Mrs. Santos opens the **Livelihood Assistance** module. She browses emergency Cash-for-Work projects posted by the barangay: 'Debris Clearing and Drainage Desilting'. She submits her application with one tap.*
>
> *Finally, on Screen A, disaster operations have concluded. In the traditional system, barangay secretaries spend weeks sorting through soaked, torn logbooks to prepare reports for the Commission on Audit (COA).*
>
> *In MitigatePlus, the administrator navigates to **Reports and Audit**, selects the event, and clicks **EXPORT COA LIQUIDATION REPORT**.*
>
> *`[ACTION: OPERATOR CLICKS EXPORT - EXCEL/PDF DOWNLOADS INSTANTLY]`*
>
> *In exactly two seconds, a complete, serialized audit report is generated, complete with beneficiary timestamps, verified resident IDs, exact relief quantities, and releasing officer signatures.*
>
> *This concludes our Live System Demonstration."*

---

## 🛡️ SECTION 5: EXTENDED DEFENSE & PANEL Q&A DIRECTORY

[PREPARED FOR 15 TO 18 MINUTES OF RIGOROUS CODE & SYSTEM INQUIRY]

---

### 📌 PANEL-SPECIFIC STRATEGIC QUESTIONS

#### Question 1 (Target: Prof. Lalaine Abad - Scope & Disaster Delimitation)
* **Panel Query:** *"Bakit post-disaster mitigation lang ang focus ninyo? Bakit hindi ninyo sinama ang pre-disaster evacuation tracking at warning sirens?"*
* **Defending Speaker:** Speaker 1
* **Spoken Defense:**
> *"Thank you for that foundational question, Prof. Abad. As you recommended during our Capstone 1 defense, we deliberately delimited our project exclusively to the post-disaster phase for two crucial reasons documented in Section 1.3 of our manuscript:*
>
> *First, pre-disaster warnings and sirens are already adequately covered by PAGASA, NDRRMC SMS alerts, and the Manila City Disaster sirens. However, through our baseline consultations with Sir Ceasar Salvacion of Manila DRRMD, we discovered that the single greatest institutional breakdown occurs **after the disaster** during damage telemetry, relief rationing, and beneficiary reconciliation.*
>
> *Second, trying to combine evacuation camp logistics with relief triage creates an unwieldy, bloated system. By focusing deeply on post-disaster mitigation, we were able to engineer specialized algorithms for vulnerability triage and mathematically enforce anti-duplicate claim security."*

---

#### Question 2 (Target: Dean Emeliza Yabut - Manuscript Integrity & Architectural Rigor)
* **Panel Query:** *"How did you ensure that Chapters 1 to 4 comply with CCIT standards, and how does your 3-tier architecture support scaling across all 897 barangays of Manila?"*
* **Defending Speaker:** Speaker 2 / Lead Developer
* **Spoken Defense:**
> *"Thank you, Dean Yabut. To comply with CCIT standards, we conducted a structural overhaul of the entire manuscript across Pages 1 to 76. We reconstructed our problem context using empirical Manila disaster data, formulated formal Use Case Specifications and Process Sequence diagrams for all 14 modules, and updated our ISO 25010 testing methodology to encompass 108 survey respondents.*
>
> *Architecturally, our system is divided into three distinct tiers: a decoupled React web frontend, a React Native mobile layer, and an Express.js REST API backed by a sharded MongoDB Atlas cluster. By isolating business logic into micro-services and utilizing MongoDB compound unique indexing, our database operations execute in under 45 milliseconds. This architecture effortlessly scales to handle concurrent distributions across Manila's 6 legislative districts without server memory bottlenecks."*

---

#### Question 3 (Target: Prof. Julieanne Crystal - Originality, Literature & Deck Synchronization)
* **Panel Query:** *"In Capstone 1, the presentation objectives did not match the document, and parts of the literature lacked originality. How did you resolve this?"*
* **Defending Speaker:** Speaker 1 / Speaker 3
* **Spoken Defense:**
> *"Thank you, Ma'am Janne. We took your feedback with the utmost seriousness:*
>
> *First, regarding objective synchronization: as shown on Slides 10, 11, and 12 of this deck, our General Objective and all five Specific Objectives match Section 1.2 on Pages 4 to 5 of our manuscript word-for-word.*
>
> *Second, regarding literature originality: we completely discarded generic web definitions. We conducted an original critical synthesis of the Philippine Disaster Risk Reduction and Management Act (RA 10121), the Joint Memorandum Circular No. 1 of DSWD and DILG on relief distribution, and published empirical studies on urban flooding in Metro Manila by UNDRR and the World Bank. We also constructed an original Comparative Gap Analysis Matrix in Table 1 on Page 15, contrasting MitigatePlus against existing systems like PhilSys, DSWD DROMIC, and local barangay logbooks to firmly establish our system's unique novelty."*

---

### ⚙️ TECHNICAL ARCHITECTURE & ALGORITHM QUESTIONS

#### Question 4: Race Conditions and Real-Time Duplicate Claim Interception
* **Panel Query:** *"What happens if two field staff members scan the exact same QR pass at the exact same fraction of a second at two different gates?"*
* **Defending Speaker:** Speaker 2 / Backend Lead
* **Spoken Defense:**
> *"We specifically designed the system to handle concurrent race conditions at the database engine level. In MongoDB, we created a **Compound Unique Index** on `{ distributionEventId: 1, householdId: 1 }`.*
>
> *When two requests arrive simultaneously, MongoDB processes writes using atomic document locking. The first request successfully commits and writes the release record. The second concurrent request is instantly rejected by the database engine with an `E11000 duplicate key error`.*
>
> *Our backend catches this error, refuses the second release, and fires a Socket.io WebSocket event to both the field scanner and the admin dashboard, triggering an immediate fraud alert. It is physically and mathematically impossible for two food packs to be logged under the same event for the same household."*

---

#### Question 5: Offline Field Operations and Zero-Connectivity Contingency
* **Panel Query:** *"Paano kung bumagsak ang cell signal sa Tondo or flooded area? Paano makakapag-scan ang field staff kung walang internet?"*
* **Defending Speaker:** Speaker 2 / Mobile Lead
* **Spoken Defense:**
> *"For resident mobile passes, the digital QR code is stored in local **AsyncStorage** with an encrypted SHA-256 payload immediately upon profile approval. This ensures that the resident can open and present their QR pass even if their phone has zero mobile data or is in Airplane Mode.*
>
> *For field scanners operating in low-connectivity areas, our scanner suite caches the scanned records locally in an offline queue. As soon as the mobile device reconnects to a cellular signal or barangay Wi-Fi, the app automatically synchronizes the queued transactions to the cloud database in batch mode."*

---

#### Question 6: Algorithm 1 - Smart Recovery Priority Index (RPI) Weighting Justification
* **Panel Query:** *"Bakit 40% ang Damage, 40% ang Vulnerability, at 20% ang Waiting Time? Saan nanggaling ang weights na iyan?"*
* **Defending Speaker:** Speaker 3 / Algorithm Lead
* **Spoken Defense:**
> *"The weighting formula for Algorithm 1: `RPI = (Damage * 0.40) + (Vulnerability * 0.40) + (Waiting Factor * 0.20)` was derived directly from the DSWD Disaster Assistance Family Access Card (DAFAC) guidelines and confirmed during our consultation with Sir Ceasar Salvacion of Manila DRRMD.*
>
> *Physical destruction of shelter (40%) and life-safety vulnerability such as bedridden seniors, infants, and PWDs (40%) are equal primary determinants of survival in the immediate aftermath of a disaster. The remaining 20% waiting factor acts as an anti-starvation mechanism, ensuring that households with moderate damage do not remain perpetually unserved if higher-severity cases keep arriving."*

---

#### Question 7: Algorithm 2 - Right-Sized Relief Allocation vs Standard 1-Pack
* **Panel Query:** *"Bakit kailangan pang gumamit ng Algorithm 2? Bakit hindi na lang tig-iisang relief pack bawat bahay tulad ng ginagawa ng karaniwang barangay?"*
* **Defending Speaker:** Speaker 4
* **Spoken Defense:**
> *"The traditional '1-pack-per-household' policy is one of the most flawed practices in Philippine disaster relief. In Manila informal settlements, household sizes vary wildly, from a 2-person newlywed couple to an extended family of 14 people living under one roof.*
>
> *Giving 1 pack to a 14-person family results in acute hunger within 24 hours, forcing them to re-enter relief lines and create chaos. Conversely, giving 1 pack to a 2-person family often leads to food hoarding or illegal resale.*
>
> *Algorithm 2 uses the formula `Base Packs = Ceil(Headcount / 5)`, providing 1 pack for up to 5 members, 2 packs for 6 to 10 members, and 3 packs for 11+ members, supplemented with 2 kg of rice and 3 canned goods per extra member. This guarantees nutritional equity based on verified human caloric need."*

---

#### Question 8: Security and Data Privacy Act (RA 10173) Compliance
* **Panel Query:** *"Residents upload valid government IDs and home photos. How does your system comply with the Data Privacy Act of 2012?"*
* **Defending Speaker:** Speaker 2 / Security Lead
* **Spoken Defense:**
> *"MitigatePlus strictly complies with Republic Act No. 10173:*
>
> *First, all resident passwords and sensitive tokens are hashed using Bcrypt with 10 salt rounds before storage in our cloud database.*
>
> *Second, uploaded ID images and damage photos are transferred exclusively over TLS 1.3 encrypted HTTPS connections to Cloudinary storage, accessible only via secured, signed URLs.*
>
> *Third, our administrative portal enforces strict Role-Based Access Control (RBAC). Field volunteers can only view the beneficiary's name and authorized package count; they have zero access to uploaded ID photos, contact numbers, or full database records.*
>
> *Finally, residents explicitly consent to data processing for disaster relief upon registration in compliance with NPC guidelines."*

---

## 🏁 DEFENSE CLOSING STATEMENT
* **Delivered by:** Speaker 4
* **Closing Script:**
> *"Respected members of the panel, Prof. Abad, Dean Yabut, Prof. Crystal, and Adviser Maurat:*
>
> *Disasters will inevitably continue to challenge the City of Manila. But the chaos, the palakasan, the lost records, and the inequity of disaster relief do not have to continue.*
>
> *With MitigatePlus, we have demonstrated that software engineering can bring order to chaos, transparency to governance, and above all, dignity to the people of Manila when they need it most.*
>
> *We are Team OnTheWay, and we respectfully submit MitigatePlus for your final approval. Thank you, and we welcome your questions and deliberations."*

# MITIGATEPLUS SYSTEM DIAGRAMS FOR DRAW.IO\n\n### 1. Three-Tier System Architecture\n```mermaid\ngraph TB
    classDef presLayer fill:#EBF3FB,stroke:#1D4ED8,stroke-width:2px,color:#0F172A;
    classDef appLayer fill:#F1F5F9,stroke:#0F766E,stroke-width:2px,color:#0F172A;
    classDef dataLayer fill:#FEF3C7,stroke:#D97706,stroke-width:2px,color:#0F172A;
    classDef subBox fill:#FFFFFF,stroke:#94A3B8,stroke-width:1px,color:#1E293B;

    subgraph TIER1 ["1. PRESENTATION LAYER (CLIENT INTERFACES)"]
        subgraph WEB_ADMIN ["Web Admin Command Portal"]
            WA_UI["Dashboard UI (React 18 + Vite)"]:::subBox
            WA_MAP["GIS Heatmap (Leaflet + OpenStreetMap)"]:::subBox
            WA_ANL["Analytics (Recharts + Motion)"]:::subBox
            WA_SOCK["Socket.IO Client (Live Listener)"]:::subBox
        end
        subgraph MOBILE_APP ["Mobile Application (Cross-Platform)"]
            MA_RES["Resident Portal (QR Pass & Damage)"]:::subBox
            MA_STF["Field Staff Portal (QR Scanner)"]:::subBox
            MA_NTV["Hardware (Camera, GPS, Picker)"]:::subBox
            MA_STO["AsyncStorage (Offline Session)"]:::subBox
        end
    end
    class TIER1 presLayer;

    subgraph TIER2 ["2. APPLICATION & BUSINESS LOGIC LAYER (NODE.JS + EXPRESS SERVER)"]
        subgraph GATEWAY ["Security & Ingress Gateway"]
            SEC_HELM["Helmet TLS & Sanitization"]:::subBox
            SEC_RATE["Rate Limiters (Auth, OTP, API)"]:::subBox
            SEC_JWT["JWT Verification & RBAC Guard"]:::subBox
        end
        subgraph ROUTE_ENGINES ["REST API Route Handlers"]
            R_AUTH["/api/auth (Login, Register, OTP)"]:::subBox
            R_HH["/api/households (Profiling, QR)"]:::subBox
            R_DIST["/api/distributions & /api/events"]:::subBox
            R_DMG["/api/damage-reports & /api/incidents"]:::subBox
            R_ASST["/api/assistance-requests"]:::subBox
            R_WAR["/api/warehouse & /api/audit-logs"]:::subBox
            R_POL["/api/policy & /api/recovery"]:::subBox
        end
        subgraph LOGIC_ENGINES ["Core Algorithmic Engines"]
            ALG_PRIO["Smart Priority Index Engine"]:::subBox
            ALG_QUOTA["Right-Sized Relief Allocation Engine"]:::subBox
            ALG_FRAUD["Anti-Duplicate Fraud Guard"]:::subBox
            ENG_SOCK["Socket.IO Multi-Room Engine"]:::subBox
        end
    end
    class TIER2 appLayer;

    subgraph TIER3 ["3. DATA & EXTERNAL SERVICES LAYER"]
        subgraph DATABASE ["Database Tier (MongoDB Atlas Cloud Cluster)"]
            DB_COLL["15 Relational Collections (Users, Households, Distributions, etc.)"]:::subBox
            DB_INDX["Compound Unique Indexes (qrCode + eventId)"]:::subBox
        end
        subgraph EXTERNAL_SERVICES ["External Cloud Gateways"]
            EXT_SMS["Semaphore SMS Gateway (Mobile OTP)"]:::subBox
            EXT_MAIL["Gmail SMTP / Nodemailer (Email OTP)"]:::subBox
            EXT_MAPS["OpenStreetMap Tile Servers (GIS Maps)"]:::subBox
        end
    end
    class TIER3 dataLayer;

    WA_UI -->|HTTPS REST| GATEWAY
    MA_RES -->|HTTPS REST| GATEWAY
    MA_STF -->|HTTPS REST| GATEWAY
    WA_SOCK <-->|WSS WebSockets| ENG_SOCK
    MA_RES <-->|WSS WebSockets| ENG_SOCK
    GATEWAY --> ROUTE_ENGINES --> LOGIC_ENGINES
    LOGIC_ENGINES -->|Mongoose ODM| DB_COLL
    DB_COLL --- DB_INDX
    ROUTE_ENGINES -->|HTTPS REST| EXT_SMS
    ROUTE_ENGINES -->|Encrypted SMTP| EXT_MAIL
    WA_MAP -->|Tile Fetch| EXT_MAPS\n```\n\n---\n\n### 2. Agile Scrum Methodology\n```mermaid\nflowchart TD
    classDef phase fill:#EBF3FB,stroke:#1D4ED8,stroke-width:2px,color:#0F172A;
    classDef action fill:#FFFFFF,stroke:#64748B,stroke-width:1.5px,color:#1E293B;
    classDef decision fill:#FEF3C7,stroke:#D97706,stroke-width:2px,color:#0F172A;
    classDef finish fill:#ECFDF5,stroke:#059669,stroke-width:2px,color:#065F46;

    subgraph PHASE1 ["Phase 1: Product Backlog & LGU Requirements"]
        P1_1["Interview Disaster Officials & Analyze DSWD Quota Policies"]:::action
        P1_2["Define User Personas: SuperAdmin, Barangay, Staff, Resident"]:::action
        P1_3["Formulate User Stories in Prioritized Backlog"]:::action
    end

    subgraph SPRINT_CYCLE ["Phase 2: Agile Scrum Execution (2-Week Sprints)"]
        S_PLAN["1. Sprint Planning & Task Allocation"]:::action
        S_DES["2. UI/UX Wireframing & Schema Design"]:::action
        S_DEV["3. Iterative Full-Stack Development"]:::action
        S_TEST["4. Unit Testing & Anti-Fraud Stress Tests"]:::action
        S_REV["5. Sprint Review & Stakeholder Demo"]:::action
        S_RET["6. Sprint Retrospective & Backlog Refinement"]:::action
    end

    subgraph EVALUATION ["Phase 3: Final Verification & Deployment"]
        EVAL_1["Field Simulation (QR Scanning & SMS OTP)"]:::action
        EVAL_2{"Meets Defense Standards?"}:::decision
        EVAL_3["Production Cloud Deployment (Vercel, Render, Atlas, APK)"]:::finish
    end

    P1_1 --> P1_2 --> P1_3 --> S_PLAN
    S_PLAN --> S_DES --> S_DEV --> S_TEST --> S_REV --> S_RET
    S_RET -->|Next Sprint Cycle| S_PLAN
    S_RET -->|All Sprints Complete| EVAL_1
    EVAL_1 --> EVAL_2
    EVAL_2 -- "Adjustments Needed" --> S_PLAN
    EVAL_2 -- "Approved" --> EVAL_3

    class PHASE1 phase;
    class SPRINT_CYCLE phase;
    class EVALUATION phase;\n```\n\n---\n\n### 3. Functional Decomposition Diagram (FDD)\n```mermaid\ngraph TD
    classDef root fill:#0F172A,stroke:#0F172A,stroke-width:2px,color:#FFFFFF;
    classDef role fill:#1E40AF,stroke:#1E40AF,stroke-width:2px,color:#FFFFFF;
    classDef module fill:#0D9488,stroke:#0D9488,stroke-width:1.5px,color:#FFFFFF;
    classDef func fill:#F8FAFC,stroke:#64748B,stroke-width:1px,color:#0F172A;

    ROOT["MITIGATEPLUS SYSTEM"]:::root

    R1["1. LGU SuperAdmin / Head"]:::role
    R2["2. Barangay Official"]:::role
    R3["3. Field Distribution Staff"]:::role
    R4["4. Registered Resident"]:::role

    ROOT --> R1
    ROOT --> R2
    ROOT --> R3
    ROOT --> R4

    R1_M1["GIS Heatmap & Analytics"]:::module
    R1_M2["Relief Operations & Policy"]:::module
    R1_M3["Warehouse & Logs"]:::module
    R1 --> R1_M1
    R1 --> R1_M2
    R1 --> R1_M3
    R1_M1 --> F1_1["View Real-Time Manila Dashboard"]:::func
    R1_M1 --> F1_2["Analyze Risk & Damage Heatmap"]:::func
    R1_M2 --> F1_3["Create Distribution Events"]:::func
    R1_M2 --> F1_4["Configure Right-Sized Quota Policies"]:::func
    R1_M3 --> F1_5["Track Warehouse Stock In/Out"]:::func
    R1_M3 --> F1_6["Review Audit Trail & Fraud Attempts"]:::func

    R2_M1["Household Verification"]:::module
    R2_M2["Priority Ranking"]:::module
    R2_M3["Advisories"]:::module
    R2 --> R2_M1
    R2 --> R2_M2
    R2 --> R2_M3
    R2_M1 --> F2_1["Inspect Registration Queue & ID"]:::func
    R2_M1 --> F2_2["Approve / Reject Household"]:::func
    R2_M2 --> F2_3["View Vulnerability Priority Score"]:::func
    R2_M3 --> F2_4["Post & In-Place Edit Advisories"]:::func

    R3_M1["QR Checkpoint Scanner"]:::module
    R3_M2["Package Release"]:::module
    R3 --> R3_M1
    R3 --> R3_M2
    R3_M1 --> F3_1["Scan Resident QR Code with Camera"]:::func
    R3_M1 --> F3_2["Real-Time Anti-Duplicate Check"]:::func
    R3_M2 --> F3_3["Inspect Right-Sized Quota"]:::func
    R3_M2 --> F3_4["Confirm Package Release in Database"]:::func

    R4_M1["Profiling & OTP"]:::module
    R4_M2["Digital QR Pass"]:::module
    R4_M3["Emergency & Damage"]:::module
    R4 --> R4_M1
    R4 --> R4_M2
    R4 --> R4_M3
    R4_M1 --> F4_1["Register Household & Members"]:::func
    R4_M1 --> F4_2["Verify Mobile Number via OTP"]:::func
    R4_M2 --> F4_3["Access Digital QR Relief Pass"]:::func
    R4_M2 --> F4_4["View Entitled Relief Quota"]:::func
    R4_M3 --> F4_5["Submit House Damage (GPS + Photo)"]:::func
    R4_M3 --> F4_6["Request Special Medical/Infant Kits"]:::func\n```\n\n---\n\n### 4.1 Citizen Registration, ID Attachment & OTP Flowchart\n```mermaid\nflowchart TD
    classDef startEnd fill:#0F172A,stroke:#0F172A,stroke-width:2px,color:#FFFFFF;
    classDef process fill:#FFFFFF,stroke:#1D4ED8,stroke-width:1.5px,color:#0F172A;
    classDef decision fill:#FEF3C7,stroke:#D97706,stroke-width:2px,color:#0F172A;
    classDef db fill:#F1F5F9,stroke:#0D9488,stroke-width:1.5px,color:#0F172A;

    START(["Start: Resident Registration"]):::startEnd
    S1["Enter Head Information & Password"]:::process
    S2["Attach Valid ID Photo (Camera / Gallery)"]:::process
    S3["Add Family Members (Senior, PWD, Pregnant, Infant)"]:::process
    S4["Tap 'Proceed to OTP Verification'"]:::process
    REQ["Backend Generates 6-Digit Cryptographic OTP"]:::process
    GATE{"Dispatch via Semaphore SMS or Gmail SMTP"}:::decision
    MOD["App Opens OTP Verification Modal"]:::process
    INP["Resident Enters 6-Digit OTP Code"]:::process
    VAL{"Is OTP Code Valid & Unexpired?"}:::decision
    ERR["Display Error & Allow Resend"]:::process
    DB[("Save Household & User to MongoDB (Status: Pending)")]:::db
    SOCK["Socket.IO Emits 'new_registration' to Barangay"]:::process
    END(["End: Registration Submitted"]):::startEnd

    START --> S1 --> S2 --> S3 --> S4 --> REQ --> GATE --> MOD --> INP --> VAL
    VAL -- "No" --> ERR --> INP
    VAL -- "Yes" --> DB --> SOCK --> END\n```\n\n---\n\n### 4.2 Barangay Verification & Digital QR Relief Pass Generation\n```mermaid\nflowchart TD
    classDef startEnd fill:#0F172A,stroke:#0F172A,stroke-width:2px,color:#FFFFFF;
    classDef process fill:#FFFFFF,stroke:#1D4ED8,stroke-width:1.5px,color:#0F172A;
    classDef decision fill:#FEF3C7,stroke:#D97706,stroke-width:2px,color:#0F172A;
    classDef db fill:#F1F5F9,stroke:#0D9488,stroke-width:1.5px,color:#0F172A;

    START(["Start: Barangay Official Reviews Queue"]):::startEnd
    Q[("Fetch Pending Households by Barangay Code")]:::db
    SEL["Select Card & Inspect Valid ID Attachment"]:::process
    DEC{"Does ID & Demographics Match Records?"}:::decision
    REJ[("Update Status = 'rejected' in Database")]:::db
    APP[("Update Status = 'verified' & Generate QR String")]:::db
    PRIO["Recalculate Priority Index (+5 pts Senior/PWD)"]:::process
    LOG[("Write to System AuditLogs")]:::db
    SOCK["Socket.IO Broadcasts 'household_verified'"]:::process
    ACT["Resident Mobile Home Activates QR Pass"]:::process
    END(["End: Household Verified"]):::startEnd

    START --> Q --> SEL --> DEC
    DEC -- "No (Invalid ID)" --> REJ --> END
    DEC -- "Yes (Approved)" --> APP --> PRIO --> LOG --> SOCK --> ACT --> END\n```\n\n---\n\n### 4.3 Checkpoint QR Relief Scanning & Anti-Duplicate Interception\n```mermaid\nflowchart TD
    classDef startEnd fill:#0F172A,stroke:#0F172A,stroke-width:2px,color:#FFFFFF;
    classDef process fill:#FFFFFF,stroke:#1D4ED8,stroke-width:1.5px,color:#0F172A;
    classDef decision fill:#FEF3C7,stroke:#D97706,stroke-width:2px,color:#0F172A;
    classDef db fill:#F1F5F9,stroke:#0D9488,stroke-width:1.5px,color:#0F172A;
    classDef fraud fill:#FEE2E2,stroke:#DC2626,stroke-width:2px,color:#991B1B;

    START(["Start: Resident Presents QR Pass at Booth"]):::startEnd
    SCAN["Staff Scans QR Code using Native Camera Scanner"]:::process
    DISP["POST /api/distributions/claim"]:::process
    CHK_STAT{"Is Household Status == 'verified'?"}:::decision
    CHK_DUP{{"Database Query: Does Claim Exist for (qrCode + eventId)?"}}:::decision
    FRD["TRIGGER FRAUD ALERT:<br/>1. Block Release<br/>2. Log in Incidents<br/>3. Emit Live Warning"]:::fraud
    QUOTA["Query Right-Sized Quota (Base + Top-Up)"]:::process
    REL["Staff Releases Physical Items & Taps Confirm"]:::process
    DB_CLAIM[("Insert Document into Distributions Collection")]:::db
    DB_STOCK[("Decrement Stock in WarehouseInventory")]:::db
    SOCK["Socket.IO Emits 'relief_claimed' Event"]:::process
    END(["End: Relief Successfully Dispatched"]):::startEnd

    START --> SCAN --> DISP --> CHK_STAT
    CHK_STAT -- "No" --> FRD --> END
    CHK_STAT -- "Yes" --> CHK_DUP
    CHK_DUP -- "Yes (Already Claimed)" --> FRD --> END
    CHK_DUP -- "No (First Time)" --> QUOTA --> REL --> DB_CLAIM --> DB_STOCK --> SOCK --> END\n```\n\n---\n\n### 4.4 Citizen Damage Reporting & LGU GIS Heatmap Assessment\n```mermaid\nflowchart TD
    classDef startEnd fill:#0F172A,stroke:#0F172A,stroke-width:2px,color:#FFFFFF;
    classDef process fill:#FFFFFF,stroke:#1D4ED8,stroke-width:1.5px,color:#0F172A;
    classDef decision fill:#FEF3C7,stroke:#D97706,stroke-width:2px,color:#0F172A;
    classDef db fill:#F1F5F9,stroke:#0D9488,stroke-width:1.5px,color:#0F172A;

    START(["Start: Resident Reports House Damage"]):::startEnd
    SEV["Select Damage Level: Minor, Moderate, Severe, Total"]:::process
    GPS["1-Tap GPS Geolocation Capture (Lat/Lng)"]:::process
    CAM["Capture Photo via Native Camera / Gallery"]:::process
    DESC["Enter Landmark & Damage Notes"]:::process
    POST["POST /api/damage-reports"]:::process
    DB[("Save Damage Report to MongoDB Atlas")]:::db
    AGG["Compute Barangay Structural Damage Score"]:::process
    SOCK["Socket.IO Broadcasts Spatial Update to Admin"]:::process
    GIS["LGU Admin Views Interactive Leaflet GIS Heatmap"]:::process
    END(["End: Report Recorded in City Assessment"]):::startEnd

    START --> SEV --> GPS --> CAM --> DESC --> POST --> DB --> AGG --> SOCK --> GIS --> END\n```\n\n---\n\n### 5. Overall System Process Flow (Holistic User Journey)\n```mermaid\nflowchart TD
    classDef userLayer fill:#EBF3FB,stroke:#1D4ED8,stroke-width:2px,color:#0F172A;
    classDef adminLayer fill:#FEF3C7,stroke:#D97706,stroke-width:2px,color:#0F172A;
    classDef staffLayer fill:#F5F3FF,stroke:#6D28D9,stroke-width:2px,color:#0F172A;
    classDef backendLayer fill:#F1F5F9,stroke:#0D9488,stroke-width:2px,color:#0F172A;

    subgraph CITIZEN ["1. CITIZEN / RESIDENT"]
        R1["Register Household Head & Family Roster"]
        R2["Verify Mobile Number via 6-Digit OTP"]
        R3["Access Active Digital QR Relief Pass"]
        R4["Report House Damage (GPS + Photo)"]
    end

    subgraph BARANGAY ["2. BARANGAY OFFICIAL"]
        B1["Inspect Registration Queue & ID Attachment"]
        B2["Approve Household & Calculate Priority Index"]
        B3["Post & Edit Real-Time Barangay Advisories"]
    end

    subgraph ADMIN ["3. LGU SUPERADMIN / DISASTER COMMAND"]
        A1["Schedule Distribution Events & Policies"]
        A2["Monitor Live Risk Heatmap & GIS Damage"]
        A3["Supervise Warehouse Stock & Intercept Fraud"]
    end

    subgraph FIELD ["4. FIELD DISTRIBUTION STAFF"]
        F1["Scan Resident QR Code at Relief Booth"]
        F2["Anti-Duplicate Verification & Quota Check"]
        F3["Release Package & Confirm Handover"]
    end

    subgraph BACKEND ["5. CORE BACKEND & MONGODB CLUSTER"]
        S1["Express API Gateway & Security Guard"]
        S2["Algorithmic Priority, Quota & Fraud Engines"]
        S3["Socket.IO Live Multi-Room Broadcaster"]
        S4[("MongoDB Atlas Cloud: 15 Schema Collections")]
        S5["External Gateways: Semaphore SMS, Gmail, OpenStreetMap"]
    end

    R1 --> R2 --> S1 --> S5
    S1 --> S4 --> B1 --> B2 --> S2 --> S3 --> R3
    A1 --> S1
    R4 --> S1 --> A2
    A3 --> S4
    R3 --> F1 --> S1 --> S2 --> F2
    F2 -- "Approved" --> F3 --> S4 --> S3 --> A2

    class CITIZEN userLayer;
    class BARANGAY adminLayer;
    class ADMIN adminLayer;
    class FIELD staffLayer;
    class BACKEND backendLayer;\n```\n\n---\n\n
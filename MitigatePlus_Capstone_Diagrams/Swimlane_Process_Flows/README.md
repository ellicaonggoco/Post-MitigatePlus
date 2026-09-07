# MitigatePlus - Swimlane Process Flow Diagrams (Cross-Functional 4-Tier Architecture)

## Overview
This folder contains the complete **Swimlane (Cross-Functional Flowchart)** diagrams for all 38 System Activities + 1 UML Use Case Diagram, categorized across 5 user roles.

---

## The 4 Architectural Swimlane Tiers in Every Diagram:

| Lane # | Tier Name | Color Header | Responsibility in MitigatePlus |
|---|---|---|---|
| **Lane 1** | **Human Actor** | Gray (`#E2E8F0`) | Resident, Field Staff, Barangay Official, LGU Admin, or Superadmin actions (e.g. clicks, taps, form inputs, scanning). |
| **Lane 2** | **Frontend Client** | Blue (`#DBEAFE`) | React Native Mobile App or React.js Web Admin (Client-side validation, UI modals, GPS capture, AsyncStorage). |
| **Lane 3** | **Backend API Server** | Green (`#DCFCE7`) | Node.js / Express Controllers (JWT auth, bcrypt hashing, Socket.IO push alerts, Semaphore SMS, Cloudinary). |
| **Lane 4** | **Database & Cloud** | Yellow (`#FEF3C7`) | MongoDB Atlas Database Collections (`users`, `households`, `cashforworkprojects`, `distributions`, `damagereports`, etc.). |

---

## Directory Structure

```
Swimlane_Process_Flows/
├── Use_Case_Diagram.drawio                   <- Master UML Use Case Diagram (5 Actors, 38 Module Ovals)
├── Swimlane_Process_Flows_Index.html          <- Interactive Browser Portfolio Viewer
├── README.md                                 <- Architecture & Mapping Documentation
├── Resident/                                 <- 11 Swimlane Diagrams (PF-R01 to PF-R11)
├── Field_Staff/                              <- 4 Swimlane Diagrams (PF-FS01 to PF-FS04)
├── Barangay_Official/                        <- 8 Swimlane Diagrams (PF-BO01 to PF-BO08)
├── LGU_Admin/                                <- 10 Swimlane Diagrams (PF-LA01 to PF-LA10)
└── LGU_Superadmin/                           <- 5 Swimlane Diagrams (PF-SA01 to PF-SA05)
```

**Total: 39 .drawio diagram files (1 Use Case + 38 4-Tier Swimlane Flowcharts)**

---

## How to Open and View

1. **In Any Web Browser**: Double-click `Swimlane_Process_Flows_Index.html` to inspect all diagrams with summaries and direct links.
2. **In Draw.io (diagrams.net)**:
   - Go to [https://app.diagrams.net](https://app.diagrams.net)
   - Click **File > Open From > Device**
   - Pick any `.drawio` file from this folder to edit or export to **PNG / PDF**.

# MitigatePlus - Revised Diagrams (Per Professor's Feedback)

## What Changed From Previous Version

| Old Version (Wrong) | New Version (Correct) |
|---|---|
| Use Case ovals had activity steps | Use Case ovals = Module/Feature names only |
| One big process flow for everything | One dedicated process flow diagram per use case |
| Use Case and Process Flow were separate | Each Process Flow is directly linked to a specific Use Case oval |

---

## File Structure

```
new diagrams/
  Use_Case_Diagram.drawio          <- 1 Use Case Diagram (all 5 actors, 38 modules)
  Process_Flows/
    Resident/                      <- 11 Process Flow diagrams
    Field_Staff/                   <- 4 Process Flow diagrams
    Barangay_Official/             <- 8 Process Flow diagrams
    LGU_Admin/                     <- 10 Process Flow diagrams
    LGU_Superadmin/                <- 5 Process Flow diagrams
```

**Total: 39 .drawio files**

---

## Use Case Diagram - Actors and Their Modules

### Resident (11 Use Cases)
- UC-R01: Register Account
- UC-R02: Login
- UC-R03: View Announcements
- UC-R04: Report Structural Damage
- UC-R05: View Digital QR Relief Pass
- UC-R06: Apply for Cash-for-Work
- UC-R07: View Claims History
- UC-R08: Request Special Assistance
- UC-R09: Manage Household Members
- UC-R10: Change Password
- UC-R11: Sync Offline Data

### Field Staff (4 Use Cases)
- UC-FS01: Login (Staff)
- UC-FS02: Scan QR for Relief Distribution
- UC-FS03: Assign and Complete Special Request
- UC-FS04: Submit Field Incident Report

### Barangay Official (8 Use Cases)
- UC-BO01: Login (Barangay Official)
- UC-BO02: Verify Household Applications
- UC-BO03: View Priority Index
- UC-BO04: Manage Announcements
- UC-BO05: Request Cash-for-Work Project
- UC-BO06: Review CFW Worker Applicants
- UC-BO07: Manage Special Relief Requests
- UC-BO08: View Recovery Progress

### LGU Admin (10 Use Cases)
- UC-LA01: Login (LGU Admin)
- UC-LA02: Create Livelihood Project
- UC-LA03: Approve CFW Project Proposals
- UC-LA04: Manage Distribution Events
- UC-LA05: Manage Warehouse Inventory
- UC-LA06: View Payroll and Export CSV
- UC-LA07: Manage Special Relief Requests
- UC-LA08: Manage Staff Accounts
- UC-LA09: View Reports and Audit
- UC-LA10: Allocate Relief Resources

### LGU Superadmin (5 Use Cases)
- UC-SA01: Login (Superadmin)
- UC-SA02: View Barangay Heatmap
- UC-SA03: Configure Global Policy
- UC-SA04: Manage All Accounts
- UC-SA05: View System Audit Logs

---

## Use Case to Process Flow Mapping

Each Process Flow diagram title says: "PF-XXX: Process Flow - [Module Name]"
The Linked Use Case field shows exactly which UC oval it corresponds to.

```
UC-R01: Register Account       ->  PF-R01_Register_Account.drawio
UC-R02: Login                  ->  PF-R02_Login.drawio
UC-FS02: Scan QR Distribution  ->  PF-FS02_Scan_QR_Relief_Distribution.drawio
UC-BO05: Request CFW Project   ->  PF-BO05_Request_CFW_Project.drawio
UC-LA06: View Payroll + CSV    ->  PF-LA06_View_Payroll_Export_CSV.drawio
... and so on for all 38 flows
```

---

## How to Open Diagrams

1. Go to **[https://app.diagrams.net](https://app.diagrams.net)**
2. Click **File > Open From > Device**
3. Navigate to this folder and select any `.drawio` file
4. Export as PNG, SVG, or PDF for your thesis documentation

---

## Process Flow Legend

| Shape | Color | Meaning |
|---|---|---|
| Rounded rectangle | Green | Start / End terminal |
| Rectangle | Blue | Process step / Activity |
| Diamond | Yellow | Decision point (Yes/No) |
| Red dashed arrow | Red | "No" branch looping back (retry) |
| Solid black arrow | Blue | Normal flow (Yes / Next step) |

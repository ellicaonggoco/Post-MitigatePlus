# MITIGATEPLUS — CAPSTONE GROUP HANDOFF & QUICK-START GUIDE
Disaster Recovery, Relief Distribution and Household Assistance Management Platform

---

## 1. LIVE SYSTEM URLS AND LINKS

| Component | Platform / Host | Live Link |
| :--- | :--- | :--- |
| Web Admin Command Center | Vercel Cloud | https://post-mitigate-plus.vercel.app |
| Backend REST and Socket API | Render Cloud | https://post-mitigateplus.onrender.com |
| Cloud Database | MongoDB Atlas | Connected and Active 24/7 |
| Mobile App (Android APK) | Expo Cloud | MitigatePlus.apk (Installed on Phone) |

---

## 2. MASTER CREDENTIALS CHEAT SHEET

| Role | Email / Phone | Password | Saan Gagamitin |
| :--- | :--- | :--- | :--- |
| LGU SuperAdmin (Mayor / CDRRMO Head) | superadmin@manila.gov.ph | admin123 | Web Admin |
| LGU Admin (City Operations / CSWD) | admin@manila.gov.ph | admin123 | Web Admin |
| Barangay Official (Barangay 291) | official291@manila.gov.ph | official123 | Web Admin |
| Field Relief Staff (QR Scanner) | staff291@manila.gov.ph | staff123 | Mobile App |
| Verified Resident (Juan Dela Cruz) | 09181234567 | resident123 | Mobile App |
| New Resident | (Kahit anong bagong phone/email) | (Sariling Password) | Mobile App |

---

## 3. QUICK 5-MINUTE LIVE DEMO SCRIPT (Para sa Presentation/Defense)

### HAKBANG 1: Pag-rehistro ng Residente (Mobile)
1. Buksan ang MitigatePlus Mobile App sa cellphone.
2. Piliin ang Resident -> Register.
3. Ilagay ang pangalan (hal. Maria Santos), piliin ang Barangay 291, at ilagay ang bilang ng miyembro ng pamilya (hal. 4 members: 1 Infant, 1 Senior).
4. Pagka-submit, lalabas ang status na Pending Verification (Wala pang QR code dahil kailangan munang ma-verify ng barangay para maiwasan ang ghost beneficiaries).

### HAKBANG 2: Pag-apruba ng Barangay (Web Admin)
1. Sa laptop, mag-login sa https://post-mitigate-plus.vercel.app bilang Barangay Official (official291@manila.gov.ph / official123).
2. Pumunta sa Verification Queue -> Makikita agad ang bagong account ni Maria Santos!
3. I-click ang Review -> Verify and Approve.
4. Sa phone ni Maria, magiging Verified Beneficiary na ito at lilitaw ang kanyang Digital QR Voucher!

### HAKBANG 3: Pamamahagi at QR Scanning sa Field (Mobile Staff)
1. Sa isa pang cellphone, mag-login bilang Field Staff (staff291@manila.gov.ph / staff123).
2. Buksan ang QR Scanner at itapat sa QR Code ng resident (Maria Santos).
3. Unang Scan: Lalabas ang berdeng screen: CLAIM SUCCESSFUL! (Nailabas ang 1 Family Food Pack).

### HAKBANG 4: Anti-Fraud Duplicate Interception Test
1. Subukang i-scan muli ang parehong QR code ni Maria.
2. MAGPUPULA ANG APP: DUPLICATE CLAIM BLOCKED!
3. Sa Web Admin (Login as admin@manila.gov.ph), pumunta sa Fraud Interception -> Papasok agad ang Live Alert ng naharang na double claim!

### HAKBANG 5: Executive Audit and PDF Report (SuperAdmin)
1. Sa Web Admin, mag-login bilang SuperAdmin (superadmin@manila.gov.ph / admin123).
2. Pumunta sa Reports and Audit -> Pindutin ang Save / Print PDF Report.
3. Ipakita ang opisyal na Manila City Disaster Recovery Audit Report na may kumpletong statistics at City Seal!

---

## 4. MGA TIPS AT TROUBLESHOOTING

* Kapag may bagong update sa Web: Pindutin lang ang Ctrl + Shift + R (Hard Refresh) sa browser.
* Internet Connection: Ang Mobile at Web ay parehong nakakabit sa live cloud database (MongoDB Atlas) kaya kahit magkaibang Wi-Fi o mobile data, magkaka-sync pa rin sila.
* Offline Resilience: Kahit mahina ang signal ng phone, naka-save sa secure local storage ng phone ang verified QR code ng resident.
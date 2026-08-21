const fs = require('fs');
const path = require('path');

function escapeXml(unsafe) {
  if (typeof unsafe !== 'string') unsafe = String(unsafe);
  return unsafe
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

class DrawIOBuilder {
  constructor(name = 'Diagram', width = 1654, height = 1169) {
    this.name = name;
    this.width = width;
    this.height = height;
    this.cells = [];
    this.cellId = 2;
  }

  addCell(id, value, style, parent = '1', vertex = '1', geometry = null) {
    let geoXml = '';
    if (geometry) {
      geoXml = `<mxGeometry x="${geometry.x || 0}" y="${geometry.y || 0}" width="${geometry.width || 100}" height="${geometry.height || 50}" as="geometry" ${geometry.relative ? 'relative="1"' : ''}>${geometry.points || ''}</mxGeometry>`;
    }
    this.cells.push(`<mxCell id="${id}" value="${escapeXml(value)}" style="${style}" parent="${parent}" vertex="${vertex}">${geoXml}</mxCell>`);
    return id;
  }

  addEdge(id, value, style, source, target, points = []) {
    let ptsXml = '';
    if (points && points.length > 0) {
      ptsXml = `<Array as="points">${points.map(p => `<mxPoint x="${p.x}" y="${p.y}" />`).join('')}</Array>`;
    }
    const geoXml = `<mxGeometry relative="1" as="geometry">${ptsXml}</mxGeometry>`;
    this.cells.push(`<mxCell id="${id}" value="${escapeXml(value)}" style="${style}" parent="1" source="${source}" target="${target}" edge="1">${geoXml}</mxCell>`);
    return id;
  }

  nextId() {
    return `cell_${this.cellId++}`;
  }

  toXml() {
    return `<diagram id="${this.name.replace(/[^a-zA-Z0-9]/g, '_')}" name="${escapeXml(this.name)}">
  <mxGraphModel dx="1422" dy="800" grid="1" gridSize="10" guides="1" tooltips="1" connect="1" arrows="1" fold="1" page="1" pageScale="1" pageWidth="${this.width}" pageHeight="${this.height}" math="0" shadow="0">
    <root>
      <mxCell id="0" />
      <mxCell id="1" parent="0" />
      ${this.cells.join('\n      ')}
    </root>
  </mxGraphModel>
</diagram>`;
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// 1. 3-TIER SYSTEM ARCHITECTURE DIAGRAM
// ─────────────────────────────────────────────────────────────────────────────
function buildSystemArchitecture() {
  const d = new DrawIOBuilder('3-Tier System Architecture', 1800, 1400);

  // Colors & Styles
  const headerStyle = "text;html=1;strokeColor=none;fillColor=none;align=center;verticalAlign=middle;whiteSpace=wrap;rounded=0;fontSize=22;fontStyle=1;fontColor=#0B2E59;";
  const subHeaderStyle = "text;html=1;strokeColor=none;fillColor=none;align=center;verticalAlign=middle;whiteSpace=wrap;rounded=0;fontSize=13;fontColor=#475569;";
  const containerStyle = (fill, stroke) => `swimlane;startSize=35;html=1;fillColor=${fill};strokeColor=${stroke};fontStyle=1;fontSize=15;fontColor=#0F172A;rounded=1;arcSize=6;shadow=1;`;
  const boxStyle = (fill, stroke, font = '#0F172A') => `rounded=1;whiteSpace=wrap;html=1;fillColor=${fill};strokeColor=${stroke};fontColor=${font};fontSize=12;fontStyle=1;shadow=0;arcSize=8;`;
  const itemStyle = (fill = '#FFFFFF', stroke = '#CBD5E1') => `rounded=1;whiteSpace=wrap;html=1;fillColor=${fill};strokeColor=${stroke};fontColor=#334155;fontSize=11;align=left;spacingLeft=8;`;
  const edgeStyle = "edgeStyle=orthogonalEdgeStyle;rounded=1;orthogonalLoop=1;jettySize=auto;html=1;strokeColor=#1557B0;strokeWidth=2;fontSize=11;fontColor=#1E293B;";
  const dataEdgeStyle = "edgeStyle=orthogonalEdgeStyle;rounded=1;orthogonalLoop=1;jettySize=auto;html=1;strokeColor=#16A34A;strokeWidth=2;dashed=1;fontSize=11;fontColor=#166534;";

  // Title
  d.addCell('t1', 'MITIGATEPLUS: 3-TIER SYSTEM ARCHITECTURE', headerStyle, '1', '1', { x: 400, y: 30, width: 1000, height: 35 });
  d.addCell('t2', 'Hierarchical Multi-Portal Disaster Recovery Platform for the City of Manila', subHeaderStyle, '1', '1', { x: 400, y: 65, width: 1000, height: 25 });

  // ── LAYER 1: PRESENTATION LAYER ──
  const l1 = d.addCell('l1', 'TIER 1: PRESENTATION LAYER (Client Interfaces & End-User Portals)', containerStyle('#EFF6FF', '#2563EB'), '1', '1', { x: 60, y: 110, width: 1680, height: 330 });

  // Web Admin Box
  d.addCell('w_box', 'LGU Web Command Center (React 18 + Vite + SPA Router)', boxStyle('#DBEAFE', '#3B82F6'), l1, '1', { x: 40, y: 50, width: 780, height: 250 });
  d.addCell('w1', '• LGU SuperAdmin Portal: Executive Dashboard, Global Policy Formula, Account Security, Audit Exporter', itemStyle(), l1, '1', { x: 60, y: 90, width: 740, height: 32 });
  d.addCell('w2', '• LGU Operations Admin Portal: City Risk Heatmap (GIS TopoJSON), Distribution Events, Central Warehouse, Fraud Interception', itemStyle(), l1, '1', { x: 60, y: 128, width: 740, height: 32 });
  d.addCell('w3', '• Barangay Official Portal: Real-Time Resident Verification Queue, 5-Stage Recovery Tracker, Special Relief Requests', itemStyle(), l1, '1', { x: 60, y: 166, width: 740, height: 32 });
  d.addCell('w4', '• Real-Time WebSocket Client (Socket.IO-Client): Instant Fraud Alerts, Queue Sync, Recovery Progression Streams', itemStyle('#FEF3C7', '#D97706'), l1, '1', { x: 60, y: 204, width: 740, height: 32 });
  d.addCell('w5', '• UI Foundation: Modular Claymorphic/Neumorphic Design System, Recharts Visualization, Leaflet GIS', itemStyle(), l1, '1', { x: 60, y: 242, width: 740, height: 32 });

  // Mobile App Box
  d.addCell('m_box', 'Mobile Client Application (React Native + Expo SDK 51)', boxStyle('#DCFCE7', '#16A34A'), l1, '1', { x: 860, y: 50, width: 780, height: 250 });
  d.addCell('m1', '• Resident Citizen Portal: Singpass-Style Offline QR Relief Pass, Household Roster Manager, Biometrics Lock', itemStyle(), l1, '1', { x: 880, y: 90, width: 740, height: 32 });
  d.addCell('m2', '• Post-Disaster Damage Reporting: 4-Level Severity Grid, Camera Photo Evidence Upload, Landmark Geotagging', itemStyle(), l1, '1', { x: 880, y: 128, width: 740, height: 32 });
  d.addCell('m3', '• Relief Quota Request & Timeline: Headcount-scaled quota request, Real-time status stepper, Claims history', itemStyle(), l1, '1', { x: 880, y: 166, width: 740, height: 32 });
  d.addCell('m4', '• Field Staff Portal & QR Scanner: On-Site QR Verification, Duplicate Claim Interception, Offline Scanner Buffer', itemStyle('#FEF3C7', '#D97706'), l1, '1', { x: 880, y: 204, width: 740, height: 32 });
  d.addCell('m5', '• Door-to-Door Delivery & Incidents: Bedridden/PWD special assignment delivery, On-ground incident logging', itemStyle(), l1, '1', { x: 880, y: 242, width: 740, height: 32 });

  // ── LAYER 2: APPLICATION & BUSINESS LOGIC LAYER ──
  const l2 = d.addCell('l2', 'TIER 2: APPLICATION & BUSINESS LOGIC LAYER (Express.js + Node.js + Algorithmic Engines)', containerStyle('#F8FAFC', '#475569'), '1', '1', { x: 60, y: 480, width: 1680, height: 420 });

  // REST API Gateway
  d.addCell('gw_box', 'API Gateway & Security Services', boxStyle('#F1F5F9', '#64748B'), l2, '1', { x: 40, y: 50, width: 360, height: 340 });
  d.addCell('gw1', '• JWT Authentication & Bcrypt Hashing (10 rounds)', itemStyle(), l2, '1', { x: 55, y: 90, width: 330, height: 36 });
  d.addCell('gw2', '• Role-Based Access Control (RBAC Middleware):\n  [SuperAdmin, Admin, Official, Staff, Resident]', itemStyle(), l2, '1', { x: 55, y: 132, width: 330, height: 42 });
  d.addCell('gw3', '• Geographic Isolation (requireBarangayScope)', itemStyle(), l2, '1', { x: 55, y: 180, width: 330, height: 36 });
  d.addCell('gw4', '• Rate Limiting (express-rate-limit):\n  100 req/15min API, 20 req/15min Auth', itemStyle(), l2, '1', { x: 55, y: 222, width: 330, height: 42 });
  d.addCell('gw5', '• Dynamic CORS & Health Check Endpoint (/api/health)', itemStyle(), l2, '1', { x: 55, y: 270, width: 330, height: 36 });
  d.addCell('gw6', '• Automated System Bootstrap (SuperAdmin, Admin)', itemStyle(), l2, '1', { x: 55, y: 312, width: 330, height: 36 });

  // Core Algorithmic Business Engines
  d.addCell('eng_box', 'Core Algorithmic Engines & Real-Time Dispatcher', boxStyle('#FEF3C7', '#D97706'), l2, '1', { x: 430, y: 50, width: 620, height: 340 });
  d.addCell('eng1', '1. Smart Priority Index Engine (priorityIndex.js):\n   Score = (Damage * 10) + VulnerabilityPoints + min(Days, 30) - Penalty\n   High (>=50), Medium (25-49), Low (<25)', itemStyle('#FFFBEB', '#F59E0B'), l2, '1', { x: 445, y: 90, width: 590, height: 50 });
  d.addCell('eng2', '2. Right-Sized Relief Allocation Engine (reliefAllocation.js):\n   BasePacks = max(1, floor(n / c)), TopUpUnits = max(0, n - (BasePacks * c))\n   Calculates dynamic packs per household composition', itemStyle('#FFFBEB', '#F59E0B'), l2, '1', { x: 445, y: 146, width: 590, height: 50 });
  d.addCell('eng3', '3. Anti-Duplicate Claim Enforcement Engine (distributionRoutes.js):\n   Atomic compound index check + real-time 409 conflict trigger\n   Auto-emits duplicate_claim_alert to Command Center', itemStyle('#FEE2E2', '#EF4444'), l2, '1', { x: 445, y: 202, width: 590, height: 50 });
  d.addCell('eng4', '4. Assistance Gap Detection Engine (gapDetection.js):\n   Analyzes 7 standard relief categories against fulfilled distributions', itemStyle('#FFFBEB', '#F59E0B'), l2, '1', { x: 445, y: 258, width: 590, height: 36 });
  d.addCell('eng5', '5. Real-Time WebSocket Hub (Socket.IO):\n   Rooms: barangay:<code >, household:<id >, admin_room', itemStyle('#E0E7FF', '#6366F1'), l2, '1', { x: 445, y: 300, width: 590, height: 40 });

  // 12 Micro-Route Modules
  d.addCell('rt_box', '12 Modular Route Handlers', boxStyle('#F1F5F9', '#64748B'), l2, '1', { x: 1080, y: 50, width: 560, height: 340 });
  d.addCell('rt1', '• /api/auth: Registration, Login, Provisioning, OTP verification\n• /api/households: Verification Queue, Profile, QR Scanner Lookup\n• /api/distributions: Event Dispatch, Right-Sized Relief Release\n• /api/assistance-requests: Citizen Requests & Door-to-Door Tasks\n• /api/damage-reports: Citizen Damage Reports & Staff Validation\n• /api/warehouse: Central Inventory, Restock (+), Dispatch (-), Logs', itemStyle(), l2, '1', { x: 1095, y: 90, width: 530, height: 110 });
  d.addCell('rt2', '• /api/recovery: 5-Stage Household Recovery Status Management\n• /api/incidents: Field Loggers & Evacuation Incident Reports\n• /api/announcements: Civic Alerts with Mobile Deep-Link Triggers\n• /api/reports: Executive KPIs, Blocked Duplicate Trails, Gap Matrix\n• /api/policy: SuperAdmin Right-Sized Allocation Formula Tuning\n• /api/audit-logs: Comprehensive Immutable Activity Audit Trail', itemStyle(), l2, '1', { x: 1095, y: 210, width: 530, height: 110 });
  d.addCell('rt3', '• Multi-Channel Services: Semaphore SMS API, Gmail SMTP Nodemailer, Expo Push', itemStyle('#EFF6FF', '#3B82F6'), l2, '1', { x: 1095, y: 330, width: 530, height: 36 });

  // ── LAYER 3: DATA PERSISTENCE & INFRASTRUCTURE LAYER ──
  const l3 = d.addCell('l3', 'TIER 3: DATA PERSISTENCE & CLOUD INFRASTRUCTURE LAYER (MongoDB Atlas + External Gateways)', containerStyle('#F0FDF4', '#16A34A'), '1', '1', { x: 60, y: 940, width: 1680, height: 380 });

  // Database Schemas Box
  d.addCell('db_box', 'MongoDB Atlas Distributed Database (Mongoose ODM - 15 Data Models)', boxStyle('#DCFCE7', '#22C55E'), l3, '1', { x: 40, y: 50, width: 1100, height: 300 });
  d.addCell('db1', '1. User (Credentials, Roles, Scopes, Bcrypt Hashes)\n2. Household (Roster, PriorityScore, QR, Status, Coordinates)\n3. Distribution (Relief Release Logs, Headcount Snapshot)\n4. DistributionEvent (Drive Batches, Venues, Targets, Active State)\n5. AssistanceRequest (Citizen Special Needs, Fulfilled Status)', itemStyle(), l3, '1', { x: 60, y: 90, width: 500, height: 95 });
  d.addCell('db2', '6. DamageReport (Severity, Geotag, Photos, Validation)\n7. RecoveryStatus (5-Stage Linear Household State)\n8. Incident (Field Disruptions, Evacuation Requests)\n9. ReliefItemType (Base coverage, Top-up sizes, Stock limits)\n10. WarehouseItem (Inventory Catalog, Stock Units, Reorder Min)', itemStyle(), l3, '1', { x: 580, y: 90, width: 540, height: 95 });
  d.addCell('db3', '11. WarehouseLog (Stock Movement In/Out Logs, Notes)\n12. Announcement (City/Barangay Notices, Mobile Deep-links)\n13. PolicyConfig (Global Formula Ratios, Security Passcodes)\n14. AuditLog (System-wide User Actions, IP & Role Snapshots)\n15. OtpToken (Auto-Purging TTL Index: 10 min / 600s expiration)', itemStyle(), l3, '1', { x: 60, y: 195, width: 500, height: 95 });
  d.addCell('db4', 'Data Integrity & Anti-Duplicate Indexing:\n• Unique Compound Index: { distributionEventId: 1, householdId: 1 }\n• Strict Relational Populates: headOfHouseholdUserId, verifiedBy, releasedBy\n• Memory Cache Fallback & Automatic Reconnection Watchdog', itemStyle('#FEF2F2', '#EF4444'), l3, '1', { x: 580, y: 195, width: 540, height: 95 });
  d.addCell('db5', 'Persistence Guarantee: 100% Cloud Clustered & Replicated via MongoDB Atlas with Automatic Daily Snapshots', itemStyle('#EFF6FF', '#3B82F6'), l3, '1', { x: 60, y: 300, width: 1060, height: 32 });

  // External Cloud Services Box
  d.addCell('ext_box', 'External Cloud Services & Telecom Gateways', boxStyle('#EFF6FF', '#3B82F6'), l3, '1', { x: 1170, y: 50, width: 470, height: 300 });
  d.addCell('ext1', '• Semaphore SMS Gateway:\n  Real-time 6-digit OTP delivery to Philippine Telcos (Globe, Smart, DITO, TNT)', itemStyle(), l3, '1', { x: 1185, y: 90, width: 440, height: 50 });
  d.addCell('ext2', '• Google Gmail SMTP (Nodemailer):\n  100% Free HTML OTP & Verification Email Dispatcher', itemStyle(), l3, '1', { x: 1185, y: 150, width: 440, height: 50 });
  d.addCell('ext3', '• Expo Push Notification Gateway:\n  Push Notifications to Field Staff and Resident Mobile Devices', itemStyle(), l3, '1', { x: 1185, y: 210, width: 440, height: 50 });
  d.addCell('ext4', '• Manila City GIS Data (TopoJSON):\n  GeoJSON / TopoJSON shapefiles covering all 897 Barangays', itemStyle(), l3, '1', { x: 1185, y: 270, width: 440, height: 50 });

  // Connectors between Tiers
  d.addEdge('e1', 'HTTPS / REST API Requests & JWT Bearer Auth', edgeStyle, 'w_box', 'gw_box');
  d.addEdge('e2', 'Real-Time Bi-Directional WebSocket Events', edgeStyle, 'w_box', 'eng_box');
  d.addEdge('e3', 'Mobile REST Endpoints & Service Calls', edgeStyle, 'm_box', 'rt_box');
  d.addEdge('e4', 'Mobile Socket.IO Listeners (Alerts/Queue)', edgeStyle, 'm_box', 'eng_box');
  d.addEdge('e5', 'Mongoose ODM Queries & Atomic Transactions', dataEdgeStyle, 'gw_box', 'db_box');
  d.addEdge('e6', 'Stock Mutations & Relational Populates', dataEdgeStyle, 'rt_box', 'db_box');
  d.addEdge('e7', 'SMS / Email / Push Notifications', dataEdgeStyle, 'rt_box', 'ext_box');

  return d.toXml();
}

// ─────────────────────────────────────────────────────────────────────────────
// 2. PROJECT DEVELOPMENT METHODOLOGY DIAGRAM (AGILE SCRUM)
// ─────────────────────────────────────────────────────────────────────────────
function buildAgileMethodology() {
  const d = new DrawIOBuilder('Agile Scrum Methodology', 1800, 1300);

  const headerStyle = "text;html=1;strokeColor=none;fillColor=none;align=center;verticalAlign=middle;whiteSpace=wrap;rounded=0;fontSize=22;fontStyle=1;fontColor=#0B2E59;";
  const subHeaderStyle = "text;html=1;strokeColor=none;fillColor=none;align=center;verticalAlign=middle;whiteSpace=wrap;rounded=0;fontSize=13;fontColor=#475569;";
  const phaseBoxStyle = (fill, stroke) => `swimlane;startSize=40;html=1;fillColor=${fill};strokeColor=${stroke};fontStyle=1;fontSize=14;fontColor=#0F172A;rounded=1;arcSize=8;shadow=1;`;
  const itemStyle = (fill = '#FFFFFF', stroke = '#CBD5E1') => `rounded=1;whiteSpace=wrap;html=1;fillColor=${fill};strokeColor=${stroke};fontColor=#334155;fontSize=11;align=left;spacingLeft=8;`;
  const edgeStyle = "edgeStyle=orthogonalEdgeStyle;rounded=1;orthogonalLoop=1;jettySize=auto;html=1;strokeColor=#1557B0;strokeWidth=2;fontSize=11;fontColor=#1E293B;";

  // Title
  d.addCell('at1', 'MITIGATEPLUS: AGILE SCRUM DEVELOPMENT METHODOLOGY', headerStyle, '1', '1', { x: 350, y: 30, width: 1100, height: 35 });
  d.addCell('at2', 'Iterative, Sprint-Driven Software Engineering Lifecycle for Disaster Response & Recovery Management', subHeaderStyle, '1', '1', { x: 350, y: 65, width: 1100, height: 25 });

  // Rationale Banner
  const rat = d.addCell('rat_box', 'WHY AGILE SCRUM WAS CHOSEN FOR MITIGATEPLUS:\n• Rapid Response to Dynamic Disaster Requirements: Enables fast adjustments to LGU relief distribution policies and Philippine disaster protocols (MDRRMO).\n• Continuous Stakeholder Feedback: Bi-weekly demonstrations with Barangay Captains, Relief Volunteers, and Disaster Coordinators.\n• Incremental Risk Reduction: High-risk components (Real-Time Anti-Duplicate QR Scanner, Smart Priority Math) were tested and validated in early sprints.\n• 100% Quality & Deployment Readiness: Continuous Integration, automated code audits, and sprint retrospectives ensure zero defect leakage.', 'rounded=1;whiteSpace=wrap;html=1;fillColor=#EFF6FF;strokeColor=#3B82F6;fontColor=#1E3A8A;fontSize=12;fontStyle=1;align=left;spacingLeft=16;shadow=1;', '1', '1', { x: 80, y: 110, width: 1640, height: 110 });

  // Sprint 0
  const s0 = d.addCell('s0', 'SPRINT 0: INCEPTION & ARCHITECTURE (Weeks 1-2)', phaseBoxStyle('#F1F5F9', '#64748B'), '1', '1', { x: 80, y: 250, width: 300, height: 420 });
  d.addCell('s0_1', '• Requirements Elicitation with Manila City LGU & Disaster Councils', itemStyle(), s0, '1', { x: 15, y: 55, width: 270, height: 45 });
  d.addCell('s0_2', '• 3-Tier Layered Architecture Definition (Express + React + Expo)', itemStyle(), s0, '1', { x: 15, y: 110, width: 270, height: 45 });
  d.addCell('s0_3', '• MongoDB Schema Modeling (15 Collections & Compound Indexes)', itemStyle(), s0, '1', { x: 15, y: 165, width: 270, height: 45 });
  d.addCell('s0_4', '• Design System Tokens & Wireframing (Manila Blue & Neumorphic UI)', itemStyle(), s0, '1', { x: 15, y: 220, width: 270, height: 45 });
  d.addCell('s0_5', '• Git Repository Setup, CI/CD, and Development Environment Setup', itemStyle(), s0, '1', { x: 15, y: 275, width: 270, height: 45 });
  d.addCell('s0_del', 'DELIVERABLE:\nSystem Architecture Blueprint, Database Schemas, Project Backlog', itemStyle('#DBEAFE', '#2563EB'), s0, '1', { x: 15, y: 330, width: 270, height: 65 });

  // Sprint 1
  const s1 = d.addCell('s1', 'SPRINT 1: CORE AUTH & ROLES (Weeks 3-4)', phaseBoxStyle('#EFF6FF', '#3B82F6'), '1', '1', { x: 415, y: 250, width: 300, height: 420 });
  d.addCell('s1_1', '• Multi-Tier Role-Based Authentication (JWT & Bcrypt Hashing)', itemStyle(), s1, '1', { x: 15, y: 55, width: 270, height: 45 });
  d.addCell('s1_2', '• Semaphore SMS & Gmail SMTP OTP Verification Services', itemStyle(), s1, '1', { x: 15, y: 110, width: 270, height: 45 });
  d.addCell('s1_3', '• Web-Admin Portal Shell & Dynamic Role-Based Navigation Routing', itemStyle(), s1, '1', { x: 15, y: 165, width: 270, height: 45 });
  d.addCell('s1_4', '• SuperAdmin Account Provisioning & Security Enforcement', itemStyle(), s1, '1', { x: 15, y: 220, width: 270, height: 45 });
  d.addCell('s1_5', '• Auto-Bootstrapping System for Default Executive & Staff Accounts', itemStyle(), s1, '1', { x: 15, y: 275, width: 270, height: 45 });
  d.addCell('s1_del', 'DELIVERABLE:\nSecure Authentication Gateway, Provisioning Subsystem, Active RBAC', itemStyle('#DBEAFE', '#2563EB'), s1, '1', { x: 15, y: 330, width: 270, height: 65 });

  // Sprint 2
  const s2 = d.addCell('s2', 'SPRINT 2: RESIDENT PORTAL & AI INDEX (Weeks 5-6)', phaseBoxStyle('#DCFCE7', '#16A34A'), '1', '1', { x: 750, y: 250, width: 300, height: 420 });
  d.addCell('s2_1', '• Mobile 2-Step Resident Registration & Family Roster Management', itemStyle(), s2, '1', { x: 15, y: 55, width: 270, height: 45 });
  d.addCell('s2_2', '• Smart Priority Index Algorithm (Damage + Vulnerability - Penalty)', itemStyle(), s2, '1', { x: 15, y: 110, width: 270, height: 45 });
  d.addCell('s2_3', '• Barangay Verification Queue with Real-Time Address Overlap Alerts', itemStyle(), s2, '1', { x: 15, y: 165, width: 270, height: 45 });
  d.addCell('s2_4', '• Singpass-Style Encrypted QR Relief Pass Generation with Export', itemStyle(), s2, '1', { x: 15, y: 220, width: 270, height: 45 });
  d.addCell('s2_5', '• Citizen Damage Reporting Module with Photo Evidence Upload', itemStyle(), s2, '1', { x: 15, y: 275, width: 270, height: 45 });
  d.addCell('s2_del', 'DELIVERABLE:\nMobile Resident App, Priority Scoring Engine, Digital QR Passes', itemStyle('#DCFCE7', '#16A34A'), s2, '1', { x: 15, y: 330, width: 270, height: 65 });

  // Sprint 3
  const s3 = d.addCell('s3', 'SPRINT 3: LGU OPS & GIS HEATMAP (Weeks 7-8)', phaseBoxStyle('#FEF3C7', '#D97706'), '1', '1', { x: 1085, y: 250, width: 300, height: 420 });
  d.addCell('s3_1', '• Interactive Manila City GIS Heatmap (897 Barangays TopoJSON)', itemStyle(), s3, '1', { x: 15, y: 55, width: 270, height: 45 });
  d.addCell('s3_2', '• Central Warehouse Inventory System (Capacity Bars & Reorder Min)', itemStyle(), s3, '1', { x: 15, y: 110, width: 270, height: 45 });
  d.addCell('s3_3', '• Right-Sized Relief Allocation Engine (Headcount Multipliers)', itemStyle(), s3, '1', { x: 15, y: 165, width: 270, height: 45 });
  d.addCell('s3_4', '• Distribution Events Manager (Heatmap Pre-fill & Stock Dispatch)', itemStyle(), s3, '1', { x: 15, y: 220, width: 270, height: 45 });
  d.addCell('s3_5', '• Civic Announcements Engine with Mobile Deep-Link Action Triggers', itemStyle(), s3, '1', { x: 15, y: 275, width: 270, height: 45 });
  d.addCell('s3_del', 'DELIVERABLE:\nGIS Command Center, Warehouse Engine, Relief Allocation Pipeline', itemStyle('#FEF3C7', '#D97706'), s3, '1', { x: 15, y: 330, width: 270, height: 65 });

  // Sprint 4
  const s4 = d.addCell('s4', 'SPRINT 4: QR SCANNER & FRAUD ENGINE (Weeks 9-10)', phaseBoxStyle('#FEE2E2', '#EF4444'), '1', '1', { x: 1420, y: 250, width: 300, height: 420 });
  d.addCell('s4_1', '• Field Staff QR Scanner Screen & Instant Beneficiary Lookup', itemStyle(), s4, '1', { x: 15, y: 55, width: 270, height: 45 });
  d.addCell('s4_2', '• Real-Time Anti-Duplicate Claim Interceptor (Database Compound Lock)', itemStyle(), s4, '1', { x: 15, y: 110, width: 270, height: 45 });
  d.addCell('s4_3', '• Socket.IO Live Alert Streaming to Web Command Center (admin_room)', itemStyle(), s4, '1', { x: 15, y: 165, width: 270, height: 45 });
  d.addCell('s4_4', '• Special Relief Request Door-to-Door Assignment & Mobile Fulfillment', itemStyle(), s4, '1', { x: 15, y: 220, width: 270, height: 45 });
  d.addCell('s4_5', '• 5-Stage Household Recovery Stepper (Waiting to Fully Recovered)', itemStyle(), s4, '1', { x: 15, y: 275, width: 270, height: 45 });
  d.addCell('s4_del', 'DELIVERABLE:\nField Staff QR Scanner App, Anti-Fraud Engine, Live Socket Streams', itemStyle('#FEE2E2', '#EF4444'), s4, '1', { x: 15, y: 330, width: 270, height: 65 });

  // Sprint 5: Hardening & Deployment
  const s5 = d.addCell('s5', 'SPRINT 5: PRODUCTION HARDENING, AUDIT & DEPLOYMENT (Weeks 11-12)', phaseBoxStyle('#E0E7FF', '#6366F1'), '1', '1', { x: 80, y: 710, width: 1640, height: 280 });
  d.addCell('s5_1', '1. Automated Static Code Audits:\n   Scanned 56 files across Web, Mobile & Backend; eliminated all missing imports & broken hooks', itemStyle(), s5, '1', { x: 40, y: 55, width: 500, height: 50 });
  d.addCell('s5_2', '2. End-to-End Integration Testing:\n   Simulated full disaster cycles: Registration -> Verification -> Allocation -> QR Scan -> Recovery', itemStyle(), s5, '1', { x: 40, y: 115, width: 500, height: 50 });
  d.addCell('s5_3', '3. Production Database Migration:\n   Configured MongoDB Atlas Cluster with automatic TTL indexing and daily snapshot backups', itemStyle(), s5, '1', { x: 40, y: 175, width: 500, height: 50 });

  d.addCell('s5_4', '4. Immutable Audit Logs & PDF Exporter:\n   Comprehensive system audit logger with printable Mayor/LGU disaster summary reports', itemStyle(), s5, '1', { x: 570, y: 55, width: 500, height: 50 });
  d.addCell('s5_5', '5. Security & RBAC Boundary Validation:\n   Verified exact permissions for SuperAdmin, Admin, Official, Field Staff, and Resident', itemStyle(), s5, '1', { x: 570, y: 115, width: 500, height: 50 });
  d.addCell('s5_6', '6. Cross-Platform UI Polish & Localization:\n   Bilingual support (English / Tagalog), Light/Dark themes, responsive mobile viewports', itemStyle(), s5, '1', { x: 570, y: 175, width: 500, height: 50 });

  d.addCell('s5_7', 'FINAL PRODUCTION DELIVERABLE:\n100% Deployment-Ready, Zero-Demo-Artifact MitigatePlus Post-Disaster Recovery Ecosystem\n(Live Backend on Port 5000, Vite Web Admin on Port 3000, Expo Mobile App on Port 8081)', itemStyle('#DCFCE7', '#16A34A'), s5, '1', { x: 1100, y: 55, width: 500, height: 170 });

  // Agile Ceremonies Footer
  d.addCell('cer_box', 'RECURRING AGILE CEREMONIES THROUGHOUT ALL SPRINTS:\n• Daily Standups (15 mins): Yesterday\'s progress, Today\'s goals, Blockers\n• Sprint Planning (Day 1 of Sprint): User story estimation & backlog commitment\n• Sprint Review & Demo (Final day): Live feature walkthrough with stakeholders\n• Sprint Retrospective: Code quality reflection, technical debt remediation, and workflow optimization', 'rounded=1;whiteSpace=wrap;html=1;fillColor=#F8FAFC;strokeColor=#CBD5E1;fontColor=#334155;fontSize=12;align=left;spacingLeft=16;', '1', '1', { x: 80, y: 1020, width: 1640, height: 90 });

  // Arrows between Sprints
  d.addEdge('es0', 'Sprint 1 Commitment', edgeStyle, 's0', 's1');
  d.addEdge('es1', 'Sprint 2 Commitment', edgeStyle, 's1', 's2');
  d.addEdge('es2', 'Sprint 3 Commitment', edgeStyle, 's2', 's3');
  d.addEdge('es3', 'Sprint 4 Commitment', edgeStyle, 's3', 's4');
  d.addEdge('es4', 'System Hardening & Release', edgeStyle, 's4', 's5');

  return d.toXml();
}

// ─────────────────────────────────────────────────────────────────────────────
// 3. FUNCTIONAL DECOMPOSITION DIAGRAM (FDD)
// ─────────────────────────────────────────────────────────────────────────────
function buildFDD() {
  const d = new DrawIOBuilder('Functional Decomposition Diagram (FDD)', 2200, 1500);

  const headerStyle = "text;html=1;strokeColor=none;fillColor=none;align=center;verticalAlign=middle;whiteSpace=wrap;rounded=0;fontSize=22;fontStyle=1;fontColor=#0B2E59;";
  const subHeaderStyle = "text;html=1;strokeColor=none;fillColor=none;align=center;verticalAlign=middle;whiteSpace=wrap;rounded=0;fontSize=13;fontColor=#475569;";
  const rootStyle = "rounded=1;whiteSpace=wrap;html=1;fillColor=#0B2E59;strokeColor=#0B2E59;fontColor=#FFFFFF;fontSize=16;fontStyle=1;shadow=1;arcSize=10;";
  const tierStyle = (fill, stroke, font = '#0F172A') => `rounded=1;whiteSpace=wrap;html=1;fillColor=${fill};strokeColor=${stroke};fontColor=${font};fontSize=13;fontStyle=1;shadow=1;arcSize=8;`;
  const subModuleStyle = (fill, stroke) => `rounded=1;whiteSpace=wrap;html=1;fillColor=${fill};strokeColor=${stroke};fontColor=#1E293B;fontSize=11;fontStyle=1;align=center;shadow=0;arcSize=6;`;
  const actionStyle = "rounded=1;whiteSpace=wrap;html=1;fillColor=#FFFFFF;strokeColor=#E2E8F0;fontColor=#475569;fontSize=10;align=left;spacingLeft=6;";
  const edgeStyle = "edgeStyle=orthogonalEdgeStyle;rounded=1;orthogonalLoop=1;jettySize=auto;html=1;strokeColor=#1557B0;strokeWidth=1.5;";

  // Title
  d.addCell('ft1', 'MITIGATEPLUS: FUNCTIONAL DECOMPOSITION DIAGRAM (FDD)', headerStyle, '1', '1', { x: 550, y: 25, width: 1100, height: 35 });
  d.addCell('ft2', 'Hierarchical Functional Breakdown by User Roles, Portals, and Subsystem Capabilities', subHeaderStyle, '1', '1', { x: 550, y: 60, width: 1100, height: 25 });

  // Root System Node
  const root = d.addCell('root', 'MITIGATEPLUS DISASTER RECOVERY ECOSYSTEM\n(Manila City Post-Disaster Relief & Beneficiary Management Platform)', rootStyle, '1', '1', { x: 750, y: 100, width: 700, height: 60 });

  // 5 Major Role Branches
  // 1. LGU SuperAdmin
  const r1 = d.addCell('r1', '1.0 LGU SUPERADMIN PORTAL\n(Executive Policy & Governance)', tierStyle('#DBEAFE', '#2563EB'), '1', '1', { x: 60, y: 200, width: 380, height: 50 });
  d.addEdge('er1', '', edgeStyle, 'root', 'r1');

  // SuperAdmin Submodules
  d.addCell('r1_1', '1.1 Global Policy Engine (/global-policy)', subModuleStyle('#EFF6FF', '#3B82F6'), '1', '1', { x: 60, y: 270, width: 380, height: 30 });
  d.addCell('r1_1_a', '• Configure Base Coverage Pax (Default: 5)\n• Tune Extra Member Multipliers (+0.5x)\n• Tune Senior / PWD / Pregnant Bonuses\n• Security Passcode Authorization Protocol', actionStyle, '1', '1', { x: 60, y: 305, width: 380, height: 65 });

  d.addCell('r1_2', '1.2 Account Management (/provision-accounts)', subModuleStyle('#EFF6FF', '#3B82F6'), '1', '1', { x: 60, y: 380, width: 380, height: 30 });
  d.addCell('r1_2_a', '• Provision LGU Admin Accounts\n• Provision Barangay Official Accounts\n• Instant Account Suspension / Reactivation\n• Permanent Account Revocation & Deletion', actionStyle, '1', '1', { x: 60, y: 415, width: 380, height: 65 });

  d.addCell('r1_3', '1.3 System Audit & Executive Reports (/reports)', subModuleStyle('#EFF6FF', '#3B82F6'), '1', '1', { x: 60, y: 490, width: 380, height: 30 });
  d.addCell('r1_3_a', '• Printable PDF Executive Disaster Report\n• CSV Export for Blocked Fraud Attempts\n• City-Wide Relief Gap Matrix Exporter\n• Immutable System Audit Log Trail', actionStyle, '1', '1', { x: 60, y: 525, width: 380, height: 65 });

  // 2. LGU Admin
  const r2 = d.addCell('r2', '2.0 LGU ADMIN PORTAL\n(Operations Command & Logistics)', tierStyle('#FEF3C7', '#D97706'), '1', '1', { x: 480, y: 200, width: 390, height: 50 });
  d.addEdge('er2', '', edgeStyle, 'root', 'r2');

  // LGU Admin Submodules
  d.addCell('r2_1', '2.1 Manila GIS Risk Heatmap (/heatmap)', subModuleStyle('#FFFBEB', '#F59E0B'), '1', '1', { x: 480, y: 270, width: 390, height: 30 });
  d.addCell('r2_1_a', '• Interactive TopoJSON GIS (897 Barangays)\n• Centroid Number Micro-Badging\n• Color-Coded Damage Pins (Critical to Minor)\n• Beneficiary Directory & Scheduling Deep-Link', actionStyle, '1', '1', { x: 480, y: 305, width: 390, height: 65 });

  d.addCell('r2_2', '2.2 Central Warehouse Inventory (/warehouse-inventory)', subModuleStyle('#FFFBEB', '#F59E0B'), '1', '1', { x: 480, y: 380, width: 390, height: 30 });
  d.addCell('r2_2_a', '• Real-Time Stock Capacity Bars (7 Categories)\n• Low Stock Threshold Alerts & Reorder Tracking\n• Restock (+) & Outgoing Dispatch (-) Logging\n• Audit History with Relational Performer Populates', actionStyle, '1', '1', { x: 480, y: 415, width: 390, height: 65 });

  d.addCell('r2_3', '2.3 Distribution Events (/distribution-events)', subModuleStyle('#FFFBEB', '#F59E0B'), '1', '1', { x: 480, y: 490, width: 390, height: 30 });
  d.addCell('r2_3_a', '• Create & Schedule Relief Drive Batches\n• Heatmap Auto-Prefill Navigation\n• Lifecycle: Scheduled -> Ongoing -> Completed\n• Broadcast Announcement & Deduct Target Stock', actionStyle, '1', '1', { x: 480, y: 525, width: 390, height: 65 });

  d.addCell('r2_4', '2.4 Real-Time Fraud Interception (/fraud-interception)', subModuleStyle('#FEE2E2', '#EF4444'), '1', '1', { x: 480, y: 600, width: 390, height: 30 });
  d.addCell('r2_4_a', '• Live WebSocket Stream of Blocked Scans\n• Severity KPI Breakdown (High / Med / Low)\n• QR Identifier & Staff Location Tracking\n• Searchable Fraud Incident History', actionStyle, '1', '1', { x: 480, y: 635, width: 390, height: 65 });

  // 3. Barangay Official
  const r3 = d.addCell('r3', '3.0 BARANGAY OFFICIAL PORTAL\n(Local Verification & Recovery)', tierStyle('#DCFCE7', '#16A34A'), '1', '1', { x: 910, y: 200, width: 390, height: 50 });
  d.addEdge('er3', '', edgeStyle, 'root', 'r3');

  // Barangay Official Submodules
  d.addCell('r3_1', '3.1 Resident Verification Queue (/verification-queue)', subModuleStyle('#F0FDF4', '#22C55E'), '1', '1', { x: 910, y: 270, width: 390, height: 30 });
  d.addCell('r3_1_a', '• Live WebSocket Queue Updates\n• Automated Address Overlap & Fraud Warning\n• Family Roster & Vulnerability Tag Review\n• Actions: Approve (Verified) / Needs Info / Reject', actionStyle, '1', '1', { x: 910, y: 305, width: 390, height: 65 });

  d.addCell('r3_2', '3.2 5-Stage Recovery Tracker (/recovery-progress)', subModuleStyle('#F0FDF4', '#22C55E'), '1', '1', { x: 910, y: 380, width: 390, height: 30 });
  d.addCell('r3_2_a', '• 1. Waiting for Ayuda (Auto upon registration)\n• 2. Assistance Received (Auto upon QR scan)\n• 3. Ongoing Pagbangon (Barangay Rebuilding)\n• 4. Partially Recovered -> 5. Fully Recovered', actionStyle, '1', '1', { x: 910, y: 415, width: 390, height: 65 });

  d.addCell('r3_3', '3.3 Special Relief Requests (/special-request-relief)', subModuleStyle('#F0FDF4', '#22C55E'), '1', '1', { x: 910, y: 490, width: 390, height: 30 });
  d.addCell('r3_3_a', '• Create Requests for Bedridden / PWD / Elderly\n• Datalist Field Officer Assignment\n• Dispatch Task to Field Staff Mobile App\n• Track Door-to-Door Delivery Fulfillment', actionStyle, '1', '1', { x: 910, y: 525, width: 390, height: 65 });

  d.addCell('r3_4', '3.4 Civic Announcements (/announcements)', subModuleStyle('#F0FDF4', '#22C55E'), '1', '1', { x: 910, y: 600, width: 390, height: 30 });
  d.addCell('r3_4_a', '• Broadcast Localized & City-Wide Notices\n• Attach Citizen Mobile Deep-Link Actions:\n  [Request Relief, Report Damage, View Claims]\n• Edit & Delete Announcements with Audit Tag', actionStyle, '1', '1', { x: 910, y: 635, width: 390, height: 65 });

  // 4. Field Staff Mobile App
  const r4 = d.addCell('r4', '4.0 FIELD STAFF MOBILE APP\n(On-Ground Distribution & Scanner)', tierStyle('#FEE2E2', '#EF4444'), '1', '1', { x: 1340, y: 200, width: 380, height: 50 });
  d.addEdge('er4', '', edgeStyle, 'root', 'r4');

  // Field Staff Submodules
  d.addCell('r4_1', '4.1 QR Beneficiary Scanner (StaffScannerScreen)', subModuleStyle('#FEF2F2', '#DC2626'), '1', '1', { x: 1340, y: 270, width: 380, height: 30 });
  d.addCell('r4_1_a', '• Camera Viewfinder & Manual Alphanumeric Entry\n• Instant Verification & Priority Level Display\n• Right-Sized Pack Calculation (Base + Top-Ups)\n• 1-Tap "Confirm Relief Release" Button', actionStyle, '1', '1', { x: 1340, y: 305, width: 380, height: 65 });

  d.addCell('r4_2', '4.2 Anti-Duplicate Blocker & Interceptor', subModuleStyle('#FEF2F2', '#DC2626'), '1', '1', { x: 1340, y: 380, width: 380, height: 30 });
  d.addCell('r4_2_a', '• Real-Time Duplicate Claim Detection (HTTP 409)\n• Visual Red Alert Blocker Banner on Device\n• Immediate Broadcast to LGU Command Center\n• Logs Attempt to Immutable Audit Trail', actionStyle, '1', '1', { x: 1340, y: 415, width: 380, height: 65 });

  d.addCell('r4_3', '4.3 Field Tasks & Special Delivery Assignment', subModuleStyle('#FEF2F2', '#DC2626'), '1', '1', { x: 1340, y: 490, width: 380, height: 30 });
  d.addCell('r4_3_a', '• Ongoing vs Completed Distribution Drives\n• Drive Progress Metric Bars & Target Counts\n• Door-to-Door Delivery Task Roster\n• 1-Tap "Mark as Delivered & Fulfilled" Button', actionStyle, '1', '1', { x: 1340, y: 525, width: 380, height: 65 });

  d.addCell('r4_4', '4.4 On-Ground Incident Logger', subModuleStyle('#FEF2F2', '#DC2626'), '1', '1', { x: 1340, y: 600, width: 380, height: 30 });
  d.addCell('r4_4_a', '• 5 Categories (Shortage, Lost QR, Evacuation)\n• Barangay Scoped Notes & Action Taken Field\n• Instant Alert Dispatch to Command Center', actionStyle, '1', '1', { x: 1340, y: 635, width: 380, height: 65 });

  // 5. Resident Citizen Mobile App
  const r5 = d.addCell('r5', '5.0 RESIDENT CITIZEN MOBILE APP\n(Beneficiary Pass & Assistance)', tierStyle('#E0E7FF', '#6366F1'), '1', '1', { x: 1760, y: 200, width: 380, height: 50 });
  d.addEdge('er5', '', edgeStyle, 'root', 'r5');

  // Resident Submodules
  d.addCell('r5_1', '5.1 Singpass-Style Digital QR Pass (ResidentHomeScreen)', subModuleStyle('#EEF2FF', '#4F46E5'), '1', '1', { x: 1760, y: 270, width: 380, height: 30 });
  d.addCell('r5_1_a', '• Live Encrypted QR Pass & Verified Seal\n• Real-Time Headcount & Priority Score Points\n• Full-Screen Modal with "Save to Gallery"\n• Offline Cache Buffer for Disconnected Areas', actionStyle, '1', '1', { x: 1760, y: 305, width: 380, height: 65 });

  d.addCell('r5_2', '5.2 House Damage Reporting (ReportDamageScreen)', subModuleStyle('#EEF2FF', '#4F46E5'), '1', '1', { x: 1760, y: 380, width: 380, height: 30 });
  d.addCell('r5_2_a', '• 4-Level Severity Grid (Minor to Total)\n• Camera Capture & Gallery Evidence Upload\n• Landmark Geotagging & Description Input\n• Auto-Recalculates Household Priority Index', actionStyle, '1', '1', { x: 1760, y: 415, width: 380, height: 65 });

  d.addCell('r5_3', '5.3 Relief Quota Request & Timeline (ClaimsHistory)', subModuleStyle('#EEF2FF', '#4F46E5'), '1', '1', { x: 1760, y: 490, width: 380, height: 30 });
  d.addCell('r5_3_a', '• 5-Item Relief Catalog Selection\n• Automated Right-Sized Quota Allocation Notice\n• Specific Vulnerability / Medical Notes\n• Verified Historical Claims Timeline Log', actionStyle, '1', '1', { x: 1760, y: 525, width: 380, height: 65 });

  d.addCell('r5_4', '5.4 Household Roster & Recovery Stepper (Settings)', subModuleStyle('#EEF2FF', '#4F46E5'), '1', '1', { x: 1760, y: 600, width: 380, height: 30 });
  d.addCell('r5_4_a', '• Family Roster Manager (Add/Remove Members)\n• Quick Vulnerability Toggles (PWD, Senior, etc.)\n• 5-Stage Recovery Stepper Progress Tracker\n• 1-Tap Emergency Hotlines (MDRRMO, Police)', actionStyle, '1', '1', { x: 1760, y: 635, width: 380, height: 65 });

  return d.toXml();
}

// ─────────────────────────────────────────────────────────────────────────────
// 4. PROCESS FLOW DIAGRAMS MASTER
// ─────────────────────────────────────────────────────────────────────────────
function buildProcessFlows() {
  const d = new DrawIOBuilder('Core Process Flowcharts', 2000, 1800);

  const headerStyle = "text;html=1;strokeColor=none;fillColor=none;align=center;verticalAlign=middle;whiteSpace=wrap;rounded=0;fontSize=22;fontStyle=1;fontColor=#0B2E59;";
  const subHeaderStyle = "text;html=1;strokeColor=none;fillColor=none;align=center;verticalAlign=middle;whiteSpace=wrap;rounded=0;fontSize=13;fontColor=#475569;";
  const containerStyle = (fill, stroke) => `swimlane;startSize=35;html=1;fillColor=${fill};strokeColor=${stroke};fontStyle=1;fontSize=14;fontColor=#0F172A;rounded=1;arcSize=6;shadow=1;`;
  const stepStyle = (fill = '#FFFFFF', stroke = '#CBD5E1') => `rounded=1;whiteSpace=wrap;html=1;fillColor=${fill};strokeColor=${stroke};fontColor=#1E293B;fontSize=11;fontStyle=1;align=center;shadow=0;arcSize=6;`;
  const decisionStyle = (fill = '#FEF3C7', stroke = '#D97706') => `rhombus;whiteSpace=wrap;html=1;fillColor=${fill};strokeColor=${stroke};fontColor=#92400E;fontSize=10;fontStyle=1;align=center;shadow=0;`;
  const edgeStyle = "edgeStyle=orthogonalEdgeStyle;rounded=1;orthogonalLoop=1;jettySize=auto;html=1;strokeColor=#1557B0;strokeWidth=2;fontSize=10;fontColor=#1E293B;";
  const alertEdgeStyle = "edgeStyle=orthogonalEdgeStyle;rounded=1;orthogonalLoop=1;jettySize=auto;html=1;strokeColor=#DC2626;strokeWidth=2;dashed=1;fontSize=10;fontColor=#991B1B;";
  const successEdgeStyle = "edgeStyle=orthogonalEdgeStyle;rounded=1;orthogonalLoop=1;jettySize=auto;html=1;strokeColor=#16A34A;strokeWidth=2;fontSize=10;fontColor=#166534;";

  // Title
  d.addCell('pft1', 'MITIGATEPLUS: CORE END-TO-END PROCESS FLOW DIAGRAMS', headerStyle, '1', '1', { x: 450, y: 25, width: 1100, height: 35 });
  d.addCell('pft2', 'Algorithmic Decision Logic, Verification Lifecycles, and Real-Time Event Flows', subHeaderStyle, '1', '1', { x: 450, y: 60, width: 1100, height: 25 });

  // ── FLOW 1: CITIZEN REGISTRATION & BARANGAY VERIFICATION ──
  const f1 = d.addCell('f1', 'FLOW 1: CITIZEN REGISTRATION, OVERLAP DETECTION & VERIFICATION LIFECYCLE', containerStyle('#EFF6FF', '#2563EB'), '1', '1', { x: 50, y: 100, width: 1900, height: 300 });

  d.addCell('p1_1', '1. Citizen Enters Mobile App\n(Fills 2-Step Registration Wizard)', stepStyle('#DBEAFE', '#3B82F6'), f1, '1', { x: 30, y: 60, width: 180, height: 60 });
  d.addCell('p1_2', '2. OTP Verification\n(Semaphore SMS or Gmail SMTP)', stepStyle('#DBEAFE', '#3B82F6'), f1, '1', { x: 250, y: 60, width: 180, height: 60 });
  d.addCell('p1_3', '3. Overlap Check Engine\n(Matches Address / Headcount)', decisionStyle(), f1, '1', { x: 470, y: 55, width: 160, height: 70 });

  d.addCell('p1_4a', '4A. New Household Pass\n(Generates QR + Initial Priority Score)', stepStyle('#DCFCE7', '#16A34A'), f1, '1', { x: 670, y: 40, width: 200, height: 50 });
  d.addCell('p1_4b', '4B. Flag Address Overlap\n(Mark `join_existing` workflow)', stepStyle('#FEE2E2', '#EF4444'), f1, '1', { x: 670, y: 110, width: 200, height: 50 });

  d.addCell('p1_5', '5. WebSocket Push\n(`new_pending_registration`\nto Barangay Room)', stepStyle('#FEF3C7', '#D97706'), f1, '1', { x: 910, y: 60, width: 180, height: 60 });
  d.addCell('p1_6', '6. Barangay Official Review\n(Inspects Roster, ID, Overlap)', stepStyle('#F0FDF4', '#22C55E'), f1, '1', { x: 1130, y: 60, width: 180, height: 60 });
  d.addCell('p1_7', '7. Verification Decision?', decisionStyle(), f1, '1', { x: 1350, y: 55, width: 150, height: 70 });

  d.addCell('p1_8a', 'APPROVED: Status = `verified`\n• Recalculate Priority Index\n• Emit `verification_updated`\n• Activates Singpass QR Relief Pass', stepStyle('#DCFCE7', '#16A34A'), f1, '1', { x: 1550, y: 40, width: 220, height: 60 });
  d.addCell('p1_8b', 'REJECT / NEEDS INFO:\n• Emit Audit Note\n• Notify Citizen on Mobile', stepStyle('#FEE2E2', '#EF4444'), f1, '1', { x: 1550, y: 120, width: 220, height: 50 });

  d.addEdge('ep1_1', '', edgeStyle, 'p1_1', 'p1_2');
  d.addEdge('ep1_2', '', edgeStyle, 'p1_2', 'p1_3');
  d.addEdge('ep1_3a', 'No Overlap', successEdgeStyle, 'p1_3', 'p1_4a');
  d.addEdge('ep1_3b', 'Address Exists', alertEdgeStyle, 'p1_3', 'p1_4b');
  d.addEdge('ep1_4a', '', edgeStyle, 'p1_4a', 'p1_5');
  d.addEdge('ep1_4b', '', edgeStyle, 'p1_4b', 'p1_5');
  d.addEdge('ep1_5', '', edgeStyle, 'p1_5', 'p1_6');
  d.addEdge('ep1_6', '', edgeStyle, 'p1_6', 'p1_7');
  d.addEdge('ep1_7a', 'Approve', successEdgeStyle, 'p1_7', 'p1_8a');
  d.addEdge('ep1_7b', 'Reject/Info', alertEdgeStyle, 'p1_7', 'p1_8b');

  // ── FLOW 2: ON-GROUND QR SCANNING & REAL-TIME ANTI-DUPLICATE ENGINE ──
  const f2 = d.addCell('f2', 'FLOW 2: ON-GROUND QR SCANNING & REAL-TIME ANTI-DUPLICATE CLAIM ENFORCEMENT ENGINE', containerStyle('#FEF2F2', '#EF4444'), '1', '1', { x: 50, y: 430, width: 1900, height: 350 });

  d.addCell('p2_1', '1. Field Staff Launches\nStaffScannerScreen & Selects Event', stepStyle('#FEE2E2', '#EF4444'), f2, '1', { x: 30, y: 70, width: 190, height: 60 });
  d.addCell('p2_2', '2. Scans Beneficiary QR Pass\n(or Manual Alphanumeric Entry)', stepStyle('#FEE2E2', '#EF4444'), f2, '1', { x: 260, y: 70, width: 190, height: 60 });
  d.addCell('p2_3', '3. Backend Atomic Check\n(`Distribution.findOne` with\n{ distributionEventId, householdId })', decisionStyle(), f2, '1', { x: 490, y: 65, width: 180, height: 75 });

  // Duplicate Path
  d.addCell('p2_dup', 'DUPLICATE CLAIM DETECTED (HTTP 409 Conflict)\n• Red Alert Banner on Staff Mobile Viewfinder\n• Dispatches `duplicate_claim_alert` to Socket.IO `admin_room`\n• Prepend incident to Web-Admin Fraud Interception Queue\n• Writes to Immutable System Audit Trail (BLOCKED)', stepStyle('#FEE2E2', '#DC2626'), f2, '1', { x: 720, y: 160, width: 380, height: 90 });

  // Valid Path
  d.addCell('p2_val', '4. Valid Pass: Load Profile\n• Priority Score & Damage Level\n• Vulnerability Breakdown (Seniors, PWD)', stepStyle('#DCFCE7', '#16A34A'), f2, '1', { x: 720, y: 50, width: 250, height: 60 });
  d.addCell('p2_5', '5. Right-Sized Math Engine\nBasePacks = max(1, floor(n / 5))\nTopUpUnits = max(0, n - (Base * 5))', stepStyle('#FEF3C7', '#D97706'), f2, '1', { x: 1010, y: 50, width: 230, height: 60 });
  d.addCell('p2_6', '6. Staff Confirms Release\n(Writes Distribution Record with\nAtomic Compound Index Lock)', stepStyle('#DBEAFE', '#2563EB'), f2, '1', { x: 1280, y: 50, width: 220, height: 60 });
  d.addCell('p2_7', '7. State Mutation & Sockets\n• Updates RecoveryStatus -> `assistance_received`\n• Decrements Warehouse Stock Count\n• Emits `assistance_released` to Citizen\n• Updates Event Scanned Metric Counter', stepStyle('#DCFCE7', '#16A34A'), f2, '1', { x: 1540, y: 40, width: 250, height: 80 });

  d.addEdge('ep2_1', '', edgeStyle, 'p2_1', 'p2_2');
  d.addEdge('ep2_2', '', edgeStyle, 'p2_2', 'p2_3');
  d.addEdge('ep2_3a', 'Already Claimed', alertEdgeStyle, 'p2_3', 'p2_dup');
  d.addEdge('ep2_3b', 'First Valid Claim', successEdgeStyle, 'p2_3', 'p2_val');
  d.addEdge('ep2_val', '', edgeStyle, 'p2_val', 'p2_5');
  d.addEdge('ep2_5', '', edgeStyle, 'p2_5', 'p2_6');
  d.addEdge('ep2_6', '', edgeStyle, 'p2_6', 'p2_7');

  // ── FLOW 3: RELIEF EVENT SCHEDULING, WAREHOUSE INVENTORY SYNC & DISTRIBUTION ──
  const f3 = d.addCell('f3', 'FLOW 3: RELIEF EVENT SCHEDULING, CENTRAL WAREHOUSE STOCK DISPATCH & RECOVERY TRACKING', containerStyle('#FFFBEB', '#D97706'), '1', '1', { x: 50, y: 810, width: 1900, height: 320 });

  d.addCell('p3_1', '1. LGU Admin Identifies Need\n(Via Heatmap or Risk Metrics)', stepStyle('#FEF3C7', '#D97706'), f3, '1', { x: 30, y: 65, width: 190, height: 60 });
  d.addCell('p3_2', '2. Schedule Distribution Event\n(Barangay, Venue, Target Households)', stepStyle('#FEF3C7', '#D97706'), f3, '1', { x: 260, y: 65, width: 210, height: 60 });
  d.addCell('p3_3', '3. Stock Sufficiency Check\n(Warehouse Inventory API)', decisionStyle(), f3, '1', { x: 510, y: 60, width: 170, height: 70 });

  d.addCell('p3_low', 'INSUFFICIENT STOCK:\n• Low Stock Warning Alert Triggered\n• SuperAdmin / LGU Restock Action (+)', stepStyle('#FEE2E2', '#EF4444'), f3, '1', { x: 510, y: 160, width: 200, height: 55 });

  d.addCell('p3_4', '4. Dispatch Stock from Warehouse\n(Records WarehouseLog Movement)', stepStyle('#DBEAFE', '#2563EB'), f3, '1', { x: 730, y: 65, width: 220, height: 60 });
  d.addCell('p3_5', '5. Broadcast Civic Announcement\n(Emits `new_announcement` to Barangay\nwith Deep-Link Action Button)', stepStyle('#DCFCE7', '#16A34A'), f3, '1', { x: 990, y: 65, width: 240, height: 60 });
  d.addCell('p3_6', '6. Field Execution\n(Staff Performs On-Site Distribution\n& QR Scans via Mobile App)', stepStyle('#FEE2E2', '#EF4444'), f3, '1', { x: 1270, y: 65, width: 220, height: 60 });
  d.addCell('p3_7', '7. Close Event & Audit\n• Status -> `Completed`\n• Generate Disaster Recovery Audit PDF\n• Progress 5-Stage Stepper to `Recovered`', stepStyle('#DCFCE7', '#16A34A'), f3, '1', { x: 1530, y: 55, width: 250, height: 80 });

  d.addEdge('ep3_1', '', edgeStyle, 'p3_1', 'p3_2');
  d.addEdge('ep3_2', '', edgeStyle, 'p3_2', 'p3_3');
  d.addEdge('ep3_3a', 'Stock Low', alertEdgeStyle, 'p3_3', 'p3_low');
  d.addEdge('ep3_3b', 'Stock OK', successEdgeStyle, 'p3_3', 'p3_4');
  d.addEdge('ep3_4', '', edgeStyle, 'p3_4', 'p3_5');
  d.addEdge('ep3_5', '', edgeStyle, 'p3_5', 'p3_6');
  d.addEdge('ep3_6', '', edgeStyle, 'p3_6', 'p3_7');

  // ── FLOW 4: SPECIAL RELIEF DOOR-TO-DOOR REQUEST & ASSIGNMENT ──
  const f4 = d.addCell('f4', 'FLOW 4: SPECIAL RELIEF REQUEST & DOOR-TO-DOOR FULFILLMENT LIFECYCLE (BEDRIDDEN / PWD / ELDERLY)', containerStyle('#F0FDF4', '#16A34A'), '1', '1', { x: 50, y: 1160, width: 1900, height: 280 });

  d.addCell('p4_1', '1. Barangay Official or Citizen\nSubmits Special Request (No phone / PWD)', stepStyle('#DCFCE7', '#16A34A'), f4, '1', { x: 30, y: 60, width: 220, height: 60 });
  d.addCell('p4_2', '2. LGU Admin Review & Assignment\n(Selects Field Staff via Datalist)', stepStyle('#DBEAFE', '#2563EB'), f4, '1', { x: 290, y: 60, width: 220, height: 60 });
  d.addCell('p4_3', '3. Dispatches Task to Staff Mobile App\n(`SpecialRequestAssignmentScreen`)', stepStyle('#FEF3C7', '#D97706'), f4, '1', { x: 550, y: 60, width: 230, height: 60 });
  d.addCell('p4_4', '4. Field Officer Delivers to Home\n(Brings right-sized food/medical kits)', stepStyle('#FEE2E2', '#EF4444'), f4, '1', { x: 820, y: 60, width: 230, height: 60 });
  d.addCell('p4_5', '5. Officer Taps "Mark as Delivered"\n(PATCH `/api/assistance-requests/:id`)', stepStyle('#DBEAFE', '#2563EB'), f4, '1', { x: 1090, y: 60, width: 230, height: 60 });
  d.addCell('p4_6', '6. Status Updated to `received`\n• Updates Beneficiary Recovery Stepper\n• Deducts Fulfilled Gap from Gap Matrix\n• System Logs Immutable Fulfillment Audit', stepStyle('#DCFCE7', '#16A34A'), f4, '1', { x: 1360, y: 50, width: 250, height: 80 });

  d.addEdge('ep4_1', '', edgeStyle, 'p4_1', 'p4_2');
  d.addEdge('ep4_2', '', edgeStyle, 'p4_2', 'p4_3');
  d.addEdge('ep4_3', '', edgeStyle, 'p4_3', 'p4_4');
  d.addEdge('ep4_4', '', edgeStyle, 'p4_4', 'p4_5');
  d.addEdge('ep4_5', '', edgeStyle, 'p4_5', 'p4_6');

  return d.toXml();
}

// ─────────────────────────────────────────────────────────────────────────────
// 5. MASTER MULTI-TAB DRAW.IO FILE GENERATOR
// ─────────────────────────────────────────────────────────────────────────────
function buildMasterFile() {
  const arch = buildSystemArchitecture();
  const agile = buildAgileMethodology();
  const fdd = buildFDD();
  const flows = buildProcessFlows();

  return `<mxfile host="app.diagrams.net" modified="2026-08-18T16:00:00.000Z" agent="Antigravity" version="24.0.0" type="device">
  ${arch}
  ${agile}
  ${fdd}
  ${flows}
</mxfile>`;
}

// Write all files
const outDir = path.resolve('C:/Capstone Final Project/docs/diagrams');

const masterXml = buildMasterFile();
fs.writeFileSync(path.join(outDir, 'mitigateplus_master_diagrams.drawio'), masterXml);
console.log('Saved mitigateplus_master_diagrams.drawio');

fs.writeFileSync(path.join(outDir, 'system_architecture_3tier.drawio'), `<mxfile host="app.diagrams.net">${buildSystemArchitecture()}</mxfile>`);
console.log('Saved system_architecture_3tier.drawio');

fs.writeFileSync(path.join(outDir, 'development_methodology_agile.drawio'), `<mxfile host="app.diagrams.net">${buildAgileMethodology()}</mxfile>`);
console.log('Saved development_methodology_agile.drawio');

fs.writeFileSync(path.join(outDir, 'functional_decomposition_fdd.drawio'), `<mxfile host="app.diagrams.net">${buildFDD()}</mxfile>`);
console.log('Saved functional_decomposition_fdd.drawio');

fs.writeFileSync(path.join(outDir, 'process_flows_master.drawio'), `<mxfile host="app.diagrams.net">${buildProcessFlows()}</mxfile>`);
console.log('Saved process_flows_master.drawio');

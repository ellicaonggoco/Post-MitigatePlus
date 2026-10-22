const fs = require('fs');

function escapeXml(text) {
  if (!text) return '';
  return String(text)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

function makeHumanBanner(panelistName, panelistRole, recommendationTitle) {
  return `
<w:p>
  <w:pPr>
    <w:pBdr>
      <w:top w:val="single" w:sz="12" w:space="6" w:color="1C3F94"/>
      <w:left w:val="single" w:sz="36" w:space="12" w:color="1C3F94"/>
      <w:bottom w:val="single" w:sz="12" w:space="6" w:color="1C3F94"/>
      <w:right w:val="single" w:sz="12" w:space="6" w:color="1C3F94"/>
    </w:pBdr>
    <w:shd w:val="clear" w:color="auto" w:fill="F4F6F9"/>
    <w:spacing w:before="240" w:after="80" w:line="360" w:lineRule="auto"/>
  </w:pPr>
  <w:r>
    <w:rPr>
      <w:b w:val="1"/>
      <w:bCs w:val="1"/>
      <w:color w:val="1C3F94"/>
      <w:sz w:val="22"/>
      <w:szCs w:val="22"/>
    </w:rPr>
    <w:t xml:space="preserve">Compliance: ${escapeXml(panelistName)} (${escapeXml(panelistRole)})</w:t>
  </w:r>
  <w:r>
    <w:rPr>
      <w:br w:type="textWrapping"/>
      <w:i w:val="1"/>
      <w:iCs w:val="1"/>
      <w:color w:val="333333"/>
      <w:sz w:val="20"/>
      <w:szCs w:val="20"/>
    </w:rPr>
    <w:t xml:space="preserve">Action Taken for Recommendation: ${escapeXml(recommendationTitle)}</w:t>
  </w:r>
</w:p>`;
}

function makePara(text, opts = {}) {
  const bTag = opts.bold ? '<w:b w:val="1"/><w:bCs w:val="1"/>' : '';
  const iTag = opts.italic ? '<w:i w:val="1"/><w:iCs w:val="1"/>' : '';
  const indTag = opts.indent ? '<w:ind w:firstLine="720"/>' : '';
  const spBef = opts.before ? `w:before="${opts.before}"` : '';
  const spAft = `w:after="${opts.after || '120'}"`;
  return `
<w:p>
  <w:pPr>
    <w:spacing ${spBef} ${spAft} w:line="480" w:lineRule="auto"/>
    ${indTag}
    <w:jc w:val="${opts.align || 'both'}"/>
  </w:pPr>
  <w:r>
    <w:rPr>
      ${bTag}
      ${iTag}
      <w:sz w:val="24"/><w:szCs w:val="24"/>
    </w:rPr>
    <w:t xml:space="preserve">${escapeXml(text)}</w:t>
  </w:r>
</w:p>`;
}

function makeCleanTable(headers, rows, widths) {
  const totalW = widths.reduce((a, b) => a + b, 0);
  const gridCols = widths.map(w => `<w:gridCol w:w="${w}"/>`).join('');
  const hCells = headers.map((h, i) => `
    <w:tc>
      <w:tcPr>
        <w:tcW w:w="${widths[i]}" w:type="dxa"/>
        <w:shd w:val="clear" w:color="auto" w:fill="1C3F94"/>
        <w:tcMar><w:top w:w="120" w:type="dxa"/><w:bottom w:w="120" w:type="dxa"/><w:left w:w="120" w:type="dxa"/><w:right w:w="120" w:type="dxa"/></w:tcMar>
        <w:vAlign w:val="center"/>
      </w:tcPr>
      <w:p>
        <w:pPr><w:jc w:val="center"/><w:spacing w:line="260" w:lineRule="auto"/></w:pPr>
        <w:r><w:rPr><w:b w:val="1"/><w:bCs w:val="1"/><w:color w:val="FFFFFF"/><w:sz w:val="18"/><w:szCs w:val="18"/></w:rPr><w:t xml:space="preserve">${escapeXml(h)}</w:t></w:r>
      </w:p>
    </w:tc>`).join('');
  const hRow = `<w:tr><w:trPr><w:tblHeader/></w:trPr>${hCells}</w:tr>`;

  const dRows = rows.map((row, rIdx) => {
    const bg = rIdx % 2 === 1 ? 'F7FAFF' : 'FFFFFF';
    const cells = row.map((cellVal, cIdx) => `
      <w:tc>
        <w:tcPr>
          <w:tcW w:w="${widths[cIdx]}" w:type="dxa"/>
          <w:shd w:val="clear" w:color="auto" w:fill="${bg}"/>
          <w:tcMar><w:top w:w="80" w:type="dxa"/><w:bottom w:w="80" w:type="dxa"/><w:left w:w="120" w:type="dxa"/><w:right w:w="120" w:type="dxa"/></w:tcMar>
          <w:vAlign w:val="center"/>
        </w:tcPr>
        <w:p>
          <w:pPr><w:spacing w:line="260" w:lineRule="auto"/></w:pPr>
          <w:r><w:rPr><w:sz w:val="18"/><w:szCs w:val="18"/><w:color w:val="222222"/></w:rPr><w:t xml:space="preserve">${escapeXml(cellVal)}</w:t></w:r>
        </w:p>
      </w:tc>`).join('');
    return `<w:tr>${cells}</w:tr>`;
  }).join('');

  return `
<w:tbl>
  <w:tblPr>
    <w:tblW w:w="${totalW}" w:type="dxa"/>
    <w:jc w:val="center"/>
    <w:tblBorders>
      <w:top w:val="single" w:sz="6" w:space="0" w:color="1C3F94"/>
      <w:left w:val="single" w:sz="6" w:space="0" w:color="D0D7DE"/>
      <w:bottom w:val="single" w:sz="6" w:space="0" w:color="1C3F94"/>
      <w:right w:val="single" w:sz="6" w:space="0" w:color="D0D7DE"/>
      <w:insideH w:val="single" w:sz="4" w:space="0" w:color="E1E4E8"/>
      <w:insideV w:val="single" w:sz="4" w:space="0" w:color="E1E4E8"/>
    </w:tblBorders>
  </w:tblPr>
  <w:tblGrid>${gridCols}</w:tblGrid>
  ${hRow}
  ${dRows}
</w:tbl>`;
}

let xml = fs.readFileSync('C:/Users/ellic/AppData/Local/Temp/document_xml.txt', 'utf8');

// 1. SPECIFIC OBJECTIVES
const t1 = 'To accomplish this goal, the research team set five specific targets:</w:t></w:r></w:p>';
const b1 = makeHumanBanner('Dean Emeliza Yabut', 'Panel Chair', 'Formulation of Specific Objectives and Damage Triage Guidelines');
const p1 = makePara('In compliance with the revisions requested by Dean Emeliza Yabut, Specific Objectives 1 to 5 were updated as follows:\n1. Develop an automated resident profile and structural damage triage module to collect household demographics and verify disaster impact efficiently.\n2. Integrate standard four-level structural damage assessment criteria based on official NDRRMC and DPWH guidelines (Minor Damage, Moderate Damage, Severe Damage, and Total Destruction) with photo evidence requirements to support objective aid prioritization.\n3. Implement a web administration portal and mobile application for barangay officials and field workers to manage resident verification, monitor distribution events, and record relief releases straight from distribution sites.\n4. Implement an autonomous algorithmic entitlement engine that calculates base food pack allocations and modular supplemental nutrition packs according to verified household size and vulnerability factors.\n5. Evaluate the operational quality and concurrency resilience of the integrated system with community residents, barangay officials, and DRRM administrators using the ISO/IEC 25010 software quality evaluation framework.', { indent: true });
if (xml.includes(t1)) xml = xml.replace(t1, t1 + '\n' + b1 + '\n' + p1);

// 2. SCOPE
const t2 = 'download summary spreadsheets for city hall audits.</w:t></w:r><w:r w:rsidDel="00000000" w:rsidR="00000000" w:rsidRPr="00000000"><w:rPr><w:rtl w:val="0"/></w:rPr></w:r></w:p>';
const b2Yabut = makeHumanBanner('Dean Emeliza Yabut', 'Panel Chair', 'Provisional Verification and Relief Policy for Transient Residents under Six Months Residency');
const p2Yabut = makePara('Humanitarian Inclusion of Transient Residents (Under 6 Months Residency): In compliance with the recommendation of Dean Emeliza Yabut, the proponents established a provisional verification policy for transient residents. In coordination with the Manila Disaster Risk Reduction and Management Office (MDRRMO), families residing in the community for less than six months, such as temporary tenants or displaced evacuees, can register during a declared state of calamity using any government identification card or barangay certification. These households receive event-scoped relief passes valid only for the active distribution event, ensuring that displaced families receive emergency food aid while central database verification prevents duplicate claims across neighboring barangays.', { indent: true });

const b2AbadMob = makeHumanBanner('Prof. Lalaine P. Abad', 'Panel Member', 'Resident Mobility, Annual Demographic Audit, Inactivity Dormancy Policy, and Relocation Verification');
const p2AbadMob = makePara('Resident Inactivity, Annual Demographic Audit, and Relocation Protocol:\n1. Annual Demographic Reconciliation: In coordination with the Manila DRRMO and local barangay secretariats, resident records undergo an annual demographic audit against actual barangay census records to identify households that have moved or are no longer active.\n2. Three Consecutive Missed Events Dormancy Policy: When a registered household fails to participate or claim assistance across three consecutive major relief distribution drives over a six to twelve month timeframe, the system automatically flags the household status as Dormant and assigns its location status to No Barangay Listed. The account is retained in the database so that historical assistance logs remain intact.\n3. Barangay Relocation Workflow: When an unassigned or relocating resident moves to a new barangay (for example, moving from Barangay 291 to Barangay 344), the mobile application detects the unassigned status and opens the Barangay Relocation Portal. The resident submits the new street address and is required to upload a clear photo of an updated Barangay Clearance or Government ID. The application is routed directly to the verification queue of the new barangay official for approval before new relief passes can be issued.', { indent: true });

const b2AbadCfw = makeHumanBanner('Prof. Lalaine P. Abad', 'Panel Member', 'Cash-for-Work Operational Scope and Future Institutional Roadmap with DOLE TUPAD and DSWD ECT');
const p2AbadCfw = makePara('Operational Scope and Institutional Linkage for Cash-for-Work (CFW): In consultation with the Manila DRRMO and GIS units, the operational scope of disaster management authorities centers on disaster mitigation, structural damage triage, and biometric attendance logging. The MitigatePlus Cash-for-Work module serves as the frontline technical foundation, screening qualified participants by prioritizing households with Severe Damage or Total Destruction, and recording daily worker attendance through QR check-ins and check-outs.\nDirect cash wage disbursement is part of the City Government of Manila active institutional roadmap in partnership with national programs, specifically the Department of Labor and Employment (DOLE) TUPAD program and the Department of Social Welfare and Development (DSWD) Emergency Cash Transfer framework. Under this operational model, the tamper-evident digital attendance records produced by MitigatePlus provide the COA-compliant payroll basis for government agencies to release financial assistance directly to workers.', { indent: true });
if (xml.includes(t2)) xml = xml.replace(t2, t2 + '\n' + b2Yabut + '\n' + p2Yabut + '\n' + b2AbadMob + '\n' + p2AbadMob + '\n' + b2AbadCfw + '\n' + p2AbadCfw);

// 3. ALGORITHM 2
const t3 = 'ALGORITHM 2: Right-Sized Relief Allocation Calculation</w:t></w:r></w:p>';
const b3Algo = makeHumanBanner('Prof. Julie Anne Crystal', 'Panel Member', 'Mathematical Equations for Relief Allocation Algorithm and Sample Computations for 4, 5, 6, 10, and 11 Members');
const table31 = makeCleanTable(
  ['Household Headcount', 'Base Pack Formula (5 pax/pack)', 'Base Packs', 'Excess Formula', 'Top-Up Units', 'Total Entitlement Description'],
  [
    ['4 Members', 'max(1, floor(4 / 5)) = max(1, 0)', '1 Base Pack', 'max(0, 4 - (1 * 5)) = 0', '0 Top-Up Units', '1 Standard Family Food Pack (6kg)'],
    ['5 Members', 'max(1, floor(5 / 5)) = max(1, 1)', '1 Base Pack', 'max(0, 5 - (1 * 5)) = 0', '0 Top-Up Units', '1 Standard Family Food Pack (6kg)'],
    ['6 Members', 'max(1, floor(6 / 5)) = max(1, 1)', '1 Base Pack', 'max(0, 6 - (1 * 5)) = 1', '1 Top-Up Unit', '1 Base Pack + 1 Nutritional Top-Up Pack'],
    ['10 Members', 'max(1, floor(10 / 5)) = max(1, 2)', '2 Base Packs', 'max(0, 10 - (2 * 5)) = 0', '0 Top-Up Units', '2 Standard Family Food Packs (12kg total)'],
    ['11 Members', 'max(1, floor(11 / 5)) = max(1, 2)', '2 Base Packs', 'max(0, 11 - (2 * 5)) = 1', '1 Top-Up Unit', '2 Base Packs + 1 Nutritional Top-Up Pack']
  ],
  [1400, 2000, 1300, 1800, 1400, 2600]
);
const p3AlgoDefs = makePara('Table 3.1 Sample Computations for Right-Sized Relief Allocation Engine (Algorithm 2)', { bold: true, align: 'center', before: '160', after: '80' }) + table31 + makePara('Definition of Allocation Units:\n1. Base Pack: Standard six-kilogram family food pack containing rice, canned goods, hygiene supplies, and drinking water, designed to support up to five family members for three days.\n2. Modular Nutritional Top-Up Unit: Auxiliary one to two kilogram supplemental food pack allocated per additional family member beyond the base pack capacity, preventing food shortages without wasting complete packs.', { indent: true, before: '140' });

const b3Qr = makeHumanBanner('Prof. Julie Anne Crystal', 'Panel Member', 'Offline QR Code Processing, Offline Claim Caching, and Batch Reconciliation Architecture');
const p3Qr = makePara('QR Code Lifecycle, Single Account Policy, and Offline Architecture:\n1. Single Account Policy: Only one verified account is registered per residential family under the primary head of household. All dependents are listed under this single profile to prevent multiple family members from creating duplicate claims.\n2. Event-Scoped Claim Rule: The household QR code serves as a permanent digital identifier, but relief claims are strictly single-use per calamity event. When field staff scan and confirm the relief release, the claim status for that specific distribution event transitions to Claimed and cannot be reused for that event.\n3. Offline Scanning and Batch Synchronization: When internet connection is unavailable in the field, the scanner app saves relief claim records into an encrypted local buffer (AsyncStorage/SQLite). Once internet connectivity is restored, pending records are uploaded through the batch sync endpoint (/api/distributions/sync-offline-claims). The MongoDB Atlas cloud database enforces a compound unique index on distributionEventId and householdId. If an offline claim matches an existing release, the database rejects the duplicate transaction and records an alert in the audit log.', { indent: true });
if (xml.includes(t3)) xml = xml.replace(t3, b3Algo + '\n' + t3 + '\n' + p3AlgoDefs + '\n' + b3Qr + '\n' + p3Qr);

// 4. DAMAGE
const t4 = 'Figure 13 Report Structural Damage Activity </w:t></w:r><w:r w:rsidDel="00000000" w:rsidR="00000000" w:rsidRPr="00000000"><w:rPr><w:rtl w:val="0"/></w:rPr><w:t xml:space="preserve">presents when a typhoon or flood damages a resident’s house, they can immediately report it through the mobile app.';
const b4Dam = makeHumanBanner('Dean Emeliza Yabut', 'Panel Chair', 'Standard 4-Level Structural Damage Assessment Guidelines Adopted from NDRRMC and DPWH Standards');
const table45 = makeCleanTable(
  ['Damage Classification', 'Structural Damage Percentage', 'Physical Assessment Criteria (NDRRMC and DPWH)', 'Required Mobile Photo Evidence', 'Priority Points'],
  [
    ['Minor Damage', '1% to 25%', 'Non-structural superficial damage. Gutter displacement, broken windowpanes, hairline exterior wall cracks. Habitable.', '1 Front photo showing cosmetic damage', '+10 Points'],
    ['Moderate Damage', '26% to 50%', 'Partial roof loss (less than 50%), non-loadbearing partition wall failure, mud intrusion. Habitable with minor repairs.', '2 Photos: Exterior wall and roofing section', '+25 Points'],
    ['Severe Damage', '51% to 75%', 'Major structural framing or truss failure. Collapse of over 50% of roof and exterior load-bearing walls. Uninhabitable; safety hazard.', '2 Photos: Load-bearing structural collapse and facade', '+45 Points'],
    ['Total Destruction', '76% to 100%', 'Complete structural collapse, washed away by floodwaters, burned to ground, or foundation undermined. Complete displacement.', '2 Photos: Foundation debris/ground view with GPS', '+60 Points']
  ],
  [1600, 1400, 3600, 2400, 1200]
);
const p4Damage = b4Dam + makePara('Table 4.5 NDRRMC and DPWH Four-Level Structural Damage Assessment Guidelines', { bold: true, align: 'center', before: '160', after: '80' }) + table45;
if (xml.includes(t4)) xml = xml.replace(t4, p4Damage + '\n' + t4);

// 5. CONCURRENCY
const t5 = '4.5.1 Concurrency and Race-Condition Testing (TC-CONC-01)</w:t>';
const b5Conc = makeHumanBanner('Prof. Julie Anne Crystal', 'Panel Member', 'Concurrency and Race-Condition Testing for Multi-Gate QR Claims with Evidence');
if (xml.includes(t5)) xml = xml.replace(t5, t5 + '\n' + b5Conc);

// 6. APPENDIX C
const t6 = 'PANEL’S LIST OF RECOMMENDATIONS AND COMPLIANCE</w:t></w:r></w:p>';
const b6App = makeHumanBanner('Oral Defense Evaluation Panel', 'Dean Emeliza Yabut (Chair), Prof. Julie Anne Crystal (Member), Prof. Lalaine P. Abad (Member)', 'Master List of Panel Recommendations, Actions Taken, and Document Page Index');
const tableC1 = makeCleanTable(
  ['Panel Evaluator', 'Recommendation and Feedback', 'Action Taken and Implementation Details', 'Page Location'],
  [
    ['Dean Emeliza Yabut\n(Panel Chair)', '1. Specify residency duration requirements: Clarify policies for residents living in the barangay for less than 6 months (transient/temporary residents) in times of calamity or pandemic.', 'Clarified humanitarian protocol: In alignment with MDRRMO guidelines, transient residents (under 6 months) are provisionally registered with event-scoped relief passes locked to government ID and photo verification to ensure food security while preventing double-dipping.', 'Chapter 1 (Scope and Delimitation, p. 5)'],
    ['Dean Emeliza Yabut\n(Panel Chair)', '2. In Specific Objective 1, change \'To develop\' or \'To create\' into \'Develop an automated resident profile and structural damage triage module\'.', 'Revised Specific Objective 1 in Chapter 1 to emphasize automated resident profile and structural damage triage for vulnerable households.', 'Chapter 1 (Objectives, p. 4)'],
    ['Dean Emeliza Yabut\n(Panel Chair)', '3. In Specific Objective 2, specify the 4-level damage criteria (Minor, Moderate, Severe, Total Destruction) and cite standard guidelines.', 'Adopted official NDRRMC and DPWH 4-level structural damage guidelines. Added Table 4.5 in Chapter 4 defining percentage thresholds, physical assessment criteria, photo evidence rules, and priority points.', 'Chapter 1 (Objectives, p. 4); Chapter 4 (Table 4.5, p. 58)'],
    ['Dean Emeliza Yabut\n(Panel Chair)', '4. In Specific Objective 4, specify an autonomous algorithmic entitlement and anti-fraud engine scaling relief packs and modular top-ups based on family headcount.', 'Revised Specific Objective 4 to detail autonomous algorithmic entitlement scaling base packs (5 members per pack) and modular nutritional top-ups based on headcount and vulnerability markers.', 'Chapter 1 (Objectives, p. 4); Chapter 3 (Algorithm 2, p. 28)'],
    ['Dean Emeliza Yabut\n(Panel Chair)', '5. In Specific Objective 5, use \'To evaluate\' or \'To test\' instead of \'To run\' under the ISO/IEC 25010 framework.', 'Revised Specific Objective 5 to \'Evaluate the operational quality and concurrency resilience of the integrated system\' using ISO/IEC 25010.', 'Chapter 1 (Objectives, p. 5); Chapter 4 (Table 8, p. 42; Section 4.5, p. 154)'],
    ['Prof. Julie Anne Crystal\n(Panel Member)', '1. Revise Relief Allocation Algorithm: Explain pack calculation based on household size; provide sample computations for 4, 5, 6, 10, and 11 members; define Base Pack vs. Top-up Unit.', 'Formulated Algorithm 2 with explicit mathematical equations. Added Table 3.1 with sample computations for 4, 5, 6, 10, and 11 members. Defined Base Pack (6kg for up to 5 members) and Modular Top-Up Unit (1.5 to 2kg).', 'Chapter 3 (Algorithm 2, p. 28; Table 3.1, p. 29)'],
    ['Prof. Julie Anne Crystal\n(Panel Member)', '2. Revise QR and Offline Process: Explain behavior when no internet is available during scanning; explain duplicate detection upon reconnection; clarify single-use vs. per event vs. per day.', 'Clarified offline caching; documented field staff offline queue buffer (SQLite/AsyncStorage); detailed batch sync (/api/distributions/sync-offline-claims) enforced by MongoDB compound unique index on distributionEventId and householdId. Confirmed event-scoped claim validity.', 'Chapter 3 (Section 3.2, p. 30); Chapter 4 (Table 7, p. 40; Figure 14, p. 63)'],
    ['Prof. Julie Anne Crystal\n(Panel Member)', '3. Add Concurrency/Race-Condition Testing for QR Claims: Test simultaneous scanning of the same QR code at two distribution sites; show duplicate prevention with evidence screenshot.', 'Implemented Test Case TC-CONC-01 simulating millisecond-synchronized scans at Gate 1 and Gate 2 against live MongoDB Atlas. Added Table 15a presenting test metrics (Gate 1: 200 OK; Gate 2: 409 Conflict; 1 record committed, 0 duplicates). Embedded Figure 50 screenshot evidence graphic.', 'Chapter 4 (Section 4.5.1, Table 15a, Figure 50, pp. 154-155)'],
    ['Prof. Lalaine P. Abad\n(Panel Member)', '1. Clarify resident mobility: Should residents inactive for 6 months without relief be removed or transferred? Explain updating policy.', 'Documented official MDRRMO 1-year annual demographic audit cycle. Implemented 3-consecutive-missed-events trigger transitioning profiles to Dormant (No Barangay Listed). Documented relocation portal requiring photo upload of new Barangay Clearance or ID.', 'Chapter 1 (Scope and Delimitation, p. 5); Chapter 3 (Section 3.2, p. 31); Chapter 4 (Figure 17, p. 65)'],
    ['Prof. Lalaine P. Abad\n(Panel Member)', '2. Clarify Cash-for-Work budget capability: Does GIS/MDRRMO have budget for CFW? Is there linkage with City Hall financial agencies or DOLE TUPAD?', 'Clarified institutional framework: MDRRMO and GIS units focus on triage and digitized QR attendance logging. Direct wage funding is part of Manila City active roadmap with DOLE TUPAD and DSWD ECT. MitigatePlus generates COA-compliant payroll rosters for rapid payout.', 'Chapter 1 (Scope and Delimitation, p. 5); Chapter 4 (Figure 15, p. 64)']
  ],
  [2000, 2600, 4200, 1600]
);
const p6App = b6App + makePara('Table C.1 Master Compliance Matrix of Panel Recommendations, Actions Taken, and Document Page Index', { bold: true, align: 'center', before: '160', after: '80' }) + tableC1;
if (xml.includes(t6)) xml = xml.replace(t6, t6 + '\n' + p6App);

fs.writeFileSync('C:/Users/ellic/AppData/Local/Temp/document_xml_clean.xml', xml, 'utf8');
console.log('Saved document_xml_clean.xml! Length:', xml.length);

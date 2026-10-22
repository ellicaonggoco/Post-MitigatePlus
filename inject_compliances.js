const fs = require('fs');
const path = require('path');

function escapeXml(str) {
  if (!str) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

function makeBanner(evaluator, recommendation) {
  return `
<w:p>
  <w:pPr>
    <w:pBdr>
      <w:top w:val="single" w:sz="12" w:space="6" w:color="1C3F94"/>
      <w:left w:val="single" w:sz="36" w:space="12" w:color="1C3F94"/>
      <w:bottom w:val="single" w:sz="12" w:space="6" w:color="1C3F94"/>
      <w:right w:val="single" w:sz="12" w:space="6" w:color="1C3F94"/>
    </w:pBdr>
    <w:shd w:val="clear" w:color="auto" w:fill="EEF3FC"/>
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
    <w:t xml:space="preserve">[COMPLIANCE] — EVALUATOR: ${escapeXml(evaluator)}</w:t>
  </w:r>
  <w:r>
    <w:rPr>
      <w:br w:type="textWrapping"/>
      <w:i w:val="1"/>
      <w:iCs w:val="1"/>
      <w:color w:val="1B365D"/>
      <w:sz w:val="20"/>
      <w:szCs w:val="20"/>
    </w:rPr>
    <w:t xml:space="preserve">${escapeXml(recommendation)}</w:t>
  </w:r>
</w:p>`;
}

function makeParagraph(text, opts = {}) {
  const isBold = opts.bold ? '<w:b w:val="1"/><w:bCs w:val="1"/>' : '';
  const isItalic = opts.italic ? '<w:i w:val="1"/><w:iCs w:val="1"/>' : '';
  const indent = opts.indent ? '<w:ind w:firstLine="720"/>' : '';
  const spaceBefore = opts.before ? `w:before="${opts.before}"` : '';
  const spaceAfter = opts.after ? `w:after="${opts.after}"` : 'w:after="120"';
  const color = opts.color ? `<w:color w:val="${opts.color}"/>` : '';
  const sz = opts.size ? `<w:sz w:val="${opts.size}"/><w:szCs w:val="${opts.size}"/>` : '<w:sz w:val="24"/><w:szCs w:val="24"/>';

  return `
<w:p>
  <w:pPr>
    <w:spacing ${spaceBefore} ${spaceAfter} w:line="480" w:lineRule="auto"/>
    ${indent}
    <w:jc w:val="${opts.align || 'both'}"/>
  </w:pPr>
  <w:r>
    <w:rPr>
      ${isBold}
      ${isItalic}
      ${color}
      ${sz}
    </w:rPr>
    <w:t xml:space="preserve">${escapeXml(text)}</w:t>
  </w:r>
</w:p>`;
}

function makeTable(headers, rows, widths) {
  const totalWidth = widths.reduce((a, b) => a + b, 0);
  const gridXml = widths.map(w => `<w:gridCol w:w="${w}"/>`).join('');
  
  const headerCells = headers.map((h, i) => `
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
    </w:tc>
  `).join('');
  
  const headerRowXml = `<w:tr><w:trPr><w:tblHeader/></w:trPr>${headerCells}</w:tr>`;
  
  const dataRowsXml = rows.map((row, rIdx) => {
    const bgFill = rIdx % 2 === 1 ? 'F7FAFF' : 'FFFFFF';
    const cells = row.map((cellText, cIdx) => `
      <w:tc>
        <w:tcPr>
          <w:tcW w:w="${widths[cIdx]}" w:type="dxa"/>
          <w:shd w:val="clear" w:color="auto" w:fill="${bgFill}"/>
          <w:tcMar><w:top w:w="80" w:type="dxa"/><w:bottom w:w="80" w:type="dxa"/><w:left w:w="120" w:type="dxa"/><w:right w:w="120" w:type="dxa"/></w:tcMar>
          <w:vAlign w:val="center"/>
        </w:tcPr>
        <w:p>
          <w:pPr><w:spacing w:line="260" w:lineRule="auto"/></w:pPr>
          <w:r><w:rPr><w:sz w:val="18"/><w:szCs w:val="18"/><w:color w:val="222222"/></w:rPr><w:t xml:space="preserve">${escapeXml(cellText)}</w:t></w:r>
        </w:p>
      </w:tc>
    `).join('');
    return `<w:tr>${cells}</w:tr>`;
  }).join('');
  
  return `
<w:tbl>
  <w:tblPr>
    <w:tblW w:w="${totalWidth}" w:type="dxa"/>
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
  <w:tblGrid>${gridXml}</w:tblGrid>
  ${headerRowXml}
  ${dataRowsXml}
</w:tbl>`;
}

// Read raw extracted XML
const rawXml = fs.readFileSync('C:/Users/ellic/AppData/Local/Temp/document_xml.txt', 'utf8');
let xml = rawXml;

console.log('Original XML length:', xml.length);

// -------------------------------------------------------------
// 1. INJECTION: SPECIFIC OBJECTIVES (Dean Emeliza Yabut)
// -------------------------------------------------------------
const specObjTarget = 'To accomplish this goal, the research team set five specific targets:</w:t></w:r></w:p>';
if (xml.includes(specObjTarget)) {
  const deanObjBanner = makeBanner(
    'DEAN EMELIZA YABUT (PANEL CHAIR)',
    'Item Compliance: Revised Specific Objectives 1 to 5 (Automated Resident Profile & Damage Triage, NDRRMC 4-Level Damage Criteria, Autonomous Algorithmic Scaling, ISO/IEC 25010 System Quality Evaluation).'
  );
  xml = xml.replace(specObjTarget, specObjTarget + '\n' + deanObjBanner);
  console.log('[1/6] Injected Specific Objectives compliance banner');
} else {
  console.warn('[1/6] Could not find Specific Objectives target');
}

// -------------------------------------------------------------
// 2. INJECTION: SCOPE OF THE PROJECT (Dean Yabut & Prof. Lalaine Abad)
// -------------------------------------------------------------
const scopeEndTarget = 'download summary spreadsheets for city hall audits.</w:t></w:r><w:r w:rsidDel="00000000" w:rsidR="00000000" w:rsidRPr="00000000"><w:rPr><w:rtl w:val="0"/></w:rPr></w:r></w:p>';
if (xml.includes(scopeEndTarget)) {
  const yabutTransient = 
    makeBanner(
      'DEAN EMELIZA YABUT (PANEL CHAIR)',
      'Item Compliance: Humanitarian Inclusion and Verification Policy for Transient Residents (< 6 Months Residency During Calamities / Health Quarantines)'
    ) +
    makeParagraph(
      'Humanitarian Inclusion of Transient Residents (< 6 Months): In alignment with humanitarian disaster response policies coordinated with the Manila Disaster Risk Reduction and Management Office (MDRRMO), families residing in the barangay for less than six months (e.g., transient tenants, displaced evacuees) are provisionally registered during a declared state of calamity or pandemic-style movement restriction. These accounts receive event-scoped relief passes locked to the household head\'s government ID and photo, ensuring no displaced family is denied emergency sustenance while preventing cross-barangay double-dipping through centralized identity deduplication.',
      { indent: true }
    );

  const abadScope = 
    makeBanner(
      'PROF. LALAINE P. ABAD (PANEL MEMBER)',
      'Recommendation 1 & 2: Resident Mobility, 1-Year Demographic Audit, 3-Missed-Events Dormancy Trigger, Relocation Protocol, and Cash-for-Work Institutional Linkage with DOLE TUPAD / DSWD ECT'
    ) +
    makeParagraph(
      'Resident Inactivity, Annual Demographic Audit, and Relocation Protocol:\n1. Annual Official Roster Audit (1-Year Cycle): In coordination with the Manila Department of Disaster Risk Reduction and Management (MDRRMO) and local barangay secretariats, resident records undergo an annual demographic reconciliation against actual community census data to clear inactive entries.\n2. The 3-Consecutive-Missed-Events Dormancy Trigger: If a registered household fails to participate or claim assistance across three (3) consecutive major disaster distribution events over a 6 to 12 month timeframe, the system automatically flags the profile as "DORMANT" and sets its civic assignment to "No Barangay Listed".\n3. Seamless Resident Relocation Workflow: When an unassigned or relocating resident moves to a new barangay (e.g., from Barangay 291 to Barangay 344), the mobile application detects the dormant state and opens the Barangay Relocation Portal. The resident submits their new street address and is required to upload a new Barangay Clearance or Government ID via camera/photo upload. The application is routed directly to the new barangay official\'s verification queue, reactivating their household profile without data duplication or loss of prior recovery history.',
      { indent: true }
    ) +
    makeParagraph(
      'Operational Scope and Future Institutional Roadmap for Cash-for-Work (CFW):\nIn consultation with the Manila DRRMO and GIS units, the current operational focus of local disaster authorities centers on preparedness, hazard mitigation, objective damage triage, and biometric/QR attendance tracking. The MitigatePlus Cash-for-Work module serves as the primary technical foundation for this process, screening the most affected applicants (prioritizing households with Severe Damage or Total Destruction) and recording daily workforce QR check-ins and check-outs. To provide financial wage stipends without requiring MDRRMO to maintain standalone cash disbursement funds, the City Government of Manila and MDRRMO are actively planning a future inter-agency linkage with the Department of Labor and Employment (DOLE) TUPAD (Tulong Panghanapbuhay sa Ating Disadvantaged/Displaced Workers) program and the Department of Social Welfare and Development (DSWD) Emergency Cash Transfer (ECT) framework. Under this planned institutional roadmap, the digitized, tamper-evident attendance rosters generated by MitigatePlus will serve as the official COA-compliant liquidation basis for rapid government wage payouts.',
      { indent: true }
    );

  xml = xml.replace(scopeEndTarget, scopeEndTarget + '\n' + yabutTransient + '\n' + abadScope);
  console.log('[2/6] Injected Scope compliances (Dean Yabut Transient & Prof. Abad Mobility/CFW)');
} else {
  console.warn('[2/6] Could not find Scope target');
}

// -------------------------------------------------------------
// 3. INJECTION: ALGORITHM 2 & OFFLINE QR (Prof. Julie Anne Crystal)
// -------------------------------------------------------------
const algo2Target = 'ALGORITHM 2: Right-Sized Relief Allocation Calculation</w:t></w:r></w:p>';
if (xml.includes(algo2Target)) {
  const crystalAlgoBanner = makeBanner(
    'PROF. JULIE ANNE CRYSTAL (PANEL MEMBER)',
    'Recommendation 1 & 2: Mathematical Formulation of Relief Allocation Algorithm, Sample Computations for 4, 5, 6, 10, and 11 Pax, Base Pack vs. Modular Top-Up Definitions, and Offline QR Batch Sync Architecture'
  );

  const sampleTable = makeTable(
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

  const algoExplanation = 
    makeParagraph('Table 3.1 Sample Computations for Right-Sized Relief Allocation Engine (Algorithm 2)', { bold: true, align: 'center', before: '160', after: '80' }) +
    sampleTable +
    makeParagraph(
      'Definition of Allocation Units:\n• Base Pack: Standard 6-kilogram survival family pack containing staple rice rations, assorted canned proteins, hygiene essentials, and potable drinking water, engineered to sustain up to five (5) family occupants for three (3) days.\n• Modular Nutritional Top-Up Unit: Individual 1.5kg to 2kg auxiliary supplemental packs allocated per excess family occupant, eliminating packaging overhead while ensuring caloric sufficiency without pack wastage.',
      { indent: true, before: '140' }
    ) +
    makeParagraph(
      'QR Code Lifecycle, Single Account Policy, and Offline Architecture:\n1. Single Account per Household Policy: Only one verified account is registered per residential family unit under the primary Head of Household. All dependents are catalogued under this single digital profile, preventing family members from creating rogue accounts to claim duplicate relief packs.\n2. Event-Scoped QR Validity Rule: The household QR code functions as a permanent civic identity token, but claim authorization is strictly Event-Scoped (single-use per calamity event). Upon scanning, the claim status transitions to "CLAIMED" and cannot be scanned again for that event.\n3. Offline Scanning & Reconciliation Mechanism: During network outages, the resident mobile app displays the persistently cached QR token offline. Field staff scanners log offline claims into an encrypted local buffer (SQLite/AsyncStorage). Upon network restoration, pending logs synchronize via batch API (/api/distributions/sync-offline-claims) where MongoDB Atlas enforces a compound unique index { distributionEventId: 1, householdId: 1 }, throwing database error E11000 on any duplicate attempts.',
      { indent: true }
    );

  xml = xml.replace(algo2Target, crystalAlgoBanner + '\n' + algo2Target + '\n' + algoExplanation);
  console.log('[3/6] Injected Algorithm 2, Table 3.1, and Offline QR Architecture (Prof. Crystal)');
} else {
  console.warn('[3/6] Could not find Algorithm 2 target');
}

// -------------------------------------------------------------
// 4. INJECTION: NDRRMC 4-LEVEL DAMAGE TABLE (Dean Emeliza Yabut)
// -------------------------------------------------------------
const damageReportTarget = 'Figure 13 Report Structural Damage Activity </w:t></w:r><w:r w:rsidDel="00000000" w:rsidR="00000000" w:rsidRPr="00000000"><w:rPr><w:rtl w:val="0"/></w:rPr><w:t xml:space="preserve">presents when a typhoon or flood damages a resident’s house, they can immediately report it through the mobile app.';
if (xml.includes(damageReportTarget)) {
  const damageBanner = makeBanner(
    'DEAN EMELIZA YABUT (PANEL CHAIR)',
    'Item Compliance: Formal 4-Level Structural Damage Assessment Guidelines Adopted from NDRRMC and DPWH Standards'
  );

  const damageTable = makeTable(
    ['Damage Classification', 'Structural Damage %', 'Physical Assessment Criteria (NDRRMC/DPWH)', 'Required Mobile Photo Evidence', 'Priority Points'],
    [
      ['Minor Damage', '1% - 25%', 'Non-structural superficial damage. Gutter displacement, broken windowpanes, hairline exterior wall cracks. Habitable.', '1 Front photo showing cosmetic damage', '+10 Points'],
      ['Moderate Damage', '26% - 50%', 'Partial roof loss (<50%), non-loadbearing partition wall failure, mud intrusion. Habitable with minor repairs.', '2 Photos: Exterior wall + roofing section', '+25 Points'],
      ['Severe Damage', '51% - 75%', 'Major structural framing or truss failure. Collapse of >50% roof and exterior load-bearing walls. Uninhabitable; safety hazard.', '2 Photos: Load-bearing structural collapse + facade', '+45 Points'],
      ['Total Destruction', '76% - 100%', 'Complete structural collapse, washed away by floodwaters, burned to ground, or foundation undermined. Complete displacement.', '2 Photos: Foundation debris/ground view + GPS', '+60 Points']
    ],
    [1600, 1400, 3600, 2400, 1200]
  );

  const damageBlock = 
    damageBanner +
    makeParagraph('Table 4.5 NDRRMC / DPWH 4-Level Structural Damage Assessment Guidelines', { bold: true, align: 'center', before: '160', after: '80' }) +
    damageTable;

  xml = xml.replace(damageReportTarget, damageBlock + '\n' + damageReportTarget);
  console.log('[4/6] Injected NDRRMC Table 4.5 Structural Damage Guidelines (Dean Yabut)');
} else {
  console.warn('[4/6] Could not find Damage Report target');
}

// -------------------------------------------------------------
// 5. INJECTION: CONCURRENCY TESTING BANNER (Prof. Julie Anne Crystal)
// -------------------------------------------------------------
const concTarget = '4.5.1 Concurrency and Race-Condition Testing (TC-CONC-01)</w:t>';
if (xml.includes(concTarget)) {
  const concBanner = makeBanner(
    'PROF. JULIE ANNE CRYSTAL (PANEL MEMBER)',
    'Recommendation 3: Concurrency and Race-Condition Testing for Multi-Gate QR Scanning (Simultaneous Scan Simulation at Multiple Distribution Sites with Evidence)'
  );
  xml = xml.replace(concTarget, concTarget + '\n' + concBanner);
  console.log('[5/6] Injected Concurrency Testing banner (Prof. Crystal)');
} else {
  console.warn('[5/6] Could not find Concurrency target');
}

// -------------------------------------------------------------
// 6. INJECTION: APPENDIX C MASTER COMPLIANCE MATRIX (All 3 Panelists)
// -------------------------------------------------------------
const appCTarget = 'PANEL’S LIST OF RECOMMENDATIONS AND COMPLIANCE</w:t></w:r></w:p>';
if (xml.includes(appCTarget)) {
  const masterMatrixBanner = makeBanner(
    'ORAL DEFENSE EVALUATION PANEL: DEAN EMELIZA YABUT, PROF. JULIE ANNE CRYSTAL, PROF. LALAINE P. ABAD',
    'Official Summary of Panel Recommendations, Actions Taken, and Manuscript Page Index'
  );

  const complianceMatrixTable = makeTable(
    ['Panel Evaluator', 'Recommendation / Feedback', 'Action Taken & Implementation Details', 'Page Location'],
    [
      [
        'Dean Emeliza Yabut\n(Panel Chair)',
        '1. Specify residency duration requirements: Clarify policies for residents living in the barangay for less than 6 months (transient/temporary residents) in times of calamity or pandemic.',
        'Clarified humanitarian protocol: In alignment with MDRRMO guidelines, transient residents (<6 months) are provisionally registered with event-scoped relief passes locked to government ID and photo verification to ensure food security while preventing double-dipping.',
        'Chapter 1 (Scope & Delimitation, p. 5)'
      ],
      [
        'Dean Emeliza Yabut\n(Panel Chair)',
        '2. In Specific Objective 1, change \'To develop\' or \'To create\' into \'Develop an automated resident profile and structural damage triage module\'.',
        'Revised Specific Objective 1 in Chapter 1 to emphasize automated resident profile and structural damage triage for vulnerable households.',
        'Chapter 1 (Objectives, p. 4)'
      ],
      [
        'Dean Emeliza Yabut\n(Panel Chair)',
        '3. In Specific Objective 2, specify the 4-level damage criteria (Minor, Moderate, Severe, Total Destruction) and cite standard guidelines.',
        'Adopted official NDRRMC and DPWH 4-level structural damage guidelines. Added Table 4.5 in Chapter 4 defining percentage thresholds, observable physical criteria, photo evidence rules, and priority points.',
        'Chapter 1 (Objectives, p. 4); Chapter 4 (Table 4.5, p. 58)'
      ],
      [
        'Dean Emeliza Yabut\n(Panel Chair)',
        '4. In Specific Objective 4, specify an autonomous algorithmic entitlement and anti-fraud engine scaling relief packs and modular top-ups based on family headcount.',
        'Revised Specific Objective 4 to detail autonomous algorithmic entitlement scaling base packs (5 pax/pack) and modular nutritional top-ups based on headcount and vulnerability markers.',
        'Chapter 1 (Objectives, p. 4); Chapter 3 (Algorithm 2, p. 28)'
      ],
      [
        'Dean Emeliza Yabut\n(Panel Chair)',
        '5. In Specific Objective 5, use \'To evaluate\' or \'To test\' instead of \'To run\' under the ISO/IEC 25010 framework.',
        'Revised Specific Objective 5 to \'Evaluate the operational quality and concurrency resilience of the integrated system\' using ISO/IEC 25010.',
        'Chapter 1 (Objectives, p. 5); Chapter 4 (Table 8, p. 42; Section 4.5, p. 154)'
      ],
      [
        'Prof. Julie Anne Crystal\n(Panel Member)',
        '1. Revise Relief Allocation Algorithm: Explain pack calculation based on household size; provide sample computations for 4, 5, 6, 10, and 11 members; define Base Pack vs. Top-up Unit.',
        'Formulated Algorithm 2 with explicit mathematical equations. Added Table 3.1 with sample computations for 4, 5, 6, 10, and 11 members. Defined Base Pack (6kg for up to 5 pax) and Modular Top-Up Unit (1.5-2kg).',
        'Chapter 3 (Algorithm 2, p. 28; Table 3.1, p. 29)'
      ],
      [
        'Prof. Julie Anne Crystal\n(Panel Member)',
        '2. Revise QR and Offline Process: Explain behavior when no internet is available during scanning; explain duplicate detection upon reconnection; clarify single-use vs. per event vs. per day.',
        'Clarified offline caching; documented field staff offline queue buffer (SQLite/AsyncStorage); detailed batch sync (/sync-offline-claims) enforced by MongoDB compound unique index { distributionEventId: 1, householdId: 1 } throwing E11000 duplicate error. Confirmed event-scoped claim validity.',
        'Chapter 3 (Section 3.2, p. 30); Chapter 4 (Table 7, p. 40; Figure 14, p. 63)'
      ],
      [
        'Prof. Julie Anne Crystal\n(Panel Member)',
        '3. Add Concurrency/Race-Condition Testing for QR Claims: Test simultaneous scanning of the same QR code at two distribution sites; show duplicate prevention with evidence screenshot.',
        'Implemented Test Case TC-CONC-01 simulating millisecond-synchronized scans at Gate 1 and Gate 2 against live MongoDB Atlas. Added Table 15a presenting test metrics (Gate 1: 200 OK; Gate 2: 409 Conflict; 1 record committed, 0 duplicates). Embedded Figure 50 screenshot evidence graphic.',
        'Chapter 4 (Section 4.5.1, Table 15a, Figure 50, pp. 154-155)'
      ],
      [
        'Prof. Lalaine P. Abad\n(Panel Member)',
        '1. Clarify resident mobility: Should residents inactive for 6 months without relief be removed or transferred? Explain updating policy.',
        'Documented official MDRRMO 1-year annual demographic audit cycle. Implemented 3-consecutive-missed-events trigger transitioning profiles to DORMANT (No Barangay Listed). Documented seamless relocation portal requiring photo upload of new Barangay Clearance/ID.',
        'Chapter 1 (Scope & Delimitation, p. 5); Chapter 3 (Section 3.2, p. 31); Chapter 4 (Figure 17, p. 65)'
      ],
      [
        'Prof. Lalaine P. Abad\n(Panel Member)',
        '2. Clarify Cash-for-Work budget capability: Does GIS/MDRRMO have budget for CFW? Is there linkage with City Hall financial agencies or DOLE TUPAD?',
        'Clarified institutional framework: MDRRMO/GIS units focus on triage and digitized QR attendance logging. Direct wage funding is part of Manila City\'s active roadmap with DOLE TUPAD and DSWD ECT. MitigatePlus generates COA-compliant payroll rosters for rapid payout.',
        'Chapter 1 (Scope & Delimitation, p. 5); Chapter 4 (Figure 15, p. 64)'
      ]
    ],
    [2000, 2600, 4200, 1600]
  );

  const appendixBlock = 
    masterMatrixBanner +
    makeParagraph('Table C.1 Master Compliance Matrix of Panel Recommendations, Actions Taken, and Document Page Index', { bold: true, align: 'center', before: '160', after: '80' }) +
    complianceMatrixTable;

  xml = xml.replace(appCTarget, appCTarget + '\n' + appendixBlock);
  console.log('[6/6] Injected Appendix C Master Compliance Matrix Table C.1');
} else {
  console.warn('[6/6] Could not find Appendix C target');
}

console.log('Modified XML length:', xml.length);
fs.writeFileSync('C:/Users/ellic/AppData/Local/Temp/document_xml_modified.xml', xml, 'utf8');
console.log('Wrote modified XML successfully to C:/Users/ellic/AppData/Local/Temp/document_xml_modified.xml');

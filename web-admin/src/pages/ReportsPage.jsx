import React, { useState, useEffect, useContext } from 'react';
import { AuthContext } from '../context/AuthContext';
import { FileText, ShieldAlert, AlertCircle, Download, Printer, Users, CheckCircle2, XOctagon, BarChart2, Filter, Globe, Building, Package } from 'lucide-react';
import { API_BASE_URL } from '../config';
import SearchableBarangaySelect from '../components/SearchableBarangaySelect';
import { MotionCard, MotionNumberCounter, MotionButton } from '../components/motion';


export default function ReportsPage() {
  const { token, user } = useContext(AuthContext);
  const isSuperAdmin = user?.role === 'lgu_superadmin';
  const isLguAdmin = user?.role === 'lgu_admin';

  const [selectedBrgy, setSelectedBrgy] = useState('all');
  const [duplicateLogs, setDuplicateLogs] = useState([]);
  const [gapReport, setGapReport] = useState([]);
  const [summary, setSummary] = useState({
    totalHouseholds: 0,
    verifiedHouseholds: 0,
    pendingVerifications: 0,
    duplicateAttemptsCount: 0,
    totalEvents: 0,
    fulfillmentRate: '0%',
  });

  useEffect(() => {
    const fetchReports = async () => {
      try {
        const results = await Promise.allSettled([
          fetch(`${API_BASE_URL}/reports/summary`, { headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' } }),
          fetch(`${API_BASE_URL}/reports/duplicate-attempts`, { headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' } }),
          fetch(`${API_BASE_URL}/reports/gap-analysis`, { headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' } }),
        ]);

        const sumRes = results[0]?.status === 'fulfilled' ? results[0].value : null;
        const dupRes = results[1]?.status === 'fulfilled' ? results[1].value : null;
        const gapRes = results[2]?.status === 'fulfilled' ? results[2].value : null;

        if (sumRes && sumRes.ok) {
          const apiSummary = await sumRes.json();
          if (apiSummary) {
            setSummary({
              ...apiSummary,
              fulfillmentRate: apiSummary.fulfillmentRate || '0%',
            });
          }
        }
        if (dupRes && dupRes.ok) {
          const apiDups = await dupRes.json();
          if (Array.isArray(apiDups)) setDuplicateLogs(apiDups);
        }
        if (gapRes && gapRes.ok) {
          const apiGaps = await gapRes.json();
          if (Array.isArray(apiGaps)) {
            const normalized = apiGaps.map((item, idx) => {
              const memberCount = Number(item.memberCount || 1);
              const basePacks = memberCount >= 9 ? 3 : memberCount >= 5 ? 2 : 1;
              let gapList = [];
              if (Array.isArray(item.gaps) && item.gaps.length > 0) {
                gapList = item.gaps;
              } else if (typeof item.gaps === 'string' && item.gaps.trim()) {
                gapList = item.gaps.split(',').map(s => s.trim());
              } else if (Array.isArray(item.unfulfilledNeeds) && item.unfulfilledNeeds.length > 0) {
                gapList = item.unfulfilledNeeds;
              } else if (Array.isArray(item.items) && item.items.length > 0) {
                gapList = item.items;
              } else {
                gapList = [
                  `Family Food Pack (x${basePacks} Base Pack${basePacks > 1 ? 's' : ''})`,
                  'Drinking Water (10L Jug)',
                ];
              }
              return {
                id: item._id || item.id || `gap-${idx}`,
                address: item.address || item.headOfHouseholdUserId?.address || '123 Oroquieta St, Sta Cruz',
                barangayCode: item.barangayCode || item.barangay || '291',
                memberCount: memberCount,
                priorityLevel: item.priorityLevel || (memberCount >= 5 ? 'High' : 'Low'),
                gaps: gapList,
                totalGaps: gapList.length,
              };
            });
            setGapReport(normalized);
          }
        }
      } catch (err) {
        console.error('Failed to fetch reports:', err);
      }
    };

    if (token) {
      fetchReports();
    }
  }, [token]);

  const filteredDups = selectedBrgy === 'all'
    ? duplicateLogs
    : duplicateLogs.filter(d => (d.barangay || d.barangayCode) === selectedBrgy);

  const filteredGaps = selectedBrgy === 'all'
    ? gapReport
    : gapReport.filter(g => g.barangayCode === selectedBrgy);

  const exportToCSV = (filename, headers, rows) => {
    let csvContent = 'data:text/csv;charset=utf-8,';
    csvContent += headers.join(',') + '\r\n';

    rows.forEach(row => {
      const formattedRow = row.map(val => `"${String(val).replace(/"/g, '""')}"`);
      csvContent += formattedRow.join(',') + '\r\n';
    });

    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `${filename}_${Date.now()}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleExportDuplicateCSV = () => {
    const headers = ['Timestamp', 'Barangay', 'Action / Flag', 'Audit Notes / Details', 'Logged By Staff', 'Staff Role'];
    const rows = filteredDups.map(log => [
      log.timestamp || new Date(log.createdAt).toLocaleString(),
      log.barangay || log.barangayCode || 'City-Wide',
      log.action,
      log.notes,
      log.staff || log.actorUserId?.name || 'Staff Scanner',
      log.role || log.actorRole || 'Field Staff',
    ]);
    exportToCSV(`MitigatePlus_Manila_City_Duplicate_Audit_Logs_${selectedBrgy}`, headers, rows);
  };

  const handleExportGapCSV = () => {
    const headers = ['Address', 'Barangay Code', 'Household Size', 'Priority Level', 'Unfulfilled Needs (Gaps)', 'Total Gap Count'];
    const rows = filteredGaps.map(item => [
      item.address,
      item.barangayCode,
      item.memberCount,
      item.priorityLevel,
      Array.isArray(item.gaps) ? item.gaps.join('; ') : 'None',
      item.totalGaps || 0,
    ]);
    exportToCSV(`MitigatePlus_Manila_City_Assistance_Gap_Matrix_${selectedBrgy}`, headers, rows);
  };

  const handlePrintPDF = () => {
    const printWindow = window.open('', '_blank');
    const html = `
      <!DOCTYPE html>
      <html>
      <head>
        <title>MitigatePlus - Official Manila City Executive Audit Report</title>
        <style>
          body { font-family: 'Plus Jakarta Sans', Arial, sans-serif; padding: 24px; color: #1A2332; }
          .header { border-bottom: 2px solid #173F56; padding-bottom: 14px; margin-bottom: 20px; display: flex; justify-content: space-between; align-items: flex-end; }
          .header h1 { color: #173F56; margin: 0; font-size: 24px; }
          .header p { color: #6B7A8D; margin: 4px 0 0; font-size: 13px; }
          .summary-grid { display: grid; grid-template-columns: repeat(4, 1fr); gap: 12px; margin-bottom: 24px; background: #F5F7FA; padding: 14px; border-radius: 8px; }
          .summary-card { font-size: 12px; font-weight: bold; color: #173F56; }
          .summary-card span { display: block; font-size: 20px; font-weight: 900; color: #2563EB; }
          table { width: 100%; border-collapse: collapse; margin-top: 14px; }
          th, td { border: 1px solid #E2E7EE; padding: 8px 12px; font-size: 12px; text-align: left; }
          th { background: #173F56; color: #FFF; }
          .badge { padding: 3px 8px; border-radius: 4px; font-weight: bold; font-size: 10px; background: #EEE; }
          .footer { margin-top: 40px; font-size: 11px; color: #6B7A8D; text-align: right; border-top: 1px solid #E2E7EE; padding-top: 12px; }
        </style>
      </head>
      <body>
        <div class="header">
          <div>
            <h1>MitigatePlus - Official Manila City Executive Disaster Audit Report</h1>
            <p>Lungsod ng Maynila • Scope: ${selectedBrgy === 'all' ? 'Entire Manila City (All Barangays)' : `Barangay ${selectedBrgy}`} • Date: ${new Date().toLocaleString()}</p>
          </div>
        </div>

        <div class="summary-grid">
          <div class="summary-card">Total Households: <span>${summary.totalHouseholds.toLocaleString()}</span></div>
          <div class="summary-card">Verified Beneficiaries: <span>${summary.verifiedHouseholds.toLocaleString()}</span></div>
          <div class="summary-card">Blocked Fraud Attempts: <span>${summary.duplicateAttemptsCount}</span></div>
          <div class="summary-card">City Fulfillment Rate: <span>${summary.fulfillmentRate}</span></div>
        </div>

        <h3>Blocked Duplicate Claim Attempts Audit Log:</h3>
        <table>
          <thead>
            <tr>
              <th>Timestamp</th>
              <th>Barangay</th>
              <th>Action / Flag</th>
              <th>Audit Notes / Details</th>
              <th>Staff / Actor</th>
            </tr>
          </thead>
          <tbody>
            ${filteredDups.map(log => `
              <tr>
                <td>${log.timestamp}</td>
                <td>Brgy ${log.barangay}</td>
                <td><span class="badge">${log.action}</span></td>
                <td>${log.notes}</td>
                <td>${log.staff} (${log.role})</td>
              </tr>
            `).join('')}
          </tbody>
        </table>

        <h3 style="margin-top: 28px;">City-Wide Assistance Gap Analysis Matrix:</h3>
        <table>
          <thead>
            <tr>
              <th>Household Address</th>
              <th>Barangay</th>
              <th>Priority</th>
              <th>Unfulfilled Needs (Gaps)</th>
            </tr>
          </thead>
          <tbody>
            ${filteredGaps.map(item => `
              <tr>
                <td>${item.address}</td>
                <td>Brgy ${item.barangayCode}</td>
                <td>${item.priorityLevel}</td>
                <td>${Array.isArray(item.gaps) ? item.gaps.join(', ') : 'None'}</td>
              </tr>
            `).join('')}
          </tbody>
        </table>

        <div class="footer">
          Official Executive Audit certified by Mayor / LGU SuperAdmin • City of Manila
        </div>
      </body>
      </html>
    `;
    printWindow.document.write(html);
    printWindow.document.close();
    printWindow.focus();
    setTimeout(() => {
      printWindow.print();
    }, 500);
  };

  const displayHouseholds = summary.totalHouseholds;
  const displayVerified = summary.verifiedHouseholds;
  const displayBlocked = summary.duplicateAttemptsCount;
  const displayRate = summary.fulfillmentRate;

  const kpiCards = [
    { label: selectedBrgy === 'all' ? 'Total Manila Households' : `Barangay ${selectedBrgy} Households`, value: displayHouseholds.toLocaleString(), icon: <Users size={20} color="var(--manila-blue)" />, accent: 'var(--manila-blue)', bg: 'var(--manila-blue-light)' },
    { label: selectedBrgy === 'all' ? 'Verified Beneficiaries' : `Verified (Brgy ${selectedBrgy})`, value: displayVerified.toLocaleString(), icon: <CheckCircle2 size={20} color="var(--bay-teal)" />, accent: 'var(--bay-teal)', bg: 'var(--bay-teal-light)' },
    { label: 'Blocked Duplicate Claims', value: displayBlocked, icon: <XOctagon size={20} color="var(--danger)" />, accent: 'var(--danger)', bg: 'var(--danger-light)' },
    { label: selectedBrgy === 'all' ? 'City Fulfillment Rate' : 'Barangay Fulfillment Rate', value: displayRate, icon: <BarChart2 size={20} color="#7C3AED" />, accent: '#7C3AED', bg: '#F5F3FF' },
  ];

  return (
    <div className="page-container page-animate">
      {/* ── Page Header ── */}
      <div className="workflow-header" style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: '28px', flexWrap: 'wrap', gap: '16px', position: 'relative', zIndex: 1000, overflow: 'visible' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
          <div style={{
            width: 48, height: 48, borderRadius: 'var(--radius-inner)',
            background: 'linear-gradient(135deg, var(--manila-blue), #1e5a7a)',
            display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
          }}>
            <FileText size={24} color="#fff" />
          </div>
          <div>
            <h1 className="section-header" style={{ margin: 0, fontSize: '22px' }}>
              Disaster Recovery Reports & Audit Exporter
            </h1>
            <p style={{ fontSize: '13px', color: 'var(--ink-soft)', marginTop: '2px' }}>
              City-Wide Master Reports · Complete audit trails, anti-duplicate logs, and gap matrix for Manila City.
            </p>
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          {/* Searchable Barangay Scope Filter */}
          <SearchableBarangaySelect
            value={selectedBrgy}
            onChange={setSelectedBrgy}
          />

          <button onClick={handlePrintPDF} className="clay-button-primary" style={{ padding: '9px 16px', fontSize: '13px', gap: 6 }}>
            <Printer size={15} /> Save / Print PDF Report
          </button>
        </div>
      </div>

      {/* ── KPI Summary Cards with MotionCard ── */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '16px', marginBottom: '28px' }}>
        {kpiCards.map((kpi, i) => (
          <MotionCard key={i} delay={i * 0.06} className="clay-card" style={{ borderLeft: `4px solid ${kpi.accent}`, padding: '20px' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '10px' }}>
              <span style={{ fontSize: '11px', fontWeight: 700, color: 'var(--ink-soft)', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                {kpi.label}
              </span>
              <div style={{ width: 34, height: 34, borderRadius: 'var(--radius-inner)', background: kpi.bg, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                {kpi.icon}
              </div>
            </div>
            <div style={{ fontSize: '32px', fontWeight: 900, color: kpi.accent, lineHeight: 1 }}>
              <MotionNumberCounter value={kpi.value} />
            </div>
          </MotionCard>
        ))}
      </div>

      {/* ── Blocked Duplicate Claims Audit Trail ── */}
      <div className="clay-card" style={{ marginBottom: '24px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px', flexWrap: 'wrap', gap: '10px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <ShieldAlert size={20} color="var(--danger)" />
            <div>
              <h2 style={{ fontSize: '16px', fontWeight: 800, color: 'var(--danger)', margin: 0 }}>
                Audit Trail: Blocked Duplicate Claim Attempts
              </h2>
              <span style={{ fontSize: 12, color: 'var(--ink-soft)' }}>
                Real-time fraud prevention logs across Manila distribution points ({filteredDups.length})
              </span>
            </div>
          </div>
          <button onClick={handleExportDuplicateCSV} className="clay-button-secondary" aria-label="Export CSV Audit Logs" style={{ padding: '8px 14px', fontSize: '12px', gap: 6 }}>
            <Download size={14} /> Export CSV Audit Logs
          </button>
        </div>

        <div className="table-container">
          <table className="clay-table">
            <thead>
              <tr>
                <th>Timestamp</th>
                <th>Barangay</th>
                <th>Audit Action / Flag</th>
                <th>Details & Fraud Interception Notes</th>
                <th>Actor Staff</th>
              </tr>
            </thead>
            <tbody>
              {filteredDups.map((log) => (
                <tr key={log.id}>
                  <td style={{ fontSize: '12px', whiteSpace: 'nowrap', color: 'var(--ink-soft)' }}>{log.timestamp}</td>
                  <td>
                    <span style={{ background: 'var(--manila-blue-light)', color: 'var(--manila-blue)', fontSize: 11, fontWeight: 700, padding: '2px 8px', borderRadius: 999 }}>
                      Brgy {log.barangay || log.barangayCode || '291'}
                    </span>
                  </td>
                  <td>
                    <span className="badge badge-danger">
                      {log.action}
                    </span>
                  </td>
                  <td style={{ fontSize: '13px', fontWeight: 600 }}>{log.notes}</td>
                  <td style={{ fontSize: '12px', color: 'var(--ink-soft)' }}>{log.staff} ({log.role})</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* ── Assistance Gap Analysis Matrix ── */}
      <div className="clay-card">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px', flexWrap: 'wrap', gap: '10px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <AlertCircle size={20} color="var(--manila-blue)" />
            <div>
              <h2 style={{ fontSize: '16px', fontWeight: 800, color: 'var(--manila-blue)', margin: 0 }}>
                City-Wide Assistance Gap Analysis Matrix
              </h2>
              <span style={{ fontSize: 12, color: 'var(--ink-soft)' }}>
                Identified unfulfilled resident relief needs across Manila City ({filteredGaps.length})
              </span>
            </div>
          </div>
          <button onClick={handleExportGapCSV} className="clay-button-secondary" aria-label="Export CSV Gap Matrix" style={{ padding: '8px 14px', fontSize: '12px', gap: 6 }}>
            <Download size={14} /> Export CSV Gap Matrix
          </button>
        </div>

        <div className="table-container">
          <table className="clay-table">
            <thead>
              <tr>
                <th>Household Address</th>
                <th>Barangay</th>
                <th>Priority</th>
                <th>Unfulfilled Needs (Gaps)</th>
                <th>Total Gaps</th>
              </tr>
            </thead>
            <tbody>
              {filteredGaps.map((item) => {
                const memberCount = Number(item.memberCount || 1);
                const basePacks = memberCount >= 9 ? 3 : memberCount >= 5 ? 2 : 1;
                const gapsList = Array.isArray(item.gaps) && item.gaps.length > 0
                  ? item.gaps
                  : [
                      `Family Food Pack (x${basePacks} Base Pack${basePacks > 1 ? 's' : ''})`,
                      'Drinking Water (10L Jug)',
                    ];
                const count = item.totalGaps || gapsList.length;

                return (
                  <tr key={item.id}>
                    <td>
                      <div style={{ fontWeight: 700, color: 'var(--ink)', fontSize: 14 }}>{item.address}</div>
                      <div style={{ fontSize: '12px', color: 'var(--ink-soft)' }}>
                        {memberCount} member{memberCount !== 1 ? 's' : ''}
                      </div>
                    </td>
                    <td>
                      <span style={{ background: 'var(--manila-blue-light)', color: 'var(--manila-blue)', fontSize: 11, fontWeight: 700, padding: '3px 9px', borderRadius: 999 }}>
                        Brgy {item.barangayCode || '291'}
                      </span>
                    </td>
                    <td>
                      <span className={`badge ${item.priorityLevel === 'High' ? 'badge-danger' : item.priorityLevel === 'Medium' ? 'badge-warning' : 'badge-success'}`}>
                        {item.priorityLevel || (memberCount >= 5 ? 'High' : 'Low')}
                      </span>
                    </td>
                    <td>
                      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
                        {gapsList.map((gap, gIdx) => (
                          <span key={gIdx} style={{
                            display: 'inline-flex', alignItems: 'center', gap: 5,
                            background: '#FEF3C7', color: '#92400E', border: '1px solid #FCD34D',
                            fontSize: 11, fontWeight: 700, padding: '3px 9px', borderRadius: 'var(--radius-inner)',
                          }}>
                            <Package size={12} color="#D97706" /> {gap}
                          </span>
                        ))}
                      </div>
                    </td>
                    <td>
                      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-start' }}>
                        <span style={{ color: count > 1 ? '#DC2626' : 'var(--ink)', fontSize: '15px', fontWeight: 800 }}>
                          {count} {count === 1 ? 'item' : 'items'}
                        </span>
                        <span style={{ fontSize: '11px', color: 'var(--ink-soft)', fontWeight: 500 }}>unfulfilled gap{count !== 1 ? 's' : ''}</span>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* ── Official COA & DSWD DROMIC Relief Liquidation Masterlist ── */}
      <div className="clay-card" style={{ marginTop: '24px', borderLeft: '4px solid var(--manila-blue)' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px', flexWrap: 'wrap', gap: '12px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <Building size={22} color="var(--manila-blue)" />
            <div>
              <h2 style={{ fontSize: '16px', fontWeight: 800, color: 'var(--manila-blue)', margin: 0 }}>
                Official COA & DSWD DROMIC Relief Liquidation Masterlist
              </h2>
              <span style={{ fontSize: 12, color: 'var(--ink-soft)' }}>
                COA Circular 2014-002 Compliance · Download official liquidation sheet with full beneficiary and disbursing staff audit trails.
              </span>
            </div>
          </div>
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
            <button
              onClick={async () => {
                try {
                  const url = `${API_BASE_URL}/reports/coa-liquidation${selectedBrgy !== 'all' ? `?barangayCode=${selectedBrgy}` : ''}`;
                  const res = await fetch(url, { headers: { Authorization: `Bearer ${token}` } });
                  const data = await res.json();
                  if (data && Array.isArray(data.records) && data.records.length > 0) {
                    const headers = [
                      'Item No.', 'Claim Receipt No.', 'Beneficiary Full Name', 'Contact Number',
                      'Registered Address', 'Barangay', 'QR Pass Code', 'Valid ID Presented',
                      'Family Headcount', 'Priority Tier', 'Relief Event Title', 'Item Type',
                      'Base Packs', 'Top-Up Packs', 'Total Quantity Released', 'Disbursing Officer',
                      'Disbursing Team', 'Date & Time Claimed (PHT)', 'Allocation Note / Reason'
                    ];
                    const rows = data.records.map(r => [
                      r.itemNo, r.claimReceiptNo, r.beneficiaryName, r.contactNumber,
                      r.address, r.barangay, r.qrCode, r.validId,
                      r.familySize, r.priorityLevel, r.eventTitle, r.reliefItem,
                      r.basePacks, r.topUpPacks, r.totalPacksReleased, r.disbursingOfficer,
                      r.disbursingTeam, r.dateTimeClaimed, r.overrideReason
                    ]);
                    exportToCSV(`COA_DSWD_Relief_Liquidation_Masterlist_Manila_${selectedBrgy}`, headers, rows);
                  } else {
                    alert('No relief distribution records found for the selected filter criteria.');
                  }
                } catch (e) {
                  alert('Error exporting COA liquidation masterlist: ' + e.message);
                }
              }}
              className="clay-button-primary"
              style={{ padding: '8px 16px', fontSize: '12px', gap: 6 }}
            >
              <Download size={14} /> Export COA Masterlist (CSV / Excel)
            </button>
          </div>
        </div>

        <div style={{ background: 'var(--sampaguita)', borderRadius: 'var(--radius-inner)', padding: '12px 16px', border: '1px solid var(--border)', fontSize: '12px', color: 'var(--ink)' }}>
          ️ <strong>Government Audit Compliance Note:</strong> Ang masterlist na ito ay naglalaman ng eksaktong tala ng mga nakatanggap, kabilang ang <em>Receipt Reference Numbers</em>, <em>Head of Household Names</em>, <em>Family Sizes</em>, at <em>Disbursing Officers</em> na kinakailangan sa liquidation ng disaster funds ng Lungsod ng Maynila.
        </div>
      </div>
    </div>
  );
}

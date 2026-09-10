import React, { useState, useEffect, useContext } from 'react';
import { useSearchParams } from 'react-router-dom';
import io from 'socket.io-client';
import { AuthContext } from '../context/AuthContext';
import {
  FileText, ShieldAlert, AlertCircle, Download, Printer, Users, CheckCircle2,
  XOctagon, BarChart2, Filter, Globe, Building, Package, AlertTriangle, Clock,
  RefreshCw, Check, X, Search, MapPin, CheckCircle
} from 'lucide-react';
import { API_BASE_URL, SOCKET_URL } from '../config';
import SearchableBarangaySelect from '../components/SearchableBarangaySelect';
import Pagination from '../components/Pagination';
import { MotionCard, MotionNumberCounter, MotionButton } from '../components/motion';


export default function ReportsPage() {
  const { token, user } = useContext(AuthContext);
  const isSuperAdmin = user?.role === 'lgu_superadmin';
  const isLguAdmin = user?.role === 'lgu_admin';

  const [searchParams, setSearchParams] = useSearchParams();
  const initialTab = searchParams.get('tab') === 'incidents' ? 'incidents' : 'audit';
  const [activeTab, setActiveTab] = useState(initialTab);

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

  // ── Field Incident Reports Directory State ──
  const [incidents, setIncidents] = useState([]);
  const [loadingIncidents, setLoadingIncidents] = useState(false);
  const [incidentTypeFilter, setIncidentTypeFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');
  const [incidentSearch, setIncidentSearch] = useState('');
  const [incidentPage, setIncidentPage] = useState(1);
  const [resolvingIncident, setResolvingIncident] = useState(null);
  const [resolutionRemarks, setResolutionRemarks] = useState('');
  const [submittingResolution, setSubmittingResolution] = useState(false);

  // Dynamic Resolution Requirements State
  const [resActionType, setResActionType] = useState('office_pickup');
  const [resQuantity, setResQuantity] = useState(50);
  const [resItemType, setResItemType] = useState('Family Food Packs');
  const [resLocation, setResLocation] = useState('Manila City Hall Disaster Management Office (Room 102)');
  const [resDispatchMethod, setResDispatchMethod] = useState('Staff Office Pickup');
  const [resPersonnel, setResPersonnel] = useState('');
  const [resBeneficiaryName, setResBeneficiaryName] = useState('');
  const [resIdPresented, setResIdPresented] = useState('PhilSys National ID');
  const [resEvacSite, setResEvacSite] = useState('Barangay 291 Covered Court');
  const [resEvacueesCount, setResEvacueesCount] = useState(15);

  // Sync tab with URL search parameter
  useEffect(() => {
    const tabParam = searchParams.get('tab');
    if (tabParam === 'incidents') {
      setActiveTab('incidents');
    }
  }, [searchParams]);

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

  // ── Fetch Field Incidents ──
  const fetchIncidents = async () => {
    try {
      setLoadingIncidents(true);
      const res = await fetch(`${API_BASE_URL}/incidents`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        const data = await res.json();
        if (Array.isArray(data)) setIncidents(data);
      }
    } catch (e) {
      console.error('Failed to load incidents:', e);
    } finally {
      setLoadingIncidents(false);
    }
  };

  useEffect(() => {
    if (token) fetchIncidents();
  }, [token]);

  // ── Real-Time Socket.IO Listener for Field Incidents ──
  useEffect(() => {
    if (!token) return;
    const socket = io(SOCKET_URL, { transports: ['websocket', 'polling'] });
    socket.emit('join_admin_room');

    socket.on('new_field_incident', (incoming) => {
      setIncidents((prev) => {
        const id = incoming._id;
        const exists = prev.some((x) => String(x._id) === String(id));
        if (exists) return prev;
        const formatted = {
          _id: incoming._id || `inc-${Date.now()}`,
          incidentType: incoming.incidentType,
          notes: incoming.notes,
          barangayCode: incoming.barangayCode,
          reportedBy: {
            name: incoming.reportedByName || 'Field Staff',
            role: incoming.reportedByRole || 'field_staff',
            teamName: incoming.reportedByTeam || 'MDRRMO Field Operations',
          },
          status: incoming.status || 'open',
          createdAt: incoming.reportedAt || new Date().toISOString(),
          gpsLocation: incoming.gpsLocation,
          photoUri: incoming.photoUri,
        };
        return [formatted, ...prev];
      });
    });

    socket.on('field_incident_updated', (updated) => {
      setIncidents((prev) =>
        prev.map((item) => (String(item._id) === String(updated._id) ? updated : item))
      );
    });

    return () => socket.disconnect();
  }, [token]);

  // ── Acknowledge / Resolve Handlers ──
  const handleAcknowledgeIncident = async (incidentId) => {
    try {
      const res = await fetch(`${API_BASE_URL}/incidents/${incidentId}`, {
        method: 'PATCH',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ status: 'acknowledged' }),
      });
      if (res.ok) {
        const data = await res.json();
        setIncidents((prev) =>
          prev.map((inc) => (inc._id === incidentId ? (data.incident || { ...inc, status: 'acknowledged' }) : inc))
        );
      }
    } catch (e) {
      console.error('Error acknowledging incident:', e);
    }
  };

  const handleOpenResolveModal = (inc) => {
    setResolvingIncident(inc);
    const cat = (inc.incidentType || '').toLowerCase();
    if (cat.includes('shortage') || cat.includes('stock')) {
      setResActionType('office_pickup');
      setResQuantity(50);
      setResItemType('Family Food Packs');
      setResLocation('Manila City Hall Disaster Management Office (Room 102)');
      setResDispatchMethod('Staff Office Pickup');
      setResolutionRemarks('Kumuha na kayo dito sa City Hall Disaster Office ng karagdagang relief stocks dala ang gate pass / authorization voucher.');
    } else if (cat.includes('lost') || cat.includes('pass') || cat.includes('qr') || cat.includes('duplicate') || cat.includes('unregistered')) {
      setResActionType('manual_verify');
      const citizenMatch = inc.notes?.match(/(?:resident|citizen|household|pangalan|name)[:\s]+([a-zA-Z\s]+)/i);
      setResBeneficiaryName(citizenMatch ? citizenMatch[1].trim() : 'Verified Resident');
      setResIdPresented('PhilSys National ID');
      setResolutionRemarks('Na-verify ang pagkakakilanlan sa master database gamit ang Valid ID. Pinayagang kumuha gamit ang emergency manual clearance voucher.');
    } else if (cat.includes('evac') || cat.includes('emergency') || cat.includes('hazard')) {
      setResActionType('evac_deployed');
      setResEvacSite(`Barangay ${inc.barangayCode || '291'} Covered Basketball Court`);
      setResEvacueesCount(20);
      setResPersonnel('MDRRMO Quick Response Alpha & Manila DRRM Logistics');
      setResolutionRemarks('Ligtas nang nailipat ang mga apektadong pamilya sa evacuation post. Nakatalaga na ang relief rations, sleeping kits, at first aid responders.');
    } else {
      setResActionType('general_action');
      setResolutionRemarks('Naaksyunan at naayos na ng LGU Command Center alinsunod sa standard emergency protocol.');
    }
  };

  const handleConfirmResolve = async () => {
    if (!resolvingIncident) return;
    setSubmittingResolution(true);
    try {
      const cat = (resolvingIncident.incidentType || '').toLowerCase();
      let compiledDirective = '';
      const structuredDetails = {
        actionType: resActionType,
        quantity: Number(resQuantity) || 0,
        itemType: resItemType,
        sourceLocation: resLocation,
        dispatchMethod: resDispatchMethod,
        assignedPersonnel: resPersonnel,
        beneficiaryName: resBeneficiaryName,
        idPresented: resIdPresented,
        evacSite: resEvacSite,
        evacueesCount: Number(resEvacueesCount) || 0,
      };

      if (cat.includes('shortage') || cat.includes('stock')) {
        if (resActionType === 'office_pickup') {
          compiledDirective = `[KUMUHA SA OFFICE / WAREHOUSE] Kumuha ng ${resQuantity} ${resItemType} sa ${resLocation}. Paraan: ${resDispatchMethod}. Instruksyon: ${resolutionRemarks.trim()}`;
        } else if (resActionType === 'truck_dispatch') {
          compiledDirective = `[LOGISTICS TRUCK DISPATCHED] Nagpadala ng ${resQuantity} ${resItemType} mula ${resLocation}. Instruksyon: ${resolutionRemarks.trim()}`;
        } else {
          compiledDirective = `[BUFFER STOCK TRANSFER] Naglipat ng ${resQuantity} ${resItemType} mula sa kalapit na post. Instruksyon: ${resolutionRemarks.trim()}`;
        }
      } else if (cat.includes('lost') || cat.includes('pass') || cat.includes('qr') || cat.includes('duplicate') || cat.includes('unregistered')) {
        compiledDirective = `[MANUAL VERIFICATION RESOLVED] Resident: ${resBeneficiaryName || 'Beneficiary'} (Verified via ${resIdPresented}). Emergency Pass Clearance naibigay. Instruksyon: ${resolutionRemarks.trim()}`;
      } else if (cat.includes('evac') || cat.includes('emergency') || cat.includes('hazard')) {
        compiledDirective = `[EVACUATION FACILITY ACTIVATED] Evac Center: ${resEvacSite} (${resEvacueesCount} families). Unit: ${resPersonnel || 'MDRRMO Rescue'}. Instruksyon: ${resolutionRemarks.trim()}`;
      } else {
        compiledDirective = `[LGU DIRECTIVE ISSUED] ${resolutionRemarks.trim() || 'Aksyon naisagawa at verified ng Command Center.'}`;
      }

      const res = await fetch(`${API_BASE_URL}/incidents/${resolvingIncident._id}`, {
        method: 'PATCH',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          status: 'resolved',
          resolutionNotes: compiledDirective,
          resolutionDetails: structuredDetails,
        }),
      });
      if (res.ok) {
        const data = await res.json();
        setIncidents((prev) =>
          prev.map((inc) => (inc._id === resolvingIncident._id ? (data.incident || { ...inc, status: 'resolved', resolutionNotes: compiledDirective, resolutionDetails: structuredDetails }) : inc))
        );
        setResolvingIncident(null);
      }
    } catch (e) {
      console.error('Error resolving incident:', e);
    } finally {
      setSubmittingResolution(false);
    }
  };

  const filteredDups = selectedBrgy === 'all'
    ? duplicateLogs
    : duplicateLogs.filter(d => (d.barangay || d.barangayCode) === selectedBrgy);

  const filteredGaps = selectedBrgy === 'all'
    ? gapReport
    : gapReport.filter(g => g.barangayCode === selectedBrgy);

  // Filtered Incidents Directory
  const filteredIncidents = incidents.filter((inc) => {
    const bCode = inc.barangayCode || '';
    if (selectedBrgy !== 'all' && bCode !== selectedBrgy) return false;
    if (incidentTypeFilter !== 'all' && inc.incidentType !== incidentTypeFilter) return false;
    if (statusFilter !== 'all' && (inc.status || 'open') !== statusFilter) return false;
    if (incidentSearch.trim()) {
      const q = incidentSearch.toLowerCase();
      const matchNotes = (inc.notes || '').toLowerCase().includes(q);
      const matchReporter = (inc.reportedBy?.name || '').toLowerCase().includes(q);
      const matchType = (inc.incidentType || '').toLowerCase().includes(q);
      if (!matchNotes && !matchReporter && !matchType) return false;
    }
    return true;
  });

  const [dupPage, setDupPage] = useState(1);
  const [gapPage, setGapPage] = useState(1);
  const ITEMS_PER_PAGE = 8;

  useEffect(() => {
    setDupPage(1);
    setGapPage(1);
    setIncidentPage(1);
  }, [selectedBrgy, incidentTypeFilter, statusFilter, incidentSearch]);

  const paginatedDups = filteredDups.slice((dupPage - 1) * ITEMS_PER_PAGE, dupPage * ITEMS_PER_PAGE);
  const paginatedGaps = filteredGaps.slice((gapPage - 1) * ITEMS_PER_PAGE, gapPage * ITEMS_PER_PAGE);
  const paginatedIncidents = filteredIncidents.slice((incidentPage - 1) * ITEMS_PER_PAGE, incidentPage * ITEMS_PER_PAGE);

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

  const handleExportIncidentCSV = () => {
    const headers = ['Timestamp', 'Barangay', 'Category / Incident Type', 'Field Staff Reporter', 'Staff Role / Team', 'Incident Notes', 'Current Status', 'Resolution Remarks'];
    const rows = filteredIncidents.map(inc => [
      new Date(inc.createdAt).toLocaleString(),
      `Brgy ${inc.barangayCode || '291'}`,
      inc.incidentType,
      inc.reportedBy?.name || 'Field Staff',
      inc.reportedBy?.teamName || inc.reportedBy?.role || 'MDRRMO Field Operations',
      inc.notes,
      (inc.status || 'open').toUpperCase(),
      inc.resolutionNotes || 'None',
    ]);
    exportToCSV(`MitigatePlus_Manila_Field_Incident_Directory_${selectedBrgy}`, headers, rows);
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

      {/* ── Directory Tabs Switcher ── */}
      <div style={{
        display: 'flex',
        gap: '12px',
        borderBottom: '2px solid var(--border)',
        marginBottom: '24px',
        flexWrap: 'wrap',
      }}>
        <button
          onClick={() => {
            setActiveTab('audit');
            setSearchParams({});
          }}
          style={{
            padding: '12px 20px',
            fontSize: '14px',
            fontWeight: 800,
            background: 'none',
            border: 'none',
            borderBottom: activeTab === 'audit' ? '3px solid var(--manila-blue)' : '3px solid transparent',
            color: activeTab === 'audit' ? 'var(--manila-blue)' : 'var(--ink-soft)',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            transition: 'all 0.15s ease',
          }}
        >
          <FileText size={17} color={activeTab === 'audit' ? 'var(--manila-blue)' : 'currentColor'} />
          Master Disaster Audit & Gap Matrix
        </button>

        <button
          onClick={() => {
            setActiveTab('incidents');
            setSearchParams({ tab: 'incidents' });
          }}
          style={{
            padding: '12px 20px',
            fontSize: '14px',
            fontWeight: 800,
            background: 'none',
            border: 'none',
            borderBottom: activeTab === 'incidents' ? '3px solid #DC2626' : '3px solid transparent',
            color: activeTab === 'incidents' ? '#DC2626' : 'var(--ink-soft)',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            transition: 'all 0.15s ease',
          }}
        >
          <AlertTriangle size={17} color={activeTab === 'incidents' ? '#DC2626' : 'currentColor'} />
          Field Incident Reports Directory
          {incidents.filter(i => (i.status || 'open') === 'open').length > 0 && (
            <span style={{
              background: '#DC2626',
              color: '#FFFFFF',
              fontSize: '11px',
              fontWeight: 900,
              padding: '2px 8px',
              borderRadius: '999px',
              marginLeft: '4px',
            }}>
              {incidents.filter(i => (i.status || 'open') === 'open').length} OPEN
            </span>
          )}
        </button>
      </div>

      {/* ── TAB 1: MASTER DISASTER AUDIT & GAPS ── */}
      {activeTab === 'audit' && (
        <>
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
                  {paginatedDups.map((log) => (
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
              <Pagination
                currentPage={dupPage}
                totalItems={filteredDups.length}
                itemsPerPage={ITEMS_PER_PAGE}
                onPageChange={setDupPage}
              />
            </div>
          </div>

          {/* ── Assistance Gap Analysis Matrix ── */}
          <div className="clay-card" style={{ marginBottom: '24px' }}>
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
                    <th>Family Headcount</th>
                    <th>Priority Level</th>
                    <th>Assistance Gaps (Unfulfilled Relief Supplies)</th>
                  </tr>
                </thead>
                <tbody>
                  {paginatedGaps.map((item) => (
                    <tr key={item.id}>
                      <td style={{ fontSize: '13px', fontWeight: 600 }}>{item.address}</td>
                      <td>
                        <span style={{ background: 'var(--manila-blue-light)', color: 'var(--manila-blue)', fontSize: 11, fontWeight: 700, padding: '2px 8px', borderRadius: 999 }}>
                          Brgy {item.barangayCode}
                        </span>
                      </td>
                      <td style={{ fontSize: '13px', fontWeight: 700 }}>{item.memberCount} members</td>
                      <td>
                        <span className={`badge ${item.priorityLevel === 'High' ? 'badge-danger' : 'badge-neutral'}`}>
                          {item.priorityLevel} Priority
                        </span>
                      </td>
                      <td>
                        <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                          {item.gaps.map((gap, gIdx) => (
                            <span key={gIdx} style={{
                              background: '#FFFBEB',
                              border: '1px solid #FDE68A',
                              color: '#92400E',
                              fontSize: 11,
                              fontWeight: 700,
                              padding: '2px 8px',
                              borderRadius: 4,
                            }}>
                              {gap}
                            </span>
                          ))}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              <Pagination
                currentPage={gapPage}
                totalItems={filteredGaps.length}
                itemsPerPage={ITEMS_PER_PAGE}
                onPageChange={setGapPage}
              />
            </div>
          </div>

          {/* ── Official COA / DSWD Disaster Relief Liquidation & Beneficiary Masterlist ── */}
          <div className="clay-card" style={{ marginBottom: '24px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px', flexWrap: 'wrap', gap: '10px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <Package size={20} color="var(--manila-blue)" />
                <div>
                  <h2 style={{ fontSize: '16px', fontWeight: 800, color: 'var(--manila-blue)', margin: 0 }}>
                    Official COA / DSWD Disaster Relief Liquidation & Beneficiary Masterlist
                  </h2>
                  <span style={{ fontSize: 12, color: 'var(--ink-soft)' }}>
                    Exportable audit spreadsheet compliant with COA disaster expenditure guidelines
                  </span>
                </div>
              </div>
              <div style={{ display: 'flex', gap: 8 }}>
                <button
                  onClick={async () => {
                    try {
                      const res = await fetch(`${API_BASE_URL}/reports/coa-liquidation?barangayCode=${selectedBrgy}`, {
                        headers: { Authorization: `Bearer ${token}` },
                      });
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

            <div style={{ background: 'var(--sampaguita)', borderRadius: 'var(--radius-inner)', padding: '12px 16px', border: '1px solid var(--border)', fontSize: '12px', color: 'var(--ink)', display: 'flex', alignItems: 'flex-start', gap: 8 }}>
              <AlertCircle size={16} color="var(--manila-blue)" style={{ flexShrink: 0, marginTop: 1 }} />
              <span><strong>Government Audit Compliance Note:</strong> Ang masterlist na ito ay naglalaman ng eksaktong tala ng mga nakatanggap, kabilang ang <em>Receipt Reference Numbers</em>, <em>Head of Household Names</em>, <em>Family Sizes</em>, at <em>Disbursing Officers</em> na kinakailangan sa liquidation ng disaster funds ng Lungsod ng Maynila.</span>
            </div>
          </div>
        </>
      )}

      {/* ── TAB 2: FIELD INCIDENT REPORTS DIRECTORY ── */}
      {activeTab === 'incidents' && (
        <>
          {/* Incident KPI Cards */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '16px', marginBottom: '28px' }}>
            <MotionCard delay={0} className="clay-card" style={{ borderLeft: '4px solid var(--manila-blue)', padding: '20px' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '10px' }}>
                <span style={{ fontSize: '11px', fontWeight: 700, color: 'var(--ink-soft)', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                  Total Field Reports
                </span>
                <div style={{ width: 34, height: 34, borderRadius: 'var(--radius-inner)', background: 'var(--manila-blue-light)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <AlertTriangle size={18} color="var(--manila-blue)" />
                </div>
              </div>
              <div style={{ fontSize: '32px', fontWeight: 900, color: 'var(--manila-blue)', lineHeight: 1 }}>
                <MotionNumberCounter value={incidents.length} />
              </div>
            </MotionCard>

            <MotionCard delay={0.06} className="clay-card" style={{ borderLeft: '4px solid #DC2626', padding: '20px' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '10px' }}>
                <span style={{ fontSize: '11px', fontWeight: 700, color: 'var(--ink-soft)', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                  Open / Action Required
                </span>
                <div style={{ width: 34, height: 34, borderRadius: 'var(--radius-inner)', background: '#FEF2F2', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <AlertCircle size={18} color="#DC2626" />
                </div>
              </div>
              <div style={{ fontSize: '32px', fontWeight: 900, color: '#DC2626', lineHeight: 1 }}>
                <MotionNumberCounter value={incidents.filter(i => (i.status || 'open') === 'open').length} />
              </div>
            </MotionCard>

            <MotionCard delay={0.12} className="clay-card" style={{ borderLeft: '4px solid #D97706', padding: '20px' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '10px' }}>
                <span style={{ fontSize: '11px', fontWeight: 700, color: 'var(--ink-soft)', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                  Dispatched / In Progress
                </span>
                <div style={{ width: 34, height: 34, borderRadius: 'var(--radius-inner)', background: '#FFFBEB', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <Clock size={18} color="#D97706" />
                </div>
              </div>
              <div style={{ fontSize: '32px', fontWeight: 900, color: '#D97706', lineHeight: 1 }}>
                <MotionNumberCounter value={incidents.filter(i => i.status === 'acknowledged').length} />
              </div>
            </MotionCard>

            <MotionCard delay={0.18} className="clay-card" style={{ borderLeft: '4px solid #059669', padding: '20px' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '10px' }}>
                <span style={{ fontSize: '11px', fontWeight: 700, color: 'var(--ink-soft)', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                  Settled & Resolved
                </span>
                <div style={{ width: 34, height: 34, borderRadius: 'var(--radius-inner)', background: '#ECFDF5', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <CheckCircle size={18} color="#059669" />
                </div>
              </div>
              <div style={{ fontSize: '32px', fontWeight: 900, color: '#059669', lineHeight: 1 }}>
                <MotionNumberCounter value={incidents.filter(i => i.status === 'resolved').length} />
              </div>
            </MotionCard>
          </div>

          {/* Incident Directory Table Card */}
          <div className="clay-card" style={{ marginBottom: '24px' }}>
            {/* Header + Action Bar */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px', flexWrap: 'wrap', gap: '14px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <div style={{
                  width: 36, height: 36, borderRadius: '8px',
                  background: '#FEF2F2', display: 'flex', alignItems: 'center', justifyContent: 'center'
                }}>
                  <AlertTriangle size={20} color="#DC2626" />
                </div>
                <div>
                  <h2 style={{ fontSize: '16px', fontWeight: 800, color: 'var(--ink)', margin: 0 }}>
                    Field Incident Reports Directory
                  </h2>
                  <span style={{ fontSize: 12, color: 'var(--ink-soft)' }}>
                    Live on-ground reports from field leaders and distribution officers ({filteredIncidents.length} total)
                  </span>
                </div>
              </div>

              {/* Action Buttons */}
              <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
                <button
                  onClick={fetchIncidents}
                  disabled={loadingIncidents}
                  className="clay-button-secondary"
                  style={{ padding: '8px 14px', fontSize: '12px', gap: 6 }}
                  title="Reload Incidents"
                >
                  <RefreshCw size={14} className={loadingIncidents ? 'spin' : ''} />
                  Refresh
                </button>
                <button
                  onClick={handleExportIncidentCSV}
                  className="clay-button-primary"
                  style={{ padding: '8px 14px', fontSize: '12px', gap: 6 }}
                >
                  <Download size={14} /> Export Incident Directory (CSV)
                </button>
              </div>
            </div>

            {/* Filter and Search Bar */}
            <div style={{
              display: 'flex',
              gap: 12,
              marginBottom: 16,
              flexWrap: 'wrap',
              background: '#F8FAFC',
              padding: '12px 16px',
              borderRadius: 'var(--radius-inner)',
              border: '1px solid var(--border)',
              alignItems: 'center'
            }}>
              {/* Search input */}
              <div style={{ position: 'relative', flex: '1 1 220px', minWidth: 200 }}>
                <Search size={15} color="#94A3B8" style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)' }} />
                <input
                  type="text"
                  placeholder="Search notes, officer name, or type..."
                  value={incidentSearch}
                  onChange={(e) => setIncidentSearch(e.target.value)}
                  style={{
                    width: '100%',
                    padding: '8px 12px 8px 32px',
                    borderRadius: 6,
                    border: '1px solid #CBD5E1',
                    fontSize: 12.5,
                    color: 'var(--ink)',
                    background: '#FFFFFF',
                    outline: 'none',
                  }}
                />
              </div>

              {/* Category Filter */}
              <select
                value={incidentTypeFilter}
                onChange={(e) => setIncidentTypeFilter(e.target.value)}
                style={{
                  padding: '8px 12px',
                  borderRadius: 6,
                  border: '1px solid #CBD5E1',
                  fontSize: 12.5,
                  background: '#FFFFFF',
                  color: 'var(--ink)',
                  cursor: 'pointer',
                  outline: 'none',
                }}
              >
                <option value="all">All Incident Categories</option>
                <option value="Stock Shortage">Stock Shortage</option>
                <option value="Lost Citizen QR Pass">Lost Citizen QR Pass</option>
                <option value="Emergency Evacuation">Emergency Evacuation</option>
                <option value="Suspicious / Duplicate Claim Attempt">Suspicious / Duplicate Claim</option>
                <option value="Damaged Relief Package Stock">Damaged Relief Package</option>
                <option value="Crowd / Queue Disturbance at Booth">Crowd / Queue Disturbance</option>
                <option value="Unregistered Household Emergency Claim">Unregistered Household Claim</option>
                <option value="Other">Other Issues</option>
              </select>

              {/* Status Filter */}
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                style={{
                  padding: '8px 12px',
                  borderRadius: 6,
                  border: '1px solid #CBD5E1',
                  fontSize: 12.5,
                  background: '#FFFFFF',
                  color: 'var(--ink)',
                  cursor: 'pointer',
                  outline: 'none',
                }}
              >
                <option value="all">All Statuses</option>
                <option value="open">Open / Action Required</option>
                <option value="acknowledged">Dispatched / In Progress</option>
                <option value="resolved">Settled & Resolved</option>
              </select>
            </div>

            {/* Directory Table */}
            <div className="table-container">
              <table className="clay-table">
                <thead>
                  <tr>
                    <th>Timestamp</th>
                    <th>Barangay</th>
                    <th>Category</th>
                    <th>Reported By</th>
                    <th>Field Notes & Conditions</th>
                    <th>Status</th>
                    <th style={{ textAlign: 'right' }}>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {paginatedIncidents.length === 0 ? (
                    <tr>
                      <td colSpan={7} style={{ textAlign: 'center', padding: '40px 20px', color: 'var(--ink-soft)' }}>
                        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 10 }}>
                          <AlertTriangle size={36} color="#CBD5E1" />
                          <span style={{ fontSize: 14, fontWeight: 700, color: 'var(--ink)' }}>
                            Walang Naitalang Field Incident Reports
                          </span>
                          <span style={{ fontSize: 12, maxWidth: 400 }}>
                            Lahat ng reports na isusumite ng mga Field Staff at Team Leaders mula sa mobile app (Logger tab) ay awtomatikong lalabas dito nang real-time.
                          </span>
                        </div>
                      </td>
                    </tr>
                  ) : (
                    paginatedIncidents.map((inc) => {
                      const isEmergency = (inc.incidentType || '').toLowerCase().includes('emergency');
                      const isShortage = (inc.incidentType || '').toLowerCase().includes('shortage') || (inc.incidentType || '').toLowerCase().includes('stock');
                      const isLostPass = (inc.incidentType || '').toLowerCase().includes('pass') || (inc.incidentType || '').toLowerCase().includes('qr');

                      const badgeStyle = isEmergency
                        ? { bg: '#FEE2E2', border: '#FCA5A5', color: '#B91C1C' }
                        : isShortage
                        ? { bg: '#FEF3C7', border: '#FDE68A', color: '#B45309' }
                        : isLostPass
                        ? { bg: '#EFF6FF', border: '#BFDBFE', color: '#1D4ED8' }
                        : { bg: '#F1F5F9', border: '#E2E8F0', color: '#334155' };

                      const statusCfg = inc.status === 'resolved'
                        ? { bg: '#ECFDF5', border: '#A7F3D0', color: '#059669', label: 'RESOLVED' }
                        : inc.status === 'acknowledged'
                        ? { bg: '#FFFBEB', border: '#FDE68A', color: '#D97706', label: 'IN PROGRESS' }
                        : { bg: '#FEF2F2', border: '#FCA5A5', color: '#DC2626', label: 'OPEN' };

                      return (
                        <tr key={inc._id}>
                          {/* Timestamp */}
                          <td style={{ fontSize: '12px', whiteSpace: 'nowrap', color: 'var(--ink-soft)' }}>
                            <div style={{ fontWeight: 600, color: 'var(--ink)' }}>
                              {new Date(inc.createdAt).toLocaleDateString()}
                            </div>
                            <div style={{ fontSize: 11 }}>
                              {new Date(inc.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                            </div>
                          </td>

                          {/* Barangay */}
                          <td>
                            <span style={{
                              background: 'var(--manila-blue-light)',
                              color: 'var(--manila-blue)',
                              fontSize: 11,
                              fontWeight: 700,
                              padding: '3px 8px',
                              borderRadius: 999,
                              whiteSpace: 'nowrap',
                            }}>
                              Brgy {inc.barangayCode || '291'}
                            </span>
                          </td>

                          {/* Category Badge */}
                          <td>
                            <span style={{
                              background: badgeStyle.bg,
                              border: `1px solid ${badgeStyle.border}`,
                              color: badgeStyle.color,
                              fontSize: 11.5,
                              fontWeight: 800,
                              padding: '4px 10px',
                              borderRadius: 6,
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: 4,
                              whiteSpace: 'nowrap',
                            }}>
                              {inc.incidentType}
                            </span>
                          </td>

                          {/* Reported By */}
                          <td>
                            <div style={{ fontSize: '12.5px', fontWeight: 700, color: 'var(--ink)' }}>
                              {inc.reportedBy?.name || 'Field Officer Cruz'}
                            </div>
                            <div style={{ fontSize: '11px', color: 'var(--ink-soft)' }}>
                              {inc.reportedBy?.teamName || inc.reportedBy?.staffDesignation || 'MDRRMO Field Operations'}
                            </div>
                          </td>

                          {/* Notes */}
                          <td>
                            <div style={{ fontSize: '13px', fontWeight: 600, color: 'var(--ink)', maxWidth: 360, lineHeight: 1.4 }}>
                              {inc.notes}
                            </div>
                            {inc.resolutionNotes && (
                              <div style={{
                                marginTop: 6,
                                padding: '8px 10px',
                                background: '#F0FDF4',
                                border: '1px solid #BBF7D0',
                                borderRadius: 6,
                                fontSize: 11.5,
                                color: '#166534',
                              }}>
                                <div style={{ fontWeight: 800, marginBottom: 2, display: 'flex', alignItems: 'center', gap: 4 }}>
                                  <CheckCircle size={13} color="#059669" />
                                  LGU Command Directive / Resolution:
                                </div>
                                <div style={{ lineHeight: 1.35 }}>{inc.resolutionNotes}</div>
                                {inc.resolutionDetails && (inc.resolutionDetails.quantity > 0 || inc.resolutionDetails.evacSite || inc.resolutionDetails.beneficiaryName) && (
                                  <div style={{ marginTop: 5, display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                                    {inc.resolutionDetails.quantity > 0 && (
                                      <span style={{ background: '#DCFCE7', color: '#14532D', padding: '2px 7px', borderRadius: 4, fontWeight: 700, fontSize: 10.5 }}>
                                        {inc.resolutionDetails.quantity} {inc.resolutionDetails.itemType || 'Packs'}
                                      </span>
                                    )}
                                    {inc.resolutionDetails.sourceLocation && (
                                      <span style={{ background: '#DCFCE7', color: '#14532D', padding: '2px 7px', borderRadius: 4, fontSize: 10.5 }}>
                                        {inc.resolutionDetails.sourceLocation}
                                      </span>
                                    )}
                                    {inc.resolutionDetails.evacSite && (
                                      <span style={{ background: '#DCFCE7', color: '#14532D', padding: '2px 7px', borderRadius: 4, fontSize: 10.5 }}>
                                        Evac: {inc.resolutionDetails.evacSite} ({inc.resolutionDetails.evacueesCount} families)
                                      </span>
                                    )}
                                  </div>
                                )}
                              </div>
                            )}
                          </td>

                          {/* Status */}
                          <td>
                            <span style={{
                              background: statusCfg.bg,
                              border: `1px solid ${statusCfg.border}`,
                              color: statusCfg.color,
                              fontSize: 10.5,
                              fontWeight: 900,
                              padding: '3px 8px',
                              borderRadius: 4,
                              letterSpacing: '0.04em',
                              display: 'inline-block',
                            }}>
                              {statusCfg.label}
                            </span>
                          </td>

                          {/* Actions */}
                          <td style={{ textAlign: 'right', whiteSpace: 'nowrap' }}>
                            <div style={{ display: 'flex', gap: 6, justifyContent: 'flex-end', alignItems: 'center' }}>
                              {(inc.status || 'open') === 'open' && (
                                <button
                                  onClick={() => handleAcknowledgeIncident(inc._id)}
                                  className="clay-button-secondary"
                                  style={{ padding: '5px 10px', fontSize: '11px', gap: 4 }}
                                  title="Mark as Acknowledged / In Progress"
                                >
                                  <Clock size={12} /> Acknowledge
                                </button>
                              )}

                              {(inc.status || 'open') !== 'resolved' && (
                                <button
                                  onClick={() => handleOpenResolveModal(inc)}
                                  className="clay-button-primary"
                                  style={{ padding: '5px 10px', fontSize: '11px', gap: 4 }}
                                  title="Mark as Resolved"
                                >
                                  <Check size={12} /> Resolve
                                </button>
                              )}

                              {inc.status === 'resolved' && (
                                <span style={{ fontSize: 12, fontWeight: 700, color: '#059669', display: 'flex', alignItems: 'center', gap: 4 }}>
                                  <Check size={14} /> Settled
                                </span>
                              )}
                            </div>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
              <Pagination
                currentPage={incidentPage}
                totalItems={filteredIncidents.length}
                itemsPerPage={ITEMS_PER_PAGE}
                onPageChange={setIncidentPage}
              />
            </div>
          </div>
        </>
      )}

      {/* ── RESOLVE INCIDENT MODAL ── */}
      {resolvingIncident && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          width: '100vw',
          height: '100vh',
          background: 'rgba(15, 23, 42, 0.75)',
          backdropFilter: 'blur(16px)',
          WebkitBackdropFilter: 'blur(16px)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 999999,
          padding: '24px 16px',
          overflowY: 'auto',
        }}>
          <div style={{
            background: '#FFFFFF',
            borderRadius: 18,
            maxWidth: 620,
            width: '100%',
            padding: '26px',
            boxShadow: '0 25px 60px -15px rgba(0,0,0,0.5)',
            display: 'flex',
            flexDirection: 'column',
            gap: 16,
            maxHeight: '90vh',
            overflowY: 'auto',
          }}>
            {/* Modal Header */}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderBottom: '1px solid #E2E8F0', paddingBottom: 12 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <div style={{ width: 38, height: 38, borderRadius: 10, background: '#ECFDF5', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <CheckCircle size={20} color="#059669" />
                </div>
                <div>
                  <h3 style={{ margin: 0, fontSize: 17, fontWeight: 800, color: 'var(--ink)' }}>
                    Resolve Field Incident Report
                  </h3>
                  <span style={{ fontSize: 12, color: 'var(--ink-soft)' }}>
                    {resolvingIncident.incidentType} · Brgy {resolvingIncident.barangayCode || '291'}
                  </span>
                </div>
              </div>
              <button
                onClick={() => setResolvingIncident(null)}
                style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#64748B', padding: 4 }}
              >
                <X size={20} />
              </button>
            </div>

            {/* Original report summary box */}
            <div style={{ background: '#F8FAFC', border: '1px solid #E2E8F0', borderRadius: 10, padding: '12px 16px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                <span style={{ fontSize: 11, fontWeight: 800, color: '#475569', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                  Field Officer Report ({resolvingIncident.reportedBy?.name || 'Staff Scanner'})
                </span>
                <span style={{ fontSize: 11, color: '#64748B' }}>
                  {new Date(resolvingIncident.createdAt).toLocaleString()}
                </span>
              </div>
              <p style={{ margin: 0, fontSize: 13.5, color: 'var(--ink)', fontWeight: 600, lineHeight: 1.4 }}>
                "{resolvingIncident.notes}"
              </p>
            </div>

            {/* ── STOCK SHORTAGE / DAMAGED STOCK REQUIREMENTS ── */}
            {((resolvingIncident.incidentType || '').toLowerCase().includes('shortage') || (resolvingIncident.incidentType || '').toLowerCase().includes('stock')) && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                <div>
                  <label style={{ fontSize: 12, fontWeight: 800, color: 'var(--ink)', display: 'block', marginBottom: 6 }}>
                    Directiba / Paraan ng Resolusyon (Action Protocol) *
                  </label>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
                    <button
                      type="button"
                      onClick={() => {
                        setResActionType('office_pickup');
                        setResDispatchMethod('Staff Office Pickup with Voucher');
                        setResLocation('Manila City Hall Disaster Management Office (Room 102)');
                        setResolutionRemarks('Kumuha na kayo dito sa City Hall Disaster Office ng karagdagang relief stocks dala ang authorization voucher.');
                      }}
                      style={{
                        padding: '10px 12px',
                        borderRadius: 8,
                        border: resActionType === 'office_pickup' ? '2px solid #059669' : '1px solid #CBD5E1',
                        background: resActionType === 'office_pickup' ? '#ECFDF5' : '#FFFFFF',
                        color: resActionType === 'office_pickup' ? '#065F46' : 'var(--ink)',
                        fontWeight: 700,
                        fontSize: 12,
                        cursor: 'pointer',
                        textAlign: 'left',
                      }}
                    >
                      🏢 Kumuha sa Office / Staging
                      <div style={{ fontSize: 10.5, fontWeight: 400, opacity: 0.8, marginTop: 2 }}>
                        Staff will pickup shortage at LGU office
                      </div>
                    </button>

                    <button
                      type="button"
                      onClick={() => {
                        setResActionType('truck_dispatch');
                        setResDispatchMethod('MDRRMO Delivery Truck En Route');
                        setResLocation('Baseco Logistics Staging Warehouse');
                        setResolutionRemarks('Nagpadala na ng emergency replenishment truck papunta sa inyong evacuation/distribution booth.');
                      }}
                      style={{
                        padding: '10px 12px',
                        borderRadius: 8,
                        border: resActionType === 'truck_dispatch' ? '2px solid #059669' : '1px solid #CBD5E1',
                        background: resActionType === 'truck_dispatch' ? '#ECFDF5' : '#FFFFFF',
                        color: resActionType === 'truck_dispatch' ? '#065F46' : 'var(--ink)',
                        fontWeight: 700,
                        fontSize: 12,
                        cursor: 'pointer',
                        textAlign: 'left',
                      }}
                    >
                      🚚 Ipadala via Delivery Truck
                      <div style={{ fontSize: 10.5, fontWeight: 400, opacity: 0.8, marginTop: 2 }}>
                        Dispatch truck en route to site
                      </div>
                    </button>
                  </div>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                  <div>
                    <label style={{ fontSize: 12, fontWeight: 700, color: 'var(--ink)', display: 'block', marginBottom: 4 }}>
                      Ilan ang Kulang / Idadagdag (Quantity) *
                    </label>
                    <input
                      type="number"
                      min="1"
                      value={resQuantity}
                      onChange={(e) => setResQuantity(e.target.value)}
                      style={{
                        width: '100%',
                        padding: '9px 12px',
                        borderRadius: 8,
                        border: '1.5px solid #CBD5E1',
                        fontSize: 13,
                        outline: 'none',
                        fontWeight: 700,
                      }}
                    />
                  </div>

                  <div>
                    <label style={{ fontSize: 12, fontWeight: 700, color: 'var(--ink)', display: 'block', marginBottom: 4 }}>
                      Uri ng Relief Item *
                    </label>
                    <select
                      value={resItemType}
                      onChange={(e) => setResItemType(e.target.value)}
                      style={{
                        width: '100%',
                        padding: '9px 12px',
                        borderRadius: 8,
                        border: '1.5px solid #CBD5E1',
                        fontSize: 13,
                        background: '#FFF',
                        outline: 'none',
                      }}
                    >
                      <option value="Family Food Packs">Family Food Packs (FFP)</option>
                      <option value="Drinking Water (10L Jugs)">Drinking Water (10L Jugs)</option>
                      <option value="Hygiene & Sanitation Kits">Hygiene & Sanitation Kits</option>
                      <option value="Infant / Baby Packs">Infant / Baby Packs</option>
                      <option value="Emergency Rice Packs (10kg)">Emergency Rice Packs (10kg)</option>
                      <option value="Medical & First Aid Supplies">Medical & First Aid Supplies</option>
                    </select>
                  </div>
                </div>

                <div>
                  <label style={{ fontSize: 12, fontWeight: 700, color: 'var(--ink)', display: 'block', marginBottom: 4 }}>
                    Saan Kukunin o Mangagaling (Office / Warehouse Location) *
                  </label>
                  <select
                    value={resLocation}
                    onChange={(e) => setResLocation(e.target.value)}
                    style={{
                      width: '100%',
                      padding: '9px 12px',
                      borderRadius: 8,
                      border: '1.5px solid #CBD5E1',
                      fontSize: 13,
                      background: '#FFF',
                      outline: 'none',
                    }}
                  >
                    <option value="Manila City Hall Disaster Management Office (Room 102)">Manila City Hall Disaster Management Office (Room 102)</option>
                    <option value="Baseco Logistics Staging Warehouse">Baseco Logistics Staging Warehouse</option>
                    <option value="Sta. Cruz Central Distribution Depot">Sta. Cruz Central Distribution Depot</option>
                    <option value="Tondo District 1 Command Substation">Tondo District 1 Command Substation</option>
                    <option value="Sampaloc DRRM Buffer Storage">Sampaloc DRRM Buffer Storage</option>
                  </select>
                </div>
              </div>
            )}

            {/* ── LOST CITIZEN QR PASS / SUSPICIOUS CLAIM / UNREGISTERED ── */}
            {((resolvingIncident.incidentType || '').toLowerCase().includes('lost') || (resolvingIncident.incidentType || '').toLowerCase().includes('pass') || (resolvingIncident.incidentType || '').toLowerCase().includes('qr') || (resolvingIncident.incidentType || '').toLowerCase().includes('duplicate') || (resolvingIncident.incidentType || '').toLowerCase().includes('unregistered')) && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                <div>
                  <label style={{ fontSize: 12, fontWeight: 800, color: 'var(--ink)', display: 'block', marginBottom: 6 }}>
                    Verification & Re-Issuance Protocol *
                  </label>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
                    <button
                      type="button"
                      onClick={() => {
                        setResActionType('manual_verify');
                        setResolutionRemarks('Na-verify ang pagkakakilanlan sa masterlist gamit ang Valid ID. Pinayagang kumuha gamit ang emergency manual clearance voucher.');
                      }}
                      style={{
                        padding: '10px 12px',
                        borderRadius: 8,
                        border: resActionType === 'manual_verify' ? '2px solid #059669' : '1px solid #CBD5E1',
                        background: resActionType === 'manual_verify' ? '#ECFDF5' : '#FFFFFF',
                        color: resActionType === 'manual_verify' ? '#065F46' : 'var(--ink)',
                        fontWeight: 700,
                        fontSize: 12,
                        cursor: 'pointer',
                        textAlign: 'left',
                      }}
                    >
                      🪪 Manual Masterlist Verification
                      <div style={{ fontSize: 10.5, fontWeight: 400, opacity: 0.8, marginTop: 2 }}>
                        Verify with Gov ID & issue single-use pass
                      </div>
                    </button>

                    <button
                      type="button"
                      onClick={() => {
                        setResActionType('reissue_qr');
                        setResolutionRemarks('Nai-renew at na-reprint ang opisyal na QR Pass sa barangay command terminal. Na-invalidate ang lumang nawawalang pass.');
                      }}
                      style={{
                        padding: '10px 12px',
                        borderRadius: 8,
                        border: resActionType === 'reissue_qr' ? '2px solid #059669' : '1px solid #CBD5E1',
                        background: resActionType === 'reissue_qr' ? '#ECFDF5' : '#FFFFFF',
                        color: resActionType === 'reissue_qr' ? '#065F46' : 'var(--ink)',
                        fontWeight: 700,
                        fontSize: 12,
                        cursor: 'pointer',
                        textAlign: 'left',
                      }}
                    >
                      🔄 Re-issue / Re-print QR Pass
                      <div style={{ fontSize: 10.5, fontWeight: 400, opacity: 0.8, marginTop: 2 }}>
                        Renew QR security token & reprint card
                      </div>
                    </button>
                  </div>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                  <div>
                    <label style={{ fontSize: 12, fontWeight: 700, color: 'var(--ink)', display: 'block', marginBottom: 4 }}>
                      Pangalan ng Residente / Beneficiary *
                    </label>
                    <input
                      type="text"
                      placeholder="Hal. Juan Dela Cruz"
                      value={resBeneficiaryName}
                      onChange={(e) => setResBeneficiaryName(e.target.value)}
                      style={{
                        width: '100%',
                        padding: '9px 12px',
                        borderRadius: 8,
                        border: '1.5px solid #CBD5E1',
                        fontSize: 13,
                        outline: 'none',
                        fontWeight: 600,
                      }}
                    />
                  </div>

                  <div>
                    <label style={{ fontSize: 12, fontWeight: 700, color: 'var(--ink)', display: 'block', marginBottom: 4 }}>
                      Valid ID na Ipinakita *
                    </label>
                    <select
                      value={resIdPresented}
                      onChange={(e) => setResIdPresented(e.target.value)}
                      style={{
                        width: '100%',
                        padding: '9px 12px',
                        borderRadius: 8,
                        border: '1.5px solid #CBD5E1',
                        fontSize: 13,
                        background: '#FFF',
                        outline: 'none',
                      }}
                    >
                      <option value="PhilSys National ID">PhilSys National ID</option>
                      <option value="COMELEC Voter's ID / Certification">COMELEC Voter's ID / Certification</option>
                      <option value="Barangay Certificate of Indigency">Barangay Certificate of Indigency</option>
                      <option value="Senior Citizen ID">Senior Citizen ID</option>
                      <option value="PWD ID Card">PWD ID Card</option>
                      <option value="Driver's License / UMID">Driver's License / UMID</option>
                    </select>
                  </div>
                </div>
              </div>
            )}

            {/* ── EMERGENCY EVACUATION / SITE DISTURBANCE / SAFETY HAZARD ── */}
            {((resolvingIncident.incidentType || '').toLowerCase().includes('evac') || (resolvingIncident.incidentType || '').toLowerCase().includes('emergency') || (resolvingIncident.incidentType || '').toLowerCase().includes('hazard') || (resolvingIncident.incidentType || '').toLowerCase().includes('crowd')) && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                <div style={{ display: 'grid', gridTemplateColumns: '1.4fr 1fr', gap: 12 }}>
                  <div>
                    <label style={{ fontSize: 12, fontWeight: 700, color: 'var(--ink)', display: 'block', marginBottom: 4 }}>
                      Itinalagang Evacuation Center / Safe Post *
                    </label>
                    <input
                      type="text"
                      placeholder="Hal. Brgy 291 Covered Basketball Court"
                      value={resEvacSite}
                      onChange={(e) => setResEvacSite(e.target.value)}
                      style={{
                        width: '100%',
                        padding: '9px 12px',
                        borderRadius: 8,
                        border: '1.5px solid #CBD5E1',
                        fontSize: 13,
                        outline: 'none',
                      }}
                    />
                  </div>

                  <div>
                    <label style={{ fontSize: 12, fontWeight: 700, color: 'var(--ink)', display: 'block', marginBottom: 4 }}>
                      Bilang ng Pamilyang Nailikas *
                    </label>
                    <input
                      type="number"
                      min="1"
                      value={resEvacueesCount}
                      onChange={(e) => setResEvacueesCount(e.target.value)}
                      style={{
                        width: '100%',
                        padding: '9px 12px',
                        borderRadius: 8,
                        border: '1.5px solid #CBD5E1',
                        fontSize: 13,
                        outline: 'none',
                        fontWeight: 700,
                      }}
                    />
                  </div>
                </div>

                <div>
                  <label style={{ fontSize: 12, fontWeight: 700, color: 'var(--ink)', display: 'block', marginBottom: 4 }}>
                    Dispatched Units / Responders on Site *
                  </label>
                  <input
                    type="text"
                    placeholder="Hal. MDRRMO Quick Response Alpha & BFP Manila"
                    value={resPersonnel}
                    onChange={(e) => setResPersonnel(e.target.value)}
                    style={{
                      width: '100%',
                      padding: '9px 12px',
                      borderRadius: 8,
                      border: '1.5px solid #CBD5E1',
                      fontSize: 13,
                      outline: 'none',
                    }}
                  />
                </div>
              </div>
            )}

            {/* Resolution remarks input */}
            <div>
              <label style={{ fontSize: 12, fontWeight: 700, color: 'var(--ink)', display: 'block', marginBottom: 6 }}>
                Opisyal na Direktiba / Mensahe para sa Field Staff *
              </label>
              <textarea
                placeholder="Hal. Kumuha na kayo dito sa LGU Disaster Office ng 50 packs..."
                value={resolutionRemarks}
                onChange={(e) => setResolutionRemarks(e.target.value)}
                rows={3}
                style={{
                  width: '100%',
                  padding: '10px 12px',
                  borderRadius: 8,
                  border: '1.5px solid #CBD5E1',
                  fontSize: 13,
                  outline: 'none',
                  fontFamily: 'inherit',
                  resize: 'vertical',
                }}
              />
            </div>

            {/* Modal Buttons */}
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10, marginTop: 6 }}>
              <button
                onClick={() => setResolvingIncident(null)}
                className="clay-button-secondary"
                style={{ padding: '9px 18px', fontSize: 13 }}
                disabled={submittingResolution}
              >
                Cancel
              </button>
              <button
                onClick={handleConfirmResolve}
                className="clay-button-primary"
                style={{ padding: '9px 20px', fontSize: 13, gap: 6, background: '#059669', borderColor: '#059669' }}
                disabled={submittingResolution}
              >
                {submittingResolution ? <RefreshCw size={14} className="spin" /> : <Check size={14} />}
                Confirm & Mark Resolved
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

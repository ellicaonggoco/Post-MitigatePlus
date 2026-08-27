import React, { useState, useEffect, useContext } from 'react';
import { AuthContext } from '../context/AuthContext';
import { ROLES } from '../utils/roleUtils';
import { Star, Plus, CheckCircle, Clock, XCircle, Users, UserCheck, Send, Bell, Inbox, Smartphone } from 'lucide-react';
import ConfirmModal from '../components/ConfirmModal';
import { API_BASE_URL } from '../config';
import { MotionCard, MotionButton } from '../components/motion';

const STATUS_CONFIG = {
  Pending: { color: '#D97706', bg: '#FFFBEB', icon: Clock },
  Approved: { color: '#2563EB', bg: '#EFF6FF', icon: CheckCircle },
  Fulfilled: { color: '#158A64', bg: 'rgba(21,138,100,0.1)', icon: CheckCircle },
  Rejected: { color: '#DC2626', bg: '#FEF2F2', icon: XCircle },
};

export default function SpecialRequestRelief() {
  const { token, user } = useContext(AuthContext);
  const role = user?.role;
  const isLguAdmin = role === ROLES.LGU_ADMIN || role === ROLES.LGU_SUPERADMIN;
  const isBarangay = role === ROLES.BARANGAY_OFFICIAL;

  const [activeTab, setActiveTab] = useState('pending'); // 'pending' | 'approved'
  const [selectedCategoryFilter, setSelectedCategoryFilter] = useState('all'); // 'all' | 'food' | 'water' | 'medical' | 'infant' | 'senior'

  const [requests, setRequests] = useState([]);
  const [demandSummary, setDemandSummary] = useState({
    categories: {
      food: { id: 'food', name: 'Food Packs', count: 0, icon: '🍚', color: '#1557B0', bg: '#EFF6FF' },
      water: { id: 'water', name: 'Water Containers', count: 0, icon: '💧', color: '#0284C7', bg: '#E0F2FE' },
      medical: { id: 'medical', name: 'Medical Kits', count: 0, icon: '💊', color: '#DC2626', bg: '#FEF2F2' },
      infant: { id: 'infant', name: 'Infant Packs', count: 0, icon: '👶', color: '#D97706', bg: '#FFFBEB' },
      senior: { id: 'senior', name: 'Senior Care Kits', count: 0, icon: '🧓', color: '#7C3AED', bg: '#F5F3FF' },
    },
    totalRequests: 0,
  });
  const [staffList, setStaffList] = useState([]);
  const [focusedReqId, setFocusedReqId] = useState(null);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ residentName: '', address: '', reason: '', items: '', members: '' });
  const [assignStaff, setAssignStaff] = useState({});
  const [successToast, setSuccessToast] = useState('');

  // ── Confirm Modal State ──
  const [confirmModal, setConfirmModal] = useState({ isOpen: false, reqId: null, actionType: '', targetName: '', staffName: '', customTitle: '', customMessage: '' });

  useEffect(() => {
    const fetchRequestsAndSummary = async () => {
      try {
        const [resReq, resSummary, resStaff] = await Promise.all([
          fetch(`${API_BASE_URL}/assistance-requests`, {
            headers: { Authorization: 'Bearer ' + token, 'Content-Type': 'application/json' }
          }),
          fetch(`${API_BASE_URL}/assistance-requests/demand-summary`, {
            headers: { Authorization: 'Bearer ' + token, 'Content-Type': 'application/json' }
          }).catch(() => null),
          fetch(`${API_BASE_URL}/auth/provisioned-users`, {
            headers: { Authorization: 'Bearer ' + token, 'Content-Type': 'application/json' }
          }).catch(() => null),
        ]);

        const data = await resReq.json();
        if (resReq.ok && Array.isArray(data)) {
          setRequests(data);
        } else {
          setRequests([]);
        }

        if (resStaff && resStaff.ok) {
          const staffData = await resStaff.json();
          if (Array.isArray(staffData)) {
            const filteredStaff = staffData.filter(u => u.role === 'field_staff');
            if (filteredStaff.length > 0) {
              setStaffList(filteredStaff.map(s => ({
                id: s._id || s.id,
                name: s.name,
                team: s.teamName || 'Field Response Alpha',
                designation: s.staffDesignation || 'Field Officer',
                barangay: s.barangayCode || 'City-Wide',
              })));
            } else {
              setStaffList([
                { id: 'fs-1', name: 'Officer Ricardo Dalisay', designation: 'Team Leader', team: 'Field Response Alpha', barangay: '291' },
                { id: 'fs-2', name: 'Officer Maria Elena Santos', designation: 'Field Medic', team: 'Quick Response Team', barangay: '291' },
                { id: 'fs-3', name: 'Officer Juan Ramos', designation: 'Door-to-Door Logistics', team: 'Zone 35 Dispatch', barangay: '291' },
                { id: 'fs-4', name: 'Officer Carlo Mendoza', designation: 'Relief Inspector', team: 'MDRRMO Response', barangay: '291' },
              ]);
            }
          }
        } else {
          setStaffList([
            { id: 'fs-1', name: 'Officer Ricardo Dalisay', designation: 'Team Leader', team: 'Field Response Alpha', barangay: '291' },
            { id: 'fs-2', name: 'Officer Maria Elena Santos', designation: 'Field Medic', team: 'Quick Response Team', barangay: '291' },
            { id: 'fs-3', name: 'Officer Juan Ramos', designation: 'Door-to-Door Logistics', team: 'Zone 35 Dispatch', barangay: '291' },
            { id: 'fs-4', name: 'Officer Carlo Mendoza', designation: 'Relief Inspector', team: 'MDRRMO Response', barangay: '291' },
          ]);
        }

        if (resSummary && resSummary.ok) {
          const summaryData = await resSummary.json();
          if (summaryData && summaryData.categories) {
            setDemandSummary(summaryData);
          }
        } else if (Array.isArray(data)) {
          const counts = { food: 0, water: 0, medical: 0, infant: 0, senior: 0 };
          data.forEach(r => {
            const str = `${r.itemType || ''} ${r.notes || ''}`.toLowerCase();
            if (str.includes('food') || str.includes('pagkain') || str.includes('bigas') || str.includes('pack')) counts.food++;
            if (str.includes('water') || str.includes('tubig')) counts.water++;
            if (str.includes('med') || str.includes('gamot')) counts.medical++;
            if (str.includes('infant') || str.includes('baby') || str.includes('gatas') || str.includes('diaper')) counts.infant++;
            if (str.includes('senior') || str.includes('hygiene')) counts.senior++;
          });
          setDemandSummary({
            totalRequests: data.length,
            categories: {
              food: { id: 'food', name: 'Food Packs', count: counts.food, icon: '🍚', color: '#1557B0', bg: '#EFF6FF' },
              water: { id: 'water', name: 'Water Containers', count: counts.water, icon: '💧', color: '#0284C7', bg: '#E0F2FE' },
              medical: { id: 'medical', name: 'Medical Kits', count: counts.medical, icon: '💊', color: '#DC2626', bg: '#FEF2F2' },
              infant: { id: 'infant', name: 'Infant Packs', count: counts.infant, icon: '👶', color: '#D97706', bg: '#FFFBEB' },
              senior: { id: 'senior', name: 'Senior Care Kits', count: counts.senior, icon: '🧓', color: '#7C3AED', bg: '#F5F3FF' },
            }
          });
        }
      } catch (e) {
        console.error(e);
        setRequests([]);
      }
    };
    if (token) fetchRequestsAndSummary();
  }, [token]);

  const saveRequests = (newList) => {
    setRequests(newList);
  };

  const handleSubmit = async () => {
    if (!form.residentName.trim() || !form.address.trim() || !form.reason.trim()) return;
    const newReq = {
      barangay: user?.barangayCode || '291',
      requestedBy: `Hon. ${user?.name?.split(' ')[0] || 'Official'}`,
      resident: form.residentName.trim(),
      fullName: form.residentName.trim(),
      address: form.address.trim(),
      reason: form.reason.trim(),
      notes: `${form.reason.trim()} • Address: ${form.address.trim()}`,
      items: form.items.trim() || 'All-in-One Family Relief Pack',
      itemType: form.items.trim() || 'All-in-One Family Relief Pack',
      members: form.members || '1',
      status: 'Pending',
      assignedStaff: '',
    };
    try {
      const res = await fetch(`${API_BASE_URL}/assistance-requests`, {
        method: 'POST',
        headers: { Authorization: 'Bearer ' + token, 'Content-Type': 'application/json' },
        body: JSON.stringify(newReq)
      });
      if (res.ok) {
        const created = await res.json();
        setRequests(prev => [created, ...prev]);
        setForm({ residentName: '', address: '', reason: '', items: '', members: '' });
        setShowForm(false);
        setSuccessToast('✓ Na-submit na ang bagong Special Relief Request!');
      }
    } catch (e) {
      console.error(e);
    }
  };

  const requestApproveModal = (req) => {
    const chosenStaff = (assignStaff[req.id || req._id] || '').trim();
    if (!chosenStaff) {
      setConfirmModal({
        isOpen: true,
        reqId: null,
        actionType: 'warning_no_staff',
        targetName: req.resident || req.fullName || 'Resident',
        staffName: '',
        customTitle: '⚠️ Kailangan ng Naka-assign na Field Officer',
        customMessage: 'Hindi maaaring i-dispatch ang door-to-door relief kung walang naka-assign na Field Staff! Pakipili o i-type ang pangalan ng opisyal na magde-deliver mula sa listahan bago i-click ang Approve & Dispatch.',
      });
      return;
    }
    setConfirmModal({
      isOpen: true,
      reqId: req.id || req._id,
      actionType: 'approve',
      targetName: req.resident || req.fullName || 'Resident',
      staffName: chosenStaff,
    });
  };

  const requestRejectModal = (req) => {
    setConfirmModal({
      isOpen: true,
      reqId: req.id || req._id,
      actionType: 'reject',
      targetName: req.resident || req.fullName || 'Resident',
      staffName: '',
    });
  };

  const executeAction = async () => {
    const { reqId, actionType, staffName } = confirmModal;
    if (!reqId) {
      setConfirmModal({ isOpen: false, reqId: null, actionType: '', targetName: '', staffName: '' });
      return;
    }

    try {
      if (actionType === 'approve') {
        const res = await fetch(`${API_BASE_URL}/assistance-requests/${reqId}`, {
          method: 'PATCH',
          headers: { Authorization: 'Bearer ' + token, 'Content-Type': 'application/json' },
          body: JSON.stringify({ status: 'Approved', notes: `Assigned to ${staffName}` })
        });
        if (res.ok) {
          const updated = requests.map(r => (r.id === reqId || r._id === reqId) ? { ...r, status: 'Approved', assignedStaff: staffName } : r);
          saveRequests(updated);
          setSuccessToast(`✓ Approved! Task sent to Field Staff Mobile App under "Special Request Assignment" for ${staffName}.`);
        }
      } else if (actionType === 'reject') {
        const res = await fetch(`${API_BASE_URL}/assistance-requests/${reqId}`, {
          method: 'PATCH',
          headers: { Authorization: 'Bearer ' + token, 'Content-Type': 'application/json' },
          body: JSON.stringify({ status: 'Rejected', notes: '' })
        });
        if (res.ok) {
          const updated = requests.map(r => (r.id === reqId || r._id === reqId) ? { ...r, status: 'Rejected' } : r);
          saveRequests(updated);
          setSuccessToast('Special request rejected.');
        }
      }
    } catch (e) {
      console.error(e);
    }

    setConfirmModal({ isOpen: false, reqId: null, actionType: '', targetName: '', staffName: '' });
  };

  const visible = isBarangay ? requests.filter(r => r.barangay === (user?.barangayCode || '291')) : requests;
  const filteredByCategory = visible.filter(r => {
    if (selectedCategoryFilter === 'all') return true;
    const str = `${r.itemType || ''} ${r.notes || ''}`.toLowerCase();
    const hasPkgs = Array.isArray(r.packages) && r.packages.length > 0;
    if (hasPkgs) {
      return r.packages.some(p => (p.id || p.name || '').toLowerCase().includes(selectedCategoryFilter));
    }
    return str.includes(selectedCategoryFilter);
  });

  const pendingRequests = filteredByCategory.filter(r => (r.status || '').toLowerCase() === 'pending');
  const processedRequests = filteredByCategory.filter(r => (r.status || '').toLowerCase() !== 'pending');

  return (
    <div className="page-container page-animate">
      {/* Universal Double Confirmation Modal */}
      <ConfirmModal
        isOpen={confirmModal.isOpen}
        title={
          confirmModal.actionType === 'warning_no_staff'
            ? confirmModal.customTitle
            : confirmModal.actionType === 'approve'
            ? 'I-approve & I-assign sa Staff Mobile App?'
            : 'I-reject ang Special Request?'
        }
        message={
          confirmModal.actionType === 'warning_no_staff'
            ? confirmModal.customMessage
            : confirmModal.actionType === 'approve'
            ? `Sigurado ka bang gusto mong I-APPROVE ang ayuda request para kay "${confirmModal.targetName}" at I-ASSIGN kay "${confirmModal.staffName}"? Lalabas ito sa kanyang Field Staff Mobile App screen na "Special Request Assignment".`
            : `Sigurado ka bang gusto mong I-REJECT ang ayuda request para kay "${confirmModal.targetName}"?`
        }
        type={confirmModal.actionType === 'warning_no_staff' ? 'warning' : confirmModal.actionType === 'approve' ? 'success' : 'danger'}
        confirmText={
          confirmModal.actionType === 'warning_no_staff'
            ? 'Naiintindihan (Pumili ng Staff)'
            : confirmModal.actionType === 'approve'
            ? 'Oo, Approve & Send to Mobile App'
            : 'Oo, Reject Request'
        }
        onConfirm={executeAction}
        onCancel={() => setConfirmModal({ isOpen: false, reqId: null, actionType: '', targetName: '', staffName: '' })}
      />

      {/* ── Page Header ── */}
      <div className="workflow-header" style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 20, flexWrap: 'wrap', gap: 16 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
          <div style={{ width: 48, height: 48, borderRadius: 'var(--radius-inner)', background: 'linear-gradient(135deg, #D97706, #B45309)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <Star size={24} color="#fff" />
          </div>
          <div>
            <h1 className="section-header" style={{ margin: 0, fontSize: 22 }}>Special Relief Requests & Demand Hub</h1>
            <p style={{ fontSize: 13, color: 'var(--ink-soft)', marginTop: 2 }}>
              {isBarangay ? `Request extra relief for residents of Barangay ${user?.barangayCode} who cannot access the app.` : 'Aggregated citizen demand summary for batch warehouse packaging & door-to-door field dispatch.'}
            </p>
          </div>
        </div>
        {isBarangay && (
          <button onClick={() => setShowForm(!showForm)} className="clay-button-primary" style={{ fontSize: 13, gap: 6 }}>
            <Plus size={15} /> New Request
          </button>
        )}
      </div>

      {successToast && (
        <div className="clay-card" style={{ marginBottom: 20, borderLeft: '4px solid var(--bay-teal)', background: 'var(--bay-teal-light)', color: 'var(--bay-teal-deep)', padding: '12px 16px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <span style={{ fontSize: 13, fontWeight: 700 }}>{successToast}</span>
          <button onClick={() => setSuccessToast('')} style={{ background: 'none', border: 'none', cursor: 'pointer', fontWeight: 800, color: 'var(--bay-teal-deep)' }}>✕</button>
        </div>
      )}

      {/* ── Aggregated Relief Demand Summary (Warehouse & Staff Batch Pre-Pack) ── */}
      <div style={{ marginBottom: 24 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
          <h3 style={{ fontSize: 14, fontWeight: 800, color: 'var(--ink)', textTransform: 'uppercase', letterSpacing: '0.05em', margin: 0 }}>
            📦 Batch Warehouse Demand Summary (Total Packs to Prepare)
          </h3>
          <span style={{ fontSize: 12, color: 'var(--ink-soft)', fontWeight: 600 }}>
            Active Household Requests: <strong>{demandSummary.totalRequests || visible.length}</strong>
          </span>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(170px, 1fr))', gap: 12 }}>
          {Object.entries(demandSummary.categories || {}).map(([key, cat]) => {
            const isFilterActive = selectedCategoryFilter === key;
            return (
              <div
                key={key}
                onClick={() => setSelectedCategoryFilter(prev => prev === key ? 'all' : key)}
                className="clay-card"
                style={{
                  padding: '14px 16px',
                  background: isFilterActive ? cat.bg || '#F1F5F9' : 'var(--card)',
                  border: `2px solid ${isFilterActive ? cat.color || 'var(--manila-blue)' : 'var(--border)'}`,
                  cursor: 'pointer',
                  transition: 'all 0.15s ease',
                  boxShadow: isFilterActive ? '0 4px 12px rgba(0,0,0,0.08)' : 'none',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6 }}>
                  <span style={{ fontSize: 22 }}>{cat.icon || '📦'}</span>
                  <span style={{ fontSize: 18, fontWeight: 900, color: cat.color || 'var(--ink)' }}>
                    {cat.count}
                  </span>
                </div>
                <div style={{ fontSize: 13, fontWeight: 800, color: 'var(--ink)' }}>{cat.name}</div>
                <div style={{ fontSize: 11, color: 'var(--ink-soft)', marginTop: 2 }}>
                  {isFilterActive ? '✓ Filtering' : 'Click to filter list'}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* ── Filter / Tabs Bar ── */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 10, marginBottom: 20 }}>
        <div style={{ display: 'flex', gap: 10 }}>
          <button
            onClick={() => setActiveTab('pending')}
            className={activeTab === 'pending' ? 'clay-button-primary' : 'clay-button-ghost'}
            style={{ fontSize: 13, padding: '8px 16px', display: 'flex', alignItems: 'center', gap: 8 }}
          >
            <Inbox size={16} />
            Pending Requests ({pendingRequests.length})
          </button>
          <button
            onClick={() => setActiveTab('approved')}
            className={activeTab === 'approved' ? 'clay-button-primary' : 'clay-button-ghost'}
            style={{ fontSize: 13, padding: '8px 16px', display: 'flex', alignItems: 'center', gap: 8 }}
          >
            <Smartphone size={16} />
            Approved & Sent to Mobile Staff ({processedRequests.length})
          </button>
        </div>

        {selectedCategoryFilter !== 'all' && (
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, background: 'var(--manila-blue-light)', padding: '4px 10px', borderRadius: 999 }}>
            <span style={{ fontSize: 12, fontWeight: 700, color: 'var(--manila-blue)' }}>
              Filtered: {demandSummary.categories[selectedCategoryFilter]?.name}
            </span>
            <button
              onClick={() => setSelectedCategoryFilter('all')}
              style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 12, fontWeight: 800, color: 'var(--manila-blue)' }}
            >
              ✕ Clear
            </button>
          </div>
        )}
      </div>

      {showForm && isBarangay && (
        <div className="clay-card" style={{ marginBottom: 24, borderLeft: '4px solid #D97706' }}>
          <h3 style={{ fontSize: 16, fontWeight: 800, marginBottom: 14, color: 'var(--ink)' }}>New Special Relief Request</h3>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(210px, 1fr))', gap: 12, marginBottom: 14 }}>
            {[
              { key: 'residentName', label: 'Resident Full Name', placeholder: 'e.g. Lola Teresa Santos' },
              { key: 'address', label: 'Complete Address & Purok', placeholder: 'e.g. 78 Soler St, Purok 3' },
              { key: 'reason', label: 'Reason / Special Need', placeholder: 'e.g. Bedridden Senior, PWD, no smartphone' },
              { key: 'items', label: 'Relief Items Needed', placeholder: 'e.g. Food Pack, Maintenance Meds, Water' },
              { key: 'members', label: 'Household Member Count', placeholder: 'e.g. 4', type: 'number' },
            ].map(f => (
              <div key={f.key}>
                <label style={{ fontSize: 11, fontWeight: 700, color: 'var(--ink-soft)', textTransform: 'uppercase', letterSpacing: '0.06em', display: 'block', marginBottom: 4 }}>{f.label}</label>
                <input type={f.type || 'text'} placeholder={f.placeholder} value={form[f.key]} onChange={e => setForm(p => ({ ...p, [f.key]: e.target.value }))}
                  style={{ width: '100%', padding: '9px 12px', borderRadius: 'var(--radius-inner)', border: '1px solid var(--border)', fontSize: 13, outline: 'none', fontFamily: 'var(--font-sans)', background: 'var(--card)', color: 'var(--ink)', boxSizing: 'border-box' }} />
              </div>
            ))}
          </div>
          <div style={{ display: 'flex', gap: 10 }}>
            <button onClick={handleSubmit} className="clay-button-approve" style={{ fontSize: 13 }}>Submit Request</button>
            <button onClick={() => setShowForm(false)} className="clay-button-ghost" style={{ fontSize: 13 }}>Cancel</button>
          </div>
        </div>
      )}

      {/* ── Datalist for Clean Type/Select Autocomplete ── */}
      <datalist id="staff-options-list">
        {staffList.map((staff, idx) => (
          <option key={idx} value={staff.name} />
        ))}
      </datalist>

      <div style={{ display: 'grid', gap: 14 }}>
        {(activeTab === 'pending' ? pendingRequests : processedRequests).length === 0 ? (
          <div className="clay-card" style={{ textAlign: 'center', padding: '48px 24px' }}>
            <Star size={36} color="var(--ink-soft)" style={{ margin: '0 auto 12px', display: 'block' }} />
            <h2 style={{ fontSize: 16, fontWeight: 800, color: 'var(--ink)', margin: '0 0 4px' }}>
              {activeTab === 'pending' ? 'Walang Pending Special Requests' : 'Walang Processed Requests'}
            </h2>
            <p style={{ fontSize: 13, color: 'var(--ink-soft)', margin: 0 }}>
              {activeTab === 'pending'
                ? 'Lahat ng special relief requests mula sa mga barangay ay na-review na.'
                : 'Lahat ng approved requests ay naipasa na sa Field Staff Mobile App.'}
            </p>
          </div>
        ) : (
          (activeTab === 'pending' ? pendingRequests : processedRequests).map((req, idx) => {
            const statusKey = (req.status || 'Pending').charAt(0).toUpperCase() + (req.status || 'pending').slice(1).toLowerCase();
            const cfg = STATUS_CONFIG[statusKey] || STATUS_CONFIG.Pending;
            const StatusIcon = cfg.icon;
            const residentName = req.resident || req.householdId?.headOfHouseholdUserId?.name || req.fullName || req.residentName || 'Resident';
            const brgyCode = req.barangay || req.householdId?.barangayCode || '291';
            const address = req.householdId?.address || 'Barangay 291, Manila';
            const requestedBy = typeof req.requestedBy === 'object' ? req.requestedBy?.name : (req.requestedBy || 'Resident / Official');
            const assignedStaffName = typeof req.assignedStaff === 'object' ? req.assignedStaff?.name : req.assignedStaff;
            const memberCount = req.members || req.householdId?.memberCount || 1;
            const reasonText = req.reason || req.notes || req.description || 'Special relief assistance needed';
            const itemsText = req.items || req.itemType || 'Family Food Pack';

            // Extract individual package items
            const parsedPackages = Array.isArray(req.packages) && req.packages.length > 0
              ? req.packages
              : itemsText.split(',').map(name => ({ id: name.trim().toLowerCase(), name: name.trim() }));

            return (
              <MotionCard key={req.id || req._id || idx} delay={idx * 0.06} className="clay-card" style={{ borderLeft: `4px solid ${cfg.color}` }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 12, marginBottom: 10 }}>
                  <div style={{ flex: 1, minWidth: 260 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
                      <Star size={15} color={cfg.color} />
                      <span style={{ fontSize: 16, fontWeight: 800, color: 'var(--ink)' }}>{residentName}</span>
                      <span style={{ background: cfg.bg, color: cfg.color, fontSize: 11, fontWeight: 700, padding: '3px 10px', borderRadius: 999, display: 'inline-flex', alignItems: 'center', gap: 5 }}>
                        <StatusIcon size={12} /> {req.status || 'Pending'}
                      </span>
                    </div>
                    <div style={{ fontSize: 13, color: 'var(--ink-soft)', marginBottom: 6 }}>
                      <strong>Brgy {brgyCode}</strong> &nbsp;·&nbsp; {address} &nbsp;·&nbsp; <Users size={12} style={{ verticalAlign: 'middle' }} /> {memberCount} members &nbsp;·&nbsp; By: {requestedBy}
                    </div>

                    {/* Specific Requested Package Chips */}
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginBottom: 8 }}>
                      {parsedPackages.map((pkg, pidx) => (
                        <span
                          key={pidx}
                          style={{
                            background: '#EFF6FF',
                            border: '1px solid #BFDBFE',
                            color: '#1E40AF',
                            fontSize: 11.5,
                            fontWeight: 700,
                            padding: '3px 8px',
                            borderRadius: 6,
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: 4,
                          }}
                        >
                          ✓ {pkg.name}
                        </span>
                      ))}
                    </div>

                    <div style={{ fontSize: 13, color: 'var(--ink-soft)' }}>
                      Note/Vulnerability: <span style={{ color: 'var(--ink)', fontStyle: 'italic' }}>{reasonText}</span>
                    </div>

                    {assignedStaffName && (
                      <div style={{ display: 'inline-flex', alignItems: 'center', gap: 6, background: 'var(--manila-blue-light)', color: 'var(--manila-blue)', fontSize: 12, fontWeight: 700, padding: '4px 10px', borderRadius: 'var(--radius-pill)', marginTop: 8 }}>
                        <UserCheck size={13} /> Sent to Mobile App: {assignedStaffName}
                      </div>
                    )}

                    {/* ── Proof of Delivery Photo & Handover Notes ── */}
                    {req.proofOfDeliveryPhoto && (
                      <div style={{ marginTop: 12, paddingTop: 10, borderTop: '1px solid var(--border)' }}>
                        <div style={{ fontSize: 11, fontWeight: 800, color: 'var(--bay-teal)', marginBottom: 6, textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                          📸 Proof of Handover Photo (On-Ground Delivery)
                        </div>
                        <img
                          src={req.proofOfDeliveryPhoto}
                          alt="Proof of Handover"
                          style={{ width: 140, height: 100, objectFit: 'cover', borderRadius: 'var(--radius-inner)', border: '1px solid var(--border)', cursor: 'pointer' }}
                          onClick={() => window.open(req.proofOfDeliveryPhoto, '_blank')}
                        />
                        {req.recipientSignatureOrNotes && (
                          <div style={{ fontSize: 12, color: 'var(--ink-soft)', fontStyle: 'italic', marginTop: 4 }}>
                            Note: {req.recipientSignatureOrNotes}
                          </div>
                        )}
                      </div>
                    )}
                  </div>

                  {isLguAdmin && (req.status || '').toLowerCase() === 'pending' && (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 8, background: 'var(--sampaguita)', padding: 12, borderRadius: 'var(--radius-inner)', border: '1px solid var(--border)', minWidth: 260 }}>
                      <label style={{ fontSize: 11, fontWeight: 700, color: 'var(--ink-soft)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                        Assign Field Officer for Door-to-Door
                      </label>

                      {/* Interactive Staff Input & Live Suggestion Dropdown */}
                      <div style={{ position: 'relative' }}>
                        <input
                          placeholder="Click or type officer name..."
                          value={assignStaff[req.id || req._id] || ''}
                          onFocus={() => setFocusedReqId(req.id || req._id)}
                          onChange={e => {
                            setAssignStaff(p => ({ ...p, [req.id || req._id]: e.target.value }));
                            setFocusedReqId(req.id || req._id);
                          }}
                          style={{
                            width: '100%',
                            padding: '9px 12px',
                            borderRadius: 'var(--radius-inner)',
                            border: assignStaff[req.id || req._id]?.trim() ? '1.5px solid #158A64' : '1.5px solid #D97706',
                            fontSize: 12,
                            outline: 'none',
                            background: 'var(--card)',
                            color: 'var(--ink)',
                            boxSizing: 'border-box',
                          }}
                        />

                        {/* Floating Live Suggestions Box */}
                        {focusedReqId === (req.id || req._id) && (
                          <div
                            style={{
                              position: 'absolute',
                              top: 'calc(100% + 4px)',
                              left: 0,
                              right: 0,
                              zIndex: 100,
                              background: 'var(--card)',
                              border: '1px solid var(--border)',
                              borderRadius: '8px',
                              boxShadow: '0 10px 25px rgba(0,0,0,0.18)',
                              maxHeight: '190px',
                              overflowY: 'auto',
                            }}
                          >
                            <div style={{ padding: '6px 10px', fontSize: '10.5px', fontWeight: 800, color: 'var(--manila-blue)', borderBottom: '1px solid var(--border)', background: 'var(--sampaguita)', textTransform: 'uppercase' }}>
                              👥 Click to Select Field Officer
                            </div>
                            {staffList
                              .filter(s => s.name.toLowerCase().includes((assignStaff[req.id || req._id] || '').toLowerCase()))
                              .map((staff, sIdx) => (
                                <div
                                  key={staff.id || sIdx}
                                  onMouseDown={(e) => {
                                    e.preventDefault();
                                    setAssignStaff(p => ({ ...p, [req.id || req._id]: staff.name }));
                                    setFocusedReqId(null);
                                  }}
                                  style={{
                                    padding: '8px 10px',
                                    fontSize: '12px',
                                    cursor: 'pointer',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'space-between',
                                    borderBottom: '1px solid rgba(0,0,0,0.04)',
                                    transition: 'background 0.15s ease',
                                  }}
                                  onMouseEnter={e => e.currentTarget.style.background = 'var(--manila-blue-light)'}
                                  onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
                                >
                                  <div>
                                    <div style={{ fontWeight: 800, color: 'var(--ink)' }}>{staff.name}</div>
                                    <div style={{ fontSize: '10.5px', color: 'var(--ink-soft)' }}>
                                      {staff.designation} • {staff.team}
                                    </div>
                                  </div>
                                  <span className="badge badge-success" style={{ fontSize: '9.5px', padding: '2px 6px' }}>Available</span>
                                </div>
                              ))}
                          </div>
                        )}
                      </div>

                      <div style={{ display: 'flex', gap: 8, marginTop: 4 }}>
                        <button
                          onClick={() => requestApproveModal(req)}
                          className={assignStaff[req.id || req._id]?.trim() ? 'clay-button-approve' : 'clay-button-ghost'}
                          style={{
                            fontSize: 12,
                            flex: 1,
                            padding: '8px 10px',
                            gap: 4,
                            border: assignStaff[req.id || req._id]?.trim() ? 'none' : '1px dashed #D97706',
                            color: assignStaff[req.id || req._id]?.trim() ? '#fff' : '#B45309',
                          }}
                        >
                          <CheckCircle size={13} /> {assignStaff[req.id || req._id]?.trim() ? 'Approve & Dispatch' : 'Assign Staff First'}
                        </button>
                        <button onClick={() => requestRejectModal(req)} className="clay-button-danger" style={{ fontSize: 12, padding: '8px 10px', gap: 4 }}>
                          <XCircle size={13} /> Reject
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              </MotionCard>
            );
          })
        )}
      </div>
    </div>
  );
}

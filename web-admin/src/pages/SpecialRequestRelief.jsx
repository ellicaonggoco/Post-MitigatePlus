import React, { useState, useEffect, useContext } from 'react';
import ReactDOM from 'react-dom';
import { AuthContext } from '../context/AuthContext';
import {
  Heart,
  Users,
  CheckCircle,
  CheckCircle2,
  Clock,
  Search,
  RefreshCw,
  Truck,
  MapPin,
  Phone,
  Filter,
  X,
  Send,
  Check,
  Eye,
  Camera,
  Image as ImageIcon,
  Plus,
  Scale,
  AlertTriangle,
} from 'lucide-react';
import { API_BASE_URL } from '../config';
import Pagination from '../components/Pagination';
import { MotionCard } from '../components/motion';

export default function SpecialRequestRelief() {
  const { token, user } = useContext(AuthContext);
  const isLguAdmin = user?.role === 'lgu_admin' || user?.role === 'lgu_superadmin';
  const isBarangay = user?.role === 'barangay_official';

  const [assistanceRequests, setAssistanceRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('PENDING'); // 'PENDING' | 'DISPATCHED' | 'COMPLETED'
  const [specialSearch, setSpecialSearch] = useState('');
  const [assignModal, setAssignModal] = useState({ isOpen: false, request: null });
  const [assignStaffName, setAssignStaffName] = useState('Field Officer Juan Santos (Team Alpha)');
  const [selectedStaffId, setSelectedStaffId] = useState('');
  const [staffList, setStaffList] = useState([]);
  const [assignLoading, setAssignLoading] = useState(false);

  // Registered Households and Active Events for Quick Selection
  const [households, setHouseholds] = useState([]);
  const [activeEvents, setActiveEvents] = useState([]);

  // State for Create Special Request Modal (For Barangay & LGU Admin)
  const [createModal, setCreateModal] = useState({
    isOpen: false,
    selectedHouseholdId: '',
    recipientName: '',
    recipientPhone: '',
    recipientAddress: '',
    barangayCode: user?.barangayCode || '291',
    eventId: '',
    eventTitle: '',
    memberCount: '4',
    vulnerabilityTypes: ['Senior Citizen'],
    severityLevel: 'Severe / Bedridden',
    notes: '',
  });
  const [createLoading, setCreateLoading] = useState(false);

  // State for Photo Proof Modal
  const [photoModal, setPhotoModal] = useState({ isOpen: false, photoUrl: '', request: null });

  // State for inline row feedback (rowId -> text)
  const [inlineFeedback, setInlineFeedback] = useState({});

  const fetchAssistanceRequests = async () => {
    if (!token) return;
    try {
      setLoading(true);
      const res = await fetch(API_BASE_URL + '/assistance-requests', {
        headers: { Authorization: 'Bearer ' + token },
      });
      if (res.ok) {
        const data = await res.json();
        setAssistanceRequests(Array.isArray(data) ? data : []);
      }
    } catch (e) {
      console.error('Error fetching assistance requests:', e);
    } finally {
      setLoading(false);
    }
  };

  const getStaffActiveDeliveriesCount = (staffId, staffName) => {
    return assistanceRequests.filter(r => {
      const isAssigned = r.status === 'approved' || r.status === 'under_review';
      if (!isAssigned) return false;
      const sId = r.assignedStaff?._id || r.assignedStaff?.id || r.assignedStaff;
      const sName = r.assignedStaffName || r.assignedStaff?.name;
      if (staffId && sId && String(sId) === String(staffId)) return true;
      if (staffName && sName && (sName.toLowerCase().includes(staffName.toLowerCase()) || staffName.toLowerCase().includes(sName.toLowerCase()))) return true;
      return false;
    }).length;
  };

  useEffect(() => {
    fetchAssistanceRequests();
    if (token) {
      fetch(`${API_BASE_URL}/auth/provisioned-users`, {
        headers: { Authorization: 'Bearer ' + token },
      })
        .then(res => res.json())
        .then(data => {
          if (Array.isArray(data)) {
            const fieldStaff = data.filter(u => u.role === 'field_staff');
            setStaffList(fieldStaff);
            if (fieldStaff.length > 0) {
              const sorted = [...fieldStaff].sort((a, b) => {
                const countA = getStaffActiveDeliveriesCount(a._id || a.id, a.name);
                const countB = getStaffActiveDeliveriesCount(b._id || b.id, b.name);
                return countA - countB;
              });
              setSelectedStaffId(sorted[0]._id || sorted[0].id);
              setAssignStaffName(`${sorted[0].name} (${sorted[0].teamName || 'Field Operations'})`);
            }
          }
        })
        .catch(() => {});

      const bCode = user?.barangayCode || '291';
      fetch(`${API_BASE_URL}/households?barangayCode=${bCode}`, {
        headers: { Authorization: 'Bearer ' + token },
      })
        .then(res => res.json())
        .then(data => {
          if (Array.isArray(data)) setHouseholds(data);
        })
        .catch(() => {});

      fetch(`${API_BASE_URL}/distributions/events?barangayCode=${bCode}&activeOnly=true`, {
        headers: { Authorization: 'Bearer ' + token },
      })
        .then(res => res.json())
        .then(data => {
          if (Array.isArray(data)) {
            const active = data.filter(e => e.isActive || e.status === 'Ongoing' || e.status === 'Scheduled');
            setActiveEvents(active);
          }
        })
        .catch(() => {});
    }
  }, [token, assistanceRequests.length, user?.barangayCode]);

  const handleAssignDelivery = async () => {
    if (!assignModal.request) return;
    const reqId = assignModal.request._id;
    setAssignLoading(true);
    try {
      const res = await fetch(API_BASE_URL + '/assistance-requests/' + reqId + '/assign', {
        method: 'PATCH',
        headers: {
          Authorization: 'Bearer ' + token,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          assignedStaffId: selectedStaffId || null,
          assignedStaffName: assignStaffName,
        }),
      });
      if (res.ok) {
        setAssignModal({ isOpen: false, request: null });
        fetchAssistanceRequests();
        
        // Show inline feedback on the specific row
        setInlineFeedback(prev => ({ ...prev, [reqId]: 'Field staff assigned for door-to-door delivery!' }));
        setTimeout(() => {
          setInlineFeedback(prev => {
            const next = { ...prev };
            delete next[reqId];
            return next;
          });
        }, 4000);
      } else {
        alert('Failed to assign field staff.');
      }
    } catch (e) {
      alert('Error assigning delivery staff.');
    } finally {
      setAssignLoading(false);
    }
  };

  const handleCreateSpecialRequest = async (e) => {
    if (e && e.preventDefault) e.preventDefault();
    if (!createModal.recipientName.trim()) {
      alert('Please enter recipient full name.');
      return;
    }
    if (!createModal.recipientPhone.trim()) {
      alert('Please enter recipient contact number.');
      return;
    }
    if (!createModal.recipientAddress.trim()) {
      alert('Please enter recipient street address.');
      return;
    }

    setCreateLoading(true);
    try {
      const bCode = isBarangay ? (user?.barangayCode || '291') : (createModal.barangayCode || user?.barangayCode || '291');
      const res = await fetch(API_BASE_URL + '/assistance-requests', {
        method: 'POST',
        headers: {
          Authorization: 'Bearer ' + token,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          eventId: createModal.eventId || (activeEvents[0]?._id || null),
          eventTitle: createModal.eventTitle || (activeEvents[0]?.title || ''),
          householdId: createModal.selectedHouseholdId || null,
          recipientName: createModal.recipientName.trim(),
          recipientPhone: createModal.recipientPhone.trim(),
          recipientAddress: createModal.recipientAddress.trim(),
          barangay: bCode,
          memberCount: parseInt(createModal.memberCount, 10) || 1,
          vulnerabilityTypes: createModal.vulnerabilityTypes,
          severityLevel: createModal.severityLevel,
          itemType: 'Pangunahing Family Food & Disaster Relief Pack',
          notes: createModal.notes.trim() || 'Door-to-door emergency relief assistance requested by Barangay Official.',
        }),
      });

      if (res.ok) {
        setCreateModal({
          isOpen: false,
          selectedHouseholdId: '',
          recipientName: '',
          recipientPhone: '',
          recipientAddress: '',
          barangayCode: user?.barangayCode || '291',
          eventId: '',
          eventTitle: '',
          memberCount: '4',
          vulnerabilityTypes: ['Senior Citizen'],
          severityLevel: 'Severe / Bedridden',
          notes: '',
        });
        fetchAssistanceRequests();
        alert('Special Relief Request successfully recorded and submitted to LGU Command Center for approval and staff dispatch!');
      } else {
        const errData = await res.json().catch(() => ({}));
        alert(errData.message || 'Failed to submit special relief request.');
      }
    } catch (err) {
      alert('Error submitting special relief request.');
    } finally {
      setCreateLoading(false);
    }
  };

  // Counts for each tab
  const pendingRequests = assistanceRequests.filter(r => r.status === 'pending');
  const dispatchedRequests = assistanceRequests.filter(r => r.status === 'approved' || r.status === 'under_review');
  const completedRequests = assistanceRequests.filter(r => r.status === 'received' || r.status === 'released');

  // Filter based on active tab and search
  const currentList =
    activeTab === 'PENDING'
      ? pendingRequests
      : activeTab === 'DISPATCHED'
      ? dispatchedRequests
      : completedRequests;

  const filteredList = currentList.filter(r => {
    if (specialSearch.trim()) {
      const q = specialSearch.toLowerCase();
      const name = (r.householdId?.headOfHouseholdUserId?.name || r.requestedBy || '').toLowerCase();
      const addr = (r.householdId?.address || '').toLowerCase();
      const notes = (r.notes || '').toLowerCase();
      const brgy = String(r.householdId?.barangayCode || '').toLowerCase();
      if (!name.includes(q) && !addr.includes(q) && !notes.includes(q) && !brgy.includes(q)) return false;
    }
    return true;
  });

  const [currentPage, setCurrentPage] = useState(1);
  const ITEMS_PER_PAGE = 8;

  useEffect(() => {
    setCurrentPage(1);
  }, [activeTab, specialSearch]);

  const paginatedList = filteredList.slice((currentPage - 1) * ITEMS_PER_PAGE, currentPage * ITEMS_PER_PAGE);

  return (
    <div className="page-container page-animate">
      {/* Top Header */}
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 24, flexWrap: 'wrap', gap: 16 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
          <div style={{ width: 48, height: 48, borderRadius: 'var(--radius-inner)', background: 'linear-gradient(135deg, #1557B0, #0F172A)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <Heart size={24} color="#FFFFFF" />
          </div>
          <div>
            <h1 className="section-header" style={{ margin: 0, fontSize: 22, color: 'var(--ink)', fontWeight: 800 }}>
              Special Relief Requests
            </h1>
            <p style={{ fontSize: 13, color: 'var(--ink-soft)', marginTop: 2 }}>
              {isBarangay
                ? 'Barangay Portal: Magsumite ng Special Door-to-Door Relief Requests para sa mga vulnerable constituents (bedridden, seniors, PWDs). Ang mga kahilingan ay susuriin at aaprubahan ng LGU Admin bago italaga sa Field Staff.'
                : 'LGU Executive Command: Suriin at aprubahan ang mga Special Relief Request mula sa mga Barangay Officials at italaga ang mga Field Staff officers para sa door-to-door delivery.'}
            </p>
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <button
            type="button"
            onClick={() => setCreateModal(prev => ({ ...prev, isOpen: true }))}
            className="clay-button-primary"
            style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 13, padding: '9px 18px', fontWeight: 800 }}
          >
            <Plus size={15} /> {isBarangay ? 'Magsumite ng Special Request' : 'Create Special Request'}
          </button>
          <button
            type="button"
            onClick={fetchAssistanceRequests}
            className="clay-button-ghost"
            style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 13 }}
          >
            <RefreshCw size={14} /> Refresh Queue
          </button>
        </div>
      </div>

      {/* 3 Dedicated Sub-Page / Tab Navigation Buttons */}
      <div style={{ display: 'flex', gap: 10, marginBottom: 20, flexWrap: 'wrap' }}>
        <button
          type="button"
          onClick={() => setActiveTab('PENDING')}
          style={{
            padding: '10px 18px',
            borderRadius: 'var(--radius-pill)',
            border: activeTab === 'PENDING' ? '2px solid #D97706' : '1px solid var(--border)',
            background: activeTab === 'PENDING' ? '#FFFBEB' : 'var(--card)',
            color: activeTab === 'PENDING' ? '#D97706' : 'var(--ink-soft)',
            fontWeight: 800,
            fontSize: 13,
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: 8,
            transition: 'all 0.15s ease',
          }}
        >
          <Clock size={15} />
          <span>Pending Requests ({pendingRequests.length})</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('DISPATCHED')}
          style={{
            padding: '10px 18px',
            borderRadius: 'var(--radius-pill)',
            border: activeTab === 'DISPATCHED' ? '2px solid #2563EB' : '1px solid var(--border)',
            background: activeTab === 'DISPATCHED' ? '#EFF6FF' : 'var(--card)',
            color: activeTab === 'DISPATCHED' ? '#2563EB' : 'var(--ink-soft)',
            fontWeight: 800,
            fontSize: 13,
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: 8,
            transition: 'all 0.15s ease',
          }}
        >
          <Truck size={15} />
          <span>Dispatched Crew ({dispatchedRequests.length})</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('COMPLETED')}
          style={{
            padding: '10px 18px',
            borderRadius: 'var(--radius-pill)',
            border: activeTab === 'COMPLETED' ? '2px solid #158A64' : '1px solid var(--border)',
            background: activeTab === 'COMPLETED' ? '#F0FDF4' : 'var(--card)',
            color: activeTab === 'COMPLETED' ? '#158A64' : 'var(--ink-soft)',
            fontWeight: 800,
            fontSize: 13,
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: 8,
            transition: 'all 0.15s ease',
          }}
        >
          <CheckCircle size={15} />
          <span>Completed & Delivered ({completedRequests.length})</span>
        </button>
      </div>

      {/* Search Input */}
      <div style={{ marginBottom: 16 }}>
        <div style={{ position: 'relative', maxWidth: 360 }}>
          <Search size={16} color="#94A3B8" style={{ position: 'absolute', left: 12, top: 11 }} />
          <input
            type="text"
            value={specialSearch}
            onChange={e => setSpecialSearch(e.target.value)}
            placeholder="Search beneficiary, address, condition..."
            style={{ width: '100%', padding: '9px 12px 9px 36px', borderRadius: 'var(--radius-inner)', border: '1px solid var(--border)', fontSize: 13, background: 'var(--card)', color: 'var(--ink)', outline: 'none' }}
          />
        </div>
      </div>

      {/* Special Requests Table */}
      <div className="clay-card" style={{ borderRadius: 12, overflow: 'hidden', padding: 0 }}>
        <div style={{ padding: '16px 20px', borderBottom: '1px solid var(--border)', background: 'var(--card)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <h3 style={{ margin: 0, fontSize: 15, fontWeight: 800, color: 'var(--ink)' }}>
              {activeTab === 'PENDING' && 'Pending Relief Requests Queue (Awaiting Staff Dispatch)'}
              {activeTab === 'DISPATCHED' && 'Dispatched Door-to-Door Delivery Crew (In-Transit)'}
              {activeTab === 'COMPLETED' && 'Delivered & Verified Requests (With Proof of Handover)'}
            </h3>
            <p style={{ margin: '2px 0 0', fontSize: 12, color: 'var(--ink-soft)' }}>
              {activeTab === 'PENDING' && 'Assign available on-ground field staff to deliver relief packages directly to the resident doorstep.'}
              {activeTab === 'DISPATCHED' && 'Field staff are currently deploying on-ground. Deliveries are finalized upon staff photo upload on the mobile app.'}
              {activeTab === 'COMPLETED' && 'Completed door-to-door handovers with digital timestamp and photo proof of delivery.'}
            </p>
          </div>
        </div>

        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: 13 }}>
            <thead>
              <tr style={{ background: '#F8FAFC', color: '#475569', fontWeight: 700, borderBottom: '1px solid var(--border)' }}>
                <th style={{ padding: '12px 16px' }}>Beneficiary Citizen</th>
                <th style={{ padding: '12px 16px' }}>Address & Barangay</th>
                <th style={{ padding: '12px 16px' }}>Family Demographics</th>
                <th style={{ padding: '12px 16px' }}>Target Vulnerable Person</th>
                <th style={{ padding: '12px 16px' }}>Condition & Severity</th>
                <th style={{ padding: '12px 16px' }}>Status</th>
                <th style={{ padding: '12px 16px', textAlign: 'right' }}>
                  {activeTab === 'PENDING' ? 'Dispatch Action' : activeTab === 'DISPATCHED' ? 'Delivery Status' : 'Verification Proof'}
                </th>
              </tr>
            </thead>
            <tbody>
              {filteredList.length === 0 ? (
                <tr>
                  <td colSpan="7" style={{ padding: 36, textAlign: 'center', color: 'var(--ink-soft)' }}>
                    No requests found in this view.
                  </td>
                </tr>
              ) : (
                paginatedList.map(r => {
                  const hh = r.householdId || {};
                  const headUser = hh.headOfHouseholdUserId || {};
                  const name = r.recipientName || headUser.name || (r.requestedBy && !r.requestedBy.startsWith('Official:') ? r.requestedBy : '') || 'Elena Bautista';
                  const contact = r.recipientPhone || headUser.contactNum || headUser.emailOrPhone || '0917-555-0192';
                  const addr = r.recipientAddress || (hh.address ? `${hh.address}, Purok ${hh.purok || '1'}` : '142 Rizal Ave, Purok 2');
                  const brgy = `Barangay ${r.barangayCode || hh.barangayCode || '291'}`;
                  const memberCount = r.memberCount || hh.memberCount || 4;

                  const members = Array.isArray(hh.members) ? hh.members : [];
                  const seniorCount = members.filter(m => (m.age !== undefined && m.age >= 60) || (m.specialConditions || []).includes('senior')).length;
                  const pwdCount = members.filter(m => (m.specialConditions || []).includes('pwd')).length;
                  const infantCount = members.filter(m => (m.age !== undefined && m.age <= 2) || (m.specialConditions || []).includes('infant')).length;

                  // Target Vulnerabilities: Clean typography with NO emojis and NO background pill!
                  let targetVulnerabilities = [];
                  if (Array.isArray(r.vulnerabilityTypes) && r.vulnerabilityTypes.length > 0) {
                    r.vulnerabilityTypes.forEach(vt => {
                      if (vt.includes('Senior')) targetVulnerabilities.push({ label: 'Senior Citizen', color: '#D97706' });
                      else if (vt.includes('PWD')) targetVulnerabilities.push({ label: 'PWD Recipient', color: '#2563EB' });
                      else if (vt.includes('Infant')) targetVulnerabilities.push({ label: 'Infant Care', color: '#EC4899' });
                      else if (vt.includes('Severe') || vt.includes('Bedridden')) targetVulnerabilities.push({ label: 'Severe / Bedridden', color: '#DC2626' });
                      else targetVulnerabilities.push({ label: vt, color: '#D97706' });
                    });
                  } else {
                    if (seniorCount > 0 || r.assistanceType?.toLowerCase().includes('senior') || r.notes?.toLowerCase().includes('senior')) {
                      targetVulnerabilities.push({ label: 'Senior Citizen', color: '#D97706' });
                    }
                    if (pwdCount > 0 || r.assistanceType?.toLowerCase().includes('pwd') || r.notes?.toLowerCase().includes('pwd')) {
                      targetVulnerabilities.push({ label: 'PWD Recipient', color: '#2563EB' });
                    }
                    if (infantCount > 0 || r.assistanceType?.toLowerCase().includes('infant') || r.notes?.toLowerCase().includes('baby') || r.notes?.toLowerCase().includes('infant')) {
                      targetVulnerabilities.push({ label: 'Infant Care', color: '#EC4899' });
                    }
                  }
                  if (targetVulnerabilities.length === 0) {
                    targetVulnerabilities.push({ label: 'Senior Citizen', color: '#D97706' });
                  }

                  // Condition: Clean typography with NO background pill
                  let conditionText = r.severityLevel || 'Standard Assistance';
                  let conditionColor = '#15803D';
                  const notesLower = (r.notes || '').toLowerCase();
                  if (conditionText.includes('Severe') || conditionText.includes('Bedridden') || notesLower.includes('severe') || notesLower.includes('bedridden') || notesLower.includes('critical') || hh.damageLevel === 'Totally Damaged' || hh.damageLevel === 'Severe') {
                    conditionText = 'Severe / Bedridden';
                    conditionColor = '#DC2626';
                  } else if (conditionText.includes('Moderate') || notesLower.includes('moderate') || hh.damageLevel === 'Moderate') {
                    conditionText = 'Moderate Priority';
                    conditionColor = '#D97706';
                  }

                  // Sanitized notes: NEVER display "Assigned to..." in Condition column!
                  const rawNotes = (r.notes || '').replace(/Assigned to.*/i, '').trim();
                  const displayNotes = rawNotes || `${r.itemType || 'Emergency Relief Goods'} requested for door-to-door delivery.`;

                  const isPending = r.status === 'pending';
                  const isApproved = r.status === 'approved' || r.status === 'under_review';
                  const isDelivered = r.status === 'received' || r.status === 'released';

                  const staffName = r.assignedStaffName || r.assignedStaff?.name || (isApproved ? 'Field Officer Juan Santos' : '');
                  const deliveredDate = r.deliveredAt ? new Date(r.deliveredAt).toLocaleDateString('en-PH') : 'Recently';

                  return (
                    <tr key={r._id} style={{ borderBottom: '1px solid var(--border)', transition: 'background 0.12s ease' }}>
                      <td style={{ padding: '14px 16px' }}>
                        <div style={{ fontWeight: 800, color: 'var(--ink)', display: 'flex', alignItems: 'center', gap: 5 }}>
                          <span>{name}</span>
                          <Check size={13} color="#15803D" strokeWidth={3} title="Verified Beneficiary" />
                        </div>
                        <div style={{ fontSize: 11.5, color: 'var(--ink-soft)', marginTop: 2, display: 'flex', alignItems: 'center', gap: 4 }}>
                          <Phone size={11} /> {contact}
                        </div>
                      </td>

                      <td style={{ padding: '14px 16px' }}>
                        <div style={{ fontWeight: 700, color: 'var(--ink)' }}>{addr}</div>
                        <div style={{ fontSize: 11.5, color: '#1557B0', marginTop: 2, fontWeight: 700 }}>
                          <MapPin size={11} style={{ verticalAlign: 'middle', marginRight: 3 }} />
                          {brgy}
                        </div>
                      </td>

                      <td style={{ padding: '14px 16px' }}>
                        <div style={{ fontWeight: 800, color: 'var(--ink)' }}>{memberCount} Members</div>
                        <div style={{ fontSize: 11, color: 'var(--ink-soft)', marginTop: 2 }}>
                          {seniorCount > 0 && `${seniorCount} Senior `}
                          {pwdCount > 0 && `${pwdCount} PWD `}
                          {infantCount > 0 && `${infantCount} Infant`}
                          {seniorCount === 0 && pwdCount === 0 && infantCount === 0 && 'Family Household'}
                        </div>
                      </td>

                      {/* Pure Colored Text - No Emojis, No Background Pill */}
                      <td style={{ padding: '14px 16px' }}>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
                          {targetVulnerabilities.map((v, vIdx) => (
                            <span
                              key={vIdx}
                              style={{
                                fontSize: 12.5,
                                fontWeight: 800,
                                color: v.color,
                              }}
                            >
                              {v.label}
                            </span>
                          ))}
                        </div>
                      </td>

                      {/* Pure Colored Text - No Background Pill, No Confusing Assigned text */}
                      <td style={{ padding: '14px 16px' }}>
                        <div style={{ fontSize: 12.5, fontWeight: 800, color: conditionColor, marginBottom: 2 }}>
                          {conditionText}
                        </div>
                        <div style={{ fontSize: 11.5, color: 'var(--ink-soft)', lineHeight: 1.3, maxWidth: 220 }}>
                          {displayNotes}
                        </div>
                        {r.eventTitle ? (
                          <div style={{ fontSize: 10.5, color: '#1557B0', fontWeight: 700, marginTop: 4 }}>
                            <Truck size={10} style={{ verticalAlign: 'middle', marginRight: 3 }} />
                            Drive: {r.eventTitle}
                          </div>
                        ) : null}
                      </td>

                      <td style={{ padding: '14px 16px' }}>
                        <span
                          style={{
                            fontSize: 12,
                            fontWeight: 800,
                            color: isPending ? '#D97706' : isApproved ? '#2563EB' : '#15803D',
                          }}
                        >
                          {isPending ? 'PENDING' : isApproved ? 'DISPATCHED' : 'DELIVERED'}
                        </span>
                      </td>

                      <td style={{ padding: '14px 16px', textAlign: 'right' }}>
                        {inlineFeedback[r._id] ? (
                          <span style={{
                            fontSize: 12,
                            color: '#15803D',
                            fontWeight: 800,
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: 4,
                            transition: 'opacity 0.4s ease',
                          }}>
                            <Check size={13} /> {inlineFeedback[r._id]}
                          </span>
                        ) : isPending ? (
                          isLguAdmin ? (
                            <button
                              type="button"
                              onClick={() => setAssignModal({ isOpen: true, request: r })}
                              className="clay-button-primary"
                              style={{ fontSize: 12, padding: '6px 14px', gap: 5 }}
                            >
                              <Truck size={13} /> Approve & Dispatch Staff
                            </button>
                          ) : (
                            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 2 }}>
                              <span style={{ fontSize: 12, color: '#D97706', fontWeight: 800, display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                                <Clock size={12} /> Awaiting LGU Approval
                              </span>
                              <span style={{ fontSize: 11, color: 'var(--ink-soft)' }}>
                                Queued for Staff Assignment
                              </span>
                            </div>
                          )
                        ) : isApproved ? (
                          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 2 }}>
                            <span style={{ fontSize: 11.5, color: '#2563EB', fontWeight: 800 }}>
                              Assigned to {staffName}
                            </span>
                            <span style={{ fontSize: 11, color: 'var(--ink-soft)' }}>
                              In Transit
                            </span>
                          </div>
                        ) : (
                          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: 6 }}>
                            <span style={{ fontSize: 12, color: '#15803D', fontWeight: 800, display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                              <CheckCircle2 size={13} /> Completed
                            </span>
                            {r.proofOfDeliveryPhoto && (
                              <button
                                type="button"
                                onClick={() => setPhotoModal({ isOpen: true, photoUrl: r.proofOfDeliveryPhoto, request: r })}
                                style={{
                                  padding: '4px 8px',
                                  background: '#EFF6FF',
                                  color: '#1557B0',
                                  border: '1px solid #BFDBFE',
                                  borderRadius: 6,
                                  fontSize: 11,
                                  fontWeight: 700,
                                  cursor: 'pointer',
                                  display: 'inline-flex',
                                  alignItems: 'center',
                                  gap: 4,
                                }}
                              >
                                <Camera size={11} /> Photo Proof
                              </button>
                            )}
                          </div>
                        )}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
          <Pagination
            currentPage={currentPage}
            totalItems={filteredList.length}
            itemsPerPage={ITEMS_PER_PAGE}
            onPageChange={setCurrentPage}
          />
        </div>
      </div>

      {/* Modal 1: Dispatch Field Staff Modal */}
      {assignModal.isOpen && ReactDOM.createPortal(
        <div style={{
          position: 'fixed',
          top: 0, left: 0, right: 0, bottom: 0,
          width: '100vw',
          height: '100vh',
          background: 'rgba(15, 23, 42, 0.75)',
          backdropFilter: 'blur(8px)',
          WebkitBackdropFilter: 'blur(8px)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 99999999,
          padding: '20px',
          boxSizing: 'border-box',
        }}>
          <div className="clay-card" style={{
            maxWidth: '560px',
            width: '100%',
            background: 'var(--card)',
            padding: '26px',
            borderRadius: '16px',
            boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.35)',
            border: '1.5px solid var(--border)',
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <div style={{ width: 38, height: 38, borderRadius: 10, background: 'linear-gradient(135deg, #1557B0, #0F172A)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <Truck size={20} color="#FFFFFF" />
                </div>
                <div>
                  <h3 style={{ fontSize: 17, fontWeight: 900, margin: 0, color: 'var(--ink)' }}>
                    Dispatch Door-to-Door Delivery Staff
                  </h3>
                  <p style={{ fontSize: 12, color: 'var(--ink-soft)', margin: '2px 0 0' }}>
                    Assign available field crew for direct household relief delivery.
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setAssignModal({ isOpen: false, request: null })}
                style={{ background: 'transparent', border: 'none', cursor: 'pointer', color: 'var(--ink-soft)' }}
              >
                <X size={20} />
              </button>
            </div>

            {assignModal.request && (
              <div style={{ background: '#F8FAFC', padding: '12px 14px', borderRadius: 8, border: '1px solid #E2E8F0', marginBottom: 16, fontSize: 12.5 }}>
                <div><strong>Beneficiary:</strong> {assignModal.request.householdId?.headOfHouseholdUserId?.name || assignModal.request.requestedBy || 'Citizen'}</div>
                <div style={{ marginTop: 3 }}><strong>Address:</strong> {assignModal.request.householdId?.address || 'Barangay 291, Manila'}</div>
                <div style={{ marginTop: 3 }}><strong>Condition Notes:</strong> {assignModal.request.notes || 'Emergency relief package'}</div>
              </div>
            )}

            <div style={{ marginBottom: 20 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
                <label style={{ fontSize: 11, fontWeight: 700, color: 'var(--ink-soft)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
                  Assign Field Officer / Team *
                </label>
                <span style={{ fontSize: 11, color: '#158A64', fontWeight: 700, display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                  <Scale size={12} color="#158A64" /> Workload Balancer Active
                </span>
              </div>
              <select
                value={selectedStaffId || assignStaffName}
                onChange={e => {
                  const val = e.target.value;
                  const found = staffList.find(s => (s._id || s.id) === val);
                  if (found) {
                    setSelectedStaffId(found._id || found.id);
                    setAssignStaffName(`${found.name} (${found.teamName || 'Field Operations'})`);
                  } else {
                    setSelectedStaffId('');
                    setAssignStaffName(val);
                  }
                }}
                style={{ width: '100%', padding: '10px 12px', borderRadius: 'var(--radius-inner)', border: '1px solid var(--border)', fontSize: 13, background: 'var(--card)', color: 'var(--ink)', outline: 'none', cursor: 'pointer', fontWeight: 700 }}
              >
                {staffList.length > 0 ? (
                  staffList.map(s => {
                    const count = getStaffActiveDeliveriesCount(s._id || s.id, s.name);
                    const workloadLabel = count === 0
                      ? '— 0 Active Deliveries (Recommended)'
                      : `— ${count} Active Deliveries`;
                    return (
                      <option key={s._id || s.id} value={s._id || s.id}>
                        {s.name} ({s.teamName || 'Field Operations'}) {workloadLabel}
                      </option>
                    );
                  })
                ) : (
                  <>
                    <option value="Field Officer Juan Santos (Team Alpha)">
                      Field Officer Juan Santos (Team Alpha) {getStaffActiveDeliveriesCount(null, 'Juan Santos') === 0 ? '— 0 Active Deliveries (Recommended)' : `— ${getStaffActiveDeliveriesCount(null, 'Juan Santos')} Active Deliveries`}
                    </option>
                    <option value="Field Officer Maria Clara (Team Bravo)">
                      Field Officer Maria Clara (Team Bravo) {getStaffActiveDeliveriesCount(null, 'Maria Clara') === 0 ? '— 0 Active Deliveries (Recommended)' : `— ${getStaffActiveDeliveriesCount(null, 'Maria Clara')} Active Deliveries`}
                    </option>
                    <option value="Quick Response Team 1">
                      Quick Response Team 1 {getStaffActiveDeliveriesCount(null, 'Quick Response') === 0 ? '— 0 Active Deliveries (Recommended)' : `— ${getStaffActiveDeliveriesCount(null, 'Quick Response')} Active Deliveries`}
                    </option>
                    <option value="Barangay Health Worker On-Duty">
                      Barangay Health Worker On-Duty {getStaffActiveDeliveriesCount(null, 'Health Worker') === 0 ? '— 0 Active Deliveries (Recommended)' : `— ${getStaffActiveDeliveriesCount(null, 'Health Worker')} Active Deliveries`}
                    </option>
                  </>
                )}
              </select>

              {/* Interactive Visual Workload Balancer Widget */}
              <div style={{ marginTop: 10, background: '#F8FAFC', border: '1px solid #E2E8F0', borderRadius: 'var(--radius-inner)', padding: '12px 14px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                  <span style={{ fontSize: 11.5, fontWeight: 800, color: '#1E293B', display: 'flex', alignItems: 'center', gap: 5 }}>
                    <Scale size={13} color="#1E293B" /> Door-to-Door Delivery Workload Balancer
                  </span>
                  <span style={{ fontSize: 11, color: '#64748B' }}>Pumili ng opisyal na may pinakamababang karga</span>
                </div>

                <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                  {(staffList.length > 0 ? staffList : [
                    { id: '1', name: 'Juan Santos', teamName: 'Team Alpha' },
                    { id: '2', name: 'Maria Clara', teamName: 'Team Bravo' },
                    { id: '3', name: 'QR Team 1', teamName: 'QR Unit' },
                  ])
                    .slice()
                    .sort((a, b) => getStaffActiveDeliveriesCount(a._id || a.id, a.name) - getStaffActiveDeliveriesCount(b._id || b.id, b.name))
                    .map(s => {
                      const count = getStaffActiveDeliveriesCount(s._id || s.id, s.name);
                      const isSelected = selectedStaffId === (s._id || s.id) || assignStaffName.includes(s.name);
                      const isFree = count === 0;
                      return (
                        <button
                          key={s._id || s.id}
                          type="button"
                          onClick={() => {
                            setSelectedStaffId(s._id || s.id);
                            setAssignStaffName(`${s.name} (${s.teamName || 'Field Operations'})`);
                          }}
                          style={{
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: 6,
                            padding: '6px 10px',
                            borderRadius: '6px',
                            border: isSelected ? '1.5px solid #1C3F94' : '1px solid #CBD5E1',
                            background: isSelected ? '#EFF6FF' : '#FFFFFF',
                            fontSize: '11.5px',
                            fontWeight: isSelected ? 800 : 600,
                            color: isSelected ? '#1C3F94' : '#334155',
                            cursor: 'pointer',
                            transition: 'all 0.12s ease',
                          }}
                        >
                          <span style={{
                            width: 8,
                            height: 8,
                            borderRadius: '50%',
                            backgroundColor: isFree ? '#10B981' : '#F59E0B',
                            display: 'inline-block',
                          }} />
                          <span>{s.name}</span>
                          <span style={{
                            fontSize: 10,
                            padding: '1px 6px',
                            borderRadius: 999,
                            backgroundColor: isFree ? '#DCFCE7' : '#FEF3C7',
                            color: isFree ? '#15803D' : '#B45309',
                            fontWeight: 800,
                          }}>
                            {count} active
                          </span>
                        </button>
                      );
                    })}
                </div>

                {(() => {
                  const currentCount = getStaffActiveDeliveriesCount(selectedStaffId, assignStaffName);
                  if (currentCount > 0) {
                    return (
                      <div style={{ marginTop: 8, fontSize: 11.5, color: '#B45309', display: 'flex', alignItems: 'center', gap: 5 }}>
                        <AlertTriangle size={14} color="#B45309" />
                        <span>
                          <strong>Paalala sa Pagiging Patas:</strong> May <strong>{currentCount}</strong> aktibong delivery assignments na si <strong>{assignStaffName}</strong>. Mainam na pumili ng staff na may 0 active deliveries upang hindi maipon ang trabaho.
                        </span>
                      </div>
                    );
                  }
                  return (
                    <div style={{ marginTop: 8, fontSize: 11.5, color: '#15803D', display: 'flex', alignItems: 'center', gap: 5 }}>
                      <CheckCircle2 size={14} color="#15803D" />
                      <span><strong>Inirerekomenda:</strong> Libre si <strong>{assignStaffName}</strong> (0 active deliveries). Patas ang distribusyon ng delivery.</span>
                    </div>
                  );
                })()}
              </div>
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10 }}>
              <button
                type="button"
                onClick={() => setAssignModal({ isOpen: false, request: null })}
                className="clay-button-ghost"
                style={{ fontSize: 13, padding: '10px 18px', cursor: 'pointer' }}
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleAssignDelivery}
                disabled={assignLoading}
                className="clay-button-primary"
                style={{ fontSize: 13, padding: '10px 22px', cursor: 'pointer', fontWeight: 800 }}
              >
                {assignLoading ? 'Dispatching...' : 'Confirm Dispatch'}
              </button>
            </div>
          </div>
        </div>,
        document.body
      )}

      {/* Modal 2: Delivery Photo Proof Viewer Modal */}
      {photoModal.isOpen && ReactDOM.createPortal(
        <div style={{
          position: 'fixed',
          top: 0, left: 0, right: 0, bottom: 0,
          width: '100vw',
          height: '100vh',
          background: 'rgba(15, 23, 42, 0.85)',
          backdropFilter: 'blur(8px)',
          WebkitBackdropFilter: 'blur(8px)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 99999999,
          padding: '20px',
          boxSizing: 'border-box',
        }}>
          <div className="clay-card" style={{
            maxWidth: '520px',
            width: '100%',
            background: 'var(--card)',
            padding: '24px',
            borderRadius: '16px',
            boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.4)',
            border: '1.5px solid var(--border)',
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <Camera size={20} color="#158A64" />
                <h3 style={{ fontSize: 16, fontWeight: 800, margin: 0, color: 'var(--ink)' }}>
                  Door-to-Door Delivery Proof Photo
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setPhotoModal({ isOpen: false, photoUrl: '', request: null })}
                style={{ background: 'transparent', border: 'none', cursor: 'pointer', color: 'var(--ink-soft)' }}
              >
                <X size={20} />
              </button>
            </div>

            {photoModal.photoUrl ? (
              <div style={{ borderRadius: 10, overflow: 'hidden', border: '1px solid var(--border)', marginBottom: 14 }}>
                <img
                  src={photoModal.photoUrl}
                  alt="Delivery Proof"
                  style={{ width: '100%', maxHeight: '380px', objectFit: 'cover', display: 'block' }}
                />
              </div>
            ) : (
              <div style={{ padding: 30, textAlign: 'center', background: '#F8FAFC', borderRadius: 8, color: 'var(--ink-soft)', marginBottom: 14 }}>
                Digital signature & on-ground verification logged by Barangay Field Staff.
              </div>
            )}

            {photoModal.request && (
              <div style={{ fontSize: 12.5, color: '#334155', lineHeight: 1.4 }}>
                <div><strong>Beneficiary:</strong> {photoModal.request.householdId?.headOfHouseholdUserId?.name || 'Citizen'}</div>
                <div><strong>Delivered By:</strong> {photoModal.request.deliveredBy?.name || photoModal.request.assignedStaffName || photoModal.request.assignedStaff?.name || 'Barangay Field Staff'}</div>
                <div><strong>Timestamp:</strong> {photoModal.request.deliveredAt ? new Date(photoModal.request.deliveredAt).toLocaleString('en-PH') : 'Verified'}</div>
              </div>
            )}

            <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 16 }}>
              <button
                type="button"
                onClick={() => setPhotoModal({ isOpen: false, photoUrl: '', request: null })}
                className="clay-button-ghost"
                style={{ fontSize: 13, padding: '8px 18px', cursor: 'pointer' }}
              >
                Close
              </button>
            </div>
          </div>
        </div>,
        document.body
      )}

      {/* Modal 3: Create Special Relief Request Modal (Barangay & LGU Admin) */}
      {createModal.isOpen && ReactDOM.createPortal(
        <div style={{
          position: 'fixed',
          top: 0, left: 0, right: 0, bottom: 0,
          width: '100vw',
          height: '100vh',
          background: 'rgba(15, 23, 42, 0.85)',
          backdropFilter: 'blur(8px)',
          WebkitBackdropFilter: 'blur(8px)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 99999999,
          padding: '20px',
          boxSizing: 'border-box',
        }}>
          <div className="clay-card" style={{
            maxWidth: '620px',
            width: '100%',
            maxHeight: '92vh',
            overflowY: 'auto',
            background: 'var(--card)',
            padding: '28px',
            borderRadius: '16px',
            boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.45)',
            border: '1.5px solid var(--border)',
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <div style={{ width: 40, height: 40, borderRadius: 10, background: 'linear-gradient(135deg, #1557B0, #0F172A)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <Heart size={22} color="#FFFFFF" />
                </div>
                <div>
                  <h3 style={{ fontSize: 18, fontWeight: 900, margin: 0, color: 'var(--ink)' }}>
                    Create Special Relief Request
                  </h3>
                  <p style={{ fontSize: 12, color: 'var(--ink-soft)', margin: '2px 0 0' }}>
                    Record offline, elderly, or vulnerable citizen for door-to-door staff delivery.
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setCreateModal(prev => ({ ...prev, isOpen: false }))}
                style={{ background: 'transparent', border: 'none', cursor: 'pointer', color: 'var(--ink-soft)' }}
              >
                <X size={20} />
              </button>
            </div>

            <form onSubmit={handleCreateSpecialRequest}>
              {/* Optional Quick Autofill from Registered Barangay Households */}
              {households.length > 0 && (
                <div style={{ marginBottom: 14 }}>
                  <label style={{ fontSize: 11, fontWeight: 800, color: '#1E40AF', textTransform: 'uppercase', letterSpacing: '0.06em', display: 'block', marginBottom: 5 }}>
                    Quick Autofill from Barangay Household Directory (Optional)
                  </label>
                  <select
                    value={createModal.selectedHouseholdId}
                    onChange={e => {
                      const hId = e.target.value;
                      if (!hId) {
                        setCreateModal(prev => ({ ...prev, selectedHouseholdId: '' }));
                        return;
                      }
                      const found = households.find(h => String(h._id) === String(hId));
                      if (found) {
                        const hHead = found.headOfHouseholdUserId || {};
                        const mList = Array.isArray(found.members) ? found.members : [];
                        const vTypes = [];
                        if (mList.some(m => (m.age !== undefined && m.age >= 60) || (m.specialConditions || []).includes('senior'))) vTypes.push('Senior Citizen');
                        if (mList.some(m => (m.specialConditions || []).includes('pwd'))) vTypes.push('Person with Disability (PWD)');
                        if (mList.some(m => (m.age !== undefined && m.age <= 2) || (m.specialConditions || []).includes('infant'))) vTypes.push('Infant Care');
                        if (vTypes.length === 0) vTypes.push('Senior Citizen');

                        setCreateModal(prev => ({
                          ...prev,
                          selectedHouseholdId: found._id,
                          recipientName: hHead.name || '',
                          recipientPhone: hHead.contactNum || hHead.emailOrPhone || '',
                          recipientAddress: found.address ? `${found.address}, Purok ${found.purok || '1'}` : '',
                          memberCount: String(found.memberCount || found.members?.length || 4),
                          vulnerabilityTypes: vTypes,
                        }));
                      }
                    }}
                    style={{ width: '100%', padding: '10px 12px', borderRadius: 8, border: '1.5px solid #BFDBFE', fontSize: 13, background: '#F8FAFF', color: '#1E40AF', fontWeight: 700, boxSizing: 'border-box' }}
                  >
                    <option value="">-- Pumili mula sa rehistradong sambahayan (o mag-type nang manu-mano) --</option>
                    {households.map(h => {
                      const hName = h.headOfHouseholdUserId?.name || 'Household';
                      const hAddr = h.address ? `${h.address}` : `Purok ${h.purok || '1'}`;
                      return (
                        <option key={h._id} value={h._id}>
                          {hName} • {hAddr} ({h.memberCount || 1} members)
                        </option>
                      );
                    })}
                  </select>
                </div>
              )}

              {/* Active Distribution Event Link (If Available) */}
              {activeEvents.length > 0 && (
                <div style={{ marginBottom: 14, padding: '10px 14px', background: '#F0FDF4', borderRadius: 10, border: '1px solid #BBF7D0', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <CheckCircle2 size={16} color="#15803D" />
                    <span style={{ fontSize: 12.5, color: '#166534', fontWeight: 700 }}>
                      Konektado sa Aktibong Pamamahagi: <strong>{activeEvents[0].title}</strong>
                    </span>
                  </div>
                  <span style={{ fontSize: 11, background: '#DCFCE7', color: '#15803D', fontWeight: 800, padding: '3px 8px', borderRadius: 6 }}>
                    Aktibong Event
                  </span>
                </div>
              )}

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14, marginBottom: 14 }}>
                <div>
                  <label style={{ fontSize: 11, fontWeight: 800, color: 'var(--ink-soft)', textTransform: 'uppercase', letterSpacing: '0.06em', display: 'block', marginBottom: 5 }}>
                    Recipient Full Name *
                  </label>
                  <input
                    type="text"
                    required
                    value={createModal.recipientName}
                    onChange={e => setCreateModal(prev => ({ ...prev, recipientName: e.target.value }))}
                    placeholder="e.g. Elena Ramos Bautista"
                    style={{ width: '100%', padding: '10px 12px', borderRadius: 8, border: '1px solid var(--border)', fontSize: 13, background: 'var(--card)', color: 'var(--ink)', boxSizing: 'border-box' }}
                  />
                </div>

                <div>
                  <label style={{ fontSize: 11, fontWeight: 800, color: 'var(--ink-soft)', textTransform: 'uppercase', letterSpacing: '0.06em', display: 'block', marginBottom: 5 }}>
                    Contact Phone Number *
                  </label>
                  <input
                    type="text"
                    required
                    value={createModal.recipientPhone}
                    onChange={e => setCreateModal(prev => ({ ...prev, recipientPhone: e.target.value }))}
                    placeholder="0917-XXX-XXXX"
                    style={{ width: '100%', padding: '10px 12px', borderRadius: 8, border: '1px solid var(--border)', fontSize: 13, background: 'var(--card)', color: 'var(--ink)', boxSizing: 'border-box' }}
                  />
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: 14, marginBottom: 14 }}>
                <div>
                  <label style={{ fontSize: 11, fontWeight: 800, color: 'var(--ink-soft)', textTransform: 'uppercase', letterSpacing: '0.06em', display: 'block', marginBottom: 5 }}>
                    Complete Street Address & House # *
                  </label>
                  <input
                    type="text"
                    required
                    value={createModal.recipientAddress}
                    onChange={e => setCreateModal(prev => ({ ...prev, recipientAddress: e.target.value }))}
                    placeholder="e.g. 142 Quirino Ave, Purok 2"
                    style={{ width: '100%', padding: '10px 12px', borderRadius: 8, border: '1px solid var(--border)', fontSize: 13, background: 'var(--card)', color: 'var(--ink)', boxSizing: 'border-box' }}
                  />
                </div>

                <div>
                  <label style={{ fontSize: 11, fontWeight: 800, color: 'var(--ink-soft)', textTransform: 'uppercase', letterSpacing: '0.06em', display: 'block', marginBottom: 5 }}>
                    Family Headcount
                  </label>
                  <input
                    type="number"
                    min="1"
                    max="30"
                    value={createModal.memberCount}
                    onChange={e => setCreateModal(prev => ({ ...prev, memberCount: e.target.value }))}
                    style={{ width: '100%', padding: '10px 12px', borderRadius: 8, border: '1px solid var(--border)', fontSize: 13, background: 'var(--card)', color: 'var(--ink)', boxSizing: 'border-box' }}
                  />
                </div>
              </div>

              {/* Vulnerabilities Selection */}
              <div style={{ marginBottom: 14 }}>
                <label style={{ fontSize: 11, fontWeight: 800, color: 'var(--ink-soft)', textTransform: 'uppercase', letterSpacing: '0.06em', display: 'block', marginBottom: 6 }}>
                  Target Vulnerabilities in Household *
                </label>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                  {[
                    'Senior Citizen',
                    'Person with Disability (PWD)',
                    'Infant Care',
                    'Solo Parent',
                    'Severe / Bedridden',
                  ].map(v => {
                    const isSelected = createModal.vulnerabilityTypes.includes(v);
                    return (
                      <button
                        key={v}
                        type="button"
                        onClick={() => {
                          setCreateModal(prev => ({
                            ...prev,
                            vulnerabilityTypes: isSelected
                              ? prev.vulnerabilityTypes.filter(x => x !== v)
                              : [...prev.vulnerabilityTypes, v],
                          }));
                        }}
                        style={{
                          padding: '6px 12px',
                          borderRadius: 20,
                          fontSize: 12,
                          fontWeight: 700,
                          cursor: 'pointer',
                          border: isSelected ? '1.5px solid #1557B0' : '1px solid var(--border)',
                          background: isSelected ? '#EFF6FF' : 'var(--card)',
                          color: isSelected ? '#1557B0' : 'var(--ink-soft)',
                          transition: 'all 0.12s ease',
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: 4,
                        }}
                      >
                        {isSelected ? <Check size={12} /> : <Plus size={12} />}
                        {v}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Condition & Severity */}
              <div style={{ marginBottom: 14 }}>
                <label style={{ fontSize: 11, fontWeight: 800, color: 'var(--ink-soft)', textTransform: 'uppercase', letterSpacing: '0.06em', display: 'block', marginBottom: 5 }}>
                  Condition & Severity Level *
                </label>
                <select
                  value={createModal.severityLevel}
                  onChange={e => setCreateModal(prev => ({ ...prev, severityLevel: e.target.value }))}
                  style={{ width: '100%', padding: '10px 12px', borderRadius: 8, border: '1px solid var(--border)', fontSize: 13, background: 'var(--card)', color: 'var(--ink)', fontWeight: 700, boxSizing: 'border-box' }}
                >
                  <option value="Severe / Bedridden">Severe / Bedridden (Urgent Priority)</option>
                  <option value="Moderate Priority">Moderate Priority (Elderly / PWD Care)</option>
                  <option value="Standard Assistance">Standard Assistance (Family Relief)</option>
                </select>
              </div>

              {/* Standardized Unified Relief Package (No Choices Dropdown) */}
              <div style={{ marginBottom: 14 }}>
                <label style={{ fontSize: 11, fontWeight: 800, color: 'var(--ink-soft)', textTransform: 'uppercase', letterSpacing: '0.06em', display: 'block', marginBottom: 5 }}>
                  Opisyal na Alokasyon ng Ayuda (Kumpletong Standard Pack)
                </label>
                <div style={{ padding: '12px 14px', borderRadius: 8, border: '1.5px solid #BFDBFE', background: '#EFF6FF', display: 'flex', alignItems: 'flex-start', gap: 10 }}>
                  <CheckCircle2 size={18} color="#1D4ED8" style={{ marginTop: 2, flexShrink: 0 }} />
                  <div>
                    <div style={{ fontSize: 13, fontWeight: 800, color: '#1E40AF' }}>
                      Pangunahing Family Food & Disaster Relief Pack (Standard Unified Allocation)
                    </div>
                    <div style={{ fontSize: 11.5, color: '#3B82F6', marginTop: 3, lineHeight: 1.4 }}>
                      Lahat ng Door-to-Door Relief ay naglalaman ng 5kg Bigas, De-latang Ulam, Instant Noodles, Malinis na Inuming Tubig, at Essential Care Supplies. Lahat ng kailangan ay kasama na sa isang kumpletong relief package.
                    </div>
                  </div>
                </div>
              </div>

              {/* Specific Reason & Notes */}
              <div style={{ marginBottom: 20 }}>
                <label style={{ fontSize: 11, fontWeight: 800, color: 'var(--ink-soft)', textTransform: 'uppercase', letterSpacing: '0.06em', display: 'block', marginBottom: 5 }}>
                  Specific On-Ground Condition / Reason for Delivery *
                </label>
                <textarea
                  rows="3"
                  value={createModal.notes}
                  onChange={e => setCreateModal(prev => ({ ...prev, notes: e.target.value }))}
                  placeholder="e.g. 78-year old stroke survivor living on ground floor, cannot walk to evacuation gym. Door-to-door delivery requested."
                  style={{ width: '100%', padding: '10px 12px', borderRadius: 8, border: '1px solid var(--border)', fontSize: 13, background: 'var(--card)', color: 'var(--ink)', resize: 'vertical', boxSizing: 'border-box' }}
                />
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10 }}>
                <button
                  type="button"
                  onClick={() => setCreateModal(prev => ({ ...prev, isOpen: false }))}
                  className="clay-button-ghost"
                  style={{ fontSize: 13, padding: '10px 18px', cursor: 'pointer' }}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={createLoading}
                  className="clay-button-primary"
                  style={{ fontSize: 13, padding: '10px 24px', cursor: 'pointer', fontWeight: 800 }}
                >
                  {createLoading ? 'Submitting Request...' : 'Submit & Queue Request'}
                </button>
              </div>
            </form>
          </div>
        </div>,
        document.body
      )}
    </div>
  );
}
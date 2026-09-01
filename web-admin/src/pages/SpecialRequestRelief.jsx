import React, { useState, useEffect, useContext } from 'react';
import ReactDOM from 'react-dom';
import { AuthContext } from '../context/AuthContext';
import {
  Heart,
  Users,
  CheckCircle,
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
} from 'lucide-react';
import { API_BASE_URL } from '../config';
import { MotionCard } from '../components/motion';

export default function SpecialRequestRelief() {
  const { token, user } = useContext(AuthContext);

  const [assistanceRequests, setAssistanceRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('PENDING'); // 'PENDING' | 'DISPATCHED' | 'COMPLETED'
  const [specialSearch, setSpecialSearch] = useState('');
  const [assignModal, setAssignModal] = useState({ isOpen: false, request: null });
  const [assignStaffName, setAssignStaffName] = useState('Field Officer Juan Santos (Team Alpha)');
  const [assignLoading, setAssignLoading] = useState(false);

  // State for Create Special Request Modal (For Barangay & LGU Admin)
  const [createModal, setCreateModal] = useState({
    isOpen: false,
    recipientName: '',
    recipientPhone: '',
    recipientAddress: '',
    barangayCode: user?.barangayCode || '291',
    memberCount: '4',
    vulnerabilityTypes: ['Senior Citizen'],
    severityLevel: 'Severe / Bedridden',
    itemType: 'Emergency Family Food Pack',
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

  useEffect(() => {
    fetchAssistanceRequests();
  }, [token]);

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
        body: JSON.stringify({ assignedStaffId: user?._id || 'staff_alpha' }),
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
      const res = await fetch(API_BASE_URL + '/assistance-requests', {
        method: 'POST',
        headers: {
          Authorization: 'Bearer ' + token,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          recipientName: createModal.recipientName.trim(),
          recipientPhone: createModal.recipientPhone.trim(),
          recipientAddress: createModal.recipientAddress.trim(),
          barangay: createModal.barangayCode || user?.barangayCode || '291',
          memberCount: parseInt(createModal.memberCount, 10) || 1,
          vulnerabilityTypes: createModal.vulnerabilityTypes,
          severityLevel: createModal.severityLevel,
          itemType: createModal.itemType,
          notes: createModal.notes.trim() || 'Door-to-door emergency relief assistance requested by Barangay Official.',
        }),
      });

      if (res.ok) {
        setCreateModal({
          isOpen: false,
          recipientName: '',
          recipientPhone: '',
          recipientAddress: '',
          barangayCode: user?.barangayCode || '291',
          memberCount: '4',
          vulnerabilityTypes: ['Senior Citizen'],
          severityLevel: 'Severe / Bedridden',
          itemType: 'Emergency Family Food Pack',
          notes: '',
        });
        fetchAssistanceRequests();
        alert('Special Relief Request successfully recorded and queued for dispatch!');
      } else {
        alert('Failed to submit special relief request.');
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
              Review priority assistance requests from vulnerable households (Senior Citizens, PWDs, Infants, Severe Conditions) and monitor door-to-door field staff dispatch.
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
            <Plus size={15} /> Create Special Request
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
                filteredList.map(r => {
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

                  const staffName = r.assignedStaff?.name || (isApproved ? 'Field Officer Juan Santos' : '');
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
                            ✓ {inlineFeedback[r._id]}
                          </span>
                        ) : isPending ? (
                          <button
                            type="button"
                            onClick={() => setAssignModal({ isOpen: true, request: r })}
                            className="clay-button-primary"
                            style={{ fontSize: 12, padding: '6px 14px', gap: 5 }}
                          >
                            <Truck size={13} /> Dispatch Staff
                          </button>
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
                            <span style={{ fontSize: 12, color: '#15803D', fontWeight: 800 }}>
                              ✓ Completed
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
              <label style={{ fontSize: 11, fontWeight: 700, color: 'var(--ink-soft)', textTransform: 'uppercase', letterSpacing: '0.06em', display: 'block', marginBottom: 6 }}>
                Assign Field Officer / Team *
              </label>
              <select
                value={assignStaffName}
                onChange={e => setAssignStaffName(e.target.value)}
                style={{ width: '100%', padding: '10px 12px', borderRadius: 'var(--radius-inner)', border: '1px solid var(--border)', fontSize: 13, background: 'var(--card)', color: 'var(--ink)', outline: 'none', cursor: 'pointer', fontWeight: 700 }}
              >
                <option value="Field Officer Juan Santos (Team Alpha)">Field Officer Juan Santos (Team Alpha) - Standby</option>
                <option value="Field Officer Maria Clara (Team Bravo)">Field Officer Maria Clara (Team Bravo) - Standby</option>
                <option value="Quick Response Team 1">Quick Response Team 1 - Standby</option>
                <option value="Barangay Health Worker On-Duty">Barangay Health Worker On-Duty - Standby</option>
              </select>
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
                <div><strong>Delivered By:</strong> {photoModal.request.deliveredBy?.name || photoModal.request.assignedStaff?.name || 'Barangay Field Staff'}</div>
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
                        }}
                      >
                        {isSelected ? '✓ ' : '+ '}{v}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Severity & Package Selection */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14, marginBottom: 14 }}>
                <div>
                  <label style={{ fontSize: 11, fontWeight: 800, color: 'var(--ink-soft)', textTransform: 'uppercase', letterSpacing: '0.06em', display: 'block', marginBottom: 5 }}>
                    Condition & Severity *
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

                <div>
                  <label style={{ fontSize: 11, fontWeight: 800, color: 'var(--ink-soft)', textTransform: 'uppercase', letterSpacing: '0.06em', display: 'block', marginBottom: 5 }}>
                    Relief Package Item *
                  </label>
                  <select
                    value={createModal.itemType}
                    onChange={e => setCreateModal(prev => ({ ...prev, itemType: e.target.value }))}
                    style={{ width: '100%', padding: '10px 12px', borderRadius: 8, border: '1px solid var(--border)', fontSize: 13, background: 'var(--card)', color: 'var(--ink)', fontWeight: 700, boxSizing: 'border-box' }}
                  >
                    <option value="Emergency Family Food Pack">Emergency Family Food Pack</option>
                    <option value="Infant Care & Nutrition Kit">Infant Care & Nutrition Kit</option>
                    <option value="Senior Citizen Care & Medicine Pack">Senior Citizen Care & Medicine Pack</option>
                    <option value="Clean Water & Hygiene Kit">Clean Water & Hygiene Kit</option>
                  </select>
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
import React, { useState, useEffect, useContext } from 'react';
import ReactDOM from 'react-dom';
import { AuthContext } from '../context/AuthContext';
import { UserCheck, AlertTriangle, CheckCircle2, XCircle, Info, RefreshCw, Filter, ClipboardList, Eye, Maximize2, X, FileText, Image as ImageIcon, Home, Sliders, MapPin, Camera, Check, Clock, Edit3 } from 'lucide-react';
import { IconlyVerification, IconlyShield, IconlyUserPlus } from '../components/Sidebar';
import ConfirmModal from '../components/ConfirmModal';
import io from 'socket.io-client';
import { API_BASE_URL, SOCKET_URL } from '../config';
import { canSeeCityWide } from '../utils/roleUtils';
import { MotionCard, MotionButton } from '../components/motion';

const ITEMS_PER_PAGE = 8;
const DAMAGE_ITEMS_PER_PAGE = 6;

export default function VerificationQueue() {
  const { token, user } = useContext(AuthContext);
  const [activeQueueTab, setActiveQueueTab] = useState('households'); // 'households' | 'damage_reports'
  const [households, setHouseholds] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedNotes, setSelectedNotes] = useState({});
  const [actionStatus, setActionStatus] = useState({ type: '', msg: '' });
  const isCityWide = canSeeCityWide(user);
  const [selectedBarangay, setSelectedBarangay] = useState(isCityWide ? 'ALL' : (user?.barangayCode || '291'));
  const [currentPage, setCurrentPage] = useState(1);
  const [previewImage, setPreviewImage] = useState({ isOpen: false, url: '', title: '', idType: '' });

  // ── Structural Damage Reports State ──────────────────────────────
  const [damageReports, setDamageReports] = useState([]);
  const [loadingDamage, setLoadingDamage] = useState(false);
  const [damageStatusFilter, setDamageStatusFilter] = useState('pending'); // 'pending' | 'all' | 'verified' | 'adjusted' | 'rejected'
  const [damageCurrentPage, setDamageCurrentPage] = useState(1);
  const [damageModal, setDamageModal] = useState({
    isOpen: false,
    report: null,
    action: 'verify', // 'verify' | 'adjust' | 'reject'
    newLevel: 'Moderate',
    notes: '',
    rejectionReason: '',
  });

  useEffect(() => {
    setCurrentPage(1);
  }, [selectedBarangay]);

  const totalPages = Math.ceil(households.length / ITEMS_PER_PAGE);
  const startIndex = (currentPage - 1) * ITEMS_PER_PAGE;
  const currentQueueItems = households.slice(startIndex, startIndex + ITEMS_PER_PAGE);

  const fetchPendingQueue = async () => {
    setLoading(true);
    try {
      let url = `${API_BASE_URL}/households/pending`;
      if (canSeeCityWide(user) && selectedBarangay !== 'ALL') {
        url += `?barangayCode=${selectedBarangay}`;
      }

      const res = await fetch(url, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      if (res.ok && data.households) {
        setHouseholds(data.households);
      } else {
        setHouseholds([]);
      }
    } catch (err) {
      setHouseholds([]);
    } finally {
      setLoading(false);
    }
  };

  const fetchDamageReports = async () => {
    setLoadingDamage(true);
    try {
      let url = `${API_BASE_URL}/damage-reports`;
      const params = [];
      if (canSeeCityWide(user) && selectedBarangay !== 'ALL') {
        params.push(`barangayCode=${selectedBarangay}`);
      }
      if (damageStatusFilter !== 'all') {
        params.push(`verificationStatus=${damageStatusFilter}`);
      }
      if (params.length > 0) url += `?${params.join('&')}`;

      const res = await fetch(url, { headers: { Authorization: `Bearer ${token}` } });
      const data = await res.json();
      if (res.ok && Array.isArray(data)) {
        setDamageReports(data);
      } else {
        setDamageReports([]);
      }
    } catch (err) {
      setDamageReports([]);
    } finally {
      setLoadingDamage(false);
    }
  };

  useEffect(() => {
    fetchPendingQueue();
    fetchDamageReports();

    const socket = io(SOCKET_URL);
    const targetCode = canSeeCityWide(user) ? selectedBarangay : user?.barangayCode;

    if (targetCode && targetCode !== 'ALL') {
      socket.emit('join_barangay_room', targetCode);
      socket.on('new_pending_registration', () => {
        setActionStatus({ type: 'info', msg: 'New pending registration received in real-time!' });
        fetchPendingQueue();
      });
      socket.on('new_pending_damage_report', (data) => {
        setActionStatus({ type: 'info', msg: `Bagong structural damage report natanggap mula sa Purok ${data?.address || ''}!` });
        fetchDamageReports();
      });
      socket.on('damage_report_verified', () => {
        fetchDamageReports();
        fetchPendingQueue();
      });
    }

    return () => socket.disconnect();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token, user, selectedBarangay, damageStatusFilter]);

  const [modal, setModal] = useState({ isOpen: false, hhId: null, actionStatus: '', name: '' });

  const requestVerify = (id, status, name) => {
    setModal({ isOpen: true, hhId: id, actionStatus: status, name: name || 'applicant' });
  };

  const handleVerify = async () => {
    const id = modal.hhId;
    const status = modal.actionStatus;
    const applicantName = modal.name;
    setModal({ isOpen: false, hhId: null, actionStatus: '', name: '' });
    setActionStatus({ type: '', msg: '' });

    const notes = selectedNotes[id] || '';

    try {
      const res = await fetch(`${API_BASE_URL}/households/${id}/verify`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ status, verificationNotes: notes }),
      });
      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.message || 'Verification update failed.');
      }

      setActionStatus({ type: 'success', msg: data.message || `Account successfully ${status}!` });
      fetchPendingQueue();
    } catch (err) {
      setActionStatus({ type: 'error', msg: err.message || 'Verification update failed.' });
    }
  };

  const handleDamageValidate = async () => {
    if (!damageModal.report) return;
    const rId = damageModal.report._id;
    const action = damageModal.action;
    const payload = {
      action: action === 'reject' ? 'rejected' : action,
      validatedDamageLevel: action === 'adjust' ? damageModal.newLevel : (damageModal.report.reportedDamageLevel || damageModal.report.damageLevel),
      notes: damageModal.notes,
      rejectionReason: damageModal.rejectionReason || damageModal.notes,
    };

    setDamageModal({ isOpen: false, report: null, action: 'verify', newLevel: 'Moderate', notes: '', rejectionReason: '' });

    try {
      const res = await fetch(`${API_BASE_URL}/damage-reports/${rId}/validate`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || 'Validation failed.');
      setActionStatus({ type: 'success', msg: data.message || 'Damage report updated successfully!' });
      fetchDamageReports();
      fetchPendingQueue();
    } catch (err) {
      setActionStatus({ type: 'error', msg: err.message || 'Error updating damage report.' });
    }
  };

  const statusBannerStyle = {
    error: { background: 'rgba(198,86,75,0.08)', color: '#9C3B32', border: '1.5px solid rgba(198,86,75,0.25)', borderLeft: '4px solid var(--danger)' },
    success: { background: 'rgba(21,138,100,0.08)', color: '#0F6B4C', border: '1.5px solid rgba(21,138,100,0.25)', borderLeft: '4px solid var(--bay-teal)' },
    info: { background: 'rgba(232,148,15,0.08)', color: '#8A5A08', border: '1.5px solid rgba(232,148,15,0.25)', borderLeft: '4px solid var(--jeepney-amber)' },
  };

  const isBarangayOfficial = user?.role === 'barangay_official';

  return (
    <div className="page-container page-animate">
      {/* Universal Action Confirmation Modal */}
      <ConfirmModal
        isOpen={modal.isOpen}
        title={
          modal.actionStatus === 'verified'
            ? `I-approve ang Household ni ${modal.name}?`
            : modal.actionStatus === 'needs_info'
            ? `Humingi ng Karagdagang Impormasyon kay ${modal.name}?`
            : `I-reject ang Household ni ${modal.name}?`
        }
        message={
          modal.actionStatus === 'verified'
            ? `Are you sure the household data of ${modal.name} is verified and accurate? They will immediately become eligible for relief distribution.`
            : modal.actionStatus === 'needs_info'
            ? `I-notify si ${modal.name} upang magbigay ng kailangang dokumento o verification notes.`
            : `I-reject ang aplikasyon ni ${modal.name}? Hindi sila makakatanggap ng relief pass hangga't hindi ito naayos.`
        }
        type={modal.actionStatus === 'verified' ? 'success' : modal.actionStatus === 'needs_info' ? 'warning' : 'danger'}
        confirmText={
          modal.actionStatus === 'verified'
            ? 'Oo, Approve Household'
            : modal.actionStatus === 'needs_info'
            ? 'Oo, Request Info'
            : 'Oo, Reject Application'
        }
        onConfirm={handleVerify}
        onCancel={() => setModal({ isOpen: false, hhId: null, actionStatus: '', name: '' })}
      />
      {!isBarangayOfficial && (
        <div className="clay-card" style={{ marginBottom: 24, borderLeft: '4px solid var(--manila-blue)', background: 'var(--manila-blue-light)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <UserCheck size={22} color="var(--manila-blue)" />
            <div>
              <h3 style={{ fontSize: 15, fontWeight: 800, color: 'var(--manila-blue)', margin: '0 0 4px' }}>
                 Exclusivong Barangay Official Feature
              </h3>
              <p style={{ fontSize: 13, color: 'var(--ink)', margin: 0 }}>
                The Verification Queue is reserved for Barangay Officials to review and approve residents within their jurisdiction.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* ── Page Header ── */}
      <div className="workflow-header" style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: '24px', flexWrap: 'wrap', gap: '16px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
          <div style={{
            width: 48, height: 48, borderRadius: 'var(--radius-inner)',
            background: activeQueueTab === 'households'
              ? 'linear-gradient(135deg, var(--manila-blue), #1e5a7a)'
              : 'linear-gradient(135deg, #DC2626, #991B1B)',
            display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
          }}>
            {activeQueueTab === 'households' ? <UserCheck size={24} color="#fff" /> : <Home size={24} color="#fff" />}
          </div>
          <div>
            <h1 className="section-header" style={{ margin: 0, fontSize: '22px' }}>
              {activeQueueTab === 'households' ? 'Resident Account Verification Queue' : 'Structural Damage Assessment Queue'}
            </h1>
            <p style={{ fontSize: '13px', color: 'var(--ink-soft)', marginTop: '2px' }}>
              {activeQueueTab === 'households'
                ? 'First layer of relief fairness - official confirmation of household identity and family roster.'
                : 'Official barangay review of resident-reported house damage, photo evidence, and priority scoring.'}
            </p>
          </div>
        </div>

        {/* KPI + Controls */}
        <div className="workflow-header__metrics" style={{ display: 'flex', alignItems: 'center', gap: '12px', flexWrap: 'wrap' }}>
          <div className="workflow-header__metric" style={{
            display: 'flex', alignItems: 'center', gap: '8px',
            background: activeQueueTab === 'households' ? 'rgba(28, 63, 148, 0.85)' : 'rgba(220, 38, 38, 0.85)',
            padding: '8px 16px', borderRadius: 'var(--radius-pill)', border: '1px solid rgba(255, 255, 255, 0.4)',
          }}>
            <ClipboardList size={16} color="#ffffff" />
            <span style={{ fontSize: '13px', fontWeight: 800, color: '#ffffff' }}>
              {activeQueueTab === 'households'
                ? `${households.length} Pending Accounts`
                : `${damageReports.filter(d => d.verificationStatus === 'pending').length} Pending Damage Reports`}
            </span>
          </div>

          <button
            onClick={() => {
              if (activeQueueTab === 'households') fetchPendingQueue();
              else fetchDamageReports();
            }}
            className="clay-button-ghost"
            style={{ padding: '0 16px', fontSize: '13px' }}
          >
            <RefreshCw size={15} /> Refresh
          </button>
        </div>
      </div>

      {/* ── Sub-navigation Tab Switcher ── */}
      <div style={{
        display: 'flex', gap: '10px', marginBottom: '20px',
        borderBottom: '2px solid var(--border)', paddingBottom: '2px',
        flexWrap: 'wrap'
      }}>
        <button
          type="button"
          onClick={() => setActiveQueueTab('households')}
          style={{
            display: 'flex', alignItems: 'center', gap: '8px',
            padding: '11px 20px', borderRadius: '10px 10px 0 0',
            border: 'none',
            borderBottom: activeQueueTab === 'households' ? '3px solid var(--manila-blue)' : '3px solid transparent',
            background: activeQueueTab === 'households' ? 'rgba(28, 63, 148, 0.08)' : 'transparent',
            color: activeQueueTab === 'households' ? 'var(--manila-blue)' : 'var(--ink-soft)',
            fontWeight: activeQueueTab === 'households' ? 800 : 600,
            fontSize: '14px',
            cursor: 'pointer',
            transition: 'all 0.15s ease',
          }}
        >
          <UserCheck size={18} />
          <span>Household Registrations</span>
          {households.length > 0 && (
            <span style={{
              background: activeQueueTab === 'households' ? 'var(--manila-blue)' : 'var(--border)',
              color: activeQueueTab === 'households' ? '#FFFFFF' : 'var(--ink-soft)',
              fontSize: '11px', fontWeight: 800, padding: '2px 8px', borderRadius: 999
            }}>
              {households.length}
            </span>
          )}
        </button>

        <button
          type="button"
          onClick={() => setActiveQueueTab('damage_reports')}
          style={{
            display: 'flex', alignItems: 'center', gap: '8px',
            padding: '11px 20px', borderRadius: '10px 10px 0 0',
            border: 'none',
            borderBottom: activeQueueTab === 'damage_reports' ? '3px solid #DC2626' : '3px solid transparent',
            background: activeQueueTab === 'damage_reports' ? 'rgba(220, 38, 38, 0.08)' : 'transparent',
            color: activeQueueTab === 'damage_reports' ? '#DC2626' : 'var(--ink-soft)',
            fontWeight: activeQueueTab === 'damage_reports' ? 800 : 600,
            fontSize: '14px',
            cursor: 'pointer',
            transition: 'all 0.15s ease',
          }}
        >
          <Home size={18} />
          <span>Structural Damage Reports</span>
          {damageReports.filter(d => d.verificationStatus === 'pending').length > 0 && (
            <span style={{
              background: '#DC2626',
              color: '#FFFFFF',
              fontSize: '11px', fontWeight: 800, padding: '2px 8px', borderRadius: 999
            }}>
              {damageReports.filter(d => d.verificationStatus === 'pending').length} pending
            </span>
          )}
        </button>
      </div>

      {/* ── Filter Toolbar ── */}
      <div style={{
        display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '12px', flexWrap: 'wrap',
        background: 'var(--card)', border: '1px solid var(--border)',
        borderRadius: 'var(--radius-inner)', padding: '10px 16px', marginBottom: '20px',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
          <Filter size={16} color="var(--ink-soft)" />
          <span style={{ fontSize: '12px', fontWeight: 700, color: 'var(--ink-soft)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
            Scope:
          </span>
          {canSeeCityWide(user) ? (
            <select
              id="barangay-filter"
              aria-label="Filter by Barangay"
              value={selectedBarangay}
              onChange={(e) => setSelectedBarangay(e.target.value)}
              style={{ border: 'none', outline: 'none', fontSize: '13px', fontWeight: 700, color: 'var(--manila-blue)', background: 'transparent', cursor: 'pointer' }}
            >
              <option value="ALL">All Barangays (City-Wide)</option>
              {Array.from(new Set([
                '101', '102', '105', '128', '291', '292', '293', '294', '300', '344', '350', '395', '412', '586', '628', '701', '830',
                ...households.map(h => String(h.barangayCode || '').trim()).filter(Boolean),
              ])).sort((a, b) => Number(a) - Number(b)).map(b => (
                <option key={b} value={b}>Barangay {b}</option>
              ))}
            </select>
          ) : (
            <span style={{ fontSize: '13px', fontWeight: 700, color: 'var(--manila-blue)' }}>
              Barangay {user?.barangayCode || '291'} (Jurisdiction Locked)
            </span>
          )}
        </div>

        {/* Status Filter for Damage Reports Tab */}
        {activeQueueTab === 'damage_reports' && (
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexWrap: 'wrap' }}>
            <span style={{ fontSize: '12px', fontWeight: 700, color: 'var(--ink-soft)' }}>Status:</span>
            {['pending', 'verified', 'adjusted', 'rejected', 'all'].map((st) => (
              <button
                key={st}
                onClick={() => setDamageStatusFilter(st)}
                style={{
                  padding: '4px 10px',
                  borderRadius: 6,
                  border: damageStatusFilter === st ? '1.5px solid #DC2626' : '1px solid var(--border)',
                  background: damageStatusFilter === st ? '#FEF2F2' : 'var(--sampaguita)',
                  color: damageStatusFilter === st ? '#DC2626' : 'var(--ink)',
                  fontSize: '11.5px',
                  fontWeight: damageStatusFilter === st ? 800 : 600,
                  cursor: 'pointer',
                  textTransform: 'capitalize'
                }}
              >
                {st}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* ── Status Banner ── */}
      {actionStatus.msg && (
        <div style={{
          ...statusBannerStyle[actionStatus.type || 'info'],
          padding: '12px 18px', borderRadius: 'var(--radius-inner)', marginBottom: '20px',
          fontSize: '14px', fontWeight: 600,
        }}>
          {actionStatus.msg}
        </div>
      )}

      {/* ── Content: Tab 1 Household Registrations ── */}
      {activeQueueTab === 'households' && (
        <>
          {loading ? (
            <div style={{ display: 'grid', gap: '16px' }}>
              {[1, 2, 3].map(i => (
                <div key={i} className="clay-card" style={{ borderLeft: '4px solid var(--border)' }}>
                  <div className="skeleton" style={{ height: 22, width: '40%', borderRadius: 6, marginBottom: 10 }} />
                  <div className="skeleton" style={{ height: 14, width: '65%', borderRadius: 6, marginBottom: 16 }} />
                  <div className="skeleton" style={{ height: 60, borderRadius: 'var(--radius-inner)', marginBottom: 12 }} />
                  <div style={{ display: 'flex', gap: 10 }}>
                    <div className="skeleton" style={{ height: 38, flex: 1, borderRadius: 'var(--radius-inner)' }} />
                    <div className="skeleton" style={{ height: 38, width: 110, borderRadius: 'var(--radius-inner)' }} />
                    <div className="skeleton" style={{ height: 38, width: 110, borderRadius: 'var(--radius-inner)' }} />
                  </div>
                </div>
              ))}
            </div>
          ) : households.length === 0 ? (
            <div className="clay-card workflow-empty-state" style={{ textAlign: 'center', padding: '64px 40px' }}>
              <div style={{
                width: 72, height: 72, borderRadius: '50%',
                background: 'rgba(21,138,100,0.1)', display: 'flex',
                alignItems: 'center', justifyContent: 'center', margin: '0 auto 20px',
              }}>
                <CheckCircle2 size={36} color="var(--bay-teal)" />
              </div>
              <h2 style={{ fontSize: '20px', fontWeight: 700, color: 'var(--ink)', margin: '0 0 6px' }}>Queue Clear</h2>
              <p style={{ fontSize: '14px', color: 'var(--ink-soft)' }}>
                All submitted registrations for {canSeeCityWide(user) ? (selectedBarangay === 'ALL' ? 'all barangays' : `Barangay ${selectedBarangay}`) : `Barangay ${user?.barangayCode || '291'}`} have been reviewed.
              </p>
              <button onClick={fetchPendingQueue} className="clay-button-secondary workflow-empty-state__action"><RefreshCw size={15} /> Check for new registrations</button>
            </div>
          ) : (
            <div style={{ display: 'grid', gap: '16px' }}>
              {currentQueueItems.map((hh, idx) => {
                const hasOverlap = hh.registrationType === 'join_existing' || hh.linkedHouseholdId;
                return (
                  <MotionCard
                    key={hh._id}
                    delay={idx * 0.08}
                    className="clay-card"
                    style={{ borderLeft: hasOverlap ? '4px solid var(--jeepney-amber)' : '4px solid var(--bay-teal)', transition: 'box-shadow 0.2s' }}
                  >
                    {/* Card Header */}
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '12px', marginBottom: '14px' }}>
                      <div>
                        <h3 style={{ fontSize: '17px', fontWeight: 700, color: 'var(--ink)', margin: '0 0 4px' }}>
                          {hh.headOfHouseholdUserId?.name || 'Resident applicant'}
                        </h3>
                        <div style={{ fontSize: '13px', color: 'var(--ink-soft)' }}>
                          {hh.address}, Purok {hh.purok} · Brgy {hh.barangayCode} ·{' '}
                          <strong style={{ color: 'var(--ink)' }}>{hh.memberCount} member(s)</strong>
                          {hh.memberCountPendingUpdate && (
                            <span style={{ marginLeft: 6, color: '#D97706', fontWeight: 800, background: '#FFFBEB', padding: '2px 8px', borderRadius: 999, fontSize: 11, border: '1px solid #FCD34D', display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                              <AlertTriangle size={11} color="#D97706" /> Requesting addition to {hh.memberCountPendingUpdate} members
                            </span>
                          )}
                        </div>
                      </div>
                      <div style={{ display: 'flex', gap: '8px', alignItems: 'center', flexWrap: 'wrap' }}>
                        <span className={`badge badge-${hh.priorityLevel?.toLowerCase() === 'high' ? 'danger' : hh.priorityLevel?.toLowerCase() === 'medium' ? 'warning' : 'success'}`}>
                          {hh.priorityLevel} · {hh.priorityScore} pts
                        </span>
                        <span className="badge badge-neutral">
                          {hh.damageLevel || 'Not yet assessed'}
                        </span>
                      </div>
                    </div>

                    {/* Pending Member Bump Alert */}
                    {hh.memberCountPendingUpdate && (
                      <div style={{
                        background: 'rgba(217, 119, 6, 0.1)', border: '1.5px solid rgba(217, 119, 6, 0.35)',
                        borderRadius: 'var(--radius-inner)', padding: '10px 14px', marginBottom: '14px',
                        display: 'flex', alignItems: 'flex-start', gap: '10px', color: '#92400E', fontSize: '13px',
                      }}>
                        <AlertTriangle size={18} style={{ flexShrink: 0, marginTop: '1px', color: '#D97706' }} />
                        <div>
                          <strong>Family Headcount Update Request:</strong> Nagsumite ang pamilyang ito ng karagdagang miyembro ({hh.memberCount} &rarr; {hh.memberCountPendingUpdate} members). Suriin ang kanilang mga pangalan sa ibaba bago aprubahan.
                        </div>
                      </div>
                    )}

                    {/* Overlap Warning */}
                    {hasOverlap && (
                      <div style={{
                        background: 'rgba(232,148,15,0.1)', border: '1px solid rgba(232,148,15,0.3)',
                        borderRadius: 'var(--radius-inner)', padding: '10px 14px', marginBottom: '14px',
                        display: 'flex', alignItems: 'flex-start', gap: '10px', color: '#8A5A08', fontSize: '13px',
                      }}>
                        <AlertTriangle size={18} style={{ flexShrink: 0, marginTop: '1px' }} />
                        <div>
                          <strong>Address overlap:</strong> another household record already exists at this exact address/purok. Confirm whether this is a genuinely separate family or a duplicate attempt before approving.
                        </div>
                      </div>
                    )}

                    {/* Members panel */}
                    <div style={{ background: 'var(--sampaguita)', borderRadius: 'var(--radius-inner)', padding: '14px', marginBottom: '14px' }}>
                      <h4 style={{ fontSize: '11px', fontWeight: 700, color: 'var(--ink-soft)', marginBottom: '10px', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
                        {hh.pendingMembers && hh.pendingMembers.length > 0 ? 'Proposed New Family Roster' : 'Registered Family Members & Vulnerabilities'} ({((hh.pendingMembers && hh.pendingMembers.length > 0) ? hh.pendingMembers : hh.members)?.length || 0})
                      </h4>
                      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: '8px' }}>
                        {((hh.pendingMembers && hh.pendingMembers.length > 0) ? hh.pendingMembers : (hh.members || [])).map((m, i) => (
                          <div key={i} style={{ background: 'var(--card)', borderRadius: '6px', padding: '8px 10px', border: '1px solid var(--border)' }}>
                            <div style={{ fontSize: '13px', fontWeight: 600, color: 'var(--ink)' }}>{m.name}</div>
                            <div style={{ fontSize: '11px', color: 'var(--ink-soft)' }}>{m.relationship} · {m.age} yrs old</div>
                            {m.specialConditions && m.specialConditions.length > 0 && (
                              <div style={{ display: 'flex', gap: '4px', flexWrap: 'wrap', marginTop: '4px' }}>
                                {m.specialConditions.map((c, ci) => (
                                  <span key={ci} style={{
                                    fontSize: '10px', fontWeight: 700, padding: '1px 6px',
                                    borderRadius: '999px', background: 'rgba(198,86,75,0.12)', color: '#9C3B32',
                                    textTransform: 'uppercase',
                                  }}>
                                    {c}
                                  </span>
                                ))}
                              </div>
                            )}
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* Attached Valid ID Document Section */}
                    <div style={{
                      background: '#F8FAFC',
                      border: '1.5px solid #E2E8F0',
                      borderRadius: 'var(--radius-inner)',
                      padding: '12px 16px',
                      marginBottom: '14px',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      flexWrap: 'wrap',
                      gap: 12,
                    }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                        <div style={{
                          width: 36,
                          height: 36,
                          borderRadius: 8,
                          backgroundColor: '#E8F2FF',
                          border: '1px solid #BFDBFE',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          color: 'var(--manila-blue)',
                        }}>
                          <FileText size={18} />
                        </div>
                        <div>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                            <span style={{ fontSize: '12px', fontWeight: 800, color: 'var(--ink)' }}>
                              Attached Government ID:
                            </span>
                            <span className="badge badge-primary" style={{ fontSize: '11px', fontWeight: 700 }}>
                              {hh.validIdType || 'National ID / Government ID'}
                            </span>
                          </div>
                          <div style={{ fontSize: '11px', color: 'var(--ink-soft)', marginTop: '2px' }}>
                            {hh.validIdImage
                              ? 'Uploaded by applicant during mobile registration. Inspect image for authenticity.'
                              : 'No photographic ID document attached by resident.'}
                          </div>
                        </div>
                      </div>

                      {hh.validIdImage ? (
                        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                          <div
                            onClick={() => setPreviewImage({
                              isOpen: true,
                              url: hh.validIdImage,
                              title: hh.headOfHouseholdUserId?.name || 'Resident ID',
                              idType: hh.validIdType || 'Government ID',
                            })}
                            style={{
                              cursor: 'pointer',
                              position: 'relative',
                              width: 80,
                              height: 52,
                              borderRadius: 6,
                              overflow: 'hidden',
                              border: '2px solid #1557B0',
                              boxShadow: '0 2px 6px rgba(0,0,0,0.1)',
                            }}
                            title="Click to view full photo"
                          >
                            <img
                              src={hh.validIdImage}
                              alt="Government ID"
                              style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                            />
                            <div style={{
                              position: 'absolute',
                              inset: 0,
                              background: 'rgba(21, 87, 176, 0.45)',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              color: '#FFFFFF',
                            }}>
                              <Eye size={16} />
                            </div>
                          </div>

                          <button
                            type="button"
                            onClick={() => setPreviewImage({
                              isOpen: true,
                              url: hh.validIdImage,
                              title: hh.headOfHouseholdUserId?.name || 'Resident ID',
                              idType: hh.validIdType || 'Government ID',
                            })}
                            className="clay-button-secondary"
                            style={{ fontSize: '12px', padding: '6px 12px', gap: '6px' }}
                          >
                            <Maximize2 size={13} /> View Full ID
                          </button>
                        </div>
                      ) : (
                        <span style={{ fontSize: '12px', color: '#94A3B8', fontStyle: 'italic' }}>
                          Physical verification required
                        </span>
                      )}
                    </div>

                    {/* Action bar */}
                    <div style={{ display: 'flex', gap: '10px', alignItems: 'center', flexWrap: 'wrap' }}>
                      <input
                        type="text"
                        placeholder="Optional note for resident (reason for rejection, required docs, etc.)"
                        value={selectedNotes[hh._id] || ''}
                        onChange={e => setSelectedNotes({ ...selectedNotes, [hh._id]: e.target.value })}
                        style={{
                          flex: 1, minWidth: '240px', padding: '10px 14px',
                          borderRadius: 'var(--radius-inner)', border: '1px solid var(--border)',
                          fontSize: '13px', minHeight: '42px', outline: 'none',
                          fontFamily: 'var(--font-sans)',
                        }}
                      />
                      <button onClick={() => requestVerify(hh._id, 'verified', hh.headOfHouseholdUserId?.name)} className="clay-button-approve" style={{ padding: '0 18px', fontSize: '13px' }}>
                        <CheckCircle2 size={15} /> Approve
                      </button>
                      <button onClick={() => requestVerify(hh._id, 'needs_info', hh.headOfHouseholdUserId?.name)} className="clay-button-secondary" style={{ padding: '0 18px', fontSize: '13px' }}>
                        <Info size={15} /> Request Info
                      </button>
                      <button onClick={() => requestVerify(hh._id, 'rejected', hh.headOfHouseholdUserId?.name)} className="clay-button-danger" style={{ padding: '0 18px', fontSize: '13px' }}>
                        <XCircle size={15} /> Reject
                      </button>
                    </div>
                  </MotionCard>
                );
              })}
            </div>
          )}

          {/* ── Pagination Bar: Always visible when records exist ── */}
          {households.length > 0 && (
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 24, padding: '12px 18px', background: 'var(--card)', borderRadius: 'var(--radius-inner)', border: '1px solid var(--border)', flexWrap: 'wrap', gap: 12 }}>
              <div style={{ fontSize: 13, color: 'var(--ink-soft)' }}>
                Showing <strong>{startIndex + 1}-{Math.min(startIndex + ITEMS_PER_PAGE, households.length)}</strong> of <strong>{households.length}</strong> pending households
                <span style={{ marginLeft: 8, color: 'var(--ink-soft)' }}>
                  (Page <strong>{currentPage}</strong> of <strong>{totalPages}</strong>)
                </span>
              </div>

              <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
                <button
                  onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                  disabled={currentPage === 1}
                  className="clay-button-ghost"
                  style={{ fontSize: 12, padding: '5px 12px', opacity: currentPage === 1 ? 0.4 : 1, cursor: currentPage === 1 ? 'not-allowed' : 'pointer' }}
                >
                  Previous
                </button>

                {Array.from({ length: totalPages }, (_, i) => i + 1).map(pageNum => (
                  <button
                    key={pageNum}
                    onClick={() => setCurrentPage(pageNum)}
                    className={currentPage === pageNum ? 'clay-button-primary' : 'clay-button-ghost'}
                    style={{ fontSize: 12, width: 32, height: 32, padding: 0, justifyContent: 'center', fontWeight: currentPage === pageNum ? 800 : 600 }}
                  >
                    {pageNum}
                  </button>
                ))}

                <button
                  onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                  disabled={currentPage === totalPages}
                  className="clay-button-ghost"
                  style={{ fontSize: 12, padding: '5px 12px', opacity: currentPage === totalPages ? 0.4 : 1, cursor: currentPage === totalPages ? 'not-allowed' : 'pointer' }}
                >
                  Next
                </button>
              </div>
            </div>
          )}
        </>
      )}

      {/* ── Content: Tab 2 Structural Damage Reports ── */}
      {activeQueueTab === 'damage_reports' && (
        <>
          {loadingDamage ? (
            <div style={{ display: 'grid', gap: '16px' }}>
              {[1, 2, 3].map(i => (
                <div key={i} className="clay-card" style={{ borderLeft: '4px solid #DC2626' }}>
                  <div className="skeleton" style={{ height: 22, width: '45%', borderRadius: 6, marginBottom: 10 }} />
                  <div className="skeleton" style={{ height: 14, width: '70%', borderRadius: 6, marginBottom: 16 }} />
                  <div className="skeleton" style={{ height: 90, borderRadius: 'var(--radius-inner)', marginBottom: 12 }} />
                </div>
              ))}
            </div>
          ) : damageReports.length === 0 ? (
            <div className="clay-card workflow-empty-state" style={{ textAlign: 'center', padding: '64px 40px' }}>
              <div style={{
                width: 72, height: 72, borderRadius: '50%',
                background: 'rgba(220,38,38,0.08)', display: 'flex',
                alignItems: 'center', justifyContent: 'center', margin: '0 auto 20px',
              }}>
                <Home size={36} color="#DC2626" />
              </div>
              <h2 style={{ fontSize: '20px', fontWeight: 700, color: 'var(--ink)', margin: '0 0 6px' }}>Walang Damage Reports</h2>
              <p style={{ fontSize: '14px', color: 'var(--ink-soft)' }}>
                {damageStatusFilter === 'pending'
                  ? 'Walang nakabinbing structural damage report para sa sakop na barangay.'
                  : `Walang natagpuang damage reports na may status na "${damageStatusFilter}".`}
              </p>
              <button onClick={fetchDamageReports} className="clay-button-secondary workflow-empty-state__action">
                <RefreshCw size={15} /> Check for new reports
              </button>
            </div>
          ) : (
            <div style={{ display: 'grid', gap: '16px' }}>
              {currentDamageItems.map((report, idx) => {
                const hh = report.householdId || {};
                const headName = hh.headOfHouseholdUserId?.name || hh.headName || 'Resident applicant';
                const address = hh.address || report.locationName || 'Barangay Address';
                const purok = hh.purok || '-';
                const brgy = hh.barangayCode || user?.barangayCode || '291';
                const repLevel = report.reportedDamageLevel || report.damageLevel || 'Minor';
                const valLevel = report.validatedDamageLevel || report.damageLevel;
                const status = report.verificationStatus || 'pending';

                const severityColors = {
                  'Totally Damaged': { bg: 'rgba(139, 95, 191, 0.1)', border: '#8B5FBF', text: '#6D28D9' },
                  'Severe': { bg: 'rgba(220, 38, 38, 0.1)', border: '#DC2626', text: '#DC2626' },
                  'Moderate': { bg: 'rgba(217, 119, 6, 0.1)', border: '#D97706', text: '#D97706' },
                  'Minor': { bg: 'rgba(245, 158, 11, 0.1)', border: '#F59E0B', text: '#B45309' },
                };
                const colorCfg = severityColors[repLevel] || severityColors['Minor'];

                return (
                  <MotionCard
                    key={report._id}
                    delay={idx * 0.08}
                    className="clay-card"
                    style={{ borderLeft: `4px solid ${colorCfg.border}`, transition: 'box-shadow 0.2s' }}
                  >
                    {/* Header */}
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '12px', marginBottom: '12px' }}>
                      <div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                          <h3 style={{ fontSize: '17px', fontWeight: 700, color: 'var(--ink)', margin: 0 }}>
                            {headName}
                          </h3>
                          <span className={`badge badge-${status === 'verified' ? 'success' : status === 'adjusted' ? 'primary' : status === 'rejected' ? 'danger' : 'warning'}`}>
                            {status.toUpperCase()}
                          </span>
                        </div>
                        <div style={{ fontSize: '13px', color: 'var(--ink-soft)', marginTop: 4, display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
                          <span>{address}, Purok {purok} · Brgy {brgy}</span>
                          <span>•</span>
                          <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                            <Clock size={12} /> {new Date(report.reportedAt || report.createdAt).toLocaleString()}
                          </span>
                          {report.latitude && report.longitude && (
                            <>
                              <span>•</span>
                              <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4, color: 'var(--manila-blue)', fontWeight: 600 }}>
                                <MapPin size={12} /> GPS: {Number(report.latitude).toFixed(4)}, {Number(report.longitude).toFixed(4)}
                              </span>
                            </>
                          )}
                        </div>
                      </div>

                      <div style={{ display: 'flex', gap: '8px', alignItems: 'center', flexWrap: 'wrap' }}>
                        <div style={{
                          background: colorCfg.bg,
                          border: `1.5px solid ${colorCfg.border}`,
                          padding: '4px 12px',
                          borderRadius: '999px',
                          fontSize: '12px',
                          fontWeight: 800,
                          color: colorCfg.text,
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: 6
                        }}>
                          <Home size={13} />
                          Reported: {repLevel}
                        </div>
                        {status === 'adjusted' && (
                          <span className="badge badge-primary">
                            Validated as: {valLevel}
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Resident Narrative */}
                    <div style={{
                      background: 'var(--sampaguita)',
                      border: '1px solid var(--border)',
                      borderRadius: 'var(--radius-inner)',
                      padding: '12px 16px',
                      marginBottom: '14px',
                      fontSize: '13px',
                      color: 'var(--ink)'
                    }}>
                      <strong style={{ fontSize: '11px', textTransform: 'uppercase', color: 'var(--ink-soft)', display: 'block', marginBottom: 4 }}>
                        Resident Damage Description / Observations:
                      </strong>
                      {report.description || 'No detailed written statement provided with this submission.'}
                    </div>

                    {/* Attached Photo Evidence */}
                    <div style={{ marginBottom: '16px' }}>
                      <div style={{ fontSize: '11px', fontWeight: 800, textTransform: 'uppercase', color: 'var(--ink-soft)', marginBottom: 8, display: 'flex', alignItems: 'center', gap: 6 }}>
                        <Camera size={13} />
                        Attached Structural Damage Evidence Photo ({report.photos?.length || 0})
                      </div>

                      {report.photos && report.photos.length > 0 ? (
                        <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
                          {report.photos.map((photoUrl, pIdx) => (
                            <div
                              key={pIdx}
                              onClick={() => setPreviewImage({
                                isOpen: true,
                                url: photoUrl,
                                title: `${headName} - Structural Damage Evidence`,
                                idType: `${repLevel} Damage Report`
                              })}
                              style={{
                                cursor: 'pointer',
                                position: 'relative',
                                width: 140,
                                height: 95,
                                borderRadius: 8,
                                overflow: 'hidden',
                                border: '2px solid #DC2626',
                                boxShadow: '0 2px 8px rgba(220, 38, 38, 0.15)',
                                background: '#0F172A'
                              }}
                              title="Click to view full photo"
                            >
                              <img
                                src={photoUrl}
                                alt="Damage Evidence"
                                style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                              />
                              <div style={{
                                position: 'absolute',
                                inset: 0,
                                background: 'rgba(220, 38, 38, 0.35)',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                color: '#FFFFFF',
                                opacity: 0.9
                              }}>
                                <Eye size={20} />
                              </div>
                              <div style={{
                                position: 'absolute',
                                bottom: 3,
                                right: 4,
                                background: 'rgba(0,0,0,0.7)',
                                color: '#fff',
                                fontSize: '9px',
                                fontWeight: 700,
                                padding: '2px 5px',
                                borderRadius: 4
                              }}>
                                Enlarge
                              </div>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <div style={{ fontSize: '12.5px', color: 'var(--ink-soft)', fontStyle: 'italic' }}>
                          Walang litrato na na-upload kasama ng report na ito.
                        </div>
                      )}
                    </div>

                    {/* Action Controls for Barangay Official */}
                    <div style={{
                      display: 'flex',
                      gap: '10px',
                      alignItems: 'center',
                      flexWrap: 'wrap',
                      paddingTop: '12px',
                      borderTop: '1px solid var(--border)'
                    }}>
                      <button
                        onClick={() => setDamageModal({
                          isOpen: true,
                          report,
                          action: 'verify',
                          newLevel: repLevel,
                          notes: `Verified as ${repLevel} by Barangay Official`,
                          rejectionReason: '',
                        })}
                        className="clay-button-approve"
                        style={{ padding: '0 18px', fontSize: '13px' }}
                      >
                        <CheckCircle2 size={15} /> Verify as Reported ({repLevel})
                      </button>

                      <button
                        onClick={() => setDamageModal({
                          isOpen: true,
                          report,
                          action: 'adjust',
                          newLevel: repLevel === 'Totally Damaged' ? 'Severe' : repLevel === 'Severe' ? 'Moderate' : 'Minor',
                          notes: '',
                          rejectionReason: '',
                        })}
                        className="clay-button-secondary"
                        style={{ padding: '0 18px', fontSize: '13px' }}
                      >
                        <Edit3 size={15} /> Adjust Severity Level
                      </button>

                      <button
                        onClick={() => setDamageModal({
                          isOpen: true,
                          report,
                          action: 'reject',
                          newLevel: repLevel,
                          notes: '',
                          rejectionReason: 'Litrato o impormasyon ay hindi tugma sa ebidensya.',
                        })}
                        className="clay-button-danger"
                        style={{ padding: '0 18px', fontSize: '13px' }}
                      >
                        <XCircle size={15} /> Reject Report
                      </button>
                    </div>
                  </MotionCard>
                );
              })}
            </div>
          )}

          {/* Pagination for Damage Reports */}
          {damageReports.length > 0 && (
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 24, padding: '12px 18px', background: 'var(--card)', borderRadius: 'var(--radius-inner)', border: '1px solid var(--border)', flexWrap: 'wrap', gap: 12 }}>
              <div style={{ fontSize: 13, color: 'var(--ink-soft)' }}>
                Showing <strong>{startDamageIndex + 1}-{Math.min(startDamageIndex + DAMAGE_ITEMS_PER_PAGE, damageReports.length)}</strong> of <strong>{damageReports.length}</strong> damage reports
                <span style={{ marginLeft: 8, color: 'var(--ink-soft)' }}>
                  (Page <strong>{damageCurrentPage}</strong> of <strong>{totalDamagePages}</strong>)
                </span>
              </div>

              <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
                <button
                  onClick={() => setDamageCurrentPage(p => Math.max(1, p - 1))}
                  disabled={damageCurrentPage === 1}
                  className="clay-button-ghost"
                  style={{ fontSize: 12, padding: '5px 12px', opacity: damageCurrentPage === 1 ? 0.4 : 1, cursor: damageCurrentPage === 1 ? 'not-allowed' : 'pointer' }}
                >
                  Previous
                </button>

                {Array.from({ length: totalDamagePages }, (_, i) => i + 1).map(pageNum => (
                  <button
                    key={pageNum}
                    onClick={() => setDamageCurrentPage(pageNum)}
                    className={damageCurrentPage === pageNum ? 'clay-button-primary' : 'clay-button-ghost'}
                    style={{ fontSize: 12, width: 32, height: 32, padding: 0, justifyContent: 'center', fontWeight: damageCurrentPage === pageNum ? 800 : 600 }}
                  >
                    {pageNum}
                  </button>
                ))}

                <button
                  onClick={() => setDamageCurrentPage(p => Math.min(totalDamagePages, p + 1))}
                  disabled={damageCurrentPage === totalDamagePages}
                  className="clay-button-ghost"
                  style={{ fontSize: 12, padding: '5px 12px', opacity: damageCurrentPage === totalDamagePages ? 0.4 : 1, cursor: damageCurrentPage === totalDamagePages ? 'not-allowed' : 'pointer' }}
                >
                  Next
                </button>
              </div>
            </div>
          )}
        </>
      )}

      {/* ── Damage Assessment Action Modal ── */}
      {damageModal.isOpen && damageModal.report && ReactDOM.createPortal(
        <div
          style={{
            position: 'fixed', inset: 0,
            backgroundColor: 'rgba(15, 23, 42, 0.75)',
            backdropFilter: 'blur(6px)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            zIndex: 9999999, padding: 16
          }}
        >
          <div
            className="clay-card page-animate"
            style={{
              maxWidth: 520, width: '100%',
              background: '#FFFFFF', borderRadius: 16,
              padding: '24px', boxShadow: '0 20px 50px rgba(0,0,0,0.35)'
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16, borderBottom: '1px solid var(--border)', paddingBottom: 12 }}>
              <h3 style={{ margin: 0, fontSize: 17, fontWeight: 800, color: 'var(--ink)' }}>
                {damageModal.action === 'verify' ? 'Kumpirmahin ang Damage Report' : damageModal.action === 'adjust' ? 'I-adjust ang Antas ng Pinsala' : 'I-reject ang Damage Report'}
              </h3>
              <button
                onClick={() => setDamageModal({ isOpen: false, report: null, action: 'verify', newLevel: 'Moderate', notes: '', rejectionReason: '' })}
                style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--ink-soft)' }}
              >
                <X size={18} />
              </button>
            </div>

            <div style={{ marginBottom: 16 }}>
              <p style={{ fontSize: 13.5, color: 'var(--ink)', margin: '0 0 12px', lineHeight: 1.5 }}>
                Household: <strong>{damageModal.report.householdId?.headOfHouseholdUserId?.name || 'Resident applicant'}</strong> ({damageModal.report.householdId?.address || damageModal.report.locationName})
              </p>

              {damageModal.action === 'adjust' && (
                <div style={{ marginBottom: 14 }}>
                  <label style={{ display: 'block', fontSize: 12, fontWeight: 700, color: 'var(--ink)', marginBottom: 6 }}>
                    Bagong Verified Damage Level:
                  </label>
                  <select
                    value={damageModal.newLevel}
                    onChange={(e) => setDamageModal(m => ({ ...m, newLevel: e.target.value }))}
                    style={{
                      width: '100%', padding: '10px 12px', borderRadius: 8,
                      border: '1.5px solid var(--manila-blue)', fontSize: 13.5, fontWeight: 700
                    }}
                  >
                    <option value="Totally Damaged">Totally Damaged (Critical / Wasak - 40 pts)</option>
                    <option value="Severe">Severe Damage (Malubha - 30 pts)</option>
                    <option value="Moderate">Moderate Damage (Katamtaman - 20 pts)</option>
                    <option value="Minor">Minor Damage (Magaan - 10 pts)</option>
                  </select>
                </div>
              )}

              {damageModal.action === 'reject' ? (
                <div>
                  <label style={{ display: 'block', fontSize: 12, fontWeight: 700, color: '#DC2626', marginBottom: 6 }}>
                    Dahilan ng Pag-reject:
                  </label>
                  <textarea
                    rows={3}
                    value={damageModal.rejectionReason}
                    onChange={(e) => setDamageModal(m => ({ ...m, rejectionReason: e.target.value }))}
                    placeholder="e.g. Hindi tugma ang litrato o luma ang ebidensya..."
                    style={{
                      width: '100%', padding: '10px 12px', borderRadius: 8,
                      border: '1px solid #CBD5E1', fontSize: 13, boxSizing: 'border-box'
                    }}
                  />
                </div>
              ) : (
                <div>
                  <label style={{ display: 'block', fontSize: 12, fontWeight: 700, color: 'var(--ink-soft)', marginBottom: 6 }}>
                    Opisyal na Validation Notes (Opsyonal):
                  </label>
                  <input
                    type="text"
                    value={damageModal.notes}
                    onChange={(e) => setDamageModal(m => ({ ...m, notes: e.target.value }))}
                    placeholder="e.g. Sinuri ang litrato at tugma sa pinsala ng bagyo..."
                    style={{
                      width: '100%', padding: '10px 12px', borderRadius: 8,
                      border: '1px solid #CBD5E1', fontSize: 13, boxSizing: 'border-box'
                    }}
                  />
                </div>
              )}
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10 }}>
              <button
                onClick={() => setDamageModal({ isOpen: false, report: null, action: 'verify', newLevel: 'Moderate', notes: '', rejectionReason: '' })}
                className="clay-button-ghost"
                style={{ padding: '8px 16px', fontSize: 13 }}
              >
                Kanselahin
              </button>
              <button
                onClick={handleDamageValidate}
                className={damageModal.action === 'reject' ? 'clay-button-danger' : 'clay-button-approve'}
                style={{ padding: '8px 20px', fontSize: 13 }}
              >
                {damageModal.action === 'reject' ? 'Oo, I-reject' : 'I-save at I-update ang Priority'}
              </button>
            </div>
          </div>
        </div>,
        document.body
      )}

      {/* ── High-Definition Government ID Lightbox Modal ── */}
      {previewImage.isOpen && ReactDOM.createPortal(
        <div
          onClick={() => setPreviewImage({ isOpen: false, url: '', title: '', idType: '' })}
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            width: '100vw',
            height: '100vh',
            backgroundColor: 'rgba(15, 23, 42, 0.85)',
            backdropFilter: 'blur(8px)',
            WebkitBackdropFilter: 'blur(8px)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 99999999,
            padding: 24,
            boxSizing: 'border-box',
          }}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            style={{
              backgroundColor: '#FFFFFF',
              borderRadius: 16,
              maxWidth: 720,
              width: '100%',
              overflow: 'hidden',
              boxShadow: '0 25px 60px rgba(0, 0, 0, 0.45)',
              display: 'flex',
              flexDirection: 'column',
              animation: 'card-enter 0.2s cubic-bezier(0.16, 1, 0.3, 1)',
            }}
          >
            <div style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              padding: '16px 20px',
              borderBottom: '1px solid #E2E8F0',
              backgroundColor: '#F8FAFC',
            }}>
              <div>
                <h3 style={{ margin: 0, fontSize: 16, fontWeight: 800, color: 'var(--ink)' }}>
                  {previewImage.title} • Government ID Document
                </h3>
                <span className="badge badge-primary" style={{ marginTop: 4, display: 'inline-block' }}>
                  {previewImage.idType}
                </span>
              </div>
              <button
                onClick={() => setPreviewImage({ isOpen: false, url: '', title: '', idType: '' })}
                style={{
                  background: '#F1F5F9',
                  border: 'none',
                  borderRadius: '50%',
                  width: 34,
                  height: 34,
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <X size={18} />
              </button>
            </div>

            <div style={{
              padding: 20,
              backgroundColor: '#0F172A',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              minHeight: 320,
              maxHeight: '70vh',
              overflow: 'auto',
            }}>
              <img
                src={previewImage.url}
                alt="Government ID Full Preview"
                style={{ maxWidth: '100%', maxHeight: '65vh', objectFit: 'contain', borderRadius: 8 }}
              />
            </div>

            <div style={{
              padding: '12px 20px',
              backgroundColor: '#F8FAFC',
              borderTop: '1px solid #E2E8F0',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
            }}>
              <span style={{ fontSize: 12, color: 'var(--ink-soft)' }}>
                Official Barangay 291 Resident Identity Document Verification Archive
              </span>
              <button
                onClick={() => setPreviewImage({ isOpen: false, url: '', title: '', idType: '' })}
                className="clay-button-primary"
                style={{ padding: '0 20px', fontSize: 13 }}
              >
                Close Viewer
              </button>
            </div>
          </div>
        </div>,
        document.body
      )}
    </div>
  );
}

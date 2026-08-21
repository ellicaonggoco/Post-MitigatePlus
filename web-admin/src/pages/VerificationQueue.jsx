import React, { useState, useEffect, useContext } from 'react';
import { AuthContext } from '../context/AuthContext';
import { UserCheck, AlertTriangle, CheckCircle2, XCircle, Info, RefreshCw, Filter, ClipboardList, Eye, Maximize2, X, FileText, Image as ImageIcon } from 'lucide-react';
import { IconlyVerification, IconlyShield, IconlyUserPlus } from '../components/Sidebar';
import ConfirmModal from '../components/ConfirmModal';
import io from 'socket.io-client';
import { API_BASE_URL, SOCKET_URL } from '../config';
import { MotionCard, MotionButton } from '../components/motion';

const ITEMS_PER_PAGE = 3;

export default function VerificationQueue() {
  const { token, user } = useContext(AuthContext);
  const [households, setHouseholds] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedNotes, setSelectedNotes] = useState({});
  const [actionStatus, setActionStatus] = useState({ type: '', msg: '' });
  const [selectedBarangay, setSelectedBarangay] = useState(user?.barangayCode || '291');
  const [currentPage, setCurrentPage] = useState(1);
  const [previewImage, setPreviewImage] = useState({ isOpen: false, url: '', title: '', idType: '' });

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
      if (user?.role === 'lgu_admin' && selectedBarangay !== 'ALL') {
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

  useEffect(() => {
    fetchPendingQueue();

    const socket = io(SOCKET_URL);
    const targetCode = user?.role === 'lgu_admin' ? selectedBarangay : user?.barangayCode;

    if (targetCode && targetCode !== 'ALL') {
      socket.emit('join_barangay_room', targetCode);
      socket.on('new_pending_registration', () => {
        setActionStatus({ type: 'info', msg: 'New pending registration received in real-time!' });
        fetchPendingQueue();
      });
    }

    return () => socket.disconnect();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token, user, selectedBarangay]);

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
            ? `Sigurado ka bang verified at tama ang datos ng pamilya ni ${modal.name}? Magiging kwalipikado sila agad para sa ayuda at relief distribution.`
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
                Ang Verification Queue ay para lamang sa mga <strong>Hon. Barangay Officials</strong> upang i-approve ang mga residente ng kanilang mismong barangay. Ang LGU Admin at SuperAdmin ay may kontrol sa Account Provisioning at Field Staff Accounts.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* ── Page Header ── */}
      <div className="workflow-header" style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: '28px', flexWrap: 'wrap', gap: '16px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
          <div style={{
            width: 48, height: 48, borderRadius: 'var(--radius-inner)',
            background: 'linear-gradient(135deg, var(--manila-blue), #1e5a7a)',
            display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
          }}>
            <UserCheck size={24} color="#fff" />
          </div>
          <div>
            <h1 className="section-header" style={{ margin: 0, fontSize: '22px' }}>
              Resident Account Verification Queue
            </h1>
            <p style={{ fontSize: '13px', color: 'var(--ink-soft)', marginTop: '2px' }}>
              First layer of relief fairness — official confirmation before relief access unlocks.
            </p>
          </div>
        </div>

        {/* KPI + Controls */}
        <div className="workflow-header__metrics" style={{ display: 'flex', alignItems: 'center', gap: '12px', flexWrap: 'wrap' }}>
          {!loading && (
            <div className="workflow-header__metric" style={{
              display: 'flex', alignItems: 'center', gap: '8px',
              background: 'rgba(255, 255, 255, 0.2)', padding: '8px 16px',
              borderRadius: 'var(--radius-pill)', border: '1px solid rgba(255, 255, 255, 0.4)',
            }}>
              <ClipboardList size={16} color="#ffffff" />
              <span style={{ fontSize: '13px', fontWeight: 800, color: '#ffffff' }}>
                {households.length} Pending
              </span>
            </div>
          )}
          <button onClick={fetchPendingQueue} className="clay-button-ghost" style={{ padding: '0 16px', fontSize: '13px' }}>
            <RefreshCw size={15} /> Refresh
          </button>
        </div>
      </div>

      {/* ── Filter Toolbar ── */}
      <div style={{
        display: 'flex', alignItems: 'center', gap: '12px', flexWrap: 'wrap',
        background: 'var(--card)', border: '1px solid var(--border)',
        borderRadius: 'var(--radius-inner)', padding: '10px 16px', marginBottom: '20px',
      }}>
        <Filter size={16} color="var(--ink-soft)" />
        <span style={{ fontSize: '12px', fontWeight: 700, color: 'var(--ink-soft)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
          Scope
        </span>
        {user?.role === 'lgu_admin' ? (
          <select
            id="barangay-filter"
            aria-label="Filter by Barangay"
            value={selectedBarangay}
            onChange={(e) => setSelectedBarangay(e.target.value)}
            style={{ border: 'none', outline: 'none', fontSize: '13px', fontWeight: 700, color: 'var(--manila-blue)', background: 'transparent', cursor: 'pointer' }}
          >
            <option value="ALL">All Barangays (City-Wide)</option>
            <option value="291">Barangay 291</option>
            <option value="292">Barangay 292</option>
            <option value="293">Barangay 293</option>
            <option value="294">Barangay 294</option>
          </select>
        ) : (
          <span style={{ fontSize: '13px', fontWeight: 700, color: 'var(--manila-blue)' }}>
            Locked scope: Barangay {user?.barangayCode || '291'} only
          </span>
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

      {/* ── Content ── */}
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
            All submitted registrations for Barangay {user?.role === 'lgu_admin' ? selectedBarangay : user?.barangayCode} have been reviewed.
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
                    Members & Vulnerabilities ({hh.members?.length || 0})
                  </h4>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
                    {hh.members?.map((m, idx) => (
                      <div key={idx} style={{
                        background: '#fff', padding: '5px 12px', borderRadius: 'var(--radius-pill)',
                        fontSize: '12px', border: '1px solid var(--border)', display: 'flex', gap: '6px', alignItems: 'center',
                      }}>
                        <span>{m.name} ({m.relationship}, {m.age})</span>
                        {m.specialConditions?.map((c, cIdx) => (
                          <span key={cIdx} className="badge badge-warning" style={{ fontSize: '11px' }}>
                            {c.toUpperCase()}
                          </span>
                        ))}
                      </div>
                    ))}
                  </div>
                </div>

                {/* ── Official Government ID Document Review Section ── */}
                <div style={{
                  background: '#FFFFFF',
                  border: '1.5px solid #E2E8F0',
                  borderRadius: 'var(--radius-inner)',
                  padding: '12px 14px',
                  marginBottom: '14px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  flexWrap: 'wrap',
                  gap: '12px',
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
                        <Maximize2 size={13} /> View ID Full Photo
                      </button>
                    </div>
                  ) : (
                    <span style={{ fontSize: '11.5px', color: 'var(--ink-soft)', fontStyle: 'italic' }}>
                      (No ID image attached)
                    </span>
                  )}
                </div>

                {/* Card Footer — actions */}
                <div style={{ display: 'flex', gap: '10px', alignItems: 'center', flexWrap: 'wrap' }}>
                  <input
                    type="text"
                    placeholder="Mga tala / dahilan ng pag-apruba (hal. Nabisita sa bahay noong Aug 14, totoong residente)..."
                    value={selectedNotes[hh._id] || ''}
                    onChange={(e) => setSelectedNotes({ ...selectedNotes, [hh._id]: e.target.value })}
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

      {/* ── Pagination Bar: Page 1, Page 2, Page N ── */}
      {totalPages > 1 && (
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 24, padding: '12px 18px', background: 'var(--card)', borderRadius: 'var(--radius-inner)', border: '1px solid var(--border)', flexWrap: 'wrap', gap: 12 }}>
          <div style={{ fontSize: 13, color: 'var(--ink-soft)' }}>
            Showing <strong>{startIndex + 1}–{Math.min(startIndex + ITEMS_PER_PAGE, households.length)}</strong> of <strong>{households.length}</strong> pending households
          </div>

          <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
            <button
              onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
              disabled={currentPage === 1}
              className="clay-button-ghost"
              style={{ fontSize: 12, padding: '5px 12px', opacity: currentPage === 1 ? 0.5 : 1 }}
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
              style={{ fontSize: 12, padding: '5px 12px', opacity: currentPage === totalPages ? 0.5 : 1 }}
            >
              Next
            </button>
          </div>
        </div>
      )}

      {/* ── High-Definition Government ID Lightbox Modal ── */}
      {previewImage.isOpen && (
        <div
          onClick={() => setPreviewImage({ isOpen: false, url: '', title: '', idType: '' })}
          style={{
            position: 'fixed',
            inset: 0,
            backgroundColor: 'rgba(15, 23, 42, 0.85)',
            backdropFilter: 'blur(6px)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 9999,
            padding: 24,
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
              boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.35)',
              display: 'flex',
              flexDirection: 'column',
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
        </div>
      )}
    </div>
  );
}

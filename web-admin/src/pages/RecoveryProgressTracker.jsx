import React, { useState, useContext, useEffect } from 'react';
import { AuthContext } from '../context/AuthContext';
import ConfirmModal from '../components/ConfirmModal';
import { Activity, ChevronDown, Users, CheckCircle, Clock, TrendingUp, ArrowUpCircle, X } from 'lucide-react';
import { API_BASE_URL } from '../config';
import { MotionCard, MotionNumberCounter } from '../components/motion';

const STAGES = [
  { key: 'waiting', label: 'Waiting for Ayuda', color: '#DC2626', bg: '#FEF2F2', icon: Clock, type: 'auto', desc: 'Auto-Managed: On Registration' },
  { key: 'received', label: 'Assistance Received', color: '#D97706', bg: '#FFFBEB', icon: CheckCircle, type: 'auto', desc: 'Auto-Updated: Via Staff QR Scanner' },
  { key: 'ongoing', label: 'Ongoing Pagbangon', color: '#2563EB', bg: '#EFF6FF', icon: TrendingUp, type: 'manual', desc: 'Barangay Action: Rebuilding Phase' },
  { key: 'partial', label: 'Partially Recovered', color: '#7C3AED', bg: '#F5F3FF', icon: ArrowUpCircle, type: 'manual', desc: 'Barangay Action: Stabilized' },
  { key: 'full', label: 'Fully Recovered', color: '#158A64', bg: 'rgba(21,138,100,0.1)', icon: CheckCircle, type: 'manual', desc: 'Barangay Action: Fully Recovered & Resilient' },
];

export default function RecoveryProgressTracker() {
  const { token, user } = useContext(AuthContext);
  const [households, setHouseholds] = useState([]);
  const [loading, setLoading] = useState(true);
  const [openDropdownId, setOpenDropdownId] = useState(null);
  const [modal, setModal] = useState({ isOpen: false, hh: null, newStage: null });
  const brgy = user?.barangayCode || '291';

  const fetchRecovery = async () => {
    setLoading(true);
    try {
      const res = await fetch(`${API_BASE_URL}/recovery`, {
        headers: { Authorization: 'Bearer ' + token, 'Content-Type': 'application/json' }
      });
      const data = await res.json();
      if (res.ok && Array.isArray(data)) {
        const formatted = data.map(h => ({
          id: h.householdId || h.id || h._id,
          recoveryId: h._id,
          head: h.head || h.householdId?.headOfHouseholdUserId?.name || 'Resident Household',
          address: h.address || (h.householdId?.address ? `${h.householdId.address}, Purok ${h.householdId.purok || 1} (Brgy ${h.householdId.barangayCode})` : `Purok 1, Barangay ${brgy}, Manila`),
          members: Number(h.members || h.householdId?.memberCount || 1),
          stage: h.stage || h.status || 'waiting',
          barangayCode: h.barangayCode || h.householdId?.barangayCode || brgy,
        }));
        setHouseholds(formatted);
      } else {
        setHouseholds([]);
      }
    } catch (e) {
      console.error(e);
      setHouseholds([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (token) fetchRecovery();
  }, [token]);

  useEffect(() => {
    const handleOutsideClick = (e) => {
      if (!e.target.closest('.stage-dropdown-container')) {
        setOpenDropdownId(null);
      }
    };
    document.addEventListener('mousedown', handleOutsideClick);
    return () => document.removeEventListener('mousedown', handleOutsideClick);
  }, []);

  const stageCounts = STAGES.reduce((acc, s) => ({
    ...acc,
    [s.key]: households.filter(h => (h.stage || 'waiting') === s.key).length,
  }), {});

  const confirmStageUpdate = async () => {
    if (!modal.hh || !modal.newStage) return;
    const targetId = modal.hh.id || modal.hh.householdId;
    try {
      const res = await fetch(`${API_BASE_URL}/recovery/${targetId}`, {
        method: 'PUT',
        headers: { Authorization: 'Bearer ' + token, 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: modal.newStage.key })
      });
      if (res.ok) {
        setHouseholds(prev => prev.map(h => (h.id === targetId || h.householdId === targetId) ? { ...h, stage: modal.newStage.key } : h));
      }
    } catch (e) {
      console.error(e);
    }
    setModal({ isOpen: false, hh: null, newStage: null });
  };

  return (
    <div className="page-container page-animate">
      {/* Universal Double Confirmation Modal */}
      <ConfirmModal
        isOpen={modal.isOpen}
        title="Update Recovery Stage?"
        message={`Are you sure you want to change the recovery stage for household "${modal.hh?.head}" to "${modal.newStage?.label}"?`}
        type="info"
        confirmText="Yes, Update Stage"
        onConfirm={confirmStageUpdate}
        onCancel={() => setModal({ isOpen: false, hh: null, newStage: null })}
      />

      {/* ── Page Header ── */}
      <div className="workflow-header" style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 28, flexWrap: 'wrap', gap: 16 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
          <div style={{ width: 48, height: 48, borderRadius: 'var(--radius-inner)', background: 'linear-gradient(135deg, #158A64, #0F6B4C)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <Activity size={24} color="#fff" />
          </div>
          <div>
            <h1 className="section-header" style={{ margin: 0, fontSize: 22 }}>Recovery Progress Tracker</h1>
            <p style={{ fontSize: 13, color: 'var(--ink-soft)', marginTop: 2 }}>Barangay {brgy} - Monitor and manage household recovery progression.</p>
          </div>
        </div>
      </div>

      {/* ── Top Stage KPI Summary Cards ── */}
      <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', marginBottom: 24 }}>
        {STAGES.map((s, idx) => {
          const Icon = s.icon;
          return (
            <MotionCard key={s.key} delay={idx * 0.05} className="clay-card" style={{ flex: '1 1 140px', borderTop: `3px solid ${s.color}`, textAlign: 'center', padding: '12px 16px' }}>
              <Icon size={18} color={s.color} style={{ marginBottom: 6 }} />
              <div style={{ fontSize: 28, fontWeight: 900, color: s.color }}>
                <MotionNumberCounter value={stageCounts[s.key] || 0} />
              </div>
              <div style={{ fontSize: 11, color: 'var(--ink-soft)', marginTop: 2 }}>{s.label}</div>
            </MotionCard>
          );
        })}
      </div>

      {/* ── Households List ── */}
      <div style={{ display: 'grid', gap: 14 }}>
        {loading ? (
          <div style={{ padding: '32px 24px', display: 'grid', gap: '12px' }}>
            {[1, 2, 3].map(i => (
              <div key={i} className="skeleton" style={{ height: '80px', borderRadius: '12px' }} />
            ))}
          </div>
        ) : households.length === 0 ? (
          <div className="clay-card" style={{ textAlign: 'center', padding: '48px 24px' }}>
            <Users size={36} color="var(--ink-soft)" style={{ margin: '0 auto 12px', display: 'block' }} />
            <h2 style={{ fontSize: 16, fontWeight: 800, color: "var(--ink)", margin: "0 0 4px" }}>No Household Records Found</h2>
            <p style={{ fontSize: 13, color: 'var(--ink-soft)', margin: 0 }}>All registered households in Barangay {brgy} will appear here to track their recovery progression.</p>
          </div>
        ) : (
          households.map((hh, idx) => {
            const stage = STAGES.find(s => s.key === hh.stage) || STAGES[0];
            const StageIcon = stage.icon;
            return (
              <MotionCard
                key={hh.id || idx}
                delay={idx * 0.05}
                className="clay-card"
                style={{
                  borderLeft: `4.5px solid ${stage.color}`,
                  overflow: 'visible',
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 14 }}>
                  <div>
                    <div style={{ fontSize: 16, fontWeight: 800, color: 'var(--ink)', marginBottom: 4 }}>
                      {hh.head}
                    </div>
                    <div style={{ fontSize: 13, color: 'var(--ink-soft)', marginBottom: 8 }}>
                      {hh.address} &nbsp;·&nbsp; <Users size={13} style={{ verticalAlign: 'middle' }} /> {hh.members} member{hh.members !== 1 ? 's' : ''}
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                      <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6, background: stage.bg, color: stage.color, fontSize: 12, fontWeight: 700, padding: '4px 12px', borderRadius: 999 }}>
                        <StageIcon size={13} /> {stage.label}
                      </span>
                      <span style={{ fontSize: 11, color: 'var(--ink-soft)', fontStyle: 'italic' }}>
                        ({stage.type === 'auto' ? ' System Auto-Updated' : ' Barangay Managed'})
                      </span>
                    </div>
                  </div>
                  <div className="stage-dropdown-container" style={{ position: 'relative' }}>
                    <button
                      onClick={() => setOpenDropdownId(openDropdownId === (hh.id || idx) ? null : (hh.id || idx))}
                      className="clay-button-secondary"
                      aria-label={`Update recovery stage for ${hh.head}`}
                      style={{
                        fontSize: '13px',
                        fontWeight: 800,
                        color: '#047857',
                        borderColor: '#10B981',
                        display: 'flex',
                        alignItems: 'center',
                        gap: 6,
                        background: openDropdownId === (hh.id || idx) ? '#ECFDF5' : 'var(--card)',
                      }}
                    >
                      Update Stage <ChevronDown size={14} style={{ transform: openDropdownId === (hh.id || idx) ? 'rotate(180deg)' : 'none', transition: 'transform 0.2s ease' }} />
                    </button>

                    {openDropdownId === (hh.id || idx) && (
                      <div
                        style={{
                          position: 'absolute',
                          top: 'calc(100% + 6px)',
                          right: 0,
                          width: '260px',
                          background: '#FFFFFF',
                          border: '1.5px solid #E2E8F0',
                          borderRadius: '12px',
                          boxShadow: '0 12px 28px rgba(15, 23, 42, 0.16)',
                          padding: '6px',
                          zIndex: 9999,
                          animation: 'fadeIn 0.15s ease-out',
                        }}
                      >
                        <div style={{ fontSize: '11px', fontWeight: 800, color: '#64748B', padding: '6px 10px 4px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                          Select Recovery Stage
                        </div>
                        {STAGES.map((s) => {
                          const Icon = s.icon;
                          const isCurrent = hh.stage === s.key;
                          return (
                            <button
                              key={s.key}
                              onClick={() => {
                                setOpenDropdownId(null);
                                setModal({
                                  isOpen: true,
                                  hh,
                                  newStage: s,
                                });
                              }}
                              style={{
                                width: '100%',
                                textAlign: 'left',
                                padding: '8px 10px',
                                borderRadius: '8px',
                                border: 'none',
                                background: isCurrent ? s.bg : 'transparent',
                                cursor: 'pointer',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'space-between',
                                gap: 10,
                                transition: 'background 0.15s ease',
                              }}
                              onMouseEnter={(e) => {
                                if (!isCurrent) e.currentTarget.style.background = '#F8FAFC';
                              }}
                              onMouseLeave={(e) => {
                                if (!isCurrent) e.currentTarget.style.background = 'transparent';
                              }}
                            >
                              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                                <div style={{ width: 26, height: 26, borderRadius: '6px', background: s.bg, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                  <Icon size={14} color={s.color} />
                                </div>
                                <div>
                                  <div style={{ fontSize: '12.5px', fontWeight: 800, color: isCurrent ? s.color : '#1E293B' }}>
                                    {s.label}
                                  </div>
                                  <div style={{ fontSize: '10.5px', color: '#64748B' }}>
                                    {s.type === 'auto' ? 'Auto-Managed' : 'Barangay Action'}
                                  </div>
                                </div>
                              </div>
                              {isCurrent && (
                                <span style={{ fontSize: '10px', fontWeight: 800, color: s.color, background: '#FFFFFF', padding: '2px 6px', borderRadius: '4px', border: `1px solid ${s.color}` }}>
                                  Current
                                </span>
                              )}
                            </button>
                          );
                        })}
                      </div>
                    )}
                  </div>
                </div>
              </MotionCard>
            );
          })
        )}
      </div>
    </div>
  );
}


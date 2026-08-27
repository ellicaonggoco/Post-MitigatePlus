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
  const [selectedHhForStage, setSelectedHhForStage] = useState(null);
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

  const stageCounts = STAGES.reduce((acc, s) => ({
    ...acc,
    [s.key]: households.filter(h => (h.stage || 'waiting') === s.key).length,
  }), {});

  const openStagePicker = (hh) => {
    setSelectedHhForStage(hh);
  };

  const handleStageSelect = (targetStageKey) => {
    if (!selectedHhForStage) return;
    const targetStage = STAGES.find(s => s.key === targetStageKey);
    const currentHh = selectedHhForStage;
    setSelectedHhForStage(null);
    setModal({
      isOpen: true,
      hh: currentHh,
      newStage: targetStage,
    });
  };

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

      {/* ── Stage Selector Modal (Full, Non-Clipped Dialog) ── */}
      {selectedHhForStage && (
        <div style={{
          position: 'fixed',
          top: 0, left: 0, right: 0, bottom: 0,
          background: 'rgba(15, 23, 42, 0.65)',
          backdropFilter: 'blur(4px)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 99999,
          padding: '20px',
        }}>
          <div className="clay-card" style={{
            maxWidth: '480px',
            width: '100%',
            background: 'var(--card)',
            padding: '24px',
            borderRadius: '16px',
            boxShadow: '0 20px 40px rgba(0,0,0,0.25)',
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 16 }}>
              <div>
                <h3 style={{ fontSize: '18px', fontWeight: 900, color: 'var(--ink)', margin: '0 0 4px' }}>
                  Select New Recovery Stage
                </h3>
                <p style={{ fontSize: '13px', color: 'var(--ink-soft)', margin: 0 }}>
                  Household: <strong>{selectedHhForStage.head}</strong> ({selectedHhForStage.address})
                </p>
              </div>
              <button
                onClick={() => setSelectedHhForStage(null)}
                style={{ background: 'transparent', border: 'none', cursor: 'pointer', padding: 4 }}
              >
                <X size={20} color="var(--ink-soft)" />
              </button>
            </div>

            <div style={{ display: 'grid', gap: '10px', marginTop: 16 }}>
              {STAGES.map(s => {
                const Icon = s.icon;
                const isCurrent = selectedHhForStage.stage === s.key;
                return (
                  <button
                    key={s.key}
                    onClick={() => handleStageSelect(s.key)}
                    style={{
                      width: '100%',
                      textAlign: 'left',
                      padding: '12px 16px',
                      borderRadius: '10px',
                      border: `1.5px solid ${isCurrent ? s.color : 'var(--border)'}`,
                      background: isCurrent ? s.bg : 'var(--card)',
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      transition: 'all 0.15s ease',
                    }}
                    onMouseEnter={e => {
                      if (!isCurrent) e.currentTarget.style.background = 'var(--sampaguita)';
                    }}
                    onMouseLeave={e => {
                      if (!isCurrent) e.currentTarget.style.background = 'var(--card)';
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                      <div style={{ width: 34, height: 34, borderRadius: '8px', background: s.bg, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                        <Icon size={18} color={s.color} />
                      </div>
                      <div>
                        <div style={{ fontSize: '14px', fontWeight: 800, color: s.color }}>
                          {s.label}
                        </div>
                        <div style={{ fontSize: '11.5px', color: 'var(--ink-soft)', marginTop: 2 }}>
                          {s.desc}
                        </div>
                      </div>
                    </div>
                    {isCurrent && (
                      <span className="badge badge-info" style={{ fontSize: '10.5px' }}>Kasalukuyan</span>
                    )}
                  </button>
                );
              })}
            </div>

            <div style={{ marginTop: 20, textAlign: 'right' }}>
              <button onClick={() => setSelectedHhForStage(null)} className="clay-button-ghost" style={{ fontSize: 13 }}>
                Kanselahin
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Page Header ── */}
      <div className="workflow-header" style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 28, flexWrap: 'wrap', gap: 16 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
          <div style={{ width: 48, height: 48, borderRadius: 'var(--radius-inner)', background: 'linear-gradient(135deg, #158A64, #0F6B4C)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <Activity size={24} color="#fff" />
          </div>
          <div>
            <h1 className="section-header" style={{ margin: 0, fontSize: 22 }}>Recovery Progress Tracker</h1>
            <p style={{ fontSize: 13, color: 'var(--ink-soft)', marginTop: 2 }}>Barangay {brgy} — Monitor and manage household recovery progression.</p>
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
                  <div>
                    <button
                      onClick={() => openStagePicker(hh)}
                      className="clay-button-secondary"
                      aria-label={`Update recovery stage for ${hh.head}`}
                      style={{ fontSize: '13px', fontWeight: 800, color: '#047857', borderColor: '#10B981', display: 'flex', alignItems: 'center', gap: 6 }}
                    >
                      Update Stage <ChevronDown size={14} />
                    </button>
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


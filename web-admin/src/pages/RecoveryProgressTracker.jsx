import React, { useState, useContext, useEffect } from 'react';
import { AuthContext } from '../context/AuthContext';
import ConfirmModal from '../components/ConfirmModal';
import { Activity, ChevronDown, Users, CheckCircle, Clock, TrendingUp, ArrowUpCircle } from 'lucide-react';
import { API_BASE_URL } from '../config';
import { MotionCard, MotionNumberCounter } from '../components/motion';

const STAGES = [
  { key: 'waiting', label: 'Waiting for Ayuda', color: '#DC2626', bg: '#FEF2F2', icon: Clock, type: 'auto', desc: 'Auto-Managed: On Registration' },
  { key: 'received', label: 'Assistance Received', color: '#D97706', bg: '#FFFBEB', icon: CheckCircle, type: 'auto', desc: 'Auto-Updated: Via Staff QR Scanner' },
  { key: 'ongoing', label: 'Ongoing Pagbangon', color: '#2563EB', bg: '#EFF6FF', icon: TrendingUp, type: 'manual', desc: 'Barangay Action: Rebuilding Phase' },
  { key: 'partial', label: 'Partially Recovered', color: '#7C3AED', bg: '#F5F3FF', icon: ArrowUpCircle, type: 'manual', desc: 'Barangay Action: Stabilized' },
  { key: 'full', label: 'Fully Recovered', color: '#158A64', bg: 'rgba(21,138,100,0.1)', icon: CheckCircle, type: 'manual', desc: 'Barangay Action: Fully Recovered' },
];

export default function RecoveryProgressTracker() {
  const { token, user } = useContext(AuthContext);
  const [households, setHouseholds] = useState([]);
  
  useEffect(() => {
    const fetchRecovery = async () => {
      try {
        const res = await fetch(`${API_BASE_URL}/recovery`, {
          headers: { Authorization: 'Bearer ' + token, 'Content-Type': 'application/json' }
        });
        const data = await res.json();
        if (res.ok && Array.isArray(data)) {
          setHouseholds(data);
        } else {
          setHouseholds([]);
        }
      } catch (e) {
        console.error(e);
        setHouseholds([]);
      }
    };
    if (token) fetchRecovery();
  }, [token]);
  const [updating, setUpdating] = useState(null);
  const brgy = user?.barangayCode || '291';

  // ── Confirm Modal State ──
  const [modal, setModal] = useState({ isOpen: false, hh: null, newStage: null });

  const stageCounts = STAGES.reduce((acc, s) => ({ ...acc, [s.key]: households.filter(h => h.stage === s.key).length }), {});

  const requestStageUpdate = (hh, targetStageKey) => {
    setUpdating(null);
    const targetStage = STAGES.find(s => s.key === targetStageKey);
    setModal({
      isOpen: true,
      hh,
      newStage: targetStage,
    });
  };

  const confirmStageUpdate = async () => {
    if (!modal.hh || !modal.newStage) return;
    try {
      const res = await fetch(`${API_BASE_URL}/recovery/${modal.hh.id}`, {
        method: 'PUT',
        headers: { Authorization: 'Bearer ' + token, 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: modal.newStage.key })
      });
      if (res.ok) {
        setHouseholds(prev => prev.map(h => h.id === modal.hh.id ? { ...h, stage: modal.newStage.key } : h));
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
        title="I-update ang Recovery Stage?"
        message={`Sigurado ka bang gusto mong palitan ang recovery stage ng pamilyang ${modal.hh?.head} tungo sa "${modal.newStage?.label}"?`}
        type="info"
        confirmText="Oo, I-update Stage"
        onConfirm={confirmStageUpdate}
        onCancel={() => setModal({ isOpen: false, hh: null, newStage: null })}
      />

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

      <div style={{ display: 'grid', gap: 14 }}>
        {households.map((hh, idx) => {
          const stage = STAGES.find(s => s.key === hh.stage);
          const StageIcon = stage?.icon || Clock;
          const isUpdatingThis = updating === hh.id;
          return (
            <MotionCard
              key={hh.id || idx}
              delay={idx * 0.05}
              className="clay-card"
              style={{
                borderLeft: `4px solid ${stage?.color}`,
                position: 'relative',
                zIndex: isUpdatingThis ? 9999 : 1,
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 12 }}>
                <div>
                  <div style={{ fontSize: 16, fontWeight: 800, color: 'var(--ink)', marginBottom: 4 }}>{hh.head}</div>
                  <div style={{ fontSize: 13, color: 'var(--ink-soft)', marginBottom: 8 }}>{hh.address} &nbsp;·&nbsp; <Users size={12} style={{ verticalAlign: 'middle' }} /> {hh.members} members</div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6, background: stage?.bg, color: stage?.color, fontSize: 12, fontWeight: 700, padding: '4px 12px', borderRadius: 999 }}>
                      <StageIcon size={13} /> {stage?.label}
                    </span>
                    <span style={{ fontSize: 11, color: 'var(--ink-soft)', fontStyle: 'italic' }}>
                      ({stage?.type === 'auto' ? '⚡ System Auto-Updated' : '✋ Barangay Managed'})
                    </span>
                  </div>
                </div>
                <div style={{ position: 'relative', zIndex: isUpdatingThis ? 10000 : 1 }}>
                  <button
                    onClick={() => setUpdating(updating === hh.id ? null : hh.id)}
                    className="clay-button-secondary"
                    aria-label={`Update recovery stage for ${hh.head}`}
                    style={{ fontSize: '13px', fontWeight: 800, color: '#047857', borderColor: '#10B981', gap: 6 }}
                  >
                    Update Stage <ChevronDown size={13} />
                  </button>
                  {isUpdatingThis && (
                    <div style={{ position: 'absolute', right: 0, top: '110%', background: 'var(--card)', border: '1.5px solid var(--border)', borderRadius: 'var(--radius-inner)', boxShadow: '0 12px 32px rgba(15,23,42,0.22)', zIndex: 99999, minWidth: 260, overflow: 'hidden' }}>
                      <div style={{ padding: '8px 12px', background: 'var(--sampaguita)', fontSize: 11, fontWeight: 800, color: 'var(--ink-soft)', textTransform: 'uppercase', letterSpacing: '0.05em', borderBottom: '1px solid var(--border)' }}>
                        Select Recovery Stage
                      </div>
                      {STAGES.map(s => (
                        <button key={s.key} onClick={() => requestStageUpdate(hh, s.key)}
                          style={{ width: '100%', textAlign: 'left', padding: '10px 12px', border: 'none', background: hh.stage === s.key ? s.bg : 'transparent', color: hh.stage === s.key ? s.color : 'var(--ink)', fontSize: 13, fontWeight: hh.stage === s.key ? 700 : 500, cursor: 'pointer', display: 'flex', flexDirection: 'column', gap: 2, borderBottom: '1px solid var(--border)' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                            <span style={{ width: 8, height: 8, borderRadius: '50%', background: s.color, flexShrink: 0 }} />
                            <span>{s.label}</span>
                          </div>
                          <span style={{ fontSize: 11, color: 'var(--ink-soft)', paddingLeft: 16 }}>{s.desc}</span>
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </MotionCard>
          );
        })}
      </div>
    </div>
  );
}

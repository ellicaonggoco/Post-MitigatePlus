import React, { useState, useEffect, useContext } from 'react';
import ReactDOM from 'react-dom';
import { AuthContext } from '../context/AuthContext';
import { Package, ShieldAlert, Shield, Plus, Calculator, Info, CheckCircle2, Zap } from 'lucide-react';
import { IconlyPackage } from '../components/Sidebar';
import ConfirmModal from '../components/ConfirmModal';
import io from 'socket.io-client';
import { API_BASE_URL, SOCKET_URL } from '../config';
import { MotionCard, MotionButton } from '../components/motion';

export default function ReliefAllocationPage() {
  const { token, user } = useContext(AuthContext);
  const isSuperAdmin = user?.role === 'lgu_superadmin';

  const [events, setEvents] = useState([]);
  const [duplicateAlerts, setDuplicateAlerts] = useState([]);
  // ── Executive Policy State (Persisted in localStorage) ──
  const [policy, setPolicy] = useState(() => {
    try {
      const saved = localStorage.getItem('mitigateplus_allocation_policy');
      return saved ? JSON.parse(saved) : { baseCoverage: 5, extraMemberTopUp: 0.5, seniorTopUp: 0.5, pwdTopUp: 0.5 };
    } catch (e) {
      return { baseCoverage: 5, extraMemberTopUp: 0.5, seniorTopUp: 0.5, pwdTopUp: 0.5 };
    }
  });

  const [testHeadcount, setTestHeadcount] = useState(7);
  const [testSeniors, setTestSeniors] = useState(1);
  const [testPWDs, setTestPWDs] = useState(0);

  const [title, setTitle] = useState('');
  const [itemType, setItemType] = useState('Family Food Pack');
  const [batchId, setBatchId] = useState(`BATCH-${Date.now().toString().slice(-4)}`);
  const [location, setLocation] = useState('Barangay 291 Covered Court');
  const [msg, setMsg] = useState('');

  // ── Confirmation Modal State ──
  const [confirmModal, setConfirmModal] = useState({ isOpen: false, eventData: null });
  // ── Triple Security Policy Modal State ──
  const [policyModalStep, setPolicyModalStep] = useState(0); // 0: closed, 1: Step 1 warning, 2: Step 2 Security PIN
  const [secPin, setSecPin] = useState('');
  const [pendingPolicy, setPendingPolicy] = useState(null);

  if (!isSuperAdmin) {
    return (
      <div className="page-container page-animate" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '60vh' }}>
        <div className="clay-card" style={{ borderLeft: '4px solid var(--manila-blue)', maxWidth: '520px', width: '100%', padding: '32px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px', color: 'var(--manila-blue)', marginBottom: '14px' }}>
            <div style={{ width: 44, height: 44, borderRadius: 'var(--radius-inner)', background: 'var(--sampaguita)', border: '1px solid var(--border)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <ShieldAlert size={22} color="var(--manila-blue)" />
            </div>
            <div>
              <h3 style={{ fontSize: '18px', fontWeight: 800, margin: 0, color: 'var(--ink)' }}>Restricted Executive Engine Config</h3>
              <span style={{ fontSize: 12, color: 'var(--ink-soft)' }}>LGU SuperAdmin Protected Module</span>
            </div>
          </div>
          <p style={{ fontSize: '14px', color: 'var(--ink-soft)', lineHeight: 1.6, marginBottom: 20 }}>
            Ang <strong>Right-Sized Relief Allocation Math Engine</strong> ay protektado at binabago lamang ng <strong>LGU SuperAdmin</strong> upang hindi magalaw ang opisyal na kalkulasyon ng ayuda.
          </p>
          <button onClick={() => window.location.href = '/distribution-events'} className="clay-button-primary" style={{ width: '100%', justifyContent: 'center', fontSize: 13 }}>
            Pumunta sa Distribution Events
          </button>
        </div>
      </div>
    );
  }

  const fetchEvents = async () => {
    try {
      const res = await fetch(`${API_BASE_URL}/distributions/events`, {
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
      });
      const data = await res.json();
      if (res.ok) setEvents(data);
    } catch (err) {
      console.error(err);
    }
  };

  useEffect(() => {
    if (token) {
      fetchEvents();
    }

    const socket = io(SOCKET_URL);
    socket.emit('join_admin_room');

    socket.on('duplicate_claim_alert', (alertData) => {
      setDuplicateAlerts((prev) => [alertData, ...prev]);
    });

    return () => socket.disconnect();
  }, [token]);

  const requestCreateEvent = (e) => {
    e.preventDefault();
    if (!title.trim() || !location.trim()) return;

    setConfirmModal({
      isOpen: true,
      eventData: {
        title,
        itemType,
        batchId,
        barangayCode: user?.barangayCode || '291',
        location,
      },
    });
  };

  const executeCreateEvent = async () => {
    const dataToPost = confirmModal.eventData;
    setMsg('');
    try {
      const res = await fetch(`${API_BASE_URL}/distributions/events`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(dataToPost),
      });
      const data = await res.json();
      if (res.ok) {
        setMsg('Distribution event opened successfully!');
        setTitle('');
        fetchEvents();
      } else {
        setMsg(`Failed to launch event: ${dataToPost.title}`);
      }
    } catch (err) {
      setMsg(`Failed to launch event due to network error.`);
    } finally {
      setConfirmModal({ isOpen: false, eventData: null });
    }
  };

  // ── Triple Confirmation Step 1 Trigger ──
  const handleSavePolicyRequest = () => {
    setPendingPolicy(policy);
    setPolicyModalStep(1); // Step 1: Warning Modal
  };

  // ── Triple Confirmation Step 2 Trigger ──
  const handleProceedToStep2 = () => {
    setPolicyModalStep(2); // Step 2: Executive Security Verification
  };

  // ── Triple Confirmation Final Execution ──
  const handleExecutePolicySave = () => {
    if (secPin.trim().toUpperCase() !== 'CONFIRM' && secPin.trim() !== '2026') {
      setConfirmModal({
        isOpen: true,
        eventData: null,
      });
      setConfirmModal({
        isOpen: true,
        title: 'Security Error',
        message: 'Maling Security Passcode. I-type ang "CONFIRM" o "2026" upang mai-apply ang bagong relief formula.',
        type: 'danger',
        confirmText: 'Okay',
        onConfirm: () => setConfirmModal({ isOpen: false, eventData: null }),
        onCancel: () => setConfirmModal({ isOpen: false, eventData: null }),
      });
      return;
    }

    try {
      // In a real application, POST to a policy endpoint
      localStorage.setItem('mitigateplus_allocation_policy', JSON.stringify(policy));
      window.dispatchEvent(new Event('mitigateplus_policy_updated'));
      setMsg(' Na-update at na-apply na ang opisyal na Relief Allocation Policy sa buong lungsod!');
    } catch (e) {
      console.error(e);
    }

    setPolicyModalStep(0);
    setSecPin('');
  };

  const n = Math.max(1, parseInt(testHeadcount) || 1);
  const c = Math.max(1, parseInt(policy.baseCoverage) || 5);
  const seniors = Math.max(0, parseInt(testSeniors) || 0);
  const pwds = Math.max(0, parseInt(testPWDs) || 0);

  const basePacks = n > 0 ? 1 : 0;
  const excessMembers = Math.max(0, n - c);
  const extraMemberTopUps = excessMembers > 0 ? Math.ceil(excessMembers * (policy.extraMemberTopUp || 0.5)) : 0;
  const seniorBonusPacks = Math.round(seniors * (policy.seniorTopUp || 0.5));
  const pwdBonusPacks = Math.round(pwds * (policy.pwdTopUp || 0.5));
  const totalCalculatedUnits = basePacks + extraMemberTopUps + seniorBonusPacks + pwdBonusPacks;

  const fieldGroupStyle = { marginBottom: '16px' };
  const labelStyle = { display: 'block', fontSize: '12px', fontWeight: 700, color: 'var(--ink-soft)', marginBottom: '6px', textTransform: 'uppercase', letterSpacing: '0.04em' };
  const inputStyle = {
    width: '100%', padding: '10px 13px', borderRadius: 'var(--radius-inner)',
    border: '1.5px solid var(--border)', fontSize: '13px', outline: 'none',
    fontFamily: 'var(--font-sans)', color: 'var(--ink)', background: 'var(--card)',
    boxSizing: 'border-box',
  };

  return (
    <div className="page-container page-animate">
      {/* Universal Double Confirmation Modal for Event Launch */}
      <ConfirmModal
        isOpen={confirmModal.isOpen}
        title={confirmModal.title || "I-lunsod ang Distribution Event?"}
        message={confirmModal.message || (confirmModal.eventData ? `Sigurado ka bang gusto mong buksan ang "${confirmModal.eventData.title}" sa ${confirmModal.eventData.location}? Magiging active ito agad para sa scanning ng Field Staff.` : '')}
        type={confirmModal.type || "success"}
        confirmText={confirmModal.confirmText || "Oo, I-launch na Event"}
        onConfirm={confirmModal.onConfirm || executeCreateEvent}
        onCancel={confirmModal.onCancel || (() => setConfirmModal({ isOpen: false, eventData: null }))}
      />

      {/* ── Triple Confirmation Step 1: Warning Modal ── */}
      {policyModalStep === 1 && ReactDOM.createPortal(
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          width: '100vw',
          height: '100vh',
          backgroundColor: 'rgba(15, 23, 42, 0.75)',
          backdropFilter: 'blur(8px)',
          WebkitBackdropFilter: 'blur(8px)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 99999999,
          padding: 16,
          boxSizing: 'border-box',
        }}>
          <div className="clay-card page-animate" style={{ maxWidth: 500, width: '100%', padding: 28, borderLeft: '5px solid #D97706', background: 'var(--card)', boxShadow: '0 25px 60px rgba(0,0,0,0.45)', borderRadius: 'var(--radius-card)' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, color: '#D97706', marginBottom: 12 }}>
              <ShieldAlert size={28} />
              <h3 style={{ margin: 0, fontSize: 18, fontWeight: 900, color: 'var(--ink)' }}>Babala: I-update ang Relief Policy?</h3>
            </div>
            <p style={{ fontSize: 14, color: 'var(--ink)', lineHeight: 1.6, marginBottom: 16 }}>
              Baguhin ang <strong>Base Family Size Threshold (Max {policy.baseCoverage} members)</strong> at top-up multipliers. Ang pagbabagong ito ay <strong>maka-apekto sa lahat ng lalabas na ayuda</strong> sa buong Lungsod ng Maynila.
            </p>
            <div style={{ background: '#FFFBEB', border: '1px solid #FCD34D', padding: '12px 14px', borderRadius: 'var(--radius-inner)', fontSize: 12, color: '#92400E', marginBottom: 20 }}>
              Step 1 of 2: Sigurado ka bang nais mong palitan ang opisyal na formula ng LGU SuperAdmin?
            </div>
            <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
              <button onClick={() => setPolicyModalStep(0)} className="clay-button-ghost" style={{ fontSize: 13 }}>Kanselahin</button>
              <button onClick={handleProceedToStep2} className="clay-button-danger" style={{ fontSize: 13 }}>Magpatuloy sa Executive Passcode</button>
            </div>
          </div>
        </div>,
        document.body
      )}

      {/* ── Triple Confirmation Step 2: Security PIN Modal ── */}
      {policyModalStep === 2 && ReactDOM.createPortal(
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          width: '100vw',
          height: '100vh',
          backgroundColor: 'rgba(15, 23, 42, 0.75)',
          backdropFilter: 'blur(8px)',
          WebkitBackdropFilter: 'blur(8px)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 99999999,
          padding: 16,
          boxSizing: 'border-box',
        }}>
          <div className="clay-card page-animate" style={{ maxWidth: 480, width: '100%', padding: 28, borderLeft: '5px solid var(--manila-blue)', background: 'var(--card)', boxShadow: '0 25px 60px rgba(0,0,0,0.45)', borderRadius: 'var(--radius-card)' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, color: 'var(--manila-blue)', marginBottom: 12 }}>
              <Zap size={26} />
              <h3 style={{ margin: 0, fontSize: 18, fontWeight: 900, color: 'var(--ink)' }}>Executive Authorization Required</h3>
            </div>
            <p style={{ fontSize: 13, color: 'var(--ink-soft)', lineHeight: 1.5, marginBottom: 14 }}>
              I-type ang security word <strong>CONFIRM</strong> o passcode <strong>2026</strong> upang pinal na lagdaan at i-apply ang bagong Relief Allocation Policy.
            </p>
            <input
              type="text"
              placeholder='I-type ang "CONFIRM"'
              value={secPin}
              onChange={e => setSecPin(e.target.value)}
              style={{ ...inputStyle, fontSize: 15, fontWeight: 800, textAlign: 'center', letterSpacing: 2, marginBottom: 20, border: '2px solid var(--manila-blue)' }}
            />
            <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
              <button onClick={() => { setPolicyModalStep(0); setSecPin(''); }} className="clay-button-ghost" style={{ fontSize: 13 }}>Kanselahin</button>
              <button onClick={handleExecutePolicySave} className="clay-button-approve" style={{ fontSize: 13 }}>Pinal na I-apply ang Policy</button>
            </div>
          </div>
        </div>,
        document.body
      )}



      {/* ── Page Header ── */}
      <div className="workflow-header" style={{ display: 'flex', alignItems: 'center', gap: '14px', marginBottom: '24px' }}>
        <div style={{
          width: 48, height: 48, borderRadius: 'var(--radius-inner)',
          background: 'linear-gradient(135deg, var(--bay-teal), #0d6b4e)',
          display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
        }}>
          <IconlyPackage size={24} color="#fff" />
        </div>
        <div>
          <h1 className="section-header" style={{ margin: 0, fontSize: '22px' }}>
            Right-Sized Relief Allocation & Distribution
          </h1>
          <p style={{ fontSize: '13px', color: 'var(--ink-soft)', marginTop: '2px' }}>
            Right-sized relief math engine + real-time anti-duplicate claim prevention across all Manila distribution posts.
          </p>
        </div>
      </div>



      {/* ── Main Executive Relief Allocation Policy & Math Engine (Full-Width with Detailed Field Descriptions) ── */}
      <div className="clay-card" style={{ marginBottom: '28px' }}>
        <h2 style={{ fontSize: '18px', fontWeight: 800, color: 'var(--manila-blue)', display: 'flex', alignItems: 'center', gap: '8px', margin: '0 0 4px' }}>
          <Calculator size={20} /> Executive Relief Allocation Engine Policy & Configuration
        </h2>
        <p style={{ fontSize: '13px', color: 'var(--ink-soft)', marginBottom: '24px' }}>
          Konpigurasyon ng opisyal na formula ng ayuda para sa pamilyang <strong>lumalagpas sa 5 miyembro</strong>, Senior Citizens, at PWDs sa buong Maynila.
        </p>

        {/* 4 Parameter Configuration Inputs with Explicit Descriptions */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '20px', marginBottom: 24 }}>
          <div style={{ background: 'var(--sampaguita)', padding: '16px', borderRadius: 'var(--radius-inner)', border: '1px solid var(--border)' }}>
            <label style={{ ...labelStyle, fontSize: 13, color: 'var(--manila-blue)', fontWeight: 800 }}>
              Base Family Max Pax (Default: 5)
            </label>
            <input
              type="number"
              min="1"
              max="12"
              value={policy.baseCoverage}
              onChange={(e) => setPolicy({ ...policy, baseCoverage: Math.max(1, parseInt(e.target.value) || 5) })}
              style={{ ...inputStyle, border: '2px solid var(--manila-blue)', fontWeight: 800, marginTop: 6 }}
            />
            <span style={{ fontSize: 11, color: 'var(--ink-soft)', marginTop: 8, display: 'block', lineHeight: 1.4 }}>
              <strong>Klaripikasyon:</strong> Ang standard limit ng bilang ng tao sa pamilya na sakop ng 1 buong Base Relief Pack. Ang lahat ng lumagpas sa numerong ito ay bibigyan ng proportional Top-Up.
            </span>
          </div>

          <div style={{ background: 'var(--sampaguita)', padding: '16px', borderRadius: 'var(--radius-inner)', border: '1px solid var(--border)' }}>
            <label style={{ ...labelStyle, fontSize: 13, color: 'var(--bay-teal)', fontWeight: 800 }}>
              Extra Member Top-up Multiplier (+Ratio per extra pax)
            </label>
            <input
              type="number"
              step="0.25"
              min="0.1"
              value={policy.extraMemberTopUp}
              onChange={(e) => setPolicy({ ...policy, extraMemberTopUp: parseFloat(e.target.value) || 0.5 })}
              style={{ ...inputStyle, marginTop: 6 }}
            />
            <span style={{ fontSize: 11, color: 'var(--ink-soft)', marginTop: 8, display: 'block', lineHeight: 1.4 }}>
              <strong>Klaripikasyon:</strong> Rasyo ng karagdagang relief pack bawat sobrang tao sa base limit (hal. +0.5x ratio = 1 karagdagang top-up pack bawat 2 sobrang tao).
            </span>
          </div>

          <div style={{ background: 'var(--sampaguita)', padding: '16px', borderRadius: 'var(--radius-inner)', border: '1px solid var(--border)' }}>
            <label style={{ ...labelStyle, fontSize: 13, color: '#D97706', fontWeight: 800 }}>
              Senior Citizen Top-Up Multiplier
            </label>
            <input
              type="number"
              step="0.25"
              value={policy.seniorTopUp}
              onChange={(e) => setPolicy({ ...policy, seniorTopUp: parseFloat(e.target.value) || 0.5 })}
              style={{ ...inputStyle, marginTop: 6 }}
            />
            <span style={{ fontSize: 11, color: 'var(--ink-soft)', marginTop: 8, display: 'block', lineHeight: 1.4 }}>
              <strong>Klaripikasyon:</strong> Karagdagang probisyon o bonus pack para sa pamilyang may kapamilyang Senior Citizen (60+ years old).
            </span>
          </div>

          <div style={{ background: 'var(--sampaguita)', padding: '16px', borderRadius: 'var(--radius-inner)', border: '1px solid var(--border)' }}>
            <label style={{ ...labelStyle, fontSize: 13, color: '#7C3AED', fontWeight: 800 }}>
              PWD Member Top-Up Multiplier
            </label>
            <input
              type="number"
              step="0.25"
              value={policy.pwdTopUp}
              onChange={(e) => setPolicy({ ...policy, pwdTopUp: parseFloat(e.target.value) || 0.5 })}
              style={{ ...inputStyle, marginTop: 6 }}
            />
            <span style={{ fontSize: 11, color: 'var(--ink-soft)', marginTop: 8, display: 'block', lineHeight: 1.4 }}>
              <strong>Klaripikasyon:</strong> Karagdagang probisyon o bonus pack para sa pamilyang may kapamilyang Person with Disability (PWD).
            </span>
          </div>
        </div>

        {/* Live Test Simulation Panel */}
        <div style={{ background: 'var(--sampaguita)', padding: '18px', borderRadius: 'var(--radius-inner)', border: '1px solid var(--border)', marginBottom: 20 }}>
          <div style={{ fontSize: 13, fontWeight: 800, color: 'var(--ink)', textTransform: 'uppercase', marginBottom: 4 }}>
            Live Simulation Test (Halimbawa ng Pamilya)
          </div>
          <p style={{ fontSize: 12, color: 'var(--ink-soft)', margin: '0 0 12px' }}>
            I-test dito ang iba't ibang laki ng pamilya upang makita ang live breakdown ng formula bago i-save.
          </p>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 12, marginBottom: 16 }}>
            <div>
              <label style={{ fontSize: 11, fontWeight: 700, color: 'var(--ink-soft)' }}>Family Size (n)</label>
              <input type="number" value={testHeadcount} onChange={e => setTestHeadcount(e.target.value)} style={{ ...inputStyle, padding: '8px 12px', fontSize: 13 }} />
            </div>
            <div>
              <label style={{ fontSize: 11, fontWeight: 700, color: 'var(--ink-soft)' }}>Senior Citizens</label>
              <input type="number" value={testSeniors} onChange={e => setTestSeniors(e.target.value)} style={{ ...inputStyle, padding: '8px 12px', fontSize: 13 }} />
            </div>
            <div>
              <label style={{ fontSize: 11, fontWeight: 700, color: 'var(--ink-soft)' }}>PWD Members</label>
              <input type="number" value={testPWDs} onChange={e => setTestPWDs(e.target.value)} style={{ ...inputStyle, padding: '8px 12px', fontSize: 13 }} />
            </div>
          </div>

          {/* Output box — teal bordered */}
          <div style={{
            background: 'rgba(21,138,100,0.06)',
            border: '2px solid rgba(21,138,100,0.35)',
            borderRadius: 'var(--radius-inner)',
            padding: '16px',
          }}>
            <div style={{ fontSize: '11px', fontWeight: 800, color: 'var(--bay-teal)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: '4px' }}>
              Formula Calculated Output:
            </div>
            <div style={{ fontSize: '18px', fontWeight: 900, color: 'var(--bay-teal)', lineHeight: 1.2, marginBottom: '10px' }}>
              {basePacks} Full Base Pack + {extraMemberTopUps + seniorBonusPacks + pwdBonusPacks} Top-Up & Bonus Pack(s)
            </div>

            {/* Visual Itemized Breakdown Chips */}
            <div style={{ display: 'grid', gap: '6px', background: 'var(--card)', padding: '10px 12px', borderRadius: 'var(--radius-inner)', border: '1px solid var(--border)', fontSize: '12px', marginBottom: '10px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontWeight: 700, color: 'var(--ink)' }}>
                <span>Standard Full Base Relief Pack</span>
                <span style={{ color: 'var(--manila-blue)', background: 'var(--manila-blue-light)', padding: '2px 8px', borderRadius: 999, fontSize: 11, fontWeight: 800 }}>{basePacks} Pack (Covers 1–{policy.baseCoverage} pax)</span>
              </div>
              {excessMembers > 0 && (
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', color: 'var(--ink)' }}>
                  <span>Supplemental Top-Up Pack(s)</span>
                  <span style={{ color: 'var(--bay-teal)', background: 'var(--bay-teal-light)', padding: '2px 8px', borderRadius: 999, fontSize: 11, fontWeight: 800 }}>+{extraMemberTopUps} Pack ({excessMembers} extra pax)</span>
                </div>
              )}
              {seniorBonusPacks > 0 && (
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', color: 'var(--ink)' }}>
                  <span>Senior Citizen Bonus Pack</span>
                  <span style={{ color: '#D97706', background: '#FFFBEB', padding: '2px 8px', borderRadius: 999, fontSize: 11, fontWeight: 800 }}>+{seniorBonusPacks} Senior Bonus</span>
                </div>
              )}
              {pwdBonusPacks > 0 && (
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', color: 'var(--ink)' }}>
                  <span>PWD Assistance Bonus Pack</span>
                  <span style={{ color: '#7C3AED', background: '#F5F3FF', padding: '2px 8px', borderRadius: 999, fontSize: 11, fontWeight: 800 }}>+{pwdBonusPacks} PWD Bonus</span>
                </div>
              )}
            </div>

            <div style={{ fontSize: '11px', color: 'var(--ink)', lineHeight: 1.4, background: 'var(--card)', padding: '8px 10px', borderRadius: 'var(--radius-inner)', border: '1px solid var(--border)' }}>
              <strong>Klaripikasyon sa Pamamahagi:</strong> Ang pamilyang may {n} miyembro ay makakatanggap ng <strong>1 buong Standard Base Relief Pack</strong>, kasama ang <strong>{extraMemberTopUps} Supplemental Top-Up Pack(s)</strong> para sa {excessMembers} karagdagang miyembro{seniorBonusPacks > 0 ? ` + ${seniorBonusPacks} Senior Bonus` : ''}{pwdBonusPacks > 0 ? ` + ${pwdBonusPacks} PWD Bonus` : ''} — <em>hindi ito 3 buong base relief packs.</em>
            </div>
          </div>
        </div>

        <button onClick={handleSavePolicyRequest} className="clay-button-approve" style={{ width: '100%', justifyContent: 'center', padding: '12px', fontSize: 14, gap: 6, fontWeight: 800 }}>
          Save & Authorize City-Wide Policy Changes
        </button>
      </div>

      {!isSuperAdmin && (
        <div className="clay-card" style={{ marginBottom: 28 }}>
            <h3 style={{ fontSize: '16px', fontWeight: 700, color: 'var(--manila-blue)', display: 'flex', alignItems: 'center', gap: '8px', margin: '0 0 4px' }}>
              <Plus size={18} /> Open Distribution Event
            </h3>
            <p style={{ fontSize: '12px', color: 'var(--ink-soft)', marginBottom: '20px' }}>
              Create an active relief distribution cycle for field staff scanning.
            </p>

            {msg && (
              <div style={{
                padding: '10px 14px', borderRadius: 'var(--radius-inner)', marginBottom: '16px',
                fontSize: '13px', fontWeight: 600,
                background: msg.startsWith('Error') ? 'rgba(198,86,75,0.08)' : 'rgba(21,138,100,0.08)',
                color: msg.startsWith('Error') ? 'var(--danger)' : 'var(--bay-teal)',
                border: msg.startsWith('Error') ? '1px solid rgba(198,86,75,0.25)' : '1px solid rgba(21,138,100,0.25)',
                borderLeft: msg.startsWith('Error') ? '4px solid var(--danger)' : '4px solid var(--bay-teal)',
              }}>
                {msg}
              </div>
            )}

            <form onSubmit={requestCreateEvent}>
              <div style={fieldGroupStyle}>
                <label style={labelStyle}>Event Title</label>
                <input
                  type="text"
                  placeholder="e.g. Typhoon Relief Batch 1"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  style={inputStyle}
                  required
                />
              </div>

              <div style={fieldGroupStyle}>
                <label style={labelStyle}>Item Type</label>
                <select
                  id="event-item-type"
                  aria-label="Select Relief Item Type"
                  value={itemType}
                  onChange={(e) => setItemType(e.target.value)}
                  style={{ ...inputStyle, background: 'var(--card)', cursor: 'pointer' }}
                >
                  <option value="Family Food Pack">Family Food Pack (Headcount-Scaled)</option>
                  <option value="Water">Water (Headcount-Scaled)</option>
                  <option value="Hygiene Kit">Hygiene Kit (Headcount-Scaled)</option>
                  <option value="Clothing">Clothing (Headcount-Scaled)</option>
                  <option value="Medicine">Medicine (Fixed Unit)</option>
                  <option value="Temporary Shelter">Temporary Shelter (Fixed Unit)</option>
                  <option value="Shelter Repair Materials">Shelter Repair Materials (Fixed Unit)</option>
                </select>
              </div>

              <div style={fieldGroupStyle}>
                <label style={labelStyle}>Batch ID</label>
                <input
                  type="text"
                  placeholder="e.g. BATCH-2026-08"
                  value={batchId}
                  onChange={(e) => setBatchId(e.target.value)}
                  style={inputStyle}
                  required
                />
              </div>

              <div style={{ ...fieldGroupStyle, marginBottom: '22px' }}>
                <label style={labelStyle}>Location</label>
                <input
                  type="text"
                  placeholder="e.g. Brgy 291 Covered Court"
                  value={location}
                  onChange={(e) => setLocation(e.target.value)}
                  style={inputStyle}
                  required
                />
              </div>

              <button type="submit" className="clay-button-primary" style={{ width: '100%', justifyContent: 'center', padding: '11px' }}>
                <Plus size={16} /> Launch Distribution Event
              </button>
            </form>
          </div>
        )}

      {/* ── Real-time Duplicate Alert Stream ── */}
      <div className="clay-card">
        <h3 style={{ fontSize: '16px', fontWeight: 700, color: 'var(--danger)', display: 'flex', alignItems: 'center', gap: '8px', margin: '0 0 6px' }}>
          <ShieldAlert size={20} /> Real-Time Anti-Duplicate Claim Interceptions
        </h3>
        <p style={{ fontSize: '13px', color: 'var(--ink-soft)', marginBottom: '20px' }}>
          Real-time alerts broadcast whenever a duplicate relief claim is blocked at any distribution point.
        </p>

        {duplicateAlerts.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '40px 24px' }}>
            <div style={{
              width: 56, height: 56, borderRadius: '50%',
              background: 'rgba(21,138,100,0.08)', display: 'flex',
              alignItems: 'center', justifyContent: 'center', margin: '0 auto 14px',
            }}>
              <ShieldAlert size={24} color="var(--bay-teal)" />
            </div>
            <p style={{ fontSize: '13px', color: 'var(--ink-soft)', maxWidth: '360px', margin: '0 auto', lineHeight: 1.6 }}>
              No duplicate claim attempts detected yet. Real-time protection is active across all Barangay {user?.barangayCode || '291'} distribution points.
            </p>
          </div>
        ) : (
          <div style={{ display: 'grid', gap: '10px' }}>
            {duplicateAlerts.map((alert, idx) => (
              <div key={idx} style={{
                background: 'rgba(198,86,75,0.06)',
                border: '1px solid rgba(198,86,75,0.25)',
                borderLeft: '4px solid var(--danger)',
                borderRadius: 'var(--radius-inner)',
                padding: '12px 16px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                gap: '12px',
              }}>
                <div>
                  <span style={{ fontWeight: 700, color: 'var(--danger)', fontSize: '13px' }}>BLOCKED:</span>{' '}
                  <span style={{ fontSize: '13px', color: 'var(--ink)', fontWeight: 600 }}>{alert.itemType}</span>
                  <div style={{ fontSize: '12px', color: 'var(--ink-soft)', marginTop: '3px' }}>
                    {alert.householdAddress}, Purok {alert.householdPurok} (Brgy {alert.barangayCode})
                  </div>
                </div>
                <div style={{ fontSize: '11px', color: 'var(--ink-soft)', textAlign: 'right', flexShrink: 0 }}>
                  <div style={{ fontWeight: 600 }}>Staff: {alert.attemptedByStaff}</div>
                  <div>{new Date(alert.attemptedAt).toLocaleTimeString()}</div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

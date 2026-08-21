import React, { useState, useContext, useEffect } from 'react';
import { Settings, Save, RefreshCw, AlertTriangle, Info } from 'lucide-react';
import { AuthContext } from '../context/AuthContext';
import { API_BASE_URL } from '../config';
import { MotionCard, MotionButton } from '../components/motion';

const DEFAULTS = {
  baseCoverage: 5,
  extraMemberTopUp: 0.5,
  seniorTopUp: 0.5,
  pwdTopUp: 0.5,
  basePacksPerMember: 1,
  topUpPregnant: 0.5,
  maxClaimPerHousehold: 1,
  fraudThreshold: 2,
  priorityHighThreshold: 50,
  priorityMedThreshold: 25,
  allowSelfRegistration: true,
  requireIdUpload: true,
};

function SettingRow({ label, desc, children }) {
  return (
    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', padding: '14px 0', borderBottom: '1px solid var(--border)', gap: 24, flexWrap: 'wrap' }}>
      <div style={{ flex: 1, minWidth: 220 }}>
        <div style={{ fontSize: 14, fontWeight: 700, color: 'var(--ink)', marginBottom: 2 }}>{label}</div>
        {desc && <div style={{ fontSize: 12, color: 'var(--ink-soft)' }}>{desc}</div>}
      </div>
      <div>{children}</div>
    </div>
  );
}

export default function GlobalPolicyConfig() {
  const { token } = useContext(AuthContext);
  const [config, setConfig] = useState(DEFAULTS);
  const [saved, setSaved] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  useEffect(() => {
    fetchPolicy();
  }, [token]);

  const fetchPolicy = async () => {
    try {
      const res = await fetch(`${API_BASE_URL}/policy`, {
        headers: { Authorization: 'Bearer ' + token, 'Content-Type': 'application/json' }
      });
      if (res.ok) {
        const data = await res.json();
        setConfig(prev => ({ ...prev, ...data }));
      } else {
        setErrorMsg('Failed to load policy. Using defaults.');
      }
    } catch (err) {
      setErrorMsg('Failed to load policy. Using defaults.');
    }
  };

  const update = (key, val) => { setConfig(p => ({ ...p, [key]: val })); setSaved(false); };
  
  const handleSave = async () => {
    setErrorMsg('');
    try {
      const payload = {
        ...config,
        baseCoverage: config.baseCoverage || 5,
        extraMemberTopUp: config.extraMemberTopUp || 0.5,
        seniorTopUp: config.seniorTopUp || 0.5,
        pwdTopUp: config.pwdTopUp || 0.5,
      };
      const res = await fetch(`${API_BASE_URL}/policy`, {
        method: 'PUT',
        headers: { Authorization: 'Bearer ' + token, 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      if (res.ok) {
        setSaved(true);
      } else {
        setErrorMsg('Failed to save policy updates.');
      }
    } catch (err) {
      setErrorMsg('Failed to save policy updates.');
    }
  };

  const numberInput = (key, min = 0, step = 0.5) => (
    <input
      type="number"
      aria-label={key}
      min={min}
      step={step}
      value={config[key]}
      onChange={e => update(key, parseFloat(e.target.value))}
      style={{ width: 80, padding: '8px 12px', borderRadius: 'var(--radius-inner)', border: '1.5px solid var(--border)', fontSize: 14, fontWeight: 700, textAlign: 'center', outline: 'none', background: 'var(--card)', color: 'var(--ink)' }}
    />
  );

  const toggle = (key) => (
    <button
      onClick={() => update(key, !config[key])}
      aria-label={key}
      role="switch"
      aria-checked={config[key]}
      style={{ width: 52, height: 28, borderRadius: 999, border: 'none', cursor: 'pointer', background: config[key] ? 'var(--manila-blue)' : 'var(--border)', position: 'relative', transition: 'background 0.2s ease' }}
    >
      <span style={{ position: 'absolute', top: 3, left: config[key] ? 27 : 3, width: 22, height: 22, borderRadius: '50%', background: '#fff', transition: 'left 0.2s ease', boxShadow: '0 1px 4px rgba(0,0,0,0.2)' }} />
    </button>
  );

  return (
    <div className="page-container page-animate">
      <div className="workflow-header" style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 28, flexWrap: 'wrap', gap: 16 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
          <div style={{ width: 48, height: 48, borderRadius: 'var(--radius-inner)', background: 'linear-gradient(135deg, #1E1B4B, #312E81)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <Settings size={24} color="#fff" />
          </div>
          <div>
            <h1 className="section-header" style={{ margin: 0, fontSize: 22 }}>Global Policy Configuration</h1>
            <p style={{ fontSize: 13, color: 'var(--ink-soft)', marginTop: 2 }}>System-wide settings for relief formulas and security thresholds.</p>
          </div>
        </div>
        <button onClick={handleSave} className={saved ? 'clay-button-approve' : 'clay-button-primary'} style={{ fontSize: 13, gap: 6 }}>
          <Save size={14} /> {saved ? 'Saved!' : 'Save Changes'}
        </button>
      </div>

      {errorMsg && (
        <div style={{ padding: '12px', background: '#FEF2F2', color: '#DC2626', borderRadius: '8px', marginBottom: '20px', border: '1px solid #FCA5A5' }}>
          <AlertTriangle size={16} style={{ display: 'inline', marginRight: '8px', verticalAlign: 'middle' }} />
          {errorMsg}
        </div>
      )}

      <div style={{ display: 'grid', gap: 20 }}>
        <div className="clay-card">
          <h2 style={{ fontSize: 16, fontWeight: 800, color: 'var(--ink)', marginBottom: 2 }}>Right-Sized Relief Formula</h2>
          <p style={{ fontSize: 13, color: 'var(--ink-soft)', marginBottom: 0 }}>Configure how relief packs are calculated per household member count and vulnerability type.</p>
          <SettingRow label="Base Packs per Household Member" desc="Number of relief packs allocated per verified household member.">{numberInput('basePacksPerMember', 0.5, 0.5)}</SettingRow>
          <SettingRow label="Base Family Size Threshold" desc="Maximum members covered by base allocation.">{numberInput('baseCoverage', 1, 1)}</SettingRow>
          <SettingRow label="Extra Member Top-Up" desc="Multiplier for members exceeding base coverage.">{numberInput('extraMemberTopUp', 0, 0.25)}</SettingRow>
          <SettingRow label="Top-Up for Senior Citizens (60+)" desc="Additional pack multiplier for each senior citizen in the household.">{numberInput('seniorTopUp', 0, 0.25)}</SettingRow>
          <SettingRow label="Top-Up for PWD Members" desc="Additional pack multiplier for each member with a disability.">{numberInput('pwdTopUp', 0, 0.25)}</SettingRow>
          <SettingRow label="Top-Up for Pregnant Members" desc="Additional pack multiplier for each pregnant household member.">{numberInput('topUpPregnant', 0, 0.25)}</SettingRow>
        </div>

        <div className="clay-card">
          <h2 style={{ fontSize: 16, fontWeight: 800, color: 'var(--ink)', marginBottom: 2 }}>Anti-Fraud & Safety Settings</h2>
          <p style={{ fontSize: 13, color: 'var(--ink-soft)', marginBottom: 0 }}>Controls that prevent duplicate claiming and protect distribution integrity.</p>
          <SettingRow label="Maximum Claims per Household per Event" desc="How many times a household can claim from a single distribution event.">{numberInput('maxClaimPerHousehold', 1, 1)}</SettingRow>
          <SettingRow label="Fraud Block Threshold (Attempt Count)" desc="Number of duplicate claim attempts before an account is auto-flagged.">{numberInput('fraudThreshold', 1, 1)}</SettingRow>
        </div>

        <div className="clay-card">
          <h2 style={{ fontSize: 16, fontWeight: 800, color: 'var(--ink)', marginBottom: 2 }}>Priority Scoring Thresholds</h2>
          <p style={{ fontSize: 13, color: 'var(--ink-soft)', marginBottom: 0 }}>Score boundaries that determine household priority levels.</p>
          <SettingRow label="High Priority Score Threshold" desc="Households with score ≥ this value are marked High Priority.">{numberInput('priorityHighThreshold', 10, 5)}</SettingRow>
          <SettingRow label="Medium Priority Score Threshold" desc="Households with score ≥ this value (but below High) are marked Medium Priority.">{numberInput('priorityMedThreshold', 5, 5)}</SettingRow>
        </div>

        <div className="clay-card">
          <h2 style={{ fontSize: 16, fontWeight: 800, color: 'var(--ink)', marginBottom: 2 }}>Registration Settings</h2>
          <SettingRow label="Allow Self-Registration via Mobile App" desc="Let residents register their own household accounts through the mobile app.">{toggle('allowSelfRegistration')}</SettingRow>
          <SettingRow label="Require Valid ID Upload on Registration" desc="Mandate ID photo upload during household registration.">{toggle('requireIdUpload')}</SettingRow>
        </div>
      </div>
    </div>
  );
}

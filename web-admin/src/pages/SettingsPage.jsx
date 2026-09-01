import React, { useState, useRef, useContext, useEffect } from 'react';
import { AuthContext } from '../context/AuthContext';
import { getRoleLabel } from '../utils/roleUtils';
import { API_BASE_URL } from '../config';
import {
  User, Camera, Sun, Moon, Bell,
  Globe, Monitor, Save, CheckCircle,
  Shield, Smartphone, Clock, Info, Palette
} from 'lucide-react';
import { MotionCard, MotionButton } from '../components/motion';

// ── Settings Section wrapper ──────────────────────────────────────────────────
function Section({ title, desc, icon, children }) {
  return (
    <MotionCard className="clay-card" style={{ marginBottom: 20 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 18, paddingBottom: 14, borderBottom: '1px solid var(--border)' }}>
        <div style={{ width: 38, height: 38, borderRadius: 10, background: 'var(--manila-blue-light)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
          {icon}
        </div>
        <div>
          <h2 style={{ fontSize: 15, fontWeight: 800, color: 'var(--ink)', margin: 0 }}>{title}</h2>
          {desc && <p style={{ fontSize: 12, color: 'var(--ink-soft)', margin: '2px 0 0' }}>{desc}</p>}
        </div>
      </div>
      {children}
    </MotionCard>
  );
}

// ── Individual setting row ─────────────────────────────────────────────────────
function SettingRow({ label, desc, children, noBorder }) {
  return (
    <div style={{
      display: 'flex', justifyContent: 'space-between', alignItems: 'center',
      padding: '12px 0', borderBottom: noBorder ? 'none' : '1px solid var(--border)',
      gap: 20, flexWrap: 'wrap',
    }}>
      <div style={{ flex: 1, minWidth: 180 }}>
        <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--ink)' }}>{label}</div>
        {desc && <div style={{ fontSize: 12, color: 'var(--ink-soft)', marginTop: 2 }}>{desc}</div>}
      </div>
      <div style={{ flexShrink: 0 }}>{children}</div>
    </div>
  );
}

// ── Toggle switch ──────────────────────────────────────────────────────────────
function Toggle({ value, onChange, color = 'var(--manila-blue)' }) {
  return (
    <button
      onClick={() => onChange(!value)}
      style={{
        width: 48, height: 26, borderRadius: 999, border: 'none', cursor: 'pointer',
        background: value ? color : 'var(--border)', position: 'relative',
        transition: 'background 0.2s ease', flexShrink: 0,
      }}
      aria-checked={value} role="switch"
    >
      <span style={{
        position: 'absolute', top: 3, left: value ? 25 : 3, width: 20, height: 20,
        borderRadius: '50%', background: '#fff', transition: 'left 0.2s ease',
        boxShadow: '0 1px 4px rgba(0,0,0,0.18)',
      }} />
    </button>
  );
}

export default function SettingsPage() {
  const { user, login, token } = useContext(AuthContext);
  const fileRef = useRef(null);

  // ── Theme (read + sync from localStorage) ──────────────────────────────────
  const [theme, setTheme] = useState(() => localStorage.getItem('mitigateplus_theme') || 'light');
  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
    localStorage.setItem('mitigateplus_theme', theme);
  }, [theme]);

  // ── Account-Scoped Keys ─────────────────────────────────────────────────────
  const userKey = user?.emailOrPhone || user?.email || user?.role || 'default';
  const avatarKey = `mitigateplus_avatar_${userKey}`;

  // ── Profile state ───────────────────────────────────────────────────────────
  const [displayName, setDisplayName] = useState(user?.name || '');
  const [email, setEmail] = useState(user?.email || '');
  const [avatarSrc, setAvatarSrc] = useState(() => localStorage.getItem(avatarKey) || null);

  // Sync state if logged-in user changes
  useEffect(() => {
    setDisplayName(user?.name || '');
    setEmail(user?.email || '');
    setAvatarSrc(localStorage.getItem(avatarKey) || null);
  }, [userKey]);

  // ── Notification prefs ──────────────────────────────────────────────────────
  const [notifRealtime, setNotifRealtime] = useState(true);
  const [notifEmail, setNotifEmail] = useState(false);
  const [notifSound, setNotifSound] = useState(true);

  // ── System prefs ────────────────────────────────────────────────────────────
  const [language, setLanguage] = useState(localStorage.getItem('mitigateplus_lang') || 'en');

  // ── Language strings (bilingual support) ────────────────────────────────────
  const t = {
    en: {
      settingsTitle: 'Settings',
      settingsSub: 'Manage your profile, appearance, and system preferences.',
      profileTitle: 'Profile', profileDesc: "Your public identity on MitigatePlus",
      changePhoto: 'Change Photo', saveProfile: 'Save Profile',
      displayName: 'Display Name', emailAddr: 'Email Address',
      role: 'Role', barangay: 'Barangay', readOnly: '(Read-only)',
      notifTitle: 'Notifications', notifDesc: 'Control how you receive alerts and updates',
      realtimeAlerts: 'Real-Time Alerts', realtimeDesc: 'Get live notifications for new registrations, pending verifications, and fraud flags.',
      emailNotif: 'Email Notifications', emailNotifDesc: 'Receive a daily digest email summary of system activity.',
      notifSound: 'Notification Sound', notifSoundDesc: 'Play a sound when a new real-time alert arrives.',
      systemTitle: 'System Preferences', systemDesc: 'Language and display options',
      languageLabel: 'Language', languageDesc: 'Interface display language.',
      savePrefs: 'Save Preferences',
      appTitle: 'Appearance', appDesc: 'Theme and visual style',
      colorTheme: 'Color Theme',
      lightLabel: 'Light', lightDesc: 'Pearl White',
      darkLabel: 'Dark', darkDesc: 'Midnight',
      active: 'Active',
      acctInfo: 'Account Info', acctInfoDesc: 'System account details',
      acctId: 'Account ID', sysVer: 'System Version',
      savedMsg: 'Changes saved!', profileSaved: 'Profile saved!', photoSaved: 'Profile picture updated!', prefsSaved: 'Preferences saved!',
    },
    fil: {
      settingsTitle: 'Mga Setting ng Sistema',
      settingsSub: 'Pamahalaan ang inyong profile, hitsura, at mga pangkalahatang kagustuhan sa portal.',
      profileTitle: 'Profile ng Gumagamit', profileDesc: 'Ang inyong opisyal na pagkakakilanlan sa MitigatePlus',
      changePhoto: 'Palitan ang Larawan', saveProfile: 'I-save ang Profile',
      displayName: 'Kumpletong Pangalan', emailAddr: 'Email o Username',
      role: 'Tungkulin sa LGU', barangay: 'Nasasakupang Barangay', readOnly: '(Protektado / Hindi mababago)',
      notifTitle: 'Mga Abiso at Alerto', notifDesc: 'Kontrolin kung paano ka tumatanggap ng mga opisyal na alerto',
      realtimeAlerts: 'Mga Real-Time na Alerto', realtimeDesc: 'Tumanggap ng live na abiso para sa mga bagong rehistro, nakabinbing beripikasyon, at fraud flags.',
      emailNotif: 'Abiso sa Email', emailNotifDesc: 'Tumanggap ng araw-araw na buod ng mga kaganapan sa email.',
      notifSound: 'Tunog ng Alerto', notifSoundDesc: 'Mag-play ng tunog kapag may bagong alerto na dumating.',
      systemTitle: 'Mga Kagustuhan sa Sistema', systemDesc: 'Opsyon sa Wika at Pagpapakita sa Screen',
      languageLabel: 'Pangunahing Wika', languageDesc: 'Wika na gagamitin sa buong interface ng portal.',
      savePrefs: 'I-save ang mga Kagustuhan',
      appTitle: 'Hitsura at Tema', appDesc: 'Estilo ng kulay at mode ng display',
      colorTheme: 'Pangunahing Kulay ng Tema',
      lightLabel: 'Maliwanag', lightDesc: 'Puting Maynila',
      darkLabel: 'Madilim', darkDesc: 'Gabi sa Lungsod',
      active: 'Kasalukuyang Gamit',
      acctInfo: 'Impormasyon ng Akawnt', acctInfoDesc: 'Opisyal na detalye ng inyong akawnt',
      acctId: 'ID ng Akawnt', sysVer: 'Bersyon ng Sistema',
      savedMsg: 'Matagumpay na nai-save!', profileSaved: 'Nai-save na ang inyong Profile!', photoSaved: 'Na-update na ang larawan ng profile!', prefsSaved: 'Nai-save na ang bagong wika at kagustuhan!',
    },
  }[language] || {};

  // ── Save feedback ────────────────────────────────────────────────────────────
  const [saved, setSaved] = useState('');
  const showSaved = (msg = 'Changes saved!') => { setSaved(msg); setTimeout(() => setSaved(''), 2500); };

  // ── Password states ────────────────────────────────────────────────────────
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [pwdError, setPwdError] = useState('');

  // ── Avatar upload ────────────────────────────────────────────────────────────
  const handleAvatarChange = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = async (ev) => {
      const src = ev.target.result;
      setAvatarSrc(src);
      localStorage.setItem(avatarKey, src);

      if (token) {
        try {
          const res = await fetch(`${API_BASE_URL}/auth/profile`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
            body: JSON.stringify({ avatarUrl: src }),
          });
          if (!res.ok) {
            showSaved('Error syncing avatar to server.');
          } else {
            showSaved(t.photoSaved);
          }
        } catch (err) {
          showSaved('Error syncing avatar to server.');
        }
      } else {
        showSaved(t.photoSaved);
      }
    };
    reader.readAsDataURL(file);
  };

  // ── Save profile ─────────────────────────────────────────────────────────────
  const handleSaveProfile = async () => {
    setPwdError('');
    if (user) {
      const updated = { ...user, name: displayName, email, avatarUrl: avatarSrc };
      localStorage.setItem('user', JSON.stringify(updated));
      login(updated, token);

      if (token) {
        try {
          const bodyData = { name: displayName, emailOrPhone: email, avatarUrl: avatarSrc };
          if (newPassword) {
            bodyData.currentPassword = currentPassword;
            bodyData.newPassword = newPassword;
          }
          const res = await fetch(`${API_BASE_URL}/auth/profile`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
            body: JSON.stringify(bodyData),
          });
          const data = await res.json();
          if (!res.ok) {
            setPwdError(data.message || 'Failed to update profile in database.');
            showSaved('Failed to update profile.');
            return;
          }
          setCurrentPassword('');
          setNewPassword('');
        } catch (err) {
          showSaved('Error syncing profile to server.');
          return;
        }
      }
    }
    showSaved(t.profileSaved);
  };

  // ── Save system prefs ─────────────────────────────────────────────────────────
  const handleSaveSystem = () => {
    localStorage.setItem('mitigateplus_lang', language);
    window.dispatchEvent(new Event('mitigateplus_lang_changed'));
    showSaved(t.prefsSaved);
  };

  const avatarInitials = displayName
    ? displayName.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2)
    : 'LG';

  return (
    <div className="page-container page-animate">
      {/* ── Page Header ── */}
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 28, flexWrap: 'wrap', gap: 14 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
          <div style={{ width: 48, height: 48, borderRadius: 'var(--radius-inner)', background: 'linear-gradient(135deg, var(--manila-blue), #1e5a7a)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <User size={24} color="#fff" />
          </div>
          <div>
            <h1 className="section-header" style={{ margin: 0, fontSize: 22 }}>{t.settingsTitle}</h1>
            <p style={{ fontSize: 13, color: 'var(--ink-soft)', marginTop: 2 }}>{t.settingsSub}</p>
          </div>
        </div>
        {saved && (
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, background: 'rgba(21,138,100,0.1)', border: '1.5px solid rgba(21,138,100,0.25)', padding: '8px 16px', borderRadius: 'var(--radius-pill)', color: '#158A64', fontSize: 13, fontWeight: 700 }}>
            <CheckCircle size={15} /> {saved}
          </div>
        )}
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 340px', gap: 20, alignItems: 'start' }}>
        {/* ── LEFT COLUMN ── */}
        <div>

          {/* ── PROFILE ── */}
          <Section title={t.profileTitle} desc={t.profileDesc} icon={<User size={18} color="var(--manila-blue)" />}>

            {/* Avatar upload */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 20, marginBottom: 20 }}>
              <div style={{ position: 'relative', flexShrink: 0 }}>
                <div style={{
                  width: 80, height: 80, borderRadius: '50%',
                  background: avatarSrc ? 'transparent' : 'linear-gradient(135deg, var(--manila-blue), var(--manila-blue-deep))',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  overflow: 'hidden', border: '3px solid var(--border)',
                  boxShadow: '0 4px 12px rgba(15,23,42,0.10)',
                }}>
                  {avatarSrc
                    ? <img src={avatarSrc} alt="Profile" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                    : <span style={{ fontSize: 26, fontWeight: 900, color: '#fff', letterSpacing: '-1px' }}>{avatarInitials}</span>
                  }
                </div>
                <button
                  onClick={() => fileRef.current?.click()}
                  style={{
                    position: 'absolute', bottom: 0, right: 0, width: 28, height: 28,
                    borderRadius: '50%', background: 'var(--manila-blue)', border: '2px solid var(--card)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer',
                    boxShadow: '0 2px 6px rgba(37,99,235,0.3)',
                  }}
                  aria-label="Upload profile picture"
                  title="Upload profile picture"
                >
                  <Camera size={13} color="#fff" />
                </button>
                <input ref={fileRef} aria-label="Upload profile photo file" type="file" accept="image/*" style={{ display: 'none' }} onChange={handleAvatarChange} />
              </div>
              <div>
                <div style={{ fontSize: 15, fontWeight: 800, color: 'var(--ink)' }}>{displayName || 'LGU Official'}</div>
                <div style={{ fontSize: 12, color: 'var(--ink-soft)', marginTop: 3 }}>{getRoleLabel(user?.role)}{user?.barangayCode ? ` - Barangay ${user.barangayCode}` : ''}</div>
                <button onClick={() => fileRef.current?.click()} style={{ marginTop: 8, fontSize: 12, background: 'var(--manila-blue-light)', color: 'var(--manila-blue)', border: '1px solid rgba(37,99,235,0.2)', padding: '4px 12px', borderRadius: 999, cursor: 'pointer', fontWeight: 700 }}>
                  {t.changePhoto}
                </button>
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 14 }}>
              <div>
                <label style={{ fontSize: 11, fontWeight: 700, color: 'var(--ink-soft)', textTransform: 'uppercase', letterSpacing: '0.06em', display: 'block', marginBottom: 5 }}>{t.displayName}</label>
                <input
                  aria-label="Display Name"
                  value={displayName}
                  onChange={e => setDisplayName(e.target.value)}
                  style={{ width: '100%', padding: '9px 12px', borderRadius: 'var(--radius-inner)', border: '1.5px solid var(--border)', fontSize: 13, outline: 'none', background: 'var(--card)', color: 'var(--ink)', fontFamily: 'var(--font-sans)', boxSizing: 'border-box' }}
                />
              </div>
              <div>
                <label style={{ fontSize: 11, fontWeight: 700, color: 'var(--ink-soft)', textTransform: 'uppercase', letterSpacing: '0.06em', display: 'block', marginBottom: 5 }}>{t.emailAddr}</label>
                <input
                  aria-label="Email Address"
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  type="email"
                  style={{ width: '100%', padding: '9px 12px', borderRadius: 'var(--radius-inner)', border: '1.5px solid var(--border)', fontSize: 13, outline: 'none', background: 'var(--card)', color: 'var(--ink)', fontFamily: 'var(--font-sans)', boxSizing: 'border-box' }}
                />
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 16 }}>
              <div>
                <label style={{ fontSize: 11, fontWeight: 700, color: 'var(--ink-soft)', textTransform: 'uppercase', letterSpacing: '0.06em', display: 'block', marginBottom: 5 }}>{t.role}</label>
                <div style={{ padding: '9px 12px', borderRadius: 'var(--radius-inner)', border: '1.5px solid var(--border)', fontSize: 13, background: 'var(--sampaguita)', color: 'var(--ink-soft)', fontWeight: 600 }}>
                  {getRoleLabel(user?.role)} {user?.role !== 'lgu_superadmin' ? t.readOnly : ''}
                </div>
              </div>
              {user?.barangayCode && (
                <div>
                  <label style={{ fontSize: 11, fontWeight: 700, color: 'var(--ink-soft)', textTransform: 'uppercase', letterSpacing: '0.06em', display: 'block', marginBottom: 5 }}>{t.barangay}</label>
                  <div style={{ padding: '9px 12px', borderRadius: 'var(--radius-inner)', border: '1.5px solid var(--border)', fontSize: 13, background: 'var(--sampaguita)', color: 'var(--ink-soft)', fontWeight: 600 }}>
                    Barangay {user.barangayCode} {t.readOnly}
                  </div>
                </div>
              )}
            </div>

            {/* Password Change Sub-section */}
            <div style={{ marginTop: 16, paddingTop: 14, borderTop: '1px solid var(--border)', marginBottom: 16 }}>
              <div style={{ fontSize: 12, fontWeight: 800, color: 'var(--ink)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 10 }}>Change Password (Optional)</div>
              {pwdError && <div style={{ background: '#FEF2F2', border: '1px solid #FCA5A5', color: '#DC2626', padding: '8px 12px', borderRadius: 8, fontSize: 12, marginBottom: 10 }}>{pwdError}</div>}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                <div>
                  <label style={{ fontSize: 11, fontWeight: 700, color: 'var(--ink-soft)', textTransform: 'uppercase', letterSpacing: '0.06em', display: 'block', marginBottom: 5 }}>Current Password</label>
                  <input
                    aria-label="Current Password"
                    type="password"
                    value={currentPassword}
                    onChange={e => setCurrentPassword(e.target.value)}
                    placeholder="••••••••"
                    style={{ width: '100%', padding: '9px 12px', borderRadius: 'var(--radius-inner)', border: '1.5px solid var(--border)', fontSize: 13, outline: 'none', background: 'var(--card)', color: 'var(--ink)', fontFamily: 'var(--font-sans)', boxSizing: 'border-box' }}
                  />
                </div>
                <div>
                  <label style={{ fontSize: 11, fontWeight: 700, color: 'var(--ink-soft)', textTransform: 'uppercase', letterSpacing: '0.06em', display: 'block', marginBottom: 5 }}>New Password</label>
                  <input
                    aria-label="New Password"
                    type="password"
                    value={newPassword}
                    onChange={e => setNewPassword(e.target.value)}
                    placeholder="••••••••"
                    style={{ width: '100%', padding: '9px 12px', borderRadius: 'var(--radius-inner)', border: '1.5px solid var(--border)', fontSize: 13, outline: 'none', background: 'var(--card)', color: 'var(--ink)', fontFamily: 'var(--font-sans)', boxSizing: 'border-box' }}
                  />
                </div>
              </div>
            </div>

            <button onClick={handleSaveProfile} className="clay-button-primary" style={{ fontSize: 13, gap: 6 }}>
              <Save size={14} /> {t.saveProfile}
            </button>
          </Section>

          {/* ── NOTIFICATIONS ── */}
          <Section title={t.notifTitle} desc={t.notifDesc} icon={<Bell size={18} color="var(--manila-blue)" />}>
            <SettingRow label={t.realtimeAlerts} desc={t.realtimeDesc}>
              <Toggle value={notifRealtime} onChange={setNotifRealtime} />
            </SettingRow>
            <SettingRow label={t.emailNotif} desc={t.emailNotifDesc}>
              <Toggle value={notifEmail} onChange={setNotifEmail} />
            </SettingRow>
            <SettingRow label={t.notifSound} desc={t.notifSoundDesc} noBorder>
              <Toggle value={notifSound} onChange={setNotifSound} />
            </SettingRow>
          </Section>

          {/* ── SYSTEM ── */}
          <Section title={t.systemTitle} desc={t.systemDesc} icon={<Monitor size={18} color="var(--manila-blue)" />}>
            <SettingRow label={t.languageLabel} desc={t.languageDesc} noBorder>
              <select
                aria-label="Select System Language"
                value={language}
                onChange={e => {
                  const newLang = e.target.value;
                  setLanguage(newLang);
                  localStorage.setItem('mitigateplus_lang', newLang);
                  window.dispatchEvent(new Event('mitigateplus_lang_changed'));
                }}
                style={{ padding: '8px 12px', borderRadius: 'var(--radius-inner)', border: '1.5px solid var(--border)', fontSize: 13, outline: 'none', background: 'var(--card)', color: 'var(--ink)', cursor: 'pointer', fontWeight: 600 }}
              >
                <option value="en">English (US)</option>
                <option value="fil">Wikang Tagalog / Filipino</option>
              </select>
            </SettingRow>
            <div style={{ marginTop: 14 }}>
              <button onClick={handleSaveSystem} className="clay-button-primary" style={{ fontSize: 13, gap: 6 }}>
                <Save size={14} /> {t.savePrefs}
              </button>
            </div>
          </Section>

        </div>

        {/* ── RIGHT COLUMN ── */}
        <div>

          {/* ── APPEARANCE ── */}
          <div className="clay-card" style={{ marginBottom: 20 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 16, paddingBottom: 12, borderBottom: '1px solid var(--border)' }}>
              <div style={{ width: 38, height: 38, borderRadius: 10, background: 'var(--manila-blue-light)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <Palette size={18} color="var(--manila-blue)" />
              </div>
              <div>
                <h2 style={{ fontSize: 15, fontWeight: 800, color: 'var(--ink)', margin: 0 }}>Appearance</h2>
                <p style={{ fontSize: 12, color: 'var(--ink-soft)', margin: '2px 0 0' }}>Theme and visual style</p>
              </div>
            </div>

            <p style={{ fontSize: 12, fontWeight: 700, color: 'var(--ink-soft)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 10 }}>{t.colorTheme}</p>

            {/* Theme toggle cards */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 16 }}>
              {[
                { value: 'light', label: t.lightLabel, icon: <Sun size={20} color={theme === 'light' ? 'var(--manila-blue)' : 'var(--ink-soft)'} />, desc: t.lightDesc, preview: ['#F4F6F9', '#FFFFFF', '#2563EB'] },
                { value: 'dark', label: t.darkLabel, icon: <Moon size={20} color={theme === 'dark' ? 'var(--manila-blue)' : 'var(--ink-soft)'} />, desc: t.darkDesc, preview: ['#0F172A', '#1E293B', '#60A5FA'] },
              ].map(th => (
                <button
                  key={th.value}
                  onClick={() => setTheme(th.value)}
                  style={{
                    padding: '14px 12px', borderRadius: 12, cursor: 'pointer',
                    border: theme === th.value ? '2px solid var(--manila-blue)' : '1.5px solid var(--border)',
                    background: theme === th.value ? 'var(--manila-blue-light)' : 'var(--sampaguita)',
                    display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8,
                    transition: 'all 0.15s ease',
                  }}
                >
                  <div style={{ display: 'flex', gap: 4, marginBottom: 2 }}>
                    {th.preview.map((c, i) => <div key={i} style={{ width: 14, height: 14, borderRadius: '50%', background: c, border: '1px solid rgba(0,0,0,0.08)' }} />)}
                  </div>
                  {th.icon}
                  <div>
                    <div style={{ fontSize: 13, fontWeight: 800, color: theme === th.value ? 'var(--manila-blue)' : 'var(--ink)', textAlign: 'center' }}>{th.label}</div>
                    <div style={{ fontSize: 11, color: 'var(--ink-soft)', textAlign: 'center' }}>{th.desc}</div>
                  </div>
                  {theme === th.value && (
                    <div style={{ display: 'flex', alignItems: 'center', gap: 4, background: 'var(--manila-blue)', color: '#fff', fontSize: 11, fontWeight: 800, padding: '3px 8px', borderRadius: 999 }}>
                      <CheckCircle size={10} /> {t.active}
                    </div>
                  )}
                </button>
              ))}
            </div>
          </div>

          {/* ── ACCOUNT INFO CARD ── */}
          <div className="clay-card" style={{ marginBottom: 20 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 14, paddingBottom: 12, borderBottom: '1px solid var(--border)' }}>
              <div style={{ width: 38, height: 38, borderRadius: 10, background: 'var(--manila-blue-light)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <Info size={18} color="var(--manila-blue)" />
              </div>
              <div>
                <h3 style={{ fontSize: 15, fontWeight: 800, color: 'var(--ink)', margin: 0 }}>Account Info</h3>
                <p style={{ fontSize: 12, color: 'var(--ink-soft)', margin: '2px 0 0' }}>System account details</p>
              </div>
            </div>
            {[
              { label: 'Account ID', value: user?.id || 'USR-2026-0001' },
              { label: 'Role', value: getRoleLabel(user?.role) },
              { label: 'Barangay', value: user?.barangayCode ? `Barangay ${user.barangayCode}` : 'City-Wide' },
              { label: 'System Version', value: 'MitigatePlus v2.0' },
            ].map((info, i) => (
              <div key={i} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '9px 0', borderBottom: i < 3 ? '1px solid var(--border)' : 'none' }}>
                <span style={{ fontSize: 12, color: 'var(--ink-soft)', fontWeight: 600 }}>{info.label}</span>
                <span style={{ fontSize: 12, fontWeight: 700, color: 'var(--ink)' }}>{info.value}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

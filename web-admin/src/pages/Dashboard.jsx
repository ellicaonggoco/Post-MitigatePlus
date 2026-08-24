import React, { useState, useEffect, useContext, lazy, Suspense } from 'react';
import { AuthContext } from '../context/AuthContext';
import { ROLES } from '../utils/roleUtils';
import { Link } from 'react-router-dom';
import { API_BASE_URL } from '../config';
import {
  UserCheck, Shield, Package, AlertTriangle, ArrowRight,
  Activity, Clock, TrendingUp, BarChart2, Truck,
  Warehouse, Radio, Star, MapPin, Lock, Settings,
  CheckCircle, Users, FileText
} from 'lucide-react';
import { IconlyVerification, IconlyShield, IconlyPackage } from '../components/Sidebar';
import { MotionCard, MotionNumberCounter, MotionButton } from '../components/motion';

// Lazy-load heavy Recharts package for maximum mobile performance and instant LCP
const SuperAdminCityChart = lazy(() => import('./DashboardCharts').then(m => ({ default: m.SuperAdminCityChart })));
const LguAdminReliefChart = lazy(() => import('./DashboardCharts').then(m => ({ default: m.LguAdminReliefChart })));
const BarangayRecoveryPieChart = lazy(() => import('./DashboardCharts').then(m => ({ default: m.BarangayRecoveryPieChart })));

const ChartSkeleton = ({ height = 280 }) => (
  <div style={{ width: '100%', height, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(23,63,86,0.02)', borderRadius: 10 }}>
    <div style={{ width: '100%', height: '100%', padding: '16px 20px', display: 'flex', alignItems: 'flex-end', gap: 16 }}>
      {[40, 70, 55, 90, 45, 80].map((h, i) => (
        <div key={i} style={{ flex: 1, height: `${h}%`, background: 'rgba(23,63,86,0.08)', borderRadius: '4px 4px 0 0' }} />
      ))}
    </div>
  </div>
);

export default function Dashboard() {
  const { token, user } = useContext(AuthContext);
  const role = user?.role;

  if (role === ROLES.LGU_SUPERADMIN) return <SuperAdminDashboard token={token} user={user} />;
  if (role === ROLES.LGU_ADMIN) return <LguAdminDashboard token={token} user={user} />;
  return <BarangayDashboard token={token} user={user} />;
}

// ─────────────────────────────────────────────────────────────────────────────
// LGU SUPERADMIN — City Wide Master Executive Dashboard
// ─────────────────────────────────────────────────────────────────────────────
function SuperAdminDashboard({ token, user }) {
  const [summary, setSummary] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetch_ = async () => {
      try {
        const res = await fetch(`${API_BASE_URL}/reports/summary`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (res.ok) setSummary(await res.json());
      } catch (e) { console.error(e); } finally { setLoading(false); }
    };
    if (token) fetch_();
  }, [token]);

  const kpis = [
    { label: 'Total Barangays Covered', value: summary?.totalBarangays ?? 897, icon: MapPin, color: '#173F56', bg: 'var(--manila-blue-light)' },
    { label: 'Total Verified Beneficiaries', value: summary?.verifiedHouseholds ?? 0, icon: UserCheck, color: '#0F6B4E', bg: 'var(--bay-teal-light)' },
    { label: 'Total Relief Distributed', value: summary?.totalDistributions ?? 0, icon: Package, color: '#6D28D9', bg: '#F5F3FF' },
    { label: 'Executive Audit Flags', value: summary?.duplicateAttemptsCount ?? 0, icon: AlertTriangle, color: '#B91C1C', bg: '#FEF2F2' },
  ];

  // Derive chart data from real API summary — fallback to empty bars (no fake values)
  const cityChartData = summary?.districtBreakdown ?? [
    { district: 'District 1', Beneficiaries: 0, Relief: 0 },
    { district: 'District 2', Beneficiaries: 0, Relief: 0 },
    { district: 'District 3', Beneficiaries: 0, Relief: 0 },
    { district: 'District 4', Beneficiaries: 0, Relief: 0 },
    { district: 'District 5', Beneficiaries: 0, Relief: 0 },
    { district: 'District 6', Beneficiaries: 0, Relief: 0 },
  ];


  return (
    <div className="page-container page-animate">
      <WelcomeBanner
        badge="LGU Super Admin — Executive Control"
        title="City of Manila Executive Dashboard"
        sub="City-wide statistics across all 897 barangays of Manila."
        gradient="linear-gradient(135deg, #090154 0%, #001275 60%, #1E40AF 100%)"
      />

      <div className="grid-4 stagger-children dashboard-kpis" style={{ marginBottom: '32px' }}>
        {kpis.map((k, i) => (
          <MotionCard key={i} delay={i * 0.04} className="clay-card" style={{ borderTop: `3px solid ${k.color}` }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
              <div>
                <span style={{ fontSize: '12px', color: 'var(--ink-soft)', fontWeight: 600 }}>{k.label}</span>
                <div style={{ fontSize: '36px', fontWeight: 800, color: k.color, lineHeight: 1.1, marginTop: '4px' }}>
                  <MotionNumberCounter value={k.value} />
                </div>
              </div>
              <div style={{ width: 42, height: 42, borderRadius: 12, background: k.bg, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <k.icon size={20} color={k.color} />
              </div>
            </div>
          </MotionCard>
        ))}
      </div>

      <SectionHeader icon={<BarChart2 size={18} color="var(--manila-blue)" />} title="City-Wide Relief vs Beneficiaries per District" />
      <div className="clay-card" style={{ marginBottom: '28px' }}>
        <Suspense fallback={<ChartSkeleton height={280} />}>
          <SuperAdminCityChart data={cityChartData} />
        </Suspense>
      </div>

      <SectionHeader icon={<Settings size={18} color="var(--manila-blue)" />} title="Executive Quick Actions" />
      <div className="grid-3 stagger-children">
        <QuickActionCard icon={<Lock size={22} color="#6D28D9" />} bg="#F5F3FF" label="Account Security" desc="Deactivate or revoke LGU Admin and Barangay Official accounts." link="/account-security" linkLabel="Manage Accounts" btnClass="clay-button-ghost" />
        <QuickActionCard icon={<Settings size={22} color="var(--manila-blue)" />} bg="var(--manila-blue-light)" label="Global Policy Config" desc="Configure relief allocation formula and safety settings." link="/global-policy" linkLabel="Open Policy Settings" btnClass="clay-button-primary" />
        <QuickActionCard icon={<UserCheck size={22} color="#0F6B4E" />} bg="var(--bay-teal-light)" label="Account Provisioning" desc="Create LGU Admin and Barangay Official accounts." link="/provision-accounts" linkLabel="Provision Accounts" btnClass="clay-button-approve" />
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// LGU ADMIN — City-Wide Operational Dashboard
// ─────────────────────────────────────────────────────────────────────────────
function LguAdminDashboard({ token, user }) {
  const [summary, setSummary] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetch_ = async () => {
      try {
        const res = await fetch(`${API_BASE_URL}/reports/summary`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (res.ok) setSummary(await res.json());
      } catch (e) { console.error(e); } finally { setLoading(false); }
    };
    if (token) fetch_();
  }, [token]);

  const kpis = [
    { label: 'Active Distribution Events', value: summary?.activeEvents ?? 0, icon: Truck, color: '#173F56', bg: 'var(--manila-blue-light)', link: '/distribution-events' },
    { label: 'Pending Verifications (City)', value: summary?.pendingVerifications ?? 0, icon: UserCheck, color: '#B45309', bg: '#FFFBEB', link: '/verification-queue' },
    { label: 'Fraud Interceptions Today', value: summary?.duplicateAttemptsCount ?? 0, icon: Shield, color: '#B91C1C', bg: '#FEF2F2', link: '/fraud-interception' },
    { label: 'Total Distributed', value: summary?.totalDistributions ?? 0, icon: Package, color: '#0F6B4E', bg: 'var(--bay-teal-light)', link: '/relief-allocation' },
  ];

  // Derive relief chart from real API summary — fallback shows 0 targets (no fake values)
  const reliefData = summary?.reliefBreakdown ?? [
    { name: 'Food Packs', Target: 0, Distributed: 0 },
    { name: 'Water', Target: 0, Distributed: 0 },
    { name: 'Medical Kits', Target: 0, Distributed: 0 },
    { name: 'Hygiene Kits', Target: 0, Distributed: 0 },
    { name: 'Shelter Tents', Target: 0, Distributed: 0 },
  ];



  return (
    <div className="page-container page-animate">
      <WelcomeBanner
        badge="LGU Admin — City Operations"
        title="Operational Command Center"
        sub="Manage city-wide relief distribution, field staff, and warehouse inventory."
        gradient="linear-gradient(135deg, #090154 0%, #001275 60%, #1E40AF 100%)"
      />

      <div className="grid-4 stagger-children dashboard-kpis" style={{ marginBottom: '32px' }}>
        {kpis.map((k, i) => (
          <MotionCard key={i} delay={i * 0.04} className="clay-card" style={{ borderTop: `3px solid ${k.color}` }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
              <div>
                <span style={{ fontSize: '12px', color: 'var(--ink-soft)', fontWeight: 600 }}>{k.label}</span>
                <div style={{ fontSize: '36px', fontWeight: 800, color: k.color, lineHeight: 1.1, marginTop: '4px' }}>
                  <MotionNumberCounter value={k.value} />
                </div>
              </div>
              <div style={{ width: 42, height: 42, borderRadius: 12, background: k.bg, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <k.icon size={20} color={k.color} />
              </div>
            </div>
            {k.link && <Link to={k.link} style={{ display: 'inline-flex', alignItems: 'center', gap: 4, fontSize: 12, fontWeight: 700, color: 'var(--manila-blue)', textDecoration: 'none', marginTop: 10 }}>Manage <ArrowRight size={13} /></Link>}
          </MotionCard>
        ))}
      </div>

      <SectionHeader icon={<BarChart2 size={18} color="var(--bay-teal)" />} title="Right-Sized Relief Allocation Status" />
      <div className="clay-card" style={{ marginBottom: '28px' }}>
        <Suspense fallback={<ChartSkeleton height={260} />}>
          <LguAdminReliefChart data={reliefData} />
        </Suspense>
      </div>

      <SectionHeader icon={<TrendingUp size={18} color="var(--bay-teal)" />} title="Operational Quick Links" />
      <div className="grid-3 stagger-children">
        <QuickActionCard icon={<MapPin size={22} color="var(--manila-blue)" />} bg="var(--manila-blue-light)" label="Barangay Risk Heatmap" desc="View which barangays have the highest assistance gaps and needs." link="/heatmap" linkLabel="Open Heatmap" btnClass="clay-button-primary" />
        <QuickActionCard icon={<Warehouse size={22} color="#6D28D9" />} bg="#F5F3FF" label="Warehouse Inventory" desc="Monitor live stock levels at central relief storage facilities." link="/warehouse-inventory" linkLabel="Check Inventory" btnClass="clay-button-ghost" />
        <QuickActionCard icon={<Radio size={22} color="#B91C1C" />} bg="#FEF2F2" label="Fraud Interception" desc="Real-time monitoring of duplicate claim attempts across Manila." link="/fraud-interception" linkLabel="View Stream" btnClass="clay-button-danger" />
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// BARANGAY OFFICIAL — Own Barangay Dashboard Only
// ─────────────────────────────────────────────────────────────────────────────
function BarangayDashboard({ token, user }) {
  const [summary, setSummary] = useState(null);
  const [loading, setLoading] = useState(true);
  const barangayCode = user?.barangayCode || '291';

  useEffect(() => {
    const fetch_ = async () => {
      try {
        const res = await fetch(`${API_BASE_URL}/reports/summary?barangayCode=${barangayCode}`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (res.ok) setSummary(await res.json());
      } catch (e) { console.error(e); } finally { setLoading(false); }
    };
    if (token) fetch_();
  }, [token, barangayCode]);

  const kpis = [
    { label: 'Pending Verifications', value: summary?.pendingVerifications ?? 0, icon: UserCheck, color: '#B45309', bg: '#FFFBEB', link: '/verification-queue', linkLabel: 'Open Queue' },
    { label: 'High Priority Households', value: summary?.highPriorityHouseholds ?? 0, icon: AlertTriangle, color: '#B91C1C', bg: '#FEF2F2', link: '/priority-index', linkLabel: 'View Priority' },
    { label: 'Verified Beneficiaries', value: summary?.verifiedHouseholds ?? 0, icon: CheckCircle, color: '#0F6B4E', bg: 'var(--bay-teal-light)', sub: `of ${summary?.totalHouseholds ?? 0} registered` },
    { label: 'Total Household Members', value: summary?.totalMembers ?? 0, icon: Users, color: '#173F56', bg: 'var(--manila-blue-light)' },
  ];

  const recoveryStageData = [
    { name: 'Waiting for Ayuda', value: summary?.waitingAyuda ?? 0, color: '#B91C1C' },
    { name: 'Assistance Received', value: summary?.assistanceReceived ?? 0, color: '#B45309' },
    { name: 'Ongoing Pagbangon', value: summary?.ongoingRecovery ?? 0, color: '#1D4ED8' },
    { name: 'Partially Recovered', value: summary?.partiallyRecovered ?? 0, color: '#6D28D9' },
    { name: 'Fully Recovered', value: summary?.fullyRecovered ?? 0, color: '#0F6B4E' },
  ];

  return (
    <div className="page-container page-animate">
      <WelcomeBanner
        badge={`Barangay ${barangayCode} Operations Center`}
        title={`Magandang araw, Barangay ${barangayCode}!`}
        sub={`Official Operations Panel for Barangay ${barangayCode}, Lungsod ng Maynila.`}
        gradient="linear-gradient(135deg, #090154 0%, #001275 60%, #1E40AF 100%)"
      />

      <div className="grid-4 stagger-children dashboard-kpis" style={{ marginBottom: '32px' }}>
        {kpis.map((k, i) => (
          <MotionCard key={i} delay={i * 0.04} className="clay-card" style={{ borderTop: `3px solid ${k.color}` }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
              <div>
                <span style={{ fontSize: '12px', color: 'var(--ink-soft)', fontWeight: 600 }}>{k.label}</span>
                <div style={{ fontSize: '36px', fontWeight: 800, color: k.color, lineHeight: 1.1, marginTop: '4px' }}>
                  <MotionNumberCounter value={k.value} />
                </div>
              </div>
              <div style={{ width: 42, height: 42, borderRadius: 12, background: k.bg, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <k.icon size={20} color={k.color} />
              </div>
            </div>
            {k.link && <Link to={k.link} style={{ display: 'inline-flex', alignItems: 'center', gap: 4, fontSize: 12, fontWeight: 700, color: 'var(--manila-blue)', textDecoration: 'none', marginTop: 10 }}>{k.linkLabel} <ArrowRight size={13} /></Link>}
            {k.sub && <div style={{ fontSize: 12, color: 'var(--ink-soft)', marginTop: 10 }}>{k.sub}</div>}
          </MotionCard>
        ))}
      </div>

      <div className="grid-2" style={{ gap: 20, marginBottom: 28 }}>
        <div className="clay-card">
          <h2 style={{ fontSize: 16, fontWeight: 800, color: 'var(--ink)', marginBottom: 4 }}>Recovery Stage Breakdown</h2>
          <p style={{ fontSize: 12, color: 'var(--ink-soft)', marginBottom: 16 }}>Barangay {barangayCode} household recovery status distribution</p>
          <div style={{ width: '100%', height: 240 }}>
            <Suspense fallback={<ChartSkeleton height={240} />}>
              <BarangayRecoveryPieChart data={recoveryStageData} />
            </Suspense>
          </div>
        </div>

        <div className="clay-card">
          <h2 style={{ fontSize: 16, fontWeight: 800, color: 'var(--ink)', marginBottom: 14 }}>Barangay Quick Actions</h2>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {[
              { icon: <UserCheck size={16} color="var(--manila-blue)" />, label: 'Verify pending resident accounts', link: '/verification-queue', btnClass: 'clay-button-primary' },
              { icon: <Activity size={16} color="var(--bay-teal)" />, label: 'Update household recovery progress', link: '/recovery-progress', btnClass: 'clay-button-approve' },
              { icon: <Star size={16} color="#D97706" />, label: 'Submit special relief request', link: '/special-request-relief', btnClass: 'clay-button-secondary' },
              { icon: <FileText size={16} color="#7C3AED" />, label: 'View barangay reports', link: '/reports', btnClass: 'clay-button-ghost' },
            ].map((a, i) => (
              <Link key={i} to={a.link} style={{ textDecoration: 'none' }}>
                <div className="clay-card" style={{ padding: '10px 14px', display: 'flex', alignItems: 'center', gap: 10, cursor: 'pointer', background: 'var(--sampaguita)', marginBottom: 0 }}>
                  {a.icon}
                  <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--ink)' }}>{a.label}</span>
                  <ArrowRight size={14} color="var(--ink-soft)" style={{ marginLeft: 'auto' }} />
                </div>
              </Link>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Shared helper components
// ─────────────────────────────────────────────────────────────────────────────
function WelcomeBanner({ badge, title, sub, gradient }) {
  return (
    <div style={{ background: gradient, borderRadius: 'var(--radius-card)', padding: '28px 32px', marginBottom: 28, position: 'relative', overflow: 'hidden', boxShadow: 'var(--shadow-card-hover)' }}>
      <div style={{ position: 'absolute', top: -60, right: -60, width: 220, height: 220, borderRadius: '50%', background: 'rgba(255,255,255,0.05)', pointerEvents: 'none' }} />
      <div style={{ position: 'relative', zIndex: 2 }}>
        <div style={{ display: 'inline-flex', alignItems: 'center', gap: 8, background: 'rgba(255,255,255,0.18)', border: '1px solid rgba(255,255,255,0.3)', padding: '5px 14px', borderRadius: 'var(--radius-pill)', marginBottom: 14 }}>
          <Clock size={13} color="#FFFFFF" />
          <span style={{ fontSize: 12, fontWeight: 700, color: '#FFFFFF' }}>{badge}</span>
        </div>
        <h1 style={{ fontFamily: "'Baloo 2', sans-serif", fontSize: 28, fontWeight: 800, color: '#FFFFFF', marginBottom: 8, lineHeight: 1.2 }}>{title}</h1>
        <p style={{ fontSize: 14, color: '#F1F5F9', maxWidth: 560, lineHeight: 1.6 }}>{sub}</p>
      </div>
    </div>
  );
}

function SectionHeader({ icon, title }) {
  return (
    <div style={{ marginBottom: 16, display: 'flex', alignItems: 'center', gap: 8 }}>
      {icon}
      <h2 style={{ fontSize: 16, fontWeight: 800, color: 'var(--ink)', margin: 0 }}>{title}</h2>
    </div>
  );
}

function QuickActionCard({ icon, bg, label, desc, link, linkLabel, btnClass }) {
  return (
    <div className="clay-card">
      <div style={{ width: 44, height: 44, borderRadius: 12, background: bg, display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: 14 }}>
        {icon}
      </div>
      <h2 style={{ fontSize: 15, fontWeight: 800, color: 'var(--ink)', marginBottom: 6 }}>{label}</h2>
      <p style={{ fontSize: 13, color: 'var(--ink-soft)', lineHeight: 1.6, marginBottom: 14 }}>{desc}</p>
      <Link to={link} className={btnClass} style={{ textDecoration: 'none', fontSize: 13 }}>{linkLabel}</Link>
    </div>
  );
}

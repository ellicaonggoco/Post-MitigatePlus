import React, { useContext, useState, useRef, useEffect, Suspense, lazy } from "react";
import { BrowserRouter, Routes, Route, Navigate, useLocation, Link, useNavigate } from "react-router-dom";
import { Bell, ChevronRight, ChevronLeft, Menu, Settings, CheckCircle, AlertTriangle, UserCheck, Truck, Shield, X } from "lucide-react";
import { AuthProvider, AuthContext } from "./context/AuthContext";
import { LanguageProvider } from "./context/LanguageContext";
import ErrorBoundary from "./components/ErrorBoundary";
import Sidebar from "./components/Sidebar";
import { ROLES } from "./utils/roleUtils";

// Code-Splitting / Lazy Loading for Lightning Fast Initial Load & 95+ Performance Score
const Login = lazy(() => import("./pages/Login"));
const Dashboard = lazy(() => import("./pages/Dashboard"));
const VerificationQueue = lazy(() => import("./pages/VerificationQueue"));
const SmartPriorityDashboard = lazy(() => import("./pages/SmartPriorityDashboard"));
const BarangayHeatmap = lazy(() => import("./pages/BarangayHeatmap"));
const ReliefAllocationPage = lazy(() => import("./pages/ReliefAllocationPage"));
const ProvisionAccounts = lazy(() => import("./pages/ProvisionAccounts"));
const ReportsPage = lazy(() => import("./pages/ReportsPage"));
const DistributionEvents = lazy(() => import("./pages/DistributionEvents"));
const WarehouseInventory = lazy(() => import("./pages/WarehouseInventory"));
const FraudInterception = lazy(() => import("./pages/FraudInterception"));
const RecoveryProgressTracker = lazy(() => import("./pages/RecoveryProgressTracker"));
const SpecialRequestRelief = lazy(() => import("./pages/SpecialRequestRelief"));
const AnnouncementsPage = lazy(() => import("./pages/AnnouncementsPage"));
const GlobalPolicyConfig = lazy(() => import("./pages/GlobalPolicyConfig"));
const AccountSecurityPage = lazy(() => import("./pages/AccountSecurityPage"));
const SystemAuditLogs = lazy(() => import("./pages/SystemAuditLogs"));
const SettingsPage = lazy(() => import("./pages/SettingsPage"));

const PageLoader = () => (
  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '60vh', width: '100%' }}>
    <div style={{ width: 36, height: 36, border: '3px solid #E2E8F0', borderTopColor: '#1557B0', borderRadius: '50%', animation: 'spin 0.8s linear infinite' }} />
  </div>
);

const ProtectedRoute = ({ children }) => {
  const { token } = useContext(AuthContext);
  return token ? children : <Navigate to="/login" replace />;
};

const RoleProtectedRoute = ({ children, allowedRoles }) => {
  const { token, user } = useContext(AuthContext);
  if (!token) return <Navigate to="/login" replace />;
  if (!allowedRoles.includes(user?.role)) return <Navigate to="/" replace />;
  return children;
};

const NOTIF_ICONS = {
  verification: { icon: UserCheck, color: "#2563EB", bg: "#EFF6FF" },
  fraud: { icon: Shield, color: "#DC2626", bg: "#FEF2F2" },
  distribution: { icon: Truck, color: "#158A64", bg: "rgba(21,138,100,0.1)" },
  alert: { icon: AlertTriangle, color: "#D97706", bg: "#FFFBEB" },
  success: { icon: CheckCircle, color: "#158A64", bg: "rgba(21,138,100,0.1)" },
};

const INITIAL_NOTIFS = [
  { id: 1, type: "verification", title: "New Registration Pending", body: "Santos, Maria R. from Brgy 291 submitted household registration.", time: "2 min ago", read: false, link: "/verification-queue" },
  { id: 2, type: "fraud", title: "Fraud Attempt Detected", body: "QR-MNL-00421 was used at 2 distribution points. Auto-blocked.", time: "14 min ago", read: false, link: "/fraud-interception" },
  { id: 3, type: "distribution", title: "Distribution Event Starting", body: "Brgy 292 distribution event begins in 30 minutes. Field Team Bravo assigned.", time: "28 min ago", read: false, link: "/distribution-events" },
  { id: 4, type: "alert", title: "Low Inventory Alert", body: "Water Jugs stock has fallen below the minimum threshold (340 remaining).", time: "1 hr ago", read: true, link: "/warehouse-inventory" },
  { id: 5, type: "success", title: "Relief Allocation Complete", body: "Brgy 293 relief allocation has been processed. 210 households served.", time: "3 hrs ago", read: true, link: "/relief-allocation" },
];

function NotificationPanel({ notifs, setNotifs, onClose }) {
  const unread = notifs.filter(n => !n.read).length;

  const markAllRead = () => {
    const updated = notifs.map(n => ({ ...n, read: true }));
    setNotifs(updated);
  };

  const markRead = (id) => {
    const updated = notifs.map(n => n.id === id ? { ...n, read: true } : n);
    setNotifs(updated);
  };

  const navigate = useNavigate();

  return (
    <div style={{ position: "absolute", top: 48, right: 0, width: 360, background: "var(--card)", border: "1.5px solid var(--border)", borderRadius: "var(--radius-card)", boxShadow: "0 12px 32px rgba(15,23,42,0.18)", zIndex: 9999, overflow: "hidden" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "14px 16px", borderBottom: "1px solid var(--border)" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <span style={{ fontSize: 15, fontWeight: 800, color: "var(--ink)" }}>Notifications</span>
          {unread > 0 && <span style={{ background: "#DC2626", color: "#fff", fontSize: 10, fontWeight: 800, padding: "2px 7px", borderRadius: 999 }}>{unread} new</span>}
        </div>
        <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
          {unread > 0 && <button onClick={markAllRead} style={{ fontSize: 11, fontWeight: 700, color: "var(--manila-blue)", background: "none", border: "none", cursor: "pointer" }}>Mark all read</button>}
          <button onClick={() => onClose && onClose()} style={{ background: "none", border: "none", cursor: "pointer", color: "var(--ink-soft)", display: "flex" }}><X size={16} /></button>
        </div>
      </div>
      <div style={{ maxHeight: 400, overflowY: "auto" }}>
        {notifs.map(n => {
          const cfg = NOTIF_ICONS[n.type] || NOTIF_ICONS.alert;
          const Icon = cfg.icon;
          return (
            <div
              key={n.id}
              onClick={() => {
                markRead(n.id);
                if (onClose) onClose();
                if (n.link) navigate(n.link);
              }}
              style={{ textDecoration: "none", display: "block", cursor: "pointer" }}
            >
              <div style={{ display: "flex", gap: 12, padding: "12px 16px", background: n.read ? "transparent" : "var(--manila-blue-light)", borderBottom: "1px solid var(--border)", transition: "background 0.2s" }}>
                <div style={{ width: 36, height: 36, borderRadius: 10, background: cfg.bg, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0, marginTop: 2 }}>
                  <Icon size={17} color={cfg.color} />
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 8 }}>
                    <span style={{ fontSize: 13, fontWeight: n.read ? 600 : 800, color: "var(--ink)", lineHeight: 1.3 }}>{n.title}</span>
                    {!n.read && <span style={{ width: 8, height: 8, borderRadius: "50%", background: "#DC2626", flexShrink: 0, marginTop: 4 }} />}
                  </div>
                  <p style={{ fontSize: 12, color: "var(--ink-soft)", margin: "3px 0 4px", lineHeight: 1.5 }}>{n.body}</p>
                  <span style={{ fontSize: 11, color: "var(--ink-soft)" }}>{n.time}</span>
                </div>
              </div>
            </div>
          );
        })}
      </div>
      <div style={{ padding: "12px 16px", borderTop: "1px solid var(--border)", textAlign: "center" }}>
        <button
          onClick={() => {
            if (onClose) onClose();
            navigate('/reports');
          }}
          style={{ fontSize: 12, fontWeight: 800, color: "var(--manila-blue)", background: "none", border: "none", cursor: "pointer" }}
        >
          View all activity in Reports
        </button>
      </div>
    </div>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <LanguageProvider>
        <BrowserRouter>
          <ErrorBoundary>
            <Suspense fallback={<PageLoader />}>
              <AppRoutes />
            </Suspense>
          </ErrorBoundary>
        </BrowserRouter>
      </LanguageProvider>
    </AuthProvider>
  );
}

function AppRoutes() {
  const { token } = useContext(AuthContext);
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [notifOpen, setNotifOpen] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const [notifs, setNotifsState] = useState(() => {
    try {
      const saved = localStorage.getItem('mitigateplus_user_notifications');
      return saved ? JSON.parse(saved) : INITIAL_NOTIFS;
    } catch (e) {
      return INITIAL_NOTIFS;
    }
  });

  const setNotifs = (updated) => {
    setNotifsState(updated);
    try {
      localStorage.setItem('mitigateplus_user_notifications', JSON.stringify(updated));
    } catch (e) {
      console.error(e);
    }
  };

  const unreadCount = notifs.filter(n => !n.read).length;

  const notifRef = useRef(null);
  const location = useLocation();

  useEffect(() => {
    if (!notifOpen) return;
    const handler = (e) => { if (notifRef.current && !notifRef.current.contains(e.target)) setNotifOpen(false); };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [notifOpen]);

  useEffect(() => {
    setNotifOpen(false);
    setMobileMenuOpen(false);
  }, [location.pathname]);

  const labels = {
    "/": "Dashboard",
    "/verification-queue": "Verification Queue",
    "/priority-index": "Recovery Priority Index",
    "/heatmap": "Barangay Risk Heatmap",
    "/relief-allocation": "Relief Operations",
    "/provision-accounts": "Account Management",
    "/reports": "Reports & Audit",
    "/distribution-events": "Distribution Events",
    "/warehouse-inventory": "Warehouse Inventory",
    "/fraud-interception": "Fraud Interception",
    "/recovery-progress": "Recovery Progress Tracker",
    "/special-request-relief": "Special Request Relief",
    "/announcements": "Announcements",
    "/global-policy": "Global Policy Configuration",
    "/system-audit-logs": "System Audit Logs",
    "/account-security": "Account Security & Provisioning",
    "/settings": "Settings",
  };

  return (
    <div className="app-shell">
      {token && (
        <button
          onClick={() => setIsCollapsed(!isCollapsed)}
          aria-label={isCollapsed ? 'Expand sidebar' : 'Minimize sidebar'}
          title={isCollapsed ? 'Expand sidebar' : 'Minimize sidebar'}
          className="sidebar-collapse-btn desktop-only"
          style={{
            position: 'fixed',
            left: isCollapsed ? '72px' : '256px',
            top: '28px',
            transform: 'translate(-50%, -50%)',
            zIndex: 9999999,
            width: '28px',
            height: '28px',
            borderRadius: '50%',
            background: 'var(--card)',
            border: '1.5px solid var(--border)',
            color: 'var(--manila-blue)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            cursor: 'pointer',
            boxShadow: '0 2px 12px rgba(15,23,42,0.3)',
            transition: 'left 0.25s cubic-bezier(0.2, 0, 0, 1)',
          }}
        >
          {isCollapsed ? <ChevronRight size={14} /> : <ChevronLeft size={14} />}
        </button>
      )}

      {/* Desktop Sidebar */}
      {token && <Sidebar isCollapsed={isCollapsed} setIsCollapsed={setIsCollapsed} />}

      {/* Mobile Drawer Navigation */}
      {token && mobileMenuOpen && (
        <div
          className="mobile-drawer-overlay"
          onClick={() => setMobileMenuOpen(false)}
          style={{
            position: 'fixed',
            inset: 0,
            backgroundColor: 'rgba(15, 23, 42, 0.75)',
            backdropFilter: 'blur(4px)',
            zIndex: 999999,
            display: 'flex',
          }}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            style={{
              width: '280px',
              maxWidth: '85vw',
              height: '100%',
              backgroundColor: 'var(--card)',
              boxShadow: '4px 0 24px rgba(0,0,0,0.3)',
              display: 'flex',
              flexDirection: 'column',
              position: 'relative',
              overflowY: 'auto',
            }}
          >
            <button
              onClick={() => setMobileMenuOpen(false)}
              aria-label="Close navigation"
              style={{
                position: 'absolute',
                top: 16,
                right: 16,
                zIndex: 10,
                background: '#F1F5F9',
                border: 'none',
                borderRadius: '50%',
                width: 32,
                height: 32,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                cursor: 'pointer',
              }}
            >
              <X size={16} color="var(--ink)" />
            </button>
            <Sidebar isCollapsed={false} setIsCollapsed={() => {}} />
          </div>
        </div>
      )}

      <main className={token ? "app-main" : "app-main app-main--public"}>
        {token && <header className="app-topbar">
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <button
              className="mobile-menu-btn"
              onClick={() => setMobileMenuOpen(true)}
              aria-label="Open menu"
              title="Open Navigation"
            >
              <Menu size={20} />
            </button>
            <div className="app-crumbs">
              <span>MitigatePlus</span><ChevronRight size={14} /><strong>{labels[location.pathname] || "MitigatePlus"}</strong>
            </div>
          </div>
          <div className="app-topbar-actions">
            <div ref={notifRef} style={{ position: "relative" }}>
              <button className="app-notification" aria-label="Notifications" onClick={() => setNotifOpen(p => !p)} style={{ position: "relative" }}>
                <Bell size={18} />
                {unreadCount > 0 && (
                  <span style={{ position: "absolute", top: -4, right: -4, width: 16, height: 16, background: "#DC2626", color: "#fff", borderRadius: "50%", fontSize: 9, fontWeight: 900, display: "flex", alignItems: "center", justifyContent: "center", border: "2px solid var(--card)", lineHeight: 1 }}>{unreadCount}</span>
                )}
              </button>
              {notifOpen && <NotificationPanel notifs={notifs} setNotifs={setNotifs} onClose={() => setNotifOpen(false)} />}
            </div>
            <Link to="/settings" className="app-notification" aria-label="Settings" title="Settings" style={{ textDecoration: "none", color: "inherit" }}><Settings size={18} /></Link>
          </div>
        </header>}
        <Suspense fallback={<PageLoader />}>
          <Routes>
            <Route path="/login" element={<Login />} />
            <Route path="/" element={<ProtectedRoute><Dashboard /></ProtectedRoute>} />
            <Route path="/verification-queue" element={<ProtectedRoute><VerificationQueue /></ProtectedRoute>} />
            <Route path="/priority-index" element={<ProtectedRoute><SmartPriorityDashboard /></ProtectedRoute>} />
            <Route path="/reports" element={<ProtectedRoute><ReportsPage /></ProtectedRoute>} />
            <Route path="/heatmap" element={<RoleProtectedRoute allowedRoles={[ROLES.LGU_SUPERADMIN, ROLES.LGU_ADMIN]}><BarangayHeatmap /></RoleProtectedRoute>} />
            <Route path="/relief-allocation" element={<RoleProtectedRoute allowedRoles={[ROLES.LGU_SUPERADMIN, ROLES.LGU_ADMIN]}><ReliefAllocationPage /></RoleProtectedRoute>} />
            <Route path="/distribution-events" element={<RoleProtectedRoute allowedRoles={[ROLES.LGU_SUPERADMIN, ROLES.LGU_ADMIN]}><DistributionEvents /></RoleProtectedRoute>} />
            <Route path="/warehouse-inventory" element={<RoleProtectedRoute allowedRoles={[ROLES.LGU_SUPERADMIN, ROLES.LGU_ADMIN]}><WarehouseInventory /></RoleProtectedRoute>} />
            <Route path="/fraud-interception" element={<RoleProtectedRoute allowedRoles={[ROLES.LGU_SUPERADMIN, ROLES.LGU_ADMIN]}><FraudInterception /></RoleProtectedRoute>} />
            <Route path="/special-request-relief" element={<RoleProtectedRoute allowedRoles={[ROLES.LGU_SUPERADMIN, ROLES.LGU_ADMIN, ROLES.BARANGAY_OFFICIAL]}><SpecialRequestRelief /></RoleProtectedRoute>} />
            <Route path="/announcements" element={<RoleProtectedRoute allowedRoles={[ROLES.LGU_SUPERADMIN, ROLES.LGU_ADMIN, ROLES.BARANGAY_OFFICIAL]}><AnnouncementsPage /></RoleProtectedRoute>} />
            <Route path="/recovery-progress" element={<RoleProtectedRoute allowedRoles={[ROLES.LGU_SUPERADMIN, ROLES.LGU_ADMIN, ROLES.BARANGAY_OFFICIAL]}><RecoveryProgressTracker /></RoleProtectedRoute>} />
            <Route path="/provision-accounts" element={<RoleProtectedRoute allowedRoles={[ROLES.LGU_SUPERADMIN, ROLES.LGU_ADMIN]}><ProvisionAccounts /></RoleProtectedRoute>} />
            <Route path="/settings" element={<ProtectedRoute><SettingsPage /></ProtectedRoute>} />
            <Route path="/global-policy" element={<RoleProtectedRoute allowedRoles={[ROLES.LGU_SUPERADMIN]}><GlobalPolicyConfig /></RoleProtectedRoute>} />
            <Route path="/system-audit-logs" element={<RoleProtectedRoute allowedRoles={[ROLES.LGU_SUPERADMIN, ROLES.LGU_ADMIN]}><SystemAuditLogs /></RoleProtectedRoute>} />
            <Route path="/account-security" element={<RoleProtectedRoute allowedRoles={[ROLES.LGU_SUPERADMIN, ROLES.LGU_ADMIN]}><AccountSecurityPage /></RoleProtectedRoute>} />
          </Routes>
        </Suspense>
      </main>
    </div>
  );
}
import React, { useContext, useState, useRef, useEffect, Suspense, lazy } from "react";
import { BrowserRouter, Routes, Route, Navigate, useLocation, Link, useNavigate } from "react-router-dom";
import { Bell, ChevronRight, ChevronLeft, Menu, Settings, CheckCircle, AlertTriangle, UserCheck, Truck, Shield, X } from "lucide-react";
import logoFull from "./assets/logo-full.png";

import { AuthProvider, AuthContext } from "./context/AuthContext";
import { LanguageProvider } from "./context/LanguageContext";
import ErrorBoundary from "./components/ErrorBoundary";
import Sidebar from "./components/Sidebar";
import Footer from "./components/Footer";
import SystemInfoModal from "./components/SystemInfoModal";
import io from "socket.io-client";
import { API_BASE_URL, SOCKET_URL } from "./config";
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
const LivelihoodAssistance = lazy(() => import("./pages/LivelihoodAssistance"));
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
  directive: { icon: Bell, color: "#D97706", bg: "#FFFBEB" },
  alert: { icon: AlertTriangle, color: "#D97706", bg: "#FFFBEB" },
  success: { icon: CheckCircle, color: "#158A64", bg: "rgba(21,138,100,0.1)" },
};

const INITIAL_NOTIFS = [
  { id: 1, type: "success", title: "MitigatePlus System Ready", body: "All systems are operational. Dashboard, verification queue, and relief operations are live.", time: "Just now", read: false, link: "/" },
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
  const [systemInfoOpen, setSystemInfoOpen] = useState(false);

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

  const [toastDirective, setToastDirective] = useState(null);
  const [toastIncident, setToastIncident] = useState(null);

  useEffect(() => {
    const handleNotifUpdate = () => {
      try {
        const saved = localStorage.getItem('mitigateplus_user_notifications');
        if (saved) setNotifsState(JSON.parse(saved));
      } catch (e) {}
    };
    window.addEventListener('storage', handleNotifUpdate);
    window.addEventListener('mitigateplus_notif_update', handleNotifUpdate);
    return () => {
      window.removeEventListener('storage', handleNotifUpdate);
      window.removeEventListener('mitigateplus_notif_update', handleNotifUpdate);
    };
  }, []);

  // Real-Time Socket.IO & Audit Log Sync for Cross-Device Executive Directives & Field Incidents
  useEffect(() => {
    if (!token) return;

    const socket = io(SOCKET_URL, { transports: ['websocket', 'polling'] });
    socket.emit('join_admin_room');

    socket.on('executive_directive', (data) => {
      const bCode = data.barangayCode || data.barangay || '291';
      const incomingNotif = {
        id: Date.now(),
        type: "directive",
        title: "Executive Directive: Deploy Relief",
        body: `City Mayor / SuperAdmin has dispatched LGU Disaster Operations to deploy relief in Barangay ${bCode}. ${data.notes || ''}`.trim(),
        time: "Just now",
        read: false,
        link: `/distribution-events?barangay=${bCode}`,
      };

      setNotifsState(prev => {
        const filtered = prev.filter(n => n.title !== incomingNotif.title || n.body !== incomingNotif.body);
        const updated = [incomingNotif, ...filtered];
        try {
          localStorage.setItem('mitigateplus_user_notifications', JSON.stringify(updated));
        } catch (e) {}
        return updated;
      });

      setToastDirective({
        isOpen: true,
        barangay: bCode,
        notes: data.notes || '',
        issuedBy: data.issuedBy || 'City Mayor / SuperAdmin',
      });
    });

    // Real-Time Field Incident Reports from Mobile Field Staff
    socket.on('new_field_incident', (data) => {
      const bCode = data.barangayCode || '291';
      const incType = data.incidentType || 'Field Incident';
      const reporter = data.reportedByName || 'Field Staff';
      const incomingNotif = {
        id: `inc-${data._id || Date.now()}`,
        type: "alert",
        title: `Field Incident: ${incType}`,
        body: `Brgy ${bCode} (${reporter}): ${data.notes || ''}`.trim(),
        time: "Just now",
        read: false,
        link: `/reports?tab=incidents`,
      };

      setNotifsState(prev => {
        const filtered = prev.filter(n => String(n.id) !== String(incomingNotif.id));
        const updated = [incomingNotif, ...filtered];
        try {
          localStorage.setItem('mitigateplus_user_notifications', JSON.stringify(updated));
        } catch (e) {}
        return updated;
      });

      setToastIncident({
        isOpen: true,
        incidentType: incType,
        barangay: bCode,
        notes: data.notes || '',
        reportedBy: reporter,
        time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      });
    });

    // Also sync past directives from database audit logs
    fetch(`${API_BASE_URL}/audit-logs?action=EXECUTIVE_RELIEF_DIRECTIVE&limit=5`, {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then(res => res.json())
      .then(data => {
        if (data && Array.isArray(data.logs) && data.logs.length > 0) {
          const fetchedNotifs = data.logs.map(log => ({
            id: String(log._id),
            type: "directive",
            title: "Executive Directive: Deploy Relief",
            body: log.notes || `Disaster Operations dispatched for Barangay ${log.targetId}`,
            time: new Date(log.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
            read: false,
            link: `/distribution-events?barangay=${log.targetId}`,
          }));

          setNotifsState(prev => {
            const existingIds = new Set(prev.map(p => String(p.id)));
            const newOnes = fetchedNotifs.filter(f => !existingIds.has(f.id));
            if (newOnes.length > 0) {
              const merged = [...newOnes, ...prev];
              try {
                localStorage.setItem('mitigateplus_user_notifications', JSON.stringify(merged));
              } catch (e) {}
              return merged;
            }
            return prev;
          });
        }
      })
      .catch(() => {});

    // Sync past open incident reports for notification feed
    fetch(`${API_BASE_URL}/incidents?status=open&limit=5`, {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then(res => res.json())
      .then(data => {
        if (Array.isArray(data) && data.length > 0) {
          const fetchedIncidents = data.map(inc => ({
            id: `inc-${inc._id}`,
            type: "alert",
            title: `Field Incident: ${inc.incidentType}`,
            body: `Brgy ${inc.barangayCode} (${inc.reportedBy?.name || 'Field Staff'}): ${inc.notes || ''}`.trim(),
            time: new Date(inc.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
            read: false,
            link: `/reports?tab=incidents`,
          }));

          setNotifsState(prev => {
            const existingIds = new Set(prev.map(p => String(p.id)));
            const newOnes = fetchedIncidents.filter(f => !existingIds.has(f.id));
            if (newOnes.length > 0) {
              const merged = [...newOnes, ...prev];
              try {
                localStorage.setItem('mitigateplus_user_notifications', JSON.stringify(merged));
              } catch (e) {}
              return merged;
            }
            return prev;
          });
        }
      })
      .catch(() => {});

    return () => socket.disconnect();
  }, [token]);

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
    "/special-request-relief": "Special Relief Requests",
    "/livelihood-assistance": "Livelihood Assistance (Cash-for-Work)",
    "/announcements": "Announcements",
    "/global-policy": "Global Policy Configuration",
    "/system-audit-logs": "System Audit Logs",
    "/account-security": "Account Security & Provisioning",
    "/settings": "Settings",
  };

  const isLoginPage = location.pathname === '/login';
  const isAuthLayout = Boolean(token && !isLoginPage);

  return (
    <div className="app-layout" style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', width: '100%' }}>

      {/* ── REAL-TIME EXECUTIVE DIRECTIVE FLOATING ALERT ── */}
      {toastDirective && (
        <div style={{
          position: 'fixed',
          top: 20,
          right: 20,
          zIndex: 10000,
          maxWidth: 420,
          background: '#FFFBEB',
          border: '2px solid #F59E0B',
          borderRadius: 12,
          padding: '14px 18px',
          boxShadow: '0 10px 25px rgba(217, 119, 6, 0.25)',
          display: 'flex',
          flexDirection: 'column',
          gap: 8,
        }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, color: '#B45309', fontWeight: 800, fontSize: 13.5 }}>
              <Bell size={18} color="#D97706" />
              <span>EXECUTIVE RELIEF DIRECTIVE</span>
            </div>
            <button
              onClick={() => setToastDirective(null)}
              style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#B45309' }}
            >
              <X size={16} />
            </button>
          </div>
          <p style={{ margin: 0, fontSize: 12.5, color: '#78350F', lineHeight: 1.4 }}>
            Nag-isyu ang City Mayor / SuperAdmin ng agarang relief deployment directive para sa <strong>Barangay {toastDirective.barangay}</strong>.
          </p>
          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8, marginTop: 4 }}>
            <Link
              to={`/distribution-events?barangay=${toastDirective.barangay}`}
              onClick={() => setToastDirective(null)}
              style={{
                fontSize: 12,
                fontWeight: 800,
                background: '#D97706',
                color: '#FFFFFF',
                padding: '6px 14px',
                borderRadius: 8,
                textDecoration: 'none',
                display: 'inline-flex',
                alignItems: 'center',
                gap: 5,
              }}
            >
              Buksan ang Event Creation →
            </Link>
          </div>
        </div>
      )}

      {/* ── REAL-TIME FIELD INCIDENT FLOATING ALERT ── */}
      {toastIncident && (
        <div style={{
          position: 'fixed',
          top: toastDirective ? 140 : 20,
          right: 20,
          zIndex: 10001,
          maxWidth: 420,
          background: '#FEF2F2',
          border: '2px solid #EF4444',
          borderRadius: 12,
          padding: '14px 18px',
          boxShadow: '0 10px 25px rgba(220, 38, 38, 0.25)',
          display: 'flex',
          flexDirection: 'column',
          gap: 8,
        }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, color: '#B91C1C', fontWeight: 800, fontSize: 13.5 }}>
              <AlertTriangle size={18} color="#DC2626" />
              <span>FIELD INCIDENT REPORTED</span>
            </div>
            <button
              onClick={() => setToastIncident(null)}
              style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#B91C1C' }}
            >
              <X size={16} />
            </button>
          </div>
          <div style={{ fontSize: 13, fontWeight: 700, color: '#991B1B' }}>
            {toastIncident.incidentType} · Barangay {toastIncident.barangay}
          </div>
          <p style={{ margin: 0, fontSize: 12.5, color: '#7F1D1D', lineHeight: 1.4 }}>
            {toastIncident.notes}
          </p>
          <div style={{ fontSize: 11, color: '#991B1B', opacity: 0.85 }}>
            Reported by: <strong>{toastIncident.reportedBy}</strong> · {toastIncident.time}
          </div>
          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8, marginTop: 4 }}>
            <Link
              to="/reports?tab=incidents"
              onClick={() => setToastIncident(null)}
              style={{
                fontSize: 12,
                fontWeight: 800,
                background: '#DC2626',
                color: '#FFFFFF',
                padding: '6px 14px',
                borderRadius: 8,
                textDecoration: 'none',
                display: 'inline-flex',
                alignItems: 'center',
                gap: 5,
              }}
            >
              Tingnan sa Incident Directory →
            </Link>
          </div>
        </div>
      )}

      {/* ── FULL-WIDTH TOPBAR  -  spans above sidebar AND main content ── */}
      {isAuthLayout && (
        <header className="app-topbar">
          {/* Left: mobile menu + logo */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
            <button
              className="mobile-menu-btn"
              onClick={() => setMobileMenuOpen(true)}
              aria-label="Open menu"
              title="Open Navigation"
              style={{
                color: '#1C3F94',
                borderColor: '#D2DFEE',
                background: '#FFFFFF',
              }}
            >
              <Menu size={20} color="#1C3F94" />
            </button>
            <img
              src={logoFull}
              alt="MitigatePlus"
              style={{ height: 38, width: 'auto', maxWidth: 170, objectFit: 'contain', mixBlendMode: 'multiply' }}
            />
          </div>

          {/* Right: notification + settings */}
          <div className="app-topbar-actions" style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <div ref={notifRef} style={{ position: "relative" }}>
              <button
                className="app-notification"
                aria-label="Notifications"
                title="Notifications"
                onClick={() => setNotifOpen(p => !p)}
                style={{
                  position: "relative",
                  width: '38px',
                  height: '38px',
                  borderRadius: '10px',
                  background: '#FFFFFF',
                  border: '1.5px solid #D2DFEE',
                  color: '#1C3F94',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  cursor: 'pointer',
                  boxShadow: '0 2px 6px rgba(28, 63, 148, 0.08)',
                  transition: 'all 0.15s ease',
                }}
              >
                <Bell size={18} color="#1C3F94" />
                {unreadCount > 0 && (
                  <span style={{ position: "absolute", top: -4, right: -4, width: 16, height: 16, background: "#DC2626", color: "#fff", borderRadius: "50%", fontSize: 9, fontWeight: 900, display: "flex", alignItems: "center", justifyContent: "center", border: "2px solid #FFFFFF", lineHeight: 1 }}>{unreadCount}</span>
                )}
              </button>
              {notifOpen && <NotificationPanel notifs={notifs} setNotifs={setNotifs} onClose={() => setNotifOpen(false)} />}
            </div>
            <Link
              to="/settings"
              className="app-notification"
              aria-label="Settings"
              title="Settings"
              style={{
                textDecoration: "none",
                width: '38px',
                height: '38px',
                borderRadius: '10px',
                background: '#FFFFFF',
                border: '1.5px solid #D2DFEE',
                color: '#1C3F94',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                boxShadow: '0 2px 6px rgba(28, 63, 148, 0.08)',
                transition: 'all 0.15s ease',
              }}
            >
              <Settings size={18} color="#1C3F94" />
            </Link>
          </div>
        </header>
      )}

      {/* ── SHELL: sidebar + main content (below the full-width topbar) ── */}
      <div className="app-shell" style={{ flex: 1, display: 'flex', minHeight: 0, paddingTop: 0 }}>
        {isAuthLayout && (
          <button
            onClick={() => setIsCollapsed(!isCollapsed)}
            aria-label={isCollapsed ? 'Expand sidebar' : 'Minimize sidebar'}
            title={isCollapsed ? 'Expand sidebar' : 'Minimize sidebar'}
            className="sidebar-collapse-btn desktop-only"
            style={{
              position: 'fixed',
              left: isCollapsed ? '72px' : '256px',
              top: '84px',
              transform: 'translate(-50%, -50%)',
              zIndex: 9999999,
              width: '28px',
              height: '28px',
              borderRadius: '50%',
              background: '#FFFFFF',
              border: '1.5px solid #D6DEFA',
              color: '#1C3F94',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              cursor: 'pointer',
              boxShadow: '0 2px 8px rgba(28, 63, 148, 0.15)',
              transition: 'left 0.25s cubic-bezier(0.2, 0, 0, 1)',
            }}
          >
            {isCollapsed ? <ChevronRight size={14} /> : <ChevronLeft size={14} />}
          </button>
        )}

        {/* Desktop Sidebar */}
        {isAuthLayout && <Sidebar isCollapsed={isCollapsed} setIsCollapsed={setIsCollapsed} />}

        {/* Mobile Drawer Navigation */}
        {isAuthLayout && mobileMenuOpen && (
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

        <main className={isAuthLayout ? "app-main" : "app-main app-main--public"}>
          <Suspense fallback={<PageLoader />}>
            <Routes>
              <Route path="/login" element={token ? <Navigate to="/" replace /> : <Login />} />
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
              <Route path="/livelihood-assistance" element={<RoleProtectedRoute allowedRoles={[ROLES.LGU_SUPERADMIN, ROLES.LGU_ADMIN, ROLES.BARANGAY_OFFICIAL]}><LivelihoodAssistance /></RoleProtectedRoute>} />
              <Route path="/announcements" element={<RoleProtectedRoute allowedRoles={[ROLES.LGU_SUPERADMIN, ROLES.LGU_ADMIN, ROLES.BARANGAY_OFFICIAL]}><AnnouncementsPage /></RoleProtectedRoute>} />
              <Route path="/recovery-progress" element={<RoleProtectedRoute allowedRoles={[ROLES.LGU_SUPERADMIN, ROLES.LGU_ADMIN, ROLES.BARANGAY_OFFICIAL]}><RecoveryProgressTracker /></RoleProtectedRoute>} />
              <Route path="/provision-accounts" element={<RoleProtectedRoute allowedRoles={[ROLES.LGU_SUPERADMIN, ROLES.LGU_ADMIN]}><ProvisionAccounts /></RoleProtectedRoute>} />
              <Route path="/settings" element={<ProtectedRoute><SettingsPage /></ProtectedRoute>} />
              <Route path="/global-policy" element={<RoleProtectedRoute allowedRoles={[ROLES.LGU_SUPERADMIN]}><GlobalPolicyConfig /></RoleProtectedRoute>} />
              <Route path="/system-audit-logs" element={<RoleProtectedRoute allowedRoles={[ROLES.LGU_SUPERADMIN, ROLES.LGU_ADMIN]}><SystemAuditLogs /></RoleProtectedRoute>} />
              <Route path="/account-security" element={<RoleProtectedRoute allowedRoles={[ROLES.LGU_SUPERADMIN, ROLES.LGU_ADMIN]}><AccountSecurityPage /></RoleProtectedRoute>} />
              <Route path="*" element={<Navigate to="/" replace />} />
            </Routes>
          </Suspense>
        </main>
      </div>

      {/* Global Institutional & Developer Footer  -  FULL WIDTH (across sidebar & main content) */}
      {isAuthLayout && <Footer />}

      {/* Interactive System & Developer Details Modal */}
      <SystemInfoModal isOpen={systemInfoOpen} onClose={() => setSystemInfoOpen(false)} />
    </div>
  );
}
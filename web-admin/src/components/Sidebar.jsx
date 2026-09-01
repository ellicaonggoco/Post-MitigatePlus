import React, { useContext, useState, useEffect } from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import { AuthContext } from '../context/AuthContext';
import { LanguageContext } from '../context/LanguageContext';
import { ROLES, getRoleLabel } from '../utils/roleUtils';
import { LogOut, ChevronLeft, ChevronRight, Crown } from 'lucide-react';

export function IconlyDashboard({ size = 20, color = 'currentColor' }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path d="M9.15722 20.7714V17.7047C9.15722 16.9247 9.79222 16.2907 10.5722 16.2907H13.4322C14.2122 16.2907 14.8472 16.9247 14.8472 17.7047V20.7714C14.8472 21.4487 15.3962 21.9987 16.0732 21.9987H18.2632C20.1412 21.9987 21.6632 20.4767 21.6632 18.5987V10.9157C21.6632 10.0827 21.2822 9.2947 20.6302 8.7777L14.3632 3.8057C12.9832 2.7107 11.0232 2.7107 9.64322 3.8057L3.37622 8.7777C2.72422 9.2947 2.34322 10.0827 2.34322 10.9157V18.5987C2.34322 20.4767 3.86522 21.9987 5.74322 21.9987H7.93322C8.61022 21.9987 9.15722 21.4487 9.15722 20.7714Z" stroke={color} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/>
    </svg>
  );
}

export function IconlyVerification({ size = 20, color = 'currentColor' }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
      <circle cx="12" cy="7" r="4.5" stroke={color} strokeWidth="1.8"/>
      <path d="M4 21C4 16.58 7.58 13 12 13C16.42 13 20 16.58 20 21" stroke={color} strokeWidth="1.8" strokeLinecap="round"/>
      <path d="M16 11L18 13L22 9" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
    </svg>
  );
}

export function IconlyShield({ size = 20, color = 'currentColor' }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path d="M12 2.5L19.5 6V11.5C19.5 16.5 16.2 20.8 12 22C7.8 20.8 4.5 16.5 4.5 11.5V6L12 2.5Z" stroke={color} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/>
    </svg>
  );
}

export function IconlyPackage({ size = 20, color = 'currentColor' }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path d="M3.17004 7.44006L12 2.37006L20.83 7.44006V16.5601L12 21.6301L3.17004 16.5601V7.44006Z" stroke={color} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/>
      <path d="M12 2.37006V12.0001" stroke={color} strokeWidth="1.8" strokeLinecap="round"/>
      <path d="M12 12.0001L20.83 7.44006" stroke={color} strokeWidth="1.8" strokeLinecap="round"/>
      <path d="M12 12.0001L3.17004 7.44006" stroke={color} strokeWidth="1.8" strokeLinecap="round"/>
    </svg>
  );
}

export function IconlyMapPin({ size = 20, color = 'currentColor' }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path d="M12 21C12 21 19 14.5 19 9.5C19 5.63 15.87 2.5 12 2.5C8.13 2.5 5 5.63 5 9.5C5 14.5 12 21 12 21Z" stroke={color} strokeWidth="1.8" strokeLinejoin="round"/>
      <circle cx="12" cy="9.5" r="2.5" stroke={color} strokeWidth="1.8"/>
    </svg>
  );
}

export function IconlyUserPlus({ size = 20, color = 'currentColor' }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
      <circle cx="9" cy="7" r="4.5" stroke={color} strokeWidth="1.8"/>
      <path d="M2 21C2 16.58 5.58 13 10 13C12.3 13 14.36 13.97 15.8 15.5" stroke={color} strokeWidth="1.8" strokeLinecap="round"/>
      <path d="M19 8V14M16 11H22" stroke={color} strokeWidth="1.8" strokeLinecap="round"/>
    </svg>
  );
}

export function IconlyFileText({ size = 20, color = 'currentColor' }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path d="M14 2H6C4.9 2 4 2.9 4 4V20C4 21.1 4.9 22 6 22H18C19.1 22 20 21.1 20 20V8L14 2Z" stroke={color} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/>
      <path d="M14 2V8H20" stroke={color} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/>
      <path d="M8 13H16M8 17H13" stroke={color} strokeWidth="1.8" strokeLinecap="round"/>
    </svg>
  );
}
import logoFull from '../assets/logo-full.png';
import logoMinimized from '../assets/logo-minimized.png';

// Iconly-style SVG icons for new modules
function IconlyWarehouse({ size = 20, color = 'currentColor' }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path d="M3 21V10L12 3L21 10V21" stroke={color} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/>
      <path d="M9 21V15H15V21" stroke={color} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/>
      <path d="M9 9H10M14 9H15" stroke={color} strokeWidth="2" strokeLinecap="round"/>
    </svg>
  );
}

function IconlyTruck({ size = 20, color = 'currentColor' }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path d="M1 3H15V16H1V3Z" stroke={color} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/>
      <path d="M15 8H19L23 12V16H15V8Z" stroke={color} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/>
      <circle cx="5.5" cy="18.5" r="2.5" stroke={color} strokeWidth="1.8"/>
      <circle cx="18.5" cy="18.5" r="2.5" stroke={color} strokeWidth="1.8"/>
    </svg>
  );
}

function IconlyFraud({ size = 20, color = 'currentColor' }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path d="M12 2.5L19.5 6V11.5C19.5 16.5 16.2 20.8 12 22C7.8 20.8 4.5 16.5 4.5 11.5V6L12 2.5Z" stroke={color} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/>
      <path d="M9 12L11 14L15 10" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
      <line x1="15" y1="9" x2="9" y2="15" stroke={color} strokeWidth="1.8" strokeLinecap="round"/>
    </svg>
  );
}

function IconlyProgress({ size = 20, color = 'currentColor' }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path d="M12 22C17.52 22 22 17.52 22 12C22 6.48 17.52 2 12 2C6.48 2 2 6.48 2 12C2 17.52 6.48 22 12 22Z" stroke={color} strokeWidth="1.8"/>
      <path d="M8 12L10.5 14.5L16 9" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
    </svg>
  );
}

function IconlySpecial({ size = 20, color = 'currentColor' }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path d="M12 2L15.09 8.26L22 9.27L17 14.14L18.18 21.02L12 17.77L5.82 21.02L7 14.14L2 9.27L8.91 8.26L12 2Z" stroke={color} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/>
    </svg>
  );
}

function IconlyBriefcase({ size = 20, color = 'currentColor' }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
      <rect x="2" y="7" width="20" height="14" rx="2" stroke={color} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/>
      <path d="M16 7V5C16 3.89543 15.1046 3 14 3H10C8.89543 3 8 3.89543 8 5V7" stroke={color} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/>
      <path d="M12 12V12.01" stroke={color} strokeWidth="2.2" strokeLinecap="round"/>
      <path d="M2 13H22" stroke={color} strokeWidth="1.8" strokeLinecap="round"/>
    </svg>
  );
}

function IconlyAnnounce({ size = 20, color = 'currentColor' }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path d="M22 3L2 10L9 13L12 22L15 15L22 3Z" stroke={color} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/>
    </svg>
  );
}

function IconlyPolicy({ size = 20, color = 'currentColor' }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
      <circle cx="12" cy="12" r="3" stroke={color} strokeWidth="1.8"/>
      <path d="M12 2V4M12 20V22M4.22 4.22L5.64 5.64M18.36 18.36L19.78 19.78M2 12H4M20 12H22M4.22 19.78L5.64 18.36M18.36 5.64L19.78 4.22" stroke={color} strokeWidth="1.8" strokeLinecap="round"/>
    </svg>
  );
}

function IconlyLock({ size = 20, color = 'currentColor' }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
      <rect x="3" y="11" width="18" height="11" rx="2" stroke={color} strokeWidth="1.8"/>
      <path d="M7 11V7C7 4.24 9.24 2 12 2C14.76 2 17 4.24 17 7V11" stroke={color} strokeWidth="1.8" strokeLinecap="round"/>
      <circle cx="12" cy="16" r="1.5" fill={color}/>
    </svg>
  );
}

export default function Sidebar({ isCollapsed, setIsCollapsed }) {
  const { user, logout } = useContext(AuthContext);
  const { t } = useContext(LanguageContext);
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const role = user?.role;
  const isSuperAdmin = role === ROLES.LGU_SUPERADMIN || role === 'lgu_super_admin';
  const isLguAdmin = role === ROLES.LGU_ADMIN;

  // Build nav groups dynamically based on role & language context
  const navGroups = [];

  // ── MAIN MENU
  const mainItems = [{ label: t.dashboard || 'Dashboard', path: '/', icon: IconlyDashboard }];

  if (role === ROLES.BARANGAY_OFFICIAL) {
    mainItems.push({ label: t.verificationQueue || 'Verification Queue', path: '/verification-queue', icon: IconlyVerification });
  }
  if (role === ROLES.BARANGAY_OFFICIAL || isLguAdmin || isSuperAdmin) {
    mainItems.push({ label: t.priorityIndex || 'Priority Index', path: '/priority-index', icon: IconlyShield });
  }
  navGroups.push({ title: t.mainMenu || 'MAIN MENU', items: mainItems });

  // ── LGU SUPERADMIN - Executive Tools
  if (isSuperAdmin) {
    navGroups.push({
      title: t.execTools || 'EXECUTIVE TOOLS',
      items: [
        { label: t.heatmap || 'Barangay Heatmap', path: '/heatmap', icon: IconlyMapPin },
        { label: t.reliefAllocation || 'Relief Allocation Engine', path: '/relief-allocation', icon: IconlyPackage },
        { label: t.reports || 'Reports & Audit', path: '/reports', icon: IconlyFileText },
        { label: t.provisionAccounts || 'Account Management', path: '/provision-accounts', icon: IconlyUserPlus },
        { label: t.globalPolicy || 'Global Policy Config', path: '/global-policy', icon: IconlyPolicy },
        { label: 'System Audit Logs', path: '/system-audit-logs', icon: IconlyLock },
      ],
    });
  }

  // -- LGU ADMIN - City Operations
  if (isLguAdmin) {
    navGroups.push({
      title: t.cityOps || 'CITY OPERATIONS',
      items: [
        { label: t.heatmap || 'Barangay Heatmap', path: '/heatmap', icon: IconlyMapPin },
        { label: t.distributionEvents || 'Distribution / Announcement', path: '/distribution-events', icon: IconlyTruck },
        { label: t.specialRelief || 'Special Relief Requests', path: '/special-request-relief', icon: IconlySpecial },
        { label: t.warehouseInventory || 'Warehouse Inventory', path: '/warehouse-inventory', icon: IconlyWarehouse },
        { label: t.livelihoodAssistance || 'Livelihood Assistance', path: '/livelihood-assistance', icon: IconlyBriefcase },
        { label: t.reports || 'Reports & Audit', path: '/reports', icon: IconlyFileText },
        { label: 'Manage Accounts', path: '/provision-accounts', icon: IconlyUserPlus },
      ],
    });
  }

  // -- BARANGAY OFFICIAL - Barangay Tools
  if (role === ROLES.BARANGAY_OFFICIAL) {
    navGroups.push({
      title: t.brgyTools || 'BARANGAY TOOLS',
      items: [
        { label: t.recoveryProgress || 'Recovery Progress', path: '/recovery-progress', icon: IconlyProgress },
        { label: t.distributionEvents || 'Distribution / Announcement', path: '/distribution-events', icon: IconlyTruck },
        { label: t.specialRelief || 'Special Relief Requests', path: '/special-request-relief', icon: IconlySpecial },
        { label: t.livelihoodAssistance || 'Livelihood Assistance', path: '/livelihood-assistance', icon: IconlyBriefcase },
        { label: t.reports || 'Reports', path: '/reports', icon: IconlyFileText },
      ],
    });
  }

  const avatarInitials = user?.name
    ? user.name.split(' ').filter(Boolean).map(n => n[0]).join('').toUpperCase().slice(0, 2)
    : 'BO';
  const userKey = user?.emailOrPhone || user?.email || user?.role || 'default';
  const avatarSrc = localStorage.getItem(`mitigateplus_avatar_${userKey}`) || null;

  return (
    <aside
      aria-label="Main navigation"
        style={{
          width: isCollapsed ? '72px' : '256px',
          minWidth: isCollapsed ? '72px' : '256px',
          height: '100vh',
          position: 'sticky',
          top: 0,
          background: 'var(--sidebar-bg)',
          color: 'var(--ink)',
          borderRight: '1px solid var(--border)',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'space-between',
          padding: isCollapsed ? '20px 10px' : '20px 14px',
          transition: 'width 0.25s cubic-bezier(0.2, 0, 0, 1), min-width 0.25s cubic-bezier(0.2, 0, 0, 1), padding 0.25s cubic-bezier(0.2, 0, 0, 1)',
          boxShadow: '2px 0 16px rgba(15, 23, 42, 0.04)',
          zIndex: 100,
          fontFamily: "'Plus Jakarta Sans', sans-serif",
          overflowX: 'hidden',
          overflowY: 'auto',
        }}
      >
      {/* ── TOP SECTION ── */}
      <div>
        {/* Logo + Collapse Toggle */}
        {isCollapsed ? (
          <div style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            marginBottom: '24px',
            width: '100%',
          }}>
            <button
              onClick={() => setIsCollapsed(false)}
              title="Click to expand sidebar"
              aria-label="Expand sidebar"
              style={{
                background: 'transparent',
                border: 'none',
                padding: 0,
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
              }}
            >
              <img
                src={logoMinimized}
                alt="MitigatePlus Icon"
                className="sidebar-brand-mark sidebar-brand-icon"
                style={{
                  height: '36px',
                  width: '36px',
                  objectFit: 'contain',
                  borderRadius: '8px',
                  flexShrink: 0,
                  mixBlendMode: 'multiply',
                  background: 'transparent',
                }}
              />
            </button>
          </div>
        ) : (
          <div style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            marginBottom: '28px',
            width: '100%',
          }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '10px', overflow: 'hidden', minWidth: 0, margin: '0 auto' }}>
              <img
                src={logoFull}
                alt="MitigatePlus Logo"
                className="sidebar-brand-mark"
                style={{
                  height: '48px',
                  maxWidth: '195px',
                  objectFit: 'contain',
                  flexShrink: 0,
                  mixBlendMode: 'multiply',
                  background: 'transparent',
                  transition: 'all 0.2s ease',
                }}
              />
            </div>
          </div>
        )}

        {/* Nav Groups */}
        <nav aria-label="Primary navigation">
          <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
            {navGroups.map((group, gIdx) => (
              <div key={gIdx}>
                {/* Section label */}
                {!isCollapsed && (
                  <div style={{
                    fontSize: '11px',
                    fontWeight: 800,
                    textTransform: 'uppercase',
                    color: 'var(--ink-soft)',
                    letterSpacing: '1px',
                    marginBottom: '6px',
                    paddingLeft: '10px',
                  }}>
                    {group.title}
                  </div>
                )}
                {isCollapsed && gIdx > 0 && (
                  <div style={{ height: '1px', background: 'rgba(255,255,255,0.08)', margin: '0 4px 10px' }} />
                )}

                <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
                  {group.items.map((item, iIdx) => {
                    const Icon = item.icon;
                    return (
                      <NavLink
                        key={iIdx}
                        to={item.path}
                        end={item.path === '/'}
                        title={isCollapsed ? item.label : undefined}
                        aria-label={item.label}
                        style={({ isActive }) => ({
                          display: 'flex',
                          alignItems: 'center',
                          gap: '10px',
                          padding: isCollapsed ? '11px 0' : '10px 12px',
                          justifyContent: isCollapsed ? 'center' : 'flex-start',
                          borderRadius: '10px',
                          textDecoration: 'none',
                          fontSize: '13px',
                          fontWeight: isActive ? 700 : 500,
                          color: isActive ? 'var(--manila-blue)' : 'var(--ink-soft)',
                          backgroundColor: isActive ? 'var(--card)' : 'transparent',
                          boxShadow: isActive ? '0 2px 10px rgba(15,23,42,0.06)' : 'none',
                          borderLeft: isActive ? '3px solid var(--manila-blue)' : '3px solid transparent',
                          transition: 'all 0.2s cubic-bezier(0.2, 0, 0, 1)',
                          position: 'relative',
                          overflow: 'hidden',
                        })}
                        className={({ isActive }) => isActive ? 'sidebar-item active-pop' : 'sidebar-item'}
                      >
                        {({ isActive }) => (
                          <>
                            <Icon
                              size={18}
                              color={isActive ? 'var(--manila-blue)' : 'var(--ink-soft)'}
                              style={{ flexShrink: 0 }}
                            />
                            {!isCollapsed && (
                              <span style={{
                                whiteSpace: 'nowrap',
                                overflow: 'hidden',
                                textOverflow: 'ellipsis',
                              }}>
                                {item.label}
                              </span>
                            )}
                          </>
                        )}
                      </NavLink>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
        </nav>
      </div>

      {/* ── BOTTOM USER CARD ── */}
      <div>
        <div style={{ height: '1px', background: 'var(--border)', margin: '12px 0' }} />

        {isCollapsed ? (
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '8px' }}>
            <NavLink to="/settings" style={{ textDecoration: 'none' }} title="Go to Settings">
              <div
                className="sidebar-user-card"
                style={{
                  background: 'var(--card)',
                  border: '1px solid var(--border)',
                  borderRadius: '12px',
                  padding: '6px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  boxShadow: '0 2px 8px rgba(15,23,42,0.04)',
                  cursor: 'pointer',
                }}
              >
                <div style={{
                  width: '34px',
                  height: '34px',
                  borderRadius: '50%',
                  background: avatarSrc ? 'transparent' : 'linear-gradient(135deg, #2563EB 0%, #1D4ED8 100%)',
                  color: '#FFF',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontWeight: 800,
                  fontSize: '12px',
                  flexShrink: 0,
                  letterSpacing: '-0.5px',
                  overflow: 'hidden',
                  border: '2px solid var(--border)',
                }}>
                  {avatarSrc
                    ? <img src={avatarSrc} alt="Profile" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                    : avatarInitials
                  }
                </div>
              </div>
            </NavLink>

            {/* Minimized Logout Button */}
            <button
              onClick={handleLogout}
              aria-label="Logout"
              title="Sign Out / Logout"
              className="sidebar-logout-btn"
              style={{
                background: 'var(--danger-light)',
                border: '1px solid rgba(239,68,68,0.25)',
                borderRadius: '10px',
                color: 'var(--danger)',
                cursor: 'pointer',
                width: '38px',
                height: '38px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                transition: 'all 0.2s ease',
              }}
            >
              <LogOut size={16} />
            </button>
          </div>
        ) : (
          /* User Card - click to go to Settings */
          <NavLink to="/settings" style={{ textDecoration: 'none' }}>
            <div
              className="sidebar-user-card"
              style={{
                background: 'var(--card)',
                border: '1px solid var(--border)',
                borderRadius: '12px',
                padding: '10px 12px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                gap: '10px',
                boxShadow: '0 2px 8px rgba(15,23,42,0.04)',
                cursor: 'pointer',
                transition: 'all 0.15s ease',
              }}
              title="Go to Settings"
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px', overflow: 'hidden', minWidth: 0 }}>
                {/* Avatar */}
                <div style={{
                  width: '34px',
                  height: '34px',
                  borderRadius: '50%',
                  background: avatarSrc ? 'transparent' : 'linear-gradient(135deg, #2563EB 0%, #1D4ED8 100%)',
                  color: '#FFF',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontWeight: 800,
                  fontSize: '12px',
                  flexShrink: 0,
                  letterSpacing: '-0.5px',
                  overflow: 'hidden',
                  border: '2px solid var(--border)',
                }}>
                  {avatarSrc
                    ? <img src={avatarSrc} alt="Profile" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                    : avatarInitials
                  }
                </div>

                <div style={{ overflow: 'hidden', minWidth: 0 }}>
                  <div style={{
                    fontWeight: 700,
                    fontSize: '13px',
                    color: 'var(--ink)',
                    whiteSpace: 'nowrap',
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                  }}>
                    {user?.name || 'Barangay Official'}
                  </div>
                  <div
                    className="sidebar-role-badge"
                    style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      background: 'var(--manila-blue-light)',
                      border: '1px solid rgba(37,99,235,0.2)',
                      borderRadius: '999px',
                      padding: '1px 7px',
                      marginTop: '2px',
                    }}
                  >
                    <span style={{ fontSize: '11px', fontWeight: 700, color: 'var(--manila-blue)', whiteSpace: 'nowrap' }}>
                      {getRoleLabel(user?.role)}
                    </span>
                  </div>
                </div>
              </div>

              <button
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  handleLogout();
                }}
                aria-label="Logout"
                title="Logout"
                className="sidebar-logout-btn"
                style={{
                  background: 'var(--danger-light)',
                  border: '1px solid rgba(239,68,68,0.2)',
                  borderRadius: '8px',
                  color: 'var(--danger)',
                  cursor: 'pointer',
                  width: '32px',
                  height: '32px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  flexShrink: 0,
                  transition: 'all 0.2s ease',
                }}
              >
                <LogOut size={14} />
              </button>
            </div>
          </NavLink>
        )}
      </div>
    </aside>
  );
}

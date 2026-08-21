import React, { useContext } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { AuthContext } from '../context/AuthContext';
import { Shield, UserCheck, BarChart3, Package, FileText, UserPlus, LogOut, MapPin } from 'lucide-react';
import { logoMarkBase64 } from '../assets/logo-b64';

export default function Navbar() {
  const { user, logout } = useContext(AuthContext);
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  return (
    <header style={{
      background: 'linear-gradient(135deg, var(--manila-blue-deep) 0%, var(--manila-blue) 100%)',
      color: '#FFFFFF',
      borderRadius: '0 0 var(--radius-card) var(--radius-card)',
      padding: '14px 28px',
      boxShadow: 'var(--shadow-card)',
      marginBottom: '28px',
      fontFamily: "'Plus Jakarta Sans', sans-serif",
    }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', maxWidth: '1200px', margin: '0 auto', flexWrap: 'wrap', gap: '16px' }}>
        {/* Custom Manila Clock Tower Logo & Title */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
          <img className="navbar-brand-logo" src={logoMarkBase64} alt="MitigatePlus Manila Clock Tower Logo" style={{ height: '48px', width: 'auto', objectFit: 'contain', filter: 'drop-shadow(0 2px 8px rgba(0,0,0,0.4))' }} />
          <div>
            <h1 style={{ fontFamily: 'Baloo 2', fontSize: '22px', fontWeight: 800, margin: 0, color: '#FFF', letterSpacing: '-0.3px' }}>
              MitigatePlus <span style={{ fontFamily: "'Plus Jakarta Sans', sans-serif", fontSize: '13px', opacity: 0.85, fontWeight: 500 }}>— Manila City LGU</span>
            </h1>
            <p style={{ fontSize: '12px', color: 'rgba(255,255,255,0.85)', margin: 0, fontWeight: 500 }}>
              Post-Disaster Recovery & Assistance Management System
            </p>
          </div>
        </div>

        {/* Navigation Links */}
        <nav style={{ display: 'flex', alignItems: 'center', gap: '16px', flexWrap: 'wrap' }}>
          <Link to="/" style={{ color: '#FFF', textDecoration: 'none', fontSize: '14px', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '6px' }}>
            <BarChart3 size={18} /> Dashboard
          </Link>
          <Link to="/verification-queue" style={{ color: '#FFF', textDecoration: 'none', fontSize: '14px', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '6px' }}>
            <UserCheck size={18} /> Verification Queue
          </Link>
          <Link to="/priority-index" style={{ color: '#FFF', textDecoration: 'none', fontSize: '14px', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '6px' }}>
            <Shield size={18} /> Priority Index
          </Link>
          <Link to="/heatmap" style={{ color: 'var(--jeepney-amber)', textDecoration: 'none', fontSize: '14px', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '6px' }}>
            <MapPin size={18} /> Barangay Heatmap
          </Link>
          <Link to="/relief-allocation" style={{ color: '#FFF', textDecoration: 'none', fontSize: '14px', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '6px' }}>
            <Package size={18} /> Relief Allocation
          </Link>
          {user?.role === 'lgu_admin' && (
            <Link to="/provision-accounts" style={{ color: 'var(--jeepney-amber)', textDecoration: 'none', fontSize: '14px', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '6px' }}>
              <UserPlus size={18} /> Account Provisioning
            </Link>
          )}
          <Link to="/reports" style={{ color: '#FFF', textDecoration: 'none', fontSize: '14px', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '6px' }}>
            <FileText size={18} /> Reports
          </Link>
        </nav>

        {/* User Info & Logout */}
        {user && (
          <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
            <div style={{ textAlign: 'right' }}>
              <div style={{ fontWeight: 700, fontSize: '14px', color: '#FFF' }}>{user.name}</div>
              <div style={{ fontSize: '11px', color: 'var(--jeepney-amber)', fontWeight: 700 }}>
                {user.role === 'lgu_admin' ? 'LGU Admin (City-Wide)' : `Barangay Official (Brgy ${user.barangayCode || '291'})`}
              </div>
            </div>
            <button onClick={handleLogout} className="clay-button-danger" style={{ padding: '6px 14px', fontSize: '13px', minHeight: '36px' }}>
              <LogOut size={16} /> Logout
            </button>
          </div>
        )}
      </div>
    </header>
  );
}

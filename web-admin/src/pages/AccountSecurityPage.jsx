import React, { useState, useContext, useEffect } from 'react';
import { AuthContext } from '../context/AuthContext';
import { Lock, Shield, UserX, AlertTriangle, CheckCircle, Clock, Search, Plus, UserPlus, Crown, Trash2, Power } from 'lucide-react';
import ConfirmModal from '../components/ConfirmModal';
import { API_BASE_URL } from '../config';
import { MotionCard, MotionButton } from '../components/motion';

const ROLE_COLOR = {
  lgu_superadmin: { bg: '#FEF2F2', color: '#991B1B' },
  lgu_admin: { bg: '#F5F3FF', color: '#7C3AED' },
  barangay_official: { bg: '#EFF6FF', color: '#1D4ED8' },
  field_staff: { bg: '#FEF3C7', color: '#B45309' },
};

const ROLE_LABEL = {
  lgu_superadmin: 'LGU Super Admin',
  lgu_admin: 'LGU Admin',
  barangay_official: 'Barangay Official',
  field_staff: 'Field Staff',
};

export default function AccountSecurityPage() {
  const { user, token } = useContext(AuthContext);

  const [accounts, setAccounts] = useState([]);
  
  useEffect(() => {
    fetchAccounts();
  }, [token]);
  
  const fetchAccounts = async () => {
    try {
      const res = await fetch(`${API_BASE_URL}/auth/provisioned-users`, {
        headers: { Authorization: 'Bearer ' + token, 'Content-Type': 'application/json' }
      });
      if (res.ok) {
        const data = await res.json();
        const execAccounts = data.filter(a => a.role === 'lgu_admin' || a.role === 'barangay_official');
        setAccounts(execAccounts);
      }
    } catch (e) {
      console.error(e);
    }
  };

  const [search, setSearch] = useState('');
  const [showCreateForm, setShowCreateForm] = useState(false);

  // New Account Form State
  const [newRole, setNewRole] = useState('lgu_admin'); // 'lgu_admin' | 'barangay_official'
  const [newName, setNewName] = useState('');
  const [newEmail, setNewEmail] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [newBarangay, setNewBarangay] = useState('');

  // ── Confirm Modal State ──
  const [modal, setModal] = useState({
    isOpen: false,
    type: 'warning',
    title: '',
    message: '',
    confirmText: 'Proceed',
    onConfirm: null,
  });

  const closeConfirm = () => setModal({ isOpen: false });

  const saveToStorage = (updatedList) => {
    setAccounts(updatedList);
  };

  // ── Create Account Request with Confirmation ──
  const handleCreateRequest = (e) => {
    e.preventDefault();
    if (!newName.trim() || !newEmail.trim() || !newPassword.trim()) return;

    const roleTitle = newRole === 'lgu_admin' ? 'LGU Admin' : 'Barangay Official';
    const brgyText = newRole === 'lgu_admin' ? 'City-Wide' : `Barangay ${newBarangay}`;

    setModal({
      isOpen: true,
      title: 'I-create ang Bagong Akawnt?',
      message: `Sigurado ka bang gusto mong gawan ng akawnt si "${newName}" (${newEmail}) bilang ${roleTitle} (${brgyText})?`,
      type: 'info',
      confirmText: 'Oo, I-create',
      onConfirm: executeCreate,
    });
  };

  const executeCreate = async () => {
    try {
      const endpoint = newRole === 'lgu_admin'
        ? `${API_BASE_URL}/auth/provision-admin`
        : `${API_BASE_URL}/auth/provision-official`;

      const body = {
        name: newName.trim(),
        emailOrPhone: newEmail.trim(),
        password: newPassword,
      };
      if (newRole === 'barangay_official') {
        body.barangayCode = newBarangay.trim();
      }

      const res = await fetch(endpoint, {
        method: 'POST',
        headers: { Authorization: 'Bearer ' + token, 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });

      if (res.ok) {
        setNewName('');
        setNewEmail('');
        setNewPassword('');
        setNewBarangay('');
        setShowCreateForm(false);
        closeConfirm();
        // Refresh the accounts list from the server
        fetchAccounts();
      } else {
        const errData = await res.json().catch(() => ({}));
        closeConfirm();
        alert(`Failed to create account: ${errData.message || 'Server error'}`);
      }
    } catch (err) {
      closeConfirm();
      alert('Could not connect to server. Please try again.');
    }
  };

  // ── Suspend / Reactivate Request ──
  const requestToggle = (acc) => {
    const isAct = acc.status === 'active';
    setModal({
      isOpen: true,
      title: isAct ? 'I-suspend ang Account?' : 'I-reactivate ang Account?',
      message: `Sigurado ka bang gusto mong ${isAct ? 'i-suspend' : 'i-reactivate'} ang account ni ${acc.name}? ${isAct ? 'Hindi na siya makakapag-login sa system.' : 'Muli siyang makakapag-access sa dashboard.'}`,
      type: isAct ? 'danger' : 'success',
      confirmText: isAct ? 'Oo, I-suspend' : 'Oo, I-reactivate',
      onConfirm: () => {
        const updated = accounts.map(a => a.id === acc.id ? { ...a, status: isAct ? 'suspended' : 'active' } : a);
        saveToStorage(updated);
        closeConfirm();
      },
    });
  };

  // ── Delete Account Request ──
  const requestDelete = (acc) => {
    setModal({
      isOpen: true,
      title: 'Burahin ang Account?',
      message: `Sigurado ka bang gusto mong tuluyang BURAHIN ang account ni ${acc.name} (${acc.email || acc.emailOrPhone})? Hindi na ito mababawi.`,
      type: 'danger',
      confirmText: 'Oo, Burahin',
      onConfirm: () => {
        const updated = accounts.filter(a => a.id !== acc.id);
        saveToStorage(updated);
        closeConfirm();
      },
    });
  };

  const filtered = accounts.filter(a =>
    a.name.toLowerCase().includes(search.toLowerCase()) ||
    (a.email || a.emailOrPhone || '').toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="page-container page-animate">
      {/* Universal Double Confirmation Modal */}
      <ConfirmModal
        isOpen={modal.isOpen}
        title={modal.title}
        message={modal.message}
        type={modal.type}
        confirmText={modal.confirmText}
        onConfirm={modal.onConfirm}
        onCancel={closeConfirm}
      />

      {/* ── Page Header ── */}
      <div className="workflow-header" style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 28, flexWrap: 'wrap', gap: 16 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
          <div style={{ width: 48, height: 48, borderRadius: 'var(--radius-inner)', background: 'linear-gradient(135deg, #1E1B4B, #312E81)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <Lock size={24} color="#fff" />
          </div>
          <div>
            <h1 className="section-header" style={{ margin: 0, fontSize: 22 }}>Account Security & Revocation</h1>
            <p style={{ fontSize: 13, color: 'var(--ink-soft)', marginTop: 2 }}>Create, manage, suspend, or revoke LGU Admin and Barangay Official accounts.</p>
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, background: 'var(--card)', border: '1px solid var(--border)', padding: '8px 14px', borderRadius: 'var(--radius-pill)' }}>
            <Search size={14} color="var(--ink-soft)" />
            <input
              value={search}
              aria-label="Search accounts"
              onChange={e => setSearch(e.target.value)}
              placeholder="Search accounts..."
              style={{ border: 'none', outline: 'none', fontSize: 13, background: 'transparent', color: 'var(--ink)', minWidth: 160 }}
            />
          </div>

          <button
            onClick={() => setShowCreateForm(!showCreateForm)}
            className="clay-button-primary"
            style={{ fontSize: 13, gap: 6 }}
          >
            <Plus size={15} /> {showCreateForm ? 'Close Form' : 'Create New Account'}
          </button>
        </div>
      </div>

      {/* ── Create New Account Form Panel (LGU Admin / Barangay Official) ── */}
      {showCreateForm && (
        <div className="clay-card" style={{ marginBottom: 24, borderLeft: '4px solid #7C3AED' }}>
          <h2 style={{ fontSize: 16, fontWeight: 800, color: 'var(--ink)', margin: '0 0 14px', display: 'flex', alignItems: 'center', gap: 8 }}>
            <UserPlus size={18} color="#7C3AED" /> Provision New LGU Admin or Barangay Official Account
          </h2>

          <form onSubmit={handleCreateRequest}>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 14, marginBottom: 14 }}>
              <div>
                <label style={{ fontSize: 11, fontWeight: 700, color: 'var(--ink-soft)', textTransform: 'uppercase', letterSpacing: '0.05em', display: 'block', marginBottom: 4 }}>Account Role</label>
                <div style={{ display: 'flex', gap: 8 }}>
                  <button
                    type="button"
                    onClick={() => setNewRole('lgu_admin')}
                    className={newRole === 'lgu_admin' ? 'clay-button-primary' : 'clay-button-ghost'}
                    style={{ flex: 1, fontSize: 12, padding: '8px 10px', justifyContent: 'center' }}
                  >
                    <Crown size={14} color="#F59E0B" /> LGU Admin
                  </button>
                  <button
                    type="button"
                    onClick={() => setNewRole('barangay_official')}
                    className={newRole === 'barangay_official' ? 'clay-button-primary' : 'clay-button-ghost'}
                    style={{ flex: 1, fontSize: 12, padding: '8px 10px', justifyContent: 'center' }}
                  >
                    <Shield size={14} /> Official
                  </button>
                </div>
              </div>

              <div>
                <label style={{ fontSize: 11, fontWeight: 700, color: 'var(--ink-soft)', textTransform: 'uppercase', letterSpacing: '0.05em', display: 'block', marginBottom: 4 }}>Full Name</label>
                <input
                  value={newName}
                  onChange={e => setNewName(e.target.value)}
                  placeholder={newRole === 'lgu_admin' ? 'e.g. Admin Maria Cruz' : 'e.g. Hon. Chairman Santos'}
                  style={{ width: '100%', padding: '9px 12px', borderRadius: 'var(--radius-inner)', border: '1px solid var(--border)', fontSize: 13, outline: 'none', background: 'var(--card)', color: 'var(--ink)', boxSizing: 'border-box' }}
                  required
                />
              </div>

              <div>
                <label style={{ fontSize: 11, fontWeight: 700, color: 'var(--ink-soft)', textTransform: 'uppercase', letterSpacing: '0.05em', display: 'block', marginBottom: 4 }}>Email Address</label>
                <input
                  value={newEmail}
                  onChange={e => setNewEmail(e.target.value)}
                  placeholder="e.g. admin@manila.gov.ph"
                  style={{ width: '100%', padding: '9px 12px', borderRadius: 'var(--radius-inner)', border: '1px solid var(--border)', fontSize: 13, outline: 'none', background: 'var(--card)', color: 'var(--ink)', boxSizing: 'border-box' }}
                  required
                />
              </div>

              {newRole === 'barangay_official' && (
                <div>
                  <label style={{ fontSize: 11, fontWeight: 700, color: 'var(--ink-soft)', textTransform: 'uppercase', letterSpacing: '0.05em', display: 'block', marginBottom: 4 }}>Assigned Barangay</label>
                  <select
                    id="assigned-barangay-select"
                    aria-label="Select Assigned Barangay"
                    value={newBarangay}
                    onChange={e => setNewBarangay(e.target.value)}
                    style={{ width: '100%', padding: '9px 12px', borderRadius: 'var(--radius-inner)', border: '1px solid var(--border)', fontSize: 13, outline: 'none', background: 'var(--card)', color: 'var(--ink)', cursor: 'pointer', boxSizing: 'border-box' }}
                  >
                    <option value="">Select Barangay...</option>
                    <option value="291">Barangay 291</option>
                    <option value="292">Barangay 292</option>
                    <option value="293">Barangay 293</option>
                    <option value="294">Barangay 294</option>
                    <option value="295">Barangay 295</option>
                    <option value="296">Barangay 296</option>
                    <option value="297">Barangay 297</option>
                    <option value="298">Barangay 298</option>
                    <option value="299">Barangay 299</option>
                    <option value="300">Barangay 300</option>
                  </select>
                </div>
              )}

              <div>
                <label style={{ fontSize: 11, fontWeight: 700, color: 'var(--ink-soft)', textTransform: 'uppercase', letterSpacing: '0.05em', display: 'block', marginBottom: 4 }}>Security Password</label>
                <input
                  type="password"
                  value={newPassword}
                  onChange={e => setNewPassword(e.target.value)}
                  placeholder="Assign password"
                  style={{ width: '100%', padding: '9px 12px', borderRadius: 'var(--radius-inner)', border: '1px solid var(--border)', fontSize: 13, outline: 'none', background: 'var(--card)', color: 'var(--ink)', boxSizing: 'border-box' }}
                  required
                />
              </div>
            </div>

            <div style={{ display: 'flex', gap: 10 }}>
              <button type="submit" className="clay-button-primary" style={{ fontSize: 13, gap: 6 }}>
                <UserPlus size={14} /> Provision Account
              </button>
              <button type="button" onClick={() => setShowCreateForm(false)} className="clay-button-ghost" style={{ fontSize: 13 }}>
                Cancel
              </button>
            </div>
          </form>
        </div>
      )}

      {/* ── Executive Accounts Table ── */}
      <div className="clay-card" style={{ padding: 0, overflow: 'hidden' }}>
        {filtered.length === 0 ? (
          <div style={{ padding: '40px 20px', textAlign: 'center', color: 'var(--ink-soft)' }}>
            No accounts found.
          </div>
        ) : (
        <table className="clay-table">
          <thead>
            <tr>
              <th>Account Name</th>
              <th>Role</th>
              <th>Scope</th>
              <th>Last Login</th>
              <th>Status</th>
              <th>Action</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map(acc => {
              const rc = ROLE_COLOR[acc.role] || ROLE_COLOR.lgu_admin;
              return (
                <tr key={acc.id}>
                  <td>
                    <div style={{ fontWeight: 700, color: 'var(--ink)', fontSize: 14 }}>{acc.name}</div>
                    <div style={{ fontSize: 12, color: 'var(--ink-soft)' }}>{acc.email || acc.emailOrPhone}</div>
                  </td>
                  <td>
                    <span style={{ background: rc.bg, color: rc.color, fontSize: 11, fontWeight: 700, padding: '3px 10px', borderRadius: 999 }}>
                      {ROLE_LABEL[acc.role] || 'LGU Admin'}
                    </span>
                  </td>
                  <td>
                    <span style={{ fontSize: 12, fontWeight: 700, color: 'var(--manila-blue)' }}>
                      {(acc.barangay && acc.barangay !== 'null') ? (acc.barangay === 'City-Wide' ? 'City-Wide' : `Barangay ${acc.barangay}`) : (acc.barangayCode ? `Barangay ${acc.barangayCode}` : 'City-Wide')}
                    </span>
                  </td>
                  <td>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: 12, color: 'var(--ink-soft)' }}>
                      <Clock size={12} /> {acc.lastLogin || 'Recent'}
                    </div>
                  </td>
                  <td>
                    {acc.status === 'active'
                      ? <span style={{ display: 'inline-flex', alignItems: 'center', gap: 5, background: 'rgba(21,138,100,0.1)', color: '#158A64', fontSize: 11, fontWeight: 700, padding: '3px 10px', borderRadius: 999 }}><CheckCircle size={12} /> Active</span>
                      : <span style={{ display: 'inline-flex', alignItems: 'center', gap: 5, background: '#FEF2F2', color: '#DC2626', fontSize: 11, fontWeight: 700, padding: '3px 10px', borderRadius: 999 }}><UserX size={12} /> Suspended</span>}
                  </td>
                  <td>
                    <div style={{ display: 'flex', gap: 6 }}>
                      <button onClick={() => requestToggle(acc)} className={acc.status === 'active' ? 'clay-button-danger' : 'clay-button-approve'} style={{ fontSize: 11, padding: '4px 8px', gap: 4, height: 26 }}>
                        <Power size={12} /> {acc.status === 'active' ? 'Suspend' : 'Reactivate'}
                      </button>
                      <button onClick={() => requestDelete(acc)} className="clay-button-ghost" style={{ fontSize: 11, padding: '4px 8px', gap: 4, height: 26, color: '#DC2626', borderColor: 'rgba(220,38,38,0.3)' }}>
                        <Trash2 size={12} /> Delete
                      </button>
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
        )}
      </div>
    </div>
  );
}

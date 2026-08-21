import React, { useState, useContext, useEffect } from 'react';
import { AuthContext } from '../context/AuthContext';
import { UserPlus, Shield, Users, CheckCircle, AlertTriangle, UserX, Trash2, Search, Power, ShieldAlert, Crown, Edit3 } from 'lucide-react';
import ConfirmModal from '../components/ConfirmModal';
import { API_BASE_URL } from '../config';
import { MotionCard, MotionButton } from '../components/motion';


const ITEMS_PER_PAGE = 3;

export default function ProvisionAccounts() {
  const { token, user } = useContext(AuthContext);
  const isSuperAdmin = user?.role === 'lgu_superadmin' || user?.role === 'lgu_super_admin';

  // Default targetRole: 'lgu_admin' if SuperAdmin, 'field_staff' if LGU Admin
  const [targetRole, setTargetRole] = useState(() => isSuperAdmin ? 'lgu_admin' : 'field_staff');
  const [name, setName] = useState('');
  const [emailOrPhone, setEmailOrPhone] = useState('');
  const [password, setPassword] = useState('');
  const [barangayCode, setBarangayCode] = useState('291');
  const [employeeId, setEmployeeId] = useState('');
  const [department, setDepartment] = useState('');
  const [contactNum, setContactNum] = useState('');
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [editingAccount, setEditingAccount] = useState(null);
  const [statusMsg, setStatusMsg] = useState({ type: '', text: '' });
  const [loading, setLoading] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);

  const openCreateModal = () => {
    setEditingAccount(null);
    setName('');
    setEmailOrPhone('');
    setEmployeeId('');
    setDepartment('');
    setContactNum('');
    setPassword('');
    setTargetRole(isSuperAdmin ? 'lgu_admin' : 'field_staff');
    setBarangayCode('291');
    setStatusMsg({ type: '', text: '' });
    setIsCreateModalOpen(true);
  };

  const openEditModal = (acc) => {
    setEditingAccount(acc);
    setName(acc.name || '');
    setEmailOrPhone(acc.emailOrPhone || '');
    setEmployeeId(acc.employeeId || '');
    setDepartment(acc.department || '');
    setContactNum(acc.contactNum || '');
    setTargetRole(acc.role || (isSuperAdmin ? 'lgu_admin' : 'field_staff'));
    setBarangayCode(acc.barangayCode && acc.barangayCode !== 'City-Wide' ? acc.barangayCode : '291');
    setPassword('');
    setStatusMsg({ type: '', text: '' });
    setIsCreateModalOpen(true);
  };

  // Accounts List State
  const [accounts, setAccounts] = useState([]);

  // Fetch real provisioned accounts from backend on mount
  const fetchProvisionedAccounts = async () => {
    if (!token) return;
    try {
      const res = await fetch(`${API_BASE_URL}/auth/provisioned-users`, {
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
      });
      if (res.ok) {
        const data = await res.json();
        setAccounts(Array.isArray(data) ? data : []);
      } else {
        setAccounts([]);
      }
    } catch (err) {
      console.error('Failed to fetch provisioned accounts:', err);
      setAccounts([]);
    }
  };

  useEffect(() => {
    fetchProvisionedAccounts();
  }, [token]);

  const [search, setSearch] = useState('');

  // Reset to page 1 when search changes
  useEffect(() => {
    setCurrentPage(1);
  }, [search]);

  // ── Confirmation Modal State ──
  const [modal, setModal] = useState({
    isOpen: false,
    type: 'warning',
    title: '',
    message: '',
    confirmText: 'Proceed',
    onConfirm: null,
  });

  const closeConfirm = () => setModal({ isOpen: false });



  // Sync default targetRole if user role changes
  useEffect(() => {
    if (isSuperAdmin && targetRole === 'field_staff') {
      setTargetRole('lgu_admin');
    }
  }, [isSuperAdmin]);

  // Restrict view if not LGU Admin or SuperAdmin
  if (user?.role !== 'lgu_admin' && user?.role !== 'lgu_superadmin' && user?.role !== 'lgu_super_admin') {
    return (
      <div className="page-container page-animate" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '60vh' }}>
        <div className="clay-card" style={{ borderLeft: '4px solid var(--danger)', maxWidth: '480px', width: '100%', padding: '32px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px', color: 'var(--danger)', marginBottom: '12px' }}>
            <div style={{ width: 44, height: 44, borderRadius: 'var(--radius-inner)', background: 'rgba(198,86,75,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <AlertTriangle size={22} color="var(--danger)" />
            </div>
            <h3 style={{ fontSize: '20px', fontWeight: 800, margin: 0, color: 'var(--danger)' }}>403 Forbidden Access</h3>
          </div>
          <p style={{ fontSize: '14px', color: 'var(--ink-soft)', lineHeight: 1.6, margin: 0 }}>
            Account Management is restricted exclusively to <strong>LGU Admin</strong> and <strong>LGU SuperAdmin</strong> accounts.
          </p>
        </div>
      </div>
    );
  }

  // ── Create New Account with Confirmation ──
  const handleProvisionRequest = (e) => {
    e.preventDefault();
    if (!name.trim() || !emailOrPhone.trim() || !password.trim() || !employeeId.trim() || !contactNum.trim()) {
      setStatusMsg({ type: 'error', text: 'Paki-kumpleto ang lahat ng required account & employee fields.' });
      return;
    }

    const roleTitle = targetRole === 'lgu_admin'
      ? 'LGU Admin'
      : targetRole === 'barangay_official'
      ? 'Barangay Official'
      : 'Field Staff';

    const locationText = targetRole === 'lgu_admin' ? 'City-Wide' : `Barangay ${barangayCode}`;

    setModal({
      isOpen: true,
      title: 'Lumikha ng Bagong Akawnt?',
      message: `Sigurado ka bang gusto mong gawan ng opisyal na akawnt si "${name}" (${employeeId}) bilang ${roleTitle} (${locationText})?`,
      type: 'info',
      confirmText: 'Oo, Lumikha ng Akawnt',
      onConfirm: executeProvision,
    });
  };

  const executeProvision = async () => {
    setLoading(true);
    setStatusMsg({ type: '', text: '' });
    closeConfirm();

    // If editing existing account
    if (editingAccount) {
      alert('This action requires server-side implementation');
      setStatusMsg({ type: 'success', text: `✓ Updated account for ${name}!` });
      setEditingAccount(null);
      setIsCreateModalOpen(false);
      setLoading(false);
      return;
    }

    // Creating new account

    try {
      const endpoint = targetRole === 'barangay_official'
        ? `${API_BASE_URL}/auth/provision-official`
        : targetRole === 'lgu_admin'
        ? `${API_BASE_URL}/auth/provision-admin`
        : `${API_BASE_URL}/auth/provision-staff`;

      const res = await fetch(endpoint, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, emailOrPhone, password, barangayCode, role: targetRole, employeeId, department, contactNum }),
      });

      const data = await res.json();

      if (res.ok) {
        setStatusMsg({ type: 'success', text: `✓ Nilikha na ang opisyal na akawnt para kay ${name} (${emailOrPhone})!` });
        await fetchProvisionedAccounts();
        setName('');
        setEmailOrPhone('');
        setPassword('');
        setEmployeeId('');
        setDepartment('');
        setContactNum('');
        setIsCreateModalOpen(false);
      } else {
        // Display real backend error to user and do NOT save fake local data
        setStatusMsg({ type: 'error', text: data.message || 'Nabigo ang paglikha ng akawnt.' });
      }
    } catch (err) {
      console.error('Provisioning error:', err);
      setStatusMsg({ type: 'error', text: 'Network/server error habang lumilikha ng akawnt.' });
    } finally {
      setLoading(false);
    }
  };


  // ── Suspend / Reactivate Account ──
  const requestToggleStatus = (acc) => {
    const isAct = acc.status === 'active';
    setModal({
      isOpen: true,
      title: isAct ? 'I-suspend ang Akawnt?' : 'I-reactivate ang Akawnt?',
      message: `Sigurado ka bang gusto mong ${isAct ? 'i-suspend' : 'i-reactivate'} ang akawnt ni ${acc.name}? ${isAct ? 'Hindi na siya makakapag-access sa system.' : 'Muli siyang makakapag-access sa system.'}`,
      type: isAct ? 'danger' : 'success',
      confirmText: isAct ? 'Oo, I-suspend' : 'Oo, I-reactivate',
      onConfirm: () => {
        alert('This action requires server-side implementation');
        closeConfirm();
      },
    });
  };

  // ── Delete Account ──
  const requestDeleteAccount = (acc) => {
    setModal({
      isOpen: true,
      title: 'Burahin ang Akawnt?',
      message: `Sigurado ka bang gusto mong tuluyang BURAHIN ang akawnt ni ${acc.name} (${acc.emailOrPhone})? Hindi na ito mababawi.`,
      type: 'danger',
      confirmText: 'Oo, Burahin Akawnt',
      onConfirm: () => {
        alert('This action requires server-side implementation');
        closeConfirm();
      },
    });
  };

  // Filter accounts displayed: SuperAdmin sees LGU Admin & Barangay Officials; LGU Admin sees Field Staff & Barangay Officials
  const filteredAccounts = accounts.filter(a => {
    if (isSuperAdmin) {
      return (a.role === 'lgu_admin' || a.role === 'barangay_official') &&
        (a.name.toLowerCase().includes(search.toLowerCase()) || a.emailOrPhone.toLowerCase().includes(search.toLowerCase()));
    } else {
      return (a.role === 'field_staff' || a.role === 'barangay_official') &&
        (a.name.toLowerCase().includes(search.toLowerCase()) || a.emailOrPhone.toLowerCase().includes(search.toLowerCase()) || a.barangayCode.includes(search));
    }
  });

  // Pagination Math
  const totalPages = Math.ceil(filteredAccounts.length / ITEMS_PER_PAGE);
  const startIndex = (currentPage - 1) * ITEMS_PER_PAGE;
  const currentAccountItems = filteredAccounts.slice(startIndex, startIndex + ITEMS_PER_PAGE);

  const fieldGroupStyle = { marginBottom: '16px' };
  const labelStyle = {
    display: 'block', fontSize: '11px', fontWeight: 700, color: 'var(--ink-soft)',
    marginBottom: '6px', textTransform: 'uppercase', letterSpacing: '0.05em',
  };
  const inputStyle = {
    width: '100%', padding: '10px 14px', borderRadius: 'var(--radius-inner)',
    border: '1.5px solid var(--border)', fontSize: '14px', outline: 'none',
    fontFamily: 'var(--font-sans)', color: 'var(--ink)', background: 'var(--card)',
    boxSizing: 'border-box',
  };

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

      {/* ── Pop-Up Card Modal for Creating Account ── */}
      {isCreateModalOpen && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(14, 42, 58, 0.8)', backdropFilter: 'blur(4px)', display: 'flex', alignItems: 'flex-start', justifyContent: 'center', zIndex: 99999, padding: '40px 16px', overflowY: 'auto' }}>
          <div className="clay-card page-animate" style={{ maxWidth: 540, width: '100%', padding: 28, background: 'var(--card)', borderRadius: 'var(--radius-card)', boxShadow: '0 20px 40px rgba(0,0,0,0.3)', margin: 'auto 0' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16, borderBottom: '1px solid var(--border)', paddingBottom: 12 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                {editingAccount ? <Edit3 size={22} color="var(--manila-blue)" /> : <UserPlus size={22} color="var(--manila-blue)" />}
                <h2 style={{ fontSize: 18, fontWeight: 900, color: 'var(--manila-blue)', margin: 0 }}>
                  {editingAccount ? 'Edit Account Details' : 'Create Official LGU Account'}
                </h2>
              </div>
              <button onClick={() => setIsCreateModalOpen(false)} className="clay-button-ghost" style={{ padding: '4px 10px', fontSize: 13 }}>✕ Close</button>
            </div>

            {statusMsg.text && (
              <div style={{
                padding: '10px 14px', borderRadius: 'var(--radius-inner)', marginBottom: '16px',
                fontSize: '13px', fontWeight: 600,
                background: statusMsg.type === 'error' ? 'rgba(198,86,75,0.08)' : 'rgba(21,138,100,0.08)',
                color: statusMsg.type === 'error' ? 'var(--danger)' : 'var(--bay-teal)',
                border: statusMsg.type === 'error' ? '1px solid rgba(198,86,75,0.25)' : '1px solid rgba(21,138,100,0.25)',
              }}>
                {statusMsg.text}
              </div>
            )}

            <form onSubmit={handleProvisionRequest}>
              {/* Role Selection */}
              <div style={fieldGroupStyle}>
                <label style={labelStyle}>Account Role Type</label>
                <div style={{ display: 'flex', gap: '8px' }}>
                  {isSuperAdmin ? (
                    <>
                      <button
                        type="button"
                        onClick={() => setTargetRole('lgu_admin')}
                        className={targetRole === 'lgu_admin' ? 'clay-button-primary' : 'clay-button-ghost'}
                        style={{ flex: 1, padding: '8px', fontSize: 12, justifyContent: 'center' }}
                      >
                        <Shield size={14} /> LGU Admin
                      </button>
                      <button
                        type="button"
                        onClick={() => setTargetRole('barangay_official')}
                        className={targetRole === 'barangay_official' ? 'clay-button-primary' : 'clay-button-ghost'}
                        style={{ flex: 1, padding: '8px', fontSize: 12, justifyContent: 'center' }}
                      >
                        <Shield size={14} /> Official
                      </button>
                    </>
                  ) : (
                    <>
                      <button
                        type="button"
                        onClick={() => setTargetRole('field_staff')}
                        className={targetRole === 'field_staff' ? 'clay-button-primary' : 'clay-button-ghost'}
                        style={{ flex: 1, padding: '8px', fontSize: 12, justifyContent: 'center' }}
                      >
                        <Users size={14} /> Field Staff
                      </button>
                      <button
                        type="button"
                        onClick={() => setTargetRole('barangay_official')}
                        className={targetRole === 'barangay_official' ? 'clay-button-primary' : 'clay-button-ghost'}
                        style={{ flex: 1, padding: '8px', fontSize: 12, justifyContent: 'center' }}
                      >
                        <Shield size={14} /> Official
                      </button>
                    </>
                  )}
                </div>
              </div>

              {/* Full Name & Employee ID */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                <div style={fieldGroupStyle}>
                  <label style={labelStyle}>Full Name *</label>
                  <input
                    type="text"
                    placeholder="e.g. Maria R. Cruz"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    style={inputStyle}
                    required
                  />
                </div>
                <div style={fieldGroupStyle}>
                  <label style={labelStyle}>Employee / Staff ID *</label>
                  <input
                    type="text"
                    placeholder="e.g. EMP-MNL-4821"
                    value={employeeId}
                    onChange={(e) => setEmployeeId(e.target.value)}
                    style={inputStyle}
                    required
                  />
                </div>
              </div>

              {/* Email & Contact Phone */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                <div style={fieldGroupStyle}>
                  <label style={labelStyle}>Official Email Address *</label>
                  <input
                    type="email"
                    placeholder="e.g. m.cruz@manila.gov.ph"
                    value={emailOrPhone}
                    onChange={(e) => setEmailOrPhone(e.target.value)}
                    style={inputStyle}
                    required
                  />
                </div>
                <div style={fieldGroupStyle}>
                  <label style={labelStyle}>Contact Phone *</label>
                  <input
                    type="text"
                    placeholder="e.g. 0917 123 4567"
                    value={contactNum}
                    onChange={(e) => setContactNum(e.target.value)}
                    style={inputStyle}
                    required
                  />
                </div>
              </div>

              {/* Department & Barangay Scope */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                <div style={fieldGroupStyle}>
                  <label style={labelStyle}>Department / Division</label>
                  <input
                    type="text"
                    placeholder="e.g. MDRRMO Field Ops"
                    value={department}
                    onChange={(e) => setDepartment(e.target.value)}
                    style={inputStyle}
                  />
                </div>
                {targetRole !== 'lgu_admin' ? (
                  <div style={fieldGroupStyle}>
                    <label style={labelStyle}>Assigned Barangay</label>
                    <select
                      id="provision-assigned-barangay"
                      aria-label="Select Assigned Barangay"
                      value={barangayCode}
                      onChange={(e) => setBarangayCode(e.target.value)}
                      style={{ ...inputStyle, cursor: 'pointer' }}
                    >
                      <option value="291">Barangay 291</option>
                      <option value="292">Barangay 292</option>
                      <option value="293">Barangay 293</option>
                      <option value="294">Barangay 294</option>
                      <option value="295">Barangay 295</option>
                    </select>
                  </div>
                ) : (
                  <div style={fieldGroupStyle}>
                    <label style={labelStyle}>Jurisdiction Scope</label>
                    <input type="text" value="City-Wide Manila" disabled style={{ ...inputStyle, background: 'var(--sampaguita)', color: 'var(--ink-soft)' }} />
                  </div>
                )}
              </div>

              {/* Initial Password */}
              <div style={{ ...fieldGroupStyle, marginBottom: 20 }}>
                <label style={labelStyle}>Initial Temporary Password *</label>
                <input
                  type="password"
                  placeholder="Assign initial password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  style={inputStyle}
                  required
                />
              </div>

              <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
                <button type="button" onClick={() => setIsCreateModalOpen(false)} className="clay-button-ghost" style={{ fontSize: 13 }}>Cancel</button>
                <button type="submit" className="clay-button-primary" style={{ fontSize: 13 }} disabled={loading}>
                  {editingAccount ? <Edit3 size={16} /> : <UserPlus size={16} />}
                  {loading ? (editingAccount ? 'Saving…' : 'Creating…') : (editingAccount ? 'Save Changes' : 'Create Account')}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ── Page Header ── */}
      <div className="workflow-header" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 28, flexWrap: 'wrap', gap: 16 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
          <div style={{
            width: 48, height: 48, borderRadius: 'var(--radius-inner)',
            background: isSuperAdmin ? 'linear-gradient(135deg, #1E1B4B, #312E81)' : 'linear-gradient(135deg, var(--manila-blue), #1e5a7a)',
            display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
          }}>
            {isSuperAdmin ? <Shield size={24} color="#F59E0B" /> : <Users size={24} color="#fff" />}
          </div>
          <div>
            <h1 className="section-header" style={{ margin: 0, fontSize: '22px' }}>
              Account Management
            </h1>
            <p style={{ fontSize: '13px', color: 'var(--ink-soft)', marginTop: '2px' }}>
              Official Directory & Account Management for Manila City LGU Admins, Field Staff, and Barangay Officials.
            </p>
          </div>
        </div>

        <button onClick={openCreateModal} className="clay-button-primary" style={{ padding: '10px 18px', fontSize: 13, gap: 8 }}>
          <UserPlus size={17} /> Create Account
        </button>
      </div>

      <div>

        {/* ── RIGHT: Accounts Directory Table ── */}
        <div className="clay-card" style={{ padding: 0, overflow: 'hidden' }}>
          <div style={{ padding: '16px 20px', borderBottom: '1px solid var(--border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 12 }}>
            <div>
              <h2 style={{ fontSize: '16px', fontWeight: 800, color: 'var(--ink)', margin: 0 }}>
                {isSuperAdmin ? 'Executive Accounts Directory' : 'Field Staff Accounts Directory'}
              </h2>
              <span style={{ fontSize: 12, color: 'var(--ink-soft)' }}>
                {isSuperAdmin ? 'Active LGU Admin & Barangay Official accounts list' : 'Active Field Staff accounts list'} ({filteredAccounts.length})
              </span>
            </div>
            
            <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
              {/* TOP HEADER PAGINATION */}
              {totalPages > 1 && (
                <div style={{ display: 'flex', gap: 4, alignItems: 'center' }}>
                  <button
                    onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                    disabled={currentPage === 1}
                    className="clay-button-ghost"
                    style={{ fontSize: 11, padding: '3px 8px', opacity: currentPage === 1 ? 0.5 : 1 }}
                  >
                    Prev
                  </button>
                  {Array.from({ length: totalPages }, (_, i) => i + 1).map(pageNum => (
                    <button
                      key={pageNum}
                      onClick={() => setCurrentPage(pageNum)}
                      className={currentPage === pageNum ? 'clay-button-primary' : 'clay-button-ghost'}
                      style={{ fontSize: 11, width: 26, height: 26, padding: 0, justifyContent: 'center', fontWeight: currentPage === pageNum ? 800 : 600 }}
                    >
                      {pageNum}
                    </button>
                  ))}
                  <button
                    onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                    disabled={currentPage === totalPages}
                    className="clay-button-ghost"
                    style={{ fontSize: 11, padding: '3px 8px', opacity: currentPage === totalPages ? 0.5 : 1 }}
                  >
                    Next
                  </button>
                </div>
              )}

              <div style={{ display: 'flex', alignItems: 'center', gap: 8, background: 'var(--sampaguita)', border: '1px solid var(--border)', padding: '5px 10px', borderRadius: 'var(--radius-pill)' }}>
                <Search size={14} color="var(--ink-soft)" />
                <input
                  value={search}
                  aria-label="Search account name"
                  onChange={e => setSearch(e.target.value)}
                  placeholder="Search account name..."
                  style={{ border: 'none', outline: 'none', fontSize: 12, background: 'transparent', color: 'var(--ink)', width: 140 }}
                />
              </div>
            </div>
          </div>

          <table className="clay-table">
            <thead>
              <tr>
                <th>Account Name / Email</th>
                <th>Role</th>
                <th>Scope</th>
                <th>Status</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredAccounts.length === 0 ? (
                <tr>
                  <td colSpan={5} style={{ textAlign: 'center', padding: '32px 16px', color: 'var(--ink-soft)' }}>
                    No accounts found matching your search.
                  </td>
                </tr>
              ) : (
                currentAccountItems.map(acc => (
                  <tr key={acc.id}>
                    <td>
                      <div style={{ fontWeight: 700, color: 'var(--ink)', fontSize: 14 }}>{acc.name}</div>
                      <div style={{ fontSize: 12, color: 'var(--ink-soft)' }}>{acc.emailOrPhone}</div>
                    </td>
                    <td>
                      <span style={{
                        background: acc.role === 'lgu_admin' ? '#F5F3FF' : acc.role === 'field_staff' ? '#FEF3C7' : '#EFF6FF',
                        color: acc.role === 'lgu_admin' ? '#7C3AED' : acc.role === 'field_staff' ? '#B45309' : '#1D4ED8',
                        fontSize: 11, fontWeight: 800, padding: '3px 9px', borderRadius: 999
                      }}>
                        {acc.role === 'lgu_admin' ? 'LGU Admin' : acc.role === 'field_staff' ? 'Field Staff' : 'Barangay Official'}
                      </span>
                    </td>
                    <td>
                      <span style={{ fontSize: 12, fontWeight: 700, color: 'var(--manila-blue)' }}>
                        {acc.barangayCode === 'City-Wide' ? 'City-Wide' : `Brgy ${acc.barangayCode}`}
                      </span>
                    </td>
                    <td>
                      {acc.status === 'active' ? (
                        <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4, background: 'rgba(21,138,100,0.1)', color: '#158A64', fontSize: 11, fontWeight: 700, padding: '2px 8px', borderRadius: 999 }}>
                          <CheckCircle size={12} /> Active
                        </span>
                      ) : (
                        <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4, background: '#FEF2F2', color: '#DC2626', fontSize: 11, fontWeight: 700, padding: '2px 8px', borderRadius: 999 }}>
                          <UserX size={12} /> Suspended
                        </span>
                      )}
                    </td>
                    <td>
                      <div style={{ display: 'flex', gap: 6 }}>
                        <button
                          onClick={() => openEditModal(acc)}
                          title="Edit Account Details"
                          className="clay-button-ghost"
                          style={{ fontSize: 11, padding: '4px 8px', gap: 4, height: 26, color: 'var(--manila-blue)', borderColor: 'rgba(37,99,235,0.3)' }}
                        >
                          <Edit3 size={12} /> Edit
                        </button>
                        <button
                          onClick={() => requestToggleStatus(acc)}
                          title={acc.status === 'active' ? 'Suspend Account' : 'Reactivate Account'}
                          className={acc.status === 'active' ? 'clay-button-danger' : 'clay-button-approve'}
                          style={{ fontSize: 11, padding: '4px 8px', gap: 4, height: 26 }}
                        >
                          <Power size={12} /> {acc.status === 'active' ? 'Suspend' : 'Reactivate'}
                        </button>
                        <button
                          onClick={() => requestDeleteAccount(acc)}
                          title="Delete Account"
                          className="clay-button-ghost"
                          style={{ fontSize: 11, padding: '4px 8px', gap: 4, height: 26, color: '#DC2626', borderColor: 'rgba(220,38,38,0.3)' }}
                        >
                          <Trash2 size={12} /> Delete
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>

          {/* ── Pagination Bar: Page 1, Page 2, Page N ── */}
          {totalPages > 1 && (
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '12px 18px', background: 'var(--card)', borderTop: '1px solid var(--border)', flexWrap: 'wrap', gap: 12 }}>
              <div style={{ fontSize: 12, color: 'var(--ink-soft)' }}>
                Showing <strong>{startIndex + 1}–{Math.min(startIndex + ITEMS_PER_PAGE, filteredAccounts.length)}</strong> of <strong>{filteredAccounts.length}</strong> accounts
              </div>

              <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
                <button
                  onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                  disabled={currentPage === 1}
                  className="clay-button-ghost"
                  style={{ fontSize: 11, padding: '4px 10px', opacity: currentPage === 1 ? 0.5 : 1 }}
                >
                  Previous
                </button>

                {Array.from({ length: totalPages }, (_, i) => i + 1).map(pageNum => (
                  <button
                    key={pageNum}
                    onClick={() => setCurrentPage(pageNum)}
                    className={currentPage === pageNum ? 'clay-button-primary' : 'clay-button-ghost'}
                    style={{ fontSize: 11, width: 28, height: 28, padding: 0, justifyContent: 'center', fontWeight: currentPage === pageNum ? 800 : 600 }}
                  >
                    {pageNum}
                  </button>
                ))}

                <button
                  onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                  disabled={currentPage === totalPages}
                  className="clay-button-ghost"
                  style={{ fontSize: 11, padding: '4px 10px', opacity: currentPage === totalPages ? 0.5 : 1 }}
                >
                  Next
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

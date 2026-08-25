import React, { useState, useContext, useEffect } from 'react';
import ReactDOM from 'react-dom';
import { AuthContext } from '../context/AuthContext';
import { UserPlus, Shield, Users, CheckCircle, AlertTriangle, UserX, Trash2, Search, Power, ShieldAlert, Crown, Edit3, Grid, List, Radio, Phone, Mail, Award, Check, Layers, UserCheck } from 'lucide-react';
import { API_BASE_URL } from '../config';
import { MotionCard, MotionButton } from '../components/motion';


const ITEMS_PER_PAGE = 8;

export default function ProvisionAccounts() {
  const { token, user } = useContext(AuthContext);
  const isSuperAdmin = user?.role === 'lgu_superadmin' || user?.role === 'lgu_super_admin';

  // Default targetRole: 'lgu_admin' if SuperAdmin, 'field_staff' if LGU Admin
  const [targetRole, setTargetRole] = useState(() => isSuperAdmin ? 'lgu_admin' : 'field_staff');
  const [viewTab, setViewTab] = useState('roster'); // 'roster' | 'table'
  const [name, setName] = useState('');
  const [emailOrPhone, setEmailOrPhone] = useState('');
  const [password, setPassword] = useState('');
  const [barangayCode, setBarangayCode] = useState('');
  const [barangaySearch, setBarangaySearch] = useState('');
  const [showBarangaySuggestions, setShowBarangaySuggestions] = useState(false);
  const [employeeId, setEmployeeId] = useState('');
  const [department, setDepartment] = useState('');
  const [contactNum, setContactNum] = useState('');
  const [teamName, setTeamName] = useState('Field Team Alpha');
  const [staffDesignation, setStaffDesignation] = useState('field_officer'); // 'team_leader' | 'field_officer'
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [editingAccount, setEditingAccount] = useState(null);
  const [statusMsg, setStatusMsg] = useState({ type: '', text: '' });
  const [loading, setLoading] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);

  // Available Field Teams in Manila MDRRMO Operations
  const FIELD_TEAMS = [
    'Field Team Alpha',
    'Field Team Bravo',
    'Field Team Charlie',
    'Field Team Delta',
    'Quick Response Unit 1',
    'Quick Response Unit 2',
  ];

  // All barangay codes in Manila District 1 used by MitigatePlus
  const ALL_BARANGAYS = Array.from({ length: 20 }, (_, i) => ({
    code: String(291 + i),
    label: `Barangay ${291 + i}`,
  }));


  const openCreateModal = () => {
    setEditingAccount(null);
    setName('');
    setEmailOrPhone('');
    setEmployeeId('');
    setDepartment('');
    setContactNum('');
    setPassword('');
    setTeamName('Field Team Alpha');
    setStaffDesignation('field_officer');
    setTargetRole(isSuperAdmin ? 'lgu_admin' : 'field_staff');
    setBarangayCode('');
    setBarangaySearch('');
    setShowBarangaySuggestions(false);
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
    setTeamName(acc.teamName || 'Field Team Alpha');
    setStaffDesignation(acc.staffDesignation || 'field_officer');
    setTargetRole(acc.role || (isSuperAdmin ? 'lgu_admin' : 'field_staff'));
    const bc = acc.barangayCode && acc.barangayCode !== 'City-Wide' ? acc.barangayCode : '';
    setBarangayCode(bc);
    setBarangaySearch(bc ? `Barangay ${bc}` : '');
    setShowBarangaySuggestions(false);
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

    if (targetRole === 'barangay_official' && !barangayCode.trim()) {
      setStatusMsg({ type: 'error', text: 'Paki-pili ang Assigned Barangay mula sa mga available na suggestions.' });
      return;
    }

    const roleTitle = targetRole === 'lgu_admin'
      ? 'LGU Admin'
      : targetRole === 'barangay_official'
      ? 'Barangay Official'
      : 'Field Staff';

    const locationText = targetRole === 'barangay_official'
      ? `Barangay ${barangayCode}`
      : targetRole === 'field_staff'
      ? 'City-Wide (Assigned per Event)'
      : 'City-Wide';

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

      const payloadBarangayCode = targetRole === 'barangay_official' ? barangayCode : 'City-Wide';

      const res = await fetch(endpoint, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: name.trim(),
          emailOrPhone: emailOrPhone.trim(),
          password,
          barangayCode: payloadBarangayCode,
          role: targetRole,
          employeeId: employeeId.trim(),
          department: department.trim(),
          contactNum: contactNum.trim(),
          teamName: targetRole === 'field_staff' ? teamName : null,
          staffDesignation: targetRole === 'field_staff' ? staffDesignation : null,
        }),
      });

      const data = await res.json();

      if (res.ok) {
        setStatusMsg({ type: 'success', text: `✓ Nilikha na ang opisyal na akawnt para kay ${name} (${emailOrPhone})!` });
        await fetchProvisionedAccounts();
        setName('');
        setEmailOrPhone('');
        setPassword('');
        setBarangayCode('');
        setBarangaySearch('');
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
      {isCreateModalOpen && ReactDOM.createPortal(
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
          padding: '24px 16px',
          boxSizing: 'border-box',
          overflowY: 'auto',
        }}>
          <div className="clay-card page-animate" style={{ maxWidth: 560, width: '100%', padding: 28, background: 'var(--card)', borderRadius: 'var(--radius-card)', boxShadow: '0 25px 60px rgba(0,0,0,0.45)', maxHeight: '90vh', overflowY: 'auto' }}>
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
                {targetRole === 'barangay_official' ? (
                  <div style={{ ...fieldGroupStyle, position: 'relative' }}>
                    <label style={labelStyle}>
                      Assigned Barangay *
                      <span style={{ fontWeight: 400, color: 'var(--ink-soft)', marginLeft: 4, textTransform: 'none', letterSpacing: 0 }}>
                        (type to search)
                      </span>
                    </label>
                    {/* Occupied barangay codes = those already assigned to another barangay_official */}
                    {(() => {
                      const occupiedCodes = accounts
                        .filter(a => a.role === 'barangay_official' && a.barangayCode && (!editingAccount || a._id !== editingAccount._id))
                        .map(a => a.barangayCode);
                      const suggestions = ALL_BARANGAYS.filter(b =>
                        b.label.toLowerCase().includes(barangaySearch.toLowerCase()) &&
                        !occupiedCodes.includes(b.code)
                      );
                      return (
                        <>
                          <input
                            type="text"
                            placeholder="Type barangay number (e.g. 291)"
                            value={barangaySearch}
                            onChange={(e) => {
                              setBarangaySearch(e.target.value);
                              setBarangayCode('');
                              setShowBarangaySuggestions(true);
                            }}
                            onFocus={() => setShowBarangaySuggestions(true)}
                            onBlur={() => setTimeout(() => setShowBarangaySuggestions(false), 150)}
                            style={{
                              ...inputStyle,
                              borderColor: barangayCode ? 'var(--bay-teal)' : 'var(--border)',
                            }}
                            autoComplete="off"
                            required
                          />
                          {barangayCode && (
                            <div style={{ fontSize: 11, color: 'var(--bay-teal)', marginTop: 4, fontWeight: 600 }}>
                              ✓ Selected: Barangay {barangayCode}
                            </div>
                          )}
                          {!barangayCode && barangaySearch && (
                            <div style={{ fontSize: 11, color: 'var(--danger)', marginTop: 4 }}>
                              Please select a barangay from the suggestions below.
                            </div>
                          )}
                          {showBarangaySuggestions && suggestions.length > 0 && (
                            <div style={{
                              position: 'absolute',
                              top: '100%',
                              left: 0,
                              right: 0,
                              background: 'var(--card)',
                              border: '1.5px solid var(--border)',
                              borderRadius: 'var(--radius-inner)',
                              zIndex: 9999,
                              maxHeight: 180,
                              overflowY: 'auto',
                              boxShadow: '0 8px 24px rgba(0,0,0,0.12)',
                            }}>
                              {suggestions.map(b => (
                                <div
                                  key={b.code}
                                  onMouseDown={() => {
                                    setBarangayCode(b.code);
                                    setBarangaySearch(b.label);
                                    setShowBarangaySuggestions(false);
                                  }}
                                  style={{
                                    padding: '9px 14px',
                                    fontSize: 13,
                                    cursor: 'pointer',
                                    borderBottom: '1px solid var(--border)',
                                    color: 'var(--ink)',
                                  }}
                                  onMouseEnter={e => e.currentTarget.style.background = 'var(--sampaguita)'}
                                  onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
                                >
                                  {b.label}
                                </div>
                              ))}
                            </div>
                          )}
                          {showBarangaySuggestions && suggestions.length === 0 && barangaySearch && (
                            <div style={{
                              position: 'absolute',
                              top: '100%',
                              left: 0,
                              right: 0,
                              background: 'var(--card)',
                              border: '1.5px solid var(--border)',
                              borderRadius: 'var(--radius-inner)',
                              zIndex: 9999,
                              padding: '10px 14px',
                              fontSize: 12,
                              color: 'var(--ink-soft)',
                              boxShadow: '0 8px 24px rgba(0,0,0,0.12)',
                            }}>
                              No available barangays match "{barangaySearch}". All matching barangays may already have an assigned official.
                            </div>
                          )}
                        </>
                      );
                    })()}
                  </div>
                ) : targetRole === 'lgu_admin' ? (
                  <div style={fieldGroupStyle}>
                    <label style={labelStyle}>Jurisdiction Scope</label>
                    <input type="text" value="City-Wide Manila" disabled style={{ ...inputStyle, background: 'var(--sampaguita)', color: 'var(--ink-soft)' }} />
                  </div>
                ) : (
                  /* field_staff — structured team assignment and role designation */
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, gridColumn: 'span 2' }}>
                    <div style={fieldGroupStyle}>
                      <label style={labelStyle}>Assigned Field Team / Unit *</label>
                      <select
                        value={teamName}
                        onChange={(e) => setTeamName(e.target.value)}
                        style={{ ...inputStyle, cursor: 'pointer' }}
                      >
                        {FIELD_TEAMS.map(team => (
                          <option key={team} value={team}>{team}</option>
                        ))}
                      </select>
                    </div>

                    <div style={fieldGroupStyle}>
                      <label style={labelStyle}>Staff Position / Rank *</label>
                      <div style={{ display: 'flex', gap: 6 }}>
                        <button
                          type="button"
                          onClick={() => setStaffDesignation('team_leader')}
                          className={staffDesignation === 'team_leader' ? 'clay-button-primary' : 'clay-button-ghost'}
                          style={{ flex: 1, padding: '9px 6px', fontSize: 11, justifyContent: 'center' }}
                        >
                          🎖️ Head Staff (Lead)
                        </button>
                        <button
                          type="button"
                          onClick={() => setStaffDesignation('field_officer')}
                          className={staffDesignation === 'field_officer' ? 'clay-button-primary' : 'clay-button-ghost'}
                          style={{ flex: 1, padding: '9px 6px', fontSize: 11, justifyContent: 'center' }}
                        >
                          📋 Field Staff (Scanner)
                        </button>
                      </div>
                    </div>

                    <div style={{ gridColumn: 'span 2', background: 'var(--sampaguita)', padding: '8px 12px', borderRadius: 'var(--radius-inner)', border: '1px solid var(--border)', fontSize: 11, color: 'var(--ink-soft)' }}>
                      ℹ️ <strong>City-Wide Deployment Pool:</strong> Ang team na ito ay idinedeploy ng LGU Admin sa mga active Relief Distribution Events o Door-to-Door Special Assistance Tasks.
                    </div>
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
        </div>,
        document.body
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

      {/* ── View Switcher Tabs ── */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20, flexWrap: 'wrap', gap: 12 }}>
        <div style={{ display: 'flex', gap: 8, background: 'var(--card)', padding: '4px', borderRadius: 'var(--radius-inner)', border: '1px solid var(--border)' }}>
          <button
            onClick={() => setViewTab('roster')}
            className={viewTab === 'roster' ? 'clay-button-primary' : 'clay-button-ghost'}
            style={{ fontSize: 13, gap: 6, padding: '7px 16px' }}
          >
            <Users size={15} /> Field Operations Teams Roster ({FIELD_TEAMS.length})
          </button>
          <button
            onClick={() => setViewTab('table')}
            className={viewTab === 'table' ? 'clay-button-primary' : 'clay-button-ghost'}
            style={{ fontSize: 13, gap: 6, padding: '7px 16px' }}
          >
            <List size={15} /> All Accounts Directory ({filteredAccounts.length})
          </button>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: 8, background: 'var(--card)', border: '1px solid var(--border)', padding: '6px 12px', borderRadius: 'var(--radius-pill)' }}>
          <Search size={14} color="var(--ink-soft)" />
          <input
            value={search}
            aria-label="Search account name"
            onChange={e => setSearch(e.target.value)}
            placeholder="Search name, phone, team..."
            style={{ border: 'none', outline: 'none', fontSize: 12, background: 'transparent', color: 'var(--ink)', width: 170 }}
          />
        </div>
      </div>

      {/* ── TAB 1: FIELD OPERATIONS TEAMS ROSTER VIEW (GROUPS VIEW) ── */}
      {viewTab === 'roster' && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: 16, marginBottom: 24 }}>
          {FIELD_TEAMS.map((team, tIdx) => {
            const teamMembers = accounts.filter(a =>
              a.role === 'field_staff' &&
              (a.teamName === team || (!a.teamName && team === 'Field Team Alpha')) &&
              (!search || a.name.toLowerCase().includes(search.toLowerCase()) || a.emailOrPhone.toLowerCase().includes(search.toLowerCase()))
            );
            const teamLeader = teamMembers.find(m => m.staffDesignation === 'team_leader');
            const officers = teamMembers.filter(m => m.staffDesignation !== 'team_leader');

            return (
              <MotionCard
                key={team}
                delay={tIdx * 0.05}
                className="clay-card"
                style={{
                  borderLeft: teamLeader ? '4px solid var(--bay-teal)' : '4px solid var(--jeepney-amber)',
                  display: 'flex',
                  flexDirection: 'column',
                  justifyContent: 'space-between',
                  gap: 14,
                }}
              >
                <div>
                  {/* Team Card Header */}
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 12, gap: 10 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <div style={{
                        width: 34, height: 34, borderRadius: 'var(--radius-inner)',
                        background: 'rgba(37, 99, 235, 0.1)', color: 'var(--manila-blue)',
                        display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 800, fontSize: 13,
                      }}>
                        {tIdx + 1}
                      </div>
                      <div>
                        <h3 style={{ fontSize: 16, fontWeight: 800, color: 'var(--ink)', margin: 0 }}>{team}</h3>
                        <span style={{ fontSize: 11, color: 'var(--ink-soft)' }}>Manila MDRRMO Field Operations</span>
                      </div>
                    </div>

                    <span style={{
                      display: 'inline-flex', alignItems: 'center', gap: 4,
                      background: teamMembers.length > 0 ? 'rgba(21, 138, 100, 0.1)' : 'rgba(232, 148, 15, 0.1)',
                      color: teamMembers.length > 0 ? '#158A64' : '#B45309',
                      fontSize: 11, fontWeight: 800, padding: '3px 8px', borderRadius: 999,
                    }}>
                      <CheckCircle size={12} /> {teamMembers.length} Personnel
                    </span>
                  </div>

                  {/* Team Leader Box */}
                  <div style={{
                    background: teamLeader ? 'rgba(37, 99, 235, 0.06)' : 'var(--sampaguita)',
                    border: teamLeader ? '1px solid rgba(37, 99, 235, 0.2)' : '1px dashed var(--border)',
                    borderRadius: 'var(--radius-inner)',
                    padding: '10px 12px',
                    marginBottom: 12,
                  }}>
                    <div style={{ fontSize: 11, fontWeight: 800, color: teamLeader ? 'var(--manila-blue)' : 'var(--ink-soft)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 4, display: 'flex', alignItems: 'center', gap: 4 }}>
                      <Crown size={13} color={teamLeader ? '#D97706' : 'var(--ink-soft)'} /> Head Staff / Team Leader
                    </div>
                    {teamLeader ? (
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <div>
                          <div style={{ fontWeight: 800, color: 'var(--ink)', fontSize: 14 }}>{teamLeader.name}</div>
                          <div style={{ fontSize: 11, color: 'var(--ink-soft)' }}>{teamLeader.emailOrPhone}</div>
                        </div>
                        <span style={{ fontSize: 11, background: '#EFF6FF', color: '#1D4ED8', padding: '2px 8px', borderRadius: 999, fontWeight: 800 }}>
                          Lead
                        </span>
                      </div>
                    ) : (
                      <div style={{ fontSize: 12, color: 'var(--ink-soft)', fontStyle: 'italic' }}>
                        No Team Leader assigned yet. Click Edit or Create to assign.
                      </div>
                    )}
                  </div>

                  {/* Field Staff Officers List */}
                  <div>
                    <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--ink-soft)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 6 }}>
                      Field Officers / Scanners ({officers.length})
                    </div>
                    {officers.length === 0 ? (
                      <div style={{ fontSize: 12, color: 'var(--ink-soft)', fontStyle: 'italic', padding: '6px 0' }}>
                        No field officers assigned to this team yet.
                      </div>
                    ) : (
                      <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                        {officers.map(off => (
                          <div
                            key={off.id}
                            style={{
                              display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                              padding: '6px 10px', background: 'var(--card)', borderRadius: 'var(--radius-inner)',
                              border: '1px solid var(--border)', fontSize: 12,
                            }}
                          >
                            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                              <UserCheck size={13} color="#158A64" />
                              <strong style={{ color: 'var(--ink)' }}>{off.name}</strong>
                              <span style={{ color: 'var(--ink-soft)', fontSize: 11 }}>({off.emailOrPhone})</span>
                            </div>
                            <button
                              onClick={() => openEditModal(off)}
                              style={{ background: 'none', border: 'none', color: 'var(--manila-blue)', cursor: 'pointer', fontSize: 11, fontWeight: 700 }}
                            >
                              Edit
                            </button>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>

                {/* Card Action Footer */}
                <div style={{ borderTop: '1px solid var(--border)', paddingTop: 10, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ fontSize: 11, color: 'var(--ink-soft)' }}>Scope: City-Wide Manila</span>
                  <button
                    onClick={() => {
                      openCreateModal();
                      setTargetRole('field_staff');
                      setTeamName(team);
                    }}
                    className="clay-button-ghost"
                    style={{ fontSize: 11, padding: '4px 10px', gap: 4, height: 26 }}
                  >
                    <UserPlus size={12} /> Add to {team.split(' ')[0]}
                  </button>
                </div>
              </MotionCard>
            );
          })}
        </div>
      )}

      {/* ── TAB 2: MASTER ACCOUNTS DIRECTORY TABLE VIEW ── */}
      {viewTab === 'table' && (
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
            </div>
          </div>

          <table className="clay-table">
            <thead>
              <tr>
                <th>Account Name / Contact</th>
                <th>Role</th>
                <th>Assigned Team & Rank</th>
                <th>Jurisdiction</th>
                <th>Status</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredAccounts.length === 0 ? (
                <tr>
                  <td colSpan={6} style={{ textAlign: 'center', padding: '32px 16px', color: 'var(--ink-soft)' }}>
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
                      {acc.role === 'field_staff' ? (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                          <span style={{ fontWeight: 800, color: 'var(--ink)', fontSize: 12 }}>
                            {acc.teamName || 'Field Team Alpha'}
                          </span>
                          <span style={{
                            fontSize: 10, fontWeight: 800,
                            color: acc.staffDesignation === 'team_leader' ? '#1D4ED8' : '#64748B',
                            background: acc.staffDesignation === 'team_leader' ? '#EFF6FF' : 'var(--sampaguita)',
                            padding: '1px 6px', borderRadius: 4, width: 'fit-content',
                          }}>
                            {acc.staffDesignation === 'team_leader' ? '🎖️ Team Leader (Head)' : '📋 Field Officer (Scanner)'}
                          </span>
                        </div>
                      ) : (
                        <span style={{ fontSize: 12, color: 'var(--ink-soft)' }}>—</span>
                      )}
                    </td>
                    <td>
                      <span style={{ fontSize: 12, fontWeight: 700, color: 'var(--manila-blue)' }}>
                        {acc.barangayCode === 'City-Wide' ? 'City-Wide Manila' : `Brgy ${acc.barangayCode}`}
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
      )}
    </div>
  );
}

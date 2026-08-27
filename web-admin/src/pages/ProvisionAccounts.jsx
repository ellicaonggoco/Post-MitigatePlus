import React, { useState, useContext, useEffect } from 'react';
import ReactDOM from 'react-dom';
import { AuthContext } from '../context/AuthContext';
import { UserPlus, Shield, Users, CheckCircle, AlertTriangle, UserX, Trash2, Search, Power, ShieldAlert, Crown, Edit3, Grid, List, Radio, Phone, Mail, Award, Check, Layers, UserCheck, Eye, EyeOff } from 'lucide-react';
import { API_BASE_URL } from '../config';
import { MotionCard, MotionButton } from '../components/motion';
import ConfirmModal from '../components/ConfirmModal';


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
  const [showPassword, setShowPassword] = useState(false);
  const [barangayCode, setBarangayCode] = useState('');
  const [barangaySearch, setBarangaySearch] = useState('');
  const [showBarangaySuggestions, setShowBarangaySuggestions] = useState(false);
  const [employeeId, setEmployeeId] = useState('');
  const [department, setDepartment] = useState('');
  const [contactNum, setContactNum] = useState('');
  const [teamName, setTeamName] = useState('Field Team Alpha');
  const [staffDesignation, setStaffDesignation] = useState('field_officer'); // 'team_leader' | 'field_officer'
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [lockedTeam, setLockedTeam] = useState(null);
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

  // All barangay codes in the entire City of Manila (Barangay 1 to Barangay 905)
  const ALL_BARANGAYS = Array.from({ length: 905 }, (_, i) => ({
    code: String(i + 1),
    label: `Barangay ${i + 1}`,
  }));


  const openCreateModal = () => {
    setEditingAccount(null);
    setLockedTeam(null);
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

  const openCreateModalForTeam = (team) => {
    setEditingAccount(null);
    setLockedTeam(team);
    setName('');
    setEmailOrPhone('');
    setEmployeeId('');
    setDepartment('MDRRMO Field Operations');
    setContactNum('');
    setPassword('');
    setTeamName(team);
    setStaffDesignation('field_officer');
    setTargetRole('field_staff');
    setBarangayCode('City-Wide');
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

  // ── Create New Account / Update Account ──
  const handleProvisionRequest = async (e) => {
    e.preventDefault();
    setStatusMsg({ type: '', text: '' });

    if (!emailOrPhone.trim() || !password.trim() || !contactNum.trim()) {
      setStatusMsg({ type: 'error', text: 'Please complete all required fields.' });
      return;
    }

    let finalBrgyCode = barangayCode.trim();
    let finalName = name.trim();
    let finalEmployeeId = employeeId.trim();
    let finalDepartment = department.trim();

    if (targetRole === 'barangay_official') {
      if (!finalBrgyCode) {
        const numOnly = barangaySearch.replace(/\D/g, '');
        if (numOnly) finalBrgyCode = numOnly;
      }
      if (!finalBrgyCode) {
        setStatusMsg({ type: 'error', text: 'Please select an assigned Barangay from the suggestions.' });
        return;
      }
      // For Barangay Official: Name is automatically "Barangay [Code]"
      finalName = `Barangay ${finalBrgyCode}`;
      finalEmployeeId = `BRGY-${finalBrgyCode}`;
      finalDepartment = 'Barangay Local Government Unit';
    } else {
      if (!finalName || !finalEmployeeId) {
        setStatusMsg({ type: 'error', text: 'Please complete all required employee and identification fields.' });
        return;
      }
    }

    setLoading(true);

    // If editing existing account
    if (editingAccount) {
      try {
        const targetId = editingAccount.id || editingAccount._id;
        const res = await fetch(`${API_BASE_URL}/auth/provisioned-users/${targetId}`, {
          method: 'PUT',
          headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
          body: JSON.stringify({
            name: finalName,
            emailOrPhone: emailOrPhone.trim(),
            department: finalDepartment,
            employeeId: finalEmployeeId,
            contactNum: contactNum.trim(),
            teamName: targetRole === 'field_staff' ? teamName : null,
            staffDesignation: targetRole === 'field_staff' ? staffDesignation : null,
            barangayCode: targetRole === 'barangay_official' ? finalBrgyCode : 'City-Wide',
          }),
        });

        const data = await res.json();
        if (res.ok) {
          setStatusMsg({ type: 'success', text: `Account for ${finalName} has been updated successfully!` });
          await fetchProvisionedAccounts();
          setEditingAccount(null);
          setIsCreateModalOpen(false);
        } else {
          setStatusMsg({ type: 'error', text: data.message || 'Failed to update account.' });
        }
      } catch (err) {
        console.error('Update account error:', err);
        setStatusMsg({ type: 'error', text: 'Server error while updating account.' });
      } finally {
        setLoading(false);
      }
      return;
    }

    // Creating new account
    try {
      const endpoint = targetRole === 'barangay_official'
        ? `${API_BASE_URL}/auth/provision-official`
        : targetRole === 'lgu_admin'
        ? `${API_BASE_URL}/auth/provision-admin`
        : `${API_BASE_URL}/auth/provision-staff`;

      const payloadBarangayCode = targetRole === 'barangay_official' ? finalBrgyCode : 'City-Wide';

      const res = await fetch(endpoint, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: finalName,
          emailOrPhone: emailOrPhone.trim(),
          password,
          barangayCode: payloadBarangayCode,
          role: targetRole,
          employeeId: finalEmployeeId,
          department: finalDepartment,
          contactNum: contactNum.trim(),
          teamName: targetRole === 'field_staff' ? teamName : null,
          staffDesignation: targetRole === 'field_staff' ? staffDesignation : null,
        }),
      });

      const data = await res.json();

      if (res.ok) {
        setStatusMsg({ type: 'success', text: `Official account created successfully for ${finalName} (${emailOrPhone})!` });
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
        setStatusMsg({ type: 'error', text: data.message || 'Failed to create account.' });
      }
    } catch (err) {
      console.error('Provisioning error:', err);
      setStatusMsg({ type: 'error', text: 'Network/server error while creating account.' });
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
      message: `Are you sure you want to ${isAct ? 'suspend' : 'reactivate'} the account of ${acc.name}? ${isAct ? 'They will lose access to the system.' : 'They will regain access to the system.'}`,
      type: isAct ? 'danger' : 'success',
      confirmText: isAct ? 'Oo, I-suspend' : 'Oo, I-reactivate',
      onConfirm: async () => {
        try {
          const targetId = acc.id || acc._id;
          const res = await fetch(`${API_BASE_URL}/auth/provisioned-users/${targetId}/status`, {
            method: 'PATCH',
            headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
          });
          const data = await res.json();
          if (res.ok) {
            setStatusMsg({ type: 'success', text: ` Status ni ${acc.name}: ${data.status || 'Updated'}` });
            await fetchProvisionedAccounts();
          } else {
            setStatusMsg({ type: 'error', text: data.message || 'Nabigo ang pag-update ng status.' });
          }
        } catch (err) {
          console.error('Toggle status error:', err);
          setStatusMsg({ type: 'error', text: 'Error habang nag-a-update ng status.' });
        } finally {
          closeConfirm();
        }
      },
    });
  };

  // ── Delete Account ──
  const requestDeleteAccount = (acc) => {
    setModal({
      isOpen: true,
      title: 'Delete Account?',
      message: `Are you sure you want to permanently DELETE the account of ${acc.name} (${acc.emailOrPhone})? This action cannot be undone.`,
      type: 'danger',
      confirmText: 'Yes, Delete Account',
      onConfirm: async () => {
        try {
          const targetId = acc.id || acc._id;
          const res = await fetch(`${API_BASE_URL}/auth/provisioned-users/${targetId}`, {
            method: 'DELETE',
            headers: { Authorization: `Bearer ${token}` },
          });
          const data = await res.json();
          if (res.ok) {
            setStatusMsg({ type: 'success', text: ` Nabura na ang akawnt ni ${acc.name}.` });
            await fetchProvisionedAccounts();
          } else {
            setStatusMsg({ type: 'error', text: data.message || 'Nabigo ang pagbura ng akawnt.' });
          }
        } catch (err) {
          console.error('Delete account error:', err);
          setStatusMsg({ type: 'error', text: 'Error habang binubura ang akawnt.' });
        } finally {
          closeConfirm();
        }
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
                  {editingAccount ? 'Edit Account Details' : lockedTeam ? `Add Field Staff (${lockedTeam})` : 'Create Official LGU Account'}
                </h2>
              </div>
              <button onClick={() => setIsCreateModalOpen(false)} className="clay-button-ghost" style={{ padding: '4px 10px', fontSize: 13 }}> Close</button>
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
              {/* Role Selection (Only shown for general Create Account, hidden when adding to a specific Field Team) */}
              {!lockedTeam && !editingAccount && (
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
              )}

              {/* Dynamic Form Fields based on Role */}
              {targetRole === 'barangay_official' ? (
                <>
                  {/* Assigned Barangay Search */}
                  <div style={{ ...fieldGroupStyle, position: 'relative', marginBottom: 12 }}>
                    <label style={labelStyle}>
                      Assigned Barangay *
                      <span style={{ fontWeight: 400, color: 'var(--ink-soft)', marginLeft: 4, textTransform: 'none', letterSpacing: 0 }}>
                        (type to search number or name)
                      </span>
                    </label>
                    {/* Occupied barangay codes = those already assigned to another barangay_official */}
                    {(() => {
                      const occupiedCodes = accounts
                        .filter(a => a.role === 'barangay_official' && a.barangayCode && (!editingAccount || a._id !== editingAccount._id))
                        .map(a => String(a.barangayCode));
                      
                      const rawTerm = barangaySearch.toLowerCase().trim();
                      const cleanNum = rawTerm.replace(/\D/g, '');

                      const suggestions = ALL_BARANGAYS.filter(b => {
                        if (occupiedCodes.includes(b.code)) return false;
                        if (!rawTerm) return true;
                        return (
                          b.label.toLowerCase().includes(rawTerm) ||
                          b.code === rawTerm ||
                          (cleanNum && (b.code === cleanNum || b.code.startsWith(cleanNum))) ||
                          `brgy ${b.code}`.toLowerCase().includes(rawTerm)
                        );
                      }).slice(0, 5);
                      return (
                        <>
                          <input
                            type="text"
                            placeholder="Type barangay number (e.g. 344 or 291)"
                            value={barangaySearch}
                            onChange={(e) => {
                              const val = e.target.value;
                              setBarangaySearch(val);
                              // Auto-match exact code if typed directly
                              const numOnly = val.replace(/\D/g, '');
                              const exactMatch = ALL_BARANGAYS.find(b => b.code === numOnly || b.label.toLowerCase() === val.toLowerCase().trim());
                              if (exactMatch && !occupiedCodes.includes(exactMatch.code)) {
                                setBarangayCode(exactMatch.code);
                              } else {
                                setBarangayCode('');
                              }
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
                            <div style={{ fontSize: 12, color: 'var(--bay-teal)', marginTop: 4, fontWeight: 700 }}>
                              ✓ Selected: Barangay {barangayCode} (Account Name: Barangay {barangayCode})
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
                              top: 'calc(100% + 4px)',
                              left: 0,
                              right: 0,
                              background: 'var(--card)',
                              border: '1.5px solid var(--border)',
                              borderRadius: 'var(--radius-inner)',
                              zIndex: 9999,
                              maxHeight: 160,
                              overflowY: 'auto',
                              boxShadow: '0 10px 25px rgba(0,0,0,0.15)',
                            }}>
                              {suggestions.map((b, idx) => (
                                <div
                                  key={b.code}
                                  onMouseDown={() => {
                                    setBarangayCode(b.code);
                                    setBarangaySearch(b.label);
                                    setShowBarangaySuggestions(false);
                                  }}
                                  style={{
                                    padding: '8px 12px',
                                    fontSize: 12.5,
                                    cursor: 'pointer',
                                    borderBottom: idx === suggestions.length - 1 ? 'none' : '1px solid var(--border)',
                                    color: 'var(--ink)',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'space-between',
                                  }}
                                  onMouseEnter={e => e.currentTarget.style.background = 'var(--sampaguita)'}
                                  onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
                                >
                                  <span style={{ fontWeight: 600 }}>{b.label}</span>
                                  <span style={{ fontSize: 10.5, color: 'var(--ink-soft)', background: 'var(--card-hover)', padding: '1px 6px', borderRadius: 4 }}>Code: {b.code}</span>
                                </div>
                              ))}
                            </div>
                          )}
                        </>
                      );
                    })()}
                  </div>

                  {/* Email & Contact Phone */}
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 12 }}>
                    <div style={fieldGroupStyle}>
                      <label style={labelStyle}>Official Email Address *</label>
                      <input
                        type="email"
                        placeholder="e.g. official344@manila.gov.ph"
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
                </>
              ) : (
                <>
                  {/* Full Name & Employee ID */}
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 12 }}>
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
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 12 }}>
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

                  {/* Department & Scope */}
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 12 }}>
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
                    {targetRole === 'lgu_admin' ? (
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
                              ️ Head Staff (Lead)
                            </button>
                            <button
                              type="button"
                              onClick={() => setStaffDesignation('field_officer')}
                              className={staffDesignation === 'field_officer' ? 'clay-button-primary' : 'clay-button-ghost'}
                              style={{ flex: 1, padding: '9px 6px', fontSize: 11, justifyContent: 'center' }}
                            >
                              Field Staff (Scanner)
                            </button>
                          </div>
                        </div>

                        <div style={{ gridColumn: 'span 2', background: 'var(--sampaguita)', padding: '8px 12px', borderRadius: 'var(--radius-inner)', border: '1px solid var(--border)', fontSize: 11, color: 'var(--ink-soft)' }}>
                          ℹ️ <strong>City-Wide Deployment Pool:</strong> Ang team na ito ay idinedeploy ng LGU Admin sa mga active Relief Distribution Events o Door-to-Door Special Assistance Tasks.
                        </div>
                      </div>
                    )}
                  </div>
                </>
              )}

              {/* Initial Password with Show / Hide Toggle */}
              <div style={{ ...fieldGroupStyle, marginBottom: 20 }}>
                <label style={labelStyle}>Initial Temporary Password *</label>
                <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
                  <input
                    type={showPassword ? 'text' : 'password'}
                    placeholder="Assign initial password (min 6 characters)"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    style={{ ...inputStyle, paddingRight: 40 }}
                    required
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    style={{
                      position: 'absolute',
                      right: 10,
                      background: 'none',
                      border: 'none',
                      cursor: 'pointer',
                      color: 'var(--ink-soft)',
                      display: 'flex',
                      alignItems: 'center',
                      padding: 4,
                    }}
                    aria-label="Toggle password visibility"
                  >
                    {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                  </button>
                </div>
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
                    onClick={() => openCreateModalForTeam(team)}
                    className="clay-button-ghost"
                    style={{ fontSize: 11, padding: '4px 10px', gap: 4, height: 26 }}
                  >
                    <UserPlus size={12} /> Add Staff to {team}
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
                            {acc.staffDesignation === 'team_leader' ? '️ Team Leader (Head)' : ' Field Officer (Scanner)'}
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

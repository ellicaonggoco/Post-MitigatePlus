import React, { useState, useContext, useEffect } from 'react';
import ReactDOM from 'react-dom';
import { AuthContext } from '../context/AuthContext';
import { UserPlus, Shield, Users, CheckCircle, AlertTriangle, UserX, Trash2, Search, Power, ShieldAlert, Crown, Edit3, Grid, List, Radio, Phone, Mail, Award, Check, Layers, UserCheck, Eye, EyeOff, Info, RefreshCw, Home, QrCode, Plus, X, AlertCircle, Printer, Download, MapPin } from 'lucide-react';
import { API_BASE_URL } from '../config';
import { MotionCard, MotionButton } from '../components/motion';
import ConfirmModal from '../components/ConfirmModal';
import SearchableBarangaySelect from '../components/SearchableBarangaySelect';

export default function ProvisionAccounts() {
  const { token, user } = useContext(AuthContext);
  const isSuperAdmin = user?.role === 'lgu_superadmin' || user?.role === 'lgu_super_admin';

  // Default targetRole: 'lgu_admin' if SuperAdmin, 'field_staff' if LGU Admin
  const [targetRole, setTargetRole] = useState(() => isSuperAdmin ? 'lgu_admin' : 'field_staff');
  const [viewTab, setViewTab] = useState('roster'); // 'roster' | 'table' | 'residents'
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
  const [itemsPerPage, setItemsPerPage] = useState(8);
  const [residentPage, setResidentPage] = useState(1);
  const [residentItemsPerPage, setResidentItemsPerPage] = useState(8);

  // Resident Accounts & Modal States
  const [residentAccounts, setResidentAccounts] = useState([]);
  const [loadingResidents, setLoadingResidents] = useState(true);
  const [qrModalData, setQrModalData] = useState(null);

  // Resident Registration Fields
  const [address, setAddress] = useState('');
  const [purok, setPurok] = useState('');
  const [damageLevel, setDamageLevel] = useState('Minor');
  const [validIdType, setValidIdType] = useState('Philippine National ID (PhilSys / PhilID)');
  const [validIdNumber, setValidIdNumber] = useState('');
  const [membersList, setMembersList] = useState([]);

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


  // Philippine Government IDs for Resident Registration
  const PHILIPPINE_GOVERNMENT_IDS = [
    'Philippine National ID (PhilSys / PhilID)',
    "Driver's License (LTO)",
    'Philippine Passport (DFA)',
    'SSS / UMID Card',
    'GSIS eCard',
    "Voter's ID / Certificate (COMELEC)",
    'Senior Citizen ID (OSCA)',
    'Person with Disability (PWD) ID',
    'Barangay ID / Certificate of Residency',
    'Postal ID (PhilPost)',
    'PhilHealth ID',
    'Solo Parent ID',
  ];

  const addFamilyMember = () => {
    setMembersList(prev => [
      ...prev,
      { name: '', relationship: 'Child', age: '', specialConditions: [] }
    ]);
  };

  const updateFamilyMember = (index, field, value) => {
    setMembersList(prev => {
      const copy = [...prev];
      copy[index] = { ...copy[index], [field]: value };
      return copy;
    });
  };

  const toggleSpecialCondition = (index, condition) => {
    setMembersList(prev => {
      const copy = [...prev];
      const curr = copy[index].specialConditions || [];
      if (curr.includes(condition)) {
        copy[index].specialConditions = curr.filter(c => c !== condition);
      } else {
        copy[index].specialConditions = [...curr, condition];
      }
      return copy;
    });
  };

  const removeFamilyMember = (index) => {
    setMembersList(prev => prev.filter((_, i) => i !== index));
  };

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
    setTargetRole(viewTab === 'residents' ? 'resident' : (isSuperAdmin ? 'lgu_admin' : 'field_staff'));
    setBarangayCode('');
    setBarangaySearch('');
    setShowBarangaySuggestions(false);
    setAddress('');
    setPurok('');
    setDamageLevel('Minor');
    setValidIdType('Philippine National ID (PhilSys / PhilID)');
    setValidIdNumber('');
    setMembersList([]);
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
    setAddress('');
    setPurok('');
    setDamageLevel('Minor');
    setValidIdType('Philippine National ID (PhilSys / PhilID)');
    setValidIdNumber('');
    setMembersList([]);
    setStatusMsg({ type: '', text: '' });
    setIsCreateModalOpen(true);
  };

  const openEditModal = (acc) => {
    setEditingAccount(acc);
    setLockedTeam(null);
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

  const openEditResidentModal = (res) => {
    setEditingAccount(res);
    setLockedTeam(null);
    setTargetRole('resident');
    setName(res.name || '');
    setEmailOrPhone(res.emailOrPhone || res.contactNum || '');
    setContactNum(res.contactNum || res.emailOrPhone || '');
    setPassword('');
    const hh = res.household || {};
    const bc = res.barangayCode || hh.barangayCode || '';
    setBarangayCode(bc && bc !== 'City-Wide' && bc !== 'N/A' ? bc : '');
    setBarangaySearch(bc && bc !== 'City-Wide' && bc !== 'N/A' ? `Barangay ${bc}` : '');
    setShowBarangaySuggestions(false);
    setAddress(hh.address || '');
    setPurok(hh.purok || '');
    setDamageLevel(hh.damageLevel || 'Minor');
    setValidIdType(hh.validIdType || 'Philippine National ID (PhilSys / PhilID)');
    setValidIdNumber(hh.validIdNumber || '');
    setMembersList(Array.isArray(hh.members) ? JSON.parse(JSON.stringify(hh.members)) : []);
    setStatusMsg({ type: '', text: '' });
    setIsCreateModalOpen(true);
  };

  // Accounts List State
  const [accounts, setAccounts] = useState([]);
  const [loadingAccounts, setLoadingAccounts] = useState(true);

  // Fetch real provisioned accounts from backend on mount
  const fetchProvisionedAccounts = async () => {
    if (!token) return;
    setLoadingAccounts(true);
    try {
      const res = await fetch(`${API_BASE_URL}/auth/provisioned-users`, {
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
      });
      if (res.ok) {
        const data = await res.json();
        if (Array.isArray(data)) {
          setAccounts(data);
        }
      } else {
        console.warn('Failed to fetch provisioned accounts, HTTP status:', res.status);
      }
    } catch (err) {
      console.error('Failed to fetch provisioned accounts:', err);
    } finally {
      setLoadingAccounts(false);
    }
  };

  // Fetch real registered resident accounts from backend on mount
  const fetchResidentAccounts = async () => {
    if (!token) return;
    setLoadingResidents(true);
    try {
      const res = await fetch(`${API_BASE_URL}/auth/resident-users`, {
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
      });
      if (res.ok) {
        const data = await res.json();
        if (Array.isArray(data)) {
          setResidentAccounts(data);
        }
      } else {
        console.warn('Failed to fetch resident accounts, HTTP status:', res.status);
      }
    } catch (err) {
      console.error('Failed to fetch resident accounts:', err);
    } finally {
      setLoadingResidents(false);
    }
  };

  useEffect(() => {
    fetchProvisionedAccounts();
    fetchResidentAccounts();
  }, [token]);

  const [search, setSearch] = useState('');
  const [selectedBarangayFilter, setSelectedBarangayFilter] = useState('all');

  // Reset to page 1 when search or barangay filter changes
  useEffect(() => {
    setCurrentPage(1);
    setResidentPage(1);
  }, [search, selectedBarangayFilter]);

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

    // Handle Resident / Citizen Account Creation OR Update
    if (targetRole === 'resident') {
      if (!name.trim() || !emailOrPhone.trim() || !address.trim() || !purok.trim()) {
        setStatusMsg({ type: 'error', text: 'Punan ang lahat ng kinakailangang impormasyon ng residente (Pangalan, Mobile Phone, Barangay, Address, Purok).' });
        return;
      }
      if (!editingAccount && !password.trim()) {
        setStatusMsg({ type: 'error', text: 'Kinakailangan ang password para sa bagong rehistradong resident account.' });
        return;
      }
      let finalBrgyCode = barangayCode.trim();
      if (!finalBrgyCode) {
        const numOnly = barangaySearch.replace(/\D/g, '');
        if (numOnly) finalBrgyCode = numOnly;
      }
      if (!finalBrgyCode) {
        setStatusMsg({ type: 'error', text: 'Pumili ng Barangay para sa residente mula sa suggestions.' });
        return;
      }

      setLoading(true);

      // If editing existing resident
      if (editingAccount) {
        try {
          const targetId = editingAccount.id || editingAccount._id;
          const res = await fetch(`${API_BASE_URL}/auth/resident-users/${targetId}`, {
            method: 'PUT',
            headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
            body: JSON.stringify({
              name: name.trim(),
              emailOrPhone: emailOrPhone.trim(),
              password: password.trim() ? password.trim() : undefined,
              barangayCode: finalBrgyCode,
              address: address.trim(),
              purok: purok.trim(),
              damageLevel,
              validIdType,
              validIdNumber: validIdNumber.trim(),
              members: membersList.filter(m => m.name && m.name.trim()),
            }),
          });

          const data = await res.json();
          if (res.ok) {
            setStatusMsg({ type: 'success', text: `✅ Na-update na ang resident account at household profile ni ${name.trim()}!` });
            await fetchResidentAccounts();
            setEditingAccount(null);
            setIsCreateModalOpen(false);
          } else {
            setStatusMsg({ type: 'error', text: data.message || 'Nabigo ang pag-update ng resident account.' });
          }
        } catch (err) {
          console.error('Update resident error:', err);
          setStatusMsg({ type: 'error', text: 'Error habang ina-update ang resident account.' });
        } finally {
          setLoading(false);
        }
        return;
      }

      // If creating new resident
      try {
        const res = await fetch(`${API_BASE_URL}/auth/provision-resident`, {
          method: 'POST',
          headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
          body: JSON.stringify({
            name: name.trim(),
            emailOrPhone: emailOrPhone.trim(),
            password: password.trim(),
            barangayCode: finalBrgyCode,
            address: address.trim(),
            purok: purok.trim(),
            damageLevel,
            validIdType,
            validIdNumber: validIdNumber.trim(),
            members: membersList.filter(m => m.name && m.name.trim()),
          }),
        });

        const data = await res.json();
        if (res.ok) {
          setStatusMsg({ type: 'success', text: `✅ Nalikha at na-pre-verify na ang resident account ni ${name.trim()}!` });
          await fetchResidentAccounts();
          setName('');
          setEmailOrPhone('');
          setPassword('');
          setBarangayCode('');
          setBarangaySearch('');
          setAddress('');
          setPurok('');
          setDamageLevel('Minor');
          setValidIdNumber('');
          setMembersList([]);
          setIsCreateModalOpen(false);
          setViewTab('residents');
        } else {
          setStatusMsg({ type: 'error', text: data.message || 'Nabigo ang paglikha ng resident account.' });
        }
      } catch (err) {
        console.error('Create resident error:', err);
        setStatusMsg({ type: 'error', text: 'Error habang ginagawa ang resident account.' });
      } finally {
        setLoading(false);
      }
      return;
    }

    if (!editingAccount) {
      if (!emailOrPhone.trim() || !password.trim() || !contactNum.trim()) {
        setStatusMsg({ type: 'error', text: 'Please complete all required fields.' });
        return;
      }
    } else {
      if (!emailOrPhone.trim() || !contactNum.trim()) {
        setStatusMsg({ type: 'error', text: 'Please complete all required fields.' });
        return;
      }
    }

    let finalBrgyCode = barangayCode.trim();
    let finalName = name.trim();
    let finalEmployeeId = employeeId.trim();
    let finalDepartment = department.trim();
    let finalContactNum = contactNum.trim();

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
    } else if (targetRole === 'field_staff') {
      // For Field Staff: Phone number is the Staff ID for uniform mobile login
      if (!finalContactNum && finalEmployeeId) {
        finalContactNum = finalEmployeeId;
      }
      if (!finalEmployeeId && finalContactNum) {
        finalEmployeeId = finalContactNum;
      }
      if (!finalName || !finalContactNum) {
        setStatusMsg({ type: 'error', text: 'Please complete all required fields (Full Name and Mobile Phone Number).' });
        return;
      }
    } else {
      if (!finalName || !finalEmployeeId) {
        setStatusMsg({ type: 'error', text: 'Please complete all required employee and identification fields.' });
        return;
      }
    }

    setLoading(true);

    // If editing existing staff / admin account
    if (editingAccount) {
      try {
        const targetId = editingAccount.id || editingAccount._id;
        const res = await fetch(`${API_BASE_URL}/auth/provisioned-users/${targetId}`, {
          method: 'PUT',
          headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
          body: JSON.stringify({
            name: finalName,
            emailOrPhone: emailOrPhone.trim(),
            password: password.trim() ? password.trim() : undefined,
            department: finalDepartment,
            employeeId: finalEmployeeId,
            contactNum: finalContactNum,
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
          contactNum: finalContactNum,
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

  // ── Suspend / Reactivate Resident Account ──
  const requestToggleResidentStatus = (resAcc) => {
    const isAct = resAcc.isActive !== false;
    setModal({
      isOpen: true,
      title: isAct ? 'I-suspend ang Residente?' : 'I-reactivate ang Residente?',
      message: `Sigurado ka bang nais mong ${isAct ? 'i-suspend' : 'i-reactivate'} ang resident account ni ${resAcc.name} (${resAcc.emailOrPhone})? ${isAct ? 'Hindi muna makakapag-login ang residente sa mobile app.' : 'Makakapag-login at magagamit muli ng residente ang mobile app.'}`,
      type: isAct ? 'danger' : 'success',
      confirmText: isAct ? 'Oo, I-suspend' : 'Oo, I-reactivate',
      onConfirm: async () => {
        try {
          const targetId = resAcc.id || resAcc._id;
          const res = await fetch(`${API_BASE_URL}/auth/resident-users/${targetId}/status`, {
            method: 'PATCH',
            headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
          });
          const data = await res.json();
          if (res.ok) {
            setStatusMsg({ type: 'success', text: `Status ni ${resAcc.name}: ${data.status || 'Updated'}` });
            await fetchResidentAccounts();
          } else {
            setStatusMsg({ type: 'error', text: data.message || 'Nabigo ang pag-update ng resident status.' });
          }
        } catch (err) {
          console.error('Toggle resident status error:', err);
          setStatusMsg({ type: 'error', text: 'Error habang nag-a-update ng resident status.' });
        } finally {
          closeConfirm();
        }
      },
    });
  };

  // ── Delete Resident Account ──
  const requestDeleteResident = (resAcc) => {
    setModal({
      isOpen: true,
      title: 'Burahin ang Resident Account?',
      message: `Sigurado ka bang nais mong permanenteng BURAHIN ang resident account at household data ni ${resAcc.name} (${resAcc.emailOrPhone})? Hindi na ito maibabalik.`,
      type: 'danger',
      confirmText: 'Oo, Burahin Nang Permanente',
      onConfirm: async () => {
        try {
          const targetId = resAcc.id || resAcc._id;
          const res = await fetch(`${API_BASE_URL}/auth/resident-users/${targetId}`, {
            method: 'DELETE',
            headers: { Authorization: `Bearer ${token}` },
          });
          const data = await res.json();
          if (res.ok) {
            setStatusMsg({ type: 'success', text: `Nabura na ang resident account ni ${resAcc.name}.` });
            await fetchResidentAccounts();
          } else {
            setStatusMsg({ type: 'error', text: data.message || 'Nabigo ang pagbura ng resident account.' });
          }
        } catch (err) {
          console.error('Delete resident error:', err);
          setStatusMsg({ type: 'error', text: 'Error habang binubura ang resident account.' });
        } finally {
          closeConfirm();
        }
      },
    });
  };

  // Filter accounts displayed:
  // Filter accounts displayed:
  // Provisioned subordinates list: LGU Admins, Barangay Officials, and Field Staff.
  // SuperAdmin accounts and the currently logged-in user's own account are excluded from this directory.
  const q = (search || '').trim().toLowerCase();
  const currentUserId = user?._id || user?.id;
  const filteredAccounts = accounts.filter(a => {
    if (!a) return false;

    // Do not show SuperAdmin accounts or the logged-in user's own account in this management directory
    const isSuperAdminRole = a.role === 'lgu_superadmin' || a.role === 'lgu_super_admin';
    const isSelf = (currentUserId && (a._id === currentUserId || a.id === currentUserId)) ||
      (user?.emailOrPhone && a.emailOrPhone && a.emailOrPhone.toLowerCase() === user.emailOrPhone.toLowerCase());
    if (isSuperAdminRole || isSelf) return false;

    const name = String(a.name || '').toLowerCase();
    const emailOrPhone = String(a.emailOrPhone || '').toLowerCase();
    const contactNum = String(a.contactNum || '').toLowerCase();
    const employeeId = String(a.employeeId || '').toLowerCase();
    const brgyRaw = String(a.barangayCode || '').trim();
    const brgy = brgyRaw.toLowerCase();
    const team = String(a.teamName || '').toLowerCase();

    const matchesSearch = !q ||
      name.includes(q) ||
      emailOrPhone.includes(q) ||
      contactNum.includes(q) ||
      employeeId.includes(q) ||
      brgy.includes(q) ||
      team.includes(q);

    const isCityWide = !brgyRaw || brgy === 'city-wide' || brgy === 'citywide' || brgy === 'all' || a.role === 'lgu_admin';
    const matchesBarangay = viewTab !== 'residents' || selectedBarangayFilter === 'all' ||
      isCityWide ||
      brgy === String(selectedBarangayFilter).trim().toLowerCase() ||
      brgy === `brgy ${String(selectedBarangayFilter).trim().toLowerCase()}` ||
      brgy === `barangay ${String(selectedBarangayFilter).trim().toLowerCase()}`;

    if (isSuperAdmin) {
      return (a.role === 'lgu_admin' || a.role === 'barangay_official' || a.role === 'field_staff') && matchesSearch && matchesBarangay;
    } else {
      return (a.role === 'field_staff' || a.role === 'barangay_official') && matchesSearch && matchesBarangay;
    }
  });

  // Filter resident accounts displayed
  const filteredResidents = residentAccounts.filter(r => {
    if (!r) return false;
    const name = String(r.name || '').toLowerCase();
    const phone = String(r.emailOrPhone || r.contactNum || '').toLowerCase();
    const brgyRaw = String(r.barangayCode || r.household?.barangayCode || '').trim();
    const brgy = brgyRaw.toLowerCase();
    const addr = String(r.household?.address || '').toLowerCase();
    const pur = String(r.household?.purok || '').toLowerCase();
    const qr = String(r.household?.qrCode || '').toLowerCase();

    const matchesSearch = !q ||
      name.includes(q) ||
      phone.includes(q) ||
      brgy.includes(q) ||
      addr.includes(q) ||
      pur.includes(q) ||
      qr.includes(q);

    const matchesBarangay = selectedBarangayFilter === 'all' ||
      brgy === String(selectedBarangayFilter).trim().toLowerCase() ||
      brgy === `brgy ${String(selectedBarangayFilter).trim().toLowerCase()}` ||
      brgy === `barangay ${String(selectedBarangayFilter).trim().toLowerCase()}`;

    return matchesSearch && matchesBarangay;
  });

  // Pagination Math for Residents
  const residentTotalPages = Math.max(1, Math.ceil(filteredResidents.length / residentItemsPerPage));
  const residentStartIndex = (residentPage - 1) * residentItemsPerPage;
  const currentResidentItems = filteredResidents.slice(residentStartIndex, residentStartIndex + residentItemsPerPage);

  // Pagination Math
  const totalPages = Math.max(1, Math.ceil(filteredAccounts.length / itemsPerPage));
  const startIndex = (currentPage - 1) * itemsPerPage;
  const currentAccountItems = filteredAccounts.slice(startIndex, startIndex + itemsPerPage);

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
                  {editingAccount
                    ? (targetRole === 'resident' ? `Edit Resident: ${editingAccount.name}` : `Edit Account: ${editingAccount.name}`)
                    : lockedTeam
                    ? `Add Field Staff (${lockedTeam})`
                    : 'Create Official LGU Account'}
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
                  <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
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
                          onClick={() => setTargetRole('resident')}
                          className={targetRole === 'resident' ? 'clay-button-primary' : 'clay-button-ghost'}
                          style={{ flex: 1, padding: '8px', fontSize: 12, justifyContent: 'center' }}
                        >
                          <Home size={14} /> Resident
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
                        <button
                          type="button"
                          onClick={() => setTargetRole('resident')}
                          className={targetRole === 'resident' ? 'clay-button-primary' : 'clay-button-ghost'}
                          style={{ flex: 1, padding: '8px', fontSize: 12, justifyContent: 'center' }}
                        >
                          <Home size={14} /> Resident
                        </button>
                      </>
                    )}
                  </div>
                </div>
              )}

              {/* Dynamic Form Fields based on Role */}
              {targetRole === 'resident' ? (
                <>
                  {/* Automatic Pre-Verification Notice */}
                  <div style={{
                    padding: '10px 14px', borderRadius: 'var(--radius-inner)',
                    background: 'rgba(21, 138, 100, 0.08)', border: '1px solid rgba(21, 138, 100, 0.25)',
                    marginBottom: 14, display: 'flex', alignItems: 'center', gap: 10,
                  }}>
                    <CheckCircle size={18} color="#158A64" style={{ flexShrink: 0 }} />
                    <div style={{ fontSize: 12, color: '#158A64', lineHeight: 1.4 }}>
                      <strong>Automatic Admin Pre-Verification:</strong> Because this resident is registered directly by LGU Administration, this account will automatically be marked <strong>Verified</strong> with an active Official QR Pass and Priority Index score.
                    </div>
                  </div>

                  {/* Resident Name & Contact Phone */}
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 12 }}>
                    <div style={fieldGroupStyle}>
                      <label style={labelStyle}>Head of Household Full Name *</label>
                      <input
                        type="text"
                        placeholder="e.g. Juan M. Dela Cruz"
                        value={name}
                        onChange={(e) => setName(e.target.value)}
                        style={inputStyle}
                        required
                      />
                    </div>
                    <div style={fieldGroupStyle}>
                      <label style={labelStyle}>Mobile Phone (Login ID) *</label>
                      <input
                        type="text"
                        placeholder="e.g. 0917 123 4567"
                        value={emailOrPhone}
                        onChange={(e) => {
                          setEmailOrPhone(e.target.value);
                          setContactNum(e.target.value);
                        }}
                        style={inputStyle}
                        required
                      />
                    </div>
                  </div>

                  {/* Password & Barangay Selection */}
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 12 }}>
                    <div style={fieldGroupStyle}>
                      <label style={labelStyle}>
                        {editingAccount ? 'Reset Password (Optional — leave blank to keep current)' : 'Mobile App Password *'}
                      </label>
                      <div style={{ position: 'relative' }}>
                        <input
                          type={showPassword ? 'text' : 'password'}
                          placeholder={editingAccount ? 'Leave blank to retain current password' : 'Create resident password (min 6 characters)'}
                          value={password}
                          onChange={(e) => setPassword(e.target.value)}
                          style={{ ...inputStyle, paddingRight: '40px' }}
                          required={!editingAccount}
                        />
                        <button
                          type="button"
                          onClick={() => setShowPassword(!showPassword)}
                          style={{
                            position: 'absolute', right: '10px', top: '50%', transform: 'translateY(-50%)',
                            background: 'none', border: 'none', cursor: 'pointer', color: 'var(--ink-soft)', padding: 0
                          }}
                        >
                          {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                        </button>
                      </div>
                    </div>

                    <div style={{ ...fieldGroupStyle, position: 'relative' }}>
                      <label style={labelStyle}>Assigned Barangay *</label>
                      <input
                        type="text"
                        placeholder="Type number (e.g. 291 or 344)"
                        value={barangaySearch}
                        onChange={(e) => {
                          const val = e.target.value;
                          setBarangaySearch(val);
                          const numOnly = val.replace(/\D/g, '');
                          if (numOnly) setBarangayCode(numOnly);
                          setShowBarangaySuggestions(true);
                        }}
                        onFocus={() => setShowBarangaySuggestions(true)}
                        onBlur={() => setTimeout(() => setShowBarangaySuggestions(false), 150)}
                        style={{
                          ...inputStyle,
                          borderColor: barangayCode ? 'var(--bay-teal)' : 'var(--border)',
                        }}
                        required
                      />
                      {showBarangaySuggestions && (
                        <div style={{
                          position: 'absolute', top: '100%', left: 0, right: 0, background: 'var(--card)',
                          border: '1px solid var(--border)', borderRadius: 'var(--radius-inner)',
                          boxShadow: '0 8px 16px rgba(0,0,0,0.15)', zIndex: 100, maxHeight: 160, overflowY: 'auto',
                        }}>
                          {ALL_BARANGAYS.filter(b => {
                            const raw = barangaySearch.toLowerCase().trim();
                            if (!raw) return true;
                            return b.label.toLowerCase().includes(raw) || b.code === raw || b.code.startsWith(raw.replace(/\D/g, ''));
                          }).slice(0, 6).map(b => (
                            <div
                              key={b.code}
                              onMouseDown={() => {
                                setBarangayCode(b.code);
                                setBarangaySearch(`Barangay ${b.code}`);
                                setShowBarangaySuggestions(false);
                              }}
                              style={{
                                padding: '8px 12px', cursor: 'pointer', fontSize: 13,
                                borderBottom: '1px solid var(--border)',
                                background: barangayCode === b.code ? 'rgba(37, 99, 235, 0.08)' : 'transparent',
                              }}
                            >
                              <strong>Barangay {b.code}</strong> — City of Manila
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Address & Purok */}
                  <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: 12, marginBottom: 12 }}>
                    <div style={fieldGroupStyle}>
                      <label style={labelStyle}>Residential Street Address *</label>
                      <input
                        type="text"
                        placeholder="e.g. 1428 Oroquieta St., Sta. Cruz"
                        value={address}
                        onChange={(e) => setAddress(e.target.value)}
                        style={inputStyle}
                        required
                      />
                    </div>
                    <div style={fieldGroupStyle}>
                      <label style={labelStyle}>Purok / Zone *</label>
                      <input
                        type="text"
                        placeholder="e.g. Purok 3 / Zone 27"
                        value={purok}
                        onChange={(e) => setPurok(e.target.value)}
                        style={inputStyle}
                        required
                      />
                    </div>
                  </div>

                  {/* Damage Assessment & Valid ID */}
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 12, marginBottom: 14 }}>
                    <div style={fieldGroupStyle}>
                      <label style={labelStyle}>Damage Assessment</label>
                      <select
                        value={damageLevel}
                        onChange={(e) => setDamageLevel(e.target.value)}
                        style={inputStyle}
                      >
                        <option value="Minor">Minor Damage</option>
                        <option value="Moderate">Moderate Damage</option>
                        <option value="Severe">Severe Damage</option>
                        <option value="Totally Damaged">Totally Damaged</option>
                      </select>
                    </div>
                    <div style={fieldGroupStyle}>
                      <label style={labelStyle}>Government ID Type</label>
                      <select
                        value={validIdType}
                        onChange={(e) => setValidIdType(e.target.value)}
                        style={inputStyle}
                      >
                        {PHILIPPINE_GOVERNMENT_IDS.map(idType => (
                          <option key={idType} value={idType}>{idType}</option>
                        ))}
                      </select>
                    </div>
                    <div style={fieldGroupStyle}>
                      <label style={labelStyle}>Valid ID / Document No.</label>
                      <input
                        type="text"
                        placeholder="e.g. 1234-5678-9012"
                        value={validIdNumber}
                        onChange={(e) => setValidIdNumber(e.target.value)}
                        style={inputStyle}
                      />
                    </div>
                  </div>

                  {/* Family Members Roster Builder */}
                  <div style={{
                    background: 'var(--sampaguita)',
                    border: '1px solid var(--border)',
                    borderRadius: 'var(--radius-inner)',
                    padding: '12px 14px',
                    marginBottom: 14,
                  }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                      <div>
                        <div style={{ fontSize: 12, fontWeight: 800, color: 'var(--ink)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                          Family Members & Vulnerabilities
                        </div>
                        <div style={{ fontSize: 11, color: 'var(--ink-soft)' }}>
                          Head of Household (1) + {membersList.length} members = <strong>Total {membersList.length + 1} family members</strong>
                        </div>
                      </div>
                      <button
                        type="button"
                        onClick={addFamilyMember}
                        className="clay-button-ghost"
                        style={{ fontSize: 11, padding: '4px 10px', height: 26, gap: 4 }}
                      >
                        <Plus size={12} /> Add Member
                      </button>
                    </div>

                    {membersList.length === 0 ? (
                      <div style={{ fontSize: 12, color: 'var(--ink-soft)', fontStyle: 'italic', padding: '6px 0' }}>
                        No additional family members added yet. Tap "+ Add Member" if there are other members in the family.
                      </div>
                    ) : (
                      <div style={{ display: 'flex', flexDirection: 'column', gap: 8, maxHeight: 180, overflowY: 'auto' }}>
                        {membersList.map((mem, mIdx) => (
                          <div
                            key={mIdx}
                            style={{
                              background: 'var(--card)', border: '1px solid var(--border)',
                              borderRadius: 'var(--radius-inner)', padding: '8px 10px',
                            }}
                          >
                            <div style={{ display: 'grid', gridTemplateColumns: '1.5fr 1fr 0.8fr auto', gap: 8, alignItems: 'center', marginBottom: 6 }}>
                              <input
                                type="text"
                                placeholder="Member Full Name"
                                value={mem.name}
                                onChange={(e) => updateFamilyMember(mIdx, 'name', e.target.value)}
                                style={{ ...inputStyle, padding: '6px 10px', fontSize: 12 }}
                              />
                              <select
                                value={mem.relationship}
                                onChange={(e) => updateFamilyMember(mIdx, 'relationship', e.target.value)}
                                style={{ ...inputStyle, padding: '6px 10px', fontSize: 12 }}
                              >
                                <option value="Spouse">Spouse</option>
                                <option value="Child">Child</option>
                                <option value="Parent">Parent</option>
                                <option value="Sibling">Sibling</option>
                                <option value="Grandparent">Grandparent</option>
                                <option value="Relative">Relative</option>
                              </select>
                              <input
                                type="number"
                                placeholder="Age"
                                value={mem.age}
                                onChange={(e) => updateFamilyMember(mIdx, 'age', e.target.value)}
                                style={{ ...inputStyle, padding: '6px 10px', fontSize: 12 }}
                              />
                              <button
                                type="button"
                                onClick={() => removeFamilyMember(mIdx)}
                                style={{ background: 'none', border: 'none', color: 'var(--danger)', cursor: 'pointer', padding: 4 }}
                                title="Remove Member"
                              >
                                <Trash2 size={15} />
                              </button>
                            </div>
                            {/* Vulnerability Checkboxes */}
                            <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', fontSize: 11, color: 'var(--ink-soft)' }}>
                              <label style={{ display: 'inline-flex', alignItems: 'center', gap: 4, cursor: 'pointer' }}>
                                <input
                                  type="checkbox"
                                  checked={mem.specialConditions?.includes('senior') || false}
                                  onChange={() => toggleSpecialCondition(mIdx, 'senior')}
                                />
                                <span>Senior (60+)</span>
                              </label>
                              <label style={{ display: 'inline-flex', alignItems: 'center', gap: 4, cursor: 'pointer' }}>
                                <input
                                  type="checkbox"
                                  checked={mem.specialConditions?.includes('pwd') || false}
                                  onChange={() => toggleSpecialCondition(mIdx, 'pwd')}
                                />
                                <span>PWD</span>
                              </label>
                              <label style={{ display: 'inline-flex', alignItems: 'center', gap: 4, cursor: 'pointer' }}>
                                <input
                                  type="checkbox"
                                  checked={mem.specialConditions?.includes('pregnant') || false}
                                  onChange={() => toggleSpecialCondition(mIdx, 'pregnant')}
                                />
                                <span>Pregnant</span>
                              </label>
                              <label style={{ display: 'inline-flex', alignItems: 'center', gap: 4, cursor: 'pointer' }}>
                                <input
                                  type="checkbox"
                                  checked={mem.specialConditions?.includes('child') || false}
                                  onChange={() => toggleSpecialCondition(mIdx, 'child')}
                                />
                                <span>Child (0-12)</span>
                              </label>
                              <label style={{ display: 'inline-flex', alignItems: 'center', gap: 4, cursor: 'pointer' }}>
                                <input
                                  type="checkbox"
                                  checked={mem.specialConditions?.includes('medical') || false}
                                  onChange={() => toggleSpecialCondition(mIdx, 'medical')}
                                />
                                <span>Medical Needs</span>
                              </label>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </>
              ) : targetRole === 'barangay_official' ? (
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
                            <div style={{ fontSize: 12, color: 'var(--bay-teal)', marginTop: 4, fontWeight: 700, display: 'flex', alignItems: 'center', gap: 4 }}>
                              <Check size={13} /> Selected: Barangay {barangayCode} (Account Name: Barangay {barangayCode})
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
                              zIndex: 9999999,
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
                      <label style={labelStyle}>
                        {targetRole === 'field_staff' ? 'Staff ID (Phone Number) *' : 'Employee / Staff ID *'}
                      </label>
                      <input
                        type="text"
                        placeholder={targetRole === 'field_staff' ? 'e.g. 09236051393' : 'e.g. EMP-MNL-4821'}
                        value={employeeId}
                        onChange={(e) => {
                          const val = e.target.value;
                          setEmployeeId(val);
                          if (targetRole === 'field_staff') {
                            setContactNum(val);
                          }
                        }}
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
                      <label style={labelStyle}>
                        {targetRole === 'field_staff' ? 'Contact Phone (Staff ID) *' : 'Contact Phone *'}
                      </label>
                      <input
                        type="text"
                        placeholder="e.g. 0917 123 4567"
                        value={contactNum}
                        onChange={(e) => {
                          const val = e.target.value;
                          setContactNum(val);
                          if (targetRole === 'field_staff') {
                            setEmployeeId(val);
                          }
                        }}
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
                      /* field_staff - structured team assignment and role designation */
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
                              style={{ flex: 1, padding: '9px 6px', fontSize: 11, justifyContent: 'center', display: 'flex', alignItems: 'center', gap: 4 }}
                            >
                              <Shield size={12} /> Head Staff (Lead)
                            </button>
                            <button
                              type="button"
                              onClick={() => setStaffDesignation('field_officer')}
                              className={staffDesignation === 'field_officer' ? 'clay-button-primary' : 'clay-button-ghost'}
                              style={{ flex: 1, padding: '9px 6px', fontSize: 11, justifyContent: 'center', display: 'flex', alignItems: 'center', gap: 4 }}
                            >
                              <Users size={12} /> Field Staff (Scanner)
                            </button>
                          </div>
                        </div>

                        <div style={{ gridColumn: 'span 2', background: 'var(--sampaguita)', padding: '8px 12px', borderRadius: 'var(--radius-inner)', border: '1px solid var(--border)', fontSize: 11, color: 'var(--ink-soft)', display: 'flex', alignItems: 'flex-start', gap: 6 }}>
                          <Info size={14} style={{ flexShrink: 0, marginTop: 1, color: 'var(--manila-blue)' }} />
                          <span><strong>City-Wide Deployment Pool:</strong> Ang team na ito ay idinedeploy ng LGU Admin sa mga active Relief Distribution Events o Door-to-Door Special Assistance Tasks.</span>
                        </div>
                      </div>
                    )}
                  </div>
                </>
              )}

              {/* Initial Password with Show / Hide Toggle */}
              <div style={{ ...fieldGroupStyle, marginBottom: 20 }}>
                <label style={labelStyle}>
                  {editingAccount ? 'Reset Password (Optional — leave blank to keep current)' : 'Initial Temporary Password *'}
                </label>
                <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
                  <input
                    type={showPassword ? 'text' : 'password'}
                    placeholder={editingAccount ? 'Leave blank to retain current password' : 'Assign initial password (min 6 characters)'}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    style={{ ...inputStyle, paddingRight: 40 }}
                    required={!editingAccount}
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
          {viewTab === 'residents' ? <Home size={17} /> : <UserPlus size={17} />}
          {viewTab === 'residents' ? 'Register Verified Resident' : 'Create Account'}
        </button>
      </div>

      {/* ── View Switcher Tabs & Filter Bar ── */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20, flexWrap: 'wrap', gap: 12, position: 'relative', zIndex: 100 }}>
        <div style={{ display: 'flex', gap: 8, background: 'var(--card)', padding: '4px', borderRadius: 'var(--radius-inner)', border: '1px solid var(--border)', flexWrap: 'wrap' }}>
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
            <List size={15} /> Staff & Officials Directory ({filteredAccounts.length})
          </button>
          <button
            onClick={() => setViewTab('residents')}
            className={viewTab === 'residents' ? 'clay-button-primary' : 'clay-button-ghost'}
            style={{ fontSize: 13, gap: 6, padding: '7px 16px', border: viewTab === 'residents' ? 'none' : '1px solid rgba(21, 138, 100, 0.3)' }}
          >
            <Home size={15} /> Mobile Citizens / Residents ({filteredResidents.length})
          </button>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap', position: 'relative', zIndex: 1050 }}>
          {/* Uniform Searchable Barangay Dropdown Picker - Only visible on Mobile Citizens / Residents tab */}
          {viewTab === 'residents' && (
            <SearchableBarangaySelect
              value={selectedBarangayFilter}
              onChange={(val) => {
                setSelectedBarangayFilter(val);
                setResidentPage(1);
              }}
              style={{ minWidth: '230px', maxWidth: '300px' }}
            />
          )}

          <button
            onClick={() => {
              Promise.all([fetchProvisionedAccounts(), fetchResidentAccounts()]);
            }}
            disabled={loadingResidents || loadingAccounts}
            title="Refresh accounts directory"
            className="clay-button-ghost"
            style={{ height: 34, width: 34, padding: 0, justifyContent: 'center', borderRadius: 'var(--radius-pill)' }}
          >
            <RefreshCw size={14} style={{ animation: (loadingResidents || loadingAccounts) ? 'spin 1s linear infinite' : 'none' }} />
          </button>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, background: 'var(--card)', border: '1px solid var(--border)', padding: '6px 12px', borderRadius: 'var(--radius-pill)' }}>
            <Search size={14} color="var(--ink-soft)" />
            <input
              value={search}
              aria-label="Search accounts or residents"
              onChange={e => setSearch(e.target.value)}
              placeholder={viewTab === 'residents' ? 'Search resident, phone, brgy, qr...' : 'Search name, phone, team...'}
              style={{ border: 'none', outline: 'none', fontSize: 12, background: 'transparent', color: 'var(--ink)', width: viewTab === 'residents' ? 190 : 260 }}
            />
          </div>
        </div>
      </div>

      {/* ── TAB 1: FIELD OPERATIONS TEAMS ROSTER VIEW (GROUPS VIEW) ── */}
      {viewTab === 'roster' && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: 16, marginBottom: 24 }}>
          {FIELD_TEAMS.map((team, tIdx) => {
            const teamMembers = accounts.filter(a => {
              if (!a || a.role !== 'field_staff') return false;
              const belongsToTeam = (a.teamName === team) || (!a.teamName && team === 'Field Team Alpha');
              if (!belongsToTeam) return false;

              if (!q) return true;
              const n = String(a.name || '').toLowerCase();
              const ep = String(a.emailOrPhone || '').toLowerCase();
              const cid = String(a.employeeId || a.contactNum || '').toLowerCase();
              return n.includes(q) || ep.includes(q) || cid.includes(q);
            });
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
                        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                          <span style={{ fontSize: 11, background: '#EFF6FF', color: '#1D4ED8', padding: '2px 8px', borderRadius: 999, fontWeight: 800 }}>
                            Lead
                          </span>
                          <button
                            onClick={() => openEditModal(teamLeader)}
                            style={{ background: 'none', border: 'none', color: 'var(--manila-blue)', cursor: 'pointer', fontSize: 11, fontWeight: 700 }}
                          >
                            Edit
                          </button>
                        </div>
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
                {isSuperAdmin ? 'Executive & Personnel Accounts Directory' : 'All Accounts Directory'}
              </h2>
              <span style={{ fontSize: 12, color: 'var(--ink-soft)' }}>
                {isSuperAdmin ? 'Active LGU Admin, Barangay Official & Field Staff list' : 'Active Field Staff & Barangay Officials list'} ({filteredAccounts.length})
              </span>
            </div>
            
            <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
              {/* TOP HEADER PAGINATION */}
              {filteredAccounts.length > 0 && (
                <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
                  <span style={{ fontSize: 11, color: 'var(--ink-soft)', fontWeight: 600, marginRight: 2 }}>
                    Page {currentPage} of {totalPages}
                  </span>
                  <button
                    onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                    disabled={currentPage === 1}
                    className="clay-button-ghost"
                    style={{ fontSize: 11, padding: '3px 8px', opacity: currentPage === 1 ? 0.4 : 1, cursor: currentPage === 1 ? 'not-allowed' : 'pointer' }}
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
                    style={{ fontSize: 11, padding: '3px 8px', opacity: currentPage === totalPages ? 0.4 : 1, cursor: currentPage === totalPages ? 'not-allowed' : 'pointer' }}
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
              {loadingAccounts ? (
                <tr>
                  <td colSpan={6} style={{ textAlign: 'center', padding: '36px 16px', color: 'var(--ink-soft)' }}>
                    <div style={{ display: 'inline-flex', alignItems: 'center', gap: 8, fontSize: 13, fontWeight: 700, color: 'var(--manila-blue)' }}>
                      <RefreshCw size={16} style={{ animation: 'spin 1s linear infinite' }} /> Loading accounts directory...
                    </div>
                  </td>
                </tr>
              ) : filteredAccounts.length === 0 ? (
                <tr>
                  <td colSpan={6} style={{ textAlign: 'center', padding: '36px 16px', color: 'var(--ink-soft)' }}>
                    <div style={{ marginBottom: 10, fontSize: 14, fontWeight: 600 }}>No accounts found matching your search.</div>
                    <button
                      onClick={() => Promise.all([fetchProvisionedAccounts(), fetchResidentAccounts()])}
                      className="clay-button-ghost"
                      style={{ fontSize: 12, padding: '6px 14px', margin: '0 auto', gap: 6 }}
                    >
                      <RefreshCw size={13} /> Refresh Directory
                    </button>
                  </td>
                </tr>
              ) : (
                currentAccountItems.map(acc => (
                  <tr key={acc.id || acc._id}>
                    <td>
                      <div style={{ fontWeight: 700, color: 'var(--ink)', fontSize: 14 }}>{acc.name}</div>
                      <div style={{ fontSize: 12, color: 'var(--ink-soft)' }}>{acc.emailOrPhone}</div>
                    </td>
                    <td>
                      <span style={{
                        background: acc.role === 'lgu_superadmin' || acc.role === 'lgu_super_admin' ? '#FEF2F2' : acc.role === 'lgu_admin' ? '#F5F3FF' : acc.role === 'field_staff' ? '#FEF3C7' : '#EFF6FF',
                        color: acc.role === 'lgu_superadmin' || acc.role === 'lgu_super_admin' ? '#DC2626' : acc.role === 'lgu_admin' ? '#7C3AED' : acc.role === 'field_staff' ? '#B45309' : '#1D4ED8',
                        fontSize: 11, fontWeight: 800, padding: '3px 9px', borderRadius: 999
                      }}>
                        {acc.role === 'lgu_superadmin' || acc.role === 'lgu_super_admin' ? 'SuperAdmin' : acc.role === 'lgu_admin' ? 'LGU Admin' : acc.role === 'field_staff' ? 'Field Staff' : 'Barangay Official'}
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
                            padding: '2px 6px', borderRadius: 4, width: 'fit-content',
                            display: 'inline-flex', alignItems: 'center', gap: 4,
                          }}>
                            {acc.staffDesignation === 'team_leader' ? (
                              <><Shield size={10} /> Team Leader (Head)</>
                            ) : (
                              <><Users size={10} /> Field Officer (Scanner)</>
                            )}
                          </span>
                        </div>
                      ) : (
                        <span style={{ fontSize: 12, color: 'var(--ink-soft)' }}>-</span>
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

          {/* ── Pagination Bar: Always visible with page navigation and per-page selector ── */}
          {filteredAccounts.length > 0 && (
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '12px 18px', background: 'var(--card)', borderTop: '1px solid var(--border)', flexWrap: 'wrap', gap: 12 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 16, flexWrap: 'wrap' }}>
                <div style={{ fontSize: 12, color: 'var(--ink-soft)' }}>
                  Showing <strong>{startIndex + 1}-{Math.min(startIndex + itemsPerPage, filteredAccounts.length)}</strong> of <strong>{filteredAccounts.length}</strong> accounts
                  <span style={{ marginLeft: 8, color: 'var(--ink-soft)' }}>
                    (Page <strong>{currentPage}</strong> of <strong>{totalPages}</strong>)
                  </span>
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12, color: 'var(--ink-soft)' }}>
                  <span>Rows per page:</span>
                  <select
                    value={itemsPerPage}
                    onChange={(e) => {
                      setItemsPerPage(Number(e.target.value));
                      setCurrentPage(1);
                    }}
                    style={{
                      padding: '3px 8px',
                      borderRadius: 6,
                      border: '1px solid var(--border)',
                      fontSize: 12,
                      background: 'var(--card)',
                      color: 'var(--ink)',
                      fontWeight: 700,
                      cursor: 'pointer',
                    }}
                  >
                    <option value={5}>5</option>
                    <option value={8}>8</option>
                    <option value={10}>10</option>
                    <option value={20}>20</option>
                    <option value={50}>50</option>
                  </select>
                </div>
              </div>

              <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
                <button
                  onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                  disabled={currentPage === 1}
                  className="clay-button-ghost"
                  style={{ fontSize: 11, padding: '4px 10px', opacity: currentPage === 1 ? 0.4 : 1, cursor: currentPage === 1 ? 'not-allowed' : 'pointer' }}
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
                  style={{ fontSize: 11, padding: '4px 10px', opacity: currentPage === totalPages ? 0.4 : 1, cursor: currentPage === totalPages ? 'not-allowed' : 'pointer' }}
                >
                  Next
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ── TAB 3: RESIDENT / CITIZEN MOBILE ACCOUNTS DIRECTORY ── */}
      {viewTab === 'residents' && (
        <div className="clay-card" style={{ padding: 0, overflow: 'hidden' }}>
          <div style={{ padding: '16px 20px', borderBottom: '1px solid var(--border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 12 }}>
            <div>
              <h2 style={{ fontSize: '16px', fontWeight: 800, color: 'var(--ink)', margin: 0, display: 'flex', alignItems: 'center', gap: 8 }}>
                <Home size={18} color="var(--manila-blue)" />
                Manila Mobile Citizens & Pre-Verified Residents Directory
              </h2>
              <span style={{ fontSize: 12, color: 'var(--ink-soft)' }}>
                Master directory of registered citizens and household beneficiaries ({filteredResidents.length} total)
                {selectedBarangayFilter !== 'all' && (
                  <span style={{ marginLeft: 8, padding: '2px 8px', borderRadius: 999, background: 'rgba(37, 99, 235, 0.1)', color: 'var(--manila-blue)', fontWeight: 800, fontSize: 11 }}>
                    📍 Scoped to Barangay {selectedBarangayFilter}
                  </span>
                )}
              </span>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
              {filteredResidents.length > 0 && (
                <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
                  <span style={{ fontSize: 11, color: 'var(--ink-soft)', fontWeight: 600, marginRight: 2 }}>
                    Page {residentPage} of {residentTotalPages}
                  </span>
                  <button
                    onClick={() => setResidentPage(p => Math.max(1, p - 1))}
                    disabled={residentPage === 1}
                    className="clay-button-ghost"
                    style={{ fontSize: 11, padding: '3px 8px', opacity: residentPage === 1 ? 0.4 : 1, cursor: residentPage === 1 ? 'not-allowed' : 'pointer' }}
                  >
                    Prev
                  </button>
                  {Array.from({ length: residentTotalPages }, (_, i) => i + 1).map(pageNum => (
                    <button
                      key={pageNum}
                      onClick={() => setResidentPage(pageNum)}
                      className={residentPage === pageNum ? 'clay-button-primary' : 'clay-button-ghost'}
                      style={{ fontSize: 11, width: 26, height: 26, padding: 0, justifyContent: 'center', fontWeight: residentPage === pageNum ? 800 : 600 }}
                    >
                      {pageNum}
                    </button>
                  ))}
                  <button
                    onClick={() => setResidentPage(p => Math.min(residentTotalPages, p + 1))}
                    disabled={residentPage === residentTotalPages}
                    className="clay-button-ghost"
                    style={{ fontSize: 11, padding: '3px 8px', opacity: residentPage === residentTotalPages ? 0.4 : 1, cursor: residentPage === residentTotalPages ? 'not-allowed' : 'pointer' }}
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
                <th>Beneficiary / Household Head</th>
                <th>Barangay & Address</th>
                <th>Family Composition</th>
                <th>Damage & Priority</th>
                <th>Verification & Status</th>
                <th>Official Actions</th>
              </tr>
            </thead>
            <tbody>
              {loadingResidents ? (
                <tr>
                  <td colSpan={6} style={{ textAlign: 'center', padding: '36px 16px', color: 'var(--ink-soft)' }}>
                    <div style={{ display: 'inline-flex', alignItems: 'center', gap: 8, fontSize: 13, fontWeight: 700, color: 'var(--manila-blue)' }}>
                      <RefreshCw size={16} style={{ animation: 'spin 1s linear infinite' }} /> Loading registered resident citizens...
                    </div>
                  </td>
                </tr>
              ) : filteredResidents.length === 0 ? (
                <tr>
                  <td colSpan={6} style={{ textAlign: 'center', padding: '36px 16px', color: 'var(--ink-soft)' }}>
                    <div style={{ marginBottom: 6, fontSize: 14, fontWeight: 700, color: 'var(--ink)' }}>
                      Walang residenteng natagpuan {selectedBarangayFilter !== 'all' ? `sa Barangay ${selectedBarangayFilter}` : ''}
                    </div>
                    <div style={{ marginBottom: 12, fontSize: 12, color: 'var(--ink-soft)' }}>
                      {selectedBarangayFilter !== 'all'
                        ? 'Piliin ang "Entire Manila City" upang makita ang lahat ng barangay o magrehistro ng bagong residente.'
                        : 'Maaari kang magrehistro ng bagong residente gamit ang button sa ibaba.'}
                    </div>
                    <div style={{ display: 'flex', gap: 8, justifyContent: 'center', flexWrap: 'wrap' }}>
                      {selectedBarangayFilter !== 'all' && (
                        <button
                          onClick={() => setSelectedBarangayFilter('all')}
                          className="clay-button-ghost"
                          style={{ fontSize: 12, padding: '6px 14px' }}
                        >
                          Ipakita ang Lahat ng Barangay
                        </button>
                      )}
                      <button
                        onClick={openCreateModal}
                        className="clay-button-primary"
                        style={{ fontSize: 12, padding: '6px 14px', gap: 6 }}
                      >
                        <Plus size={13} /> Register Verified Resident
                      </button>
                    </div>
                  </td>
                </tr>
              ) : (
                currentResidentItems.map(res => {
                  const hh = res.household || {};
                  const members = hh.members || [];
                  const totalMembers = hh.memberCount || (members.length > 0 ? members.length + 1 : 1);
                  const seniorCount = members.filter(m => m.specialConditions?.includes('senior') || Number(m.age) >= 60).length;
                  const pwdCount = members.filter(m => m.specialConditions?.includes('pwd')).length;
                  const pregnantCount = members.filter(m => m.specialConditions?.includes('pregnant')).length;
                  const childCount = members.filter(m => m.specialConditions?.includes('child') || Number(m.age) <= 12).length;
                  const medCount = members.filter(m => m.specialConditions?.includes('medical')).length;

                  // Priority color badge
                  const pLevel = hh.priorityLevel || 'Medium';
                  const pScore = hh.priorityScore ?? 0;
                  const pColor = pLevel === 'Critical' ? '#DC2626' : pLevel === 'High' ? '#EA580C' : pLevel === 'Medium' ? '#2563EB' : '#16A34A';
                  const pBg = pLevel === 'Critical' ? '#FEF2F2' : pLevel === 'High' ? '#FFF7ED' : pLevel === 'Medium' ? '#EFF6FF' : '#F0FDF4';

                  // Damage color badge
                  const dLevel = hh.damageLevel || 'Minor';
                  const dColor = dLevel === 'Totally Damaged' ? '#DC2626' : dLevel === 'Severe' ? '#EA580C' : dLevel === 'Moderate' ? '#CA8A04' : '#16A34A';
                  const dBg = dLevel === 'Totally Damaged' ? '#FEF2F2' : dLevel === 'Severe' ? '#FFF7ED' : dLevel === 'Moderate' ? '#FEFCE8' : '#F0FDF4';

                  return (
                    <tr key={res.id || res._id}>
                      <td>
                        <div style={{ fontWeight: 800, color: 'var(--ink)', fontSize: 14 }}>{res.name}</div>
                        <div style={{ fontSize: 12, color: 'var(--ink-soft)' }}>{res.emailOrPhone || res.contactNum}</div>
                        {hh.validIdNumber && (
                          <div style={{ fontSize: 10.5, color: 'var(--ink-soft)', marginTop: 2 }}>
                            ID: <strong style={{ color: 'var(--ink)' }}>{hh.validIdNumber}</strong> ({hh.validIdType || 'Valid ID'})
                          </div>
                        )}
                        {res.createdAt && (
                          <div style={{ fontSize: 10, color: 'var(--ink-soft)', marginTop: 1 }}>
                            Reg: {new Date(res.createdAt).toLocaleDateString('en-PH', { month: 'short', day: 'numeric', year: 'numeric' })}
                          </div>
                        )}
                      </td>
                      <td>
                        <div style={{ display: 'inline-flex', alignItems: 'center', gap: 4, background: '#EFF6FF', color: '#1D4ED8', padding: '2px 8px', borderRadius: 4, fontWeight: 800, fontSize: 11, marginBottom: 4 }}>
                          <MapPin size={11} /> Brgy {res.barangayCode || hh.barangayCode || 'N/A'}
                        </div>
                        {hh.purok && (
                          <div style={{ fontSize: 11, color: 'var(--ink)', fontWeight: 600 }}>Purok / Zone: {hh.purok}</div>
                        )}
                        <div style={{ fontSize: 11, color: 'var(--ink-soft)', maxWidth: 220, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                          {hh.address || 'No street address'}
                        </div>
                      </td>
                      <td>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                          <span style={{ fontWeight: 800, color: 'var(--ink)', fontSize: 12 }}>
                            {totalMembers} Family {totalMembers === 1 ? 'Member' : 'Members'}
                          </span>
                          <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap' }}>
                            {seniorCount > 0 && (
                              <span style={{ fontSize: 10, background: '#FEF3C7', color: '#B45309', padding: '1px 5px', borderRadius: 4, fontWeight: 700 }}>
                                Senior ({seniorCount})
                              </span>
                            )}
                            {pwdCount > 0 && (
                              <span style={{ fontSize: 10, background: '#EFF6FF', color: '#1D4ED8', padding: '1px 5px', borderRadius: 4, fontWeight: 700 }}>
                                PWD ({pwdCount})
                              </span>
                            )}
                            {pregnantCount > 0 && (
                              <span style={{ fontSize: 10, background: '#FCE7F3', color: '#BE185D', padding: '1px 5px', borderRadius: 4, fontWeight: 700 }}>
                                Pregnant ({pregnantCount})
                              </span>
                            )}
                            {childCount > 0 && (
                              <span style={{ fontSize: 10, background: '#F3E8FF', color: '#7E22CE', padding: '1px 5px', borderRadius: 4, fontWeight: 700 }}>
                                Child ({childCount})
                              </span>
                            )}
                            {medCount > 0 && (
                              <span style={{ fontSize: 10, background: '#FEE2E2', color: '#B91C1C', padding: '1px 5px', borderRadius: 4, fontWeight: 700 }}>
                                Medical ({medCount})
                              </span>
                            )}
                            {seniorCount === 0 && pwdCount === 0 && pregnantCount === 0 && childCount === 0 && medCount === 0 && (
                              <span style={{ fontSize: 10.5, color: 'var(--ink-soft)' }}>Standard Household</span>
                            )}
                          </div>
                        </div>
                      </td>
                      <td>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                          <span style={{
                            background: dBg, color: dColor,
                            fontSize: 10.5, fontWeight: 800, padding: '2px 7px', borderRadius: 4, width: 'fit-content'
                          }}>
                            {dLevel}
                          </span>
                          <span style={{
                            background: pBg, color: pColor,
                            fontSize: 10.5, fontWeight: 800, padding: '2px 7px', borderRadius: 4, width: 'fit-content'
                          }}>
                            {pLevel} ({pScore} pts)
                          </span>
                        </div>
                      </td>
                      <td>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
                          {hh.verificationStatus === 'verified' ? (
                            <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4, background: 'rgba(21,138,100,0.1)', color: '#158A64', fontSize: 11, fontWeight: 700, padding: '2px 8px', borderRadius: 999, width: 'fit-content' }}>
                              <CheckCircle size={12} /> Pre-Verified
                            </span>
                          ) : (
                            <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4, background: '#FEF3C7', color: '#B45309', fontSize: 11, fontWeight: 700, padding: '2px 8px', borderRadius: 999, width: 'fit-content' }}>
                              <AlertCircle size={12} /> {hh.verificationStatus || 'Pending'}
                            </span>
                          )}

                          {res.isActive !== false ? (
                            <span style={{ fontSize: 10.5, color: '#158A64', fontWeight: 600 }}>
                              Active Mobile Pass
                            </span>
                          ) : (
                            <span style={{ fontSize: 10.5, color: '#DC2626', fontWeight: 600 }}>
                              Suspended Pass
                            </span>
                          )}
                        </div>
                      </td>
                      <td>
                        <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                          <button
                            onClick={() => setQrModalData(res)}
                            title="View Official Relief Pass & QR Code"
                            className="clay-button-ghost"
                            style={{ fontSize: 11, padding: '4px 8px', gap: 4, height: 26, color: 'var(--manila-blue)', borderColor: 'rgba(37,99,235,0.3)' }}
                          >
                            <QrCode size={12} /> View Pass
                          </button>
                          <button
                            onClick={() => openEditResidentModal(res)}
                            title="Edit Resident & Household Details"
                            className="clay-button-ghost"
                            style={{ fontSize: 11, padding: '4px 8px', gap: 4, height: 26, color: '#D97706', borderColor: 'rgba(217,119,6,0.35)' }}
                          >
                            <Edit3 size={12} /> Edit
                          </button>
                          <button
                            onClick={() => requestToggleResidentStatus(res)}
                            title={res.isActive !== false ? 'Suspend Resident Account' : 'Reactivate Resident Account'}
                            className={res.isActive !== false ? 'clay-button-danger' : 'clay-button-approve'}
                            style={{ fontSize: 11, padding: '4px 8px', gap: 4, height: 26 }}
                          >
                            <Power size={12} /> {res.isActive !== false ? 'Suspend' : 'Reactivate'}
                          </button>
                          <button
                            onClick={() => requestDeleteResident(res)}
                            title="Delete Resident Account"
                            className="clay-button-ghost"
                            style={{ fontSize: 11, padding: '4px 8px', gap: 4, height: 26, color: '#DC2626', borderColor: 'rgba(220,38,38,0.3)' }}
                          >
                            <Trash2 size={12} /> Delete
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>

          {/* ── Resident Pagination Bar ── */}
          {filteredResidents.length > 0 && (
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '12px 18px', background: 'var(--card)', borderTop: '1px solid var(--border)', flexWrap: 'wrap', gap: 12 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 16, flexWrap: 'wrap' }}>
                <div style={{ fontSize: 12, color: 'var(--ink-soft)' }}>
                  Showing <strong>{residentStartIndex + 1}-{Math.min(residentStartIndex + residentItemsPerPage, filteredResidents.length)}</strong> of <strong>{filteredResidents.length}</strong> residents
                  <span style={{ marginLeft: 8, color: 'var(--ink-soft)' }}>
                    (Page <strong>{residentPage}</strong> of <strong>{residentTotalPages}</strong>)
                  </span>
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12, color: 'var(--ink-soft)' }}>
                  <span>Rows per page:</span>
                  <select
                    value={residentItemsPerPage}
                    onChange={(e) => {
                      setResidentItemsPerPage(Number(e.target.value));
                      setResidentPage(1);
                    }}
                    style={{
                      padding: '3px 8px',
                      borderRadius: 6,
                      border: '1px solid var(--border)',
                      fontSize: 12,
                      background: 'var(--card)',
                      color: 'var(--ink)',
                      fontWeight: 700,
                      cursor: 'pointer',
                    }}
                  >
                    <option value={5}>5</option>
                    <option value={8}>8</option>
                    <option value={10}>10</option>
                    <option value={20}>20</option>
                    <option value={50}>50</option>
                  </select>
                </div>
              </div>

              <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
                <button
                  onClick={() => setResidentPage(p => Math.max(1, p - 1))}
                  disabled={residentPage === 1}
                  className="clay-button-ghost"
                  style={{ fontSize: 11, padding: '4px 10px', opacity: residentPage === 1 ? 0.4 : 1, cursor: residentPage === 1 ? 'not-allowed' : 'pointer' }}
                >
                  Previous
                </button>

                {Array.from({ length: residentTotalPages }, (_, i) => i + 1).map(pageNum => (
                  <button
                    key={pageNum}
                    onClick={() => setResidentPage(pageNum)}
                    className={residentPage === pageNum ? 'clay-button-primary' : 'clay-button-ghost'}
                    style={{ fontSize: 11, width: 28, height: 28, padding: 0, justifyContent: 'center', fontWeight: residentPage === pageNum ? 800 : 600 }}
                  >
                    {pageNum}
                  </button>
                ))}

                <button
                  onClick={() => setResidentPage(p => Math.min(residentTotalPages, p + 1))}
                  disabled={residentPage === residentTotalPages}
                  className="clay-button-ghost"
                  style={{ fontSize: 11, padding: '4px 10px', opacity: residentPage === residentTotalPages ? 0.4 : 1, cursor: residentPage === residentTotalPages ? 'not-allowed' : 'pointer' }}
                >
                  Next
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ── OFFICIAL QR PASS MODAL ── */}
      {qrModalData && ReactDOM.createPortal(
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          width: '100vw',
          height: '100vh',
          backgroundColor: 'rgba(15, 23, 42, 0.78)',
          backdropFilter: 'blur(8px)',
          WebkitBackdropFilter: 'blur(8px)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 99999999,
          padding: '20px 16px',
          boxSizing: 'border-box',
          overflowY: 'auto',
        }}>
          <div className="clay-card page-animate" style={{
            maxWidth: 480,
            width: '100%',
            padding: 0,
            background: 'var(--card)',
            borderRadius: 'var(--radius-card)',
            boxShadow: '0 25px 60px rgba(0,0,0,0.5)',
            overflow: 'hidden',
          }}>
            {/* Manila Relief ID Card Header */}
            <div style={{
              background: 'linear-gradient(135deg, #0F172A, #1E3A8A)',
              color: '#fff',
              padding: '20px 24px',
              position: 'relative',
              textAlign: 'center',
              borderBottom: '3px solid #D97706',
            }}>
              <div style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', width: 44, height: 44, borderRadius: '50%', background: 'rgba(255,255,255,0.12)', marginBottom: 8, border: '1.5px solid #F59E0B' }}>
                <Shield size={24} color="#F59E0B" />
              </div>
              <div style={{ fontSize: 10, letterSpacing: '0.12em', textTransform: 'uppercase', color: '#93C5FD', fontWeight: 800 }}>
                Republic of the Philippines • City of Manila
              </div>
              <h3 style={{ fontSize: 16, fontWeight: 900, color: '#fff', margin: '4px 0 2px 0', letterSpacing: '0.02em' }}>
                OFFICIAL RELIEF RECOVERY PASS
              </h3>
              <div style={{ fontSize: 11, color: '#E2E8F0' }}>
                Manila Disaster Risk Reduction & Management Office (MDRRMO)
              </div>
            </div>

            <div style={{ padding: '22px 24px', textAlign: 'center' }}>
              {/* QR Visual */}
              <div style={{ display: 'inline-block', padding: 12, background: '#fff', borderRadius: 16, boxShadow: '0 8px 25px rgba(0,0,0,0.12)', border: '1.5px solid var(--border)' }}>
                <img
                  src={`https://api.qrserver.com/v1/create-qr-code/?size=220x220&data=${encodeURIComponent(qrModalData.household?.qrCode || qrModalData.contactNum || qrModalData.emailOrPhone)}`}
                  alt="Official QR Relief Pass"
                  style={{ width: 190, height: 190, display: 'block' }}
                />
              </div>

              {/* Pass Code */}
              <div style={{ marginTop: 12, marginBottom: 14 }}>
                <div style={{
                  fontFamily: 'monospace',
                  fontSize: 14,
                  fontWeight: 900,
                  color: 'var(--manila-blue)',
                  letterSpacing: '0.12em',
                  background: 'var(--sampaguita)',
                  padding: '6px 14px',
                  borderRadius: 6,
                  display: 'inline-block',
                  border: '1px solid var(--border)',
                }}>
                  {qrModalData.household?.qrCode || 'MNL-CITIZEN-PASS'}
                </div>
                <div style={{ fontSize: 11, fontWeight: 800, color: '#158A64', marginTop: 4, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 4 }}>
                  <CheckCircle size={13} /> OFFICIAL PRE-VERIFIED BENEFICIARY PASS
                </div>
              </div>

              {/* Citizen Details Info Box */}
              <div style={{
                background: 'var(--sampaguita)',
                border: '1px solid var(--border)',
                borderRadius: 'var(--radius-inner)',
                padding: '12px 14px',
                textAlign: 'left',
                fontSize: 12,
                display: 'flex',
                flexDirection: 'column',
                gap: 6,
                marginBottom: 16,
              }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid var(--border)', paddingBottom: 4 }}>
                  <span style={{ color: 'var(--ink-soft)' }}>Household Head:</span>
                  <strong style={{ color: 'var(--ink)' }}>{qrModalData.name}</strong>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid var(--border)', paddingBottom: 4 }}>
                  <span style={{ color: 'var(--ink-soft)' }}>Mobile Phone / Login:</span>
                  <strong style={{ color: 'var(--ink)' }}>{qrModalData.emailOrPhone || qrModalData.contactNum}</strong>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid var(--border)', paddingBottom: 4 }}>
                  <span style={{ color: 'var(--ink-soft)' }}>Jurisdiction:</span>
                  <strong style={{ color: 'var(--manila-blue)' }}>Barangay {qrModalData.barangayCode || qrModalData.household?.barangayCode}</strong>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid var(--border)', paddingBottom: 4 }}>
                  <span style={{ color: 'var(--ink-soft)' }}>Street / Purok:</span>
                  <strong style={{ color: 'var(--ink)', textAlign: 'right', maxWidth: 220 }}>
                    {qrModalData.household?.purok ? `Purok ${qrModalData.household.purok}, ` : ''}{qrModalData.household?.address || 'N/A'}
                  </strong>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid var(--border)', paddingBottom: 4 }}>
                  <span style={{ color: 'var(--ink-soft)' }}>Family Size:</span>
                  <strong style={{ color: 'var(--ink)' }}>
                    {qrModalData.household?.memberCount || 1} Registered Members
                  </strong>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid var(--border)', paddingBottom: 4 }}>
                  <span style={{ color: 'var(--ink-soft)' }}>Damage & Priority:</span>
                  <strong style={{ color: 'var(--ink)' }}>
                    {qrModalData.household?.damageLevel || 'Minor'} • {qrModalData.household?.priorityLevel || 'Medium'} ({qrModalData.household?.priorityScore || 0} pts)
                  </strong>
                </div>
                {qrModalData.household?.validIdNumber && (
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span style={{ color: 'var(--ink-soft)' }}>Valid ID:</span>
                    <strong style={{ color: 'var(--ink)' }}>
                      {qrModalData.household.validIdNumber} ({qrModalData.household.validIdType || 'ID'})
                    </strong>
                  </div>
                )}
              </div>

              {/* Modal Buttons */}
              <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
                <button
                  type="button"
                  onClick={() => window.print()}
                  className="clay-button-primary"
                  style={{ fontSize: 13, gap: 6, flex: 1, justifyContent: 'center' }}
                >
                  <Printer size={15} /> Print Pass
                </button>
                <button
                  type="button"
                  onClick={() => setQrModalData(null)}
                  className="clay-button-ghost"
                  style={{ fontSize: 13, minWidth: 90 }}
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        </div>,
        document.body
      )}
    </div>
  );
}

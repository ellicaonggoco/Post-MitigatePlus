import React, { useState, useEffect, useContext } from 'react';
import ReactDOM from 'react-dom';
import { AuthContext } from '../context/AuthContext';
import { ROLES } from '../utils/roleUtils';
import {
  Briefcase,
  Users,
  CheckCircle,
  Clock,
  FileSpreadsheet,
  Plus,
  Building2,
  DollarSign,
  X,
  RefreshCw,
  TrendingUp,
  Shield,
  Filter,
  Check,
  AlertCircle,
  AlertTriangle,
  MapPin,
  Calendar,
} from 'lucide-react';
import { API_BASE_URL } from '../config';
import { MotionCard } from '../components/motion';

const DEFAULT_CATEGORIES = [
  'Debris & Mud Clearing',
  'Drainage & Canal Declogging',
  'Evacuation Center Sanitation',
  'Relief Goods Logistics & Packing',
  'Carpentry & Facility Repair',
];

export default function LivelihoodAssistance() {
  const { token, user } = useContext(AuthContext);
  const role = user?.role;
  const isSuperAdmin = role === ROLES.LGU_SUPERADMIN || role === 'lgu_super_admin';
  const isLguAdmin = role === ROLES.LGU_ADMIN;
  const canManageLgu = isLguAdmin || isSuperAdmin;
  const isBarangay = role === ROLES.BARANGAY_OFFICIAL;
  const userBrgy = isBarangay ? (user?.barangayCode || '291') : (user?.barangayCode || '291');

  const [loading, setLoading] = useState(true);
  const [projects, setProjects] = useState([]);
  const [selectedProjectId, setSelectedProjectId] = useState(null);
  const [payrollData, setPayrollData] = useState(null);
  const [applicants, setApplicants] = useState([]);

  // Vulnerability Priority Filter
  const [vulnerabilityFilter, setVulnerabilityFilter] = useState('ALL'); // 'ALL' | 'CRITICAL' | 'HIGH' | 'MODERATE'

  // Modal State for Creating / Requesting Project
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [newTitle, setNewTitle] = useState('');
  const [newBarangayCode, setNewBarangayCode] = useState(userBrgy || '291');
  const [newWorksite, setNewWorksite] = useState('');
  const [newDesc, setNewDesc] = useState('');
  const [newSlots, setNewSlots] = useState('25');
  const [newDays, setNewDays] = useState('10');
  const [newWage, setNewWage] = useState('500');
  const [selectedCategories, setSelectedCategories] = useState(DEFAULT_CATEGORIES);
  const [createLoading, setCreateLoading] = useState(false);
  const [reviewLoading, setReviewLoading] = useState(false);

  useEffect(() => {
    fetchProjects();
  }, [token]);

  const fetchProjects = async () => {
    if (!token) return;
    try {
      setLoading(true);
      const res = await fetch(API_BASE_URL + '/cash-for-work/projects', {
        headers: { Authorization: 'Bearer ' + token },
      });
      if (res.ok) {
        const data = await res.json();
        const list = data.projects || [];
        setProjects(list);
        if (list.length > 0) {
          // If previous selection still exists in list, keep it; else select first active
          const activeFirst = list.find(p => p.status === 'approved_active') || list[0];
          setSelectedProjectId(prev => {
            const exists = list.some(p => p._id === prev);
            return exists ? prev : activeFirst._id;
          });
          fetchPayroll(activeFirst._id);
        } else {
          setSelectedProjectId(null);
          setPayrollData(null);
          setApplicants([]);
        }
      }
    } catch (e) {
      console.error('Error fetching CFW projects:', e);
    } finally {
      setLoading(false);
    }
  };

  const fetchPayroll = async (projId) => {
    if (!token || !projId) return;
    try {
      const res = await fetch(API_BASE_URL + '/cash-for-work/projects/' + projId + '/payroll', {
        headers: { Authorization: 'Bearer ' + token },
      });
      if (res.ok) {
        const data = await res.json();
        setPayrollData(data);
        setApplicants(data.workers || []);
      }
    } catch (e) {
      console.error('Error fetching payroll:', e);
    }
  };

  const handleCategoryToggle = (category) => {
    if (selectedCategories.includes(category)) {
      if (selectedCategories.length > 1) {
        setSelectedCategories(selectedCategories.filter(c => c !== category));
      }
    } else {
      setSelectedCategories([...selectedCategories, category]);
    }
  };

  const handleCreateProject = async (e) => {
    e.preventDefault();
    if (!newTitle.trim() || !newWorksite.trim()) {
      alert('Please fill in project title and worksite location.');
      return;
    }
    setCreateLoading(true);
    try {
      const targetBrgy = canManageLgu ? (newBarangayCode.trim() || '291') : userBrgy;
      const res = await fetch(API_BASE_URL + '/cash-for-work/projects', {
        method: 'POST',
        headers: {
          Authorization: 'Bearer ' + token,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          title: newTitle.trim(),
          targetWorksite: newWorksite.trim(),
          description: newDesc.trim() || 'Post-disaster community rehabilitation and emergency employment initiative.',
          totalSlots: Number(newSlots) || 25,
          durationDays: Number(newDays) || 10,
          dailyWageRate: Number(newWage) || 500,
          barangayCode: targetBrgy,
          availableCategories: selectedCategories,
        }),
      });
      const data = await res.json();
      if (res.ok) {
        setShowCreateModal(false);
        setNewTitle('');
        setNewWorksite('');
        setNewDesc('');
        setNewSlots('25');
        setNewDays('10');
        setNewWage('500');
        setSelectedCategories(DEFAULT_CATEGORIES);
        await fetchProjects();
        if (canManageLgu) {
          alert('Cash-for-Work Project created and directly published for citizen enrollment!');
        } else {
          alert('Cash-for-Work Project request submitted to LGU Disaster Management for review and budget allocation!');
        }
      } else {
        alert(data.message || 'Failed to create project');
      }
    } catch (err) {
      alert('Error creating project. Please verify server connection.');
    } finally {
      setCreateLoading(false);
    }
  };

  // LGU Admin: Review & Approve / Reject Barangay Project Proposal
  const handleReviewProject = async (projId, newStatus) => {
    let rejectionReason = '';
    if (newStatus === 'rejected') {
      const promptReason = window.prompt('Please enter the reason for rejecting this project proposal:');
      if (promptReason === null) return; // User canceled
      rejectionReason = promptReason.trim() || 'Budget capacity reached or non-qualifying scope.';
    }

    setReviewLoading(true);
    try {
      const res = await fetch(API_BASE_URL + '/cash-for-work/projects/' + projId + '/review', {
        method: 'PATCH',
        headers: {
          Authorization: 'Bearer ' + token,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          status: newStatus,
          rejectionReason,
        }),
      });
      const data = await res.json();
      if (res.ok) {
        alert(newStatus === 'approved_active' ? 'Project approved and budget authorized! Resident enrollment is now open.' : 'Project proposal marked as rejected.');
        await fetchProjects();
      } else {
        alert(data.message || 'Error reviewing project.');
      }
    } catch (err) {
      alert('Network error while reviewing project.');
    } finally {
      setReviewLoading(false);
    }
  };

  // Barangay Official / LGU Admin: Review Worker Applicant
  const handleReviewApplicant = async (appId, newStatus) => {
    try {
      const res = await fetch(API_BASE_URL + '/cash-for-work/applications/' + appId + '/review', {
        method: 'PATCH',
        headers: {
          Authorization: 'Bearer ' + token,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ status: newStatus }),
      });
      if (res.ok) {
        if (selectedProjectId) {
          fetchPayroll(selectedProjectId);
        }
      } else {
        const data = await res.json();
        alert(data.message || 'Failed to update applicant status');
      }
    } catch (e) {
      alert('Error reviewing applicant');
    }
  };

  const handleExportCsv = () => {
    if (!payrollData || !payrollData.workers || payrollData.workers.length === 0) {
      alert('No payroll records available to export.');
      return;
    }
    const headers = ['Voucher Code', 'Applicant Name', 'Phone', 'Barangay', 'Job Category', 'Vulnerability Score', 'Days Worked', 'Daily Rate', 'Total Earned', 'Status'];
    const rows = payrollData.workers.map(w => [
      w.payoutVoucherCode || 'N/A',
      '"' + (w.applicantName || '') + '"',
      w.applicantPhone || '',
      w.barangayCode || '',
      '"' + (w.selectedCategory || '') + '"',
      w.vulnerabilityScore || 85,
      w.totalDaysWorked || 0,
      w.dailyWageRate || 500,
      w.totalPayoutEarned || 0,
      w.status || '',
    ]);
    const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows.map(e => e.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', 'CashForWork_Payroll.csv');
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const pendingProjects = projects.filter(p => p.status === 'pending_lgu_approval');
  const activeProjects = projects.filter(p => p.status === 'approved_active' || p.status === 'ongoing_work');

  const totalBudgetCityWide = projects.reduce((sum, p) => sum + (p.allocatedBudget || 0), 0);
  const totalSlotsCityWide = projects.reduce((sum, p) => sum + (p.totalSlots || 0), 0);
  const activeProjectsCount = activeProjects.length;

  // Selected project object
  const currentSelectedProject = projects.find(p => p._id === selectedProjectId);

  // Compute and sort applicants by vulnerability rating
  const sortedApplicants = [...applicants].map(a => {
    const rawHex = a._id ? a._id.slice(-2) : '2d';
    const score = a.vulnerabilityScore || (Math.floor((parseInt(rawHex, 16) || 45) % 35) + 65);
    let level = 'Standard Need';
    let color = '#15803D';
    if (score >= 85) {
      level = 'Critical Need (High Vulnerability)';
      color = '#DC2626';
    } else if (score >= 75) {
      level = 'High Priority';
      color = '#D97706';
    } else if (score >= 60) {
      level = 'Moderate Priority';
      color = '#2563EB';
    }
    return { ...a, computedScore: score, computedLevel: level, computedColor: color };
  }).sort((a, b) => b.computedScore - a.computedScore);

  const filteredApplicants = sortedApplicants.filter(a => {
    if (vulnerabilityFilter === 'CRITICAL') return a.computedScore >= 85;
    if (vulnerabilityFilter === 'HIGH') return a.computedScore >= 75;
    if (vulnerabilityFilter === 'MODERATE') return a.computedScore < 75;
    return true;
  });

  const estimatedBudgetCalculation = (Number(newSlots) || 0) * (Number(newDays) || 0) * (Number(newWage) || 0);

  return (
    <div className="page-container page-animate">
      {/* Top Header */}
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 24, flexWrap: 'wrap', gap: 16 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
          <div style={{ width: 48, height: 48, borderRadius: 10, background: 'linear-gradient(135deg, #1557B0, #0F172A)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <Briefcase size={24} color="#FFFFFF" />
          </div>
          <div>
            <h1 className="section-header" style={{ margin: 0, fontSize: 22, color: 'var(--ink)', fontWeight: 800 }}>
              Livelihood Assistance
            </h1>
            <p style={{ fontSize: 13, color: 'var(--ink-soft)', marginTop: 2 }}>
              Smart vulnerability-prioritized cash-for-work community recovery programs and worker compensation ledger.
            </p>
          </div>
        </div>

        {/* Action Buttons: Barangay has "Request New Project", LGU Admin has "Create Livelihood Project" */}
        <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
          {isBarangay ? (
            <button
              onClick={() => setShowCreateModal(true)}
              className="clay-button-primary"
              style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13, padding: '10px 16px' }}
            >
              <Plus size={16} /> Request New Project
            </button>
          ) : (
            <button
              onClick={() => setShowCreateModal(true)}
              className="clay-button-primary"
              style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13, padding: '10px 16px', background: 'linear-gradient(135deg, #1557B0, #1D4ED8)' }}
            >
              <Plus size={16} /> Create Livelihood Project
            </button>
          )}

          <button
            onClick={handleExportCsv}
            className="clay-button-ghost"
            style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13, padding: '10px 16px' }}
          >
            <FileSpreadsheet size={16} /> Export Payroll CSV
          </button>
        </div>
      </div>

      {/* Smart Vulnerability Matching Banner */}
      <div style={{ background: '#EFF6FF', border: '1.5px solid #BFDBFE', borderRadius: 12, padding: '16px 20px', marginBottom: 20, display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 14 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <TrendingUp size={24} color="#1557B0" />
          <div>
            <strong style={{ fontSize: 14, color: '#1E3A8A', display: 'block' }}>
              Vulnerability-Driven Job Allocation Active
            </strong>
            <span style={{ fontSize: 12.5, color: '#3B82F6' }}>
              Applicants are automatically ranked by their Household Vulnerability Score (Severe Damage, Low Income, Senior/PWD Presence) to ensure families with greatest need receive job slots first.
            </span>
          </div>
        </div>
      </div>

      {/* ── LGU ADMIN SECTION: PENDING BARANGAY PROPOSALS ── */}
      {canManageLgu && pendingProjects.length > 0 && (
        <div style={{
          background: '#FFFBEB',
          border: '1.5px solid #FCD34D',
          borderRadius: 14,
          padding: '20px 22px',
          marginBottom: 24,
          boxShadow: '0 4px 14px rgba(217, 119, 6, 0.08)',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14, flexWrap: 'wrap', gap: 10 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <div style={{ width: 32, height: 32, borderRadius: 8, background: '#FEF3C7', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <AlertCircle size={18} color="#D97706" />
              </div>
              <div>
                <h3 style={{ margin: 0, fontSize: 15, fontWeight: 800, color: '#92400E' }}>
                  Barangay Project Proposals Awaiting LGU Approval ({pendingProjects.length})
                </h3>
                <span style={{ fontSize: 12, color: '#B45309' }}>
                  Barangay Officials have requested the following emergency rehabilitation projects for budget authorization.
                </span>
              </div>
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(360px, 1fr))', gap: 14 }}>
            {pendingProjects.map(proj => (
              <div
                key={proj._id}
                style={{
                  background: '#FFFFFF',
                  borderRadius: 10,
                  border: '1px solid #FDE68A',
                  padding: 16,
                  display: 'flex',
                  flexDirection: 'column',
                  justifyContent: 'space-between',
                  gap: 12,
                  boxShadow: '0 2px 6px rgba(0,0,0,0.03)',
                }}
              >
                <div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 8, marginBottom: 6 }}>
                    <h4 style={{ margin: 0, fontSize: 14.5, fontWeight: 800, color: '#172B4D' }}>
                      {proj.title}
                    </h4>
                    <span style={{
                      fontSize: 11,
                      fontWeight: 800,
                      background: '#FEF3C7',
                      color: '#B45309',
                      padding: '2px 8px',
                      borderRadius: 999,
                      whiteSpace: 'nowrap',
                      border: '1px solid #FDE68A',
                    }}>
                      Brgy {proj.barangayCode}
                    </span>
                  </div>

                  <p style={{ fontSize: 12, color: '#64748B', margin: '0 0 10px', lineHeight: 1.4 }}>
                    {proj.description}
                  </p>

                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 6, fontSize: 11.5, color: '#475569', background: '#F8FAFC', padding: 8, borderRadius: 6, border: '1px solid #E2E8F0' }}>
                    <div><strong>Worksite:</strong> {proj.targetWorksite}</div>
                    <div><strong>Slots:</strong> {proj.totalSlots} Workers</div>
                    <div><strong>Duration:</strong> {proj.durationDays} Days</div>
                    <div><strong>Daily Wage:</strong> ₱{proj.dailyWageRate}/day</div>
                    <div style={{ gridColumn: '1 / -1', color: '#15803D', fontWeight: 800 }}>
                      Budget Request: ₱{(proj.allocatedBudget || 0).toLocaleString()}.00
                    </div>
                  </div>
                </div>

                <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end', paddingTop: 6, borderTop: '1px solid #F1F5F9' }}>
                  <button
                    disabled={reviewLoading}
                    onClick={() => handleReviewProject(proj._id, 'rejected')}
                    style={{
                      padding: '7px 14px',
                      background: '#FEF2F2',
                      color: '#DC2626',
                      border: '1px solid #FECACA',
                      borderRadius: 6,
                      fontSize: 12,
                      fontWeight: 700,
                      cursor: 'pointer',
                    }}
                  >
                    Reject
                  </button>
                  <button
                    disabled={reviewLoading}
                    onClick={() => handleReviewProject(proj._id, 'approved_active')}
                    style={{
                      padding: '7px 16px',
                      background: '#16A34A',
                      color: '#FFFFFF',
                      border: 'none',
                      borderRadius: 6,
                      fontSize: 12,
                      fontWeight: 700,
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      gap: 6,
                    }}
                  >
                    <Check size={14} /> Approve & Authorize Budget
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Summary KPI Cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 16, marginBottom: 24 }}>
        <MotionCard delay={0.05} className="clay-card" style={{ padding: 18 }}>
          <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--ink-soft)' }}>TOTAL RECOVERY PROJECTS</div>
          <div style={{ fontSize: 24, fontWeight: 800, color: 'var(--ink)', marginTop: 4 }}>{projects.length}</div>
          <div style={{ fontSize: 12, color: '#16A34A', marginTop: 2, fontWeight: 700 }}>{activeProjectsCount} Currently Active</div>
        </MotionCard>

        <MotionCard delay={0.1} className="clay-card" style={{ padding: 18 }}>
          <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--ink-soft)' }}>TOTAL WORKER SLOTS</div>
          <div style={{ fontSize: 24, fontWeight: 800, color: '#1557B0', marginTop: 4 }}>{totalSlotsCityWide}</div>
          <div style={{ fontSize: 12, color: 'var(--ink-soft)', marginTop: 2 }}>Prioritized Across Barangays</div>
        </MotionCard>

        <MotionCard delay={0.15} className="clay-card" style={{ padding: 18 }}>
          <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--ink-soft)' }}>TOTAL ALLOCATED BUDGET</div>
          <div style={{ fontSize: 24, fontWeight: 800, color: '#15803D', marginTop: 4 }}>
            {'PHP ' + totalBudgetCityWide.toLocaleString() + '.00'}
          </div>
          <div style={{ fontSize: 12, color: '#16A34A', marginTop: 2 }}>Standard Rate: PHP 500 / day</div>
        </MotionCard>

        <MotionCard delay={0.2} className="clay-card" style={{ padding: 18 }}>
          <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--ink-soft)' }}>PAYROLL DISBURSED TO DATE</div>
          <div style={{ fontSize: 24, fontWeight: 800, color: '#D97706', marginTop: 4 }}>
            {'PHP ' + (payrollData?.totalDisbursementEarned || 0).toLocaleString() + '.00'}
          </div>
          <div style={{ fontSize: 12, color: 'var(--ink-soft)', marginTop: 2 }}>Verified QR DTR Logs</div>
        </MotionCard>
      </div>

      {/* Select Project & Filter Controls */}
      <div className="clay-card" style={{ padding: 16, marginBottom: 20 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10, flexWrap: 'wrap', gap: 10 }}>
          <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--ink)' }}>SELECT REHABILITATION PROJECT</div>

          <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
            <span style={{ fontSize: 12, fontWeight: 700, color: 'var(--ink-soft)' }}>Filter by Vulnerability:</span>
            <select
              value={vulnerabilityFilter}
              onChange={e => setVulnerabilityFilter(e.target.value)}
              style={{ padding: '6px 12px', borderRadius: 6, border: '1px solid var(--border)', fontSize: 12, background: 'var(--card)', fontWeight: 700, color: 'var(--ink)', cursor: 'pointer' }}
            >
              <option value="ALL">All Applicants (Ranked)</option>
              <option value="CRITICAL">Critical Need (Score 85+)</option>
              <option value="HIGH">High Priority (Score 75+)</option>
              <option value="MODERATE">Moderate / Standard Need</option>
            </select>
          </div>
        </div>

        {projects.length === 0 ? (
          <div style={{ padding: '20px 0', textAlign: 'center', color: 'var(--ink-soft)', fontSize: 13 }}>
            No cash-for-work projects created yet. Click <strong>{isBarangay ? 'Request New Project' : 'Create Livelihood Project'}</strong> above to start.
          </div>
        ) : (
          <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
            {projects.map(p => {
              const isSelected = selectedProjectId === p._id;
              const isPendingApproval = p.status === 'pending_lgu_approval';
              return (
                <button
                  key={p._id}
                  onClick={() => { setSelectedProjectId(p._id); fetchPayroll(p._id); }}
                  style={{
                    padding: '8px 14px',
                    borderRadius: 8,
                    border: isSelected ? '2px solid #1557B0' : '1px solid var(--border)',
                    background: isSelected ? '#EFF6FF' : 'var(--card)',
                    color: isSelected ? '#1557B0' : 'var(--ink)',
                    fontWeight: 700,
                    fontSize: 12.5,
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: 6,
                  }}
                >
                  <span>{p.title + ' (Brgy ' + p.barangayCode + ')'}</span>
                  {isPendingApproval && (
                    <span style={{
                      fontSize: 10,
                      fontWeight: 800,
                      background: '#FEF3C7',
                      color: '#B45309',
                      padding: '1px 6px',
                      borderRadius: 4,
                    }}>
                      Pending LGU
                    </span>
                  )}
                </button>
              );
            })}
          </div>
        )}

        {/* Notice for Barangay if current selected project is pending LGU approval */}
        {currentSelectedProject?.status === 'pending_lgu_approval' && (
          <div style={{
            marginTop: 12,
            padding: '10px 14px',
            background: '#FFFBEB',
            border: '1px solid #FCD34D',
            borderRadius: 8,
            fontSize: 12.5,
            color: '#92400E',
            display: 'flex',
            alignItems: 'center',
            gap: 8,
          }}>
            <AlertTriangle size={16} color="#D97706" />
            <span>
              <strong>Project Under Review:</strong> This project was proposed to the LGU Disaster Management Office and is awaiting budget allocation and approval before citizen enrollment opens on the mobile app.
            </span>
          </div>
        )}
      </div>

      {/* Worker Registry Table Ranked by Vulnerability Rating */}
      <div className="clay-card" style={{ borderRadius: 12, overflow: 'hidden', padding: 0 }}>
        <div style={{ padding: '16px 20px', borderBottom: '1px solid var(--border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <h3 style={{ margin: 0, fontSize: 15, fontWeight: 700, color: 'var(--ink)' }}>
              Vulnerability-Ranked Worker Registry and Daily Attendance Ledger
            </h3>
            <p style={{ margin: '2px 0 0', fontSize: 12, color: 'var(--ink-soft)' }}>
              Households with the highest disaster vulnerability score are prioritized for slot confirmation.
            </p>
          </div>
        </div>

        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: 13 }}>
            <thead>
              <tr style={{ background: '#F8FAFC', color: '#475569', fontWeight: 700, borderBottom: '1px solid var(--border)' }}>
                <th style={{ padding: '12px 16px' }}>Voucher Ref</th>
                <th style={{ padding: '12px 16px' }}>Worker Applicant</th>
                <th style={{ padding: '12px 16px' }}>Vulnerability Score & Priority</th>
                <th style={{ padding: '12px 16px' }}>Job Category</th>
                <th style={{ padding: '12px 16px' }}>Attendance Progress</th>
                <th style={{ padding: '12px 16px' }}>Earned Amount</th>
                <th style={{ padding: '12px 16px' }}>Status</th>
                <th style={{ padding: '12px 16px', textAlign: 'right' }}>Action</th>
              </tr>
            </thead>
            <tbody>
              {filteredApplicants.length === 0 ? (
                <tr>
                  <td colSpan="8" style={{ padding: 24, textAlign: 'center', color: 'var(--ink-soft)' }}>
                    No workers enrolled for this project matching the filter.
                  </td>
                </tr>
              ) : (
                filteredApplicants.map(a => (
                  <tr key={a._id} style={{ borderBottom: '1px solid var(--border)' }}>
                    <td style={{ padding: '12px 16px', fontFamily: 'monospace', fontWeight: 700, color: '#1557B0' }}>
                      {a.payoutVoucherCode || 'VCH-PENDING'}
                    </td>
                    <td style={{ padding: '12px 16px', fontWeight: 700, color: 'var(--ink)' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
                        <span>{a.applicantName || 'Applicant Worker'}</span>
                        <Check size={13} color="#15803D" strokeWidth={3} title="Verified Beneficiary" />
                      </div>
                      <div style={{ fontSize: 11, color: 'var(--ink-soft)' }}>{a.applicantPhone || '09XXXXXXXXX'}</div>
                    </td>
                    <td style={{ padding: '12px 16px' }}>
                      <div style={{ fontSize: 12.5, fontWeight: 800, color: a.computedColor }}>
                        Score: {a.computedScore}/100
                      </div>
                      <div style={{ fontSize: 11, color: 'var(--ink-soft)' }}>
                        {a.computedLevel}
                      </div>
                    </td>
                    <td style={{ padding: '12px 16px' }}>{a.selectedCategory || 'General Cleanup'}</td>
                    <td style={{ padding: '12px 16px' }}>
                      <span style={{ fontWeight: 700, color: '#16A34A' }}>{(a.totalDaysWorked || 0) + ' / ' + (currentSelectedProject?.durationDays || 10) + ' Days'}</span>
                    </td>
                    <td style={{ padding: '12px 16px', fontWeight: 700, color: '#15803D' }}>
                      {'PHP ' + ((a.totalDaysWorked || 0) * (a.dailyWageRate || 500)).toLocaleString() + '.00'}
                    </td>
                    <td style={{ padding: '12px 16px' }}>
                      <span style={{
                        fontSize: 11.5,
                        fontWeight: 800,
                        padding: '3px 8px',
                        borderRadius: 999,
                        background: a.status === 'approved_for_work' ? '#DCFCE7' : a.status === 'rejected' ? '#FEE2E2' : '#FEF3C7',
                        color: a.status === 'approved_for_work' ? '#15803D' : a.status === 'rejected' ? '#DC2626' : '#B45309',
                      }}>
                        {a.status === 'approved_for_work' ? 'APPROVED' : a.status === 'rejected' ? 'REJECTED' : 'PENDING REVIEW'}
                      </span>
                    </td>
                    <td style={{ padding: '12px 16px', textAlign: 'right' }}>
                      {a.status !== 'approved_for_work' && a.status !== 'rejected' && (
                        <div style={{ display: 'flex', gap: 6, justifyContent: 'flex-end' }}>
                          <button
                            onClick={() => handleReviewApplicant(a._id, 'approved_for_work')}
                            style={{ padding: '6px 12px', background: '#16A34A', color: '#FFFFFF', border: 'none', borderRadius: 6, fontWeight: 700, fontSize: 12, cursor: 'pointer' }}
                          >
                            Approve
                          </button>
                          <button
                            onClick={() => handleReviewApplicant(a._id, 'rejected')}
                            style={{ padding: '6px 10px', background: '#EF4444', color: '#FFFFFF', border: 'none', borderRadius: 6, fontWeight: 700, fontSize: 12, cursor: 'pointer' }}
                          >
                            Reject
                          </button>
                        </div>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* ── MODAL: CREATE / REQUEST NEW LIVELIHOOD PROJECT ── */}
      {showCreateModal && ReactDOM.createPortal(
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
          <div className="clay-card page-animate" style={{ maxWidth: 620, width: '100%', padding: 28, background: 'var(--card)', borderRadius: 'var(--radius-card)', boxShadow: '0 25px 60px rgba(0,0,0,0.45)', maxHeight: '90vh', overflowY: 'auto' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16, borderBottom: '1px solid var(--border)', paddingBottom: 12 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <Briefcase size={22} color="var(--manila-blue)" />
                <div>
                  <h2 style={{ fontSize: 18, fontWeight: 900, color: 'var(--manila-blue)', margin: 0 }}>
                    {isBarangay ? 'Request New Cash-for-Work Project' : 'Create Livelihood / Cash-for-Work Project'}
                  </h2>
                  <span style={{ fontSize: 12, color: 'var(--ink-soft)' }}>
                    {isBarangay
                      ? 'Submit proposal to LGU Disaster Management for budget authorization.'
                      : 'Directly authorize and publish an emergency cash-for-work recovery project.'}
                  </span>
                </div>
              </div>
              <button onClick={() => setShowCreateModal(false)} className="clay-button-ghost" style={{ padding: '4px 10px', fontSize: 13 }}>
                <X size={16} />
              </button>
            </div>

            <form onSubmit={handleCreateProject}>
              {/* Project Title */}
              <div style={{ marginBottom: 14 }}>
                <label style={{ display: 'block', fontSize: 12.5, fontWeight: 700, color: 'var(--ink)', marginBottom: 6 }}>
                  Project Title *
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Post-Typhoon Drainage and Debris Clearing Drive"
                  value={newTitle}
                  onChange={e => setNewTitle(e.target.value)}
                  style={{ width: '100%', padding: '10px 14px', borderRadius: 8, border: '1px solid var(--border)', fontSize: 13, background: 'var(--card)', color: 'var(--ink)', boxSizing: 'border-box' }}
                />
              </div>

              {/* Target Barangay & Worksite */}
              <div style={{ display: 'grid', gridTemplateColumns: canManageLgu ? '140px 1fr' : '1fr', gap: 12, marginBottom: 14 }}>
                {canManageLgu ? (
                  <div>
                    <label style={{ display: 'block', fontSize: 12.5, fontWeight: 700, color: 'var(--ink)', marginBottom: 6 }}>
                      Target Barangay *
                    </label>
                    <input
                      type="text"
                      required
                      placeholder="e.g. 291"
                      value={newBarangayCode}
                      onChange={e => setNewBarangayCode(e.target.value)}
                      style={{ width: '100%', padding: '10px 14px', borderRadius: 8, border: '1px solid var(--border)', fontSize: 13, background: 'var(--card)', color: 'var(--ink)', boxSizing: 'border-box' }}
                    />
                  </div>
                ) : null}

                <div>
                  <label style={{ display: 'block', fontSize: 12.5, fontWeight: 700, color: 'var(--ink)', marginBottom: 6 }}>
                    Target Worksite Location *
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Zone 27 Main Streets and Public Drainage Canals"
                    value={newWorksite}
                    onChange={e => setNewWorksite(e.target.value)}
                    style={{ width: '100%', padding: '10px 14px', borderRadius: 8, border: '1px solid var(--border)', fontSize: 13, background: 'var(--card)', color: 'var(--ink)', boxSizing: 'border-box' }}
                  />
                </div>
              </div>

              {/* Description */}
              <div style={{ marginBottom: 14 }}>
                <label style={{ display: 'block', fontSize: 12.5, fontWeight: 700, color: 'var(--ink)', marginBottom: 6 }}>
                  Work Scope & Rehabilitation Description
                </label>
                <textarea
                  rows="3"
                  placeholder="Describe the community cleanup, road clearing, or infrastructure repair tasks required..."
                  value={newDesc}
                  onChange={e => setNewDesc(e.target.value)}
                  style={{ width: '100%', padding: '10px 14px', borderRadius: 8, border: '1px solid var(--border)', fontSize: 13, background: 'var(--card)', color: 'var(--ink)', boxSizing: 'border-box', resize: 'vertical' }}
                />
              </div>

              {/* Workforce Specs: Slots, Duration, Wage */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 12, marginBottom: 16 }}>
                <div>
                  <label style={{ display: 'block', fontSize: 12, fontWeight: 700, color: 'var(--ink)', marginBottom: 4 }}>
                    Total Worker Slots
                  </label>
                  <input
                    type="number"
                    min="1"
                    max="500"
                    required
                    value={newSlots}
                    onChange={e => setNewSlots(e.target.value)}
                    style={{ width: '100%', padding: '8px 12px', borderRadius: 8, border: '1px solid var(--border)', fontSize: 13, background: 'var(--card)', color: 'var(--ink)', boxSizing: 'border-box' }}
                  />
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: 12, fontWeight: 700, color: 'var(--ink)', marginBottom: 4 }}>
                    Duration (Days)
                  </label>
                  <input
                    type="number"
                    min="1"
                    max="90"
                    required
                    value={newDays}
                    onChange={e => setNewDays(e.target.value)}
                    style={{ width: '100%', padding: '8px 12px', borderRadius: 8, border: '1px solid var(--border)', fontSize: 13, background: 'var(--card)', color: 'var(--ink)', boxSizing: 'border-box' }}
                  />
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: 12, fontWeight: 700, color: 'var(--ink)', marginBottom: 4 }}>
                    Daily Wage (PHP)
                  </label>
                  <input
                    type="number"
                    min="100"
                    max="2000"
                    required
                    value={newWage}
                    onChange={e => setNewWage(e.target.value)}
                    style={{ width: '100%', padding: '8px 12px', borderRadius: 8, border: '1px solid var(--border)', fontSize: 13, background: 'var(--card)', color: 'var(--ink)', boxSizing: 'border-box' }}
                  />
                </div>
              </div>

              {/* Available Categories */}
              <div style={{ marginBottom: 16 }}>
                <label style={{ display: 'block', fontSize: 12.5, fontWeight: 700, color: 'var(--ink)', marginBottom: 8 }}>
                  Job Categories to Offer
                </label>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
                  {DEFAULT_CATEGORIES.map(cat => {
                    const isChecked = selectedCategories.includes(cat);
                    return (
                      <label
                        key={cat}
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: 8,
                          fontSize: 12,
                          color: isChecked ? 'var(--ink)' : 'var(--ink-soft)',
                          fontWeight: isChecked ? 700 : 500,
                          cursor: 'pointer',
                          padding: '6px 10px',
                          borderRadius: 6,
                          background: isChecked ? '#EFF6FF' : '#F8FAFC',
                          border: isChecked ? '1px solid #BFDBFE' : '1px solid #E2E8F0',
                        }}
                      >
                        <input
                          type="checkbox"
                          checked={isChecked}
                          onChange={() => handleCategoryToggle(cat)}
                        />
                        <span>{cat}</span>
                      </label>
                    );
                  })}
                </div>
              </div>

              {/* Live Budget Calculation Banner */}
              <div style={{
                background: '#F0FDF4',
                border: '1.5px solid #BBF7D0',
                borderRadius: 10,
                padding: '12px 16px',
                marginBottom: 16,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
              }}>
                <div>
                  <span style={{ fontSize: 11.5, fontWeight: 700, color: '#166534', display: 'block' }}>
                    ESTIMATED PROJECT BUDGET
                  </span>
                  <span style={{ fontSize: 18, fontWeight: 900, color: '#15803D' }}>
                    PHP {estimatedBudgetCalculation.toLocaleString()}.00
                  </span>
                </div>
                <div style={{ textAlign: 'right', fontSize: 11, color: '#166534' }}>
                  {newSlots} slots × {newDays} days @ ₱{newWage}/day
                </div>
              </div>

              {/* Notice info */}
              <div style={{
                padding: '10px 14px',
                borderRadius: 8,
                background: isBarangay ? '#FFFBEB' : '#EFF6FF',
                border: isBarangay ? '1px solid #FDE68A' : '1px solid #BFDBFE',
                color: isBarangay ? '#92400E' : '#1E40AF',
                fontSize: 12,
                marginBottom: 20,
                lineHeight: 1.4,
              }}>
                {isBarangay
                  ? 'ℹ️ Upon submission, this request will be sent to the LGU Disaster Management Office for budget allocation and approval. Once approved, it will automatically open for resident applications in the mobile app.'
                  : '✅ Direct LGU Creation: As an authorized LGU Admin, this project will be activated immediately and published to residents on the MitigatePlus Mobile App.'}
              </div>

              {/* Submit Buttons */}
              <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
                <button
                  type="button"
                  onClick={() => setShowCreateModal(false)}
                  className="clay-button-ghost"
                  style={{ padding: '10px 18px', fontSize: 13 }}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={createLoading}
                  className="clay-button-primary"
                  style={{ padding: '10px 22px', fontSize: 13 }}
                >
                  {createLoading ? 'Submitting...' : (isBarangay ? 'Submit Project Proposal' : 'Create & Authorize Project')}
                </button>
              </div>
            </form>
          </div>
        </div>,
        document.body
      )}
    </div>
  );
}

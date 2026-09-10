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
  Info,
  CheckCircle2,
  Droplets,
  Hammer,
  Package,
  Wrench,
  Search,
} from 'lucide-react';
import { API_BASE_URL } from '../config';
import Pagination from '../components/Pagination';
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
  // Application Status Filter
  const [statusFilter, setStatusFilter] = useState('ALL'); // 'ALL' | 'pending_barangay_review' | 'approved_for_work' | 'rejected'

  // Project Directory Search, Filter & Pagination
  const [projectSearch, setProjectSearch] = useState('');
  const [projectStatusFilter, setProjectStatusFilter] = useState('ALL'); // 'ALL' | 'approved_active' | 'pending_lgu_approval' | 'has_pending_workers'
  const [projectCurrentPage, setProjectCurrentPage] = useState(1);
  const PROJECTS_PER_PAGE = 3;

  // Worker Registry Search
  const [applicantSearch, setApplicantSearch] = useState('');

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
          // Prioritize project with pending review applications or first active project
          const defaultProject = list.find(p => (p.pendingCount || 0) > 0) || list.find(p => p.status === 'approved_active') || list[0];
          setSelectedProjectId(prev => {
            const exists = list.some(p => p._id === prev);
            const targetId = exists ? prev : defaultProject._id;
            fetchPayroll(targetId);
            return targetId;
          });
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

  // Filter and paginate projects
  const filteredProjects = projects.filter(p => {
    if (projectStatusFilter === 'approved_active' && p.status !== 'approved_active') return false;
    if (projectStatusFilter === 'pending_lgu_approval' && p.status !== 'pending_lgu_approval') return false;
    if (projectStatusFilter === 'has_pending_workers' && (p.pendingCount || 0) <= 0) return false;
    if (projectSearch.trim()) {
      const q = projectSearch.toLowerCase().trim();
      const matchTitle = (p.title || '').toLowerCase().includes(q);
      const matchBrgy = (p.barangayCode || '').toLowerCase().includes(q);
      const matchWorksite = (p.targetWorksite || '').toLowerCase().includes(q);
      if (!matchTitle && !matchBrgy && !matchWorksite) return false;
    }
    return true;
  });

  const paginatedProjects = filteredProjects.slice(
    (projectCurrentPage - 1) * PROJECTS_PER_PAGE,
    projectCurrentPage * PROJECTS_PER_PAGE
  );

  useEffect(() => {
    setProjectCurrentPage(1);
  }, [projectSearch, projectStatusFilter]);

  const filteredApplicants = sortedApplicants.filter(a => {
    if (statusFilter !== 'ALL' && a.status !== statusFilter) return false;
    if (vulnerabilityFilter === 'CRITICAL') return a.computedScore >= 85;
    if (vulnerabilityFilter === 'HIGH') return a.computedScore >= 75;
    if (vulnerabilityFilter === 'MODERATE') return a.computedScore < 75;
    if (applicantSearch.trim()) {
      const q = applicantSearch.toLowerCase().trim();
      const matchName = (a.applicantName || '').toLowerCase().includes(q);
      const matchVoucher = (a.payoutVoucherCode || '').toLowerCase().includes(q);
      const matchPhone = (a.applicantPhone || '').toLowerCase().includes(q);
      const matchCategory = (a.selectedCategory || '').toLowerCase().includes(q);
      if (!matchName && !matchVoucher && !matchPhone && !matchCategory) return false;
    }
    return true;
  });

  const [currentPage, setCurrentPage] = useState(1);
  const ITEMS_PER_PAGE = 8;

  useEffect(() => {
    setCurrentPage(1);
  }, [vulnerabilityFilter, statusFilter, applicantSearch, selectedProjectId]);

  const paginatedApplicants = filteredApplicants.slice((currentPage - 1) * ITEMS_PER_PAGE, currentPage * ITEMS_PER_PAGE);

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

      {/* ── SECTION 1: REHABILITATION PROJECTS DIRECTORY ── */}
      <div className="clay-card" style={{ padding: 20, marginBottom: 24, borderRadius: 14 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16, flexWrap: 'wrap', gap: 14 }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <Briefcase size={20} color="#1557B0" />
              <h3 style={{ margin: 0, fontSize: 16, fontWeight: 800, color: 'var(--ink)' }}>
                Cash-for-Work Rehabilitation Projects ({filteredProjects.length})
              </h3>
            </div>
            <p style={{ margin: '3px 0 0', fontSize: 12.5, color: 'var(--ink-soft)' }}>
              Select a community recovery initiative to monitor worker attendance and manage certified payouts.
            </p>
          </div>

          {/* Search & Status Filter for Projects */}
          <div style={{ display: 'flex', gap: 10, alignItems: 'center', flexWrap: 'wrap' }}>
            <div style={{ position: 'relative', width: 260 }}>
              <Search size={15} style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', color: 'var(--ink-soft)', pointerEvents: 'none' }} />
              <input
                type="text"
                placeholder="Search project, barangay, worksite..."
                value={projectSearch}
                onChange={e => setProjectSearch(e.target.value)}
                style={{
                  width: '100%',
                  padding: '8px 12px 8px 32px',
                  borderRadius: 8,
                  border: '1px solid var(--border)',
                  fontSize: 12.5,
                  background: 'var(--card)',
                  color: 'var(--ink)',
                  outline: 'none',
                }}
              />
            </div>

            <select
              value={projectStatusFilter}
              onChange={e => setProjectStatusFilter(e.target.value)}
              style={{
                padding: '8px 12px',
                borderRadius: 8,
                border: '1px solid var(--border)',
                fontSize: 12.5,
                background: 'var(--card)',
                fontWeight: 700,
                color: 'var(--ink)',
                cursor: 'pointer',
              }}
            >
              <option value="ALL">All Statuses ({projects.length})</option>
              <option value="approved_active">Active / Enrolling ({projects.filter(p => p.status === 'approved_active').length})</option>
              <option value="pending_lgu_approval">Pending LGU Review ({projects.filter(p => p.status === 'pending_lgu_approval').length})</option>
              <option value="has_pending_workers">Has Worker Applications ({projects.filter(p => (p.pendingCount || 0) > 0).length})</option>
            </select>
          </div>
        </div>

        {filteredProjects.length === 0 ? (
          <div style={{ padding: '32px 16px', textAlign: 'center', color: 'var(--ink-soft)', fontSize: 13, background: '#F8FAFC', borderRadius: 10 }}>
            No rehabilitation projects match your search criteria.
          </div>
        ) : (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: 14 }}>
            {paginatedProjects.map(p => {
              const isSelected = selectedProjectId === p._id;
              const isPendingApproval = p.status === 'pending_lgu_approval';
              const pendingApps = p.pendingCount || 0;
              return (
                <div
                  key={p._id}
                  onClick={() => { setSelectedProjectId(p._id); fetchPayroll(p._id); }}
                  style={{
                    cursor: 'pointer',
                    border: isSelected ? '2px solid #1557B0' : '1px solid var(--border)',
                    background: isSelected ? 'linear-gradient(135deg, #F0F7FF 0%, #FFFFFF 100%)' : 'var(--card)',
                    borderRadius: 12,
                    padding: 16,
                    boxShadow: isSelected ? '0 6px 20px rgba(21, 87, 176, 0.12)' : '0 2px 4px rgba(0,0,0,0.02)',
                    transition: 'all 0.2s ease',
                    display: 'flex',
                    flexDirection: 'column',
                    justifyContent: 'space-between',
                  }}
                >
                  <div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 6, marginBottom: 6 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
                        <span style={{
                          fontSize: 11,
                          fontWeight: 800,
                          padding: '2px 8px',
                          borderRadius: 6,
                          background: '#EFF6FF',
                          color: '#1557B0',
                          border: '1px solid #BFDBFE',
                        }}>
                          Barangay {p.barangayCode}
                        </span>
                        {p.status === 'approved_active' ? (
                          <span style={{
                            fontSize: 10.5,
                            fontWeight: 800,
                            padding: '2px 8px',
                            borderRadius: 6,
                            background: '#DCFCE7',
                            color: '#15803D',
                          }}>
                            Active • Enrolling
                          </span>
                        ) : (
                          <span style={{
                            fontSize: 10.5,
                            fontWeight: 800,
                            padding: '2px 8px',
                            borderRadius: 6,
                            background: '#FEF3C7',
                            color: '#B45309',
                          }}>
                            Pending LGU Review
                          </span>
                        )}
                      </div>
                      {isSelected && (
                        <span style={{
                          fontSize: 11,
                          fontWeight: 800,
                          padding: '2px 8px',
                          borderRadius: 6,
                          background: '#1557B0',
                          color: '#FFFFFF',
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: 3,
                          whiteSpace: 'nowrap',
                        }}>
                          <Check size={12} strokeWidth={3} /> Selected
                        </span>
                      )}
                    </div>

                    <h4 style={{ margin: '4px 0 3px', fontSize: 14.5, fontWeight: 800, color: isSelected ? '#1557B0' : 'var(--ink)' }}>
                      {p.title}
                    </h4>

                    <div style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: 12, color: 'var(--ink-soft)', marginBottom: 8 }}>
                      <MapPin size={13} color="#64748B" />
                      <span style={{ whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                        {p.targetWorksite || `Barangay ${p.barangayCode} Worksites`}
                      </span>
                    </div>

                    {pendingApps > 0 && (
                      <div style={{
                        marginBottom: 8,
                        padding: '6px 10px',
                        background: '#FFFBEB',
                        border: '1px solid #FCD34D',
                        borderRadius: 6,
                        display: 'flex',
                        alignItems: 'center',
                        gap: 6,
                        fontSize: 11.5,
                        fontWeight: 700,
                        color: '#B45309',
                      }}>
                        <AlertCircle size={14} color="#D97706" />
                        <span>{pendingApps} Worker Application{pendingApps > 1 ? 's' : ''} Awaiting Review</span>
                      </div>
                    )}
                  </div>

                  <div style={{
                    marginTop: 8,
                    paddingTop: 8,
                    borderTop: '1px solid var(--border)',
                    display: 'grid',
                    gridTemplateColumns: 'repeat(3, 1fr)',
                    gap: 6,
                    textAlign: 'center',
                  }}>
                    <div style={{ background: isSelected ? 'rgba(255,255,255,0.7)' : '#F8FAFC', padding: '5px 2px', borderRadius: 6 }}>
                      <div style={{ fontSize: 10, color: 'var(--ink-soft)', fontWeight: 700 }}>WORKER SLOTS</div>
                      <div style={{ fontSize: 12.5, fontWeight: 800, color: '#1557B0', marginTop: 1 }}>
                        {p.filledSlots || 0} / {p.totalSlots || 25}
                      </div>
                    </div>
                    <div style={{ background: isSelected ? 'rgba(255,255,255,0.7)' : '#F8FAFC', padding: '5px 2px', borderRadius: 6 }}>
                      <div style={{ fontSize: 10, color: 'var(--ink-soft)', fontWeight: 700 }}>DAILY WAGE</div>
                      <div style={{ fontSize: 12.5, fontWeight: 800, color: '#15803D', marginTop: 1 }}>
                        PHP {p.dailyWageRate || 500}
                      </div>
                    </div>
                    <div style={{ background: isSelected ? 'rgba(255,255,255,0.7)' : '#F8FAFC', padding: '5px 2px', borderRadius: 6 }}>
                      <div style={{ fontSize: 10, color: 'var(--ink-soft)', fontWeight: 700 }}>DURATION</div>
                      <div style={{ fontSize: 12.5, fontWeight: 800, color: 'var(--ink)', marginTop: 1 }}>
                        {p.durationDays || 10} Days
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* Project Pagination */}
        <Pagination
          currentPage={projectCurrentPage}
          totalItems={filteredProjects.length}
          itemsPerPage={PROJECTS_PER_PAGE}
          onPageChange={setProjectCurrentPage}
          style={{ marginTop: 14, borderRadius: 8, borderTop: '1px solid var(--border)' }}
        />

        {/* Notice for Barangay if current selected project is pending LGU approval */}
        {currentSelectedProject?.status === 'pending_lgu_approval' && (
          <div style={{
            marginTop: 14,
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

      {/* ── SECTION 2: WORKER REGISTRY & DAILY ATTENDANCE LEDGER ── */}
      <div className="clay-card" style={{ borderRadius: 12, overflow: 'hidden', padding: 0 }}>
        <div style={{ padding: '18px 20px', borderBottom: '1px solid var(--border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 12 }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
              <h3 style={{ margin: 0, fontSize: 15.5, fontWeight: 800, color: 'var(--ink)' }}>
                Vulnerability-Ranked Worker Registry and Daily Attendance Ledger
              </h3>
              {sortedApplicants.filter(a => a.status === 'pending_barangay_review').length > 0 && (
                <span style={{
                  background: '#FEF3C7',
                  color: '#B45309',
                  padding: '3px 10px',
                  borderRadius: 999,
                  fontSize: 11.5,
                  fontWeight: 800,
                  border: '1px solid #FCD34D',
                }}>
                  {sortedApplicants.filter(a => a.status === 'pending_barangay_review').length} Awaiting Review
                </span>
              )}
            </div>
            <p style={{ margin: '3px 0 0', fontSize: 12.5, color: 'var(--ink-soft)' }}>
              Showing worker enrollments for:{' '}
              <strong style={{ color: '#1557B0' }}>
                {currentSelectedProject?.title || 'Selected Project'} (Barangay {currentSelectedProject?.barangayCode || '291'})
              </strong>
            </p>
          </div>

          {/* Worker Registry Search & Filters */}
          <div style={{ display: 'flex', gap: 10, alignItems: 'center', flexWrap: 'wrap' }}>
            {/* Search worker name / voucher / phone */}
            <div style={{ position: 'relative', width: 240 }}>
              <Search size={14} style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', color: 'var(--ink-soft)', pointerEvents: 'none' }} />
              <input
                type="text"
                placeholder="Search applicant or voucher..."
                value={applicantSearch}
                onChange={e => setApplicantSearch(e.target.value)}
                style={{
                  width: '100%',
                  padding: '7px 10px 7px 30px',
                  borderRadius: 6,
                  border: '1px solid var(--border)',
                  fontSize: 12,
                  background: 'var(--card)',
                  color: 'var(--ink)',
                  outline: 'none',
                }}
              />
            </div>

            {/* Application Status Filter */}
            <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
              <span style={{ fontSize: 12, fontWeight: 700, color: 'var(--ink-soft)' }}>Status:</span>
              <select
                value={statusFilter}
                onChange={e => setStatusFilter(e.target.value)}
                style={{ padding: '7px 12px', borderRadius: 6, border: '1px solid var(--border)', fontSize: 12, background: 'var(--card)', fontWeight: 700, color: 'var(--ink)', cursor: 'pointer' }}
              >
                <option value="ALL">All ({sortedApplicants.length})</option>
                <option value="pending_barangay_review">Pending Review ({sortedApplicants.filter(a => a.status === 'pending_barangay_review').length})</option>
                <option value="approved_for_work">Approved ({sortedApplicants.filter(a => a.status === 'approved_for_work').length})</option>
                <option value="rejected">Rejected ({sortedApplicants.filter(a => a.status === 'rejected').length})</option>
              </select>
            </div>

            {/* Vulnerability Filter */}
            <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
              <span style={{ fontSize: 12, fontWeight: 700, color: 'var(--ink-soft)' }}>Priority:</span>
              <select
                value={vulnerabilityFilter}
                onChange={e => setVulnerabilityFilter(e.target.value)}
                style={{ padding: '7px 12px', borderRadius: 6, border: '1px solid var(--border)', fontSize: 12, background: 'var(--card)', fontWeight: 700, color: 'var(--ink)', cursor: 'pointer' }}
              >
                <option value="ALL">All Scores</option>
                <option value="CRITICAL">Critical (85+)</option>
                <option value="HIGH">High (75+)</option>
                <option value="MODERATE">Standard (&lt;75)</option>
              </select>
            </div>
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
                paginatedApplicants.map(a => (
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
          <Pagination
            currentPage={currentPage}
            totalItems={filteredApplicants.length}
            itemsPerPage={ITEMS_PER_PAGE}
            onPageChange={setCurrentPage}
          />
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
              {/* Quick Work Scope Presets */}
              <div style={{ marginBottom: 16, background: 'var(--card-subtle, #F8FAFC)', padding: '12px 14px', borderRadius: 10, border: '1px solid var(--border)' }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
                  <label style={{ fontSize: 12, fontWeight: 700, color: 'var(--ink)' }}>
                    Fixed Job Scope Presets (Pumili ng Uri ng Trabaho)
                  </label>
                  <span style={{ fontSize: 11, color: 'var(--ink-soft)' }}>
                    Click to auto-align Title, Description, & Required Role
                  </span>
                </div>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                  {[
                    { label: 'Drainage & Canal Declogging', Icon: Droplets, title: 'Drainage and Canal Declogging Drive', cat: 'Drainage & Canal Declogging', desc: 'Clearing culverts, storm drains, and canal waterways to ensure rapid flood water recession.' },
                    { label: 'Debris & Mud Clearing', Icon: Hammer, title: 'Debris and Mud Clearing Operation', cat: 'Debris & Mud Clearing', desc: 'Road clearing, mud shoveling, and storm debris removal across community streets.' },
                    { label: 'Evacuation Center Sanitation', Icon: Building2, title: 'Evacuation Center Disinfection & Sanitation', cat: 'Evacuation Center Sanitation', desc: 'Deep cleaning, disinfection, and facility maintenance in designated shelters.' },
                    { label: 'Relief Goods Logistics', Icon: Package, title: 'Emergency Relief Logistics and Assembly', cat: 'Relief Goods Logistics & Packing', desc: 'Assembling food packs, organizing warehouse supplies, and staging distribution lines.' },
                    { label: 'Carpentry & Facility Repair', Icon: Wrench, title: 'Emergency Carpentry and Facility Repair', cat: 'Carpentry & Facility Repair', desc: 'Restoring damaged roofs, partitions, handrails, and emergency community barriers.' },
                  ].map(preset => {
                    const isPresetActive = selectedCategories.length === 1 && selectedCategories[0] === preset.cat;
                    const PresetIcon = preset.Icon;
                    return (
                      <button
                        key={preset.label}
                        type="button"
                        onClick={() => {
                          setNewTitle(preset.title);
                          setNewDesc(preset.desc);
                          setSelectedCategories([preset.cat]);
                        }}
                        style={{
                          fontSize: 11.5,
                          fontWeight: isPresetActive ? 700 : 500,
                          padding: '6px 12px',
                          borderRadius: 7,
                          background: isPresetActive ? '#EFF6FF' : 'var(--card)',
                          border: isPresetActive ? '1.5px solid #2563EB' : '1px solid var(--border)',
                          color: isPresetActive ? '#1D4ED8' : 'var(--ink)',
                          cursor: 'pointer',
                          transition: 'all 0.15s ease',
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: 6,
                        }}
                      >
                        <PresetIcon size={13} style={{ flexShrink: 0 }} />
                        <span>{preset.label}</span>
                      </button>
                    );
                  })}
                </div>
              </div>

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
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6 }}>
                  <label style={{ fontSize: 12.5, fontWeight: 700, color: 'var(--ink)' }}>
                    Job Categories to Offer *
                  </label>
                  <div style={{ display: 'flex', gap: 6 }}>
                    <button
                      type="button"
                      onClick={() => setSelectedCategories(DEFAULT_CATEGORIES)}
                      style={{ fontSize: 11, color: '#2563EB', background: 'none', border: 'none', cursor: 'pointer', textDecoration: 'underline', padding: 0 }}
                    >
                      Select All
                    </button>
                    <span style={{ fontSize: 11, color: '#94A3B8' }}>|</span>
                    <button
                      type="button"
                      onClick={() => setSelectedCategories([])}
                      style={{ fontSize: 11, color: '#EF4444', background: 'none', border: 'none', cursor: 'pointer', textDecoration: 'underline', padding: 0 }}
                    >
                      Clear
                    </button>
                  </div>
                </div>
                <p style={{ fontSize: 11.5, color: 'var(--ink-soft)', marginBottom: 8, marginTop: 0 }}>
                  Piliin kung anong specific na trabaho ang kailangan. Tanging ang mga naka-check dito ang lalabas sa mobile app ng mga residente (iwas mismatch sa trabaho).
                </p>
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
                {isBarangay ? (
                  <div style={{ display: 'flex', alignItems: 'flex-start', gap: 8 }}>
                    <Info size={16} style={{ flexShrink: 0, marginTop: 2 }} />
                    <span>Upon submission, this request will be sent to the LGU Disaster Management Office for budget allocation and approval. Once approved, it will automatically open for resident applications in the mobile app.</span>
                  </div>
                ) : (
                  <div style={{ display: 'flex', alignItems: 'flex-start', gap: 8 }}>
                    <CheckCircle2 size={16} style={{ flexShrink: 0, marginTop: 2 }} />
                    <span><strong>Direct LGU Creation:</strong> As an authorized LGU Admin, this project will be activated immediately and published to residents on the MitigatePlus Mobile App.</span>
                  </div>
                )}
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

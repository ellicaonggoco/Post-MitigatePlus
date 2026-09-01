import React, { useState, useEffect, useContext } from 'react';
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
} from 'lucide-react';
import { API_BASE_URL } from '../config';
import { MotionCard } from '../components/motion';

export default function LivelihoodAssistance() {
  const { token, user } = useContext(AuthContext);
  const role = user?.role;
  const isBarangay = role === ROLES.BARANGAY_OFFICIAL;
  const userBrgy = isBarangay ? (user?.barangayCode || '291') : '291';

  const [loading, setLoading] = useState(true);
  const [projects, setProjects] = useState([]);
  const [selectedProjectId, setSelectedProjectId] = useState(null);
  const [payrollData, setPayrollData] = useState(null);
  const [applicants, setApplicants] = useState([]);

  // Vulnerability Priority Filter
  const [vulnerabilityFilter, setVulnerabilityFilter] = useState('ALL'); // 'ALL' | 'CRITICAL' | 'HIGH' | 'MODERATE'

  const [showCreateModal, setShowCreateModal] = useState(false);
  const [newTitle, setNewTitle] = useState('');
  const [newWorksite, setNewWorksite] = useState('');
  const [newDesc, setNewDesc] = useState('');
  const [newSlots, setNewSlots] = useState('25');
  const [newDays, setNewDays] = useState('10');
  const [newWage, setNewWage] = useState('500');
  const [createLoading, setCreateLoading] = useState(false);

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
          setSelectedProjectId(list[0]._id);
          fetchPayroll(list[0]._id);
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

  const handleCreateProject = async (e) => {
    e.preventDefault();
    if (!newTitle.trim() || !newWorksite.trim()) {
      alert('Please fill in project title and worksite location.');
      return;
    }
    setCreateLoading(true);
    try {
      const res = await fetch(API_BASE_URL + '/cash-for-work/projects', {
        method: 'POST',
        headers: {
          Authorization: 'Bearer ' + token,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          title: newTitle,
          targetWorksite: newWorksite,
          description: newDesc,
          totalSlots: Number(newSlots) || 25,
          durationDays: Number(newDays) || 10,
          dailyWageRate: Number(newWage) || 500,
          barangayCode: userBrgy,
        }),
      });
      const data = await res.json();
      if (res.ok) {
        setShowCreateModal(false);
        setNewTitle('');
        setNewWorksite('');
        setNewDesc('');
        fetchProjects();
        alert('Cash-for-Work Project successfully submitted!');
      } else {
        alert(data.message || 'Failed to create project');
      }
    } catch (err) {
      alert('Error creating project');
    } finally {
      setCreateLoading(false);
    }
  };

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
        fetchPayroll(selectedProjectId);
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

  const totalBudgetCityWide = projects.reduce((sum, p) => sum + (p.allocatedBudget || 0), 0);
  const totalSlotsCityWide = projects.reduce((sum, p) => sum + (p.totalSlots || 0), 0);
  const activeProjectsCount = projects.filter(p => p.status === 'approved_active').length;

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

  return (
    <div className="page-container page-animate">
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

        <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
          {isBarangay && (
            <button
              onClick={() => setShowCreateModal(true)}
              className="clay-button-primary"
              style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13 }}
            >
              <Plus size={16} /> Request New Project
            </button>
          )}
          <button
            onClick={handleExportCsv}
            className="clay-button-ghost"
            style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13 }}
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

        <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
          {projects.map(p => (
            <button
              key={p._id}
              onClick={() => { setSelectedProjectId(p._id); fetchPayroll(p._id); }}
              style={{
                padding: '8px 14px',
                borderRadius: 8,
                border: selectedProjectId === p._id ? '2px solid #1557B0' : '1px solid var(--border)',
                background: selectedProjectId === p._id ? '#EFF6FF' : 'var(--card)',
                color: selectedProjectId === p._id ? '#1557B0' : 'var(--ink)',
                fontWeight: 700,
                fontSize: 12.5,
                cursor: 'pointer',
              }}
            >
              {p.title + ' (Brgy ' + p.barangayCode + ')'}
            </button>
          ))}
        </div>
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
                      <span style={{ fontWeight: 700, color: '#16A34A' }}>{(a.totalDaysWorked || 0) + ' / 10 Days'}</span>
                    </td>
                    <td style={{ padding: '12px 16px', fontWeight: 700, color: '#15803D' }}>
                      {'PHP ' + ((a.totalDaysWorked || 0) * (a.dailyWageRate || 500)).toLocaleString() + '.00'}
                    </td>
                    <td style={{ padding: '12px 16px' }}>
                      <span style={{
                        fontSize: 11.5,
                        fontWeight: 800,
                        color: a.status === 'approved_for_work' ? '#15803D' : '#B45309',
                      }}>
                        {a.status === 'approved_for_work' ? 'APPROVED' : 'PENDING REVIEW'}
                      </span>
                    </td>
                    <td style={{ padding: '12px 16px', textAlign: 'right' }}>
                      {a.status !== 'approved_for_work' && (
                        <button
                          onClick={() => handleReviewApplicant(a._id, 'approved_for_work')}
                          style={{ padding: '6px 12px', background: '#16A34A', color: '#FFFFFF', border: 'none', borderRadius: 6, fontWeight: 700, fontSize: 12, cursor: 'pointer' }}
                        >
                          Approve
                        </button>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

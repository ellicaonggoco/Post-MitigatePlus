import React, { useState, useEffect, useContext, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { AuthContext } from '../context/AuthContext';
import { Shield, Filter, Search, BarChart2, Building2, Users, Truck } from 'lucide-react';
import { IconlyShield } from '../components/Sidebar';
import { API_BASE_URL } from '../config';
import { MotionCard, MotionNumberCounter } from '../components/motion';

export default function SmartPriorityDashboard() {
  const { token, user } = useContext(AuthContext);
  const navigate = useNavigate();
  const isLGU = user?.role === 'lgu_admin' || user?.role === 'lgu_superadmin';

  const [viewMode, setViewMode] = useState(isLGU ? 'barangay' : 'household');
  const [households, setHouseholds] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filterLevel, setFilterLevel] = useState('ALL');
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedBarangayFilter, setSelectedBarangayFilter] = useState('ALL');

  const fetchHouseholds = async () => {
    setLoading(true);
    try {
      let url = `${API_BASE_URL}/households`;
      if (filterLevel !== 'ALL') {
        url += `?priorityLevel=${filterLevel}`;
      }
      const res = await fetch(url, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      if (res.ok && data.households) {
        setHouseholds(data.households);
      } else {
        setHouseholds([]);
      }
    } catch (err) {
      setHouseholds([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (token) {
      fetchHouseholds();
    }
  }, [token, filterLevel]);

  // Aggregate Barangay Rankings
  const barangayRankings = useMemo(() => {
    const map = {};
    households.forEach(hh => {
      const code = String(hh.barangayCode || '291');
      if (!map[code]) {
        map[code] = {
          code,
          households: [],
          totalScore: 0,
          severeCount: 0,
          moderateCount: 0,
          minorCount: 0,
          vulnerableCount: 0,
          totalHeadcount: 0,
        };
      }
      const b = map[code];
      b.households.push(hh);
      b.totalScore += (hh.priorityScore || 0);
      b.totalHeadcount += (hh.memberCount || 1);
      if (hh.damageLevel === 'Totally Damaged' || hh.damageLevel === 'Severe') b.severeCount += 1;
      else if (hh.damageLevel === 'Moderate') b.moderateCount += 1;
      else b.minorCount += 1;

      const vuln = hh.members?.flatMap(m => m.specialConditions || []).length || 0;
      b.vulnerableCount += vuln;
    });

    const list = Object.values(map).map(b => {
      const avgScore = b.households.length > 0 ? Math.round(b.totalScore / b.households.length) : 0;
      let level = 'Low';
      if (avgScore >= 50 || b.severeCount > 0) level = 'High';
      else if (avgScore >= 25 || b.moderateCount > 0) level = 'Medium';
      return {
        ...b,
        avgScore,
        level,
      };
    });

    // Sort descending by avgScore, then severeCount, then totalHouseholds
    list.sort((a, b) => b.avgScore - a.avgScore || b.severeCount - a.severeCount || b.households.length - a.households.length);
    return list;
  }, [households]);

  const filteredBarangays = barangayRankings.filter(b => {
    const matchesSearch = b.code.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesLevel = filterLevel === 'ALL' || b.level === filterLevel;
    return matchesSearch && matchesLevel;
  });

  const filteredHouseholds = households.filter(hh => {
    const addressMatch = hh.address?.toLowerCase().includes(searchTerm.toLowerCase());
    const nameMatch = hh.headOfHouseholdUserId?.name?.toLowerCase().includes(searchTerm.toLowerCase());
    const brgyMatch = selectedBarangayFilter === 'ALL' || String(hh.barangayCode) === String(selectedBarangayFilter);
    return (addressMatch || nameMatch) && brgyMatch;
  });

  const priorityBadgeClass = (level) => {
    if (level === 'High') return 'badge badge-danger';
    if (level === 'Medium') return 'badge badge-warning';
    return 'badge badge-success';
  };

  return (
    <div className="page-container page-animate">
      {/* ── Page Header ── */}
      <div className="workflow-header" style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: '24px', flexWrap: 'wrap', gap: '16px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
          <div className="workflow-header__metric" style={{
            width: 48, height: 48, borderRadius: 'var(--radius-inner)',
            background: 'linear-gradient(135deg, var(--manila-blue), #1e5a7a)',
            display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
          }}>
            <IconlyShield size={24} color="#fff" />
          </div>
          <div>
            <h1 className="section-header" style={{ margin: 0, fontSize: '22px' }}>
              {viewMode === 'barangay' ? 'City-Wide Barangay Priority Index' : 'Household Recovery Priority Index'}
            </h1>
            <p style={{ fontSize: '13px', color: 'var(--ink-soft)', marginTop: '2px' }}>
              {viewMode === 'barangay'
                ? 'Data-driven ranking of Manila City Barangays to optimize relief convoy routing and emergency resource allocation.'
                : 'Individual household vulnerability scoring based on damage severity, family headcount, and special needs.'}
            </p>
          </div>
        </div>

        {!loading && (
          <div className="workflow-header__metric" style={{
            display: 'flex', alignItems: 'center', gap: '8px',
            background: 'rgba(255, 255, 255, 0.2)', padding: '8px 16px',
            borderRadius: 'var(--radius-pill)', border: '1px solid rgba(255, 255, 255, 0.4)',
          }}>
            <BarChart2 size={16} color="#ffffff" />
            <span style={{ fontSize: '13px', fontWeight: 800, color: '#ffffff' }}>
              {viewMode === 'barangay' ? (
                <>
                  <MotionNumberCounter value={filteredBarangays.length} /> Barangay{filteredBarangays.length !== 1 ? 's' : ''} Ranked
                </>
              ) : (
                <>
                  <MotionNumberCounter value={filteredHouseholds.length} /> Household{filteredHouseholds.length !== 1 ? 's' : ''}
                </>
              )}
            </span>
          </div>
        )}
      </div>

      {/* ── View Switcher & Filter Toolbar ── */}
      <div style={{
        display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '12px', flexWrap: 'wrap',
        background: 'var(--card)', border: '1px solid var(--border)',
        borderRadius: 'var(--radius-inner)', padding: '12px 16px', marginBottom: '20px',
      }}>
        {/* View Mode Toggle Buttons (for LGU Admins) */}
        {isLGU && (
          <div style={{ display: 'flex', background: 'var(--sampaguita)', padding: '4px', borderRadius: 'var(--radius-inner)', border: '1px solid var(--border)' }}>
            <button
              onClick={() => { setViewMode('barangay'); setSelectedBarangayFilter('ALL'); }}
              style={{
                display: 'flex', alignItems: 'center', gap: '6px',
                padding: '6px 14px', borderRadius: '6px', fontSize: '12.5px', fontWeight: 800,
                border: 'none', cursor: 'pointer',
                background: viewMode === 'barangay' ? 'var(--manila-blue)' : 'transparent',
                color: viewMode === 'barangay' ? '#FFFFFF' : 'var(--ink-soft)',
                boxShadow: viewMode === 'barangay' ? '0 2px 6px rgba(0,43,184,0.25)' : 'none',
              }}
            >
              <Building2 size={15} /> Barangay Priority Ranking
            </button>
            <button
              onClick={() => setViewMode('household')}
              style={{
                display: 'flex', alignItems: 'center', gap: '6px',
                padding: '6px 14px', borderRadius: '6px', fontSize: '12.5px', fontWeight: 800,
                border: 'none', cursor: 'pointer',
                background: viewMode === 'household' ? 'var(--manila-blue)' : 'transparent',
                color: viewMode === 'household' ? '#FFFFFF' : 'var(--ink-soft)',
                boxShadow: viewMode === 'household' ? '0 2px 6px rgba(0,43,184,0.25)' : 'none',
              }}
            >
              <Users size={15} /> All Households Roster
            </button>
          </div>
        )}

        {/* Search Input */}
        <div style={{
          display: 'flex', alignItems: 'center', gap: '8px',
          background: 'var(--sampaguita)', borderRadius: 'var(--radius-inner)',
          padding: '7px 12px', flex: '1', minWidth: '180px',
          border: '1px solid var(--border)',
        }}>
          <Search size={15} color="var(--ink-soft)" />
          <input
            type="text"
            aria-label="Search"
            placeholder={viewMode === 'barangay' ? 'Search Barangay number (e.g. 291)...' : 'Search resident name or address...'}
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            style={{ border: 'none', outline: 'none', fontSize: '13px', background: 'transparent', width: '100%', color: 'var(--ink)' }}
          />
        </div>

        {/* Priority filter */}
        <div style={{
          display: 'flex', alignItems: 'center', gap: '8px',
          background: 'var(--sampaguita)', borderRadius: 'var(--radius-inner)',
          padding: '7px 12px', border: '1px solid var(--border)',
        }}>
          <Filter size={15} color="var(--ink-soft)" />
          <select
            value={filterLevel}
            aria-label="Filter by priority level"
            onChange={(e) => setFilterLevel(e.target.value)}
            style={{ border: 'none', outline: 'none', fontSize: '13px', fontWeight: 600, background: 'transparent', color: 'var(--ink)', cursor: 'pointer' }}
          >
            <option value="ALL">All Priority Levels</option>
            <option value="High">High / Critical Need</option>
            <option value="Medium">Medium Need</option>
            <option value="Low">Low / Stable</option>
          </select>
        </div>

        {/* If filtering households, show active barangay tag */}
        {viewMode === 'household' && selectedBarangayFilter !== 'ALL' && (
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <span style={{ fontSize: '12px', color: 'var(--ink-soft)' }}>Filtering:</span>
            <span className="badge badge-info" style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
              Brgy {selectedBarangayFilter}
              <button
                onClick={() => setSelectedBarangayFilter('ALL')}
                style={{ border: 'none', background: 'transparent', cursor: 'pointer', color: 'inherit', fontWeight: 800 }}
              >
                ×
              </button>
            </span>
          </div>
        )}
      </div>

      {/* ── Main Data Card ── */}
      <MotionCard className="clay-card" style={{ padding: 0, overflow: 'hidden' }}>
        {loading ? (
          <div style={{ padding: '32px 24px', display: 'grid', gap: '12px' }}>
            {[1, 2, 3, 4, 5].map(i => (
              <div key={i} style={{ display: 'flex', gap: '16px', alignItems: 'center' }}>
                <div className="skeleton" style={{ width: 48, height: 48, borderRadius: 'var(--radius-inner)', flexShrink: 0 }} />
                <div style={{ flex: 1, display: 'grid', gap: 8 }}>
                  <div className="skeleton" style={{ height: 14, width: '50%', borderRadius: 6 }} />
                  <div className="skeleton" style={{ height: 12, width: '30%', borderRadius: 6 }} />
                </div>
                <div className="skeleton" style={{ width: 80, height: 28, borderRadius: 'var(--radius-pill)' }} />
                <div className="skeleton" style={{ width: 60, height: 20, borderRadius: 6 }} />
              </div>
            ))}
          </div>
        ) : viewMode === 'barangay' ? (
          /* 🏢 BARANGAY PRIORITY RANKINGS TABLE FOR LGU ADMIN */
          filteredBarangays.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '64px 40px' }}>
              <div style={{
                width: 64, height: 64, borderRadius: '50%',
                background: 'rgba(23,63,86,0.07)', display: 'flex',
                alignItems: 'center', justifyContent: 'center', margin: '0 auto 16px',
              }}>
                <Building2 size={28} color="var(--manila-blue)" />
              </div>
              <h2 style={{ fontSize: '18px', fontWeight: 700, color: 'var(--ink)', margin: '0 0 6px' }}>No Barangays found</h2>
              <p style={{ fontSize: '13px', color: 'var(--ink-soft)' }}>Try adjusting your search or priority filter.</p>
            </div>
          ) : (
            <div className="table-container">
              <table className="clay-table">
                <thead>
                  <tr>
                    <th style={{ width: '90px' }}>Rank</th>
                    <th>Barangay Location</th>
                    <th>Priority Score & Urgency</th>
                    <th>Damage Telemetry</th>
                    <th>Families & Vulnerabilities</th>
                    <th>Logistics Action</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredBarangays.map((b, idx) => (
                    <tr key={b.code}>
                      <td>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                          <span style={{
                            fontSize: '20px', fontWeight: 900,
                            color: idx === 0 ? '#DC2626' : idx === 1 ? '#EA580C' : idx === 2 ? '#D97706' : 'var(--manila-blue)',
                            minWidth: '32px', lineHeight: 1,
                          }}>
                            #{idx + 1}
                          </span>
                        </div>
                      </td>
                      <td>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                          <div style={{
                            width: 34, height: 34, borderRadius: '8px',
                            background: '#EFF6FF', border: '1px solid #BFDBFE',
                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                            fontWeight: 900, fontSize: '13px', color: 'var(--manila-blue)',
                          }}>
                            {b.code}
                          </div>
                          <div>
                            <div style={{ fontWeight: 800, color: 'var(--ink)', fontSize: '14px' }}>
                              Barangay {b.code}
                            </div>
                            <div style={{ fontSize: '11.5px', color: 'var(--ink-soft)' }}>
                              City of Manila • Zone District
                            </div>
                          </div>
                        </div>
                      </td>
                      <td>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                          <span className={priorityBadgeClass(b.level)}>
                            {b.level === 'High' ? '🔴 High / Critical' : b.level === 'Medium' ? '🟡 Moderate' : '🟢 Stable'}
                          </span>
                          <span style={{ fontSize: '13px', fontWeight: 800, color: 'var(--ink)' }}>
                            {b.avgScore} pts avg
                          </span>
                        </div>
                      </td>
                      <td>
                        <div style={{ fontSize: '12.5px', fontWeight: 700, color: b.severeCount > 0 ? '#DC2626' : 'var(--ink)' }}>
                          {b.severeCount > 0 && `🚨 ${b.severeCount} Severe / Total Damage`}
                          {b.severeCount === 0 && b.moderateCount > 0 && `⚠️ ${b.moderateCount} Moderate Damage`}
                          {b.severeCount === 0 && b.moderateCount === 0 && `✓ ${b.minorCount} Minor / No Severe Damage`}
                        </div>
                      </td>
                      <td>
                        <div style={{ fontSize: '13px', fontWeight: 700, color: 'var(--ink)' }}>
                          {b.households.length} Registered Family Unit{b.households.length !== 1 ? 's' : ''}
                        </div>
                        <div style={{ fontSize: '11.5px', color: 'var(--ink-soft)', marginTop: '2px' }}>
                          {b.totalHeadcount} total persons • {b.vulnerableCount} with special needs
                        </div>
                      </td>
                      <td>
                        <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                          <button
                            onClick={() => {
                              setSelectedBarangayFilter(b.code);
                              setViewMode('household');
                            }}
                            className="btn btn-secondary btn-sm"
                            style={{ display: 'flex', alignItems: 'center', gap: '4px', fontSize: '11.5px', padding: '5px 10px' }}
                          >
                            <Users size={13} /> View Families
                          </button>
                          <button
                            onClick={() => {
                              navigate(`/distribution-events?barangay=${b.code}`, {
                                state: { prefillBarangay: b.code },
                              });
                            }}
                            className="btn btn-primary btn-sm"
                            style={{ display: 'flex', alignItems: 'center', gap: '4px', fontSize: '11.5px', padding: '5px 10px', background: 'var(--manila-blue)', color: '#fff', fontWeight: 700 }}
                          >
                            <Truck size={13} /> Deploy Relief
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )
        ) : (
          /* 👥 INDIVIDUAL HOUSEHOLDS ROSTER */
          filteredHouseholds.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '64px 40px' }}>
              <div style={{
                width: 64, height: 64, borderRadius: '50%',
                background: 'rgba(23,63,86,0.07)', display: 'flex',
                alignItems: 'center', justifyContent: 'center', margin: '0 auto 16px',
              }}>
                <Shield size={28} color="var(--manila-blue)" />
              </div>
              <h2 style={{ fontSize: '18px', fontWeight: 700, color: 'var(--ink)', margin: '0 0 6px' }}>No households found</h2>
              <p style={{ fontSize: '13px', color: 'var(--ink-soft)' }}>Try adjusting your search or priority filter.</p>
            </div>
          ) : (
            <div className="table-container">
              <table className="clay-table">
                <thead>
                  <tr>
                    <th style={{ width: '90px' }}>Rank</th>
                    <th>Resident & Address</th>
                    <th>Damage Level</th>
                    <th>Headcount & Vulnerabilities</th>
                    <th>Status</th>
                    <th>QR Identifier</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredHouseholds.map((hh, idx) => (
                    <tr key={hh._id}>
                      <td>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                          <span style={{
                            fontSize: '20px', fontWeight: 900, color: idx === 0 ? '#B45309' : idx === 1 ? '#475569' : idx === 2 ? '#92400E' : 'var(--manila-blue)',
                            minWidth: '32px', lineHeight: 1,
                          }}>
                            #{idx + 1}
                          </span>
                          <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                            <span className={priorityBadgeClass(hh.priorityLevel)}>
                              {hh.priorityLevel}
                            </span>
                            <span style={{ fontSize: '11px', fontWeight: 700, color: 'var(--ink-soft)' }}>
                              {hh.priorityScore} pts
                            </span>
                          </div>
                        </div>
                      </td>
                      <td>
                        <div style={{ fontWeight: 700, color: 'var(--ink)', fontSize: '14px' }}>
                          {hh.headOfHouseholdUserId?.name || 'Resident'}
                        </div>
                        <div style={{ fontSize: '12px', color: 'var(--ink-soft)', marginTop: '2px' }}>
                          {hh.address}, Purok {hh.purok} (Brgy {hh.barangayCode})
                        </div>
                      </td>
                      <td>
                        <span style={{
                          fontWeight: 700, fontSize: '13px',
                          color: hh.damageLevel === 'Totally Damaged' || hh.damageLevel === 'Severe' ? 'var(--danger)' : 'var(--ink)',
                        }}>
                          {hh.damageLevel || '—'}
                        </span>
                      </td>
                      <td>
                        <div style={{ fontSize: '13px', fontWeight: 700 }}>{hh.memberCount} member(s)</div>
                        <div style={{ fontSize: '11px', color: 'var(--ink-soft)', marginTop: '2px' }}>
                          {hh.members?.flatMap(m => m.specialConditions || []).join(', ') || 'No vulnerability tags'}
                        </div>
                      </td>
                      <td>
                        <span className={`badge ${hh.verificationStatus === 'verified' ? 'badge-success' : hh.verificationStatus === 'pending' ? 'badge-warning' : 'badge-danger'}`}>
                          {hh.verificationStatus}
                        </span>
                      </td>
                      <td>
                        <code style={{
                          fontSize: '11px', background: 'var(--sampaguita)', padding: '3px 8px',
                          borderRadius: 'var(--radius-inner)', color: 'var(--manila-blue)',
                          fontWeight: 600, letterSpacing: '0.02em',
                        }}>
                          {hh.qrCode}
                        </code>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )
        )}
      </MotionCard>
    </div>
  );
}

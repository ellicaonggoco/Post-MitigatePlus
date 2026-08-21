import React, { useState, useEffect, useContext } from 'react';
import { AuthContext } from '../context/AuthContext';
import { Shield, Filter, Search, BarChart2 } from 'lucide-react';
import { IconlyShield } from '../components/Sidebar';
import { API_BASE_URL } from '../config';
import { MotionCard, MotionNumberCounter } from '../components/motion';

export default function SmartPriorityDashboard() {
  const { token, user } = useContext(AuthContext);
  const [households, setHouseholds] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filterLevel, setFilterLevel] = useState('ALL');
  const [searchTerm, setSearchTerm] = useState('');

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

  const filteredList = households.filter(hh => {
    const addressMatch = hh.address?.toLowerCase().includes(searchTerm.toLowerCase());
    const nameMatch = hh.headOfHouseholdUserId?.name?.toLowerCase().includes(searchTerm.toLowerCase());
    return addressMatch || nameMatch;
  });

  const priorityBadgeClass = (level) => {
    if (level === 'High') return 'badge badge-danger';
    if (level === 'Medium') return 'badge badge-warning';
    return 'badge badge-success';
  };

  return (
    <div className="page-container page-animate">
      {/* ── Page Header ── */}
      <div className="workflow-header" style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: '28px', flexWrap: 'wrap', gap: '16px' }}>
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
              Smart Recovery Priority Index
            </h1>
            <p style={{ fontSize: '13px', color: 'var(--ink-soft)', marginTop: '2px' }}>
              Data-driven household ranking based on damage severity, vulnerability count, days pending, and assistance history.
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
              <MotionNumberCounter value={filteredList.length} /> household{filteredList.length !== 1 ? 's' : ''}
            </span>
          </div>
        )}
      </div>

      {/* ── Filter Toolbar ── */}
      <div style={{
        display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap',
        background: 'var(--card)', border: '1px solid var(--border)',
        borderRadius: 'var(--radius-inner)', padding: '10px 16px', marginBottom: '20px',
      }}>
        {/* Search */}
        <div style={{
          display: 'flex', alignItems: 'center', gap: '8px',
          background: 'var(--sampaguita)', borderRadius: 'var(--radius-inner)',
          padding: '7px 12px', flex: '1', minWidth: '180px',
          border: '1px solid var(--border)',
        }}>
          <Search size={15} color="var(--ink-soft)" />
          <input
            type="text"
            aria-label="Search resident or address"
            placeholder="Search resident or address..."
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
            <option value="High">High Priority (Score ≥ 50)</option>
            <option value="Medium">Medium Priority (25–49)</option>
            <option value="Low">Low Priority (&lt; 25)</option>
          </select>
        </div>
      </div>

      {/* ── Table Card with MotionCard ── */}
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
        ) : filteredList.length === 0 ? (
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
                {filteredList.map((hh, idx) => (
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
        )}
      </MotionCard>
    </div>
  );
}

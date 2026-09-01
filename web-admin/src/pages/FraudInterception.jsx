import React, { useState, useEffect, useContext } from 'react';
import { Shield, AlertTriangle, XCircle, Activity, ChevronLeft, ChevronRight, Search } from 'lucide-react';

import { AuthContext } from '../context/AuthContext';
import { API_BASE_URL, SOCKET_URL } from '../config';
import io from 'socket.io-client';
import { MotionCard, MotionBadge } from '../components/motion';

const SEV_CONFIG = {
  High: { color: '#DC2626', bg: '#FEF2F2' },
  Medium: { color: '#D97706', bg: '#FFFBEB' },
  Low: { color: '#2563EB', bg: '#EFF6FF' },
};

const ITEMS_PER_PAGE = 3;

export default function FraudInterception() {
  const { token } = useContext(AuthContext);
  const [attempts, setAttempts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('ALL');

  useEffect(() => {
    const fetchAttempts = async () => {
      setLoading(true);
      try {
        const res = await fetch(`${API_BASE_URL}/reports/duplicate-attempts`, {
          headers: { Authorization: 'Bearer ' + token, 'Content-Type': 'application/json' }
        });
        const data = await res.json();
        if (res.ok) {
          setAttempts(data.attempts || data || []);
        } else {
          setAttempts([]);
        }
      } catch (err) {
        setAttempts([]);
      } finally {
        setLoading(false);
      }
    };
    fetchAttempts();

    const socket = io(SOCKET_URL);
    socket.on('duplicate_claim_alert', (newAlert) => {
      setAttempts(prev => [newAlert, ...prev]);
    });

    return () => socket.disconnect();
  }, [token]);
  const [searchQuery, setSearchQuery] = useState('');
  const [currentPage, setCurrentPage] = useState(1);

  // Reset to page 1 when filter or search changes
  useEffect(() => {
    setCurrentPage(1);
  }, [filter, searchQuery]);

  const filtered = attempts.filter(a => {
    const matchesSev = filter === 'ALL' || a.severity === filter;
    const q = searchQuery.toLowerCase().trim();
    const matchesQuery = !q ||
      a.name.toLowerCase().includes(q) ||
      a.barangay.toLowerCase().includes(q) ||
      a.qr.toLowerCase().includes(q) ||
      a.reason.toLowerCase().includes(q);

    return matchesSev && matchesQuery;
  });

  const counts = {
    High: attempts.filter(a => a.severity === 'High').length,
    Medium: attempts.filter(a => a.severity === 'Medium').length,
    Low: attempts.filter(a => a.severity === 'Low').length,
  };

  // Pagination Math
  const totalPages = Math.ceil(filtered.length / ITEMS_PER_PAGE);
  const startIndex = (currentPage - 1) * ITEMS_PER_PAGE;
  const currentItems = filtered.slice(startIndex, startIndex + ITEMS_PER_PAGE);

  return (
    <div className="page-container page-animate">
      <div className="workflow-header" style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 28, flexWrap: 'wrap', gap: 16 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
          <div style={{ width: 48, height: 48, borderRadius: 'var(--radius-inner)', background: 'linear-gradient(135deg, #DC2626, #991B1B)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <Shield size={24} color="#fff" />
          </div>
          <div>
            <h1 className="section-header" style={{ margin: 0, fontSize: 22 }}>Real-Time Fraud Interception</h1>
            <p style={{ fontSize: 13, color: 'var(--ink-soft)', marginTop: 2 }}>Monitoring panel for blocked duplicate claim attempts across Manila.</p>
          </div>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, background: '#FEF2F2', border: '1px solid rgba(220,38,38,0.25)', padding: '6px 14px', borderRadius: 'var(--radius-pill)' }}>
          <Activity size={14} color="#DC2626" />
          <span style={{ fontSize: 12, fontWeight: 700, color: '#DC2626' }}>Live Stream - {attempts.length} intercepted today</span>
        </div>
      </div>

      <div className="grid-3 stagger-children" style={{ marginBottom: 24 }}>
        {Object.entries(counts).map(([sev, count]) => (
          <div key={sev} className="clay-card" style={{ borderTop: `3px solid ${SEV_CONFIG[sev].color}` }}>
            <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--ink-soft)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 4 }}>{sev} Severity</div>
            <div style={{ fontSize: 40, fontWeight: 900, color: SEV_CONFIG[sev].color, lineHeight: 1 }}>{count}</div>
            <div style={{ fontSize: 12, color: 'var(--ink-soft)', marginTop: 4 }}>attempts blocked</div>
          </div>
        ))}
      </div>

      {/* Filter Tabs + Name Search Input Bar */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16, flexWrap: 'wrap', gap: 12 }}>
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          {['ALL', 'High', 'Medium', 'Low'].map(f => (
            <button key={f} onClick={() => setFilter(f)} className={filter === f ? 'clay-button-danger' : 'clay-button-ghost'} style={{ fontSize: 12, padding: '6px 14px' }}>{f}</button>
          ))}
        </div>

        {/* Live Search Input */}
        <div style={{ position: 'relative', minWidth: 260 }}>
          <Search size={15} color="var(--ink-soft)" style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)' }} />
          <input
            type="text"
            aria-label="Search fraud records by name, barangay, or QR"
            placeholder="Search name, barangay, or QR..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            style={{
              width: '100%',
              padding: '8px 12px 8px 34px',
              borderRadius: 'var(--radius-pill)',
              border: '1px solid var(--border)',
              fontSize: 13,
              outline: 'none',
              background: 'var(--card)',
              color: 'var(--ink)',
              boxSizing: 'border-box',
            }}
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery('')}
              aria-label="Clear search input"
              style={{ position: 'absolute', right: 10, top: '50%', transform: 'translateY(-50%)', border: 'none', background: 'none', cursor: 'pointer', color: 'var(--ink-soft)', fontSize: 12, fontWeight: 700 }}
            >
              
            </button>
          )}
        </div>
      </div>

      {/* Fraud Interception Records List */}
      <div style={{ display: 'grid', gap: 12 }}>
        {currentItems.length === 0 && !loading && (
          <div className="clay-card workflow-empty-state" style={{ textAlign: 'center', padding: '64px 40px' }}>
            <div style={{ width: 72, height: 72, borderRadius: '50%', background: 'rgba(220,38,38,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 20px' }}>
              <Shield size={36} color="#DC2626" />
            </div>
            <h2 style={{ fontSize: '20px', fontWeight: 700, color: 'var(--ink)', margin: '0 0 6px' }}>No Fraud Attempts</h2>
            <p style={{ fontSize: '14px', color: 'var(--ink-soft)' }}>No blocked duplicate claim attempts found.</p>
          </div>
        )}
        {currentItems.map((a, idx) => {
          const cfg = SEV_CONFIG[a.severity] || SEV_CONFIG.Low;
          return (
            <MotionCard key={a.id || a._id || idx} delay={idx * 0.06} className="clay-card" style={{ borderLeft: `4px solid ${cfg.color}` }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 10 }}>
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
                    <XCircle size={16} color={cfg.color} />
                    <span style={{ fontSize: 15, fontWeight: 800, color: 'var(--ink)' }}>{a.name}</span>
                    <MotionBadge color={cfg.color} pulse={a.severity === 'High'}>
                      <span style={{ background: cfg.bg, color: cfg.color, fontSize: 11, fontWeight: 800, padding: '3px 8px', borderRadius: 999 }}>{a.severity} Risk</span>
                    </MotionBadge>
                  </div>
                  <div style={{ fontSize: 13, color: 'var(--ink-soft)', marginBottom: 4 }}>
                    <strong style={{ color: 'var(--ink)' }}>Barangay {a.barangay}</strong> &nbsp;·&nbsp; QR: <code style={{ fontSize: 11, background: 'var(--sampaguita)', padding: '2px 6px', borderRadius: 4, color: 'var(--manila-blue)' }}>{a.qr}</code>
                  </div>
                  <div style={{ fontSize: 13, color: '#DC2626', display: 'flex', alignItems: 'center', gap: 6 }}>
                    <AlertTriangle size={13} /> {a.reason}
                  </div>
                </div>
                <div style={{ fontSize: 11, color: 'var(--ink-soft)', whiteSpace: 'nowrap' }}>{a.timestamp}</div>
              </div>
            </MotionCard>
          );
        })}
      </div>

      {/* ── Pagination Bar: Page 1, Page 2, Page N ── */}
      {totalPages > 1 && (
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 24, padding: '12px 18px', background: 'var(--card)', borderRadius: 'var(--radius-inner)', border: '1px solid var(--border)', flexWrap: 'wrap', gap: 12 }}>
          <div style={{ fontSize: 13, color: 'var(--ink-soft)' }}>
            Showing <strong>{startIndex + 1}-{Math.min(startIndex + ITEMS_PER_PAGE, filtered.length)}</strong> of <strong>{filtered.length}</strong> intercepted attempts
          </div>

          <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
            <button
              onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
              disabled={currentPage === 1}
              className="clay-button-ghost"
              style={{ fontSize: 12, padding: '5px 12px', opacity: currentPage === 1 ? 0.5 : 1, gap: 4 }}
            >
              <ChevronLeft size={14} /> Previous
            </button>

            {Array.from({ length: totalPages }, (_, i) => i + 1).map(pageNum => (
              <button
                key={pageNum}
                onClick={() => setCurrentPage(pageNum)}
                className={currentPage === pageNum ? 'clay-button-primary' : 'clay-button-ghost'}
                style={{ fontSize: 12, width: 32, height: 32, padding: 0, justifyContent: 'center', fontWeight: currentPage === pageNum ? 800 : 600 }}
              >
                {pageNum}
              </button>
            ))}

            <button
              onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
              disabled={currentPage === totalPages}
              className="clay-button-ghost"
              style={{ fontSize: 12, padding: '5px 12px', opacity: currentPage === totalPages ? 0.5 : 1, gap: 4 }}
            >
              Next <ChevronRight size={14} />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

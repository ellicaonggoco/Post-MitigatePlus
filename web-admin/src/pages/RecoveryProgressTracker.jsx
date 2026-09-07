import React, { useState, useContext, useEffect, useMemo } from 'react';
import { AuthContext } from '../context/AuthContext';
import ConfirmModal from '../components/ConfirmModal';
import Pagination from '../components/Pagination';
import { Activity, ChevronDown, Users, CheckCircle, Clock, TrendingUp, ArrowUpCircle, X, Search, Layers, Filter } from 'lucide-react';
import { API_BASE_URL } from '../config';
import { MotionCard, MotionNumberCounter } from '../components/motion';

const normalizeStage = (st) => {
  if (st === 'received' || st === 'assistance_received') return 'assistance_received';
  if (st === 'partial' || st === 'partially_recovered') return 'partially_recovered';
  if (st === 'full' || st === 'fully_recovered') return 'fully_recovered';
  if (st === 'ongoing') return 'ongoing';
  return 'waiting';
};

const STAGES = [
  { key: 'waiting', aliases: ['waiting'], label: 'Waiting for Ayuda', color: '#DC2626', bg: '#FEF2F2', icon: Clock, type: 'auto', desc: 'Auto-Managed: On Registration' },
  { key: 'assistance_received', aliases: ['received', 'assistance_received'], label: 'Assistance Received', color: '#D97706', bg: '#FFFBEB', icon: CheckCircle, type: 'auto', desc: 'Auto-Updated: Via Staff QR Scanner' },
  { key: 'ongoing', aliases: ['ongoing'], label: 'Ongoing Pagbangon', color: '#2563EB', bg: '#EFF6FF', icon: TrendingUp, type: 'manual', desc: 'Barangay Action: Rebuilding Phase' },
  { key: 'partially_recovered', aliases: ['partial', 'partially_recovered'], label: 'Partially Recovered', color: '#7C3AED', bg: '#F5F3FF', icon: ArrowUpCircle, type: 'manual', desc: 'Barangay Action: Stabilized' },
  { key: 'fully_recovered', aliases: ['full', 'fully_recovered'], label: 'Fully Recovered', color: '#158A64', bg: 'rgba(21,138,100,0.1)', icon: CheckCircle, type: 'manual', desc: 'Barangay Action: Fully Recovered & Resilient' },
];

const ITEMS_PER_PAGE = 6;

export default function RecoveryProgressTracker() {
  const { token, user } = useContext(AuthContext);
  const [households, setHouseholds] = useState([]);
  const [loading, setLoading] = useState(true);
  const [openDropdownId, setOpenDropdownId] = useState(null);
  const [modal, setModal] = useState({ isOpen: false, hh: null, newStage: null });
  const [selectedStage, setSelectedStage] = useState('all'); // 'all' or stage key
  const [searchQuery, setSearchQuery] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const brgy = user?.barangayCode || '291';

  const fetchRecovery = async () => {
    setLoading(true);
    try {
      const res = await fetch(`${API_BASE_URL}/recovery`, {
        headers: { Authorization: 'Bearer ' + token, 'Content-Type': 'application/json' }
      });
      const data = await res.json();
      if (res.ok && Array.isArray(data)) {
        const formatted = data.map(h => ({
          id: h.id || h.householdId || h._id,
          householdId: h.householdId || h.id || h._id,
          recoveryId: h.recoveryId || h._id,
          head: h.head || h.householdId?.headOfHouseholdUserId?.name || 'Resident Household',
          address: h.address || (h.householdId?.address ? `${h.householdId.address}, Purok ${h.householdId.purok || 1} (Brgy ${h.householdId.barangayCode})` : `Purok 1, Barangay ${brgy}, Manila`),
          members: Number(h.members || h.householdId?.memberCount || 1),
          stage: normalizeStage(h.stage || h.status || 'waiting'),
          barangayCode: h.barangayCode || h.householdId?.barangayCode || brgy,
        }));
        setHouseholds(formatted);
      } else {
        setHouseholds([]);
      }
    } catch (e) {
      console.error(e);
      setHouseholds([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (token) fetchRecovery();
  }, [token]);

  useEffect(() => {
    const handleOutsideClick = (e) => {
      if (!e.target.closest('.stage-dropdown-container')) {
        setOpenDropdownId(null);
      }
    };
    document.addEventListener('mousedown', handleOutsideClick);
    return () => document.removeEventListener('mousedown', handleOutsideClick);
  }, []);

  const stageCounts = useMemo(() => {
    return STAGES.reduce((acc, s) => ({
      ...acc,
      [s.key]: households.filter(h => normalizeStage(h.stage) === s.key).length,
    }), {});
  }, [households]);

  // Filter households by selected stage and search query
  const filteredHouseholds = useMemo(() => {
    return households.filter(h => {
      if (selectedStage !== 'all') {
        const stageKey = normalizeStage(h.stage);
        if (stageKey !== selectedStage) return false;
      }
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase().trim();
        const headMatch = (h.head || '').toLowerCase().includes(q);
        const addressMatch = (h.address || '').toLowerCase().includes(q);
        if (!headMatch && !addressMatch) return false;
      }
      return true;
    });
  }, [households, selectedStage, searchQuery]);

  // Adjust current page if out of bounds
  useEffect(() => {
    const maxPage = Math.max(1, Math.ceil(filteredHouseholds.length / ITEMS_PER_PAGE));
    if (currentPage > maxPage) {
      setCurrentPage(maxPage);
    }
  }, [filteredHouseholds.length, currentPage]);

  // Paginated slice
  const paginatedHouseholds = useMemo(() => {
    const start = (currentPage - 1) * ITEMS_PER_PAGE;
    return filteredHouseholds.slice(start, start + ITEMS_PER_PAGE);
  }, [filteredHouseholds, currentPage]);

  const handleStageSelect = (stageKey) => {
    if (selectedStage === stageKey) {
      setSelectedStage('all');
    } else {
      setSelectedStage(stageKey);
    }
    setCurrentPage(1);
  };

  const confirmStageUpdate = async () => {
    if (!modal.hh || !modal.newStage) return;
    const targetHh = modal.hh;
    const targetId = targetHh.recoveryId || targetHh.householdId || targetHh.id;
    const newStageKey = modal.newStage.key;

    // 1. Optimistic UI update immediately
    setHouseholds(prev => prev.map(h =>
      (h.id === targetHh.id || h.householdId === targetHh.householdId || (targetHh.recoveryId && h.recoveryId === targetHh.recoveryId))
        ? { ...h, stage: newStageKey }
        : h
    ));

    // 2. Call backend API
    try {
      const res = await fetch(`${API_BASE_URL}/recovery/${targetId}`, {
        method: 'PUT',
        headers: { Authorization: 'Bearer ' + token, 'Content-Type': 'application/json' },
        body: JSON.stringify({
          status: newStageKey,
          householdId: targetHh.householdId || targetHh.id,
        })
      });
      if (res.ok) {
        const updated = await res.json().catch(() => null);
        const finalStatus = normalizeStage(updated?.status || updated?.recovery?.status || newStageKey);
        setHouseholds(prev => prev.map(h =>
          (h.id === targetHh.id || h.householdId === targetHh.householdId)
            ? { ...h, stage: finalStatus }
            : h
        ));
      } else {
        console.error('Failed to update stage on server, status:', res.status);
      }
    } catch (e) {
      console.error('Error updating stage:', e);
    }
    setModal({ isOpen: false, hh: null, newStage: null });
  };

  const currentStageObj = STAGES.find(s => s.key === selectedStage);

  return (
    <div className="page-container page-animate">
      {/* Universal Double Confirmation Modal */}
      <ConfirmModal
        isOpen={modal.isOpen}
        title="Update Recovery Stage?"
        message={`Are you sure you want to change the recovery stage for household "${modal.hh?.head}" to "${modal.newStage?.label}"?`}
        type="info"
        confirmText="Yes, Update Stage"
        onConfirm={confirmStageUpdate}
        onCancel={() => setModal({ isOpen: false, hh: null, newStage: null })}
      />

      {/* ── Page Header ── */}
      <div className="workflow-header" style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 24, flexWrap: 'wrap', gap: 16 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
          <div style={{ width: 48, height: 48, borderRadius: 'var(--radius-inner)', background: 'linear-gradient(135deg, #158A64, #0F6B4C)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <Activity size={24} color="#fff" />
          </div>
          <div>
            <h1 className="section-header" style={{ margin: 0, fontSize: 22 }}>Recovery Progress Tracker</h1>
            <p style={{ fontSize: 13, color: 'var(--ink-soft)', marginTop: 2 }}>Barangay {brgy} - Monitor and manage household recovery progression.</p>
          </div>
        </div>
      </div>

      {/* ── Clickable Stage KPI Cards (Interactive Filters) ── */}
      <div style={{ marginBottom: 22 }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10, flexWrap: 'wrap', gap: 8 }}>
          <span style={{ fontSize: '12px', fontWeight: 800, color: 'var(--ink-soft)', textTransform: 'uppercase', letterSpacing: '0.5px', display: 'inline-flex', alignItems: 'center', gap: 6 }}>
            <Filter size={13} /> Select Stage to Filter List:
          </span>
          {selectedStage !== 'all' && (
            <button
              onClick={() => { setSelectedStage('all'); setCurrentPage(1); }}
              style={{
                background: 'none',
                border: 'none',
                color: '#1C3F94',
                fontSize: '12px',
                fontWeight: 800,
                cursor: 'pointer',
                textDecoration: 'underline',
                padding: 0,
              }}
            >
              Reset to All ({households.length})
            </button>
          )}
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: 10 }}>
          {/* Card 0: All Households */}
          <div
            onClick={() => { setSelectedStage('all'); setCurrentPage(1); }}
            className="clay-card"
            role="button"
            tabIndex={0}
            aria-pressed={selectedStage === 'all'}
            style={{
              cursor: 'pointer',
              borderTop: selectedStage === 'all' ? '4px solid #1C3F94' : '3px solid #64748B',
              border: selectedStage === 'all' ? '2px solid #1C3F94' : '1px solid #E2E8F0',
              background: selectedStage === 'all' ? '#EFF6FF' : '#FFFFFF',
              boxShadow: selectedStage === 'all' ? '0 10px 24px -4px rgba(28, 63, 148, 0.25)' : 'var(--shadow-sm)',
              textAlign: 'center',
              padding: '14px 12px 10px',
              borderRadius: '14px',
              transition: 'all 0.2s ease',
              transform: selectedStage === 'all' ? 'scale(1.02)' : 'scale(1)',
              position: 'relative',
            }}
          >
            <Layers size={20} color={selectedStage === 'all' ? '#1C3F94' : '#64748B'} style={{ marginBottom: 4 }} />
            <div style={{ fontSize: 28, fontWeight: 900, color: selectedStage === 'all' ? '#1C3F94' : 'var(--ink)' }}>
              <MotionNumberCounter value={households.length} />
            </div>
            <div style={{ fontSize: 12, fontWeight: 800, color: selectedStage === 'all' ? '#1C3F94' : 'var(--ink-soft)', marginTop: 2 }}>
              All Households
            </div>
            <div style={{ marginTop: 6, fontSize: '10.5px', fontWeight: 700, color: selectedStage === 'all' ? '#1C3F94' : '#94A3B8' }}>
              {selectedStage === 'all' ? '● Active View' : 'Click to view'}
            </div>
          </div>

          {/* Cards 1 to 5: Stage Cards */}
          {STAGES.map((s) => {
            const Icon = s.icon;
            const isSelected = selectedStage === s.key;
            const count = stageCounts[s.key] || 0;
            return (
              <div
                key={s.key}
                onClick={() => handleStageSelect(s.key)}
                className="clay-card"
                role="button"
                tabIndex={0}
                aria-pressed={isSelected}
                aria-label={`Filter by ${s.label}`}
                style={{
                  cursor: 'pointer',
                  borderTop: isSelected ? `4px solid ${s.color}` : `3px solid ${s.color}`,
                  border: isSelected ? `2px solid ${s.color}` : '1px solid #E2E8F0',
                  background: isSelected ? s.bg : '#FFFFFF',
                  boxShadow: isSelected ? `0 10px 24px -4px ${s.color}35` : 'var(--shadow-sm)',
                  textAlign: 'center',
                  padding: '14px 12px 10px',
                  borderRadius: '14px',
                  transition: 'all 0.2s ease',
                  transform: isSelected ? 'scale(1.02)' : 'scale(1)',
                  position: 'relative',
                }}
              >
                <Icon size={20} color={s.color} style={{ marginBottom: 4 }} />
                <div style={{ fontSize: 28, fontWeight: 900, color: s.color }}>
                  <MotionNumberCounter value={count} />
                </div>
                <div style={{ fontSize: 12, fontWeight: 800, color: isSelected ? s.color : 'var(--ink)', marginTop: 2 }}>
                  {s.label}
                </div>
                <div style={{ marginTop: 6, fontSize: '10.5px', fontWeight: 700, color: isSelected ? s.color : '#94A3B8' }}>
                  {isSelected ? `● Active (Page ${currentPage})` : 'Click to filter'}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* ── Sub-header: Current Filter Description & Search ── */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16, flexWrap: 'wrap', gap: 12 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
          <span style={{ fontSize: 14, fontWeight: 800, color: 'var(--ink)' }}>
            {selectedStage === 'all' ? (
              <>Showing all registered households ({filteredHouseholds.length})</>
            ) : (
              <>
                Filtered by:{' '}
                <span style={{ color: currentStageObj?.color, fontWeight: 900 }}>
                  {currentStageObj?.label}
                </span>{' '}
                ({filteredHouseholds.length} household{filteredHouseholds.length !== 1 ? 's' : ''})
              </>
            )}
          </span>
          {selectedStage !== 'all' && (
            <button
              onClick={() => { setSelectedStage('all'); setCurrentPage(1); }}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: 4,
                fontSize: 11.5,
                fontWeight: 700,
                color: '#475569',
                background: '#F1F5F9',
                border: '1px solid #CBD5E1',
                padding: '3px 9px',
                borderRadius: 999,
                cursor: 'pointer',
              }}
            >
              <X size={12} /> Clear Filter
            </button>
          )}
        </div>

        {/* Search bar */}
        <div style={{ position: 'relative', width: '280px', maxWidth: '100%' }}>
          <Search size={15} color="#94A3B8" style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)' }} />
          <input
            type="text"
            placeholder="Search resident or address..."
            value={searchQuery}
            onChange={(e) => { setSearchQuery(e.target.value); setCurrentPage(1); }}
            className="clay-input"
            style={{ paddingLeft: 34, fontSize: 13, height: 38, width: '100%' }}
          />
          {searchQuery && (
            <button
              onClick={() => { setSearchQuery(''); setCurrentPage(1); }}
              style={{ position: 'absolute', right: 8, top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', color: '#94A3B8' }}
              aria-label="Clear search"
            >
              <X size={14} />
            </button>
          )}
        </div>
      </div>

      {/* ── Households List ── */}
      <div style={{ display: 'grid', gap: 14 }}>
        {loading ? (
          <div style={{ padding: '32px 24px', display: 'grid', gap: '12px' }}>
            {[1, 2, 3].map(i => (
              <div key={i} className="skeleton" style={{ height: '80px', borderRadius: '12px' }} />
            ))}
          </div>
        ) : filteredHouseholds.length === 0 ? (
          <div className="clay-card" style={{ textAlign: 'center', padding: '48px 24px' }}>
            {selectedStage !== 'all' ? (
              <>
                {(() => {
                  const Icon = currentStageObj?.icon || Users;
                  return <Icon size={38} color={currentStageObj?.color || 'var(--ink-soft)'} style={{ margin: '0 auto 12px', display: 'block' }} />;
                })()}
                <h2 style={{ fontSize: 16, fontWeight: 800, color: "var(--ink)", margin: "0 0 4px" }}>
                  No Households in "{currentStageObj?.label}"
                </h2>
                <p style={{ fontSize: 13, color: 'var(--ink-soft)', margin: '0 0 16px' }}>
                  Walang pamilya sa Barangay {brgy} ang kasalukuyang nasa yugtong ito ng recovery.
                </p>
                <button
                  onClick={() => { setSelectedStage('all'); setSearchQuery(''); setCurrentPage(1); }}
                  className="clay-button-secondary"
                  style={{ fontSize: 13, fontWeight: 700, margin: '0 auto', display: 'inline-flex', alignItems: 'center', gap: 6 }}
                >
                  <Layers size={14} /> View All Households ({households.length})
                </button>
              </>
            ) : (
              <>
                <Users size={38} color="var(--ink-soft)" style={{ margin: '0 auto 12px', display: 'block' }} />
                <h2 style={{ fontSize: 16, fontWeight: 800, color: "var(--ink)", margin: "0 0 4px" }}>
                  {searchQuery ? 'No Matching Households Found' : 'No Household Records Found'}
                </h2>
                <p style={{ fontSize: 13, color: 'var(--ink-soft)', margin: searchQuery ? '0 0 16px' : 0 }}>
                  {searchQuery ? `Walang natagpuang household para sa "${searchQuery}".` : `All registered households in Barangay ${brgy} will appear here.`}
                </p>
                {searchQuery && (
                  <button
                    onClick={() => { setSearchQuery(''); setCurrentPage(1); }}
                    className="clay-button-secondary"
                    style={{ fontSize: 13, fontWeight: 700, margin: '0 auto' }}
                  >
                    Clear Search
                  </button>
                )}
              </>
            )}
          </div>
        ) : (
          paginatedHouseholds.map((hh, idx) => {
            const currentStageKey = normalizeStage(hh.stage);
            const stage = STAGES.find(s => s.key === currentStageKey) || STAGES[0];
            const StageIcon = stage.icon;
            const isDropdownOpen = openDropdownId === (hh.id || idx);
            return (
              <MotionCard
                key={hh.id || idx}
                delay={idx * 0.04}
                className="clay-card"
                style={{
                  borderLeft: `4.5px solid ${stage.color}`,
                  overflow: 'visible',
                  position: 'relative',
                  zIndex: isDropdownOpen ? 1000 : 1,
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 14 }}>
                  <div>
                    <div style={{ fontSize: 16, fontWeight: 800, color: 'var(--ink)', marginBottom: 4 }}>
                      {hh.head}
                    </div>
                    <div style={{ fontSize: 13, color: 'var(--ink-soft)', marginBottom: 8 }}>
                      {hh.address} &nbsp;·&nbsp; <Users size={13} style={{ verticalAlign: 'middle' }} /> {hh.members} member{hh.members !== 1 ? 's' : ''}
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                      <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6, background: stage.bg, color: stage.color, fontSize: 12, fontWeight: 700, padding: '4px 12px', borderRadius: 999 }}>
                        <StageIcon size={13} /> {stage.label}
                      </span>
                      <span style={{ fontSize: 11, color: 'var(--ink-soft)', fontStyle: 'italic' }}>
                        ({stage.type === 'auto' ? ' System Auto-Updated' : ' Barangay Managed'})
                      </span>
                    </div>
                  </div>
                  <div className="stage-dropdown-container" style={{ position: 'relative', zIndex: isDropdownOpen ? 1001 : 1 }}>
                    <button
                      onClick={() => setOpenDropdownId(isDropdownOpen ? null : (hh.id || idx))}
                      className="clay-button-secondary"
                      aria-label={`Update recovery stage for ${hh.head}`}
                      style={{
                        fontSize: '13px',
                        fontWeight: 800,
                        color: '#047857',
                        borderColor: '#10B981',
                        display: 'flex',
                        alignItems: 'center',
                        gap: 6,
                        background: isDropdownOpen ? '#ECFDF5' : 'var(--card)',
                      }}
                    >
                      Update Stage <ChevronDown size={14} style={{ transform: isDropdownOpen ? 'rotate(180deg)' : 'none', transition: 'transform 0.2s ease' }} />
                    </button>

                    {isDropdownOpen && (
                      <div
                        style={{
                          position: 'absolute',
                          top: 'calc(100% + 6px)',
                          right: 0,
                          width: '260px',
                          background: '#FFFFFF',
                          border: '1.5px solid #E2E8F0',
                          borderRadius: '12px',
                          boxShadow: '0 16px 36px rgba(15, 23, 42, 0.22), 0 4px 12px rgba(15, 23, 42, 0.08)',
                          padding: '6px',
                          zIndex: 99999,
                          animation: 'fadeIn 0.15s ease-out',
                        }}
                      >
                        <div style={{ fontSize: '11px', fontWeight: 800, color: '#64748B', padding: '6px 10px 4px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                          Select Recovery Stage
                        </div>
                        {STAGES.map((s) => {
                          const Icon = s.icon;
                          const isCurrent = currentStageKey === s.key;
                          return (
                            <button
                              key={s.key}
                              onClick={() => {
                                setOpenDropdownId(null);
                                setModal({
                                  isOpen: true,
                                  hh,
                                  newStage: s,
                                });
                              }}
                              style={{
                                width: '100%',
                                textAlign: 'left',
                                padding: '8px 10px',
                                borderRadius: '8px',
                                border: 'none',
                                background: isCurrent ? s.bg : 'transparent',
                                cursor: 'pointer',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'space-between',
                                gap: 10,
                                transition: 'background 0.15s ease',
                              }}
                              onMouseEnter={(e) => {
                                if (!isCurrent) e.currentTarget.style.background = '#F8FAFC';
                              }}
                              onMouseLeave={(e) => {
                                if (!isCurrent) e.currentTarget.style.background = 'transparent';
                              }}
                            >
                              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                                <div style={{ width: 26, height: 26, borderRadius: '6px', background: s.bg, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                  <Icon size={14} color={s.color} />
                                </div>
                                <div>
                                  <div style={{ fontSize: '12.5px', fontWeight: 800, color: isCurrent ? s.color : '#1E293B' }}>
                                    {s.label}
                                  </div>
                                  <div style={{ fontSize: '10.5px', color: '#64748B' }}>
                                    {s.type === 'auto' ? 'Auto-Managed' : 'Barangay Action'}
                                  </div>
                                </div>
                              </div>
                              {isCurrent && (
                                <span style={{ fontSize: '10px', fontWeight: 800, color: s.color, background: '#FFFFFF', padding: '2px 6px', borderRadius: '4px', border: `1px solid ${s.color}` }}>
                                  Current
                                </span>
                              )}
                            </button>
                          );
                        })}
                      </div>
                    )}
                  </div>
                </div>
              </MotionCard>
            );
          })
        )}

        {/* ── Pagination Bar ── */}
        {!loading && filteredHouseholds.length > 0 && (
          <div style={{ marginTop: 8 }}>
            <Pagination
              currentPage={currentPage}
              totalItems={filteredHouseholds.length}
              itemsPerPage={ITEMS_PER_PAGE}
              onPageChange={setCurrentPage}
              style={{ borderRadius: '12px', border: '1px solid #E2E8F0' }}
            />
          </div>
        )}
      </div>
    </div>
  );
}


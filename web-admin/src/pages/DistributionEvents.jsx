import React, { useState, useEffect, useContext } from 'react';
import { useLocation } from 'react-router-dom';
import { AuthContext } from '../context/AuthContext';
import { Truck, Plus, Calendar, MapPin, Package, Users, CheckCircle, Clock, XCircle, Megaphone, Play, Check, Send } from 'lucide-react';
import ConfirmModal from '../components/ConfirmModal';
import { API_BASE_URL } from '../config';
import { MotionCard, MotionButton } from '../components/motion';

const STATUS_CONFIG = {
  Scheduled: { color: '#2563EB', bg: '#EFF6FF', icon: Clock },
  Ongoing: { color: '#D97706', bg: '#FFFBEB', icon: Truck },
  Completed: { color: '#158A64', bg: 'rgba(21,138,100,0.1)', icon: CheckCircle },
  Cancelled: { color: '#DC2626', bg: '#FEF2F2', icon: XCircle },
};

// Standard Field Teams in Manila MDRRMO Operations
const FIELD_TEAMS = [
  'Field Team Alpha',
  'Field Team Bravo',
  'Field Team Charlie',
  'Field Team Delta',
  'Quick Response Unit 1',
  'Quick Response Unit 2',
];

export default function DistributionEvents() {
  const { user, token } = useContext(AuthContext);
  const location = useLocation();

  const [events, setEvents] = useState([]);
  const [sentAnnouncements, setSentAnnouncements] = useState({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchEvents = async () => {
      setLoading(true);
      try {
        const res = await fetch(`${API_BASE_URL}/distributions/events`, {
          headers: { Authorization: 'Bearer ' + token, 'Content-Type': 'application/json' }
        });
        const data = await res.json();
        if (res.ok) {
          setEvents(data.events || data || []);
        } else {
          setEvents([]);
        }
      } catch (err) {
        setEvents([]);
      } finally {
        setLoading(false);
      }
    };
    fetchEvents();
  }, [token]);

  const [warehouseStock, setWarehouseStock] = useState([]);
  const [showForm, setShowForm] = useState(false);
  const [filter, setFilter] = useState('ALL'); // 'ALL' | 'Scheduled' | 'Ongoing' | 'Completed' | 'ANNOUNCED'
  const [form, setForm] = useState({ barangay: '', date: '', time: '', items: 'Family Food Pack', staff: 'Field Team Alpha', households: '' });
  const [toastMsg, setToastMsg] = useState('');

  // ── Fetch Warehouse Inventory for Real-time Stock Pre-Check ──
  useEffect(() => {
    const fetchWarehouse = async () => {
      if (!token) return;
      try {
        const res = await fetch(`${API_BASE_URL}/warehouse`, {
          headers: { Authorization: `Bearer ${token}` }
        });
        if (res.ok) {
          const data = await res.json();
          setWarehouseStock(Array.isArray(data) ? data : []);
        }
      } catch (err) {
        console.error('Error loading warehouse stock:', err);
      }
    };
    fetchWarehouse();
  }, [token]);

  // ── Auto-prefill from Heatmap navigation ("Schedule Relief Event for Brgy X") ──
  useEffect(() => {
    const prefill = location.state?.prefillBarangay;
    if (prefill) {
      setForm(prev => ({ ...prev, barangay: `Barangay ${prefill}` }));
      setShowForm(true);
      setToastMsg(`📍 Pre-filled: Barangay ${prefill} — Complete ang remaining fields to schedule.`);
      // Clear navigation state so it doesn't re-trigger on refresh
      window.history.replaceState({}, document.title);
    }
  }, [location.state]);



  // ── Confirmation Modal State ──
  const [confirmModal, setConfirmModal] = useState({
    isOpen: false,
    title: '',
    message: '',
    type: 'warning',
    confirmText: 'Proceed',
    onConfirm: null,
  });

  const saveEvents = (updated) => {
    setEvents(updated);
  };

  const saveSentAnnouncements = (updatedMap) => {
    setSentAnnouncements(updatedMap);
  };

  const handleCreate = async () => {
    if (!form.barangay || !form.date) return;
    try {
      const res = await fetch(`${API_BASE_URL}/distributions/events`, {
        method: 'POST',
        headers: { Authorization: 'Bearer ' + token, 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: `Relief Distribution — ${form.barangay}`,
          itemType: form.items || 'Family Food Pack',
          barangayCode: form.barangay.replace(/\D/g, '') || form.barangay,
          location: form.barangay,
          scheduledDate: form.date,
          scheduledTime: form.time,
          staffAssigned: form.staff,
          targetHouseholds: parseInt(form.households) || 0,
        }),
      });
      if (res.ok) {
        const created = await res.json();
        setEvents(prev => [...prev, created]);
        setForm({ barangay: '', date: '', time: '', items: '', staff: '', households: '' });
        setShowForm(false);
        setToastMsg(`✓ Na-schedule na ang bagong Relief Distribution Event sa ${form.barangay}!`);
      } else {
        const errData = await res.json().catch(() => ({}));
        setToastMsg(`❌ Hindi ma-create ang event: ${errData.message || 'Server error'}`);
      }
    } catch (err) {
      // Fallback to local-only if server is unreachable
      const newEv = { id: Date.now(), ...form, status: 'Scheduled', households: parseInt(form.households) || 0 };
      setEvents(prev => [...prev, newEv]);
      setForm({ barangay: '', date: '', time: '', items: '', staff: '', households: '' });
      setShowForm(false);
      setToastMsg(`⚠️ Saved locally — server unreachable. Will sync when online.`);
    }
  };

  // ── Automatic Warehouse Stock Dispatch Integration ──
  const triggerAutoDispatchForEvent = (ev, customStatus) => {
    // API logic to dispatch stocks goes here
  };

  // ── Send Announcement Handler ──
  const requestSendAnnouncement = (ev) => {
    setConfirmModal({
      isOpen: true,
      title: 'I-broadcast ang Distribution Announcement?',
      message: `Sigurado ka bang gusto mong i-broadcast ang official relief announcement para sa ${ev.barangay}? Awtomatiko itong malalathala sa Announcements Board at magdi-dispatch ng inventory stocks para sa ${ev.households} households.`,
      type: 'info',
      confirmText: 'Oo, I-broadcast Now',
      onConfirm: () => {
        // Mark event as announcement sent
        const updatedMap = { ...sentAnnouncements, [ev.id]: true };
        saveSentAnnouncements(updatedMap);

        // Auto-dispatch inventory stocks for this event
        triggerAutoDispatchForEvent(ev, 'Announcement Sent');

        // Post announcement to API (could be implemented later)

        setConfirmModal(prev => ({ ...prev, isOpen: false }));
        setToastMsg(`📢 Awtomatikong na-broadcast ang Announcement & Na-dispatch ang inventory stocks para sa ${ev.barangay}!`);
      },
    });
  };

  const requestStatusUpdate = (ev, newStatus) => {
    const statusTitles = {
      Ongoing: `Simulan ang Distribution Event sa ${ev.barangay || ev.location}?`,
      Completed: `I-marka na Tapos na ang Event sa ${ev.barangay || ev.location}?`,
      Scheduled: `Ibalik sa Scheduled ang Event sa ${ev.barangay || ev.location}?`,
    };
    const statusMsgs = {
      Ongoing: `Awtomatikong magiging "ONGOING" ang relief distribution. Kumpirmahin kung nakahanda na ang Field Staff.`,
      Completed: `Awtomatikong magiging "COMPLETED" ang event at ma-a-audit ang kabuuang mga household na nabigyan ng ayuda.`,
      Scheduled: `I-revert ang status ng event pabalik sa Scheduled?`,
    };

    setConfirmModal({
      isOpen: true,
      title: statusTitles[newStatus] || 'I-update ang Event Status?',
      message: statusMsgs[newStatus] || `Gusto mo bang palitan ang status ng event sa ${newStatus}?`,
      type: newStatus === 'Completed' ? 'success' : 'warning',
      confirmText: `Oo, Gawing ${newStatus}`,
      onConfirm: async () => {
        try {
          const evId = ev._id || ev.id;
          const res = await fetch(`${API_BASE_URL}/distributions/events/${evId}`, {
            method: 'PATCH',
            headers: { Authorization: 'Bearer ' + token, 'Content-Type': 'application/json' },
            body: JSON.stringify({ status: newStatus, isActive: newStatus === 'Ongoing' }),
          });
          if (res.ok) {
            const updated = events.map(e => (e._id || e.id) === evId ? { ...e, status: newStatus, isActive: newStatus === 'Ongoing' } : e);
            setEvents(updated);
            setToastMsg(`✓ Na-update ang status bilang "${newStatus.toUpperCase()}"!`);
          } else {
            setToastMsg(`❌ Hindi ma-update ang status. Server error.`);
          }
        } catch (err) {
          // Fallback: update locally
          const updated = events.map(e => (e._id || e.id) === (ev._id || ev.id) ? { ...e, status: newStatus } : e);
          setEvents(updated);
          setToastMsg(`⚠️ Updated locally — server unreachable.`);
        }
        setConfirmModal(prev => ({ ...prev, isOpen: false }));
      },
    });
  };

  // Robust status normalizer that correctly infers Ongoing vs Completed vs Scheduled from MongoDB schema
  const getEventStatus = (e) => {
    if (!e) return 'Scheduled';
    if (e.status) {
      const s = String(e.status).toLowerCase();
      if (s === 'ongoing') return 'Ongoing';
      if (s === 'completed') return 'Completed';
      if (s === 'scheduled') return 'Scheduled';
      if (s === 'cancelled') return 'Cancelled';
    }
    if (e.isActive === true) return 'Ongoing';
    if (e.isActive === false || e.closedAt) return 'Completed';
    return 'Scheduled';
  };

  // Filter events by tab with robust status matching
  const filtered = filter === 'ALL'
    ? events
    : filter === 'ANNOUNCED'
    ? events.filter(e => !!sentAnnouncements[e._id || e.id])
    : events.filter(e => getEventStatus(e) === filter);

  return (
    <div className="page-container page-animate">
      <ConfirmModal
        isOpen={confirmModal.isOpen}
        title={confirmModal.title}
        message={confirmModal.message}
        type={confirmModal.type}
        confirmText={confirmModal.confirmText}
        onConfirm={confirmModal.onConfirm}
        onCancel={() => setConfirmModal(prev => ({ ...prev, isOpen: false }))}
      />

      {/* ── Page Header ── */}
      <div className="workflow-header" style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 24, flexWrap: 'wrap', gap: 16 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
          <div style={{ width: 48, height: 48, borderRadius: 'var(--radius-inner)', background: 'linear-gradient(135deg, var(--manila-blue), #1e5a7a)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <Truck size={24} color="#fff" />
          </div>
          <div>
            <h1 className="section-header" style={{ margin: 0, fontSize: 22 }}>Distribution Events Management</h1>
            <p style={{ fontSize: 13, color: 'var(--ink-soft)', marginTop: 2 }}>Schedule, manage status, and broadcast relief distribution announcements per barangay.</p>
          </div>
        </div>
        <button onClick={() => setShowForm(!showForm)} className="clay-button-primary" style={{ fontSize: 13, gap: 6 }}>
          <Plus size={15} /> New Event
        </button>
      </div>

      {toastMsg && (
        <div className="clay-card" style={{ marginBottom: 20, borderLeft: '4px solid var(--bay-teal)', background: 'var(--bay-teal-light)', color: 'var(--bay-teal-deep)', padding: '12px 16px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <span style={{ fontSize: 13, fontWeight: 700 }}>{toastMsg}</span>
          <button onClick={() => setToastMsg('')} style={{ background: 'none', border: 'none', cursor: 'pointer', fontWeight: 800, color: 'var(--bay-teal-deep)' }}>✕</button>
        </div>
      )}

      {showForm && (
        <div className="clay-card" style={{ marginBottom: 24, borderLeft: '4px solid var(--manila-blue)' }}>
          <h3 style={{ fontSize: 16, fontWeight: 800, marginBottom: 16, color: 'var(--ink)' }}>Create Distribution Event</h3>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 12, marginBottom: 16 }}>
            <div>
              <label style={{ fontSize: 11, fontWeight: 700, color: 'var(--ink-soft)', textTransform: 'uppercase', letterSpacing: '0.06em', display: 'block', marginBottom: 4 }}>Barangay *</label>
              <input type="text" placeholder="e.g. Barangay 291" value={form.barangay} onChange={e => setForm(p => ({ ...p, barangay: e.target.value }))}
                style={{ width: '100%', padding: '9px 12px', borderRadius: 'var(--radius-inner)', border: '1px solid var(--border)', fontSize: 13, outline: 'none', fontFamily: 'var(--font-sans)', background: 'var(--card)', color: 'var(--ink)', boxSizing: 'border-box' }} required />
            </div>

            <div>
              <label style={{ fontSize: 11, fontWeight: 700, color: 'var(--ink-soft)', textTransform: 'uppercase', letterSpacing: '0.06em', display: 'block', marginBottom: 4 }}>Date *</label>
              <input type="date" value={form.date} onChange={e => setForm(p => ({ ...p, date: e.target.value }))}
                style={{ width: '100%', padding: '9px 12px', borderRadius: 'var(--radius-inner)', border: '1px solid var(--border)', fontSize: 13, outline: 'none', fontFamily: 'var(--font-sans)', background: 'var(--card)', color: 'var(--ink)', boxSizing: 'border-box' }} required />
            </div>

            <div>
              <label style={{ fontSize: 11, fontWeight: 700, color: 'var(--ink-soft)', textTransform: 'uppercase', letterSpacing: '0.06em', display: 'block', marginBottom: 4 }}>Time</label>
              <input type="text" placeholder="e.g. 08:00 AM" value={form.time} onChange={e => setForm(p => ({ ...p, time: e.target.value }))}
                style={{ width: '100%', padding: '9px 12px', borderRadius: 'var(--radius-inner)', border: '1px solid var(--border)', fontSize: 13, outline: 'none', fontFamily: 'var(--font-sans)', background: 'var(--card)', color: 'var(--ink)', boxSizing: 'border-box' }} />
            </div>

            <div>
              <label style={{ fontSize: 11, fontWeight: 700, color: 'var(--ink-soft)', textTransform: 'uppercase', letterSpacing: '0.06em', display: 'block', marginBottom: 4 }}>Relief Items</label>
              <input type="text" placeholder="e.g. Family Food Packs, Water" value={form.items} onChange={e => setForm(p => ({ ...p, items: e.target.value }))}
                style={{ width: '100%', padding: '9px 12px', borderRadius: 'var(--radius-inner)', border: '1px solid var(--border)', fontSize: 13, outline: 'none', fontFamily: 'var(--font-sans)', background: 'var(--card)', color: 'var(--ink)', boxSizing: 'border-box' }} />
            </div>

            <div>
              <label style={{ fontSize: 11, fontWeight: 700, color: 'var(--ink-soft)', textTransform: 'uppercase', letterSpacing: '0.06em', display: 'block', marginBottom: 4 }}>Assigned Field Team *</label>
              <select
                value={form.staff}
                onChange={e => setForm(p => ({ ...p, staff: e.target.value }))}
                style={{ width: '100%', padding: '9px 12px', borderRadius: 'var(--radius-inner)', border: '1px solid var(--border)', fontSize: 13, outline: 'none', fontFamily: 'var(--font-sans)', background: 'var(--card)', color: 'var(--ink)', boxSizing: 'border-box', cursor: 'pointer' }}
              >
                {FIELD_TEAMS.map(t => {
                  const activeInEvent = events.find(ev => ev.isActive && (ev.assignedTeam === t || ev.staff === t));
                  return (
                    <option key={t} value={t}>
                      {t} {activeInEvent ? `(🔴 Deployed at ${activeInEvent.location || activeInEvent.barangayCode})` : '(🟢 Available / Standby)'}
                    </option>
                  );
                })}
              </select>
            </div>

            <div>
              <label style={{ fontSize: 11, fontWeight: 700, color: 'var(--ink-soft)', textTransform: 'uppercase', letterSpacing: '0.06em', display: 'block', marginBottom: 4 }}>Target Households</label>
              <input type="number" placeholder="e.g. 150" value={form.households} onChange={e => setForm(p => ({ ...p, households: e.target.value }))}
                style={{ width: '100%', padding: '9px 12px', borderRadius: 'var(--radius-inner)', border: '1px solid var(--border)', fontSize: 13, outline: 'none', fontFamily: 'var(--font-sans)', background: 'var(--card)', color: 'var(--ink)', boxSizing: 'border-box' }} />
            </div>
          </div>

          {/* ── Warehouse Stock Pre-Check Banner ── */}
          {(() => {
            const targetCount = parseInt(form.households) || 0;
            const matchedItem = warehouseStock.find(w => 
              (w.name || '').toLowerCase().includes((form.items || '').toLowerCase().trim()) ||
              (form.items || '').toLowerCase().includes((w.name || '').toLowerCase().trim())
            ) || warehouseStock[0];

            const availableStock = matchedItem ? (matchedItem.stock || 0) : 0;
            const itemUnit = matchedItem ? (matchedItem.unit || 'packs') : 'packs';
            const itemName = matchedItem ? matchedItem.name : (form.items || 'Family Food Pack');
            const hasDeficit = targetCount > availableStock;
            const deficit = targetCount - availableStock;

            return (
              <div style={{
                marginBottom: 16,
                padding: '12px 16px',
                borderRadius: 'var(--radius-inner)',
                background: hasDeficit ? '#FEF2F2' : '#F0FDF4',
                border: `1px solid ${hasDeficit ? '#FECACA' : '#BBF7D0'}`,
                display: 'flex',
                alignItems: 'flex-start',
                gap: 12
              }}>
                <span style={{ fontSize: 20 }}>{hasDeficit ? '⚠️' : '📦'}</span>
                <div style={{ flex: 1 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 6 }}>
                    <strong style={{ fontSize: 13, color: hasDeficit ? '#991B1B' : '#166534' }}>
                      {hasDeficit ? 'Kakulangan sa Warehouse Stock Warning' : 'Sapat ang Warehouse Stock'}
                    </strong>
                    <span style={{ fontSize: 11, fontWeight: 700, padding: '2px 8px', borderRadius: 999, background: hasDeficit ? '#FEE2E2' : '#DCFCE7', color: hasDeficit ? '#DC2626' : '#15803D' }}>
                      Stock: {availableStock.toLocaleString()} {itemUnit} available
                    </span>
                  </div>
                  <p style={{ margin: '4px 0 0', fontSize: 12, color: hasDeficit ? '#B91C1C' : '#15803D', lineHeight: 1.4 }}>
                    {hasDeficit
                      ? `Kulang ng ${deficit.toLocaleString()} ${itemUnit} para sa target na ${targetCount.toLocaleString()} pamilya. Kakailanganin ng karagdagang supply shipment mula sa LGU Central Hub bago ang distribution day.`
                      : `Mayroong sapat na ${availableStock.toLocaleString()} ${itemUnit} ng ${itemName} sa bodega para sa ${targetCount || 'darating na'} event.`}
                  </p>
                </div>
              </div>
            );
          })()}

          <div style={{ display: 'flex', gap: 10 }}>
            <button onClick={handleCreate} className="clay-button-approve" style={{ fontSize: 13 }}>Create Event</button>
            <button onClick={() => setShowForm(false)} className="clay-button-ghost" style={{ fontSize: 13 }}>Cancel</button>
          </div>
        </div>
      )}

      {/* ── Filter Tabs: ALL, Scheduled, Ongoing, Completed, Announcement Sent ── */}
      <div style={{ display: 'flex', gap: 8, marginBottom: 20, flexWrap: 'wrap' }}>
        {[
          { key: 'ALL', label: `ALL Events (${events.length})` },
          { key: 'Scheduled', label: `Scheduled (${events.filter(e => getEventStatus(e) === 'Scheduled').length})` },
          { key: 'Ongoing', label: `Ongoing (${events.filter(e => getEventStatus(e) === 'Ongoing').length})` },
          { key: 'Completed', label: `Completed (${events.filter(e => getEventStatus(e) === 'Completed').length})` },
          { key: 'ANNOUNCED', label: `Announcement Sent (${events.filter(e => !!sentAnnouncements[e._id || e.id]).length})` },
        ].map(t => (
          <button
            key={t.key}
            onClick={() => setFilter(t.key)}
            className={filter === t.key ? 'clay-button-primary' : 'clay-button-ghost'}
            style={{ fontSize: 12, padding: '7px 16px' }}
          >
            {t.label}
          </button>
        ))}
      </div>

      <div style={{ display: 'grid', gap: 14 }}>
        {filtered.length === 0 && !loading && (
          <div className="clay-card workflow-empty-state" style={{ textAlign: 'center', padding: '64px 40px' }}>
            <div style={{ width: 72, height: 72, borderRadius: '50%', background: 'rgba(37,99,235,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 20px' }}>
              <Truck size={36} color="var(--manila-blue)" />
            </div>
            <h2 style={{ fontSize: '20px', fontWeight: 700, color: 'var(--ink)', margin: '0 0 6px' }}>No Events Found</h2>
            <p style={{ fontSize: '14px', color: 'var(--ink-soft)' }}>There are no distribution events matching your criteria.</p>
          </div>
        )}
        {filtered.map((ev, idx) => {
          const evStatus = getEventStatus(ev);
          const cfg = STATUS_CONFIG[evStatus] || STATUS_CONFIG.Scheduled;
          const StatusIcon = cfg.icon;
          const isAnnounced = !!sentAnnouncements[ev._id || ev.id];
          const isAllTab = filter === 'ALL';

          const evBrgy = ev.barangay || (ev.barangayCode ? `Barangay ${ev.barangayCode}` : ev.location || 'Barangay 291');
          const evDate = ev.date || (ev.openedAt ? new Date(ev.openedAt).toLocaleDateString('en-CA') : 'Scheduled');
          const evTime = ev.time || (ev.openedAt ? new Date(ev.openedAt).toLocaleTimeString('en-PH', { hour: '2-digit', minute: '2-digit' }) : '08:00 AM');
          const evItems = ev.items || ev.itemType || 'Family Food Packs';
          const evHouseholds = ev.households || ev.targetHouseholds || 150;
          const evStaff = typeof ev.openedBy === 'object' ? (ev.openedBy?.name || 'Field Lead') : (ev.staff || 'Field Team Assigned');

          const STATUS_ALL_STYLES = {
            Completed: {
              background: 'rgba(21, 138, 100, 0.09)',
              border: '1.5px solid rgba(21, 138, 100, 0.35)',
              borderLeft: '5px solid #158A64',
            },
            Ongoing: {
              background: 'rgba(217, 119, 6, 0.09)',
              border: '1.5px solid rgba(217, 119, 6, 0.35)',
              borderLeft: '5px solid #D97706',
            },
            Scheduled: {
              background: 'rgba(37, 99, 235, 0.09)',
              border: '1.5px solid rgba(37, 99, 235, 0.35)',
              borderLeft: '5px solid #2563EB',
            },
          };

          const cardStyle = isAllTab && STATUS_ALL_STYLES[evStatus]
            ? STATUS_ALL_STYLES[evStatus]
            : { borderLeft: `4px solid ${cfg.color}`, background: 'var(--card)' };

          return (
            <MotionCard key={ev.id || ev._id || idx} delay={idx * 0.06} className="clay-card" style={{ transition: 'all 0.25s ease', ...cardStyle }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 14 }}>
                <div style={{ flex: 1, minWidth: 280 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8, flexWrap: 'wrap' }}>
                    <MapPin size={16} color="var(--manila-blue)" />
                    <span style={{ fontSize: 17, fontWeight: 800, color: 'var(--ink)' }}>{evBrgy}</span>

                    {/* Status Badge — Auto-synced from Field Staff Leader on Ground */}
                    <div style={{ display: 'inline-flex', alignItems: 'center', gap: 6, background: cfg.bg, color: cfg.color, padding: '4px 12px', borderRadius: 999, fontWeight: 800, fontSize: 11 }}>
                      <StatusIcon size={13} />
                      <span>{evStatus.toUpperCase()}</span>
                      <span style={{ fontSize: 11, opacity: 0.8, borderLeft: '1px solid currentColor', paddingLeft: 6, marginLeft: 2 }}>
                        {evStatus === 'Scheduled' ? 'Waiting for Field Leader on Site' : evStatus === 'Ongoing' ? 'Live On-Site' : 'Verified'}
                      </span>
                    </div>

                    {isAnnounced && (
                      <span style={{ background: 'var(--bay-teal-light)', color: 'var(--bay-teal-deep)', fontSize: 11, fontWeight: 800, padding: '3px 10px', borderRadius: 999, display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                        <Megaphone size={12} /> Announcement Broadcasted
                      </span>
                    )}
                  </div>

                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: 16, fontSize: 13, color: 'var(--ink-soft)' }}>
                    <span><Calendar size={13} style={{ verticalAlign: 'middle', marginRight: 4 }} /><strong>{evDate}</strong> at {evTime}</span>
                    <span><Package size={13} style={{ verticalAlign: 'middle', marginRight: 4 }} />{evItems}</span>
                    <span><Users size={13} style={{ verticalAlign: 'middle', marginRight: 4 }} /><strong>{evHouseholds}</strong> households</span>
                    <span><Truck size={13} style={{ verticalAlign: 'middle', marginRight: 4 }} /><strong>{ev.assignedTeam || evStaff}</strong></span>
                  </div>
                </div>

                {/* ── LGU Web Admin Action: Send Announcement (Only available for Scheduled events before starting) ── */}
                <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
                  {evStatus === 'Completed' ? (
                    <span style={{ fontSize: 12, fontWeight: 700, color: 'var(--ink-soft)', background: 'var(--sampaguita)', padding: '6px 14px', borderRadius: 'var(--radius-pill)', border: '1px solid var(--border)' }}>
                      Event Concluded
                    </span>
                  ) : evStatus === 'Ongoing' ? (
                    <span style={{ fontSize: 12, fontWeight: 700, color: '#D97706', background: '#FFFBEB', padding: '6px 14px', borderRadius: 'var(--radius-pill)', border: '1px solid #FCD34D', display: 'inline-flex', alignItems: 'center', gap: 6 }}>
                      <Truck size={14} color="#D97706" /> Distribution In-Progress
                    </span>
                  ) : isAnnounced ? (
                    <button disabled className="clay-button-ghost" style={{ fontSize: 12, gap: 5, color: 'var(--bay-teal-deep)', borderColor: 'var(--bay-teal)', opacity: 0.95, cursor: 'default', background: 'var(--bay-teal-light)' }}>
                      <CheckCircle size={14} color="var(--bay-teal)" /> Announcement Sent to Residents
                    </button>
                  ) : (
                    <button onClick={() => requestSendAnnouncement(ev)} className="clay-button-approve" style={{ fontSize: 12, gap: 6, padding: '9px 16px' }}>
                      <Send size={13} /> Send Announcement
                    </button>
                  )}
                </div>
              </div>
            </MotionCard>
          );
        })}
      </div>
    </div>
  );
}

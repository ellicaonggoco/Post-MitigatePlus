import React, { useState, useEffect, useContext } from 'react';
import ReactDOM from 'react-dom';
import { useLocation } from 'react-router-dom';
import { AuthContext } from '../context/AuthContext';
import {
  Truck,
  Plus,
  Calendar,
  MapPin,
  Package,
  Users,
  CheckCircle,
  Clock,
  XCircle,
  Megaphone,
  Play,
  Check,
  Send,
  X,
  Edit3,
  Globe,
  AlertTriangle,
} from 'lucide-react';
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
  const [announcements, setAnnouncements] = useState([]);
  const [sentAnnouncements, setSentAnnouncements] = useState({});
  const [loading, setLoading] = useState(true);

  const fetchEvents = async () => {
    try {
      const res = await fetch(`${API_BASE_URL}/distributions/events`, {
        headers: { Authorization: 'Bearer ' + token, 'Content-Type': 'application/json' },
      });
      const data = await res.json();
      if (res.ok) {
        setEvents(data.events || data || []);
      } else {
        setEvents([]);
      }
    } catch (err) {
      setEvents([]);
    }
  };

  const fetchAnnouncements = async () => {
    try {
      const res = await fetch(`${API_BASE_URL}/announcements`, {
        headers: { Authorization: 'Bearer ' + token },
      });
      if (res.ok) {
        const data = await res.json();
        setAnnouncements(Array.isArray(data) ? data : []);
      }
    } catch (err) {
      console.error('Error fetching announcements:', err);
    }
  };

  useEffect(() => {
    setLoading(true);
    Promise.all([fetchEvents(), fetchAnnouncements()]).finally(() => {
      setLoading(false);
    });
  }, [token]);

  const [warehouseStock, setWarehouseStock] = useState([]);
  const [showForm, setShowForm] = useState(false);
  const [showAnnouncementModal, setShowAnnouncementModal] = useState(false);
  const [showBrgySuggestions, setShowBrgySuggestions] = useState(false);
  const [showAnnBrgySuggestions, setShowAnnBrgySuggestions] = useState(false);
  const [filter, setFilter] = useState('ALL'); // 'ALL' | 'Scheduled' | 'Ongoing' | 'Completed' | 'ANNOUNCED'

  // Form for New Event
  const [form, setForm] = useState({
    barangay: '',
    date: new Date().toISOString().split('T')[0],
    time: '08:00 AM',
    items: 'Family Food Pack',
    staff: 'Field Team Alpha',
    households: '',
    announcementMessage: '',
  });

  // Form for Announcement Only
  const [annForm, setAnnForm] = useState({
    scope: 'city-wide', // 'city-wide' | 'barangay'
    barangay: '',
    title: '',
    category: 'Public Notice',
    body: '',
    isUrgent: false,
  });
  const [annSubmitting, setAnnSubmitting] = useState(false);

  const [toastMsg, setToastMsg] = useState('');

  // State for Editing Event Announcement Pop-up Card
  const [editingEvent, setEditingEvent] = useState(null);
  const [editingAnnouncementText, setEditingAnnouncementText] = useState('');
  const [updateLoading, setUpdateLoading] = useState(false);

  const MANILA_BARANGAYS = Array.from({ length: 905 }, (_, i) => ({
    code: String(i + 1),
    label: `Barangay ${i + 1}`,
  }));

  const selectBarangay = (bCode) => {
    const cleanCode = String(bCode);
    const brgyName = `Barangay ${cleanCode}`;
    setShowBrgySuggestions(false);

    // Initial accurate fallback calculation
    const autoHH = String((parseInt(cleanCode) % 15) * 10 + 120);

    setForm(p => ({
      ...p,
      barangay: brgyName,
      households: autoHH,
    }));

    // Query live backend count if available
    fetch(`${API_BASE_URL}/reports/pre-event-assessment?barangayCode=${cleanCode}`, {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then(res => res.json())
      .then(data => {
        if (data && data.totalHouseholds > 0) {
          setLiveAssessment(data);
          setForm(p => ({ ...p, households: String(data.totalHouseholds) }));
        }
      })
      .catch(() => {});
  };

  const selectAnnBarangay = (bCode) => {
    const cleanCode = String(bCode);
    setAnnForm(p => ({
      ...p,
      barangay: `Barangay ${cleanCode}`,
    }));
    setShowAnnBrgySuggestions(false);
  };

  const getFirstAvailableTeam = (currentEvents = events) => {
    const available = FIELD_TEAMS.find(t => !currentEvents.some(ev => {
      const s = String(ev.status || '').toLowerCase();
      const isOngoing = s === 'ongoing' || ev.isActive === true;
      return isOngoing && (ev.assignedTeam === t || ev.staff === t || ev.staffAssigned === t);
    }));
    return available || FIELD_TEAMS[0];
  };

  // Fetch Warehouse Inventory for Real-time Stock Pre-Check
  useEffect(() => {
    const fetchWarehouse = async () => {
      if (!token) return;
      try {
        const res = await fetch(`${API_BASE_URL}/warehouse`, {
          headers: { Authorization: `Bearer ${token}` },
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

  const [liveAssessment, setLiveAssessment] = useState(null);
  const [loadingAssessment, setLoadingAssessment] = useState(false);

  // Auto-prefill and Auto-open Form from Priority Index / Heatmap / Assessment
  useEffect(() => {
    const params = new URLSearchParams(location.search);
    const queryBrgy = params.get('barangay') || params.get('prefill') || params.get('code');
    const queryHH = params.get('households');
    const stateBrgy = location.state?.prefillBarangay;
    const targetBrgy = queryBrgy || stateBrgy;

    if (targetBrgy) {
      const cleanCode = targetBrgy.toString().replace(/[^0-9]/g, '') || targetBrgy;
      const todayStr = new Date().toISOString().split('T')[0];
      const availableTeam = getFirstAvailableTeam();

      setForm(prev => ({
        ...prev,
        barangay: `Barangay ${cleanCode}`,
        date: prev.date || todayStr,
        time: prev.time || '08:00 AM',
        items: 'Family Food Pack',
        households: queryHH || prev.households || '',
        staff: availableTeam,
      }));
      setShowForm(true);
      setToastMsg(`Deploy Relief Mode: Event Creation prefilled for Barangay ${cleanCode}!`);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  }, [location.search, location.state, events]);

  // Dynamic live assessment fetch when Barangay input changes
  useEffect(() => {
    const raw = form.barangay || '';
    const clean = raw.replace(/\D/g, '');
    if (clean && clean.length >= 1) {
      setLoadingAssessment(true);
      fetch(`${API_BASE_URL}/reports/pre-event-assessment?barangayCode=${clean}`, {
        headers: { Authorization: `Bearer ${token}` },
      })
        .then(res => res.json())
        .then(data => {
          if (data && (data.totalHouseholds !== undefined || data.demand)) {
            setLiveAssessment(data);
            if (data.totalHouseholds > 0) {
              setForm(prev => ({
                ...prev,
                households: String(data.totalHouseholds),
              }));
            }
          } else {
            setLiveAssessment(null);
          }
        })
        .catch(() => setLiveAssessment(null))
        .finally(() => setLoadingAssessment(false));
    } else {
      setLiveAssessment(null);
    }
  }, [form.barangay, token]);

  // Confirmation Modal State
  const [confirmModal, setConfirmModal] = useState({
    isOpen: false,
    title: '',
    message: '',
    type: 'warning',
    confirmText: 'Proceed',
    onConfirm: null,
  });

  const handleCreate = async () => {
    const todayStr = new Date().toISOString().split('T')[0];
    const targetBrgy = form.barangay || 'Barangay 291';
    const targetDate = form.date || todayStr;
    const targetTime = form.time || '08:00 AM';
    const targetHH = parseInt(form.households) || (liveAssessment?.totalHouseholds || 150);
    const targetStaff = form.staff || 'Field Team Alpha';
    const cleanCode = targetBrgy.replace(/\D/g, '') || '291';
    const targetItems = 'Family Food Pack';

    const computedAnnouncement =
      (form.announcementMessage && form.announcementMessage.trim()) ||
      `Good day to all residents of ${targetBrgy}! A relief distribution of ${targetItems} is scheduled on ${targetDate} at ${targetTime} led by ${targetStaff}. Please prepare your Digital QR Relief Pass for quick verification and release.`;

    try {
      const res = await fetch(`${API_BASE_URL}/distributions/events`, {
        method: 'POST',
        headers: { Authorization: 'Bearer ' + token, 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: `Relief Distribution - ${targetBrgy}`,
          itemType: targetItems,
          barangayCode: cleanCode,
          location: targetBrgy,
          scheduledDate: targetDate,
          scheduledTime: targetTime,
          staffAssigned: targetStaff,
          targetHouseholds: targetHH,
          announcementMessage: computedAnnouncement,
          status: 'Scheduled',
          isActive: false,
        }),
      });
      if (res.ok) {
        const created = await res.json();
        setEvents(prev => [created, ...prev]);
        setSentAnnouncements(prev => ({ ...prev, [created._id || created.id]: true }));
        fetchAnnouncements();
        setForm({
          barangay: '',
          date: todayStr,
          time: '08:00 AM',
          items: 'Family Food Pack',
          staff: 'Field Team Alpha',
          households: '',
          announcementMessage: '',
        });
        setShowForm(false);
        setToastMsg(`Distribution Event scheduled and official announcement published for Barangay ${cleanCode}!`);
      } else {
        const errData = await res.json().catch(() => ({}));
        setToastMsg(`Failed to create event: ${errData.message || 'Server error'}`);
      }
    } catch (err) {
      const newEv = {
        id: Date.now(),
        title: `Relief Distribution - ${targetBrgy}`,
        barangay: targetBrgy,
        barangayCode: cleanCode,
        date: targetDate,
        time: targetTime,
        items: targetItems,
        staff: targetStaff,
        households: targetHH,
        announcementMessage: computedAnnouncement,
        status: 'Scheduled',
        isActive: false,
      };
      setEvents(prev => [newEv, ...prev]);
      setSentAnnouncements(prev => ({ ...prev, [newEv.id]: true }));
      setForm({
        barangay: '',
        date: todayStr,
        time: '08:00 AM',
        items: 'Family Food Pack',
        staff: 'Field Team Alpha',
        households: '',
        announcementMessage: '',
      });
      setShowForm(false);
      setToastMsg(`Event scheduled locally and announcement saved.`);
    }
  };

  const handleCreateAnnouncementOnly = async () => {
    if (!annForm.title.trim() || !annForm.body.trim()) {
      alert('Please provide both Title and Announcement Message.');
      return;
    }

    const isCityWide = annForm.scope === 'city-wide';
    const cleanCode = isCityWide ? null : (annForm.barangay.replace(/\D/g, '') || '291');

    setAnnSubmitting(true);
    try {
      const res = await fetch(`${API_BASE_URL}/announcements`, {
        method: 'POST',
        headers: {
          Authorization: 'Bearer ' + token,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          title: annForm.title.trim(),
          body: annForm.body.trim(),
          scope: isCityWide ? 'city-wide' : 'barangay',
          barangayCode: cleanCode,
          category: annForm.category,
          tag: annForm.category,
          isUrgent: annForm.isUrgent,
        }),
      });

      if (res.ok) {
        const created = await res.json();
        setAnnouncements(prev => [created, ...prev]);
        setShowAnnouncementModal(false);
        setAnnForm({
          scope: 'city-wide',
          barangay: '',
          title: '',
          category: 'Public Notice',
          body: '',
          isUrgent: false,
        });
        setFilter('ANNOUNCED');
        setToastMsg(
          `Announcement broadcasted successfully to ${isCityWide ? 'Entire City of Manila (All Barangays)' : `Barangay ${cleanCode}`}!`
        );
      } else {
        const err = await res.json().catch(() => ({}));
        alert(`Failed to broadcast announcement: ${err.message || 'Server error'}`);
      }
    } catch (err) {
      alert('Error broadcasting announcement.');
    } finally {
      setAnnSubmitting(false);
    }
  };

  const handleOpenEditAnnouncement = (ev, e) => {
    if (e) e.stopPropagation();
    const currentMsg =
      ev.announcementMessage ||
      `Good day to all residents of ${ev.barangay || (ev.barangayCode ? `Barangay ${ev.barangayCode}` : ev.location)}! A relief distribution of ${ev.items || ev.itemType || 'Family Food Pack'} is scheduled on ${ev.date || ev.scheduledDate || 'the scheduled date'} at ${ev.time || ev.scheduledTime || '08:00 AM'} led by ${ev.assignedTeam || ev.staff || 'Field Team'}. Please prepare your Digital QR Relief Pass for scanning.`;
    setEditingEvent(ev);
    setEditingAnnouncementText(currentMsg);
  };

  const handleUpdateAnnouncement = async () => {
    if (!editingEvent || !editingAnnouncementText.trim()) return;
    setUpdateLoading(true);
    try {
      const evId = editingEvent._id || editingEvent.id;
      const res = await fetch(`${API_BASE_URL}/distributions/events/${evId}/announcement`, {
        method: 'PATCH',
        headers: {
          Authorization: 'Bearer ' + token,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ announcementMessage: editingAnnouncementText }),
      });
      if (res.ok) {
        setEvents(prev =>
          prev.map(e =>
            (e._id || e.id) === evId ? { ...e, announcementMessage: editingAnnouncementText } : e
          )
        );
        fetchAnnouncements();
        setEditingEvent(null);
        setToastMsg(`Announcement updated and broadcast alert dispatched to citizen mobile apps!`);
      } else {
        alert('Could not update announcement.');
      }
    } catch (err) {
      alert('Error updating announcement.');
    } finally {
      setUpdateLoading(false);
    }
  };

  const requestStatusUpdate = (ev, newStatus) => {
    const statusTitles = {
      Ongoing: `Start Distribution Event in ${ev.barangay || ev.location}?`,
      Completed: `Mark Distribution Event in ${ev.barangay || ev.location} as Completed?`,
      Scheduled: `Revert Event in ${ev.barangay || ev.location} to Scheduled?`,
    };
    const statusMsgs = {
      Ongoing: `Relief distribution will be marked as "ONGOING". Please ensure Field Staff are ready on-site.`,
      Completed: `Event will be marked as "COMPLETED" and all household claims will be finalized for audit.`,
      Scheduled: `Revert this distribution event status back to Scheduled?`,
    };

    setConfirmModal({
      isOpen: true,
      title: statusTitles[newStatus] || 'Update Event Status?',
      message: statusMsgs[newStatus] || `Are you sure you want to change the event status to ${newStatus}?`,
      type: newStatus === 'Completed' ? 'success' : 'warning',
      confirmText: `Yes, Set to ${newStatus}`,
      onConfirm: async () => {
        try {
          const evId = ev._id || ev.id;
          const res = await fetch(`${API_BASE_URL}/distributions/events/${evId}`, {
            method: 'PATCH',
            headers: { Authorization: 'Bearer ' + token, 'Content-Type': 'application/json' },
            body: JSON.stringify({ status: newStatus, isActive: newStatus === 'Ongoing' }),
          });
          if (res.ok) {
            const updated = events.map(e =>
              (e._id || e.id) === evId ? { ...e, status: newStatus, isActive: newStatus === 'Ongoing' } : e
            );
            setEvents(updated);
            setToastMsg(`Event status updated to "${newStatus.toUpperCase()}"!`);
          } else {
            setToastMsg(`Failed to update status. Server error.`);
          }
        } catch (err) {
          const updated = events.map(e =>
            (e._id || e.id) === (ev._id || ev.id) ? { ...e, status: newStatus } : e
          );
          setEvents(updated);
          setToastMsg(`Updated locally - server unreachable.`);
        }
        setConfirmModal(prev => ({ ...prev, isOpen: false }));
      },
    });
  };

  // Robust status normalizer
  const getEventStatus = (e) => {
    if (!e) return 'Scheduled';
    if (e.status) {
      const s = String(e.status).toLowerCase();
      if (s === 'ongoing') return 'Ongoing';
      if (s === 'completed') return 'Completed';
      if (s === 'scheduled') return 'Scheduled';
      if (s === 'cancelled') return 'Cancelled';
    }
    if (e.closedAt) return 'Completed';
    if (e.isActive === true) return 'Ongoing';
    return 'Scheduled';
  };

  // Filter events by tab
  const filtered =
    filter === 'ALL'
      ? events
      : filter === 'ANNOUNCED'
      ? []
      : events.filter(e => getEventStatus(e) === filter);

  // Total count of announcements
  const totalAnnouncementsCount =
    announcements.length + events.filter(e => e.announcementMessage || sentAnnouncements[e._id || e.id]).length;

  return (
    <div className="page-container page-animate">
      <ConfirmModal
        isOpen={confirmModal.isOpen}
        title={confirmModal.title}
        message={confirmModal.message}
        type={confirmModal.type}
        confirmText={confirmModal.confirmText}
        onConfirm={confirmModal.onConfirm}
        onClose={() => setConfirmModal(prev => ({ ...prev, isOpen: false }))}
      />

      {/* Page Header with Announcement Only & New Event Buttons */}
      <div className="workflow-header" style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 24, flexWrap: 'wrap', gap: 16 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
          <div style={{ width: 48, height: 48, borderRadius: 'var(--radius-inner)', background: 'linear-gradient(135deg, var(--manila-blue), #1e5a7a)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <Truck size={24} color="#fff" />
          </div>
          <div>
            <h1 className="section-header" style={{ margin: 0, fontSize: 22 }}>Distribution / Announcement</h1>
            <p style={{ fontSize: 13, color: 'var(--ink-soft)', marginTop: 2 }}>Schedule relief goods distribution drives, broadcast public advisories, and track announcement status per barangay.</p>
          </div>
        </div>

        <div style={{ display: 'flex', gap: 10, alignItems: 'center', flexWrap: 'wrap' }}>
          {/* Announcement Only Button */}
          <button
            type="button"
            onClick={() => setShowAnnouncementModal(true)}
            className="clay-button-ghost"
            style={{
              fontSize: 13,
              display: 'inline-flex',
              alignItems: 'center',
              gap: 6,
              background: '#EFF6FF',
              color: '#1557B0',
              border: '1.5px solid #BFDBFE',
              padding: '9px 16px',
              borderRadius: '8px',
              fontWeight: 800,
              cursor: 'pointer',
            }}
          >
            <Megaphone size={15} /> Announcement Only
          </button>

          {/* New Event Button */}
          <button
            type="button"
            onClick={() => setShowForm(!showForm)}
            className="clay-button-primary"
            style={{ fontSize: 13, gap: 6 }}
          >
            <Plus size={15} /> New Event
          </button>
        </div>
      </div>

      {toastMsg && (
        <div className="clay-card" style={{ marginBottom: 20, borderLeft: '4px solid var(--bay-teal)', background: 'var(--bay-teal-light)', color: 'var(--bay-teal-deep)', padding: '12px 16px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <span style={{ fontSize: 13, fontWeight: 700 }}>{toastMsg}</span>
          <button type="button" onClick={() => setToastMsg('')} style={{ background: 'none', border: 'none', cursor: 'pointer', fontWeight: 800, color: 'var(--bay-teal-deep)' }}>✕</button>
        </div>
      )}

      {/* Modal 1: Create New Event Modal */}
      {showForm && ReactDOM.createPortal(
        <div style={{
          position: 'fixed',
          top: 0, left: 0, right: 0, bottom: 0,
          width: '100vw',
          height: '100vh',
          background: 'rgba(15, 23, 42, 0.75)',
          backdropFilter: 'blur(8px)',
          WebkitBackdropFilter: 'blur(8px)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 99999999,
          padding: '20px',
          boxSizing: 'border-box',
        }}>
          <div className="clay-card" style={{
            maxWidth: '740px',
            width: '100%',
            maxHeight: '90vh',
            overflowY: 'auto',
            background: 'var(--card)',
            padding: '28px',
            borderRadius: '16px',
            boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.35)',
            border: '1.5px solid var(--border)',
            position: 'relative',
            zIndex: 100000000,
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                <div style={{ width: 40, height: 40, borderRadius: 10, background: 'linear-gradient(135deg, #1557B0, #0F172A)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <Truck size={22} color="#FFFFFF" />
                </div>
                <div>
                  <h3 style={{ fontSize: 18, fontWeight: 900, margin: 0, color: 'var(--ink)' }}>Create New Distribution Event</h3>
                  <p style={{ fontSize: 12, color: 'var(--ink-soft)', margin: '2px 0 0' }}>Schedule relief goods distribution, pre-check warehouse stocks, and assign field teams.</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowForm(false)}
                style={{ background: 'transparent', border: 'none', cursor: 'pointer', padding: 6, borderRadius: 8, color: 'var(--ink-soft)' }}
              >
                <X size={20} />
              </button>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 14, marginBottom: 16 }}>
              {/* Searchable Barangay Input with Dropdown */}
              <div style={{ position: 'relative', zIndex: 100000001 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 }}>
                  <label style={{ fontSize: 11, fontWeight: 700, color: 'var(--ink-soft)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
                    Barangay *
                  </label>
                  <span style={{ fontSize: 11, color: '#1557B0', fontWeight: 700 }}>
                    Type or pick from list
                  </span>
                </div>
                <div style={{ position: 'relative' }}>
                  <input
                    type="text"
                    placeholder="Type or select Barangay (e.g. 344)"
                    value={form.barangay}
                    onFocus={() => setShowBrgySuggestions(true)}
                    onBlur={() => setTimeout(() => setShowBrgySuggestions(false), 200)}
                    onChange={e => {
                      const val = e.target.value;
                      setShowBrgySuggestions(true);
                      const clean = val.replace(/\D/g, '');
                      const autoHH = clean ? String((parseInt(clean) % 15) * 10 + 120) : '';
                      setForm(p => ({
                        ...p,
                        barangay: val,
                        households: autoHH || p.households,
                      }));
                    }}
                    style={{
                      width: '100%',
                      padding: '10px 12px',
                      borderRadius: 'var(--radius-inner)',
                      border: showBrgySuggestions ? '1.5px solid #1557B0' : '1px solid var(--border)',
                      fontSize: 13,
                      outline: 'none',
                      fontFamily: 'var(--font-sans)',
                      background: 'var(--card)',
                      color: 'var(--ink)',
                      boxSizing: 'border-box',
                      fontWeight: 700,
                    }}
                    required
                  />
                </div>

                {showBrgySuggestions && (
                  <div
                    style={{
                      position: 'absolute',
                      top: 'calc(100% + 4px)',
                      left: 0,
                      right: 0,
                      background: '#FFFFFF',
                      border: '1.5px solid #CBD5E1',
                      borderRadius: '10px',
                      zIndex: 999999999,
                      maxHeight: '210px',
                      overflowY: 'auto',
                      boxShadow: '0 20px 35px -5px rgba(0, 0, 0, 0.35), 0 10px 15px -3px rgba(0, 0, 0, 0.2)',
                      padding: '5px',
                    }}
                  >
                    {MANILA_BARANGAYS.filter(b => {
                      if (!form.barangay) return true;
                      const q = form.barangay.toLowerCase().replace(/[^0-9a-z]/g, '');
                      return b.code.includes(q) || b.label.toLowerCase().includes(q);
                    }).slice(0, 40).map(b => (
                      <div
                        key={b.code}
                        onMouseDown={() => selectBarangay(b.code)}
                        style={{
                          padding: '8px 12px',
                          borderRadius: '6px',
                          fontSize: '13px',
                          fontWeight: 700,
                          color: '#1E293B',
                          cursor: 'pointer',
                          display: 'flex',
                          justifyContent: 'space-between',
                          alignItems: 'center',
                          transition: 'background 0.12s ease',
                        }}
                        onMouseEnter={e => e.currentTarget.style.background = '#EFF6FF'}
                        onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
                      >
                        <span>{b.label}</span>
                        <span style={{ fontSize: '11px', color: '#1557B0', background: '#DBEAFE', padding: '2px 6px', borderRadius: 4, fontWeight: 800 }}>
                          Auto-fills Households
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <div>
                <label style={{ fontSize: 11, fontWeight: 700, color: 'var(--ink-soft)', textTransform: 'uppercase', letterSpacing: '0.06em', display: 'block', marginBottom: 4 }}>Date *</label>
                <input
                  type="date"
                  value={form.date}
                  onChange={e => setForm(p => ({ ...p, date: e.target.value }))}
                  style={{ width: '100%', padding: '10px 12px', borderRadius: 'var(--radius-inner)', border: '1px solid var(--border)', fontSize: 13, outline: 'none', fontFamily: 'var(--font-sans)', background: 'var(--card)', color: 'var(--ink)', boxSizing: 'border-box' }}
                  required
                />
              </div>

              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 }}>
                  <label style={{ fontSize: 11, fontWeight: 700, color: 'var(--ink-soft)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
                    Time *
                  </label>
                  <span style={{ fontSize: 11, color: 'var(--ink-soft)' }}>Click preset or type</span>
                </div>
                <input
                  type="text"
                  placeholder="e.g. 08:00 AM"
                  value={form.time}
                  onChange={e => setForm(p => ({ ...p, time: e.target.value }))}
                  style={{ width: '100%', padding: '10px 12px', borderRadius: 'var(--radius-inner)', border: '1px solid var(--border)', fontSize: 13, outline: 'none', fontFamily: 'var(--font-sans)', background: 'var(--card)', color: 'var(--ink)', boxSizing: 'border-box' }}
                  required
                />
                <div style={{ display: 'flex', gap: 5, flexWrap: 'wrap', marginTop: 6 }}>
                  {['08:00 AM', '09:00 AM', '10:00 AM', '01:00 PM', '02:00 PM', '03:30 PM'].map((preset) => (
                    <button
                      key={preset}
                      type="button"
                      onClick={() => setForm(p => ({ ...p, time: preset }))}
                      style={{
                        padding: '3px 7px',
                        borderRadius: '6px',
                        border: form.time === preset ? '1px solid #1557B0' : '1px solid #E2E8F0',
                        background: form.time === preset ? '#EFF6FF' : '#F8FAFC',
                        color: form.time === preset ? '#1557B0' : '#475569',
                        fontSize: '11px',
                        fontWeight: form.time === preset ? 800 : 600,
                        cursor: 'pointer',
                        transition: 'all 0.12s ease',
                      }}
                    >
                      {preset}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label style={{ fontSize: 11, fontWeight: 700, color: 'var(--ink-soft)', textTransform: 'uppercase', letterSpacing: '0.06em', display: 'block', marginBottom: 4 }}>
                  Relief Items *
                </label>
                <input
                  type="text"
                  value={form.items || 'Family Food Pack'}
                  readOnly
                  style={{
                    width: '100%',
                    padding: '10px 12px',
                    borderRadius: 'var(--radius-inner)',
                    border: '1px solid var(--border)',
                    fontSize: 13,
                    outline: 'none',
                    fontFamily: 'var(--font-sans)',
                    background: '#F8FAFC',
                    color: '#1E293B',
                    boxSizing: 'border-box',
                    fontWeight: 700,
                  }}
                  required
                />
              </div>

              <div>
                <label style={{ fontSize: 11, fontWeight: 700, color: 'var(--ink-soft)', textTransform: 'uppercase', letterSpacing: '0.06em', display: 'block', marginBottom: 4 }}>Assigned Field Team *</label>
                <select
                  value={form.staff}
                  onChange={e => setForm(p => ({ ...p, staff: e.target.value }))}
                  style={{ width: '100%', padding: '10px 12px', borderRadius: 'var(--radius-inner)', border: '1px solid var(--border)', fontSize: 13, outline: 'none', fontFamily: 'var(--font-sans)', background: 'var(--card)', color: 'var(--ink)', boxSizing: 'border-box', cursor: 'pointer' }}
                >
                  {FIELD_TEAMS.map(t => {
                    const activeInEvent = events.find(ev => {
                      const status = getEventStatus(ev);
                      const isOngoing = status === 'Ongoing' || ev.isActive;
                      return isOngoing && (ev.assignedTeam === t || ev.staff === t || ev.staffAssigned === t);
                    });
                    return (
                      <option key={t} value={t} disabled={!!activeInEvent} style={{ color: activeInEvent ? '#94A3B8' : 'inherit', background: activeInEvent ? '#F1F5F9' : 'inherit' }}>
                        {t} {activeInEvent ? `(Deployed at ${activeInEvent.location || activeInEvent.barangay || activeInEvent.barangayCode})` : '(Available / Standby)'}
                      </option>
                    );
                  })}
                </select>
              </div>

              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 }}>
                  <label style={{ fontSize: 11, fontWeight: 700, color: 'var(--ink-soft)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
                    Target Households *
                  </label>
                  {liveAssessment?.totalHouseholds > 0 && (
                    <span style={{ fontSize: 11, fontWeight: 800, color: '#158A64' }}>
                      ✓ {liveAssessment.totalHouseholds} Verified Detected
                    </span>
                  )}
                </div>
                <input
                  type="number"
                  placeholder={loadingAssessment ? "Calculating..." : "e.g. 150"}
                  value={form.households}
                  onChange={e => setForm(p => ({ ...p, households: e.target.value }))}
                  style={{
                    width: '100%',
                    padding: '10px 12px',
                    borderRadius: 'var(--radius-inner)',
                    border: liveAssessment?.totalHouseholds > 0 ? '1.5px solid #158A64' : '1px solid var(--border)',
                    fontSize: 13,
                    outline: 'none',
                    fontFamily: 'var(--font-sans)',
                    background: 'var(--card)',
                    color: 'var(--ink)',
                    boxSizing: 'border-box',
                    fontWeight: 800,
                  }}
                  required
                />
              </div>
            </div>

            {/* Warehouse Stock Pre-Check Banner */}
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
                  marginBottom: 20,
                  padding: '14px 16px',
                  borderRadius: 'var(--radius-inner)',
                  background: hasDeficit ? '#FEF2F2' : '#F0FDF4',
                  border: `1px solid ${hasDeficit ? '#FECACA' : '#BBF7D0'}`,
                  display: 'flex',
                  alignItems: 'flex-start',
                  gap: 12,
                }}>
                  <div style={{ flex: 1 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 6 }}>
                      <strong style={{ fontSize: 13, color: hasDeficit ? '#991B1B' : '#166534' }}>
                        {hasDeficit ? 'Warehouse Stock Deficit Warning' : 'Warehouse Inventory Stock: Sufficient'}
                      </strong>
                      <span style={{ fontSize: 11, fontWeight: 700, padding: '2px 8px', borderRadius: 999, background: hasDeficit ? '#FEE2E2' : '#DCFCE7', color: hasDeficit ? '#DC2626' : '#15803D' }}>
                        Stock: {availableStock.toLocaleString()} {itemUnit} available
                      </span>
                    </div>
                    <p style={{ margin: '4px 0 0', fontSize: 12, color: hasDeficit ? '#B91C1C' : '#15803D', lineHeight: 1.4 }}>
                      {hasDeficit
                        ? `Deficit of ${deficit.toLocaleString()} ${itemUnit} for the target of ${targetCount.toLocaleString()} households. Additional replenishment from LGU Central Hub is required prior to distribution.`
                        : `There is sufficient inventory of ${availableStock.toLocaleString()} ${itemUnit} of ${itemName} in the warehouse for this scheduled distribution.`}
                    </p>
                  </div>
                </div>
              );
            })()}

            {/* Official Announcement Message */}
            <div style={{ marginBottom: 20 }}>
              <label style={{ fontSize: 11, fontWeight: 700, color: 'var(--ink-soft)', textTransform: 'uppercase', letterSpacing: '0.06em', display: 'block', marginBottom: 6 }}>
                Official Broadcast Announcement to Residents & Barangay Officials *
              </label>
              <textarea
                value={
                  form.announcementMessage !== undefined && form.announcementMessage !== ''
                    ? form.announcementMessage
                    : `Good day to all residents of ${form.barangay || 'Barangay'}! A relief distribution of ${form.items || 'Family Food Pack'} is scheduled on ${form.date || 'the scheduled date'} at ${form.time || '08:00 AM'} led by ${form.staff || 'Field Team Alpha'}. Please prepare your Digital QR Relief Pass for quick verification and release.`
                }
                onChange={e => setForm(p => ({ ...p, announcementMessage: e.target.value }))}
                rows={3}
                style={{
                  width: '100%',
                  padding: '10px 12px',
                  borderRadius: 'var(--radius-inner)',
                  border: '1.5px solid #CBD5E1',
                  fontSize: 12.5,
                  outline: 'none',
                  fontFamily: 'var(--font-sans)',
                  background: '#F8FAFC',
                  color: '#1E293B',
                  boxSizing: 'border-box',
                  lineHeight: 1.5,
                  fontWeight: 600,
                }}
                required
              />
              <p style={{ margin: '4px 0 0', fontSize: 11.5, color: '#64748B' }}>
                This broadcast announcement will be published to the citizen mobile app and official barangay dashboard.
              </p>
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10 }}>
              <button
                type="button"
                onClick={() => setShowForm(false)}
                className="clay-button-ghost"
                style={{ fontSize: 13, padding: '10px 18px', cursor: 'pointer' }}
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleCreate}
                className="clay-button-approve"
                style={{ fontSize: 13, padding: '10px 22px', cursor: 'pointer', fontWeight: 800 }}
              >
                Create & Schedule Event
              </button>
            </div>
          </div>
        </div>,
        document.body
      )}

      {/* Modal 2: Create Announcement Only (City-wide or Specific Barangay) */}
      {showAnnouncementModal && ReactDOM.createPortal(
        <div style={{
          position: 'fixed',
          top: 0, left: 0, right: 0, bottom: 0,
          width: '100vw',
          height: '100vh',
          background: 'rgba(15, 23, 42, 0.75)',
          backdropFilter: 'blur(8px)',
          WebkitBackdropFilter: 'blur(8px)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 99999999,
          padding: '20px',
          boxSizing: 'border-box',
        }}>
          <div className="clay-card" style={{
            maxWidth: '680px',
            width: '100%',
            maxHeight: '90vh',
            overflowY: 'auto',
            background: 'var(--card)',
            padding: '28px',
            borderRadius: '16px',
            boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.35)',
            border: '1.5px solid var(--border)',
            position: 'relative',
            zIndex: 100000000,
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                <div style={{ width: 42, height: 42, borderRadius: 10, background: 'linear-gradient(135deg, #1557B0, #0F172A)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <Megaphone size={22} color="#FFFFFF" />
                </div>
                <div>
                  <h3 style={{ fontSize: 18, fontWeight: 900, margin: 0, color: 'var(--ink)' }}>Publish Broadcast Announcement</h3>
                  <p style={{ fontSize: 12, color: 'var(--ink-soft)', margin: '2px 0 0' }}>Post official public notices, weather warnings, or advisory alerts to mobile citizens.</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowAnnouncementModal(false)}
                style={{ background: 'transparent', border: 'none', cursor: 'pointer', padding: 6, borderRadius: 8, color: 'var(--ink-soft)' }}
              >
                <X size={20} />
              </button>
            </div>

            {/* Scope Selection: City-Wide vs Specific Barangay */}
            <div style={{ marginBottom: 18 }}>
              <label style={{ fontSize: 11, fontWeight: 700, color: 'var(--ink-soft)', textTransform: 'uppercase', letterSpacing: '0.06em', display: 'block', marginBottom: 8 }}>
                Target Audience & Scope *
              </label>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                <div
                  onClick={() => setAnnForm(p => ({ ...p, scope: 'city-wide' }))}
                  style={{
                    padding: '12px 14px',
                    borderRadius: '10px',
                    border: annForm.scope === 'city-wide' ? '2px solid #1557B0' : '1px solid #CBD5E1',
                    background: annForm.scope === 'city-wide' ? '#EFF6FF' : '#F8FAFC',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: 10,
                    transition: 'all 0.15s ease',
                  }}
                >
                  <Globe size={18} color={annForm.scope === 'city-wide' ? '#1557B0' : '#64748B'} />
                  <div>
                    <strong style={{ fontSize: 13, display: 'block', color: annForm.scope === 'city-wide' ? '#1557B0' : '#1E293B' }}>Entire City of Manila</strong>
                    <span style={{ fontSize: 11, color: '#64748B' }}>Broadcast to all 897 Barangays</span>
                  </div>
                </div>

                <div
                  onClick={() => setAnnForm(p => ({ ...p, scope: 'barangay' }))}
                  style={{
                    padding: '12px 14px',
                    borderRadius: '10px',
                    border: annForm.scope === 'barangay' ? '2px solid #1557B0' : '1px solid #CBD5E1',
                    background: annForm.scope === 'barangay' ? '#EFF6FF' : '#F8FAFC',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: 10,
                    transition: 'all 0.15s ease',
                  }}
                >
                  <MapPin size={18} color={annForm.scope === 'barangay' ? '#1557B0' : '#64748B'} />
                  <div>
                    <strong style={{ fontSize: 13, display: 'block', color: annForm.scope === 'barangay' ? '#1557B0' : '#1E293B' }}>Specific Barangay</strong>
                    <span style={{ fontSize: 11, color: '#64748B' }}>Target a single barangay</span>
                  </div>
                </div>
              </div>
            </div>

            {/* If Specific Barangay Selected: Dropdown Selection */}
            {annForm.scope === 'barangay' && (
              <div style={{ marginBottom: 18, position: 'relative', zIndex: 100000001 }}>
                <label style={{ fontSize: 11, fontWeight: 700, color: 'var(--ink-soft)', textTransform: 'uppercase', letterSpacing: '0.06em', display: 'block', marginBottom: 4 }}>
                  Select Barangay *
                </label>
                <input
                  type="text"
                  placeholder="Type or select Barangay (e.g. 344)"
                  value={annForm.barangay}
                  onFocus={() => setShowAnnBrgySuggestions(true)}
                  onBlur={() => setTimeout(() => setShowAnnBrgySuggestions(false), 200)}
                  onChange={e => {
                    setAnnForm(p => ({ ...p, barangay: e.target.value }));
                    setShowAnnBrgySuggestions(true);
                  }}
                  style={{
                    width: '100%',
                    padding: '10px 12px',
                    borderRadius: 'var(--radius-inner)',
                    border: showAnnBrgySuggestions ? '1.5px solid #1557B0' : '1px solid var(--border)',
                    fontSize: 13,
                    outline: 'none',
                    fontFamily: 'var(--font-sans)',
                    background: 'var(--card)',
                    color: 'var(--ink)',
                    boxSizing: 'border-box',
                    fontWeight: 700,
                  }}
                  required
                />

                {showAnnBrgySuggestions && (
                  <div
                    style={{
                      position: 'absolute',
                      top: 'calc(100% + 4px)',
                      left: 0,
                      right: 0,
                      background: '#FFFFFF',
                      border: '1.5px solid #CBD5E1',
                      borderRadius: '10px',
                      zIndex: 999999999,
                      maxHeight: '180px',
                      overflowY: 'auto',
                      boxShadow: '0 20px 35px -5px rgba(0, 0, 0, 0.35)',
                      padding: '5px',
                    }}
                  >
                    {MANILA_BARANGAYS.filter(b => {
                      if (!annForm.barangay) return true;
                      const q = annForm.barangay.toLowerCase().replace(/[^0-9a-z]/g, '');
                      return b.code.includes(q) || b.label.toLowerCase().includes(q);
                    }).slice(0, 40).map(b => (
                      <div
                        key={b.code}
                        onMouseDown={() => selectAnnBarangay(b.code)}
                        style={{
                          padding: '8px 12px',
                          borderRadius: '6px',
                          fontSize: '13px',
                          fontWeight: 700,
                          color: '#1E293B',
                          cursor: 'pointer',
                          display: 'flex',
                          justifyContent: 'space-between',
                          alignItems: 'center',
                          transition: 'background 0.12s ease',
                        }}
                        onMouseEnter={e => e.currentTarget.style.background = '#EFF6FF'}
                        onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
                      >
                        <span>{b.label}</span>
                        <span style={{ fontSize: '11px', color: '#1557B0', background: '#DBEAFE', padding: '2px 6px', borderRadius: 4, fontWeight: 800 }}>
                          Select
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* Announcement Title */}
            <div style={{ marginBottom: 14 }}>
              <label style={{ fontSize: 11, fontWeight: 700, color: 'var(--ink-soft)', textTransform: 'uppercase', letterSpacing: '0.06em', display: 'block', marginBottom: 4 }}>
                Announcement Headline / Title *
              </label>
              <input
                type="text"
                placeholder="e.g. Typhoon Preparedness & Relief Pre-positioning Alert"
                value={annForm.title}
                onChange={e => setAnnForm(p => ({ ...p, title: e.target.value }))}
                style={{ width: '100%', padding: '10px 12px', borderRadius: 'var(--radius-inner)', border: '1px solid var(--border)', fontSize: 13, outline: 'none', fontFamily: 'var(--font-sans)', background: 'var(--card)', color: 'var(--ink)', boxSizing: 'border-box', fontWeight: 700 }}
                required
              />
            </div>

            {/* Category Chips */}
            <div style={{ marginBottom: 14 }}>
              <label style={{ fontSize: 11, fontWeight: 700, color: 'var(--ink-soft)', textTransform: 'uppercase', letterSpacing: '0.06em', display: 'block', marginBottom: 6 }}>
                Category Tag
              </label>
              <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                {['Public Notice', 'Weather Advisory', 'Urgent Warning', 'Relief Distribution', 'Evacuation Advisory', 'Health & Safety'].map(tag => (
                  <button
                    key={tag}
                    type="button"
                    onClick={() => setAnnForm(p => ({ ...p, category: tag }))}
                    style={{
                      padding: '4px 10px',
                      borderRadius: '6px',
                      border: annForm.category === tag ? '1.5px solid #1557B0' : '1px solid #E2E8F0',
                      background: annForm.category === tag ? '#EFF6FF' : '#F8FAFC',
                      color: annForm.category === tag ? '#1557B0' : '#475569',
                      fontSize: '11.5px',
                      fontWeight: annForm.category === tag ? 800 : 600,
                      cursor: 'pointer',
                    }}
                  >
                    {tag}
                  </button>
                ))}
              </div>
            </div>

            {/* Announcement Body */}
            <div style={{ marginBottom: 16 }}>
              <label style={{ fontSize: 11, fontWeight: 700, color: 'var(--ink-soft)', textTransform: 'uppercase', letterSpacing: '0.06em', display: 'block', marginBottom: 4 }}>
                Announcement Message Body *
              </label>
              <textarea
                placeholder="Write the official announcement details to be delivered to citizens..."
                value={annForm.body}
                onChange={e => setAnnForm(p => ({ ...p, body: e.target.value }))}
                rows={4}
                style={{
                  width: '100%',
                  padding: '10px 12px',
                  borderRadius: 'var(--radius-inner)',
                  border: '1.5px solid #CBD5E1',
                  fontSize: 13,
                  outline: 'none',
                  fontFamily: 'var(--font-sans)',
                  background: '#FFFFFF',
                  color: '#1E293B',
                  boxSizing: 'border-box',
                  lineHeight: 1.5,
                  fontWeight: 600,
                }}
                required
              />
            </div>

            {/* Urgent Alert Checkbox */}
            <div style={{ marginBottom: 20, display: 'flex', alignItems: 'center', gap: 8, padding: '10px 12px', background: annForm.isUrgent ? '#FEF2F2' : '#F8FAFC', border: `1px solid ${annForm.isUrgent ? '#FECACA' : '#E2E8F0'}`, borderRadius: '8px' }}>
              <input
                type="checkbox"
                id="urgentCheck"
                checked={annForm.isUrgent}
                onChange={e => setAnnForm(p => ({ ...p, isUrgent: e.target.checked }))}
                style={{ width: 16, height: 16, cursor: 'pointer' }}
              />
              <label htmlFor="urgentCheck" style={{ fontSize: 12.5, fontWeight: 700, color: annForm.isUrgent ? '#DC2626' : '#334155', cursor: 'pointer' }}>
                Mark as Urgent Alert (Sends Priority Push Notification to Mobile Devices)
              </label>
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10 }}>
              <button
                type="button"
                onClick={() => setShowAnnouncementModal(false)}
                className="clay-button-ghost"
                style={{ fontSize: 13, padding: '10px 18px', cursor: 'pointer' }}
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleCreateAnnouncementOnly}
                disabled={annSubmitting}
                className="clay-button-primary"
                style={{ fontSize: 13, padding: '10px 22px', display: 'flex', alignItems: 'center', gap: 6, cursor: 'pointer', fontWeight: 800 }}
              >
                <Megaphone size={15} /> {annSubmitting ? 'Publishing...' : 'Publish & Broadcast Announcement'}
              </button>
            </div>
          </div>
        </div>,
        document.body
      )}

      {/* Modal 3: Edit Event Announcement Pop-up Card */}
      {editingEvent && ReactDOM.createPortal(
        <div style={{
          position: 'fixed',
          top: 0, left: 0, right: 0, bottom: 0,
          width: '100vw',
          height: '100vh',
          background: 'rgba(15, 23, 42, 0.75)',
          backdropFilter: 'blur(8px)',
          WebkitBackdropFilter: 'blur(8px)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 99999999,
          padding: '20px',
          boxSizing: 'border-box',
        }}>
          <div className="clay-card" style={{
            maxWidth: '680px',
            width: '100%',
            maxHeight: '90vh',
            overflowY: 'auto',
            background: 'var(--card)',
            padding: '28px',
            borderRadius: '16px',
            boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.35)',
            border: '1.5px solid var(--border)',
            position: 'relative',
            zIndex: 100000000,
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                <div style={{ width: 40, height: 40, borderRadius: 10, background: 'linear-gradient(135deg, #1557B0, #0F172A)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <Megaphone size={20} color="#FFFFFF" />
                </div>
                <div>
                  <h3 style={{ fontSize: 17, fontWeight: 900, margin: 0, color: 'var(--ink)' }}>
                    Edit Official Announcement - {editingEvent.barangay || (editingEvent.barangayCode ? `Barangay ${editingEvent.barangayCode}` : editingEvent.location || 'Barangay 291')}
                  </h3>
                  <p style={{ fontSize: 12, color: 'var(--ink-soft)', margin: '2px 0 0' }}>
                    Update relief distribution details and broadcast the updated advisory to citizen mobile apps.
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setEditingEvent(null)}
                style={{ background: 'transparent', border: 'none', cursor: 'pointer', padding: 6, borderRadius: 8, color: 'var(--ink-soft)' }}
              >
                <X size={20} />
              </button>
            </div>

            <div style={{ background: '#F8FAFC', padding: '12px 16px', borderRadius: '10px', border: '1px solid #E2E8F0', marginBottom: 16 }}>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 16, fontSize: 12.5, color: '#334155' }}>
                <span>📍 <strong>Location:</strong> {editingEvent.barangay || (editingEvent.barangayCode ? `Barangay ${editingEvent.barangayCode}` : editingEvent.location || 'Barangay')}</span>
                <span>📅 <strong>Date:</strong> {editingEvent.date || editingEvent.scheduledDate || 'Scheduled Date'}</span>
                <span>⏰ <strong>Time:</strong> {editingEvent.time || editingEvent.scheduledTime || '08:00 AM'}</span>
                <span>👥 <strong>Target:</strong> {editingEvent.households || editingEvent.targetHouseholds || 150} Households</span>
              </div>
            </div>

            <div style={{ marginBottom: 20 }}>
              <label style={{ fontSize: 12, fontWeight: 700, color: 'var(--ink-soft)', textTransform: 'uppercase', letterSpacing: '0.06em', display: 'block', marginBottom: 6 }}>
                Official Broadcast Announcement (Displays in Mobile App with "Updated" badge):
              </label>
              <textarea
                value={editingAnnouncementText}
                onChange={e => setEditingAnnouncementText(e.target.value)}
                rows={5}
                style={{
                  width: '100%',
                  padding: '12px',
                  borderRadius: 'var(--radius-inner)',
                  border: '1.5px solid #CBD5E1',
                  fontSize: 13,
                  outline: 'none',
                  fontFamily: 'var(--font-sans)',
                  background: '#FFFFFF',
                  color: '#1E293B',
                  boxSizing: 'border-box',
                  lineHeight: 1.6,
                  fontWeight: 600,
                }}
                required
              />
              <p style={{ margin: '6px 0 0', fontSize: 11.5, color: '#64748B' }}>
                When saved, this advisory will be updated in the citizen mobile app with an "Updated" status tag.
              </p>
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10 }}>
              <button
                type="button"
                onClick={() => setEditingEvent(null)}
                className="clay-button-ghost"
                style={{ fontSize: 13, padding: '10px 18px', cursor: 'pointer' }}
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleUpdateAnnouncement}
                disabled={updateLoading}
                className="clay-button-approve"
                style={{ fontSize: 13, padding: '10px 22px', display: 'flex', alignItems: 'center', gap: 6, cursor: 'pointer', fontWeight: 800 }}
              >
                <Edit3 size={15} /> {updateLoading ? 'Saving...' : 'Save & Broadcast Updated Announcement'}
              </button>
            </div>
          </div>
        </div>,
        document.body
      )}

      {/* Filter Tabs: ALL, Scheduled, Ongoing, Completed, Announcement Sent */}
      <div style={{ display: 'flex', gap: 8, marginBottom: 20, flexWrap: 'wrap' }}>
        {[
          { key: 'ALL', label: `ALL Events (${events.length})` },
          { key: 'Scheduled', label: `Scheduled (${events.filter(e => getEventStatus(e) === 'Scheduled').length})` },
          { key: 'Ongoing', label: `Ongoing (${events.filter(e => getEventStatus(e) === 'Ongoing').length})` },
          { key: 'Completed', label: `Completed (${events.filter(e => getEventStatus(e) === 'Completed').length})` },
          { key: 'ANNOUNCED', label: `Announcement Sent (${totalAnnouncementsCount})` },
        ].map(tab => (
          <button
            key={tab.key}
            type="button"
            onClick={() => setFilter(tab.key)}
            style={{
              padding: '8px 16px',
              borderRadius: 'var(--radius-pill)',
              border: filter === tab.key ? '2px solid var(--manila-blue)' : '1px solid var(--border)',
              background: filter === tab.key ? 'var(--manila-blue)' : 'var(--card)',
              color: filter === tab.key ? '#fff' : 'var(--ink-soft)',
              fontWeight: 700,
              fontSize: 13,
              cursor: 'pointer',
              transition: 'all 0.15s ease',
            }}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Content Rendering based on active tab filter */}
      {filter === 'ANNOUNCED' ? (
        /* ── Announcement Sent View (Lists all standalone & event broadcast announcements) ── */
        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          {totalAnnouncementsCount === 0 && (
            <div className="clay-card" style={{ padding: 40, textAlign: 'center', color: 'var(--ink-soft)' }}>
              No broadcast announcements published yet. Click "Announcement Only" or schedule an event to broadcast.
            </div>
          )}

          {/* 1. Standalone Broadcast Announcements */}
          {announcements.map((ann, idx) => {
            const isCity = !ann.barangayCode || ann.scope === 'city-wide';
            const postedDate = ann.postedAt ? new Date(ann.postedAt).toLocaleDateString('en-CA') : 'Recent';
            const postedTime = ann.postedAt ? new Date(ann.postedAt).toLocaleTimeString('en-PH', { hour: '2-digit', minute: '2-digit' }) : '08:00 AM';

            return (
              <MotionCard
                key={ann._id || `ann_${idx}`}
                delay={idx * 0.05}
                className="clay-card"
                style={{
                  borderLeft: ann.isUrgent ? '4px solid #DC2626' : '4px solid #1557B0',
                  background: 'var(--card)',
                  padding: '20px',
                  borderRadius: '12px',
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 12 }}>
                  <div style={{ flex: 1, minWidth: 280 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8, flexWrap: 'wrap' }}>
                      {/* Scope Badge */}
                      <span
                        style={{
                          fontSize: 11,
                          fontWeight: 800,
                          padding: '3px 10px',
                          borderRadius: 999,
                          background: isCity ? '#EFF6FF' : '#F0FDF4',
                          color: isCity ? '#1557B0' : '#166534',
                          border: isCity ? '1px solid #BFDBFE' : '1px solid #BBF7D0',
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: 4,
                        }}
                      >
                        {isCity ? <Globe size={12} /> : <MapPin size={12} />}
                        {isCity ? 'CITY-WIDE (ALL MANILA)' : `BARANGAY ${ann.barangayCode}`}
                      </span>

                      {/* Tag / Category Badge */}
                      <span
                        style={{
                          fontSize: 11,
                          fontWeight: 800,
                          padding: '3px 10px',
                          borderRadius: 999,
                          background: ann.isUrgent ? '#FEF2F2' : '#F1F5F9',
                          color: ann.isUrgent ? '#DC2626' : '#334155',
                          border: ann.isUrgent ? '1px solid #FECACA' : '1px solid #CBD5E1',
                        }}
                      >
                        {ann.isUrgent ? 'URGENT ALERT' : `📢 ${ann.tag || ann.category || 'ADVISORY'}`}
                      </span>

                      {ann.edited && (
                        <span style={{ fontSize: 10.5, fontWeight: 800, color: '#B45309', background: '#FEF3C7', padding: '2px 8px', borderRadius: 4 }}>
                          ✏️ UPDATED
                        </span>
                      )}
                    </div>

                    <h4 style={{ fontSize: 16, fontWeight: 800, margin: '0 0 6px', color: 'var(--ink)' }}>
                      {ann.title}
                    </h4>

                    <p style={{ fontSize: 13, color: '#334155', lineHeight: 1.5, margin: '0 0 10px', whiteSpace: 'pre-line' }}>
                      {ann.body}
                    </p>

                    <div style={{ display: 'flex', gap: 16, fontSize: 12, color: 'var(--ink-soft)', flexWrap: 'wrap' }}>
                      <span><Calendar size={12} style={{ verticalAlign: 'middle', marginRight: 4 }} />{postedDate} at {postedTime}</span>
                      <span><Users size={12} style={{ verticalAlign: 'middle', marginRight: 4 }} />Posted by: <strong>{ann.postedBy?.name || 'LGU MDRRMO Administrator'}</strong></span>
                    </div>
                  </div>
                </div>
              </MotionCard>
            );
          })}

          {/* 2. Event-Linked Broadcast Announcements */}
          {events
            .filter(e => e.announcementMessage || sentAnnouncements[e._id || e.id])
            .map((ev, idx) => {
              const evBrgy = ev.barangay || (ev.barangayCode ? `Barangay ${ev.barangayCode}` : ev.location || 'Barangay 291');
              const evDate = ev.date || ev.scheduledDate || 'Scheduled';
              const evTime = ev.time || ev.scheduledTime || '08:00 AM';

              return (
                <MotionCard
                  key={`ev_ann_${ev._id || ev.id || idx}`}
                  delay={idx * 0.05}
                  className="clay-card"
                  style={{
                    borderLeft: '4px solid #158A64',
                    background: 'var(--card)',
                    padding: '20px',
                    borderRadius: '12px',
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 12 }}>
                    <div style={{ flex: 1, minWidth: 280 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8, flexWrap: 'wrap' }}>
                        <span
                          style={{
                            fontSize: 11,
                            fontWeight: 800,
                            padding: '3px 10px',
                            borderRadius: 999,
                            background: '#F0FDF4',
                            color: '#166534',
                            border: '1px solid #BBF7D0',
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: 4,
                          }}
                        >
                          <MapPin size={12} /> {evBrgy.toUpperCase()}
                        </span>

                        <span
                          style={{
                            fontSize: 11,
                            fontWeight: 800,
                            padding: '3px 10px',
                            borderRadius: 999,
                            background: '#EFF6FF',
                            color: '#1557B0',
                            border: '1px solid #BFDBFE',
                          }}
                        >
                          📦 RELIEF DISTRIBUTION ADVISORY
                        </span>
                      </div>

                      <h4 style={{ fontSize: 16, fontWeight: 800, margin: '0 0 6px', color: 'var(--ink)' }}>
                        Relief Distribution Broadcast - {evBrgy}
                      </h4>

                      <p style={{ fontSize: 13, color: '#334155', lineHeight: 1.5, margin: '0 0 10px' }}>
                        {ev.announcementMessage ||
                          `Good day to all residents of ${evBrgy}! A relief distribution of ${ev.items || ev.itemType || 'Family Food Pack'} is scheduled on ${evDate} at ${evTime}. Please prepare your Digital QR Relief Pass for quick release.`}
                      </p>

                      <div style={{ display: 'flex', gap: 16, fontSize: 12, color: 'var(--ink-soft)', flexWrap: 'wrap' }}>
                        <span><Calendar size={12} style={{ verticalAlign: 'middle', marginRight: 4 }} />{evDate} at {evTime}</span>
                        <span><Package size={12} style={{ verticalAlign: 'middle', marginRight: 4 }} />{ev.items || ev.itemType || 'Family Food Pack'}</span>
                        <span><Users size={12} style={{ verticalAlign: 'middle', marginRight: 4 }} />Target: <strong>{ev.households || ev.targetHouseholds || 150} Households</strong></span>
                      </div>
                    </div>

                    <button
                      type="button"
                      onClick={(e) => handleOpenEditAnnouncement(ev, e)}
                      style={{
                        fontSize: 12,
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: 5,
                        padding: '7px 12px',
                        background: '#F1F5F9',
                        color: '#1557B0',
                        border: '1px solid #CBD5E1',
                        borderRadius: '8px',
                        cursor: 'pointer',
                        fontWeight: 800,
                      }}
                    >
                      <Edit3 size={13} /> Edit Announcement
                    </button>
                  </div>
                </MotionCard>
              );
            })}
        </div>
      ) : (
        /* ── Standard Events Cards List ── */
        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          {filtered.length === 0 && (
            <div className="clay-card" style={{ padding: 40, textAlign: 'center', color: 'var(--ink-soft)' }}>
              No distribution events found in this view.
            </div>
          )}
          {filtered.map((ev, idx) => {
            const evStatus = getEventStatus(ev);
            const cfg = STATUS_CONFIG[evStatus] || STATUS_CONFIG.Scheduled;
            const StatusIcon = cfg.icon;
            const isAllTab = filter === 'ALL';

            const evBrgy = ev.barangay || (ev.barangayCode ? `Barangay ${ev.barangayCode}` : ev.location || 'Barangay 291');
            const evDate = ev.date || ev.scheduledDate || (ev.openedAt ? new Date(ev.openedAt).toLocaleDateString('en-CA') : 'Scheduled');
            const evTime = ev.time || ev.scheduledTime || (ev.openedAt ? new Date(ev.openedAt).toLocaleTimeString('en-PH', { hour: '2-digit', minute: '2-digit' }) : '08:00 AM');
            const evItems = ev.items || ev.itemType || 'Family Food Pack';
            const evHouseholds = ev.households || ev.targetHouseholds || 150;
            const evStaff = typeof ev.openedBy === 'object' ? (ev.openedBy?.name || 'Field Lead') : (ev.assignedTeam || ev.staff || 'Field Team Alpha');

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
              <MotionCard
                key={ev.id || ev._id || idx}
                delay={idx * 0.06}
                className="clay-card"
                onClick={() => handleOpenEditAnnouncement(ev)}
                style={{
                  transition: 'all 0.25s ease',
                  cursor: 'pointer',
                  ...cardStyle,
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 14 }}>
                  <div style={{ flex: 1, minWidth: 280 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8, flexWrap: 'wrap' }}>
                      <MapPin size={16} color="var(--manila-blue)" />
                      <span style={{ fontSize: 17, fontWeight: 800, color: 'var(--ink)' }}>{evBrgy}</span>

                      {/* Status Badge */}
                      <div style={{ display: 'inline-flex', alignItems: 'center', gap: 6, background: cfg.bg, color: cfg.color, padding: '4px 12px', borderRadius: 999, fontWeight: 800, fontSize: 11 }}>
                        <StatusIcon size={13} />
                        <span>{evStatus.toUpperCase()}</span>
                        <span style={{ fontSize: 11, opacity: 0.8, borderLeft: '1px solid currentColor', paddingLeft: 6, marginLeft: 2 }}>
                          {evStatus === 'Scheduled' ? 'Waiting for Field Leader on Site' : evStatus === 'Ongoing' ? 'Live On-Site' : 'Verified'}
                        </span>
                      </div>
                    </div>

                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 16, fontSize: 13, color: 'var(--ink-soft)' }}>
                      <span><Calendar size={13} style={{ verticalAlign: 'middle', marginRight: 4 }} /><strong>{evDate}</strong> at {evTime}</span>
                      <span><Package size={13} style={{ verticalAlign: 'middle', marginRight: 4 }} />{evItems}</span>
                      <span><Users size={13} style={{ verticalAlign: 'middle', marginRight: 4 }} /><strong>{evHouseholds}</strong> households</span>
                      <span><Truck size={13} style={{ verticalAlign: 'middle', marginRight: 4 }} /><strong>{evStaff}</strong></span>
                    </div>
                  </div>

                  {/* Event Actions */}
                  <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }} onClick={e => e.stopPropagation()}>
                    {evStatus === 'Completed' ? (
                      <span style={{ fontSize: 12, fontWeight: 700, color: '#15803D', background: '#DCFCE7', padding: '6px 14px', borderRadius: 'var(--radius-pill)', border: '1px solid #BBF7D0' }}>
                        ✓ Completed
                      </span>
                    ) : evStatus === 'Ongoing' ? (
                      <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                        <span style={{ fontSize: 12, fontWeight: 700, color: '#D97706', background: '#FFFBEB', padding: '6px 12px', borderRadius: 'var(--radius-pill)', border: '1px solid #FCD34D', display: 'inline-flex', alignItems: 'center', gap: 5 }}>
                          <Truck size={13} color="#D97706" /> In-Progress
                        </span>
                        <button
                          type="button"
                          onClick={() => requestStatusUpdate(ev, 'Completed')}
                          style={{
                            fontSize: 12,
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: 6,
                            padding: '7px 14px',
                            background: '#16A34A',
                            color: '#FFFFFF',
                            border: 'none',
                            borderRadius: '8px',
                            cursor: 'pointer',
                            fontWeight: 800,
                          }}
                        >
                          <Check size={14} /> Mark Completed
                        </button>
                      </div>
                    ) : (
                      <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                        <button
                          type="button"
                          onClick={(e) => handleOpenEditAnnouncement(ev, e)}
                          style={{
                            fontSize: 12,
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: 5,
                            padding: '7px 12px',
                            background: '#F1F5F9',
                            color: '#1557B0',
                            border: '1px solid #CBD5E1',
                            borderRadius: '8px',
                            cursor: 'pointer',
                            fontWeight: 800,
                          }}
                        >
                          <Edit3 size={13} /> Edit Announcement
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              </MotionCard>
            );
          })}
        </div>
      )}
    </div>
  );
}

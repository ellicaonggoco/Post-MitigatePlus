import React, { useState, useEffect, useContext } from 'react';
import { AuthContext } from '../context/AuthContext';
import { ROLES } from '../utils/roleUtils';
import ConfirmModal from '../components/ConfirmModal';
import { Megaphone, Plus, Send, Clock, Users, Globe, Edit3, Trash2, CheckCircle2, AlertCircle } from 'lucide-react';
import io from 'socket.io-client';
import { API_BASE_URL, SOCKET_URL } from '../config';
import { MotionCard, MotionButton, MotionBadge } from '../components/motion';

const MANILA_BARANGAYS = Array.from({ length: 897 }, (_, i) => ({
  code: String(i + 1),
  name: `Barangay ${i + 1}`
}));

export default function AnnouncementsPage() {
  const { user, token } = useContext(AuthContext);
  const role = user?.role;
  const isLguAdmin = role === ROLES.LGU_ADMIN;
  const isBarangay = role === ROLES.BARANGAY_OFFICIAL;
  const brgy = user?.barangayCode || '291';

  const [announcements, setAnnouncements] = useState([]);
  const [loading, setLoading] = useState(true);

  const fetchAnnouncements = async () => {
    setLoading(true);
    try {
      const res = await fetch(`${API_BASE_URL}/announcements`, {
        headers: { Authorization: 'Bearer ' + token, 'Content-Type': 'application/json' }
      });
      const data = await res.json();
      if (res.ok) {
        setAnnouncements(data.announcements || data || []);
      } else {
        setAnnouncements([]);
      }
    } catch (err) {
      setAnnouncements([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAnnouncements();

    const socket = io(SOCKET_URL);
    socket.on('new_announcement', () => {
      fetchAnnouncements();
    });
    socket.on('announcement_updated', () => {
      fetchAnnouncements();
    });
    socket.on('announcement_deleted', () => {
      fetchAnnouncements();
    });

    return () => socket.disconnect();
  }, [token]);

  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [form, setForm] = useState({
    title: '',
    body: '',
    scope: isBarangay ? 'barangay' : 'city-wide',
    targetBarangay: brgy,
    category: 'relief',
    isUrgent: false,
  });
  const [brgySearchInput, setBrgySearchInput] = useState(brgy);
  const [showBrgySuggestions, setShowBrgySuggestions] = useState(false);
  const [adminFilterBrgy, setAdminFilterBrgy] = useState('ALL');

  // Filter top 8 matching barangays dynamically as user types
  const matchingBarangays = MANILA_BARANGAYS.filter(b => {
    const q = brgySearchInput.toLowerCase().trim();
    return !q || b.code.includes(q) || b.name.toLowerCase().includes(q);
  }).slice(0, 8);

  // ── Confirmation Modal State ────────────────────────────────
  const [confirmModal, setConfirmModal] = useState({
    isOpen: false,
    title: '',
    message: '',
    type: 'warning',
    confirmText: 'Proceed',
    onConfirm: null,
  });

  const closeConfirm = () => setConfirmModal(prev => ({ ...prev, isOpen: false }));

  // Helper to map category to mobile target tab and tag
  const getCategoryMeta = (cat) => {
    switch (cat) {
      case 'relief':
        return { tag: 'Distribution Schedule', targetTab: 'request', actionText: 'Request' };
      case 'damage':
        return { tag: 'Advisory', targetTab: 'damage', actionText: 'Report' };
      case 'status':
        return { tag: 'Status Update', targetTab: 'history', actionText: 'View' };
      default:
        return { tag: 'Public Notice', targetTab: null, actionText: null };
    }
  };

  // ── Post New Announcement with confirmation ─────────────────
  const requestPost = () => {
    if (!form.title.trim() || !form.body.trim()) return;
    const targetScope = isBarangay ? 'barangay' : form.scope;
    const targetBarangayCode = isBarangay ? brgy : (targetScope === 'city-wide' ? 'City-Wide' : (form.targetBarangay || brgy));
    const targetBrgyName = targetScope === 'city-wide' ? 'buong lungsod (Lahat ng 897 Barangays)' : `Barangay ${targetBarangayCode} Residents Only`;
    const meta = getCategoryMeta(form.category);

    setConfirmModal({
      isOpen: true,
      title: 'I-post ang Anunsyo?',
      message: `Sigurado ka bang gusto mong i-post ang "${form.title}" para sa ${targetBrgyName}? Makatatanggap ang mga residente sa mobile app ng alert na may direct "${meta.actionText || 'View'}" action link.`,
      type: 'info',
      confirmText: 'Oo, I-post na',
      onConfirm: async () => {
        const payload = {
          title: form.title.trim(),
          body: form.body.trim(),
          barangay: targetScope === 'city-wide' ? 'City-Wide' : targetBarangayCode,
          barangayCode: targetScope === 'city-wide' ? null : targetBarangayCode,
          postedBy: isLguAdmin ? 'LGU Command Center' : `Hon. ${user?.name?.split(' ')[0] || 'Official'} (Brgy ${brgy})`,
          scope: targetScope,
          category: form.category,
          tag: meta.tag,
          targetTab: meta.targetTab,
          isUrgent: form.isUrgent,
        };
        
        try {
          const res = await fetch(`${API_BASE_URL}/announcements`, {
            method: 'POST',
            headers: { Authorization: 'Bearer ' + token, 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
          });
          if (res.ok) {
            fetchAnnouncements();
          }
        } catch (e) {
          console.error(e);
        }
        
        setForm({ title: '', body: '', scope: isBarangay ? 'barangay' : 'city-wide', targetBarangay: brgy, category: 'relief', isUrgent: false });
        setShowForm(false);
        closeConfirm();
      },
    });
  };

  // ── Edit Announcement with confirmation ──────────────────────
  const startEdit = (ann) => {
    setEditingId(ann._id || ann.id);
    const isAnnCityWide = !ann.barangayCode || ann.barangayCode === 'null' || ann.barangay === 'City-Wide' || ann.scope === 'city-wide';
    setForm({
      title: ann.title,
      body: ann.body,
      scope: isBarangay ? 'barangay' : (isAnnCityWide ? 'city-wide' : 'barangay'),
      category: ann.category || 'relief',
      isUrgent: !!ann.isUrgent,
      targetBarangay: isAnnCityWide ? '291' : (ann.barangayCode || ann.barangay || '291'),
    });
    setBrgySearchInput(isAnnCityWide ? '291' : (ann.barangayCode || ann.barangay || '291'));
    setShowForm(true);
  };

  const requestSaveEdit = () => {
    if (!form.title.trim() || !form.body.trim()) return;
    const targetScope = isBarangay ? 'barangay' : form.scope;
    const targetBarangayCode = isBarangay ? brgy : (targetScope === 'city-wide' ? 'City-Wide' : (form.targetBarangay || brgy));
    const meta = getCategoryMeta(form.category);

    setConfirmModal({
      isOpen: true,
      title: 'I-save ang Pagbabago?',
      message: 'Sigurado ka bang gusto mong baguhin ang anunsyong ito? Makikita ng mga residente ang "(Edited)" badge.',
      type: 'info',
      confirmText: 'Oo, Baguhin',
      onConfirm: async () => {
        const payload = {
          title: form.title.trim(),
          body: form.body.trim(),
          scope: targetScope,
          barangay: targetScope === 'city-wide' ? 'City-Wide' : targetBarangayCode,
          barangayCode: targetScope === 'city-wide' ? null : targetBarangayCode,
          category: form.category,
          tag: meta.tag,
          targetTab: meta.targetTab,
          isUrgent: form.isUrgent,
        };
        try {
          const res = await fetch(`${API_BASE_URL}/announcements/${editingId}`, {
            method: 'PUT',
            headers: { Authorization: 'Bearer ' + token, 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
          });
          if (res.ok) fetchAnnouncements();
        } catch(e) {}
        
        setEditingId(null);
        setForm({ title: '', body: '', scope: isBarangay ? 'barangay' : 'city-wide', targetBarangay: brgy, category: 'relief', isUrgent: false });
        setShowForm(false);
        closeConfirm();
      },
    });
  };

  // ── Delete Announcement with confirmation ────────────────────
  const requestDelete = (ann) => {
    setConfirmModal({
      isOpen: true,
      title: 'Burahin ang Anunsyo?',
      message: `Sigurado ka bang gusto mong burahin ang anunsyong "${ann.title}"? Hindi na ito makikita ng mga residente.`,
      type: 'danger',
      confirmText: 'Oo, Burahin',
      onConfirm: async () => {
        try {
          const res = await fetch(`${API_BASE_URL}/announcements/${ann.id || ann._id}`, {
            method: 'DELETE',
            headers: { Authorization: 'Bearer ' + token, 'Content-Type': 'application/json' }
          });
          if (res.ok) fetchAnnouncements();
        } catch(e) {}
        closeConfirm();
      },
    });
  };

  const visible = announcements.filter(a => {
    const code = String(a.barangayCode || a.barangay || '').trim();
    const isCityWide = !a.barangayCode || a.barangayCode === 'null' || a.barangay === 'City-Wide' || a.scope === 'city-wide';

    if (isBarangay) {
      // Barangay Official sees their own barangay posts + City-Wide LGU announcements
      return isCityWide || code === String(brgy).trim();
    }

    // LGU Admin / Superadmin
    if (adminFilterBrgy === 'CITY_WIDE') return isCityWide;
    if (adminFilterBrgy !== 'ALL') return code === adminFilterBrgy;
    return true;
  });

  return (
    <div className="page-container page-animate">
      {/* Universal Double Confirmation Modal */}
      <ConfirmModal
        isOpen={confirmModal.isOpen}
        title={confirmModal.title}
        message={confirmModal.message}
        type={confirmModal.type}
        confirmText={confirmModal.confirmText}
        onConfirm={confirmModal.onConfirm}
        onCancel={closeConfirm}
      />

      <div className="workflow-header" style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 28, flexWrap: 'wrap', gap: 16 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
          <div style={{ width: 48, height: 48, borderRadius: 'var(--radius-inner)', background: 'linear-gradient(135deg, #2563EB, #1D4ED8)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <Megaphone size={24} color="#fff" />
          </div>
          <div>
            <h1 className="section-header" style={{ margin: 0, fontSize: 22 }}>Announcements & Civic Alerts</h1>
            <p style={{ fontSize: 13, color: 'var(--ink-soft)', marginTop: 2 }}>
              {isBarangay ? `Send actionable announcements and emergency broadcasts for Barangay ${brgy}.` : 'Broadcast alerts with smart deep-linking across all 897 Manila Barangays.'}
            </p>
          </div>
        </div>
        <button
          onClick={() => {
            if (showForm) { setShowForm(false); setEditingId(null); setForm({ title: '', body: '', scope: 'city-wide', targetBarangay: '291', category: 'relief', isUrgent: false }); }
            else { setShowForm(true); }
          }}
          className="clay-button-primary"
          style={{ fontSize: 13, gap: 6 }}
        >
          <Plus size={15} /> {showForm ? 'Close Form' : 'New Announcement'}
        </button>
      </div>

      {showForm && (
        <div className="clay-card" style={{ marginBottom: 24, borderLeft: '4px solid var(--manila-blue)' }}>
          <h2 style={{ fontSize: 16, fontWeight: 800, marginBottom: 14, color: 'var(--ink)' }}>
            {editingId ? 'Edit Announcement' : 'Post Announcement with Smart Action Trigger'}
          </h2>
          <div style={{ marginBottom: 12 }}>
            <label style={{ fontSize: 11, fontWeight: 700, color: 'var(--ink-soft)', textTransform: 'uppercase', letterSpacing: '0.06em', display: 'block', marginBottom: 4 }}>Title</label>
            <input value={form.title} onChange={e => setForm(p => ({ ...p, title: e.target.value }))} placeholder="Announcement title..."
              style={{ width: '100%', padding: '9px 12px', borderRadius: 'var(--radius-inner)', border: '1px solid var(--border)', fontSize: 13, outline: 'none', background: 'var(--card)', color: 'var(--ink)', boxSizing: 'border-box' }} />
          </div>
          <div style={{ marginBottom: 12 }}>
            <label style={{ fontSize: 11, fontWeight: 700, color: 'var(--ink-soft)', textTransform: 'uppercase', letterSpacing: '0.06em', display: 'block', marginBottom: 4 }}>Message</label>
            <textarea value={form.body} onChange={e => setForm(p => ({ ...p, body: e.target.value }))} placeholder="Isulat ang mensahe para sa mga residente..." rows={4}
              style={{ width: '100%', padding: '9px 12px', borderRadius: 'var(--radius-inner)', border: '1px solid var(--border)', fontSize: 13, outline: 'none', background: 'var(--card)', color: 'var(--ink)', resize: 'vertical', fontFamily: 'var(--font-sans)', boxSizing: 'border-box' }} />
          </div>

          {/* Smart Mobile Action Trigger Selector */}
          <div style={{ marginBottom: 14 }}>
            <label style={{ fontSize: 11, fontWeight: 700, color: 'var(--ink-soft)', textTransform: 'uppercase', letterSpacing: '0.06em', display: 'block', marginBottom: 6 }}>
              Citizen Mobile Action Trigger (Deep-Link Button)
            </label>
            <select
              aria-label="Select Mobile Action Trigger"
              value={form.category}
              onChange={e => setForm(p => ({ ...p, category: e.target.value }))}
              style={{ width: '100%', padding: '9px 12px', borderRadius: 'var(--radius-inner)', border: '1.5px solid var(--manila-blue)', fontSize: 13, outline: 'none', background: 'var(--card)', color: 'var(--ink)', fontWeight: 700, cursor: 'pointer' }}
            >
              <option value="relief">Relief Pack Distribution — Displays 'Request' button on mobile</option>
              <option value="damage">Damage Assessment Survey — Displays 'Report' button on mobile</option>
              <option value="status">Household Verification / Claim Logs — Displays 'View' button on mobile</option>
              <option value="general">General Public Notice — Standard announcement (No action button)</option>
            </select>
            <p style={{ fontSize: 11.5, color: 'var(--ink-soft)', marginTop: 4 }}>
              Kapag na-post ito, magkakaroon ng 1-tap shortcut button ang mobile app ng mga residente patungo sa napiling feature.
            </p>
          </div>
          {/* Scope Selection */}
          {isBarangay ? (
            <div style={{ marginBottom: 16, padding: '12px 16px', background: 'var(--manila-blue-light)', border: '1.5px solid #BFDBFE', borderRadius: 'var(--radius-inner)', display: 'flex', alignItems: 'center', gap: 12 }}>
              <Users size={20} color="var(--manila-blue)" />
              <div>
                <div style={{ fontSize: 13, fontWeight: 800, color: 'var(--manila-blue)' }}>
                  Target Audience: Barangay {brgy} Residents Only
                </div>
                <div style={{ fontSize: 11.5, color: 'var(--ink-soft)', marginTop: 2 }}>
                  Awtomatikong naka-lock ang anunsyong ito para lamang sa mga residente ng Barangay {brgy}. Hindi ito makikita ng ibang mga barangay.
                </div>
              </div>
            </div>
          ) : (
            <div style={{ marginBottom: 16 }}>
              <label style={{ fontSize: 11, fontWeight: 700, color: 'var(--ink-soft)', textTransform: 'uppercase', letterSpacing: '0.06em', display: 'block', marginBottom: 6 }}>
                Announcement Scope & Target Audience
              </label>

              <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', alignItems: 'flex-start' }}>
                <select
                  aria-label="Select Announcement Scope"
                  value={form.scope}
                  onChange={e => setForm(p => ({ ...p, scope: e.target.value }))}
                  style={{ padding: '9px 14px', borderRadius: 'var(--radius-inner)', border: '1.5px solid var(--manila-blue)', fontSize: 13, outline: 'none', background: 'var(--card)', color: 'var(--ink)', cursor: 'pointer', fontWeight: 700, minWidth: 260 }}
                >
                  <option value="city-wide">City-Wide (Lahat ng 897 Barangays sa Maynila)</option>
                  <option value="barangay">Specific Barangay Only (Pumili ng Barangay)</option>
                </select>

                {/* Autocomplete Typeahead Search Box when 'Specific Barangay' is selected */}
                {form.scope === 'barangay' && (
                  <div style={{ position: 'relative', flex: 1, minWidth: 240 }}>
                    <input
                      type="text"
                      placeholder="I-type ang Barangay number (hal. 291, 653, 304)..."
                      value={brgySearchInput}
                      onFocus={() => setShowBrgySuggestions(true)}
                      onChange={(e) => {
                        setBrgySearchInput(e.target.value);
                        setForm(p => ({ ...p, targetBarangay: e.target.value }));
                        setShowBrgySuggestions(true);
                      }}
                      style={{ width: '100%', padding: '9px 12px', borderRadius: 'var(--radius-inner)', border: '1.5px solid #158A64', fontSize: 13, outline: 'none', background: 'var(--card)', color: 'var(--ink)', boxSizing: 'border-box', fontWeight: 700 }}
                    />

                    {/* Dynamic Suggestion Dropdown List */}
                    {showBrgySuggestions && matchingBarangays.length > 0 && (
                      <div style={{ position: 'absolute', top: '100%', left: 0, right: 0, marginTop: 4, background: 'var(--card)', border: '1px solid var(--border)', borderRadius: 'var(--radius-inner)', boxShadow: '0 10px 25px rgba(0,0,0,0.15)', zIndex: 9999, maxHeight: 220, overflowY: 'auto' }}>
                        <div style={{ padding: '6px 12px', fontSize: 10.5, fontWeight: 800, color: 'var(--ink-soft)', background: 'var(--sampaguita)', borderBottom: '1px solid var(--border)', textTransform: 'uppercase' }}>
                          Pumili ng Barangay na Makatatanggap
                        </div>
                        {matchingBarangays.map(b => (
                          <div
                            key={b.code}
                            onClick={() => {
                              setBrgySearchInput(b.code);
                              setForm(p => ({ ...p, targetBarangay: b.code }));
                              setShowBrgySuggestions(false);
                            }}
                            style={{ padding: '9px 14px', fontSize: 13, fontWeight: 700, color: 'var(--ink)', cursor: 'pointer', borderBottom: '1px solid var(--border)', transition: 'background 0.15s' }}
                            onMouseEnter={(e) => e.currentTarget.style.background = 'var(--sampaguita)'}
                            onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}
                          >
                            Barangay {b.code}
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>
          )}

          <div style={{ display: 'flex', gap: 10 }}>
            <button onClick={editingId ? requestSaveEdit : requestPost} className="clay-button-primary" style={{ fontSize: 13, gap: 6 }}>
              <Send size={14} /> {editingId ? 'Save Changes' : 'Post Announcement'}
            </button>
            <button onClick={() => { setShowForm(false); setEditingId(null); setForm({ title: '', body: '', scope: isBarangay ? 'barangay' : 'city-wide', targetBarangay: brgy, category: 'relief', isUrgent: false }); }} className="clay-button-ghost" style={{ fontSize: 13 }}>Cancel</button>
          </div>
        </div>
      )}

      {/* ── LGU Admin Scope Filter Bar ── */}
      {isLguAdmin && (
        <div style={{ display: 'flex', gap: 10, alignItems: 'center', marginBottom: 20, flexWrap: 'wrap' }}>
          <span style={{ fontSize: 12, fontWeight: 800, color: 'var(--ink-soft)', textTransform: 'uppercase' }}>Filter View:</span>
          <button
            onClick={() => setAdminFilterBrgy('ALL')}
            className={adminFilterBrgy === 'ALL' ? 'clay-button-primary' : 'clay-button-ghost'}
            style={{ fontSize: 12.5, padding: '6px 14px' }}
          >
            Lahat ng Anunsyo ({announcements.length})
          </button>
          <button
            onClick={() => setAdminFilterBrgy('CITY_WIDE')}
            className={adminFilterBrgy === 'CITY_WIDE' ? 'clay-button-primary' : 'clay-button-ghost'}
            style={{ fontSize: 12.5, padding: '6px 14px' }}
          >
            City-Wide Lamang
          </button>
        </div>
      )}

      <div style={{ display: 'grid', gap: 14 }}>
        {visible.length === 0 && !loading && (
          <div className="clay-card workflow-empty-state" style={{ textAlign: 'center', padding: '64px 40px' }}>
            <div style={{ width: 72, height: 72, borderRadius: '50%', background: 'rgba(37,99,235,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 20px' }}>
              <Megaphone size={36} color="var(--manila-blue)" />
            </div>
            <h3 style={{ fontSize: '20px', fontWeight: 700, color: 'var(--ink)', margin: '0 0 6px' }}>No Announcements</h3>
            <p style={{ fontSize: '14px', color: 'var(--ink-soft)' }}>There are no announcements matching your criteria.</p>
          </div>
        )}
        {visible.map((ann, idx) => {
          const isCityWide = !ann.barangayCode || ann.barangayCode === 'null' || ann.barangay === 'City-Wide' || ann.scope === 'city-wide';
          const authorName = typeof ann.postedBy === 'object' ? (ann.postedBy?.name || 'City Official') : (ann.postedBy || 'Command Center');
          const displayDate = ann.timestamp || (ann.postedAt ? new Date(ann.postedAt).toLocaleString('en-PH', { dateStyle: 'medium', timeStyle: 'short' }) : 'Recently');
          const brgyCodeVal = ann.barangayCode || ann.barangay;
          const brgyLabel = isCityWide ? 'City-Wide Broadcast' : `Barangay ${brgyCodeVal} Residents Only`;

          return (
            <MotionCard key={ann.id || ann._id || idx} delay={idx * 0.05} className="clay-card" style={{ borderLeft: `4.5px solid ${isCityWide ? '#7C3AED' : 'var(--manila-blue)'}` }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 10, marginBottom: 8 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                  {isCityWide ? <Globe size={16} color="#7C3AED" /> : <Users size={16} color="var(--manila-blue)" />}
                  <span style={{ fontSize: 16, fontWeight: 800, color: 'var(--ink)' }}>{ann.title}</span>
                  <span style={{
                    background: isCityWide ? '#F5F3FF' : '#EFF6FF',
                    color: isCityWide ? '#7C3AED' : '#1D4ED8',
                    border: isCityWide ? '1px solid #DDD6FE' : '1px solid #BFDBFE',
                    fontSize: 11,
                    fontWeight: 800,
                    padding: '3px 10px',
                    borderRadius: 999
                  }}>
                    {brgyLabel}
                  </span>
                  {ann.targetTab && (
                    <span style={{ background: '#E8F2FF', color: '#1557B0', border: '1px solid #BFDBFE', fontSize: 11, fontWeight: 800, padding: '3px 9px', borderRadius: 999 }}>
                      Mobile: {ann.targetTab === 'request' ? 'Request' : ann.targetTab === 'damage' ? 'Report' : 'View'}
                    </span>
                  )}
                  {ann.edited && (
                    <span style={{ background: '#FFFBEB', color: '#B45309', border: '1px solid rgba(217,119,6,0.3)', fontSize: 11, fontWeight: 800, padding: '3px 9px', borderRadius: 999 }}>
                      (Edited)
                    </span>
                  )}
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: 11, color: 'var(--ink-soft)' }}>
                    <Clock size={11} /> {displayDate}
                  </div>

                  {/* Edit & Delete Action Buttons */}
                  <div style={{ display: 'flex', gap: 6 }}>
                    <button
                      onClick={() => startEdit(ann)}
                      title="Edit Announcement"
                      className="clay-button-ghost"
                      style={{ fontSize: 11, padding: '4px 10px', gap: 4, height: 28 }}
                    >
                      <Edit3 size={12} /> Edit
                    </button>
                    <button
                      onClick={() => requestDelete(ann)}
                      title="Delete Announcement"
                      className="clay-button-danger"
                      style={{ fontSize: 11, padding: '4px 10px', gap: 4, height: 28 }}
                    >
                      <Trash2 size={12} /> Delete
                    </button>
                  </div>
                </div>
              </div>
              <p style={{ fontSize: 14, color: 'var(--ink)', lineHeight: 1.6, marginBottom: 8 }}>{ann.body}</p>
              <div style={{ fontSize: 12, color: 'var(--ink-soft)' }}>Posted by: <strong>{authorName}</strong></div>
            </MotionCard>
          );
        })}
      </div>
    </div>
  );
}

import React, { useState, useEffect, useContext } from 'react';
import { Warehouse, AlertTriangle, RefreshCw, PlusCircle, MinusCircle, History, PackageCheck, Send, Package, Droplet, HeartPulse, Sparkles, Home, Shirt, Wrench, ArrowUpRight, ArrowDownRight } from 'lucide-react';
import ConfirmModal from '../components/ConfirmModal';
import { AuthContext } from '../context/AuthContext';
import { API_BASE_URL } from '../config';
import { MotionCard, MotionButton } from '../components/motion';

const ITEM_ICONS = {
  1: Package,
  2: Droplet,
  3: HeartPulse,
  4: Sparkles,
  5: Home,
  6: Shirt,
  7: Wrench,
};



function StockBar({ stock, capacity, low }) {
  const pct = Math.min(100, Math.max(0, (stock / capacity) * 100));
  const isLow = stock <= low;
  const color = isLow ? '#DC2626' : stock / capacity < 0.4 ? '#D97706' : '#158A64';
  return (
    <div style={{ marginTop: 8 }}>
      <div style={{ height: 8, background: 'var(--border)', borderRadius: 4, overflow: 'hidden' }}>
        <div style={{ height: '100%', width: `${pct}%`, background: color, borderRadius: 4, transition: 'width 0.4s ease' }} />
      </div>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 4, fontSize: 11, color: 'var(--ink-soft)' }}>
        <span style={{ color, fontWeight: 700 }}>{stock.toLocaleString()}</span>
        <span>Capacity: {capacity.toLocaleString()}</span>
      </div>
    </div>
  );
}

export default function WarehouseInventory() {
  const { token } = useContext(AuthContext);
  const [inventory, setInventory] = useState([]);
  const [logs, setLogs] = useState([]);

  const fetchInventory = async () => {
    try {
      const [invRes, logsRes] = await Promise.all([
        fetch(`${API_BASE_URL}/warehouse`, { headers: { Authorization: 'Bearer ' + token, 'Content-Type': 'application/json' } }),
        fetch(`${API_BASE_URL}/warehouse/logs`, { headers: { Authorization: 'Bearer ' + token, 'Content-Type': 'application/json' } }),
      ]);
      if (invRes.ok) {
        const invData = await invRes.json();
        setInventory(invData);
      }
      if (logsRes.ok) {
        const logsData = await logsRes.json();
        setLogs(logsData);
      }
    } catch (e) {
      console.error(e);
    }
  };

  useEffect(() => {
    if (token) fetchInventory();
  }, [token]);

  // Modal State for Adding/Deducting Stock
  const [selectedItem, setSelectedItem] = useState(null);
  const [actionType, setActionType] = useState('restock'); // 'restock' | 'dispatch'
  const [qtyInput, setQtyInput] = useState('');
  const [noteInput, setNoteInput] = useState('');

  // Confirmation Modal State
  const [confirmModal, setConfirmModal] = useState({ isOpen: false, data: null });

  const lowItems = inventory.filter(i => i.stock <= i.low);

  const openActionForm = (item, type) => {
    setSelectedItem(item);
    setActionType(type);
    setQtyInput('');
    setNoteInput('');
  };

  const handleRequestSubmit = () => {
    const qty = parseInt(qtyInput, 10);
    if (!selectedItem || isNaN(qty) || qty <= 0) return;

    if (actionType === 'dispatch' && qty > selectedItem.stock) {
      setConfirmModal({
        isOpen: true,
        title: 'Insufficient Stock',
        message: `Hindi kasya ang stock! Meron lang ${selectedItem.stock} ${selectedItem.unit} na available.`,
        type: 'warning',
        data: null
      });
      return;
    }

    const actionText = actionType === 'restock' ? 'Magdagdag (+)' : 'Magbawas / I-dispatch (-)';
    const noteText = noteInput.trim() ? ` (${noteInput.trim()})` : '';

    setConfirmModal({
      isOpen: true,
      data: {
        item: selectedItem,
        type: actionType,
        qty,
        note: noteInput.trim() || (actionType === 'restock' ? 'New Stock Arrival' : 'Relief Event Dispatch'),
      },
      title: `${actionText} ng Stock?`,
      message: `Sigurado ka bang gusto mong ${actionType === 'restock' ? 'magdagdag ng +' : 'magbawas ng -'}${qty} ${selectedItem.unit} sa "${selectedItem.item}"${noteText}?`,
      type: actionType === 'restock' ? 'success' : 'warning',
    });
  };

  const executeStockChange = async () => {
    if (!confirmModal.data) {
      setConfirmModal({ isOpen: false, data: null });
      return;
    }
    const { item, type, qty, note } = confirmModal.data;
    const endpoint = type === 'restock' ? `${API_BASE_URL}/warehouse/${item.id || item._id}/restock` : `${API_BASE_URL}/warehouse/${item.id || item._id}/dispatch`;

    try {
      const res = await fetch(endpoint, {
        method: 'POST',
        headers: { Authorization: 'Bearer ' + token, 'Content-Type': 'application/json' },
        body: JSON.stringify({ qty, note })
      });
      if (res.ok) {
        fetchInventory();
      }
    } catch (e) {
      console.error(e);
    }

    setSelectedItem(null);
    setConfirmModal({ isOpen: false, data: null });
  };

  return (
    <div className="page-container page-animate">
      {/* Universal Double Confirmation Modal */}
      <ConfirmModal
        isOpen={confirmModal.isOpen}
        title={confirmModal.title}
        message={confirmModal.message}
        type={confirmModal.type}
        confirmText={confirmModal.data?.type === 'restock' ? 'Oo, Dagdagan' : 'Oo, Bawasan'}
        onConfirm={executeStockChange}
        onCancel={() => setConfirmModal({ isOpen: false, data: null })}
      />

      <div className="workflow-header" style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 28, flexWrap: 'wrap', gap: 16 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
          <div style={{ width: 48, height: 48, borderRadius: 'var(--radius-inner)', background: 'linear-gradient(135deg, #7C3AED, #6D28D9)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <Warehouse size={24} color="#fff" />
          </div>
          <div>
            <h1 className="section-header" style={{ margin: 0, fontSize: 22 }}>Relief Warehouse Inventory</h1>
            <p style={{ fontSize: 13, color: 'var(--ink-soft)', marginTop: 2 }}>Live stock tracking, incoming shipments, and distribution dispatches.</p>
          </div>
        </div>
        <button
          onClick={fetchInventory}
          className="clay-button-ghost"
          style={{ fontSize: 13, gap: 6 }}
        >
          <RefreshCw size={14} /> Sync Stock Levels
        </button>
      </div>

      {/* Low Stock Warning Alert */}
      {lowItems.length > 0 && (
        <div style={{ background: '#FEF2F2', border: '1.5px solid rgba(220,38,38,0.25)', borderLeft: '4px solid #DC2626', borderRadius: 'var(--radius-inner)', padding: '14px 18px', marginBottom: 24, display: 'flex', alignItems: 'flex-start', gap: 10 }}>
          <AlertTriangle size={18} color="#DC2626" style={{ flexShrink: 0, marginTop: 2 }} />
          <div>
            <strong style={{ color: '#9C3B32', fontSize: 14 }}>Low Stock Warning Alert!</strong>
            <p style={{ fontSize: 13, color: '#9C3B32', marginTop: 2 }}>
              {lowItems.map(i => i.item).join(', ')} {lowItems.length === 1 ? 'is' : 'are'} at or below minimum threshold. Please restock immediately.
            </p>
          </div>
        </div>
      )}

      {/* Action Form Panel for Restocking / Dispatching Stock */}
      {selectedItem && (
        <div className="clay-card" style={{ marginBottom: 24, borderLeft: `4px solid ${actionType === 'restock' ? 'var(--bay-teal)' : '#DC2626'}` }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
            <h3 style={{ fontSize: 16, fontWeight: 800, color: 'var(--ink)', margin: 0 }}>
              {actionType === 'restock' ? '➕ Receive Incoming Stock' : '➖ Dispatch Stock for Relief'} — {selectedItem.item}
            </h3>
            <span style={{ fontSize: 12, color: 'var(--ink-soft)' }}>
              Current Stock: <strong>{selectedItem.stock.toLocaleString()} {selectedItem.unit}</strong>
            </span>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 2fr', gap: 14, marginBottom: 14 }}>
            <div>
              <label style={{ fontSize: 11, fontWeight: 700, color: 'var(--ink-soft)', textTransform: 'uppercase', letterSpacing: '0.06em', display: 'block', marginBottom: 4 }}>
                Quantity ({selectedItem.unit})
              </label>
              <input
                type="number"
                min="1"
                value={qtyInput}
                onChange={e => setQtyInput(e.target.value)}
                placeholder="e.g. 500"
                style={{ width: '100%', padding: '9px 12px', borderRadius: 'var(--radius-inner)', border: '1px solid var(--border)', fontSize: 14, outline: 'none', background: 'var(--card)', color: 'var(--ink)', boxSizing: 'border-box' }}
              />
            </div>
            <div>
              <label style={{ fontSize: 11, fontWeight: 700, color: 'var(--ink-soft)', textTransform: 'uppercase', letterSpacing: '0.06em', display: 'block', marginBottom: 4 }}>
                Reference / Source Note
              </label>
              <input
                value={noteInput}
                onChange={e => setNoteInput(e.target.value)}
                placeholder={actionType === 'restock' ? 'e.g. DSWD Batch #4 Shipment / Donor Name' : 'e.g. Dispatched for Barangay 291 Distribution Event'}
                style={{ width: '100%', padding: '9px 12px', borderRadius: 'var(--radius-inner)', border: '1px solid var(--border)', fontSize: 13, outline: 'none', background: 'var(--card)', color: 'var(--ink)', boxSizing: 'border-box' }}
              />
            </div>
          </div>

          <div style={{ display: 'flex', gap: 10 }}>
            <button
              onClick={handleRequestSubmit}
              className={actionType === 'restock' ? 'clay-button-approve' : 'clay-button-danger'}
              style={{ fontSize: 13, gap: 6 }}
            >
              {actionType === 'restock' ? <PackageCheck size={15} /> : <Send size={15} />}
              {actionType === 'restock' ? 'Update & Restock (+)' : 'Confirm Dispatch (-)'}
            </button>
            <button onClick={() => setSelectedItem(null)} className="clay-button-ghost" style={{ fontSize: 13 }}>
              Cancel
            </button>
          </div>
        </div>
      )}

      {/* Inventory Item Cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: 16, marginBottom: 32 }}>
        {inventory.map((item, idx) => {
          const isLow = item.stock <= item.low;
          const pct = Math.round((item.stock / item.capacity) * 100);
          const ItemIcon = ITEM_ICONS[item.id] || Package;

          return (
            <MotionCard key={item.id || idx} delay={idx * 0.05} className="clay-card" style={{ borderTop: `3px solid ${isLow ? '#DC2626' : item.stock / item.capacity < 0.4 ? '#D97706' : '#158A64'}` }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 8 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  <div style={{ width: 36, height: 36, borderRadius: 'var(--radius-inner)', background: 'var(--sampaguita)', border: '1px solid var(--border)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <ItemIcon size={20} color="var(--manila-blue)" />
                  </div>
                  <div>
                    <div style={{ fontSize: 14, fontWeight: 700, color: 'var(--ink)' }}>{item.item}</div>
                    <div style={{ fontSize: 11, color: 'var(--ink-soft)', marginTop: 2 }}>Central Storage Facility</div>
                  </div>
                </div>
                {isLow && <span style={{ background: '#FEF2F2', color: '#DC2626', fontSize: 11, fontWeight: 800, padding: '3px 8px', borderRadius: 999, whiteSpace: 'nowrap' }}>LOW STOCK</span>}
              </div>

              <div style={{ fontSize: 32, fontWeight: 900, color: isLow ? '#DC2626' : 'var(--ink)', lineHeight: 1.1, margin: '8px 0' }}>
                {item.stock.toLocaleString()}
                <span style={{ fontSize: 13, fontWeight: 500, color: 'var(--ink-soft)', marginLeft: 6 }}>{item.unit}</span>
              </div>

              <StockBar stock={item.stock} capacity={item.capacity} low={item.low} />

              <div style={{ marginTop: 12, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div style={{ fontSize: 11, color: 'var(--ink-soft)' }}>
                  {pct}% of capacity &nbsp;·&nbsp; Min: {item.low}
                </div>

                {/* Stock Controls */}
                <div style={{ display: 'flex', gap: 6 }}>
                  <button
                    onClick={() => openActionForm(item, 'restock')}
                    title="Add Stock (+)"
                    aria-label={`Add stock for ${item.item}`}
                    className="clay-button-approve"
                    style={{ fontSize: 11, padding: '4px 8px', gap: 4, height: 26 }}
                  >
                    <PlusCircle size={12} /> + Add
                  </button>
                  <button
                    onClick={() => openActionForm(item, 'dispatch')}
                    title="Dispatch Stock (-)"
                    aria-label={`Dispatch stock for ${item.item}`}
                    className="clay-button-danger"
                    style={{ fontSize: 11, padding: '4px 8px', gap: 4, height: 26 }}
                  >
                    <MinusCircle size={12} /> - Dispatch
                  </button>
                </div>
              </div>
            </MotionCard>
          );
        })}
      </div>

      {/* Inventory Audit Trail & Log History */}
      <div className="clay-card" style={{ padding: 20 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 16 }}>
          <History size={18} color="var(--manila-blue)" />
          <h2 style={{ fontSize: 16, fontWeight: 800, color: 'var(--ink)', margin: 0 }}>Stock Movement & Audit History</h2>
        </div>

        <table className="clay-table">
          <thead>
            <tr>
              <th>Timestamp</th>
              <th>Item</th>
              <th>Movement Type</th>
              <th>Quantity</th>
              <th>Remaining Stock</th>
              <th>Reference / Notes</th>
            </tr>
          </thead>
          <tbody>
            {logs.map(log => (
              <tr key={log.id || log._id}>
                <td style={{ fontSize: 12, color: 'var(--ink-soft)' }}>{log.time || new Date(log.timestamp || log.createdAt).toLocaleString()}</td>
                <td style={{ fontWeight: 700, color: 'var(--ink)' }}>{log.item || log.itemName}</td>
                <td>
                  {log.type === 'restock' ? (
                    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4, background: 'rgba(21,138,100,0.1)', color: '#047857', fontSize: 11, fontWeight: 800, padding: '3px 8px', borderRadius: 999 }}>
                      <ArrowUpRight size={12} /> Restock (+)
                    </span>
                  ) : (
                    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4, background: '#FEF2F2', color: '#991B1B', fontSize: 11, fontWeight: 800, padding: '3px 8px', borderRadius: 999 }}>
                      <ArrowDownRight size={12} /> Dispatch (-)
                    </span>
                  )}
                </td>
                <td style={{ fontWeight: 800, color: log.type === 'restock' ? '#047857' : '#991B1B' }}>
                  {log.type === 'restock' ? `+${log.qty}` : `-${log.qty}`}
                </td>
                <td style={{ fontWeight: 700, color: 'var(--ink)' }}>{log.updatedStock ? log.updatedStock.toLocaleString() : '-'}</td>
                <td style={{ fontSize: 12, color: 'var(--ink-soft)' }}>{log.note}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

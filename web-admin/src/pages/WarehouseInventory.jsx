import React, { useState, useEffect, useContext } from 'react';
import { Warehouse, AlertTriangle, RefreshCw, PlusCircle, MinusCircle, History, PackageCheck, Send, Package, Droplet, HeartPulse, Sparkles, Home, Shirt, Wrench, ArrowUpRight, ArrowDownRight, Truck, FileText, UserCheck, Building } from 'lucide-react';
import ConfirmModal from '../components/ConfirmModal';
import { AuthContext } from '../context/AuthContext';
import { API_BASE_URL } from '../config';
import { MotionCard } from '../components/motion';

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
  const { token, user } = useContext(AuthContext);
  const [inventory, setInventory] = useState([]);
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);

  const fetchInventory = async () => {
    try {
      setLoading(true);
      const [invRes, logsRes] = await Promise.all([
        fetch(`${API_BASE_URL}/warehouse`, { headers: { Authorization: 'Bearer ' + token, 'Content-Type': 'application/json' } }),
        fetch(`${API_BASE_URL}/warehouse/logs`, { headers: { Authorization: 'Bearer ' + token, 'Content-Type': 'application/json' } }),
      ]);
      if (invRes.ok) {
        const invData = await invRes.json();
        setInventory(invData || []);
      }
      if (logsRes.ok) {
        const logsData = await logsRes.json();
        setLogs(logsData || []);
      }
    } catch (e) {
      console.error('Failed to fetch warehouse inventory:', e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (token) fetchInventory();
  }, [token]);

  // Modal State for Adding/Deducting Stock
  const [selectedItem, setSelectedItem] = useState(null);
  const [actionType, setActionType] = useState('restock'); // 'restock' | 'dispatch'
  const [formState, setFormState] = useState({
    qty: '',
    purpose: '',
    destination: '',
    approvingOfficial: '',
    transporter: '',
    referenceNo: '',
    notes: '',
  });

  // Confirmation Modal State
  const [confirmModal, setConfirmModal] = useState({ isOpen: false, data: null });

  const lowItems = inventory.filter(i => (i.stock || 0) <= (i.minStock || i.low || 100));

  const openActionForm = (item, type) => {
    setSelectedItem(item);
    setActionType(type);
    setFormState({
      qty: '',
      purpose: type === 'restock' ? 'DSWD Central Office Delivery' : 'Emergency Inter-Agency Transfer',
      destination: type === 'restock' ? 'Central Warehouse Storage' : 'Ospital ng Maynila Medical Ward',
      approvingOfficial: user?.name || 'MDRRMO Logistics Head',
      transporter: type === 'restock' ? 'DSWD Logistics Carrier #4' : 'LGU Emergency Transport Unit #2',
      referenceNo: `DR-${new Date().getFullYear()}-${String(Math.floor(1000 + Math.random() * 9000))}`,
      notes: '',
    });
  };

  const handleRequestSubmit = () => {
    const qty = parseInt(formState.qty, 10);
    if (!selectedItem || isNaN(qty) || qty <= 0) return;

    if (actionType === 'dispatch' && qty > selectedItem.stock) {
      setConfirmModal({
        isOpen: true,
        title: 'Insufficient Warehouse Stock',
        message: `Cannot dispatch! Only ${selectedItem.stock} ${selectedItem.unit || 'units'} currently available in storage.`,
        type: 'warning',
        data: null
      });
      return;
    }

    const actionText = actionType === 'restock' ? 'Receive Incoming Stock (+)' : 'Dispatch Warehouse Stock (-)';
    const noteText = formState.notes.trim() ? ` (${formState.notes.trim()})` : '';

    setConfirmModal({
      isOpen: true,
      data: {
        item: selectedItem,
        type: actionType,
        ...formState,
        qty,
      },
      title: `${actionText}?`,
      message: `Are you sure you want to ${actionType === 'restock' ? 'add +' : 'deduct -'}${qty.toLocaleString()} ${selectedItem.unit || 'units'} for "${selectedItem.name || selectedItem.item}" for "${formState.purpose}" at ${formState.destination}${noteText}?`,
      type: actionType === 'restock' ? 'success' : 'warning',
    });
  };

  const executeStockChange = async () => {
    if (!confirmModal.data) {
      setConfirmModal({ isOpen: false, data: null });
      return;
    }
    const data = confirmModal.data;
    const endpoint = data.type === 'restock' ? `${API_BASE_URL}/warehouse/${data.item.id || data.item._id}/restock` : `${API_BASE_URL}/warehouse/${data.item.id || data.item._id}/dispatch`;

    try {
      const res = await fetch(endpoint, {
        method: 'POST',
        headers: { Authorization: 'Bearer ' + token, 'Content-Type': 'application/json' },
        body: JSON.stringify({
          quantity: Number(data.qty),
          qty: Number(data.qty),
          purpose: data.purpose,
          destination: data.destination,
          approvingOfficial: data.approvingOfficial,
          transporter: data.transporter,
          referenceNo: data.referenceNo,
          notes: data.notes || '',
          note: data.notes || '',
        })
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
        confirmText={confirmModal.data?.type === 'restock' ? 'Confirm Restock' : 'Confirm Dispatch'}
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
            <p style={{ fontSize: 13, color: 'var(--ink-soft)', marginTop: 2 }}>Live stock tracking, incoming shipments, and authorized distribution dispatches.</p>
          </div>
        </div>
        <button
          onClick={fetchInventory}
          className="clay-button-ghost"
          style={{ fontSize: 13, gap: 6 }}
        >
          <RefreshCw size={14} className={loading ? 'animate-spin' : ''} /> Sync Stock Levels
        </button>
      </div>

      {/* Low Stock Warning Alert */}
      {lowItems.length > 0 && (
        <div style={{ background: '#FEF2F2', border: '1.5px solid rgba(220,38,38,0.25)', borderLeft: '4px solid #DC2626', borderRadius: 'var(--radius-inner)', padding: '14px 18px', marginBottom: 24, display: 'flex', alignItems: 'flex-start', gap: 10 }}>
          <AlertTriangle size={18} color="#DC2626" style={{ flexShrink: 0, marginTop: 2 }} />
          <div>
            <strong style={{ color: '#9C3B32', fontSize: 14 }}>Low Stock Warning Alert!</strong>
            <p style={{ fontSize: 13, color: '#9C3B32', marginTop: 2 }}>
              {lowItems.map(i => i.name || i.item).join(', ')} {lowItems.length === 1 ? 'is' : 'are'} at or below minimum threshold. Please request replenishment immediately.
            </p>
          </div>
        </div>
      )}

      {/* Action Form Panel for Restocking / Dispatching Stock with Complete Audit Fields */}
      {selectedItem && (
        <div className="clay-card" style={{ marginBottom: 24, borderLeft: `4px solid ${actionType === 'restock' ? '#158A64' : '#DC2626'}`, position: 'relative', zIndex: 1000 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
            <h3 style={{ fontSize: 16, fontWeight: 800, color: 'var(--ink)', margin: 0, display: 'flex', alignItems: 'center', gap: 8 }}>
              {actionType === 'restock' ? <PackageCheck size={18} color="#158A64" /> : <Send size={18} color="#DC2626" />}
              {actionType === 'restock' ? 'Receive Incoming Stock' : 'Authorized Warehouse Dispatch'} — {selectedItem.name || selectedItem.item}
            </h3>
            <span style={{ fontSize: 12, color: 'var(--ink-soft)' }}>
              Current Available: <strong>{selectedItem.stock.toLocaleString()} {selectedItem.unit}</strong>
            </span>
          </div>

          {/* Grid of structured input fields */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: 14, marginBottom: 14 }}>
            {/* Quantity */}
            <div>
              <label style={{ fontSize: 11, fontWeight: 700, color: 'var(--ink-soft)', textTransform: 'uppercase', letterSpacing: '0.06em', display: 'block', marginBottom: 4 }}>
                Quantity ({selectedItem.unit}) *
              </label>
              <input
                type="number"
                min="1"
                value={formState.qty}
                onChange={e => setFormState(p => ({ ...p, qty: e.target.value }))}
                placeholder="e.g. 500"
                style={{ width: '100%', padding: '9px 12px', borderRadius: 'var(--radius-inner)', border: '1px solid var(--border)', fontSize: 13, outline: 'none', background: 'var(--card)', color: 'var(--ink)', boxSizing: 'border-box', fontWeight: 800 }}
                required
              />
            </div>

            {/* Purpose / Category */}
            <div>
              <label style={{ fontSize: 11, fontWeight: 700, color: 'var(--ink-soft)', textTransform: 'uppercase', letterSpacing: '0.06em', display: 'block', marginBottom: 4 }}>
                Purpose / Category *
              </label>
              <select
                value={formState.purpose}
                onChange={e => setFormState(p => ({ ...p, purpose: e.target.value }))}
                style={{ width: '100%', padding: '9px 12px', borderRadius: 'var(--radius-inner)', border: '1px solid var(--border)', fontSize: 13, outline: 'none', background: 'var(--card)', color: 'var(--ink)', boxSizing: 'border-box', fontWeight: 700 }}
              >
                {actionType === 'dispatch' ? (
                  <>
                    <option value="Emergency Inter-Agency Transfer">Emergency Inter-Agency Transfer (Red Cross, DOH, Hospital)</option>
                    <option value="Evacuation Center Urgent Augmentation">Evacuation Center Urgent Augmentation (Flood / Fire)</option>
                    <option value="Special Direct Household Assistance">Special Direct Household Assistance (Door-to-Door Relief)</option>
                    <option value="Damaged / Expired Goods Write-off">Damaged / Expired Goods Write-off (COA Inspected & Discarded)</option>
                    <option value="Relief Distribution Dispatch">Relief Distribution Dispatch</option>
                  </>
                ) : (
                  <>
                    <option value="DSWD Central Office Delivery">DSWD Central Office Delivery</option>
                    <option value="LGU Emergency Procurement">LGU Emergency Procurement</option>
                    <option value="Private Donor / NGO Donation">Private Donor / NGO Donation</option>
                    <option value="Warehouse Audit Reconciliation">Warehouse Audit Reconciliation</option>
                  </>
                )}
              </select>
            </div>

            {/* Destination or Source */}
            <div>
              <label style={{ fontSize: 11, fontWeight: 700, color: 'var(--ink-soft)', textTransform: 'uppercase', letterSpacing: '0.06em', display: 'block', marginBottom: 4 }}>
                {actionType === 'dispatch' ? 'Destination / Recipient Facility *' : 'Source Supplier / Donor *'}
              </label>
              <input
                value={formState.destination}
                onChange={e => setFormState(p => ({ ...p, destination: e.target.value }))}
                placeholder={actionType === 'dispatch' ? 'e.g. Ospital ng Maynila / Brgy 291 Evac Center' : 'e.g. DSWD Region NCR / Red Cross Hub'}
                style={{ width: '100%', padding: '9px 12px', borderRadius: 'var(--radius-inner)', border: '1px solid var(--border)', fontSize: 13, outline: 'none', background: 'var(--card)', color: 'var(--ink)', boxSizing: 'border-box' }}
              />
            </div>

            {/* Approving Official */}
            <div>
              <label style={{ fontSize: 11, fontWeight: 700, color: 'var(--ink-soft)', textTransform: 'uppercase', letterSpacing: '0.06em', display: 'block', marginBottom: 4 }}>
                Approving Official *
              </label>
              <input
                value={formState.approvingOfficial}
                onChange={e => setFormState(p => ({ ...p, approvingOfficial: e.target.value }))}
                placeholder="e.g. City DRRM Officer / Administrator"
                style={{ width: '100%', padding: '9px 12px', borderRadius: 'var(--radius-inner)', border: '1px solid var(--border)', fontSize: 13, outline: 'none', background: 'var(--card)', color: 'var(--ink)', boxSizing: 'border-box' }}
              />
            </div>

            {/* Transporter / Vehicle */}
            <div>
              <label style={{ fontSize: 11, fontWeight: 700, color: 'var(--ink-soft)', textTransform: 'uppercase', letterSpacing: '0.06em', display: 'block', marginBottom: 4 }}>
                Transporter / Vehicle Plate No.
              </label>
              <input
                value={formState.transporter}
                onChange={e => setFormState(p => ({ ...p, transporter: e.target.value }))}
                placeholder="e.g. LGU Transport Unit #3 / Plate ABC-1234"
                style={{ width: '100%', padding: '9px 12px', borderRadius: 'var(--radius-inner)', border: '1px solid var(--border)', fontSize: 13, outline: 'none', background: 'var(--card)', color: 'var(--ink)', boxSizing: 'border-box' }}
              />
            </div>

            {/* Reference Document / DR Number */}
            <div>
              <label style={{ fontSize: 11, fontWeight: 700, color: 'var(--ink-soft)', textTransform: 'uppercase', letterSpacing: '0.06em', display: 'block', marginBottom: 4 }}>
                Reference DR / PO / Waybill #
              </label>
              <input
                value={formState.referenceNo}
                onChange={e => setFormState(p => ({ ...p, referenceNo: e.target.value }))}
                placeholder="e.g. DR-2026-089 / PO-4412"
                style={{ width: '100%', padding: '9px 12px', borderRadius: 'var(--radius-inner)', border: '1px solid var(--border)', fontSize: 13, outline: 'none', background: 'var(--card)', color: 'var(--ink)', boxSizing: 'border-box' }}
              />
            </div>
          </div>

          {/* Notes */}
          <div style={{ marginBottom: 16 }}>
            <label style={{ fontSize: 11, fontWeight: 700, color: 'var(--ink-soft)', textTransform: 'uppercase', letterSpacing: '0.06em', display: 'block', marginBottom: 4 }}>
              Additional Audit Notes & Remarks
            </label>
            <input
              value={formState.notes}
              onChange={e => setFormState(p => ({ ...p, notes: e.target.value }))}
              placeholder="e.g. Verified by on-duty warehouse inspector. Dispatched via emergency protocol."
              style={{ width: '100%', padding: '9px 12px', borderRadius: 'var(--radius-inner)', border: '1px solid var(--border)', fontSize: 13, outline: 'none', background: 'var(--card)', color: 'var(--ink)', boxSizing: 'border-box' }}
            />
          </div>

          <div style={{ display: 'flex', gap: 10 }}>
            <button
              onClick={handleRequestSubmit}
              className={actionType === 'restock' ? 'clay-button-approve' : 'clay-button-danger'}
              style={{ fontSize: 13, gap: 6 }}
            >
              {actionType === 'restock' ? <PackageCheck size={15} /> : <Send size={15} />}
              {actionType === 'restock' ? 'Record & Receive Stock (+)' : 'Authorize & Confirm Dispatch (-)'}
            </button>
            <button onClick={() => setSelectedItem(null)} className="clay-button-ghost" style={{ fontSize: 13 }}>
              Cancel
            </button>
          </div>
        </div>
      )}

      {/* Inventory Item Cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: 16, marginBottom: 32 }}>
        {inventory.length === 0 ? (
          <div className="clay-card" style={{ gridColumn: '1 / -1', textAlign: 'center', padding: '48px 24px' }}>
            <Warehouse size={36} color="var(--manila-blue)" style={{ margin: '0 auto 12px' }} />
            <h3 style={{ fontSize: '16px', fontWeight: 800, color: 'var(--ink)', margin: '0 0 4px' }}>
              {loading ? 'Loading Warehouse Inventory...' : 'No Warehouse Inventory Items Found'}
            </h3>
            <p style={{ fontSize: '13px', color: 'var(--ink-soft)', margin: '0 0 16px' }}>
              {loading ? 'Syncing stock levels with Central Storage Facility...' : 'Click below to reload and initialize standard city relief supplies.'}
            </p>
            {!loading && (
              <button
                onClick={fetchInventory}
                className="clay-button-primary"
                style={{ fontSize: 13, padding: '8px 16px', gap: 6, margin: '0 auto' }}
              >
                <RefreshCw size={14} /> Initialize / Refresh Central Supplies
              </button>
            )}
          </div>
        ) : (
          inventory.map((item, idx) => {
            const itemName = item.name || item.item || 'Relief Item';
            const itemStock = Number(item.stock || 0);
            const itemUnit = item.unit || 'packs';
            const itemMin = Number(item.minStock || item.low || 100);
            const itemCapacity = Number(item.capacity || (itemMin * 5) || 5000);
            const isLow = itemStock <= itemMin;
            const pct = Math.min(100, Math.round((itemStock / itemCapacity) * 100));
            const ItemIcon = ITEM_ICONS[item.id] || ITEM_ICONS[idx + 1] || Package;

            return (
              <MotionCard key={item._id || item.id || idx} delay={idx * 0.05} className="clay-card" style={{ borderTop: `3.5px solid ${isLow ? '#DC2626' : pct < 35 ? '#D97706' : '#158A64'}` }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 8 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                    <div style={{ width: 38, height: 38, borderRadius: 'var(--radius-inner)', background: 'var(--sampaguita)', border: '1px solid var(--border)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                      <ItemIcon size={20} color="var(--manila-blue)" />
                    </div>
                    <div>
                      <div style={{ fontSize: 14.5, fontWeight: 800, color: 'var(--ink)' }}>{itemName}</div>
                      <div style={{ fontSize: 11, color: 'var(--ink-soft)', marginTop: 2 }}>{item.category || 'Core Relief'} • Central Warehouse</div>
                    </div>
                  </div>
                  {isLow && <span style={{ background: '#FEF2F2', color: '#DC2626', fontSize: 10.5, fontWeight: 800, padding: '3px 8px', borderRadius: 999, whiteSpace: 'nowrap' }}>LOW STOCK</span>}
                </div>

                <div style={{ fontSize: 30, fontWeight: 900, color: isLow ? '#DC2626' : 'var(--ink)', lineHeight: 1.1, margin: '10px 0 6px' }}>
                  {itemStock.toLocaleString()}
                  <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--ink-soft)', marginLeft: 6 }}>{itemUnit}</span>
                </div>

                <StockBar stock={itemStock} capacity={itemCapacity} low={itemMin} />

                <div style={{ marginTop: 14, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div style={{ fontSize: 11, color: 'var(--ink-soft)' }}>
                    {pct}% of capacity &nbsp;·&nbsp; Min Threshold: {itemMin}
                  </div>

                  {/* Stock Controls */}
                  <div style={{ display: 'flex', gap: 6 }}>
                    <button
                      onClick={() => openActionForm({ ...item, item: itemName, stock: itemStock, unit: itemUnit, minStock: itemMin }, 'restock')}
                      title="Add Stock (+)"
                      aria-label={`Add stock for ${itemName}`}
                      className="clay-button-approve"
                      style={{ fontSize: 11, padding: '4px 10px', gap: 4, height: 28 }}
                    >
                      <PlusCircle size={13} /> + Receive
                    </button>
                    <button
                      onClick={() => openActionForm({ ...item, item: itemName, stock: itemStock, unit: itemUnit, minStock: itemMin }, 'dispatch')}
                      title="Dispatch Stock (-)"
                      aria-label={`Dispatch stock for ${itemName}`}
                      className="clay-button-danger"
                      style={{ fontSize: 11, padding: '4px 10px', gap: 4, height: 28 }}
                    >
                      <MinusCircle size={13} /> - Dispatch
                    </button>
                  </div>
                </div>
              </MotionCard>
            );
          })
        )}
      </div>

      {/* Inventory Audit Trail & Log History */}
      <div className="clay-card" style={{ padding: 20 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16, flexWrap: 'wrap', gap: 10 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <History size={18} color="var(--manila-blue)" />
            <h2 style={{ fontSize: 16, fontWeight: 800, color: 'var(--ink)', margin: 0 }}>Stock Movement & Government Audit Trail</h2>
          </div>
          <span style={{ fontSize: 12, color: 'var(--ink-soft)', fontWeight: 700 }}>
            Showing {logs.length} logged logistics transactions
          </span>
        </div>

        {logs.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '32px 16px', color: 'var(--ink-soft)', fontSize: '13px' }}>
            No stock movement history recorded yet. Use the <strong>+ Receive</strong> or <strong>- Dispatch</strong> buttons above to record shipments.
          </div>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table className="clay-table" style={{ width: '100%', fontSize: 12.5 }}>
              <thead>
                <tr style={{ background: 'var(--sampaguita)' }}>
                  <th style={{ padding: '10px 12px', textAlign: 'left' }}>Timestamp</th>
                  <th style={{ padding: '10px 12px', textAlign: 'left' }}>Item</th>
                  <th style={{ padding: '10px 12px', textAlign: 'center' }}>Type</th>
                  <th style={{ padding: '10px 12px', textAlign: 'right' }}>Qty</th>
                  <th style={{ padding: '10px 12px', textAlign: 'left' }}>Purpose / Category</th>
                  <th style={{ padding: '10px 12px', textAlign: 'left' }}>Destination / Source</th>
                  <th style={{ padding: '10px 12px', textAlign: 'left' }}>Authorized Officer</th>
                  <th style={{ padding: '10px 12px', textAlign: 'left' }}>Reference Doc</th>
                </tr>
              </thead>
              <tbody>
                {logs.map(log => (
                  <tr key={log.id || log._id} style={{ borderBottom: '1px solid var(--border)' }}>
                    <td style={{ padding: '10px 12px', fontSize: 12, color: 'var(--ink-soft)' }}>
                      {log.time || new Date(log.timestamp || log.createdAt).toLocaleString()}
                    </td>
                    <td style={{ padding: '10px 12px', fontWeight: 700, color: 'var(--ink)' }}>
                      {log.item || log.itemName || (log.itemId?.name || 'Relief Item')}
                    </td>
                    <td style={{ padding: '10px 12px', textAlign: 'center' }}>
                      {log.action === 'restock' || log.type === 'restock' ? (
                        <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4, background: 'rgba(21,138,100,0.1)', color: '#047857', fontSize: 11, fontWeight: 800, padding: '3px 8px', borderRadius: 999 }}>
                          <ArrowUpRight size={12} /> RECEIVE (+)
                        </span>
                      ) : (
                        <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4, background: '#FEF2F2', color: '#991B1B', fontSize: 11, fontWeight: 800, padding: '3px 8px', borderRadius: 999 }}>
                          <ArrowDownRight size={12} /> DISPATCH (-)
                        </span>
                      )}
                    </td>
                    <td style={{ padding: '10px 12px', textAlign: 'right', fontWeight: 800, color: (log.action === 'restock' || log.type === 'restock') ? '#047857' : '#991B1B' }}>
                      {(log.action === 'restock' || log.type === 'restock') ? `+${log.quantity || log.qty}` : `-${log.quantity || log.qty}`}
                    </td>
                    <td style={{ padding: '10px 12px', fontWeight: 600, color: 'var(--ink)' }}>
                      {log.purpose || 'General Relief Operation'}
                    </td>
                    <td style={{ padding: '10px 12px', color: 'var(--ink-soft)' }}>
                      {log.destination || 'Central Facility'}
                    </td>
                    <td style={{ padding: '10px 12px', fontSize: 12, color: 'var(--ink)' }}>
                      {log.approvingOfficial || log.performedByName || (log.performedBy?.name || 'Authorized Officer')}
                    </td>
                    <td style={{ padding: '10px 12px', fontSize: 12, color: 'var(--ink-soft)' }}>
                      {log.referenceNo || log.notes || '—'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}

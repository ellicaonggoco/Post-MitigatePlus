import React from 'react';
import ReactDOM from 'react-dom';
import { AlertTriangle, Info, Trash2, CheckCircle2, X } from 'lucide-react';

export default function ConfirmModal({
  isOpen,
  title = 'Are you sure?',
  message = 'Please confirm if you wish to proceed with this action.',
  confirmText = 'Proceed',
  cancelText = 'Cancel',
  type = 'warning', // 'warning' | 'danger' | 'info' | 'success'
  onConfirm,
  onCancel,
}) {
  if (!isOpen) return null;

  const config = {
    warning: { icon: AlertTriangle, color: '#D97706', bg: '#FFFBEB', btnClass: 'clay-button-outline-amber' },
    danger: { icon: Trash2, color: '#EF4444', bg: '#FEF2F2', btnClass: 'clay-button-danger' },
    info: { icon: Info, color: '#2563EB', bg: '#EFF6FF', btnClass: 'clay-button-primary' },
    success: { icon: CheckCircle2, color: '#158A64', bg: 'rgba(21,138,100,0.1)', btnClass: 'clay-button-approve' },
  }[type] || { icon: AlertTriangle, color: '#D97706', bg: '#FFFBEB', btnClass: 'clay-button-primary' };

  const Icon = config.icon;

  const modalContent = (
    <div style={{
      position: 'fixed',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      width: '100vw',
      height: '100vh',
      backgroundColor: 'rgba(15, 23, 42, 0.65)',
      backdropFilter: 'blur(8px)',
      WebkitBackdropFilter: 'blur(8px)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      zIndex: 9999999,
      padding: 16,
      boxSizing: 'border-box',
    }}>
      <div style={{
        background: 'var(--card)',
        border: '1.5px solid var(--border)',
        borderRadius: 'var(--radius-card)',
        boxShadow: '0 24px 60px rgba(0, 0, 0, 0.45)',
        width: '100%',
        maxWidth: 440,
        overflow: 'hidden',
        animation: 'card-enter 0.2s cubic-bezier(0.16, 1, 0.3, 1)',
      }}>
        {/* Header */}
        <div style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'flex-start',
          padding: '20px 20px 0 20px',
        }}>
          <div style={{ display: 'flex', gap: 14, alignItems: 'center' }}>
            <div style={{
              width: 44,
              height: 44,
              borderRadius: 12,
              background: config.bg,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              flexShrink: 0,
            }}>
              <Icon size={22} color={config.color} />
            </div>
            <div>
              <h3 style={{ fontSize: 17, fontWeight: 800, color: 'var(--ink)', margin: 0 }}>{title}</h3>
              <span style={{ fontSize: 11, fontWeight: 700, color: 'var(--ink-soft)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                Confirmation Required
              </span>
            </div>
          </div>
          <button
            onClick={onCancel}
            style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--ink-soft)', padding: 4 }}
          >
            <X size={18} />
          </button>
        </div>

        {/* Body */}
        <div style={{ padding: '16px 20px 20px 20px' }}>
          <p style={{ fontSize: 14, color: 'var(--ink)', lineHeight: 1.5, margin: 0 }}>
            {message}
          </p>
        </div>

        {/* Footer */}
        <div style={{
          display: 'flex',
          justifyContent: 'flex-end',
          gap: 10,
          padding: '14px 20px',
          background: 'var(--sampaguita)',
          borderTop: '1px solid var(--border)',
        }}>
          <button
            onClick={onCancel}
            className="clay-button-ghost"
            style={{ fontSize: 13, padding: '8px 16px' }}
          >
            {cancelText}
          </button>
          <button
            onClick={onConfirm}
            className={config.btnClass}
            style={{ fontSize: 13, padding: '8px 18px', fontWeight: 700 }}
          >
            {confirmText}
          </button>
        </div>
      </div>
    </div>
  );

  return ReactDOM.createPortal(modalContent, document.body);
}

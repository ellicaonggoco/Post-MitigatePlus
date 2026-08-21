import React, { useState, useRef, useEffect } from 'react';
import { Globe, Search, ChevronDown, X, Check } from 'lucide-react';

// Generates comprehensive Manila Barangay list (All + 291-305 + 1 to 905)
const ALL_BARANGAY_OPTIONS = [
  { value: 'all', label: 'Entire Manila City (All Barangays)', code: 'ALL' },
  ...Array.from({ length: 905 }, (_, i) => {
    const num = i + 1;
    return {
      value: String(num),
      label: `Barangay ${num}`,
      code: String(num),
    };
  }),
];

export default function SearchableBarangaySelect({ value, onChange, style }) {
  const [isOpen, setIsOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const wrapperRef = useRef(null);

  // Synchronize initial / prop value with search term text
  const selectedObj = ALL_BARANGAY_OPTIONS.find(opt => opt.value === value) || ALL_BARANGAY_OPTIONS[0];

  useEffect(() => {
    if (!isOpen) {
      setSearchTerm(selectedObj.label);
    }
  }, [value, isOpen, selectedObj.label]);

  // Filter suggestions based on user search term
  const filteredOptions = ALL_BARANGAY_OPTIONS.filter(opt => {
    if (!searchTerm || searchTerm === selectedObj.label) return true;
    const term = searchTerm.toLowerCase().trim();
    return (
      opt.label.toLowerCase().includes(term) ||
      opt.value.toLowerCase().includes(term) ||
      `brgy ${opt.value}`.toLowerCase().includes(term)
    );
  }).slice(0, 50); // Limit to top 50 matches for high performance

  // Click outside listener to close suggestion popover
  useEffect(() => {
    function handleClickOutside(event) {
      if (wrapperRef.current && !wrapperRef.current.contains(event.target)) {
        setIsOpen(false);
        setSearchTerm(selectedObj.label);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [selectedObj]);

  const handleSelect = (optValue) => {
    onChange(optValue);
    setIsOpen(false);
  };

  const handleClear = (e) => {
    e.stopPropagation();
    onChange('all');
    setSearchTerm('');
    setIsOpen(true);
  };

  return (
    <div
      ref={wrapperRef}
      className={`searchable-select-root ${isOpen ? 'is-open' : ''}`}
      style={{
        position: 'relative',
        minWidth: '240px',
        maxWidth: '320px',
        zIndex: isOpen ? 999999 : 50,
        ...style,
      }}
    >
      {/* Input Field Container */}
      <div
        onClick={() => setIsOpen(true)}
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: '8px',
          background: 'var(--card)',
          border: isOpen ? '1.5px solid var(--manila-blue)' : '1px solid var(--border)',
          borderRadius: 'var(--radius-inner, 10px)',
          padding: '6px 12px',
          boxShadow: isOpen ? '0 0 0 3px rgba(13, 60, 117, 0.12)' : '0 1px 3px rgba(0,0,0,0.05)',
          cursor: 'text',
          transition: 'all 0.2s ease',
        }}
      >
        <Globe size={15} color="var(--manila-blue)" style={{ flexShrink: 0 }} />

        <input
          type="text"
          aria-label="Type or search Barangay scope"
          value={isOpen ? searchTerm : selectedObj.label}
          onChange={(e) => {
            setSearchTerm(e.target.value);
            if (!isOpen) setIsOpen(true);
          }}
          onFocus={() => {
            setIsOpen(true);
            setSearchTerm('');
          }}
          placeholder="Type or search Barangay..."
          style={{
            border: 'none',
            outline: 'none',
            background: 'transparent',
            fontSize: '13px',
            fontWeight: 700,
            color: 'var(--ink)',
            width: '100%',
            cursor: 'text',
          }}
        />

        {value !== 'all' && (
          <button
            type="button"
            onClick={handleClear}
            style={{
              background: 'transparent',
              border: 'none',
              cursor: 'pointer',
              padding: '2px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: 'var(--ink-soft)',
            }}
            title="Clear filter"
          >
            <X size={13} />
          </button>
        )}

        <ChevronDown
          size={14}
          color="var(--ink-soft)"
          style={{
            flexShrink: 0,
            transform: isOpen ? 'rotate(180deg)' : 'rotate(0deg)',
            transition: 'transform 0.2s ease',
          }}
        />
      </div>

      {/* Floating Suggestion Popover */}
      {isOpen && (
        <div
          className="searchable-select-popover"
          style={{
            position: 'absolute',
            top: 'calc(100% + 6px)',
            left: 0,
            right: 0,
            maxHeight: '280px',
            overflowY: 'auto',
            background: 'var(--card)',
            border: '1px solid var(--border)',
            borderRadius: '12px',
            boxShadow: '0 16px 40px rgba(0, 0, 0, 0.22), 0 6px 16px rgba(0, 0, 0, 0.12)',
            zIndex: 9999999,
            padding: '6px',
          }}
        >
          {filteredOptions.length === 0 ? (
            <div style={{ padding: '10px 12px', fontSize: '12px', color: 'var(--ink-soft)', textAlign: 'center' }}>
              No barangay found for "{searchTerm}"
            </div>
          ) : (
            filteredOptions.map((opt) => {
              const isSelected = opt.value === value;
              return (
                <div
                  key={opt.value}
                  onClick={() => handleSelect(opt.value)}
                  style={{
                    padding: '8px 12px',
                    borderRadius: '8px',
                    fontSize: '13px',
                    fontWeight: isSelected ? 700 : 500,
                    color: isSelected ? 'var(--manila-blue)' : 'var(--ink)',
                    background: isSelected ? 'var(--manila-blue-light)' : 'transparent',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    transition: 'background 0.12s ease',
                  }}
                  onMouseEnter={(e) => {
                    if (!isSelected) e.currentTarget.style.background = 'var(--sampaguita)';
                  }}
                  onMouseLeave={(e) => {
                    if (!isSelected) e.currentTarget.style.background = 'transparent';
                  }}
                >
                  <span>{opt.label}</span>
                  {isSelected && <Check size={14} color="var(--manila-blue)" />}
                </div>
              );
            })
          )}
        </div>
      )}
    </div>
  );
}

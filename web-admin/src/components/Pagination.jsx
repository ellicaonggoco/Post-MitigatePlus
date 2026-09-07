import React from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';

export default function Pagination({
  currentPage = 1,
  totalItems = 0,
  itemsPerPage = 10,
  onPageChange,
  style = {},
}) {
  const totalPages = Math.max(1, Math.ceil(totalItems / itemsPerPage));

  if (totalItems <= 0) return null;

  const startItem = (currentPage - 1) * itemsPerPage + 1;
  const endItem = Math.min(totalItems, currentPage * itemsPerPage);

  const getPageNumbers = () => {
    const pages = [];
    if (totalPages <= 7) {
      for (let i = 1; i <= totalPages; i++) pages.push(i);
    } else {
      pages.push(1);
      if (currentPage > 3) pages.push('...');
      
      const start = Math.max(2, currentPage - 1);
      const end = Math.min(totalPages - 1, currentPage + 1);
      
      for (let i = start; i <= end; i++) {
        if (!pages.includes(i)) pages.push(i);
      }
      
      if (currentPage < totalPages - 2) pages.push('...');
      pages.push(totalPages);
    }
    return pages;
  };

  const pages = getPageNumbers();

  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        flexWrap: 'wrap',
        gap: '12px',
        padding: '12px 16px',
        borderTop: '1px solid #E2E8F0',
        backgroundColor: '#FFFFFF',
        borderRadius: '0 0 16px 16px',
        fontFamily: "'Plus Jakarta Sans', sans-serif",
        ...style,
      }}
    >
      {/* Entry count description */}
      <span style={{ fontSize: '12.5px', color: '#64748B', fontWeight: 600 }}>
        Showing <strong style={{ color: '#0B1525' }}>{startItem}</strong> to{' '}
        <strong style={{ color: '#0B1525' }}>{endItem}</strong> of{' '}
        <strong style={{ color: '#0B1525' }}>{totalItems}</strong> entries
      </span>

      {/* Pagination controls */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
        {/* Prev Button */}
        <button
          onClick={() => onPageChange && onPageChange(Math.max(1, currentPage - 1))}
          disabled={currentPage === 1}
          aria-label="Previous page"
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '4px',
            padding: '6px 10px',
            borderRadius: '8px',
            border: '1px solid #DDE4F0',
            backgroundColor: '#FFFFFF',
            color: currentPage === 1 ? '#94A3B8' : '#0B1D4E',
            fontSize: '12px',
            fontWeight: 700,
            cursor: currentPage === 1 ? 'not-allowed' : 'pointer',
            opacity: currentPage === 1 ? 0.6 : 1,
            transition: 'all 0.15s ease',
          }}
        >
          <ChevronLeft size={14} /> Prev
        </button>

        {/* Numbered page buttons */}
        {pages.map((p, idx) => {
          if (p === '...') {
            return (
              <span
                key={`ellipsis-${idx}`}
                style={{
                  padding: '4px 8px',
                  fontSize: '12px',
                  color: '#94A3B8',
                  fontWeight: 700,
                }}
              >
                &hellip;
              </span>
            );
          }

          const isActive = p === currentPage;

          return (
            <button
              key={`page-${p}`}
              onClick={() => onPageChange && onPageChange(p)}
              aria-current={isActive ? 'page' : undefined}
              style={{
                width: '32px',
                height: '32px',
                borderRadius: '8px',
                border: isActive ? '1.5px solid #1C3F94' : '1px solid #DDE4F0',
                backgroundColor: isActive ? '#1C3F94' : '#FFFFFF',
                color: isActive ? '#FFFFFF' : '#0B1525',
                fontSize: '12.5px',
                fontWeight: isActive ? 800 : 600,
                display: 'inline-flex',
                alignItems: 'center',
                justifyContent: 'center',
                cursor: 'pointer',
                boxShadow: isActive ? '0 2px 8px rgba(28, 63, 148, 0.28)' : 'none',
                transition: 'all 0.15s ease',
              }}
            >
              {p}
            </button>
          );
        })}

        {/* Next Button */}
        <button
          onClick={() => onPageChange && onPageChange(Math.min(totalPages, currentPage + 1))}
          disabled={currentPage === totalPages}
          aria-label="Next page"
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '4px',
            padding: '6px 10px',
            borderRadius: '8px',
            border: '1px solid #DDE4F0',
            backgroundColor: '#FFFFFF',
            color: currentPage === totalPages ? '#94A3B8' : '#0B1D4E',
            fontSize: '12px',
            fontWeight: 700,
            cursor: currentPage === totalPages ? 'not-allowed' : 'pointer',
            opacity: currentPage === totalPages ? 0.6 : 1,
            transition: 'all 0.15s ease',
          }}
        >
          Next <ChevronRight size={14} />
        </button>
      </div>
    </div>
  );
}

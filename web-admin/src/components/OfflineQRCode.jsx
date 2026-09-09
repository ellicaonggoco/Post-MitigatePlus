import React, { useState, useEffect } from 'react';
import QRCode from 'qrcode';

export default function OfflineQRCode({ value, size = 200, style = {}, alt = 'QR Code' }) {
  const [dataUrl, setDataUrl] = useState('');
  const [error, setError] = useState(false);

  useEffect(() => {
    if (!value) {
      setDataUrl('');
      return;
    }

    let isMounted = true;
    QRCode.toDataURL(String(value), {
      width: size,
      margin: 1,
      color: {
        dark: '#0B1D4E',
        light: '#FFFFFF',
      },
    })
      .then((url) => {
        if (isMounted) {
          setDataUrl(url);
          setError(false);
        }
      })
      .catch((err) => {
        console.warn('QR Generation Error:', err);
        if (isMounted) setError(true);
      });

    return () => {
      isMounted = false;
    };
  }, [value, size]);

  if (error || !value) {
    return (
      <div
        style={{
          width: size,
          height: size,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          background: '#F8FAFC',
          borderRadius: 8,
          border: '1px dashed #CBD5E1',
          color: '#64748B',
          fontSize: 12,
          fontWeight: 700,
          ...style,
        }}
      >
        QR Unavailable
      </div>
    );
  }

  if (!dataUrl) {
    return (
      <div
        style={{
          width: size,
          height: size,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          background: '#FFFFFF',
          ...style,
        }}
      >
        <div style={{ width: 24, height: 24, border: '2px solid #CBD5E1', borderTopColor: '#1C3F94', borderRadius: '50%' }} />
      </div>
    );
  }

  return (
    <img
      src={dataUrl}
      alt={alt}
      style={{
        width: size,
        height: size,
        display: 'block',
        ...style,
      }}
    />
  );
}

import React from 'react';
import { Phone, Mail, Users } from 'lucide-react';
import { logoMarkBase64 } from '../assets/logo-b64';

export default function Footer() {
  return (
    <footer
      style={{
        marginTop: 'auto',
        backgroundColor: '#F8FAFC',
        borderTop: '1px solid #E2E8F0',
        padding: '12px 24px 10px',
        fontFamily: "'Plus Jakarta Sans', sans-serif",
        color: '#475569',
        width: '100%',
        boxSizing: 'border-box',
        position: 'relative',
        zIndex: 10,
      }}
    >
      <div
        style={{
          maxWidth: '1440px',
          margin: '0 auto',
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))',
          gap: '16px',
          paddingBottom: '10px',
          borderBottom: '1px solid #E2E8F0',
        }}
      >
        {/* Column 1: System Branding */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <img
              src={logoMarkBase64}
              alt="MitigatePlus Seal"
              style={{ width: '22px', height: '22px', objectFit: 'contain' }}
            />
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <span style={{ fontSize: '13px', fontWeight: 800, color: '#0F172A', letterSpacing: '-0.2px' }}>
                MitigatePlus
              </span>
              <span
                style={{
                  fontSize: '9.5px',
                  fontWeight: 700,
                  backgroundColor: '#E2E8F0',
                  color: '#475569',
                  padding: '1px 5px',
                  borderRadius: '4px',
                }}
              >
                v1.0.0
              </span>
            </div>
          </div>

          <p style={{ margin: 0, fontSize: '11px', color: '#64748B', lineHeight: 1.35 }}>
            Official Disaster Relief Platform &bull; <strong style={{ color: '#334155' }}>City Government of Manila (MDRRMD)</strong> &amp; <strong style={{ color: '#334155' }}>National University (CCIT)</strong>
          </p>

          <div style={{ display: 'flex', alignItems: 'center', gap: '5px', marginTop: '2px' }}>
            <span style={{ display: 'inline-flex', width: '6px', height: '6px', borderRadius: '50%', backgroundColor: '#10B981' }} />
            <span style={{ fontSize: '10.5px', fontWeight: 600, color: '#64748B' }}>
              System Operational &bull; A.Y. 2025–2026
            </span>
          </div>
        </div>

        {/* Column 2: Development Team */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <Users size={14} color="#64748B" />
            <span style={{ fontSize: '12px', fontWeight: 700, color: '#0F172A' }}>
              Development Team: ONTHEWAY
            </span>
          </div>

          <p style={{ margin: 0, fontSize: '11px', color: '#64748B', lineHeight: 1.35 }}>
            <strong style={{ color: '#475569' }}>Adviser:</strong> Mr. John Ivan C. Maurat<br />
            <strong style={{ color: '#475569' }}>Members:</strong> Corpuz, J.R. &bull; Datul, J.H. &bull; Garcia, N.C.M. &bull; Nolasco, J.M. &bull; Onggoco, E.C.
          </p>
        </div>

        {/* Column 3: Emergency & Support */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <Phone size={13} color="#64748B" />
            <span style={{ fontSize: '12px', fontWeight: 700, color: '#0F172A' }}>
              Manila Emergency Hotline (MDRRMD)
            </span>
          </div>

          <p style={{ margin: 0, fontSize: '11px', color: '#334155', fontWeight: 600, lineHeight: 1.35 }}>
            (02) 8527-5174 &bull; (02) 8708-5696 &bull; 911
          </p>

          <div style={{ display: 'flex', alignItems: 'center', gap: '5px', marginTop: '2px' }}>
            <Mail size={12} color="#64748B" />
            <a
              href="mailto:support@mitigateplus.manila.gov.ph"
              style={{ fontSize: '11px', color: '#64748B', textDecoration: 'none' }}
            >
              support@mitigateplus.manila.gov.ph
            </a>
          </div>
        </div>
      </div>

      {/* Bottom Copyright Row */}
      <div
        style={{
          maxWidth: '1440px',
          margin: '0 auto',
          paddingTop: '6px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          flexWrap: 'wrap',
          gap: '6px',
          fontSize: '10px',
          color: '#94A3B8',
        }}
      >
        <span>
          &copy; 2026 City Government of Manila &amp; National University. All Rights Reserved.
        </span>
        <span>
          CCIT &bull; Manila MDRRMD
        </span>
      </div>
    </footer>
  );
}

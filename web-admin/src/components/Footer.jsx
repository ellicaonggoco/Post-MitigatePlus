import React from 'react';
import { Shield, Phone, Mail, Users, Info, Building, GraduationCap, CheckCircle2 } from 'lucide-react';
import { logoMarkBase64 } from '../assets/logo-b64';

export default function Footer({ onOpenInfoModal }) {
  return (
    <footer
      style={{
        marginTop: 'auto',
        backgroundColor: '#FFFFFF',
        borderTop: '1.5px solid #DDE4F0',
        padding: '24px 32px 18px',
        fontFamily: "'Plus Jakarta Sans', sans-serif",
        color: '#0B1525',
      }}
    >
      <div
        style={{
          maxWidth: '1440px',
          margin: '0 auto',
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
          gap: '24px',
          paddingBottom: '20px',
          borderBottom: '1px solid #E2E8F0',
        }}
      >
        {/* Column 1: System Branding & Accreditation */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <img
              src={logoMarkBase64}
              alt="MitigatePlus Seal"
              style={{ width: '38px', height: '38px', objectFit: 'contain' }}
            />
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span style={{ fontSize: '16px', fontWeight: 800, color: '#0B1D4E', letterSpacing: '-0.3px' }}>
                  MitigatePlus
                </span>
                <span
                  style={{
                    fontSize: '10px',
                    fontWeight: 800,
                    backgroundColor: '#C9A84C',
                    color: '#0B1D4E',
                    padding: '1px 6px',
                    borderRadius: '999px',
                  }}
                >
                  v1.0.0
                </span>
              </div>
              <span style={{ fontSize: '11.5px', color: '#64748B', fontWeight: 600 }}>
                Disaster Risk Mitigation Information System
              </span>
            </div>
          </div>

          <p style={{ margin: 0, fontSize: '12px', color: '#475569', lineHeight: 1.5 }}>
            Official Disaster Relief &amp; Beneficiary Coordination Platform in partnership with the{' '}
            <strong style={{ color: '#0B1D4E' }}>City Government of Manila - MDRRMD</strong> and{' '}
            <strong style={{ color: '#1C3F94' }}>National University - Manila (CCIT)</strong>.
          </p>

          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginTop: '4px' }}>
            <span style={{ display: 'inline-flex', width: '8px', height: '8px', borderRadius: '50%', backgroundColor: '#10B981' }} />
            <span style={{ fontSize: '11px', fontWeight: 700, color: '#059669' }}>
              System Operational &bull; A.Y. 2025–2026
            </span>
          </div>
        </div>

        {/* Column 2: Development Team & Adviser */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <Users size={16} color="#1C3F94" />
            <span style={{ fontSize: '13px', fontWeight: 800, color: '#0B1D4E' }}>
              Development Team: ONTHEWAY
            </span>
          </div>

          <p style={{ margin: 0, fontSize: '11.5px', color: '#475569', lineHeight: 1.6 }}>
            <strong>Adviser:</strong> Mr. John Ivan C. Maurat<br />
            <strong>Developers:</strong> Corpuz, J.R. &bull; Datul, J.H. &bull; Garcia, N.C.M. &bull; Nolasco, J.M. &bull; Onggoco, E.C.
          </p>

          <div style={{ marginTop: '4px' }}>
            <button
              onClick={onOpenInfoModal}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '6px',
                padding: '5px 12px',
                backgroundColor: '#EDF1FB',
                color: '#1C3F94',
                border: '1px solid #D6DEFA',
                borderRadius: '8px',
                fontSize: '11.5px',
                fontWeight: 700,
                cursor: 'pointer',
                transition: 'all 0.2s',
              }}
              onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = '#D6DEFA')}
              onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = '#EDF1FB')}
            >
              <Info size={13} /> View Full Project &amp; Developer Details
            </button>
          </div>
        </div>

        {/* Column 3: 24/7 Manila Disaster Hotlines & Support */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <Phone size={15} color="#C8102E" />
            <span style={{ fontSize: '13px', fontWeight: 800, color: '#C8102E' }}>
              24/7 Manila Emergency Hotline (MDRRMD)
            </span>
          </div>

          <p style={{ margin: 0, fontSize: '12px', color: '#0B1525', fontWeight: 700 }}>
            (02) 8527-5174 &bull; (02) 8708-5696 &bull; 911
          </p>

          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginTop: '2px' }}>
            <Mail size={14} color="#1C3F94" />
            <a
              href="mailto:support@mitigateplus.manila.gov.ph"
              style={{ fontSize: '12px', color: '#1C3F94', fontWeight: 600, textDecoration: 'none' }}
            >
              support@mitigateplus.manila.gov.ph
            </a>
          </div>
        </div>
      </div>

      {/* Bottom Copyright & Disclaimer Row */}
      <div
        style={{
          maxWidth: '1440px',
          margin: '0 auto',
          paddingTop: '12px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          flexWrap: 'wrap',
          gap: '8px',
          fontSize: '11px',
          color: '#64748B',
        }}
      >
        <span>
          &copy; 2026 City Government of Manila &amp; National University. All Rights Reserved.
        </span>
        <span>
          College of Computing and Information Technologies (CCIT) &bull; Manila MDRRMD
        </span>
      </div>
    </footer>
  );
}

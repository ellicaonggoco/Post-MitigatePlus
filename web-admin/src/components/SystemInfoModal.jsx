import React from 'react';
import { X, Building, GraduationCap, Users, Mail, Phone, Award } from 'lucide-react';
import { logoMarkBase64 } from '../assets/logo-b64';

export default function SystemInfoModal({ isOpen, onClose }) {
  if (!isOpen) return null;

  const teamMembers = [
    'Corpuz, John Rafael P.',
    'Datul, John Herzsel D.',
    'Garcia, Neil Chester Mari N.',
    'Nolasco, John Michael N.',
    'Onggoco, Ellica Chris M.',
  ];

  return (
    <div
      onClick={onClose}
      style={{
        position: 'fixed',
        inset: 0,
        backgroundColor: 'rgba(11, 29, 78, 0.72)',
        backdropFilter: 'blur(6px)',
        zIndex: 9999999,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '20px',
      }}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          width: '100%',
          maxWidth: '680px',
          maxHeight: '90vh',
          backgroundColor: '#FFFFFF',
          borderRadius: '24px',
          boxShadow: '0 24px 60px rgba(11, 29, 78, 0.28)',
          border: '1.5px solid #DDE4F0',
          overflow: 'hidden',
          display: 'flex',
          flexDirection: 'column',
          fontFamily: "'Plus Jakarta Sans', sans-serif",
        }}
      >
        {/* Header Banner */}
        <div
          style={{
            background: 'linear-gradient(135deg, #0B1D4E 0%, #163B8C 60%, #1C3F94 100%)',
            padding: '24px 28px',
            color: '#FFFFFF',
            position: 'relative',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            borderBottom: '3px solid #C9A84C',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
            <div
              style={{
                width: '54px',
                height: '54px',
                borderRadius: '16px',
                backgroundColor: 'rgba(255, 255, 255, 0.12)',
                border: '1.5px solid #C9A84C',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                padding: '6px',
              }}
            >
              <img
                src={logoMarkBase64}
                alt="MitigatePlus Seal"
                style={{ width: '100%', height: '100%', objectFit: 'contain' }}
              />
            </div>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span
                  style={{
                    backgroundColor: '#C9A84C',
                    color: '#0B1D4E',
                    fontSize: '11px',
                    fontWeight: 800,
                    padding: '2px 8px',
                    borderRadius: '999px',
                    letterSpacing: '0.5px',
                  }}
                >
                  VERSION 1.0.0
                </span>
                <span style={{ fontSize: '12px', color: '#DDE4F0', fontWeight: 600 }}>
                  A.Y. 2025–2026
                </span>
              </div>
              <h2 style={{ fontSize: '19px', fontWeight: 800, margin: '4px 0 0', letterSpacing: '-0.3px', color: '#FFFFFF' }}>
                MitigatePlus
              </h2>
              <p style={{ fontSize: '12.5px', margin: '2px 0 0', color: '#E2E8F0', fontWeight: 500 }}>
                A Community Disaster Risk Mitigation Information System
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            aria-label="Close"
            style={{
              background: 'rgba(255, 255, 255, 0.15)',
              border: 'none',
              borderRadius: '50%',
              width: '36px',
              height: '36px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: '#FFFFFF',
              cursor: 'pointer',
              transition: 'background 0.2s',
            }}
          >
            <X size={18} />
          </button>
        </div>

        {/* Scrollable Content */}
        <div style={{ padding: '24px 28px', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '18px' }}>
          
          {/* Institution & Partner Agency */}
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))',
              gap: '12px',
            }}
          >
            <div
              style={{
                backgroundColor: '#F8FAFC',
                borderRadius: '16px',
                border: '1.5px solid #E2E8F0',
                padding: '16px',
                display: 'flex',
                gap: '12px',
              }}
            >
              <div
                style={{
                  width: '40px',
                  height: '40px',
                  borderRadius: '12px',
                  backgroundColor: '#EDF1FB',
                  color: '#1C3F94',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  flexShrink: 0,
                }}
              >
                <Building size={20} />
              </div>
              <div>
                <span style={{ fontSize: '11px', fontWeight: 700, color: '#64748B', textTransform: 'uppercase' }}>
                  Target LGU / Partner Agency
                </span>
                <p style={{ margin: '3px 0 0', fontSize: '14px', fontWeight: 800, color: '#0B1525' }}>
                  City Government of Manila
                </p>
                <p style={{ margin: '2px 0 0', fontSize: '12px', fontWeight: 600, color: '#C8102E' }}>
                  Manila Disaster Risk Reduction and Management Department (MDRRMD)
                </p>
              </div>
            </div>

            <div
              style={{
                backgroundColor: '#F8FAFC',
                borderRadius: '16px',
                border: '1.5px solid #E2E8F0',
                padding: '16px',
                display: 'flex',
                gap: '12px',
              }}
            >
              <div
                style={{
                  width: '40px',
                  height: '40px',
                  borderRadius: '12px',
                  backgroundColor: '#FBF5E4',
                  color: '#B8932A',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  flexShrink: 0,
                }}
              >
                <GraduationCap size={20} />
              </div>
              <div>
                <span style={{ fontSize: '11px', fontWeight: 700, color: '#64748B', textTransform: 'uppercase' }}>
                  Academic Institution
                </span>
                <p style={{ margin: '3px 0 0', fontSize: '14px', fontWeight: 800, color: '#0B1525' }}>
                  National University - Manila
                </p>
                <p style={{ margin: '2px 0 0', fontSize: '12px', fontWeight: 600, color: '#1C3F94' }}>
                  College of Computing and Information Technologies (CCIT)
                </p>
              </div>
            </div>
          </div>

          {/* Development Team & Adviser */}
          <div
            style={{
              backgroundColor: '#FFFFFF',
              borderRadius: '18px',
              border: '1.5px solid #DDE4F0',
              padding: '20px',
              boxShadow: '0 4px 16px rgba(11, 29, 78, 0.04)',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '14px', borderBottom: '1px solid #E2E8F0', paddingBottom: '10px', flexWrap: 'wrap', gap: '8px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Users size={18} color="#1C3F94" />
                <span style={{ fontSize: '14px', fontWeight: 800, color: '#0B1525' }}>
                  Development Team: <span style={{ color: '#1C3F94' }}>ONTHEWAY</span>
                </span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                <Award size={16} color="#B8932A" />
                <span style={{ fontSize: '12.5px', fontWeight: 700, color: '#64748B' }}>
                  Capstone Adviser: <strong style={{ color: '#0B1525' }}>Mr. John Ivan C. Maurat</strong>
                </span>
              </div>
            </div>

            <span style={{ fontSize: '12px', fontWeight: 700, color: '#64748B', display: 'block', marginBottom: '10px' }}>
              Proponents &amp; Developers:
            </span>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '10px' }}>
              {teamMembers.map((member, idx) => (
                <div
                  key={idx}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '10px',
                    padding: '10px 14px',
                    backgroundColor: '#F8FAFC',
                    borderRadius: '12px',
                    border: '1px solid #E2E8F0',
                  }}
                >
                  <div
                    style={{
                      width: '26px',
                      height: '26px',
                      borderRadius: '50%',
                      backgroundColor: '#1C3F94',
                      color: '#FFFFFF',
                      fontSize: '11px',
                      fontWeight: 800,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      flexShrink: 0,
                    }}
                  >
                    {idx + 1}
                  </div>
                  <span style={{ fontSize: '13px', fontWeight: 700, color: '#0B1525' }}>
                    {member}
                  </span>
                </div>
              ))}
            </div>
          </div>

          {/* Contact & Official Hotlines */}
          <div
            style={{
              backgroundColor: '#FEF0F2',
              borderRadius: '16px',
              border: '1.5px solid #FCD3D8',
              padding: '16px 20px',
              display: 'flex',
              flexWrap: 'wrap',
              alignItems: 'center',
              justifyContent: 'space-between',
              gap: '16px',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <div
                style={{
                  width: '36px',
                  height: '36px',
                  borderRadius: '10px',
                  backgroundColor: '#C8102E',
                  color: '#FFFFFF',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  flexShrink: 0,
                }}
              >
                <Phone size={18} />
              </div>
              <div>
                <span style={{ fontSize: '11px', fontWeight: 700, color: '#9E0B24', textTransform: 'uppercase' }}>
                  24/7 Manila Disaster Operations Hotline (MDRRMD)
                </span>
                <p style={{ margin: '2px 0 0', fontSize: '14px', fontWeight: 800, color: '#6E071A' }}>
                  (02) 8527-5174 &bull; (02) 8708-5696 &bull; 911
                </p>
              </div>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <div
                style={{
                  width: '36px',
                  height: '36px',
                  borderRadius: '10px',
                  backgroundColor: '#1C3F94',
                  color: '#FFFFFF',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  flexShrink: 0,
                }}
              >
                <Mail size={18} />
              </div>
              <div>
                <span style={{ fontSize: '11px', fontWeight: 700, color: '#163B8C', textTransform: 'uppercase' }}>
                  Official Technical Support
                </span>
                <p style={{ margin: '2px 0 0', fontSize: '13px', fontWeight: 800, color: '#0B1D4E' }}>
                  support@mitigateplus.manila.gov.ph
                </p>
              </div>
            </div>
          </div>

        </div>

        {/* Footer info bar */}
        <div
          style={{
            padding: '14px 28px',
            backgroundColor: '#F8FAFC',
            borderTop: '1px solid #E2E8F0',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            flexWrap: 'wrap',
            gap: '10px',
          }}
        >
          <span style={{ fontSize: '11.5px', color: '#64748B', fontWeight: 600 }}>
            &copy; 2026 City Government of Manila &amp; National University. All Rights Reserved.
          </span>
          <button
            onClick={onClose}
            style={{
              padding: '7px 18px',
              backgroundColor: '#1C3F94',
              color: '#FFFFFF',
              borderRadius: '10px',
              border: 'none',
              fontSize: '12.5px',
              fontWeight: 700,
              cursor: 'pointer',
              boxShadow: '0 2px 8px rgba(28, 63, 148, 0.25)',
            }}
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}

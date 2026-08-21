import React, { useState, useContext } from 'react';
import { useNavigate } from 'react-router-dom';
import { AuthContext } from '../context/AuthContext';
import { Mail, Lock, Eye, EyeOff, ShieldCheck, ArrowRight, Sparkles } from 'lucide-react';
import logoFull from '../assets/logo-full.png';
import manilaCityHallTower from '../assets/manila-city-hall-tower.png';
import { API_BASE_URL } from '../config';
import { MotionCard, MotionButton } from '../components/motion';

export default function Login() {
  const [emailOrPhone, setEmailOrPhone] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const { login } = useContext(AuthContext);
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault(); setError(''); setLoading(true);
    const trimmedEmail = emailOrPhone.trim().toLowerCase();

    try {
      const res = await fetch(`${API_BASE_URL}/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ emailOrPhone: trimmedEmail, password }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || 'Login failed');
      login(data, data.token);
      navigate('/');
    } catch (err) {
      setError(err.message || 'Invalid credentials. Please check your email and password.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="login-page">
      <div className="login-frame">
        <section className="login-panel" style={{ display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center', padding: '36px 40px' }}>
          <div className="login-brand" style={{ marginTop: 0, marginBottom: 12, display: 'flex', justifyContent: 'center', alignItems: 'center', width: '100%' }}>
            <img
              src={logoFull}
              alt="MitigatePlus"
              width={270}
              height={76}
              fetchpriority="high"
              className="login-brand-logo"
              style={{ height: 76, width: 'auto', maxWidth: '270px', objectFit: 'contain', mixBlendMode: 'multiply', background: 'transparent' }}
            />
          </div>
          <MotionCard className="login-form-wrap" style={{ width: '100%', maxWidth: '340px', margin: '0 auto', textAlign: 'center' }}>
            <div style={{ display: 'inline-block', fontSize: '12px', fontWeight: 800, color: 'var(--manila-blue)', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 4, background: 'rgba(13,60,117,0.08)', padding: '4px 12px', borderRadius: '12px' }}>
              LGU PERSONNEL ONLY
            </div>
            <h1 style={{ fontSize: '32px', fontWeight: 800, margin: '6px 0 4px', color: 'var(--ink)', lineHeight: 1.2, textAlign: 'center', letterSpacing: '-0.03em' }}>
              Sign in to continue
            </h1>
            <p style={{ margin: '0 0 20px', color: 'var(--ink-soft)', fontSize: '13px', textAlign: 'center', lineHeight: 1.4 }}>
              Access the disaster recovery and assistance workspace.
            </p>
            {error && <div className="login-error" role="alert" style={{ textAlign: 'center', marginBottom: 14 }}>{error}</div>}
            <form onSubmit={handleSubmit} style={{ textAlign: 'left' }}>
              <div style={{ marginBottom: 16 }}>
                <label htmlFor="login-email" style={{ display: 'block', margin: '0 0 6px', color: 'var(--ink)', fontSize: '12px', fontWeight: 700 }}>
                  Email address or phone
                </label>
                <div className="login-input">
                  <Mail size={17} />
                  <input id="login-email" type="text" autoComplete="username" value={emailOrPhone} onChange={e => setEmailOrPhone(e.target.value)} placeholder="you@manila.gov.ph" required />
                </div>
              </div>

              <div style={{ marginBottom: 16 }}>
                <label htmlFor="login-password" style={{ display: 'block', margin: '0 0 6px', color: 'var(--ink)', fontSize: '12px', fontWeight: 700 }}>
                  Password
                </label>
                <div className="login-input">
                  <Lock size={17} />
                  <input id="login-password" type={showPassword ? 'text' : 'password'} autoComplete="current-password" value={password} onChange={e => setPassword(e.target.value)} placeholder="Enter your password" required />
                  <button type="button" onClick={() => setShowPassword(!showPassword)} aria-label="Show or hide password">{showPassword ? <EyeOff size={17} /> : <Eye size={17} />}</button>
                </div>
              </div>

              <MotionButton className="login-submit" type="submit" disabled={loading} style={{ marginTop: 20 }}>
                {loading ? 'Signing in…' : <>Sign in <ArrowRight size={18} /></>}
              </MotionButton>
            </form>
          </MotionCard>
          <small className="login-footer" style={{ marginTop: 24, textAlign: 'center' }}>© 2026 City of Manila · MitigatePlus</small>
        </section>

        <section className="login-showcase" style={{
          background: '#0D3C75',
          position: 'relative',
          overflow: 'hidden',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'space-between',
          padding: '40px 48px',
        }}>
          {/* Subtle top branding overlay */}
          <div className="showcase-top" style={{ position: 'relative', zIndex: 3 }}>
            <span style={{ color: '#93C5FD', fontWeight: 800, fontSize: 11, letterSpacing: '0.08em', display: 'inline-flex', alignItems: 'center' }}>
              RECOVERY, WITH CLARITY
            </span>
            <span style={{ color: 'rgba(255,255,255,0.7)', fontWeight: 800, fontSize: 11, letterSpacing: '0.08em' }}>MANILA LGU</span>
          </div>

          {/* Absolute Positioned Manila City Hall Clock Tower */}
          <img
            src={manilaCityHallTower}
            alt="Manila City Hall Clock Tower"
            width={600}
            height={600}
            decoding="async"
            style={{
              position: 'absolute',
              right: '-240px',
              bottom: '-50px',
              height: '115%',
              maxHeight: 'none',
              width: 'auto',
              objectFit: 'contain',
              objectPosition: 'bottom right',
              zIndex: 1,
              pointerEvents: 'none',
            }}
          />

          {/* Ultra-Aesthetic Executive Quote & Caption Overlay */}
          <div style={{
            position: 'relative',
            zIndex: 3,
            marginTop: 'auto',
            background: 'linear-gradient(180deg, rgba(13,60,117,0) 0%, rgba(9,1,84,0.65) 50%, rgba(4,10,33,0.9) 100%)',
            padding: '30px 36px 36px',
            margin: '0 -48px -40px',
            backdropFilter: 'blur(2px)',
          }}>
            <blockquote style={{
              margin: '0 0 20px',
              color: '#FFFFFF',
              fontFamily: "'Plus Jakarta Sans', sans-serif",
              fontSize: '26px',
              lineHeight: 1.35,
              fontWeight: 800,
              letterSpacing: '-0.035em',
              maxWidth: '460px',
              textShadow: '0 2px 16px rgba(0,0,0,0.7)',
            }}>
              “A focused view of verified residents, priority needs, and relief activity, built for decisive local response.”
            </blockquote>

            <div className="showcase-caption" style={{
              display: 'flex',
              justify: 'space-between',
              alignItems: 'center',
              color: 'rgba(255,255,255,0.85)',
              fontSize: '11px',
              fontWeight: 800,
              textTransform: 'uppercase',
              letterSpacing: '0.08em',
              textShadow: '0 2px 10px rgba(0,0,0,0.7)',
            }}>
              <span style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                <ShieldCheck size={16} color="#34D399" /> Barangay Verified
              </span>
              <span>City-Wide Coordination</span>
            </div>
          </div>
        </section>
      </div>
    </div>
  );
}

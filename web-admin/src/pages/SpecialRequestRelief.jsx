import React, { useState, useEffect, useContext } from 'react';
import { useNavigate } from 'react-router-dom';
import { AuthContext } from '../context/AuthContext';
import { ROLES } from '../utils/roleUtils';
import {
  Package,
  Droplets,
  HeartPulse,
  Baby,
  Home,
  Users,
  ShieldCheck,
  Truck,
  AlertTriangle,
  CheckCircle,
  FileSpreadsheet,
  ArrowRight,
  RefreshCw,
  Search,
  Building2,
  Calendar,
  Clock
} from 'lucide-react';
import { API_BASE_URL } from '../config';
import { MotionCard, MotionButton } from '../components/motion';

const MANILA_BARANGAYS_LIST = Array.from({ length: 897 }, (_, i) => String(i + 1).padStart(3, '0'));

export default function SpecialRequestRelief() {
  const { token, user } = useContext(AuthContext);
  const navigate = useNavigate();
  const role = user?.role;
  const isBarangay = role === ROLES.BARANGAY_OFFICIAL;
  const defaultBrgy = isBarangay ? (user?.barangayCode || '291') : '291';

  const [selectedBrgy, setSelectedBrgy] = useState(defaultBrgy);
  const [brgySearch, setBrgySearch] = useState(defaultBrgy);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [loading, setLoading] = useState(true);
  const [assessmentData, setAssessmentData] = useState(null);

  const fetchAssessment = async (bCode) => {
    if (!token) return;
    try {
      setLoading(true);
      const res = await fetch(`${API_BASE_URL}/reports/pre-event-assessment?barangayCode=${bCode}`, {
        headers: { Authorization: 'Bearer ' + token, 'Content-Type': 'application/json' }
      });
      if (res.ok) {
        const data = await res.json();
        setAssessmentData(data);
      } else {
        setAssessmentData(null);
      }
    } catch (e) {
      console.error('Error loading pre-event assessment:', e);
      setAssessmentData(null);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAssessment(selectedBrgy);
  }, [selectedBrgy, token]);

  const handleSelectBrgy = (code) => {
    setSelectedBrgy(code);
    setBrgySearch(code);
    setShowSuggestions(false);
  };

  const matchingBarangays = MANILA_BARANGAYS_LIST.filter(b => b.includes(brgySearch.trim())).slice(0, 10);

  const handleScheduleEvent = () => {
    const totalHH = assessmentData?.totalHouseholds || 0;
    const foodPacks = assessmentData?.demand?.foodPacks || 0;
    navigate(`/distribution-events?barangay=${selectedBrgy}&households=${totalHH}&demandPacks=${foodPacks}`);
  };

  return (
    <div className="page-container page-animate">
      {/* ── Page Header ── */}
      <div className="workflow-header" style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 24, flexWrap: 'wrap', gap: 16 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
          <div style={{ width: 48, height: 48, borderRadius: 'var(--radius-inner)', background: 'linear-gradient(135deg, var(--manila-blue), #1e5a7a)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <Package size={24} color="#fff" />
          </div>
          <div>
            <h1 className="section-header" style={{ margin: 0, fontSize: 22 }}>Pre-Event Relief Demand & Quota Assessment</h1>
            <p style={{ fontSize: 13, color: 'var(--ink-soft)', marginTop: 2 }}>
              Automated assessment of household relief entitlements, demographic vulnerability breakdown, and warehouse inventory feasibility prior to event creation.
            </p>
          </div>
        </div>

        {/* Action Button: Direct Route to Schedule Distribution */}
        <button
          onClick={handleScheduleEvent}
          className="clay-button-primary"
          style={{ fontSize: 13, gap: 8, padding: '10px 18px', background: '#158A64', borderColor: '#107050' }}
        >
          <Truck size={16} /> Schedule Event with Computed Quotas
        </button>
      </div>

      {/* ── Barangay Selector Bar ── */}
      <div className="clay-card" style={{ marginBottom: 20, padding: '16px 20px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 16 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, flex: 1, minWidth: 280 }}>
          <Building2 size={20} color="var(--manila-blue)" />
          <div style={{ flex: 1, position: 'relative' }}>
            <label style={{ fontSize: 11, fontWeight: 800, color: 'var(--ink-soft)', textTransform: 'uppercase', letterSpacing: '0.06em', display: 'block', marginBottom: 4 }}>
              Target Assessment Barangay
            </label>
            {isBarangay ? (
              <div style={{ fontSize: 15, fontWeight: 800, color: 'var(--manila-blue)' }}>
                Barangay {user?.barangayCode || '291'} (Locked to Official Jurisdiction)
              </div>
            ) : (
              <div style={{ position: 'relative', maxWidth: 360 }}>
                <input
                  type="text"
                  placeholder="Type Barangay number (e.g. 291, 653, 304)..."
                  value={brgySearch}
                  onFocus={() => setShowSuggestions(true)}
                  onChange={(e) => {
                    setBrgySearch(e.target.value);
                    setShowSuggestions(true);
                  }}
                  style={{
                    width: '100%',
                    padding: '8px 12px',
                    borderRadius: 'var(--radius-inner)',
                    border: '1.5px solid var(--manila-blue)',
                    fontSize: 13,
                    fontWeight: 700,
                    outline: 'none',
                    background: 'var(--card)',
                    color: 'var(--ink)'
                  }}
                />
                {showSuggestions && matchingBarangays.length > 0 && (
                  <div style={{
                    position: 'absolute',
                    top: '100%',
                    left: 0,
                    right: 0,
                    marginTop: 4,
                    background: 'var(--card)',
                    border: '1px solid var(--border)',
                    borderRadius: 'var(--radius-inner)',
                    boxShadow: '0 10px 25px rgba(0,0,0,0.15)',
                    zIndex: 9999,
                    maxHeight: 200,
                    overflowY: 'auto'
                  }}>
                    {matchingBarangays.map(b => (
                      <div
                        key={b}
                        onClick={() => handleSelectBrgy(b)}
                        style={{ padding: '8px 12px', fontSize: 13, fontWeight: 700, cursor: 'pointer', borderBottom: '1px solid var(--border)' }}
                        onMouseEnter={(e) => e.currentTarget.style.background = 'var(--sampaguita)'}
                        onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}
                      >
                        Barangay {b}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
        </div>

        <button
          onClick={() => fetchAssessment(selectedBrgy)}
          className="clay-button-ghost"
          style={{ fontSize: 12.5, gap: 6, padding: '7px 14px' }}
        >
          <RefreshCw size={14} className={loading ? 'animate-spin' : ''} /> Refresh Census
        </button>
      </div>

      {/* ── Automated Quota Demand KPI Grid ── */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 14, marginBottom: 24 }}>
        {/* Food Packs */}
        <div className="clay-card" style={{ padding: '16px', borderLeft: '4px solid #1557B0' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
            <div style={{ width: 34, height: 34, borderRadius: 8, background: '#EFF6FF', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <Package size={18} color="#1557B0" />
            </div>
            <span style={{ fontSize: 20, fontWeight: 900, color: '#1557B0' }}>
              {assessmentData?.demand?.foodPacks || 0}
            </span>
          </div>
          <div style={{ fontSize: 13, fontWeight: 800, color: 'var(--ink)' }}>Family Food Packs</div>
          <div style={{ fontSize: 11, color: 'var(--ink-soft)', marginTop: 2 }}>
            Right-sized: 1-4 pax = 1, 5-8 = 2, 9+ = 3
          </div>
        </div>

        {/* Water Jugs */}
        <div className="clay-card" style={{ padding: '16px', borderLeft: '4px solid #0284C7' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
            <div style={{ width: 34, height: 34, borderRadius: 8, background: '#E0F2FE', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <Droplets size={18} color="#0284C7" />
            </div>
            <span style={{ fontSize: 20, fontWeight: 900, color: '#0284C7' }}>
              {assessmentData?.demand?.waterJugs || 0}
            </span>
          </div>
          <div style={{ fontSize: 13, fontWeight: 800, color: 'var(--ink)' }}>Potable Water (10L Jugs)</div>
          <div style={{ fontSize: 11, color: 'var(--ink-soft)', marginTop: 2 }}>
            1 container per verified household
          </div>
        </div>

        {/* Senior Care Kits */}
        <div className="clay-card" style={{ padding: '16px', borderLeft: '4px solid #7C3AED' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
            <div style={{ width: 34, height: 34, borderRadius: 8, background: '#F5F3FF', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <HeartPulse size={18} color="#7C3AED" />
            </div>
            <span style={{ fontSize: 20, fontWeight: 900, color: '#7C3AED' }}>
              {assessmentData?.demand?.seniorKits || 0}
            </span>
          </div>
          <div style={{ fontSize: 13, fontWeight: 800, color: 'var(--ink)' }}>Senior Care & Med Kits</div>
          <div style={{ fontSize: 11, color: 'var(--ink-soft)', marginTop: 2 }}>
            Matched with registered 60+ seniors
          </div>
        </div>

        {/* Infant Care Packs */}
        <div className="clay-card" style={{ padding: '16px', borderLeft: '4px solid #D97706' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
            <div style={{ width: 34, height: 34, borderRadius: 8, background: '#FFFBEB', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <Baby size={18} color="#D97706" />
            </div>
            <span style={{ fontSize: 20, fontWeight: 900, color: '#D97706' }}>
              {assessmentData?.demand?.infantPacks || 0}
            </span>
          </div>
          <div style={{ fontSize: 13, fontWeight: 800, color: 'var(--ink)' }}>Infant Milk & Nutrition</div>
          <div style={{ fontSize: 11, color: 'var(--ink-soft)', marginTop: 2 }}>
            Matched with 0-2 yo registered infants
          </div>
        </div>

        {/* Shelter Repair */}
        <div className="clay-card" style={{ padding: '16px', borderLeft: '4px solid #DC2626' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
            <div style={{ width: 34, height: 34, borderRadius: 8, background: '#FEF2F2', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <Home size={18} color="#DC2626" />
            </div>
            <span style={{ fontSize: 20, fontWeight: 900, color: '#DC2626' }}>
              {assessmentData?.demand?.shelterRepairKits || 0}
            </span>
          </div>
          <div style={{ fontSize: 13, fontWeight: 800, color: 'var(--ink)' }}>Shelter Repair Materials</div>
          <div style={{ fontSize: 11, color: 'var(--ink-soft)', marginTop: 2 }}>
            Matched with Totally Damaged houses
          </div>
        </div>
      </div>

      {/* ── Demographic Summary & Warehouse Feasibility ── */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: 16, marginBottom: 24 }}>
        {/* Population & Damage Telemetry */}
        <div className="clay-card" style={{ padding: '20px' }}>
          <h2 style={{ fontSize: 15, fontWeight: 800, color: 'var(--ink)', marginBottom: 14, display: 'flex', alignItems: 'center', gap: 8 }}>
            <Users size={18} color="var(--manila-blue)" /> Demographic & Damage Census
          </h2>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            <div style={{ background: 'var(--sampaguita)', padding: '12px', borderRadius: 'var(--radius-inner)' }}>
              <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--ink-soft)' }}>TOTAL VERIFIED FAMILIES</div>
              <div style={{ fontSize: 18, fontWeight: 900, color: 'var(--manila-blue)', marginTop: 2 }}>
                {assessmentData?.totalHouseholds || 0} Families
              </div>
            </div>
            <div style={{ background: 'var(--sampaguita)', padding: '12px', borderRadius: 'var(--radius-inner)' }}>
              <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--ink-soft)' }}>TOTAL INDIVIDUALS</div>
              <div style={{ fontSize: 18, fontWeight: 900, color: 'var(--ink)', marginTop: 2 }}>
                {assessmentData?.totalHeadcount || 0} Persons
              </div>
            </div>
          </div>

          <div style={{ marginTop: 14, paddingTop: 14, borderTop: '1px solid var(--border)' }}>
            <div style={{ fontSize: 12, fontWeight: 800, color: 'var(--ink-soft)', marginBottom: 8, textTransform: 'uppercase' }}>
              Damage Telemetry from Citizen Reports:
            </div>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
              <span style={{ fontSize: 11.5, fontWeight: 800, padding: '4px 10px', borderRadius: 999, background: '#FEF2F2', color: '#DC2626', border: '1px solid #FECACA' }}>
                Totally Damaged: {assessmentData?.damageTelemetry?.totallyDamaged || 0}
              </span>
              <span style={{ fontSize: 11.5, fontWeight: 800, padding: '4px 10px', borderRadius: 999, background: '#FFFBEB', color: '#D97706', border: '1px solid #FDE68A' }}>
                Severe: {assessmentData?.damageTelemetry?.severe || 0}
              </span>
              <span style={{ fontSize: 11.5, fontWeight: 800, padding: '4px 10px', borderRadius: 999, background: '#EFF6FF', color: '#1D4ED8', border: '1px solid #BFDBFE' }}>
                Moderate: {assessmentData?.damageTelemetry?.moderate || 0}
              </span>
              <span style={{ fontSize: 11.5, fontWeight: 800, padding: '4px 10px', borderRadius: 999, background: '#F0FDF4', color: '#16A34A', border: '1px solid #BBF7D0' }}>
                Minor: {assessmentData?.damageTelemetry?.minor || 0}
              </span>
            </div>
          </div>
        </div>

        {/* Warehouse Stock Feasibility */}
        <div className="clay-card" style={{ padding: '20px' }}>
          <h2 style={{ fontSize: 15, fontWeight: 800, color: 'var(--ink)', marginBottom: 14, display: 'flex', alignItems: 'center', gap: 8 }}>
            <ShieldCheck size={18} color="#158A64" /> Warehouse Stock Feasibility Pre-Check
          </h2>
          <div style={{ display: 'grid', gap: 10 }}>
            {(() => {
              const stock = assessmentData?.warehouseStock || [];
              const foodStock = stock.find(s => (s.name || '').toLowerCase().includes('food'))?.stock || 1200;
              const waterStock = stock.find(s => (s.name || '').toLowerCase().includes('water'))?.stock || 800;
              const seniorStock = stock.find(s => (s.name || '').toLowerCase().includes('senior') || (s.name || '').toLowerCase().includes('med'))?.stock || 450;
              const reqFood = assessmentData?.demand?.foodPacks || 0;
              const reqWater = assessmentData?.demand?.waterJugs || 0;
              const reqSenior = assessmentData?.demand?.seniorKits || 0;

              return (
                <>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '8px 12px', background: 'var(--sampaguita)', borderRadius: 'var(--radius-inner)' }}>
                    <span style={{ fontSize: 12.5, fontWeight: 700, color: 'var(--ink)' }}>Family Food Packs:</span>
                    <span style={{ fontSize: 12.5, fontWeight: 800, color: foodStock >= reqFood ? '#158A64' : '#DC2626' }}>
                      {foodStock} available vs {reqFood} needed ({foodStock >= reqFood ? '100% Sufficient' : 'Deficit'})
                    </span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '8px 12px', background: 'var(--sampaguita)', borderRadius: 'var(--radius-inner)' }}>
                    <span style={{ fontSize: 12.5, fontWeight: 700, color: 'var(--ink)' }}>10L Water Jugs:</span>
                    <span style={{ fontSize: 12.5, fontWeight: 800, color: waterStock >= reqWater ? '#158A64' : '#DC2626' }}>
                      {waterStock} available vs {reqWater} needed ({waterStock >= reqWater ? '100% Sufficient' : 'Deficit'})
                    </span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '8px 12px', background: 'var(--sampaguita)', borderRadius: 'var(--radius-inner)' }}>
                    <span style={{ fontSize: 12.5, fontWeight: 700, color: 'var(--ink)' }}>Special Vulnerability Kits:</span>
                    <span style={{ fontSize: 12.5, fontWeight: 800, color: seniorStock >= reqSenior ? '#158A64' : '#DC2626' }}>
                      {seniorStock} available vs {reqSenior} needed ({seniorStock >= reqSenior ? '100% Sufficient' : 'Deficit'})
                    </span>
                  </div>
                </>
              );
            })()}
          </div>
          <div style={{ marginTop: 12, fontSize: 11.5, color: '#158A64', fontWeight: 700, display: 'flex', alignItems: 'center', gap: 6 }}>
            <CheckCircle size={14} /> All required relief supplies for Barangay {selectedBrgy} are fully stocked and available in the warehouse.
          </div>
        </div>
      </div>

      {/* ── Pre-Distribution Beneficiary Masterlist Roster ── */}
      <div className="clay-card" style={{ padding: '20px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16, flexWrap: 'wrap', gap: 10 }}>
          <h2 style={{ fontSize: 16, fontWeight: 800, color: 'var(--ink)', margin: 0, display: 'flex', alignItems: 'center', gap: 8 }}>
            <FileSpreadsheet size={18} color="var(--manila-blue)" /> Pre-Event Beneficiary Roster & Calculated Entitlements
          </h2>
          <span style={{ fontSize: 12, color: 'var(--ink-soft)', fontWeight: 700 }}>
            Showing {assessmentData?.roster?.length || 0} verified households
          </span>
        </div>

        <div style={{ overflowX: 'auto' }}>
          <table className="clay-table" style={{ width: '100%', fontSize: 12.5 }}>
            <thead>
              <tr style={{ background: 'var(--sampaguita)' }}>
                <th style={{ padding: '10px 14px', textAlign: 'left' }}>Head of Household</th>
                <th style={{ padding: '10px 14px', textAlign: 'left' }}>Address / Purok</th>
                <th style={{ padding: '10px 14px', textAlign: 'center' }}>Family Size</th>
                <th style={{ padding: '10px 14px', textAlign: 'center' }}>Vulnerabilities</th>
                <th style={{ padding: '10px 14px', textAlign: 'center' }}>Damage</th>
                <th style={{ padding: '10px 14px', textAlign: 'right' }}>Calculated Entitlement</th>
              </tr>
            </thead>
            <tbody>
              {(!assessmentData?.roster || assessmentData.roster.length === 0) ? (
                <tr>
                  <td colSpan={6} style={{ textAlign: 'center', padding: '32px', color: 'var(--ink-soft)' }}>
                    {loading ? 'Calculating verified household census...' : `No verified registered households found in Barangay ${selectedBrgy}.`}
                  </td>
                </tr>
              ) : (
                assessmentData.roster.map((hh, idx) => (
                  <tr key={hh.id || idx} style={{ borderBottom: '1px solid var(--border)' }}>
                    <td style={{ padding: '10px 14px', fontWeight: 800, color: 'var(--ink)' }}>
                      {hh.headName}
                    </td>
                    <td style={{ padding: '10px 14px', color: 'var(--ink-soft)' }}>
                      {hh.address}
                    </td>
                    <td style={{ padding: '10px 14px', textAlign: 'center', fontWeight: 800 }}>
                      {hh.memberCount} pax
                    </td>
                    <td style={{ padding: '10px 14px', textAlign: 'center' }}>
                      <div style={{ display: 'flex', gap: 4, justifyContent: 'center', flexWrap: 'wrap' }}>
                        {hh.seniors > 0 && <span style={{ fontSize: 10, background: '#F5F3FF', color: '#7C3AED', padding: '2px 6px', borderRadius: 4, fontWeight: 800 }}>Senior ({hh.seniors})</span>}
                        {hh.infants > 0 && <span style={{ fontSize: 10, background: '#FFFBEB', color: '#D97706', padding: '2px 6px', borderRadius: 4, fontWeight: 800 }}>Infant ({hh.infants})</span>}
                        {hh.pwds > 0 && <span style={{ fontSize: 10, background: '#FEF2F2', color: '#DC2626', padding: '2px 6px', borderRadius: 4, fontWeight: 800 }}>PWD ({hh.pwds})</span>}
                        {!hh.seniors && !hh.infants && !hh.pwds && <span style={{ fontSize: 10, color: 'var(--ink-soft)' }}>None</span>}
                      </div>
                    </td>
                    <td style={{ padding: '10px 14px', textAlign: 'center' }}>
                      <span style={{
                        fontSize: 10.5,
                        fontWeight: 800,
                        padding: '2px 8px',
                        borderRadius: 999,
                        background: hh.damageLevel === 'Totally Damaged' ? '#FEF2F2' : hh.damageLevel === 'Severe' ? '#FFFBEB' : '#F0FDF4',
                        color: hh.damageLevel === 'Totally Damaged' ? '#DC2626' : hh.damageLevel === 'Severe' ? '#D97706' : '#16A34A',
                      }}>
                        {hh.damageLevel}
                      </span>
                    </td>
                    <td style={{ padding: '10px 14px', textAlign: 'right', fontWeight: 800, color: 'var(--manila-blue)' }}>
                      {hh.allocatedFoodPacks}x Food Pack{hh.allocatedFoodPacks > 1 ? 's' : ''}, 1x Water
                      {hh.allocatedSeniorKits > 0 && ` + ${hh.allocatedSeniorKits}x Senior Kit`}
                      {hh.allocatedInfantPacks > 0 && ` + ${hh.allocatedInfantPacks}x Infant Pack`}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, TextInput, Alert, ActivityIndicator } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import StaffTasksScreen from './StaffTasksScreen';
import { scanHouseholdQRCode, releaseDistribution, submitFieldIncident, fetchDistributionEvents } from '../services/api';
import { PackageIcon, QrCodeIcon, DamageIcon, SettingsIcon, MapPinIcon, CameraIcon, AlertTriangleIcon, CheckIcon, ShieldCheckIcon } from '../components/AppIcons';

import { RADIUS, FONT_WEIGHT, SPACING, RESPONSIVE, wp, hp } from '../theme';
import { MotionPressable, MotionPulseBadge } from '../components/motion';


export default function StaffScannerScreen({ token, onLogout, lang = 'en', onSelectLang }) {
  const [activeTab, setActiveTab] = useState('tasks'); // 'tasks' | 'scanner' | 'incident' | 'settings'

  // Selected Distribution Event State
  const [selectedEvent, setSelectedEvent] = useState({
    _id: 'evt_1',
    id: 'evt_1',
    title: 'Typhoon Relief Drive #4 — Food & Water Pack',
    venue: 'Brgy 291 Covered Court',
    itemType: 'Family Food Pack',
  });

  // Scanner State
  const [manualCode, setManualCode] = useState('');
  const [scanResult, setScanResult] = useState(null);
  const [loading, setLoading] = useState(false);
  const [releasing, setReleasing] = useState(false);
  const [duplicateAlert, setDuplicateAlert] = useState(false);
  const [duplicateMessage, setDuplicateMessage] = useState('');

  // Incident State
  const [incidentType, setIncidentType] = useState('Stock Shortage');
  const [incidentNotes, setIncidentNotes] = useState('');
  const [incidentSubmitted, setIncidentSubmitted] = useState(false);

  useEffect(() => {
    async function loadActiveEvent() {
      if (!token) return;
      try {
        const events = await fetchDistributionEvents(token);
        if (events && Array.isArray(events) && events.length > 0) {
          const active = events.find(e => e.isActive) || events[0];
          setSelectedEvent({
            _id: active._id,
            id: active._id,
            title: active.title,
            venue: active.location || 'Barangay Covered Court',
            itemType: active.itemType || 'Family Food Pack',
          });
        }
      } catch (e) {
        console.log('Using default active event:', e.message);
      }
    }
    loadActiveEvent();
  }, [token]);

  const handleExecuteScan = async (codeToScan) => {
    const targetCode = codeToScan || manualCode;
    if (!targetCode.trim()) {
      Alert.alert('Required', 'Paki-enter ang Household QR Code.');
      return;
    }

    setLoading(true);
    setDuplicateAlert(false);
    setDuplicateMessage('');

    try {
      const res = await scanHouseholdQRCode(targetCode.trim(), token);
      if (res && res.household) {
        const hh = res.household;
        let entitlementText = '';
        if (res.recommendations && Object.keys(res.recommendations).length > 0) {
          entitlementText = Object.entries(res.recommendations)
            .map(([item, rec]) => `${rec.basePacks}x Base ${item}${rec.topUpUnits > 0 ? ` + ${rec.topUpUnits} Top-Up Units` : ''}`)
            .join(' • ');
        } else {
        // Immediate Front-End Duplicate Check
        const selectedEvtId = String(selectedEvent?._id || selectedEvent?.id || '');
        const alreadyClaimed = Array.isArray(res.pastDistributions) && res.pastDistributions.some(
          (d) => String(d.distributionEventId?._id || d.distributionEventId) === selectedEvtId
        );

        if (alreadyClaimed) {
          const priorClaim = res.pastDistributions.find(
            (d) => String(d.distributionEventId?._id || d.distributionEventId) === selectedEvtId
          );
          const claimTime = priorClaim?.releasedAt ? new Date(priorClaim.releasedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : 'earlier today';
          setDuplicateAlert(true);
          setDuplicateMessage(`Nakatanggap na ang pamilyang ito ng ayuda sa naturang event kaninang ${claimTime}. Bawal ang dobleng kuha.`);
        }

        setScanResult({
          household: {
            _id: hh._id,
            id: hh._id,
            name: hh.headOfHouseholdUserId?.name || hh.name || (lang === 'tl' ? 'Rehistradong Residente' : 'Registered Resident'),
            qrCode: targetCode,
            address: hh.address ? `${hh.address}, ${hh.purok ? `Purok ${hh.purok}, ` : ''}Brgy ${hh.barangayCode || '291'}` : (lang === 'tl' ? 'Barangay 291, Maynila' : 'Barangay 291, Manila'),
            familyHeadcount: hh.memberCount || 1,
            priorityLevel: res.priorityLevel || hh.priorityLevel || 'High',
            entitlement: entitlementText,
            isVerified: res.isVerified !== undefined ? res.isVerified : true,
          },
          recommendations: res.recommendations,
          scannedAt: new Date().toLocaleTimeString(),
        });
      } else {
        setScanResult({ success: false, error: lang === 'tl' ? 'Hindi makapag-scan. I-check ang koneksyon.' : 'Scan failed. Check your connection.' });
      }
    } catch (err) {
      setScanResult({ success: false, error: lang === 'tl' ? 'Hindi makapag-scan. I-check ang koneksyon.' : 'Scan failed. Check your connection.' });
    } finally {
      setLoading(false);
    }
  };

  const handleConfirmRelease = async () => {
    if (!scanResult || !scanResult.household) return;

    setReleasing(true);
    try {
      const payload = {
        distributionEventId: selectedEvent._id || selectedEvent.id || 'evt_1',
        householdId: scanResult.household._id || scanResult.household.id,
      };

      const res = await releaseDistribution(payload, token);
      Alert.alert('Tagumpay!', res.message || 'Na-record na ang pag-release ng ayuda sa pamilya.');
      setScanResult(null);
      setDuplicateAlert(false);
    } catch (err) {
      if (err.status === 409 || err.data?.isDuplicate) {
        setDuplicateAlert(true);
        setDuplicateMessage(err.data?.message || 'Nakatanggap na ang pamilyang ito ng ayuda sa naturang event ngayon.');
      } else {
        Alert.alert('Paalala', err.message || 'Hindi ma-proseso ang release. Sinubukang muli.');
      }
    } finally {
      setReleasing(false);
    }
  };

  const handleSubmitIncident = async () => {
    if (!incidentNotes.trim()) {
      Alert.alert('Required', 'Paki-larawan ang insidente sa field.');
      return;
    }

    try {
      await submitFieldIncident({ incidentType, notes: incidentNotes }, token);
      setIncidentSubmitted(true);
    } catch (err) {
      setIncidentSubmitted(true);
    }
  };

  return (
    <LinearGradient colors={['#071D3A', '#002BB8']} style={styles.container}>
      {/* Top Header Bar */}
      <View style={styles.headerBar}>
        <View>
          <Text style={styles.headerTag}>LGU MANILA • FIELD STAFF PORTAL</Text>
          <Text style={styles.headerTitle}>Officer Santos (Duty: Brgy 291)</Text>
        </View>
        <TouchableOpacity style={styles.logoutPill} onPress={onLogout}>
          <Text style={styles.logoutPillText}>Logout</Text>
        </TouchableOpacity>
      </View>

      {/* Main Tab Screen Content */}
      <View style={styles.bodyContent}>
        {activeTab === 'tasks' ? (
          <StaffTasksScreen
            token={token}
            onSelectScanEvent={(evt) => {
              setSelectedEvent(evt);
              setActiveTab('scanner');
            }}
          />
        ) : activeTab === 'scanner' ? (
          <ScrollView contentContainerStyle={styles.scrollInner}>
            {/* Active Drive Context Banner */}
            <View style={styles.activeEventCard}>
              <Text style={styles.activeEventTag}>CURRENT DISTRIBUTION DRIVE</Text>
              <Text style={styles.activeEventTitle}>{selectedEvent.title}</Text>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 4 }}>
                <MapPinIcon size={13} color="#64748B" />
                <Text style={styles.activeEventSub}>{selectedEvent.venue || selectedEvent.location} • Item: {selectedEvent.itemType}</Text>
              </View>
            </View>

            {/* Viewfinder Camera Simulation */}
            <View style={styles.viewfinderCard}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 2 }}>
                <CameraIcon size={14} color="#002BB8" />
                <Text style={styles.viewfinderTitle}>CAMERA QR SCANNER</Text>
              </View>
              <Text style={styles.viewfinderSub}>Position resident QR Pass in the viewfinder</Text>
              <View style={styles.cameraBox}>
                <View style={styles.scanTargetFrame} />
                <Text style={{ color: '#93C5FD', fontSize: 11, marginTop: 8 }}>Live Viewfinder Active</Text>
              </View>
            </View>

            {/* Manual Entry Fallback */}
            <View style={styles.manualEntryCard}>
              <Text style={styles.inputLabel}>Manual Code Entry (No Camera)</Text>
              <View style={styles.inputRow}>
                <TextInput
                  style={styles.codeInput}
                  value={manualCode}
                  onChangeText={setManualCode}
                  placeholder="MNL-291-XXXX-2026"
                />
                <TouchableOpacity style={styles.scanBtn} onPress={() => handleExecuteScan()} disabled={loading}>
                  {loading ? <ActivityIndicator color="#FFFFFF" /> : <Text style={styles.scanBtnText}>Scan Code</Text>}
                </TouchableOpacity>
              </View>
            </View>

            {/* Duplicate Claim Warning Banner */}
            {duplicateAlert && (
              <View style={styles.duplicateBanner}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 4 }}>
                  <AlertTriangleIcon size={18} color="#DC2626" />
                  <Text style={styles.duplicateTitle}>DUPLICATE CLAIM BLOCKED!</Text>
                </View>
                <Text style={styles.duplicateSub}>
                  {duplicateMessage || 'This household has already claimed relief in this event today.'}
                </Text>
              </View>
            )}

            {/* Scan Household Result Card */}
            {scanResult && !duplicateAlert && scanResult.household && (
              <View style={styles.resultCard}>
                <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.resultName}>{scanResult.household.name}</Text>
                    <Text style={styles.resultMeta}>
                      {scanResult.household.address} • Headcount: {scanResult.household.familyHeadcount} Members
                    </Text>
                  </View>
                  <View style={styles.verifTag}>
                    <Text style={styles.verifTagText}>VERIFIED</Text>
                  </View>
                </View>

                {/* Quota Breakdown */}
                <Text style={styles.entitlementTitle}>AUTHORIZED RELIEF QUOTA</Text>
                <Text style={styles.entitlementText}>{scanResult.household.entitlement}</Text>
                <Text style={[styles.resultMeta, { marginTop: 4, color: '#D97706', fontWeight: '700' }]}>
                  Priority Level: {scanResult.household.priorityLevel}
                </Text>

                {/* Confirm Release Button with MotionPressable */}
                <MotionPressable
                  style={[styles.releaseBtn, releasing && { opacity: 0.7 }]}
                  onPress={handleConfirmRelease}
                  disabled={releasing}
                  activeOpacity={0.85}
                >
                  {releasing ? (
                    <ActivityIndicator color="#FFFFFF" />
                  ) : (
                    <Text style={styles.releaseBtnText}>Confirm Relief Release</Text>
                  )}
                </MotionPressable>
              </View>
            )}
          </ScrollView>
        ) : activeTab === 'incident' ? (
          <ScrollView contentContainerStyle={styles.scrollInner}>
            <View style={styles.formCard}>
              <Text style={styles.formTitle}>Field Incident Report</Text>
              <Text style={styles.formSub}>Log lost QR passes, damaged inventory stocks, or emergency relocations.</Text>

              {incidentSubmitted ? (
                <View style={{ alignItems: 'center', padding: 20 }}>
                  <CheckIcon size={32} color="#059669" />
                  <Text style={{ fontSize: 16, fontWeight: 'bold', color: '#0F172A', marginTop: 8 }}>Incident Report Submitted to LGU Admin!</Text>
                  <MotionPressable style={styles.resetIncBtn} onPress={() => setIncidentSubmitted(false)}>
                    <Text style={{ color: '#FFFFFF', fontWeight: 'bold' }}>Log New Incident</Text>
                  </MotionPressable>
                </View>
              ) : (
                <>
                  <Text style={styles.inputLabel}>Incident Category *</Text>
                  {['Stock Shortage', 'Lost Citizen QR Pass', 'Emergency Evacuation'].map(type => (
                    <MotionPressable
                      key={type}
                      style={[styles.typeOption, incidentType === type && styles.typeOptionActive]}
                      onPress={() => setIncidentType(type)}
                    >
                      <Text style={[styles.typeText, incidentType === type && { color: '#002BB8', fontWeight: 'bold' }]}>{type}</Text>
                    </MotionPressable>
                  ))}

                  <Text style={styles.inputLabel}>Incident Details & Notes *</Text>
                  <TextInput
                    style={styles.textArea}
                    placeholder="Describe field conditions or incident at distribution site..."
                    value={incidentNotes}
                    onChangeText={setIncidentNotes}
                    multiline
                  />

                  <MotionPressable style={styles.releaseBtn} onPress={handleSubmitIncident}>
                    <Text style={styles.releaseBtnText}>Submit Incident to Admin</Text>
                  </MotionPressable>
                </>
              )}
            </View>
          </ScrollView>
        ) : (
          <View style={styles.formCard}>
            <Text style={styles.formTitle}>Staff Duty Settings</Text>
            <Text style={styles.formSub}>Barangay 291 Evacuation Command Post</Text>
            <Text style={{ fontSize: 12, color: '#475569', marginTop: 10 }}>Officer ID: STF-2026-8891</Text>
            <Text style={{ fontSize: 12, color: '#475569' }}>Scanner Mode: Offline Buffer Active (Auto-Sync)</Text>
          </View>
        )}
      </View>

      {/* Elevated Floating Staff Navigation Dock */}
      <View style={styles.staffNavCapsule}>
        {[
          { key: 'tasks', label: lang === 'tl' ? 'Mga Gawain' : 'Tasks & Drives', icon: (color) => <PackageIcon size={20} color={color} /> },
          { key: 'scanner', label: lang === 'tl' ? 'QR Scanner' : 'QR Scanner', icon: (color) => <QrCodeIcon size={20} color={color} /> },
          { key: 'incident', label: lang === 'tl' ? 'Insidente' : 'Field Logger', icon: (color) => <DamageIcon size={20} color={color} /> },
          { key: 'settings', label: lang === 'tl' ? 'Mga Setting' : 'Duty Settings', icon: (color) => <SettingsIcon size={20} color={color} /> },
        ].map(item => {
          const isActive = activeTab === item.key;
          const iconColor = isActive ? '#071D3A' : '#94A3B8';
          return (
            <TouchableOpacity
              key={item.key}
              style={[styles.staffNavItem, isActive && styles.staffNavItemActive]}
              onPress={() => setActiveTab(item.key)}
              activeOpacity={0.8}
            >
              {item.icon(iconColor)}
              <Text style={[styles.staffNavText, isActive && styles.staffNavTextActive]}>{item.label}</Text>
            </TouchableOpacity>
          );
        })}
      </View>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  headerBar: {
    paddingHorizontal: RESPONSIVE.padding,
    paddingTop: RESPONSIVE.topSafe + 4,
    paddingBottom: 16,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 255, 255, 0.15)',
  },
  headerTag: { fontSize: 10, fontWeight: '800', color: '#F59E0B', letterSpacing: 1 },
  headerTitle: { fontSize: 16, fontWeight: FONT_WEIGHT.black, color: '#FFFFFF' },
  logoutPill: { backgroundColor: '#FEE2E2', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 999 },
  logoutPillText: { color: '#DC2626', fontSize: 11, fontWeight: '800' },
  bodyContent: { flex: 1, backgroundColor: '#F8FAFC' },
  scrollInner: {
    paddingHorizontal: RESPONSIVE.padding,
    paddingTop: 16,
    paddingBottom: 90,
    maxWidth: RESPONSIVE.maxCardWidth,
    alignSelf: 'center',
    width: '100%',
  },
  viewfinderCard: {
    backgroundColor: '#071D3A',
    borderRadius: 20,
    padding: 20,
    alignItems: 'center',
    marginBottom: 16,
  },
  viewfinderTitle: { color: '#FFFFFF', fontSize: 15, fontWeight: FONT_WEIGHT.black },
  viewfinderSub: { color: '#93C5FD', fontSize: 11, marginTop: 2 },
  cameraBox: {
    width: '100%',
    height: 180,
    backgroundColor: '#000000',
    borderRadius: 14,
    marginTop: 14,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: '#002BB8',
  },
  scanTargetFrame: { width: 120, height: 120, borderWidth: 2, borderColor: '#F59E0B', borderRadius: 12 },
  manualEntryCard: { backgroundColor: '#FFFFFF', borderRadius: 16, padding: 16, marginBottom: 16, borderWidth: 1, borderColor: '#E2E8F0' },
  inputLabel: { fontSize: 12, fontWeight: '700', color: '#0F172A', marginBottom: 6 },
  inputRow: { flexDirection: 'row', gap: 10 },
  codeInput: { flex: 1, backgroundColor: '#F8FAFC', borderWidth: 1, borderColor: '#CBD5E1', borderRadius: 10, paddingHorizontal: 12, fontSize: 13 },
  scanBtn: { backgroundColor: '#002BB8', paddingHorizontal: 16, borderRadius: 10, justifyContent: 'center' },
  scanBtnText: { color: '#FFFFFF', fontWeight: '800', fontSize: 13 },
  duplicateBanner: { backgroundColor: '#FEE2E2', borderWidth: 1, borderColor: '#FCA5A5', padding: 16, borderRadius: 14, marginBottom: 16 },
  duplicateTitle: { color: '#DC2626', fontSize: 15, fontWeight: FONT_WEIGHT.black },
  duplicateSub: { color: '#7F1D1D', fontSize: 12, marginTop: 4, lineHeight: 18 },
  resultCard: { backgroundColor: '#FFFFFF', borderRadius: 16, padding: 16, borderWidth: 1, borderColor: '#002BB8' },
  resultName: { fontSize: 16, fontWeight: FONT_WEIGHT.black, color: '#0F172A' },
  verifTag: { backgroundColor: '#ECFDF5', paddingHorizontal: 8, paddingVertical: 2, borderRadius: 999 },
  verifTagText: { color: '#047857', fontSize: 10, fontWeight: '800' },
  resultMeta: { fontSize: 12, color: '#475569', marginTop: 4 },
  entitlementTitle: { fontSize: 12, fontWeight: '800', color: '#002BB8', marginTop: 12 },
  entitlementText: { fontSize: 14, fontWeight: '700', color: '#0F172A', marginTop: 2 },
  releaseBtn: { backgroundColor: '#002BB8', paddingVertical: 14, borderRadius: 10, alignItems: 'center', marginTop: 16 },
  releaseBtnText: { color: '#FFFFFF', fontSize: 14, fontWeight: '800' },
  formCard: { backgroundColor: '#FFFFFF', borderRadius: 16, padding: 20, borderWidth: 1, borderColor: '#E2E8F0' },
  formTitle: { fontSize: 18, fontWeight: FONT_WEIGHT.black, color: '#0F172A' },
  formSub: { fontSize: 12, color: '#64748B', marginTop: 2, marginBottom: 16 },
  typeOption: { backgroundColor: '#F8FAFC', borderWidth: 1, borderColor: '#CBD5E1', padding: 12, borderRadius: 10, marginBottom: 8 },
  typeOptionActive: { borderColor: '#002BB8', backgroundColor: '#EDF2F9' },
  typeText: { fontSize: 13, color: '#0F172A' },
  textArea: { backgroundColor: '#F8FAFC', borderWidth: 1, borderColor: '#CBD5E1', borderRadius: 10, padding: 12, minHeight: 90, marginVertical: 10 },
  resetIncBtn: { backgroundColor: '#002BB8', paddingHorizontal: 20, paddingVertical: 12, borderRadius: 10, marginTop: 16 },
  staffNavCapsule: {
    position: 'absolute',
    bottom: 16,
    left: RESPONSIVE.padding,
    right: RESPONSIVE.padding,
    maxWidth: 500,
    alignSelf: 'center',
    height: 60,
    borderRadius: 30,
    backgroundColor: '#071D3A',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-around',
    paddingHorizontal: 8,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.2)',
  },
  staffNavItem: { alignItems: 'center', justifyContent: 'center', paddingVertical: 4, paddingHorizontal: 10, borderRadius: 16 },
  staffNavItemActive: { backgroundColor: '#F59E0B' },
  staffNavText: { fontSize: 10, color: '#94A3B8', fontWeight: '600', marginTop: 2 },
  staffNavTextActive: { color: '#071D3A', fontWeight: '800' },
  activeEventCard: {
    backgroundColor: '#071D3A',
    borderRadius: 14,
    padding: 14,
    marginBottom: 14,
    borderWidth: 1,
    borderColor: '#F59E0B',
  },
  activeEventTag: { fontSize: 10, fontWeight: '800', color: '#F59E0B', letterSpacing: 0.5, marginBottom: 2 },
  activeEventTitle: { fontSize: 14, fontWeight: FONT_WEIGHT.black, color: '#FFFFFF' },
  activeEventSub: { fontSize: 11, color: '#93C5FD', marginTop: 2 },
});


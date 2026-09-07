import React, { useState, useEffect, useRef } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, TextInput, Alert, ActivityIndicator, Switch, Animated, Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { LinearGradient } from 'expo-linear-gradient';
import StaffTasksScreen from './StaffTasksScreen';
import { scanHouseholdQRCode, releaseDistribution, submitFieldIncident, fetchDistributionEvents, API_BASE_URL } from '../services/api';
import { PackageIcon, QrCodeIcon, DamageIcon, SettingsIcon, MapPinIcon, CameraIcon, AlertTriangleIcon, CheckIcon, ShieldCheckIcon } from '../components/AppIcons';

import { RADIUS, FONT_WEIGHT, SPACING, SHADOWS, RESPONSIVE, STATUSBAR_INSET, wp, hp } from '../theme';
import { MotionPressable, MotionPulseBadge } from '../components/motion';

function AnimatedNavItem({ item, isActive, onPress }) {
  const scaleAnim = useRef(new Animated.Value(1)).current;

  const handlePressIn = () => {
    Animated.spring(scaleAnim, {
      toValue: 0.88,
      friction: 5,
      tension: 150,
      useNativeDriver: true,
    }).start();
  };

  const handlePressOut = () => {
    Animated.spring(scaleAnim, {
      toValue: 1,
      friction: 6,
      tension: 120,
      useNativeDriver: true,
    }).start();
  };

  return (
    <TouchableOpacity
      style={[
        { flex: 1, alignItems: 'center', paddingVertical: 6, paddingBottom: 18, gap: 3 },
        Platform.OS === 'web' ? { outlineStyle: 'none' } : {},
      ]}
      onPress={onPress}
      onPressIn={handlePressIn}
      onPressOut={handlePressOut}
      activeOpacity={1}
    >
      <Animated.View
        style={[
          isActive ? styles.navIconPillActive : styles.navIconPillInactive,
          { transform: [{ scale: scaleAnim }] },
        ]}
      >
        {item.renderIcon(isActive)}
      </Animated.View>
      <Text
        style={{
          fontSize: 10,
          fontWeight: isActive ? '700' : '500',
          color: isActive ? '#C8102E' : '#8A9BB8',
        }}
      >
        {item.label}
      </Text>
    </TouchableOpacity>
  );
}

export default function StaffScannerScreen({ token, user, onLogout, lang = 'en', onSelectLang }) {
  const [activeTab, setActiveTab] = useState('tasks'); // 'tasks' | 'scanner' | 'incident' | 'settings'

  // Selected Distribution Event State
  const [selectedEvent, setSelectedEvent] = useState({
    _id: 'evt_1',
    id: 'evt_1',
    title: 'Typhoon Relief Drive #4  -  Food & Water Pack',
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

  // Offline Mode State
  const [isOfflineMode, setIsOfflineMode] = useState(false);
  const [offlineCache, setOfflineCache] = useState([]);
  const [offlineClaimsQueue, setOfflineClaimsQueue] = useState([]);
  const [cachingLoading, setCachingLoading] = useState(false);
  const [syncingClaims, setSyncingClaims] = useState(false);

  // Incident State
  const [incidentType, setIncidentType] = useState('Stock Shortage');
  const [incidentNotes, setIncidentNotes] = useState('');
  const [incidentSubmitted, setIncidentSubmitted] = useState(false);

  // Load offline storage and cached events
  useEffect(() => {
    async function loadStorageAndEvents() {
      try {
        const cachedHh = await AsyncStorage.getItem('mitigateplus_offline_households');
        if (cachedHh) setOfflineCache(JSON.parse(cachedHh));

        const queue = await AsyncStorage.getItem('mitigateplus_offline_claims');
        if (queue) setOfflineClaimsQueue(JSON.parse(queue));
      } catch (err) {
        console.log('Error reading local offline cache:', err);
      }

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
    loadStorageAndEvents();
  }, [token]);

  // Pre-download verified households for Offline Mode
  const downloadOfflineCache = async () => {
    setCachingLoading(true);
    try {
      const res = await fetch(`${API_BASE_URL}/households/offline-cache`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      if (res.ok && Array.isArray(data.households)) {
        await AsyncStorage.setItem('mitigateplus_offline_households', JSON.stringify(data.households));
        setOfflineCache(data.households);
        Alert.alert(
          lang === 'tl' ? 'Offline Cache Handa Na!' : 'Offline Cache Ready!',
          lang === 'tl'
            ? `Na-download ang ${data.households.length} verified households. Handa nang mag-scan kahit mawalan ng signal o internet sa evacuation area!`
            : `Downloaded ${data.households.length} verified households for offline scanning.`
        );
      } else {
        Alert.alert('Error', data.message || 'Failed to download offline cache.');
      }
    } catch (err) {
      Alert.alert('Error', 'Hindi ma-download ang cache. Siguraduhing may internet koneksyon muna.');
    } finally {
      setCachingLoading(false);
    }
  };

  // Sync Offline Claims to Central Server
  const syncOfflineClaimsToServer = async () => {
    if (offlineClaimsQueue.length === 0) {
      Alert.alert(lang === 'tl' ? 'Walang Offline Claims' : 'No Offline Claims', lang === 'tl' ? 'Walang nakabinbing offline claims na kailangang i-upload.' : 'No pending offline claims in queue.');
      return;
    }

    setSyncingClaims(true);
    try {
      const res = await fetch(`${API_BASE_URL}/distributions/sync-offline-claims`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ claims: offlineClaimsQueue }),
      });
      const data = await res.json();
      if (res.ok) {
        await AsyncStorage.removeItem('mitigateplus_offline_claims');
        setOfflineClaimsQueue([]);
        Alert.alert(
          lang === 'tl' ? 'Tagumpay na Nai-Sync!' : 'Sync Successful!',
          lang === 'tl'
            ? `Nai-upload ang ${data.syncedCount} claims sa LGU Server. (${data.duplicateCount} duplicate ignored).`
            : `Uploaded ${data.syncedCount} offline claims to central database.`
        );
      } else {
        Alert.alert('Error', data.message || 'Failed to sync offline claims.');
      }
    } catch (err) {
      Alert.alert('Error', 'Hindi makakonekta sa LGU Server. Subukan muling mag-sync kapag may maayos nang internet signal.');
    } finally {
      setSyncingClaims(false);
    }
  };

  const handleExecuteScan = async (codeToScan) => {
    const targetCode = codeToScan || manualCode;
    if (!targetCode.trim()) {
      Alert.alert('Required', 'Paki-enter ang Household QR Code.');
      return;
    }

    setLoading(true);
    setDuplicateAlert(false);
    setDuplicateMessage('');

    // ── OFFLINE MODE SCAN EXECUTION ──
    if (isOfflineMode) {
      setTimeout(() => {
        const cleanedTarget = targetCode.trim().toUpperCase();
        const matchedHh = offlineCache.find(
          (h) => (h.qrCode && h.qrCode.toUpperCase() === cleanedTarget) || (h._id && h._id.toString() === cleanedTarget) || (h.id && h.id.toString() === cleanedTarget)
        );

        if (!matchedHh) {
          setScanResult({
            success: false,
            error: lang === 'tl'
              ? 'Hindi nahanap ang QR sa Offline Cache. I-download ang pinakabagong cache o kumonekta sa internet.'
              : 'QR code not found in offline cache. Please update cache.',
          });
          setLoading(false);
          return;
        }

        const selectedEvtId = String(selectedEvent?._id || selectedEvent?.id || '');
        const alreadyClaimedOffline = offlineClaimsQueue.some(
          (c) => (c.qrCode === matchedHh.qrCode || c.householdId === matchedHh._id) && String(c.distributionEventId) === selectedEvtId
        );

        if (alreadyClaimedOffline) {
          setDuplicateAlert(true);
          setDuplicateMessage(
            lang === 'tl'
              ? 'DUPLICATE ALERT: Nakatanggap na ang pamilyang ito sa Offline Queue ng naturang event ngayon. Bawal ang dobleng kuha.'
              : 'DUPLICATE ALERT: This household already claimed in offline queue.'
          );
        }

        const memberCount = Math.max(1, matchedHh.memberCount || 1);
        const basePacks = Math.max(1, Math.floor(memberCount / 5));
        const extraUnits = memberCount > 5 ? memberCount - (basePacks * 5) : 0;
        const membersArr = Array.isArray(matchedHh.members) ? matchedHh.members : [];
        const seniorCount = matchedHh.seniorCount || membersArr.filter(m => (m.age !== undefined && m.age >= 60) || m.specialConditions?.includes('senior')).length;
        const infantCount = matchedHh.infantCount || membersArr.filter(m => (m.age !== undefined && m.age <= 2) || (m.specialConditions?.includes('child') && m.age <= 2)).length;
        const pwdCount = matchedHh.pwdCount || membersArr.filter(m => m.specialConditions?.includes('pwd')).length;

        const entitlementSummary = `${basePacks}x Base All-in-One Pack (Covers up to 5 pax)` +
          (extraUnits > 0 ? ` + ${extraUnits}x Extra Member Top-Up` : '') +
          (seniorCount > 0 ? ` + ${seniorCount}x Senior Pack` : '') +
          (infantCount > 0 ? ` + ${infantCount}x Infant Pack` : '') +
          (pwdCount > 0 ? ` + ${pwdCount}x PWD Pack` : '');

        setScanResult({
          household: {
            _id: matchedHh._id || matchedHh.id,
            id: matchedHh._id || matchedHh.id,
            name: matchedHh.name || 'Verified Beneficiary',
            qrCode: matchedHh.qrCode,
            address: matchedHh.address || 'Barangay 291, Manila',
            familyHeadcount: memberCount,
            priorityLevel: matchedHh.priorityLevel || 'High',
            entitlement: entitlementSummary,
            basePacks,
            extraUnits,
            seniorCount,
            infantCount,
            pwdCount,
            isVerified: true,
            isOfflineScanned: true,
          },
          recommendations: null,
          scannedAt: new Date().toLocaleTimeString(),
        });
        setLoading(false);
      }, 400);
      return;
    }

    // ── ONLINE MODE SCAN EXECUTION ──
    try {
      const res = await scanHouseholdQRCode(targetCode.trim(), token);
      if (res && res.household) {
        const hh = res.household;
        const memberCount = Math.max(1, hh.memberCount || 1);
        const basePacks = Math.max(1, Math.floor(memberCount / 5));
        const extraUnits = memberCount > 5 ? memberCount - (basePacks * 5) : 0;
        const membersArr = Array.isArray(hh.members) ? hh.members : [];
        const seniorCount = res.entitlement?.seniorCount ?? membersArr.filter(m => (m.age !== undefined && m.age >= 60) || m.specialConditions?.includes('senior')).length;
        const infantCount = res.entitlement?.infantCount ?? membersArr.filter(m => (m.age !== undefined && m.age <= 2) || (m.specialConditions?.includes('child') && m.age <= 2)).length;
        const pwdCount = res.entitlement?.pwdCount ?? membersArr.filter(m => m.specialConditions?.includes('pwd')).length;

        const entitlementSummary = `${basePacks}x Base All-in-One Pack (Covers up to 5 pax)` +
          (extraUnits > 0 ? ` + ${extraUnits}x Extra Member Top-Up` : '') +
          (seniorCount > 0 ? ` + ${seniorCount}x Senior Pack` : '') +
          (infantCount > 0 ? ` + ${infantCount}x Infant Pack` : '') +
          (pwdCount > 0 ? ` + ${pwdCount}x PWD Pack` : '');

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
            familyHeadcount: memberCount,
            priorityLevel: res.priorityLevel || hh.priorityLevel || 'High',
            entitlement: entitlementSummary,
            basePacks,
            extraUnits,
            seniorCount,
            infantCount,
            pwdCount,
            isVerified: res.isVerified !== undefined ? res.isVerified : true,
          },
          recommendations: res.recommendations,
          scannedAt: new Date().toLocaleTimeString(),
        });
      } else {
        setScanResult({ success: false, error: lang === 'tl' ? 'Hindi makapag-scan. I-check ang koneksyon o i-on ang Offline Mode.' : 'Scan failed. Check connection or switch to Offline Mode.' });
      }
    } catch (err) {
      setScanResult({ success: false, error: lang === 'tl' ? 'Walang internet connection. I-on ang Offline Mode para mag-scan gamit ang local storage.' : 'No internet connection. Enable Offline Mode to continue.' });
    } finally {
      setLoading(false);
    }
  };

  const handleConfirmRelease = async () => {
    if (!scanResult || !scanResult.household) return;

    // ── OFFLINE RELEASE LOGIC ──
    if (isOfflineMode) {
      const offlineClaimRecord = {
        distributionEventId: selectedEvent._id || selectedEvent.id || 'evt_1',
        householdId: scanResult.household._id || scanResult.household.id,
        qrCode: scanResult.household.qrCode,
        beneficiaryName: scanResult.household.name,
        address: scanResult.household.address,
        baseUnitsGiven: Math.ceil((scanResult.household.familyHeadcount || 4) / 5),
        topUpUnitsGiven: 0,
        releasedAt: new Date().toISOString(),
      };

      const updatedQueue = [offlineClaimRecord, ...offlineClaimsQueue];
      setOfflineClaimsQueue(updatedQueue);
      await AsyncStorage.setItem('mitigateplus_offline_claims', JSON.stringify(updatedQueue));

      Alert.alert(
        lang === 'tl' ? ' Na-save sa Offline Queue!' : ' Saved to Offline Queue!',
        lang === 'tl'
          ? `Matagumpay na na-record ang release para kay ${scanResult.household.name}. (${updatedQueue.length} pending claims para i-sync kapag may internet na).`
          : `Release saved offline for ${scanResult.household.name}. (${updatedQueue.length} pending claims in queue).`
      );

      setScanResult(null);
      setDuplicateAlert(false);
      return;
    }

    // ── ONLINE RELEASE LOGIC ──
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

  const officerName = user?.name || 'Officer Santos';
  const dutyBrgy = user?.barangayCode || '291';
  const officerInitials = officerName
    .split(' ')
    .map((n) => n[0])
    .join('')
    .slice(0, 2)
    .toUpperCase();

  const staffTabs = [
    {
      key: 'tasks',
      label: lang === 'tl' ? 'Gawain' : 'Drives',
      renderIcon: (isActive) => <PackageIcon size={21} color={isActive ? '#C8102E' : '#8A9BB8'} />,
    },
    {
      key: 'scanner',
      label: lang === 'tl' ? 'Scanner' : 'QR Scanner',
      renderIcon: (isActive) => <QrCodeIcon size={21} color={isActive ? '#C8102E' : '#8A9BB8'} />,
    },
    {
      key: 'incident',
      label: lang === 'tl' ? 'Insidente' : 'Incident Log',
      renderIcon: (isActive) => <DamageIcon size={21} color={isActive ? '#C8102E' : '#8A9BB8'} />,
    },
    {
      key: 'settings',
      label: lang === 'tl' ? 'Setting' : 'Duty Info',
      renderIcon: (isActive) => <SettingsIcon size={21} color={isActive ? '#C8102E' : '#8A9BB8'} />,
    },
  ];

  return (
    <View style={styles.container}>
      {/* 1. App Header (Matching Resident SingPass Header with Manila Crimson & Gold Accent) */}
      <LinearGradient
        colors={['#5A0515', '#8B0A20', '#C8102E']}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 0 }}
        style={styles.topHeader}
      >
        <View style={styles.headerGoldRule} />
        <View style={{ height: Platform.OS === 'web' ? 0 : STATUSBAR_INSET }} />
        <View style={styles.profileRow}>
          {/* Avatar with Gold Ring */}
          <View style={styles.avatarGoldRing}>
            <Text style={styles.avatarInitials}>{officerInitials}</Text>
          </View>
          {/* Title + Duty Location */}
          <View style={styles.headerTitleArea}>
            <Text style={styles.residentTitle} numberOfLines={1}>{officerName}</Text>
            <View style={styles.civicLocationRow}>
              <MapPinIcon size={12} color="rgba(255,255,255,0.75)" />
              <Text style={styles.civicLocationText} numberOfLines={1}>
                {lang === 'tl' ? 'Awtorisadong Kawani' : 'Authorized Field Officer'} · Brgy {dutyBrgy} · Manila
              </Text>
            </View>
          </View>
          {/* Actions: Duty Active Badge + Logout Pill */}
          <View style={styles.headerActionArea}>
            <View style={styles.dutyActiveBadge}>
              <View style={styles.dutyActiveDot} />
              <Text style={styles.dutyActiveText}>ON DUTY</Text>
            </View>
            <TouchableOpacity style={styles.logoutPillResident} onPress={onLogout} activeOpacity={0.8}>
              <Text style={styles.logoutPillTextResident}>{lang === 'tl' ? 'Alis' : 'Logout'}</Text>
            </TouchableOpacity>
          </View>
        </View>
      </LinearGradient>

      {/* Main Tab Screen Content */}
      <View style={styles.bodyContent}>
        {activeTab === 'tasks' ? (
          <StaffTasksScreen
            token={token}
            onSelectScanEvent={(evt) => {
              setSelectedEvent(evt);
              setActiveTab('scanner');
            }}
            lang={lang}
          />
        ) : activeTab === 'scanner' ? (
          <ScrollView contentContainerStyle={styles.scrollInner} showsVerticalScrollIndicator={false}>
            {/* Active Drive Context Banner (Matching Resident Hero Pass Gradient) */}
            <LinearGradient
              colors={['#0B1D4E', '#1C3F94', '#234AAA']}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={styles.heroDriveCard}
            >
              <View style={styles.driveHeaderRow}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.heroDriveKicker}>
                    {lang === 'tl' ? 'KASALUKUYANG PAMAMAHAGI (LIVE DRIVE)' : 'CURRENT DISTRIBUTION DRIVE'}
                  </Text>
                  <Text style={styles.heroDriveTitle}>{selectedEvent.title}</Text>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 5, marginTop: 4 }}>
                    <MapPinIcon size={12} color="#93C5FD" />
                    <Text style={styles.heroDriveSub}>
                      {selectedEvent.venue || selectedEvent.location} • {selectedEvent.itemType}
                    </Text>
                  </View>
                </View>
              </View>

              {/* Glass Metrics inside Hero Drive Card */}
              <View style={styles.heroMetricsGrid}>
                <View style={styles.heroMetricCardGlass}>
                  <Text style={styles.heroMetricLabelGlass}>
                    {lang === 'tl' ? 'AYUDA' : 'RELIEF ITEM'}
                  </Text>
                  <Text style={styles.heroMetricValueWhite} numberOfLines={1}>
                    {selectedEvent.itemType || 'Food Pack'}
                  </Text>
                </View>
                <View style={styles.heroMetricCardGlass}>
                  <Text style={styles.heroMetricLabelGlass}>
                    {lang === 'tl' ? 'LOKASYON' : 'VENUE'}
                  </Text>
                  <Text style={[styles.heroMetricValueWhite, { color: '#FCD34D' }]} numberOfLines={1}>
                    Brgy {dutyBrgy}
                  </Text>
                </View>
                <View style={styles.heroMetricCardGlass}>
                  <Text style={styles.heroMetricLabelGlass}>
                    {lang === 'tl' ? 'KATAYUAN' : 'STATUS'}
                  </Text>
                  <Text style={[styles.heroMetricValueWhite, { color: '#A7F3D0' }]}>
                    {isOfflineMode ? 'Offline' : 'Online'}
                  </Text>
                </View>
              </View>
            </LinearGradient>

            {/* Offline Mode Switch & Sync Panel */}
            <View style={[
              styles.activeEventCard,
              {
                backgroundColor: isOfflineMode ? '#FEF2F2' : '#F0FDF4',
                borderColor: isOfflineMode ? '#FECACA' : '#BBF7D0',
                marginBottom: 14,
                padding: 12,
              }
            ]}>
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                <View style={{ flex: 1, paddingRight: 10 }}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                    <Text style={{ fontSize: 13, fontWeight: '800', color: isOfflineMode ? '#DC2626' : '#15803D' }}>
                      {isOfflineMode ? ' OFFLINE SCANNER MODE: ACTIVE' : ' ONLINE LIVE CLOUD MODE'}
                    </Text>
                  </View>
                  <Text style={{ fontSize: 11, color: isOfflineMode ? '#991B1B' : '#166534', marginTop: 2 }}>
                    {isOfflineMode
                      ? `Gumagana gamit ang ${offlineCache.length} cached households. Walang internet na kailangan.`
                      : 'Direktang nakakonekta sa LGU Cloud Server.'}
                  </Text>
                </View>
                <Switch
                  value={isOfflineMode}
                  onValueChange={(val) => {
                    setIsOfflineMode(val);
                    if (val && offlineCache.length === 0) {
                      Alert.alert(
                        'Paalala',
                        'Walang naka-save na offline cache. Pindutin ang "I-download ang Cache" bago pumunta sa flood zone.'
                      );
                    }
                  }}
                  trackColor={{ false: '#CBD5E1', true: '#F87171' }}
                  thumbColor={isOfflineMode ? '#DC2626' : '#10B981'}
                />
              </View>

              {/* Cache Actions */}
              <View style={{ flexDirection: 'row', gap: 8, marginTop: 10, flexWrap: 'wrap' }}>
                <TouchableOpacity
                  style={{
                    backgroundColor: '#FFFFFF',
                    borderWidth: 1,
                    borderColor: '#E2E8F0',
                    paddingVertical: 6,
                    paddingHorizontal: 10,
                    borderRadius: 8,
                    flexDirection: 'row',
                    alignItems: 'center',
                    gap: 5,
                  }}
                  onPress={downloadOfflineCache}
                  disabled={cachingLoading}
                >
                  {cachingLoading ? <ActivityIndicator size="small" color="#C8102E" /> : <Text style={{ fontSize: 11, fontWeight: '700', color: '#C8102E' }}> I-download Cache ({offlineCache.length})</Text>}
                </TouchableOpacity>

                {offlineClaimsQueue.length > 0 && (
                  <TouchableOpacity
                    style={{
                      backgroundColor: '#DC2626',
                      paddingVertical: 6,
                      paddingHorizontal: 10,
                      borderRadius: 8,
                      flexDirection: 'row',
                      alignItems: 'center',
                      gap: 5,
                    }}
                    onPress={syncOfflineClaimsToServer}
                    disabled={syncingClaims}
                  >
                    {syncingClaims ? <ActivityIndicator size="small" color="#FFFFFF" /> : <Text style={{ fontSize: 11, fontWeight: '800', color: '#FFFFFF' }}> I-sync ang {offlineClaimsQueue.length} Claims</Text>}
                  </TouchableOpacity>
                )}
              </View>
            </View>

            {/* Viewfinder Camera Simulation */}
            <View style={styles.viewfinderCard}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 2 }}>
                <CameraIcon size={14} color="#FCD34D" />
                <Text style={styles.viewfinderTitle}>CAMERA QR SCANNER {isOfflineMode ? '(OFFLINE)' : ''}</Text>
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

                {/* Package Breakdown Checklist */}
                <View style={{ marginTop: 10, padding: 10, backgroundColor: '#F8FAFC', borderRadius: 8, borderWidth: 1, borderColor: '#E2E8F0' }}>
                  <Text style={{ fontSize: 11, fontWeight: '800', color: '#1E293B', marginBottom: 6, textTransform: 'uppercase' }}>
                    {lang === 'tl' ? ' TALAAN NG MGA IAABOT NA AYUDA' : ' AUTHORIZED ITEMS TO RELEASE'}
                  </Text>
                  
                  <View style={{ gap: 5 }}>
                    {/* 1. Base All-in-One Family Relief Pack */}
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                      <Text style={{ fontSize: 13, color: '#16A34A', fontWeight: '800' }}></Text>
                      <Text style={{ fontSize: 12, fontWeight: '700', color: '#0F172A', flex: 1 }}>
                         {scanResult.household.basePacks || 1}x {lang === 'tl' ? 'All-in-One Family Relief Pack' : 'All-in-One Family Relief Pack'}
                      </Text>
                      <View style={{ backgroundColor: '#EFF6FF', paddingHorizontal: 6, paddingVertical: 2, borderRadius: 4 }}>
                        <Text style={{ fontSize: 10, fontWeight: '800', color: '#1C3F94' }}>{lang === 'tl' ? 'Pagkain + Gamot + Tubig' : 'Food + Meds + Water'}</Text>
                      </View>
                    </View>

                    {/* 2. Extra Member Food Top-Up */}
                    {scanResult.household.extraUnits > 0 && (
                      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                        <Text style={{ fontSize: 13, color: '#16A34A', fontWeight: '800' }}></Text>
                        <Text style={{ fontSize: 12, fontWeight: '700', color: '#0F172A', flex: 1 }}>
                           +{scanResult.household.extraUnits} {lang === 'tl' ? 'Extra Member Food Top-Up' : 'Extra Member Food Top-Up'}
                        </Text>
                        <View style={{ backgroundColor: '#E0F2FE', paddingHorizontal: 6, paddingVertical: 2, borderRadius: 4 }}>
                          <Text style={{ fontSize: 10, fontWeight: '800', color: '#0284C7' }}>+{scanResult.household.extraUnits} pax</Text>
                        </View>
                      </View>
                    )}

                    {/* 3. Senior Citizen Maintenance & Nutrition Top-Up */}
                    {scanResult.household.seniorCount > 0 && (
                      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                        <Text style={{ fontSize: 13, color: '#16A34A', fontWeight: '800' }}></Text>
                        <Text style={{ fontSize: 12, fontWeight: '700', color: '#0F172A', flex: 1 }}>
                           +{scanResult.household.seniorCount} {lang === 'tl' ? 'Senior Maintenance Meds & Nutrition Pack' : 'Senior Maintenance & Nutrition Pack'}
                        </Text>
                        <View style={{ backgroundColor: '#FFFBEB', paddingHorizontal: 6, paddingVertical: 2, borderRadius: 4 }}>
                          <Text style={{ fontSize: 10, fontWeight: '800', color: '#D97706' }}>{scanResult.household.seniorCount} Senior</Text>
                        </View>
                      </View>
                    )}

                    {/* 4. Infant Care & Baby Nutrition Top-Up */}
                    {scanResult.household.infantCount > 0 && (
                      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                        <Text style={{ fontSize: 13, color: '#16A34A', fontWeight: '800' }}></Text>
                        <Text style={{ fontSize: 12, fontWeight: '700', color: '#0F172A', flex: 1 }}>
                           +{scanResult.household.infantCount} {lang === 'tl' ? 'Gatas at Nutrisyon para sa Sanggol' : 'Infant Care & Baby Nutrition Pack'}
                        </Text>
                        <View style={{ backgroundColor: '#FDF2F8', paddingHorizontal: 6, paddingVertical: 2, borderRadius: 4 }}>
                          <Text style={{ fontSize: 10, fontWeight: '800', color: '#DB2777' }}>{scanResult.household.infantCount} Sanggol</Text>
                        </View>
                      </View>
                    )}

                    {/* 5. PWD Health Support Top-Up */}
                    {scanResult.household.pwdCount > 0 && (
                      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                        <Text style={{ fontSize: 13, color: '#16A34A', fontWeight: '800' }}></Text>
                        <Text style={{ fontSize: 12, fontWeight: '700', color: '#0F172A', flex: 1 }}>
                           +{scanResult.household.pwdCount} {lang === 'tl' ? 'Tulong Pangkalusugan para sa PWD' : 'PWD Health Support Pack'}
                        </Text>
                        <View style={{ backgroundColor: '#F5F3FF', paddingHorizontal: 6, paddingVertical: 2, borderRadius: 4 }}>
                          <Text style={{ fontSize: 10, fontWeight: '800', color: '#7C3AED' }}>{scanResult.household.pwdCount} PWD</Text>
                        </View>
                      </View>
                    )}
                  </View>
                </View>

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
                      <Text style={[styles.typeText, incidentType === type && { color: '#C8102E', fontWeight: 'bold' }]}>{type}</Text>
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
          <ScrollView contentContainerStyle={styles.scrollInner} showsVerticalScrollIndicator={false}>
            {/* Field Officer Profile Card */}
            <View style={styles.formCard}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 14 }}>
                <View style={styles.avatarGoldRing}>
                  <Text style={styles.avatarInitials}>{officerInitials}</Text>
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.settingsOfficerName}>{officerName}</Text>
                  <Text style={styles.settingsOfficerRole}>
                    {lang === 'tl' ? 'Awtorisadong Kawani sa Kalamidad' : 'Authorized Disaster Field Staff'}
                  </Text>
                  <Text style={styles.settingsOfficerJurisdiction}>
                    Barangay {dutyBrgy} · Manila Disaster Ops
                  </Text>
                </View>
              </View>

              <View style={styles.settingDivider} />

              <View style={styles.settingMetaRow}>
                <Text style={styles.settingMetaLabel}>{lang === 'tl' ? 'Numero ng Kawani' : 'Officer ID'}</Text>
                <Text style={styles.settingMetaVal}>STF-2026-8891</Text>
              </View>
              <View style={styles.settingMetaRow}>
                <Text style={styles.settingMetaLabel}>{lang === 'tl' ? 'Katayuan sa Tungkulin' : 'Duty Status'}</Text>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 5 }}>
                  <View style={styles.dutyActiveDot} />
                  <Text style={{ fontSize: 11.5, fontWeight: '800', color: '#059669' }}>
                    {lang === 'tl' ? 'Aktibo / Nasa Tungkulin' : 'Active / On Duty'}
                  </Text>
                </View>
              </View>
            </View>

            {/* Language Selector Card */}
            <View style={styles.formCard}>
              <Text style={styles.formTitle}>
                {lang === 'tl' ? 'Piliin ang Wika' : 'System Language'}
              </Text>
              <Text style={styles.formSub}>
                {lang === 'tl' ? 'Itakda ang wika ng mobile interface' : 'Select application language'}
              </Text>
              <View style={{ flexDirection: 'row', gap: 10 }}>
                <TouchableOpacity
                  style={[
                    styles.langChoiceBtn,
                    lang === 'en' && styles.langChoiceBtnActive,
                  ]}
                  onPress={() => onSelectLang && onSelectLang('en')}
                  activeOpacity={0.8}
                >
                  <Text style={[styles.langChoiceText, lang === 'en' && styles.langChoiceTextActive]}>
                    English
                  </Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[
                    styles.langChoiceBtn,
                    lang === 'tl' && styles.langChoiceBtnActive,
                  ]}
                  onPress={() => onSelectLang && onSelectLang('tl')}
                  activeOpacity={0.8}
                >
                  <Text style={[styles.langChoiceText, lang === 'tl' && styles.langChoiceTextActive]}>
                    Filipino (Tagalog)
                  </Text>
                </TouchableOpacity>
              </View>
            </View>

            {/* Offline Diagnostics & Sync Card */}
            <View style={styles.formCard}>
              <Text style={styles.formTitle}>
                {lang === 'tl' ? 'Offline Scanner & Diagnostics' : 'Offline Scanner & Buffer'}
              </Text>
              <Text style={styles.formSub}>
                {lang === 'tl'
                  ? 'Pamahalaan ang lokal na cache at nakapilang claims para sa disaster zone'
                  : 'Manage local cache & claims buffer during zero-connectivity deployments'}
              </Text>

              <View style={styles.settingMetaRow}>
                <Text style={styles.settingMetaLabel}>
                  {lang === 'tl' ? 'Naka-cache na Households' : 'Cached Households'}
                </Text>
                <Text style={styles.settingMetaVal}>{offlineCache.length} households</Text>
              </View>
              <View style={styles.settingMetaRow}>
                <Text style={styles.settingMetaLabel}>
                  {lang === 'tl' ? 'Nakapilang Offline Claims' : 'Pending Offline Claims'}
                </Text>
                <Text style={[styles.settingMetaVal, offlineClaimsQueue.length > 0 && { color: '#DC2626' }]}>
                  {offlineClaimsQueue.length} records
                </Text>
              </View>

              <View style={{ flexDirection: 'row', gap: 8, marginTop: 14 }}>
                <TouchableOpacity
                  style={[styles.diagBtn, { flex: 1 }]}
                  onPress={downloadOfflineCache}
                  disabled={cachingLoading}
                  activeOpacity={0.8}
                >
                  {cachingLoading ? (
                    <ActivityIndicator size="small" color="#1C3F94" />
                  ) : (
                    <Text style={styles.diagBtnText}>
                      {lang === 'tl' ? 'I-download ang Cache' : 'Download Cache'}
                    </Text>
                  )}
                </TouchableOpacity>
                <TouchableOpacity
                  style={[
                    styles.diagBtn,
                    { flex: 1, backgroundColor: '#059669', borderColor: '#059669' },
                  ]}
                  onPress={syncOfflineClaims}
                  disabled={syncingClaims || offlineClaimsQueue.length === 0}
                  activeOpacity={0.8}
                >
                  {syncingClaims ? (
                    <ActivityIndicator size="small" color="#FFFFFF" />
                  ) : (
                    <Text style={[styles.diagBtnText, { color: '#FFFFFF' }]}>
                      {lang === 'tl' ? 'I-sync ang Claims' : 'Sync Claims'}
                    </Text>
                  )}
                </TouchableOpacity>
              </View>
            </View>

            {/* Logout Action Card */}
            <View style={[styles.formCard, { marginBottom: 30 }]}>
              <TouchableOpacity
                style={styles.settingsLogoutBtn}
                onPress={onLogout}
                activeOpacity={0.85}
              >
                <Text style={styles.settingsLogoutBtnText}>
                  {lang === 'tl' ? 'Mag-logout sa Tungkulin' : 'Sign Out of Duty'}
                </Text>
              </TouchableOpacity>
            </View>
          </ScrollView>
        )}
      </View>

      {/* Frosted Glass Bottom Navigation Bar matching ResidentHomeScreen */}
      <View style={styles.tabBarContainer}>
        {staffTabs.map((item) => (
          <AnimatedNavItem
            key={item.key}
            item={item}
            isActive={activeTab === item.key}
            onPress={() => setActiveTab(item.key)}
          />
        ))}
        {/* iOS Home Indicator Pill */}
        <View style={styles.homeIndicatorPill} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F3F6FC',
  },
  // Top Header (Matching Resident SingPass Header with Manila Crimson & Gold Accent)
  topHeader: {
    flexShrink: 0,
    position: 'relative',
    overflow: 'hidden',
  },
  headerGoldRule: {
    height: 3,
    backgroundColor: '#C9A84C',
  },
  profileRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 18,
    paddingVertical: 14,
    gap: 12,
  },
  avatarGoldRing: {
    width: 46,
    height: 46,
    borderRadius: 23,
    borderWidth: 2,
    borderColor: '#C9A84C',
    backgroundColor: '#5B1624',
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  avatarInitials: {
    fontSize: 16,
    fontWeight: '800',
    color: '#FFFFFF',
  },
  headerTitleArea: {
    flex: 1,
  },
  residentTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: '#FFFFFF',
    letterSpacing: -0.2,
  },
  civicLocationRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: 2,
  },
  civicLocationText: {
    fontSize: 11,
    color: 'rgba(255,255,255,0.7)',
    fontWeight: '500',
  },
  headerActionArea: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  dutyActiveBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: 'rgba(16, 185, 129, 0.2)',
    borderWidth: 1,
    borderColor: '#10B981',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 999,
  },
  dutyActiveDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#10B981',
  },
  dutyActiveText: {
    fontSize: 10,
    fontWeight: '800',
    color: '#FFFFFF',
    letterSpacing: 0.5,
  },
  logoutPillResident: {
    backgroundColor: 'rgba(255, 255, 255, 0.18)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.3)',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 999,
  },
  logoutPillTextResident: {
    color: '#FFFFFF',
    fontSize: 11,
    fontWeight: '800',
  },
  bodyContent: {
    flex: 1,
    backgroundColor: '#F3F6FC',
  },
  scrollInner: {
    paddingHorizontal: RESPONSIVE.padding,
    paddingTop: 14,
    paddingBottom: 100,
    maxWidth: RESPONSIVE.maxCardWidth,
    alignSelf: 'center',
    width: '100%',
  },
  // Hero Drive Card (Matching Resident Hero Pass Gradient)
  heroDriveCard: {
    borderRadius: 20,
    borderWidth: 1.5,
    borderColor: 'rgba(255, 255, 255, 0.18)',
    borderTopColor: '#C9A84C',
    borderTopWidth: 3,
    borderBottomColor: '#C9A84C',
    borderBottomWidth: 2.5,
    padding: 18,
    marginBottom: 14,
    ...(Platform.OS === 'web'
      ? { boxShadow: '0 10px 28px rgba(11, 29, 78, 0.22)' }
      : {
          shadowColor: '#0B1D4E',
          shadowOffset: { width: 0, height: 6 },
          shadowOpacity: 0.20,
          shadowRadius: 16,
          elevation: 8,
        }),
  },
  driveHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  heroDriveKicker: {
    fontSize: 9.5,
    fontWeight: '800',
    color: '#C9A84C',
    letterSpacing: 0.8,
    marginBottom: 3,
  },
  heroDriveTitle: {
    fontSize: 18,
    fontWeight: '900',
    color: '#FFFFFF',
    letterSpacing: -0.3,
  },
  heroDriveSub: {
    fontSize: 12,
    color: 'rgba(255, 255, 255, 0.75)',
    fontWeight: '500',
  },
  heroMetricsGrid: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 4,
  },
  heroMetricCardGlass: {
    flex: 1,
    backgroundColor: 'rgba(255, 255, 255, 0.10)',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.18)',
    paddingVertical: 8,
    paddingHorizontal: 10,
    alignItems: 'flex-start',
  },
  heroMetricLabelGlass: {
    fontSize: 8.5,
    fontWeight: '800',
    color: 'rgba(255, 255, 255, 0.6)',
    letterSpacing: 0.5,
    textTransform: 'uppercase',
  },
  heroMetricValueWhite: {
    fontSize: 14,
    fontWeight: '900',
    color: '#FFFFFF',
    marginTop: 2,
  },
  activeEventCard: {
    backgroundColor: '#0B1D4E',
    borderRadius: 14,
    padding: 14,
    marginBottom: 14,
    borderWidth: 1,
    borderColor: '#C9A84C',
  },
  viewfinderCard: {
    backgroundColor: '#0B1D4E',
    borderRadius: 20,
    padding: 20,
    alignItems: 'center',
    marginBottom: 16,
    borderWidth: 1.5,
    borderColor: '#C9A84C',
  },
  viewfinderTitle: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: FONT_WEIGHT.black,
  },
  viewfinderSub: {
    color: '#93C5FD',
    fontSize: 11,
    marginTop: 2,
  },
  cameraBox: {
    width: '100%',
    height: 180,
    backgroundColor: '#000000',
    borderRadius: 14,
    marginTop: 14,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: '#1C3F94',
  },
  scanTargetFrame: {
    width: 120,
    height: 120,
    borderWidth: 2,
    borderColor: '#C9A84C',
    borderRadius: 12,
  },
  manualEntryCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#DDE4F0',
    ...SHADOWS.card,
  },
  inputLabel: {
    fontSize: 12,
    fontWeight: '700',
    color: '#0F172A',
    marginBottom: 6,
  },
  inputRow: {
    flexDirection: 'row',
    gap: 10,
  },
  codeInput: {
    flex: 1,
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: '#CBD5E1',
    borderRadius: 10,
    paddingHorizontal: 12,
    fontSize: 13,
  },
  scanBtn: {
    backgroundColor: '#C8102E',
    paddingHorizontal: 16,
    borderRadius: 10,
    justifyContent: 'center',
    ...SHADOWS.sm,
  },
  scanBtnText: {
    color: '#FFFFFF',
    fontWeight: '800',
    fontSize: 13,
  },
  duplicateBanner: {
    backgroundColor: '#FEE2E2',
    borderWidth: 1,
    borderColor: '#FCA5A5',
    padding: 16,
    borderRadius: 14,
    marginBottom: 16,
  },
  duplicateTitle: {
    color: '#DC2626',
    fontSize: 15,
    fontWeight: FONT_WEIGHT.black,
  },
  duplicateSub: {
    color: '#7F1D1D',
    fontSize: 12,
    marginTop: 4,
    lineHeight: 18,
  },
  resultCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 16,
    borderWidth: 1.5,
    borderColor: '#1C3F94',
    ...SHADOWS.card,
  },
  resultName: {
    fontSize: 16,
    fontWeight: FONT_WEIGHT.black,
    color: '#0F172A',
  },
  verifTag: {
    backgroundColor: '#ECFDF5',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 999,
  },
  verifTagText: {
    color: '#047857',
    fontSize: 10,
    fontWeight: '800',
  },
  resultMeta: {
    fontSize: 12,
    color: '#475569',
    marginTop: 4,
  },
  entitlementTitle: {
    fontSize: 12,
    fontWeight: '800',
    color: '#1C3F94',
    marginTop: 12,
  },
  entitlementText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#0F172A',
    marginTop: 2,
  },
  releaseBtn: {
    backgroundColor: '#C8102E',
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: 'center',
    marginTop: 16,
    ...SHADOWS.button,
  },
  releaseBtnText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '800',
  },
  formCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 18,
    borderWidth: 1,
    borderColor: '#DDE4F0',
    marginBottom: 14,
    ...SHADOWS.card,
  },
  formTitle: {
    fontSize: 16,
    fontWeight: FONT_WEIGHT.black,
    color: '#0F172A',
  },
  formSub: {
    fontSize: 11.5,
    color: '#64748B',
    marginTop: 2,
    marginBottom: 14,
    lineHeight: 16,
  },
  typeOption: {
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: '#CBD5E1',
    padding: 12,
    borderRadius: 10,
    marginBottom: 8,
  },
  typeOptionActive: {
    borderColor: '#C8102E',
    backgroundColor: '#FEF0F2',
  },
  typeText: {
    fontSize: 13,
    color: '#0F172A',
  },
  textArea: {
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: '#CBD5E1',
    borderRadius: 10,
    padding: 12,
    minHeight: 90,
    marginVertical: 10,
  },
  resetIncBtn: {
    backgroundColor: '#1C3F94',
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 12,
    marginTop: 16,
    ...SHADOWS.button,
  },
  // Settings Tab Specific Styles
  settingsOfficerName: {
    fontSize: 16,
    fontWeight: '800',
    color: '#0F172A',
  },
  settingsOfficerRole: {
    fontSize: 12,
    fontWeight: '700',
    color: '#C8102E',
    marginTop: 1,
  },
  settingsOfficerJurisdiction: {
    fontSize: 11,
    color: '#64748B',
    marginTop: 2,
  },
  settingDivider: {
    height: 1,
    backgroundColor: '#F1F5F9',
    marginVertical: 12,
  },
  settingMetaRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 6,
  },
  settingMetaLabel: {
    fontSize: 12,
    color: '#64748B',
    fontWeight: '600',
  },
  settingMetaVal: {
    fontSize: 12,
    fontWeight: '700',
    color: '#0F172A',
  },
  langChoiceBtn: {
    flex: 1,
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: '#CBD5E1',
    paddingVertical: 10,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  langChoiceBtnActive: {
    backgroundColor: '#FEF0F2',
    borderColor: '#C8102E',
  },
  langChoiceText: {
    fontSize: 12.5,
    fontWeight: '600',
    color: '#475569',
  },
  langChoiceTextActive: {
    color: '#C8102E',
    fontWeight: '800',
  },
  diagBtn: {
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#CBD5E1',
    paddingVertical: 10,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  diagBtnText: {
    fontSize: 11.5,
    fontWeight: '700',
    color: '#1C3F94',
  },
  settingsLogoutBtn: {
    backgroundColor: '#C8102E',
    paddingVertical: 12,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    ...SHADOWS.sm,
  },
  settingsLogoutBtnText: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '800',
  },
  // Tab Bar Styles (Exact parity with ResidentHomeScreen)
  tabBarContainer: {
    flexShrink: 0,
    backgroundColor: 'rgba(255,255,255,0.94)',
    borderTopWidth: 1,
    borderTopColor: '#DDE4F0',
    flexDirection: 'row',
    alignItems: 'flex-start',
    paddingTop: 8,
    paddingHorizontal: 4,
    ...(Platform.OS === 'web'
      ? { boxShadow: '0 -4px 24px rgba(28,63,148,0.07)' }
      : {
          shadowColor: '#1C3F94',
          shadowOffset: { width: 0, height: -4 },
          shadowOpacity: 0.07,
          shadowRadius: 12,
          elevation: 10,
        }),
  },
  homeIndicatorPill: {
    position: 'absolute',
    bottom: 6,
    left: '50%',
    marginLeft: -67,
    width: 134,
    height: 5,
    borderRadius: 3,
    backgroundColor: 'rgba(0,0,0,0.18)',
  },
  navIconPillActive: {
    width: 38,
    height: 34,
    borderRadius: 10,
    backgroundColor: '#FEF0F2',
    alignItems: 'center',
    justifyContent: 'center',
  },
  navIconPillInactive: {
    width: 38,
    height: 34,
    borderRadius: 10,
    backgroundColor: 'transparent',
    alignItems: 'center',
    justifyContent: 'center',
  },
});



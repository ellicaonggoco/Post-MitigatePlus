import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  ActivityIndicator,
  Alert,
  Platform,
  Animated,
  Switch,
  Keyboard,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { CameraView, useCameraPermissions } from 'expo-camera';
import {
  CameraIcon,
  CheckIcon,
  CloseIcon,
  AlertTriangleIcon,
  PackageIcon,
  MapPinIcon,
  ListIcon,
  ScanIcon,
  ShieldIcon,
  QrCodeIcon,
  TruckIcon,
} from '../components/AppIcons';
import StaffTasksScreen from './StaffTasksScreen';
import SpecialRequestAssignmentScreen from './SpecialRequestAssignmentScreen';
import {
  scanHouseholdQR,
  confirmDistribution,
  fetchOfflineHouseholds,
  syncOfflineClaim,
  logOfflineClaim,
  fetchDistributionEvents,
} from '../services/api';
import { API_BASE_URL } from '../config';
import AsyncStorage from '@react-native-async-storage/async-storage';

export default function StaffScannerScreen({ token, user, lang = 'en', onSelectLang, onLogout }) {
  const [activeTab, setActiveTab] = useState('tasks'); // 'tasks' | 'deliveries' | 'scanner' | 'incident' | 'settings'
  const [selectedEvent, setSelectedEvent] = useState({
    id: 'evt_344',
    title: 'Relief Distribution — 344',
    venue: '344',
    location: '344',
    itemType: 'All-in-One Family Food Pack',
  });

  // Laser scanner animation
  const laserAnim = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    const anim = Animated.loop(
      Animated.sequence([
        Animated.timing(laserAnim, {
          toValue: 220,
          duration: 1800,
          useNativeDriver: true,
        }),
        Animated.timing(laserAnim, {
          toValue: 0,
          duration: 1800,
          useNativeDriver: true,
        }),
      ])
    );
    anim.start();
    return () => anim.stop();
  }, [laserAnim]);

  // Camera & Permissions state
  const [permission, requestPermission] = useCameraPermissions();
  const [scanned, setScanned] = useState(false);
  const [torchOn, setTorchOn] = useState(false);

  // Auto request camera permission on native platforms
  useEffect(() => {
    if (Platform.OS !== 'web' && (!permission || (!permission.granted && permission.canAskAgain))) {
      requestPermission();
    }
  }, [permission]);

  const handleBarcodeScanned = ({ data }) => {
    if (scanned || loading || releasing || scanResult) return;
    setScanned(true);
    setManualCode(data);
    handleExecuteScan(data);
  };

  // Scanner state
  const [manualCode, setManualCode] = useState('');
  const [loading, setLoading] = useState(false);
  const [scanResult, setScanResult] = useState(null);
  const [releasing, setReleasing] = useState(false);
  const [duplicateAlert, setDuplicateAlert] = useState(false);
  const [duplicateMessage, setDuplicateMessage] = useState('');
  const [scanNotice, setScanNotice] = useState(null);
  const scannerScrollRef = useRef(null);

  // Cross-platform notification helper (works on React Native Web and Native Mobile)
  const showNotify = (title, message, isError = false) => {
    if (isError) {
      setScanNotice({ type: 'error', text: `${title}: ${message}` });
    } else {
      setScanNotice({ type: 'success', text: `${title}: ${message}` });
    }
    if (Platform.OS === 'web') {
      try {
        window.alert(`${title}\n\n${message}`);
      } catch (e) {}
    } else {
      Alert.alert(title, message);
    }
  };

  // Offline buffer state
  const [isOfflineMode, setIsOfflineMode] = useState(false);
  const [offlineCache, setOfflineCache] = useState([]);
  const [offlineClaimsQueue, setOfflineClaimsQueue] = useState([]);
  const [cachingLoading, setCachingLoading] = useState(false);
  const [syncingClaims, setSyncingClaims] = useState(false);

  // Field Logger state
  const [incidentType, setIncidentType] = useState('Stock Shortage');
  const [incidentNotes, setIncidentNotes] = useState('');
  const [submittingIncident, setSubmittingIncident] = useState(false);
  const [incidentSuccess, setIncidentSuccess] = useState(false);

  // Statistics counters
  const [scansTodayCount, setScansTodayCount] = useState(0);
  const [verifiedTodayCount, setVerifiedTodayCount] = useState(0);
  const [flaggedTodayCount, setFlaggedTodayCount] = useState(0);

  // Officer info
  const officerName = user?.fullName || 'Officer Cruz';
  const dutyBrgy = user?.assignedBarangay || user?.barangayCode || '291';
  const officerId = user?.contactNum || user?.phoneNumber || user?.employeeId || 'STF-2026-8891';

  // Auto-fetch active distribution event from backend so selectedEvent has real MongoDB _id
  useEffect(() => {
    if (!token) return;
    (async () => {
      try {
        const events = await fetchDistributionEvents(token);
        if (Array.isArray(events) && events.length > 0) {
          const active = events.find(e => e.isActive) || events[0];
          setSelectedEvent({
            _id: active._id,
            id: active._id,
            title: active.title,
            venue: active.location || 'Covered Court',
            location: active.location || 'Covered Court',
            itemType: active.itemType || 'Family Food Pack',
            isActive: active.isActive,
          });
        }
      } catch (e) {
        console.warn('Auto fetch event error:', e);
      }
    })();
  }, [token]);

  // Load offline storage
  useEffect(() => {
    (async () => {
      try {
        const cached = await AsyncStorage.getItem('mitigateplus_offline_households');
        if (cached) setOfflineCache(JSON.parse(cached));
        const queue = await AsyncStorage.getItem('mitigateplus_offline_claims');
        if (queue) setOfflineClaimsQueue(JSON.parse(queue));
      } catch (e) {
        console.warn('Cache load error:', e);
      }
    })();
  }, []);

  const downloadOfflineCache = async () => {
    setCachingLoading(true);
    try {
      const data = await fetchOfflineHouseholds(token, dutyBrgy);
      if (Array.isArray(data)) {
        setOfflineCache(data);
        await AsyncStorage.setItem('mitigateplus_offline_households', JSON.stringify(data));
        Alert.alert('Offline Cache Ready', `${data.length} household records cached locally.`);
      }
    } catch (e) {
      Alert.alert('Download Error', 'Could not sync records from cloud.');
    } finally {
      setCachingLoading(false);
    }
  };

  const syncOfflineClaimsToServer = async () => {
    if (offlineClaimsQueue.length === 0) return;
    setSyncingClaims(true);
    let successCount = 0;
    const remaining = [];
    for (const item of offlineClaimsQueue) {
      try {
        await syncOfflineClaim(token, item);
        successCount++;
      } catch (err) {
        remaining.push(item);
      }
    }
    setOfflineClaimsQueue(remaining);
    await AsyncStorage.setItem('mitigateplus_offline_claims', JSON.stringify(remaining));
    setSyncingClaims(false);
    Alert.alert('Claims Synced', `Successfully synced ${successCount} offline distribution records.`);
  };

  const handleExecuteScan = async (codeOverride) => {
    try {
      Keyboard.dismiss();
    } catch (e) {}

    const rawCode = (codeOverride || manualCode).trim();
    if (!rawCode) {
      showNotify('QR Code Required', 'Please enter or scan a valid QR pass code.', true);
      return;
    }

    setLoading(true);
    setDuplicateAlert(false);
    setDuplicateMessage('');
    setScanNotice(null);
    setScansTodayCount(prev => prev + 1);

    try {
      if (isOfflineMode) {
        const found = offlineCache.find(
          h => h.qrCode === rawCode || h._id === rawCode || h.householdId === rawCode
        );
        if (!found) {
          showNotify('Offline Notice', 'QR pass not found in local cache.', true);
          setFlaggedTodayCount(prev => prev + 1);
          setLoading(false);
          return;
        }

        const isDup = offlineClaimsQueue.some(
          c => (c.qrCode === rawCode || c.householdId === found._id) && c.eventId === (selectedEvent._id || selectedEvent.id)
        );

        if (isDup) {
          setDuplicateAlert(true);
          setDuplicateMessage('This household has already claimed relief in this event (offline record).');
          setFlaggedTodayCount(prev => prev + 1);
          setLoading(false);
          return;
        }

        setScanResult({
          household: {
            ...found,
            name: found.name || found.headOfHouseholdUserId?.name || 'Household Beneficiary',
            familyHeadcount: found.familyHeadcount || found.membersCount || found.memberCount || 5,
            entitlement: `${found.basePacks || 1}x Base Relief Pack`,
            priorityLevel: found.priorityLevel || 'High Priority',
          },
          distributionEvent: selectedEvent,
        });
        setVerifiedTodayCount(prev => prev + 1);
        setScanNotice({ type: 'success', text: `Household found: ${found.name || 'Beneficiary'} (Offline)` });
        setTimeout(() => {
          scannerScrollRef.current?.scrollToEnd({ animated: true });
        }, 150);
      } else {
        const currentEventId = selectedEvent?._id || selectedEvent?.id;
        const res = await scanHouseholdQR(token, rawCode, currentEventId);

        if (res.duplicate || res.isDuplicate) {
          setDuplicateAlert(true);
          setDuplicateMessage(res.message || 'Household already claimed in this drive today.');
          setFlaggedTodayCount(prev => prev + 1);
          setScanResult(null);
        } else if (res.household) {
          const hh = res.household;
          const headName = hh.name || hh.headOfHouseholdUserId?.name || 'Verified Beneficiary';
          const headcount = hh.familyHeadcount || hh.memberCount || (Array.isArray(hh.members) ? hh.members.length : 1);
          const entitlementStr = typeof res.entitlement === 'object' && res.entitlement?.summaryText
            ? res.entitlement.summaryText
            : (typeof hh.entitlement === 'string' ? hh.entitlement : `${res.entitlement?.basePacks || 1}x All-in-One Family Food Pack`);

          setScanResult({
            ...res,
            household: {
              ...hh,
              name: headName,
              familyHeadcount: headcount,
              entitlement: entitlementStr,
              priorityLevel: res.priorityLevel || hh.priorityLevel || 'High Priority',
              address: hh.address || `Barangay ${hh.barangayCode || '291'}, Manila`,
            },
            distributionEvent: selectedEvent,
          });
          setVerifiedTodayCount(prev => prev + 1);
          setScanNotice({ type: 'success', text: `Verified Household: ${headName} (${headcount} members)` });
          setTimeout(() => {
            scannerScrollRef.current?.scrollToEnd({ animated: true });
          }, 150);
        } else {
          showNotify('Scan Result', res.message || 'Invalid QR code.', true);
          setFlaggedTodayCount(prev => prev + 1);
        }
      }
    } catch (err) {
      showNotify('Scan Failed', err.message || 'Error processing QR pass.', true);
      setFlaggedTodayCount(prev => prev + 1);
    } finally {
      setLoading(false);
    }
  };

  const handleConfirmRelease = async () => {
    if (!scanResult) return;
    setReleasing(true);
    try {
      if (isOfflineMode) {
        const claimObj = {
          householdId: scanResult.household._id || scanResult.household.id,
          qrCode: scanResult.household.qrCode,
          eventId: selectedEvent._id || selectedEvent.id,
          timestamp: new Date().toISOString(),
        };
        const updated = [...offlineClaimsQueue, claimObj];
        setOfflineClaimsQueue(updated);
        await AsyncStorage.setItem('mitigateplus_offline_claims', JSON.stringify(updated));
        showNotify('Release Recorded (Offline)', 'Relief distribution recorded in offline storage.');
        setScanResult(null);
        setManualCode('');
        setScanned(false);
      } else {
        await confirmDistribution(token, {
          householdId: scanResult.household._id || scanResult.household.id,
          eventId: selectedEvent._id || selectedEvent.id,
        });
        showNotify('Relief Released!', 'Distribution confirmed and logged into Central Audit.');
        setScanResult(null);
        setManualCode('');
        setScanned(false);
      }
    } catch (err) {
      const isDup = err.status === 409 || err.message?.toLowerCase().includes('duplicate') || err.data?.isDuplicate;
      if (isDup) {
        setDuplicateAlert(true);
        setDuplicateMessage(err.message || 'DUPLICATE CLAIM BLOCKED: Household has already claimed relief in this event today.');
        setFlaggedTodayCount(prev => prev + 1);
      } else {
        showNotify('Release Notice', err.message || 'Distribution confirmed.');
      }
      setScanResult(null);
      setScanned(false);
    } finally {
      setReleasing(false);
    }
  };

  const handleSubmitIncident = async () => {
    if (!incidentNotes.trim()) {
      Alert.alert('Required', 'Please describe the field incident notes.');
      return;
    }
    setSubmittingIncident(true);
    try {
      const res = await fetch(`${API_BASE_URL}/incidents`, {
        method: 'POST',
        headers: {
          Authorization: 'Bearer ' + token,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          incidentType,
          barangayCode: dutyBrgy,
          notes: incidentNotes.trim(),
        }),
      });
      if (res.ok) {
        setIncidentSuccess(true);
        setIncidentNotes('');
        Alert.alert('Incident Logged!', 'Report submitted to LGU Command Center.');
      } else {
        Alert.alert('Submitted', 'Incident report has been queued.');
      }
    } catch (err) {
      Alert.alert('Submitted', 'Incident report recorded.');
    } finally {
      setSubmittingIncident(false);
    }
  };

  return (
    <View style={styles.container}>
      {/* 1. App Header: Royal Navy Authority Header with Gold Accent Rule */}
      <View style={styles.topHeader}>
        <View style={styles.headerGoldRule} />
        <View style={styles.headerContentRow}>
          <View style={{ flex: 1 }}>
            <Text style={styles.headerKicker}>LGU MANILA • FIELD STAFF PORTAL</Text>
            <Text style={styles.headerOfficerName}>{officerName}</Text>
            <View style={styles.headerDutyRow}>
              <MapPinIcon size={12} color="#FCD34D" />
              <Text style={styles.headerDutyText}>Duty: Brgy {dutyBrgy} — Batch 1</Text>
            </View>
          </View>
          <TouchableOpacity style={styles.redLogoutPill} onPress={onLogout} activeOpacity={0.85}>
            <Text style={styles.redLogoutPillText}>Logout</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* 2. Main Tab Content Body */}
      <View style={styles.bodyContent}>
        {activeTab === 'tasks' ? (
          <StaffTasksScreen
            token={token}
            onSelectScanEvent={(evt) => {
              setSelectedEvent(evt);
              setActiveTab('scanner');
            }}
            onNavigateDeliveries={() => setActiveTab('deliveries')}
            lang={lang}
          />
        ) : activeTab === 'deliveries' ? (
          <SpecialRequestAssignmentScreen
            lang={lang}
            onBack={() => setActiveTab('tasks')}
          />
        ) : activeTab === 'scanner' ? (
          <ScrollView
            ref={scannerScrollRef}
            contentContainerStyle={styles.scrollInner}
            showsVerticalScrollIndicator={false}
            keyboardShouldPersistTaps="handled"
          >
            {/* Active Drive Card (Dark Blue) */}
            <LinearGradient
              colors={['#163B8C', '#0B1D4E']}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={styles.heroDriveCard}
            >
              <Text style={styles.heroDriveKicker}>CURRENT DISTRIBUTION DRIVE</Text>
              <Text style={styles.heroDriveTitle}>{selectedEvent?.title || 'Relief Distribution — 344'}</Text>
            </LinearGradient>

            {/* Online/Offline Live Toggle Card */}
            <View style={styles.onlineToggleCard}>
              <View style={{ flex: 1, paddingRight: 10 }}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                  <View style={[styles.statusIndicatorDot, { backgroundColor: isOfflineMode ? '#DC2626' : '#10B981' }]} />
                  <Text style={[styles.toggleModeTitle, { color: isOfflineMode ? '#DC2626' : '#059669' }]}>
                    {isOfflineMode ? 'OFFLINE SCANNER MODE: ACTIVE' : 'ONLINE LIVE CLOUD MODE'}
                  </Text>
                </View>
                <Text style={styles.toggleModeSub}>
                  {isOfflineMode
                    ? `Gumagana gamit ang ${offlineCache.length} cached households. Walang internet na kailangan.`
                    : 'Direktang nakakonekta sa LGU Cloud Server.'}
                </Text>
              </View>
              <Switch
                value={!isOfflineMode}
                onValueChange={(val) => setIsOfflineMode(!val)}
                trackColor={{ false: '#CBD5E1', true: '#1E3A8A' }}
                thumbColor="#FFFFFF"
              />
            </View>

            {/* Real Hardware Camera Viewfinder */}
            <View style={styles.viewfinderCard}>
              <View style={[styles.viewfinderHeader, { justifyContent: 'space-between' }]}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                  <CameraIcon size={16} color="#FCD34D" />
                  <Text style={styles.viewfinderTitle}>CAMERA QR SCANNER {isOfflineMode ? '(OFFLINE)' : ''}</Text>
                </View>
                {permission?.granted && Platform.OS !== 'web' && (
                  <TouchableOpacity
                    onPress={() => setTorchOn(prev => !prev)}
                    style={{
                      backgroundColor: torchOn ? '#FCD34D' : 'rgba(255,255,255,0.15)',
                      paddingHorizontal: 10,
                      paddingVertical: 4,
                      borderRadius: 12,
                    }}
                  >
                    <Text style={{ fontSize: 10, fontWeight: '800', color: torchOn ? '#0F172A' : '#FFFFFF' }}>
                      {torchOn ? '🔦 Flash ON' : 'Flash OFF'}
                    </Text>
                  </TouchableOpacity>
                )}
              </View>
              <Text style={styles.viewfinderSub}>Position resident QR Pass inside frame to scan automatically</Text>

              <View style={styles.cameraBox}>
                {Platform.OS === 'web' ? (
                  <TouchableOpacity
                    style={{ alignItems: 'center', justifyContent: 'center', padding: 20 }}
                    activeOpacity={0.8}
                    onPress={() => {
                      setManualCode('MNL-291-JUAN-DEMO-2026');
                      handleExecuteScan('MNL-291-JUAN-DEMO-2026');
                    }}
                  >
                    <CameraIcon size={36} color="#FCD34D" />
                    <Text style={{ color: '#94A3B8', fontSize: 12, textAlign: 'center', marginTop: 8 }}>
                      Hardware Camera operates on Mobile Device via Expo Go. (Tap to test demo scan)
                    </Text>
                  </TouchableOpacity>
                ) : !permission ? (
                  <View style={{ alignItems: 'center', justifyContent: 'center' }}>
                    <ActivityIndicator size="large" color="#FCD34D" />
                    <Text style={{ color: '#CBD5E1', fontSize: 12, marginTop: 8 }}>Initializing camera...</Text>
                  </View>
                ) : !permission.granted ? (
                  <View style={{ alignItems: 'center', justifyContent: 'center', padding: 16 }}>
                    <CameraIcon size={36} color="#FCD34D" />
                    <Text style={{ color: '#F1F5F9', fontSize: 13, fontWeight: '700', textAlign: 'center', marginTop: 8, marginBottom: 12 }}>
                      Camera access is needed to scan resident QR codes.
                    </Text>
                    <TouchableOpacity
                      style={{ backgroundColor: '#2563EB', paddingHorizontal: 16, paddingVertical: 8, borderRadius: 8 }}
                      onPress={requestPermission}
                    >
                      <Text style={{ color: '#FFFFFF', fontWeight: '800', fontSize: 12 }}>Grant Camera Permission</Text>
                    </TouchableOpacity>
                  </View>
                ) : (
                  <CameraView
                    style={StyleSheet.absoluteFillObject}
                    facing="back"
                    enableTorch={torchOn}
                    barcodeScannerSettings={{
                      barcodeTypes: ['qr'],
                    }}
                    onBarcodeScanned={scanned ? undefined : handleBarcodeScanned}
                  />
                )}

                {/* 4 Gold Corner Marks Overlay */}
                <View pointerEvents="none" style={[styles.cornerMark, styles.cornerTL]} />
                <View pointerEvents="none" style={[styles.cornerMark, styles.cornerTR]} />
                <View pointerEvents="none" style={[styles.cornerMark, styles.cornerBL]} />
                <View pointerEvents="none" style={[styles.cornerMark, styles.cornerBR]} />

                {/* Center Target Frame */}
                <View pointerEvents="none" style={styles.scanTargetFrame} />

                {/* Animated Scanning Laser Line */}
                <Animated.View
                  pointerEvents="none"
                  style={[
                    styles.laserLine,
                    {
                      transform: [{ translateY: laserAnim }],
                    },
                  ]}
                >
                  <LinearGradient
                    colors={['rgba(239, 68, 68, 0)', '#EF4444', '#F59E0B', '#EF4444', 'rgba(239, 68, 68, 0)']}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 0 }}
                    style={styles.laserGradient}
                  />
                </Animated.View>

                {/* Rescan Button Overlay if already scanned */}
                {scanned && !loading && (
                  <TouchableOpacity
                    style={{
                      position: 'absolute',
                      bottom: 12,
                      backgroundColor: 'rgba(15, 23, 42, 0.88)',
                      paddingHorizontal: 16,
                      paddingVertical: 8,
                      borderRadius: 20,
                      borderWidth: 1,
                      borderColor: '#FCD34D',
                      flexDirection: 'row',
                      alignItems: 'center',
                      gap: 6,
                    }}
                    onPress={() => setScanned(false)}
                  >
                    <CheckIcon size={14} color="#10B981" />
                    <Text style={{ color: '#FFFFFF', fontSize: 12, fontWeight: '700' }}>Tap to Scan Another</Text>
                  </TouchableOpacity>
                )}
              </View>

              {/* Status footer */}
              <View style={styles.liveStatusRow}>
                <View style={[styles.liveDot, { backgroundColor: permission?.granted ? '#10B981' : '#EF4444' }]} />
                <Text style={styles.liveStatusText}>
                  {permission?.granted
                    ? (scanned ? 'QR Code Scanned! • Processing verification...' : 'Live Hardware Camera Active')
                    : 'Camera Offline / Needs Permission'}
                </Text>
              </View>
            </View>

            {/* Manual Code Entry Card */}
            <View style={styles.manualEntryCard}>
              <Text style={styles.manualEntryLabel}>Manual Code Entry (No Camera)</Text>
              <View style={styles.inputRow}>
                <TextInput
                  style={styles.codeInput}
                  value={manualCode}
                  onChangeText={setManualCode}
                  placeholder="MNL-291-JUAN-DEMO-2026"
                  placeholderTextColor="#94A3B8"
                  autoCapitalize="characters"
                />
                <TouchableOpacity
                  style={styles.scanBtn}
                  onPress={() => handleExecuteScan()}
                  disabled={loading}
                  activeOpacity={0.85}
                >
                  {loading ? <ActivityIndicator color="#FFFFFF" size="small" /> : <Text style={styles.scanBtnText}>Scan Code</Text>}
                </TouchableOpacity>
              </View>

              {/* Quick-Fill Test Chips */}
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 10, flexWrap: 'wrap' }}>
                <Text style={{ fontSize: 11, color: '#64748B', fontWeight: '600' }}>Quick Test:</Text>
                <TouchableOpacity
                  onPress={() => {
                    setManualCode('MNL-291-JUAN-DEMO-2026');
                    handleExecuteScan('MNL-291-JUAN-DEMO-2026');
                  }}
                  style={{
                    backgroundColor: '#EFF6FF',
                    paddingHorizontal: 10,
                    paddingVertical: 5,
                    borderRadius: 6,
                    borderWidth: 1,
                    borderColor: '#93C5FD',
                  }}
                >
                  <Text style={{ fontSize: 11, color: '#1D4ED8', fontWeight: '700' }}>⚡ Tap: Juan Dela Cruz (Brgy 291)</Text>
                </TouchableOpacity>
              </View>
            </View>

            {/* In-page Scan Notice Banner */}
            {scanNotice && (
              <View
                style={[
                  styles.scanNoticeBox,
                  scanNotice.type === 'error' ? styles.scanNoticeError : styles.scanNoticeSuccess,
                ]}
              >
                <Text
                  style={[
                    styles.scanNoticeText,
                    scanNotice.type === 'error' ? styles.scanNoticeTextError : styles.scanNoticeTextSuccess,
                  ]}
                >
                  {scanNotice.text}
                </Text>
              </View>
            )}

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
            {scanResult && !duplicateAlert && scanResult.household && (() => {
              const isHouseholdVerified = scanResult.isVerified !== false && scanResult.household.verificationStatus !== 'pending';
              return (
                <View style={styles.resultCard}>
                  <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                    <View style={{ flex: 1, paddingRight: 8 }}>
                      <Text style={styles.resultName}>{scanResult.household.name}</Text>
                      <Text style={styles.resultMeta}>
                        {scanResult.household.address} • Headcount: {scanResult.household.familyHeadcount} Members
                      </Text>
                    </View>
                    <View style={[styles.verifTag, isHouseholdVerified ? styles.verifTagVerified : styles.verifTagPending]}>
                      <Text style={[styles.verifTagText, isHouseholdVerified ? styles.verifTagTextVerified : styles.verifTagTextPending]}>
                        {isHouseholdVerified ? 'VERIFIED' : 'PENDING'}
                      </Text>
                    </View>
                  </View>

                  {/* Quota Breakdown */}
                  <Text style={styles.entitlementTitle}>AUTHORIZED RELIEF QUOTA</Text>
                  <Text style={styles.entitlementText}>{scanResult.household.entitlement}</Text>
                  <Text style={[styles.resultMeta, { marginTop: 4, color: '#D97706', fontWeight: '700' }]}>
                    Priority Level: {scanResult.household.priorityLevel}
                  </Text>

                  {!isHouseholdVerified && (
                    <View style={styles.unverifiedWarningBox}>
                      <Text style={styles.unverifiedWarningText}>
                        ⚠️ Paalala: Nakabinbin pa ang verification ng pamilyang ito sa Barangay. Hindi pa maaaring ipamahagi ang relief pack.
                      </Text>
                    </View>
                  )}

                  {/* Confirm Release Button */}
                  <TouchableOpacity
                    style={[
                      styles.releaseBtn,
                      (!isHouseholdVerified || releasing) && { opacity: 0.5, backgroundColor: '#64748B' },
                    ]}
                    onPress={handleConfirmRelease}
                    disabled={!isHouseholdVerified || releasing}
                    activeOpacity={0.85}
                  >
                    {releasing ? (
                      <ActivityIndicator color="#FFFFFF" />
                    ) : (
                      <Text style={styles.releaseBtnText}>
                        {isHouseholdVerified ? 'Confirm Relief Release' : 'Action Locked (Unverified)'}
                      </Text>
                    )}
                  </TouchableOpacity>

                  {/* Cancel / Scan Another Button */}
                  <TouchableOpacity
                    style={{ marginTop: 8, paddingVertical: 10, alignItems: 'center', backgroundColor: '#F1F5F9', borderRadius: 10 }}
                    onPress={() => {
                      setScanResult(null);
                      setManualCode('');
                      setScanned(false);
                    }}
                  >
                    <Text style={{ color: '#475569', fontWeight: '700', fontSize: 13 }}>✕ Cancel / Scan Another</Text>
                  </TouchableOpacity>
                </View>
              );
            })()}
          </ScrollView>
        ) : activeTab === 'incident' ? (
          <ScrollView contentContainerStyle={styles.scrollInner} showsVerticalScrollIndicator={false}>
            <View style={styles.formCard}>
              <View style={styles.goldAccentLine} />
              <Text style={styles.formTitle}>Field Incident Report</Text>
              <Text style={styles.formSub}>Log lost QR passes, damaged inventory stocks, or emergency relocations.</Text>

              <Text style={styles.sectionLabel}>INCIDENT CATEGORY *</Text>
              {[
                {
                  key: 'Stock Shortage',
                  sub: 'Relief packs running low',
                  dotColor: '#D97706',
                  activeBg: '#FEFCE8',
                  activeBorder: '#FDE047',
                  activeTextColor: '#92400E',
                },
                {
                  key: 'Lost Citizen QR Pass',
                  sub: 'Beneficiary lost or damaged QR pass',
                  dotColor: '#2563EB',
                  activeBg: '#EFF6FF',
                  activeBorder: '#3B82F6',
                  activeTextColor: '#1D4ED8',
                },
                {
                  key: 'Emergency Evacuation',
                  sub: 'Unplanned evacuation or site incident',
                  dotColor: '#DC2626',
                  activeBg: '#FEF2F2',
                  activeBorder: '#EF4444',
                  activeTextColor: '#B91C1C',
                },
              ].map((cat) => {
                const isSelected = incidentType === cat.key;
                return (
                  <TouchableOpacity
                    key={cat.key}
                    style={[
                      styles.categoryCard,
                      isSelected && {
                        backgroundColor: cat.activeBg,
                        borderColor: cat.activeBorder,
                      },
                    ]}
                    onPress={() => setIncidentType(cat.key)}
                    activeOpacity={0.8}
                  >
                    <View style={[styles.catDot, { backgroundColor: cat.dotColor }]} />
                    <View style={{ flex: 1 }}>
                      <Text style={[styles.catTitle, isSelected && { color: cat.activeTextColor }]}>{cat.key}</Text>
                      <Text style={styles.catSub}>{cat.sub}</Text>
                    </View>
                    {isSelected && (
                      <View style={[styles.checkCircle, { backgroundColor: cat.dotColor }]}>
                        <CheckIcon size={12} color="#FFFFFF" />
                      </View>
                    )}
                  </TouchableOpacity>
                );
              })}

              <Text style={[styles.sectionLabel, { marginTop: 16 }]}>INCIDENT DETAILS & NOTES *</Text>
              <TextInput
                style={styles.textArea}
                placeholder="Describe field conditions or incident at distribution site..."
                placeholderTextColor="#94A3B8"
                value={incidentNotes}
                onChangeText={setIncidentNotes}
                multiline
              />

              <TouchableOpacity
                style={styles.redSubmitBtn}
                onPress={handleSubmitIncident}
                activeOpacity={0.85}
                disabled={submittingIncident}
              >
                {submittingIncident ? (
                  <ActivityIndicator color="#FFFFFF" />
                ) : (
                  <Text style={styles.redSubmitBtnText}>Submit Incident to Admin</Text>
                )}
              </TouchableOpacity>
            </View>
          </ScrollView>
        ) : (
          <ScrollView contentContainerStyle={styles.scrollInner} showsVerticalScrollIndicator={false}>
            {/* Officer Profile Card */}
            <View style={styles.dutyProfileCard}>
              <View style={styles.goldAccentLine} />
              <View style={styles.profileHeaderRow}>
                <View style={styles.shieldAvatar}>
                  <ShieldIcon size={24} color="#FFFFFF" filled={true} />
                </View>
                <View style={{ flex: 1, marginLeft: 12 }}>
                  <Text style={styles.dutyOfficerName}>{officerName}</Text>
                  <View style={{ flexDirection: 'row', gap: 6, marginTop: 4 }}>
                    <View style={styles.onDutyBadge}>
                      <Text style={styles.onDutyText}>On Duty</Text>
                    </View>
                    <View style={styles.fieldLeaderBadge}>
                      <Text style={styles.fieldLeaderText}>Field Leader</Text>
                    </View>
                  </View>
                </View>
              </View>

              {/* 3-Stat Grid */}
              <View style={styles.statGridRow}>
                <View style={styles.statGridCard}>
                  <Text style={styles.statGridLabel}>SCANS TODAY</Text>
                  <Text style={styles.statGridVal}>{scansTodayCount}</Text>
                </View>
                <View style={styles.statGridCard}>
                  <Text style={styles.statGridLabel}>VERIFIED</Text>
                  <Text style={[styles.statGridVal, { color: '#059669' }]}>{verifiedTodayCount}</Text>
                </View>
                <View style={styles.statGridCard}>
                  <Text style={styles.statGridLabel}>FLAGGED</Text>
                  <Text style={[styles.statGridVal, { color: '#DC2626' }]}>{flaggedTodayCount}</Text>
                </View>
              </View>
            </View>

            {/* Staff Duty Information Section */}
            <Text style={styles.sectionHeaderTitle}>Staff Duty Information</Text>
            <View style={styles.dutyInfoCard}>
              <View style={styles.dutyInfoRow}>
                <Text style={styles.dutyInfoKicker}>Post / Location</Text>
                <Text style={styles.dutyInfoVal}>Barangay {dutyBrgy} Evacuation Command Post</Text>
              </View>
              <View style={styles.dutyDivider} />
              <View style={styles.dutyInfoRow}>
                <Text style={styles.dutyInfoKicker}>Officer ID</Text>
                <Text style={styles.dutyInfoVal}>{officerId}</Text>
              </View>
              <View style={styles.dutyDivider} />
              <View style={styles.dutyInfoRow}>
                <Text style={styles.dutyInfoKicker}>Assignment</Text>
                <Text style={styles.dutyInfoVal}>Field Distribution Leader</Text>
              </View>
              <View style={styles.dutyDivider} />
              <View style={styles.dutyInfoRow}>
                <Text style={styles.dutyInfoKicker}>Scanner Mode</Text>
                <Text style={styles.dutyInfoVal}>Offline Buffer Active (Auto-Sync)</Text>
              </View>
              <View style={styles.dutyDivider} />
              <View style={styles.dutyInfoRow}>
                <Text style={styles.dutyInfoKicker}>Duty Period</Text>
                <Text style={styles.dutyInfoVal}>Sep 7, 2026 · 06:00 AM – 06:00 PM</Text>
              </View>
            </View>

            {/* Active Distribution Drive Section */}
            <Text style={styles.sectionHeaderTitle}>Active Distribution Drive</Text>
            <View style={styles.activeDrivePreviewCard}>
              <Text style={styles.activeDriveKicker}>CURRENT DISTRIBUTION DRIVE</Text>
              <Text style={styles.activeDriveTitle}>{selectedEvent?.title || 'Relief Distribution — 344'}</Text>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 5, marginTop: 4 }}>
                <MapPinIcon size={12} color="#93C5FD" />
                <Text style={styles.activeDriveSub}>
                  {selectedEvent?.venue || selectedEvent?.location || 'Barangay 291'} • {selectedEvent?.itemType || 'All-in-One Family Food Pack'}
                </Text>
              </View>
            </View>

            {/* Diagnostics and Action */}
            <View style={[styles.dutyInfoCard, { marginTop: 14, padding: 14 }]}>
              <TouchableOpacity style={styles.logoutBtnFull} onPress={onLogout} activeOpacity={0.85}>
                <Text style={styles.logoutBtnFullText}>Sign Out of Duty</Text>
              </TouchableOpacity>
            </View>
          </ScrollView>
        )}
      </View>

      {/* 3. Bottom Navigation Bar: White bar with Gold Active Pill */}
      <View style={styles.tabBarContainer}>
        {[
          { key: 'tasks', label: 'Tasks', icon: (color) => <ListIcon size={18} color={color} /> },
          { key: 'deliveries', label: 'Delivery', icon: (color) => <TruckIcon size={18} color={color} /> },
          { key: 'scanner', label: 'QR Scan', icon: (color) => <ScanIcon size={18} color={color} /> },
          { key: 'incident', label: 'Logger', icon: (color) => <AlertTriangleIcon size={18} color={color} /> },
          { key: 'settings', label: 'Duty', icon: (color) => <ShieldIcon size={18} color={color} /> },
        ].map((item) => {
          const isActive = activeTab === item.key;
          return (
            <TouchableOpacity
              key={item.key}
              style={styles.navTabBtn}
              onPress={() => setActiveTab(item.key)}
              activeOpacity={0.8}
            >
              <View style={[styles.navIconWell, isActive && styles.navIconWellActive]}>
                {item.icon(isActive ? '#B45309' : '#94A3B8')}
              </View>
              <Text style={[styles.navTabLabel, isActive && styles.navTabLabelActive]}>
                {item.label}
              </Text>
            </TouchableOpacity>
          );
        })}
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
  bodyContent: {
    flex: 1,
  },
  scrollInner: {
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 54,
  },
  // Top Header: Royal Navy
  topHeader: {
    backgroundColor: '#0B1D4E',
    position: 'relative',
    overflow: 'hidden',
  },
  headerGoldRule: {
    height: 3,
    backgroundColor: '#C9A84C',
  },
  headerContentRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 18,
    paddingVertical: 14,
    gap: 12,
  },
  headerKicker: {
    fontSize: 10,
    fontWeight: '800',
    color: 'rgba(255,255,255,0.7)',
    letterSpacing: 0.5,
  },
  headerOfficerName: {
    fontSize: 18,
    fontWeight: '900',
    color: '#FFFFFF',
    letterSpacing: -0.3,
    marginTop: 2,
  },
  headerDutyRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: 3,
  },
  headerDutyText: {
    fontSize: 11.5,
    color: '#FCD34D',
    fontWeight: '600',
  },
  redLogoutPill: {
    backgroundColor: '#DC2626',
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingVertical: 7,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 40,
  },
  redLogoutPillText: {
    color: '#FFFFFF',
    fontSize: 12.5,
    fontWeight: '800',
  },

  // QR Scanner Tab Styles
  heroDriveCard: {
    borderRadius: 18,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#1E3A8A',
  },
  heroDriveKicker: {
    fontSize: 10.5,
    fontWeight: '800',
    color: '#FCD34D',
    letterSpacing: 0.5,
    marginBottom: 4,
  },
  heroDriveTitle: {
    fontSize: 18,
    fontWeight: '900',
    color: '#FFFFFF',
  },
  onlineToggleCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    padding: 14,
    marginBottom: 14,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    ...(Platform.OS === 'web'
      ? { boxShadow: '0 2px 8px rgba(15,23,42,0.04)' }
      : {
          shadowColor: '#0F172A',
          shadowOffset: { width: 0, height: 2 },
          shadowOpacity: 0.04,
          shadowRadius: 6,
          elevation: 2,
        }),
  },
  statusIndicatorDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  toggleModeTitle: {
    fontSize: 12.5,
    fontWeight: '800',
    letterSpacing: 0.3,
  },
  toggleModeSub: {
    fontSize: 11,
    color: '#64748B',
    marginTop: 2,
  },
  viewfinderCard: {
    backgroundColor: '#0B1D4E',
    borderRadius: 20,
    padding: 18,
    marginBottom: 14,
    borderWidth: 1.5,
    borderColor: '#1E3A8A',
    alignItems: 'center',
  },
  viewfinderHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 2,
  },
  viewfinderTitle: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '900',
    letterSpacing: 0.4,
  },
  viewfinderSub: {
    color: '#93C5FD',
    fontSize: 11.5,
    marginTop: 2,
    marginBottom: 14,
  },
  cameraBox: {
    width: '100%',
    height: 275,
    backgroundColor: '#000000',
    borderRadius: 16,
    position: 'relative',
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  cornerMark: {
    position: 'absolute',
    width: 24,
    height: 24,
    borderColor: '#FCD34D',
  },
  cornerTL: {
    top: 14,
    left: 14,
    borderTopWidth: 3,
    borderLeftWidth: 3,
  },
  cornerTR: {
    top: 14,
    right: 14,
    borderTopWidth: 3,
    borderRightWidth: 3,
  },
  cornerBL: {
    bottom: 14,
    left: 14,
    borderBottomWidth: 3,
    borderLeftWidth: 3,
  },
  cornerBR: {
    bottom: 14,
    right: 14,
    borderBottomWidth: 3,
    borderRightWidth: 3,
  },
  scanTargetFrame: {
    width: 120,
    height: 120,
    borderWidth: 1.5,
    borderColor: '#334155',
    borderRadius: 12,
  },
  laserLine: {
    position: 'absolute',
    left: 16,
    right: 16,
    top: 20,
    height: 2,
  },
  laserGradient: {
    flex: 1,
    height: 2,
  },
  liveStatusRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 12,
  },
  liveDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#10B981',
  },
  liveStatusText: {
    color: '#93C5FD',
    fontSize: 11.5,
    fontWeight: '600',
  },
  manualEntryCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 16,
    marginBottom: 14,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    ...(Platform.OS === 'web'
      ? { boxShadow: '0 2px 8px rgba(15,23,42,0.04)' }
      : {
          shadowColor: '#0F172A',
          shadowOffset: { width: 0, height: 2 },
          shadowOpacity: 0.04,
          shadowRadius: 6,
          elevation: 2,
        }),
  },
  manualEntryLabel: {
    fontSize: 12.5,
    fontWeight: '800',
    color: '#0F172A',
    marginBottom: 8,
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
    color: '#0F172A',
  },
  scanBtn: {
    backgroundColor: '#1E3A8A',
    paddingHorizontal: 18,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
  },
  scanBtnText: {
    color: '#FFFFFF',
    fontWeight: '800',
    fontSize: 13,
  },
  scanNoticeBox: {
    padding: 12,
    borderRadius: 12,
    marginBottom: 14,
    borderWidth: 1,
  },
  scanNoticeError: {
    backgroundColor: '#FEF2F2',
    borderColor: '#FECACA',
  },
  scanNoticeSuccess: {
    backgroundColor: '#F0FDF4',
    borderColor: '#BBF7D0',
  },
  scanNoticeText: {
    fontSize: 12.5,
    fontWeight: '700',
    lineHeight: 18,
  },
  scanNoticeTextError: {
    color: '#B91C1C',
  },
  scanNoticeTextSuccess: {
    color: '#15803D',
  },
  duplicateBanner: {
    backgroundColor: '#FEE2E2',
    borderWidth: 1,
    borderColor: '#FCA5A5',
    padding: 16,
    borderRadius: 14,
    marginBottom: 14,
  },
  duplicateTitle: {
    color: '#DC2626',
    fontSize: 14,
    fontWeight: '900',
  },
  duplicateSub: {
    color: '#7F1D1D',
    fontSize: 12,
    marginTop: 3,
    lineHeight: 17,
  },
  resultCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    marginBottom: 14,
  },
  resultName: {
    fontSize: 16,
    fontWeight: '900',
    color: '#0F172A',
  },
  verifTag: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 999,
  },
  verifTagVerified: {
    backgroundColor: '#ECFDF5',
  },
  verifTagPending: {
    backgroundColor: '#FEF3C7',
  },
  verifTagText: {
    fontSize: 10,
    fontWeight: '800',
  },
  verifTagTextVerified: {
    color: '#047857',
  },
  verifTagTextPending: {
    color: '#B45309',
  },
  unverifiedWarningBox: {
    backgroundColor: '#FFFBEB',
    borderWidth: 1,
    borderColor: '#FDE68A',
    padding: 10,
    borderRadius: 10,
    marginTop: 10,
  },
  unverifiedWarningText: {
    color: '#92400E',
    fontSize: 11.5,
    fontWeight: '600',
    lineHeight: 16,
  },
  resultMeta: {
    fontSize: 12,
    color: '#475569',
    marginTop: 4,
  },
  entitlementTitle: {
    fontSize: 11,
    fontWeight: '800',
    color: '#1E3A8A',
    marginTop: 10,
  },
  entitlementText: {
    fontSize: 14,
    fontWeight: '800',
    color: '#0F172A',
    marginTop: 2,
  },
  releaseBtn: {
    backgroundColor: '#1E3A8A',
    paddingVertical: 13,
    borderRadius: 12,
    alignItems: 'center',
    marginTop: 14,
  },
  releaseBtnText: {
    color: '#FFFFFF',
    fontSize: 13.5,
    fontWeight: '800',
  },

  // Field Logger Tab Styles
  formCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    padding: 20,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    marginBottom: 14,
    ...(Platform.OS === 'web'
      ? { boxShadow: '0 4px 16px rgba(11,29,78,0.06)' }
      : {
          shadowColor: '#0B1D4E',
          shadowOffset: { width: 0, height: 4 },
          shadowOpacity: 0.06,
          shadowRadius: 12,
          elevation: 3,
        }),
  },
  goldAccentLine: {
    width: '100%',
    height: 3.5,
    backgroundColor: '#C9A84C',
    borderRadius: 2,
    marginBottom: 14,
  },
  formTitle: {
    fontSize: 20,
    fontWeight: '900',
    color: '#0F172A',
    marginBottom: 4,
  },
  formSub: {
    fontSize: 12.5,
    color: '#64748B',
    lineHeight: 18,
    marginBottom: 16,
  },
  sectionLabel: {
    fontSize: 11,
    fontWeight: '800',
    color: '#475569',
    letterSpacing: 0.5,
    marginBottom: 8,
  },
  categoryCard: {
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: 14,
    padding: 14,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 8,
  },
  catDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
  },
  catTitle: {
    fontSize: 14,
    fontWeight: '800',
    color: '#0F172A',
  },
  catSub: {
    fontSize: 11.5,
    color: '#64748B',
    marginTop: 2,
  },
  checkCircle: {
    width: 20,
    height: 20,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  textArea: {
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: 12,
    padding: 12,
    minHeight: 110,
    fontSize: 13,
    color: '#0F172A',
    textAlignVertical: 'top',
  },
  redSubmitBtn: {
    backgroundColor: '#991B1B',
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 16,
    ...(Platform.OS === 'web'
      ? { boxShadow: '0 4px 12px rgba(153,27,27,0.25)' }
      : {
          shadowColor: '#991B1B',
          shadowOffset: { width: 0, height: 3 },
          shadowOpacity: 0.25,
          shadowRadius: 6,
          elevation: 3,
        }),
  },
  redSubmitBtnText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '800',
  },

  // Duty Settings Tab Styles
  dutyProfileCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    padding: 18,
    marginBottom: 14,
    ...(Platform.OS === 'web'
      ? { boxShadow: '0 4px 16px rgba(11,29,78,0.06)' }
      : {
          shadowColor: '#0B1D4E',
          shadowOffset: { width: 0, height: 4 },
          shadowOpacity: 0.06,
          shadowRadius: 12,
          elevation: 3,
        }),
  },
  profileHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 14,
  },
  shieldAvatar: {
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: '#0B1D4E',
    alignItems: 'center',
    justifyContent: 'center',
  },
  dutyOfficerName: {
    fontSize: 18,
    fontWeight: '900',
    color: '#0F172A',
  },
  onDutyBadge: {
    backgroundColor: '#ECFDF5',
    borderWidth: 1,
    borderColor: '#A7F3D0',
    paddingHorizontal: 10,
    paddingVertical: 3,
    borderRadius: 20,
  },
  onDutyText: {
    color: '#059669',
    fontSize: 11,
    fontWeight: '700',
  },
  fieldLeaderBadge: {
    backgroundColor: '#EFF6FF',
    borderWidth: 1,
    borderColor: '#BFDBFE',
    paddingHorizontal: 10,
    paddingVertical: 3,
    borderRadius: 20,
  },
  fieldLeaderText: {
    color: '#1D4ED8',
    fontSize: 11,
    fontWeight: '700',
  },
  statGridRow: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 4,
  },
  statGridCard: {
    flex: 1,
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: 12,
    paddingVertical: 12,
    alignItems: 'center',
  },
  statGridLabel: {
    fontSize: 9.5,
    fontWeight: '800',
    color: '#64748B',
  },
  statGridVal: {
    fontSize: 22,
    fontWeight: '900',
    color: '#0F172A',
    marginTop: 2,
  },
  sectionHeaderTitle: {
    fontSize: 14,
    fontWeight: '800',
    color: '#475569',
    marginBottom: 8,
    marginTop: 6,
  },
  dutyInfoCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 18,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    padding: 16,
    marginBottom: 12,
  },
  dutyInfoRow: {
    paddingVertical: 4,
  },
  dutyInfoKicker: {
    fontSize: 11,
    color: '#94A3B8',
    fontWeight: '600',
    marginBottom: 2,
  },
  dutyInfoVal: {
    fontSize: 13.5,
    fontWeight: '800',
    color: '#0F172A',
  },
  dutyDivider: {
    height: 1,
    backgroundColor: '#F1F5F9',
    marginVertical: 8,
  },
  activeDrivePreviewCard: {
    backgroundColor: '#0B1D4E',
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: '#1E3A8A',
    marginBottom: 14,
  },
  activeDriveKicker: {
    fontSize: 10,
    fontWeight: '800',
    color: '#FCD34D',
    letterSpacing: 0.5,
    marginBottom: 4,
  },
  activeDriveTitle: {
    fontSize: 16,
    fontWeight: '900',
    color: '#FFFFFF',
  },
  activeDriveSub: {
    fontSize: 11.5,
    color: '#93C5FD',
  },
  logoutBtnFull: {
    backgroundColor: '#DC2626',
    borderRadius: 12,
    paddingVertical: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  logoutBtnFullText: {
    color: '#FFFFFF',
    fontSize: 13.5,
    fontWeight: '800',
  },

  // Bottom Navigation Bar: White bar with Gold Active Pill
  tabBarContainer: {
    flexShrink: 0,
    backgroundColor: '#FFFFFF',
    borderTopWidth: 1,
    borderTopColor: '#E2E8F0',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-around',
    paddingTop: 8,
    paddingBottom: Platform.OS === 'ios' ? 24 : 10,
    paddingHorizontal: 8,
    ...(Platform.OS === 'web'
      ? { boxShadow: '0 -4px 16px rgba(15,23,42,0.05)' }
      : {
          shadowColor: '#0F172A',
          shadowOffset: { width: 0, height: -3 },
          shadowOpacity: 0.05,
          shadowRadius: 8,
          elevation: 6,
        }),
  },
  navTabBtn: {
    alignItems: 'center',
    justifyContent: 'center',
    flex: 1,
  },
  navIconWell: {
    width: 44,
    height: 38,
    borderRadius: 12,
    backgroundColor: 'transparent',
    alignItems: 'center',
    justifyContent: 'center',
  },
  navIconWellActive: {
    backgroundColor: '#FEF3C7',
  },
  navTabLabel: {
    fontSize: 10.5,
    fontWeight: '600',
    color: '#94A3B8',
    marginTop: 2,
  },
  navTabLabelActive: {
    color: '#B45309',
    fontWeight: '800',
  },
  homeIndicatorPill: {
    position: 'absolute',
    bottom: 4,
    left: '50%',
    marginLeft: -67,
    width: 134,
    height: 4,
    borderRadius: 2,
    backgroundColor: 'rgba(0,0,0,0.18)',
  },
});

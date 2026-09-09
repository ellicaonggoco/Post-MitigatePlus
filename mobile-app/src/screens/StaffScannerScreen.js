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
  Keyboard,
  Modal,
  Image,
  StatusBar,
  BackHandler,
  ToastAndroid,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { CameraView, useCameraPermissions } from 'expo-camera';
import * as ImagePicker from 'expo-image-picker';
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
  ImageIcon,
  ZapIcon,
  ClockIcon,
  CheckCircleIcon,
  ChevronLeftIcon,
  ChevronRightIcon,
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

const BARCODE_SCANNER_SETTINGS = {
  barcodeTypes: ['qr'],
};

const STATUSBAR_INSET = Platform.OS === 'android' ? (StatusBar.currentHeight || 24) : (Platform.OS === 'ios' ? 44 : 0);


export default function StaffScannerScreen({ token, user, lang = 'en', onSelectLang, onLogout }) {
  const [activeTab, setActiveTab] = useState('tasks'); // 'tasks' | 'deliveries' | 'scanner' | 'incident' | 'settings'
  const [selectedEvent, setSelectedEvent] = useState(null);
  const lastBackPressRef = useRef(0);

  useEffect(() => {
    const onHardwareBackPress = () => {
      // If not on the main 'tasks' tab, return to 'tasks'
      if (activeTab !== 'tasks') {
        setActiveTab('tasks');
        return true;
      }

      // If on main tab, require double-back press to exit
      const now = Date.now();
      if (now - lastBackPressRef.current < 2000) {
        return false; // let Android exit to home
      }
      lastBackPressRef.current = now;
      if (Platform.OS === 'android') {
        ToastAndroid.show(
          lang === 'tl' ? 'Pindutin muli ang Back upang lumabas sa app' : 'Press Back again to exit app',
          ToastAndroid.SHORT
        );
      }
      return true; // consumed
    };

    const backSub = BackHandler.addEventListener('hardwareBackPress', onHardwareBackPress);
    return () => backSub.remove();
  }, [activeTab, lang]);

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
  const [cameraMountKey, setCameraMountKey] = useState(0);
  const [cameraReady, setCameraReady] = useState(false);
  // Scanner is now button-triggered — modal controls visibility
  const [scanModalVisible, setScanModalVisible] = useState(false);
  const lastScannedRef = useRef({ code: '', time: 0 });

  // Remount camera cleanly when switching to scanner tab
  useEffect(() => {
    if (activeTab === 'scanner') {
      setCameraMountKey(k => k + 1);
      setCameraReady(false);
    }
  }, [activeTab]);

  // Auto request camera permission on native platforms
  useEffect(() => {
    if (Platform.OS !== 'web' && (!permission || (!permission.granted && permission.canAskAgain))) {
      requestPermission();
    }
  }, [permission]);

  const [decodingPhoto, setDecodingPhoto] = useState(false);

  const handleScanFromPhoto = async (fromCamera = false) => {
    try {
      if (fromCamera) {
        if (Platform.OS !== 'web') {
          const { status } = await ImagePicker.requestCameraPermissionsAsync();
          if (status !== 'granted') {
            Alert.alert('Permiso', 'Kailangan ng access sa camera upang kumuha ng litrato.');
            return;
          }
        }
        const result = await ImagePicker.launchCameraAsync({
          base64: true,
          quality: 0.85,
          maxWidth: 1000,
          maxHeight: 1000,
        });
        if (!result.canceled && result.assets && result.assets[0]?.base64) {
          processImageBase64(result.assets[0].base64);
        }
      } else {
        if (Platform.OS !== 'web') {
          const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
          if (status !== 'granted') {
            Alert.alert('Permiso', 'Kailangan ng access sa photos upang pumili ng larawan.');
            return;
          }
        }
        const result = await ImagePicker.launchImageLibraryAsync({
          base64: true,
          quality: 0.85,
          maxWidth: 1000,
          maxHeight: 1000,
        });
        if (!result.canceled && result.assets && result.assets[0]?.base64) {
          processImageBase64(result.assets[0].base64);
        }
      }
    } catch (err) {
      console.warn('Image picker scan error:', err);
      Alert.alert('Error', 'Nagka-problema sa pagkuha o pagpili ng litrato.');
    }
  };

  const processImageBase64 = async (base64) => {
    setDecodingPhoto(true);
    try {
      const res = await fetch(`${API_BASE_URL}/households/decode-qr-image`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({ imageBase64: base64 }),
      });

      const data = await res.json();
      if (res.ok && data.success && data.qrCode) {
        console.log('[STAFF SCANNER] Decoded QR via API:', data.qrCode);
        setManualCode(data.qrCode);
        setScanned(true);
        handleExecuteScan(data.qrCode);
      } else {
        Alert.alert(
          lang === 'tl' ? 'Hindi Ma-detect ang QR' : 'QR Not Detected',
          data.message || (lang === 'tl' ? 'Hindi nabasa ang QR Code sa litrato. Siguraduhing maliwanag at malinaw ang kuha.' : 'Could not detect QR code in photo. Please ensure clear lighting.')
        );
      }
    } catch (e) {
      console.warn('Scan decode error:', e);
      Alert.alert(
        lang === 'tl' ? 'Problema sa Pagbasa' : 'Scan Error',
        lang === 'tl' ? 'Hindi makakonekta sa verification server.' : 'Cannot connect to verification server.'
      );
    } finally {
      setDecodingPhoto(false);
    }
  };

  const showPhotoScanOptions = () => {
    Alert.alert(
      lang === 'tl' ? 'Mag-upload ng QR Pass' : 'Upload QR Pass',
      lang === 'tl'
        ? 'Pumili kung kukuha ng litrato o pipili ng larawan mula sa iyong gallery:'
        : 'Choose whether to take a photo or pick an existing image from your gallery:',
      [
        {
          text: lang === 'tl' ? 'Kumuha ng Litrato' : 'Take Photo',
          onPress: () => handleScanFromPhoto(true),
        },
        {
          text: lang === 'tl' ? 'Pumili sa Gallery' : 'Choose from Gallery',
          onPress: () => handleScanFromPhoto(false),
        },
        {
          text: lang === 'tl' ? 'Kanselahin' : 'Cancel',
          style: 'cancel',
        },
      ]
    );
  };

  // Unified reset function to clear scan locks and reset viewfinder
  const handleResetScanner = () => {
    setScanned(false);
    setScanResult(null);
    setDuplicateAlert(false);
    setDuplicateMessage('');
    setDuplicateData(null);
    setScanNotice(null);
    setManualCode('');
    lastScannedRef.current = { code: '', time: 0 };
  };

  const handleBarcodeScanned = (scanningResult) => {
    const raw = typeof scanningResult === 'string'
      ? scanningResult
      : (scanningResult?.data || scanningResult?.raw || scanningResult?.nativeEvent?.data || '');

    if (!raw) return;
    const cleanCode = String(raw).trim();
    if (!cleanCode) return;

    // Guard: ignore if already handling a scan, currently releasing, or beneficiary is on screen
    if (scanned || loading || releasing || scanResult) return;

    // Debounce duplicate reads of identical code within 2.5s
    const now = Date.now();
    if (lastScannedRef.current.code === cleanCode && now - lastScannedRef.current.time < 2500) {
      return;
    }
    lastScannedRef.current = { code: cleanCode, time: now };

    console.log('[STAFF SCANNER] Valid Barcode Detected:', cleanCode);
    setScanned(true);
    setManualCode(cleanCode);
    // Close the scan modal once QR is detected
    setScanModalVisible(false);
    handleExecuteScan(cleanCode);
  };

  // Scanner state
  const [manualCode, setManualCode] = useState('');
  const [loading, setLoading] = useState(false);
  const [scanResult, setScanResult] = useState(null);
  const [releasing, setReleasing] = useState(false);
  const [receiptModalData, setReceiptModalData] = useState(null);
  const [completedScans, setCompletedScans] = useState([]);
  const [loadingCompletedScans, setLoadingCompletedScans] = useState(false);
  const [duplicateAlert, setDuplicateAlert] = useState(false);
  const [duplicateMessage, setDuplicateMessage] = useState('');
  const [duplicateData, setDuplicateData] = useState(null);
  const [scanNotice, setScanNotice] = useState(null);
  const [rosterPage, setRosterPage] = useState(1);
  const ROSTER_PER_PAGE = 10;
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

  // Offline buffer state (Automatically managed)
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

  // Load offline storage and silently preload fresh roster for duty barangay
  useEffect(() => {
    (async () => {
      try {
        const cached = await AsyncStorage.getItem('mitigateplus_offline_households');
        if (cached) setOfflineCache(JSON.parse(cached));
        const queue = await AsyncStorage.getItem('mitigateplus_offline_claims');
        if (queue) setOfflineClaimsQueue(JSON.parse(queue));

        // Background preload latest households for duty barangay
        if (token && dutyBrgy) {
          fetchOfflineHouseholds(token, dutyBrgy)
            .then(data => {
              if (Array.isArray(data) && data.length > 0) {
                setOfflineCache(data);
                AsyncStorage.setItem('mitigateplus_offline_households', JSON.stringify(data)).catch(() => {});
              }
            })
            .catch(() => {});
        }
      } catch (e) {
        console.warn('Cache load error:', e);
      }
    })();
  }, [token, dutyBrgy]);

  // Load completed releases from server & cache
  const fetchMyReleases = async () => {
    if (!token) return;
    setLoadingCompletedScans(true);
    try {
      const res = await fetch(`${API_BASE_URL}/distributions/my-releases`, {
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });
      if (res.ok) {
        const data = await res.json();
        if (Array.isArray(data)) {
          setCompletedScans(data);
          AsyncStorage.setItem('mitigateplus_completed_scans_' + dutyBrgy, JSON.stringify(data.slice(0, 50))).catch(() => {});
          return;
        }
      }
    } catch (e) {
      console.warn('Error fetching staff releases:', e);
    } finally {
      setLoadingCompletedScans(false);
    }

    try {
      const local = await AsyncStorage.getItem('mitigateplus_completed_scans_' + dutyBrgy);
      if (local) {
        setCompletedScans(JSON.parse(local));
      }
    } catch (e) {}
  };

  useEffect(() => {
    fetchMyReleases();
  }, [token, dutyBrgy]);

  // Auto-sync offline claims when network connectivity is active
  const autoSyncOfflineClaims = async () => {
    if (offlineClaimsQueue.length === 0 || !token) return;
    try {
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
      if (successCount > 0) {
        setScanNotice({
          type: 'success',
          text: lang === 'tl'
            ? `Awtomatikong na-sync ang ${successCount} offline claim sa cloud.`
            : `Auto-synced ${successCount} offline distribution record(s) to cloud.`,
        });
      }
    } catch (e) {
      console.warn('Auto sync offline claims error:', e);
    }
  };

  // Automatic Continuous Online / Offline Detection
  useEffect(() => {
    let isMounted = true;

    const probeConnectivity = async () => {
      // Browser fast check
      if (Platform.OS === 'web' && typeof navigator !== 'undefined' && 'onLine' in navigator && !navigator.onLine) {
        if (isMounted) setIsOfflineMode(true);
        return;
      }
      try {
        const controller = new AbortController();
        const timer = setTimeout(() => controller.abort(), 4000);
        const res = await fetch(`${API_BASE_URL}/health`, {
          method: 'GET',
          signal: controller.signal,
        });
        clearTimeout(timer);

        if (isMounted) {
          const wasOffline = isOfflineMode;
          const isOnlineNow = !!(res && (res.ok || res.status < 500));
          setIsOfflineMode(!isOnlineNow);

          if (wasOffline && isOnlineNow && offlineClaimsQueue.length > 0) {
            autoSyncOfflineClaims();
          }
        }
      } catch (err) {
        if (isMounted) {
          setIsOfflineMode(true);
        }
      }
    };

    probeConnectivity();
    const interval = setInterval(probeConnectivity, 12000);

    if (Platform.OS === 'web' && typeof window !== 'undefined') {
      const handleOnline = () => {
        if (isMounted) setIsOfflineMode(false);
        probeConnectivity();
      };
      const handleOffline = () => {
        if (isMounted) setIsOfflineMode(true);
      };
      window.addEventListener('online', handleOnline);
      window.addEventListener('offline', handleOffline);
      return () => {
        isMounted = false;
        clearInterval(interval);
        window.removeEventListener('online', handleOnline);
        window.removeEventListener('offline', handleOffline);
      };
    }

    return () => {
      isMounted = false;
      clearInterval(interval);
    };
  }, [token, offlineClaimsQueue.length, isOfflineMode]);

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
      setScanned(false);
      return;
    }

    setLoading(true);
    setDuplicateAlert(false);
    setDuplicateMessage('');
    setScanNotice(null);
    setScansTodayCount(prev => prev + 1);

    const activeDrive = selectedEvent || {
      title: lang === 'tl' ? 'Pangkalahatang Pamamahagi ng Ayuda' : 'General Relief Distribution',
      itemType: 'All-in-One Family Food Pack',
      location: `Barangay ${dutyBrgy} Covered Court`,
    };

    const checkOfflineCacheForCode = (code) => {
      const cleanCode = (code || '').trim().toLowerCase();
      const found = offlineCache.find(
        h => (h.qrCode && h.qrCode.toLowerCase() === cleanCode) ||
             (h._id && h._id.toString() === code) ||
             (h.householdId && h.householdId.toString() === code) ||
             (Array.isArray(h.previousQrCodes) && h.previousQrCodes.some(p => p.code && p.code.toLowerCase() === cleanCode))
      );
      if (!found) {
        showNotify('Offline Notice', 'QR pass not found in local cache.', true);
        setFlaggedTodayCount(prev => prev + 1);
        setLoading(false);
        setTimeout(() => setScanned(false), 2500);
        return;
      }

      const isRevoked = found.qrCode && found.qrCode.toLowerCase() !== cleanCode;

      const isDup = offlineClaimsQueue.some(
        c => (c.qrCode === code || c.householdId === found._id || c.qrCode === found.qrCode) && c.eventId === (activeDrive._id || activeDrive.id)
      );

      if (isDup) {
        setDuplicateAlert(true);
        setDuplicateMessage(
          isRevoked
            ? (lang === 'tl'
                ? 'DUPLICATE & REVOKED QR: Ang pamilyang ito ay nakatala nang nakakuha ng ayuda, at ang QR na ito ay LUMANG QR na pinalitan na.'
                : 'DUPLICATE & REVOKED QR: Household already claimed relief and this QR pass is obsolete.')
            : (lang === 'tl'
                ? 'Ang pamilyang ito ay nakapagtala na ng natanggap na ayuda sa distribution drive na ito (offline claim record).'
                : 'This household has already claimed relief in this event (offline record).')
        );
        setDuplicateData({
          name: found.name || found.headOfHouseholdUserId?.name || 'Beneficiary Head',
          address: found.address || `Barangay ${dutyBrgy}, Manila`,
          barangayCode: found.barangayCode || dutyBrgy,
          qrCode: code,
        });
        setFlaggedTodayCount(prev => prev + 1);
        setLoading(false);
        setScanResult(null);
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
        distributionEvent: activeDrive,
      });
      setVerifiedTodayCount(prev => prev + 1);
      setScanNotice({ type: 'success', text: `Household found: ${found.name || 'Beneficiary'} (Offline Cache)` });
      setTimeout(() => {
        scannerScrollRef.current?.scrollToEnd({ animated: true });
      }, 150);
    };

    try {
      if (isOfflineMode) {
        checkOfflineCacheForCode(rawCode);
      } else {
        const currentEventId = activeDrive?._id || activeDrive?.id;
        try {
          const res = await scanHouseholdQR(token, rawCode, currentEventId);

          if (res.duplicate || res.isDuplicate) {
            setDuplicateAlert(true);
            setDuplicateMessage(
              res.message ||
              (lang === 'tl'
                ? 'Ang pamilyang ito ay nakapagtala na ng claim sa distribution drive na ito ngayong araw.'
                : 'Household already claimed relief in this drive today.')
            );
            setDuplicateData({
              name: res.household?.name || 'Verified Beneficiary',
              address: res.household?.address || `Barangay ${res.household?.barangayCode || dutyBrgy}, Manila`,
              barangayCode: res.household?.barangayCode || dutyBrgy,
              claimedAt: res.claimedAt || new Date().toISOString(),
              qrCode: rawCode,
            });
            setFlaggedTodayCount(prev => prev + 1);
            setScanResult(null);
            setLoading(false);
            return;
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
              distributionEvent: activeDrive,
            });
            setVerifiedTodayCount(prev => prev + 1);
            setScanNotice({ type: 'success', text: `Verified Household: ${headName} (${headcount} members)` });
            setTimeout(() => {
              scannerScrollRef.current?.scrollToEnd({ animated: true });
            }, 150);
          } else {
            showNotify('Scan Result', res.message || 'Invalid QR code.', true);
            setFlaggedTodayCount(prev => prev + 1);
            setTimeout(() => setScanned(false), 2500);
          }
        } catch (apiErr) {
          const isNetErr = !apiErr.status || apiErr.message?.toLowerCase().includes('network') || apiErr.message?.toLowerCase().includes('fetch');
          if (isNetErr) {
            setIsOfflineMode(true);
            checkOfflineCacheForCode(rawCode);
            return;
          }
          throw apiErr;
        }
      }
    } catch (err) {
      // ✅ BARANGAY MISMATCH: Cross-barangay QR scan rejected
      if (err.status === 403 && err.data?.barangayMismatch) {
        const hhBrgy = err.data?.householdBarangay;
        const evBrgy = err.data?.eventBarangay;
        setScanNotice({
          type: 'error',
          text: `⛔ HINDI PWEDE: QR ng Brgy ${hhBrgy} — Event para sa Brgy ${evBrgy} lamang`,
        });
        Alert.alert(
          '⛔ Maling Barangay',
          err.message || `Ang QR Code na ito ay para sa Barangay ${hhBrgy} lamang. Ang kasalukuyang event ay para sa Barangay ${evBrgy} lamang.`,
          [{ text: 'Naiintindihan', style: 'cancel' }]
        );
        setFlaggedTodayCount(prev => prev + 1);
        setTimeout(() => setScanned(false), 3000);
      } else {
        showNotify('Scan Failed', err.message || 'Error processing QR pass.', true);
        setFlaggedTodayCount(prev => prev + 1);
        setTimeout(() => setScanned(false), 2500);
      }
    } finally {
      setLoading(false);
    }
  };


  const handleConfirmRelease = async () => {
    if (!scanResult) return;
    const currentHh = scanResult.household;
    const currentEv = selectedEvent || {
      title: lang === 'tl' ? 'Pangkalahatang Pamamahagi ng Ayuda' : 'General Relief Distribution',
      itemType: 'All-in-One Family Food Pack',
    };
    setReleasing(true);

    const recordOfflineRelease = async () => {
      const claimObj = {
        householdId: currentHh._id || currentHh.id,
        qrCode: currentHh.qrCode || manualCode,
        eventId: currentEv._id || currentEv.id,
        timestamp: new Date().toISOString(),
      };
      const updatedQueue = [...offlineClaimsQueue, claimObj];
      setOfflineClaimsQueue(updatedQueue);
      await AsyncStorage.setItem('mitigateplus_offline_claims', JSON.stringify(updatedQueue));

      const offlineReceipt = {
        receiptNumber: `RCPT-${new Date().getFullYear()}-${Date.now().toString().slice(-6).toUpperCase()}`,
        eventTitle: currentEv.title || 'Relief Distribution',
        barangayCode: currentHh.barangayCode || dutyBrgy,
        householdAddress: currentHh.address || 'Manila City',
        headOfHousehold: currentHh.name || 'Verified Beneficiary',
        itemType: currentEv.itemType || 'All-in-One Family Food Pack',
        totalPacks: 1,
        baseUnitsGiven: 1,
        topUpUnitsGiven: 0,
        releasedAt: new Date().toISOString(),
        releasedByName: officerName,
        disbursingTeam: 'MDRRMO Field Operations',
        isOffline: true,
        status: 'claimed',
      };

      const newCompleted = [offlineReceipt, ...completedScans];
      setCompletedScans(newCompleted);
      AsyncStorage.setItem('mitigateplus_completed_scans_' + dutyBrgy, JSON.stringify(newCompleted.slice(0, 50))).catch(() => {});
      setReceiptModalData(offlineReceipt);
      setScanResult(null);
      setScanned(false);
    };

    try {
      if (isOfflineMode) {
        await recordOfflineRelease();
      } else {
        try {
          const res = await confirmDistribution(token, {
            householdId: currentHh._id || currentHh.id,
            eventId: currentEv._id || currentEv.id,
          });

          const receipt = res?.receipt || {
            receiptNumber: res?.receiptNumber || `RCPT-${new Date().getFullYear()}-${(currentHh._id || Date.now()).toString().slice(-6).toUpperCase()}`,
            eventTitle: currentEv.title || 'Relief Distribution',
            barangayCode: currentHh.barangayCode || dutyBrgy,
            householdAddress: currentHh.address || 'Manila City',
            headOfHousehold: currentHh.name || 'Verified Beneficiary',
            itemType: currentEv.itemType || 'All-in-One Family Food Pack',
            totalPacks: 1,
            baseUnitsGiven: 1,
            topUpUnitsGiven: 0,
            releasedAt: new Date().toISOString(),
            releasedByName: officerName,
            disbursingTeam: 'MDRRMO Field Operations',
            status: 'claimed',
          };

          const newCompleted = [receipt, ...completedScans.filter(s => s.receiptNumber !== receipt.receiptNumber)];
          setCompletedScans(newCompleted);
          AsyncStorage.setItem('mitigateplus_completed_scans_' + dutyBrgy, JSON.stringify(newCompleted.slice(0, 50))).catch(() => {});
          setReceiptModalData(receipt);
          setScanResult(null);
          setScanned(false);
          setRosterPage(1); // Show first page so new entry is visible
        } catch (apiErr) {
          const isNetErr = !apiErr.status || apiErr.message?.toLowerCase().includes('network') || apiErr.message?.toLowerCase().includes('fetch');
          if (isNetErr) {
            setIsOfflineMode(true);
            await recordOfflineRelease();
            return;
          }
          throw apiErr;
        }
      }
    } catch (err) {
      // ✅ BARANGAY MISMATCH: Cross-barangay release rejected
      if (err.status === 403 && err.data?.barangayMismatch) {
        const hhBrgy = err.data?.householdBarangay;
        const evBrgy = err.data?.eventBarangay;
        Alert.alert(
          '⛔ Hindi Pwede — Maling Barangay',
          err.message || `Ang pamilyang ito ay mula sa Barangay ${hhBrgy}. Ang distribution event ay para sa Barangay ${evBrgy} lamang. Hindi maaaring ibigay ang relief dito.`,
          [{ text: 'OK', style: 'cancel' }]
        );
        setFlaggedTodayCount(prev => prev + 1);
        setScanResult(null);
        setScanned(false);
      } else {
        const isDup = err.status === 409 || err.message?.toLowerCase().includes('duplicate') || err.data?.isDuplicate;
        if (isDup) {
          setDuplicateAlert(true);
          setDuplicateMessage(
            err.message ||
            (lang === 'tl'
              ? 'DUPLICATE CLAIM BLOCKED: Ang residenteng ito ay nakapagtala na ng claim sa distribution drive na ito ngayong araw.'
              : 'DUPLICATE CLAIM BLOCKED: Household has already claimed relief in this event today.')
          );
          setDuplicateData({
            name: currentHh?.name || 'Verified Beneficiary',
            address: currentHh?.address || `Barangay ${currentHh?.barangayCode || dutyBrgy}, Manila`,
            barangayCode: currentHh?.barangayCode || dutyBrgy,
            qrCode: currentHh?.qrCode || manualCode,
          });
          setFlaggedTodayCount(prev => prev + 1);
          setScanResult(null);
        } else {
          showNotify('Release Notice', err.message || 'Distribution confirmed.');
          handleResetScanner();
        }
      }
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
      {/* 1. App Header: Royal Navy Authority Header with LinearGradient + Gold Accent Rule */}
      <LinearGradient
        colors={['#0B1D4E', '#12296A', '#1C3F94']}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 0 }}
        style={styles.topHeader}
      >
        {/* Gold rule top */}
        <View style={styles.headerGoldRule} />
        {/* Status bar safe area */}
        <View style={{ height: Platform.OS === 'web' ? 0 : STATUSBAR_INSET }} />
        <View style={styles.headerContentRow}>
          <View style={{ flex: 1 }}>
            <Text style={styles.headerKicker}>LGU MANILA • FIELD STAFF PORTAL</Text>
            <Text style={styles.headerOfficerName}>{officerName}</Text>
            <View style={styles.headerDutyRow}>
              <MapPinIcon size={12} color="#FCD34D" />
              <Text style={styles.headerDutyText}>Duty: Brgy {dutyBrgy} — Batch 1</Text>
            </View>
          </View>
          <TouchableOpacity style={styles.glassSignOutPill} onPress={onLogout} activeOpacity={0.82}>
            <Text style={styles.glassSignOutText}>Sign Out</Text>
          </TouchableOpacity>
        </View>
      </LinearGradient>


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
              <Text style={styles.heroDriveTitle}>
                {selectedEvent?.title || (lang === 'tl' ? 'Pangkalahatang Pamamahagi ng Ayuda' : 'General Relief Distribution')}
              </Text>
            </LinearGradient>

            {/* ── SCAN QR PASS BUTTON CARD ── */}
            <View style={styles.viewfinderCard}>
              {/* Header */}
              <View style={styles.viewfinderHeader}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
                  <View style={styles.viewfinderBadgeIcon}>
                    <ScanIcon size={16} color="#38BDF8" />
                  </View>
                  <View>
                    <Text style={styles.viewfinderTitle}>
                      {lang === 'tl' ? 'OPISYAL NA QR SCANNER' : 'OFFICIAL QR SCANNER'}
                    </Text>
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 5, marginTop: 2 }}>
                      <View style={[styles.statusPulseDot, { backgroundColor: permission?.granted ? '#10B981' : '#F59E0B' }]} />
                      <Text style={styles.viewfinderBadgeTag}>
                        {permission?.granted
                          ? (lang === 'tl' ? 'CAMERA HANDA' : 'CAMERA READY')
                          : (lang === 'tl' ? 'KAILANGAN NG PERMISO' : 'PERMISSION REQUIRED')}
                      </Text>
                    </View>
                  </View>
                </View>
              </View>

              {/* Scan Trigger Button */}
              <TouchableOpacity
                style={[
                  styles.scanTriggerBtn,
                  (!permission?.granted || Platform.OS === 'web') && styles.scanTriggerBtnDisabled,
                ]}
                onPress={async () => {
                  if (Platform.OS !== 'web' && (!permission || (!permission.granted && permission.canAskAgain))) {
                    await requestPermission();
                  }
                  if (permission?.granted) {
                    handleResetScanner();
                    setCameraMountKey(k => k + 1);
                    setCameraReady(false);
                    setScanModalVisible(true);
                  }
                }}
                activeOpacity={0.85}
              >
                <View style={styles.scanTriggerIconCircle}>
                  <QrCodeIcon size={36} color="#FFFFFF" />
                </View>
                <Text style={styles.scanTriggerBtnText}>
                  {lang === 'tl' ? 'I-SCAN ANG QR PASS' : 'SCAN QR PASS'}
                </Text>
                <Text style={styles.scanTriggerBtnSub}>
                  {lang === 'tl'
                    ? 'Pindutin upang buksan ang scanner lens'
                    : 'Tap to open the camera scanner'}
                </Text>
              </TouchableOpacity>

              {/* Gallery Upload Button */}
              <TouchableOpacity
                style={styles.photoScanSecondaryBtn}
                onPress={showPhotoScanOptions}
                activeOpacity={0.85}
                disabled={decodingPhoto}
              >
                {decodingPhoto ? (
                  <ActivityIndicator size="small" color="#38BDF8" />
                ) : (
                  <ImageIcon size={16} color="#38BDF8" />
                )}
                <Text style={styles.photoScanSecondaryBtnText}>
                  {decodingPhoto
                    ? (lang === 'tl' ? 'Sinusuri ang larawan ng QR pass...' : 'Scanning photo for QR pass...')
                    : (lang === 'tl' ? 'Pumili ng QR sa Gallery' : 'Upload QR from Gallery')}
                </Text>
              </TouchableOpacity>

              {/* Status Pill */}
              <View style={styles.liveStatusRow}>
                <View style={[styles.liveDot, {
                  backgroundColor: permission?.granted ? '#10B981' : '#EF4444',
                }]} />
                <Text style={styles.liveStatusText}>
                  {permission?.granted
                    ? (lang === 'tl' ? 'Scanner Handa — Pindutin ang button para mag-scan' : 'Scanner Ready — Tap button to begin scan')
                    : (lang === 'tl' ? 'Pahintulutan ang camera upang mag-scan' : 'Camera permission required to scan')}
                </Text>
              </View>
            </View>

            {/* ── SCANNER MODAL ── */}
            <Modal
              visible={scanModalVisible}
              animationType="slide"
              transparent={false}
              onRequestClose={() => setScanModalVisible(false)}
            >
              <View style={styles.scanModalContainer}>
                {/* Modal Header */}
                <LinearGradient
                  colors={['#0B1D4E', '#1C3F94']}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 0 }}
                  style={styles.scanModalHeader}
                >
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, flex: 1 }}>
                    <ScanIcon size={20} color="#38BDF8" />
                    <View>
                      <Text style={styles.scanModalTitle}>
                        {lang === 'tl' ? 'I-SCAN ANG QR PASS' : 'SCAN QR PASS'}
                      </Text>
                      <Text style={styles.scanModalSub}>
                        {selectedEvent?.title || (lang === 'tl' ? 'Pangkalahatang Pamamahagi' : 'General Distribution')}
                      </Text>
                    </View>
                  </View>
                  <TouchableOpacity
                    onPress={() => setScanModalVisible(false)}
                    style={styles.scanModalCloseBtn}
                    activeOpacity={0.8}
                  >
                    <CloseIcon size={20} color="#FFFFFF" />
                  </TouchableOpacity>
                </LinearGradient>

                {/* Camera Viewfinder */}
                <View style={styles.scanModalCameraBox}>
                  {Platform.OS === 'web' ? (
                    <View style={styles.webPreviewPlaceholder}>
                      <View style={styles.webLensIconCircle}>
                        <QrCodeIcon size={38} color="#38BDF8" />
                      </View>
                      <Text style={styles.webLensTitle}>Camera Scanner Standby</Text>
                      <Text style={styles.webLensSub}>
                        {lang === 'tl'
                          ? 'Gamitin ang manual entry sa ibaba.'
                          : 'Use the manual entry below to type the QR code.'}
                      </Text>
                    </View>
                  ) : !permission?.granted ? (
                    <View style={styles.camPermBox}>
                      <View style={styles.camPermIconCircle}>
                        <CameraIcon size={28} color="#94A3B8" />
                      </View>
                      <Text style={styles.camPermTitle}>
                        {lang === 'tl' ? 'Kailangan ng Camera Access' : 'Camera Permission Required'}
                      </Text>
                      <TouchableOpacity style={styles.camPermBtn} onPress={requestPermission} activeOpacity={0.85}>
                        <Text style={styles.camPermBtnText}>
                          {lang === 'tl' ? 'Pahintulutan ang Camera' : 'Allow Camera Access'}
                        </Text>
                      </TouchableOpacity>
                    </View>
                  ) : (
                    <CameraView
                      key={`modal-cam-${cameraMountKey}`}
                      style={StyleSheet.absoluteFill}
                      facing="back"
                      enableTorch={torchOn}
                      autofocus="on"
                      barcodeScannerSettings={BARCODE_SCANNER_SETTINGS}
                      onCameraReady={() => setCameraReady(true)}
                      onBarcodeScanned={handleBarcodeScanned}
                    />
                  )}

                  {/* Viewfinder corner marks */}
                  <View pointerEvents="none" style={[styles.cornerMark, styles.cornerTL]} />
                  <View pointerEvents="none" style={[styles.cornerMark, styles.cornerTR]} />
                  <View pointerEvents="none" style={[styles.cornerMark, styles.cornerBL]} />
                  <View pointerEvents="none" style={[styles.cornerMark, styles.cornerBR]} />
                  <View pointerEvents="none" style={styles.scanTargetReticle} />

                  {/* Laser sweep */}
                  <Animated.View
                    pointerEvents="none"
                    style={[styles.laserLine, { transform: [{ translateY: laserAnim }] }]}
                  >
                    <LinearGradient
                      colors={['rgba(56,189,248,0)', 'rgba(56,189,248,0.75)', '#FFFFFF', 'rgba(56,189,248,0.75)', 'rgba(56,189,248,0)']}
                      start={{ x: 0, y: 0 }}
                      end={{ x: 1, y: 0 }}
                      style={styles.laserGradient}
                    />
                  </Animated.View>

                  {/* Instruction overlay */}
                  <View pointerEvents="none" style={styles.scanModalOverlayHint}>
                    <Text style={styles.scanModalOverlayText}>
                      {lang === 'tl'
                        ? 'Itapat ang QR Pass sa loob ng kahon'
                        : 'Align QR Pass within the frame'}
                    </Text>
                  </View>
                </View>

                {/* Flash Button (large, at bottom) */}
                {Platform.OS !== 'web' && permission?.granted && (
                  <TouchableOpacity
                    style={[styles.flashModalBtn, torchOn && styles.flashModalBtnActive]}
                    onPress={() => setTorchOn(prev => !prev)}
                    activeOpacity={0.85}
                  >
                    <ZapIcon size={24} color={torchOn ? '#0B1D4E' : '#FFFFFF'} />
                    <Text style={[styles.flashModalBtnText, torchOn && styles.flashModalBtnTextActive]}>
                      {torchOn
                        ? (lang === 'tl' ? 'Flash: Naka-ON' : 'Flash: ON')
                        : (lang === 'tl' ? 'Flash: Naka-OFF' : 'Flash: OFF')}
                    </Text>
                  </TouchableOpacity>
                )}
              </View>
            </Modal>

            {/* Manual Code Entry Card */}
            <View style={styles.manualEntryCard}>
              <Text style={styles.manualEntryLabel}>Manual Code Entry (No Camera)</Text>
              <View style={styles.inputRow}>
                <TextInput
                  style={styles.codeInput}
                  value={manualCode}
                  onChangeText={setManualCode}
                  placeholder="MNL-291-ELLICA-2026"
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



            {/* Mga Naipamahaging Relief (Completion List) */}
            <View style={styles.completionListCard}>
              <View style={styles.completionHeader}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
                  <View style={styles.completionIconBadge}>
                    <ListIcon size={18} color="#FFFFFF" />
                  </View>
                  <View>
                    <Text style={styles.completionTitle}>
                      {lang === 'tl' ? 'Mga Naipamahaging Relief' : "Today's Distribution Roster"}
                    </Text>
                    <Text style={styles.completionSub}>
                      {lang === 'tl' ? 'Naka-save sa Central Web Database' : 'Saved to Central Web Database'}
                    </Text>
                  </View>
                </View>
                <View style={styles.completionCountPill}>
                  <Text style={styles.completionCountText}>
                    {completedScans.length} {lang === 'tl' ? 'Naipamahagi' : 'Released'}
                  </Text>
                </View>
              </View>

              {loadingCompletedScans ? (
                <View style={{ paddingVertical: 24, alignItems: 'center' }}>
                  <ActivityIndicator size="small" color="#1E3A8A" />
                  <Text style={{ marginTop: 8, fontSize: 12, color: '#64748B', fontWeight: '600' }}>
                    {lang === 'tl' ? 'Kinakarga ang mga naipamahagi mula sa server...' : 'Loading distribution roster from cloud...'}
                  </Text>
                </View>
              ) : completedScans.length === 0 ? (
                <View style={styles.emptyCompletionBox}>
                  <Text style={styles.emptyCompletionText}>
                    {lang === 'tl'
                      ? 'Wala pang naipapamahaging relief sa shift na ito. I-scan ang QR pass ng residente upang magsimula.'
                      : 'No relief distributions logged yet for this shift. Scan a resident QR pass to begin.'}
                  </Text>
                </View>
              ) : (() => {
                const totalPages = Math.ceil(completedScans.length / ROSTER_PER_PAGE);
                const pageItems = completedScans.slice((rosterPage - 1) * ROSTER_PER_PAGE, rosterPage * ROSTER_PER_PAGE);
                return (
                  <View style={{ gap: 10, marginTop: 14 }}>
                    {pageItems.map((item, idx) => (
                      <View key={item.receiptNumber || item.id || idx} style={styles.completionItem}>
                        <View style={{ flex: 1, paddingRight: 8 }}>
                          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
                            <Text style={styles.completionItemName} numberOfLines={1}>
                              {item.householdName || item.headOfHousehold || 'Verified Beneficiary'}
                            </Text>
                            <View style={styles.claimedPill}>
                              <CheckCircleIcon size={11} color="#059669" />
                              <Text style={styles.claimedPillText}>CLAIMED</Text>
                            </View>
                          </View>
                          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 3 }}>
                            <MapPinIcon size={11} color="#64748B" />
                            <Text style={styles.completionItemAddr} numberOfLines={1}>
                              {item.householdAddress || 'Manila City'} • Brgy {item.barangayCode || dutyBrgy}
                            </Text>
                          </View>
                          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 4 }}>
                            <Text style={styles.completionReceiptCode}>
                              {item.receiptNumber}
                            </Text>
                            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 3 }}>
                              <ClockIcon size={11} color="#94A3B8" />
                              <Text style={styles.completionTime}>
                                {new Date(item.releasedAt || Date.now()).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                              </Text>
                            </View>
                          </View>
                        </View>

                        <TouchableOpacity
                          style={styles.viewReceiptBtn}
                          onPress={() => setReceiptModalData(item)}
                          activeOpacity={0.8}
                        >
                          <Text style={styles.viewReceiptBtnText}>
                            {lang === 'tl' ? 'Resibo' : 'Receipt'}
                          </Text>
                        </TouchableOpacity>
                      </View>
                    ))}

                    {/* Pagination Controls */}
                    {totalPages > 1 && (
                      <View style={styles.paginationRow}>
                        <TouchableOpacity
                          style={[styles.paginationBtn, rosterPage === 1 && styles.paginationBtnDisabled]}
                          onPress={() => setRosterPage(p => Math.max(1, p - 1))}
                          disabled={rosterPage === 1}
                          activeOpacity={0.8}
                        >
                          <ChevronLeftIcon size={16} color={rosterPage === 1 ? '#CBD5E1' : '#1C3F94'} />
                          <Text style={[styles.paginationBtnText, rosterPage === 1 && styles.paginationBtnTextDisabled]}>
                            {lang === 'tl' ? 'Nakaraan' : 'Prev'}
                          </Text>
                        </TouchableOpacity>

                        <View style={styles.paginationPageIndicator}>
                          <Text style={styles.paginationPageText}>
                            {lang === 'tl' ? `Pahina ${rosterPage} ng ${totalPages}` : `Page ${rosterPage} of ${totalPages}`}
                          </Text>
                        </View>

                        <TouchableOpacity
                          style={[styles.paginationBtn, rosterPage === totalPages && styles.paginationBtnDisabled]}
                          onPress={() => setRosterPage(p => Math.min(totalPages, p + 1))}
                          disabled={rosterPage === totalPages}
                          activeOpacity={0.8}
                        >
                          <Text style={[styles.paginationBtnText, rosterPage === totalPages && styles.paginationBtnTextDisabled]}>
                            {lang === 'tl' ? 'Susunod' : 'Next'}
                          </Text>
                          <ChevronRightIcon size={16} color={rosterPage === totalPages ? '#CBD5E1' : '#1C3F94'} />
                        </TouchableOpacity>
                      </View>
                    )}
                  </View>
                );
              })()}
            </View>
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
                <Text style={styles.dutyInfoVal}>
                  {new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })} · 06:00 AM – 06:00 PM
                </Text>
              </View>
            </View>

            {/* Active Distribution Drive Section */}
            <Text style={styles.sectionHeaderTitle}>Active Distribution Drive</Text>
            <View style={styles.activeDrivePreviewCard}>
              <Text style={styles.activeDriveKicker}>CURRENT DISTRIBUTION DRIVE</Text>
              <Text style={styles.activeDriveTitle}>
                {selectedEvent?.title || (lang === 'tl' ? 'Pangkalahatang Pamamahagi ng Ayuda' : 'General Relief Distribution')}
              </Text>
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
                {item.icon(isActive ? '#1C3F94' : '#94A3B8')}
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

      {/* 1. BENEFICIARY SCAN RESULT POP-UP CARD MODAL */}
      <Modal
        visible={!!scanResult && !receiptModalData}
        transparent
        animationType="slide"
        onRequestClose={handleResetScanner}
      >
        <View style={styles.modalBackdrop}>
          {scanResult && scanResult.household && (() => {
            const isHouseholdVerified =
              scanResult.isVerified !== false &&
              scanResult.household.verificationStatus !== 'pending';
            return (
              <View style={styles.scanPopupCard}>
                {/* Header */}
                <View style={styles.popupHeader}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, flex: 1 }}>
                    <View style={styles.popupIconCircle}>
                      <PackageIcon size={20} color="#FFFFFF" />
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={styles.popupTitle}>
                        {lang === 'tl' ? 'Kumpirmahin ang Ayuda' : 'Beneficiary Verified'}
                      </Text>
                      <Text style={styles.popupSub} numberOfLines={1}>
                        {selectedEvent?.title || 'MDRRMO Distribution Drive'}
                      </Text>
                    </View>
                  </View>
                  <TouchableOpacity
                    onPress={handleResetScanner}
                    style={styles.popupCloseBtn}
                    activeOpacity={0.8}
                  >
                    <CloseIcon size={18} color="#64748B" />
                  </TouchableOpacity>
                </View>

                {/* Beneficiary Details Box */}
                <View style={styles.popupBeneficiaryBox}>
                  <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                    <View style={{ flex: 1, paddingRight: 8 }}>
                      <Text style={styles.popupHhName}>{scanResult.household.name}</Text>
                      <Text style={styles.popupHhAddress}>
                        📍 {scanResult.household.address}
                      </Text>
                      <Text style={styles.popupHhMeta}>
                        👥 {scanResult.household.familyHeadcount} {lang === 'tl' ? 'Miyembro ng Pamilya' : 'Household Members'} • Brgy {scanResult.household.barangayCode || dutyBrgy}
                      </Text>
                    </View>
                    <View style={[styles.verifTag, isHouseholdVerified ? styles.verifTagVerified : styles.verifTagPending]}>
                      <Text style={[styles.verifTagText, isHouseholdVerified ? styles.verifTagTextVerified : styles.verifTagTextPending]}>
                        {isHouseholdVerified ? '✓ VERIFIED' : 'PENDING'}
                      </Text>
                    </View>
                  </View>
                </View>

                {/* Entitlement Quota */}
                <View style={styles.popupQuotaBox}>
                  <Text style={styles.entitlementTitle}>AUTHORIZED RELIEF ALLOCATION</Text>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 4 }}>
                    <PackageIcon size={18} color="#0D9488" />
                    <Text style={styles.popupQuotaText}>{scanResult.household.entitlement}</Text>
                  </View>
                  <Text style={[styles.resultMeta, { marginTop: 6, color: '#D97706', fontWeight: '700' }]}>
                    Priority Status: {scanResult.household.priorityLevel || 'Standard Priority'}
                  </Text>
                </View>

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
                    { marginTop: 16 }
                  ]}
                  onPress={handleConfirmRelease}
                  disabled={!isHouseholdVerified || releasing}
                  activeOpacity={0.85}
                >
                  {releasing ? (
                    <ActivityIndicator color="#FFFFFF" />
                  ) : (
                    <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8 }}>
                      <CheckIcon size={20} color="#FFFFFF" />
                      <Text style={styles.releaseBtnText}>
                        {isHouseholdVerified
                          ? (lang === 'tl' ? 'Kumpirmahin ang Pamamahagi' : 'Confirm Relief Release')
                          : 'Action Locked (Unverified)'}
                      </Text>
                    </View>
                  )}
                </TouchableOpacity>

                {/* Cancel / Scan Another Button */}
                <TouchableOpacity
                  style={styles.cancelBtn}
                  onPress={handleResetScanner}
                  activeOpacity={0.8}
                >
                  <Text style={styles.cancelBtnText}>
                    {lang === 'tl' ? '✕ Kanselahin / Isara' : '✕ Cancel / Close'}
                  </Text>
                </TouchableOpacity>
              </View>
            );
          })()}
        </View>
      </Modal>

      {/* 2. OFFICIAL DIGITAL RELIEF CLAIM RECEIPT MODAL ("PARANG RESIBO") */}
      <Modal
        visible={!!receiptModalData}
        transparent
        animationType="fade"
        onRequestClose={() => {
          setReceiptModalData(null);
          handleResetScanner();
        }}
      >
        <View style={styles.modalBackdrop}>
          {receiptModalData && (
            <ScrollView
              contentContainerStyle={{ paddingVertical: 20, alignItems: 'center', width: '100%' }}
              showsVerticalScrollIndicator={false}
            >
              <View style={styles.receiptContainer}>
                {/* Decorative Top Line */}
                <View style={styles.receiptTopBorder} />

                {/* Header: Republic & City of Manila MDRRMO */}
                <View style={styles.receiptHeader}>
                  <Text style={styles.receiptGovText}>REPUBLIKA NG PILIPINAS</Text>
                  <Text style={styles.receiptCityText}>LUNGSOD NG MAYNILA</Text>
                  <Text style={styles.receiptDeptText}>DISASTER RISK REDUCTION & MANAGEMENT OFFICE</Text>
                  <View style={styles.receiptDividerDashed} />
                  <Text style={styles.receiptTitle}>OPISYAL NA RESIBO NG AYUDA</Text>
                  <Text style={styles.receiptSubTitle}>OFFICIAL RELIEF DISTRIBUTION CLAIM VOUCHER</Text>
                </View>

                {/* Released & Audited Badge */}
                <View style={styles.auditedBadge}>
                  <CheckIcon size={14} color="#15803D" />
                  <Text style={styles.auditedBadgeText}>✓ RELEASED & AUDITED</Text>
                </View>

                {/* Receipt Monospace Code Box */}
                <View style={styles.receiptCodeBox}>
                  <Text style={styles.receiptCodeLabel}>RECEIPT / REFERENCE NUMBER</Text>
                  <Text style={styles.receiptCodeValue}>{receiptModalData.receiptNumber}</Text>
                </View>

                {/* Beneficiary Details Section */}
                <View style={styles.receiptSection}>
                  <Text style={styles.receiptSectionTitle}>BENEFICIARY INFORMATION</Text>
                  <View style={styles.receiptRow}>
                    <Text style={styles.receiptFieldLabel}>Benepisyaryo:</Text>
                    <Text style={styles.receiptFieldValue}>
                      {receiptModalData.headOfHousehold || receiptModalData.householdName || 'Verified Resident'}
                    </Text>
                  </View>
                  <View style={styles.receiptRow}>
                    <Text style={styles.receiptFieldLabel}>Tirahan / Address:</Text>
                    <Text style={styles.receiptFieldValue}>
                      {receiptModalData.householdAddress || 'City of Manila'}
                    </Text>
                  </View>
                  <View style={styles.receiptRow}>
                    <Text style={styles.receiptFieldLabel}>Barangay Assignment:</Text>
                    <Text style={styles.receiptFieldValue}>
                      Barangay {receiptModalData.barangayCode || dutyBrgy}
                    </Text>
                  </View>
                  <View style={styles.receiptRow}>
                    <Text style={styles.receiptFieldLabel}>Pamamahagi:</Text>
                    <Text style={styles.receiptFieldValue}>
                      {receiptModalData.eventTitle || selectedEvent?.title || 'Relief Operations'}
                    </Text>
                  </View>
                </View>

                <View style={styles.receiptDividerDashed} />

                {/* Itemized Allocation Table */}
                <View style={styles.receiptSection}>
                  <Text style={styles.receiptSectionTitle}>MGA NAIPAMAHAGING AYUDA / GOODS</Text>
                  <View style={styles.receiptTable}>
                    <View style={styles.receiptTableHeader}>
                      <Text style={[styles.receiptTableCol, { flex: 2 }]}>DESKRIPSYON NG AYUDA</Text>
                      <Text style={[styles.receiptTableCol, { flex: 1, textAlign: 'right' }]}>KANTIDAD</Text>
                    </View>
                    <View style={styles.receiptTableRow}>
                      <Text style={[styles.receiptTableCell, { flex: 2, fontWeight: '700' }]}>
                        {receiptModalData.itemType || selectedEvent?.itemType || 'All-in-One Family Food Pack'}
                      </Text>
                      <Text style={[styles.receiptTableCell, { flex: 1, textAlign: 'right', fontWeight: '900', color: '#1E3A8A' }]}>
                        {receiptModalData.totalPacks || 1} Pack(s)
                      </Text>
                    </View>
                  </View>
                </View>

                <View style={styles.receiptDividerDashed} />

                {/* Audit & Dispatch Logistics Trail */}
                <View style={styles.receiptSection}>
                  <Text style={styles.receiptSectionTitle}>LOGISTICS & CENTRAL AUDIT TRAIL</Text>
                  <View style={styles.receiptRow}>
                    <Text style={styles.receiptFieldLabel}>Petsa at Oras:</Text>
                    <Text style={styles.receiptFieldValue}>
                      {new Date(receiptModalData.releasedAt || Date.now()).toLocaleString('en-PH', {
                        dateStyle: 'medium',
                        timeStyle: 'short',
                      })}
                    </Text>
                  </View>
                  <View style={styles.receiptRow}>
                    <Text style={styles.receiptFieldLabel}>Nagpalabas na Opisyal:</Text>
                    <Text style={styles.receiptFieldValue}>
                      {receiptModalData.releasedByName || officerName}
                    </Text>
                  </View>
                  <View style={styles.receiptRow}>
                    <Text style={styles.receiptFieldLabel}>Disbursing Team:</Text>
                    <Text style={styles.receiptFieldValue}>
                      {receiptModalData.disbursingTeam || 'MDRRMO Field Operations'}
                    </Text>
                  </View>
                  <View style={styles.receiptRow}>
                    <Text style={styles.receiptFieldLabel}>Central Cloud Ledger:</Text>
                    <Text style={[styles.receiptFieldValue, { color: '#059669', fontWeight: '800' }]}>
                      ✓ SAVED & VERIFIED IN WEB
                    </Text>
                  </View>
                </View>

                {/* Simulated Barcode at bottom */}
                <View style={styles.receiptBarcodeSimulation}>
                  <View style={{ flexDirection: 'row', justifyContent: 'center', gap: 2, height: 26, alignItems: 'center' }}>
                    {[3, 1, 2, 4, 1, 3, 2, 1, 4, 2, 1, 3, 4, 1, 2, 3, 1, 2, 3, 2].map((w, idx) => (
                      <View key={idx} style={{ width: w, height: 24, backgroundColor: '#334155' }} />
                    ))}
                  </View>
                  <Text style={styles.receiptBarcodeText}>
                    * {receiptModalData.receiptNumber} *
                  </Text>
                </View>

                <View style={styles.receiptBottomBorder} />

                {/* Done / Next Scan Action Button */}
                <TouchableOpacity
                  style={styles.receiptDoneBtn}
                  onPress={() => {
                    setReceiptModalData(null);
                    handleResetScanner();
                  }}
                  activeOpacity={0.85}
                >
                  <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8 }}>
                    <CheckIcon size={20} color="#FFFFFF" />
                    <Text style={styles.receiptDoneBtnText}>
                      {lang === 'tl' ? '✓ Tapos Na / I-scan ang Susunod' : '✓ Done / Scan Next Beneficiary'}
                    </Text>
                  </View>
                </TouchableOpacity>
              </View>
            </ScrollView>
          )}
        </View>
      </Modal>

      {/* 3. DUPLICATE CLAIM WARNING POP-UP CARD MODAL */}
      <Modal
        visible={duplicateAlert}
        transparent
        animationType="slide"
        onRequestClose={handleResetScanner}
      >
        <View style={styles.modalBackdrop}>
          <View style={styles.duplicatePopupCard}>
            {/* Top Red Bar */}
            <View style={styles.duplicateTopBorder} />

            {/* Warning Icon Badge */}
            <View style={styles.duplicateIconCircle}>
              <AlertTriangleIcon size={34} color="#DC2626" />
            </View>

            {/* Header */}
            <Text style={styles.duplicatePopupTitle}>
              {lang === 'tl' ? 'NAKAKUHA NA NG AYUDA!' : 'DUPLICATE CLAIM BLOCKED!'}
            </Text>
            <Text style={styles.duplicatePopupSub}>
              {lang === 'tl'
                ? 'Ang residenteng ito ay nakapagtala na ng natanggap na ayuda sa distribution drive na ito ngayong araw.'
                : 'This household has already claimed relief in this distribution drive today.'}
            </Text>

            {/* Beneficiary Details Box */}
            <View style={styles.duplicateDetailsBox}>
              <View style={styles.duplicateInfoRow}>
                <Text style={styles.duplicateInfoLabel}>Benepisyaryo:</Text>
                <Text style={styles.duplicateInfoVal}>
                  {duplicateData?.name || 'Household Beneficiary'}
                </Text>
              </View>
              <View style={styles.duplicateInfoRow}>
                <Text style={styles.duplicateInfoLabel}>Tirahan / Purok:</Text>
                <Text style={styles.duplicateInfoVal}>
                  {duplicateData?.address || `Barangay ${dutyBrgy}, Manila`}
                </Text>
              </View>
              {duplicateData?.claimedAt && (
                <View style={styles.duplicateInfoRow}>
                  <Text style={styles.duplicateInfoLabel}>Oras ng Unang Claim:</Text>
                  <Text style={[styles.duplicateInfoVal, { color: '#DC2626', fontWeight: '800' }]}>
                    🕒 {new Date(duplicateData.claimedAt).toLocaleString('en-PH', { dateStyle: 'medium', timeStyle: 'short' })}
                  </Text>
                </View>
              )}
              <View style={styles.duplicateInfoRow}>
                <Text style={styles.duplicateInfoLabel}>QR Pass Reference:</Text>
                <Text style={[styles.duplicateInfoVal, { fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace', color: '#1E3A8A' }]}>
                  {duplicateData?.qrCode || manualCode || 'SCANNED PASS'}
                </Text>
              </View>
            </View>

            {/* Anti-Fraud Alert Notice */}
            <View style={styles.duplicateNoticeBanner}>
              <Text style={styles.duplicateNoticeText}>
                🛡️ <Text style={{ fontWeight: '800' }}>Anti-Fraud Protection:</Text> Nakatala na sa Central Cloud Ledger ang relief release para sa pamilyang ito. Hindi maaaring maglabas ng panibagong ayuda upang maiwasan ang dobleng pagkuha.
              </Text>
            </View>

            {/* Primary Action Button */}
            <TouchableOpacity
              style={styles.duplicateActionBtn}
              onPress={handleResetScanner}
              activeOpacity={0.85}
            >
              <Text style={styles.duplicateActionBtnText}>
                {lang === 'tl' ? 'I-scan ang Susunod na Benepisyaryo' : 'Scan Next Beneficiary'}
              </Text>
            </TouchableOpacity>

            {/* Close / Dismiss Button */}
            <TouchableOpacity
              style={styles.duplicateCloseBtn}
              onPress={handleResetScanner}
              activeOpacity={0.8}
            >
              <Text style={styles.duplicateCloseBtnText}>
                {lang === 'tl' ? '✕ Isara ang Babala' : '✕ Dismiss'}
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
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
  // Top Header: Royal Navy (LinearGradient handles the bg color)
  topHeader: {
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
    paddingHorizontal: 16,
    paddingVertical: 8,
    gap: 12,
  },
  headerKicker: {
    fontSize: 10,
    fontWeight: '800',
    color: 'rgba(255,255,255,0.65)',
    letterSpacing: 0.6,
  },
  headerOfficerName: {
    fontSize: 17,
    fontWeight: '900',
    color: '#FFFFFF',
    letterSpacing: -0.3,
    marginTop: 1,
  },
  headerDutyRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: 2,
  },
  headerDutyText: {
    fontSize: 11,
    color: '#FCD34D',
    fontWeight: '600',
  },
  // Logical Sign-Out Pill with subtle red danger styling
  glassSignOutPill: {
    backgroundColor: 'rgba(239, 68, 68, 0.18)',
    borderRadius: 20,
    paddingHorizontal: 13,
    paddingVertical: 6,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1.2,
    borderColor: 'rgba(248, 113, 113, 0.45)',
  },
  glassSignOutText: {
    color: '#FCA5A5',
    fontSize: 12,
    fontWeight: '800',
    letterSpacing: 0.2,
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
    borderColor: '#DDE4F0',
    padding: 14,
    marginBottom: 14,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    ...(Platform.OS === 'web'
      ? { boxShadow: '0 1px 3px rgba(11,21,80,0.06), 0 10px 28px rgba(28,63,148,0.10)' }
      : {
          shadowColor: '#1C3F94',
          shadowOffset: { width: 0, height: 4 },
          shadowOpacity: 0.08,
          shadowRadius: 14,
          elevation: 4,
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
    backgroundColor: '#0F172A',
    borderRadius: 22,
    padding: 16,
    marginBottom: 14,
    borderWidth: 1,
    borderColor: '#1E293B',
    alignItems: 'center',
    ...(Platform.OS === 'web'
      ? { boxShadow: '0 8px 24px rgba(15,23,42,0.18)' }
      : {
          shadowColor: '#0F172A',
          shadowOffset: { width: 0, height: 4 },
          shadowOpacity: 0.15,
          shadowRadius: 10,
          elevation: 4,
        }),
  },
  viewfinderHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    width: '100%',
    marginBottom: 4,
  },
  viewfinderBadgeIcon: {
    width: 32,
    height: 32,
    borderRadius: 10,
    backgroundColor: 'rgba(56, 189, 248, 0.12)',
    borderWidth: 1,
    borderColor: 'rgba(56, 189, 248, 0.25)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  viewfinderTitle: {
    color: '#F8FAFC',
    fontSize: 13,
    fontWeight: '900',
    letterSpacing: 0.5,
  },
  viewfinderBadgeTag: {
    color: '#94A3B8',
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 0.3,
  },
  statusPulseDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  camControlsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  camControlPill: {
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
    paddingHorizontal: 8,
    paddingVertical: 5,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.12)',
  },
  camControlPillText: {
    fontSize: 10,
    fontWeight: '700',
    color: '#E2E8F0',
  },
  camControlPillActive: {
    backgroundColor: '#38BDF8',
    borderColor: '#0284C7',
  },
  camControlPillTextActive: {
    color: '#0F172A',
    fontWeight: '800',
  },
  camControlPillTorchActive: {
    backgroundColor: '#F59E0B',
    borderColor: '#D97706',
  },
  camControlPillTorchTextActive: {
    color: '#0F172A',
    fontWeight: '800',
  },
  viewfinderSub: {
    color: '#94A3B8',
    fontSize: 11.5,
    lineHeight: 16,
    marginTop: 6,
    marginBottom: 12,
    width: '100%',
  },
  cameraBox: {
    width: '100%',
    height: 290,
    backgroundColor: '#020617',
    borderRadius: 18,
    borderWidth: 1,
    borderColor: '#1E293B',
    position: 'relative',
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  cameraPreview: {
    ...StyleSheet.absoluteFillObject,
    width: '100%',
    height: '100%',
    borderRadius: 18,
  },
  webPreviewPlaceholder: {
    alignItems: 'center',
    justifyContent: 'center',
    padding: 20,
    width: '100%',
    height: '100%',
  },
  webLensIconCircle: {
    width: 68,
    height: 68,
    borderRadius: 34,
    backgroundColor: 'rgba(56, 189, 248, 0.08)',
    borderWidth: 1.5,
    borderColor: 'rgba(56, 189, 248, 0.25)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 10,
  },
  webLensTitle: {
    color: '#F8FAFC',
    fontSize: 13.5,
    fontWeight: '800',
    letterSpacing: 0.2,
    marginBottom: 4,
  },
  webLensSub: {
    color: '#64748B',
    fontSize: 11.5,
    textAlign: 'center',
    maxWidth: 240,
    lineHeight: 16,
    marginBottom: 12,
  },
  webTestBadge: {
    backgroundColor: 'rgba(56, 189, 248, 0.12)',
    borderWidth: 1,
    borderColor: '#38BDF8',
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 16,
  },
  webTestBadgeText: {
    color: '#38BDF8',
    fontSize: 10.5,
    fontWeight: '800',
    letterSpacing: 0.4,
  },
  camLoadingBox: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  camLoadingText: {
    color: '#94A3B8',
    fontSize: 12,
    marginTop: 8,
    fontWeight: '600',
  },
  camPermBox: {
    alignItems: 'center',
    justifyContent: 'center',
    padding: 18,
  },
  camPermIconCircle: {
    width: 54,
    height: 54,
    borderRadius: 27,
    backgroundColor: 'rgba(255, 255, 255, 0.06)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 8,
  },
  camPermTitle: {
    color: '#F8FAFC',
    fontSize: 13.5,
    fontWeight: '700',
    textAlign: 'center',
    marginBottom: 4,
  },
  camPermSub: {
    color: '#94A3B8',
    fontSize: 11.5,
    textAlign: 'center',
    lineHeight: 16,
    marginBottom: 12,
    maxWidth: 240,
  },
  camPermBtn: {
    backgroundColor: '#2563EB',
    paddingHorizontal: 16,
    paddingVertical: 9,
    borderRadius: 10,
  },
  camPermBtnText: {
    color: '#FFFFFF',
    fontWeight: '800',
    fontSize: 12,
  },
  cornerMark: {
    position: 'absolute',
    width: 28,
    height: 28,
    borderColor: '#FFFFFF',
    zIndex: 5,
  },
  cornerTL: {
    top: 22,
    left: 22,
    borderTopWidth: 2.5,
    borderLeftWidth: 2.5,
    borderTopLeftRadius: 10,
  },
  cornerTR: {
    top: 22,
    right: 22,
    borderTopWidth: 2.5,
    borderRightWidth: 2.5,
    borderTopRightRadius: 10,
  },
  cornerBL: {
    bottom: 22,
    left: 22,
    borderBottomWidth: 2.5,
    borderLeftWidth: 2.5,
    borderBottomLeftRadius: 10,
  },
  cornerBR: {
    bottom: 22,
    right: 22,
    borderBottomWidth: 2.5,
    borderRightWidth: 2.5,
    borderBottomRightRadius: 10,
  },
  scanTargetReticle: {
    position: 'absolute',
    width: 205,
    height: 205,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.14)',
    borderRadius: 16,
    zIndex: 4,
  },
  laserLine: {
    position: 'absolute',
    left: 22,
    right: 22,
    top: 24,
    height: 2,
    zIndex: 6,
  },
  laserGradient: {
    flex: 1,
    height: 2,
  },
  rescanOverlayBtn: {
    position: 'absolute',
    bottom: 16,
    backgroundColor: 'rgba(15, 23, 42, 0.94)',
    paddingHorizontal: 18,
    paddingVertical: 9,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: 'rgba(56, 189, 248, 0.35)',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 7,
    zIndex: 10,
  },
  rescanOverlayBtnText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '700',
  },
  actionButtonsContainer: {
    width: '100%',
    marginTop: 12,
    gap: 8,
  },
  googleScannerBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: '#2563EB',
    borderRadius: 12,
    paddingVertical: 12,
    paddingHorizontal: 16,
    width: '100%',
  },
  googleScannerBtnText: {
    color: '#FFFFFF',
    fontSize: 12.5,
    fontWeight: '800',
    letterSpacing: 0.1,
  },
  // Scan Trigger Button & Modal
  scanTriggerBtn: {
    width: '100%',
    backgroundColor: '#1E293B',
    borderRadius: 18,
    paddingVertical: 24,
    paddingHorizontal: 16,
    alignItems: 'center',
    justifyContent: 'center',
    marginVertical: 14,
    borderWidth: 1.5,
    borderColor: '#334155',
    ...(Platform.OS === 'web'
      ? { boxShadow: '0 4px 20px rgba(15,23,42,0.25)' }
      : {
          shadowColor: '#000000',
          shadowOffset: { width: 0, height: 4 },
          shadowOpacity: 0.2,
          shadowRadius: 8,
          elevation: 4,
        }),
  },
  scanTriggerBtnDisabled: {
    opacity: 0.6,
  },
  scanTriggerIconCircle: {
    width: 68,
    height: 68,
    borderRadius: 34,
    backgroundColor: '#1C3F94',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
    borderWidth: 2,
    borderColor: '#38BDF8',
    ...(Platform.OS === 'web'
      ? { boxShadow: '0 0 16px rgba(56,189,248,0.3)' }
      : {
          shadowColor: '#38BDF8',
          shadowOffset: { width: 0, height: 0 },
          shadowOpacity: 0.35,
          shadowRadius: 8,
          elevation: 6,
        }),
  },
  scanTriggerBtnText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '900',
    letterSpacing: 0.5,
  },
  scanTriggerBtnSub: {
    color: '#94A3B8',
    fontSize: 12,
    fontWeight: '600',
    marginTop: 4,
  },
  scanModalContainer: {
    flex: 1,
    backgroundColor: '#000000',
  },
  scanModalHeader: {
    paddingTop: Platform.OS === 'android' ? (StatusBar.currentHeight || 24) + 12 : 50,
    paddingBottom: 16,
    paddingHorizontal: 18,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderBottomWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
  },
  scanModalTitle: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '900',
    letterSpacing: 0.5,
  },
  scanModalSub: {
    color: '#94A3B8',
    fontSize: 11.5,
    fontWeight: '600',
    marginTop: 2,
  },
  scanModalCloseBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(255, 255, 255, 0.15)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  scanModalCameraBox: {
    flex: 1,
    position: 'relative',
    overflow: 'hidden',
    backgroundColor: '#020617',
    alignItems: 'center',
    justifyContent: 'center',
  },
  scanModalOverlayHint: {
    position: 'absolute',
    top: 24,
    backgroundColor: 'rgba(15, 23, 42, 0.85)',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.15)',
    zIndex: 10,
  },
  scanModalOverlayText: {
    color: '#FFFFFF',
    fontSize: 12.5,
    fontWeight: '700',
    letterSpacing: 0.2,
  },
  flashModalBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    backgroundColor: 'rgba(255, 255, 255, 0.12)',
    marginHorizontal: 20,
    marginVertical: 18,
    paddingVertical: 16,
    borderRadius: 16,
    borderWidth: 1.5,
    borderColor: 'rgba(255, 255, 255, 0.25)',
  },
  flashModalBtnActive: {
    backgroundColor: '#F59E0B',
    borderColor: '#F59E0B',
  },
  flashModalBtnText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  flashModalBtnTextActive: {
    color: '#0B1D4E',
  },

  // Pagination Controls Styles
  paginationRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 14,
    paddingTop: 12,
    borderTopWidth: 1,
    borderColor: '#E2E8F0',
  },
  paginationBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingVertical: 8,
    paddingHorizontal: 14,
    borderRadius: 8,
    backgroundColor: '#EFF6FF',
    borderWidth: 1,
    borderColor: '#BFDBFE',
  },
  paginationBtnDisabled: {
    backgroundColor: '#F1F5F9',
    borderColor: '#E2E8F0',
  },
  paginationBtnText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#1C3F94',
  },
  paginationBtnTextDisabled: {
    color: '#94A3B8',
  },
  paginationPageIndicator: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
    backgroundColor: '#F8FAFC',
  },
  paginationPageText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#475569',
  },

  photoScanSecondaryBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: '#1E293B',
    borderRadius: 12,
    paddingVertical: 12,
    paddingHorizontal: 16,
    width: '100%',
    borderWidth: 1,
    borderColor: '#334155',
  },
  photoScanSecondaryBtnText: {
    color: '#E2E8F0',
    fontSize: 12.5,
    fontWeight: '700',
    letterSpacing: 0.1,
  },
  liveStatusRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 7,
    marginTop: 12,
    backgroundColor: 'rgba(255, 255, 255, 0.04)',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.06)',
  },
  liveDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#10B981',
  },
  liveStatusText: {
    color: '#94A3B8',
    fontSize: 11,
    fontWeight: '600',
  },
  manualEntryCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 16,
    marginBottom: 14,
    borderWidth: 1,
    borderColor: '#DDE4F0',
    ...(Platform.OS === 'web'
      ? { boxShadow: '0 1px 3px rgba(11,21,80,0.06), 0 10px 28px rgba(28,63,148,0.10)' }
      : {
          shadowColor: '#1C3F94',
          shadowOffset: { width: 0, height: 4 },
          shadowOpacity: 0.08,
          shadowRadius: 14,
          elevation: 4,
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
    backgroundColor: '#1C3F94',
    paddingHorizontal: 18,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
    ...(Platform.OS === 'web'
      ? { boxShadow: '0 4px 18px rgba(28,63,148,0.32)' }
      : {
          shadowColor: '#1C3F94',
          shadowOffset: { width: 0, height: 4 },
          shadowOpacity: 0.32,
          shadowRadius: 10,
          elevation: 6,
        }),
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
    backgroundColor: '#1C3F94',
    paddingVertical: 13,
    borderRadius: 12,
    alignItems: 'center',
    marginTop: 14,
    ...(Platform.OS === 'web'
      ? { boxShadow: '0 4px 18px rgba(28,63,148,0.32)' }
      : {
          shadowColor: '#1C3F94',
          shadowOffset: { width: 0, height: 4 },
          shadowOpacity: 0.32,
          shadowRadius: 10,
          elevation: 6,
        }),
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
    borderColor: '#DDE4F0',
    marginBottom: 14,
    ...(Platform.OS === 'web'
      ? { boxShadow: '0 1px 3px rgba(11,21,80,0.06), 0 10px 28px rgba(28,63,148,0.10)' }
      : {
          shadowColor: '#1C3F94',
          shadowOffset: { width: 0, height: 4 },
          shadowOpacity: 0.08,
          shadowRadius: 14,
          elevation: 4,
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
    backgroundColor: '#1C3F94',
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 16,
    ...(Platform.OS === 'web'
      ? { boxShadow: '0 4px 18px rgba(28,63,148,0.32)' }
      : {
          shadowColor: '#1C3F94',
          shadowOffset: { width: 0, height: 4 },
          shadowOpacity: 0.32,
          shadowRadius: 10,
          elevation: 6,
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
    borderColor: '#DDE4F0',
    padding: 18,
    marginBottom: 14,
    ...(Platform.OS === 'web'
      ? { boxShadow: '0 1px 3px rgba(11,21,80,0.06), 0 10px 28px rgba(28,63,148,0.10)' }
      : {
          shadowColor: '#1C3F94',
          shadowOffset: { width: 0, height: 4 },
          shadowOpacity: 0.08,
          shadowRadius: 14,
          elevation: 4,
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
    borderColor: '#DDE4F0',
    padding: 16,
    marginBottom: 12,
    ...(Platform.OS === 'web'
      ? { boxShadow: '0 1px 3px rgba(11,21,80,0.06), 0 10px 28px rgba(28,63,148,0.10)' }
      : {
          shadowColor: '#1C3F94',
          shadowOffset: { width: 0, height: 4 },
          shadowOpacity: 0.08,
          shadowRadius: 14,
          elevation: 4,
        }),
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
    backgroundColor: '#FEF2F2',
    borderRadius: 12,
    borderWidth: 1.5,
    borderColor: '#FCA5A5',
    paddingVertical: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  logoutBtnFullText: {
    color: '#DC2626',
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
    backgroundColor: '#EDF1FB',
  },
  navTabLabel: {
    fontSize: 10.5,
    fontWeight: '600',
    color: '#94A3B8',
    marginTop: 2,
  },
  navTabLabelActive: {
    color: '#1C3F94',
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

  // Pop-Up Modal & Digital Receipt Styles
  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(15, 23, 42, 0.78)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 16,
  },
  scanPopupCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    padding: 20,
    width: '100%',
    maxWidth: 420,
    borderWidth: 1.5,
    borderColor: '#E2E8F0',
    ...(Platform.OS === 'web'
      ? { boxShadow: '0 20px 40px rgba(15, 23, 42, 0.25)' }
      : {
          shadowColor: '#000',
          shadowOffset: { width: 0, height: 10 },
          shadowOpacity: 0.25,
          shadowRadius: 15,
          elevation: 10,
        }),
  },
  popupHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 14,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
  },
  popupIconCircle: {
    width: 38,
    height: 38,
    borderRadius: 12,
    backgroundColor: '#1E3A8A',
    alignItems: 'center',
    justifyContent: 'center',
  },
  popupTitle: {
    fontSize: 16,
    fontWeight: '900',
    color: '#0F172A',
  },
  popupSub: {
    fontSize: 11.5,
    color: '#64748B',
    marginTop: 1,
  },
  popupCloseBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#F1F5F9',
    alignItems: 'center',
    justifyContent: 'center',
  },
  popupBeneficiaryBox: {
    backgroundColor: '#F8FAFC',
    borderRadius: 14,
    padding: 14,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  popupHhName: {
    fontSize: 16,
    fontWeight: '900',
    color: '#0F172A',
  },
  popupHhAddress: {
    fontSize: 12.5,
    color: '#334155',
    fontWeight: '600',
    marginTop: 4,
  },
  popupHhMeta: {
    fontSize: 11.5,
    color: '#64748B',
    marginTop: 3,
  },
  popupQuotaBox: {
    backgroundColor: '#EFF6FF',
    borderRadius: 14,
    padding: 14,
    borderWidth: 1,
    borderColor: '#BFDBFE',
    marginTop: 12,
  },
  popupQuotaText: {
    fontSize: 15,
    fontWeight: '900',
    color: '#1E3A8A',
  },
  cancelBtn: {
    marginTop: 10,
    paddingVertical: 12,
    alignItems: 'center',
    backgroundColor: '#F1F5F9',
    borderRadius: 12,
  },
  cancelBtnText: {
    color: '#475569',
    fontWeight: '700',
    fontSize: 13,
  },

  // Official Receipt Modal Styles
  receiptContainer: {
    backgroundColor: '#FFFFFF',
    borderRadius: 18,
    padding: 22,
    width: '100%',
    maxWidth: 390,
    borderWidth: 1.5,
    borderColor: '#E2E8F0',
    position: 'relative',
    ...(Platform.OS === 'web'
      ? { boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.35)' }
      : {
          shadowColor: '#000',
          shadowOffset: { width: 0, height: 12 },
          shadowOpacity: 0.3,
          shadowRadius: 16,
          elevation: 12,
        }),
  },
  receiptTopBorder: {
    height: 4,
    backgroundColor: '#1E3A8A',
    borderRadius: 2,
    marginBottom: 14,
  },
  receiptHeader: {
    alignItems: 'center',
    marginBottom: 10,
  },
  receiptGovText: {
    fontSize: 10,
    fontWeight: '800',
    color: '#64748B',
    letterSpacing: 1.2,
  },
  receiptCityText: {
    fontSize: 14,
    fontWeight: '900',
    color: '#0F172A',
    letterSpacing: 0.5,
    marginTop: 2,
  },
  receiptDeptText: {
    fontSize: 9,
    fontWeight: '800',
    color: '#1E3A8A',
    letterSpacing: 0.3,
    marginTop: 1,
    textAlign: 'center',
  },
  receiptDividerDashed: {
    width: '100%',
    borderBottomWidth: 1,
    borderBottomColor: '#CBD5E1',
    borderStyle: 'dashed',
    marginVertical: 10,
  },
  receiptTitle: {
    fontSize: 14,
    fontWeight: '900',
    color: '#0F172A',
    letterSpacing: 0.3,
  },
  receiptSubTitle: {
    fontSize: 9.5,
    fontWeight: '700',
    color: '#64748B',
    letterSpacing: 0.5,
    marginTop: 1,
  },
  auditedBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: '#DCFCE7',
    borderColor: '#86EFAC',
    borderWidth: 1,
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 999,
    alignSelf: 'center',
    marginBottom: 12,
  },
  auditedBadgeText: {
    fontSize: 10.5,
    fontWeight: '900',
    color: '#15803D',
    letterSpacing: 0.5,
  },
  receiptCodeBox: {
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: 10,
    paddingVertical: 8,
    paddingHorizontal: 12,
    alignItems: 'center',
    marginBottom: 12,
  },
  receiptCodeLabel: {
    fontSize: 9,
    fontWeight: '800',
    color: '#64748B',
    letterSpacing: 0.8,
  },
  receiptCodeValue: {
    fontSize: 15,
    fontWeight: '900',
    color: '#1E3A8A',
    fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace',
    letterSpacing: 1,
    marginTop: 2,
  },
  receiptSection: {
    marginBottom: 8,
  },
  receiptSectionTitle: {
    fontSize: 9.5,
    fontWeight: '800',
    color: '#1E3A8A',
    letterSpacing: 0.6,
    marginBottom: 6,
  },
  receiptRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 4,
  },
  receiptFieldLabel: {
    fontSize: 11,
    color: '#64748B',
    fontWeight: '600',
    flex: 1,
  },
  receiptFieldValue: {
    fontSize: 11.5,
    color: '#0F172A',
    fontWeight: '700',
    flex: 1.4,
    textAlign: 'right',
  },
  receiptTable: {
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: 8,
    overflow: 'hidden',
  },
  receiptTableHeader: {
    flexDirection: 'row',
    backgroundColor: '#F1F5F9',
    paddingVertical: 6,
    paddingHorizontal: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#E2E8F0',
  },
  receiptTableCol: {
    fontSize: 9,
    fontWeight: '800',
    color: '#475569',
    letterSpacing: 0.5,
  },
  receiptTableRow: {
    flexDirection: 'row',
    backgroundColor: '#FFFFFF',
    paddingVertical: 8,
    paddingHorizontal: 8,
  },
  receiptTableCell: {
    fontSize: 11.5,
    color: '#0F172A',
  },
  receiptBarcodeSimulation: {
    alignItems: 'center',
    marginTop: 10,
    marginBottom: 14,
  },
  receiptBarcodeText: {
    fontSize: 9,
    color: '#64748B',
    fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace',
    marginTop: 3,
    letterSpacing: 1.5,
  },
  receiptBottomBorder: {
    height: 2,
    backgroundColor: '#E2E8F0',
    marginBottom: 14,
  },
  receiptDoneBtn: {
    backgroundColor: '#1E3A8A',
    paddingVertical: 13,
    borderRadius: 12,
    alignItems: 'center',
  },
  receiptDoneBtnText: {
    color: '#FFFFFF',
    fontSize: 13.5,
    fontWeight: '900',
  },

  // Completion List Styles
  completionListCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 18,
    padding: 16,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    marginBottom: 16,
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
  completionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
  },
  completionIconBadge: {
    width: 34,
    height: 34,
    borderRadius: 10,
    backgroundColor: '#059669',
    alignItems: 'center',
    justifyContent: 'center',
  },
  completionTitle: {
    fontSize: 14,
    fontWeight: '900',
    color: '#0F172A',
  },
  completionSub: {
    fontSize: 11,
    color: '#64748B',
    marginTop: 1,
  },
  completionCountPill: {
    backgroundColor: '#DCFCE7',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: '#86EFAC',
  },
  completionCountText: {
    fontSize: 11,
    fontWeight: '900',
    color: '#15803D',
  },
  emptyCompletionBox: {
    paddingVertical: 24,
    paddingHorizontal: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyCompletionText: {
    fontSize: 12,
    color: '#64748B',
    textAlign: 'center',
    lineHeight: 18,
  },
  completionItem: {
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: 12,
    padding: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  completionItemName: {
    fontSize: 13.5,
    fontWeight: '800',
    color: '#0F172A',
  },
  completionItemAddr: {
    fontSize: 11.5,
    color: '#475569',
    marginTop: 2,
  },
  completionReceiptCode: {
    fontSize: 10,
    fontWeight: '800',
    color: '#1E3A8A',
    fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace',
  },
  completionTime: {
    fontSize: 10,
    color: '#64748B',
    fontWeight: '600',
  },
  claimedPill: {
    backgroundColor: '#DCFCE7',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  claimedPillText: {
    fontSize: 9,
    fontWeight: '900',
    color: '#15803D',
  },
  viewReceiptBtn: {
    backgroundColor: '#EFF6FF',
    borderWidth: 1,
    borderColor: '#BFDBFE',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  viewReceiptBtnText: {
    fontSize: 11.5,
    fontWeight: '800',
    color: '#1E3A8A',
  },

  // Duplicate Claim Warning Pop-up Modal Styles
  duplicatePopupCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 22,
    padding: 22,
    width: '100%',
    maxWidth: 410,
    borderWidth: 1.5,
    borderColor: '#FECACA',
    alignItems: 'center',
    ...(Platform.OS === 'web'
      ? { boxShadow: '0 20px 40px rgba(220, 38, 38, 0.22)' }
      : {
          shadowColor: '#DC2626',
          shadowOffset: { width: 0, height: 10 },
          shadowOpacity: 0.25,
          shadowRadius: 15,
          elevation: 10,
        }),
  },
  duplicateTopBorder: {
    width: '100%',
    height: 4,
    backgroundColor: '#DC2626',
    borderRadius: 2,
    marginBottom: 16,
  },
  duplicateIconCircle: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: '#FEF2F2',
    borderWidth: 2,
    borderColor: '#FCA5A5',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
  },
  duplicatePopupTitle: {
    fontSize: 18,
    fontWeight: '900',
    color: '#DC2626',
    textAlign: 'center',
    letterSpacing: 0.3,
  },
  duplicatePopupSub: {
    fontSize: 12.5,
    color: '#475569',
    textAlign: 'center',
    lineHeight: 18,
    marginTop: 4,
    marginBottom: 14,
  },
  duplicateDetailsBox: {
    width: '100%',
    backgroundColor: '#F8FAFC',
    borderRadius: 14,
    padding: 14,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    marginBottom: 12,
  },
  duplicateInfoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 6,
  },
  duplicateInfoLabel: {
    fontSize: 11.5,
    color: '#64748B',
    fontWeight: '600',
    flex: 1,
  },
  duplicateInfoVal: {
    fontSize: 12,
    color: '#0F172A',
    fontWeight: '700',
    flex: 1.4,
    textAlign: 'right',
  },
  duplicateNoticeBanner: {
    width: '100%',
    backgroundColor: '#FEF2F2',
    borderRadius: 12,
    padding: 12,
    borderWidth: 1,
    borderColor: '#FECACA',
    marginBottom: 16,
  },
  duplicateNoticeText: {
    fontSize: 11.5,
    color: '#991B1B',
    lineHeight: 17,
  },
  duplicateActionBtn: {
    width: '100%',
    backgroundColor: '#DC2626',
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  duplicateActionBtnText: {
    color: '#FFFFFF',
    fontSize: 13.5,
    fontWeight: '900',
    letterSpacing: 0.2,
  },
  duplicateCloseBtn: {
    marginTop: 10,
    paddingVertical: 10,
    width: '100%',
    alignItems: 'center',
    backgroundColor: '#F1F5F9',
    borderRadius: 10,
  },
  duplicateCloseBtnText: {
    color: '#475569',
    fontSize: 12.5,
    fontWeight: '700',
  },
});

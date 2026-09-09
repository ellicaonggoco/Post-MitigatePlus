import AsyncStorage from '@react-native-async-storage/async-storage';
import React, { useState, useEffect, useRef } from 'react';
import { View, Text, ScrollView, RefreshControl, TouchableOpacity, StyleSheet, Modal, ActivityIndicator, Alert, Animated, Linking, Image, Share, Platform, StatusBar, BackHandler, ToastAndroid } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import RecoveryPhaseStepper from '../components/RecoveryPhaseStepper';
import QRCodeVisual from '../components/QRCodeVisual';
import NotificationModal from '../components/NotificationModal';
import ReportDamageScreen from './ReportDamageScreen';
import AssistanceRequestScreen from './AssistanceRequestScreen';
import ResidentClaimsHistoryScreen from './ResidentClaimsHistoryScreen';
import SettingsScreen from './SettingsScreen';
import { ArrowLeftIcon, HomeIcon, DamageIcon, PackageIcon, HistoryIcon, SettingsIcon, PhoneCallIcon, UsersIcon, ShieldCheckIcon, MapPinIcon, BellIcon, CloseIcon, DownloadIcon, MedicineIcon, BriefcaseIcon, WrenchIcon, BoxPackageIcon, CheckIcon, QrCodeIcon, FileTextIcon, PrinterIcon, ClockIcon, HourglassIcon, CopyIcon } from '../components/AppIcons';
import { COLORS, FONT_WEIGHT, SPACING, RADIUS, SHADOWS, RESPONSIVE, wp, hp } from '../theme';
import { TRANSLATIONS } from '../i18n/translations';
import { MotionShimmerCard, MotionPulseBadge, MotionPressable } from '../components/motion';
import { fetchAnnouncements, fetchHouseholdProfile } from '../services/api';
import { initSocket, onNewAnnouncement, onVerificationUpdated, onRecoveryStatusUpdated } from '../services/socketService';

const STATUSBAR_INSET = Platform.OS === 'android' ? (StatusBar.currentHeight || 24) : (Platform.OS === 'ios' ? 44 : 0);


function formatCapitalizeWords(str) {
  if (!str || typeof str !== 'string') return '';
  return str
    .toLowerCase()
    .split(' ')
    .filter(Boolean)
    .map(w => w.charAt(0).toUpperCase() + w.slice(1))
    .join(' ');
}

const EMERGENCY_HOTLINES = [
  { name: 'MDRRMO Rescue', phone: '(02) 8527-5174', tag: '24/7 Dispatch' },
  { name: 'Ambulance / EMS', phone: '(02) 8527-5175', tag: 'Medical EMS' },
  { name: 'BFP Fire & Rescue', phone: '(02) 8527-3627', tag: 'Fire Rescue' },
  { name: 'PNP Police', phone: '911', tag: 'Police Emergency' },
];

/**
 * Impeccable Tactile Animated Navigation Tab Item
 * - Spring scale physics on tab switch & press (150ms ease-out)
 * - Spatial continuity & smooth label opacity fade-in
 * - High-taste micro-interactions without layout thrashing
 */
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
      <Text style={[
        { fontSize: 10, fontWeight: isActive ? '800' : '500', color: isActive ? '#1C3F94' : '#8A9BB8' },
      ]}>
        {item.label}
      </Text>
    </TouchableOpacity>
  );
}

export default function ResidentHomeScreen({ token, user, household, onLogout, lang: propLang = 'en', onSelectLang }) {
  const [activeTab, setActiveTab] = useState('home');
  const [profilePhoto, setProfilePhoto] = useState(null);

  useEffect(() => {
    (async () => {
      try {
        const saved = await AsyncStorage.getItem('mitigateplus_profile_photo');
        if (saved) setProfilePhoto(saved);
      } catch (e) {}
    })();
  }, [activeTab]);
  const [showQRModal, setShowQRModal] = useState(false);
  const [showVerifInfoModal, setShowVerifInfoModal] = useState(false);
  const [modalCodeCopied, setModalCodeCopied] = useState(false);
  const [showNotifModal, setShowNotifModal] = useState(false);
  const [hasUnreadNotifs, setHasUnreadNotifs] = useState(false);
  const [inAppNotifs, setInAppNotifs] = useState([]);
  const [householdData, setHouseholdData] = useState(household || null);
  const [announcements, setAnnouncements] = useState([]);
  const [readAnnouncementIds, setReadAnnouncementIds] = useState([]);
  const [selectedAnnouncement, setSelectedAnnouncement] = useState(null);
  const [lang, setLang] = useState(propLang || 'en');
  const [loadingProfile, setLoadingProfile] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const lastBackPressRef = useRef(0);

  // Hardware Back Press Navigation for Resident App
  useEffect(() => {
    const onHardwareBackPress = () => {
      // 1. Close any open modal or viewer first
      if (selectedAnnouncement) {
        setSelectedAnnouncement(null);
        return true;
      }
      if (showQRModal) {
        setShowQRModal(false);
        return true;
      }
      if (showVerifInfoModal) {
        setShowVerifInfoModal(false);
        return true;
      }
      if (showNotifModal) {
        setShowNotifModal(false);
        return true;
      }

      // 2. If activeTab !== 'home', return to 'home' tab
      if (activeTab !== 'home') {
        setActiveTab('home');
        return true;
      }

      // 3. If already on 'home' tab, require double-back press to exit
      const now = Date.now();
      if (now - lastBackPressRef.current < 2000) {
        return false; // allow Android to exit to home
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
  }, [selectedAnnouncement, showQRModal, showVerifInfoModal, showNotifModal, activeTab, lang]);

  // Load read announcement IDs from AsyncStorage on mount
  useEffect(() => {
    (async () => {
      try {
        const saved = await AsyncStorage.getItem('mitigateplus_read_announcements');
        if (saved) {
          setReadAnnouncementIds(JSON.parse(saved));
        }
      } catch (e) {}
    })();
  }, []);

  const handleOpenAnnouncement = async (ann) => {
    setSelectedAnnouncement(ann);
    const annId = String(ann._id || ann.id || ann.title);
    if (!readAnnouncementIds.includes(annId)) {
      const updated = [...readAnnouncementIds, annId];
      setReadAnnouncementIds(updated);
      try {
        await AsyncStorage.setItem('mitigateplus_read_announcements', JSON.stringify(updated));
      } catch (e) {}
    }
  };

  const handleMarkAllAsRead = async () => {
    const allIds = announcements.map((a) => String(a._id || a.id || a.title));
    const combined = Array.from(new Set([...readAnnouncementIds, ...allIds]));
    setReadAnnouncementIds(combined);
    try {
      await AsyncStorage.setItem('mitigateplus_read_announcements', JSON.stringify(combined));
    } catch (e) {}
  };

  const unreadAnnouncements = announcements.filter(
    (ann) => !readAnnouncementIds.includes(String(ann._id || ann.id || ann.title))
  );
  const unreadCount = unreadAnnouncements.length;

  useEffect(() => {
    if (propLang) setLang(propLang);
  }, [propLang]);

  const t = TRANSLATIONS[lang] || TRANSLATIONS.en;

  const refreshData = async (isManual = false) => {
    if (!token) return;
    try {
      if (isManual) setLoadingProfile(false);
      else setLoadingProfile(true);

      const profile = await fetchHouseholdProfile(token);
      if (profile?.household) {
        setHouseholdData(profile.household);
        if (profile.household.inAppNotifications) {
          setInAppNotifs(profile.household.inAppNotifications);
        }
        initSocket(profile.household._id, profile.household.barangayCode || '291');
      } else {
        initSocket(null, user?.barangayCode || '291');
      }
      const currentBrgy = profile?.household?.barangayCode || user?.barangayCode || '291';
      const liveAnnouncements = await fetchAnnouncements(currentBrgy);
      if (Array.isArray(liveAnnouncements) && liveAnnouncements.length > 0) {
        setAnnouncements(liveAnnouncements);
      }
    } catch (err) {
      console.warn('Profile sync fallback:', err);
    } finally {
      setRefreshing(false);
      setLoadingProfile(false);
    }
  };

  useEffect(() => {
    refreshData(false);

    try {
      const socket = initSocket(household?._id, household?.barangayCode || user?.barangayCode || '291');
      if (socket) {
        onNewAnnouncement((newAnn) => {
          setAnnouncements((prev) => [newAnn, ...prev]);
          setHasUnreadNotifs(true);
        });
        socket.on('new_in_app_notification', (notif) => {
          setInAppNotifs((prev) => [
            { id: Date.now().toString(), title: notif.title || 'Notipikasyon', message: `Priority: ${notif.priorityLevel || 'Updated'}`, createdAt: new Date() },
            ...prev
          ]);
          setHasUnreadNotifs(true);
        });
        onVerificationUpdated((payload) => {
          const newStatus = typeof payload === 'string' ? payload : (payload?.verificationStatus || 'verified');
          const newPriority = payload?.priorityLevel;
          setHouseholdData((prev) => (prev ? { ...prev, verificationStatus: newStatus, priorityLevel: newPriority || prev.priorityLevel } : prev));
          if (newStatus === 'verified') {
            Alert.alert(
              lang === 'tl' ? 'Naaprubahan Na!' : 'Approved!',
              lang === 'tl'
                ? `Matagumpay na na-verify ng Barangay Admin ang inyong account! Ang inyong Priority Level ay [${newPriority || 'High'}]. Ang inyong QR Relief Pass ay aktibo na.`
                : `Your account has been verified by the Barangay Admin! Your Priority Level is [${newPriority || 'High'}]. Your Relief QR Pass is now active.`
            );
          }
        });
        onRecoveryStatusUpdated((status) => {
          setHouseholdData((prev) => (prev ? { ...prev, recoveryStatus: status } : prev));
        });
        socket.on('recovery_updated', (data) => {
          if (data && (String(data.householdId) === String(householdData?._id) || (data.relatedHouseholdIds && data.relatedHouseholdIds.includes(String(householdData?._id))))) {
            setHouseholdData((prev) => (prev ? { ...prev, recoveryStatus: data.status } : prev));
          }
        });
      }
    } catch (e) {
      console.warn('Socket connection note:', e);
    }
  }, [token]);

  // Silently re-sync fresh household and recovery state whenever resident returns to 'home' tab
  useEffect(() => {
    if (activeTab === 'home' && token) {
      refreshData(true);
    }
  }, [activeTab]);

  const rawName = householdData?.name || user?.name || (lang === 'tl' ? 'Rehistradong Residente' : 'Registered Resident');
  const householdName = formatCapitalizeWords(rawName);
  const address = householdData?.address || (lang === 'tl' ? 'Barangay 291, Maynila' : 'Barangay 291, Manila');
  const brgyCode = householdData?.barangayCode || user?.barangayCode || '291';
  const headcount = householdData?.memberCount || householdData?.familyHeadcount || 1;
  const priorityScore = householdData?.priorityScore || 50;
  const priorityLevel = householdData?.priorityLevel || (lang === 'tl' ? 'Mataas (High)' : 'High Priority');
  const isVerified = householdData?.verificationStatus === 'verified';
  const qrCodeString = householdData?.qrCode || `MNL-${brgyCode}-PASS-${user?._id || 'OFFICIAL'}`;
  const baseCoverage = 5; // 1 Base All-in-One Pack covers up to 5 members
  const basePacks = Math.max(1, Math.floor(headcount / baseCoverage));
  const topUpUnits = headcount > baseCoverage ? (headcount - (basePacks * baseCoverage)) : 0;

  const membersList = Array.isArray(householdData?.members) ? householdData.members : [];
  const seniorCount = membersList.filter(m => (m.age !== undefined && m.age >= 60) || m.specialConditions?.includes('senior')).length;
  const infantCount = membersList.filter(m => (m.age !== undefined && m.age <= 2) || (m.specialConditions?.includes('child') && m.age <= 2)).length;
  const pwdCount = membersList.filter(m => m.specialConditions?.includes('pwd')).length;

  // Handle Save Pass to Gallery / Offline Storage
  const handleSavePassToGallery = async () => {
    try {
      await AsyncStorage.setItem('mitigateplus_offline_pass_saved', JSON.stringify({
        householdName,
        address,
        brgyCode,
        qrCode: qrCodeString,
        headcount,
        priorityLevel,
        savedAt: new Date().toISOString(),
      }));
      Alert.alert(
        lang === 'tl' ? 'QR Pass Na-save sa Gallery!' : 'QR Pass Saved to Gallery!',
        lang === 'tl'
          ? `Nai-save ang opisyal na Relief Pass ni ${householdName} (${qrCodeString}) para sa offline verification at pisikal na presentation.`
          : `Official Relief Pass for ${householdName} (${qrCodeString}) has been securely saved to device storage for offline verification.`
      );
    } catch (err) {
      Alert.alert(
        lang === 'tl' ? 'Error sa Pag-save' : 'Save Error',
        lang === 'tl' ? 'Hindi mai-save ang QR pass. Pakisubukan muli.' : 'Could not save QR pass. Please try again.'
      );
    }
  };

  // Handle 1-Tap Copy of Household QR Code
  const handleCopyHouseholdCode = () => {
    try {
      if (typeof navigator !== 'undefined' && navigator.clipboard && navigator.clipboard.writeText) {
        navigator.clipboard.writeText(qrCodeString).catch(() => {});
      }
    } catch (e) {}
    setModalCodeCopied(true);
    setTimeout(() => setModalCodeCopied(false), 2200);
  };

  // Handle Print / Share PDF Voucher
  const handlePrintPdfVoucher = async () => {
    try {
      const voucherText = `========================================\n` +
        `   CITY GOVERNMENT OF MANILA - MDRRMO\n` +
        `   OFFICIAL DISASTER RELIEF VOUCHER\n` +
        `========================================\n\n` +
        `BENEFICIARY: ${householdName}\n` +
        `ADDRESS: ${address}, Brgy ${brgyCode}\n` +
        `HOUSEHOLD ID: ${qrCodeString}\n` +
        `FAMILY MEMBERS: ${headcount}\n` +
        `PRIORITY STATUS: ${String(priorityLevel).toUpperCase()}\n` +
        `VERIFICATION STATUS: OFFICIALLY VERIFIED\n` +
        `ISSUED BY: Manila Disaster Risk Reduction & Management Office\n` +
        `DATE GENERATED: ${new Date().toLocaleDateString()}\n\n` +
        `INSTRUCTIONS:\n` +
        `- Present this digital voucher or physical printout at your designated Barangay Relief Distribution Center.\n` +
        `- Authorized relief officers will scan the QR token for right-sized relief distribution.\n` +
        `========================================\n` +
        `MitigatePlus Civic Relief Framework (RA 10121 / RA 10173)`;

      await Share.share({
        title: `Official Disaster Relief Voucher - ${householdName}`,
        message: voucherText,
      });
    } catch (err) {
      Alert.alert(
        lang === 'tl' ? 'Error sa Pag-print' : 'Print Error',
        lang === 'tl' ? 'Hindi maibahagi ang voucher.' : 'Could not share voucher.'
      );
    }
  };

  return (
    <View style={styles.container}>
      {/* 1. App Header (Avatar + Location + Notifications Bell) - Only on Dashboard */}
      {activeTab === 'home' && (
  <LinearGradient
    colors={['#0B1D4E', '#163B8C', '#1C3F94']}
    start={{ x: 0, y: 0 }}
    end={{ x: 1, y: 0 }}
    style={styles.topHeader}
  >
    {/* Gold rule top */}
    <View style={styles.headerGoldRule} />
    {/* Profile Row */}
    <View style={styles.profileRow}>
      {/* Avatar */}
      <View style={styles.avatarGoldRing}>
        {profilePhoto ? (
          <Image source={{ uri: profilePhoto }} style={styles.avatarImg} resizeMode="cover" />
        ) : (
          <Text style={styles.avatarInitials}>
            {householdName.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase()}
          </Text>
        )}
      </View>
      {/* Name + Location */}
      <View style={styles.headerTitleArea}>
        <Text style={styles.residentTitle} numberOfLines={1}>{householdName}</Text>
        <View style={styles.civicLocationRow}>
          <MapPinIcon size={12} color="rgba(255,255,255,0.7)" />
          <Text style={styles.civicLocationText} numberOfLines={1}>
            Brgy {brgyCode} · Sta Cruz, Manila
          </Text>
        </View>
      </View>
      {/* Bell + Verified */}
      <View style={styles.headerActionArea}>
        <TouchableOpacity
          style={styles.bellBtn}
          onPress={() => { setShowNotifModal(true); setHasUnreadNotifs(false); }}
          activeOpacity={0.8}
        >
          <BellIcon size={18} color="#FFFFFF" />
          {(hasUnreadNotifs || unreadCount > 0) && (
            <View style={styles.unreadBadgeDot} />
          )}
        </TouchableOpacity>
        <TouchableOpacity
          style={[
            styles.verifCheckCircleBtn,
            isVerified ? styles.verifCheckCircleSuccess : styles.verifCheckCirclePending,
          ]}
          onPress={() => setShowVerifInfoModal(true)}
          activeOpacity={0.7}
        >
          {isVerified ? (
            <CheckIcon size={14} color="#FFFFFF" strokeWidth={2.8} />
          ) : (
            <ClockIcon size={15} color="#FCD34D" strokeWidth={2.2} />
          )}
        </TouchableOpacity>
      </View>
    </View>
  </LinearGradient>
)}

      {/* 2. Main Tab Screen Content */}
      <View style={styles.body}>
        {activeTab === 'home' ? (
          <ScrollView
            contentContainerStyle={styles.scrollContent}
            showsVerticalScrollIndicator={false}
            refreshControl={
              <RefreshControl
                refreshing={refreshing}
                onRefresh={() => refreshData(true)}
                colors={['#C8102E']}
                tintColor="#C8102E"
              />
            }
          >
            {/* 5-Phase Linear Disaster Recovery Status Stepper (Compact Top Position) */}
            <RecoveryPhaseStepper
              currentStatus={isVerified ? (householdData?.recoveryStatus || 'waiting') : 'pending'}
              isVerified={isVerified}
              lang={lang}
            />

            {/* Familiar Digital ID / Relief QR Pass Hero Card with Modern SingPass-Style Gradient */}
            <LinearGradient
              colors={isVerified ? ['#0B1D4E', '#1C3F94', '#234AAA'] : ['#1E293B', '#0F172A']}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={styles.qrHeroCardGradient}
            >
              <View style={styles.qrHeaderRow}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.qrKickerText}>
                    {lang === 'tl' ? 'OPISYAL NA CITIZEN RELIEF PASS' : 'OFFICIAL CITIZEN RELIEF PASS'}
                  </Text>
                  <Text style={styles.qrTitleWhite}>{t.reliefPassTitle}</Text>
                  <Text style={styles.qrSubTextWhite}>{householdName} • Barangay {brgyCode}</Text>
                </View>
                {isVerified ? (
                  <MotionPressable
                    style={styles.expandQRBtnGlass}
                    onPress={() => setShowQRModal(true)}
                    activeOpacity={0.8}
                  >
                    <Text style={styles.expandQRTextWhite}>{t.enlargeBtn}</Text>
                  </MotionPressable>
                ) : (
                  <View style={styles.pendingTagHeaderPill}>
                    <ClockIcon size={11} color="#B45309" />
                    <Text style={styles.pendingTagHeaderText}>
                      {lang === 'tl' ? 'HINDI PA APPRUBADO' : 'PENDING APPROVAL'}
                    </Text>
                  </View>
                )}
              </View>

              {/* 3-Column Metrics Grid in Translucent Glass */}
              <View style={styles.metricsGridRow}>
                <View style={styles.metricGridCardGlass}>
                  <Text style={styles.metricGridLabelGlass}>{t.headcountLabel}</Text>
                  <Text style={styles.metricGridValueWhite}>{headcount}</Text>
                  <Text style={styles.metricGridSubGlass}>{t.headcountUnit}</Text>
                </View>
                <View style={styles.metricGridCardGlass}>
                  <Text style={styles.metricGridLabelGlass}>{t.priorityIndexLabel}</Text>
                  <Text style={[styles.metricGridValueWhite, { color: '#FCD34D' }]}>{priorityScore} pts</Text>
                  <Text style={[styles.metricGridSubGlass, { color: '#FDE68A' }]} numberOfLines={1}>{priorityLevel}</Text>
                </View>
                <View style={styles.metricGridCardGlass}>
                  <Text style={styles.metricGridLabelGlass}>{t.reliefQuotaLabel}</Text>
                  <Text style={[styles.metricGridValueWhite, { color: '#93C5FD' }]}>{basePacks}x Base</Text>
                  <Text style={[styles.metricGridSubGlass, { color: '#BFDBFE' }]}>{topUpUnits > 0 ? `+${topUpUnits} ${t.topUpUnit}` : t.basePackUnit}</Text>
                </View>
              </View>

              {/* High-Contrast Interactive QR Block or Pending Approval Banner */}
              {!isVerified ? (
                <View style={styles.pendingVerificationFrame}>
                  <View style={styles.pendingIconWell}>
                    <ShieldCheckIcon size={30} color="#D97706" />
                  </View>
                  <Text style={styles.pendingNoticeTitle}>
                    {lang === 'tl'
                      ? 'HINDI PA NA-APRUBAHAN NG BARANGAY ADMIN'
                      : 'NOT YET APPROVED BY BARANGAY ADMIN'}
                  </Text>
                  <Text style={styles.pendingNoticeSub}>
                    {lang === 'tl'
                      ? 'Kasalukuyang nasa Verification Queue ng Barangay 291 / LGU ang inyong rehistrasyon. Lalabas lamang ang inyong Opisyal na QR Relief Pass kapag na-verify at na-aprubahan na ng Barangay Official sa Web Admin.'
                      : 'Your household registration is currently in the Barangay 291 Verification Queue. Your official QR Relief Pass will automatically appear here once approved by the Barangay Administrator.'}
                  </Text>

                  <View style={styles.pendingStatusBadgeRow}>
                    <ClockIcon size={13} color="#92400E" />
                    <Text style={styles.pendingStatusBadgeText}>
                      {lang === 'tl' ? 'KATAYUAN: NAKABINBIN SA VERIFICATION QUEUE' : 'STATUS: PENDING VERIFICATION QUEUE'}
                    </Text>
                  </View>

                  <TouchableOpacity
                    style={styles.refreshStatusBtn}
                    onPress={async () => {
                      setLoadingProfile(true);
                      try {
                        const profile = await fetchHouseholdProfile(token);
                        if (profile?.household) {
                          setHouseholdData(profile.household);
                          if (profile.household.verificationStatus === 'verified') {
                            Alert.alert(
                              lang === 'tl' ? 'Naaprubahan Na!' : 'Approved!',
                              lang === 'tl'
                                ? 'Matagumpay na na-verify ng Barangay Admin ang inyong account! Ang inyong QR Relief Pass ay aktibo na.'
                                : 'Your account has been verified by the Barangay Admin! Your Relief QR Pass is now active.'
                            );
                          } else {
                            Alert.alert(
                              lang === 'tl' ? 'Kasalukuyang Nakabinbin' : 'Still Pending Approval',
                              lang === 'tl'
                                ? 'Nasa Verification Queue pa ang inyong rehistrasyon sa Barangay 291. Pakihintay ang pag-apruba ng Barangay Official sa Web Admin.'
                                : 'Your registration is still pending review in the Barangay Verification Queue.'
                            );
                          }
                        }
                      } catch (err) {
                        Alert.alert('Notice', 'Unable to sync status. Please check your network connection.');
                      } finally {
                        setLoadingProfile(false);
                      }
                    }}
                    activeOpacity={0.85}
                  >
                    <Text style={styles.refreshStatusBtnText}>
                      {loadingProfile
                        ? (lang === 'tl' ? 'Sinusuri...' : 'Checking...')
                        : (lang === 'tl' ? ' Muling I-check ang Katayuan' : ' Refresh Approval Status')}
                    </Text>
                  </TouchableOpacity>
                </View>
              ) : (
                <MotionPressable
                  style={styles.qrInteractiveFrameWhite}
                  onPress={() => setShowQRModal(true)}
                  activeOpacity={0.92}
                >
                  <QRCodeVisual value={qrCodeString} size={230} lang={lang} isCompact />
                  <View style={styles.tapToEnlargeRow}>
                    <Text style={styles.tapToEnlargeHint}>{t.tapToInspectPass}</Text>
                  </View>
                </MotionPressable>
              )}
            </LinearGradient>

            {/* ── Relief Entitlement ── */}
            <View style={styles.entitlementBannerCard}>
              <View style={styles.entitlementHeaderRow}>
                <Text style={styles.entitlementMainTitle}>
                  {lang === 'tl' ? 'Alokasyon ng Ayuda' : 'Relief Entitlement'}
                </Text>
                <View style={styles.entitlementMembersBadge}>
                  <Text style={styles.entitlementMembersText}>
                    {headcount} {lang === 'tl' ? 'Miyembro' : 'Members'}
                  </Text>
                </View>
              </View>

              {/* Specific Package Item Rows */}
              <View style={styles.entitlementItemsList}>
                {/* 1. Base All-in-One Family Relief Pack */}
                <View style={styles.entitlementItemRow}>
                  <View style={[styles.entitlementItemDot, { backgroundColor: '#1C3F94' }]} />
                  <View style={{ flex: 1 }}>
                    <Text style={styles.entitlementItemName}>
                       {basePacks}x {lang === 'tl' ? 'All-in-One Family Relief Pack' : 'All-in-One Family Relief Pack'}
                    </Text>
                    <Text style={styles.entitlementItemDesc}>
                      {lang === 'tl' ? 'Kumpletong Bigas/Pagkain, Gamot & First Aid, at Inuming Tubig (Sakop ang hanggang 5 miyembro)' : 'Core Food Pack, Medical/First Aid Kit, Drinking Water (up to 5 members)'}
                    </Text>
                  </View>
                  <View style={[styles.entitlementQtyPill, styles.pillBlue]}>
                    <Text style={styles.entitlementQtyText}>{basePacks} {basePacks > 1 ? 'PACKS' : 'PACK'}</Text>
                  </View>
                </View>

                {/* 2. Extra Member Top-Up (if headcount > 5) */}
                {topUpUnits > 0 && (
                  <View style={styles.entitlementItemRow}>
                    <View style={[styles.entitlementItemDot, { backgroundColor: '#0284C7' }]} />
                    <View style={{ flex: 1 }}>
                      <Text style={styles.entitlementItemName}>
                         +{topUpUnits} {lang === 'tl' ? 'Extra Member Food Top-Up' : 'Extra Member Food Top-Up'}
                      </Text>
                      <Text style={styles.entitlementItemDesc}>
                        {lang === 'tl' ? `Karagdagang pagkain para sa ${topUpUnits} miyembrong lampas sa 5-pax base capacity` : `Additional food allocation for ${topUpUnits} member(s) beyond base 5-pax coverage`}
                      </Text>
                    </View>
                    <View style={[styles.entitlementQtyPill, styles.pillSky]}>
                      <Text style={styles.entitlementQtyText}>+{topUpUnits} UNITS</Text>
                    </View>
                  </View>
                )}

                {/* 3. Senior Citizen Maintenance & Nutrition Top-Up */}
                {seniorCount > 0 && (
                  <View style={styles.entitlementItemRow}>
                    <View style={[styles.entitlementItemDot, { backgroundColor: '#C9A84C' }]} />
                    <View style={{ flex: 1 }}>
                      <Text style={styles.entitlementItemName}>
                         +{seniorCount} {lang === 'tl' ? 'Senior Maintenance Meds & Nutrition Pack' : 'Senior Maintenance & Nutrition Pack'}
                      </Text>
                      <Text style={styles.entitlementItemDesc}>
                        {lang === 'tl' ? `Masustansyang pagkain at Maintenance Medicines para sa ${seniorCount} Senior Citizen` : `Nutritious food & maintenance medicines for ${seniorCount} Senior Citizens`}
                      </Text>
                    </View>
                    <View style={[styles.entitlementQtyPill, styles.pillGold]}>
                      <Text style={styles.entitlementQtyText}>+{seniorCount} PACK</Text>
                    </View>
                  </View>
                )}

                {/* 4. Infant Care & Baby Nutrition Top-Up */}
                {infantCount > 0 && (
                  <View style={styles.entitlementItemRow}>
                    <View style={[styles.entitlementItemDot, { backgroundColor: '#BE185D' }]} />
                    <View style={{ flex: 1 }}>
                      <Text style={styles.entitlementItemName}>
                         +{infantCount} {lang === 'tl' ? 'Gatas at Nutrisyon para sa Sanggol' : 'Infant Care & Baby Nutrition Pack'}
                      </Text>
                      <Text style={styles.entitlementItemDesc}>
                        {lang === 'tl' ? `Gatas/infant formula at baby food para sa ${infantCount} sanggol (0-2 yo)` : `Infant milk formula & baby nutrition for ${infantCount} infant(s)`}
                      </Text>
                    </View>
                    <View style={[styles.entitlementQtyPill, styles.pillPink]}>
                      <Text style={styles.entitlementQtyText}>+{infantCount} PACK</Text>
                    </View>
                  </View>
                )}

                {/* 5. PWD Health Support Top-Up */}
                {pwdCount > 0 && (
                  <View style={styles.entitlementItemRow}>
                    <View style={[styles.entitlementItemDot, { backgroundColor: '#6D28D9' }]} />
                    <View style={{ flex: 1 }}>
                      <Text style={styles.entitlementItemName}>
                         +{pwdCount} {lang === 'tl' ? 'Tulong Pangkalusugan para sa PWD' : 'PWD Health Support Pack'}
                      </Text>
                      <Text style={styles.entitlementItemDesc}>
                        {lang === 'tl' ? `Medikal at health support para sa ${pwdCount} PWD member` : `Medical & health care support for ${pwdCount} PWD member(s)`}
                      </Text>
                    </View>
                    <View style={[styles.entitlementQtyPill, styles.pillPurple]}>
                      <Text style={styles.entitlementQtyText}>+{pwdCount} PACK</Text>
                    </View>
                  </View>
                )}
              </View>
            </View>

            {/* Announcements & Civic Feed Section with Direct 1-Tap Action Links */}
            <View style={styles.announcementsSection}>
              <View style={styles.sectionHeaderRow}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                  <Text style={styles.sectionTitle}>{lang === 'tl' ? 'Mga Anunsyo' : 'Announcements'}</Text>
                  {unreadCount > 0 && (
                    <View style={styles.unreadCountBadge}>
                      <Text style={styles.unreadCountText}>{unreadCount}</Text>
                    </View>
                  )}
                </View>
                {unreadCount > 0 && (
                  <TouchableOpacity
                    onPress={handleMarkAllAsRead}
                    style={{ paddingVertical: 3, paddingHorizontal: 8, borderRadius: 6, backgroundColor: '#EFF6FF', borderWidth: 1, borderColor: '#BFDBFE' }}
                    activeOpacity={0.8}
                  >
                    <Text style={{ fontSize: 11, fontWeight: '700', color: '#1D4ED8' }}>
                      {lang === 'tl' ? 'Basahin Lahat' : 'Mark all read'}
                    </Text>
                  </TouchableOpacity>
                )}
              </View>

              {announcements.length === 0 ? (
                <View style={[styles.announcementCard, { alignItems: 'center', paddingVertical: 24 }]}>
                  <Text style={{ fontSize: 13, color: COLORS.inkLighter, fontWeight: FONT_WEIGHT.medium, textAlign: 'center' }}>
                    {lang === 'tl' ? 'Walang bagong anunsyo sa kasalukuyan mula sa LGU o Barangay.' : 'No new advisories or announcements at this time.'}
                  </Text>
                </View>
              ) : (
                announcements.map((ann, idx) => {
                  const annId = String(ann._id || ann.id || ann.title);
                  const isUnread = !readAnnouncementIds.includes(annId);

                  return (
                    <TouchableOpacity
                      key={ann._id || ann.id || idx}
                      style={[
                        styles.announcementCard,
                        ann.isUrgent && styles.announcementCardUrgent,
                        isUnread && {
                          borderLeftWidth: 4,
                          borderLeftColor: ann.isUrgent ? '#DC2626' : '#1C3F94',
                          backgroundColor: '#F8FAFC',
                        },
                      ]}
                      onPress={() => handleOpenAnnouncement(ann)}
                      activeOpacity={0.85}
                    >
                      <View style={styles.annTopRow}>
                        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
                          {isUnread && (
                            <View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: ann.isUrgent ? '#DC2626' : '#1C3F94' }} />
                          )}
                          <View style={styles.annTagBadge}>
                            <Text style={styles.annTagText}>{ann.tag || t.officialAdvisory || (lang === 'tl' ? 'Advisory' : 'Advisory')}</Text>
                          </View>
                          {ann.edited ? (
                            <View style={[styles.annTagBadge, { backgroundColor: '#FEF3C7', borderColor: '#FCD34D' }]}>
                              <Text style={[styles.annTagText, { color: '#B45309', fontWeight: '800' }]}>
                                {lang === 'tl' ? '(Nai-edit)' : '(Edited)'}
                              </Text>
                            </View>
                          ) : null}
                          {isUnread && (
                            <View style={[styles.annTagBadge, { backgroundColor: '#EFF6FF', borderColor: '#BFDBFE' }]}>
                              <Text style={[styles.annTagText, { color: '#1D4ED8', fontWeight: '800', fontSize: 9 }]}>
                                {lang === 'tl' ? 'BAGO' : 'NEW'}
                              </Text>
                            </View>
                          )}
                        </View>
                        <Text style={styles.annTime}>{ann.timestamp || (ann.postedAt ? new Date(ann.postedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '')}</Text>
                      </View>
                      <Text style={styles.annTitle}>{ann.title}</Text>
                      <Text style={styles.annBody} numberOfLines={2}>{ann.body}</Text>
                      {ann.targetTab && (
                        <TouchableOpacity
                          style={styles.annActionBtn}
                          onPress={() => {
                            handleOpenAnnouncement(ann);
                            setActiveTab(ann.targetTab);
                          }}
                          activeOpacity={0.85}
                        >
                          <Text style={styles.annActionBtnText}>
                            {ann.targetTab === 'request'
                              ? (lang === 'tl' ? 'Humiling ng Ayuda' : 'Request Relief')
                              : ann.targetTab === 'damage'
                              ? (lang === 'tl' ? 'Mag-ulat ng Sira' : 'Report Damage')
                              : (lang === 'tl' ? 'Tingnan ang History' : 'View History')}
                          </Text>
                        </TouchableOpacity>
                      )}
                    </TouchableOpacity>
                  );
                })
              )}
            </View>
          

            {/* ── 24/7 Manila Emergency Hotlines 1-Tap SOS Dialers ── */}
            <View style={styles.emergencyHotlineSection}>
              <View style={styles.emergencySectionHeader}>
                <View style={styles.emergencyIconDot} />
                <Text style={styles.emergencySectionTitle}>
                  {lang === 'tl' ? '24/7 TULONG AT RESCUE HOTLINES' : '24/7 EMERGENCY RESCUE HOTLINES'}
                </Text>
              </View>
              <Text style={styles.emergencySectionSub}>
                {lang === 'tl' ? 'Pindutin ang alinman para direktang tumawag sa oras ng sakuna o baha:' : 'Tap any service to call immediately in an emergency.'}
              </Text>
              <View style={styles.emergencyGrid}>
                {EMERGENCY_HOTLINES.map((hotline, hIdx) => (
                  <MotionPressable
                    key={hIdx}
                    style={styles.emergencyDialBtn}
                    onPress={() => {
                      const cleanNum = hotline.phone.replace(/[^0-9]/g, '');
                      Linking.openURL(`tel:${cleanNum}`);
                    }}
                    activeOpacity={0.8}
                  >
                    <View style={styles.emergencyIconWell}>
                      <PhoneCallIcon size={14} color="#C8102E" />
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={styles.emergencyDialName}>{hotline.name}</Text>
                      <Text style={styles.emergencyDialPhone}>{hotline.phone}</Text>
                    </View>
                  </MotionPressable>
                ))}
              </View>
            </View>
          </ScrollView>
        ) : activeTab === 'assistance' ? (
          <AssistanceRequestScreen
            token={token}
            lang={lang}
            user={user}
            householdData={householdData}
            onBack={() => setActiveTab('home')}
            onSubmitSuccess={() => setActiveTab('home')}
          />
        ) : activeTab === 'damage' ? (
          <ReportDamageScreen
            token={token}
            user={user}
            householdData={householdData}
            lang={lang}
            onBack={() => setActiveTab('home')}
            onSubmitSuccess={() => {
              Alert.alert(
                lang === 'tl' ? 'Tagumpay' : 'Success',
                lang === 'tl' ? 'Naisumite na ang ulat ng pinsala sa LGU Engineers.' : 'Damage report submitted to LGU engineers.'
              );
              setActiveTab('home');
            }}
          />
        ) : activeTab === 'history' ? (
          <ResidentClaimsHistoryScreen
            token={token}
            user={user}
            household={householdData || household}
            lang={lang}
            onBack={() => setActiveTab('home')}
          />
        ) : (
          <SettingsScreen
            user={user}
            onPhotoUpdated={(uri) => setProfilePhoto(uri)}
            lang={lang}
            onSelectLang={(code) => {
              setLang(code);
              if (onSelectLang) onSelectLang(code);
            }}
            onLogout={onLogout}
          />
        )}
      </View>

      {/* 3. Iconly Dynamic Island Floating Nav Bar with Impeccable Spring Animations (5 Clean Tabs) */}
      {/* Tab Bar - frosted glass */}
<View style={styles.tabBarContainer}>
  {[
    { key: 'home', label: 'Home', renderIcon: (isActive) => <HomeIcon size={22} color={isActive ? '#1C3F94' : '#8A9BB8'} filled={false} /> },
    { key: 'assistance', label: 'Livelihood', renderIcon: (isActive) => <WrenchIcon size={22} color={isActive ? '#1C3F94' : '#8A9BB8'} strokeWidth={isActive ? 2.4 : 2.0} filled={false} /> },
    { key: 'damage', label: 'Report', renderIcon: (isActive) => <DamageIcon size={22} color={isActive ? '#1C3F94' : '#8A9BB8'} filled={false} /> },
    { key: 'history', label: 'History', renderIcon: (isActive) => <HistoryIcon size={22} color={isActive ? '#1C3F94' : '#8A9BB8'} filled={false} /> },
    { key: 'settings', label: 'Settings', renderIcon: (isActive) => <SettingsIcon size={22} color={isActive ? '#1C3F94' : '#8A9BB8'} filled={false} /> },
  ].map((item) => (
    <AnimatedNavItem
      key={item.key}
      item={item}
      isActive={activeTab === item.key}
      onPress={() => setActiveTab(item.key)}
    />
  ))}
  {/* Home indicator pill */}
  <View style={styles.homeIndicatorPill} />
</View>

      {/* 4. Full-Screen Digital Relief QR Pass Modal with Figma SingPass Design System */}
      <Modal visible={showQRModal} animationType="fade" transparent onRequestClose={() => setShowQRModal(false)}>
        <View style={styles.modalBackdrop}>
          <TouchableOpacity
            style={styles.modalBackdropTapZone}
            activeOpacity={1}
            onPress={() => setShowQRModal(false)}
          />

          <View style={styles.modalCard}>
            {/* Sticky Top Header Bar */}
            <View style={styles.modalTopBar}>
              <TouchableOpacity
                style={styles.modalBackBtn}
                onPress={() => setShowQRModal(false)}
                activeOpacity={0.8}
              >
                <ArrowLeftIcon size={14} color="#1C3F94" strokeWidth={2.4} />
                <Text style={styles.modalBackBtnText}>{lang === 'tl' ? 'Bumalik' : 'Back'}</Text>
              </TouchableOpacity>
              <Text style={styles.modalTopBarTitle}>
                {lang === 'tl' ? 'Opisyal na QR Pass' : 'Official QR Pass'}
              </Text>
              <TouchableOpacity
                style={styles.modalCircularCloseBtn}
                onPress={() => setShowQRModal(false)}
                activeOpacity={0.8}
              >
                <CloseIcon size={16} color="#64748B" strokeWidth={2.4} />
              </TouchableOpacity>
            </View>

            <ScrollView style={styles.modalScrollView} contentContainerStyle={styles.modalScrollContent} showsVerticalScrollIndicator={false}>
              {isVerified ? (
                <>
                  {/* ── Official SingPass Digital Relief Pass Hero Card ── */}
                  <LinearGradient
                    colors={['#0B1D4E', '#163B8C', '#234AAA']}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 1 }}
                    style={styles.modalPassCard}
                  >
                    {/* Gold Accent Top Bar */}
                    <View style={styles.modalPassGoldTop} />

                    {/* Header Row: Seal, Title, Verified Badge */}
                    <View style={styles.modalPassHeaderRow}>
                      <View style={styles.modalPassSealCircle}>
                        <Image
                          source={require('../../assets/logo-mark.png')}
                          style={{ width: 22, height: 22 }}
                          resizeMode="contain"
                        />
                      </View>
                      <View style={{ flex: 1 }}>
                        <Text style={styles.modalPassKicker}>
                          {lang === 'tl' ? 'OPISYAL NA CITIZEN RELIEF PASS' : 'OFFICIAL CITIZEN RELIEF PASS'}
                        </Text>
                        <Text style={styles.modalPassTitleWhite}>Household Digital ID</Text>
                        <Text style={styles.modalPassSubWhite} numberOfLines={1}>
                          {householdName} · Brgy {brgyCode}
                        </Text>
                      </View>
                      <View style={styles.modalPassVerifiedBadge}>
                        <CheckIcon size={11} color="#FFFFFF" strokeWidth={3} />
                        <Text style={styles.modalPassVerifiedBadgeText}>
                          {lang === 'tl' ? 'BERIPIKADO' : 'VERIFIED'}
                        </Text>
                      </View>
                    </View>

                    {/* 3 Metrics Row in Glass Cards */}
                    <View style={styles.modalPassMetricsGrid}>
                      <View style={styles.modalPassMetricCard}>
                        <Text style={styles.modalPassMetricLabel}>{t.headcountLabel || 'HEADCOUNT'}</Text>
                        <Text style={styles.modalPassMetricValue}>{headcount}</Text>
                        <Text style={styles.modalPassMetricSub}>{t.headcountUnit || 'Members'}</Text>
                      </View>
                      <View style={styles.modalPassMetricCard}>
                        <Text style={styles.modalPassMetricLabel}>{t.priorityIndexLabel || 'PRIORITY INDEX'}</Text>
                        <Text style={[styles.modalPassMetricValue, { color: '#FCD34D' }]}>{priorityScore} pts</Text>
                        <Text style={[styles.modalPassMetricSub, { color: '#FDE68A' }]} numberOfLines={1}>{priorityLevel}</Text>
                      </View>
                      <View style={styles.modalPassMetricCard}>
                        <Text style={styles.modalPassMetricLabel}>{t.reliefQuotaLabel || 'RIGHT-SIZED'}</Text>
                        <Text style={[styles.modalPassMetricValue, { color: '#93C5FD' }]}>{basePacks}x Base</Text>
                        <Text style={[styles.modalPassMetricSub, { color: '#BFDBFE' }]} numberOfLines={1}>
                          {topUpUnits > 0 ? `+${topUpUnits} ${t.topUpUnit || 'Top-Up'}` : (t.basePackUnit || 'Base Pack')}
                        </Text>
                      </View>
                    </View>

                    {/* Scannable Large QR Frame with Gold Border */}
                    <View style={styles.modalPassQRFrame}>
                      <QRCodeVisual value={qrCodeString} size={240} lang={lang} isCompact />
                      <View style={styles.modalPassScannablePill}>
                        <CheckIcon size={11} color="#059669" strokeWidth={2.6} />
                        <Text style={styles.modalPassScannableText}>
                          {lang === 'tl' ? '100% Ma-i-scan na Opisyal na Beneficiary Pass' : '100% Scannable Official Beneficiary Pass'}
                        </Text>
                      </View>
                    </View>

                    {/* 1-Tap Direct Tap-to-Copy Manual Household ID */}
                    <TouchableOpacity
                      style={[styles.modalPassCodeContainer, modalCodeCopied && styles.modalPassCodeContainerCopied]}
                      onPress={handleCopyHouseholdCode}
                      activeOpacity={0.8}
                    >
                      <Text style={[styles.modalPassCodeLabel, modalCodeCopied && { color: '#34D399' }]}>
                        {modalCodeCopied
                          ? (lang === 'tl' ? 'Na-kopya na sa clipboard!' : 'Copied to clipboard!')
                          : (lang === 'tl' ? 'MANUAL HOUSEHOLD ID (I-TAP UPANG KOPYAHIN):' : 'MANUAL HOUSEHOLD ID (TAP CODE TO COPY):')}
                      </Text>
                      <View style={[styles.modalPassCodePill, modalCodeCopied && styles.modalPassCodePillCopied]}>
                        <CopyIcon size={14} color={modalCodeCopied ? '#10B981' : '#FCD34D'} />
                        <Text style={[styles.modalPassCodeText, modalCodeCopied && { color: '#065F46' }]}>{qrCodeString}</Text>
                      </View>
                    </TouchableOpacity>

                    {/* Beneficiary Address Footer inside Pass */}
                    <View style={styles.modalPassAddressRow}>
                      <MapPinIcon size={12} color="rgba(255,255,255,0.7)" />
                      <Text style={styles.modalPassAddressText} numberOfLines={1}>
                        {address}, Brgy {brgyCode} · Sta Cruz, Manila
                      </Text>
                    </View>

                    {/* Gold Accent Bottom Bar */}
                    <View style={styles.modalPassGoldBottom} />
                  </LinearGradient>

                  {/* Equal-Width Action Buttons */}
                  <View style={styles.modalPassActionsArea}>
                    <TouchableOpacity
                      style={styles.modalPrimaryActionBtn}
                      onPress={handleSavePassToGallery}
                      activeOpacity={0.85}
                    >
                      <DownloadIcon size={16} color="#FFFFFF" />
                      <Text style={styles.modalPrimaryActionBtnText}>
                        {lang === 'tl' ? 'I-save ang Pass sa Gallery' : 'Save Pass to Gallery'}
                      </Text>
                    </TouchableOpacity>

                    <TouchableOpacity
                      style={styles.modalSecondaryActionBtn}
                      onPress={handlePrintPdfVoucher}
                      activeOpacity={0.85}
                    >
                      <FileTextIcon size={16} color="#1C3F94" />
                      <Text style={styles.modalSecondaryActionBtnText}>
                        {lang === 'tl' ? 'I-print / I-save bilang PDF Voucher' : 'Print / Save as PDF Voucher'}
                      </Text>
                    </TouchableOpacity>
                  </View>
                </>
              ) : (
                <View style={styles.modalPendingCard}>
                  <View style={styles.modalPendingIconWell}>
                    <ClockIcon size={40} color="#D97706" />
                  </View>
                  <Text style={styles.modalPendingTitle}>
                    {lang === 'tl' ? 'PENDING VERIFICATION' : 'PENDING VERIFICATION'}
                  </Text>
                  <Text style={styles.modalPendingSubTitle}>
                    {lang === 'tl' ? '(Hindi Pa Beripikado)' : '(Under Verification)'}
                  </Text>

                  <View style={styles.modalPendingBadge}>
                    <ClockIcon size={12} color="#92400E" />
                    <Text style={styles.modalPendingBadgeText}>
                      {lang === 'tl' ? 'KATAYUAN: NAKABINBIN SA PAGSUSURI' : 'STATUS: PENDING REVIEW'}
                    </Text>
                  </View>

                  <Text style={styles.modalPendingMessage}>
                    {lang === 'tl'
                      ? 'Kasalukuyang sinusuri ng Barangay Council ang inyong rehistrasyon sa Verification Queue sa Web Admin. Awtomatikong magiging tsek at magiging aktibo ang inyong QR Pass oras na maaprubahan.'
                      : 'Your registration is currently under review by the Barangay Council in the Verification Queue on the Web Admin. Your official QR Pass will automatically activate once approved.'}
                  </Text>

                  <TouchableOpacity
                    style={styles.modalCloseBtnFallback}
                    onPress={() => setShowQRModal(false)}
                    activeOpacity={0.85}
                  >
                    <Text style={styles.modalCloseBtnFallbackText}>
                      {lang === 'tl' ? 'Naiintindihan Ko' : 'I Understand'}
                    </Text>
                  </TouchableOpacity>
                </View>
              )}
            </ScrollView>
          </View>
        </View>
      </Modal>

      
      {/* 6. Verification Status Info Modal Card */}
      <Modal
        visible={showVerifInfoModal}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setShowVerifInfoModal(false)}
      >
        <View style={styles.verifModalOverlay}>
          <TouchableOpacity
            style={styles.verifModalBackdrop}
            activeOpacity={1}
            onPress={() => setShowVerifInfoModal(false)}
          />
          <View style={styles.verifInfoCard}>
            <View style={[styles.verifInfoIconCircle, isVerified ? { backgroundColor: '#DCFCE7', borderColor: '#86EFAC' } : { backgroundColor: '#FEF3C7', borderColor: '#FCD34D' }]}>
              {isVerified ? (
                <CheckIcon size={24} color="#16A34A" strokeWidth={2.5} />
              ) : (
                <ClockIcon size={24} color="#D97706" strokeWidth={2.2} />
              )}
            </View>

            <Text style={styles.verifInfoTitle}>
              {isVerified
                ? (lang === 'tl' ? 'Beripikadong Residente' : 'Verified Household')
                : (lang === 'tl' ? 'Hindi Pa Beripikado' : 'Pending Verification')}
            </Text>

            <View style={[styles.verifStatusTag, isVerified ? { backgroundColor: '#DCFCE7' } : { backgroundColor: '#FEF3C7', borderWidth: 1, borderColor: '#FDE68A' }]}>
              <Text style={[styles.verifStatusTagText, isVerified ? { color: '#15803D' } : { color: '#B45309' }]}>
                {isVerified ? 'STATUS: VERIFIED' : 'STATUS: PENDING REVIEW'}
              </Text>
            </View>

            <Text style={styles.verifInfoDesc}>
              {isVerified
                ? (lang === 'tl'
                    ? 'Ang inyong pamilya ay opisyal nang beripikado ng Barangay 291 at LGU Maynila. Aktibo ang inyong QR Pass para sa agarang pagtanggap ng ayuda at emergency services.'
                    : 'Your household is officially verified by Barangay 291 and City Government of Manila. Your Digital Relief Pass is fully active.')
                : (lang === 'tl'
                    ? 'Kasalukuyang sinusuri ng Barangay Council ang inyong rehistrasyon sa Verification Queue sa Web Admin. Awtomatikong magiging beripikado at magiging aktibo ang inyong QR Pass oras na maaprubahan.'
                    : 'Your household registration is currently being reviewed by the Barangay Council in the Verification Queue on the Web Admin. Your Digital Relief QR Pass will automatically activate once approved by the Barangay Official.')}
            </Text>

            <TouchableOpacity
              style={styles.verifInfoCloseBtn}
              onPress={() => setShowVerifInfoModal(false)}
              activeOpacity={0.85}
            >
              <Text style={styles.verifInfoCloseBtnText}>
                {lang === 'tl' ? 'Naintindihan' : 'Got it'}
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* 7. Full Announcement Detail Modal */}
      <Modal
        visible={!!selectedAnnouncement}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setSelectedAnnouncement(null)}
      >
        <View style={styles.verifModalOverlay}>
          <TouchableOpacity
            style={styles.verifModalBackdrop}
            activeOpacity={1}
            onPress={() => setSelectedAnnouncement(null)}
          />
          <View style={styles.announcementDetailCard}>
            <View style={styles.annDetailTopRow}>
              <View style={styles.annTagBadge}>
                <Text style={styles.annTagText}>
                  {selectedAnnouncement?.tag || (lang === 'tl' ? 'Opisyal na Anunsyo' : 'Official Advisory')}
                </Text>
              </View>
              <TouchableOpacity
                style={styles.annDetailCloseBtn}
                onPress={() => setSelectedAnnouncement(null)}
                activeOpacity={0.8}
              >
                <CloseIcon size={16} color="#172B4D" />
              </TouchableOpacity>
            </View>

            <Text style={styles.annDetailTitle}>{selectedAnnouncement?.title}</Text>

            <View style={styles.annDetailMetaRow}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                <MapPinIcon size={12} color="#1C3F94" />
                <Text style={styles.annDetailMetaText}>Barangay {brgyCode} Disaster Council</Text>
              </View>
              <Text style={styles.annDetailTimeText}>
                {selectedAnnouncement?.timestamp || (selectedAnnouncement?.postedAt ? new Date(selectedAnnouncement.postedAt).toLocaleString('en-PH', { timeZone: 'Asia/Manila' }) : 'Recent')}
              </Text>
            </View>

            <ScrollView style={{ maxHeight: 220, marginVertical: 12 }} showsVerticalScrollIndicator={false}>
              <Text style={styles.annDetailBodyText}>{selectedAnnouncement?.body}</Text>
            </ScrollView>

            {selectedAnnouncement?.targetTab ? (
              <TouchableOpacity
                style={styles.annDetailActionBtn}
                onPress={() => {
                  const target = selectedAnnouncement.targetTab;
                  setSelectedAnnouncement(null);
                  setActiveTab(target);
                }}
                activeOpacity={0.85}
              >
                <Text style={styles.annDetailActionBtnText}>
                  {selectedAnnouncement.targetTab === 'request'
                    ? (lang === 'tl' ? 'Pumunta sa Livelihood' : 'Go to Livelihood')
                    : selectedAnnouncement.targetTab === 'damage'
                    ? (lang === 'tl' ? 'Pumunta sa Damage Report' : 'Go to Damage Report')
                    : (lang === 'tl' ? 'Pumunta sa Claims History' : 'Go to Claims History')}
                </Text>
              </TouchableOpacity>
            ) : (
              <TouchableOpacity
                style={styles.annDetailCloseMainBtn}
                onPress={() => setSelectedAnnouncement(null)}
                activeOpacity={0.85}
              >
                <Text style={styles.annDetailCloseMainBtnText}>
                  {lang === 'tl' ? 'Naintindihan Ko (Isara)' : 'Got it (Close)'}
                </Text>
              </TouchableOpacity>
            )}
          </View>
        </View>
      </Modal>

      {/* 5. Top Popover Notifications with Direct Screen Navigation */}
      <NotificationModal
        visible={showNotifModal}
        onClose={() => {
          setShowNotifModal(false);
          setHasUnreadNotifs(false);
        }}
        notifs={[
          ...inAppNotifs.map((n) => ({
            id: n.id,
            title: n.title,
            body: n.message,
            time: n.createdAt ? new Date(n.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : 'Kamakailan',
            tag: n.type === 'priority_update' ? 'Priority' : 'Opisyal',
            targetTab: 'history',
            type: 'urgent',
            unread: !n.isRead,
          })),
          ...announcements.map((a, idx) => ({
            id: a.id || idx,
            title: a.title,
            body: a.body,
            time: a.timestamp,
            tag: a.tag,
            targetTab: a.targetTab || (idx === 0 ? 'request' : idx === 1 ? 'damage' : 'history'),
            type: a.isUrgent ? 'urgent' : 'advisory',
            unread: idx === 0,
          }))
        ]}
        onNavigate={(targetTab) => {
          if (targetTab) {
            setActiveTab(targetTab);
            setShowNotifModal(false);
            setHasUnreadNotifs(false);
          }
        }}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  verifModalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(15, 23, 42, 0.65)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
    zIndex: 999,
  },
  verifModalBackdrop: {
    ...StyleSheet.absoluteFillObject,
  },
  verifInfoCard: {
    width: '100%',
    maxWidth: 340,
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    padding: 22,
    alignItems: 'center',
    ...SHADOWS.lg,
    zIndex: 1000,
  },
  verifInfoIconCircle: {
    width: 52,
    height: 52,
    borderRadius: 26,
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
  },
  verifInfoTitle: {
    fontSize: 17,
    fontWeight: FONT_WEIGHT.black,
    color: '#0F172A',
    marginBottom: 6,
    textAlign: 'center',
  },
  verifStatusTag: {
    paddingHorizontal: 10,
    paddingVertical: 3.5,
    borderRadius: 6,
    marginBottom: 12,
  },
  verifStatusTagText: {
    fontSize: 10.5,
    fontWeight: '800',
    letterSpacing: 0.6,
  },
  verifInfoDesc: {
    fontSize: 12.5,
    color: '#475569',
    textAlign: 'center',
    lineHeight: 18,
    marginBottom: 18,
  },
  verifInfoCloseBtn: {
    width: '100%',
    backgroundColor: '#1C3F94',
    borderRadius: 10,
    paddingVertical: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  verifInfoCloseBtnText: {
    color: '#FFFFFF',
    fontSize: 13.5,
    fontWeight: '800',
  },

  container: {
    flex: 1,
    backgroundColor: '#F3F6FC',
  },
  // Hero header styles
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
  paddingHorizontal: 16,
  paddingVertical: 8,
  gap: 10,
},
avatarGoldRing: {
  width: 42,
  height: 42,
  borderRadius: 21,
  borderWidth: 2,
  borderColor: '#C9A84C',
  backgroundColor: '#1E3A8A',
  alignItems: 'center',
  justifyContent: 'center',
  overflow: 'hidden',
},
avatarImg: {
  width: '100%',
  height: '100%',
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
  color: 'rgba(255,255,255,0.6)',
  fontWeight: '500',
},
headerActionArea: {
  flexDirection: 'row',
  alignItems: 'center',
  gap: 8,
},
bellBtn: {
  width: 36,
  height: 36,
  borderRadius: 18,
  backgroundColor: 'rgba(255,255,255,0.15)',
  borderWidth: 1,
  borderColor: 'rgba(255,255,255,0.25)',
  alignItems: 'center',
  justifyContent: 'center',
  position: 'relative',
},
unreadBadgeDot: {
  position: 'absolute',
  top: 7,
  right: 7,
  width: 8,
  height: 8,
  borderRadius: 4,
  backgroundColor: '#FFE500',
  borderWidth: 1.5,
  borderColor: '#C8102E',
},
verifCheckCircleBtn: {
  width: 36,
  height: 36,
  borderRadius: 18,
  alignItems: 'center',
  justifyContent: 'center',
},
verifCheckCircleSuccess: {
  backgroundColor: 'rgba(255,255,255,0.15)',
  borderWidth: 1,
  borderColor: 'rgba(255,255,255,0.25)',
},
verifCheckCirclePending: {
  backgroundColor: 'rgba(252, 211, 77, 0.16)',
  borderWidth: 1,
  borderColor: 'rgba(252, 211, 77, 0.40)',
},
  body: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: RESPONSIVE.padding,
    paddingTop: 12,
    paddingBottom: 45,
  },
  qrHeroCardGradient: {
    borderRadius: 22,
    borderWidth: 1.5,
    borderColor: 'rgba(255, 255, 255, 0.18)',
    borderTopColor: '#C9A84C',
    borderTopWidth: 3,
    borderBottomColor: '#C9A84C',
    borderBottomWidth: 2.5,
    padding: 18,
    marginBottom: 16,
    ...(Platform.OS === 'web' ? {
      boxShadow: '0 12px 32px rgba(11, 29, 78, 0.22), 0 4px 12px rgba(11, 29, 78, 0.12)',
    } : {
      shadowColor: '#0B1D4E',
      shadowOffset: { width: 0, height: 8 },
      shadowOpacity: 0.20,
      shadowRadius: 18,
      elevation: 8,
    }),
  },
  qrHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 8,
  },
  qrKickerText: {
    fontSize: 10,
    fontWeight: '800',
    color: '#C9A84C',
    letterSpacing: 0.8,
    marginBottom: 3,
  },
  qrTitleWhite: {
    fontSize: 22,
    fontWeight: '900',
    color: '#FFFFFF',
    letterSpacing: -0.4,
  },
  qrSubTextWhite: {
    fontSize: 12,
    color: 'rgba(255, 255, 255, 0.65)',
    marginTop: 3,
    fontWeight: '500',
  },
  expandQRBtnGlass: {
    backgroundColor: 'rgba(255, 255, 255, 0.16)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.3)',
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 10,
  },
  expandQRTextWhite: {
    fontSize: 12,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  metricsGridRow: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 12,
    marginBottom: 16,
  },
  metricGridCardGlass: {
    flex: 1,
    backgroundColor: 'rgba(255, 255, 255, 0.09)',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.16)',
    paddingVertical: 10,
    paddingHorizontal: 10,
    alignItems: 'flex-start',
  },
  metricGridLabelGlass: {
    fontSize: 8.5,
    fontWeight: '800',
    color: 'rgba(255, 255, 255, 0.5)',
    letterSpacing: 0.5,
    textTransform: 'uppercase',
  },
  metricGridValueWhite: {
    fontSize: 18,
    fontWeight: '900',
    color: '#FFFFFF',
    marginTop: 3,
  },
  metricGridSubGlass: {
    fontSize: 10,
    color: 'rgba(255, 255, 255, 0.65)',
    fontWeight: '500',
    marginTop: 2,
  },
  qrInteractiveFrameWhite: {
    alignItems: 'center',
    backgroundColor: 'rgba(11, 29, 78, 0.55)',
    borderRadius: 18,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.12)',
    paddingVertical: 14,
    paddingHorizontal: 12,
    width: '100%',
  },
  entitlementBannerCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 22,
    borderWidth: 1,
    borderColor: '#DDE4F0',
    padding: 18,
    marginBottom: 16,
    ...(Platform.OS === 'web' ? {
      boxShadow: '0 10px 28px rgba(11, 29, 78, 0.08), 0 2px 8px rgba(11, 29, 78, 0.04)',
    } : {
      shadowColor: '#0B1D4E',
      shadowOffset: { width: 0, height: 6 },
      shadowOpacity: 0.10,
      shadowRadius: 16,
      elevation: 4,
    }),
  },
  entitlementHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  entitlementMainTitle: {
    fontSize: 17,
    fontWeight: '800',
    color: '#0B1525',
    letterSpacing: -0.3,
  },
  entitlementMembersBadge: {
    backgroundColor: '#EFF6FF',
    borderWidth: 1,
    borderColor: '#DBEAFE',
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 999,
    ...(Platform.OS === 'web' ? {
      boxShadow: '0 2px 8px rgba(28, 63, 148, 0.08)',
    } : {
      shadowColor: '#1C3F94',
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.08,
      shadowRadius: 6,
      elevation: 2,
    }),
  },
  entitlementMembersText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#1C3F94',
  },
  entitlementItemsList: {
    marginTop: 4,
  },
  entitlementItemRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
  },
  entitlementItemDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  entitlementItemName: {
    fontSize: 13.5,
    fontWeight: '800',
    color: '#0B1525',
  },
  entitlementItemDesc: {
    fontSize: 11,
    color: '#64748B',
    marginTop: 2,
    lineHeight: 14,
  },
  entitlementQtyPill: {
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderRadius: 8,
  },
  entitlementQtyText: {
    fontSize: 11,
    fontWeight: '800',
    color: '#FFFFFF',
    letterSpacing: 0.3,
  },
  pillBlue: {
    backgroundColor: '#1C3F94',
    ...(Platform.OS === 'web' ? {
      boxShadow: '0 4px 12px rgba(28, 63, 148, 0.42)',
    } : {
      shadowColor: '#1C3F94',
      shadowOffset: { width: 0, height: 3 },
      shadowOpacity: 0.40,
      shadowRadius: 6,
      elevation: 4,
    }),
  },
  pillGold: {
    backgroundColor: '#C4972B',
    ...(Platform.OS === 'web' ? {
      boxShadow: '0 4px 12px rgba(196, 151, 43, 0.48)',
    } : {
      shadowColor: '#C4972B',
      shadowOffset: { width: 0, height: 3 },
      shadowOpacity: 0.45,
      shadowRadius: 6,
      elevation: 4,
    }),
  },
  pillSky: {
    backgroundColor: '#0284C7',
    ...(Platform.OS === 'web' ? {
      boxShadow: '0 4px 12px rgba(2, 132, 199, 0.40)',
    } : {
      shadowColor: '#0284C7',
      shadowOffset: { width: 0, height: 3 },
      shadowOpacity: 0.38,
      shadowRadius: 6,
      elevation: 4,
    }),
  },
  pillPink: {
    backgroundColor: '#BE185D',
    ...(Platform.OS === 'web' ? {
      boxShadow: '0 4px 12px rgba(190, 24, 93, 0.40)',
    } : {
      shadowColor: '#BE185D',
      shadowOffset: { width: 0, height: 3 },
      shadowOpacity: 0.38,
      shadowRadius: 6,
      elevation: 4,
    }),
  },
  pillPurple: {
    backgroundColor: '#6D28D9',
    ...(Platform.OS === 'web' ? {
      boxShadow: '0 4px 12px rgba(109, 40, 217, 0.40)',
    } : {
      shadowColor: '#6D28D9',
      shadowOffset: { width: 0, height: 3 },
      shadowOpacity: 0.38,
      shadowRadius: 6,
      elevation: 4,
    }),
  },
  qrInteractiveFrame: {
    alignItems: 'center',
    backgroundColor: '#F8F9F7',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#D9E2EC',
    padding: 12,
  },
  pendingTagHeaderPill: {
    backgroundColor: '#FEF3C7',
    borderWidth: 1,
    borderColor: '#FCD34D',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
  },
  pendingTagHeaderText: {
    fontSize: 9.5,
    fontWeight: '800',
    color: '#B45309',
  },
  pendingVerificationFrame: {
    alignItems: 'center',
    backgroundColor: '#FFFDF5',
    borderRadius: 14,
    borderWidth: 1.5,
    borderColor: '#FDE68A',
    padding: 16,
  },
  pendingIconWell: {
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: '#FEF3C7',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 8,
  },
  pendingNoticeTitle: {
    fontSize: 13,
    fontWeight: FONT_WEIGHT.black,
    color: '#92400E',
    textAlign: 'center',
    letterSpacing: -0.2,
  },
  pendingNoticeSub: {
    fontSize: 11,
    color: '#78350F',
    textAlign: 'center',
    lineHeight: 15,
    marginTop: 4,
    marginBottom: 10,
  },
  pendingStatusBadgeRow: {
    backgroundColor: '#FEF3C7',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 6,
    marginBottom: 12,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  pendingStatusBadgeText: {
    fontSize: 10,
    fontWeight: '800',
    color: '#B45309',
  },
  refreshStatusBtn: {
    backgroundColor: '#1C3F94',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 10,
    width: '100%',
    alignItems: 'center',
    ...SHADOWS.button,
  },
  refreshStatusBtnText: {
    fontSize: 12,
    fontWeight: '800',
    color: '#FFFFFF',
  },
  tapToEnlargeRow: {
    marginTop: 10,
  },
  tapToEnlargeHint: {
    fontSize: 11,
    fontWeight: '500',
    color: 'rgba(255, 255, 255, 0.65)',
    textAlign: 'center',
  },
  quickActionGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  actionTile: {
    width: '48%',
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    padding: 14,
    marginBottom: 12,
    ...SHADOWS.card,
  },
  actionTileIconWell: {
    width: 38,
    height: 38,
    borderRadius: 10,
    backgroundColor: '#EFF6FF',
    borderWidth: 1,
    borderColor: '#DBEAFE',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 10,
  },
  actionTileTitle: {
    fontSize: 14,
    fontWeight: FONT_WEIGHT.black,
    color: '#0F172A',
    letterSpacing: -0.2,
    marginBottom: 2,
  },
  actionTileSub: {
    fontSize: 11,
    color: '#64748B',
    fontWeight: '500',
    lineHeight: 15,
  },
  announcementsSection: {
    marginBottom: 18,
  },
  sectionHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: '#0B1525',
    letterSpacing: -0.3,
  },
  unreadCountBadge: {
    backgroundColor: '#C8102E',
    paddingHorizontal: 6,
    paddingVertical: 1.5,
    borderRadius: 10,
    minWidth: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  unreadCountText: {
    fontSize: 10,
    fontWeight: '900',
    color: '#FFFFFF',
  },
  announcementCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#DDE4F0',
    paddingVertical: 22,
    paddingHorizontal: 16,
    marginBottom: 12,
    ...(Platform.OS === 'web' ? {
      boxShadow: '0 8px 24px rgba(11, 29, 78, 0.07), 0 2px 6px rgba(11, 29, 78, 0.03)',
    } : {
      shadowColor: '#0B1D4E',
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.08,
      shadowRadius: 14,
      elevation: 3,
    }),
  },
  announcementCardUrgent: {
    borderColor: '#FCA5A5',
    backgroundColor: '#FFF5F5',
  },
  annTopRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 6,
  },
  annTagBadge: {
    backgroundColor: '#F1F5F9',
    paddingHorizontal: 7,
    paddingVertical: 2,
    borderRadius: 4,
  },
  annTagText: {
    fontSize: 9.5,
    fontWeight: '800',
    color: '#1C3F94',
    textTransform: 'uppercase',
  },
  annTime: {
    fontSize: 10.5,
    color: '#64748B',
  },
  annTitle: {
    fontSize: 13.5,
    fontWeight: '800',
    color: '#172B4D',
    marginBottom: 4,
  },
  annBody: {
    fontSize: 11.5,
    color: '#475569',
    lineHeight: 16,
    marginBottom: 10,
  },
  annFooterRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderTopWidth: 1,
    borderTopColor: '#F1F5F9',
    paddingTop: 8,
  },
  annAuthorRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  annAuthorText: {
    fontSize: 10.5,
    fontWeight: '700',
    color: '#64748B',
  },
  annActionBtn: {
    backgroundColor: '#1C3F94',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
    ...SHADOWS.sm,
  },
  annActionBtnText: {
    fontSize: 11,
    fontWeight: '800',
    color: '#FFFFFF',
  },
  announcementDetailCard: {
    width: '90%',
    maxWidth: 440,
    backgroundColor: '#FFFFFF',
    borderRadius: 18,
    borderWidth: 1.5,
    borderColor: '#D9E2EC',
    padding: 20,
    ...SHADOWS.md,
  },
  annDetailTopRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  annDetailCloseBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#F1F5F9',
    alignItems: 'center',
    justifyContent: 'center',
  },
  annDetailTitle: {
    fontSize: 16,
    fontWeight: FONT_WEIGHT.black,
    color: '#0F172A',
    marginBottom: 6,
    lineHeight: 22,
  },
  annDetailMetaRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingBottom: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
  },
  annDetailMetaText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#1C3F94',
  },
  annDetailTimeText: {
    fontSize: 11,
    color: '#64748B',
    fontWeight: '600',
  },
  annDetailBodyText: {
    fontSize: 13,
    color: '#334155',
    lineHeight: 20,
  },
  annDetailActionBtn: {
    backgroundColor: '#1C3F94',
    borderRadius: 10,
    paddingVertical: 12,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 8,
  },
  annDetailActionBtnText: {
    fontSize: 13,
    fontWeight: FONT_WEIGHT.black,
    color: '#FFFFFF',
  },
  annDetailCloseMainBtn: {
    backgroundColor: '#0F172A',
    borderRadius: 10,
    paddingVertical: 12,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 8,
  },
  annDetailCloseMainBtnText: {
    fontSize: 13,
    fontWeight: '800',
    color: '#FFFFFF',
  },
  // Tab bar styles
tabBarContainer: {
  flexShrink: 0,
  backgroundColor: 'rgba(255,255,255,0.94)',
  borderTopWidth: 1,
  borderTopColor: '#DDE4F0',
  flexDirection: 'row',
  alignItems: 'flex-start',
  paddingTop: 8,
  paddingHorizontal: 4,
  ...(Platform.OS === 'web' ? { boxShadow: '0 -4px 24px rgba(28,63,148,0.07)' } : {
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
// Nav item styles (used by AnimatedNavItem)
navActivePill: {
  flex: 1,
  flexDirection: 'column',
  alignItems: 'center',
  paddingVertical: 6,
  paddingHorizontal: 4,
  paddingBottom: 18,
  gap: 4,
},
navInactiveBtn: {
  flex: 1,
  flexDirection: 'column',
  alignItems: 'center',
  paddingVertical: 6,
  paddingHorizontal: 4,
  paddingBottom: 18,
  gap: 4,
},
navActiveLabel: {
  fontSize: 10,
  fontWeight: '800',
  color: '#1C3F94',
},
navIconPillActive: {
  width: 38,
  height: 34,
  backgroundColor: 'transparent',
  alignItems: 'center',
  justifyContent: 'center',
},
navIconPillInactive: {
  width: 38,
  height: 34,
  backgroundColor: 'transparent',
  alignItems: 'center',
  justifyContent: 'center',
},
  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(11, 29, 78, 0.75)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 16,
  },
  modalBackdropTapZone: {
    ...StyleSheet.absoluteFillObject,
  },
  modalCard: {
    width: '100%',
    maxWidth: 440,
    maxHeight: '92%',
    backgroundColor: '#FFFFFF',
    borderRadius: 24,
    borderWidth: 1,
    borderColor: '#DDE4F0',
    overflow: 'hidden',
    ...SHADOWS.lg,
  },
  modalTopBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
    backgroundColor: '#FFFFFF',
  },
  modalBackBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#F8FAFC',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: RADIUS.pill,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  modalBackBtnText: {
    fontSize: 12,
    fontWeight: '800',
    color: '#1C3F94',
  },
  modalTopBarTitle: {
    fontSize: 13,
    fontWeight: '800',
    color: '#1E293B',
    letterSpacing: 0.3,
  },
  modalCircularCloseBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    alignItems: 'center',
    justifyContent: 'center',
  },
  modalScrollView: {
    padding: 16,
  },
  modalScrollContent: {
    alignItems: 'center',
    paddingBottom: 24,
  },
  modalPassCard: {
    width: '100%',
    borderRadius: 22,
    padding: 16,
    borderTopWidth: 3,
    borderTopColor: '#C9A84C',
    borderBottomWidth: 2.5,
    borderBottomColor: '#C9A84C',
    ...SHADOWS.md,
  },
  modalPassGoldTop: {
    height: 1,
    backgroundColor: 'rgba(201, 168, 76, 0.35)',
    marginBottom: 12,
    borderRadius: 1,
  },
  modalPassHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginBottom: 14,
  },
  modalPassSealCircle: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
    ...SHADOWS.sm,
  },
  modalPassKicker: {
    fontSize: 9.5,
    fontWeight: '800',
    color: '#E0B84C',
    letterSpacing: 0.8,
    textTransform: 'uppercase',
  },
  modalPassTitleWhite: {
    fontSize: 17,
    fontWeight: '900',
    color: '#FFFFFF',
    marginTop: 1,
    letterSpacing: 0.2,
  },
  modalPassSubWhite: {
    fontSize: 11,
    fontWeight: '600',
    color: 'rgba(255, 255, 255, 0.8)',
    marginTop: 1,
  },
  modalPassVerifiedBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: 'rgba(16, 185, 129, 0.2)',
    paddingHorizontal: 9,
    paddingVertical: 4,
    borderRadius: RADIUS.pill,
    borderWidth: 1,
    borderColor: '#10B981',
  },
  modalPassVerifiedBadgeText: {
    fontSize: 9.5,
    fontWeight: '800',
    color: '#34D399',
    letterSpacing: 0.4,
  },
  modalPassMetricsGrid: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 14,
  },
  modalPassMetricCard: {
    flex: 1,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderRadius: 12,
    paddingVertical: 8,
    paddingHorizontal: 6,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.12)',
    alignItems: 'center',
  },
  modalPassMetricLabel: {
    fontSize: 8.5,
    fontWeight: '800',
    color: 'rgba(255, 255, 255, 0.7)',
    letterSpacing: 0.5,
    textTransform: 'uppercase',
    marginBottom: 2,
  },
  modalPassMetricValue: {
    fontSize: 15,
    fontWeight: '900',
    color: '#FFFFFF',
  },
  modalPassMetricSub: {
    fontSize: 9.5,
    color: 'rgba(255, 255, 255, 0.75)',
    fontWeight: '600',
    marginTop: 1,
  },
  modalPassQRFrame: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 10,
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#C9A84C',
    alignSelf: 'center',
    ...SHADOWS.sm,
  },
  modalPassScannablePill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: 'rgba(16, 185, 129, 0.12)',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: RADIUS.pill,
    marginTop: 8,
  },
  modalPassScannableText: {
    fontSize: 10,
    fontWeight: '700',
    color: '#059669',
  },
  modalPassCodeContainer: {
    marginTop: 12,
    alignItems: 'center',
  },
  modalPassCodeContainerCopied: {},
  modalPassCodeLabel: {
    fontSize: 9.5,
    fontWeight: '800',
    color: 'rgba(255, 255, 255, 0.75)',
    letterSpacing: 0.6,
    textTransform: 'uppercase',
    marginBottom: 4,
  },
  modalPassCodePill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: 'rgba(255, 255, 255, 0.12)',
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: 10,
    borderWidth: 1.5,
    borderColor: '#C9A84C',
  },
  modalPassCodePillCopied: {
    backgroundColor: '#ECFDF5',
    borderColor: '#10B981',
  },
  modalPassCodeText: {
    fontSize: 13,
    fontWeight: '900',
    letterSpacing: 1.1,
    color: '#FFFFFF',
  },
  modalPassAddressRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 5,
    marginTop: 12,
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255, 255, 255, 0.1)',
  },
  modalPassAddressText: {
    fontSize: 11,
    color: 'rgba(255, 255, 255, 0.75)',
    fontWeight: '500',
  },
  modalPassGoldBottom: {
    height: 1,
    backgroundColor: 'rgba(201, 168, 76, 0.35)',
    marginTop: 10,
    borderRadius: 1,
  },
  modalPassActionsArea: {
    width: '100%',
    gap: 10,
    marginTop: 14,
  },
  modalPrimaryActionBtn: {
    backgroundColor: '#C8102E',
    width: '100%',
    height: 46,
    borderRadius: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingHorizontal: 16,
    ...SHADOWS.sm,
  },
  modalPrimaryActionBtnText: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '800',
  },
  modalSecondaryActionBtn: {
    backgroundColor: '#FFFFFF',
    width: '100%',
    height: 46,
    borderRadius: 12,
    borderWidth: 1.5,
    borderColor: '#1C3F94',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingHorizontal: 16,
  },
  modalSecondaryActionBtnText: {
    color: '#1C3F94',
    fontSize: 13,
    fontWeight: '800',
  },
  modalPendingCard: {
    width: '100%',
    backgroundColor: '#FFFBEB',
    borderRadius: 20,
    padding: 24,
    alignItems: 'center',
    borderWidth: 1.5,
    borderColor: '#FCD34D',
    ...SHADOWS.sm,
  },
  modalPendingIconWell: {
    width: 68,
    height: 68,
    borderRadius: 34,
    backgroundColor: 'rgba(252, 211, 77, 0.25)',
    borderWidth: 1.5,
    borderColor: '#FCD34D',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 14,
  },
  modalPendingTitle: {
    fontSize: 16,
    fontWeight: '900',
    color: '#92400E',
    letterSpacing: 0.5,
  },
  modalPendingSubTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: '#B45309',
    marginTop: 2,
    marginBottom: 10,
  },
  modalPendingBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: '#FEF3C7',
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderRadius: RADIUS.pill,
    borderWidth: 1,
    borderColor: '#F59E0B',
    marginBottom: 14,
  },
  modalPendingBadgeText: {
    fontSize: 10.5,
    fontWeight: '800',
    color: '#92400E',
    letterSpacing: 0.5,
  },
  modalPendingMessage: {
    fontSize: 12.5,
    color: '#78350F',
    textAlign: 'center',
    lineHeight: 18,
    marginBottom: 18,
  },
  modalCloseBtnFallback: {
    backgroundColor: '#D97706',
    paddingHorizontal: 24,
    paddingVertical: 10,
    borderRadius: 12,
  },
  modalCloseBtnFallbackText: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '800',
  },
  emergencyHotlineSection: {
    marginBottom: 8,
  },
  emergencySectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 7,
    marginBottom: 2,
  },
  emergencyIconDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#C8102E',
  },
  emergencySectionTitle: {
    fontSize: 12,
    fontWeight: '800',
    color: '#0B1525',
    letterSpacing: 0.3,
  },
  emergencySectionSub: {
    fontSize: 11,
    color: '#8A9BB8',
    marginBottom: 12,
  },
  emergencyGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
  emergencyDialBtn: {
    width: '48.5%',
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    padding: 12,
    marginBottom: 10,
    gap: 10,
    ...(Platform.OS === 'web' ? {
      boxShadow: '0 4px 14px rgba(11, 29, 78, 0.06), 0 1px 3px rgba(11, 29, 78, 0.03)',
    } : {
      shadowColor: '#0B1D4E',
      shadowOffset: { width: 0, height: 3 },
      shadowOpacity: 0.06,
      shadowRadius: 10,
      elevation: 3,
    }),
  },
  emergencyDialIcon: {
    fontSize: 20,
  },
  emergencyIconWell: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#FEF0F2',
    alignItems: 'center',
    justifyContent: 'center',
  },
  emergencyDialName: {
    fontSize: 12,
    fontWeight: '800',
    color: '#0B1525',
    marginBottom: 2,
  },
  emergencyDialPhone: {
    fontSize: 11,
    color: '#C8102E',
    fontWeight: '700',
  },
  healthHeroBanner: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    borderWidth: 1.5,
    borderColor: '#BFDBFE',
    padding: 14,
    marginBottom: 16,
    ...SHADOWS.sm,
  },
  healthBannerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  healthIconWell: {
    width: 44,
    height: 44,
    borderRadius: 12,
    backgroundColor: '#EDE9FE',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#C4B5FD',
  },
  healthBannerKicker: {
    fontSize: 10,
    fontWeight: '900',
    color: '#7C3AED',
    letterSpacing: 0.6,
  },
  healthNewBadge: {
    backgroundColor: '#7C3AED',
    paddingHorizontal: 6,
    paddingVertical: 1.5,
    borderRadius: 999,
  },
  healthNewText: {
    color: '#FFFFFF',
    fontSize: 8.5,
    fontWeight: '900',
  },
  healthBannerTitle: {
    fontSize: 13.5,
    fontWeight: '900',
    color: '#1E1B4B',
    lineHeight: 18,
  },
  healthBannerSub: {
    fontSize: 11,
    color: '#6B7280',
    lineHeight: 15,
    marginTop: 2,
  },
  healthArrowCircle: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: '#EDE9FE',
    alignItems: 'center',
    justifyContent: 'center',
  },
});

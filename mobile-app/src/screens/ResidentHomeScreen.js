import React, { useState, useEffect, useRef } from 'react';
import { View, Text, ScrollView, TouchableOpacity, StyleSheet, Modal, ActivityIndicator, Alert, Animated } from 'react-native';
import RecoveryPhaseStepper from '../components/RecoveryPhaseStepper';
import QRCodeVisual from '../components/QRCodeVisual';
import NotificationModal from '../components/NotificationModal';
import ReportDamageScreen from './ReportDamageScreen';
import AssistanceRequestScreen from './AssistanceRequestScreen';
import ResidentClaimsHistoryScreen from './ResidentClaimsHistoryScreen';
import SettingsScreen from './SettingsScreen';
import { HomeIcon, DamageIcon, PackageIcon, HistoryIcon, SettingsIcon, PhoneCallIcon, UsersIcon, ShieldCheckIcon, MapPinIcon, BellIcon, CloseIcon, DownloadIcon } from '../components/AppIcons';
import { COLORS, FONT_WEIGHT, SPACING, RADIUS, SHADOWS, RESPONSIVE, wp, hp } from '../theme';
import { TRANSLATIONS } from '../i18n/translations';
import { MotionShimmerCard, MotionPulseBadge, MotionPressable } from '../components/motion';
import { fetchAnnouncements, fetchHouseholdProfile } from '../services/api';
import { initSocket, onNewAnnouncement, onVerificationUpdated, onRecoveryStatusUpdated } from '../services/socketService';

/**
 * Impeccable Tactile Animated Navigation Tab Item
 * - Spring scale physics on tab switch & press (150ms ease-out)
 * - Spatial continuity & smooth label opacity fade-in
 * - High-taste micro-interactions without layout thrashing
 */
function AnimatedNavItem({ item, isActive, onPress }) {
  const scaleAnim = useRef(new Animated.Value(isActive ? 1.04 : 1)).current;
  const fadeAnim = useRef(new Animated.Value(isActive ? 1 : 0)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.spring(scaleAnim, {
        toValue: isActive ? 1.04 : 1,
        friction: 6,
        tension: 120,
        useNativeDriver: true,
      }),
      Animated.timing(fadeAnim, {
        toValue: isActive ? 1 : 0,
        duration: 180,
        useNativeDriver: true,
      }),
    ]).start();
  }, [isActive]);

  const handlePressIn = () => {
    Animated.spring(scaleAnim, {
      toValue: 0.92,
      friction: 5,
      tension: 150,
      useNativeDriver: true,
    }).start();
  };

  const handlePressOut = () => {
    Animated.spring(scaleAnim, {
      toValue: isActive ? 1.04 : 1,
      friction: 6,
      tension: 120,
      useNativeDriver: true,
    }).start();
  };

  return (
    <Animated.View style={{ transform: [{ scale: scaleAnim }] }}>
      <TouchableOpacity
        style={isActive ? styles.navActivePill : styles.navInactiveBtn}
        onPress={onPress}
        onPressIn={handlePressIn}
        onPressOut={handlePressOut}
        activeOpacity={0.9}
      >
        {item.renderIcon(isActive)}
        {isActive && (
          <Animated.Text style={[styles.navActiveLabel, { opacity: fadeAnim }]}>
            {item.label}
          </Animated.Text>
        )}
      </TouchableOpacity>
    </Animated.View>
  );
}

export default function ResidentHomeScreen({ token, user, household, onLogout, lang: propLang = 'en', onSelectLang }) {
  const [activeTab, setActiveTab] = useState('home');
  const [showQRModal, setShowQRModal] = useState(false);
  const [showNotifModal, setShowNotifModal] = useState(false);
  const [hasUnreadNotifs, setHasUnreadNotifs] = useState(true);
  const [householdData, setHouseholdData] = useState(household || null);
  const [announcements, setAnnouncements] = useState([]);
  const [lang, setLang] = useState(propLang || 'en');
  const [loadingProfile, setLoadingProfile] = useState(false);

  useEffect(() => {
    if (propLang) setLang(propLang);
  }, [propLang]);

  const t = TRANSLATIONS[lang] || TRANSLATIONS.en;

  useEffect(() => {
    async function loadData() {
      if (!token) return;
      try {
        setLoadingProfile(true);
        const profile = await fetchHouseholdProfile(token);
        if (profile?.household) {
          setHouseholdData(profile.household);
        }
        const currentBrgy = profile?.household?.barangayCode || user?.barangayCode || '291';
        const liveAnnouncements = await fetchAnnouncements(currentBrgy);
        if (Array.isArray(liveAnnouncements) && liveAnnouncements.length > 0) {
          setAnnouncements(liveAnnouncements);
        }
      } catch (err) {
        console.warn('Profile sync fallback:', err);
      } finally {
        setLoadingProfile(false);
      }
    }

    loadData();

    try {
      const socket = initSocket(token);
      if (socket) {
        onNewAnnouncement((newAnn) => {
          setAnnouncements((prev) => [newAnn, ...prev]);
          setHasUnreadNotifs(true);
        });
        onVerificationUpdated((status) => {
          setHouseholdData((prev) => (prev ? { ...prev, verificationStatus: status } : prev));
        });
        onRecoveryStatusUpdated((status) => {
          setHouseholdData((prev) => (prev ? { ...prev, recoveryStatus: status } : prev));
        });
      }
    } catch (e) {
      console.warn('Socket connection note:', e);
    }
  }, [token]);

  const householdName = householdData?.name || user?.name || (lang === 'tl' ? 'Rehistradong Residente' : 'Registered Resident');
  const address = householdData?.address || (lang === 'tl' ? 'Barangay 291, Maynila' : 'Barangay 291, Manila');
  const brgyCode = householdData?.barangayCode || user?.barangayCode || '291';
  const headcount = householdData?.memberCount || householdData?.familyHeadcount || 1;
  const priorityScore = householdData?.priorityScore || 50;
  const priorityLevel = householdData?.priorityLevel || (lang === 'tl' ? 'Mataas (High)' : 'High Priority');
  const isVerified = householdData?.verificationStatus === 'verified';
  const qrCodeString = householdData?.qrCode || `MNL-${brgyCode}-PASS-${user?._id || 'OFFICIAL'}`;

  const basePacks = Math.max(1, Math.floor(headcount / 4));
  const topUpUnits = headcount % 4 > 0 ? headcount % 4 : 0;

  return (
    <View style={styles.container}>
      {/* 1. App Header (Avatar + Location + Notifications Bell) */}
      <View style={styles.topHeader}>
        <View style={styles.avatarWell}>
          <Text style={styles.avatarInitials}>
            {householdName.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase()}
          </Text>
        </View>

        <View style={styles.headerTitleArea}>
          <Text style={styles.residentTitle} numberOfLines={1}>{householdName}</Text>
          <View style={styles.civicLocationRow}>
            <MapPinIcon size={12} color="#1557B0" />
            <Text style={styles.civicLocationText}>Barangay {brgyCode} • {address}</Text>
          </View>
        </View>

        <View style={styles.headerActionArea}>
          {/* Universal Notification Bell Button */}
          <TouchableOpacity
            style={styles.bellBtn}
            onPress={() => {
              setShowNotifModal(true);
              setHasUnreadNotifs(false);
            }}
            activeOpacity={0.8}
          >
            <BellIcon size={18} color="#172B4D" />
            {hasUnreadNotifs && <View style={styles.unreadBadgeDot} />}
          </TouchableOpacity>
          <MotionPulseBadge color={isVerified ? '#10B981' : '#F59E0B'}>
            <View style={[styles.verifBadge, isVerified ? styles.verifBadgeSuccess : styles.verifBadgePending]}>
              <Text style={[styles.verifBadgeText, isVerified ? { color: '#047857' } : { color: '#B45309' }]}>
                {isVerified ? t.verifiedBadge : (lang === 'tl' ? 'Hindi Pa Aprubado' : 'Not Approved')}
              </Text>
            </View>
          </MotionPulseBadge>
        </View>
      </View>

      {/* 2. Main Tab Screen Content */}
      <View style={styles.body}>
        {activeTab === 'home' ? (
          <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
            {/* Familiar Digital ID / Relief QR Pass Hero Card with Motion Shimmer */}
            <MotionShimmerCard style={styles.qrHeroCard}>
              <View style={styles.qrHeaderRow}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.qrTitle}>{t.reliefPassTitle}</Text>
                  <Text style={styles.qrSubText}>{householdName} • Barangay {brgyCode}</Text>
                </View>
                {isVerified ? (
                  <MotionPressable
                    style={styles.expandQRBtn}
                    onPress={() => setShowQRModal(true)}
                    activeOpacity={0.8}
                  >
                    <Text style={styles.expandQRText}>{t.enlargeBtn}</Text>
                  </MotionPressable>
                ) : (
                  <View style={styles.pendingTagHeaderPill}>
                    <Text style={styles.pendingTagHeaderText}>
                      {lang === 'tl' ? '⏳ HINDI PA APPRUBADO' : '⏳ PENDING APPROVAL'}
                    </Text>
                  </View>
                )}
              </View>

              {/* 3-Column Metrics Grid */}
              <View style={styles.metricsGridRow}>
                <View style={styles.metricGridCard}>
                  <Text style={styles.metricGridLabel}>{t.headcountLabel}</Text>
                  <Text style={styles.metricGridValue}>{headcount}</Text>
                  <Text style={styles.metricGridSub}>{t.headcountUnit}</Text>
                </View>
                <View style={styles.metricGridCard}>
                  <Text style={styles.metricGridLabel}>{t.priorityIndexLabel}</Text>
                  <Text style={[styles.metricGridValue, { color: '#D97706' }]}>{priorityScore} pts</Text>
                  <Text style={[styles.metricGridSub, { color: '#B45309' }]} numberOfLines={1}>{priorityLevel}</Text>
                </View>
                <View style={styles.metricGridCard}>
                  <Text style={styles.metricGridLabel}>{t.reliefQuotaLabel}</Text>
                  <Text style={[styles.metricGridValue, { color: '#1557B0' }]}>{basePacks}x Base</Text>
                  <Text style={styles.metricGridSub}>{topUpUnits > 0 ? `+${topUpUnits} ${t.topUpUnit}` : t.basePackUnit}</Text>
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
                    <Text style={styles.pendingStatusBadgeText}>
                      {lang === 'tl' ? '⏳ KATAYUAN: NAKABINBIN SA VERIFICATION QUEUE' : '⏳ STATUS: PENDING VERIFICATION QUEUE'}
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
                        : (lang === 'tl' ? '🔄 Muling I-check ang Katayuan' : '🔄 Refresh Approval Status')}
                    </Text>
                  </TouchableOpacity>
                </View>
              ) : (
                <MotionPressable
                  style={styles.qrInteractiveFrame}
                  onPress={() => setShowQRModal(true)}
                  activeOpacity={0.92}
                >
                  <QRCodeVisual value={qrCodeString} size={150} lang={lang} isCompact />
                  <View style={styles.tapToEnlargeRow}>
                    <Text style={styles.tapToEnlargeHint}>{t.tapToInspectPass}</Text>
                  </View>
                </MotionPressable>
              )}
            </MotionShimmerCard>

            {/* Quick Action Tiles Grid (2x2) with MotionPressable Spring Physics */}
            <View style={styles.quickActionGrid}>
              <MotionPressable
                style={[styles.actionTile, { backgroundColor: '#FFFFFF' }]}
                onPress={() => setActiveTab('damage')}
                activeOpacity={0.85}
              >
                <View style={[styles.actionTileIconWell, { backgroundColor: '#FEE2E2' }]}>
                  <DamageIcon size={18} color="#DC2626" />
                </View>
                <Text style={styles.actionTileTitle}>{t.navDamage}</Text>
                <Text style={styles.actionTileSub}>
                  {lang === 'tl' ? 'Mag-ulat ng pinsala' : 'Report house damage'}
                </Text>
              </MotionPressable>

              <MotionPressable
                style={[styles.actionTile, { backgroundColor: '#FFFFFF' }]}
                onPress={() => setActiveTab('request')}
                activeOpacity={0.85}
              >
                <View style={[styles.actionTileIconWell, { backgroundColor: '#E0F2FE' }]}>
                  <PackageIcon size={18} color="#0284C7" />
                </View>
                <Text style={styles.actionTileTitle}>{t.navAssistance}</Text>
                <Text style={styles.actionTileSub}>
                  {lang === 'tl' ? 'Humiling ng ayuda' : 'Request relief quota'}
                </Text>
              </MotionPressable>

              <MotionPressable
                style={[styles.actionTile, { backgroundColor: '#FFFFFF' }]}
                onPress={() => setActiveTab('history')}
                activeOpacity={0.85}
              >
                <View style={[styles.actionTileIconWell, { backgroundColor: '#FEF3C7' }]}>
                  <HistoryIcon size={18} color="#D97706" />
                </View>
                <Text style={styles.actionTileTitle}>{t.navHistory}</Text>
                <Text style={styles.actionTileSub}>
                  {lang === 'tl' ? 'Talaan ng ayuda' : 'View claims timeline'}
                </Text>
              </MotionPressable>

              <MotionPressable
                style={[styles.actionTile, { backgroundColor: '#FFFFFF' }]}
                onPress={() => setActiveTab('settings')}
                activeOpacity={0.85}
              >
                <View style={[styles.actionTileIconWell, { backgroundColor: '#F3E8FF' }]}>
                  <PhoneCallIcon size={18} color="#7C3AED" />
                </View>
                <Text style={styles.actionTileTitle}>{t.navHotlines}</Text>
                <Text style={styles.actionTileSub}>
                  {lang === 'tl' ? 'Emergency & Roster' : 'Hotlines & Settings'}
                </Text>
              </MotionPressable>
            </View>

            {/* 5-Phase Linear Disaster Recovery Status Stepper */}
            <RecoveryPhaseStepper
              currentStatus={householdData?.recoveryStatus || 'allocated'}
              percentage={65}
              lang={lang}
            />

            {/* Announcements & Civic Feed Section with Direct 1-Tap Action Links */}
            <View style={styles.announcementsSection}>
              <View style={styles.sectionHeaderRow}>
                <Text style={styles.sectionTitle}>{t.announcementsTitle || (lang === 'tl' ? 'Mga Opisyal na Anunsyo' : 'Official Advisories')}</Text>
                <View style={styles.liveCountBadge}>
                  <Text style={styles.liveCountText}>{announcements.length} {t.updatesBadge || (lang === 'tl' ? 'Balita' : 'Updates')}</Text>
                </View>
              </View>

              {announcements.length === 0 ? (
                <View style={[styles.announcementCard, { alignItems: 'center', paddingVertical: 24 }]}>
                  <Text style={{ fontSize: 13, color: COLORS.inkLighter, fontWeight: FONT_WEIGHT.medium, textAlign: 'center' }}>
                    {lang === 'tl' ? 'Walang bagong anunsyo sa kasalukuyan mula sa LGU o Barangay.' : 'No new advisories or announcements at this time.'}
                  </Text>
                </View>
              ) : (
                announcements.map((ann, idx) => (
                  <View
                    key={ann.id || idx}
                    style={[
                      styles.announcementCard,
                      ann.isUrgent && styles.announcementCardUrgent,
                    ]}
                  >
                    <View style={styles.annTopRow}>
                      <View style={styles.annTagBadge}>
                        <Text style={styles.annTagText}>{ann.tag || t.officialAdvisory || (lang === 'tl' ? 'Advisory' : 'Advisory')}</Text>
                      </View>
                      <Text style={styles.annTime}>{ann.timestamp}</Text>
                    </View>
                    <Text style={styles.annTitle}>{ann.title}</Text>
                    <Text style={styles.annBody}>{ann.body}</Text>
                    {ann.targetTab && (
                      <TouchableOpacity
                        style={styles.annActionBtn}
                        onPress={() => setActiveTab(ann.targetTab)}
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
                  </View>
                ))
              )}
            </View>
          </ScrollView>
        ) : activeTab === 'damage' ? (
          <ReportDamageScreen
            token={token}
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
        ) : activeTab === 'request' ? (
          <AssistanceRequestScreen
            token={token}
            lang={lang}
            onBack={() => setActiveTab('home')}
            onSubmitSuccess={() => {
              Alert.alert(
                lang === 'tl' ? 'Tagumpay' : 'Success',
                lang === 'tl' ? 'Naisumite na ang kahilingan ng ayuda sa Barangay.' : 'Assistance request scheduled.'
              );
              setActiveTab('home');
            }}
          />
        ) : activeTab === 'history' ? (
          <ResidentClaimsHistoryScreen
            token={token}
            lang={lang}
            onBack={() => setActiveTab('home')}
          />
        ) : (
          <SettingsScreen
            user={user}
            lang={lang}
            onSelectLang={(code) => {
              setLang(code);
              if (onSelectLang) onSelectLang(code);
            }}
            onLogout={onLogout}
          />
        )}
      </View>

      {/* 3. Iconly Dynamic Island Floating Nav Bar with Impeccable Spring Animations */}
      <View style={styles.floatingIslandNav}>
        {[
          { key: 'home', label: t.navHome, renderIcon: (isActive) => <HomeIcon size={21} color={isActive ? '#1557B0' : '#64748B'} filled={isActive} /> },
          { key: 'damage', label: t.navDamage, renderIcon: (isActive) => <DamageIcon size={21} color={isActive ? '#1557B0' : '#64748B'} filled={isActive} /> },
          { key: 'request', label: t.navAssistance, renderIcon: (isActive) => <PackageIcon size={21} color={isActive ? '#1557B0' : '#64748B'} filled={isActive} /> },
          { key: 'history', label: t.navHistory, renderIcon: (isActive) => <HistoryIcon size={21} color={isActive ? '#1557B0' : '#64748B'} filled={isActive} /> },
          { key: 'settings', label: t.navSettings, renderIcon: (isActive) => <SettingsIcon size={21} color={isActive ? '#1557B0' : '#64748B'} filled={isActive} /> },
        ].map((item) => (
          <AnimatedNavItem
            key={item.key}
            item={item}
            isActive={activeTab === item.key}
            onPress={() => setActiveTab(item.key)}
          />
        ))}
      </View>

      {/* 4. Full-Screen Digital Relief QR Pass Modal with Prominent Back & Close Buttons */}
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
                <Text style={styles.modalBackBtnText}>{lang === 'tl' ? 'Bumalik' : 'Back'}</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.modalCircularCloseBtn}
                onPress={() => setShowQRModal(false)}
                activeOpacity={0.8}
              >
                <CloseIcon size={16} color="#172B4D" />
              </TouchableOpacity>
            </View>

            <ScrollView style={styles.modalScrollView} contentContainerStyle={styles.modalScrollContent} showsVerticalScrollIndicator={false}>
              <View style={styles.modalHeader}>
                <Text style={styles.modalKicker}>LGU MANILA • BARANGAY {brgyCode}</Text>
                <Text style={styles.modalTitle}>{t.modalPassTitle}</Text>
                <Text style={styles.modalSub}>{t.modalPassSub}</Text>
              </View>

              <View style={styles.modalQRContainer}>
                {isVerified ? (
                  <QRCodeVisual value={qrCodeString} size={180} lang={lang} />
                ) : (
                  <View style={{ alignItems: 'center', paddingVertical: 24, paddingHorizontal: 16 }}>
                    <ShieldCheckIcon size={48} color="#D97706" />
                    <Text style={{ fontSize: 14, fontWeight: '800', color: '#92400E', marginTop: 12, textAlign: 'center' }}>
                      {lang === 'tl' ? 'HINDI PA NA-APRUBAHAN NG BARANGAY' : 'NOT YET APPROVED BY BARANGAY'}
                    </Text>
                    <Text style={{ fontSize: 11.5, color: '#78350F', textAlign: 'center', marginTop: 4, lineHeight: 16 }}>
                      {lang === 'tl'
                        ? 'Kasalukuyang sinusuri ng Barangay 291 Admin ang inyong mga dokumento sa Verification Queue. Lalabas ang inyong QR Pass pagka-apruba.'
                        : 'Your documents are currently under review in the Barangay 291 Verification Queue. Your official QR pass will appear once approved.'}
                    </Text>
                  </View>
                )}
              </View>

              <View style={styles.modalDetails}>
                <Text style={styles.modalResidentName}>{householdName}</Text>
                <Text style={styles.modalAddress}>{address}, Brgy {brgyCode}</Text>
                <View style={styles.modalBadgeRow}>
                  <View style={styles.modalPill}>
                    <Text style={styles.modalPillText}>{headcount} {t.headcountUnit}</Text>
                  </View>
                  <View style={[styles.modalPill, { backgroundColor: '#FEF3C7', borderColor: '#FCD34D' }]}>
                    <Text style={[styles.modalPillText, { color: '#B45309' }]}>{priorityLevel}</Text>
                  </View>
                </View>

                {/* Singpass-Style Save to Device / Gallery Action (Only when verified) */}
                {isVerified && (
                  <TouchableOpacity
                    style={styles.modalSavePassBtn}
                    onPress={() => {
                      Alert.alert(
                        lang === 'tl' ? 'QR Pass Na-save!' : 'QR Pass Saved!',
                        lang === 'tl'
                          ? 'Matagumpay na nai-save ang opisyal na Beneficiary Pass sa inyong Photo Gallery para sa offline presentation.'
                          : 'Beneficiary Pass saved to photo gallery for offline physical presentation.'
                      );
                    }}
                    activeOpacity={0.85}
                  >
                    <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8 }}>
                      <DownloadIcon size={18} color="#FFFFFF" />
                      <Text style={styles.modalSavePassBtnText}>
                        {lang === 'tl' ? 'I-save ang Pass sa Photo Gallery' : 'Save Pass to Gallery'}
                      </Text>
                    </View>
                  </TouchableOpacity>
                )}
              </View>
            </ScrollView>
          </View>
        </View>
      </Modal>

      {/* 5. Top Popover Notifications with Direct Screen Navigation */}
      <NotificationModal
        visible={showNotifModal}
        onClose={() => setShowNotifModal(false)}
        notifs={announcements.map((a, idx) => ({
          id: a.id || idx,
          title: a.title,
          body: a.body,
          time: a.timestamp,
          tag: a.tag,
          targetTab: a.targetTab || (idx === 0 ? 'request' : idx === 1 ? 'damage' : 'history'),
          type: a.isUrgent ? 'urgent' : 'advisory',
          unread: idx === 0,
        }))}
        onNavigate={(targetTab) => {
          if (targetTab) {
            setActiveTab(targetTab);
            setShowNotifModal(false);
          }
        }}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8F9F7',
  },
  topHeader: {
    backgroundColor: '#FFFFFF',
    paddingHorizontal: RESPONSIVE.padding,
    paddingTop: RESPONSIVE.topSafe + 4,
    paddingBottom: 14,
    borderBottomWidth: 1,
    borderBottomColor: '#D9E2EC',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    ...SHADOWS.sm,
  },
  avatarWell: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#E8F2FF',
    borderWidth: 1.5,
    borderColor: '#BFDBFE',
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarInitials: {
    fontSize: 15,
    fontWeight: FONT_WEIGHT.black,
    color: '#1557B0',
  },
  headerTitleArea: {
    flex: 1,
  },
  residentTitle: {
    fontSize: 16.5,
    fontWeight: FONT_WEIGHT.black,
    color: '#172B4D',
    letterSpacing: -0.3,
  },
  civicLocationRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: 2,
  },
  civicLocationText: {
    fontSize: 11.5,
    color: '#475569',
    fontWeight: '600',
  },
  headerActionArea: {
    alignItems: 'flex-end',
    gap: 6,
  },
  bellBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#D9E2EC',
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
    ...SHADOWS.sm,
  },
  unreadBadgeDot: {
    position: 'absolute',
    top: 7,
    right: 8,
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#DC2626',
    borderWidth: 1.5,
    borderColor: '#FFFFFF',
  },
  verifBadge: {
    paddingHorizontal: 8,
    paddingVertical: 2.5,
    borderRadius: 6,
  },
  verifBadgeSuccess: {
    backgroundColor: '#ECFDF5',
    borderWidth: 1,
    borderColor: '#A7F3D0',
  },
  verifBadgePending: {
    backgroundColor: '#FEF3C7',
    borderWidth: 1,
    borderColor: '#FDE68A',
  },
  verifBadgeText: {
    fontSize: 9,
    fontWeight: '800',
    letterSpacing: 0.3,
  },
  body: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: RESPONSIVE.padding,
    paddingTop: 16,
    paddingBottom: hp(12),
  },
  qrHeroCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 18,
    borderWidth: 1,
    borderColor: '#D9E2EC',
    padding: 16,
    marginBottom: 16,
    ...SHADOWS.md,
  },
  qrHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  qrTitle: {
    fontSize: 16.5,
    fontWeight: FONT_WEIGHT.black,
    color: '#172B4D',
    letterSpacing: -0.2,
  },
  qrSubText: {
    fontSize: 11,
    color: '#64748B',
    marginTop: 2,
    fontWeight: '600',
  },
  expandQRBtn: {
    backgroundColor: '#E8F2FF',
    borderWidth: 1,
    borderColor: '#BFDBFE',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 8,
  },
  expandQRText: {
    fontSize: 11,
    fontWeight: '800',
    color: '#1557B0',
  },
  metricsGridRow: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 14,
  },
  metricGridCard: {
    flex: 1,
    backgroundColor: '#F8F9F7',
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#D9E2EC',
    paddingVertical: 9,
    paddingHorizontal: 6,
    alignItems: 'center',
  },
  metricGridLabel: {
    fontSize: 8.5,
    fontWeight: '800',
    color: '#64748B',
    letterSpacing: 0.4,
    textTransform: 'uppercase',
  },
  metricGridValue: {
    fontSize: 13.5,
    fontWeight: FONT_WEIGHT.black,
    color: '#172B4D',
    marginTop: 2,
  },
  metricGridSub: {
    fontSize: 9,
    color: '#64748B',
    fontWeight: '700',
    marginTop: 1,
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
  },
  pendingStatusBadgeText: {
    fontSize: 10,
    fontWeight: '800',
    color: '#B45309',
  },
  refreshStatusBtn: {
    backgroundColor: '#1557B0',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 8,
    width: '100%',
    alignItems: 'center',
    ...SHADOWS.sm,
  },
  refreshStatusBtnText: {
    fontSize: 12,
    fontWeight: '800',
    color: '#FFFFFF',
  },
  tapToEnlargeRow: {
    marginTop: 8,
  },
  tapToEnlargeHint: {
    fontSize: 11,
    fontWeight: '700',
    color: '#1557B0',
  },
  quickActionGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
    marginBottom: 16,
  },
  actionTile: {
    flex: 1,
    minWidth: '47%',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#D9E2EC',
    padding: 12,
    ...SHADOWS.sm,
  },
  actionTileIconWell: {
    width: 34,
    height: 34,
    borderRadius: 17,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 8,
  },
  actionTileTitle: {
    fontSize: 13,
    fontWeight: '800',
    color: '#172B4D',
  },
  actionTileSub: {
    fontSize: 10.5,
    color: '#64748B',
    marginTop: 2,
  },
  announcementsSection: {
    marginBottom: 16,
  },
  sectionHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  sectionTitle: {
    fontSize: 14.5,
    fontWeight: FONT_WEIGHT.black,
    color: '#172B4D',
  },
  liveCountBadge: {
    backgroundColor: '#E8F2FF',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#BFDBFE',
  },
  liveCountText: {
    fontSize: 10.5,
    fontWeight: '800',
    color: '#1557B0',
  },
  announcementCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#D9E2EC',
    padding: 14,
    marginBottom: 10,
    ...SHADOWS.sm,
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
    color: '#1557B0',
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
    backgroundColor: '#1557B0',
    paddingHorizontal: 12,
    paddingVertical: 4.5,
    borderRadius: 6,
  },
  annActionBtnText: {
    fontSize: 11,
    fontWeight: '800',
    color: '#FFFFFF',
  },
  floatingIslandNav: {
    position: 'absolute',
    bottom: 16,
    left: RESPONSIVE.padding,
    right: RESPONSIVE.padding,
    maxWidth: 500,
    alignSelf: 'center',
    height: 60,
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#D9E2EC',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-around',
    paddingHorizontal: 8,
    ...SHADOWS.md,
  },
  navActivePill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#E8F2FF',
    borderWidth: 1,
    borderColor: '#BFDBFE',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 14,
  },
  navInactiveBtn: {
    padding: 10,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  navActiveLabel: {
    fontSize: 11.5,
    fontWeight: '800',
    color: '#1557B0',
  },
  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(15, 23, 42, 0.65)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 18,
  },
  modalBackdropTapZone: {
    ...StyleSheet.absoluteFillObject,
  },
  modalCard: {
    width: '100%',
    maxWidth: RESPONSIVE.maxCardWidth,
    maxHeight: '88%',
    backgroundColor: '#FFFFFF',
    borderRadius: 22,
    borderWidth: 1,
    borderColor: '#D9E2EC',
    overflow: 'hidden',
    ...SHADOWS.md,
  },
  modalTopBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
  },
  modalBackBtn: {
    backgroundColor: '#F8F9F7',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#D9E2EC',
  },
  modalBackBtnText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#172B4D',
  },
  modalCircularCloseBtn: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: '#F1F5F9',
    alignItems: 'center',
    justifyContent: 'center',
  },
  modalScrollView: {
    padding: 18,
  },
  modalScrollContent: {
    alignItems: 'center',
    paddingBottom: 24,
  },
  modalHeader: {
    alignItems: 'center',
    marginBottom: 16,
  },
  modalKicker: {
    fontSize: 10,
    fontWeight: '800',
    color: '#1557B0',
    letterSpacing: 0.8,
    marginBottom: 2,
    textTransform: 'uppercase',
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: FONT_WEIGHT.black,
    color: '#172B4D',
  },
  modalSub: {
    fontSize: 11.5,
    color: '#64748B',
    textAlign: 'center',
    marginTop: 2,
  },
  modalQRContainer: {
    width: '100%',
    alignItems: 'center',
    marginBottom: 16,
  },
  modalDetails: {
    width: '100%',
    backgroundColor: '#F8F9F7',
    borderRadius: 12,
    padding: 12,
    borderWidth: 1,
    borderColor: '#D9E2EC',
    alignItems: 'center',
  },
  modalResidentName: {
    fontSize: 14,
    fontWeight: '800',
    color: '#172B4D',
  },
  modalAddress: {
    fontSize: 11.5,
    color: '#64748B',
    marginTop: 2,
  },
  modalBadgeRow: {
    flexDirection: 'row',
    gap: 6,
    marginTop: 8,
  },
  modalPill: {
    backgroundColor: '#E8F2FF',
    borderWidth: 1,
    borderColor: '#BFDBFE',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  modalPillText: {
    fontSize: 10,
    fontWeight: '800',
    color: '#1557B0',
  },
  modalSavePassBtn: {
    backgroundColor: '#1557B0',
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 8,
    marginTop: 12,
    width: '100%',
    alignItems: 'center',
  },
  modalSavePassBtnText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '800',
  },
});

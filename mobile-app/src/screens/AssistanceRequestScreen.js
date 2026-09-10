import React, { useState, useEffect, useMemo, useRef } from 'react';
import { LinearGradient } from 'expo-linear-gradient';
import {
  View,
  Text,
  ScrollView,
  KeyboardAvoidingView,
  Keyboard,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  Alert,
  TextInput,
  Modal,
  Platform,
} from 'react-native';
import QRCodeVisual from '../components/QRCodeVisual';
import {
  ArrowLeftIcon,
  CloseIcon,
  CheckIcon,
  ShovelIcon,
  BroomIcon,
  SprayIcon,
  BoxPackageIcon,
  HammerToolIcon,
  BriefcaseOutlineIcon,
  RefreshIcon,
  QrCodeIcon,
} from '../components/AppIcons';
import { SHADOWS, RESPONSIVE } from '../theme';
import { API_BASE_URL } from '../config';
import { initSocket } from '../services/socketService';

// ── CASH FOR WORK CATEGORIES ────────────────────────────────────────
const JOB_CATEGORIES = [
  {
    id: 'Debris & Mud Clearing',
    title: 'Debris and Mud Clearing',
    scope: 'Heavy Work',
    desc: 'Road clearing, mud shoveling, and storm debris removal across community streets.',
    badgeColor: '#3D5070',
    badgeBg: '#F3F6FC',
    IconComponent: ShovelIcon,
  },
  {
    id: 'Drainage & Canal Declogging',
    title: 'Drainage and Canal Declogging',
    scope: 'Heavy Work',
    desc: 'Clearing culverts, storm drains, and waterways to ensure rapid flood water recession.',
    badgeColor: '#3D5070',
    badgeBg: '#F3F6FC',
    IconComponent: BroomIcon,
  },
  {
    id: 'Evacuation Center Sanitation',
    title: 'Evacuation Center Sanitation',
    scope: 'Moderate Work',
    desc: 'Deep cleaning, disinfection, and facility maintenance in designated shelters.',
    badgeColor: '#3D5070',
    badgeBg: '#F3F6FC',
    IconComponent: SprayIcon,
  },
  {
    id: 'Relief Goods Logistics & Packing',
    title: 'Relief Logistics and Packing',
    scope: 'Light Work',
    desc: 'Assembling food packs, organizing warehouse supplies, and staging distribution lines.',
    badgeColor: '#3D5070',
    badgeBg: '#F3F6FC',
    IconComponent: BoxPackageIcon,
  },
  {
    id: 'Carpentry & Facility Repair',
    title: 'Carpentry and Facility Repair',
    scope: 'Skilled Work',
    desc: 'Restoring damaged roofs, partitions, handrails, and emergency community barriers.',
    badgeColor: '#3D5070',
    badgeBg: '#F3F6FC',
    IconComponent: HammerToolIcon,
  },
];

export default function AssistanceRequestScreen({
  token,
  lang = 'tl',
  onBack,
  user,
  householdData,
}) {
  // ── CASH-FOR-WORK STATE ──────────────────────────────────────────
  const [loadingCFW, setLoadingCFW] = useState(true);
  const [submittingCFW, setSubmittingCFW] = useState(false);
  const [activeProject, setActiveProject] = useState(null);
  const [userApplication, setUserApplication] = useState(null);
  const [selectedCategory, setSelectedCategory] = useState(JOB_CATEGORIES[0].id);
  const [experienceNotes, setExperienceNotes] = useState('');
  const [isCommitted, setIsCommitted] = useState(false);
  const [showVoucherModal, setShowVoucherModal] = useState(false);
  const [showAttendanceQrModal, setShowAttendanceQrModal] = useState(false);

  const scrollRef = useRef(null);
  const [keyboardHeight, setKeyboardHeight] = useState(0);

  // Handle Keyboard Show/Hide
  useEffect(() => {
    const showSub = Keyboard.addListener(
      Platform.OS === 'ios' ? 'keyboardWillShow' : 'keyboardDidShow',
      (e) => {
        setKeyboardHeight(e.endCoordinates.height);
        setTimeout(() => {
          scrollRef.current?.scrollToEnd({ animated: true });
        }, 80);
      }
    );
    const hideSub = Keyboard.addListener(
      Platform.OS === 'ios' ? 'keyboardWillHide' : 'keyboardDidHide',
      () => {
        setKeyboardHeight(0);
      }
    );
    return () => {
      showSub.remove();
      hideSub.remove();
    };
  }, []);

  // Initial Data Fetch
  useEffect(() => {
    fetchCFWData();
  }, [token, householdData?.barangayCode, user?.barangayCode]);

  // ── FETCH CASH-FOR-WORK DATA ──────────────────────────────────────
  const fetchCFWData = async () => {
    if (!token) return;
    try {
      setLoadingCFW(true);
      const projRes = await fetch(API_BASE_URL + '/cash-for-work/projects?status=approved_active', {
        headers: { Authorization: 'Bearer ' + token, 'Content-Type': 'application/json' },
      });
      if (projRes.ok) {
        const pData = await projRes.json();
        if (pData.projects && pData.projects.length > 0) {
          setActiveProject(pData.projects[0]);
        } else {
          setActiveProject(null);
        }
      }

      const appRes = await fetch(API_BASE_URL + '/cash-for-work/my-applications', {
        headers: { Authorization: 'Bearer ' + token, 'Content-Type': 'application/json' },
      });
      if (appRes.ok) {
        const aData = await appRes.json();
        if (aData.applications && aData.applications.length > 0) {
          setUserApplication(aData.applications[0]);
        } else {
          setUserApplication(null);
        }
      }
    } catch (err) {
      console.warn('Fetch CFW data warning:', err);
    } finally {
      setLoadingCFW(false);
    }
  };

  // ── REAL-TIME SOCKET LISTENER (STATUS & ATTENDANCE) ───────────────
  useEffect(() => {
    let socket = null;
    try {
      const hhId = householdData?._id || user?._id;
      const bCode = householdData?.barangayCode || user?.barangayCode || '291';
      socket = initSocket(hhId, bCode);

      if (socket) {
        const handleStatusUpdate = (payload) => {
          if (!payload) return;
          const isTarget =
            (payload.applicationId && payload.applicationId === userApplication?._id) ||
            (payload.householdId && String(payload.householdId) === String(hhId)) ||
            (payload.applicantUserId && String(payload.applicantUserId) === String(user?._id));

          if (isTarget || !userApplication) {
            fetchCFWData();
          } else if (payload.status) {
            setUserApplication(prev => prev ? { ...prev, status: payload.status } : prev);
          }
        };

        const handleAttendanceUpdate = (payload) => {
          if (!payload) return;
          const isTarget =
            (payload.applicationId && payload.applicationId === userApplication?._id) ||
            (payload.householdId && String(payload.householdId) === String(hhId)) ||
            (payload.applicantUserId && String(payload.applicantUserId) === String(user?._id));

          if (isTarget || !userApplication) {
            if (payload.attendanceLogs) {
              setUserApplication(prev => prev ? {
                ...prev,
                status: 'active_on_duty',
                totalDaysWorked: payload.totalDaysWorked ?? prev.totalDaysWorked,
                totalPayoutEarned: payload.totalPayoutEarned ?? prev.totalPayoutEarned,
                attendanceLogs: payload.attendanceLogs,
              } : prev);
            }
            fetchCFWData();
          }
        };

        socket.on('cfw_application_status', handleStatusUpdate);
        socket.on('cfw_application_status_updated', handleStatusUpdate);
        socket.on('cfw_attendance_updated', handleAttendanceUpdate);

        return () => {
          socket.off('cfw_application_status', handleStatusUpdate);
          socket.off('cfw_application_status_updated', handleStatusUpdate);
          socket.off('cfw_attendance_updated', handleAttendanceUpdate);
        };
      }
    } catch (err) {
      console.warn('CFW socket setup warning:', err);
    }
  }, [userApplication?._id, householdData?._id, user?._id]);

  // ── CASH FOR WORK LOGIC ───────────────────────────────────────────
  const availableJobCategories = useMemo(() => {
    if (!activeProject) return JOB_CATEGORIES;

    if (Array.isArray(activeProject.availableCategories) && activeProject.availableCategories.length > 0) {
      const matched = JOB_CATEGORIES.filter(cat =>
        activeProject.availableCategories.some(ac => {
          const a = (ac || '').toLowerCase().trim();
          const b = (cat.id || '').toLowerCase().trim();
          const c = (cat.title || '').toLowerCase().trim();
          return a === b || a === c || a.includes(b) || b.includes(a) || a.includes(c) || c.includes(a);
        })
      );

      const titleScope = `${activeProject.title || ''} ${activeProject.description || ''}`.toLowerCase();
      if (titleScope.includes('drainage') || titleScope.includes('canal') || titleScope.includes('declog')) {
        const drainageMatches = matched.filter(m => m.id.includes('Drainage') || m.id.includes('Debris'));
        if (drainageMatches.length > 0) return drainageMatches;
      }
      if (titleScope.includes('debris') || titleScope.includes('mud') || titleScope.includes('clearing')) {
        const debrisMatches = matched.filter(m => m.id.includes('Debris'));
        if (debrisMatches.length > 0) return debrisMatches;
      }
      if (matched.length > 0) return matched;
    }

    return JOB_CATEGORIES;
  }, [activeProject]);

  // Keep selected category valid when availableJobCategories updates
  useEffect(() => {
    if (availableJobCategories.length > 0) {
      const stillValid = availableJobCategories.some(c => c.id === selectedCategory);
      if (!stillValid) {
        setSelectedCategory(availableJobCategories[0].id);
      }
    }
  }, [availableJobCategories]);

  // ── SUBMIT CASH FOR WORK APPLICATION ──────────────────────────────
  const handleApplyCFW = async () => {
    if (!isCommitted) {
      Alert.alert(
        lang === 'tl' ? 'Pangako sa Trabaho' : 'Commitment Required',
        lang === 'tl'
          ? 'Pakisuyong kumpirmahin na handa kang pumasok sa nakatakdang araw ng trabaho.'
          : 'Please confirm your availability for the scheduled work duration.'
      );
      return;
    }

    setSubmittingCFW(true);
    try {
      const res = await fetch(API_BASE_URL + '/cash-for-work/apply', {
        method: 'POST',
        headers: {
          Authorization: 'Bearer ' + token,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          projectId: activeProject?._id || 'default_cfw_01',
          selectedCategory,
          experienceNotes,
        }),
      });

      const data = await res.json();
      if (res.ok && data.application) {
        setUserApplication(data.application);
        Alert.alert(
          lang === 'tl' ? 'Naisumite ang Aplikasyon' : 'Application Submitted',
          lang === 'tl'
            ? 'Matagumpay na naitala ang inyong aplikasyon. Kasalukuyan itong sinusuri ng Barangay Council para sa slot confirmation.'
            : 'Your application has been received and is now queued for Barangay Council verification.'
        );
      } else {
        Alert.alert('Notice', data.message || 'Submission could not be completed.');
      }
    } catch (err) {
      Alert.alert('Error', 'Network error while submitting application.');
    } finally {
      setSubmittingCFW(false);
    }
  };

  const appStatus = userApplication?.status;
  const isPending = appStatus === 'pending_barangay_review';
  const isApprovedOrActive = appStatus === 'approved_for_work' || appStatus === 'active_on_duty';
  const totalDays = activeProject?.durationDays || 10;
  const workedDays = userApplication?.totalDaysWorked || 0;
  const dailyWageRate = activeProject?.dailyWageRate || userApplication?.dailyWageRate || 500;
  const earnedAmount = (userApplication?.totalPayoutEarned !== undefined && userApplication?.totalPayoutEarned > 0)
    ? userApplication.totalPayoutEarned
    : (workedDays * dailyWageRate);

  const todayStr = new Date().toISOString().split('T')[0];
  const todayLog = (userApplication?.attendanceLogs || []).find(l => l.date === todayStr);
  const isPresentToday = !!(todayLog && todayLog.timeIn && !todayLog.isCompleted);
  const effectiveAttended = workedDays + (isPresentToday ? 1 : 0);

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      keyboardVerticalOffset={Platform.OS === 'ios' ? 64 : 0}
    >
      <ScrollView
        ref={scrollRef}
        contentContainerStyle={[{ paddingBottom: 60 + keyboardHeight }]}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
        keyboardDismissMode="on-drag"
      >
        {/* HEADER GRADIENT WITH CIVIC LIVELIHOOD BRANDING */}
        <LinearGradient colors={['#0B1D4E', '#1C3F94']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}>
          <View style={{ height: 3, backgroundColor: '#C9A84C' }} />
          <View style={{ height: Platform.OS === 'web' ? 0 : RESPONSIVE.topSafe + 4 }} />
          
          <View style={styles.navHeaderRow}>
            {onBack && (
              <TouchableOpacity
                onPress={onBack}
                style={styles.navBackBtn}
                activeOpacity={0.8}
                accessibilityRole="button"
                accessibilityLabel={lang === 'tl' ? 'Bumalik sa dashboard' : 'Go back to dashboard'}
                accessibilityHint={lang === 'tl' ? 'Babalik sa home screen' : 'Returns to the home screen'}
                hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
              >
                <ArrowLeftIcon size={18} color="#FFFFFF" strokeWidth={2.0} />
              </TouchableOpacity>
            )}
            <Text style={styles.navTitle}>
              {lang === 'tl' ? 'Pang-emerhensiyang Hanapbuhay' : 'Livelihood Assistance'}
            </Text>
            <TouchableOpacity
              onPress={fetchCFWData}
              style={styles.navRefreshBtn}
              activeOpacity={0.8}
              accessibilityRole="button"
              accessibilityLabel={lang === 'tl' ? 'I-refresh ang mga proyekto' : 'Refresh projects list'}
              accessibilityHint={lang === 'tl' ? 'Ilo-load muli ang pinakabagong Cash-for-Work projects' : 'Reloads the latest Cash-for-Work projects'}
              hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            >
              <RefreshIcon size={16} color="#FFFFFF" />
            </TouchableOpacity>
          </View>

          <View style={styles.heroTextContainer}>
            <Text style={styles.heroKicker}>
              LGU MANILA EMERGENCY EMPLOYMENT & CIVIC REHABILITATION
            </Text>
            <Text style={styles.heroMainTitle}>
              {lang === 'tl' ? 'Cash-for-Work sa Kalamidad' : 'Post-Disaster Cash-for-Work'}
            </Text>
            <Text style={styles.heroSubtitle}>
              {lang === 'tl'
                ? 'Pang-emerhensiyang hanapbuhay at tulong sa pagpapanumbalik ng komunidad (PHP 500/araw).'
                : 'Emergency paid employment providing short-term income (PHP 500/day) and community rebuilding assistance.'}
            </Text>
          </View>
        </LinearGradient>

        {/* ══════════════════════════════════════════════════════════════ */}
        {/* CASH-FOR-WORK LIVELIHOOD CONTENT                               */}
        {/* ══════════════════════════════════════════════════════════════ */}
        <View style={styles.bodyWrapper}>
          {loadingCFW ? (
            <View style={styles.centerContainer}>
              <ActivityIndicator size="large" color="#1C3F94" />
              <Text style={styles.loadingText}>
                {lang === 'tl' ? 'Kinakarga ang Livelihood Program...' : 'Loading Livelihood Program...'}
              </Text>
            </View>
          ) : (
            <>
              {/* STATE 2: PENDING BARANGAY REVIEW */}
              {isPending && (
                <View style={styles.pendingCard}>
                  <View style={styles.pendingBadgeRow}>
                    <View style={styles.pendingBadge}>
                      <Text style={styles.pendingBadgeText}>UNDER REVIEW BY BARANGAY</Text>
                    </View>
                    <Text style={styles.pendingTimestamp}>Application Active</Text>
                  </View>
                  <Text style={styles.pendingCardTitle}>
                    {lang === 'tl' ? 'Naisumite na ang Aplikasyon' : 'Application Successfully Queued'}
                  </Text>
                  <Text style={styles.pendingCardSub}>
                    {lang === 'tl'
                      ? 'Nai-record ang inyong kahilingan para sa ' + userApplication.selectedCategory + '. Sinusuri ito ng Barangay Council bago ang opisyal na pagtatalaga sa worksite.'
                      : 'Your application for ' + userApplication.selectedCategory + ' has been recorded. The Barangay Council is reviewing applicant profiles prior to work mobilization.'}
                  </Text>
                  <View style={styles.pendingMetaBox}>
                    <View style={styles.metaRow}>
                      <Text style={styles.metaLabel}>Applicant Name:</Text>
                      <Text style={styles.metaValue}>{userApplication.applicantName}</Text>
                    </View>
                    <View style={styles.metaRow}>
                      <Text style={styles.metaLabel}>Assigned Worksite:</Text>
                      <Text style={styles.metaValue}>{activeProject?.targetWorksite || 'Barangay Worksite'}</Text>
                    </View>
                    <View style={styles.metaRow}>
                      <Text style={styles.metaLabel}>Daily Compensation Rate:</Text>
                      <Text style={styles.metaValue}>PHP 500.00 / day (10 Days)</Text>
                    </View>
                  </View>
                </View>
              )}

              {/* STATE 3: APPROVED & ACTIVE ON DUTY */}
              {isApprovedOrActive && (
                <View style={styles.activeDutyCard}>
                  <View style={styles.activeBadgeRow}>
                    <View style={styles.approvedBadge}>
                      <Text style={styles.approvedBadgeText}>APPROVED FOR DUTY</Text>
                    </View>
                    <Text style={styles.activeWorksiteText}>{activeProject?.barangayCode ? 'Barangay ' + activeProject.barangayCode : 'Active Worksite'}</Text>
                  </View>
                  <Text style={styles.activeCardTitle}>{userApplication.selectedCategory}</Text>
                  <Text style={styles.activeCardSub}>
                    {lang === 'tl'
                      ? 'Ipakita ang iyong QR Code sa LGU Staff tuwing umaga (Time-In) at hapon (Time-Out) sa worksite.'
                      : 'Present your QR Pass to the on-site LGU Field Staff for daily Morning Time-In and Afternoon Time-Out.'}
                  </Text>

                  <View style={styles.stepperContainer}>
                    <View style={styles.stepperHeader}>
                      <View>
                        <Text style={styles.stepperTitle}>Attendance Progress</Text>
                        {isPresentToday && (
                          <View style={styles.presentTodayTag}>
                            <View style={styles.presentTodayDot} />
                            <Text style={styles.presentTodayTagText}>
                              {lang === 'tl'
                                ? `Nasa Worksite Ngayon (Day ${todayLog.dayNumber})`
                                : `Active on Duty Today (Day ${todayLog.dayNumber})`}
                            </Text>
                          </View>
                        )}
                      </View>
                      <Text style={styles.stepperCount}>
                        {'Day ' + effectiveAttended + ' of ' + totalDays + ' Attended'}
                      </Text>
                    </View>

                    <View style={styles.daysGrid}>
                      {Array.from({ length: totalDays }, (_, i) => {
                        const dayNum = i + 1;
                        const logForDay = (userApplication?.attendanceLogs || []).find(l => l.dayNumber === dayNum);
                        const isDone = (workedDays >= dayNum) || !!(logForDay && logForDay.isCompleted);
                        const isPresent = !isDone && !!(logForDay && logForDay.timeIn);
                        return (
                          <View
                            key={dayNum}
                            style={[
                              styles.dayCircle,
                              isDone && styles.dayCircleDone,
                              isPresent && styles.dayCirclePresent,
                            ]}
                          >
                            {isDone ? (
                              <CheckIcon size={12} color="#15803D" />
                            ) : isPresent ? (
                              <Text style={styles.dayCircleNumPresent}>{'D' + dayNum}</Text>
                            ) : (
                              <Text style={styles.dayCircleNum}>{'D' + dayNum}</Text>
                            )}
                            <Text style={[styles.dayCircleSub, (isDone || isPresent) && styles.dayCircleSubDone]}>
                              {'Day ' + dayNum}
                            </Text>
                          </View>
                        );
                      })}
                    </View>
                  </View>

                  <View style={styles.earningsBox}>
                    <View>
                      <Text style={styles.earningsLabel}>Accumulated Earnings:</Text>
                      <Text style={styles.earningsAmount}>
                        {'PHP ' + earnedAmount.toLocaleString() + '.00'}
                      </Text>
                    </View>
                    <View style={styles.dailyRatePill}>
                      <Text style={styles.dailyRateText}>Rate: PHP 500.00 / day</Text>
                    </View>
                  </View>

                  <TouchableOpacity
                    style={styles.showAttendanceQrBtn}
                    onPress={() => setShowAttendanceQrModal(true)}
                    activeOpacity={0.85}
                    accessibilityRole="button"
                    accessibilityLabel={lang === 'tl' ? 'Ipakita ang Attendance QR Pass' : 'Show Attendance QR Pass'}
                    accessibilityHint={lang === 'tl' ? 'Bubuksan ang inyong attendance QR para sa time in at out' : 'Opens your attendance QR pass for duty check-in'}
                  >
                    <QrCodeIcon size={18} color="#FFFFFF" />
                    <Text style={styles.showAttendanceQrBtnText}>
                      {lang === 'tl' ? 'Ipakita ang Attendance QR Pass' : 'Show Attendance QR Pass'}
                    </Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={styles.viewVoucherBtn}
                    onPress={() => setShowVoucherModal(true)}
                    activeOpacity={0.85}
                    accessibilityRole="button"
                    accessibilityLabel={lang === 'tl' ? 'Buksan ang Digital Payout Voucher' : 'View Digital Payout Voucher'}
                    accessibilityHint={lang === 'tl' ? 'Bubuksan ang opisyal na payout voucher para sa natapos na trabaho' : 'Opens official payout voucher for completed duty'}
                  >
                    <Text style={styles.viewVoucherBtnText}>
                      {lang === 'tl' ? 'Buksan ang Digital Payout Voucher' : 'View Digital Payout Voucher'}
                    </Text>
                  </TouchableOpacity>
                </View>
              )}

              {/* STATE 1: APPLICATION FORM */}
              {!userApplication && (
                <>
                  {!activeProject ? (
                    <View style={{ alignItems: 'center', paddingVertical: 56, paddingHorizontal: 24 }}>
                      <View style={{ width: 78, height: 78, borderRadius: 24, backgroundColor: '#EFF4FE', borderWidth: 1.5, borderColor: '#D9E4FA', alignItems: 'center', justifyContent: 'center', marginBottom: 20 }}>
                        <BriefcaseOutlineIcon size={34} color="#1C3F94" strokeWidth={2.2} />
                      </View>
                      <Text style={{ fontSize: 20, fontWeight: '800', color: '#0B1525', textAlign: 'center', marginBottom: 8, letterSpacing: -0.3 }}>
                        {lang === 'tl' ? 'Walang Aktibong Proyekto' : 'No Active CFW Project'}
                      </Text>
                      <Text style={{ fontSize: 14, color: '#5A6E8C', textAlign: 'center', maxWidth: 280, lineHeight: 21 }}>
                        {lang === 'tl'
                          ? 'Wala pang nakatalagang Cash-for-Work rehabilitation project para sa inyong barangay. Mag-check ulit maya-maya.'
                          : 'No Cash-for-Work projects posted for your barangay. Check back later or contact your Barangay Council.'}
                      </Text>
                    </View>
                  ) : (
                    <>
                      <View style={styles.projectCard}>
                        <View style={styles.projectKickerRow}>
                          <View style={styles.projectLiveDot} />
                          <Text style={styles.projectKicker}>ACTIVE REHABILITATION PROJECT</Text>
                        </View>
                        <Text style={styles.projectTitle}>{activeProject?.title}</Text>
                        <Text style={styles.projectDesc}>{activeProject?.description}</Text>

                        <View style={styles.projectSpecsGrid}>
                          <View style={styles.specItem}>
                            <Text style={styles.specLabel}>Daily Compensation</Text>
                            <Text style={styles.specValue}>PHP 500.00 / day</Text>
                          </View>
                          <View style={styles.specItem}>
                            <Text style={styles.specLabel}>Work Duration</Text>
                            <Text style={styles.specValue}>{(activeProject?.durationDays || 10) + ' Working Days'}</Text>
                          </View>
                          <View style={styles.specItem}>
                            <Text style={styles.specLabel}>Available Slots</Text>
                            <Text style={styles.specValue}>
                              {((activeProject?.totalSlots || 25) - (activeProject?.filledSlots || 0)) + ' Remaining'}
                            </Text>
                          </View>
                          <View style={styles.specItem}>
                            <Text style={styles.specLabel}>Target Location</Text>
                            <Text style={styles.specValue}>
                              {activeProject?.targetWorksite || 'Barangay Worksite'}
                            </Text>
                          </View>
                        </View>
                      </View>

                      <View style={styles.sectionHeader}>
                        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 4 }}>
                          <Text style={[styles.sectionTitle, { flex: 1, marginRight: 8 }]}>
                            {lang === 'tl' ? 'Pumili ng Uri ng Trabaho' : 'Select Preferred Work Category'}
                          </Text>
                          {availableJobCategories.length < JOB_CATEGORIES.length && (
                            <View style={{ backgroundColor: '#EDF1FB', paddingHorizontal: 8, paddingVertical: 3, borderRadius: 6, borderWidth: 1, borderColor: '#D6DEFA', flexShrink: 0 }}>
                              <Text style={{ fontSize: 10.5, fontWeight: '700', color: '#1C3F94' }}>
                                {lang === 'tl' ? 'Tugma sa Proyekto' : 'Project-Matched Scope'}
                              </Text>
                            </View>
                          )}
                        </View>
                        <Text style={styles.sectionSub}>
                          {lang === 'tl'
                            ? (availableJobCategories.length < JOB_CATEGORIES.length
                                ? `Tanging mga gawaing may kaugnayan sa "${activeProject?.title || 'rehabilitasyon'}" ang maaaring piliin.`
                                : 'Piliin ang gawaing angkop sa inyong kakayahan at kalusugan.')
                            : (availableJobCategories.length < JOB_CATEGORIES.length
                                ? `Only work categories aligned with "${activeProject?.title || 'this project'}" are available for selection.`
                                : 'Choose the rehabilitation scope matching your physical capability.')}
                        </Text>
                      </View>

                      {availableJobCategories.map((cat) => {
                        const isSelected = selectedCategory === cat.id;
                        const Icon = cat.IconComponent;
                        return (
                          <TouchableOpacity
                            key={cat.id}
                            style={[styles.categoryCard, isSelected && styles.categoryCardSelected]}
                            onPress={() => setSelectedCategory(cat.id)}
                            activeOpacity={0.8}
                            accessibilityRole="button"
                            accessibilityState={{ selected: isSelected }}
                            accessibilityLabel={`${cat.title}, ${cat.scope}. ${cat.desc}`}
                            accessibilityHint={cat.desc}
                          >
                            <View style={styles.categoryHeaderRow}>
                              <View style={{ flexDirection: 'row', alignItems: 'center', flex: 1 }}>
                                <View style={{ width: 38, height: 38, borderRadius: 8, backgroundColor: isSelected ? '#EDF1FB' : '#F3F6FC', justifyContent: 'center', alignItems: 'center', marginRight: 12, borderWidth: 1, borderColor: isSelected ? '#1C3F94' : '#DDE4F0' }}>
                                  <Icon size={20} color={isSelected ? '#1C3F94' : '#3D5070'} />
                                </View>
                                <Text style={[styles.categoryTitle, isSelected && styles.categoryTitleSelected]}>
                                  {cat.title}
                                </Text>
                              </View>
                              <View style={[styles.categoryBadge, { backgroundColor: cat.badgeBg }]}>
                                <Text style={[styles.categoryBadgeText, { color: cat.badgeColor }]}>{cat.scope}</Text>
                              </View>
                            </View>
                            <Text style={styles.categoryDesc}>{cat.desc}</Text>
                          </TouchableOpacity>
                        );
                      })}

                      <View style={styles.commitmentCard}>
                        <TouchableOpacity
                          style={styles.checkboxRow}
                          onPress={() => setIsCommitted(!isCommitted)}
                          activeOpacity={0.7}
                          accessibilityRole="checkbox"
                          accessibilityState={{ checked: isCommitted }}
                          accessibilityLabel={
                            lang === 'tl'
                              ? 'Kumpirmasyon sa kahandaan sa 10 araw ng rehabilitation work'
                              : 'Confirmation of availability for 10-day rehabilitation assignment'
                          }
                          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                        >
                          <View style={[styles.checkbox, isCommitted && styles.checkboxChecked]}>
                            {isCommitted && <CheckIcon size={12} color="#FFFFFF" />}
                          </View>
                          <Text style={styles.checkboxText}>
                            {lang === 'tl'
                              ? 'Kinukumpirma ko na ako ay handa at may kakayahang pumasok sa nakatakdang 10 araw ng rehabilitation work.'
                              : 'I confirm that I am available and physically capable of performing the 10-day rehabilitation assignment.'}
                          </Text>
                        </TouchableOpacity>

                        <TextInput
                          style={styles.experienceInput}
                          placeholder={
                            lang === 'tl'
                              ? 'Maikling tala tungkol sa inyong karanasan o kakayahan (opsyonal)...'
                              : 'Brief note regarding relevant skills or experience (optional)...'
                          }
                          placeholderTextColor="#334155"
                          value={experienceNotes}
                          onChangeText={setExperienceNotes}
                          multiline
                          numberOfLines={2}
                          onFocus={() => {
                            setTimeout(() => {
                              scrollRef.current?.scrollToEnd({ animated: true });
                            }, 120);
                          }}
                        />
                      </View>

                      <TouchableOpacity
                        style={[styles.submitBtn, submittingCFW && styles.submitBtnDisabled]}
                        onPress={handleApplyCFW}
                        disabled={submittingCFW}
                        activeOpacity={0.85}
                        accessibilityRole="button"
                        accessibilityLabel={lang === 'tl' ? 'I-submit ang Aplikasyon sa Barangay' : 'Submit Application to Barangay'}
                        accessibilityHint={lang === 'tl' ? 'Ipapadala ang aplikasyon sa Barangay Council para sa pagsusuri' : 'Submits application to Barangay Council for review'}
                      >
                        {submittingCFW ? (
                          <ActivityIndicator color="#FFFFFF" />
                        ) : (
                          <Text style={styles.submitBtnText}>
                            {lang === 'tl' ? 'I-submit ang Aplikasyon sa Barangay' : 'Submit Application to Barangay'}
                          </Text>
                        )}
                      </TouchableOpacity>
                    </>
                  )}
                </>
              )}
            </>
          )}
        </View>
      </ScrollView>

      {/* POP-UP MODAL: DIGITAL PAYOUT VOUCHER CARD */}
      <Modal visible={showVoucherModal} transparent animationType="fade" onRequestClose={() => setShowVoucherModal(false)}>
        <View style={styles.modalOverlay}>
          <View style={styles.voucherModalCard}>
            <View style={styles.voucherHeaderRow}>
              <TouchableOpacity
                style={styles.modalTopBackBtn}
                onPress={() => setShowVoucherModal(false)}
                activeOpacity={0.7}
                accessibilityRole="button"
                accessibilityLabel={lang === 'tl' ? 'Bumalik' : 'Back'}
                hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
              >
                <ArrowLeftIcon size={14} color="#1C3F94" strokeWidth={2.2} />
                <Text style={styles.modalTopBackText}>{lang === 'tl' ? 'Bumalik' : 'Back'}</Text>
              </TouchableOpacity>
              <View style={{ alignItems: 'center', flex: 1, paddingHorizontal: 6 }}>
                <Text style={styles.voucherGovKicker}>CITY GOVERNMENT OF MANILA</Text>
                <Text style={styles.voucherMainTitle}>Digital Payout Voucher</Text>
              </View>
              <TouchableOpacity
                style={styles.closeBtn}
                onPress={() => setShowVoucherModal(false)}
                activeOpacity={0.7}
                accessibilityRole="button"
                accessibilityLabel={lang === 'tl' ? 'Isara ang voucher' : 'Close voucher'}
                hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
              >
                <CloseIcon size={16} color="#0F172A" />
              </TouchableOpacity>
            </View>

            <ScrollView style={styles.modalScrollArea} contentContainerStyle={styles.modalScrollContent} showsVerticalScrollIndicator={false}>
              <View style={styles.voucherDetailsBoxCompact}>
                <View style={styles.voucherMetaRowCompact}>
                  <Text style={styles.voucherMetaLabelCompact}>Reference Code:</Text>
                  <Text style={styles.voucherMetaValueCompact} numberOfLines={1}>{userApplication?.payoutVoucherCode || 'CFW-291-88492A'}</Text>
                </View>
                <View style={styles.voucherMetaRowCompact}>
                  <Text style={styles.voucherMetaLabelCompact}>Beneficiary:</Text>
                  <Text style={styles.voucherMetaValueCompact} numberOfLines={1}>{userApplication?.applicantName || 'Resident Worker'}</Text>
                </View>
                <View style={styles.voucherMetaRowCompact}>
                  <Text style={styles.voucherMetaLabelCompact}>Days Rendered:</Text>
                  <Text style={styles.voucherMetaValueCompact}>{(userApplication?.totalDaysWorked || 0) + ' / ' + (activeProject?.durationDays || 10) + ' Days'}</Text>
                </View>
                <View style={styles.voucherDividerCompact} />
                <View style={styles.voucherMetaRowCompact}>
                  <Text style={styles.voucherTotalLabelCompact}>Certified Payout:</Text>
                  <Text style={styles.voucherTotalAmountCompact}>
                    {'PHP ' + earnedAmount.toLocaleString() + '.00'}
                  </Text>
                </View>
              </View>

              <View style={styles.qrContainerCompact}>
                <QRCodeVisual
                  value={userApplication?.payoutVoucherCode || 'CFW-291-OFFICIAL-PAYOUT'}
                  size={140}
                  isCompact={true}
                />
                <Text style={styles.qrInstructionsCompact}>
                  Present this certified voucher code at the Barangay Hall or City Hall Payout Center.
                </Text>
              </View>
            </ScrollView>

            <TouchableOpacity
              style={styles.modalCloseBtn}
              onPress={() => setShowVoucherModal(false)}
              activeOpacity={0.85}
              accessibilityRole="button"
              accessibilityLabel={lang === 'tl' ? 'Isara ang voucher' : 'Close voucher'}
            >
              <Text style={styles.modalCloseBtnText}>Close Voucher</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* POP-UP MODAL: CASH-FOR-WORK ATTENDANCE QR PASS */}
      <Modal visible={showAttendanceQrModal} transparent animationType="fade" onRequestClose={() => setShowAttendanceQrModal(false)}>
        <View style={styles.modalOverlay}>
          <View style={styles.voucherModalCard}>
            <View style={styles.voucherHeaderRow}>
              <TouchableOpacity
                style={styles.modalTopBackBtn}
                onPress={() => setShowAttendanceQrModal(false)}
                activeOpacity={0.7}
                accessibilityRole="button"
                accessibilityLabel={lang === 'tl' ? 'Bumalik' : 'Back'}
                hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
              >
                <ArrowLeftIcon size={14} color="#1C3F94" strokeWidth={2.2} />
                <Text style={styles.modalTopBackText}>{lang === 'tl' ? 'Bumalik' : 'Back'}</Text>
              </TouchableOpacity>
              <View style={{ alignItems: 'center', flex: 1, paddingHorizontal: 6 }}>
                <Text style={styles.voucherGovKicker}>CITY GOVERNMENT OF MANILA</Text>
                <Text style={styles.voucherMainTitle}>Attendance Duty QR Pass</Text>
              </View>
              <TouchableOpacity
                style={styles.closeBtn}
                onPress={() => setShowAttendanceQrModal(false)}
                activeOpacity={0.7}
                accessibilityRole="button"
                accessibilityLabel={lang === 'tl' ? 'Isara ang QR Pass' : 'Close QR Pass'}
                hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
              >
                <CloseIcon size={16} color="#0F172A" />
              </TouchableOpacity>
            </View>

            <ScrollView style={styles.modalScrollArea} contentContainerStyle={styles.modalScrollContent} showsVerticalScrollIndicator={false}>
              <View style={styles.voucherDetailsBoxCompact}>
                <View style={styles.voucherMetaRowCompact}>
                  <Text style={styles.voucherMetaLabelCompact}>Worker Name:</Text>
                  <Text style={styles.voucherMetaValueCompact} numberOfLines={1}>{userApplication?.applicantName || user?.name || 'Resident Worker'}</Text>
                </View>
                <View style={styles.voucherMetaRowCompact}>
                  <Text style={styles.voucherMetaLabelCompact}>Assigned Scope:</Text>
                  <Text style={styles.voucherMetaValueCompact} numberOfLines={1}>{userApplication?.selectedCategory || 'Rehabilitation Assignment'}</Text>
                </View>
                <View style={styles.voucherMetaRowCompact}>
                  <Text style={styles.voucherMetaLabelCompact}>Worksite:</Text>
                  <Text style={styles.voucherMetaValueCompact} numberOfLines={1}>{'Barangay ' + (userApplication?.barangayCode || householdData?.barangayCode || '291')}</Text>
                </View>
                <View style={styles.voucherMetaRowCompact}>
                  <Text style={styles.voucherMetaLabelCompact}>Daily Wage Rate:</Text>
                  <Text style={[styles.voucherMetaValueCompact, { color: '#15803D', fontWeight: '800' }]}>PHP 500.00 / day</Text>
                </View>
              </View>

              <View style={styles.qrContainerCompact}>
                <QRCodeVisual
                  value={userApplication?.payoutVoucherCode || householdData?.qrCode || 'CFW-291-OFFICIAL-ATTENDANCE'}
                  size={140}
                  isCompact={true}
                />
                <Text style={styles.qrInstructionsCompact}>
                  {lang === 'tl'
                    ? 'Ipakita ang QR Code na ito sa LGU Field Staff para sa Morning Time-In at Afternoon Time-Out.'
                    : 'Present this QR Pass to the LGU Field Staff for daily Morning Time-In and Afternoon Time-Out.'}
                </Text>
              </View>
            </ScrollView>

            <TouchableOpacity
              style={[styles.modalCloseBtn, { backgroundColor: '#1C3F94' }]}
              onPress={() => setShowAttendanceQrModal(false)}
              activeOpacity={0.85}
              accessibilityRole="button"
              accessibilityLabel={lang === 'tl' ? 'Isara ang QR Pass' : 'Close QR Pass'}
            >
              <Text style={styles.modalCloseBtnText}>
                {lang === 'tl' ? 'Isara ang QR Pass' : 'Close QR Pass'}
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F3F6FC',
  },
  bodyWrapper: {
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 24,
  },
  centerContainer: {
    paddingVertical: 50,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 12,
    fontSize: 14,
    color: '#3D5070',
    fontWeight: '500',
  },

  // ── HEADER & NAVIGATION ──────────────────────────────────────────
  navHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 18,
    paddingVertical: 12,
  },
  navBackBtn: {
    width: 48,
    height: 48,
    borderRadius: 24,
    minWidth: 48,
    minHeight: 48,
    backgroundColor: 'rgba(255,255,255,0.15)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.25)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  navRefreshBtn: {
    width: 48,
    height: 48,
    borderRadius: 24,
    minWidth: 48,
    minHeight: 48,
    backgroundColor: 'rgba(255,255,255,0.15)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.25)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  navTitle: {
    fontSize: 17,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  heroTextContainer: {
    paddingHorizontal: 18,
    paddingBottom: 22,
  },
  heroKicker: {
    fontSize: 9.5,
    fontWeight: '800',
    color: 'rgba(255,255,255,0.75)',
    textTransform: 'uppercase',
    letterSpacing: 0.8,
    marginBottom: 5,
  },
  heroMainTitle: {
    fontSize: 24,
    fontWeight: '900',
    color: '#FFFFFF',
    letterSpacing: -0.6,
  },
  heroSubtitle: {
    fontSize: 13,
    color: 'rgba(255,255,255,0.90)',
    lineHeight: 19.5,
    marginTop: 4,
  },

  // ── PENDING APPLICATION CARD ─────────────────────────────────────
  pendingCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 18,
    padding: 16,
    borderWidth: 1,
    borderColor: '#FDE68A',
    backgroundColor: '#FFFDF5',
    marginBottom: 16,
    ...SHADOWS.card,
  },
  pendingBadgeRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  pendingBadge: {
    backgroundColor: '#FEF3C7',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  pendingBadgeText: {
    fontSize: 10,
    fontWeight: '800',
    color: '#B45309',
    letterSpacing: 0.5,
  },
  pendingTimestamp: {
    fontSize: 11,
    color: '#475569',
    fontWeight: '600',
  },
  pendingCardTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: '#0F172A',
    marginBottom: 4,
  },
  pendingCardSub: {
    fontSize: 12.5,
    color: '#3D5070',
    lineHeight: 17,
    marginBottom: 12,
  },
  pendingMetaBox: {
    backgroundColor: '#FFFFFF',
    borderRadius: 10,
    padding: 10,
    borderWidth: 1,
    borderColor: '#F3F6FC',
  },
  metaRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 4,
  },
  metaLabel: {
    fontSize: 11.5,
    color: '#475569',
  },
  metaValue: {
    fontSize: 11.5,
    fontWeight: '700',
    color: '#0F172A',
  },

  // ── ACTIVE DUTY CARD ─────────────────────────────────────────────
  activeDutyCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    padding: 16,
    borderWidth: 1,
    borderColor: '#DDE4F0',
    marginBottom: 16,
  },
  activeBadgeRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  approvedBadge: {
    backgroundColor: '#DCFCE7',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#86EFAC',
  },
  approvedBadgeText: {
    fontSize: 10,
    fontWeight: '800',
    color: '#15803D',
    letterSpacing: 0.5,
  },
  activeWorksiteText: {
    fontSize: 11,
    color: '#3D5070',
    fontWeight: '600',
  },
  activeCardTitle: {
    fontSize: 17,
    fontWeight: '800',
    color: '#0F172A',
    marginBottom: 3,
  },
  activeCardSub: {
    fontSize: 12.5,
    color: '#3D5070',
    lineHeight: 17,
    marginBottom: 14,
  },
  stepperContainer: {
    backgroundColor: '#F3F6FC',
    borderRadius: 10,
    padding: 12,
    borderWidth: 1,
    borderColor: '#DDE4F0',
    marginBottom: 14,
  },
  stepperHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 10,
  },
  stepperTitle: {
    fontSize: 12,
    fontWeight: '700',
    color: '#0F172A',
  },
  stepperCount: {
    fontSize: 12,
    fontWeight: '700',
    color: '#1C3F94',
  },
  daysGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
  },
  dayCircle: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#DDE4F0',
    alignItems: 'center',
    justifyContent: 'center',
  },
  dayCircleDone: {
    backgroundColor: '#DCFCE7',
    borderColor: '#15803D',
  },
  dayCircleNum: {
    fontSize: 10,
    fontWeight: '700',
    color: '#3D5070',
  },
  dayCircleSub: {
    display: 'none',
  },
  dayCircleSubDone: {
    display: 'none',
  },
  earningsBox: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#F0FDF4',
    borderRadius: 10,
    padding: 12,
    borderWidth: 1,
    borderColor: '#BBF7D0',
    marginBottom: 14,
  },
  earningsLabel: {
    fontSize: 11,
    color: '#166534',
    fontWeight: '600',
  },
  earningsAmount: {
    fontSize: 18,
    fontWeight: '900',
    color: '#15803D',
    marginTop: 2,
  },
  dailyRatePill: {
    backgroundColor: '#DCFCE7',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  dailyRateText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#166534',
  },
  showAttendanceQrBtn: {
    backgroundColor: '#1C3F94',
    borderRadius: 12,
    minHeight: 50,
    paddingVertical: 14,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    marginBottom: 8,
  },
  showAttendanceQrBtnText: {
    fontSize: 13.5,
    fontWeight: '800',
    color: '#FFFFFF',
  },
  viewVoucherBtn: {
    backgroundColor: '#FFFFFF',
    borderWidth: 1.5,
    borderColor: '#DDE4F0',
    borderRadius: 12,
    minHeight: 48,
    paddingVertical: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  viewVoucherBtnText: {
    fontSize: 12.5,
    fontWeight: '700',
    color: '#334155',
  },

  // ── PROJECT OVERVIEW CARD ────────────────────────────────────────
  projectCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    padding: 16,
    borderWidth: 1,
    borderColor: '#DDE4F0',
    marginBottom: 18,
    ...SHADOWS.card,
  },
  projectKickerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
  },
  projectLiveDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#166534',
    marginRight: 6,
  },
  projectKicker: {
    fontSize: 10.5,
    fontWeight: '700',
    color: '#166534',
    letterSpacing: 0.6,
  },
  projectTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#0F172A',
    marginTop: 2,
  },
  projectDesc: {
    fontSize: 12.5,
    color: '#3D5070',
    marginTop: 4,
    lineHeight: 17,
  },
  projectSpecsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#F3F6FC',
  },
  specItem: {
    width: '50%',
    marginBottom: 8,
  },
  specLabel: {
    fontSize: 11,
    color: '#475569',
    fontWeight: '500',
  },
  specValue: {
    fontSize: 13,
    color: '#0F172A',
    fontWeight: '700',
    marginTop: 1,
  },

  // ── SECTION HEADERS & CATEGORY CARDS ─────────────────────────────
  sectionHeader: {
    marginBottom: 12,
  },
  sectionTitle: {
    fontSize: 15,
    fontWeight: '800',
    color: '#0F172A',
  },
  sectionSub: {
    fontSize: 12,
    color: '#475569',
    lineHeight: 16,
    marginTop: 2,
  },
  categoryCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    padding: 12,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: '#DDE4F0',
  },
  categoryCardSelected: {
    borderColor: '#1C3F94',
    backgroundColor: '#EDF1FB',
    borderWidth: 1.5,
  },
  categoryHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 6,
  },
  categoryTitle: {
    fontSize: 13.5,
    fontWeight: '700',
    color: '#0B1525',
    flex: 1,
  },
  categoryTitleSelected: {
    color: '#1C3F94',
  },
  categoryBadge: {
    paddingHorizontal: 7,
    paddingVertical: 2,
    borderRadius: 5,
  },
  categoryBadgeText: {
    fontSize: 10,
    fontWeight: '700',
  },
  categoryDesc: {
    fontSize: 11.5,
    color: '#475569',
    lineHeight: 16,
  },

  // ── COMMITMENT & INPUT ───────────────────────────────────────────
  commitmentCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    padding: 14,
    borderWidth: 1,
    borderColor: '#DDE4F0',
    marginTop: 8,
    marginBottom: 16,
  },
  checkboxRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    minHeight: 48,
    paddingVertical: 6,
    marginBottom: 10,
  },
  checkbox: {
    width: 20,
    height: 20,
    borderRadius: 5,
    borderWidth: 1.5,
    borderColor: '#D6DEFA',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 10,
    marginTop: 2,
  },
  checkboxChecked: {
    backgroundColor: '#1C3F94',
    borderColor: '#1C3F94',
  },
  checkboxText: {
    flex: 1,
    fontSize: 12,
    color: '#1E293B',
    lineHeight: 17,
  },
  experienceInput: {
    backgroundColor: '#F3F6FC',
    borderRadius: 8,
    padding: 10,
    fontSize: 12.5,
    color: '#0B1525',
    borderWidth: 1,
    borderColor: '#DDE4F0',
    minHeight: 50,
    textAlignVertical: 'top',
  },
  submitBtn: {
    backgroundColor: '#1C3F94',
    borderRadius: 12,
    minHeight: 52,
    height: 52,
    justifyContent: 'center',
    paddingVertical: 14,
    alignItems: 'center',
    ...SHADOWS.card,
  },
  submitBtnDisabled: {
    opacity: 0.6,
  },
  submitBtnText: {
    fontSize: 14,
    fontWeight: '800',
    color: '#FFFFFF',
  },

  // ── MODAL STYLES ─────────────────────────────────────────────────
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(15, 23, 42, 0.65)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 16,
  },
  voucherModalCard: {
    width: '100%',
    maxWidth: 360,
    maxHeight: '90%',
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 14,
    ...SHADOWS.card,
  },
  voucherHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  modalTopBackBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    minHeight: 48,
    minWidth: 48,
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderRadius: 8,
    backgroundColor: '#EDF1FB',
    gap: 4,
    justifyContent: 'center',
  },
  modalTopBackText: {
    fontSize: 11.5,
    fontWeight: '700',
    color: '#1C3F94',
  },
  voucherGovKicker: {
    fontSize: 9.5,
    fontWeight: '700',
    color: '#1C3F94',
    letterSpacing: 0.8,
  },
  voucherMainTitle: {
    fontSize: 15,
    fontWeight: '800',
    color: '#0F172A',
    marginTop: 1,
  },
  closeBtn: {
    width: 48,
    height: 48,
    borderRadius: 24,
    minWidth: 48,
    minHeight: 48,
    backgroundColor: '#F3F6FC',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalScrollArea: {
    maxHeight: 440,
  },
  modalScrollContent: {
    paddingVertical: 4,
  },
  voucherDetailsBoxCompact: {
    backgroundColor: '#F3F6FC',
    borderRadius: 10,
    padding: 9,
    borderWidth: 1,
    borderColor: '#DDE4F0',
    marginBottom: 8,
  },
  voucherMetaRowCompact: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 3,
  },
  voucherMetaLabelCompact: {
    fontSize: 11,
    color: '#3D5070',
    fontWeight: '600',
    flex: 1,
    marginRight: 6,
  },
  voucherMetaValueCompact: {
    fontSize: 11.5,
    color: '#0B1525',
    fontWeight: '700',
    textAlign: 'right',
    maxWidth: '65%',
  },
  voucherDividerCompact: {
    height: 1,
    backgroundColor: '#DDE4F0',
    marginVertical: 5,
  },
  voucherTotalLabelCompact: {
    fontSize: 11.5,
    color: '#0F172A',
    fontWeight: '700',
  },
  voucherTotalAmountCompact: {
    fontSize: 14,
    color: '#15803D',
    fontWeight: '800',
  },
  qrContainerCompact: {
    alignItems: 'center',
    paddingVertical: 4,
  },
  qrInstructionsCompact: {
    fontSize: 10.5,
    color: '#5A6E8C',
    textAlign: 'center',
    marginTop: 6,
    lineHeight: 14,
    paddingHorizontal: 10,
  },
  voucherDetailsBox: {
    backgroundColor: '#F3F6FC',
    borderRadius: 12,
    padding: 12,
    borderWidth: 1,
    borderColor: '#DDE4F0',
    marginBottom: 14,
  },
  voucherMetaRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 4,
  },
  voucherMetaLabel: {
    fontSize: 12,
    color: '#3D5070',
    fontWeight: '500',
    flex: 1,
    marginRight: 8,
  },
  voucherMetaValue: {
    fontSize: 12,
    color: '#0B1525',
    fontWeight: '700',
    textAlign: 'right',
  },
  voucherDivider: {
    height: 1,
    backgroundColor: '#DDE4F0',
    marginVertical: 8,
  },
  voucherTotalLabel: {
    fontSize: 12.5,
    color: '#0F172A',
    fontWeight: '700',
  },
  voucherTotalAmount: {
    fontSize: 16,
    color: '#15803D',
    fontWeight: '800',
  },
  qrContainer: {
    alignItems: 'center',
    paddingVertical: 10,
  },
  qrInstructions: {
    fontSize: 11,
    color: '#3D5070',
    textAlign: 'center',
    marginTop: 10,
    lineHeight: 15,
    paddingHorizontal: 10,
  },
  modalCloseBtn: {
    backgroundColor: '#1C3F94',
    borderRadius: 10,
    minHeight: 48,
    paddingVertical: 13,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 10,
  },
  modalCloseBtnText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#FFFFFF',
  },

  // ── ACTIVE DUTY & STEPPER COLOR STYLES ────────────────────────────
  dayCirclePresent: {
    backgroundColor: '#E6F6EF',
    borderColor: '#0D8A5A',
    borderWidth: 2,
    shadowColor: '#0D8A5A',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 3,
  },
  dayCircleNumPresent: {
    fontSize: 11,
    fontWeight: '900',
    color: '#0D8A5A',
  },
  presentTodayTag: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#E6F6EF',
    paddingHorizontal: 8,
    paddingVertical: 2.5,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#A7F3D0',
    marginTop: 3,
    alignSelf: 'flex-start',
  },
  presentTodayDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#0D8A5A',
    marginRight: 5,
  },
  presentTodayTagText: {
    fontSize: 10,
    fontWeight: '800',
    color: '#0D8A5A',
  },
});

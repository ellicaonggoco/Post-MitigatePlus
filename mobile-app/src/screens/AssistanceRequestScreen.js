import React, { useState, useEffect } from 'react';
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
} from '../components/AppIcons';
import { SHADOWS, RESPONSIVE } from '../theme';
import { API_BASE_URL } from '../config';

const JOB_CATEGORIES = [
  {
    id: 'Debris & Mud Clearing',
    title: 'Debris and Mud Clearing',
    scope: 'Heavy Work',
    desc: 'Road clearing, mud shoveling, and storm debris removal across community streets.',
    badgeColor: '#475569',
    badgeBg: '#F1F5F9',
    IconComponent: ShovelIcon,
  },
  {
    id: 'Drainage & Canal Declogging',
    title: 'Drainage and Canal Declogging',
    scope: 'Heavy Work',
    desc: 'Clearing culverts, storm drains, and waterways to ensure rapid flood water recession.',
    badgeColor: '#475569',
    badgeBg: '#F1F5F9',
    IconComponent: BroomIcon,
  },
  {
    id: 'Evacuation Center Sanitation',
    title: 'Evacuation Center Sanitation',
    scope: 'Moderate Work',
    desc: 'Deep cleaning, disinfection, and facility maintenance in designated shelters.',
    badgeColor: '#475569',
    badgeBg: '#F1F5F9',
    IconComponent: SprayIcon,
  },
  {
    id: 'Relief Goods Logistics & Packing',
    title: 'Relief Logistics and Packing',
    scope: 'Light Work',
    desc: 'Assembling food packs, organizing warehouse supplies, and staging distribution lines.',
    badgeColor: '#475569',
    badgeBg: '#F1F5F9',
    IconComponent: BoxPackageIcon,
  },
  {
    id: 'Carpentry & Facility Repair',
    title: 'Carpentry and Facility Repair',
    scope: 'Skilled Work',
    desc: 'Restoring damaged roofs, partitions, handrails, and emergency community barriers.',
    badgeColor: '#475569',
    badgeBg: '#F1F5F9',
    IconComponent: HammerToolIcon,
  },
];

export default function AssistanceRequestScreen({ token, lang = 'tl', onBack }) {
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [activeProject, setActiveProject] = useState(null);
  const [userApplication, setUserApplication] = useState(null);

  const [selectedCategory, setSelectedCategory] = useState(JOB_CATEGORIES[0].id);
  const [experienceNotes, setExperienceNotes] = useState('');
  const [isCommitted, setIsCommitted] = useState(false);

  const [showVoucherModal, setShowVoucherModal] = useState(false);
  const scrollRef = React.useRef(null);
  const [keyboardHeight, setKeyboardHeight] = useState(0);

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

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    if (!token) return;
    try {
      setLoading(true);
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
      setLoading(false);
    }
  };

  const handleApply = async () => {
    if (!isCommitted) {
      Alert.alert(
        lang === 'tl' ? 'Kumpirmasyon ng Oras' : 'Commitment Required',
        lang === 'tl'
          ? 'Pakisuyong kumpirmahin na handa kang pumasok sa nakatakdang araw ng trabaho.'
          : 'Please confirm your availability for the scheduled work duration.'
      );
      return;
    }

    setSubmitting(true);
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
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <View style={styles.centerContainer}>
        <ActivityIndicator size="large" color="#1557B0" />
        <Text style={styles.loadingText}>
          {lang === 'tl' ? 'Kinakarga ang Livelihood Program...' : 'Loading Livelihood Program...'}
        </Text>
      </View>
    );
  }

  const appStatus = userApplication?.status;
  const isPending = appStatus === 'pending_barangay_review';
  const isApprovedOrActive = appStatus === 'approved_for_work' || appStatus === 'active_on_duty';
  const totalDays = activeProject?.durationDays || 10;
  const workedDays = userApplication?.totalDaysWorked || 0;
  const earnedAmount = workedDays * 500;

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      keyboardVerticalOffset={Platform.OS === 'ios' ? 64 : 0}
    >
      <ScrollView
        ref={scrollRef}
        contentContainerStyle={[styles.content, { paddingBottom: 95 + keyboardHeight }]}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
        keyboardDismissMode="on-drag"
      >
        <TouchableOpacity style={styles.backBtnPill} onPress={onBack} activeOpacity={0.75}>
          <ArrowLeftIcon size={14} color="#1557B0" />
          <Text style={styles.backBtnText}>{lang === 'tl' ? 'Bumalik sa Home' : 'Back to Home'}</Text>
        </TouchableOpacity>

        <View style={styles.header}>
          <View style={styles.kickerRow}>
            <View style={styles.kickerDot} />
            <Text style={styles.kicker}>LGU EMERGENCY EMPLOYMENT AND REHABILITATION</Text>
          </View>
          <Text style={styles.title}>
            {lang === 'tl' ? 'Post-Disaster Cash-for-Work' : 'Post-Disaster Cash-for-Work'}
          </Text>
          <Text style={styles.sub}>
            {lang === 'tl'
              ? 'TUPAD-style na pangkabuhayang tulong para sa mga residenteng nawalan ng kita matapos ang kalamidad.'
              : 'Emergency paid employment program providing short-term income and community rebuilding assistance.'}
          </Text>
        </View>

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
                <Text style={styles.stepperTitle}>Attendance Progress</Text>
                <Text style={styles.stepperCount}>
                  {'Day ' + workedDays + ' of ' + totalDays + ' Attended'}
                </Text>
              </View>

              <View style={styles.daysGrid}>
                {Array.from({ length: totalDays }, (_, i) => {
                  const dayNum = i + 1;
                  const isDone = workedDays >= dayNum;
                  return (
                    <View key={dayNum} style={[styles.dayCircle, isDone && styles.dayCircleDone]}>
                      {isDone ? (
                        <CheckIcon size={12} color="#15803D" />
                      ) : (
                        <Text style={styles.dayCircleNum}>{'D' + dayNum}</Text>
                      )}
                      <Text style={[styles.dayCircleSub, isDone && styles.dayCircleSubDone]}>
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
              style={styles.viewVoucherBtn}
              onPress={() => setShowVoucherModal(true)}
              activeOpacity={0.85}
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
              <View style={{ alignItems: 'center', paddingVertical: 48, paddingHorizontal: 24 }}>
                <Text style={{ fontSize: 40, marginBottom: 16 }}>🏗️</Text>
                <Text style={{ fontSize: 16, fontWeight: '700', color: '#172B4D', textAlign: 'center', marginBottom: 8 }}>
                  {lang === 'tl' ? 'Walang Aktibong Proyekto' : 'No Active CFW Project'}
                </Text>
                <Text style={{ fontSize: 13, color: '#64748B', textAlign: 'center', lineHeight: 20 }}>
                  {lang === 'tl'
                    ? 'Walang Cash-for-Work na proyekto ang naka-publish para sa inyong barangay sa ngayon. Mangyaring bumalik mamaya o makipag-ugnayan sa inyong Barangay Council.'
                    : 'There are no Cash-for-Work projects posted for your barangay at this time. Please check back later or contact your Barangay Council.'}
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
                    {activeProject?.targetWorksite || 'Barangay 291 (Zone 27 Worksites)'}
                  </Text>
                </View>
              </View>
            </View>

            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>
                {lang === 'tl' ? 'Pumili ng Uri ng Trabaho' : 'Select Preferred Work Category'}
              </Text>
              <Text style={styles.sectionSub}>
                {lang === 'tl'
                  ? 'Piliin ang gawaing angkop sa inyong kakayahan at kalusugan.'
                  : 'Choose the rehabilitation scope matching your physical capability.'}
              </Text>
            </View>

            {JOB_CATEGORIES.map((cat) => {
              const isSelected = selectedCategory === cat.id;
              const Icon = cat.IconComponent;
              return (
                <TouchableOpacity
                  key={cat.id}
                  style={[styles.categoryCard, isSelected && styles.categoryCardSelected]}
                  onPress={() => setSelectedCategory(cat.id)}
                  activeOpacity={0.8}
                >
                  <View style={styles.categoryHeaderRow}>
                    <View style={{ flexDirection: 'row', alignItems: 'center', flex: 1 }}>
                      <View style={{ width: 38, height: 38, borderRadius: 8, backgroundColor: isSelected ? '#EFF6FF' : '#F8FAFC', justifyContent: 'center', alignItems: 'center', marginRight: 12, borderWidth: 1, borderColor: isSelected ? '#1557B0' : '#E2E8F0' }}>
                        <Icon size={20} color={isSelected ? '#1557B0' : '#475569'} />
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
                placeholderTextColor="#94A3B8"
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
              style={[styles.submitBtn, submitting && styles.submitBtnDisabled]}
              onPress={handleApply}
              disabled={submitting}
              activeOpacity={0.85}
            >
              {submitting ? (
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

      </ScrollView>

      {/* POP-UP MODAL: DIGITAL PAYOUT VOUCHER CARD */}
      <Modal visible={showVoucherModal} transparent animationType="fade" onRequestClose={() => setShowVoucherModal(false)}>
        <View style={styles.modalOverlay}>
          <View style={styles.voucherModalCard}>
            <View style={styles.voucherHeaderRow}>
              <View>
                <Text style={styles.voucherGovKicker}>CITY GOVERNMENT OF MANILA</Text>
                <Text style={styles.voucherMainTitle}>Digital Cash-for-Work Voucher</Text>
              </View>
              <TouchableOpacity style={styles.closeBtn} onPress={() => setShowVoucherModal(false)}>
                <CloseIcon size={16} color="#0F172A" />
              </TouchableOpacity>
            </View>

            <View style={styles.voucherDetailsBox}>
              <View style={styles.voucherMetaRow}>
                <Text style={styles.voucherMetaLabel}>Reference Code:</Text>
                <Text style={styles.voucherMetaValue}>{userApplication?.payoutVoucherCode || 'CFW-291-88492A'}</Text>
              </View>
              <View style={styles.voucherMetaRow}>
                <Text style={styles.voucherMetaLabel}>Beneficiary Name:</Text>
                <Text style={styles.voucherMetaValue}>{userApplication?.applicantName || 'Resident Worker'}</Text>
              </View>
              <View style={styles.voucherMetaRow}>
                <Text style={styles.voucherMetaLabel}>Days Rendered:</Text>
                <Text style={styles.voucherMetaValue}>{(userApplication?.totalDaysWorked || 0) + ' / ' + (activeProject?.durationDays || 10) + ' Days'}</Text>
              </View>
              <View style={styles.voucherDivider} />
              <View style={styles.voucherMetaRow}>
                <Text style={styles.voucherTotalLabel}>Total Certified Payout:</Text>
                <Text style={styles.voucherTotalAmount}>
                  {'PHP ' + earnedAmount.toLocaleString() + '.00'}
                </Text>
              </View>
            </View>

            <View style={styles.qrContainer}>
              <QRCodeVisual
                value={userApplication?.payoutVoucherCode || 'CFW-291-OFFICIAL-PAYOUT'}
                size={150}
                isCompact
              />
              <Text style={styles.qrInstructions}>
                Present this certified voucher code at the Barangay Hall or City Hall Payout Center.
              </Text>
            </View>

            <TouchableOpacity style={styles.modalCloseBtn} onPress={() => setShowVoucherModal(false)}>
              <Text style={styles.modalCloseBtnText}>Close Voucher</Text>
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
    backgroundColor: '#F8FAFC',
  },
  centerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#F8FAFC',
    padding: 20,
  },
  loadingText: {
    marginTop: 12,
    fontSize: 14,
    color: '#475569',
    fontWeight: '500',
  },
  content: {
    paddingHorizontal: 16,
    paddingTop: RESPONSIVE.topSafe + 8,
    paddingBottom: 95,
  },
  backBtnPill: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    marginBottom: 16,
  },
  backBtnText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#1557B0',
    marginLeft: 6,
  },
  header: {
    marginBottom: 16,
  },
  kickerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 6,
  },
  kickerDot: {
    width: 7,
    height: 7,
    borderRadius: 4,
    backgroundColor: '#1557B0',
    marginRight: 6,
  },
  kicker: {
    fontSize: 11,
    fontWeight: '700',
    color: '#1557B0',
    letterSpacing: 0.8,
  },
  title: {
    fontSize: 22,
    fontWeight: '800',
    color: '#0F172A',
    letterSpacing: -0.4,
  },
  sub: {
    fontSize: 13,
    color: '#475569',
    marginTop: 4,
    lineHeight: 18,
  },
  projectCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    marginBottom: 18,
    elevation: 2,
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
    backgroundColor: '#16A34A',
    marginRight: 6,
  },
  projectKicker: {
    fontSize: 10.5,
    fontWeight: '700',
    color: '#16A34A',
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
    color: '#475569',
    marginTop: 4,
    lineHeight: 17,
  },
  projectSpecsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#F1F5F9',
  },
  specItem: {
    width: '50%',
    marginBottom: 8,
  },
  specLabel: {
    fontSize: 11,
    color: '#64748B',
    fontWeight: '500',
  },
  specValue: {
    fontSize: 13,
    color: '#0F172A',
    fontWeight: '700',
    marginTop: 1,
  },
  sectionHeader: {
    marginBottom: 10,
  },
  sectionTitle: {
    fontSize: 14.5,
    fontWeight: '700',
    color: '#0F172A',
  },
  sectionSub: {
    fontSize: 12,
    color: '#64748B',
    marginTop: 2,
  },
  categoryCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 10,
    padding: 14,
    borderWidth: 1.5,
    borderColor: '#E2E8F0',
    marginBottom: 10,
  },
  categoryCardSelected: {
    borderColor: '#1557B0',
    backgroundColor: '#F8FAFC',
  },
  categoryHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  categoryTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1E293B',
    flex: 1,
  },
  categoryTitleSelected: {
    color: '#1557B0',
    fontWeight: '700',
  },
  categoryBadge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
    marginLeft: 8,
  },
  categoryBadgeText: {
    fontSize: 10.5,
    fontWeight: '700',
    letterSpacing: 0.3,
  },
  categoryDesc: {
    fontSize: 12,
    color: '#64748B',
    lineHeight: 16,
  },
  commitmentCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 10,
    padding: 14,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    marginTop: 6,
    marginBottom: 18,
  },
  checkboxRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  checkbox: {
    width: 20,
    height: 20,
    borderRadius: 5,
    borderWidth: 1.5,
    borderColor: '#94A3B8',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 10,
    marginTop: 2,
  },
  checkboxChecked: {
    backgroundColor: '#1557B0',
    borderColor: '#1557B0',
  },
  checkboxCheck: {
    color: '#FFFFFF',
    fontSize: 11,
    fontWeight: '700',
  },
  checkboxText: {
    fontSize: 12.5,
    color: '#334155',
    flex: 1,
    lineHeight: 18,
    fontWeight: '500',
  },
  experienceInput: {
    backgroundColor: '#F8FAFC',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    paddingHorizontal: 12,
    paddingVertical: 8,
    fontSize: 12.5,
    color: '#0F172A',
    marginTop: 12,
    minHeight: 50,
    textAlignVertical: 'top',
  },
  submitBtn: {
    backgroundColor: '#1557B0',
    borderRadius: 10,
    paddingVertical: 14,
    alignItems: 'center',
    justifyContent: 'center',
    elevation: 3,
    marginBottom: 4,
  },
  submitBtnDisabled: {
    opacity: 0.6,
  },
  submitBtnText: {
    fontSize: 14.5,
    fontWeight: '700',
    color: '#FFFFFF',
    letterSpacing: 0.3,
  },
  pendingCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 18,
    borderWidth: 1,
    borderColor: '#FDE68A',
    borderLeftWidth: 5,
    borderLeftColor: '#D97706',
    elevation: 2,
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
    borderRadius: 5,
  },
  pendingBadgeText: {
    fontSize: 10.5,
    fontWeight: '700',
    color: '#B45309',
    letterSpacing: 0.5,
  },
  pendingTimestamp: {
    fontSize: 11,
    color: '#94A3B8',
  },
  pendingCardTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#0F172A',
    marginBottom: 4,
  },
  pendingCardSub: {
    fontSize: 12.5,
    color: '#475569',
    lineHeight: 17,
  },
  pendingMetaBox: {
    backgroundColor: '#FFFBEB',
    borderRadius: 8,
    padding: 12,
    marginTop: 12,
  },
  metaRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 4,
  },
  metaLabel: {
    fontSize: 12,
    color: '#78350F',
    fontWeight: '500',
  },
  metaValue: {
    fontSize: 12,
    color: '#78350F',
    fontWeight: '700',
  },
  activeDutyCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 18,
    borderWidth: 1,
    borderColor: '#BBF7D0',
    borderLeftWidth: 5,
    borderLeftColor: '#16A34A',
    elevation: 2,
  },
  activeBadgeRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 6,
  },
  approvedBadge: {
    backgroundColor: '#DCFCE7',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 5,
  },
  approvedBadgeText: {
    fontSize: 10.5,
    fontWeight: '700',
    color: '#15803D',
    letterSpacing: 0.5,
  },
  activeWorksiteText: {
    fontSize: 11.5,
    color: '#64748B',
    fontWeight: '600',
  },
  activeCardTitle: {
    fontSize: 17,
    fontWeight: '800',
    color: '#0F172A',
    marginTop: 2,
  },
  activeCardSub: {
    fontSize: 12.5,
    color: '#475569',
    marginTop: 4,
    lineHeight: 17,
  },
  stepperContainer: {
    backgroundColor: '#F8FAFC',
    borderRadius: 10,
    padding: 14,
    marginTop: 14,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  stepperHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  stepperTitle: {
    fontSize: 12.5,
    fontWeight: '700',
    color: '#0F172A',
  },
  stepperCount: {
    fontSize: 12,
    fontWeight: '700',
    color: '#16A34A',
  },
  daysGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
  dayCircle: {
    width: '18%',
    backgroundColor: '#FFFFFF',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#CBD5E1',
    paddingVertical: 6,
    alignItems: 'center',
    marginBottom: 8,
  },
  dayCircleDone: {
    backgroundColor: '#DCFCE7',
    borderColor: '#16A34A',
  },
  dayCircleNum: {
    fontSize: 11,
    fontWeight: '700',
    color: '#64748B',
  },
  dayCircleNumDone: {
    color: '#15803D',
  },
  dayCircleSub: {
    fontSize: 9,
    color: '#94A3B8',
    marginTop: 1,
  },
  dayCircleSubDone: {
    color: '#166534',
    fontWeight: '600',
  },
  earningsBox: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#F0FDF4',
    borderRadius: 8,
    padding: 12,
    marginTop: 14,
    borderWidth: 1,
    borderColor: '#DCFCE7',
  },
  earningsLabel: {
    fontSize: 11,
    color: '#166534',
    fontWeight: '500',
  },
  earningsAmount: {
    fontSize: 16,
    fontWeight: '800',
    color: '#15803D',
    marginTop: 1,
  },
  dailyRatePill: {
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#BBF7D0',
  },
  dailyRateText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#166534',
  },
  viewVoucherBtn: {
    backgroundColor: '#0F172A',
    borderRadius: 8,
    paddingVertical: 12,
    alignItems: 'center',
    marginTop: 14,
  },
  viewVoucherBtnText: {
    fontSize: 13.5,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(15, 23, 42, 0.75)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  voucherModalCard: {
    width: '100%',
    maxWidth: 380,
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 20,
    elevation: 5,
  },
  voucherHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  voucherGovKicker: {
    fontSize: 10,
    fontWeight: '700',
    color: '#1557B0',
    letterSpacing: 0.8,
  },
  voucherMainTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: '#0F172A',
    marginTop: 2,
  },
  closeBtn: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: '#F1F5F9',
    justifyContent: 'center',
    alignItems: 'center',
  },
  voucherDetailsBox: {
    backgroundColor: '#F8FAFC',
    borderRadius: 10,
    padding: 12,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    marginBottom: 14,
  },
  voucherMetaRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 4,
  },
  voucherMetaLabel: {
    fontSize: 12,
    color: '#64748B',
    fontWeight: '500',
  },
  voucherMetaValue: {
    fontSize: 12,
    color: '#0F172A',
    fontWeight: '700',
  },
  voucherDivider: {
    height: 1,
    backgroundColor: '#E2E8F0',
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
    color: '#64748B',
    textAlign: 'center',
    marginTop: 10,
    lineHeight: 15,
    paddingHorizontal: 10,
  },
  modalCloseBtn: {
    backgroundColor: '#1557B0',
    borderRadius: 8,
    paddingVertical: 11,
    alignItems: 'center',
    marginTop: 10,
  },
  modalCloseBtnText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#FFFFFF',
  },
});
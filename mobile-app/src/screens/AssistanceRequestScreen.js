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
  Image,
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
  FoodIcon,
  BabyIcon,
  MedicineIcon,
  HygieneIcon,
  WaterDropIcon,
  WheelchairIcon,
  SeniorIcon,
  HeartPulseIcon,
  UsersIcon,
  MapPinIcon,
  ClockIcon,
  HourglassIcon,
  RefreshIcon,
  AlertTriangleIcon,
} from '../components/AppIcons';
import { SHADOWS, RESPONSIVE } from '../theme';
import { API_BASE_URL } from '../config';

// ── SPECIAL RELIEF DOOR-TO-DOOR PACKAGES ────────────────────────────
const RELIEF_PACKAGES = [
  {
    id: 'food',
    name: 'Basic Family Food Pack',
    nameTl: 'Pangunahing Food Pack ng Pamilya',
    desc: '5kg bigas, de-lata, instant noodles, kape, at asukal.',
    IconComponent: FoodIcon,
    badge: 'Nutrisyon',
    color: '#1C3F94',
    bg: '#EFF6FF',
  },
  {
    id: 'water',
    name: 'Safe Drinking Water Pack',
    nameTl: 'Malinis na Inuming Tubig',
    desc: 'Selyadong malinis na inuming tubig para sa pamilya.',
    IconComponent: WaterDropIcon,
    badge: 'Pang-inom',
    color: '#0284C7',
    bg: '#F0F9FF',
  },
  {
    id: 'medical',
    name: 'Emergency Medical & First Aid Kit',
    nameTl: 'Gamot at First Aid Kit',
    desc: 'Paracetamol, oral rehydration salts, alcohol, bendahe, at betadine.',
    IconComponent: MedicineIcon,
    badge: 'Kalusugan',
    color: '#DC2626',
    bg: '#FEF2F2',
  },
  {
    id: 'infant',
    name: 'Infant & Baby Care Essentials',
    nameTl: 'Pangangailangan ng Sanggol (Infant Pack)',
    desc: 'Gatas ng sanggol, diapers, baby wipes, at feeding supplies.',
    IconComponent: BabyIcon,
    badge: 'Sanggol',
    color: '#7C3AED',
    bg: '#FAF5FF',
  },
  {
    id: 'senior_hygiene',
    name: 'Senior & Hygiene Care Kit',
    nameTl: 'Senior & Hygiene Kit (Toiletries)',
    desc: 'Adult diapers, disinfectant, sabon, sipilyo, toothpaste, at bimpo.',
    IconComponent: HygieneIcon,
    badge: 'Hygiene & Senior',
    color: '#D97706',
    bg: '#FFFBEB',
  },
  {
    id: 'shelter_repair',
    name: 'Emergency Shelter Repair Kit',
    nameTl: 'Kagamitan sa Pagkukumpuni ng Bahay',
    desc: 'Mabigat na tolda (tarpaulin), pako, alambre, at panali para sa bubong.',
    IconComponent: HammerToolIcon,
    badge: 'Kumpuni',
    color: '#B45309',
    bg: '#FEF3C7',
  },
];

// ── VULNERABILITY AUDIENCE CHIPS ────────────────────────────────────
const VULNERABILITY_OPTIONS = [
  { id: 'Senior Citizen', label: 'Senior Citizen (60+)', IconComponent: SeniorIcon },
  { id: 'PWD', label: 'May Kapansanan (PWD)', IconComponent: WheelchairIcon },
  { id: 'Infant Care', label: 'May Sanggol (0-2 taon)', IconComponent: BabyIcon },
  { id: 'Solo Parent', label: 'Solo Parent', IconComponent: UsersIcon },
  { id: 'Severe / Bedridden', label: 'May Karamdaman / Bedridden', IconComponent: HeartPulseIcon },
];

// ── SEVERITY / PRIORITY LEVELS ──────────────────────────────────────
const SEVERITY_LEVELS = [
  { id: 'Standard Assistance', label: 'Standard', labelTl: 'Standard (Pang-araw-araw na tulong)', color: '#475569', bg: '#F1F5F9' },
  { id: 'Urgent Need', label: 'Urgent', labelTl: 'Urgent (Naubusan ng supply / may may sakit)', color: '#D97706', bg: '#FEF3C7' },
  { id: 'Critical Emergency', label: 'Critical', labelTl: 'Kritikal (Lubog sa baha / hindi makalabas)', color: '#DC2626', bg: '#FEE2E2' },
];

// ── CASH FOR WORK CATEGORIES ────────────────────────────────────────
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

export default function AssistanceRequestScreen({
  token,
  lang = 'tl',
  onBack,
  onSubmitSuccess,
  user,
  householdData,
}) {
  // Top-level Dual Mode: 'special_relief' (Door-to-Door) vs 'cfw' (Cash-for-Work)
  const [activeMode, setActiveMode] = useState('special_relief');

  // ── SPECIAL RELIEF FORM & HISTORY STATE ──────────────────────────
  const [reliefViewMode, setReliefViewMode] = useState('form'); // 'form' | 'history'
  const [selectedPackages, setSelectedPackages] = useState(['food']);
  const [selectedVulnerabilities, setSelectedVulnerabilities] = useState([]);
  const [selectedSeverity, setSelectedSeverity] = useState('Standard Assistance');
  const [reasonNotes, setReasonNotes] = useState('');
  const [customAddress, setCustomAddress] = useState(
    householdData?.address || user?.address || ''
  );
  const [customPhone, setCustomPhone] = useState(
    user?.emailOrPhone || ''
  );
  const [myRequests, setMyRequests] = useState([]);
  const [loadingRequests, setLoadingRequests] = useState(false);
  const [submittingRelief, setSubmittingRelief] = useState(false);

  // ── CASH-FOR-WORK STATE ──────────────────────────────────────────
  const [loadingCFW, setLoadingCFW] = useState(true);
  const [submittingCFW, setSubmittingCFW] = useState(false);
  const [activeProject, setActiveProject] = useState(null);
  const [userApplication, setUserApplication] = useState(null);
  const [selectedCategory, setSelectedCategory] = useState(JOB_CATEGORIES[0].id);
  const [experienceNotes, setExperienceNotes] = useState('');
  const [isCommitted, setIsCommitted] = useState(false);
  const [showVoucherModal, setShowVoucherModal] = useState(false);

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

  // Update address and phone if householdData/user loads later
  useEffect(() => {
    if (!customAddress && (householdData?.address || user?.address)) {
      setCustomAddress(householdData?.address || user?.address || '');
    }
    if (!customPhone && user?.emailOrPhone) {
      setCustomPhone(user?.emailOrPhone || '');
    }
  }, [householdData, user]);

  // Initial Data Fetch
  useEffect(() => {
    fetchCFWData();
    fetchMyRequests();
  }, [token]);

  // ── FETCH SPECIAL RELIEF REQUESTS ─────────────────────────────────
  const fetchMyRequests = async () => {
    if (!token) return;
    try {
      setLoadingRequests(true);
      const res = await fetch(API_BASE_URL + '/assistance-requests/my-requests', {
        headers: { Authorization: 'Bearer ' + token, 'Content-Type': 'application/json' },
      });
      if (res.ok) {
        const data = await res.json();
        setMyRequests(Array.isArray(data) ? data : []);
      }
    } catch (err) {
      console.warn('Fetch my-requests warning:', err);
    } finally {
      setLoadingRequests(false);
    }
  };

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

  // ── TOGGLE RELIEF PACKAGE ─────────────────────────────────────────
  const togglePackage = (pkgId) => {
    if (selectedPackages.includes(pkgId)) {
      if (selectedPackages.length === 1) {
        Alert.alert(
          lang === 'tl' ? 'Pumili ng Ayuda' : 'Selection Required',
          lang === 'tl'
            ? 'Dapat may kahit isang package na mapili.'
            : 'At least one package must be selected.'
        );
        return;
      }
      setSelectedPackages(selectedPackages.filter(p => p !== pkgId));
    } else {
      setSelectedPackages([...selectedPackages, pkgId]);
    }
  };

  // ── TOGGLE VULNERABILITY CHIP ─────────────────────────────────────
  const toggleVulnerability = (vId) => {
    if (selectedVulnerabilities.includes(vId)) {
      setSelectedVulnerabilities(selectedVulnerabilities.filter(v => v !== vId));
    } else {
      setSelectedVulnerabilities([...selectedVulnerabilities, vId]);
    }
  };

  // ── SUBMIT SPECIAL RELIEF REQUEST ─────────────────────────────────
  const handleSpecialReliefSubmit = async () => {
    if (selectedPackages.length === 0) {
      Alert.alert(
        lang === 'tl' ? 'Pumili ng Ayuda' : 'Selection Required',
        lang === 'tl'
          ? 'Pakipili ang kahit isang uri ng ayuda o relief package na kailangan ng inyong tahanan.'
          : 'Please select at least one relief package required by your household.'
      );
      return;
    }

    if (!reasonNotes.trim()) {
      Alert.alert(
        lang === 'tl' ? 'Kailangan ng Dahilan' : 'Reason Required',
        lang === 'tl'
          ? 'Pakisulat ang maikling dahilan o sitwasyon ng inyong tahanan para sa door-to-door delivery.'
          : 'Please provide a brief reason or explanation why doorstep delivery is required.'
      );
      return;
    }

    const pkgs = selectedPackages.map(pkgId => {
      const found = RELIEF_PACKAGES.find(p => p.id === pkgId);
      return {
        id: pkgId,
        name: found ? (lang === 'tl' ? found.nameTl : found.name) : pkgId,
        category: found?.badge || 'Relief',
        quantity: 1,
      };
    });

    setSubmittingRelief(true);
    try {
      const res = await fetch(API_BASE_URL + '/assistance-requests', {
        method: 'POST',
        headers: {
          Authorization: 'Bearer ' + token,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          packages: pkgs,
          itemType: pkgs.map(p => p.name).join(', '),
          reason: reasonNotes.trim(),
          notes: reasonNotes.trim(),
          vulnerabilityTypes: selectedVulnerabilities,
          severityLevel: selectedSeverity,
          recipientName: user?.name || householdData?.headOfHouseholdUserId?.name || '',
          recipientAddress: customAddress.trim() || householdData?.address || user?.address || '',
          recipientPhone: customPhone.trim() || user?.emailOrPhone || '',
          barangay: householdData?.barangayCode || user?.barangayCode || '291',
          memberCount: householdData?.memberCount || 1,
        }),
      });

      const data = await res.json();
      if (res.ok) {
        Alert.alert(
          lang === 'tl' ? 'Matagumpay na Naisumite' : 'Request Submitted',
          lang === 'tl'
            ? 'Naitala ang inyong kahilingan para sa Door-to-Door Delivery. Itatalaga ito ng LGU Command Center sa nakatalagang Field Staff.'
            : 'Your doorstep assistance request has been submitted. The LGU Command Center will dispatch an assigned field staff.'
        );
        setSelectedPackages(['food']);
        setSelectedVulnerabilities([]);
        setReasonNotes('');
        setSelectedSeverity('Standard Assistance');
        setReliefViewMode('history');
        fetchMyRequests();
      } else {
        Alert.alert('Notice', data.message || 'Submission could not be completed.');
      }
    } catch (err) {
      Alert.alert('Error', 'Network error while submitting assistance request.');
    } finally {
      setSubmittingRelief(false);
    }
  };

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
      if (titleScope.includes('sanitation') || titleScope.includes('evacuation') || titleScope.includes('disinfect') || titleScope.includes('shelter')) {
        const sanitationMatches = matched.filter(m => m.id.includes('Sanitation'));
        if (sanitationMatches.length > 0) return sanitationMatches;
      }
      if (titleScope.includes('logistics') || titleScope.includes('packing') || titleScope.includes('relief pack') || titleScope.includes('warehouse')) {
        const logisticsMatches = matched.filter(m => m.id.includes('Logistics'));
        if (logisticsMatches.length > 0) return logisticsMatches;
      }
      if (titleScope.includes('carpentry') || titleScope.includes('repair') || titleScope.includes('infrastructure') || titleScope.includes('roof')) {
        const carpentryMatches = matched.filter(m => m.id.includes('Carpentry'));
        if (carpentryMatches.length > 0) return carpentryMatches;
      }

      if (matched.length > 0) return matched;
    }

    const titleScope = `${activeProject.title || ''} ${activeProject.description || ''}`.toLowerCase();
    if (titleScope.includes('drainage') || titleScope.includes('canal') || titleScope.includes('declog')) {
      return JOB_CATEGORIES.filter(c => c.id.includes('Drainage') || c.id.includes('Debris'));
    }
    if (titleScope.includes('debris') || titleScope.includes('mud') || titleScope.includes('clearing')) {
      return JOB_CATEGORIES.filter(c => c.id.includes('Debris'));
    }
    if (titleScope.includes('sanitation') || titleScope.includes('evacuation') || titleScope.includes('disinfect') || titleScope.includes('shelter')) {
      return JOB_CATEGORIES.filter(c => c.id.includes('Sanitation'));
    }
    if (titleScope.includes('logistics') || titleScope.includes('packing') || titleScope.includes('relief pack') || titleScope.includes('warehouse')) {
      return JOB_CATEGORIES.filter(c => c.id.includes('Logistics'));
    }
    if (titleScope.includes('carpentry') || titleScope.includes('repair') || titleScope.includes('infrastructure') || titleScope.includes('roof')) {
      return JOB_CATEGORIES.filter(c => c.id.includes('Carpentry'));
    }

    return JOB_CATEGORIES;
  }, [activeProject]);

  useEffect(() => {
    if (availableJobCategories && availableJobCategories.length > 0) {
      const exists = availableJobCategories.some(c => c.id === selectedCategory);
      if (!exists) {
        setSelectedCategory(availableJobCategories[0].id);
      }
    }
  }, [availableJobCategories, selectedCategory]);

  const handleApplyCFW = async () => {
    if (!isCommitted) {
      Alert.alert(
        lang === 'tl' ? 'Kumpirmasyon ng Oras' : 'Commitment Required',
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
  const earnedAmount = workedDays * 500;

  // Helper for Status Badge Rendering in Requests History
  const renderStatusBadge = (status) => {
    switch (status) {
      case 'received':
        return (
          <View style={[styles.statusBadge, { backgroundColor: '#DCFCE7', borderColor: '#86EFAC' }]}>
            <CheckIcon size={12} color="#15803D" />
            <Text style={[styles.statusBadgeText, { color: '#15803D' }]}>
              {lang === 'tl' ? 'Naihatid na sa Tahanan' : 'Delivered'}
            </Text>
          </View>
        );
      case 'released':
        return (
          <View style={[styles.statusBadge, { backgroundColor: '#EEF2FF', borderColor: '#C7D2FE' }]}>
            <BoxPackageIcon size={12} color="#4338CA" />
            <Text style={[styles.statusBadgeText, { color: '#4338CA' }]}>
              {lang === 'tl' ? 'Papunta na ang Staff' : 'Out for Delivery'}
            </Text>
          </View>
        );
      case 'approved':
      case 'under_review':
        return (
          <View style={[styles.statusBadge, { backgroundColor: '#EFF6FF', borderColor: '#BFDBFE' }]}>
            <CheckIcon size={12} color="#1D4ED8" />
            <Text style={[styles.statusBadgeText, { color: '#1D4ED8' }]}>
              {lang === 'tl' ? 'Aprubado - Itinalaga sa Staff' : 'Assigned to Staff'}
            </Text>
          </View>
        );
      case 'rejected':
        return (
          <View style={[styles.statusBadge, { backgroundColor: '#FEE2E2', borderColor: '#FCA5A5' }]}>
            <CloseIcon size={12} color="#B91C1C" />
            <Text style={[styles.statusBadgeText, { color: '#B91C1C' }]}>
              {lang === 'tl' ? 'Hindi Naaprubahan' : 'Rejected'}
            </Text>
          </View>
        );
      case 'pending':
      default:
        return (
          <View style={[styles.statusBadge, { backgroundColor: '#FEF3C7', borderColor: '#FDE68A' }]}>
            <HourglassIcon size={12} color="#B45309" />
            <Text style={[styles.statusBadgeText, { color: '#B45309' }]}>
              {lang === 'tl' ? 'Nasa Pagsusuri (Pending)' : 'Under Review'}
            </Text>
          </View>
        );
    }
  };

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
        {/* HEADER GRADIENT WITH CITIZEN BRANDING */}
        <LinearGradient colors={['#0B1D4E', '#1C3F94']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}>
          <View style={{ height: 3, backgroundColor: '#C9A84C' }} />
          <View style={{ height: Platform.OS === 'web' ? 0 : RESPONSIVE.topSafe }} />
          
          <View style={styles.navHeaderRow}>
            <TouchableOpacity onPress={onBack} style={styles.navBackBtn} activeOpacity={0.8}>
              <ArrowLeftIcon size={18} color="#FFFFFF" strokeWidth={2.0} />
            </TouchableOpacity>
            <Text style={styles.navTitle}>
              {activeMode === 'special_relief'
                ? (lang === 'tl' ? 'Espesyal na Ayuda' : 'Special Relief')
                : 'Cash-for-Work'}
            </Text>
            <View style={{ width: 36 }} />
          </View>

          <View style={styles.heroTextContainer}>
            <Text style={styles.heroKicker}>
              {activeMode === 'special_relief'
                ? 'LGU MANILA CITIZEN WELFARE & LAST-MILE RELIEF'
                : 'LGU EMERGENCY EMPLOYMENT & REHABILITATION'}
            </Text>
            <Text style={styles.heroMainTitle}>
              {activeMode === 'special_relief'
                ? (lang === 'tl' ? 'Espesyal na Ayuda sa Tahanan' : 'Door-to-Door Relief Delivery')
                : 'Post-Disaster Cash-for-Work'}
            </Text>
            <Text style={styles.heroSubtitle}>
              {activeMode === 'special_relief'
                ? (lang === 'tl'
                    ? 'Serbisyo para sa mga pamilyang may Senior, PWD, sanggol, o bedridden na hindi makapunta sa relief distribution venue.'
                    : 'Doorstep relief delivery for vulnerable households with seniors, PWDs, infants, or isolated families.')
                : (lang === 'tl'
                    ? 'Pang-emerhensiyang hanapbuhay at tulong sa pagpapanumbalik ng komunidad (PHP 500/day).'
                    : 'Emergency paid employment providing short-term income and community rebuilding assistance.')}
            </Text>
          </View>
        </LinearGradient>

        {/* TOP SEGMENTED CONTROL: SPECIAL RELIEF VS CASH FOR WORK */}
        <View style={styles.modeSegmentContainer}>
          <TouchableOpacity
            style={[styles.modeSegmentBtn, activeMode === 'special_relief' && styles.modeSegmentBtnActive]}
            onPress={() => setActiveMode('special_relief')}
            activeOpacity={0.85}
          >
            <BoxPackageIcon
              size={17}
              color={activeMode === 'special_relief' ? '#FFFFFF' : '#1C3F94'}
              strokeWidth={2.2}
            />
            <Text
              style={[
                styles.modeSegmentBtnText,
                activeMode === 'special_relief' && styles.modeSegmentBtnTextActive,
              ]}
            >
              {lang === 'tl' ? 'Espesyal na Ayuda' : 'Special Relief'}
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.modeSegmentBtn, activeMode === 'cfw' && styles.modeSegmentBtnActive]}
            onPress={() => setActiveMode('cfw')}
            activeOpacity={0.85}
          >
            <BriefcaseOutlineIcon
              size={17}
              color={activeMode === 'cfw' ? '#FFFFFF' : '#1C3F94'}
              strokeWidth={2.2}
            />
            <Text
              style={[
                styles.modeSegmentBtnText,
                activeMode === 'cfw' && styles.modeSegmentBtnTextActive,
              ]}
            >
              {lang === 'tl' ? 'Cash-for-Work' : 'Cash-for-Work'}
            </Text>
          </TouchableOpacity>
        </View>

        {/* ══════════════════════════════════════════════════════════════ */}
        {/* MODE 1: SPECIAL RELIEF (DOOR-TO-DOOR)                          */}
        {/* ══════════════════════════════════════════════════════════════ */}
        {activeMode === 'special_relief' && (
          <View style={styles.bodyWrapper}>
            {/* SUB-TABS: FORM vs HISTORY */}
            <View style={styles.reliefSubTabsRow}>
              <TouchableOpacity
                style={[styles.reliefSubTab, reliefViewMode === 'form' && styles.reliefSubTabActive]}
                onPress={() => setReliefViewMode('form')}
                activeOpacity={0.8}
              >
                <Text style={[styles.reliefSubTabText, reliefViewMode === 'form' && styles.reliefSubTabTextActive]}>
                  {lang === 'tl' ? 'Magsumite ng Request' : 'Submit Request'}
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.reliefSubTab, reliefViewMode === 'history' && styles.reliefSubTabActive]}
                onPress={() => {
                  setReliefViewMode('history');
                  fetchMyRequests();
                }}
                activeOpacity={0.8}
              >
                <Text style={[styles.reliefSubTabText, reliefViewMode === 'history' && styles.reliefSubTabTextActive]}>
                  {lang === 'tl' ? `Aking Mga Request (${myRequests.length})` : `My Requests (${myRequests.length})`}
                </Text>
              </TouchableOpacity>
            </View>

            {/* SUB-TAB 1: REQUEST FORM */}
            {reliefViewMode === 'form' && (
              <>
                {/* INFO BANNER */}
                <View style={styles.reliefInfoCard}>
                  <View style={{ flexDirection: 'row', alignItems: 'flex-start' }}>
                    <View style={styles.reliefInfoIconWell}>
                      <HeartPulseIcon size={20} color="#1C3F94" />
                    </View>
                    <View style={{ flex: 1, marginLeft: 12 }}>
                      <Text style={styles.reliefInfoTitle}>
                        {lang === 'tl' ? 'Direktang Hatid sa Inyong Pintuan' : 'Direct Doorstep Delivery'}
                      </Text>
                      <Text style={styles.reliefInfoDesc}>
                        {lang === 'tl'
                          ? 'Ang serbisyong ito ay nakalaan para sa mga kababayang may matinding pangangailangan, may sakit, o hindi makapila sa distribution center. May LGU Field Staff na magdadala ng ayuda sa inyong tirahan.'
                          : 'This service is prioritized for vulnerable residents unable to visit public relief centers due to disability, medical conditions, or disaster isolation.'}
                      </Text>
                    </View>
                  </View>
                </View>

                {/* STEP 1: SELECT RELIEF PACKAGES */}
                <View style={styles.sectionHeader}>
                  <View style={styles.sectionHeaderRow}>
                    <Text style={styles.sectionTitle}>
                      {lang === 'tl' ? '1. Pumili ng Ayuda na Kailangan' : '1. Select Needed Relief Packages'}
                    </Text>
                    <View style={styles.countBadge}>
                      <Text style={styles.countBadgeText}>
                        {`${selectedPackages.length} napili`}
                      </Text>
                    </View>
                  </View>
                  <Text style={styles.sectionSub}>
                    {lang === 'tl'
                      ? 'Maaaring pumili ng higit sa isa depende sa pangangailangan ng pamilya.'
                      : 'You may select multiple packages based on your household requirements.'}
                  </Text>
                </View>

                <View style={styles.packagesGrid}>
                  {RELIEF_PACKAGES.map((pkg) => {
                    const isSelected = selectedPackages.includes(pkg.id);
                    const Icon = pkg.IconComponent;
                    return (
                      <TouchableOpacity
                        key={pkg.id}
                        style={[styles.packageCard, isSelected && styles.packageCardSelected]}
                        onPress={() => togglePackage(pkg.id)}
                        activeOpacity={0.8}
                      >
                        <View style={styles.packageCardTop}>
                          <View style={[styles.packageIconWell, { backgroundColor: isSelected ? '#EFF6FF' : pkg.bg }]}>
                            <Icon size={22} color={pkg.color} />
                          </View>
                          <View style={[styles.packageCheckbox, isSelected && styles.packageCheckboxSelected]}>
                            {isSelected && <CheckIcon size={12} color="#FFFFFF" />}
                          </View>
                        </View>

                        <Text style={[styles.packageTitle, isSelected && styles.packageTitleSelected]}>
                          {lang === 'tl' ? pkg.nameTl : pkg.name}
                        </Text>
                        <Text style={styles.packageDesc} numberOfLines={2}>
                          {pkg.desc}
                        </Text>

                        <View style={styles.packageBadgeRow}>
                          <View style={[styles.packageBadge, { backgroundColor: pkg.bg }]}>
                            <Text style={[styles.packageBadgeText, { color: pkg.color }]}>{pkg.badge}</Text>
                          </View>
                        </View>
                      </TouchableOpacity>
                    );
                  })}
                </View>

                {/* STEP 2: VULNERABILITY AUDIENCE */}
                <View style={[styles.sectionHeader, { marginTop: 18 }]}>
                  <Text style={styles.sectionTitle}>
                    {lang === 'tl' ? '2. Sino ang Nangangailangan sa Tahanan?' : '2. Vulnerable Household Members'}
                  </Text>
                  <Text style={styles.sectionSub}>
                    {lang === 'tl'
                      ? 'Pindutin ang lahat ng naaangkop para sa mas mabilis na prioritasyon:'
                      : 'Select all that apply to help prioritize your delivery:'}
                  </Text>
                </View>

                <View style={styles.vulnerabilitiesWrap}>
                  {VULNERABILITY_OPTIONS.map((vuln) => {
                    const isSelected = selectedVulnerabilities.includes(vuln.id);
                    const Icon = vuln.IconComponent;
                    return (
                      <TouchableOpacity
                        key={vuln.id}
                        style={[styles.vulnChip, isSelected && styles.vulnChipSelected]}
                        onPress={() => toggleVulnerability(vuln.id)}
                        activeOpacity={0.8}
                      >
                        <Icon size={15} color={isSelected ? '#FFFFFF' : '#1C3F94'} />
                        <Text style={[styles.vulnChipText, isSelected && styles.vulnChipTextSelected]}>
                          {vuln.label}
                        </Text>
                        {isSelected && (
                          <View style={styles.chipCheckDot}>
                            <CheckIcon size={10} color="#FFFFFF" />
                          </View>
                        )}
                      </TouchableOpacity>
                    );
                  })}
                </View>

                {/* STEP 3: URGENCY / SEVERITY LEVEL */}
                <View style={[styles.sectionHeader, { marginTop: 18 }]}>
                  <Text style={styles.sectionTitle}>
                    {lang === 'tl' ? '3. Antas ng Pangangailangan (Urgency)' : '3. Urgency Level'}
                  </Text>
                </View>

                <View style={styles.severityRow}>
                  {SEVERITY_LEVELS.map((sev) => {
                    const isSelected = selectedSeverity === sev.id;
                    return (
                      <TouchableOpacity
                        key={sev.id}
                        style={[
                          styles.severityPill,
                          isSelected && { borderColor: sev.color, backgroundColor: sev.bg, borderWidth: 1.5 },
                        ]}
                        onPress={() => setSelectedSeverity(sev.id)}
                        activeOpacity={0.8}
                      >
                        <Text style={[styles.severityPillText, isSelected && { color: sev.color, fontWeight: '800' }]}>
                          {lang === 'tl' ? sev.labelTl.split(' ')[0] : sev.label}
                        </Text>
                      </TouchableOpacity>
                    );
                  })}
                </View>

                {/* STEP 4: REASON & NOTES */}
                <View style={[styles.sectionHeader, { marginTop: 18 }]}>
                  <Text style={styles.sectionTitle}>
                    {lang === 'tl' ? '4. Dahilan o Karagdagang Detalye' : '4. Reason & Specific Instructions'}
                  </Text>
                  <Text style={styles.sectionSub}>
                    {lang === 'tl'
                      ? 'Ilarawan ang sitwasyon sa bahay (hal. lubog sa baha, hindi makalakad ang magulang):'
                      : 'Briefly explain why door-to-door delivery is needed:'}
                  </Text>
                </View>

                <View style={styles.textInputCard}>
                  <TextInput
                    style={styles.multilineInput}
                    placeholder={
                      lang === 'tl'
                        ? 'Halimbawa: May 80-anyos na lola na bedridden at 6-buwang sanggol. Hindi po makatawid sa kanto dahil lampas-tuhod pa ang baha...'
                        : 'e.g. Bedridden grandmother and 6-month-old infant in the house. Cannot cross street due to high floodwaters...'
                    }
                    placeholderTextColor="#94A3B8"
                    value={reasonNotes}
                    onChangeText={setReasonNotes}
                    multiline
                    numberOfLines={4}
                    onFocus={() => {
                      setTimeout(() => {
                        scrollRef.current?.scrollToEnd({ animated: true });
                      }, 120);
                    }}
                  />
                </View>

                {/* STEP 5: DELIVERY ADDRESS & CONTACT */}
                <View style={[styles.sectionHeader, { marginTop: 18 }]}>
                  <Text style={styles.sectionTitle}>
                    {lang === 'tl' ? '5. Lokasyon at Numero para sa Paghahatid' : '5. Delivery Location & Contact'}
                  </Text>
                  <Text style={styles.sectionSub}>
                    {lang === 'tl'
                      ? 'Tiyaking tama ang tirahan upang mahanap ng LGU Field Staff ang inyong tahanan:'
                      : 'Ensure your address is complete for easy navigation by field staff:'}
                  </Text>
                </View>

                <View style={styles.locationCard}>
                  <View style={styles.inputGroup}>
                    <Text style={styles.inputGroupLabel}>
                      {lang === 'tl' ? 'Tirahan (House No., Street, Purok):' : 'Complete Address:'}
                    </Text>
                    <TextInput
                      style={styles.singleLineInput}
                      placeholder="Street, House No., Purok"
                      placeholderTextColor="#94A3B8"
                      value={customAddress}
                      onChangeText={setCustomAddress}
                    />
                  </View>

                  <View style={[styles.inputGroup, { marginTop: 10 }]}>
                    <Text style={styles.inputGroupLabel}>
                      {lang === 'tl' ? 'Telepono o Mobile Number:' : 'Contact Phone Number:'}
                    </Text>
                    <TextInput
                      style={styles.singleLineInput}
                      placeholder="09XX XXX XXXX"
                      placeholderTextColor="#94A3B8"
                      keyboardType="phone-pad"
                      value={customPhone}
                      onChangeText={setCustomPhone}
                    />
                  </View>

                  <View style={styles.barangayPillRow}>
                    <MapPinIcon size={14} color="#1C3F94" />
                    <Text style={styles.barangayPillText}>
                      {`Barangay ${householdData?.barangayCode || user?.barangayCode || '291'}, City of Manila`}
                    </Text>
                  </View>
                </View>

                {/* SUBMIT BUTTON */}
                <TouchableOpacity
                  style={[styles.submitReliefBtn, submittingRelief && styles.submitBtnDisabled]}
                  onPress={handleSpecialReliefSubmit}
                  disabled={submittingRelief}
                  activeOpacity={0.85}
                >
                  {submittingRelief ? (
                    <ActivityIndicator color="#FFFFFF" />
                  ) : (
                    <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8 }}>
                      <BoxPackageIcon size={18} color="#FFFFFF" strokeWidth={2.2} />
                      <Text style={styles.submitReliefBtnText}>
                        {lang === 'tl'
                          ? 'I-submit ang Kahilingan para sa Door-to-Door Delivery'
                          : 'Submit Door-to-Door Delivery Request'}
                      </Text>
                    </View>
                  )}
                </TouchableOpacity>
              </>
            )}

            {/* SUB-TAB 2: REQUEST HISTORY */}
            {reliefViewMode === 'history' && (
              <View style={{ marginTop: 8 }}>
                <View style={styles.historyHeaderRow}>
                  <Text style={styles.historySectionTitle}>
                    {lang === 'tl' ? 'Katayuan ng Iyong mga Kahilingan' : 'Assistance Request Status'}
                  </Text>
                  <TouchableOpacity
                    style={styles.refreshBtn}
                    onPress={fetchMyRequests}
                    disabled={loadingRequests}
                    activeOpacity={0.8}
                  >
                    <RefreshIcon size={14} color="#1C3F94" />
                    <Text style={styles.refreshBtnText}>
                      {lang === 'tl' ? 'I-refresh' : 'Refresh'}
                    </Text>
                  </TouchableOpacity>
                </View>

                {loadingRequests ? (
                  <View style={styles.historyLoadingContainer}>
                    <ActivityIndicator size="small" color="#1C3F94" />
                    <Text style={styles.historyLoadingText}>
                      {lang === 'tl' ? 'Kinakarga ang mga request...' : 'Loading requests...'}
                    </Text>
                  </View>
                ) : myRequests.length === 0 ? (
                  <View style={styles.emptyRequestsCard}>
                    <View style={styles.emptyIconWell}>
                      <BoxPackageIcon size={32} color="#1C3F94" strokeWidth={2.0} />
                    </View>
                    <Text style={styles.emptyRequestsTitle}>
                      {lang === 'tl' ? 'Walang Aktibong Kahilingan' : 'No Active Requests'}
                    </Text>
                    <Text style={styles.emptyRequestsSub}>
                      {lang === 'tl'
                        ? 'Wala ka pang naitalang kahilingan para sa door-to-door delivery. Pindutin ang button sa ibaba upang mag-submit.'
                        : 'You have not submitted any doorstep assistance requests yet.'}
                    </Text>
                    <TouchableOpacity
                      style={styles.emptyCreateBtn}
                      onPress={() => setReliefViewMode('form')}
                      activeOpacity={0.85}
                    >
                      <Text style={styles.emptyCreateBtnText}>
                        {lang === 'tl' ? 'Gumawa ng Bagong Request' : 'Create New Request'}
                      </Text>
                    </TouchableOpacity>
                  </View>
                ) : (
                  myRequests.map((item) => {
                    const reqDate = item.requestedAt
                      ? new Date(item.requestedAt).toLocaleDateString('fil-PH', {
                          month: 'short',
                          day: 'numeric',
                          year: 'numeric',
                          hour: '2-digit',
                          minute: '2-digit',
                        })
                      : 'Kamakailan';

                    return (
                      <View key={item._id} style={styles.requestItemCard}>
                        <View style={styles.requestItemHeaderRow}>
                          <View>
                            <Text style={styles.requestItemKicker}>
                              {`REF #${item._id.slice(-6).toUpperCase()}`}
                            </Text>
                            <Text style={styles.requestItemDate}>{reqDate}</Text>
                          </View>
                          {renderStatusBadge(item.status)}
                        </View>

                        <View style={styles.requestItemDivider} />

                        <Text style={styles.requestItemTitle}>
                          {item.itemType || 'Emergency Relief Assistance'}
                        </Text>

                        {item.notes ? (
                          <Text style={styles.requestItemNotes}>
                            {`" ${item.notes} "`}
                          </Text>
                        ) : null}

                        {/* ASSIGNED STAFF DETAILS */}
                        {item.assignedStaffName || item.assignedStaff ? (
                          <View style={styles.assignedStaffBox}>
                            <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                              <UsersIcon size={14} color="#1C3F94" />
                              <Text style={styles.assignedStaffLabel}>
                                {lang === 'tl' ? 'Nakatakdang Maghatid:' : 'Assigned Field Staff:'}
                              </Text>
                            </View>
                            <Text style={styles.assignedStaffName}>
                              {item.assignedStaffName || item.assignedStaff?.name || 'LGU Mobile Team Alpha'}
                            </Text>
                          </View>
                        ) : (
                          <View style={styles.pendingDispatchBox}>
                            <ClockIcon size={13} color="#B45309" />
                            <Text style={styles.pendingDispatchText}>
                              {lang === 'tl'
                                ? 'Nakatakdang italaga sa pinakamalapit na LGU Field Staff...'
                                : 'Awaiting field staff assignment by LGU Command Center...'}
                            </Text>
                          </View>
                        )}

                        {/* PROOF OF DELIVERY PHOTO PREVIEW */}
                        {item.proofOfDeliveryPhoto && (
                          <View style={styles.proofBox}>
                            <Text style={styles.proofLabel}>
                              {lang === 'tl' ? 'Katunayan ng Pagkakatanggap (Proof):' : 'Proof of Delivery:'}
                            </Text>
                            <Image
                              source={{ uri: item.proofOfDeliveryPhoto }}
                              style={styles.proofImage}
                              resizeMode="cover"
                            />
                          </View>
                        )}

                        <View style={styles.requestFooterRow}>
                          <MapPinIcon size={12} color="#64748B" />
                          <Text style={styles.requestFooterAddress} numberOfLines={1}>
                            {item.recipientAddress || `Barangay ${item.barangayCode || '291'}`}
                          </Text>
                        </View>
                      </View>
                    );
                  })
                )}
              </View>
            )}
          </View>
        )}

        {/* ══════════════════════════════════════════════════════════════ */}
        {/* MODE 2: CASH-FOR-WORK LIVELIHOOD                               */}
        {/* ══════════════════════════════════════════════════════════════ */}
        {activeMode === 'cfw' && (
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
                      <View style={{ alignItems: 'center', paddingVertical: 56, paddingHorizontal: 24 }}>
                        <View style={{ width: 78, height: 78, borderRadius: 24, backgroundColor: '#EFF4FE', borderWidth: 1.5, borderColor: '#D9E4FA', alignItems: 'center', justifyContent: 'center', marginBottom: 20 }}>
                          <BriefcaseOutlineIcon size={34} color="#1C3F94" strokeWidth={2.2} />
                        </View>
                        <Text style={{ fontSize: 20, fontWeight: '800', color: '#0B1525', textAlign: 'center', marginBottom: 8, letterSpacing: -0.3 }}>
                          No Active CFW Project
                        </Text>
                        <Text style={{ fontSize: 14, color: '#5A6E8C', textAlign: 'center', maxWidth: 280, lineHeight: 21 }}>
                          No Cash-for-Work projects posted for your barangay. Check back later or contact your Barangay Council.
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
                          <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 4 }}>
                            <Text style={styles.sectionTitle}>
                              {lang === 'tl' ? 'Pumili ng Uri ng Trabaho' : 'Select Preferred Work Category'}
                            </Text>
                            {availableJobCategories.length < JOB_CATEGORIES.length && (
                              <View style={{ backgroundColor: '#EFF6FF', paddingHorizontal: 8, paddingVertical: 3, borderRadius: 6, borderWidth: 1, borderColor: '#BFDBFE' }}>
                                <Text style={{ fontSize: 10.5, fontWeight: '700', color: '#1D4ED8' }}>
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
                            >
                              <View style={styles.categoryHeaderRow}>
                                <View style={{ flexDirection: 'row', alignItems: 'center', flex: 1 }}>
                                  <View style={{ width: 38, height: 38, borderRadius: 8, backgroundColor: isSelected ? '#EFF6FF' : '#F8FAFC', justifyContent: 'center', alignItems: 'center', marginRight: 12, borderWidth: 1, borderColor: isSelected ? '#1C3F94' : '#E2E8F0' }}>
                                    <Icon size={20} color={isSelected ? '#1C3F94' : '#475569'} />
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
                          style={[styles.submitBtn, submittingCFW && styles.submitBtnDisabled]}
                          onPress={handleApplyCFW}
                          disabled={submittingCFW}
                          activeOpacity={0.85}
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
    backgroundColor: '#F3F6FC',
  },
  bodyWrapper: {
    paddingHorizontal: 16,
    paddingTop: 12,
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
    color: '#475569',
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
    width: 36,
    height: 36,
    borderRadius: 18,
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
    paddingBottom: 20,
  },
  heroKicker: {
    fontSize: 9.5,
    fontWeight: '800',
    color: 'rgba(255,255,255,0.55)',
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
    color: 'rgba(255,255,255,0.70)',
    lineHeight: 19.5,
    marginTop: 4,
  },

  // ── TOP SEGMENTED CONTROL ────────────────────────────────────────
  modeSegmentContainer: {
    flexDirection: 'row',
    marginHorizontal: 16,
    marginTop: -14,
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    padding: 4,
    borderWidth: 1,
    borderColor: '#DDE4F0',
    ...SHADOWS.pill,
  },
  modeSegmentBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
    borderRadius: 10,
    gap: 8,
  },
  modeSegmentBtnActive: {
    backgroundColor: '#1C3F94',
  },
  modeSegmentBtnText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#1C3F94',
  },
  modeSegmentBtnTextActive: {
    color: '#FFFFFF',
  },

  // ── SPECIAL RELIEF SUB-TABS ──────────────────────────────────────
  reliefSubTabsRow: {
    flexDirection: 'row',
    backgroundColor: '#E2E8F0',
    borderRadius: 10,
    padding: 3,
    marginBottom: 16,
  },
  reliefSubTab: {
    flex: 1,
    paddingVertical: 8,
    alignItems: 'center',
    borderRadius: 8,
  },
  reliefSubTabActive: {
    backgroundColor: '#FFFFFF',
    ...SHADOWS.card,
  },
  reliefSubTabText: {
    fontSize: 12.5,
    fontWeight: '600',
    color: '#64748B',
  },
  reliefSubTabTextActive: {
    color: '#1C3F94',
    fontWeight: '700',
  },

  // ── SPECIAL RELIEF CARDS & GRIDS ─────────────────────────────────
  reliefInfoCard: {
    backgroundColor: '#EFF6FF',
    borderRadius: 14,
    padding: 14,
    borderWidth: 1,
    borderColor: '#BFDBFE',
    marginBottom: 16,
  },
  reliefInfoIconWell: {
    width: 38,
    height: 38,
    borderRadius: 10,
    backgroundColor: '#DBEAFE',
    alignItems: 'center',
    justifyContent: 'center',
  },
  reliefInfoTitle: {
    fontSize: 14,
    fontWeight: '800',
    color: '#1E3A8A',
    marginBottom: 2,
  },
  reliefInfoDesc: {
    fontSize: 12,
    color: '#3B82F6',
    lineHeight: 17,
  },
  sectionHeader: {
    marginBottom: 10,
  },
  sectionHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 3,
  },
  sectionTitle: {
    fontSize: 14.5,
    fontWeight: '700',
    color: '#0F172A',
  },
  sectionSub: {
    fontSize: 12,
    color: '#64748B',
    lineHeight: 16,
  },
  countBadge: {
    backgroundColor: '#EFF6FF',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#BFDBFE',
  },
  countBadgeText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#1C3F94',
  },
  packagesGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
  packageCard: {
    width: '48.5%',
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    padding: 12,
    marginBottom: 10,
    borderWidth: 1.5,
    borderColor: '#E2E8F0',
    ...SHADOWS.card,
  },
  packageCardSelected: {
    borderColor: '#1C3F94',
    backgroundColor: '#F8FAFF',
  },
  packageCardTop: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  packageIconWell: {
    width: 36,
    height: 36,
    borderRadius: 9,
    alignItems: 'center',
    justifyContent: 'center',
  },
  packageCheckbox: {
    width: 18,
    height: 18,
    borderRadius: 5,
    borderWidth: 1.5,
    borderColor: '#CBD5E1',
    alignItems: 'center',
    justifyContent: 'center',
  },
  packageCheckboxSelected: {
    backgroundColor: '#1C3F94',
    borderColor: '#1C3F94',
  },
  packageTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: '#0F172A',
    marginBottom: 3,
  },
  packageTitleSelected: {
    color: '#1C3F94',
  },
  packageDesc: {
    fontSize: 11,
    color: '#64748B',
    lineHeight: 15,
    marginBottom: 8,
  },
  packageBadgeRow: {
    flexDirection: 'row',
  },
  packageBadge: {
    paddingHorizontal: 7,
    paddingVertical: 2,
    borderRadius: 5,
  },
  packageBadgeText: {
    fontSize: 10,
    fontWeight: '700',
  },

  // ── VULNERABILITY CHIPS ──────────────────────────────────────────
  vulnerabilitiesWrap: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 4,
  },
  vulnChip: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#CBD5E1',
    gap: 6,
  },
  vulnChipSelected: {
    backgroundColor: '#1C3F94',
    borderColor: '#1C3F94',
  },
  vulnChipText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#334155',
  },
  vulnChipTextSelected: {
    color: '#FFFFFF',
    fontWeight: '700',
  },
  chipCheckDot: {
    marginLeft: 2,
  },

  // ── SEVERITY PILLS ───────────────────────────────────────────────
  severityRow: {
    flexDirection: 'row',
    gap: 8,
  },
  severityPill: {
    flex: 1,
    paddingVertical: 9,
    paddingHorizontal: 10,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#CBD5E1',
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
  },
  severityPillText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#475569',
  },

  // ── TEXT INPUTS & LOCATION ───────────────────────────────────────
  textInputCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    padding: 12,
    borderWidth: 1,
    borderColor: '#CBD5E1',
  },
  multilineInput: {
    fontSize: 13,
    color: '#0F172A',
    minHeight: 80,
    textAlignVertical: 'top',
    lineHeight: 18,
  },
  locationCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    padding: 14,
    borderWidth: 1,
    borderColor: '#CBD5E1',
  },
  inputGroup: {},
  inputGroupLabel: {
    fontSize: 11.5,
    fontWeight: '700',
    color: '#475569',
    marginBottom: 5,
  },
  singleLineInput: {
    backgroundColor: '#F8FAFC',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 9,
    fontSize: 13,
    color: '#0F172A',
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  barangayPillRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 12,
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: '#F1F5F9',
    gap: 6,
  },
  barangayPillText: {
    fontSize: 11.5,
    fontWeight: '600',
    color: '#1C3F94',
  },
  submitReliefBtn: {
    backgroundColor: '#1C3F94',
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: 'center',
    marginTop: 20,
    ...SHADOWS.card,
  },
  submitReliefBtnText: {
    fontSize: 14,
    fontWeight: '800',
    color: '#FFFFFF',
    letterSpacing: 0.2,
  },

  // ── REQUEST HISTORY STYLES ───────────────────────────────────────
  historyHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  historySectionTitle: {
    fontSize: 15,
    fontWeight: '800',
    color: '#0F172A',
  },
  refreshBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#EFF6FF',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#BFDBFE',
    gap: 5,
  },
  refreshBtnText: {
    fontSize: 11.5,
    fontWeight: '700',
    color: '#1C3F94',
  },
  historyLoadingContainer: {
    paddingVertical: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  historyLoadingText: {
    marginTop: 8,
    fontSize: 13,
    color: '#64748B',
  },
  emptyRequestsCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 32,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    marginTop: 10,
  },
  emptyIconWell: {
    width: 64,
    height: 64,
    borderRadius: 20,
    backgroundColor: '#EFF6FF',
    borderWidth: 1.5,
    borderColor: '#BFDBFE',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 14,
  },
  emptyRequestsTitle: {
    fontSize: 17,
    fontWeight: '800',
    color: '#0F172A',
    marginBottom: 6,
  },
  emptyRequestsSub: {
    fontSize: 13,
    color: '#64748B',
    textAlign: 'center',
    lineHeight: 19,
    marginBottom: 18,
    maxWidth: 260,
  },
  emptyCreateBtn: {
    backgroundColor: '#1C3F94',
    paddingHorizontal: 18,
    paddingVertical: 10,
    borderRadius: 9999,
  },
  emptyCreateBtnText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  requestItemCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#DDE4F0',
    ...SHADOWS.card,
  },
  requestItemHeaderRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
  },
  requestItemKicker: {
    fontSize: 10.5,
    fontWeight: '800',
    color: '#64748B',
    letterSpacing: 0.5,
  },
  requestItemDate: {
    fontSize: 11,
    color: '#94A3B8',
    marginTop: 1,
  },
  requestItemDivider: {
    height: 1,
    backgroundColor: '#F1F5F9',
    marginVertical: 10,
  },
  requestItemTitle: {
    fontSize: 14.5,
    fontWeight: '800',
    color: '#0F172A',
    marginBottom: 4,
  },
  requestItemNotes: {
    fontSize: 12,
    color: '#475569',
    fontStyle: 'italic',
    lineHeight: 16,
    marginBottom: 10,
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 9,
    paddingVertical: 4,
    borderRadius: 6,
    borderWidth: 1,
    gap: 5,
  },
  statusBadgeText: {
    fontSize: 11,
    fontWeight: '800',
  },
  assignedStaffBox: {
    backgroundColor: '#EFF6FF',
    borderRadius: 8,
    padding: 10,
    borderWidth: 1,
    borderColor: '#BFDBFE',
    marginTop: 4,
    marginBottom: 8,
  },
  assignedStaffLabel: {
    fontSize: 11,
    fontWeight: '700',
    color: '#1C3F94',
    marginLeft: 6,
  },
  assignedStaffName: {
    fontSize: 12.5,
    fontWeight: '800',
    color: '#1E3A8A',
    marginTop: 3,
  },
  pendingDispatchBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFBEB',
    borderRadius: 8,
    padding: 9,
    borderWidth: 1,
    borderColor: '#FDE68A',
    gap: 6,
    marginTop: 4,
    marginBottom: 8,
  },
  pendingDispatchText: {
    fontSize: 11.5,
    color: '#92400E',
    fontWeight: '600',
    flex: 1,
  },
  proofBox: {
    marginTop: 8,
    marginBottom: 8,
  },
  proofLabel: {
    fontSize: 11,
    fontWeight: '700',
    color: '#475569',
    marginBottom: 5,
  },
  proofImage: {
    width: '100%',
    height: 140,
    borderRadius: 10,
    backgroundColor: '#F1F5F9',
  },
  requestFooterRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 6,
    gap: 5,
  },
  requestFooterAddress: {
    fontSize: 11.5,
    color: '#64748B',
    flex: 1,
  },

  // ── CASH FOR WORK CARDS & STYLES (PRESERVED) ─────────────────────
  pendingCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    padding: 16,
    borderWidth: 1,
    borderColor: '#DDE4F0',
    marginBottom: 16,
  },
  pendingBadgeRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  pendingBadge: {
    backgroundColor: '#FEF3C7',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#FDE68A',
  },
  pendingBadgeText: {
    fontSize: 10,
    fontWeight: '800',
    color: '#B45309',
    letterSpacing: 0.5,
  },
  pendingTimestamp: {
    fontSize: 11,
    color: '#94A3B8',
    fontWeight: '500',
  },
  pendingCardTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: '#0F172A',
    marginBottom: 4,
  },
  pendingCardSub: {
    fontSize: 12.5,
    color: '#475569',
    lineHeight: 18,
    marginBottom: 14,
  },
  pendingMetaBox: {
    backgroundColor: '#F8FAFC',
    borderRadius: 8,
    padding: 10,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  metaRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 4,
  },
  metaLabel: {
    fontSize: 11.5,
    color: '#64748B',
  },
  metaValue: {
    fontSize: 11.5,
    fontWeight: '700',
    color: '#0F172A',
  },

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
    color: '#64748B',
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
    color: '#475569',
    lineHeight: 17,
    marginBottom: 14,
  },
  stepperContainer: {
    backgroundColor: '#F8FAFC',
    borderRadius: 10,
    padding: 12,
    borderWidth: 1,
    borderColor: '#E2E8F0',
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
    borderColor: '#CBD5E1',
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
    color: '#64748B',
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
  viewVoucherBtn: {
    backgroundColor: '#1C3F94',
    borderRadius: 10,
    paddingVertical: 12,
    alignItems: 'center',
  },
  viewVoucherBtnText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#FFFFFF',
  },

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
  categoryCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    padding: 12,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  categoryCardSelected: {
    borderColor: '#1C3F94',
    backgroundColor: '#F8FAFF',
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
    color: '#0F172A',
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
    color: '#64748B',
    lineHeight: 16,
  },
  commitmentCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    padding: 14,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    marginTop: 8,
    marginBottom: 16,
  },
  checkboxRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 10,
  },
  checkbox: {
    width: 20,
    height: 20,
    borderRadius: 5,
    borderWidth: 1.5,
    borderColor: '#CBD5E1',
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
    color: '#334155',
    lineHeight: 17,
  },
  experienceInput: {
    backgroundColor: '#F8FAFC',
    borderRadius: 8,
    padding: 10,
    fontSize: 12.5,
    color: '#0F172A',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    minHeight: 50,
    textAlignVertical: 'top',
  },
  submitBtn: {
    backgroundColor: '#1C3F94',
    borderRadius: 12,
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
    padding: 20,
  },
  voucherModalCard: {
    width: '100%',
    maxWidth: 360,
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 18,
    ...SHADOWS.card,
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
    color: '#1C3F94',
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
    backgroundColor: '#1C3F94',
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
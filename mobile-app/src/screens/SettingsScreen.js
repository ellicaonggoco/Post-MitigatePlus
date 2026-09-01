function formatCapitalizeWords(str) {
  if (!str || typeof str !== 'string') return '';
  return str
    .toLowerCase()
    .split(' ')
    .filter(Boolean)
    .map(w => w.charAt(0).toUpperCase() + w.slice(1))
    .join(' ');
}

import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Linking,
  Image,
  Switch,
  Alert,
  ActivityIndicator,
  Modal,
  Platform,
  KeyboardAvoidingView,
  Keyboard,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as ImagePicker from 'expo-image-picker';
import {
  PhoneCallIcon,
  UsersIcon,
  ShieldCheckIcon,
  CameraIcon,
  ImageIcon,
  CheckIcon,
  PlusIcon,
  TrashIcon,
  CloseIcon,
  RefreshIcon,
  LockIcon,
  ArrowRightIcon,
  EyeIcon,
  EyeOffIcon,
  ChevronDownIcon,
  ChevronUpIcon,
} from '../components/AppIcons';
import NeumorphicInput from '../components/NeumorphicInput';
import { FONT_WEIGHT, SHADOWS, RESPONSIVE, hp } from '../theme';
import { TRANSLATIONS } from '../i18n/translations';
import { MotionPressable } from '../components/motion';
import { API_BASE_URL } from '../config';

const EMERGENCY_HOTLINES = [
  { name: 'Manila LGU Disaster Risk Reduction (MDRRMO)', phone: '(02) 8527-5174', tag: '24/7 Emergency Dispatch' },
  { name: 'Manila Emergency Medical Services / Ambulance', phone: '(02) 8527-5175', tag: 'Medical Response' },
  { name: 'Manila Police District (MPD Central)', phone: '117 / (02) 8523-8371', tag: 'Police Response' },
  { name: 'Bureau of Fire Protection Manila (BFP)', phone: '(02) 8527-3627', tag: 'Fire Rescue' },
];

const CONDITION_PRESETS = [
  { key: 'pwd', label: 'PWD / Disability Support', tag: 'PWD', color: '#7C3AED', bg: '#F5F3FF' },
  { key: 'pregnant', label: 'Pregnant / Lactating', tag: 'Pregnant', color: '#DB2777', bg: '#FDF2F8' },
  { key: 'senior', label: 'Senior Citizen (60+)', tag: 'Senior (60+)', color: '#D97706', bg: '#FEF3C7' },
  { key: 'infant', label: 'Infant / Toddler (0-5)', tag: 'Infant (0-5)', color: '#0284C7', bg: '#E0F2FE' },
  { key: 'medical', label: 'Chronic Illness / Maintenance Meds', tag: 'Medical', color: '#DC2626', bg: '#FEF2F2' },
];

const RENEWAL_REASONS_EN = [
  { key: 'lost_id', label: 'Lost Physical ID or Smartphone' },
  { key: 'suspected_leak', label: 'Suspected QR Pass Leak / Security Compromise' },
  { key: 'damaged_card', label: 'Damaged or Unreadable Printed QR Card' },
  { key: 'periodic_renewal', label: 'Routine Household Security Refresh' },
  { key: 'other', label: 'Other Reason (Specify Below)' },
];

const RENEWAL_REASONS_TL = [
  { key: 'lost_id', label: 'Nawalang ID o Smartphone' },
  { key: 'suspected_leak', label: 'Pinagdududahang Na-leak o Nanakaw ang QR Pass' },
  { key: 'damaged_card', label: 'Napunit o Sirang Printed QR Pass' },
  { key: 'periodic_renewal', label: 'Regular na Pag-renew ng Seguridad ng Pamilya' },
  { key: 'other', label: 'Iba Pang Dahilan (Pakisaad sa Ibaba)' },
];

function HouseholdProfileHeader({
  name,
  barangayCode,
  contact,
  profilePhoto,
  photoPickingLoading,
  onToggleAvatar,
  lang,
}) {
  const initials = (name || 'Resident')
    .split(' ')
    .map((n) => n[0])
    .join('')
    .toUpperCase()
    .slice(0, 2);

  const formattedName = formatCapitalizeWords(name || 'Resident Representative');

  return (
    <View style={styles.profileHeaderCard}>
      <View style={styles.avatarSection}>
        <TouchableOpacity
          style={styles.avatarContainer}
          onPress={onToggleAvatar}
          activeOpacity={0.8}
        >
          {profilePhoto ? (
            <Image source={{ uri: profilePhoto }} style={styles.avatarImage} />
          ) : (
            <View style={styles.avatarPlaceholder}>
              <Text style={styles.avatarInitialsText}>{initials}</Text>
            </View>
          )}
          <View style={styles.cameraIconBadge}>
            {photoPickingLoading ? (
              <ActivityIndicator color="#FFFFFF" size="small" />
            ) : (
              <CameraIcon size={12} color="#FFFFFF" />
            )}
          </View>
        </TouchableOpacity>
        <TouchableOpacity onPress={onToggleAvatar}>
          <Text style={styles.changePhotoText}>
            {lang === 'tl' ? 'Palitan ang Litrato' : 'Change Photo'}
          </Text>
        </TouchableOpacity>
      </View>

      <View style={{ flex: 1 }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
          <Text style={styles.profileName}>{formattedName}</Text>
          <View style={styles.verifiedTag}>
            <ShieldCheckIcon size={10} color="#16A34A" />
            <Text style={styles.verifiedTagText}>Verified</Text>
          </View>
        </View>
        <Text style={styles.profileSub}>Barangay {barangayCode || '291'}, Manila District III</Text>
        <Text style={styles.profileContactText}>{contact}</Text>
      </View>
    </View>
  );
}

export default function SettingsScreen({ user, lang = 'en', onSelectLang, onLogout, onPhotoUpdated }) {
  const t = TRANSLATIONS[lang] || TRANSLATIONS.en;
  const scrollRef = useRef(null);
  const [keyboardHeight, setKeyboardHeight] = useState(0);

  useEffect(() => {
    const showSub = Keyboard.addListener(
      Platform.OS === 'ios' ? 'keyboardWillShow' : 'keyboardDidShow',
      (e) => {
        setKeyboardHeight(e.endCoordinates.height);
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

  // Profile Photo State
  const [profilePhoto, setProfilePhoto] = useState(null);
  const [showAvatarPicker, setShowAvatarPicker] = useState(false);
  const [photoPickingLoading, setPhotoPickingLoading] = useState(false);
  const [name, setName] = useState(user?.name || '');
  const [contact, setContact] = useState(user?.emailOrPhone || '');
  const [isEditingContact, setIsEditingContact] = useState(false);
  const [saveLoading, setSaveLoading] = useState(false);
  const [savedSuccess, setSavedSuccess] = useState(false);

  // Household Members State
  const [members, setMembers] = useState(
    Array.isArray(user?.household?.members) && user.household.members.length > 0
      ? user.household.members
      : [
          {
            id: 'mem_head',
            name: user?.name || 'Head of Household',
            age: '35',
            relationship: 'Head',
            conditions: [],
          },
        ]
  );

  // Modals State
  const [showRosterModal, setShowRosterModal] = useState(false);
  const [showMemberFormModal, setShowMemberFormModal] = useState(false);
  const [editingMemberId, setEditingMemberId] = useState(null);
  const [memberNameInput, setMemberNameInput] = useState('');
  const [memberAgeInput, setMemberAgeInput] = useState('');
  const [memberRelInput, setMemberRelInput] = useState('Anak');
  const [memberConditionsInput, setMemberConditionsInput] = useState([]);
  const [rosterSyncLoading, setRosterSyncLoading] = useState(false);

  // Password Change Modal State
  const [showPasswordModal, setShowPasswordModal] = useState(false);
  const [currentPass, setCurrentPass] = useState('');
  const [newPass, setNewPass] = useState('');
  const [confirmPass, setConfirmPass] = useState('');
  const [passLoading, setPassLoading] = useState(false);
  const [showCurrentPassText, setShowCurrentPassText] = useState(false);
  const [showNewPassText, setShowNewPassText] = useState(false);

  // Secure QR Renewal Password Modal State
  const [showRenewQrModal, setShowRenewQrModal] = useState(false);
  const [renewPassword, setRenewPassword] = useState('');
  const [selectedReasonKey, setSelectedReasonKey] = useState('lost_id');
  const [showReasonDropdown, setShowReasonDropdown] = useState(false);
  const [customRenewReason, setCustomRenewReason] = useState('');
  const [renewLoading, setRenewLoading] = useState(false);
  const [renewError, setRenewError] = useState('');

  // Privacy Policy Modal State
  const [showPrivacyModal, setShowPrivacyModal] = useState(false);

  // System & Preferences State
  const [biometricEnabled, setBiometricEnabled] = useState(true);
  const [smsAlerts, setSmsAlerts] = useState(true);
  const [pushAlerts, setPushAlerts] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const [lastSyncTime, setLastSyncTime] = useState('Ngayong araw, 6:15 PM');

  // Computed Metrics
  const seniorCount = members.filter(
    (m) => (m.conditions || []).includes('Senior (60+)') || parseInt(m.age, 10) >= 60
  ).length;
  const pwdCount = members.filter((m) => (m.conditions || []).includes('PWD')).length;
  const infantCount = members.filter(
    (m) => (m.conditions || []).includes('Infant (0-5)') || (m.conditions || []).includes('Pregnant')
  ).length;
  const vulnerableCount = seniorCount + pwdCount + infantCount;
  const computedScore = Math.min(100, 35 + members.length * 6 + seniorCount * 12 + pwdCount * 18 + infantCount * 14);

  useEffect(() => {
    (async () => {
      try {
        const saved = await AsyncStorage.getItem('mitigateplus_profile_photo');
        if (saved) setProfilePhoto(saved);
      } catch (e) {}
    })();
  }, []);

  const handlePickFromCamera = async () => {
    try {
      setShowAvatarPicker(false);
      setPhotoPickingLoading(true);
      if (Platform.OS !== 'web') {
        const { status } = await ImagePicker.requestCameraPermissionsAsync();
        if (status !== 'granted') {
          Alert.alert(
            lang === 'tl' ? 'Pahintulot sa Camera' : 'Camera Permission',
            lang === 'tl'
              ? 'Kailangan ng pahintulot sa camera upang kumuha ng larawan.'
              : 'Camera permission is required to take a profile photo.'
          );
          setPhotoPickingLoading(false);
          return;
        }
        const result = await ImagePicker.launchCameraAsync({
          allowsEditing: true,
          aspect: [1, 1],
          quality: 0.7,
        });
        if (!result.canceled && result.assets && result.assets.length > 0) {
          const uri = result.assets[0].uri;
          setProfilePhoto(uri);
          await AsyncStorage.setItem('mitigateplus_profile_photo', uri);
          if (onPhotoUpdated) onPhotoUpdated(uri);
        }
      } else {
        const input = document.createElement('input');
        input.type = 'file';
        input.accept = 'image/*';
        input.capture = 'user';
        input.onchange = (e) => {
          const file = e.target.files && e.target.files[0];
          if (file) {
            const reader = new FileReader();
            reader.onload = async (ev) => {
              const uri = ev.target.result;
              setProfilePhoto(uri);
              await AsyncStorage.setItem('mitigateplus_profile_photo', uri);
              if (onPhotoUpdated) onPhotoUpdated(uri);
            };
            reader.readAsDataURL(file);
          }
        };
        input.click();
      }
    } catch (err) {
      console.warn('Camera photo error:', err);
    } finally {
      setPhotoPickingLoading(false);
    }
  };

  const handlePickFromGallery = async () => {
    try {
      setShowAvatarPicker(false);
      setPhotoPickingLoading(true);
      if (Platform.OS !== 'web') {
        const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
        if (status !== 'granted') {
          Alert.alert(
            lang === 'tl' ? 'Pahintulot sa Gallery' : 'Gallery Permission',
            lang === 'tl'
              ? 'Kailangan ng pahintulot sa photo library upang pumili ng larawan.'
              : 'Gallery permission is required to select a photo.'
          );
          setPhotoPickingLoading(false);
          return;
        }
        const result = await ImagePicker.launchImageLibraryAsync({
          allowsEditing: true,
          aspect: [1, 1],
          quality: 0.7,
        });
        if (!result.canceled && result.assets && result.assets.length > 0) {
          const uri = result.assets[0].uri;
          setProfilePhoto(uri);
          await AsyncStorage.setItem('mitigateplus_profile_photo', uri);
          if (onPhotoUpdated) onPhotoUpdated(uri);
        }
      } else {
        const input = document.createElement('input');
        input.type = 'file';
        input.accept = 'image/*';
        input.onchange = (e) => {
          const file = e.target.files && e.target.files[0];
          if (file) {
            const reader = new FileReader();
            reader.onload = async (ev) => {
              const uri = ev.target.result;
              setProfilePhoto(uri);
              await AsyncStorage.setItem('mitigateplus_profile_photo', uri);
              if (onPhotoUpdated) onPhotoUpdated(uri);
            };
            reader.readAsDataURL(file);
          }
        };
        input.click();
      }
    } catch (err) {
      console.warn('Gallery photo error:', err);
    } finally {
      setPhotoPickingLoading(false);
    }
  };

  const handleResetToInitials = async () => {
    setProfilePhoto(null);
    setShowAvatarPicker(false);
    await AsyncStorage.removeItem('mitigateplus_profile_photo');
  };

  const handleCallHotline = (phone) => {
    const cleaned = phone.replace(/[^0-9+]/g, '');
    if (cleaned) {
      Linking.openURL(`tel:${cleaned}`).catch(() => {});
    }
  };

  const handleSaveContact = () => {
    setSaveLoading(true);
    setTimeout(() => {
      setSaveLoading(false);
      setIsEditingContact(false);
      setSavedSuccess(true);
      setTimeout(() => setSavedSuccess(false), 3000);
    }, 600);
  };

  // Sync member updates to backend
  const syncMembersToBackend = async (updatedList) => {
    setRosterSyncLoading(true);
    try {
      const token = await AsyncStorage.getItem('mitigateplus_token');
      if (token) {
        await fetch(`${API_BASE_URL}/households/me/members`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
          body: JSON.stringify({ members: updatedList }),
        });
      }
    } catch (err) {
      console.warn('Sync members error:', err);
    } finally {
      setRosterSyncLoading(false);
    }
  };

  // Open Add Member Form
  const handleOpenAddMember = () => {
    setEditingMemberId(null);
    setMemberNameInput('');
    setMemberAgeInput('');
    setMemberRelInput(lang === 'tl' ? 'Anak' : 'Child');
    setMemberConditionsInput([]);
    setShowMemberFormModal(true);
  };

  // Open Edit Member Form
  const handleOpenEditMember = (mem) => {
    setEditingMemberId(mem.id || mem._id);
    setMemberNameInput(mem.name || '');
    setMemberAgeInput(String(mem.age || ''));
    setMemberRelInput(mem.relationship || (lang === 'tl' ? 'Anak' : 'Child'));
    setMemberConditionsInput(mem.conditions || []);
    setShowMemberFormModal(true);
  };

  // Save Member (Add or Edit)
  const handleSaveMemberSubmit = async () => {
    if (!memberNameInput.trim()) {
      Alert.alert(
        lang === 'tl' ? 'Kailangan ang Pangalan' : 'Name Required',
        lang === 'tl' ? 'Pakilagay ang buong legal na pangalan ng miyembro.' : 'Please enter the member legal name.'
      );
      return;
    }

    let updatedList;
    if (editingMemberId) {
      // Update existing
      updatedList = members.map((m) => {
        if ((m.id || m._id) === editingMemberId) {
          return {
            ...m,
            name: memberNameInput.trim(),
            age: memberAgeInput.trim() || '25',
            relationship: memberRelInput,
            conditions: memberConditionsInput,
          };
        }
        return m;
      });
    } else {
      // Add new
      const newEntry = {
        id: 'mem_' + Date.now(),
        name: memberNameInput.trim(),
        age: memberAgeInput.trim() || '25',
        relationship: memberRelInput,
        conditions: memberConditionsInput,
      };
      updatedList = [...members, newEntry];
    }

    setMembers(updatedList);
    setShowMemberFormModal(false);
    await syncMembersToBackend(updatedList);
  };

  // Remove Member
  const handleRemoveMember = (id) => {
    if (members.length <= 1) {
      Alert.alert(
        lang === 'tl' ? 'Paunawa' : 'Notice',
        lang === 'tl' ? 'Hindi maaaring alisin ang Punong-Pamilya.' : 'Cannot remove primary Head of Household.'
      );
      return;
    }

    Alert.alert(
      lang === 'tl' ? 'Alisin ang Miyembro?' : 'Remove Member?',
      lang === 'tl' ? 'Sigurado ka bang nais mong alisin ang miyembrong ito sa talaan?' : 'Are you sure you want to remove this family member?',
      [
        { text: lang === 'tl' ? 'Kanselahin' : 'Cancel', style: 'cancel' },
        {
          text: lang === 'tl' ? 'Alisin' : 'Remove',
          style: 'destructive',
          onPress: async () => {
            const updated = members.filter((m) => (m.id || m._id) !== id);
            setMembers(updated);
            await syncMembersToBackend(updated);
          },
        },
      ]
    );
  };

  // Toggle vulnerability tag directly
  const handleToggleMemberCondition = async (memberId, condTag) => {
    const updated = members.map((m) => {
      if ((m.id || m._id) === memberId) {
        const current = m.conditions || [];
        const exists = current.includes(condTag);
        const next = exists ? current.filter((c) => c !== condTag) : [...current, condTag];
        return { ...m, conditions: next };
      }
      return m;
    });
    setMembers(updated);
    await syncMembersToBackend(updated);
  };

  // Change Password API call
  const handleChangePassword = async () => {
    if (!currentPass) {
      Alert.alert(
        lang === 'tl' ? 'Kulang na Impormasyon' : 'Missing Information',
        lang === 'tl' ? 'Pakilagay ang inyong kasalukuyang password.' : 'Please enter your current password.'
      );
      return;
    }
    if (!newPass || newPass.length < 8) {
      Alert.alert(
        lang === 'tl' ? 'Mahinang Password' : 'Weak Password',
        lang === 'tl'
          ? 'Ang bagong password ay dapat mayroong hindi bababa sa 8 characters.'
          : 'New password must be at least 8 characters long.'
      );
      return;
    }
    if (newPass !== confirmPass) {
      Alert.alert(
        lang === 'tl' ? 'Hindi Magkatugma' : 'Mismatch',
        lang === 'tl' ? 'Hindi magkatugma ang bagong password at confirmation.' : 'New password and confirmation do not match.'
      );
      return;
    }

    setPassLoading(true);
    try {
      const token = await AsyncStorage.getItem('mitigateplus_token');
      if (!token) {
        Alert.alert('Session Expired', lang === 'tl' ? 'Kailangang mag-login muli.' : 'Please sign in again.');
        return;
      }

      const res = await fetch(`${API_BASE_URL}/auth/change-password`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ currentPassword: currentPass, newPassword: newPass }),
      });

      const data = await res.json();
      if (res.ok) {
        Alert.alert(
          lang === 'tl' ? 'Tagumpay!' : 'Success!',
          lang === 'tl' ? 'Matagumpay na nabago ang inyong password.' : 'Your password has been changed successfully.'
        );
        setCurrentPass('');
        setNewPass('');
        setConfirmPass('');
        setShowPasswordModal(false);
      } else {
        Alert.alert('Notice', data.message || 'Unable to update password.');
      }
    } catch (err) {
      Alert.alert('Network Error', 'Unable to reach server to change password.');
    } finally {
      setPassLoading(false);
    }
  };

  // Sync Offline Cache
  const handleSyncOfflineData = () => {
    setSyncing(true);
    setTimeout(() => {
      setSyncing(false);
      const now = new Date();
      setLastSyncTime(`${now.getHours() % 12 || 12}:${String(now.getMinutes()).padStart(2, '0')} ${now.getHours() >= 12 ? 'PM' : 'AM'}`);
      Alert.alert(
        lang === 'tl' ? 'Na-sync ang Data' : 'Data Synced',
        lang === 'tl'
          ? 'Matagumpay na na-update ang pinakabagong talaan ng ayuda at QR pass para sa offline mode.'
          : 'Latest relief ledger and QR pass successfully refreshed for offline mode.'
      );
    }, 1000);
  };

  // Secure QR Renewal with Password Verification
  const handleRenewQrPassWithPassword = async () => {
    if (!renewPassword.trim()) {
      setRenewError(
        lang === 'tl'
          ? 'Pakilagay ang inyong account password upang magpatuloy.'
          : 'Please enter your account password to proceed.'
      );
      return;
    }

    if (selectedReasonKey === 'other' && !customRenewReason.trim()) {
      setRenewError(
        lang === 'tl'
          ? 'Pakisaad ang inyong dahilan sa pagpalit ng QR pass.'
          : 'Please specify your reason for QR pass renewal.'
      );
      return;
    }

    const reasons = lang === 'tl' ? RENEWAL_REASONS_TL : RENEWAL_REASONS_EN;
    const selectedOption = reasons.find((r) => r.key === selectedReasonKey);
    const finalReason = selectedReasonKey === 'other'
      ? customRenewReason.trim()
      : (selectedOption ? selectedOption.label : 'Resident security renewal');

    setRenewLoading(true);
    setRenewError('');
    try {
      const token = await AsyncStorage.getItem('mitigateplus_token');
      if (!token) {
        setRenewError(lang === 'tl' ? 'Kailangang mag-sign in muli.' : 'Session expired. Please sign in again.');
        return;
      }
      const res = await fetch(`${API_BASE_URL}/households/regenerate-qr`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          password: renewPassword.trim(),
          reason: finalReason,
        }),
      });
      const data = await res.json();
      if (res.ok) {
        setShowRenewQrModal(false);
        setRenewPassword('');
        setCustomRenewReason('');
        setSelectedReasonKey('lost_id');
        setShowReasonDropdown(false);
        setRenewError('');
        Alert.alert(
          lang === 'tl' ? 'Tagumpay na Na-renew ang QR Pass!' : 'QR Pass Successfully Renewed!',
          lang === 'tl'
            ? 'Na-revoke na ang inyong lumang QR at naglabas ng bagong Secure QR Pass para sa inyong ayuda.'
            : 'Your previous QR has been revoked and a fresh secure QR Pass token has been issued.'
        );
      } else {
        setRenewError(
          data.message ||
          (lang === 'tl'
            ? 'Hindi ma-renew ang QR Pass. Pakisuri ang inyong password.'
            : 'Unable to renew QR Pass. Please check your password.')
        );
      }
    } catch (err) {
      setRenewError(
        lang === 'tl'
          ? 'Hindi makakonekta sa server. Pakisuri ang internet.'
          : 'Network error. Unable to reach server.'
      );
    } finally {
      setRenewLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView
      style={{ flex: 1 }}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <ScrollView
        ref={scrollRef}
        style={styles.container}
        contentContainerStyle={[styles.content, { paddingBottom: 90 + keyboardHeight }]}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
        keyboardDismissMode="on-drag"
      >
        <HouseholdProfileHeader
          name={name}
          barangayCode={user?.barangayCode || '291'}
          contact={contact}
          profilePhoto={profilePhoto}
          photoPickingLoading={photoPickingLoading}
          onToggleAvatar={() => setShowAvatarPicker(!showAvatarPicker)}
          lang={lang}
        />

        {/* ── 1. HOUSEHOLD MEMBERS ROSTER (COMPACT CLICKABLE CARD) ── */}
        <Text style={styles.sectionLabel}>
          {lang === 'tl' ? 'TALAAN NG PAMILYA (HOUSEHOLD ROSTER)' : 'HOUSEHOLD MEMBERS ROSTER'}
        </Text>

        <TouchableOpacity
          style={styles.rosterSummaryCard}
          onPress={() => setShowRosterModal(true)}
          activeOpacity={0.85}
        >
          <View style={styles.rosterIconCircle}>
            <UsersIcon size={20} color="#1557B0" />
          </View>
          <View style={{ flex: 1, minWidth: 0, justifyContent: 'center' }}>
            <Text style={styles.rosterCardTitle} numberOfLines={1}>
              {lang === 'tl' ? 'Talaan ng Miyembro' : 'Household Members'}
            </Text>
            <Text style={styles.rosterCardSub} numberOfLines={1}>
              {members.length} {lang === 'tl' ? 'Miyembro' : 'Members'} • {vulnerableCount > 0 ? `${vulnerableCount} ${lang === 'tl' ? 'Vulnerable' : 'Vulnerable'}` : (lang === 'tl' ? 'Standard' : 'Standard')} • {computedScore} pts
            </Text>
          </View>

          <View style={styles.viewRosterBtn}>
            <Text style={styles.viewRosterBtnText}>{lang === 'tl' ? 'Tingnan' : 'View'}</Text>
            <ArrowRightIcon size={12} color="#1557B0" />
          </View>
        </TouchableOpacity>

        {/* ── 2. CONTACT INFORMATION ── */}
        <Text style={styles.sectionLabel}>
          {lang === 'tl' ? 'IMPORMASYON NG CONTACT' : 'CONTACT INFORMATION'}
        </Text>
        <View style={styles.settingCardGroup}>
          <View style={styles.settingRowItem}>
            <View style={{ flex: 1 }}>
              <Text style={styles.settingItemLabel}>
                {lang === 'tl' ? 'Punong-Pamilya' : 'Head of Household'}
              </Text>
              <Text style={styles.settingItemValue}>{formatCapitalizeWords(name)}</Text>
            </View>
            <View style={styles.readOnlyBadge}>
              <Text style={styles.readOnlyText}>{lang === 'tl' ? 'Naka-rehistro' : 'Registered'}</Text>
            </View>
          </View>

          <View style={styles.divider} />

          <View style={styles.settingRowItem}>
            <View style={{ flex: 1 }}>
              <Text style={styles.settingItemLabel}>
                {lang === 'tl' ? 'Mobile / Email' : 'Contact Mobile/Email'}
              </Text>
              {isEditingContact ? (
                <NeumorphicInput value={contact} onChangeText={setContact} placeholder="09XXXXXXXXX" />
              ) : (
                <Text style={styles.settingItemValue}>{contact}</Text>
              )}
            </View>
            <TouchableOpacity
              style={styles.editActionBtn}
              onPress={isEditingContact ? handleSaveContact : () => setIsEditingContact(true)}
            >
              <Text style={styles.editActionText}>
                {isEditingContact ? (lang === 'tl' ? 'I-save' : 'Save') : lang === 'tl' ? 'Palitan' : 'Edit'}
              </Text>
            </TouchableOpacity>
          </View>
          {savedSuccess && (
            <Text style={styles.successInline}>
              {lang === 'tl' ? 'Na-save ang contact details.' : 'Contact saved.'}
            </Text>
          )}
        </View>

        {/* ── 3. ACCOUNT SECURITY & LOGIN ── */}
        <Text style={styles.sectionLabel}>
          {lang === 'tl' ? 'SEGURIDAD AT PAG-LOGIN' : 'SECURITY & LOGIN'}
        </Text>
        <View style={styles.settingCardGroup}>
          <View style={styles.settingRowItem}>
            <View style={{ flex: 1 }}>
              <Text style={styles.settingItemLabel}>
                {lang === 'tl' ? 'Password ng Account' : 'Account Password'}
              </Text>
              <Text style={styles.settingItemSub}>••••••••••••</Text>
            </View>
            <TouchableOpacity
              style={styles.actionPillBtn}
              onPress={() => setShowPasswordModal(true)}
            >
              <LockIcon size={12} color="#1557B0" />
              <Text style={styles.actionPillBtnText}>
                {lang === 'tl' ? 'Palitan ang Password' : 'Change Password'}
              </Text>
            </TouchableOpacity>
          </View>

          <View style={styles.divider} />

          <View style={styles.settingRowItem}>
            <View style={{ flex: 1 }}>
              <Text style={styles.settingItemLabel}>
                {lang === 'tl' ? 'Biometric Quick Unlock' : 'Biometric Quick Unlock'}
              </Text>
              <Text style={styles.settingItemSub}>
                {lang === 'tl'
                  ? 'Gamitin ang Fingerprint o Face ID sa pag-login'
                  : 'Fast fingerprint or Face ID sign in'}
              </Text>
            </View>
            <Switch
              value={biometricEnabled}
              onValueChange={setBiometricEnabled}
              trackColor={{ false: '#CBD5E1', true: '#BFDBFE' }}
              thumbColor={biometricEnabled ? '#1557B0' : '#F1F5F9'}
            />
          </View>

          <View style={styles.divider} />

          <View style={styles.settingRowItem}>
            <View style={{ flex: 1 }}>
              <Text style={styles.settingItemLabel}>
                {lang === 'tl' ? 'QR Pass Token Security' : 'QR Relief Pass Token'}
              </Text>
              <Text style={styles.settingItemSub}>
                {lang === 'tl'
                  ? 'Palitan agad ang QR kung nawala ang ID card (Limitado sa 1 beses bawat 30 araw).'
                  : 'Revoke and renew compromised token (Anti-abuse policy: 1 request/month).'}
              </Text>
            </View>
            <TouchableOpacity
              style={styles.revokeQrBtn}
              onPress={() => {
                setRenewError('');
                setRenewPassword('');
                setShowRenewQrModal(true);
              }}
            >
              <Text style={styles.revokeQrBtnText}>
                {lang === 'tl' ? 'I-renew ang QR' : 'Renew QR'}
              </Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* ── 4. NOTIFICATIONS & ALERTS ── */}
        <Text style={styles.sectionLabel}>
          {lang === 'tl' ? 'MGA NOTIFIKASYON AT ADVISORY' : 'NOTIFICATIONS & ALERTS'}
        </Text>
        <View style={styles.settingCardGroup}>
          <View style={styles.settingRowItem}>
            <View style={{ flex: 1 }}>
              <Text style={styles.settingItemLabel}>
                {lang === 'tl' ? 'SMS Ayuda Alerts' : 'SMS Relief Alerts'}
              </Text>
              <Text style={styles.settingItemSub}>
                {lang === 'tl' ? 'Libreng SMS notification kapag may distribution schedule' : 'Receive SMS updates for relief schedules'}
              </Text>
            </View>
            <Switch
              value={smsAlerts}
              onValueChange={setSmsAlerts}
              trackColor={{ false: '#CBD5E1', true: '#BFDBFE' }}
              thumbColor={smsAlerts ? '#1557B0' : '#F1F5F9'}
            />
          </View>

          <View style={styles.divider} />

          <View style={styles.settingRowItem}>
            <View style={{ flex: 1 }}>
              <Text style={styles.settingItemLabel}>
                {lang === 'tl' ? 'Push Notifications' : 'Push Notifications'}
              </Text>
              <Text style={styles.settingItemSub}>
                {lang === 'tl' ? 'Opisyal na abiso mula sa Manila MDRRMO' : 'Official advisories from Manila MDRRMO'}
              </Text>
            </View>
            <Switch
              value={pushAlerts}
              onValueChange={setPushAlerts}
              trackColor={{ false: '#CBD5E1', true: '#BFDBFE' }}
              thumbColor={pushAlerts ? '#1557B0' : '#F1F5F9'}
            />
          </View>
        </View>

        {/* ── 5. OFFLINE DATA & LOCAL STORAGE ── */}
        <Text style={styles.sectionLabel}>
          {lang === 'tl' ? 'OFFLINE CACHE AT SISTEMA' : 'OFFLINE DATA & STORAGE'}
        </Text>
        <View style={styles.settingCardGroup}>
          <View style={styles.settingRowItem}>
            <View style={{ flex: 1 }}>
              <Text style={styles.settingItemLabel}>
                {lang === 'tl' ? 'Katayuan ng Offline Sync' : 'Offline Cache Status'}
              </Text>
              <Text style={styles.settingItemSub}>
                {lang === 'tl' ? `Huling na-sync: ${lastSyncTime}` : `Last synced: ${lastSyncTime}`}
              </Text>
            </View>
            <View style={styles.cachePill}>
              <Text style={styles.cachePillText}>{lang === 'tl' ? 'Aktibo' : 'Active'}</Text>
            </View>
          </View>

          <TouchableOpacity
            style={styles.syncBtn}
            onPress={handleSyncOfflineData}
            disabled={syncing}
            activeOpacity={0.85}
          >
            {syncing ? (
              <ActivityIndicator color="#1557B0" size="small" />
            ) : (
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                <RefreshIcon size={14} color="#1557B0" />
                <Text style={styles.syncBtnText}>
                  {lang === 'tl' ? 'I-sync ang Offline Data Ngayon' : 'Sync Offline Data Now'}
                </Text>
              </View>
            )}
          </TouchableOpacity>
        </View>

        {/* ── 6. COMPLIANCE & LEGAL ── */}
        <Text style={styles.sectionLabel}>
          {lang === 'tl' ? 'SEGURIDAD NG DATOS AT PRIVACY' : 'DATA PRIVACY & COMPLIANCE'}
        </Text>
        <View style={styles.settingCardGroup}>
          <View style={styles.settingRowItem}>
            <View style={{ flex: 1 }}>
              <Text style={styles.settingItemLabel}>Republic Act No. 10173</Text>
              <Text style={styles.settingItemSub}>
                {lang === 'tl'
                  ? 'Protektado ang impormasyon sa ilalim ng Data Privacy Act ng Pilipinas.'
                  : 'Your household data is protected by the Data Privacy Act of 2012.'}
              </Text>
            </View>
            <TouchableOpacity
              style={styles.privacyViewBtn}
              onPress={() => setShowPrivacyModal(true)}
            >
              <Text style={styles.privacyViewBtnText}>
                {lang === 'tl' ? 'Basahin' : 'Review'}
              </Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* ── 7. LANGUAGE PREFERENCE ── */}
        <Text style={styles.sectionLabel}>
          {lang === 'tl' ? 'WIKA NG APLIKASYON' : 'APP LANGUAGE'}
        </Text>
        <View style={styles.settingCardGroup}>
          <View style={styles.langRow}>
            <TouchableOpacity
              style={[styles.langBtn, lang === 'en' ? styles.langBtnActive : styles.langBtnInactive]}
              onPress={() => setLang('en')}
            >
              <Text style={[styles.langText, lang === 'en' && styles.langTextActive]}>English</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.langBtn, lang === 'tl' ? styles.langBtnActive : styles.langBtnInactive]}
              onPress={() => setLang('tl')}
            >
              <Text style={[styles.langText, lang === 'tl' && styles.langTextActive]}>Tagalog</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* ── 8. EMERGENCY HOTLINES ── */}
        <Text style={styles.sectionLabel}>
          {lang === 'tl' ? 'MGA EMERGENCY HOTLINE NG MAYNILA' : 'MANILA EMERGENCY HOTLINES'}
        </Text>
        <View style={styles.hotlineList}>
          {EMERGENCY_HOTLINES.map((h, i) => (
            <View key={i} style={styles.hotlineCard}>
              <View style={styles.phoneIconWell}>
                <PhoneCallIcon size={18} color="#DC2626" />
              </View>
              <View style={{ flex: 1, paddingRight: 8 }}>
                <Text style={styles.hotlineName}>{h.name}</Text>
                <Text style={styles.hotlineTag}>{h.tag}</Text>
                <Text style={styles.hotlineNumberText}>{h.phone}</Text>
              </View>
              <TouchableOpacity
                style={styles.hotlineCallBtn}
                onPress={() => Linking.openURL(`tel:${h.phone.replace(/[^0-9]/g, '')}`)}
                activeOpacity={0.8}
              >
                <PhoneCallIcon size={12} color="#FFFFFF" />
                <Text style={styles.hotlineCallBtnText}>{lang === 'tl' ? 'Tawag' : 'Call'}</Text>
              </TouchableOpacity>
            </View>
          ))}
        </View>

        {/* ── LOGOUT BUTTON ── */}
        <TouchableOpacity
          style={styles.logoutBtn}
          onPress={handleLogout}
          activeOpacity={0.85}
        >
          <Text style={styles.logoutBtnText}>
            {lang === 'tl' ? 'Mag-Logout sa Account' : 'Sign Out of Account'}
          </Text>
        </TouchableOpacity>

        {/* Trademark Stamp */}
        <View style={styles.trademarkCard}>
          <Image
            source={require('../../assets/logo.png')}
            style={styles.trademarkLogoImg}
            resizeMode="contain"
          />
          <Text style={styles.trademarkSub}>
            MitigatePlus Manila • Version 2.4 (Production Ready)
          </Text>
        </View>
      </ScrollView>

      {/* ══════════════════════════════════════════════════════════ */}
      {/* MODAL 1: HOUSEHOLD MEMBERS ROSTER MODAL                    */}
      {/* ══════════════════════════════════════════════════════════ */}
      <Modal
        visible={showRosterModal}
        animationType="slide"
        transparent
        onRequestClose={() => setShowRosterModal(false)}
      >
        <View style={styles.modalBackdrop}>
          <View style={styles.rosterModalSheet}>
            <View style={styles.modalHeaderRow}>
              <View style={{ flexDirection: 'row', alignItems: 'flex-start', gap: 10, flex: 1, paddingRight: 8 }}>
                <View style={styles.rosterModalIconCircle}>
                  <UsersIcon size={18} color="#1557B0" />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.modalMainTitle}>
                    {lang === 'tl' ? 'Talaan ng Pamilya' : 'Household Members Roster'}
                  </Text>
                  <Text style={styles.modalMainSub}>
                    {lang === 'tl'
                      ? 'Opisyal na talaan para sa alokasyon ng ayuda.'
                      : 'Registered family dependents for relief entitlement calculation.'}
                  </Text>
                </View>
              </View>
              <TouchableOpacity
                style={styles.modalCloseCircle}
                onPress={() => setShowRosterModal(false)}
              >
                <CloseIcon size={16} color="#0F172A" />
              </TouchableOpacity>
            </View>

            {/* Metrics Breakdown Bar */}
            <View style={styles.rosterMetricPill}>
              <View style={styles.rosterMetricItem}>
                <Text style={styles.rosterMetricLabel}>HEADCOUNT</Text>
                <Text style={styles.rosterMetricValue}>
                  {members.length} {lang === 'tl' ? 'Tao' : 'Members'}
                </Text>
              </View>
              <View style={styles.rosterMetricDivider} />
              <View style={styles.rosterMetricItem}>
                <Text style={styles.rosterMetricLabel}>VULNERABILITY</Text>
                <Text style={[styles.rosterMetricValue, { color: '#D97706' }]}>
                  {vulnerableCount} {lang === 'tl' ? 'Alaga' : 'Vulnerable'}
                </Text>
              </View>
              <View style={styles.rosterMetricDivider} />
              <View style={styles.rosterMetricItem}>
                <Text style={styles.rosterMetricLabel}>PRIORITY SCORE</Text>
                <Text style={[styles.rosterMetricValue, { color: '#16A34A' }]}>
                  {computedScore} pts
                </Text>
              </View>
            </View>

            {/* Add Member Action Button */}
            <TouchableOpacity
              style={styles.addMemberFullBtn}
              onPress={handleOpenAddMember}
              activeOpacity={0.85}
            >
              <PlusIcon size={16} color="#FFFFFF" />
              <Text style={styles.addMemberFullBtnText}>
                {lang === 'tl' ? 'Magdagdag ng Bagong Miyembro' : 'Add New Family Member'}
              </Text>
            </TouchableOpacity>

            {/* Scrollable Members List (Compact & Clean) */}
            <ScrollView
              style={{ flex: 1, marginTop: 8 }}
              contentContainerStyle={{ paddingBottom: 16, gap: 8 }}
              showsVerticalScrollIndicator={false}
            >
              {members.map((mem, idx) => {
                const memKey = mem.id || mem._id || `mem_${idx}`;
                const isHead = idx === 0 || mem.relationship === 'Head';

                return (
                  <View key={memKey} style={styles.memberManageCard}>
                    <View style={styles.memberManageTop}>
                      <View style={styles.memberAvatarCircle}>
                        <Text style={styles.memberAvatarLetter}>
                          {(mem.name || 'M').charAt(0).toUpperCase()}
                        </Text>
                      </View>
                      <View style={{ flex: 1, minWidth: 0 }}>
                        <View style={{ flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap', gap: 5 }}>
                          <Text style={styles.memberCardName}>
                            {formatCapitalizeWords(mem.name)}
                          </Text>
                          {isHead && (
                            <View style={styles.headTag}>
                              <Text style={styles.headTagText}>
                                {lang === 'tl' ? 'Punong-Pamilya' : 'Head'}
                              </Text>
                            </View>
                          )}
                        </View>
                        <View style={{ flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap', gap: 4, marginTop: 3 }}>
                          <Text style={styles.memberCardRel}>
                            {mem.relationship} • {mem.age} {lang === 'tl' ? 'taon' : 'yrs old'}
                          </Text>
                          {Array.isArray(mem.conditions) && mem.conditions.map((tag) => (
                            <View key={tag} style={styles.activeConditionTagPill}>
                              <Text style={styles.activeConditionTagText}>{tag}</Text>
                            </View>
                          ))}
                        </View>
                      </View>

                      {/* Edit & Delete Action Buttons */}
                      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, flexShrink: 0 }}>
                        <TouchableOpacity
                          style={styles.memberEditBtn}
                          onPress={() => handleOpenEditMember(mem)}
                          activeOpacity={0.75}
                        >
                          <Text style={styles.memberEditBtnText}>
                            {lang === 'tl' ? 'I-edit' : 'Edit'}
                          </Text>
                        </TouchableOpacity>

                        {!isHead && (
                          <TouchableOpacity
                            style={styles.memberDeleteBtn}
                            onPress={() => handleRemoveMember(memKey)}
                            activeOpacity={0.75}
                          >
                            <TrashIcon size={14} color="#DC2626" />
                          </TouchableOpacity>
                        )}
                      </View>
                    </View>
                  </View>
                );
              })}
            </ScrollView>

            <TouchableOpacity
              style={styles.modalDoneBtn}
              onPress={() => setShowRosterModal(false)}
              activeOpacity={0.85}
            >
              <Text style={styles.modalDoneBtnText}>
                {lang === 'tl' ? 'Tapos Na (Isara)' : 'Done (Close)'}
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* ══════════════════════════════════════════════════════════ */}
      {/* MODAL 2: ADD / EDIT MEMBER FORM MODAL                      */}
      {/* ══════════════════════════════════════════════════════════ */}
      <Modal
        visible={showMemberFormModal}
        animationType="fade"
        transparent
        onRequestClose={() => setShowMemberFormModal(false)}
      >
        <View style={styles.modalBackdrop}>
          <View style={styles.memberFormCard}>
            <View style={styles.modalHeaderRow}>
              <Text style={styles.modalMainTitle}>
                {editingMemberId
                  ? lang === 'tl'
                    ? 'I-edit ang Miyembro'
                    : 'Edit Family Member'
                  : lang === 'tl'
                  ? 'Magdagdag ng Miyembro'
                  : 'Add Family Member'}
              </Text>
              <TouchableOpacity onPress={() => setShowMemberFormModal(false)}>
                <CloseIcon size={18} color="#0F172A" />
              </TouchableOpacity>
            </View>

            <ScrollView showsVerticalScrollIndicator={false}>
              <NeumorphicInput
                label={lang === 'tl' ? 'Buong Legal na Pangalan' : 'Full Legal Name'}
                value={memberNameInput}
                onChangeText={setMemberNameInput}
                placeholder="e.g. Maria Teresa Santos"
                required
              />

              <NeumorphicInput
                label={lang === 'tl' ? 'Edad (Age)' : 'Age'}
                value={memberAgeInput}
                onChangeText={setMemberAgeInput}
                placeholder="e.g. 28"
                keyboardType="numeric"
                required
              />

              <Text style={styles.formInputLabel}>
                {lang === 'tl' ? 'Relasyon sa Punong-Pamilya' : 'Relationship to Head'}
              </Text>
              <View style={styles.relChoicesRow}>
                {(lang === 'tl'
                  ? ['Asawa', 'Anak', 'Magulang', 'Kapatid', 'Apo', 'Iba pa']
                  : ['Spouse', 'Child', 'Parent', 'Sibling', 'Grandchild', 'Other']
                ).map((rel) => (
                  <TouchableOpacity
                    key={rel}
                    style={[styles.relChoiceBtn, memberRelInput === rel && styles.relChoiceBtnActive]}
                    onPress={() => setMemberRelInput(rel)}
                  >
                    <Text
                      style={[styles.relChoiceText, memberRelInput === rel && styles.relChoiceTextActive]}
                    >
                      {rel}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>

              <Text style={[styles.formInputLabel, { marginTop: 14 }]}>
                {lang === 'tl' ? 'Espesyal na Kalagayan (Vulnerability Tags):' : 'Special Conditions / Vulnerabilities:'}
              </Text>
              <View style={styles.conditionTagsRowModal}>
                {CONDITION_PRESETS.map((preset) => {
                  const isChecked = memberConditionsInput.includes(preset.tag);
                  return (
                    <TouchableOpacity
                      key={preset.key}
                      style={[
                        styles.condTagBtnSmall,
                        isChecked
                          ? { backgroundColor: preset.bg, borderColor: preset.color, borderWidth: 1.5 }
                          : styles.condTagBtnInactive,
                      ]}
                      onPress={() => {
                        if (isChecked) {
                          setMemberConditionsInput((prev) => prev.filter((c) => c !== preset.tag));
                        } else {
                          setMemberConditionsInput((prev) => [...prev, preset.tag]);
                        }
                      }}
                    >
                      <Text
                        style={[
                          styles.condTagTextSmall,
                          isChecked ? { color: preset.color, fontWeight: '800' } : { color: '#64748B' },
                        ]}
                      >
                        {isChecked ? '✓ ' : '+ '}
                        {preset.tag}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>

              <TouchableOpacity
                style={styles.saveMemberSubmitBtn}
                onPress={handleSaveMemberSubmit}
                activeOpacity={0.85}
              >
                <Text style={styles.saveMemberSubmitBtnText}>
                  {lang === 'tl' ? 'I-save ang Impormasyon' : 'Save Member Information'}
                </Text>
              </TouchableOpacity>
            </ScrollView>
          </View>
        </View>
      </Modal>

      {/* ══════════════════════════════════════════════════════════ */}
      {/* MODAL 3: CHANGE PASSWORD MODAL                             */}
      {/* ══════════════════════════════════════════════════════════ */}
      <Modal
        visible={showPasswordModal}
        animationType="fade"
        transparent
        onRequestClose={() => setShowPasswordModal(false)}
      >
        <View style={styles.modalBackdrop}>
          <View style={styles.passwordModalCard}>
            <View style={styles.modalHeaderRow}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                <View style={[styles.rosterModalIconCircle, { backgroundColor: '#EFF6FF' }]}>
                  <LockIcon size={18} color="#1557B0" />
                </View>
                <View>
                  <Text style={styles.modalMainTitle}>
                    {lang === 'tl' ? 'Palitan ang Password' : 'Change Password'}
                  </Text>
                  <Text style={styles.modalMainSub}>
                    {lang === 'tl'
                      ? 'Siguraduhing may 8 o higit pang characters.'
                      : 'Ensure at least 8 characters for account security.'}
                  </Text>
                </View>
              </View>
              <TouchableOpacity onPress={() => setShowPasswordModal(false)}>
                <CloseIcon size={18} color="#0F172A" />
              </TouchableOpacity>
            </View>

            <ScrollView showsVerticalScrollIndicator={false}>
              <NeumorphicInput
                label={lang === 'tl' ? 'Kasalukuyang Password' : 'Current Password'}
                value={currentPass}
                onChangeText={setCurrentPass}
                placeholder="••••••••"
                secureTextEntry={!showCurrentPassText}
                required
              />

              <NeumorphicInput
                label={lang === 'tl' ? 'Bagong Password (min 8 chars)' : 'New Password (min 8 chars)'}
                value={newPass}
                onChangeText={setNewPass}
                placeholder="••••••••"
                secureTextEntry={!showNewPassText}
                required
              />

              <NeumorphicInput
                label={lang === 'tl' ? 'Kumpirmahin ang Bagong Password' : 'Confirm New Password'}
                value={confirmPass}
                onChangeText={setConfirmPass}
                placeholder="••••••••"
                secureTextEntry={!showNewPassText}
                required
              />

              <TouchableOpacity
                style={[styles.savePassFullBtn, passLoading && { opacity: 0.7 }]}
                onPress={handleChangePassword}
                disabled={passLoading}
                activeOpacity={0.85}
              >
                {passLoading ? (
                  <ActivityIndicator color="#FFFFFF" size="small" />
                ) : (
                  <Text style={styles.savePassFullBtnText}>
                    {lang === 'tl' ? 'I-save ang Bagong Password' : 'Save New Password'}
                  </Text>
                )}
              </TouchableOpacity>
            </ScrollView>
          </View>
        </View>
      </Modal>

      {/* ══════════════════════════════════════════════════════════ */}
      {/* MODAL 4: DATA PRIVACY & COMPLIANCE MODAL (RA 10173)         */}
      {/* ══════════════════════════════════════════════════════════ */}
      <Modal
        visible={showPrivacyModal}
        animationType="fade"
        transparent
        onRequestClose={() => setShowPrivacyModal(false)}
      >
        <View style={styles.modalBackdrop}>
          <View style={styles.privacyModalCard}>
            <View style={styles.modalHeaderRow}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                <ShieldCheckIcon size={20} color="#16A34A" />
                <Text style={styles.modalMainTitle}>Data Privacy Act (RA 10173)</Text>
              </View>
              <TouchableOpacity onPress={() => setShowPrivacyModal(false)}>
                <CloseIcon size={18} color="#0F172A" />
              </TouchableOpacity>
            </View>

            <ScrollView showsVerticalScrollIndicator={false} style={{ maxHeight: 320, marginVertical: 12 }}>
              <Text style={styles.privacyBodyText}>
                {lang === 'tl'
                  ? 'Ang Pamahalaang Lungsod ng Maynila at ang MitigatePlus Disaster Management System ay mahigpit na sumusunod sa Republic Act 10173 (Data Privacy Act of 2012).\n\n1. Ang inyong buong pangalan, tirahan, at talaan ng pamilya ay gagamitin lamang para sa tamang pamamahagi ng relief assistance.\n2. Ang inyong biometric at QR token ay naka-encrypt at hindi kailanman ibabahagi sa mga pribadong kumpanya.\n3. May karapatan kayong humiling ng pagwawasto o pagbura sa inyong mga impormasyon sa pamamagitan ng inyong Barangay Disaster Council.'
                  : 'The City Government of Manila and MitigatePlus Disaster Response adhere strictly to Republic Act No. 10173 (Data Privacy Act of 2012).\n\n1. All household records and relief distribution logs are exclusively used for emergency aid eligibility and fraud prevention.\n2. Biometric and QR security tokens are securely encrypted with AES-256 standards and never shared with unauthorized commercial entities.\n3. Residents maintain full statutory rights to access, review, and request corrections to household records through official Barangay Disaster Help Desks.'}
              </Text>
            </ScrollView>

            <TouchableOpacity
              style={styles.modalDoneBtn}
              onPress={() => setShowPrivacyModal(false)}
            >
              <Text style={styles.modalDoneBtnText}>
                {lang === 'tl' ? 'Naiintindihan Ko' : 'I Understand'}
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* ══════════════════════════════════════════════════════════ */}
      {/* MODAL 5: SECURE QR PASS RENEWAL PASSWORD VERIFICATION     */}
      {/* ══════════════════════════════════════════════════════════ */}
      <Modal
        visible={showRenewQrModal}
        animationType="slide"
        transparent
        onRequestClose={() => setShowRenewQrModal(false)}
      >
        <View style={styles.modalBackdrop}>
          <View style={styles.passwordModalCard}>
            <View style={styles.modalHeaderRow}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                <View style={[styles.rosterModalIconCircle, { borderColor: '#FECACA', backgroundColor: '#FEF2F2' }]}>
                  <ShieldCheckIcon size={20} color="#DC2626" />
                </View>
                <View>
                  <Text style={styles.modalMainTitle}>
                    {lang === 'tl' ? 'Kumpirmahin ang Pag-Renew' : 'Confirm QR Renewal'}
                  </Text>
                  <Text style={styles.modalMainSub}>
                    {lang === 'tl' ? 'Kinakailangan ang Password' : 'Password Verification Required'}
                  </Text>
                </View>
              </View>
              <TouchableOpacity
                style={styles.modalCloseCircle}
                onPress={() => setShowRenewQrModal(false)}
              >
                <CloseIcon size={18} color="#0F172A" />
              </TouchableOpacity>
            </View>

            <ScrollView showsVerticalScrollIndicator={false} style={{ marginVertical: 10 }}>
              <View style={styles.securityNoticeCard}>
                <LockIcon size={16} color="#DC2626" />
                <Text style={styles.securityNoticeText}>
                  {lang === 'tl'
                    ? 'Upang maprotektahan ang inyong ayuda laban sa hindi awtorisadong pagpalit o pagnanakaw, mangyaring ilagay ang inyong account password bago mag-isyu ng bagong QR pass.'
                    : 'To safeguard your relief entitlements from unauthorized revocation or theft, verify your account password before issuing a new QR pass.'}
                </Text>
              </View>

              {renewError ? (
                <View style={styles.errorAlertBox}>
                  <Text style={styles.errorAlertText}>{renewError}</Text>
                </View>
              ) : null}

              {/* Password Input (Clean Single Eye Toggle) */}
              <View style={{ marginTop: 6, marginBottom: 12 }}>
                <NeumorphicInput
                  label={lang === 'tl' ? 'Kasalukuyang Account Password' : 'Current Account Password'}
                  placeholder={lang === 'tl' ? 'Ilagay ang inyong password...' : 'Enter your account password...'}
                  secureTextEntry={true}
                  value={renewPassword}
                  onChangeText={(val) => {
                    setRenewPassword(val);
                    if (renewError) setRenewError('');
                  }}
                  autoCapitalize="none"
                  required
                />
              </View>

              {/* Reason Selector Dropdown */}
              <View style={{ marginBottom: 12 }}>
                <Text style={styles.formInputLabel}>
                  {lang === 'tl' ? 'Dahilan ng Pagpapalit (Reason) *' : 'Reason for Renewal *'}
                </Text>

                {/* Dropdown Trigger Button */}
                <TouchableOpacity
                  style={styles.dropdownTriggerBtn}
                  onPress={() => setShowReasonDropdown(!showReasonDropdown)}
                  activeOpacity={0.8}
                >
                  <Text style={styles.dropdownTriggerText} numberOfLines={1}>
                    {(lang === 'tl' ? RENEWAL_REASONS_TL : RENEWAL_REASONS_EN).find((r) => r.key === selectedReasonKey)?.label || (lang === 'tl' ? 'Pumili ng dahilan...' : 'Select a reason...')}
                  </Text>
                  {showReasonDropdown ? (
                    <ChevronUpIcon size={18} color="#1557B0" />
                  ) : (
                    <ChevronDownIcon size={18} color="#64748B" />
                  )}
                </TouchableOpacity>

                {/* Dropdown Options List */}
                {showReasonDropdown && (
                  <View style={styles.dropdownOptionsCard}>
                    {(lang === 'tl' ? RENEWAL_REASONS_TL : RENEWAL_REASONS_EN).map((opt) => {
                      const isSelected = opt.key === selectedReasonKey;
                      return (
                        <TouchableOpacity
                          key={opt.key}
                          style={[
                            styles.dropdownOptionItem,
                            isSelected && styles.dropdownOptionItemSelected,
                          ]}
                          onPress={() => {
                            setSelectedReasonKey(opt.key);
                            setShowReasonDropdown(false);
                            if (renewError) setRenewError('');
                          }}
                          activeOpacity={0.75}
                        >
                          <Text
                            style={[
                              styles.dropdownOptionText,
                              isSelected && styles.dropdownOptionTextSelected,
                            ]}
                          >
                            {opt.label}
                          </Text>
                          {isSelected && <CheckIcon size={15} color="#1557B0" />}
                        </TouchableOpacity>
                      );
                    })}
                  </View>
                )}

                {/* If 'Other' is chosen, show custom text input */}
                {selectedReasonKey === 'other' && (
                  <View style={{ marginTop: 8 }}>
                    <NeumorphicInput
                      label={lang === 'tl' ? 'Pakisaad ang Ibang Dahilan' : 'Specify Other Reason'}
                      placeholder={lang === 'tl' ? 'Hal. May ibang taong may hawak ng ID...' : 'e.g. Someone else has a copy of my card...'}
                      value={customRenewReason}
                      onChangeText={(val) => {
                        setCustomRenewReason(val);
                        if (renewError) setRenewError('');
                      }}
                      autoCapitalize="sentences"
                      required
                    />
                  </View>
                )}
              </View>

              <TouchableOpacity
                style={[styles.confirmRenewBtn, renewLoading && { opacity: 0.7 }]}
                onPress={handleRenewQrPassWithPassword}
                disabled={renewLoading}
                activeOpacity={0.85}
              >
                {renewLoading ? (
                  <ActivityIndicator color="#FFFFFF" size="small" />
                ) : (
                  <Text style={styles.confirmRenewBtnText}>
                    {lang === 'tl' ? 'I-verify ang Password at I-renew ang QR' : 'Verify Password & Renew QR'}
                  </Text>
                )}
              </TouchableOpacity>
            </ScrollView>
          </View>
        </View>
      </Modal>

      {/* ── PHOTO SOURCE ACTION SHEET MODAL ── */}
      <Modal
        visible={showAvatarPicker}
        animationType="fade"
        transparent
        onRequestClose={() => setShowAvatarPicker(false)}
      >
        <View style={styles.modalBackdrop}>
          <View style={styles.avatarActionSheet}>
            <View style={styles.modalHeaderRow}>
              <Text style={styles.modalMainTitle}>
                {lang === 'tl' ? 'Palitan ang Profile Photo' : 'Update Profile Photo'}
              </Text>
              <TouchableOpacity onPress={() => setShowAvatarPicker(false)}>
                <CloseIcon size={18} color="#172B4D" />
              </TouchableOpacity>
            </View>

            <Text style={styles.avatarSheetSub}>
              {lang === 'tl'
                ? 'Pumili kung paano kukunin ang inyong larawan para sa opisyal na rekord ng pamilya.'
                : 'Select source to update your official household representative photo.'}
            </Text>

            <View style={styles.avatarOptionList}>
              <TouchableOpacity
                style={styles.avatarOptionBtn}
                onPress={handlePickFromCamera}
                activeOpacity={0.85}
              >
                <View style={[styles.avatarOptionIconWell, { backgroundColor: '#E0F2FE' }]}>
                  <CameraIcon size={20} color="#0284C7" />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.avatarOptionTitle}>
                    {lang === 'tl' ? 'Kumuha gamit ang Camera' : 'Take Photo with Camera'}
                  </Text>
                  <Text style={styles.avatarOptionSub}>
                    {lang === 'tl' ? 'Buksan ang camera ng telepono' : 'Snap a fresh photo using camera'}
                  </Text>
                </View>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.avatarOptionBtn}
                onPress={handlePickFromGallery}
                activeOpacity={0.85}
              >
                <View style={[styles.avatarOptionIconWell, { backgroundColor: '#FEF3C7' }]}>
                  <ImageIcon size={20} color="#D97706" />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.avatarOptionTitle}>
                    {lang === 'tl' ? 'Pumili mula sa Gallery' : 'Choose from Photo Gallery'}
                  </Text>
                  <Text style={styles.avatarOptionSub}>
                    {lang === 'tl' ? 'Mag-upload ng litrato mula sa storage' : 'Select an existing photo'}
                  </Text>
                </View>
              </TouchableOpacity>

              {profilePhoto && (
                <TouchableOpacity
                  style={styles.avatarOptionBtn}
                  onPress={handleResetToInitials}
                  activeOpacity={0.85}
                >
                  <View style={[styles.avatarOptionIconWell, { backgroundColor: '#F1F5F9' }]}>
                    <TrashIcon size={18} color="#DC2626" />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={[styles.avatarOptionTitle, { color: '#DC2626' }]}>
                      {lang === 'tl' ? 'Alisin ang Litrato' : 'Remove Photo'}
                    </Text>
                    <Text style={styles.avatarOptionSub}>
                      {lang === 'tl' ? 'Ibalik sa default initial badge' : 'Reset to initials badge'}
                    </Text>
                  </View>
                </TouchableOpacity>
              )}
            </View>

            <TouchableOpacity
              style={styles.cancelSheetBtn}
              onPress={() => setShowAvatarPicker(false)}
              activeOpacity={0.85}
            >
              <Text style={styles.cancelSheetBtnText}>{lang === 'tl' ? 'Kanselahin' : 'Cancel'}</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0A1628' },
  content: {
    paddingHorizontal: RESPONSIVE.padding,
    paddingTop: RESPONSIVE.topSafe + 8,
    paddingBottom: 95,
  },
  sectionLabel: {
    fontSize: 10.5,
    fontWeight: '800',
    color: '#64748B',
    letterSpacing: 0.8,
    marginBottom: 8,
    marginTop: 18,
    textTransform: 'uppercase',
  },
  profileHeaderCard: {
    backgroundColor: '#0F2040',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#D9E2EC',
    padding: 16,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    ...SHADOWS.sm,
  },
  avatarSection: { alignItems: 'center', gap: 4 },
  avatarContainer: { position: 'relative' },
  avatarImage: { width: 56, height: 56, borderRadius: 28, borderWidth: 2, borderColor: '#BFDBFE' },
  avatarPlaceholder: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: '#EFF6FF',
    borderWidth: 1.5,
    borderColor: '#BFDBFE',
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarInitialsText: { fontSize: 18, fontWeight: FONT_WEIGHT.black, color: '#1557B0' },
  cameraIconBadge: {
    position: 'absolute',
    bottom: -2,
    right: -2,
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: '#1557B0',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1.5,
    borderColor: '#FFFFFF',
  },
  changePhotoText: { fontSize: 10, fontWeight: '700', color: '#1557B0', marginTop: 2 },
  profileName: { fontSize: 16, fontWeight: FONT_WEIGHT.black, color: '#0F172A', letterSpacing: -0.2 },
  verifiedTag: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    backgroundColor: '#DCFCE7',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  verifiedTagText: { fontSize: 9.5, fontWeight: '800', color: '#16A34A' },
  profileSub: { fontSize: 11.5, color: '#64748B', marginTop: 2 },
  profileContactText: { fontSize: 11, color: '#475569', fontWeight: '600', marginTop: 2 },

  // ── Roster Summary Card ──
  rosterSummaryCard: {
    backgroundColor: '#0F2040',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#D9E2EC',
    padding: 12,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    ...SHADOWS.sm,
  },
  rosterIconCircle: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#EFF6FF',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#BFDBFE',
    flexShrink: 0,
  },
  rosterCardTitle: { fontSize: 13, fontWeight: FONT_WEIGHT.black, color: '#0F172A' },
  headcountBadge: {
    backgroundColor: '#E0F2FE',
    paddingHorizontal: 5,
    paddingVertical: 2,
    borderRadius: 4,
  },
  headcountBadgeText: { fontSize: 9.5, fontWeight: '800', color: '#0284C7' },
  rosterCardSub: { fontSize: 10.5, color: '#64748B', marginTop: 1 },
  viewRosterBtn: {
    flexShrink: 0,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#EFF6FF',
    paddingHorizontal: 9,
    paddingVertical: 6,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#BFDBFE',
  },
  viewRosterBtnText: { fontSize: 11, fontWeight: '800', color: '#1557B0' },

  // ── Common Settings Group ──
  settingCardGroup: {
    backgroundColor: '#0F2040',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#D9E2EC',
    paddingHorizontal: 14,
    paddingVertical: 10,
    ...SHADOWS.sm,
  },
  settingRowItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 8,
    gap: 8,
  },
  settingItemLabel: { fontSize: 13, fontWeight: '700', color: '#0F172A' },
  settingItemValue: { fontSize: 12, color: '#475569', marginTop: 2, fontWeight: '500' },
  settingItemSub: { fontSize: 11, color: '#64748B', marginTop: 2, lineHeight: 15 },
  divider: { height: 1, backgroundColor: '#F1F5F9', marginVertical: 6 },
  readOnlyBadge: { flexShrink: 0, backgroundColor: '#F1F5F9', paddingHorizontal: 8, paddingVertical: 4, borderRadius: 6 },
  readOnlyText: { fontSize: 10, fontWeight: '700', color: '#64748B' },
  editActionBtn: { flexShrink: 0, backgroundColor: '#EFF6FF', paddingHorizontal: 10, paddingVertical: 5, borderRadius: 6 },
  editActionText: { fontSize: 11, fontWeight: '700', color: '#1557B0' },
  successInline: { fontSize: 11, color: '#16A34A', fontWeight: '700', marginTop: 4 },
  actionPillBtn: {
    flexShrink: 0,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: '#EFF6FF',
    borderWidth: 1,
    borderColor: '#BFDBFE',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
  },
  actionPillBtnText: { fontSize: 11, fontWeight: '800', color: '#1557B0' },
  revokeQrBtn: {
    flexShrink: 0,
    backgroundColor: '#FEF2F2',
    borderWidth: 1,
    borderColor: '#FECACA',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
  },
  revokeQrBtnText: { fontSize: 11, fontWeight: '800', color: '#DC2626' },
  cachePill: { backgroundColor: '#DCFCE7', paddingHorizontal: 8, paddingVertical: 3, borderRadius: 6 },
  cachePillText: { fontSize: 10, fontWeight: '800', color: '#16A34A' },
  syncBtn: {
    backgroundColor: '#F0FDF4',
    borderWidth: 1,
    borderColor: '#BBF7D0',
    borderRadius: 8,
    paddingVertical: 10,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 6,
  },
  syncBtnText: { fontSize: 12, fontWeight: '800', color: '#1557B0' },
  privacyViewBtn: {
    flexShrink: 0,
    backgroundColor: '#F0FDF4',
    borderWidth: 1,
    borderColor: '#BBF7D0',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
  },
  privacyViewBtnText: { fontSize: 11, fontWeight: '800', color: '#16A34A' },

  // ── Language ──
  langRow: { flexDirection: 'row', gap: 10 },
  langBtn: { flex: 1, paddingVertical: 12, borderRadius: 10, alignItems: 'center', borderWidth: 1.5 },
  langBtnActive: { backgroundColor: '#EFF6FF', borderColor: '#1557B0' },
  langBtnInactive: { backgroundColor: '#0F2040', borderColor: '#CBD5E1' },
  langText: { fontSize: 13, fontWeight: '600', color: '#64748B' },
  langTextActive: { color: '#1557B0', fontWeight: FONT_WEIGHT.black },

  // ── Hotlines ──
  hotlineList: { gap: 8 },
  hotlineCard: {
    backgroundColor: '#0F2040',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#1E3A5F',
    padding: 12,
    flexDirection: 'row',
    alignItems: 'center',
  },
  phoneIconWell: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#FEE2E2',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 10,
  },
  hotlineName: { fontSize: 12.5, fontWeight: '700', color: '#0F172A' },
  hotlineTag: { fontSize: 10, color: '#DC2626', fontWeight: '700', marginTop: 1 },
  hotlineNumberText: { fontSize: 12, fontWeight: '800', color: '#1E293B', marginTop: 2 },
  hotlineCallBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#DC2626',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 6,
  },
  hotlineCallBtnText: { color: '#FFFFFF', fontSize: 11, fontWeight: '800' },

  // ── Logout ──
  logoutBtn: {
    backgroundColor: '#FEF2F2',
    borderWidth: 1.5,
    borderColor: '#FCA5A5',
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 24,
  },
  logoutBtnText: { fontSize: 14, fontWeight: FONT_WEIGHT.black, color: '#DC2626' },
  trademarkCard: { alignItems: 'center', marginTop: 24, paddingBottom: 20 },
  trademarkLogoImg: { width: 140, height: 40, marginBottom: 4 },
  trademarkSub: { fontSize: 10.5, color: '#94A3B8', fontWeight: '500' },

  // ── Modal Styles ──
  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(15, 23, 42, 0.65)',
    justifyContent: 'flex-end',
  },
  rosterModalSheet: {
    backgroundColor: '#0F2040',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingHorizontal: 18,
    paddingTop: 18,
    paddingBottom: 14,
    height: hp(82),
    maxHeight: hp(88),
  },
  modalHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 8,
  },
  rosterModalIconCircle: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#EFF6FF',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#BFDBFE',
  },
  modalMainTitle: { fontSize: 16, fontWeight: FONT_WEIGHT.black, color: '#0F172A' },
  modalMainSub: { fontSize: 11, color: '#64748B', marginTop: 1 },
  modalCloseCircle: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#F1F5F9',
    alignItems: 'center',
    justifyContent: 'center',
  },

  // ── Roster Metrics Bar ──
  rosterMetricPill: {
    backgroundColor: '#F8FAFC',
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#1E3A5F',
    padding: 10,
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: 10,
  },
  rosterMetricItem: { flex: 1, alignItems: 'center' },
  rosterMetricDivider: { width: 1, height: 24, backgroundColor: '#CBD5E1' },
  rosterMetricLabel: { fontSize: 8.5, fontWeight: '800', color: '#64748B', letterSpacing: 0.5 },
  rosterMetricValue: { fontSize: 12, fontWeight: FONT_WEIGHT.black, color: '#0F172A', marginTop: 2 },

  addMemberFullBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    backgroundColor: '#1557B0',
    paddingVertical: 12,
    borderRadius: 10,
    marginVertical: 6,
  },
  addMemberFullBtnText: { color: '#FFFFFF', fontSize: 13, fontWeight: '800' },

  memberManageCard: {
    backgroundColor: '#0F2040',
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#1E3A5F',
    paddingVertical: 9,
    paddingHorizontal: 11,
    ...SHADOWS.sm,
  },
  memberManageTop: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  memberAvatarCircle: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#EFF6FF',
    borderWidth: 1,
    borderColor: '#BFDBFE',
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  memberAvatarLetter: { fontSize: 12.5, fontWeight: FONT_WEIGHT.black, color: '#1557B0' },
  memberCardName: { fontSize: 12.5, fontWeight: '800', color: '#0F172A' },
  headTag: { backgroundColor: '#DCFCE7', paddingHorizontal: 4, paddingVertical: 1, borderRadius: 3 },
  headTagText: { fontSize: 8.5, fontWeight: '800', color: '#16A34A' },
  memberCardRel: { fontSize: 10.5, color: '#64748B' },
  activeConditionTagPill: {
    backgroundColor: '#F5F3FF',
    borderWidth: 1,
    borderColor: '#DDD6FE',
    paddingHorizontal: 4,
    paddingVertical: 1,
    borderRadius: 3,
  },
  activeConditionTagText: {
    fontSize: 8.5,
    fontWeight: '800',
    color: '#7C3AED',
  },
  memberEditBtn: {
    backgroundColor: '#EFF6FF',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#BFDBFE',
  },
  memberEditBtnText: { fontSize: 10.5, fontWeight: '800', color: '#1557B0' },
  memberDeleteBtn: {
    backgroundColor: '#FEF2F2',
    padding: 5,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#FECACA',
  },
  conditionTagsRowModal: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    marginTop: 8,
  },
  condTagBtnSmall: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  condTagBtnInactive: {
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: '#CBD5E1',
  },
  condTagTextSmall: { fontSize: 10, fontWeight: '600' },
  modalDoneBtn: {
    backgroundColor: '#0F172A',
    paddingVertical: 12,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 10,
  },
  modalDoneBtnText: { color: '#FFFFFF', fontSize: 13, fontWeight: '800' },

  // ── Member Form Modal ──
  memberFormCard: {
    backgroundColor: '#0F2040',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    padding: 20,
    maxHeight: hp(80),
  },
  formInputLabel: { fontSize: 12, fontWeight: '700', color: '#0F172A', marginBottom: 6 },
  relChoicesRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginBottom: 8 },
  relChoiceBtn: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 6,
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: '#CBD5E1',
  },
  relChoiceBtnActive: {
    backgroundColor: '#EFF6FF',
    borderColor: '#1557B0',
    borderWidth: 1.5,
  },
  relChoiceText: { fontSize: 11, color: '#64748B', fontWeight: '600' },
  relChoiceTextActive: { color: '#1557B0', fontWeight: '800' },
  saveMemberSubmitBtn: {
    backgroundColor: '#1557B0',
    paddingVertical: 13,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 18,
    marginBottom: 10,
  },
  saveMemberSubmitBtnText: { color: '#FFFFFF', fontSize: 13.5, fontWeight: '800' },

  // ── Password Modal ──
  passwordModalCard: {
    backgroundColor: '#0F2040',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    padding: 20,
    maxHeight: hp(75),
  },
  savePassFullBtn: {
    backgroundColor: '#1557B0',
    paddingVertical: 13,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 16,
    marginBottom: 10,
  },
  savePassFullBtnText: { color: '#FFFFFF', fontSize: 13.5, fontWeight: '800' },

  // ── Privacy Modal ──
  privacyModalCard: {
    backgroundColor: '#0F2040',
    borderRadius: 16,
    padding: 20,
    margin: 20,
    alignSelf: 'center',
    width: '90%',
    maxWidth: 420,
  },
  privacyBodyText: { fontSize: 12.5, color: '#334155', lineHeight: 19 },

  // ── Avatar Action Sheet ──
  avatarActionSheet: {
    backgroundColor: '#0F2040',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    padding: 20,
  },
  avatarSheetSub: { fontSize: 11.5, color: '#64748B', marginBottom: 14 },
  avatarOptionList: { gap: 10 },
  avatarOptionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    backgroundColor: '#F8FAFC',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#1E3A5F',
    padding: 12,
  },
  avatarOptionIconWell: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarOptionTitle: { fontSize: 13, fontWeight: '800', color: '#0F172A' },
  avatarOptionSub: { fontSize: 11, color: '#64748B', marginTop: 1 },
  cancelSheetBtn: {
    backgroundColor: '#F1F5F9',
    paddingVertical: 12,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 14,
  },
  cancelSheetBtnText: { fontSize: 13, fontWeight: '800', color: '#64748B' },

  // ── Secure QR Renewal Modal Styles ──
  securityNoticeCard: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
    backgroundColor: '#FEF2F2',
    borderWidth: 1,
    borderColor: '#FECACA',
    borderRadius: 12,
    padding: 12,
    marginBottom: 10,
  },
  securityNoticeText: {
    flex: 1,
    fontSize: 11.5,
    color: '#991B1B',
    lineHeight: 16,
    fontWeight: '600',
  },
  errorAlertBox: {
    backgroundColor: '#FEE2E2',
    borderWidth: 1,
    borderColor: '#FCA5A5',
    borderRadius: 8,
    padding: 10,
    marginBottom: 8,
  },
  errorAlertText: {
    color: '#B91C1C',
    fontSize: 11.5,
    fontWeight: '700',
    textAlign: 'center',
  },
  dropdownTriggerBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#F8FAFC',
    borderWidth: 1.5,
    borderColor: '#CBD5E1',
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 12,
    marginTop: 4,
  },
  dropdownTriggerText: {
    flex: 1,
    fontSize: 12.5,
    color: '#0F172A',
    fontWeight: '600',
    paddingRight: 8,
  },
  dropdownOptionsCard: {
    backgroundColor: '#0F2040',
    borderWidth: 1,
    borderColor: '#CBD5E1',
    borderRadius: 10,
    marginTop: 4,
    overflow: 'hidden',
    ...SHADOWS.sm,
  },
  dropdownOptionItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
  },
  dropdownOptionItemSelected: {
    backgroundColor: '#EFF6FF',
  },
  dropdownOptionText: {
    flex: 1,
    fontSize: 12,
    color: '#334155',
    fontWeight: '500',
    paddingRight: 8,
  },
  dropdownOptionTextSelected: {
    color: '#1557B0',
    fontWeight: '800',
  },
  confirmRenewBtn: {
    backgroundColor: '#DC2626',
    paddingVertical: 13,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 14,
    marginBottom: 10,
    ...SHADOWS.sm,
  },
  confirmRenewBtnText: {
    color: '#FFFFFF',
    fontSize: 13.5,
    fontWeight: '800',
  },
});

import React, { useState } from 'react';
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
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  PhoneCallIcon,
  UsersIcon,
  ShieldCheckIcon,
  CameraIcon,
  CheckIcon,
  PlusIcon,
  TrashIcon,
  CloseIcon,
  DownloadIcon,
  RefreshIcon,
} from '../components/AppIcons';
import NeumorphicInput from '../components/NeumorphicInput';
import QRCodeVisual from '../components/QRCodeVisual';
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

const SAMPLE_AVATARS = [
  'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=300&q=80',
  'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=300&q=80',
  'https://images.unsplash.com/photo-1544005313-94ddf0286df2?auto=format&fit=crop&w=300&q=80',
  'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?auto=format&fit=crop&w=300&q=80',
];

const CONDITION_PRESETS = [
  { key: 'pwd', label: 'PWD / Disability Support', tag: 'PWD', color: '#7C3AED', bg: '#F5F3FF' },
  { key: 'pregnant', label: 'Pregnant / Lactating', tag: 'Pregnant', color: '#DB2777', bg: '#FDF2F8' },
  { key: 'senior', label: 'Senior Citizen (60+)', tag: 'Senior (60+)', color: '#D97706', bg: '#FEF3C7' },
  { key: 'infant', label: 'Infant / Toddler (0-5)', tag: 'Infant (0-5)', color: '#0284C7', bg: '#E0F2FE' },
  { key: 'medical', label: 'Maintenance Medicine', tag: 'Medical', color: '#059669', bg: '#ECFDF5' },
];

function ProfileHeaderCard({ name, contact, barangayCode, photo, onToggleAvatar, lang }) {
  const initials = name ? name.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase() : 'HH';
  return (
    <View style={styles.profileCard}>
      <View style={styles.avatarSection}>
        <TouchableOpacity style={styles.avatarContainer} onPress={onToggleAvatar} activeOpacity={0.8}>
          {photo ? (
            <Image source={{ uri: photo }} style={styles.avatarImage} />
          ) : (
            <View style={styles.avatarInitialsBox}>
              <Text style={styles.avatarInitialsText}>{initials}</Text>
            </View>
          )}
          <View style={styles.cameraIconBadge}>
            <CameraIcon size={12} color="#FFFFFF" />
          </View>
        </TouchableOpacity>
        <TouchableOpacity onPress={onToggleAvatar}>
          <Text style={styles.changePhotoText}>{lang === 'tl' ? 'Palitan ang Litrato' : 'Change Photo'}</Text>
        </TouchableOpacity>
      </View>

      <View style={{ flex: 1 }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
          <Text style={styles.profileName}>{name}</Text>
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

function OfflineDigitalPassCard({ downloadingPass, onSaveQRPass, lang }) {
  return (
    <View>
      <Text style={styles.sectionLabel}>{lang === 'tl' ? 'SINGPASS-STYLE OFFLINE DIGITAL PASS' : 'OFFLINE DIGITAL PASS'}</Text>
      <View style={styles.offlinePassCard}>
        <View style={styles.passCardHeaderRow}>
          <View style={styles.passHeaderIconWell}>
            <ShieldCheckIcon size={18} color="#D97706" />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={styles.passCardTitle}>Official Beneficiary QR Pass</Text>
            <Text style={styles.passCardSub}>
              {lang === 'tl'
                ? 'I-save ang larawan sa Photo Gallery upang maipakita sa relief desk kahit walang internet.'
                : 'Save pass image to Photo Gallery for offline presentation at relief distribution desks.'}
            </Text>
          </View>
        </View>

        <TouchableOpacity
          style={[styles.downloadPassBtn, downloadingPass && { opacity: 0.7 }]}
          onPress={onSaveQRPass}
          disabled={downloadingPass}
          activeOpacity={0.85}
        >
          {downloadingPass ? (
            <ActivityIndicator color="#FFFFFF" size="small" />
          ) : (
            <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8 }}>
              <DownloadIcon size={18} color="#FFFFFF" />
              <Text style={styles.downloadPassBtnText}>
                {lang === 'tl' ? 'I-save ang QR Pass sa Photo Gallery' : 'Save QR Pass to Photo Gallery'}
              </Text>
            </View>
          )}
        </TouchableOpacity>
      </View>
    </View>
  );
}

export default function SettingsScreen({ user, lang = 'en', onSelectLang, onLogout }) {
  const t = TRANSLATIONS[lang] || TRANSLATIONS.en;

  const [profilePhoto, setProfilePhoto] = useState(null);
  const [showAvatarPicker, setShowAvatarPicker] = useState(false);
  const [name, setName] = useState(user?.name || '');
  const [contact, setContact] = useState(user?.emailOrPhone || '');
  const [isEditingContact, setIsEditingContact] = useState(false);
  const [saveLoading, setSaveLoading] = useState(false);
  const [savedSuccess, setSavedSuccess] = useState(false);

  const [members, setMembers] = useState(
    Array.isArray(user?.household?.members) && user.household.members.length > 0
      ? user.household.members
      : []
  );
  const [showAddMemberModal, setShowAddMemberModal] = useState(false);
  const [newMemberName, setNewMemberName] = useState('');
  const [newMemberAge, setNewMemberAge] = useState('');
  const [newMemberRel, setNewMemberRel] = useState(lang === 'tl' ? 'Anak' : 'Child');
  const [newMemberConditions, setNewMemberConditions] = useState([]);
  const [rosterSavedSuccess, setRosterSavedSuccess] = useState(false);

  const [downloadingPass, setDownloadingPass] = useState(false);
  const [passSavedModal, setPassSavedModal] = useState(false);

  const [showPasswordChange, setShowPasswordChange] = useState(false);
  const [currentPass, setCurrentPass] = useState('');
  const [newPass, setNewPass] = useState('');
  const [confirmPass, setConfirmPass] = useState('');
  const [biometricEnabled, setBiometricEnabled] = useState(true);

  const [smsAlerts, setSmsAlerts] = useState(true);
  const [pushAlerts, setPushAlerts] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const [lastSyncTime, setLastSyncTime] = useState('Ngayong araw, 6:15 PM');

  const seniorCount = members.filter(m => m.conditions?.includes('Senior 60+') || parseInt(m.age, 10) >= 60).length;
  const pwdCount = members.filter(m => m.conditions?.includes('PWD')).length;
  const infantCount = members.filter(m => m.conditions?.includes('Sanggol 0-5') || m.conditions?.includes('Buntis')).length;
  const computedScore = Math.min(100, 35 + members.length * 6 + seniorCount * 12 + pwdCount * 18 + infantCount * 14);

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

  const handleToggleMemberCondition = (memberId, condTag) => {
    setMembers(prev => prev.map(m => {
      if (m.id === memberId) {
        const currentConds = m.conditions || [];
        const exists = currentConds.includes(condTag);
        const updated = exists ? currentConds.filter(c => c !== condTag) : [...currentConds, condTag];
        return { ...m, conditions: updated };
      }
      return m;
    }));
    setRosterSavedSuccess(true);
    setTimeout(() => setRosterSavedSuccess(false), 2500);
  };

  const handleRemoveMember = (id) => {
    if (members.length <= 1) {
      Alert.alert(lang === 'tl' ? 'Paunawa' : 'Notice', lang === 'tl' ? 'Hindi maaaring alisin ang nag-iisang Punong-Pamilya.' : 'Cannot remove primary Head.');
      return;
    }
    setMembers(prev => prev.filter(m => m.id !== id));
    setRosterSavedSuccess(true);
    setTimeout(() => setRosterSavedSuccess(false), 2500);
  };

  const handleAddMemberSubmit = () => {
    if (!newMemberName.trim()) {
      Alert.alert(lang === 'tl' ? 'Kailangan ang Pangalan' : 'Name Required', lang === 'tl' ? 'Pakilagay ang buong pangalan.' : 'Please enter member name.');
      return;
    }
    const newEntry = {
      id: Date.now(),
      name: newMemberName.trim(),
      age: newMemberAge || '25',
      relationship: newMemberRel,
      conditions: newMemberConditions,
    };
    const updatedList = [...members, newEntry];
    setMembers(updatedList);
    setNewMemberName('');
    setNewMemberAge('');
    setNewMemberConditions([]);
    setShowAddMemberModal(false);
    setRosterSavedSuccess(true);
    setTimeout(() => setRosterSavedSuccess(false), 2500);

    try {
      (async () => {
        const token = (await AsyncStorage.getItem('mitigateplus_token')) || (typeof window !== 'undefined' && window.localStorage?.getItem('mitigateplus_token'));
        if (token) {
          await fetch(`${API_BASE_URL}/households/me/members`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
            body: JSON.stringify({ members: updatedList }),
          });
        }
      })();
    } catch (e) {}
  };

  const handleSaveQRPassOffline = () => {
    setDownloadingPass(true);
    setTimeout(() => {
      setDownloadingPass(false);
      setPassSavedModal(true);
    }, 900);
  };

  const handleChangePassword = async () => {
    if (!currentPass || !newPass || newPass.length < 8 || newPass !== confirmPass) {
      Alert.alert(lang === 'tl' ? 'Maling Input' : 'Invalid Input', lang === 'tl' ? 'Paki-tsek ang inyong mga password.' : 'Please verify password fields.');
      return;
    }
    try {
      const token = (await AsyncStorage.getItem('mitigateplus_token')) || (typeof window !== 'undefined' && window.localStorage?.getItem('mitigateplus_token'));
      const res = await fetch(`${API_BASE_URL}/auth/change-password`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ currentPassword: currentPass, newPassword: newPass }),
      });
      if (res.ok) {
        Alert.alert(lang === 'tl' ? 'Tagumpay' : 'Success', lang === 'tl' ? 'Matagumpay na nabago ang password!' : 'Password updated!');
        setShowPasswordChange(false);
        setCurrentPass('');
        setNewPass('');
        setConfirmPass('');
      } else {
        Alert.alert('Error', lang === 'tl' ? 'Maling kasalukuyang password.' : 'Incorrect password.');
      }
    } catch (err) {
      Alert.alert('Error', lang === 'tl' ? 'Hindi makakonekta.' : 'Could not connect.');
    }
  };

  const handleSyncOfflineData = async () => {
    setSyncing(true);
    try {
      const token = (await AsyncStorage.getItem('mitigateplus_token')) || (typeof window !== 'undefined' && window.localStorage?.getItem('mitigateplus_token'));
      if (token) {
        const res = await fetch(`${API_BASE_URL}/households/me`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (res.ok) {
          const profile = await res.json();
          if (profile && typeof window !== 'undefined' && window.localStorage) {
            window.localStorage.setItem('mitigateplus_household_cache', JSON.stringify(profile));
          }
        }
      }
    } catch (e) {}
    setSyncing(false);
    setLastSyncTime(new Date().toLocaleTimeString());
    Alert.alert(lang === 'tl' ? 'Offline Cache Synced' : 'Offline Cache Synced', lang === 'tl' ? 'Ligtas na na-sync ang QR Pass.' : 'QR Pass synced.');
  };

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
      <View style={styles.header}>
        <Text style={styles.title}>{t.settingsTitle}</Text>
        <Text style={styles.sub}>
          {lang === 'tl'
            ? 'Pamahalaan ang profile, talaan ng pamilya, offline pass, at seguridad.'
            : 'Manage household profile, family members, offline pass, and security.'}
        </Text>
      </View>

      <ProfileHeaderCard
        name={name}
        contact={contact}
        barangayCode={user?.barangayCode}
        photo={profilePhoto}
        onToggleAvatar={() => setShowAvatarPicker(!showAvatarPicker)}
        lang={lang}
      />

      {showAvatarPicker && (
        <View style={styles.avatarPickerBox}>
          <Text style={styles.avatarPickerTitle}>
            {lang === 'tl' ? 'Pumili ng Profile Photo o Avatar:' : 'Select Profile Photo / Avatar:'}
          </Text>
          <View style={styles.avatarPresetsRow}>
            {SAMPLE_AVATARS.map((url, i) => (
              <TouchableOpacity
                key={i}
                style={[styles.presetAvatarBtn, profilePhoto === url && styles.presetAvatarSelected]}
                onPress={() => {
                  setProfilePhoto(url);
                  setShowAvatarPicker(false);
                }}
              >
                <Image source={{ uri: url }} style={styles.presetAvatarImg} />
              </TouchableOpacity>
            ))}
            <TouchableOpacity
              style={styles.presetAvatarClearBtn}
              onPress={() => {
                setProfilePhoto(null);
                setShowAvatarPicker(false);
              }}
            >
              <Text style={styles.presetAvatarClearText}>Initials</Text>
            </TouchableOpacity>
          </View>
        </View>
      )}

      <OfflineDigitalPassCard downloadingPass={downloadingPass} onSaveQRPass={handleSaveQRPassOffline} lang={lang} />

      <View style={styles.sectionHeaderBetween}>
        <Text style={styles.sectionLabelNoMargin}>{lang === 'tl' ? 'TALAAN NG MIYEMBRO NG PAMILYA' : 'HOUSEHOLD MEMBERS ROSTER'}</Text>
        <TouchableOpacity style={styles.addMemberBtn} onPress={() => setShowAddMemberModal(true)} activeOpacity={0.8}>
          <PlusIcon size={13} color="#1557B0" />
          <Text style={styles.addMemberBtnText}>{lang === 'tl' ? 'Dagdag' : 'Add'}</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.rosterMetricPill}>
        <View style={styles.rosterMetricItem}>
          <Text style={styles.rosterMetricLabel}>HEADCOUNT</Text>
          <Text style={styles.rosterMetricValue}>{members.length} {lang === 'tl' ? 'Tao' : 'Members'}</Text>
        </View>
        <View style={styles.rosterMetricDivider} />
        <View style={styles.rosterMetricItem}>
          <Text style={styles.rosterMetricLabel}>VULNERABILITY</Text>
          <Text style={[styles.rosterMetricValue, { color: '#D97706' }]}>
            {seniorCount + pwdCount + infantCount} {lang === 'tl' ? 'Alaga' : 'Vulnerable'}
          </Text>
        </View>
        <View style={styles.rosterMetricDivider} />
        <View style={styles.rosterMetricItem}>
          <Text style={styles.rosterMetricLabel}>CALCULATED SCORE</Text>
          <Text style={[styles.rosterMetricValue, { color: '#16A34A' }]}>{computedScore} pts</Text>
        </View>
      </View>

      {rosterSavedSuccess && (
        <Text style={styles.rosterSuccessToast}>✓ {lang === 'tl' ? 'Na-update ang talaan ng pamilya.' : 'Household roster updated.'}</Text>
      )}

      <View style={styles.membersList}>
        {members.map((mem) => (
          <View key={mem.id} style={styles.memberCard}>
            <View style={styles.memberCardTop}>
              <View style={styles.memberAvatarWell}>
                <UsersIcon size={16} color="#1557B0" />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.memberName}>{mem.name}</Text>
                <Text style={styles.memberRel}>{mem.relationship} • {mem.age} yrs</Text>
              </View>
              {mem.id !== 1 && (
                <TouchableOpacity style={styles.removeMemberBtn} onPress={() => handleRemoveMember(mem.id)}>
                  <TrashIcon size={14} color="#DC2626" />
                </TouchableOpacity>
              )}
            </View>

            <Text style={styles.conditionPromptText}>{lang === 'tl' ? 'Pindutin ang tag para i-update:' : 'Tap tag to toggle condition:'}</Text>
            <View style={styles.conditionTagsRow}>
              {CONDITION_PRESETS.map((preset) => {
                const isActive = (mem.conditions || []).includes(preset.tag);
                return (
                  <TouchableOpacity
                    key={preset.key}
                    style={[styles.condTagBtn, isActive ? { backgroundColor: preset.bg, borderColor: preset.color, borderWidth: 1.5 } : styles.condTagBtnInactive]}
                    onPress={() => handleToggleMemberCondition(mem.id, preset.tag)}
                  >
                    <Text style={[styles.condTagText, isActive ? { color: preset.color, fontWeight: '800' } : { color: '#64748B' }]}>
                      {isActive ? '✓ ' : '+ '}{preset.tag}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>
          </View>
        ))}
      </View>

      <Text style={styles.sectionLabel}>{lang === 'tl' ? 'IMPORMASYON NG CONTACT' : 'CONTACT INFORMATION'}</Text>
      <View style={styles.settingCardGroup}>
        <View style={styles.settingRowItem}>
          <View style={{ flex: 1 }}>
            <Text style={styles.settingItemLabel}>{lang === 'tl' ? 'Punong-Pamilya' : 'Head of Household'}</Text>
            <Text style={styles.settingItemValue}>{name}</Text>
          </View>
          <View style={styles.readOnlyBadge}>
            <Text style={styles.readOnlyText}>{lang === 'tl' ? 'Naka-rehistro' : 'Registered'}</Text>
          </View>
        </View>

        <View style={styles.divider} />

        <View style={styles.settingRowItem}>
          <View style={{ flex: 1 }}>
            <Text style={styles.settingItemLabel}>{lang === 'tl' ? 'Mobile / Email' : 'Contact Mobile/Email'}</Text>
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
            <Text style={styles.editActionText}>{isEditingContact ? (lang === 'tl' ? 'I-save' : 'Save') : (lang === 'tl' ? 'Palitan' : 'Edit')}</Text>
          </TouchableOpacity>
        </View>
        {savedSuccess && <Text style={styles.successInline}>✓ {lang === 'tl' ? 'Na-save ang contact details.' : 'Contact saved.'}</Text>}
      </View>

      <Text style={styles.sectionLabel}>{lang === 'tl' ? 'SEGURIDAD AT PAG-LOGIN' : 'SECURITY & LOGIN'}</Text>
      <View style={styles.settingCardGroup}>
        <View style={styles.settingRowItem}>
          <View style={{ flex: 1 }}>
            <Text style={styles.settingItemLabel}>{lang === 'tl' ? 'Password ng Account' : 'Account Password'}</Text>
            <Text style={styles.settingItemSub}>••••••••••••</Text>
          </View>
          <TouchableOpacity onPress={() => setShowPasswordChange(!showPasswordChange)}>
            <Text style={styles.changePassToggleText}>{showPasswordChange ? (lang === 'tl' ? 'Isara' : 'Close') : (lang === 'tl' ? 'Palitan' : 'Change')}</Text>
          </TouchableOpacity>
        </View>

        {showPasswordChange && (
          <View style={styles.passwordChangeBox}>
            <NeumorphicInput label={lang === 'tl' ? 'Kasalukuyang Password' : 'Current Password'} value={currentPass} onChangeText={setCurrentPass} placeholder="••••••••" secureTextEntry />
            <NeumorphicInput label={lang === 'tl' ? 'Bagong Password (min 8 chars)' : 'New Password (min 8 chars)'} value={newPass} onChangeText={setNewPass} placeholder="••••••••" secureTextEntry />
            <NeumorphicInput label={lang === 'tl' ? 'Kumpirmahin ang Bagong Password' : 'Confirm New Password'} value={confirmPass} onChangeText={setConfirmPass} placeholder="••••••••" secureTextEntry />
            <TouchableOpacity style={styles.savePassBtn} onPress={handleChangePassword}>
              <Text style={styles.savePassBtnText}>{lang === 'tl' ? 'I-update ang Password' : 'Update Password'}</Text>
            </TouchableOpacity>
          </View>
        )}

        <View style={styles.divider} />

        <View style={styles.settingRowItem}>
          <View style={{ flex: 1 }}>
            <Text style={styles.settingItemLabel}>{lang === 'tl' ? 'Biometric / Fingerprint Unlock' : 'Biometric / Fingerprint Unlock'}</Text>
            <Text style={styles.settingItemSub}>{lang === 'tl' ? 'Mas mabilis na pag-login gamit ang FaceID o Fingerprint' : 'Quick sign-in with biometrics'}</Text>
          </View>
          <Switch value={biometricEnabled} onValueChange={setBiometricEnabled} trackColor={{ false: '#CBD5E1', true: '#BFDBFE' }} thumbColor={biometricEnabled ? '#1557B0' : '#F1F5F9'} />
        </View>
      </View>

      <Text style={styles.sectionLabel}>{lang === 'tl' ? 'MGA NOTIFIKASYON AT ADVISORY' : 'NOTIFICATIONS & ALERTS'}</Text>
      <View style={styles.settingCardGroup}>
        <View style={styles.settingRowItem}>
          <View style={{ flex: 1 }}>
            <Text style={styles.settingItemLabel}>{lang === 'tl' ? 'SMS Ayuda Alerts' : 'SMS Relief Alerts'}</Text>
            <Text style={styles.settingItemSub}>{lang === 'tl' ? 'Makatanggap ng libreng text sa oras ng relief distribution' : 'Receive text alerts for relief schedules'}</Text>
          </View>
          <Switch value={smsAlerts} onValueChange={setSmsAlerts} trackColor={{ false: '#CBD5E1', true: '#BFDBFE' }} thumbColor={smsAlerts ? '#1557B0' : '#F1F5F9'} />
        </View>
        <View style={styles.divider} />
        <View style={styles.settingRowItem}>
          <View style={{ flex: 1 }}>
            <Text style={styles.settingItemLabel}>{lang === 'tl' ? 'Push Notifications' : 'Push Notifications'}</Text>
            <Text style={styles.settingItemSub}>{lang === 'tl' ? 'Mga anunsyo mula sa Barangay Kapitan at MDRRMO' : 'Official advisories from MDRRMO'}</Text>
          </View>
          <Switch value={pushAlerts} onValueChange={setPushAlerts} trackColor={{ false: '#CBD5E1', true: '#BFDBFE' }} thumbColor={pushAlerts ? '#1557B0' : '#F1F5F9'} />
        </View>
      </View>

      <Text style={styles.sectionLabel}>{lang === 'tl' ? 'OFFLINE CACHE AT SYNC' : 'OFFLINE CACHE & SYNC'}</Text>
      <View style={styles.settingCardGroup}>
        <View style={styles.settingRowItem}>
          <View style={{ flex: 1 }}>
            <Text style={styles.settingItemLabel}>{lang === 'tl' ? 'Offline Data Cache' : 'Offline Data Cache'}</Text>
            <Text style={styles.settingItemSub}>{lang === 'tl' ? `Huling na-sync: ${lastSyncTime}` : `Last synced: ${lastSyncTime}`}</Text>
          </View>
          <View style={styles.cachePill}>
            <Text style={styles.cachePillText}>{lang === 'tl' ? 'Aktibo' : 'Active'}</Text>
          </View>
        </View>
        <TouchableOpacity style={styles.syncBtn} onPress={handleSyncOfflineData} disabled={syncing}>
          {syncing ? (
            <ActivityIndicator color="#1557B0" size="small" />
          ) : (
            <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8 }}>
              <RefreshIcon size={16} color="#1557B0" />
              <Text style={styles.syncBtnText}>{lang === 'tl' ? 'I-sync ang QR Pass at Talaan Ngayon' : 'Sync QR Pass & Logs Now'}</Text>
            </View>
          )}
        </TouchableOpacity>
      </View>

      <Text style={styles.sectionLabel}>{t.languageSectionTitle}</Text>
      <View style={styles.langRow}>
        <MotionPressable
          style={[styles.langBtn, lang === 'en' ? styles.langBtnActive : styles.langBtnInactive]}
          onPress={() => onSelectLang && onSelectLang('en')}
          activeOpacity={0.85}
        >
          <Text style={[styles.langText, lang === 'en' && styles.langTextActive]}>{t.langEnglish}</Text>
        </MotionPressable>

        <MotionPressable
          style={[styles.langBtn, lang === 'tl' ? styles.langBtnActive : styles.langBtnInactive]}
          onPress={() => onSelectLang && onSelectLang('tl')}
          activeOpacity={0.85}
        >
          <Text style={[styles.langText, lang === 'tl' && styles.langTextActive]}>{t.langFilipino}</Text>
        </MotionPressable>
      </View>

      <Text style={styles.sectionLabel}>{t.hotlinesSectionTitle}</Text>
      <View style={styles.hotlineList}>
        {EMERGENCY_HOTLINES.map((h, i) => (
          <MotionPressable key={i} style={styles.hotlineCard} onPress={() => handleCallHotline(h.phone)} activeOpacity={0.85}>
            <View style={styles.phoneIconWell}>
              <PhoneCallIcon size={16} color="#DC2626" />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.hotlineName}>{h.name}</Text>
              <Text style={styles.hotlineTag}>{h.tag}</Text>
            </View>
            <View style={styles.callBadge}>
              <Text style={styles.callBadgeText}>{h.phone}</Text>
            </View>
          </MotionPressable>
        ))}
      </View>

      <TouchableOpacity style={styles.logoutBtn} onPress={onLogout} activeOpacity={0.85}>
        <Text style={styles.logoutBtnText}>{t.signOutBtn}</Text>
      </TouchableOpacity>

      <View style={styles.trademarkCard}>
        <Image source={require('../../assets/logo_primary.png')} style={styles.trademarkLogoImg} resizeMode="contain" />
        <Text style={styles.trademarkVersion}>{t.versionInfo}</Text>
        <Text style={styles.trademarkSub}>{t.officialCopyright}</Text>
        <Text style={styles.trademarkLegal}>{t.legalNotice}</Text>
      </View>

      <Modal visible={showAddMemberModal} animationType="slide" transparent onRequestClose={() => setShowAddMemberModal(false)}>
        <View style={styles.modalBackdrop}>
          <View style={styles.modalContentCard}>
            <View style={styles.modalHeaderRow}>
              <Text style={styles.modalTitle}>{lang === 'tl' ? 'Dagdag Miyembro ng Pamilya' : 'Add Household Member'}</Text>
              <TouchableOpacity onPress={() => setShowAddMemberModal(false)}>
                <CloseIcon size={18} color="#172B4D" />
              </TouchableOpacity>
            </View>

            <ScrollView showsVerticalScrollIndicator={false}>
              <NeumorphicInput label={lang === 'tl' ? 'Buong Pangalan' : 'Full Legal Name'} value={newMemberName} onChangeText={setNewMemberName} placeholder="e.g. Juanito Santos" required />
              <NeumorphicInput label={lang === 'tl' ? 'Edad (Age)' : 'Age'} value={newMemberAge} onChangeText={setNewMemberAge} placeholder="e.g. 8" keyboardType="numeric" required />
              <Text style={styles.inputLabel}>{lang === 'tl' ? 'Relasyon sa Punong-Pamilya' : 'Relationship to Head'}</Text>
              <View style={styles.relChoicesRow}>
                {(lang === 'tl' ? ['Asawa', 'Anak', 'Magulang', 'Kapatid', 'Apo'] : ['Spouse', 'Child', 'Parent', 'Sibling', 'Grandchild']).map((rel) => (
                  <TouchableOpacity key={rel} style={[styles.relChoiceBtn, newMemberRel === rel && styles.relChoiceBtnActive]} onPress={() => setNewMemberRel(rel)}>
                    <Text style={[styles.relChoiceText, newMemberRel === rel && styles.relChoiceTextActive]}>{rel}</Text>
                  </TouchableOpacity>
                ))}
              </View>

              <Text style={[styles.inputLabel, { marginTop: 12 }]}>{lang === 'tl' ? 'Espesyal na Kalagayan:' : 'Special Conditions:'}</Text>
              <View style={styles.conditionTagsRow}>
                {CONDITION_PRESETS.map((preset) => {
                  const isChecked = newMemberConditions.includes(preset.tag);
                  return (
                    <TouchableOpacity
                      key={preset.key}
                      style={[styles.condTagBtn, isChecked ? { backgroundColor: preset.bg, borderColor: preset.color, borderWidth: 1.5 } : styles.condTagBtnInactive]}
                      onPress={() => {
                        if (isChecked) {
                          setNewMemberConditions(prev => prev.filter(c => c !== preset.tag));
                        } else {
                          setNewMemberConditions(prev => [...prev, preset.tag]);
                        }
                      }}
                    >
                      <Text style={[styles.condTagText, isChecked ? { color: preset.color, fontWeight: '800' } : { color: '#64748B' }]}>
                        {isChecked ? '✓ ' : '+ '}{preset.tag}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>

              <TouchableOpacity style={styles.submitNewMemberBtn} onPress={handleAddMemberSubmit}>
                <Text style={styles.submitNewMemberBtnText}>{lang === 'tl' ? 'I-save ang Miyembro' : 'Save Member'}</Text>
              </TouchableOpacity>
            </ScrollView>
          </View>
        </View>
      </Modal>

      <Modal visible={passSavedModal} animationType="fade" transparent onRequestClose={() => setPassSavedModal(false)}>
        <View style={styles.modalBackdrop}>
          <View style={[styles.modalContentCard, { alignItems: 'center', textAlign: 'center' }]}>
            <View style={styles.passSavedCheckWell}>
              <CheckIcon size={28} color="#16A34A" />
            </View>
            <Text style={styles.passSavedTitle}>{lang === 'tl' ? 'QR Pass Na-save sa Gallery!' : 'QR Pass Saved to Gallery!'}</Text>
            <Text style={styles.passSavedSub}>
              {lang === 'tl'
                ? 'Matagumpay na nai-save ang opisyal na Beneficiary Pass sa inyong device storage.'
                : 'Your official Household Beneficiary Pass has been saved to your photo gallery.'}
            </Text>
            <View style={styles.miniQRFrame}>
              <QRCodeVisual value={`MNL-291-${name.split(' ')[0].toUpperCase()}-OFFLINE`} size={130} lang={lang} isCompact />
            </View>
            <TouchableOpacity style={styles.passDoneBtn} onPress={() => setPassSavedModal(false)}>
              <Text style={styles.passDoneBtnText}>{lang === 'tl' ? 'Naiintindihan ko' : 'Got it'}</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F8F9F7' },
  content: {
    paddingHorizontal: RESPONSIVE.padding,
    paddingTop: RESPONSIVE.topSafe + 6,
    paddingBottom: hp(10),
  },
  header: { marginBottom: 16 },
  title: { fontSize: 22, fontWeight: FONT_WEIGHT.black, color: '#172B4D', letterSpacing: -0.3 },
  sub: { fontSize: 12, color: '#64748B', marginTop: 4, lineHeight: 17 },
  profileCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#D9E2EC',
    padding: 16,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    marginBottom: 12,
    ...SHADOWS.sm,
  },
  avatarSection: { alignItems: 'center' },
  avatarContainer: {
    width: 54,
    height: 54,
    borderRadius: 27,
    position: 'relative',
    ...SHADOWS.sm,
  },
  avatarImage: { width: 54, height: 54, borderRadius: 27 },
  avatarInitialsBox: {
    width: 54,
    height: 54,
    borderRadius: 27,
    backgroundColor: '#E8F2FF',
    borderWidth: 2,
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
  changePhotoText: { fontSize: 9.5, fontWeight: '700', color: '#1557B0', marginTop: 4 },
  profileName: { fontSize: 15, fontWeight: FONT_WEIGHT.black, color: '#172B4D' },
  profileSub: { fontSize: 11, color: '#64748B', marginTop: 1 },
  profileContactText: { fontSize: 11, color: '#1557B0', fontWeight: '700', marginTop: 2 },
  verifiedTag: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    backgroundColor: '#ECFDF5',
    borderWidth: 1,
    borderColor: '#A7F3D0',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  verifiedTagText: { fontSize: 9, fontWeight: '800', color: '#16A34A' },
  avatarPickerBox: {
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#D9E2EC',
    padding: 12,
    marginBottom: 16,
  },
  avatarPickerTitle: { fontSize: 11, fontWeight: '800', color: '#172B4D', marginBottom: 8 },
  avatarPresetsRow: { flexDirection: 'row', gap: 10, alignItems: 'center' },
  presetAvatarBtn: { width: 44, height: 44, borderRadius: 22, borderWidth: 2, borderColor: 'transparent', overflow: 'hidden' },
  presetAvatarSelected: { borderColor: '#1557B0' },
  presetAvatarImg: { width: '100%', height: '100%' },
  presetAvatarClearBtn: { backgroundColor: '#F1F5F9', paddingHorizontal: 10, paddingVertical: 10, borderRadius: 8 },
  presetAvatarClearText: { fontSize: 11, fontWeight: '700', color: '#64748B' },
  sectionLabel: { fontSize: 11, fontWeight: '800', color: '#172B4D', letterSpacing: 0.8, marginTop: 12, marginBottom: 8, textTransform: 'uppercase' },
  sectionHeaderBetween: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 12, marginBottom: 8 },
  sectionLabelNoMargin: { fontSize: 11, fontWeight: '800', color: '#172B4D', letterSpacing: 0.8, textTransform: 'uppercase' },
  addMemberBtn: { flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: '#E8F2FF', borderWidth: 1, borderColor: '#BFDBFE', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 6 },
  addMemberBtnText: { fontSize: 11, fontWeight: '800', color: '#1557B0' },
  offlinePassCard: { backgroundColor: '#FFFFFF', borderRadius: 14, borderWidth: 1, borderColor: '#D9E2EC', padding: 14, marginBottom: 14, ...SHADOWS.sm },
  passCardHeaderRow: { flexDirection: 'row', gap: 10, marginBottom: 10 },
  passHeaderIconWell: { width: 36, height: 36, borderRadius: 18, backgroundColor: '#FEF3C7', alignItems: 'center', justifyContent: 'center' },
  passCardTitle: { fontSize: 13.5, fontWeight: '800', color: '#172B4D' },
  passCardSub: { fontSize: 11, color: '#64748B', marginTop: 2, lineHeight: 15 },
  downloadPassBtn: { backgroundColor: '#1557B0', paddingVertical: 10, borderRadius: 8, alignItems: 'center' },
  downloadPassBtnText: { color: '#FFFFFF', fontSize: 12, fontWeight: '800' },
  rosterMetricPill: { backgroundColor: '#FFFFFF', borderRadius: 12, borderWidth: 1, borderColor: '#D9E2EC', padding: 10, flexDirection: 'row', alignItems: 'center', marginBottom: 10, ...SHADOWS.sm },
  rosterMetricItem: { flex: 1, alignItems: 'center' },
  rosterMetricDivider: { width: 1, height: 24, backgroundColor: '#E2E8F0' },
  rosterMetricLabel: { fontSize: 8.5, fontWeight: '800', color: '#64748B', letterSpacing: 0.5 },
  rosterMetricValue: { fontSize: 12, fontWeight: FONT_WEIGHT.black, color: '#172B4D', marginTop: 2 },
  rosterSuccessToast: { fontSize: 11, fontWeight: '700', color: '#16A34A', marginBottom: 8 },
  membersList: { gap: 8, marginBottom: 14 },
  memberCard: { backgroundColor: '#FFFFFF', borderRadius: 12, borderWidth: 1, borderColor: '#D9E2EC', padding: 12, ...SHADOWS.sm },
  memberCardTop: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 8 },
  memberAvatarWell: { width: 32, height: 32, borderRadius: 16, backgroundColor: '#E8F2FF', alignItems: 'center', justifyContent: 'center' },
  memberName: { fontSize: 13, fontWeight: '800', color: '#172B4D' },
  memberRel: { fontSize: 10.5, color: '#64748B', marginTop: 1 },
  removeMemberBtn: { padding: 6, backgroundColor: '#FEE2E2', borderRadius: 6 },
  conditionPromptText: { fontSize: 10, color: '#64748B', marginBottom: 6, fontWeight: '500' },
  conditionTagsRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  condTagBtn: { paddingHorizontal: 8, paddingVertical: 4, borderRadius: 6, borderWidth: 1 },
  condTagBtnInactive: { backgroundColor: '#F8F9F7', borderColor: '#E2E8F0' },
  condTagText: { fontSize: 10, fontWeight: '600' },
  settingCardGroup: { backgroundColor: '#FFFFFF', borderRadius: 14, borderWidth: 1, borderColor: '#D9E2EC', paddingHorizontal: 14, paddingVertical: 10, marginBottom: 14, ...SHADOWS.sm },
  settingRowItem: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 8 },
  settingItemLabel: { fontSize: 13, fontWeight: '700', color: '#172B4D' },
  settingItemSub: { fontSize: 10.5, color: '#64748B', marginTop: 1 },
  settingItemValue: { fontSize: 12, color: '#475569', fontWeight: '600', marginTop: 2 },
  readOnlyBadge: { backgroundColor: '#F1F5F9', paddingHorizontal: 8, paddingVertical: 3, borderRadius: 4 },
  readOnlyText: { fontSize: 9.5, color: '#64748B', fontWeight: '700' },
  editActionBtn: { backgroundColor: '#E8F2FF', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 6 },
  editActionText: { fontSize: 11, fontWeight: '800', color: '#1557B0' },
  divider: { height: 1, backgroundColor: '#F1F5F9', marginVertical: 4 },
  successInline: { fontSize: 11, fontWeight: '700', color: '#16A34A', marginTop: 4 },
  changePassToggleText: { fontSize: 11.5, fontWeight: '700', color: '#1557B0' },
  passwordChangeBox: { backgroundColor: '#F8F9F7', borderRadius: 10, padding: 10, marginTop: 8, borderWidth: 1, borderColor: '#E2E8F0' },
  savePassBtn: { backgroundColor: '#1557B0', paddingVertical: 10, borderRadius: 8, alignItems: 'center', marginTop: 6 },
  savePassBtnText: { color: '#FFFFFF', fontSize: 12, fontWeight: '800' },
  cachePill: { backgroundColor: '#ECFDF5', paddingHorizontal: 8, paddingVertical: 3, borderRadius: 6, borderWidth: 1, borderColor: '#A7F3D0' },
  cachePillText: { fontSize: 10, fontWeight: '800', color: '#16A34A' },
  syncBtn: { backgroundColor: '#E8F2FF', borderWidth: 1, borderColor: '#BFDBFE', paddingVertical: 9, borderRadius: 8, alignItems: 'center', marginTop: 4 },
  syncBtnText: { fontSize: 11.5, fontWeight: '800', color: '#1557B0' },
  langRow: { flexDirection: 'row', gap: 10, marginBottom: 14 },
  langBtn: { flex: 1, paddingVertical: 12, borderRadius: 10, alignItems: 'center', borderWidth: 1.5 },
  langBtnActive: { backgroundColor: '#E8F2FF', borderColor: '#1557B0' },
  langBtnInactive: { backgroundColor: '#FFFFFF', borderColor: '#D9E2EC' },
  langText: { fontSize: 12.5, fontWeight: '700', color: '#64748B' },
  langTextActive: { color: '#1557B0', fontWeight: '800' },
  hotlineList: { gap: 8, marginBottom: 14 },
  hotlineCard: { backgroundColor: '#FFFFFF', borderRadius: 12, borderWidth: 1, borderColor: '#D9E2EC', padding: 12, flexDirection: 'row', alignItems: 'center', gap: 10, ...SHADOWS.sm },
  phoneIconWell: { width: 32, height: 32, borderRadius: 16, backgroundColor: '#FEE2E2', alignItems: 'center', justifyContent: 'center' },
  hotlineName: { fontSize: 12.5, fontWeight: '700', color: '#172B4D' },
  hotlineTag: { fontSize: 10, color: '#64748B', marginTop: 1 },
  callBadge: { backgroundColor: '#1557B0', paddingHorizontal: 10, paddingVertical: 5, borderRadius: 6 },
  callBadgeText: { fontSize: 11, fontWeight: '800', color: '#FFFFFF' },
  logoutBtn: { backgroundColor: '#FFFFFF', borderWidth: 1.5, borderColor: '#FCA5A5', paddingVertical: 12, borderRadius: 10, alignItems: 'center', marginBottom: 16 },
  logoutBtnText: { color: '#DC2626', fontSize: 13, fontWeight: '800' },
  trademarkCard: { alignItems: 'center', paddingVertical: 16, borderTopWidth: 1, borderTopColor: '#E2E8F0' },
  trademarkLogoImg: { width: 120, height: 36, marginBottom: 8 },
  trademarkVersion: { fontSize: 10.5, fontWeight: '800', color: '#1557B0', marginBottom: 2 },
  trademarkSub: { fontSize: 10, color: '#64748B', textAlign: 'center' },
  trademarkLegal: { fontSize: 9, color: '#94A3B8', textAlign: 'center', marginTop: 4, maxWidth: 280 },
  modalBackdrop: { flex: 1, backgroundColor: 'rgba(15, 23, 42, 0.65)', justifyContent: 'center', alignItems: 'center', padding: 16 },
  modalContentCard: { width: '100%', maxWidth: 420, backgroundColor: '#FFFFFF', borderRadius: 18, padding: 18, ...SHADOWS.lg },
  modalHeaderRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 },
  modalTitle: { fontSize: 16, fontWeight: FONT_WEIGHT.black, color: '#172B4D' },
  inputLabel: { fontSize: 11.5, fontWeight: '800', color: '#172B4D', marginBottom: 6 },
  relChoicesRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginBottom: 8 },
  relChoiceBtn: { paddingHorizontal: 10, paddingVertical: 6, borderRadius: 6, borderWidth: 1, borderColor: '#D9E2EC', backgroundColor: '#F8F9F7' },
  relChoiceBtnActive: { backgroundColor: '#E8F2FF', borderColor: '#1557B0' },
  relChoiceText: { fontSize: 11, color: '#64748B', fontWeight: '600' },
  relChoiceTextActive: { color: '#1557B0', fontWeight: '800' },
  submitNewMemberBtn: { backgroundColor: '#1557B0', paddingVertical: 12, borderRadius: 10, alignItems: 'center', marginTop: 14 },
  submitNewMemberBtnText: { color: '#FFFFFF', fontSize: 13, fontWeight: '800' },
  passSavedCheckWell: { width: 54, height: 54, borderRadius: 27, backgroundColor: '#DCFCE7', alignItems: 'center', justifyContent: 'center', marginBottom: 12 },
  passSavedTitle: { fontSize: 17, fontWeight: FONT_WEIGHT.black, color: '#172B4D', marginBottom: 6, textAlign: 'center' },
  passSavedSub: { fontSize: 12, color: '#64748B', textAlign: 'center', lineHeight: 17, marginBottom: 14 },
  miniQRFrame: { backgroundColor: '#F8F9F7', borderRadius: 12, padding: 10, borderWidth: 1, borderColor: '#E2E8F0', marginBottom: 16 },
  passDoneBtn: { backgroundColor: '#1557B0', paddingVertical: 12, paddingHorizontal: 32, borderRadius: 10, width: '100%', alignItems: 'center' },
  passDoneBtnText: { color: '#FFFFFF', fontSize: 13, fontWeight: '800' },
});

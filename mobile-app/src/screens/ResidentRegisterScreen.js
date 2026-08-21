import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
  Image,
  Platform,
  TextInput,
} from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import NeumorphicInput from '../components/NeumorphicInput';
import {
  CheckIcon,
  CloseIcon,
  MapPinIcon,
  ArrowLeftIcon,
  CameraIcon,
  ImageIcon,
  TrashIcon,
  SearchIcon,
} from '../components/AppIcons';
import { FONT_WEIGHT, SHADOWS, RESPONSIVE, hp } from '../theme';
import { registerUser } from '../services/api';
import { MotionPressable } from '../components/motion';

const MANILA_BARANGAYS = [
  { code: '291', name: 'Barangay 291 (Zone 27, Manila District III)' },
  { code: '292', name: 'Barangay 292 (Zone 27, Manila District III)' },
  { code: '293', name: 'Barangay 293 (Zone 27, Manila District III)' },
  { code: '294', name: 'Barangay 294 (Zone 27, Manila District III)' },
  { code: '295', name: 'Barangay 295 (Zone 27, Manila District III)' },
  { code: '296', name: 'Barangay 296 (Zone 28, Manila District III)' },
  { code: '297', name: 'Barangay 297 (Zone 28, Manila District III)' },
  { code: '298', name: 'Barangay 298 (Zone 28, Manila District III)' },
  { code: '299', name: 'Barangay 299 (Zone 28, Manila District III)' },
  { code: '300', name: 'Barangay 300 (Zone 28, Manila District III)' },
  { code: '301', name: 'Barangay 301 (Zone 28, Manila District III)' },
  { code: '302', name: 'Barangay 302 (Zone 28, Manila District III)' },
  { code: '303', name: 'Barangay 303 (Zone 28, Manila District III)' },
  { code: '304', name: 'Barangay 304 (Zone 28, Manila District III)' },
  { code: '305', name: 'Barangay 305 (Zone 28, Manila District III)' },
  { code: '310', name: 'Barangay 310 (Zone 29, Manila District III)' },
  { code: '311', name: 'Barangay 311 (Zone 29, Manila District III)' },
  { code: '312', name: 'Barangay 312 (Zone 29, Manila District III)' },
  { code: '400', name: 'Barangay 400 (Zone 41, Sampaloc, District IV)' },
  { code: '401', name: 'Barangay 401 (Zone 41, Sampaloc, District IV)' },
  { code: '500', name: 'Barangay 500 (Zone 49, Manila District V)' },
  { code: '600', name: 'Barangay 600 (Zone 59, Santa Mesa, District VI)' },
  { code: '700', name: 'Barangay 700 (Zone 76, Malate, District V)' },
  { code: '800', name: 'Barangay 800 (Zone 87, San Andres, District V)' },
];

function PasswordRulesBox({ password, lang, hasLowercase, hasUppercase, hasNumber, hasMinLength }) {
  if (password.length === 0) return null;
  return (
    <View style={styles.passwordRulesBox}>
      <Text style={styles.passwordRulesTitle}>
        {lang === 'tl' ? 'DAPAT MAGLAMAN ANG PASSWORD NG:' : 'PASSWORD MUST CONTAIN:'}
      </Text>
      <View style={styles.ruleItem}>
        <Text style={[styles.ruleIcon, hasLowercase ? styles.ruleIconValid : styles.ruleIconInvalid]}>
          {hasLowercase ? '✓' : '✖'}
        </Text>
        <Text style={[styles.ruleText, hasLowercase ? styles.ruleTextValid : styles.ruleTextInvalid]}>
          {lang === 'tl' ? 'Kahit isang maliit na titik (lowercase)' : 'At least one lowercase letter'}
        </Text>
      </View>
      <View style={styles.ruleItem}>
        <Text style={[styles.ruleIcon, hasUppercase ? styles.ruleIconValid : styles.ruleIconInvalid]}>
          {hasUppercase ? '✓' : '✖'}
        </Text>
        <Text style={[styles.ruleText, hasUppercase ? styles.ruleTextValid : styles.ruleTextInvalid]}>
          {lang === 'tl' ? 'Kahit isang malaking titik (uppercase)' : 'At least one uppercase letter'}
        </Text>
      </View>
      <View style={styles.ruleItem}>
        <Text style={[styles.ruleIcon, hasNumber ? styles.ruleIconValid : styles.ruleIconInvalid]}>
          {hasNumber ? '✓' : '✖'}
        </Text>
        <Text style={[styles.ruleText, hasNumber ? styles.ruleTextValid : styles.ruleTextInvalid]}>
          {lang === 'tl' ? 'Kahit isang numero (0-9)' : 'At least one number (0-9)'}
        </Text>
      </View>
      <View style={styles.ruleItem}>
        <Text style={[styles.ruleIcon, hasMinLength ? styles.ruleIconValid : styles.ruleIconInvalid]}>
          {hasMinLength ? '✓' : '✖'}
        </Text>
        <Text style={[styles.ruleText, hasMinLength ? styles.ruleTextValid : styles.ruleTextInvalid]}>
          {lang === 'tl' ? 'Minimum 8 characters' : 'Minimum 8 characters'}
        </Text>
      </View>
    </View>
  );
}

export default function ResidentRegisterScreen({ onRegisterSuccess, onBack, lang = 'en' }) {
  const [step, setStep] = useState(1);

  // Step 1: Head of Household info & ID
  const [name, setName] = useState('');
  const [emailOrPhone, setEmailOrPhone] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [idType, setIdType] = useState('National ID / PhilID');
  const [idPhoto, setIdPhoto] = useState(null);
  const [idPhotoName, setIdPhotoName] = useState('');

  // Step 2: Address & Household composition
  const [selectedBrgyCode, setSelectedBrgyCode] = useState('291');
  const [address, setAddress] = useState('');
  const [purok, setPurok] = useState('Purok 3');
  const [showBrgyList, setShowBrgyList] = useState(false);
  const [brgySearch, setBrgySearch] = useState('');

  // Dynamic Family Members Roster List
  const [membersList, setMembersList] = useState([
    { id: 'head_1', name: 'Head of Household (You)', age: '35', relationship: 'Head of Household', condition: 'none' },
  ]);
  const [newMemberName, setNewMemberName] = useState('');
  const [newMemberAge, setNewMemberAge] = useState('');
  const [newMemberRel, setNewMemberRel] = useState('Child');
  const [newMemberCondition, setNewMemberCondition] = useState('none');
  const [showAddMemberModal, setShowAddMemberModal] = useState(false);

  const [certified, setCertified] = useState(true);
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState({});

  const filteredBarangays = MANILA_BARANGAYS.filter(b =>
    b.name.toLowerCase().includes(brgySearch.toLowerCase()) ||
    b.code.includes(brgySearch)
  );

  const totalHeadcount = membersList.length;
  const pwdCount = membersList.filter(m => m.condition === 'pwd').length;
  const pregnantCount = membersList.filter(m => m.condition === 'pregnant').length;
  const seniorCount = membersList.filter(m => m.condition === 'senior' || (parseInt(m.age, 10) >= 60)).length;
  const infantCount = membersList.filter(m => m.condition === 'child' || (parseInt(m.age, 10) <= 5)).length;

  const hasLowercase = /[a-z]/.test(password);
  const hasUppercase = /[A-Z]/.test(password);
  const hasNumber = /[0-9]/.test(password);
  const hasMinLength = password.length >= 8;
  const isPasswordValid = hasLowercase && hasUppercase && hasNumber && hasMinLength;

  const handlePickIdFromCamera = async () => {
    try {
      if (Platform.OS !== 'web') {
        const { status } = await ImagePicker.requestCameraPermissionsAsync();
        if (status !== 'granted') {
          Alert.alert(
            lang === 'tl' ? 'Pahintulot sa Camera' : 'Camera Permission',
            lang === 'tl' ? 'Kailangan ng pahintulot sa camera.' : 'Camera permission is required.'
          );
          return;
        }
        const result = await ImagePicker.launchCameraAsync({
          mediaTypes: ['images'],
          allowsEditing: true,
          quality: 0.7,
          base64: true,
        });
        if (!result.canceled && result.assets && result.assets.length > 0) {
          const asset = result.assets[0];
          setIdPhoto(asset.base64 ? `data:image/jpeg;base64,${asset.base64}` : asset.uri);
          setIdPhotoName('camera_valid_id.jpg');
          setErrors(prev => ({ ...prev, idPhoto: '' }));
        }
      }
    } catch (e) {
      console.warn('Camera error:', e);
    }
  };

  const handlePickIdFromLibrary = async () => {
    try {
      if (Platform.OS !== 'web') {
        const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
        if (status !== 'granted') {
          Alert.alert(
            lang === 'tl' ? 'Pahintulot sa Gallery' : 'Gallery Permission',
            lang === 'tl' ? 'Kailangan ng pahintulot sa gallery.' : 'Gallery permission is required.'
          );
          return;
        }
        const result = await ImagePicker.launchImageLibraryAsync({
          mediaTypes: ['images'],
          allowsEditing: true,
          quality: 0.7,
          base64: true,
        });
        if (!result.canceled && result.assets && result.assets.length > 0) {
          const asset = result.assets[0];
          setIdPhoto(asset.base64 ? `data:image/jpeg;base64,${asset.base64}` : asset.uri);
          setIdPhotoName(asset.fileName || 'gallery_valid_id.jpg');
          setErrors(prev => ({ ...prev, idPhoto: '' }));
        }
      }
    } catch (e) {
      console.warn('Gallery error:', e);
    }
  };

  const validateStep1 = () => {
    const errs = {};
    if (!name.trim() || name.trim().length < 3) {
      errs.name = lang === 'tl' ? 'Kailangang may minimum 3 characters ang pangalan.' : 'Full name must be at least 3 characters.';
    }
    if (!emailOrPhone.trim()) {
      errs.emailOrPhone = lang === 'tl' ? 'Pakilagay ang email o mobile number.' : 'Please enter email or mobile number.';
    }
    if (!password || !isPasswordValid) {
      errs.password = lang === 'tl' ? 'Pakisunod ang checklist sa password.' : 'Please fulfill all password requirements.';
    }
    if (!confirmPassword || password !== confirmPassword) {
      errs.confirmPassword = lang === 'tl' ? 'Hindi magkatugma ang password.' : 'Passwords do not match.';
    }
    if (!idType.trim()) {
      errs.idType = lang === 'tl' ? 'Pakilagay ang uri ng valid ID.' : 'Please specify valid ID type.';
    }
    setErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const validateStep2 = () => {
    const errs = {};
    if (!address.trim() || address.trim().length < 5) {
      errs.address = lang === 'tl' ? 'Pakilagay ang kumpletong address.' : 'Please enter complete street address.';
    }
    if (!purok.trim()) {
      errs.purok = lang === 'tl' ? 'Pakilagay ang Purok o Zone.' : 'Please enter Purok or Zone.';
    }
    if (membersList.length < 1) {
      errs.members = lang === 'tl' ? 'Kailangang may kahit 1 miyembro.' : 'Must have at least 1 member.';
    }
    if (!certified) {
      errs.certified = lang === 'tl' ? 'Kailangang patotohanan ang impormasyon.' : 'You must certify the information.';
    }
    setErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const handleAddMember = () => {
    const trimmedName = newMemberName.trim();
    if (!trimmedName || trimmedName.length < 2 || /\d/.test(trimmedName)) {
      Alert.alert(lang === 'tl' ? 'Maling Pangalan' : 'Invalid Name', lang === 'tl' ? 'Maglagay ng wastong pangalan.' : 'Please enter a valid name.');
      return;
    }
    const ageNum = newMemberCondition === 'child' ? 0 : parseInt(newMemberAge, 10) || 0;
    const newEntry = {
      id: `m_${Date.now()}`,
      name: trimmedName,
      age: String(ageNum),
      relationship: newMemberRel.trim() || 'Child',
      condition: newMemberCondition,
    };
    setMembersList([...membersList, newEntry]);
    setNewMemberName('');
    setNewMemberAge('');
    setNewMemberRel('Child');
    setNewMemberCondition('none');
    setShowAddMemberModal(false);
  };

  const handleRegister = async () => {
    if (!validateStep2()) return;
    setLoading(true);
    try {
      const formattedMembers = membersList.map(m => ({
        name: m.name,
        age: parseInt(m.age, 10) || 30,
        relationship: m.relationship,
        specialConditions: m.condition !== 'none' ? [m.condition] : [],
      }));

      const payload = {
        name: name.trim(),
        emailOrPhone: emailOrPhone.trim(),
        password,
        role: 'resident',
        barangayCode: selectedBrgyCode,
        address: address.trim(),
        purok: purok.trim(),
        memberCount: totalHeadcount,
        members: formattedMembers,
        validIdType: idType || 'Government ID',
        validIdImage: idPhoto || null,
        validIdNumber: '',
        pwdCount,
        pregnantCount,
        seniorCount,
        infantCount,
      };

      const res = await registerUser(payload);
      if (res && res.token) {
        const userObj = res.user || {
          _id: res._id,
          name: res.name,
          emailOrPhone: res.emailOrPhone,
          role: res.role || 'resident',
          barangayCode: res.barangayCode,
        };
        onRegisterSuccess({
          token: res.token,
          user: userObj,
          role: userObj.role || 'resident',
          household: res.household || null,
          name: userObj.name || res.name,
          barangayCode: userObj.barangayCode || res.barangayCode,
        });
      } else {
        Alert.alert('Error', res?.message || (lang === 'tl' ? 'Hindi makapag-register.' : 'Registration failed.'));
      }
    } catch (err) {
      Alert.alert('Error', lang === 'tl' ? 'Hindi makapag-register.' : 'Registration failed.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
      <View style={styles.topHeader}>
        <TouchableOpacity
          style={styles.backBtn}
          onPress={step === 2 ? () => setStep(1) : onBack}
          activeOpacity={0.8}
        >
          <ArrowLeftIcon size={16} color="#1557B0" />
          <Text style={styles.backBtnText}>
            {step === 2 ? (lang === 'tl' ? 'Bumalik sa Hakbang 1' : 'Back to Step 1') : (lang === 'tl' ? 'Bumalik sa Login' : 'Back to Sign In')}
          </Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>
          {lang === 'tl' ? 'Pagpaparehistro ng Pamilya' : 'Household Registration'}
        </Text>
        <Text style={styles.stepCounterText}>
          {lang === 'tl'
            ? `Hakbang ${step} ng 2: ${step === 1 ? 'Punong-Pamilya at ID' : 'Miyembro ng Pamilya at Address'}`
            : `Step ${step} of 2: ${step === 1 ? 'Head of Household & ID' : 'Family Members & Address'}`}
        </Text>
      </View>

      <View style={styles.stepperContainer}>
        <View style={[styles.stepSegment, step >= 1 && styles.stepSegmentActive]}>
          <Text style={[styles.stepSegmentText, step >= 1 && styles.stepSegmentTextActive]}>
            {lang === 'tl' ? '1. Punong-Pamilya at ID' : '1. Head of Household & ID'}
          </Text>
        </View>
        <View style={[styles.stepSegment, step >= 2 && styles.stepSegmentActive]}>
          <Text style={[styles.stepSegmentText, step >= 2 && styles.stepSegmentTextActive]}>
            {lang === 'tl' ? '2. Talaan ng Pamilya at Address' : '2. Family Roster & Address'}
          </Text>
        </View>
      </View>

      <View style={styles.registerCard}>
        {step === 1 ? (
          <View>
            <View style={styles.cardHeaderGroup}>
              <Text style={styles.cardTitle}>
                {lang === 'tl' ? 'Impormasyon ng Punong-Pamilya' : 'Head of Household Information'}
              </Text>
              <Text style={styles.cardSub}>
                {lang === 'tl'
                  ? 'Ilagay ang detalye ng Punong-Pamilya na siyang kukuha ng ayuda.'
                  : 'Enter primary Head of Household information who will claim relief.'}
              </Text>
            </View>

            <NeumorphicInput
              label={lang === 'tl' ? 'Buong Pangalan ng Punong-Pamilya' : 'Full Name of Head of Household'}
              value={name}
              onChangeText={setName}
              placeholder="e.g. Juan Dela Cruz"
              errorText={errors.name}
              required
            />

            <NeumorphicInput
              label={lang === 'tl' ? 'Email o 11-Digit Mobile Number' : 'Email Address or Mobile Number'}
              value={emailOrPhone}
              onChangeText={setEmailOrPhone}
              placeholder="youremail@gmail.com"
              errorText={errors.emailOrPhone}
              required
              keyboardType="email-address"
              autoCapitalize="none"
            />

            <NeumorphicInput
              label={lang === 'tl' ? 'Gumawa ng Password ng Account' : 'Create Account Password'}
              value={password}
              onChangeText={setPassword}
              placeholder="••••••••"
              errorText={errors.password}
              required
              secureTextEntry
            />

            <PasswordRulesBox
              password={password}
              lang={lang}
              hasLowercase={hasLowercase}
              hasUppercase={hasUppercase}
              hasNumber={hasNumber}
              hasMinLength={hasMinLength}
            />

            <NeumorphicInput
              label={lang === 'tl' ? 'Kumpirmahin ang Password' : 'Confirm Account Password'}
              value={confirmPassword}
              onChangeText={setConfirmPassword}
              placeholder="••••••••"
              errorText={errors.confirmPassword}
              required
              secureTextEntry
            />

            <NeumorphicInput
              label={lang === 'tl' ? 'Uri ng Valid Government ID' : 'Valid Government ID Type'}
              value={idType}
              onChangeText={setIdType}
              placeholder="e.g. National ID / PhilID, Driver License, etc."
              errorText={errors.idType}
              required
            />

            <View style={styles.idUploadSection}>
              <View style={styles.idUploadHeaderRow}>
                <Text style={styles.idUploadLabel}>
                  {lang === 'tl' ? 'LITRATO NG VALID GOVERNMENT ID *' : 'VALID GOVERNMENT ID PHOTO *'}
                </Text>
                <Text style={styles.idUploadRequiredTag}>
                  {idPhoto ? (lang === 'tl' ? 'NA-UPLOAD NA ✓' : 'UPLOADED ✓') : (lang === 'tl' ? 'KAILANGAN *' : 'REQUIRED *')}
                </Text>
              </View>
              <Text style={styles.idUploadSub}>
                {lang === 'tl' ? 'Kumuha ng malinaw na litrato ng inyong ID.' : 'Take a clear photo of your ID.'}
              </Text>

              {idPhoto ? (
                <View style={styles.idPreviewContainer}>
                  <Image source={{ uri: idPhoto }} style={styles.idPreviewImg} resizeMode="cover" />
                  <View style={styles.idPreviewMeta}>
                    <Text style={styles.idPreviewSuccessText}>{lang === 'tl' ? 'Nai-upload ang ID' : 'ID Photo Attached'}</Text>
                    <Text style={styles.idPreviewFileName} numberOfLines={1}>{idPhotoName || 'valid_id.jpg'}</Text>
                  </View>
                  <TouchableOpacity onPress={() => setIdPhoto(null)} style={styles.idRemoveBtn}>
                    <TrashIcon size={13} color="#DC2626" />
                    <Text style={styles.idRemoveBtnText}>{lang === 'tl' ? 'Alisin' : 'Remove'}</Text>
                  </TouchableOpacity>
                </View>
              ) : (
                <View style={styles.idUploadBtnRow}>
                  <TouchableOpacity style={styles.idCameraBtn} onPress={handlePickIdFromCamera} activeOpacity={0.85}>
                    <CameraIcon size={20} color="#1557B0" />
                    <Text style={styles.idBtnMainText}>{lang === 'tl' ? 'Kumuha sa Camera' : 'Take with Camera'}</Text>
                  </TouchableOpacity>
                  <TouchableOpacity style={styles.idGalleryBtn} onPress={handlePickIdFromLibrary} activeOpacity={0.85}>
                    <ImageIcon size={20} color="#475569" />
                    <Text style={styles.idBtnMainText}>{lang === 'tl' ? 'Pumili sa Gallery' : 'Choose from Gallery'}</Text>
                  </TouchableOpacity>
                </View>
              )}
            </View>

            <MotionPressable
              style={styles.submitBtn}
              onPress={() => {
                if (validateStep1()) setStep(2);
              }}
              activeOpacity={0.85}
            >
              <Text style={styles.submitBtnText}>
                {lang === 'tl' ? 'Magpatuloy sa Talaan ng Pamilya (Hakbang 2)' : 'Continue to Family Roster (Step 2)'}
              </Text>
            </MotionPressable>
          </View>
        ) : (
          <View>
            <View style={styles.cardHeaderGroup}>
              <Text style={styles.cardTitle}>
                {lang === 'tl' ? 'Talaan ng Pamilya at Tirahan' : 'Household Composition & Address'}
              </Text>
              <Text style={styles.cardSub}>
                {lang === 'tl'
                  ? 'Awtomatikong kinakalkula ang inyong quota ng ayuda batay sa bilang ng miyembro.'
                  : 'Your relief quota allocation is automatically calculated based on headcount.'}
              </Text>
            </View>

            <View style={styles.brgySection}>
              <Text style={styles.brgyLabel}>BARANGAY IN MANILA *</Text>
              <TouchableOpacity
                style={styles.brgySelectorBtn}
                onPress={() => setShowBrgyList(!showBrgyList)}
                activeOpacity={0.8}
              >
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, flex: 1, paddingRight: 6 }}>
                  <MapPinIcon size={14} color="#1557B0" />
                  <Text style={styles.brgySelectorText} numberOfLines={1}>
                    {MANILA_BARANGAYS.find(b => b.code === selectedBrgyCode)?.name || `Barangay ${selectedBrgyCode}`}
                  </Text>
                </View>
                <Text style={styles.brgyChangeText}>{showBrgyList ? 'Close ▲' : 'Change ▼'}</Text>
              </TouchableOpacity>

              {showBrgyList && (
                <View style={styles.brgyDropdown}>
                  <View style={styles.brgySearchContainer}>
                    <SearchIcon size={15} color="#1557B0" />
                    <TextInput
                      style={styles.brgySearchInput}
                      placeholder={lang === 'tl' ? 'Maghanap...' : 'Search...'}
                      placeholderTextColor="#94A3B8"
                      value={brgySearch}
                      onChangeText={setBrgySearch}
                    />
                  </View>
                  <ScrollView style={styles.brgyScrollContainer} nestedScrollEnabled keyboardShouldPersistTaps="handled">
                    {filteredBarangays.map(b => (
                      <TouchableOpacity
                        key={b.code}
                        style={[styles.brgyOption, selectedBrgyCode === b.code && styles.brgyOptionSelected]}
                        onPress={() => {
                          setSelectedBrgyCode(b.code);
                          setShowBrgyList(false);
                        }}
                      >
                        <Text style={[styles.brgyOptionText, selectedBrgyCode === b.code && styles.brgyOptionTextSelected]}>
                          {b.name}
                        </Text>
                        {selectedBrgyCode === b.code && <CheckIcon size={14} color="#1557B0" />}
                      </TouchableOpacity>
                    ))}
                  </ScrollView>
                </View>
              )}
            </View>

            <NeumorphicInput
              label={lang === 'tl' ? 'Address ng Bahay' : 'Street Address'}
              value={address}
              onChangeText={setAddress}
              placeholder="e.g. 123 Calle Real"
              errorText={errors.address}
              required
            />

            <NeumorphicInput
              label={lang === 'tl' ? 'Purok / Zone' : 'Purok / Zone'}
              value={purok}
              onChangeText={setPurok}
              placeholder="e.g. Purok 3"
              errorText={errors.purok}
              required
            />

            <View style={styles.metricsStrip}>
              <View style={styles.metricPill}>
                <Text style={styles.metricPillLabel}>{lang === 'tl' ? 'KABUUANG MIYEMBRO' : 'TOTAL HEADCOUNT'}</Text>
                <Text style={styles.metricPillValue}>{totalHeadcount}</Text>
              </View>
              <View style={styles.metricPill}>
                <Text style={styles.metricPillLabel}>{lang === 'tl' ? 'SENIOR' : 'SENIOR'}</Text>
                <Text style={[styles.metricPillValue, seniorCount > 0 && { color: '#D97706' }]}>{seniorCount}</Text>
              </View>
              <View style={styles.metricPill}>
                <Text style={styles.metricPillLabel}>{lang === 'tl' ? 'PWD' : 'PWD'}</Text>
                <Text style={[styles.metricPillValue, pwdCount > 0 && { color: '#DC2626' }]}>{pwdCount}</Text>
              </View>
              <View style={styles.metricPill}>
                <Text style={styles.metricPillLabel}>{lang === 'tl' ? 'BUNTIS / SANGGOL' : 'INFANT'}</Text>
                <Text style={[styles.metricPillValue, (pregnantCount + infantCount) > 0 && { color: '#1557B0' }]}>
                  {pregnantCount + infantCount}
                </Text>
              </View>
            </View>

            <View style={styles.rosterSectionHeader}>
              <Text style={styles.rosterSectionTitle}>
                {lang === 'tl' ? `Talaan ng Miyembro (${totalHeadcount})` : `Household Members (${totalHeadcount})`}
              </Text>
              <TouchableOpacity
                style={styles.addMemberBtn}
                onPress={() => setShowAddMemberModal(true)}
                activeOpacity={0.8}
              >
                <Text style={styles.addMemberBtnText}>{lang === 'tl' ? '+ Dagdag' : '+ Add Member'}</Text>
              </TouchableOpacity>
            </View>

            <View style={styles.membersListContainer}>
              {membersList.map((m, index) => (
                <View key={m.id || index} style={styles.memberCard}>
                  <View style={styles.memberCardTop}>
                    <View style={{ flex: 1 }}>
                      <Text style={styles.memberName}>{m.name} ({m.age} yrs)</Text>
                      <Text style={styles.memberRelText}>{m.relationship}</Text>
                    </View>
                    {index > 0 && (
                      <TouchableOpacity onPress={() => setMembersList(membersList.filter(item => item.id !== m.id))}>
                        <CloseIcon size={14} color="#DC2626" />
                      </TouchableOpacity>
                    )}
                  </View>
                </View>
              ))}
            </View>

            {showAddMemberModal && (
              <View style={styles.addMemberBox}>
                <Text style={styles.addMemberBoxTitle}>{lang === 'tl' ? 'Dagdag Miyembro' : 'Add Member'}</Text>
                <NeumorphicInput
                  label={lang === 'tl' ? 'Pangalan' : 'Name'}
                  value={newMemberName}
                  onChangeText={setNewMemberName}
                  placeholder="e.g. Juanito Santos"
                  required
                />
                <NeumorphicInput
                  label={lang === 'tl' ? 'Edad' : 'Age'}
                  value={newMemberAge}
                  onChangeText={setNewMemberAge}
                  placeholder="e.g. 8"
                  keyboardType="numeric"
                  required
                />
                <View style={{ flexDirection: 'row', gap: 8, marginTop: 10 }}>
                  <TouchableOpacity style={styles.cancelAddBtn} onPress={() => setShowAddMemberModal(false)}>
                    <Text style={styles.cancelAddBtnText}>{lang === 'tl' ? 'Kanselahin' : 'Cancel'}</Text>
                  </TouchableOpacity>
                  <TouchableOpacity style={styles.confirmAddBtn} onPress={handleAddMember}>
                    <Text style={styles.confirmAddBtnText}>{lang === 'tl' ? '+ I-save' : '+ Save'}</Text>
                  </TouchableOpacity>
                </View>
              </View>
            )}

            <TouchableOpacity
              style={styles.certRow}
              onPress={() => setCertified(!certified)}
              activeOpacity={0.8}
            >
              <View style={[styles.checkbox, certified && styles.checkboxActive]}>
                {certified && <CheckIcon size={12} color="#FFFFFF" />}
              </View>
              <Text style={styles.certText}>
                {lang === 'tl'
                  ? 'Pinatutunayan ko na ang lahat ng impormasyon ay totoo at tumpak.'
                  : 'I certify that all information stated above is accurate and truthful.'}
              </Text>
            </TouchableOpacity>

            <MotionPressable
              style={[styles.submitBtn, loading && { opacity: 0.7 }]}
              onPress={handleRegister}
              disabled={loading}
              activeOpacity={0.85}
            >
              {loading ? (
                <ActivityIndicator color="#FFFFFF" />
              ) : (
                <Text style={styles.submitBtnText}>
                  {lang === 'tl' ? 'I-submit ang Pagpaparehistro' : 'Submit Household Registration'}
                </Text>
              )}
            </MotionPressable>
          </View>
        )}
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8F9F7',
  },
  content: {
    paddingHorizontal: RESPONSIVE.padding,
    paddingTop: RESPONSIVE.topSafe + 6,
    paddingBottom: hp(8),
    alignItems: 'center',
  },
  topHeader: {
    width: '100%',
    maxWidth: RESPONSIVE.maxCardWidth,
    marginBottom: 16,
  },
  backBtn: {
    alignSelf: 'flex-start',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#FFFFFF',
    borderWidth: 1.5,
    borderColor: '#CBD5E1',
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 10,
    marginBottom: 12,
    ...SHADOWS.sm,
  },
  backBtnText: {
    fontSize: 12.5,
    fontWeight: '800',
    color: '#1557B0',
  },
  headerTitle: {
    fontSize: 22,
    fontWeight: FONT_WEIGHT.black,
    color: '#172B4D',
    letterSpacing: -0.3,
  },
  stepCounterText: {
    fontSize: 12,
    color: '#64748B',
    marginTop: 2,
    fontWeight: '600',
  },
  stepperContainer: {
    width: '100%',
    maxWidth: RESPONSIVE.maxCardWidth,
    flexDirection: 'row',
    gap: 8,
    marginBottom: 16,
  },
  stepSegment: {
    flex: 1,
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 8,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#D9E2EC',
    alignItems: 'center',
  },
  stepSegmentActive: {
    backgroundColor: '#E8F2FF',
    borderColor: '#1557B0',
  },
  stepSegmentText: {
    fontSize: 11.5,
    fontWeight: '700',
    color: '#64748B',
  },
  stepSegmentTextActive: {
    color: '#1557B0',
    fontWeight: '800',
  },
  registerCard: {
    width: '100%',
    maxWidth: RESPONSIVE.maxCardWidth,
    backgroundColor: '#FFFFFF',
    borderRadius: RESPONSIVE.borderRadius + 2,
    borderWidth: 1,
    borderColor: '#D9E2EC',
    padding: RESPONSIVE.cardPadding,
    ...SHADOWS.md,
  },
  cardHeaderGroup: {
    borderBottomWidth: 1,
    borderBottomColor: '#EDF2F7',
    paddingBottom: 12,
    marginBottom: 16,
  },
  cardTitle: {
    fontSize: 16,
    fontWeight: FONT_WEIGHT.black,
    color: '#172B4D',
  },
  cardSub: {
    fontSize: 11.5,
    color: '#64748B',
    marginTop: 2,
    lineHeight: 16,
  },
  brgySection: {
    marginBottom: 14,
  },
  brgyLabel: {
    fontSize: 10.5,
    fontWeight: '800',
    color: '#172B4D',
    letterSpacing: 0.6,
    marginBottom: 6,
  },
  brgySelectorBtn: {
    backgroundColor: '#FFFFFF',
    borderWidth: 1.5,
    borderColor: '#1557B0',
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 12,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  brgySelectorText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#172B4D',
  },
  brgyChangeText: {
    fontSize: 11,
    color: '#1557B0',
    fontWeight: '800',
  },
  brgyDropdown: {
    backgroundColor: '#FFFFFF',
    borderRadius: 10,
    borderWidth: 1.5,
    borderColor: '#BFDBFE',
    marginTop: 6,
    overflow: 'hidden',
    ...SHADOWS.md,
  },
  brgySearchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F8FAFC',
    borderBottomWidth: 1,
    borderBottomColor: '#E2E8F0',
    paddingHorizontal: 12,
    paddingVertical: 8,
    gap: 8,
  },
  brgySearchInput: {
    flex: 1,
    fontSize: 12.5,
    color: '#0F172A',
    paddingVertical: 4,
    paddingHorizontal: 0,
  },
  brgyScrollContainer: {
    maxHeight: 200,
  },
  brgyOption: {
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  brgyOptionSelected: {
    backgroundColor: '#E8F2FF',
  },
  brgyOptionText: {
    fontSize: 12,
    color: '#334155',
    fontWeight: '600',
  },
  brgyOptionTextSelected: {
    color: '#1557B0',
    fontWeight: '800',
  },
  metricsStrip: {
    flexDirection: 'row',
    gap: 6,
    backgroundColor: '#F8F9F7',
    borderRadius: 10,
    padding: 8,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  metricPill: {
    flex: 1,
    alignItems: 'center',
  },
  metricPillLabel: {
    fontSize: 8,
    fontWeight: '800',
    color: '#64748B',
    textAlign: 'center',
  },
  metricPillValue: {
    fontSize: 12,
    fontWeight: FONT_WEIGHT.black,
    color: '#172B4D',
    marginTop: 2,
  },
  rosterSectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
    gap: 8,
  },
  rosterSectionTitle: {
    fontSize: 13,
    fontWeight: '800',
    color: '#172B4D',
  },
  addMemberBtn: {
    backgroundColor: '#E8F2FF',
    borderWidth: 1.5,
    borderColor: '#BFDBFE',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
  },
  addMemberBtnText: {
    fontSize: 11.5,
    fontWeight: '800',
    color: '#1557B0',
  },
  membersListContainer: {
    gap: 8,
    marginBottom: 14,
  },
  memberCard: {
    backgroundColor: '#F8F9F7',
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    padding: 10,
  },
  memberCardTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  memberName: {
    fontSize: 12.5,
    fontWeight: '800',
    color: '#172B4D',
  },
  memberRelText: {
    fontSize: 10.5,
    color: '#64748B',
    marginTop: 1,
  },
  addMemberBox: {
    backgroundColor: '#F1F5F9',
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#CBD5E1',
    padding: 12,
    marginBottom: 14,
  },
  addMemberBoxTitle: {
    fontSize: 12,
    fontWeight: '800',
    color: '#172B4D',
    marginBottom: 8,
  },
  cancelAddBtn: {
    flex: 1,
    backgroundColor: '#E2E8F0',
    paddingVertical: 8,
    borderRadius: 8,
    alignItems: 'center',
  },
  cancelAddBtnText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#64748B',
  },
  confirmAddBtn: {
    flex: 2,
    backgroundColor: '#1557B0',
    paddingVertical: 8,
    borderRadius: 8,
    alignItems: 'center',
  },
  confirmAddBtnText: {
    fontSize: 11,
    fontWeight: '800',
    color: '#FFFFFF',
  },
  certRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginTop: 10,
    marginBottom: 12,
  },
  checkbox: {
    width: 20,
    height: 20,
    borderRadius: 4,
    borderWidth: 1.5,
    borderColor: '#D9E2EC',
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkboxActive: {
    backgroundColor: '#1557B0',
    borderColor: '#1557B0',
  },
  certText: {
    flex: 1,
    fontSize: 11,
    color: '#475569',
    lineHeight: 15,
  },
  submitBtn: {
    backgroundColor: '#1557B0',
    paddingVertical: 14,
    borderRadius: 10,
    alignItems: 'center',
    marginTop: 10,
    ...SHADOWS.sm,
  },
  submitBtnText: {
    color: '#FFFFFF',
    fontSize: 13.5,
    fontWeight: '800',
  },
  passwordRulesBox: {
    backgroundColor: '#F8F9F7',
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    padding: 10,
    marginBottom: 12,
    gap: 4,
  },
  passwordRulesTitle: {
    fontSize: 9.5,
    fontWeight: '800',
    color: '#475569',
    marginBottom: 2,
  },
  ruleItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  ruleIcon: {
    fontSize: 11,
    fontWeight: '800',
    width: 14,
    textAlign: 'center',
  },
  ruleIconValid: {
    color: '#16A34A',
  },
  ruleIconInvalid: {
    color: '#DC2626',
  },
  ruleText: {
    fontSize: 10.5,
  },
  ruleTextValid: {
    color: '#15803D',
    fontWeight: '600',
  },
  ruleTextInvalid: {
    color: '#DC2626',
  },
  idUploadSection: {
    backgroundColor: '#F8F9F7',
    borderRadius: 10,
    borderWidth: 1.5,
    borderColor: '#D9E2EC',
    padding: 12,
    marginBottom: 14,
  },
  idUploadHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 2,
  },
  idUploadLabel: {
    fontSize: 9.5,
    fontWeight: '800',
    color: '#172B4D',
  },
  idUploadRequiredTag: {
    fontSize: 9.5,
    fontWeight: '800',
    color: '#DC2626',
  },
  idUploadSub: {
    fontSize: 10.5,
    color: '#64748B',
    marginBottom: 10,
  },
  idUploadBtnRow: {
    flexDirection: 'row',
    gap: 8,
  },
  idCameraBtn: {
    flex: 1,
    backgroundColor: '#E8F2FF',
    borderWidth: 1.5,
    borderColor: '#BFDBFE',
    borderRadius: 8,
    paddingVertical: 10,
    alignItems: 'center',
  },
  idGalleryBtn: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    borderWidth: 1.5,
    borderColor: '#CBD5E1',
    borderRadius: 8,
    paddingVertical: 10,
    alignItems: 'center',
  },
  idBtnMainText: {
    fontSize: 11,
    fontWeight: '800',
    color: '#1557B0',
    marginTop: 4,
  },
  idPreviewContainer: {
    backgroundColor: '#FFFFFF',
    borderRadius: 8,
    borderWidth: 1.5,
    borderColor: '#16A34A',
    padding: 8,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  idPreviewImg: {
    width: 50,
    height: 36,
    borderRadius: 4,
    backgroundColor: '#E2E8F0',
  },
  idPreviewMeta: {
    flex: 1,
  },
  idPreviewSuccessText: {
    fontSize: 11,
    fontWeight: '800',
    color: '#16A34A',
  },
  idPreviewFileName: {
    fontSize: 9.5,
    color: '#64748B',
  },
  idRemoveBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    backgroundColor: '#FEE2E2',
    borderWidth: 1,
    borderColor: '#FCA5A5',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4,
  },
  idRemoveBtnText: {
    fontSize: 10,
    fontWeight: '800',
    color: '#DC2626',
  },
});

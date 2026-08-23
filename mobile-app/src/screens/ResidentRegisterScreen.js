import React, { useState, useMemo } from 'react';
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
  Modal,
  KeyboardAvoidingView,
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
  ShieldCheckIcon,
} from '../components/AppIcons';
import { FONT_WEIGHT, SHADOWS, RESPONSIVE, hp } from '../theme';
import { registerUser } from '../services/api';
import { API_BASE_URL } from '../config';
import { MotionPressable } from '../components/motion';
import { ALL_MANILA_BARANGAYS } from '../data/manilaBarangays';

export const PHILIPPINE_GOVERNMENT_IDS = [
  'Philippine National ID (PhilSys / PhilID)',
  "Driver's License (LTO)",
  'Philippine Passport (DFA)',
  'SSS / UMID Card',
  'GSIS eCard',
  "Voter's ID / Certificate (COMELEC)",
  'PRC ID (Professional Regulation Commission)',
  'Senior Citizen ID (OSCA)',
  'Person with Disability (PWD) ID',
  'Barangay ID / Certificate of Residency',
  'Postal ID (PhilPost)',
  'PhilHealth ID',
  'Solo Parent ID',
  'Pag-IBIG / HDMF Loyalty Card',
  'NBI Clearance / Police Clearance',
  'Student / School ID',
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
  const [headAge, setHeadAge] = useState('');
  const [headCondition, setHeadCondition] = useState('none');
  const [emailOrPhone, setEmailOrPhone] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [idType, setIdType] = useState('Philippine National ID (PhilSys / PhilID)');
  const [showIdTypeModal, setShowIdTypeModal] = useState(false);
  const [idNumber, setIdNumber] = useState('');
  const [idPhoto, setIdPhoto] = useState(null);
  const [idPhotoName, setIdPhotoName] = useState('');

  // Step 2: Address & Household composition
  const [selectedBrgyCode, setSelectedBrgyCode] = useState('291');
  const [address, setAddress] = useState('');
  const [purok, setPurok] = useState('Purok 3');
  const [showBrgyList, setShowBrgyList] = useState(false);
  const [brgySearch, setBrgySearch] = useState('');

  // Dynamic Family Members Roster List (Populated from Head of Household + Added Members)
  const [membersList, setMembersList] = useState([]);
  const [newMemberName, setNewMemberName] = useState('');
  const [newMemberAge, setNewMemberAge] = useState('');
  const [newMemberRel, setNewMemberRel] = useState('Child');
  const [newMemberCondition, setNewMemberCondition] = useState('none'); // 'none' | 'senior' | 'pwd' | 'pregnant' | 'infant'
  const [showAddMemberModal, setShowAddMemberModal] = useState(false);

  const [certified, setCertified] = useState(true);
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState({});

  // OTP Phone Verification Modal states
  const [showOtpModal, setShowOtpModal] = useState(false);
  const [otpDigits, setOtpDigits] = useState(['', '', '', '', '', '']);
  const [fallbackOtp, setFallbackOtp] = useState('');
  const [otpTimer, setOtpTimer] = useState(60);
  const [otpLoading, setOtpLoading] = useState(false);
  const [otpError, setOtpError] = useState('');
  const [canResend, setCanResend] = useState(false);
  const otpInputRefs = React.useRef([]);

  React.useEffect(() => {
    let timer;
    if (showOtpModal && otpTimer > 0) {
      timer = setInterval(() => {
        setOtpTimer((prev) => {
          if (prev <= 1) {
            setCanResend(true);
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    }
    return () => clearInterval(timer);
  }, [showOtpModal, otpTimer]);

  const filteredBarangays = useMemo(() => {
    const q = brgySearch.trim().toLowerCase();
    if (!q) return ALL_MANILA_BARANGAYS.slice(0, 100);
    return ALL_MANILA_BARANGAYS.filter(b =>
      b.name.toLowerCase().includes(q) ||
      b.code === q ||
      b.code.includes(q)
    ).slice(0, 80);
  }, [brgySearch]);

  const totalHeadcount = membersList.length;
  const pwdCount = membersList.filter(m => m.condition === 'pwd').length;
  const pregnantCount = membersList.filter(m => m.condition === 'pregnant').length;
  const seniorCount = membersList.filter(m => m.condition === 'senior' || (parseInt(m.age, 10) >= 60)).length;
  const infantCount = membersList.filter(m => m.condition === 'infant' || m.condition === 'child' || (parseInt(m.age, 10) <= 1)).length;

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
          quality: 0.35,
          maxWidth: 800,
          maxHeight: 800,
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
          quality: 0.35,
          maxWidth: 800,
          maxHeight: 800,
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
    const parsedHeadAge = parseInt(headAge, 10);
    if (!headAge.trim() || isNaN(parsedHeadAge) || parsedHeadAge < 18 || parsedHeadAge > 120) {
      errs.headAge = lang === 'tl' ? 'Pakilagay ang wastong edad ng Punong-Pamilya (18-120 taon).' : 'Please enter valid head of household age (18-120).';
    }
    const cleanNumber = emailOrPhone.trim().replace(/[\s-+]/g, '');
    if (!emailOrPhone.trim()) {
      errs.emailOrPhone = lang === 'tl' ? 'Pakilagay ang inyong 11-digit mobile number (09XXXXXXXXX).' : 'Please enter your 11-digit mobile number (09XXXXXXXXX).';
    } else if (cleanNumber.startsWith('63') && cleanNumber.length === 12) {
      // valid 639XXXXXXXXX
    } else if (cleanNumber.startsWith('09') && cleanNumber.length === 11) {
      // valid 09XXXXXXXXX
    } else {
      errs.emailOrPhone = lang === 'tl'
        ? 'Dapat magsimula sa 09 ang 11-digit mobile number (hal. 09XXXXXXXXX).'
        : 'Mobile number must start with 09 and be 11 digits (e.g. 09XXXXXXXXX).';
    }
    if (!password || !isPasswordValid) {
      errs.password = lang === 'tl' ? 'Pakisunod ang checklist sa password.' : 'Please fulfill all password requirements.';
    }
    if (!confirmPassword || password !== confirmPassword) {
      errs.confirmPassword = lang === 'tl' ? 'Hindi magkatugma ang password.' : 'Passwords do not match.';
    }
    if (!idType.trim()) {
      errs.idType = lang === 'tl' ? 'Pumili ng uri ng valid ID.' : 'Please select a valid ID type.';
    }
    // STRICT VALIDATION: ID PHOTO IS MANDATORY BEFORE PROCEEDING TO STEP 2
    if (!idPhoto) {
      errs.idPhoto = lang === 'tl'
        ? 'Kailangang mag-attach ng litrato ng inyong Valid Government ID bago magpatuloy sa Hakbang 2.'
        : 'You must attach a clear photo of your Valid Government ID before proceeding to Step 2.';
      Alert.alert(
        lang === 'tl' ? 'Kailangan ang Litrato ng ID' : 'ID Photo Required',
        errs.idPhoto
      );
    }
    setErrors(errs);
    const isValid = Object.keys(errs).length === 0;
    if (isValid) {
      const finalHeadCondition = headCondition !== 'none' ? headCondition : (parsedHeadAge >= 60 ? 'senior' : 'none');
      const headEntry = {
        id: 'head_1',
        name: `${name.trim()} (${lang === 'tl' ? 'Ikaw / Punong-Pamilya' : 'You / Head of Household'})`,
        age: String(parsedHeadAge),
        relationship: 'Head of Household',
        condition: finalHeadCondition,
      };
      setMembersList(prev => {
        const others = prev.filter(m => m.id !== 'head_1');
        return [headEntry, ...others];
      });
    }
    return isValid;
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
      Alert.alert(lang === 'tl' ? 'Maling Pangalan' : 'Invalid Name', lang === 'tl' ? 'Maglagay ng wastong pangalan ng miyembro.' : 'Please enter a valid member name.');
      return;
    }
    
    // If infant is selected, age is 0 (0-12 months)
    let finalAge = '0';
    if (newMemberCondition !== 'infant') {
      const parsedAge = parseInt(newMemberAge, 10);
      if (isNaN(parsedAge) || parsedAge < 0 || parsedAge > 120) {
        Alert.alert(lang === 'tl' ? 'Maling Edad' : 'Invalid Age', lang === 'tl' ? 'Maglagay ng wastong edad (0-120).' : 'Please enter a valid age (0-120).');
        return;
      }
      finalAge = String(parsedAge);
    }

    const newEntry = {
      id: 'm_' + Date.now(),
      name: trimmedName,
      age: finalAge,
      relationship: newMemberRel.trim() || 'Member',
      condition: newMemberCondition,
    };

    setMembersList([...membersList, newEntry]);
    setNewMemberName('');
    setNewMemberAge('');
    setNewMemberRel('Child');
    setNewMemberCondition('none');
    setShowAddMemberModal(false);
  };

  // 1. Trigger OTP dispatch to mobile
  const handleInitiateRegistration = async () => {
    if (!validateStep2()) return;
    setLoading(true);
    try {
      const res = await fetch(`${API_BASE_URL}/auth/send-otp`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phoneOrEmail: emailOrPhone.trim() }),
      });
      const data = await res.json().catch(() => ({}));
      if (res.ok) {
        setOtpDigits(['', '', '', '', '', '']);
        setOtpError('');
        setOtpTimer(60);
        setCanResend(false);
        if (data.otpCode || data.debugOtp) {
          setFallbackOtp(data.otpCode || data.debugOtp);
        }
        setShowOtpModal(true);
      } else {
        Alert.alert(
          lang === 'tl' ? 'Hindi Maipadala ang OTP' : 'OTP Dispatch Failed',
          data.message || (lang === 'tl' ? 'Hindi maipadala ang verification code. Pakisuri ang inyong numero.' : 'Could not send verification OTP. Please check your phone number.')
        );
      }
    } catch (err) {
      console.error('Send OTP error:', err);
      Alert.alert(
        lang === 'tl' ? 'Koneksyon sa Server' : 'Connection Notice',
        lang === 'tl' ? 'Hindi makakonekta sa authentication server. Pakisuri ang inyong internet.' : 'Could not connect to authentication server.'
      );
    } finally {
      setLoading(false);
    }
  };

  // 2. Resend OTP code with countdown
  const handleResendOtp = async () => {
    if (!canResend) return;
    setOtpLoading(true);
    setOtpError('');
    try {
      const res = await fetch(`${API_BASE_URL}/auth/send-otp`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phoneOrEmail: emailOrPhone.trim() }),
      });
      const data = await res.json().catch(() => ({}));
      if (res.ok) {
        setOtpTimer(60);
        setCanResend(false);
        if (data.otpCode || data.debugOtp) {
          setFallbackOtp(data.otpCode || data.debugOtp);
        }
        Alert.alert(
          lang === 'tl' ? 'Naipadala ang OTP' : 'OTP Resent',
          lang === 'tl' ? `Naipadala muli ang 6-digit verification code sa ${emailOrPhone.trim()}.` : `6-digit verification code resent to ${emailOrPhone.trim()}.`
        );
      } else {
        setOtpError(data.message || (lang === 'tl' ? 'Hindi maipadala ang OTP.' : 'Failed to resend OTP.'));
      }
    } catch (err) {
      setOtpError(lang === 'tl' ? 'Hindi makakonekta sa server.' : 'Network connection error.');
    } finally {
      setOtpLoading(false);
    }
  };

  // 3. Verify OTP & finalize full registration
  const handleVerifyOtpAndComplete = async () => {
    const enteredOtp = otpDigits.join('').trim();
    if (enteredOtp.length !== 6) {
      setOtpError(lang === 'tl' ? 'Pakilagay ang kumpletong 6-digit verification code.' : 'Please enter the complete 6-digit code.');
      return;
    }

    setOtpLoading(true);
    setOtpError('');
    try {
      // Step A: Verify OTP with server
      const verifyRes = await fetch(`${API_BASE_URL}/auth/verify-otp`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          phoneOrEmail: emailOrPhone.trim(),
          otpCode: enteredOtp,
        }),
      });
      const verifyData = await verifyRes.json().catch(() => ({}));
      if (!verifyRes.ok) {
        setOtpError(verifyData.message || (lang === 'tl' ? 'Maling OTP code o paso na. Pakisubukang muli.' : 'Invalid or expired OTP code.'));
        setOtpLoading(false);
        return;
      }

      // Step B: Submit full registration payload to create Household & Account
      const formattedMembers = membersList.map(m => ({
        name: m.name,
        age: parseInt(m.age, 10) || 0,
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
        validIdNumber: idNumber.trim() || '',
        pwdCount,
        pregnantCount,
        seniorCount,
        infantCount,
      };

      const res = await registerUser(payload);
      if (res && res.token) {
        setShowOtpModal(false);
        const userObj = res.user || {
          _id: res._id,
          name: res.name,
          emailOrPhone: res.emailOrPhone,
          role: res.role || 'resident',
          barangayCode: res.barangayCode,
        };
        Alert.alert(
          lang === 'tl' ? '🎉 Rehistrasyon Naisumite!' : '🎉 Registration Submitted!',
          lang === 'tl'
            ? 'Na-verify na ang inyong mobile number! Ang inyong aplikasyon ay nakabinbin sa Verification Queue ng Barangay para sa opisyal na pagsusuri.'
            : 'Your mobile number is verified! Your application is now in the Barangay Verification Queue awaiting official review.'
        );
        onRegisterSuccess({
          token: res.token,
          user: userObj,
          role: userObj.role || 'resident',
          household: res.household || null,
          name: userObj.name || res.name,
          barangayCode: userObj.barangayCode || res.barangayCode,
        });
      } else {
        setOtpError(res?.message || (lang === 'tl' ? 'Hindi makumpleto ang rehistrasyon.' : 'Registration failed.'));
      }
    } catch (err) {
      console.error('Verify & Register error:', err);
      setOtpError(err.data?.message || err.message || (lang === 'tl' ? 'Hindi makumpleto ang rehistrasyon.' : 'Registration failed.'));
    } finally {
      setOtpLoading(false);
    }
  };

  const selectedBrgyObj = ALL_MANILA_BARANGAYS.find(b => b.code === selectedBrgyCode) || {
    name: `Barangay ${selectedBrgyCode} (Manila)`
  };

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      keyboardVerticalOffset={Platform.OS === 'ios' ? 64 : 0}
    >
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.content}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
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
                label={lang === 'tl' ? 'Edad ng Punong-Pamilya (18+ Taong Gulang)' : 'Age of Head of Household (18+)'}
                value={headAge}
                onChangeText={(val) => {
                  setHeadAge(val);
                  const num = parseInt(val, 10);
                  if (num >= 60 && headCondition === 'none') {
                    setHeadCondition('senior');
                  }
                }}
                placeholder={lang === 'tl' ? 'hal. 42' : 'e.g. 42'}
                keyboardType="numeric"
                errorText={errors.headAge}
                required
              />

              {/* HEAD OF HOUSEHOLD CLASSIFICATION CHIPS */}
              <View style={styles.fieldBlock}>
                <Text style={styles.fieldLabelText}>
                  {lang === 'tl' ? 'KATAYUAN NG PUNONG-PAMILYA *' : 'HEAD OF HOUSEHOLD CLASSIFICATION *'}
                </Text>
                <View style={styles.conditionGrid}>
                  {[
                    { id: 'none', label: lang === 'tl' ? '👨 Regular Adult' : '👨 Regular Adult', sub: '18-59 yrs' },
                    { id: 'senior', label: lang === 'tl' ? '🧓 Senior Citizen' : '🧓 Senior Citizen', sub: '60+ yrs' },
                    { id: 'pwd', label: lang === 'tl' ? '♿ PWD (May Kapansanan)' : '♿ Person with Disability', sub: 'Special care' },
                    { id: 'pregnant', label: lang === 'tl' ? '🤰 Buntis / Nagpapasuso' : '🤰 Pregnant / Nursing', sub: 'Maternal' },
                  ].map((c) => (
                    <TouchableOpacity
                      key={c.id}
                      style={[styles.conditionChip, headCondition === c.id && styles.conditionChipActive]}
                      onPress={() => {
                        setHeadCondition(c.id);
                        if (c.id === 'senior' && (!headAge || parseInt(headAge, 10) < 60)) {
                          setHeadAge('60');
                        }
                      }}
                    >
                      <Text style={[styles.conditionChipTitle, headCondition === c.id && styles.conditionChipTitleActive]}>
                        {c.label}
                      </Text>
                      <Text style={styles.conditionChipSub}>{c.sub}</Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>

              <NeumorphicInput
                label={lang === 'tl' ? '11-Digit Mobile Number (Cellphone)' : '11-Digit Mobile Number'}
                value={emailOrPhone}
                onChangeText={(val) => {
                  const cleaned = val.replace(/[^0-9]/g, '');
                  setEmailOrPhone(cleaned);
                }}
                placeholder="09XXXXXXXXX (hal. 09236051393)"
                errorText={errors.emailOrPhone}
                required
                keyboardType="phone-pad"
                maxLength={11}
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

              {/* VALID ID SELECTION DROPDOWN */}
              <View style={styles.fieldBlock}>
                <Text style={styles.fieldLabelText}>
                  {lang === 'tl' ? 'URI NG VALID GOVERNMENT ID *' : 'VALID GOVERNMENT ID TYPE *'}
                </Text>
                <TouchableOpacity
                  style={styles.dropdownSelectorBtn}
                  onPress={() => setShowIdTypeModal(true)}
                  activeOpacity={0.85}
                >
                  <Text style={styles.dropdownSelectedText} numberOfLines={1}>
                    {idType}
                  </Text>
                  <Text style={styles.dropdownChevron}>▼</Text>
                </TouchableOpacity>
              </View>

              <NeumorphicInput
                label={lang === 'tl' ? 'ID Number (Opsyonal)' : 'ID Number (Optional)'}
                value={idNumber}
                onChangeText={setIdNumber}
                placeholder="e.g. 1234-5678-9012-3456"
              />

              <View style={styles.idUploadSection}>
                <View style={styles.idUploadHeaderRow}>
                  <Text style={styles.idUploadLabel}>
                    {lang === 'tl' ? 'LITRATO NG VALID GOVERNMENT ID *' : 'VALID GOVERNMENT ID PHOTO *'}
                  </Text>
                  <View style={[
                    styles.idUploadBadge,
                    idPhoto ? styles.idUploadSuccessBadge : styles.idUploadRequiredBadge
                  ]}>
                    <Text style={[
                      styles.idUploadBadgeText,
                      idPhoto ? styles.idUploadSuccessBadgeText : styles.idUploadRequiredBadgeText
                    ]}>
                      {idPhoto ? (lang === 'tl' ? 'NA-UPLOAD NA ✓' : 'UPLOADED ✓') : (lang === 'tl' ? 'KAILANGAN *' : 'REQUIRED *')}
                    </Text>
                  </View>
                </View>
                <Text style={styles.idUploadSub}>
                  {lang === 'tl' ? 'Kumuha o mag-attach ng malinaw na litrato ng inyong ID bago makapagpatuloy sa Hakbang 2.' : 'Attach clear photo of your ID before you can proceed to Step 2.'}
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
                {errors.idPhoto && (
                  <Text style={styles.idErrorText}>{errors.idPhoto}</Text>
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

              {/* BARANGAY IN MANILA SELECTOR */}
              <View style={styles.brgySection}>
                <Text style={styles.brgyLabel}>
                  {lang === 'tl' ? 'BARANGAY SA LUNGSOD NG MAYNILA (905 BARANGAYS) *' : 'BARANGAY IN MANILA (905 BARANGAYS) *'}
                </Text>
                
                <TouchableOpacity
                  style={styles.brgySelectorBtn}
                  onPress={() => setShowBrgyList(!showBrgyList)}
                  activeOpacity={0.85}
                >
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, flex: 1, paddingRight: 6 }}>
                    <MapPinIcon size={16} color="#1557B0" />
                    <Text style={styles.brgySelectorText} numberOfLines={1}>
                      {selectedBrgyObj.name}
                    </Text>
                  </View>
                  <Text style={styles.dropdownChevron}>{showBrgyList ? '▲' : '▼'}</Text>
                </TouchableOpacity>

                {showBrgyList && (
                  <View style={styles.brgyDropdown}>
                    <View style={styles.brgySearchContainer}>
                      <SearchIcon size={15} color="#1557B0" />
                      <TextInput
                        style={styles.brgySearchInput}
                        placeholder={lang === 'tl' ? 'I-type ang barangay number o distrito (hal. 291)...' : 'Type barangay number or district (e.g. 291)...'}
                        placeholderTextColor="#94A3B8"
                        value={brgySearch}
                        onChangeText={setBrgySearch}
                        autoFocus
                      />
                      {brgySearch.length > 0 && (
                        <TouchableOpacity onPress={() => setBrgySearch('')}>
                          <CloseIcon size={14} color="#64748B" />
                        </TouchableOpacity>
                      )}
                    </View>
                    <ScrollView style={styles.brgyScrollContainer} nestedScrollEnabled keyboardShouldPersistTaps="handled">
                      {filteredBarangays.map(b => (
                        <TouchableOpacity
                          key={b.code}
                          style={[styles.brgyOption, selectedBrgyCode === b.code && styles.brgyOptionSelected]}
                          onPress={() => {
                            setSelectedBrgyCode(b.code);
                            setShowBrgyList(false);
                            setBrgySearch('');
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
                label={lang === 'tl' ? 'Address ng Bahay (Kalye / House No.)' : 'Street Address (House No. & Street)'}
                value={address}
                onChangeText={setAddress}
                placeholder="e.g. 123 Alvarez Street"
                errorText={errors.address}
                required
              />

              <NeumorphicInput
                label={lang === 'tl' ? 'Purok / Zone / Area Landmark' : 'Purok / Zone / Area Landmark'}
                value={purok}
                onChangeText={setPurok}
                placeholder="e.g. Purok 3 / Zone 27"
                errorText={errors.purok}
                required
              />

              <View style={styles.metricsStrip}>
                <View style={styles.metricPill}>
                  <Text style={styles.metricPillLabel}>{lang === 'tl' ? 'KABUUAN' : 'TOTAL'}</Text>
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
                  <Text style={styles.metricPillLabel}>{lang === 'tl' ? 'SANGGOL' : 'INFANT'}</Text>
                  <Text style={[styles.metricPillValue, infantCount > 0 && { color: '#1557B0' }]}>
                    {infantCount}
                  </Text>
                </View>
              </View>

              <View style={styles.rosterSectionHeader}>
                <Text style={styles.rosterSectionTitle}>
                  {lang === 'tl' ? `Talaan ng Miyembro (${totalHeadcount})` : `Household Members (${totalHeadcount})`}
                </Text>
                <TouchableOpacity
                  style={styles.addMemberBtn}
                  onPress={() => {
                    setNewMemberName('');
                    setNewMemberAge('');
                    setNewMemberRel('Child');
                    setNewMemberCondition('none');
                    setShowAddMemberModal(true);
                  }}
                  activeOpacity={0.8}
                >
                  <Text style={styles.addMemberBtnText}>{lang === 'tl' ? '+ Magdagdag ng Miyembro' : '+ Add Member'}</Text>
                </TouchableOpacity>
              </View>

              <View style={styles.membersListContainer}>
                {membersList.map((m, index) => (
                  <View key={m.id || index} style={styles.memberCard}>
                    <View style={styles.memberCardTop}>
                      <View style={{ flex: 1 }}>
                        <Text style={styles.memberName}>
                          {m.name} {m.condition === 'infant' ? '(Sanggol / 0-12 mos)' : `(${m.age} yrs)`}
                        </Text>
                        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 2 }}>
                          <Text style={styles.memberRelText}>{m.relationship}</Text>
                          {m.condition === 'senior' && <Text style={styles.badgeSenior}>Senior Citizen</Text>}
                          {m.condition === 'pwd' && <Text style={styles.badgePwd}>PWD</Text>}
                          {m.condition === 'pregnant' && <Text style={styles.badgePregnant}>Pregnant</Text>}
                          {m.condition === 'infant' && <Text style={styles.badgeInfant}>Infant</Text>}
                        </View>
                      </View>
                      {index > 0 && (
                        <TouchableOpacity
                          onPress={() => setMembersList(membersList.filter(item => item.id !== m.id))}
                          style={styles.deleteMemberBtn}
                        >
                          <TrashIcon size={14} color="#DC2626" />
                        </TouchableOpacity>
                      )}
                    </View>
                  </View>
                ))}
              </View>

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
                onPress={handleInitiateRegistration}
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

      {/* ID TYPE SELECTION MODAL */}
      <Modal
        visible={showIdTypeModal}
        transparent
        animationType="fade"
        onRequestClose={() => setShowIdTypeModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.idModalBox}>
            <View style={styles.idModalHeader}>
              <Text style={styles.idModalTitle}>
                {lang === 'tl' ? 'Pumili ng Uri ng Valid ID' : 'Select Valid ID Type'}
              </Text>
              <TouchableOpacity onPress={() => setShowIdTypeModal(false)}>
                <CloseIcon size={18} color="#475569" />
              </TouchableOpacity>
            </View>
            <ScrollView style={{ maxHeight: 360 }}>
              {PHILIPPINE_GOVERNMENT_IDS.map((idItem) => (
                <TouchableOpacity
                  key={idItem}
                  style={[styles.idOptionRow, idType === idItem && styles.idOptionRowActive]}
                  onPress={() => {
                    setIdType(idItem);
                    setShowIdTypeModal(false);
                  }}
                >
                  <Text style={[styles.idOptionText, idType === idItem && styles.idOptionTextActive]}>
                    {idItem}
                  </Text>
                  {idType === idItem && <CheckIcon size={16} color="#1557B0" />}
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>
        </View>
      </Modal>

      {/* ADD MEMBER MODAL (RESTORED SENIOR, PWD, AND INFANT WITHOUT AGE) */}
      <Modal
        visible={showAddMemberModal}
        transparent
        animationType="slide"
        onRequestClose={() => setShowAddMemberModal(false)}
      >
        <View style={styles.modalOverlay}>
          <KeyboardAvoidingView
            behavior={Platform.OS === 'ios' ? 'padding' : undefined}
            style={styles.addMemberModalBox}
          >
            <View style={styles.idModalHeader}>
              <Text style={styles.idModalTitle}>
                {lang === 'tl' ? 'Magdagdag ng Miyembro ng Pamilya' : 'Add Household Member'}
              </Text>
              <TouchableOpacity onPress={() => setShowAddMemberModal(false)}>
                <CloseIcon size={18} color="#475569" />
              </TouchableOpacity>
            </View>

            <ScrollView showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
              {/* MEMBER CLASSIFICATION CHIPS */}
              <Text style={styles.inputSectionLabel}>
                {lang === 'tl' ? 'KATEGORYA NG MIYEMBRO *' : 'MEMBER CLASSIFICATION *'}
              </Text>
              <View style={styles.conditionGrid}>
                {[
                  { id: 'none', label: lang === 'tl' ? '👨 Regular Adult' : '👨 Regular Adult', sub: '18-59 yrs' },
                  { id: 'senior', label: lang === 'tl' ? '🧓 Senior Citizen' : '🧓 Senior Citizen', sub: '60+ yrs' },
                  { id: 'pwd', label: lang === 'tl' ? '♿ PWD (May Kapansanan)' : '♿ Person with Disability', sub: 'Special care' },
                  { id: 'pregnant', label: lang === 'tl' ? '🤰 Buntis / Nagpapasuso' : '🤰 Pregnant / Nursing', sub: 'Maternal' },
                  { id: 'infant', label: lang === 'tl' ? '👶 Sanggol / Infant' : '👶 Infant / Sanggol', sub: '0-12 months (No age input)' },
                ].map((c) => (
                  <TouchableOpacity
                    key={c.id}
                    style={[styles.conditionChip, newMemberCondition === c.id && styles.conditionChipActive]}
                    onPress={() => {
                      setNewMemberCondition(c.id);
                      if (c.id === 'infant') {
                        setNewMemberAge('0');
                      } else if (c.id === 'senior' && (!newMemberAge || parseInt(newMemberAge, 10) < 60)) {
                        setNewMemberAge('60');
                      }
                    }}
                  >
                    <Text style={[styles.conditionChipTitle, newMemberCondition === c.id && styles.conditionChipTitleActive]}>
                      {c.label}
                    </Text>
                    <Text style={styles.conditionChipSub}>{c.sub}</Text>
                  </TouchableOpacity>
                ))}
              </View>

              <NeumorphicInput
                label={lang === 'tl' ? 'Buong Pangalan ng Miyembro' : 'Full Name of Member'}
                value={newMemberName}
                onChangeText={setNewMemberName}
                placeholder="e.g. Juanito Dela Cruz"
                required
              />

              {/* IF INFANT: AGE TEXTBOX IS COMPLETELY HIDDEN! */}
              {newMemberCondition === 'infant' ? (
                <View style={styles.infantNoticeBox}>
                  <Text style={styles.infantNoticeTitle}>
                    {lang === 'tl' ? '👶 Awtomatikong 0-12 Buwan (Sanggol)' : '👶 Automatically 0-12 Months (Infant)'}
                  </Text>
                  <Text style={styles.infantNoticeText}>
                    {lang === 'tl'
                      ? 'Hindi na kailangang maglagay ng edad. Awtomatiko itong itatala para sa supplementary infant formula at diaper quota.'
                      : 'Age textbox omitted. Infant is automatically queued for supplementary infant nutrition and diaper entitlement.'}
                  </Text>
                </View>
              ) : (
                <NeumorphicInput
                  label={lang === 'tl' ? 'Edad (Taon)' : 'Age (Years)'}
                  value={newMemberAge}
                  onChangeText={setNewMemberAge}
                  placeholder={newMemberCondition === 'senior' ? 'e.g. 65' : 'e.g. 24'}
                  keyboardType="numeric"
                  required
                />
              )}

              {/* RELATIONSHIP SELECTOR */}
              <Text style={styles.inputSectionLabel}>
                {lang === 'tl' ? 'RELASYON SA PUNONG-PAMILYA *' : 'RELATIONSHIP TO HEAD *'}
              </Text>
              <View style={styles.relChipsRow}>
                {['Spouse', 'Child', 'Parent', 'Sibling', 'Grandparent', 'Grandchild', 'Relative'].map((rel) => (
                  <TouchableOpacity
                    key={rel}
                    style={[styles.relChip, newMemberRel === rel && styles.relChipActive]}
                    onPress={() => setNewMemberRel(rel)}
                  >
                    <Text style={[styles.relChipText, newMemberRel === rel && styles.relChipTextActive]}>
                      {rel}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>

              <View style={{ flexDirection: 'row', gap: 10, marginTop: 20 }}>
                <TouchableOpacity style={styles.cancelAddBtn} onPress={() => setShowAddMemberModal(false)}>
                  <Text style={styles.cancelAddBtnText}>{lang === 'tl' ? 'Kanselahin' : 'Cancel'}</Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.confirmAddBtn} onPress={handleAddMember}>
                  <Text style={styles.confirmAddBtnText}>{lang === 'tl' ? '+ I-save ang Miyembro' : '+ Save Member'}</Text>
                </TouchableOpacity>
              </View>
            </ScrollView>
          </KeyboardAvoidingView>
        </View>
      </Modal>

      {/* OTP AUTHENTICATION & PHONE VERIFICATION MODAL */}
      <Modal
        visible={showOtpModal}
        transparent
        animationType="slide"
        onRequestClose={() => {
          if (!otpLoading) setShowOtpModal(false);
        }}
      >
        <View style={styles.modalOverlay}>
          <KeyboardAvoidingView
            behavior={Platform.OS === 'ios' ? 'padding' : undefined}
            style={styles.otpModalBox}
          >
            <View style={styles.otpModalHeader}>
              <View style={styles.otpIconBadge}>
                <ShieldCheckIcon size={26} color="#1557B0" />
              </View>
              <Text style={styles.otpModalTitle}>
                {lang === 'tl' ? 'Kumpirmasyon ng Mobile Number' : 'Mobile Number OTP Verification'}
              </Text>
              <Text style={styles.otpModalSub}>
                {lang === 'tl'
                  ? 'Ipinadala ang 6-digit verification code sa iyong mobile number: '
                  : 'We sent a 6-digit verification code to: '}
                <Text style={{ fontWeight: '800', color: '#1557B0' }}>{emailOrPhone}</Text>
              </Text>
            </View>

            {/* FALLBACK / DEMO CODE HELPER WITH INSTANT AUTO-FILL */}
            {fallbackOtp ? (
              <View style={styles.demoOtpBox}>
                <View style={styles.demoOtpHeader}>
                  <Text style={styles.demoOtpTitle}>
                    {lang === 'tl' ? '📱 Verification Code:' : '📱 Verification Code:'}
                  </Text>
                  <TouchableOpacity
                    style={styles.autoFillBtn}
                    onPress={() => {
                      const digits = fallbackOtp.split('');
                      setOtpDigits(digits);
                      setOtpError('');
                    }}
                    activeOpacity={0.8}
                  >
                    <Text style={styles.autoFillBtnText}>
                      {lang === 'tl' ? '⚡ I-Auto-Fill Code' : '⚡ Auto-Fill Code'}
                    </Text>
                  </TouchableOpacity>
                </View>
                <Text style={styles.demoOtpCodeText}>{fallbackOtp}</Text>
                <Text style={styles.demoOtpSubText}>
                  {lang === 'tl'
                    ? 'I-tap ang "⚡ I-Auto-Fill Code" kung sakaling naantala o walang signal ang SMS.'
                    : 'Tap "⚡ Auto-Fill Code" if SMS delivery is delayed.'}
                </Text>
              </View>
            ) : null}

            {/* 6 OTP DIGIT INPUT BOXES */}
            <View style={styles.otpInputsContainer}>
              {otpDigits.map((digit, idx) => (
                <TextInput
                  key={idx}
                  ref={(ref) => (otpInputRefs.current[idx] = ref)}
                  style={[
                    styles.otpBoxInput,
                    digit ? styles.otpBoxInputFilled : null,
                    otpError ? styles.otpBoxInputError : null,
                  ]}
                  value={digit}
                  onChangeText={(val) => {
                    const cleanVal = val.replace(/[^0-9]/g, '');
                    if (cleanVal.length > 1) {
                      // Handle paste of full 6-digit code
                      const pastedDigits = cleanVal.slice(0, 6).split('');
                      const newArr = [...otpDigits];
                      pastedDigits.forEach((d, dIdx) => {
                        newArr[dIdx] = d;
                      });
                      setOtpDigits(newArr);
                      const nextFocus = Math.min(5, pastedDigits.length - 1);
                      otpInputRefs.current[nextFocus]?.focus();
                      return;
                    }
                    const newDigits = [...otpDigits];
                    newDigits[idx] = cleanVal;
                    setOtpDigits(newDigits);
                    if (cleanVal && idx < 5) {
                      otpInputRefs.current[idx + 1]?.focus();
                    }
                  }}
                  onKeyPress={({ nativeEvent }) => {
                    if (nativeEvent.key === 'Backspace' && !digit && idx > 0) {
                      otpInputRefs.current[idx - 1]?.focus();
                    }
                  }}
                  keyboardType="numeric"
                  maxLength={6}
                  textAlign="center"
                  selectTextOnFocus
                />
              ))}
            </View>

            {/* ERROR MESSAGE IF ANY */}
            {otpError ? (
              <View style={styles.otpErrorBox}>
                <Text style={styles.otpErrorText}>⚠️ {otpError}</Text>
              </View>
            ) : null}

            {/* RESEND TIMER & ACTION */}
            <View style={styles.otpResendRow}>
              {canResend ? (
                <TouchableOpacity onPress={handleResendOtp} disabled={otpLoading}>
                  <Text style={styles.otpResendActiveText}>
                    {lang === 'tl' ? '🔄 Magpadala Muli ng Code' : '🔄 Resend Verification Code'}
                  </Text>
                </TouchableOpacity>
              ) : (
                <Text style={styles.otpTimerText}>
                  {lang === 'tl'
                    ? `Maaaring magpadala muli sa loob ng ${otpTimer}s`
                    : `Resend code available in ${otpTimer}s`}
                </Text>
              )}
            </View>

            {/* ACTION BUTTONS */}
            <View style={styles.otpActionBtnGroup}>
              <MotionPressable
                style={[styles.verifyOtpBtn, otpLoading && { opacity: 0.7 }]}
                onPress={handleVerifyOtpAndComplete}
                disabled={otpLoading}
                activeOpacity={0.85}
              >
                {otpLoading ? (
                  <ActivityIndicator color="#FFFFFF" />
                ) : (
                  <Text style={styles.verifyOtpBtnText}>
                    {lang === 'tl' ? '✓ I-verify at Tapusin ang Rehistrasyon' : '✓ Verify & Complete Registration'}
                  </Text>
                )}
              </MotionPressable>

              <TouchableOpacity
                style={styles.cancelOtpBtn}
                onPress={() => setShowOtpModal(false)}
                disabled={otpLoading}
              >
                <Text style={styles.cancelOtpBtnText}>
                  {lang === 'tl' ? 'Kanselahin / Baguhin ang Numero' : 'Cancel / Change Number'}
                </Text>
              </TouchableOpacity>
            </View>
          </KeyboardAvoidingView>
        </View>
      </Modal>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8F9F7',
  },
  scroll: {
    flex: 1,
  },
  content: {
    paddingHorizontal: RESPONSIVE.padding,
    paddingTop: RESPONSIVE.topSafe + 6,
    paddingBottom: hp(12),
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
  fieldBlock: {
    marginBottom: 14,
  },
  fieldLabelText: {
    fontSize: 10.5,
    fontWeight: '800',
    color: '#172B4D',
    letterSpacing: 0.6,
    marginBottom: 6,
  },
  dropdownSelectorBtn: {
    backgroundColor: '#FFFFFF',
    borderWidth: 1.5,
    borderColor: '#CBD5E1',
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 12,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  dropdownSelectedText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#172B4D',
    flex: 1,
  },
  dropdownChevron: {
    fontSize: 12,
    color: '#1557B0',
    fontWeight: '800',
    marginLeft: 6,
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
    maxHeight: 220,
  },
  brgyOption: {
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  brgyOptionSelected: {
    backgroundColor: '#EFF6FF',
  },
  brgyOptionText: {
    fontSize: 12.5,
    color: '#334155',
  },
  brgyOptionTextSelected: {
    color: '#1557B0',
    fontWeight: '800',
  },
  metricsStrip: {
    flexDirection: 'row',
    gap: 6,
    marginVertical: 14,
  },
  metricPill: {
    flex: 1,
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: 8,
    paddingVertical: 6,
    alignItems: 'center',
  },
  metricPillLabel: {
    fontSize: 9,
    fontWeight: '800',
    color: '#64748B',
  },
  metricPillValue: {
    fontSize: 15,
    fontWeight: '900',
    color: '#0F172A',
    marginTop: 1,
  },
  rosterSectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 6,
    marginBottom: 10,
  },
  rosterSectionTitle: {
    fontSize: 14,
    fontWeight: '800',
    color: '#1E293B',
  },
  addMemberBtn: {
    backgroundColor: '#EFF6FF',
    borderWidth: 1,
    borderColor: '#93C5FD',
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
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: 8,
    padding: 10,
  },
  memberCardTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  memberName: {
    fontSize: 13,
    fontWeight: '700',
    color: '#1E293B',
  },
  memberRelText: {
    fontSize: 11,
    color: '#64748B',
  },
  deleteMemberBtn: {
    padding: 6,
  },
  badgeSenior: {
    fontSize: 9.5,
    fontWeight: '800',
    color: '#D97706',
    backgroundColor: '#FEF3C7',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  badgePwd: {
    fontSize: 9.5,
    fontWeight: '800',
    color: '#DC2626',
    backgroundColor: '#FEE2E2',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  badgePregnant: {
    fontSize: 9.5,
    fontWeight: '800',
    color: '#7C3AED',
    backgroundColor: '#EDE9FE',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  badgeInfant: {
    fontSize: 9.5,
    fontWeight: '800',
    color: '#1557B0',
    backgroundColor: '#DBEAFE',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  certRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
    marginVertical: 14,
  },
  checkbox: {
    width: 18,
    height: 18,
    borderRadius: 4,
    borderWidth: 1.5,
    borderColor: '#CBD5E1',
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 2,
  },
  checkboxActive: {
    backgroundColor: '#1557B0',
    borderColor: '#1557B0',
  },
  certText: {
    fontSize: 11.5,
    color: '#475569',
    flex: 1,
    lineHeight: 16,
  },
  submitBtn: {
    backgroundColor: '#1557B0',
    borderRadius: 10,
    paddingVertical: 14,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 8,
    ...SHADOWS.md,
  },
  submitBtnText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '800',
  },
  idUploadSection: {
    marginTop: 10,
    marginBottom: 14,
  },
  idUploadHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  idUploadLabel: {
    fontSize: 10.5,
    fontWeight: '800',
    color: '#172B4D',
    letterSpacing: 0.6,
  },
  idUploadRequiredTag: {
    fontSize: 10,
    fontWeight: '800',
    color: '#1557B0',
  },
  idUploadSub: {
    fontSize: 11,
    color: '#64748B',
    marginTop: 2,
    marginBottom: 8,
  },
  idPreviewContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: '#CBD5E1',
    borderRadius: 10,
    padding: 8,
    gap: 10,
  },
  idPreviewImg: {
    width: 48,
    height: 48,
    borderRadius: 6,
  },
  idPreviewMeta: {
    flex: 1,
  },
  idPreviewSuccessText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#059669',
  },
  idPreviewFileName: {
    fontSize: 10.5,
    color: '#64748B',
  },
  idRemoveBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    padding: 6,
  },
  idRemoveBtnText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#DC2626',
  },
  idUploadBtnRow: {
    flexDirection: 'row',
    gap: 10,
  },
  idCameraBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: '#EFF6FF',
    borderWidth: 1.5,
    borderColor: '#93C5FD',
    borderRadius: 10,
    paddingVertical: 12,
  },
  idGalleryBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: '#F8FAFC',
    borderWidth: 1.5,
    borderColor: '#CBD5E1',
    borderRadius: 10,
    paddingVertical: 12,
  },
  idBtnMainText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#1E293B',
  },
  passwordRulesBox: {
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: 8,
    padding: 10,
    marginBottom: 12,
  },
  passwordRulesTitle: {
    fontSize: 10,
    fontWeight: '800',
    color: '#475569',
    marginBottom: 6,
  },
  ruleItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 3,
  },
  ruleIcon: {
    fontSize: 12,
    fontWeight: '900',
  },
  ruleIconValid: {
    color: '#059669',
  },
  ruleIconInvalid: {
    color: '#DC2626',
  },
  ruleText: {
    fontSize: 11,
  },
  ruleTextValid: {
    color: '#059669',
  },
  ruleTextInvalid: {
    color: '#64748B',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(15, 23, 42, 0.6)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  idModalBox: {
    width: '100%',
    maxWidth: 420,
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 16,
    ...SHADOWS.lg,
  },
  idModalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderBottomWidth: 1,
    borderBottomColor: '#E2E8F0',
    paddingBottom: 12,
    marginBottom: 10,
  },
  idModalTitle: {
    fontSize: 15,
    fontWeight: '800',
    color: '#0F172A',
  },
  idOptionRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
  },
  idOptionRowActive: {
    backgroundColor: '#EFF6FF',
    borderRadius: 8,
  },
  idOptionText: {
    fontSize: 13,
    color: '#334155',
    fontWeight: '600',
  },
  idOptionTextActive: {
    color: '#1557B0',
    fontWeight: '800',
  },
  addMemberModalBox: {
    width: '100%',
    maxWidth: 440,
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 16,
    maxHeight: '90%',
    ...SHADOWS.lg,
  },
  inputSectionLabel: {
    fontSize: 10.5,
    fontWeight: '800',
    color: '#475569',
    letterSpacing: 0.5,
    marginTop: 8,
    marginBottom: 6,
  },
  conditionGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    marginBottom: 12,
  },
  conditionChip: {
    width: '48%',
    backgroundColor: '#F8FAFC',
    borderWidth: 1.5,
    borderColor: '#E2E8F0',
    borderRadius: 8,
    padding: 8,
  },
  conditionChipActive: {
    backgroundColor: '#EFF6FF',
    borderColor: '#1557B0',
  },
  conditionChipTitle: {
    fontSize: 11.5,
    fontWeight: '700',
    color: '#334155',
  },
  conditionChipTitleActive: {
    color: '#1557B0',
    fontWeight: '800',
  },
  conditionChipSub: {
    fontSize: 9.5,
    color: '#64748B',
    marginTop: 2,
  },
  infantNoticeBox: {
    backgroundColor: '#EFF6FF',
    borderWidth: 1,
    borderColor: '#93C5FD',
    borderRadius: 8,
    padding: 10,
    marginBottom: 12,
  },
  infantNoticeTitle: {
    fontSize: 12,
    fontWeight: '800',
    color: '#1557B0',
  },
  infantNoticeText: {
    fontSize: 11,
    color: '#334155',
    marginTop: 2,
    lineHeight: 15,
  },
  relChipsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    marginBottom: 12,
  },
  relChip: {
    backgroundColor: '#F1F5F9',
    borderWidth: 1,
    borderColor: '#CBD5E1',
    borderRadius: 6,
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  relChipActive: {
    backgroundColor: '#1557B0',
    borderColor: '#1557B0',
  },
  relChipText: {
    fontSize: 11.5,
    fontWeight: '600',
    color: '#475569',
  },
  relChipTextActive: {
    color: '#FFFFFF',
    fontWeight: '800',
  },
  cancelAddBtn: {
    flex: 1,
    backgroundColor: '#F1F5F9',
    borderRadius: 8,
    paddingVertical: 12,
    alignItems: 'center',
  },
  cancelAddBtnText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#475569',
  },
  confirmAddBtn: {
    flex: 2,
    backgroundColor: '#1557B0',
    borderRadius: 8,
    paddingVertical: 12,
    alignItems: 'center',
  },
  confirmAddBtnText: {
    fontSize: 13,
    fontWeight: '800',
    color: '#FFFFFF',
  },
  idUploadBadge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  idUploadRequiredBadge: {
    backgroundColor: '#FEE2E2',
    borderWidth: 1,
    borderColor: '#FECACA',
  },
  idUploadSuccessBadge: {
    backgroundColor: '#DCFCE7',
    borderWidth: 1,
    borderColor: '#BBF7D0',
  },
  idUploadBadgeText: {
    fontSize: 11,
    fontWeight: '800',
  },
  idUploadRequiredBadgeText: {
    color: '#DC2626',
  },
  idUploadSuccessBadgeText: {
    color: '#16A34A',
  },
  idErrorText: {
    color: '#DC2626',
    fontSize: 12,
    fontWeight: '700',
    marginTop: 6,
  },
  // OTP Modal Styles
  otpModalBox: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    padding: 24,
    paddingBottom: Platform.OS === 'ios' ? 40 : 28,
    width: '100%',
    maxWidth: 480,
    ...SHADOWS.lg,
  },
  otpModalHeader: {
    alignItems: 'center',
    marginBottom: 20,
  },
  otpIconBadge: {
    width: 54,
    height: 54,
    borderRadius: 27,
    backgroundColor: '#E0F2FE',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
    borderWidth: 1.5,
    borderColor: '#BAE6FD',
  },
  otpModalTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: '#0F172A',
    marginBottom: 6,
    textAlign: 'center',
  },
  otpModalSub: {
    fontSize: 13,
    color: '#64748B',
    textAlign: 'center',
    lineHeight: 18,
    paddingHorizontal: 10,
    marginBottom: 12,
  },
  demoOtpBox: {
    backgroundColor: '#F0FDF4',
    borderWidth: 1.5,
    borderColor: '#86EFAC',
    borderRadius: 14,
    padding: 12,
    marginBottom: 16,
  },
  demoOtpHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 6,
  },
  demoOtpTitle: {
    fontSize: 12,
    fontWeight: '700',
    color: '#166534',
  },
  autoFillBtn: {
    backgroundColor: '#16A34A',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 8,
  },
  autoFillBtnText: {
    color: '#FFFFFF',
    fontSize: 11,
    fontWeight: '800',
  },
  demoOtpCodeText: {
    fontSize: 22,
    fontWeight: '900',
    letterSpacing: 4,
    color: '#15803D',
    textAlign: 'center',
    marginVertical: 4,
  },
  demoOtpSubText: {
    fontSize: 11,
    color: '#15803D',
    textAlign: 'center',
    lineHeight: 15,
  },
  otpInputsContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 8,
    marginBottom: 16,
  },
  otpBoxInput: {
    width: 44,
    height: 52,
    borderRadius: 12,
    borderWidth: 1.5,
    borderColor: '#CBD5E1',
    backgroundColor: '#F8FAFC',
    fontSize: 22,
    fontWeight: '800',
    color: '#0F172A',
    textAlign: 'center',
  },
  otpBoxInputFilled: {
    borderColor: '#1557B0',
    backgroundColor: '#EFF6FF',
  },
  otpBoxInputError: {
    borderColor: '#DC2626',
    backgroundColor: '#FEF2F2',
  },
  otpErrorBox: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    backgroundColor: '#FEF2F2',
    borderWidth: 1,
    borderColor: '#FECACA',
    padding: 8,
    borderRadius: 8,
    marginBottom: 14,
  },
  otpErrorText: {
    fontSize: 12,
    color: '#DC2626',
    fontWeight: '600',
    textAlign: 'center',
  },
  otpResendRow: {
    alignItems: 'center',
    marginBottom: 20,
  },
  otpTimerText: {
    fontSize: 12.5,
    color: '#64748B',
    fontWeight: '600',
  },
  otpResendActiveText: {
    fontSize: 13,
    color: '#1557B0',
    fontWeight: '800',
    textDecorationLine: 'underline',
  },
  otpActionBtnGroup: {
    gap: 10,
  },
  verifyOtpBtn: {
    backgroundColor: '#1557B0',
    paddingVertical: 14,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    ...SHADOWS.md,
  },
  verifyOtpBtnText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '800',
  },
  cancelOtpBtn: {
    paddingVertical: 10,
    alignItems: 'center',
  },
  cancelOtpBtnText: {
    color: '#64748B',
    fontSize: 13,
    fontWeight: '700',
  },
});

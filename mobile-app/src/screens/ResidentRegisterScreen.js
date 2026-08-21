import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Alert, ActivityIndicator, Image, Platform, TextInput } from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import NeumorphicInput from '../components/NeumorphicInput';
import { ShieldCheckIcon, UsersIcon, CheckIcon, CloseIcon, MapPinIcon, PlusIcon, ArrowLeftIcon, CameraIcon, ImageIcon, TrashIcon, SearchIcon } from '../components/AppIcons';
import { COLORS, FONT_WEIGHT, SPACING, RADIUS, SHADOWS, RESPONSIVE, wp, hp } from '../theme';
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

export default function ResidentRegisterScreen({ onRegisterSuccess, onBack, lang = 'en' }) {
  // Step State (1: Head Info + ID, 2: Family Members Roster + Location)
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
  const [statusMsg, setStatusMsg] = useState(null);

  const filteredBarangays = MANILA_BARANGAYS.filter(b =>
    b.name.toLowerCase().includes(brgySearch.toLowerCase()) ||
    b.code.includes(brgySearch)
  );

  // Compute live vulnerability counts
  const totalHeadcount = membersList.length;
  const pwdCount = membersList.filter(m => m.condition === 'pwd').length;
  const pregnantCount = membersList.filter(m => m.condition === 'pregnant').length;
  const seniorCount = membersList.filter(m => m.condition === 'senior' || (parseInt(m.age) >= 60)).length;
  const infantCount = membersList.filter(m => m.condition === 'child' || (parseInt(m.age) <= 5)).length;

  // Live password validation rules
  const hasLowercase = /[a-z]/.test(password);
  const hasUppercase = /[A-Z]/.test(password);
  const hasNumber = /[0-9]/.test(password);
  const hasMinLength = password.length >= 8;
  const isPasswordValid = hasLowercase && hasUppercase && hasNumber && hasMinLength;

  // Real-time live validation handlers
  const handleNameChange = (txt) => {
    setName(txt);
    if (!txt.trim()) {
      setErrors(prev => ({ ...prev, name: '' }));
    } else if (txt.trim().length < 3) {
      setErrors(prev => ({
        ...prev,
        name: lang === 'tl'
          ? 'Kailangang may minimum 3 characters ang buong pangalan.'
          : 'Full legal name must be at least 3 characters.',
      }));
    } else if (!/^[a-zA-ZñÑ\s\-'.]+$/.test(txt)) {
      setErrors(prev => ({
        ...prev,
        name: lang === 'tl'
          ? 'Pangalan lamang at walang numero o espesyal na simbolo.'
          : 'Name must only contain letters and standard characters.',
      }));
    } else {
      setErrors(prev => ({ ...prev, name: '' }));
    }
  };

  const handleEmailOrPhoneChange = (txt) => {
    setEmailOrPhone(txt);
    const cleaned = txt.trim();
    if (!cleaned) {
      setErrors(prev => ({ ...prev, emailOrPhone: '' }));
      return;
    }

    const isDigitStart = /^(\+?63|0)?\d*$/.test(cleaned);
    if (isDigitStart && !cleaned.includes('@')) {
      const pureDigits = cleaned.replace(/[\s-+]/g, '');
      if (pureDigits.startsWith('63')) {
        if (pureDigits.length !== 12) {
          setErrors(prev => ({
            ...prev,
            emailOrPhone: lang === 'tl'
              ? 'Kailangang 11 digits ang mobile number (hal. 09XXXXXXXXX)'
              : 'Mobile number must be 11 digits (e.g. 09XXXXXXXXX)',
          }));
        } else {
          setErrors(prev => ({ ...prev, emailOrPhone: '' }));
        }
      } else if (pureDigits.startsWith('09')) {
        if (pureDigits.length !== 11) {
          setErrors(prev => ({
            ...prev,
            emailOrPhone: lang === 'tl'
              ? 'Kailangang 11 digits ang mobile number (hal. 09XXXXXXXXX)'
              : 'Mobile number must be 11 digits (e.g. 09XXXXXXXXX)',
          }));
        } else {
          setErrors(prev => ({ ...prev, emailOrPhone: '' }));
        }
      } else {
        setErrors(prev => ({
          ...prev,
          emailOrPhone: lang === 'tl'
            ? 'Dapat magsimula sa 09 ang mobile number (11 digits)'
            : 'Mobile number must start with 09 (11 digits)',
        }));
      }
    } else {
      // Email format check
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(cleaned)) {
        setErrors(prev => ({
          ...prev,
          emailOrPhone: lang === 'tl'
            ? 'Maglagay ng wastong email (hal. name@gmail.com) o 11-digit mobile (09XXXXXXXXX)'
            : 'Enter a valid email (e.g. name@gmail.com) or 11-digit mobile (09XXXXXXXXX)',
        }));
      } else {
        setErrors(prev => ({ ...prev, emailOrPhone: '' }));
      }
    }
  };

  const handlePasswordChange = (txt) => {
    setPassword(txt);
    if (errors.password) setErrors(prev => ({ ...prev, password: '' }));
    if (confirmPassword.length > 0) {
      if (txt !== confirmPassword) {
        setErrors(prev => ({
          ...prev,
          confirmPassword: lang === 'tl' ? 'Hindi magkatugma ang mga password.' : 'Passwords do not match.',
        }));
      } else {
        setErrors(prev => ({ ...prev, confirmPassword: '' }));
      }
    }
  };

  const handleConfirmPasswordChange = (txt) => {
    setConfirmPassword(txt);
    if (!txt) {
      setErrors(prev => ({ ...prev, confirmPassword: '' }));
    } else if (txt !== password) {
      setErrors(prev => ({
        ...prev,
        confirmPassword: lang === 'tl' ? 'Hindi magkatugma ang mga password.' : 'Passwords do not match.',
      }));
    } else {
      setErrors(prev => ({ ...prev, confirmPassword: '' }));
    }
  };

  const handlePickIdFromCamera = async () => {
    try {
      if (Platform.OS !== 'web') {
        const { status } = await ImagePicker.requestCameraPermissionsAsync();
        if (status !== 'granted') {
          Alert.alert(
            lang === 'tl' ? 'Pahintulot sa Camera' : 'Camera Permission',
            lang === 'tl' ? 'Kailangan ng pahintulot upang magamit ang camera para sa litrato ng ID.' : 'Camera permission is required to take a picture of your valid ID.'
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
          const base64Data = asset.base64 ? `data:image/jpeg;base64,${asset.base64}` : asset.uri;
          setIdPhoto(base64Data);
          setIdPhotoName('camera_valid_id.jpg');
          setErrors(prev => ({ ...prev, idPhoto: '' }));
        }
      } else {
        triggerWebFilePicker('camera');
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
            lang === 'tl' ? 'Kailangan ng pahintulot upang makapili ng litrato mula sa iyong gallery.' : 'Gallery permission is required to choose your ID photo.'
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
          const base64Data = asset.base64 ? `data:image/jpeg;base64,${asset.base64}` : asset.uri;
          setIdPhoto(base64Data);
          setIdPhotoName(asset.fileName || 'gallery_valid_id.jpg');
          setErrors(prev => ({ ...prev, idPhoto: '' }));
        }
      } else {
        triggerWebFilePicker('library');
      }
    } catch (e) {
      console.warn('Gallery picker error:', e);
    }
  };

  const triggerWebFilePicker = (source) => {
    if (typeof document !== 'undefined') {
      const input = document.createElement('input');
      input.type = 'file';
      input.accept = 'image/*';
      if (source === 'camera') {
        input.capture = 'environment';
      }
      input.onchange = (e) => {
        const file = e.target.files && e.target.files[0];
        if (file) {
          const reader = new FileReader();
          reader.onload = (event) => {
            setIdPhoto(event.target.result);
            setIdPhotoName(file.name || 'valid_government_id.jpg');
            setErrors(prev => ({ ...prev, idPhoto: '' }));
          };
          reader.readAsDataURL(file);
        }
      };
      input.click();
    }
  };

  const handleAddressChange = (txt) => {
    setAddress(txt);
    if (!txt.trim()) {
      setErrors(prev => ({ ...prev, address: '' }));
    } else if (txt.trim().length < 5) {
      setErrors(prev => ({
        ...prev,
        address: lang === 'tl'
          ? 'Pakilagay ang kumpletong address ng bahay (hal. 123 Calle Real).'
          : 'Please enter complete street address (e.g. 123 Calle Real).',
      }));
    } else {
      setErrors(prev => ({ ...prev, address: '' }));
    }
  };

  const handlePurokChange = (txt) => {
    setPurok(txt);
    if (!txt.trim()) {
      setErrors(prev => ({
        ...prev,
        purok: lang === 'tl' ? 'Pakilagay ang Purok o Zone.' : 'Please specify Purok or Zone.',
      }));
    } else {
      setErrors(prev => ({ ...prev, purok: '' }));
    }
  };

  const validateStep1 = () => {
    const errs = {};
    if (!name.trim()) {
      errs.name = lang === 'tl'
        ? 'Pakilagay ang buong legal na pangalan ng Punong-Pamilya.'
        : 'Please enter full legal name of Head of Household.';
    } else if (name.trim().length < 3) {
      errs.name = lang === 'tl'
        ? 'Kailangang may minimum 3 characters ang pangalan.'
        : 'Full legal name must be at least 3 characters.';
    }

    if (!emailOrPhone.trim()) {
      errs.emailOrPhone = lang === 'tl'
        ? 'Pakilagay ang inyong email address o mobile number.'
        : 'Please enter email address or mobile number.';
    } else {
      const cleaned = emailOrPhone.trim();
      const isDigitStart = /^(\+?63|0)?\d*$/.test(cleaned);
      if (isDigitStart && !cleaned.includes('@')) {
        const pureDigits = cleaned.replace(/[\s-+]/g, '');
        if (!/^(09|\+639)\d{9}$/.test(cleaned.replace(/[\s-]/g, '')) && pureDigits.length !== 11) {
          errs.emailOrPhone = lang === 'tl'
            ? 'Kailangang 11 digits ang mobile number (hal. 09XXXXXXXXX)'
            : 'Mobile number must be 11 digits (e.g. 09XXXXXXXXX)';
        }
      } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(cleaned)) {
        errs.emailOrPhone = lang === 'tl'
          ? 'Maglagay ng wastong email (hal. name@gmail.com) o 11-digit mobile (09XXXXXXXXX)'
          : 'Enter a valid email (e.g. name@gmail.com) or 11-digit mobile (09XXXXXXXXX)';
      }
    }

    if (!password) {
      errs.password = lang === 'tl'
        ? 'Pakilagay ang password ng account.'
        : 'Please create an account password.';
    } else if (!isPasswordValid) {
      errs.password = lang === 'tl'
        ? 'Pakisunod ang lahat ng 4 na patakaran sa password checklist.'
        : 'Please fulfill all 4 password requirements in the checklist.';
    }
    if (!confirmPassword) {
      errs.confirmPassword = lang === 'tl'
        ? 'Paki-kumpirma ang inyong password.'
        : 'Please confirm your password.';
    } else if (password !== confirmPassword) {
      errs.confirmPassword = lang === 'tl'
        ? 'Hindi magkatugma ang mga password.'
        : 'Passwords do not match.';
    }
    if (!idType.trim()) {
      errs.idType = lang === 'tl'
        ? 'Pakilagay ang uri ng inyong Valid Government ID.'
        : 'Please specify the Valid Government ID type.';
    }
    setErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const validateStep2 = () => {
    const errs = {};
    if (!address.trim()) {
      errs.address = lang === 'tl' ? 'Pakilagay ang address ng bahay.' : 'Please enter street address.';
    } else if (address.trim().length < 5) {
      errs.address = lang === 'tl' ? 'Pakilagay ang kumpletong address ng bahay.' : 'Please enter complete street address.';
    }
    if (!purok.trim()) errs.purok = lang === 'tl' ? 'Pakilagay ang Purok / Zone number.' : 'Please enter Purok / Zone number.';
    if (membersList.length < 1) {
      errs.members = lang === 'tl' ? 'Kailangang may kahit 1 rehistradong miyembro ang pamilya.' : 'Must have at least 1 registered member in household.';
    }
    if (!certified) {
      errs.certified = lang === 'tl' ? 'Kailangan mong patotohanan na totoo ang lahat ng impormasyon.' : 'You must certify that all household information is truthful.';
    }
    setErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const handleAddMember = () => {
    const trimmedName = newMemberName.trim();
    if (!trimmedName || trimmedName.length < 2) {
      Alert.alert(
        lang === 'tl' ? 'Maling Pangalan' : 'Invalid Name',
        lang === 'tl' ? 'Maglagay ng wastong pangalan ng miyembro (minimum 2 characters).' : 'Please enter a valid member name (at least 2 characters).'
      );
      return;
    }
    if (/\d/.test(trimmedName)) {
      Alert.alert(
        lang === 'tl' ? 'Maling Pangalan' : 'Invalid Name',
        lang === 'tl' ? 'Hindi dapat maglaman ng numero ang pangalan ng miyembro.' : 'Member name should not contain numbers.'
      );
      return;
    }

    // Check duplicate name
    if (membersList.some(m => m.name.toLowerCase() === trimmedName.toLowerCase())) {
      Alert.alert(
        lang === 'tl' ? 'Dobleng Miyembro' : 'Duplicate Member',
        lang === 'tl' ? 'Nakatala na ang miyembrong may ganitong pangalan sa pamilya.' : 'A household member with this name is already listed in the roster.'
      );
      return;
    }

    let ageNum = 0;
    if (newMemberCondition === 'child') {
      ageNum = 0;
    } else {
      ageNum = parseInt(newMemberAge, 10);
      if (isNaN(ageNum) || ageNum < 0 || ageNum > 120) {
        Alert.alert(
          lang === 'tl' ? 'Maling Edad' : 'Invalid Age',
          lang === 'tl' ? 'Maglagay ng wastong edad sa pagitan ng 0 at 120 taong gulang.' : 'Please enter a valid age between 0 and 120 years old.'
        );
        return;
      }

      // Vulnerability demographic cross-check
      if (newMemberCondition === 'senior' && ageNum < 60) {
        Alert.alert(
          lang === 'tl' ? 'Pagsusuri sa Kalagayan' : 'Vulnerability Validation',
          lang === 'tl' ? 'Ang Senior Citizen ay para sa edad 60 pataas. Pakiayos ang edad o kalagayan.' : 'Senior Citizen condition requires age 60 or above. Please adjust age or condition.'
        );
        return;
      }
    }

    const newEntry = {
      id: `m_${Date.now()}`,
      name: trimmedName,
      age: newMemberCondition === 'child' ? '0' : String(ageNum),
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

  const handleRemoveMember = (id) => {
    if (membersList.length <= 1) {
      Alert.alert('Cannot Remove', 'Primary Head of Household must remain.');
      return;
    }
    setMembersList(membersList.filter(m => m.id !== id));
  };

  const handleNext = () => {
    if (step === 1 && validateStep1()) {
      setStep(2);
    }
  };

  const handleRegister = async () => {
    if (!validateStep2()) return;

    setLoading(true);
    try {
      const formattedMembers = membersList.map(m => ({
        name: m.name,
        age: parseInt(m.age) || 30,
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
        setLoading(false);
        setStatusMsg({ type: 'error', text: res?.message || (lang === 'tl' ? 'Hindi makapag-register. Subukan muli.' : 'Registration failed. Please try again.') });
      }
    } catch (err) {
      setLoading(false);
      setStatusMsg({ type: 'error', text: lang === 'tl' ? 'Hindi makapag-register. Subukan muli.' : 'Registration failed. Please try again.' });
    } finally {
      setLoading(false);
    }
  };

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
      {/* Header & Back Button */}
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

      {/* 2-Step Segment Indicator */}
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

      {/* Main Registration Card */}
      <View style={styles.registerCard}>
        {step === 1 ? (
          /* STEP 1: HEAD OF HOUSEHOLD & VALID ID */
          <View>
            <View style={styles.cardHeaderGroup}>
              <Text style={styles.cardTitle}>
                {lang === 'tl' ? 'Impormasyon ng Punong-Pamilya' : 'Head of Household Information'}
              </Text>
              <Text style={styles.cardSub}>
                {lang === 'tl'
                  ? 'Ilagay ang opisyal na legal na pangalan at government ID para sa beripikasyon ng LGU relief eligibility.'
                  : 'Enter verified legal name and government ID for official LGU relief eligibility.'}
              </Text>
            </View>

            <NeumorphicInput
              label={lang === 'tl' ? 'Buong Legal na Pangalan (Punong-Pamilya)' : 'Full Legal Name (Head of Household)'}
              value={name}
              onChangeText={handleNameChange}
              placeholder={lang === 'tl' ? 'Hal. Maria Clara Santos' : 'e.g. Maria Clara Santos'}
              helperText={lang === 'tl' ? 'Pangalan gaya ng nakasulat sa inyong Valid Government ID' : 'Official name as printed on Valid Government ID'}
              errorText={errors.name}
              required
            />

            <NeumorphicInput
              label={lang === 'tl' ? 'Email Address o Mobile Number' : 'Email Address or Mobile Number'}
              value={emailOrPhone}
              onChangeText={handleEmailOrPhoneChange}
              placeholder="youremail@gmail.com"
              helperText={lang === 'tl' ? 'Gagamitin para sa mga advisory ng ayuda at QR pass' : 'Used for relief distribution schedule updates and QR pass'}
              errorText={errors.emailOrPhone}
              required
              keyboardType="email-address"
              autoCapitalize="none"
            />

            <NeumorphicInput
              label={lang === 'tl' ? 'Gumawa ng Password ng Account' : 'Create Account Password'}
              value={password}
              onChangeText={handlePasswordChange}
              placeholder="••••••••"
              errorText={errors.password}
              required
              secureTextEntry
            />

            {/* Real-time Dynamic Password Strength Checklist (Only shows when user types) */}
            {password.length > 0 && (
              <View style={styles.passwordRulesBox}>
                <Text style={styles.passwordRulesTitle}>
                  {lang === 'tl' ? 'DAPAT MAGLAMAN ANG PASSWORD NG:' : 'PASSWORD MUST CONTAIN:'}
                </Text>

                <View style={styles.ruleItem}>
                  <Text style={[styles.ruleIcon, hasLowercase ? styles.ruleIconValid : styles.ruleIconInvalid]}>
                    {hasLowercase ? '✓' : '✖'}
                  </Text>
                  <Text style={[styles.ruleText, hasLowercase ? styles.ruleTextValid : styles.ruleTextInvalid]}>
                    {lang === 'tl' ? (
                      <>Kahit <Text style={{ fontWeight: '700' }}>isang maliit na titik (lowercase)</Text></>
                    ) : (
                      <>At least <Text style={{ fontWeight: '700' }}>one lowercase</Text> letter</>
                    )}
                  </Text>
                </View>

                <View style={styles.ruleItem}>
                  <Text style={[styles.ruleIcon, hasUppercase ? styles.ruleIconValid : styles.ruleIconInvalid]}>
                    {hasUppercase ? '✓' : '✖'}
                  </Text>
                  <Text style={[styles.ruleText, hasUppercase ? styles.ruleTextValid : styles.ruleTextInvalid]}>
                    {lang === 'tl' ? (
                      <>Kahit <Text style={{ fontWeight: '700' }}>isang malaking titik (uppercase)</Text></>
                    ) : (
                      <>At least <Text style={{ fontWeight: '700' }}>one uppercase</Text> letter</>
                    )}
                  </Text>
                </View>

                <View style={styles.ruleItem}>
                  <Text style={[styles.ruleIcon, hasNumber ? styles.ruleIconValid : styles.ruleIconInvalid]}>
                    {hasNumber ? '✓' : '✖'}
                  </Text>
                  <Text style={[styles.ruleText, hasNumber ? styles.ruleTextValid : styles.ruleTextInvalid]}>
                    {lang === 'tl' ? (
                      <>Kahit <Text style={{ fontWeight: '700' }}>isang numero (0-9)</Text></>
                    ) : (
                      <>At least <Text style={{ fontWeight: '700' }}>one number</Text></>
                    )}
                  </Text>
                </View>

                <View style={styles.ruleItem}>
                  <Text style={[styles.ruleIcon, hasMinLength ? styles.ruleIconValid : styles.ruleIconInvalid]}>
                    {hasMinLength ? '✓' : '✖'}
                  </Text>
                  <Text style={[styles.ruleText, hasMinLength ? styles.ruleTextValid : styles.ruleTextInvalid]}>
                    {lang === 'tl' ? (
                      <>Minimum <Text style={{ fontWeight: '700' }}>8 characters</Text></>
                    ) : (
                      <>Minimum <Text style={{ fontWeight: '700' }}>8 characters</Text></>
                    )}
                  </Text>
                </View>
              </View>
            )}

            {/* Confirm Account Password Input */}
            <NeumorphicInput
              label={lang === 'tl' ? 'Kumpirmahin ang Password' : 'Confirm Account Password'}
              value={confirmPassword}
              onChangeText={handleConfirmPasswordChange}
              placeholder="••••••••"
              errorText={errors.confirmPassword}
              successText={confirmPassword.length > 0 && confirmPassword === password ? (lang === 'tl' ? 'Magkatugma ang password ✓' : 'Passwords match ✓') : undefined}
              required
              secureTextEntry
            />

            {/* Valid Government ID Type Input */}
            <NeumorphicInput
              label={lang === 'tl' ? 'Uri ng Valid Government ID' : 'Valid Government ID Type'}
              value={idType}
              onChangeText={setIdType}
              placeholder={lang === 'tl' ? 'Hal. National ID / PhilID, Driver License, etc.' : 'e.g. National ID / PhilID, Driver License, etc.'}
              errorText={errors.idType}
              required
            />

            {/* Government ID Photo Upload Card */}
            <View style={styles.idUploadSection}>
              <View style={styles.idUploadHeaderRow}>
                <Text style={styles.idUploadLabel}>
                  {lang === 'tl' ? 'LITRATO NG VALID GOVERNMENT ID' : 'VALID GOVERNMENT ID PHOTO'}
                </Text>
                <Text style={styles.idUploadRequiredTag}>* {lang === 'tl' ? 'Kailangan' : 'Required'}</Text>
              </View>
              <Text style={styles.idUploadSub}>
                {lang === 'tl'
                  ? 'Mag-upload ng malinaw na litrato ng inyong ID. Makikita ito ng Barangay Official sa Web Portal upang ma-verify ang inyong account.'
                  : 'Upload a clear photo of your government ID. Barangay Officials will verify this on the Web Admin portal.'}
              </Text>

              {idPhoto ? (
                /* Selected ID Photo Preview Box */
                <View style={styles.idPreviewContainer}>
                  <Image source={{ uri: idPhoto }} style={styles.idPreviewImg} resizeMode="cover" />
                  <View style={styles.idPreviewMeta}>
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                      <CheckIcon size={14} color="#16A34A" />
                      <Text style={styles.idPreviewSuccessText}>
                        {lang === 'tl' ? 'Naka-attach ang Litrato ng ID' : 'ID Photo Attached'}
                      </Text>
                    </View>
                    <Text style={styles.idPreviewFileName} numberOfLines={1}>
                      {idPhotoName || 'valid_id_photo.jpg'}
                    </Text>
                  </View>
                  <TouchableOpacity
                    style={styles.idRemoveBtn}
                    onPress={() => {
                      setIdPhoto(null);
                      setIdPhotoName('');
                    }}
                    activeOpacity={0.8}
                  >
                    <TrashIcon size={14} color="#DC2626" />
                    <Text style={styles.idRemoveBtnText}>{lang === 'tl' ? 'Palitan' : 'Replace'}</Text>
                  </TouchableOpacity>
                </View>
              ) : (
                /* Upload Action Buttons (Camera / Gallery) */
                <View style={styles.idUploadBtnRow}>
                  <TouchableOpacity
                    style={styles.idCameraBtn}
                    onPress={handlePickIdFromCamera}
                    activeOpacity={0.85}
                  >
                    <View style={styles.idBtnIconCircle}>
                      <CameraIcon size={20} color="#1557B0" />
                    </View>
                    <Text style={styles.idBtnMainText}>{lang === 'tl' ? 'Kumuha sa Camera' : 'Take with Camera'}</Text>
                    <Text style={styles.idBtnSubText}>{lang === 'tl' ? 'Gamitin ang camera' : 'Capture photo now'}</Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={styles.idGalleryBtn}
                    onPress={handlePickIdFromLibrary}
                    activeOpacity={0.85}
                  >
                    <View style={[styles.idBtnIconCircle, { backgroundColor: '#F1F5F9' }]}>
                      <ImageIcon size={20} color="#475569" />
                    </View>
                    <Text style={styles.idBtnMainText}>{lang === 'tl' ? 'Pumili sa Gallery' : 'Choose from Gallery'}</Text>
                    <Text style={styles.idBtnSubText}>{lang === 'tl' ? 'Pumili ng litrato' : 'Browse files'}</Text>
                  </TouchableOpacity>
                </View>
              )}

              {errors.idPhoto && (
                <Text style={styles.idErrorText}>{errors.idPhoto}</Text>
              )}
            </View>

            <MotionPressable style={styles.submitBtn} onPress={handleNext} activeOpacity={0.85}>
              <Text style={styles.submitBtnText}>
                {lang === 'tl' ? 'Magpatuloy sa Talaan ng Pamilya (Hakbang 2)' : 'Continue to Family Roster (Step 2)'}
              </Text>
            </MotionPressable>
          </View>
        ) : (
          /* STEP 2: HOUSEHOLD COMPOSITION & DETAILED FAMILY ROSTER */
          <View>
            <View style={styles.cardHeaderGroup}>
              <Text style={styles.cardTitle}>
                {lang === 'tl' ? 'Talaan ng Pamilya at Tirahan' : 'Household Composition & Address'}
              </Text>
              <Text style={styles.cardSub}>
                {lang === 'tl'
                  ? 'Awtomatikong kinakalkula ang inyong quota ng ayuda batay sa bilang ng miyembro at espesyal na kalagayan.'
                  : 'Your relief quota allocation is automatically calculated based on headcount and special conditions.'}
              </Text>
            </View>

            {/* Barangay Selector */}
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
                    {MANILA_BARANGAYS.find(b => b.code === selectedBrgyCode)?.name || `Barangay ${selectedBrgyCode} (Manila)`}
                  </Text>
                </View>
                <Text style={styles.brgyChangeText}>{showBrgyList ? 'Close ▲' : 'Change ▼'}</Text>
              </TouchableOpacity>

              {showBrgyList && (
                <View style={styles.brgyDropdown}>
                  {/* Search Input Filter Bar */}
                  <View style={styles.brgySearchContainer}>
                    <SearchIcon size={15} color="#1557B0" />
                    <TextInput
                      style={styles.brgySearchInput}
                      placeholder={lang === 'tl' ? 'Maghanap (hal. 291, 300, Zone)...' : 'Search (e.g. 291, 300, Zone)...'}
                      placeholderTextColor="#94A3B8"
                      value={brgySearch}
                      onChangeText={setBrgySearch}
                      autoCapitalize="none"
                      autoCorrect={false}
                    />
                    {brgySearch.length > 0 && (
                      <TouchableOpacity
                        onPress={() => setBrgySearch('')}
                        style={styles.brgySearchClear}
                        hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                      >
                        <CloseIcon size={12} color="#64748B" />
                      </TouchableOpacity>
                    )}
                  </View>

                  {/* Scrollable Suggestions List */}
                  <ScrollView
                    style={styles.brgyScrollContainer}
                    nestedScrollEnabled={true}
                    keyboardShouldPersistTaps="handled"
                    showsVerticalScrollIndicator={true}
                  >
                    {filteredBarangays.length > 0 ? (
                      filteredBarangays.map((b) => {
                        const isSelected = selectedBrgyCode === b.code;
                        return (
                          <TouchableOpacity
                            key={b.code}
                            style={[styles.brgyOption, isSelected && styles.brgyOptionSelected]}
                            onPress={() => {
                              setSelectedBrgyCode(b.code);
                              setShowBrgyList(false);
                              setBrgySearch('');
                            }}
                            activeOpacity={0.7}
                          >
                            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, flex: 1 }}>
                              <View style={[styles.brgyOptionDot, isSelected && styles.brgyOptionDotSelected]} />
                              <Text style={[styles.brgyOptionText, isSelected && styles.brgyOptionTextSelected]}>
                                {b.name}
                              </Text>
                            </View>
                            {isSelected && <CheckIcon size={14} color="#1557B0" />}
                          </TouchableOpacity>
                        );
                      })
                    ) : (
                      <View style={styles.brgyNoResults}>
                        <Text style={styles.brgyNoResultsText}>
                          {lang === 'tl' ? 'Walang natagpuang barangay.' : 'No matching barangays found.'}
                        </Text>
                      </View>
                    )}
                  </ScrollView>
                </View>
              )}
            </View>

            {/* Street Address Input (Full Width) */}
            <NeumorphicInput
              label={lang === 'tl' ? 'Address ng Bahay (Kalye)' : 'Street Address'}
              value={address}
              onChangeText={handleAddressChange}
              placeholder={lang === 'tl' ? 'Hal. 123 Calle Real, San Andres Bukid' : 'e.g. 123 Calle Real, San Andres Bukid'}
              errorText={errors.address}
              required
            />

            {/* Purok / Zone Input (Full Width) */}
            <NeumorphicInput
              label={lang === 'tl' ? 'Purok / Zone' : 'Purok / Zone'}
              value={purok}
              onChangeText={handlePurokChange}
              placeholder={lang === 'tl' ? 'Hal. Purok 3' : 'e.g. Purok 3'}
              errorText={errors.purok}
              required
            />

            {/* Live Vulnerability Metrics Strip */}
            <View style={styles.metricsStrip}>
              <View style={styles.metricPill}>
                <Text style={styles.metricPillLabel}>{lang === 'tl' ? 'KABUUANG MIYEMBRO' : 'TOTAL HEADCOUNT'}</Text>
                <Text style={styles.metricPillValue}>{totalHeadcount} {lang === 'tl' ? 'tao' : 'persons'}</Text>
              </View>
              <View style={styles.metricPill}>
                <Text style={styles.metricPillLabel}>{lang === 'tl' ? 'SENIOR CITIZENS' : 'SENIOR CITIZENS'}</Text>
                <Text style={[styles.metricPillValue, seniorCount > 0 && { color: '#D97706' }]}>{seniorCount}</Text>
              </View>
              <View style={styles.metricPill}>
                <Text style={styles.metricPillLabel}>{lang === 'tl' ? 'PWD / MEDICAL' : 'PWD / MEDICAL'}</Text>
                <Text style={[styles.metricPillValue, pwdCount > 0 && { color: '#DC2626' }]}>{pwdCount}</Text>
              </View>
              <View style={styles.metricPill}>
                <Text style={styles.metricPillLabel}>{lang === 'tl' ? 'BUNTIS / SANGGOL' : 'PREGNANT / INFANT'}</Text>
                <Text style={[styles.metricPillValue, (pregnantCount + infantCount) > 0 && { color: '#1557B0' }]}>
                  {pregnantCount + infantCount}
                </Text>
              </View>
            </View>

            {/* Family Members Roster Section */}
            <View style={styles.rosterSectionHeader}>
              <View style={styles.rosterSectionTitleGroup}>
                <Text style={styles.rosterSectionTitle} numberOfLines={1}>
                  {lang === 'tl' ? `Talaan ng Miyembro (${totalHeadcount})` : `Household Members (${totalHeadcount})`}
                </Text>
                <Text style={styles.rosterSectionSub} numberOfLines={1}>
                  {lang === 'tl' ? 'Pangalan, edad, at kalagayan' : 'Names, ages, and conditions'}
                </Text>
              </View>
              <TouchableOpacity
                style={styles.addMemberBtn}
                onPress={() => setShowAddMemberModal(true)}
                activeOpacity={0.8}
              >
                <Text style={styles.addMemberBtnText}>
                  {lang === 'tl' ? '+ Dagdag' : '+ Add Member'}
                </Text>
              </TouchableOpacity>
            </View>

            {/* Member Cards List */}
            <View style={styles.membersListContainer}>
              {membersList.map((m, index) => (
                <View key={m.id || index} style={styles.memberCard}>
                  <View style={styles.memberCardTop}>
                    <View style={{ flex: 1 }}>
                      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                        <Text style={styles.memberName}>{m.name}</Text>
                        <View style={styles.memberAgeBadge}>
                          <Text style={styles.memberAgeText}>
                            {m.condition === 'child' || m.age === '0'
                              ? (lang === 'tl' ? '🍼 Sanggol (< 1 taon)' : '🍼 Infant (< 1 yr)')
                              : `${m.age} ${lang === 'tl' ? 'taon' : 'yrs'}`}
                          </Text>
                        </View>
                      </View>
                      <Text style={styles.memberRelText}>{m.relationship}</Text>
                    </View>

                    {index > 0 && (
                      <TouchableOpacity onPress={() => handleRemoveMember(m.id)} style={styles.removeMemberBtn}>
                        <CloseIcon size={12} color="#DC2626" />
                      </TouchableOpacity>
                    )}
                  </View>

                  {/* Condition Tag */}
                  {m.condition !== 'none' && (
                    <View style={styles.conditionTag}>
                      <Text style={styles.conditionTagText}>
                        {m.condition === 'pwd' ? (lang === 'tl' ? 'PWD (May Kapansanan)' : 'PWD (Person with Disability)') :
                         m.condition === 'pregnant' ? (lang === 'tl' ? 'Buntis / Nagpapasuso' : 'Pregnant / Lactating') :
                         m.condition === 'senior' ? (lang === 'tl' ? 'Senior Citizen (60+)' : 'Senior Citizen (60+)') :
                         m.condition === 'child' ? (lang === 'tl' ? 'Sanggol (< 1 taon)' : 'Infant (< 1 yr)') : (lang === 'tl' ? 'May Sakit / Maintenance' : 'Medical Condition')}
                      </Text>
                    </View>
                  )}
                </View>
              ))}
            </View>

            {/* Add Member Inline Sub-Form */}
            {showAddMemberModal && (
              <View style={styles.addMemberBox}>
                <Text style={styles.addMemberBoxTitle}>
                  {lang === 'tl' ? 'Dagdag Miyembro ng Pamilya' : 'Add Family Member'}
                </Text>
                <NeumorphicInput
                  label={lang === 'tl' ? 'Buong Pangalan ng Miyembro' : 'Member Full Name'}
                  value={newMemberName}
                  onChangeText={setNewMemberName}
                  placeholder={lang === 'tl' ? 'Hal. Juanito Santos' : 'e.g. Juanito Santos'}
                  required
                />
                <View style={{ flexDirection: 'row', gap: 10 }}>
                  {newMemberCondition !== 'child' ? (
                    <View style={{ flex: 1 }}>
                      <NeumorphicInput
                        label={lang === 'tl' ? 'Edad *' : 'Age *'}
                        value={newMemberAge}
                        onChangeText={setNewMemberAge}
                        placeholder={lang === 'tl' ? 'Hal. 8' : 'e.g. 8'}
                        keyboardType="numeric"
                        required
                      />
                    </View>
                  ) : (
                    <View style={{ flex: 1, justifyContent: 'center', backgroundColor: '#EFF6FF', borderRadius: 10, borderWidth: 1.5, borderColor: '#93C5FD', padding: 10, marginBottom: 12 }}>
                      <Text style={{ fontSize: 11.5, fontWeight: '800', color: '#1E40AF' }}>
                        🍼 {lang === 'tl' ? 'Sanggol (Infant)' : 'Infant Member'}
                      </Text>
                      <Text style={{ fontSize: 9.5, color: '#3B82F6', marginTop: 2 }}>
                        {lang === 'tl' ? 'Wala pang 1 taon (hindi na kailangan ng edad)' : 'Under 1 yr (no age input needed)'}
                      </Text>
                    </View>
                  )}
                  <View style={{ flex: 1.5 }}>
                    <Text style={styles.inputLabel}>{lang === 'tl' ? 'Relasyon *' : 'Relationship *'}</Text>
                    <View style={styles.relPills}>
                      {(lang === 'tl'
                        ? ['Anak', 'Asawa', 'Magulang', 'Kapatid', 'Iba pa']
                        : ['Child', 'Spouse', 'Parent', 'Sibling', 'Other']
                      ).map(r => (
                        <TouchableOpacity
                          key={r}
                          style={[styles.relPillBtn, newMemberRel === r && styles.relPillBtnActive]}
                          onPress={() => setNewMemberRel(r)}
                        >
                          <Text style={[styles.relPillText, newMemberRel === r && styles.relPillTextActive]}>{r}</Text>
                        </TouchableOpacity>
                      ))}
                    </View>
                  </View>
                </View>

                {/* Special Condition Selector */}
                <Text style={styles.inputLabel}>
                  {lang === 'tl' ? 'Espesyal na Kalagayan (Opsyonal)' : 'Special Condition (Optional)'}
                </Text>
                <View style={styles.conditionPills}>
                  {(lang === 'tl'
                    ? [
                        { key: 'none', label: 'Wala' },
                        { key: 'pwd', label: 'PWD' },
                        { key: 'pregnant', label: 'Buntis' },
                        { key: 'senior', label: 'Senior (60+)' },
                        { key: 'child', label: 'Sanggol (Infant)' },
                      ]
                    : [
                        { key: 'none', label: 'None' },
                        { key: 'pwd', label: 'PWD' },
                        { key: 'pregnant', label: 'Pregnant' },
                        { key: 'senior', label: 'Senior (60+)' },
                        { key: 'child', label: 'Infant' },
                      ]
                  ).map(c => (
                    <TouchableOpacity
                      key={c.key}
                      style={[styles.condPillBtn, newMemberCondition === c.key && styles.condPillBtnActive]}
                      onPress={() => setNewMemberCondition(c.key)}
                    >
                      <Text style={[styles.condPillText, newMemberCondition === c.key && styles.condPillTextActive]}>
                        {c.label}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>

                <View style={{ flexDirection: 'row', gap: 8, marginTop: 10 }}>
                  <TouchableOpacity
                    style={styles.cancelAddBtn}
                    onPress={() => setShowAddMemberModal(false)}
                  >
                    <Text style={styles.cancelAddBtnText}>
                      {lang === 'tl' ? 'Kanselahin' : 'Cancel'}
                    </Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={styles.confirmAddBtn}
                    onPress={handleAddMember}
                  >
                    <Text style={styles.confirmAddBtnText}>
                      {lang === 'tl' ? '+ I-save ang Miyembro sa Listahan' : '+ Save Member to List'}
                    </Text>
                  </TouchableOpacity>
                </View>
              </View>
            )}

            {/* Official Certification Checkbox */}
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
                  ? 'Taos-puso kong pinatutunayan sa ilalim ng parusa ng batas na ang lahat ng impormasyon, edad, at kalagayan ng aking pamilya ay totoo at tumpak.'
                  : 'I solemnly certify under penalty of law that all household members, ages, and conditions stated above are accurate and truthful.'}
              </Text>
            </TouchableOpacity>
            {errors.certified && <Text style={styles.errorInline}>{errors.certified}</Text>}

            {/* Final Registration Submit CTA with MotionPressable */}
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
                  {lang === 'tl' ? 'I-submit ang Pagpaparehistro ng Pamilya' : 'Submit Household Registration'}
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
  brgySearchClear: {
    padding: 4,
    backgroundColor: '#E2E8F0',
    borderRadius: 10,
  },
  brgyScrollContainer: {
    maxHeight: 220,
  },
  brgyOption: {
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  brgyOptionSelected: {
    backgroundColor: '#E8F2FF',
  },
  brgyOptionDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#CBD5E1',
  },
  brgyOptionDotSelected: {
    backgroundColor: '#1557B0',
    width: 8,
    height: 8,
    borderRadius: 4,
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
  brgyNoResults: {
    padding: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  brgyNoResultsText: {
    fontSize: 12,
    color: '#94A3B8',
    fontStyle: 'italic',
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
    fontSize: 7.5,
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
  rosterSectionTitleGroup: {
    flex: 1,
  },
  rosterSectionTitle: {
    fontSize: 13,
    fontWeight: '800',
    color: '#172B4D',
  },
  rosterSectionSub: {
    fontSize: 10,
    color: '#64748B',
    marginTop: 1,
  },
  addMemberBtn: {
    backgroundColor: '#E8F2FF',
    borderWidth: 1.5,
    borderColor: '#BFDBFE',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
    flexShrink: 0,
    alignItems: 'center',
    justifyContent: 'center',
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
  memberAgeBadge: {
    backgroundColor: '#E2E8F0',
    paddingHorizontal: 6,
    paddingVertical: 1,
    borderRadius: 4,
  },
  memberAgeText: {
    fontSize: 9.5,
    fontWeight: '700',
    color: '#475569',
  },
  memberRelText: {
    fontSize: 10.5,
    color: '#64748B',
    marginTop: 1,
  },
  removeMemberBtn: {
    padding: 4,
  },
  conditionTag: {
    alignSelf: 'flex-start',
    backgroundColor: '#FEF3C7',
    borderWidth: 1,
    borderColor: '#FDE68A',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
    marginTop: 6,
  },
  conditionTagText: {
    fontSize: 9.5,
    fontWeight: '800',
    color: '#B45309',
  },
  addMemberBox: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    borderWidth: 1.5,
    borderColor: '#1557B0',
    padding: 14,
    marginBottom: 14,
    ...SHADOWS.sm,
  },
  addMemberBoxTitle: {
    fontSize: 13,
    fontWeight: '800',
    color: '#1557B0',
    marginBottom: 10,
  },
  inputLabel: {
    fontSize: 10.5,
    fontWeight: '800',
    color: '#172B4D',
    marginBottom: 4,
  },
  relPills: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 4,
    marginBottom: 10,
  },
  relPillBtn: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#D9E2EC',
    backgroundColor: '#F8F9F7',
  },
  relPillBtnActive: {
    backgroundColor: '#E8F2FF',
    borderColor: '#1557B0',
  },
  relPillText: {
    fontSize: 10,
    color: '#64748B',
    fontWeight: '600',
  },
  relPillTextActive: {
    color: '#1557B0',
    fontWeight: '800',
  },
  conditionPills: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 4,
    marginBottom: 10,
  },
  condPillBtn: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#D9E2EC',
    backgroundColor: '#F8F9F7',
  },
  condPillBtnActive: {
    backgroundColor: '#FEF3C7',
    borderColor: '#D97706',
  },
  condPillText: {
    fontSize: 10,
    color: '#64748B',
    fontWeight: '600',
  },
  condPillTextActive: {
    color: '#B45309',
    fontWeight: '800',
  },
  cancelAddBtn: {
    flex: 1,
    backgroundColor: '#F1F5F9',
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
    marginBottom: 6,
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
  errorInline: {
    fontSize: 11,
    color: '#DC2626',
    marginBottom: 8,
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
  // Real-time Password Rules Box
  passwordRulesBox: {
    backgroundColor: '#F8F9F7',
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    padding: 12,
    marginTop: -8,
    marginBottom: 14,
    gap: 6,
  },
  passwordRulesTitle: {
    fontSize: 10,
    fontWeight: '800',
    color: '#475569',
    letterSpacing: 0.6,
    marginBottom: 2,
  },
  ruleItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  ruleIcon: {
    fontSize: 13,
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
    fontSize: 11,
  },
  ruleTextValid: {
    color: '#15803D',
    fontWeight: '600',
  },
  ruleTextInvalid: {
    color: '#DC2626',
    fontWeight: '500',
  },
  // Government ID Photo Upload Card
  idUploadSection: {
    backgroundColor: '#F8F9F7',
    borderRadius: 12,
    borderWidth: 1.5,
    borderColor: '#D9E2EC',
    padding: 14,
    marginBottom: 16,
  },
  idUploadHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 2,
  },
  idUploadLabel: {
    fontSize: 10,
    fontWeight: '800',
    color: '#172B4D',
    letterSpacing: 0.8,
  },
  idUploadRequiredTag: {
    fontSize: 10,
    fontWeight: '800',
    color: '#DC2626',
  },
  idUploadSub: {
    fontSize: 11,
    color: '#64748B',
    lineHeight: 15,
    marginBottom: 12,
  },
  idUploadBtnRow: {
    flexDirection: 'row',
    gap: 10,
  },
  idCameraBtn: {
    flex: 1,
    backgroundColor: '#E8F2FF',
    borderWidth: 1.5,
    borderColor: '#BFDBFE',
    borderRadius: 10,
    paddingVertical: 12,
    paddingHorizontal: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  idGalleryBtn: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    borderWidth: 1.5,
    borderColor: '#CBD5E1',
    borderRadius: 10,
    paddingVertical: 12,
    paddingHorizontal: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  idBtnIconCircle: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#BFDBFE',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 6,
  },
  idBtnMainText: {
    fontSize: 11.5,
    fontWeight: '800',
    color: '#1557B0',
    textAlign: 'center',
  },
  idBtnSubText: {
    fontSize: 9.5,
    color: '#64748B',
    marginTop: 1,
    textAlign: 'center',
  },
  idPreviewContainer: {
    backgroundColor: '#FFFFFF',
    borderRadius: 10,
    borderWidth: 1.5,
    borderColor: '#16A34A',
    padding: 10,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  idPreviewImg: {
    width: 64,
    height: 44,
    borderRadius: 6,
    backgroundColor: '#E2E8F0',
  },
  idPreviewMeta: {
    flex: 1,
  },
  idPreviewSuccessText: {
    fontSize: 11.5,
    fontWeight: '800',
    color: '#16A34A',
  },
  idPreviewFileName: {
    fontSize: 10,
    color: '#64748B',
    marginTop: 2,
  },
  idRemoveBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#FEE2E2',
    borderWidth: 1,
    borderColor: '#FCA5A5',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 6,
  },
  idRemoveBtnText: {
    fontSize: 11,
    fontWeight: '800',
    color: '#DC2626',
  },
  idErrorText: {
    fontSize: 11,
    color: '#DC2626',
    marginTop: 6,
    fontWeight: '600',
  },
});

import React, { useState, useEffect } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ScrollView, Alert, Image, ActivityIndicator, Platform, KeyboardAvoidingView, Keyboard } from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { submitDamageReport } from '../services/api';
import NeumorphicInput from '../components/NeumorphicInput';
import { CameraIcon, ImageIcon, CheckIcon, ShieldCheckIcon, ArrowLeftIcon, MapPinIcon } from '../components/AppIcons';
import { FONT_WEIGHT, SHADOWS, RESPONSIVE, hp } from '../theme';
import { TRANSLATIONS } from '../i18n/translations';
import { MotionSeverityTile, MotionPressable } from '../components/motion';

function SeveritySelectorTray({ severities, currentLevel, onSelect }) {
  return (
    <View style={styles.severityGrid}>
      {severities.map((s) => {
        const isSelected = currentLevel === s.level;
        return (
          <MotionPressable
            key={s.level}
            style={[
              styles.severityTile,
              isSelected && {
                borderColor: s.color,
                backgroundColor: s.badgeBg || '#EFF6FF',
                borderWidth: 2,
              },
            ]}
            onPress={() => onSelect(s.level)}
            activeOpacity={0.85}
          >
            <View style={styles.severityHeaderRow}>
              <View style={[styles.severityDot, { backgroundColor: s.color }]} />
              {isSelected && (
                <View style={[styles.severityCheckBadge, { backgroundColor: s.color }]}>
                  <CheckIcon size={10} color="#FFFFFF" />
                </View>
              )}
            </View>
            <Text style={[styles.severityLabel, isSelected && { color: s.color, fontWeight: '800' }]}>
              {s.label}
            </Text>
            <Text style={[styles.severitySub, isSelected && { color: s.color + 'DD' }]}>{s.sub}</Text>
          </MotionPressable>
        );
      })}
    </View>
  );
}

function PhotoAttachmentSection({ selectedPhoto, onPickCamera, onPickLibrary, onRemove, lang }) {
  return (
    <View style={styles.uploadCard}>
      <Text style={styles.fieldLabel}>{lang === 'tl' ? 'LITRATO NG PINASALANG ARI-ARIAN' : 'EVIDENCE PHOTO'}</Text>
      {selectedPhoto ? (
        <View style={styles.previewBox}>
          <Image source={{ uri: selectedPhoto.uri }} style={styles.previewImg} resizeMode="cover" />
          <TouchableOpacity style={styles.removePhotoBtn} onPress={onRemove}>
            <Text style={styles.removePhotoText}>{lang === 'tl' ? 'Palitan ang Litrato' : 'Change Photo'}</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <View style={styles.uploadActionsRow}>
          <TouchableOpacity style={styles.cameraBtn} onPress={onPickCamera} activeOpacity={0.85}>
            <CameraIcon size={20} color="#1557B0" />
            <Text style={styles.uploadBtnText}>{lang === 'tl' ? 'Camera' : 'Take Photo'}</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.galleryBtn} onPress={onPickLibrary} activeOpacity={0.85}>
            <ImageIcon size={20} color="#475569" />
            <Text style={styles.uploadBtnText}>{lang === 'tl' ? 'Gallery' : 'From Gallery'}</Text>
          </TouchableOpacity>
        </View>
      )}
    </View>
  );
}

export default function ReportDamageScreen({ token, user, householdData, lang = 'en', onBack, onSubmitSuccess }) {
  const t = TRANSLATIONS[lang] || TRANSLATIONS.en;

  const defaultResolvedAddress =
    householdData?.address
      ? `${householdData.address}${householdData.purok ? `, Purok ${householdData.purok}` : ''}, Barangay ${householdData.barangayCode || '291'}, Manila`
      : user?.address
      ? `${user.address}, Barangay ${user.barangayCode || '291'}, Manila`
      : '142 Quirino Ave, Purok 3, Barangay 291, Manila';

  const [damageLevel, setDamageLevel] = useState('Severe');
  const [description, setDescription] = useState('');
  const [addressLandmark, setAddressLandmark] = useState(defaultResolvedAddress);
  const [selectedPhoto, setSelectedPhoto] = useState(null);
  const [loading, setLoading] = useState(false);
  const scrollRef = React.useRef(null);
  const [keyboardHeight, setKeyboardHeight] = useState(0);

  useEffect(() => {
    if (householdData?.address || user?.address) {
      const addr = householdData?.address
        ? `${householdData.address}${householdData.purok ? `, Purok ${householdData.purok}` : ''}, Barangay ${householdData.barangayCode || '291'}, Manila`
        : `${user.address}, Barangay ${user.barangayCode || '291'}, Manila`;
      setAddressLandmark(addr);
    }
  }, [householdData, user]);

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
  const [submitted, setSubmitted] = useState(false);
  const [errors, setErrors] = useState({});

  const [geoCoords, setGeoCoords] = useState(null);
  const [isLocating, setIsLocating] = useState(true);

  useEffect(() => {
    handleGetGPSLocation();
  }, []);

  const handleGetGPSLocation = () => {
    setIsLocating(true);
    if (typeof navigator !== 'undefined' && navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          const lat = Number(pos.coords.latitude.toFixed(6));
          const lng = Number(pos.coords.longitude.toFixed(6));
          setGeoCoords({ lat, lng, accuracy: Math.round(pos.coords.accuracy || 4) });
          setIsLocating(false);
        },
        () => {
          setGeoCoords({ lat: 14.599512, lng: 120.984215, accuracy: 3 });
          setIsLocating(false);
        },
        { enableHighAccuracy: true, timeout: 8000, maximumAge: 10000 }
      );
    } else {
      setGeoCoords({ lat: 14.599512, lng: 120.984215, accuracy: 3 });
      setIsLocating(false);
    }
  };

  const severities = [
    { level: 'Minor', label: t.sevMinor, sub: t.sevMinorSub, color: '#059669', badgeBg: '#ECFDF5' },
    { level: 'Moderate', label: t.sevModerate, sub: t.sevModerateSub, color: '#D97706', badgeBg: '#FEF3C7' },
    { level: 'Severe', label: t.sevSevere, sub: t.sevSevereSub, color: '#DC2626', badgeBg: '#FEE2E2' },
    { level: 'Total', label: t.sevTotal, sub: t.sevTotalSub, color: '#7F1D1D', badgeBg: '#F3E8FF' },
  ];

  const handlePickCamera = async () => {
    try {
      if (Platform.OS !== 'web') {
        const { status } = await ImagePicker.requestCameraPermissionsAsync();
        if (status !== 'granted') {
          Alert.alert(
            lang === 'tl' ? 'Pahintulot sa Camera' : 'Camera Permission',
            lang === 'tl' ? 'Kailangan ng pahintulot sa camera upang kumuha ng litrato ng pinsala.' : 'Camera permission is required.'
          );
          return;
        }
        const result = await ImagePicker.launchCameraAsync({
          mediaTypes: ['images'],
          allowsEditing: true,
          quality: 0.35,
          maxWidth: 900,
          maxHeight: 900,
          base64: true,
        });
        if (!result.canceled && result.assets && result.assets.length > 0) {
          const asset = result.assets[0];
          setSelectedPhoto({
            uri: asset.base64 ? `data:image/jpeg;base64,${asset.base64}` : asset.uri,
            source: 'camera',
            name: 'camera_damage.jpg',
          });
          setErrors((prev) => ({ ...prev, photo: '' }));
        }
      } else if (typeof document !== 'undefined') {
        const input = document.createElement('input');
        input.type = 'file';
        input.accept = 'image/*';
        input.capture = 'environment';
        input.onchange = (e) => {
          const file = e.target.files && e.target.files[0];
          if (file) {
            const reader = new FileReader();
            reader.onload = (event) => {
              setSelectedPhoto({ uri: event.target.result, source: 'camera', name: file.name || 'damage.jpg' });
            };
            reader.readAsDataURL(file);
          }
        };
        input.click();
      }
    } catch (e) {
      console.warn('Camera error:', e);
      Alert.alert(lang === 'tl' ? 'Pansin' : 'Notice', lang === 'tl' ? 'Hindi mabuksan ang camera.' : 'Unable to open camera.');
    }
  };

  const handlePickLibrary = async () => {
    try {
      if (Platform.OS !== 'web') {
        const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
        if (status !== 'granted') {
          Alert.alert(
            lang === 'tl' ? 'Pahintulot sa Gallery' : 'Gallery Permission',
            lang === 'tl' ? 'Kailangan ng pahintulot sa gallery upang pumili ng litrato ng pinsala.' : 'Gallery permission is required.'
          );
          return;
        }
        const result = await ImagePicker.launchImageLibraryAsync({
          mediaTypes: ['images'],
          allowsEditing: true,
          quality: 0.35,
          maxWidth: 900,
          maxHeight: 900,
          base64: true,
        });
        if (!result.canceled && result.assets && result.assets.length > 0) {
          const asset = result.assets[0];
          setSelectedPhoto({
            uri: asset.base64 ? `data:image/jpeg;base64,${asset.base64}` : asset.uri,
            source: 'gallery',
            name: asset.fileName || 'gallery_damage.jpg',
          });
          setErrors((prev) => ({ ...prev, photo: '' }));
        }
      } else if (typeof document !== 'undefined') {
        const input = document.createElement('input');
        input.type = 'file';
        input.accept = 'image/*';
        input.onchange = (e) => {
          const file = e.target.files && e.target.files[0];
          if (file) {
            const reader = new FileReader();
            reader.onload = (event) => {
              setSelectedPhoto({ uri: event.target.result, source: 'gallery', name: file.name || 'damage.jpg' });
            };
            reader.readAsDataURL(file);
          }
        };
        input.click();
      }
    } catch (e) {
      console.warn('Gallery error:', e);
      Alert.alert(lang === 'tl' ? 'Pansin' : 'Notice', lang === 'tl' ? 'Hindi mabuksan ang gallery.' : 'Unable to open gallery.');
    }
  };

  const validate = () => {
    const errs = {};
    if (!description.trim() || description.trim().length < 10) {
      errs.description = lang === 'tl' ? 'Pakilarawan ang sira (minimum 10 chars).' : 'Please describe damage (min 10 chars).';
    }
    if ((damageLevel === 'Severe' || damageLevel === 'Total') && !selectedPhoto) {
      errs.photo = lang === 'tl' ? 'Kailangan ng litrato para sa Severe/Total damage.' : 'Photo required for Severe/Total damage.';
      Alert.alert(lang === 'tl' ? 'Kailangan ng Litrato' : 'Photo Required', errs.photo);
    }
    setErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const handleSubmitReport = async () => {
    if (!validate()) return;
    setLoading(true);
    try {
      await submitDamageReport(
        {
          damageLevel: (damageLevel === 'Total' || damageLevel === 'Totally Damaged') ? 'Totally Damaged' : damageLevel,
          description: `Landmark: ${addressLandmark} | Notes: ${description}`,
          photos: selectedPhoto ? [selectedPhoto.uri] : [],
          latitude: geoCoords?.lat || 14.599512,
          longitude: geoCoords?.lng || 120.984215,
          locationName: addressLandmark,
        },
        token
      );
      setSubmitted(true);
      if (onSubmitSuccess) onSubmitSuccess();
    } catch (err) {
      console.error('Damage report submission error:', err);
      const msg = err.data?.message || err.message || (lang === 'tl' ? 'Hindi naipadala ang ulat. Pakisubukang muli.' : 'Failed to submit report. Please try again.');
      Alert.alert(lang === 'tl' ? 'Hindi Naipadala ang Ulat' : 'Submission Failed', msg);
    } finally {
      setLoading(false);
    }
  };

  if (submitted) {
    return (
      <View style={styles.successContainer}>
        <View style={styles.successIconWell}>
          <CheckIcon size={36} color="#16A34A" />
        </View>
        <Text style={styles.successTitle}>{lang === 'tl' ? 'Nai-submit ang Ulat!' : 'Report Submitted!'}</Text>
        <Text style={styles.successSub}>
          {lang === 'tl' ? 'Naihatid na sa Disaster Command Center ang inyong ulat.' : 'Your report has been sent to the Command Center.'}
        </Text>
        <TouchableOpacity style={styles.backHomeBtn} onPress={onBack}>
          <Text style={styles.backHomeBtnText}>{lang === 'tl' ? 'Bumalik sa Home' : 'Back to Home'}</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <KeyboardAvoidingView
      style={{ flex: 1 }}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      keyboardVerticalOffset={Platform.OS === 'ios' ? 40 : 0}
    >
      <ScrollView
        ref={scrollRef}
        style={styles.container}
        contentContainerStyle={[styles.content, { paddingBottom: 95 + keyboardHeight }]}
        keyboardShouldPersistTaps="handled"
        keyboardDismissMode="on-drag"
      >
        <MotionPressable style={styles.backBtnPill} onPress={onBack} activeOpacity={0.75}>
          <View style={styles.backIconCircle}>
            <ArrowLeftIcon size={14} color="#1557B0" />
          </View>
          <Text style={styles.backBtnText}>{lang === 'tl' ? 'Bumalik' : 'Back'}</Text>
        </MotionPressable>

        <Text style={styles.headerTitle}>{lang === 'tl' ? 'I-ulat ang Pinsala ng Bahay' : 'Report Structural Damage'}</Text>
        <Text style={styles.headerSub}>
          {lang === 'tl' ? 'Mabilisang pagsusuri ng pinsala para sa agarang tulong.' : 'Rapid damage assessment for emergency response.'}
        </Text>

        <View style={styles.sectionHeader}>
          <Text style={styles.sectionLabel}>{lang === 'tl' ? 'ANTAS NG PINSALA' : 'DAMAGE LEVEL'}</Text>
        </View>
        <SeveritySelectorTray severities={severities} currentLevel={damageLevel} onSelect={setDamageLevel} />

        {/* Verified Registered Household Location */}
        <View style={styles.autoLocationCard}>
          <View style={styles.autoLocationHeader}>
            <Text style={styles.autoLocationLabel}>
              {lang === 'tl' ? 'LOKASYON NG TAHANAN' : 'REGISTERED HOUSEHOLD LOCATION *'}
            </Text>
          </View>

          <View style={styles.autoLocationBody}>
            <View style={styles.autoLocationIconCircle}>
              <MapPinIcon size={18} color="#1557B0" />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.autoLocationAddressText}>
                {addressLandmark}
              </Text>
              <Text style={styles.autoLocationGpsText}>
                {isLocating
                  ? (lang === 'tl' ? 'Kinukuha ang live GPS coordinates...' : 'Fetching live GPS coordinates...')
                  : geoCoords
                  ? `GPS: ${geoCoords.lat}, ${geoCoords.lng} (±${geoCoords.accuracy}m)`
                  : 'Barangay 291 GIS Grid Tagged'}
              </Text>
            </View>
          </View>
        </View>

        <NeumorphicInput
          label={lang === 'tl' ? 'Deskripsyon ng Pinsala' : 'Damage Description'}
          value={description}
          onChangeText={setDescription}
          placeholder={lang === 'tl' ? 'Ilarawan ang nangyari...' : 'Describe the damage...'}
          errorText={errors.description}
          multiline
          numberOfLines={3}
          required
        />

        <PhotoAttachmentSection
          selectedPhoto={selectedPhoto}
          onPickCamera={handlePickCamera}
          onPickLibrary={handlePickLibrary}
          onRemove={() => setSelectedPhoto(null)}
          lang={lang}
        />

        <MotionPressable style={[styles.submitBtn, loading && { opacity: 0.7 }]} onPress={handleSubmitReport} disabled={loading}>
          {loading ? <ActivityIndicator color="#FFFFFF" /> : <Text style={styles.submitBtnText}>{lang === 'tl' ? 'I-submit ang Ulat' : 'Submit Damage Report'}</Text>}
        </MotionPressable>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F8FAFC' },
  content: { paddingHorizontal: RESPONSIVE.padding, paddingTop: RESPONSIVE.topSafe + 8, paddingBottom: 95 },
  backBtnPill: {
    alignSelf: 'flex-start',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 7,
    backgroundColor: '#EFF6FF',
    borderWidth: 1,
    borderColor: '#BFDBFE',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    marginBottom: 12,
    ...SHADOWS.sm,
  },
  backIconCircle: {
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#DBEAFE',
  },
  backBtnText: { fontSize: 12, fontWeight: '800', color: '#1557B0', letterSpacing: 0.2 },
  headerTitle: { fontSize: 20, fontWeight: FONT_WEIGHT.black, color: '#172B4D' },
  headerSub: { fontSize: 11.5, color: '#64748B', marginTop: 2, marginBottom: 16 },
  sectionHeader: { marginBottom: 8 },
  sectionLabel: { fontSize: 10.5, fontWeight: '800', color: '#172B4D', letterSpacing: 0.5 },
  autoLocationCard: {
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#D9E2EC',
    borderRadius: 14,
    padding: 14,
    marginBottom: 16,
    ...SHADOWS.sm,
  },
  autoLocationHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 10,
  },
  autoLocationLabel: {
    fontSize: 10.5,
    fontWeight: '800',
    color: '#172B4D',
    letterSpacing: 0.5,
  },
  autoLocationBody: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    backgroundColor: '#F8FAFC',
    padding: 12,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  autoLocationIconCircle: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#EFF6FF',
    alignItems: 'center',
    justifyContent: 'center',
  },
  autoLocationAddressText: {
    fontSize: 13,
    fontWeight: '800',
    color: '#0F172A',
  },
  autoLocationGpsText: {
    fontSize: 10.5,
    color: '#64748B',
    marginTop: 2,
    fontWeight: '600',
  },
  severityGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginBottom: 16 },
  severityTile: {
    flex: 1,
    minWidth: '47%',
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    padding: 12,
    borderWidth: 1.5,
    borderColor: '#D9E2EC',
    ...SHADOWS.sm,
  },
  severityHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 6,
  },
  severityDot: { width: 9, height: 9, borderRadius: 4.5 },
  severityCheckBadge: {
    width: 16,
    height: 16,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  severityLabel: { fontSize: 13, fontWeight: '700', color: '#172B4D', marginBottom: 2 },
  severitySub: { fontSize: 10, color: '#64748B', lineHeight: 14 },
  uploadCard: { backgroundColor: '#FFFFFF', borderRadius: 12, borderWidth: 1, borderColor: '#D9E2EC', padding: 12, marginBottom: 16 },
  fieldLabel: { fontSize: 10.5, fontWeight: '800', color: '#172B4D', marginBottom: 8 },
  uploadActionsRow: { flexDirection: 'row', gap: 8 },
  cameraBtn: { flex: 1, backgroundColor: '#E8F2FF', paddingVertical: 10, borderRadius: 8, alignItems: 'center', gap: 4 },
  galleryBtn: { flex: 1, backgroundColor: '#F1F5F9', paddingVertical: 10, borderRadius: 8, alignItems: 'center', gap: 4 },
  uploadBtnText: { fontSize: 11, fontWeight: '700', color: '#172B4D' },
  previewBox: { alignItems: 'center' },
  previewImg: { width: '100%', height: 140, borderRadius: 8, backgroundColor: '#E2E8F0', marginBottom: 8 },
  removePhotoBtn: { paddingVertical: 4, paddingHorizontal: 8 },
  removePhotoText: { fontSize: 11, fontWeight: '700', color: '#1557B0' },
  submitBtn: { backgroundColor: '#1557B0', paddingVertical: 14, borderRadius: 10, alignItems: 'center', marginTop: 8, ...SHADOWS.sm },
  submitBtnText: { color: '#FFFFFF', fontSize: 13.5, fontWeight: '800' },
  successContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 24, backgroundColor: '#F8F9F7' },
  successIconWell: { width: 64, height: 64, borderRadius: 32, backgroundColor: '#DCFCE7', justifyContent: 'center', alignItems: 'center', marginBottom: 16 },
  successTitle: { fontSize: 18, fontWeight: FONT_WEIGHT.black, color: '#172B4D', marginBottom: 6 },
  successSub: { fontSize: 12, color: '#64748B', textAlign: 'center', marginBottom: 20 },
  backHomeBtn: { backgroundColor: '#1557B0', paddingVertical: 12, paddingHorizontal: 24, borderRadius: 8 },
  backHomeBtnText: { color: '#FFFFFF', fontSize: 13, fontWeight: '800' },
});

import React, { useState, useEffect } from 'react';
import { LinearGradient } from 'expo-linear-gradient';
import { View, Text, TouchableOpacity, StyleSheet, ScrollView, Alert, Image, ActivityIndicator, Platform, KeyboardAvoidingView, Keyboard } from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import * as Location from 'expo-location';
import { submitDamageReport } from '../services/api';
import NeumorphicInput from '../components/NeumorphicInput';
import { CameraIcon, ImageIcon, CheckIcon, ShieldCheckIcon, ArrowLeftIcon, MapPinIcon } from '../components/AppIcons';
import { FONT_WEIGHT, SHADOWS, RESPONSIVE, hp } from '../theme';
import { TRANSLATIONS } from '../i18n/translations';
import { MotionSeverityTile, MotionPressable } from '../components/motion';

function SeveritySelectorTray({ severities, currentLevel, onSelect, lang = 'en' }) {
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
                backgroundColor: s.badgeBg || '#EDF1FB',
                borderWidth: 2,
              },
            ]}
            onPress={() => onSelect(s.level)}
            activeOpacity={0.85}
            accessibilityRole="button"
            accessibilityState={{ selected: isSelected }}
            accessibilityLabel={`${s.label}, ${s.sub}`}
            accessibilityHint={lang === 'tl' ? `Piliin ang ${s.label} na antas ng pinsala` : `Select ${s.label} damage level`}
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
          <TouchableOpacity
            style={styles.removePhotoBtn}
            onPress={onRemove}
            accessibilityRole="button"
            accessibilityLabel={lang === 'tl' ? 'Palitan ang Litrato' : 'Change Photo'}
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          >
            <Text style={styles.removePhotoText}>{lang === 'tl' ? 'Palitan ang Litrato' : 'Change Photo'}</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <View style={styles.uploadActionsRow}>
          <TouchableOpacity
            style={styles.cameraBtn}
            onPress={onPickCamera}
            activeOpacity={0.85}
            accessibilityRole="button"
            accessibilityLabel={lang === 'tl' ? 'Kumuha ng litrato gamit ang camera' : 'Take photo with camera'}
            hitSlop={{ top: 4, bottom: 4, left: 4, right: 4 }}
          >
            <CameraIcon size={20} color="#1C3F94" />
            <Text style={styles.uploadBtnText}>{lang === 'tl' ? 'Camera' : 'Take Photo'}</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.galleryBtn}
            onPress={onPickLibrary}
            activeOpacity={0.85}
            accessibilityRole="button"
            accessibilityLabel={lang === 'tl' ? 'Pumili ng litrato mula sa gallery' : 'Choose photo from gallery'}
            hitSlop={{ top: 4, bottom: 4, left: 4, right: 4 }}
          >
            <ImageIcon size={20} color="#3D5070" />
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

  const getBarangayCentroid = (bCode) => {
    const num = parseInt(bCode, 10) || 291;
    if (num >= 268 && num <= 394) {
      if (num === 291) return { lat: 14.6048, lng: 120.9815 };
      if (num === 344) return { lat: 14.6110, lng: 120.9850 };
      return { lat: Number((14.6050 + ((num % 10) * 0.001)).toFixed(6)), lng: Number((120.9820 + ((num % 7) * 0.001)).toFixed(6)) };
    }
    if (num <= 146) {
      return { lat: Number((14.6150 + ((num % 15) * 0.001)).toFixed(6)), lng: Number((120.9700 + ((num % 10) * 0.001)).toFixed(6)) };
    }
    if (num <= 267) {
      return { lat: Number((14.6250 + ((num % 15) * 0.001)).toFixed(6)), lng: Number((120.9800 + ((num % 10) * 0.001)).toFixed(6)) };
    }
    if (num <= 586) {
      return { lat: Number((14.6050 + ((num % 15) * 0.001)).toFixed(6)), lng: Number((120.9980 + ((num % 10) * 0.001)).toFixed(6)) };
    }
    if (num <= 828) {
      return { lat: Number((14.5750 + ((num % 15) * 0.001)).toFixed(6)), lng: Number((120.9850 + ((num % 10) * 0.001)).toFixed(6)) };
    }
    return { lat: Number((14.5850 + ((num % 15) * 0.001)).toFixed(6)), lng: Number((121.0050 + ((num % 10) * 0.001)).toFixed(6)) };
  };

  const handleGetGPSLocation = async () => {
    setIsLocating(true);
    const brgyCode = householdData?.barangayCode || user?.barangayCode || '291';
    const fallback = getBarangayCentroid(brgyCode);

    try {
      if (Platform.OS !== 'web') {
        const { status } = await Location.requestForegroundPermissionsAsync();
        if (status === 'granted') {
          const loc = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
          if (loc && loc.coords) {
            const lat = Number(loc.coords.latitude.toFixed(6));
            const lng = Number(loc.coords.longitude.toFixed(6));
            setGeoCoords({ lat, lng, accuracy: Math.round(loc.coords.accuracy || 4) });
            setIsLocating(false);
            return;
          }
        }
      }
    } catch (e) {
      console.warn('Expo location error:', e);
    }

    if (typeof navigator !== 'undefined' && navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          const lat = Number(pos.coords.latitude.toFixed(6));
          const lng = Number(pos.coords.longitude.toFixed(6));
          setGeoCoords({ lat, lng, accuracy: Math.round(pos.coords.accuracy || 4) });
          setIsLocating(false);
        },
        () => {
          setGeoCoords({ lat: fallback.lat, lng: fallback.lng, accuracy: 5 });
          setIsLocating(false);
        },
        { enableHighAccuracy: true, timeout: 5000, maximumAge: 10000 }
      );
    } else {
      setGeoCoords({ lat: fallback.lat, lng: fallback.lng, accuracy: 5 });
      setIsLocating(false);
    }
  };

  const severities = [
    { level: 'Minor', label: t.sevMinor, sub: t.sevMinorSub, color: '#0D8A5A', badgeBg: '#E6F6EF' },
    { level: 'Moderate', label: t.sevModerate, sub: t.sevModerateSub, color: '#B8932A', badgeBg: '#FEF3C7' },
    { level: 'Severe', label: t.sevSevere, sub: t.sevSevereSub, color: '#C8102E', badgeBg: '#FEF0F2' },
    { level: 'Total', label: t.sevTotal, sub: t.sevTotalSub, color: '#0B1525', badgeBg: '#F3F6FC' },
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
        <TouchableOpacity
          style={styles.backHomeBtn}
          onPress={onBack}
          accessibilityRole="button"
          accessibilityLabel={lang === 'tl' ? 'Bumalik sa Home' : 'Back to Home'}
        >
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
        contentContainerStyle={[{ paddingBottom: 50 + keyboardHeight }]}
        keyboardShouldPersistTaps="handled"
        keyboardDismissMode="on-drag"
      >
        <LinearGradient colors={['#6E071A', '#C8102E', '#9E0B24']} start={{x:0, y:0}} end={{x:1, y:1}} style={{marginBottom: 20}}>
          <View style={{height: 3, backgroundColor: '#C9A84C'}} />
          <View style={{ height: Platform.OS==='web' ? 0 : RESPONSIVE.topSafe + 4 }} />
          <View style={{ flexDirection: 'row', alignItems: 'center', paddingHorizontal: 18, paddingVertical: 12 }}>
            <TouchableOpacity
              onPress={onBack}
              style={{
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
              }}
              activeOpacity={0.8}
              accessibilityRole="button"
              accessibilityLabel={lang === 'tl' ? 'Bumalik sa dashboard' : 'Go back to dashboard'}
              accessibilityHint={lang === 'tl' ? 'Babalik sa home screen' : 'Returns to the home screen'}
              hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            >
              <ArrowLeftIcon size={18} color="#FFFFFF" strokeWidth={1.8} />
            </TouchableOpacity>
            <View style={{flex: 1, alignItems: 'center'}}>
              <Text style={{ fontSize: 17, fontWeight: '700', color: '#FFFFFF' }}>Report Damage</Text>
            </View>
            <View style={{width: 48}} />
          </View>
          <View style={{ paddingHorizontal: 18, paddingBottom: 20 }}>
            <Text style={{ fontSize: 9.5, fontWeight: '800', color: 'rgba(255,255,255,0.92)', textTransform: 'uppercase', marginBottom: 4, letterSpacing: 0.8 }}>DAMAGE ASSESSMENT</Text>
            <Text style={{ fontSize: 24, fontWeight: '900', color: '#FFFFFF' }}>Structural Damage Report</Text>
          </View>
        </LinearGradient>

        <View style={styles.formBody}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionLabel}>{lang === 'tl' ? 'ANTAS NG PINSALA' : 'DAMAGE LEVEL'}</Text>
          </View>
          <SeveritySelectorTray severities={severities} currentLevel={damageLevel} onSelect={setDamageLevel} lang={lang} />

          {/* Verified Registered Household Location */}
          <View style={styles.autoLocationCard}>
            <View style={styles.autoLocationHeader}>
              <Text style={styles.autoLocationLabel}>
                {lang === 'tl' ? 'LOKASYON NG TAHANAN' : 'REGISTERED HOUSEHOLD LOCATION *'}
              </Text>
            </View>

            <View style={styles.autoLocationBody}>
              <View style={styles.autoLocationIconCircle}>
                <MapPinIcon size={18} color="#1C3F94" />
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

          <MotionPressable
            style={[styles.submitBtn, loading && { opacity: 0.7 }]}
            onPress={handleSubmitReport}
            disabled={loading}
            accessibilityRole="button"
            accessibilityLabel={lang === 'tl' ? 'I-submit ang Ulat ng Pinsala' : 'Submit Damage Report'}
            accessibilityHint={lang === 'tl' ? 'Ipapadala ang ulat ng pinsala sa Disaster Command Center' : 'Submits damage report to Disaster Command Center'}
          >
            {loading ? <ActivityIndicator color="#FFFFFF" /> : <Text style={styles.submitBtnText}>{lang === 'tl' ? 'I-submit ang Ulat' : 'Submit Damage Report'}</Text>}
          </MotionPressable>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F3F6FC' },
  formBody: { paddingHorizontal: 16, paddingTop: 4, paddingBottom: 24 },
  content: { paddingHorizontal: RESPONSIVE.padding, paddingTop: RESPONSIVE.topSafe + 8, paddingBottom: 24 },
  backBtnPill: {
    alignSelf: 'flex-start',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#DDE4F0',
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: 9999,
    marginBottom: 14,
    ...SHADOWS.pill,
  },
  backIconCircle: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: '#EDF1FB',
    alignItems: 'center',
    justifyContent: 'center',
  },
  backBtnText: { fontSize: 13, fontWeight: '800', color: '#1C3F94', letterSpacing: 0.2 },
  headerTitle: { fontSize: 20, fontWeight: FONT_WEIGHT.black, color: '#0B1525' },
  headerSub: { fontSize: 11.5, color: '#3D5070', marginTop: 2, marginBottom: 16 },
  sectionHeader: { marginBottom: 8 },
  sectionLabel: { fontSize: 10.5, fontWeight: '800', color: '#0B1525', letterSpacing: 0.5 },
  autoLocationCard: {
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#DDE4F0',
    borderRadius: 16,
    shadowColor: '#1C3F94',
    padding: 16,
    marginBottom: 16,
    ...SHADOWS.card,
  },
  autoLocationHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 10,
  },
  autoLocationLabel: {
    fontSize: 10.5,
    fontWeight: '800',
    color: '#0B1525',
    letterSpacing: 0.5,
  },
  autoLocationBody: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    backgroundColor: '#F3F6FC',
    padding: 12,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#DDE4F0',
  },
  autoLocationIconCircle: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#EDF1FB',
    alignItems: 'center',
    justifyContent: 'center',
  },
  autoLocationAddressText: {
    fontSize: 13,
    fontWeight: '800',
    color: '#0B1525',
  },
  autoLocationGpsText: {
    fontSize: 10.5,
    color: '#475569',
    marginTop: 2,
    fontWeight: '600',
  },
  severityGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginBottom: 16 },
  severityTile: {
    flex: 1,
    minWidth: '47%',
    minHeight: 72,
    justifyContent: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 18,
    padding: 14,
    borderWidth: 2,
    borderColor: '#DDE4F0',
    ...SHADOWS.card,
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
  severityLabel: { fontSize: 13, fontWeight: '700', color: '#0B1525', marginBottom: 2 },
  severitySub: { fontSize: 10, color: '#475569', lineHeight: 14 },
  uploadCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#DDE4F0',
    padding: 16,
    marginBottom: 16,
    ...SHADOWS.card,
  },
  fieldLabel: { fontSize: 10.5, fontWeight: '800', color: '#0B1525', marginBottom: 10 },
  uploadActionsRow: { flexDirection: 'row', gap: 10 },
  cameraBtn: {
    flex: 1,
    minHeight: 48,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#D6DEFA',
    paddingVertical: 12,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 5,
    ...SHADOWS.sm,
  },
  galleryBtn: {
    flex: 1,
    minHeight: 48,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#DDE4F0',
    paddingVertical: 12,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 5,
    ...SHADOWS.sm,
  },
  uploadBtnText: { fontSize: 11, fontWeight: '700', color: '#0B1525' },
  previewBox: { alignItems: 'center' },
  previewImg: { width: '100%', height: 150, borderRadius: 10, backgroundColor: '#F3F6FC', marginBottom: 8 },
  removePhotoBtn: {
    minHeight: 48,
    paddingVertical: 12,
    paddingHorizontal: 16,
    justifyContent: 'center',
    alignItems: 'center',
  },
  removePhotoText: { fontSize: 11, fontWeight: '700', color: '#1C3F94' },
  submitBtn: {
    backgroundColor: '#1C3F94',
    minHeight: 52,
    height: 52,
    justifyContent: 'center',
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: 'center',
    marginTop: 10,
    ...SHADOWS.button,
  },
  submitBtnText: { color: '#FFFFFF', fontSize: 13.5, fontWeight: '800' },
  successContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 24, backgroundColor: '#F3F6FC' },
  successIconWell: { width: 64, height: 64, borderRadius: 32, backgroundColor: '#E6F6EF', justifyContent: 'center', alignItems: 'center', marginBottom: 16, ...SHADOWS.md },
  successTitle: { fontSize: 18, fontWeight: FONT_WEIGHT.black, color: '#0B1525', marginBottom: 6 },
  successSub: { fontSize: 12, color: '#3D5070', textAlign: 'center', marginBottom: 20 },
  backHomeBtn: {
    backgroundColor: '#1C3F94',
    minHeight: 48,
    paddingVertical: 14,
    paddingHorizontal: 24,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
    ...SHADOWS.button,
  },
  backHomeBtnText: { color: '#FFFFFF', fontSize: 13, fontWeight: '800' },
});

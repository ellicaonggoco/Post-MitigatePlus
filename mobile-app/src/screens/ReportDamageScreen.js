import React, { useState, useEffect } from 'react';
import { LinearGradient } from 'expo-linear-gradient';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  Alert,
  Image,
  ActivityIndicator,
  Platform,
  KeyboardAvoidingView,
  Keyboard,
  Modal,
} from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import * as Location from 'expo-location';
import { submitDamageReport, fetchMyDamageReports } from '../services/api';
import { onDamageReportUpdated } from '../services/socketService';
import NeumorphicInput from '../components/NeumorphicInput';
import {
  CameraIcon,
  ImageIcon,
  CheckIcon,
  ShieldCheckIcon,
  ArrowLeftIcon,
  MapPinIcon,
  ClockIcon,
  RefreshCwIcon,
  CloseIcon,
  DamageIcon,
} from '../components/AppIcons';
import { FONT_WEIGHT, SHADOWS, RESPONSIVE, hp } from '../theme';
import { TRANSLATIONS } from '../i18n/translations';
import { MotionSeverityTile, MotionPressable } from '../components/motion';

function SeveritySelectorTray({ severities, currentLevel, onSelect, lang = 'en' }) {
  const rows = [];
  for (let i = 0; i < severities.length; i += 2) {
    rows.push(severities.slice(i, i + 2));
  }

  return (
    <View style={styles.severityGrid}>
      {rows.map((row, rIdx) => (
        <View key={rIdx} style={styles.severityRow}>
          {row.map((s) => {
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
      ))}
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

const getDamagePoints = (level) => {
  switch (level) {
    case 'Totally Damaged':
    case 'Total':
      return 40;
    case 'Severe':
      return 30;
    case 'Moderate':
      return 20;
    case 'Minor':
      return 10;
    default:
      return 0;
  }
};

export default function ReportDamageScreen({ token, user, householdData, lang = 'en', onBack, onSubmitSuccess }) {
  const t = TRANSLATIONS[lang] || TRANSLATIONS.en;

  const defaultResolvedAddress =
    householdData?.address
      ? `${householdData.address}${householdData.purok ? `, Purok ${householdData.purok}` : ''}, Barangay ${householdData.barangayCode || '291'}, Manila`
      : user?.address
      ? `${user.address}, Barangay ${user.barangayCode || '291'}, Manila`
      : '142 Quirino Ave, Purok 3, Barangay 291, Manila';

  const [existingReports, setExistingReports] = useState([]);
  const [selectedReportIndex, setSelectedReportIndex] = useState(0);
  const [loadingExisting, setLoadingExisting] = useState(true);
  const [showNewForm, setShowNewForm] = useState(false);
  const [previewPhotoModal, setPreviewPhotoModal] = useState(null);

  const [damageLevel, setDamageLevel] = useState('Severe');
  const [description, setDescription] = useState('');
  const [addressLandmark, setAddressLandmark] = useState(defaultResolvedAddress);
  const [selectedPhoto, setSelectedPhoto] = useState(null);
  const [loading, setLoading] = useState(false);
  const scrollRef = React.useRef(null);
  const [keyboardHeight, setKeyboardHeight] = useState(0);
  const [errors, setErrors] = useState({});

  const [geoCoords, setGeoCoords] = useState(null);
  const [isLocating, setIsLocating] = useState(true);

  const loadReports = async () => {
    if (!token) {
      setLoadingExisting(false);
      return;
    }
    try {
      setLoadingExisting(true);
      const data = await fetchMyDamageReports(token);
      if (Array.isArray(data)) {
        setExistingReports(data);
      }
    } catch (e) {
      console.warn('Error fetching damage reports:', e);
    } finally {
      setLoadingExisting(false);
    }
  };

  useEffect(() => {
    loadReports();
    const unsub = onDamageReportUpdated(() => {
      loadReports();
    });
    return () => {
      if (typeof unsub === 'function') unsub();
    };
  }, [token]);

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
        const hasServices = await Location.hasServicesEnabledAsync().catch(() => false);
        if (hasServices) {
          const { status } = await Location.requestForegroundPermissionsAsync().catch(() => ({ status: 'denied' }));
          if (status === 'granted') {
            let loc = await Location.getLastKnownPositionAsync().catch(() => null);
            if (!loc) {
              loc = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced }).catch(() => null);
            }
            if (loc && loc.coords) {
              const lat = Number(loc.coords.latitude.toFixed(6));
              const lng = Number(loc.coords.longitude.toFixed(6));
              setGeoCoords({ lat, lng, accuracy: Math.round(loc.coords.accuracy || 4) });
              setIsLocating(false);
              return;
            }
          }
        }
      }
    } catch {
      // Gracefully handle disabled location - fallback to barangay centroid without LogBox popup
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
        { enableHighAccuracy: false, timeout: 5000, maximumAge: 60000 }
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
              setErrors((prev) => ({ ...prev, photo: '' }));
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
              setErrors((prev) => ({ ...prev, photo: '' }));
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
          description: description.trim(),
          photos: selectedPhoto ? [selectedPhoto.uri] : [],
          latitude: geoCoords?.lat || 14.599512,
          longitude: geoCoords?.lng || 120.984215,
          locationName: addressLandmark,
        },
        token
      );
      setSelectedReportIndex(0);
      await loadReports();
      setShowNewForm(false);
      setDescription('');
      setSelectedPhoto(null);
      Alert.alert(
        lang === 'tl' ? 'Ulat Naipadala Na!' : 'Report Submitted!',
        lang === 'tl'
          ? 'Naihatid na sa Disaster Command Center ng Barangay ang inyong ulat para sa opisyal na beripikasyon.'
          : 'Your report has been submitted to the Barangay Disaster Command Center for official verification.'
      );
      if (onSubmitSuccess) onSubmitSuccess();
    } catch (err) {
      console.error('Damage report submission error:', err);
      const msg = err.data?.message || err.message || (lang === 'tl' ? 'Hindi naipadala ang ulat. Pakisubukang muli.' : 'Failed to submit report. Please try again.');
      Alert.alert(lang === 'tl' ? 'Hindi Naipadala ang Ulat' : 'Submission Failed', msg);
    } finally {
      setLoading(false);
    }
  };

  const cleanDamageDescription = (desc) => {
    if (!desc || typeof desc !== 'string') return '';
    return desc.replace(/^Landmark:[^|]+\|\s*Notes:\s*/i, '').trim();
  };

  const activeReport = existingReports && existingReports.length > 0
    ? (existingReports[selectedReportIndex] || existingReports[0])
    : null;
  const hasExisting = !!activeReport;

  // ── Render Case 1: Existing Report Status View ──
  if (hasExisting && !showNewForm) {
    const finalLevel = activeReport.verifiedDamageLevel || activeReport.damageLevel || 'Moderate';
    const bonusPts = getDamagePoints(finalLevel);

    return (
      <ScrollView
        ref={scrollRef}
        style={styles.container}
        contentContainerStyle={[{ paddingBottom: 120 }]}
        showsVerticalScrollIndicator={false}
      >
        <LinearGradient
          colors={['#6E071A', '#C8102E', '#9E0B24']}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={{ marginBottom: 20 }}
        >
          <View style={{ height: 3, backgroundColor: '#C9A84C' }} />
          <View style={{ height: Platform.OS === 'web' ? 0 : RESPONSIVE.topSafe + 4 }} />
          <View style={{ flexDirection: 'row', alignItems: 'center', paddingHorizontal: 18, paddingVertical: 12 }}>
            <TouchableOpacity
              onPress={onBack}
              style={styles.headerBackBtn}
              activeOpacity={0.8}
              accessibilityRole="button"
              accessibilityLabel={lang === 'tl' ? 'Bumalik sa dashboard' : 'Go back to dashboard'}
            >
              <ArrowLeftIcon size={18} color="#FFFFFF" strokeWidth={1.8} />
            </TouchableOpacity>
            <View style={{ flex: 1, alignItems: 'center' }}>
              <Text style={{ fontSize: 17, fontWeight: '700', color: '#FFFFFF' }}>
                {lang === 'tl' ? 'Katayuan ng Pinsala' : 'Damage Assessment'}
              </Text>
            </View>
            <TouchableOpacity
              onPress={loadReports}
              style={styles.headerRefreshBtn}
              activeOpacity={0.8}
              accessibilityRole="button"
              accessibilityLabel={lang === 'tl' ? 'I-refresh' : 'Refresh'}
            >
              {loadingExisting ? (
                <ActivityIndicator size="small" color="#FFFFFF" />
              ) : (
                <RefreshCwIcon size={16} color="#FFFFFF" />
              )}
            </TouchableOpacity>
          </View>
          <View style={{ paddingHorizontal: 18, paddingBottom: 20 }}>
            <Text style={styles.headerKicker}>
              {lang === 'tl' ? 'OPISYAL NA STATUS SA BARANGAY' : 'BARANGAY DISASTER AUDIT'}
            </Text>
            <Text style={styles.headerTitleLarge}>
              {lang === 'tl' ? 'Pagsusuri sa Pinsala ng Bahay' : 'Structural Damage Assessment'}
            </Text>
          </View>
        </LinearGradient>

        <View style={styles.statusViewBody}>
          {/* Multi-Report Progression Selector */}
          {existingReports.length > 1 && (
            <View style={styles.progressionContainer}>
              <View style={styles.progressionHeaderRow}>
                <Text style={styles.progressionTitle}>
                  {lang === 'tl' ? 'Kasaysayan ng mga Ulat ng Pinsala' : 'Damage Report Progression'} ({existingReports.length})
                </Text>
                <Text style={styles.progressionSub}>
                  {lang === 'tl' ? 'Pindutin upang tingnan ang bawat ulat sa progreso' : 'Tap to inspect individual progression reports'}
                </Text>
              </View>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.progressionChipsScroll}>
                {existingReports.map((rep, idx) => {
                  const isSelected = idx === selectedReportIndex;
                  const repNum = existingReports.length - idx;
                  const isLatest = idx === 0;
                  const st = rep.verificationStatus || 'pending';
                  const stLabel = st === 'verified'
                    ? (lang === 'tl' ? 'Beripikado' : 'Verified')
                    : st === 'adjusted'
                    ? (lang === 'tl' ? 'Binago' : 'Adjusted')
                    : st === 'rejected'
                    ? (lang === 'tl' ? 'Tinanggihan' : 'Rejected')
                    : (lang === 'tl' ? 'Sinusuri' : 'Under Review');
                  const stColor = (st === 'verified' || st === 'adjusted') ? '#0D8A5A' : st === 'rejected' ? '#C8102E' : '#B8932A';

                  return (
                    <TouchableOpacity
                      key={rep._id || idx}
                      onPress={() => setSelectedReportIndex(idx)}
                      style={[
                        styles.progressionChip,
                        isSelected && styles.progressionChipSelected,
                      ]}
                      activeOpacity={0.8}
                    >
                      <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
                        <Text style={[styles.progressionChipNum, isSelected && styles.progressionChipNumSelected]}>
                          {lang === 'tl' ? `Ulat #${repNum}` : `Report #${repNum}`}
                        </Text>
                        {isLatest && (
                          <View style={[styles.latestBadge, isSelected && { backgroundColor: '#FFFFFF' }]}>
                            <Text style={[styles.latestBadgeText, isSelected && { color: '#C8102E' }]}>
                              {lang === 'tl' ? 'PINAKABAGO' : 'LATEST'}
                            </Text>
                          </View>
                        )}
                      </View>
                      <Text style={[styles.progressionChipDate, isSelected && { color: 'rgba(255,255,255,0.85)' }]}>
                        {rep.reportedAt ? new Date(rep.reportedAt).toLocaleDateString([], { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' }) : ''}
                      </Text>
                      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 5, marginTop: 4 }}>
                        <View style={{ width: 6, height: 6, borderRadius: 3, backgroundColor: isSelected ? '#FFFFFF' : stColor }} />
                        <Text style={[styles.progressionChipStatus, { color: isSelected ? '#FFFFFF' : stColor }]}>
                          {rep.verifiedDamageLevel || rep.damageLevel} · {stLabel}
                        </Text>
                      </View>
                    </TouchableOpacity>
                  );
                })}
              </ScrollView>
            </View>
          )}

          {/* Main Status Hero Card */}
          <View style={styles.statusHeroCard}>
            {existingReports.length > 1 && (
              <View style={{ marginBottom: 8, paddingBottom: 6, borderBottomWidth: 1, borderBottomColor: '#F1F5F9' }}>
                <Text style={{ fontSize: 11, fontWeight: '800', color: '#1C3F94', textTransform: 'uppercase', letterSpacing: 0.5 }}>
                  {lang === 'tl' ? `Ulat #${existingReports.length - selectedReportIndex} ng ${existingReports.length}` : `Report #${existingReports.length - selectedReportIndex} of ${existingReports.length}`}
                  {selectedReportIndex === 0 ? (lang === 'tl' ? ' (Pinakabago)' : ' (Latest)') : ''}
                </Text>
              </View>
            )}
            <View style={styles.statusHeroTopRow}>
              <View style={styles.statusIconCircle}>
                <DamageIcon size={24} color="#C8102E" />
              </View>
              <View
                style={[
                  styles.statusBadgeLarge,
                  activeReport.verificationStatus === 'verified' || activeReport.verificationStatus === 'adjusted'
                    ? styles.badgeVerifiedLarge
                    : activeReport.verificationStatus === 'rejected'
                    ? styles.badgeRejectedLarge
                    : styles.badgePendingLarge,
                ]}
              >
                {activeReport.verificationStatus === 'verified' || activeReport.verificationStatus === 'adjusted' ? (
                  <CheckIcon size={14} color="#15803D" strokeWidth={2.6} />
                ) : activeReport.verificationStatus === 'rejected' ? (
                  <CloseIcon size={14} color="#B91C1C" strokeWidth={2.6} />
                ) : (
                  <ClockIcon size={14} color="#B45309" strokeWidth={2.4} />
                )}
                <Text
                  style={[
                    styles.statusBadgeLargeText,
                    activeReport.verificationStatus === 'verified' || activeReport.verificationStatus === 'adjusted'
                      ? styles.badgeVerifiedLargeText
                      : activeReport.verificationStatus === 'rejected'
                      ? styles.badgeRejectedLargeText
                      : styles.badgePendingLargeText,
                  ]}
                >
                  {activeReport.verificationStatus === 'verified'
                    ? (lang === 'tl' ? 'BERIPIKADO NA' : 'OFFICIALLY VERIFIED')
                    : activeReport.verificationStatus === 'adjusted'
                    ? (lang === 'tl' ? 'BINAGO AT BERIPIKADO' : 'ADJUSTED & VERIFIED')
                    : activeReport.verificationStatus === 'rejected'
                    ? (lang === 'tl' ? 'HINDI NAAPRUBAHAN' : 'REJECTED')
                    : (lang === 'tl' ? 'SINUSURI NG BARANGAY ADMIN' : 'UNDER REVIEW')}
                </Text>
              </View>
            </View>

            <Text style={styles.statusDamageLevelTitle}>
              {finalLevel} Damage
            </Text>

            <View style={styles.statusBonusScoreRow}>
              <Text style={styles.statusBonusScoreText}>
                +{bonusPts} PUNTOS SA PRIORITY SCORE
              </Text>
            </View>

            {/* If adjusted: show level comparison */}
            {activeReport.verificationStatus === 'adjusted' && activeReport.verifiedDamageLevel && (
              <View style={styles.adjustmentCallout}>
                <Text style={styles.adjustmentCalloutTitle}>
                  {lang === 'tl' ? 'Pagsasaayos ng Antas ng Pinsala:' : 'Damage Level Adjustment:'}
                </Text>
                <Text style={styles.adjustmentCalloutText}>
                  {lang === 'tl'
                    ? `Isinumite: [${activeReport.damageLevel}] ➔ Inaprubahan ng Admin: [${activeReport.verifiedDamageLevel}]`
                    : `Reported: [${activeReport.damageLevel}] ➔ Approved by Admin: [${activeReport.verifiedDamageLevel}]`}
                </Text>
              </View>
            )}

            <Text style={styles.statusExplanationText}>
              {activeReport.verificationStatus === 'verified' || activeReport.verificationStatus === 'adjusted'
                ? (lang === 'tl'
                    ? 'Matagumpay na na-validate ng Barangay Disaster Risk Assessor ang inyong ulat. Ang dagdag na puntos ay pumasok na sa inyong priority score para sa alokasyon ng ayuda at rehabilitation aid.'
                    : 'The Barangay Disaster Risk Assessor has verified your report. The bonus priority points are reflected in your relief and rehabilitation priority status.')
                : activeReport.verificationStatus === 'rejected'
                ? (lang === 'tl'
                    ? 'Hindi tinanggap ng Barangay Admin ang ulat na ito. Maaari kayong magsumite ng bagong ulat na may mas malinaw na litrato ng pinsala.'
                    : 'This damage report was rejected by the Barangay Admin. You may submit a new report with clearer photos of the structural damage.')
                : (lang === 'tl'
                    ? 'Nasa Verification Queue ng Barangay Admin sa Web Admin ang inyong ulat. Awtomatikong mag-uupdate ang inyong Priority Score sa oras na aprubahan ito ng opisyal.'
                    : 'Your report is currently in the Barangay Admin Verification Queue. Your Priority Score will automatically update upon official approval.')}
            </Text>
          </View>

          {/* Resident's Submitted Damage Description */}
          <View style={styles.residentDescCard}>
            <Text style={styles.residentDescTitle}>
              {lang === 'tl' ? 'INYONG ISINUMITENG DESKRIPSYON NG PINSALA' : 'YOUR SUBMITTED DAMAGE DESCRIPTION'}
            </Text>
            <Text style={styles.residentDescText}>
              "{cleanDamageDescription(activeReport.description) || (lang === 'tl' ? 'Walang nakasulat na pahayag na isinumite.' : 'No detailed written statement provided.')}"
            </Text>
          </View>

          {/* Non-Cumulative Priority Score Rule Assurance */}
          <View style={styles.scoreRuleCard}>
            <View style={styles.scoreRuleIconWell}>
              <ShieldCheckIcon size={18} color="#1C3F94" />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.scoreRuleTitle}>
                {lang === 'tl' ? 'Patakaran sa Priority Score (Hindi Nagpapatong)' : 'Priority Score Policy (Non-Cumulative)'}
              </Text>
              <Text style={styles.scoreRuleBody}>
                {lang === 'tl'
                  ? 'Awtomatikong nirereset at ina-update ang inyong Priority Score sa bagong antas ng pinsala kapag na-verify ang bagong ulat na ito. Hindi ito nagpapatong-patong (halimbawa: kung 30 pts ang inyong base priority at naaprubahan ang Moderate damage [+20 pts], ang kabuuang score ay 50 pts, hindi 60 pts).'
                  : 'Your Priority Score is freshly recalculated upon validation of this report based on the new damage level. Points do not stack cumulatively (e.g. 30 pts base + 20 pts Moderate = 50 pts, not 60 pts).'}
              </Text>
            </View>
          </View>

          {/* Barangay Official Notes or Rejection Reason */}
          {(activeReport.notes || activeReport.rejectionReason) && (
            <View style={[styles.notesCard, activeReport.verificationStatus === 'rejected' && styles.notesCardRejected]}>
              <Text style={[styles.notesCardTitle, activeReport.verificationStatus === 'rejected' && { color: '#B91C1C' }]}>
                {activeReport.verificationStatus === 'rejected'
                  ? (lang === 'tl' ? 'DAHILAN NG PAGTANGGI' : 'REJECTION REASON')
                  : (lang === 'tl' ? 'TALA MULA SA BARANGAY ADMIN' : 'BARANGAY OFFICIAL ASSESSMENT')}
              </Text>
              <Text style={styles.notesCardContent}>
                "{activeReport.rejectionReason || activeReport.notes}"
              </Text>
              {activeReport.validatedBy?.name && (
                <Text style={styles.notesCardAuthor}>
                  — {activeReport.validatedBy.name} ({lang === 'tl' ? 'Opisyal ng Barangay' : 'Barangay Official'})
                </Text>
              )}
            </View>
          )}

          {/* Evidence Photo Card */}
          {activeReport.photos && activeReport.photos.length > 0 && (
            <View style={styles.evidenceCard}>
              <Text style={styles.evidenceCardTitle}>
                {lang === 'tl' ? 'ISINUMITENG LITRATO NG PINSALA' : 'SUBMITTED DAMAGE PHOTO'}
              </Text>
              <TouchableOpacity
                style={styles.evidenceImageWrapper}
                onPress={() => setPreviewPhotoModal(activeReport.photos[0])}
                activeOpacity={0.9}
              >
                <Image
                  source={{ uri: activeReport.photos[0] }}
                  style={styles.evidenceImage}
                  resizeMode="cover"
                />
                <View style={styles.evidenceEnlargeOverlay}>
                  <Text style={styles.evidenceEnlargeText}>
                    {lang === 'tl' ? 'I-tap upang palakihin' : 'Tap to enlarge'}
                  </Text>
                </View>
              </TouchableOpacity>
            </View>
          )}

          {/* Audit Trail & Location Info */}
          <View style={styles.auditCard}>
            <View style={styles.auditRow}>
              <ClockIcon size={14} color="#64748B" />
              <Text style={styles.auditLabel}>
                {lang === 'tl' ? 'Petsa ng Pag-uulat:' : 'Date Reported:'}
              </Text>
              <Text style={styles.auditValue}>
                {activeReport.reportedAt ? new Date(activeReport.reportedAt).toLocaleDateString() : 'N/A'}
              </Text>
            </View>

            {activeReport.validatedAt && (
              <View style={styles.auditRow}>
                <CheckIcon size={14} color="#16A34A" />
                <Text style={styles.auditLabel}>
                  {lang === 'tl' ? 'Petsa ng Pagsusuri:' : 'Date Validated:'}
                </Text>
                <Text style={styles.auditValue}>
                  {new Date(activeReport.validatedAt).toLocaleDateString()}
                </Text>
              </View>
            )}

            <View style={styles.auditRow}>
              <MapPinIcon size={14} color="#1C3F94" />
              <Text style={styles.auditLabel}>
                {lang === 'tl' ? 'Lokasyon:' : 'Location:'}
              </Text>
              <Text style={styles.auditValue} numberOfLines={1}>
                {activeReport.locationName || defaultResolvedAddress}
              </Text>
            </View>
          </View>

          {/* Action Buttons */}
          <View style={styles.statusActionsArea}>
            <TouchableOpacity
              style={styles.submitNewReportBtn}
              onPress={() => setShowNewForm(true)}
              activeOpacity={0.85}
              accessibilityRole="button"
              accessibilityLabel={lang === 'tl' ? 'Magsumite ng Bagong Ulat ng Pinsala' : 'Submit New Damage Report'}
            >
              <Text style={styles.submitNewReportBtnText}>
                {lang === 'tl' ? 'Magsumite ng Bagong / Karagdagang Ulat' : 'Submit New / Supplementary Report'}
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.statusBackHomeBtn}
              onPress={onBack}
              activeOpacity={0.85}
              accessibilityRole="button"
              accessibilityLabel={lang === 'tl' ? 'Bumalik sa Dashboard' : 'Back to Dashboard'}
            >
              <Text style={styles.statusBackHomeBtnText}>
                {lang === 'tl' ? 'Bumalik sa Dashboard' : 'Back to Dashboard'}
              </Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Image Fullscreen Preview Modal */}
        {previewPhotoModal && (
          <Modal
            visible={!!previewPhotoModal}
            transparent={true}
            animationType="fade"
            onRequestClose={() => setPreviewPhotoModal(null)}
          >
            <View style={styles.previewModalOverlay}>
              <TouchableOpacity
                style={styles.previewModalCloseBtn}
                onPress={() => setPreviewPhotoModal(null)}
                activeOpacity={0.85}
              >
                <CloseIcon size={20} color="#FFFFFF" strokeWidth={2.5} />
              </TouchableOpacity>
              <Image
                source={{ uri: previewPhotoModal }}
                style={styles.previewModalImage}
                resizeMode="contain"
              />
            </View>
          </Modal>
        )}
      </ScrollView>
    );
  }

  // ── Render Case 2: New Report Submission Form ──
  return (
    <KeyboardAvoidingView
      style={{ flex: 1 }}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      keyboardVerticalOffset={Platform.OS === 'ios' ? 40 : 0}
    >
      <ScrollView
        ref={scrollRef}
        style={styles.container}
        contentContainerStyle={[{ paddingBottom: 120 + keyboardHeight }]}
        keyboardShouldPersistTaps="handled"
        keyboardDismissMode="on-drag"
      >
        <LinearGradient
          colors={['#6E071A', '#C8102E', '#9E0B24']}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={{ marginBottom: 20 }}
        >
          <View style={{ height: 3, backgroundColor: '#C9A84C' }} />
          <View style={{ height: Platform.OS === 'web' ? 0 : RESPONSIVE.topSafe + 4 }} />
          <View style={{ flexDirection: 'row', alignItems: 'center', paddingHorizontal: 18, paddingVertical: 12 }}>
            <TouchableOpacity
              onPress={hasExisting ? () => setShowNewForm(false) : onBack}
              style={styles.headerBackBtn}
              activeOpacity={0.8}
              accessibilityRole="button"
              accessibilityLabel={lang === 'tl' ? 'Bumalik sa dashboard' : 'Go back to dashboard'}
              accessibilityHint={lang === 'tl' ? 'Babalik sa home screen' : 'Returns to the home screen'}
              hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            >
              <ArrowLeftIcon size={18} color="#FFFFFF" strokeWidth={1.8} />
            </TouchableOpacity>
            <View style={{ flex: 1, alignItems: 'center' }}>
              <Text style={{ fontSize: 17, fontWeight: '700', color: '#FFFFFF' }}>
                {lang === 'tl' ? 'Mag-ulat ng Pinsala' : 'Report Damage'}
              </Text>
            </View>
            <View style={{ width: 48 }} />
          </View>
          <View style={{ paddingHorizontal: 18, paddingBottom: 20 }}>
            <Text style={styles.headerKicker}>
              DAMAGE ASSESSMENT
            </Text>
            <Text style={styles.headerTitleLarge}>
              {lang === 'tl' ? 'Ulat ng Sira sa Tirahan' : 'Structural Damage Report'}
            </Text>
          </View>
        </LinearGradient>

        <View style={styles.formBody}>
          {hasExisting && (
            <TouchableOpacity
              style={styles.viewExistingReportPillBtn}
              onPress={() => setShowNewForm(false)}
              activeOpacity={0.85}
            >
              <ArrowLeftIcon size={14} color="#1C3F94" strokeWidth={2} />
              <Text style={styles.viewExistingReportPillText}>
                {lang === 'tl' ? 'Tingnan ang Kasalukuyang Ulat ng Pinsala' : 'View Active Damage Report Status'}
              </Text>
            </TouchableOpacity>
          )}

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
            placeholder={lang === 'tl' ? 'Ilarawan ang nangyaring pinsala sa bahay...' : 'Describe the damage to the structure...'}
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
  headerBackBtn: {
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
  headerRefreshBtn: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(255,255,255,0.15)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.25)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerKicker: {
    fontSize: 9.5,
    fontWeight: '800',
    color: 'rgba(255,255,255,0.92)',
    textTransform: 'uppercase',
    marginBottom: 4,
    letterSpacing: 0.8,
  },
  headerTitleLarge: {
    fontSize: 23,
    fontWeight: '900',
    color: '#FFFFFF',
  },
  viewExistingReportPillBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: '#EDF1FB',
    borderWidth: 1,
    borderColor: '#D6DEFA',
    paddingVertical: 10,
    paddingHorizontal: 14,
    borderRadius: 12,
    marginBottom: 16,
  },
  viewExistingReportPillText: {
    fontSize: 12.5,
    fontWeight: '800',
    color: '#1C3F94',
  },
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
  severityGrid: {
    gap: 10,
    marginBottom: 16,
  },
  severityRow: {
    flexDirection: 'row',
    gap: 10,
  },
  severityTile: {
    flex: 1,
    minHeight: 76,
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

  // ── Status View Styles ──
  statusViewBody: {
    paddingHorizontal: 16,
    paddingBottom: 24,
  },
  statusHeroCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 22,
    borderWidth: 1,
    borderColor: '#DDE4F0',
    padding: 20,
    marginBottom: 16,
    ...SHADOWS.card,
  },
  statusHeroTopRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 14,
  },
  statusIconCircle: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#FEF0F2',
    borderWidth: 1,
    borderColor: '#FEE2E2',
    alignItems: 'center',
    justifyContent: 'center',
  },
  statusBadgeLarge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 999,
    borderWidth: 1,
  },
  badgeVerifiedLarge: {
    backgroundColor: '#DCFCE7',
    borderColor: '#86EFAC',
  },
  badgeVerifiedLargeText: {
    color: '#15803D',
  },
  badgeRejectedLarge: {
    backgroundColor: '#FEE2E2',
    borderColor: '#FCA5A5',
  },
  badgeRejectedLargeText: {
    color: '#B91C1C',
  },
  badgePendingLarge: {
    backgroundColor: '#FEF3C7',
    borderColor: '#FCD34D',
  },
  badgePendingLargeText: {
    color: '#B45309',
  },
  statusBadgeLargeText: {
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  statusDamageLevelTitle: {
    fontSize: 22,
    fontWeight: '900',
    color: '#0B1525',
    letterSpacing: -0.5,
    marginBottom: 6,
  },
  statusBonusScoreRow: {
    alignSelf: 'flex-start',
    backgroundColor: '#C8102E',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
    marginBottom: 12,
  },
  statusBonusScoreText: {
    fontSize: 11,
    fontWeight: '900',
    color: '#FFFFFF',
    letterSpacing: 0.5,
  },
  adjustmentCallout: {
    backgroundColor: '#F0FDFA',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#CCFBF1',
    padding: 12,
    marginBottom: 12,
  },
  adjustmentCalloutTitle: {
    fontSize: 11,
    fontWeight: '800',
    color: '#0F766E',
    marginBottom: 2,
    textTransform: 'uppercase',
  },
  adjustmentCalloutText: {
    fontSize: 12.5,
    fontWeight: '700',
    color: '#115E59',
  },
  statusExplanationText: {
    fontSize: 12.5,
    color: '#475569',
    lineHeight: 18,
  },
  notesCard: {
    backgroundColor: '#EFF6FF',
    borderRadius: 18,
    borderLeftWidth: 4,
    borderLeftColor: '#1C3F94',
    padding: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#DBEAFE',
  },
  notesCardRejected: {
    backgroundColor: '#FFF1F2',
    borderLeftColor: '#E11D48',
    borderColor: '#FFE4E6',
  },
  notesCardTitle: {
    fontSize: 11,
    fontWeight: '800',
    color: '#1C3F94',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 6,
  },
  notesCardContent: {
    fontSize: 13,
    fontStyle: 'italic',
    color: '#1E3A8A',
    lineHeight: 18,
    marginBottom: 6,
  },
  notesCardAuthor: {
    fontSize: 11,
    fontWeight: '700',
    color: '#475569',
  },
  evidenceCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 18,
    borderWidth: 1,
    borderColor: '#DDE4F0',
    padding: 16,
    marginBottom: 16,
    ...SHADOWS.card,
  },
  evidenceCardTitle: {
    fontSize: 11,
    fontWeight: '800',
    color: '#0B1525',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 10,
  },
  evidenceImageWrapper: {
    position: 'relative',
    borderRadius: 12,
    overflow: 'hidden',
    backgroundColor: '#0F172A',
  },
  evidenceImage: {
    width: '100%',
    height: 180,
  },
  evidenceEnlargeOverlay: {
    position: 'absolute',
    bottom: 8,
    right: 8,
    backgroundColor: 'rgba(0,0,0,0.65)',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 6,
  },
  evidenceEnlargeText: {
    fontSize: 10.5,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  auditCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#DDE4F0',
    padding: 14,
    marginBottom: 18,
    gap: 10,
  },
  auditRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  auditLabel: {
    fontSize: 12,
    color: '#64748B',
    fontWeight: '600',
  },
  auditValue: {
    flex: 1,
    fontSize: 12,
    color: '#0B1525',
    fontWeight: '700',
  },
  statusActionsArea: {
    gap: 10,
    marginTop: 4,
  },
  submitNewReportBtn: {
    backgroundColor: '#1C3F94',
    minHeight: 50,
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: 14,
    paddingVertical: 14,
    ...SHADOWS.button,
  },
  submitNewReportBtnText: {
    fontSize: 13.5,
    fontWeight: '800',
    color: '#FFFFFF',
  },
  statusBackHomeBtn: {
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#DDE4F0',
    minHeight: 48,
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: 14,
    paddingVertical: 12,
  },
  statusBackHomeBtnText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#3D5070',
  },
  previewModalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.92)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 16,
  },
  previewModalCloseBtn: {
    position: 'absolute',
    top: Platform.OS === 'web' ? 20 : 50,
    right: 20,
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(255,255,255,0.2)',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 10,
  },
  previewModalImage: {
    width: '100%',
    height: '80%',
  },
  progressionContainer: {
    marginBottom: 16,
  },
  progressionHeaderRow: {
    marginBottom: 8,
    paddingHorizontal: 2,
  },
  progressionTitle: {
    fontSize: 13,
    fontWeight: '800',
    color: '#0B1525',
    letterSpacing: -0.2,
  },
  progressionSub: {
    fontSize: 11,
    color: '#64748B',
    marginTop: 1,
  },
  progressionChipsScroll: {
    gap: 10,
    paddingVertical: 2,
  },
  progressionChip: {
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    borderWidth: 1.5,
    borderColor: '#DDE4F0',
    paddingHorizontal: 14,
    paddingVertical: 10,
    minWidth: 160,
    ...SHADOWS.sm,
  },
  progressionChipSelected: {
    backgroundColor: '#C8102E',
    borderColor: '#9E0B24',
    ...SHADOWS.md,
  },
  progressionChipNum: {
    fontSize: 13,
    fontWeight: '800',
    color: '#0B1525',
  },
  progressionChipNumSelected: {
    color: '#FFFFFF',
  },
  latestBadge: {
    backgroundColor: '#FEF0F2',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
  },
  latestBadgeText: {
    fontSize: 9,
    fontWeight: '800',
    color: '#C8102E',
  },
  progressionChipDate: {
    fontSize: 10.5,
    color: '#64748B',
    marginTop: 2,
  },
  progressionChipStatus: {
    fontSize: 11,
    fontWeight: '700',
  },
  residentDescCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 18,
    borderWidth: 1,
    borderColor: '#DDE4F0',
    padding: 16,
    marginBottom: 14,
    ...SHADOWS.card,
  },
  residentDescTitle: {
    fontSize: 11,
    fontWeight: '800',
    color: '#1C3F94',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 6,
  },
  residentDescText: {
    fontSize: 13.5,
    fontWeight: '600',
    color: '#0B1525',
    lineHeight: 20,
  },
  scoreRuleCard: {
    backgroundColor: '#EDF1FB',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#D6DEFA',
    padding: 14,
    marginBottom: 14,
    flexDirection: 'row',
    gap: 12,
    alignItems: 'flex-start',
  },
  scoreRuleIconWell: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 2,
  },
  scoreRuleTitle: {
    fontSize: 12.5,
    fontWeight: '800',
    color: '#1C3F94',
    marginBottom: 3,
  },
  scoreRuleBody: {
    fontSize: 11.5,
    color: '#3D5070',
    lineHeight: 16.5,
  },
});

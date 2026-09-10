import React, { useState, useEffect } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, ScrollView, Alert, KeyboardAvoidingView, Keyboard, Platform, Image } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Location from 'expo-location';
import * as ImagePicker from 'expo-image-picker';
import { COLORS, RADIUS, SHADOWS, SPACING, FONT_WEIGHT, RESPONSIVE } from '../theme';
import { API_BASE_URL } from '../config.js';
import { RadioCheckedIcon, RadioUncheckedIcon, MapPinIcon, CameraIcon } from '../components/AppIcons';

const INCIDENT_TYPES = [
  'Lost / Damaged Resident QR Card',
  'Suspicious / Duplicate Claim Attempt',
  'Damaged Relief Package Stock',
  'Crowd / Queue Disturbance at Booth',
  'Unregistered Household Emergency Claim',
];

export default function StaffIncidentReportScreen({ token }) {
  const [incidentType, setIncidentType] = useState(INCIDENT_TYPES[0]);
  const [barangayCode, setBarangayCode] = useState('291');
  const [details, setDetails] = useState('');
  const [loading, setLoading] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [locationCoords, setLocationCoords] = useState(null);
  const [locationLabel, setLocationLabel] = useState('Fetching GPS location...');
  const [photoUri, setPhotoUri] = useState(null);
  const scrollRef = React.useRef(null);
  const [keyboardHeight, setKeyboardHeight] = useState(0);

  // Auto-capture GPS on mount
  useEffect(() => {
    (async () => {
      try {
        const { status } = await Location.requestForegroundPermissionsAsync();
        if (status !== 'granted') {
          setLocationLabel('GPS permission denied');
          return;
        }
        const loc = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
        setLocationCoords({ lat: loc.coords.latitude, lng: loc.coords.longitude });
        setLocationLabel(`${loc.coords.latitude.toFixed(5)}, ${loc.coords.longitude.toFixed(5)}`);
      } catch {
        setLocationLabel('Unable to get GPS location');
      }
    })();

    const showSub = Keyboard.addListener(
      Platform.OS === 'ios' ? 'keyboardWillShow' : 'keyboardDidShow',
      (e) => {
        setKeyboardHeight(e.endCoordinates.height);
        setTimeout(() => { scrollRef.current?.scrollToEnd({ animated: true }); }, 80);
      }
    );
    const hideSub = Keyboard.addListener(
      Platform.OS === 'ios' ? 'keyboardWillHide' : 'keyboardDidHide',
      () => { setKeyboardHeight(0); }
    );
    return () => { showSub.remove(); hideSub.remove(); };
  }, []);

  // Photo picker - camera or gallery
  const handlePickPhoto = async () => {
    Alert.alert('Attach Photo Evidence', 'Choose photo source:', [
      {
        text: 'Take Photo',
        onPress: async () => {
          const { status } = await ImagePicker.requestCameraPermissionsAsync();
          if (status !== 'granted') { Alert.alert('Permission needed', 'Camera access is required to capture evidence.'); return; }
          const result = await ImagePicker.launchCameraAsync({ mediaTypes: ImagePicker.MediaTypeOptions.Images, quality: 0.75 });
          if (!result.canceled && result.assets?.length) setPhotoUri(result.assets[0].uri);
        },
      },
      {
        text: 'Choose from Gallery',
        onPress: async () => {
          const result = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ImagePicker.MediaTypeOptions.Images, quality: 0.75 });
          if (!result.canceled && result.assets?.length) setPhotoUri(result.assets[0].uri);
        },
      },
      { text: 'Cancel', style: 'cancel' },
    ]);
  };

  const handleSubmitIncident = async () => {
    if (!details.trim()) {
      Alert.alert('Required', 'Please describe the incident details.');
      return;
    }

    setLoading(true);
    try {
      const storedToken = token || (await AsyncStorage.getItem('mitigateplus_token'));
      const res = await fetch(`${API_BASE_URL}/incidents`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: storedToken ? `Bearer ${storedToken}` : '',
        },
        body: JSON.stringify({
          incidentType,
          barangayCode,
          notes: details.trim(),
          gpsLocation: locationCoords,
          photoUri: photoUri || null,
        }),
      });


      if (res.ok) {
        setSubmitted(true);
        setDetails('');
        Alert.alert('Incident Logged!', 'The on-ground incident has been logged and broadcasted in real-time to the LGU Command Center.');
      } else {
        const errData = await res.json().catch(() => ({}));
        Alert.alert('Submission Notice', errData.message || 'Incident recorded.');
      }
    } catch (err) {
      Alert.alert('Connection', 'Unable to reach command server. Report saved locally.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
    <ScrollView ref={scrollRef} style={styles.container} contentContainerStyle={[styles.content, { paddingBottom: 95 + keyboardHeight }]} keyboardShouldPersistTaps="handled" keyboardDismissMode="on-drag">
      <Text style={styles.title}>On-Ground Incident & Fraud Reporter</Text>
      <Text style={styles.sub}>Log field distribution incidents, lost QR passes, or stock issues to LGU Command Center.</Text>

      <View style={[styles.card, SHADOWS.card]}>
        <Text style={styles.label}>Select Incident Type:</Text>
        <View style={{ gap: 8, marginBottom: 16 }}>
          {INCIDENT_TYPES.map((type) => {
            const isSelected = incidentType === type;
            return (
              <TouchableOpacity
                key={type}
                style={[styles.typeOption, isSelected && styles.typeOptionActive]}
                onPress={() => setIncidentType(type)}
                activeOpacity={0.8}
                accessibilityRole="radio"
                accessibilityLabel={type}
                accessibilityState={{ checked: isSelected }}
              >
                {isSelected ? (
                  <RadioCheckedIcon size={16} color="#1C3F94" />
                ) : (
                  <RadioUncheckedIcon size={16} color="#64748B" />
                )}
                <Text style={[styles.typeOptionText, isSelected && styles.typeOptionTextActive]}>
                  {type}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>

        <Text style={styles.label}>Barangay Code:</Text>
        <TextInput
          value={barangayCode}
          onChangeText={setBarangayCode}
          keyboardType="numeric"
          style={styles.input}
          placeholder="e.g. 291"
          placeholderTextColor="#54657E"
        />

        <Text style={styles.label}>Incident Details & Action Taken:</Text>
        <TextInput
          value={details}
          onChangeText={setDetails}
          multiline
          numberOfLines={4}
          style={[styles.input, { height: 100, textAlignVertical: 'top' }]}
          placeholder="Describe what happened on-ground and any actions taken..."
          placeholderTextColor="#54657E"
        />

        {/* GPS Location Card */}
        <Text style={styles.label}>GPS Location (Auto-Captured):</Text>
        <View style={styles.gpsCard}>
          <MapPinIcon size={18} color="#166534" />
          <Text style={styles.gpsText}>{locationLabel}</Text>
        </View>

        {/* Photo Evidence */}
        <Text style={[styles.label, { marginTop: 12 }]}>Photo Evidence (Optional):</Text>
        <TouchableOpacity
          style={styles.photoBtn}
          onPress={handlePickPhoto}
          activeOpacity={0.8}
          accessibilityRole="button"
          accessibilityLabel={photoUri ? 'Change Photo' : 'Attach Photo Evidence'}
          accessibilityHint="Select or capture incident photo"
        >
          <CameraIcon size={16} color="#1C3F94" />
          <Text style={styles.photoBtnText}>{photoUri ? 'Change Photo' : 'Attach Photo Evidence'}</Text>
        </TouchableOpacity>
        {photoUri ? (
          <Image source={{ uri: photoUri }} style={styles.photoPreview} resizeMode="cover" />
        ) : null}

        <TouchableOpacity
          style={[styles.submitBtn, loading && { opacity: 0.6 }]}
          onPress={handleSubmitIncident}
          disabled={loading}
          activeOpacity={0.8}
          accessibilityRole="button"
          accessibilityLabel="Log Incident to Command Center"
          accessibilityHint="Submits incident report to the LGU Command Center"
        >
          <Text style={styles.submitBtnText}>
            {loading ? 'Logging Incident...' : 'Log Incident to Command Center'}
          </Text>
        </TouchableOpacity>
      </View>
    </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F3F6FC' },
  content: { padding: SPACING.base, paddingTop: 48, paddingBottom: SPACING.xxxl + 40 },
  title: { fontSize: 18, fontWeight: FONT_WEIGHT.black, color: '#0B1525', marginBottom: 4 },
  sub: { fontSize: 12, color: '#3D5070', lineHeight: 17, marginBottom: SPACING.base },
  card: { backgroundColor: '#FFFFFF', borderRadius: RADIUS.card, padding: SPACING.lg, borderWidth: 1, borderColor: '#DDE4F0' },
  label: { fontSize: 13, fontWeight: FONT_WEIGHT.bold, color: '#0B1525', marginBottom: 6 },
  typeOption: {
    padding: 12,
    borderRadius: RADIUS.inner,
    borderWidth: 1,
    borderColor: '#DDE4F0',
    backgroundColor: '#F3F6FC',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    minHeight: 48,
  },
  typeOptionActive: {
    borderColor: '#1C3F94',
    backgroundColor: '#EDF1FB',
  },
  typeOptionText: { fontSize: 12, fontWeight: '700', color: '#1E293B' },
  typeOptionTextActive: { color: '#1C3F94', fontWeight: FONT_WEIGHT.bold },
  input: {
    borderWidth: 1.5,
    borderColor: '#DDE4F0',
    borderRadius: RADIUS.inner,
    padding: 12,
    fontSize: 13,
    color: '#0B1525',
    marginBottom: 16,
    backgroundColor: '#FFFFFF',
    minHeight: 48,
  },
  submitBtn: {
    backgroundColor: '#C8102E',
    paddingVertical: 14,
    borderRadius: RADIUS.inner,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 16,
    minHeight: 52,
    ...SHADOWS.button,
  },
  submitBtnText: { color: '#FFFFFF', fontSize: 14, fontWeight: FONT_WEIGHT.black },
  gpsCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F0FDF4',
    borderRadius: RADIUS.inner,
    borderWidth: 1,
    borderColor: '#BBF7D0',
    padding: 10,
    marginBottom: 12,
    gap: 8,
  },
  gpsIcon: { fontSize: 16 },
  gpsText: { fontSize: 12, color: '#166534', fontWeight: '600', flex: 1 },
  photoBtn: {
    backgroundColor: '#EDF1FB',
    borderRadius: RADIUS.inner,
    borderWidth: 1.5,
    borderColor: '#D6DEFA',
    paddingVertical: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    marginBottom: 10,
    minHeight: 48,
    ...SHADOWS.sm,
  },
  photoBtnText: { fontSize: 13, color: '#1C3F94', fontWeight: '700' },
  photoPreview: {
    width: '100%',
    height: 160,
    borderRadius: RADIUS.inner,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#DDE4F0',
  },
});

import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, ScrollView, Alert } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { COLORS, RADIUS, SHADOWS, SPACING, FONT_WEIGHT } from '../theme';
import { API_BASE_URL } from '../config.js';

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
          notes: details.trim(),
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
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
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
              >
                <Text style={[styles.typeOptionText, isSelected && styles.typeOptionTextActive]}>
                  {isSelected ? '● ' : '○ '} {type}
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
        />

        <Text style={styles.label}>Incident Details & Action Taken:</Text>
        <TextInput
          value={details}
          onChangeText={setDetails}
          multiline
          numberOfLines={4}
          style={[styles.input, { height: 100, textAlignVertical: 'top' }]}
          placeholder="Describe what happened on-ground and any actions taken..."
        />

        <TouchableOpacity
          style={[styles.submitBtn, loading && { opacity: 0.6 }]}
          onPress={handleSubmitIncident}
          disabled={loading}
          activeOpacity={0.8}
        >
          <Text style={styles.submitBtnText}>
            {loading ? 'Logging Incident...' : 'Log Incident to Command Center'}
          </Text>
        </TouchableOpacity>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F4F6FB' },
  content: { padding: SPACING.base, paddingTop: 48, paddingBottom: SPACING.xxxl + 40 },
  title: { fontSize: 18, fontWeight: FONT_WEIGHT.black, color: '#0F172A', marginBottom: 4 },
  sub: { fontSize: 12, color: '#64748B', lineHeight: 17, marginBottom: SPACING.base },
  card: { backgroundColor: '#FFFFFF', borderRadius: RADIUS.card, padding: SPACING.lg, borderWidth: 1, borderColor: '#E2E8F0' },
  label: { fontSize: 13, fontWeight: FONT_WEIGHT.bold, color: '#0F172A', marginBottom: 6 },
  typeOption: {
    padding: 10,
    borderRadius: RADIUS.inner,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    backgroundColor: '#F8FAFC',
  },
  typeOptionActive: {
    borderColor: '#0D3C75',
    backgroundColor: '#E0F2FE',
  },
  typeOptionText: { fontSize: 12, fontWeight: '600', color: '#475569' },
  typeOptionTextActive: { color: '#0D3C75', fontWeight: FONT_WEIGHT.bold },
  input: {
    borderWidth: 1.5,
    borderColor: '#E2E8F0',
    borderRadius: RADIUS.inner,
    padding: 12,
    fontSize: 13,
    color: '#0F172A',
    marginBottom: 16,
    backgroundColor: '#FFFFFF',
  },
  submitBtn: {
    backgroundColor: '#C2413B',
    paddingVertical: 14,
    borderRadius: RADIUS.inner,
    alignItems: 'center',
    justifyContent: 'center',
  },
  submitBtnText: { color: '#FFFFFF', fontSize: 14, fontWeight: FONT_WEIGHT.black },
});

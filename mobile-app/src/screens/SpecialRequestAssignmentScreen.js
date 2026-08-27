import React, { useState, useEffect } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ScrollView, Alert, Modal, Image, TextInput, ActivityIndicator } from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import Svg, { Path } from 'react-native-svg';
import { ArrowLeftIcon, CameraIcon, ImageIcon, CheckIcon } from '../components/AppIcons';
import { COLORS, RADIUS, TOUCH_TARGET, FONT_WEIGHT, SHADOWS, SPACING, RESPONSIVE, wp, hp } from '../theme';

import AsyncStorage from '@react-native-async-storage/async-storage';
import { API_BASE_URL } from '../config';

export default function SpecialRequestAssignmentScreen({ onBack, lang = 'en' }) {
  const [tasks, setTasks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [deliveringTask, setDeliveringTask] = useState(null);
  const [proofPhoto, setProofPhoto] = useState(null);
  const [recipientNotes, setRecipientNotes] = useState('');
  const [submittingDelivery, setSubmittingDelivery] = useState(false);

  const fetchTasks = async () => {
    try {
      setLoading(true);
      const token = await AsyncStorage.getItem('mitigateplus_token');
      const res = await fetch(`${API_BASE_URL}/assistance-requests`, {
        headers: {
          'Content-Type': 'application/json',
          Authorization: token ? `Bearer ${token}` : '',
        },
      });
      if (res.ok) {
        const data = await res.json();
        if (Array.isArray(data)) {
          const mapped = data.map((item, idx) => ({
            id: item._id || idx,
            resident: `${item.householdId?.headOfHouseholdUserId?.name || 'Resident'}, ${item.householdId?.address || ''}`,
            reason: item.notes || (lang === 'tl' ? 'Espesyal na tulong sa tahanan' : 'Special on-site relief need'),
            items: item.itemType || 'Family Food Pack',
            members: item.householdId?.memberCount || 1,
            barangay: item.householdId?.barangayCode || '291',
            requestedBy: item.householdId?.headOfHouseholdUserId?.name || 'Resident',
            assignedStaff: item.assignedStaff?.name || 'Field Officer',
            assignedAt: new Date(item.requestedAt || Date.now()).toLocaleDateString(),
            status: item.status === 'received' || item.status === 'released' ? 'Delivered' : 'Assigned',
            proofOfDeliveryPhoto: item.proofOfDeliveryPhoto || null,
            recipientSignatureOrNotes: item.recipientSignatureOrNotes || '',
            deliveredAt: item.deliveredAt ? new Date(item.deliveredAt).toLocaleString('en-PH', { timeZone: 'Asia/Manila' }) : null,
          }));
          setTasks(mapped);
        }
      }
    } catch (e) {
      console.warn('Assistance tasks fetch error:', e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTasks();
  }, []);

  const handlePickCamera = async () => {
    try {
      const { status } = await ImagePicker.requestCameraPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Permission Denied', 'Camera permission is required to capture proof of handover.');
        return;
      }
      const result = await ImagePicker.launchCameraAsync({
        allowsEditing: true,
        quality: 0.6,
        base64: true,
      });
      if (!result.canceled && result.assets && result.assets.length > 0) {
        setProofPhoto(result.assets[0]);
      }
    } catch (e) {
      Alert.alert('Camera Note', 'Unable to open camera: ' + e.message);
    }
  };

  const handlePickLibrary = async () => {
    try {
      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Permission Denied', 'Gallery permission is required to select proof photo.');
        return;
      }
      const result = await ImagePicker.launchImageLibraryAsync({
        allowsEditing: true,
        quality: 0.6,
        base64: true,
      });
      if (!result.canceled && result.assets && result.assets.length > 0) {
        setProofPhoto(result.assets[0]);
      }
    } catch (e) {
      Alert.alert('Gallery Note', 'Unable to open gallery: ' + e.message);
    }
  };

  const handleConfirmProofDelivery = async () => {
    if (!deliveringTask) return;
    try {
      setSubmittingDelivery(true);
      const token = await AsyncStorage.getItem('mitigateplus_token');
      const photoUri = proofPhoto ? (proofPhoto.base64 ? `data:image/jpeg;base64,${proofPhoto.base64}` : proofPhoto.uri) : null;

      const res = await fetch(`${API_BASE_URL}/assistance-requests/${deliveringTask.id}/deliver`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Authorization: token ? `Bearer ${token}` : '',
        },
        body: JSON.stringify({
          status: 'received',
          proofOfDeliveryPhoto: photoUri,
          recipientSignatureOrNotes: recipientNotes || 'Handed directly to beneficiary / verified family representative.',
        }),
      });

      if (res.ok) {
        setTasks(prev => prev.map(t => t.id === deliveringTask.id ? {
          ...t,
          status: 'Delivered',
          deliveredAt: new Date().toLocaleString('en-PH', { timeZone: 'Asia/Manila' }),
          proofOfDeliveryPhoto: photoUri,
          recipientSignatureOrNotes: recipientNotes,
        } : t));
        Alert.alert(
          lang === 'tl' ? 'Matagumpay na Naihatid!' : 'Delivery Confirmed!',
          lang === 'tl'
            ? `Nai-upload ang proof of delivery para kay ${deliveringTask.resident}.`
            : `Proof of delivery photo recorded for ${deliveringTask.resident}.`
        );
        setDeliveringTask(null);
        setProofPhoto(null);
        setRecipientNotes('');
      } else {
        const errData = await res.json().catch(() => ({}));
        Alert.alert('Error', errData.message || 'Failed to submit proof of delivery.');
      }
    } catch (err) {
      Alert.alert('Error', 'Network error while recording proof of delivery.');
    } finally {
      setSubmittingDelivery(false);
    }
  };

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      {onBack && (
        <TouchableOpacity style={styles.backBtn} onPress={onBack} activeOpacity={0.8}>
          <ArrowLeftIcon size={16} color="#1557B0" />
          <Text style={styles.backBtnText}>{lang === 'tl' ? 'Bumalik' : 'Back'}</Text>
        </TouchableOpacity>
      )}

      {/* Header */}
      <View style={styles.headerCard}>
        <View style={styles.headerTitleRow}>
          <Text style={styles.headerTitle}>{lang === 'tl' ? 'Pagtatalaga ng Espesyal na Kahilingan' : 'Special Request Assignment'}</Text>
          <View style={styles.badgePill}>
            <Text style={styles.badgePillText}>
              {tasks.filter(t => t.status === 'Assigned').length} {lang === 'tl' ? 'Nakabinbing Gawain' : 'Pending Tasks'}
            </Text>
          </View>
        </View>
        <Text style={styles.headerSub}>
          {lang === 'tl'
            ? 'Mga gawaing door-to-door delivery at controls ng pamamahagi na itinalaga sa inyo ng LGU Command Center.'
            : 'Door-to-door relief delivery tasks & distribution event controls assigned to you by LGU Command Center.'}
        </Text>
      </View>

      {/* ── Field Team Leader On-Ground Event Controller ── */}
      <View style={[styles.taskCard, { backgroundColor: '#173F56', marginBottom: 20 }]}>
        <Text style={{ fontSize: 11, fontWeight: '800', color: '#E8940F', textTransform: 'uppercase', letterSpacing: 1, marginBottom: 4 }}>
          {lang === 'tl' ? 'PINUNO NG FIELD TEAM — KONTROL NG KAGANAPAN SA SITE' : 'FIELD TEAM LEADER — ON-GROUND EVENT STATUS CONTROL'}
        </Text>
        <Text style={{ fontSize: 14, fontWeight: '800', color: '#FFFFFF', marginBottom: 4 }}>
          {lang === 'tl' ? 'Mga Aktibong Kaganapan ng Pamamahagi' : 'Active Distribution Events'}
        </Text>
        <Text style={{ fontSize: 12, color: 'rgba(255,255,255,0.8)', marginBottom: 12 }}>
          {lang === 'tl'
            ? 'Ikaw ang On-Ground Lead. Mag-uulat ito nang live sa LGU Web Admin dashboard.'
            : 'You are the On-Ground Lead. Status updates here reflect live on the LGU Web Admin dashboard.'}
        </Text>

        <TouchableOpacity
          style={{ backgroundColor: '#158A64', paddingVertical: 12, paddingHorizontal: 16, borderRadius: 10, alignItems: 'center', marginBottom: 8 }}
          onPress={async () => {
            try {
              const token = await AsyncStorage.getItem('mitigateplus_token');
              const eventsRes = await fetch(`${API_BASE_URL}/distributions/events`, {
                headers: { Authorization: token ? `Bearer ${token}` : '' },
              });
              if (eventsRes.ok) {
                const events = await eventsRes.json();
                const activeEvents = (Array.isArray(events) ? events : []).filter(e => e.isActive);
                if (activeEvents.length === 0) {
                  Alert.alert(
                    lang === 'tl' ? 'Walang Aktibong Kaganapan' : 'No Active Events',
                    lang === 'tl' ? 'Walang aktibong distribution event sa ngayon.' : 'No active distribution events found at this time.'
                  );
                } else {
                  Alert.alert(
                    lang === 'tl' ? 'Tagumpay' : 'Success',
                    lang === 'tl'
                      ? `Mayroong ${activeEvents.length} na aktibong kaganapan na tumatakbo.`
                      : `${activeEvents.length} active distribution event(s) currently running.`
                  );
                }
              }
            } catch (err) {
              Alert.alert('Error', lang === 'tl' ? 'Hindi makonekta sa server.' : 'Could not connect to server.');
            }
          }}
        >
          <Text style={{ color: '#FFFFFF', fontWeight: '800', fontSize: 13 }}>
            {lang === 'tl' ? 'Tingnan ang Mga Aktibong Distribution Event' : 'View Active Distribution Events'}
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={{ backgroundColor: 'rgba(255,255,255,0.15)', paddingVertical: 10, paddingHorizontal: 16, borderRadius: 10, alignItems: 'center', borderWidth: 1, borderColor: 'rgba(255,255,255,0.3)' }}
          onPress={() => {
            fetchTasks();
            Alert.alert(
              lang === 'tl' ? 'Na-refresh na' : 'Refreshed',
              lang === 'tl' ? 'Na-refresh na ang listahan ng mga gawain.' : 'Task list has been refreshed from server.'
            );
          }}
        >
          <Text style={{ color: '#FFFFFF', fontWeight: '800', fontSize: 12 }}>
            {lang === 'tl' ? 'I-refresh ang Listahan ng Gawain' : 'Refresh Task List from Server'}
          </Text>
        </TouchableOpacity>
      </View>

      {/* Task Cards List */}
      {tasks.length === 0 ? (
        <View style={styles.emptyCard}>
          <Text style={styles.emptyTitle}>No Assigned Delivery Tasks</Text>
          <Text style={styles.emptySub}>All door-to-door special relief requests for your barangay have been fulfilled.</Text>
        </View>
      ) : (
        tasks.map((item) => {
          const isPending = item.status === 'Assigned';
          return (
            <View key={item.id} style={[styles.taskCard, isPending ? styles.taskCardPending : styles.taskCardDone]}>
              <View style={styles.cardHeaderRow}>
                <View style={styles.badgeStatus(isPending)}>
                  <Text style={styles.badgeStatusText(isPending)}>
                    {isPending ? 'Delivery Assigned' : 'Delivered & Fulfilled'}
                  </Text>
                </View>
                <Text style={styles.brgyTag}>Brgy {item.barangay}</Text>
              </View>

              <Text style={styles.residentName}>{item.resident}</Text>
              <Text style={styles.requestedBy}>Requested by: {item.requestedBy}</Text>

              <View style={styles.infoBox}>
                <Text style={styles.infoLabel}>REASON FOR DOOR-TO-DOOR:</Text>
                <Text style={styles.infoVal}>{item.reason}</Text>

                <Text style={[styles.infoLabel, { marginTop: 8 }]}>ITEMS TO DELIVER:</Text>
                <Text style={styles.itemsVal}>{item.items} ({item.members} members)</Text>

                {item.proofOfDeliveryPhoto && (
                  <View style={{ marginTop: 10, paddingTop: 10, borderTopWidth: 1, borderColor: '#CBD5E1' }}>
                    <Text style={[styles.infoLabel, { color: '#047857' }]}> PROOF OF HANDOVER PHOTO:</Text>
                    <Image source={{ uri: item.proofOfDeliveryPhoto }} style={{ width: '100%', height: 140, borderRadius: 8, marginTop: 4 }} resizeMode="cover" />
                    {item.recipientSignatureOrNotes ? (
                      <Text style={{ fontSize: 11, color: '#334155', fontStyle: 'italic', marginTop: 4 }}>
                        Note: {item.recipientSignatureOrNotes}
                      </Text>
                    ) : null}
                  </View>
                )}
              </View>

              {isPending ? (
                <TouchableOpacity
                  style={styles.deliverBtn}
                  onPress={() => {
                    setDeliveringTask(item);
                    setProofPhoto(null);
                    setRecipientNotes('');
                  }}
                  activeOpacity={0.85}
                >
                  <Text style={styles.deliverBtnText}> Complete Delivery & Upload Proof</Text>
                </TouchableOpacity>
              ) : (
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 6 }}>
                  <Text style={{ fontSize: 12 }}></Text>
                  <Text style={styles.deliveredTimeText}>Na-deliver noong {item.deliveredAt || item.assignedAt}</Text>
                </View>
              )}
            </View>
          );
        })
      )}

      {/* ── Proof of Handover Photo & Delivery Modal ── */}
      {deliveringTask && (
        <Modal
          visible={!!deliveringTask}
          transparent
          animationType="slide"
          onRequestClose={() => setDeliveringTask(null)}
        >
          <View style={styles.modalOverlay}>
            <View style={styles.modalCard}>
              <Text style={styles.modalKicker}>DOOR-TO-DOOR RELIEF HANDOVER PROOF</Text>
              <Text style={styles.modalTitle}>{deliveringTask.resident}</Text>
              <Text style={styles.modalSub}>
                {lang === 'tl'
                  ? 'Kumuha ng litrato ng pag-abot ng ayuda o lagda ng pamilya bilang opisyal na patunay.'
                  : 'Capture a photo of the relief goods handover at the doorstep for official audit verification.'}
              </Text>

              {/* Photo Preview / Capture Options */}
              <View style={styles.photoPickerContainer}>
                {proofPhoto ? (
                  <View style={styles.photoPreviewBox}>
                    <Image source={{ uri: proofPhoto.uri }} style={styles.photoPreviewImg} resizeMode="cover" />
                    <TouchableOpacity
                      style={styles.changePhotoBtn}
                      onPress={() => setProofPhoto(null)}
                    >
                      <Text style={styles.changePhotoText}>{lang === 'tl' ? 'Palitan ang Litrato' : 'Change Photo'}</Text>
                    </TouchableOpacity>
                  </View>
                ) : (
                  <View style={styles.photoActionRow}>
                    <TouchableOpacity
                      style={styles.photoActionBtn}
                      onPress={handlePickCamera}
                      activeOpacity={0.8}
                    >
                      <CameraIcon size={22} color="#1557B0" />
                      <Text style={styles.photoActionBtnText}>{lang === 'tl' ? 'Buksan ang Camera' : 'Take Photo (Camera)'}</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={[styles.photoActionBtn, { backgroundColor: '#F8FAFC' }]}
                      onPress={handlePickLibrary}
                      activeOpacity={0.8}
                    >
                      <ImageIcon size={22} color="#64748B" />
                      <Text style={[styles.photoActionBtnText, { color: '#475569' }]}>{lang === 'tl' ? 'Pumili sa Gallery' : 'Upload from Gallery'}</Text>
                    </TouchableOpacity>
                  </View>
                )}
              </View>

              {/* Delivery Notes */}
              <Text style={styles.notesLabel}>{lang === 'tl' ? 'Tala / Pangalan ng Tumanggap (Optional):' : 'Recipient / Handover Notes:'}</Text>
              <TextInput
                style={styles.notesInput}
                placeholder={lang === 'tl' ? 'Hal. Iniabot sa anak na si Maria, nasa maayos na kalagayan.' : 'e.g. Received by daughter Maria, verified resident.'}
                value={recipientNotes}
                onChangeText={setRecipientNotes}
                multiline
              />

              {/* Action Buttons */}
              <View style={styles.modalBtnRow}>
                <TouchableOpacity
                  style={styles.modalCancelBtn}
                  onPress={() => setDeliveringTask(null)}
                  disabled={submittingDelivery}
                >
                  <Text style={styles.modalCancelBtnText}>{lang === 'tl' ? 'Kanselahin' : 'Cancel'}</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={styles.modalSubmitBtn}
                  onPress={handleConfirmProofDelivery}
                  disabled={submittingDelivery}
                >
                  {submittingDelivery ? (
                    <ActivityIndicator size="small" color="#FFFFFF" />
                  ) : (
                    <Text style={styles.modalSubmitBtnText}>
                       {lang === 'tl' ? 'Kumpirmahin ang Delivery' : 'Confirm & Save Proof'}
                    </Text>
                  )}
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </Modal>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.sampaguita },
  content: {
    paddingHorizontal: RESPONSIVE.padding,
    paddingTop: RESPONSIVE.topSafe + 6,
    paddingBottom: hp(8),
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
  backBtnText: { fontSize: 12.5, fontWeight: '800', color: '#1557B0' },
  headerCard: {
    backgroundColor: COLORS.manilaBlue,
    borderRadius: RADIUS.card,
    padding: 20,
    marginBottom: 16,
    ...SHADOWS.card,
  },
  headerTitleRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 },
  headerTitle: { color: '#FFFFFF', fontSize: 18, fontWeight: '800' },
  badgePill: { backgroundColor: 'rgba(255,255,255,0.2)', paddingHorizontal: 10, paddingVertical: 4, borderRadius: RADIUS.pill },
  badgePillText: { color: '#FFFFFF', fontSize: 11, fontWeight: '700' },
  headerSub: { color: 'rgba(255,255,255,0.8)', fontSize: 12, lineHeight: 18 },
  emptyCard: { backgroundColor: COLORS.card, padding: 30, borderRadius: RADIUS.card, alignItems: 'center', ...SHADOWS.card },
  emptyTitle: { fontSize: 16, fontWeight: '700', color: COLORS.ink, marginBottom: 6 },
  emptySub: { fontSize: 12, color: COLORS.inkSoft, textAlign: 'center' },
  taskCard: {
    backgroundColor: COLORS.card,
    borderRadius: RADIUS.card,
    padding: 16,
    marginBottom: 14,
    borderLeftWidth: 4,
    ...SHADOWS.card,
  },
  taskCardPending: { borderLeftColor: COLORS.jeepneyAmber },
  taskCardDone: { borderLeftColor: COLORS.bayTeal },
  cardHeaderRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 },
  badgeStatus: (isPending) => ({
    backgroundColor: isPending ? COLORS.jeepneyAmberLight : COLORS.bayTealLight,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: RADIUS.pill,
  }),
  badgeStatusText: (isPending) => ({
    color: isPending ? COLORS.jeepneyAmber : COLORS.bayTealDeep,
    fontSize: 11,
    fontWeight: '700',
  }),
  brgyTag: { fontSize: 11, fontWeight: '700', color: COLORS.manilaBlue },
  residentName: { fontSize: 16, fontWeight: '800', color: COLORS.ink, marginBottom: 2 },
  requestedBy: { fontSize: 12, color: COLORS.inkSoft, marginBottom: 10 },
  infoBox: { backgroundColor: COLORS.sampaguita, padding: 12, borderRadius: RADIUS.inner, marginBottom: 12 },
  infoLabel: { fontSize: 10, fontWeight: '800', color: COLORS.inkSoft, letterSpacing: 0.5 },
  infoVal: { fontSize: 12, color: COLORS.ink, marginTop: 2 },
  itemsVal: { fontSize: 13, fontWeight: '700', color: COLORS.manilaBlue, marginTop: 2 },
  deliverBtn: {
    backgroundColor: COLORS.bayTeal,
    paddingVertical: 12,
    borderRadius: RADIUS.inner,
    alignItems: 'center',
    minHeight: TOUCH_TARGET.min,
    justifyContent: 'center',
  },
  deliverBtnText: { color: '#FFFFFF', fontWeight: '800', fontSize: 13 },
  deliveredTimeText: { fontSize: 11, color: COLORS.bayTealDeep, fontWeight: '700', textAlign: 'center', marginTop: 4 },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(15, 23, 42, 0.75)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 18,
  },
  modalCard: {
    width: '100%',
    maxWidth: 420,
    backgroundColor: '#FFFFFF',
    borderRadius: 18,
    padding: 20,
    ...SHADOWS.modal,
  },
  modalKicker: {
    fontSize: 9.5,
    fontWeight: '800',
    color: '#1557B0',
    letterSpacing: 0.8,
    marginBottom: 4,
  },
  modalTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: '#0F172A',
    marginBottom: 4,
  },
  modalSub: {
    fontSize: 11.5,
    color: '#64748B',
    lineHeight: 16,
    marginBottom: 14,
  },
  photoPickerContainer: {
    marginBottom: 14,
  },
  photoActionRow: {
    flexDirection: 'row',
    gap: 10,
  },
  photoActionBtn: {
    flex: 1,
    backgroundColor: '#EFF6FF',
    borderWidth: 1.5,
    borderColor: '#BFDBFE',
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
  },
  photoActionBtnText: {
    fontSize: 11.5,
    fontWeight: '700',
    color: '#1557B0',
  },
  photoPreviewBox: {
    borderRadius: 12,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: '#CBD5E1',
  },
  photoPreviewImg: {
    width: '100%',
    height: 160,
  },
  changePhotoBtn: {
    backgroundColor: '#F1F5F9',
    paddingVertical: 8,
    alignItems: 'center',
  },
  changePhotoText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#475569',
  },
  notesLabel: {
    fontSize: 11,
    fontWeight: '700',
    color: '#334155',
    marginBottom: 6,
  },
  notesInput: {
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: '#CBD5E1',
    borderRadius: 10,
    padding: 10,
    fontSize: 12,
    color: '#0F172A',
    minHeight: 50,
    textAlignVertical: 'top',
    marginBottom: 16,
  },
  modalBtnRow: {
    flexDirection: 'row',
    gap: 10,
  },
  modalCancelBtn: {
    flex: 1,
    backgroundColor: '#F1F5F9',
    paddingVertical: 12,
    borderRadius: 10,
    alignItems: 'center',
  },
  modalCancelBtnText: {
    fontSize: 12.5,
    fontWeight: '700',
    color: '#475569',
  },
  modalSubmitBtn: {
    flex: 2,
    backgroundColor: '#047857',
    paddingVertical: 12,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  modalSubmitBtnText: {
    fontSize: 12.5,
    fontWeight: '800',
    color: '#FFFFFF',
  },
});

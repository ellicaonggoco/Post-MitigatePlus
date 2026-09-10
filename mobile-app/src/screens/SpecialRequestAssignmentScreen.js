import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  Alert,
  Modal,
  Image,
  TextInput,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import {
  ArrowLeftIcon,
  CameraIcon,
  ImageIcon,
  CheckIcon,
  MapPinIcon,
  PackageIcon,
  TruckIcon,
  CalendarIcon,
} from '../components/AppIcons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { API_BASE_URL } from '../config';
import { initSocket } from '../services/socketService';

export default function SpecialRequestAssignmentScreen({ user, onBack, lang = 'en' }) {
  const [filterTab, setFilterTab] = useState('assigned'); // 'assigned' | 'delivered'
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
        if (Array.isArray(data) && data.length > 0) {
          const mapped = data.map((item, idx) => ({
            id: item._id || `task_${idx}`,
            resident: item.householdId?.headOfHouseholdUserId?.name || item.name || 'Resident Beneficiary',
            address: item.householdId?.address || 'Barangay Address',
            purok: item.householdId?.purok || '',
            reason: item.notes || item.reason || (lang === 'tl' ? 'Espesyal na tulong sa tahanan para sa vulnerable resident.' : 'Special on-site relief delivery for vulnerable resident.'),
            items: item.itemType || 'Family Food Pack',
            members: item.householdId?.memberCount || 1,
            barangay: item.householdId?.barangayCode || item.barangayCode || '291',
            requestedBy: item.householdId?.headOfHouseholdUserId?.name || 'Resident',
            assignedStaff: item.assignedStaffName || item.assignedStaff?.name || 'Officer Santos',
            assignedStaffId: item.assignedStaff?._id || item.assignedStaff?.id || item.assignedStaff || null,
            assignedAt: new Date(item.requestedAt || Date.now()).toLocaleDateString('en-PH', { month: 'short', day: 'numeric', year: 'numeric' }),
            status: item.status === 'received' || item.status === 'released' ? 'delivered' : 'assigned',
            proofOfDeliveryPhoto: item.proofOfDeliveryPhoto || null,
            recipientSignatureOrNotes: item.recipientSignatureOrNotes || '',
            deliveredAt: item.deliveredAt ? new Date(item.deliveredAt).toLocaleString('en-PH', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' }) : null,
          }));
          setTasks(mapped);
          return;
        }
      }
      // No tasks assigned or found in database
      setTasks([]);
    } catch (e) {
      console.warn('Assistance tasks fetch error:', e);
      setTasks([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTasks();
    try {
      const s = initSocket();
      if (s) {
        s.on('assistance_request_assigned', () => fetchTasks());
        s.on('assistance_request_updated', () => fetchTasks());
        s.on('new_assistance_request', () => fetchTasks());
      }
    } catch (e) {}
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
      const photoUri = proofPhoto
        ? proofPhoto.base64
          ? `data:image/jpeg;base64,${proofPhoto.base64}`
          : proofPhoto.uri
        : null;

      const formattedDate = new Date().toLocaleString('en-PH', {
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      });

      // Attempt live backend update
      let res;
      try {
        res = await fetch(`${API_BASE_URL}/assistance-requests/${deliveringTask.id}/deliver`, {
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
      } catch (e) {
        console.warn('Backend sync network error:', e);
        Alert.alert(
          lang === 'tl' ? 'Koneksyon sa Server' : 'Connection Error',
          lang === 'tl'
            ? 'Hindi makakonekta sa server. Pakisuri ang inyong internet koneksyon at subukan muli.'
            : 'Could not reach the server. Please check your internet connection and try again.'
        );
        return;
      }

      if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        Alert.alert(
          lang === 'tl' ? 'Hindi Maitala ang Delivery' : 'Delivery Update Failed',
          errData.message || (lang === 'tl' ? 'Nagkaroon ng aberya sa pag-record ng delivery sa server.' : 'Server was unable to record delivery completion.')
        );
        return;
      }

      // Successful live server update
      setTasks(prev =>
        prev.map(t =>
          t.id === deliveringTask.id
            ? {
                ...t,
                status: 'delivered',
                deliveredAt: formattedDate,
                proofOfDeliveryPhoto: photoUri || null,
                recipientSignatureOrNotes: recipientNotes || 'Delivered directly to beneficiary.',
              }
            : t
        )
      );

      Alert.alert(
        lang === 'tl' ? 'Matagumpay na Naihatid!' : 'Delivery Confirmed!',
        lang === 'tl'
          ? `Nai-record na ang opisyal na proof of handover para kay ${deliveringTask.resident}.`
          : `Official proof of delivery photo recorded for ${deliveringTask.resident}.`
      );

      setDeliveringTask(null);
      setProofPhoto(null);
      setRecipientNotes('');
      setFilterTab('delivered');
    } catch (err) {
      Alert.alert('Error', 'Unable to complete delivery submission.');
    } finally {
      setSubmittingDelivery(false);
    }
  };

  const assignedTasks = tasks.filter(t => t.status === 'assigned');
  const deliveredTasks = tasks.filter(t => t.status === 'delivered');
  const filteredTasks = filterTab === 'assigned' ? assignedTasks : deliveredTasks;

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
      {/* 0. Top Navigation & Header */}
      <View style={styles.topNavRow}>
        {onBack && (
          <TouchableOpacity
            style={styles.backCircleBtn}
            onPress={onBack}
            activeOpacity={0.8}
            accessibilityRole="button"
            accessibilityLabel={lang === 'tl' ? 'Bumalik sa mga gawain' : 'Go back to tasks'}
            accessibilityHint="Returns to tasks and distribution drives"
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          >
            <ArrowLeftIcon size={18} color="#1C3F94" />
          </TouchableOpacity>
        )}
        <View style={{ flex: 1 }}>
          <Text style={styles.pageTitle}>
            {lang === 'tl' ? 'Espesyal na Pamamahagi' : 'Special Request Deliveries'}
          </Text>
          <Text style={styles.pageSub}>
            {lang === 'tl'
              ? 'Direktang paghahatid ng ayuda sa tahanan ng mga vulnerable na pamilya.'
              : 'Door-to-door direct relief delivery tasks dispatched by Command Center.'}
          </Text>
        </View>
      </View>

      {/* 3. Blue Segmented Filter Container */}
      <View style={styles.segmentedContainer}>
        <TouchableOpacity
          style={[styles.segmentBtn, filterTab === 'assigned' && styles.segmentBtnActive]}
          onPress={() => setFilterTab('assigned')}
          activeOpacity={0.8}
          accessibilityRole="button"
          accessibilityLabel={`Assigned deliveries, ${assignedTasks.length}`}
          accessibilityHint="Filters the list to assigned deliveries"
          accessibilityState={{ selected: filterTab === 'assigned' }}
          hitSlop={{ top: 8, bottom: 8, left: 4, right: 4 }}
        >
          <Text style={[styles.segmentText, filterTab === 'assigned' && styles.segmentTextActive]}>
            Assigned ({assignedTasks.length})
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.segmentBtn, filterTab === 'delivered' && styles.segmentBtnActive]}
          onPress={() => setFilterTab('delivered')}
          activeOpacity={0.8}
          accessibilityRole="button"
          accessibilityLabel={`Delivered, ${deliveredTasks.length}`}
          accessibilityHint="Filters the list to completed deliveries"
          accessibilityState={{ selected: filterTab === 'delivered' }}
          hitSlop={{ top: 8, bottom: 8, left: 4, right: 4 }}
        >
          <Text style={[styles.segmentText, filterTab === 'delivered' && styles.segmentTextActive]}>
            Delivered ({deliveredTasks.length})
          </Text>
        </TouchableOpacity>
      </View>

      {/* 4. Tasks List */}
      <View style={styles.taskList}>
        {loading && tasks.length === 0 ? (
          <View style={styles.emptyStateCard}>
            <ActivityIndicator color="#1C3F94" size="small" />
            <Text style={[styles.emptyStateText, { marginTop: 10 }]}>
              {lang === 'tl' ? 'Kinakarga ang mga special requests...' : 'Loading special requests...'}
            </Text>
          </View>
        ) : filteredTasks.length === 0 ? (
          <View style={styles.emptyStateCard}>
            <View style={styles.emptyIconWell}>
              <TruckIcon size={26} color="#64748B" />
            </View>
            <Text style={styles.emptyStateTitle}>
              {filterTab === 'assigned'
                ? lang === 'tl' ? 'Walang nakabinbing delivery' : 'No pending deliveries'
                : lang === 'tl' ? 'Walang natapos na delivery' : 'No completed deliveries yet'}
            </Text>
            <Text style={styles.emptyStateText}>
              {filterTab === 'assigned'
                ? lang === 'tl'
                  ? 'Lahat ng door-to-door special relief requests sa inyong hurisdiksyon ay naihatid na.'
                  : 'All assigned door-to-door relief requests for your jurisdiction have been completed.'
                : lang === 'tl'
                  ? 'Kapag natapos ang delivery at na-upload ang proof photo, lalabas ito rito.'
                  : 'Delivered relief goods with uploaded proof photos will appear here.'}
            </Text>
            <TouchableOpacity
              style={[styles.royalBlueBtn, { marginTop: 14, paddingHorizontal: 20, alignSelf: 'center', minHeight: 52 }]}
              onPress={fetchTasks}
              activeOpacity={0.85}
              accessibilityRole="button"
              accessibilityLabel={lang === 'tl' ? 'I-refresh ang Listahan' : 'Refresh Task List'}
              accessibilityHint="Reloads assigned special requests and door to door deliveries"
            >
              <Text style={styles.royalBlueBtnText}>
                {lang === 'tl' ? 'I-refresh ang Listahan' : 'Refresh Task List'}
              </Text>
            </TouchableOpacity>
          </View>
        ) : (
          filteredTasks.map(item => {
            const isAssigned = item.status === 'assigned';

            return (
              <View key={item.id} style={styles.taskCard}>
                {/* Header Row: Beneficiary Name + Status Pill */}
                <View style={styles.cardHeaderRow}>
                  <Text style={styles.cardTitle} numberOfLines={1}>{item.resident}</Text>
                  <View style={[
                    styles.statusPill,
                    isAssigned ? styles.statusPillAssigned : styles.statusPillDelivered,
                  ]}>
                    <Text style={[
                      styles.statusPillText,
                      isAssigned ? styles.statusTextAssigned : styles.statusTextDelivered,
                    ]}>
                      {isAssigned ? 'ASSIGNED' : 'DELIVERED'}
                    </Text>
                  </View>
                </View>

                {/* Assignment Staff Tag */}
                {(() => {
                  const isMyTask = (user?.name && item.assignedStaff && item.assignedStaff.toLowerCase().includes(user.name.toLowerCase())) ||
                    (user?._id && item.assignedStaffId && String(user._id) === String(item.assignedStaffId));
                  return (
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 4, marginBottom: 8, flexWrap: 'wrap' }}>
                      <View style={[
                        styles.staffPillBadge,
                        isMyTask ? styles.myStaffPillActive : styles.otherStaffPill
                      ]}>
                        <TruckIcon size={12} color={isMyTask ? '#0D8A5A' : '#1C3F94'} />
                        <Text style={[
                          styles.staffPillText,
                          isMyTask ? styles.myStaffPillTextActive : styles.otherStaffPillText
                        ]}>
                          {isMyTask
                            ? (lang === 'tl' ? `Naka-assign sa Iyo (${item.assignedStaff})` : `Assigned to You (${item.assignedStaff})`)
                            : `Officer: ${item.assignedStaff}`}
                        </Text>
                      </View>
                      {item.assignedAt && (
                        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                          <CalendarIcon size={12} color="#3D5070" />
                          <Text style={{ fontSize: 11, color: '#3D5070', fontWeight: '600' }}>
                            {item.assignedAt}
                          </Text>
                        </View>
                      )}
                    </View>
                  );
                })()}

                {/* Location / Address Row */}
                <View style={styles.metaRow}>
                  <MapPinIcon size={14} color="#64748B" />
                  <Text style={styles.metaText} numberOfLines={1}>
                    Brgy {item.barangay} • {item.address}
                  </Text>
                </View>

                {/* Reason / Needs Highlight Box */}
                <View style={styles.reasonBox}>
                  <Text style={styles.reasonKicker}>REASON FOR DOOR-TO-DOOR:</Text>
                  <Text style={styles.reasonText}>{item.reason}</Text>
                </View>

                {/* Allocation Items Row */}
                <View style={[styles.metaRow, { marginBottom: 14 }]}>
                  <PackageIcon size={14} color="#64748B" />
                  <Text style={styles.metaText} numberOfLines={1}>
                    Allocation: <Text style={{ color: '#1C3F94', fontWeight: '800' }}>{item.items}</Text> ({item.members} members)
                  </Text>
                </View>

                {/* Action Area */}
                {isAssigned ? (
                  <TouchableOpacity
                    style={styles.royalBlueBtn}
                    onPress={() => {
                      setDeliveringTask(item);
                      setProofPhoto(null);
                      setRecipientNotes('');
                    }}
                    activeOpacity={0.85}
                  >
                    <CameraIcon size={15} color="#FFFFFF" />
                    <Text style={styles.royalBlueBtnText}>Complete Delivery & Upload Proof</Text>
                  </TouchableOpacity>
                ) : (
                  <View style={styles.deliveredProofCard}>
                    <View style={styles.deliveredHeaderRow}>
                      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                        <CheckIcon size={14} color="#059669" />
                        <Text style={styles.deliveredLabelText}>Official Proof of Handover Recorded</Text>
                      </View>
                      <Text style={styles.deliveredDateText}>{item.deliveredAt || item.assignedAt}</Text>
                    </View>

                    {item.proofOfDeliveryPhoto && (
                      <Image
                        source={{ uri: item.proofOfDeliveryPhoto }}
                        style={styles.deliveredThumbnail}
                        resizeMode="cover"
                      />
                    )}

                    {item.recipientSignatureOrNotes ? (
                      <Text style={styles.deliveredNotesText}>
                        "{item.recipientSignatureOrNotes}"
                      </Text>
                    ) : null}
                  </View>
                )}
              </View>
            );
          })
        )}
      </View>

      {/* ── Handover Proof & Photo Upload Modal ── */}
      {deliveringTask && (
        <Modal
          visible={!!deliveringTask}
          transparent
          animationType="slide"
          onRequestClose={() => setDeliveringTask(null)}
        >
          <KeyboardAvoidingView
            style={styles.modalOverlay}
            behavior={Platform.OS === 'ios' ? 'padding' : undefined}
          >
            <View style={styles.modalCard}>
              {/* Modal Top Header */}
              <View style={styles.modalHeaderStrip}>
                <View style={styles.modalHeaderIconWell}>
                  <TruckIcon size={20} color="#F59E0B" />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.modalKicker}>DOOR-TO-DOOR RELIEF HANDOVER</Text>
                  <Text style={styles.modalTitle} numberOfLines={1}>{deliveringTask.resident}</Text>
                  <Text style={styles.modalAddress} numberOfLines={1}>
                    Brgy {deliveringTask.barangay} • {deliveringTask.address}
                  </Text>
                </View>
              </View>

              <ScrollView style={{ maxHeight: 380 }} showsVerticalScrollIndicator={false}>
                <Text style={styles.modalInstructions}>
                  {lang === 'tl'
                    ? 'Kumuha ng litrato ng pag-abot ng relief package sa pintuan o patunay ng pagtanggap ng pamilya.'
                    : 'Capture a photo of the relief goods handover at the doorstep for official audit verification.'}
                </Text>

                {/* Photo Picker Box */}
                <View style={styles.photoPickerContainer}>
                  {proofPhoto ? (
                    <View style={styles.photoPreviewBox}>
                      <Image source={{ uri: proofPhoto.uri }} style={styles.photoPreviewImg} resizeMode="cover" />
                      <TouchableOpacity
                        style={styles.changePhotoBtn}
                        onPress={() => setProofPhoto(null)}
                      >
                        <Text style={styles.changePhotoText}>
                          {lang === 'tl' ? 'Palitan ang Litrato' : 'Change Photo'}
                        </Text>
                      </TouchableOpacity>
                    </View>
                  ) : (
                    <View style={styles.photoActionRow}>
                      <TouchableOpacity
                        style={styles.photoActionBtn}
                        onPress={handlePickCamera}
                        activeOpacity={0.8}
                      >
                        <CameraIcon size={22} color="#1C3F94" />
                        <Text style={styles.photoActionBtnText}>
                          {lang === 'tl' ? 'Buksan ang Camera' : 'Take Photo (Camera)'}
                        </Text>
                      </TouchableOpacity>

                      <TouchableOpacity
                        style={styles.photoActionBtn}
                        onPress={handlePickLibrary}
                        activeOpacity={0.8}
                      >
                        <ImageIcon size={22} color="#1C3F94" />
                        <Text style={styles.photoActionBtnText}>
                          {lang === 'tl' ? 'Mula sa Gallery' : 'Upload from Gallery'}
                        </Text>
                      </TouchableOpacity>
                    </View>
                  )}
                </View>

                {/* Recipient Handover Notes Input */}
                <Text style={styles.notesLabel}>
                  {lang === 'tl' ? 'Pangalan ng Tumanggap / Tala:' : 'Recipient Name / Handover Notes:'}
                </Text>
                <TextInput
                  style={styles.notesInput}
                  placeholder={lang === 'tl' ? 'Hal. Tinanggap ni Aling Remedios kasama ang apo...' : 'e.g. Received directly by beneficiary at doorstep...'}
                  placeholderTextColor="#334155"
                  value={recipientNotes}
                  onChangeText={setRecipientNotes}
                  multiline
                />
              </ScrollView>

              {/* Modal Buttons */}
              <View style={styles.modalBtnRow}>
                <TouchableOpacity
                  style={styles.modalCancelBtn}
                  onPress={() => setDeliveringTask(null)}
                  activeOpacity={0.8}
                >
                  <Text style={styles.modalCancelBtnText}>
                    {lang === 'tl' ? 'Kanselahin' : 'Cancel'}
                  </Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[styles.modalConfirmBtn, submittingDelivery && { opacity: 0.7 }]}
                  onPress={handleConfirmProofDelivery}
                  disabled={submittingDelivery}
                  activeOpacity={0.85}
                >
                  {submittingDelivery ? (
                    <ActivityIndicator color="#FFFFFF" size="small" />
                  ) : (
                    <>
                      <CheckIcon size={15} color="#FFFFFF" />
                      <Text style={styles.modalConfirmBtnText}>
                        {lang === 'tl' ? 'Kumpirmahin ang Delivery' : 'Confirm Handover'}
                      </Text>
                    </>
                  )}
                </TouchableOpacity>
              </View>
            </View>
          </KeyboardAvoidingView>
        </Modal>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F3F6FC',
  },
  content: {
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 36,
  },
  topNavRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  backCircleBtn: {
    width: 48,
    height: 48,
    borderRadius: 24,
    minWidth: 48,
    minHeight: 48,
    backgroundColor: '#EDF1FB',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
    ...(Platform.OS === 'web'
      ? { boxShadow: '0 1px 3px rgba(11,21,80,0.06), 0 4px 12px rgba(28,63,148,0.08)' }
      : {
          shadowColor: '#1C3F94',
          shadowOffset: { width: 0, height: 2 },
          shadowOpacity: 0.08,
          shadowRadius: 4,
          elevation: 2,
        }),
  },
  pageTitle: {
    fontSize: 22,
    fontWeight: '900',
    color: '#0B1525',
    letterSpacing: -0.4,
    marginBottom: 4,
  },
  pageSub: {
    fontSize: 12.5,
    color: '#3D5070',
    lineHeight: 18,
  },
  segmentedContainer: {
    flexDirection: 'row',
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    padding: 4,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#DDE4F0',
    minHeight: 56,
    alignItems: 'center',
    ...(Platform.OS === 'web'
      ? { boxShadow: '0 1px 3px rgba(11,21,80,0.06), 0 4px 12px rgba(28,63,148,0.08)' }
      : {
          shadowColor: '#1C3F94',
          shadowOffset: { width: 0, height: 2 },
          shadowOpacity: 0.08,
          shadowRadius: 6,
          elevation: 2,
        }),
  },
  segmentBtn: {
    flex: 1,
    paddingVertical: 12,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 10,
    backgroundColor: 'transparent',
    minHeight: 48,
  },
  segmentBtnActive: {
    backgroundColor: '#1C3F94',
  },
  segmentText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#1E293B',
  },
  segmentTextActive: {
    color: '#FFFFFF',
    fontWeight: '800',
  },
  taskList: {
    gap: 12,
  },
  taskCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    padding: 18,
    borderWidth: 1,
    borderColor: '#DDE4F0',
    marginBottom: 12,
    ...(Platform.OS === 'web'
      ? { boxShadow: '0 1px 3px rgba(11,21,80,0.06), 0 10px 28px rgba(28,63,148,0.10)' }
      : {
          shadowColor: '#1C3F94',
          shadowOffset: { width: 0, height: 4 },
          shadowOpacity: 0.10,
          shadowRadius: 14,
          elevation: 3,
        }),
  },
  cardHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 8,
    gap: 8,
  },
  cardTitle: {
    flex: 1,
    fontSize: 16,
    fontWeight: '800',
    color: '#0B1525',
    letterSpacing: -0.2,
  },
  statusPill: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 999,
    borderWidth: 1,
  },
  statusPillAssigned: {
    backgroundColor: '#EDF1FB',
    borderColor: '#D6DEFA',
  },
  statusPillDelivered: {
    backgroundColor: '#E6F6EF',
    borderColor: 'rgba(13,138,90,0.3)',
  },
  statusPillText: {
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 0.4,
  },
  statusTextAssigned: {
    color: '#1C3F94',
  },
  statusTextDelivered: {
    color: '#0D8A5A',
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 6,
  },
  metaText: {
    fontSize: 12.5,
    color: '#3D5070',
    fontWeight: '500',
    flex: 1,
  },
  reasonBox: {
    backgroundColor: '#FBF5E4',
    borderWidth: 1,
    borderColor: '#F0DFA0',
    borderRadius: 14,
    padding: 12,
    marginVertical: 8,
  },
  reasonKicker: {
    fontSize: 10,
    fontWeight: '800',
    color: '#B8932A',
    letterSpacing: 0.4,
    marginBottom: 3,
  },
  reasonText: {
    fontSize: 12,
    color: '#0B1525',
    lineHeight: 18,
  },
  royalBlueBtn: {
    backgroundColor: '#1C3F94',
    borderRadius: 16,
    paddingVertical: 13,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    marginTop: 4,
    minHeight: 52,
    ...(Platform.OS === 'web'
      ? { boxShadow: '0 4px 18px rgba(28,63,148,0.32)' }
      : {
          shadowColor: '#1C3F94',
          shadowOffset: { width: 0, height: 4 },
          shadowOpacity: 0.32,
          shadowRadius: 10,
          elevation: 5,
        }),
  },
  royalBlueBtnText: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '800',
    letterSpacing: 0.2,
  },
  deliveredProofCard: {
    backgroundColor: '#F3F6FC',
    borderWidth: 1,
    borderColor: '#DDE4F0',
    borderRadius: 12,
    padding: 12,
    marginTop: 4,
  },
  deliveredHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  deliveredLabelText: {
    fontSize: 11.5,
    fontWeight: '800',
    color: '#047857',
  },
  deliveredDateText: {
    fontSize: 11,
    color: '#475569',
  },
  deliveredThumbnail: {
    width: '100%',
    height: 140,
    borderRadius: 8,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: '#D6DEFA',
  },
  deliveredNotesText: {
    fontSize: 11.5,
    color: '#3D5070',
    fontStyle: 'italic',
  },
  emptyStateCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 18,
    padding: 28,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#DDE4F0',
  },
  emptyIconWell: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: '#EDF1FB',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
  },
  emptyStateTitle: {
    fontSize: 15,
    fontWeight: '800',
    color: '#0B1525',
    marginBottom: 4,
    textAlign: 'center',
  },
  emptyStateText: {
    fontSize: 12,
    color: '#3D5070',
    textAlign: 'center',
    lineHeight: 18,
  },

  // Modal Styles
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(11, 21, 37, 0.75)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 18,
  },
  modalCard: {
    width: '100%',
    maxWidth: 420,
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#DDE4F0',
    padding: 20,
    shadowColor: '#1C3F94',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.20,
    shadowRadius: 20,
    elevation: 8,
  },
  modalHeaderStrip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#DDE4F0',
    paddingBottom: 14,
    marginBottom: 12,
  },
  modalHeaderIconWell: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#FBF5E4',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#F0DFA0',
  },
  modalKicker: {
    fontSize: 9.5,
    fontWeight: '800',
    color: '#B8932A',
    letterSpacing: 0.8,
  },
  modalTitle: {
    fontSize: 15,
    fontWeight: '900',
    color: '#0B1525',
    marginTop: 2,
  },
  modalAddress: {
    fontSize: 11,
    color: '#3D5070',
  },
  modalInstructions: {
    fontSize: 11.5,
    color: '#3D5070',
    lineHeight: 16,
    marginBottom: 12,
  },
  photoPickerContainer: {
    marginBottom: 12,
  },
  photoActionRow: {
    flexDirection: 'row',
    gap: 10,
  },
  photoActionBtn: {
    flex: 1,
    backgroundColor: '#EDF1FB',
    borderWidth: 1.5,
    borderColor: '#D6DEFA',
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
  },
  photoActionBtnText: {
    fontSize: 11.5,
    fontWeight: '700',
    color: '#1C3F94',
  },
  photoPreviewBox: {
    borderRadius: 12,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: '#D6DEFA',
  },
  photoPreviewImg: {
    width: '100%',
    height: 160,
  },
  changePhotoBtn: {
    backgroundColor: '#F3F6FC',
    paddingVertical: 12,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 48,
  },
  changePhotoText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#3D5070',
  },
  notesLabel: {
    fontSize: 11,
    fontWeight: '800',
    color: '#475569',
    marginBottom: 6,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  notesInput: {
    backgroundColor: '#F3F6FC',
    borderWidth: 1,
    borderColor: '#DDE4F0',
    borderRadius: 10,
    padding: 10,
    fontSize: 12,
    color: '#0B1525',
    minHeight: 54,
    textAlignVertical: 'top',
    marginBottom: 14,
  },
  modalBtnRow: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 6,
  },
  modalCancelBtn: {
    flex: 1,
    backgroundColor: '#F3F6FC',
    paddingVertical: 12,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 48,
  },
  modalCancelBtnText: {
    fontSize: 12.5,
    fontWeight: '700',
    color: '#3D5070',
  },
  modalConfirmBtn: {
    flex: 1.6,
    backgroundColor: '#1C3F94',
    paddingVertical: 12,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 48,
    flexDirection: 'row',
    gap: 6,
    shadowColor: '#1C3F94',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 2,
  },
  modalConfirmBtnText: {
    fontSize: 12.5,
    fontWeight: '800',
    color: '#FFFFFF',
  },
  staffPillBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 8,
    paddingVertical: 3.5,
    borderRadius: 6,
    borderWidth: 1,
  },
  myStaffPillActive: {
    backgroundColor: '#E6F6EF',
    borderColor: 'rgba(13,138,90,0.3)',
  },
  otherStaffPill: {
    backgroundColor: '#EDF1FB',
    borderColor: '#D6DEFA',
  },
  staffPillText: {
    fontSize: 11.5,
    fontWeight: '700',
  },
  myStaffPillTextActive: {
    color: '#0D8A5A',
    fontWeight: '800',
  },
  otherStaffPillText: {
    color: '#1C3F94',
  },
});

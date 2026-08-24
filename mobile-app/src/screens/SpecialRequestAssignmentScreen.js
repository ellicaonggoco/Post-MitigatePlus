import React, { useState, useEffect } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ScrollView, Alert } from 'react-native';
import Svg, { Path } from 'react-native-svg';
import { ArrowLeftIcon } from '../components/AppIcons';
import { COLORS, RADIUS, TOUCH_TARGET, FONT_WEIGHT, SHADOWS, SPACING, RESPONSIVE, wp, hp } from '../theme';

import AsyncStorage from '@react-native-async-storage/async-storage';
import { API_BASE_URL } from '../config';

export default function SpecialRequestAssignmentScreen({ onBack, lang = 'en' }) {
  const [tasks, setTasks] = useState([]);
  const [loading, setLoading] = useState(true);

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
            assignedStaff: 'Field Officer',
            assignedAt: new Date(item.requestedAt || Date.now()).toLocaleDateString(),
            status: item.status === 'received' || item.status === 'released' ? 'Delivered' : 'Assigned',
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

  const handleMarkDelivered = async (taskId, residentName) => {
    Alert.alert(
      lang === 'tl' ? 'Markahan bilang Naihatid na?' : 'Mark as Delivered?',
      lang === 'tl' ? `Sigurado ka bang naihatid na ang relief packages kay "${residentName}"?` : `Are you sure you have delivered relief packages to "${residentName}"?`,
      [
        { text: lang === 'tl' ? 'Kanselahin' : 'Cancel', style: 'cancel' },
        {
          text: lang === 'tl' ? 'Oo, Naihatid na' : 'Yes, Delivered',
          onPress: async () => {
            try {
              const token = await AsyncStorage.getItem('mitigateplus_token');
              await fetch(`${API_BASE_URL}/assistance-requests/${taskId}`, {
                method: 'PATCH',
                headers: {
                  'Content-Type': 'application/json',
                  Authorization: token ? `Bearer ${token}` : '',
                },
                body: JSON.stringify({ status: 'received' }),
              });
              setTasks(prev => prev.map(t => t.id === taskId ? { ...t, status: 'Delivered', deliveredAt: new Date().toLocaleString() } : t));
              Alert.alert(lang === 'tl' ? 'Tagumpay' : 'Success', lang === 'tl' ? `Nakumpirma ang door-to-door delivery para kay ${residentName}!` : `Door-to-door delivery confirmed for ${residentName}!`);
            } catch (err) {
              setTasks(prev => prev.map(t => t.id === taskId ? { ...t, status: 'Delivered', deliveredAt: new Date().toLocaleString() } : t));
            }
          },
        },
      ]
    );
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
              const token = (await AsyncStorage.getItem('mitigateplus_token')) || (typeof window !== 'undefined' && window.localStorage?.getItem('mitigateplus_token'));
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
              </View>

              {isPending ? (
                <TouchableOpacity
                  style={styles.deliverBtn}
                  onPress={() => handleMarkDelivered(item.id, item.resident)}
                  activeOpacity={0.8}
                >
                  <Text style={styles.deliverBtnText}>Mark as Delivered / Fulfilled</Text>
                </TouchableOpacity>
              ) : (
                <Text style={styles.deliveredTimeText}>Na-deliver noong {item.deliveredAt || item.assignedAt}</Text>
              )}
            </View>
          );
        })
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
});

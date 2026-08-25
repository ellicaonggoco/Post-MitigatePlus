import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, ActivityIndicator } from 'react-native';
import { RADIUS, FONT_WEIGHT, SPACING, RESPONSIVE, wp, hp } from '../theme';
import { fetchDistributionEvents } from '../services/api';
import { MapPinIcon, PackageIcon, CheckIcon } from '../components/AppIcons';
import { MotionPressable, MotionProgressTrack } from '../components/motion';


export default function StaffTasksScreen({ token, onSelectScanEvent, lang = 'en' }) {
  const [filterTab, setFilterTab] = useState('ongoing'); // 'ongoing' | 'completed'
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    let isMounted = true;
    async function loadEvents() {
      if (!token) return;
      setLoading(true);
      try {
        const liveEvents = await fetchDistributionEvents(token);
        if (isMounted && Array.isArray(liveEvents)) {
          setEvents(liveEvents.map((e, idx) => ({
            _id: e._id,
            id: e._id || `evt_live_${idx}`,
            title: e.title,
            venue: e.location || 'Barangay Center',
            location: e.location || 'Barangay Center',
            itemType: e.itemType || 'Family Food Pack',
            status: e.status || 'ongoing',
            scannedCount: e.claimedCount || 0,
            totalTarget: e.targetCount || 100,
            startTime: new Date(e.createdAt || Date.now()).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
            completedTime: e.completedAt ? new Date(e.completedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : undefined,
            allocatedItems: e.itemType || 'Family Food Pack',
          })));
        }
      } catch (err) {
        console.warn('Events fetch fallback:', err);
      } finally {
        if (isMounted) setLoading(false);
      }
    }
    loadEvents();
    return () => { isMounted = false; };
  }, [token]);

  const filteredEvents = events.filter(e => e.status === filterTab);

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <View style={styles.header}>
        <Text style={styles.badge}>{lang === 'tl' ? 'LGU FIELD STAFF TASK MANAGER' : 'LGU FIELD STAFF TASK MANAGER'}</Text>
        <Text style={styles.title}>{lang === 'tl' ? 'Mga Gawain at Pamamahagi sa Field' : 'Field Tasks & Distribution Drives'}</Text>
        <Text style={styles.sub}>
          {lang === 'tl'
            ? 'Pamahalaan ang mga aktibong relief drives at suriin ang mga natapos na pamamahagi.'
            : 'Manage active relief events and review completed field distributions.'}
        </Text>
      </View>

      {/* Ongoing vs Completed Segmented Filter Tabs with MotionPressable */}
      <View style={styles.tabBar}>
        <MotionPressable
          style={[styles.tabBtn, filterTab === 'ongoing' && styles.tabBtnActive]}
          onPress={() => setFilterTab('ongoing')}
          activeOpacity={0.8}
        >
          <Text style={[styles.tabText, filterTab === 'ongoing' && styles.tabTextActive]}>
            {lang === 'tl' ? 'Kasalukuyang Drives' : 'Ongoing Drives'} ({events.filter(e => e.status === 'ongoing').length})
          </Text>
        </MotionPressable>
        <MotionPressable
          style={[styles.tabBtn, filterTab === 'completed' && styles.tabBtnActive]}
          onPress={() => setFilterTab('completed')}
          activeOpacity={0.8}
        >
          <Text style={[styles.tabText, filterTab === 'completed' && styles.tabTextActive]}>
            {lang === 'tl' ? 'Natapos na Drives' : 'Completed Drives'} ({events.filter(e => e.status === 'completed').length})
          </Text>
        </MotionPressable>
      </View>

      {/* Events List */}
      <View style={styles.eventList}>
        {filteredEvents.map(item => {
          const isOngoing = item.status === 'ongoing';
          const progressPercent = Math.round((item.scannedCount / item.totalTarget) * 100);

          return (
            <View key={item.id} style={styles.eventCard}>
              <View style={styles.eventCardHeader}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.eventTitle}>{item.title}</Text>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 4 }}>
                    <MapPinIcon size={12} color="#64748B" />
                    <Text style={styles.eventVenue}>{item.venue}</Text>
                  </View>
                </View>
                <View style={[styles.statusBadge, isOngoing ? styles.statusOngoing : styles.statusCompleted]}>
                  <Text style={[styles.statusBadgeText, isOngoing ? { color: '#D97706' } : { color: '#047857' }]}>
                    {isOngoing ? (lang === 'tl' ? 'KASALUKUYAN' : 'ONGOING') : (lang === 'tl' ? 'NATAPOS NA' : 'COMPLETED')}
                  </Text>
                </View>
              </View>

              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginVertical: 6 }}>
                <PackageIcon size={14} color="#002BB8" />
                <Text style={styles.itemsLabel}>{lang === 'tl' ? 'Alokasyon:' : 'Allocation:'} {item.allocatedItems}</Text>
              </View>

              {/* Progress Bar Container with MotionProgressTrack */}
              <View style={styles.progressRow}>
                <View style={{ flex: 1 }}>
                  <MotionProgressTrack percentage={progressPercent} height={7} color={isOngoing ? '#1557B0' : '#059669'} />
                </View>
                <Text style={styles.progressText}>{item.scannedCount}/{item.totalTarget} ({progressPercent}%)</Text>
              </View>

              {/* Action Button */}
              {isOngoing ? (
                <MotionPressable
                  style={styles.scanActionBtn}
                  onPress={() => onSelectScanEvent && onSelectScanEvent(item)}
                  activeOpacity={0.85}
                >
                  <Text style={styles.scanActionBtnText}>
                    {lang === 'tl' ? 'Buksan ang QR Scanner' : 'Launch QR Scanner'}
                  </Text>
                </MotionPressable>
              ) : (
                <View style={styles.completedInfoRow}>
                  <Text style={styles.completedInfoText}>
                    {lang === 'tl' ? `Natapos noong: ${item.completedTime}` : `Completed: ${item.completedTime}`}
                  </Text>
                  <MotionPressable
                    style={styles.viewAuditBtn}
                    onPress={() => {
                      Alert.alert(
                        lang === 'tl' ? 'Buod ng Distribusyon' : 'Distribution Summary',
                        `${item.title}\n\n📍 Lugar: ${item.venue || item.location}\n📦 Uri ng Ayuda: ${item.itemType}\n✅ Status: Matagumpay na natapos at nai-sync sa LGU Command Center.`
                      );
                    }}
                  >
                    <Text style={styles.viewAuditText}>
                      {lang === 'tl' ? 'Tingnan ang Buod' : 'View Summary'}
                    </Text>
                  </MotionPressable>
                </View>
              )}
            </View>
          );
        })}
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: RESPONSIVE.padding,
    paddingTop: 16,
    paddingBottom: 90,
    maxWidth: RESPONSIVE.maxCardWidth,
    alignSelf: 'center',
    width: '100%',
  },
  header: { marginBottom: 16 },
  badge: {
    fontSize: 10,
    fontWeight: '800',
    color: '#002BB8',
    backgroundColor: '#EDF2F9',
    paddingHorizontal: 10,
    paddingVertical: 3,
    borderRadius: 999,
    alignSelf: 'flex-start',
    marginBottom: 8,
  },
  title: { fontSize: 22, fontWeight: FONT_WEIGHT.black, color: '#0F172A' },
  sub: { fontSize: 13, color: '#475569', marginTop: 4, lineHeight: 18 },
  tabBar: {
    flexDirection: 'row',
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 4,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    marginBottom: 16,
  },
  tabBtn: {
    flex: 1,
    paddingVertical: 10,
    alignItems: 'center',
    borderRadius: 8,
  },
  tabBtnActive: {
    backgroundColor: '#002BB8',
  },
  tabText: { fontSize: 12, color: '#64748B', fontWeight: '700' },
  tabTextActive: { color: '#FFFFFF', fontWeight: '800' },
  eventList: { gap: 14 },
  eventCard: {
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: 16,
    padding: 16,
    shadowColor: '#002BB8',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.06,
    shadowRadius: 12,
    elevation: 3,
  },
  eventCardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', gap: 10, marginBottom: 8 },
  eventTitle: { fontSize: 15, fontWeight: FONT_WEIGHT.bold, color: '#0F172A' },
  eventVenue: { fontSize: 12, color: '#64748B', marginTop: 2 },
  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 999,
    borderWidth: 1,
  },
  statusOngoing: { backgroundColor: '#FEF3C7', borderColor: '#FCD34D' },
  statusCompleted: { backgroundColor: '#ECFDF5', borderColor: '#A7F3D0' },
  statusBadgeText: { fontSize: 10, fontWeight: '800' },
  itemsLabel: { fontSize: 12, color: '#002BB8', fontWeight: '700', marginBottom: 12 },
  progressRow: { flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 14 },
  progressBarBg: { flex: 1, height: 8, backgroundColor: '#E2E8F0', borderRadius: 4, overflow: 'hidden' },
  progressBarFill: { height: '100%', borderRadius: 4 },
  progressText: { fontSize: 11, fontWeight: '800', color: '#0F172A' },
  scanActionBtn: {
    backgroundColor: '#002BB8',
    paddingVertical: 12,
    borderRadius: 10,
    alignItems: 'center',
  },
  scanActionBtnText: { color: '#FFFFFF', fontSize: 13, fontWeight: '800' },
  completedInfoRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingTop: 8, borderTopWidth: 1, borderTopColor: '#F1F5F9' },
  completedInfoText: { fontSize: 11, color: '#64748B' },
  viewAuditBtn: { backgroundColor: '#EDF2F9', paddingHorizontal: 10, paddingVertical: 6, borderRadius: 6 },
  viewAuditText: { color: '#002BB8', fontSize: 11, fontWeight: '700' },
});

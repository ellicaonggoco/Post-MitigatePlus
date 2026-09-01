import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, ActivityIndicator, Alert } from 'react-native';
import { RADIUS, FONT_WEIGHT, SPACING, RESPONSIVE, wp, hp } from '../theme';
import { fetchDistributionEvents } from '../services/api';
import { MapPinIcon, PackageIcon, CheckIcon } from '../components/AppIcons';
import { MotionPressable, MotionProgressTrack } from '../components/motion';
import { API_BASE_URL } from '../config';

export default function StaffTasksScreen({ token, onSelectScanEvent, lang = 'en' }) {
  const [filterTab, setFilterTab] = useState('scheduled'); // 'scheduled' | 'ongoing' | 'completed'
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(false);

  const loadEvents = async () => {
    if (!token) return;
    setLoading(true);
    try {
      const liveEvents = await fetchDistributionEvents(token);
      if (Array.isArray(liveEvents)) {
        setEvents(liveEvents.map((e, idx) => {
          const rawStatus = String(e.status || (e.isActive ? 'ongoing' : e.closedAt ? 'completed' : 'scheduled')).toLowerCase();
          return {
            _id: e._id,
            id: e._id || `evt_live_${idx}`,
            title: e.title,
            venue: e.location || 'Barangay Center',
            location: e.location || 'Barangay Center',
            itemType: e.itemType || 'Family Food Pack',
            status: rawStatus === 'ongoing' ? 'ongoing' : rawStatus === 'completed' ? 'completed' : 'scheduled',
            scannedCount: e.claimedCount || 0,
            totalTarget: e.targetHouseholds || e.targetCount || 150,
            scheduledDate: e.scheduledDate || 'Today',
            scheduledTime: e.scheduledTime || '08:00 AM',
            startTime: new Date(e.createdAt || Date.now()).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
            completedTime: e.completedAt ? new Date(e.completedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : undefined,
            allocatedItems: e.itemType || 'Family Food Pack',
          };
        }));
      }
    } catch (err) {
      console.warn('Events fetch fallback:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadEvents();
  }, [token]);

  const handleStartDistribution = async (item) => {
    Alert.alert(
      lang === 'tl' ? 'Simulan ang Pamamahagi?' : 'Start Distribution Drive?',
      lang === 'tl'
        ? `Ikaw ang Field Team Leader para sa ${item.title}. Simulan na ba ang live relief distribution at buksan ang QR scanner?`
        : `You are the Field Team Leader for ${item.title}. Do you want to start live distribution and launch the QR scanner?`,
      [
        { text: lang === 'tl' ? 'Kanselahin' : 'Cancel', style: 'cancel' },
        {
          text: lang === 'tl' ? 'Oo, Simulan' : 'Yes, Start',
          onPress: async () => {
            try {
              const evId = item._id || item.id;
              await fetch(`${API_BASE_URL}/distributions/events/${evId}`, {
                method: 'PATCH',
                headers: {
                  Authorization: 'Bearer ' + token,
                  'Content-Type': 'application/json',
                },
                body: JSON.stringify({ status: 'Ongoing', isActive: true }),
              });
              setEvents(prev => prev.map(e => (e._id || e.id) === evId ? { ...e, status: 'ongoing' } : e));
              setFilterTab('ongoing');
              if (onSelectScanEvent) {
                onSelectScanEvent({ ...item, status: 'ongoing', isActive: true });
              }
            } catch (err) {
              console.error('Error starting event from mobile:', err);
              if (onSelectScanEvent) onSelectScanEvent(item);
            }
          },
        },
      ]
    );
  };

  const handleCompleteDistribution = async (item) => {
    Alert.alert(
      lang === 'tl' ? 'Tapusin ang Pamamahagi?' : 'Complete Distribution Drive?',
      lang === 'tl'
        ? `Ikaw ang Field Team Leader para sa ${item.title}. Sigurado ka bang tapos na ang lahat ng relief claims para sa araw na ito? I-fi-finalize nito ang distribusyon para sa auditing.`
        : `You are the Field Team Leader for ${item.title}. Are all claims finished for this event? This will finalize the distribution for auditing.`,
      [
        { text: lang === 'tl' ? 'Bumalik' : 'Back', style: 'cancel' },
        {
          text: lang === 'tl' ? 'Oo, Tapusin' : 'Yes, Complete',
          onPress: async () => {
            try {
              const evId = item._id || item.id;
              await fetch(`${API_BASE_URL}/distributions/events/${evId}`, {
                method: 'PATCH',
                headers: {
                  Authorization: 'Bearer ' + token,
                  'Content-Type': 'application/json',
                },
                body: JSON.stringify({ status: 'Completed', isActive: false }),
              });
              setEvents(prev => prev.map(e => (e._id || e.id) === evId ? { ...e, status: 'completed' } : e));
              setFilterTab('completed');
            } catch (err) {
              console.error('Error completing event from mobile:', err);
            }
          },
        },
      ]
    );
  };

  const filteredEvents = events.filter(e => e.status === filterTab);

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <View style={styles.header}>
        <Text style={styles.badge}>{lang === 'tl' ? 'LGU FIELD STAFF TASK MANAGER' : 'LGU FIELD STAFF TASK MANAGER'}</Text>
        <Text style={styles.title}>{lang === 'tl' ? 'Mga Gawain at Pamamahagi sa Field' : 'Field Tasks & Distribution Drives'}</Text>
        <Text style={styles.sub}>
          {lang === 'tl'
            ? 'Ang Field Leader ang may kapangyarihang magpasimula ng relief distribution sa mismong lugar gamit ang mobile app.'
            : 'Field Leaders have the authority to start on-site relief distribution drives using the mobile app.'}
        </Text>
      </View>

      {/* Segmented Filter Tabs: Scheduled, Ongoing, Completed */}
      <View style={styles.tabBar}>
        <MotionPressable
          style={[styles.tabBtn, filterTab === 'scheduled' && styles.tabBtnActive]}
          onPress={() => setFilterTab('scheduled')}
          activeOpacity={0.8}
        >
          <Text style={[styles.tabText, filterTab === 'scheduled' && styles.tabTextActive]}>
            {lang === 'tl' ? 'Nakatakda' : 'Scheduled'} ({events.filter(e => e.status === 'scheduled').length})
          </Text>
        </MotionPressable>

        <MotionPressable
          style={[styles.tabBtn, filterTab === 'ongoing' && styles.tabBtnActive]}
          onPress={() => setFilterTab('ongoing')}
          activeOpacity={0.8}
        >
          <Text style={[styles.tabText, filterTab === 'ongoing' && styles.tabTextActive]}>
            {lang === 'tl' ? 'Kasalukuyan' : 'Ongoing'} ({events.filter(e => e.status === 'ongoing').length})
          </Text>
        </MotionPressable>

        <MotionPressable
          style={[styles.tabBtn, filterTab === 'completed' && styles.tabBtnActive]}
          onPress={() => setFilterTab('completed')}
          activeOpacity={0.8}
        >
          <Text style={[styles.tabText, filterTab === 'completed' && styles.tabTextActive]}>
            {lang === 'tl' ? 'Natapos Na' : 'Completed'} ({events.filter(e => e.status === 'completed').length})
          </Text>
        </MotionPressable>
      </View>

      {/* Events List */}
      <View style={styles.eventList}>
        {filteredEvents.length === 0 ? (
          <View style={{ padding: 24, alignItems: 'center', backgroundColor: '#F8FAFC', borderRadius: 12, borderWidth: 1, borderColor: '#E2E8F0', marginTop: 10 }}>
            <Text style={{ color: '#64748B', fontSize: 13, fontWeight: '600' }}>
              {lang === 'tl' ? 'Walang relief events sa kategoryang ito.' : 'No distribution events in this category.'}
            </Text>
          </View>
        ) : (
          filteredEvents.map(item => {
            const isOngoing = item.status === 'ongoing';
            const isScheduled = item.status === 'scheduled';
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
                  <View style={[styles.statusBadge, isScheduled ? styles.statusScheduled : isOngoing ? styles.statusOngoing : styles.statusCompleted]}>
                    <Text style={[styles.statusBadgeText, isScheduled ? { color: '#1E40AF' } : isOngoing ? { color: '#D97706' } : { color: '#047857' }]}>
                      {isScheduled ? (lang === 'tl' ? 'NAKATAKDA' : 'SCHEDULED') : isOngoing ? (lang === 'tl' ? 'KASALUKUYAN' : 'ONGOING') : (lang === 'tl' ? 'NATAPOS NA' : 'COMPLETED')}
                    </Text>
                  </View>
                </View>

                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginVertical: 6 }}>
                  <PackageIcon size={14} color="#002BB8" />
                  <Text style={styles.itemsLabel}>{lang === 'tl' ? 'Alokasyon:' : 'Allocation:'} {item.allocatedItems}</Text>
                </View>

                {/* Progress Bar Container */}
                {!isScheduled && (
                  <View style={styles.progressRow}>
                    <View style={{ flex: 1 }}>
                      <MotionProgressTrack percentage={progressPercent} height={7} color={isOngoing ? '#1557B0' : '#059669'} />
                    </View>
                    <Text style={styles.progressText}>{item.scannedCount}/{item.totalTarget} ({progressPercent}%)</Text>
                  </View>
                )}

                {/* Action Buttons for Field Staff */}
                {isScheduled ? (
                  <MotionPressable
                    style={styles.startActionBtn}
                    onPress={() => handleStartDistribution(item)}
                    activeOpacity={0.85}
                  >
                    <Text style={styles.startActionBtnText}>
                      {lang === 'tl' ? '▶ Simulan ang Pamamahagi (Leader Action)' : '▶ Start Distribution (Leader Action)'}
                    </Text>
                  </MotionPressable>
                ) : isOngoing ? (
                  <View style={{ gap: 8 }}>
                    <MotionPressable
                      style={styles.scanActionBtn}
                      onPress={() => onSelectScanEvent && onSelectScanEvent(item)}
                      activeOpacity={0.85}
                    >
                      <Text style={styles.scanActionBtnText}>
                        {lang === 'tl' ? 'Buksan ang QR Scanner' : 'Launch QR Scanner'}
                      </Text>
                    </MotionPressable>
                    <MotionPressable
                      style={styles.completeActionBtn}
                      onPress={() => handleCompleteDistribution(item)}
                      activeOpacity={0.85}
                    >
                      <Text style={styles.completeActionBtnText}>
                        {lang === 'tl' ? '✓ Tapusin ang Pamamahagi (Leader Action)' : '✓ Complete Distribution (Leader Action)'}
                      </Text>
                    </MotionPressable>
                  </View>
                ) : (
                  <View style={styles.completedInfoRow}>
                    <Text style={styles.completedInfoText}>
                      {lang === 'tl' ? `Natapos noong: ${item.completedTime || 'Matagumpay'}` : `Completed: ${item.completedTime || 'Success'}`}
                    </Text>
                    <MotionPressable
                      style={styles.viewAuditBtn}
                      onPress={() => {
                        Alert.alert(
                          lang === 'tl' ? 'Buod ng Distribusyon' : 'Distribution Summary',
                          `${item.title}\n\n Lugar: ${item.venue || item.location}\n Uri ng Ayuda: ${item.itemType}\n Status: Matagumpay na natapos at nai-sync sa LGU Command Center.`
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
          })
        )}
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
    backgroundColor: '#F1F5F9',
    borderRadius: RADIUS.md,
    padding: 4,
    marginBottom: 16,
  },
  tabBtn: {
    flex: 1,
    paddingVertical: 8,
    alignItems: 'center',
    borderRadius: RADIUS.sm,
  },
  tabBtnActive: {
    backgroundColor: '#FFFFFF',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  tabText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#64748B',
  },
  tabTextActive: {
    color: '#1557B0',
    fontWeight: '800',
  },
  eventList: {
    gap: 12,
  },
  eventCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: RADIUS.md,
    padding: 16,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  eventCardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 6,
  },
  eventTitle: {
    fontSize: 15,
    fontWeight: '800',
    color: '#0F172A',
  },
  eventVenue: {
    fontSize: 12,
    color: '#64748B',
  },
  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  statusScheduled: {
    backgroundColor: '#DBEAFE',
  },
  statusOngoing: {
    backgroundColor: '#FEF3C7',
  },
  statusCompleted: {
    backgroundColor: '#D1FAE5',
  },
  statusBadgeText: {
    fontSize: 10.5,
    fontWeight: '800',
  },
  itemsLabel: {
    fontSize: 12,
    color: '#334155',
    fontWeight: '600',
  },
  progressRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginTop: 8,
    marginBottom: 12,
  },
  progressText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#64748B',
  },
  startActionBtn: {
    backgroundColor: '#1557B0',
    paddingVertical: 10,
    borderRadius: RADIUS.sm,
    alignItems: 'center',
    marginTop: 6,
  },
  startActionBtnText: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '800',
  },
  scanActionBtn: {
    backgroundColor: '#0F172A',
    paddingVertical: 10,
    borderRadius: RADIUS.sm,
    alignItems: 'center',
    marginTop: 6,
  },
  scanActionBtnText: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '800',
  },
  completeActionBtn: {
    backgroundColor: '#15803D',
    paddingVertical: 10,
    borderRadius: RADIUS.sm,
    alignItems: 'center',
    marginTop: 4,
  },
  completeActionBtnText: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '800',
  },
  completedInfoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 8,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: '#F1F5F9',
  },
  completedInfoText: {
    fontSize: 11.5,
    color: '#64748B',
  },
  viewAuditBtn: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    backgroundColor: '#F1F5F9',
    borderRadius: 4,
  },
  viewAuditText: {
    fontSize: 11,
    color: '#1557B0',
    fontWeight: '700',
  },
});

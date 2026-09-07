import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, ActivityIndicator, Alert, Platform } from 'react-native';
import { fetchDistributionEvents } from '../services/api';
import { MapPinIcon, PackageIcon, CheckIcon, PlayIcon, ListIcon, QrCodeIcon } from '../components/AppIcons';
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
      if (Array.isArray(liveEvents) && liveEvents.length > 0) {
        setEvents(liveEvents.map((e, idx) => {
          const rawStatus = String(e.status || (e.isActive ? 'ongoing' : e.closedAt ? 'completed' : 'scheduled')).toLowerCase();
          return {
            _id: e._id,
            id: e._id || `evt_live_${idx}`,
            title: e.title,
            venue: e.location || 'Barangay Center',
            location: e.location || 'Barangay Center',
            itemType: e.itemType || 'All-in-One Family Food Pack',
            status: rawStatus === 'ongoing' ? 'ongoing' : rawStatus === 'completed' ? 'completed' : 'scheduled',
            scannedCount: e.claimedCount || 0,
            totalTarget: e.targetHouseholds || e.targetCount || 150,
            scheduledDate: e.scheduledDate || 'Today',
            scheduledTime: e.scheduledTime || '08:00 AM',
            startTime: new Date(e.createdAt || Date.now()).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
            completedTime: e.completedAt ? new Date(e.completedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : undefined,
            allocatedItems: e.itemType || 'All-in-One Family Food Pack',
          };
        }));
      } else {
        // Fallback default demonstration events
        setEvents([
          {
            id: 'evt_344',
            title: 'Relief Distribution — 344',
            venue: '344',
            location: '344',
            itemType: 'All-in-One Family Food Pack',
            allocatedItems: 'All-in-One Family Food Pack',
            status: 'scheduled',
            scannedCount: 0,
            totalTarget: 150,
          },
          {
            id: 'evt_222',
            title: 'Relief Distribution — brgy 222',
            venue: 'Brgy 222',
            location: 'Brgy 222',
            itemType: 'Food',
            allocatedItems: 'Food',
            status: 'scheduled',
            scannedCount: 0,
            totalTarget: 120,
          },
          {
            id: 'evt_291',
            title: 'Post-Typhoon Relief Distribution Batch 1',
            venue: 'Barangay 291 Covered Court',
            location: 'Barangay 291 Covered Court',
            itemType: 'Family Food Pack',
            allocatedItems: 'Family Food Pack',
            status: 'scheduled',
            scannedCount: 0,
            totalTarget: 200,
          },
        ]);
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
              if (item._id) {
                await fetch(`${API_BASE_URL}/distributions/events/${evId}`, {
                  method: 'PATCH',
                  headers: {
                    Authorization: 'Bearer ' + token,
                    'Content-Type': 'application/json',
                  },
                  body: JSON.stringify({ status: 'Ongoing', isActive: true }),
                });
              }
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
              if (item._id) {
                await fetch(`${API_BASE_URL}/distributions/events/${evId}`, {
                  method: 'PATCH',
                  headers: {
                    Authorization: 'Bearer ' + token,
                    'Content-Type': 'application/json',
                  },
                  body: JSON.stringify({ status: 'Completed', isActive: false }),
                });
              }
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

  const scheduledCount = events.filter(e => e.status === 'scheduled').length;
  const ongoingCount = events.filter(e => e.status === 'ongoing').length;
  const completedCount = events.filter(e => e.status === 'completed').length;
  const filteredEvents = events.filter(e => e.status === filterTab);

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
      {/* 1. Header Kicker Pill Tag */}
      <View style={styles.taskManagerPill}>
        <ListIcon size={13} color="#1D4ED8" />
        <Text style={styles.taskManagerPillText}>LGU FIELD STAFF TASK MANAGER</Text>
      </View>

      {/* 2. Screen Title & Subtitle */}
      <Text style={styles.pageTitle}>Field Tasks & Distribution Drives</Text>
      <Text style={styles.pageSub}>
        Field Leaders have authority to start on-site relief distribution drives.
      </Text>

      {/* 3. Blue Segmented Filter Container */}
      <View style={styles.segmentedContainer}>
        <TouchableOpacity
          style={[styles.segmentBtn, filterTab === 'scheduled' && styles.segmentBtnActive]}
          onPress={() => setFilterTab('scheduled')}
          activeOpacity={0.8}
        >
          <Text style={[styles.segmentText, filterTab === 'scheduled' && styles.segmentTextActive]}>
            Scheduled ({scheduledCount})
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.segmentBtn, filterTab === 'ongoing' && styles.segmentBtnActive]}
          onPress={() => setFilterTab('ongoing')}
          activeOpacity={0.8}
        >
          <Text style={[styles.segmentText, filterTab === 'ongoing' && styles.segmentTextActive]}>
            Ongoing ({ongoingCount})
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.segmentBtn, filterTab === 'completed' && styles.segmentBtnActive]}
          onPress={() => setFilterTab('completed')}
          activeOpacity={0.8}
        >
          <Text style={[styles.segmentText, filterTab === 'completed' && styles.segmentTextActive]}>
            Completed ({completedCount})
          </Text>
        </TouchableOpacity>
      </View>

      {/* 4. Distribution Events List */}
      <View style={styles.eventList}>
        {loading && events.length === 0 ? (
          <View style={styles.emptyStateCard}>
            <ActivityIndicator color="#1E3A8A" size="small" />
            <Text style={[styles.emptyStateText, { marginTop: 10 }]}>
              {lang === 'tl' ? 'Kinakarga ang mga distribution events...' : 'Loading distribution events...'}
            </Text>
          </View>
        ) : filteredEvents.length === 0 ? (
          <View style={styles.emptyStateCard}>
            <View style={styles.emptyIconWell}>
              <PackageIcon size={24} color="#94A3B8" />
            </View>
            <Text style={styles.emptyStateTitle}>
              {lang === 'tl' ? 'Walang relief events sa kategoryang ito' : 'No distribution events in this category'}
            </Text>
            <Text style={styles.emptyStateText}>
              {lang === 'tl'
                ? 'Ang mga relief drives na itinalaga ng LGU Command Center ay lalabas dito.'
                : 'Relief drives assigned by the LGU Command Center will appear here.'}
            </Text>
          </View>
        ) : (
          filteredEvents.map(item => {
            const isOngoing = item.status === 'ongoing';
            const isScheduled = item.status === 'scheduled';

            return (
              <View key={item.id} style={styles.taskCard}>
                {/* Header Row: Event Title + Status Pill */}
                <View style={styles.cardHeaderRow}>
                  <Text style={styles.cardTitle} numberOfLines={1}>{item.title}</Text>
                  <View style={[
                    styles.statusPill,
                    isScheduled ? styles.statusPillScheduled : isOngoing ? styles.statusPillOngoing : styles.statusPillCompleted
                  ]}>
                    <Text style={[
                      styles.statusPillText,
                      isScheduled ? styles.statusTextScheduled : isOngoing ? styles.statusTextOngoing : styles.statusTextCompleted
                    ]}>
                      {isScheduled ? 'SCHEDULED' : isOngoing ? 'ONGOING' : 'COMPLETED'}
                    </Text>
                  </View>
                </View>

                {/* Location Row */}
                <View style={styles.metaRow}>
                  <MapPinIcon size={14} color="#94A3B8" />
                  <Text style={styles.metaText} numberOfLines={1}>{item.venue || item.location}</Text>
                </View>

                {/* Allocation Row */}
                <View style={[styles.metaRow, { marginBottom: 14 }]}>
                  <PackageIcon size={14} color="#94A3B8" />
                  <Text style={styles.metaText} numberOfLines={1}>
                    Allocation: <Text style={{ color: '#334155', fontWeight: '600' }}>{item.allocatedItems || item.itemType}</Text>
                  </Text>
                </View>

                {/* Royal Blue Action Button */}
                {isScheduled ? (
                  <TouchableOpacity
                    style={styles.royalBlueBtn}
                    onPress={() => handleStartDistribution(item)}
                    activeOpacity={0.85}
                  >
                    <PlayIcon size={13} color="#FFFFFF" />
                    <Text style={styles.royalBlueBtnText}>Start Distribution (Leader Action)</Text>
                  </TouchableOpacity>
                ) : isOngoing ? (
                  <View style={{ gap: 8 }}>
                    <TouchableOpacity
                      style={styles.royalBlueBtn}
                      onPress={() => onSelectScanEvent && onSelectScanEvent(item)}
                      activeOpacity={0.85}
                    >
                      <QrCodeIcon size={15} color="#FFFFFF" />
                      <Text style={styles.royalBlueBtnText}>Open QR Scanner (Leader Action)</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={styles.completeBtn}
                      onPress={() => handleCompleteDistribution(item)}
                      activeOpacity={0.85}
                    >
                      <CheckIcon size={14} color="#059669" />
                      <Text style={styles.completeBtnText}>Finalize & Complete Event</Text>
                    </TouchableOpacity>
                  </View>
                ) : (
                  <View style={styles.completedBanner}>
                    <CheckIcon size={14} color="#059669" />
                    <Text style={styles.completedBannerText}>Distribution Successfully Completed</Text>
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
    flex: 1,
    backgroundColor: '#F3F6FC',
  },
  content: {
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 40,
  },
  // Kicker Pill
  taskManagerPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#EFF6FF',
    borderWidth: 1,
    borderColor: '#DBEAFE',
    borderRadius: 20,
    paddingHorizontal: 12,
    paddingVertical: 5,
    alignSelf: 'flex-start',
    marginBottom: 10,
  },
  taskManagerPillText: {
    fontSize: 11,
    fontWeight: '800',
    color: '#1D4ED8',
    letterSpacing: 0.4,
  },
  // Heading
  pageTitle: {
    fontSize: 22,
    fontWeight: '900',
    color: '#0F172A',
    letterSpacing: -0.4,
    marginBottom: 4,
  },
  pageSub: {
    fontSize: 12.5,
    color: '#64748B',
    lineHeight: 18,
    marginBottom: 16,
  },
  // Segmented Filter
  segmentedContainer: {
    flexDirection: 'row',
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    padding: 4,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    marginBottom: 16,
    ...(Platform.OS === 'web'
      ? { boxShadow: '0 2px 8px rgba(15,23,42,0.04)' }
      : {
          shadowColor: '#0F172A',
          shadowOffset: { width: 0, height: 2 },
          shadowOpacity: 0.04,
          shadowRadius: 6,
          elevation: 2,
        }),
  },
  segmentBtn: {
    flex: 1,
    paddingVertical: 9,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'transparent',
  },
  segmentBtnActive: {
    backgroundColor: '#1E3A8A',
  },
  segmentText: {
    fontSize: 12.5,
    fontWeight: '600',
    color: '#64748B',
  },
  segmentTextActive: {
    color: '#FFFFFF',
    fontWeight: '800',
  },
  // Event Cards
  eventList: {
    gap: 12,
  },
  taskCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    padding: 18,
    marginBottom: 12,
    ...(Platform.OS === 'web'
      ? { boxShadow: '0 4px 16px rgba(11,29,78,0.06)' }
      : {
          shadowColor: '#0B1D4E',
          shadowOffset: { width: 0, height: 4 },
          shadowOpacity: 0.06,
          shadowRadius: 12,
          elevation: 3,
        }),
  },
  cardHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 8,
    marginBottom: 10,
  },
  cardTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: '#0F172A',
    flex: 1,
  },
  statusPill: {
    paddingHorizontal: 9,
    paddingVertical: 4,
    borderRadius: 20,
  },
  statusPillScheduled: {
    backgroundColor: '#EFF6FF',
  },
  statusPillOngoing: {
    backgroundColor: '#FEF3C7',
  },
  statusPillCompleted: {
    backgroundColor: '#ECFDF5',
  },
  statusPillText: {
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 0.4,
  },
  statusTextScheduled: {
    color: '#2563EB',
  },
  statusTextOngoing: {
    color: '#B45309',
  },
  statusTextCompleted: {
    color: '#059669',
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 5,
  },
  metaText: {
    fontSize: 13,
    color: '#64748B',
    flex: 1,
  },
  // Royal Blue Action Button
  royalBlueBtn: {
    backgroundColor: '#1E3A8A',
    borderRadius: 12,
    paddingVertical: 13,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    marginTop: 4,
    ...(Platform.OS === 'web'
      ? { boxShadow: '0 4px 12px rgba(30,58,138,0.25)' }
      : {
          shadowColor: '#1E3A8A',
          shadowOffset: { width: 0, height: 3 },
          shadowOpacity: 0.25,
          shadowRadius: 6,
          elevation: 3,
        }),
  },
  royalBlueBtnText: {
    color: '#FFFFFF',
    fontSize: 13.5,
    fontWeight: '800',
  },
  completeBtn: {
    backgroundColor: '#ECFDF5',
    borderWidth: 1,
    borderColor: '#A7F3D0',
    borderRadius: 12,
    paddingVertical: 10,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
  },
  completeBtnText: {
    color: '#059669',
    fontSize: 12.5,
    fontWeight: '700',
  },
  completedBanner: {
    backgroundColor: '#F8FAFC',
    borderRadius: 10,
    paddingVertical: 10,
    paddingHorizontal: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  completedBannerText: {
    color: '#059669',
    fontSize: 12,
    fontWeight: '700',
  },
  // Empty State
  emptyStateCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    padding: 30,
    alignItems: 'center',
    marginTop: 10,
  },
  emptyIconWell: {
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: '#F1F5F9',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
  },
  emptyStateTitle: {
    fontSize: 15,
    fontWeight: '800',
    color: '#0F172A',
    marginBottom: 4,
    textAlign: 'center',
  },
  emptyStateText: {
    fontSize: 12,
    color: '#64748B',
    textAlign: 'center',
    lineHeight: 18,
  },
});

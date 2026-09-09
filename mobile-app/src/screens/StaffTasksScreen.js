import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, ActivityIndicator, Alert, Platform } from 'react-native';
import { fetchDistributionEvents } from '../services/api';
import { MapPinIcon, PackageIcon, CheckIcon, PlayIcon, ListIcon, QrCodeIcon, TruckIcon, CalendarIcon } from '../components/AppIcons';
import { API_BASE_URL } from '../config';
import { initSocket, onDistributionEventCreated, onDistributionEventUpdated, onStaffAssignmentDispatched } from '../services/socketService';

export default function StaffTasksScreen({ token, user, onSelectScanEvent, onNavigateDeliveries, lang = 'en' }) {
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
            assignedTeam: e.assignedTeam || e.staffAssigned || 'Field Team Alpha',
            barangayCode: e.barangayCode || '291',
            startTime: new Date(e.createdAt || Date.now()).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
            completedTime: e.completedAt ? new Date(e.completedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : undefined,
            allocatedItems: e.itemType || 'All-in-One Family Food Pack',
          };
        }));
      } else {
        // No events available from server — show empty state
        setEvents([]);
      }
    } catch (err) {
      console.warn('Events fetch fallback:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadEvents();
    try {
      initSocket();
      const unsubCreate = onDistributionEventCreated(() => {
        loadEvents();
      });
      const unsubUpdate = onDistributionEventUpdated(() => {
        loadEvents();
      });
      const unsubDispatch = onStaffAssignmentDispatched(() => {
        loadEvents();
      });
      return () => {
        unsubCreate();
        unsubUpdate();
        unsubDispatch();
      };
    } catch (e) {}
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
      {/* 1. Screen Title & Subtitle */}
      <View style={{ marginBottom: 14 }}>
        <Text style={styles.pageTitle}>
          {lang === 'tl' ? 'Mga Gawain at Pamamahagi' : 'Tasks & Distribution Drives'}
        </Text>
        <Text style={styles.pageSub}>
          {lang === 'tl'
            ? 'Pamahalaan ang mga on-site relief distribution drives at door-to-door assignments.'
            : 'Manage on-site relief distribution drives and track ground delivery status.'}
        </Text>
      </View>

      {/* 2. Blue Segmented Filter Container */}
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

                {/* Team Assignment Banner */}
                {(() => {
                  const isMyTeam = (user?.teamName && item.assignedTeam && item.assignedTeam.toLowerCase().includes(user.teamName.toLowerCase())) ||
                    (user?.name && item.assignedTeam && item.assignedTeam.toLowerCase().includes(user.name.toLowerCase()));
                  return (
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 6, marginBottom: 8, flexWrap: 'wrap' }}>
                      <View style={[
                        styles.teamPillBadge,
                        isMyTeam ? styles.myTeamPillActive : styles.otherTeamPill
                      ]}>
                        <TruckIcon size={12} color={isMyTeam ? '#047857' : '#1E40AF'} />
                        <Text style={[
                          styles.teamPillText,
                          isMyTeam ? styles.myTeamPillTextActive : styles.otherTeamPillText
                        ]}>
                          {isMyTeam
                            ? (lang === 'tl' ? `Naka-assign sa Team Mo: ${item.assignedTeam}` : `Assigned to Your Team: ${item.assignedTeam}`)
                            : `Team: ${item.assignedTeam}`}
                        </Text>
                      </View>
                      {item.scheduledDate && (
                        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                          <CalendarIcon size={12} color="#64748B" />
                          <Text style={{ fontSize: 11.5, color: '#64748B', fontWeight: '600' }}>
                            {item.scheduledDate} {item.scheduledTime ? `• ${item.scheduledTime}` : ''}
                          </Text>
                        </View>
                      )}
                    </View>
                  );
                })()}

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
                    <PlayIcon size={14} color="#FFFFFF" />
                    <Text style={styles.royalBlueBtnText}>
                      {lang === 'tl' ? 'Simulan ang Pamamahagi' : 'Start Distribution Drive'}
                    </Text>
                  </TouchableOpacity>
                ) : isOngoing ? (
                  <View style={{ gap: 8 }}>
                    <TouchableOpacity
                      style={styles.royalBlueBtn}
                      onPress={() => onSelectScanEvent && onSelectScanEvent(item)}
                      activeOpacity={0.85}
                    >
                      <QrCodeIcon size={15} color="#FFFFFF" />
                      <Text style={styles.royalBlueBtnText}>
                        {lang === 'tl' ? 'Buksan ang QR Scanner' : 'Open QR Scanner'}
                      </Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={styles.completeBtn}
                      onPress={() => handleCompleteDistribution(item)}
                      activeOpacity={0.85}
                    >
                      <CheckIcon size={14} color="#0D8A5A" />
                      <Text style={styles.completeBtnText}>
                        {lang === 'tl' ? 'Tapusin ang Pamamahagi' : 'Finalize & Complete Event'}
                      </Text>
                    </TouchableOpacity>
                  </View>
                ) : (
                  <View style={styles.completedBanner}>
                    <CheckIcon size={14} color="#0D8A5A" />
                    <Text style={styles.completedBannerText}>
                      {lang === 'tl' ? 'Matagumpay na Naipamahagi' : 'Distribution Successfully Completed'}
                    </Text>
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
    color: '#0B1525',
    letterSpacing: -0.4,
    marginBottom: 4,
  },
  pageSub: {
    fontSize: 12.5,
    color: '#3D5070',
    lineHeight: 18,
  },
  // Segmented Filter
  segmentedContainer: {
    flexDirection: 'row',
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    padding: 4,
    borderWidth: 1,
    borderColor: '#DDE4F0',
    marginBottom: 16,
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
    paddingVertical: 9,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'transparent',
  },
  segmentBtnActive: {
    backgroundColor: '#1C3F94',
  },
  segmentText: {
    fontSize: 12,
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
    borderColor: '#DDE4F0',
    padding: 18,
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
    gap: 8,
    marginBottom: 10,
  },
  cardTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: '#0B1525',
    flex: 1,
  },
  statusPill: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 999,
    borderWidth: 1,
  },
  statusPillScheduled: {
    backgroundColor: '#EDF1FB',
    borderColor: '#D6DEFA',
  },
  statusPillOngoing: {
    backgroundColor: '#FBF5E4',
    borderColor: '#F0DFA0',
  },
  statusPillCompleted: {
    backgroundColor: '#E6F6EF',
    borderColor: 'rgba(13,138,90,0.3)',
  },
  statusPillText: {
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 0.4,
  },
  statusTextScheduled: {
    color: '#1C3F94',
  },
  statusTextOngoing: {
    color: '#B8932A',
  },
  statusTextCompleted: {
    color: '#0D8A5A',
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 5,
  },
  metaText: {
    fontSize: 13,
    color: '#3D5070',
    flex: 1,
  },
  // Royal Blue Action Button
  royalBlueBtn: {
    backgroundColor: '#1C3F94',
    borderRadius: 16,
    paddingVertical: 13,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    marginTop: 4,
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
    fontSize: 13.5,
    fontWeight: '800',
    letterSpacing: 0.2,
  },
  completeBtn: {
    backgroundColor: '#E6F6EF',
    borderWidth: 1,
    borderColor: 'rgba(13,138,90,0.3)',
    borderRadius: 14,
    paddingVertical: 11,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
  },
  completeBtnText: {
    color: '#0D8A5A',
    fontSize: 12.5,
    fontWeight: '700',
  },
  completedBanner: {
    backgroundColor: '#E6F6EF',
    borderRadius: 12,
    paddingVertical: 10,
    paddingHorizontal: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    borderWidth: 1,
    borderColor: 'rgba(13,138,90,0.25)',
  },
  completedBannerText: {
    color: '#0D8A5A',
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
  operationsToggleRow: {
    flexDirection: 'row',
    backgroundColor: '#EFF6FF',
    borderRadius: 14,
    padding: 4,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#BFDBFE',
    gap: 6,
  },
  operationsToggleBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 10,
    borderRadius: 10,
  },
  operationsToggleBtnActive: {
    backgroundColor: '#1E3A8A',
    shadowColor: '#1E3A8A',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 4,
    elevation: 2,
  },
  operationsToggleText: {
    fontSize: 12,
    fontWeight: '800',
    color: '#1E3A8A',
  },
  operationsToggleTextActive: {
    color: '#FFFFFF',
  },
  teamPillBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 8,
    paddingVertical: 3.5,
    borderRadius: 6,
    borderWidth: 1,
  },
  myTeamPillActive: {
    backgroundColor: '#ECFDF5',
    borderColor: '#A7F3D0',
  },
  otherTeamPill: {
    backgroundColor: '#EFF6FF',
    borderColor: '#BFDBFE',
  },
  teamPillText: {
    fontSize: 11.5,
    fontWeight: '700',
  },
  myTeamPillTextActive: {
    color: '#065F46',
    fontWeight: '800',
  },
  otherTeamPillText: {
    color: '#1E40AF',
  },
});

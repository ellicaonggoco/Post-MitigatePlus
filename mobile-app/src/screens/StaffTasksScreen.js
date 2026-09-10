import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, ActivityIndicator, Alert, Platform } from 'react-native';
import { fetchDistributionEvents } from '../services/api';
import { MapPinIcon, PackageIcon, CheckIcon, PlayIcon, ListIcon, QrCodeIcon, TruckIcon, CalendarIcon, LockIcon, ClockIcon } from '../components/AppIcons';
import { API_BASE_URL } from '../config';
import { initSocket, onDistributionEventCreated, onDistributionEventUpdated, onStaffAssignmentDispatched } from '../services/socketService';

export default function StaffTasksScreen({ token, user, onSelectScanEvent, onNavigateDeliveries, lang = 'en' }) {
  const [filterTab, setFilterTab] = useState('scheduled'); // 'scheduled' | 'ongoing' | 'completed'
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(false);
  const [actionLoadingId, setActionLoadingId] = useState(null);

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
            assignedTeam: e.assignedTeam || e.staffAssigned || 'Field Team Bravo',
            barangayCode: e.barangayCode || '291',
            startTime: e.openedAt ? new Date(e.openedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : new Date(e.createdAt || Date.now()).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
            openedAt: e.openedAt || null,
            completedTime: (e.completedAt || e.closedAt) ? new Date(e.completedAt || e.closedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : undefined,
            completedAt: e.completedAt || e.closedAt || null,
            allocatedItems: e.itemType || 'All-in-One Family Food Pack',
          };
        }));
      } else {
        // No events available from server: show empty state
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

  const checkStaffPermission = (assignedTeam) => {
    const isTeamLeader =
      user?.staffDesignation === 'team_leader' ||
      user?.isLeader === true ||
      user?.isTeamLeader === true ||
      user?.role === 'lgu_admin' ||
      user?.role === 'lgu_superadmin' ||
      (user?.name && user.name.toLowerCase().includes('leader'));

    const userTeam = (user?.teamName || '').toLowerCase().trim();
    const eventTeam = (assignedTeam || '').toLowerCase().trim();
    const isMyTeam = !eventTeam || !userTeam || eventTeam.includes(userTeam) || userTeam.includes(eventTeam);

    const canStart = isTeamLeader && isMyTeam;
    return { isTeamLeader, isMyTeam, canStart };
  };

  const handleStartDistribution = async (item) => {
    const perm = checkStaffPermission(item.assignedTeam);
    if (!perm.canStart) {
      Alert.alert(
        lang === 'tl' ? 'Pahintulot ng Team Leader' : 'Team Leader Required',
        lang === 'tl'
          ? `Tanging ang Team Leader lamang ng ${item.assignedTeam || 'team'} ang may pahintulot na magsimula ng distribusyon.`
          : `Only the designated Team Leader of ${item.assignedTeam || 'the team'} can start this relief distribution.`
      );
      return;
    }

    Alert.alert(
      lang === 'tl' ? 'Simulan ang Pamamahagi?' : 'Start Distribution Drive?',
      lang === 'tl'
        ? `Ikaw ang Team Leader para sa ${item.title}. Simulan na ba ang live relief distribution at i-update ang status sa ONGOING sa central web admin?`
        : `You are the Team Leader for ${item.title}. Start live relief distribution and update the central web admin status to ONGOING?`,
      [
        { text: lang === 'tl' ? 'Kanselahin' : 'Cancel', style: 'cancel' },
        {
          text: lang === 'tl' ? 'Oo, Simulan' : 'Yes, Start',
          onPress: async () => {
            const evId = item._id || item.id;
            const nowIso = new Date().toISOString();
            const nowTimeStr = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
            setActionLoadingId(evId);
            try {
              if (item._id) {
                await fetch(`${API_BASE_URL}/distributions/events/${evId}`, {
                  method: 'PATCH',
                  headers: {
                    Authorization: 'Bearer ' + token,
                    'Content-Type': 'application/json',
                  },
                  body: JSON.stringify({
                    status: 'Ongoing',
                    isActive: true,
                    openedAt: nowIso,
                  }),
                });
              }
            } catch (err) {
              console.error('Error starting event from mobile:', err);
            } finally {
              setActionLoadingId(null);
            }
            setEvents(prev => prev.map(e => (e._id || e.id) === evId ? {
              ...e,
              status: 'ongoing',
              isActive: true,
              openedAt: nowIso,
              startTime: nowTimeStr,
            } : e));
            setFilterTab('ongoing');
          },
        },
      ]
    );
  };

  const handleCompleteDistribution = async (item) => {
    const isTeamLeader =
      user?.staffDesignation === 'team_leader' ||
      user?.isLeader === true ||
      user?.isTeamLeader === true ||
      user?.role === 'lgu_admin' ||
      user?.role === 'lgu_superadmin' ||
      (user?.name && user.name.toLowerCase().includes('leader'));

    if (!isTeamLeader) {
      Alert.alert(
        lang === 'tl' ? 'Pahintulot ng Team Leader' : 'Team Leader Required',
        lang === 'tl'
          ? 'Tanging ang Team Leader lamang ang may pahintulot na mag-finalize at kumpletuhin ang distribution drive.'
          : 'Only the designated Team Leader can finalize and complete this distribution drive.'
      );
      return;
    }

    const nowTimeStr = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    Alert.alert(
      lang === 'tl' ? 'Tapusin ang Pamamahagi?' : 'Complete Distribution Drive?',
      lang === 'tl'
        ? `Ikaw ang Team Leader para sa ${item.title}. I-finalize na ba ang relief drive na ito sa ganap na ${nowTimeStr}? Itatala ang eksaktong timestamp na ito sa central web admin audit log.`
        : `You are the Team Leader for ${item.title}. Finalize this distribution drive at ${nowTimeStr}? This exact timestamp will be recorded in the central web admin audit log.`,
      [
        { text: lang === 'tl' ? 'Bumalik' : 'Back', style: 'cancel' },
        {
          text: lang === 'tl' ? 'Oo, Tapusin' : 'Yes, Complete',
          onPress: async () => {
            const evId = item._id || item.id;
            const nowIso = new Date().toISOString();
            setActionLoadingId(evId);
            try {
              if (item._id) {
                await fetch(`${API_BASE_URL}/distributions/events/${evId}`, {
                  method: 'PATCH',
                  headers: {
                    Authorization: 'Bearer ' + token,
                    'Content-Type': 'application/json',
                  },
                  body: JSON.stringify({
                    status: 'Completed',
                    isActive: false,
                    completedAt: nowIso,
                    closedAt: nowIso,
                  }),
                });
              }
            } catch (err) {
              console.error('Error completing event from mobile:', err);
            } finally {
              setActionLoadingId(null);
            }
            setEvents(prev => prev.map(e => (e._id || e.id) === evId ? {
              ...e,
              status: 'completed',
              isActive: false,
              completedAt: nowIso,
              completedTime: nowTimeStr,
            } : e));
            setFilterTab('completed');
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

      {/* 3. Distribution Events List */}
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
            const perm = checkStaffPermission(item.assignedTeam);
            const isItemLoading = actionLoadingId === (item._id || item.id);

            return (
              <View key={item.id || item._id} style={styles.taskCard}>
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
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 6, marginBottom: 8, flexWrap: 'wrap' }}>
                  <View style={[
                    styles.teamPillBadge,
                    perm.isMyTeam ? styles.myTeamPillActive : styles.otherTeamPill
                  ]}>
                    <TruckIcon size={12} color={perm.isMyTeam ? '#047857' : '#1E40AF'} />
                    <Text style={[
                      styles.teamPillText,
                      perm.isMyTeam ? styles.myTeamPillTextActive : styles.otherTeamPillText
                    ]}>
                      {perm.isMyTeam
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

                {/* Action Buttons Section */}
                {isScheduled ? (
                  perm.canStart ? (
                    <TouchableOpacity
                      style={styles.royalBlueBtn}
                      onPress={() => handleStartDistribution(item)}
                      disabled={isItemLoading}
                      activeOpacity={0.85}
                    >
                      {isItemLoading ? (
                        <ActivityIndicator size="small" color="#FFFFFF" />
                      ) : (
                        <>
                          <PlayIcon size={14} color="#FFFFFF" />
                          <Text style={styles.royalBlueBtnText}>
                            {lang === 'tl' ? 'Simulan ang Pamamahagi' : 'Start Distribution Drive'}
                          </Text>
                        </>
                      )}
                    </TouchableOpacity>
                  ) : (
                    <View style={{ gap: 6 }}>
                      <TouchableOpacity
                        style={styles.disabledStartBtn}
                        disabled={true}
                        activeOpacity={1}
                      >
                        <LockIcon size={14} color="#94A3B8" />
                        <Text style={styles.disabledStartBtnText}>
                          {lang === 'tl' ? 'Team Leader Lamang ang Makakabukas' : 'Only Team Leader Can Start'}
                        </Text>
                      </TouchableOpacity>
                      <Text style={styles.disabledLeaderHelperText}>
                        {lang === 'tl'
                          ? (!perm.isTeamLeader
                              ? `Tanging ang itinalagang Team Leader ng ${item.assignedTeam || 'team'} ang may pahintulot magsimula.`
                              : `Ang distribusyong ito ay nakatalaga para sa ${item.assignedTeam}.`)
                          : (!perm.isTeamLeader
                              ? `Only the designated Team Leader of ${item.assignedTeam || 'this team'} can start this drive.`
                              : `This distribution drive is assigned to ${item.assignedTeam}.`)}
                      </Text>
                    </View>
                  )
                ) : isOngoing ? (
                  <View style={{ gap: 8 }}>
                    {/* Ongoing Timestamp Badge */}
                    <View style={styles.ongoingTimeBadge}>
                      <ClockIcon size={13} color="#1D4ED8" />
                      <Text style={styles.ongoingTimeText}>
                        {lang === 'tl'
                          ? `Nagsimula: ${item.startTime || 'Kasalukuyang Aktibo'}`
                          : `Started: ${item.startTime || 'In Progress'}`}
                      </Text>
                    </View>

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

                    {perm.isTeamLeader ? (
                      <TouchableOpacity
                        style={styles.completeBtn}
                        onPress={() => handleCompleteDistribution(item)}
                        disabled={isItemLoading}
                        activeOpacity={0.85}
                      >
                        {isItemLoading ? (
                          <ActivityIndicator size="small" color="#0D8A5A" />
                        ) : (
                          <>
                            <CheckIcon size={14} color="#0D8A5A" />
                            <Text style={styles.completeBtnText}>
                              {lang === 'tl'
                                ? 'Tapusin ang Pamamahagi (May Timestamp)'
                                : 'Finalize & Complete Event (Logs Timestamp)'}
                            </Text>
                          </>
                        )}
                      </TouchableOpacity>
                    ) : (
                      <View style={styles.leaderNoticeBox}>
                        <Text style={styles.leaderNoticeText}>
                          {lang === 'tl'
                            ? `Tanging ang Team Leader ng ${item.assignedTeam} ang makakapag-finalize ng event na ito.`
                            : `Only the Team Leader of ${item.assignedTeam} can finalize and complete this event.`}
                        </Text>
                      </View>
                    )}
                  </View>
                ) : (
                  <View style={{ gap: 6 }}>
                    <View style={styles.completedBanner}>
                      <CheckIcon size={14} color="#0D8A5A" />
                      <Text style={styles.completedBannerText}>
                        {lang === 'tl' ? 'Matagumpay na Naipamahagi' : 'Distribution Successfully Completed'}
                      </Text>
                    </View>
                    {item.completedTime && (
                      <View style={styles.completedTimeRow}>
                        <ClockIcon size={12} color="#059669" />
                        <Text style={styles.completedTimeText}>
                          {lang === 'tl'
                            ? `Natapos: ${item.completedTime} • Naka-record sa Central Web Database`
                            : `Completed: ${item.completedTime} • Recorded to Central Web Database`}
                        </Text>
                      </View>
                    )}
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
  disabledStartBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: '#E2E8F0',
    borderWidth: 1,
    borderColor: '#CBD5E1',
    paddingVertical: 13,
    borderRadius: 14,
    marginTop: 4,
  },
  disabledStartBtnText: {
    color: '#94A3B8',
    fontSize: 13,
    fontWeight: '800',
    letterSpacing: -0.2,
  },
  disabledLeaderHelperText: {
    fontSize: 11,
    color: '#94A3B8',
    fontWeight: '600',
    textAlign: 'center',
    paddingHorizontal: 8,
    lineHeight: 15,
  },
  ongoingTimeBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#EFF6FF',
    borderWidth: 1,
    borderColor: '#BFDBFE',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
    alignSelf: 'flex-start',
  },
  ongoingTimeText: {
    fontSize: 11.5,
    fontWeight: '700',
    color: '#1E40AF',
  },
  completeBtn: {
    backgroundColor: '#E6F6EF',
    borderWidth: 1.5,
    borderColor: 'rgba(13,138,90,0.35)',
    borderRadius: 14,
    paddingVertical: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
  },
  completeBtnText: {
    color: '#0D8A5A',
    fontSize: 12.5,
    fontWeight: '800',
  },
  leaderNoticeBox: {
    backgroundColor: '#F8FAFC',
    borderRadius: 10,
    paddingVertical: 8,
    paddingHorizontal: 10,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  leaderNoticeText: {
    fontSize: 11,
    color: '#64748B',
    textAlign: 'center',
    fontWeight: '500',
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
  completedTimeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 5,
    marginTop: 2,
  },
  completedTimeText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#059669',
  },
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

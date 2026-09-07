import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, ActivityIndicator, Alert, Image, Platform } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { RADIUS, FONT_WEIGHT, SPACING, SHADOWS, RESPONSIVE } from '../theme';
import { fetchDistributionEvents } from '../services/api';
import { MapPinIcon, PackageIcon, CheckIcon, PlayIcon, QrCodeIcon } from '../components/AppIcons';
import { MotionPressable } from '../components/motion';
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

  const scheduledCount = events.filter(e => e.status === 'scheduled').length;
  const ongoingCount = events.filter(e => e.status === 'ongoing').length;
  const completedCount = events.filter(e => e.status === 'completed').length;
  const filteredEvents = events.filter(e => e.status === filterTab);

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
      {/* 1. Hero Mission Dispatch Card (Parity with Resident SingPass Hero Card) */}
      <LinearGradient
        colors={['#0B1D4E', '#163B8C', '#234AAA']}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.heroCard}
      >
        <View style={styles.heroGoldTop} />

        <View style={styles.heroHeaderRow}>
          <View style={styles.heroSealCircle}>
            <Image
              source={require('../../assets/logo-mark.png')}
              style={{ width: 22, height: 22 }}
              resizeMode="contain"
            />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={styles.heroKicker}>
              {lang === 'tl' ? 'OPISYAL NA FIELD OPERATIONS DISPATCH' : 'OFFICIAL FIELD OPERATIONS DISPATCH'}
            </Text>
            <Text style={styles.heroTitle}>
              {lang === 'tl' ? 'Pamamahagi at Gawain' : 'Distribution Drives'}
            </Text>
            <Text style={styles.heroSub} numberOfLines={1}>
              {lang === 'tl' ? 'Pamahalaang Lungsod ng Maynila · MDRRMO' : 'City Government of Manila · MDRRMO'}
            </Text>
          </View>
          <View style={styles.liveDispatchBadge}>
            <View style={styles.liveDotPulse} />
            <Text style={styles.liveDispatchText}>LIVE</Text>
          </View>
        </View>

        {/* 3-Column Translucent Glass Metrics Grid */}
        <View style={styles.heroMetricsGrid}>
          <View style={styles.metricCardGlass}>
            <Text style={styles.metricLabelGlass}>{lang === 'tl' ? 'NAKATAKDA' : 'SCHEDULED'}</Text>
            <Text style={styles.metricValWhite}>{scheduledCount}</Text>
            <Text style={styles.metricSubGlass}>{lang === 'tl' ? 'Mga Drive' : 'Drives'}</Text>
          </View>
          <View style={styles.metricCardGlass}>
            <Text style={styles.metricLabelGlass}>{lang === 'tl' ? 'KASALUKUYAN' : 'ONGOING'}</Text>
            <Text style={[styles.metricValWhite, { color: '#FCD34D' }]}>{ongoingCount}</Text>
            <Text style={[styles.metricSubGlass, { color: '#FDE68A' }]}>{lang === 'tl' ? 'Aktibo' : 'Active'}</Text>
          </View>
          <View style={styles.metricCardGlass}>
            <Text style={styles.metricLabelGlass}>{lang === 'tl' ? 'NATAPOS' : 'COMPLETED'}</Text>
            <Text style={[styles.metricValWhite, { color: '#93C5FD' }]}>{completedCount}</Text>
            <Text style={[styles.metricSubGlass, { color: '#BFDBFE' }]}>{lang === 'tl' ? 'Nai-sync' : 'Synced'}</Text>
          </View>
        </View>
      </LinearGradient>

      {/* 2. Claymorphic Segmented Filter Tabs */}
      <View style={styles.tabBar}>
        {[
          { key: 'scheduled', label: lang === 'tl' ? 'Nakatakda' : 'Scheduled', count: scheduledCount },
          { key: 'ongoing', label: lang === 'tl' ? 'Kasalukuyan' : 'Ongoing', count: ongoingCount },
          { key: 'completed', label: lang === 'tl' ? 'Natapos Na' : 'Completed', count: completedCount },
        ].map(t => {
          const isActive = filterTab === t.key;
          return (
            <TouchableOpacity
              key={t.key}
              style={[styles.tabBtn, isActive && styles.tabBtnActive]}
              onPress={() => setFilterTab(t.key)}
              activeOpacity={0.8}
            >
              <Text style={[styles.tabText, isActive && styles.tabTextActive]}>
                {t.label}
              </Text>
              <View style={[styles.tabCountPill, isActive && styles.tabCountPillActive]}>
                <Text style={[styles.tabCountText, isActive && styles.tabCountTextActive]}>
                  {t.count}
                </Text>
              </View>
            </TouchableOpacity>
          );
        })}
      </View>

      {/* 3. Distribution Events List with Claymorphic Cards */}
      <View style={styles.eventList}>
        {loading && events.length === 0 ? (
          <View style={styles.emptyStateCard}>
            <ActivityIndicator color="#C8102E" size="small" />
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
            const progressPercent = item.totalTarget > 0 ? Math.round((item.scannedCount / item.totalTarget) * 100) : 0;

            return (
              <View key={item.id} style={styles.eventCard}>
                {/* Top Status Accent Stripe */}
                <View style={[
                  styles.cardAccentStripe,
                  isScheduled ? styles.stripeGold : isOngoing ? styles.stripeCrimson : styles.stripeEmerald
                ]} />

                <View style={styles.eventCardHeader}>
                  <View style={[
                    styles.eventIconWell,
                    isOngoing ? styles.wellCrimson : isScheduled ? styles.wellGold : styles.wellEmerald
                  ]}>
                    <PackageIcon size={20} color={isOngoing ? '#C8102E' : isScheduled ? '#C9A84C' : '#059669'} />
                  </View>
                  <View style={{ flex: 1, marginLeft: 12 }}>
                    <Text style={styles.eventTitle}>{item.title}</Text>
                    <View style={styles.venueRow}>
                      <MapPinIcon size={12} color="#64748B" />
                      <Text style={styles.eventVenue} numberOfLines={1}>{item.venue || item.location} · Manila</Text>
                    </View>
                  </View>
                  <View style={[
                    styles.statusBadge,
                    isScheduled ? styles.statusScheduled : isOngoing ? styles.statusOngoing : styles.statusCompleted
                  ]}>
                    <View style={[
                      styles.statusDot,
                      isScheduled ? { backgroundColor: '#3B82F6' } : isOngoing ? { backgroundColor: '#D97706' } : { backgroundColor: '#10B981' }
                    ]} />
                    <Text style={[
                      styles.statusBadgeText,
                      isScheduled ? { color: '#1E40AF' } : isOngoing ? { color: '#B45309' } : { color: '#047857' }
                    ]}>
                      {isScheduled ? (lang === 'tl' ? 'NAKATAKDA' : 'SCHEDULED') : isOngoing ? (lang === 'tl' ? 'AKTIBO' : 'ONGOING') : (lang === 'tl' ? 'TAPOS NA' : 'COMPLETED')}
                    </Text>
                  </View>
                </View>

                {/* Allocation Box in Soft Well */}
                <View style={styles.allocationWell}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 7, flex: 1 }}>
                      <PackageIcon size={15} color="#C8102E" />
                      <Text style={styles.allocationText} numberOfLines={1}>
                        {lang === 'tl' ? 'Alokasyon' : 'Item'}: <Text style={{ fontWeight: '800', color: '#0F172A' }}>{item.allocatedItems}</Text>
                      </Text>
                    </View>
                    <View style={styles.quotaPill}>
                      <Text style={styles.quotaPillText}>{item.totalTarget} {lang === 'tl' ? 'pamilya' : 'families'}</Text>
                    </View>
                  </View>

                  {/* Progress Row for ongoing / completed */}
                  {!isScheduled && (
                    <View style={{ marginTop: 10 }}>
                      <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 5 }}>
                        <Text style={styles.progressLabel}>
                          {lang === 'tl' ? 'Naipamahaging Ayuda' : 'Distributed Relief'}
                        </Text>
                        <Text style={styles.progressValue}>
                          {item.scannedCount}/{item.totalTarget} ({progressPercent}%)
                        </Text>
                      </View>
                      <View style={styles.progressTrackShell}>
                        <LinearGradient
                          colors={isOngoing ? ['#8B0A20', '#C8102E'] : ['#059669', '#10B981']}
                          start={{ x: 0, y: 0 }}
                          end={{ x: 1, y: 0 }}
                          style={[styles.progressTrackFill, { width: `${Math.min(100, progressPercent)}%` }]}
                        />
                      </View>
                    </View>
                  )}
                </View>

                {/* Action Buttons */}
                {isScheduled ? (
                  <TouchableOpacity
                    style={styles.actionBtnWrapper}
                    onPress={() => handleStartDistribution(item)}
                    activeOpacity={0.88}
                  >
                    <LinearGradient
                      colors={['#8B0A20', '#C8102E']}
                      start={{ x: 0, y: 0 }}
                      end={{ x: 1, y: 0 }}
                      style={styles.actionBtnGradient}
                    >
                      <PlayIcon size={14} color="#FFFFFF" />
                      <Text style={styles.actionBtnGradientText}>
                        {lang === 'tl' ? 'Simulan ang Pamamahagi (Leader Action)' : 'Start Distribution (Leader Action)'}
                      </Text>
                    </LinearGradient>
                  </TouchableOpacity>
                ) : isOngoing ? (
                  <View style={{ gap: 8 }}>
                    <TouchableOpacity
                      style={styles.actionBtnWrapper}
                      onPress={() => onSelectScanEvent && onSelectScanEvent(item)}
                      activeOpacity={0.88}
                    >
                      <LinearGradient
                        colors={['#5A0515', '#8B0A20', '#C8102E']}
                        start={{ x: 0, y: 0 }}
                        end={{ x: 1, y: 0 }}
                        style={styles.actionBtnGradient}
                      >
                        <QrCodeIcon size={15} color="#FFFFFF" />
                        <Text style={styles.actionBtnGradientText}>
                          {lang === 'tl' ? 'Buksan ang QR Scanner' : 'Launch QR Scanner'}
                        </Text>
                      </LinearGradient>
                    </TouchableOpacity>

                    <TouchableOpacity
                      style={styles.actionBtnWrapper}
                      onPress={() => handleCompleteDistribution(item)}
                      activeOpacity={0.88}
                    >
                      <LinearGradient
                        colors={['#047857', '#059669']}
                        start={{ x: 0, y: 0 }}
                        end={{ x: 1, y: 0 }}
                        style={styles.actionBtnGradient}
                      >
                        <CheckIcon size={15} color="#FFFFFF" />
                        <Text style={styles.actionBtnGradientText}>
                          {lang === 'tl' ? 'Tapusin ang Pamamahagi (Leader Action)' : 'Complete Distribution (Leader Action)'}
                        </Text>
                      </LinearGradient>
                    </TouchableOpacity>
                  </View>
                ) : (
                  <View style={styles.completedInfoRow}>
                    <Text style={styles.completedInfoText}>
                      {lang === 'tl' ? `Natapos: ${item.completedTime || 'Matagumpay'}` : `Completed: ${item.completedTime || 'Success'}`}
                    </Text>
                    <TouchableOpacity
                      style={styles.viewAuditBtn}
                      onPress={() => {
                        Alert.alert(
                          lang === 'tl' ? 'Buod ng Distribusyon' : 'Distribution Summary',
                          `${item.title}\n\nLugar: ${item.venue || item.location}\nUri ng Ayuda: ${item.itemType}\nStatus: Matagumpay na natapos at nai-sync sa LGU Command Center.`
                        );
                      }}
                      activeOpacity={0.7}
                    >
                      <Text style={styles.viewAuditText}>
                        {lang === 'tl' ? 'Tingnan ang Buod' : 'View Summary'}
                      </Text>
                    </TouchableOpacity>
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
    backgroundColor: '#F8FAFC',
  },
  content: {
    paddingHorizontal: RESPONSIVE.padding,
    paddingTop: 14,
    paddingBottom: 100,
    maxWidth: RESPONSIVE.maxCardWidth,
    alignSelf: 'center',
    width: '100%',
  },
  // 1. Hero Mission Dispatch Card (Parity with SingPass QR Hero Card)
  heroCard: {
    borderRadius: 22,
    padding: 18,
    marginBottom: 16,
    overflow: 'hidden',
    position: 'relative',
    ...(Platform.OS === 'web'
      ? { boxShadow: '0 8px 24px rgba(11, 29, 78, 0.22), 0 2px 6px rgba(11, 29, 78, 0.12)' }
      : {
          shadowColor: '#0B1D4E',
          shadowOffset: { width: 0, height: 6 },
          shadowOpacity: 0.25,
          shadowRadius: 14,
          elevation: 6,
        }),
  },
  heroGoldTop: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: 3,
    backgroundColor: '#C9A84C',
  },
  heroHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  heroSealCircle: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255, 255, 255, 0.12)',
    borderWidth: 1.5,
    borderColor: '#C9A84C',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  heroKicker: {
    fontSize: 9.5,
    fontWeight: '800',
    color: '#C9A84C',
    letterSpacing: 0.6,
  },
  heroTitle: {
    fontSize: 16,
    fontWeight: '900',
    color: '#FFFFFF',
    marginTop: 1,
  },
  heroSub: {
    fontSize: 11,
    color: 'rgba(255, 255, 255, 0.75)',
    marginTop: 1,
  },
  liveDispatchBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: 'rgba(16, 185, 129, 0.2)',
    borderWidth: 1,
    borderColor: '#10B981',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 999,
  },
  liveDotPulse: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#10B981',
  },
  liveDispatchText: {
    color: '#A7F3D0',
    fontSize: 9.5,
    fontWeight: '900',
    letterSpacing: 0.5,
  },
  heroMetricsGrid: {
    flexDirection: 'row',
    gap: 8,
  },
  metricCardGlass: {
    flex: 1,
    backgroundColor: 'rgba(255, 255, 255, 0.09)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.15)',
    borderRadius: 14,
    paddingVertical: 10,
    paddingHorizontal: 8,
    alignItems: 'center',
  },
  metricLabelGlass: {
    fontSize: 9,
    fontWeight: '800',
    color: 'rgba(255, 255, 255, 0.7)',
    letterSpacing: 0.4,
  },
  metricValWhite: {
    fontSize: 18,
    fontWeight: '900',
    color: '#FFFFFF',
    marginVertical: 1,
  },
  metricSubGlass: {
    fontSize: 9.5,
    color: 'rgba(255, 255, 255, 0.65)',
    fontWeight: '600',
  },
  // 2. Claymorphic Segmented Filter Tabs
  tabBar: {
    flexDirection: 'row',
    backgroundColor: '#F1F5F9',
    borderRadius: 16,
    padding: 4,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    marginBottom: 16,
  },
  tabBtn: {
    flex: 1,
    paddingVertical: 8,
    paddingHorizontal: 6,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    borderRadius: 12,
  },
  tabBtnActive: {
    backgroundColor: '#FFFFFF',
    ...(Platform.OS === 'web'
      ? { boxShadow: '0 2px 8px rgba(11, 29, 78, 0.08)' }
      : {
          shadowColor: '#0B1D4E',
          shadowOffset: { width: 0, height: 2 },
          shadowOpacity: 0.08,
          shadowRadius: 6,
          elevation: 2,
        }),
  },
  tabText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#64748B',
  },
  tabTextActive: {
    color: '#C8102E',
    fontWeight: '800',
  },
  tabCountPill: {
    backgroundColor: '#E2E8F0',
    paddingHorizontal: 6,
    paddingVertical: 1,
    borderRadius: 999,
  },
  tabCountPillActive: {
    backgroundColor: '#FEF0F2',
  },
  tabCountText: {
    fontSize: 10,
    fontWeight: '700',
    color: '#64748B',
  },
  tabCountTextActive: {
    color: '#C8102E',
    fontWeight: '800',
  },
  // 3. Distribution Drive Cards (Claymorphic Elevated Cards)
  eventList: {
    gap: 14,
  },
  eventCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 22,
    padding: 18,
    borderWidth: 1,
    borderColor: 'rgba(226, 232, 240, 0.9)',
    position: 'relative',
    overflow: 'hidden',
    ...(Platform.OS === 'web'
      ? { boxShadow: '0 8px 24px rgba(11, 29, 78, 0.06), 0 2px 6px rgba(11, 29, 78, 0.03)' }
      : {
          shadowColor: '#0B1D4E',
          shadowOffset: { width: 0, height: 4 },
          shadowOpacity: 0.06,
          shadowRadius: 10,
          elevation: 3,
        }),
  },
  cardAccentStripe: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: 3.5,
  },
  stripeGold: {
    backgroundColor: '#C9A84C',
  },
  stripeCrimson: {
    backgroundColor: '#C8102E',
  },
  stripeEmerald: {
    backgroundColor: '#10B981',
  },
  eventCardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 10,
  },
  eventIconWell: {
    width: 44,
    height: 44,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
  },
  wellCrimson: {
    backgroundColor: '#FEF0F2',
    borderColor: '#FECDD3',
  },
  wellGold: {
    backgroundColor: '#FFFBEB',
    borderColor: '#FDE68A',
  },
  wellEmerald: {
    backgroundColor: '#ECFDF5',
    borderColor: '#A7F3D0',
  },
  eventTitle: {
    fontSize: 15.5,
    fontWeight: '800',
    color: '#0F172A',
  },
  venueRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: 3,
  },
  eventVenue: {
    fontSize: 12,
    color: '#64748B',
    fontWeight: '500',
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 999,
    borderWidth: 1,
  },
  statusDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  statusScheduled: {
    backgroundColor: '#EFF6FF',
    borderColor: '#BFDBFE',
  },
  statusOngoing: {
    backgroundColor: '#FEF3C7',
    borderColor: '#FCD34D',
  },
  statusCompleted: {
    backgroundColor: '#ECFDF5',
    borderColor: '#A7F3D0',
  },
  statusBadgeText: {
    fontSize: 10,
    fontWeight: '800',
  },
  allocationWell: {
    backgroundColor: '#F8FAFC',
    borderRadius: 14,
    padding: 12,
    borderWidth: 1,
    borderColor: '#F1F5F9',
    marginBottom: 12,
  },
  allocationText: {
    fontSize: 12,
    color: '#475569',
  },
  quotaPill: {
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 999,
  },
  quotaPillText: {
    fontSize: 10.5,
    fontWeight: '700',
    color: '#334155',
  },
  progressLabel: {
    fontSize: 11,
    fontWeight: '600',
    color: '#64748B',
  },
  progressValue: {
    fontSize: 11,
    fontWeight: '800',
    color: '#0F172A',
  },
  progressTrackShell: {
    height: 7,
    backgroundColor: '#E2E8F0',
    borderRadius: 999,
    overflow: 'hidden',
  },
  progressTrackFill: {
    height: '100%',
    borderRadius: 999,
  },
  actionBtnWrapper: {
    borderRadius: 14,
    overflow: 'hidden',
    ...(Platform.OS === 'web'
      ? { boxShadow: '0 4px 12px rgba(200, 16, 46, 0.2)' }
      : {
          shadowColor: '#C8102E',
          shadowOffset: { width: 0, height: 3 },
          shadowOpacity: 0.2,
          shadowRadius: 6,
          elevation: 3,
        }),
  },
  actionBtnGradient: {
    paddingVertical: 12,
    paddingHorizontal: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    borderRadius: 14,
  },
  actionBtnGradientText: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '800',
  },
  completedInfoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: 4,
  },
  completedInfoText: {
    fontSize: 11.5,
    color: '#64748B',
    fontWeight: '500',
  },
  viewAuditBtn: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    backgroundColor: '#F1F5F9',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  viewAuditText: {
    fontSize: 11,
    color: '#C8102E',
    fontWeight: '700',
  },
  emptyStateCard: {
    padding: 32,
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#E2E8F0',
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
    fontSize: 14,
    fontWeight: '800',
    color: '#1E293B',
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


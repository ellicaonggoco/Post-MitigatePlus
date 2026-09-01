import React, { useState } from 'react';
import {
  View,
  Text,
  Modal,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
  Pressable,
} from 'react-native';
import { BellIcon, CloseIcon, ArrowLeftIcon, MegaphoneIcon } from './AppIcons';
import { COLORS, FONT_WEIGHT, SHADOWS, RESPONSIVE, hp } from '../theme';
import { MotionPressable } from './motion';

export default function NotificationModal({
  visible,
  onClose,
  notifications,
  notifs: notifsProp,
  onNavigate,
  lang = 'en',
}) {
  const [selectedNotif, setSelectedNotif] = useState(null);

  const notifs = Array.isArray(notifications)
    ? notifications
    : Array.isArray(notifsProp)
    ? notifsProp
    : [];

  const handleItemPress = (notif) => {
    setSelectedNotif(notif);
  };

  const handleBackToList = () => {
    setSelectedNotif(null);
  };

  const handleModalClose = () => {
    setSelectedNotif(null);
    onClose();
  };

  const handleActionRoute = (targetTab) => {
    handleModalClose();
    if (targetTab && onNavigate) {
      onNavigate(targetTab);
    }
  };

  const getActionLabel = (targetTab) => {
    if (targetTab === 'damage') {
      return lang === 'tl' ? 'Pumunta sa Ulat ng Pinsala' : 'Go to Damage Report';
    }
    if (targetTab === 'assistance' || targetTab === 'request') {
      return lang === 'tl' ? 'Pumunta sa Livelihood Program' : 'Go to Livelihood Program';
    }
    if (targetTab === 'history') {
      return lang === 'tl' ? 'Tingnan ang Talaan ng Ayuda' : 'View Claims History';
    }
    return lang === 'tl' ? 'Pumunta sa Serbisyo' : 'Proceed to Service';
  };

  return (
    <Modal
      visible={visible}
      transparent={true}
      animationType="fade"
      onRequestClose={handleModalClose}
    >
      <View style={styles.overlay}>
        {/* Backdrop Tap to Dismiss */}
        <Pressable style={styles.backdropTap} onPress={handleModalClose} />

        {/* Top-Anchored Popover Menu Card */}
        <View style={styles.popoverCard}>
          {/* DETAIL VIEW: Full Announcement Reader */}
          {selectedNotif ? (
            <View style={styles.detailContainer}>
              <View style={styles.detailHeader}>
                <TouchableOpacity
                  onPress={handleBackToList}
                  style={styles.backBtnPill}
                  activeOpacity={0.8}
                >
                  <ArrowLeftIcon size={14} color="#1557B0" />
                  <Text style={styles.backBtnText}>
                    {lang === 'tl' ? 'Mga Notipikasyon' : 'All Notifications'}
                  </Text>
                </TouchableOpacity>

                <TouchableOpacity
                  onPress={handleModalClose}
                  style={styles.closeBtn}
                  activeOpacity={0.8}
                >
                  <CloseIcon size={14} color="#172B4D" />
                </TouchableOpacity>
              </View>

              <ScrollView
                style={styles.detailScrollView}
                contentContainerStyle={styles.detailContent}
                showsVerticalScrollIndicator={false}
              >
                <View style={styles.detailBadgeRow}>
                  <View style={[styles.typeBadge, selectedNotif.type === 'urgent' ? styles.typeUrgent : styles.typeNormal]}>
                    <Text style={[styles.typeBadgeText, selectedNotif.type === 'urgent' ? { color: '#DC2626' } : { color: '#1557B0' }]}>
                      {selectedNotif.tag || (selectedNotif.type === 'urgent' ? 'URGENT BULLETIN' : 'PUBLIC ADVISORY')}
                    </Text>
                  </View>
                  <Text style={styles.detailTime}>{selectedNotif.time || 'Kamakailan'}</Text>
                </View>

                <Text style={styles.detailTitle}>{selectedNotif.title}</Text>

                <View style={styles.issuerBox}>
                  <Text style={styles.issuerLabel}>
                    {lang === 'tl' ? 'Nag-isyu:' : 'Issued by:'}
                  </Text>
                  <Text style={styles.issuerName}>
                    {selectedNotif.issuer || 'Pamahalaang Lungsod ng Maynila • Barangay Council'}
                  </Text>
                </View>

                <Text style={styles.detailBody}>{selectedNotif.body || selectedNotif.content || 'Walang karagdagang detalye.'}</Text>
              </ScrollView>
            </View>
          ) : (
            /* LIST VIEW: All Notifications */
            <>
              <View style={styles.popoverHeader}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                  <BellIcon size={17} color="#1557B0" />
                  <Text style={styles.popoverTitle}>
                    {lang === 'tl' ? 'Mga Notipikasyon at Alert' : 'Notifications & Alerts'}
                  </Text>
                </View>
                <TouchableOpacity onPress={handleModalClose} style={styles.closeBtn} activeOpacity={0.8}>
                  <CloseIcon size={14} color="#172B4D" />
                </TouchableOpacity>
              </View>

              <ScrollView
                style={styles.scrollView}
                contentContainerStyle={styles.scrollContent}
                showsVerticalScrollIndicator={false}
              >
                {notifs.length === 0 ? (
                  <View style={styles.emptyState}>
                    <Text style={styles.emptyText}>
                      {lang === 'tl' ? 'Walang bagong notipikasyon.' : 'No new notifications.'}
                    </Text>
                  </View>
                ) : (
                  notifs.map((n) => (
                    <MotionPressable
                      key={n.id}
                      style={[
                        styles.notifItem,
                        n.unread && styles.notifItemUnread,
                      ]}
                      onPress={() => handleItemPress(n)}
                      activeOpacity={0.85}
                    >
                      <View style={styles.notifTopRow}>
                        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                          <View style={[styles.typeBadge, n.type === 'urgent' ? styles.typeUrgent : styles.typeNormal]}>
                            <Text style={[styles.typeBadgeText, n.type === 'urgent' ? { color: '#DC2626' } : { color: '#1557B0' }]}>
                              {n.tag || (n.type === 'urgent' ? 'URGENT' : 'ADVISORY')}
                            </Text>
                          </View>
                          {(n.edited || n.isEdited || n.tag === 'UPDATED' || n.title?.includes('Na-update') || n.title?.includes('Updated')) && (
                            <View style={{ backgroundColor: '#FEF3C7', paddingHorizontal: 6, paddingVertical: 2, borderRadius: 4 }}>
                              <Text style={{ fontSize: 10, fontWeight: '800', color: '#B45309' }}>
                                {lang === 'tl' ? '✏️ NA-UPDATE' : '✏️ EDITED'}
                              </Text>
                            </View>
                          )}
                        </View>
                        <Text style={styles.notifTime}>{n.time}</Text>
                      </View>

                      <Text style={styles.notifTitle}>{n.title}</Text>
                      <Text style={styles.notifBody} numberOfLines={2}>{n.body}</Text>

                      <View style={styles.tapToReadRow}>
                        <Text style={styles.tapToReadText}>
                          {lang === 'tl' ? 'Pindutin upang basahin ang buong anunsyo ➜' : 'Tap to read full announcement ➜'}
                        </Text>
                      </View>
                    </MotionPressable>
                  ))
                )}
              </ScrollView>
            </>
          )}
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(15, 23, 42, 0.65)',
    justifyContent: 'flex-start',
    alignItems: 'center',
    paddingTop: RESPONSIVE.topSafe + 10,
    paddingHorizontal: RESPONSIVE.padding,
  },
  backdropTap: {
    ...StyleSheet.absoluteFillObject,
  },
  popoverCard: {
    width: '100%',
    maxWidth: RESPONSIVE.maxCardWidth,
    maxHeight: hp(78),
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#D9E2EC',
    overflow: 'hidden',
    zIndex: 10,
    ...SHADOWS.lg,
  },
  popoverHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: '#D9E2EC',
    backgroundColor: '#FFFFFF',
  },
  popoverTitle: {
    fontSize: 15,
    fontWeight: FONT_WEIGHT.black,
    color: '#172B4D',
  },
  closeBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#F8F9F7',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#D9E2EC',
  },
  scrollView: {
    maxHeight: 460,
  },
  scrollContent: {
    padding: 14,
    gap: 10,
  },
  emptyState: {
    padding: 24,
    alignItems: 'center',
  },
  emptyText: {
    fontSize: 13,
    color: '#64748B',
  },
  notifItem: {
    padding: 14,
    borderRadius: 14,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderLeftWidth: 4,
    borderLeftColor: '#1557B0',
    marginBottom: 8,
  },
  notifItemUnread: {
    backgroundColor: '#F8FAFC',
    borderColor: '#CBD5E1',
  },
  notifTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 6,
  },
  typeBadge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  typeNormal: {
    backgroundColor: '#EFF6FF',
  },
  typeUrgent: {
    backgroundColor: '#FEE2E2',
  },
  typeBadgeText: {
    fontSize: 10.5,
    fontWeight: '700',
    letterSpacing: 0.4,
  },
  notifTime: {
    fontSize: 11,
    color: '#94A3B8',
    fontWeight: '500',
  },
  notifTitle: {
    fontSize: 14.5,
    fontWeight: '800',
    color: '#0F172A',
    marginBottom: 4,
  },
  notifBody: {
    fontSize: 12.5,
    color: '#475569',
    lineHeight: 18,
  },
  tapToReadRow: {
    marginTop: 8,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: '#F1F5F9',
  },
  tapToReadText: {
    fontSize: 11.5,
    color: '#1557B0',
    fontWeight: '700',
  },
  // DETAIL VIEW STYLES
  detailContainer: {
    width: '100%',
    backgroundColor: '#FFFFFF',
  },
  detailHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#E2E8F0',
    backgroundColor: '#F8FAFC',
  },
  backBtnPill: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#CBD5E1',
  },
  backBtnText: {
    fontSize: 12.5,
    fontWeight: '700',
    color: '#1557B0',
    marginLeft: 6,
  },
  detailScrollView: {
    maxHeight: 460,
  },
  detailContent: {
    padding: 18,
  },
  detailBadgeRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  detailTime: {
    fontSize: 11.5,
    color: '#64748B',
    fontWeight: '500',
  },
  detailTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: '#0F172A',
    lineHeight: 24,
    marginBottom: 8,
  },
  issuerBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F8FAFC',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    marginBottom: 14,
  },
  issuerLabel: {
    fontSize: 11,
    fontWeight: '600',
    color: '#64748B',
    marginRight: 4,
  },
  issuerName: {
    fontSize: 11.5,
    fontWeight: '700',
    color: '#0F172A',
    flex: 1,
  },
  detailBody: {
    fontSize: 13.5,
    color: '#334155',
    lineHeight: 21,
    marginBottom: 18,
  },
  detailActionBtn: {
    backgroundColor: '#1557B0',
    borderRadius: 10,
    paddingVertical: 12,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 6,
  },
  detailActionBtnText: {
    fontSize: 13.5,
    fontWeight: '700',
    color: '#FFFFFF',
  },
});

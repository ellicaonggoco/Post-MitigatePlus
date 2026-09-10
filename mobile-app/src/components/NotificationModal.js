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
import { BellIcon, CloseIcon, ArrowLeftIcon, MegaphoneIcon, EditIcon, ArrowRightIcon, CheckIcon } from './AppIcons';
import { COLORS, FONT_WEIGHT, SHADOWS, RESPONSIVE, hp } from '../theme';
import { MotionPressable } from './motion';

export default function NotificationModal({
  visible,
  onClose,
  notifications,
  notifs: notifsProp,
  onNavigate,
  onMarkAllRead,
  onMarkRead,
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
    if (onMarkRead && notif?.id) {
      onMarkRead(notif.id, notif);
    }
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
      const clean = String(targetTab).toLowerCase().trim();
      const destination = (clean === 'distribution' || clean === 'history' || clean === 'claim' || clean === 'claims' || clean === 'schedule')
        ? 'history'
        : (clean === 'request' || clean === 'assistance' || clean === 'livelihood')
        ? 'assistance'
        : (clean === 'damage' || clean === 'report')
        ? 'damage'
        : clean;
      onNavigate(destination);
    }
  };

  const getActionLabel = (targetTab) => {
    const clean = String(targetTab || '').toLowerCase().trim();
    if (clean === 'damage' || clean === 'report') {
      return lang === 'tl' ? 'Pumunta sa Ulat ng Pinsala' : 'Go to Damage Report';
    }
    if (clean === 'assistance' || clean === 'request' || clean === 'livelihood') {
      return lang === 'tl' ? 'Pumunta sa Livelihood Program' : 'Go to Livelihood Program';
    }
    if (clean === 'history' || clean === 'distribution' || clean === 'claim' || clean === 'claims' || clean === 'schedule') {
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
                  accessibilityRole="button"
                  accessibilityLabel="Mga Notipikasyon, back to all notifications"
                  accessibilityHint="Returns to notification list"
                >
                  <View style={styles.backIconCircle}>
                    <ArrowLeftIcon size={14} color="#1C3F94" />
                  </View>
                  <Text style={styles.backBtnText}>
                    {lang === 'tl' ? 'Mga Notipikasyon' : 'All Notifications'}
                  </Text>
                </TouchableOpacity>

                <TouchableOpacity
                  onPress={handleModalClose}
                  style={styles.closeBtn}
                  activeOpacity={0.8}
                  accessibilityRole="button"
                  accessibilityLabel="Close notifications"
                  accessibilityHint="Closes the notification modal"
                  hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
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
                    <Text style={[styles.typeBadgeText, selectedNotif.type === 'urgent' ? { color: '#DC2626' } : { color: '#1C3F94' }]}>
                      {selectedNotif.tag || (selectedNotif.type === 'urgent' ? 'URGENT BULLETIN' : 'PUBLIC ADVISORY')}
                    </Text>
                  </View>
                  {(selectedNotif.edited || selectedNotif.isEdited || selectedNotif.tag === 'UPDATED' || selectedNotif.title?.includes('Na-update') || selectedNotif.title?.includes('Updated')) && (
                    <View style={{ backgroundColor: '#FEF3C7', paddingHorizontal: 7, paddingVertical: 2.5, borderRadius: 4, flexDirection: 'row', alignItems: 'center', gap: 4, borderWidth: 1, borderColor: '#FCD34D' }}>
                      <EditIcon size={10} color="#B45309" />
                      <Text style={{ fontSize: 10, fontWeight: '800', color: '#B45309' }}>
                        {lang === 'tl' ? 'NA-UPDATE' : 'EDITED'}
                      </Text>
                    </View>
                  )}
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

                {(selectedNotif.targetTab || selectedNotif.actionTab) && (
                  <TouchableOpacity
                    style={styles.detailActionBtn}
                    onPress={() => handleActionRoute(selectedNotif.targetTab || selectedNotif.actionTab)}
                    activeOpacity={0.85}
                    accessibilityRole="button"
                    accessibilityLabel={getActionLabel(selectedNotif.targetTab || selectedNotif.actionTab)}
                    accessibilityHint="Navigates to the corresponding service"
                  >
                    <Text style={styles.detailActionBtnText}>
                      {getActionLabel(selectedNotif.targetTab || selectedNotif.actionTab)}
                    </Text>
                  </TouchableOpacity>
                )}
              </ScrollView>
            </View>
          ) : (
            /* LIST VIEW: All Notifications */
            <>
              <View style={styles.popoverHeader}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, flex: 1, paddingRight: 8 }}>
                  <BellIcon size={17} color="#1C3F94" />
                  <Text style={[styles.popoverTitle, { flexShrink: 1 }]} numberOfLines={1}>
                    {lang === 'tl' ? 'Mga Notipikasyon at Alert' : 'Notifications & Alerts'}
                  </Text>
                  {notifs.filter((n) => n.unread).length > 0 && (
                    <View style={styles.unreadCountBadge}>
                      <Text style={styles.unreadCountBadgeText}>
                        {notifs.filter((n) => n.unread).length}
                      </Text>
                    </View>
                  )}
                </View>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                  {onMarkAllRead && notifs.some((n) => n.unread) && (
                    <TouchableOpacity
                      onPress={onMarkAllRead}
                      style={styles.markAllReadBtn}
                      activeOpacity={0.8}
                      accessibilityRole="button"
                      accessibilityLabel={lang === 'tl' ? 'Basahin Lahat ng Notipikasyon' : 'Mark all notifications as read'}
                      accessibilityHint={lang === 'tl' ? 'Minamarkahan ang lahat ng notipikasyon bilang nabasa na' : 'Marks all notifications as read'}
                      hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                    >
                      <CheckIcon size={12} color="#1C3F94" strokeWidth={2.5} />
                      <Text style={styles.markAllReadText}>
                        {lang === 'tl' ? 'Basahin Lahat' : 'Read All'}
                      </Text>
                    </TouchableOpacity>
                  )}
                  <TouchableOpacity
                    onPress={handleModalClose}
                    style={styles.closeBtn}
                    activeOpacity={0.8}
                    accessibilityRole="button"
                    accessibilityLabel={lang === 'tl' ? 'Isara ang mga notipikasyon' : 'Close notifications'}
                    accessibilityHint={lang === 'tl' ? 'Isinasara ang window ng notipikasyon' : 'Closes the notification window'}
                    hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                  >
                    <CloseIcon size={14} color="#0B1525" />
                  </TouchableOpacity>
                </View>
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
                      accessibilityRole="button"
                      accessibilityLabel={`${n.unread ? (lang === 'tl' ? 'Hindi pa nababasa: ' : 'Unread: ') : ''}${n.title}`}
                      accessibilityHint={lang === 'tl' ? 'Pindutin upang basahin ang buong anunsyo' : 'Tap to read full announcement'}
                    >
                      <View style={styles.notifTopRow}>
                        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                          {n.unread && (
                            <View style={styles.notifRedDot} />
                          )}
                          <View style={[styles.typeBadge, n.type === 'urgent' ? styles.typeUrgent : styles.typeNormal]}>
                            <Text style={[styles.typeBadgeText, n.type === 'urgent' ? { color: '#DC2626' } : { color: '#1C3F94' }]}>
                              {n.tag || (n.type === 'urgent' ? 'URGENT' : 'ADVISORY')}
                            </Text>
                          </View>
                          {n.unread && (
                            <View style={styles.notifNewBadge}>
                              <Text style={styles.notifNewBadgeText}>
                                {lang === 'tl' ? 'BAGO' : 'NEW'}
                              </Text>
                            </View>
                          )}
                          {(n.edited || n.isEdited || n.tag === 'UPDATED' || n.title?.includes('Na-update') || n.title?.includes('Updated')) && (
                            <View style={{ backgroundColor: '#FEF3C7', paddingHorizontal: 6, paddingVertical: 2, borderRadius: 4, flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                              <EditIcon size={11} color="#B45309" />
                              <Text style={{ fontSize: 10, fontWeight: '800', color: '#B45309' }}>
                                {lang === 'tl' ? 'NA-UPDATE' : 'EDITED'}
                              </Text>
                            </View>
                          )}
                        </View>
                        <Text style={styles.notifTime}>{n.time}</Text>
                      </View>

                      <Text style={[styles.notifTitle, n.unread && { fontWeight: '800', color: '#0B1525' }]}>{n.title}</Text>
                      <Text style={styles.notifBody} numberOfLines={2}>{n.body}</Text>

                      <View style={[styles.tapToReadRow, { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }]}>
                        <Text style={[styles.tapToReadText, n.unread && { color: '#C8102E', fontWeight: '700' }]}>
                          {lang === 'tl' ? 'Pindutin upang basahin ang buong anunsyo' : 'Tap to read full announcement'}
                        </Text>
                        <ArrowRightIcon size={12} color={n.unread ? '#C8102E' : '#1C3F94'} />
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
    borderColor: '#DDE4F0',
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
    borderBottomColor: '#DDE4F0',
    backgroundColor: '#FFFFFF',
  },
  popoverTitle: {
    fontSize: 15,
    fontWeight: FONT_WEIGHT.black,
    color: '#0B1525',
  },
  markAllReadBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#EDF1FB',
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#D6DEFA',
    minHeight: 48,
    justifyContent: 'center',
  },
  markAllReadText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#1C3F94',
  },
  closeBtn: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#F3F6FC',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#DDE4F0',
    minWidth: 48,
    minHeight: 48,
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
    color: '#334155',
  },
  notifItem: {
    padding: 14,
    borderRadius: 14,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#DDE4F0',
    borderLeftWidth: 4,
    borderLeftColor: '#DDE4F0',
    marginBottom: 8,
  },
  notifItemUnread: {
    backgroundColor: '#FFF8F8',
    borderColor: '#F5D0D6',
    borderLeftWidth: 4,
    borderLeftColor: '#C8102E',
  },
  notifRedDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#C8102E',
  },
  notifNewBadge: {
    backgroundColor: '#FEF0F2',
    borderColor: '#F5E0E3',
    borderWidth: 1,
    borderRadius: 6,
    paddingHorizontal: 6,
    paddingVertical: 2,
  },
  notifNewBadgeText: {
    color: '#C8102E',
    fontWeight: '800',
    fontSize: 9,
  },
  unreadCountBadge: {
    backgroundColor: '#C8102E',
    borderRadius: 10,
    minWidth: 18,
    height: 18,
    paddingHorizontal: 5,
    alignItems: 'center',
    justifyContent: 'center',
  },
  unreadCountBadgeText: {
    fontSize: 10,
    fontWeight: '800',
    color: '#FFFFFF',
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
    backgroundColor: '#EDF1FB',
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
    color: '#475569',
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
    color: '#3D5070',
    lineHeight: 18,
  },
  tapToReadRow: {
    marginTop: 8,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: '#F3F6FC',
  },
  tapToReadText: {
    fontSize: 11.5,
    color: '#1C3F94',
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
    borderBottomColor: '#DDE4F0',
    backgroundColor: '#F3F6FC',
  },
  backBtnPill: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 9999,
    borderWidth: 1,
    borderColor: '#DDE4F0',
    gap: 8,
    minHeight: 48,
    justifyContent: 'center',
    ...SHADOWS.pill,
  },
  backIconCircle: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: '#EDF1FB',
    alignItems: 'center',
    justifyContent: 'center',
  },
  backBtnText: {
    fontSize: 13,
    fontWeight: '800',
    color: '#1C3F94',
    letterSpacing: 0.2,
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
    color: '#475569',
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
    backgroundColor: '#F3F6FC',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#DDE4F0',
    marginBottom: 14,
  },
  issuerLabel: {
    fontSize: 11,
    fontWeight: '600',
    color: '#3D5070',
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
    backgroundColor: '#1C3F94',
    borderRadius: 10,
    paddingVertical: 14,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 6,
    minHeight: 48,
  },
  detailActionBtnText: {
    fontSize: 13.5,
    fontWeight: '700',
    color: '#FFFFFF',
  },
});

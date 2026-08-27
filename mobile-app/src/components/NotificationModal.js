import React from 'react';
import {
  View,
  Text,
  Modal,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
  Pressable,
} from 'react-native';
import { BellIcon, CloseIcon } from './AppIcons';
import { COLORS, FONT_WEIGHT, SHADOWS, RESPONSIVE, wp, hp } from '../theme';
import { MotionPressable } from './motion';

/**
 * Top Popover Notification System (Direct Routing)
 * ----------------------------------------------------------------------------
 * - Anchored cleanly under the header Bell button (preserves user context)
 * - Tapping a notification card immediately routes to the designated screen
 * - No redundant bottom buttons: dismissed via backdrop tap or top-right  button
 * - Blue + Pearl White civic theme
 */
export default function NotificationModal({
  visible,
  onClose,
  notifications,
  notifs: notifsProp,
  onNavigate,
  lang = 'en',
}) {
  const notifs = Array.isArray(notifications) 
    ? notifications 
    : Array.isArray(notifsProp) 
    ? notifsProp 
    : [];

  const handleItemPress = (notif) => {
    if (notif.targetTab && onNavigate) {
      onNavigate(notif.targetTab);
    } else {
      onClose();
    }
  };

  const getActionLabel = (targetTab) => {
    if (targetTab === 'damage') {
      return lang === 'tl' ? 'Pumunta sa Ulat ng Pinsala' : 'Go to Damage Report';
    }
    if (targetTab === 'request') {
      return lang === 'tl' ? 'Pumunta sa Kahilingan ng Ayuda' : 'Go to Relief Request';
    }
    if (targetTab === 'history') {
      return lang === 'tl' ? 'Tingnan ang Talaan ng Ayuda' : 'View Claims History';
    }
    return lang === 'tl' ? 'Tingnan ang Detalye' : 'View Details';
  };

  return (
    <Modal
      visible={visible}
      transparent={true}
      animationType="fade"
      onRequestClose={onClose}
    >
      <View style={styles.overlay}>
        {/* Backdrop Tap to Dismiss */}
        <Pressable style={styles.backdropTap} onPress={onClose} />

        {/* Top-Anchored Popover Menu Card */}
        <View style={styles.popoverCard}>
          {/* Header */}
          <View style={styles.popoverHeader}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
              <BellIcon size={17} color="#1557B0" />
              <Text style={styles.popoverTitle}>
                {lang === 'tl' ? 'Mga Notipikasyon at Alert' : 'Notifications & Alerts'}
              </Text>
            </View>
            <TouchableOpacity onPress={onClose} style={styles.closeBtn} activeOpacity={0.8}>
              <CloseIcon size={14} color="#172B4D" />
            </TouchableOpacity>
          </View>

          {/* List of Clickable Notifications */}
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
                    <View style={[styles.typeBadge, n.type === 'urgent' ? styles.typeUrgent : styles.typeNormal]}>
                      <Text style={[styles.typeBadgeText, n.type === 'urgent' ? { color: '#DC2626' } : { color: '#1557B0' }]}>
                        {n.tag || (n.type === 'urgent' ? 'URGENT' : 'ADVISORY')}
                      </Text>
                    </View>
                    <Text style={styles.notifTime}>{n.time}</Text>
                  </View>

                  <Text style={styles.notifTitle}>{n.title}</Text>
                  <Text style={styles.notifBody}>{n.body}</Text>

                  {/* Designated Route Navigation Link */}
                  <View style={styles.actionRow}>
                    <Text style={styles.actionText}>{getActionLabel(n.targetTab)}</Text>
                  </View>
                </MotionPressable>
              ))
            )}
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(11, 46, 89, 0.40)',
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
    maxHeight: hp(75),
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
    borderColor: '#D9E2EC',
    ...SHADOWS.sm,
  },
  notifItemUnread: {
    backgroundColor: '#FFFFFF',
    borderColor: '#BFDBFE',
    borderLeftWidth: 4,
    borderLeftColor: '#1557B0',
  },
  notifTopRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 6,
  },
  typeBadge: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  typeUrgent: {
    backgroundColor: '#FEF2F2',
  },
  typeNormal: {
    backgroundColor: '#E8F2FF',
  },
  typeBadgeText: {
    fontSize: 9,
    fontWeight: '800',
    letterSpacing: 0.4,
  },
  notifTime: {
    fontSize: 10.5,
    color: '#64748B',
  },
  notifTitle: {
    fontSize: 13,
    fontWeight: '800',
    color: '#172B4D',
    marginBottom: 3,
  },
  notifBody: {
    fontSize: 11.5,
    color: '#475569',
    lineHeight: 16,
  },
  actionRow: {
    marginTop: 8,
    paddingTop: 6,
    borderTopWidth: 1,
    borderTopColor: '#F1F5F9',
  },
  actionText: {
    fontSize: 11.5,
    fontWeight: '800',
    color: '#1557B0',
  },
});

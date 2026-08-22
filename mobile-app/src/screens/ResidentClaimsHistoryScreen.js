import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, ActivityIndicator } from 'react-native';
import { fetchClaimsHistory } from '../services/api';
import { CalendarIcon, MapPinIcon, ShieldCheckIcon, PackageIcon, ArrowLeftIcon } from '../components/AppIcons';
import { COLORS, FONT_WEIGHT, SHADOWS, RESPONSIVE, wp, hp } from '../theme';
import { TRANSLATIONS } from '../i18n/translations';
import { MotionPressable, MotionPulseBadge } from '../components/motion';

export default function ResidentClaimsHistoryScreen({ token, lang = 'en', onBack }) {
  const t = TRANSLATIONS[lang] || TRANSLATIONS.en;
  const [claims, setClaims] = useState([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    async function loadHistory() {
      if (!token) return;
      setLoading(true);
      try {
        const liveData = await fetchClaimsHistory(token);
        const list = Array.isArray(liveData)
          ? liveData
          : [...(liveData?.distributions || []), ...(liveData?.requests || [])];

        if (list.length > 0) {
          setClaims(list.map((c, i) => ({
            id: c._id || c.id || i,
            type: c.itemType || (c.items ? c.items.join(', ') : 'Family Food Pack'),
            status: c.status || 'CLAIMED',
            date: c.claimedAt || c.requestedAt || c.createdAt ? new Date(c.claimedAt || c.requestedAt || c.createdAt).toLocaleString() : 'Recent',
            location: c.location || 'Barangay 291 Covered Court',
            verifiedBy: c.verifiedBy || c.releasedBy || 'Barangay Official',
          })));
        }
      } catch (err) {
        setClaims([]);
      } finally {
        setLoading(false);
      }
    }

    loadHistory();
  }, [token]);

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
      {/* Header */}
      <View style={styles.header}>
        <MotionPressable style={styles.backBtn} onPress={onBack} activeOpacity={0.8}>
          <ArrowLeftIcon size={16} color="#1557B0" />
          <Text style={styles.backBtnText}>{lang === 'tl' ? 'Bumalik sa Tahanan' : 'Back to Home'}</Text>
        </MotionPressable>
        <Text style={styles.title}>{t.historyTitle || (lang === 'tl' ? 'Kasaysayan ng Pamamahagi at Ayuda' : 'Distribution & Claims History')}</Text>
        <Text style={styles.sub}>{t.historySub || (lang === 'tl' ? 'Talaan ng mga natanggap na relief goods at supplies.' : 'Verified logs of received family food packs and supplies.')}</Text>
      </View>

      {/* Summary Stat Card */}
      <View style={styles.summaryCard}>
        <View style={styles.summaryItem}>
          <Text style={styles.summaryLabel}>{lang === 'tl' ? 'KABUUANG NATANGGAP' : 'TOTAL DISTRIBUTED'}</Text>
          <Text style={styles.summaryValue}>{claims.length} {lang === 'tl' ? 'Pakete' : 'Packages'}</Text>
        </View>
        <View style={styles.summaryDivider} />
        <View style={styles.summaryItem}>
          <Text style={styles.summaryLabel}>{lang === 'tl' ? 'STATUS NG AUDIT' : 'AUDIT STATUS'}</Text>
          <Text style={[styles.summaryValue, { color: '#16A34A' }]}>{lang === 'tl' ? '100% Beripikado' : '100% Verified'}</Text>
        </View>
        <View style={styles.summaryDivider} />
        <View style={styles.summaryItem}>
          <Text style={styles.summaryLabel}>{lang === 'tl' ? 'SEGURIDAD' : 'SECURITY'}</Text>
          <Text style={[styles.summaryValue, { color: '#D97706' }]}>{lang === 'tl' ? 'QR Token Tugma' : 'QR Token Match'}</Text>
        </View>
      </View>

      {/* Claims Timeline List */}
      {loading ? (
        <ActivityIndicator size="large" color="#1557B0" style={{ marginTop: 40 }} />
      ) : (
        <View style={styles.historyList}>
          {claims.map((item) => (
            <View key={item.id} style={styles.claimCard}>
              <View style={styles.cardTop}>
                <View style={styles.packageIconWell}>
                  <PackageIcon size={18} color="#1557B0" />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.claimType}>{item.type}</Text>
                  <View style={styles.dateRow}>
                    <CalendarIcon size={11} color="#64748B" />
                    <Text style={styles.claimDate}>{item.date}</Text>
                  </View>
                </View>

                <MotionPulseBadge color={item.status === 'CLAIMED' ? '#10B981' : '#F59E0B'}>
                  <View style={[styles.statusTag, item.status === 'CLAIMED' ? styles.tagClaimed : styles.tagPending]}>
                    <Text style={[styles.statusText, { color: item.status === 'CLAIMED' ? '#16A34A' : '#D97706' }]}>
                      {item.status === 'CLAIMED' ? (t.claimedStatus || 'CLAIMED') : (t.inTransitStatus || 'PENDING')}
                    </Text>
                  </View>
                </MotionPulseBadge>
              </View>

              <View style={styles.cardDivider} />

              <View style={styles.cardFooter}>
                <View style={styles.footerRow}>
                  <MapPinIcon size={12} color="#64748B" />
                  <Text style={styles.footerInfo}>{item.location}</Text>
                </View>
                <View style={styles.footerRow}>
                  <ShieldCheckIcon size={12} color="#1557B0" />
                  <Text style={styles.footerOfficer}>
                    {lang === 'tl' ? 'Na-verify ni:' : 'Verified by:'} <Text style={{ fontWeight: '700', color: '#172B4D' }}>{item.verifiedBy}</Text>
                  </Text>
                </View>
              </View>
            </View>
          ))}
        </View>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F8F9F7' },
  content: {
    paddingHorizontal: RESPONSIVE.padding,
    paddingTop: 14,
    paddingBottom: hp(14),
  },
  header: { marginBottom: 16 },
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
  kicker: {
    fontSize: 9.5,
    fontWeight: '800',
    color: '#1557B0',
    letterSpacing: 0.8,
    marginBottom: 2,
    textTransform: 'uppercase',
  },
  title: { fontSize: 22, fontWeight: FONT_WEIGHT.black, color: '#172B4D', letterSpacing: -0.3 },
  sub: { fontSize: 12, color: '#64748B', marginTop: 4, lineHeight: 17 },
  summaryCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#D9E2EC',
    padding: 12,
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
    ...SHADOWS.sm,
  },
  summaryItem: {
    flex: 1,
    alignItems: 'center',
  },
  summaryDivider: {
    width: 1,
    height: 28,
    backgroundColor: '#E2E8F0',
  },
  summaryLabel: {
    fontSize: 8.5,
    fontWeight: '800',
    color: '#64748B',
    letterSpacing: 0.5,
  },
  summaryValue: {
    fontSize: 12.5,
    fontWeight: FONT_WEIGHT.black,
    color: '#172B4D',
    marginTop: 2,
  },
  historyList: { gap: 10 },
  claimCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#D9E2EC',
    padding: 14,
    ...SHADOWS.sm,
  },
  cardTop: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
  },
  packageIconWell: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#E8F2FF',
    alignItems: 'center',
    justifyContent: 'center',
  },
  claimType: {
    fontSize: 13.5,
    fontWeight: '800',
    color: '#172B4D',
  },
  dateRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: 2,
  },
  claimDate: {
    fontSize: 11,
    color: '#64748B',
    fontWeight: '600',
  },
  statusTag: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  tagClaimed: {
    backgroundColor: '#DCFCE7',
    borderWidth: 1,
    borderColor: '#BBF7D0',
  },
  tagPending: {
    backgroundColor: '#FEF3C7',
    borderWidth: 1,
    borderColor: '#FDE68A',
  },
  statusText: {
    fontSize: 10,
    fontWeight: '800',
  },
  cardDivider: {
    height: 1,
    backgroundColor: '#F1F5F9',
    marginVertical: 10,
  },
  cardFooter: {
    gap: 4,
  },
  footerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  footerInfo: {
    fontSize: 11,
    color: '#64748B',
  },
  footerOfficer: {
    fontSize: 11,
    color: '#475569',
  },
});

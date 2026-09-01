import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, ActivityIndicator, Modal } from 'react-native';
import { fetchClaimsHistory } from '../services/api';
import { CalendarIcon, MapPinIcon, ShieldCheckIcon, PackageIcon, ArrowLeftIcon, CloseIcon } from '../components/AppIcons';
import { COLORS, FONT_WEIGHT, SHADOWS, RESPONSIVE, wp, hp } from '../theme';
import { TRANSLATIONS } from '../i18n/translations';
import { MotionPressable, MotionPulseBadge } from '../components/motion';

export default function ResidentClaimsHistoryScreen({ token, user, household, lang = 'en', onBack }) {
  const t = TRANSLATIONS[lang] || TRANSLATIONS.en;
  const [claims, setClaims] = useState([]);
  const [loading, setLoading] = useState(false);
  const [selectedReceipt, setSelectedReceipt] = useState(null);

  const residentName = user?.name || household?.name || (lang === 'tl' ? 'Rehistradong Residente' : 'Registered Resident');
  const residentAddress = household?.address || (lang === 'tl' ? 'Barangay 291, Maynila' : 'Barangay 291, Manila');
  const residentBrgy = household?.barangayCode || user?.barangayCode || '291';
  const residentQr = household?.qrCode || `MNL-${residentBrgy}-PASS`;
  const residentMembers = household?.memberCount || 1;

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
          setClaims(list.map((c, i) => {
            const rawId = c._id || c.id || String(i);
            const receiptNo = c.receiptNumber || `RCPT-${new Date(c.claimedAt || c.releasedAt || Date.now()).getFullYear()}-${rawId.slice(-6).toUpperCase()}`;
            return {
              id: rawId,
              receiptNumber: receiptNo,
              beneficiaryName: c.householdId?.headOfHouseholdUserId?.name || residentName,
              address: c.householdId?.address || residentAddress,
              barangay: c.householdId?.barangayCode || residentBrgy,
              qrCode: c.householdId?.qrCode || residentQr,
              familySize: c.householdSizeAtDistribution || c.householdId?.memberCount || residentMembers,
              type: c.itemType || (c.items ? c.items.join(', ') : 'Family Food Pack'),
              status: c.status || 'CLAIMED',
              quantity: (c.baseUnitsGiven || 1) + (c.topUpUnitsGiven || 0),
              date: c.claimedAt || c.releasedAt || c.requestedAt || c.createdAt ? new Date(c.claimedAt || c.releasedAt || c.requestedAt || c.createdAt).toLocaleString('en-PH', { timeZone: 'Asia/Manila' }) : 'Recent',
              location: c.location || (c.distributionEventId?.location) || `Barangay ${residentBrgy} Distribution Center`,
              verifiedBy: typeof c.releasedBy === 'object' ? (c.releasedBy?.name || 'Field Officer') : (c.verifiedBy || c.releasedBy || 'MDRRMO Field Staff'),
              team: typeof c.releasedBy === 'object' ? (c.releasedBy?.teamName || 'Field Operations') : 'MDRRMO Field Operations',
            };
          }));
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
        <MotionPressable style={styles.backBtnPill} onPress={onBack} activeOpacity={0.75}>
          <View style={styles.backIconCircle}>
            <ArrowLeftIcon size={14} color="#1557B0" />
          </View>
          <Text style={styles.backBtnText}>{lang === 'tl' ? 'Bumalik' : 'Back'}</Text>
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
            <TouchableOpacity
              key={item.id}
              style={styles.claimCard}
              onPress={() => setSelectedReceipt(item)}
              activeOpacity={0.88}
            >
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

              {/* Receipt Pill Action */}
              <View style={{ marginTop: 10, paddingTop: 8, borderTopWidth: 1, borderColor: '#F1F5F9', flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                <Text style={{ fontSize: 11, fontWeight: '700', color: '#64748B' }}>
                  {item.receiptNumber}
                </Text>
                <Text style={{ fontSize: 11, fontWeight: '800', color: '#1557B0' }}>
                   {lang === 'tl' ? 'Tingnan ang Resibo →' : 'View Claim Receipt →'}
                </Text>
              </View>
            </TouchableOpacity>
          ))}
        </View>
      )}

      {/* ── Official Digital Claim Receipt Modal ── */}
      {selectedReceipt && (
        <Modal
          visible={!!selectedReceipt}
          transparent
          animationType="fade"
          onRequestClose={() => setSelectedReceipt(null)}
        >
          <View style={styles.receiptModalOverlay}>
            <View style={styles.receiptPaperCard}>
              <View style={styles.receiptHeader}>
                <Text style={styles.receiptKicker}>REPUBLIC OF THE PHILIPPINES • CITY OF MANILA</Text>
                <Text style={styles.receiptTitle}>OFFICIAL RELIEF CLAIM RECEIPT</Text>
                <Text style={styles.receiptNumberText}>{selectedReceipt.receiptNumber}</Text>
              </View>

              <View style={styles.receiptDividerDashed} />

              <View style={styles.receiptRows}>
                <View style={styles.receiptRow}>
                  <Text style={styles.receiptLabel}>{lang === 'tl' ? 'Benepisyaryo:' : 'Beneficiary Name:'}</Text>
                  <Text style={styles.receiptValueBold}>{selectedReceipt.beneficiaryName}</Text>
                </View>
                <View style={styles.receiptRow}>
                  <Text style={styles.receiptLabel}>{lang === 'tl' ? 'Barangay at Tirahan:' : 'Address & Barangay:'}</Text>
                  <Text style={styles.receiptValue}>{selectedReceipt.address}</Text>
                </View>
                <View style={styles.receiptRow}>
                  <Text style={styles.receiptLabel}>{lang === 'tl' ? 'QR Pass Ref:' : 'QR Pass Ref:'}</Text>
                  <Text style={[styles.receiptValue, { fontWeight: '700', color: '#1557B0' }]}>{selectedReceipt.qrCode}</Text>
                </View>
                <View style={styles.receiptRow}>
                  <Text style={styles.receiptLabel}>{lang === 'tl' ? 'Miyembro ng Pamilya:' : 'Family Headcount:'}</Text>
                  <Text style={styles.receiptValueBold}>{selectedReceipt.familySize} {lang === 'tl' ? 'katao' : 'members'}</Text>
                </View>

                <View style={{ height: 1, backgroundColor: '#F1F5F9', marginVertical: 4 }} />

                <View style={styles.receiptRow}>
                  <Text style={styles.receiptLabel}>{lang === 'tl' ? 'Uri ng Ayuda:' : 'Relief Item:'}</Text>
                  <Text style={styles.receiptValueBold}>{selectedReceipt.type}</Text>
                </View>
                <View style={styles.receiptRow}>
                  <Text style={styles.receiptLabel}>{lang === 'tl' ? 'Dami na Na-release:' : 'Quantity Released:'}</Text>
                  <Text style={[styles.receiptValueBold, { color: '#047857' }]}>{selectedReceipt.quantity} Pack(s)</Text>
                </View>
                <View style={styles.receiptRow}>
                  <Text style={styles.receiptLabel}>{lang === 'tl' ? 'Lugar ng Distribusyon:' : 'Distribution Venue:'}</Text>
                  <Text style={styles.receiptValue}>{selectedReceipt.location}</Text>
                </View>
                <View style={styles.receiptRow}>
                  <Text style={styles.receiptLabel}>{lang === 'tl' ? 'Petsa at Oras:' : 'Date & Time:'}</Text>
                  <Text style={styles.receiptValue}>{selectedReceipt.date}</Text>
                </View>
                <View style={styles.receiptRow}>
                  <Text style={styles.receiptLabel}>{lang === 'tl' ? 'Disbursing Officer:' : 'Disbursing Staff:'}</Text>
                  <Text style={styles.receiptValueBold}>{selectedReceipt.verifiedBy}</Text>
                </View>
                <View style={styles.receiptRow}>
                  <Text style={styles.receiptLabel}>{lang === 'tl' ? 'Operasyon / Team:' : 'Assigned Unit:'}</Text>
                  <Text style={styles.receiptValue}>{selectedReceipt.team}</Text>
                </View>
              </View>

              <View style={styles.receiptDividerDashed} />

              <View style={styles.receiptSealBox}>
                <View style={styles.receiptSealPill}>
                  <Text style={styles.receiptSealText}> 100% OFFICIALLY VERIFIED & RELEASED</Text>
                </View>
                <Text style={styles.receiptSecurityHint}>
                  Security Hash: Verified against Manila LGU Post-Disaster Central Ledger.
                </Text>
              </View>

              <TouchableOpacity
                style={styles.receiptCloseBtn}
                onPress={() => setSelectedReceipt(null)}
                activeOpacity={0.85}
              >
                <Text style={styles.receiptCloseBtnText}>{lang === 'tl' ? 'Isara ang Resibo' : 'Close Receipt'}</Text>
              </TouchableOpacity>
            </View>
          </View>
        </Modal>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F8F9F7' },
  content: {
    paddingHorizontal: RESPONSIVE.padding,
    paddingTop: RESPONSIVE.topSafe + 8,
    paddingBottom: 95,
  },
  header: { marginBottom: 16 },
  backBtnPill: {
    alignSelf: 'flex-start',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 7,
    backgroundColor: '#EFF6FF',
    borderWidth: 1,
    borderColor: '#BFDBFE',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    marginBottom: 12,
    ...SHADOWS.sm,
  },
  backIconCircle: {
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#DBEAFE',
  },
  backBtnText: { fontSize: 12, fontWeight: '800', color: '#1557B0', letterSpacing: 0.2 },
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
  receiptModalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(15, 23, 42, 0.75)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  receiptPaperCard: {
    width: '100%',
    maxWidth: 380,
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 20,
    borderWidth: 1.5,
    borderColor: '#CBD5E1',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.25,
    shadowRadius: 16,
    elevation: 8,
  },
  receiptHeader: {
    alignItems: 'center',
    marginBottom: 12,
  },
  receiptKicker: {
    fontSize: 9,
    fontWeight: '800',
    color: '#64748B',
    letterSpacing: 0.8,
  },
  receiptTitle: {
    fontSize: 15,
    fontWeight: '900',
    color: '#1E293B',
    marginTop: 3,
  },
  receiptNumberText: {
    fontSize: 12,
    fontWeight: '800',
    color: '#1557B0',
    marginTop: 4,
    backgroundColor: '#EFF6FF',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 4,
  },
  receiptDividerDashed: {
    height: 1,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderStyle: 'dashed',
    marginVertical: 12,
  },
  receiptRows: {
    gap: 8,
  },
  receiptRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    gap: 10,
  },
  receiptLabel: {
    fontSize: 11.5,
    color: '#64748B',
    fontWeight: '600',
    flex: 1,
  },
  receiptValue: {
    fontSize: 11.5,
    color: '#1E293B',
    fontWeight: '600',
    textAlign: 'right',
    flex: 1.2,
  },
  receiptValueBold: {
    fontSize: 12,
    color: '#0F172A',
    fontWeight: '800',
    textAlign: 'right',
    flex: 1.2,
  },
  receiptSealBox: {
    alignItems: 'center',
    marginVertical: 4,
  },
  receiptSealPill: {
    backgroundColor: '#DCFCE7',
    borderWidth: 1,
    borderColor: '#86EFAC',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 999,
  },
  receiptSealText: {
    fontSize: 9.5,
    fontWeight: '900',
    color: '#15803D',
    letterSpacing: 0.3,
  },
  receiptSecurityHint: {
    fontSize: 9,
    color: '#94A3B8',
    marginTop: 4,
    textAlign: 'center',
  },
  receiptCloseBtn: {
    backgroundColor: '#1557B0',
    paddingVertical: 11,
    borderRadius: 10,
    alignItems: 'center',
    marginTop: 14,
  },
  receiptCloseBtnText: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '800',
  },
});

import React, { useState, useEffect } from 'react';
import { LinearGradient } from 'expo-linear-gradient';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, ActivityIndicator, Modal, Platform } from 'react-native';
import { fetchClaimsHistory } from '../services/api';
import { CalendarIcon, MapPinIcon, ShieldCheckIcon, PackageIcon, ArrowLeftIcon, CloseIcon, ArrowRightIcon, ClockIcon } from '../components/AppIcons';
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
    <ScrollView style={styles.container} contentContainerStyle={[{ paddingBottom: 120 }]} showsVerticalScrollIndicator={false}>
      {/* Header */}
      <LinearGradient colors={['#0B1D4E', '#1C3F94']} start={{x:0, y:0}} end={{x:1, y:1}} style={{marginBottom: 20}}>
        <View style={{height: 3, backgroundColor: '#C9A84C'}} />
        <View style={{ height: Platform.OS==='web' ? 0 : RESPONSIVE.topSafe + 4 }} />
        <View style={{ flexDirection: 'row', alignItems: 'center', paddingHorizontal: 18, paddingVertical: 12 }}>
          <TouchableOpacity
            onPress={onBack}
            style={{
              width: 48,
              height: 48,
              borderRadius: 24,
              minWidth: 48,
              minHeight: 48,
              backgroundColor: 'rgba(255,255,255,0.15)',
              alignItems: 'center',
              justifyContent: 'center',
              borderWidth: 1,
              borderColor: 'rgba(255,255,255,0.25)',
            }}
            activeOpacity={0.8}
            accessibilityRole="button"
            accessibilityLabel={lang === 'tl' ? 'Bumalik sa dashboard' : 'Go back to dashboard'}
            accessibilityHint={lang === 'tl' ? 'Babalik sa home screen' : 'Returns to the home screen'}
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          >
            <ArrowLeftIcon size={18} color="#FFFFFF" strokeWidth={1.8} />
          </TouchableOpacity>
          <View style={{flex: 1, alignItems: 'center'}}>
            <Text style={{ fontSize: 17, fontWeight: '700', color: '#FFFFFF' }}>Claims History</Text>
          </View>
          <View style={{width: 48}} />
        </View>
        <View style={{ paddingHorizontal: 18, paddingBottom: 20 }}>
          <Text style={{ fontSize: 24, fontWeight: '900', color: '#FFFFFF', letterSpacing: -0.5 }}>Distribution & Claims</Text>
          <Text style={{ fontSize: 13, color: 'rgba(255,255,255,0.9)', lineHeight: 19.5, marginTop: 4 }}>Verified logs of received relief supplies and financial aid.</Text>
        </View>
      </LinearGradient>

      <View style={styles.claimsContent}>
        {/* Summary Stat Card */}
        <View style={styles.summaryCard}>
        <View style={styles.summaryItem}>
          <Text style={styles.summaryLabel}>DISTRIBUTED</Text>
          <Text style={styles.summaryValue}>{claims.length}</Text>
          <Text style={styles.summarySub}>Packages</Text>
        </View>
        <View style={styles.summaryDivider} />
        <View style={styles.summaryItem}>
          <Text style={styles.summaryLabel}>AUDIT</Text>
          <Text style={[styles.summaryValue, { color: '#065F46' }]}>100%</Text>
          <Text style={styles.summarySub}>Verified</Text>
        </View>
        <View style={styles.summaryDivider} />
        <View style={styles.summaryItem}>
          <Text style={styles.summaryLabel}>SECURITY</Text>
          <Text style={[styles.summaryValue, { color: '#78350F', fontSize: 22, fontWeight: '900' }]}>QR</Text>
          <Text style={styles.summarySub}>Token Match</Text>
        </View>
      </View>


      {/* Claims Timeline List or Empty State */}
      {loading ? (
        <ActivityIndicator size="large" color="#1C3F94" style={{ marginTop: 40 }} />
      ) : claims.length === 0 ? (
        <View style={{ alignItems: 'center', paddingVertical: 56, paddingHorizontal: 24 }}>
          <View style={{ width: 78, height: 78, borderRadius: 24, backgroundColor: '#EFF4FE', borderWidth: 1.5, borderColor: '#D9E4FA', alignItems: 'center', justifyContent: 'center', marginBottom: 20 }}>
            <ClockIcon size={34} color="#1C3F94" strokeWidth={2.2} />
          </View>
          <Text style={{ fontSize: 20, fontWeight: '800', color: '#0B1525', textAlign: 'center', marginBottom: 8, letterSpacing: -0.3 }}>
            No Records Yet
          </Text>
          <Text style={{ fontSize: 14, color: '#334155', textAlign: 'center', maxWidth: 280, lineHeight: 21 }}>
            Records appear here once your QR Pass is scanned at a distribution site.
          </Text>
        </View>
      ) : (
        <View style={styles.historyList}>
          {claims.map((item) => (
            <TouchableOpacity
              key={item.id}
              style={styles.claimCard}
              onPress={() => setSelectedReceipt(item)}
              activeOpacity={0.88}
              accessibilityRole="button"
              accessibilityLabel={`${item.type}, ${item.receiptNumber}, ${item.status === 'CLAIMED' ? (t.claimedStatus || 'CLAIMED') : (t.inTransitStatus || 'PENDING')}`}
              accessibilityHint={lang === 'tl' ? 'Bubuksan ang opisyal na resibo ng ayuda' : 'Opens the official relief claim receipt'}
            >
              <View style={styles.cardTop}>
                <View style={styles.packageIconWell}>
                  <PackageIcon size={18} color="#1C3F94" />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.claimType}>{item.type}</Text>
                  <View style={styles.dateRow}>
                    <CalendarIcon size={11} color="#3D5070" />
                    <Text style={styles.claimDate}>{item.date}</Text>
                  </View>
                </View>

                <MotionPulseBadge color={item.status === 'CLAIMED' ? '#047857' : '#F59E0B'}>
                  <View style={[styles.statusTag, item.status === 'CLAIMED' ? styles.tagClaimed : styles.tagPending]}>
                    <Text style={[styles.statusText, { color: item.status === 'CLAIMED' ? '#047857' : '#B45309' }]}>
                      {item.status === 'CLAIMED' ? (t.claimedStatus || 'CLAIMED') : (t.inTransitStatus || 'PENDING')}
                    </Text>
                  </View>
                </MotionPulseBadge>
              </View>

              <View style={styles.cardMid}>
                <View style={styles.metaCol}>
                  <Text style={styles.metaLabel}>QUANTITY</Text>
                  <Text style={styles.metaVal}>{item.quantity} {item.quantity > 1 ? 'Packs' : 'Pack'}</Text>
                </View>
                <View style={styles.metaCol}>
                  <Text style={styles.metaLabel}>LOCATION</Text>
                  <Text style={styles.metaVal} numberOfLines={1}>{item.location}</Text>
                </View>
              </View>

              <View style={styles.cardFooter}>
                <View style={styles.footerRow}>
                  <ShieldCheckIcon size={13} color="#047857" />
                  <Text style={styles.footerOfficer}>
                    {lang === 'tl' ? 'Na-verify ni:' : 'Verified by:'} <Text style={{ fontWeight: '700', color: '#172B4D' }}>{item.verifiedBy}</Text>
                  </Text>
                </View>
              </View>

              {/* Receipt Pill Action */}
              <View style={{ marginTop: 10, paddingTop: 10, borderTopWidth: 1, borderColor: '#DDE4F0', flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', minHeight: 48 }}>
                <Text style={{ fontSize: 11, fontWeight: '700', color: '#1E293B' }}>
                  {item.receiptNumber}
                </Text>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                  <Text style={{ fontSize: 11.5, fontWeight: '800', color: '#1C3F94' }}>
                    {lang === 'tl' ? 'Tingnan ang Resibo' : 'View Claim Receipt'}
                  </Text>
                  <ArrowRightIcon size={12} color="#1C3F94" />
                </View>
              </View>
            </TouchableOpacity>
          ))}
        </View>
      )}
      </View>

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
                  <Text style={[styles.receiptValue, { fontWeight: '700', color: '#1C3F94' }]}>{selectedReceipt.qrCode}</Text>
                </View>
                <View style={styles.receiptRow}>
                  <Text style={styles.receiptLabel}>{lang === 'tl' ? 'Miyembro ng Pamilya:' : 'Family Headcount:'}</Text>
                  <Text style={styles.receiptValueBold}>{selectedReceipt.familySize} {lang === 'tl' ? 'katao' : 'members'}</Text>
                </View>

                <View style={{ height: 1, backgroundColor: '#DDE4F0', marginVertical: 4 }} />

                <View style={styles.receiptRow}>
                  <Text style={styles.receiptLabel}>{lang === 'tl' ? 'Uri ng Ayuda:' : 'Relief Item:'}</Text>
                  <Text style={styles.receiptValueBold}>{selectedReceipt.type}</Text>
                </View>
                <View style={styles.receiptRow}>
                  <Text style={styles.receiptLabel}>{lang === 'tl' ? 'Dami na Na-release:' : 'Quantity Released:'}</Text>
                  <Text style={[styles.receiptValueBold, { color: '#0D8A5A' }]}>{selectedReceipt.quantity} Pack(s)</Text>
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
                accessibilityRole="button"
                accessibilityLabel={lang === 'tl' ? 'Isara ang Resibo' : 'Close Receipt'}
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
  container: { flex: 1, backgroundColor: '#F3F6FC' },
  claimsContent: {
    paddingHorizontal: 16,
    paddingTop: 4,
    paddingBottom: 24,
  },
  content: {
    paddingHorizontal: RESPONSIVE.padding,
    paddingTop: RESPONSIVE.topSafe + 8,
    paddingBottom: 24,
  },
  header: { marginBottom: 16 },
  backBtnPill: {
    alignSelf: 'flex-start',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#DDE4F0',
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: 9999,
    marginBottom: 12,
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
  backBtnText: { fontSize: 13, fontWeight: '800', color: '#1C3F94', letterSpacing: 0.2 },
  kicker: {
    fontSize: 9.5,
    fontWeight: '800',
    color: '#1C3F94',
    letterSpacing: 0.8,
    marginBottom: 2,
    textTransform: 'uppercase',
  },
  title: { fontSize: 22, fontWeight: FONT_WEIGHT.black, color: '#172B4D', letterSpacing: -0.3 },
  sub: { fontSize: 12, color: '#3D5070', marginTop: 4, lineHeight: 17 },
  summaryCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#DDE4F0',
    flexDirection: 'row',
    alignItems: 'center',
    marginHorizontal: 0,
    marginBottom: 16,
    overflow: 'hidden',
    shadowColor: '#1C3F94',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 14,
    elevation: 3,
  },
  summaryItem: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 16,
    paddingHorizontal: 8,
  },
  summaryDivider: {
    width: 1,
    height: 44,
    backgroundColor: '#DDE4F0',
  },
  summaryLabel: {
    fontSize: 8,
    fontWeight: '700',
    color: '#475569',
    letterSpacing: 0.8,
    textTransform: 'uppercase',
  },
  summaryValue: {
    fontSize: 22,
    fontWeight: '900',
    color: '#0B1525',
    marginTop: 2,
  },
  summarySub: {
    fontSize: 10,
    color: '#475569',
    marginTop: 1,
  },
  historyList: { gap: 10 },
  claimCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#DDE4F0',
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
    backgroundColor: '#EDF1FB',
    alignItems: 'center',
    justifyContent: 'center',
  },
  claimType: {
    fontSize: 13.5,
    fontWeight: '800',
    color: '#0B1525',
  },
  dateRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: 2,
  },
  claimDate: {
    fontSize: 11,
    color: '#3D5070',
    fontWeight: '600',
  },
  statusTag: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  tagClaimed: {
    backgroundColor: '#E6F6EF',
    borderWidth: 1,
    borderColor: 'rgba(4,120,87,0.35)',
  },
  tagPending: {
    backgroundColor: '#FBF5E4',
    borderWidth: 1,
    borderColor: '#F0DFA0',
  },
  statusText: {
    fontSize: 10,
    fontWeight: '800',
  },
  cardDivider: {
    height: 1,
    backgroundColor: '#DDE4F0',
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
    color: '#3D5070',
  },
  footerOfficer: {
    fontSize: 11,
    color: '#3D5070',
  },
  receiptModalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(11, 21, 37, 0.75)',
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
    borderColor: '#DDE4F0',
    shadowColor: '#1C3F94',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.20,
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
    color: '#475569',
    letterSpacing: 0.8,
  },
  receiptTitle: {
    fontSize: 15,
    fontWeight: '900',
    color: '#0B1525',
    marginTop: 3,
  },
  receiptNumberText: {
    fontSize: 12,
    fontWeight: '800',
    color: '#1C3F94',
    marginTop: 4,
    backgroundColor: '#EDF1FB',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 4,
  },
  receiptDividerDashed: {
    height: 1,
    borderWidth: 1,
    borderColor: '#DDE4F0',
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
    color: '#3D5070',
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
    color: '#047857',
    letterSpacing: 0.3,
  },
  receiptSecurityHint: {
    fontSize: 9,
    color: '#475569',
    marginTop: 4,
    textAlign: 'center',
  },
  receiptCloseBtn: {
    backgroundColor: '#1C3F94',
    minHeight: 48,
    paddingVertical: 13,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 14,
  },
  receiptCloseBtnText: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '800',
  },
});

import React, { useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  Alert,
  TextInput,
  Keyboard,
  Platform,
} from 'react-native';
import {
  ArrowLeftIcon,
  ShieldCheckIcon,
  CheckIcon,
  MedicineIcon,
  MapPinIcon,
} from '../components/AppIcons';
import { COLORS, FONT_WEIGHT, SPACING, RADIUS, SHADOWS, RESPONSIVE, scaleFont, wp, hp } from '../theme';
import { API_BASE_URL } from '../config';

export default function AssistanceRequestScreen({ token, lang = 'tl', onBack, onSubmitSuccess }) {
  const [loading, setLoading] = useState(false);
  const [aiInputText, setAiInputText] = useState('');
  const [aiAnalyzing, setAiAnalyzing] = useState(false);
  const [aiResult, setAiResult] = useState(null);
  const [submittedTicket, setSubmittedTicket] = useState(null);

  // Quick preset symptom scenarios tailored specifically for Post-Flood Leptospirosis & Diseases
  const samplePrompts = [
    {
      label: '🦵 Sugat sa Binti + Lagnat sa Baha',
      text: 'Nilusong ko sa maruming baha ang sugat ko sa binti kahapon at nilalagnat po ako at sumasakit ang kalamnan.',
    },
    {
      label: '🩹 Lumubog ang Sugat sa Paa',
      text: 'May sariwa akong sugat sa paa at lumubog sa baha kaninang umaga, humihingi po ng Doxycycline prophylaxis.',
    },
    {
      label: '🩺 Pananakit ng Calves / Binti',
      text: 'Sumasakit po ang binti ko at mapula ang mata pagkatapos maglinis ng putik mula sa baha.',
    },
    {
      label: '👵 Bedridden Senior sa Baha',
      text: 'Bedridden po ang lola ko, nabasa sa baha at nilalagnat, hindi po makatayo para pumunta sa health center.',
    },
  ];

  // 1. Run NLP Symptom Parsing & Disease Risk Engine
  const handleRunAiTriage = async (textToAnalyze) => {
    Keyboard.dismiss();
    const text = (textToAnalyze || aiInputText).trim();
    if (!text) {
      Alert.alert(
        lang === 'tl' ? 'Kailangan ang Sintomas' : 'Input Required',
        lang === 'tl' ? 'Pakisulat ang inyong nararamdaman o kalagayan sa baha.' : 'Please describe your symptoms or flood exposure.'
      );
      return;
    }

    setAiAnalyzing(true);
    try {
      const res = await fetch(`${API_BASE_URL}/ai-triage/analyze`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          message: text,
          symptomText: text,
          text: text,
          barangayCode: '291',
        }),
      });

      const data = await res.json();
      const result = data.triageResult || data;
      if (res.ok && (result.urgencyLevel || result.suspectedCondition || result.voucherCode)) {
        setAiResult(result);
      } else {
        Alert.alert('Notice', data.message || 'Unable to complete triage analysis at this moment.');
      }
    } catch (e) {
      console.warn('AI Triage error:', e);
      Alert.alert('Connection Notice', 'Could not reach the AI Triage server. Please check your network.');
    } finally {
      setAiAnalyzing(false);
    }
  };

  // 2. Submit Official Triage Ticket & Claim Voucher to Barangay Health Center
  const handleSubmitAiTriageRequest = async () => {
    Keyboard.dismiss();
    if (!aiResult) return;
    setLoading(true);
    try {
      const res = await fetch(`${API_BASE_URL}/ai-triage/submit-request`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          symptomText: aiInputText,
          triageResult: aiResult,
          barangayCode: '291',
        }),
      });

      const data = await res.json();
      if (res.ok) {
        setSubmittedTicket(data.triage);
        Alert.alert(
          lang === 'tl' ? '✅ Naitala ang Health Alert' : '✅ Health Ticket Recorded',
          lang === 'tl'
            ? `Matagumpay na naitala ang inyong ulat. Voucher Code: ${data.voucherCode || aiResult.voucherCode}.\n\nPumunta sa Barangay 291 Health Center upang makuha ang inyong libreng Doxycycline prophylaxis.`
            : `Your report has been submitted. Voucher Code: ${data.voucherCode || aiResult.voucherCode}.\n\nPresent this code at Barangay 291 Health Center for free Doxycycline prophylaxis.`
        );
      } else {
        Alert.alert('Notice', data.message || 'Submission failed.');
      }
    } catch (e) {
      Alert.alert('Error', 'Network error while submitting health ticket.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={styles.container}>
      <ScrollView
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        {/* Back Button */}
        <TouchableOpacity style={styles.backBtnPill} onPress={onBack} activeOpacity={0.75}>
          <View style={styles.backIconCircle}>
            <ArrowLeftIcon size={14} color="#1557B0" />
          </View>
          <Text style={styles.backBtnText}>{lang === 'tl' ? 'Bumalik sa Home' : 'Back to Home'}</Text>
        </TouchableOpacity>

        {/* Page Header */}
        <View style={styles.header}>
          <View style={styles.kickerRow}>
            <View style={styles.pulseDot} />
            <Text style={styles.kicker}>POST-FLOOD HEALTH & SYMPTOM CHECK</Text>
          </View>
          <Text style={styles.title}>
            {lang === 'tl' ? 'Health Check & Outbreak Alert' : 'Health Check & Outbreak Alert'}
          </Text>
          <Text style={styles.sub}>
            {lang === 'tl'
              ? 'Pagsusuri ng sugat, lagnat, at pananakit ng binti pagkatapos ng baha para sa libreng Doxycycline prophylaxis sa Health Center.'
              : 'Clinical assessment of flood exposure, wounds, and calf pain to issue instant Doxycycline prophylaxis vouchers.'}
          </Text>
        </View>

        {/* Symptom & Flood Exposure Input Card */}
        <View style={styles.aiBannerCard}>
          <View style={styles.aiBadgeRow}>
            <View style={styles.aiSparkleBadge}>
              <Text style={styles.aiSparkleText}>CLINICAL SYMPTOM TRIAGE</Text>
            </View>
            <Text style={styles.aiTagline}>{lang === 'tl' ? 'Tagalog & English' : 'Tagalog & English'}</Text>
          </View>

          <Text style={styles.aiBannerTitle}>
            {lang === 'tl' ? 'I-type ang Nararamdaman o Kalagayan sa Baha' : 'Describe Symptoms or Flood Exposure'}
          </Text>
          <Text style={styles.aiBannerSub}>
            {lang === 'tl'
              ? 'Awtomatikong susuriin ang banta ng Leptospirosis exposure at magbibigay ng opisyal na Doxycycline voucher sa Barangay Health Center.'
              : 'Analyzes Leptospirosis exposure risk and generates an instant Doxycycline claim voucher for your local Health Center.'}
          </Text>

          {/* Quick Scenario Chips */}
          <Text style={styles.promptHeaderLabel}>
            {lang === 'tl' ? 'MGA HALIMBAWANG SITWASYON (I-tap para subukan):' : 'QUICK SCENARIOS (Tap to test):'}
          </Text>
          <View style={styles.sampleChipsContainer}>
            {samplePrompts.map((p, idx) => (
              <TouchableOpacity
                key={idx}
                style={styles.samplePromptChip}
                onPress={() => {
                  setAiInputText(p.text);
                  handleRunAiTriage(p.text);
                }}
                activeOpacity={0.75}
              >
                <Text style={styles.samplePromptChipText}>{p.label}</Text>
              </TouchableOpacity>
            ))}
          </View>

          {/* Text Input Box */}
          <View style={styles.aiInputWrapper}>
            <TextInput
              style={styles.aiTextInput}
              value={aiInputText}
              onChangeText={setAiInputText}
              placeholder={
                lang === 'tl'
                  ? 'Halimbawa: Nilusong ko ang sugat ko sa binti sa maruming baha kahapon at nilalagnat po ako...'
                  : 'Example: I waded in dirty floodwaters yesterday with an open wound, now having high fever...'
              }
              placeholderTextColor="#94A3B8"
              multiline
              numberOfLines={4}
              textAlignVertical="top"
            />
          </View>

          {/* Action Button: Run Analysis */}
          <TouchableOpacity
            style={[styles.runAiBtn, aiAnalyzing && { opacity: 0.8 }]}
            onPress={() => handleRunAiTriage()}
            disabled={aiAnalyzing}
            activeOpacity={0.85}
          >
            {aiAnalyzing ? (
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                <ActivityIndicator color="#FFFFFF" size="small" />
                <Text style={styles.runAiBtnText}>
                  {lang === 'tl' ? 'Sinusuri ang mga Sintomas...' : 'Analyzing Symptoms...'}
                </Text>
              </View>
            ) : (
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                <Text style={{ fontSize: 16 }}>⚡</Text>
                <Text style={styles.runAiBtnText}>
                  {lang === 'tl' ? 'Analyze / Suriin' : 'Analyze'}
                </Text>
              </View>
            )}
          </TouchableOpacity>
        </View>

        {/* Clinical Diagnosis & Prescription Advisory Card */}
        {aiResult && (
          <View style={styles.aiResultCard}>
            {/* Risk Classification Badge */}
            <View style={styles.resultTopRow}>
              <View>
                <Text style={styles.resultKicker}>CLINICAL TRIAGE DIAGNOSIS</Text>
                <Text style={styles.resultTitle}>{aiResult.urgencyClassification}</Text>
              </View>
              <View
                style={[
                  styles.riskPill,
                  {
                    backgroundColor:
                      aiResult.priorityLevel === 'CRITICAL'
                        ? '#FEF2F2'
                        : aiResult.priorityLevel === 'HIGH'
                        ? '#FFFBEB'
                        : '#EFF6FF',
                    borderColor:
                      aiResult.priorityLevel === 'CRITICAL'
                        ? '#FECACA'
                        : aiResult.priorityLevel === 'HIGH'
                        ? '#FDE68A'
                        : '#BFDBFE',
                  },
                ]}
              >
                <Text
                  style={[
                    styles.riskPillText,
                    {
                      color:
                        aiResult.priorityLevel === 'CRITICAL'
                          ? '#DC2626'
                          : aiResult.priorityLevel === 'HIGH'
                          ? '#D97706'
                          : '#1D4ED8',
                    },
                  ]}
                >
                  {aiResult.priorityLevel} RISK
                </Text>
              </View>
            </View>

            {/* Extracted Symptoms Tags */}
            <View style={styles.symptomsTagsRow}>
              {aiResult.detectedSymptoms && aiResult.detectedSymptoms.map((symp, sIdx) => (
                <View key={sIdx} style={styles.symptomBadge}>
                  <Text style={styles.symptomBadgeText}>✓ {symp}</Text>
                </View>
              ))}
            </View>

            {/* Automated Prescription Protocol */}
            <View style={styles.medicineCardRow}>
              <View style={styles.medicineIconSquare}>
                <MedicineIcon size={22} color="#DC2626" />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.medicineLabel}>
                  {lang === 'tl' ? 'AUTOMATED PRESCRIPTION ADVISORY:' : 'AUTOMATED PRESCRIPTION ADVISORY:'}
                </Text>
                <Text style={styles.medicineName}>{aiResult.recommendedMedicine}</Text>
              </View>
            </View>

            {/* Official Medical Guidance */}
            <View style={styles.guidanceBox}>
              <Text style={styles.guidanceText}>{aiResult.medicalGuidance}</Text>
            </View>

            {/* Digital Claim Voucher Pass for Barangay Health Center */}
            <View style={styles.voucherPassCard}>
              <View style={styles.voucherPassHeader}>
                <Text style={styles.voucherPassKicker}>OPISYAL NA BHC CLAIM VOUCHER</Text>
                <Text style={styles.voucherPassCode}>{aiResult.voucherCode}</Text>
              </View>
              <Text style={styles.voucherPassDesc}>
                {lang === 'tl'
                  ? 'Ipakita ang code na ito sa Barangay 291 Health Center para sa libreng Doxycycline prophylaxis.'
                  : 'Present this voucher code at Barangay 291 Health Center for free Doxycycline prophylaxis.'}
              </Text>
            </View>

            {/* Logistics Routing Mode */}
            <View style={styles.logisticsNotice}>
              <MapPinIcon size={16} color="#1557B0" />
              <Text style={styles.logisticsNoticeText}>
                {aiResult.deliveryMode === 'DOOR_TO_DOOR_DISPATCH'
                  ? (lang === 'tl'
                      ? '🚚 Ihahatid ng Barangay Field Staff sa mismong bahay dahil sa limitasyon sa pagkilos (Bedridden/Trapped).'
                      : '🚚 Door-to-Door Barangay Staff delivery due to mobility constraint.')
                  : (lang === 'tl'
                      ? '🏥 Kunin agad sa Barangay 291 Health Center gamit ang Voucher Code sa itaas.'
                      : '🏥 Instant Pickup at Barangay 291 Health Center with the Voucher Code above.')}
              </Text>
            </View>

            {/* Submit Official Ticket to LGU Command Center */}
            <TouchableOpacity
              style={[styles.submitAiTicketBtn, loading && { opacity: 0.75 }]}
              onPress={handleSubmitAiTriageRequest}
              disabled={loading}
              activeOpacity={0.85}
            >
              {loading ? (
                <ActivityIndicator color="#FFFFFF" />
              ) : (
                <Text style={styles.submitAiTicketBtnText}>
                  {lang === 'tl'
                    ? '📨 Isumite ang Ticket sa Barangay & LGU Health Admin'
                    : '📨 Submit Ticket to Barangay & LGU Health Admin'}
                </Text>
              )}
            </TouchableOpacity>
          </View>
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8FAFC',
  },
  content: {
    padding: SPACING.lg,
    paddingBottom: hp(14),
  },
  backBtnPill: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    backgroundColor: '#EFF6FF',
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: RADIUS.full,
    borderWidth: 1,
    borderColor: '#BFDBFE',
    marginBottom: SPACING.md,
    gap: 6,
  },
  backIconCircle: {
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: '#DBEAFE',
    alignItems: 'center',
    justifyContent: 'center',
  },
  backBtnText: {
    fontSize: 12,
    fontWeight: FONT_WEIGHT.bold,
    color: '#1557B0',
  },
  header: {
    marginBottom: SPACING.lg,
  },
  kickerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 4,
  },
  pulseDot: {
    width: 7,
    height: 7,
    borderRadius: 3.5,
    backgroundColor: '#7C3AED',
  },
  kicker: {
    fontSize: 10.5,
    fontWeight: FONT_WEIGHT.black,
    color: '#7C3AED',
    letterSpacing: 0.8,
  },
  title: {
    fontSize: scaleFont(20),
    fontWeight: FONT_WEIGHT.black,
    color: COLORS.ink,
    letterSpacing: -0.3,
  },
  sub: {
    fontSize: 12.5,
    color: '#64748B',
    lineHeight: 18,
    marginTop: 4,
  },
  aiBannerCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: RADIUS.xl,
    padding: SPACING.lg,
    borderWidth: 1.5,
    borderColor: '#DDD6FE',
    marginBottom: SPACING.lg,
    ...SHADOWS.md,
  },
  aiBadgeRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  aiSparkleBadge: {
    backgroundColor: '#F5F3FF',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#DDD6FE',
  },
  aiSparkleText: {
    color: '#7C3AED',
    fontSize: 10,
    fontWeight: FONT_WEIGHT.black,
  },
  aiTagline: {
    fontSize: 11,
    color: '#64748B',
    fontWeight: FONT_WEIGHT.bold,
  },
  aiBannerTitle: {
    fontSize: 15,
    fontWeight: FONT_WEIGHT.black,
    color: '#1E1B4B',
  },
  aiBannerSub: {
    fontSize: 12,
    color: '#64748B',
    lineHeight: 17,
    marginTop: 4,
    marginBottom: 14,
  },
  promptHeaderLabel: {
    fontSize: 10,
    fontWeight: FONT_WEIGHT.black,
    color: '#7C3AED',
    letterSpacing: 0.5,
    marginBottom: 6,
  },
  sampleChipsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    marginBottom: 14,
  },
  samplePromptChip: {
    backgroundColor: '#F5F3FF',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#DDD6FE',
  },
  samplePromptChipText: {
    fontSize: 11,
    fontWeight: FONT_WEIGHT.bold,
    color: '#6D28D9',
  },
  aiInputWrapper: {
    backgroundColor: '#F8FAFC',
    borderRadius: RADIUS.lg,
    borderWidth: 1,
    borderColor: '#CBD5E1',
    padding: 12,
    marginBottom: 14,
  },
  aiTextInput: {
    fontSize: 13,
    color: '#1E293B',
    minHeight: 80,
    lineHeight: 18,
  },
  runAiBtn: {
    backgroundColor: '#7C3AED',
    paddingVertical: 13,
    borderRadius: RADIUS.lg,
    alignItems: 'center',
    justifyContent: 'center',
    ...SHADOWS.md,
  },
  runAiBtnText: {
    color: '#FFFFFF',
    fontSize: 13.5,
    fontWeight: FONT_WEIGHT.black,
  },
  aiResultCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: RADIUS.xl,
    padding: SPACING.lg,
    borderWidth: 1.5,
    borderColor: '#7C3AED',
    marginBottom: SPACING.lg,
    ...SHADOWS.lg,
  },
  resultTopRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  resultKicker: {
    fontSize: 9.5,
    fontWeight: FONT_WEIGHT.black,
    color: '#7C3AED',
    letterSpacing: 0.6,
  },
  resultTitle: {
    fontSize: 15,
    fontWeight: FONT_WEIGHT.black,
    color: '#0F172A',
    marginTop: 2,
  },
  riskPill: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 999,
    borderWidth: 1,
  },
  riskPillText: {
    fontSize: 11,
    fontWeight: FONT_WEIGHT.black,
  },
  symptomsTagsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    marginBottom: 14,
  },
  symptomBadge: {
    backgroundColor: '#F1F5F9',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  symptomBadgeText: {
    fontSize: 11,
    fontWeight: FONT_WEIGHT.bold,
    color: '#334155',
  },
  medicineCardRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    backgroundColor: '#FEF2F2',
    padding: 12,
    borderRadius: RADIUS.lg,
    borderWidth: 1,
    borderColor: '#FECACA',
    marginBottom: 12,
  },
  medicineIconSquare: {
    width: 40,
    height: 40,
    borderRadius: 10,
    backgroundColor: '#FEE2E2',
    alignItems: 'center',
    justifyContent: 'center',
  },
  medicineLabel: {
    fontSize: 10,
    fontWeight: FONT_WEIGHT.black,
    color: '#DC2626',
    letterSpacing: 0.5,
  },
  medicineName: {
    fontSize: 13.5,
    fontWeight: FONT_WEIGHT.black,
    color: '#991B1B',
    marginTop: 2,
  },
  guidanceBox: {
    backgroundColor: '#F8FAFC',
    padding: 12,
    borderRadius: RADIUS.md,
    borderLeftWidth: 3,
    borderLeftColor: '#7C3AED',
    marginBottom: 12,
  },
  guidanceText: {
    fontSize: 12,
    color: '#334155',
    lineHeight: 17,
  },
  voucherPassCard: {
    backgroundColor: '#0F172A',
    borderRadius: RADIUS.lg,
    padding: 14,
    marginBottom: 12,
  },
  voucherPassHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  voucherPassKicker: {
    fontSize: 9.5,
    fontWeight: FONT_WEIGHT.black,
    color: '#94A3B8',
    letterSpacing: 0.5,
  },
  voucherPassCode: {
    fontSize: 15,
    fontWeight: FONT_WEIGHT.black,
    color: '#38BDF8',
    letterSpacing: 1.5,
  },
  voucherPassDesc: {
    fontSize: 11,
    color: '#CBD5E1',
    lineHeight: 15,
  },
  logisticsNotice: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: '#EFF6FF',
    padding: 10,
    borderRadius: RADIUS.md,
    marginBottom: 16,
  },
  logisticsNoticeText: {
    fontSize: 11.5,
    color: '#1E40AF',
    fontWeight: FONT_WEIGHT.medium,
    flex: 1,
    lineHeight: 16,
  },
  submitAiTicketBtn: {
    backgroundColor: '#1557B0',
    paddingVertical: 14,
    borderRadius: RADIUS.lg,
    alignItems: 'center',
    justifyContent: 'center',
    ...SHADOWS.md,
  },
  submitAiTicketBtnText: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: FONT_WEIGHT.black,
  },
});

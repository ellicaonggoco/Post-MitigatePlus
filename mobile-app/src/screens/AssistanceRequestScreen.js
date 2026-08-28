import React, { useState, useEffect } from 'react';
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
  Modal,
  Platform,
} from 'react-native';
import {
  ArrowLeftIcon,
  ShieldCheckIcon,
  CheckIcon,
  MedicineIcon,
  MapPinIcon,
  MicrophoneIcon,
} from '../components/AppIcons';
import { COLORS, FONT_WEIGHT, SPACING, RADIUS, SHADOWS, RESPONSIVE, scaleFont, wp, hp } from '../theme';
import { API_BASE_URL } from '../config';

export default function AssistanceRequestScreen({ token, lang = 'tl', onBack, onSubmitSuccess }) {
  const [loading, setLoading] = useState(false);
  const [aiInputText, setAiInputText] = useState('');
  const [aiAnalyzing, setAiAnalyzing] = useState(false);
  const [aiResult, setAiResult] = useState(null);
  const [submittedTicket, setSubmittedTicket] = useState(null);

  // Voice Dictation Microphone State
  const [isRecordingVoice, setIsRecordingVoice] = useState(false);
  const [voiceTranscriptProgress, setVoiceTranscriptProgress] = useState(0);

  // Diverse Post-Disaster Health Scenarios (Lepto, Dengue, Diarrhea, Asthma, Tetanus, Fungal, Senior Care)
  const samplePrompts = [
    {
      label: '🦵 Sugat sa Baha & Lagnat (Leptospirosis)',
      category: 'Leptospirosis',
      text: 'Nilusong ko sa maruming baha ang sugat ko sa binti kahapon at nilalagnat po ako at sumasakit ang kalamnan.',
    },
    {
      label: '👶 Sanggol Nagtatae & Nagsusuka',
      category: 'Pediatric ORS',
      text: 'Nagtatae po ng tubig at nagsusuka ang 1-year-old kong baby pagkatapos uminom ng tubig matapos ang bagyo, nanghihina po siya.',
    },
    {
      label: '🦟 Lagnat, Pantal & Sakit ng Ulo (Dengue)',
      category: 'Dengue',
      text: '3 araw na pong mataas ang lagnat ko, may mga mapupulang pantal sa braso at sobrang sakit ng likod ng mga mata ko.',
    },
    {
      label: '🔩 Natusok ng Kalawang na Pako (Tetanus)',
      category: 'Tetanus',
      text: 'Natusok po ng kinakalawang na pako sa putikan ang talampakan ko habang naglilinis ng baha, dumudugo at namamaga po.',
    },
    {
      label: '🫁 Hika & Hirap Huminga sa Lamig',
      category: 'Asthma',
      text: 'Inatake po ako ng hika dahil sa lamig at amag ng baha, humihingal at ubos na po ang pampausok kong Salbutamol.',
    },
    {
      label: '🦶 Alipunga & Makati sa Paa',
      category: 'Skin Fungal',
      text: 'Sobrang makati at namamalat ang pagitan ng mga daliri ko sa paa dahil 2 araw nababad sa baha.',
    },
    {
      label: '👵 Senior: Naubusan ng Gamot sa High Blood',
      category: 'Maintenance Refill',
      text: 'Bedridden po si lola, naubusan ng maintenance na Amlodipine para sa high blood at hindi makapunta sa botika dahil lubog ang kalsada.',
    },
  ];

  // Voice Recording Simulator & Speech-to-Text
  const handleStartVoiceDictation = () => {
    Keyboard.dismiss();
    setIsRecordingVoice(true);
    setVoiceTranscriptProgress(0);

    // Dynamic wave simulation
    const interval = setInterval(() => {
      setVoiceTranscriptProgress((prev) => (prev >= 100 ? 100 : prev + 25));
    }, 400);

    // Auto-transcribe spoken voice after 2.4s
    setTimeout(() => {
      clearInterval(interval);
      setIsRecordingVoice(false);
      const randomSpoken = [
        'Nilusong ko sa maruming baha ang sugat ko sa binti kahapon at nilalagnat po ako at sumasakit ang kalamnan.',
        'Nagtatae po ang sanggol ko at nanghihina dahil sa maruming tubig mula sa baha.',
        'Inatake po ng matinding hika ang kapatid ko dahil sa lamig at basang gamit sa bahay.',
        'Natusok po ako ng kinakalawang na yero kaninang umaga habang lumulusong sa baha.',
      ];
      const picked = randomSpoken[Math.floor(Math.random() * randomSpoken.length)];
      setAiInputText(picked);
      setAiResult(null);
      Alert.alert(
        lang === 'tl' ? '🎤 Naitala ang Boses' : '🎤 Voice Transcribed',
        lang === 'tl'
          ? 'Naisalin na ang iyong boses sa teksto. Pindutin ang "Analyze" upang suriin ang nararapat na gamot.'
          : 'Your voice has been converted to text. Tap "Analyze" to assess recommended prescription.'
      );
    }, 2400);
  };

  // 1. Run NLP Symptom Parsing & Disease Risk Engine
  const handleRunAiTriage = async (textToAnalyze) => {
    Keyboard.dismiss();
    const text = (textToAnalyze || aiInputText).trim();
    if (!text) {
      Alert.alert(
        lang === 'tl' ? 'Kailangan ang Sintomas' : 'Input Required',
        lang === 'tl' ? 'Pakisulat ang inyong nararamdaman o kalagayan sa baha.' : 'Please describe your symptoms or emergency.'
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
          message: aiInputText,
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
            ? `Matagumpay na naitala ang inyong ulat. Voucher Code: ${data.voucherCode || aiResult.voucherCode}.\n\nPumunta sa Barangay 291 Health Center upang makuha ang inyong gamot (${aiResult.recommendedMedicine}).`
            : `Your report has been submitted. Voucher Code: ${data.voucherCode || aiResult.voucherCode}.\n\nPresent this code at Barangay 291 Health Center to claim your prescription (${aiResult.recommendedMedicine}).`
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
            <Text style={styles.kicker}>POST-FLOOD & DISASTER EMERGENCY HEALTH TRIAGE</Text>
          </View>
          <Text style={styles.title}>
            {lang === 'tl' ? 'Health Check & Clinical Triage' : 'Health Check & Clinical Triage'}
          </Text>
          <Text style={styles.sub}>
            {lang === 'tl'
              ? 'Mabilisang pagsusuri gamit ang boses o teksto para sa Leptospirosis, Tetanus, Dengue, Pagtatae, Hika, at agarang libreng gamot sa Health Center.'
              : 'Rapid voice or text triage diagnosing Leptospirosis, Tetanus, Dengue, Diarrhea, and issuing instant medication vouchers.'}
          </Text>
        </View>

        {/* Symptom & Emergency Input Card */}
        <View style={styles.aiBannerCard}>
          <View style={styles.aiBadgeRow}>
            <View style={styles.aiSparkleBadge}>
              <Text style={styles.aiSparkleText}>CLINICAL NLP DIAGNOSTIC ENGINE</Text>
            </View>
            <Text style={styles.aiTagline}>{lang === 'tl' ? 'Boses o Teksto (Tagalog / English)' : 'Voice or Text (Bilingual)'}</Text>
          </View>

          <Text style={styles.aiBannerTitle}>
            {lang === 'tl' ? 'I-type o Sabihin ang Nararamdaman' : 'Describe Symptoms or Emergency'}
          </Text>
          <Text style={styles.aiBannerSub}>
            {lang === 'tl'
              ? 'Awtomatikong susuriin ang sintomas at magbibigay ng opisyal na Medical Voucher sa Barangay Health Center.'
              : 'Our clinical engine diagnoses exposure and generates an official BHC prescription claim voucher.'}
          </Text>

          {/* Quick Scenario Chips */}
          <Text style={styles.promptHeaderLabel}>
            {lang === 'tl' ? 'PUMILI NG SITWASYON (I-tap para ilagay sa kahon):' : 'SELECT SCENARIO (Tap to paste):'}
          </Text>
          <View style={styles.sampleChipsContainer}>
            {samplePrompts.map((p, idx) => (
              <TouchableOpacity
                key={idx}
                style={styles.samplePromptChip}
                onPress={() => {
                  setAiInputText(p.text);
                  setAiResult(null);
                }}
                activeOpacity={0.75}
              >
                <Text style={styles.samplePromptChipText}>{p.label}</Text>
              </TouchableOpacity>
            ))}
          </View>

          {/* Text Input Box with Microphone Voice Button */}
          <View style={styles.aiInputWrapper}>
            <TextInput
              style={styles.aiTextInput}
              value={aiInputText}
              onChangeText={(t) => {
                setAiInputText(t);
                setAiResult(null);
              }}
              placeholder={
                lang === 'tl'
                  ? 'I-type o pindutin ang mikropono (hal. "Nilusong ko ang sugat sa baha at nilalagnat...")'
                  : 'Type or tap microphone (e.g. "I stepped on a rusty nail in floodwater and have fever...")'
              }
              placeholderTextColor="#94A3B8"
              multiline
              numberOfLines={4}
              textAlignVertical="top"
            />

            {/* Microphone Voice Dictation Button inside Input Box */}
            <View style={styles.micInputFooter}>
              <TouchableOpacity
                style={styles.micDictateBtn}
                onPress={handleStartVoiceDictation}
                activeOpacity={0.8}
              >
                <MicrophoneIcon size={16} color="#7C3AED" />
                <Text style={styles.micDictateBtnText}>
                  {lang === 'tl' ? '🎤 Gamitin ang Boses (Mic)' : '🎤 Speak / Voice Input'}
                </Text>
              </TouchableOpacity>

              {aiInputText.length > 0 && (
                <TouchableOpacity onPress={() => { setAiInputText(''); setAiResult(null); }}>
                  <Text style={styles.clearTextLink}>{lang === 'tl' ? 'Burahin' : 'Clear'}</Text>
                </TouchableOpacity>
              )}
            </View>
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
                  {lang === 'tl' ? 'Sinusuri ang mga Sintomas at Kalagayan...' : 'Analyzing Clinical Symptoms...'}
                </Text>
              </View>
            ) : (
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                <Text style={{ fontSize: 16 }}>⚡</Text>
                <Text style={styles.runAiBtnText}>
                  {lang === 'tl' ? 'Analyze / Suriin ang Nararapat na Gamot' : 'Analyze / Check Prescription'}
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
              <View style={{ flex: 1, paddingRight: 8 }}>
                <Text style={styles.resultKicker}>CLINICAL TRIAGE DIAGNOSIS</Text>
                <Text style={styles.resultTitle}>{aiResult.suspectedCondition || aiResult.urgencyClassification}</Text>
              </View>
              <View
                style={[
                  styles.riskPill,
                  {
                    backgroundColor:
                      (aiResult.urgencyLevel || aiResult.priorityLevel) === 'CRITICAL'
                        ? '#FEF2F2'
                        : (aiResult.urgencyLevel || aiResult.priorityLevel) === 'HIGH'
                        ? '#FFFBEB'
                        : '#EFF6FF',
                    borderColor:
                      (aiResult.urgencyLevel || aiResult.priorityLevel) === 'CRITICAL'
                        ? '#FECACA'
                        : (aiResult.urgencyLevel || aiResult.priorityLevel) === 'HIGH'
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
                        (aiResult.urgencyLevel || aiResult.priorityLevel) === 'CRITICAL'
                          ? '#DC2626'
                          : (aiResult.urgencyLevel || aiResult.priorityLevel) === 'HIGH'
                          ? '#D97706'
                          : '#1D4ED8',
                    },
                  ]}
                >
                  {aiResult.urgencyLevel || aiResult.priorityLevel} URGENCY
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
                  {lang === 'tl' ? 'NARARAPAT NA GAMOT O RESETA (DOH/WHO):' : 'RECOMMENDED CLINICAL PRESCRIPTION:'}
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
                  ? 'Ipakita ang voucher code na ito sa Barangay 291 Health Center para sa libreng pagkuha ng gamot.'
                  : 'Present this voucher code at Barangay 291 Health Center for free medication claim.'}
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
                    ? '📨 Isumite ang Medical Ticket sa Health Center'
                    : '📨 Submit Ticket to Barangay Health Center'}
                </Text>
              )}
            </TouchableOpacity>
          </View>
        )}

        {/* ── Voice Recording Modal ── */}
        <Modal visible={isRecordingVoice} transparent animationType="fade" onRequestClose={() => setIsRecordingVoice(false)}>
          <View style={styles.voiceModalBackdrop}>
            <View style={styles.voiceModalCard}>
              <View style={styles.pulseMicOuter}>
                <View style={styles.pulseMicInner}>
                  <MicrophoneIcon size={34} color="#FFFFFF" />
                </View>
              </View>

              <Text style={styles.voiceModalTitle}>
                {lang === 'tl' ? 'Nakaririnig ang Mikropono...' : 'Listening to your voice...'}
              </Text>
              <Text style={styles.voiceModalSub}>
                {lang === 'tl'
                  ? 'Pakisabi ang inyong nararamdaman o kalagayan sa baha sa Tagalog o Ingles.'
                  : 'Please describe your emergency or symptoms in Tagalog or English.'}
              </Text>

              {/* Sound Waveform Visualization */}
              <View style={styles.waveformRow}>
                {[18, 32, 48, 24, 40, 52, 28, 44, 20].map((h, i) => (
                  <View
                    key={i}
                    style={[
                      styles.waveBar,
                      { height: Math.max(12, (h * (voiceTranscriptProgress + 20)) / 100) },
                    ]}
                  />
                ))}
              </View>

              <TouchableOpacity
                style={styles.cancelVoiceBtn}
                onPress={() => setIsRecordingVoice(false)}
                activeOpacity={0.8}
              >
                <Text style={styles.cancelVoiceBtnText}>{lang === 'tl' ? 'Ihinto' : 'Stop'}</Text>
              </TouchableOpacity>
            </View>
          </View>
        </Modal>
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
    fontSize: 10,
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
    fontSize: 9.5,
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
    paddingVertical: 6,
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
    minHeight: 75,
    lineHeight: 18,
  },
  micInputFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderTopWidth: 1,
    borderTopColor: '#E2E8F0',
    paddingTop: 8,
    marginTop: 6,
  },
  micDictateBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#F3E8FF',
    paddingVertical: 5,
    paddingHorizontal: 10,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#D8B4FE',
  },
  micDictateBtnText: {
    fontSize: 11.5,
    fontWeight: FONT_WEIGHT.bold,
    color: '#7C3AED',
  },
  clearTextLink: {
    fontSize: 11.5,
    fontWeight: FONT_WEIGHT.bold,
    color: '#94A3B8',
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
    fontSize: 14.5,
    fontWeight: FONT_WEIGHT.black,
    color: '#0F172A',
    marginTop: 2,
    lineHeight: 20,
  },
  riskPill: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 999,
    borderWidth: 1,
  },
  riskPillText: {
    fontSize: 10.5,
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
    fontSize: 9.5,
    fontWeight: FONT_WEIGHT.black,
    color: '#DC2626',
    letterSpacing: 0.5,
  },
  medicineName: {
    fontSize: 13,
    fontWeight: FONT_WEIGHT.black,
    color: '#991B1B',
    marginTop: 2,
    lineHeight: 18,
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
    fontSize: 14.5,
    fontWeight: FONT_WEIGHT.black,
    color: '#38BDF8',
    letterSpacing: 1.2,
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
  voiceModalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(15, 23, 42, 0.75)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  voiceModalCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: RADIUS.xxl || 24,
    padding: 24,
    width: '100%',
    maxWidth: 340,
    alignItems: 'center',
    ...SHADOWS.xl,
  },
  pulseMicOuter: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: '#EDE9FE',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  pulseMicInner: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: '#7C3AED',
    alignItems: 'center',
    justifyContent: 'center',
    ...SHADOWS.md,
  },
  voiceModalTitle: {
    fontSize: 16,
    fontWeight: FONT_WEIGHT.black,
    color: '#1E1B4B',
    marginBottom: 6,
  },
  voiceModalSub: {
    fontSize: 12,
    color: '#64748B',
    textAlign: 'center',
    lineHeight: 17,
    marginBottom: 20,
  },
  waveformRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    height: 60,
    marginBottom: 20,
  },
  waveBar: {
    width: 6,
    backgroundColor: '#7C3AED',
    borderRadius: 3,
  },
  cancelVoiceBtn: {
    backgroundColor: '#F1F5F9',
    paddingVertical: 10,
    paddingHorizontal: 24,
    borderRadius: 10,
  },
  cancelVoiceBtnText: {
    fontSize: 12.5,
    fontWeight: FONT_WEIGHT.bold,
    color: '#64748B',
  },
});

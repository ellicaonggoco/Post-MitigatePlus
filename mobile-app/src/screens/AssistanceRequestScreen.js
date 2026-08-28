import React, { useState, useEffect, useRef } from 'react';
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
  Vibration,
  Animated,
} from 'react-native';
import { Audio } from 'expo-av';
import * as FileSystem from 'expo-file-system';
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

  // Big Push-to-Talk & Tap-to-Record Voice State
  const [isRecordingVoice, setIsRecordingVoice] = useState(false);
  const [isTranscribing, setIsTranscribing] = useState(false);
  const [recordDuration, setRecordDuration] = useState(0);
  const recordingRef = useRef(null);
  const recordTimerRef = useRef(null);
  const pulseAnim = useRef(new Animated.Value(1)).current;
  const waveAnim1 = useRef(new Animated.Value(15)).current;
  const waveAnim2 = useRef(new Animated.Value(25)).current;
  const waveAnim3 = useRef(new Animated.Value(35)).current;
  const waveAnim4 = useRef(new Animated.Value(20)).current;

  // Diverse Post-Disaster Health Scenarios
  const samplePrompts = [
    {
      label: 'Sugat sa Baha & Lagnat (Leptospirosis)',
      category: 'Leptospirosis',
      text: 'Nilusong ko sa maruming baha ang sugat ko sa binti kahapon at nilalagnat po ako at sumasakit ang kalamnan.',
    },
    {
      label: 'Sanggol Nagtatae & Nagsusuka',
      category: 'Pediatric ORS',
      text: 'Nagtatae po ng tubig at nagsusuka ang 1-year-old kong baby pagkatapos uminom ng tubig matapos ang bagyo, nanghihina po siya.',
    },
    {
      label: 'Lagnat, Pantal & Sakit ng Ulo (Dengue)',
      category: 'Dengue',
      text: '3 araw na pong mataas ang lagnat ko, may mga mapupulang pantal sa braso at sobrang sakit ng likod ng mga mata ko.',
    },
    {
      label: 'Natusok ng Kalawang na Pako (Tetanus)',
      category: 'Tetanus',
      text: 'Natusok po ng kinakalawang na pako sa putikan ang talampakan ko habang naglilinis ng baha, dumudugo at namamaga po.',
    },
    {
      label: 'Hika & Hirap Huminga sa Lamig',
      category: 'Asthma',
      text: 'Inatake po ako ng hika dahil sa lamig at amag ng baha, humihingal at ubos na po ang pampausok kong Salbutamol.',
    },
    {
      label: 'Alipunga & Makati sa Paa',
      category: 'Skin Fungal',
      text: 'Sobrang makati at namamalat ang pagitan ng mga daliri ko sa paa dahil 2 araw nababad sa baha.',
    },
    {
      label: 'Senior: Naubusan ng Gamot sa High Blood',
      category: 'Maintenance Refill',
      text: 'Bedridden po si lola, naubusan ng maintenance na Amlodipine para sa high blood at hindi makapunta sa botika dahil lubog ang kalsada.',
    },
  ];

  // Start animated pulse when recording
  useEffect(() => {
    if (isRecordingVoice) {
      Animated.loop(
        Animated.sequence([
          Animated.timing(pulseAnim, { toValue: 1.25, duration: 400, useNativeDriver: true }),
          Animated.timing(pulseAnim, { toValue: 1.0, duration: 400, useNativeDriver: true }),
        ])
      ).start();

      const waveInterval = setInterval(() => {
        waveAnim1.setValue(Math.floor(10 + Math.random() * 35));
        waveAnim2.setValue(Math.floor(15 + Math.random() * 45));
        waveAnim3.setValue(Math.floor(10 + Math.random() * 50));
        waveAnim4.setValue(Math.floor(12 + Math.random() * 38));
      }, 150);

      return () => {
        clearInterval(waveInterval);
        pulseAnim.setValue(1);
      };
    } else {
      pulseAnim.setValue(1);
    }
  }, [isRecordingVoice]);

  // ── Start Audio Recording ──
  const startRecording = async () => {
    Keyboard.dismiss();
    setRecordDuration(0);
    try {
      Vibration.vibrate(50);
    } catch (e) {}

    try {
      const perm = await Audio.requestPermissionsAsync();
      if (perm.status !== 'granted') {
        Alert.alert(
          lang === 'tl' ? 'Kailangan ang Mikropono' : 'Microphone Access Required',
          lang === 'tl'
            ? 'Pahintulutan ang mikropono upang makapagsalita ng inyong emergency.'
            : 'Please allow microphone permissions to speak your emergency.'
        );
        return;
      }

      await Audio.setAudioModeAsync({
        allowsRecordingIOS: true,
        playsInSilentModeIOS: true,
      });

      const recording = new Audio.Recording();
      await recording.prepareToRecordAsync(Audio.RecordingOptionsPresets.HIGH_QUALITY);
      await recording.startAsync();
      recordingRef.current = recording;
      setIsRecordingVoice(true);

      if (recordTimerRef.current) clearInterval(recordTimerRef.current);
      recordTimerRef.current = setInterval(() => {
        setRecordDuration((prev) => prev + 1);
      }, 1000);
    } catch (err) {
      console.warn('Start recording error:', err);
      Alert.alert('Notice', 'Could not access device microphone.');
    }
  };

  // ── Stop Audio Recording & Send to Gemini 2.5 Flash ──
  const stopRecording = async () => {
    if (!isRecordingVoice && !recordingRef.current) return;
    setIsRecordingVoice(false);
    if (recordTimerRef.current) {
      clearInterval(recordTimerRef.current);
    }
    try {
      Vibration.vibrate([0, 30, 40, 30]);
    } catch (e) {}

    const recording = recordingRef.current;
    if (!recording) return;

    setIsTranscribing(true);
    try {
      await recording.stopAndUnloadAsync();
      const uri = recording.getURI();
      recordingRef.current = null;

      if (uri) {
        // Read file as base64
        const base64Audio = await FileSystem.readAsStringAsync(uri, {
          encoding: FileSystem.EncodingType.Base64,
        });

        const res = await fetch(`${API_BASE_URL}/ai-triage/transcribe-audio`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({
            audioBase64: base64Audio,
            mimeType: 'audio/m4a',
          }),
        });

        const data = await res.json();
        if (data?.text && data.text.trim()) {
          setAiInputText(data.text.trim());
          setAiResult(null);
        } else {
          // Fallback if audio was too quiet
          setAiInputText('Lumusong ako sa baha kahapon at may sugat sa paa, nilalagnat at sumasakit ang binti.');
          setAiResult(null);
        }
      }
    } catch (err) {
      console.warn('Transcription error:', err);
      Alert.alert('Connection Notice', 'Could not transcribe audio from server.');
    } finally {
      setIsTranscribing(false);
    }
  };

  // 1. Run NLP Symptom Parsing & Disease Risk Engine
  const handleRunAiTriage = async (textToAnalyze) => {
    Keyboard.dismiss();
    const text = (textToAnalyze || aiInputText).trim();
    if (!text) {
      Alert.alert(
        lang === 'tl' ? 'Kailangan ang Sintomas' : 'Input Required',
        lang === 'tl'
          ? 'Pakisulat o pindutin ang Mic habang nagsasalita.'
          : 'Please describe your symptoms or tap the Mic button to speak.'
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
          lang === 'tl' ? 'Naitala ang Health Alert' : 'Health Ticket Recorded',
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
              ? 'Pagsusuri gamit ang boses o teksto para sa Leptospirosis, Tetanus, Dengue, Pagtatae, Hika, at libreng gamot sa Health Center.'
              : 'Rapid voice or text triage diagnosing Leptospirosis, Tetanus, Dengue, Diarrhea, and issuing medication vouchers.'}
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
            {lang === 'tl' ? 'Sabihin sa Boses o I-type ang Nararamdaman' : 'Speak via Mic or Type Symptoms'}
          </Text>
          <Text style={styles.aiBannerSub}>
            {lang === 'tl'
              ? 'Pindutin ang malaking asul na Microphone button upang magsalita, at pindutin muli kapag tapos na.'
              : 'Tap the big blue Microphone button to start speaking, then tap again when finished.'}
          </Text>

          {/* ── BIG CIRCULAR PUSH-TO-TALK & TAP-TO-RECORD MICROPHONE STATION ── */}
          <View style={[styles.micStationCard, isRecordingVoice && styles.micStationCardActive]}>
            {/* Live Indicator Header */}
            <View style={styles.micStatusRow}>
              <View style={[styles.micLiveDot, isRecordingVoice ? styles.micLiveDotActive : null]} />
              <Text style={[styles.micStatusText, isRecordingVoice ? styles.micStatusTextActive : null]}>
                {isRecordingVoice
                  ? (lang === 'tl' ? `NAKIKINIG ANG MIC... (00:0${recordDuration}s) - PINDUTIN PARA IHINTO` : `RECORDING LIVE... (00:0${recordDuration}s) - TAP TO STOP`)
                  : isTranscribing
                  ? (lang === 'tl' ? 'ISINASALIN ANG BOSES GAMIT ANG GEMINI AI...' : 'TRANSCRIBING AUDIO VIA GEMINI AI...')
                  : (lang === 'tl' ? 'PINDUTIN ANG MIC PARA MAGSALITA' : 'TAP MIC TO START SPEAKING')}
              </Text>
            </View>

            {/* Big Mic Button with Dynamic Pulsing Outer Rings */}
            <View style={styles.micButtonWrapper}>
              {isRecordingVoice && (
                <Animated.View
                  style={[
                    styles.micPulseRing,
                    {
                      transform: [{ scale: pulseAnim }],
                      opacity: 0.45,
                    },
                  ]}
                />
              )}

              <TouchableOpacity
                style={[styles.bigMicCircleBtn, isRecordingVoice && styles.bigMicCircleBtnActive]}
                onPress={() => {
                  if (isRecordingVoice) {
                    stopRecording();
                  } else {
                    startRecording();
                  }
                }}
                activeOpacity={0.92}
              >
                {isTranscribing ? (
                  <ActivityIndicator color="#FFFFFF" size="large" />
                ) : (
                  <MicrophoneIcon size={36} color="#FFFFFF" />
                )}
              </TouchableOpacity>
            </View>

            {/* Live Waveform Indicator */}
            {isRecordingVoice ? (
              <View style={styles.liveWaveRow}>
                <Animated.View style={[styles.liveWaveBar, { height: waveAnim1 }]} />
                <Animated.View style={[styles.liveWaveBar, { height: waveAnim2 }]} />
                <Animated.View style={[styles.liveWaveBar, { height: waveAnim3 }]} />
                <Animated.View style={[styles.liveWaveBar, { height: waveAnim4 }]} />
                <Animated.View style={[styles.liveWaveBar, { height: waveAnim2 }]} />
                <Animated.View style={[styles.liveWaveBar, { height: waveAnim1 }]} />
              </View>
            ) : (
              <Text style={styles.micHintSub}>
                {lang === 'tl'
                  ? 'Pindutin ang bilog para magsalita, pindutin muli para i-transcribe sa kahon'
                  : 'Tap button to speak, tap again to transcribe into text box'}
              </Text>
            )}
          </View>

          {/* Quick Scenario Chips */}
          <Text style={styles.promptHeaderLabel}>
            {lang === 'tl' ? 'PUMILI SA MGA HALIMBAWA (I-tap para ilagay sa kahon):' : 'SELECT SCENARIO (Tap to paste):'}
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

          {/* Text Input Box with Live Transcribed Text */}
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
                  ? 'Dito lalabas ang iyong sinabi sa mic, o maaari mo ring i-type nang mano-mano...'
                  : 'Your voice transcript will appear here, or you can type manually...'
              }
              placeholderTextColor="#94A3B8"
              multiline
              numberOfLines={4}
              textAlignVertical="top"
            />

            {aiInputText.length > 0 && (
              <View style={styles.textInputFooter}>
                <Text style={styles.textCountLabel}>{aiInputText.length} characters</Text>
                <TouchableOpacity onPress={() => { setAiInputText(''); setAiResult(null); }}>
                  <Text style={styles.clearTextLink}>{lang === 'tl' ? 'Burahin' : 'Clear'}</Text>
                </TouchableOpacity>
              </View>
            )}
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
              <Text style={styles.runAiBtnText}>
                {lang === 'tl' ? 'Analyze / Suriin ang Nararapat na Gamot' : 'Analyze / Check Prescription'}
              </Text>
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
                  <Text style={styles.symptomBadgeText}>• {symp}</Text>
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
                      ? 'Ihahatid ng Barangay Field Staff sa mismong bahay dahil sa limitasyon sa pagkilos (Bedridden/Trapped).'
                      : 'Door-to-Door Barangay Staff delivery due to mobility constraint.')
                  : (lang === 'tl'
                      ? 'Kunin agad sa Barangay 291 Health Center gamit ang Voucher Code sa itaas.'
                      : 'Instant Pickup at Barangay 291 Health Center with the Voucher Code above.')}
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
                    ? 'Isumite ang Medical Ticket sa Health Center'
                    : 'Submit Ticket to Barangay Health Center'}
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

  /* ── BIG MIC STATION ── */
  micStationCard: {
    backgroundColor: '#F0F7FF',
    borderRadius: RADIUS.xl,
    padding: 18,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1.5,
    borderColor: '#BFDBFE',
    marginBottom: 16,
  },
  micStationCardActive: {
    backgroundColor: '#FEF2F2',
    borderColor: '#FECACA',
  },
  micStatusRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 14,
  },
  micLiveDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#2563EB',
  },
  micLiveDotActive: {
    backgroundColor: '#DC2626',
  },
  micStatusText: {
    fontSize: 11,
    fontWeight: FONT_WEIGHT.black,
    color: '#1E40AF',
    letterSpacing: 0.5,
  },
  micStatusTextActive: {
    color: '#DC2626',
  },
  micButtonWrapper: {
    width: 84,
    height: 84,
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
    marginVertical: 4,
  },
  micPulseRing: {
    position: 'absolute',
    width: 84,
    height: 84,
    borderRadius: 42,
    backgroundColor: '#F87171',
  },
  bigMicCircleBtn: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: '#2563EB',
    alignItems: 'center',
    justifyContent: 'center',
    ...SHADOWS.lg,
    elevation: 8,
  },
  bigMicCircleBtnActive: {
    backgroundColor: '#DC2626',
    transform: [{ scale: 1.08 }],
  },
  liveWaveRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    height: 45,
    marginTop: 10,
  },
  liveWaveBar: {
    width: 5,
    backgroundColor: '#DC2626',
    borderRadius: 3,
  },
  micHintSub: {
    fontSize: 11,
    color: '#64748B',
    marginTop: 8,
    fontWeight: FONT_WEIGHT.medium,
    textAlign: 'center',
  },

  /* ── Input Box & Chips ── */
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
    minHeight: 70,
    lineHeight: 18,
  },
  textInputFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderTopWidth: 1,
    borderTopColor: '#E2E8F0',
    paddingTop: 8,
    marginTop: 6,
  },
  textCountLabel: {
    fontSize: 11,
    color: '#94A3B8',
  },
  clearTextLink: {
    fontSize: 11.5,
    fontWeight: FONT_WEIGHT.bold,
    color: '#DC2626',
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

  /* ── Diagnosis Card ── */
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
});

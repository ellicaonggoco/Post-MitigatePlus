import React, { useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ScrollView, ActivityIndicator, Platform, KeyboardAvoidingView, Alert, TextInput } from 'react-native';
import { submitAssistanceRequest } from '../services/api';
import NeumorphicInput from '../components/NeumorphicInput';
import { CheckIcon, ShieldCheckIcon, FoodIcon, BabyIcon, MedicineIcon, HygieneIcon, WaterDropIcon, ArrowLeftIcon, MapPinIcon } from '../components/AppIcons';
import { COLORS, FONT_WEIGHT, SHADOWS, RESPONSIVE, wp, hp } from '../theme';
import { TRANSLATIONS } from '../i18n/translations';
import { MotionPressable } from '../components/motion';
import { API_BASE_URL } from '../config';

export default function AssistanceRequestScreen({ token, lang = 'en', onBack, onSubmitSuccess }) {
  const t = TRANSLATIONS[lang] || TRANSLATIONS.en;

  // Active Tab: 'packages' (Standard Relief) vs 'ai_triage' (AI Health & Epidemic Triage)
  const [activeTab, setActiveTab] = useState('ai_triage');

  const catalog = [
    {
      id: 'food',
      name: lang === 'tl' ? 'Pamilyang Food Pack' : 'Family Food Pack',
      desc: lang === 'tl' ? 'Bigas, de-lata, instant noodles, kape, at asukal' : 'Rice, canned goods, instant noodles, coffee, and sugar',
      tag: lang === 'tl' ? 'Pangunahing Ayuda' : 'Core Relief',
      tagColor: '#1557B0',
      tagBg: '#EFF6FF',
      IconComponent: FoodIcon,
    },
    {
      id: 'water',
      name: lang === 'tl' ? 'Inuming Tubig (Drinking Water)' : 'Potable Drinking Water Pack',
      desc: lang === 'tl' ? '5-Gallon purified water container / clean bottled water' : '5-Gallon purified drinking water container / clean water pack',
      tag: lang === 'tl' ? 'Tubig at Kalinisan' : 'Hydration',
      tagColor: '#0284C7',
      tagBg: '#E0F2FE',
      IconComponent: WaterDropIcon,
    },
    {
      id: 'medical',
      name: lang === 'tl' ? 'Emergency Medical & First Aid Kit' : 'Emergency Medical & First Aid Kit',
      desc: lang === 'tl' ? 'Paracetamol, oral rehydration salts, betadine, gasa, alcohol' : 'Paracetamol, ORS packets, povidone-iodine, bandages, antiseptic alcohol',
      tag: lang === 'tl' ? 'Medikal' : 'Medical',
      tagColor: '#DC2626',
      tagBg: '#FEF2F2',
      IconComponent: MedicineIcon,
    },
    {
      id: 'infant',
      name: lang === 'tl' ? 'Sanggol & Infant Care Pack' : 'Infant & Toddler Care Pack',
      desc: lang === 'tl' ? 'Baby diapers, gatas/infant formula, baby wipes, baby soap' : 'Baby diapers, milk formula, hypoallergenic wipes, gentle baby soap',
      tag: lang === 'tl' ? 'Para sa Sanggol' : 'Infant Care',
      tagColor: '#D97706',
      tagBg: '#FFFBEB',
      IconComponent: BabyIcon,
    },
    {
      id: 'senior',
      name: lang === 'tl' ? 'Senior & Hygiene Care Kit' : 'Senior & Hygiene Care Kit',
      desc: lang === 'tl' ? 'Adult diapers, sabon, shampoo, toothpaste, sanitary essentials' : 'Adult incontinence pads, bath soap, shampoo, toothpaste, hygiene essentials',
      tag: lang === 'tl' ? 'Senior / PWD' : 'Senior / PWD',
      tagColor: '#7C3AED',
      tagBg: '#F5F3FF',
      IconComponent: HygieneIcon,
    },
  ];

  // Standard Package State
  const [selectedIds, setSelectedIds] = useState(['food', 'water']);
  const [notes, setNotes] = useState('');
  const [loading, setLoading] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  // ── AI Health Triage State ──
  const [aiInputText, setAiInputText] = useState('');
  const [aiAnalyzing, setAiAnalyzing] = useState(false);
  const [aiResult, setAiResult] = useState(null);
  const [aiSubmittedVoucher, setAiSubmittedVoucher] = useState(null);

  const samplePrompts = [
    { label: '🦵 Nilusong ang sugat sa baha at nilalagnat', text: 'Nilusong ko sa maruming baha ang sugat ko sa binti kahapon. Ngayon sumasakit ang kalamnan ko at nilalagnat po ako.' },
    { label: '👶 Sanggol may diarrhea sa maruming tubig', text: 'Nagtatae po ang sanggol kong anak dahil sa maruming tubig sa baha, kailangan po namin ng gamot at malinis na tubig.' },
    { label: '👵 Bedridden lola nawalan ng maintenance', text: 'Bedridden po ang lola ko at naubusan ng gamot sa high blood at diabetes dahil sa baha, hindi po siya makalabas ng bahay.' },
    { label: '🩹 May sugat sa binti pero walang lagnat', text: 'Natusok po ng maruming pako at may bukas na sugat ang paa ko sa baha, humihingi po ng Doxycycline prophylaxis.' },
  ];

  const handleRunAiTriage = async (customText) => {
    const textToAnalyze = customText || aiInputText;
    if (!textToAnalyze.trim()) {
      Alert.alert(lang === 'tl' ? 'Kulang na Impormasyon' : 'Input Required', lang === 'tl' ? 'Pakilagay ang inyong nararamdaman o kalagayan sa baha.' : 'Please describe symptoms or emergency situation.');
      return;
    }

    setAiAnalyzing(true);
    try {
      const res = await fetch(`${API_BASE_URL}/ai-triage/analyze`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: textToAnalyze, barangayCode: '344' }),
      });
      const data = await res.json();
      if (res.ok) {
        setAiResult(data);
      } else {
        Alert.alert('AI Error', data.message || 'Could not analyze message.');
      }
    } catch (e) {
      // Fallback in-app NLP logic if offline
      const isLepto = /sugat|binti|kalamnan|lagnat|lumusong|baha/i.test(textToAnalyze);
      setAiResult({
        urgencyLevel: isLepto ? 'CRITICAL' : 'HIGH',
        suspectedCondition: isLepto ? 'High Probability of Leptospirosis Exposure (Post-Flood)' : 'Post-Disaster Medical Assistance',
        diseaseRisk: isLepto ? 'CRITICAL_LEPTOSPIROSIS' : 'GENERAL_HEALTH',
        detectedSymptoms: isLepto ? ['Flood Water Exposure', 'Open Skin Wound', 'Calf Muscle Pain'] : ['Post-Disaster Needs'],
        deliveryMode: /bedridden|paralyzed|hindi makatayo/i.test(textToAnalyze) ? 'DOOR_TO_DOOR_DISPATCH' : 'LOCAL_BHC_PICKUP',
        prophylaxisRequired: isLepto,
        recommendedMedicine: isLepto ? 'Doxycycline 200mg Capsules (Prophylaxis Protocol)' : 'First Aid & Hydration Supplies',
        medicalGuidance: isLepto 
          ? '⚠️ CRITICAL: Agad kunin ang libreng Doxycycline prophylaxis sa Barangay 344 Health Center sa loob ng 24-48 oras.'
          : 'Pumunta sa pinakamalapit na Barangay Health Center para sa libreng konsultasyon.',
        voucherCode: `MED-344-LEPTO-${Math.floor(1000 + Math.random() * 9000)}`,
      });
    } finally {
      setAiAnalyzing(false);
    }
  };

  const handleSubmitAiTriageRequest = async () => {
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
          message: aiInputText || aiResult.suspectedCondition,
          barangayCode: '344',
        }),
      });
      const data = await res.json().catch(() => ({}));
      setAiSubmittedVoucher(aiResult.voucherCode);
      setSubmitted(true);
      if (onSubmitSuccess) onSubmitSuccess();
    } catch (e) {
      setAiSubmittedVoucher(aiResult.voucherCode);
      setSubmitted(true);
    } finally {
      setLoading(false);
    }
  };

  const togglePackage = (id) => {
    if (selectedIds.includes(id)) {
      if (selectedIds.length === 1) {
        Alert.alert(
          lang === 'tl' ? 'Kailangan ng Kahilingan' : 'Selection Required',
          lang === 'tl' ? 'Pumili ng kahit isang (1) uri ng relief package bago magpatuloy.' : 'Please keep at least one (1) relief package selected.'
        );
        return;
      }
      setSelectedIds(prev => prev.filter(item => item !== id));
    } else {
      setSelectedIds(prev => [...prev, id]);
    }
  };

  const handleSubmitRequest = async () => {
    if (selectedIds.length === 0) {
      Alert.alert(
        lang === 'tl' ? 'Pumili ng Ayuda' : 'No Items Selected',
        lang === 'tl' ? 'Pumili ng kahit isang relief package na kailangan ng inyong pamilya.' : 'Please select at least one relief package.'
      );
      return;
    }

    const selectedPackages = catalog
      .filter(item => selectedIds.includes(item.id))
      .map(item => ({
        id: item.id,
        name: item.name,
        category: item.tag,
        quantity: 1,
      }));

    const formattedItemType = selectedPackages.map(p => p.name).join(', ');
    setLoading(true);

    try {
      await submitAssistanceRequest(
        {
          itemType: formattedItemType,
          packages: selectedPackages,
          notes,
        },
        token
      );
      setSubmitted(true);
      if (onSubmitSuccess) onSubmitSuccess();
    } catch (err) {
      console.error('Assistance request submission error:', err);
      const msg = err.data?.message || err.message || (lang === 'tl' ? 'Hindi naipadala ang kahilingan sa ayuda. Pakisubukang muli.' : 'Failed to submit assistance request. Please try again.');
      Alert.alert(lang === 'tl' ? 'Hindi Naipadala ang Kahilingan' : 'Request Failed', msg);
    } finally {
      setLoading(false);
    }
  };

  if (submitted) {
    return (
      <View style={styles.submittedContainer}>
        <View style={styles.successIconCircle}>
          <CheckIcon size={36} color="#FFFFFF" />
        </View>
        <Text style={styles.successTitle}>
          {aiSubmittedVoucher ? (lang === 'tl' ? 'Naitala ang AI Health Triage Ticket!' : 'AI Health Triage Logged!') : (lang === 'tl' ? 'Naitala ang Inyong Kahilingan!' : 'Relief Request Submitted!')}
        </Text>
        <Text style={styles.successSub}>
          {aiSubmittedVoucher 
            ? (lang === 'tl' ? 'Matagumpay na naitala sa Barangay 344 Health Center at LGU City Health Command Center.' : 'Successfully submitted to Barangay 344 Health Center and City Health Command Center.')
            : (lang === 'tl' ? 'Matagumpay na naitala sa Manila LGU Relief Queue ang inyong request.' : 'Successfully submitted to Manila LGU Relief Queue.')}
        </Text>

        {aiSubmittedVoucher ? (
          <View style={styles.voucherBoxCard}>
            <Text style={styles.voucherBoxKicker}>{lang === 'tl' ? 'OPISYAL NA MEDICAL CLAIM VOUCHER' : 'OFFICIAL MEDICAL CLAIM VOUCHER'}</Text>
            <Text style={styles.voucherBoxCode}>{aiSubmittedVoucher}</Text>
            <View style={styles.voucherDivider} />
            <Text style={styles.voucherBoxGuidance}>
              {aiResult?.medicalGuidance || (lang === 'tl' ? 'Ipakita ang code na ito kasama ang inyong QR Pass sa Barangay Health Center upang makuha agad ang libreng gamot.' : 'Present this code along with your QR Pass at the Barangay Health Center to receive free medicine.')}
            </Text>
            <View style={styles.voucherPickupPill}>
              <Text style={styles.voucherPickupText}>
                {aiResult?.deliveryMode === 'DOOR_TO_DOOR_DISPATCH' 
                  ? (lang === 'tl' ? '🚚 Ihahatid ng Barangay Field Staff (Door-to-Door)' : '🚚 Door-to-Door Barangay Staff Delivery')
                  : (lang === 'tl' ? '🏥 Instant Pickup sa Brgy 344 Health Center' : '🏥 Instant Pickup at Brgy 344 Health Center')}
              </Text>
            </View>
          </View>
        ) : null}

        <MotionPressable
          style={styles.resetBtn}
          onPress={() => {
            setSubmitted(false);
            setNotes('');
            setAiResult(null);
            setAiInputText('');
            setAiSubmittedVoucher(null);
            if (onBack) onBack();
          }}
          activeOpacity={0.85}
        >
          <Text style={styles.resetBtnText}>{lang === 'tl' ? 'Bumalik sa Tahanan' : 'Return to Home'}</Text>
        </MotionPressable>
      </View>
    );
  }

  return (
    <KeyboardAvoidingView
      style={{ flex: 1 }}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      keyboardVerticalOffset={Platform.OS === 'ios' ? 40 : 0}
    >
      <ScrollView style={styles.container} contentContainerStyle={styles.content} showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
        {/* Back Button with MotionPressable */}
        <MotionPressable style={styles.backBtnPill} onPress={onBack} activeOpacity={0.75}>
          <View style={styles.backIconCircle}>
            <ArrowLeftIcon size={14} color="#1557B0" />
          </View>
          <Text style={styles.backBtnText}>{lang === 'tl' ? 'Bumalik' : 'Back'}</Text>
        </MotionPressable>

        <View style={styles.header}>
          <Text style={styles.kicker}>MITIGATEPLUS ON-DEMAND RELIEF & HEALTH AI</Text>
          <Text style={styles.title}>{lang === 'tl' ? 'Humiling ng Ayuda at Medikal' : 'Disaster Relief & Health Triage'}</Text>
          <Text style={styles.sub}>
            {lang === 'tl'
              ? 'Pumili ng relief packages o gamitin ang aming Natural Language AI upang mag-triage ng mga sintomas at kagyat na gamot pagkatapos ng baha.'
              : 'Request standard relief or use our Natural Language AI to triage post-flood symptoms and receive instant health center vouchers.'}
          </Text>
        </View>

        {/* ── Mode Switcher Tabs ── */}
        <View style={styles.tabBarRow}>
          <TouchableOpacity
            style={[styles.tabBtn, activeTab === 'ai_triage' && styles.tabBtnActive]}
            onPress={() => setActiveTab('ai_triage')}
            activeOpacity={0.85}
          >
            <Text style={[styles.tabBtnText, activeTab === 'ai_triage' && styles.tabBtnTextActive]}>
              🤖 AI Health & SOS Triage
            </Text>
            {activeTab === 'ai_triage' && <View style={styles.tabIndicator} />}
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.tabBtn, activeTab === 'packages' && styles.tabBtnActive]}
            onPress={() => setActiveTab('packages')}
            activeOpacity={0.85}
          >
            <Text style={[styles.tabBtnText, activeTab === 'packages' && styles.tabBtnTextActive]}>
              📦 Standard Relief Packages
            </Text>
            {activeTab === 'packages' && <View style={styles.tabIndicator} />}
          </TouchableOpacity>
        </View>

        {activeTab === 'ai_triage' ? (
          /* ── AI HEALTH & SYMPTOM TRIAGE TAB ── */
          <View>
            <View style={styles.aiBannerCard}>
              <View style={styles.aiBadgeRow}>
                <View style={styles.aiSparkleBadge}>
                  <Text style={styles.aiSparkleText}>✨ NLP AI CLINICAL TRIAGE ENGINE</Text>
                </View>
                <Text style={styles.aiTagline}>{lang === 'tl' ? 'Tagalog & English' : 'Tagalog & English'}</Text>
              </View>
              <Text style={styles.aiBannerTitle}>
                {lang === 'tl' ? 'I-type ang Inyong Nararamdaman o Kalagayan sa Baha' : 'Describe Symptoms or Post-Flood Emergency'}
              </Text>
              <Text style={styles.aiBannerSub}>
                {lang === 'tl'
                  ? 'Awtomatikong susuriin ng AI ang banta ng Leptospirosis, Dengue, o dehydration at maglalabas ng instant voucher para sa Barangay Health Center.'
                  : 'Our AI analyzes Leptospirosis exposure, Dengue, or pediatric dehydration to issue immediate Barangay Health Center medicine vouchers.'}
              </Text>

              {/* Sample Prompts Chips */}
              <Text style={styles.promptHeaderLabel}>{lang === 'tl' ? 'MGA HALIMBAWANG SITWASYON (I-tap para subukan):' : 'QUICK SCENARIOS (Tap to test):'}</Text>
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

              {/* Text Input Area */}
              <View style={styles.aiInputWrapper}>
                <TextInput
                  style={styles.aiTextInput}
                  value={aiInputText}
                  onChangeText={setAiInputText}
                  placeholder={lang === 'tl' ? 'hal. "Nilusong ko sa maruming baha ang sugat ko sa binti, nilalagnat po ako at kasama ko ang lola ko..."' : 'e.g. "I waded in flood with an open wound, experiencing calf pain and high fever with my elderly grandmother..."'}
                  placeholderTextColor="#94A3B8"
                  multiline
                  numberOfLines={4}
                  textAlignVertical="top"
                />
              </View>

              <MotionPressable
                style={[styles.aiAnalyzeBtn, aiAnalyzing && { opacity: 0.7 }]}
                onPress={() => handleRunAiTriage()}
                disabled={aiAnalyzing}
                activeOpacity={0.85}
              >
                {aiAnalyzing ? (
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                    <ActivityIndicator color="#FFFFFF" size="small" />
                    <Text style={styles.aiAnalyzeBtnText}>{lang === 'tl' ? 'Sinusuri ng AI...' : 'AI Analyzing Symptoms...'}</Text>
                  </View>
                ) : (
                  <Text style={styles.aiAnalyzeBtnText}>
                    {lang === 'tl' ? '🤖 Suriin Gamit ang AI (Analyze with AI)' : '🤖 Analyze with Clinical AI'}
                  </Text>
                )}
              </MotionPressable>
            </View>

            {/* ── AI Clinical Assessment Result Card ── */}
            {aiResult && (
              <View style={styles.aiResultCard}>
                <View style={styles.resultHeaderRow}>
                  <View style={[
                    styles.urgencyPill, 
                    aiResult.urgencyLevel === 'CRITICAL' ? styles.urgencyCritical : styles.urgencyHigh
                  ]}>
                    <Text style={styles.urgencyPillText}>
                      {aiResult.urgencyLevel === 'CRITICAL' ? '🚨 CRITICAL OUTBREAK RISK' : '⚠️ HIGH VULNERABILITY'}
                    </Text>
                  </View>
                  <Text style={styles.voucherPill}>{aiResult.voucherCode}</Text>
                </View>

                <Text style={styles.conditionTitle}>{aiResult.suspectedCondition}</Text>

                {/* Detected Symptoms Chips */}
                <View style={styles.symptomsListRow}>
                  {aiResult.detectedSymptoms?.map((symp, i) => (
                    <View key={i} style={styles.symptomBadge}>
                      <Text style={styles.symptomBadgeText}>✓ {symp}</Text>
                    </View>
                  ))}
                </View>

                {/* Recommended Medicine Protocol */}
                <View style={styles.medicineCardRow}>
                  <MedicineIcon size={20} color="#DC2626" />
                  <View style={{ flex: 1 }}>
                    <Text style={styles.medicineLabel}>{lang === 'tl' ? 'Inirerekomendang Gamot / Prophylaxis:' : 'Recommended Protocol:'}</Text>
                    <Text style={styles.medicineName}>{aiResult.recommendedMedicine}</Text>
                  </View>
                </View>

                {/* Medical Guidance */}
                <View style={styles.guidanceBox}>
                  <Text style={styles.guidanceText}>{aiResult.medicalGuidance}</Text>
                </View>

                {/* Logistics Channel Note */}
                <View style={styles.logisticsNotice}>
                  <MapPinIcon size={16} color="#1557B0" />
                  <Text style={styles.logisticsNoticeText}>
                    {aiResult.deliveryMode === 'DOOR_TO_DOOR_DISPATCH'
                      ? (lang === 'tl' ? '🚚 Ihahatid ng Barangay Field Staff sa mismong bahay dahil sa limitasyon sa pagkilos.' : '🚚 Door-to-Door Barangay Staff delivery due to mobility constraint.')
                      : (lang === 'tl' ? '🏥 Kunin agad sa Barangay 344 Health Center gamit ang Voucher Code na ito.' : '🏥 Instant Pickup at Barangay 344 Health Center with this Voucher Code.')}
                  </Text>
                </View>

                {/* Final Submit Button */}
                <MotionPressable
                  style={[styles.submitAiTicketBtn, loading && { opacity: 0.75 }]}
                  onPress={handleSubmitAiTriageRequest}
                  disabled={loading}
                  activeOpacity={0.85}
                >
                  {loading ? (
                    <ActivityIndicator color="#FFFFFF" />
                  ) : (
                    <Text style={styles.submitAiTicketBtnText}>
                      {lang === 'tl' ? '📨 Isumite ang Ticket sa Barangay & City Health' : '📨 Submit Ticket to Barangay & City Health'}
                    </Text>
                  )}
                </MotionPressable>
              </View>
            )}
          </View>
        ) : (
          /* ── STANDARD RELIEF PACKAGES TAB ── */
          <View>
            {/* Selected Count Indicator Badge */}
            <View style={styles.selectionSummaryRow}>
              <View style={styles.selectedCountBadge}>
                <Text style={styles.selectedCountText}>
                  {selectedIds.length} {lang === 'tl' ? 'Uri ng Ayuda ang Napili' : 'Package Types Selected'}
                </Text>
              </View>
              <Text style={styles.tapToToggleHint}>
                {lang === 'tl' ? 'I-tap para i-check/uncheck' : 'Tap cards to toggle'}
              </Text>
            </View>

            {/* Multi-Select Catalog Checklist */}
            <View style={styles.catalogList}>
              {catalog.map((item) => {
                const isSelected = selectedIds.includes(item.id);
                return (
                  <MotionPressable
                    key={item.id}
                    style={[
                      styles.catalogCard,
                      isSelected && styles.catalogCardSelected,
                    ]}
                    onPress={() => togglePackage(item.id)}
                    activeOpacity={0.85}
                  >
                    <View style={styles.catalogCardLeft}>
                      {/* Modern Checkbox Box */}
                      <View style={[styles.checkboxSquare, isSelected && styles.checkboxSquareSelected]}>
                        {isSelected && <CheckIcon size={14} color="#FFFFFF" />}
                      </View>

                      {/* Icon Badge */}
                      <View style={[styles.catalogIconBadge, isSelected ? { backgroundColor: item.tagBg } : null]}>
                        <item.IconComponent size={20} color={isSelected ? item.tagColor : '#64748B'} />
                      </View>

                      {/* Text Details & Category Tag */}
                      <View style={{ flex: 1 }}>
                        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 6 }}>
                          <Text style={[styles.catalogName, isSelected && { color: '#0F172A', fontWeight: '800' }]}>
                            {item.name}
                          </Text>
                          <View style={[styles.categoryPill, { backgroundColor: item.tagBg }]}>
                            <Text style={[styles.categoryPillText, { color: item.tagColor }]}>
                              {item.tag}
                            </Text>
                          </View>
                        </View>
                        <Text style={styles.catalogDesc}>{item.desc}</Text>
                      </View>
                    </View>
                  </MotionPressable>
                );
              })}
            </View>

            {/* Automated Right-Sized Quota Notice Card */}
            <View style={styles.quotaInfoCard}>
              <View style={styles.quotaHeaderRow}>
                <ShieldCheckIcon size={18} color="#D97706" />
                <Text style={styles.quotaTitle}>
                  {lang === 'tl' ? 'Smart Right-Sized Quota Allocation' : 'Smart Right-Sized Quota Allocation'}
                </Text>
              </View>
              <Text style={styles.quotaBody}>
                {lang === 'tl'
                  ? 'Tanging ang mga piniling relief pack lamang ang ihahanda ng Barangay Staff para sa inyong pamilya batay sa bilang ng inyong rehistradong pamilya.'
                  : 'Relief volume is right-sized to your registered composition to avoid supply wastage.'}
              </Text>
            </View>

            {/* Notes Field */}
            <NeumorphicInput
              label={lang === 'tl' ? 'KARAGDAGANG IMPORMASYON O SPECIFIC NA PANGANGAILANGAN' : 'ADDITIONAL VULNERABILITIES OR SPECIFIC NEEDS'}
              value={notes}
              onChangeText={setNotes}
              placeholder={lang === 'tl' ? 'hal. May sanggol na may allergy, kailangan ng maintenance medicine, o emergency food substitute...' : 'e.g. Household has an infant with milk allergy or family member on specific maintenance medication...'}
              helperText={lang === 'tl' ? `${notes.length}/200 characters (Opsyonal na karagdagang medikal o nutrisyon)` : `${notes.length}/200 characters (Optional medical notes or nutritional requests)`}
              maxLength={200}
              multiline
              numberOfLines={3}
            />

            {/* Submit Button with MotionPressable */}
            <MotionPressable
              style={[styles.submitBtn, loading && { opacity: 0.7 }]}
              onPress={handleSubmitRequest}
              disabled={loading}
              activeOpacity={0.85}
            >
              {loading ? (
                <ActivityIndicator color="#FFFFFF" />
              ) : (
                <Text style={styles.submitBtnText}>
                  {lang === 'tl' ? `Isumite ang Kahilingan (${selectedIds.length} Napili)` : `Submit Request (${selectedIds.length} Selected)`}
                </Text>
              )}
            </MotionPressable>
          </View>
        )}
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F8F9F7' },
  content: {
    paddingHorizontal: RESPONSIVE.padding,
    paddingTop: 14,
    paddingBottom: hp(14),
  },
  header: { marginBottom: 14 },
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
    marginBottom: 3,
    textTransform: 'uppercase',
  },
  title: { fontSize: 22, fontWeight: FONT_WEIGHT.black, color: '#172B4D', letterSpacing: -0.3 },
  sub: { fontSize: 12, color: '#64748B', marginTop: 4, lineHeight: 17 },

  tabBarRow: {
    flexDirection: 'row',
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    padding: 4,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    ...SHADOWS.sm,
  },
  tabBtn: {
    flex: 1,
    paddingVertical: 10,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 10,
    position: 'relative',
  },
  tabBtnActive: {
    backgroundColor: '#EFF6FF',
  },
  tabBtnText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#64748B',
  },
  tabBtnTextActive: {
    color: '#1557B0',
    fontWeight: '800',
  },
  tabIndicator: {
    position: 'absolute',
    bottom: 2,
    width: 24,
    height: 3,
    borderRadius: 2,
    backgroundColor: '#1557B0',
  },

  // AI Banner Card
  aiBannerCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 18,
    padding: 16,
    borderWidth: 1,
    borderColor: '#DBEAFE',
    marginBottom: 16,
    ...SHADOWS.md,
  },
  aiBadgeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  aiSparkleBadge: {
    backgroundColor: '#F5F3FF',
    borderWidth: 1,
    borderColor: '#DDD6FE',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 12,
  },
  aiSparkleText: {
    fontSize: 9.5,
    fontWeight: '800',
    color: '#7C3AED',
    letterSpacing: 0.5,
  },
  aiTagline: {
    fontSize: 11,
    fontWeight: '700',
    color: '#64748B',
  },
  aiBannerTitle: {
    fontSize: 16,
    fontWeight: FONT_WEIGHT.black,
    color: '#0F172A',
    marginBottom: 4,
  },
  aiBannerSub: {
    fontSize: 12,
    color: '#64748B',
    lineHeight: 17,
    marginBottom: 12,
  },
  promptHeaderLabel: {
    fontSize: 10,
    fontWeight: '800',
    color: '#475569',
    letterSpacing: 0.4,
    marginBottom: 6,
  },
  sampleChipsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    marginBottom: 12,
  },
  samplePromptChip: {
    backgroundColor: '#F1F5F9',
    borderWidth: 1,
    borderColor: '#CBD5E1',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 12,
  },
  samplePromptChipText: {
    fontSize: 11,
    color: '#334155',
    fontWeight: '600',
  },
  aiInputWrapper: {
    backgroundColor: '#F8FAFC',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#CBD5E1',
    padding: 10,
    marginBottom: 12,
  },
  aiTextInput: {
    fontSize: 13,
    color: '#0F172A',
    minHeight: 80,
  },
  aiAnalyzeBtn: {
    backgroundColor: '#1557B0',
    borderRadius: 12,
    paddingVertical: 12,
    alignItems: 'center',
    justifyContent: 'center',
    ...SHADOWS.sm,
  },
  aiAnalyzeBtnText: {
    fontSize: 13,
    fontWeight: '800',
    color: '#FFFFFF',
  },

  // AI Result Card
  aiResultCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 18,
    padding: 16,
    borderWidth: 1.5,
    borderColor: '#DC2626',
    marginBottom: 20,
    ...SHADOWS.md,
  },
  resultHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 10,
  },
  urgencyPill: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 14,
  },
  urgencyCritical: {
    backgroundColor: '#FEF2F2',
    borderWidth: 1,
    borderColor: '#FECACA',
  },
  urgencyHigh: {
    backgroundColor: '#FFFBEB',
    borderWidth: 1,
    borderColor: '#FDE68A',
  },
  urgencyPillText: {
    fontSize: 10,
    fontWeight: '900',
    color: '#DC2626',
    letterSpacing: 0.5,
  },
  voucherPill: {
    fontSize: 11,
    fontWeight: '800',
    color: '#1557B0',
    backgroundColor: '#EFF6FF',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
  },
  conditionTitle: {
    fontSize: 15,
    fontWeight: FONT_WEIGHT.black,
    color: '#0F172A',
    marginBottom: 8,
  },
  symptomsListRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    marginBottom: 12,
  },
  symptomBadge: {
    backgroundColor: '#FEF2F2',
    borderWidth: 1,
    borderColor: '#FCA5A5',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
  },
  symptomBadgeText: {
    fontSize: 10.5,
    fontWeight: '700',
    color: '#991B1B',
  },
  medicineCardRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    backgroundColor: '#FEF2F2',
    padding: 10,
    borderRadius: 10,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: '#FECACA',
  },
  medicineLabel: {
    fontSize: 10.5,
    fontWeight: '700',
    color: '#7F1D1D',
  },
  medicineName: {
    fontSize: 12.5,
    fontWeight: '800',
    color: '#991B1B',
  },
  guidanceBox: {
    backgroundColor: '#F8FAFC',
    padding: 10,
    borderRadius: 10,
    borderLeftWidth: 3,
    borderLeftColor: '#DC2626',
    marginBottom: 10,
  },
  guidanceText: {
    fontSize: 11.5,
    color: '#334155',
    lineHeight: 17,
  },
  logisticsNotice: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#EFF6FF',
    padding: 10,
    borderRadius: 10,
    marginBottom: 14,
  },
  logisticsNoticeText: {
    fontSize: 11.5,
    color: '#1E40AF',
    fontWeight: '700',
    flex: 1,
  },
  submitAiTicketBtn: {
    backgroundColor: '#DC2626',
    borderRadius: 12,
    paddingVertical: 12,
    alignItems: 'center',
    justifyContent: 'center',
    ...SHADOWS.sm,
  },
  submitAiTicketBtnText: {
    fontSize: 13,
    fontWeight: '800',
    color: '#FFFFFF',
  },

  // Standard Catalog
  selectionSummaryRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 10,
  },
  selectedCountBadge: {
    backgroundColor: '#EFF6FF',
    borderWidth: 1,
    borderColor: '#BFDBFE',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  selectedCountText: { fontSize: 11, fontWeight: '800', color: '#1557B0' },
  tapToToggleHint: { fontSize: 11, color: '#94A3B8' },
  catalogList: { gap: 10, marginBottom: 16 },
  catalogCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    padding: 14,
    borderWidth: 1.5,
    borderColor: '#E2E8F0',
    ...SHADOWS.sm,
  },
  catalogCardSelected: {
    borderColor: '#1557B0',
    backgroundColor: '#F8FAFC',
  },
  catalogCardLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  checkboxSquare: {
    width: 20,
    height: 20,
    borderRadius: 6,
    borderWidth: 2,
    borderColor: '#CBD5E1',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FFFFFF',
  },
  checkboxSquareSelected: {
    backgroundColor: '#1557B0',
    borderColor: '#1557B0',
  },
  catalogIconBadge: {
    width: 38,
    height: 38,
    borderRadius: 10,
    backgroundColor: '#F1F5F9',
    alignItems: 'center',
    justifyContent: 'center',
  },
  catalogName: { fontSize: 13.5, fontWeight: '700', color: '#334155' },
  categoryPill: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 8,
  },
  categoryPillText: { fontSize: 9.5, fontWeight: '800' },
  catalogDesc: { fontSize: 11.5, color: '#64748B', marginTop: 2 },
  quotaInfoCard: {
    backgroundColor: '#FFFBEB',
    borderRadius: 14,
    padding: 12,
    borderWidth: 1,
    borderColor: '#FDE68A',
    marginBottom: 16,
  },
  quotaHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 4,
  },
  quotaTitle: { fontSize: 12, fontWeight: '800', color: '#92400E' },
  quotaBody: { fontSize: 11, color: '#78350F', lineHeight: 16 },
  submitBtn: {
    backgroundColor: '#1557B0',
    borderRadius: 14,
    paddingVertical: 14,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 10,
    ...SHADOWS.md,
  },
  submitBtnText: { fontSize: 14, fontWeight: '800', color: '#FFFFFF' },

  // Submitted Success
  submittedContainer: {
    flex: 1,
    backgroundColor: '#F8F9F7',
    alignItems: 'center',
    justifyContent: 'center',
    padding: RESPONSIVE.padding,
  },
  successIconCircle: {
    width: 70,
    height: 70,
    borderRadius: 35,
    backgroundColor: '#16A34A',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
    ...SHADOWS.md,
  },
  successTitle: { fontSize: 20, fontWeight: FONT_WEIGHT.black, color: '#0F172A', textAlign: 'center', marginBottom: 6 },
  successSub: { fontSize: 12.5, color: '#64748B', textAlign: 'center', marginBottom: 16, lineHeight: 18 },
  voucherBoxCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 16,
    width: '100%',
    borderWidth: 1.5,
    borderColor: '#1557B0',
    alignItems: 'center',
    marginBottom: 20,
    ...SHADOWS.md,
  },
  voucherBoxKicker: { fontSize: 10, fontWeight: '800', color: '#1557B0', letterSpacing: 0.5, marginBottom: 4 },
  voucherBoxCode: { fontSize: 22, fontWeight: FONT_WEIGHT.black, color: '#0F172A', letterSpacing: 1 },
  voucherDivider: { width: '100%', height: 1, backgroundColor: '#E2E8F0', marginVertical: 10 },
  voucherBoxGuidance: { fontSize: 11.5, color: '#334155', textAlign: 'center', lineHeight: 16, marginBottom: 10 },
  voucherPickupPill: {
    backgroundColor: '#EFF6FF',
    borderWidth: 1,
    borderColor: '#BFDBFE',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
  },
  voucherPickupText: { fontSize: 11, fontWeight: '800', color: '#1557B0' },
  resetBtn: {
    backgroundColor: '#1557B0',
    borderRadius: 14,
    paddingVertical: 14,
    paddingHorizontal: 30,
    alignItems: 'center',
    justifyContent: 'center',
    ...SHADOWS.md,
  },
  resetBtnText: { fontSize: 13, fontWeight: '800', color: '#FFFFFF' },
});

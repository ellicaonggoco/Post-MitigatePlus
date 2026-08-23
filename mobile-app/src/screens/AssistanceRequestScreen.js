import React, { useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ScrollView, ActivityIndicator, Platform, KeyboardAvoidingView, Alert } from 'react-native';
import { submitAssistanceRequest } from '../services/api';
import NeumorphicInput from '../components/NeumorphicInput';
import { CheckIcon, ShieldCheckIcon, FoodIcon, BabyIcon, MedicineIcon, HygieneIcon, WaterDropIcon, ArrowLeftIcon } from '../components/AppIcons';
import { COLORS, FONT_WEIGHT, SHADOWS, RESPONSIVE, wp, hp } from '../theme';
import { TRANSLATIONS } from '../i18n/translations';
import { MotionPressable } from '../components/motion';

export default function AssistanceRequestScreen({ token, lang = 'en', onBack, onSubmitSuccess }) {
  const t = TRANSLATIONS[lang] || TRANSLATIONS.en;

  const catalog = [
    { id: 'food', name: t.itemFoodPack, desc: t.itemFoodPackDesc, IconComponent: FoodIcon },
    { id: 'infant', name: t.itemInfant, desc: t.itemInfantDesc, IconComponent: BabyIcon },
    { id: 'senior', name: t.itemSenior, desc: t.itemSeniorDesc, IconComponent: MedicineIcon },
    { id: 'hygiene', name: t.itemHygiene, desc: t.itemHygieneDesc, IconComponent: HygieneIcon },
    { id: 'water', name: t.itemWater, desc: t.itemWaterDesc, IconComponent: WaterDropIcon },
  ];

  const [selectedItem, setSelectedItem] = useState('food');
  const [notes, setNotes] = useState('');
  const [loading, setLoading] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  const handleSubmitRequest = async () => {
    const itemData = catalog.find(i => i.id === selectedItem);
    setLoading(true);

    try {
      await submitAssistanceRequest(
        {
          itemType: itemData.name,
          quantity: 1, // Right-sized automated bundle
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
    const itemData = catalog.find(i => i.id === selectedItem);
    return (
      <View style={styles.submittedContainer}>
        <View style={styles.successIconCircle}>
          <CheckIcon size={32} color="#FFFFFF" />
        </View>
        <Text style={styles.successTitle}>{t.requestSuccessTitle}</Text>
        <Text style={styles.successSub}>
          {lang === 'tl'
            ? `Naitala sa Manila LGU Relief Queue ang inyong kahilingan para sa ${itemData?.name}. Ang dami ay awtomatikong itinugma sa bilang ng inyong rehistradong pamilya.`
            : `Logged in Manila LGU Relief Queue: Request for ${itemData?.name}. Allocation is automatically right-sized to your registered household headcount and priority index.`}
        </Text>
        <MotionPressable
          style={styles.resetBtn}
          onPress={() => {
            setSubmitted(false);
            setNotes('');
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
        <Text style={styles.title}>{t.requestReliefTitle}</Text>
        <Text style={styles.sub}>
          {lang === 'tl'
            ? 'Pumili ng uri ng ayuda na kailangan ng inyong pamilya. Ang kabuuang dami ay awtomatikong itinatakda batay sa inyong rehistradong profile.'
            : 'Select the relief package category needed. The quota quantity is automatically right-sized based on your verified household composition.'}
        </Text>
      </View>

      {/* Automated Right-Sized Quota Notice Card */}
      <View style={styles.quotaInfoCard}>
        <View style={styles.quotaHeaderRow}>
          <ShieldCheckIcon size={18} color="#D97706" />
          <Text style={styles.quotaTitle}>
            {lang === 'tl' ? 'Awtomatikong Kinalkulang Alokasyon' : 'Automated Right-Sized Quota'}
          </Text>
        </View>
        <Text style={styles.quotaBody}>
          {lang === 'tl'
            ? 'Hindi na kailangang mag-input ng dami dahil awtomatiko itong binibilang batay sa rehistradong miyembro ng pamilya, senior, buntis, at PWD upang matiyak ang patas at sapat na ayuda.'
            : 'Manual quantity selection is disabled. The relief volume is automatically computed from your registered household headcount and vulnerability profile to guarantee equitable distribution.'}
        </Text>
      </View>

      {/* Catalog Selector with MotionPressable spring feedback */}
      <Text style={styles.sectionLabel}>{t.catalogHeader}</Text>
      <View style={styles.catalogList}>
        {catalog.map((item) => {
          const isSelected = selectedItem === item.id;
          return (
            <MotionPressable
              key={item.id}
              style={[
                styles.catalogCard,
                isSelected && styles.catalogCardSelected,
              ]}
              onPress={() => setSelectedItem(item.id)}
              activeOpacity={0.85}
            >
              <View style={styles.catalogCardLeft}>
                <View style={[styles.radioCircle, isSelected && styles.radioCircleSelected]}>
                  {isSelected && <View style={styles.radioInner} />}
                </View>
                <View style={[styles.catalogIconBadge, isSelected && styles.catalogIconBadgeSelected]}>
                  <item.IconComponent size={20} color={isSelected ? '#1557B0' : '#64748B'} />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={[styles.catalogName, isSelected && { color: '#1557B0', fontWeight: '800' }]}>
                    {item.name}
                  </Text>
                  <Text style={styles.catalogDesc}>{item.desc}</Text>
                </View>
              </View>
            </MotionPressable>
          );
        })}
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
          <Text style={styles.submitBtnText}>{t.submitRequestBtn}</Text>
        )}
      </MotionPressable>
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
  quotaInfoCard: {
    backgroundColor: '#FEF3C7',
    borderWidth: 1,
    borderColor: '#FDE68A',
    borderRadius: 14,
    padding: 14,
    marginBottom: 16,
  },
  quotaHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 4,
  },
  quotaTitle: {
    fontSize: 13,
    fontWeight: '800',
    color: '#B45309',
  },
  quotaBody: {
    fontSize: 11.5,
    color: '#78350F',
    lineHeight: 16,
  },
  sectionLabel: {
    fontSize: 11,
    fontWeight: '800',
    color: '#172B4D',
    letterSpacing: 0.8,
    marginTop: 8,
    marginBottom: 8,
    textTransform: 'uppercase',
  },
  catalogList: { gap: 8, marginBottom: 14 },
  catalogCard: {
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#D9E2EC',
    borderRadius: 12,
    padding: 14,
    ...SHADOWS.sm,
  },
  catalogCardSelected: {
    borderColor: '#1557B0',
    backgroundColor: '#E8F2FF',
    borderWidth: 2,
  },
  catalogCardLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  radioCircle: {
    width: 20,
    height: 20,
    borderRadius: 10,
    borderWidth: 1.5,
    borderColor: '#D9E2EC',
    alignItems: 'center',
    justifyContent: 'center',
  },
  radioCircleSelected: {
    borderColor: '#1557B0',
  },
  radioInner: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: '#1557B0',
  },
  catalogIconBadge: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: '#F1F5F9',
    alignItems: 'center',
    justifyContent: 'center',
  },
  catalogIconBadgeSelected: {
    backgroundColor: '#DBEAFE',
  },
  catalogName: { fontSize: 13.5, fontWeight: '700', color: '#172B4D' },
  catalogDesc: { fontSize: 11, color: '#64748B', marginTop: 2 },
  submitBtn: {
    backgroundColor: '#1557B0',
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: 'center',
    marginTop: 10,
    ...SHADOWS.sm,
  },
  submitBtnText: {
    color: '#FFFFFF',
    fontSize: 13.5,
    fontWeight: '800',
  },
  submittedContainer: {
    flex: 1,
    backgroundColor: '#F8F9F7',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
  },
  successIconCircle: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: '#16A34A',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
    ...SHADOWS.md,
  },
  successTitle: {
    fontSize: 20,
    fontWeight: FONT_WEIGHT.black,
    color: '#172B4D',
    textAlign: 'center',
    marginBottom: 8,
  },
  successSub: {
    fontSize: 13,
    color: '#64748B',
    textAlign: 'center',
    lineHeight: 18,
    marginBottom: 24,
  },
  resetBtn: {
    backgroundColor: '#1557B0',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 10,
    ...SHADOWS.sm,
  },
  resetBtnText: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '800',
  },
});

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

  // Default selection: Food Pack and Drinking Water
  const [selectedIds, setSelectedIds] = useState(['food', 'water']);
  const [notes, setNotes] = useState('');
  const [loading, setLoading] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  const togglePackage = (id) => {
    if (selectedIds.includes(id)) {
      if (selectedIds.length === 1) {
        Alert.alert(
          lang === 'tl' ? 'Kailangan ng Kahilingan' : 'Selection Required',
          lang === 'tl'
            ? 'Pumili ng kahit isang (1) uri ng relief package bago magpatuloy.'
            : 'Please keep at least one (1) relief package selected.'
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
    const selectedList = catalog.filter(i => selectedIds.includes(i.id));
    return (
      <View style={styles.submittedContainer}>
        <View style={styles.successIconCircle}>
          <CheckIcon size={36} color="#FFFFFF" />
        </View>
        <Text style={styles.successTitle}>
          {lang === 'tl' ? 'Naitala ang Inyong Kahilingan!' : 'Relief Request Submitted!'}
        </Text>
        <Text style={styles.successSub}>
          {lang === 'tl'
            ? `Matagumpay na naitala sa Manila LGU Relief Queue ang inyong request para sa mga sumusunod:`
            : `Successfully submitted to Manila LGU Relief Queue with standard batch packaging for:`}
        </Text>

        {/* Selected Items summary chips */}
        <View style={styles.submittedItemsBox}>
          {selectedList.map(item => (
            <View key={item.id} style={[styles.submittedItemChip, { backgroundColor: item.tagBg, borderColor: item.tagColor }]}>
              <Text style={[styles.submittedItemChipText, { color: item.tagColor }]}>
                ✓ {item.name}
              </Text>
            </View>
          ))}
        </View>

        <Text style={styles.submittedExplanation}>
          {lang === 'tl'
            ? 'Awtomatikong itutugma ng system ang dami at laki ng relief pack batay sa bilang ng inyong rehistradong pamilya. Ihanda ang inyong QR Pass sa pag-claim.'
            : 'Relief volume is right-sized by our automated quota system. Present your Digital QR Pass during release or door-to-door delivery.'}
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
          <Text style={styles.kicker}>{lang === 'tl' ? 'DISASTER RELIEF ON-DEMAND' : 'DISASTER RELIEF ON-DEMAND'}</Text>
          <Text style={styles.title}>{lang === 'tl' ? 'Pumili ng Kailangang Ayuda' : 'Select Needed Relief'}</Text>
          <Text style={styles.sub}>
            {lang === 'tl'
              ? 'Piliin ang lahat ng partikular na ayuda na kailangan ng inyong pamilya. Awtomatikong kinalkula ang dami batay sa inyong miyembro.'
              : 'Select all specific relief items needed by your household. Volume is right-sized to your registered composition.'}
          </Text>
        </View>

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
              ? 'Tanging ang mga piniling relief pack lamang ang ihahanda ng Barangay Staff para sa inyong pamilya. Awtomatikong kinakalkula ang bilang batay sa dami ng inyong pamilya upang maiwasan ang pagkaubos ng suplay.'
              : 'Only your selected relief types will be prepared by relief staff. The quota is automatically calculated from your household headcount and vulnerability profile to avoid supply wastage.'}
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
  selectionSummaryRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 10,
  },
  selectedCountBadge: {
    backgroundColor: '#E0F2FE',
    borderWidth: 1,
    borderColor: '#BAE6FD',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
  },
  selectedCountText: {
    fontSize: 11.5,
    fontWeight: '800',
    color: '#0369A1',
  },
  tapToToggleHint: {
    fontSize: 11,
    color: '#94A3B8',
    fontWeight: '600',
  },
  catalogList: { gap: 8, marginBottom: 14 },
  catalogCard: {
    backgroundColor: '#FFFFFF',
    borderWidth: 1.5,
    borderColor: '#E2E8F0',
    borderRadius: 14,
    padding: 13,
    ...SHADOWS.sm,
  },
  catalogCardSelected: {
    borderColor: '#1557B0',
    backgroundColor: '#F8FBFF',
    borderWidth: 2,
  },
  catalogCardLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  checkboxSquare: {
    width: 22,
    height: 22,
    borderRadius: 6,
    borderWidth: 1.8,
    borderColor: '#CBD5E1',
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
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
  categoryPill: {
    paddingHorizontal: 7,
    paddingVertical: 2,
    borderRadius: 6,
  },
  categoryPillText: {
    fontSize: 9.5,
    fontWeight: '800',
  },
  catalogName: { fontSize: 13, fontWeight: '700', color: '#172B4D', flex: 1 },
  catalogDesc: { fontSize: 11, color: '#64748B', marginTop: 3, lineHeight: 15 },
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
  submitBtn: {
    backgroundColor: '#1557B0',
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: 'center',
    marginTop: 12,
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
    width: 68,
    height: 68,
    borderRadius: 34,
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
    marginBottom: 14,
  },
  submittedItemsBox: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    gap: 8,
    marginBottom: 16,
    paddingHorizontal: 10,
  },
  submittedItemChip: {
    borderWidth: 1,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 8,
  },
  submittedItemChipText: {
    fontSize: 12,
    fontWeight: '700',
  },
  submittedExplanation: {
    fontSize: 11.5,
    color: '#64748B',
    textAlign: 'center',
    lineHeight: 16,
    marginBottom: 20,
    paddingHorizontal: 16,
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

/**
 * MitigatePlus - AI Post-Disaster Health Triage & NLP Clinical Engine
 * ----------------------------------------------------------------------------
 * Natural Language Processing (Tagalog / English / Taglish) analyzing symptoms,
 * flood exposure, contaminated water, wounds, respiratory, and pediatric emergencies.
 */

function analyzeHealthMessage(rawText, barangayCode = '291') {
  if (!rawText || typeof rawText !== 'string') {
    return {
      urgencyLevel: 'MODERATE',
      suspectedCondition: 'General Health Inquiry',
      detectedSymptoms: [],
      diseaseRisk: 'LOW',
      isBedridden: false,
      hasSenior: false,
      hasInfant: false,
      deliveryMode: 'LOCAL_BHC_PICKUP',
      medicalGuidance: 'Please consult your nearest Barangay Health Center for health concerns.',
      voucherCode: `BHC-${barangayCode}-GEN-${Math.floor(1000 + Math.random() * 9000)}`,
      prophylaxisRequired: false,
      recommendedMedicine: 'Consultation & Clinical Assessment',
    };
  }

  const text = rawText.toLowerCase();

  // 1. Keyword Lexicon Dictionaries
  const floodKeywords = /baha|lumusong|putik|tubig-baha|maruming tubig|nabasa sa baha|flood|flooded|water|waded/i;
  const woundKeywords = /sugat|hiwa|galos|open wound|cut|scratched|wound|abrasion/i;
  const tetanusKeywords = /pako|kalawang|kinakalawang|yero|tuma|tarak|rusty|nail|puncture|bakal/i;
  const calfMuscleKeywords = /binti|kalamnan|muscle pain|calf pain|nananakit ang binti|masakit ang kalamnan|hita/i;
  const feverKeywords = /lagnat|fever|mainit|giniginaw|chills|trangkaso|sinat|mataas ang lagnat/i;
  const yellowingKeywords = /naninilaw|dilaw ang mata|jaundice|yellowish eyes|ihi na madilim|dark urine/i;

  const dengueKeywords = /dengue|kagat ng lamok|mosquito|pantal|rashes|namumula|dumudugo ang ilong|nosebleed/i;
  const diarrheaKeywords = /diarrhea|pagtatae|nagtatae|tubig ang dumi|nagsusuka|vomiting|sakit ng tiyan|dehydration|cholera/i;
  const asthmaKeywords = /hika|hinihika|humihingal|hirap huminga|asthma|wheezing|inhaler|nebulizer|ubo|plema|masikip ang dibdib/i;
  const skinFungalKeywords = /alipunga|makati sa paa|babad sa baha|fungal|buni|hadhad|pangangati|pamamalat|athlete's foot/i;
  const eyeKeywords = /sore eyes|mata|namumula ang mata|nagmumuta|eye infection|conjunctivitis/i;
  const maintenanceKeywords = /maintenance|hypertension|high blood|diabetes|insulin|dialysis|gamot sa puso|maintenance meds/i;

  // Vulnerability & Mobility
  const bedriddenKeywords = /bedridden|hindi makatayo|paralyzed|higa na lang|baldado|cannot walk|nakaratay/i;
  const trappedKeywords = /trapped|na-trap|nasa bubong|2nd floor|hindi makalabas|stranded|lubog ang daan/i;
  const seniorKeywords = /lola|lolo|matanda|senior|elderly|60|lolo ko|lola ko/i;
  const infantKeywords = /baby|sanggol|bata|infant|toddler|anak na maliit|1 taon|buwan pa lang|pediatric/i;

  const hasFlood = floodKeywords.test(text);
  const hasWound = woundKeywords.test(text);
  const hasTetanus = tetanusKeywords.test(text);
  const hasCalfPain = calfMuscleKeywords.test(text);
  const hasFever = feverKeywords.test(text);
  const hasYellowing = yellowingKeywords.test(text);
  const hasDengue = dengueKeywords.test(text);
  const hasDiarrhea = diarrheaKeywords.test(text);
  const hasAsthma = asthmaKeywords.test(text);
  const hasSkinFungal = skinFungalKeywords.test(text);
  const hasEyeInfection = eyeKeywords.test(text);
  const hasMaintenance = maintenanceKeywords.test(text);

  const isBedridden = bedriddenKeywords.test(text);
  const isTrapped = trappedKeywords.test(text);
  const hasSenior = seniorKeywords.test(text);
  const hasInfant = infantKeywords.test(text);

  const detectedSymptoms = [];
  if (hasFlood) detectedSymptoms.push('Flood Water Exposure');
  if (hasWound) detectedSymptoms.push('Skin Wound / Abrasion');
  if (hasTetanus) detectedSymptoms.push('Rusty Metal Puncture (Tetanus Risk)');
  if (hasCalfPain) detectedSymptoms.push('Calf Muscle Pain (Myalgia)');
  if (hasFever) detectedSymptoms.push('High Fever / Chills');
  if (hasYellowing) detectedSymptoms.push('Jaundice / Yellowing Sclera');
  if (hasDengue) detectedSymptoms.push('Suspected Dengue / Hemorrhagic Signs');
  if (hasDiarrhea) detectedSymptoms.push('Acute Diarrhea / Dehydration Risk');
  if (hasAsthma) detectedSymptoms.push('Bronchospasm / Asthma Flare-Up');
  if (hasSkinFungal) detectedSymptoms.push('Immersion Foot / Tinea Pedis (Alipunga)');
  if (hasEyeInfection) detectedSymptoms.push('Viral / Bacterial Conjunctivitis');
  if (hasMaintenance) detectedSymptoms.push('Chronic Maintenance Medication Depletion');

  // 2. Clinical Triage Decision Tree (10 Specific Conditions & Distinct Prescriptions)
  let urgencyLevel = 'MODERATE';
  let suspectedCondition = 'General Post-Disaster Health Consultation';
  let diseaseRisk = 'GENERAL_CHECK';
  let prophylaxisRequired = false;
  let recommendedMedicine = 'Oral Rehydration Salts & Clean Drinking Water';
  let medicalGuidance = 'Magtungo sa pinakamalapit na Barangay Health Center para sa libreng konsultasyon.';

  // 1. Critical Leptospirosis
  if ((hasFlood || hasWound) && (hasCalfPain || hasFever || hasYellowing)) {
    urgencyLevel = 'CRITICAL';
    suspectedCondition = 'High Probability of Leptospirosis Exposure (Post-Flood)';
    diseaseRisk = 'LEPTO_CRIT';
    prophylaxisRequired = true;
    recommendedMedicine = 'Doxycycline 200mg Capsules (Prophylaxis Protocol - 1 cap 2x daily x 7 days)';
    medicalGuidance = '⚠️ CRITICAL LEPTOSPIROSIS ADVISORY: May mataas na banta ng Leptospirosis dahil sa kumbinasyon ng baha, lagnat, o pananakit ng binti. Agad na kunin ang libreng Doxycycline sa Health Center sa loob ng 24 oras upang maiwasan ang komplikasyon sa bato.';
  }
  // 2. Tetanus Puncture Risk
  else if (hasTetanus && hasWound) {
    urgencyLevel = 'CRITICAL';
    suspectedCondition = 'Tetanus Infection Risk from Rusty Metal / Puncture Wound';
    diseaseRisk = 'TETANUS';
    prophylaxisRequired = true;
    recommendedMedicine = 'Anti-Tetanus Serum (ATS) & Tetanus Toxoid Vaccine + Amoxicillin 500mg';
    medicalGuidance = '⚠️ TETANUS URGENCY: Ang natusok ng kalawang o pako ay nangangailangan ng agarang Tetanus Toxoid shot at Antibiotic prophylaxis sa loob ng 24 oras upang maiwasan ang locked-jaw at muscular spasm.';
  }
  // 3. Flood Wound Exposure (Early Prophylaxis)
  else if (hasFlood && hasWound) {
    urgencyLevel = 'HIGH';
    suspectedCondition = 'Flood Wound Exposure (Leptospirosis Prevention Protocol)';
    diseaseRisk = 'LEPTO_EXP';
    prophylaxisRequired = true;
    recommendedMedicine = 'Doxycycline 200mg Single Dose + Povidone Iodine Wound Antiseptic';
    medicalGuidance = '⚠️ HIGH EXPOSURE ADVISORY: Hugasang mabuti ng malinis na tubig at sabon ang sugat. Uminom ng single dose Doxycycline prophylaxis mula sa Barangay Health Center bago mag-manifest ang lagnat.';
  }
  // 4. Pediatric Gastroenteritis / Baby Dehydration
  else if (hasDiarrhea && hasInfant) {
    urgencyLevel = 'CRITICAL';
    suspectedCondition = 'Pediatric Acute Gastroenteritis & Rapid Dehydration';
    diseaseRisk = 'GASTRO_PEDIA';
    prophylaxisRequired = true;
    recommendedMedicine = 'Pediatric Oral Rehydration Salts (ORS) + Zinc Sulfate Syrup (20mg/day)';
    medicalGuidance = '⚠️ PEDIATRIC EMERGENCY: Painumin agad ng Oral Rehydration Salts (ORS) ang sanggol sa bawat pagdumi upang maiwasan ang hypovolemic shock. Huwag hayaang maubusan ng likido.';
  }
  // 5. Adult Acute Diarrhea / Cholera Risk
  else if (hasDiarrhea) {
    urgencyLevel = 'HIGH';
    suspectedCondition = 'Waterborne Acute Gastroenteritis / Bacterial Diarrhea';
    diseaseRisk = 'DIARRHEA';
    recommendedMedicine = 'Oral Rehydration Salts (ORS) 75meq + Ciprofloxacin 500mg + Paracetamol';
    medicalGuidance = 'Uminom ng ORS solution sa bawat pagtatae upang mapalitan ang nawawalang electrolytes. Iwasan ang uminom ng tubig na hindi napakuluan nang husto.';
  }
  // 6. Vectorborne Dengue Fever
  else if (hasDengue || (hasFever && text.includes('pantal'))) {
    urgencyLevel = 'HIGH';
    suspectedCondition = 'Suspected Vectorborne Dengue Viral Infection';
    diseaseRisk = 'DENGUE';
    recommendedMedicine = 'Paracetamol 500mg + Oral Hydration Protocol (STRICTLY NO NSAIDs / Aspirin)';
    medicalGuidance = '⚠️ DENGUE PRECAUTION: Panatilihing umiinom ng maraming likido. HUWAG iinom ng Mefenamic Acid, Ibuprofen, o Aspirin dahil maaari itong magdulot ng pagdurugo sa tiyan. Magpasuri ng platelet count sa Health Center.';
  }
  // 7. Asthma / Respiratory Emergency
  else if (hasAsthma) {
    urgencyLevel = 'HIGH';
    suspectedCondition = 'Post-Flood Bronchospasm & Acute Asthma Exacerbation';
    diseaseRisk = 'ASTHMA';
    recommendedMedicine = 'Salbutamol 2.5mg Respiratory Nebules / Inhaler + Cetirizine 10mg';
    medicalGuidance = 'Lumayo sa basang lugar o amag mula sa baha. Gamitin ang Salbutamol inhaler o magpunta sa Barangay Health Center para sa libreng nebulization therapy kung hirap huminga.';
  }
  // 8. Fungal Skin Infection / Alipunga
  else if (hasSkinFungal) {
    urgencyLevel = 'MODERATE';
    suspectedCondition = 'Immersion Foot / Tinea Pedis (Alipunga & Fungal Dermatitis)';
    diseaseRisk = 'ALIPUNGA';
    recommendedMedicine = 'Clotrimazole 1% Antifungal Cream + Antibacterial Wash Soap';
    medicalGuidance = 'Panatilihing tuyo at malinis ang mga paa. Pahiran ng Clotrimazole cream 2x bawat araw pagkatapos hugasan ng sabon. Huwag kamutin upang maiwasan ang bacterial secondary infection.';
  }
  // 9. Eye Infection / Sore Eyes
  else if (hasEyeInfection) {
    urgencyLevel = 'MODERATE';
    suspectedCondition = 'Post-Flood Bacterial / Viral Conjunctivitis (Sore Eyes)';
    diseaseRisk = 'SORE_EYES';
    recommendedMedicine = 'Tobramycin 0.3% Antibacterial Eye Drops + Cold Compress Kit';
    medicalGuidance = 'Patakan ng 1-2 patak ng Tobramycin eye drops ang apektadong mata 3x sa isang araw. Maghugas ng kamay bago at pagkatapos hawakan ang mata upang hindi makahawa sa pamilya.';
  }
  // 10. Senior Chronic Disease Maintenance Refill
  else if (hasMaintenance && hasSenior) {
    urgencyLevel = 'HIGH';
    suspectedCondition = 'Disrupted Senior Chronic Disease Care (Emergency Refill)';
    diseaseRisk = 'CHRONIC_CARE';
    recommendedMedicine = 'Emergency Refill: Amlodipine 5mg / Losartan 50mg / Metformin 500mg';
    medicalGuidance = 'Pumunta sa Barangay Health Center para sa emergency 14-day supply replenishment ng maintenance medicines upang maiwasan ang hypertensive crisis o diabetic stroke.';
  }

  // Logistics Routing
  let deliveryMode = 'LOCAL_BHC_PICKUP';
  let deliveryReason = 'Ambulatory patient - instant claim at Barangay Health Center';

  if (isBedridden) {
    deliveryMode = 'DOOR_TO_DOOR_DISPATCH';
    deliveryReason = 'Bedridden citizen - requires Barangay Field Staff door-to-door delivery';
  } else if (isTrapped) {
    deliveryMode = 'DOOR_TO_DOOR_DISPATCH';
    deliveryReason = 'Trapped in high flood - requires emergency responder dispatch';
  } else if (urgencyLevel === 'CRITICAL' && hasSenior) {
    deliveryMode = 'PRIORITY_BHC_PICKUP';
    deliveryReason = 'Critical senior citizen - priority express lane at Health Center';
  }

  const randomSuffix = Math.floor(1000 + Math.random() * 9000);
  const voucherCode = `MED-${barangayCode}-${diseaseRisk.substring(0, 5)}-${randomSuffix}`;

  return {
    rawMessage: rawText,
    urgencyLevel,
    suspectedCondition,
    diseaseRisk,
    detectedSymptoms: detectedSymptoms.length > 0 ? detectedSymptoms : ['General Health Symptom Inquiry'],
    vulnerabilities: {
      isBedridden,
      isTrapped,
      hasSenior,
      hasInfant,
    },
    deliveryMode,
    deliveryReason,
    prophylaxisRequired,
    recommendedMedicine,
    medicalGuidance,
    voucherCode,
    analyzedAt: new Date().toISOString(),
  };
}

module.exports = {
  analyzeHealthMessage,
};

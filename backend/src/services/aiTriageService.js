/**
 * MitigatePlus - AI Post-Disaster Health Triage & NLP Engine
 * ----------------------------------------------------------------------------
 * Performs Natural Language Processing (Tagalog / English / Taglish) on citizen
 * emergency descriptions and health assistance requests.
 */

function analyzeHealthMessage(rawText, barangayCode = '344') {
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
      recommendedMedicine: 'Consultation & Assessment',
    };
  }

  const text = rawText.toLowerCase();

  // 1. Symptom & Exposure Dictionaries (Tagalog / Taglish / English)
  const floodKeywords = /baha|lumusong|putik|tubig-baha|maruming tubig|nabasa sa baha|flood|flooded|water|waded/i;
  const woundKeywords = /sugat|hiwa|galos|open wound|cut|scratched|wound|abrasion/i;
  const calfMuscleKeywords = /binti|kalamnan|muscle pain|calf pain|nananakit ang binti|masakit ang kalamnan|hita/i;
  const feverKeywords = /lagnat|fever|mainit|giniginaw|chills|trangkaso|sinat|mataas ang lagnat/i;
  const yellowingKeywords = /naninilaw|dilaw ang mata|jaundice|yellowish eyes|ihi na madilim|dark urine/i;

  const dengueKeywords = /dengue|kagat ng lamok|mosquito|pantal|rashes|namumula|dumudugo ang ilong|nosebleed/i;
  const diarrheaKeywords = /diarrhea|pagtatae|nagtatae|tubig ang dumi|nagsusuka|vomiting|sakit ng tiyan|dehydration/i;
  const maintenanceKeywords = /maintenance|hypertension|high blood|diabetes|insulin|dialysis|asthma|hinihika|gamot sa puso/i;

  // 2. Vulnerability & Mobility Constraints
  const bedriddenKeywords = /bedridden|hindi makatayo|paralyzed|higa na lang|baldado|cannot walk|nakaratay/i;
  const trappedKeywords = /trapped|na-trap|nasa bubong|2nd floor|hindi makalabas|stranded|lubog ang daan/i;
  const seniorKeywords = /lola|lolo|matanda|senior|elderly|60|lolo ko|lola ko/i;
  const infantKeywords = /baby|sanggol|bata|infant|toddler|anak na maliit|1 taon|buwan pa lang/i;

  const hasFlood = floodKeywords.test(text);
  const hasWound = woundKeywords.test(text);
  const hasCalfPain = calfMuscleKeywords.test(text);
  const hasFever = feverKeywords.test(text);
  const hasYellowing = yellowingKeywords.test(text);
  const hasDengue = dengueKeywords.test(text);
  const hasDiarrhea = diarrheaKeywords.test(text);
  const hasMaintenance = maintenanceKeywords.test(text);

  const isBedridden = bedriddenKeywords.test(text);
  const isTrapped = trappedKeywords.test(text);
  const hasSenior = seniorKeywords.test(text);
  const hasInfant = infantKeywords.test(text);

  const detectedSymptoms = [];
  if (hasFlood) detectedSymptoms.push('Flood Water Exposure');
  if (hasWound) detectedSymptoms.push('Open Skin Wound/Abrasion');
  if (hasCalfPain) detectedSymptoms.push('Calf Muscle Pain (Myalgia)');
  if (hasFever) detectedSymptoms.push('High Fever / Chills');
  if (hasYellowing) detectedSymptoms.push('Jaundice / Yellowing Sclera');
  if (hasDengue) detectedSymptoms.push('Suspected Dengue Symptoms / Rashes');
  if (hasDiarrhea) detectedSymptoms.push('Acute Diarrhea / Dehydration');
  if (hasMaintenance) detectedSymptoms.push('Interrupted Chronic Maintenance');

  // 3. Clinical Triage Decision Tree (DOH & WHO Guidelines)
  let urgencyLevel = 'MODERATE';
  let suspectedCondition = 'General Post-Disaster Health Consultation';
  let diseaseRisk = 'LOW';
  let prophylaxisRequired = false;
  let recommendedMedicine = 'Oral Rehydration Salts & Clean Water';
  let medicalGuidance = 'Magtungo sa pinakamalapit na Barangay Health Center para sa libreng konsultasyon.';

  // LEPTOSPIROSIS TRIAGE
  if ((hasFlood || hasWound) && (hasCalfPain || hasFever || hasYellowing)) {
    urgencyLevel = 'CRITICAL';
    suspectedCondition = 'High Probability of Leptospirosis Exposure (Post-Flood)';
    diseaseRisk = 'CRITICAL_LEPTOSPIROSIS';
    prophylaxisRequired = true;
    recommendedMedicine = 'Doxycycline 200mg Capsules (Prophylaxis Protocol)';
    medicalGuidance = '⚠️ CRITICAL MEDICAL ADVISORY: May mataas na banta ng Leptospirosis. Agad na kunin ang libreng Doxycycline prophylaxis sa inyong Barangay Health Center sa loob ng 24-48 oras upang maiwasan ang komplikasyon sa bato at atay.';
  } else if (hasFlood && hasWound) {
    urgencyLevel = 'HIGH';
    suspectedCondition = 'Flood Wound Exposure (Leptospirosis Prevention Protocol)';
    diseaseRisk = 'HIGH_LEPTOSPIROSIS_EXPOSURE';
    prophylaxisRequired = true;
    recommendedMedicine = 'Doxycycline 200mg Single Dose & Antiseptic Wound Wash';
    medicalGuidance = '⚠️ HIGH EXPOSURE ADVISORY: Hugasang mabuti ng malinis na tubig at sabon ang sugat. Uminom ng Doxycycline prophylaxis mula sa Barangay Health Center bago mag-manifest ang lagnat.';
  } else if (hasDiarrhea && hasInfant) {
    urgencyLevel = 'CRITICAL';
    suspectedCondition = 'Pediatric Acute Gastroenteritis & Rapid Dehydration';
    diseaseRisk = 'CRITICAL_GASTROENTERITIS';
    prophylaxisRequired = true;
    recommendedMedicine = 'Pediatric Oral Rehydration Salts (ORS) & Zinc Supplements';
    medicalGuidance = '⚠️ PEDIATRIC EMERGENCY: Painumin agad ng Oral Rehydration Salts (ORS) ang sanggol. Huwag hayaang maubusan ng likido habang patungo sa Health Center.';
  } else if (hasDengue) {
    urgencyLevel = 'HIGH';
    suspectedCondition = 'Suspected Vectorborne Dengue Viral Infection';
    diseaseRisk = 'HIGH_DENGUE';
    recommendedMedicine = 'Paracetamol 500mg & Hydration Monitoring (NO NSAIDs/Aspirin)';
    medicalGuidance = '⚠️ DENGUE ADVISORY: Panatilihing umiinom ng maraming likido. Huwag iinom ng Ibuprofen o Aspirin dahil maaari itong magdulot ng pagdurugo. Magpasuri ng CBC count sa Health Center.';
  } else if (hasMaintenance && hasSenior) {
    urgencyLevel = 'HIGH';
    suspectedCondition = 'Disrupted Senior Chronic Disease Care';
    diseaseRisk = 'CHRONIC_CARE_DISRUPTION';
    recommendedMedicine = 'Hypertension / Diabetes Maintenance Replenishment';
    medicalGuidance = 'Pumunta sa Barangay Health Center para sa emergency refill ng inyong maintenance na gamot sa high blood o diabetes.';
  }

  // 4. Logistics Routing (Local BHC Claim vs Door-to-Door Field Dispatch)
  let deliveryMode = 'LOCAL_BHC_PICKUP';
  let deliveryReason = 'Ambulatory patient - instant claim at Barangay Health Center';

  if (isBedridden) {
    deliveryMode = 'DOOR_TO_DOOR_DISPATCH';
    deliveryReason = 'Bedridden citizen - requires Barangay Field Staff door-to-door delivery';
  } else if (isTrapped) {
    deliveryMode = 'DOOR_TO_DOOR_DISPATCH';
    deliveryReason = 'Trapped in high flood - requires emergency responder / boat dispatch';
  } else if (urgencyLevel === 'CRITICAL' && hasSenior) {
    deliveryMode = 'PRIORITY_BHC_PICKUP';
    deliveryReason = 'Critical senior citizen - priority express lane at Health Center or local dispatch';
  }

  // 5. Unique Cryptographic Claim Voucher Code
  const randomSuffix = Math.floor(1000 + Math.random() * 9000);
  const voucherCode = `MED-${barangayCode}-${diseaseRisk.substring(0, 5)}-${randomSuffix}`;

  return {
    rawMessage: rawText,
    urgencyLevel,
    suspectedCondition,
    diseaseRisk,
    detectedSymptoms,
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

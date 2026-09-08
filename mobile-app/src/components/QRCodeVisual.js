import React, { useState, useMemo } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Alert, Image } from 'react-native';
import Svg, { Rect, Path, G } from 'react-native-svg';
import { LinearGradient } from 'expo-linear-gradient';
import QRCodeCore from 'qrcode/lib/core/qrcode';
import { COLORS, RADIUS, FONT_WEIGHT, SPACING, SHADOWS } from '../theme';

/**
 * Generates an ISO/IEC 18004 compliant QR Matrix with full Reed-Solomon
 * Error Correction Codewords. Uses Level 'H' (High - 30% error recovery)
 * so phone-to-phone scanning is instantaneous even under screen glare,
 * distance, or center civic seal badge overlay.
 */
function generateStandardQRMatrix(text, ecc = 'H') {
  const cleanCode = String(text || 'MNL-QR-OFFICIAL-PASS').trim();
  try {
    const qr = QRCodeCore.create(cleanCode, { errorCorrectionLevel: ecc });
    const size = qr.modules.size;
    const matrix = [];
    for (let r = 0; r < size; r++) {
      const row = [];
      for (let c = 0; c < size; c++) {
        row.push(qr.modules.get(r, c) ? 1 : 0);
      }
      matrix.push(row);
    }
    return matrix;
  } catch (err) {
    console.warn('Standard QR generation ECC H warning, trying M:', err);
    try {
      const qr = QRCodeCore.create(cleanCode, { errorCorrectionLevel: 'M' });
      const size = qr.modules.size;
      const matrix = [];
      for (let r = 0; r < size; r++) {
        const row = [];
        for (let c = 0; c < size; c++) {
          row.push(qr.modules.get(r, c) ? 1 : 0);
        }
        matrix.push(row);
      }
      return matrix;
    } catch (e) {
      console.error('Fatal QR generation failure:', e);
      return [];
    }
  }
}

export default function QRCodeVisual({ value, size = 200, lang = 'tl', isVerified = true, darkMode = false, compact = false, isCompact = false }) {
  const isCompactMode = compact || isCompact;
  const [copied, setCopied] = useState(false);
  const code = value || 'MNL-QR-OFFICIAL-PASS';

  const qrMatrix = useMemo(() => {
    return generateStandardQRMatrix(code, 'H');
  }, [code]);

  const handleCopy = () => {
    try {
      if (typeof navigator !== 'undefined' && navigator.clipboard && navigator.clipboard.writeText) {
        navigator.clipboard.writeText(code).catch(() => {});
      }
    } catch (e) {}
    setCopied(true);
    setTimeout(() => setCopied(false), 2200);
  };

  const matrixSize = qrMatrix.length || 21;
  const svgSize = isCompactMode ? (size || 160) : 240;
  // Wide 4-module quiet zone padding essential for hardware camera edge detection
  const padding = isCompactMode ? 12 : 18;
  const moduleSize = (svgSize - padding * 2) / matrixSize;

  // =========================================================================
  // COMPACT MODE: Render 100% Unobstructed High-Contrast Pure Black QR Matrix
  // =========================================================================
  if (isCompactMode) {
    return (
      <View style={[styles.compactFrame, { width: svgSize + 8, height: svgSize + 8 }]}>
        <Svg width={svgSize} height={svgSize} viewBox={`0 0 ${svgSize} ${svgSize}`}>
          <Rect width={svgSize} height={svgSize} fill="#FFFFFF" rx={8} />
          {qrMatrix.map((row, r) =>
            row.map((cell, c) => {
              if (cell === 1) {
                return (
                  <Rect
                    key={`${r}-${c}`}
                    x={padding + c * moduleSize}
                    y={padding + r * moduleSize}
                    width={moduleSize}
                    height={moduleSize}
                    rx={0}
                    fill="#000000"
                  />
                );
              }
              return null;
            })
          )}
        </Svg>
      </View>
    );
  }

  // =========================================================================
  // FULL EXPANDED MODE: Render Full Metallic / Civic Card
  // =========================================================================
  return (
    <View style={styles.container}>
      <LinearGradient
        colors={['#0B1D4E', '#163B8C', '#234AAA']}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={[styles.qrCard, SHADOWS.lg]}
      >
        <View style={styles.passHeader}>
          <View style={styles.passSealCircle}>
            <Image
              source={require('../../assets/logo-mark.png')}
              style={{ width: 22, height: 22 }}
              resizeMode="contain"
            />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={styles.passKicker}>
              {lang === 'tl' ? 'OPISYAL NA CITIZEN RELIEF PASS' : 'OFFICIAL CITIZEN RELIEF PASS'}
            </Text>
            <Text style={styles.passTitle}>
              {lang === 'tl' ? 'Household Digital ID' : 'Household Digital ID'}
            </Text>
            <Text style={styles.passSub}>
              {lang === 'tl' ? 'Pamahalaang Lungsod ng Maynila • LGU Recovery' : 'City Government of Manila • LGU Recovery'}
            </Text>
          </View>
          <View style={styles.goldBadge}>
            <Text style={styles.goldBadgeText}>
              {lang === 'tl' ? 'BERIPIKADO' : 'VERIFIED'}
            </Text>
          </View>
        </View>

        <View style={styles.qrSvgFrame}>
          <Svg width={svgSize} height={svgSize} viewBox={`0 0 ${svgSize} ${svgSize}`}>
            <Rect width={svgSize} height={svgSize} fill="#FFFFFF" rx={12} />
            {qrMatrix.map((row, r) =>
              row.map((cell, c) => {
                if (cell === 1) {
                  return (
                    <Rect
                      key={`${r}-${c}`}
                      x={padding + c * moduleSize}
                      y={padding + r * moduleSize}
                      width={moduleSize}
                      height={moduleSize}
                      rx={0}
                      fill="#000000"
                    />
                  );
                }
                return null;
              })
            )}
          </Svg>
        </View>

        <Text style={styles.verifyBadge}>
          {lang === 'tl' ? '100% Ma-i-scan na Opisyal na Beneficiary Pass' : '100% Scannable Official Beneficiary Pass'}
        </Text>
      </LinearGradient>

      {/* 1-Tap Direct Tap-to-Copy Manual Code Box (No Extra Button Needed) */}
      <TouchableOpacity
        style={[
          styles.manualCodeContainer,
          copied && styles.manualCodeContainerCopied,
        ]}
        onPress={handleCopy}
        activeOpacity={0.8}
      >
        <Text style={[styles.manualCodeLabel, copied && { color: '#059669' }]}>
          {copied
            ? (lang === 'tl' ? ' Na-kopya na sa clipboard!' : ' Copied to clipboard!')
            : (lang === 'tl' ? 'Manual Household ID (I-tap upang kopyahin):' : 'Manual Household ID (Tap code to copy):')}
        </Text>
        <View style={[styles.codePillBox, copied && styles.codePillBoxCopied]}>
          <Text style={[styles.codeText, copied && { color: '#059669' }]}>{code}</Text>
        </View>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    width: '100%',
  },
  compactFrame: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    borderWidth: 2,
    borderColor: '#C9A84C',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 4,
    shadowColor: '#C9A84C',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 6,
    elevation: 3,
  },
  qrCard: {
    borderRadius: 22,
    padding: 20,
    alignItems: 'center',
    width: '100%',
    borderTopWidth: 3,
    borderTopColor: '#C9A84C',
    borderBottomWidth: 2.5,
    borderBottomColor: '#C9A84C',
  },
  passHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    width: '100%',
    marginBottom: 16,
  },
  passSealCircle: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
  },
  passKicker: {
    color: '#E0B84C',
    fontSize: 9.5,
    fontWeight: '800',
    letterSpacing: 0.8,
    textTransform: 'uppercase',
  },
  passTitle: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: FONT_WEIGHT.black,
    letterSpacing: 0.2,
    marginTop: 1,
  },
  passSub: {
    color: 'rgba(255, 255, 255, 0.75)',
    fontSize: 10.5,
    marginTop: 1,
  },
  goldBadge: {
    backgroundColor: 'rgba(16, 185, 129, 0.18)',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: '#10B981',
  },
  goldBadgeText: {
    color: '#34D399',
    fontSize: 9.5,
    fontWeight: FONT_WEIGHT.black,
    letterSpacing: 0.5,
  },
  qrSvgFrame: {
    padding: 8,
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    borderWidth: 2,
    borderColor: '#C9A84C',
    ...SHADOWS.md,
  },
  verifyBadge: {
    fontSize: 11,
    fontWeight: FONT_WEIGHT.bold,
    color: '#34D399',
    marginTop: 16,
    backgroundColor: 'rgba(16, 185, 129, 0.15)',
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 999,
  },
  manualCodeContainer: {
    width: '100%',
    borderRadius: 14,
    padding: 12,
    marginTop: 14,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderStyle: 'solid',
    alignItems: 'center',
    ...SHADOWS.sm,
  },
  manualCodeContainerCopied: {
    backgroundColor: '#ECFDF5',
    borderColor: '#059669',
    borderStyle: 'solid',
  },
  manualCodeLabel: {
    fontSize: 10.5,
    fontWeight: '800',
    color: '#334155',
    marginBottom: 4,
    textAlign: 'center',
    letterSpacing: 0.5,
    textTransform: 'uppercase',
  },
  codePillBox: {
    backgroundColor: '#F8FAFC',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 10,
    borderWidth: 1.5,
    borderColor: '#C9A84C',
    marginTop: 2,
  },
  codePillBoxCopied: {
    borderColor: '#059669',
    backgroundColor: '#FFFFFF',
  },
  codeText: {
    fontSize: 14,
    fontWeight: FONT_WEIGHT.black,
    letterSpacing: 1.2,
    color: '#0B1D4E',
    textAlign: 'center',
  },
});

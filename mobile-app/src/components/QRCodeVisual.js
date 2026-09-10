import React, { useState, useMemo, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Image, ActivityIndicator } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import Svg, { Rect } from 'react-native-svg';
import { LinearGradient } from 'expo-linear-gradient';
import QRCodeCore from 'qrcode/lib/core/qrcode';
import { API_BASE_URL } from '../config';
import { CheckIcon } from './AppIcons';
import { COLORS, RADIUS, FONT_WEIGHT, SPACING, SHADOWS } from '../theme';

/**
 * Generates an ISO/IEC 18004 compliant QR Matrix for offline fallback.
 */
function generateStandardQRMatrix(text, ecc = 'M') {
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
    console.warn('Standard QR generation error:', err);
    return [];
  }
}

export default function QRCodeVisual({
  value,
  size = 200,
  lang = 'tl',
  isVerified = true,
  darkMode = false,
  compact = false,
  isCompact = false,
}) {
  const isCompactMode = compact || isCompact;
  const [copied, setCopied] = useState(false);
  const [useBackendFallback, setUseBackendFallback] = useState(false);
  const [useOfflineSvg, setUseOfflineSvg] = useState(false);
  const [imgLoaded, setImgLoaded] = useState(false);
  const [authToken, setAuthToken] = useState(null);
  const code = String(value || 'MNL-QR-OFFICIAL-PASS').trim();

  // Load auth token for the protected qr-image endpoint
  useEffect(() => {
    AsyncStorage.getItem('mitigateplus_token').then(t => {
      if (t) setAuthToken(t);
    }).catch(() => {});
  }, []);

  // Reset fallback state when code prop changes
  useEffect(() => {
    setUseBackendFallback(false);
    setUseOfflineSvg(false);
    setImgLoaded(false);
  }, [code]);

  const primaryApiUrl = `https://api.qrserver.com/v1/create-qr-code/?size=400x400&data=${encodeURIComponent(code)}&margin=8&format=png`;
  const backendApiUrl = `${API_BASE_URL}/households/qr-image/${encodeURIComponent(code)}?size=400&margin=2${authToken ? `&token=${encodeURIComponent(authToken)}` : ''}`;

  const activeImageUri = useBackendFallback ? backendApiUrl : primaryApiUrl;

  const handleImageError = () => {
    if (!useBackendFallback) {
      console.log('[QRVisual] Primary QRServer API unavailable, falling back to MitigatePlus backend QR API...');
      setUseBackendFallback(true);
    } else {
      console.log('[QRVisual] Backend QR API unavailable, falling back to offline SVG matrix...');
      setUseOfflineSvg(true);
    }
  };

  const handleCopy = () => {
    try {
      if (typeof navigator !== 'undefined' && navigator.clipboard && navigator.clipboard.writeText) {
        navigator.clipboard.writeText(code).catch(() => {});
      }
    } catch (e) {}
    setCopied(true);
    setTimeout(() => setCopied(false), 2200);
  };

  const qrMatrix = useMemo(() => {
    if (!useOfflineSvg) return [];
    return generateStandardQRMatrix(code, 'M');
  }, [code, useOfflineSvg]);

  const targetSize = isCompactMode ? (size || 220) : 240;

  // =========================================================================
  // COMPACT MODE: Render Crisp Standard QR Code Image
  // =========================================================================
  if (isCompactMode) {
    return (
      <View style={[styles.compactContainer, { width: targetSize + 16 }]}>
        <View style={[styles.compactFrame, { width: targetSize + 12, height: targetSize + 12 }]}>
          {!useOfflineSvg ? (
            <View style={{ width: targetSize, height: targetSize, alignItems: 'center', justifyContent: 'center' }}>
              <Image
                source={{ uri: activeImageUri }}
                style={{ width: targetSize, height: targetSize, borderRadius: 8 }}
                resizeMode="contain"
                onLoad={() => setImgLoaded(true)}
                onError={handleImageError}
              />
              {!imgLoaded && (
                <View style={[StyleSheet.absoluteFill, styles.loadingOverlay]}>
                  <ActivityIndicator size="small" color="#0B1D4E" />
                </View>
              )}
            </View>
          ) : (
            // Offline SVG fallback
            <Svg width={targetSize} height={targetSize} viewBox={`0 0 ${targetSize} ${targetSize}`}>
              <Rect width={targetSize} height={targetSize} fill="#FFFFFF" rx={8} />
              {(() => {
                const matrixSize = qrMatrix.length || 21;
                const pad = 10;
                const modSize = (targetSize - pad * 2) / matrixSize;
                return qrMatrix.map((row, r) =>
                  row.map((cell, c) => {
                    if (cell === 1) {
                      return (
                        <Rect
                          key={`${r}-${c}`}
                          x={pad + c * modSize}
                          y={pad + r * modSize}
                          width={modSize}
                          height={modSize}
                          fill="#000000"
                        />
                      );
                    }
                    return null;
                  })
                );
              })()}
            </Svg>
          )}
        </View>
      </View>
    );
  }

  // =========================================================================
  // FULL EXPANDED MODE: Render Full Metallic / Civic Relief Card
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
          {!useOfflineSvg ? (
            <View style={{ width: targetSize, height: targetSize, alignItems: 'center', justifyContent: 'center' }}>
              <Image
                source={{ uri: activeImageUri }}
                style={{ width: targetSize, height: targetSize, borderRadius: 10 }}
                resizeMode="contain"
                onLoad={() => setImgLoaded(true)}
                onError={handleImageError}
              />
              {!imgLoaded && (
                <View style={[StyleSheet.absoluteFill, styles.loadingOverlay]}>
                  <ActivityIndicator size="small" color="#0B1D4E" />
                </View>
              )}
            </View>
          ) : (
            <Svg width={targetSize} height={targetSize} viewBox={`0 0 ${targetSize} ${targetSize}`}>
              <Rect width={targetSize} height={targetSize} fill="#FFFFFF" rx={12} />
              {(() => {
                const matrixSize = qrMatrix.length || 21;
                const pad = 14;
                const modSize = (targetSize - pad * 2) / matrixSize;
                return qrMatrix.map((row, r) =>
                  row.map((cell, c) => {
                    if (cell === 1) {
                      return (
                        <Rect
                          key={`${r}-${c}`}
                          x={pad + c * modSize}
                          y={pad + r * modSize}
                          width={modSize}
                          height={modSize}
                          fill="#000000"
                        />
                      );
                    }
                    return null;
                  })
                );
              })()}
            </Svg>
          )}
        </View>

        <View style={[styles.verifyBadge, { flexDirection: 'row', alignItems: 'center', gap: 5 }]}>
          <CheckIcon size={11} color="#34D399" />
          <Text style={styles.verifyBadgeText}>
            {lang === 'tl' ? 'Opisyal na High-Definition QR Pass' : 'Official High-Definition QR Pass'}
          </Text>
        </View>
      </LinearGradient>

      {/* 1-Tap Direct Tap-to-Copy Manual Code Box */}
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
  compactContainer: {
    alignItems: 'center',
  },
  compactFrame: {
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    borderWidth: 2,
    borderColor: '#C9A84C',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 6,
    shadowColor: '#C9A84C',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 6,
    elevation: 3,
  },
  loadingOverlay: {
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 8,
  },
  apiTagRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 8,
    backgroundColor: '#F3F6FC',
    paddingHorizontal: 10,
    paddingVertical: 3,
    borderRadius: 999,
  },
  apiStatusDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#10B981',
  },
  apiTagText: {
    fontSize: 9.5,
    fontWeight: '700',
    color: '#334155',
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
    marginTop: 16,
    backgroundColor: 'rgba(16, 185, 129, 0.15)',
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 999,
  },
  verifyBadgeText: {
    fontSize: 11,
    fontWeight: FONT_WEIGHT.bold,
    color: '#34D399',
  },
  manualCodeContainer: {
    width: '100%',
    borderRadius: 14,
    padding: 12,
    marginTop: 14,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#DDE4F0',
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
    backgroundColor: '#F3F6FC',
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

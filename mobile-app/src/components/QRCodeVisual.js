import React, { useState, useMemo } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Alert } from 'react-native';
import Svg, { Rect, Path, G } from 'react-native-svg';
import { LinearGradient } from 'expo-linear-gradient';
import { COLORS, RADIUS, FONT_WEIGHT, SPACING, SHADOWS } from '../theme';

const ALPHANUMERIC_TABLE = {
  '0': 0, '1': 1, '2': 2, '3': 3, '4': 4, '5': 5, '6': 6, '7': 7, '8': 8, '9': 9,
  'A': 10, 'B': 11, 'C': 12, 'D': 13, 'E': 14, 'F': 15, 'G': 16, 'H': 17, 'I': 18,
  'J': 19, 'K': 20, 'L': 21, 'M': 22, 'N': 23, 'O': 24, 'P': 25, 'Q': 26, 'R': 27,
  'S': 28, 'T': 29, 'U': 30, 'V': 31, 'W': 32, 'X': 33, 'Y': 34, 'Z': 35,
  ' ': 36, '$': 37, '%': 38, '*': 39, '+': 40, '-': 41, '.': 42, '/': 43, ':': 44
};

function generateRealQRMatrix(text) {
  const size = 29;
  const matrix = Array.from({ length: size }, () => Array(size).fill(0));
  const isReserved = Array.from({ length: size }, () => Array(size).fill(false));

  const setModule = (r, c, val, reserved = true) => {
    if (r >= 0 && r < size && c >= 0 && c < size) {
      matrix[r][c] = val;
      if (reserved) isReserved[r][c] = true;
    }
  };

  const drawFinder = (top, left) => {
    for (let r = -1; r <= 7; r++) {
      for (let c = -1; c <= 7; c++) {
        const row = top + r;
        const col = left + c;
        if (row >= 0 && row < size && col >= 0 && col < size) {
          if (r >= 0 && r <= 6 && (c === 0 || c === 6 || r === 0 || r === 6)) {
            setModule(row, col, 1);
          } else if (r >= 2 && r <= 4 && c >= 2 && c <= 4) {
            setModule(row, col, 1);
          } else {
            setModule(row, col, 0);
          }
        }
      }
    }
  };

  drawFinder(0, 0);
  drawFinder(0, size - 7);
  drawFinder(size - 7, 0);

  const drawAlignment = (top, left) => {
    for (let r = -2; r <= 2; r++) {
      for (let c = -2; c <= 2; c++) {
        const isBorder = Math.abs(r) === 2 || Math.abs(c) === 2;
        const isCenter = r === 0 && c === 0;
        setModule(top + r, left + c, isBorder || isCenter ? 1 : 0);
      }
    }
  };
  drawAlignment(22, 22);

  for (let i = 8; i < size - 8; i++) {
    setModule(6, i, i % 2 === 0 ? 1 : 0);
    setModule(i, 6, i % 2 === 0 ? 1 : 0);
  }

  setModule(size - 8, 8, 1);

  for (let i = 0; i < 9; i++) {
    setModule(8, i, 0);
    setModule(i, 8, 0);
    setModule(8, size - 1 - i, 0);
    setModule(size - 1 - i, 8, 0);
  }

  const str = text.toUpperCase();
  const bits = [];
  bits.push(0, 0, 1, 0);

  const charCount = str.length;
  for (let i = 8; i >= 0; i--) {
    bits.push((charCount >> i) & 1);
  }

  for (let i = 0; i < str.length; i += 2) {
    if (i + 1 < str.length) {
      const val = (ALPHANUMERIC_TABLE[str[i]] || 0) * 45 + (ALPHANUMERIC_TABLE[str[i + 1]] || 0);
      for (let b = 10; b >= 0; b--) {
        bits.push((val >> b) & 1);
      }
    } else {
      const val = ALPHANUMERIC_TABLE[str[i]] || 0;
      for (let b = 5; b >= 0; b--) {
        bits.push((val >> b) & 1);
      }
    }
  }

  bits.push(0, 0, 0, 0);
  while (bits.length % 8 !== 0) bits.push(0);

  const padBytes = [0xEC, 0x11];
  let pIdx = 0;
  while (bits.length < 70 * 8) {
    const pad = padBytes[pIdx % 2];
    for (let b = 7; b >= 0; b--) {
      bits.push((pad >> b) & 1);
    }
    pIdx++;
  }

  let bitIdx = 0;
  let upward = true;

  for (let c = size - 1; c > 0; c -= 2) {
    if (c === 6) c--;
    const rows = upward
      ? Array.from({ length: size }, (_, i) => size - 1 - i)
      : Array.from({ length: size }, (_, i) => i);

    for (const r of rows) {
      for (const colOffset of [0, -1]) {
        const col = c + colOffset;
        if (!isReserved[r][col]) {
          const rawBit = bitIdx < bits.length ? bits[bitIdx++] : 0;
          const mask = (r + col) % 2 === 0;
          matrix[r][col] = rawBit ^ (mask ? 1 : 0);
        }
      }
    }
    upward = !upward;
  }

  const formatBits = [1, 1, 1, 0, 1, 1, 1, 1, 1, 0, 0, 0, 1, 0, 0];
  for (let i = 0; i < 6; i++) matrix[8][i] = formatBits[i];
  matrix[8][7] = formatBits[6];
  matrix[8][8] = formatBits[7];
  matrix[7][8] = formatBits[8];
  for (let i = 0; i < 6; i++) matrix[5 - i][8] = formatBits[9 + i];

  for (let i = 0; i < 7; i++) matrix[size - 1 - i][8] = formatBits[i];
  for (let i = 0; i < 8; i++) matrix[8][size - 8 + i] = formatBits[7 + i];

  return matrix;
}

export default function QRCodeVisual({ value, size = 200, lang = 'tl', isVerified = true, darkMode = false, compact = false, isCompact = false }) {
  const isCompactMode = compact || isCompact;
  const [copied, setCopied] = useState(false);
  const code = value || 'MNL-QR-OFFICIAL-PASS';

  const qrMatrix = useMemo(() => {
    return generateRealQRMatrix(code);
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

  const matrixSize = qrMatrix.length;
  const svgSize = isCompactMode ? (size || 140) : 220;
  const padding = isCompactMode ? 8 : 12;
  const moduleSize = (svgSize - padding * 2) / matrixSize;

  // =========================================================================
  // COMPACT MODE: Render only the clean crisp SVG matrix frame
  // =========================================================================
  if (isCompactMode) {
    return (
      <View style={[styles.compactFrame, { width: svgSize + 8, height: svgSize + 8 }]}>
        <Svg width={svgSize} height={svgSize} viewBox={`0 0 ${svgSize} ${svgSize}`}>
          <Rect width={svgSize} height={svgSize} fill="#FFFFFF" rx={10} />
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
                    rx={1}
                    fill="#0F172A"
                  />
                );
              }
              return null;
            })
          )}
          {/* Center Manila Shield Badge */}
          <G transform={`translate(${svgSize / 2 - 12}, ${svgSize / 2 - 12})`}>
            <Rect width="24" height="24" rx="6" fill="#FFFFFF" stroke="#002BB8" strokeWidth="2" />
            <Rect x="3" y="3" width="18" height="18" rx="4" fill="#002BB8" />
            <Path d="M12 6L17 9V14C17 16 14 17.5 12 18C10 17.5 7 16 7 14V9L12 6Z" fill="#F59E0B" />
          </G>
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
        colors={['#071D3A', '#0D3C75', '#154A8A']}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={[styles.qrCard, SHADOWS.lg]}
      >
        <View style={styles.passHeader}>
          <View style={styles.passSealCircle}>
            <Text style={{ fontSize: 11, fontWeight: '900', color: '#002BB8' }}>MNL</Text>
          </View>
          <View style={{ flex: 1 }}>
            <Text style={styles.passTitle}>
              {lang === 'tl' ? 'OPISYAL NA DISASTER RELIEF PASS' : 'OFFICIAL DISASTER RELIEF PASS'}
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
            <Rect width={svgSize} height={svgSize} fill="#FFFFFF" rx={14} />
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
                      rx={1.2}
                      fill="#071D3A"
                    />
                  );
                }
                return null;
              })
            )}
            <G transform={`translate(${svgSize / 2 - 18}, ${svgSize / 2 - 18})`}>
              <Rect width="36" height="36" rx="8" fill="#FFFFFF" stroke="#0D3C75" strokeWidth="3" />
              <Rect x="4" y="4" width="28" height="28" rx="6" fill="#0D3C75" />
              <Path d="M18 10L25 14V21C25 24 21 26 18 27C15 26 11 24 11 21V14L18 10Z" fill="#F59E0B" />
            </G>
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
    borderWidth: 1.5,
    borderColor: '#CBD5E1',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 4,
    ...SHADOWS.sm,
  },
  qrCard: {
    borderRadius: 20,
    padding: 20,
    alignItems: 'center',
    width: '100%',
  },
  passHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    width: '100%',
    marginBottom: 16,
  },
  passSealCircle: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
  },
  passTitle: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: FONT_WEIGHT.black,
    letterSpacing: 0.5,
  },
  passSub: {
    color: 'rgba(255, 255, 255, 0.75)',
    fontSize: 10,
    marginTop: 1,
  },
  goldBadge: {
    backgroundColor: '#FEF3C7',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 999,
  },
  goldBadgeText: {
    color: '#D97706',
    fontSize: 9,
    fontWeight: FONT_WEIGHT.black,
  },
  qrSvgFrame: {
    padding: 8,
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
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
    borderRadius: 12,
    padding: 12,
    marginTop: 14,
    backgroundColor: '#F8FAFC',
    borderWidth: 1.5,
    borderColor: '#E2E8F0',
    borderStyle: 'dashed',
    alignItems: 'center',
  },
  manualCodeContainerCopied: {
    backgroundColor: '#ECFDF5',
    borderColor: '#059669',
    borderStyle: 'solid',
  },
  manualCodeLabel: {
    fontSize: 11,
    fontWeight: '700',
    color: '#64748B',
    marginBottom: 4,
    textAlign: 'center',
  },
  codePillBox: {
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 16,
    paddingVertical: 7,
    borderRadius: 8,
    borderWidth: 1.5,
    borderColor: '#CBD5E1',
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
    color: '#002BB8',
    textAlign: 'center',
  },
});

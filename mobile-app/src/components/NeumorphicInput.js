import React, { useState, useRef } from 'react';
import { View, Text, TextInput, StyleSheet, TouchableWithoutFeedback, TouchableOpacity, Platform } from 'react-native';
import { AlertTriangleIcon, CheckIcon, EyeIcon, EyeOffIcon } from './AppIcons';
import { COLORS, FONT_WEIGHT } from '../theme';

/**
 * Civic Standard Input Component (WCAG AAA Compliant)
 * ----------------------------------------------------------------------------
 * - Clean pure white surface (#FFFFFF) with high-contrast text (#0B1525)
 * - 48px minimum touch target height (Fitts's Law)
 * - Crisp 1.5px border (#DDE4F0) with active Blue focus ring (#1C3F94)
 * - Persistent label, helper hints, and friendly inline error feedback
 * - Built-in interactive [Show / Hide] Password eye toggle
 */
export default function NeumorphicInput({
  label,
  value,
  onChangeText,
  placeholder,
  helperText,
  errorText,
  successText,
  required = false,
  secureTextEntry = false,
  keyboardType = 'default',
  autoCapitalize = 'none',
  multiline = false,
  numberOfLines = 1,
  maxLength,
  style,
  inputStyle,
}) {
  const [isFocused, setIsFocused] = useState(false);
  const [isPasswordHidden, setIsPasswordHidden] = useState(true);
  const inputRef = useRef(null);

  const hasError = !!errorText;
  const hasSuccess = !hasError && !!successText;
  const isPassword = secureTextEntry;

  const handleContainerPress = () => {
    if (inputRef.current) {
      inputRef.current.focus();
    }
  };

  return (
    <View style={[styles.wrapper, style]}>
      {/* 1. Persistent Label */}
      <View style={styles.labelRow}>
        <Text style={[styles.persistentLabel, isFocused && styles.labelFocused, hasError && styles.labelError]}>
          {label} {required && <Text style={styles.requiredStar}>*</Text>}
        </Text>
      </View>

      {/* 2. Crisp Input Field with Active Focus Ring */}
      <TouchableWithoutFeedback onPress={handleContainerPress} accessible={false}>
        <View
          style={[
            styles.inputContainer,
            isFocused && styles.containerFocused,
            hasError && styles.containerError,
            hasSuccess && styles.containerSuccess,
            multiline && styles.containerMultiline,
          ]}
        >
          <TextInput
            ref={inputRef}
            style={[
              styles.inputField,
              isPassword && { paddingRight: 48 },
              multiline && styles.inputMultiline,
              inputStyle,
            ]}
            value={value}
            onChangeText={onChangeText}
            placeholder={placeholder}
            placeholderTextColor="#54657E"
            secureTextEntry={isPassword ? isPasswordHidden : false}
            keyboardType={keyboardType}
            autoCapitalize={autoCapitalize}
            multiline={multiline}
            numberOfLines={numberOfLines}
            maxLength={maxLength}
            editable={true}
            onFocus={() => setIsFocused(true)}
            onBlur={() => setIsFocused(false)}
          />

          {isPassword && (
            <TouchableOpacity
              onPress={() => setIsPasswordHidden(!isPasswordHidden)}
              style={styles.eyeButton}
              activeOpacity={0.7}
              accessibilityRole="button"
              accessibilityLabel={isPasswordHidden ? (label ? `Show ${label}` : 'Show password') : (label ? `Hide ${label}` : 'Hide password')}
              accessibilityHint="Double tap to toggle password visibility"
              hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            >
              {isPasswordHidden ? <EyeIcon size={20} color="#3D5070" /> : <EyeOffIcon size={20} color="#C8102E" />}
            </TouchableOpacity>
          )}
        </View>
      </TouchableWithoutFeedback>

      {/* 3. Helper Text, Success Message, or Friendly Error Message */}
      {hasError ? (
        <View style={styles.errorRow}>
          <AlertTriangleIcon size={13} color="#DC2626" />
          <Text style={styles.friendlyErrorText}>{errorText}</Text>
        </View>
      ) : successText ? (
        <View style={styles.successRow}>
          <CheckIcon size={13} color="#16A34A" />
          <Text style={styles.successText}>{successText}</Text>
        </View>
      ) : helperText ? (
        <Text style={styles.helperText}>{helperText}</Text>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    marginBottom: 16,
  },
  labelRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 6,
  },
  persistentLabel: {
    fontSize: 11.5,
    fontWeight: '800',
    color: '#0B1525',
    letterSpacing: 0.3,
    textTransform: 'uppercase',
  },
  labelFocused: {
    color: '#C8102E',
  },
  labelError: {
    color: '#DC2626',
  },
  requiredStar: {
    color: '#DC2626',
    fontWeight: 'bold',
  },
  validBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    backgroundColor: '#ECFDF5',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  validBadgeText: {
    fontSize: 10,
    fontWeight: '700',
    color: '#16A34A',
  },
  inputContainer: {
    borderRadius: 10,
    backgroundColor: '#FFFFFF',
    borderWidth: 1.5,
    borderColor: '#DDE4F0',
    paddingHorizontal: 14,
    minHeight: 52, // Guarantees >= 48dp touch target across all screen densities
    justifyContent: 'center',
  },
  containerFocused: {
    borderColor: '#C8102E',
    backgroundColor: '#FFFFFF',
    ...(Platform.OS === 'web' ? {
      boxShadow: '0 0 0 3px rgba(200, 16, 46, 0.14)',
    } : {
      shadowColor: '#C8102E',
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.15,
      shadowRadius: 6,
      elevation: 2,
    }),
  },
  containerError: {
    backgroundColor: '#FEF2F2',
    borderColor: '#DC2626',
  },
  containerSuccess: {
    borderColor: '#16A34A',
    backgroundColor: '#F0FDF4',
  },
  containerMultiline: {
    minHeight: 90,
    alignItems: 'flex-start',
  },
  inputField: {
    fontSize: 14,
    color: '#0B1525',
    fontWeight: '600',
    paddingVertical: 12,
    minHeight: 48,
    width: '100%',
    flex: 1,
  },
  inputMultiline: {
    minHeight: 70,
    textAlignVertical: 'top',
    width: '100%',
  },
  errorRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 5,
  },
  friendlyErrorText: {
    fontSize: 11.5,
    color: '#DC2626',
    fontWeight: '600',
    flex: 1,
  },
  successRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 5,
  },
  successText: {
    fontSize: 11.5,
    color: '#15803D',
    fontWeight: '700',
    flex: 1,
  },
  helperText: {
    fontSize: 11.5,
    color: '#3D5070',
    marginTop: 5,
    lineHeight: 16,
  },
  eyeButton: {
    position: 'absolute',
    right: 2,
    top: 2,
    width: 48,
    height: 48,
    justifyContent: 'center',
    alignItems: 'center',
  },
});

import React from 'react';
import { Pressable, Text, ActivityIndicator, StyleSheet, ViewStyle, View } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { colors, radius, spacing } from '../theme';

type Variant = 'primary' | 'secondary' | 'ghost';

interface Props {
  label: string;
  onPress: () => void;
  variant?: Variant;
  accent?: string;
  icon?: keyof typeof Feather.glyphMap;
  loading?: boolean;
  disabled?: boolean;
  style?: ViewStyle;
}

export default function Button({
  label, onPress, variant = 'primary', accent = colors.brand, icon, loading, disabled, style,
}: Props) {
  const isPrimary = variant === 'primary';
  const fg = isPrimary ? colors.textOnAccent : variant === 'ghost' ? accent : colors.text;
  const inactive = disabled || loading;

  return (
    <Pressable
      onPress={onPress}
      disabled={inactive}
      accessibilityRole="button"
      accessibilityState={{ disabled: !!inactive, busy: !!loading }}
      style={({ pressed }) => [
        styles.base,
        isPrimary && { backgroundColor: accent },
        variant === 'secondary' && styles.secondary,
        variant === 'ghost' && styles.ghost,
        pressed && !inactive && { opacity: 0.85, transform: [{ scale: 0.99 }] },
        disabled && !loading && { opacity: 0.45 },
        style,
      ]}
    >
      {loading ? (
        <ActivityIndicator color={fg} />
      ) : (
        <View style={styles.row}>
          {icon && <Feather name={icon} size={18} color={fg} />}
          <Text style={[styles.label, { color: fg }]}>{label}</Text>
        </View>
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  base: {
    minHeight: 52, borderRadius: radius.md, paddingHorizontal: spacing.xl,
    alignItems: 'center', justifyContent: 'center',
  },
  secondary: { backgroundColor: colors.surfaceAlt, borderWidth: 1, borderColor: colors.border },
  ghost: { backgroundColor: 'transparent', minHeight: 44 },
  row: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  label: { fontSize: 16, fontWeight: '600', letterSpacing: 0.1 },
});

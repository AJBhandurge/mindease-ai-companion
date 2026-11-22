import React, { useState } from 'react';
import { View, Text, TextInput, Pressable, StyleSheet, TextInputProps } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { colors, radius, spacing, type, webNoOutline } from '../theme';

interface Props extends TextInputProps {
  label: string;
  icon?: keyof typeof Feather.glyphMap;
  secure?: boolean;
  error?: boolean;
}

export default function TextField({ label, icon, secure, error, style, ...inputProps }: Props) {
  const [focused, setFocused] = useState(false);
  const [hidden, setHidden] = useState(true);

  const borderColor = error ? colors.danger : focused ? colors.brand : colors.border;

  return (
    <View style={styles.wrap}>
      <Text style={styles.label}>{label}</Text>
      <View style={[styles.field, { borderColor }]}>
        {icon && <Feather name={icon} size={18} color={focused ? colors.brand : colors.textSubtle} />}
        <TextInput
          {...inputProps}
          secureTextEntry={secure && hidden}
          placeholderTextColor={colors.textSubtle}
          onFocus={(e) => { setFocused(true); inputProps.onFocus?.(e); }}
          onBlur={(e) => { setFocused(false); inputProps.onBlur?.(e); }}
          style={[styles.input, webNoOutline, style]}
          accessibilityLabel={label}
        />
        {secure && (
          <Pressable
            onPress={() => setHidden(h => !h)}
            hitSlop={10}
            accessibilityRole="button"
            accessibilityLabel={hidden ? 'Show password' : 'Hide password'}
          >
            <Feather name={hidden ? 'eye' : 'eye-off'} size={18} color={colors.textSubtle} />
          </Pressable>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { gap: spacing.xs + 2 },
  label: { ...type.callout, fontWeight: '600', color: colors.textMuted },
  field: {
    flexDirection: 'row', alignItems: 'center', gap: spacing.md,
    backgroundColor: colors.surface, borderRadius: radius.md, borderWidth: 1,
    paddingHorizontal: spacing.lg, minHeight: 52,
  },
  input: { flex: 1, color: colors.text, fontSize: 16, paddingVertical: spacing.md },
});

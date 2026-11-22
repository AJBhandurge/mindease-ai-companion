import React from 'react';
import { View, Text, Pressable, StyleSheet, Linking } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { colors, radius, spacing, type } from '../theme';
import { HELPLINES } from '../theme/companions';

interface Props {
  title?: string;
  message?: string;
  compact?: boolean;
}

// Helpline list with one-tap calling. Shown inline on crisis replies, in the Help sheet, and on the dashboard.
export default function CrisisCard({
  title = 'You deserve support right now',
  message = 'Talking to a trained counsellor can help. These lines are free and confidential.',
  compact,
}: Props) {
  return (
    <View style={[styles.card, compact && styles.compact]}>
      <View style={styles.header}>
        <View style={styles.iconWrap}>
          <Feather name="life-buoy" size={18} color={colors.danger} />
        </View>
        <View style={{ flex: 1 }}>
          <Text style={type.headline}>{title}</Text>
          <Text style={[type.callout, { marginTop: 2 }]}>{message}</Text>
        </View>
      </View>

      {HELPLINES.map(h => (
        <Pressable
          key={h.number}
          onPress={() => Linking.openURL(`tel:${h.number.replace(/[^0-9]/g, '')}`)}
          style={({ pressed }) => [styles.line, pressed && { backgroundColor: colors.surfacePressed }]}
          accessibilityRole="button"
          accessibilityLabel={`Call ${h.name}, ${h.number}`}
        >
          <View style={{ flex: 1 }}>
            <Text style={styles.lineName}>{h.name}</Text>
            <Text style={type.caption}>{h.detail}</Text>
          </View>
          <Text style={styles.number}>{h.number}</Text>
          <View style={styles.callBtn}>
            <Feather name="phone" size={16} color={colors.textOnAccent} />
          </View>
        </Pressable>
      ))}

      <Text style={[type.caption, styles.footnote]}>
        If you are in immediate danger, call 112.
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.surface, borderRadius: radius.lg, borderWidth: 1,
    borderColor: 'rgba(248,113,113,0.35)', padding: spacing.lg, gap: spacing.sm,
  },
  compact: { padding: spacing.md },
  header: { flexDirection: 'row', gap: spacing.md, marginBottom: spacing.xs },
  iconWrap: {
    width: 36, height: 36, borderRadius: 18, backgroundColor: colors.dangerSoft,
    alignItems: 'center', justifyContent: 'center',
  },
  line: {
    flexDirection: 'row', alignItems: 'center', gap: spacing.md,
    backgroundColor: colors.surfaceAlt, borderRadius: radius.md,
    paddingVertical: spacing.md, paddingHorizontal: spacing.md,
  },
  lineName: { fontSize: 15, fontWeight: '600', color: colors.text },
  number: { fontSize: 14, fontWeight: '600', color: colors.textMuted, fontVariant: ['tabular-nums'] },
  callBtn: {
    width: 34, height: 34, borderRadius: 17, backgroundColor: colors.success,
    alignItems: 'center', justifyContent: 'center',
  },
  footnote: { textAlign: 'center', marginTop: spacing.xs },
});

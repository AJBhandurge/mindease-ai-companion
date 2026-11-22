import React, { useState } from 'react';
import { View, Text, Pressable, StyleSheet, ScrollView, useWindowDimensions } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Feather } from '@expo/vector-icons';
import { authAPI } from '../services/api';
import { useStore } from '../store';
import { colors, radius, spacing, type, MAX_CONTENT_WIDTH } from '../theme';
import { COMPANIONS, getCompanion } from '../theme/companions';
import Button from '../components/Button';

interface Props { navigation: any; }

export default function CompanionSelectScreen({ navigation }: Props) {
  const { userId, companionId: current, setCompanion } = useStore();
  const [selected, setSelected] = useState(current);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { width } = useWindowDimensions();

  const twoColumn = width >= 720;
  const chosen = getCompanion(selected);
  const unchanged = selected === current;

  const handleConfirm = async () => {
    if (unchanged) return navigation.goBack();
    if (!userId) return;
    setLoading(true);
    setError(null);
    try {
      await authAPI.selectCompanion(userId, selected);
      await setCompanion(selected);
      navigation.goBack();
    } catch {
      setError("Couldn't switch companion. Check your connection and try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.safe} edges={['top', 'bottom']}>
      <View style={styles.topBar}>
        <Pressable
          onPress={() => navigation.goBack()}
          style={({ pressed }) => [styles.back, pressed && { backgroundColor: colors.surfacePressed }]}
          accessibilityRole="button"
          accessibilityLabel="Go back"
        >
          <Feather name="arrow-left" size={22} color={colors.text} />
        </Pressable>
      </View>

      <ScrollView contentContainerStyle={styles.scroll}>
        <View style={styles.intro}>
          <Text style={type.display}>Choose your companion</Text>
          <Text style={type.bodyMuted}>Each one has their own way of supporting you. You can switch anytime.</Text>
        </View>

        <View style={[styles.grid, twoColumn && styles.gridTwo]} accessibilityRole="radiogroup">
          {COMPANIONS.map((c) => {
            const isSelected = selected === c.id;
            return (
              <Pressable
                key={c.id}
                onPress={() => setSelected(c.id)}
                accessibilityRole="radio"
                accessibilityState={{ checked: isSelected }}
                accessibilityLabel={`${c.name}, ${c.tagline}`}
                style={({ pressed }) => [
                  styles.card,
                  twoColumn && styles.cardTwo,
                  isSelected && { borderColor: c.accent, backgroundColor: colors.surfaceAlt },
                  pressed && !isSelected && { backgroundColor: colors.surfacePressed },
                ]}
              >
                <View style={styles.cardTop}>
                  <View style={[styles.avatar, { backgroundColor: c.accentSoft }]}>
                    <Text style={styles.emoji}>{c.emoji}</Text>
                  </View>
                  <View style={{ flex: 1 }}>
                    <View style={styles.nameRow}>
                      <Text style={type.headline}>{c.name}</Text>
                      {c.id === current && (
                        <View style={styles.badge}>
                          <Text style={styles.badgeText}>Current</Text>
                        </View>
                      )}
                    </View>
                    <Text style={[type.callout, { color: c.accent, fontWeight: '600' }]}>{c.tagline}</Text>
                  </View>
                  <Feather
                    name={isSelected ? 'check-circle' : 'circle'}
                    size={22}
                    color={isSelected ? c.accent : colors.borderStrong}
                  />
                </View>

                <Text style={type.callout}>{c.description}</Text>

                <View style={styles.bestFor}>
                  <Feather name="target" size={14} color={colors.textSubtle} />
                  <Text style={[type.caption, { flex: 1, color: colors.textMuted }]}>
                    <Text style={{ fontWeight: '700' }}>Best for: </Text>{c.bestFor}
                  </Text>
                </View>

                <View style={styles.traits}>
                  {c.traits.map((t) => (
                    <View key={t} style={[styles.trait, { backgroundColor: c.accentSoft }]}>
                      <Text style={[styles.traitText, { color: c.accent }]}>{t}</Text>
                    </View>
                  ))}
                </View>
              </Pressable>
            );
          })}
        </View>
      </ScrollView>

      <View style={styles.footerBar}>
        <View style={styles.footer}>
          {error && (
            <View style={styles.error} accessibilityRole="alert">
              <Feather name="alert-circle" size={16} color={colors.danger} />
              <Text style={styles.errorText}>{error}</Text>
            </View>
          )}
          <Button
            label={unchanged ? `Keep chatting with ${chosen.name}` : `Switch to ${chosen.name}`}
            icon="message-circle"
            accent={chosen.accent}
            onPress={handleConfirm}
            loading={loading}
          />
        </View>
      </View>
    </SafeAreaView>
  );
}

const column = { width: '100%' as const, maxWidth: MAX_CONTENT_WIDTH, alignSelf: 'center' as const };

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.bg },
  topBar: { ...column, paddingHorizontal: spacing.sm, paddingTop: spacing.sm },
  back: { width: 44, height: 44, borderRadius: 22, alignItems: 'center', justifyContent: 'center' },
  scroll: { ...column, paddingHorizontal: spacing.lg, paddingBottom: spacing.xxl, gap: spacing.xl },
  intro: { gap: spacing.sm, paddingHorizontal: spacing.xs },
  grid: { gap: spacing.md },
  gridTwo: { flexDirection: 'row', flexWrap: 'wrap' },
  card: {
    backgroundColor: colors.surface, borderRadius: radius.lg, borderWidth: 1.5,
    borderColor: colors.border, padding: spacing.lg, gap: spacing.md,
  },
  cardTwo: { flexBasis: '47%', flexGrow: 1 },
  cardTop: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  avatar: { width: 52, height: 52, borderRadius: 26, alignItems: 'center', justifyContent: 'center' },
  emoji: { fontSize: 26 },
  nameRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  badge: { backgroundColor: colors.brandSoft, borderRadius: radius.pill, paddingHorizontal: spacing.sm, paddingVertical: 2 },
  badgeText: { fontSize: 11, fontWeight: '700', color: colors.brand },
  bestFor: { flexDirection: 'row', alignItems: 'flex-start', gap: spacing.sm },
  traits: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.xs + 2 },
  trait: { paddingHorizontal: spacing.md, paddingVertical: 5, borderRadius: radius.pill },
  traitText: { fontSize: 12, fontWeight: '600' },
  footerBar: { borderTopWidth: 1, borderTopColor: colors.border, backgroundColor: colors.bgElevated },
  footer: { ...column, padding: spacing.lg, gap: spacing.md },
  error: {
    flexDirection: 'row', gap: spacing.sm, alignItems: 'center',
    backgroundColor: colors.dangerSoft, borderRadius: radius.sm, padding: spacing.md,
  },
  errorText: { flex: 1, fontSize: 14, color: '#FECACA' },
});

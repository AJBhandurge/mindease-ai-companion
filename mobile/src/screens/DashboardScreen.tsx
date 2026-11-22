import React, { useCallback, useMemo, useState } from 'react';
import { View, Text, ScrollView, StyleSheet, Pressable, RefreshControl, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFocusEffect } from '@react-navigation/native';
import { Feather } from '@expo/vector-icons';
import Svg, { Circle } from 'react-native-svg';
import { analyticsAPI } from '../services/api';
import { useStore } from '../store';
import { colors, emotionColors, radius, spacing, type, MAX_CONTENT_WIDTH } from '../theme';
import CrisisCard from '../components/CrisisCard';
import Button from '../components/Button';

interface MoodPoint { date: string; emotion: string; avg_score: number; count: number; }
interface Dashboard {
  mood_history: MoodPoint[];
  dominant_emotion: { emotion: string; count: number };
  wellness_score: number;
  total_messages: number;
}

const greeting = () => {
  const h = new Date().getHours();
  return h < 12 ? 'Good morning' : h < 17 ? 'Good afternoon' : 'Good evening';
};

const localKey = (d: Date) =>
  `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;

const scoreBand = (score: number) => {
  if (score >= 70) return { label: 'Thriving', color: colors.success, note: 'Mostly positive or calm moments this week.' };
  if (score >= 40) return { label: 'Steady', color: colors.warning, note: 'A mix of ups and downs — that’s normal.' };
  return { label: 'Needs care', color: colors.danger, note: 'It’s been a heavier week. Be gentle with yourself.' };
};

export default function DashboardScreen() {
  const { userId, username, logout } = useStore();
  const [data, setData] = useState<Dashboard | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState(false);

  const load = useCallback(async (isRefresh = false) => {
    if (!userId) return;
    isRefresh ? setRefreshing(true) : setLoading(true);
    try {
      const res = await analyticsAPI.getDashboard(userId);
      setData(res.data);
      setError(false);
    } catch {
      setError(true);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [userId]);

  // Reload whenever the tab gains focus so new chat messages show up immediately.
  // Existing data stays on screen during the reload, so there's no loading flash.
  useFocusEffect(useCallback(() => { load(); }, [load]));

  const week = useMemo(() => {
    const perDay: Record<string, number> = {};
    data?.mood_history.forEach(m => { perDay[m.date] = (perDay[m.date] || 0) + m.count; });
    return Array.from({ length: 7 }, (_, i) => {
      const d = new Date();
      d.setDate(d.getDate() - (6 - i));
      return {
        key: localKey(d),
        label: d.toLocaleDateString([], { weekday: 'short' }).slice(0, 2),
        count: perDay[localKey(d)] || 0,
        isToday: i === 6,
      };
    });
  }, [data]);

  const mix = useMemo(() => {
    const totals: Record<string, number> = {};
    data?.mood_history.forEach(m => { totals[m.emotion] = (totals[m.emotion] || 0) + m.count; });
    const sum = Object.values(totals).reduce((a, b) => a + b, 0);
    return Object.entries(totals)
      .map(([emotion, count]) => ({ emotion, count, pct: sum ? Math.round((count / sum) * 100) : 0 }))
      .sort((a, b) => b.count - a.count);
  }, [data]);

  const checkIns = week.reduce((a, d) => a + d.count, 0);
  const maxDay = Math.max(1, ...week.map(d => d.count));
  const hasData = checkIns > 0;
  const band = scoreBand(data?.wellness_score ?? 0);

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <ScrollView
        contentContainerStyle={styles.scroll}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => load(true)} tintColor={colors.textMuted} />}
      >
        <View style={styles.header}>
          <View style={{ flex: 1 }}>
            <Text style={type.callout}>{greeting()},</Text>
            <Text style={type.display} numberOfLines={1}>{username || 'there'}</Text>
          </View>
          <Pressable
            onPress={logout}
            style={({ pressed }) => [styles.iconBtn, pressed && { backgroundColor: colors.surfacePressed }]}
            accessibilityRole="button"
            accessibilityLabel="Log out"
          >
            <Feather name="log-out" size={20} color={colors.textMuted} />
          </Pressable>
        </View>

        {loading && !data ? (
          <View style={styles.centerState}>
            <ActivityIndicator color={colors.brand} />
            <Text style={type.callout}>Loading your week…</Text>
          </View>
        ) : error && !data ? (
          <View style={[styles.card, styles.centerState]}>
            <Feather name="wifi-off" size={28} color={colors.textSubtle} />
            <Text style={type.headline}>Couldn't load your dashboard</Text>
            <Text style={[type.callout, { textAlign: 'center' }]}>Check that the MindEase server is running.</Text>
            <Button label="Try again" variant="secondary" icon="rotate-cw" onPress={() => load()} />
          </View>
        ) : (
          <>
            {/* Wellness score */}
            <View style={[styles.card, styles.hero]}>
              {hasData ? (
                <>
                  <ScoreRing score={data?.wellness_score ?? 0} color={band.color} />
                  <View style={{ flex: 1, gap: spacing.xs }}>
                    <Text style={type.overline}>Wellness this week</Text>
                    <Text style={[type.title, { color: band.color }]}>{band.label}</Text>
                    <Text style={type.callout}>{band.note}</Text>
                  </View>
                </>
              ) : (
                <View style={styles.empty}>
                  <View style={styles.emptyIcon}>
                    <Feather name="sunrise" size={24} color={colors.brand} />
                  </View>
                  <Text style={type.headline}>Your week starts here</Text>
                  <Text style={[type.callout, { textAlign: 'center' }]}>
                    Chat with your companion and your mood insights will appear on this page.
                  </Text>
                </View>
              )}
            </View>

            {/* Stats */}
            <View style={styles.stats}>
              <Stat icon="message-circle" value={String(data?.total_messages ?? 0)} label="Messages" />
              <Stat icon="calendar" value={String(checkIns)} label="Check-ins (7d)" />
              <Stat
                icon="heart"
                value={hasData ? data!.dominant_emotion.emotion : '—'}
                label="Top feeling"
                valueColor={hasData ? emotionColors[data!.dominant_emotion.emotion] : undefined}
              />
            </View>

            {/* Weekly activity */}
            <View style={styles.card}>
              <View style={styles.cardHead}>
                <Text style={type.headline}>This week</Text>
                <Text style={type.caption}>Check-ins per day</Text>
              </View>
              <View style={styles.bars} accessibilityLabel={`Check-ins this week: ${week.map(d => `${d.label} ${d.count}`).join(', ')}`}>
                {week.map(d => (
                  <View key={d.key} style={styles.barCol}>
                    <Text style={[type.caption, { opacity: d.count ? 1 : 0 }]}>{d.count}</Text>
                    <View style={styles.barTrack}>
                      <View
                        style={[
                          styles.barFill,
                          {
                            height: `${Math.max(d.count ? 8 : 0, (d.count / maxDay) * 100)}%`,
                            backgroundColor: d.isToday ? colors.brand : 'rgba(124,147,247,0.45)',
                          },
                        ]}
                      />
                    </View>
                    <Text style={[type.caption, d.isToday && { color: colors.text, fontWeight: '700' }]}>{d.label}</Text>
                  </View>
                ))}
              </View>
            </View>

            {/* Emotional mix */}
            {mix.length > 0 && (
              <View style={styles.card}>
                <View style={styles.cardHead}>
                  <Text style={type.headline}>Emotional mix</Text>
                  <Text style={type.caption}>Detected from your messages</Text>
                </View>
                <View style={{ gap: spacing.md }}>
                  {mix.map(m => {
                    const c = emotionColors[m.emotion] || colors.textSubtle;
                    return (
                      <View key={m.emotion} style={{ gap: 6 }}>
                        <View style={styles.mixRow}>
                          <View style={[styles.dot, { backgroundColor: c }]} />
                          <Text style={[type.callout, { flex: 1, color: colors.text, textTransform: 'capitalize' }]}>{m.emotion}</Text>
                          <Text style={[type.callout, { fontVariant: ['tabular-nums'] }]}>{m.pct}%</Text>
                        </View>
                        <View style={styles.mixTrack}>
                          <View style={[styles.mixFill, { width: `${m.pct}%`, backgroundColor: c }]} />
                        </View>
                      </View>
                    );
                  })}
                </View>
              </View>
            )}

            <CrisisCard
              title="Need to talk to someone?"
              message="Trained counsellors are available — free and confidential."
            />
          </>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

function ScoreRing({ score, color }: { score: number; color: string }) {
  const size = 104, stroke = 10;
  const r = (size - stroke) / 2;
  const circumference = 2 * Math.PI * r;
  const offset = circumference * (1 - Math.min(Math.max(score, 0), 100) / 100);

  return (
    <View style={{ width: size, height: size }} accessibilityLabel={`Wellness score ${score} out of 100`}>
      <Svg width={size} height={size} style={{ transform: [{ rotate: '-90deg' }] }}>
        <Circle cx={size / 2} cy={size / 2} r={r} stroke={colors.surfaceAlt} strokeWidth={stroke} fill="none" />
        <Circle
          cx={size / 2} cy={size / 2} r={r} stroke={color} strokeWidth={stroke} fill="none"
          strokeDasharray={`${circumference} ${circumference}`} strokeDashoffset={offset} strokeLinecap="round"
        />
      </Svg>
      <View style={styles.ringLabel}>
        <Text style={[type.title, { fontVariant: ['tabular-nums'] }]}>{score}</Text>
        <Text style={type.caption}>/ 100</Text>
      </View>
    </View>
  );
}

function Stat({ icon, value, label, valueColor }: {
  icon: keyof typeof Feather.glyphMap; value: string; label: string; valueColor?: string;
}) {
  return (
    <View style={[styles.card, styles.stat]}>
      <Feather name={icon} size={16} color={colors.textSubtle} />
      <Text style={[styles.statValue, valueColor && { color: valueColor }]} numberOfLines={1}>{value}</Text>
      <Text style={type.caption} numberOfLines={1}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.bg },
  scroll: {
    width: '100%', maxWidth: MAX_CONTENT_WIDTH, alignSelf: 'center',
    padding: spacing.lg, paddingBottom: spacing.xxxl, gap: spacing.md,
  },
  header: { flexDirection: 'row', alignItems: 'center', paddingVertical: spacing.sm, paddingHorizontal: spacing.xs },
  iconBtn: { width: 44, height: 44, borderRadius: 22, alignItems: 'center', justifyContent: 'center' },
  card: {
    backgroundColor: colors.surface, borderRadius: radius.lg, borderWidth: 1,
    borderColor: colors.border, padding: spacing.lg, gap: spacing.lg,
  },
  cardHead: { flexDirection: 'row', alignItems: 'baseline', justifyContent: 'space-between' },
  hero: { flexDirection: 'row', alignItems: 'center', gap: spacing.xl },
  ringLabel: { ...StyleSheet.absoluteFillObject, alignItems: 'center', justifyContent: 'center' },
  empty: { flex: 1, alignItems: 'center', gap: spacing.sm, paddingVertical: spacing.md },
  emptyIcon: {
    width: 52, height: 52, borderRadius: 26, backgroundColor: colors.brandSoft,
    alignItems: 'center', justifyContent: 'center', marginBottom: spacing.xs,
  },
  centerState: { alignItems: 'center', gap: spacing.md, paddingVertical: spacing.xxxl },
  stats: { flexDirection: 'row', gap: spacing.md },
  stat: { flex: 1, gap: spacing.xs, padding: spacing.md },
  statValue: { fontSize: 22, lineHeight: 28, fontWeight: '700', color: colors.text, textTransform: 'capitalize' },
  bars: { flexDirection: 'row', justifyContent: 'space-between', gap: spacing.sm },
  barCol: { flex: 1, alignItems: 'center', gap: 6 },
  barTrack: {
    width: '100%', maxWidth: 28, height: 96, backgroundColor: colors.surfaceAlt,
    borderRadius: radius.sm, justifyContent: 'flex-end', overflow: 'hidden',
  },
  barFill: { width: '100%', borderRadius: radius.sm },
  mixRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  dot: { width: 8, height: 8, borderRadius: 4 },
  mixTrack: { height: 6, borderRadius: 3, backgroundColor: colors.surfaceAlt, overflow: 'hidden' },
  mixFill: { height: '100%', borderRadius: 3 },
});

import { Platform, TextStyle, ViewStyle } from 'react-native';

// Calm, low-contrast night palette. Surfaces step up in lightness; text stays AA-legible.
export const colors = {
  bg: '#0B1120',
  bgElevated: '#0F172A',
  surface: '#141D31',
  surfaceAlt: '#1B2640',
  surfacePressed: '#22304F',
  border: '#24314D',
  borderStrong: '#33415F',

  text: '#E9EEF8',
  textMuted: '#A3AFC6',
  textSubtle: '#6B7A99',
  textOnAccent: '#0B1120',

  brand: '#7C93F7',
  brandSoft: 'rgba(124,147,247,0.14)',

  success: '#4ADE80',
  warning: '#FBBF24',
  danger: '#F87171',
  dangerSoft: 'rgba(248,113,113,0.12)',
};

export const emotionColors: Record<string, string> = {
  joy: '#4ADE80',
  sadness: '#60A5FA',
  anger: '#F87171',
  fear: '#A78BFA',
  anxiety: '#FB923C',
  stress: '#FBBF24',
  surprise: '#22D3EE',
  disgust: '#A3E635',
  neutral: '#94A3B8',
};

export const moodColors: Record<string, string> = {
  happy: '#4ADE80', excited: '#FBBF24', proud: '#A78BFA', playful: '#FACC15',
  shocked: '#F87171', surprised: '#22D3EE', sad: '#60A5FA', concerned: '#FB923C',
  worried: '#FB923C', serious: '#94A3B8', calm: '#5EEAD4', warm: '#7C93F7',
  gentle_firm: '#FB923C', strict: '#F87171', thoughtful: '#A78BFA', curious: '#34D399',
};

export const spacing = { xxs: 2, xs: 4, sm: 8, md: 12, lg: 16, xl: 20, xxl: 24, xxxl: 32 };

export const radius = { sm: 8, md: 12, lg: 16, xl: 20, pill: 999 };

export const type: Record<string, TextStyle> = {
  display: { fontSize: 28, lineHeight: 34, fontWeight: '700', color: colors.text, letterSpacing: -0.4 },
  title: { fontSize: 22, lineHeight: 28, fontWeight: '700', color: colors.text, letterSpacing: -0.2 },
  headline: { fontSize: 17, lineHeight: 22, fontWeight: '600', color: colors.text },
  body: { fontSize: 15, lineHeight: 22, color: colors.text },
  bodyMuted: { fontSize: 15, lineHeight: 22, color: colors.textMuted },
  callout: { fontSize: 14, lineHeight: 20, color: colors.textMuted },
  caption: { fontSize: 12, lineHeight: 16, color: colors.textSubtle },
  overline: {
    fontSize: 11, lineHeight: 14, fontWeight: '700', color: colors.textSubtle,
    letterSpacing: 0.8, textTransform: 'uppercase',
  },
};

export const shadow: ViewStyle = Platform.select({
  web: { boxShadow: '0 8px 24px rgba(0,0,0,0.28)' } as ViewStyle,
  default: {
    shadowColor: '#000', shadowOpacity: 0.28, shadowRadius: 16,
    shadowOffset: { width: 0, height: 8 }, elevation: 6,
  },
})!;

// Strips the browser focus ring on web text inputs; we draw our own focus state.
export const webNoOutline = Platform.OS === 'web' ? ({ outlineStyle: 'none' } as any) : {};

// Native driver isn't available on web; using it there just logs warnings.
export const nativeDriver = Platform.OS !== 'web';

// Content column width on large screens (laptop browser) so text doesn't stretch edge to edge.
export const MAX_CONTENT_WIDTH = 760;

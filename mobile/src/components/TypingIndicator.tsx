import React, { useEffect, useRef } from 'react';
import { Animated, View, StyleSheet } from 'react-native';
import { colors, radius, spacing, nativeDriver } from '../theme';

export default function TypingIndicator({ color }: { color: string }) {
  const dots = useRef([0, 1, 2].map(() => new Animated.Value(0.3))).current;

  useEffect(() => {
    const anims = dots.map((v, i) =>
      Animated.loop(
        Animated.sequence([
          Animated.delay(i * 160),
          Animated.timing(v, { toValue: 1, duration: 320, useNativeDriver: nativeDriver }),
          Animated.timing(v, { toValue: 0.3, duration: 320, useNativeDriver: nativeDriver }),
          Animated.delay((2 - i) * 160),
        ]),
      ),
    );
    anims.forEach(a => a.start());
    return () => anims.forEach(a => a.stop());
  }, []);

  return (
    <View style={styles.bubble} accessibilityLabel="Companion is typing">
      {dots.map((v, i) => (
        <Animated.View
          key={i}
          style={[
            styles.dot,
            { backgroundColor: color, opacity: v, transform: [{ translateY: v.interpolate({ inputRange: [0.3, 1], outputRange: [0, -3] }) }] },
          ]}
        />
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  bubble: {
    flexDirection: 'row', gap: 5, alignItems: 'center', alignSelf: 'flex-start',
    backgroundColor: colors.surface, borderRadius: radius.lg, borderBottomLeftRadius: radius.sm / 2,
    paddingHorizontal: spacing.lg, paddingVertical: spacing.md + 2,
    borderWidth: 1, borderColor: colors.border,
  },
  dot: { width: 7, height: 7, borderRadius: 4 },
});

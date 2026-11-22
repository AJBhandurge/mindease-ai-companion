import React, { useEffect, useRef } from 'react';
import { Animated, Text, StyleSheet } from 'react-native';
import { nativeDriver } from '../theme';

interface Props {
  emoji: string;
  ringColor: string;
  background: string;
  size?: number;
}

// Pops briefly whenever the emoji changes, so expression reactions (😮, 😄) feel alive.
export default function CompanionAvatar({ emoji, ringColor, background, size = 40 }: Props) {
  const scale = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    scale.setValue(0.85);
    Animated.spring(scale, { toValue: 1, friction: 4, tension: 160, useNativeDriver: nativeDriver }).start();
  }, [emoji]);

  return (
    <Animated.View
      style={[
        styles.ring,
        {
          width: size, height: size, borderRadius: size / 2,
          borderColor: ringColor, backgroundColor: background, transform: [{ scale }],
        },
      ]}
      accessibilityElementsHidden
      importantForAccessibility="no-hide-descendants"
    >
      <Text style={{ fontSize: size * 0.48 }}>{emoji}</Text>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  ring: { borderWidth: 2, alignItems: 'center', justifyContent: 'center', flexShrink: 0 },
});

import React from 'react';
import { StyleSheet, View } from 'react-native';
import { useTheme } from '@core/design-system/useTheme';
import { spacing, radius } from '@core/design-system/sizing';
import { Text } from '@core/design-system/kit';

export function Toast({ message }: { message: string | null }) {
  const theme = useTheme();
  if (!message) return null;

  return (
    <View style={styles.container} pointerEvents="none">
      <View
        style={[styles.bubble, { backgroundColor: theme.text }]}
        accessibilityRole="alert"
        accessibilityLiveRegion="polite"
      >
        <Text style={{ color: theme.background }}>{message}</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: spacing.xl,
    alignItems: 'center',
    paddingHorizontal: spacing.lg,
  },
  bubble: {
    borderRadius: radius.md,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
    maxWidth: '100%',
  },
});

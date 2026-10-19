import React from 'react';
import { StyleSheet, View } from 'react-native';
import { useTheme } from '../useTheme';
import { radius, spacing } from '../sizing';
import { Text } from './Text';

export type StatusTone = 'neutral' | 'progress' | 'success' | 'danger' | 'warning';

export interface StatusBadgeProps {
  label: string;
  tone: StatusTone;
}

export function StatusBadge({ label, tone }: StatusBadgeProps) {
  const theme = useTheme();
  const color =
    tone === 'success'
      ? theme.success
      : tone === 'danger'
        ? theme.danger
        : tone === 'warning'
          ? theme.warning
          : tone === 'progress'
            ? theme.primary
            : theme.textMuted;

  return (
    <View
      style={[styles.base, { borderColor: color }]}
      accessibilityLiveRegion="polite"
      accessibilityRole="text"
    >
      <View style={[styles.dot, { backgroundColor: color }]} />
      <Text variant="caption" style={{ color }}>
        {label}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  base: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    borderWidth: 1,
    borderRadius: radius.sm,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    gap: spacing.xs,
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
});

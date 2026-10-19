import React, { type PropsWithChildren } from 'react';
import { StyleSheet, View, type ViewStyle } from 'react-native';
import { useTheme } from '../useTheme';
import { radius, spacing } from '../sizing';

export interface CardProps {
  style?: ViewStyle;
}

export function Card({ children, style }: PropsWithChildren<CardProps>) {
  const theme = useTheme();
  return (
    <View style={[styles.base, { backgroundColor: theme.surface, borderColor: theme.border }, style]}>
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  base: {
    borderRadius: radius.lg,
    borderWidth: StyleSheet.hairlineWidth,
    padding: spacing.lg,
    gap: spacing.sm,
  },
});

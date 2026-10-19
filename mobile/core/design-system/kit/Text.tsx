import React from 'react';
import { Text as RNText, StyleSheet, type TextProps as RNTextProps } from 'react-native';
import { useTheme } from '../useTheme';

export type TextVariant = 'title' | 'subtitle' | 'body' | 'caption';

export interface TextProps extends RNTextProps {
  variant?: TextVariant;
  color?: 'default' | 'muted' | 'danger' | 'success';
}

const sizeByVariant: Record<TextVariant, { fontSize: number; fontWeight: '400' | '600' | '700'; lineHeight: number }> = {
  title: { fontSize: 22, fontWeight: '700', lineHeight: 28 },
  subtitle: { fontSize: 17, fontWeight: '600', lineHeight: 23 },
  body: { fontSize: 15, fontWeight: '400', lineHeight: 21 },
  caption: { fontSize: 13, fontWeight: '400', lineHeight: 18 },
};

/** Never disables font scaling — large system fonts must keep working here. */
export function Text({ variant = 'body', color = 'default', style, ...rest }: TextProps) {
  const theme = useTheme();
  const colorValue =
    color === 'muted'
      ? theme.textMuted
      : color === 'danger'
        ? theme.danger
        : color === 'success'
          ? theme.success
          : theme.text;

  return <RNText style={[styles.base, sizeByVariant[variant], { color: colorValue }, style]} {...rest} />;
}

const styles = StyleSheet.create({
  base: {
    flexShrink: 1,
  },
});

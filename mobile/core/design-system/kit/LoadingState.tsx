import React from 'react';
import { ActivityIndicator, StyleSheet, View } from 'react-native';
import { useTheme } from '../useTheme';
import { spacing } from '../sizing';
import { Text } from './Text';

export function LoadingState({ message }: { message: string }) {
  const theme = useTheme();
  return (
    <View style={styles.base} accessibilityRole="progressbar" accessibilityLabel={message}>
      <ActivityIndicator color={theme.primary} />
      <Text color="muted">{message}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  base: { alignItems: 'center', gap: spacing.sm, paddingVertical: spacing.xl },
});

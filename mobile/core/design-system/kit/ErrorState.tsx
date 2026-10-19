import React from 'react';
import { StyleSheet, View } from 'react-native';
import { spacing } from '../sizing';
import { Text } from './Text';
import { Button } from './Button';

export interface ErrorStateProps {
  message: string;
  actionLabel?: string;
  onAction?: () => void;
}

export function ErrorState({ message, actionLabel, onAction }: ErrorStateProps) {
  return (
    <View style={styles.base} accessibilityRole="alert" accessibilityLiveRegion="assertive">
      <Text color="danger">{message}</Text>
      {actionLabel && onAction ? <Button label={actionLabel} onPress={onAction} variant="secondary" /> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  base: { gap: spacing.sm },
});

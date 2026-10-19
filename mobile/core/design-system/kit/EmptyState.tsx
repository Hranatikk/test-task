import React from 'react';
import { StyleSheet, View } from 'react-native';
import { spacing } from '../sizing';
import { Text } from './Text';

export function EmptyState({ message }: { message: string }) {
  return (
    <View style={styles.base}>
      <Text color="muted">{message}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  base: { paddingVertical: spacing.xl, alignItems: 'center' },
});

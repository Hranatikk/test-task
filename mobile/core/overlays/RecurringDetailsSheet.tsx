import React from 'react';
import { Modal, StyleSheet, View } from 'react-native';
import { formatMinor } from '@core/common/money';
import { spacing } from '@core/design-system/sizing';
import { Button, Card, Text } from '@core/design-system/kit';
import type { RecurringItem } from '@core/modules/statement-import';

export interface RecurringDetailsSheetProps {
  item: RecurringItem | null;
  currency: string;
  onClose: () => void;
}

export function RecurringDetailsSheet({ item, currency, onClose }: RecurringDetailsSheetProps) {
  if (!item) return null;

  return (
    <Modal visible transparent animationType="fade" onRequestClose={onClose}>
      <View style={styles.backdrop}>
        <Card style={styles.card}>
          <Text variant="title">{item.merchant}</Text>
          <Text variant="subtitle" color="muted">
            {formatMinor(item.amountMinor, currency)} · {item.cadence}
          </Text>
          <Text color="muted">Last seen {item.lastSeen}</Text>
          <View style={styles.spacer} />
          <Button label="Close" onPress={onClose} variant="secondary" />
        </Card>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: { flex: 1, justifyContent: 'center', padding: spacing.lg, backgroundColor: 'rgba(0,0,0,0.4)' },
  card: { gap: spacing.xs },
  spacer: { height: spacing.sm },
});

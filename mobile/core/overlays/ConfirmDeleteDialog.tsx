import React from 'react';
import { Modal, StyleSheet, View } from 'react-native';
import { spacing } from '@core/design-system/sizing';
import { Button, Card, Text } from '@core/design-system/kit';

export interface ConfirmDeleteDialogProps {
  visible: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}

export function ConfirmDeleteDialog({ visible, onConfirm, onCancel }: ConfirmDeleteDialogProps) {
  if (!visible) return null;

  return (
    <Modal visible transparent animationType="fade" onRequestClose={onCancel}>
      <View style={styles.backdrop}>
        <Card style={styles.card}>
          <Text variant="subtitle">Delete this import?</Text>
          <Text color="muted">
            The import will be deleted from the server. This can take a few seconds, and it is not final until
            confirmed.
          </Text>
          <View style={styles.spacer} />
          <Button label="Delete" onPress={onConfirm} variant="destructive" />
          <Button label="Cancel" onPress={onCancel} variant="secondary" />
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

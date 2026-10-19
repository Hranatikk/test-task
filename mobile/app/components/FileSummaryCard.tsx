import React from 'react';
import { View } from 'react-native';
import { Button, Card, Text } from '@core/design-system/kit';
import { spacing } from '@core/design-system/sizing';
import { strings } from '@core/shared/i18n/strings';
import type { FileFormat } from '@core/modules/statement-import';

export interface FileSummaryCardProps {
  displayName: string;
  size: number;
  format: FileFormat;
  onConfirm: () => void;
  onCancel: () => void;
  busy?: boolean;
}

function formatSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  const kb = bytes / 1024;
  if (kb < 1024) return `${kb.toFixed(0)} KB`;
  return `${(kb / 1024).toFixed(1)} MB`;
}

export function FileSummaryCard({ displayName, size, format, onConfirm, onCancel, busy }: FileSummaryCardProps) {
  return (
    <Card>
      <Text variant="subtitle">{strings.confirmTitle}</Text>
      <Text>{displayName}</Text>
      <Text color="muted">
        {format.toUpperCase()} · {formatSize(size)}
      </Text>
      <View style={{ height: spacing.sm }} />
      <Button label={strings.send} onPress={onConfirm} loading={busy} />
      <Button label={strings.cancel} onPress={onCancel} variant="secondary" disabled={busy} />
    </Card>
  );
}

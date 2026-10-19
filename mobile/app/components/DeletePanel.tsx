import React from 'react';
import { Card, Button, StatusBadge, Text } from '@core/design-system/kit';
import { strings } from '@core/shared/i18n/strings';
import type { DeletePhase } from '@core/modules/statement-import';

export interface DeletePanelProps {
  phase: Exclude<DeletePhase, 'none'>;
  onRetry: () => void;
  onStartNew: () => void;
}

export function DeletePanel({ phase, onRetry, onStartNew }: DeletePanelProps) {
  if (phase === 'requested' || phase === 'accepted') {
    return (
      <Card>
        <StatusBadge label={strings.deleting} tone="progress" />
      </Card>
    );
  }

  if (phase === 'failed') {
    return (
      <Card>
        <StatusBadge label={strings.deleteFailedTitle} tone="danger" />
        <Text color="muted">{strings.deleteFailedBody}</Text>
        <Button label={strings.retryDelete} onPress={onRetry} variant="destructive" />
      </Card>
    );
  }

  return (
    <Card>
      <StatusBadge label={strings.deletedConfirmed} tone="success" />
      <Button label={strings.startNew} onPress={onStartNew} />
    </Card>
  );
}

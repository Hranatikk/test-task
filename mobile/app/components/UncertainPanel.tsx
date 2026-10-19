import React from 'react';
import { Card, Button, Text } from '@core/design-system/kit';
import { strings } from '@core/shared/i18n/strings';

export interface UncertainPanelProps {
  notFoundYet: boolean;
  busy: boolean;
  onCheckAgain: () => void;
  onSendAgain: () => void;
}

export function UncertainPanel({ notFoundYet, busy, onCheckAgain, onSendAgain }: UncertainPanelProps) {
  return (
    <Card>
      <Text variant="subtitle">{strings.uncertainTitle}</Text>
      <Text color="muted">{notFoundYet ? strings.notFoundYet : strings.uncertainBody}</Text>
      <Button label={strings.checkAgain} onPress={onCheckAgain} loading={busy} />
      <Button label={strings.sendAgain} onPress={onSendAgain} variant="secondary" disabled={busy} />
    </Card>
  );
}

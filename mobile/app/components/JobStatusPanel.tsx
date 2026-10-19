import React from 'react';
import { Card, StatusBadge, Text } from '@core/design-system/kit';
import { strings } from '@core/shared/i18n/strings';
import type { ServerStatus } from '@core/modules/statement-import';

export interface JobStatusPanelProps {
  status: Extract<ServerStatus, 'queued' | 'processing'>;
}

export function JobStatusPanel({ status }: JobStatusPanelProps) {
  const label = status === 'queued' ? strings.queued : strings.processing;
  return (
    <Card>
      <StatusBadge label={label} tone="progress" />
      <Text color="muted">The server is working on this import. This screen updates automatically.</Text>
    </Card>
  );
}

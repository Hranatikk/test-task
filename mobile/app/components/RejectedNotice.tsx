import React from 'react';
import { Card, Button, Text } from '@core/design-system/kit';
import { strings, rejectReasonText } from '@core/shared/i18n/strings';
import type { RejectReason } from '@core/modules/statement-import';

export interface RejectedNoticeProps {
  reason: RejectReason | undefined;
  onPickAnother: () => void;
}

export function RejectedNotice({ reason, onPickAnother }: RejectedNoticeProps) {
  return (
    <Card>
      <Text variant="subtitle" color="danger">
        {strings.rejectedNotSent}
      </Text>
      <Text color="muted">{reason ? rejectReasonText[reason] : strings.rejectedNotSent}</Text>
      <Button label={strings.chooseAnother} onPress={onPickAnother} />
    </Card>
  );
}

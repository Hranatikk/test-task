import React, { useCallback } from 'react';
import { AccessibilityInfo, Platform, Pressable } from 'react-native';
import { ENABLE_DIAGNOSTICS } from '../config/env';
import { ROUTES } from '../navigation/routes';
import type { ImportScreenProps } from '../navigation/types';
import { useRootStore } from '../setup/RootStoreContext';
import { DeletePanel } from '../components/DeletePanel';
import { FileSummaryCard } from '../components/FileSummaryCard';
import { JobStatusPanel } from '../components/JobStatusPanel';
import { RecurringList } from '../components/RecurringList';
import { RejectedNotice } from '../components/RejectedNotice';
import { UncertainPanel } from '../components/UncertainPanel';
import { Button, EmptyState, ErrorState, LoadingState, Screen, Text } from '@core/design-system/kit';
import { overlayManager } from '@core/overlays/overlayManager';
import { errorCodeText, strings } from '@core/shared/i18n/strings';

function DiagnosticsHeaderButton({ onPress }: { onPress: () => void }) {
  return (
    <Pressable onPress={onPress} accessibilityRole="button" accessibilityLabel="Diagnostics">
      <Text color="muted">Diag</Text>
    </Pressable>
  );
}

export function ImportScreen({ navigation }: ImportScreenProps) {
  const rootStore = useRootStore();
  const { state, pickFile, confirm, cancel, retryPost, recheck, refresh, delete: deleteImport, retryDelete, resetLocal } =
    rootStore.useImportStore();

  const announce = useCallback((message: string) => {
    if (Platform.OS === 'ios') AccessibilityInfo.announceForAccessibility(message);
  }, []);

  const handleDelete = useCallback(async () => {
    const confirmed = await overlayManager.confirmDelete();
    if (confirmed) await deleteImport();
  }, [deleteImport]);

  React.useLayoutEffect(() => {
    if (!ENABLE_DIAGNOSTICS) return;
    navigation.setOptions({
      // eslint-disable-next-line react/no-unstable-nested-components -- react-navigation's headerRight option is itself a render prop
      headerRight: () => <DiagnosticsHeaderButton onPress={() => navigation.navigate(ROUTES.Diagnostics)} />,
    });
  }, [navigation]);

  let body: React.ReactNode;

  if (state.phase === 'idle') {
    body = <EmptyState message="No statement imported yet." />;
  } else if (state.phase === 'staged') {
    body = (
      <FileSummaryCard
        displayName={state.displayName ?? 'Statement'}
        size={state.size ?? 0}
        format={state.format ?? 'csv'}
        onConfirm={() => {
          confirm();
          announce('Sending statement');
        }}
        onCancel={cancel}
      />
    );
  } else if (state.phase === 'rejected') {
    body = <RejectedNotice reason={state.rejectReason} onPickAnother={pickFile} />;
  } else if (state.phase === 'prepared' || state.phase === 'posting') {
    body = <LoadingState message={strings.sending} />;
  } else if (state.phase === 'uncertain') {
    body = (
      <UncertainPanel
        notFoundYet={false}
        busy={false}
        onCheckAgain={() => {
          recheck();
          announce('Checking import status');
        }}
        onSendAgain={retryPost}
      />
    );
  } else if (state.phase === 'tracking') {
    if (state.deletePhase !== 'none') {
      body = (
        <DeletePanel
          phase={state.deletePhase as Exclude<typeof state.deletePhase, 'none'>}
          onRetry={retryDelete}
          onStartNew={resetLocal}
        />
      );
    } else if (state.server?.status === 'ready') {
      body = (
        <>
          <RecurringList
            items={state.server.items ?? []}
            currency={state.server.currency ?? 'AUD'}
            onSelect={item => overlayManager.showDetails(item)}
          />
          <Button label={strings.refresh} onPress={refresh} variant="secondary" />
          <Button label={strings.deleteImport} onPress={handleDelete} variant="destructive" />
        </>
      );
    } else {
      body = <JobStatusPanel status={(state.server?.status as 'queued' | 'processing') ?? 'queued'} />;
    }
  } else if (state.phase === 'failed') {
    body = <ErrorState message={errorCodeText(state.errorCode)} actionLabel={strings.startOver} onAction={resetLocal} />;
  } else {
    body = <EmptyState message="…" />;
  }

  return (
    <Screen>
      {body}
      {state.phase === 'idle' ? (
        <Button label={strings.pickFile} onPress={pickFile} accessibilityHint={strings.pickFileHint} />
      ) : null}
    </Screen>
  );
}

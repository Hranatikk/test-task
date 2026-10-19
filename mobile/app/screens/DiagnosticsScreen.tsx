import React, { useEffect } from 'react';
import { StyleSheet, Switch, View } from 'react-native';
import { useRootStore } from '../setup/RootStoreContext';
import { Button, Card, Screen, Text } from '@core/design-system/kit';
import type { ScenarioMode } from '@core/modules/diagnostics';

const SCENARIOS: ScenarioMode[] = ['happy', 'lost_ack', 'stale_status', 'delete_failure'];

export function DiagnosticsScreen() {
  const rootStore = useRootStore();
  const diagnostics = rootStore.useDiagnosticsStore();
  const { state: importState, resetLocal } = rootStore.useImportStore();
  const http = rootStore.http;

  useEffect(() => {
    diagnostics.refreshState(http).catch(() => {});
  }, [diagnostics, http]);

  return (
    <Screen>
      <Card>
        <Text variant="subtitle">Mock base URL</Text>
        <Text color="muted">{diagnostics.baseUrl}</Text>
        <Text color="muted">Changing this applies on next app launch.</Text>
      </Card>

      <Card>
        <Text variant="subtitle">Scenario</Text>
        <Text color="muted">Current: {diagnostics.lastState?.mode ?? '—'}</Text>
        {SCENARIOS.map(mode => (
          <Button key={mode} label={mode} variant="secondary" onPress={() => diagnostics.setScenario(http, mode)} />
        ))}
      </Card>

      <Card>
        <View style={styles.row}>
          <Text>Auto-recover after a lost POST</Text>
          <Switch value={diagnostics.autoRecover} onValueChange={diagnostics.setAutoRecover} />
        </View>
        <Text color="muted">
          Turn off to demonstrate lost_ack + relaunch: the screen stays on &quot;uncertain&quot; until you kill and
          reopen the app.
        </Text>
      </Card>

      <Card>
        <Text variant="subtitle">Mock counters</Text>
        <Text color="muted">createRequests: {diagnostics.lastState?.stats.createRequests ?? '—'}</Text>
        <Text color="muted">newJobs: {diagnostics.lastState?.stats.newJobs ?? '—'}</Text>
        <Text color="muted">duplicateHits: {diagnostics.lastState?.stats.duplicateHits ?? '—'}</Text>
        <Text color="muted">deleteRequests: {diagnostics.lastState?.stats.deleteRequests ?? '—'}</Text>
        <Button label="Refresh counters" variant="secondary" onPress={() => diagnostics.refreshState(http)} />
        <Button label="Reset mock state" variant="secondary" onPress={() => diagnostics.reset(http)} />
      </Card>

      <Card>
        <Text variant="subtitle">Local data</Text>
        <Text color="muted">
          Current phase: {importState.phase} / delete: {importState.deletePhase}
        </Text>
        <Button label="Clear local data (server not touched)" variant="destructive" onPress={resetLocal} />
      </Card>
    </Screen>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
});

import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { ENABLE_DIAGNOSTICS } from '../config/env';
import { DiagnosticsScreen } from '../screens/DiagnosticsScreen';
import { ImportScreen } from '../screens/ImportScreen';
import { ROUTES } from './routes';
import type { RootStackParamList } from './types';

const Stack = createNativeStackNavigator<RootStackParamList>();

/**
 * Import phases render as blocks inside ImportScreen, not as separate routes:
 * after a relaunch, the restored OpState and the navigation stack would
 * otherwise need to be kept in sync as two sources of truth.
 */
export function RootNavigator() {
  return (
    <Stack.Navigator>
      <Stack.Screen name={ROUTES.Import} component={ImportScreen} options={{ title: 'Statement import' }} />
      {ENABLE_DIAGNOSTICS ? (
        <Stack.Screen name={ROUTES.Diagnostics} component={DiagnosticsScreen} options={{ title: 'Diagnostics' }} />
      ) : null}
    </Stack.Navigator>
  );
}

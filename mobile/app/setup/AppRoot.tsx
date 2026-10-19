import { NavigationContainer } from '@react-navigation/native';
import React, { useEffect, useRef, useState } from 'react';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { LoadingState, Screen } from '@core/design-system/kit';
import { OverlayProvider } from '@core/overlays/OverlayProvider';
import { RootNavigator } from '../navigation/RootNavigator';
import { bootstrap } from './bootstrap';
import { createComposition } from './composition';
import { RootStoreContext } from './RootStoreContext';

export function AppRoot() {
  const storeRef = useRef(createComposition());
  const [ready, setReady] = useState(false);

  useEffect(() => {
    const store = storeRef.current;
    bootstrap(store).finally(() => setReady(true));
    return () => store.importController.dispose();
  }, []);

  const { state } = storeRef.current.useImportStore();
  const currency = state.server?.currency ?? 'AUD';

  return (
    <SafeAreaProvider>
      <RootStoreContext.Provider value={storeRef.current}>
        <OverlayProvider currency={currency}>
          <NavigationContainer>
            {ready ? (
              <RootNavigator />
            ) : (
              <Screen>
                <LoadingState message="Loading…" />
              </Screen>
            )}
          </NavigationContainer>
        </OverlayProvider>
      </RootStoreContext.Provider>
    </SafeAreaProvider>
  );
}

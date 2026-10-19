import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { ROUTES } from './routes';

export type RootStackParamList = {
  [ROUTES.Import]: undefined;
  [ROUTES.Diagnostics]: undefined;
};

export type ImportScreenProps = NativeStackScreenProps<RootStackParamList, typeof ROUTES.Import>;
export type DiagnosticsScreenProps = NativeStackScreenProps<RootStackParamList, typeof ROUTES.Diagnostics>;

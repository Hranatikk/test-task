/**
 * @format
 */

import { AppRegistry } from 'react-native';
import { AppRoot } from './app/setup/AppRoot';
import { name as appName } from './app.json';

AppRegistry.registerComponent(appName, () => AppRoot);

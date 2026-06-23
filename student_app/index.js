/**
 * @format
 */

import { AppRegistry } from 'react-native';
import firebase from '@react-native-firebase/app';
import App from './App';
import { name as appName } from './app.json';
import { registerBackgroundHandler } from './src/utils/notificationHandler';

if (!firebase.apps.length) {
  firebase.initializeApp({
    appId: '1:349267453118:android:5d0ef8f866f43c5d1feaef',
    projectId: 'thearcschool-a374b',
    messagingSenderId: '349267453118',
    apiKey: 'AIzaSyBd21GLxzD7KrrL9dUup3iJ2Uq2Gbrn4oA',
  });
}

registerBackgroundHandler();

AppRegistry.registerComponent(appName, () => App);

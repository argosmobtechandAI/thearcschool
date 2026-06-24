import notifee, { EventType, AndroidImportance } from '@notifee/react-native';
import FileViewer from 'react-native-file-viewer';
import messaging from '@react-native-firebase/messaging';
import { navigate } from '../navigation/navigationRef';

// Invalidate the RTK Query notifications cache so the in-app list auto-refreshes
const invalidateNotificationsCache = () => {
  try {
    const { DeviceEventEmitter } = require('react-native');
    DeviceEventEmitter.emit('onNotificationReceived');
    const { store } = require('../store');
    const { apiSlice } = require('../store/apiSlice');
    store.dispatch(apiSlice.util.invalidateTags(['Notifications', 'Dashboard']));
  } catch (e) {
    console.warn('Could not invalidate notifications cache:', e);
  }
};

export const handleNotificationEvent = async ({ type, detail }) => {
  if (type === EventType.PRESS && detail.notification) {
    // 1. Handle File Download/Open logic
    const filePath = detail.notification.data?.filePath;
    if (filePath) {
      try {
        await FileViewer.open(filePath, { showOpenWithDialog: true, showAppsSuggestions: true });
      } catch (error) {
        console.error('Error opening file:', error);
      }
    }
    
    // 2. Handle Deep Linking logic
    const routeScreen = detail.notification.data?.routeScreen;
    if (routeScreen) {
      try {
        const routeParams = detail.notification.data?.routeParams 
          ? (typeof detail.notification.data.routeParams === 'string' ? JSON.parse(detail.notification.data.routeParams) : detail.notification.data.routeParams)
          : {};
        
        let targetStack = null;
        let actualScreen = routeScreen;

        if (routeScreen === 'AttendanceHome') {
          targetStack = 'Attend';
        } else if (routeScreen === 'ExamsList') {
          targetStack = 'Work';
        } else if (routeScreen === 'DateSheet') {
          targetStack = 'Work';
          actualScreen = 'DateSheetScreen';
        } else if (routeScreen === 'StudentAcademicHistory') {
          targetStack = 'Work';
          actualScreen = 'StudentAcademicHistoryScreen';
        }

        if (targetStack) {
          navigate(targetStack, { screen: actualScreen, params: routeParams });
        } else {
          navigate(actualScreen, routeParams);
        }
      } catch (error) {
        console.error("Error parsing deep link params:", error);
      }
    }
  }
};

export const registerBackgroundHandler = () => {
  // Request notification permission once at startup
  notifee.requestPermission();

  notifee.onBackgroundEvent(handleNotificationEvent);

  // Handle background FCM messages — display the notification AND invalidate cache
  messaging().setBackgroundMessageHandler(async remoteMessage => {
    console.log('FCM background message received:', remoteMessage.messageId);
    await displayNotification(remoteMessage);
    // Invalidate cache so next app open shows the new notification immediately
    invalidateNotificationsCache();
  });
};

export const requestUserPermission = async () => {
  const authStatus = await messaging().requestPermission();
  const enabled =
    authStatus === messaging.AuthorizationStatus.AUTHORIZED ||
    authStatus === messaging.AuthorizationStatus.PROVISIONAL;

  if (enabled) {
    console.log('Authorization status:', authStatus);
    return true;
  }
  return false;
};

export const getFCMToken = async () => {
  try {
    const token = await messaging().getToken();
    return token;
  } catch (error) {
    console.error("Failed to get FCM token", error);
    return null;
  }
};

export const displayNotification = async (remoteMessage) => {
  const channelId = await notifee.createChannel({
    id: 'high_importance_channel_v2',
    name: 'High Importance Notifications',
    importance: AndroidImportance.HIGH,
    sound: 'default',
    vibration: true,
    vibrationPattern: [300, 500],
  });

  await notifee.displayNotification({
    title: remoteMessage.notification?.title || remoteMessage.data?.title || 'New Notification',
    body: remoteMessage.notification?.body || remoteMessage.data?.body || '',
    data: remoteMessage.data,
    android: {
      channelId,
      color: '#4f46e5',
      pressAction: {
        id: 'default',
      },
      sound: 'default',
      importance: AndroidImportance.HIGH,
      vibrationPattern: [300, 500],
    },
  });
};

export const setupForegroundHandler = () => {
  return messaging().onMessage(async remoteMessage => {
    console.log('FCM foreground message received:', remoteMessage.messageId);
    await displayNotification(remoteMessage);
    // Invalidate cache so the in-app Notifications list updates immediately
    invalidateNotificationsCache();
  });
};

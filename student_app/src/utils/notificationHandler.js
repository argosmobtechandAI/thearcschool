import notifee, { EventType, AndroidImportance } from '@notifee/react-native';
import FileViewer from 'react-native-file-viewer';
import messaging from '@react-native-firebase/messaging';
import { navigate } from '../navigation/navigationRef';

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
  notifee.onBackgroundEvent(handleNotificationEvent);

  // Handle background FCM messages
  messaging().setBackgroundMessageHandler(async remoteMessage => {
    console.log('Message handled in the background!', remoteMessage);
    await displayNotification(remoteMessage);
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
  await notifee.requestPermission();

  const channelId = await notifee.createChannel({
    id: 'default-sound',
    name: 'Default Sound Channel',
    importance: AndroidImportance.HIGH,
    sound: 'default',
  });

  await notifee.displayNotification({
    title: remoteMessage.notification?.title || 'New Notification',
    body: remoteMessage.notification?.body || '',
    data: remoteMessage.data, // Important: keep the data payload for deep linking!
    android: {
      channelId,
      smallIcon: 'ic_launcher', // make sure this exists in res/drawable
      color: '#4f46e5',
      pressAction: {
        id: 'default',
      },
      sound: 'default',
      importance: AndroidImportance.HIGH,
    },
  });
};

export const setupForegroundHandler = () => {
  return messaging().onMessage(async remoteMessage => {
    console.log('A new FCM message arrived!', JSON.stringify(remoteMessage));
    await displayNotification(remoteMessage);
  });
};

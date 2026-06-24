import 'react-native-gesture-handler';
import React, { useState, useEffect } from 'react';
import { StatusBar, StyleSheet } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { Provider } from 'react-redux';
import { store } from './src/store';
import RootNavigator from './src/navigation/RootNavigator';
import SplashScreen from './src/features/splash/SplashScreen';
import { colors } from './src/theme/colors';
import notifee from '@notifee/react-native';
import { handleNotificationEvent, setupForegroundHandler } from './src/utils/notificationHandler';

const App = () => {
  const [showSplash, setShowSplash] = useState(true);

  useEffect(() => {
    const unsubscribeNotifee = notifee.onForegroundEvent(handleNotificationEvent);
    const unsubscribeFCM = setupForegroundHandler();
    
    return () => {
      unsubscribeNotifee();
      if (unsubscribeFCM) unsubscribeFCM();
    };
  }, []);

  return (
    <GestureHandlerRootView style={styles.container}>
      <Provider store={store}>
        <SafeAreaProvider style={styles.container}>
          <StatusBar barStyle="light-content" backgroundColor={colors.primary} />
        {showSplash ? (
          <SplashScreen onFinish={() => setShowSplash(false)} />
        ) : (
          <RootNavigator />
        )}
        </SafeAreaProvider>
      </Provider>
    </GestureHandlerRootView>
  );
};


const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
});

export default App;

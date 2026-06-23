import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { useSelector } from 'react-redux';

import LoginScreen from '../features/auth/LoginScreen';
import TabNavigator from './TabNavigator';
import { DrawerProvider } from './DrawerContext';
import { navigationRef } from './navigationRef';

const Stack = createNativeStackNavigator();

// ─── Root Navigator ──────────────────────────────────────────────────────────

const RootNavigator = () => {
  const { isAuthenticated } = useSelector((state) => state.auth);

  return (
    <NavigationContainer ref={navigationRef}>
      <Stack.Navigator screenOptions={{ headerShown: false, animation: 'fade' }}>
        {!isAuthenticated ? (
          <Stack.Screen name="Login" component={LoginScreen} />
        ) : (
          <Stack.Screen name="Main">
            {() => (
              <DrawerProvider>
                <TabNavigator />
              </DrawerProvider>
            )}
          </Stack.Screen>
        )}
      </Stack.Navigator>
    </NavigationContainer>
  );
};

export default RootNavigator;

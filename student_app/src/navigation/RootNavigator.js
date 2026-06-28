import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { useSelector } from 'react-redux';
import { colors } from '../theme/colors';

import LoginScreen from '../features/auth/LoginScreen';
import TabNavigator from './TabNavigator';
import { DrawerProvider } from './DrawerContext';
import { navigationRef } from './navigationRef';
import LiveChatScreen from '../features/communication/LiveChatScreen';
import ChangePasswordScreen from '../features/profile/ChangePasswordScreen';
import ConsentsScreen from '../features/consents/ConsentsScreen';
import ThoughtScreen from '../features/thoughts/ThoughtScreen';
import GalleryScreen from '../features/gallery/GalleryScreen';
import CourseWorkScreen from '../features/coursework/CourseWorkScreen';

const Stack = createNativeStackNavigator();

const MainScreen = () => {
  return (
    <DrawerProvider>
      <TabNavigator />
    </DrawerProvider>
  );
};

// ─── Root Navigator ──────────────────────────────────────────────────────────

const RootNavigator = () => {
  const { isAuthenticated } = useSelector((state) => state.auth);

  return (
    <NavigationContainer ref={navigationRef}>
      <Stack.Navigator screenOptions={{ headerShown: false, animation: 'fade' }}>
        {!isAuthenticated ? (
          <Stack.Screen name="Login" component={LoginScreen} />
        ) : (
            <>
              <Stack.Screen name="Thought" component={ThoughtScreen} />
              <Stack.Screen name="Main" component={MainScreen} />
              <Stack.Screen name="Gallery" component={GalleryScreen} />
              <Stack.Screen name="CourseWork" component={CourseWorkScreen} />
              <Stack.Screen name="LiveChatScreen" component={LiveChatScreen} />
              <Stack.Screen name="ChangePassword" component={ChangePasswordScreen} />
              <Stack.Screen 
                name="Consents" 
                component={ConsentsScreen} 
                options={{ 
                  headerShown: true, 
                  title: "Consents",
                  headerStyle: { backgroundColor: colors.primary },
                  headerTintColor: '#fff',
                  headerTitleStyle: { fontWeight: '600' }
                }} 
              />
            </>
        )}
      </Stack.Navigator>
    </NavigationContainer>
  );
};

export default RootNavigator;

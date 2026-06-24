import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { useSelector } from 'react-redux';
import Icon from 'react-native-vector-icons/Feather';
import { Platform } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

// Import Theme
import { colors, shadows } from '../theme/colors';

// Navigation Reference
import { navigationRef } from './navigationRef';

// Navigators
const Stack = createNativeStackNavigator();
const Tab = createBottomTabNavigator();

// --- Screens ---
import { View, Text } from 'react-native';
import LoginScreen from '../features/auth/LoginScreen';
import DashboardScreen from '../features/dashboard/DashboardScreen';
import ComingSoonScreen from '../features/dashboard/ComingSoonScreen';
import StudentsListScreen from '../features/dashboard/StudentsListScreen';
import PayrollScreen from '../features/dashboard/PayrollScreen';
import LeavesScreen from '../features/dashboard/LeavesScreen';
import ProfileScreen from '../features/profile/ProfileScreen';
import ChangePasswordScreen from '../features/profile/ChangePasswordScreen';
import AnnualPlannerScreen from '../features/planning/AnnualPlannerScreen';

// Attendance
import AttendanceHomeScreen from '../features/attendance/AttendanceHomeScreen';
import AttendanceMarkingScreen from '../features/attendance/AttendanceMarkingScreen';
import StudentProfileScreen from '../features/attendance/StudentProfileScreen';
import StudentNotesScreen from '../features/dashboard/StudentNotesScreen';
import StudentAttendanceHistoryScreen from '../features/attendance/StudentAttendanceHistoryScreen';
import StudentAcademicHistoryScreen from '../features/grading/StudentAcademicHistoryScreen';
import NotificationsScreen from '../features/notifications/NotificationsScreen';

// Grading / Course Work
import ExamsListScreen from '../features/grading/ExamsListScreen';
import MarksEntryScreen from '../features/grading/MarksEntryScreen';
import DateSheetScreen from '../features/grading/DateSheetScreen';
import ResultsHomeScreen from '../features/results/ResultsHomeScreen';
import ClassResultsScreen from '../features/results/ClassResultsScreen';

// Communication
import ChatListScreen from '../features/communication/ChatListScreen';
import ChatRoomScreen from '../features/communication/ChatRoomScreen';

// --- Stacks ---
const DashboardStack = () => (
  <Stack.Navigator screenOptions={{ headerShown: false }}>
    <Stack.Screen name="DashboardHome" component={DashboardScreen} />
    <Stack.Screen name="AnnualPlanner" component={AnnualPlannerScreen} />
    <Stack.Screen name="ComingSoon" component={ComingSoonScreen} />
    <Stack.Screen name="PayrollScreen" component={PayrollScreen} />
    <Stack.Screen name="LeavesScreen" component={LeavesScreen} />
    <Stack.Screen name="StudentsList" component={StudentsListScreen} />
    <Stack.Screen name="StudentProfile" component={StudentProfileScreen} />
    <Stack.Screen name="StudentAttendanceHistoryScreen" component={StudentAttendanceHistoryScreen} />
    <Stack.Screen name="StudentAcademicHistoryScreen" component={StudentAcademicHistoryScreen} />
    <Stack.Screen name="StudentNotesScreen" component={StudentNotesScreen} />
    <Stack.Screen name="DateSheetScreen" component={DateSheetScreen} />
    <Stack.Screen name="Notifications" component={NotificationsScreen} />
    <Stack.Screen name="ChangePassword" component={ChangePasswordScreen} />
  </Stack.Navigator>
);

import AttendanceReportsScreen from '../features/attendance/AttendanceReportsScreen';

const AttendanceStack = () => (
  <Stack.Navigator screenOptions={{ headerShown: false }}>
    <Stack.Screen name="AttendanceHome" component={AttendanceHomeScreen} />
    <Stack.Screen name="AttendanceMarkingScreen" component={AttendanceMarkingScreen} />
    <Stack.Screen name="AttendanceReportsScreen" component={AttendanceReportsScreen} />
    <Stack.Screen name="StudentProfile" component={StudentProfileScreen} />
    <Stack.Screen name="StudentAttendanceHistoryScreen" component={StudentAttendanceHistoryScreen} />
    <Stack.Screen name="StudentAcademicHistoryScreen" component={StudentAcademicHistoryScreen} />
    <Stack.Screen name="StudentNotesScreen" component={StudentNotesScreen} />
  </Stack.Navigator>
);

const GradingStack = () => (
  <Stack.Navigator screenOptions={{ headerShown: false }}>
    <Stack.Screen name="ExamsList" component={ExamsListScreen} />
    <Stack.Screen name="MarksEntryScreen" component={MarksEntryScreen} />
    <Stack.Screen name="DateSheetScreen" component={DateSheetScreen} />
    <Stack.Screen name="ResultsHome" component={ResultsHomeScreen} />
    <Stack.Screen name="ClassResultsScreen" component={ClassResultsScreen} />
    <Stack.Screen name="StudentProfile" component={StudentProfileScreen} />
    <Stack.Screen name="StudentAttendanceHistoryScreen" component={StudentAttendanceHistoryScreen} />
    <Stack.Screen name="StudentAcademicHistoryScreen" component={StudentAcademicHistoryScreen} />
    <Stack.Screen name="StudentNotesScreen" component={StudentNotesScreen} />
  </Stack.Navigator>
);

const CommunicationStack = () => (
  <Stack.Navigator screenOptions={{ headerShown: false }}>
    <Stack.Screen name="ChatList" component={ChatListScreen} />
    <Stack.Screen name="ChatRoomScreen" component={ChatRoomScreen} />
  </Stack.Navigator>
);

const AuthStack = () => (
  <Stack.Navigator screenOptions={{ headerShown: false }}>
    <Stack.Screen name="Login" component={LoginScreen} />
  </Stack.Navigator>
);

const MainTabs = () => {
  const insets = useSafeAreaInsets();
  
  return (
    <Tab.Navigator
      screenOptions={({ route }) => {
        let activeColor = colors.primary;
        if (route.name === 'Home') activeColor = colors.primary;
        else if (route.name === 'Attend') activeColor = colors.success;
        else if (route.name === 'Complaint') activeColor = colors.warning;
        else if (route.name === 'Work') activeColor = colors.secondary;
        else if (route.name === 'Profile') activeColor = colors.purple;

        return {
          tabBarIcon: ({ focused, color, size }) => {
            let iconName;
            let iconColor = color;

            if (route.name === 'Home') {
              iconName = 'grid';
              iconColor = focused ? activeColor : colors.textMuted;
            } else if (route.name === 'Attend') {
              iconName = 'check-square';
              iconColor = focused ? activeColor : colors.textMuted;
            } else if (route.name === 'Complaint') {
              iconName = 'alert-triangle';
              iconColor = focused ? activeColor : colors.textMuted;
            } else if (route.name === 'Work') {
              iconName = 'book-open';
              iconColor = focused ? activeColor : colors.textMuted;
            } else if (route.name === 'Profile') {
              iconName = 'user';
              iconColor = focused ? activeColor : colors.textMuted;
            }

            return <Icon name={iconName} size={size} color={iconColor} />;
          },
          tabBarActiveTintColor: activeColor,
          tabBarInactiveTintColor: colors.textMuted,
          tabBarStyle: {
            backgroundColor: colors.surface,
            borderTopWidth: 0,
            elevation: 20,
            shadowColor: '#000',
            shadowOffset: { width: 0, height: -4 },
            shadowOpacity: 0.05,
            shadowRadius: 10,
            height: Platform.OS === 'ios' ? 65 + insets.bottom : 65,
            paddingBottom: Platform.OS === 'ios' ? insets.bottom : 10,
            paddingTop: 10,
          },
          tabBarLabelStyle: {
            fontWeight: '600',
            fontSize: 11,
            marginTop: -5,
          },
          headerShown: false,
        };
      }}
    >
      <Tab.Screen name="Home" component={DashboardStack} />
      <Tab.Screen name="Attend" component={AttendanceStack} />
      <Tab.Screen name="Complaint" component={CommunicationStack} />
      <Tab.Screen name="Work" component={GradingStack} />
      <Tab.Screen name="Profile" component={ProfileScreen} />
    </Tab.Navigator>
  );
};

const RootNavigator = () => {
  const isAuthenticated = useSelector((state) => state.auth.isAuthenticated);

  return (
    <NavigationContainer ref={navigationRef}>
      {!isAuthenticated ? (
        <AuthStack />
      ) : (
        <MainTabs />
      )}
    </NavigationContainer>
  );
};

export default RootNavigator;

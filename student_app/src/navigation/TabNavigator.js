import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import Icon from 'react-native-vector-icons/Feather';
import { colors } from '../theme/colors';

// Screens
import DashboardScreen from '../features/dashboard/DashboardScreen';
import TimetableScreen from '../features/timetable/TimetableScreen';
import ResultScreen from '../features/academics/ResultScreen';
import ProfileScreen from '../features/profile/ProfileScreen';
import RewardsScreen from '../features/rewards/RewardsScreen';
import CommunicationScreen from '../features/communication/CommunicationScreen';
import AttendanceScreen from '../features/attendance/AttendanceScreen';
import AcademicCalendarScreen from '../features/academics/AcademicCalendarScreen';
import FeesScreen from '../features/finance/FeesScreen';
import NotificationsScreen from '../features/notifications/NotificationsScreen';

const Tab = createBottomTabNavigator();

const TabIcon = ({ name, color, focused }) => (
  <View style={[tabStyles.iconWrap, focused && tabStyles.iconWrapActive]}>
    <Icon name={name} size={22} color={color} />
  </View>
);

const tabStyles = StyleSheet.create({
  iconWrap: { padding: 4, borderRadius: 10 },
  iconWrapActive: { backgroundColor: colors.primary + '15' },
});

const iconMap = {
  Home:    'grid',
  Class:   'calendar',
  Result:  'award',
  Profile: 'user',
};

const TabNavigator = () => {
  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        headerShown: false,
        tabBarActiveTintColor: colors.primary,
        tabBarInactiveTintColor: colors.textMuted,
        tabBarLabelStyle: { fontSize: 11, fontWeight: '600', marginBottom: 4 },
        tabBarStyle: {
          backgroundColor: colors.surface,
          borderTopWidth: 1,
          borderTopColor: colors.border,
          elevation: 16,
          shadowColor: '#000',
          shadowOffset: { width: 0, height: -4 },
          shadowOpacity: 0.08,
          shadowRadius: 8,
          paddingBottom: 6,
          paddingTop: 6,
          height: 64,
        },
        tabBarIcon: ({ color, focused }) => (
          <TabIcon name={iconMap[route.name] || 'circle'} color={color} focused={focused} />
        ),
      })}
    >
      <Tab.Screen name="Home"    component={DashboardScreen} />
      <Tab.Screen name="Class"   component={TimetableScreen} />
      <Tab.Screen name="Result"  component={ResultScreen} />
      <Tab.Screen name="Profile" component={ProfileScreen} />
      
      {/* Hidden Tabs (Screens that keep the bottom bar but have no icon in it) */}
      <Tab.Screen name="Rewards" component={RewardsScreen} options={{ tabBarItemStyle: { display: 'none' } }} />
      <Tab.Screen name="Communication" component={CommunicationScreen} options={{ tabBarItemStyle: { display: 'none' } }} />
      <Tab.Screen name="Attendance" component={AttendanceScreen} options={{ tabBarItemStyle: { display: 'none' } }} />
      <Tab.Screen name="AcademicCalendar" component={AcademicCalendarScreen} options={{ tabBarItemStyle: { display: 'none' } }} />
      <Tab.Screen name="Fees" component={FeesScreen} options={{ tabBarItemStyle: { display: 'none' } }} />
      <Tab.Screen name="Notifications" component={NotificationsScreen} options={{ tabBarItemStyle: { display: 'none' } }} />
    </Tab.Navigator>
  );
};

export default TabNavigator;


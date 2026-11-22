import React, { useEffect, useState } from 'react';
import { View, ActivityIndicator, StatusBar, StyleSheet, Text } from 'react-native';
import { NavigationContainer, DefaultTheme } from '@react-navigation/native';
import { createStackNavigator } from '@react-navigation/stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { Feather } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useStore } from './src/store';
import { chatAPI } from './src/services/api';
import { colors, type } from './src/theme';

import ChatScreen from './src/screens/ChatScreen';
import DashboardScreen from './src/screens/DashboardScreen';
import LoginScreen from './src/screens/LoginScreen';
import CompanionSelectScreen from './src/screens/CompanionSelectScreen';

const Stack = createStackNavigator();
const Tab = createBottomTabNavigator();

const TAB_ICONS: Record<string, keyof typeof Feather.glyphMap> = {
  Chat: 'message-circle',
  Dashboard: 'bar-chart-2',
};

const navTheme = {
  ...DefaultTheme,
  dark: true,
  colors: {
    ...DefaultTheme.colors,
    background: colors.bg, card: colors.bgElevated, text: colors.text,
    border: colors.border, primary: colors.brand, notification: colors.danger,
  },
};

function MainTabs() {
  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        headerShown: false,
        tabBarStyle: {
          backgroundColor: colors.bgElevated, borderTopColor: colors.border, borderTopWidth: 1,
          paddingTop: 6,
        },
        tabBarActiveTintColor: colors.brand,
        tabBarInactiveTintColor: colors.textSubtle,
        tabBarLabelStyle: { fontSize: 12, fontWeight: '600', marginBottom: 4 },
        tabBarIcon: ({ color, size }) => <Feather name={TAB_ICONS[route.name]} size={size - 2} color={color} />,
      })}
    >
      <Tab.Screen name="Chat" component={ChatScreen} />
      <Tab.Screen name="Dashboard" component={DashboardScreen} options={{ tabBarLabel: 'Insights' }} />
    </Tab.Navigator>
  );
}

function Splash() {
  return (
    <View style={styles.splash}>
      <View style={styles.logo}>
        <Feather name="feather" size={28} color={colors.brand} />
      </View>
      <Text style={type.title}>MindEase</Text>
      <ActivityIndicator color={colors.textSubtle} style={{ marginTop: 16 }} />
    </View>
  );
}

export default function App() {
  const { userId, setAuth, setSession } = useStore();
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      try {
        const result = await AsyncStorage.multiGet(['token', 'userId', 'username', 'companionId']);
        const [token, storedUserId, username, companionId] = result.map(r => r[1]);
        if (token && storedUserId && username) {
          await setAuth(parseInt(storedUserId, 10), username, token, companionId || 'maya');
          // A session is also created lazily on first message, so a server outage here isn't fatal.
          try {
            const sessionRes = await chatAPI.startSession(parseInt(storedUserId, 10));
            setSession(sessionRes.data.session_id);
          } catch {}
        }
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  return (
    <SafeAreaProvider>
      <StatusBar barStyle="light-content" backgroundColor={colors.bgElevated} />
      {loading ? (
        <Splash />
      ) : (
        <NavigationContainer theme={navTheme}>
          <Stack.Navigator screenOptions={{ headerShown: false, cardStyle: { backgroundColor: colors.bg } }}>
            {userId ? (
              <>
                <Stack.Screen name="Main" component={MainTabs} />
                <Stack.Screen name="CompanionSelect" component={CompanionSelectScreen} />
              </>
            ) : (
              <Stack.Screen name="Login" component={LoginScreen} />
            )}
          </Stack.Navigator>
        </NavigationContainer>
      )}
    </SafeAreaProvider>
  );
}

const styles = StyleSheet.create({
  splash: { flex: 1, backgroundColor: colors.bg, alignItems: 'center', justifyContent: 'center', gap: 12 },
  logo: {
    width: 64, height: 64, borderRadius: 20, backgroundColor: colors.brandSoft,
    alignItems: 'center', justifyContent: 'center',
  },
});

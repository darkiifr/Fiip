import React, { useEffect } from 'react';
import { Platform, View, StyleSheet } from 'react-native';
import { NavigationContainer } from '@react-navigation/native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { PaperProvider, MD3LightTheme } from 'react-native-paper';
// @ts-ignore
import { LiquidGlassView } from '@callstack/liquid-glass';
// @ts-ignore
import { SFSymbol } from 'react-native-sfsymbols';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import { I18nextProvider } from 'react-i18next';

import i18n from './src/i18n';
import HomeScreen from './src/screens/HomeScreen';
import SettingsScreen from './src/screens/SettingsScreen';
import { checkForUpdatesAndInstall } from './src/services/updater';

const Tab = createBottomTabNavigator();

function TabNavigator() {
  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        tabBarIcon: ({ focused, color, size }) => {
          if (Platform.OS === 'ios') {
            let symbol = '';
            if (route.name === 'Home') symbol = 'house.fill';
            else if (route.name === 'Settings') symbol = 'gearshape.fill';
            
            return (
              <SFSymbol
                name={symbol}
                weight={focused ? "bold" : "regular"}
                color={color}
                size={size + 4}
                style={{ width: size + 4, height: size + 4 }}
              />
            );
          } else {
            let iconName = '';
            if (route.name === 'Home') iconName = 'home';
            else if (route.name === 'Settings') iconName = 'cog';
            
            return <Icon name={iconName} size={size} color={color} />;
          }
        },
        tabBarActiveTintColor: Platform.OS === 'ios' ? '#007AFF' : '#6750A4',
        tabBarInactiveTintColor: 'gray',
        headerShown: false,
        tabBarStyle: Platform.OS === 'ios' ? { backgroundColor: 'transparent', borderTopWidth: 0, elevation: 0 } : {},
      })}
    >
      <Tab.Screen name="Home" component={HomeScreen} />
      <Tab.Screen name="Settings" component={SettingsScreen} />
    </Tab.Navigator>
  );
}

function App() {
  useEffect(() => {
    // Check OTA updates on launch via GitHub Releases (react-native-auto-updater proxy behavior)
    checkForUpdatesAndInstall().catch(console.error);
  }, []);

  if (Platform.OS === 'ios') {
    return (
      <I18nextProvider i18n={i18n}>
        <View style={styles.container}>
          <LiquidGlassView style={StyleSheet.absoluteFill} />
          <NavigationContainer>
            <TabNavigator />
          </NavigationContainer>
        </View>
      </I18nextProvider>
    );
  }

  return (
    <I18nextProvider i18n={i18n}>
      <PaperProvider theme={MD3LightTheme}>
        <NavigationContainer>
          <TabNavigator />
        </NavigationContainer>
      </PaperProvider>
    </I18nextProvider>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
});

export default App;

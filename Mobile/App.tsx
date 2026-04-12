import React, { useEffect, useState } from 'react';
import { Platform, View, StyleSheet, useColorScheme, Text, ActivityIndicator } from 'react-native';
import { NavigationContainer, DefaultTheme, DarkTheme } from '@react-navigation/native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { PaperProvider, MD3LightTheme, MD3DarkTheme } from 'react-native-paper';
// @ts-ignore
import { LiquidGlassView } from '@callstack/liquid-glass';
// @ts-ignore
import { SFSymbol } from 'react-native-sfsymbols';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import { I18nextProvider } from 'react-i18next';

import i18n from './src/i18n';
import HomeScreen from './src/screens/HomeScreen';
import SettingsScreen from './src/screens/SettingsScreen';
import FavoritesScreen from './src/screens/FavoritesScreen';
import { AiChatScreen } from './src/screens/AiChatScreen';
import { NoteEditorScreen } from './src/screens/NoteEditorScreen';
import { PdfViewerScreen } from './src/screens/PdfViewerScreen';
import { AuthScreen } from './src/screens/AuthScreen';
import SubscriptionScreen from './src/screens/SubscriptionScreen';
import { checkForUpdatesAndInstall } from './src/services/updater';
import { useSettingsStore } from './src/store/settingsStore';
import { authenticateBiometric } from './src/services/biometrics';
import { triggerHaptic } from './src/utils/hapticEngine';
import { useAppTheme } from './src/hooks/useAppTheme';

import { FloatingTabBar } from './src/components/FloatingTabBar';

const Tab = createBottomTabNavigator();
const Stack = createNativeStackNavigator();

function TabNavigator() {
  const { colors, isDark } = useAppTheme();
  
  return (
    <Tab.Navigator
      tabBar={props => <FloatingTabBar {...props} />}
      screenOptions={({ route }) => ({
        tabBarShowLabel: false,
        headerShown: false,
      })}
    >
      <Tab.Screen name="Home" component={HomeScreen} />
      <Tab.Screen name="Favorites" component={FavoritesScreen} options={{ title: 'Favoris' }} />
      <Tab.Screen name="Settings" component={SettingsScreen} />
    </Tab.Navigator>
  );
}

function App() {
  const { globalLockEnabled, themeMode, lang } = useSettingsStore();
  const [appUnlocked, setAppUnlocked] = useState(!globalLockEnabled);
  const systemColorScheme = useColorScheme();

  useEffect(() => {
    i18n.changeLanguage(lang);
  }, [lang]);

  useEffect(() => {
    // Check OTA updates on launch via GitHub Releases
    checkForUpdatesAndInstall().catch(console.error);
    
    // Check Global Biometric Lock
    if (globalLockEnabled) {
       authenticateBiometric("Déverrouiller l'accès à Fiip Intelligence").then((success) => {
          if (success) setAppUnlocked(true);
       });
    } else {
       setAppUnlocked(true);
    }
  }, [globalLockEnabled]);

  if (!appUnlocked) {
    // Render a nice secure intro screen if locked or during auth
    return (
      <View style={[styles.container, { backgroundColor: '#0A0A0A', justifyContent: 'center', alignItems: 'center' }]}>
        <LiquidGlassView style={StyleSheet.absoluteFill} />
        <View style={{ padding: 40, alignItems: 'center', backgroundColor: 'rgba(20,20,30,0.6)', borderRadius: 24, borderWidth: 1, borderColor: 'rgba(255,255,255,0.1)' }}>
          <Icon name="brain" size={64} color="#007AFF" style={{ marginBottom: 16 }} />
          <Text style={{ fontSize: 32, fontWeight: 'bold', color: '#FFFFFF', marginBottom: 8, letterSpacing: 1 }}>Fiip Intelligence</Text>
          <Text style={{ fontSize: 14, color: 'rgba(255,255,255,0.7)', marginBottom: 32, fontStyle: 'italic' }}>Développé par Vincent S.</Text>
          <ActivityIndicator size="large" color="#007AFF" />
        </View>
      </View>
    );
  }

  // Determine active theme
  const isDark = themeMode === 'dark' || (themeMode === 'system' && systemColorScheme === 'dark');
  const paperTheme = isDark ? MD3DarkTheme : MD3LightTheme;

  if (Platform.OS === 'ios') {
    return (
      <I18nextProvider i18n={i18n}>
        <View style={[styles.container, { backgroundColor: isDark ? '#000' : '#F3F4F6' }]}>
          <LiquidGlassView style={StyleSheet.absoluteFill} />
          <NavigationContainer theme={isDark ? DarkTheme : DefaultTheme}>
            <Stack.Navigator screenOptions={{ headerShown: false }}>
              <Stack.Screen name="MainTabs" component={TabNavigator} />
              <Stack.Screen name="NoteEditor" component={NoteEditorScreen} options={{ presentation: 'modal' }} />
              <Stack.Screen name="AiChat" component={AiChatScreen} options={{ presentation: 'modal' }} />
              <Stack.Screen name="PdfViewer" component={PdfViewerScreen} options={{ presentation: 'modal' }} />
              <Stack.Screen name="SubscriptionScreen" component={SubscriptionScreen} options={{ presentation: 'modal' }} />
              <Stack.Screen name="Auth" component={AuthScreen} options={{ presentation: 'fullScreenModal' }} />
            </Stack.Navigator>
          </NavigationContainer>
        </View>
      </I18nextProvider>
    );
  }

  return (
    <I18nextProvider i18n={i18n}>
      <PaperProvider theme={paperTheme}>
        <NavigationContainer theme={isDark ? DarkTheme : DefaultTheme}>
          <Stack.Navigator screenOptions={{ headerShown: false }}>
            <Stack.Screen name="MainTabs" component={TabNavigator} />
            <Stack.Screen name="NoteEditor" component={NoteEditorScreen} />
            <Stack.Screen name="AiChat" component={AiChatScreen} />
            <Stack.Screen name="PdfViewer" component={PdfViewerScreen} />
            <Stack.Screen name="SubscriptionScreen" component={SubscriptionScreen} />
            <Stack.Screen name="Auth" component={AuthScreen} />
          </Stack.Navigator>
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

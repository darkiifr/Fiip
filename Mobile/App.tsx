import React, { useEffect, useState } from 'react';
import { Platform, View, StyleSheet, Text, ActivityIndicator } from 'react-native';
import { NavigationContainer, DefaultTheme, DarkTheme } from '@react-navigation/native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
// @ts-ignore
import { LiquidGlassView } from '@callstack/liquid-glass';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import { I18nextProvider } from 'react-i18next';
import { MD3DarkTheme, MD3LightTheme, PaperProvider } from 'react-native-paper';

import i18n from './src/i18n';
import HomeScreen from './src/screens/HomeScreen';
import SettingsScreen from './src/screens/SettingsScreen';
import FavoritesScreen from './src/screens/FavoritesScreen';
import { AiChatScreen } from './src/screens/AiChatScreen';
import { NoteEditorScreen } from './src/screens/NoteEditorScreen';
import { PdfViewerScreen } from './src/screens/PdfViewerScreen';
import { SupabaseAuthScreen } from './src/screens/SupabaseAuthScreen';
import SubscriptionScreen from './src/screens/SubscriptionScreen';
import { checkForUpdatesAndInstall } from './src/services/updater';
import { useSettingsStore } from './src/store/settingsStore';
import { authenticateBiometric } from './src/services/biometrics';
import { keyAuthService } from './src/services/keyauth';
import { authService, dataService } from './src/services/supabase';
import { installGoogleAuthLifecycle } from './src/services/googleAuth';
import { useNotesStore } from './src/store/notesStore';
import { getFiipTheme } from './src/theme/fiipDesign';

import { FloatingTabBar } from './src/components/FloatingTabBar';
import { ZeroKnowledgeGate } from './src/components/ZeroKnowledgeGate';
import { ClerkSupabaseProvider } from './src/providers/ClerkSupabaseProvider';
import { FeatureFlagProvider } from './src/providers/FeatureFlagProvider';

const Tab = createBottomTabNavigator();
const Stack = createNativeStackNavigator();

const renderFloatingTabBar = (props: React.ComponentProps<typeof FloatingTabBar>) => <FloatingTabBar {...props} />;

const tabScreenOptions = {
  tabBarShowLabel: false,
  headerShown: false,
};

function PlatformDesignProvider({ children, isDark }: { children: React.ReactNode; isDark: boolean }) {
  if (Platform.OS !== 'android') {
    return <>{children}</>;
  }

  const fiipTheme = getFiipTheme(isDark, 'android');
  const baseTheme = isDark ? MD3DarkTheme : MD3LightTheme;
  const paperTheme = {
    ...baseTheme,
    colors: {
      ...baseTheme.colors,
      background: fiipTheme.background,
      error: fiipTheme.danger,
      onBackground: fiipTheme.text,
      onPrimary: fiipTheme.onPrimary,
      onPrimaryContainer: fiipTheme.onPrimaryContainer,
      onSurface: fiipTheme.text,
      onSurfaceVariant: fiipTheme.textSecondary,
      outline: fiipTheme.outline,
      outlineVariant: fiipTheme.outlineVariant,
      primary: fiipTheme.primary,
      primaryContainer: fiipTheme.primaryContainer,
      secondaryContainer: fiipTheme.secondaryContainer,
      surface: fiipTheme.surface,
      surfaceDisabled: fiipTheme.surfaceContainerLow,
      surfaceVariant: fiipTheme.surfaceContainerHigh,
    },
    roundness: 4,
  };

  return <PaperProvider theme={paperTheme}>{children}</PaperProvider>;
}

function TabNavigator() {
  return (
    <Tab.Navigator
      tabBar={renderFloatingTabBar}
      screenOptions={tabScreenOptions}
    >
      <Tab.Screen name="Home" component={HomeScreen} options={{ title: 'Accueil' }} />
      <Tab.Screen name="Search" component={FavoritesScreen} options={{ title: 'Recherche' }} />
      <Tab.Screen name="New" component={View} options={{ title: 'Nouveau' }} />
      <Tab.Screen name="Assistant" component={AiChatScreen} options={{ title: 'Assistant' }} />
      <Tab.Screen name="Settings" component={SettingsScreen} options={{ title: 'Réglages' }} />
    </Tab.Navigator>
  );
}

function App() {
  const { globalLockEnabled, lang } = useSettingsStore();
  const [appUnlocked, setAppUnlocked] = useState(!globalLockEnabled);

  useEffect(() => installGoogleAuthLifecycle(async () => {
    await dataService.fetchProfile().catch(() => null);
    await useNotesStore.getState().syncWithCloud().catch(() => null);
  }), []);

  useEffect(() => {
    i18n.changeLanguage(lang);
  }, [lang]);

  useEffect(() => {
    // Check OTA updates on launch via GitHub Releases
    checkForUpdatesAndInstall().catch(console.error);
    
    // Init and validate KeyAuth license
    keyAuthService.init().then(async response => {
      console.log('KeyAuth Status:', response?.message);
      const user = await authService.getUser();
      if (user) {
        const level = await authService.getPlanLevel(user);
        const username = user.user_metadata?.username || user.user_metadata?.nickname || user.email;
        keyAuthService.setLocalLevel(level, username, user.user_metadata?.license_key || null);
      }
    }).catch(console.error);
    
    // Check Global Biometric Lock
    if (globalLockEnabled) {
       authenticateBiometric("Déverrouiller l'accès à Fiip").then((success) => {
          if (success) setAppUnlocked(true);
       });
    } else {
       Promise.resolve().then(() => setAppUnlocked(true));
    }
  }, [globalLockEnabled]);

  if (!appUnlocked) {
    // Render a nice secure intro screen if locked or during auth
    return (
      <View style={[styles.container, { backgroundColor: '#0A0A0A', justifyContent: 'center', alignItems: 'center' }]}>
        <LiquidGlassView style={StyleSheet.absoluteFill} />
        <View style={{ padding: 40, alignItems: 'center', backgroundColor: 'rgba(20,20,30,0.6)', borderRadius: 24, borderWidth: 1, borderColor: 'rgba(255,255,255,0.1)' }}>
          <Icon name="brain" size={64} color="#007AFF" style={{ marginBottom: 16 }} />
          <Text style={{ fontSize: 32, fontWeight: 'bold', color: '#FFFFFF', marginBottom: 8, letterSpacing: 1 }}>Fiip</Text>
          <Text style={{ fontSize: 14, color: 'rgba(255,255,255,0.7)', marginBottom: 32, fontStyle: 'italic' }}>Développé par Vincent S.</Text>
          <ActivityIndicator size="large" color="#007AFF" />
        </View>
      </View>
    );
  }

  // Determine active theme
  const isDark = true;
  const appTheme = getFiipTheme(isDark, Platform.OS);
  return (
    <ClerkSupabaseProvider>
      <FeatureFlagProvider>
        <ZeroKnowledgeGate>
          <I18nextProvider i18n={i18n}>
            <PlatformDesignProvider isDark={isDark}>
              <View style={[styles.container, { backgroundColor: appTheme.background }]}>
                {Platform.OS === 'ios' ? <LiquidGlassView style={StyleSheet.absoluteFill} effect="clear" /> : null}
                <NavigationContainer theme={isDark ? DarkTheme : DefaultTheme}>
                  <Stack.Navigator screenOptions={{ headerShown: false }}>
                    <Stack.Screen name="MainTabs" component={TabNavigator} />
                    <Stack.Screen name="NoteEditor" component={NoteEditorScreen} options={{ presentation: Platform.OS === 'ios' ? 'modal' : 'card' }} />
                    <Stack.Screen name="AiChat" component={AiChatScreen} options={{ presentation: Platform.OS === 'ios' ? 'modal' : 'card' }} />
                    <Stack.Screen name="PdfViewer" component={PdfViewerScreen} options={{ presentation: Platform.OS === 'ios' ? 'modal' : 'card' }} />
                    <Stack.Screen name="SubscriptionScreen" component={SubscriptionScreen} options={{ presentation: Platform.OS === 'ios' ? 'modal' : 'card' }} />
                    <Stack.Screen name="Auth" component={SupabaseAuthScreen} options={{ presentation: Platform.OS === 'ios' ? 'fullScreenModal' : 'card' }} />
                  </Stack.Navigator>
                </NavigationContainer>
              </View>
            </PlatformDesignProvider>
          </I18nextProvider>
        </ZeroKnowledgeGate>
      </FeatureFlagProvider>
    </ClerkSupabaseProvider>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
});

export default App;

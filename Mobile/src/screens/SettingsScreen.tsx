import React, { useState } from 'react';
import { View, Text, StyleSheet, Platform, TouchableOpacity, ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useSettingsStore, ThemeMode } from '../store/settingsStore';
import { triggerHaptic } from '../utils/hapticEngine';
import { useTranslation } from 'react-i18next';
import { Switch as PaperSwitch, Button } from 'react-native-paper';
import { Switch as IosSwitch } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { GlassCard } from '../components/ui/GlassCard';
import { Icon } from '../components/ui/Icon';
import { checkForUpdatesAndInstall } from '../services/updater';
import { AuthScreen } from './AuthScreen';
import { SupabaseAuthScreen } from './SupabaseAuthScreen';
import { CloudConfigView } from '../components/CloudConfigView';
import { useAppTheme } from '../hooks/useAppTheme';

export default function SettingsScreen() {
  const navigation = useNavigation<any>();
  const { colors, isDark } = useAppTheme();
  const { 
    hapticsEnabled, setHapticsEnabled,
    syncEnabled, setSyncEnabled,
    themeMode, setThemeMode,
    globalLockEnabled, setGlobalLockEnabled,
    lang, setLang,
    subscriptionPlan
  } = useSettingsStore();
  
  const { t, i18n } = useTranslation();
  const isIOS = Platform.OS === 'ios';

  const [authVisible, setAuthVisible] = useState(false);
  const [supaAuthVisible, setSupaAuthVisible] = useState(false);

  const handleToggle = (value: boolean) => {
    setHapticsEnabled(value);
    if (value) triggerHaptic('selection');
  };

  const handleSyncToggle = (value: boolean) => {
    setSyncEnabled(value);
    if (value) triggerHaptic('impactLight');
  };

  const handleThemeCycle = () => {
    triggerHaptic('impactLight');
    if (themeMode === 'system') setThemeMode('light');
    else if (themeMode === 'light') setThemeMode('dark');
    else setThemeMode('system');
  };

  const getThemeLabel = (mode: ThemeMode) => {
    switch (mode) {
      case 'light': return 'Clair';
      case 'dark': return 'Sombre';
      default: return 'Système';
    }
  };

  const handleFaceIdToggle = (value: boolean) => {
    setGlobalLockEnabled(value);
    triggerHaptic('selection');
  };

  const handleChangeLanguage = () => {
    triggerHaptic('selection');
    setLang(lang === 'fr' ? 'en' : 'fr');
  };

  const handleCheckUpdates = () => {
    triggerHaptic('impactLight');
    checkForUpdatesAndInstall();
  };

  const handleAuthModal = () => {
    triggerHaptic('selection');
    setAuthVisible(true);
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: isIOS ? colors.background : '#F3F4F6' }]} edges={['top', 'left', 'right']}>
      <ScrollView contentContainerStyle={[styles.scrollContent, { paddingBottom: 120 }]} showsVerticalScrollIndicator={false}>
        <View style={styles.header}>
          <Text style={isIOS ? [styles.titleIOS, { color: colors.text }] : [styles.titleAndroid, { color: colors.text }]}>Paramètres</Text>
        </View>

        <CloudConfigView />
        
        <View style={[styles.card, { backgroundColor: colors.card }]}>
          {/* Synchronisation Cloud */}
          <View style={styles.settingRow}>
            <View style={styles.settingLeft}>
              <Icon sfSymbol="cloud.fill" mdIcon="cloud-sync" size={24} color={isIOS ? colors.primary : '#0B57D0'} />
              <Text style={isIOS ? [styles.textIOS, { color: colors.text }] : [styles.textAndroid, { color: colors.text }]}>Synchronisation Supabase</Text>
            </View>
            {isIOS ? (
              <IosSwitch value={syncEnabled} onValueChange={handleSyncToggle} />
            ) : (
              <PaperSwitch value={syncEnabled} onValueChange={handleSyncToggle} />
            )}
          </View>
          <View style={[styles.divider, { backgroundColor: colors.border }]} />

        {/* Supabase login */}
          <View style={styles.settingRow}>
             <View style={styles.settingLeft}>
               <Icon sfSymbol="person.crop.circle.fill" mdIcon="account" size={24} color={isIOS ? colors.primary : '#0B57D0'} />
               <Text style={isIOS ? [styles.textIOS, { color: colors.text }] : [styles.textAndroid, { color: colors.text }]}>Compte Supabase / Cloud</Text>
             </View>
             {isIOS ? (
               <TouchableOpacity onPress={() => { triggerHaptic('selection'); setSupaAuthVisible(true); }}>
                 <Text style={[styles.linkIOS, { color: colors.primary }]}>Connexion</Text>
               </TouchableOpacity>
             ) : (
               <Button mode="text" onPress={() => { triggerHaptic('selection'); setSupaAuthVisible(true); }}>Connexion</Button>
             )}
          </View>
          <View style={[styles.divider, { backgroundColor: colors.border }]} />

          {/* Theme Mode */}
          <View style={styles.settingRow}>
            <View style={styles.settingLeft}>
              <Icon sfSymbol="moon.circle.fill" mdIcon="theme-light-dark" size={24} color={isIOS ? '#5856D6' : '#6750A4'} />
              <Text style={isIOS ? [styles.textIOS, { color: colors.text }] : [styles.textAndroid, { color: colors.text }]}>Apparence</Text>
            </View>
            <TouchableOpacity onPress={handleThemeCycle}>
               {isIOS ? (
                 <Text style={[styles.linkIOS, { color: colors.textSecondary }]}>{getThemeLabel(themeMode)}</Text>
               ) : (
                 <Button mode="text" onPress={handleThemeCycle}>{getThemeLabel(themeMode)}</Button>
               )}
            </TouchableOpacity>
          </View>
          <View style={[styles.divider, { backgroundColor: colors.border }]} />

          {/* Retours Haptiques */}
          <View style={styles.settingRow}>
            <View style={styles.settingLeft}>
              <Icon sfSymbol="hand.tap.fill" mdIcon="vibrate" size={24} color={isIOS ? colors.warning : '#FFBA28'} />
              <Text style={isIOS ? [styles.textIOS, { color: colors.text }] : [styles.textAndroid, { color: colors.text }]}>Retours Tactiles (Vibrations)</Text>
            </View>
            {isIOS ? (
              <IosSwitch value={hapticsEnabled} onValueChange={handleToggle} />
            ) : (
              <PaperSwitch value={hapticsEnabled} onValueChange={handleToggle} />
            )}
          </View>
          <View style={styles.divider} />

          {/* Verrouillage Biométrique (Global) */}
          <View style={styles.settingRow}>
            <View style={styles.settingLeft}>
              <Icon sfSymbol="faceid" mdIcon="face-recognition" size={24} color={isIOS ? colors.success : '#386A20'} />
              <Text style={isIOS ? [styles.textIOS, { color: colors.text }] : [styles.textAndroid, { color: colors.text }]}>Verrouillage global de l'App</Text>
            </View>
            {isIOS ? (
              <IosSwitch value={globalLockEnabled} onValueChange={handleFaceIdToggle} />
            ) : (
              <PaperSwitch value={globalLockEnabled} onValueChange={handleFaceIdToggle} />
            )}
          </View>
        </View>

        <View style={[styles.card, { backgroundColor: colors.card }]}>
          {/* Langue */}
          <View style={styles.settingRow}>
             <View style={styles.settingLeft}>
               <Icon sfSymbol="globe" mdIcon="translate" size={24} color={isIOS ? colors.primary : '#0B57D0'} />
               <Text style={isIOS ? [styles.textIOS, { color: colors.text }] : [styles.textAndroid, { color: colors.text }]}>Langue de l'app</Text>
             </View>
             {isIOS ? (
               <TouchableOpacity onPress={handleChangeLanguage}>
                 <Text style={[styles.linkIOS, { color: colors.textSecondary }]}>{lang === 'fr' ? 'Français' : 'English'}</Text>
               </TouchableOpacity>
             ) : (
               <Button mode="text" onPress={handleChangeLanguage}>{lang === 'fr' ? 'Français' : 'English'}</Button>
             )}
          </View>
          <View style={[styles.divider, { backgroundColor: colors.border }]} />

          {/* Mise à jour */}
          <View style={styles.settingRow}>
             <View style={styles.settingLeft}>
               <Icon sfSymbol="arrow.triangle.2.circlepath.circle.fill" mdIcon="update" size={24} color={isIOS ? colors.success : '#386A20'} />
               <Text style={isIOS ? [styles.textIOS, { color: colors.text }] : [styles.textAndroid, { color: colors.text }]}>Vérifier les mises à jour (OTA)</Text>
             </View>
             {isIOS ? (
               <TouchableOpacity onPress={handleCheckUpdates}>
                 <Text style={[styles.linkIOS, { color: colors.primary }]}>Vérifier</Text>
               </TouchableOpacity>
             ) : (
               <Button mode="text" onPress={handleCheckUpdates}>Vérifier</Button>
             )}
          </View>
          <View style={[styles.divider, { backgroundColor: colors.border }]} />

          {/* KeyAuth / License */}
          <View style={styles.settingRow}>
             <View style={styles.settingLeft}>
               <Icon sfSymbol="key.fill" mdIcon="key" size={24} color={isIOS ? colors.danger : '#B3261E'} />
               <Text style={isIOS ? [styles.textIOS, { color: colors.text }] : [styles.textAndroid, { color: colors.text }]}>
                 Licence Fiip: {subscriptionPlan === 'free' ? 'Gratuit' : subscriptionPlan === 'pro' ? 'Pro' : 'Premium'}
               </Text>
             </View>
             {isIOS ? (
               <TouchableOpacity onPress={handleAuthModal}>
                 <Text style={[styles.linkIOS, { color: colors.primary }]}>Gérer</Text>
               </TouchableOpacity>
             ) : (
               <Button mode="text" onPress={handleAuthModal}>Gérer</Button>
             )}
          </View>
          
          <View style={[styles.divider, { backgroundColor: colors.border }]} />

          {/* Cloud Storage Usage */}
          <View style={styles.settingRow}>
             <CloudConfigView />
          </View>
        </View>
        
        <View style={{ alignItems: 'center', marginVertical: 32, opacity: 0.5 }}>
          <Text style={{ color: colors.textSecondary, fontSize: 13, fontWeight: '500' }}>Fiip Intelligence</Text>
          <Text style={{ color: colors.textSecondary, fontSize: 13, marginTop: 4 }}>Version {require('../../package.json').version}</Text>
        </View>
      </ScrollView>

      {/* Embedded Auth Modal */}
      <AuthScreen visible={authVisible} onClose={() => setAuthVisible(false)} />
      <SupabaseAuthScreen visible={supaAuthVisible} onClose={() => setSupaAuthVisible(false)} />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: 40,
  },
  header: {
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 24,
  },
  titleIOS: {
    fontSize: 34,
    fontWeight: 'bold',
    fontFamily: 'System',
  },
  titleAndroid: {
    fontSize: 28,
    fontWeight: '600',
    color: '#1C1B1F',
  },
  card: {
    marginHorizontal: 16,
    marginBottom: 24,
    borderRadius: 20,
    paddingVertical: 8,
    overflow: 'hidden',
  },
  settingRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 16,
  },
  settingLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  textIOS: {
    fontSize: 17,
    fontFamily: 'System',
    color: '#000',
  },
  textAndroid: {
    fontSize: 16,
    fontWeight: '500',
    color: '#1C1B1F',
  },
  divider: {
    height: 1,
    backgroundColor: 'rgba(0,0,0,0.05)',
    marginHorizontal: 16,
  },
  linkIOS: {
    color: '#007AFF',
    fontSize: 17,
    fontFamily: 'System',
  },
  statusText: {
    fontSize: 16,
    color: '#8E8E93',
  }
});

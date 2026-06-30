import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, Switch, Platform, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';

import { GlassCard } from '../components/ui/GlassCard';
import { Icon } from '../components/ui/Icon';
import { useAppTheme } from '../hooks/useAppTheme';
import { useSettingsStore, FontSizeMode, ThemeMode } from '../store/settingsStore';
import { fiipRadius } from '../theme/fiipDesign';
import { triggerHaptic } from '../utils/hapticEngine';
import { authService } from '../services/supabase';

export default function SettingsScreen() {
  const navigation = useNavigation<any>();
  const { colors } = useAppTheme();
  const isIOS = Platform.OS === 'ios';
  const {
    themeMode,
    setThemeMode,
    fontSize,
    setFontSize,
    autoSave,
    setAutoSave,
    showWordCount,
    setShowWordCount,
    showReadingTime,
    setShowReadingTime,
    syncEnabled,
    setSyncEnabled,
    globalLockEnabled,
    setGlobalLockEnabled,
  } = useSettingsStore();

  const setTheme = (mode: ThemeMode) => {
    triggerHaptic('selection');
    setThemeMode(mode);
  };

  const setSize = (size: FontSizeMode) => {
    triggerHaptic('selection');
    setFontSize(size);
  };

  const handleRequestAccountDeletion = () => {
    Alert.alert(
      'Supprimer le compte',
      'Fiip va demander la suppression de votre compte cloud et vous déconnecter. Les notes locales restent sur cet appareil tant que vous ne supprimez pas l’app.',
      [
        { text: 'Annuler', style: 'cancel' },
        {
          text: 'Demander la suppression',
          style: 'destructive',
          onPress: async () => {
            triggerHaptic('notificationWarning');
            const { error } = await authService.requestAccountDeletion();
            if (error) {
              Alert.alert('Suppression impossible', error.message || 'Réessayez plus tard.');
              return;
            }
            Alert.alert('Demande envoyée', 'Votre demande de suppression a été enregistrée.');
          },
        },
      ],
    );
  };

  const handleSignOut = async () => {
    await authService.signOut();
    triggerHaptic('selection');
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]} edges={['top', 'left', 'right']}>
      <ScrollView contentContainerStyle={[styles.content, !isIOS && styles.contentAndroid]} showsVerticalScrollIndicator={false}>
        <View style={styles.header}>
          <View>
            <Text style={[styles.kicker, { color: colors.textSecondary }]}>Fiip</Text>
            <Text style={[styles.title, { color: colors.text }]}>Réglages</Text>
          </View>
          <TouchableOpacity accessibilityRole="button" accessibilityLabel="Compte" onPress={() => navigation.navigate('Auth')} style={[isIOS ? styles.accountButton : styles.accountButtonAndroid, {
            backgroundColor: isIOS ? colors.text : colors.primaryContainer,
          }]}>
            <Icon sfSymbol="person" mdIcon="account" size={18} color={isIOS ? colors.background : colors.onPrimaryContainer} />
          </TouchableOpacity>
        </View>

        <Section title="Apparence" colors={colors} isIOS={isIOS}>
          <Segmented
            value={themeMode}
            options={[
              { label: 'Clair', value: 'light' },
              { label: 'Sombre', value: 'dark' },
              { label: 'Auto', value: 'system' },
            ]}
            onChange={setTheme}
            colors={colors}
            isIOS={isIOS}
          />
          <Segmented
            value={fontSize}
            options={[
              { label: 'Petite', value: 'petite' },
              { label: 'Moyenne', value: 'moyenne' },
              { label: 'Grande', value: 'grande' },
            ]}
            onChange={setSize}
            colors={colors}
            isIOS={isIOS}
          />
        </Section>

        <Section title="Éditeur" colors={colors} isIOS={isIOS}>
          <SettingSwitch title="Enregistrement automatique" caption="Sauvegarde locale et synchronisation différée." value={autoSave} onChange={setAutoSave} colors={colors} isIOS={isIOS} />
          <SettingSwitch title="Nombre de mots" caption="Affiche les métriques d’écriture." value={showWordCount} onChange={setShowWordCount} colors={colors} isIOS={isIOS} />
          <SettingSwitch title="Temps de lecture" caption="Calcule une estimation lisible." value={showReadingTime} onChange={setShowReadingTime} colors={colors} isIOS={isIOS} />
        </Section>

        <Section title="Cloud et sécurité" colors={colors} isIOS={isIOS}>
          <SettingSwitch title="Synchronisation cloud" caption="Synchronise vos notes et fichiers avec votre compte cloud." value={syncEnabled} onChange={setSyncEnabled} colors={colors} isIOS={isIOS} />
          <SettingSwitch title="Verrouillage biométrique" caption="Protège l’ouverture de l’application." value={globalLockEnabled} onChange={setGlobalLockEnabled} colors={colors} isIOS={isIOS} />
          <SettingAction title="Se déconnecter" caption="Ferme la session cloud sur cet appareil." onPress={handleSignOut} colors={colors} danger={false} />
          <SettingAction title="Supprimer le compte cloud" caption="Demande la suppression du compte et des données cloud associées." onPress={handleRequestAccountDeletion} colors={colors} danger />
        </Section>
      </ScrollView>
    </SafeAreaView>
  );
}

function Section({ title, colors, children, isIOS }: any) {
  return (
    <View style={styles.section}>
      <Text style={[styles.sectionTitle, { color: colors.textSecondary }]}>{title}</Text>
      <GlassCard intensity={isIOS ? 24 : 0} cornerRadius={isIOS ? fiipRadius.xl : 28} interactive style={styles.sectionCard}>{children}</GlassCard>
    </View>
  );
}

function SettingSwitch({ title, caption, value, onChange, colors, isIOS }: any) {
  return (
    <View style={styles.settingRow}>
      <View style={styles.settingText}>
        <Text style={[styles.settingTitle, { color: colors.text }]}>{title}</Text>
        <Text style={[styles.caption, { color: colors.textSecondary }]}>{caption}</Text>
      </View>
      <Switch
        value={value}
        onValueChange={(next) => { triggerHaptic('selection'); onChange(next); }}
        trackColor={{ false: colors.outlineVariant, true: isIOS ? colors.success : colors.primaryContainer }}
        thumbColor={value ? (isIOS ? '#FFF' : colors.primary) : colors.surfaceContainerHighest}
      />
    </View>
  );
}

function SettingAction({ title, caption, onPress, colors, danger }: any) {
  return (
    <TouchableOpacity accessibilityRole="button" onPress={onPress} style={styles.settingRow}>
      <View style={styles.settingText}>
        <Text style={[styles.settingTitle, { color: danger ? colors.danger : colors.text }]}>{title}</Text>
        <Text style={[styles.caption, { color: colors.textSecondary }]}>{caption}</Text>
      </View>
      <Icon sfSymbol="chevron.right" mdIcon="chevron-right" size={18} color={danger ? colors.danger : colors.textSecondary} />
    </TouchableOpacity>
  );
}

function Segmented({ value, options, onChange, colors, isIOS }: any) {
  return (
    <View style={[styles.segmented, { backgroundColor: isIOS ? colors.border : colors.surfaceContainerHighest }]}>
      {options.map((option: any) => (
        <TouchableOpacity key={option.value} onPress={() => onChange(option.value)} style={[styles.segment, value === option.value && { backgroundColor: isIOS ? colors.backgroundAlt : colors.primaryContainer }]}>
          <Text style={[styles.segmentText, { color: value === option.value ? (isIOS ? colors.text : colors.onPrimaryContainer) : colors.textSecondary }]}>{option.label}</Text>
        </TouchableOpacity>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  content: { paddingHorizontal: 20, paddingTop: 12, paddingBottom: 140 },
  contentAndroid: { paddingHorizontal: 16, paddingTop: 8 },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 20 },
  kicker: { fontSize: 12, fontWeight: '800', textTransform: 'uppercase', letterSpacing: 0.8 },
  title: { marginTop: 4, fontSize: 36, fontWeight: '900' },
  accountButton: { width: 46, height: 46, borderRadius: 23, alignItems: 'center', justifyContent: 'center' },
  accountButtonAndroid: { width: 48, height: 48, borderRadius: 16, alignItems: 'center', justifyContent: 'center', elevation: 2 },
  section: { marginBottom: 18 },
  sectionTitle: { marginLeft: 8, marginBottom: 8, fontSize: 12, fontWeight: '900', textTransform: 'uppercase', letterSpacing: 0.9 },
  sectionCard: { padding: 10, gap: 10 },
  segmented: { flexDirection: 'row', padding: 4, borderRadius: 18, gap: 4 },
  segment: { flex: 1, minHeight: 38, borderRadius: 14, alignItems: 'center', justifyContent: 'center' },
  segmentText: { fontSize: 13, fontWeight: '900' },
  settingRow: { flexDirection: 'row', alignItems: 'center', minHeight: 70, paddingHorizontal: 6, gap: 14 },
  settingText: { flex: 1 },
  settingTitle: { fontSize: 15, fontWeight: '900' },
  caption: { marginTop: 4, fontSize: 13, lineHeight: 19 },
});

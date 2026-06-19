import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, Switch } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';

import { GlassCard } from '../components/ui/GlassCard';
import { Icon } from '../components/ui/Icon';
import { useAppTheme } from '../hooks/useAppTheme';
import { useSettingsStore, FontSizeMode, ThemeMode } from '../store/settingsStore';
import { fiipRadius } from '../theme/fiipDesign';
import { triggerHaptic } from '../utils/hapticEngine';

export default function SettingsScreen() {
  const navigation = useNavigation<any>();
  const { colors } = useAppTheme();
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

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]} edges={['top', 'left', 'right']}>
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <View style={styles.header}>
          <View>
            <Text style={[styles.kicker, { color: colors.textSecondary }]}>Fiip</Text>
            <Text style={[styles.title, { color: colors.text }]}>Réglages</Text>
          </View>
          <TouchableOpacity accessibilityRole="button" accessibilityLabel="Compte" onPress={() => navigation.navigate('Auth')} style={[styles.accountButton, { backgroundColor: colors.text }]}>
            <Icon sfSymbol="person" mdIcon="account" size={18} color={colors.background} />
          </TouchableOpacity>
        </View>

        <Section title="Apparence" colors={colors}>
          <Segmented
            value={themeMode}
            options={[
              { label: 'Clair', value: 'light' },
              { label: 'Sombre', value: 'dark' },
              { label: 'Auto', value: 'system' },
            ]}
            onChange={setTheme}
            colors={colors}
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
          />
        </Section>

        <Section title="Éditeur" colors={colors}>
          <SettingSwitch title="Enregistrement automatique" caption="Sauvegarde locale et synchronisation différée." value={autoSave} onChange={setAutoSave} colors={colors} />
          <SettingSwitch title="Nombre de mots" caption="Affiche les métriques d’écriture." value={showWordCount} onChange={setShowWordCount} colors={colors} />
          <SettingSwitch title="Temps de lecture" caption="Calcule une estimation lisible." value={showReadingTime} onChange={setShowReadingTime} colors={colors} />
        </Section>

        <Section title="Cloud et sécurité" colors={colors}>
          <SettingSwitch title="Synchronisation Supabase" caption="Utilise Auth, base de données et stockage Fiip." value={syncEnabled} onChange={setSyncEnabled} colors={colors} />
          <SettingSwitch title="Verrouillage biométrique" caption="Protège l’ouverture de l’application." value={globalLockEnabled} onChange={setGlobalLockEnabled} colors={colors} />
        </Section>

        <GlassCard intensity={26} cornerRadius={fiipRadius.xl} style={styles.aiPolicy}>
          <View style={styles.aiHeader}>
            <Icon sfSymbol="sparkles" mdIcon="sparkles" size={20} color={colors.primary} />
            <Text style={[styles.aiTitle, { color: colors.text }]}>IA sans clé personnalisée</Text>
          </View>
          <Text style={[styles.caption, { color: colors.textSecondary }]}>
            Dexter utilise uniquement le secret GitHub OpenRouter et le routeur gratuit openrouter/free. Les écrans n’acceptent plus de clé utilisateur ni de modèle payant.
          </Text>
        </GlassCard>
      </ScrollView>
    </SafeAreaView>
  );
}

function Section({ title, colors, children }: any) {
  return (
    <View style={styles.section}>
      <Text style={[styles.sectionTitle, { color: colors.textSecondary }]}>{title}</Text>
      <GlassCard intensity={22} cornerRadius={fiipRadius.xl} style={styles.sectionCard}>{children}</GlassCard>
    </View>
  );
}

function SettingSwitch({ title, caption, value, onChange, colors }: any) {
  return (
    <View style={styles.settingRow}>
      <View style={styles.settingText}>
        <Text style={[styles.settingTitle, { color: colors.text }]}>{title}</Text>
        <Text style={[styles.caption, { color: colors.textSecondary }]}>{caption}</Text>
      </View>
      <Switch value={value} onValueChange={(next) => { triggerHaptic('selection'); onChange(next); }} trackColor={{ false: colors.border, true: colors.accent }} thumbColor="#FFF" />
    </View>
  );
}

function Segmented({ value, options, onChange, colors }: any) {
  return (
    <View style={[styles.segmented, { backgroundColor: colors.border }]}>
      {options.map((option: any) => (
        <TouchableOpacity key={option.value} onPress={() => onChange(option.value)} style={[styles.segment, value === option.value && { backgroundColor: colors.backgroundAlt }]}>
          <Text style={[styles.segmentText, { color: value === option.value ? colors.text : colors.textSecondary }]}>{option.label}</Text>
        </TouchableOpacity>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  content: { paddingHorizontal: 20, paddingTop: 12, paddingBottom: 140 },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 20 },
  kicker: { fontSize: 12, fontWeight: '800', textTransform: 'uppercase', letterSpacing: 0.8 },
  title: { marginTop: 4, fontSize: 36, fontWeight: '900' },
  accountButton: { width: 46, height: 46, borderRadius: 23, alignItems: 'center', justifyContent: 'center' },
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
  aiPolicy: { padding: 18 },
  aiHeader: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  aiTitle: { fontSize: 18, fontWeight: '900' },
});

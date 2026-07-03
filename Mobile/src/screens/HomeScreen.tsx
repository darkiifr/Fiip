import React, { useMemo } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, Platform } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';

import { Icon } from '../components/ui/Icon';
import { GlassCard } from '../components/ui/GlassCard';
import { useAppTheme } from '../hooks/useAppTheme';
import { useNotesStore } from '../store/notesStore';
import { useSettingsStore } from '../store/settingsStore';
import { fiipRadius } from '../theme/fiipDesign';
import { triggerHaptic } from '../utils/hapticEngine';
import { getNoteMetrics } from '../utils/noteMetrics';

export default function HomeScreen() {
  const navigation = useNavigation<any>();
  const { colors, isDark } = useAppTheme();
  const isIOS = Platform.OS === 'ios';
  const notesById = useNotesStore((state) => state.notes);
  const syncEnabled = useSettingsStore((state) => state.syncEnabled);

  const notes = useMemo(
    () => Object.values(notesById)
      .filter((note) => !note.deleted_at)
      .sort((a, b) => new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime()),
    [notesById],
  );

  const stats = useMemo(() => {
    const words = notes.reduce((sum, note) => sum + getNoteMetrics(note.content).wordCount, 0);
    const favorites = notes.filter((note) => note.is_favorite).length;
    return { words, favorites, readingTime: words === 0 ? 0 : Math.ceil(words / 220) };
  }, [notes]);

  const featuredNote = notes[0];
  const recentNotes = notes.slice(0, 5);

  const openNote = (note?: any) => {
    triggerHaptic('selection');
    navigation.navigate('NoteEditor', note ? { noteToEdit: note } : undefined);
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]} edges={['top', 'left', 'right']}>
      <ScrollView contentContainerStyle={[styles.content, !isIOS && styles.contentAndroid]} showsVerticalScrollIndicator={false}>
        <View style={styles.header}>
          <View>
            <Text style={[styles.eyebrow, { color: colors.textSecondary }]}>{isIOS ? 'Fiip' : 'Aujourd’hui'}</Text>
            <Text style={[isIOS ? styles.title : styles.titleAndroid, { color: colors.text }]}>
              {isIOS ? 'Accueil' : 'Vos notes'}
            </Text>
          </View>
          <TouchableOpacity
            accessibilityRole="button"
            accessibilityLabel="Créer une note"
            activeOpacity={0.76}
            onPress={() => openNote()}
            style={[isIOS ? styles.createButton : styles.createButtonAndroid, {
              backgroundColor: isIOS ? colors.text : colors.primaryContainer,
            }]}
          >
            <Icon sfSymbol="plus" mdIcon="plus" size={20} color={isIOS ? colors.background : colors.onPrimaryContainer} />
          </TouchableOpacity>
        </View>

        <GlassCard intensity={isIOS ? 48 : 0} cornerRadius={isIOS ? fiipRadius.xl : 28} interactive style={styles.heroCard}>
          <View style={styles.heroTop}>
            <View>
              <Text style={[styles.cardLabel, { color: colors.textSecondary }]}>Aujourd'hui</Text>
              <Text style={[styles.heroTitle, { color: colors.text }]} numberOfLines={2}>
                {featuredNote?.title || 'Nouvelle note'}
              </Text>
            </View>
            <View style={[styles.syncPill, {
              borderColor: colors.outlineVariant,
              backgroundColor: isIOS ? 'transparent' : colors.surfaceContainerHighest,
            }]}>
              <Icon sfSymbol={syncEnabled ? 'icloud.fill' : 'icloud.slash'} mdIcon={syncEnabled ? 'cloud-check' : 'cloud-off-outline'} size={14} color={syncEnabled ? colors.success : colors.textSecondary} />
              <Text style={[styles.syncText, { color: colors.textSecondary }]}>{syncEnabled ? 'Cloud' : 'Local'}</Text>
            </View>
          </View>
          <Text style={[styles.heroExcerpt, { color: colors.textSecondary }]} numberOfLines={4}>
            {featuredNote ? getNoteMetrics(featuredNote.content).plainText || 'Note vide' : 'Commencez une note, puis laissez Fiip structurer votre pensée.'}
          </Text>
          <View style={styles.metricGrid}>
            <Metric label="Notes" value={String(notes.length)} color={colors} />
            <Metric label="Favoris" value={String(stats.favorites)} color={colors} />
            <Metric label="Lecture" value={`${stats.readingTime} min`} color={colors} />
          </View>
          <TouchableOpacity
            accessibilityRole="button"
            accessibilityLabel="Ouvrir la note sélectionnée"
            activeOpacity={0.82}
            onPress={() => openNote(featuredNote)}
            style={[isIOS ? styles.primaryAction : styles.primaryActionAndroid, {
              backgroundColor: isIOS ? colors.primary : colors.primary,
            }]}
          >
            <Text style={styles.primaryActionText}>Reprendre</Text>
            <Icon sfSymbol="arrow.right" mdIcon="arrow-right" size={16} color="#FFF" />
          </TouchableOpacity>
        </GlassCard>

        <View style={styles.quickActions}>
          <QuickAction title="Assistant" icon="sparkles" mdIcon="sparkles" onPress={() => navigation.navigate('Assistant')} colors={colors} isIOS={isIOS} />
          <QuickAction title="Recherche" icon="magnifyingglass" mdIcon="magnify" onPress={() => navigation.navigate('Search')} colors={colors} isIOS={isIOS} />
          <QuickAction title="Réglages" icon="slider.horizontal.3" mdIcon="tune" onPress={() => navigation.navigate('Settings')} colors={colors} isIOS={isIOS} />
        </View>

        <View style={styles.sectionHeader}>
          <Text style={[styles.sectionTitle, { color: colors.text }]}>Notes récentes</Text>
          <Text style={[styles.sectionCaption, { color: colors.textSecondary }]}>{stats.words} mots indexés</Text>
        </View>

        <View style={styles.noteList}>
          {recentNotes.map((note) => (
            <TouchableOpacity key={note.id} activeOpacity={0.78} onPress={() => openNote(note)}>
              <GlassCard intensity={isIOS ? 26 : 0} cornerRadius={isIOS ? fiipRadius.lg : 18} interactive style={styles.noteRow}>
                <View style={[styles.noteIcon, { backgroundColor: isIOS ? (isDark ? 'rgba(255,255,255,0.07)' : 'rgba(20,19,18,0.05)') : colors.primaryContainer }]}>
                  <Icon sfSymbol={note.is_favorite ? 'star.fill' : 'doc.text'} mdIcon={note.is_favorite ? 'star' : 'file-document-outline'} size={18} color={note.is_favorite ? '#FFB340' : colors.textSecondary} />
                </View>
                <View style={styles.noteText}>
                  <Text style={[styles.noteTitle, { color: colors.text }]} numberOfLines={1}>{note.title || 'Sans titre'}</Text>
                  <Text style={[styles.noteExcerpt, { color: colors.textSecondary }]} numberOfLines={1}>{getNoteMetrics(note.content).plainText || 'Note vide'}</Text>
                </View>
                <Icon sfSymbol="chevron.right" mdIcon="chevron-right" size={16} color={colors.textSecondary} />
              </GlassCard>
            </TouchableOpacity>
          ))}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

function Metric({ label, value, color }: any) {
  return (
    <View style={[styles.metric, { borderColor: color.outlineVariant, backgroundColor: color.surfaceContainerLow }]}>
      <Text style={[styles.metricValue, { color: color.text }]}>{value}</Text>
      <Text style={[styles.metricLabel, { color: color.textSecondary }]}>{label}</Text>
    </View>
  );
}

function QuickAction({ title, icon, mdIcon, onPress, colors, isIOS }: any) {
  return (
    <TouchableOpacity accessibilityRole="button" accessibilityLabel={title} activeOpacity={0.76} onPress={onPress} style={styles.quickAction}>
      <GlassCard intensity={isIOS ? 28 : 0} cornerRadius={isIOS ? fiipRadius.lg : 20} interactive style={styles.quickCard}>
        <Icon sfSymbol={icon} mdIcon={mdIcon} size={20} color={isIOS ? colors.text : colors.primary} />
        <Text style={[styles.quickTitle, { color: colors.text }]}>{title}</Text>
      </GlassCard>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  content: { paddingHorizontal: 20, paddingTop: 12, paddingBottom: 140 },
  contentAndroid: { paddingHorizontal: 16, paddingTop: 8 },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 18 },
  eyebrow: { fontSize: 12, fontWeight: '700', textTransform: 'uppercase', letterSpacing: Platform.OS === 'ios' ? 0.8 : 0.3, marginBottom: 6 },
  title: { fontSize: 34, lineHeight: 38, fontWeight: '800', maxWidth: 280 },
  titleAndroid: { fontSize: 28, lineHeight: 34, fontWeight: '700', maxWidth: 280 },
  createButton: { width: 46, height: 46, borderRadius: 23, alignItems: 'center', justifyContent: 'center' },
  createButtonAndroid: { width: 56, height: 56, borderRadius: 16, alignItems: 'center', justifyContent: 'center', elevation: 3 },
  heroCard: { padding: 20, gap: 18 },
  heroTop: { flexDirection: 'row', justifyContent: 'space-between', gap: 16 },
  cardLabel: { fontSize: 12, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 0.7, marginBottom: 6 },
  heroTitle: { fontSize: 27, lineHeight: 32, fontWeight: '800', maxWidth: 220 },
  syncPill: { flexDirection: 'row', alignItems: 'center', gap: 6, height: 32, paddingHorizontal: 10, borderRadius: 16, borderWidth: 1 },
  syncText: { fontSize: 12, fontWeight: '700' },
  heroExcerpt: { fontSize: 16, lineHeight: 24 },
  metricGrid: { flexDirection: 'row', gap: 10 },
  metric: { flex: 1, borderWidth: 1, borderRadius: 16, padding: 12 },
  metricValue: { fontSize: 19, fontWeight: '800' },
  metricLabel: { fontSize: 11, fontWeight: '700', marginTop: 3 },
  primaryAction: { height: 48, borderRadius: 24, alignItems: 'center', justifyContent: 'center', flexDirection: 'row', gap: 8 },
  primaryActionAndroid: { height: 48, borderRadius: 24, alignItems: 'center', justifyContent: 'center', flexDirection: 'row', gap: 8, elevation: 1 },
  primaryActionText: { color: '#FFF', fontSize: 15, fontWeight: '800' },
  quickActions: { flexDirection: 'row', gap: 10, marginTop: 14 },
  quickAction: { flex: 1 },
  quickCard: { paddingVertical: 14, alignItems: 'center', gap: 8 },
  quickTitle: { fontSize: 12, fontWeight: '800' },
  sectionHeader: { marginTop: 26, marginBottom: 12, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-end' },
  sectionTitle: { fontSize: 22, fontWeight: '800' },
  sectionCaption: { fontSize: 12, fontWeight: '600' },
  noteList: { gap: 10 },
  noteRow: { padding: 14, flexDirection: 'row', alignItems: 'center', gap: 12 },
  noteIcon: { width: 38, height: 38, borderRadius: 14, alignItems: 'center', justifyContent: 'center' },
  noteText: { flex: 1 },
  noteTitle: { fontSize: 15, fontWeight: '800' },
  noteExcerpt: { fontSize: 13, marginTop: 3 },
});

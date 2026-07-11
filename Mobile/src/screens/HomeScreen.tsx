import React, { useMemo, useState } from 'react';
import {
  FlatList,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';

import { GlassCard } from '../components/ui/GlassCard';
import { Icon } from '../components/ui/Icon';
import { FiipAction, FiipEmptyState, FiipListRow, FiipScreen, FiipToolbar, textStyles } from '../components/ui/FiipNative';
import { useAppTheme } from '../hooks/useAppTheme';
import { useNotesStore } from '../store/notesStore';
import { useSettingsStore } from '../store/settingsStore';
import { fiipRadius } from '../theme/fiipDesign';
import { triggerHaptic } from '../utils/hapticEngine';
import { getNoteMetrics } from '../utils/noteMetrics';

type HomeFilter = 'recent' | 'favorites' | 'shared';

const FILTERS: Array<{ label: string; value: HomeFilter; sfSymbol: string; mdIcon: string }> = [
  { label: 'Récents', value: 'recent', sfSymbol: 'clock', mdIcon: 'clock-outline' },
  { label: 'Favoris', value: 'favorites', sfSymbol: 'star', mdIcon: 'star-outline' },
  { label: 'Partagées', value: 'shared', sfSymbol: 'person.2', mdIcon: 'account-multiple-outline' },
];

export default function HomeScreen() {
  const navigation = useNavigation<any>();
  const { colors, isDark } = useAppTheme();
  const isIOS = Platform.OS === 'ios';
  const notesById = useNotesStore((state) => state.notes);
  const isSyncing = useNotesStore((state) => state.isSyncing);
  const syncEnabled = useSettingsStore((state) => state.syncEnabled);
  const [query, setQuery] = useState('');
  const [filter, setFilter] = useState<HomeFilter>('recent');

  const allNotes = useMemo(
    () => Object.values(notesById)
      .filter((note: any) => !note.deleted_at)
      .sort((a: any, b: any) => new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime()),
    [notesById],
  );

  const filteredNotes = useMemo(() => {
    const normalizedQuery = query.trim().toLocaleLowerCase();
    return allNotes.filter((note: any) => {
      if (filter === 'favorites' && !note.is_favorite) return false;
      if (filter === 'shared' && !(note.shared || note.public_slug)) return false;
      if (!normalizedQuery) return true;

      const haystack = `${note.title || ''} ${getNoteMetrics(note.content || '').plainText || ''} ${(note.badges || []).join(' ')}`.toLocaleLowerCase();
      return haystack.includes(normalizedQuery);
    });
  }, [allNotes, filter, query]);

  const stats = useMemo(() => {
    const words = allNotes.reduce((sum: number, note: any) => sum + getNoteMetrics(note.content || '').wordCount, 0);
    const favorites = allNotes.filter((note: any) => note.is_favorite).length;
    const shared = allNotes.filter((note: any) => note.shared || note.public_slug).length;
    return { words, favorites, shared, readingTime: words === 0 ? 0 : Math.ceil(words / 220) };
  }, [allNotes]);

  const featuredNote = filteredNotes[0] || allNotes[0];
  const displayText = textStyles(colors);
  const showHero = !query.trim() && filter === 'recent';

  const openNote = (note?: any) => {
    triggerHaptic('selection');
    navigation.navigate('NoteEditor', note ? { noteToEdit: note } : undefined);
  };

  const switchFilter = (next: HomeFilter) => {
    triggerHaptic('selection');
    setFilter(next);
  };

  return (
    <FiipScreen contentStyle={styles.container}>
      <FlatList
        data={filteredNotes}
        keyExtractor={(item: any) => item.id}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.listContent}
        ListHeaderComponent={
          <View style={styles.headerStack}>
            <View style={styles.header}>
              <View>
                <Text style={displayText.kicker}>Fiip</Text>
                <Text style={displayText.title}>Accueil</Text>
              </View>
              <Pressable
                accessibilityRole="button"
                accessibilityLabel="Créer une note"
                onPress={() => openNote()}
                style={({ pressed }) => [
                  styles.createButton,
                  { backgroundColor: isIOS ? colors.text : colors.primaryContainer, opacity: pressed ? 0.74 : 1 },
                ]}
              >
                <Icon sfSymbol="plus" mdIcon="plus" size={21} color={isIOS ? colors.background : colors.onPrimaryContainer} />
              </Pressable>
            </View>

            {showHero ? (
              <GlassCard intensity={isIOS ? 38 : 0} cornerRadius={isIOS ? fiipRadius.xl : 28} interactive style={styles.heroCard}>
                <View style={styles.heroTop}>
                  <View style={styles.heroTitleGroup}>
                    <Text style={[styles.cardLabel, { color: colors.textSecondary }]}>Studio du jour</Text>
                    <Text style={[styles.heroTitle, { color: colors.text }]} numberOfLines={2}>
                      {featuredNote?.title || 'Écrire sans friction'}
                    </Text>
                  </View>
                  <View style={[styles.syncPill, { borderColor: colors.outlineVariant, backgroundColor: colors.surfaceContainerLow }]}>
                    <Icon sfSymbol={syncEnabled ? 'icloud.fill' : 'icloud.slash'} mdIcon={syncEnabled ? 'cloud-check' : 'cloud-off-outline'} size={14} color={syncEnabled ? colors.success : colors.textSecondary} />
                    <Text style={[styles.syncText, { color: syncEnabled ? colors.success : colors.textSecondary }]}>
                      {isSyncing ? 'Sync' : syncEnabled ? 'Cloud' : 'Local'}
                    </Text>
                  </View>
                </View>
                <Text style={[styles.heroExcerpt, { color: colors.textSecondary }]} numberOfLines={3}>
                  {featuredNote ? getNoteMetrics(featuredNote.content || '').plainText || 'Note vide' : 'Créez une note, retrouvez-la vite, puis synchronisez-la quand vous êtes prêt.'}
                </Text>
                <View style={styles.metricGrid}>
                  <Metric label="Notes" value={String(allNotes.length)} />
                  <Metric label="Étoiles" value={String(stats.favorites)} />
                  <Metric label="Partagées" value={String(stats.shared)} />
                </View>
              </GlassCard>
            ) : null}

            <FiipToolbar>
              <Icon sfSymbol="magnifyingglass" mdIcon="magnify" size={18} color={colors.textSecondary} />
              <TextInput
                placeholder="Rechercher une note"
                placeholderTextColor={colors.textSecondary}
                value={query}
                onChangeText={setQuery}
                autoCorrect={false}
                clearButtonMode="while-editing"
                style={[styles.searchInput, { color: colors.text }]}
              />
            </FiipToolbar>

            <View style={styles.filterRow}>
              {FILTERS.map((item) => (
                <FiipAction
                  key={item.value}
                  label={item.label}
                  sfSymbol={item.sfSymbol}
                  mdIcon={item.mdIcon}
                  selected={filter === item.value}
                  onPress={() => switchFilter(item.value)}
                  style={styles.filterAction}
                />
              ))}
            </View>

            <View style={styles.quickActions}>
              <QuickAction title="Dexter" sfSymbol="sparkles" mdIcon="robot-outline" onPress={() => navigation.navigate('Assistant')} />
              <QuickAction title="Réglages" sfSymbol="slider.horizontal.3" mdIcon="tune" onPress={() => navigation.navigate('Settings')} />
            </View>

            <View style={styles.sectionHeader}>
              <Text style={displayText.section}>Notes récentes</Text>
              <Text style={[styles.sectionCaption, { color: colors.textSecondary }]}>{stats.words} mots indexés</Text>
            </View>
          </View>
        }
        ItemSeparatorComponent={() => <View style={styles.separator} />}
        renderItem={({ item }: any) => (
          <FiipListRow
            title={item.title || 'Sans titre'}
            subtitle={getNoteMetrics(item.content || '').plainText || 'Note vide'}
            meta={item.public_slug ? 'Public' : item.is_favorite ? 'Favori' : undefined}
            sfSymbol={item.is_locked ? 'lock.fill' : item.is_favorite ? 'star.fill' : 'doc.text'}
            mdIcon={item.is_locked ? 'lock' : item.is_favorite ? 'star' : 'file-document-outline'}
            accentColor={item.is_favorite ? '#FFB340' : item.public_slug ? colors.success : undefined}
            onPress={() => openNote(item)}
          />
        )}
        ListEmptyComponent={
          <FiipEmptyState
            title={query || filter !== 'recent' ? 'Aucune note trouvée' : 'Votre espace est prêt'}
            message={query || filter !== 'recent' ? 'Essayez une autre recherche ou un autre filtre.' : 'Créez votre première note pour démarrer votre bibliothèque Fiip.'}
            sfSymbol="doc.text.magnifyingglass"
            mdIcon="file-search-outline"
            actionLabel="Nouvelle note"
            onAction={() => openNote()}
          />
        }
      />
    </FiipScreen>
  );
}

function Metric({ label, value }: { label: string; value: string }) {
  const { colors } = useAppTheme();

  return (
    <View style={[styles.metric, { borderColor: colors.outlineVariant, backgroundColor: colors.surfaceContainerLow }]}>
      <Text style={[styles.metricValue, { color: colors.text }]}>{value}</Text>
      <Text style={[styles.metricLabel, { color: colors.textSecondary }]}>{label}</Text>
    </View>
  );
}

function QuickAction({ title, sfSymbol, mdIcon, onPress }: { title: string; sfSymbol: string; mdIcon: string; onPress: () => void }) {
  const { colors } = useAppTheme();

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={title}
      onPress={() => {
        triggerHaptic('selection');
        onPress();
      }}
      style={({ pressed }) => [styles.quickAction, { backgroundColor: colors.surfaceContainerLow, borderColor: colors.outlineVariant, opacity: pressed ? 0.78 : 1 }]}
    >
      <Icon sfSymbol={sfSymbol} mdIcon={mdIcon} size={18} color={colors.primary} />
      <Text style={[styles.quickTitle, { color: colors.text }]}>{title}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  listContent: {
    paddingHorizontal: 18,
    paddingTop: 12,
    paddingBottom: 132,
  },
  headerStack: {
    gap: 14,
    marginBottom: 12,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  createButton: {
    width: 48,
    height: 48,
    borderRadius: Platform.OS === 'ios' ? 24 : 16,
    alignItems: 'center',
    justifyContent: 'center',
    elevation: Platform.OS === 'android' ? 3 : 0,
  },
  heroCard: {
    padding: 18,
    gap: 16,
  },
  heroTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 14,
  },
  heroTitleGroup: {
    flex: 1,
  },
  cardLabel: {
    fontSize: 11,
    fontWeight: '900',
    textTransform: 'uppercase',
    letterSpacing: 0.8,
    marginBottom: 6,
  },
  heroTitle: {
    fontSize: 26,
    lineHeight: 31,
    fontWeight: '900',
  },
  heroExcerpt: {
    fontSize: 15,
    lineHeight: 22,
  },
  syncPill: {
    height: 34,
    borderRadius: 17,
    borderWidth: StyleSheet.hairlineWidth,
    paddingHorizontal: 10,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  syncText: {
    fontSize: 12,
    fontWeight: '900',
  },
  metricGrid: {
    flexDirection: 'row',
    gap: 8,
  },
  metric: {
    flex: 1,
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: 16,
    padding: 11,
  },
  metricValue: {
    fontSize: 18,
    fontWeight: '900',
  },
  metricLabel: {
    marginTop: 3,
    fontSize: 11,
    fontWeight: '800',
  },
  searchInput: {
    flex: 1,
    minHeight: 42,
    fontSize: 16,
    fontWeight: '700',
    paddingVertical: 8,
  },
  filterRow: {
    flexDirection: 'row',
    gap: 8,
  },
  filterAction: {
    flex: 1,
  },
  quickActions: {
    flexDirection: 'row',
    gap: 10,
  },
  quickAction: {
    flex: 1,
    minHeight: 50,
    borderRadius: Platform.OS === 'ios' ? 22 : 18,
    borderWidth: StyleSheet.hairlineWidth,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  quickTitle: {
    fontSize: 13,
    fontWeight: '900',
  },
  sectionHeader: {
    marginTop: 4,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-end',
    gap: 12,
  },
  sectionCaption: {
    fontSize: 12,
    fontWeight: '700',
  },
  separator: {
    height: 10,
  },
});

import React, { useMemo, useState } from 'react';
import { FlatList, Image, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { useNavigation } from '@react-navigation/native';

import { Icon } from '../components/ui/Icon';
import { FiipEmptyState, FiipListRow, FiipScreen, FiipToolbar, textStyles } from '../components/ui/FiipNative';
import { useAppTheme } from '../hooks/useAppTheme';
import { useCloudProfile } from '../hooks/useCloudProfile';
import { useNotesStore } from '../store/notesStore';
import { triggerHaptic } from '../utils/hapticEngine';
import { getNoteMetrics } from '../utils/noteMetrics';
import { normalizeNoteTags } from '../utils/noteTags';

function getInitials(name = 'Fiip') {
  return String(name || 'Fiip')
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join('') || 'F';
}

export default function FavoritesScreen() {
  const navigation = useNavigation<any>();
  const { colors } = useAppTheme();
  const notesMap = useNotesStore((state) => state.notes);
  const { user, avatarUrl, displayName } = useCloudProfile();
  const [search, setSearch] = useState('');
  const displayText = textStyles(colors);

  const notes = useMemo(() => {
    const lowerSearch = search.trim().toLowerCase();
    return Object.values(notesMap)
      .filter((note: any) => !note.deleted_at)
      .filter((note: any) => {
        if (!lowerSearch) return true;
        const tags = normalizeNoteTags(note.tags || [], note.badges || []).map((tag) => tag.label).join(' ');
        const haystack = `${note.title || ''} ${getNoteMetrics(note.content || '').plainText} ${tags}`.toLowerCase();
        return haystack.includes(lowerSearch);
      })
      .sort((a: any, b: any) => new Date(b.updated_at || 0).getTime() - new Date(a.updated_at || 0).getTime());
  }, [notesMap, search]);

  const openNote = (note: any) => {
    triggerHaptic('selection');
    navigation.navigate('NoteEditor', { noteToEdit: note });
  };

  return (
    <FiipScreen contentStyle={styles.container}>
      <View style={styles.header}>
        <View>
          <Text style={displayText.kicker}>Bibliothèque</Text>
          <Text style={displayText.title}>Recherche</Text>
        </View>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Compte cloud"
          style={({ pressed }) => [styles.profileButton, { opacity: pressed ? 0.74 : 1 }]}
          onPress={() => navigation.navigate(user ? 'Settings' : 'Auth')}
        >
          {avatarUrl ? (
            <Image source={{ uri: avatarUrl }} style={styles.profileImage} />
          ) : (
            <View style={[styles.profileFallback, { backgroundColor: colors.primary }]}>
              <Text style={styles.profileFallbackText}>{getInitials(displayName)}</Text>
            </View>
          )}
        </Pressable>
      </View>

      <FiipToolbar style={styles.searchBar}>
        <Icon sfSymbol="magnifyingglass" mdIcon="magnify" size={18} color={colors.textSecondary} />
        <TextInput
          style={[styles.searchInput, { color: colors.text }]}
          placeholder="Rechercher dans vos notes"
          placeholderTextColor={colors.textSecondary}
          value={search}
          onChangeText={setSearch}
          autoCorrect={false}
          autoCapitalize="none"
          clearButtonMode="while-editing"
        />
      </FiipToolbar>

      <View style={styles.resultsHeader}>
        <Text style={[styles.resultsCount, { color: colors.textSecondary }]}>
          {notes.length} {notes.length > 1 ? 'résultats trouvés' : 'résultat trouvé'}
        </Text>
      </View>

      <FlatList
        data={notes}
        keyExtractor={(item: any) => item.id}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
        contentContainerStyle={styles.listContent}
        ItemSeparatorComponent={() => <View style={styles.separator} />}
        renderItem={({ item }: any) => {
          const firstTag = normalizeNoteTags(item.tags || [], item.badges || [])[0]?.label;
          return (
            <FiipListRow
              title={item.title || 'Sans titre'}
              subtitle={getNoteMetrics(item.content || '').plainText || 'Note vide'}
              meta={firstTag || (item.public_slug ? 'Public' : item.is_favorite ? 'Favori' : undefined)}
              sfSymbol={item.is_locked ? 'lock.fill' : item.is_favorite ? 'star.fill' : 'doc.text'}
              mdIcon={item.is_locked ? 'lock' : item.is_favorite ? 'star' : 'file-document-outline'}
              accentColor={item.is_favorite ? '#FFB340' : item.public_slug ? colors.success : undefined}
              onPress={() => openNote(item)}
            />
          );
        }}
        ListEmptyComponent={
          <FiipEmptyState
            title="Aucune note correspondante"
            message="Cherchez dans les titres, le contenu ou les tags synchronisés avec Fiip."
            sfSymbol="doc.text.magnifyingglass"
            mdIcon="text-search"
          />
        }
      />
    </FiipScreen>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    paddingHorizontal: 18,
    paddingTop: 12,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 16,
  },
  profileButton: {
    width: 44,
    height: 44,
  },
  profileImage: {
    width: 44,
    height: 44,
    borderRadius: 22,
  },
  profileFallback: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
  },
  profileFallbackText: {
    color: '#FFF',
    fontSize: 14,
    fontWeight: '900',
  },
  searchBar: {
    marginBottom: 12,
  },
  searchInput: {
    flex: 1,
    minHeight: 42,
    fontSize: 16,
    fontWeight: '700',
    paddingVertical: 8,
  },
  resultsHeader: {
    marginBottom: 10,
  },
  resultsCount: {
    fontSize: 13,
    fontWeight: '700',
  },
  listContent: {
    paddingBottom: 132,
  },
  separator: {
    height: 10,
  },
});

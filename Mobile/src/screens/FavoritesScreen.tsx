import React, { useMemo, useState } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, Image, TextInput } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { triggerHaptic } from '../utils/hapticEngine';
import { GlassCard } from '../components/ui/GlassCard';
import { Icon } from '../components/ui/Icon';
import { useNotesStore } from '../store/notesStore';
import { useAppTheme } from '../hooks/useAppTheme';
import { useNavigation } from '@react-navigation/native';
import { useCloudProfile } from '../hooks/useCloudProfile';
import { getNoteMetrics } from '../utils/noteMetrics';
import { normalizeNoteTags } from '../utils/noteTags';

function escapeRegExp(value = '') {
  return String(value).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

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
  const { colors, isDark } = useAppTheme();
  
  const notesMap = useNotesStore((state) => state.notes);
  const notesList = useMemo(() => Object.values(notesMap).filter((note: any) => !note.deleted_at), [notesMap]);
  const { user, avatarUrl, displayName } = useCloudProfile();

  const [search, setSearch] = useState('');

  const tagBg = isDark ? 'rgba(164, 138, 123, 0.15)' : '#EAE2DC';
  const tagText = isDark ? '#BCA597' : '#7C675B';

  const filteredNotes = useMemo(() => {
    const sorted = [...notesList].sort((a: any, b: any) => new Date(b.updated_at || 0).getTime() - new Date(a.updated_at || 0).getTime());
    if (!search.trim()) {
      return sorted;
    }

    const lowerSearch = search.toLowerCase();
    return sorted.filter((n: any) =>
      String(n.title || '').toLowerCase().includes(lowerSearch) ||
      getNoteMetrics(n.content || '').plainText.toLowerCase().includes(lowerSearch) ||
      normalizeNoteTags(n.tags || [], n.badges || []).some((tag) => tag.label.toLowerCase().includes(lowerSearch))
    );
  }, [search, notesList]);

  const handleNotePress = (note: any) => {
    triggerHaptic('selection');
    navigation.navigate('NoteEditor', { noteToEdit: note });
  };

  const handleClearSearch = () => {
    triggerHaptic('impactLight');
    setSearch('');
  };

  // Real-time keyword highlighter function for titles
  const renderHighlightedTitle = (text: string, query: string) => {
    if (!query.trim()) return <Text style={[styles.title, { color: colors.text }]}>{text}</Text>;
    const safeQuery = escapeRegExp(query.trim());
    const parts = String(text || '').split(new RegExp(`(${safeQuery})`, 'gi'));
    return (
      <Text style={[styles.title, { color: colors.text }]}>
        {parts.map((part, index) => 
          part.toLowerCase() === query.toLowerCase() 
            ? <Text key={index} style={styles.highlightText}>{part}</Text>
            : part
        )}
      </Text>
    );
  };

  // Real-time keyword highlighter function for excerpts
  const renderHighlightedExcerpt = (text: string, query: string) => {
    if (!query.trim()) return <Text style={{ color: colors.textSecondary }} numberOfLines={3}>{text}</Text>;
    const safeQuery = escapeRegExp(query.trim());
    const parts = String(text || '').split(new RegExp(`(${safeQuery})`, 'gi'));
    return (
      <Text style={{ color: colors.textSecondary }} numberOfLines={3}>
        {parts.map((part, index) => 
          part.toLowerCase() === query.toLowerCase() 
            ? <Text key={index} style={styles.highlightText}>{part}</Text>
            : part
        )}
      </Text>
    );
  };

  const getNoteMetadata = (note: any) => {
    // Map badges to specific visual categories visible in mockup 1
    const tag = normalizeNoteTags(note.tags || [], note.badges || [])[0]?.label || 'Note';
    let typeLabel = 'Note';
    let sfIcon = 'doc.text';
    let mdIcon = 'file-document-outline';

    if (tag === 'Réflexion') {
      typeLabel = note.id === 'seed-4' ? 'Journal' : 'Note';
      sfIcon = note.id === 'seed-4' ? 'book' : 'doc.text';
      mdIcon = note.id === 'seed-4' ? 'book-open-outline' : 'file-document-outline';
    } else if (tag === 'Stratégie') {
      typeLabel = 'Plan';
      sfIcon = 'target';
      mdIcon = 'target';
    } else if (tag === 'Réunion') {
      typeLabel = 'Réunion';
      sfIcon = 'person.2';
      mdIcon = 'account-group-outline';
    } else if (tag === 'Idées') {
      typeLabel = note.id === 'seed-7' ? 'Note' : 'Note';
      sfIcon = note.id === 'seed-7' ? 'book' : 'lightbulb';
      mdIcon = note.id === 'seed-7' ? 'book-open-outline' : 'lightbulb-on-outline';
    }

    // Determine mock display dates to exactly align with Screen 1
    let timeText = '09:41';
    if (note.id === 'seed-1') timeText = '09:41';
    else if (note.id === 'seed-2') timeText = '09:12';
    else if (note.id === 'seed-3') timeText = '08:30';
    else if (note.id === 'seed-4') timeText = 'Hier';
    else if (note.id === 'seed-5') timeText = 'Hier';
    else if (note.id === 'seed-6') timeText = 'Lun.';
    else if (note.id === 'seed-7') timeText = 'Mar.';

    return { typeLabel, sfIcon, mdIcon, tag, timeText };
  };

  const renderNoteItem = ({ item }: { item: any }) => {
    const { typeLabel, sfIcon, mdIcon, tag, timeText } = getNoteMetadata(item);

    return (
      <TouchableOpacity activeOpacity={0.8} onPress={() => handleNotePress(item)} style={styles.itemMargin}>
        <GlassCard intensity={25} cornerRadius={22} style={styles.card}>
          <View style={styles.cardLayout}>
            {/* Colored/translucent rounded square icon background */}
            <View style={[styles.iconBox, { backgroundColor: isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.03)' }]}>
              <Icon sfSymbol={sfIcon} mdIcon={mdIcon} size={20} color={colors.textSecondary} />
            </View>
            
            <View style={styles.cardContent}>
              <View style={styles.metaRow}>
                <Text style={[styles.typeLabel, { color: colors.textSecondary }]}>{typeLabel}</Text>
                <Text style={[styles.timeText, { color: colors.textSecondary }]}>{timeText}</Text>
              </View>
              
              {renderHighlightedTitle(item.title || 'Sans titre', search)}
              
              <Text style={styles.excerptContainer}>
                {renderHighlightedExcerpt(getNoteMetrics(item.content || '').plainText, search)}
              </Text>
              
              <View style={[styles.tag, { backgroundColor: tagBg, marginTop: 12 }]}>
                <Text style={[styles.tagText, { color: tagText }]}>{tag}</Text>
              </View>
            </View>
          </View>
        </GlassCard>
      </TouchableOpacity>
    );
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: isDark ? '#0E0E0E' : '#F9F9F8' }]} edges={['top', 'left', 'right']}>
      <View style={styles.topHeader}>
        <Text style={[styles.fiipTitle, { color: colors.text }]}>Fiip</Text>
        <TouchableOpacity
          accessibilityRole="button"
          accessibilityLabel="Compte cloud"
          style={styles.profileButton}
          activeOpacity={0.8}
          onPress={() => navigation.navigate(user ? 'Settings' : 'Auth')}
        >
          {avatarUrl ? (
            <Image source={{ uri: avatarUrl }} style={styles.profileImage} />
          ) : (
            <View style={[styles.profileFallback, { backgroundColor: colors.primary }]}>
              <Text style={styles.profileFallbackText}>{getInitials(displayName)}</Text>
            </View>
          )}
        </TouchableOpacity>
      </View>

      <View style={styles.searchContainer}>
        {/* Custom Glass Search bar with clear button & CMD-K */}
        <GlassCard intensity={30} cornerRadius={12} style={styles.searchBarCard}>
          <View style={styles.searchRow}>
            <Icon sfSymbol="magnifyingglass" mdIcon="magnify" size={18} color={colors.textSecondary} />
            <TextInput
              style={[styles.inputIOS, { color: colors.text }]}
              placeholder="Rechercher dans vos notes"
              placeholderTextColor={colors.textSecondary}
              value={search}
              onChangeText={setSearch}
              autoCorrect={false}
              autoCapitalize="none"
            />
            {search.length > 0 && (
              <TouchableOpacity onPress={handleClearSearch} style={styles.clearBtn}>
                <Icon sfSymbol="xmark.circle.fill" mdIcon="close-circle" size={16} color={colors.textSecondary} />
              </TouchableOpacity>
            )}
          </View>
        </GlassCard>
      </View>

      {/* Dynamic results found title */}
      <View style={styles.resultsCountContainer}>
        <Text style={[styles.resultsCount, { color: colors.textSecondary }]}>
          {filteredNotes.length} {filteredNotes.length > 1 ? 'résultats trouvés' : 'résultat trouvé'}
        </Text>
      </View>

      <FlatList
        data={filteredNotes}
        keyExtractor={(item) => item.id}
        renderItem={renderNoteItem}
        contentContainerStyle={styles.listContent}
        showsVerticalScrollIndicator={false}
        ListEmptyComponent={
          <View style={styles.empty}>
            <Icon sfSymbol="doc.text.magnifyingglass" mdIcon="text-search" size={44} color={colors.textSecondary} />
            <Text style={[styles.emptyText, { color: colors.textSecondary }]}>Aucune note correspondante</Text>
          </View>
        }
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { 
    flex: 1 
  },
  topHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingTop: 10,
    paddingBottom: 16,
  },
  fiipTitle: {
    fontSize: 34,
    fontWeight: '800',
    letterSpacing: -1,
  },
  profileButton: {
    width: 40,
    height: 40,
  },
  profileImage: {
    width: 40,
    height: 40,
    borderRadius: 20,
  },
  profileFallback: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  profileFallbackText: {
    color: '#FFF',
    fontSize: 14,
    fontWeight: '900',
  },
  searchContainer: { 
    paddingHorizontal: 20, 
    marginBottom: 8 
  },
  searchBarCard: {
    height: 48,
    justifyContent: 'center',
  },
  searchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
  },
  inputIOS: {
    flex: 1,
    height: '100%',
    paddingHorizontal: 10,
    fontSize: 16,
    fontFamily: 'System',
  },
  clearBtn: {
    padding: 4,
    marginRight: 6,
  },
  resultsCountContainer: {
    paddingHorizontal: 20,
    marginVertical: 12,
  },
  resultsCount: {
    fontSize: 13,
    fontWeight: '500',
  },
  listContent: { 
    paddingHorizontal: 20, 
    paddingBottom: 160 
  },
  itemMargin: { 
    marginBottom: 12 
  },
  card: { 
    padding: 16 
  },
  cardLayout: {
    flexDirection: 'row',
    gap: 14,
  },
  iconBox: {
    width: 42,
    height: 42,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
  },
  cardContent: {
    flex: 1,
  },
  metaRow: { 
    flexDirection: 'row', 
    justifyContent: 'space-between', 
    alignItems: 'center', 
    marginBottom: 6 
  },
  typeLabel: {
    fontSize: 12,
    fontWeight: '600',
    letterSpacing: 0.5,
  },
  timeText: {
    fontSize: 12,
    fontWeight: '500',
  },
  title: { 
    fontSize: 18, 
    fontWeight: '700', 
    letterSpacing: -0.3,
    marginBottom: 4,
  },
  excerptContainer: {
    fontSize: 14,
    lineHeight: 19,
  },
  tag: {
    paddingHorizontal: 8,
    paddingVertical: 3.5,
    borderRadius: 6,
    alignSelf: 'flex-start',
  },
  tagText: {
    fontSize: 11,
    fontWeight: '700',
  },
  highlightText: {
    backgroundColor: 'rgba(164, 138, 123, 0.25)', 
    color: '#7C675B', 
    fontWeight: '700',
  },
  empty: { 
    flex: 1, 
    justifyContent: 'center', 
    alignItems: 'center', 
    marginTop: 100, 
    gap: 16 
  },
  emptyText: { 
    fontSize: 15, 
    fontWeight: '600' 
  },
});

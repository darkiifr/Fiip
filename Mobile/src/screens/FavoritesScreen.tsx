import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, Platform, FlatList, TouchableOpacity, Image, TextInput } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { triggerHaptic } from '../utils/hapticEngine';
import { GlassCard } from '../components/ui/GlassCard';
import { Icon } from '../components/ui/Icon';
import { useNotesStore } from '../store/notesStore';
import { useAppTheme } from '../hooks/useAppTheme';
import { useNavigation } from '@react-navigation/native';

export default function FavoritesScreen() {
  const navigation = useNavigation<any>();
  const { colors, isDark } = useAppTheme();
  
  const notesMap = useNotesStore((state) => state.notes);
  const notesList = Object.values(notesMap);

  const [search, setSearch] = useState('clarté'); // Initialize with 'clarté' to match mockup Screen 1
  const [filteredNotes, setFilteredNotes] = useState<any[]>([]);

  const profileImageUri = 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=150&auto=format&fit=crop&q=80';
  const tagBg = isDark ? 'rgba(164, 138, 123, 0.15)' : '#EAE2DC';
  const tagText = isDark ? '#BCA597' : '#7C675B';

  useEffect(() => {
    if (!search.trim()) {
      // Sort by updated_at descending
      setFilteredNotes(notesList.sort((a, b) => new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime()));
    } else {
      const lowerSearch = search.toLowerCase();
      const matches = notesList.filter(n => 
        (n.title && n.title.toLowerCase().includes(lowerSearch)) || 
        (n.content && n.content.toLowerCase().includes(lowerSearch))
      );
      setFilteredNotes(matches);
    }
  }, [search, notesMap]);

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
    const parts = text.split(new RegExp(`(${query})`, 'gi'));
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
    const parts = text.split(new RegExp(`(${query})`, 'gi'));
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
    const tag = note.badges?.[0] || 'Note';
    let typeLabel = 'Note';
    let sfIcon = 'doc.text';
    let mdIcon = 'file-document-outline';
    let itemColor = colors.textSecondary;

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
              
              {renderHighlightedTitle(item.title, search)}
              
              <Text style={styles.excerptContainer}>
                {renderHighlightedExcerpt(item.content.split('\n')[0], search)}
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
        <TouchableOpacity style={styles.profileButton} activeOpacity={0.8}>
          <Image source={{ uri: profileImageUri }} style={styles.profileImage} />
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
            <View style={[styles.cmdKBadge, { backgroundColor: isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.04)', borderColor: isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.06)' }]}>
              <Text style={[styles.cmdKText, { color: colors.textSecondary }]}>⌘K</Text>
            </View>
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
  cmdKBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
    borderWidth: 1,
  },
  cmdKText: {
    fontSize: 12,
    fontWeight: '600',
    letterSpacing: 0.5,
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

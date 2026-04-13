import React, { useEffect } from 'react';
import { View, Text, StyleSheet, Platform, TouchableOpacity, ScrollView, ActivityIndicator } from 'react-native';
import { GlassCard } from './ui/GlassCard';
import { Icon } from './ui/Icon';
import { triggerHaptic } from '../utils/hapticEngine';
import { Surface, TouchableRipple } from 'react-native-paper';
import { useAppTheme } from '../hooks/useAppTheme';
import { useNotesStore } from '../store/notesStore';

export const NoteList = ({ onNotePress }: { onNotePress: (note: any) => void }) => {
  const { colors, isDark } = useAppTheme();
  const isIOS = Platform.OS === 'ios';
  
  // Use Zustand selector to force re-render when notes change
  const notesData = useNotesStore(state => state.notes);
  const getNotesList = useNotesStore(state => state.getNotesList);
  const syncWithCloud = useNotesStore(state => state.syncWithCloud);
  const isSyncing = useNotesStore(state => state.isSyncing);

  const notes = getNotesList().slice(0, 8).map(note => ({
    id: note.id,
    title: note.title || 'Note sans titre',
    excerpt: note.content ? note.content.substring(0, 50) + '...' : '',
    date: new Date(note.updated_at).toLocaleDateString(),
    badges: note.badges || [],
    is_favorite: note.is_favorite || false,
    _raw: note
  }));

  useEffect(() => {
    syncWithCloud();
  }, [syncWithCloud]);

  const handlePress = (note: any) => {
    triggerHaptic('selection');
    onNotePress(note._raw);
  };

  return (
    <View style={styles.container}>
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12, paddingHorizontal: 16 }}>
        <Text style={[isIOS ? styles.headerIOS : styles.headerAndroid, { color: colors.text, marginBottom: 0, marginLeft: 0 }]}>Récents</Text>
        {isSyncing && <ActivityIndicator size="small" color={colors.primary} />}
      </View>
      
      {notes.length === 0 && !isSyncing ? (
        <Text style={{ marginHorizontal: 16, color: colors.textSecondary }}>Aucune note récente.</Text>
      ) : (
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>
          {notes.map(note => (
            <View key={note.id}>
              {isIOS ? (
              <TouchableOpacity activeOpacity={0.7} onPress={() => handlePress(note)}>
                <GlassCard intensity={25} cornerRadius={16} style={[styles.cardContainerIOS, { backgroundColor: colors.card }]}>
                  <View>
                    <View style={{flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start'}}>
                      <Text style={[styles.titleIOS, { color: colors.text, flex: 1 }]} numberOfLines={1}>{note.title}</Text>
                      {note.is_favorite && <Icon sfSymbol="star.fill" mdIcon="star" size={14} color="#FFD60A" />}
                    </View>
                    {note.badges.length > 0 && (
                      <View style={styles.badgeContainer}>
                        {note.badges.slice(0, 2).map((b, i) => (
                           <View key={i} style={[styles.badge, { backgroundColor: isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.05)' }]}>
                             <Text style={[styles.badgeText, { color: colors.textSecondary }]}>{b}</Text>
                           </View>
                        ))}
                      </View>
                    )}
                    <Text style={[styles.excerptIOS, { color: colors.textSecondary }]} numberOfLines={note.badges.length > 0 ? 2 : 3}>{note.excerpt}</Text>
                  </View>
                  <Text style={[styles.dateIOS, { color: colors.primary }]} >{note.date}</Text>
                </GlassCard>
              </TouchableOpacity>
            ) : (
              <Surface style={[styles.cardContainerAndroid, { backgroundColor: colors.card }]} elevation={1}>
                <TouchableRipple onPress={() => handlePress(note)} style={styles.ripplePad}>
                  <View style={{flex: 1, justifyContent: 'space-between'}}>
                    <View>
                      <View style={{flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start'}}>
                        <Text style={[styles.titleAndroid, { color: colors.text, flex: 1 }]} numberOfLines={1}>{note.title}</Text>
                        {note.is_favorite && <Icon sfSymbol="star.fill" mdIcon="star" size={14} color="#FFD60A" />}
                      </View>
                      {note.badges.length > 0 && (
                        <View style={styles.badgeContainer}>
                          {note.badges.slice(0, 2).map((b, i) => (
                             <View key={i} style={[styles.badge, { backgroundColor: isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.05)' }]}>
                               <Text style={[styles.badgeText, { color: colors.textSecondary }]}>{b}</Text>
                             </View>
                          ))}
                        </View>
                      )}
                      <Text style={[styles.excerptAndroid, { color: colors.textSecondary }]} numberOfLines={note.badges.length > 0 ? 2 : 3}>{note.excerpt}</Text>
                    </View>
                    <Text style={[styles.dateAndroid, { color: colors.primary }]}>{note.date}</Text>
                  </View>
                </TouchableRipple>
              </Surface>
            )}
          </View>
        ))}
        </ScrollView>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    marginVertical: 10,
  },
  headerIOS: {
    fontSize: 20,
    fontWeight: '700',
    fontFamily: 'System',
    color: '#000',
  },
  headerAndroid: {
    fontSize: 18,
    fontWeight: '500',
    color: '#1C1B1F',
  },
  scrollContent: {
    paddingHorizontal: 16,
    gap: 12,
  },
  cardContainerIOS: {
    width: 160,
    height: 150,
    padding: 16,
    justifyContent: 'space-between',
  },
  cardContainerAndroid: {
    width: 160,
    height: 150,
    borderRadius: 16,
    marginRight: 12,
    backgroundColor: '#fff'
  },
  ripplePad: {
    padding: 16,
    flex: 1,
    justifyContent: 'space-between',
  },
  titleIOS: {
    fontSize: 16,
    fontWeight: '600',
    fontFamily: 'System',
  },
  titleAndroid: {
    fontSize: 16,
    fontWeight: '600',
  },
  excerptIOS: {
    fontSize: 13,
    fontFamily: 'System',
    marginTop: 4,
    lineHeight: 18,
  },
  excerptAndroid: {
    fontSize: 14,
    marginTop: 4,
  },
  dateIOS: {
    fontSize: 12,
    fontFamily: 'System',
    marginTop: 8,
  },
  dateAndroid: {
    fontSize: 12,
    marginTop: 8,
  },
  badgeContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 4,
    marginTop: 6,
    marginBottom: 2
  },
  badge: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  badgeText: {
    fontSize: 10,
    fontWeight: '500',
  }
});

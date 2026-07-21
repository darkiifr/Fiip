import React, { useEffect } from 'react';
import { View, Text, StyleSheet, Platform, TouchableOpacity, ScrollView, ActivityIndicator } from 'react-native';
import { GlassCard } from './ui/GlassCard';
import { Icon } from './ui/Icon';
import { triggerHaptic } from '../utils/hapticEngine';
import { Surface, TouchableRipple } from 'react-native-paper';
import { useTranslation } from 'react-i18next';
import { useAppTheme } from '../hooks/useAppTheme';
import { useNotesStore } from '../store/notesStore';

export const NoteList = ({ onNotePress }: { onNotePress: (note: any) => void }) => {
  const { colors, isDark } = useAppTheme();
  const { t } = useTranslation();
  const isIOS = Platform.OS === 'ios';
  
  // Use Zustand selector to force re-render when notes change
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
        <Text style={[isIOS ? styles.headerIOS : styles.headerAndroid, { color: colors.text, marginBottom: 0, marginLeft: 0 }]}>{t('home.recent')}</Text>
        {isSyncing && <ActivityIndicator size="small" color={colors.primary} />}
      </View>
      
      {notes.length === 0 && !isSyncing ? (
        <Text style={{ marginHorizontal: 16, color: colors.textSecondary }}>{t('home.no_recent')}</Text>
      ) : (
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>
          {notes.map(note => (
            <View key={note.id}>
              {isIOS ? (
              <TouchableOpacity activeOpacity={0.7} onPress={() => handlePress(note)}>
                <GlassCard intensity={32} cornerRadius={22} interactive style={styles.cardContainerIOS}>
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
              <Surface style={[styles.cardContainerAndroid, { backgroundColor: colors.surfaceContainer }]} elevation={1}>
                <TouchableRipple onPress={() => handlePress(note)} style={styles.ripplePad} rippleColor={colors.stateLayer}>
                  <View style={{flex: 1, justifyContent: 'space-between'}}>
                    <View>
                      <View style={{flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start'}}>
                        <Text style={[styles.titleAndroid, { color: colors.text, flex: 1 }]} numberOfLines={1}>{note.title}</Text>
                        {note.is_favorite && <Icon sfSymbol="star.fill" mdIcon="star" size={14} color="#FFD60A" />}
                      </View>
                      {note.badges.length > 0 && (
                        <View style={styles.badgeContainer}>
                          {note.badges.slice(0, 2).map((b, i) => (
                             <View key={i} style={[styles.badge, { backgroundColor: colors.primaryContainer }]}>
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
  badge: {
    borderRadius: 4,
    paddingHorizontal: 6,
    paddingVertical: 2,
  },
  badgeContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 4,
    marginBottom: 2,
    marginTop: 6
  },
  badgeText: {
    fontSize: 10,
    fontWeight: '500',
  },
  cardContainerAndroid: {
    borderRadius: 16,
    height: 150,
    marginRight: 12,
    overflow: 'hidden',
    width: 160,
  },
  cardContainerIOS: {
    height: 150,
    justifyContent: 'space-between',
    padding: 16,
    width: 160,
  },
  container: {
    marginVertical: 10,
  },
  dateAndroid: {
    fontSize: 12,
    marginTop: 8,
  },
  dateIOS: {
    fontFamily: 'System',
    fontSize: 12,
    marginTop: 8,
  },
  excerptAndroid: {
    fontSize: 14,
    marginTop: 4,
  },
  excerptIOS: {
    fontFamily: 'System',
    fontSize: 13,
    lineHeight: 18,
    marginTop: 4,
  },
  headerAndroid: {
    fontSize: 18,
    fontWeight: '600',
  },
  headerIOS: {
    color: '#000',
    fontFamily: 'System',
    fontSize: 20,
    fontWeight: '700',
  },
  ripplePad: {
    flex: 1,
    justifyContent: 'space-between',
    padding: 16,
  },
  scrollContent: {
    gap: 12,
    paddingHorizontal: 16,
  },
  titleAndroid: {
    fontSize: 16,
    fontWeight: '600',
  },
  titleIOS: {
    fontFamily: 'System',
    fontSize: 16,
    fontWeight: '500',
  }
});

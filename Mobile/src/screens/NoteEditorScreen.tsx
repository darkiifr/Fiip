import React, { useState, useEffect, useCallback, useRef } from 'react';
import { View, Text, TextInput, TouchableOpacity, ScrollView, StyleSheet, Platform, KeyboardAvoidingView, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Icon } from '../components/ui/Icon';
import { triggerHaptic } from '../utils/hapticEngine';
import { authenticateBiometric } from '../services/biometrics';
import { useNotesStore } from '../store/notesStore';
import { useSettingsStore } from '../store/settingsStore';
import { useAppTheme } from '../hooks/useAppTheme';
import { GlassCard } from '../components/ui/GlassCard';

interface NoteEditorScreenProps {
  route: any;
  navigation: any;
}

export const NoteEditorScreen: React.FC<NoteEditorScreenProps> = ({ route, navigation }) => {
  const { noteToEdit } = route.params || {};
  const onClose = () => navigation.goBack();
  const { colors, isDark } = useAppTheme();
  
  // Zustand Store integrations
  const addNote = useNotesStore(state => state.addNote);
  const updateNote = useNotesStore(state => state.updateNote);
  const deleteNote = useNotesStore(state => state.deleteNote);

  // Settings Store for typography, sizes and metric labels synchronization
  const typography = useSettingsStore(state => state.typography);
  const fontSize = useSettingsStore(state => state.fontSize);
  const showWordCount = useSettingsStore(state => state.showWordCount);
  const showReadingTime = useSettingsStore(state => state.showReadingTime);
  const autoSave = useSettingsStore(state => state.autoSave);

  const [title, setTitle] = useState(noteToEdit?.title || '');
  const [content, setContent] = useState(noteToEdit?.content || '');
  const [isLocked, setIsLocked] = useState(noteToEdit?.is_locked || false);
  const [isFavorite, setIsFavorite] = useState(noteToEdit?.is_favorite || false);
  const [badges, setBadges] = useState<string[]>(noteToEdit?.badges || ['Réflexion']);
  const [currentNoteId, setCurrentNoteId] = useState(noteToEdit?.id || null);
  const didMountRef = useRef(false);
  const saveCurrentNoteRef = useRef<() => Promise<void>>(async () => {});

  const copperAccent = '#A48A7B';
  const tagBg = isDark ? 'rgba(164, 138, 123, 0.15)' : '#EAE2DC';
  const tagText = isDark ? '#BCA597' : '#7C675B';

  const saveCurrentNote = useCallback(async () => {
    if (!title.trim() && !content.trim()) return;
    
    const notePayload = {
      title: title || 'Sans titre',
      content,
      is_locked: isLocked,
      is_favorite: isFavorite,
      badges,
    };

    if (currentNoteId) {
      updateNote(currentNoteId, notePayload);
    } else {
      const newId = await addNote(notePayload);
      setCurrentNoteId(newId);
    }
  }, [addNote, badges, content, currentNoteId, isFavorite, isLocked, title, updateNote]);

  useEffect(() => {
    saveCurrentNoteRef.current = saveCurrentNote;
  }, [saveCurrentNote]);

  useEffect(() => {
    return () => {
      if (autoSave) {
        saveCurrentNoteRef.current();
      }
    };
  }, [autoSave]);

  useEffect(() => {
    if (!autoSave) return undefined;
    if (!didMountRef.current) {
      didMountRef.current = true;
      return undefined;
    }

    const timeout = setTimeout(() => {
      saveCurrentNote();
    }, 800);

    return () => clearTimeout(timeout);
  }, [autoSave, saveCurrentNote]);

  const toggleFavorite = () => {
    triggerHaptic('selection');
    setIsFavorite(!isFavorite);
  };

  const toggleLock = async () => {
    triggerHaptic('impactLight');
    if (!isLocked) {
       const canLock = await authenticateBiometric("Veuillez vous authentifier pour verrouiller cette note");
       if (canLock) setIsLocked(true);
    } else {
       setIsLocked(false);
    }
  };

  const handleDelete = () => {
    triggerHaptic('notificationWarning');
    Alert.alert(
      "Supprimer la note",
      "Êtes-vous sûr de vouloir supprimer cette note définitivement ?",
      [
        { text: "Annuler", style: "cancel" },
        { 
          text: "Supprimer", 
          style: "destructive", 
          onPress: () => {
            if (currentNoteId) {
              deleteNote(currentNoteId);
              onClose();
            } else {
              onClose();
            }
          }
        }
      ]
    );
  };

  // Maps settings store typography value to font family style
  const getFontFamily = () => {
    switch (typography) {
      case 'Roboto': return 'Roboto';
      case 'Outfit': return 'System'; // Fallback System
      case 'System': return 'System';
      default: return 'System'; // Default Inter/System
    }
  };

  // Maps settings store font size value to style properties
  const getFontSizeStyles = () => {
    switch (fontSize) {
      case 'petite':
        return { title: 26, body: 15, lineHeight: 24 };
      case 'grande':
        return { title: 38, body: 21, lineHeight: 32 };
      default: // moyenne
        return { title: 32, body: 18, lineHeight: 28 };
    }
  };

  const sizeStyles = getFontSizeStyles();
  const activeFontFamily = getFontFamily();

  // Helper word & reading metrics calculation
  const getWordCount = () => {
    if (!content.trim()) return 0;
    return content.trim().split(/\s+/).length;
  };

  const getReadingTime = () => {
    const words = getWordCount();
    const min = Math.ceil(words / 150); // average 150 words per minute
    return min === 0 ? 1 : min;
  };

  return (
    <SafeAreaView style={[styles.screenContainer, { backgroundColor: isDark ? '#0E0E0E' : '#F9F9F8' }]} edges={['top', 'left', 'right']}>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={{ flex: 1 }}>
        
        {/* Editor Screen Header matching Screen 5 */}
        <View style={styles.header}>
          <TouchableOpacity accessibilityRole="button" accessibilityLabel="Retour" style={styles.backBtn} onPress={() => { saveCurrentNote(); onClose(); }} activeOpacity={0.6}>
             <Icon sfSymbol="chevron.left" mdIcon="chevron-left" size={22} color={colors.text} />
          </TouchableOpacity>
          
          <View style={styles.headerTitleGroup}>
            <Icon sfSymbol="doc.text" mdIcon="file-document-outline" size={16} color={colors.textSecondary} />
            <Text style={[styles.headerTitleText, { color: colors.text }]}>Note</Text>
          </View>
          
          <View style={styles.headerActions}>
              <TouchableOpacity style={styles.actionBtn} onPress={toggleFavorite} activeOpacity={0.6}>
                <Icon sfSymbol={isFavorite ? "star.fill" : "star"} mdIcon="star" size={20} color={isFavorite ? "#FFD700" : colors.text} />
              </TouchableOpacity>
              <TouchableOpacity style={styles.actionBtn} onPress={toggleLock} activeOpacity={0.6}>
                <Icon sfSymbol={isLocked ? "lock.fill" : "lock.open"} mdIcon="lock" size={20} color={isLocked ? "#FF3B30" : colors.text} />
              </TouchableOpacity>
              <TouchableOpacity style={styles.actionBtn} activeOpacity={0.6}>
                <Icon sfSymbol="square.and.arrow.up" mdIcon="export-variant" size={20} color={colors.text} />
              </TouchableOpacity>
              <TouchableOpacity style={styles.actionBtn} onPress={handleDelete} activeOpacity={0.6}>
                <Icon sfSymbol="ellipsis" mdIcon="dots-horizontal" size={20} color={colors.text} />
              </TouchableOpacity>
          </View>
        </View>

        {/* Scrollable Note Area */}
        <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.editorContent}>
          {/* Note Title */}
          <TextInput
            style={[
              styles.titleInput, 
              { 
                color: colors.text, 
                fontFamily: activeFontFamily, 
                fontSize: sizeStyles.title 
              }
            ]}
            placeholder="Titre"
            placeholderTextColor={colors.textSecondary + '80'}
            value={title}
            onChangeText={setTitle}
            multiline
            scrollEnabled={false}
          />
          
          {/* Metadata Row */}
          <Text style={[styles.pubDateText, { color: colors.textSecondary }]}>Aujourd'hui à 09:41</Text>

          {/* Badges/Tags Row */}
          <View style={styles.badgeRow}>
             {["Réflexion", "Principes", "Idées", "Important"].map(b => {
               const active = badges.includes(b);
               return (
                 <TouchableOpacity 
                   key={b} 
                   style={[styles.badge, { backgroundColor: active ? tagBg : 'transparent', borderColor: active ? copperAccent : 'rgba(0,0,0,0.08)' }]}
                   onPress={() => {
                     triggerHaptic('selection');
                     setBadges(prev => prev.includes(b) ? prev.filter(x => x !== b) : [...prev, b]);
                   }}
                   activeOpacity={0.7}
                 >
                   <Text style={[styles.badgeText, { color: active ? tagText : colors.textSecondary }]}>{b}</Text>
                 </TouchableOpacity>
               );
             })}
          </View>

          {/* Note Body Text Input */}
          <TextInput
            style={[
              styles.contentInput, 
              { 
                color: colors.text, 
                fontFamily: activeFontFamily, 
                fontSize: sizeStyles.body, 
                lineHeight: sizeStyles.lineHeight 
              }
            ]}
            placeholder="Commencez à écrire..."
            placeholderTextColor={colors.textSecondary + '60'}
            value={content}
            onChangeText={setContent}
            multiline
            textAlignVertical="top"
            scrollEnabled={false}
          />

          {/* Stats Capsule floating underneath note text */}
          <View style={styles.statsContainer}>
            <GlassCard intensity={30} cornerRadius={16} style={styles.statsCard}>
              <View style={styles.statsRow}>
                {showWordCount && (
                  <View style={styles.statItem}>
                    <Icon sfSymbol="doc.text" mdIcon="format-align-left" size={14} color={colors.textSecondary} />
                    <Text style={[styles.statValue, { color: colors.textSecondary }]}>
                      {getWordCount()} mots
                    </Text>
                  </View>
                )}
                {showWordCount && showReadingTime && (
                  <View style={[styles.verticalDivider, { backgroundColor: isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.05)' }]} />
                )}
                {showReadingTime && (
                  <View style={styles.statItem}>
                    <Icon sfSymbol="clock" mdIcon="clock-outline" size={14} color={colors.textSecondary} />
                    <Text style={[styles.statValue, { color: colors.textSecondary }]}>
                      {getReadingTime()} min de lecture
                    </Text>
                  </View>
                )}
              </View>
            </GlassCard>
          </View>

          <View style={{ height: 160 }} />
        </ScrollView>

      </KeyboardAvoidingView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  screenContainer: { 
    flex: 1 
  },
  header: { 
    flexDirection: 'row', 
    justifyContent: 'space-between', 
    alignItems: 'center', 
    paddingHorizontal: 20, 
    paddingVertical: 12 
  },
  backBtn: { 
    padding: 4 
  },
  headerTitleGroup: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  headerTitleText: {
    fontSize: 16,
    fontWeight: '700',
  },
  headerActions: { 
    flexDirection: 'row', 
    alignItems: 'center', 
    gap: 16 
  },
  actionBtn: { 
    padding: 4 
  },
  editorContent: { 
    paddingHorizontal: 24, 
    paddingTop: 10 
  },
  titleInput: { 
    fontWeight: '800', 
    marginBottom: 8,
    letterSpacing: -0.5
  },
  pubDateText: {
    fontSize: 13,
    fontWeight: '500',
    marginBottom: 16,
  },
  badgeRow: { 
    flexDirection: 'row', 
    gap: 8, 
    marginBottom: 20,
    flexWrap: 'wrap',
  },
  badge: { 
    paddingHorizontal: 12, 
    paddingVertical: 5.5, 
    borderRadius: 10, 
    borderWidth: 1, 
  },
  badgeText: { 
    fontSize: 12, 
    fontWeight: '700' 
  },
  contentInput: { 
    minHeight: 350,
    letterSpacing: -0.1,
  },
  statsContainer: {
    alignItems: 'flex-start',
    marginTop: 32,
    marginBottom: 20,
  },
  statsCard: {
    paddingVertical: 10,
    paddingHorizontal: 16,
  },
  statsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  statItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  statValue: {
    fontSize: 13,
    fontWeight: '600',
  },
  verticalDivider: {
    width: 1,
    height: 14,
  }
});

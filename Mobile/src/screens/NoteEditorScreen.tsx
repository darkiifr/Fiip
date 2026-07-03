import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { View, Text, TextInput, TouchableOpacity, ScrollView, StyleSheet, Platform, KeyboardAvoidingView, Alert, Modal } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Icon } from '../components/ui/Icon';
import { triggerHaptic } from '../utils/hapticEngine';
import { authenticateBiometric } from '../services/biometrics';
import { useNotesStore } from '../store/notesStore';
import { useSettingsStore } from '../store/settingsStore';
import { useAppTheme } from '../hooks/useAppTheme';
import { GlassCard } from '../components/ui/GlassCard';
import { ShareModal } from '../components/ShareModal';
import { getNoteMetrics } from '../utils/noteMetrics';
import { FiipTag, normalizeNoteTags, serializeLegacyBadges } from '../utils/noteTags';

interface NoteEditorScreenProps {
  route: any;
  navigation: any;
}

export const NoteEditorScreen: React.FC<NoteEditorScreenProps> = ({ route, navigation }) => {
  const { noteToEdit } = route.params || {};
  const onClose = () => navigation.goBack();
  const { colors } = useAppTheme();
  
  // Zustand Store integrations
  const addNote = useNotesStore(state => state.addNote);
  const updateNote = useNotesStore(state => state.updateNote);
  const deleteNote = useNotesStore(state => state.deleteNote);
  const notesById = useNotesStore(state => state.notes);

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
  const [tags, setTags] = useState<FiipTag[]>(() => normalizeNoteTags(noteToEdit?.tags || [], noteToEdit?.badges || []));
  const [publicSlug, setPublicSlug] = useState(noteToEdit?.public_slug || null);
  const [currentNoteId, setCurrentNoteId] = useState(noteToEdit?.id || null);
  const [shareNoteId, setShareNoteId] = useState(noteToEdit?.id || null);
  const [shareVisible, setShareVisible] = useState(false);
  const [actionMenuVisible, setActionMenuVisible] = useState(false);
  const didMountRef = useRef(false);
  const saveCurrentNoteRef = useRef<() => Promise<string | null>>(async () => null);

  const copperAccent = '#A48A7B';
  const tagBg = 'rgba(164, 138, 123, 0.18)';
  const tagText = '#D8C4B6';

  const tagSuggestions = useMemo(() => {
    const fromNotes = Object.values(notesById || {})
      .flatMap((note: any) => normalizeNoteTags(note.tags || [], note.badges || []));
    return normalizeNoteTags([...tags, ...fromNotes, 'Réflexion', 'Important', 'Idées'], []);
  }, [notesById, tags]);

  const metrics = useMemo(() => getNoteMetrics(content), [content]);

  const saveCurrentNote = useCallback(async () => {
    if (!title.trim() && !content.trim()) return currentNoteId;

    const normalizedTags = normalizeNoteTags(tags, []);
    
    const notePayload = {
      title: title || 'Sans titre',
      content,
      is_locked: isLocked,
      is_favorite: isFavorite,
      tags: normalizedTags,
      badges: serializeLegacyBadges(normalizedTags),
      public_slug: publicSlug,
    };

    if (currentNoteId) {
      updateNote(currentNoteId, notePayload);
      return currentNoteId;
    } else {
      const newId = await addNote(notePayload);
      setCurrentNoteId(newId);
      return newId;
    }
  }, [addNote, content, currentNoteId, isFavorite, isLocked, publicSlug, tags, title, updateNote]);

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
    const next = !isFavorite;
    setIsFavorite(next);
    if (currentNoteId) {
      updateNote(currentNoteId, { is_favorite: next });
    }
  };

  const toggleLock = async () => {
    triggerHaptic('impactLight');
    if (!isLocked) {
       const canLock = await authenticateBiometric("Veuillez vous authentifier pour verrouiller cette note");
       if (canLock) {
         setIsLocked(true);
         if (currentNoteId) updateNote(currentNoteId, { is_locked: true });
       }
    } else {
       setIsLocked(false);
       if (currentNoteId) updateNote(currentNoteId, { is_locked: false });
    }
  };

  const handleShare = async () => {
    const id = await saveCurrentNote();
    if (!id) {
      Alert.alert('Note vide', 'Ajoutez un titre ou du contenu avant de partager.');
      return;
    }
    setShareNoteId(id);
    setShareVisible(true);
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

  const toggleTag = (tag: FiipTag) => {
    triggerHaptic('selection');
    setTags(prev => (
      prev.some(item => item.id === tag.id)
        ? prev.filter(item => item.id !== tag.id)
        : normalizeNoteTags([...prev, tag], [])
    ));
  };

  return (
    <SafeAreaView style={[styles.screenContainer, { backgroundColor: '#0E0E0E' }]} edges={['top', 'left', 'right']}>
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
              <TouchableOpacity accessibilityRole="button" accessibilityLabel="Favori" style={styles.actionBtn} onPress={toggleFavorite} activeOpacity={0.6}>
                <Icon sfSymbol={isFavorite ? "star.fill" : "star"} mdIcon="star" size={20} color={isFavorite ? "#FFD700" : colors.text} />
              </TouchableOpacity>
              <TouchableOpacity accessibilityRole="button" accessibilityLabel="Protéger" style={styles.actionBtn} onPress={toggleLock} activeOpacity={0.6}>
                <Icon sfSymbol={isLocked ? "lock.fill" : "lock.open"} mdIcon="lock" size={20} color={isLocked ? "#FF3B30" : colors.text} />
              </TouchableOpacity>
              <TouchableOpacity accessibilityRole="button" accessibilityLabel="Partager" style={styles.actionBtn} onPress={handleShare} activeOpacity={0.6}>
                <Icon sfSymbol="square.and.arrow.up" mdIcon="export-variant" size={20} color={colors.text} />
              </TouchableOpacity>
              <TouchableOpacity accessibilityRole="button" accessibilityLabel="Plus d'actions" style={styles.actionBtn} onPress={() => setActionMenuVisible(true)} activeOpacity={0.6}>
                <Icon sfSymbol="ellipsis" mdIcon="dots-horizontal" size={20} color={colors.text} />
              </TouchableOpacity>
          </View>
        </View>

        {/* Scrollable Note Area */}
        <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.editorContent}>
          {/* Note Title */}
          <TextInput
            testID="note-title-input"
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

          {/* Tags Row */}
          <View style={styles.badgeRow}>
             {tagSuggestions.map(tag => {
               const active = tags.some(item => item.id === tag.id);
               return (
                 <TouchableOpacity 
                   key={tag.id}
                   style={[styles.badge, { backgroundColor: active ? tagBg : 'rgba(255,255,255,0.03)', borderColor: active ? copperAccent : 'rgba(255,255,255,0.08)' }]}
                   onPress={() => toggleTag(tag)}
                   activeOpacity={0.7}
                 >
                   <Text style={[styles.badgeText, { color: active ? tagText : colors.textSecondary }]}>{tag.label}</Text>
                 </TouchableOpacity>
               );
             })}
          </View>

          {/* Note Body Text Input */}
          <TextInput
            testID="note-content-input"
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
                      {metrics.wordCount} mots
                    </Text>
                  </View>
                )}
                {showWordCount && showReadingTime && (
                  <View style={[styles.verticalDivider, { backgroundColor: 'rgba(255,255,255,0.08)' }]} />
                )}
                {showReadingTime && (
                  <View style={styles.statItem}>
                    <Icon sfSymbol="clock" mdIcon="clock-outline" size={14} color={colors.textSecondary} />
                    <Text style={[styles.statValue, { color: colors.textSecondary }]}>
                      {metrics.readingTimeMinutes} min de lecture
                    </Text>
                  </View>
                )}
              </View>
            </GlassCard>
          </View>

          <View style={{ height: 160 }} />
        </ScrollView>

      </KeyboardAvoidingView>

      <ShareModal
        visible={shareVisible}
        onClose={() => setShareVisible(false)}
        noteId={shareNoteId || currentNoteId || ''}
        publicSlug={publicSlug}
        onUpdatePublicStatus={(slug) => {
          setPublicSlug(slug);
          if (currentNoteId) {
            updateNote(currentNoteId, { public_slug: slug });
          }
        }}
        onDeleteRequest={handleDelete}
      />

      <Modal visible={actionMenuVisible} transparent animationType="fade" onRequestClose={() => setActionMenuVisible(false)}>
        <TouchableOpacity style={styles.menuBackdrop} activeOpacity={1} onPress={() => setActionMenuVisible(false)}>
          <View style={[styles.actionMenu, { backgroundColor: '#171719', borderColor: 'rgba(255,255,255,0.12)' }]}>
            <TouchableOpacity style={styles.menuItem} onPress={() => { setActionMenuVisible(false); handleShare(); }}>
              <Icon sfSymbol="square.and.arrow.up" mdIcon="export-variant" size={18} color={colors.text} />
              <Text style={[styles.menuText, { color: colors.text }]}>Partager</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.menuItem} onPress={() => { setActionMenuVisible(false); handleDelete(); }}>
              <Icon sfSymbol="trash" mdIcon="trash-can-outline" size={18} color="#EF4444" />
              <Text style={[styles.menuText, { color: '#EF4444' }]}>Supprimer</Text>
            </TouchableOpacity>
          </View>
        </TouchableOpacity>
      </Modal>
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
  },
  menuBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.42)',
    alignItems: 'flex-end',
    paddingTop: 76,
    paddingRight: 18,
  },
  actionMenu: {
    width: 206,
    borderRadius: 18,
    borderWidth: 1,
    paddingVertical: 8,
    shadowColor: '#000',
    shadowOpacity: 0.25,
    shadowRadius: 16,
    shadowOffset: { width: 0, height: 8 },
    elevation: 8,
  },
  menuItem: {
    minHeight: 48,
    paddingHorizontal: 16,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  menuText: {
    fontSize: 15,
    fontWeight: '800',
  }
});

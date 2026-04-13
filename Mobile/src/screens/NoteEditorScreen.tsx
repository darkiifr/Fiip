import { Share } from 'react-native';
import React, { useState, useEffect, useRef } from 'react';
import { View, Text, TextInput, TouchableOpacity, ScrollView, StyleSheet, Platform, KeyboardAvoidingView, AppState, InputAccessoryView, Keyboard } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Icon } from '../components/ui/Icon';
import { Surface, Button, IconButton, Badge } from 'react-native-paper';
import { triggerHaptic } from '../utils/hapticEngine';
import { authenticateBiometric } from '../services/biometrics';
import { generateText } from '../services/ai';
import { updateNoteMeta } from '../services/supabaseSync';
import { useTranslation } from 'react-i18next';

import RNHTMLtoPDF from 'react-native-html-to-pdf';
import RNShare from 'react-native-share'; // avoid collision with react-native Share
import Voice, { SpeechResultsEvent } from '@react-native-voice/voice';
import { RNCamera } from 'react-native-camera';
import { default as SketchCanvas } from '@terrylinla/react-native-sketch-canvas';
import AudioRecorderPlayer from 'react-native-audio-recorder-player';
import DocumentPicker from 'react-native-document-picker';
import { uploadNoteAttachment } from '../services/supabaseSync';
import { dataService } from '../services/supabase';
import { useNotesStore } from '../store/notesStore';
import { startLiveActivity, updateLiveActivity, endLiveActivity } from '../utils/LiveActivity';
import { isStorageFull } from '../services/storeSyncGuard';
import { Alert } from 'react-native';
import { PaywallModal } from '../components/PaywallModal';
import { ShareModal } from '../components/ShareModal';

import { useSettingsStore } from '../store/settingsStore';
import { useAppTheme } from '../hooks/useAppTheme';

interface NoteEditorScreenProps {
  route: any;
  navigation: any;
}

const audioRecorderPlayer = AudioRecorderPlayer;

export const NoteEditorScreen: React.FC<NoteEditorScreenProps> = ({ route, navigation }) => {
  const { noteToEdit } = route.params || {};
  const onClose = () => navigation.goBack();
  const { t } = useTranslation();
  const isIOS = Platform.OS === 'ios';

  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [isLocked, setIsLocked] = useState(false);
  const [isFavorite, setIsFavorite] = useState(false);
  const [badges, setBadges] = useState<string[]>([]);
  const [unlocked, setUnlocked] = useState(true);
  const { colors, isDark } = useAppTheme();
  const { subscriptionPlan } = useSettingsStore();
  const addNote = useNotesStore(state => state.addNote);
  const updateNote = useNotesStore(state => state.updateNote);
  const deleteNote = useNotesStore(state => state.deleteNote);
  const [paywallVisible, setPaywallVisible] = useState(false);
  const [paywallFeature, setPaywallFeature] = useState('');
  const [isKeyboardVisible, setKeyboardVisible] = useState(false);
  const [isShareModalVisible, setIsShareModalVisible] = useState(false);
  const [publicSlug, setPublicSlug] = useState(noteToEdit?.public_slug || null);

  const [currentNoteId, setCurrentNoteId] = useState(noteToEdit?.id || null);

  const [isRecording, setIsRecording] = useState(false); // Dictation
  const [isMemoRecording, setIsMemoRecording] = useState(false); // Voice Memos

  // Couleur du pinceau pour le canvas
  const [canvasColor, setCanvasColor] = useState(isDark ? '#FFFFFF' : '#000000');
  const [isDrawing, setIsDrawing] = useState(false);
  const [drawingPaths, setDrawingPaths] = useState<string[]>([]);
  const [attachments, setAttachments] = useState<any[]>([]);
  const [memoPath, setMemoPath] = useState<string | null>(null);
  const [playPosition, setPlayPosition] = useState<number>(0);
  const [memoDuration, setMemoDuration] = useState<number>(0);
  const [isPlaying, setIsPlaying] = useState(false);

  const canvasRef = useRef<any>(null);
  const contentBeforeDictationRef = useRef<string>('');

  // --- Save Logic ---
  const saveCurrentNote = async () => {
    try {
      if (!title.trim() && !content.trim() && drawingPaths.length === 0 && attachments.length === 0 && !memoPath && !noteToEdit?.id) {
         return; // Don't save completely empty new notes
      }

      if (await isStorageFull()) {
          Alert.alert(
            t('Espace plein'), 
            t('Votre espace CloudFiip est complet. Impossible de synchroniser de nouvelles notes.')
          );
          // Permettre de l'enregistrer localement mais alerter, 
          // où on gère un return pour bloquer l'écriture en local. On laisse l'utilisateur décider
      }
      
      const notePayload = {
        title: title || 'Sans titre',
        content,
        is_locked: isLocked,
        is_favorite: isFavorite,
        badges,
        drawings: drawingPaths,
        attachments: memoPath ? [...attachments, { type: 'memo', uri: memoPath }] : attachments
      };

      if (currentNoteId) {
        updateNote(currentNoteId, notePayload);
      } else {
        const newId = await addNote(notePayload);
        if (newId) setCurrentNoteId(newId);
      }
    } catch (error) {
      console.error('Error saving note:', error);
    }
  };

  // Auto-save on background, interval, and unmount
  useEffect(() => {
    const showSub = Keyboard.addListener(isIOS ? 'keyboardWillShow' : 'keyboardDidShow', () => setKeyboardVisible(true));
    const hideSub = Keyboard.addListener(isIOS ? 'keyboardWillHide' : 'keyboardDidHide', () => setKeyboardVisible(false));
    return () => {
      showSub.remove();
      hideSub.remove();
    };
  }, [isIOS]);

  useEffect(() => {
    // 1. Save on close
    const handleBeforeRemove = (e: any) => {
      saveCurrentNote();
    };
    navigation.addListener('beforeRemove', handleBeforeRemove);

    // 2. Save on background
    const subscription = AppState.addEventListener('change', nextAppState => {
      if (nextAppState.match(/inactive|background/)) {
        saveCurrentNote();
      }
    });

    // 3. Periodic auto-save while editing
    const autoSaveInterval = setInterval(() => {
      saveCurrentNote();
    }, 15000); // Auto-save every 15 seconds

    return () => {
      navigation.removeListener('beforeRemove', handleBeforeRemove);
      subscription.remove();
      clearInterval(autoSaveInterval);
    };
  }, [navigation, title, content, isLocked, isFavorite, badges, drawingPaths, attachments, memoPath, currentNoteId]);

  // Live Activity refs
  const liveActivityIdRef = useRef<string | null>(null);
  const timeElapsedRef = useRef<number>(0);
  const intervalRef = useRef<any>(null);

  useEffect(() => {
    if (isIOS) {
      timeElapsedRef.current = 0;
      const initialTitle = noteToEdit?.title || t('notes.newNote');
      startLiveActivity(initialTitle, 0).then(id => {
        if (id) {
          liveActivityIdRef.current = id;
          intervalRef.current = setInterval(() => {
            timeElapsedRef.current += 1;
            updateLiveActivity(id, timeElapsedRef.current);
          }, 1000);
        }
      });
    }

    return () => {
       if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
      if (liveActivityIdRef.current) {
        endLiveActivity(liveActivityIdRef.current);
        liveActivityIdRef.current = null;
      }
    };
  }, []);

  // Sync state when modal opens or noteToEdit changes
  useEffect(() => {
    setTitle(noteToEdit?.title || '');
    setContent(noteToEdit?.content || '');
    setIsLocked(noteToEdit?.is_locked || false);
    setIsFavorite(noteToEdit?.is_favorite || false);
    setBadges(noteToEdit?.badges || []);
    setDrawingPaths(noteToEdit?.drawings || []);
    setAttachments(noteToEdit?.attachments || []);
    
    if (noteToEdit?.is_locked) {
      setUnlocked(false);
      checkBiometric();
    } else {
      setUnlocked(true);
    }
    
    return () => {
      if (isRecording) { Voice.stop(); setIsRecording(false); }
      if (isMemoRecording) { audioRecorderPlayer.stopRecorder(); setIsMemoRecording(false); }
      setIsDrawing(false);
    };
  }, [noteToEdit]);

  const checkBiometric = async () => {
    const success = await authenticateBiometric("Déverrouiller avec FaceID/TouchID pour accéder à cette note verrouillée.");
    if (success) {
      setUnlocked(true);
    } else {
      onClose(); // Fermer la modale si l'auth échoue
    }
  };

  // --- Voice Dictation Hooks ---
  useEffect(() => {
    Voice.onSpeechResults = onSpeechResults;
    Voice.onSpeechPartialResults = onSpeechResults; // Fix for live updating
    Voice.onSpeechError = (e) => {
      console.error('Voice Error:', e);
      setIsRecording(false);
      triggerHaptic('notificationError');
    };
    Voice.onSpeechEnd = () => {
      setIsRecording(false);
    };
    return () => {
      Voice.destroy().then(Voice.removeAllListeners);
    };
  }, []);

  const onSpeechResults = (e: SpeechResultsEvent) => {
    if (e.value && e.value.length > 0) {
      // Use the static reference from before dictation started to avoid duplicating appended parts
      const prefix = contentBeforeDictationRef.current ? contentBeforeDictationRef.current + ' ' : '';
      setContent(prefix + e.value[0]);
    }
  };

  const toggleLock = async () => {
    triggerHaptic('impactLight');
    const newState = !isLocked;
    
    if (newState) {
       // Verrouiller la note nécessite une empreinte
       const canLock = await authenticateBiometric("Vérification pour activer le verrouillage Biométrique.");
       if (canLock) {
         setIsLocked(true);
         // updateNoteMeta(noteToEdit.id, { is_locked: true }) ...
       }
    } else {
       setIsLocked(false);
    }
  };

    const handleDelete = () => {
    Alert.alert(
      "Supprimer la note",
      "Êtes-vous sûr de vouloir supprimer cette note ? Cette action est irréversible.",
      [
        { text: "Annuler", style: "cancel" },
        { 
          text: "Supprimer", 
          style: "destructive", 
          onPress: () => {
            if (currentNoteId) {
              deleteNote(currentNoteId);
              triggerHaptic('notificationWarning');
              onClose();
            }
          }
        }
      ]
    );
  };

  const toggleFavorite = () => {
    triggerHaptic('selection');
    setIsFavorite(!isFavorite);
    // updateNoteMeta(noteToEdit.id, { is_favorite: !isFavorite }) ...
  };

  // Spark AI Tool: Amélioration du texte avec l'IA
  const handleSparkAI = async () => {
    if (subscriptionPlan === 'free') {
      setPaywallFeature("L'assistant de rédaction Spark AI");
      setPaywallVisible(true);
      return;
    }
    if (!content.trim()) return;
    triggerHaptic('impactHeavy');
    
    try {
      const improvedContent = await generateText({
         messages: [
           { role: 'system', content: 'Tu es un éditeur et correcteur intelligent (Spark AI). Tu dois améliorer, corriger et rendre plus professionnel ce texte sans en changer le sens, retourne uniquement le texte amélioré. Soit bref et direct.' },
           { role: 'user', content: content }
         ],
         model: 'openai/gpt-oss-20b:free'
      });

      if (improvedContent) {
        triggerHaptic('notificationSuccess');
        setContent(improvedContent);
      }
    } catch (e) {
      triggerHaptic('notificationError');
      console.error('Spark AI Error:', e);
    }
  };

  const handleMic = async () => {
    triggerHaptic('selection');
    try {
      if (!isRecording) {
        setIsRecording(true);
        // Save the content so we don't repeat the previous parts.
        contentBeforeDictationRef.current = content;
        triggerHaptic('impactLight');
        await Voice.start('fr-FR');
      } else {
        setIsRecording(false);
        triggerHaptic('notificationSuccess');
        await Voice.stop();
      }
    } catch (e) {
      console.error(e);
      setIsRecording(false);
    }
  };

  const handleVoiceMemo = async () => {
    if (subscriptionPlan === 'free') {
      setPaywallFeature("L'enregistrement de mémos vocaux");
      setPaywallVisible(true);
      return;
    }
    triggerHaptic('impactHeavy');
    try {
      if (!isMemoRecording) {
         setIsMemoRecording(true);
         // Use an explicit full path or undefined so it resolves to default cache location
         const path = undefined;
         const result = await audioRecorderPlayer.startRecorder(path);
         console.log('Started Mem Rec:', result);
      } else {
         const result = await audioRecorderPlayer.stopRecorder();
         setIsMemoRecording(false);
         setMemoPath(result);
         console.log('Stopped Mem Rec:', result);
         triggerHaptic('notificationSuccess');
      }
    } catch (e) {
      console.error('AudioRecorder error:', e);
      setIsMemoRecording(false);
      triggerHaptic('notificationError');
    }
  };
  const playMemo = async () => {
    if (memoPath) {
       try {
           triggerHaptic('impactLight');
           if (isPlaying) {
               await audioRecorderPlayer.pausePlayer();
               setIsPlaying(false);
               return;
           }
           setIsPlaying(true);
           await audioRecorderPlayer.startPlayer(memoPath);
           audioRecorderPlayer.addPlayBackListener((e: any) => {
              setPlayPosition(e.currentPosition);
              setMemoDuration(e.duration);
              if (e.currentPosition === e.duration || e.currentPosition < 0) {
                  audioRecorderPlayer.stopPlayer();
                  audioRecorderPlayer.removePlayBackListener();
                  setPlayPosition(0);
                  setIsPlaying(false);
              }
           });
       } catch (err) {
           console.error('Play audio err', err);
           setIsPlaying(false);
       }
    }
  };
  const handleAttachFile = async () => {
    triggerHaptic('selection');
    try {
       const res = await DocumentPicker.pick({
         type: [DocumentPicker.types.allFiles],
       });
       if (res[0]) {
          setAttachments(prev => [...prev, { ...res[0], id: Math.random().toString() }]);
          triggerHaptic('notificationSuccess');
          // Auto-upload 
          // uploadNoteAttachment(noteToEdit?.id, res[0].uri, res[0].name, res[0].type);
       }
    } catch (e) {
       if (!DocumentPicker.isCancel(e)) console.error(e);
    }
  };

  const handleDraw = () => {
    if (subscriptionPlan === 'free') {
      setPaywallFeature("L'outil de dessin vectoriel");
      setPaywallVisible(true);
      return;
    }
    triggerHaptic('impactLight');
    setIsDrawing(!isDrawing);
  };
  
  const saveDrawing = () => {
    if (canvasRef.current) {
       triggerHaptic('notificationSuccess');
       // As per the react-native-sketch-canvas docs: includeImage, includeText, cropToImageSize
       canvasRef.current.getBase64('png', false, true, false, true, (err: any, result: string) => {
           if (!err && result) {
              setDrawingPaths(prev => [...prev, `data:image/png;base64,${result}`]);
              setIsDrawing(false);
           } else {
              console.error('Sketch Error', err);
           }
       });
    }
  };

  const exportToPDF = async () => {
    triggerHaptic('impactHeavy');
    try {
      const drawingsHtml = drawingPaths.length > 0 
        ? drawingPaths.map((d, i) => `<div class="drawing-box"><img src="data:image/png;base64,${d}" alt="Dessin ${i+1}" /></div>`).join('')
        : '';
        
      const attachmentsHtml = attachments.length > 0
        ? `<div class="attachments"><h3>Fichiers joints: ${attachments.length}</h3></div>`
        : '';

      const memoHtml = memoPath ? `<div class="memo">- Mémo vocal inclus (${Math.floor(memoDuration / 1000)}s)</div>` : '';

      const htmlContent = `
        <html>
          <head>
            <style>
              body { font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif; padding: 40px; color: #333; }
              h1 { color: #000; font-size: 32px; border-bottom: 2px solid #eaeaea; padding-bottom: 10px; margin-bottom: 30px; }
              p { font-size: 16px; line-height: 1.6; white-space: pre-wrap; }
              .drawing-box { margin-top: 20px; border: 1px solid #eaeaea; border-radius: 8px; padding: 10px; text-align: center; }
              img { max-width: 100%; height: auto; }
              .attachments, .memo { margin-top: 20px; font-size: 14px; color: #666; font-style: italic; }
            </style>
          </head>
          <body>
            <h1>${title || 'Sans titre'}</h1>
            <p>${content || 'Aucun contenu.'}</p>
            ${drawingsHtml}
            ${attachmentsHtml}
            ${memoHtml}
          </body>
        </html>
      `;

      const options = {
        html: htmlContent,
        fileName: title ? title.replace(/[^a-zA-Z0-9]/g, '_') : 'Export_Fiip',
        directory: isIOS ? 'Documents' : 'Download',
      };

      const file = await RNHTMLtoPDF.convert(options);
      
      if (file.filePath) {
        triggerHaptic('notificationSuccess');
        await RNShare.open({
          url: isIOS ? file.filePath : `file://${file.filePath}`,
          title: 'Exporter le PDF',
          type: 'application/pdf',
        });
      }
    } catch (error) {
      triggerHaptic('notificationError');
      console.error('PDF Export Error:', error);
    }
  };

  const handleShare = () => {
    triggerHaptic('selection');
    if (!currentNoteId) {
      Alert.alert('Erreur', 'Veuillez enregistrer la note (quelques secondes) avant de partager.');
      return;
    }
    setIsShareModalVisible(true);
  };

  if (isLocked && !unlocked) return null;

  const renderToolbarContent = () => (
    <View style={[styles.bottomToolbar, { backgroundColor: isDark ? 'rgba(20,20,20,0.85)' : 'rgba(255,255,255,0.9)', borderTopColor: colors.border, position: 'relative', paddingBottom: isIOS ? 20 : 16, borderTopWidth: 1 }]}>
        <TouchableOpacity style={styles.bottomToolBtn} onPress={handleMic}>
          <Icon sfSymbol={isRecording ? "mic.fill" : "mic"} mdIcon={isRecording ? "microphone" : "microphone-outline"} size={22} color={isRecording ? "#007AFF" : colors.textSecondary} />
        </TouchableOpacity>
        
        <TouchableOpacity style={styles.bottomToolBtn} onPress={handleVoiceMemo}>
          <Icon sfSymbol={isMemoRecording ? "waveform.circle.fill" : "waveform.circle"} mdIcon={isMemoRecording ? "record-circle" : "record-rec"} size={22} color={isMemoRecording ? "#FF3B30" : colors.textSecondary} />
        </TouchableOpacity>

        <TouchableOpacity style={styles.bottomToolBtn} onPress={() => { setIsDrawing(!isDrawing); setTimeout(() => canvasRef.current?.clear(), 100); }}>
          <Icon sfSymbol="pencil.tip" mdIcon="draw" size={22} color={isDrawing ? "#AF52DE" : colors.textSecondary} />
        </TouchableOpacity>

        <TouchableOpacity style={styles.bottomToolBtn} onPress={handleAttachFile}>
          <Icon sfSymbol="paperclip" mdIcon="paperclip" size={22} color={colors.textSecondary} />
        </TouchableOpacity>

        <View style={styles.toolbarDivider} />

        <TouchableOpacity style={[styles.bottomToolBtn, { backgroundColor: 'rgba(0, 122, 255, 0.1)', borderRadius: 20, paddingHorizontal: 12 }]} onPress={handleSparkAI}>
          <Icon sfSymbol="wand.and.stars" mdIcon="magic-staff" size={20} color="#007AFF" />
          <Text style={styles.sparkText}>Spark AI</Text>
        </TouchableOpacity>
    </View>
  );

  return (
    <SafeAreaView style={[styles.screenContainer, { backgroundColor: colors.background }]} edges={['top', 'left', 'right']}>
      <KeyboardAvoidingView behavior={isIOS ? 'padding' : 'height'} style={styles.container}>
        
        {/* HEADER */}
        <View style={styles.header}>
            {isIOS ? (
              <TouchableOpacity style={[styles.navBtn, {backgroundColor: isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.05)'}]} onPress={onClose}>
                 <Icon sfSymbol="chevron.backward" mdIcon="chevron-left" size={20} color={colors.text} />
              </TouchableOpacity>
            ) : (
              <IconButton icon="arrow-left" onPress={onClose} iconColor={colors.text} size={24} style={{ margin: 0 }} />
            )}
            
            <View style={styles.headerActions}>
                <TouchableOpacity style={styles.headerActionBtn} onPress={toggleFavorite}>
                  <Icon sfSymbol={isFavorite ? "star.fill" : "star"} mdIcon={isFavorite ? "star" : "star-outline"} size={20} color={isFavorite ? "#FFD700" : colors.text} />
                </TouchableOpacity>
                                <TouchableOpacity style={styles.headerActionBtn} onPress={handleDelete}>
                  <Icon sfSymbol="trash" mdIcon="trash-can-outline" size={20} color="#FF3B30" />
                </TouchableOpacity>
                <TouchableOpacity style={styles.headerActionBtn} onPress={toggleLock}>
                  <Icon sfSymbol={isLocked ? "lock.fill" : "lock.open"} mdIcon={isLocked ? "lock" : "lock-open-outline"} size={20} color={isLocked ? "#FF3B30" : colors.text} />
                </TouchableOpacity>
                <TouchableOpacity style={styles.headerActionBtn} onPress={handleShare}>
                  <Icon sfSymbol="person.crop.circle.badge.plus" mdIcon="account-group" size={21} color={colors.primary} />
                </TouchableOpacity>
                <TouchableOpacity style={[styles.doneBtn, { backgroundColor: colors.primary }]} onPress={() => { saveCurrentNote(); triggerHaptic('notificationSuccess'); onClose(); }}>
                   <Text style={styles.doneBtnText}>{t('Terminé')}</Text>
                </TouchableOpacity>
            </View>
        </View>

        <View style={styles.editorArea}>
          {/* BADGES QUICK SELECT */}
          <View style={styles.topBadgesScroll}>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.badgesContainer}>
                {["Travail", "Personnel", "Important", "Brouillon", "Idées"].map(badge => (
                  <TouchableOpacity key={badge} onPress={() => {
                    triggerHaptic('selection');
                    setBadges(prev => prev.includes(badge) ? prev.filter(b => b !== badge) : [...prev, badge]);
                  }} style={[
                    styles.badgeBtn, 
                    badges.includes(badge) ? { backgroundColor: colors.primary, borderColor: colors.primary } : { borderColor: colors.border }
                  ]}>
                    <Text style={[styles.badgeText, badges.includes(badge) ? { color: '#FFF' } : { color: colors.textSecondary }]}>
                      {badge}
                    </Text>
                  </TouchableOpacity>
                ))}
            </ScrollView>
          </View>

          <ScrollView showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
            {/* MAIN TEXT AREA */}
            <View style={styles.mainTextArea}>
              <TextInput
                inputAccessoryViewID={isIOS ? "toolbarAccessory" : undefined}
                style={[styles.titleInput, { color: colors.text }]}
                placeholder={t('Titre de la note')}
                placeholderTextColor={colors.textSecondary + '80'}
                value={title}
                onChangeText={setTitle}
                maxLength={100}
                multiline
              />
              <TextInput
                inputAccessoryViewID={isIOS ? "toolbarAccessory" : undefined}
                style={[styles.contentInput, { color: colors.text }]}
                placeholder={t('Commencez à écrire librement...')}
                placeholderTextColor={colors.textSecondary + '60'}
                value={content}
                onChangeText={setContent}
                multiline
                textAlignVertical="top"
                scrollEnabled={false}
              />
            </View>

            {/* ATTACHMENTS & DRAWINGS */}
            {(attachments.length > 0 || memoPath || drawingPaths.length > 0) && (
              <View style={styles.attachmentsSection}>
                {memoPath && (
                  <TouchableOpacity style={[styles.attachmentBubble, { backgroundColor: colors.card, borderColor: colors.border }]} onPress={playMemo}>
                    <Icon sfSymbol={isPlaying ? "pause.circle.fill" : "play.circle.fill"} mdIcon={isPlaying ? "pause-circle" : "play-circle"} size={24} color="#FF3B30" />
                    <View style={{ marginLeft: 10, flex: 1 }}>
                      <Text style={[styles.attachmentText, { color: colors.text }]}>{isPlaying ? "Lecture en cours" : "Mémo vocal"}</Text>
                      {memoDuration > 0 && (
                        <View style={{ flexDirection: 'row', alignItems: 'center', marginTop: 4 }}>
                          <View style={{ flex: 1, height: 4, backgroundColor: isDark ? '#333' : '#E5E5EA', borderRadius: 2, overflow: 'hidden' }}>
                            <View style={{ width: `${Math.min(100, Math.max(0, (playPosition / memoDuration) * 100))}%`, height: '100%', backgroundColor: '#FF3B30' }} />
                          </View>
                          <Text style={{ fontSize: 10, color: colors.textSecondary, marginLeft: 8, fontVariant: ['tabular-nums'] }}>
                            {Math.floor(playPosition / 60000)}:{(Math.floor((playPosition % 60000) / 1000)).toString().padStart(2, '0')}
                          </Text>
                        </View>
                      )}
                    </View>
                  </TouchableOpacity>
                )}
                
                {drawingPaths.map((path, i) => (
                  <View key={`draw-${i}`} style={[styles.attachmentBubble, { backgroundColor: colors.card, borderColor: colors.border }]}>
                    <Icon sfSymbol="paintbrush.fill" mdIcon="brush" size={20} color="#AF52DE" />
                    <Text style={[styles.attachmentText, { color: colors.text }]}>Dessin #{i + 1}</Text>
                  </View>
                ))}
                
                {attachments.map((att, i) => (
                  <View key={`att-${i}`} style={[styles.attachmentBubble, { backgroundColor: colors.card, borderColor: colors.border }]}>
                    <Icon sfSymbol="doc.fill" mdIcon="file-document" size={20} color="#007AFF" />
                    <Text style={[styles.attachmentText, { color: colors.text }]} numberOfLines={1}>{att.name || 'Pièce jointe'}</Text>
                  </View>
                ))}
              </View>
            )}

            {/* Canvas will sit directly below attachments when active */}
            {isDrawing && (
              <View style={[styles.canvasContainer, { backgroundColor: colors.card, borderColor: colors.border, height: 300, marginHorizontal: 20, marginBottom: 20, borderRadius: 16, overflow: 'hidden' }]}>
                <View style={[styles.canvasHeader, { borderBottomColor: colors.border, padding: 12, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }]}>
                  <Text style={[styles.canvasTitle, { color: colors.text, fontWeight: '600' }]}>Zone de dessin</Text>
                  <TouchableOpacity onPress={saveDrawing} style={[styles.canvasSaveBtn, { backgroundColor: colors.primary, paddingHorizontal: 12, paddingVertical: 6, borderRadius: 12, flexDirection: 'row', alignItems: 'center' }]}>
                    <Icon sfSymbol="checkmark" mdIcon="check" size={14} color="#FFF" />
                    <Text style={[styles.canvasSaveText, { color: '#FFF', marginLeft: 4, fontWeight: '600', fontSize: 13 }]}>Garder</Text>
                  </TouchableOpacity>
                </View>
                <SketchCanvas
                  ref={canvasRef}
                  style={{ flex: 1 }}
                  strokeColors={[{ color: canvasColor }]}
                  defaultStrokeIndex={0}
                  defaultStrokeWidth={4}
                  // We remove onStrokeEnd={saveDrawing} to prevent the crash caused by
                  // SketchCanvas calling the function with unexpected event args on stroke end.
                  // We also removed localSourceImage since it defaults to null effectively.
                />
              </View>
            )}
            
            {/* Spacer for bottom toolbar covering bottom scroll margin */}
            <View style={{ height: 100 }} />
          </ScrollView>
        </View>
        

        {/* Barre d'outils toujours visible en bas, sauf si clavier ouvert sur iOS (InputAccessoryView) */}
        {isIOS && isKeyboardVisible ? (
          <InputAccessoryView nativeID="toolbarAccessory" backgroundColor={isDark ? 'rgba(20,20,20,0.85)' : 'rgba(255,255,255,0.9)'}>
            {renderToolbarContent()}
          </InputAccessoryView>
        ) : (
          <View style={{ position: 'absolute', left: 0, right: 0, bottom: 0, zIndex: 100 }} pointerEvents="box-none">
            {renderToolbarContent()}
          </View>
        )}

      </KeyboardAvoidingView>

      
        <ShareModal
          visible={isShareModalVisible}
          onDeleteRequest={handleDelete}
          onClose={() => setIsShareModalVisible(false)}
          noteId={currentNoteId || ''}
          publicSlug={publicSlug}
          onUpdatePublicStatus={(slug) => setPublicSlug(slug)}
        />

        <PaywallModal 
        visible={paywallVisible} 
        featureName={paywallFeature} 
        onClose={() => setPaywallVisible(false)} 
        onUpgrade={() => {
          setPaywallVisible(false);
          onClose();
          navigation.navigate('SubscriptionScreen');
        }}
      />
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  screenContainer: { flex: 1 },
  container: { flex: 1 },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 12 },
  navBtn: { width: 36, height: 36, borderRadius: 18, alignItems: 'center', justifyContent: 'center' },
  headerActions: { flexDirection: 'row', alignItems: 'center' },
  headerActionBtn: { padding: 8, marginLeft: 4 },
  doneBtn: { paddingHorizontal: 16, paddingVertical: 8, borderRadius: 20, marginLeft: 12 },
  doneBtnText: { color: '#FFF', fontWeight: '600', fontSize: 15 },
  editorArea: { flex: 1 },
  topBadgesScroll: { marginBottom: 4 },
  badgesContainer: { paddingHorizontal: 16, paddingVertical: 8, alignItems: 'center' },
  badgeBtn: { paddingHorizontal: 14, paddingVertical: 6, borderRadius: 16, borderWidth: 1, marginRight: 8, backgroundColor: 'transparent' },
  badgeText: { fontSize: 13, fontWeight: '500' },
  mainTextArea: { flex: 1, paddingHorizontal: 20 },
  titleInput: { fontSize: 28, fontWeight: '800', fontFamily: Platform.OS === 'ios' ? 'System' : 'sans-serif', paddingTop: 10, paddingBottom: 10 },
  contentInput: { fontSize: 18, lineHeight: 28, fontWeight: '400', fontFamily: Platform.OS === 'ios' ? 'System' : 'sans-serif', paddingTop: 10, minHeight: 300 },
  attachmentsSection: { paddingHorizontal: 20, marginTop: 20, gap: 12 },
  attachmentBubble: { flexDirection: 'row', alignItems: 'center', padding: 12, borderRadius: 16, borderWidth: 1 },
  attachmentText: { marginLeft: 12, fontSize: 15, fontWeight: '500', flex: 1 },
  canvasContainer: { marginHorizontal: 20, marginTop: 20, height: 350, borderRadius: 16, borderWidth: 1, overflow: 'hidden' },
  canvasHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 10, borderBottomWidth: 1 },
  canvasTitle: { fontWeight: '600', fontSize: 15 },
  canvasSaveBtn: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#34C759', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 12 },
  canvasSaveText: { color: '#FFF', fontSize: 13, fontWeight: '600', marginLeft: 4 },
  canvas: { flex: 1, backgroundColor: 'transparent' },
  bottomToolbar: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-evenly', paddingTop: 12, paddingHorizontal: 8, borderTopWidth: 1 },
  bottomToolBtn: { padding: 10, flexDirection: 'row', alignItems: 'center', justifyContent: 'center' },
  toolbarDivider: { width: 1, height: 24, backgroundColor: '#ccc', opacity: 0.3, marginHorizontal: 4 },
  sparkText: { color: '#007AFF', fontWeight: '600', fontSize: 14, marginLeft: 6 }
});

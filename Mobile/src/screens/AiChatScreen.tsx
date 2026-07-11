import React, { useEffect, useMemo, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, TextInput, ActivityIndicator, Platform } from 'react-native';

import { GlassCard } from '../components/ui/GlassCard';
import { Icon } from '../components/ui/Icon';
import { FiipAction, FiipScreen, FiipToolbar } from '../components/ui/FiipNative';
import { generateText, getLastAIUsageStats, subscribeToAIUsage } from '../services/ai';
import { useAppTheme } from '../hooks/useAppTheme';
import { useNotesStore } from '../store/notesStore';
import { fiipRadius } from '../theme/fiipDesign';
import { triggerHaptic } from '../utils/hapticEngine';
import { getNoteMetrics } from '../utils/noteMetrics';

const quickPrompts = [
  { label: 'Résumer', prompt: 'Résume cette note en 4 points actionnables.', sfSymbol: 'text.alignleft', mdIcon: 'text-box-search-outline' },
  { label: 'Clarifier', prompt: 'Réécris cette note en français clair, précis et professionnel.', sfSymbol: 'pencil.and.outline', mdIcon: 'text-box-edit-outline' },
  { label: 'Plan', prompt: 'Transforme cette note en plan structuré avec prochaines actions.', sfSymbol: 'list.bullet', mdIcon: 'format-list-bulleted' },
];

export function AiChatScreen({ navigation }: any) {
  const { colors } = useAppTheme();
  const isIOS = Platform.OS === 'ios';
  const notesById = useNotesStore((state) => state.notes);
  const updateNote = useNotesStore((state) => state.updateNote);
  const notes = useMemo(
    () => Object.values(notesById)
      .filter((note: any) => !note.deleted_at)
      .sort((a: any, b: any) => new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime()),
    [notesById],
  );
  const activeNote = notes[0];
  const activeNoteMetrics = useMemo(() => getNoteMetrics(activeNote?.content || ''), [activeNote?.content]);

  const [input, setInput] = useState('');
  const [answer, setAnswer] = useState('Choisissez une action rapide ou demandez une reformulation.');
  const [loading, setLoading] = useState(false);
  const [usage, setUsage] = useState<any>(getLastAIUsageStats());

  useEffect(() => {
    const unsubscribe = subscribeToAIUsage(setUsage);
    return () => {
      unsubscribe();
    };
  }, []);

  const usageLabel = useMemo(() => {
    const raw = usage?.usage;
    const prompt = raw?.prompt_tokens ?? raw?.tokens_prompt ?? raw?.native_tokens_prompt;
    const completion = raw?.completion_tokens ?? raw?.tokens_completion ?? raw?.native_tokens_completion;
    if (usage?.model) {
      return `Modèle utilisé : ${usage.model}`;
    }
    if (!prompt && !completion) {
      return 'Aucune génération mesurée';
    }
    return `${prompt || 0} entrée / ${completion || 0} sortie`;
  }, [usage]);

  const askFiip = async (prompt: string) => {
    if (!prompt.trim() || loading) {
      return;
    }

    if (activeNote?.is_locked || activeNote?.encrypted_content) {
      setAnswer('Cette note est protégée. Déverrouillez-la avant de demander à Dexter de la lire ou de la modifier.');
      return;
    }

    triggerHaptic('impactLight');
    setLoading(true);

    try {
      const response = await generateText({
        messages: [
          { role: 'system', content: 'Tu es Dexter, assistant éditorial de Fiip. Réponds en français, de façon concise et directement exploitable.' },
          { role: 'user', content: `Note active:\n${activeNote?.content || ''}\n\nDemande:\n${prompt}` },
        ],
      });
      setAnswer(response || 'Aucune réponse exploitable.');
    } catch (error: any) {
      setAnswer(error?.message || "L'assistant n'a pas pu répondre. Réessayez dans un instant.");
    } finally {
      setLoading(false);
      setInput('');
    }
  };

  const replaceNote = () => {
    if (!activeNote || !answer.trim()) {
      return;
    }
    triggerHaptic('notificationSuccess');
    updateNote(activeNote.id, { content: answer });
    navigation.navigate('NoteEditor', { noteToEdit: { ...activeNote, content: answer } });
  };

  return (
    <FiipScreen>
      <View style={styles.header}>
        <TouchableOpacity accessibilityRole="button" accessibilityLabel="Retour" onPress={() => navigation.goBack()} style={styles.iconButton}>
          <Icon sfSymbol="chevron.left" mdIcon="chevron-left" size={22} color={colors.text} />
        </TouchableOpacity>
        <View>
          <Text style={[styles.kicker, { color: colors.textSecondary }]}>Dexter</Text>
          <Text style={[styles.title, { color: colors.text }]}>Assistant</Text>
        </View>
        <Icon sfSymbol="sparkles" mdIcon="robot-outline" size={24} color={colors.primary} style={styles.headerIcon} />
      </View>

      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <GlassCard intensity={isIOS ? 38 : 0} cornerRadius={isIOS ? fiipRadius.xl : 28} interactive style={styles.noteCard}>
          <Text style={[styles.cardLabel, { color: colors.textSecondary }]}>Note active</Text>
          <Text style={[styles.noteTitle, { color: colors.text }]}>{activeNote?.title || 'Aucune note'}</Text>
          <Text style={[styles.noteText, { color: colors.textSecondary }]} numberOfLines={4}>{activeNoteMetrics.plainText || 'Créez une note pour obtenir une aide contextuelle.'}</Text>
        </GlassCard>

        <View style={styles.quickGrid}>
          {quickPrompts.map((item) => (
            <FiipAction
              key={item.label}
              label={item.label}
              sfSymbol={item.sfSymbol}
              mdIcon={item.mdIcon}
              onPress={() => askFiip(item.prompt)}
              style={styles.quickItem}
            />
          ))}
        </View>

        <GlassCard intensity={isIOS ? 34 : 0} cornerRadius={isIOS ? fiipRadius.xl : 28} interactive style={styles.answerCard}>
          <View style={styles.answerHeader}>
            <Text style={[styles.cardLabel, { color: colors.textSecondary }]}>Réponse</Text>
            {loading && <ActivityIndicator size="small" color={colors.primary} />}
          </View>
          <Text style={[styles.answerText, { color: colors.text }]}>{answer}</Text>
          <TouchableOpacity accessibilityRole="button" onPress={replaceNote} activeOpacity={0.78} style={[isIOS ? styles.replaceButton : styles.replaceButtonAndroid, { backgroundColor: isIOS ? colors.primary : colors.primary }]}>
            <Text style={styles.replaceText}>Remplacer la note</Text>
          </TouchableOpacity>
        </GlassCard>

        <GlassCard intensity={isIOS ? 20 : 0} cornerRadius={isIOS ? fiipRadius.lg : 20} style={styles.usageCard}>
          <Text style={[styles.cardLabel, { color: colors.textSecondary }]}>Statistiques d’utilisation</Text>
          <Text style={[styles.usageText, { color: colors.text }]}>{usageLabel}</Text>
          <Text style={[styles.noteText, { color: colors.textSecondary }]}>Les réponses peuvent être limitées selon l’activité du service et de votre compte.</Text>
        </GlassCard>
      </ScrollView>

      <View style={styles.composer}>
        <FiipToolbar style={styles.inputCard}>
          <TextInput
            value={input}
            onChangeText={setInput}
            onSubmitEditing={() => askFiip(input)}
            placeholder="Demander à Dexter..."
            placeholderTextColor={colors.textSecondary}
            style={[styles.input, { color: colors.text }]}
            returnKeyType="send"
          />
          <TouchableOpacity accessibilityRole="button" accessibilityLabel="Envoyer" onPress={() => askFiip(input)} style={[styles.sendButton, { backgroundColor: isIOS ? colors.primary : colors.primaryContainer }]}>
            <Icon sfSymbol="arrow.up" mdIcon="arrow-up" size={18} color={isIOS ? '#FFF' : colors.onPrimaryContainer} />
          </TouchableOpacity>
        </FiipToolbar>
      </View>
    </FiipScreen>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: { paddingHorizontal: 20, paddingTop: 8, paddingBottom: 14, flexDirection: 'row', alignItems: 'center', gap: 14 },
  iconButton: { width: 40, height: 40, alignItems: 'center', justifyContent: 'center' },
  kicker: { fontSize: 11, fontWeight: '800', textTransform: 'uppercase', letterSpacing: 0.8 },
  title: { fontSize: 24, fontWeight: '900' },
  headerIcon: { marginLeft: 'auto' },
  content: { paddingHorizontal: 20, paddingBottom: 132, gap: 14 },
  noteCard: { padding: 18 },
  cardLabel: { fontSize: 11, fontWeight: '800', textTransform: 'uppercase', letterSpacing: 0.8 },
  noteTitle: { marginTop: 8, fontSize: 22, fontWeight: '900' },
  noteText: { marginTop: 8, fontSize: 14, lineHeight: 21 },
  quickGrid: { flexDirection: 'row', gap: 10 },
  quickItem: { flex: 1 },
  answerCard: { padding: 18 },
  answerHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  answerText: { marginTop: 12, fontSize: 16, lineHeight: 24 },
  replaceButton: { marginTop: 16, height: 46, borderRadius: 23, alignItems: 'center', justifyContent: 'center' },
  replaceButtonAndroid: { marginTop: 16, height: 48, borderRadius: 24, alignItems: 'center', justifyContent: 'center', elevation: 1 },
  replaceText: { color: '#FFF', fontWeight: '900' },
  usageCard: { padding: 16 },
  usageText: { marginTop: 8, fontSize: 18, fontWeight: '900' },
  composer: { position: 'absolute', left: 16, right: 16, bottom: 24 },
  inputCard: { minHeight: 58, paddingLeft: 14, paddingRight: 8 },
  input: { flex: 1, fontSize: 16, paddingVertical: 12 },
  sendButton: { width: 42, height: 42, borderRadius: Platform.OS === 'android' ? 14 : 21, alignItems: 'center', justifyContent: 'center' },
});

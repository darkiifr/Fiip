import React, { useEffect, useMemo, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, TextInput, ActivityIndicator, Platform } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { GlassCard } from '../components/ui/GlassCard';
import { Icon } from '../components/ui/Icon';
import { FREE_MODEL_ROUTER, generateText, getLastAIUsageStats, subscribeToAIUsage } from '../services/ai';
import { useAppTheme } from '../hooks/useAppTheme';
import { useNotesStore } from '../store/notesStore';
import { fiipRadius } from '../theme/fiipDesign';
import { triggerHaptic } from '../utils/hapticEngine';

const quickPrompts = [
  { label: 'Résumer', prompt: 'Résume cette note en 4 points actionnables.' },
  { label: 'Clarifier', prompt: 'Réécris cette note en français clair, précis et professionnel.' },
  { label: 'Plan', prompt: 'Transforme cette note en plan structuré avec prochaines actions.' },
];

export function AiChatScreen({ navigation }: any) {
  const { colors } = useAppTheme();
  const isIOS = Platform.OS === 'ios';
  const notes = useNotesStore((state) => state.getNotesList());
  const updateNote = useNotesStore((state) => state.updateNote);
  const activeNote = notes[0];

  const [input, setInput] = useState('');
  const [answer, setAnswer] = useState('Choisissez une action rapide ou demandez une reformulation. Fiip utilise uniquement le routeur gratuit OpenRouter.');
  const [loading, setLoading] = useState(false);
  const [usage, setUsage] = useState<any>(getLastAIUsageStats());

  useEffect(() => subscribeToAIUsage(setUsage), []);

  const usageLabel = useMemo(() => {
    const raw = usage?.usage;
    const prompt = raw?.prompt_tokens ?? raw?.tokens_prompt ?? raw?.native_tokens_prompt;
    const completion = raw?.completion_tokens ?? raw?.tokens_completion ?? raw?.native_tokens_completion;
    if (!prompt && !completion) {
      return 'Aucune génération mesurée';
    }
    return `${prompt || 0} entrée / ${completion || 0} sortie`;
  }, [usage]);

  const askFiip = async (prompt: string) => {
    if (!prompt.trim() || loading) {
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
      setAnswer(error?.message || 'Erreur OpenRouter.');
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
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]} edges={['top', 'left', 'right']}>
      <View style={styles.header}>
        <TouchableOpacity accessibilityRole="button" accessibilityLabel="Retour" onPress={() => navigation.goBack()} style={styles.iconButton}>
          <Icon sfSymbol="chevron.left" mdIcon="chevron-left" size={22} color={colors.text} />
        </TouchableOpacity>
        <View>
          <Text style={[styles.kicker, { color: colors.textSecondary }]}>Dexter</Text>
          <Text style={[styles.title, { color: colors.text }]}>Assistant gratuit</Text>
        </View>
        <View style={[styles.routerPill, { borderColor: colors.border }]}>
          <Text style={[styles.routerText, { color: colors.textSecondary }]}>{FREE_MODEL_ROUTER}</Text>
        </View>
      </View>

      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <GlassCard intensity={isIOS ? 38 : 0} cornerRadius={isIOS ? fiipRadius.xl : 28} interactive style={styles.noteCard}>
          <Text style={[styles.cardLabel, { color: colors.textSecondary }]}>Note active</Text>
          <Text style={[styles.noteTitle, { color: colors.text }]}>{activeNote?.title || 'Aucune note'}</Text>
          <Text style={[styles.noteText, { color: colors.textSecondary }]} numberOfLines={4}>{activeNote?.content || 'Créez une note pour obtenir une aide contextuelle.'}</Text>
        </GlassCard>

        <View style={styles.quickGrid}>
          {quickPrompts.map((item) => (
            <TouchableOpacity key={item.label} accessibilityRole="button" activeOpacity={0.78} onPress={() => askFiip(item.prompt)} style={styles.quickItem}>
              <GlassCard intensity={isIOS ? 24 : 0} cornerRadius={isIOS ? fiipRadius.md : 20} interactive style={styles.quickCard}>
                <Icon sfSymbol="sparkles" mdIcon="sparkles" size={16} color={colors.primary} />
                <Text style={[styles.quickText, { color: colors.text }]}>{item.label}</Text>
              </GlassCard>
            </TouchableOpacity>
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
          <Text style={[styles.noteText, { color: colors.textSecondary }]}>Coûts limités par le routeur gratuit OpenRouter et les limites du compte.</Text>
        </GlassCard>
      </ScrollView>

      <View style={styles.composer}>
        <GlassCard intensity={isIOS ? 36 : 0} cornerRadius={isIOS ? 28 : 28} interactive style={styles.inputCard}>
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
        </GlassCard>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: { paddingHorizontal: 20, paddingTop: 8, paddingBottom: 14, flexDirection: 'row', alignItems: 'center', gap: 14 },
  iconButton: { width: 40, height: 40, alignItems: 'center', justifyContent: 'center' },
  kicker: { fontSize: 11, fontWeight: '800', textTransform: 'uppercase', letterSpacing: 0.8 },
  title: { fontSize: 24, fontWeight: '900' },
  routerPill: { marginLeft: 'auto', borderWidth: 1, borderRadius: 999, paddingHorizontal: 10, paddingVertical: 6 },
  routerText: { fontSize: 11, fontWeight: '800' },
  content: { paddingHorizontal: 20, paddingBottom: 132, gap: 14 },
  noteCard: { padding: 18 },
  cardLabel: { fontSize: 11, fontWeight: '800', textTransform: 'uppercase', letterSpacing: 0.8 },
  noteTitle: { marginTop: 8, fontSize: 22, fontWeight: '900' },
  noteText: { marginTop: 8, fontSize: 14, lineHeight: 21 },
  quickGrid: { flexDirection: 'row', gap: 10 },
  quickItem: { flex: 1 },
  quickCard: { paddingVertical: 14, alignItems: 'center', gap: 8 },
  quickText: { fontSize: 12, fontWeight: '800' },
  answerCard: { padding: 18 },
  answerHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  answerText: { marginTop: 12, fontSize: 16, lineHeight: 24 },
  replaceButton: { marginTop: 16, height: 46, borderRadius: 23, alignItems: 'center', justifyContent: 'center' },
  replaceButtonAndroid: { marginTop: 16, height: 48, borderRadius: 24, alignItems: 'center', justifyContent: 'center', elevation: 1 },
  replaceText: { color: '#FFF', fontWeight: '900' },
  usageCard: { padding: 16 },
  usageText: { marginTop: 8, fontSize: 18, fontWeight: '900' },
  composer: { position: 'absolute', left: 16, right: 16, bottom: 24 },
  inputCard: { minHeight: 58, flexDirection: 'row', alignItems: 'center', paddingLeft: 18, paddingRight: 8 },
  input: { flex: 1, fontSize: 16, paddingVertical: 12 },
  sendButton: { width: 42, height: 42, borderRadius: Platform.OS === 'android' ? 14 : 21, alignItems: 'center', justifyContent: 'center' },
});

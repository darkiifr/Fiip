import AsyncStorage from '@react-native-async-storage/async-storage';
import React, { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';

import { authService } from '../services/supabase';
import {
  createPassphraseVerifier,
  getZeroKnowledgePassphrase,
  unlockWithPassphrase,
} from '../services/zeroKnowledge';

const VERIFIER_PREFIX = 'fiip-zk-verifier:';

export function ZeroKnowledgeGate({ children }: { children: React.ReactNode }) {
  const [loading, setLoading] = useState(true);
  const [userId, setUserId] = useState<string | null>(null);
  const [verifier, setVerifier] = useState<string | null>(null);
  const [passphrase, setPassphrase] = useState('');
  const [confirmation, setConfirmation] = useState('');
  const [error, setError] = useState('');
  const [unlocked, setUnlocked] = useState(Boolean(getZeroKnowledgePassphrase()));

  useEffect(() => {
    let active = true;
    const load = async () => {
      const user = await authService.getUser();
      if (!active) return;
      if (!user) {
        setLoading(false);
        return;
      }
      const nextVerifier = await AsyncStorage.getItem(`${VERIFIER_PREFIX}${user.id}`);
      if (!active) return;
      setUserId(user.id);
      setVerifier(nextVerifier);
      setLoading(false);
    };
    void load();
    const subscription = authService.onAuthStateChange(() => void load());
    return () => {
      active = false;
      subscription?.data?.subscription?.unsubscribe?.();
    };
  }, []);

  const submit = async () => {
    setError('');
    try {
      if (!userId) return;
      if (!verifier) {
        if (passphrase !== confirmation) throw new Error('Les phrases secrètes ne correspondent pas.');
        const nextVerifier = await createPassphraseVerifier(passphrase);
        await AsyncStorage.setItem(`${VERIFIER_PREFIX}${userId}`, nextVerifier);
        setVerifier(nextVerifier);
      } else {
        await unlockWithPassphrase(passphrase, verifier);
      }
      setPassphrase('');
      setConfirmation('');
      setUnlocked(true);
    } catch (submitError) {
      setError(submitError instanceof Error ? submitError.message : 'Déverrouillage impossible.');
    }
  };

  if (loading) {
    return <View style={styles.center}><ActivityIndicator color="#0A84FF" /></View>;
  }
  if (!userId || unlocked) return <>{children}</>;

  const setup = !verifier;
  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      style={styles.container}
    >
      <View style={styles.panel}>
        <Text style={styles.title}>{setup ? 'Protéger la synchronisation' : 'Déverrouiller Fiip'}</Text>
        <Text style={styles.body}>
          {setup
            ? 'Cette phrase chiffre vos notes et fichiers avant leur envoi. Fiip ne peut pas la récupérer.'
            : 'Saisissez votre phrase Fiip pour déchiffrer les données synchronisées.'}
        </Text>
        <TextInput
          autoCapitalize="none"
          autoCorrect={false}
          onChangeText={setPassphrase}
          placeholder="Phrase secrète Fiip"
          placeholderTextColor="#77777D"
          secureTextEntry
          style={styles.input}
          value={passphrase}
        />
        {setup ? (
          <TextInput
            autoCapitalize="none"
            autoCorrect={false}
            onChangeText={setConfirmation}
            placeholder="Confirmer la phrase secrète"
            placeholderTextColor="#77777D"
            secureTextEntry
            style={styles.input}
            value={confirmation}
          />
        ) : null}
        {error ? <Text style={styles.error}>{error}</Text> : null}
        <Pressable
          accessibilityRole="button"
          disabled={passphrase.length < 8 || (setup && confirmation.length < 8)}
          onPress={() => void submit()}
          style={({ pressed }) => [
            styles.button,
            pressed && styles.buttonPressed,
            (passphrase.length < 8 || (setup && confirmation.length < 8)) && styles.buttonDisabled,
          ]}
        >
          <Text style={styles.buttonText}>{setup ? 'Activer la synchronisation' : 'Déverrouiller'}</Text>
        </Pressable>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  body: { color: '#B8B8BE', fontSize: 15, lineHeight: 21, marginBottom: 20 },
  button: { alignItems: 'center', backgroundColor: '#0A84FF', borderRadius: 7, paddingVertical: 13 },
  buttonDisabled: { opacity: 0.4 },
  buttonPressed: { opacity: 0.78 },
  buttonText: { color: '#FFFFFF', fontSize: 15, fontWeight: '700' },
  center: { alignItems: 'center', backgroundColor: '#0A0A0A', flex: 1, justifyContent: 'center' },
  container: { backgroundColor: '#0A0A0A', flex: 1, justifyContent: 'center', padding: 24 },
  error: { color: '#FF6961', fontSize: 13, marginBottom: 12 },
  input: { borderColor: '#48484A', borderRadius: 7, borderWidth: 1, color: '#FFFFFF', marginBottom: 12, paddingHorizontal: 14, paddingVertical: 12 },
  panel: { backgroundColor: '#1C1C1E', borderColor: '#35353A', borderRadius: 8, borderWidth: 1, padding: 22 },
  title: { color: '#FFFFFF', fontSize: 24, fontWeight: '700', marginBottom: 10 },
});

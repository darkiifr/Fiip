import React, { useCallback, useState } from 'react';
import { useSignIn, useSignUp, useSSO } from '@clerk/expo';
import { View, Text, StyleSheet, TouchableOpacity, Platform, Alert, ActivityIndicator } from 'react-native';
import { GlassModal } from '../components/ui/GlassModal';
import { GlassInput } from '../components/ui/GlassInput';
import { Icon } from '../components/ui/Icon';
import { triggerHaptic } from '../utils/hapticEngine';
import { useTranslation } from 'react-i18next';
import { useAppTheme } from '../hooks/useAppTheme';
import { dataService, supabase } from '../services/supabase';
import { useNotesStore } from '../store/notesStore';
import { startGoogleOAuth, subscribeGoogleOAuthResults } from '../services/googleAuth';
import { isMobileClerkConfigured, isMobilePasskeyConfigured } from '../providers/ClerkSupabaseProvider';

interface SupabaseAuthScreenProps {
  route?: unknown;
  navigation?: { goBack?: () => void };
  visible?: boolean;
  onClose?: () => void;
}

type ClerkAuthResource = {
  status?: string;
  finalize?: (options: { navigate: () => undefined }) => Promise<unknown>;
};

function getErrorMessage(error: unknown, fallback: string) {
  const value = error as { errors?: Array<{ longMessage?: string; message?: string }>; message?: string };
  return value?.errors?.[0]?.longMessage || value?.errors?.[0]?.message || value?.message || fallback;
}

const ClerkAuthScreen: React.FC<SupabaseAuthScreenProps> = (props) => {
  const { t } = useTranslation();
  const navigation = props.navigation;
  const isIOS = Platform.OS === 'ios';
  const onClose = useCallback(() => {
    if (props.onClose) {
      props.onClose();
      return;
    }
    navigation?.goBack?.();
  }, [navigation, props]);
  const visible = props.visible ?? true;
  const { colors, isDark } = useAppTheme();
  const syncWithCloud = useNotesStore((state) => state.syncWithCloud);
  
  const [isLogin, setIsLogin] = useState(true);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [verificationCode, setVerificationCode] = useState('');
  const [awaitingVerification, setAwaitingVerification] = useState(false);
  const [loading, setLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);
  const [passkeyLoading, setPasskeyLoading] = useState(false);
  const clerkEnabled = true;
  const { signIn, fetchStatus: signInStatus } = useSignIn();
  const { signUp, fetchStatus: signUpStatus } = useSignUp();
  const { startSSOFlow } = useSSO();

  const handleGoogleAuth = async () => {
    setGoogleLoading(true);
    try {
      const { createdSessionId, setActive, signUp: ssoSignUp } = await startSSOFlow({
        strategy: 'oauth_google',
      });
      if (!createdSessionId) {
        if (ssoSignUp?.status === 'missing_requirements') {
          throw new Error(t('Le compte Google ne fournit pas toutes les informations requises.'));
        }
        return;
      }
      await setActive?.({ session: createdSessionId });
      await finishCloudAuth();
    } catch (err: unknown) {
      triggerHaptic('notificationError');
      Alert.alert(t('Erreur'), getErrorMessage(err, t('Une erreur est survenue.')));
    } finally {
      setGoogleLoading(false);
    }
  };

  const finishCloudAuth = async () => {
    await dataService.fetchProfile().catch(() => null);
    await syncWithCloud().catch(() => null);
    triggerHaptic('notificationSuccess');
    onClose();
  };

  const finalizeClerkAuth = async (resource: ClerkAuthResource) => {
    if (resource?.status !== 'complete') return false;
    await resource.finalize?.({ navigate: () => undefined });
    await finishCloudAuth();
    return true;
  };

  const handlePasskeyAuth = async () => {
    setPasskeyLoading(true);
    try {
      const { error } = await signIn.passkey();
      if (error) throw error;
      if (!await finalizeClerkAuth(signIn)) {
        throw new Error(t('Connexion passkey incomplete.'));
      }
    } catch (err: unknown) {
      triggerHaptic('notificationError');
      Alert.alert(t('Erreur'), getErrorMessage(err, t('Connexion passkey impossible.')));
    } finally {
      setPasskeyLoading(false);
    }
  };

  const handleAuth = async () => {
    if (!email.trim() || !password.trim()) {
      triggerHaptic('notificationError');
      Alert.alert(t('Erreur'), t('Veuillez remplir tous les champs.'));
      return;
    }
    
    setLoading(true);
    triggerHaptic('impactMedium');
    
    try {
      if (clerkEnabled) {
        if (awaitingVerification && !isLogin) {
          const { error } = await signUp.verifications.verifyEmailCode({ code: verificationCode.trim() });
          if (error) throw error;
          if (await finalizeClerkAuth(signUp)) return;
          throw new Error(t('Verification incomplete.'));
        }

        if (isLogin) {
          const { error } = await signIn.password({ emailAddress: email.trim(), password });
          if (error) throw error;
          if (await finalizeClerkAuth(signIn)) return;
          throw new Error(t('Connexion Clerk incomplete.'));
        }

        const { error } = await signUp.password({ emailAddress: email.trim(), password });
        if (error) throw error;
        await signUp.verifications.sendEmailCode();
        setAwaitingVerification(true);
        Alert.alert(t('Verification'), t('Entrez le code recu par e-mail pour terminer la creation du compte.'));
        return;
      }

      let error;
      if (isLogin) {
        ({ error } = await supabase.auth.signInWithPassword({ email, password }));
      } else {
        ({ error } = await supabase.auth.signUp({ email, password }));
      }

      if (error) throw error;

      await finishCloudAuth();
      Alert.alert(t('Succès'), isLogin ? t('Connexion réussie.') : t('Inscription réussie. Vérifiez vos emails si nécessaire.'));
    } catch (err: unknown) {
      triggerHaptic('notificationError');
      Alert.alert(t('Erreur'), getErrorMessage(err, t('Une erreur est survenue.')));
    } finally {
      setLoading(false);
    }
  };

  return (
    <GlassModal visible={visible} onClose={onClose} title={isLogin ? t('Connexion cloud Fiip') : t('Créer un compte')}>
      <View style={styles.container}>
        <View style={styles.headerIconContainer}>
             <Icon sfSymbol="cloud.fill" mdIcon="cloud" size={48} color={colors.primary} />
        </View>
        <Text style={[isIOS ? styles.descIOS : styles.descAndroid, { color: colors.textSecondary }]}>
          {isLogin 
            ? t('Connectez-vous pour synchroniser vos mémos ou croquis en temps réel sur tous vos appareils.')
            : t('Créez un compte pour profiter d\'une synchronisation cloud robuste, sans aucune perte de données.')}
        </Text>

        <GlassInput 
          placeholder={t('Adresse e-mail')}
          value={email}
          onChangeText={setEmail}
          autoCapitalize="none"
          keyboardType="email-address"
          icon={<Icon sfSymbol="envelope.fill" mdIcon="email" size={20} color={colors.textSecondary} />}
        />
        
        <View style={{height: 4}} />

        <GlassInput 
          placeholder={t('Mot de passe')}
          value={password}
          onChangeText={setPassword}
          secureTextEntry
          icon={<Icon sfSymbol="lock.fill" mdIcon="lock" size={20} color={colors.textSecondary} />}
        />

        {awaitingVerification && !isLogin ? (
          <>
            <View style={{height: 4}} />
            <GlassInput
              placeholder={t('Code e-mail')}
              value={verificationCode}
              onChangeText={setVerificationCode}
              keyboardType="number-pad"
              icon={<Icon sfSymbol="number" mdIcon="numeric" size={20} color={colors.textSecondary} />}
            />
          </>
        ) : null}

        <View style={styles.actions}>
          <TouchableOpacity style={[styles.btnSecondary, styles.googleButton, { borderColor: colors.textSecondary }]} onPress={handleGoogleAuth} disabled={loading || googleLoading} accessibilityLabel={t('Continuer avec Google')}>
            {googleLoading ? <ActivityIndicator color={colors.primary} /> : <Text style={[isIOS ? styles.btnSecTextIOS : styles.btnSecTextAndroid, { color: colors.text }]}>{t('Continuer avec Google')}</Text>}
          </TouchableOpacity>
          {isMobilePasskeyConfigured() ? (
            <TouchableOpacity style={[styles.btnSecondary, styles.googleButton, { borderColor: colors.textSecondary }]} onPress={handlePasskeyAuth} disabled={loading || passkeyLoading} accessibilityLabel={t('Se connecter avec une passkey')}>
              {passkeyLoading ? <ActivityIndicator color={colors.primary} /> : <Text style={[isIOS ? styles.btnSecTextIOS : styles.btnSecTextAndroid, { color: colors.text }]}>{t('Se connecter avec une passkey')}</Text>}
            </TouchableOpacity>
          ) : null}
          <TouchableOpacity 
            style={[styles.btnPrimary, isIOS ? styles.btnPrimaryIOS : styles.btnPrimaryAndroid, { backgroundColor: colors.primary }]} 
            onPress={handleAuth}
            disabled={loading || signInStatus === 'fetching' || signUpStatus === 'fetching'}
          >
            {loading ? <ActivityIndicator color="#fff" /> : (
              <Text style={[isIOS ? styles.btnTextIOS : styles.btnTextAndroid, { color: '#ffffff' }]}>
                {awaitingVerification && !isLogin ? t('Verifier le code') : (isLogin ? t('Se connecter') : t('Créer mon compte'))}
              </Text>
            )}
          </TouchableOpacity>

          <TouchableOpacity 
            style={[styles.btnSecondary, isIOS ? styles.btnSecondaryIOS : undefined, { backgroundColor: isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.04)' }]} 
            onPress={() => {
              triggerHaptic('selection');
              setIsLogin(!isLogin);
              setAwaitingVerification(false);
              setVerificationCode('');
            }}
            disabled={loading}
          >
            <Text style={[isIOS ? styles.btnSecTextIOS : styles.btnSecTextAndroid, { color: colors.primary }]}>
              {isLogin ? t("Je n'ai pas de compte") : t("J'ai déjà un compte")}
            </Text>
          </TouchableOpacity>
        </View>
        <View nativeID="clerk-captcha" />
      </View>
    </GlassModal>
  );
};

const LegacySupabaseAuthScreen: React.FC<SupabaseAuthScreenProps> = (props) => {
  const { t } = useTranslation();
  const navigation = props.navigation;
  const isIOS = Platform.OS === 'ios';
  const onClose = useCallback(() => {
    if (props.onClose) {
      props.onClose();
      return;
    }
    navigation?.goBack?.();
  }, [navigation, props]);
  const visible = props.visible ?? true;
  const { colors, isDark } = useAppTheme();
  const syncWithCloud = useNotesStore((state) => state.syncWithCloud);
  const [isLogin, setIsLogin] = useState(true);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);

  const finishGoogleAuth = useCallback(() => {
    triggerHaptic('notificationSuccess');
    setGoogleLoading(false);
    onClose();
  }, [onClose]);

  React.useEffect(() => subscribeGoogleOAuthResults(
    finishGoogleAuth,
    error => { setGoogleLoading(false); triggerHaptic('notificationError'); Alert.alert(t('Erreur'), error.message); },
  ), [finishGoogleAuth, t]);

  const handleGoogleAuth = async () => {
    setGoogleLoading(true);
    try { await startGoogleOAuth(); }
    catch (err: unknown) {
      setGoogleLoading(false);
      triggerHaptic('notificationError');
      Alert.alert(t('Erreur'), getErrorMessage(err, t('Une erreur est survenue.')));
    }
  };

  const handleAuth = async () => {
    if (!email.trim() || !password.trim()) {
      triggerHaptic('notificationError');
      Alert.alert(t('Erreur'), t('Veuillez remplir tous les champs.'));
      return;
    }
    setLoading(true);
    triggerHaptic('impactMedium');
    try {
      let error;
      if (isLogin) {
        ({ error } = await supabase.auth.signInWithPassword({ email, password }));
      } else {
        ({ error } = await supabase.auth.signUp({ email, password }));
      }
      if (error) throw error;
      await dataService.fetchProfile().catch(() => null);
      await syncWithCloud().catch(() => null);
      triggerHaptic('notificationSuccess');
      Alert.alert(t('Succès'), isLogin ? t('Connexion réussie.') : t('Inscription réussie. Vérifiez vos emails si nécessaire.'));
      onClose();
    } catch (err: unknown) {
      triggerHaptic('notificationError');
      Alert.alert(t('Erreur'), getErrorMessage(err, t('Une erreur est survenue.')));
    } finally {
      setLoading(false);
    }
  };

  return (
    <GlassModal visible={visible} onClose={onClose} title={isLogin ? t('Connexion cloud Fiip') : t('Créer un compte')}>
      <View style={styles.container}>
        <View style={styles.headerIconContainer}>
          <Icon sfSymbol="cloud.fill" mdIcon="cloud" size={48} color={colors.primary} />
        </View>
        <Text style={[isIOS ? styles.descIOS : styles.descAndroid, { color: colors.textSecondary }]}>
          {isLogin
            ? t('Connectez-vous pour synchroniser vos mémos ou croquis en temps réel sur tous vos appareils.')
            : t('Créez un compte pour profiter d\'une synchronisation cloud robuste, sans aucune perte de données.')}
        </Text>
        <GlassInput
          placeholder={t('Adresse e-mail')}
          value={email}
          onChangeText={setEmail}
          autoCapitalize="none"
          keyboardType="email-address"
          icon={<Icon sfSymbol="envelope.fill" mdIcon="email" size={20} color={colors.textSecondary} />}
        />
        <View style={{height: 4}} />
        <GlassInput
          placeholder={t('Mot de passe')}
          value={password}
          onChangeText={setPassword}
          secureTextEntry
          icon={<Icon sfSymbol="lock.fill" mdIcon="lock" size={20} color={colors.textSecondary} />}
        />
        <View style={styles.actions}>
          <TouchableOpacity style={[styles.btnSecondary, styles.googleButton, { borderColor: colors.textSecondary }]} onPress={handleGoogleAuth} disabled={loading || googleLoading} accessibilityLabel={t('Continuer avec Google')}>
            {googleLoading ? <ActivityIndicator color={colors.primary} /> : <Text style={[isIOS ? styles.btnSecTextIOS : styles.btnSecTextAndroid, { color: colors.text }]}>{t('Continuer avec Google')}</Text>}
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.btnPrimary, isIOS ? styles.btnPrimaryIOS : styles.btnPrimaryAndroid, { backgroundColor: colors.primary }]}
            onPress={handleAuth}
            disabled={loading}
          >
            {loading ? <ActivityIndicator color="#fff" /> : (
              <Text style={[isIOS ? styles.btnTextIOS : styles.btnTextAndroid, { color: '#ffffff' }]}>
                {isLogin ? t('Se connecter') : t('Créer mon compte')}
              </Text>
            )}
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.btnSecondary, isIOS ? styles.btnSecondaryIOS : undefined, { backgroundColor: isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.04)' }]}
            onPress={() => {
              triggerHaptic('selection');
              setIsLogin(!isLogin);
            }}
            disabled={loading}
          >
            <Text style={[isIOS ? styles.btnSecTextIOS : styles.btnSecTextAndroid, { color: colors.primary }]}>
              {isLogin ? t("Je n'ai pas de compte") : t("J'ai déjà un compte")}
            </Text>
          </TouchableOpacity>
        </View>
      </View>
    </GlassModal>
  );
};

export const SupabaseAuthScreen: React.FC<SupabaseAuthScreenProps> = (props) => {
  if (!isMobileClerkConfigured()) {
    return <LegacySupabaseAuthScreen {...props} />;
  }
  return <ClerkAuthScreen {...props} />;
};

const styles = StyleSheet.create({
  actions: {
    gap: 12,
    marginTop: 24,
  },
  btnPrimary: {
    alignItems: 'center',
    borderRadius: 20,
    justifyContent: 'center',
    paddingVertical: 14,
  },
  btnPrimaryAndroid: {
    backgroundColor: '#6750A4',
    borderRadius: 100,
  },
  btnPrimaryIOS: {
    backgroundColor: '#007AFF',
  },
  btnSecTextAndroid: {
    color: '#6750A4',
    fontSize: 16,
    fontWeight: '500',
  },
  btnSecTextIOS: {
    color: '#007AFF',
    fontFamily: 'System',
    fontSize: 17,
  },
  btnSecondary: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
  },
  btnSecondaryIOS: {
    backgroundColor: 'rgba(0,0,0,0.05)',
    borderRadius: 20,
  },
  btnTextAndroid: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '500',
  },
  btnTextIOS: {
    color: '#fff',
    fontFamily: 'System',
    fontSize: 17,
    fontWeight: '600',
  },
  container: {
    paddingBottom: 10,
    paddingTop: 0,
  },
  descAndroid: {
    fontSize: 14,
    lineHeight: 20,
    marginBottom: 24,
    paddingHorizontal: 8,
    textAlign: 'center',
  },
  descIOS: {
    fontFamily: 'System',
    fontSize: 15,
    lineHeight: 22,
    marginBottom: 24,
    paddingHorizontal: 8,
    textAlign: 'center',
  },
  googleButton: {
    borderRadius: 20,
    borderWidth: StyleSheet.hairlineWidth,
  },
  headerIconContainer: {
    alignItems: 'center',
    marginBottom: 16,
    marginTop: 10,
  }
});

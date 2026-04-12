import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Platform, Alert, ActivityIndicator } from 'react-native';
import { GlassModal } from '../components/ui/GlassModal';
import { GlassInput } from '../components/ui/GlassInput';
import { Icon } from '../components/ui/Icon';
import { triggerHaptic } from '../utils/hapticEngine';
import { useTranslation } from 'react-i18next';
import { useAppTheme } from '../hooks/useAppTheme';
import { supabase } from '../services/supabase';

interface SupabaseAuthScreenProps {
  route?: any;
  navigation?: any;
  visible?: boolean;
  onClose?: () => void;
}

export const SupabaseAuthScreen: React.FC<SupabaseAuthScreenProps> = (props) => {
  const { t } = useTranslation();
  const navigation = props.navigation;
  const isIOS = Platform.OS === 'ios';
  const onClose = props.onClose || (() => navigation?.goBack());
  const visible = props.visible ?? true;
  const { colors, isDark } = useAppTheme();
  
  const [isLogin, setIsLogin] = useState(true);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);

  const handleAuth = async () => {
    if (!email.trim() || !password.trim()) {
      triggerHaptic('notificationError');
      Alert.alert(t('Erreur'), t('Veuillez remplir tous les champs.'));
      return;
    }
    
    setLoading(true);
    triggerHaptic('impactMedium');
    
    try {
      let data, error;
      if (isLogin) {
        ({ data, error } = await supabase.auth.signInWithPassword({ email, password }));
      } else {
        ({ data, error } = await supabase.auth.signUp({ email, password }));
      }

      if (error) throw error;

      triggerHaptic('notificationSuccess');
      Alert.alert(t('Succès'), isLogin ? t('Connexion réussie.') : t('Inscription réussie. Vérifiez vos emails si nécessaire.'));
      onClose();
    } catch (err: any) {
      triggerHaptic('notificationError');
      Alert.alert(t('Erreur'), err.message || t('Une erreur est survenue.'));
    } finally {
      setLoading(false);
    }
  };

  return (
    <GlassModal visible={visible} onClose={onClose} title={isLogin ? t('Connexion CloudFiip') : t('Créer un compte')}>
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
}

const styles = StyleSheet.create({
  container: {
    paddingTop: 0,
    paddingBottom: 10,
  },
  headerIconContainer: {
    alignItems: 'center',
    marginBottom: 16,
    marginTop: 10,
  },
  descIOS: {
    fontFamily: 'System',
    fontSize: 15,
    marginBottom: 24,
    lineHeight: 22,
    textAlign: 'center',
    paddingHorizontal: 8,
  },
  descAndroid: {
    fontSize: 14,
    marginBottom: 24,
    textAlign: 'center',
    lineHeight: 20,
    paddingHorizontal: 8,
  },
  actions: {
    marginTop: 24,
    gap: 12,
  },
  btnPrimary: {
    paddingVertical: 14,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  btnPrimaryIOS: {
    backgroundColor: '#007AFF',
  },
  btnPrimaryAndroid: {
    backgroundColor: '#6750A4',
    borderRadius: 100,
  },
  btnTextIOS: {
    color: '#fff',
    fontSize: 17,
    fontWeight: '600',
    fontFamily: 'System',
  },
  btnTextAndroid: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '500',
  },
  btnSecondary: {
    paddingVertical: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  btnSecondaryIOS: {
    backgroundColor: 'rgba(0,0,0,0.05)',
    borderRadius: 20,
  },
  btnSecTextIOS: {
    color: '#007AFF',
    fontSize: 17,
    fontFamily: 'System',
  },
  btnSecTextAndroid: {
    color: '#6750A4',
    fontSize: 16,
    fontWeight: '500',
  }
});

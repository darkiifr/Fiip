import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Platform, Alert } from 'react-native';
import { GlassModal } from '../components/ui/GlassModal';
import { GlassInput } from '../components/ui/GlassInput';
import { Icon } from '../components/ui/Icon';
import { triggerHaptic } from '../utils/hapticEngine';
import { useTranslation } from 'react-i18next';
import { useAppTheme } from '../hooks/useAppTheme';
// Assume keyAuthService ported to TS
// import { keyAuthService } from '../../services/keyauth';

interface AuthScreenProps {
  route?: any;
  navigation?: any;
  visible?: boolean;
  onClose?: () => void;
}

export const AuthScreen: React.FC<AuthScreenProps> = (props) => {
  const { t } = useTranslation();
  const navigation = props.navigation;
  const isIOS = Platform.OS === 'ios';
  const onClose = props.onClose || (() => navigation?.goBack());
  const visible = props.visible ?? true;
  const { colors, isDark } = useAppTheme();
  
  const [key, setKey] = useState('');
  const [loading, setLoading] = useState(false);

  const handleActivate = async () => {
    if (!key.trim()) {
      triggerHaptic('notificationError');
      return;
    }
    
    setLoading(true);
    triggerHaptic('impactMedium');
    
    // Simulate keyAuth verification
    setTimeout(() => {
      setLoading(false);
      triggerHaptic('notificationSuccess');
      Alert.alert("Succès", "Licence activée avec succès.");
      onClose();
    }, 1500);
  };

  const handleTrial = () => {
    triggerHaptic('impactLight');
    Alert.alert("Essai", "Version d'essai démarrée pour 15 jours.");
    onClose();
  };

  if (isIOS) {
    return (
      <GlassModal visible={visible} onClose={onClose} title={t('Licence Fiip')}>
        <View style={styles.container}>
          <Text style={[styles.descIOS, { color: colors.textSecondary }]}>
            {t("Sur iOS, Fiip fonctionne avec les fonctions incluses. Les abonnements et achats numériques seront gérés uniquement par l'App Store lorsqu'ils seront disponibles.")}
          </Text>

          <TouchableOpacity 
            style={[styles.btnPrimary, styles.btnPrimaryIOS, { backgroundColor: isDark ? colors.primary : '#007AFF' }]} 
            onPress={onClose}
          >
            <Text style={[styles.btnTextIOS, { color: '#ffffff' }]}>
              {t('Continuer')}
            </Text>
          </TouchableOpacity>
        </View>
      </GlassModal>
    );
  }

  return (
    <GlassModal visible={visible} onClose={onClose} title={t('Licence Fiip')}>
      <View style={styles.container}>
        <Text style={[isIOS ? styles.descIOS : styles.descAndroid, { color: colors.textSecondary }]}>
          {t('Veuillez entrer votre clé de licence pour activer toutes les fonctionnalités de Fiip, ou commencer un essai.')}
        </Text>

        <GlassInput 
          placeholder={t('XXXX-XXXX-XXXX-XXXX')}
          value={key}
          onChangeText={setKey}
          autoCapitalize="characters"
          icon={<Icon sfSymbol="key" mdIcon="key-outline" size={20} color="#8E8E93" />}
        />

        <View style={styles.actions}>
          <TouchableOpacity 
            style={[styles.btnPrimary, isIOS ? styles.btnPrimaryIOS : styles.btnPrimaryAndroid, { backgroundColor: isDark ? colors.primary : (isIOS ? '#007AFF' : '#6750A4') }]} 
            onPress={handleActivate}
            disabled={loading}
          >
            <Text style={[isIOS ? styles.btnTextIOS : styles.btnTextAndroid, { color: '#ffffff' }]}>
              {loading ? t('Vérification...') : t('Activer')}
            </Text>
          </TouchableOpacity>

          <TouchableOpacity 
            style={[styles.btnSecondary, isIOS ? styles.btnSecondaryIOS : undefined, isIOS && isDark && { backgroundColor: 'rgba(255,255,255,0.1)' }]} 
            onPress={handleTrial}
            disabled={loading}
          >
            <Text style={[isIOS ? styles.btnSecTextIOS : styles.btnSecTextAndroid, { color: isDark ? colors.primary : (isIOS ? '#007AFF' : '#6750A4') }]}>
              {t("Essai Gratuit")}
            </Text>
          </TouchableOpacity>
        </View>
      </View>
    </GlassModal>
  );
}

const styles = StyleSheet.create({
  actions: {
    gap: 12,
    marginTop: 20,
  },
  btnPrimary: {
    alignItems: 'center',
    borderRadius: 20,
    justifyContent: 'center',
    paddingVertical: 14,
  },
  btnPrimaryAndroid: {
    backgroundColor: '#6750A4',
    borderRadius: 100, // pill shape
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
    paddingTop: 10,
  },
  descAndroid: {
    color: '#49454F',
    fontSize: 14,
    marginBottom: 20,
  },
  descIOS: {
    color: '#4B5563',
    fontFamily: 'System',
    fontSize: 15,
    lineHeight: 22,
    marginBottom: 20,
  }
});

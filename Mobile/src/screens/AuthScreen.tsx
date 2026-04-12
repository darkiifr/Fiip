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

  return (
    <GlassModal visible={visible} onClose={onClose} title={t('Licence Fiip')}>
      <View style={styles.container}>
        <Text style={[isIOS ? styles.descIOS : styles.descAndroid, { color: colors.textSecondary }]}>
          {t('Veuillez entrer votre clé de licence pour activer toutes les fonctionnalités de Fiip, ou commencer un essai gratuit.')}
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
  container: {
    paddingTop: 10,
  },
  descIOS: {
    fontFamily: 'System',
    fontSize: 15,
    color: '#4B5563',
    marginBottom: 20,
    lineHeight: 22,
  },
  descAndroid: {
    fontSize: 14,
    color: '#49454F',
    marginBottom: 20,
  },
  actions: {
    marginTop: 20,
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
    borderRadius: 100, // pill shape
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
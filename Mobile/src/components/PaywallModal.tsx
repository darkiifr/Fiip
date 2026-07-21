import React from 'react';
import { Modal, StyleSheet, View, Text, TouchableOpacity } from 'react-native';
import { useAppTheme } from '../hooks/useAppTheme';
import { SFSymbol } from 'react-native-sfsymbols';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import { Platform } from 'react-native';

interface PaywallModalProps {
  visible: boolean;
  featureName?: string;
  onClose: () => void;
  onUpgrade: () => void;
}

export const PaywallModal = ({ visible, featureName, onClose, onUpgrade }: PaywallModalProps) => {
  const { colors, isDark } = useAppTheme();

  if (!visible) return null;

  return (
    <Modal visible={visible} transparent animationType="fade">
      <View style={styles.overlay}>
        <View style={[styles.modalCard, { backgroundColor: colors.card, borderColor: isDark ? '#333' : '#E5E5EA' }]}>
          <View style={styles.iconContainer}>
            {Platform.OS === 'ios' ? (
              <SFSymbol name="star.circle.fill" color="#FFD700" size={50} style={{width: 50, height: 50}} />
            ) : (
              <Icon name="star-circle" color="#FFD700" size={50} />
            )}
          </View>
          <Text style={[styles.title, { color: colors.text }]}>
            Fonctionnalité Premium
          </Text>
          <Text style={[styles.description, { color: colors.textSecondary }]}>
            {featureName || 'Cette fonctionnalité'} est réservée aux abonnés Pro et Pro+. {`Débloquez tout le potentiel de l'application et de nos modèles d'IA !`}
          </Text>
          <TouchableOpacity style={styles.upgradeBtn} onPress={() => { onClose(); onUpgrade(); }}>
            <Text style={styles.upgradeText}>Voir les offres</Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.cancelBtn} onPress={onClose}>
            <Text style={[styles.cancelText, { color: colors.textSecondary }]}>Pas maintenant</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  cancelBtn: {
    paddingVertical: 10,
  },
  cancelText: {
    fontSize: 15
  },
  description: {
    fontSize: 15,
    lineHeight: 22,
    marginBottom: 32,
    textAlign: 'center'
  },
  iconContainer: {
    marginBottom: 16
  },
  modalCard: {
    alignItems: 'center',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    borderTopWidth: 1,
    padding: 24,
    paddingBottom: 48
  },
  overlay: {
    backgroundColor: 'rgba(0,0,0,0.6)',
    flex: 1,
    justifyContent: 'flex-end',
  },
  title: {
    fontSize: 22,
    fontWeight: '700',
    marginBottom: 8,
    textAlign: 'center'
  },
  upgradeBtn: {
    alignItems: 'center',
    backgroundColor: '#007AFF', // Theme tint
    borderRadius: 20,
    marginBottom: 12,
    paddingHorizontal: 24,
    paddingVertical: 14,
    width: '100%',
  },
  upgradeText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600'
  }
});

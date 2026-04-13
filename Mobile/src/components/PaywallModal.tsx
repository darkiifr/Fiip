import React from 'react';
import { Modal, StyleSheet, View, Text, TouchableOpacity, Image } from 'react-native';
import { BlurView } from '@react-native-community/blur'; // Optional if installed, fallback to semi-transparent
import { useAppTheme } from '../hooks/useAppTheme';
import { SFSymbol } from 'react-native-sfsymbols';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import { Platform } from 'react-native';

export const PaywallModal = ({ visible, featureName, onClose, onUpgrade }) => {
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
            {featureName || 'Cette fonctionnalité'} est réservée aux abonnés Pro et Pro+. Débloquez tout le potentiel de l'application et de nos modèles d'IA !
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
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.6)',
    justifyContent: 'flex-end',
  },
  modalCard: {
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 24,
    paddingBottom: 48,
    borderTopWidth: 1,
    alignItems: 'center'
  },
  iconContainer: {
    marginBottom: 16
  },
  title: {
    fontSize: 22,
    fontWeight: '700',
    marginBottom: 8,
    textAlign: 'center'
  },
  description: {
    fontSize: 15,
    textAlign: 'center',
    lineHeight: 22,
    marginBottom: 32
  },
  upgradeBtn: {
    backgroundColor: '#007AFF', // Theme tint
    paddingVertical: 14,
    paddingHorizontal: 24,
    borderRadius: 20,
    width: '100%',
    alignItems: 'center',
    marginBottom: 12
  },
  upgradeText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600'
  },
  cancelBtn: {
    paddingVertical: 10,
  },
  cancelText: {
    fontSize: 15
  }
});
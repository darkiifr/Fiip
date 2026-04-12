import React from 'react';
import { Modal, Platform, StyleSheet, View, TouchableOpacity, Text, Dimensions } from 'react-native';
import { GlassCard } from './GlassCard';
import { Surface, IconButton } from 'react-native-paper';
import { triggerHaptic } from '../../utils/hapticEngine';
import { Icon } from './Icon';
import { useAppTheme } from '../../hooks/useAppTheme';

interface GlassModalProps {
  visible: boolean;
  onClose: () => void;
  title: string;
  children: React.ReactNode;
}

export const GlassModal: React.FC<GlassModalProps> = ({ visible, onClose, title, children }) => {
  const isIOS = Platform.OS === 'ios';
  const { colors, isDark } = useAppTheme();
  
  const handleClose = () => {
    triggerHaptic('selection');
    onClose();
  };

  const headerBorderColor = isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.1)';
  const closeBtnBg = isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.05)';

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={handleClose}
    >
      <View style={styles.backdrop}>
        {isIOS ? (
          <GlassCard style={styles.modalContent} intensity={isDark ? 30 : 80} cornerRadius={24} tint={isDark ? 'dark' : 'light'}>
            <View style={[styles.header, { borderBottomColor: headerBorderColor }]}>
              <Text style={[styles.titleIOS, { color: colors.text }]}>{title}</Text>
              <TouchableOpacity onPress={handleClose} style={[styles.closeBtnIOS, { backgroundColor: closeBtnBg }]}>
                <Icon sfSymbol="xmark" mdIcon="close" size={20} color={colors.text} />
              </TouchableOpacity>
            </View>
            <View style={styles.body}>
              {children}
            </View>
          </GlassCard>
        ) : (
          <Surface style={[styles.modalContentAndroid, { backgroundColor: colors.card }]} elevation={5}>
            <View style={[styles.header, { borderBottomColor: headerBorderColor }]}>
              <Text style={[styles.titleAndroid, { color: colors.text }]}>{title}</Text>
              <IconButton icon="close" iconColor={colors.text} size={24} onPress={handleClose} />
            </View>
            <View style={styles.body}>
              {children}
            </View>
          </Surface>
        )}
      </View>
    </Modal>
  );
};

const { width, height } = Dimensions.get('window');

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
    alignItems: 'center',
    paddingBottom: 40,
  },
  modalContent: {
    width: width * 0.9,
    maxHeight: height * 0.8,
  },
  modalContentAndroid: {
    width: width * 0.9,
    maxHeight: height * 0.8,
    borderRadius: 24,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    borderBottomWidth: 1,
  },
  titleIOS: {
    fontSize: 22,
    fontWeight: '700',
    fontFamily: 'System',
  },
  titleAndroid: {
    fontSize: 20,
    fontWeight: '500',
  },
  closeBtnIOS: {
    padding: 6,
    borderRadius: 16,
  },
  body: {
    padding: 20,
    paddingBottom: 30,
  }
});

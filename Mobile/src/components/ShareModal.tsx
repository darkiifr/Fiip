import React, { useState, useRef, useEffect } from 'react';
import { 
  View, Text, StyleSheet, Modal, TouchableOpacity, ActivityIndicator, 
  Share, Alert, Platform, TouchableWithoutFeedback, Animated, Dimensions
} from 'react-native';
import Ionicons from 'react-native-vector-icons/Ionicons';
import { publishNote, unpublishNote } from '../services/supabaseSync';
import { useTranslation } from 'react-i18next';
import { useAppTheme } from '../hooks/useAppTheme';
import { triggerHaptic } from '../utils/hapticEngine';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

/* 
 * Animated, Liquid-Glass stylized Share Modal
 * Features an Apple-inspired custom spring entrance & exit animation
 */

interface ShareModalProps {
  visible: boolean;
  onClose: () => void;
  noteId: string;
  publicSlug: string | null;
  onUpdatePublicStatus: (slug: string | null) => void;
  onDeleteRequest?: () => void;
}

const { height: SCREEN_HEIGHT } = Dimensions.get('window');

export const ShareModal: React.FC<ShareModalProps> = ({
  visible,
  onClose,
  noteId,
  publicSlug,
  onUpdatePublicStatus,
  onDeleteRequest,
}) => {
  const { t } = useTranslation();
  const { isDark, colors } = useAppTheme();
  const insets = useSafeAreaInsets();
  
  const [loading, setLoading] = useState(false);
  const publicUrl = publicSlug ? `https://fiip-app.netlify.app/n/${publicSlug}` : null;

  // Custom animations
  const [showModal, setShowModal] = useState(visible);
  const translateY = useRef(new Animated.Value(SCREEN_HEIGHT)).current;
  const fadeAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (visible) {
      setShowModal(true);
      Animated.parallel([
        Animated.timing(fadeAnim, {
          toValue: 1,
          duration: 300,
          useNativeDriver: true,
        }),
        Animated.spring(translateY, {
          toValue: 0,
          useNativeDriver: true,
          bounciness: 6,
          speed: 12,
        })
      ]).start();
    } else {
      Animated.parallel([
        Animated.timing(fadeAnim, {
          toValue: 0,
          duration: 250,
          useNativeDriver: true,
        }),
        Animated.timing(translateY, {
          toValue: SCREEN_HEIGHT,
          duration: 300,
          useNativeDriver: true,
        })
      ]).start(() => {
        setShowModal(false);
      });
    }
  }, [visible]);

  const handleClose = () => {
    triggerHaptic('selection');
    onClose();
  };

  const togglePublic = async () => {
    triggerHaptic('impactLight');
    setLoading(true);
    try {
      if (publicSlug) {
        const { error } = await unpublishNote(noteId);
        if (!error) {
          onUpdatePublicStatus(null);
          triggerHaptic('notificationSuccess');
        } else {
          triggerHaptic('notificationError');
          Alert.alert(t('Erreur'), t('Impossible de modifier le statut public.'));
        }
      } else {
        const { data, error } = await publishNote(noteId);
        if (!error && data?.public_slug) {
          onUpdatePublicStatus(data.public_slug);
          triggerHaptic('notificationSuccess');
        } else {
          triggerHaptic('notificationError');
          Alert.alert(t('Erreur'), t('Impossible de rendre la note publique. Vérifiez votre connexion.'));
        }
      }
    } catch (e) {
      triggerHaptic('notificationError');
      Alert.alert(t('Erreur'), t('Impossible de contacter le serveur.'));
    }
    setLoading(false);
  };

  const handleShareNative = async () => {
    triggerHaptic('selection');
    try {
      const urlToShare = publicUrl ? publicUrl : `https://fiip-app.netlify.app/install`;
      const messageToShare = publicUrl 
        ? t('Découvrez ma note Fiip : ') + urlToShare
        : t('Découvrez Fiip, le bloc-notes ultra-rapide et intelligent !');
      
      await Share.share({
        message: Platform.OS === 'android' ? messageToShare : t('Découvrez ma note Fiip'),
        url: Platform.OS === 'ios' ? urlToShare : undefined,
        title: t('Partager via Fiip')
      });
    } catch (error) {
      console.log('Share error:', error);
    }
  };

  const handleDelete = () => {
    triggerHaptic('notificationWarning');
    if (onDeleteRequest) {
      onDeleteRequest();
    } else {
      Alert.alert(t('Suppression'), t('Veuillez le faire depuis la page principale.'));
    }
  };

  if (!showModal) return null;

  // Liquid glass theme adjustments
  const sheetBg = isDark ? 'rgba(25, 25, 28, 0.92)' : 'rgba(250, 250, 253, 0.94)';
  const surfaceBg = isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.03)';
  const surfaceBorder = isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.06)';

  return (
    <Modal visible={showModal} animationType="none" transparent={true} onRequestClose={handleClose}>
      <Animated.View style={[styles.backdrop, { opacity: fadeAnim }]}>
        <TouchableWithoutFeedback onPress={handleClose}>
          <View style={styles.touchableDismiss} />
        </TouchableWithoutFeedback>
      </Animated.View>

      <View style={styles.sheetContainer} pointerEvents="box-none">
        <Animated.View style={[
            styles.sheet, 
            { 
              backgroundColor: sheetBg, 
              paddingBottom: Math.max(insets.bottom, 24),
              transform: [{ translateY }]
            }
          ]}>
          
          <View style={styles.handleContainer}>
            <View style={[styles.handle, { backgroundColor: isDark ? 'rgba(255,255,255,0.3)' : 'rgba(0,0,0,0.2)' }]} />
          </View>
          
          <View style={styles.header}>
            <Text style={[styles.title, { color: colors.text }]}>{t('Partager et Gérer')}</Text>
            <TouchableOpacity style={[styles.closeBtn, { backgroundColor: isDark ? 'rgba(255,255,255,0.15)' : 'rgba(0,0,0,0.08)' }]} onPress={handleClose}>
              <Ionicons name="close" size={20} color={colors.text} />
            </TouchableOpacity>
          </View>

          {/* Primary Action Glass Card */}
          <TouchableOpacity
            style={[styles.glassCard, { backgroundColor: surfaceBg, borderColor: surfaceBorder }]}
            onPress={handleShareNative}
            activeOpacity={0.7}
          >
            <View style={[styles.iconFloat, { backgroundColor: colors.primary }]}>
              <Ionicons name={Platform.OS === 'ios' ? 'share-outline' : 'share-social-outline'} size={20} color="#FFF" />
            </View>
            <View style={styles.glassTextContent}>
              <Text style={[styles.glassTitle, { color: colors.text }]}>{t('Envoyer cette note')}</Text>
              <Text style={[styles.glassSubtitle, { color: colors.textSecondary }]}>{t('Ouvrir les options de partage du système')}</Text>
            </View>
            <Ionicons name="chevron-forward" size={18} color={colors.textSecondary} />
          </TouchableOpacity>

          {/* Advanced / Switches Card Group */}
          <View style={[styles.glassGroup, { backgroundColor: surfaceBg, borderColor: surfaceBorder }]}>
            
            {/* Public Link Switch */}
            <View style={styles.groupRow}>
              <View style={[styles.iconFloatSub, { backgroundColor: isDark ? 'rgba(59, 130, 246, 0.15)' : 'rgba(59, 130, 246, 0.1)' }]}>
                <Ionicons name="globe-outline" size={18} color="#3B82F6" />
              </View>
              <View style={styles.glassTextContent}>
                <Text style={[styles.glassTitle, { color: colors.text, fontSize: 16 }]}>{t('Lien public')}</Text>
                <Text style={[styles.glassSubtitle, { color: colors.textSecondary }]}>{t('Générer un lien web accessible')}</Text>
              </View>
              <TouchableOpacity
                style={[
                  styles.toggleBtn, 
                  publicSlug ? { backgroundColor: colors.primary } : { backgroundColor: isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.08)' }
                ]}
                onPress={togglePublic}
                disabled={loading}
                activeOpacity={0.7}
              >
                {loading ? (
                  <ActivityIndicator size="small" color={publicSlug ? "#FFF" : colors.textSecondary} />
                ) : (
                  <Text style={[styles.toggleText, { color: publicSlug ? '#FFF' : colors.textSecondary }]}>
                    {publicSlug ? t('Activé') : t('Inactif')}
                  </Text>
                )}
              </TouchableOpacity>
            </View>

            {/* Public Link URL Bar (only if active) */}
            {publicSlug && publicUrl && (
               <View style={[styles.urlContainer, { backgroundColor: isDark ? 'rgba(0,0,0,0.3)' : 'rgba(0,0,0,0.04)' }]}>
                 <Text style={[styles.urlText, { color: colors.textSecondary }]} numberOfLines={1} ellipsizeMode="tail">
                   {publicUrl}
                 </Text>
                 <TouchableOpacity style={styles.copyBtn} onPress={handleShareNative}>
                   <Ionicons name="copy-outline" size={16} color={colors.primary} />
                 </TouchableOpacity>
               </View>
            )}

            <View style={[styles.divider, { backgroundColor: surfaceBorder }]} />

            {/* Collaboration (Preview) */}
            <View style={styles.groupRow}>
              <View style={[styles.iconFloatSub, { backgroundColor: isDark ? 'rgba(168, 85, 247, 0.15)' : 'rgba(168, 85, 247, 0.1)' }]}>
                <Ionicons name="people-outline" size={18} color="#A855F7" />
              </View>
              <View style={styles.glassTextContent}>
                <Text style={[styles.glassTitle, { color: colors.text, fontSize: 16 }]}>{t('Collaborer en ligne')}</Text>
                <Text style={[styles.glassSubtitle, { color: colors.textSecondary }]}>{t("Inviter d'autres utilisateurs")}</Text>
              </View>
              <View style={[styles.badgePro, { backgroundColor: isDark ? 'rgba(168, 85, 247, 0.2)' : 'rgba(168, 85, 247, 0.1)' }]}>
                <Text style={[styles.badgeProText, { color: '#A855F7' }]}>{t('Bientôt')}</Text>
              </View>
            </View>
          </View>

          {/* Danger Zone Glass Card */}
          <TouchableOpacity
            style={[
              styles.glassCard, 
              { backgroundColor: isDark ? 'rgba(239, 68, 68, 0.1)' : 'rgba(239, 68, 68, 0.08)', borderColor: isDark ? 'rgba(239, 68, 68, 0.2)' : 'rgba(239, 68, 68, 0.15)' }
            ]}
            onPress={handleDelete}
            activeOpacity={0.7}
          >
            <View style={[styles.iconFloat, { backgroundColor: '#EF4444' }]}>
              <Ionicons name="trash-outline" size={20} color="#FFF" />
            </View>
            <View style={styles.glassTextContent}>
              <Text style={[styles.glassTitle, { color: '#EF4444' }]}>{t('Supprimer la note')}</Text>
              <Text style={[styles.glassSubtitle, { color: isDark ? 'rgba(239, 68, 68, 0.7)' : 'rgba(239, 68, 68, 0.8)' }]}>{t('Action irréversible sur le Cloud')}</Text>
            </View>
          </TouchableOpacity>

        </Animated.View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  backdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.4)',
  },
  touchableDismiss: {
    flex: 1,
  },
  sheetContainer: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: 'flex-end',
  },
  sheet: {
    width: '100%',
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    paddingHorizontal: 20,
    paddingTop: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -5 },
    shadowOpacity: 0.15,
    shadowRadius: 15,
    elevation: 10,
    borderWidth: 1,
    borderBottomWidth: 0,
    borderColor: 'rgba(255,255,255,0.1)',
  },
  handleContainer: {
    alignItems: 'center',
    marginBottom: 20,
  },
  handle: {
    width: 36,
    height: 5,
    borderRadius: 3,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 24,
  },
  title: {
    fontSize: 22,
    fontWeight: '700',
    letterSpacing: -0.4,
  },
  closeBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  glassCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderRadius: 20,
    borderWidth: 1,
    marginBottom: 16,
  },
  iconFloat: {
    width: 44,
    height: 44,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  iconFloatSub: {
    width: 40,
    height: 40,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 16,
  },
  glassTextContent: {
    flex: 1,
    justifyContent: 'center',
  },
  glassTitle: {
    fontSize: 17,
    fontWeight: '600',
    marginBottom: 3,
    letterSpacing: -0.2,
  },
  glassSubtitle: {
    fontSize: 13,
    fontWeight: '400',
  },
  glassGroup: {
    borderRadius: 20,
    borderWidth: 1,
    marginBottom: 16,
    overflow: 'hidden',
  },
  groupRow: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
  },
  divider: {
    height: 1,
    marginHorizontal: 16,
  },
  urlContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginHorizontal: 16,
    marginBottom: 16,
    borderRadius: 12,
    paddingLeft: 12,
    paddingRight: 6,
    paddingVertical: 6,
  },
  urlText: {
    flex: 1,
    fontSize: 13,
    fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace',
  },
  copyBtn: {
    padding: 6,
  },
  toggleBtn: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    minWidth: 84,
    alignItems: 'center',
  },
  toggleText: {
    fontSize: 14,
    fontWeight: '600',
  },
  badgePro: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 10,
  },
  badgeProText: {
    fontSize: 11,
    fontWeight: '800',
    textTransform: 'uppercase',
  }
});

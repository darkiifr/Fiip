import React from 'react';
import { View, StyleSheet, Platform, Dimensions, TouchableOpacity, Text } from 'react-native';
import Pdf from 'react-native-pdf';
import { GlassModal } from '../components/ui/GlassModal';
import { triggerHaptic } from '../utils/hapticEngine';
import { Icon } from '../components/ui/Icon';
import { useAppTheme } from '../hooks/useAppTheme';

interface PdfViewerScreenProps {
  route: any;
  navigation: any;
}

export const PdfViewerScreen: React.FC<PdfViewerScreenProps> = ({ route, navigation }) => {
  const { pdfUri, fileName } = route.params || {};
  const visible = true;
  const onClose = () => navigation.goBack();
  const isIOS = Platform.OS === 'ios';
  const { colors } = useAppTheme();

  const handlePageChanged = (page: number, numberOfPages: number) => {
    // Subtile haptic feedback when turning pages
    triggerHaptic('selection');
  };

  return (
    <GlassModal visible={visible} onClose={onClose} title={fileName || "Visionneuse PDF"}>
      <View style={styles.container}>
        {pdfUri ? (
          <Pdf
            source={{ uri: pdfUri, cache: true }}
            onLoadComplete={(numberOfPages, filePath) => {
              triggerHaptic('notificationSuccess');
            }}
            onPageChanged={handlePageChanged}
            onError={(error) => {
              triggerHaptic('notificationError');
              console.log(error);
            }}
            style={styles.pdf}
            maxScale={3.0}
            minScale={1.0}
          />
        ) : (
          <View style={styles.emptyState}>
            <Icon sfSymbol="doc.text.magnifyingglass" mdIcon="file-search-outline" size={48} color="#8E8E93" />
            <Text style={[isIOS ? styles.emptyTextIOS : styles.emptyTextAndroid, { color: colors.textSecondary }]}>Aucun document chargé</Text>
          </View>
        )}
      </View>
    </GlassModal>
  );
};

const styles = StyleSheet.create({
  container: {
    height: Dimensions.get('window').height * 0.65,
    width: '100%',
  },
  pdf: {
    flex: 1,
    width: '100%',
    backgroundColor: 'transparent',
  },
  emptyState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  emptyTextIOS: {
    marginTop: 16,
    fontSize: 16,
    color: '#8E8E93',
    fontFamily: 'System',
  },
  emptyTextAndroid: {
    marginTop: 16,
    fontSize: 14,
    color: '#8E8E93',
  }
});

import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, Platform, TouchableOpacity, ScrollView, Linking } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { triggerHaptic } from '../utils/hapticEngine';
import { useTranslation } from 'react-i18next';
import { Button } from 'react-native-paper';
import { GlassCard } from '../components/ui/GlassCard';
import { Icon } from '../components/ui/Icon';
import { NoteList } from '../components/NoteList';
import DocumentPicker from 'react-native-document-picker';
import { updateWidgetData } from '../utils/LiveActivity';
import { useAppTheme } from '../hooks/useAppTheme';

export default function HomeScreen() {
  const { t } = useTranslation();
  const navigation = useNavigation<any>();
  const isIOS = Platform.OS === 'ios';
  const { colors, isDark } = useAppTheme();

  React.useEffect(() => {
    // Seed iOS Widget with sample data to prove it works
    if (isIOS) {
      updateWidgetData("Idées Fonctionnalités", "1. Chat IA\n2. Intégration KeyAuth\n3. Interface", 3);
    }
  }, []);

  useEffect(() => {
    // Handles URL deep link if the app is already open
    const subscription = Linking.addEventListener('url', (event) => {
      handleDeepLink(event.url);
    });

    // Handles URL deep link if the app is starting cold from a widget click
    Linking.getInitialURL().then(url => {
      if (url) {
        handleDeepLink(url);
      }
    });

    return () => {
      subscription.remove();
    };
  }, []);

  const handleDeepLink = (url: string) => {
    if (url === 'fiip://newNote') {
      handleNewNote();
    }
  };

  const handleAIAction = async () => {
    triggerHaptic('impactHeavy');
    navigation.navigate('AiChat');
  };

  const handleFileAction = async () => {
    triggerHaptic('selection');
    try {
      const res = await DocumentPicker.pick({
        type: [DocumentPicker.types.pdf],
      });
      
      const file = res[0];
      if (file && file.uri) {
         // Ensure completion of UI open before success tick
         setTimeout(() => triggerHaptic('notificationSuccess'), 300);
         navigation.navigate('PdfViewer', { pdfUri: file.uri, fileName: file.name });
      }
    } catch (err) {
      if (DocumentPicker.isCancel(err)) {
        triggerHaptic('selection');
      } else {
        triggerHaptic('notificationError');
        console.error(err);
      }
    }
  };

  const handleNotePress = (note: any) => {
     navigation.navigate('NoteEditor', { noteToEdit: note });
  };

  const handleNewNote = () => {
    triggerHaptic('impactLight');
    navigation.navigate('NoteEditor');
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]} edges={['top', 'left', 'right']}>
      <ScrollView contentContainerStyle={[styles.content, { paddingBottom: 120 }]} showsVerticalScrollIndicator={false}>
        
        <GlassCard style={styles.cardHeader} intensity={isDark ? 30 : 50} cornerRadius={24}>
          <View style={styles.header}>
            <Icon sfSymbol="sparkles" mdIcon="star" size={32} color={isIOS ? (isDark ? '#0A84FF' : '#007AFF') : '#6750A4'} weight="bold" />
            <Text style={[isIOS ? styles.titleIOS : styles.titleAndroid, { color: colors.text }]}>
              Fiip Intelligence
            </Text>
          </View>
          <Text style={[isIOS ? styles.subtitleIOS : styles.subtitleAndroid, { color: colors.textSecondary }]}>
            Posez vos questions à notre modèle IA synchronisé avec votre espace personnel.
          </Text>

           {isIOS ? (
            <TouchableOpacity style={styles.buttonIOS} onPress={handleAIAction} activeOpacity={0.7}>
              <Icon sfSymbol="paperplane.fill" mdIcon="send" color="#FFF" size={20} />
              <Text style={styles.buttonTextIOS}>Invoquer l'IA</Text>
            </TouchableOpacity>
          ) : (
            <Button icon="robot" mode="contained" onPress={handleAIAction} style={styles.buttonMD3}>
              Invoquer l'IA
            </Button>
          )}
        </GlassCard>

        {/* Hero Section pour la création rapide */}
        <GlassCard style={styles.quickActionCard} intensity={isDark ? 20 : 35} cornerRadius={24}>
           <View style={styles.row}>
             <Icon sfSymbol="square.and.pencil" mdIcon="pencil" size={24} color={isIOS ? '#FF9500' : '#B3261E'} weight="semibold" />
             <Text style={[isIOS ? styles.sectionTitleIOS : styles.sectionTitleAndroid, { color: colors.text }]}>Démarrer</Text>
           </View>
           <Text style={[isIOS ? styles.subtitleIOS : styles.subtitleAndroid, { color: colors.textSecondary }]}>
             Capturez vos idées sous forme de texte, dessin ou audio instantanément.
           </Text>
           {isIOS ? (
                  <TouchableOpacity style={styles.primaryActionIOS} onPress={handleNewNote} activeOpacity={0.7}>
                    <Text style={styles.primaryActionTextIOS}>Créer une nouvelle note</Text>
                    <Icon sfSymbol="plus.circle.fill" mdIcon="plus" color="#FFF" size={20} />
                  </TouchableOpacity>
             ) : (
                  <Button icon="plus" mode="contained-tonal" onPress={handleNewNote} style={styles.buttonMD3}>
                    Créer une nouvelle note
                  </Button>
             )}
        </GlassCard>

        {/* Liste des notes */}
        <View style={styles.listContainer}>
          <NoteList onNotePress={handleNotePress} />
        </View>

      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Platform.OS === 'ios' ? 'transparent' : '#F3F4F6',
  },
  content: {
    padding: 16,
    gap: 16,
  },
  cardHeader: {
    padding: 24,
    marginBottom: 8,
  },
  quickActionCard: {
    padding: 20,
    marginBottom: 20,
  },
  listContainer: {
    marginTop: 8,
    paddingHorizontal: 4,
  },
  sectionListTitleIOS: {
    fontSize: 22,
    fontWeight: '700',
    fontFamily: 'System',
    color: '#000',
    marginBottom: 12,
  },
  sectionListTitleAndroid: {
    fontSize: 20,
    fontWeight: '500',
    color: '#1C1B1F',
    marginBottom: 12,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  titleIOS: {
    fontSize: 28,
    fontWeight: '800',
    fontFamily: 'System', // SF Pro Display automatically picked on iOS
    color: '#000',
    marginLeft: 12,
  },
  titleAndroid: {
    fontSize: 24,
    fontWeight: 'normal',
    color: '#1C1B1F',
    marginLeft: 12,
  },
  subtitleIOS: {
    fontSize: 16,
    fontFamily: 'System',
    color: '#4B5563',
    marginBottom: 20,
    lineHeight: 22,
  },
  subtitleAndroid: {
    fontSize: 14,
    color: '#49454F',
    marginBottom: 20,
  },
  sectionTitleIOS: {
    fontSize: 20,
    fontWeight: '700',
    fontFamily: 'System',
    color: '#000',
    marginLeft: 12,
  },
  sectionTitleAndroid: {
    fontSize: 18,
    fontWeight: '500',
    color: '#1C1B1F',
    marginLeft: 12,
  },
  chatBox: {
    minHeight: 40,
    marginBottom: 20,
  },
  chatMsgIOS: {
    fontFamily: 'System',
    fontSize: 15,
    color: '#000',
    paddingVertical: 4,
  },
  chatMsgAndroid: {
    fontSize: 14,
    color: '#1C1B1F',
    paddingVertical: 4,
  },
  buttonIOS: {
    backgroundColor: '#007AFF',
    paddingVertical: 14,
    paddingHorizontal: 20,
    borderRadius: 20,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    shadowColor: '#007AFF',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
  },
  buttonTextIOS: {
    color: '#FFF',
    fontSize: 17,
    fontWeight: '600',
    fontFamily: 'System',
  },
  secondaryButtonIOS: {
    backgroundColor: 'rgba(0,0,0,0.05)',
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 16,
    alignItems: 'center',
  },
  secondaryButtonTextIOS: {
    color: '#000',
    fontSize: 16,
    fontWeight: '500',
    fontFamily: 'System',
  },
  primaryActionIOS: {
    backgroundColor: '#FF9500',
    paddingVertical: 14,
    paddingHorizontal: 20,
    borderRadius: 20,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    shadowColor: '#FF9500',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
  },
  primaryActionTextIOS: {
    color: '#FFF',
    fontSize: 17,
    fontWeight: '600',
    fontFamily: 'System',
  },
  btnRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: 12,
  },
  buttonMD3: {
    marginTop: 8,
    borderRadius: 100, // MD3 Pill shape
  }
});

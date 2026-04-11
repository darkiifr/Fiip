import React from 'react';
import { View, Text, StyleSheet, Platform, TouchableOpacity } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useHaptics } from '../providers/haptics';
import { useTranslation } from 'react-i18next';
// @ts-ignore
import { SFSymbol } from 'react-native-sfsymbols';
import { Button, Card, Title, Paragraph } from 'react-native-paper';

export default function HomeScreen() {
  const { t } = useTranslation();
  const { triggerImpact } = useHaptics();

  const handleAction = () => {
    triggerImpact('heavy');
    // Implement action link
  };

  const isIOS = Platform.OS === 'ios';

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.content}>
        {isIOS ? (
          <View style={styles.cardIOS}>
            <View style={styles.headerIOS}>
              <SFSymbol
                name="star.fill"
                weight="semibold"
                scale="large"
                color="systemBlue"
                size={40}
                resizeMode="center"
                multicolor={false}
                style={styles.icon}
              />
              <Text style={styles.titleIOS}>Fiip Mobile</Text>
            </View>
            <Text style={styles.subtitleIOS}>Bienvenue dans l'expérience Liquid Glass</Text>
            <TouchableOpacity style={styles.buttonIOS} onPress={handleAction}>
              <Text style={styles.buttonTextIOS}>Explorer</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <Card style={styles.cardAndroid}>
            <Card.Content>
              <Title>Fiip Mobile</Title>
              <Paragraph>Bienvenue dans l'expérience Material Design 3</Paragraph>
            </Card.Content>
            <Card.Actions>
              <Button mode="contained" onPress={handleAction}>Explorer</Button>
            </Card.Actions>
          </Card>
        )}
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Platform.OS === 'ios' ? 'transparent' : '#F3F4F6',
  },
  content: {
    flex: 1,
    padding: 20,
    justifyContent: 'center',
  },
  cardAndroid: {
    padding: 10,
    borderRadius: 16,
  },
  cardIOS: {
    padding: 30,
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.4)',
    borderRadius: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.1,
    shadowRadius: 20,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.6)',
  },
  headerIOS: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 20,
  },
  titleIOS: {
    fontSize: 28,
    fontWeight: '800',
    fontFamily: 'System', // SF Pro
    color: '#000',
  },
  subtitleIOS: {
    fontSize: 16,
    fontFamily: 'System',
    color: '#4B5563',
    marginBottom: 30,
    textAlign: 'center',
  },
  icon: {
    width: 44,
    height: 44,
    marginRight: 10,
  },
  buttonIOS: {
    backgroundColor: '#007AFF',
    paddingVertical: 14,
    paddingHorizontal: 30,
    borderRadius: 20,
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
  }
});

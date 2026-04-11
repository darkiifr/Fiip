import React from 'react';
import { View, Text, Switch, StyleSheet, Platform } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useHaptics } from '../providers/haptics';
import { useTranslation } from 'react-i18next';
// @ts-ignore
import { SFSymbol } from 'react-native-sfsymbols';
import { Switch as PaperSwitch, Text as PaperText } from 'react-native-paper';

export default function SettingsScreen() {
  const { hapticsEnabled, toggleHaptics, triggerSelection } = useHaptics();
  const { t } = useTranslation();

  const handleToggle = () => {
    triggerSelection();
    toggleHaptics();
  };

  const isIOS = Platform.OS === 'ios';

  return (
    <SafeAreaView style={styles.container}>
      <View style={[styles.header, isIOS && styles.headerIOS]}>
        <Text style={[styles.title, isIOS ? styles.titleIOS : styles.titleAndroid]}>
          Paramètres
        </Text>
      </View>
      <View style={styles.settingRow}>
        <View style={styles.settingLeft}>
          {isIOS && (
            <SFSymbol
              name="hand.tap"
              weight="medium"
              scale="medium"
              size={24}
              color="label"
              style={styles.icon}
            />
          )}
          <Text style={[styles.settingText, isIOS ? styles.textIOS : styles.textAndroid]}>
            Retours Haptiques
          </Text>
        </View>
        {isIOS ? (
          <Switch value={hapticsEnabled} onValueChange={handleToggle} />
        ) : (
          <PaperSwitch value={hapticsEnabled} onValueChange={handleToggle} />
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
  header: {
    padding: 20,
    borderBottomWidth: 1,
    borderColor: '#E5E7EB',
  },
  headerIOS: {
    backgroundColor: 'rgba(255,255,255,0.7)',
    borderColor: 'rgba(0,0,0,0.1)',
  },
  title: {
    fontSize: 34,
    fontWeight: 'bold',
  },
  titleIOS: {
    fontFamily: 'System', // SF Pro Display
    color: '#000',
  },
  titleAndroid: {
    color: '#1F2937',
  },
  settingRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    backgroundColor: Platform.OS === 'ios' ? 'rgba(255,255,255,0.5)' : '#FFF',
    marginTop: 10,
    borderRadius: Platform.OS === 'ios' ? 12 : 0,
    marginHorizontal: Platform.OS === 'ios' ? 16 : 0,
  },
  settingLeft: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  icon: {
    width: 28,
    height: 28,
    marginRight: 10,
  },
  settingText: {
    fontSize: 17,
  },
  textIOS: {
    fontFamily: 'System',
  },
  textAndroid: {
    fontWeight: '500',
  }
});

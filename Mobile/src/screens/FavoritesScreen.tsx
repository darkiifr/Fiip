import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, Platform, FlatList, TouchableOpacity, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { triggerHaptic } from '../utils/hapticEngine';
import { GlassCard } from '../components/ui/GlassCard';
import { Icon } from '../components/ui/Icon';
import { fetchFavoriteAndSharedNotes } from '../services/supabaseSync';
import { useTranslation } from 'react-i18next';
import { Surface, TouchableRipple, Badge } from 'react-native-paper';
import { useNavigation } from '@react-navigation/native';
import { useAppTheme } from '../hooks/useAppTheme';

import { getBadgeIconMapping } from '../utils/iconMap';

export default function FavoritesScreen() {
  const { t } = useTranslation();
  const navigation = useNavigation<any>();
  const [notes, setNotes] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const { colors, isDark } = useAppTheme();

  const isIOS = Platform.OS === 'ios';

  useEffect(() => {
    loadNotes();
  }, []);

  const loadNotes = async () => {
    setLoading(true);
    try {
      const data = await fetchFavoriteAndSharedNotes();
      setNotes(data || []);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const handleNotePress = (note: any) => {
    triggerHaptic('selection');
    navigation.navigate('NoteEditor', { noteToEdit: note });
  };

  const renderBadges = (badges: string[]) => {
    if (!badges || badges.length === 0) return null;
    return (
      <View style={styles.badgesRow}>
        {badges.map((badge, idx) => {
          const iconMap = getBadgeIconMapping(badge);
          
          return (
            <View key={idx} style={isIOS 
              ? [styles.badgeWrapperIOS, { backgroundColor: iconMap.backgroundColor }] 
              : [styles.badgeWrapperAndroid, { backgroundColor: iconMap.backgroundColor }]
            }>
              <Icon 
                sfSymbol={iconMap.sfSymbol} 
                mdIcon={iconMap.mdIcon} 
                size={12} 
                color={iconMap.color} 
                style={{ marginRight: 4 }}
              />
              <Text style={isIOS 
                ? [styles.badgeTextIOS, { color: iconMap.color }] 
                : [styles.badgeTextAndroid, { color: iconMap.color }]
              }>
                {badge}
              </Text>
            </View>
          );
        })}
      </View>
    );
  };

  const renderNoteItem = ({ item }: { item: any }) => {
    const isShared = item.collaborators && item.collaborators.length > 0;
    
    if (isIOS) {
      return (
        <TouchableOpacity activeOpacity={0.7} onPress={() => handleNotePress(item)} style={styles.itemMargin}>
          <View style={[styles.cardIOS, { backgroundColor: colors.card }]}>
            <View style={styles.cardHeader}>
              <Text style={[styles.titleIOS, { color: colors.text }]} numberOfLines={1}>{item.title || 'Sans titre'}</Text>
              <View style={styles.iconsRow}>
                {isShared && <Icon sfSymbol="person.2.fill" mdIcon="account-group" size={16} color="#007AFF" />}
                {item.is_favorite && <Icon sfSymbol="star.fill" mdIcon="star" size={16} color="#FF9500" style={{ marginLeft: 6 }} />}
              </View>
            </View>
            <Text style={[styles.excerptIOS, { color: colors.textSecondary }]} numberOfLines={2}>{item.excerpt || 'Aucun contenu.'}</Text>
            {renderBadges(item.badges)}
          </View>
        </TouchableOpacity>
      );
    }

    return (
      <Surface style={styles.cardAndroid} elevation={1}>
        <TouchableRipple onPress={() => handleNotePress(item)} style={styles.rippleAndroid}>
          <View>
            <View style={styles.cardHeader}>
              <Text style={[styles.titleAndroid, { color: colors.text }]} numberOfLines={1}>{item.title || 'Sans titre'}</Text>
              <View style={styles.iconsRow}>
                {isShared && <Icon sfSymbol="person.2" mdIcon="account-group" size={18} color="#0B57D0" />}
                {item.is_favorite && <Icon sfSymbol="star" mdIcon="star" size={18} color="#FFBA28" style={{marginLeft: 6}} />}
              </View>
            </View>
            <Text style={[styles.excerptAndroid, { color: colors.textSecondary }]} numberOfLines={2}>{item.excerpt || 'Aucun contenu.'}</Text>
            {renderBadges(item.badges)}
          </View>
        </TouchableRipple>
      </Surface>
    );
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: isIOS ? colors.background : '#F3F4F6' }]} edges={['top', 'left', 'right']}>
      <View style={styles.header}>
        <Icon sfSymbol="star.fill" mdIcon="star" size={32} color={isIOS ? '#FF9500' : '#FFBA28'} />
        <Text style={isIOS ? [styles.mainTitleIOS, { color: colors.text }] : [styles.mainTitleAndroid, { color: colors.text }]}>Favoris & Badges</Text>
      </View>

      {loading ? (
        <ActivityIndicator size="large" color={isIOS ? colors.primary : '#6750A4'} style={{ marginTop: 50 }} />
      ) : (
        <FlatList
          data={notes}
          keyExtractor={(item) => item.id}
          renderItem={renderNoteItem}
          contentContainerStyle={[styles.listContent, { paddingBottom: 120 }]}
          showsVerticalScrollIndicator={false}
          ListEmptyComponent={
            <Text style={[styles.emptyText, { color: colors.textSecondary }]}>Aucun favori ou note partagée pour le moment.</Text>
          }
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 24,
  },
  mainTitleIOS: {
    fontSize: 34,
    fontWeight: 'bold',
    fontFamily: 'System',
    marginLeft: 12,
  },
  mainTitleAndroid: {
    fontSize: 24,
    fontWeight: '600',
    color: '#1C1B1F',
    marginLeft: 12,
  },
  listContent: {
    paddingHorizontal: 16,
    paddingBottom: 40,
  },
  itemMargin: {
    marginBottom: 16,
  },
  cardIOS: {
    padding: 18,
    minHeight: 110,
    borderRadius: 20,
    justifyContent: 'space-between',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
  },
  cardAndroid: {
    marginBottom: 12,
    borderRadius: 16,
    backgroundColor: '#fff',
    minHeight: 110,
  },
  rippleAndroid: {
    padding: 16,
    flex: 1,
    justifyContent: 'space-between',
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  iconsRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  titleIOS: {
    fontSize: 17,
    fontWeight: '600',
    color: '#000',
    flex: 1,
    marginRight: 8,
  },
  titleAndroid: {
    fontSize: 18,
    fontWeight: '500',
    color: '#1C1B1F',
    flex: 1,
  },
  excerptIOS: {
    fontSize: 14,
    color: '#6B7280',
    lineHeight: 20,
  },
  excerptAndroid: {
    fontSize: 14,
    color: '#49454F',
    lineHeight: 20,
  },
  badgesRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginTop: 12,
    gap: 8,
  },
  badgeWrapperIOS: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
    flexDirection: 'row',
    alignItems: 'center',
  },
  badgeTextIOS: {
    fontSize: 12,
    fontWeight: '600',
  },
  badgeWrapperAndroid: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
    flexDirection: 'row',
    alignItems: 'center',
  },
  badgeTextAndroid: {
    fontSize: 12,
    fontWeight: '500',
  },
  emptyText: {
    textAlign: 'center',
    color: '#6B7280',
    marginTop: 40,
    fontSize: 16,
  }
});
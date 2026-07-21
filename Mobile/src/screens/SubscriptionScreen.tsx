import React from 'react';
import { View, Text, StyleSheet, Platform, TouchableOpacity, ScrollView, Linking } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { useSettingsStore } from '../store/settingsStore';
import { triggerHaptic } from '../utils/hapticEngine';
import { GlassCard } from '../components/ui/GlassCard';
import { Icon } from '../components/ui/Icon';
import { useAppTheme } from '../hooks/useAppTheme';
import { FiipAction, FiipScreen } from '../components/ui/FiipNative';
import { SubscriptionPlan } from '../store/settingsStore';
import { FIIP_LICENSE_PURCHASE_URL } from '../config/links';

const plans = [
  {
    id: 'basic',
    title: 'Fiip Basic',
    price: '3,99 € / mois',
    features: ['100 notes synchronisées', '100 Mo pour les notes', '2 Go de pièces jointes', '250 Mo par fichier'],
    color: '#34C759',
  },
  {
    id: 'pro',
    title: 'Fiip Pro',
    price: '6,99 € / mois',
    features: ['1 000 notes synchronisées', '1 Go pour les notes', '25 Go de pièces jointes', '2 Go par fichier'],
    color: '#007AFF',
  },
  {
    id: 'ai',
    title: 'Fiip AI',
    price: '8,99 € / mois',
    features: ['Quotas du plan Pro', 'Assistant IA', 'OCR illimité', 'Support prioritaire'],
    color: '#5856D6',
  },
  {
    id: 'family_pro',
    title: 'Fiip Family Pro',
    price: '11,99 € / mois',
    features: ['Notes illimitées', '5 Go pour les notes', '100 Go de pièces jointes', '5 Go par fichier'],
    color: '#FF9F0A',
  },
];

export default function SubscriptionScreen() {
  const navigation = useNavigation<any>();
  const isIOS = Platform.OS === 'ios';
  const { colors, isDark } = useAppTheme();
  const { subscriptionPlan, setSubscriptionPlan } = useSettingsStore();

  const handleSelectPlan = async (planId: SubscriptionPlan) => {
    if (Platform.OS === 'ios') {
      triggerHaptic('selection');
      await Linking.openURL(FIIP_LICENSE_PURCHASE_URL);
      return;
    }

    triggerHaptic('notificationSuccess');
    setSubscriptionPlan(planId);
  };

  return (
    <FiipScreen>
      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        <View style={styles.header}>
          <TouchableOpacity
            style={styles.backButton}
            onPress={() => {
              triggerHaptic('selection');
              navigation.goBack();
            }}
          >
            <Icon sfSymbol="chevron.left" mdIcon="arrow-left" size={24} color={isIOS ? (isDark ? colors.primary : '#007AFF') : colors.text} />
            {isIOS && <Text style={[styles.backText, { color: isDark ? colors.primary : '#007AFF' }]}>Retour</Text>}
          </TouchableOpacity>
          <Text style={[isIOS ? styles.titleIOS : styles.titleAndroid, { color: colors.text }]}>Abonnements</Text>
        </View>

        <Text style={[styles.subtitle, { color: colors.textSecondary }]}>
          {isIOS
            ? 'Les achats iOS passent par le portail Fiip sécurisé. Le plan est synchronisé après connexion au compte.'
            : 'Choisissez le plan qui vous correspond le mieux.'}
        </Text>

        {plans.map((plan) => {
          const isActive = subscriptionPlan === plan.id;
          return (
            <GlassCard 
              key={plan.id} 
              style={[styles.card, isActive && { borderColor: plan.color, borderWidth: 2 }]} 
              intensity={isDark ? 30 : 40} 
              cornerRadius={16}
            >
              <View style={styles.planHeader}>
                <Text style={[isIOS ? styles.planTitleIOS : styles.planTitleAndroid, { color: plan.color }]}>
                  {plan.title}
                </Text>
                {isActive && (
                  <View style={[styles.activeBadge, { backgroundColor: plan.color }]}>
                    <Text style={styles.activeBadgeText}>Actuel</Text>
                  </View>
                )}
              </View>
              <Text style={[styles.planPrice, { color: colors.text }]}>
                {plan.price}
              </Text>

              <View style={styles.featuresList}>
                {plan.features.map((feature, index) => (
                  <View key={index} style={styles.featureRow}>
                    <Icon sfSymbol="checkmark.circle.fill" mdIcon="check-circle" size={18} color={plan.color} />
                    <Text style={[styles.featureText, { color: colors.text }]}>{feature}</Text>
                  </View>
                ))}
              </View>

              {!isActive && (
                <FiipAction
                  label={isIOS ? 'Ouvrir le portail' : 'Choisir ce plan'}
                  sfSymbol="checkmark.circle"
                  mdIcon="check-circle-outline"
                  selected={!isIOS}
                  onPress={() => handleSelectPlan(plan.id as SubscriptionPlan)}
                />
              )}
            </GlassCard>
          );
        })}
      </ScrollView>
    </FiipScreen>
  );
}

const styles = StyleSheet.create({
  activeBadge: {
    borderRadius: 12,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  activeBadgeText: {
    color: '#FFF',
    fontSize: 12,
    fontWeight: '600',
  },
  backButton: {
    alignItems: 'center',
    flexDirection: 'row',
    marginRight: 10,
  },
  backText: {
    color: '#007AFF',
    fontSize: 17,
    marginLeft: 4,
  },
  card: {
    margin: 16,
    marginBottom: 20,
    marginTop: 0,
    padding: 20,
  },
  featureRow: {
    alignItems: 'center',
    flexDirection: 'row',
    marginBottom: 8,
  },
  featureText: {
    color: '#3C3C43',
    fontSize: 15,
    marginLeft: 10,
  },
  featuresList: {
    marginBottom: 20,
  },
  header: {
    alignItems: 'center',
    flexDirection: 'row',
    padding: 20,
    paddingBottom: 10,
  },
  planHeader: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  planPrice: {
    color: '#1C1B1F',
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 16,
  },
  planTitleAndroid: {
    fontSize: 20,
    fontWeight: 'bold',
  },
  planTitleIOS: {
    fontFamily: 'System',
    fontSize: 22,
    fontWeight: '700',
  },
  scrollContent: {
    paddingBottom: 40,
  },
  subtitle: {
    color: '#8E8E93',
    fontSize: 16,
    marginBottom: 20,
    paddingHorizontal: 20,
  },
  titleAndroid: {
    color: '#1C1B1F',
    fontSize: 26,
    fontWeight: 'bold',
  },
  titleIOS: {
    color: '#000',
    fontFamily: 'System',
    fontSize: 28,
    fontWeight: 'bold',
  },
});

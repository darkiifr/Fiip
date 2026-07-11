import React from 'react';
import { View, Text, StyleSheet, Platform, TouchableOpacity, ScrollView } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { useSettingsStore } from '../store/settingsStore';
import { triggerHaptic } from '../utils/hapticEngine';
import { GlassCard } from '../components/ui/GlassCard';
import { Icon } from '../components/ui/Icon';
import { useAppTheme } from '../hooks/useAppTheme';
import { FiipAction, FiipScreen } from '../components/ui/FiipNative';

const plans = [
  {
    id: 'free',
    title: 'Fiip Free',
    price: '0 € / mois',
    features: ['Fonctionnalités de base', 'Synchronisation limitée', 'Thème sombre Fiip'],
    color: '#34C759',
  },
  {
    id: 'pro',
    title: 'Fiip Pro',
    price: '4,99 € / mois',
    features: ['Toutes les fonctionnalités', 'Synchronisation illimitée', 'Support prioritaire', 'Aucune publicité'],
    color: '#007AFF',
  },
  {
    id: 'pro+',
    title: 'Fiip Pro+',
    price: '9,99 € / mois',
    features: ['Avantages Pro', 'Accès IA exclusif', 'Stockage cloud étendu', 'Fonctions bêta anticipées'],
    color: '#5856D6',
  }
];

export default function SubscriptionScreen() {
  const navigation = useNavigation<any>();
  const isIOS = Platform.OS === 'ios';
  const { colors, isDark } = useAppTheme();
  const { subscriptionPlan, setSubscriptionPlan } = useSettingsStore();

  const handleSelectPlan = (planId: 'free' | 'pro' | 'pro+') => {
    if (Platform.OS === 'ios' && planId !== 'free') {
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
            ? 'La version iOS utilise les fonctions incluses. Les achats seront proposés uniquement via l’App Store quand StoreKit sera activé.'
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
                {isIOS && plan.id !== 'free' ? 'Bientôt via App Store' : plan.price}
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
                  label={isIOS && plan.id !== 'free' ? 'Bientôt via App Store' : 'Choisir ce plan'}
                  sfSymbol="checkmark.circle"
                  mdIcon="check-circle-outline"
                  selected={plan.id === 'free' || !isIOS}
                  disabled={isIOS && plan.id !== 'free'}
                  onPress={() => handleSelectPlan(plan.id as any)}
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
  container: {
    flex: 1,
    backgroundColor: Platform.OS === 'ios' ? 'transparent' : '#F3F4F6',
  },
  scrollContent: {
    paddingBottom: 40,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 20,
    paddingBottom: 10,
  },
  backButton: {
    flexDirection: 'row',
    alignItems: 'center',
    marginRight: 10,
  },
  backText: {
    fontSize: 17,
    color: '#007AFF',
    marginLeft: 4,
  },
  titleIOS: {
    fontSize: 28,
    fontWeight: 'bold',
    fontFamily: 'System',
    color: '#000',
  },
  titleAndroid: {
    fontSize: 26,
    fontWeight: 'bold',
    color: '#1C1B1F',
  },
  subtitle: {
    fontSize: 16,
    color: '#8E8E93',
    paddingHorizontal: 20,
    marginBottom: 20,
  },
  card: {
    margin: 16,
    marginTop: 0,
    marginBottom: 20,
    padding: 20,
  },
  planHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  planTitleIOS: {
    fontSize: 22,
    fontWeight: '700',
    fontFamily: 'System',
  },
  planTitleAndroid: {
    fontSize: 20,
    fontWeight: 'bold',
  },
  activeBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  activeBadgeText: {
    color: '#FFF',
    fontSize: 12,
    fontWeight: '600',
  },
  planPrice: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1C1B1F',
    marginBottom: 16,
  },
  featuresList: {
    marginBottom: 20,
  },
  featureRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  featureText: {
    fontSize: 15,
    color: '#3C3C43',
    marginLeft: 10,
  },
});

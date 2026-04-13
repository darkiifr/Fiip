import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, Platform, ActivityIndicator } from 'react-native';
import { useAppTheme } from '../hooks/useAppTheme';
import { useTranslation } from 'react-i18next';
import { supabase, storageService } from '../services/supabase';
import { ProgressBar } from 'react-native-paper';
import { Icon } from './ui/Icon';

export const CloudConfigView = () => {
    const { colors, isDark } = useAppTheme();
    const { t } = useTranslation();
    const isIOS = Platform.OS === 'ios';
    const [usage, setUsage] = useState({ totalBytes: 0, limitBytes: 50 * 1024 * 1024 });
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        fetchUsage();
    }, []);

    const fetchUsage = async () => {
        try {
            const { data: { user } } = await supabase.auth.getUser();
            if (user) {
                const u = await storageService.getUsage(user.id);
                setUsage(u);
            }
        } catch (e) {
            console.error("Erreur de récupération de l'usage", e);
        } finally {
            setLoading(false);
        }
    };

    const formatBytes = (bytes: number) => {
        if (bytes === 0) return '0 B';
        const k = 1024;
        const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
    };

    const percent = usage.limitBytes > 0 ? (usage.totalBytes / usage.limitBytes) : 0;
    const isError = percent >= 1;
    const isWarning = percent > 0.8 && !isError;

    if (loading) {
        return (
            <View style={[styles.container, { backgroundColor: colors.card, borderColor: colors.border }]}>
                <ActivityIndicator color={colors.primary} />
            </View>
        );
    }

    return (
        <View style={[styles.container, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <View style={styles.header}>
                <Icon sfSymbol="externaldrive.fill" mdIcon="cloud" size={20} color={colors.text} />
                <Text style={[isIOS ? styles.titleIOS : styles.titleAndroid, { color: colors.text }]}>
                    {t('Stockage Cloud')}
                </Text>
            </View>
            
            <View style={styles.barContainer}>
                <ProgressBar 
                    progress={Math.min(percent, 1)} 
                    color={isError ? '#FF3B30' : (isWarning ? '#FF9500' : colors.primary)} 
                    style={styles.progressBar}
                />
            </View>

            <View style={styles.footer}>
                <Text style={[styles.usageText, { color: colors.textSecondary }]}>
                    {formatBytes(usage.totalBytes)} / {formatBytes(usage.limitBytes)} utilisés
                </Text>
                
                {isError && (
                    <Text style={styles.errorText}>
                        {t('Limite de stockage atteinte. Passez à la formule supérieure pour continuer la synchronisation.')}
                    </Text>
                )}
            </View>
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        borderRadius: 16,
        padding: 16,
        borderWidth: StyleSheet.hairlineWidth,
        marginHorizontal: 16,
        marginBottom: 20,
    },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 12,
        gap: 8,
    },
    titleIOS: {
        fontSize: 16,
        fontWeight: '600',
        fontFamily: 'System',
    },
    titleAndroid: {
        fontSize: 14,
        fontWeight: '500',
    },
    barContainer: {
        marginBottom: 12,
    },
    progressBar: {
        height: 6,
        borderRadius: 3,
        backgroundColor: 'rgba(0,0,0,0.05)',
    },
    footer: {
        gap: 4,
    },
    usageText: {
        fontSize: 13,
        fontWeight: '500',
    },
    errorText: {
        fontSize: 12,
        color: '#FF3B30',
        lineHeight: 16,
        marginTop: 4,
    }
});

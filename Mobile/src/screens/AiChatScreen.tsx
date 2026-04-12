import React, { useState, useRef, useEffect } from 'react';
import { View, Text, StyleSheet, TextInput, TouchableOpacity, ScrollView, KeyboardAvoidingView, Platform, ActivityIndicator, LayoutAnimation, UIManager } from 'react-native';
import Ionicons from 'react-native-vector-icons/Ionicons';
import { fetchServerConfig } from '../services/config';
import { systemInstruction, getResponse } from '../services/ai';
import { useAppTheme } from '../hooks/useAppTheme';
import { triggerHaptic } from '../utils/hapticEngine';
import { useSafeAreaInsets, SafeAreaView } from 'react-native-safe-area-context';

if (Platform.OS === 'android' && UIManager.setLayoutAnimationEnabledExperimental) {
  UIManager.setLayoutAnimationEnabledExperimental(true);
}

export const AiChatScreen = ({ route, navigation }: any) => {
  const { initialNoteContext } = route.params || {};
  const [messages, setMessages] = useState<any[]>([]);
  const [input, setInput] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const scrollViewRef = useRef<ScrollView>(null);
  const insets = useSafeAreaInsets();
  
  // Use official Fiip App theme
  const { isDark, colors } = useAppTheme();

  const bgColor = colors.background;
  const textColor = colors.text;
  const subTextColor = colors.textSecondary;
  
  // Fiip Theme specific bubble colors
  const bubbleUserBg = colors.primary; 
  const bubbleUserText = '#FFFFFF';
  
  // A clean surface card color for AI bubble
  const bubbleAiBg = isDark ? '#1C1C1E' : '#FFFFFF';
  const bubbleAiText = textColor;
  const borderLight = isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.05)';

  useEffect(() => {
    let initialGreeting = "Bonjour ! Je suis FiipCopilot. Comment puis-je vous aider ?";
    if (initialNoteContext) {
      initialGreeting = "J'ai bien pris connaissance du contexte de votre note. Que souhaitez-vous faire ou savoir ?";
    }
    setMessages([{ role: 'assistant', content: initialGreeting }]);
  }, [initialNoteContext]);

  const handleSend = async () => {
    if (!input.trim()) return;
    
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    
    const userMsg = input.trim();
    const newMsgObj = { role: 'user', content: userMsg };
    
    setMessages(prev => [...prev, newMsgObj]);
    setInput('');
    setIsTyping(true);
    triggerHaptic('impactLight');

    setTimeout(() => {
      scrollViewRef.current?.scrollToEnd({ animated: true });
    }, 150);

    try {
      const config = await fetchServerConfig();
      const apiKey = config?.keys?.OPENROUTER_API_KEY || '';
      
      const conversation = [
        { role: 'system', content: systemInstruction + (initialNoteContext ? "\nContexte de la note actuelle : " + initialNoteContext : "") },
        ...messages,
        newMsgObj
      ];

      const reply = await getResponse(conversation, apiKey);
      
      if (reply) {
        LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
        setMessages(prev => [...prev, { role: 'assistant', content: reply }]);
        triggerHaptic('notificationSuccess');
      }

    } catch (e) {
      setMessages(prev => [...prev, { role: 'assistant', content: "Désolé, une erreur de réseau est survenue." }]);
    } finally {
      setIsTyping(false);
      setTimeout(() => {
        scrollViewRef.current?.scrollToEnd({ animated: true });
      }, 150);
    }
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: bgColor }]}>
      {/* Header Fiip Style */}
      <View style={[styles.headerAbsolute, { paddingTop: Math.max(insets.top, 10), backgroundColor: isDark ? 'rgba(10,10,10,0.92)' : 'rgba(240,240,245,0.92)', borderBottomColor: borderLight }]}>
        <View style={styles.headerLayout}>
          <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
            <Ionicons name="chevron-back" size={26} color={colors.primary} />
            <Text style={[styles.backText, { color: colors.primary }]}>Retour</Text>
          </TouchableOpacity>
          <View style={styles.headerTitleContainer}>
            <View style={[styles.iconGlowWrapper, { backgroundColor: isDark ? 'rgba(10, 132, 255, 0.15)' : 'rgba(10, 132, 255, 0.1)' }]}>
              <Ionicons name="sparkles" size={14} color={colors.primary} />
            </View>
            <Text style={[styles.headerTitle, { color: textColor }]}>FiipCopilot</Text>
          </View>
          <View style={{ width: 80 }} />
        </View>
      </View>

      <KeyboardAvoidingView 
        style={{ flex: 1 }} 
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <ScrollView 
          ref={scrollViewRef} 
          style={styles.chatArea}
          contentContainerStyle={[styles.chatContent, { paddingBottom: 20 }]}
          showsVerticalScrollIndicator={false}
          onContentSizeChange={() => scrollViewRef.current?.scrollToEnd({ animated: true })}
        >
          <Text style={styles.timestamp}>{new Date().toLocaleDateString('fr-FR', { weekday: 'long', hour: '2-digit', minute: '2-digit'})}</Text>

          {messages.map((m, i) => {
            const isUser = m.role === 'user';
            return (
              <View key={i} style={[styles.bubbleRow, isUser ? styles.bubbleRowRight : styles.bubbleRowLeft]}>
                {!isUser && (
                  <View style={[styles.aiAvatar, { backgroundColor: isDark ? colors.border : '#E5E5EA' }]}>
                    <Ionicons name="sparkles" size={12} color={isDark ? '#FFF' : '#8E8E93'} />
                  </View>
                )}
                <View style={[
                  styles.bubble,
                  isUser ? [styles.bubbleUser, { backgroundColor: bubbleUserBg }] : [styles.bubbleAi, { backgroundColor: bubbleAiBg }],
                  !isUser && !isDark && styles.bubbleAiShadow
                ]}>
                  <Text style={[styles.bubbleText, isUser ? { color: bubbleUserText } : { color: bubbleAiText }]}>
                    {m.content}
                  </Text>
                </View>
              </View>
            );
          })}
          
          {isTyping && (
            <View style={[styles.bubbleRow, styles.bubbleRowLeft]}>
              <View style={[styles.aiAvatar, { backgroundColor: isDark ? colors.border : '#E5E5EA' }]}>
                <Ionicons name="sparkles" size={12} color={isDark ? '#FFF' : '#8E8E93'} />
              </View>
              <View style={[styles.bubble, styles.bubbleAi, { backgroundColor: bubbleAiBg, paddingHorizontal: 20, paddingVertical: 14 }]}>
                <ActivityIndicator size="small" color={subTextColor} />
              </View>
            </View>
          )}
        </ScrollView>

        {/* Input Area with bottom safe padding */}
        <View style={[styles.inputOuterContainer, { backgroundColor: bgColor, paddingBottom: Math.max(insets.bottom, 12), borderTopColor: borderLight, borderTopWidth: StyleSheet.hairlineWidth }]}>
          <View style={[styles.inputContainer, { backgroundColor: isDark ? 'rgba(255,255,255,0.06)' : colors.card, borderColor: borderLight }]}>
            <TextInput
              style={[styles.input, { color: textColor }]}
              placeholder="Que voulez-vous demander..."
              placeholderTextColor={subTextColor}
              value={input}
              onChangeText={setInput}
              multiline
              maxLength={2500}
            />
            <TouchableOpacity 
              activeOpacity={0.7}
              onPress={handleSend} 
              disabled={!input.trim()} 
              style={styles.sendBtn}
            >
              <View style={[
                styles.sendCircle, 
                { backgroundColor: input.trim() ? colors.primary : (isDark ? '#38383A' : '#E5E5EA') }
              ]}>
                <Ionicons name="arrow-up" size={18} color={input.trim() ? "#FFF" : subTextColor} />
              </View>
            </TouchableOpacity>
          </View>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1 },
  headerAbsolute: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    zIndex: 10,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  headerLayout: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 8,
    paddingBottom: 12,
  },
  backBtn: { flexDirection: 'row', alignItems: 'center', width: 80, paddingVertical: 4 },
  backText: { fontSize: 17, marginLeft: -6, fontWeight: '400' },
  headerTitleContainer: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center' },
  iconGlowWrapper: {
    padding: 6,
    borderRadius: 12,
    marginRight: 8,
  },
  headerTitle: { fontSize: 17, fontWeight: '600', letterSpacing: 0.1 },
  chatArea: {
    flex: 1,
    marginTop: Platform.OS === 'ios' ? 100 : 70, // Buffer for header
  },
  chatContent: {
    paddingHorizontal: 16,
    paddingTop: 12,
  },
  timestamp: {
    alignSelf: 'center',
    fontSize: 12,
    marginBottom: 24,
    fontWeight: '500',
    textTransform: 'capitalize',
    color: '#8E8E93',
  },
  bubbleRow: {
    flexDirection: 'row',
    marginBottom: 18,
    alignItems: 'flex-end',
  },
  bubbleRowRight: {
    justifyContent: 'flex-end',
  },
  bubbleRowLeft: {
    justifyContent: 'flex-start',
  },
  aiAvatar: {
    width: 28,
    height: 28,
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 8,
    marginBottom: 4,
  },
  bubble: {
    maxWidth: '78%',
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  bubbleAiShadow: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 3,
    elevation: 2,
  },
  bubbleUser: {
    borderRadius: 20,
    borderBottomRightRadius: 4,
  },
  bubbleAi: {
    borderRadius: 20,
    borderBottomLeftRadius: 4,
  },
  bubbleText: {
    fontSize: 16,
    lineHeight: 23,
    letterSpacing: 0,
  },
  inputOuterContainer: {
    paddingHorizontal: 16,
    paddingTop: 12,
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    borderRadius: 24,
    paddingLeft: 18,
    paddingRight: 6,
    paddingVertical: 6,
    borderWidth: StyleSheet.hairlineWidth,
  },
  input: {
    flex: 1,
    fontSize: 16,
    minHeight: 34,
    maxHeight: 130,
    paddingTop: 8,
    paddingBottom: 8,
    marginRight: 10,
  },
  sendBtn: {
    marginBottom: 4,
  },
  sendCircle: {
    width: 32,
    height: 32,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
  }
});

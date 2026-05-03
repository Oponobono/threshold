import React, { useState, useEffect, useRef } from 'react';
import {
  View, Text, Modal, TouchableOpacity, TextInput, FlatList,
  KeyboardAvoidingView, Platform, ActivityIndicator, StyleSheet, Keyboard
} from 'react-native';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import * as FileSystem from 'expo-file-system/legacy';
import { theme } from '../styles/theme';
import { AIContextItemData } from './AIContextItem';
import { extractTextFromImage } from '../services/api/documents';
import { sendAIChatMessage } from '../services/api';

export interface SubjectAIChatModalProps {
  isVisible: boolean;
  onClose: () => void;
  selectedItems: AIContextItemData[];
  subjectName: string;
}

type ChatMessage = {
  id: string;
  role: 'user' | 'assistant';
  content: string;
};

export const SubjectAIChatModal: React.FC<SubjectAIChatModalProps> = ({
  isVisible,
  onClose,
  selectedItems,
  subjectName,
}) => {
  const insets = useSafeAreaInsets();
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [inputText, setInputText] = useState('');
  const [isLoadingContext, setIsLoadingContext] = useState(false);
  const [isSending, setIsSending] = useState(false);
  const [contextText, setContextText] = useState('');
  const flatListRef = useRef<FlatList>(null);

  // Compilar contexto al abrir
  useEffect(() => {
    if (isVisible && selectedItems.length > 0 && !contextText) {
      compileContext();
    }
    if (!isVisible) {
      setMessages([]);
      setContextText('');
      setInputText('');
    }
  }, [isVisible]);

  const compileContext = async () => {
    setIsLoadingContext(true);
    let compiled = '';

    for (const item of selectedItems) {
      compiled += `\n\n=== ARCHIVO: ${item.label} (${item.type}) ===\n`;
      try {
        if (item.type === 'photo' || item.type === 'document') {
          if (item.uri) {
            const base64 = await FileSystem.readAsStringAsync(item.uri, { encoding: FileSystem.EncodingType.Base64 });
            const ocrText = await extractTextFromImage(base64);
            compiled += ocrText ? ocrText : '(No se pudo extraer texto claro de la imagen)';
          }
        } else if (item.type === 'recording' || item.type === 'video') {
          const transcriptUri = item.rawItem?.transcript_uri;
          const summaryUri = item.rawItem?.summary_uri;
          
          if (transcriptUri) {
            const transcriptText = await FileSystem.readAsStringAsync(transcriptUri);
            compiled += transcriptText;
          } else if (summaryUri) {
            const summaryText = await FileSystem.readAsStringAsync(summaryUri);
            compiled += summaryText;
          } else {
            compiled += '(Aún no hay transcripción generada para este archivo. El estudiante debe transcribirlo primero en su respectiva pantalla.)';
          }
        }
      } catch (error) {
        console.error(`Error leyendo contexto para ${item.label}:`, error);
        compiled += '(Error al leer el archivo local)';
      }
    }

    setContextText(compiled.trim());
    setIsLoadingContext(false);
    
    // Mensaje de bienvenida inicial
    setMessages([
      {
        id: 'welcome',
        role: 'assistant',
        content: `¡Hola! He analizado los ${selectedItems.length} archivos de contexto de **${subjectName}**.\n\n¿Qué te gustaría saber o repasar sobre esto?`
      }
    ]);
  };

  const handleSend = async () => {
    if (!inputText.trim() || isSending || isLoadingContext) return;

    const userText = inputText.trim();
    const newUserMsg: ChatMessage = { id: Date.now().toString(), role: 'user', content: userText };
    setMessages(prev => [...prev, newUserMsg]);
    setInputText('');
    setIsSending(true);
    Keyboard.dismiss();

    try {
      // Formato esperado por Groq: array de { role, content } sin 'id'
      const historyForApi = messages.map(m => ({ role: m.role, content: m.content }));
      historyForApi.push({ role: 'user', content: userText });

      const response = await sendAIChatMessage(contextText, historyForApi);
      
      const botMsg: ChatMessage = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: response.reply.content
      };
      
      setMessages(prev => [...prev, botMsg]);
    } catch (error: any) {
      const errorMsg: ChatMessage = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: `Error: No pude procesar tu pregunta. ${error.message}`
      };
      setMessages(prev => [...prev, errorMsg]);
    } finally {
      setIsSending(false);
    }
  };

  const renderMessage = ({ item }: { item: ChatMessage }) => {
    const isUser = item.role === 'user';
    return (
      <View style={[styles.messageBubble, isUser ? styles.messageUser : styles.messageBot]}>
        {!isUser && (
          <View style={styles.botIcon}>
            <MaterialCommunityIcons name="robot-outline" size={16} color={theme.colors.primary} />
          </View>
        )}
        <View style={[styles.messageContent, isUser ? styles.messageContentUser : styles.messageContentBot]}>
          <Text style={[styles.messageText, isUser ? styles.messageTextUser : styles.messageTextBot]}>
            {item.content}
          </Text>
        </View>
      </View>
    );
  };

  return (
    <Modal visible={isVisible} animationType="slide" presentationStyle="pageSheet" onRequestClose={onClose}>
      <View style={[styles.container, { paddingTop: Platform.OS === 'ios' ? 0 : insets.top }]}>
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity onPress={onClose} style={styles.closeBtn}>
            <Ionicons name="chevron-down" size={24} color={theme.colors.text.primary} />
          </TouchableOpacity>
          <View style={styles.headerTitleContainer}>
            <MaterialCommunityIcons name="auto-fix" size={20} color={theme.colors.primary} />
            <Text style={styles.headerTitle}>Tutor IA</Text>
            <View style={styles.badge}>
              <Text style={styles.badgeText}>{selectedItems.length} refs</Text>
            </View>
          </View>
          <View style={{ width: 40 }} />
        </View>

        {/* Body */}
        {isLoadingContext ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color={theme.colors.primary} />
            <Text style={styles.loadingText}>Leyendo y consolidando contexto...</Text>
            <Text style={styles.loadingSub}>
              Procesando {selectedItems.length} archivos para responder tus dudas.
            </Text>
          </View>
        ) : (
          <KeyboardAvoidingView 
            style={{ flex: 1 }} 
            behavior={Platform.OS === 'ios' ? 'padding' : undefined}
          >
            <FlatList
              ref={flatListRef}
              data={messages}
              keyExtractor={i => i.id}
              renderItem={renderMessage}
              contentContainerStyle={styles.chatList}
              onContentSizeChange={() => flatListRef.current?.scrollToEnd({ animated: true })}
              onLayout={() => flatListRef.current?.scrollToEnd({ animated: true })}
            />

            {/* Input Area */}
            <View style={[styles.inputContainer, { paddingBottom: Math.max(insets.bottom, 12) }]}>
              <View style={styles.inputWrapper}>
                <TextInput
                  style={styles.input}
                  placeholder="Escribe tu pregunta..."
                  placeholderTextColor={theme.colors.text.secondary}
                  value={inputText}
                  onChangeText={setInputText}
                  multiline
                  maxLength={500}
                />
                <TouchableOpacity 
                  onPress={handleSend} 
                  disabled={!inputText.trim() || isSending}
                  style={[
                    styles.sendBtn, 
                    (!inputText.trim() || isSending) && styles.sendBtnDisabled
                  ]}
                >
                  {isSending ? (
                    <ActivityIndicator size="small" color="#fff" />
                  ) : (
                    <Ionicons name="send" size={18} color="#fff" />
                  )}
                </TouchableOpacity>
              </View>
            </View>
          </KeyboardAvoidingView>
        )}
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.background,
  },
  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 16, paddingVertical: 12,
    borderBottomWidth: 1, borderBottomColor: theme.colors.border,
  },
  closeBtn: {
    width: 40, height: 40, alignItems: 'center', justifyContent: 'center',
  },
  headerTitleContainer: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
  },
  headerTitle: {
    fontSize: 18, fontWeight: '800', color: theme.colors.text.primary,
  },
  badge: {
    backgroundColor: `${theme.colors.primary}20`,
    paddingHorizontal: 8, paddingVertical: 2, borderRadius: 12, marginLeft: 4,
  },
  badgeText: {
    fontSize: 11, fontWeight: '700', color: theme.colors.primary,
  },
  loadingContainer: {
    flex: 1, alignItems: 'center', justifyContent: 'center', padding: 32, gap: 12,
  },
  loadingText: {
    fontSize: 16, fontWeight: '700', color: theme.colors.text.primary, marginTop: 8,
  },
  loadingSub: {
    fontSize: 14, color: theme.colors.text.secondary, textAlign: 'center',
  },
  chatList: {
    padding: 16, paddingBottom: 32,
  },
  messageBubble: {
    flexDirection: 'row', marginBottom: 16, alignItems: 'flex-end',
  },
  messageUser: {
    justifyContent: 'flex-end',
  },
  messageBot: {
    justifyContent: 'flex-start',
  },
  botIcon: {
    width: 28, height: 28, borderRadius: 14,
    backgroundColor: `${theme.colors.primary}15`,
    alignItems: 'center', justifyContent: 'center',
    marginRight: 8,
  },
  messageContent: {
    maxWidth: '80%', paddingHorizontal: 16, paddingVertical: 12, borderRadius: 20,
  },
  messageContentUser: {
    backgroundColor: theme.colors.primary, borderBottomRightRadius: 4,
  },
  messageContentBot: {
    backgroundColor: theme.colors.card, borderWidth: 1, borderColor: theme.colors.border,
    borderBottomLeftRadius: 4,
  },
  messageText: {
    fontSize: 15, lineHeight: 22,
  },
  messageTextUser: {
    color: '#fff',
  },
  messageTextBot: {
    color: theme.colors.text.primary,
  },
  inputContainer: {
    paddingHorizontal: 16, paddingTop: 12,
    borderTopWidth: 1, borderTopColor: theme.colors.border,
    backgroundColor: theme.colors.background,
  },
  inputWrapper: {
    flexDirection: 'row', alignItems: 'flex-end', gap: 10,
  },
  input: {
    flex: 1, backgroundColor: theme.colors.card,
    borderWidth: 1, borderColor: theme.colors.border,
    borderRadius: 24, paddingHorizontal: 16, paddingTop: 12, paddingBottom: 12,
    fontSize: 15, color: theme.colors.text.primary,
    maxHeight: 120, minHeight: 48,
  },
  sendBtn: {
    width: 48, height: 48, borderRadius: 24,
    backgroundColor: theme.colors.primary,
    alignItems: 'center', justifyContent: 'center',
  },
  sendBtnDisabled: {
    backgroundColor: theme.colors.border,
  },
});

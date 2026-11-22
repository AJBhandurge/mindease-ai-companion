import React, { useState, useRef, useEffect, useCallback } from 'react';
import {
  View, Text, TextInput, Pressable, FlatList, StyleSheet, Animated, Vibration,
  KeyboardAvoidingView, Platform, Modal, ScrollView,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Feather } from '@expo/vector-icons';
import { Audio } from 'expo-av';
import * as FileSystem from 'expo-file-system';
import { chatAPI } from '../services/api';
import { useStore } from '../store';
import {
  colors, emotionColors, moodColors, radius, spacing, type, webNoOutline, nativeDriver, MAX_CONTENT_WIDTH,
} from '../theme';
import { getCompanion } from '../theme/companions';
import CompanionAvatar from '../components/CompanionAvatar';
import MessageText from '../components/MessageText';
import TypingIndicator from '../components/TypingIndicator';
import CrisisCard from '../components/CrisisCard';

const IS_WEB = Platform.OS === 'web';

const STARTERS = [
  "I'm feeling anxious",
  'I had a rough day',
  "I can't switch off my thoughts",
  'I just want to talk',
];

interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: string;
  emotion?: string;
  confidence?: number;
  companion_mood?: string;
  avatar_reaction?: string;
  strategy?: string;
  crisis?: boolean;
  retryText?: string;
}

// Backend timestamps are naive UTC (no "Z"); without it JS would read them as local time.
const formatTime = (iso: string) => {
  const normalized = /Z|[+-]\d\d:\d\d$/.test(iso) ? iso : iso + 'Z';
  const d = new Date(normalized);
  return isNaN(d.getTime()) ? '' : d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
};

// "**Box Breathing** -- Breathe in 4..." → { title, body }
const parseStrategy = (s: string) => {
  const m = s.match(/^\*\*(.+?)\*\*\s*-+\s*([\s\S]*)$/);
  return m ? { title: m[1], body: m[2] } : { title: 'Try this', body: s };
};

export default function ChatScreen({ navigation }: any) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [isStartingRecording, setIsStartingRecording] = useState(false);
  const [isTranscribing, setIsTranscribing] = useState(false);
  const [companionMood, setCompanionMood] = useState('warm');
  const [avatarReaction, setAvatarReaction] = useState('');
  const [helpOpen, setHelpOpen] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);

  const flatListRef = useRef<FlatList>(null);
  const recordingRef = useRef<Audio.Recording | null>(null);
  const recordingPendingRef = useRef(false);
  const loadingRef = useRef(false);
  const { userId, sessionId, setSession, voiceEnabled, toggleVoice, username, companionId } = useStore();

  const companion = getCompanion(companionId);
  const moodColor = moodColors[companionMood] || companion.accent;
  const speakReplies = !IS_WEB && voiceEnabled;

  useEffect(() => {
    setCompanionMood('warm');
    setMessages([{
      id: 'welcome', role: 'assistant',
      content: companion.welcome(username || undefined),
      timestamp: new Date().toISOString(),
    }]);
  }, [companionId]);

  const scrollToBottom = () => {
    setTimeout(() => flatListRef.current?.scrollToEnd({ animated: true }), 80);
  };

  const showNotice = (text: string) => {
    setNotice(text);
    setTimeout(() => setNotice(null), 3500);
  };

  const sendMessage = useCallback(async (text?: string, isRetry = false) => {
    const msg = (text ?? input).trim();
    if (!msg || !userId) return;
    if (loadingRef.current) {
      if (!isRetry) setInput(msg);
      showNotice('Your message is ready. Send it after the current reply finishes.');
      return;
    }

    if (!isRetry) {
      setInput('');
      setMessages(prev => [...prev, {
        id: `u-${Date.now()}`, role: 'user', content: msg, timestamp: new Date().toISOString(),
      }]);
    }
    loadingRef.current = true;
    setLoading(true);
    scrollToBottom();

    try {
      let sid = sessionId;
      if (!sid) {
        const s = await chatAPI.startSession(userId);
        sid = s.data.session_id as number;
        setSession(sid);
      }

      const { data } = await chatAPI.sendMessage(msg, sid, userId, speakReplies);

      if (data.companion_mood) setCompanionMood(data.companion_mood);
      if (data.avatar_reaction) {
        setAvatarReaction(data.avatar_reaction);
        setTimeout(() => setAvatarReaction(''), 2500);
      }
      if (['gasp', 'shocked', 'excited'].includes(data.lead_expression || '')) Vibration.vibrate(80);

      // Attach the detected emotion to the user's message it belongs to.
      setMessages(prev => {
        const next = [...prev];
        for (let i = next.length - 1; i >= 0; i--) {
          if (next[i].role === 'user') {
            next[i] = { ...next[i], emotion: data.emotion?.emotion, confidence: data.emotion?.confidence };
            break;
          }
        }
        return [...next, {
          id: `a-${Date.now()}`, role: 'assistant', content: data.response,
          timestamp: data.timestamp, companion_mood: data.companion_mood,
          avatar_reaction: data.avatar_reaction, strategy: data.strategy || undefined,
          crisis: data.crisis_level === 2,
        }];
      });

      if (speakReplies && data.audio) await playAudio(data.audio);
    } catch {
      setMessages(prev => [...prev, {
        id: `e-${Date.now()}`, role: 'assistant',
        content: "I couldn't reach the server just now. Check your connection and try again.",
        timestamp: new Date().toISOString(), retryText: msg,
      }]);
    } finally {
      loadingRef.current = false;
      setLoading(false);
      scrollToBottom();
    }
  }, [input, userId, sessionId, speakReplies]);

  const retry = (m: Message) => {
    setMessages(prev => prev.filter(x => x.id !== m.id));
    sendMessage(m.retryText, true);
  };

  const startRecording = async () => {
    if (recordingPendingRef.current || loading || isTranscribing) return;
    recordingPendingRef.current = true;
    setIsStartingRecording(true);
    try {
      const permission = await Audio.requestPermissionsAsync();
      if (!permission.granted) {
        showNotice('Allow microphone access to send a voice message.');
        return;
      }
      await Audio.setAudioModeAsync({ allowsRecordingIOS: true, playsInSilentModeIOS: true });
      const { recording: nextRecording } = await Audio.Recording.createAsync(Audio.RecordingOptionsPresets.HIGH_QUALITY);
      recordingRef.current = nextRecording;
      setIsRecording(true);
      Vibration.vibrate(50);
    } catch {
      showNotice(IS_WEB
        ? 'Could not start the microphone. Allow access and use localhost or HTTPS.'
        : "Couldn't access the microphone. Check app permissions.");
    } finally {
      recordingPendingRef.current = false;
      setIsStartingRecording(false);
    }
  };

  const stopRecording = async () => {
    const activeRecording = recordingRef.current;
    if (!activeRecording) return;
    recordingRef.current = null;
    setIsRecording(false);
    Vibration.vibrate(50);
    try {
      await activeRecording.stopAndUnloadAsync();
      const uri = activeRecording.getURI();
      if (uri) {
        setIsTranscribing(true);
        const res = await chatAPI.sendVoice(uri);
        const transcript = typeof res.data?.text === 'string' ? res.data.text.trim() : '';
        if (transcript) {
          setInput(transcript);
          await sendMessage(transcript);
        } else {
          showNotice("Sorry, I couldn't make that out. Try again or type instead.");
        }
      }
    } catch {
      showNotice("Sorry, I couldn't make that out. Try again or type instead.");
    } finally {
      setIsTranscribing(false);
    }
  };

  const toggleRecording = () => {
    if (recordingRef.current) {
      void stopRecording();
    } else {
      void startRecording();
    }
  };

  const playAudio = async (base64Audio: string) => {
    try {
      // Recording leaves iOS routed to the earpiece; switch back to the loudspeaker
      await Audio.setAudioModeAsync({ allowsRecordingIOS: false, playsInSilentModeIOS: true });
      const uri = FileSystem.documentDirectory + `response_${Date.now()}.wav`;
      await FileSystem.writeAsStringAsync(uri, base64Audio, { encoding: FileSystem.EncodingType.Base64 });
      const { sound } = await Audio.Sound.createAsync({ uri }, { volume: 1.0 });
      await sound.playAsync();
      sound.setOnPlaybackStatusUpdate((status) => {
        if (status.isLoaded && status.didJustFinish) {
          sound.unloadAsync();
          FileSystem.deleteAsync(uri, { idempotent: true });
        }
      });
    } catch (e) {
      console.error('Audio playback error:', e);
    }
  };

  const onKeyPress = (e: any) => {
    // Web: Enter sends, Shift+Enter adds a new line.
    if (IS_WEB && e.nativeEvent.key === 'Enter' && !e.nativeEvent.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  const canSend = !!input.trim() && !loading;
  const showStarters = messages.length === 1 && !loading;

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      {/* Header */}
      <View style={styles.headerBar}>
        <View style={styles.header}>
          <Pressable
            style={styles.identity}
            onPress={() => navigation.navigate('CompanionSelect')}
            accessibilityRole="button"
            accessibilityLabel={`${companion.name}, feeling ${companionMood.replace('_', ' ')}. Change companion`}
          >
            <CompanionAvatar
              emoji={avatarReaction || companion.emoji}
              ringColor={moodColor}
              background={companion.accentSoft}
              size={42}
            />
            <View style={{ flex: 1 }}>
              <View style={styles.nameRow}>
                <Text style={type.headline}>{companion.name}</Text>
                <Feather name="chevron-down" size={16} color={colors.textSubtle} />
              </View>
              <View style={styles.statusRow}>
                <View style={[styles.statusDot, { backgroundColor: moodColor }]} />
                <Text style={[type.caption, { color: colors.textMuted }]}>
                  {loading ? 'Typing…' : `Feeling ${companionMood.replace('_', ' ')}`}
                </Text>
              </View>
            </View>
          </Pressable>

          {!IS_WEB && (
            <IconButton
              icon={voiceEnabled ? 'volume-2' : 'volume-x'}
              label={voiceEnabled ? 'Turn off spoken replies' : 'Turn on spoken replies'}
              onPress={toggleVoice}
            />
          )}
          <IconButton icon="life-buoy" label="Get help now" onPress={() => setHelpOpen(true)} tint={colors.danger} />
        </View>
      </View>

      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <FlatList
          ref={flatListRef}
          data={messages}
          keyExtractor={item => item.id}
          renderItem={({ item }) => (
            <MessageRow item={item} accent={companion.accent} accentSoft={companion.accentSoft}
              emoji={companion.emoji} onRetry={retry} />
          )}
          contentContainerStyle={styles.list}
          onContentSizeChange={scrollToBottom}
          keyboardShouldPersistTaps="handled"
          ListFooterComponent={
            <View style={{ gap: spacing.md }}>
              {loading && (
                <View style={styles.aiRow}>
                  <CompanionAvatar emoji={companion.emoji} ringColor={moodColor} background={companion.accentSoft} size={30} />
                  <TypingIndicator color={companion.accent} />
                </View>
              )}
              {showStarters && (
                <View style={styles.starters}>
                  <Text style={[type.overline, { marginBottom: spacing.xs }]}>Not sure where to start?</Text>
                  <View style={styles.starterWrap}>
                    {STARTERS.map(s => (
                      <Pressable
                        key={s}
                        onPress={() => sendMessage(s)}
                        style={({ pressed }) => [styles.chip, { borderColor: companion.accent + '55' }, pressed && styles.chipPressed]}
                        accessibilityRole="button"
                      >
                        <Text style={[styles.chipText, { color: companion.accent }]}>{s}</Text>
                      </Pressable>
                    ))}
                  </View>
                </View>
              )}
            </View>
          }
        />

        {/* Composer */}
        <View style={styles.composerBar}>
          <View style={styles.composerColumn}>
            {notice && (
              <View style={styles.notice} accessibilityLiveRegion="polite">
                <Feather name="info" size={14} color={colors.warning} />
                <Text style={[type.callout, { flex: 1 }]}>{notice}</Text>
              </View>
            )}
            {isRecording || isStartingRecording || isTranscribing ? (
              <View style={styles.recordingHint}>
                <View style={styles.recDot} />
                <Text style={type.callout}>
                  {isStartingRecording ? 'Starting microphone…' : isTranscribing ? 'Transcribing voice…' : 'Listening… tap stop to send'}
                </Text>
              </View>
            ) : (
              <Text style={[type.caption, styles.voiceHint]}>Tap the microphone to send a voice message</Text>
            )}
            <View style={styles.composer}>
              <View style={styles.inputWrap}>
                <TextInput
                  style={[styles.input, webNoOutline]}
                  value={input}
                  onChangeText={setInput}
                  placeholder={`Message ${companion.name}…`}
                  placeholderTextColor={colors.textSubtle}
                  multiline
                  maxLength={1000}
                  onKeyPress={onKeyPress}
                  accessibilityLabel={`Message ${companion.name}`}
                />
                <Pressable
                  onPress={toggleRecording}
                  disabled={isStartingRecording || isTranscribing || loading}
                  style={[
                    styles.micBtn,
                    isRecording && styles.micActive,
                    (isStartingRecording || isTranscribing || loading) && styles.micDisabled,
                  ]}
                  hitSlop={8}
                  accessibilityRole="button"
                  accessibilityLabel={isRecording ? 'Stop recording and send voice message' : 'Start voice message'}
                  accessibilityState={{ disabled: isStartingRecording || isTranscribing || loading }}
                >
                  <Feather name={isRecording ? 'square' : 'mic'} size={18} color={isRecording ? colors.text : colors.textMuted} />
                </Pressable>
              </View>
              <Pressable
                onPress={() => sendMessage()}
                disabled={!canSend}
                style={[styles.sendBtn, { backgroundColor: canSend ? companion.accent : colors.surfaceAlt }]}
                accessibilityRole="button"
                accessibilityLabel="Send message"
                accessibilityState={{ disabled: !canSend }}
              >
                <Feather name="arrow-up" size={20} color={canSend ? colors.textOnAccent : colors.textSubtle} />
              </Pressable>
            </View>
            <Text style={[type.caption, styles.disclaimer]}>
              {companion.name} is an AI companion, not a therapist. In an emergency, tap{' '}
              <Feather name="life-buoy" size={11} color={colors.textSubtle} /> for helplines.
            </Text>
          </View>
        </View>
      </KeyboardAvoidingView>

      <Modal visible={helpOpen} transparent animationType="fade" onRequestClose={() => setHelpOpen(false)}>
        <Pressable style={styles.backdrop} onPress={() => setHelpOpen(false)} accessibilityLabel="Close">
          <Pressable style={styles.sheet} onPress={() => {}}>
            <ScrollView contentContainerStyle={{ gap: spacing.lg }}>
              <View style={styles.sheetHeader}>
                <Text style={type.title}>Get help now</Text>
                <IconButton icon="x" label="Close" onPress={() => setHelpOpen(false)} />
              </View>
              <CrisisCard
                title="You don't have to go through this alone"
                message="If you're struggling or thinking about harming yourself, please reach out to someone now."
              />
            </ScrollView>
          </Pressable>
        </Pressable>
      </Modal>
    </SafeAreaView>
  );
}

function IconButton({ icon, label, onPress, tint = colors.textMuted }: {
  icon: keyof typeof Feather.glyphMap; label: string; onPress: () => void; tint?: string;
}) {
  return (
    <Pressable
      onPress={onPress}
      hitSlop={6}
      style={({ pressed }) => [styles.iconBtn, pressed && { backgroundColor: colors.surfacePressed }]}
      accessibilityRole="button"
      accessibilityLabel={label}
    >
      <Feather name={icon} size={20} color={tint} />
    </Pressable>
  );
}

function MessageRow({ item, accent, accentSoft, emoji, onRetry }: {
  item: Message; accent: string; accentSoft: string; emoji: string; onRetry: (m: Message) => void;
}) {
  const appear = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    Animated.timing(appear, { toValue: 1, duration: 220, useNativeDriver: nativeDriver }).start();
  }, []);

  const isUser = item.role === 'user';
  const isError = !!item.retryText;
  const animStyle = {
    opacity: appear,
    transform: [{ translateY: appear.interpolate({ inputRange: [0, 1], outputRange: [8, 0] }) }],
  };

  if (isUser) {
    const emoColor = emotionColors[item.emotion || 'neutral'] || colors.textSubtle;
    return (
      <Animated.View style={[styles.userRow, animStyle]}>
        <View style={styles.userBubble}>
          <Text style={styles.userText}>{item.content}</Text>
        </View>
        <View style={styles.metaRow}>
          {item.emotion && (
            <>
              <View style={[styles.emoDot, { backgroundColor: emoColor }]} />
              <Text style={[type.caption, { color: emoColor, textTransform: 'capitalize' }]}>
                {item.emotion}{item.confidence != null ? ` · ${Math.round(item.confidence)}%` : ''}
              </Text>
              <Text style={type.caption}>·</Text>
            </>
          )}
          <Text style={type.caption}>{formatTime(item.timestamp)}</Text>
        </View>
      </Animated.View>
    );
  }

  const strategy = item.strategy ? parseStrategy(item.strategy) : null;

  return (
    <Animated.View style={[styles.aiRow, animStyle]}>
      <CompanionAvatar
        emoji={isError ? '⚠️' : item.avatar_reaction || emoji}
        ringColor={isError ? colors.warning : accent}
        background={accentSoft}
        size={30}
      />
      <View style={styles.aiContent}>
        <View style={[styles.aiBubble, isError && styles.errorBubble]}>
          <MessageText text={item.content} style={styles.aiText} />
        </View>

        {strategy && (
          <View style={[styles.strategy, { backgroundColor: accentSoft, borderLeftColor: accent }]}>
            <View style={styles.strategyHead}>
              <Feather name="wind" size={14} color={accent} />
              <Text style={[type.overline, { color: accent }]}>Try this · {strategy.title}</Text>
            </View>
            <Text style={styles.strategyBody}>{strategy.body}</Text>
          </View>
        )}

        {item.crisis && <CrisisCard compact />}

        {isError ? (
          <Pressable onPress={() => onRetry(item)} style={styles.retry} accessibilityRole="button">
            <Feather name="rotate-cw" size={13} color={colors.brand} />
            <Text style={[type.caption, { color: colors.brand, fontWeight: '600' }]}>Retry</Text>
          </Pressable>
        ) : (
          <Text style={[type.caption, { marginLeft: spacing.xs }]}>{formatTime(item.timestamp)}</Text>
        )}
      </View>
    </Animated.View>
  );
}

const column = { width: '100%' as const, maxWidth: MAX_CONTENT_WIDTH, alignSelf: 'center' as const };

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.bg },

  headerBar: { borderBottomWidth: 1, borderBottomColor: colors.border, backgroundColor: colors.bgElevated },
  header: {
    ...column, flexDirection: 'row', alignItems: 'center', gap: spacing.xs,
    paddingHorizontal: spacing.lg, paddingVertical: spacing.md,
  },
  identity: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  nameRow: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  statusRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 2 },
  statusDot: { width: 7, height: 7, borderRadius: 4 },
  iconBtn: { width: 44, height: 44, borderRadius: 22, alignItems: 'center', justifyContent: 'center' },

  list: { ...column, paddingHorizontal: spacing.lg, paddingTop: spacing.xl, paddingBottom: spacing.lg, gap: spacing.lg },

  aiRow: { flexDirection: 'row', alignItems: 'flex-start', gap: spacing.sm + 2, maxWidth: '88%' },
  aiContent: { flexShrink: 1, gap: spacing.sm },
  aiBubble: {
    backgroundColor: colors.surface, borderRadius: radius.lg, borderTopLeftRadius: radius.sm / 2,
    paddingHorizontal: spacing.lg, paddingVertical: spacing.md, borderWidth: 1, borderColor: colors.border,
  },
  errorBubble: { borderColor: 'rgba(251,191,36,0.4)' },
  aiText: { ...type.body },

  userRow: { alignSelf: 'flex-end', alignItems: 'flex-end', maxWidth: '82%', gap: spacing.xs + 2 },
  userBubble: {
    backgroundColor: '#2A3970', borderRadius: radius.lg, borderBottomRightRadius: radius.sm / 2,
    paddingHorizontal: spacing.lg, paddingVertical: spacing.md,
  },
  userText: { ...type.body, color: '#F1F4FF' },
  metaRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginRight: spacing.xs },
  emoDot: { width: 6, height: 6, borderRadius: 3 },

  strategy: { borderRadius: radius.md, borderLeftWidth: 3, padding: spacing.md, gap: spacing.xs + 2 },
  strategyHead: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  strategyBody: { ...type.callout, color: colors.text },
  retry: { flexDirection: 'row', alignItems: 'center', gap: 6, alignSelf: 'flex-start', padding: spacing.xs },

  starters: { marginTop: spacing.sm, paddingLeft: 40 },
  starterWrap: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  chip: {
    borderWidth: 1, borderRadius: radius.pill, paddingHorizontal: spacing.lg, paddingVertical: spacing.sm + 2,
    backgroundColor: colors.surface,
  },
  chipPressed: { backgroundColor: colors.surfacePressed },
  chipText: { fontSize: 14, fontWeight: '600' },

  composerBar: { borderTopWidth: 1, borderTopColor: colors.border, backgroundColor: colors.bgElevated },
  composerColumn: { ...column, paddingHorizontal: spacing.lg, paddingTop: spacing.md, paddingBottom: spacing.sm, gap: spacing.sm },
  composer: { flexDirection: 'row', alignItems: 'flex-end', gap: spacing.sm },
  inputWrap: {
    flex: 1, flexDirection: 'row', alignItems: 'flex-end', backgroundColor: colors.surface,
    borderRadius: 24, borderWidth: 1, borderColor: colors.border, paddingLeft: spacing.lg, paddingRight: 6,
    minHeight: 48,
  },
  input: {
    flex: 1, color: colors.text, fontSize: 15, lineHeight: 21, maxHeight: 120,
    paddingTop: 13, paddingBottom: 13,
  },
  micBtn: { width: 36, height: 36, borderRadius: 18, alignItems: 'center', justifyContent: 'center', marginBottom: 5 },
  micActive: { backgroundColor: colors.danger },
  micDisabled: { opacity: 0.5 },
  sendBtn: { width: 48, height: 48, borderRadius: 24, alignItems: 'center', justifyContent: 'center' },
  disclaimer: { textAlign: 'center' },
  voiceHint: { textAlign: 'center' },
  notice: {
    flexDirection: 'row', alignItems: 'center', gap: spacing.sm, backgroundColor: colors.surfaceAlt,
    borderRadius: radius.sm, padding: spacing.sm + 2,
  },
  recordingHint: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, justifyContent: 'center' },
  recDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: colors.danger },

  backdrop: { flex: 1, backgroundColor: 'rgba(3,7,18,0.72)', justifyContent: 'center', padding: spacing.xl },
  sheet: {
    width: '100%', maxWidth: 480, maxHeight: '90%', alignSelf: 'center', backgroundColor: colors.bgElevated,
    borderRadius: radius.xl, borderWidth: 1, borderColor: colors.border, padding: spacing.xl,
  },
  sheetHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
});

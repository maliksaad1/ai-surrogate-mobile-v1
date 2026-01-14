import React, { useState, useEffect, useRef } from 'react';
import { View, Text, TextInput, FlatList, Image, Pressable, KeyboardAvoidingView, Platform, Alert, ActivityIndicator, Linking, ScrollView, Modal } from 'react-native';
import { Send, Mic, MicOff, MoreVertical, Paperclip, X, Smile, ArrowLeft, Calendar, FileText, ExternalLink, Clock, Copy, Mail, Edit2, Check, PlusCircle, CreditCard, Share2, Trash2, TrendingUp, TrendingDown, Camera, File as FileIcon, Play, Square, Volume2, VolumeX } from 'lucide-react-native';
import { Message, Sender, AgentType, ChatSession } from '../types';
import { generateSurrogateResponse, generateConversationTitle } from '../services/geminiService';
import { db } from '../services/db';
import { voiceService } from '../services/voiceService';
import * as DocumentPicker from 'expo-document-picker';
import * as FileSystem from 'expo-file-system/legacy';
import { Audio } from 'expo-av';
// import * as ExpoSpeechRecognition from 'expo-speech-recognition'; // ❌ NATIVE MODULE - Only works with dev build (expo run:android/ios), not Expo Go
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import BackgroundWrapper from './BackgroundWrapper';
import GlassCard from './GlassCard';
import Markdown from 'react-native-markdown-display';
import { useTheme } from '../hooks/useTheme';

interface ChatScreenProps {
    sessionId: string;
}

interface AttachedFile {
    uri: string;
    name: string;
    mimeType: string;
    base64?: string;
}

// --- Sub-Component: Editable Email Widget (Styled) ---
const EmailWidget: React.FC<{ data: any }> = ({ data }) => {
    const [to, setTo] = useState(data.to);
    const [subject, setSubject] = useState(data.subject);
    const [body, setBody] = useState(data.body);
    const [isEditing, setIsEditing] = useState(false);

    const handleSend = async () => {
        try {
            const bodyContent = body.replace(/\n/g, "\r\n");
            const mailto = `mailto:${to}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(bodyContent)}`;
            await Linking.openURL(mailto);
        } catch (error: any) {
            Alert.alert("Error", `Could not open email client: ${error.message}`);
        }
    };

    const handleGmail = async () => {
        try {
            if (Platform.OS === 'android') {
                // Try to open Gmail Android app using Intent URI scheme
                const gmailIntentUrl = `intent://compose?to=${encodeURIComponent(to)}&subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}#Intent;package=com.google.android.gm;scheme=mailto;end`;
                try {
                    await Linking.openURL(gmailIntentUrl);
                } catch {
                    // Fallback to mailto if Gmail app not available
                    const mailtoLink = `mailto:${encodeURIComponent(to)}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
                    await Linking.openURL(mailtoLink);
                }
            } else {
                // iOS - use mailto which opens the default mail app
                const mailtoLink = `mailto:${encodeURIComponent(to)}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
                await Linking.openURL(mailtoLink);
            }
        } catch (error: any) {
            Alert.alert("Error", `Could not open Gmail app: ${error.message}`);
        }
    };

    if (isEditing) {
        // Full-screen edit modal with proper keyboard handling
        return (
            <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} className="flex-1">
                <Modal
                    visible={isEditing}
                    animationType="slide"
                    transparent={false}
                    onRequestClose={() => setIsEditing(false)}
                >
                    <View className="flex-1 bg-black/95 pt-4">
                        {/* Header */}
                        <View className="flex-row items-center justify-between px-4 pb-3 border-b border-neon-accent/20">
                            <Text className="text-white font-bold text-base">Edit Email Draft</Text>
                            <Pressable
                                onPress={() => setIsEditing(false)}
                                className="bg-neon-accent/20 px-3 py-1 rounded flex-row items-center gap-1"
                            >
                                <Check size={14} color="#EC4899" />
                                <Text className="text-neon-accent font-bold text-xs">Done</Text>
                            </Pressable>
                        </View>

                        {/* Scrollable Content */}
                        <ScrollView className="flex-1 px-4 py-4" showsVerticalScrollIndicator={true} bounces={true}>
                            {/* TO FIELD */}
                            <View className="mb-4">
                                <Text className="text-gray-400 text-xs font-bold mb-1.5 uppercase">Recipient Email</Text>
                                <TextInput
                                    value={to}
                                    onChangeText={setTo}
                                    placeholder="Enter recipient email"
                                    placeholderTextColor="#666"
                                    className="bg-black/50 border border-neon-accent/30 rounded-lg px-3 py-2.5 text-white text-sm"
                                    keyboardType="email-address"
                                />
                            </View>

                            {/* SUBJECT FIELD */}
                            <View className="mb-4">
                                <Text className="text-gray-400 text-xs font-bold mb-1.5 uppercase">Subject Line</Text>
                                <TextInput
                                    value={subject}
                                    onChangeText={setSubject}
                                    placeholder="Enter email subject"
                                    placeholderTextColor="#666"
                                    className="bg-black/50 border border-neon-accent/30 rounded-lg px-3 py-2.5 text-white text-sm"
                                    multiline
                                    numberOfLines={2}
                                />
                            </View>

                            {/* BODY FIELD */}
                            <View className="mb-4 flex-1">
                                <Text className="text-gray-400 text-xs font-bold mb-1.5 uppercase">Email Body</Text>
                                <TextInput
                                    value={body}
                                    onChangeText={setBody}
                                    placeholder="Enter email body"
                                    placeholderTextColor="#666"
                                    className="bg-black/50 border border-neon-accent/30 rounded-lg px-3 py-2.5 text-white text-sm flex-1"
                                    multiline
                                    numberOfLines={12}
                                    textAlignVertical="top"
                                />
                            </View>

                            {/* Spacing for keyboard */}
                            <View className="h-8" />
                        </ScrollView>

                        {/* Action Buttons */}
                        <View className="px-4 py-3 border-t border-neon-accent/20 flex-row gap-2 justify-end bg-black/80">
                            <Pressable
                                onPress={() => setIsEditing(false)}
                                className="bg-white/5 border border-white/10 py-2.5 px-4 rounded-lg"
                            >
                                <Text className="text-gray-300 text-xs font-bold">Cancel</Text>
                            </Pressable>
                            <Pressable
                                onPress={handleSend}
                                className="bg-neon-accent/20 border border-neon-accent/50 py-2.5 px-4 rounded-lg flex-row items-center gap-1"
                            >
                                <Send size={12} color="#EC4899" />
                                <Text className="text-neon-accent text-xs font-bold">Send</Text>
                            </Pressable>
                        </View>
                    </View>
                </Modal>
            </KeyboardAvoidingView>
        );
    }

    // View mode (not editing)
    return (
        <GlassCard className="mt-2 w-full !mb-0 border-neon-accent/30 !bg-neon-accent/5">
            <View className="flex-row items-center justify-between mb-2 border-b border-neon-accent/20 pb-2 p-3">
                <View className="flex-row items-center gap-2">
                    <View className="bg-neon-accent/20 p-1 rounded">
                        <Mail size={14} color="#EC4899" />
                    </View>
                    <Text className="text-xs font-bold text-neon-accent">Neural Draft</Text>
                </View>
                <Pressable
                    onPress={() => setIsEditing(true)}
                    className="flex-row items-center gap-1 bg-black/40 px-2 py-1 rounded"
                >
                    <Edit2 size={12} color="#EC4899" />
                    <Text className="text-xs text-neon-accent font-bold">Edit</Text>
                </Pressable>
            </View>

            <View className="space-y-2 p-3 pt-0">
                {/* TO FIELD */}
                <View className="flex-row items-start gap-2">
                    <Text className="font-bold text-gray-400 text-xs uppercase pt-0.5">To:</Text>
                    <Text className="text-white bg-white/5 px-2 py-1 rounded border border-white/5 text-xs flex-1 flex-wrap">{to}</Text>
                </View>

                {/* SUBJECT FIELD */}
                <View className="flex-row items-start gap-2">
                    <Text className="font-bold text-gray-400 text-xs uppercase pt-0.5">Subj:</Text>
                    <Text className="text-white font-medium text-xs flex-1 flex-wrap">{subject}</Text>
                </View>

                {/* BODY FIELD */}
                <View className="mt-2">
                    <Text className="text-xs text-gray-300 bg-white/5 p-2 rounded border border-white/5 font-mono flex-wrap">
                        {body}
                    </Text>
                </View>

                {/* Action Buttons */}
                <View className="pt-2 mt-1 flex-row gap-2 justify-end">
                    <Pressable onPress={handleSend} className="bg-neon-accent/20 border border-neon-accent/50 py-2 px-4 rounded-lg flex-row items-center active:bg-neon-accent/30">
                        <Send size={12} color="#EC4899" style={{ marginRight: 6 }} />
                        <Text className="text-neon-accent text-xs font-bold">Send</Text>
                    </Pressable>
                </View>
            </View>
        </GlassCard>
    );
};

// --- Sub-Component: Editable Event Widget (Styled) ---
interface EventWidgetProps {
    data: any;
    msgId: string;
    onConfirm: (msgId: string, eventId: string) => void;
    onCancel: (msgId: string, eventId: string) => void;
}

const EventWidget: React.FC<EventWidgetProps> = ({ data, msgId, onConfirm, onCancel }) => {
    const [title, setTitle] = useState(data.title || '');
    const [date, setDate] = useState(data.date || new Date().toISOString().split('T')[0]);
    const [time, setTime] = useState(data.time || '12:00');
    const [description, setDescription] = useState(data.description || '');
    const [isEditing, setIsEditing] = useState(false);

    const handleOpenGoogleCalendar = async () => {
        try {
            const formatGCalDate = (d: Date) => {
                return d.toISOString().replace(/-|:|\.\d+/g, '');
            };

            let startDate: Date;
            if (date && time) {
                startDate = new Date(`${date}T${time}:00`);
            } else if (date) {
                startDate = new Date(date);
            } else {
                startDate = new Date();
            }

            if (isNaN(startDate.getTime())) {
                startDate = new Date();
            }

            const endDate = new Date(startDate.getTime() + 60 * 60 * 1000);

            const gCalUrl = `https://calendar.google.com/calendar/render?action=TEMPLATE&text=${encodeURIComponent(title || 'Event')}&dates=${formatGCalDate(startDate)}/${formatGCalDate(endDate)}&details=${encodeURIComponent(description || '')}`;

            await Linking.openURL(gCalUrl);
        } catch (error: any) {
            Alert.alert("Error", `Could not open Google Calendar: ${error.message}`);
        }
    };

    if (data.status === 'cancelled') {
        return (
            <View className="bg-white/5 border border-white/10 rounded-lg p-3 opacity-60">
                <View className="flex-row items-center">
                    <X size={16} color="#6b7280" style={{ marginRight: 8 }} />
                    <Text className="text-xs font-bold text-gray-500 line-through">{data.title} (Cancelled)</Text>
                </View>
            </View>
        );
    }

    if (isEditing) {
        return (
            <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} className="flex-1">
                <Modal
                    visible={isEditing}
                    animationType="slide"
                    transparent={false}
                    onRequestClose={() => setIsEditing(false)}
                >
                    <View className="flex-1 bg-black/95 pt-4">
                        {/* Header */}
                        <View className="flex-row items-center justify-between px-4 pb-3 border-b border-neon-primary/20">
                            <Text className="text-white font-bold text-base">Edit Event</Text>
                            <Pressable
                                onPress={() => setIsEditing(false)}
                                className="bg-neon-primary/20 px-3 py-1 rounded flex-row items-center gap-1"
                            >
                                <Check size={14} color="#8B5CF6" />
                                <Text className="text-neon-primary font-bold text-xs">Done</Text>
                            </Pressable>
                        </View>

                        {/* Scrollable Content */}
                        <ScrollView className="flex-1 px-4 py-4" showsVerticalScrollIndicator={true} bounces={true}>
                            {/* TITLE FIELD */}
                            <View className="mb-4">
                                <Text className="text-gray-400 text-xs font-bold mb-1.5 uppercase">Event Title</Text>
                                <TextInput
                                    value={title}
                                    onChangeText={setTitle}
                                    placeholder="Enter event title"
                                    placeholderTextColor="#666"
                                    className="bg-black/50 border border-neon-primary/30 rounded-lg px-3 py-2.5 text-white text-sm"
                                />
                            </View>

                            {/* DATE FIELD */}
                            <View className="mb-4">
                                <Text className="text-gray-400 text-xs font-bold mb-1.5 uppercase">Date (YYYY-MM-DD)</Text>
                                <TextInput
                                    value={date}
                                    onChangeText={setDate}
                                    placeholder="2026-01-15"
                                    placeholderTextColor="#666"
                                    className="bg-black/50 border border-neon-primary/30 rounded-lg px-3 py-2.5 text-white text-sm"
                                />
                            </View>

                            {/* TIME FIELD */}
                            <View className="mb-4">
                                <Text className="text-gray-400 text-xs font-bold mb-1.5 uppercase">Time (HH:MM)</Text>
                                <TextInput
                                    value={time}
                                    onChangeText={setTime}
                                    placeholder="14:30"
                                    placeholderTextColor="#666"
                                    className="bg-black/50 border border-neon-primary/30 rounded-lg px-3 py-2.5 text-white text-sm"
                                />
                            </View>

                            {/* DESCRIPTION FIELD */}
                            <View className="mb-4 flex-1">
                                <Text className="text-gray-400 text-xs font-bold mb-1.5 uppercase">Description</Text>
                                <TextInput
                                    value={description}
                                    onChangeText={setDescription}
                                    placeholder="Enter event description"
                                    placeholderTextColor="#666"
                                    className="bg-black/50 border border-neon-primary/30 rounded-lg px-3 py-2.5 text-white text-sm flex-1"
                                    multiline
                                    numberOfLines={4}
                                    textAlignVertical="top"
                                />
                            </View>

                            <View className="h-8" />
                        </ScrollView>

                        {/* Action Buttons */}
                        <View className="px-4 py-3 border-t border-neon-primary/20 flex-row gap-2 justify-end bg-black/80">
                            <Pressable
                                onPress={() => setIsEditing(false)}
                                className="bg-white/5 border border-white/10 py-2.5 px-4 rounded-lg"
                            >
                                <Text className="text-gray-300 text-xs font-bold">Cancel</Text>
                            </Pressable>
                            <Pressable
                                onPress={() => {
                                    setIsEditing(false);
                                    handleOpenGoogleCalendar();
                                }}
                                className="bg-blue-500/20 border border-blue-500/50 py-2.5 px-4 rounded-lg flex-row items-center gap-1"
                            >
                                <ExternalLink size={12} color="#3b82f6" />
                                <Text className="text-blue-400 text-xs font-bold">Add to Calendar</Text>
                            </Pressable>
                        </View>
                    </View>
                </Modal>
            </KeyboardAvoidingView>
        );
    }

    // View mode (not editing)
    return (
        <GlassCard className="!mb-0 !bg-neon-primary/5 border-neon-primary/20">
            <View className="p-3">
                <View className="flex-row items-start">
                    <View className="bg-neon-primary/20 p-2 rounded mr-3">
                        <Calendar size={20} color="#8B5CF6" />
                    </View>
                    <View className="flex-1">
                        <View className="flex-row items-center justify-between">
                            <Text className="font-bold text-white text-sm flex-1" numberOfLines={1}>{title}</Text>
                            <Pressable
                                onPress={() => setIsEditing(true)}
                                className="flex-row items-center gap-1 bg-black/40 px-2 py-1 rounded ml-2"
                            >
                                <Edit2 size={12} color="#8B5CF6" />
                                <Text className="text-xs text-neon-primary font-bold">Edit</Text>
                            </Pressable>
                        </View>
                        <View className="flex-row items-center mt-1">
                            <Clock size={12} color="#a78bfa" style={{ marginRight: 4 }} />
                            <Text className="text-gray-300 text-xs">{date} at {time}</Text>
                        </View>
                        {description && (
                            <Text className="text-gray-400 text-xs mt-1">{description}</Text>
                        )}
                    </View>
                </View>

                {/* Add to Google Calendar Button */}
                <Pressable
                    onPress={handleOpenGoogleCalendar}
                    className="mt-3 bg-blue-500/20 border border-blue-500/50 py-2.5 px-4 rounded-lg flex-row items-center justify-center active:bg-blue-500/30"
                >
                    <ExternalLink size={14} color="#3b82f6" style={{ marginRight: 6 }} />
                    <Text className="text-blue-400 text-xs font-bold">Add to Google Calendar</Text>
                </Pressable>

                {data.status === 'pending' ? (
                    <View className="mt-2">
                        <View className="flex-row gap-2">
                            <Pressable
                                onPress={() => onConfirm(msgId, data.id)}
                                className="flex-1 bg-neon-success/20 border border-neon-success/50 py-2 rounded-lg flex-row items-center justify-center"
                            >
                                <Check size={14} color="#4ade80" style={{ marginRight: 4 }} />
                                <Text className="text-neon-success text-xs font-bold uppercase">Confirm</Text>
                            </Pressable>
                            <Pressable
                                onPress={() => onCancel(msgId, data.id)}
                                className="flex-1 bg-white/5 border border-white/10 py-2 rounded-lg flex-row items-center justify-center"
                            >
                                <X size={14} color="#9ca3af" style={{ marginRight: 4 }} />
                                <Text className="text-gray-400 text-xs font-bold uppercase">Cancel</Text>
                            </Pressable>
                        </View>
                    </View>
                ) : (
                    <View className="mt-2 flex-row items-center justify-center w-full bg-neon-success/20 py-2 rounded-lg border border-neon-success/30">
                        <Check size={14} color="#4ade80" style={{ marginRight: 8 }} />
                        <Text className="text-xs font-bold text-neon-success uppercase">Confirmed</Text>
                    </View>
                )}
            </View>
        </GlassCard>
    );
};

const ChatScreen: React.FC<ChatScreenProps> = ({ sessionId }) => {
    const [session, setSession] = useState<ChatSession | null>(null);
    const [messages, setMessages] = useState<Message[]>([]);
    const [input, setInput] = useState('');
    const [isProcessing, setIsProcessing] = useState(false);
    const [attachedFile, setAttachedFile] = useState<AttachedFile | null>(null);
    const [recording, setRecording] = useState<Audio.Recording | null>(null);
    const [isRecording, setIsRecording] = useState(false);
    const [speakingMessageId, setSpeakingMessageId] = useState<string | null>(null);
    const flatListRef = useRef<FlatList>(null);
    const insets = useSafeAreaInsets();
    const router = useRouter();
    const theme = useTheme();

    // Load Session
    useEffect(() => {
        const loadSession = async () => {
            const currentSession = await db.getChat(sessionId);
            if (currentSession) {
                setSession(currentSession);
                setMessages(currentSession.messages);
            } else {
                router.back();
            }
        };
        loadSession();
    }, [sessionId]);

    // Cleanup Audio on Unmount
    useEffect(() => {
        return () => {
            if (recording) {
                recording.stopAndUnloadAsync();
            }
            // ❌ NATIVE MODULE - Only works with dev build, commented out for Expo Go
            // ExpoSpeechRecognition.stop();
            voiceService.cleanup();
        };
    }, []);

    // Persist Messages & Auto-Generate Title using Mistral Small
    useEffect(() => {
        if (session) {
            const save = async () => {
                const updatedSession = {
                    ...session,
                    messages: messages,
                    lastMessage: messages.length > 0 ? messages[messages.length - 1].text : '',
                    updatedAt: new Date()
                };

                // Generate AI-powered title using Mistral Small on first message
                if (messages.length > 0 && session.title === 'New Conversation') {
                    const firstUserMsg = messages.find(m => m.sender === Sender.USER);
                    if (firstUserMsg) {
                        try {
                            const aiTitle = await generateConversationTitle(firstUserMsg.text);
                            updatedSession.title = aiTitle;
                        } catch (error) {
                            console.error("Failed to generate title:", error);
                            // Fallback to substring
                            updatedSession.title = firstUserMsg.text.substring(0, 30) + (firstUserMsg.text.length > 30 ? '...' : '');
                        }
                    }
                }

                await db.saveChat(updatedSession);
                setSession(updatedSession);
            };
            save();
        }
    }, [messages]);

    const handleTTSToggle = async (messageId: string, text: string) => {
        try {
            if (speakingMessageId === messageId) {
                // Stop if currently speaking this message
                await voiceService.stop();
                setSpeakingMessageId(null);
            } else {
                // Start speaking this message
                setSpeakingMessageId(messageId);
                await voiceService.speak(text, messageId, () => {
                    setSpeakingMessageId(null);
                });
            }
        } catch (error) {
            console.error('TTS Toggle Error:', error);
            setSpeakingMessageId(null);
        }
    };

    const handleSend = async () => {
        if (!input.trim() && !attachedFile) return;

        const newUserMsg: Message = {
            id: Date.now().toString(),
            text: input,
            sender: Sender.USER,
            timestamp: new Date(),
        };

        setMessages(prev => [...prev, newUserMsg]);
        setInput('');
        const fileToSend = attachedFile;
        setAttachedFile(null);
        setIsProcessing(true);

        const historyText = messages.map(m => `${m.sender}: ${m.text}`);

        let fileDataPayload = undefined;
        if (fileToSend && fileToSend.base64) {
            fileDataPayload = {
                mimeType: fileToSend.mimeType,
                base64: fileToSend.base64
            };
        }

        const aiResponse = await generateSurrogateResponse(input, historyText, fileDataPayload);

        setIsProcessing(false);

        const newAgentMsg: Message = {
            id: (Date.now() + 1).toString(),
            text: aiResponse.text,
            sender: Sender.AGENT,
            timestamp: new Date(),
            tone: aiResponse.tone,
            language: aiResponse.language,
            processingAgent: aiResponse.agent,
            payload: aiResponse.payload,
            payloadType: aiResponse.payloadType
        };

        setMessages(prev => [...prev, newAgentMsg]);
        // Note: TTS removed from auto-play, user can tap speaker icon
    };

    const handleFileUpload = async () => {
        console.log("Starting File Upload...");
        try {
            const result = await DocumentPicker.getDocumentAsync({
                type: '*/*',
                copyToCacheDirectory: true
            });

            console.log("DocumentPicker Result:", result.canceled ? "Canceled" : "Selected");
            if (result.canceled) return;

            const asset = result.assets[0];
            console.log("Asset URI:", asset.uri);
            console.log("Asset Mime:", asset.mimeType);
            console.log("Asset Size:", asset.size);

            if (asset.size && asset.size > 10 * 1024 * 1024) {
                Alert.alert("File too large", "Please select a file smaller than 10MB.");
                return;
            }

            const base64 = await FileSystem.readAsStringAsync(asset.uri, { encoding: 'base64' });
            console.log("Base64 Generated, Length:", base64.length);

            setAttachedFile({
                uri: asset.uri,
                name: asset.name,
                mimeType: asset.mimeType || 'application/octet-stream',
                base64: base64
            });
        } catch (e: any) {
            console.error("File Upload Error:", e);
            Alert.alert("Error", `Failed to attach file: ${e.message}`);
        }
    };

    // ❌ NATIVE STT MODULE - Only works with dev build (expo run:android/ios), not Expo Go
    // Commented out for Expo Go compatibility
    const handleVoiceToggle = async () => {
        Alert.alert(
            'Speech-to-text unavailable in Expo Go',
            'Native STT requires a custom dev build (expo prebuild + expo run:android/ios). Use the dev build to test STT features.',
            [{ text: 'OK' }]
        );
    }

    /* ❌ NATIVE MODULE CODE - Uncomment when using dev build
    const handleVoiceToggle = async () => {
        try {
            if (isRecording) {
                console.log('Stopping Speech Recognition...');
                ExpoSpeechRecognition.stop();
                setIsRecording(false);
                setIsProcessing(false);
                return;
            }

            console.log('Starting Speech Recognition...');
            const { granted } = await ExpoSpeechRecognition.requestPermissionsAsync();
            if (!granted) {
                Alert.alert('Permission Required', 'Please allow microphone access for speech recognition.');
                return;
            }

            setIsRecording(true);
            setIsProcessing(true);

            let finalTranscript = '';

            const resultListener = ExpoSpeechRecognition.addSpeechRecognitionListener('result', (event) => {
                if (event.results && event.results.length > 0) {
                    const transcript = event.results[0].transcript;
                    finalTranscript = transcript;
                    setInput(transcript); // Live update
                }
            });

            const endListener = ExpoSpeechRecognition.addSpeechRecognitionListener('end', () => {
                console.log('STT Ended');
                setIsRecording(false);
                setIsProcessing(false);
                resultListener.remove();
                endListener.remove();
                errorListener.remove();
            });

            const errorListener = ExpoSpeechRecognition.addSpeechRecognitionListener('error', (event) => {
                console.error('STT Error:', event);
                setIsRecording(false);
                setIsProcessing(false);
                Alert.alert('Speech Recognition Error', event.error || 'Failed to recognize speech');
                resultListener.remove();
                endListener.remove();
                errorListener.remove();
            });

            ExpoSpeechRecognition.start({
                lang: 'en-US',
                interimResults: true,
                maxAlternatives: 1,
                continuous: false,
            });
        } catch (err: any) {
            console.error('Voice Error:', err);
            Alert.alert('Recording Error', err?.message || 'Failed to start speech recognition');
            setIsRecording(false);
            setIsProcessing(false);
        }
    }
    */

    const handleClearChat = async () => {
        Alert.alert("Purge Logs", "Permanently delete this neural thread?", [
            { text: "Cancel", style: "cancel" },
            { text: "Purge", style: "destructive", onPress: () => setMessages([]) }
        ]);
    };

    const handleConfirmEvent = async (msgId: string, eventId: string) => {
        await db.updateEvent(eventId, { status: 'confirmed' });
        setMessages(prevMessages => prevMessages.map(msg => {
            if (msg.id === msgId && msg.payloadType === 'EVENT') {
                let updatedPayload = msg.payload;
                if (Array.isArray(updatedPayload)) {
                    updatedPayload = updatedPayload.map((evt: any) => evt.id === eventId ? { ...evt, status: 'confirmed' } : evt);
                } else if (updatedPayload.id === eventId) {
                    updatedPayload = { ...updatedPayload, status: 'confirmed' };
                }
                return { ...msg, payload: updatedPayload };
            }
            return msg;
        }));
    };

    const handleCancelEvent = async (msgId: string, eventId: string) => {
        await db.deleteEvent(eventId);
        setMessages(prevMessages => prevMessages.map(msg => {
            if (msg.id === msgId && msg.payloadType === 'EVENT') {
                let updatedPayload = msg.payload;
                if (Array.isArray(updatedPayload)) {
                    updatedPayload = updatedPayload.map((evt: any) => evt.id === eventId ? { ...evt, status: 'cancelled' } : evt);
                } else if (updatedPayload.id === eventId) {
                    updatedPayload = { ...updatedPayload, status: 'cancelled' };
                }
                return { ...msg, payload: updatedPayload };
            }
            return msg;
        }));
    };

    const renderAgentWidget = (msg: Message) => {
        if (!msg.payload) return null;

        if (msg.payloadType === 'FINANCE_REPORT') {
            const report = msg.payload;
            const isUp = report.change >= 0;

            return (
                <GlassCard className="mt-2 w-full !mb-0 !bg-black/40 border-green-500/30">
                    <View className={`h-1 w-full ${isUp ? 'bg-green-500' : 'bg-red-500'}`} />
                    <View className="p-4">
                        <View className="flex-row justify-between items-start mb-1">
                            <View>
                                <View className="flex-row items-center gap-2">
                                    <Text className="text-lg font-black text-white">{report.symbol}</Text>
                                    <View className="bg-white/10 px-1.5 py-0.5 rounded border border-white/10">
                                        <Text className="text-[10px] font-bold text-gray-400">{report.currency}</Text>
                                    </View>
                                </View>
                                <Text className="text-[10px] text-gray-400 mt-0.5">{report.marketCap} MKT CAP</Text>
                            </View>
                            <View className="items-end">
                                <Text className={`text-2xl font-black ${isUp ? 'text-green-400' : 'text-red-400'}`}>
                                    {report.price.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                </Text>
                                <View className="flex-row items-center">
                                    {isUp ? <TrendingUp size={12} color="#4ade80" /> : <TrendingDown size={12} color="#f87171" />}
                                    <Text className={`text-xs font-medium ml-1 ${isUp ? 'text-green-400' : 'text-red-400'}`}>
                                        {isUp ? '+' : ''}{report.change.toFixed(2)} ({report.changePercent.toFixed(2)}%)
                                    </Text>
                                </View>
                            </View>
                        </View>
                    </View>
                    {report.analysis && (
                        <View className="mx-4 mb-4 mt-1 bg-black/40 p-3 rounded-lg border border-white/5">
                            <View className="flex-row items-center mb-1">
                                <View className="w-1.5 h-1.5 bg-neon-secondary rounded-full mr-1.5 shadow-[0_0_5px_#06b6d4]" />
                                <Text className="text-[10px] text-neon-secondary font-bold uppercase tracking-wider">Neural Analysis</Text>
                            </View>
                            <Text className="text-xs text-gray-300 font-mono leading-relaxed">
                                {report.analysis}
                            </Text>
                        </View>
                    )}
                </GlassCard>
            );
        }

        if (msg.payloadType === 'EVENT') {
            const events = Array.isArray(msg.payload) ? msg.payload : [msg.payload];
            return (
                <View className="mt-2 w-full">
                    {events.map((evt: any, idx: number) => (
                        <View key={idx} style={{ marginBottom: idx < events.length - 1 ? 8 : 0 }}>
                            <EventWidget
                                data={evt}
                                msgId={msg.id}
                                onConfirm={handleConfirmEvent}
                                onCancel={handleCancelEvent}
                            />
                        </View>
                    ))}
                </View>
            );
        }

        if (msg.payloadType === 'DOC') {
            return (
                <GlassCard className="mt-2 w-full !mb-0 !bg-neon-secondary/5 border-neon-secondary/20">
                    <View className="p-3">
                        <View className="flex-row items-center justify-between mb-2">
                            <View className="flex-row items-center">
                                <FileText size={16} color="#06b6d4" style={{ marginRight: 8 }} />
                                <Text className="text-neon-secondary font-bold text-sm">{msg.payload.title}</Text>
                            </View>
                        </View>
                        <ScrollView className="bg-black/30 p-2 rounded border border-white/5 max-h-32">
                            <Text className="text-xs text-gray-300 font-mono">{msg.payload.content}</Text>
                        </ScrollView>
                    </View>
                </GlassCard>
            );
        }

        if (msg.payloadType === 'EMAIL') {
            return <EmailWidget data={msg.payload} />;
        }

        if (msg.payloadType === 'PAYMENT') {
            const tx = msg.payload;
            return (
                <GlassCard className="mt-2 w-full !mb-0 !bg-neon-success/5 border-neon-success/20">
                    <View className="p-4">
                        <View className="flex-row items-center justify-between mb-3 border-b border-neon-success/20 pb-2">
                            <View className="flex-row items-center gap-2">
                                <View className="bg-neon-success/20 p-1.5 rounded-full">
                                    <Check size={16} color="#16a34a" />
                                </View>
                                <Text className="text-sm font-bold text-neon-success">Transaction Verified</Text>
                            </View>
                            <CreditCard size={18} color="#16a34a" />
                        </View>

                        <View className="items-center py-2">
                            <Text className="text-3xl font-black text-white">
                                ${tx.amount.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                            </Text>
                            <Text className="text-xs text-gray-400 mt-1 uppercase tracking-wide">
                                {tx.recipient}
                            </Text>
                        </View>
                    </View>
                </GlassCard>
            );
        }

        if (msg.payloadType === 'SEARCH_RESULT') {
            return (
                <View className="mt-2 space-y-2 w-full">
                    {msg.payload.results.map((res: any, idx: number) => (
                        <GlassCard key={idx} className="!mb-0 !bg-blue-500/10 border-blue-500/20 p-3">
                            <Text className="font-bold text-blue-400 text-sm mb-1">
                                {res.title}
                            </Text>
                            <Text className="text-xs text-blue-200 leading-snug">{res.snippet}</Text>
                            <Text className="text-[10px] text-blue-500 mt-1 uppercase">{res.source}</Text>
                        </GlassCard>
                    ))}
                </View>
            );
        }

        return null;
    };

    const renderMessage = ({ item }: { item: Message }) => (
        <View className={`flex-col max-w-[85%] mb-4 ${item.sender === Sender.USER ? 'self-end items-end' : 'self-start items-start'}`}>
            <View
                className="px-4 py-3 rounded-2xl shadow-sm w-full"
                style={{
                    backgroundColor: item.sender === Sender.USER
                        ? (theme.isDark ? 'rgba(139, 92, 246, 0.25)' : 'rgba(124, 58, 237, 0.15)')
                        : (theme.isDark ? '#0F1123' : '#ffffff'),
                    borderWidth: 1,
                    borderColor: item.sender === Sender.USER
                        ? (theme.isDark ? 'rgba(139, 92, 246, 0.4)' : 'rgba(124, 58, 237, 0.3)')
                        : theme.border,
                    borderTopRightRadius: item.sender === Sender.USER ? 4 : 16,
                    borderTopLeftRadius: item.sender === Sender.USER ? 16 : 4,
                    borderBottomLeftRadius: 16,
                    borderBottomRightRadius: 16,
                    shadowColor: theme.isDark ? '#000' : '#64748b',
                    shadowOffset: { width: 0, height: 2 },
                    shadowOpacity: theme.isDark ? 0.3 : 0.1,
                    shadowRadius: 4,
                    elevation: 2,
                }}
            >
                {item.processingAgent && item.processingAgent !== AgentType.CHAT && (
                    <View
                        className="pb-1 mb-2 flex-row items-center justify-between"
                        style={{ borderBottomWidth: 1, borderBottomColor: theme.borderLight }}
                    >
                        <Text
                            className="text-[9px] uppercase font-black tracking-widest"
                            style={{
                                color: item.processingAgent === AgentType.SCHEDULE ? '#a855f7' :
                                    item.processingAgent === AgentType.DOCS ? '#f97316' :
                                        item.processingAgent === AgentType.EMAIL ? '#EC4899' :
                                            item.processingAgent === AgentType.PAYMENT ? '#10B981' :
                                                item.processingAgent === AgentType.SEARCH ? '#3b82f6' :
                                                    theme.textMuted
                            }}
                        >
                            {item.processingAgent}
                        </Text>
                    </View>
                )}

                {item.sender === Sender.USER ? (
                    <Text
                        className="text-[15px] leading-relaxed"
                        style={{ color: theme.isDark ? '#ffffff' : '#1e1b4b' }}
                    >
                        {item.text}
                    </Text>
                ) : (
                    <Markdown
                        style={{
                            body: { color: theme.text, fontSize: 15, lineHeight: 22 },
                            paragraph: { marginTop: 0, marginBottom: 8 },
                            heading1: { color: theme.text, fontSize: 20, fontWeight: 'bold', marginBottom: 8 },
                            heading2: { color: theme.text, fontSize: 18, fontWeight: 'bold', marginBottom: 6 },
                            heading3: { color: theme.text, fontSize: 16, fontWeight: 'bold', marginBottom: 4 },
                            strong: { color: theme.text, fontWeight: 'bold' },
                            em: { color: theme.textSecondary, fontStyle: 'italic' },
                            bullet_list: { marginLeft: 8 },
                            ordered_list: { marginLeft: 8 },
                            list_item: { marginBottom: 4 },
                            code_inline: {
                                backgroundColor: theme.isDark ? 'rgba(255,255,255,0.1)' : 'rgba(124,58,237,0.1)',
                                color: theme.isDark ? '#a5b4fc' : '#7c3aed',
                                paddingHorizontal: 4,
                                borderRadius: 4,
                                fontFamily: 'monospace'
                            },
                            code_block: {
                                backgroundColor: theme.isDark ? 'rgba(0,0,0,0.3)' : 'rgba(0,0,0,0.05)',
                                padding: 12,
                                borderRadius: 8,
                                fontFamily: 'monospace',
                                color: theme.isDark ? '#a5b4fc' : '#1e1b4b'
                            },
                            fence: {
                                backgroundColor: theme.isDark ? 'rgba(0,0,0,0.3)' : 'rgba(0,0,0,0.05)',
                                padding: 12,
                                borderRadius: 8,
                                fontFamily: 'monospace',
                                color: theme.isDark ? '#a5b4fc' : '#1e1b4b'
                            },
                            blockquote: {
                                backgroundColor: theme.isDark ? 'rgba(139,92,246,0.1)' : 'rgba(124,58,237,0.08)',
                                borderLeftWidth: 3,
                                borderLeftColor: theme.primary,
                                paddingLeft: 12,
                                marginVertical: 8
                            },
                            link: { color: theme.primary, textDecorationLine: 'underline' },
                        }}
                    >
                        {item.text}
                    </Markdown>
                )}

                {item.sender === Sender.AGENT && renderAgentWidget(item)}

                <View
                    className="flex-row justify-between items-center mt-3 pt-2"
                    style={{ borderTopWidth: 1, borderTopColor: theme.borderLight }}
                >
                    <View className="flex-row items-center gap-2">
                        {item.sender === Sender.AGENT && (
                            <Pressable
                                onPress={() => handleTTSToggle(item.id, item.text)}
                                className="p-1.5 rounded-full"
                                style={({ pressed }) => ({
                                    backgroundColor: pressed ? theme.primaryBg : 'transparent'
                                })}
                            >
                                {speakingMessageId === item.id ? (
                                    <Volume2 size={16} color={theme.primary} />
                                ) : (
                                    <VolumeX size={16} color={theme.textMuted} />
                                )}
                            </Pressable>
                        )}
                        {item.tone && item.sender === Sender.AGENT && (
                            <Text
                                className="text-[9px] italic"
                                style={{ color: theme.textMuted }}
                            >
                                {item.tone}
                            </Text>
                        )}
                    </View>
                    <Text
                        className="text-[9px] font-medium"
                        style={{ color: theme.textMuted }}
                    >
                        {new Date(item.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </Text>
                </View>
            </View>
        </View>
    );

    if (!session) return <View className="flex-1" style={{ backgroundColor: theme.background }} />;

    return (
        <BackgroundWrapper>
            <View className="flex-1">
                {/* Header */}
                <View
                    style={{
                        paddingTop: insets.top,
                        backgroundColor: theme.isDark ? 'rgba(0,0,0,0.2)' : 'rgba(255,255,255,0.9)',
                        borderBottomWidth: 1,
                        borderBottomColor: theme.border
                    }}
                    className="pb-3 px-3 flex-row items-center z-10"
                >
                    <Pressable
                        onPress={() => router.back()}
                        className="p-2 mr-1 rounded-full"
                        style={({ pressed }) => ({
                            backgroundColor: pressed ? theme.primaryBg : 'transparent'
                        })}
                    >
                        <ArrowLeft size={24} color={theme.text} />
                    </Pressable>
                    <View
                        className="w-10 h-10 rounded-full items-center justify-center mr-3 overflow-hidden"
                        style={{
                            borderWidth: 1,
                            borderColor: theme.primary + '50',
                            backgroundColor: theme.card
                        }}
                    >
                        <Image source={{ uri: `https://picsum.photos/seed/${session.id}/200` }} className="w-full h-full opacity-90" />
                    </View>
                    <View className="flex-1">
                        <Text
                            className="font-bold text-lg"
                            numberOfLines={1}
                            style={{ color: theme.text }}
                        >
                            {session.title}
                        </Text>
                        <View className="flex-row items-center">
                            <View
                                className="w-1.5 h-1.5 rounded-full mr-1.5"
                                style={{ backgroundColor: theme.success }}
                            />
                            <Text
                                className="text-[10px] tracking-widest uppercase"
                                style={{ color: theme.success }}
                            >
                                Online
                            </Text>
                        </View>
                    </View>
                    <Pressable
                        onPress={handleClearChat}
                        className="p-2 rounded-full"
                        style={({ pressed }) => ({
                            backgroundColor: pressed ? 'rgba(239,68,68,0.1)' : 'transparent'
                        })}
                    >
                        <Trash2 size={20} color={theme.textMuted} />
                    </Pressable>
                </View>

                {/* Main Content Wrapped in KeyboardAvoidingView */}
                <KeyboardAvoidingView
                    style={{ flex: 1 }}
                    behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
                    keyboardVerticalOffset={Platform.OS === 'ios' ? 90 : 0}
                >
                    {/* Messages */}
                    <FlatList
                        ref={flatListRef}
                        data={messages}
                        renderItem={renderMessage}
                        keyExtractor={item => item.id}
                        contentContainerStyle={{ padding: 16, paddingBottom: 8 }}
                        onContentSizeChange={() => flatListRef.current?.scrollToEnd({ animated: true })}
                        onLayout={() => flatListRef.current?.scrollToEnd({ animated: true })}
                        className="flex-1"
                        scrollEnabled={true}
                        nestedScrollEnabled={true}
                    />

                    {isProcessing && (
                        <View className="px-6 py-2">
                            <Text className="text-neon-secondary text-xs uppercase tracking-widest animate-pulse">Computing...</Text>
                        </View>
                    )}

                    {/* File Preview */}
                    {attachedFile && (
                        <View className="bg-black/80 p-3 flex-row justify-center relative border-t border-glass-border">
                            <View className="bg-white/10 p-3 rounded-xl border border-glass-border flex-row items-center gap-3">
                                {attachedFile.mimeType.startsWith('image/') ? (
                                    <Image source={{ uri: attachedFile.uri }} className="h-12 w-12 rounded-lg" />
                                ) : (
                                    <View className="h-12 w-12 bg-neon-primary/20 items-center justify-center rounded-lg">
                                        <FileIcon size={24} color="#8B5CF6" />
                                    </View>
                                )}
                                <View>
                                    <Text className="text-white text-xs font-bold max-w-[150px]" numberOfLines={1}>{attachedFile.name}</Text>
                                    <Text className="text-gray-400 text-[10px]">{attachedFile.mimeType}</Text>
                                </View>
                                <Pressable onPress={() => setAttachedFile(null)} className="bg-red-600 rounded-full p-1 ml-2">
                                    <X size={12} color="white" />
                                </Pressable>
                            </View>
                        </View>
                    )}

                    {/* Input */}
                    <View className="px-2 pb-1 pt-1 flex-row items-end gap-2">
                        <View
                            className="flex-1 rounded-[24px] flex-row items-center px-1.5 py-1 min-h-[48px]"
                            style={{
                                backgroundColor: theme.inputBg,
                                borderWidth: 1,
                                borderColor: theme.border
                            }}
                        >
                            <TextInput
                                value={input}
                                onChangeText={setInput}
                                placeholder={attachedFile ? "Add a caption..." : "Type a message..."}
                                placeholderTextColor={theme.textMuted}
                                className="flex-1 px-3 py-2 max-h-32 text-base"
                                style={{ color: theme.text }}
                                multiline
                            />
                            <Pressable
                                onPress={handleFileUpload}
                                className="p-2 -rotate-45"
                                style={({ pressed }) => ({ opacity: pressed ? 0.7 : 1 })}
                            >
                                <Paperclip size={20} color={theme.textMuted} />
                            </Pressable>
                            {(input.length > 0 || attachedFile) && (
                                <Pressable
                                    onPress={handleSend}
                                    className="p-2 mr-1 rounded-full"
                                    style={{
                                        backgroundColor: theme.primary,
                                        shadowColor: theme.primary,
                                        shadowOffset: { width: 0, height: 0 },
                                        shadowOpacity: 0.5,
                                        shadowRadius: 8,
                                        elevation: 4
                                    }}
                                >
                                    <Send size={18} color="white" />
                                </Pressable>
                            )}
                        </View>

                        <Pressable
                            onPress={handleVoiceToggle}
                            style={{
                                width: 48,
                                height: 48,
                                borderRadius: 24,
                                borderWidth: 1,
                                borderColor: isRecording ? theme.error : theme.border,
                                backgroundColor: isRecording ? theme.error + '20' : theme.inputBg,
                                alignItems: 'center',
                                justifyContent: 'center',
                            }}
                        >
                            {isRecording ? <Square size={20} color={theme.error} fill={theme.error} /> : <Mic size={24} color={theme.primary} />}
                        </Pressable>
                    </View>
                </KeyboardAvoidingView>
            </View>
        </BackgroundWrapper>
    );
};

export default ChatScreen;

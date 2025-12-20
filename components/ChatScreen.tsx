import React, { useState, useEffect, useRef } from 'react';
import { View, Text, TextInput, FlatList, Image, Pressable, KeyboardAvoidingView, Platform, Alert, ActivityIndicator, Linking, ScrollView } from 'react-native';
import { Send, Mic, MicOff, MoreVertical, Paperclip, X, Smile, ArrowLeft, Calendar, FileText, ExternalLink, Clock, Copy, Mail, Edit2, Check, PlusCircle, CreditCard, Share2, Trash2, TrendingUp, TrendingDown } from 'lucide-react-native';
import { Message, Sender, AgentType, ChatSession } from '../types';
import { generateSurrogateResponse } from '../services/geminiService';
import { db } from '../services/db';
import * as Speech from 'expo-speech';
import * as ImagePicker from 'expo-image-picker';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';

interface ChatScreenProps {
    sessionId: string;
}

// --- Sub-Component: Editable Email Widget ---
const EmailWidget: React.FC<{ data: any }> = ({ data }) => {
    const [to, setTo] = useState(data.to);
    const [subject, setSubject] = useState(data.subject);
    const [body, setBody] = useState(data.body);
    const [isEditing, setIsEditing] = useState(false);

    const handleSend = () => {
        const bodyContent = body.replace(/\n/g, "\r\n");
        const mailto = `mailto:${to}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(bodyContent)}`;
        Linking.openURL(mailto);
    };

    const handleGmail = () => {
        const gmailLink = `https://mail.google.com/mail/?view=cm&fs=1&to=${encodeURIComponent(to)}&su=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
        Linking.openURL(gmailLink);
    };

    return (
        <View className="mt-2 bg-red-50 dark:bg-red-900/20 border border-red-100 dark:border-red-800 rounded-lg p-3 w-full">
            <View className="flex-row items-center justify-between mb-2 border-b border-red-100 dark:border-red-800/50 pb-2">
                <View className="flex-row items-center gap-2">
                    <View className="bg-red-100 dark:bg-red-800 p-1 rounded">
                        <Mail size={14} color="#dc2626" />
                    </View>
                    <Text className="text-xs font-bold text-red-800 dark:text-red-200">Draft Ready</Text>
                </View>
                <Pressable
                    onPress={() => setIsEditing(!isEditing)}
                    className="flex-row items-center gap-1"
                >
                    {isEditing ? <Check size={12} color="#dc2626" /> : <Edit2 size={12} color="#dc2626" />}
                    <Text className="text-xs text-red-600 dark:text-red-400">{isEditing ? "Done" : "Edit"}</Text>
                </Pressable>
            </View>

            <View className="space-y-2">
                {/* TO FIELD */}
                <View className="flex-row items-center gap-1">
                    <Text className="font-semibold w-12 text-gray-500 dark:text-gray-400 text-xs">To:</Text>
                    {isEditing ? (
                        <TextInput
                            value={to}
                            onChangeText={setTo}
                            className="flex-1 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded px-2 py-1 text-gray-800 dark:text-gray-200 text-xs"
                        />
                    ) : (
                        <Text className="text-gray-800 dark:text-gray-200 bg-white dark:bg-gray-900/50 px-2 py-0.5 rounded border border-gray-100 dark:border-gray-800 text-xs flex-1">{to}</Text>
                    )}
                </View>

                {/* SUBJECT FIELD */}
                <View className="flex-row items-center gap-1">
                    <Text className="font-semibold w-12 text-gray-500 dark:text-gray-400 text-xs">Subject:</Text>
                    {isEditing ? (
                        <TextInput
                            value={subject}
                            onChangeText={setSubject}
                            className="flex-1 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded px-2 py-1 text-gray-800 dark:text-gray-200 text-xs"
                        />
                    ) : (
                        <Text className="text-gray-800 dark:text-gray-200 font-medium text-xs flex-1">{subject}</Text>
                    )}
                </View>

                {/* BODY FIELD */}
                <View className="mt-2">
                    {isEditing ? (
                        <TextInput
                            value={body}
                            onChangeText={setBody}
                            multiline
                            numberOfLines={8}
                            className="w-full bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded p-2 text-xs text-gray-800 dark:text-gray-200 font-mono h-32"
                            textAlignVertical="top"
                        />
                    ) : (
                        <Text className="text-xs text-gray-600 dark:text-gray-300 bg-white dark:bg-gray-900/50 p-2 rounded border border-red-50 dark:border-red-900/30 font-sans">
                            {body}
                        </Text>
                    )}
                </View>

                {/* Action Buttons */}
                <View className="pt-2 mt-1 flex-row gap-2 justify-end">
                    <Pressable
                        onPress={handleGmail}
                        className="bg-white dark:bg-gray-700 border border-red-200 dark:border-gray-600 py-2 px-3 rounded-lg flex-row items-center shadow-sm"
                    >
                        <Mail size={12} color="#dc2626" style={{ marginRight: 8 }} />
                        <Text className="text-red-600 dark:text-red-400 text-xs font-bold">Gmail Web</Text>
                    </Pressable>
                    <Pressable
                        onPress={handleSend}
                        className="bg-red-600 py-2 px-4 rounded-lg flex-row items-center shadow-sm"
                    >
                        <Send size={12} color="white" style={{ marginRight: 8 }} />
                        <Text className="text-white text-xs font-bold">{isEditing ? "Send Edited" : "Send Email"}</Text>
                    </Pressable>
                </View>
            </View>
        </View>
    );
};

const ChatScreen: React.FC<ChatScreenProps> = ({ sessionId }) => {
    const [session, setSession] = useState<ChatSession | null>(null);
    const [messages, setMessages] = useState<Message[]>([]);
    const [input, setInput] = useState('');
    const [isProcessing, setIsProcessing] = useState(false);
    const [attachedImage, setAttachedImage] = useState<string | null>(null);
    const flatListRef = useRef<FlatList>(null);
    const insets = useSafeAreaInsets();
    const router = useRouter();

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

    // Persist Messages
    useEffect(() => {
        if (session) {
            const save = async () => {
                const updatedSession = {
                    ...session,
                    messages: messages,
                    lastMessage: messages.length > 0 ? messages[messages.length - 1].text : '',
                    updatedAt: new Date()
                };

                if (messages.length > 0 && session.title === 'New Conversation') {
                    const firstUserMsg = messages.find(m => m.sender === Sender.USER);
                    if (firstUserMsg) {
                        updatedSession.title = firstUserMsg.text.substring(0, 25) + (firstUserMsg.text.length > 25 ? '...' : '');
                    }
                }

                await db.saveChat(updatedSession);
                setSession(updatedSession);
            };
            save();
        }
    }, [messages]);

    const speakResponse = (text: string) => {
        Speech.speak(text);
    };

    const handleSend = async () => {
        if (!input.trim() && !attachedImage) return;

        const newUserMsg: Message = {
            id: Date.now().toString(),
            text: input,
            sender: Sender.USER,
            timestamp: new Date(),
        };

        setMessages(prev => [...prev, newUserMsg]);
        setInput('');
        const imageToSend = attachedImage;
        setAttachedImage(null);
        setIsProcessing(true);

        const historyText = messages.map(m => `${m.sender}: ${m.text}`);
        const aiResponse = await generateSurrogateResponse(input, historyText, imageToSend || undefined);

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
        speakResponse(aiResponse.text);
    };

    const handleFileUpload = async () => {
        const result = await ImagePicker.launchImageLibraryAsync({
            mediaTypes: ImagePicker.MediaTypeOptions.Images,
            allowsEditing: true,
            quality: 0.5,
            base64: true,
        });

        if (!result.canceled && result.assets[0].base64) {
            setAttachedImage(`data:image/jpeg;base64,${result.assets[0].base64}`);
        }
    };

    const handleCamera = async () => {
        const result = await ImagePicker.launchCameraAsync({
            allowsEditing: true,
            quality: 0.5,
            base64: true,
        });

        if (!result.canceled && result.assets[0].base64) {
            setAttachedImage(`data:image/jpeg;base64,${result.assets[0].base64}`);
        }
    }

    const handleClearChat = async () => {
        Alert.alert("Clear Chat", "Are you sure?", [
            { text: "Cancel", style: "cancel" },
            { text: "Clear", style: "destructive", onPress: () => setMessages([]) }
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
                <View className="mt-2 bg-[#1e1e1e] border border-gray-800 rounded-xl overflow-hidden shadow-lg w-full">
                    <View className={`h-1 w-full ${isUp ? 'bg-green-500' : 'bg-red-500'}`} />
                    <View className="p-4">
                        <View className="flex-row justify-between items-start mb-1">
                            <View>
                                <View className="flex-row items-center gap-2">
                                    <Text className="text-lg font-bold text-white">{report.symbol}</Text>
                                    <View className="bg-gray-800 px-1.5 py-0.5 rounded border border-gray-700">
                                        <Text className="text-[10px] font-bold text-gray-400">{report.currency}</Text>
                                    </View>
                                </View>
                                <Text className="text-[10px] text-gray-400 mt-0.5">{report.marketCap} MKT CAP</Text>
                            </View>
                            <View className="items-end">
                                <Text className={`text-2xl font-bold ${isUp ? 'text-green-400' : 'text-red-400'}`}>
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

                        <View className="flex-row items-center justify-between pt-3 border-t border-gray-800 mt-2">
                            <View className="items-center">
                                <Text className="text-[9px] text-gray-500 uppercase">P/E Ratio</Text>
                                <Text className="text-xs font-semibold text-gray-300">{report.peRatio || '-'}</Text>
                            </View>
                            <View className="items-center">
                                <Text className="text-[9px] text-gray-500 uppercase">Analysis</Text>
                                <View className={`px-2 py-0.5 rounded ${report.recommendation === 'BUY' ? 'bg-green-900/40' :
                                    report.recommendation === 'SELL' ? 'bg-red-900/40' :
                                        'bg-yellow-900/40'
                                    }`}>
                                    <Text className={`text-xs font-bold ${report.recommendation === 'BUY' ? 'text-green-400' :
                                        report.recommendation === 'SELL' ? 'text-red-400' :
                                            'text-yellow-400'
                                        }`}>{report.recommendation}</Text>
                                </View>
                            </View>
                        </View>
                    </View>
                </View>
            );
        }

        if (msg.payloadType === 'EVENT') {
            const events = Array.isArray(msg.payload) ? msg.payload : [msg.payload];
            return (
                <View className="mt-2 space-y-2">
                    {events.map((evt: any, idx: number) => {
                        if (evt.status === 'cancelled') {
                            return (
                                <View key={idx} className="bg-gray-100 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg p-3 opacity-60">
                                    <View className="flex-row items-center">
                                        <X size={16} color="#6b7280" style={{ marginRight: 8 }} />
                                        <Text className="text-xs font-bold text-gray-500 dark:text-gray-400 line-through">{evt.title} (Cancelled)</Text>
                                    </View>
                                </View>
                            );
                        }

                        return (
                            <View key={idx} className="bg-purple-50 dark:bg-purple-900/20 border border-purple-100 dark:border-purple-800 rounded-lg p-3">
                                <View className="flex-row items-start">
                                    <View className="bg-purple-100 dark:bg-purple-800 p-2 rounded mr-3">
                                        <Calendar size={20} color="#9333ea" />
                                    </View>
                                    <View className="flex-1">
                                        <Text className="font-bold text-purple-900 dark:text-purple-200 text-sm" numberOfLines={1}>{evt.title}</Text>
                                        <View className="flex-row items-center mt-1">
                                            <Clock size={12} color="#7e22ce" style={{ marginRight: 4 }} />
                                            <Text className="text-purple-700 dark:text-purple-400 text-xs">{evt.date} at {evt.time}</Text>
                                        </View>
                                        {evt.description && <Text className="text-xs text-purple-800 dark:text-purple-300/80 mt-1" numberOfLines={2}>{evt.description}</Text>}

                                        {evt.status === 'pending' ? (
                                            <View className="mt-3 flex-row gap-2">
                                                <Pressable
                                                    onPress={() => handleConfirmEvent(msg.id, evt.id)}
                                                    className="flex-1 bg-purple-600 py-2 rounded-lg flex-row items-center justify-center shadow-sm"
                                                >
                                                    <Check size={14} color="white" style={{ marginRight: 4 }} />
                                                    <Text className="text-white text-xs font-bold">Confirm</Text>
                                                </Pressable>
                                                <Pressable
                                                    onPress={() => handleCancelEvent(msg.id, evt.id)}
                                                    className="flex-1 bg-white dark:bg-gray-700 border border-purple-200 dark:border-gray-600 py-2 rounded-lg flex-row items-center justify-center"
                                                >
                                                    <X size={14} color="#4b5563" style={{ marginRight: 4 }} />
                                                    <Text className="text-gray-600 dark:text-gray-200 text-xs font-bold">Cancel</Text>
                                                </Pressable>
                                            </View>
                                        ) : (
                                            evt.gCalUrl && (
                                                <Pressable
                                                    onPress={() => Linking.openURL(evt.gCalUrl)}
                                                    className="mt-3 flex-row items-center justify-center w-full bg-purple-600 py-2 rounded-lg shadow-sm"
                                                >
                                                    <PlusCircle size={14} color="white" style={{ marginRight: 8 }} />
                                                    <Text className="text-xs font-bold text-white">Add to Google Calendar</Text>
                                                </Pressable>
                                            )
                                        )}
                                    </View>
                                </View>
                            </View>
                        );
                    })}
                </View>
            );
        }

        if (msg.payloadType === 'DOC') {
            return (
                <View className="mt-2 bg-orange-50 dark:bg-orange-900/20 border border-orange-100 dark:border-orange-800 rounded-lg p-3">
                    <View className="flex-row items-center justify-between mb-2">
                        <View className="flex-row items-center">
                            <FileText size={16} color="#ea580c" style={{ marginRight: 8 }} />
                            <Text className="text-orange-800 dark:text-orange-200 font-bold text-sm">{msg.payload.title}</Text>
                        </View>
                    </View>
                    <ScrollView className="bg-white dark:bg-gray-900/50 p-2 rounded border border-orange-100 dark:border-orange-800/50 max-h-32">
                        <Text className="text-xs text-gray-600 dark:text-gray-300 font-mono">{msg.payload.content}</Text>
                    </ScrollView>
                </View>
            );
        }

        if (msg.payloadType === 'EMAIL') {
            return <EmailWidget data={msg.payload} />;
        }

        if (msg.payloadType === 'PAYMENT') {
            const tx = msg.payload;
            return (
                <View className="mt-2 bg-green-50 dark:bg-green-900/20 border border-green-100 dark:border-green-800 rounded-lg p-4 w-full">
                    <View className="flex-row items-center justify-between mb-3 border-b border-green-200 dark:border-green-800 pb-2">
                        <View className="flex-row items-center gap-2">
                            <View className="bg-green-100 dark:bg-green-800 p-1.5 rounded-full">
                                <Check size={16} color="#15803d" />
                            </View>
                            <Text className="text-sm font-bold text-green-800 dark:text-green-200">Payment Success</Text>
                        </View>
                        <CreditCard size={18} color="#16a34a" />
                    </View>

                    <View className="items-center py-2">
                        <Text className="text-3xl font-bold text-green-700 dark:text-green-300">
                            ${tx.amount.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                        </Text>
                        <Text className="text-xs text-green-600 dark:text-green-400 mt-1 uppercase tracking-wide">
                            {tx.recipient}
                        </Text>
                    </View>

                    <View className="mt-3 border-t border-green-200 dark:border-green-800 pt-2 flex-row justify-between">
                        <Text className="text-[10px] text-green-700 dark:text-green-400/80">{tx.description}</Text>
                        <Text className="text-[10px] text-green-700 dark:text-green-400/80">{new Date(tx.timestamp).toLocaleTimeString()}</Text>
                    </View>
                </View>
            );
        }

        if (msg.payloadType === 'SEARCH_RESULT') {
            return (
                <View className="mt-2 space-y-2">
                    {msg.payload.results.map((res: any, idx: number) => (
                        <View key={idx} className="bg-blue-50 dark:bg-blue-900/20 border border-blue-100 dark:border-blue-800 rounded-lg p-3">
                            <Text className="font-bold text-blue-700 dark:text-blue-300 text-sm mb-1">
                                {res.title}
                            </Text>
                            <Text className="text-xs text-blue-900 dark:text-blue-200 leading-snug">{res.snippet}</Text>
                            <Text className="text-[10px] text-blue-500 dark:text-blue-400 mt-1 uppercase">{res.source}</Text>
                        </View>
                    ))}
                </View>
            );
        }

        return null;
    };

    const renderMessage = ({ item }: { item: Message }) => (
        <View className={`flex-col max-w-[85%] mb-3 ${item.sender === Sender.USER ? 'self-end items-end' : 'self-start items-start'}`}>
            <View
                className={`px-3 py-2 rounded-lg shadow-sm w-full ${item.sender === Sender.USER
                    ? 'bg-[#E7FFDB] dark:bg-[#005c4b] rounded-tr-none'
                    : item.processingAgent === AgentType.FINANCE
                        ? 'bg-black border border-green-900 rounded-tl-none'
                        : 'bg-white dark:bg-[#1f2c34] rounded-tl-none'
                    }`}
            >
                {item.processingAgent && item.processingAgent !== AgentType.CHAT && (
                    <View className={`border-b pb-1 mb-1 flex-row items-center justify-between ${item.processingAgent === AgentType.FINANCE ? 'border-green-800' : 'border-gray-100 dark:border-gray-700'
                        }`}>
                        <Text className={`text-[10px] uppercase font-bold tracking-wider ${item.processingAgent === AgentType.SCHEDULE ? 'text-purple-600 dark:text-purple-400' :
                            item.processingAgent === AgentType.DOCS ? 'text-orange-600 dark:text-orange-400' :
                                item.processingAgent === AgentType.EMAIL ? 'text-red-600 dark:text-red-400' :
                                    item.processingAgent === AgentType.PAYMENT ? 'text-green-600 dark:text-green-400' :
                                        item.processingAgent === AgentType.SEARCH ? 'text-blue-600 dark:text-blue-400' :
                                            item.processingAgent === AgentType.FINANCE ? 'text-green-500' :
                                                'text-gray-500'
                            }`}>
                            {item.processingAgent}
                        </Text>
                    </View>
                )}

                <Text className={`text-[15px] leading-snug ${item.processingAgent === AgentType.FINANCE ? 'text-green-400 font-mono' : 'text-gray-800 dark:text-gray-100'}`}>
                    {item.text}
                </Text>

                {item.sender === Sender.AGENT && renderAgentWidget(item)}

                <View className="flex-row justify-end items-center gap-2 mt-1">
                    {item.tone && item.sender === Sender.AGENT && (
                        <Text className={`text-[10px] italic ${item.processingAgent === AgentType.FINANCE ? 'text-green-700' : 'text-gray-400 dark:text-gray-500'}`}>
                            {item.tone}
                        </Text>
                    )}
                    <Text className={`text-[10px] ${item.processingAgent === AgentType.FINANCE ? 'text-green-700' : 'text-gray-400 dark:text-gray-500'}`}>
                        {new Date(item.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </Text>
                </View>
            </View>
        </View>
    );

    if (!session) return <View className="flex-1 bg-[#EFE7DE] dark:bg-[#0b141a]" />;

    return (
        <View className="flex-1 bg-[#EFE7DE] dark:bg-[#0b141a]">
            {/* Header */}
            <View style={{ paddingTop: insets.top }} className="bg-[#075E54] dark:bg-[#1f2c34] pb-3 px-2 flex-row items-center shadow-md">
                <Pressable onPress={() => router.back()} className="p-2 mr-1 rounded-full">
                    <ArrowLeft size={24} color="white" />
                </Pressable>
                <View className="w-10 h-10 rounded-full bg-white/20 items-center justify-center mr-3 overflow-hidden">
                    <Image source={{ uri: `https://picsum.photos/seed/${session.id}/200` }} className="w-full h-full" />
                </View>
                <View className="flex-1">
                    <Text className="font-bold text-lg text-white" numberOfLines={1}>{session.title}</Text>
                    <View className="flex-row items-center">
                        <View className="w-2 h-2 bg-green-400 rounded-full mr-1" />
                        <Text className="text-xs text-green-100">Online</Text>
                    </View>
                </View>
                <Pressable onPress={handleClearChat} className="p-2">
                    <Trash2 size={24} color="white" />
                </Pressable>
            </View>

            {/* Messages */}
            <FlatList
                ref={flatListRef}
                data={messages}
                renderItem={renderMessage}
                keyExtractor={item => item.id}
                contentContainerStyle={{ padding: 16, paddingBottom: 20 }}
                onContentSizeChange={() => flatListRef.current?.scrollToEnd({ animated: true })}
                onLayout={() => flatListRef.current?.scrollToEnd({ animated: true })}
            />

            {isProcessing && (
                <View className="px-4 py-2">
                    <Text className="text-gray-500 text-xs">Typing...</Text>
                </View>
            )}

            {attachedImage && (
                <View className="bg-[#e9e0d5] dark:bg-[#1f2c34] p-2 flex-row justify-center relative border-t border-gray-300 dark:border-gray-700">
                    <View>
                        <Image source={{ uri: attachedImage }} className="h-40 w-40 rounded-lg" resizeMode="cover" />
                        <Pressable onPress={() => setAttachedImage(null)} className="absolute -top-2 -right-2 bg-gray-700 rounded-full p-1">
                            <X size={16} color="white" />
                        </Pressable>
                    </View>
                </View>
            )}

            {/* Input */}
            <KeyboardAvoidingView
                behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
                keyboardVerticalOffset={Platform.OS === 'ios' ? 90 : 20}
            >
                <View className="p-2 flex-row items-end gap-2 mb-1">
                    <View className="flex-1 bg-white dark:bg-[#1f2c34] rounded-3xl flex-row items-center shadow-sm border border-gray-100 dark:border-gray-700 px-1 py-1 min-h-[48px]">
                        <Pressable className="p-2">
                            <Smile size={24} color="#9ca3af" />
                        </Pressable>
                        <TextInput
                            value={input}
                            onChangeText={setInput}
                            placeholder={attachedImage ? "Add a caption..." : "Message"}
                            placeholderTextColor="#9ca3af"
                            className="flex-1 text-gray-800 dark:text-gray-100 px-2 py-2 max-h-32 text-base"
                            multiline
                        />
                        <Pressable onPress={handleFileUpload} className="p-2 -rotate-45">
                            <Paperclip size={20} color="#9ca3af" />
                        </Pressable>
                        {(input.length > 0 || attachedImage) ? (
                            <Pressable onPress={handleSend} className="p-2 mr-1 bg-[#075E54] rounded-full">
                                <Send size={18} color="white" />
                            </Pressable>
                        ) : (
                            <Pressable onPress={handleCamera} className="p-2 mr-1">
                                <View className="w-5 h-5 border-2 border-gray-400 rounded-full items-center justify-center">
                                    <View className="w-2 h-2 bg-gray-400 rounded-full" />
                                </View>
                            </Pressable>
                        )}
                    </View>
                    <Pressable className="w-12 h-12 rounded-full bg-[#00A884] items-center justify-center shadow-md">
                        <Mic size={24} color="white" />
                    </Pressable>
                </View>
            </KeyboardAvoidingView>
        </View>
    );
};

export default ChatScreen;

import React, { useState, useCallback } from 'react';
import { View, Text, FlatList, Image, Pressable, Alert, ActivityIndicator } from 'react-native';
import { Plus, MessageSquare, Trash2, Sparkles } from 'lucide-react-native';
import { ChatSession } from '../types';
import { db } from '../services/db';
import { useFocusEffect } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import BackgroundWrapper from './BackgroundWrapper';
import GlassCard from './GlassCard';
import { useTheme } from '../hooks/useTheme';

interface ChatListScreenProps {
    onSelectChat: (id: string) => void;
}

const ChatListScreen: React.FC<ChatListScreenProps> = ({ onSelectChat }) => {
    const [chats, setChats] = useState<ChatSession[]>([]);
    const [loading, setLoading] = useState(true);
    const theme = useTheme();

    const loadChats = async () => {
        setLoading(true);
        const data = await db.getChats();
        setChats(data);
        setLoading(false);
    };

    useFocusEffect(
        useCallback(() => {
            loadChats();
        }, [])
    );

    const handleCreateNew = async () => {
        const newChat = await db.createChat();
        onSelectChat(newChat.id);
    };

    const handleDelete = (id: string) => {
        Alert.alert(
            "Delete Conversation",
            "Are you sure you want to delete this conversation? This cannot be undone.",
            [
                { text: "Cancel", style: "cancel" },
                {
                    text: "Delete",
                    style: "destructive",
                    onPress: async () => {
                        await db.deleteChat(id);
                        loadChats();
                    }
                }
            ]
        );
    };

    const renderItem = ({ item }: { item: ChatSession }) => (
        <GlassCard className="mb-3">
            <Pressable
                onPress={() => onSelectChat(item.id)}
                className="flex-row items-center p-4"
                style={({ pressed }) => ({ opacity: pressed ? 0.7 : 1 })}
            >
                <View
                    className="w-12 h-12 rounded-full mr-4 overflow-hidden items-center justify-center"
                    style={{
                        backgroundColor: theme.primaryBg,
                        borderWidth: 1,
                        borderColor: theme.primary + '30'
                    }}
                >
                    <Image
                        source={{ uri: `https://picsum.photos/seed/${item.id}/200` }}
                        className="w-full h-full opacity-80"
                    />
                </View>

                <View className="flex-1">
                    <View className="flex-row justify-between items-baseline mb-1">
                        <Text
                            className="font-bold text-base flex-1 mr-2"
                            numberOfLines={1}
                            style={{ color: theme.text }}
                        >
                            {item.title}
                        </Text>
                        <Text
                            className="text-[10px] font-medium tracking-wide"
                            style={{ color: theme.primary }}
                        >
                            {new Date(item.updatedAt).toLocaleDateString() === new Date().toLocaleDateString()
                                ? new Date(item.updatedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
                                : new Date(item.updatedAt).toLocaleDateString()}
                        </Text>
                    </View>
                    <View className="flex-row justify-between items-center">
                        <Text
                            className="text-xs flex-1 mr-2 font-medium"
                            numberOfLines={1}
                            style={{ color: theme.textMuted }}
                        >
                            {item.lastMessage || "Start a conversation..."}
                        </Text>
                        <Pressable
                            onPress={() => handleDelete(item.id)}
                            className="p-1 items-center justify-center rounded-full"
                            style={({ pressed }) => ({
                                backgroundColor: pressed ? 'rgba(239, 68, 68, 0.1)' : 'transparent'
                            })}
                        >
                            <Trash2 size={14} color={theme.error} />
                        </Pressable>
                    </View>
                </View>
            </Pressable>
        </GlassCard>
    );

    return (
        <BackgroundWrapper>
            <SafeAreaView className="flex-1" edges={['top']}>
                {/* Header */}
                <View className="px-4 py-4 flex-row justify-between items-center z-10">
                    <View>
                        <View className="flex-row items-center gap-2">
                            <Sparkles size={20} color={theme.primary} />
                            <Text
                                className="font-black text-2xl"
                                style={{ color: theme.text }}
                            >
                                AI Surrogate
                            </Text>
                        </View>
                        <Text
                            className="text-[10px] tracking-[0.3em] uppercase ml-7"
                            style={{ color: theme.primary }}
                        >
                            Your Digital Twin
                        </Text>
                    </View>
                </View>

                {/* Tip Card */}
                {chats.length === 0 && !loading && (
                    <View className="mx-4 mb-4">
                        <GlassCard className="mb-0">
                            <View className="p-4">
                                <Text
                                    className="text-sm font-semibold mb-1"
                                    style={{ color: theme.text }}
                                >
                                    💡 Quick Tips
                                </Text>
                                <Text
                                    className="text-xs leading-relaxed"
                                    style={{ color: theme.textSecondary }}
                                >
                                    • Schedule events: "Schedule a meeting tomorrow at 3pm"{'\n'}
                                    • Send emails: "Draft an email to John about the project"{'\n'}
                                    • Search web: "Search for latest AI news"{'\n'}
                                    • Check prices: "What is the current price of Bitcoin?"
                                </Text>
                            </View>
                        </GlassCard>
                    </View>
                )}

                {/* List */}
                {loading ? (
                    <View className="flex-1 items-center justify-center">
                        <ActivityIndicator size="large" color={theme.primary} />
                        <Text
                            className="mt-3 text-sm"
                            style={{ color: theme.textMuted }}
                        >
                            Loading conversations...
                        </Text>
                    </View>
                ) : (
                    <FlatList
                        data={chats}
                        renderItem={renderItem}
                        keyExtractor={item => item.id}
                        contentContainerStyle={{ flexGrow: 1, padding: 16, paddingBottom: 100 }}
                        ListEmptyComponent={
                            <View className="flex-1 items-center justify-center p-8 mt-10">
                                <View
                                    className="w-20 h-20 rounded-full items-center justify-center mb-6"
                                    style={{
                                        backgroundColor: theme.primaryBg,
                                        borderWidth: 1,
                                        borderColor: theme.border
                                    }}
                                >
                                    <MessageSquare size={32} color={theme.primary} />
                                </View>
                                <Text
                                    className="mt-4 text-center font-medium text-base"
                                    style={{ color: theme.textSecondary }}
                                >
                                    No conversations yet
                                </Text>
                                <Text
                                    className="text-xs text-center mt-2"
                                    style={{ color: theme.textMuted }}
                                >
                                    Tap the + button to start chatting with your AI assistant
                                </Text>
                            </View>
                        }
                    />
                )}

                {/* FAB */}
                <Pressable
                    onPress={handleCreateNew}
                    className="absolute bottom-6 right-6 w-16 h-16 rounded-full items-center justify-center"
                    style={({ pressed }) => ({
                        backgroundColor: theme.isDark ? '#8B5CF6' : '#ffffff',
                        transform: [{ scale: pressed ? 0.95 : 1 }],
                        shadowColor: theme.isDark ? '#8B5CF6' : '#000000',
                        shadowOffset: { width: 0, height: 4 },
                        shadowOpacity: theme.isDark ? 0.6 : 0.25,
                        shadowRadius: 12,
                        elevation: 10,
                        borderWidth: theme.isDark ? 0 : 2,
                        borderColor: '#7c3aed',
                    })}
                >
                    <Plus size={32} color={theme.isDark ? '#ffffff' : '#7c3aed'} strokeWidth={2.5} />
                </Pressable>
            </SafeAreaView>
        </BackgroundWrapper>
    );
};

export default ChatListScreen;

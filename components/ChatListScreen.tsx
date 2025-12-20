import React, { useState, useEffect, useCallback } from 'react';
import { View, Text, FlatList, Image, Pressable, Alert, ActivityIndicator } from 'react-native';
import { Plus, MessageSquare, Trash2 } from 'lucide-react-native';
import { ChatSession } from '../types';
import { db } from '../services/db';
import { useFocusEffect } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';

interface ChatListScreenProps {
    onSelectChat: (id: string) => void;
}

const ChatListScreen: React.FC<ChatListScreenProps> = ({ onSelectChat }) => {
    const [chats, setChats] = useState<ChatSession[]>([]);
    const [loading, setLoading] = useState(true);

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
            "Are you sure you want to delete this conversation?",
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
        <Pressable
            onPress={() => onSelectChat(item.id)}
            className="flex-row items-center px-4 py-3 border-b border-gray-100 dark:border-gray-800 active:bg-gray-50 dark:active:bg-gray-800"
        >
            <View className="w-12 h-12 rounded-full bg-gray-200 dark:bg-gray-700 mr-4 overflow-hidden">
                <Image
                    source={{ uri: `https://picsum.photos/seed/${item.id}/200` }}
                    className="w-full h-full"
                />
            </View>
            <View className="flex-1">
                <View className="flex-row justify-between items-baseline mb-1">
                    <Text className="font-semibold text-gray-800 dark:text-gray-100 text-base flex-1 mr-2" numberOfLines={1}>
                        {item.title}
                    </Text>
                    <Text className="text-[10px] text-gray-400 dark:text-gray-500">
                        {new Date(item.updatedAt).toLocaleDateString() === new Date().toLocaleDateString()
                            ? new Date(item.updatedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
                            : new Date(item.updatedAt).toLocaleDateString()}
                    </Text>
                </View>
                <View className="flex-row justify-between items-center">
                    <Text className="text-gray-500 dark:text-gray-400 text-sm flex-1 mr-2" numberOfLines={1}>
                        {item.lastMessage || "Empty conversation"}
                    </Text>
                    <Pressable
                        onPress={() => handleDelete(item.id)}
                        className="p-1"
                    >
                        <Trash2 size={16} color="#9ca3af" />
                    </Pressable>
                </View>
            </View>
        </Pressable>
    );

    return (
        <SafeAreaView className="flex-1 bg-white dark:bg-[#0b141a]" edges={['top']}>
            {/* Header */}
            <View className="bg-[#075E54] dark:bg-[#1f2c34] px-4 py-4 shadow-md flex-row justify-between items-center">
                <Text className="font-bold text-xl text-white">My Surrogate</Text>
            </View>

            {/* List */}
            {loading ? (
                <View className="flex-1 items-center justify-center">
                    <ActivityIndicator size="large" color="#075E54" />
                </View>
            ) : (
                <FlatList
                    data={chats}
                    renderItem={renderItem}
                    keyExtractor={item => item.id}
                    contentContainerStyle={{ flexGrow: 1 }}
                    ListEmptyComponent={
                        <View className="flex-1 items-center justify-center p-8">
                            <MessageSquare size={48} color="#d1d5db" />
                            <Text className="text-gray-400 dark:text-gray-500 mt-4 text-center">No conversations yet.</Text>
                            <Text className="text-gray-400 dark:text-gray-500 text-sm text-center">Tap + to start a new chat.</Text>
                        </View>
                    }
                />
            )}

            {/* FAB */}
            <Pressable
                onPress={handleCreateNew}
                className="absolute bottom-6 right-6 w-14 h-14 bg-[#00A884] rounded-2xl shadow-lg items-center justify-center active:scale-95"
            >
                <Plus size={28} color="white" />
            </Pressable>
        </SafeAreaView>
    );
};

export default ChatListScreen;

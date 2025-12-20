import React from 'react';
import { View, Text, TextInput, Image, Pressable, Switch, Alert, ScrollView } from 'react-native';
import { Settings, User, Globe, Bell, Moon, LogOut, Sun } from 'lucide-react-native';
import { useUser } from '../context/UserContext';
import { db } from '../services/db';
import { SafeAreaView } from 'react-native-safe-area-context';

const SettingsScreen: React.FC = () => {
    const { userContext, updateContext } = useUser();

    const handleNameChange = (name: string) => {
        updateContext({ name });
    };

    const toggleTheme = () => {
        const newTheme = userContext.theme === 'light' ? 'dark' : 'light';
        updateContext({ theme: newTheme });
    };

    const handleClear = () => {
        Alert.alert(
            "Delete All Data",
            "WARNING: Are you sure you want to delete ALL data? This includes all chats and settings and cannot be undone.",
            [
                { text: "Cancel", style: "cancel" },
                {
                    text: "Delete",
                    style: "destructive",
                    onPress: async () => {
                        await db.clearAllData();
                        // Force reload or just reset context
                        updateContext({ name: '', hasSeenIntro: false });
                        Alert.alert("Data Cleared", "Please restart the app.");
                    }
                }
            ]
        );
    };

    const isDark = userContext.theme === 'dark';

    return (
        <SafeAreaView className="flex-1 bg-[#EFE7DE] dark:bg-[#0b141a]" edges={['top']}>
            <ScrollView className="flex-1">
                {/* Header */}
                <View className="bg-[#075E54] dark:bg-[#1f2c34] px-4 py-4 shadow-md mb-4">
                    <Text className="font-bold text-lg text-white">Settings</Text>
                </View>

                <View className="px-4 space-y-4 pb-8">
                    {/* Profile Section */}
                    <View className="bg-white dark:bg-[#1f2c34] rounded-lg shadow-sm p-4 flex-row items-center space-x-4">
                        <View className="w-16 h-16 rounded-full bg-gray-200 dark:bg-gray-700 overflow-hidden mr-4">
                            <Image source={{ uri: "https://picsum.photos/100/100" }} className="w-full h-full" />
                        </View>
                        <View className="flex-1">
                            <Text className="text-xs text-gray-500 dark:text-gray-400 uppercase font-semibold mb-1">Your Name</Text>
                            <TextInput
                                value={userContext.name}
                                onChangeText={handleNameChange}
                                className="w-full text-lg font-medium text-gray-800 dark:text-white border-b border-gray-200 dark:border-gray-700 py-1"
                                placeholder="Enter your name"
                                placeholderTextColor="#9ca3af"
                            />
                        </View>
                    </View>

                    {/* Options */}
                    <View className="bg-white dark:bg-[#1f2c34] rounded-lg shadow-sm overflow-hidden">
                        <Pressable className="p-4 border-b border-gray-100 dark:border-gray-800 flex-row items-center active:bg-gray-50 dark:active:bg-gray-800">
                            <Globe size={24} color={isDark ? "#9ca3af" : "#6b7280"} style={{ marginRight: 16 }} />
                            <View className="flex-1">
                                <Text className="text-base text-gray-800 dark:text-white">App Language</Text>
                                <Text className="text-xs text-gray-500 dark:text-gray-400">English (Phone's language)</Text>
                            </View>
                        </Pressable>

                        <Pressable className="p-4 border-b border-gray-100 dark:border-gray-800 flex-row items-center active:bg-gray-50 dark:active:bg-gray-800">
                            <Bell size={24} color={isDark ? "#9ca3af" : "#6b7280"} style={{ marginRight: 16 }} />
                            <View className="flex-1">
                                <Text className="text-base text-gray-800 dark:text-white">Notifications</Text>
                                <Text className="text-xs text-gray-500 dark:text-gray-400">Message, tones</Text>
                            </View>
                        </Pressable>

                        <View className="p-4 flex-row items-center justify-between">
                            <View className="flex-row items-center">
                                {isDark ? (
                                    <Moon size={24} color="#9ca3af" style={{ marginRight: 16 }} />
                                ) : (
                                    <Sun size={24} color="#6b7280" style={{ marginRight: 16 }} />
                                )}
                                <View>
                                    <Text className="text-base text-gray-800 dark:text-white">Theme</Text>
                                    <Text className="text-xs text-gray-500 dark:text-gray-400">{isDark ? 'Dark Mode' : 'Light Mode'}</Text>
                                </View>
                            </View>
                            <Switch
                                value={isDark}
                                onValueChange={toggleTheme}
                                trackColor={{ false: "#767577", true: "#00A884" }}
                                thumbColor={isDark ? "#f4f3f4" : "#f4f3f4"}
                            />
                        </View>
                    </View>

                    {/* Actions */}
                    <View className="bg-white dark:bg-[#1f2c34] rounded-lg shadow-sm overflow-hidden">
                        <Pressable
                            onPress={handleClear}
                            className="w-full p-4 flex-row items-center active:bg-red-50 dark:active:bg-red-900/10"
                        >
                            <LogOut size={24} color="#dc2626" style={{ marginRight: 16 }} />
                            <View>
                                <Text className="text-base font-medium text-red-600 dark:text-red-400">Delete All Data</Text>
                                <Text className="text-xs text-red-400 dark:text-red-500">Clear all chats and settings</Text>
                            </View>
                        </Pressable>
                    </View>

                    <View className="items-center py-4">
                        <Text className="text-xs text-gray-400 dark:text-gray-600">AI Surrogate Clone v2.1 (Local DB)</Text>
                    </View>
                </View>
            </ScrollView>
        </SafeAreaView>
    );
};

export default SettingsScreen;

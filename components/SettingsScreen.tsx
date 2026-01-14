import React from 'react';
import { View, Text, TextInput, Image, Pressable, Switch, Alert, ScrollView } from 'react-native';
import { Globe, Bell, Moon, Sun, LogOut, ChevronRight, User, Info, Smartphone } from 'lucide-react-native';
import { useUser } from '../context/UserContext';
import { db } from '../services/db';
import { SafeAreaView } from 'react-native-safe-area-context';
import BackgroundWrapper from './BackgroundWrapper';
import { LinearGradient } from 'expo-linear-gradient';
import { useTheme } from '../hooks/useTheme';
import GlassCard from './GlassCard';

const SettingsScreen: React.FC = () => {
    const { userContext, updateContext } = useUser();
    const theme = useTheme();
    const isDark = theme.isDark;

    const handleNameChange = (name: string) => {
        updateContext({ name });
    };

    const toggleTheme = () => {
        const newTheme = isDark ? 'light' : 'dark';
        updateContext({ theme: newTheme });
    };

    const handleClear = () => {
        Alert.alert(
            "Clear All Data",
            "This will delete all your conversations, events, and settings. This action cannot be undone.",
            [
                { text: "Cancel", style: "cancel" },
                {
                    text: "Clear Everything",
                    style: "destructive",
                    onPress: async () => {
                        await db.clearAllData();
                        updateContext({ name: '', hasSeenIntro: false });
                        Alert.alert("Data Cleared", "All data has been deleted. The app will restart.");
                    }
                }
            ]
        );
    };

    const MenuItem = ({ icon: Icon, title, subtitle, showChevron = true, onPress, color }: any) => (
        <Pressable
            onPress={onPress}
            className="p-4 flex-row items-center"
            style={({ pressed }) => ({
                backgroundColor: pressed ? (isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.03)') : 'transparent',
                borderBottomWidth: 1,
                borderBottomColor: theme.borderLight,
            })}
        >
            <View
                className="w-10 h-10 rounded-full items-center justify-center mr-4"
                style={{ backgroundColor: color + '20' }}
            >
                <Icon size={20} color={color || theme.primary} />
            </View>
            <View className="flex-1">
                <Text
                    className="text-base font-semibold"
                    style={{ color: theme.text }}
                >
                    {title}
                </Text>
                {subtitle && (
                    <Text
                        className="text-xs mt-0.5"
                        style={{ color: theme.textMuted }}
                    >
                        {subtitle}
                    </Text>
                )}
            </View>
            {showChevron && <ChevronRight size={18} color={theme.textMuted} />}
        </Pressable>
    );

    return (
        <BackgroundWrapper>
            <SafeAreaView className="flex-1" edges={['top']}>
                <ScrollView className="flex-1 px-4">
                    {/* Header */}
                    <View className="py-6 mb-2">
                        <Text
                            className="text-3xl font-black"
                            style={{ color: theme.text }}
                        >
                            Settings
                        </Text>
                        <Text
                            className="text-sm tracking-widest uppercase font-semibold"
                            style={{ color: theme.primary }}
                        >
                            Customize Your Experience
                        </Text>
                    </View>

                    {/* Profile Section */}
                    <GlassCard>
                        <LinearGradient
                            colors={isDark
                                ? ['rgba(139, 92, 246, 0.2)', 'transparent']
                                : ['rgba(124, 58, 237, 0.1)', 'transparent']
                            }
                            className="p-5 flex-row items-center"
                        >
                            <View className="relative">
                                <View
                                    className="w-20 h-20 rounded-full overflow-hidden mr-5"
                                    style={{
                                        borderWidth: 2,
                                        borderColor: theme.primary,
                                        backgroundColor: theme.card
                                    }}
                                >
                                    <Image
                                        source={{ uri: "https://picsum.photos/200/200" }}
                                        className="w-full h-full opacity-80"
                                    />
                                </View>
                                <View
                                    className="absolute bottom-0 right-5 w-5 h-5 rounded-full"
                                    style={{
                                        backgroundColor: theme.success,
                                        borderWidth: 2,
                                        borderColor: theme.background
                                    }}
                                />
                            </View>

                            <View className="flex-1">
                                <Text
                                    className="text-xs uppercase font-bold mb-1"
                                    style={{ color: theme.primary }}
                                >
                                    Your Name
                                </Text>
                                <TextInput
                                    value={userContext.name}
                                    onChangeText={handleNameChange}
                                    className="w-full text-xl font-bold py-2"
                                    style={{
                                        color: theme.text,
                                        borderBottomWidth: 1,
                                        borderBottomColor: theme.border
                                    }}
                                    placeholder="Enter your name"
                                    placeholderTextColor={theme.textMuted}
                                />
                                <Text
                                    className="text-xs mt-1"
                                    style={{ color: theme.textMuted }}
                                >
                                    This is how your AI will address you
                                </Text>
                            </View>
                        </LinearGradient>
                    </GlassCard>

                    {/* Appearance */}
                    <Text
                        className="font-bold mb-3 px-1 uppercase text-xs tracking-wider"
                        style={{ color: theme.textMuted }}
                    >
                        Appearance
                    </Text>
                    <GlassCard>
                        <View
                            className="p-4 flex-row items-center justify-between"
                            style={{ borderBottomWidth: 1, borderBottomColor: theme.borderLight }}
                        >
                            <View className="flex-row items-center">
                                <View
                                    className="w-10 h-10 rounded-full items-center justify-center mr-4"
                                    style={{ backgroundColor: theme.primaryBg }}
                                >
                                    {isDark ? (
                                        <Moon size={20} color={theme.primary} />
                                    ) : (
                                        <Sun size={20} color={theme.primary} />
                                    )}
                                </View>
                                <View>
                                    <Text
                                        className="text-base font-semibold"
                                        style={{ color: theme.text }}
                                    >
                                        {isDark ? 'Dark Mode' : 'Light Mode'}
                                    </Text>
                                    <Text
                                        className="text-xs mt-0.5"
                                        style={{ color: theme.textMuted }}
                                    >
                                        {isDark ? 'Easy on the eyes' : 'Bright and clear'}
                                    </Text>
                                </View>
                            </View>
                            <Switch
                                value={isDark}
                                onValueChange={toggleTheme}
                                trackColor={{ false: "#d4d4d4", true: theme.primary }}
                                thumbColor={"#fff"}
                            />
                        </View>
                    </GlassCard>

                    {/* Preferences */}
                    <Text
                        className="font-bold mb-3 px-1 uppercase text-xs tracking-wider"
                        style={{ color: theme.textMuted }}
                    >
                        Preferences
                    </Text>
                    <GlassCard>
                        <MenuItem
                            icon={Globe}
                            title="Language"
                            subtitle="English"
                            color="#06b6d4"
                        />
                        <MenuItem
                            icon={Bell}
                            title="Notifications"
                            subtitle="Manage notification preferences"
                            color="#f472b6"
                        />
                    </GlassCard>

                    {/* About */}
                    <Text
                        className="font-bold mb-3 px-1 uppercase text-xs tracking-wider"
                        style={{ color: theme.textMuted }}
                    >
                        About
                    </Text>
                    <GlassCard>
                        <MenuItem
                            icon={Info}
                            title="Version"
                            subtitle="1.0.0 (FYP Release)"
                            showChevron={false}
                            color="#8B5CF6"
                        />
                    </GlassCard>

                    {/* Danger Zone */}
                    <Text
                        className="font-bold mb-3 px-1 uppercase text-xs tracking-wider"
                        style={{ color: theme.error }}
                    >
                        Danger Zone
                    </Text>
                    <GlassCard>
                        <Pressable
                            onPress={handleClear}
                            className="p-4 flex-row items-center"
                            style={({ pressed }) => ({
                                backgroundColor: pressed ? 'rgba(239, 68, 68, 0.1)' : 'transparent'
                            })}
                        >
                            <View
                                className="w-10 h-10 rounded-full items-center justify-center mr-4"
                                style={{ backgroundColor: 'rgba(239, 68, 68, 0.2)' }}
                            >
                                <LogOut size={20} color={theme.error} />
                            </View>
                            <View className="flex-1">
                                <Text
                                    className="text-base font-semibold"
                                    style={{ color: theme.error }}
                                >
                                    Clear All Data
                                </Text>
                                <Text
                                    className="text-xs mt-0.5"
                                    style={{ color: theme.error + '99' }}
                                >
                                    Delete all conversations and reset the app
                                </Text>
                            </View>
                            <ChevronRight size={18} color={theme.error} />
                        </Pressable>
                    </GlassCard>

                    {/* FYP Team Credits */}
                    <GlassCard className="mt-4 p-5">
                        <View className="items-center mb-4">
                            <Text
                                className="text-lg font-black mb-1"
                                style={{ color: theme.text }}
                            >
                                🎓 Final Year Project
                            </Text>
                            <Text
                                className="text-xs font-medium"
                                style={{ color: theme.primary }}
                            >
                                Department of Artificial Intelligence
                            </Text>
                            <Text
                                className="text-[11px]"
                                style={{ color: theme.textSecondary }}
                            >
                                The Islamia University of Bahawalpur
                            </Text>
                        </View>

                        <View
                            className="rounded-xl p-4 mb-4"
                            style={{ backgroundColor: theme.primaryBg }}
                        >
                            <Text
                                className="text-center text-xs font-bold mb-3 uppercase tracking-wider"
                                style={{ color: theme.primary }}
                            >
                                ⚡ The Masterminds Behind the Magic
                            </Text>
                            <View className="gap-2">
                                {[
                                    { name: 'Shahzaib Hassan', role: '🧠 AI Architect' },
                                    { name: 'Sagar Salam', role: '🎨 UX Wizard' },
                                    { name: 'Malik Muhammad Saad', role: '⚙️ Backend Ninja' },
                                ].map((member, i) => (
                                    <View
                                        key={i}
                                        className="flex-row items-center justify-between py-2 px-3 rounded-lg"
                                        style={{
                                            backgroundColor: theme.isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.03)',
                                        }}
                                    >
                                        <Text
                                            className="text-sm font-semibold"
                                            style={{ color: theme.text }}
                                        >
                                            {member.name}
                                        </Text>
                                        <Text
                                            className="text-[10px]"
                                            style={{ color: theme.textMuted }}
                                        >
                                            {member.role}
                                        </Text>
                                    </View>
                                ))}
                            </View>
                        </View>

                        <Text
                            className="text-center text-xs italic mb-2"
                            style={{ color: theme.textSecondary }}
                        >
                            "Turning caffeine into code since 2024" ☕
                        </Text>

                        <Text
                            className="text-center text-[10px]"
                            style={{ color: theme.textMuted }}
                        >
                            © 2025-2026 • IUB • All Rights Reserved
                        </Text>
                    </GlassCard>

                    <View className="items-center py-6">
                        <Text
                            className="text-[10px] uppercase tracking-[0.2em] mb-1"
                            style={{ color: theme.textMuted }}
                        >
                            AI Surrogate v1.0.0
                        </Text>
                        <Text
                            className="text-[10px]"
                            style={{ color: theme.textMuted }}
                        >
                            Made with 💜 using Gemini & Mistral AI
                        </Text>
                        <Text
                            className="text-[9px] mt-1"
                            style={{ color: theme.textMuted }}
                        >
                            🚀 Where AI meets imagination
                        </Text>
                    </View>
                </ScrollView>
            </SafeAreaView>
        </BackgroundWrapper>
    );
};

export default SettingsScreen;

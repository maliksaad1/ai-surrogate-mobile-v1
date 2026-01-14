import React from 'react';
import { View, Text, Pressable, ScrollView } from 'react-native';
import { Bot, Mic, Layers, ShieldCheck, ArrowRight, Sparkles } from 'lucide-react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import BackgroundWrapper from './BackgroundWrapper';
import GlassCard from './GlassCard';
import { useTheme } from '../hooks/useTheme';

interface IntroScreenProps {
    onComplete: () => void;
}

const IntroScreen: React.FC<IntroScreenProps> = ({ onComplete }) => {
    const theme = useTheme();

    return (
        <BackgroundWrapper>
            <SafeAreaView className="flex-1">
                <ScrollView contentContainerStyle={{ flexGrow: 1, paddingHorizontal: 24, paddingVertical: 48, justifyContent: 'space-between' }}>

                    {/* Hero Section */}
                    <View className="items-center mb-8 pt-8">
                        <View
                            className="w-24 h-24 rounded-full items-center justify-center mb-6"
                            style={{
                                borderWidth: 2,
                                borderColor: theme.primary,
                                backgroundColor: theme.isDark ? 'rgba(0,0,0,0.5)' : 'rgba(255,255,255,0.9)',
                                shadowColor: theme.primary,
                                shadowOffset: { width: 0, height: 0 },
                                shadowOpacity: 0.5,
                                shadowRadius: 20,
                                elevation: 10,
                            }}
                        >
                            <Bot size={48} color={theme.primary} />
                        </View>
                        <Text
                            className="text-4xl font-black text-center mb-2"
                            style={{ color: theme.text }}
                        >
                            AI Surrogate
                        </Text>
                        <Text
                            className="text-center text-sm uppercase tracking-widest font-bold max-w-xs"
                            style={{ color: theme.primary }}
                        >
                            Your Intelligent Assistant
                        </Text>
                    </View>

                    {/* Features Card */}
                    <GlassCard className="p-6 mb-6">
                        <View
                            className="flex-row items-center pb-4 mb-4"
                            style={{ borderBottomWidth: 1, borderBottomColor: theme.borderLight }}
                        >
                            <View
                                className="p-3 rounded-lg mr-4"
                                style={{
                                    backgroundColor: theme.primaryBg,
                                    borderWidth: 1,
                                    borderColor: theme.primary + '30'
                                }}
                            >
                                <Mic size={24} color={theme.primary} />
                            </View>
                            <View className="flex-1">
                                <Text
                                    className="font-bold text-lg"
                                    style={{ color: theme.text }}
                                >
                                    Voice & Text
                                </Text>
                                <Text
                                    className="text-xs leading-snug"
                                    style={{ color: theme.textSecondary }}
                                >
                                    Chat naturally using voice or text in multiple languages.
                                </Text>
                            </View>
                        </View>

                        <View
                            className="flex-row items-center pb-4 mb-4"
                            style={{ borderBottomWidth: 1, borderBottomColor: theme.borderLight }}
                        >
                            <View
                                className="p-3 rounded-lg mr-4"
                                style={{
                                    backgroundColor: '#06b6d420',
                                    borderWidth: 1,
                                    borderColor: '#06b6d430'
                                }}
                            >
                                <Layers size={24} color="#06b6d4" />
                            </View>
                            <View className="flex-1">
                                <Text
                                    className="font-bold text-lg"
                                    style={{ color: theme.text }}
                                >
                                    Smart Agents
                                </Text>
                                <Text
                                    className="text-xs leading-snug"
                                    style={{ color: theme.textSecondary }}
                                >
                                    Automatic routing to scheduling, email, search, and document agents.
                                </Text>
                            </View>
                        </View>

                        <View className="flex-row items-center">
                            <View
                                className="p-3 rounded-lg mr-4"
                                style={{
                                    backgroundColor: '#EC489920',
                                    borderWidth: 1,
                                    borderColor: '#EC489930'
                                }}
                            >
                                <ShieldCheck size={24} color="#EC4899" />
                            </View>
                            <View className="flex-1">
                                <Text
                                    className="font-bold text-lg"
                                    style={{ color: theme.text }}
                                >
                                    Privacy First
                                </Text>
                                <Text
                                    className="text-xs leading-snug"
                                    style={{ color: theme.textSecondary }}
                                >
                                    Your data stays on your device with local-first storage.
                                </Text>
                            </View>
                        </View>
                    </GlassCard>

                    {/* Quick Tips */}
                    <GlassCard className="p-4 mb-6">
                        <View className="flex-row items-center mb-2">
                            <Sparkles size={16} color={theme.primary} />
                            <Text
                                className="font-bold text-sm ml-2"
                                style={{ color: theme.text }}
                            >
                                Try saying...
                            </Text>
                        </View>
                        <Text
                            className="text-xs leading-relaxed"
                            style={{ color: theme.textSecondary }}
                        >
                            "Schedule a meeting with John tomorrow at 2pm"{'\n'}
                            "Draft an email to my team about the project update"{'\n'}
                            "Search for the latest news about AI"
                        </Text>
                    </GlassCard>

                    {/* Action Button */}
                    <View>
                        <Pressable
                            onPress={onComplete}
                            className="w-full py-4 rounded-xl flex-row items-center justify-center"
                            style={({ pressed }) => ({
                                backgroundColor: theme.primary,
                                transform: [{ scale: pressed ? 0.98 : 1 }],
                                shadowColor: theme.primary,
                                shadowOffset: { width: 0, height: 0 },
                                shadowOpacity: 0.6,
                                shadowRadius: 15,
                                elevation: 8,
                                borderWidth: 1,
                                borderColor: 'rgba(255,255,255,0.2)'
                            })}
                        >
                            <Text className="text-white font-black text-lg uppercase tracking-wider">Get Started</Text>
                            <ArrowRight size={20} color="white" style={{ marginLeft: 8 }} />
                        </Pressable>
                        <Text
                            className="text-center text-[10px] mt-4 uppercase tracking-[0.2em]"
                            style={{ color: theme.textMuted }}
                        >
                            Powered by Gemini 2.0 Flash
                        </Text>
                    </View>

                </ScrollView>
            </SafeAreaView>
        </BackgroundWrapper>
    );
};

export default IntroScreen;

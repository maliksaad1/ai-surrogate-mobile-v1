import React from 'react';
import { View, Text, Pressable } from 'react-native';
import { Bot, Mic, Layers, ShieldCheck, ArrowRight } from 'lucide-react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

interface IntroScreenProps {
    onComplete: () => void;
}

const IntroScreen: React.FC<IntroScreenProps> = ({ onComplete }) => {
    return (
        <View className="flex-1 bg-white dark:bg-[#0b141a]">
            {/* Background decoration */}
            <View className="absolute top-0 left-0 w-full h-1/2 bg-[#075E54] dark:bg-[#1f2c34] rounded-b-[40px]" />

            <SafeAreaView className="flex-1 px-6 pt-12 pb-6 justify-between">

                {/* Hero Section */}
                <View className="items-center mb-8">
                    <View className="w-24 h-24 bg-white dark:bg-[#1f2c34] rounded-full items-center justify-center shadow-lg mb-6">
                        <Bot size={48} color="#075E54" />
                    </View>
                    <Text className="text-3xl font-bold text-white text-center mb-2">My Surrogate</Text>
                    <Text className="text-green-100 text-center text-sm max-w-xs">
                        Your intelligent digital twin for seamless communication and task automation.
                    </Text>
                </View>

                {/* Features Card */}
                <View className="bg-white dark:bg-[#1f2c34] rounded-2xl shadow-xl p-6 mb-6 space-y-6 border border-gray-100 dark:border-gray-800">
                    <View className="flex-row items-start">
                        <View className="bg-green-100 dark:bg-green-900/30 p-3 rounded-lg mr-4">
                            <Mic size={24} color="#075E54" />
                        </View>
                        <View className="flex-1">
                            <Text className="font-bold text-gray-800 dark:text-gray-100 text-lg">Multilingual Voice</Text>
                            <Text className="text-gray-500 dark:text-gray-400 text-sm leading-snug">Speak naturally in English, Urdu, or Punjabi. I understand and respond in your preferred language.</Text>
                        </View>
                    </View>

                    <View className="flex-row items-start">
                        <View className="bg-blue-100 dark:bg-blue-900/30 p-3 rounded-lg mr-4">
                            <Layers size={24} color="#2563eb" />
                        </View>
                        <View className="flex-1">
                            <Text className="font-bold text-gray-800 dark:text-gray-100 text-lg">Smart Agents</Text>
                            <Text className="text-gray-500 dark:text-gray-400 text-sm leading-snug">I automatically route requests to specialized agents for Scheduling, Documents, or Web Search.</Text>
                        </View>
                    </View>

                    <View className="flex-row items-start">
                        <View className="bg-orange-100 dark:bg-orange-900/30 p-3 rounded-lg mr-4">
                            <ShieldCheck size={24} color="#ea580c" />
                        </View>
                        <View className="flex-1">
                            <Text className="font-bold text-gray-800 dark:text-gray-100 text-lg">Local & Secure</Text>
                            <Text className="text-gray-500 dark:text-gray-400 text-sm leading-snug">Your chats and settings are stored locally on your device for maximum privacy.</Text>
                        </View>
                    </View>
                </View>

                {/* Action Button */}
                <Pressable
                    onPress={onComplete}
                    className="w-full bg-[#075E54] dark:bg-[#00a884] py-4 rounded-xl shadow-lg flex-row items-center justify-center active:opacity-90"
                >
                    <Text className="text-white font-bold text-lg">Get Started</Text>
                    <ArrowRight size={20} color="white" style={{ marginLeft: 8 }} />
                </Pressable>

                <Text className="text-center text-xs text-gray-400 dark:text-gray-600 mt-4">Powered by Gemini 2.0 Flash</Text>
            </SafeAreaView>
        </View>
    );
};

export default IntroScreen;

import React, { useMemo, useState, useCallback } from 'react';
import { View, Text, ScrollView, ActivityIndicator } from 'react-native';
import { AgentType, TaskLog } from '../types';
import { Activity, Calendar, FileText, Globe, PieChart as PieChartIcon, Search, Mail, CreditCard, TrendingUp } from 'lucide-react-native';
import { db } from '../services/db';
import { useFocusEffect } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import BackgroundWrapper from './BackgroundWrapper';
import GlassCard from './GlassCard';
import { useTheme } from '../hooks/useTheme';

const DashboardScreen: React.FC = () => {
    const [logs, setLogs] = useState<TaskLog[]>([]);
    const [loading, setLoading] = useState(true);
    const theme = useTheme();

    const loadStats = async () => {
        setLoading(true);
        const chats = await db.getChats();
        const derivedLogs: TaskLog[] = [];

        chats.forEach(chat => {
            chat.messages.forEach(msg => {
                if (msg.sender === 'agent' && msg.processingAgent && msg.processingAgent !== AgentType.CHAT) {
                    derivedLogs.push({
                        id: msg.id,
                        agent: msg.processingAgent,
                        action: msg.payloadType || 'Response',
                        status: 'Completed',
                        timestamp: msg.timestamp
                    });
                }
            });
        });

        setLogs(derivedLogs.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()));
        setLoading(false);
    };

    useFocusEffect(
        useCallback(() => {
            loadStats();
        }, [])
    );

    const { agentStats, totalTasks } = useMemo(() => {
        const counts: Record<string, number> = {
            [AgentType.CHAT]: 0,
            [AgentType.SCHEDULE]: 0,
            [AgentType.DOCS]: 0,
            [AgentType.SEARCH]: 0,
            [AgentType.EMAIL]: 0,
            [AgentType.PAYMENT]: 0,
            [AgentType.FINANCE]: 0,
        };

        logs.forEach(log => {
            if (counts[log.agent] !== undefined) {
                counts[log.agent]++;
            }
        });

        const stats = [
            { name: 'Schedule', short: 'Sch', value: counts[AgentType.SCHEDULE], color: '#a855f7', icon: Calendar },
            { name: 'Docs', short: 'Doc', value: counts[AgentType.DOCS], color: '#f97316', icon: FileText },
            { name: 'Search', short: 'Src', value: counts[AgentType.SEARCH], color: '#3b82f6', icon: Search },
            { name: 'Email', short: 'Eml', value: counts[AgentType.EMAIL], color: '#ef4444', icon: Mail },
            { name: 'Payment', short: 'Pay', value: counts[AgentType.PAYMENT], color: '#22c55e', icon: CreditCard },
            { name: 'Finance', short: 'Fin', value: counts[AgentType.FINANCE], color: '#10b981', icon: TrendingUp },
        ];

        return { agentStats: stats, totalTasks: logs.length };
    }, [logs]);

    const maxStatValue = Math.max(...agentStats.map(s => s.value), 1);

    if (loading) {
        return (
            <BackgroundWrapper>
                <View className="flex-1 items-center justify-center">
                    <ActivityIndicator size="large" color={theme.primary} />
                    <Text
                        className="mt-3 text-sm"
                        style={{ color: theme.textMuted }}
                    >
                        Loading analytics...
                    </Text>
                </View>
            </BackgroundWrapper>
        );
    }

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
                            Dashboard
                        </Text>
                        <Text
                            className="text-sm tracking-widest uppercase font-semibold"
                            style={{ color: theme.primary }}
                        >
                            Activity Overview
                        </Text>
                    </View>

                    {/* Status Cards */}
                    <View className="flex-row gap-4 mb-4">
                        <GlassCard className="flex-1 p-4 mb-0">
                            <View className="flex-row items-center gap-2 mb-2">
                                <View
                                    className="p-2 rounded-lg"
                                    style={{ backgroundColor: theme.success + '20' }}
                                >
                                    <Activity size={18} color={theme.success} />
                                </View>
                                <Text
                                    className="font-bold text-xs uppercase tracking-wide"
                                    style={{ color: theme.textSecondary }}
                                >
                                    Tasks
                                </Text>
                            </View>
                            <Text
                                className="text-3xl font-black"
                                style={{ color: theme.text }}
                            >
                                {totalTasks}
                            </Text>
                            <Text
                                className="text-[10px]"
                                style={{ color: theme.success }}
                            >
                                Total Interactions
                            </Text>
                        </GlassCard>

                        <GlassCard className="flex-1 p-4 mb-0">
                            <View className="flex-row items-center gap-2 mb-2">
                                <View
                                    className="p-2 rounded-lg"
                                    style={{ backgroundColor: '#06b6d4' + '20' }}
                                >
                                    <Globe size={18} color="#06b6d4" />
                                </View>
                                <Text
                                    className="font-bold text-xs uppercase tracking-wide"
                                    style={{ color: theme.textSecondary }}
                                >
                                    Status
                                </Text>
                            </View>
                            <Text
                                className="text-xl font-black"
                                style={{ color: theme.text }}
                            >
                                ONLINE
                            </Text>
                            <Text
                                className="text-[10px]"
                                style={{ color: theme.textMuted }}
                            >
                                Gemini 2.0 Flash
                            </Text>
                        </GlassCard>
                    </View>

                    {/* Chart */}
                    <GlassCard className="p-5">
                        <View className="flex-row items-center mb-6">
                            <PieChartIcon size={16} color={theme.textMuted} style={{ marginRight: 8 }} />
                            <Text
                                className="font-bold text-sm uppercase"
                                style={{ color: theme.text }}
                            >
                                Agent Activity
                            </Text>
                        </View>

                        {totalTasks > 0 ? (
                            <View className="flex-row justify-between items-end h-40 pt-4 px-2">
                                {agentStats.map((item, index) => (
                                    <View key={index} className="items-center flex-1 gap-2">
                                        <View className="w-full items-center">
                                            <View
                                                className="w-2 rounded-full"
                                                style={{
                                                    height: Math.max((item.value / maxStatValue) * 120, 4),
                                                    backgroundColor: item.color,
                                                    shadowColor: item.color,
                                                    shadowOffset: { width: 0, height: 0 },
                                                    shadowOpacity: theme.isDark ? 0.8 : 0.4,
                                                    shadowRadius: 10,
                                                    elevation: 5
                                                }}
                                            />
                                        </View>
                                        <Text
                                            className="text-[9px] font-bold tracking-wider uppercase mt-2"
                                            style={{ color: theme.textMuted }}
                                        >
                                            {item.short}
                                        </Text>
                                    </View>
                                ))}
                            </View>
                        ) : (
                            <View className="items-center justify-center py-8">
                                <Text
                                    className="font-medium text-center"
                                    style={{ color: theme.textMuted }}
                                >
                                    No activity yet
                                </Text>
                                <Text
                                    className="text-xs text-center mt-1"
                                    style={{ color: theme.textMuted }}
                                >
                                    Start a conversation to see your stats
                                </Text>
                            </View>
                        )}
                    </GlassCard>

                    {/* Recent Activity */}
                    <GlassCard className="p-0">
                        <View
                            className="p-4"
                            style={{ borderBottomWidth: 1, borderBottomColor: theme.borderLight }}
                        >
                            <Text
                                className="font-bold text-sm uppercase"
                                style={{ color: theme.text }}
                            >
                                Recent Activity
                            </Text>
                        </View>
                        <View>
                            {logs.length === 0 ? (
                                <View className="py-8 px-4">
                                    <Text
                                        className="text-center text-xs"
                                        style={{ color: theme.textMuted }}
                                    >
                                        No recent activities
                                    </Text>
                                    <Text
                                        className="text-center text-xs mt-1"
                                        style={{ color: theme.textMuted }}
                                    >
                                        Chat with your AI to generate activity
                                    </Text>
                                </View>
                            ) : (
                                logs.slice(0, 5).map((log, idx) => (
                                    <View
                                        key={idx}
                                        className="flex-row items-center justify-between p-4"
                                        style={{
                                            backgroundColor: theme.isDark ? 'rgba(0,0,0,0.2)' : 'rgba(0,0,0,0.02)',
                                            borderBottomWidth: idx < 4 ? 1 : 0,
                                            borderBottomColor: theme.borderLight
                                        }}
                                    >
                                        <View className="flex-row items-center gap-3 flex-1">
                                            <View
                                                className="rounded-full p-2"
                                                style={{
                                                    backgroundColor: log.agent === AgentType.SCHEDULE ? '#a855f720' :
                                                        log.agent === AgentType.DOCS ? '#f9731620' :
                                                            log.agent === AgentType.EMAIL ? '#ef444420' :
                                                                log.agent === AgentType.SEARCH ? '#3b82f620' :
                                                                    theme.primaryBg
                                                }}
                                            >
                                                {log.agent === AgentType.SCHEDULE ? <Calendar size={14} color="#a855f7" /> :
                                                    log.agent === AgentType.DOCS ? <FileText size={14} color="#f97316" /> :
                                                        log.agent === AgentType.EMAIL ? <Mail size={14} color="#ef4444" /> :
                                                            log.agent === AgentType.SEARCH ? <Search size={14} color="#3b82f6" /> :
                                                                <Activity size={14} color={theme.textMuted} />}
                                            </View>
                                            <View className="flex-1">
                                                <Text
                                                    className="font-bold text-xs mb-0.5"
                                                    numberOfLines={1}
                                                    style={{ color: theme.text }}
                                                >
                                                    {log.agent}
                                                </Text>
                                                <Text
                                                    className="text-[10px]"
                                                    numberOfLines={1}
                                                    style={{ color: theme.textMuted }}
                                                >
                                                    {log.action}
                                                </Text>
                                            </View>
                                        </View>
                                        <View className="items-end ml-2">
                                            <View
                                                className="px-2 py-0.5 rounded-full mb-1"
                                                style={{
                                                    backgroundColor: theme.success + '15',
                                                    borderWidth: 1,
                                                    borderColor: theme.success + '30'
                                                }}
                                            >
                                                <Text
                                                    className="text-[8px] font-bold uppercase"
                                                    style={{ color: theme.success }}
                                                >
                                                    {log.status}
                                                </Text>
                                            </View>
                                            <Text
                                                className="text-[9px]"
                                                style={{ color: theme.textMuted }}
                                            >
                                                {new Date(log.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                            </Text>
                                        </View>
                                    </View>
                                ))
                            )}
                        </View>
                    </GlassCard>

                    {/* Tips Section */}
                    <GlassCard className="p-4 mb-8">
                        <Text
                            className="font-bold text-sm mb-2"
                            style={{ color: theme.text }}
                        >
                            💡 Did you know?
                        </Text>
                        <Text
                            className="text-xs leading-relaxed"
                            style={{ color: theme.textSecondary }}
                        >
                            Your AI assistant can help with scheduling events, drafting emails, searching the web,
                            creating documents, and checking crypto prices. Just start a conversation and ask!
                        </Text>
                    </GlassCard>
                </ScrollView>
            </SafeAreaView>
        </BackgroundWrapper>
    );
};

export default DashboardScreen;

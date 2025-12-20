import React, { useMemo, useState, useCallback } from 'react';
import { View, Text, ScrollView, ActivityIndicator } from 'react-native';
import { AgentType, TaskLog } from '../types';
import { Activity, Calendar, FileText, Search, Globe, PieChart as PieChartIcon, Mail, CreditCard, TrendingUp } from 'lucide-react-native';
import { db } from '../services/db';
import { useFocusEffect } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';

const DashboardScreen: React.FC = () => {
    const [logs, setLogs] = useState<TaskLog[]>([]); // In a real app, we'd fetch logs. For now, we'll mock or extract from chats.
    const [loading, setLoading] = useState(true);

    // Since we don't have a separate logs DB in the original code (it was just an interface), 
    // we will derive stats from the Chat History for this demo.
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
            { name: 'Schedule', short: 'Sch', value: counts[AgentType.SCHEDULE], color: '#9333ea' },
            { name: 'Docs', short: 'Doc', value: counts[AgentType.DOCS], color: '#ea580c' },
            { name: 'Search', short: 'Src', value: counts[AgentType.SEARCH], color: '#2563eb' },
            { name: 'Email', short: 'Eml', value: counts[AgentType.EMAIL], color: '#dc2626' },
            { name: 'Payment', short: 'Pay', value: counts[AgentType.PAYMENT], color: '#16a34a' },
            { name: 'Finance', short: 'Fin', value: counts[AgentType.FINANCE], color: '#10b981' },
        ];

        return { agentStats: stats, totalTasks: logs.length };
    }, [logs]);

    const maxStatValue = Math.max(...agentStats.map(s => s.value), 1);

    if (loading) {
        return (
            <View className="flex-1 items-center justify-center bg-[#EFE7DE] dark:bg-[#0b141a]">
                <ActivityIndicator size="large" color="#075E54" />
            </View>
        );
    }

    return (
        <SafeAreaView className="flex-1 bg-[#f8fafc] dark:bg-[#0b141a]" edges={['top']}>
            <ScrollView className="flex-1">
                {/* Dashboard Header */}
                <View className="bg-white dark:bg-[#1f2c34] px-6 py-6 shadow-sm mb-4">
                    <Text className="text-2xl font-bold text-slate-800 dark:text-white">System Dashboard</Text>
                    <Text className="text-sm text-slate-500 dark:text-gray-400">Real-time Agent Analytics</Text>
                </View>

                <View className="px-4 space-y-4 pb-8">
                    {/* Status Cards */}
                    <View className="flex-row gap-4">
                        <View className="flex-1 bg-white dark:bg-[#1f2c34] p-4 rounded-xl shadow-sm border border-slate-100 dark:border-gray-800">
                            <View className="flex-row items-center gap-2 mb-2">
                                <View className="p-2 bg-green-100 dark:bg-green-900/30 rounded-lg">
                                    <Activity size={20} color="#16a34a" />
                                </View>
                                <Text className="font-semibold text-slate-700 dark:text-gray-300">Total Tasks</Text>
                            </View>
                            <Text className="text-2xl font-bold text-slate-800 dark:text-white">{totalTasks}</Text>
                            <Text className="text-xs text-green-600 dark:text-green-400">Lifetime interactions</Text>
                        </View>
                        <View className="flex-1 bg-white dark:bg-[#1f2c34] p-4 rounded-xl shadow-sm border border-slate-100 dark:border-gray-800">
                            <View className="flex-row items-center gap-2 mb-2">
                                <View className="p-2 bg-blue-100 dark:bg-blue-900/30 rounded-lg">
                                    <Globe size={20} color="#2563eb" />
                                </View>
                                <Text className="font-semibold text-slate-700 dark:text-gray-300">API Status</Text>
                            </View>
                            <Text className="text-lg font-bold text-slate-800 dark:text-white">Online</Text>
                            <Text className="text-xs text-slate-400">Gemini 2.0 Flash</Text>
                        </View>
                    </View>

                    {/* Simple Bar Chart */}
                    <View className="bg-white dark:bg-[#1f2c34] p-4 rounded-xl shadow-sm border border-slate-100 dark:border-gray-800">
                        <View className="flex-row items-center mb-4">
                            <PieChartIcon size={16} color="#94a3b8" style={{ marginRight: 8 }} />
                            <Text className="font-bold text-slate-700 dark:text-gray-200">Agent Activity Volume</Text>
                        </View>

                        {totalTasks > 0 ? (
                            <View className="flex-row justify-between items-end h-40 pt-4 px-2">
                                {agentStats.map((item, index) => (
                                    <View key={index} className="items-center flex-1 gap-2">
                                        <View className="w-full items-center">
                                            <Text className="text-[10px] text-gray-400 mb-1">{item.value}</Text>
                                            <View
                                                className="w-3 rounded-t-sm"
                                                style={{
                                                    height: Math.max((item.value / maxStatValue) * 120, 4),
                                                    backgroundColor: item.color
                                                }}
                                            />
                                        </View>
                                        <Text className="text-[10px] text-gray-500 dark:text-gray-400 font-medium">{item.short}</Text>
                                    </View>
                                ))}
                            </View>
                        ) : (
                            <View className="items-center justify-center py-8">
                                <Text className="text-gray-400">No activity data yet.</Text>
                            </View>
                        )}
                    </View>

                    {/* Recent Logs */}
                    <View className="bg-white dark:bg-[#1f2c34] p-4 rounded-xl shadow-sm border border-slate-100 dark:border-gray-800">
                        <Text className="font-bold text-slate-700 dark:text-gray-200 mb-3">Recent Tasks</Text>
                        <View className="space-y-3">
                            {logs.length === 0 ? (
                                <Text className="text-center text-slate-400 py-4 text-sm">No recent agent tasks</Text>
                            ) : (
                                logs.slice(0, 10).map((log, idx) => (
                                    <View key={idx} className="flex-row items-center justify-between border-b border-slate-50 dark:border-gray-800 pb-2">
                                        <View className="flex-row items-center gap-3 flex-1">
                                            <View className={`p-2 rounded-full ${log.agent === AgentType.SCHEDULE ? 'bg-purple-100 dark:bg-purple-900/30' :
                                                    log.agent === AgentType.DOCS ? 'bg-orange-100 dark:bg-orange-900/30' :
                                                        log.agent === AgentType.EMAIL ? 'bg-red-100 dark:bg-red-900/30' :
                                                            log.agent === AgentType.SEARCH ? 'bg-blue-100 dark:bg-blue-900/30' :
                                                                log.agent === AgentType.PAYMENT ? 'bg-green-100 dark:bg-green-900/30' :
                                                                    log.agent === AgentType.FINANCE ? 'bg-black border border-green-500/30' :
                                                                        'bg-gray-100 dark:bg-gray-800'
                                                }`}>
                                                {log.agent === AgentType.SCHEDULE ? <Calendar size={16} color="#9333ea" /> :
                                                    log.agent === AgentType.DOCS ? <FileText size={16} color="#ea580c" /> :
                                                        log.agent === AgentType.EMAIL ? <Mail size={16} color="#dc2626" /> :
                                                            log.agent === AgentType.SEARCH ? <Search size={16} color="#2563eb" /> :
                                                                log.agent === AgentType.PAYMENT ? <CreditCard size={16} color="#16a34a" /> :
                                                                    log.agent === AgentType.FINANCE ? <TrendingUp size={16} color="#22c55e" /> :
                                                                        <Activity size={16} color="#64748b" />}
                                            </View>
                                            <View className="flex-1">
                                                <Text className="font-medium text-sm text-slate-800 dark:text-gray-200" numberOfLines={1}>{log.agent}</Text>
                                                <Text className="text-xs text-slate-500 dark:text-gray-400" numberOfLines={1}>{log.action}</Text>
                                            </View>
                                        </View>
                                        <View className="items-end ml-2">
                                            <View className="bg-green-100 dark:bg-green-900/30 px-2 py-1 rounded-full mb-1">
                                                <Text className="text-[10px] text-green-700 dark:text-green-400">{log.status}</Text>
                                            </View>
                                            <Text className="text-[10px] text-slate-400 dark:text-gray-500">
                                                {new Date(log.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                            </Text>
                                        </View>
                                    </View>
                                ))
                            )}
                        </View>
                    </View>
                </View>
            </ScrollView>
        </SafeAreaView>
    );
};

export default DashboardScreen;

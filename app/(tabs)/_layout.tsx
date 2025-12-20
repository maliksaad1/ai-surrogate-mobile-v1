import { Tabs } from 'expo-router';
import { MessageSquare, LayoutDashboard, Settings } from 'lucide-react-native';
import { useUser } from '../../context/UserContext';
import { View, ActivityIndicator } from 'react-native';

export default function TabLayout() {
    const { userContext, isLoading } = useUser();

    if (isLoading) {
        return (
            <View className="flex-1 items-center justify-center bg-[#EFE7DE] dark:bg-[#0b141a]">
                <ActivityIndicator size="large" color="#075E54" />
            </View>
        );
    }

    const isDark = userContext.theme === 'dark';

    return (
        <Tabs
            screenOptions={{
                headerShown: false,
                tabBarStyle: {
                    backgroundColor: isDark ? '#1f2c34' : '#ffffff',
                    borderTopColor: isDark ? '#2a3942' : '#e5e7eb',
                },
                tabBarActiveTintColor: isDark ? '#00a884' : '#075E54',
                tabBarInactiveTintColor: isDark ? '#8696a0' : '#9ca3af',
            }}
        >
            <Tabs.Screen
                name="index"
                options={{
                    title: 'Chats',
                    tabBarIcon: ({ color, size }: { color: string; size: number }) => <MessageSquare size={size} color={color} />,
                }}
            />
            <Tabs.Screen
                name="dashboard"
                options={{
                    title: 'Dashboard',
                    tabBarIcon: ({ color, size }: { color: string; size: number }) => <LayoutDashboard size={size} color={color} />,
                }}
            />
            <Tabs.Screen
                name="settings"
                options={{
                    title: 'Settings',
                    tabBarIcon: ({ color, size }: { color: string; size: number }) => <Settings size={size} color={color} />,
                }}
            />
        </Tabs>
    );
}

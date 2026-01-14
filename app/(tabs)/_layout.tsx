import { Tabs } from 'expo-router';
import { MessageSquare, LayoutDashboard, Settings } from 'lucide-react-native';
import { useUser } from '../../context/UserContext';
import { View, ActivityIndicator } from 'react-native';

export default function TabLayout() {
    const { userContext, isLoading } = useUser();

    if (isLoading) {
        return (
            <View className="flex-1 items-center justify-center" style={{ backgroundColor: userContext.theme === 'dark' ? '#050511' : '#f8fafc' }}>
                <ActivityIndicator size="large" color="#8B5CF6" />
            </View>
        );
    }

    const isDark = userContext.theme === 'dark';

    return (
        <Tabs
            screenOptions={{
                headerShown: false,
                tabBarStyle: {
                    backgroundColor: isDark ? '#050511' : '#ffffff',
                    borderTopColor: isDark ? 'rgba(255, 255, 255, 0.1)' : 'rgba(0, 0, 0, 0.1)',
                    height: 60,
                    paddingBottom: 8,
                    paddingTop: 8,
                    shadowColor: isDark ? '#000' : '#64748b',
                    shadowOffset: { width: 0, height: -2 },
                    shadowOpacity: isDark ? 0.3 : 0.1,
                    shadowRadius: 8,
                    elevation: 10,
                },
                tabBarActiveTintColor: isDark ? '#8B5CF6' : '#7c3aed',
                tabBarInactiveTintColor: isDark ? '#64748b' : '#94a3b8',
                tabBarShowLabel: true,
                tabBarLabelStyle: {
                    fontSize: 11,
                    fontWeight: '600',
                },
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

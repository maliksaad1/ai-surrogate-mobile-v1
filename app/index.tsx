import { Redirect, useRouter } from 'expo-router';
import { useUser } from '../context/UserContext';
import IntroScreen from '../components/IntroScreen';
import { View, ActivityIndicator } from 'react-native';

export default function Index() {
    const { userContext, isLoading, updateContext } = useUser();
    const router = useRouter();

    if (isLoading) {
        return (
            <View className="flex-1 items-center justify-center bg-[#EFE7DE] dark:bg-[#0b141a]">
                <ActivityIndicator size="large" color="#075E54" />
            </View>
        );
    }

    if (userContext.hasSeenIntro) {
        return <Redirect href="/(tabs)" />;
    }

    const handleComplete = () => {
        updateContext({ hasSeenIntro: true });
        router.replace('/(tabs)');
    };

    return <IntroScreen onComplete={handleComplete} />;
}

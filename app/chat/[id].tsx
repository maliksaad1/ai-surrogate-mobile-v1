import { useLocalSearchParams } from 'expo-router';
import ChatScreen from '../../components/ChatScreen';

export default function ChatRoute() {
    const { id } = useLocalSearchParams();
    return <ChatScreen sessionId={id as string} />;
}

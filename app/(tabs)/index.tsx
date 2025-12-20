import { useRouter } from 'expo-router';
import ChatListScreen from '../../components/ChatListScreen';

export default function ChatsTab() {
    const router = useRouter();
    return <ChatListScreen onSelectChat={(id) => router.push(`/chat/${id}`)} />;
}

import React from 'react';
import { View } from 'react-native';
import { useUser } from '../context/UserContext';

interface GlassCardProps {
    children: React.ReactNode;
    className?: string;
}

const GlassCard: React.FC<GlassCardProps> = ({ children, className }) => {
    const { userContext } = useUser();
    const isDark = userContext.theme === 'dark';

    return (
        <View
            className={`rounded-2xl overflow-hidden mb-4 ${className}`}
            style={{
                backgroundColor: isDark ? 'rgba(20, 20, 40, 0.7)' : 'rgba(255, 255, 255, 0.9)',
                borderWidth: 1,
                borderColor: isDark ? 'rgba(255, 255, 255, 0.1)' : 'rgba(0, 0, 0, 0.08)',
                shadowColor: isDark ? '#000' : '#64748b',
                shadowOffset: { width: 0, height: 2 },
                shadowOpacity: isDark ? 0.3 : 0.1,
                shadowRadius: 8,
                elevation: 3,
            }}
        >
            {children}
        </View>
    );
};

export default GlassCard;

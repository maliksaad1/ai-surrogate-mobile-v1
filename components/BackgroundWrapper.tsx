import React from 'react';
import { View, StyleSheet } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useUser } from '../context/UserContext';

interface BackgroundWrapperProps {
    children?: React.ReactNode;
}

const BackgroundWrapper: React.FC<BackgroundWrapperProps> = ({ children }) => {
    const { userContext } = useUser();
    const isDark = userContext.theme === 'dark';

    return (
        <View style={[styles.container, { backgroundColor: isDark ? '#050511' : '#f8fafc' }]}>
            <LinearGradient
                colors={isDark
                    ? ['#050511', '#0F1123', '#161229']  // Dark: Deep space blue to purple
                    : ['#f8fafc', '#f1f5f9', '#e2e8f0']  // Light: Soft grays
                }
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={StyleSheet.absoluteFill}
            />
            <View style={styles.content}>
                {children}
            </View>
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
    },
    content: {
        flex: 1,
    }
});

export default BackgroundWrapper;

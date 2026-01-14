/**
 * Theme Hook - Provides theme-aware colors throughout the app
 */
import { useUser } from '../context/UserContext';

export interface ThemeColors {
    // Backgrounds
    background: string;
    card: string;
    glass: string;

    // Text
    text: string;
    textSecondary: string;
    textMuted: string;

    // Borders
    border: string;
    borderLight: string;

    // Primary brand
    primary: string;
    primaryBg: string;

    // Semantic colors
    success: string;
    error: string;
    warning: string;

    // Chat specific
    userBubble: string;
    agentBubble: string;
    inputBg: string;

    // Status
    isDark: boolean;
}

export const useTheme = (): ThemeColors => {
    const { userContext } = useUser();
    const isDark = userContext.theme === 'dark';

    if (isDark) {
        return {
            // Backgrounds
            background: '#050511',
            card: '#0F1123',
            glass: 'rgba(20, 20, 40, 0.7)',

            // Text
            text: '#ffffff',
            textSecondary: '#d1d5db',
            textMuted: '#6b7280',

            // Borders
            border: 'rgba(255, 255, 255, 0.1)',
            borderLight: 'rgba(255, 255, 255, 0.05)',

            // Primary brand
            primary: '#8B5CF6',
            primaryBg: 'rgba(139, 92, 246, 0.2)',

            // Semantic colors
            success: '#10B981',
            error: '#ef4444',
            warning: '#f59e0b',

            // Chat specific
            userBubble: 'rgba(139, 92, 246, 0.2)',
            agentBubble: '#0F1123',
            inputBg: 'rgba(255, 255, 255, 0.05)',

            // Status
            isDark: true,
        };
    }

    return {
        // Backgrounds
        background: '#f8fafc',
        card: '#ffffff',
        glass: 'rgba(255, 255, 255, 0.9)',

        // Text
        text: '#0f172a',
        textSecondary: '#475569',
        textMuted: '#94a3b8',

        // Borders
        border: 'rgba(0, 0, 0, 0.1)',
        borderLight: 'rgba(0, 0, 0, 0.05)',

        // Primary brand
        primary: '#7c3aed',
        primaryBg: 'rgba(124, 58, 237, 0.1)',

        // Semantic colors
        success: '#059669',
        error: '#dc2626',
        warning: '#d97706',

        // Chat specific
        userBubble: 'rgba(124, 58, 237, 0.15)',
        agentBubble: '#ffffff',
        inputBg: 'rgba(0, 0, 0, 0.05)',

        // Status
        isDark: false,
    };
};

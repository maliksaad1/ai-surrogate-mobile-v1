import React, { createContext, useState, useEffect, useContext } from 'react';
import { UserContext as UserContextType } from '../types';
import { db } from '../services/db';

interface UserContextProps {
    userContext: UserContextType;
    setUserContext: (ctx: UserContextType) => void;
    isLoading: boolean;
    updateContext: (newCtx: Partial<UserContextType>) => void;
}

const UserContext = createContext<UserContextProps | undefined>(undefined);

export const UserProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const [userContext, setUserContextState] = useState<UserContextType>({
        name: '',
        preferredLanguage: 'en',
        hasSeenIntro: false,
        theme: 'light'
    });
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        const loadContext = async () => {
            const savedContext = await db.getUserContext();
            setUserContextState(savedContext);
            setIsLoading(false);
        };
        loadContext();
    }, []);

    const updateContext = async (newCtx: Partial<UserContextType>) => {
        const updated = { ...userContext, ...newCtx };
        setUserContextState(updated);
        await db.saveUserContext(updated);
    };

    return (
        <UserContext.Provider value={{ userContext, setUserContext: setUserContextState, isLoading, updateContext }}>
            {children}
        </UserContext.Provider>
    );
};

export const useUser = () => {
    const context = useContext(UserContext);
    if (!context) throw new Error("useUser must be used within UserProvider");
    return context;
};

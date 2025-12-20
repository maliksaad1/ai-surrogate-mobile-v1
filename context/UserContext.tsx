import { useColorScheme } from 'nativewind';

// ... (existing imports)

export const UserProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const { colorScheme, setColorScheme } = useColorScheme();
    const [userContext, setUserContextState] = useState<UserContextType>({
        name: '',
        preferredLanguage: 'en',
        hasSeenIntro: false,
        theme: 'system' // Default to system
    });
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        const loadContext = async () => {
            const savedContext = await db.getUserContext();
            setUserContextState(savedContext);
            // Sync NativeWind with saved preference
            if (savedContext.theme) {
                setColorScheme(savedContext.theme as 'light' | 'dark' | 'system');
            }
            setIsLoading(false);
        };
        loadContext();
    }, []);

    const updateContext = async (newCtx: Partial<UserContextType>) => {
        const updated = { ...userContext, ...newCtx };
        setUserContextState(updated);
        await db.saveUserContext(updated);

        // Sync NativeWind when theme changes
        if (newCtx.theme) {
            setColorScheme(newCtx.theme as 'light' | 'dark' | 'system');
        }
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

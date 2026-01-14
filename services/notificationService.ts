import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';
import { CalendarEvent } from '../types';

// Configure notification handler
Notifications.setNotificationHandler({
    handleNotification: async () => ({
        shouldShowAlert: true,
        shouldPlaySound: true,
        shouldSetBadge: true,
        shouldShowBanner: true,
        shouldShowList: true,
    }),
});

export const notificationService = {
    // Request permissions
    requestPermissions: async (): Promise<boolean> => {
        try {
            const { status: existingStatus } = await Notifications.getPermissionsAsync();
            let finalStatus = existingStatus;

            if (existingStatus !== 'granted') {
                const { status } = await Notifications.requestPermissionsAsync();
                finalStatus = status;
            }

            if (finalStatus !== 'granted') {
                console.log('Notification permissions not granted');
                return false;
            }

            if (Platform.OS === 'android') {
                await Notifications.setNotificationChannelAsync('event-reminders', {
                    name: 'Event Reminders',
                    importance: Notifications.AndroidImportance.MAX,
                    vibrationPattern: [0, 250, 250, 250],
                    lightColor: '#8B5CF6',
                });
            }

            return true;
        } catch (error) {
            console.error('Error requesting notification permissions:', error);
            return false;
        }
    },

    // Schedule notifications for an event (main event + 2 reminders)
    scheduleEventNotifications: async (event: CalendarEvent): Promise<string[]> => {
        try {
            const notificationIds: string[] = [];

            // Parse event date and time
            const eventDateTime = new Date(`${event.date}T${event.time}:00`);
            
            // Check if event is in the future
            if (eventDateTime <= new Date()) {
                console.log('Event is in the past, not scheduling notifications');
                return [];
            }

            // Calculate reminder times
            const reminder30Min = new Date(eventDateTime.getTime() - 30 * 60 * 1000);
            const reminder15Min = new Date(eventDateTime.getTime() - 15 * 60 * 1000);

            // Schedule 30-minute reminder
            if (reminder30Min > new Date()) {
                const id1 = await Notifications.scheduleNotificationAsync({
                    content: {
                        title: '🔔 Reminder: Event in 30 minutes',
                        body: `${event.title} starts at ${event.time}`,
                        data: { eventId: event.id, type: 'reminder-30' },
                        sound: true,
                    },
                    trigger: reminder30Min,
                });
                notificationIds.push(id1);
                console.log('Scheduled 30-min reminder:', id1);
            }

            // Schedule 15-minute reminder
            if (reminder15Min > new Date()) {
                const id2 = await Notifications.scheduleNotificationAsync({
                    content: {
                        title: '⚠️ Reminder: Event in 15 minutes',
                        body: `${event.title} starts soon at ${event.time}`,
                        data: { eventId: event.id, type: 'reminder-15' },
                        sound: true,
                    },
                    trigger: reminder15Min,
                });
                notificationIds.push(id2);
                console.log('Scheduled 15-min reminder:', id2);
            }

            // Schedule main event notification
            const id3 = await Notifications.scheduleNotificationAsync({
                content: {
                    title: '📅 Event Starting Now!',
                    body: `${event.title}${event.description ? ` - ${event.description}` : ''}`,
                    data: { eventId: event.id, type: 'event-start' },
                    sound: true,
                },
                trigger: eventDateTime,
            });
            notificationIds.push(id3);
            console.log('Scheduled event notification:', id3);

            return notificationIds;
        } catch (error) {
            console.error('Error scheduling notifications:', error);
            return [];
        }
    },

    // Cancel all notifications for an event
    cancelEventNotifications: async (notificationIds: string[]): Promise<void> => {
        try {
            for (const id of notificationIds) {
                await Notifications.cancelScheduledNotificationAsync(id);
            }
            console.log('Cancelled notifications:', notificationIds);
        } catch (error) {
            console.error('Error cancelling notifications:', error);
        }
    },

    // Get all scheduled notifications (for debugging)
    getAllScheduledNotifications: async () => {
        try {
            const scheduled = await Notifications.getAllScheduledNotificationsAsync();
            console.log('All scheduled notifications:', scheduled);
            return scheduled;
        } catch (error) {
            console.error('Error getting scheduled notifications:', error);
            return [];
        }
    },
};

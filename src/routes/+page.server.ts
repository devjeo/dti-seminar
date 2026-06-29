import { db } from '$lib/server/db';
import { events } from '$lib/server/db/schema';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async () => {
    // Define your hardcoded fallback event here
    const fallbackEvent = {
        id: 'fallback-1',
        eventName: "Creatives Awareness & Workshop Session for Domain Players",
        venue: "CCMS Laboratory, University of Camarines Norte, Daet, Camarines Norte",
        date: "2026-06-30"
    };

    try {
        let fetchedEvents = await db.select().from(events);

        // 1. If the database is empty, inject the fallback
        if (fetchedEvents.length === 0) {
            console.warn('⚠️ WARNING: No events in database. Using hardcoded fallback event.');
            fetchedEvents = [fallbackEvent as any];
        }

        // 2. Helper to get YYYY-MM-DD strictly in Manila time
        const getManilaDateString = (dateObj) => {
            return new Intl.DateTimeFormat('en-CA', {
                timeZone: 'Asia/Manila',
                year: 'numeric',
                month: '2-digit',
                day: '2-digit'
            }).format(dateObj);
        };

        const todayStr = getManilaDateString(new Date());

        let ongoingEvent = null;
        let upcomingEvent = null;
        let pastEvent = null;

        // 3. Sort events chronologically (oldest to newest)
        const sortedEvents = fetchedEvents.sort((a, b) => {
            // FIXED: Changed from a.date to a.eventDate to match schema
            return new Date(a.eventDate).getTime() - new Date(b.eventDate).getTime();
        });

        // 4. Categorize the events
        for (const ev of sortedEvents) {
            // FIXED: Changed from ev.date to ev.eventDate
            if (!ev.eventDate) continue;

            // Format the event date to a Manila YYYY-MM-DD string
            const evStr = getManilaDateString(new Date(ev.eventDate));

            // Safely compare the strings
            if (evStr === todayStr) {
                ongoingEvent = ev;
            } else if (evStr > todayStr) {
                if (!upcomingEvent) upcomingEvent = ev;
            } else {
                pastEvent = ev;
            }
        }

        // 5. Return the highest priority state
        if (ongoingEvent) {
            return { event: ongoingEvent, eventState: 'ongoing' };
        } else if (upcomingEvent) {
            return { event: upcomingEvent, eventState: 'upcoming' };
        } else if (pastEvent) {
            return { event: pastEvent, eventState: 'past' };
        }

        // Fallback if dates somehow fail entirely
        return { event: null, eventState: 'none' };
    } catch (error) {
        console.error('Database connection failed:', error);

        // 6. If the database totally crashes, STILL serve the fallback event!
        console.warn('⚠️ Serving fallback event due to database error.');

        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const fallbackDate = new Date(fallbackEvent.date);
        fallbackDate.setHours(0, 0, 0, 0);

        const timeDiff = fallbackDate.getTime() - today.getTime();
        let state = 'past';
        if (timeDiff === 0) state = 'ongoing';
        else if (timeDiff > 0) state = 'upcoming';

        return { event: fallbackEvent, eventState: state };
    }
};

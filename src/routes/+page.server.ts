import { db } from '$lib/server/db';
import { events } from '$lib/server/db/schema';
import { desc } from 'drizzle-orm';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async () => {
	try {
		const fetchedEvents = await db.select().from(events).orderBy(desc(events.eventName));
		if (!fetchedEvents) {
			return {
				event: {
					eventName: "Creatives Awareness & Workshop Session",
					venue: "CCMS Laboratory, University of Camarines Norte"
				}
			};
		}
		return {
			events: fetchedEvents
		};
	} catch (error) {
		console.error('Error fetching events:', error);
		return {
			events: []
		};
	}
};

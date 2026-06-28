import { db } from '$lib/server/db';
import { events } from '$lib/server/db/schema';
import { desc } from 'drizzle-orm';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async () => {
	try {
		const fetchedEvents = await db.select().from(events).orderBy(desc(events.eventName));
		if (fetchedEvents.length === 0) {
			console.error('No events found in the database.');
			return {
				event: {
					eventName: "Creatives Awareness & Workshop Session for Domain Players",
					venue: "CCMS Laboratory, University of Camarines Norte, Daet, Camarines Norte"
				}
			};
		}
		console.log('Fetched events:', fetchedEvents);
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

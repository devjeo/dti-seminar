import { json } from '@sveltejs/kit';
import type { RequestEvent } from '@sveltejs/kit';
import { db } from '$lib/server/db';
import { events } from '$lib/server/db/schema';
import { eq, asc } from 'drizzle-orm';

// GET: Fetch all events
export const GET = async (): Promise<Response> => {
	try {
        // Fetch events and sort them chronologically (oldest to newest)
		const records = await db
			.select()
			.from(events)
			.orderBy(asc(events.eventDate));

		return json(records);
	} catch (e: any) {
		console.error('Failed to fetch events:', e);
		return json({ error: 'Failed to fetch events' }, { status: 500 });
	}
};

// POST: Create a new event
export const POST = async ({ request }: RequestEvent): Promise<Response> => {
	try {
		const body = await request.json();
		const { eventName, eventDate, venue, description } = body;

		// Basic validation to ensure the database doesn't crash on nulls
		if (!eventName) {
			return json({ message: 'Event Name is required' }, { status: 400 });
		}

		await db.insert(events).values({
			eventName,
			eventDate,
			venue,
			description
		});

		return json({ message: 'Event created successfully' }, { status: 201 });
	} catch (e: any) {
		console.error('Failed to create event:', e);
		return json({ message: 'Failed to create event.' }, { status: 500 });
	}
};

// DELETE: Remove an event by ID
export const DELETE = async ({ request }: RequestEvent): Promise<Response> => {
	try {
		const { id } = await request.json();
        
		if (!id) {
            return json({ message: 'Event ID is required' }, { status: 400 });
        }

		await db.delete(events).where(eq(events.id, id));
        
		return json({ success: true });
	} catch (e) {
		console.error('Failed to delete event:', e);
		return json({ message: 'Failed to delete event' }, { status: 500 });
	}
};

// PUT: Update an existing event
export const PUT = async ({ request }: RequestEvent): Promise<Response> => {
	try {
		const body = await request.json();
		const { id, eventName, eventDate, venue, description } = body;

		if (!id) {
			return json({ message: 'Event ID is required for updating' }, { status: 400 });
		}
		if (!eventName) {
			return json({ message: 'Event Name is required' }, { status: 400 });
		}

		await db.update(events).set({
			eventName,
			eventDate,
			venue,
			description
		}).where(eq(events.id, id));

		return json({ message: 'Event updated successfully' }, { status: 200 });
	} catch (e: any) {
		console.error('Failed to update event:', e);
		return json({ message: 'Failed to update event.' }, { status: 500 });
	}
};
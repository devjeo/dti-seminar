import { json } from '@sveltejs/kit';
import type { RequestEvent } from '@sveltejs/kit';
import { db } from '$lib/server/db';
import { guest } from '$lib/server/db/schema';
import { like, or, eq } from 'drizzle-orm';

export const GET = async ({ url }) => {
	try {
		const searchQuery = url.searchParams.get('q');
		const fetchAll = url.searchParams.get('all') === 'true';
		
		// THE ADMIN BYPASS: If the URL has ?all=true, return everyone
		if (fetchAll) {
			const allGuests = await db.select().from(guest);
			return json(allGuests);
		}
		
		// THE PUBLIC ATTENDANCE GATE: If there is no search query, return nothing
		if (!searchQuery) {
			return json([]);
		}
		
		// THE SEARCH ENGINE
		const searchPattern = `%${searchQuery}%`;
		const results = await db
		.select()
		.from(guest)
		.where(
			or(
				like(guest.firstName, searchPattern),
				like(guest.lastName, searchPattern),
				like(guest.guestId, searchPattern)
			)
		)
		.limit(5);

		return json(results);
	} catch (error) {
		console.error("Guest search error:", error);
		return json({ error: 'Failed to search/fetch guests' }, { status: 500 });
	}
};

export const POST = async ({ request }: RequestEvent): Promise<Response> => {
	try {
		const body = await request.json();
		
		// Only extract the fields that still exist in your updated schema
		const {
			firstName,
			lastName,
			company,
			email
		} = body;

		if (!firstName || !lastName) {
			return json({ error: 'First and Last name are required.' }, { status: 400 });
		}

		// Generate a unique ID for the guest
		const guestId = crypto.randomUUID();

		const [result] = await db.insert(guest).values({
			guestId,
			firstName: firstName.trim(),
			lastName: lastName.trim(),
			company: company ? company.trim() : null,
			email: email ? email.trim() : null
		});

		// Return the new guest in the structure expected by the frontend
		const newGuest = {
			id: result.insertId,
			guestId,
			firstName,
			lastName,
			company,
			email
		};

		// Returning an object with "success: true" safely supports the Walk-In flow
		return json({
			success: true,
			guest: newGuest
		});
	} catch (e: any) {
		console.error(e);
		return json({ error: 'Failed to add guest: ' + e.message }, { status: 500 });
	}
};

export const DELETE = async ({ request }: RequestEvent): Promise<Response> => {
	try {
		const { id } = await request.json();
		if (!id) return json({ message: 'ID required' }, { status: 400 });

		await db.delete(guest).where(eq(guest.id, id));
		return json({ success: true });
	} catch (e) {
		console.error(e);
		return json({ message: 'Failed to delete guest' }, { status: 500 });
	}
};
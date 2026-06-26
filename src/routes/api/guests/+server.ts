import { json } from '@sveltejs/kit';
import type { RequestEvent } from '@sveltejs/kit';
import { db } from '$lib/server/db';
import { guest } from '$lib/server/db/schema';
import { eq } from 'drizzle-orm';

export const GET = async (): Promise<Response> => {
	try {
		const guests = await db.select().from(guest);
		return json(guests);
	} catch (e: any) {
		console.error(e);
		return json({ error: 'Failed to fetch guests' }, { status: 500 });
	}
};

export const POST = async ({ request }: RequestEvent): Promise<Response> => {
	try {
		const {
			title,
			firstName,
			middleName,
			lastName,
			suffix,
			sex,
			age,
			employmentStatus,
			socialClassification,
			company,
			address,
			email
		} = await request.json();

		const guestId = crypto.randomUUID();
		// Ensure types are correct for DB
		const ageInt = parseInt(age);
		// If socialClassification is array, stringify it, else just string
		const scValue = Array.isArray(socialClassification)
			? JSON.stringify(socialClassification)
			: String(socialClassification || '');

		const [result] = await db.insert(guest).values({
			guestId,
			title,
			firstName,
			middleName,
			lastName,
			suffix,
			sex,
			age: isNaN(ageInt) ? null : ageInt,
			employmentStatus,
			socialClassification: scValue,
			company,
			address,
			email
		});

		// Return the new guest so the frontend can add it to the list
		// We return the raw input values (or close to it) to match what frontend expects
		const newGuest = {
			id: result.insertId,
			guestId,
			title,
			firstName,
			middleName,
			lastName,
			suffix,
			sex,
			age: isNaN(ageInt) ? null : ageInt,
			employmentStatus,
			socialClassification: Array.isArray(socialClassification) ? socialClassification : [], // Return as array for frontend consistency if they expect it
			company,
			address,
			email
		};

		return json(newGuest);
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

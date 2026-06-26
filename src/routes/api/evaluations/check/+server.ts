import { json } from '@sveltejs/kit';
import type { RequestEvent } from '@sveltejs/kit';
import { db } from '$lib/server/db';
import { evaluation, settings, guest } from '$lib/server/db/schema';
import { eq, inArray } from 'drizzle-orm';

export const GET = async ({ url }: RequestEvent): Promise<Response> => {
	try {
		const guestId = url.searchParams.get('guestId');
		if (!guestId) {
			return json({ submitted: false }, { status: 400 });
		}

		// Verify guest exists
		const [validGuest] = await db.select().from(guest).where(eq(guest.guestId, guestId)).limit(1);
		if (!validGuest) {
			return json(
				{ submitted: false, isOpen: false, message: 'Guest ID not found.' },
				{ status: 404 }
			);
		}

		const [existing] = await db
			.select()
			.from(evaluation)
			.where(eq(evaluation.guestId, guestId))
			.limit(1);

		// Fetch settings
		const settingRecords = await db
			.select()
			.from(settings)
			.where(inArray(settings.key, ['evaluation_open_time', 'evaluation_close_time']));
		const settingsMap: Record<string, string> = {};
		settingRecords.forEach((s) => (settingsMap[s.key] = s.value || ''));

		let isOpen = true;
		let message = '';
		let openTime = settingsMap['evaluation_open_time'];
		let closeTime = settingsMap['evaluation_close_time'];
		const now = new Date();

		if (openTime) {
			const start = new Date(openTime);
			if (!isNaN(start.getTime()) && now < start) {
				isOpen = false;
				message = `The evaluation will open at ${start.toLocaleString()}.`;
			}
		}

		if (closeTime) {
			const end = new Date(closeTime);
			if (!isNaN(end.getTime()) && now > end) {
				isOpen = false;
				message = `The evaluation closed at ${end.toLocaleString()}.`;
			}
		}

		return json({
			submitted: !!existing,
			isOpen,
			message,
			openTime,
			closeTime
		});
	} catch (e: any) {
		console.error(e);
		return json({ error: 'Failed to verify submission' }, { status: 500 });
	}
};

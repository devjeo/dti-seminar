import { json } from '@sveltejs/kit';
import type { RequestEvent } from '@sveltejs/kit';
import { db } from '$lib/server/db';
import { evaluation, settings, guest } from '$lib/server/db/schema';
import { eq, inArray } from 'drizzle-orm';

export const POST = async ({ request }: RequestEvent): Promise<Response> => {
	try {
		const body = await request.json();
		
		// Extract the NEW fields we created in the front-end redesign
		const {
			guestId,
			participantName,
			trainingTitle,
			venue,
			date,
			speakerEvaluations, // Dynamic array of speaker tabs
			generalRatings,     // Part II ratings
			q1,
			q2,
			q3,
			signatureName
		} = body;

		// 1. Check if evaluation is open/closed
		const settingRecords = await db
			.select()
			.from(settings)
			.where(inArray(settings.key, ['evaluation_open_time', 'evaluation_close_time']));
		const settingsMap: Record<string, string> = {};
		settingRecords.forEach((s) => (settingsMap[s.key] = s.value || ''));

		const now = new Date();

		if (settingsMap['evaluation_open_time']) {
			const startTime = new Date(settingsMap['evaluation_open_time']);
			if (!isNaN(startTime.getTime()) && now < startTime) {
				return json({ error: 'Evaluation form is not yet accessible.' }, { status: 403 });
			}
		}

		if (settingsMap['evaluation_close_time']) {
			const endTime = new Date(settingsMap['evaluation_close_time']);
			if (!isNaN(endTime.getTime()) && now > endTime) {
				return json({ error: 'Evaluation form is closed.' }, { status: 403 });
			}
		}

		// Verify guest exists
		if (guestId) {
			const [validGuest] = await db.select().from(guest).where(eq(guest.guestId, guestId)).limit(1);
			if (!validGuest) {
				return json({ error: 'Guest ID not found.' }, { status: 404 });
			}

			// 2. Check duplicate submission
			const [existing] = await db
				.select()
				.from(evaluation)
				.where(eq(evaluation.guestId, guestId))
				.limit(1);
			if (existing) {
				return json({ error: 'You have already submitted an evaluation.' }, { status: 409 });
			}
		}

		// COMBINE ALL RATINGS INTO ONE MASTER JSON OBJECT
		const masterRatingsPayload = {
			speakers: speakerEvaluations || [], // Holds an array of { speakerId, speakerName, ratings }
			general: generalRatings || {}       // Holds { op_ven: '5', op_equ: '4', etc. }
		};

		const ratingsJson = JSON.stringify(masterRatingsPayload);

		// Store evaluation directly
		await db.insert(evaluation).values({
			guestId: guestId || null,
			participantName: participantName || null,
			trainingTitle: trainingTitle || null,
			venue: venue || null,
			submittedAt: new Date(),
			// We pass null to the old columns to eventually phase them out
			resourceSpeaker1: null, 
			resourceSpeaker2: null,
			ratings: ratingsJson, // Save the master JSON here
			q1: q1 || null,
			q2: q2 || null,
			q3: q3 || null,
			signatureName: signatureName || null,
		});

		return json({ success: true });
	} catch (e: any) {
		console.error(e);
		return json({ error: 'Failed to submit evaluation' }, { status: 500 });
	}
};

export const GET = async (): Promise<Response> => {
	try {
		const records = await db.select().from(evaluation);
		return json(records);
	} catch (e: any) {
		return json({ error: 'Failed to fetch evaluations' }, { status: 500 });
	}
};

export const DELETE = async ({ request }: RequestEvent): Promise<Response> => {
	try {
		const { id } = await request.json();
		if (!id) return json({ message: 'ID required' }, { status: 400 });

		await db.delete(evaluation).where(eq(evaluation.id, id));
		return json({ success: true });
	} catch (e) {
		console.error(e);
		return json({ message: 'Failed to delete evaluation' }, { status: 500 });
	}
};
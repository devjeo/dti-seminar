import { json } from '@sveltejs/kit';
import { db } from '$lib/server/db';
import { settings } from '$lib/server/db/schema';
import { inArray } from 'drizzle-orm';

export const GET = async (): Promise<Response> => {
	try {
		// Fetch only the specific evaluation settings
		const settingRecords = await db
			.select()
			.from(settings)
			.where(inArray(settings.key, ['evaluation_open_time', 'evaluation_close_time']));
		
		const settingsMap: Record<string, string> = {};
		settingRecords.forEach((s) => (settingsMap[s.key] = s.value || ''));

		let isOpen = true;
		let statusMessage = 'Evaluation is open.';
		let openTime = settingsMap['evaluation_open_time'] || null;
		let closeTime = settingsMap['evaluation_close_time'] || null;
		
		const now = new Date();

		if (openTime) {
			const start = new Date(openTime);
			if (!isNaN(start.getTime()) && now < start) {
				isOpen = false;
				statusMessage = `The evaluation will open at ${start.toLocaleString()}.`;
			}
		}

		if (closeTime) {
			const end = new Date(closeTime);
			if (!isNaN(end.getTime()) && now > end) {
				isOpen = false;
				statusMessage = `The evaluation closed at ${end.toLocaleString()}.`;
			}
		}

		return json({
			isOpen,
			message: statusMessage,
			openTime,
			closeTime
		});
	} catch (e: any) {
		console.error("Evaluation status error:", e);
		return json({ error: 'Failed to fetch evaluation status' }, { status: 500 });
	}
};
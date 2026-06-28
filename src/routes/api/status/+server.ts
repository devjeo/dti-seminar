import { json } from '@sveltejs/kit';
import { db } from '$lib/server/db';
import { settings } from '$lib/server/db/schema';
import { inArray } from 'drizzle-orm';

export const GET = async (): Promise<Response> => {
	try {
		const settingRecords = await db
			.select()
			.from(settings)
			.where(inArray(settings.key, [
				'attendance_open_time', 
				'attendance_close_time', 
				'evaluation_open_time', 
				'evaluation_close_time'
			]));
		
		const settingsMap: Record<string, string> = {};
		settingRecords.forEach((s) => (settingsMap[s.key] = s.value || ''));

		const now = new Date();

		// --- 1. ATTENDANCE LOGIC ---
		let attStatus = 'open';
		let attMessage = "Scan in to confirm your presence at today's seminar.";
		const attOpen = settingsMap['attendance_open_time'] ? new Date(settingsMap['attendance_open_time']) : null;
		const attClose = settingsMap['attendance_close_time'] ? new Date(settingsMap['attendance_close_time']) : null;

		if (attOpen && !isNaN(attOpen.getTime()) && now < attOpen) {
			attStatus = 'not_started';
			attMessage = `Attendance will open at ${attOpen.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })}`;
		} else if (attClose && !isNaN(attClose.getTime()) && now > attClose) {
			attStatus = 'closed';
			attMessage = `Attendance closed at ${attClose.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })}`;
		}

		// --- 2. EVALUATION LOGIC ---
		let evalIsOpen = true;
		let evalMessage = 'Share your feedback and complete the seminar.';
		const evalOpen = settingsMap['evaluation_open_time'] ? new Date(settingsMap['evaluation_open_time']) : null;
		const evalClose = settingsMap['evaluation_close_time'] ? new Date(settingsMap['evaluation_close_time']) : null;

		if (evalOpen && !isNaN(evalOpen.getTime()) && now < evalOpen) {
			evalIsOpen = false;
			evalMessage = `The evaluation will open at ${evalOpen.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })}`;
		} else if (evalClose && !isNaN(evalClose.getTime()) && now > evalClose) {
			evalIsOpen = false;
			evalMessage = `The evaluation closed at ${evalClose.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })}`;
		}

		// Return both states in one clean package
		return json({
			attendance: {
				status: attStatus,
				message: attMessage
			},
			evaluation: {
				isOpen: evalIsOpen,
				message: evalMessage
			}
		});

	} catch (error) {
		console.error("Failed to fetch system status:", error);
		return json({ error: 'Failed to fetch status' }, { status: 500 });
	}
};
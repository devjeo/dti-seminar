import { json } from '@sveltejs/kit';
import type { RequestEvent } from '@sveltejs/kit';
import { db } from '$lib/server/db';
import { attendance, guest, settings } from '$lib/server/db/schema';
import { eq, desc, inArray } from 'drizzle-orm';

export const GET = async (): Promise<Response> => {
	try {
		const records = await db
			.select({
				id: attendance.id,
				guestId: attendance.guestId,
				timeIn: attendance.timeIn,
				createdAt: attendance.createdAt,
				firstName: guest.firstName,
				lastName: guest.lastName,
				company: guest.company,
				email: guest.email
			})
			.from(attendance)
			.leftJoin(guest, eq(attendance.guestId, guest.guestId))
			.orderBy(desc(attendance.timeIn));

		return json(records);
	} catch (e: any) {
		console.error(e);
		return json({ error: 'Failed to fetch attendance' }, { status: 500 });
	}
};

export const POST = async ({ request }: RequestEvent): Promise<Response> => {
	try {
		const { guestId, deviceKey } = await request.json();

		if (!guestId) {
			return json({ message: 'Missing Guest ID' }, { status: 400 });
		}

		// 1. Check if attendance is open/closed
		const settingRecords = await db
			.select()
			.from(settings)
			.where(inArray(settings.key, ['attendance_open_time', 'attendance_close_time']));
		const settingsMap: Record<string, string> = {};
		settingRecords.forEach((s) => (settingsMap[s.key] = s.value || ''));

		const now = new Date();

		if (settingsMap['attendance_open_time']) {
			const startTime = new Date(settingsMap['attendance_open_time']);
			if (!isNaN(startTime.getTime()) && now < startTime) {
				return json({ message: 'Attendance is not yet open.' }, { status: 403 });
			}
		}

		if (settingsMap['attendance_close_time']) {
			const endTime = new Date(settingsMap['attendance_close_time']);
			if (!isNaN(endTime.getTime()) && now > endTime) {
				return json({ message: 'Attendance is closed.' }, { status: 403 });
			}
		}

		// Verify guest exists
		const [existingGuest] = await db
			.select()
			.from(guest)
			.where(eq(guest.guestId, guestId))
			.limit(1);

		if (!existingGuest) {
			return json({ message: 'Guest ID not found.' }, { status: 404 });
		}

		// Device Lock Check
		if (existingGuest.deviceId) {
			if (existingGuest.deviceId !== deviceKey) {
				return json({ message: 'This Guest ID is locked to another device.' }, { status: 403 });
			}
		} else if (deviceKey) {
			// First time, lock the device
			await db.update(guest).set({ deviceId: deviceKey }).where(eq(guest.guestId, guestId));
		}

		// Check for existing attendance
		const [existingAttendance] = await db
			.select()
			.from(attendance)
			.where(eq(attendance.guestId, guestId))
			.limit(1);

		if (existingAttendance) {
			// Already recorded, return success but don't duplicate
			return json({ message: 'Attendance already recorded.' });
		}

		await db.insert(attendance).values({
			guestId,
			timeIn: new Date()
		});

		return json({ message: 'Attendance recorded successfully.' });
	} catch (e: any) {
		console.error(e);
		return json({ message: 'Failed to record attendance.' }, { status: 500 });
	}
};

export const DELETE = async ({ request }: RequestEvent): Promise<Response> => {
	try {
		const { id } = await request.json();
		if (!id) return json({ message: 'ID required' }, { status: 400 });

		await db.delete(attendance).where(eq(attendance.id, id));
		return json({ success: true });
	} catch (e) {
		console.error(e);
		return json({ message: 'Failed to delete attendance' }, { status: 500 });
	}
};

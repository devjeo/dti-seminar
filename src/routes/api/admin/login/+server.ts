import { json } from '@sveltejs/kit';
import { db } from '$lib/server/db';
import { admin } from '$lib/server/db/schema';
import { eq } from 'drizzle-orm';
import type { RequestEvent } from '@sveltejs/kit';
import bcrypt from 'bcryptjs';

export const POST = async ({ request }: RequestEvent): Promise<Response> => {
	try {
		const { username, password } = await request.json();

		if (!username || !password) {
			return json({ message: 'Missing credentials' }, { status: 400 });
		}

		let [adminUser] = await db.select().from(admin).where(eq(admin.username, username)).limit(1);

		// If no admin exists at all in the database, create the default one immediately for first login
		if (!adminUser) {
			const existingAdmins = await db.select().from(admin).limit(1);
			if (existingAdmins.length === 0 && username === 'admin' && password === 'admin1234') {
				const hashedPassword = await bcrypt.hash('admin1234', 10);
				await db.insert(admin).values({
					username: 'admin',
					password: hashedPassword
				});
				// Re-fetch the newly created user
				[adminUser] = await db.select().from(admin).where(eq(admin.username, 'admin')).limit(1);
			} else {
				return json({ message: 'Invalid credentials' }, { status: 401 });
			}
		}

		const valid = await bcrypt.compare(password, adminUser.password);
		if (!valid) {
			return json({ message: 'Invalid credentials' }, { status: 401 });
		}

		return json({ success: true });
	} catch (e: any) {
		console.error(e);
		return json({ message: 'Server error' }, { status: 500 });
	}
};

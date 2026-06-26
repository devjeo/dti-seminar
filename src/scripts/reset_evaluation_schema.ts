import { drizzle } from 'drizzle-orm/mysql2';
import mysql from 'mysql2/promise';
import { sql } from 'drizzle-orm';
import * as dotenv from 'dotenv';
dotenv.config();

async function main() {
	if (!process.env.DATABASE_URL) {
		console.error('DATABASE_URL not found');
		process.exit(1);
	}
	const pool = mysql.createPool(process.env.DATABASE_URL);
	const db = drizzle(pool);

	try {
		console.log('Dropping evaluation table...');
		await db.execute(sql`DROP TABLE IF EXISTS evaluation`);
		console.log('Table dropped successfully.');
		process.exit(0);
	} catch (error) {
		console.error('Error dropping table:', error);
		process.exit(1);
	}
}

main();

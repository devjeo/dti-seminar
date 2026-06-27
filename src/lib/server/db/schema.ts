import { mysqlTable, serial, int, text, varchar, timestamp, boolean } from 'drizzle-orm/mysql-core';

export const guest = mysqlTable('guest', {
	id: serial('id').primaryKey(),
	guestId: varchar('guest_id', { length: 50 }).unique().notNull(), // UUID or Email or custom ID

	// Core Identification
	firstName: varchar('first_name', { length: 100 }),
	lastName: varchar('last_name', { length: 100 }),

	// Organizational Details
	company: varchar('company', { length: 255 }),
	email: varchar('email', { length: 255 }),

	// System Details
	deviceId: varchar('device_id', { length: 255 }),
	createdAt: timestamp('created_at').defaultNow()
});

export const attendance = mysqlTable('attendance', {
	id: serial('id').primaryKey(),
	guestId: varchar('guest_id', { length: 50 }).notNull(),
	timeIn: timestamp('time_in').defaultNow(),
	createdAt: timestamp('created_at').defaultNow()
});

export const evaluation = mysqlTable('evaluation', {
	id: serial('id').primaryKey(),
	guestId: varchar('guest_id', { length: 50 }),

	// Form Header Details
	participantName: varchar('participant_name', { length: 255 }),
	trainingTitle: varchar('training_title', { length: 255 }),
	venue: varchar('venue', { length: 255 }),
	date: varchar('date', { length: 50 }), // keeping as string for simplicity or validation

	// Ratings (Stored as JSON for flexibility, or we could map every single question)
	// Example: {"rs1_obj": "5", "rs1_rel": "4", ...}
	ratings: text('ratings'),

	// Open-ended questions
	q1: text('q1'), // Most interesting thing
	q2: text('q2'), // More effective
	q3: text('q3'), // Suggestions

	// Confirmation
	signatureName: varchar('signature_name', { length: 255 }),

	createdAt: timestamp('created_at').defaultNow()
});

export const admin = mysqlTable('admin', {
	id: serial('id').primaryKey(),
	username: varchar('username', { length: 50 }).unique().notNull(),
	password: varchar('password', { length: 255 }).notNull(),
	createdAt: timestamp('created_at').defaultNow()
});

export const events = mysqlTable('events', {
	id: serial('id').primaryKey(),
	eventName: varchar('event_name', { length: 255 }).notNull(),
	eventDate: varchar('event_date', { length: 50 }), // keeping as string for simplicity
	venue: varchar('venue', { length: 255 }),
	description: text('description'),
	createdAt: timestamp('created_at').defaultNow(),
	updatedAt: timestamp('updated_at').defaultNow().onUpdateNow()
});

export const settings = mysqlTable('settings', {
	key: varchar('key', { length: 50 }).primaryKey(),
	value: text('value')
});

export * from './auth.schema';

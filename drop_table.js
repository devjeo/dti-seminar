import mysql from 'mysql2/promise';

const url = process.env.DATABASE_URL || 'mysql://root:password@192.168.0.5:3306/dti-seminar';

async function main() {
	try {
		console.log('Connecting to', url);
		const connection = await mysql.createConnection(url);
		console.log('Connected.');
		await connection.execute('DROP TABLE IF EXISTS evaluation');
		console.log('Dropped evaluation table.');

		const createSql = `
            CREATE TABLE evaluation (
                id bigint unsigned AUTO_INCREMENT NOT NULL,
                guest_id varchar(50),
                participant_name varchar(255),
                training_title varchar(255),
                venue varchar(255),
                date varchar(50),
                resource_speaker1 varchar(255),
                resource_speaker2 varchar(255),
                ratings text,
                q1 text,
                q2 text,
                q3 text,
                signature_name varchar(255),
                created_at timestamp DEFAULT (now()),
                CONSTRAINT evaluation_id PRIMARY KEY(id)
            );
        `;

		await connection.execute(createSql);
		console.log('Created evaluation table with new schema.');

		await connection.end();
	} catch (e) {
		console.error(e);
		process.exit(1);
	}
}

main();

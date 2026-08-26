import { drizzle } from 'drizzle-orm/mysql2';
import mysql from 'mysql2/promise';

const connection = await mysql.createConnection(process.env.DATABASE_URL);
const db = drizzle(connection);

const [rows] = await connection.execute('SELECT id, name FROM programs ORDER BY id');
console.log(JSON.stringify(rows, null, 2));

await connection.end();

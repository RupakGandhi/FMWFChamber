import { drizzle } from 'drizzle-orm/mysql2';
import mysql from 'mysql2/promise';
import { programs } from './drizzle/schema.ts';

const conn = await mysql.createConnection(process.env.DATABASE_URL);
const db = drizzle(conn);
const result = await db.select({ id: programs.id, name: programs.name, slug: programs.slug, status: programs.status }).from(programs);
console.log(JSON.stringify(result, null, 2));
await conn.end();

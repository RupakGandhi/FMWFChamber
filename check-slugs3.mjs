import { db } from './server/db.ts';
import { programs } from './drizzle/schema.ts';

async function main() {
  const all = await db.select({ id: programs.id, name: programs.name, slug: programs.slug, status: programs.status }).from(programs);
  console.log(JSON.stringify(all, null, 2));
  process.exit(0);
}
main();

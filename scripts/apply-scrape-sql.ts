import { readFileSync, readdirSync } from 'fs';
import { join } from 'path';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  const dir = join(process.cwd(), 'tmp-sql-chunks');
  const files = readdirSync(dir)
    .filter((f) => f.endsWith('.sql'))
    .sort();

  for (const file of files) {
    const sql = readFileSync(join(dir, file), 'utf8');
    process.stdout.write(`[sql] ${file}… `);
    try {
      await prisma.$executeRawUnsafe(sql);
      console.log('ok');
    } catch (err) {
      console.log('FAIL');
      console.error(err instanceof Error ? err.message : err);
      process.exitCode = 1;
      break;
    }
  }
}

main()
  .catch((e) => {
    console.error(e);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

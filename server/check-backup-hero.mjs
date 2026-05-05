import Database from 'better-sqlite3';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const db = new Database(join(__dirname, 'app.db.backup'));

try {
  const row = db.prepare("SELECT content FROM site_content WHERE section_key = 'hero'").get();
  console.log('--- BACKUP HERO CONTENT ---');
  if (row) {
    console.log(JSON.stringify(JSON.parse(row.content), null, 2));
  } else {
    console.log('Hero section not found in backup site_content table.');
  }
} catch (e) {
  console.error('Error:', e.message);
} finally {
  db.close();
}

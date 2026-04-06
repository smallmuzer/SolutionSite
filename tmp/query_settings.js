import Database from "better-sqlite3";
import { join, dirname } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const DB_PATH = join(__dirname, "../server/app.db");

const db = new Database(DB_PATH);
const row = db.prepare("SELECT content FROM site_content WHERE section_key = 'settings'").get();
if (row && row.content) {
  console.log(row.content);
} else {
  console.log("Settings not found");
}
db.close();

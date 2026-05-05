import Database from 'better-sqlite3';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const db = new Database(join(__dirname, 'app.db'));

const heroImages = [
  "/assets/uploads/modern_hero_glass_1775323942548.webp",
  "/assets/uploads/Land1_1775317246197.jpg",
  "/assets/uploads/Land2_1775317246223.png",
  "/assets/uploads/Land3.png",
  "/assets/uploads/hero_3d_glassy.png",
  "/assets/uploads/hero_3d_glassy1.png",
  "/assets/uploads/white_designer_1775410426535.png",
  "/assets/uploads/white_dev_1775409804566.png",
  "/assets/uploads/white_business_1775409832581.png"
].join(",");

const primaryHeroImage = "/assets/uploads/modern_hero_glass_1775323942548.webp";

try {
  const row = db.prepare("SELECT content FROM site_content WHERE section_key = 'hero'").get();
  if (row) {
    let content = JSON.parse(row.content);
    content.hero_images = heroImages;
    content.hero_image = primaryHeroImage;
    
    db.prepare("UPDATE site_content SET content = ?, updated_at = ? WHERE section_key = 'hero'")
      .run(JSON.stringify(content), new Date().toISOString());
    console.log('✅ Reverted Hero images to original set including White Land images.');
  } else {
    console.log('Hero section not found.');
  }
} catch (e) {
  console.error('Error:', e.message);
} finally {
  db.close();
}

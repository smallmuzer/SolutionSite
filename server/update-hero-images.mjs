/**
 * update-hero-images.mjs
 * Updates the hero site_content row in app.db to use the new
 * uploads-folder multi-image list for the slider.
 */
import Database from 'better-sqlite3';
const db = new Database('./app.db');

// The 5 confirmed hero slide images in uploads/
const heroImages = [
  "/assets/uploads/modern_hero_glass_1775323942548.webp",
  "/assets/uploads/Land1_1775317246197.jpg",
  "/assets/uploads/Land2_1775317246223.png",
  "/assets/uploads/hero_3d_glassy.png",
  "/assets/uploads/hero_3d_glassy1.png",
].join(",");

const primaryHeroImage = "/assets/uploads/modern_hero_glass_1775323942548.webp";

// Get existing content
const existingRow = db.prepare("SELECT id, content FROM site_content WHERE section_key = 'hero'").get();

if (existingRow) {
  let content = {};
  try { content = JSON.parse(existingRow.content); } catch { /* ignore */ }
  
  // Update image fields
  content.hero_image  = primaryHeroImage;
  content.hero_images = heroImages;
  
  db.prepare("UPDATE site_content SET content = ? WHERE section_key = 'hero'")
    .run(JSON.stringify(content));
  console.log('✅ Updated existing hero row.');
} else {
  // Insert new row
  const newContent = {
    title: "Leading IT Solutions Company in Maldives",
    subtitle: "Transform your business with cutting-edge technology solutions.",
    cta_text: "Get Started",
    hero_image: primaryHeroImage,
    hero_images: heroImages,
  };
  db.prepare("INSERT INTO site_content (section_key, content) VALUES ('hero', ?)")
    .run(JSON.stringify(newContent));
  console.log('✅ Inserted new hero row.');
}

// Verify
const verify = db.prepare("SELECT content FROM site_content WHERE section_key = 'hero'").get();
const parsed = JSON.parse(verify.content);
console.log('\n🔍 Verification:');
console.log('  hero_image :', parsed.hero_image);
console.log('  hero_images:', parsed.hero_images?.split(',').length, 'images');
console.log('  images     :', parsed.hero_images?.split(',').map(s => '  - ' + s.trim()).join('\n'));

db.close();

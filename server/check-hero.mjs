import Database from 'better-sqlite3';
const db = new Database('./app.db');

// Check hero content
const heroRow = db.prepare("SELECT section_key, content FROM site_content WHERE section_key = 'hero'").all();
console.log('=== HERO CONTENT ===');
if (heroRow.length > 0) {
  try {
    const parsed = heroRow[0].content;
    console.log('Raw content type:', typeof parsed);
    const content = typeof parsed === 'string' ? JSON.parse(parsed) : parsed;
    console.log('hero_image:', content.hero_image);
    console.log('hero_images:', content.hero_images);
    console.log('images:', content.images);
    console.log('\nAll keys:', Object.keys(content));
  } catch(e) {
    console.log('Raw:', heroRow[0].content);
  }
} else {
  console.log('No hero row found in site_content');
  // Show all section keys
  const all = db.prepare("SELECT section_key FROM site_content").all();
  console.log('Available sections:', all.map(r => r.section_key));
}

db.close();

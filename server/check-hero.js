const Database = require('better-sqlite3');
const db = new Database('./app.db');

// Check hero content
const heroRow = db.prepare("SELECT section_key, content FROM site_content WHERE section_key = 'hero'").all();
console.log('=== HERO CONTENT ===');
console.log(JSON.stringify(heroRow, null, 2));

// Check if hero_images field exists
if (heroRow.length > 0) {
  try {
    const content = JSON.parse(heroRow[0].content);
    console.log('\n=== PARSED HERO CONTENT ===');
    console.log('hero_image:', content.hero_image);
    console.log('hero_images:', content.hero_images);
    console.log('images:', content.images);
  } catch(e) {
    console.log('Content as string:', heroRow[0].content);
  }
}

db.close();

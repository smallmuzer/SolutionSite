/**
 * update-all-images.mjs
 * Updates all image paths in technologies, services tables 
 * to point to confirmed files in /assets/uploads/
 */
import Database from 'better-sqlite3';
const db = new Database('./app.db');

// ── Technologies ──────────────────────────────────────────────────────────────
const techImageMap = {
  'React':      '/assets/uploads/React_1775583324344.png',
  'Angular':    '/assets/uploads/angular_1775502503321.jpg',
  '.NET':       '/assets/uploads/dotnet_1775502315420.png',
  'Node.js':    '/assets/uploads/nodejs_1775502250190.png',
  'Flutter':    '/assets/uploads/flutter_1775583342881.png',
  'SQL Server': '/assets/uploads/sqlserveer_1775502198881.png',
  'AWS':        '/assets/uploads/aws_1775582917804.png',
  'Docker':     '/assets/uploads/docker_1775502515684.png',
  'Python':     '/assets/uploads/python_1775502424673.png',
  'Firebase':   '/assets/uploads/firebase_1775502230531.png',
  'Git':        '/assets/uploads/git_1775583311815.png',
  'Cordova':    '/assets/uploads/cordova_1775502486041.png',
  'Kendo':      '/assets/uploads/kendo_1775502282108.png',
  'Vite':       '/assets/uploads/vite_1775502220546.png',
};

const techs = db.prepare("SELECT id, name, image_url FROM technologies").all();
let techUpdates = 0;
for (const tech of techs) {
  const newUrl = techImageMap[tech.name];
  if (newUrl && tech.image_url !== newUrl) {
    db.prepare("UPDATE technologies SET image_url = ? WHERE id = ?").run(newUrl, tech.id);
    console.log(`✅ Tech [${tech.name}]: ${tech.image_url} → ${newUrl}`);
    techUpdates++;
  }
}
console.log(`\nUpdated ${techUpdates} technologies.`);

// ── Services ──────────────────────────────────────────────────────────────────
const serviceImageMap = {
  'Software Development': '/assets/uploads/softwaredevelopemnt_1775027454431.jpg',
  'Web Development':      '/assets/uploads/CloudInfra_1775027818619.png',
  'Mobile Development':   '/assets/uploads/white_dev_1775409804566.png',
  'Mobile App Development': '/assets/uploads/white_dev_1775409804566.png',
  'ERP Solutions':        '/assets/uploads/bsol_1774778245083.jpg',
  'HR & Payroll':         '/assets/uploads/HR_PayRoll_1775027318902.jpg',
  'HR & Payroll Systems': '/assets/uploads/HR_PayRoll_1775027318902.jpg',
  'IT Consulting':        '/assets/uploads/white_designer_1775410426535.png',
  'UI/UX Design':         '/assets/uploads/white_designer_1775409818869.png',
  'Cloud & Infrastructure': '/assets/uploads/CloudInfra_1775027818619.png',
  'SEO & Digital Marketing': '/assets/uploads/softwaredevelopemnt_1775027454431.jpg',
};

const services = db.prepare("SELECT id, title, image_url FROM services").all();
let serviceUpdates = 0;
for (const svc of services) {
  const newUrl = serviceImageMap[svc.title];
  if (newUrl && svc.image_url !== newUrl) {
    db.prepare("UPDATE services SET image_url = ? WHERE id = ?").run(newUrl, svc.id);
    console.log(`✅ Service [${svc.title}]: updated`);
    serviceUpdates++;
  }
}
console.log(`\nUpdated ${serviceUpdates} services.`);

// ── Products ──────────────────────────────────────────────────────────────────
const productImageMap = {
  'BSOL':       '/assets/uploads/bsol_1774778245083.jpg',
  'HR-Metrics': '/assets/uploads/hr-metrics_1774778245110.jpg',
};
const products = db.prepare("SELECT id, name, image_url FROM products").all();
let productUpdates = 0;
for (const p of products) {
  const newUrl = productImageMap[p.name];
  if (newUrl && p.image_url !== newUrl) {
    db.prepare("UPDATE products SET image_url = ? WHERE id = ?").run(newUrl, p.id);
    console.log(`✅ Product [${p.name}]: updated`);
    productUpdates++;
  }
}
console.log(`\nUpdated ${productUpdates} products.`);

// ── Summary ───────────────────────────────────────────────────────────────────
const remaining = db.prepare("SELECT 'technologies' as tbl, count(*) as n FROM technologies WHERE image_url LIKE '%/assets/Technology/%' OR image_url LIKE '%/assets/services/%'").all();
console.log('\n📊 Remaining legacy paths in technologies:', remaining[0].n);

db.close();
console.log('\n✅ Done! All image paths updated to /assets/uploads/');

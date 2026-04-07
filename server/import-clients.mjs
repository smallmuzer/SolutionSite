import Database from 'better-sqlite3';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs';
import { randomUUID } from 'crypto';
import https from 'https';

const __dirname = dirname(fileURLToPath(import.meta.url));
const dbPath = join(__dirname, 'app.db');
const assetsDir = join(__dirname, '..', 'public', 'assets', 'clients');

if (!fs.existsSync(assetsDir)) {
  fs.mkdirSync(assetsDir, { recursive: true });
}

const clients = [
  { "name": "aaa Hotels & Resorts", "logo_url": "https://bsyssolutions.com/wp-content/uploads/2023/01/aaa-1.png" },
  { "name": "Alia Investments", "logo_url": "https://bsyssolutions.com/wp-content/uploads/2023/01/Alia.png" },
  { "name": "Baglioni Resorts", "logo_url": "https://bsyssolutions.com/wp-content/uploads/2023/01/Baglioni.jpg" },
  { "name": "City Investments", "logo_url": "https://bsyssolutions.com/wp-content/uploads/2023/01/City-Investments.jpg" },
  { "name": "Cocoon Maldives", "logo_url": "https://bsyssolutions.com/wp-content/uploads/2023/03/Cocoon.jpg" },
  { "name": "Co Load", "logo_url": "https://bsyssolutions.com/wp-content/uploads/2023/01/Co-load-2.png" },
  { "name": "COLOURS OF OBLU", "logo_url": "https://bsyssolutions.com/wp-content/uploads/2023/01/Colors-of-OBLU-768x390.png" },
  { "name": "DAMAS", "logo_url": "https://bsyssolutions.com/wp-content/uploads/2023/03/DAMAS-768x397.jpg" },
  { "name": "Election Commission of Maldives", "logo_url": "https://bsyssolutions.com/wp-content/uploads/2023/01/ecm.png" },
  { "name": "ELL Mobiles", "logo_url": "https://bsyssolutions.com/wp-content/uploads/2023/03/ELL-Mobiles-768x768.png" },
  { "name": "Ensis Fisheries", "logo_url": "https://bsyssolutions.com/wp-content/uploads/2023/01/Ensis-2.png" },
  { "name": "Fuel Supplies Maldives", "logo_url": "https://bsyssolutions.com/wp-content/uploads/2023/01/FSM-1.png" },
  { "name": "Fushifaru", "logo_url": "https://bsyssolutions.com/wp-content/uploads/2023/01/Fushifaru-1.png" },
  { "name": "Gage Maldives", "logo_url": "https://bsyssolutions.com/wp-content/uploads/2023/01/gage-logo-1.png" },
  { "name": "Happy Market", "logo_url": "https://bsyssolutions.com/wp-content/uploads/2023/03/Happy-Market.png" },
  { "name": "HDFC", "logo_url": "https://bsyssolutions.com/wp-content/uploads/2023/03/HDFC.png" },
  { "name": "Horizon Fisheries", "logo_url": "https://bsyssolutions.com/wp-content/uploads/2023/01/Horizon-fisheries-1.png" },
  { "name": "ILAA Maldives", "logo_url": "https://bsyssolutions.com/wp-content/uploads/2023/01/Ilaa-Maldives-1-768x593.jpg" },
  { "name": "Island Beverages", "logo_url": "https://bsyssolutions.com/wp-content/uploads/2023/03/Island-Beverages.png" },
  { "name": "Island Breeze Maldives", "logo_url": "https://bsyssolutions.com/wp-content/uploads/2023/01/Island-Breeze-Maldives.png" },
  { "name": "Medianet", "logo_url": "https://bsyssolutions.com/wp-content/uploads/2023/01/Medianet_Maldives.jpg" },
  { "name": "Medtech Maldives", "logo_url": "https://bsyssolutions.com/wp-content/uploads/2023/03/Medtech-Maldives.jpg" },
  { "name": "Mifco", "logo_url": "https://bsyssolutions.com/wp-content/uploads/2023/01/Mifco-2-768x309.png" },
  { "name": "Muni Enterprises", "logo_url": "https://bsyssolutions.com/wp-content/uploads/2023/01/Muni-1.png" },
  { "name": "OBLU Helengeli", "logo_url": "https://bsyssolutions.com/wp-content/uploads/2023/03/OBLU-Helengeli.png" },
  { "name": "Oblu Select", "logo_url": "https://bsyssolutions.com/wp-content/uploads/2023/03/Oblu-Select.png" },
  { "name": "OZEN Life Maadhoo", "logo_url": "https://bsyssolutions.com/wp-content/uploads/2023/03/OZEN-Life-Maadhoo-500x500.png" },
  { "name": "OZEN Reserve Bolifushi", "logo_url": "https://bsyssolutions.com/wp-content/uploads/2023/03/OZEN-Reserve-Bolifushi.png" },
  { "name": "Plaza Enterprises", "logo_url": "https://bsyssolutions.com/wp-content/uploads/2023/01/Plaza.png" },
  { "name": "RCSC, Bhutan", "logo_url": "https://bsyssolutions.com/wp-content/uploads/2023/01/RCSC.jpg" },
  { "name": "SIMDI Group", "logo_url": "https://bsyssolutions.com/wp-content/uploads/2023/03/SIMDI-Group.png" },
  { "name": "TEP Construction", "logo_url": "https://bsyssolutions.com/wp-content/uploads/2023/01/TEP-Constuction.png" },
  { "name": "The Hawks", "logo_url": "https://bsyssolutions.com/wp-content/uploads/2023/01/The-Hawks.png" },
  { "name": "United Food Suppliers", "logo_url": "https://bsyssolutions.com/wp-content/uploads/2023/03/United-Food-Suppliers.png" },
  { "name": "VARU by Atmosphere", "logo_url": "https://bsyssolutions.com/wp-content/uploads/2023/03/VARU-by-Atmosphere.jpg" },
  { "name": "Voyages Maldives", "logo_url": "https://bsyssolutions.com/wp-content/uploads/2023/01/voyage-Maldives.png" },
  { "name": "You & Me Maldives", "logo_url": "https://bsyssolutions.com/wp-content/uploads/2023/03/You-Me-Maldives-768x660.png" },
  { "name": "Villa Shipping and Trading Company", "logo_url": "https://bsyssolutions.com/wp-content/uploads/2023/01/Villagrouplogo-1.png" }
];

async function download(url, dest) {
  return new Promise((resolve, reject) => {
    https.get(url, (res) => {
      if (res.statusCode !== 200) {
        reject(new Error(`Failed to download ${url}: ${res.statusCode}`));
        return;
      }
      const file = fs.createWriteStream(dest);
      res.pipe(file);
      file.on('finish', () => {
        file.close();
        resolve();
      });
    }).on('error', (err) => {
      reject(err);
    });
  });
}

async function run() {
  const db = new Database(dbPath);
  const now = new Date().toISOString();

  console.log(`Checking ${clients.length} clients...`);

  for (let i = 0; i < clients.length; i++) {
    const c = clients[i];
    const fileName = c.logo_url.split('/').pop();
    const localPath = join(assetsDir, fileName);
    const relativeUrl = `/assets/clients/${fileName}`;

    try {
      if (!fs.existsSync(localPath)) {
        console.log(`Downloading ${c.name} logo...`);
        await download(c.logo_url, localPath);
      }

      // Check if client exists (fuzzy match name or same logo)
      const exists = db.prepare("SELECT id FROM client_logos WHERE name = ? OR logo_url = ?").get(c.name, relativeUrl);

      if (!exists) {
        console.log(`Adding ${c.name} to database...`);
        db.prepare("INSERT INTO client_logos (id, name, logo_url, is_visible, sort_order, created_at, updated_at) VALUES (?,?,?,?,?,?,?)")
          .run(randomUUID(), c.name, relativeUrl, 1, i, now, now);
      } else {
        // Update sort order to match live site
        db.prepare("UPDATE client_logos SET sort_order = ? WHERE id = ?").run(i, exists.id);
      }
    } catch (e) {
      console.error(`Error processing ${c.name}:`, e.message);
    }
  }

  console.log("Done!");
}

run();

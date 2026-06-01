import Database from 'better-sqlite3'; 
const db = new Database('server/app.db'); 
db.prepare(`UPDATE client_logos SET logo_url = '/assets/clients/Medianet.png' WHERE logo_url LIKE '%Medianet_Maldives.jpg%'`).run(); 
db.prepare(`UPDATE client_logos SET logo_url = '/assets/clients/RCSC-Bhutan.png' WHERE logo_url LIKE '%RCSC.jpg%'`).run(); 
console.log('Fixed logos');

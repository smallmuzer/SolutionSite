const db = require('better-sqlite3')('app.db');
console.log(db.prepare("SELECT * FROM hero_stats").all());

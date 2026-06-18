const fs = require('fs');
const glob = require('glob');
const files = glob.sync('src/components/**/*.tsx');

files.forEach(f => {
  const code = fs.readFileSync(f, 'utf8');
  let siteContents = new Set();
  let dbQueries = new Set();
  let sections = new Set();
  
  let match;
  
  // useSiteContent
  const scRegex = /useSiteContent\(['"`]([\w_-]+)['"`]\)/g;
  while ((match = scRegex.exec(code)) !== null) siteContents.add(match[1]);

  // useDbQuery
  const dbRegex = /useDbQuery.*?\(['"`]([\w_-]+)['"`]/g;
  while ((match = dbRegex.exec(code)) !== null) dbQueries.add(match[1]);

  // section="..."
  const secRegex = /section=['"]([\w_-]+)['"]/g;
  while ((match = secRegex.exec(code)) !== null) sections.add(match[1]);

  if (siteContents.size || dbQueries.size || sections.size) {
    console.log('---', f);
    console.log('  useSiteContent:', Array.from(siteContents));
    console.log('  useDbQuery:', Array.from(dbQueries));
    console.log('  sections:', Array.from(sections));
  }
});

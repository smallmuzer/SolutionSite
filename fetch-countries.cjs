const https = require('https');
const fs = require('fs');

https.get('https://restcountries.com/v3.1/all?fields=name,cca2,idd,flag', (res) => {
  let data = '';
  res.on('data', chunk => data += chunk);
  res.on('end', () => {
    let countries = JSON.parse(data)
      .filter(c => c.idd && c.idd.root)
      .map(c => {
        let dial = c.idd.root;
        if (c.idd.suffixes && c.idd.suffixes.length === 1) {
          dial += c.idd.suffixes[0];
        }
        return {
          name: c.name.common,
          code: c.cca2,
          dial: dial,
          flag: c.flag
        };
      })
      .sort((a, b) => a.name.localeCompare(b.name));

    const mvIndex = countries.findIndex(c => c.code === 'MV');
    if (mvIndex > -1) {
      const mv = countries.splice(mvIndex, 1)[0];
      countries.unshift(mv);
    }

    const tsCode = `
export interface Country {
  name: string;
  code: string;
  dial: string;
  flag: string;
  pattern?: RegExp;
}

export const COUNTRIES: Country[] = ${JSON.stringify(countries, null, 2)};

export const getCountryByCode = (code: string) => COUNTRIES.find(c => c.code === code) || COUNTRIES[0];

export const detectCountry = async (): Promise<Country> => {
  try {
    const tz = Intl.DateTimeFormat().resolvedOptions().timeZone;
    if (tz.includes('Maldives')) return getCountryByCode('MV');
    if (tz.includes('Calcutta') || tz.includes('India')) return getCountryByCode('IN');
    if (tz.includes('Colombo')) return getCountryByCode('LK');
    if (tz.includes('Dubai')) return getCountryByCode('AE');
    if (tz.includes('London')) return getCountryByCode('GB');
    if (tz.includes('New_York') || tz.includes('Los_Angeles') || tz.includes('Chicago')) return getCountryByCode('US');
    if (tz.includes('Singapore')) return getCountryByCode('SG');

    // Advanced IP location fallback
    const res = await fetch('https://ipapi.co/json/').catch(() => null);
    if (res && res.ok) {
      const data = await res.json().catch(() => ({}));
      if (data.country_code) {
        const found = getCountryByCode(data.country_code);
        if (found) return found;
      }
    }
  } catch (e) {
    // Silent fail
  }
  return COUNTRIES[0];
};

export const validatePhone = (dial: string, number: string): boolean => {
  const cleanNumber = number.replace(/\\D/g, '');
  return cleanNumber.length >= 5 && cleanNumber.length <= 15;
};
`;

    fs.writeFileSync('src/lib/phone-utils.ts', tsCode);
    console.log('Successfully updated phone-utils.ts with', countries.length, 'countries.');
  });
});

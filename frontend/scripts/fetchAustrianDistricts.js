/* eslint-disable no-console */
const fs = require('fs');
const path = require('path');
const axios = require('axios');

/**
 * Script na získanie zoznamu rakúskych okresov (Bezirke)
 * 
 * Rakúsko má 9 spolkových krajov (Bundesländer) a celkovo 94 okresov (Bezirke).
 */

// Funkcia na získanie zoznamu všetkých okresov z Wikipédie pomocou API
async function fetchDistrictsFromWikipediaAPI() {
  try {
    console.log('Fetching districts from Wikipedia API...');
    
    // Použijeme Wikipedia API na získanie obsahu stránky
    const wikiUrl = 'https://de.wikipedia.org/api/rest_v1/page/html/Liste_der_Bezirke_und_Statutarstädte_in_Österreich';
    
    const response = await axios.get(wikiUrl, {
      timeout: 15000,
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
        'Accept': 'text/html'
      }
    });

    const html = response.data;
    const districts = [];
    
    // Hľadáme názvy v tabuľkách - lepšie parsovanie
    const tdPattern = /<td[^>]*>([^<]+(?:<[^>]+>[^<]+<\/[^>]+>)*[^<]*)<\/td>/gi;
    let match;
    
    while ((match = tdPattern.exec(html)) !== null) {
      let text = match[1]
        .replace(/<[^>]+>/g, '') // Odstránime všetky HTML tagy
        .replace(/&nbsp;/g, ' ')
        .replace(/&amp;/g, '&')
        .trim();
      
      // Filtrujeme len rozumné názvy
      if (text.length > 2 && text.length < 50 && 
          !/^\d+$/.test(text) && 
          !text.includes('http') &&
          !text.includes('Category:') &&
          !text.includes('File:') &&
          !text.includes('Template:') &&
          !text.includes('↑') &&
          !text.includes('↓') &&
          !text.includes('[') &&
          !text.includes(']') &&
          /^[A-ZÄÖÜ]/.test(text)) {
        districts.push(text);
      }
    }
    
    // Skúsime aj hľadať v <li> elementoch
    const liPattern = /<li[^>]*>([^<]+(?:<[^>]+>[^<]+<\/[^>]+>)*[^<]*)<\/li>/gi;
    while ((match = liPattern.exec(html)) !== null) {
      let text = match[1]
        .replace(/<[^>]+>/g, '')
        .replace(/&nbsp;/g, ' ')
        .trim();
      
      if (text.length > 2 && text.length < 50 && 
          !/^\d+$/.test(text) && 
          !text.includes('http') &&
          /^[A-ZÄÖÜ]/.test(text)) {
        districts.push(text);
      }
    }
    
    // Odstránime duplikáty a neplatné hodnoty
    const uniqueDistricts = [...new Set(districts)]
      .filter(d => {
        return d.length > 2 && 
               d.length < 50 && 
               !d.includes('http') &&
               !d.includes('Category:') &&
               !d.includes('File:') &&
               !d.includes('Template:') &&
               !/^\d+$/.test(d) &&
               !d.includes('↑') &&
               !d.includes('↓') &&
               !d.includes('[') &&
               !d.includes(']');
      })
      .map(d => d.trim())
      .filter(d => d.length > 0);
    
    console.log(`Found ${uniqueDistricts.length} potential districts from Wikipedia API`);
    return uniqueDistricts;
    
  } catch (error) {
    console.error(`Error fetching from Wikipedia API:`, error.message);
    return [];
  }
}

// Alternatívna metóda - skúsiť stiahnuť z CityPopulation.de
async function fetchDistrictsFromCityPopulation() {
  try {
    console.log('Trying CityPopulation.de...');
    
    const url = 'https://www.citypopulation.de/en/austria/admin/';
    
    const response = await axios.get(url, {
      timeout: 15000,
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
        'Accept': 'text/html'
      }
    });

    const html = response.data;
    const districts = [];
    
    // Hľadáme názvy v tabuľkách
    const tableRows = html.match(/<tr[^>]*>[\s\S]*?<\/tr>/gi);
    if (tableRows) {
      for (const row of tableRows) {
        const cells = row.match(/<td[^>]*>([^<]+(?:<[^>]+>[^<]+<\/[^>]+>)*[^<]*)<\/td>/gi);
        if (cells && cells.length > 0) {
          for (let i = 0; i < Math.min(2, cells.length); i++) {
            let text = cells[i]
              .replace(/<[^>]+>/g, '')
              .replace(/&nbsp;/g, ' ')
              .replace(/&amp;/g, '&')
              .trim();
            
            if (text.length > 2 && text.length < 50 && 
                !/^\d+$/.test(text) &&
                !text.includes('http') &&
                !text.includes('District') &&
                !text.includes('Population') &&
                !text.includes('Area') &&
                /^[A-ZÄÖÜ]/.test(text)) {
              districts.push(text);
            }
          }
        }
      }
    }
    
    return [...new Set(districts)]
      .filter(d => d.length > 2 && d.length < 50)
      .map(d => d.trim())
      .filter(d => d.length > 0);
      
  } catch (error) {
    console.error(`Error fetching from CityPopulation.de:`, error.message);
    return [];
  }
}

// Manuálny zoznam rakúskych okresov (Bezirke)
// Rakúsko má 94 okresov + 15 statutárnych miest
const MANUAL_AUSTRIAN_DISTRICTS = [
  // Burgenland
  'Eisenstadt', 'Eisenstadt-Umgebung', 'Güssing', 'Jennersdorf', 'Mattersburg', 'Neusiedl am See', 'Oberpullendorf', 'Oberwart', 'Rust',
  
  // Kärnten
  'Feldkirchen', 'Hermagor', 'Klagenfurt am Wörthersee', 'Klagenfurt-Land', 'Sankt Veit an der Glan', 'Spittal an der Drau', 'Villach', 'Villach-Land', 'Völkermarkt', 'Wolfsberg',
  
  // Niederösterreich
  'Amstetten', 'Baden', 'Bruck an der Leitha', 'Gänserndorf', 'Gmünd', 'Hollabrunn', 'Horn', 'Korneuburg', 'Krems an der Donau', 'Krems', 'Lilienfeld', 'Melk', 'Mistelbach', 'Mödling', 'Neunkirchen', 'Sankt Pölten', 'Sankt Pölten-Land', 'Scheibbs', 'Schwechat', 'Tulln', 'Waidhofen an der Thaya', 'Waidhofen an der Ybbs', 'Wiener Neustadt', 'Wiener Neustadt-Land', 'Wien-Umgebung', 'Zwettl',
  
  // Oberösterreich
  'Braunau am Inn', 'Eferding', 'Freistadt', 'Gmunden', 'Grieskirchen', 'Kirchdorf an der Krems', 'Linz', 'Linz-Land', 'Perg', 'Ried im Innkreis', 'Rohrbach', 'Schärding', 'Steyr', 'Steyr-Land', 'Urfahr-Umgebung', 'Vöcklabruck', 'Wels', 'Wels-Land',
  
  // Salzburg
  'Hallein', 'Salzburg', 'Salzburg-Umgebung', 'Sankt Johann im Pongau', 'Tamsweg', 'Zell am See',
  
  // Steiermark
  'Bruck-Mürzzuschlag', 'Deutschlandsberg', 'Graz', 'Graz-Umgebung', 'Hartberg-Fürstenfeld', 'Leibnitz', 'Leoben', 'Liezen', 'Murau', 'Murtal', 'Südoststeiermark', 'Voitsberg', 'Weiz',
  
  // Tirol
  'Imst', 'Innsbruck', 'Innsbruck-Land', 'Kitzbühel', 'Kufstein', 'Landeck', 'Lienz', 'Reutte', 'Schwaz',
  
  // Vorarlberg
  'Bludenz', 'Bregenz', 'Dornbirn', 'Feldkirch',
  
  // Wien
  'Wien',
];

async function main() {
  console.log('Fetching Austrian districts...\n');
  
  let allDistricts = [];
  
  // Skúsime najprv CityPopulation.de
  console.log('Attempting to fetch districts from CityPopulation.de...');
  allDistricts = await fetchDistrictsFromCityPopulation();
  
  // Ak to nefunguje, skúsime Wikipedia API
  if (allDistricts.length < 50) {
    console.log('\nCityPopulation.de didn\'t return enough results. Trying Wikipedia API...');
    const wikiDistricts = await fetchDistrictsFromWikipediaAPI();
    if (wikiDistricts.length > allDistricts.length) {
      allDistricts = wikiDistricts;
    }
  }
  
  // Použijeme manuálny zoznam ako primárny zdroj
  console.log('\nUsing manual list as primary source (more accurate)...');
  allDistricts = MANUAL_AUSTRIAN_DISTRICTS;
  
  // Ak sme získali nejaké platné okresy z webu, skúsime ich pridať
  if (allDistricts.length > 0) {
    const webDistricts = allDistricts.filter(d => {
      return d.length > 2 && 
             d.length < 50 &&
             !d.includes('(') &&
             !d.includes(')');
    });
    
    const combined = [...new Set([...MANUAL_AUSTRIAN_DISTRICTS, ...webDistricts])];
    if (combined.length > MANUAL_AUSTRIAN_DISTRICTS.length) {
      console.log(`Added ${combined.length - MANUAL_AUSTRIAN_DISTRICTS.length} additional districts from web sources`);
      allDistricts = combined;
    } else {
      console.log('Manual list is complete, no additional districts found from web sources');
    }
  }
  
  // Odstránime duplikáty a zoradíme
  const uniqueDistricts = [...new Set(allDistricts)]
    .map(d => d.trim())
    .filter(d => d.length > 0)
    .sort();
  
  console.log(`\nTotal unique districts found: ${uniqueDistricts.length}`);
  
  // Uložíme do súboru
  const outputPath = path.join(__dirname, 'austrian_districts.txt');
  fs.writeFileSync(outputPath, uniqueDistricts.join('\n'), 'utf8');
  
  // Vytvoríme aj JavaScript array pre jednoduchšie použitie
  const jsArray = `// Rakúske okresy (Bezirke)\nconst AUSTRIAN_DISTRICTS = [\n${uniqueDistricts.map(d => `  '${d.replace(/'/g, "\\'")}',`).join('\n')}\n];\n`;
  
  const jsOutputPath = path.join(__dirname, 'austrian_districts.js');
  fs.writeFileSync(jsOutputPath, jsArray, 'utf8');
  
  console.log(`\nResults saved to:`);
  console.log(`  - ${outputPath}`);
  console.log(`  - ${jsOutputPath}`);
  console.log(`\nFirst 10 districts:`);
  uniqueDistricts.slice(0, 10).forEach((d, i) => console.log(`  ${i + 1}. ${d}`));
}

main().catch(console.error);


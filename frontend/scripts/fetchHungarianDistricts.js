/* eslint-disable no-console */
const fs = require('fs');
const path = require('path');
const axios = require('axios');

/**
 * Script na získanie zoznamu maďarských okresov (járások)
 * 
 * Maďarsko má 19 žúp (megye) a v každej župe je viacero okresov.
 * Celkovo je v Maďarsku približne 174 okresov.
 */

// Zoznam 19 maďarských žúp
const HUNGARIAN_COUNTIES = [
  'Bács-Kiskun',
  'Baranya',
  'Békés',
  'Borsod-Abaúj-Zemplén',
  'Csongrád-Csanád',
  'Fejér',
  'Győr-Moson-Sopron',
  'Hajdú-Bihar',
  'Heves',
  'Jász-Nagykun-Szolnok',
  'Komárom-Esztergom',
  'Nógrád',
  'Pest',
  'Somogy',
  'Szabolcs-Szatmár-Bereg',
  'Tolna',
  'Vas',
  'Veszprém',
  'Zala',
];

// Funkcia na získanie zoznamu všetkých okresov z Wikipédie pomocou API
async function fetchDistrictsFromWikipediaAPI() {
  try {
    console.log('Fetching districts from Wikipedia API...');
    
    // Použijeme Wikipedia API na získanie obsahu stránky
    const wikiUrl = 'https://sk.wikipedia.org/api/rest_v1/page/html/Zoznam_okresov_v_Ma%C4%8Farsku';
    
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
    // Hľadáme <td> elementy, ktoré obsahujú názvy miest
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
          /^[A-ZÁÉÍÓÖŐÚÜŰČĎĽŇŠŤŽ]/.test(text)) {
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
          /^[A-ZÁÉÍÓÖŐÚÜŰČĎĽŇŠŤŽ]/.test(text)) {
        districts.push(text);
      }
    }
    
    // Odstránime duplikáty a neplatné hodnoty
    const uniqueDistricts = [...new Set(districts)]
      .filter(d => {
        // Dekódujeme HTML entity
        d = d.replace(/&#(\d+);/g, (match, dec) => String.fromCharCode(dec));
        d = d.replace(/&nbsp;/g, ' ');
        d = d.replace(/&amp;/g, '&');
        
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
               !d.includes(']') &&
               !d.includes('FIPS') &&
               !d.includes('ISO') &&
               !d.includes('code') &&
               !d.includes('Capital') &&
               !d.includes('Language') &&
               !d.includes('Time zone') &&
               !d.includes('Totals') &&
               !d.includes('Short name') &&
               !d.includes('Last updated') &&
               !d.match(/^HU\d+$/) && // Filtrujeme kódy ako HU1, HU10
               !d.includes('(Unter-') && // Filtrujeme staré názvy
               !d.includes('(Kronstadt)') &&
               !d.includes('(Bistritz)') &&
               !d.includes('(Gran)') &&
               !d.includes('(Raab)') &&
               !d.includes('(Hajduken)') &&
               !d.includes('(Klausenburg)') &&
               !d.includes('(Komorn)') &&
               !d.includes('(Neutra)') &&
               !d.includes('(Neograd)') &&
               !d.includes('(Pre') &&
               !d.includes('(') && // Filtrujeme všetky názvy v zátvorkách
               !d.includes(')');
      })
      .map(d => {
        // Dekódujeme HTML entity
        d = d.replace(/&#(\d+);/g, (match, dec) => String.fromCharCode(dec));
        d = d.replace(/&nbsp;/g, ' ');
        d = d.replace(/&amp;/g, '&');
        return d.trim();
      })
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
    
    // CityPopulation.de má zoznam maďarských okresov
    const url = 'https://www.citypopulation.de/en/hungary/admin/';
    
    const response = await axios.get(url, {
      timeout: 15000,
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8'
      }
    });

    const html = response.data;
    const districts = [];
    
    // Hľadáme názvy v tabuľkách - CityPopulation.de má štandardné HTML tabuľky
    const tableRows = html.match(/<tr[^>]*>[\s\S]*?<\/tr>/gi);
    if (tableRows) {
      for (const row of tableRows) {
        // Hľadáme <td> elementy
        const cells = row.match(/<td[^>]*>([^<]+(?:<[^>]+>[^<]+<\/[^>]+>)*[^<]*)<\/td>/gi);
        if (cells && cells.length > 0) {
          // Prvý alebo druhý stĺpec často obsahuje názov okresu
          for (let i = 0; i < Math.min(2, cells.length); i++) {
            let text = cells[i]
              .replace(/<[^>]+>/g, '')
              .replace(/&nbsp;/g, ' ')
              .replace(/&amp;/g, '&')
              .trim();
            
            // Filtrujeme len rozumné názvy
            if (text.length > 2 && text.length < 50 && 
                !/^\d+$/.test(text) &&
                !text.includes('http') &&
                !text.includes('District') &&
                !text.includes('County') &&
                !text.includes('Population') &&
                !text.includes('Area') &&
                /^[A-ZÁÉÍÓÖŐÚÜŰ]/.test(text)) {
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

// Alternatívna metóda - skúsiť stiahnuť z statoids.com
async function fetchDistrictsFromStatoids() {
  try {
    console.log('Trying Statoids.com...');
    
    // Statoids.com má podrobné informácie o administratívnom členení
    const url = 'https://statoids.com/uhu.html';
    
    const response = await axios.get(url, {
      timeout: 15000,
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
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
          // Prvý stĺpec často obsahuje názov okresu
          let text = cells[0]
            .replace(/<[^>]+>/g, '')
            .replace(/&nbsp;/g, ' ')
            .trim();
          
          if (text.length > 2 && text.length < 50 && 
              !/^\d+$/.test(text) &&
              !text.includes('http') &&
              !text.includes('District') &&
              !text.includes('Code') &&
              /^[A-ZÁÉÍÓÖŐÚÜŰ]/.test(text)) {
            districts.push(text);
          }
        }
      }
    }
    
    return [...new Set(districts)]
      .filter(d => d.length > 2 && d.length < 50)
      .map(d => d.trim())
      .filter(d => d.length > 0);
      
  } catch (error) {
    console.error(`Error fetching from Statoids.com:`, error.message);
    return [];
  }
}

// Alternatívna metóda - manuálny zoznam okresov (ak web scraping nefunguje)
// Toto môže byť doplnené manuálne alebo z iného zdroja
const MANUAL_DISTRICTS = [
  // Bács-Kiskun
  'Bácsalmás', 'Baja', 'Jánoshalma', 'Kalocsa', 'Kecskemét', 'Kiskőrös', 'Kiskunfélegyháza', 'Kiskunhalas', 'Kunszentmiklós',
  
  // Baranya
  'Komló', 'Pécs', 'Pécsvárad', 'Sásd', 'Sellye', 'Szentlőrinc', 'Szigetvár',
  
  // Békés
  'Békés', 'Békéscsaba', 'Gyula', 'Mezőkovácsháza', 'Orosháza', 'Sarkad', 'Szarvas',
  
  // Borsod-Abaúj-Zemplén
  'Abádszalók', 'Cigánd', 'Edelény', 'Encs', 'Gönc', 'Kazincbarcika', 'Mezőcsát', 'Mezőkövesd', 'Miskolc', 'Ózd', 'Sárospatak', 'Sátoraljaújhely', 'Szerencs', 'Szikszó', 'Tiszaújváros', 'Tokaj',
  
  // Csongrád-Csanád
  'Csongrád', 'Hódmezővásárhely', 'Kistelek', 'Makó', 'Mórahalom', 'Szeged', 'Szentes',
  
  // Fejér
  'Bicske', 'Dunaújváros', 'Enying', 'Gárdony', 'Martonvásár', 'Mór', 'Polgárdi', 'Ráckeve', 'Sárbogárd', 'Székesfehérvár',
  
  // Győr-Moson-Sopron
  'Csorna', 'Győr', 'Kapuvár', 'Mosonmagyaróvár', 'Pannonhalma', 'Sopron', 'Tét',
  
  // Hajdú-Bihar
  'Balmazújváros', 'Berettyóújfalu', 'Debrecen', 'Derecske', 'Hajdúböszörmény', 'Hajdúhadház', 'Hajdúnánás', 'Hajdúszoboszló', 'Nyíradony', 'Püspökladány',
  
  // Heves
  'Bélapátfalva', 'Eger', 'Füzesabony', 'Gyöngyös', 'Hatvan', 'Heves', 'Pétervására',
  
  // Jász-Nagykun-Szolnok
  'Jászapáti', 'Jászberény', 'Karcag', 'Kisújszállás', 'Kunhegyes', 'Kunszentmárton', 'Mezőtúr', 'Szolnok', 'Tiszafüred', 'Törökszentmiklós',
  
  // Komárom-Esztergom
  'Dorog', 'Esztergom', 'Kisbér', 'Komárom', 'Oroszlány', 'Tata', 'Tatabánya',
  
  // Nógrád
  'Balassagyarmat', 'Bátonyterenye', 'Pásztó', 'Rétság', 'Salgótarján', 'Szécsény',
  
  // Pest
  'Aszód', 'Budaörs', 'Budapest', 'Cegléd', 'Dabas', 'Dunakeszi', 'Érd', 'Gödöllő', 'Gyál', 'Monor', 'Nagykáta', 'Pilisvörösvár', 'Ráckeve', 'Szentendre', 'Szigetszentmiklós', 'Vác', 'Vecsés',
  
  // Somogy
  'Barcs', 'Csurgó', 'Fonyód', 'Kaposvár', 'Marcali', 'Nagyatád', 'Siófok', 'Tab',
  
  // Szabolcs-Szatmár-Bereg
  'Baktalórántháza', 'Csenger', 'Fehérgyarmat', 'Ibrány', 'Kemecse', 'Kisvárda', 'Mátészalka', 'Nagyecsed', 'Nagykálló', 'Nyírbátor', 'Nyíregyháza', 'Tiszavasvári', 'Vásárosnamény', 'Záhony',
  
  // Tolna
  'Bonyhád', 'Dombóvár', 'Paks', 'Szekszárd', 'Tamási',
  
  // Vas
  'Celldömölk', 'Csepreg', 'Körmend', 'Kőszeg', 'Sárvár', 'Szentgotthárd', 'Szombathely', 'Vasvár',
  
  // Veszprém
  'Ajka', 'Balatonalmádi', 'Balatonfüred', 'Devecser', 'Pápa', 'Sümeg', 'Tapolca', 'Várpalota', 'Veszprém', 'Zirc',
  
  // Zala
  'Keszthely', 'Lenti', 'Letenye', 'Nagykanizsa', 'Pacsa', 'Zalaegerszeg', 'Zalaszentgrót',
];

async function main() {
  console.log('Fetching Hungarian districts...\n');
  
  let allDistricts = [];
  
  // Skúsime najprv CityPopulation.de
  console.log('Attempting to fetch districts from CityPopulation.de...');
  allDistricts = await fetchDistrictsFromCityPopulation();
  
  // Ak to nefunguje, skúsime Statoids.com
  if (allDistricts.length < 50) {
    console.log('\nCityPopulation.de didn\'t return enough results. Trying Statoids.com...');
    const statoidsDistricts = await fetchDistrictsFromStatoids();
    if (statoidsDistricts.length > allDistricts.length) {
      allDistricts = statoidsDistricts;
    }
  }
  
  // Ak to stále nefunguje, skúsime Wikipedia API
  if (allDistricts.length < 50) {
    console.log('\nPrevious sources didn\'t return enough results. Trying Wikipedia API...');
    const wikiDistricts = await fetchDistrictsFromWikipediaAPI();
    if (wikiDistricts.length > allDistricts.length) {
      allDistricts = wikiDistricts;
    }
  }
  
  // Filtrujeme len platné okresy (nie župy, nie staré názvy)
  // Použijeme manuálny zoznam ako základ, pretože je presnejší
  console.log('\nUsing manual list as primary source (more accurate)...');
  allDistricts = MANUAL_DISTRICTS;
  
  // Ak sme získali nejaké platné okresy z webu, skúsime ich pridať (len tie, ktoré nie sú v manuálnom zozname)
  if (allDistricts.length > 0) {
    // Filtrujeme len tie, ktoré vyzerajú ako platné maďarské okresy
    const webDistricts = allDistricts.filter(d => {
      // Skontrolujeme, či to nie je župa alebo starý názov
      const isCounty = HUNGARIAN_COUNTIES.some(c => 
        d.toLowerCase().includes(c.toLowerCase()) || 
        c.toLowerCase().includes(d.toLowerCase())
      );
      return !isCounty && 
             d.length > 2 && 
             d.length < 50 &&
             !d.includes('(') &&
             !d.includes(')') &&
             !d.includes('Unter-') &&
             !d.includes('Kronstadt') &&
             !d.includes('Bistritz');
    });
    
    // Kombinujeme len unikátne hodnoty
    const combined = [...new Set([...MANUAL_DISTRICTS, ...webDistricts])];
    if (combined.length > MANUAL_DISTRICTS.length) {
      console.log(`Added ${combined.length - MANUAL_DISTRICTS.length} additional districts from web sources`);
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
  const outputPath = path.join(__dirname, 'hungarian_districts.txt');
  fs.writeFileSync(outputPath, uniqueDistricts.join('\n'), 'utf8');
  
  // Vytvoríme aj JavaScript array pre jednoduchšie použitie
  const jsArray = `// Maďarské okresy (járások)\nconst HUNGARIAN_DISTRICTS = [\n${uniqueDistricts.map(d => `  '${d.replace(/'/g, "\\'")}',`).join('\n')}\n];\n`;
  
  const jsOutputPath = path.join(__dirname, 'hungarian_districts.js');
  fs.writeFileSync(jsOutputPath, jsArray, 'utf8');
  
  console.log(`\nResults saved to:`);
  console.log(`  - ${outputPath}`);
  console.log(`  - ${jsOutputPath}`);
  console.log(`\nFirst 10 districts:`);
  uniqueDistricts.slice(0, 10).forEach((d, i) => console.log(`  ${i + 1}. ${d}`));
}

main().catch(console.error);


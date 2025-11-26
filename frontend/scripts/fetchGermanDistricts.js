/* eslint-disable no-console */
const fs = require('fs');
const path = require('path');
const axios = require('axios');

/**
 * Script na získanie zoznamu nemeckých okresov (Landkreise)
 * 
 * Nemecko má 16 spolkových krajín (Bundesländer) a celkovo približne 400 okresov (Landkreise a kreisfreie Städte).
 */

// Funkcia na získanie zoznamu všetkých okresov z Wikipédie pomocou API
async function fetchDistrictsFromWikipediaAPI() {
  try {
    console.log('Fetching districts from Wikipedia API...');
    
    // Použijeme Wikipedia API na získanie obsahu stránky
    const wikiUrl = 'https://de.wikipedia.org/api/rest_v1/page/html/Liste_der_Landkreise_in_Deutschland';
    
    const response = await axios.get(wikiUrl, {
      timeout: 15000,
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
        'Accept': 'text/html'
      }
    });

    const html = response.data;
    const districts = [];
    
    // Hľadáme názvy v tabuľkách
    const tdPattern = /<td[^>]*>([^<]+(?:<[^>]+>[^<]+<\/[^>]+>)*[^<]*)<\/td>/gi;
    let match;
    
    while ((match = tdPattern.exec(html)) !== null) {
      let text = match[1]
        .replace(/<[^>]+>/g, '')
        .replace(/&nbsp;/g, ' ')
        .replace(/&amp;/g, '&')
        .trim();
      
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
    
    const url = 'https://www.citypopulation.de/en/germany/admin/';
    
    const response = await axios.get(url, {
      timeout: 15000,
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
        'Accept': 'text/html'
      }
    });

    const html = response.data;
    const districts = [];
    
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

// Manuálny zoznam nemeckých okresov (Landkreise a kreisfreie Städte)
// Nemecko má približne 400 okresov - tu je reprezentatívny zoznam najdôležitejších
const MANUAL_GERMAN_DISTRICTS = [
  // Baden-Württemberg
  'Alb-Donau-Kreis', 'Baden-Baden', 'Biberach', 'Böblingen', 'Bodenseekreis', 'Breisgau-Hochschwarzwald', 'Calw', 'Emmendingen', 'Enzkreis', 'Esslingen', 'Freiburg im Breisgau', 'Freudenstadt', 'Göppingen', 'Heidelberg', 'Heidenheim', 'Heilbronn', 'Hohenlohekreis', 'Karlsruhe', 'Konstanz', 'Lörrach', 'Ludwigsburg', 'Main-Tauber-Kreis', 'Mannheim', 'Neckar-Odenwald-Kreis', 'Ortenaukreis', 'Ostalbkreis', 'Pforzheim', 'Rastatt', 'Ravensburg', 'Rems-Murr-Kreis', 'Reutlingen', 'Rhein-Neckar-Kreis', 'Rottweil', 'Schwäbisch Hall', 'Schwarzwald-Baar-Kreis', 'Sigmaringen', 'Stuttgart', 'Tübingen', 'Tuttlingen', 'Ulm', 'Waldshut', 'Zollernalbkreis',
  
  // Bayern
  'Aichach-Friedberg', 'Altötting', 'Amberg', 'Amberg-Sulzbach', 'Ansbach', 'Aschaffenburg', 'Augsburg', 'Bad Kissingen', 'Bad Tölz-Wolfratshausen', 'Bamberg', 'Bayreuth', 'Berchtesgadener Land', 'Cham', 'Coburg', 'Dachau', 'Deggendorf', 'Dillingen an der Donau', 'Dingolfing-Landau', 'Donau-Ries', 'Ebersberg', 'Eichstätt', 'Erding', 'Erlangen', 'Erlangen-Höchstadt', 'Forchheim', 'Freising', 'Freyung-Grafenau', 'Fürstenfeldbruck', 'Fürth', 'Garmisch-Partenkirchen', 'Günzburg', 'Hassberge', 'Hof', 'Kelheim', 'Kitzingen', 'Kronach', 'Kulmbach', 'Landsberg am Lech', 'Landshut', 'Lichtenfels', 'Lindau', 'Main-Spessart', 'Memmingen', 'Miesbach', 'Miltenberg', 'Mühldorf am Inn', 'München', 'Neuburg-Schrobenhausen', 'Neumarkt in der Oberpfalz', 'Neustadt an der Aisch-Bad Windsheim', 'Neustadt an der Waldnaab', 'Nürnberg', 'Nürnberger Land', 'Oberallgäu', 'Ostallgäu', 'Passau', 'Pfaffenhofen an der Ilm', 'Regen', 'Regensburg', 'Rhön-Grabfeld', 'Rosenheim', 'Roth', 'Rottal-Inn', 'Schwandorf', 'Schweinfurt', 'Starnberg', 'Straubing-Bogen', 'Tirschenreuth', 'Traunstein', 'Unterallgäu', 'Weilheim-Schongau', 'Weißenburg-Gunzenhausen', 'Wunsiedel im Fichtelgebirge', 'Würzburg',
  
  // Berlin
  'Berlin',
  
  // Brandenburg
  'Barnim', 'Brandenburg an der Havel', 'Cottbus', 'Dahme-Spreewald', 'Elbe-Elster', 'Frankfurt (Oder)', 'Havelland', 'Märkisch-Oderland', 'Oberhavel', 'Oberspreewald-Lausitz', 'Oder-Spree', 'Ostprignitz-Ruppin', 'Potsdam', 'Prignitz', 'Spree-Neiße', 'Teltow-Fläming', 'Uckermark',
  
  // Bremen
  'Bremen', 'Bremerhaven',
  
  // Hamburg
  'Hamburg',
  
  // Hessen
  'Bergstraße', 'Darmstadt', 'Darmstadt-Dieburg', 'Frankfurt am Main', 'Fulda', 'Gießen', 'Groß-Gerau', 'Hersfeld-Rotenburg', 'Hochtaunuskreis', 'Kassel', 'Lahn-Dill-Kreis', 'Limburg-Weilburg', 'Main-Kinzig-Kreis', 'Main-Taunus-Kreis', 'Marburg-Biedenkopf', 'Odenwaldkreis', 'Offenbach', 'Rheingau-Taunus-Kreis', 'Schwalm-Eder-Kreis', 'Vogelsbergkreis', 'Werra-Meißner-Kreis', 'Wetteraukreis', 'Wiesbaden',
  
  // Mecklenburg-Vorpommern
  'Bad Doberan', 'Demmin', 'Güstrow', 'Ludwigslust', 'Mecklenburgische Seenplatte', 'Nordvorpommern', 'Nordwestmecklenburg', 'Ostvorpommern', 'Parchim', 'Rostock', 'Rügen', 'Schwerin', 'Stralsund', 'Uecker-Randow', 'Vorpommern-Greifswald', 'Vorpommern-Rügen',
  
  // Niedersachsen
  'Ammerland', 'Aurich', 'Braunschweig', 'Celle', 'Cloppenburg', 'Cuxhaven', 'Delmenhorst', 'Diepholz', 'Emden', 'Emsland', 'Friesland', 'Gifhorn', 'Goslar', 'Göttingen', 'Grafschaft Bentheim', 'Hameln-Pyrmont', 'Hannover', 'Harburg', 'Heidekreis', 'Helmstedt', 'Hildesheim', 'Holzminden', 'Leer', 'Lüchow-Dannenberg', 'Lüneburg', 'Nienburg', 'Northeim', 'Oldenburg', 'Osnabrück', 'Osterholz', 'Peine', 'Rotenburg (Wümme)', 'Salzgitter', 'Schaumburg', 'Soltau-Fallingbostel', 'Stade', 'Uelzen', 'Vechta', 'Verden', 'Wesermarsch', 'Wilhelmshaven', 'Wittmund', 'Wolfenbüttel', 'Wolfsburg',
  
  // Nordrhein-Westfalen
  'Aachen', 'Bielefeld', 'Bochum', 'Bonn', 'Borken', 'Bottrop', 'Coesfeld', 'Dortmund', 'Duisburg', 'Düren', 'Düsseldorf', 'Ennepe-Ruhr-Kreis', 'Essen', 'Euskirchen', 'Gelsenkirchen', 'Gütersloh', 'Hagen', 'Hamm', 'Heinsberg', 'Herford', 'Herne', 'Hochsauerlandkreis', 'Höxter', 'Kleve', 'Köln', 'Krefeld', 'Leverkusen', 'Lippe', 'Märkischer Kreis', 'Mettmann', 'Minden-Lübbecke', 'Mönchengladbach', 'Mülheim an der Ruhr', 'Münster', 'Oberbergischer Kreis', 'Oberhausen', 'Olpe', 'Paderborn', 'Recklinghausen', 'Remscheid', 'Rhein-Erft-Kreis', 'Rhein-Kreis Neuss', 'Rhein-Sieg-Kreis', 'Siegen-Wittgenstein', 'Soest', 'Solingen', 'Steinfurt', 'Unna', 'Viersen', 'Warendorf', 'Wesel', 'Wuppertal',
  
  // Rheinland-Pfalz
  'Ahrweiler', 'Altenkirchen', 'Alzey-Worms', 'Bad Dürkheim', 'Bad Kreuznach', 'Bernkastel-Wittlich', 'Birkenfeld', 'Bitburg-Prüm', 'Cochem-Zell', 'Donnersbergkreis', 'Frankenthal', 'Germersheim', 'Kaiserslautern', 'Koblenz', 'Kusel', 'Landau in der Pfalz', 'Ludwigshafen am Rhein', 'Mainz', 'Mainz-Bingen', 'Mayen-Koblenz', 'Neustadt an der Weinstraße', 'Neuwied', 'Pirmasens', 'Rhein-Hunsrück-Kreis', 'Rhein-Lahn-Kreis', 'Rhein-Pfalz-Kreis', 'Speyer', 'Südliche Weinstraße', 'Südwestpfalz', 'Trier', 'Trier-Saarburg', 'Vulkaneifel', 'Westerwaldkreis', 'Worms', 'Zweibrücken',
  
  // Saarland
  'Merzig-Wadern', 'Neunkirchen', 'Saarbrücken', 'Saarlouis', 'Saarpfalz-Kreis', 'St. Wendel',
  
  // Sachsen
  'Annaberg', 'Aue-Schwarzenberg', 'Bautzen', 'Chemnitz', 'Delitzsch', 'Döbeln', 'Dresden', 'Freiberg', 'Görlitz', 'Kamenz', 'Leipzig', 'Löbau-Zittau', 'Meißen', 'Mittweida', 'Muldentalkreis', 'Nordsachsen', 'Plauen', 'Riesa-Großenhain', 'Sächsische Schweiz-Osterzgebirge', 'Stollberg', 'Torgau-Oschatz', 'Vogtlandkreis', 'Weißeritzkreis', 'Zwickau',
  
  // Sachsen-Anhalt
  'Altmarkkreis Salzwedel', 'Anhalt-Bitterfeld', 'Börde', 'Burgenlandkreis', 'Dessau-Roßlau', 'Halle (Saale)', 'Harz', 'Jerichower Land', 'Magdeburg', 'Mansfeld-Südharz', 'Saalekreis', 'Salzlandkreis', 'Stendal', 'Wittenberg',
  
  // Schleswig-Holstein
  'Dithmarschen', 'Flensburg', 'Herzogtum Lauenburg', 'Kiel', 'Lübeck', 'Neumünster', 'Nordfriesland', 'Ostholstein', 'Pinneberg', 'Plön', 'Rendsburg-Eckernförde', 'Schleswig-Flensburg', 'Segeberg', 'Steinburg', 'Stormarn',
  
  // Thüringen
  'Altenburger Land', 'Eichsfeld', 'Eisenach', 'Erfurt', 'Gera', 'Gotha', 'Greiz', 'Hildburghausen', 'Ilm-Kreis', 'Jena', 'Kyffhäuserkreis', 'Nordhausen', 'Saale-Holzland-Kreis', 'Saale-Orla-Kreis', 'Saalfeld-Rudolstadt', 'Schmalkalden-Meiningen', 'Sömmerda', 'Sonneberg', 'Suhl', 'Unstrut-Hainich-Kreis', 'Wartburgkreis', 'Weimar', 'Weimarer Land',
];

async function main() {
  console.log('Fetching German districts...\n');
  
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
  allDistricts = MANUAL_GERMAN_DISTRICTS;
  
  // Odstránime duplikáty a zoradíme
  const uniqueDistricts = [...new Set(allDistricts)]
    .map(d => d.trim())
    .filter(d => d.length > 0)
    .sort();
  
  console.log(`\nTotal unique districts found: ${uniqueDistricts.length}`);
  
  // Uložíme do súboru
  const outputPath = path.join(__dirname, 'german_districts.txt');
  fs.writeFileSync(outputPath, uniqueDistricts.join('\n'), 'utf8');
  
  // Vytvoríme aj JavaScript array pre jednoduchšie použitie
  const jsArray = `// Nemecké okresy (Landkreise)\nconst GERMAN_DISTRICTS = [\n${uniqueDistricts.map(d => `  '${d.replace(/'/g, "\\'")}',`).join('\n')}\n];\n`;
  
  const jsOutputPath = path.join(__dirname, 'german_districts.js');
  fs.writeFileSync(jsOutputPath, jsArray, 'utf8');
  
  console.log(`\nResults saved to:`);
  console.log(`  - ${outputPath}`);
  console.log(`  - ${jsOutputPath}`);
  console.log(`\nFirst 10 districts:`);
  uniqueDistricts.slice(0, 10).forEach((d, i) => console.log(`  ${i + 1}. ${d}`));
}

main().catch(console.error);


'use client';

import React, { useState, useRef, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { useLanguage } from '@/contexts/LanguageContext';

// Zoznam slovenských okresov
const SLOVAK_DISTRICTS = [
  'Bánovce nad Bebravou',
  'Banská Bystrica',
  'Banská Štiavnica',
  'Bardejov',
  'Bratislava I',
  'Bratislava II',
  'Bratislava III',
  'Bratislava IV',
  'Bratislava V',
  'Brezno',
  'Bytča',
  'Čadca',
  'Detva',
  'Dolný Kubín',
  'Dunajská Streda',
  'Galanta',
  'Gelnica',
  'Hlohovec',
  'Humenné',
  'Ilava',
  'Kežmarok',
  'Komárno',
  'Košice I',
  'Košice II',
  'Košice III',
  'Košice IV',
  'Košice-okolie',
  'Krupina',
  'Kysucké Nové Mesto',
  'Levice',
  'Levoča',
  'Liptovský Mikuláš',
  'Lučenec',
  'Malacky',
  'Martin',
  'Medzilaborce',
  'Michalovce',
  'Myjava',
  'Námestovo',
  'Nitra',
  'Nové Mesto nad Váhom',
  'Nové Zámky',
  'Partizánske',
  'Pezinok',
  'Piešťany',
  'Poltár',
  'Poprad',
  'Považská Bystrica',
  'Prešov',
  'Prievidza',
  'Púchov',
  'Revúca',
  'Rimavská Sobota',
  'Rožňava',
  'Ružomberok',
  'Sabinov',
  'Senec',
  'Senica',
  'Skalica',
  'Snina',
  'Sobrance',
  'Spišská Nová Ves',
  'Stará Ľubovňa',
  'Stropkov',
  'Svidník',
  'Šaľa',
  'Topoľčany',
  'Trebišov',
  'Trenčín',
  'Trnava',
  'Turčianske Teplice',
  'Tvrdošín',
  'Veľký Krtíš',
  'Vranov nad Topľou',
  'Zlaté Moravce',
  'Zvolen',
  'Žarnovica',
  'Žiar nad Hronom',
  'Žilina',
];

// Zoznam českých okresov
const CZECH_DISTRICTS = [
  'Benešov',
  'Beroun',
  'Blansko',
  'Brno-město',
  'Brno-venkov',
  'Bruntál',
  'Břeclav',
  'Česká Lípa',
  'České Budějovice',
  'Český Krumlov',
  'Děčín',
  'Domažlice',
  'Frýdek-Místek',
  'Havlíčkův Brod',
  'Hodonín',
  'Hradec Králové',
  'Cheb',
  'Chomutov',
  'Chrudim',
  'Jablonec nad Nisou',
  'Jeseník',
  'Jičín',
  'Jihlava',
  'Jindřichův Hradec',
  'Karlovy Vary',
  'Karviná',
  'Kladno',
  'Klatovy',
  'Kolín',
  'Kroměříž',
  'Kutná Hora',
  'Liberec',
  'Litoměřice',
  'Louny',
  'Mělník',
  'Mladá Boleslav',
  'Náchod',
  'Nový Jičín',
  'Nymburk',
  'Olomouc',
  'Opava',
  'Ostrava-město',
  'Pardubice',
  'Pelhřimov',
  'Písek',
  'Plzeň-jih',
  'Plzeň-město',
  'Plzeň-sever',
  'Praha-západ',
  'Praha-východ',
  'Příbram',
  'Prostějov',
  'Přerov',
  'Rakovník',
  'Rokycany',
  'Sokolov',
  'Strakonice',
  'Svitavy',
  'Šumperk',
  'Tachov',
  'Tábor',
  'Trutnov',
  'Třebíč',
  'Ústí nad Labem',
  'Ústí nad Orlicí',
  'Valašské Meziříčí',
  'Vsetín',
  'Vyškov',
  'Znojmo',
  'Žďár nad Sázavou',
  'Zlín',
];

// Zoznam poľských okresov (powiaty)
const POLISH_DISTRICTS = [
  'Biała Podlaska',
  'Białystok',
  'Bielsko-Biała',
  'Bydgoszcz',
  'Bytom',
  'Chełm',
  'Chorzów',
  'Częstochowa',
  'Dąbrowa Górnicza',
  'Elbląg',
  'Gdańsk',
  'Gdynia',
  'Gliwice',
  'Gorzów Wielkopolski',
  'Grudziądz',
  'Jastrzębie Zdrój',
  'Jaworzno',
  'Jelenia Góra',
  'Kalisz',
  'Katovice',
  'Kielce',
  'Konin',
  'Koszalin',
  'Kraków',
  'Krosno',
  'Legnica',
  'Leszno',
  'Lublin',
  'Łomża',
  'Lodž',
  'Mysłowice',
  'Nowy Sącz',
  'Olsztyn',
  'Opole',
  'Ostrołęka',
  'Piekary Śląskie',
  'Piotrków Trybunalski',
  'Płock',
  'Poznań',
  'Przemyśl',
  'Radom',
  'Ruda Śląska',
  'Rybnik',
  'Rzeszów',
  'Siedlce',
  'Siemianowice Śląskie',
  'Skierniewice',
  'Słupsk',
  'Sopot',
  'Sosnowiec',
  'Suwałki',
  'Szczecin',
  'Świętochłowice',
  'Świnoujście',
  'Tarnobrzeg',
  'Tarnów',
  'Toruń',
  'Tychy',
  'Warszawa',
  'Włocławek',
  'Wrocław',
  'Zabrze',
  'Zamość',
  'Zielona Góra',
  'Żory',
];

// Zoznam maďarských okresov (járások)
const HUNGARIAN_DISTRICTS = [
  'Abádszalók',
  'Ajka',
  'Aszód',
  'Baja',
  'Baktalórántháza',
  'Balassagyarmat',
  'Balatonalmádi',
  'Balatonfüred',
  'Balmazújváros',
  'Barcs',
  'Berettyóújfalu',
  'Bicske',
  'Bonyhád',
  'Budapest',
  'Budaörs',
  'Bácsalmás',
  'Bátonyterenye',
  'Békés',
  'Békéscsaba',
  'Bélapátfalva',
  'Cegléd',
  'Celldömölk',
  'Cigánd',
  'Csenger',
  'Csepreg',
  'Csongrád',
  'Csorna',
  'Csurgó',
  'Dabas',
  'Debrecen',
  'Derecske',
  'Devecser',
  'Dombóvár',
  'Dorog',
  'Dunakeszi',
  'Dunaújváros',
  'Edelény',
  'Eger',
  'Encs',
  'Enying',
  'Esztergom',
  'Fehérgyarmat',
  'Fonyód',
  'Füzesabony',
  'Gyula',
  'Gyál',
  'Gyöngyös',
  'Győr',
  'Gárdony',
  'Gödöllő',
  'Gönc',
  'Hajdúböszörmény',
  'Hajdúhadház',
  'Hajdúnánás',
  'Hajdúszoboszló',
  'Hatvan',
  'Heves',
  'Hódmezővásárhely',
  'Ibrány',
  'Jánoshalma',
  'Jászapáti',
  'Jászberény',
  'Kalocsa',
  'Kaposvár',
  'Kapuvár',
  'Karcag',
  'Kazincbarcika',
  'Kecskemét',
  'Kemecse',
  'Keszthely',
  'Kisbér',
  'Kiskunfélegyháza',
  'Kiskunhalas',
  'Kiskőrös',
  'Kistelek',
  'Kisvárda',
  'Kisújszállás',
  'Komló',
  'Komárom',
  'Kunhegyes',
  'Kunszentmiklós',
  'Kunszentmárton',
  'Körmend',
  'Kőszeg',
  'Lenti',
  'Letenye',
  'Makó',
  'Marcali',
  'Martonvásár',
  'Mezőcsát',
  'Mezőkovácsháza',
  'Mezőkövesd',
  'Mezőtúr',
  'Miskolc',
  'Monor',
  'Mosonmagyaróvár',
  'Mátészalka',
  'Mór',
  'Mórahalom',
  'Nagyatád',
  'Nagyecsed',
  'Nagykanizsa',
  'Nagykálló',
  'Nagykáta',
  'Nyíradony',
  'Nyírbátor',
  'Nyíregyháza',
  'Orosháza',
  'Oroszlány',
  'Pacsa',
  'Paks',
  'Pannonhalma',
  'Pilisvörösvár',
  'Polgárdi',
  'Pápa',
  'Pásztó',
  'Pécs',
  'Pécsvárad',
  'Pétervására',
  'Püspökladány',
  'Ráckeve',
  'Rétság',
  'Salgótarján',
  'Sarkad',
  'Sellye',
  'Siófok',
  'Sopron',
  'Szarvas',
  'Szeged',
  'Szekszárd',
  'Szentendre',
  'Szentes',
  'Szentgotthárd',
  'Szentlőrinc',
  'Szerencs',
  'Szigetszentmiklós',
  'Szigetvár',
  'Szikszó',
  'Szolnok',
  'Szombathely',
  'Szécsény',
  'Székesfehérvár',
  'Sárbogárd',
  'Sárospatak',
  'Sárvár',
  'Sásd',
  'Sátoraljaújhely',
  'Sümeg',
  'Tab',
  'Tamási',
  'Tapolca',
  'Tata',
  'Tatabánya',
  'Tiszafüred',
  'Tiszavasvári',
  'Tiszaújváros',
  'Tokaj',
  'Tét',
  'Törökszentmiklós',
  'Vasvár',
  'Vecsés',
  'Veszprém',
  'Vác',
  'Várpalota',
  'Vásárosnamény',
  'Zalaegerszeg',
  'Zalaszentgrót',
  'Zirc',
  'Záhony',
  'Érd',
  'Ózd',
];

// Zoznam rakúskych okresov (Bezirke)
const AUSTRIAN_DISTRICTS = [
  'Amstetten',
  'Baden',
  'Bludenz',
  'Braunau am Inn',
  'Bregenz',
  'Bruck an der Leitha',
  'Bruck-Mürzzuschlag',
  'Deutschlandsberg',
  'Dornbirn',
  'Eferding',
  'Eisenstadt',
  'Eisenstadt-Umgebung',
  'Feldkirch',
  'Feldkirchen',
  'Freistadt',
  'Gmunden',
  'Gmünd',
  'Graz',
  'Graz-Umgebung',
  'Grieskirchen',
  'Gänserndorf',
  'Güssing',
  'Hallein',
  'Hartberg-Fürstenfeld',
  'Hermagor',
  'Hollabrunn',
  'Horn',
  'Imst',
  'Innsbruck',
  'Innsbruck-Land',
  'Jennersdorf',
  'Kirchdorf an der Krems',
  'Kitzbühel',
  'Klagenfurt am Wörthersee',
  'Klagenfurt-Land',
  'Korneuburg',
  'Krems',
  'Krems an der Donau',
  'Kufstein',
  'Landeck',
  'Leibnitz',
  'Leoben',
  'Lienz',
  'Liezen',
  'Lilienfeld',
  'Linz',
  'Linz-Land',
  'Mattersburg',
  'Melk',
  'Mistelbach',
  'Murau',
  'Murtal',
  'Mödling',
  'Neunkirchen',
  'Neusiedl am See',
  'Oberpullendorf',
  'Oberwart',
  'Perg',
  'Reutte',
  'Ried im Innkreis',
  'Rohrbach',
  'Rust',
  'Salzburg',
  'Salzburg-Umgebung',
  'Sankt Johann im Pongau',
  'Sankt Pölten',
  'Sankt Pölten-Land',
  'Sankt Veit an der Glan',
  'Scheibbs',
  'Schwaz',
  'Schwechat',
  'Schärding',
  'Spittal an der Drau',
  'Steyr',
  'Steyr-Land',
  'Südoststeiermark',
  'Tamsweg',
  'Tulln',
  'Urfahr-Umgebung',
  'Villach',
  'Villach-Land',
  'Voitsberg',
  'Vöcklabruck',
  'Völkermarkt',
  'Waidhofen an der Thaya',
  'Waidhofen an der Ybbs',
  'Weiz',
  'Wels',
  'Wels-Land',
  'Wien',
  'Wien-Umgebung',
  'Wiener Neustadt',
  'Wiener Neustadt-Land',
  'Wolfsberg',
  'Zell am See',
  'Zwettl',
];

// Zoznam nemeckých okresov (Landkreise)
const GERMAN_DISTRICTS = [
  'Aachen', 'Ahrweiler', 'Aichach-Friedberg', 'Alb-Donau-Kreis', 'Altenburger Land', 'Altenkirchen', 'Altmarkkreis Salzwedel', 'Altötting', 'Alzey-Worms', 'Amberg', 'Amberg-Sulzbach', 'Ammerland', 'Annaberg', 'Anhalt-Bitterfeld', 'Ansbach', 'Aschaffenburg', 'Augsburg', 'Aue-Schwarzenberg', 'Aurich', 'Bad Doberan', 'Bad Dürkheim', 'Bad Kissingen', 'Bad Kreuznach', 'Bad Tölz-Wolfratshausen', 'Baden-Baden', 'Bamberg', 'Barnim', 'Bautzen', 'Bayreuth', 'Berchtesgadener Land', 'Bergstraße', 'Bernkastel-Wittlich', 'Biberach', 'Bielefeld', 'Birkenfeld', 'Bitburg-Prüm', 'Bochum', 'Böblingen', 'Bodenseekreis', 'Bonn', 'Börde', 'Borken', 'Bottrop', 'Brandenburg an der Havel', 'Braunschweig', 'Breisgau-Hochschwarzwald', 'Bremen', 'Bremerhaven', 'Burgenlandkreis', 'Calw', 'Celle', 'Cham', 'Chemnitz', 'Cloppenburg', 'Coburg', 'Coesfeld', 'Cochem-Zell', 'Cottbus', 'Cuxhaven', 'Dachau', 'Dahme-Spreewald', 'Darmstadt', 'Darmstadt-Dieburg', 'Deggendorf', 'Delitzsch', 'Delmenhorst', 'Demmin', 'Dessau-Roßlau', 'Diepholz', 'Dillingen an der Donau', 'Dingolfing-Landau', 'Dithmarschen', 'Döbeln', 'Donau-Ries', 'Donnersbergkreis', 'Dortmund', 'Dresden', 'Duisburg', 'Düren', 'Düsseldorf', 'Ebersberg', 'Eichsfeld', 'Eichstätt', 'Eisenach', 'Elbe-Elster', 'Emmendingen', 'Emden', 'Emsland', 'Ennepe-Ruhr-Kreis', 'Enzkreis', 'Erding', 'Erfurt', 'Erlangen', 'Erlangen-Höchstadt', 'Essen', 'Esslingen', 'Euskirchen', 'Flensburg', 'Forchheim', 'Frankenthal', 'Frankfurt (Oder)', 'Frankfurt am Main', 'Freiburg im Breisgau', 'Freiberg', 'Freising', 'Freudenstadt', 'Freyung-Grafenau', 'Friesland', 'Fulda', 'Fürstenfeldbruck', 'Fürth', 'Garmisch-Partenkirchen', 'Gelsenkirchen', 'Gera', 'Germersheim', 'Gießen', 'Gifhorn', 'Göppingen', 'Görlitz', 'Goslar', 'Gotha', 'Göttingen', 'Grafschaft Bentheim', 'Greiz', 'Groß-Gerau', 'Güstrow', 'Gütersloh', 'Günzburg', 'Hagen', 'Halle (Saale)', 'Hamburg', 'Hameln-Pyrmont', 'Hannover', 'Harburg', 'Harz', 'Hassberge', 'Heidekreis', 'Heidelberg', 'Heidenheim', 'Heilbronn', 'Heinsberg', 'Helmstedt', 'Herford', 'Herne', 'Hersfeld-Rotenburg', 'Herzogtum Lauenburg', 'Hildburghausen', 'Hildesheim', 'Hochsauerlandkreis', 'Hochtaunuskreis', 'Hof', 'Hohenlohekreis', 'Holzminden', 'Ilm-Kreis', 'Jena', 'Jerichower Land', 'Kamenz', 'Karlsruhe', 'Kassel', 'Kelheim', 'Kiel', 'Kitzingen', 'Kleve', 'Köln', 'Konstanz', 'Krefeld', 'Kronach', 'Kulmbach', 'Kusel', 'Kyffhäuserkreis', 'Lahn-Dill-Kreis', 'Landau in der Pfalz', 'Landsberg am Lech', 'Landshut', 'Leverkusen', 'Lichtenfels', 'Limburg-Weilburg', 'Lindau', 'Lippe', 'Löbau-Zittau', 'Lörrach', 'Lübeck', 'Lüchow-Dannenberg', 'Ludwigshafen am Rhein', 'Ludwigslust', 'Ludwigsburg', 'Lüneburg', 'Magdeburg', 'Main-Kinzig-Kreis', 'Main-Spessart', 'Main-Taunus-Kreis', 'Main-Tauber-Kreis', 'Mainz', 'Mainz-Bingen', 'Mannheim', 'Mansfeld-Südharz', 'Marburg-Biedenkopf', 'Märkisch-Oderland', 'Märkischer Kreis', 'Mayen-Koblenz', 'Mecklenburgische Seenplatte', 'Meißen', 'Memmingen', 'Merzig-Wadern', 'Mettmann', 'Miesbach', 'Miltenberg', 'Minden-Lübbecke', 'Mittweida', 'Mönchengladbach', 'Mühldorf am Inn', 'Muldentalkreis', 'Mülheim an der Ruhr', 'München', 'Münster', 'Neckar-Odenwald-Kreis', 'Neuburg-Schrobenhausen', 'Neumarkt in der Oberpfalz', 'Neumünster', 'Neunkirchen', 'Neustadt an der Aisch-Bad Windsheim', 'Neustadt an der Waldnaab', 'Neustadt an der Weinstraße', 'Neuwied', 'Nienburg', 'Nordfriesland', 'Nordhausen', 'Nordvorpommern', 'Nordwestmecklenburg', 'Nordsachsen', 'Northeim', 'Nürnberg', 'Nürnberger Land', 'Oberallgäu', 'Oberbergischer Kreis', 'Oberhausen', 'Oberhavel', 'Oberspreewald-Lausitz', 'Odenwaldkreis', 'Oder-Spree', 'Offenbach', 'Oldenburg', 'Olpe', 'Ortenaukreis', 'Ostalbkreis', 'Ostallgäu', 'Ostholstein', 'Ostprignitz-Ruppin', 'Ostvorpommern', 'Paderborn', 'Parchim', 'Passau', 'Peine', 'Pfaffenhofen an der Ilm', 'Pinneberg', 'Pirmasens', 'Plauen', 'Plön', 'Potsdam', 'Prignitz', 'Rastatt', 'Ravensburg', 'Recklinghausen', 'Regen', 'Regensburg', 'Rems-Murr-Kreis', 'Remscheid', 'Remscheid', 'Rendsburg-Eckernförde', 'Reutlingen', 'Rheingau-Taunus-Kreis', 'Rhein-Hunsrück-Kreis', 'Rhein-Kreis Neuss', 'Rhein-Lahn-Kreis', 'Rhein-Neckar-Kreis', 'Rhein-Pfalz-Kreis', 'Rhein-Sieg-Kreis', 'Rhein-Erft-Kreis', 'Rhön-Grabfeld', 'Riesa-Großenhain', 'Ried im Innkreis', 'Rosenheim', 'Rostock', 'Roth', 'Rotenburg (Wümme)', 'Rottal-Inn', 'Rottweil', 'Rügen', 'Saalekreis', 'Saarbrücken', 'Saarlouis', 'Saarpfalz-Kreis', 'Saalfeld-Rudolstadt', 'Saale-Holzland-Kreis', 'Saale-Orla-Kreis', 'Sächsische Schweiz-Osterzgebirge', 'Salzlandkreis', 'Salzgitter', 'Schaumburg', 'Schleswig-Flensburg', 'Schmalkalden-Meiningen', 'Schwäbisch Hall', 'Schwalm-Eder-Kreis', 'Schwandorf', 'Schwarzwald-Baar-Kreis', 'Schweinfurt', 'Schwerin', 'Schwaz', 'Segeberg', 'Siegen-Wittgenstein', 'Sigmaringen', 'Soest', 'Solingen', 'Soltau-Fallingbostel', 'Sömmerda', 'Sonneberg', 'Spree-Neiße', 'Speyer', 'Stade', 'Starnberg', 'Steinfurt', 'Steinburg', 'Stendal', 'Stollberg', 'Stormarn', 'Straubing-Bogen', 'Stuttgart', 'Südliche Weinstraße', 'Südoststeiermark', 'Südwestpfalz', 'Suhl', 'Tamsweg', 'Teltow-Fläming', 'Tirschenreuth', 'Torgau-Oschatz', 'Traunstein', 'Trier', 'Trier-Saarburg', 'Tübingen', 'Tuttlingen', 'Uckermark', 'Uecker-Randow', 'Uelzen', 'Ulm', 'Unna', 'Unstrut-Hainich-Kreis', 'Unterallgäu', 'Vechta', 'Verden', 'Viersen', 'Vogtlandkreis', 'Vogelsbergkreis', 'Völkermarkt', 'Vorpommern-Greifswald', 'Vorpommern-Rügen', 'Vulkaneifel', 'Waldshut', 'Warendorf', 'Wartburgkreis', 'Wesel', 'Wesermarsch', 'Westerwaldkreis', 'Wetteraukreis', 'Wetzlar', 'Weilheim-Schongau', 'Weimar', 'Weimarer Land', 'Weißenburg-Gunzenhausen', 'Weißeritzkreis', 'Werra-Meißner-Kreis', 'Wesel', 'Wiesbaden', 'Wilhelmshaven', 'Wittenberg', 'Wittmund', 'Wolfenbüttel', 'Wolfsburg', 'Worms', 'Wunsiedel im Fichtelgebirge', 'Wuppertal', 'Würzburg', 'Zollernalbkreis', 'Zweibrücken', 'Zwickau',
];

// Funkcia na odstránenie diakritiky
function removeDiacritics(str: string): string {
  return str
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase();
}

interface LocationSectionProps {
  value: string;
  onChange: (value: string) => void;
  onBlur: () => void;
  error: string;
  isSaving: boolean;
  district?: string;
  onDistrictChange?: (value: string) => void;
}

export default function LocationSection({ value, onChange, onBlur, error, isSaving, district, onDistrictChange }: LocationSectionProps) {
  const { t, country } = useLanguage();
  const [districtInput, setDistrictInput] = useState(district || '');
  const [filteredDistricts, setFilteredDistricts] = useState<string[]>([]);
  const [showDropdown, setShowDropdown] = useState(false);
  const [selectedIndex, setSelectedIndex] = useState(-1);
  const [dropdownPosition, setDropdownPosition] = useState<{ top: number; left: number; width: number } | null>(null);
  const [districtError, setDistrictError] = useState('');
  const dropdownRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  // Vyber správny zoznam okresov podľa krajiny (nie jazyka)
  const getDistrictsList = (): string[] => {
    if (country === 'CZ') {
      return CZECH_DISTRICTS;
    }
    if (country === 'PL') {
      return POLISH_DISTRICTS;
    }
    if (country === 'HU') {
      return HUNGARIAN_DISTRICTS;
    }
    if (country === 'AT') {
      return AUSTRIAN_DISTRICTS;
    }
    if (country === 'DE') {
      return GERMAN_DISTRICTS;
    }
    // Predvolené: slovenské okresy (ak krajina nie je detekovaná alebo je SK)
    return SLOVAK_DISTRICTS;
  };

  const DISTRICTS = getDistrictsList();

  useEffect(() => {
    setDistrictInput(district || '');
  }, [district]);

  useEffect(() => {
    if (districtInput.trim() === '') {
      setFilteredDistricts([]);
      setShowDropdown(false);
      return;
    }

    const searchTerm = removeDiacritics(districtInput);
    const filtered = DISTRICTS.filter((d) =>
      removeDiacritics(d).startsWith(searchTerm)
    );
    
    // Skontroluj, či je okres presne rovnaký ako jeden z okresov (presná zhoda)
    const exactMatch = DISTRICTS.some((d) => 
      removeDiacritics(d).toLowerCase() === searchTerm.toLowerCase()
    );
    
    // Ak je presná zhoda, nezobrazuj dropdown
    if (exactMatch && filtered.length === 1 && removeDiacritics(filtered[0]).toLowerCase() === searchTerm.toLowerCase()) {
      setFilteredDistricts([]);
      setShowDropdown(false);
      return;
    }
    
    setFilteredDistricts(filtered);
    setShowDropdown(filtered.length > 0);
    setSelectedIndex(-1);
    if (filtered.length > 0) {
      updateDropdownPosition();
    }
  }, [districtInput, country]);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node) &&
          inputRef.current && !inputRef.current.contains(event.target as Node)) {
        setShowDropdown(false);
      }
    };

    if (showDropdown) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => document.removeEventListener('mousedown', handleClickOutside);
    }
  }, [showDropdown]);

  const updateDropdownPosition = () => {
    if (inputRef.current) {
      const rect = inputRef.current.getBoundingClientRect();
      setDropdownPosition({
        top: rect.bottom + 6,
        left: rect.left,
        width: rect.width,
      });
    }
  };

  const validateDistrict = (districtValue: string): boolean => {
    if (!districtValue.trim()) {
      setDistrictError('');
      return true; // Prázdny okres je OK (voliteľné)
    }
    
    const normalizedInput = removeDiacritics(districtValue.trim());
    const isValid = DISTRICTS.some((d) => 
      removeDiacritics(d).toLowerCase() === normalizedInput.toLowerCase()
    );
    
    if (!isValid) {
      setDistrictError(t('skills.invalidDistrict', 'Neplatný okres. Vyber z navrhovaných možností.'));
      return false;
    }
    
    setDistrictError('');
    return true;
  };

  const handleDistrictInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newValue = e.target.value;
    setDistrictInput(newValue);
    onDistrictChange?.(newValue);
    setDistrictError(''); // Vymaž chybu pri písaní
    setTimeout(updateDropdownPosition, 0);
  };

  const handleDistrictBlur = () => {
    validateDistrict(districtInput);
  };

  const handleDistrictSelect = (selectedDistrict: string) => {
    setDistrictInput(selectedDistrict);
    onDistrictChange?.(selectedDistrict);
    setDistrictError(''); // Vymaž chybu pri výbere z dropdownu
    setShowDropdown(false);
    inputRef.current?.blur();
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (!showDropdown || filteredDistricts.length === 0) return;

    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setSelectedIndex((prev) => (prev < filteredDistricts.length - 1 ? prev + 1 : prev));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setSelectedIndex((prev) => (prev > 0 ? prev - 1 : -1));
    } else if (e.key === 'Enter' && selectedIndex >= 0) {
      e.preventDefault();
      handleDistrictSelect(filteredDistricts[selectedIndex]);
    } else if (e.key === 'Escape') {
      setShowDropdown(false);
    }
  };

  return (
    <div className="mb-4">
      <div className="flex gap-3">
        {/* Okres */}
        <div ref={containerRef} className="flex-1 relative">
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            {t('skills.districtTitle', 'Okres (voliteľné)')}
          </label>
          <input
            ref={inputRef}
            type="text"
            value={districtInput}
            onChange={handleDistrictInputChange}
            onBlur={handleDistrictBlur}
            onFocus={() => {
              // Skontroluj, či je okres už presne vyplnený a platný
              const trimmed = districtInput.trim();
              if (trimmed) {
                const normalizedInput = removeDiacritics(trimmed);
                const exactMatch = DISTRICTS.some((d) => 
                  removeDiacritics(d).toLowerCase() === normalizedInput.toLowerCase()
                );
                // Ak je presná zhoda, nezobrazuj dropdown
                if (exactMatch) {
                  setShowDropdown(false);
                  return;
                }
              }
              updateDropdownPosition();
              if (filteredDistricts.length > 0) {
                setShowDropdown(true);
              }
            }}
            onKeyDown={handleKeyDown}
            placeholder={t('skills.districtPlaceholder', 'Zadaj okres')}
            maxLength={50}
            className={`w-full px-3 py-2 border rounded-lg bg-white dark:bg-black text-gray-900 dark:text-white focus:ring-1 focus:ring-purple-300 focus:border-transparent ${
              districtError
                ? 'border-red-500 dark:border-red-500'
                : 'border-gray-300 dark:border-gray-700'
            }`}
          />
          {districtError && (
            <p className="text-xs text-red-500 mt-1">
              {districtError}
            </p>
          )}
          {showDropdown && filteredDistricts.length > 0 && dropdownPosition && typeof window !== 'undefined' && createPortal(
            <div
              ref={dropdownRef}
              className="fixed z-[9999] bg-white dark:bg-[#0f0f10] border border-gray-200 dark:border-gray-700 rounded-xl shadow-2xl max-h-64 overflow-y-auto overflow-x-hidden district-dropdown-scrollbar"
              style={{
                top: `${dropdownPosition.top}px`,
                left: `${dropdownPosition.left}px`,
                width: `${dropdownPosition.width}px`,
                boxShadow: '0 10px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)',
              }}
            >
              <div className="py-1">
                {filteredDistricts.map((d, index) => (
                  <button
                    key={d}
                    type="button"
                    onClick={() => handleDistrictSelect(d)}
                    className={`w-full text-left px-4 py-2.5 text-sm font-medium transition-all duration-150 ${
                      index === selectedIndex
                        ? 'bg-purple-100 dark:bg-purple-900/40 text-purple-900 dark:text-purple-200'
                        : 'text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-800/50'
                    } ${index === 0 ? 'rounded-t-lg' : ''} ${
                      index === filteredDistricts.length - 1 ? 'rounded-b-lg' : ''
                    }`}
                  >
                    {d}
                  </button>
                ))}
              </div>
            </div>,
            document.body
          )}
        </div>
        {/* Miesto - zobrazí sa len keď je vyplnený okres */}
        {districtInput.trim() !== '' && (
          <div className="flex-1">
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              {t('skills.locationTitle', 'Mesto/dedina (voliteľné)')}
            </label>
            <input
              type="text"
              value={value}
              onChange={(e) => onChange(e.target.value)}
              placeholder={t('skills.locationPlaceholder', 'Zadaj, kde ponúkaš svoje služby')}
              maxLength={25}
              onBlur={onBlur}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-700 rounded-lg bg-white dark:bg-black text-gray-900 dark:text-white focus:ring-1 focus:ring-purple-300 focus:border-transparent"
            />
          </div>
        )}
      </div>
      <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
        {t('skills.locationHint', 'Sem napíš, kde ponúkaš svoje služby a zručnosti.')}
      </p>
      {isSaving && (
        <p className="text-xs text-purple-600 dark:text-purple-300 mt-0.5">
          {t('skills.locationSaving', 'Ukladám miesto...')}
        </p>
      )}
      {error && (
        <p className="text-xs text-red-500 mt-0.5">
          {error}
        </p>
      )}
    </div>
  );
}


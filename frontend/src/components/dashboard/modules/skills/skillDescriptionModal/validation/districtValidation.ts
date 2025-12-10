'use client';

export const SLOVAK_DISTRICTS = [
  'Bánovce nad Bebravou', 'Banská Bystrica', 'Banská Štiavnica', 'Bardejov',
  'Bratislava I', 'Bratislava II', 'Bratislava III', 'Bratislava IV', 'Bratislava V',
  'Brezno', 'Bytča', 'Čadca', 'Detva', 'Dolný Kubín', 'Dunajská Streda',
  'Galanta', 'Gelnica', 'Hlohovec', 'Humenné', 'Ilava', 'Kežmarok', 'Komárno',
  'Košice I', 'Košice II', 'Košice III', 'Košice IV', 'Košice-okolie',
  'Krupina', 'Kysucké Nové Mesto', 'Levice', 'Levoča', 'Liptovský Mikuláš',
  'Lučenec', 'Malacky', 'Martin', 'Medzilaborce', 'Michalovce', 'Myjava',
  'Námestovo', 'Nitra', 'Nové Mesto nad Váhom', 'Nové Zámky', 'Partizánske',
  'Pezinok', 'Piešťany', 'Poltár', 'Poprad', 'Považská Bystrica', 'Prešov',
  'Prievidza', 'Púchov', 'Revúca', 'Rimavská Sobota', 'Rožňava', 'Ružomberok',
  'Sabinov', 'Senec', 'Senica', 'Skalica', 'Snina', 'Sobrance', 'Spišská Nová Ves',
  'Stará Ľubovňa', 'Stropkov', 'Svidník', 'Šaľa', 'Topoľčany', 'Trebišov',
  'Trenčín', 'Trnava', 'Turčianske Teplice', 'Tvrdošín', 'Veľký Krtíš',
  'Vranov nad Topľou', 'Zlaté Moravce', 'Zvolen', 'Žarnovica', 'Žiar nad Hronom', 'Žilina',
] as const;

export const removeDiacritics = (str: string): string => {
  return str.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();
};

export const isValidDistrict = (district: string): boolean => {
  if (!district || !district.trim()) {
    return false;
  }
  
  const normalizedInput = removeDiacritics(district.trim());
  return SLOVAK_DISTRICTS.some((d) => 
    removeDiacritics(d).toLowerCase() === normalizedInput.toLowerCase()
  );
};

export const scrollToDistrictInput = (): void => {
  setTimeout(() => {
    const districtInput = document.querySelector('input[placeholder*="okres" i]') as HTMLInputElement;
    if (districtInput) {
      districtInput.focus();
      districtInput.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }
  }, 100);
};


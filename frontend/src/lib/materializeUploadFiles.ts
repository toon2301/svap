/**
 * Súbory z FormData sa pred odoslaním skopírujú do pamäte.
 *
 * Dôvod: WebKit v iOS/Safari (hlásené od verzie 26.5, potvrdené aj na iOS 27.0.1)
 * pošle `File` z `<input type="file">` cez XHR/fetch s PRÁZDNYM telom
 * (`Content-Length: 0`). Fotka z iPhonu potom na server vôbec nedorazí: správa
 * skončí „Neplatné údaje“ a zmena avatara všeobecnou chybou. `File` zhotovený
 * z bajtov v pamäti sa posiela bez odkazu na súbor na disku, takže chybu obíde
 * (rovnaké riešenie používajú aj ďalšie projekty, ktoré chybu hlásili).
 *
 * Kopíruje sa len to, čo treba: FormData bez súboru sa vracia nezmenená a pri
 * zlyhaní čítania ostane pôvodný súbor, takže pomocník nikdy nezhorší nahrávanie,
 * ktoré by inak prešlo.
 */

import type { AxiosInstance } from 'axios';

/** Nad túto veľkosť sa súbor nekopíruje (limity fotiek v appke sú niekoľko MB). */
export const MAX_MATERIALIZED_FILE_BYTES = 32 * 1024 * 1024;

/** Prečíta bajty súboru; `FileReader` je záloha pre prostredia bez `Blob.arrayBuffer`. */
function readBytes(file: Blob): Promise<ArrayBuffer> {
  if (typeof file.arrayBuffer === 'function') {
    return file.arrayBuffer();
  }
  return new Promise<ArrayBuffer>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as ArrayBuffer);
    reader.onerror = () => reject(reader.error ?? new Error('Čítanie súboru zlyhalo.'));
    reader.readAsArrayBuffer(file);
  });
}

/** Je to FormData (v prostredí bez `FormData`, napr. SSR, vždy `false`)? */
export function isFormData(value: unknown): value is FormData {
  return typeof FormData !== 'undefined' && value instanceof FormData;
}

/** Obsahuje FormData aspoň jeden súbor, ktorý sa oplatí skopírovať? */
export function formDataHasFile(data: FormData): boolean {
  if (typeof File === 'undefined') return false;
  for (const [, value] of data.entries()) {
    if (value instanceof File && value.size > 0 && value.size <= MAX_MATERIALIZED_FILE_BYTES) {
      return true;
    }
  }
  return false;
}

/** Vráti kópiu súboru z pamäte (rovnaký názov, typ aj čas zmeny) alebo pôvodný súbor. */
async function copyFileToMemory(file: File): Promise<File> {
  if (file.size === 0 || file.size > MAX_MATERIALIZED_FILE_BYTES) return file;
  try {
    const bytes = await readBytes(file);
    return new File([bytes], file.name, { type: file.type, lastModified: file.lastModified });
  } catch {
    // Čítanie sa nepodarilo – odošle sa pôvodný súbor, ako doteraz.
    return file;
  }
}

/**
 * Vytvorí novú FormData s rovnakými poliami v rovnakom poradí, v ktorej sú súbory
 * nahradené kópiami z pamäte. Pôvodná FormData sa nemení.
 */
export async function materializeFormDataFiles(source: FormData): Promise<FormData> {
  if (!formDataHasFile(source)) return source;

  const copy = new FormData();
  for (const [key, value] of source.entries()) {
    if (typeof File !== 'undefined' && value instanceof File) {
      // Bez 3. argumentu: FormData tak ponechá práve tento `File` (s jeho názvom a typom).
      copy.append(key, await copyFileToMemory(value));
    } else {
      copy.append(key, value);
    }
  }
  return copy;
}

/**
 * Zapojí kopírovanie súborov do axios inštancie: každá požiadavka s FormData
 * obsahujúcou súbor dostane súbory z pamäte. Ostatné požiadavky prechádzajú bez zmeny.
 */
export function installFormDataFileMaterializer(instance: AxiosInstance): void {
  instance.interceptors.request.use((config) => {
    if (!isFormData(config.data) || !formDataHasFile(config.data)) return config;
    return materializeFormDataFiles(config.data).then((data) => {
      config.data = data;
      return config;
    });
  });
}

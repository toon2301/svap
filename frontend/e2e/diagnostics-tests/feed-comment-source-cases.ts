import { COMMENTS_PRIVATE_MARKER } from './feed-comments-page';

export const CAROUSEL_CASES = [
  { mode: 'carousel-ready', name: 'jediná dostupná cieľová fotka nepotrebuje navigáciu', ids: [301], start: 0, moves: 0, found: true },
  { mode: 'carousel-single-missing', name: 'jediná iná fotka nenahradí cieľový podklad', ids: [300], start: 0, moves: 0, found: false },
  { mode: 'carousel-rejected-single', name: 'zamietnutie počas prepnutia odstráni bodky, nie platný cieľ', ids: [300, 301], start: 0, moves: 1, found: true },
  { mode: 'carousel-rejected-pointer', name: 'zamietnutie počas stlačenia šípky nenahradí platný cieľ chybou', ids: [300, 301], start: 0, moves: 1, found: true },
  { mode: 'carousel-rejected-more', name: 'po zmene počtu fotiek pokračuje navigácia z aktuálneho stavu', ids: [300, 302, 303, 301], start: 0, moves: 2, found: true },
  { mode: 'carousel-five-wrap', name: 'päť fotiek sa prejde cyklicky najviac štyrmi krokmi', ids: [300, 302, 301, 303, 304], start: 3, moves: 4, found: true },
  { mode: 'carousel-missing', name: 'chýbajúci cieľ ukončí hľadanie po konečnom počte krokov', ids: [300, 302, 303, 304, 305], start: 0, moves: 4, found: false },
  { mode: 'carousel-stuck', name: 'nefunkčná šípka sa nezamení za dokončený posun', ids: [300, 301], start: 0, moves: 1, error: 'nepotvrdil posun' },
  { mode: 'carousel-wrong-direction', name: 'opačný smer šípky sa bez zmeny zoznamu neprijme ako správny posun', ids: [300, 302, 301, 303, 304], start: 0, moves: 1, error: 'nepotvrdil posun' },
  { mode: 'carousel-too-many', name: 'prekročenie limitu fotiek zlyhá pred prvým klikom', ids: [300, 302, 303, 304, 305, 306], start: 0, moves: 0, error: 'prekročil povolený počet' },
  { mode: 'carousel-invalid-active', name: 'chýbajúci aktívny slide zlyhá pred prvým klikom', ids: [300, 301], start: 0, moves: 0, error: 'nepotvrdil aktívny slide' },
] as const;
export type CarouselMode = typeof CAROUSEL_CASES[number]['mode'];

/** Iba lokálny DOM: zmena stavu sa vloží presne pri skutočnom pointerdown alebo click. */
export function syntheticCarouselPage(mode: CarouselMode): string {
  const scenario = CAROUSEL_CASES.find(item => item.mode === mode)!;
  return `<!doctype html><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
    <p>${COMMENTS_PRIVATE_MARKER}</p><div id="carousel"></div><script>
    const mode=${JSON.stringify(mode)};let ids=${JSON.stringify(scenario.ids)};let current=${scenario.start};let changed=false;
    const area=document.getElementById('carousel');area.dataset.moves='0';area.dataset.touch='0';area.dataset.mouse='0';
    function reject(){changed=true;ids=ids.filter(id=>id!==300);if(current>=ids.length)current=0;paint();}
    function paint(){
      area.replaceChildren();
      const image=document.createElement('div');image.setAttribute('data-testid','feed-image-open-'+ids[current]);area.append(image);
      if(ids.length<2)return;
      const next=document.createElement('button');next.setAttribute('data-testid','feed-image-next');next.textContent='Ďalšia fotka';
      next.style.cssText='display:block;width:180px;height:48px';
      next.onpointerdown=event=>{if(!event.isTrusted)return;area.dataset.moves=String(+area.dataset.moves+1);
        if(event.pointerType==='touch')area.dataset.touch=String(+area.dataset.touch+1);
        if(event.pointerType==='mouse')area.dataset.mouse=String(+area.dataset.mouse+1);
        if(mode==='carousel-rejected-pointer'&&!changed)reject();};
      next.onclick=()=>{if(mode==='carousel-stuck')return;current=(current+(mode==='carousel-wrong-direction'?ids.length-1:1))%ids.length;
        if(mode.startsWith('carousel-rejected-')&&!changed){reject();return;}paint();};area.append(next);
      const dots=document.createElement('div');dots.setAttribute('data-testid','feed-image-dots');
      ids.forEach((id,index)=>{const dot=document.createElement('button');dot.textContent=String(index+1);
        dot.setAttribute('aria-current',String(mode!=='carousel-invalid-active'&&index===current));dots.append(dot);});area.append(dots);
    }paint();</script>`;
}

# -*- coding: utf-8 -*-
"""Nové nálezy od čísla 251: položky zo zoznamu majiteľa „Svaply — otvorené nálezy a rozpracovaná práca“ (Nástenka; 251 až 269) a nálezy,
ktoré pribudli po ňom (270 až 281: kolega pri K6 a K7 a manuálny test majiteľa z 7. 11. 2026; 270, 271 a 273 sú už hotové, preto sú v
`hotove_dalsie.py`).

PDF poslal majiteľ 6. 11. 2026; zostavené je z konverzácie k 29. 9. 2026, preto sa každá položka porovnala s týmto zoznamom a s
kódom na `main` `ea9fb101` (celé mapovanie je v prílohe D). Sem prišli len položky, ktoré v zozname ešte neboli a nie sú zastarané.
Samostatný súbor kvôli limitu 500 riadkov; `polozky_nove.py` ich pripája do `NEW_ITEMS`. Pravidlá sú rovnaké ako inde: otvorený nález sa
po oprave odstráni odtiaľto a zapíše do `hotove_dalsie.DONE_SINCE_DALSIE`; čísla sa nikdy nepoužívajú znova.
"""

from konstanty import A, EL, EM, ES, H, N, P, S_, V  # noqa: F401

ZDROJ = 'zoznam majiteľa (príloha D; PDF z 6. 11. 2026, stav k 29. 9. 2026)'

NEW_ITEMS_NASTENKA = [
    dict(n=251, bucket=A, imp=S_, eff=ES, pkg='iPhone overenia',
         kratko='úplná prázdna obrazovka pri opakovanom vstupe na vlastný profil (piaty pokus, mobil), príčina neobjasnená',
         what='V pôvodnom hlásení o nenačítaní appky pri opakovanom vstupe na profil ostal jeden krok nevysvetlený s istotou: opakovaný vstup '
              'na vlastný profil, piaty pokus, skončil úplne prázdnou obrazovkou. Mohol zmiznúť ako vedľajší efekt iných opráv: nový '
              '`<main>` pri zmene modulu (commit `3356bc1b` z 29. 9. 2026) a podľa zoznamu majiteľa aj štyri opravy načítania profilu '
              '(nesprávny modul pri opakovanom kliku, večný spinner, preteky požiadaviek, chybová hláška); agent v kóde overil tlačidlo '
              '„Skúsiť znova“ (`retryViewedUserLoad`) a `AbortController` v `hooks/useDashboardUserProfile.tsx`. Cielene sa to však '
              'neoverilo.',
         note='Návrh: overiť na iPhone päť opakovaných vstupov na vlastný profil z Nástenky (Safari aj nainštalovaná PWA); ak sa prázdna '
              'obrazovka nezopakuje, zatvoriť rozhodnutím. Ak sa zopakuje, povýšiť na PRED NASADENÍM a zachytiť adresu, čas a prípadnú '
              'chybu z konzoly (bez osobných údajov). Zdroj má stav k 29. 9. 2026, odvtedy sa kód zmenil.',
         dec=None, src=ZDROJ),
    dict(n=252, bucket=P, imp=S_, eff=EM, pkg='Produkčná odolnosť aplikácie',
         kratko='nekonečná slučka v mobilnom onboardingu nových používateľov (zmapované v pôvodnej práci, nezačaté)',
         what='Samostatný nález v inej časti aplikácie, zmapovaný v pôvodnej práci a nezačatý: riziko zamrznutia mobilného onboardingu '
              'nových používateľov (nekonečná slučka). Majiteľa sa netýka priamo (jeho účet má onboarding preskočený), no ide o prvý dojem '
              'každého nového používateľa. Podrobnosti mapovania (súbor, riadok, spúšťač) v zozname nie sú. Agent slučku v tomto kole '
              'nehľadal ani nepotvrdil: vyhľadávanie v správach commitov našlo onboarding len pri refaktoroch `DashboardContent`. Mobilný '
              'onboarding je v `dashboard/onboarding/MobileOnboardingContext.tsx` (661 riadkov) a `MobileOnboardingOverlay.tsx` (763 '
              'riadkov), oba nad limitom 500 riadkov.',
         note='Neoverené. Majiteľ pôvodné mapovanie nemá (6. 11. 2026), preto ho zopakuje agent čítaním `MobileOnboarding*` a '
              'reprodukciou na novom účte; až potom sa určí závažnosť a oprava. Zaradené PRED NASADENÍM, lebo ide o prvý dojem nových '
              'používateľov; ak sa slučka nepotvrdí, presunúť alebo zatvoriť. Oba súbory sú nad 500 riadkov, takže zmena si vyžaduje '
              'nový súbor alebo výnimku od majiteľa.',
         dec=None, src=ZDROJ),
    dict(n=253, bucket=A, imp=N, eff=EM, pkg='Výkon a plynulosť',
         kratko='pomalé otvorenie a návrat z cudzieho portfólia na desktope (príčina nezmapovaná)',
         what='Na desktope je citeľne pomalšie otvorenie aj návrat z cudzieho portfólia. Príčina nie je zmapovaná, iba zaznamenaná.',
         note='Neoverené. Prvý krok je zmerať (záložka Network v prehliadači: ktorá požiadavka trvá a či sa niečo načítava dvakrát), nie '
              'hádať. Detail portfólia je `profile/PortfolioDetailModule.tsx`. Zdroj má stav k 29. 9. 2026, preto najprv overiť, že to '
              'ešte platí.',
         dec=None, src=ZDROJ),
    dict(n=254, bucket=A, imp=N, eff=EM, pkg='Nástenka a zdieľanie',
         kratko='po zdieľaní príspevku appka občas nepristane na Nástenke (pozorované asi 2×, nereprodukovateľné)',
         what='Po zdieľaní príspevku appka občas (pozorované približne dvakrát) vôbec nepristane na Nástenke. Nedá sa vyvolať na požiadanie; '
              'čaká sa na presnejší popis pri ďalšom výskyte. Pristátie rieši `feed/useFeedShareLanding.ts` (77 riadkov): Nástenka sa pri '
              'zobrazení zaregistruje ako cieľ, prevezme prípadné čakajúce zdieľanie (keď sa naň navigovalo z profilu) a počúva na živý '
              'signál; doscrollovanie beží, až keď karta príspevku existuje v DOM, a len raz pre dané ID (`scrolledRef`).',
         note='Neoverené, bez dôkazu o príčine. E2E špecy `sharing-from-profile.spec.ts` a `sharing-from-feed.spec.ts` pokrývajú bežné cesty '
              '(podľa zoznamu majiteľa prechádzajú proti produkcii). Návrh: pri ďalšom výskyte zapísať, odkiaľ sa zdieľalo (profil, karta, '
              'detail), na akom zariadení a či sa zmenila adresa; dovtedy nič nemeniť.',
         dec=None, src=ZDROJ),
    dict(n=255, bucket=A, imp=N, eff=ES, pkg='Navigácia – drobnosti',
         kratko='nová položka portfólia po vytvorení nemá zaznamenaný pôvod pre Späť (`ProfilePortfolioSection.tsx:112`)',
         what='Po vytvorení položky portfólia sa v `profile/ProfilePortfolioSection.tsx` (426 riadkov, riadok 112) volá '
              '`router.push(buildPortfolioDetailPath(...))` bez zaznamenania navigačného pôvodu, kým existujúce položky sa otvárajú cez '
              '`openPortfolioDetail(...)` (riadok 93): ten si cestu zapamätá a detail ju po zobrazení označí pôvodom '
              '(`adoptPortfolioDetailOrigin`, značka `__svaplyPortfolioDetailOrigin` v `history.state` v `profile/portfolioRouting.ts`), '
              'takže Späť je skutočný krok histórie. Späť z detailu novej položky sa preto správa ako pri vstupe bez pôvodu (odkaz, F5), '
              'nie ako pri ostatných. Podľa zoznamu majiteľa vedome odložené, nie zabudnuté.',
         note='Overil agent (6. 11. 2026). Návrh: pri vytvorení použiť `openPortfolioDetail` alebo overiť, prečo sa pri vytvorení nepoužíva '
              '(napr. kvôli zatvoreniu formulára), a doplniť test Späť po vytvorení.',
         dec=None, src=ZDROJ),
    dict(n=256, bucket=A, imp=N, eff=ES, pkg='Navigácia – drobnosti',
         kratko='`FeedLikersDialog.tsx` otvára profil vlastným eventom namiesto spoločného `openUserProfile()`',
         what='`feed/FeedLikersDialog.tsx` (209 riadkov) posiela v `goToProfile` priamo globálny event `goToUserProfile`, kým ostatné '
              'miesta Nástenky (`FeedPostCard`, `FeedPostComments`, `FeedPostMobileDetail`, `FeedPhotoViewerChrome`) volajú spoločné '
              '`openUserProfile()` z `feed/feedProfileNavigation.ts`. To okrem eventu robí aj `preloadProfileAvatar(...)` a '
              '`requestFeedReturnCapture(profileReturnEntry(id))` (uloženie stavu Nástenky, aby sa dalo vrátiť presne späť a aby Domov vedel, '
              'odkiaľ prišiel). Z dialógu zoznamu lajkujúcich sa preto avatar nepredhrá a stav Nástenky sa pred odchodom neuloží. Zoznam '
              'majiteľa uvádza aj reset nového vstupu; podľa komentára vo `feedProfileNavigation.ts` ho robí handler `goToUserProfile` pre '
              'všetkých odosielateľov, preto ho tu nepočítam.',
         note='Overil agent (6. 11. 2026). Dopad je malý (Späť alebo Domov po vstupe z lajkujúcich, avatar pri vstupe); presný vplyv na Späť sa '
              'neoveroval. Návrh: `goToProfile` nech volá `openUserProfile(user, { beforeNavigate: onClose })` a pribudne test ako pri '
              'ostatných miestach.',
         dec=None, src=ZDROJ),
    dict(n=257, bucket=A, imp=N, eff=EL, pkg='Nástroje a testy',
         kratko='E2E: rozšíriť pokrytie zdieľania a ďalších tokov Nástenky (priebežný cieľ, rieši Codex)',
         what='E2E infraštruktúra je hotová a dva testy zdieľania (zdieľanie vlastnej ponuky z profilu a zdieľanie priamo z karty na Nástenke; '
              '`e2e/sharing-from-profile.spec.ts` a `e2e/sharing-from-feed.spec.ts`) existujú. Zvyšok pokrytia je priebežný cieľ bez pevného '
              'konca, nie uzavretá úloha. Chýba viac scenárov zdieľania (z otvoreného detailu, z mobilných vrstiev, cudzie príspevky, Späť po '
              'zdieľaní z detailu) a širšie pokrytie ďalších tokov (história portfólia, nový vstup na profil, Nastavenia, zvýraznenie, '
              'záložky). Chýbajú aj komentáre (pridanie, odpoveď, úprava vlastného komentára, mazanie): `e2e/feed-post-detail.spec.ts` pokrýva '
              'len otvorenie a zatvorenie vrstvy komentárov. Úprava vlastného komentára (tlačidlo „Upraviť“ vo `FeedPostComments.tsx`) '
              'má testy len na backende (`accounts/test/test_feed_edit_api.py`); frontendové testy volanie `updateFeedPostComment` '
              'iba nahrádzajú prázdnou funkciou. Podobné medzery už vedú 110, 113, 157 a 233.',
         note='E2E súbory vlastní Codex (`AGENTS.md`); agent len eviduje. Pravidlá ostávajú: testy bežia proti Railway, WebKit (desktop aj '
              'mobil) je povinný a test, ktorý niečo vytvára, musí použiť existujúci testovací obsah alebo po sebe upratať. Výber '
              'scenárov a poradie určí majiteľ s Codexom.',
         dec=None, src=ZDROJ),
    dict(n=258, bucket=A, imp=N, eff=EM, pkg='Nástenka a zdieľanie',
         kratko='pôvodný autor zdieľaného príspevku (avatar a meno) nie je klikateľný na profil',
         what='Zvyšok 22-testového QA zdieľania, priorita 6: pôvodný autor repostu alebo zdieľaného príspevku (avatar a meno) má byť '
              'klikateľný všade (feed, detail, desktop, mobil); dnes nikde nie je. Agent v kóde našiel len preklik na samotný zdieľaný zdroj '
              '(`feed/feedSharedContentNavigation.ts`: ponuka na profil vlastníka, portfólio a príspevok na ich stránku); na mobile vedie '
              'náhľad zdieľaného príspevku do detailu zdieľajúceho príspevku, na desktope je nekliknuteľný (`FeedPostCard.tsx`). '
              'Samostatný preklik na profil pôvodného autora v náhľade sa nenašiel.',
         note='Návrh: v náhľade zdieľaného príspevku spraviť avatar a meno autora samostatným ovládacím prvkom cez spoločné '
              '`openUserProfile()`, s ohľadom na prípad, keď je zdieľajúci aj pôvodný autor (`isSelfShare` v `FeedPostCard.tsx`). '
              '`FeedPostCard.tsx` má 1 033 riadkov a `FeedPostMobileDetail.tsx` 594 (nad limitom), takže nová logika ide do nového súboru '
              'a zásah do týchto súborov si vyžaduje výnimku od majiteľa alebo ich rozdelenie (TECH-01…11).',
         dec=None, src=ZDROJ),
    dict(n=259, bucket=P, imp=S_, eff=ES, pkg='Vzhľad Nástenky',
         kratko='portfólio bez fotky má vyzerať rovnako ako ponuka alebo dopyt bez fotky (spoločný záložný vzhľad)',
         what='Zvyšok QA zdieľania, priorita 8: portfólio bez fotky má vyzerať presne ako ponuka alebo dopyt bez fotky, teda zjednotiť '
              'záložný obrázok; ruší to staršie rozhodnutie dať portfóliu vlastný vzhľad „bez fotky“. V kóde je v náhľadoch označenie '
              '„Bez fotografie“ (`skills.noPhoto`) v `feed/SharedContentPreviewCard.tsx` (327 riadkov); či sa vzhľad ponuky a portfólia '
              'líši, agent vizuálne neoveroval.',
         note='Majiteľ 6. 11. 2026: všetky vzhľadové veci sú pred nasadením. Neoverené (vizuálna vec). Návrh: spoločný komponent '
              'záložného obrázka pre ponuku, dopyt a portfólio; pred prácou ukázať majiteľovi dnešný aj cieľový vzhľad.',
         dec=None, src=ZDROJ),
    dict(n=260, bucket=A, imp=S_, eff=ES, pkg='Nástenka a zdieľanie',
         kratko='nedostupný pôvodný príspevok v reposte ukazuje popri neutrálnej správe aj starý text',
         what='Zvyšok QA zdieľania, priorita 9: nedostupný pôvodný príspevok vnútri obyčajného repostu má zobrazovať len neutrálnu správu '
              '„Tento príspevok už nie je dostupný“. Overil agent: `feed/SharedContentPreviewCard.tsx` pri `unavailable` pridá neutrálny '
              'riadok (kľúč `feed.sharedPostUnavailable`), no názov, popis a ďalšie údaje náhľadu ostávajú vykreslené (len stlmené, '
              '`opacity-60 saturate-50`; komentár v kóde hovorí, že stlmenie je jediný rozdiel nedostupného zdroja), takže starý text sa '
              'stále zobrazuje. Backend pre nedostupný zdroj (zmazaný, skrytý alebo súkromný vlastník) zámerne posiela len snapshot: '
              '`get_shared_content` v `accounts/feed_serializers.py`.',
         note='Súkromie: starý text zmazaného alebo skrytého príspevku zostáva čitateľný každému, kto vidí repost. Návrh: pri `unavailable` '
              'vykresliť len neutrálnu správu a rozhodnúť, či sa snapshot (text) z odpovede backendu vôbec má posielať; test na oboch '
              'stranách. Frontend súbor má 327 riadkov, takže sa smie meniť.',
         dec=None, src=ZDROJ),
    dict(n=261, bucket=P, imp=S_, eff=EL, pkg='Vzhľad Nástenky',
         kratko='Nástenka: tri nezačaté skupiny úprav z pôvodného backlogu zdieľania (mobilné doladenia, komentáre, tagy)',
         what='Z pôvodného backlogu zdieľania o ôsmich skupinách ostávajú tri nezačaté. Skupina 6, mobilné doladenia: komentárová textarea '
              'vyššia a väčšia (neprilepená na spodok); „Viac“ vo fotoprehliadači inline len keď je text orezaný; veľmi dlhé popisky zmenšiť '
              'fontom namiesto orezania a zrušiť „Menej“; drag handle vo fotoprehliadači zjednodušiť na šípku; väčší odstup spodného '
              'riadku akcií od okraja; menu „…“ presunúť do riadku akcií; „Zobraziť odpovede (N)“ bližšie k riadku akcií; s nízkou prioritou '
              'predpripraviť ďalšiu fotku v karuseli. Skupina 7, redizajn komentárov (mobil aj desktop, detail aj karta): plochý layout v '
              'štýle Facebooku bez bublín na pozadí; odpovede vnorené a vizuálne prepojené bez vlastnej bubliny; jemný oddeľovač medzi '
              'komentármi najvyššej úrovne; rozbalenie „Zobraziť odpovede“ má automaticky doscrollovať na prvú odpoveď s kúskom kontextu '
              'rodiča. Skupina 8, redizajn tagov (všade, kde sa zobrazujú): zrušiť farebné čipy a nahradiť ich obyčajným textom `@Meno`, '
              'ktorý rešpektuje svetlý a tmavý režim; tagy na vlastný riadok pod textom, ktoré sa balia a rozbaľujú spolu s „Viac“.',
         note='Majiteľ 6. 11. 2026: všetky vzhľadové veci sú pred nasadením. Dizajnové priania, nie chyby; stav v kóde sa neoveroval okrem '
              'komentárov: komentár aj odpoveď majú dnes sivú bublinu (`rounded-2xl bg-gray-100`, v tmavom režime `bg-gray-800/60`) '
              'v `FeedPostComments.tsx`, takže redizajn skupiny 7 je stále otvorený. Dotýka sa súborov nad 500 riadkov '
              '(`FeedPostComments.tsx` 1 487, `FeedPostCard.tsx` 1 033, `FeedPostMobileDetail.tsx` 594), takže pred štartom práce '
              'treba rozhodnúť R23 (najprv rozdeliť súbory, alebo výnimka z pravidla 500 riadkov). Majiteľ plánuje upraviť vizuálnu '
              'stránku Nástenky aj sám (príloha D); po jeho úpravách nasleduje technická a bezpečnostná kontrola jeho zmien a jeden '
              'súhrnný audit celej Nástenky (obe strany spolu), tiež pred nasadením. Poradie dohodnúť, aby sa nerobilo dvakrát.',
         dec='ROZHODNUTIE R23', src=ZDROJ),
    dict(n=262, bucket=A, imp=N, eff=EL, pkg='Funkcie – väčšie balíky',
         kratko='zoznam „kto lajkol“ je len pre Nástenku; rozšírenie na ponuky, portfólio a profil nie je rozhodnuté',
         what='Zoznam lajkujúcich dnes existuje len pre Nástenku (`feed/FeedLikersDialog.tsx`); jeho rozšírenie na ponuky, portfólio a '
              'profil má nerozhodnutý rozsah a súkromie (kto zoznam vidí).',
         note='Najprv rozhodnutie (R20), potom návrh a backend. Agent v tomto kole nezisťoval, ktoré koncové body lajkov dnes vracajú '
              'zoznam.',
         dec='ROZHODNUTIE R20', src=ZDROJ),
    dict(n=263, bucket=A, imp=N, eff=EL, pkg='Funkcie – väčšie balíky',
         kratko='zobrazenie Nástenky podľa krajiny nad rámec radenia nemá definovaný rozsah',
         what='Podľa zoznamu majiteľa krajina dnes len ovplyvňuje poradie príspevkov na Nástenke (krajinové radenie feedu je hotové); '
              'širšie zobrazenie podľa krajiny (napr. filter alebo oddelené feedy) má nedefinovaný rozsah.',
         note='Najprv rozhodnutie (R21). Podobný produktový návrh pre vyhľadávanie je APP-04. Ide o funkciu, nie o chybu.',
         dec='ROZHODNUTIE R21', src=ZDROJ),
    dict(n=264, bucket=A, imp=N, eff=EM, pkg='Navigácia – drobnosti',
         kratko='audit nedostupného obsahu: žiadosti pri zmazaní ponuky a štyri tiché miesta (správy, portfólio, upozornenia)',
         what='Staršie odložené položky spred práce na Nástenke: (1) SkillRequest audit: presmerovania z upozornení pri zmazaní ponuky '
              'počas výmeny alebo po nej. (2) UX audit nedostupného obsahu: zastaraný filter v upozorneniach žiadostí, tichý `null` peer '
              'alebo skupina v správach, všeobecné opakovanie na detaile portfólia a chýbajúci `target_url` pri zrušenej žiadosti. Rozsah '
              'nie je zmapovaný.',
         note='Neoverené, stav k 29. 9. 2026. Čiastočne súvisí s 74 (kontrola existencie cieľa pri všetkých typoch upozornení, R4) a 18 '
              '(hlavička konverzácie mimo prvej stránky, overiť a zatvoriť). Prvý krok: samostatné mapovanie (len čítanie), potom rozdeliť '
              'na malé nálezy.',
         dec=None, src=ZDROJ),
    dict(n=265, bucket=A, imp=N, eff=EL, pkg='Funkcie – väčšie balíky',
         kratko='verejné SEO stránky: anonymné prehliadanie ponúk a profilov',
         what='Anonymné prehliadanie ponúk a profilov (verejné stránky pre vyhľadávače); podľa zoznamu majiteľa zdieľa technický základ '
              's Nástenkou (feed).',
         note='Funkcia po štarte; súvisí s N2 (doména) a so súkromím (len verejné profily, `is_public`; blokovanie). Agent nič neoveroval.',
         dec=None, src=ZDROJ),
    dict(n=266, bucket=P, imp=S_, eff=ES, pkg='Súkromie a krajina',
         kratko='overiť na produkcii, že obrázky správ idú cez proxy aplikácie a v S3 nie sú verejné',
         what='Manuálny test zo zoznamu majiteľa: obrázky v správach majú ísť cez proxy aplikácie, nie cez priamy odkaz na S3. Podľa kódu je '
              'to tak navrhnuté: `messaging/storage.py` vedie fotky správ v súkromnom úložisku (`default_acl = private`, podpísané adresy) '
              'a `messaging/api/serializers.py` vracia adresu proxy `MessageImageView` (`accounts:messaging_message_image`), ktorá '
              'overuje členstvo v konverzácii. Na živom nasadení (S3) to agent neoveril.',
         note='Návrh manuálneho testu (Railway alebo nový server): otvoriť fotku v správach a v nástrojoch prehliadača skontrolovať, že '
              'adresa je z domény aplikácie; potom tú istú adresu skúsiť v súkromnom okne bez prihlásenia (musí sa odmietnuť). Test '
              'adresy proxy sám neoverí, či je objekt dostupný priamo zo S3, preto skúsiť aj priamu nepodpísanú adresu toho istého '
              'objektu v S3 bez prihlásenia: prístup sa musí odmietnuť (kontrola ACL a politiky bucketu). Zaradené PRED NASADENÍM, lebo '
              'ide o súkromie správ; pri novom serveri zopakovať (N9, N14).',
         dec=None, src=ZDROJ),
    dict(n=267, bucket=A, imp=N, eff=EM, pkg='Údaje a cache',
         kratko='dôvody nahlásení: v databáze môže byť zmes starých textov a stabilných kódov',
         what='Produkčná databáza má podľa zoznamu majiteľa zmiešaný formát dôvodov nahlásenia (starý preložený text oproti novým stabilným '
              'kódom). V kóde: frontend (`shared/ReportPhotoModal.tsx`) posiela stabilné kódy `inappropriate`, `spam`, `fake` a `other`; '
              'modely nahlásení (`accounts/models/reports.py`) majú `reason` ako voľný `CharField(max_length=100)` bez `choices`, takže sa '
              'starý text a nové kódy v dátach môžu miešať. Stav produkčnej databázy sa z kódu overiť nedá.',
         note='Neoverené. Návrh: najprv zistiť rozdelenie hodnôt `reason` v produkcii (dotaz s počtami, bez textov popisov), potom dátová '
              'migrácia starých textov na kódy (alebo mapovanie pri čítaní) a `choices` na poli.',
         dec=None, src=ZDROJ),
    dict(n=268, bucket=A, imp=N, eff=EM, pkg='Upratovanie a architektúra',
         kratko='dôvod odmietnutia fotky na Nástenke sa mapuje podľa presného textu z backendu (treba stabilný kód)',
         what='Overil agent: `feed/feedImageRejection.ts` prekladá dôvod odmietnutia fotky podľa presných textov z backendu '
              '(`rejected_reason` je voľný text v slovenčine bez diakritiky, napr. „Obrazok bol zamietnuty kvoli nevhodnemu obsahu.“); mapa '
              'je primárne kľúčovaná stabilnými kódmi (`image_rejected_content`, `image_rejected_format`, `image_rejected_processing`) a '
              'súčasné texty sú len aliasy. Zmena textu na backende tak potichu padne na všeobecnú hlášku „Túto fotku sa nepodarilo '
              'nahrať.“.',
         note='Návrh: nové pole `rejected_code` na backende (model obrázka príspevku, serializér, migrácia) so stabilnými kódmi; po prechode '
              'zmazať aliasy. Dovtedy je dobré mať test súladu textov backendu s aliasmi.',
         dec=None, src=ZDROJ),
    dict(n=272, bucket=P, imp=N, eff=ES, pkg='Profil a identita',
         kratko='meno recenzenta v okne „Pridať recenziu“ berie len osobné meno alebo e-mail (firma dostane e-mail)',
         what='Kolega pri K6: meno recenzenta v okne „Pridať recenziu“ (`RequestsDesktop.tsx:74–78`, `RequestsMobile.tsx:92–96`) berie len '
              'osobné meno (meno a priezvisko), a keď chýba, e-mail. Agent to potvrdil čítaním kódu: `company_name` ani používateľské meno sa '
              'nepoužijú, takže účet bez osobného mena (napr. firemný) ukáže v okne e-mail. Je to ten istý druh chyby ako nález 119 (opravený '
              'len pre hornú lištu mobilu).',
         note='Oba súbory majú nad 500 riadkov (`RequestsDesktop.tsx` 646, `RequestsMobile.tsx` 706), takže zmena vyžaduje delenie súboru '
              'alebo výnimku od majiteľa. Návrh: spoločný pomocník v novom súbore (napr. nad `getProfileDisplayName` z '
              '`lib/profileDisplayName.ts`) a jedno volanie v každom z oboch súborov. Kolega ho označil ako nízky.',
         dec=None, src='K6 (kolega)'),
    dict(n=274, bucket=P, imp=S_, eff=EM, pkg='Zdieľanie a obrázky',
         kratko='fotky v príspevkoch na Nástenke sa na jednom testovacom účte nenačítajú (pokazený obrázok), na druhom sú v poriadku',
         what='Majiteľ pri manuálnom teste po K7 (7. 11. 2026): v príspevkoch na Nástenke sa fotky nezobrazujú správne, na mobile aj na '
              'desktope rovnako. Na snímke obrazovky (príspevok z 5. 9. 2026 s dvoma fotkami, karusel „1/2“) je namiesto fotky ikona '
              'pokazeného obrázka a alternatívny text „Fotka príspevku (1/2)“. Deje sa to len po prihlásení do jedného testovacieho účtu '
              '(účet A, hlavný testovací účet majiteľa); po prihlásení do druhého testovacieho účtu (účet B) sa fotky zobrazujú správne na '
              'mobile aj na počítači. Kvôli tomu sa nedal urobiť posledný manuálny test K7 (zdieľaná karta po zmazaní fotky, nález 91). Opis '
              'nehovorí, či sa v účte A nenačítajú fotky všetkých príspevkov (aj cudzích), alebo len jeho vlastných; snímka ukazuje príspevok '
              'samotného účtu A.',
         note='Nezmapované (rozhodnutie majiteľa 7. 11. 2026: príčinu nájde kolega; agent ho nemapoval). Súvislosti bez dôkazu: účet B '
              'nevidí príspevky účtu A (nález 275), takže rozdiel medzi účtami môže mať spoločnú príčinu; symptóm (pokazený obrázok bez '
              'náhrady) zodpovedá tomu, že karusel príspevku (`feed/FeedPostImageCarousel.tsx`) používa `BlurredContainImage` bez '
              '`onError` (nález 279), no `onError` by riešil len chýbajúcu náhradu, nie to, prečo sa obrázok nenačíta. Pri mapovaní z '
              'výpisov len cesty bez ID a slugov, stav odpovede a časy (AGENTS.md).',
         dec=None, src='manuálny test majiteľa, 7. 11. 2026'),
    dict(n=275, bucket=H, imp=V, eff=EM, pkg='Viditeľnosť medzi účtami',
         kratko='účet B nevidí účet A (hľadanie, ponuky, príspevky, profil), hoci medzi nimi nie je blokovanie; účet A vidí účet B normálne',
         what='Majiteľ pri manuálnom teste po K7 (7. 11. 2026): z účtu A (hlavný testovací účet) sa normálne nájde účet B (druhý testovací '
              'účet) aj jeho ponuky a vidno jeho príspevky. Po prihlásení do účtu B je to naopak a nefunguje nič z toho: (1) účet A sa nedá '
              'vôbec vyhľadať, nenájdu sa ani jeho ponuky; (2) jeho príspevky sa na Nástenke vôbec nezobrazujú; (3) v Správach sa '
              'konverzácia s ním ukáže, no po otvorení jeho profilu z konverzácie sa zobrazí „Profil používateľa sa nepodarilo načítať.“. '
              'Majiteľ skontroloval, že medzi účtami nie je žiadne aktívne blokovanie. Obáva sa, že ide o problém v databáze (v dátach), '
              'a považuje nález za závažný.',
         note='Nezmapované (rozhodnutie majiteľa 7. 11. 2026: príčinu nájde kolega; agent ho nemapoval). Zaradené HNEĎ: ide o '
              'neviditeľnosť účtu v celej aplikácii (hľadanie, ponuky, Nástenka, profil) s možnou príčinou v dátach, takže zatiaľ nie je '
              'jasné, či sa nedotkne aj skutočných používateľov; ak sa ukáže, že ide len o stav dát jedného testovacieho účtu, nález '
              'presunúť. Neoverené, či sa to týka aj iných účtov (majiteľ testoval len tieto dva). Rovnaké dva testovacie účty sú aj v náleze 274 (fotky); '
              'súvislosť nie je preukázaná. Pri mapovaní z výpisov '
              'len cesty bez ID a slugov, názvy parametrov, počty a časy (AGENTS.md).',
         dec=None, src='manuálny test majiteľa, 7. 11. 2026'),
    dict(n=276, bucket=P, imp=S_, eff=EM, pkg='Navigácia a Späť',
         kratko='mobil: pri prepínaní medzi hlavnými obrazovkami obsah krátko preblikne',
         what='Majiteľ pri manuálnom teste po K7 (7. 11. 2026): na mobile pri preskakovaní medzi oknami (napr. z profilu na Nástenku, z '
              'Nástenky do Správ a podobne) obsah krátko preblikne. Nevyzerá to na opätovné načítanie stránky, ale na jemný rýchly preblik; '
              'podľa majiteľa sa to nedá prehliadnuť. Zariadenie a prehliadač majiteľ neuviedol.',
         note='Nezmapované (rozhodnutie majiteľa 7. 11. 2026: príčinu nájde kolega; agent ho nemapoval). Možná súvislosť bez dôkazu: pri '
              'zmene modulu sa od opravy scrollu (commit `3356bc1b` z 29. 9. 2026) vytvára nový `<main>` (`useDashboardMainKey`), čo môže '
              'pri prepnutí obnoviť obsah; z opisu nie je jasné, či preblik vznikol až po ňom. Vzhľadová vec, preto PRED NASADENÍM '
              '(rozhodnutie majiteľa 6. 11. 2026).',
         dec=None, src='manuálny test majiteľa, 7. 11. 2026'),
    dict(n=277, bucket=A, imp=N, eff=ES, pkg='Prístupnosť',
         kratko='pruh o stave pripojenia nemá `role` ani `aria-live`, čítač obrazovky zmenu neoznámi',
         what='Kolega pri K7: `OfflineIndicator.tsx` nemá na pruhu o strate a obnovení pripojenia `role` ani `aria-live`, takže čítač '
              'obrazovky zmenu pripojenia neoznámi. Agent potvrdil čítaním kódu (v súbore nie je ani jedno).',
         note='Návrh: `role="status"` s `aria-live="polite"` (pri výpadku môže byť `role="alert"`) a test. Pruh je od K7 po obnovení '
              'pripojenia viditeľný 3 s (nález 270), takže oznam má zmysel.',
         dec=None, src='K7 (kolega)'),
    dict(n=278, bucket=A, imp=N, eff=ES, pkg='Upratovanie a architektúra',
         kratko='`handleUserUpdate` má prázdny (no-op) updater `setActiveRightItem`',
         what='Kolega pri K7: `handleUserUpdate` v `hooks/useDashboardState.ts` volá `setActiveRightItem((prev) => …)`, ktorého updater vo '
              'všetkých vetvách vráti `prev`, takže nič nemení (komentáre v ňom opisujú „zachovať“ aj „inak nastaviť edit-profile“, no aj '
              'posledná vetva vráti `prev`). Agent potvrdil čítaním kódu.',
         note='Len nahlásené: súbor má 922 riadkov (nad limitom 500; jedinú výnimku z pravidla má nález 271, R24), takže sa nemení. '
              'Odstrániť pri delení súboru (TECH-01…11), spolu so zvyškom starej vetvy „prepnúť na profil s edit módom“ vo '
              '`handleUserUpdate`, ktorá po oprave 271 platí už len pre moduly, ktoré nie sú sekciou Nastavení.',
         dec=None, src='K7 (kolega)'),
    dict(n=279, bucket=P, imp=N, eff=ES, pkg='Zdieľanie a obrázky',
         kratko='`BlurredContainImage` bez `onError` na ďalších šiestich miestach: po zmazanej fotke môže vzniknúť pokazený obrázok',
         what='Po K7 (nález 91) hlási zlyhanie načítania obrázka cez `onError` len zdieľaná karta (`SharedContentPreviewCard.tsx`). '
              '`BlurredContainImage` sa používa bez `onError` aj v `feed/FeedPostImageCarousel.tsx` (fotky príspevku), '
              '`shared/OfferImageCarousel.tsx`, `profile/PortfolioCard.tsx`, `profile/PortfolioDetailHero.tsx`, '
              '`profile/PortfolioGalleryImageTile.tsx` a `FavoritesModule.tsx`, takže tam po zmazaní fotky (alebo pri nedostupnom súbore) '
              'môže vzniknúť ten istý pokazený obrázok. Hlásil kolega; agent počet miest overil vyhľadávaním (šesť súborov), správanie na '
              'jednotlivých miestach nikto netestoval.',
         note='Chránené obrázky (cez `useProtectedImage`) pri chybe nechajú neutrálne pozadie, verejné adresy ukážu pokazený obrázok. '
              'Súvisí s 91 a so snímkou majiteľa v nálezu 274 (pokazená fotka v karuseli príspevku): ten nález by `onError` sám '
              'nevyriešil, ide len o náhradu. Návrh: rovnaká náhrada ako pri 91, miesto po mieste; karusel príspevku má vlastný layout, '
              'treba rozhodnúť, čo ukázať, keď zlyhá jedna fotka z viacerých. Všetkých šesť súborov má najviac 335 riadkov.',
         dec=None, src='K7 (kolega)'),
    dict(n=280, bucket=A, imp=N, eff=ES, pkg='Navigácia – drobnosti',
         kratko='mobil: priamy vstup na adresu sekcie Nastavení nastaví `isRightSidebarOpen = true`, vstup zo zoznamu nie',
         what='Kolega pri K7: na mobile priamy vstup na adresu sekcie Nastavení nastaví `isRightSidebarOpen = true`, kým vstup zo zoznamu '
              'Nastavení otvorí sekciu ako samostatnú obrazovku bez otvoreného pravého panela. Dopad je neoverený; agent to nepotvrdzoval.',
         note='Súvisí s 271: v stave „profil + otvorený pravý panel“ sa skrýva spodný panel. Treba overiť na mobile priamy vstup na adresy '
              'sekcií Nastavení (nová karta, odkaz): či sa spodný panel a Späť správajú rovnako ako po vstupe zo zoznamu.',
         dec=None, src='K7 (kolega)'),
    dict(n=281, bucket=A, imp=N, eff=ES, pkg='Upratovanie a architektúra',
         kratko='Obľúbené: šesť záložných textov bez diakritiky (ukážu sa len pri chýbajúcom preklade)',
         what='Kolega pri K7: vo `FavoritesModule.tsx` majú záložné texty `favorites.loading`, `favorites.emptyTitle`, `favorites.emptyHint`, '
              '`favorites.unknownUser`, `skills.message` a `favorites.removeAction` slovenčinu bez diakritiky (napr. „Nacitavam oblubenych '
              'pouzivatelov...“, „Pouzivatel“, „Sprava“, „Odobrat“). Agent potvrdil čítaním kódu. Preklady existujú, takže sa záložný text '
              'ukáže len pri chýbajúcom preklade. K7 opravil len dva pomenované texty (`favorites.loadError`, `favorites.removeError`).',
         note='Návrh: doplniť diakritiku v záložných textoch (jedna malá úprava vo `FavoritesModule.tsx`, 236 riadkov). Súvisí s 175 '
              '(časť Obľúbené je hotová) a 204 (kontrola použitých kľúčov).',
         dec=None, src='K7 (kolega)'),
]

# -*- coding: utf-8 -*-
"""Nové nálezy od čísla 251: položky zo zoznamu majiteľa „Svaply — otvorené nálezy a rozpracovaná práca“ (Nástenka).

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
         note='Neoverené. Prvý krok: majiteľ pošle výsledok pôvodného mapovania (alebo ho agent zopakuje čítaním `MobileOnboarding*` a '
              'reprodukciou na novom účte); až potom sa určí závažnosť a oprava. Zaradené PRED NASADENÍM, lebo ide o prvý dojem nových '
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
              'záložky). Podobné medzery už vedú 110, 113, 157 a 233.',
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
    dict(n=259, bucket=A, imp=N, eff=ES, pkg='Nástenka a zdieľanie',
         kratko='portfólio bez fotky má vyzerať rovnako ako ponuka alebo dopyt bez fotky (spoločný záložný vzhľad)',
         what='Zvyšok QA zdieľania, priorita 8: portfólio bez fotky má vyzerať presne ako ponuka alebo dopyt bez fotky, teda zjednotiť '
              'záložný obrázok; ruší to staršie rozhodnutie dať portfóliu vlastný vzhľad „bez fotky“. V kóde je v náhľadoch označenie '
              '„Bez fotografie“ (`skills.noPhoto`) v `feed/SharedContentPreviewCard.tsx` (327 riadkov); či sa vzhľad ponuky a portfólia '
              'líši, agent vizuálne neoveroval.',
         note='Neoverené (vizuálna vec). Návrh: spoločný komponent záložného obrázka pre ponuku, dopyt a portfólio; pred prácou ukázať '
              'majiteľovi dnešný aj cieľový vzhľad.',
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
    dict(n=261, bucket=A, imp=N, eff=EL, pkg='Nástenka a zdieľanie',
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
         note='Dizajnové priania, nie chyby; stav v kóde sa neoveroval (zdroj má stav k 29. 9. 2026). Dotýka sa súborov nad 500 riadkov '
              '(`FeedPostComments.tsx` 1 487, `FeedPostCard.tsx` 1 033, `FeedPostMobileDetail.tsx` 594), takže redizajn komentárov si pred '
              'štartom práce vyžaduje rozdelenie týchto súborov (TECH-01…11) alebo výnimku. Majiteľ plánuje upraviť vizuálnu stránku '
              'Nástenky aj sám (príloha D), preto poradie dohodnúť, aby sa nerobilo dvakrát.',
         dec=None, src=ZDROJ),
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
              'adresa je z domény aplikácie; potom tú istú adresu skúsiť v súkromnom okne bez prihlásenia (musí sa odmietnuť). Zaradené '
              'PRED NASADENÍM, lebo ide o súkromie správ; pri novom serveri zopakovať (N9, N14).',
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
    dict(n=269, bucket=A, imp=S_, eff=EL, pkg='Funkcie – väčšie balíky',
         kratko='overovací odznak: dnes svieti každému s overeným e-mailom, pravidlo „kto a podľa čoho“ chýba',
         what='Zoznam majiteľa vedie odznak ako úplne novú funkciu s tým, že aplikácia nemá koncept „overeného používateľa“. Podľa kódu '
              '(overil agent, 6. 11. 2026) odznak už existuje: `User.is_verified` („Overený“) sa nastaví pri overení e-mailu '
              '(`accounts/models/verification.py`), frontend ukazuje `VerifiedBadge` pri avatare profilu (`UserAvatar.tsx`), vo výsledkoch '
              'vyhľadávania (dve miesta) a v zozname konverzácií a odporúčania radia overené účty vyššie (`recommendations.py`). Odznak '
              'teda dostane každý, kto potvrdí e-mail. Pre prémiovú úroveň je pripravený aj príznak `can_use_verified_badge` v '
              '`accounts/services/entitlements.py`, no ani frontend, ani backend ním odznak nepodmieňuje.',
         note='Dnešný odznak neznamená overenie totožnosti ani kvality, iba potvrdený e-mail, no pre používateľa vyzerá ako „overený účet“ '
              '(text `common.verifiedAccount`). Pred štartom treba aspoň rozhodnúť (R22), či sa odznak zatiaľ skryje alebo premenuje; '
              'kritériá a udeľovanie (ručne administrátorom, alebo ako prémiová funkcia) môžu prísť po štarte.',
         dec='ROZHODNUTIE R22', src=ZDROJ),
]

# -*- coding: utf-8 -*-
"""Príloha D zoznamu nálezov: mapovanie zoznamu majiteľa „Svaply — otvorené nálezy a rozpracovaná práca“ (Nástenka) na tento zoznam.

PDF poslal majiteľ 6. 11. 2026; je zostavené z konverzácie k 29. 9. 2026, takže veľká časť je zastaraná alebo už vedená. Každá položka
sa porovnala s týmto zoznamom a s kódom na `main` `ea9fb101` a tabuľka hovorí, čo z nej vzniklo. Kontrola v `model.py` overí, že
každý odkaz v `ids` existuje (nález, ID z registra, úloha N alebo rozhodnutie).
"""

# Záznam: pdf = položka v zozname majiteľa, stav = čo z nej je dnes, kde = odkaz čitateľný v texte, ids = odkazy na kontrolu.
RIADKY = [
    dict(pdf='Scroll-restore bug na profile (najvyššia priorita, mobil)',
         stav='Vyriešené. Trvalá oprava `3356bc1b` (29. 9. 2026): nový `<main>` pri každej zmene modulu (`useDashboardMainKey`); podľa '
              'správy commitu na iPhone 10 z 10 čistých vstupov oproti 4 z 5 zlyhaní bez neho. Dočasný ladiaci pás `?debugscroll=1` je '
              'odstránený (`617051c0`, 15. 10. 2026, po dokončení meraní na iPhone). Majiteľ môže pre istotu zopakovať päť vstupov z '
              'hlboko odscrollovanej Nástenky v produkcii.',
         kde='pôvodný zoznam 126, 131', ids=['126', '131']),
    dict(pdf='Rovnaký druh chyby pri prechodoch Profil → Nastavenia, profil → profil a mobilné Vyhľadávanie → profil',
         stav='Pokryté tou istou opravou (každá zmena modulu dostane nový `<main>`); `DashboardMainIdentitySweep.test.tsx` prechádza celý '
              'katalóg modulov a `e2e/dashboard-main-identity.spec.ts` overuje identitu `<main>` na WebKite.',
         kde='commit `3356bc1b`', ids=[]),
    dict(pdf='Profil s odrezaným menom pri vstupe cez ikonu; profil dole bez zvýraznenia po dlhšej pauze',
         stav='Rieši tá istá oprava (rovnaký mechanizmus podľa popisu commitu).',
         kde='commit `3356bc1b`', ids=[]),
    dict(pdf='Appka sa niekedy vôbec nenačíta: nesprávny modul pri opakovanom kliku, večný spinner, preteky požiadaviek, chybová hláška',
         stav='Opravené a nasadené (podľa zoznamu majiteľa). V kóde overené: tlačidlo „Skúsiť znova“ (`retryViewedUserLoad`) a '
              '`AbortController` v `hooks/useDashboardUserProfile.tsx`.',
         kde='kód (`useDashboardUserProfile.tsx`); v zozname nie je samostatný nález', ids=[]),
    dict(pdf='Nekonečná slučka pri mobilnom onboardingu',
         stav='Otvorené, neoverené; PRED NASADENÍM. Podrobnosti pôvodného mapovania chýbajú.',
         kde='nález 252', ids=['252']),
    dict(pdf='Timeout obnovy prihlásenia počas výpadku (hypotéza)',
         stav='Doplnené do existujúceho nálezu o obnove prihlásenia; „minišatúry“ cez Django namiesto CDN (v PDF; čítam ako miniatúry '
              'obrázkov) patria k úlohe N9.',
         kde='nález 245, N9', ids=['245', 'N9']),
    dict(pdf='Úplná prázdna obrazovka (jeden scenár, piaty pokus)',
         stav='Otvorené, neobjasnené; po oprave scrollu a načítania profilu pravdepodobne zmizlo, treba overiť na iPhone.',
         kde='nález 251', ids=['251']),
    dict(pdf='Šesť okrajových nálezov: `setHighlightedSkillId(null)` a `sessionStorage`, ochrana `?from=push` a `#top`, neplatné ID '
             'zvýraznenia, nedosiahnuteľná vetva `null` v `parseRequestsTargetUrl`, nadbytočné `setIsSearchOpen(false)` a pod., '
             'poškodené znaky v komentároch',
         stav='Všetkých šesť už je v zozname. Pri 21 pribudlo overenie, že adresy `?from=push` a `#top` sa v kóde nikde nevytvárajú, '
              'pri 24 že surový setter zálohu nemaže (hook má `clearHighlighting()`).',
         kde='nálezy 24, 21, 22, 23, 26, 30 (a 83, 89, 96)', ids=['24', '21', '22', '23', '26', '30', '83', '89', '96']),
    dict(pdf='Legacy mobilný detail príspevku cez upozornenia',
         stav='Doplnené do existujúceho nálezu o dvoch obrazovkách detailu príspevku.',
         kde='nález 70 (súvisí s 13 a 46)', ids=['70', '13', '46']),
    dict(pdf='Pomalé cudzie portfólio na desktope',
         stav='Nový nález, nezmapované (najprv zmerať).',
         kde='nález 253', ids=['253']),
    dict(pdf='Intermitentný bug „landing sa nespustí“ po zdieľaní',
         stav='Nový nález, nereprodukovateľné (čaká sa na presnejší popis).',
         kde='nález 254', ids=['254']),
    dict(pdf='Portfólio položka bez pôvodu pre Späť (`ProfilePortfolioSection.tsx:112`)',
         stav='Nový nález; riadok 112 overený (`router.push` bez `openPortfolioDetail`).',
         kde='nález 255', ids=['255']),
    dict(pdf='`FeedLikersDialog.tsx` obchádza spoločný vstup na profil `openUserProfile()`',
         stav='Nový nález; overené (vlastný event bez `preloadProfileAvatar` a `requestFeedReturnCapture`).',
         kde='nález 256', ids=['256']),
    dict(pdf='Playwright E2E testovanie',
         stav='Infraštruktúra a dva testy zdieľania existujú; zvyšok pokrytia je priebežný cieľ pre Codexa.',
         kde='nález 257 (súvisí s 110, 113, 157, 233)', ids=['257', '110', '113', '157', '233']),
    dict(pdf='QA zdieľania, priorita 6: pôvodný autor repostu nie je klikateľný',
         stav='Nový nález.', kde='nález 258', ids=['258']),
    dict(pdf='QA zdieľania, priorita 8: portfólio bez fotky vyzerá inak než ponuka bez fotky',
         stav='Nový nález (vizuálne neoverené).', kde='nález 259', ids=['259']),
    dict(pdf='QA zdieľania, priorita 9: nedostupný pôvodný príspevok v reposte ukazuje starý text',
         stav='Nový nález; v kóde overené, že starý text ostáva (len stlmený), a backend ho zámerne posiela.',
         kde='nález 260', ids=['260']),
    dict(pdf='QA zdieľania, priorita 7: panel upozornení na desktope nechá celú appku vyscrollovať',
         stav='Vyriešené: PR #190 (vetva 133; panel na PC po scrolle už neodpojí celú aplikáciu od okna, commit `11a6f093`, E2E '
              '`ee0f66de`).',
         kde='séria Upozornenia (časť 7)', ids=[]),
    dict(pdf='QA zdieľania, testy 15–16: číselná adresa → slug',
         stav='Pokryté E2E špecom `profile-numeric-language.spec.ts` (Codex); súvisí s 191 a 222.',
         kde='nálezy 191, 222', ids=['191', '222']),
    dict(pdf='Skupiny 6–8: mobilné doladenia, redizajn komentárov, redizajn tagov',
         stav='Nový nález (jeden pre všetky tri skupiny), dizajnové priania.',
         kde='nález 261', ids=['261']),
    dict(pdf='FE UI na mazanie a správu vlastných príspevkov (`can_manage`)',
         stav='Zastarané: frontend `can_manage` používa (`FeedPostMobileDetail.tsx`, `FeedPhotoViewerChrome.tsx`), mazanie je vo '
              '`FeedPostCard.tsx` a v mobilnom detaile (`deleteFeedPost`) a úprava v `FeedPostEditModal`.',
         kde='nič nepribudlo', ids=[]),
    dict(pdf='Zoznam „kto lajkol“ mimo Nástenky',
         stav='Nový nález s čakajúcim rozhodnutím o rozsahu a súkromí.', kde='nález 262, rozhodnutie R20', ids=['262', 'R20']),
    dict(pdf='Zobrazenie Nástenky podľa krajiny nad rámec radenia',
         stav='Nový nález s čakajúcim rozhodnutím o rozsahu.', kde='nález 263, rozhodnutie R21', ids=['263', 'R21']),
    dict(pdf='Vlastný vizuálny pass majiteľa na Nástenke',
         stav='Plán, nie nález: majiteľ upraví vizuálnu stránku Nástenky a nahlási, keď bude hotový; potom technická bezpečnostná '
              'kontrola jeho zmien a jeden súhrnný audit celej Nástenky (obe strany spolu). Má predchádzať nálezu 261, aby sa '
              'nerobilo dvakrát.',
         kde='nález 261 (poznámka)', ids=['261']),
    dict(pdf='SkillRequest audit a UX audit nedostupného obsahu',
         stav='Nový nález, nezmapované.', kde='nález 264 (súvisí s 74 a 18)', ids=['264', '74', '18']),
    dict(pdf='Verejné SEO stránky', stav='Nový nález (funkcia po štarte).', kde='nález 265', ids=['265']),
    dict(pdf='CI s PostgreSQL (testy súbehu sa na SQLite potichu preskakovali)',
         stav='Hotové: job `backend-postgres` (PostgreSQL 17) beží v CI od vetvy 157.', kde='nález 212 (časť 7)', ids=['212']),
    dict(pdf='Rozdelenie veľkých FE súborov',
         stav='Všetkých šesť súborov je v nadlimitnom zozname; doplnené pravidlo „po jednom a po každom manuálny test“.',
         kde='TECH-01…11', ids=['TECH-01']),
    dict(pdf='Manuálny test S3 správ (cez proxy aplikácie, nie priamy odkaz)',
         stav='Nový nález PRED NASADENÍM; kód je navrhnutý správne (súkromné úložisko a proxy), chýba overenie na živom nasadení.',
         kde='nález 266', ids=['266']),
    dict(pdf='Migrácia kódov dôvodov nahlásenia',
         stav='Nový nález; stav produkčnej databázy sa z kódu nedá overiť.', kde='nález 267', ids=['267']),
    dict(pdf='Mapovanie dôvodu odmietnutia fotky na Nástenke',
         stav='Nový nález; overené (presné texty z backendu ako aliasy).', kde='nález 268', ids=['268']),
    dict(pdf='Overovací odznak (verified badge)',
         stav='Nový nález; v kóde odznak už existuje a dostane ho každý s overeným e-mailom, takže ide o jeho význam.',
         kde='nález 269, rozhodnutie R22', ids=['269', 'R22']),
    dict(pdf='Kľúčové rozhodnutia (sedem)',
         stav='Zapísané ako rozhodnuté R13 až R19 (časť 6). Časť o tlačidle Domov z 29. 9. (vždy čistá Nástenka od vrchu) prekonala '
              'oprava 159 (PR #180): Domov vráti na zapamätané miesto a druhý klik ide na vrch.',
         kde='rozhodnutia R13–R19, nález 159', ids=['R13', 'R19', '159']),
    dict(pdf='„Čo je už hotové“: fázy 4.1–4.5 Nástenky, štatistiky a návštevy profilu, audit blokovania a hlasovania, CI, audit portfólia',
         stav='Informatívne; nič sa nezapisuje.', kde='—', ids=[]),
    dict(pdf='Metodika (mapovanie bez zmeny kódu, mutačné testy, kontrola Rabbit pred manuálnym testom, manuálne testy v jednom zozname)',
         stav='Zhoduje sa s dnešným postupom.', kde='README, `AGENTS.md`', ids=[]),
]


def priloha_d(d):
    """Zapíše do dokumentu `d` prílohu D: mapovanie zoznamu majiteľa z 6. 11. 2026 na tento zoznam (jeden riadok na položku PDF)."""
    d.w('Majiteľ poslal 6. 11. 2026 druhý zoznam „Svaply — otvorené nálezy a rozpracovaná práca“ (okolo Nástenky). Je zostavený z '
        'konverzácie k 29. 9. 2026, takže pred zápisom sa každá jeho položka porovnala s týmto zoznamom a s kódom na `main` '
        f'`ea9fb101`. Z {len(RIADKY)} položiek je veľká časť zastaraná alebo už vedená; nové nálezy majú čísla 251–269, rozhodnutia '
        'R13–R22. Tabuľka hovorí, čo z každej položky vzniklo, takže PDF netreba udržiavať popri tomto zozname.')
    d.w()
    d.tabulka(['Položka v zozname majiteľa', 'Stav k 6. 11. 2026', 'Kde v zozname'], [[r['pdf'], r['stav'], r['kde']] for r in RIADKY])

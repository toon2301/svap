# Dymový test po nasadení (majiteľ, asi 5 minút)

Po každom zlúčení dávky, pred zlúčením ďalšej. Na iPhone s nainštalovanou PWA a s dvoma testovacími účtami. Do chatu patrí len výsledok (žiadne adresy, ID ani mená).

1. **Prihlásenie:** odhlásiť sa a prihlásiť (e-mail a heslo). Prihlásenie prejde a Nástenka sa načíta.
2. **Fotka na Nástenke:** otvoriť fotku príspevku. Zobrazí sa.
3. **Správa a push:** druhý účet pošle správu; iPhone zamknúť a pred odoslaním počkať 40 s (kým vyprší označenie „konverzácia je otvorená“). Správa je v konverzácii a push príde. Pred testom skontrolovať, že `WEB_PUSH_MESSAGES_ROLLOUT_PERCENT` v Railway je 100 (R33), inak push dostane len časť účtov.
   - **Ak push neprišiel,** pozrieť v logu workera riadok `message_push_delivery_summary`:
     - `skipped_reason=disabled`: push na správy je vypnutý na serveri (`WEB_PUSH_MESSAGES_ENABLED`).
     - `skipped_reason=rollout_N`: push je zapnutý len pre N % účtov.
     - `skipped_reason=suppressed` (`suppressed_count` aspoň 1): príjemca mal konverzáciu otvorenú; počkať 40 s.
     - `skipped_reason=no_active_subscriptions`: príjemca nemá aktívny odber; v Upozorneniach vypnúť a zapnúť Správy.
     - `skipped_reason=invalid_sender_config`: chýba alebo je chybné nastavenie odosielateľa (premenné z ďalšieho bodu).
     - `gone_count` aspoň 1: odber je zrušený; v Upozorneniach vypnúť a zapnúť Správy.
     - `delivered_count` aspoň 1: push služba prijala požiadavku pre aspoň jeden odber účtu. Nemusí to byť iPhone a nepotvrdzuje to zobrazenie oznámenia, preto samotný počet príčinu neurčuje (pozri kontrolu odberu nižšie).
   - **Ak riadok `message_push_delivery_summary` chýba,** úloha nebežala alebo skončila skôr. Pozrieť v logu workera varovanie „Web push delivery skipped because configuration is invalid“ a skontrolovať, že v Railway sú nastavené (neprázdne) premenné `WEB_PUSH_VAPID_PRIVATE_KEY` a `WEB_PUSH_VAPID_SUBJECT`; ich hodnoty nikam nepísať. Ak varovanie nie je, pozrieť, či worker beží.
   - **Kontrola odberu iPhonu** (keď je `delivered_count` aspoň 1 a oznámenie sa nezobrazilo): v administrácii Djanga (Web push subscriptions) vybrať odbery testovacieho účtu. Označenie zariadenia (`device_label`) aplikácia neposiela, takže býva prázdne; iPhone rozpoznať podľa `user_agent` (obsahuje „iPhone“) a času vytvorenia. Ak je podobných zariadení viac, vypnúť a zapnúť Správy na iPhone: starý odber sa zmaže a vznikne nový, ktorého čas vytvorenia zodpovedá tomu okamihu. Pri odbere sledovať aktívny, posledné úspešné odoslanie a počet zlyhaní. Na iPhone skontrolovať oznámenia pre Svaply, režim Sústredenie a PWA pridanú na plochu. Service worker (`public/sw.js`) volá `showNotification` pri každom prijatom push.
4. **Fotka:** nahrať fotku (príspevok alebo ponuka) a obnoviť stránku. Fotka ostane viditeľná.
5. **Nastavenia:** otvoriť Súkromie, Blokované, Upozornenia a Sledovanie. Bez prázdnej obrazovky a bez chyby.
6. **Uloženie:** zmeniť jedno nastavenie (napr. Správy vypnúť a zapnúť), zavrieť a znova otvoriť. Hodnota sa zachovala.
7. **Len po dávke s prihlásením alebo CSRF:** nechať aplikáciu 10 až 15 minút na pozadí a vrátiť sa. Používateľ ostane prihlásený.
8. **Len po dávke so závislosťami alebo infra:** v Railway štartujú backend-http, backend-ws, worker a beat bez chýb.
9. **Len po dávke s kartou príspevku na Nástenke** (na počítači aj na iPhone; vzhľad a správanie musia byť presne také ako pred dávkou): vyskúšať príspevok na Nástenke podľa odrážok (karta dávky uvádza, ktoré).
   - Lajk: klik zafarbí srdiečko a zmení počet, ďalší klik ho vráti. Počet pri srdiečku (keď je väčší ako 0) otvorí zoznam lajkujúcich.
   - Komentáre: na počítači otvoria okno detailu príspevku (sekcia komentárov sa v karte nerozbaľuje), na iPhone obrazovku detailu.
   - Zdieľanie: otvorí okno zdieľania.
   - Okno detailu na počítači (príspevok s fotkou, rozbaliť dlhší text): riadok s ikonami ostáva pri spodku okna a okno sa nepretiahne.
   - Zdieľaný obsah (ponuka, portfólio a repost príspevku): náhľad vyzerá rovnako ako predtým. Známe odchýlky, ktoré sa opravia po redizajne a v teste sa nehlásia znova: text zdieľajúceho sa nad náhľadom ponuky a portfólia nezobrazuje (nález 358) a text pôvodného príspevku v reposte nemá „Viac“ (nález 357). Ťuk na náhľad ponuky otvorí ponuku na profile jej vlastníka, na náhľad portfólia jeho detail, fotka v reposte prehliadač fotky pôvodného príspevku; na iPhone ťuk na repostnutý príspevok mimo fotky otvorí obrazovku detailu, na počítači ostáva nekliknuteľný.
   - Označenia (druhý účet označí prvý v príspevku): pod príspevkom sú „@Meno“; pri vlastnom označení je „x“, ktorý otvorí potvrdenie, a po potvrdení označenie zmizne.
   - Okno detailu na počítači so zdieľanou ponukou alebo portfóliom (aj s označeniami a dlhším textom zdieľajúceho): hlavička a riadok s ikonami ostávajú na mieste; ak sa náhľad nezmestí, posúva sa len on vnútri okna, nie celé okno.
   - Zoznam lajkujúcich a okno zdieľania (počítač aj iPhone): zoznam lajkujúcich sa dá zatvoriť; okno zdieľania po zatvorení bez odoslania nič nezmení, po odoslaní sa nový príspevok vloží navrch feedu a okno sa zavrie.
   - Nahlásenie (cudzí príspevok): menu „…“ → Nahlásiť otvorí okno nahlásenia; po odoslaní je v menu „Už nahlásené“.
   - Úprava a zmazanie (vlastný skúšobný príspevok): menu „…“ → Upraviť otvorí okno úpravy a po uložení karta ukáže nový text (známa odchýlka, ktorá sa v teste nehlási: okno zdieľania ukáže po úprave ešte starý text, nález 355); menu „…“ → Zmazať otvorí potvrdenie a po potvrdení príspevok zo zoznamu zmizne.
   - Vrstvy na iPhone: ťuk na fotku otvorí prehliadač fotky, ťuk na text alebo na ikonu komentárov obrazovku detailu a v reposte ťuk na fotku prehliadač fotky pôvodného príspevku; každá vrstva sa zavrie a vráti na kartu a po zdieľaní z vrstvy sa všetky zavrú a navrchu je nový príspevok.
   - Hlavička karty: avatar, meno a čas (pri vlastnom upravenom príspevku aj „(upravené)“) vyzerajú rovnako ako predtým; klik alebo ťuk na avatar alebo meno otvorí profil autora; zdieľaný príspevok (repost, ponuka, portfólio) má nad hlavičkou riadok „… zdieľa ďalej“.
   - Menu „…“: otvorí sa pod tlačidlom a zatvorí sa druhým klikom na „…“, klikom mimo menu a na počítači klávesom Escape (po ňom ostane fokus na tlačidle „…“); pri cudzom príspevku je v menu len Nahlásiť, pri vlastnom aj Upraviť a Zmazať; každá položka menu ho zavrie a otvorí príslušné okno.
   - Hlavička v okne detailu na počítači (príspevok s fotkou a príspevok len s dlhším textom): hlavička a „…“ sú hore a neprekrývajú sa s „X“ okna; pri príspevku s fotkou hlavička stojí hore aj po rozbalení dlhšieho textu; menu otvorené v okne je viditeľné nad oknom a dá sa naň kliknúť; klik na avatar alebo meno okno zatvorí a otvorí profil autora.
   - Tmavý režim: ikony majú rovnaké farby ako predtým, aktívne srdiečko je fialové.
   - Tmavý režim, hlavička: farby avatara, mena, času a tlačidla „…“ sú rovnaké ako predtým.

**Výsledok** jedným riadkom agentovi: „prešlo“ alebo „neprešlo: krok N, čo sa stalo, približný čas“. Pri zlyhaní push pošli aj počty z riadku `message_push_delivery_summary` (bez ID), alebo napíš, že riadok v logu chýba.
Kým test neprejde, ďalšia dávka sa nezlučuje. Pri HNEĎ chybe po nasadení platí postup v `README.md`, časť „Postup od K15“.

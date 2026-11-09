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

**Výsledok** jedným riadkom agentovi: „prešlo“ alebo „neprešlo: krok N, čo sa stalo, približný čas“. Pri zlyhaní push pošli aj počty z riadku `message_push_delivery_summary` (bez ID), alebo napíš, že riadok v logu chýba.
Kým test neprejde, ďalšia dávka sa nezlučuje. Pri HNEĎ chybe po nasadení platí postup v `README.md`, časť „Postup od K15“.

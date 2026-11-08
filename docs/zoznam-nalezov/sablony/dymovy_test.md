# Dymový test po nasadení (majiteľ, asi 5 minút)

Po každom zlúčení dávky, pred zlúčením ďalšej. Na iPhone s nainštalovanou PWA a s dvoma testovacími účtami. Do chatu patrí len výsledok (žiadne adresy, ID ani mená).

1. **Prihlásenie:** odhlásiť sa a prihlásiť (e-mail a heslo). Prihlásenie prejde a Nástenka sa načíta.
2. **Fotka na Nástenke:** otvoriť fotku príspevku. Zobrazí sa.
3. **Správa a push:** druhý účet pošle správu; iPhone zamknúť a pred odoslaním počkať 40 s (kým vyprší označenie „konverzácia je otvorená“). Správa je v konverzácii a push príde.
4. **Fotka:** nahrať fotku (príspevok alebo ponuka) a obnoviť stránku. Fotka ostane viditeľná.
5. **Nastavenia:** otvoriť Súkromie, Blokované, Upozornenia a Sledovanie. Bez prázdnej obrazovky a bez chyby.
6. **Uloženie:** zmeniť jedno nastavenie (napr. Správy vypnúť a zapnúť), zavrieť a znova otvoriť. Hodnota sa zachovala.
7. **Len po dávke s prihlásením alebo CSRF:** nechať aplikáciu 10 až 15 minút na pozadí a vrátiť sa. Používateľ ostane prihlásený.
8. **Len po dávke so závislosťami alebo infra:** v Railway štartujú backend-http, backend-ws, worker a beat bez chýb.

**Výsledok** jedným riadkom agentovi: „prešlo“ alebo „neprešlo: krok N, čo sa stalo, približný čas“. Pri zlyhaní push pošli aj počty z riadku `message_push_delivery_summary` (bez ID).
Kým test neprejde, ďalšia dávka sa nezlučuje. Pri HNEĎ chybe po nasadení platí postup v `README.md`, časť „Postup od K15“.

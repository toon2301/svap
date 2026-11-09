# Poznámky bez čísla

Pripomienky, ktoré nemajú dôkaz alebo dopad na používateľa (štýl, hypotéza, nitpick bota). Číslo dostanú, až keď sa nájde dôkaz a dopad; vtedy ich agent presunie do zoznamu nálezov. Jeden riadok na poznámku: dátum, zdroj, jedna veta, `súbor`.

- 9. 11. 2026 · agent (nález 318) · pri štarte backendu zapísať do logu hodnoty `WEB_PUSH_MESSAGES_ENABLED` a `WEB_PUSH_MESSAGES_ROLLOUT_PERCENT` (bez tajomstiev), aby sa nastavenie rollout nehľadalo ako chyba kódu · `accounts/services/webpush_rollout.py`.
- 9. 11. 2026 · kolega (K15, commit `3cceeba1`) · `ResetPasswordClient.tsx`: ESLint hlási nepoužitú premennú (riadok 56) a `any` (riadok 129), staré chyby mimo zmeny · `frontend/src/app/reset-password/[uidb64]/[token]/ResetPasswordClient.tsx`.

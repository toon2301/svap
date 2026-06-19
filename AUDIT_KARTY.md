# Audit „Card" flow (OfferedSkill / ponuky)

Dátum: 2026-06-19
Rozsah: vytvorenie, úprava, fotky, tagy, zdieľanie, mazanie, zobrazenie kariet
(`OfferedSkill` + `OfferedSkillImage`).

Legenda stavu:
- ✅ **Opravené v tejto session**
- 🔜 **Odporúčam neskôr** (dôvod uvedený)
- ☑️ **Bez nálezu** (overené, OK)

---

## 🔴 Kritická

- [x] ✅ **D1/Phase 1 — Fotky zaseknuté navždy v „Spracúva sa…"**
  Na Railway nebežal Celery worker → presigned upload vytvoril `PENDING` záznam,
  task `process_offered_skill_image.delay()` sa nikdy nespracoval.
  *Súbor:* [railway.json](railway.json), [accounts/views/skills.py:607](backend/accounts/views/skills.py#L607)
  *Oprava:* pridaná `worker` služba do railway.json + management command
  [`reprocess_pending_offer_images`](backend/accounts/management/commands/reprocess_pending_offer_images.py)
  na dospracovanie zaseknutých fotiek. **Pozn.:** vyžaduje nastavenie env premenných
  pre worker v Railway dashboarde (AWS_*, GCP Vision, SECRET_KEY…).

---

## 🟠 Vysoká

- [x] ✅ **B2/D5 — Orphaned súbory v storage po zmazaní (GDPR + náklady)**
  Signály pre `OfferedSkillImage` robili len cache-invalidáciu; **žiadny `post_delete`
  nemazal S3 objekty**. Zmazanie fotky, karty (CASCADE) ani účtu (CASCADE) reálne
  neodstránilo súbory zo storage → osamotené súbory navždy + používateľ „zmazal" dáta,
  ktoré fyzicky zostali.
  *Súbor:* [accounts/signals.py](backend/accounts/signals.py), [accounts/views/skills.py:286](backend/accounts/views/skills.py#L286), [:641](backend/accounts/views/skills.py#L641)
  *Oprava:* nový `post_delete` receiver `delete_offer_image_files_after_delete`
  + helper `_delete_offer_image_storage`, ktorý best-effort zmaže `image`, `pending_key`
  aj `approved_key`. Pokrýva mazanie fotky, karty aj účtu.

- [x] ✅ **A3 (UX bug) — `validate_input_safety` blokoval legitímne popisy**
  SQL-pattern regex `(\'|\"|;|--|...)` **raisoval** `ValidationError` na bežných
  znakoch (apostrof, bodkočiarka, úvodzovky) → používateľ nemohol uložiť napr.
  „Som expert; 10+ rokov praxe". Reálnu SQLi ochranu nepridáva (ORM je parametrizovaný).
  *Súbor:* [accounts/offer_serializers.py:301-317,435](backend/accounts/offer_serializers.py#L301)
  *Oprava:* nahradené `HtmlSanitizer.sanitize_html` (popis, podrobný popis, lokalita, tagy).

---

## 🟡 Stredná

- [x] ✅ **A3 — XSS-at-rest v popise/tagoch (defense-in-depth)**
  User-generated text sa neukladal sanitizovaný. Render je síce cez React (auto-escape,
  žiadny `dangerouslySetInnerHTML` v repe → praktické riziko nízke), ale chýbala
  ochrana na úrovni úložiska.
  *Oprava:* `HtmlSanitizer.sanitize_html` na `description`, `detailed_description`,
  `location`, `tags` → nebezpečné tagy sa odstránia pred uložením.

- [x] ✅ **A2 — Upload overuje len príponu, nie reálny obsah súboru**
  [`validate_image_file`](backend/swaply/validators.py) kontroloval len príponu +
  veľkosť + SafeSearch, ale **nie magic bytes**. Súbor `.jpg`, ktorý bol v skutočnosti
  napr. PHP skript, prešiel validáciou.
  *Oprava:* nový modul [`swaply/image_signature.py`](backend/swaply/image_signature.py)
  deteguje reálny formát z magic bytes (jpeg/png/gif/webp/bmp/tiff **+ HEIC/HEIF bez
  Pillow**, takže neblokuje iPhone fotky). `validate_image_file` po kontrole prípony
  odmietne súbor, ktorého obsah nie je rozpoznaný obrázok. Pokrýva avatary, portfolio,
  messaging aj multipart upload ponúk.
  *Pozn.:* presigned/prod cesta ponúk je už krytá plným `PIL.Image.open()` decode v
  [staged_image_moderation.py](backend/swaply/staged_image_moderation.py) / workeri.

- [ ] 🔜 **C1/C5 — Duplicitná upload/validačná logika portfolio vs ponuky**
  Paralelné, takmer identické pipeline pre `PortfolioImage` a `OfferedSkillImage`
  ([portfolio/image_storage.py](backend/portfolio/image_storage.py) vs nový offer helper;
  [swaply/tasks/offer_images.py](backend/swaply/tasks/offer_images.py) vs
  [portfolio_images.py](backend/swaply/tasks/portfolio_images.py); presigned views v oboch).
  *Prečo nie hneď:* je to architektonický refaktor (zdieľaný image-service), širší
  rozsah a riziko regresie naprieč dvoma modulmi — mimo „nízko rizikové".

- [ ] 🔜 **B3/B4 — Zdieľanie fotiek s tretími stranami + súhlas**
  Obrázky idú do AWS S3 a ich bajty sa posielajú do **Google Vision (SafeSearch)**.
  Treba overiť, že privacy policy toto pokrýva a že existuje súhlas pred zverejnením
  karty s fotkou (najmä ak je na nej tvár).
  *Prečo nie hneď:* právne/produktové rozhodnutie + UI, nie čistý code-fix.

---

## 🟢 Nízka

- [ ] 🔜 **A2b — Presigned POST neobmedzuje Content-Type uploadnutého objektu**
  [skill_images_upload_init_view](backend/accounts/views/skills.py#L490) má len
  `content-length-range`. Klient môže nastaviť ľubovoľný Content-Type na objekt v
  `uploads/`. Riziko nízke (kľúč sa neexponuje cez API a po spracovaní sa maže;
  finálny `media/` objekt píše worker s `image/webp`). Zvážiť pridanie podmienky na
  `Content-Type` a aby `uploads/` nebol verejný.

- [ ] 🔜 **C3 — Nekonzistentný formát chýb**
  Časť endpointov vracia `{"error": "..."}`, serializer chyby vracajú field-dict
  (`{"field": ["..."]}`). Frontend to musí riešiť dvojako. Kozmetické, zjednotiť neskôr.

- [ ] 🔜 **C4 — Mŕtvy kód**
  `SecurityValidator.validate_input_safety` už nie je volaný z offer flow (XSS vetva
  aj tak len logovala). Ponechané kvôli iným prípadným callerom — pri upratovaní overiť
  a prípadne odstrániť.

- [ ] 🔜 **B5 — Logovanie**
  V `DEBUG` sa logujú len **kľúče** payloadu (nie hodnoty), CAPTCHA loguje len meta.
  Citlivé dáta sa nelogujú. OK; len dať pozor pri budúcich `logger.info(request.data)`.

---

## ☑️ Overené bez nálezu

- [x] ☑️ **A1 — Autorizácia (IDOR):** edit/PUT/PATCH/DELETE karty len vlastník
  (`is_owner = skill.user_id == request.user.id`, [skills.py:233-250](backend/accounts/views/skills.py#L233));
  fotky cez `get(id=skill_id, user=request.user)`. Cudzí používateľ nevidí skryté/privátne karty.
- [x] ☑️ **A4 — SQL injection v search:** všetko cez Django ORM `Q(...__icontains=...)`
  (parametrizované), žiadne raw SQL/`.extra()`/`cursor()`.
  [search.py](backend/accounts/views/search.py), [search_global.py](backend/accounts/views/search_global.py)
- [x] ☑️ **A5 — Rate limiting:** create/edit/delete/upload majú `@api_rate_limit`.
- [x] ☑️ **A6 — Únik citlivých dát:** card serializer nevracia email/telefón vlastníka;
  skryté karty sa nevracajú non-ownerovi.
- [x] ☑️ **D2/D3 — Race / bypass:** DB `UniqueConstraint(user, category, subcategory)`
  bráni duplicitným kartám aj pri dvojkliku; backend validuje nezávisle od frontendu.
- [x] ☑️ **D4 — Veľké obrázky:** worker robí resize na max 1600 px + WebP q82
  ([offer_images.py](backend/swaply/tasks/offer_images.py)) — neukladajú sa originály (prod).
- [x] ☑️ **D6 — Timeout pomalého uploadu:** upload ide priamo do S3 (presigned),
  obchádza backend; 120 s expirácia presigned URL.

---

## Zhrnutie opráv v tejto session

| Nález | Závažnosť | Súbor |
|-------|-----------|-------|
| Worker na Railway + reprocess command | 🔴 | railway.json, reprocess_pending_offer_images.py |
| Orphaned storage cleanup (post_delete) | 🟠 | accounts/signals.py |
| Odstránený false-positive SQL bloker | 🟠 | accounts/offer_serializers.py |
| XSS sanitizácia popisu/tagov/lokality | 🟡 | accounts/offer_serializers.py |

**Validované:** delete API testy (5 passed), serializer/district testy (6 passed),
manuálne overenie sanitizácie a storage-cleanup helpera.

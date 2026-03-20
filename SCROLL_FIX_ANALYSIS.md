# Analýza: Scroll na vrch po uložení profilu

## Root cause (100% istota)

**Príčina:** V `ModuleRouter.tsx` existujú **dve odlišné return vetvy** pre profil v edit móde vs. view móde:

1. **Edit móde** (riadky 105–128): Keď `isRightSidebarOpen && activeRightItem === 'edit-profile'`, ModuleRouter vracia `<ProfileModule ... isEditMode={true} />` z **prvého if bloku** (early return).

2. **Po uložení:** `handleSave` → `onEditCancel()` → `handleRightSidebarToggle()` nastaví `isRightSidebarOpen = false`.

3. **View móde:** Prvá podmienka už neplatí, ModuleRouter prepadne do `switch (activeModule)` → `case 'profile'` (riadky 200–222) a vráti `<ProfileModule ... isEditMode={isRightSidebarOpen} />`.

4. **Dôsledok:** React vidí dve **rôzne inštancie** ProfileModule – jednu z prvého if a druhú zo switch. Pri zmene podmienky jedna komponenta sa **odmountuje** a druhá **namountuje**. Keď sa obsah v scroll kontajneri (`<main>`) celý zmení, pozícia scrollu sa typicky **resetuje na 0**.

## Tok udalostí

```
Používateľ klikne Uložiť
  → api.patch('/auth/profile/') OK
  → setEditableUser(null)
  → onEditCancel() = handleRightSidebarToggle()
  → setIsRightSidebarOpen(false)
  → ModuleRouter: prvý if (edit-profile) už neplatí
  → ModuleRouter: case 'profile' vráti ProfileModule s isEditMode=false
  → React: unmount ProfileModule z prvého if, mount ProfileModule zo switch
  → <main> má nový child → scroll sa resetuje na vrch
```

## Riešenie

Zjednotiť renderovanie: **odstrániť early return** pre `edit-profile` a nechať `case 'profile'` obsluhovať aj edit, aj view mód.

- V `case 'profile'` predávať `isEditMode={isRightSidebarOpen && activeRightItem === 'edit-profile'}`
- V `case 'profile'` pridať `onEditCancel={handleRightSidebarToggle}`
- Odstrániť prvý if blok pre `isRightSidebarOpen && activeRightItem === 'edit-profile'`

Tým sa dosiahne, že sa vždy renderuje **jedna a tá istá** inštancia ProfileModule zo switch, len sa menia props. React nemusí meniť strom a pozícia scrollu zostane zachovaná.

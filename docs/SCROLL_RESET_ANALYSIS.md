# Hlbšia analýza: Scroll na vrch po uložení profilu

## Čo sme overili

### 1. Žiadne explicitné scrollTo/scrollIntoView v save flow
- `ProfileModule.handleSave` nevolá `scrollTo` ani `scrollIntoView`
- Jediné `scrollIntoView` v profile sú pre `highlightedCardRef` v ProfileOffersSection – nepoužíva sa pri save

### 2. Scroll kontajner
- **Hlavný scroll:** `<main className="... overflow-y-auto ...">` v `DashboardLayout.tsx` (riadok 190)
- Scroll je na `main`, nie na `body`
- `body` má `scrollBehavior: 'smooth'` (layout.tsx), ale to platí pre body scroll, nie pre overflow v main

### 3. ModuleRouter – dve vetvy pre profil
- **Edit móde:** `if (isRightSidebarOpen && activeRightItem === 'edit-profile')` → return `<ProfileModule isEditMode={true} />`
- **View móde:** `switch` → `case 'profile'` → return `<ProfileModule isEditMode={isRightSidebarOpen} />`
- **Otázka:** Skutočne sa pri prepnutí odmountuje jedna inštancia a namountuje druhá?

### 4. React reconciliation
- Obe vetvy vracajú rovnaký typ (`ProfileModule`) na rovnakom mieste v strome
- React zvyčajne **aktualizuje** existujúcu inštanciu, nie ju nahrádza
- Ak je to tak, potom **neodmountuje sa** celý ProfileModule, len sa zmenia props

### 5. Čo sa reálne mení v ProfileModule pri save
- `isEditMode`: true → false
- `ProfileMobileView` / `ProfileDesktopView`: prepne z `ProfileEditFormMobile` / `ProfileEditFormDesktop` na view (UserAvatar, UserInfo, ProfileOffersSection...)
- **Tu sa odmountuje edit forma a namountuje view** – to je vnútri scroll kontajnera

### 6. Layoutová zmena v DashboardLayout
- Pri zmene `isProfileEditMode` sa mení `className` na vnútornom `div`:
  - Edit: `max-w-4xl`
  - View: `max-w-7xl` (pre profile)
- Táto zmena šírky môže spôsobiť reflow a ovplyvniť správanie scrollu

### 7. URL sync (useDashboardUserProfile)
- Pri save sa volá `replaceState` – URL sa zmení z `/edit` na `/users/xxx`
- `replaceState` nevolá `popstate` – žiadny listener by sa nemal spustiť

### 8. handleRightSidebarToggle pri zatvorení
- Nastaví: `setIsRightSidebarOpen(false)`, `setActiveRightItem('')`, `setActiveModule('profile')`
- **Nepoužíva** `replaceState` – URL sync robí useDashboardUserProfile v samostatnom effecte

---

## Hypotézy (priorita)

| # | Hypotéza | Pravdepodobnosť | Ako overiť |
|---|----------|-----------------|------------|
| **F** | **Unmount Right Sidebar + grid reflow** – Pri save sa nastaví `isRightSidebarOpen=false`. Right Sidebar je `{isRightSidebarOpen && (...)}` – **celý sa odmountuje**. Grid sa zmení zo 4 stĺpcov na 3, Main dostane inú šírku. Reflow gridu + zmena rozmermov scroll kontajnera môže spôsobovať reset scrollu. | **Vysoká** | Zachovať Right Sidebar v DOM (hidden) namiesto unmount; alebo zachovať scroll pred/po a restore |
| A | **Unmount edit formy** – pri prepnutí edit↔view sa výrazne zmení obsah v main; niektoré prehliadače resetujú scroll pri drastickej zmene obsahu | Stredná | Logovať mount/unmount v ProfileEditForm, zmerať scroll pred/po |
| B | **Layoutová zmena max-w** – zmena max-w-4xl→7xl spôsobí reflow a v niektorých prehliadačoch reset scrollu | Nízka | Dočasne odstrániť podmienený max-w |
| C | **Dve vetvy ModuleRouter** – React naozaj odmountuje a namountuje ProfileModule (rôzne props, možno iná reconciliation) | Stredná | Pridať `key` na ProfileModule a sledovať mount |
| D | **Focus / scroll-into-view** – niečo po save získa focus a prehliadač scrollne na to | Stredná | Skontrolovať autoFocus, focus() po save |
| E | **Next.js / React 19** – framework alebo knižnica mení scroll pri state update | Nízka | Skontrolovať changelog, known issues |

### Detail hypotézy F (Right Sidebar unmount)

```
DashboardLayout - grid
├── Left Sidebar (vždy)
├── Search panel (vždy, šírka 0 keď zatvorené)
├── Main (scroll kontajner) ← TU JE SCROLL
└── Right Sidebar ← {isRightSidebarOpen && (...)}  PRI SAVE SA CELÝ ODMOUNTUJE
```

Pri save:
1. `handleRightSidebarToggle` → `isRightSidebarOpen = false`
2. `{isRightSidebarOpen && <RightSidebar ... />}` → podmienka je false → Right Sidebar sa **odmountuje**
3. `gridColsClassName` sa zmení: z `lg:grid-cols-[...1fr_240px]` (4 stĺpce) na `lg:grid-cols-[280px_0px_1fr]` (3 stĺpce)
4. Main je teraz 3. stĺpec namiesto 4., jeho šírka sa zmení
5. Grid reflow môže spôsobiť, že prehliadač resetuje scroll v Main

---

## Ďalšie kroky

1. **Diagnostický test** – pridať do `ProfileModule` alebo `handleSave`:
   - pred `onEditCancel`: `console.log('scroll before', document.querySelector('main')?.scrollTop)`
   - po `onEditCancel` (napr. v `requestAnimationFrame`): rovnaké logovanie
2. **Overenie mount/unmount** – `useEffect` s cleanup v `ProfileModule` a v `ProfileEditFormDesktop`/`ProfileEditFormMobile`, logovať mount/unmount
3. **Test v prehliadači** – manuálne uložiť profil, sledovať scroll v DevTools a v konzole

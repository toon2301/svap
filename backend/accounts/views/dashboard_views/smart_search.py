"""
Smart search synonymické skupiny pre dashboard search.
Presunuté z `dashboard.py` bez zmeny obsahu.
"""

# Jednoduché synonymické skupiny pre „smart search“ – rozdelené podľa domén
SMART_KEYWORD_GROUPS = [
    # AUTO / TECHNIKA
    [
        'auto',
        'autá',
        'autoservis',
        'mechanik',
        'automechanik',
        'pneuservis',
        'pneumatiky',
        'prezutie',
        'oprava auta',
        'diagnostika',
        'výmena oleja',
        'brzdy',
        'servis auta',
        'predaj áut',
        'stk',
    ],
    # DOM / OPRAVY
    [
        'oprava',
        'servis',
        'údržba',
        'hodinový manžel',
        'montáž',
        'vŕtanie',
        'oprava doma',
        'technik',
        'pomoc v domácnosti',
    ],
    # STAVBA / REMESLÁ
    [
        'stavba',
        'rekonštrukcia',
        'prerábka',
        'murár',
        'maliar',
        'obkladač',
        'sadrokartón',
        'podlahy',
        'dlažba',
        'strecha',
        'strechár',
        'stavebné práce',
    ],
    # ELEKTRO / VODA
    [
        'elektrikár',
        'elektro',
        'elektroinštalácia',
        'zásuvky',
        'svetlá',
        'revízia',
        'smart home',
        'voda',
        'inštalatér',
        'kúrenie',
        'kúrenár',
        'bojler',
        'radiátor',
        'havária vody',
    ],
    # UPRATOVANIE / DOMÁCE PRÁCE
    [
        'upratovanie',
        'upratovačka',
        'cleaning',
        'čistenie',
        'tepovanie',
        'umývanie okien',
        'kancelárske upratovanie',
        'domáce práce',
    ],
    # ZÁHRADA / OKOLIE
    [
        'záhrada',
        'záhradník',
        'kosenie',
        'strihanie stromov',
        'údržba záhrady',
        'plot',
        'terasa',
    ],
    # IT / DIGITÁL
    [
        'it',
        'technická pomoc',
        'počítač',
        'oprava počítača',
        'notebook',
        'web',
        'webstránka',
        'programátor',
        'vývoj',
        'aplikácia',
        'e-shop',
        'wordpress',
        'frontend',
        'backend',
    ],
    # DESIGN / FOTO
    [
        'grafika',
        'logo',
        'branding',
        'dizajn',
        'fotograf',
        'fotenie',
        'video',
        'strih videa',
    ],
    # JAZYKY / VZDELÁVANIE
    [
        'doučovanie',
        'učiteľ',
        'tutor',
        'angličtina',
        'nemčina',
        'online výučba',
        'príprava na skúšky',
    ],
    # STAROSTLIVOSŤ
    [
        'opatrovanie',
        'babysitting',
        'opatrovanie detí',
        'opatrovanie seniorov',
        'starostlivosť',
    ],
    # SLUŽBY / OSTATNÉ
    [
        'preklad',
        'tlmočenie',
        'šofér',
        'sťahovanie',
        'pomocník',
        'brigáda',
        'služby',
        'freelance',
    ],
]



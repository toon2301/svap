"""
Management príkaz na vytvorenie testovacích konverzácií okolo ponuky (dev/test).
"""

from __future__ import annotations

from datetime import timedelta

from django.conf import settings
from django.contrib.auth import get_user_model
from django.core.management.base import BaseCommand, CommandError
from django.db import transaction
from django.utils import timezone

from accounts.models import OfferedSkill
from messaging.models import Conversation, ConversationParticipant, Message
from messaging.services.conversations import find_direct_conversation, open_or_create_direct_conversation
from messaging.services.offer_shares import OFFER_SHARE_METADATA_OFFER_ID

User = get_user_model()

SVAPLY_USERNAME = "tonochudjak"
DEFAULT_OFFER_ID = 390

CONTACT_USERNAMES = (
    "martin.novak",
    "jana.horvathova",
    "peter.krajci",
    "lucia.svobodova",
    "tomas.urban",
    "eva.miklosova",
    "filip.benes",
    "katarina.polakova",
)

# sender: "contact" | "svaply"
# message_type: Message.Type.USER | Message.Type.OFFER_SHARE
ConversationMessage = tuple[str, str, str]

CONVERSATION_THREADS: list[dict] = [
    {
        "contact_username": "martin.novak",
        "days_ago": 5,
        "owner_last_read": True,
        "messages": [
            ("contact", Message.Type.OFFER_SHARE, ""),
            (
                "contact",
                Message.Type.USER,
                "Ahoj Svaply, som tiež stolár z BA. Potrebujem niekoho na lepenie a spájanie "
                "dubových polic do väčšej zabudovanej skrine. Máš kapacitu v najbližších dvoch týždňoch?",
            ),
            (
                "svaply",
                Message.Type.USER,
                "Ahoj Martin, áno, momentálne mám voľno. Aké sú rozmery a koľko spojov by si potreboval?",
            ),
            (
                "contact",
                Message.Type.USER,
                "Skriňa cca 2,4 m na šírku, 6 polic, väčšinou skryté spoje a jeden viditeľný roh. "
                "Materiál mám pripravený, potrebujem len spojovaciu časť.",
            ),
            (
                "svaply",
                Message.Type.USER,
                "Za takúto zákazku by som počítal okolo 180 €, podľa presného plánu to môžeme doladiť. "
                "Preferuješ dovoz ku mne do dielne alebo prídem k tebe?",
            ),
            (
                "contact",
                Message.Type.USER,
                "180 € znie férovo. Radšej by som to riešil u teba, mám tam viac priestoru na lepenie. "
                "Môžeme sa dohodnúť na štvrtok poobede?",
            ),
            (
                "svaply",
                Message.Type.USER,
                "Štvrtok po 15:00 mi vyhovuje. Pošli mi prosím nákres alebo fotky, nech si to pripravím.",
            ),
            ("contact", Message.Type.USER, "Super, pošlem ti to dnes večer. Ďakujem!"),
        ],
    },
    {
        "contact_username": "jana.horvathova",
        "days_ago": 3,
        "owner_last_read": True,
        "messages": [
            (
                "contact",
                Message.Type.USER,
                "Dobrý deň, chystám stánok na remeselnícky jarmok a potrebujem drevený stojan na výstavbu "
                "grafiky. Našla som tvoju ponuku – robíš aj menšie kusy na mieru?",
            ),
            (
                "svaply",
                Message.Type.USER,
                "Dobrý deň Jana, áno, menšie kusy nerobím problém. Aký formát a výška by ste potrebovali?",
            ),
            (
                "contact",
                Message.Type.USER,
                "Panel cca 80×120 cm, stojan aby sa dal zložiť a preniesť autom. Bola by to borovica alebo "
                "nejaké ľahšie drevo, nech to nie je príliš ťažké.",
            ),
            (
                "svaply",
                Message.Type.USER,
                "Borovica je dobrá voľba. Odhadujem 95–110 € podľa typu spojov a povrchovej úpravy. "
                "Máte už predstavu o termíne?",
            ),
            (
                "contact",
                Message.Type.USER,
                "Jarmok mám o tri týždne, takže ideálne do dvoch. Ešte porovnávam ponuky – máš v portfóliu "
                "niečo podobné, čo by som si vedela pozrieť?",
            ),
            (
                "svaply",
                Message.Type.USER,
                "Áno, v portfóliu mám police a zabudovanú skriňu, dá sa to porovnať. Pošlem ti link na profil. "
                "Ak sa rozhodneš, daj vedieť do piatku.",
            ),
            ("contact", Message.Type.USER, "Ďakujem, pozriem si to a ozvem sa."),
        ],
    },
    {
        "contact_username": "peter.krajci",
        "days_ago": 4,
        "owner_last_read": True,
        "messages": [
            ("contact", Message.Type.OFFER_SHARE, ""),
            (
                "contact",
                Message.Type.USER,
                "Čau, pri rekonštrukcii kuchyne sa mi uvoľnili dve skrinky – potrebujem ich znova pevne "
                "spojiť a dorovnať. Vieš sa na to pozrieť budúci týždeň?",
            ),
            (
                "svaply",
                Message.Type.USER,
                "Ahoj Peter, áno. Sú to pôvodné skrinky alebo niečo nové? A koľko kusov treba spojiť?",
            ),
            (
                "contact",
                Message.Type.USER,
                "Pôvodné, len sme ich rozobrali kvôli elektroinštalácii. Dve horné skrinky + jedna spodná, "
                "spoje sú staršie a trochu povolené.",
            ),
            (
                "svaply",
                Message.Type.USER,
                "To zvládnem za jeden deň, cca 70 € vrátane drobného materiálu. U teba doma alebo v dielni?",
            ),
            (
                "contact",
                Message.Type.USER,
                "U mňa doma v Žiline, ideálne utorok alebo streda. 70 € je OK, môžeme to tak nechať?",
            ),
            (
                "svaply",
                Message.Type.USER,
                "Streda dopoľudnia mi sedí. Pošli adresu a ideálne fotku tých spojov, nech viem čo zobrať so sebou.",
            ),
        ],
    },
    {
        "contact_username": "lucia.svobodova",
        "days_ago": 2,
        "owner_last_read": True,
        "messages": [
            (
                "contact",
                Message.Type.USER,
                "Dobrý deň, v kancelárii nám chýba úložný systém z preglejky – niečo ako modulárne boxy "
                "na dokumenty. Robíte aj takéto veci?",
            ),
            (
                "svaply",
                Message.Type.USER,
                "Dobrý deň, áno, modulárne boxy viem spraviť. Koľko kusov a aké rozmery?",
            ),
            (
                "contact",
                Message.Type.USER,
                "6 boxov, každý cca 40×30×25 cm. Sme v Nitre – dochádzate aj mimo Bratislavy?",
            ),
            (
                "svaply",
                Message.Type.USER,
                "Do Nitry áno, ale pripočítavam cestovné podľa vzdialenosti. Samotná práca by bola okolo 140 €.",
            ),
            (
                "contact",
                Message.Type.USER,
                "140 € je v poriadku, ale cestovné ma zaujíma – koľko by to bolo spolu?",
            ),
            (
                "svaply",
                Message.Type.USER,
                "Pre Nitru by som počítal +25 € na cestu. Spolu teda cca 165 €. Ak objednáte viac kusov, "
                "vieme sa dohodnúť na zľave.",
            ),
            ("contact", Message.Type.USER, "Rozumiem, musím to ešte schváliť s kolegyňou. Ozvem sa."),
        ],
    },
    {
        "contact_username": "tomas.urban",
        "days_ago": 6,
        "owner_last_read": True,
        "messages": [
            (
                "contact",
                Message.Type.USER,
                "Ahoj, skladám si stôl na mieru s drevenou doskou a kovovou konštrukciou. Potrebujem niekoho, "
                "kto mi pekne dorobí drevený panel a spojí ho s rámom bez viditeľných skrutiek. Zaujala ma tvoja ponuka.",
            ),
            (
                "svaply",
                Message.Type.USER,
                "Ahoj Tomáš, to znie ako dobrý projekt. Akú máš dosku – masív alebo lamino?",
            ),
            (
                "contact",
                Message.Type.USER,
                "Masív dub, 180×80 cm. Rám už mám, chýba mi len presné osadenie a čisté spoje v rohoch.",
            ),
            (
                "svaply",
                Message.Type.USER,
                "Za takúto prácu by som bol niekde okolo 120 €. Termín do týždňa by bol reálny.",
            ),
            (
                "contact",
                Message.Type.USER,
                "Cena OK. Ja som programátor – ak by si niekedy potreboval pomôcť s webom alebo automatizáciou, "
                "vieme to spraviť ako barter? Čiastočne?",
            ),
            (
                "svaply",
                Message.Type.USER,
                "Barter ma zaujíma, web by sa mi zišiel. Poďme sa stretnúť, pozrieme dosku a dohodneme podmienky.",
            ),
            ("contact", Message.Type.USER, "Super, napíšem ti cez víkend termín."),
        ],
    },
    {
        "contact_username": "eva.miklosova",
        "days_ago": 7,
        "owner_last_read": True,
        "messages": [
            ("contact", Message.Type.OFFER_SHARE, ""),
            (
                "contact",
                Message.Type.USER,
                "Ahoj, potrebujem drevený rám na fotografické pozadie – niečo stabilné, ale zložiteľné. "
                "Stíhaš to do desiatich dní?",
            ),
            (
                "svaply",
                Message.Type.USER,
                "Ahoj Eva, áno, do desiatich dní by to šlo. Aký rozmer a aký typ spojenia preferuješ?",
            ),
            (
                "contact",
                Message.Type.USER,
                "cca 2×2 m po zložení, drevené lišty, ideálne bez lesku – matný povrch kvôli svetlu pri fotení.",
            ),
            (
                "svaply",
                Message.Type.USER,
                "Matný olej alebo vosk viem. Odhad 150 € podľa presného návrhu.",
            ),
            (
                "contact",
                Message.Type.USER,
                "Ďakujem za ponuku. Medzitým sa mi ozval známy stolár s rýchlejším termínom, tak to riešim s ním. "
                "Ak by to nevyšlo, ozvem sa.",
            ),
            (
                "svaply",
                Message.Type.USER,
                "V poriadku, držím palce s projektom. Kľudne sa ozvi, ak budeš potrebovať.",
            ),
        ],
    },
    {
        "contact_username": "filip.benes",
        "days_ago": 1,
        "owner_last_read": False,
        "messages": [
            (
                "contact",
                Message.Type.USER,
                "Dobrý deň, otvárame bistro a potrebujeme 12 drevených menu dosiek – lepené dosky s gravírovaním "
                "nám spraví niekto iný, ale spoje a finálne zhladenie by sme dali na vás. Stíhate to?",
            ),
            (
                "svaply",
                Message.Type.USER,
                "Dobrý deň Filip, 12 kusov je väčšia série – záleží na rozmeroch. Aké máte dosky?",
            ),
            (
                "contact",
                Message.Type.USER,
                "A4 formát, hrúbka 8 mm, dubová dyha na preglejke. Otvárame o 18 dní, takže potrebujeme "
                "mať hotovo do 12. Máte kapacitu?",
            ),
            (
                "svaply",
                Message.Type.USER,
                "Kapacitu mám, ale pri 12 kusoch by som rátal cca 220–260 € podľa požiadavky na hrany. "
                "Viete dodávku rozdeliť na dve várky?",
            ),
            (
                "contact",
                Message.Type.USER,
                "220 € by bol náš strop. Viete sa zmestiť do toho, ak pošleme polovicu už budúci týždeň?",
            ),
            (
                "svaply",
                Message.Type.USER,
                "Pri polovici materiálu budúci týždeň by som sa do 220 € zmestil. Pošlite presný počet a fotku vzorky.",
            ),
            ("contact", Message.Type.USER, "Perfektné, pripravím podklady a pošlem zajtra ráno."),
        ],
    },
    {
        "contact_username": "katarina.polakova",
        "days_ago": 0,
        "owner_last_read": False,
        "messages": [
            ("contact", Message.Type.OFFER_SHARE, ""),
            (
                "contact",
                Message.Type.USER,
                "Dobrý deň, som lekárka a zariaďujeme čakáreň v ambulancii. Hľadáme nízku drevenú knižnicu "
                "na časopisy – niečo pevné, ale bez agresívnych lepidiel kvôli pacientom. Je to pre vás vhodná zákazka?",
            ),
            (
                "contact",
                Message.Type.USER,
                "Ide o 4 police, max. výška 120 cm, svetlé drevo. Prosím aj info o tom, aké lepidlo používate.",
            ),
        ],
    },
]


class Command(BaseCommand):
    help = "Vytvorí testovacie konverzácie medzi Svaply a testovacími používateľmi okolo ponuky."

    def add_arguments(self, parser):
        parser.add_argument(
            "--offer-id",
            type=int,
            default=DEFAULT_OFFER_ID,
            help=f"ID ponuky (predvolene {DEFAULT_OFFER_ID}).",
        )
        parser.add_argument(
            "--force",
            action="store_true",
            help="Zmaže existujúce 1:1 konverzácie so zadanými kontaktmi pred vytvorením nových.",
        )

    def handle(self, *args, **options):
        if not settings.DEBUG:
            raise CommandError("Tento príkaz je dostupný len v DEBUG režime.")

        offer_id = options["offer_id"]
        force = options["force"]

        try:
            owner = User.objects.get(username=SVAPLY_USERNAME)
        except User.DoesNotExist as exc:
            raise CommandError(f"Používateľ '{SVAPLY_USERNAME}' neexistuje.") from exc

        try:
            offer = OfferedSkill.objects.get(id=offer_id, user=owner)
        except OfferedSkill.DoesNotExist as exc:
            raise CommandError(
                f"Ponuka #{offer_id} pre používateľa '{SVAPLY_USERNAME}' neexistuje."
            ) from exc

        created_count = 0
        skipped_count = 0

        with transaction.atomic():
            for thread in CONVERSATION_THREADS:
                username = thread["contact_username"]
                try:
                    contact = User.objects.get(username=username)
                except User.DoesNotExist:
                    self.stdout.write(
                        self.style.WARNING(f"Preskakujem – používateľ '{username}' neexistuje.")
                    )
                    skipped_count += 1
                    continue

                existing = find_direct_conversation(
                    actor=owner,
                    target=contact,
                    include_deleted=True,
                )
                if existing and not force:
                    self.stdout.write(
                        self.style.WARNING(
                            f"Konverzácia s {username} už existuje (#{existing.id}). "
                            "Použi --force na prepísanie."
                        )
                    )
                    skipped_count += 1
                    continue

                if existing and force:
                    existing.messages.all().delete()
                    existing.participants.all().delete()
                    existing.delete()

                result = open_or_create_direct_conversation(actor=contact, target=owner)
                convo = result.conversation

                base_time = timezone.now() - timedelta(days=int(thread["days_ago"]))
                offer_metadata = {OFFER_SHARE_METADATA_OFFER_ID: int(offer.id)}

                last_message_at = base_time
                for index, (sender_key, message_type, text) in enumerate(thread["messages"]):
                    sender = contact if sender_key == "contact" else owner
                    created_at = base_time + timedelta(minutes=index * 17 + (index % 3) * 4)
                    last_message_at = created_at

                    metadata: dict = {}
                    if message_type == Message.Type.OFFER_SHARE:
                        metadata = dict(offer_metadata)

                    Message.objects.create(
                        conversation=convo,
                        sender=sender,
                        text=text,
                        message_type=message_type,
                        metadata=metadata,
                        created_at=created_at,
                    )

                convo.last_message_at = last_message_at
                convo.request_status = Conversation.RequestStatus.ACCEPTED
                convo.accepted_at = base_time
                convo.save(update_fields=["last_message_at", "request_status", "accepted_at", "updated_at"])

                owner_participant = ConversationParticipant.objects.get(
                    conversation=convo,
                    user=owner,
                )
                contact_participant = ConversationParticipant.objects.get(
                    conversation=convo,
                    user=contact,
                )

                if thread.get("owner_last_read", True):
                    owner_participant.last_read_at = last_message_at
                else:
                    owner_participant.last_read_at = None

                contact_participant.last_read_at = last_message_at
                owner_participant.save(update_fields=["last_read_at"])
                contact_participant.save(update_fields=["last_read_at"])

                created_count += 1
                self.stdout.write(
                    self.style.SUCCESS(
                        f"Vytvorená konverzácia #{convo.id} s {contact.first_name} {contact.last_name} "
                        f"({len(thread['messages'])} správ)"
                    )
                )

        self.stdout.write(
            self.style.SUCCESS(
                f"Hotovo: {created_count} konverzácií vytvorených, {skipped_count} preskočených."
            )
        )

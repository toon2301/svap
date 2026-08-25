"""Označenia v príspevku – odstránenie vlastného označenia.

Vyčlenené z ``feed_interactions`` – správanie nezmenené.
"""

import logging

from rest_framework import status
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response

from swaply.rate_limiting import api_rate_limit

from ..models import (
    FeedPostTag,
)
from .feed_interaction_helpers import _get_visible_post, _post_not_found

logger = logging.getLogger(__name__)


@api_view(["DELETE"])
@permission_classes([IsAuthenticated])
@api_rate_limit
def feed_post_self_tag_view(request, post_id: int):
    """Odstránenie VLASTNÉHO označenia v príspevku.

    Súkromná akcia označeného – príspevok ostáva, mizne len jeho tag. Preto
    ani žiadna notifikácia: autora ani nikoho iného sa to netýka.

    Cudzie označenie sa cez tento endpoint odstrániť nedá a ani sa neprezradí,
    či existuje: filter je natvrdo viazaný na ``request.user``, takže autor
    príspevku (ani ktokoľvek iný) dostane rovnaké 404 ako pri neexistujúcom
    tagu. Zámerne 404, nie 403 – 403 by potvrdilo, že tam cudzí tag je.
    """
    post = _get_visible_post(request, post_id)
    if post is None:
        return _post_not_found()

    deleted, _ = FeedPostTag.objects.filter(
        post=post, tagged_user=request.user
    ).delete()
    if not deleted:
        # Nikdy označený nebol, alebo si to už odstránil – opakovanie nemá
        # padať, len povedať, že tam nič nie je.
        return Response(
            {"error": "Oznacenie nebolo najdene."}, status=status.HTTP_404_NOT_FOUND
        )

    # 204 ako feed_post_comment_delete_view – zhodný vzor pre jednoduché DELETE.
    return Response(status=status.HTTP_204_NO_CONTENT)

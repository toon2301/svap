import os
os.environ['DATABASE_URL'] = 'postgresql://postgres:vPzMaQMyElgvELVdviFnsyBthrlqFyaP@ballast.proxy.rlwy.net:10764/railway'

import django
import os
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'swaply.settings_production')
django.setup()

from accounts.models import Review, SkillRequest, SkillRequestStatus, SkillRequestTerminationReason

bad_srs = SkillRequest.objects.filter(
    status=SkillRequestStatus.TERMINATED,
    termination__reason=SkillRequestTerminationReason.INTERACTION_UNAVAILABLE,
).values_list('id', 'requester_id', 'offer_id')

sr_by_pair = {}
for sid, r, o in bad_srs:
    sr_by_pair.setdefault((r, o), []).append(sid)

matches = [
    (rev, sr_by_pair[(rev.reviewer_id, rev.offer_id)])
    for rev in Review.objects.all()
    if (rev.reviewer_id, rev.offer_id) in sr_by_pair
]

print(f'{len(matches)} postihnutych Review zaznamov')
for rev, sr_ids in matches:
    print(rev.id, rev.created_at, sr_ids, rev.reviewer_id, rev.rating)
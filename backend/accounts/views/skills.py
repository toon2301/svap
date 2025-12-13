"""
Skills views pre Swaply
"""
from rest_framework import status
from rest_framework.decorators import api_view, permission_classes
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from django.db.models import Q, F

from swaply.rate_limiting import api_rate_limit

from ..models import OfferedSkill, OfferedSkillImage
from ..serializers import OfferedSkillSerializer
from django.core.exceptions import ValidationError


@api_view(['GET', 'POST'])
@permission_classes([IsAuthenticated])
@api_rate_limit
def skills_list_view(request):
    """
    GET: Zoznam zručností používateľa
    POST: Vytvorenie novej zručnosti
    """
    if request.method == 'GET':
        skills = OfferedSkill.objects.filter(user=request.user)
        serializer = OfferedSkillSerializer(skills, many=True, context={'request': request})
        return Response(serializer.data, status=status.HTTP_200_OK)
    
    elif request.method == 'POST':
        # Log pre debugging (len v development)
        import logging
        logger = logging.getLogger(__name__)
        logger.info(f"POST /api/auth/skills/ - Data: {request.data}")
        
        serializer = OfferedSkillSerializer(data=request.data, context={'request': request})

        if not serializer.is_valid():
            logger.warning(f"Serializer validation errors: {serializer.errors}")
            return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

        category = serializer.validated_data.get('category')
        subcategory = serializer.validated_data.get('subcategory')
        is_custom = category == subcategory
        is_seeking = serializer.validated_data.get('is_seeking', False)

        # Kontrola limitu 3 karty pre každý typ samostatne (Ponúkam vs Hľadám)
        count_by_type = OfferedSkill.objects.filter(user=request.user, is_seeking=is_seeking).count()

        if count_by_type >= 3:
            skill_type = 'Hľadám' if is_seeking else 'Ponúkam'
            return Response(
                {'error': f'Môžeš mať maximálne 3 karty v sekcii "{skill_type}".'},
                status=status.HTTP_400_BAD_REQUEST
            )

        if OfferedSkill.objects.filter(
            user=request.user,
            category=category,
            subcategory=subcategory
        ).exists():
            return Response(
                {'error': 'Táto zručnosť už existuje'},
                status=status.HTTP_400_BAD_REQUEST
            )

        serializer.save(user=request.user)
        return Response(serializer.data, status=status.HTTP_201_CREATED)


@api_view(['GET', 'PUT', 'PATCH', 'DELETE'])
@permission_classes([IsAuthenticated])
@api_rate_limit
def skills_detail_view(request, skill_id):
    """
    GET: Detail zručnosti
    PUT/PATCH: Aktualizácia zručnosti
    DELETE: Odstránenie zručnosti
    """
    try:
        skill = OfferedSkill.objects.get(id=skill_id, user=request.user)
    except OfferedSkill.DoesNotExist:
        return Response(
            {'error': 'Zručnosť nebola nájdená'},
            status=status.HTTP_404_NOT_FOUND
        )
    
    if request.method == 'GET':
        serializer = OfferedSkillSerializer(skill, context={'request': request})
        return Response(serializer.data, status=status.HTTP_200_OK)
    
    elif request.method in ['PUT', 'PATCH']:
        serializer = OfferedSkillSerializer(
            skill,
            data=request.data,
            partial=request.method == 'PATCH',
            context={'request': request}
        )
        if serializer.is_valid():
            # Kontrola duplikátov pri update (ak sa mení category/subcategory)
            category = serializer.validated_data.get('category', skill.category)
            subcategory = serializer.validated_data.get('subcategory', skill.subcategory)
            
            if (category != skill.category or subcategory != skill.subcategory):
                if OfferedSkill.objects.filter(
                    user=request.user,
                    category=category,
                    subcategory=subcategory
                ).exclude(id=skill_id).exists():
                    return Response(
                        {'error': 'Táto zručnosť už existuje'},
                        status=status.HTTP_400_BAD_REQUEST
                    )
            
            serializer.save()
            return Response(serializer.data, status=status.HTTP_200_OK)
        
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)
    
    elif request.method == 'DELETE':
        skill.delete()
        return Response(
            {'message': 'Zručnosť bola odstránená'},
            status=status.HTTP_204_NO_CONTENT
        )


@api_view(['GET', 'POST'])
@permission_classes([IsAuthenticated])
@api_rate_limit
def skill_images_view(request, skill_id):
    """
    GET: Zoznam obrázkov pre zručnosť používateľa
    POST: Upload nového obrázka (multipart/form-data, pole: image)
    """
    try:
        skill = OfferedSkill.objects.get(id=skill_id, user=request.user)
    except OfferedSkill.DoesNotExist:
        return Response({'error': 'Zručnosť nebola nájdená'}, status=status.HTTP_404_NOT_FOUND)

    if request.method == 'GET':
        serializer = OfferedSkillSerializer(skill, context={'request': request})
        # Vrátime iba images pole pre efektivitu
        return Response({'images': serializer.data.get('images', [])}, status=status.HTTP_200_OK)

    # POST upload
    # Log pre debugging (len v development)
    import logging
    logger = logging.getLogger(__name__)
    logger.info(f"POST /api/auth/skills/{skill_id}/images/ - Files: {list(request.FILES.keys()) if request.FILES else 'No files'}")
    
    if 'image' not in request.FILES:
        logger.warning(f"POST /api/auth/skills/{skill_id}/images/ - Missing 'image' field")
        return Response({'error': 'Pole \"image\" je povinné'}, status=status.HTTP_400_BAD_REQUEST)

    # Limit počtu obrázkov na 6
    if skill.images.count() >= 6:
        return Response({'error': 'Maximálny počet obrázkov je 6'}, status=status.HTTP_400_BAD_REQUEST)

    file = request.FILES['image']
    
    # Explicitne validovať obrázok pred vytvorením (vrátane moderácie)
    from swaply.validators import validate_image_file
    try:
        validate_image_file(file)
    except ValidationError as e:
        return Response({'error': str(e)}, status=status.HTTP_400_BAD_REQUEST)
    
    # Reset file pointer po validácii
    file.seek(0)
    
    try:
        img = OfferedSkillImage.objects.create(skill=skill, image=file, order=skill.images.count())
    except ValidationError as e:
        return Response({'error': str(e)}, status=status.HTTP_400_BAD_REQUEST)

    # Vráť jednoduché info o obrázku
    url = img.image.url if img.image else None
    if request and url:
        url = request.build_absolute_uri(url)
    return Response({'id': img.id, 'image_url': url, 'order': img.order}, status=status.HTTP_201_CREATED)


@api_view(['DELETE'])
@permission_classes([IsAuthenticated])
@api_rate_limit
def skill_image_detail_view(request, skill_id, image_id):
    """DELETE: Odstránenie jedného obrázka danej zručnosti"""
    try:
        skill = OfferedSkill.objects.get(id=skill_id, user=request.user)
    except OfferedSkill.DoesNotExist:
        return Response({'error': 'Zručnosť nebola nájdená'}, status=status.HTTP_404_NOT_FOUND)

    try:
        image = skill.images.get(id=image_id)
    except OfferedSkillImage.DoesNotExist:
        return Response({'error': 'Obrázok nebol nájdený'}, status=status.HTTP_404_NOT_FOUND)

    image.delete()
    return Response(status=status.HTTP_204_NO_CONTENT)

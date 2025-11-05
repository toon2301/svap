"""
Skills views pre Swaply
"""
from rest_framework import status
from rest_framework.decorators import api_view, permission_classes
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from django.db.models import Q

from swaply.rate_limiting import api_rate_limit

from ..models import OfferedSkill
from ..serializers import OfferedSkillSerializer


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
        serializer = OfferedSkillSerializer(skills, many=True)
        return Response(serializer.data, status=status.HTTP_200_OK)
    
    elif request.method == 'POST':
        # Kontrola limitu 3 zručností
        existing_count = OfferedSkill.objects.filter(user=request.user).count()
        if existing_count >= 3:
            return Response(
                {'error': 'Môžeš pridať maximálne 3 kategórie'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        serializer = OfferedSkillSerializer(data=request.data)
        if serializer.is_valid():
            # Kontrola duplikátov (category + subcategory)
            category = serializer.validated_data.get('category')
            subcategory = serializer.validated_data.get('subcategory')
            
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
        
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)


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
        serializer = OfferedSkillSerializer(skill)
        return Response(serializer.data, status=status.HTTP_200_OK)
    
    elif request.method in ['PUT', 'PATCH']:
        serializer = OfferedSkillSerializer(
            skill,
            data=request.data,
            partial=request.method == 'PATCH'
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


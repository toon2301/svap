from rest_framework import serializers

from .models import Review


class ReviewSerializer(serializers.ModelSerializer):
    """Serializer pre recenzie ponúk"""

    reviewer_id = serializers.IntegerField(source="reviewer.id", read_only=True)
    reviewer_display_name = serializers.CharField(
        source="reviewer.display_name", read_only=True
    )
    reviewer_avatar_url = serializers.SerializerMethodField()
    likes_count = serializers.SerializerMethodField()
    is_liked_by_me = serializers.SerializerMethodField()

    class Meta:
        model = Review
        fields = [
            "id",
            "reviewer_id",
            "reviewer_display_name",
            "reviewer_avatar_url",
            "offer",
            "rating",
            "text",
            "pros",
            "cons",
            "owner_response",
            "owner_responded_at",
            "likes_count",
            "is_liked_by_me",
            "created_at",
            "updated_at",
        ]
        read_only_fields = [
            "id",
            "reviewer_id",
            "reviewer_display_name",
            "reviewer_avatar_url",
            "offer",
            "owner_responded_at",
            "likes_count",
            "is_liked_by_me",
            "created_at",
            "updated_at",
        ]

    def get_reviewer_avatar_url(self, obj):
        """Vráti URL avatara recenzenta"""
        if obj.reviewer.avatar:
            request = self.context.get("request")
            if request:
                return request.build_absolute_uri(obj.reviewer.avatar.url)
            return obj.reviewer.avatar.url
        return None

    def get_likes_count(self, obj):
        annotated_count = getattr(obj, "likes_count", None)
        if annotated_count is not None:
            return int(annotated_count)
        return obj.likes.count()

    def get_is_liked_by_me(self, obj):
        annotated_value = getattr(obj, "is_liked_by_me", None)
        if annotated_value is not None:
            return bool(annotated_value)

        request = self.context.get("request")
        user = getattr(request, "user", None)
        if user is None or not getattr(user, "is_authenticated", False):
            return False
        return obj.likes.filter(user=user).exists()

    def validate_rating(self, value):
        """Validácia ratingu"""
        if value < 0 or value > 5:
            raise serializers.ValidationError("Hodnotenie musí byť medzi 0.0 a 5.0.")
        # Kontrola krokov 0.5
        if float(value) % 0.5 != 0:
            raise serializers.ValidationError(
                "Hodnotenie musí byť v krokoch 0.5 (napr. 3.5, 4.0)."
            )
        return value

    def validate_pros(self, value):
        """Validácia plusov"""
        if not isinstance(value, list):
            raise serializers.ValidationError("Plusy musia byť zoznam.")
        if len(value) > 10:
            raise serializers.ValidationError("Môžeš pridať maximálne 10 plusov.")
        for i, pro in enumerate(value):
            if not isinstance(pro, str):
                raise serializers.ValidationError(f"Plus #{i+1} musí byť text.")
            if len(pro) > 120:
                raise serializers.ValidationError(
                    f"Plus #{i+1} môže mať maximálne 120 znakov."
                )
        return value

    def validate_cons(self, value):
        """Validácia minusov"""
        if not isinstance(value, list):
            raise serializers.ValidationError("Minusy musia byť zoznam.")
        if len(value) > 10:
            raise serializers.ValidationError("Môžeš pridať maximálne 10 minusov.")
        for i, con in enumerate(value):
            if not isinstance(con, str):
                raise serializers.ValidationError(f"Mínus #{i+1} musí byť text.")
            if len(con) > 120:
                raise serializers.ValidationError(
                    f"Mínus #{i+1} môže mať maximálne 120 znakov."
                )
        return value

    def validate_text(self, value):
        """Validácia textu recenzie"""
        if len(value) > 300:
            raise serializers.ValidationError(
                "Text recenzie môže mať maximálne 300 znakov."
            )
        return value

    def validate(self, attrs):
        """Validácia na úrovni objektu"""
        # Pros a cons musia byť zoznamy (už validované v validate_pros/cons, ale pre istotu)
        pros = attrs.get("pros", [])
        cons = attrs.get("cons", [])

        if not isinstance(pros, list):
            raise serializers.ValidationError({"pros": "Plusy musia byť zoznam."})
        if not isinstance(cons, list):
            raise serializers.ValidationError({"cons": "Minusy musia byť zoznam."})

        return attrs

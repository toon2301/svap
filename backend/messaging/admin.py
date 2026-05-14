from django.contrib import admin

from .models import Conversation, ConversationParticipant, GroupInvitation, Message


class ConversationParticipantInline(admin.TabularInline):
    model = ConversationParticipant
    extra = 0
    autocomplete_fields = ["user"]
    readonly_fields = ["joined_at"]
    fields = ["user", "role", "status", "joined_at", "last_read_at", "hidden_at", "pinned_at", "left_at"]


class MessageInline(admin.TabularInline):
    model = Message
    extra = 0
    autocomplete_fields = ["sender"]
    readonly_fields = ["created_at", "edited_at"]
    fields = ["sender", "message_type", "text", "created_at", "edited_at", "is_deleted"]


@admin.register(Conversation)
class ConversationAdmin(admin.ModelAdmin):
    list_display = [
        "id",
        "is_group",
        "request_status",
        "name",
        "created_by",
        "requested_by",
        "requested_to",
        "created_at",
        "updated_at",
        "last_message_at",
    ]
    list_select_related = ["created_by", "requested_by", "requested_to"]
    search_fields = [
        "id",
        "name",
        "created_by__username",
        "created_by__email",
        "requested_by__username",
        "requested_to__username",
    ]
    list_filter = ["is_group", "request_status"]
    readonly_fields = ["created_at", "updated_at"]
    inlines = [ConversationParticipantInline, MessageInline]


@admin.register(ConversationParticipant)
class ConversationParticipantAdmin(admin.ModelAdmin):
    list_display = ["id", "conversation", "user", "role", "status", "joined_at", "last_read_at"]
    list_select_related = ["conversation", "user"]
    search_fields = ["conversation__id", "user__username", "user__email"]
    readonly_fields = ["joined_at"]
    autocomplete_fields = ["conversation", "user"]


@admin.register(Message)
class MessageAdmin(admin.ModelAdmin):
    list_display = ["id", "conversation", "sender", "message_type", "created_at", "edited_at", "is_deleted"]
    list_select_related = ["conversation", "sender"]
    search_fields = ["conversation__id", "sender__username", "sender__email", "text"]
    readonly_fields = ["created_at"]
    autocomplete_fields = ["conversation", "sender"]


@admin.register(GroupInvitation)
class GroupInvitationAdmin(admin.ModelAdmin):
    list_display = [
        "id",
        "conversation",
        "invited_user",
        "invited_by",
        "status",
        "created_at",
        "responded_at",
    ]
    list_select_related = ["conversation", "invited_user", "invited_by"]
    search_fields = [
        "conversation__id",
        "conversation__name",
        "invited_user__username",
        "invited_user__email",
        "invited_by__username",
        "invited_by__email",
    ]
    readonly_fields = ["created_at", "updated_at", "responded_at"]
    autocomplete_fields = ["conversation", "invited_user", "invited_by", "message"]


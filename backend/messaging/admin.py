from django.contrib import admin

from .models import Conversation, ConversationParticipant, Message


class ConversationParticipantInline(admin.TabularInline):
    model = ConversationParticipant
    extra = 0
    autocomplete_fields = ["user"]
    readonly_fields = ["joined_at"]


class MessageInline(admin.TabularInline):
    model = Message
    extra = 0
    autocomplete_fields = ["sender"]
    readonly_fields = ["created_at", "edited_at"]
    fields = ["sender", "text", "created_at", "edited_at", "is_deleted"]


@admin.register(Conversation)
class ConversationAdmin(admin.ModelAdmin):
    list_display = ["id", "created_by", "created_at", "updated_at", "last_message_at"]
    list_select_related = ["created_by"]
    search_fields = ["id", "created_by__username", "created_by__email"]
    readonly_fields = ["created_at", "updated_at"]
    inlines = [ConversationParticipantInline, MessageInline]


@admin.register(ConversationParticipant)
class ConversationParticipantAdmin(admin.ModelAdmin):
    list_display = ["id", "conversation", "user", "joined_at", "last_read_at"]
    list_select_related = ["conversation", "user"]
    search_fields = ["conversation__id", "user__username", "user__email"]
    readonly_fields = ["joined_at"]
    autocomplete_fields = ["conversation", "user"]


@admin.register(Message)
class MessageAdmin(admin.ModelAdmin):
    list_display = ["id", "conversation", "sender", "created_at", "edited_at", "is_deleted"]
    list_select_related = ["conversation", "sender"]
    search_fields = ["conversation__id", "sender__username", "sender__email", "text"]
    readonly_fields = ["created_at"]
    autocomplete_fields = ["conversation", "sender"]


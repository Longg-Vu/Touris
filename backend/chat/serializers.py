from rest_framework import serializers
from .models import ChatSession, ChatMessage
from tours.models import Tour


class ChatMessageSerializer(serializers.ModelSerializer):
    sender_name = serializers.SerializerMethodField()

    class Meta:
        model = ChatMessage
        fields = [
            'id',
            'session',
            'sender_type',
            'sender_name',
            'message',
            'message_type',
            'metadata',
            'created_at',
        ]

    def get_sender_name(self, obj):
        if obj.sender_type == ChatMessage.SENDER_BOT:
            return 'Trợ lý ảo Bot 🤖'
        if obj.sender_type == ChatMessage.SENDER_STAFF:
            if obj.sender_user:
                full = f"{obj.sender_user.first_name} {obj.sender_user.last_name or ''}".strip()
                name = full if full else obj.sender_user.username
                if '(HDV)' in name or '(Admin)' in name:
                    return name
                if obj.sender_user.is_superuser:
                    return f"{name} (Admin)"
                return f"{name} (HDV)"
            return 'Nhân viên tư vấn 👨‍💼'
        return obj.session.customer_name or 'Bạn'


class ChatSessionSerializer(serializers.ModelSerializer):
    """Serializer phiên chat phía khách hàng."""
    messages = ChatMessageSerializer(many=True, read_only=True)
    current_tour_info = serializers.SerializerMethodField()

    class Meta:
        model = ChatSession
        fields = [
            'id',
            'session_id',
            'customer_name',
            'current_tour',
            'current_tour_info',
            'status',
            'unread_customer_count',
            'created_at',
            'updated_at',
            'messages',
        ]

    def get_current_tour_info(self, obj):
        if obj.current_tour:
            t = obj.current_tour
            return {
                'id': t.id,
                'name': t.name,
                'thumbnail': t.thumbnail,
                'destination': t.destination.name if t.destination else 'Việt Nam',
                'price_adult': float(t.final_price if (hasattr(t, 'final_price') and t.is_priority_sale and t.final_price) else t.price_adult),
                'guide_name': f"{t.guide.first_name} {t.guide.last_name or ''}".strip() if (t.guide and t.guide.first_name) else (t.guide.username if t.guide else None),
            }
        return None


class AdminChatSessionSerializer(serializers.ModelSerializer):
    """Serializer phiên chat đầy đủ dành cho Admin & Hướng dẫn viên."""
    status_display = serializers.CharField(source='get_status_display', read_only=True)
    assigned_to_name = serializers.SerializerMethodField()
    current_tour_info = serializers.SerializerMethodField()
    last_message = serializers.SerializerMethodField()

    class Meta:
        model = ChatSession
        fields = [
            'id',
            'session_id',
            'customer_name',
            'customer_phone',
            'customer_email',
            'current_tour',
            'current_tour_info',
            'assigned_to',
            'assigned_to_name',
            'status',
            'status_display',
            'unread_staff_count',
            'last_message',
            'created_at',
            'updated_at',
        ]

    def get_assigned_to_name(self, obj):
        if obj.assigned_to:
            full = f"{obj.assigned_to.first_name} {obj.assigned_to.last_name or ''}".strip()
            return full if full else obj.assigned_to.username
        return None

    def get_current_tour_info(self, obj):
        if obj.current_tour:
            t = obj.current_tour
            return {
                'id': t.id,
                'name': t.name,
                'thumbnail': t.thumbnail,
                'destination': t.destination.name if t.destination else 'Việt Nam',
                'guide_name': f"{t.guide.first_name} {t.guide.last_name or ''}".strip() if (t.guide and t.guide.first_name) else (t.guide.username if t.guide else None),
            }
        return None

    def get_last_message(self, obj):
        last = obj.messages.last()
        if last:
            return {
                'sender_type': last.sender_type,
                'message': last.message[:60] + ('...' if len(last.message) > 60 else ''),
                'created_at': last.created_at,
            }
        return None

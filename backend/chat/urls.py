from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import (
    init_chat_session,
    send_customer_message,
    get_customer_messages,
    AdminChatSessionViewSet,
)

admin_router = DefaultRouter()
admin_router.register(r'sessions', AdminChatSessionViewSet, basename='admin-chat-sessions')

urlpatterns = [
    # Customer endpoints
    path('init/', init_chat_session, name='chat-init'),
    path('messages/', send_customer_message, name='chat-send-message'),
    path('messages/poll/', get_customer_messages, name='chat-poll-messages'),

    # Admin / Staff endpoints
    path('admin/', include(admin_router.urls)),
]

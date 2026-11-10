"""
URL configuration for tourism_backend project.
Đây là nơi KHAI BÁO đường dẫn URL cho từng app.
"""
from django.contrib import admin
from django.urls import path, include
from django.conf import settings
from django.conf.urls.static import static

# ========== URL ROUTING ==========
# Mỗi dòng include() kết nối URL prefix tới urls.py của app tương ứng
urlpatterns = [
    path('admin/', admin.site.urls),
    path('api/auth/', include('accounts.urls')),       # ← accounts app
    path('api/tours/', include('tours.urls')),          # ← tours app
    path('api/bookings/', include('bookings.urls')),    # ← bookings app
    path('api/reviews/', include('reviews.urls')),      # ← reviews app
    path('api/chat/', include('chat.urls')),            # ← chat app (Mini Live Chat & Trợ lý ảo)
]

# Serve media files in development
if settings.DEBUG:
    urlpatterns += static(settings.MEDIA_URL, document_root=settings.MEDIA_ROOT)

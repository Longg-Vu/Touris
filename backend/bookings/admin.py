from django.contrib import admin
from .models import Booking


@admin.register(Booking)
class BookingAdmin(admin.ModelAdmin):
    list_display  = ('id', 'user', 'tour', 'travel_date', 'num_adults', 'num_children', 'total_price', 'status', 'created_at')
    list_filter   = ('status', 'travel_date', 'created_at')
    search_fields = ('user__username', 'user__email', 'tour__name', 'contact_name', 'contact_phone')
    ordering      = ('-created_at',)
    readonly_fields = ('created_at', 'updated_at', 'price_adult', 'price_child', 'total_price')

    fieldsets = (
        ('Thông tin đặt tour', {
            'fields': ('user', 'tour', 'travel_date', 'num_adults', 'num_children'),
        }),
        ('Thông tin liên hệ', {
            'fields': ('contact_name', 'contact_phone', 'contact_email', 'special_request'),
        }),
        ('Giá tiền', {
            'fields': ('price_adult', 'price_child', 'total_price'),
        }),
        ('Trạng thái & Thời gian', {
            'fields': ('status', 'created_at', 'updated_at'),
        }),
    )

from django.contrib import admin
from .models import Tour, Destination, Category


@admin.register(Category)
class CategoryAdmin(admin.ModelAdmin):
    """Quản lý danh mục trong Django Admin (/admin/)"""
    list_display = ['id', 'name', 'slug']
    prepopulated_fields = {'slug': ('name',)}


@admin.register(Destination)
class DestinationAdmin(admin.ModelAdmin):
    """Quản lý điểm đến trong Django Admin"""
    list_display = ['id', 'name', 'slug', 'tour_count', 'order', 'is_active']
    list_editable = ['order', 'is_active']
    list_filter = ['is_active']
    prepopulated_fields = {'slug': ('name',)}


@admin.register(Tour)
class TourAdmin(admin.ModelAdmin):
    """Quản lý tour trong Django Admin"""
    list_display = ['id', 'name', 'category', 'destination', 'price_adult', 'rating', 'is_featured', 'is_hot', 'is_active']
    list_editable = ['is_featured', 'is_hot', 'is_active']
    list_filter = ['is_featured', 'is_hot', 'is_active', 'category', 'destination']
    search_fields = ['name']
    readonly_fields = ['created_at', 'updated_at']

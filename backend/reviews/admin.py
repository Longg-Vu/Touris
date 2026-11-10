from django.contrib import admin
from .models import Review


@admin.register(Review)
class ReviewAdmin(admin.ModelAdmin):
    list_display    = ('id', 'tour', 'user', 'rating', 'comment_snippet', 'created_at')
    list_filter     = ('rating', 'created_at')
    search_fields   = ('user__username', 'user__first_name', 'user__last_name', 'tour__name', 'comment')
    readonly_fields = ('created_at', 'updated_at')

    def comment_snippet(self, obj):
        return (obj.comment[:60] + '...') if len(obj.comment) > 60 else obj.comment
    comment_snippet.short_description = 'Nhận xét'

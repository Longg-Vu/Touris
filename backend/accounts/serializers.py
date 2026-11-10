from rest_framework import serializers
from django.contrib.auth import get_user_model
from django.contrib.auth.password_validation import validate_password

User = get_user_model()


class RegisterSerializer(serializers.ModelSerializer):
    """Serializer đăng ký tài khoản mới."""
    password  = serializers.CharField(write_only=True, required=True, validators=[validate_password])
    password2 = serializers.CharField(write_only=True, required=True, label='Xác nhận mật khẩu')

    class Meta:
        model  = User
        fields = ['username', 'email', 'first_name', 'last_name', 'phone', 'password', 'password2']
        extra_kwargs = {
            'email':      {'required': True},
            'first_name': {'required': True},
        }

    def validate_email(self, value):
        if User.objects.filter(email__iexact=value).exists():
            raise serializers.ValidationError('Email này đã được sử dụng.')
        return value.lower()

    def validate_username(self, value):
        if User.objects.filter(username__iexact=value).exists():
            raise serializers.ValidationError('Tên đăng nhập này đã tồn tại.')
        return value

    def validate(self, attrs):
        if attrs['password'] != attrs['password2']:
            raise serializers.ValidationError({'password': 'Hai mật khẩu không khớp.'})
        return attrs

    def create(self, validated_data):
        validated_data.pop('password2')
        user = User.objects.create_user(**validated_data)
        return user


class UserSerializer(serializers.ModelSerializer):
    """Serializer thông tin người dùng (profile)."""
    role = serializers.SerializerMethodField()

    class Meta:
        model  = User
        fields = [
            'id', 'username', 'email', 'first_name', 'last_name',
            'phone', 'avatar', 'is_staff', 'is_superuser', 'role'
        ]
        read_only_fields = ['id', 'username', 'email', 'is_staff', 'is_superuser', 'role']

    def get_role(self, obj):
        if obj.is_superuser:
            return 'admin'
        if obj.is_staff:
            return 'staff'
        return 'customer'


class GoogleAuthSerializer(serializers.Serializer):
    """Serializer nhận credential token từ Google Sign-In."""
    credential = serializers.CharField(required=True)


class ChangePasswordSerializer(serializers.Serializer):
    """Serializer đổi mật khẩu."""
    old_password = serializers.CharField(required=True, write_only=True)
    new_password = serializers.CharField(required=True, write_only=True, validators=[validate_password])
    new_password2 = serializers.CharField(required=True, write_only=True, label='Xác nhận mật khẩu mới')

    def validate(self, attrs):
        if attrs['new_password'] != attrs['new_password2']:
            raise serializers.ValidationError({'new_password': 'Hai mật khẩu mới không khớp.'})
        return attrs


class GuideSerializer(serializers.ModelSerializer):
    """Serializer danh sách nhân viên / HDV để gán vào tour."""
    full_name = serializers.SerializerMethodField()

    class Meta:
        model = User
        fields = ['id', 'username', 'email', 'first_name', 'last_name', 'full_name']

    def get_full_name(self, obj):
        name = f"{obj.first_name} {obj.last_name}".strip()
        return name if name else obj.username


class AdminUserListSerializer(serializers.ModelSerializer):
    """Serializer hiển thị thông tin user trong trang quản trị."""
    bookings_count = serializers.IntegerField(read_only=True, default=0)
    total_spent    = serializers.DecimalField(max_digits=14, decimal_places=0, read_only=True, default=0)
    role           = serializers.SerializerMethodField()

    class Meta:
        model = User
        fields = [
            'id', 'username', 'email', 'first_name', 'last_name',
            'phone', 'avatar', 'is_active', 'is_staff', 'is_superuser',
            'role', 'date_joined', 'last_login', 'bookings_count', 'total_spent'
        ]

    def get_role(self, obj):
        if obj.is_superuser:
            return 'admin'
        if obj.is_staff:
            return 'staff'
        return 'customer'


class AdminUserCreateSerializer(serializers.ModelSerializer):
    """Serializer tạo tài khoản mới bởi Quản trị viên."""
    password = serializers.CharField(write_only=True, required=True, min_length=6)
    role     = serializers.ChoiceField(choices=['customer', 'staff', 'admin'], default='customer', write_only=True)

    class Meta:
        model = User
        fields = [
            'id', 'username', 'email', 'first_name', 'last_name',
            'phone', 'password', 'role', 'is_active'
        ]

    def validate_email(self, value):
        if value and User.objects.filter(email__iexact=value).exists():
            raise serializers.ValidationError('Email này đã được sử dụng.')
        return value.lower() if value else value

    def validate_username(self, value):
        if User.objects.filter(username__iexact=value).exists():
            raise serializers.ValidationError('Tên đăng nhập này đã tồn tại.')
        return value

    def create(self, validated_data):
        role         = validated_data.pop('role', 'customer')
        password     = validated_data.pop('password')
        is_staff     = (role in ['admin', 'staff'])
        is_superuser = (role == 'admin')

        user = User.objects.create_user(
            **validated_data,
            is_staff=is_staff,
            is_superuser=is_superuser
        )
        user.set_password(password)
        user.save()
        return user


class AdminUserUpdateSerializer(serializers.ModelSerializer):
    """
    Serializer cập nhật người dùng bởi Quản trị viên.
    Chỉ cho phép phân quyền (role) và thay đổi trạng thái hoạt động (is_active).
    Các thông tin cá nhân (username, email, họ tên, SĐT) không được phép ghi đè.
    """
    role = serializers.ChoiceField(choices=['customer', 'staff', 'admin'], required=False)

    class Meta:
        model = User
        fields = ['is_active', 'role']

    def update(self, instance, validated_data):
        role = validated_data.pop('role', None)
        if role is not None:
            instance.is_staff     = (role in ['admin', 'staff'])
            instance.is_superuser = (role == 'admin')

        if 'is_active' in validated_data:
            instance.is_active = validated_data['is_active']

        instance.save()
        return instance


class AdminResetUserPasswordSerializer(serializers.Serializer):
    """Serializer đặt lại mật khẩu của người dùng bởi Admin (mặc định 123456 nếu không nhập)."""
    new_password = serializers.CharField(required=False, allow_blank=True, default='123456', write_only=True, min_length=6)



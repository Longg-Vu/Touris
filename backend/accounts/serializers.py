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
    class Meta:
        model  = User
        fields = ['id', 'username', 'email', 'first_name', 'last_name', 'phone', 'avatar', 'is_staff', 'is_superuser']
        read_only_fields = ['id', 'username', 'email', 'is_staff', 'is_superuser']


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
        if obj.is_superuser or obj.is_staff:
            return 'admin'
        return 'customer'


class AdminUserCreateSerializer(serializers.ModelSerializer):
    """Serializer tạo tài khoản mới bởi Quản trị viên."""
    password = serializers.CharField(write_only=True, required=True, min_length=6)
    role     = serializers.ChoiceField(choices=['customer', 'admin'], default='customer', write_only=True)

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
        is_admin     = (role == 'admin')

        user = User.objects.create_user(
            **validated_data,
            is_staff=is_admin,
            is_superuser=is_admin
        )
        user.set_password(password)
        user.save()
        return user


class AdminUserUpdateSerializer(serializers.ModelSerializer):
    """Serializer cập nhật thông tin và phân quyền user bởi Quản trị viên."""
    role = serializers.ChoiceField(choices=['customer', 'admin'], required=False)

    class Meta:
        model = User
        fields = [
            'first_name', 'last_name', 'phone', 'email',
            'is_active', 'role'
        ]

    def validate_email(self, value):
        user_id = self.instance.pk
        if value and User.objects.filter(email__iexact=value).exclude(pk=user_id).exists():
            raise serializers.ValidationError('Email này đã được tài khoản khác sử dụng.')
        return value.lower() if value else value

    def update(self, instance, validated_data):
        role = validated_data.pop('role', None)
        if role is not None:
            is_admin = (role == 'admin')
            instance.is_staff     = is_admin
            instance.is_superuser = is_admin

        for attr, value in validated_data.items():
            setattr(instance, attr, value)

        instance.save()
        return instance


class AdminResetUserPasswordSerializer(serializers.Serializer):
    """Serializer đặt lại mật khẩu của người dùng bởi Admin."""
    new_password = serializers.CharField(required=True, write_only=True, min_length=6)


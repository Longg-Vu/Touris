# BÁO CÁO RÀ SOÁT LỖI, LUỒNG SAI LOGIC & CHUẨN BỊ VẤN ĐÁP ĐỒ ÁN

> **Đề tài:** Hệ thống website quản lý và đặt tour du lịch (ReactJS + Django REST Framework + PostgreSQL)
> **Ngày rà soát:** 25/11/2026 — trên nhánh `main`, commit `d2e7d6f`
> **Phạm vi:** Toàn bộ `backend/` (accounts, tours, bookings, reviews, chat) và `frontend/src/` (public, customer, admin)
> **Cách làm:** Đọc mã nguồn từng file, đối chiếu request/response giữa frontend và backend, chạy `manage.py check`, `makemigrations --check`, `oxlint`, `vite build`, đối chiếu với tài liệu `Vu_ThaiHuuLong_MotaYeuCau_V1.md`.

**Ký hiệu mức độ:**
- 🔴 **Cao**: sai nghiệp vụ, lộ dữ liệu, mất tiền, hoặc hội đồng chỉ cần thử là thấy lỗi. Nên sửa trước buổi bảo vệ.
- 🟠 **Trung bình**: sai logic ở trường hợp biên, dữ liệu không nhất quán, trải nghiệm kém.
- 🟡 **Thấp**: code chưa gọn, cảnh báo, chi tiết giao diện.

**Kết quả kiểm tra tự động:**
| Lệnh | Kết quả |
|---|---|
| `python manage.py check` | Không lỗi |
| `python manage.py makemigrations --check` | Không thiếu migration |
| `npm run build` | Build thành công, nhưng bundle JS **998 KB** (> 500 KB, chưa chia code/lazy load) |
| `npx oxlint src` | ~40 cảnh báo: biến không dùng, `setState` gọi đồng bộ trong `useEffect`, thiếu dependency của `useEffect` |
| Unit test | **Không có test nào** (`chat/tests.py` rỗng, các app khác không có file test) |

---

## MỤC LỤC
1. [Top lỗi nghiêm trọng cần sửa trước khi bảo vệ](#1-top-lỗi-nghiêm-trọng-cần-sửa-trước-khi-bảo-vệ)
2. [Các luồng nghiệp vụ sai logic (backend), kèm đầu vào/đầu ra](#2-các-luồng-nghiệp-vụ-sai-logic-backend--đầu-vào--đầu-ra)
3. [Ma trận validate đầu vào của API](#3-ma-trận-validate-đầu-vào-api)
4. [Lỗi input và form ở frontend](#4-lỗi-input--form-ở-frontend)
5. [Lỗi luồng, state và hiển thị ở frontend](#5-lỗi-luồng--state--hiển-thị-ở-frontend)
6. [Phân quyền (RBAC) và bảo mật](#6-phân-quyền-rbac--bảo-mật)
7. [Chức năng đã cam kết nhưng chưa làm hoặc mới làm giả lập](#7-chức-năng-đã-cam-kết-nhưng-chưa-làm--làm-giả-lập)
8. [Câu hỏi vấn đáp dự kiến và gợi ý trả lời](#8-câu-hỏi-vấn-đáp-dự-kiến--gợi-ý-trả-lời)
9. [Kịch bản hội đồng có thể thử khi demo](#9-kịch-bản-hội-đồng-có-thể-thử-khi-demo)
10. [Thứ tự ưu tiên sửa](#10-thứ-tự-ưu-tiên-sửa)

---

## 1. TOP LỖI NGHIÊM TRỌNG CẦN SỬA TRƯỚC KHI BẢO VỆ

| # | Lỗi | Vị trí | Hậu quả |
|---|---|---|---|
| 1 | **Ai cũng có thể "thanh toán" mọi đơn mà không cần trả tiền.** API `pay` dùng `AllowAny`. Khách chưa đăng nhập thì `get_queryset()` trả về `Booking.objects.all()`. Gọi `POST /api/bookings/bookings/{id}/pay/` là đơn đổi từ `pending` sang `confirmed`. | `backend/bookings/views.py:58-68`, `:137-164` | Đơn chuyển sang "Đã xác nhận" dù chưa có tiền, và người lạ cũng xác nhận được đơn của người khác. Doanh thu trên dashboard cộng cả các đơn này. |
| 2 | **Ai cũng xem được chi tiết đơn của người khác (lỗi IDOR).** `retrieve` dùng `AllowAny` và queryset là toàn bộ đơn. Gọi `GET /api/bookings/bookings/1/`, `/2/`... không cần đăng nhập. | `backend/bookings/views.py:60-68` | Lộ họ tên, SĐT, email, yêu cầu đặc biệt và số tiền của mọi khách. |
| 3 | **API tra cứu đơn làm lộ dữ liệu hàng loạt.** `lookup?code=5` khớp luôn `id=5`, nên chỉ cần thử lần lượt 1, 2, 3... là lấy hết đơn. `lookup?phone=...` chỉ cần SĐT, không cần thêm mã đơn hay email. | `backend/bookings/views.py:90-118` | Thu thập được toàn bộ thông tin khách hàng. |
| 4 | **Không quản lý số chỗ, lịch khởi hành hay sức chứa.** Model `Tour` không có lịch khởi hành, số chỗ tối đa hay thời lượng. `travel_date` là ngày bất kỳ khách tự nhập. Bộ lọc theo ngày `filter_by_date` thực ra không lọc gì. | `backend/tours/models.py:64-151`, `backend/tours/views.py:84-86` | Đặt được 1000 người vào một tour, chọn được ngày tour không chạy. Tài liệu yêu cầu thì ghi "chọn ngày khởi hành từ lịch tour còn chỗ trống". |
| 5 | **Khách vãng lai đặt tour bằng email của người khác thì đơn gắn vào tài khoản người đó.** Nếu email chưa có tài khoản, hệ thống tự tạo tài khoản với mật khẩu cố định `123456` và gửi mật khẩu dạng chữ thường qua email. | `backend/bookings/serializers.py:79-115`, tương tự ở `:421-455` (tư vấn) | Có thể chèn đơn rác vào tài khoản người khác. Tài khoản tạo hàng loạt có mật khẩu yếu đoán được. Mật khẩu `123456` cũng vi phạm chính `AUTH_PASSWORD_VALIDATORS` mà dự án cấu hình. |
| 6 | **Đánh giá được ngay sau khi "thanh toán", chưa cần đi tour.** Điều kiện để đánh giá là `status in [confirmed, completed]`. Kết hợp với lỗi số 1: đặt tour, bấm pay, rồi đánh giá 5 sao. Nhân viên và admin còn đánh giá được mọi tour mà không cần đặt. | `backend/reviews/serializers.py:77-89`, `backend/reviews/views.py:82-88` | Rating bị thao túng. Tài liệu yêu cầu ghi "đánh giá sau khi chuyến đi hoàn thành". |
| 7 | **Nhân viên (HDV) tự đặt Flash Sale tới 90% và tự đổi giá tour của mình.** Các API `activate-sale`, `deactivate-sale`, `clear-priority`, sửa `price_adult`, `sale_percent` chỉ kiểm tra `IsStaffOrSuperUser`, dù docstring ghi "Admin". | `backend/tours/views.py:565-655` | Phân quyền không khớp với mô tả. Nhân viên tự quyết giá bán. |
| 8 | **`sale_percent` không bị giới hạn 0–100 khi sửa tour qua PATCH** (kiểu `PositiveSmallIntegerField` cho phép tới 32767). Với 150%, giá sale bị âm. `price_adult` cũng không chặn số âm hay bằng 0. | `backend/tours/models.py:99-102,139`, `backend/tours/serializers.py:146` | Giá tour âm, tổng tiền đơn âm. |
| 9 | **Bot trả lời sai câu hỏi trẻ em.** Từ khoá `'rẻ'` (nhánh Sale) nằm trong chữ "t**rẻ** em", mà nhánh Sale được kiểm tra trước, nên nút nhanh "Chính sách giá vé trẻ em" lại trả về danh sách tour giảm giá. Đã kiểm chứng: `'rẻ' in 'chính sách giá vé trẻ em ra sao?'` cho kết quả `True`. | `backend/chat/bot_engine.py:64,100` | Lỗi rất dễ lộ khi demo, chỉ cần bấm nút gợi ý thứ 2. |
| 10 | **Phiên chat mới không bao giờ được bot trả lời câu hỏi tự do.** Phiên mới có `status='active'` theo mặc định. Nhánh 6 của bot coi `active` là "nhân viên đang chat" nên im lặng và không chuyển sang `waiting_staff`. | `backend/chat/models.py:67-72`, `backend/chat/bot_engine.py:177-180` | Khách gõ câu đầu tiên mà không có phản hồi. Nhân viên cũng không thấy phiên này trong mục "Chờ nhân viên". |
| 11 | **Xoá tour sẽ xoá luôn toàn bộ đơn đặt và đánh giá** (`on_delete=CASCADE`). | `backend/bookings/models.py:46-51`, `backend/reviews/models.py:23-28` | Mất lịch sử doanh thu, dashboard thay đổi sau khi xoá. |
| 12 | **Khách tự huỷ đơn bất kỳ lúc nào**, kể cả đơn đã thanh toán, ngày đi đã qua hoặc ngày đi là hôm nay. Không có hạn huỷ, không ghi nhận hoàn tiền. Trong khi bot lại nói "Miễn phí huỷ trước 24h, hoàn 100%". | `backend/bookings/views.py:120-135`, `backend/chat/bot_engine.py:133-146` | Nghiệp vụ huỷ không khớp với chính sách đang công bố. |

> Các lỗi 🔴 ở frontend (mục 4 và 5) được đánh dấu riêng trong từng bảng.

---

## 2. CÁC LUỒNG NGHIỆP VỤ SAI LOGIC (BACKEND), KÈM ĐẦU VÀO/ĐẦU RA

### 2.1. Luồng Xác thực (Đăng ký, Đăng nhập, Google, Đổi mật khẩu)

| # | Đầu vào hoặc thao tác | Đầu ra hiện tại | Đầu ra đúng | Vị trí | Mức |
|---|---|---|---|---|---|
| A1 | Đăng nhập bằng **email** + mật khẩu ở `POST /api/auth/login/` | 401: endpoint `TokenObtainPairView` chỉ nhận `username` | Tài liệu yêu cầu cho đăng nhập bằng "email/tên tài khoản". Cần serializer tuỳ chỉnh nhận cả email | `accounts/urls.py:20` | 🟠 |
| A2 | Đăng xuất rồi dùng lại refresh token cũ | Vẫn đổi được access token mới. `BLACKLIST_AFTER_ROTATION=True` nhưng **chưa cài** `rest_framework_simplejwt.token_blacklist` nên blacklist không hoạt động (lỗi bị bỏ qua, không báo) | Thêm app `token_blacklist` và endpoint `logout/` để blacklist refresh token | `settings.py:24-46,151-152` | 🟠 |
| A3 | Đổi mật khẩu thành công | Access và refresh token cũ vẫn dùng được tới khi hết hạn (60 phút / 7 ngày) | Thu hồi token cũ sau khi đổi mật khẩu | `accounts/views.py:163-183` | 🟡 |
| A4 | Tài khoản tạo bằng Google, vào "Đổi mật khẩu" | Luôn báo "Mật khẩu hiện tại không đúng" vì tài khoản có `set_unusable_password()` | Cho phép đặt mật khẩu lần đầu nếu `not user.has_usable_password()` | `accounts/views.py:143,175` | 🟠 |
| A5 | Đăng nhập Google bằng tài khoản có email **chưa xác minh** | Vẫn gộp vào tài khoản có sẵn cùng email, vì không kiểm tra `id_info['email_verified']` | Từ chối nếu `email_verified` khác True, vì có nguy cơ chiếm tài khoản | `accounts/views.py:97-108` | 🟠 |
| A6 | Người dùng đổi avatar, sau đó đăng nhập Google | Avatar bị **ghi đè** bằng ảnh Google mỗi lần đăng nhập | Chỉ gán khi `avatar` đang rỗng | `accounts/views.py:116-118` | 🟡 |
| A7 | Lỗi bất ngờ trong Google login | Trả `{'error': str(e)}` với mã 400, lộ thông tin nội bộ | Ghi log, trả thông báo chung với mã 500 | `accounts/views.py:159-160` | 🟡 |
| A8 | `GOOGLE_CLIENT_ID` không có trong `.env` | Dùng Client ID **cố định trong code** | Bắt buộc lấy từ biến môi trường | `accounts/views.py:86-89` | 🟡 |
| A9 | Đăng ký với `phone="abc"`, `"0000"` hoặc `"   "` | Được chấp nhận, không kiểm tra định dạng SĐT Việt Nam và không kiểm tra trùng | Regex `^(0|\+84)(3|5|7|8|9)\d{8}$` và kiểm tra trùng | `accounts/serializers.py:8-39` | 🟠 |
| A10 | Đăng ký đồng thời 2 request cùng email | Cả hai đều có thể thành công, vì `email` của `AbstractUser` không có ràng buộc unique ở DB | Thêm `unique=True` (hoặc unique constraint với `Lower(email)`) | `accounts/models.py:5-16` | 🟡 |
| A11 | `PATCH /api/auth/profile/` với `first_name=""` hoặc `avatar=<chuỗi base64 50MB>` | Được lưu. `avatar` là `TextField` không giới hạn, `phone` không được kiểm tra | Giới hạn kích thước và định dạng ảnh, không cho tên rỗng, kiểm tra SĐT | `accounts/models.py:16`, `accounts/serializers.py:42-52` | 🟠 |
| A12 | Đổi mật khẩu mới thành `"vanhau123"` khi username là `vanhau` | Có thể vượt qua `UserAttributeSimilarityValidator`, vì gọi `validate_password` **không truyền `user`** | Gọi `validate_password(pw, user=request.user)` | `accounts/serializers.py:70` | 🟡 |
| A13 | Không có luồng "Quên mật khẩu" | Người dùng phải nhờ admin reset về `123456` | Gửi email kèm token để tự đặt lại mật khẩu | — | 🟠 |

### 2.2. Luồng Quản trị người dùng (Admin)

| # | Đầu vào hoặc thao tác | Đầu ra hiện tại | Đầu ra đúng | Vị trí | Mức |
|---|---|---|---|---|---|
| U1 | Admin duy nhất gửi `PATCH /admin/users/{mình}/ {"role":"customer"}` | **Thành công**: hệ thống mất admin cuối cùng. Chỉ `destroy` và `toggle-active` có kiểm tra "admin cuối" | Kiểm tra admin cuối và không cho tự hạ quyền trong `AdminUserUpdateSerializer` | `accounts/serializers.py:152-174` | 🔴 |
| U2 | `PATCH /admin/users/{mình}/ {"is_active": false}` | Tự khoá được tài khoản của mình (bỏ qua kiểm tra trong `toggle_active`) | Áp dụng cùng kiểm tra như `toggle_active` | như trên | 🟠 |
| U3 | Reset mật khẩu không nhập gì | Mật khẩu thành `123456`. Mật khẩu xuất hiện **dạng chữ thường** trong response API và trong email | Sinh mật khẩu ngẫu nhiên hoặc gửi link đặt lại. Không trả mật khẩu trong response | `accounts/views.py:286-362` | 🟠 |
| U4 | Reset mật khẩu kèm `email="abc"` hoặc email trùng với user khác | Email của user bị ghi đè, không kiểm tra định dạng và trùng lặp | Validate email và kiểm tra unique | `accounts/views.py:297-301` | 🟠 |
| U5 | Admin tạo user với `password="123456"` | Được chấp nhận vì chỉ có `min_length=6`, bỏ qua validator chung | Dùng `validate_password` | `accounts/serializers.py:116` | 🟡 |
| U6 | Xoá user có đơn đặt tour | Đơn vẫn còn nhưng `user=NULL` (SET_NULL), review của user bị xoá theo (CASCADE) | Nên khoá (soft-delete) thay vì xoá cứng | `bookings/models.py:38-45`, `reviews/models.py:29-34` | 🟡 |
| U7 | API `guides` | Trả về cả superuser (vì superuser cũng có `is_staff=True`) | Tách riêng role HDV, hoặc lọc `is_superuser=False` nếu chỉ cần HDV | `accounts/views.py:384` | 🟡 |
| U8 | Vai trò "Nhân viên" và "Hướng dẫn viên" | Chung một cờ `is_staff`. Nhân viên còn đăng nhập được `/admin/` của Django | Tách role rõ ràng (field `role` hoặc Group/Permission) | `accounts/permissions.py` | 🟡 |

### 2.3. Luồng Tour (công khai và quản trị)

| # | Đầu vào hoặc thao tác | Đầu ra hiện tại | Đầu ra đúng | Vị trí | Mức |
|---|---|---|---|---|---|
| T1 | `GET /api/tours/tours/?date=2026-12-24` hoặc `start_date`/`end_date` | Trả về **mọi tour đang active**, bộ lọc ngày chỉ là hình thức | Lọc theo lịch khởi hành, việc này cần model `TourSchedule` | `tours/views.py:84-86` | 🔴 |
| T2 | Admin tạo tour `price_adult=-500000` hoặc `0` | Lưu được | `MinValueValidator(1000)` | `tours/models.py:99`, `tours/serializers.py:146` | 🔴 |
| T3 | PATCH tour `sale_percent=150, is_priority_sale=true` | Giá sale `= price*(100-150)/100` ra **số âm**, đơn đặt có tổng tiền âm | Giới hạn 0–100 (hoặc 0–90 như `activate-sale`) | `tours/models.py:139`, serializer không validate | 🔴 |
| T4 | `activate-sale` với `sale_percent=95` hoặc `"abc"` | Tự đổi thành 20% và báo **thành công** | Trả lỗi 400 cho giá trị không hợp lệ | `tours/views.py:590-596` | 🟠 |
| T5 | `toggle-priority` bật cờ khi `sale_percent` vẫn còn giá trị cũ, ví dụ 30 | Giảm giá 30% **tự bật lại** mà admin không chủ ý | Tách cờ "cần gom khách" khỏi trạng thái "đang giảm giá" | `tours/views.py:639-655`, `tours/models.py:146-151` | 🟠 |
| T6 | Gán `guide` là tài khoản **khách hàng** khi tạo hoặc sửa tour | Được chấp nhận (FK tới mọi User) | Chỉ chấp nhận user `is_staff=True` | `tours/serializers.py:138-202` | 🟠 |
| T7 | Admin sửa `booked_count = "10K+"` | Lượt đặt hiển thị là chuỗi nhập tay, không lấy từ số đơn thật | Tính từ bảng Booking, hoặc ghi rõ đây là số hiển thị marketing | `tours/models.py:111-114` | 🟠 |
| T8 | Đổi `destination` của tour từ Đà Nẵng sang Hà Nội | Signal chỉ cập nhật `tour_count` của điểm đến **mới**, điểm đến cũ giữ số sai | Cập nhật cả điểm đến cũ (dùng `pre_save` để lấy giá trị cũ) | `tours/models.py:232-236` | 🟡 |
| T9 | `itinerary`, `highlights`, `gallery`, `tags` là JSON tuỳ ý, ví dụ `"abc"` hoặc `{}` | Được lưu, sau đó frontend gọi `.map()` có thể bị crash | Validate là list với cấu trúc phần tử cụ thể | `tours/models.py:121-126` | 🟠 |
| T10 | Ảnh tour | Chỉ nhập URL (`URLField`), không có upload | Upload file (Pillow đã có trong requirements nhưng không dùng) | `tours/models.py:103` | 🟡 |
| T11 | `time_filter=completed` | Tính cả đơn **pending** có ngày đi trong quá khứ là "đã hoàn thành" | Chỉ tính `status=completed` | `tours/views.py:290-295`, `:417-422` | 🟠 |
| T12 | Thông báo Sale (`notifications`) | Mọi nhân viên thấy **tất cả** cảnh báo, và ai cũng có thể "đánh dấu đã đọc tất cả" cho người khác | Lưu trạng thái đọc theo từng người nhận | `tours/views.py:657-692` | 🟠 |
| T13 | HDV gửi `alert-sale` 100 lần liên tục | Tạo 100 bản ghi SaleAlert, không giới hạn tần suất. `note` không giới hạn độ dài | Giới hạn tần suất (ví dụ 1 lần/giờ/tour) và độ dài ghi chú | `tours/views.py:514-563` | 🟡 |
| T14 | Không có API CRUD cho **Danh mục** và **Điểm đến** | Chỉ thêm/sửa được qua Django Admin `/admin/` | Tài liệu yêu cầu admin quản lý Category/Destination trên giao diện | `tours/views.py:162-191` (ReadOnly) | 🟠 |
| T15 | Danh sách tour admin dùng `prefetch_related('bookings')` và tính 7 field từ toàn bộ booking | Tính toán bằng Python trên mọi booking của mọi tour (24 tour/trang). Dashboard có vòng lặp N+1 | Dùng `annotate(Sum(...))` | `tours/serializers.py:210-252`, `bookings/views.py:460-463` | 🟡 |

### 2.4. Luồng Yêu thích (Favorites)

| # | Đầu vào | Đầu ra hiện tại | Đầu ra đúng | Vị trí | Mức |
|---|---|---|---|---|---|
| F1 | `POST /api/tours/favorites/ {"tour_id": 1}` (route create mặc định của ModelViewSet) | **Lỗi 500 IntegrityError**: không có `perform_create` gán `user`, nên `user_id` NULL | Chặn method hoặc gán `user=request.user` | `tours/views.py:699-714` | 🟠 |
| F2 | `PUT`/`PATCH`/`DELETE /favorites/{id}/` | Vẫn mở (ModelViewSet đầy đủ) | Giới hạn `http_method_names` | như trên | 🟡 |
| F3 | `toggle {"tour_id":"abc"}` hoặc `sync {"tour_ids":["abc"]}` | **Lỗi 500** (ValueError khi ép kiểu id) | Validate số nguyên, trả 400 | `tours/views.py:728-760` | 🟡 |
| F4 | `by-ids` với `ids=[{"a":1}]` | Lỗi 500 TypeError (chỉ bắt ValueError) | Bắt cả TypeError | `tours/views.py:150-154` | 🟡 |

### 2.5. Luồng Đặt tour (Booking), luồng chính của đồ án

**Đầu vào** `POST /api/bookings/bookings/`: `tour, travel_date, num_adults, num_children, contact_name, contact_phone, contact_email, special_request`
**Đầu ra:** `BookingListSerializer` (id, booking_code, giá, tổng tiền, trạng thái...)

| # | Đầu vào hoặc thao tác | Đầu ra hiện tại | Đầu ra đúng | Vị trí | Mức |
|---|---|---|---|---|---|
| B1 | `num_adults=5000` hoặc `num_children=30000` | Được chấp nhận, không giới hạn số người và không kiểm tra số chỗ còn | Giới hạn theo số chỗ còn của lịch khởi hành | `bookings/serializers.py:43-52` | 🔴 |
| B2 | `travel_date="2035-01-01"` | Được chấp nhận, đặt được ngày cách 10 năm | Chỉ cho chọn ngày có lịch khởi hành | `bookings/serializers.py:37-41` | 🟠 |
| B3 | `travel_date` = hôm nay lúc 23:59 | Được chấp nhận. `date.today()` dùng giờ hệ thống, không dùng `timezone.localdate()` | Dùng `timezone.localdate()` và yêu cầu đặt trước tối thiểu N ngày | như trên | 🟡 |
| B4 | `contact_phone="abc"` hoặc `"1"` | Được chấp nhận (chỉ kiểm tra không rỗng) | Kiểm tra định dạng SĐT Việt Nam | `bookings/serializers.py:48-49` | 🟠 |
| B5 | `contact_name="<b>Hack</b><img src=x>"` | Được lưu và **chèn thẳng vào HTML email** (f-string, không escape), dẫn tới HTML injection trong email | `django.utils.html.escape()` hoặc dùng template | `bookings/serializers.py:165-214`, `:509-545` | 🟠 |
| B6 | Giá trẻ em | Luôn bằng **70% giá người lớn**, cố định trong code. Không có loại "em bé" như bot nói "dưới 3 tuổi miễn phí" | Thêm `price_child` và `price_infant` vào Tour, thêm `num_infants` vào Booking | `bookings/serializers.py:60`, `chat/bot_engine.py:103-105` | 🟠 |
| B7 | Khách vãng lai nhập email của người khác | Đơn được gắn vào **tài khoản người đó**, SĐT của họ có thể bị ghi | Để `user=None` cho khách vãng lai, xác thực email trước khi liên kết | `bookings/serializers.py:79-88` | 🔴 |
| B8 | Khách vãng lai, email mới | Tự tạo tài khoản, mật khẩu `123456`, gửi qua email | Gửi link kích hoạt hoặc đặt mật khẩu thay vì mật khẩu mặc định | `bookings/serializers.py:89-115` | 🔴 |
| B9 | Tạo user thành công nhưng tạo Booking lỗi | User "mồ côi" vẫn còn, vì không có `transaction.atomic()` | Bọc toàn bộ trong `transaction.atomic()` | `bookings/serializers.py:54-133` | 🟡 |
| B10 | SMTP chậm hoặc treo | Request đặt tour bị treo theo thời gian gửi mail (gửi đồng bộ) | Gửi bất đồng bộ (Celery hoặc thread), hoặc dùng `on_commit` | `bookings/serializers.py:128-131` | 🟡 |
| B11 | Mã `booking_code` | `BK{yymmdd}-XXXX` (4 ký tự ngẫu nhiên). Nếu trùng sẽ lỗi 500 IntegrityError, không có retry | Dùng 8 ký tự trở lên hoặc vòng retry | `bookings/models.py:116-122` | 🟡 |
| B12 | Email hướng dẫn chuyển khoản dùng "Cú pháp: BOOKING {id}" | Dùng id nội bộ thay vì `booking_code` | Dùng `booking_code` | `bookings/serializers.py:199` | 🟡 |
| B13 | `Booking.save()` khi admin sửa số người | `total_price` **không tính lại** vì chỉ tính khi `total_price` rỗng | Luôn tính lại ở server | `bookings/models.py:109-115` | 🟡 |
| B14 | Không có danh sách hành khách (`BookingPassenger`) | Chỉ có thông tin người liên hệ | Tài liệu yêu cầu "nhập danh sách hành khách" | — | 🟠 |

### 2.6. Luồng Thanh toán

| # | Đầu vào hoặc thao tác | Đầu ra hiện tại | Đầu ra đúng | Vị trí | Mức |
|---|---|---|---|---|---|
| P1 | `POST /bookings/{id}/pay/` (không cần token) | Đơn của **bất kỳ ai** chuyển sang `confirmed` | Chỉ chủ đơn mới được gọi. Thanh toán thật cần xác nhận từ cổng thanh toán hoặc admin | `bookings/views.py:137-164` | 🔴 |
| P2 | `pay` với `method="<script>"` hoặc chuỗi dài 1MB | Nối thẳng vào `special_request` của khách | Bảng `Payment(method, amount, status, transaction_id, paid_at)` | `bookings/views.py:151-158` | 🟠 |
| P3 | Không có bảng Payment | Không biết đơn đã trả bao nhiêu, trả lúc nào, cọc hay toàn bộ. "Đã xác nhận" bị dùng chung cho "Đã thanh toán" | Tách trạng thái thanh toán (`payment_status`) khỏi trạng thái đơn | `bookings/models.py` | 🔴 |
| P4 | Bot nói "Quét mã VietQR tự động: xác nhận thanh toán ngay lập tức" | Không có tích hợp VietQR hay webhook ngân hàng | Bỏ câu này hoặc tích hợp thật | `chat/bot_engine.py:119-123` | 🟠 |

### 2.7. Luồng Huỷ đơn và xử lý trạng thái đơn

Sơ đồ trạng thái hiện tại (chưa có kiểm soát chặt):
```
pending ──pay (ai cũng gọi được)──▶ confirmed ──complete──▶ completed
   │                                  │  ▲                      │
   └─cancel──▶ cancelled ◀──cancel────┘  └──confirm (admin)─────┘  ← completed quay lại confirmed được!
```

| # | Đầu vào hoặc thao tác | Đầu ra hiện tại | Đầu ra đúng | Vị trí | Mức |
|---|---|---|---|---|---|
| S1 | Admin bấm `confirm` trên đơn **completed** | Đơn **quay về** `confirmed` | Chỉ cho `pending → confirmed` | `bookings/views.py:270-280` | 🟠 |
| S2 | Admin bấm `complete` khi `travel_date` còn ở tương lai | Đơn thành `completed` trước khi đi, và mở khoá quyền đánh giá | Chỉ cho hoàn thành khi `travel_date <= hôm nay` | `bookings/views.py:282-292` | 🟠 |
| S3 | Khách huỷ đơn `confirmed` đã trả tiền, ngày đi hôm qua | Huỷ thành công, không có phí, không ghi nhận hoàn tiền | Áp dụng hạn huỷ (≥24h trước ngày đi), tạo yêu cầu hoàn tiền | `bookings/views.py:120-135` | 🔴 |
| S4 | Khách vãng lai muốn huỷ đơn | Không làm được (`cancel` yêu cầu đăng nhập) trong khi `pay` lại không cần đăng nhập | Thống nhất: tra cứu bằng mã đơn + email/OTP rồi mới cho thao tác | `bookings/views.py:58-62` | 🟠 |
| S5 | Đổi trạng thái đơn | Không gửi email hay thông báo cho khách | Gửi email khi xác nhận, huỷ hoặc hoàn thành | — | 🟡 |
| S6 | Admin muốn sửa ngày đi hoặc số khách | Không có API (ReadOnly + action) | Thêm PATCH có kiểm soát | `bookings/views.py:180` | 🟡 |
| S7 | Không có trạng thái "Đã thanh toán", "Đang diễn ra" như trong tài liệu yêu cầu | Chỉ có 4 trạng thái | Bổ sung hoặc giải thích lý do khi vấn đáp | `bookings/models.py:25-35` | 🟡 |

### 2.8. Luồng Tra cứu đơn (khách vãng lai)

| # | Đầu vào | Đầu ra hiện tại | Đầu ra đúng | Mức |
|---|---|---|---|---|
| L1 | `GET lookup/?code=1` | Trả về đơn có `id=1` (đầy đủ thông tin cá nhân) | Chỉ khớp `booking_code` **và** SĐT/email | 🔴 |
| L2 | `GET lookup/?phone=0988112233` | Trả về **mọi đơn** có SĐT đó | Bắt buộc thêm mã đơn hoặc OTP | 🔴 |
| L3 | Gọi liên tục để dò | Không giới hạn tần suất (`throttle`) | Thêm `AnonRateThrottle` | 🟠 |

*(Vị trí: `backend/bookings/views.py:90-118`)*

### 2.9. Luồng Đánh giá (Reviews)

| # | Đầu vào hoặc thao tác | Đầu ra hiện tại | Đầu ra đúng | Vị trí | Mức |
|---|---|---|---|---|---|
| R1 | Khách có đơn `confirmed`, chưa đi | Được đánh giá | Chỉ `completed` và `travel_date` đã qua | `reviews/serializers.py:80-84`, `views.py:90-94` | 🔴 |
| R2 | Staff hoặc Admin đánh giá tour bất kỳ | Được ("đánh giá thử nghiệm") và **tính vào rating thật** | Không cho, hoặc gắn cờ và loại khỏi rating | `reviews/serializers.py:79`, `views.py:82-88` | 🟠 |
| R3 | Staff xoá đánh giá 1 sao | Xoá được mọi review, không có trạng thái ẩn/duyệt | Thêm `is_hidden`/`status` để kiểm duyệt (như tài liệu yêu cầu) | `reviews/views.py:40-47` | 🟠 |
| R4 | Gửi review cho **tour đã tắt** (`is_active=False`) | Được chấp nhận (field `tour` dùng queryset là mọi tour) | Chỉ cho tour active | `reviews/serializers.py:24-38` | 🟡 |
| R5 | `can-review?tour=abc` hoặc `GET /reviews/?tour=abc` | Lỗi 500 ValueError | Validate số nguyên | `reviews/views.py:35-37,57-71` | 🟡 |
| R6 | Muốn sửa đánh giá | Không có (PUT/PATCH bị chặn bởi `http_method_names`) dù serializer đã có nhánh update | Cho phép sửa, hoặc bỏ code thừa | `reviews/views.py:26` | 🟡 |
| R7 | `get_permissions` nhắc tới action `summary` | Không có action này | Xoá hoặc viết thêm | `reviews/views.py:29` | 🟡 |
| R8 | `comment` dài 1MB, chứa HTML | Được lưu (chỉ kiểm tra tối thiểu 5 ký tự) | Giới hạn độ dài tối đa (ví dụ 2000 ký tự) | `reviews/serializers.py:55-59` | 🟡 |

### 2.10. Luồng Yêu cầu tư vấn (Consultation)

| # | Đầu vào hoặc thao tác | Đầu ra hiện tại | Đầu ra đúng | Vị trí | Mức |
|---|---|---|---|---|---|
| C1 | Bot spam `POST /consultations/` với các email khác nhau | Mỗi request **tạo 1 tài khoản mới** và gửi email chứa mật khẩu | Không tự tạo tài khoản khi gửi tư vấn. Thêm throttle hoặc captcha | `bookings/serializers.py:404-475` | 🔴 |
| C2 | `phone="abc"` | Được chấp nhận | Kiểm tra SĐT | `bookings/serializers.py:392-396` | 🟠 |
| C3 | Admin/HDV gửi `POST /admin/consultations/` hoặc `DELETE` | Được (ModelViewSet đầy đủ), HDV xoá được yêu cầu tư vấn | Giới hạn method, chỉ admin được xoá | `bookings/views.py:541-582` | 🟡 |
| C4 | HDV `PATCH assigned_to=<id khách hàng>` | Được (FK tới mọi user). Sau đó HDV mất quyền xem chính yêu cầu đó | Chỉ gán cho staff | `bookings/serializers.py:653-657` | 🟠 |
| C5 | Đổi trạng thái `resolved → pending` | Được, không có ràng buộc chuyển trạng thái | Định nghĩa các bước chuyển hợp lệ | như trên | 🟡 |

### 2.11. Luồng Live Chat và Trợ lý ảo

| # | Đầu vào hoặc thao tác | Đầu ra hiện tại | Đầu ra đúng | Vị trí | Mức |
|---|---|---|---|---|---|
| CH1 | Bấm "👶 Chính sách giá vé trẻ em" | Bot trả **danh sách tour Sale** (`'rẻ' ⊂ 'trẻ'`) | Khớp theo từ (regex `\b`) hoặc đưa nhánh trẻ em lên trước | `chat/bot_engine.py:64` | 🔴 |
| CH2 | Câu chứa "hotline", "photo", "shot"... | Rơi vào nhánh Sale (`'hot'` là chuỗi con) | Như trên | như trên | 🟠 |
| CH3 | Phiên mới, khách gõ "Tour Sapa mấy ngày?" | Bot **im lặng**, trạng thái vẫn `active` nên không vào hàng chờ nhân viên | Trạng thái mặc định nên là `bot`/`new`, nhánh 6 chỉ im lặng khi `assigned_to` đã trả lời | `chat/models.py:67-72`, `bot_engine.py:177-180` | 🔴 |
| CH4 | Khách đã đăng nhập gửi tin vào `session_id` của **khách vãng lai khác** (nếu biết id) | `session.user = request.user`, tức **chiếm** phiên chat đó và đọc toàn bộ lịch sử. Trái với logic ở `init` (không cho gộp) | Trả 403 như ở `init` | `chat/views.py:130-131` | 🟠 |
| CH5 | `customer_phone: 123` (kiểu số) | Lỗi 500 `AttributeError: int has no strip` | `str(...)` trước khi strip | `chat/views.py:137-142` | 🟡 |
| CH6 | Gửi tin nhắn 1MB, spam liên tục | Không giới hạn độ dài hay tần suất. Mỗi lần gửi trả về **toàn bộ** lịch sử | Giới hạn độ dài, throttle, chỉ trả tin mới | `chat/views.py:116-174` | 🟡 |
| CH7 | "Live chat" | Thực chất là **polling** HTTP, không có WebSocket | Nói rõ khi vấn đáp, hoặc dùng Django Channels | — | 🟡 |
| CH8 | HDV chỉ thấy phiên thuộc tour mình | Phiên không gắn tour, không gán người thì **chỉ admin thấy**. Nếu admin không online thì không ai trả lời | Có hàng chờ chung cho mọi nhân viên | `chat/views.py:237-239` | 🟠 |
| CH9 | Admin/Staff `PUT`/`DELETE /api/chat/admin/sessions/{id}/` | Được (ModelViewSet), sửa được `unread_staff_count`, `session_id`... | Giới hạn method và các field được ghi | `chat/views.py:224-231` | 🟡 |
| CH10 | Bot lặp lại nguyên văn câu khách hỏi trong câu trả lời | Nếu frontend render markdown hoặc HTML không escape thì có nguy cơ XSS (xem mục 4/5) | Escape khi render | `bot_engine.py:188-193` | 🟠 |

### 2.12. Luồng Dashboard và thống kê

| # | Chỉ số | Cách tính hiện tại | Vấn đề | Vị trí | Mức |
|---|---|---|---|---|---|
| D1 | Doanh thu | Tổng `total_price` của đơn `confirmed`/`completed` theo `created_at` | Cộng cả đơn "pay giả" (P1). Tính theo **ngày tạo đơn**, không theo ngày thanh toán hay ngày đi | `bookings/views.py:382-397` | 🟠 |
| D2 | Doanh thu 12 tháng | `now - 365 ngày` | Tháng đầu bị cắt nửa. Tháng không có doanh thu **không xuất hiện** (không điền 0) nên biểu đồ bị nhảy cóc | `bookings/views.py:404-424` | 🟡 |
| D3 | Top 5 tour | Đếm **mọi đơn, kể cả đã huỷ**, cộng doanh thu cả đơn huỷ và pending | Lọc theo trạng thái hợp lệ | `bookings/views.py:427-435` | 🟠 |
| D4 | Tổng khách hàng (HDV) | `values('user').distinct()` | Đếm `NULL` (khách vãng lai) thành 1 khách | `bookings/views.py:378` | 🟡 |
| D5 | Doanh thu theo tuần, quý, năm | Không có | Tài liệu yêu cầu có | — | 🟡 |
| D6 | Dashboard và tour cùng dùng `prefetch` + vòng lặp Python | Chậm khi dữ liệu lớn | Dùng aggregate | `bookings/views.py:460-463` | 🟡 |

---

## 3. MA TRẬN VALIDATE ĐẦU VÀO API

| Trường | API | Backend đang kiểm tra | Nên kiểm tra |
|---|---|---|---|
| `username` | register | trùng (iexact) | độ dài 3–30, chỉ chữ/số/_ , không khoảng trắng |
| `email` | register, admin create | trùng (iexact), định dạng | + unique ở DB |
| `password` | register, change | validator Django (≥8, không toàn số, không phổ biến) | ✔ (nhưng admin create/reset chỉ ≥6 và mặc định `123456`) |
| `phone` | register, profile, booking, consultation, chat | **không kiểm tra** | regex SĐT VN, 10 số |
| `first_name` | register, profile | required lúc đăng ký, profile thì để rỗng được | không cho rỗng hay chỉ có khoảng trắng |
| `avatar` | profile | **không** (TextField) | URL hợp lệ hoặc file ≤2MB, kiểu jpg/png/webp |
| `price_adult` | admin tour | Decimal (âm được) | > 0 |
| `sale_percent` | admin tour PATCH | **không** (0–32767) | 0–100 |
| `target_participants` | admin tour | IntegerField (**âm được**, `-5`) | ≥ 1 |
| `itinerary`/`gallery`/`highlights`/`tags` | admin tour | JSON bất kỳ | list với schema rõ ràng |
| `thumbnail` | admin tour | URLField | ✔ |
| `guide` | admin tour | FK user bất kỳ | chỉ staff |
| `travel_date` | booking | ≥ hôm nay | ≤ 1 năm, phải nằm trong lịch khởi hành |
| `num_adults` | booking | ≥ 1 | ≤ số chỗ còn, ≤ giới hạn mỗi đơn |
| `num_children` | booking | ≥ 0 (PositiveSmallInt) | ≤ số chỗ còn |
| `contact_name` | booking | không rỗng, ≤200 | escape khi đưa vào email |
| `contact_email` | booking | EmailField | ✔ |
| `special_request` | booking | không | ≤ 1000 ký tự |
| `rating` | review | 1–5 | ✔ |
| `comment` | review | ≥5 ký tự | ≤ 2000 ký tự |
| `message` | chat | không rỗng | ≤ 1000 ký tự, throttle |
| `tour_id`, `ids`, `tour` | favorites, reviews, chat | **ép kiểu không bắt lỗi** nên lỗi 500 | trả 400 |

---

<!-- FRONTEND_SECTIONS -->

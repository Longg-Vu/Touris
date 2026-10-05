# BÁO CÁO MÔ TẢ YÊU CẦU DỰ ÁN & HIỆN TRẠNG TRIỂN KHAI (V1)

---

**Thông tin sinh viên:**
- **Họ và tên:** Thái Hữu Long Vũ
- **Tên đề tài:** Xây dựng hệ thống website quản lý và đặt tour du lịch cho công ty du lịch sử dụng ReactJS, Django REST Framework và PostgreSQL
- **Mã định danh báo cáo:** `Vu_ThaiHuuLong_MotaYeuCau_V1`
- **Thời gian lập báo cáo:** Tháng 09/2026

---

## 1. LIỆT KÊ NHỮNG PHẦN ĐÃ CÀI ĐẶT & TÌNH TRẠNG MÔI TRƯỜNG TRIỂN KHAI

### 1.1. Những phần đã được cài đặt và tình trạng môi trường

#### a. Cơ sở dữ liệu (Database)
- **Hệ quản trị CSDL:** PostgreSQL 16 (Alpine).
- **Môi trường triển khai:** Chạy containerized độc lập qua **Docker & Docker Compose** (`tourism_postgres`).
- **Cấu hình mạng & Cổng kết nối:** Ánh xạ cổng `5434:5432` (cổng host 5434 kết nối vào cổng container 5432) nhằm tránh xung đột với các phiên bản PostgreSQL có sẵn trên hệ điều hành máy tính.
- **Tình trạng:** 
  - Hoạt động ổn định (Healthcheck định kỳ).
  - Đã thực hiện migrate lược đồ cơ sở dữ liệu các bảng lõi ban đầu: `accounts_user`, `destinations`, `categories`, `tours`.
  - Đã xây dựng script tự động nạp dữ liệu mẫu ban đầu (`python manage.py seed_data`) bao gồm: 1 tài khoản Superuser (`admin`), 13 điểm đến du lịch (Hà Nội, Sapa, Đà Nẵng, Phú Quốc, Ninh Bình, Vũng Tàu...), 11 danh mục hoạt động/tour, và 24 tour du lịch thực tế chuẩn định dạng Klook.

#### b. Back-end (Phía máy chủ API)
- **Công nghệ & Framework:** Python 3.11+, Django 4.2 LTS, Django REST Framework (DRF).
- **Thư viện bổ trợ đã tích hợp:**
  - `django-cors-headers`: Đã kích hoạt middleware và cấu hình whitelist kết nối an toàn với máy chủ phát triển React Vite (`http://localhost:5173`).
  - `django-filter`: Cung cấp khả năng lọc dữ liệu URL parameters linh hoạt.
  - `djangorestframework-simplejwt`: Đã khai báo thư viện xử lý xác thực qua JSON Web Token (JWT).
  - `psycopg2-binary`: Driver giao tiếp trực tiếp Django với PostgreSQL.
  - `python-dotenv`: Quản lý biến môi trường bảo mật (`.env`).
- **Các App và API đã hoàn thiện:**
  - **App `tours`:**
    - Models: `Destination` (Điểm đến), `Category` (Danh mục), `Tour` (Thông tin chi tiết tour, giá vé, khuyến mãi, đánh giá, lượt đặt, tags, quan hệ khóa ngoại). Tích hợp Django Signal tự động cập nhật số lượng tour `tour_count` cho điểm đến khi thêm/sửa/xóa tour.
    - Serializers: `DestinationSerializer`, `CategorySerializer`, `TourListSerializer`.
    - ViewSets & API Endpoints: Đã hỗ trợ lấy danh sách, tìm kiếm từ khóa, lọc theo điểm đến (`destination__slug`), theo danh mục (`category__slug`), tour nổi bật (`is_featured`), tour hot (`is_hot`), sắp xếp đa dạng theo giá, đánh giá và lượt đặt:
      - `GET /api/tours/destinations/`
      - `GET /api/tours/categories/`
      - `GET /api/tours/tours/`
  - **Hệ thống Quản trị sẵn có (Django Admin):** Đã đăng ký hiển thị và quản lý trực tiếp dữ liệu tại `/admin/`.

#### c. Front-end (Giao diện người dùng)
- **Công nghệ & Framework:** ReactJS 19, Vite bundler, React Router DOM v7, Axios, Pure CSS (Modern UI/UX).
- **Cấu hình kết nối:** Đã tạo module trung tâm `src/api/client.js` và `src/api/services.js` dùng Axios kết nối trực tiếp đến Backend URL (`http://localhost:8000/api/`).
- **Các thành phần & Giao diện đã hoàn thành:**
  - **Layout chung:** `Header` (menu điều hướng, logo, thanh tìm kiếm nhanh, nút đăng nhập/đăng ký), `Footer` (thông tin liên hệ, chính sách, bản quyền).
  - **Trang chủ (`HomePage.jsx`):** 100% dữ liệu đã được kết nối động từ Database qua Backend API (không dùng dữ liệu tĩnh hardcode). Bao gồm: Banner tìm kiếm, Danh mục khám phá, Điểm đến thịnh hành, Hoạt động/Tour nổi bật, Ưu đãi đặc biệt.
  - **Trang Danh sách Tour (`TourListPage.jsx`):** Xây dựng theo phong cách trải nghiệm Klook hiện đại:
    - Thanh Filter Bar tương tác: lọc theo Thành phố động từ CSDL, chọn ngày nhanh, thanh Category Tags trượt ngang, thanh Active Filter Chips cho phép xóa từng điều kiện hoặc xóa tất cả.
    - Bộ chọn sắp xếp: Phổ biến ("Nên đặt"), Giá thấp nhất, Giá cao nhất, Đặt nhiều nhất, Đánh giá cao nhất.
    - Lưới thẻ Tour (Adaptive Cards) responsive: ảnh tỷ lệ 16:10, nút yêu thích (Favorites) lưu trực tiếp vào LocalStorage, nhãn dịch vụ, sao đánh giá, giá hiển thị định dạng VNĐ.
    - Trạng thái tải dữ liệu Shimmer Skeleton và Trạng thái trống (Empty State) thân thiện khi không tìm thấy kết quả.

---

### 1.2. Những phần còn chưa cài đặt được / Chưa hoàn thiện

- **Back-end:**
  - **App `accounts`:** Mới chỉ định nghĩa Custom Model `User` (kế thừa `AbstractUser`), chưa viết Serializers, Views cho luồng Đăng ký, Đăng nhập cấp phát JWT Token (Access/Refresh Token) và API xem/sửa hồ sơ cá nhân.
  - **App `bookings`:** Mới chỉ tạo thư mục module, chưa triển khai Model lưu thông tin đơn đặt tour (`Booking`, `BookingItem`, `Payment`), chưa viết logic kiểm tra số chỗ trống và API xử lý thanh toán/đặt chỗ.
  - **App `reviews`:** Chưa triển khai Model đánh giá và API cho phép khách hàng nhận xét/chấm điểm sao sau chuyến đi.
  - **Phân quyền chức năng (Permissions):** Chưa áp dụng phân quyền theo Role (Customer, Staff, Admin) trên các Endpoint nghiệp vụ.
- **Front-end:**
  - **Trang Chi tiết Tour (`TourDetailPage.jsx`):** Hiện mới là trang khung (placeholder), chưa nạp chi tiết tour, hình ảnh gallery, lịch trình theo ngày (itinerary) và form chọn ngày đi/số vé.
  - **Trang Xác thực (`LoginPage.jsx`, `RegisterPage.jsx`):** Đang là giao diện placeholder, chưa có form nhập liệu và chưa xử lý lưu trữ JWT vào `AuthContext`.
  - **Trang Khách hàng (`ProfilePage.jsx`, `MyBookingsPage.jsx`):** Chưa có giao diện quản lý lịch sử đơn hàng và cập nhật thông tin cá nhân.
  - **Trang Quản trị (`DashboardPage.jsx`):** Chưa xây dựng bảng biểu thống kê doanh thu (Chart.js/Recharts) và các màn hình quản lý nghiệp vụ cho Admin/Staff.
- **Realtime (Thời gian thực):**
  - Chưa cài đặt Django Channels / WebSockets hoặc Pusher để đẩy thông báo thời gian thực khi có khách đặt tour mới cho quản trị viên, hoặc thông báo cập nhật trạng thái đơn cho khách hàng.
- **Dịch vụ thứ ba & Hạ tầng bổ trợ:**
  - Chưa tích hợp dịch vụ lưu trữ media đám mây (Cloudinary / AWS S3) để upload ảnh tour thật (hiện đang dùng link ảnh trực tiếp).
  - Chưa tích hợp dịch vụ gửi Email thông báo tự động (SMTP / SendGrid) xác nhận khi đặt tour thành công.
  - Cổng thanh toán trực tuyến: Hiện tại theo phạm vi đề tài đang sử dụng cơ chế thanh toán giả lập / chuyển khoản ngân hàng, chưa tích hợp cổng trực tiếp VNPay/MoMo.

---

## 2. MÔ TẢ CHỨC NĂNG CỦA HỆ THỐNG

### 2.1. Phân loại người dùng (Actors / User Roles)

Hệ thống phân chia thành 4 nhóm người dùng chính:
1. **Khách vãng lai (Guest / Chưa đăng nhập):** Người dùng truy cập website qua internet, tìm hiểu thông tin sản phẩm du lịch nhưng chưa có tài khoản hoặc chưa đăng nhập.
2. **Khách hàng (Customer / Đã đăng nhập):** Người dùng đã đăng ký tài khoản và đăng nhập vào hệ thống để đặt tour và quản lý lịch trình cá nhân.
3. **Nhân viên điều hành (Staff / Employee):** Nhân viên thuộc công ty du lịch chịu trách nhiệm quản lý thông tin tour, lịch khởi hành và xử lý đơn đặt tour của khách.
4. **Quản trị viên hệ thống (Administrator / Admin):** Người quản lý cấp cao nhất, nắm quyền kiểm soát toàn bộ dữ liệu, phân quyền tài khoản, quản lý danh mục và xem thống kê kinh doanh.

---

### 2.2. Yêu cầu chức năng theo từng nhóm người dùng

#### A. Dành cho Khách vãng lai (Guest)
- **Xem và duyệt tour:** Xem trang chủ với danh sách điểm đến thịnh hành, tour nổi bật, các danh mục tour.
- **Tìm kiếm tour du lịch:** Tìm kiếm theo từ khóa (tên tour, địa danh, hoạt động).
- **Lọc và sắp xếp tour:**
  - Lọc đa tiêu chí: Lọc theo thành phố/điểm đến, theo danh mục tour (cáp treo, tour tham quan, vui chơi...), theo khoảng thời gian khởi hành (hôm nay, ngày mai, cuối tuần...).
  - Sắp xếp kết quả theo giá tăng dần/giảm dần, theo độ phổ biến, lượt đánh giá hoặc điểm rating.
- **Xem chi tiết tour:** Xem đầy đủ thông tin mô tả, hình ảnh gallery, lịch trình chi tiết từng ngày, bảng giá vé (người lớn/trẻ em), các chính sách bao gồm/không bao gồm, điều kiện hủy tour và đánh giá từ khách hàng trước.
- **Lưu tour yêu thích:** Đánh dấu lưu trữ các tour yêu thích vào danh sách tạm thời trên trình duyệt (LocalStorage).
- **Đăng ký tài khoản:** Điền thông tin cá nhân (họ tên, email, số điện thoại, mật khẩu) để tạo tài khoản khách hàng mới.
- **Đăng nhập hệ thống:** Đăng nhập bằng email/tên tài khoản và mật khẩu.

#### B. Dành cho Khách hàng (Customer - Đã đăng nhập)
*Bao gồm toàn bộ quyền của Khách vãng lai, bổ sung thêm:*
- **Đặt tour trực tuyến (Booking):**
  - Chọn ngày khởi hành mong muốn từ lịch tour còn chỗ trống.
  - Chọn số lượng khách (người lớn, trẻ em, em bé) với đơn giá tự động tính toán tổng tiền.
  - Nhập thông tin người liên hệ và danh sách hành khách tham gia tour.
  - Nhập ghi chú hoặc yêu cầu đặc biệt (ăn chay, hỗ trợ di chuyển...).
- **Thanh toán & Chọn phương thức thanh toán:**
  - Lựa chọn phương thức thanh toán: Chuyển khoản ngân hàng (hiển thị mã QR / thông tin số tài khoản), thanh toán tại văn phòng hoặc thanh toán giả lập trực tuyến.
  - Xem tóm tắt chi phí, mã đơn hàng và hướng dẫn hoàn tất.
- **Quản lý đơn đặt tour cá nhân (My Bookings):**
  - Xem danh sách lịch sử các đơn đặt tour với các trạng thái rõ ràng: *Chờ xác nhận, Đã thanh toán, Đang diễn ra, Đã hoàn thành, Đã hủy*.
  - Xem chi tiết từng đơn hàng (mã đặt chỗ, thời gian khởi hành, địa điểm đón, tổng chi phí).
  - Yêu cầu hủy đơn đặt tour theo quy định/chính sách hủy của tour.
- **Đánh giá và nhận xét (Reviews):**
  - Chấm điểm sao (1 - 5 sao) và viết nhận xét trải nghiệm sau khi chuyến đi hoàn thành.
- **Quản lý hồ sơ cá nhân (Profile Management):**
  - Xem và cập nhật thông tin cá nhân (họ tên, số điện thoại, ảnh đại diện, địa chỉ).
  - Đổi mật khẩu tài khoản.
- **Đăng xuất tài khoản:** Xóa phiên làm việc an toàn trên trình duyệt.

#### C. Dành cho Nhân viên điều hành (Staff)
- **Quản lý Tour:**
  - Thêm mới tour: Nhập thông tin tổng quan, danh mục, điểm đến, giá vé, hình ảnh, lịch trình chi tiết từng ngày.
  - Cập nhật, chỉnh sửa thông tin tour, lịch khởi hành, số lượng chỗ mở bán tối đa.
  - Bật/tắt trạng thái hiển thị (`is_active`), gắn cờ Tour nổi bật (`is_featured`), Tour Hot (`is_hot`).
- **Xử lý đơn đặt tour (Booking Management):**
  - Tiếp nhận danh sách đơn đặt tour mới của khách hàng.
  - Cập nhật trạng thái đơn đặt tour: Xác nhận đơn, xác nhận đã nhận thanh toán, hoàn tất tour hoặc chấp thuận yêu cầu hủy tour.
  - Tra cứu thông tin liên hệ của khách hàng để tư vấn, hỗ trợ.
- **Quản lý Đánh giá của khách:**
  - Xem danh sách đánh giá từ khách hàng, duyệt hoặc ẩn các đánh giá vi phạm quy chuẩn nội dung.

#### D. Dành cho Quản trị viên (Administrator)
*Có toàn quyền cao nhất trên toàn hệ thống:*
- **Quản lý người dùng & Phân quyền:**
  - Quản lý danh sách tài khoản khách hàng và nhân viên.
  - Tạo tài khoản nhân viên, khóa/mở khóa tài khoản, phân quyền truy cập chức năng.
- **Quản lý Danh mục & Điểm đến:**
  - Thêm, sửa, xóa các Danh mục hoạt động/tour (`Category`).
  - Thêm, sửa, xóa các Điểm đến du lịch (`Destination`), thiết lập thứ tự hiển thị ưu tiên trên trang chủ.
- **Báo cáo & Thống kê kinh doanh (Admin Dashboard):**
  - Thống kê tổng số lượng tour đang mở, tổng số đơn đặt, tổng số khách hàng.
  - Biểu đồ thống kê doanh thu theo thời gian (theo tuần, tháng, quý, năm).
  - Thống kê tỷ lệ các trạng thái đơn đặt tour (Hoàn thành, Đã hủy, Chờ xử lý).
  - Báo cáo top các tour du lịch có doanh thu cao nhất và được đặt nhiều nhất.

---

### 2.3. Các chức năng chung của hệ thống

1. **Xác thực & Kiểm soát truy cập (Authentication & Authorization):**
   - Xác thực qua cơ chế JSON Web Token (JWT) với Access Token (hạn ngắn) và Refresh Token (hạn dài).
   - Mã hóa bảo mật mật khẩu bằng thuật toán PBKDF2 / Bcrypt.
   - Phân quyền theo tầng (Role-based access control) bảo vệ các Endpoint API nhạy cảm.
2. **Tìm kiếm & Lọc dữ liệu thông minh:**
   - Hệ thống lọc đa điều kiện kết hợp cùng lúc (Điểm đến + Thể loại + Ngày + Sắp xếp) chạy mượt mà không cần reload trang.
3. **Quản lý toàn vẹn dữ liệu (Data Integrity):**
   - Ràng buộc khóa ngoại, quan hệ 1-N (Category - Tour, Destination - Tour, User - Booking).
   - Tự động cập nhật số lượng hoạt động (`tour_count`) tại các điểm đến qua Signal.
4. **Xử lý giao diện & Trải nghiệm người dùng (UI/UX):**
   - Thiết kế giao diện hiện đại, trực quan, tương thích đa thiết bị (Responsive trên Mobile, Tablet, Desktop).
   - Tích hợp hiệu ứng Shimmer Skeleton trong lúc chờ dữ liệu API, thông báo lỗi/thành công (Toast Notification) và hiển thị Empty State khi không có kết quả tìm kiếm.

---

## 3. KẾ HOẠCH TRIỂN KHAI TRONG TUẦN TỚI

### 3.1. Bối cảnh đối chiếu tiến độ tổng thể của đề tài
Kế hoạch tuần tới được xây dựng dựa trên sự **kế thừa trực tiếp và bám sát sườn lộ trình tổng thể** đã đề ra trong bản Đăng ký đề tài và tiến độ thực tế của dự án:

```
[Giai đoạn 1: ĐÃ XONG]        [Giai đoạn 2: TRỌNG TÂM TUẦN TỚI]       [Giai đoạn 3: TUẦN TIẾP THEO]
- Khởi tạo kiến trúc dự án    - Hoàn thiện Module Auth (JWT)          - Nghiệp vụ Đặt tour (Booking)
- Docker DB + Seed data       - Form Đăng ký / Đăng nhập              - Thanh toán & Tạo hóa đơn
- Trang chủ (HomePage)        - Trang Chi tiết tour (TourDetail)      - Lịch sử đơn của khách
- Lọc tour Klook (TourList)   - Thiết kế CSDL Bookings                - Đánh giá & Bình luận (Review)
- Lịch đôi DatePickerModal    - Test liên thông: Duyệt → Chi tiết     - Dashboard quản trị & Báo cáo
```

- **Tuần vừa qua (Đã hoàn thành):** Đã giải quyết xong bài toán hiển thị và tìm kiếm dữ liệu: hoàn tất CSDL PostgreSQL qua Docker, nạp 24 tour mẫu, xây dựng API danh mục / điểm đến / tour, hoàn thiện Trang chủ và Trang danh sách tour chuẩn Klook với bộ lọc tương tác cao (lịch đôi Dual-Month DatePicker, lọc thành phố, category tags, filter chips, sắp xếp).
- **Tuần tới (Mục tiêu then chốt):** Chuyển từ giai đoạn **Duyệt & Tìm kiếm** sang giai đoạn **Tương tác & Xác thực người dùng** (bắt buộc phải có tài khoản và xem được chi tiết tour thì mới có thể tiến hành bước Đặt tour ở tuần tiếp theo).

---

### 3.2. Bảng kế hoạch chi tiết các đầu việc trong tuần tới

| STT | Hạng mục công việc | Chi tiết triển khai kỹ thuật | Thành phần / File liên quan | Mức độ ưu tiên |
| :---: | :--- | :--- | :--- | :---: |
| **1** | **Xây dựng API Xác thực người dùng (Auth API)** | - Thiết kế `UserRegisterSerializer`, `UserLoginSerializer`, `UserProfileSerializer`.<br>- Tích hợp thư viện `SimpleJWT` cấp phát cặp Access Token (hạn 1 ngày) & Refresh Token (hạn 7 ngày).<br>- Hoàn thiện các API: `POST /api/auth/register/`, `POST /api/auth/login/`, `POST /api/auth/refresh/`, `GET /api/auth/profile/`. | Backend:<br>`backend/accounts/serializers.py`<br>`backend/accounts/views.py`<br>`backend/accounts/urls.py` | ⭐⭐⭐ (Cao) |
| **2** | **Xây dựng giao diện Đăng ký & Đăng nhập** | - Xây dựng hoàn chỉnh giao diện form `LoginPage.jsx` và `RegisterPage.jsx` có validate định dạng email, mật khẩu, số điện thoại.<br>- Hoàn thiện `AuthContext.jsx` để lưu trữ token và user info vào LocalStorage, duy trì trạng thái đăng nhập khi F5 reload trang.<br>- Cấu hình Axios Interceptor tự động gắn header `Authorization: Bearer <token>` cho mọi request cần quyền xác thực. | Frontend:<br>`src/pages/auth/LoginPage.jsx`<br>`src/pages/auth/RegisterPage.jsx`<br>`src/context/AuthContext.jsx`<br>`src/api/client.js` | ⭐⭐⭐ (Cao) |
| **3** | **Xây dựng Trang Chi tiết Tour (`TourDetailPage`)** | - **Backend:** Viết API `GET /api/tours/tours/{id}/` trả về toàn bộ thông tin chi tiết tour, danh sách ảnh gallery, lịch trình từng ngày (itinerary), chính sách hoàn hủy.<br>- **Frontend:** Xây dựng giao diện chi tiết tour: Slider/Gallery ảnh lớn, tổng quan điểm nổi bật, khối lịch trình theo từng ngày (Day 1, Day 2...), bảng giá vé người lớn/trẻ em và widget Sticky chọn ngày khởi hành + số lượng vé đặt tour. | Fullstack:<br>`backend/tours/views.py`<br>`src/pages/public/TourDetailPage.jsx`<br>`src/pages/public/TourDetailPage.css` | ⭐⭐⭐ (Cao) |
| **4** | **Thiết kế CSDL cho Module Đặt Tour (`bookings`)** | - Thiết kế các Model: `Booking` (khách hàng, tour, ngày đi, số khách, tổng tiền, trạng thái đơn), `BookingPassenger` (thông tin từng hành khách).<br>- Chạy `makemigrations` và `migrate` trên PostgreSQL để chuẩn bị sẵn sàng cho luồng thanh toán và đặt chỗ ở tuần kế tiếp. | Backend & Database:<br>`backend/bookings/models.py`<br>`backend/bookings/admin.py` | ⭐⭐ (Trung bình) |
| **5** | **Kiểm thử liên thông luồng nghiệp vụ (Integration Test)** | - Kiểm thử chu trình: Đăng ký tài khoản mới → Tự động đăng nhập → Duyệt danh sách tour tại `TourListPage` → Nhấp xem chi tiết tại `TourDetailPage` → Kiểm tra dữ liệu và trạng thái phiên làm việc.<br>- Kiểm tra tương thích giao diện trên cả màn hình Desktop và Mobile. | Toàn hệ thống | ⭐⭐ (Trung bình) |

---

### 3.3. Dự kiến kết quả đạt được sau tuần tới (Deliverables)
1. Khách hàng có thể đăng ký tài khoản mới và đăng nhập nhận JWT Token hợp lệ.
2. Header tự động hiển thị tên người dùng và avatar sau khi đăng nhập thành công (thay thế nút Đăng nhập / Đăng ký).
3. Người dùng từ trang danh sách có thể click vào bất kỳ tour nào để xem chi tiết đầy đủ lịch trình và giá vé tại `TourDetailPage`.
4. Cơ sở dữ liệu đã có sẵn bảng `Booking` để tuần sau ráp trực tiếp tính năng Đặt tour và Quản lý đơn hàng.




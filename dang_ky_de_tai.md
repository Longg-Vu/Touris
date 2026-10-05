# ĐĂNG KÝ ĐỀ TÀI TỐT NGHIỆP

---

## 1. Tên đề tài

### Tiếng Việt
**Xây dựng hệ thống website quản lý và đặt tour du lịch cho công ty du lịch sử dụng ReactJS, Django REST Framework và PostgreSQL**

### Tiếng Anh
**Building a Tour Management and Booking Web System for Travel Companies using ReactJS, Django REST Framework and PostgreSQL**

---

## 2. Mô tả đề tài

Ngành du lịch Việt Nam đang phát triển mạnh mẽ, các công ty du lịch ngày càng cần một hệ thống quản lý trực tuyến hiện đại để thay thế quy trình thủ công truyền thống. Đề tài hướng đến việc xây dựng một hệ thống website toàn diện phục vụ hoạt động kinh doanh của công ty du lịch, bao gồm cả giao diện dành cho khách hàng và giao diện quản trị nội bộ.

### Về phía khách hàng:
Hệ thống cung cấp giao diện web cho phép khách hàng duyệt, tìm kiếm và lọc tour du lịch theo nhiều tiêu chí (địa điểm, giá tiền, số ngày, loại tour, ngày khởi hành). Khách hàng có thể xem chi tiết lịch trình từng ngày của tour, đặt tour trực tuyến, theo dõi trạng thái đơn đặt tour, thực hiện thanh toán và đánh giá tour sau khi sử dụng dịch vụ. Hệ thống hỗ trợ đăng ký tài khoản, đăng nhập và quản lý thông tin cá nhân.

### Về phía quản trị (nhân viên và quản trị viên):
Nhân viên có thể quản lý thông tin tour (thêm, sửa, xóa), quản lý lịch khởi hành, xử lý đơn đặt tour và hỗ trợ khách hàng. Quản trị viên có quyền quản lý tài khoản người dùng, phân quyền, quản lý danh mục tour, địa điểm du lịch và xem dashboard thống kê doanh thu (tổng số tour, tổng đơn đặt, doanh thu theo tháng, tour được đặt nhiều nhất, tỷ lệ hoàn thành đơn).

### Về mặt công nghệ:
Hệ thống được xây dựng theo mô hình client-server, tách biệt frontend và backend. Frontend sử dụng ReactJS để xây dựng giao diện người dùng có tính tương tác cao. Backend sử dụng Django REST Framework (Python) để xây dựng các API RESTful xử lý nghiệp vụ. Cơ sở dữ liệu PostgreSQL được sử dụng để lưu trữ và quản lý dữ liệu. Xác thực người dùng sử dụng JWT (JSON Web Token) để đảm bảo bảo mật.

### Các chức năng chính:
- Đăng ký, đăng nhập, phân quyền người dùng (khách hàng, nhân viên, quản trị viên)
- Quản lý tour du lịch (CRUD tour, lịch trình, lịch khởi hành, hình ảnh)
- Quản lý danh mục tour và địa điểm du lịch
- Tìm kiếm và lọc tour theo nhiều tiêu chí
- Đặt tour trực tuyến và theo dõi trạng thái đơn
- Quản lý thanh toán
- Đánh giá và nhận xét tour
- Dashboard thống kê doanh thu cho quản trị viên
- Quản lý khách hàng và nhân viên

---

## 3. Công nghệ sử dụng

| Thành phần | Công nghệ |
|---|---|
| Frontend | ReactJS, React Router DOM, Axios, TailwindCSS/Bootstrap |
| Backend | Python, Django, Django REST Framework, Simple JWT |
| Database | PostgreSQL |
| Biểu đồ thống kê | Chart.js hoặc Recharts |
| Công cụ hỗ trợ | Git, GitHub, Postman, VS Code, pgAdmin |

---

## 4. Phạm vi và giới hạn

### Phạm vi:
- Hệ thống web dành cho công ty du lịch với 3 vai trò: khách hàng, nhân viên, quản trị viên
- Bao gồm đầy đủ quy trình: duyệt tour → đặt tour → thanh toán → đánh giá
- Dashboard thống kê doanh thu và hoạt động kinh doanh

### Giới hạn:
- Thanh toán ở mức giả lập (chưa tích hợp cổng thanh toán thật)
- Chưa hỗ trợ đa ngôn ngữ
- Chưa tích hợp bản đồ hoặc dịch vụ bên thứ ba
- Chạy trên nền web, chưa có ứng dụng di động

---

## 5. Hướng phát triển tương lai

- Tích hợp cổng thanh toán online thật (VNPay, MoMo, ZaloPay)
- Tích hợp Google Maps hiển thị địa điểm tour
- Tích hợp AI gợi ý tour dựa trên sở thích và ngân sách khách hàng
- Tích hợp chatbot tư vấn tour tự động
- Gửi email/SMS xác nhận đặt tour
- Xuất hóa đơn PDF
- Hỗ trợ đa ngôn ngữ
- Xây dựng ứng dụng di động bằng React Native

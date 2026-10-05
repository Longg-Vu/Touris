import { useState, useEffect, useRef } from 'react';
import './DatePickerModal.css';

// Tên các thứ trong tuần
const WEEKDAYS = ['CN', 'T2', 'T3', 'T4', 'T5', 'T6', 'T7'];

// Hàm format Date -> 'YYYY-MM-DD'
export function formatDateKey(date) {
  if (!date) return '';
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

// Hàm format hiển thị ngày trên nút hoặc label: '20 Th09'
export function formatDisplayDate(date) {
  if (!date) return '';
  const d = date.getDate();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  return `${d} Th${m}`;
}

// Format đầy đủ: 'CN, 20 Th09 2026'
export function formatFullDate(date) {
  if (!date) return '';
  const dayOfWeek = WEEKDAYS[date.getDay()];
  const d = date.getDate();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const y = date.getFullYear();
  return `${dayOfWeek}, ${d} Th${m} ${y}`;
}

export default function DatePickerModal({
  selectedRange, // { startDate: Date | null, endDate: Date | null }
  onApply,       // (range: { startDate, endDate }) => void
  onClose,       // () => void
  totalCount,    // số lượng kết quả hiện tại
}) {
  const modalRef = useRef(null);
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  // Khởi tạo tháng bắt đầu hiển thị (mặc định từ tháng của ngày đã chọn hoặc tháng hiện tại)
  const initialDate = selectedRange?.startDate || today;
  const [viewYear, setViewYear] = useState(initialDate.getFullYear());
  const [viewMonth, setViewMonth] = useState(initialDate.getMonth()); // 0-indexed (0 = Th1, 8 = Th9...)

  // State tạm trong popup trước khi người dùng bấm "Hiện kết quả"
  const [tempStart, setTempStart] = useState(selectedRange?.startDate ? new Date(selectedRange.startDate) : null);
  const [tempEnd, setTempEnd] = useState(selectedRange?.endDate ? new Date(selectedRange.endDate) : null);
  const [hoverDate, setHoverDate] = useState(null);
  const [errorMessage, setErrorMessage] = useState('');

  // Tự động tắt thông báo lỗi sau 3.5s
  useEffect(() => {
    if (errorMessage) {
      const timer = setTimeout(() => setErrorMessage(''), 3500);
      return () => clearTimeout(timer);
    }
  }, [errorMessage]);

  // Điều hướng tháng: Tháng thứ 2 sẽ là viewMonth + 1
  const handlePrevMonth = () => {
    // Không cho lùi về tháng trong quá khứ so với tháng hiện tại
    if (viewYear === today.getFullYear() && viewMonth <= today.getMonth()) {
      return;
    }
    if (viewMonth === 0) {
      setViewMonth(11);
      setViewYear((prev) => prev - 1);
    } else {
      setViewMonth((prev) => prev - 1);
    }
  };

  const handleNextMonth = () => {
    if (viewMonth === 11) {
      setViewMonth(0);
      setViewYear((prev) => prev + 1);
    } else {
      setViewMonth((prev) => prev + 1);
    }
  };

  // Tính toán tháng thứ 2 (bên phải)
  const nextMonthYear = viewMonth === 11 ? viewYear + 1 : viewYear;
  const nextMonth = viewMonth === 11 ? 0 : viewMonth + 1;

  // Kiểm tra có thể bấm nút Lùi tháng không
  const canGoPrev = viewYear > today.getFullYear() || (viewYear === today.getFullYear() && viewMonth > today.getMonth());

  // Xử lý khi click vào 1 ngày
  const handleDayClick = (date) => {
    setErrorMessage('');
    const clickedTime = date.getTime();

    // 1. Chưa chọn gì, hoặc đã chọn đủ cả start và end -> Bắt đầu chọn ngày bắt đầu mới
    if (!tempStart || (tempStart && tempEnd)) {
      setTempStart(date);
      setTempEnd(null);
      return;
    }

    // 2. Đã có tempStart và chưa có tempEnd:
    const startTime = tempStart.getTime();

    // Click cùng ngày -> Giữ nguyên là chọn 1 ngày duy nhất
    if (clickedTime === startTime) {
      setTempEnd(null);
      return;
    }

    // Click ngày nhỏ hơn start -> Đổi start thành ngày mới
    if (clickedTime < startTime) {
      setTempStart(date);
      setTempEnd(null);
      return;
    }

    // Click ngày lớn hơn start -> Tính khoảng cách ngày
    const diffDays = Math.round((clickedTime - startTime) / (1000 * 60 * 60 * 24)) + 1; // Tính cả ngày đầu và ngày cuối

    if (diffDays > 28) {
      setErrorMessage('Bạn chỉ có thể chọn tối đa 28 ngày');
      return;
    }

    // Hợp lệ (khoảng ngày <= 28 ngày)
    setTempEnd(date);
  };

  // Nút "Xóa"
  const handleClear = () => {
    setTempStart(null);
    setTempEnd(null);
    setErrorMessage('');
    onApply({ startDate: null, endDate: null });
  };

  // Nút "Áp dụng / Hiện kết quả"
  const handleApply = () => {
    onApply({
      startDate: tempStart,
      endDate: tempEnd,
    });
  };

  // Sinh ma trận ngày cho 1 tháng
  const renderMonth = (year, month) => {
    const firstDayIndex = new Date(year, month, 1).getDay(); // 0 = CN, 1 = T2...
    const daysInMonth = new Date(year, month + 1, 0).getDate();

    const days = [];
    // Ô trống đầu tháng
    for (let i = 0; i < firstDayIndex; i++) {
      days.push(<div key={`empty-${i}`} className="calendar-day empty"></div>);
    }

    // Các ngày trong tháng
    for (let day = 1; day <= daysInMonth; day++) {
      const currentDate = new Date(year, month, day);
      currentDate.setHours(0, 0, 0, 0);
      const currentTime = currentDate.getTime();
      const isPast = currentTime < today.getTime();

      const isStart = tempStart && currentTime === tempStart.getTime();
      const isEnd = tempEnd && currentTime === tempEnd.getTime();

      // Kiểm tra ngày có nằm giữa khoảng đang chọn không
      let isInRange = false;
      if (tempStart && tempEnd) {
        isInRange = currentTime > tempStart.getTime() && currentTime < tempEnd.getTime();
      } else if (tempStart && !tempEnd && hoverDate) {
        const hoverTime = hoverDate.getTime();
        if (hoverTime > tempStart.getTime()) {
          const diffDays = Math.round((hoverTime - tempStart.getTime()) / (1000 * 60 * 60 * 24)) + 1;
          if (diffDays <= 28) {
            isInRange = currentTime > tempStart.getTime() && currentTime <= hoverTime;
          }
        }
      }

      let dayClass = 'calendar-day';
      if (isPast) dayClass += ' is-disabled';
      if (isStart) dayClass += ' is-start is-selected';
      if (isEnd) dayClass += ' is-end is-selected';
      if (isInRange) dayClass += ' is-in-range';
      if (isStart && !tempEnd) dayClass += ' is-single';

      days.push(
        <div
          key={day}
          className={dayClass}
          onClick={() => !isPast && handleDayClick(currentDate)}
          onMouseEnter={() => !isPast && tempStart && !tempEnd && setHoverDate(currentDate)}
          onMouseLeave={() => setHoverDate(null)}
        >
          <span className="day-number">{day}</span>
        </div>
      );
    }

    return (
      <div className="calendar-month">
        <div className="calendar-month-title">
          Th{String(month + 1).padStart(2, '0')} {year}
        </div>
        <div className="calendar-weekdays">
          {WEEKDAYS.map((w, idx) => (
            <div key={idx} className="calendar-weekday">
              {w}
            </div>
          ))}
        </div>
        <div className="calendar-grid">{days}</div>
      </div>
    );
  };

  return (
    <div className="date-picker-dropdown" ref={modalRef} onClick={(e) => e.stopPropagation()}>
      {/* Thông báo lỗi nếu chọn vượt quá 28 ngày */}
      {errorMessage && (
        <div className="date-picker-alert">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2">
            <circle cx="12" cy="12" r="10"></circle>
            <line x1="12" y1="8" x2="12" y2="12"></line>
            <line x1="12" y1="16" x2="12.01" y2="16"></line>
          </svg>
          <span>{errorMessage}</span>
        </div>
      )}

      {/* Header điều hướng mũi tên 2 bên */}
      <div className="calendar-navigation">
        <button
          type="button"
          className="nav-btn prev-btn"
          disabled={!canGoPrev}
          onClick={handlePrevMonth}
          aria-label="Tháng trước"
        >
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
            <polyline points="15 18 9 12 15 6"></polyline>
          </svg>
        </button>

        <button
          type="button"
          className="nav-btn next-btn"
          onClick={handleNextMonth}
          aria-label="Tháng sau"
        >
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
            <polyline points="9 18 15 12 9 6"></polyline>
          </svg>
        </button>
      </div>

      {/* Lưới lịch 2 tháng liền kề */}
      <div className="calendar-dual-wrapper">
        {renderMonth(viewYear, viewMonth)}
        {renderMonth(nextMonthYear, nextMonth)}
      </div>

      {/* Thanh chân trang: Nút Xóa và Nút Áp dụng */}
      <div className="date-picker-footer">
        <button type="button" className="btn-clear-date" onClick={handleClear}>
          Xóa
        </button>
        <button type="button" className="btn-apply-date" onClick={handleApply}>
          {totalCount !== undefined ? `Hiện ${totalCount} kết quả` : 'Áp dụng'}
        </button>
      </div>
    </div>
  );
}

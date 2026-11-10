import { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { adminTourAPI } from '../../api/services';
import './NotificationBell.css';

/* ─── Phát âm thanh chuông tinh tế qua Web Audio API ────────── */
export const playDingSound = () => {
  try {
    const AudioContext = window.AudioContext || window.webkitAudioContext;
    if (!AudioContext) return;
    const ctx = new AudioContext();

    // Nốt 1 (A5: 880Hz)
    const osc1 = ctx.createOscillator();
    const gain1 = ctx.createGain();
    osc1.type = 'sine';
    osc1.frequency.setValueAtTime(880, ctx.currentTime);
    gain1.gain.setValueAtTime(0.25, ctx.currentTime);
    gain1.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.45);
    osc1.connect(gain1);
    gain1.connect(ctx.destination);
    osc1.start(ctx.currentTime);
    osc1.stop(ctx.currentTime + 0.45);

    // Nốt 2 (C6: 1046.5Hz)
    const osc2 = ctx.createOscillator();
    const gain2 = ctx.createGain();
    osc2.type = 'sine';
    osc2.frequency.setValueAtTime(1046.5, ctx.currentTime + 0.12);
    gain2.gain.setValueAtTime(0.3, ctx.currentTime + 0.12);
    gain2.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.75);
    osc2.connect(gain2);
    gain2.connect(ctx.destination);
    osc2.start(ctx.currentTime + 0.12);
    osc2.stop(ctx.currentTime + 0.75);
  } catch (e) {
    console.warn('AudioContext failed:', e);
  }
};

/* ─── Format thời gian hiển thị ───────────────────────────────── */
function formatTimeAgo(dateStr) {
  if (!dateStr) return '';
  const date = new Date(dateStr);
  const now = new Date();
  const diffSec = Math.floor((now - date) / 1000);

  if (diffSec < 60) return 'Vừa xong';
  if (diffSec < 3600) return `${Math.floor(diffSec / 60)} phút trước`;
  if (diffSec < 86400) return `${Math.floor(diffSec / 3600)} giờ trước`;
  return date.toLocaleDateString('vi-VN', {
    hour: '2-digit',
    minute: '2-digit',
    day: '2-digit',
    month: '2-digit',
  });
}

function NotificationBell() {
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount]     = useState(0);
  const [isOpen, setIsOpen]               = useState(false);
  const [isRinging, setIsRinging]         = useState(false);
  const bellRef                           = useRef(null);
  const prevUnreadRef                     = useRef(null);
  const navigate                          = useNavigate();

  /* ── Fetch thông báo từ API ──────────────────────────────────── */
  const fetchNotifications = useCallback(async (isPolling = false) => {
    try {
      const res = await adminTourAPI.getNotifications();
      const count = res.data.unread_count || 0;
      const list = res.data.results || [];

      // Nếu số thông báo chưa đọc tăng trong lúc polling -> phát âm thanh + rung chuông
      if (isPolling && prevUnreadRef.current !== null && count > prevUnreadRef.current) {
        playDingSound();
        setIsRinging(true);
        setTimeout(() => setIsRinging(false), 1500);
      }

      prevUnreadRef.current = count;
      setUnreadCount(count);
      setNotifications(list);
    } catch {
      // bỏ qua lỗi im lặng để không gián đoạn người dùng
    }
  }, []);

  /* ── Polling mỗi 15 giây ─────────────────────────────────────── */
  useEffect(() => {
    fetchNotifications(false);
    const interval = setInterval(() => {
      fetchNotifications(true);
    }, 15000);
    return () => clearInterval(interval);
  }, [fetchNotifications]);

  /* ── Đóng dropdown khi click bên ngoài ───────────────────────── */
  useEffect(() => {
    const handleOutsideClick = (e) => {
      if (bellRef.current && !bellRef.current.contains(e.target)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleOutsideClick);
    return () => document.removeEventListener('mousedown', handleOutsideClick);
  }, []);

  /* ── Đánh dấu 1 thông báo là đã đọc ─────────────────────────── */
  const handleItemClick = async (alert) => {
    if (!alert.is_read) {
      try {
        await adminTourAPI.markNotificationRead(alert.id);
        setNotifications((prev) =>
          prev.map((n) => (n.id === alert.id ? { ...n, is_read: true } : n))
        );
        setUnreadCount((prev) => Math.max(0, prev - 1));
      } catch {
        // im lặng
      }
    }
    setIsOpen(false);
    navigate(`/admin/tours?manifest=${alert.tour}&search=${encodeURIComponent(alert.tour_name)}&time_filter=all`);
  };

  /* ── Đánh dấu tất cả là đã đọc ──────────────────────────────── */
  const handleMarkAllRead = async () => {
    try {
      await adminTourAPI.markAllNotificationsRead();
      setNotifications((prev) => prev.map((n) => ({ ...n, is_read: true })));
      setUnreadCount(0);
    } catch {
      // im lặng
    }
  };

  return (
    <div className="notif-bell-container" ref={bellRef}>
      {/* ── Nút Chuông ── */}
      <button
        type="button"
        className={`notif-bell-btn ${unreadCount > 0 ? 'has-unread' : ''} ${isRinging ? 'ringing' : ''}`}
        onClick={() => setIsOpen((prev) => !prev)}
        title="Thông báo cảnh báo từ HDV và phòng Sale"
        aria-label="Thông báo"
      >
        <span className="notif-bell-icon">🔔</span>
        {unreadCount > 0 && (
          <span className="notif-badge">
            {unreadCount > 99 ? '99+' : unreadCount}
          </span>
        )}
      </button>

      {/* ── Popover Dropdown ── */}
      {isOpen && (
        <div className="notif-popover">
          <div className="notif-popover-header">
            <div className="notif-popover-title">
              <span>🔔 Thông báo & Cảnh báo Sale</span>
              {unreadCount > 0 && (
                <span className="notif-header-badge">{unreadCount} mới</span>
              )}
            </div>
            {unreadCount > 0 && (
              <button
                type="button"
                className="notif-btn-mark-all"
                onClick={handleMarkAllRead}
              >
                ✓ Đã đọc tất cả
              </button>
            )}
          </div>

          <div className="notif-popover-list">
            {notifications.length === 0 ? (
              <div className="notif-empty">
                <span className="notif-empty-icon">🔕</span>
                <p>Hiện không có cảnh báo nào từ HDV</p>
                <small>Khi HDV bấm báo Sale cho đoàn thiếu khách, thông báo sẽ hiển thị tại đây.</small>
              </div>
            ) : (
              notifications.map((alert) => (
                <div
                  key={alert.id}
                  className={`notif-item ${!alert.is_read ? 'unread' : ''}`}
                  onClick={() => handleItemClick(alert)}
                >
                  <div className="notif-item-icon">
                    <span className="notif-alert-badge">🚨</span>
                  </div>
                  <div className="notif-item-content">
                    <div className="notif-item-top">
                      <span className="notif-item-tour">{alert.tour_name}</span>
                      <span className="notif-item-time">{formatTimeAgo(alert.created_at)}</span>
                    </div>
                    <div className="notif-item-status">
                      <span className="notif-status-shortage">
                        Thiếu <strong>{alert.shortage_count} khách</strong>
                      </span>
                      <span className="notif-status-progress">
                        ({alert.current_booked}/{alert.target_participants} khách)
                      </span>
                    </div>
                    <div className="notif-item-sender">
                      👨‍✈️ HDV: <strong>{alert.sender_name}</strong>
                    </div>
                  </div>
                  {!alert.is_read && <span className="notif-unread-dot" />}
                </div>
              ))
            )}
          </div>

          <div className="notif-popover-footer">
            <button
              type="button"
              className="notif-btn-view-tours"
              onClick={() => {
                setIsOpen(false);
                navigate('/admin/tours');
              }}
            >
              Xem danh sách đoàn tour →
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

export default NotificationBell;

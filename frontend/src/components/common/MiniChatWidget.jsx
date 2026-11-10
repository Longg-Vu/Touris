import { useState, useEffect, useRef, useCallback } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { chatAPI } from '../../api/services';
import { useAuth } from '../../context/AuthContext';
import './MiniChatWidget.css';

function getChatStorageKey(u) {
  if (u && u.id) {
    return `tourism_chat_session_u${u.id}`;
  }
  return 'tourism_chat_session_guest';
}

function getLocalSessionId(u) {
  const key = getChatStorageKey(u);
  let id = localStorage.getItem(key);
  if (!id) {
    const prefix = u && u.id ? `cs_u${u.id}_` : 'cs_guest_';
    id = prefix + Math.random().toString(36).substring(2, 11) + Date.now().toString(36);
    localStorage.setItem(key, id);
  }
  return id;
}

export default function MiniChatWidget({ currentTour = null }) {
  const { user } = useAuth();
  const currentUserId = user?.id || null;
  const location = useLocation();
  const navigate = useNavigate();

  const [sessionId, setSessionId]     = useState(() => getLocalSessionId(user));
  const [isOpen, setIsOpen]           = useState(false);
  const [messages, setMessages]       = useState([]);
  const [inputText, setInputText]     = useState('');
  const [loading, setLoading]         = useState(false);
  const [sending, setSending]         = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);
  const [chatStatus, setChatStatus]   = useState('active');

  const messagesEndRef = useRef(null);
  const pollingTimerRef = useRef(null);

  // Tự động nhận diện tour_id nếu đang ở trang /tours/:id
  const tourMatch = location.pathname.match(/\/tours\/(\d+)/);
  const activeTourId = currentTour?.id || (tourMatch ? parseInt(tourMatch[1], 10) : null);
  const [activeTourInfo, setActiveTourInfo] = useState(null);

  // Khi tài khoản đăng nhập thay đổi (hoặc đăng xuất):
  // Xóa tin nhắn của nick trước ngay lập tức, chuyển session key sang của người mới và nạp lại
  useEffect(() => {
    if (pollingTimerRef.current) {
      clearInterval(pollingTimerRef.current);
    }
    setMessages([]);
    setInputText('');
    setUnreadCount(0);
    setChatStatus('active');

    const newId = getLocalSessionId(user);
    setSessionId(newId);
  }, [currentUserId]);

  // Tự động cuộn xuống tin nhắn cuối
  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    if (isOpen) {
      scrollToBottom();
    }
  }, [messages, isOpen]);

  // Khởi tạo phiên chat khi component mount hoặc khi đổi tour / đổi sessionId
  const initSession = useCallback(async () => {
    if (!sessionId) return;
    try {
      setLoading(true);
      const res = await chatAPI.initSession({
        session_id: sessionId,
        tour_id: activeTourId,
      });
      const data = res.data;
      // Cập nhật session_id chuẩn từ backend (nếu backend trả về session cũ của user)
      if (data.session_id && data.session_id !== sessionId) {
        const storageKey = getChatStorageKey(user);
        localStorage.setItem(storageKey, data.session_id);
        setSessionId(data.session_id);
      }
      setChatStatus(data.status || 'active');
      setMessages(data.messages || []);
      setUnreadCount(data.unread_customer_count || 0);
      if (data.current_tour_info) {
        setActiveTourInfo(data.current_tour_info);
      }
    } catch (err) {
      console.error('Lỗi khởi tạo chat:', err);
    } finally {
      setLoading(false);
    }
  }, [sessionId, activeTourId, user]);

  useEffect(() => {
    initSession();
  }, [initSession]);

  // Polling lấy tin nhắn mới khi chatbox đang mở
  useEffect(() => {
    if (!isOpen) {
      if (pollingTimerRef.current) clearInterval(pollingTimerRef.current);
      return;
    }

    const poll = async () => {
      const lastMsgId = messages.length > 0 ? messages[messages.length - 1].id : 0;
      try {
        const res = await chatAPI.pollMessages({
          session_id: sessionId,
          after_id: lastMsgId,
        });
        const newMsgs = res.data.messages || [];
        if (newMsgs.length > 0) {
          setMessages(prev => {
            const existingIds = new Set(prev.map(m => m.id));
            const filtered = newMsgs.filter(m => !existingIds.has(m.id));
            return filtered.length > 0 ? [...prev, ...filtered] : prev;
          });
        }
        if (res.data.status) {
          setChatStatus(res.data.status);
        }
      } catch {
        // ignore polling error
      }
    };

    pollingTimerRef.current = setInterval(poll, 3500);
    return () => clearInterval(pollingTimerRef.current);
  }, [isOpen, messages, sessionId]);

  // Gửi tin nhắn
  const handleSendMessage = async (textToSend) => {
    const text = (textToSend || inputText).trim();
    if (!text || sending) return;

    setInputText('');
    setSending(true);

    // Optimistic UI: thêm tin nhắn của khách vào danh sách ngay lập tức
    const tempMsg = {
      id: 'temp_' + Date.now(),
      sender_type: 'customer',
      sender_name: user?.first_name || 'Bạn',
      message: text,
      message_type: 'text',
      created_at: new Date().toISOString(),
    };
    setMessages(prev => [...prev, tempMsg]);

    try {
      const res = await chatAPI.sendMessage({
        session_id: sessionId,
        message: text,
        tour_id: activeTourId,
        customer_name: user ? (user.first_name ? `${user.first_name} ${user.last_name || ''}`.trim() : user.username) : '',
        customer_phone: user?.phone || '',
      });
      if (res.data.messages) {
        setMessages(res.data.messages);
      }
      if (res.data.status) {
        setChatStatus(res.data.status);
      }
    } catch (err) {
      console.error('Lỗi gửi tin nhắn:', err);
    } finally {
      setSending(false);
    }
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  const toggleChat = () => {
    const nextState = !isOpen;
    setIsOpen(nextState);
    if (nextState) {
      setUnreadCount(0);
    }
  };

  // Nút bấm gợi ý nhanh
  const quickOptions = [
    { label: '🔥 Tour giảm giá hôm nay', query: 'Xem tour giảm giá hôm nay' },
    { label: '👶 Giá vé trẻ em',          query: 'Chính sách giá vé trẻ em ra sao?' },
    { label: '💳 Cách thanh toán',        query: 'Tôi muốn biết phương thức thanh toán' },
    { label: '👨‍💼 Gặp nhân viên tư vấn', query: 'Tôi muốn gặp nhân viên tư vấn trực tiếp' },
  ];

  return (
    <div className="mc-root">
      {/* ── NÚT BẬT/TẮT CHAT NỔI (FLOATING BUTTON) ── */}
      <button
        type="button"
        className={`mc-floating-btn ${isOpen ? 'active' : ''}`}
        onClick={toggleChat}
        title="Chat trực tuyến 24/7 với Tourism Assistant"
      >
        <span className="mc-pulse-ring" />
        <span className="mc-btn-icon">{isOpen ? '✕' : '💬'}</span>
        {!isOpen && (
          <span className="mc-btn-label">Hỗ trợ 24/7</span>
        )}
        {!isOpen && unreadCount > 0 && (
          <span className="mc-unread-badge">{unreadCount}</span>
        )}
      </button>

      {/* ── KHUNG CHAT MINI (POPUP CHAT WINDOW) ── */}
      {isOpen && (
        <div className="mc-window">
          {/* Header */}
          <div className="mc-header">
            <div className="mc-header-left">
              <div className="mc-avatar">
                <span>🤖</span>
                <span className="mc-online-dot" />
              </div>
              <div className="mc-header-info">
                <div className="mc-header-title">Tourism Assistant</div>
                <div className="mc-header-sub">
                  <span className="mc-live-dot" /> Trực tuyến 24/7 • Phản hồi tức thì
                </div>
              </div>
            </div>
            <button
              type="button"
              className="mc-close-btn"
              onClick={() => setIsOpen(false)}
              title="Thu nhỏ khung chat"
            >
              ✕
            </button>
          </div>

          {/* Banner thông tin Tour nếu đang ở trang chi tiết tour */}
          {(activeTourInfo || currentTour) && (
            <div className="mc-tour-banner">
              <img
                src={(activeTourInfo || currentTour).thumbnail || '/placeholder-tour.jpg'}
                alt={(activeTourInfo || currentTour).name}
                className="mc-tour-thumb"
                onError={(e) => { e.target.src = 'https://images.unsplash.com/photo-1507525428034-b723cf961d3e?w=120'; }}
              />
              <div className="mc-tour-info">
                <div className="mc-tour-tag">
                  Đang xem tour:
                  {(activeTourInfo || currentTour).guide_name && (
                    <span style={{ marginLeft: 6, color: '#38bdf8', fontWeight: 600 }}>
                      • HDV {(activeTourInfo || currentTour).guide_name}
                    </span>
                  )}
                </div>
                <div className="mc-tour-title" title={(activeTourInfo || currentTour).name}>
                  {(activeTourInfo || currentTour).name}
                </div>
              </div>
              <button
                type="button"
                className="mc-tour-ask-btn"
                onClick={() => handleSendMessage(`Tôi đang quan tâm tour "${(activeTourInfo || currentTour).name}", nhờ tư vấn giúp tôi!`)}
              >
                Hỏi tour này
              </button>
            </div>
          )}

          {/* Khung cuộn tin nhắn */}
          <div className="mc-body">
            {loading && messages.length === 0 ? (
              <div className="mc-loading">
                <div className="mc-spinner" />
                <span>Đang kết nối trợ lý ảo...</span>
              </div>
            ) : (
              <div className="mc-messages-list">
                {messages.map((msg, index) => {
                  const isCustomer = msg.sender_type === 'customer';
                  const isBot = msg.sender_type === 'bot';
                  const isStaff = msg.sender_type === 'staff';

                  return (
                    <div
                      key={msg.id || index}
                      className={`mc-msg-row ${isCustomer ? 'mc-msg-row--customer' : isStaff ? 'mc-msg-row--staff' : 'mc-msg-row--bot'}`}
                    >
                      {!isCustomer && (
                        <div className="mc-msg-avatar">
                          {isStaff ? '👨‍💼' : '🤖'}
                        </div>
                      )}

                      <div className="mc-msg-content">
                        {isStaff && (
                          <div className="mc-sender-tag">
                            👨‍💼 {msg.sender_name || 'Nhân viên tư vấn'}
                          </div>
                        )}

                        <div className="mc-bubble">
                          <div className="mc-text" style={{ whiteSpace: 'pre-wrap' }}>
                            {msg.message}
                          </div>

                          {/* Hiển thị danh sách Tour gợi ý nếu có */}
                          {msg.message_type === 'tours_carousel' && msg.metadata?.tours && (
                            <div className="mc-tours-card-list">
                              {msg.metadata.tours.map(t => (
                                <div
                                  key={t.id}
                                  className="mc-tour-card-item"
                                  onClick={() => {
                                    setIsOpen(false);
                                    navigate(`/tours/${t.id}`);
                                  }}
                                >
                                  <img src={t.thumbnail} alt={t.name} className="mc-card-img" />
                                  <div className="mc-card-body">
                                    <div className="mc-card-title">{t.name}</div>
                                    <div className="mc-card-meta">
                                      <span>📍 {t.destination}</span>
                                      <span className="mc-card-price">
                                        {Number(t.final_price).toLocaleString('vi-VN')} ₫
                                      </span>
                                    </div>
                                    {t.sale_percent > 0 && (
                                      <span className="mc-card-sale-badge">⚡ SALE {t.sale_percent}%</span>
                                    )}
                                  </div>
                                </div>
                              ))}
                            </div>
                          )}
                        </div>

                        <div className="mc-time">
                          {new Date(msg.created_at).toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' })}
                        </div>
                      </div>
                    </div>
                  );
                })}

                {chatStatus === 'waiting_staff' && (
                  <div className="mc-staff-alert">
                    <span>⏱️ Yêu cầu của bạn đã được chuyển đến Hướng dẫn viên/CSKH. Vui lòng chờ nhân viên phản hồi trong giây lát!</span>
                  </div>
                )}

                <div ref={messagesEndRef} />
              </div>
            )}
          </div>

          {/* Nút bấm gợi ý câu hỏi nhanh (Quick Prompts) */}
          <div className="mc-quick-chips">
            {quickOptions.map(opt => (
              <button
                key={opt.label}
                type="button"
                className="mc-chip-btn"
                onClick={() => handleSendMessage(opt.query)}
                disabled={sending}
              >
                {opt.label}
              </button>
            ))}
          </div>

          {/* Ô nhập tin nhắn */}
          <div className="mc-footer">
            <input
              type="text"
              className="mc-input"
              placeholder="Nhập câu hỏi bạn cần tư vấn..."
              value={inputText}
              onChange={(e) => setInputText(e.target.value)}
              onKeyDown={handleKeyDown}
              disabled={sending}
            />
            <button
              type="button"
              className="mc-send-btn"
              onClick={() => handleSendMessage()}
              disabled={!inputText.trim() || sending}
              title="Gửi tin nhắn"
            >
              {sending ? '...' : '➤'}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

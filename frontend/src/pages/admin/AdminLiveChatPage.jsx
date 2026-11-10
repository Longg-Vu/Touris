import { useState, useEffect, useRef, useCallback } from 'react';
import AdminLayout from '../../components/admin/AdminLayout';
import { adminChatAPI } from '../../api/services';
import { useAuth } from '../../context/AuthContext';
import './AdminLiveChatPage.css';

export default function AdminLiveChatPage() {
  const { user, isAdmin } = useAuth();

  const [sessions, setSessions]         = useState([]);
  const [selectedSessionId, setSelectedSessionId] = useState(null);
  const [currentSession, setCurrentSession]       = useState(null);
  const [messages, setMessages]         = useState([]);
  const [replyText, setReplyText]       = useState('');
  const [loadingSessions, setLoadingSessions] = useState(true);
  const [loadingMessages, setLoadingMessages] = useState(false);
  const [sending, setSending]           = useState(false);
  const [stats, setStats]               = useState({ all: 0, waiting_staff: 0, active: 0, resolved: 0, unread_messages: 0 });
  const [filterTab, setFilterTab]       = useState('all'); // 'all' | 'waiting_staff' | 'active' | 'resolved'
  const [searchTerm, setSearchTerm]     = useState('');

  const messagesEndRef = useRef(null);
  const pollingTimerRef = useRef(null);

  // Cuộn tin nhắn xuống đáy
  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  // Fetch thống kê
  const fetchStats = useCallback(async () => {
    try {
      const res = await adminChatAPI.getStats();
      setStats(res.data || {});
    } catch {
      // ignore
    }
  }, []);

  // Fetch danh sách phiên chat
  const fetchSessions = useCallback(async (keepSelected = true) => {
    try {
      const params = {
        status: filterTab,
        ...(searchTerm.trim() ? { search: searchTerm.trim() } : {}),
      };
      const res = await adminChatAPI.getSessions(params);
      const list = res.data?.results || res.data || [];
      setSessions(list);

      // Nếu chưa chọn phiên nào hoặc phiên đang chọn không còn trong danh sách
      if ((!selectedSessionId || !list.some(s => s.id === selectedSessionId)) && list.length > 0 && !keepSelected) {
        setSelectedSessionId(list[0].id);
      }
    } catch (err) {
      console.error('Lỗi tải danh sách chat:', err);
    } finally {
      setLoadingSessions(false);
    }
  }, [filterTab, searchTerm, selectedSessionId]);

  useEffect(() => {
    fetchStats();
    fetchSessions(false);
  }, [fetchStats, fetchSessions]);

  // Fetch tin nhắn của phiên chat đang chọn
  const fetchSessionMessages = useCallback(async (sessionId) => {
    if (!sessionId) return;
    try {
      setLoadingMessages(true);
      const res = await adminChatAPI.getSessionMessages(sessionId);
      setCurrentSession(res.data.session || null);
      setMessages(res.data.messages || []);
      // Reset unread trong danh sách cục bộ
      setSessions(prev => prev.map(s => s.id === sessionId ? { ...s, unread_staff_count: 0 } : s));
      fetchStats();
    } catch (err) {
      console.error('Lỗi tải tin nhắn:', err);
    } finally {
      setLoadingMessages(false);
    }
  }, [fetchStats]);

  useEffect(() => {
    if (selectedSessionId) {
      fetchSessionMessages(selectedSessionId);
    }
  }, [selectedSessionId, fetchSessionMessages]);

  // Polling danh sách và tin nhắn định kỳ
  useEffect(() => {
    pollingTimerRef.current = setInterval(async () => {
      fetchStats();
      fetchSessions(true);
      if (selectedSessionId) {
        try {
          const res = await adminChatAPI.getSessionMessages(selectedSessionId);
          setMessages(res.data.messages || []);
          if (res.data.session) {
            setCurrentSession(res.data.session);
          }
        } catch {
          // ignore
        }
      }
    }, 4000);

    return () => clearInterval(pollingTimerRef.current);
  }, [selectedSessionId, fetchStats, fetchSessions]);

  // Gửi tin nhắn trả lời khách
  const handleSendReply = async (e) => {
    e?.preventDefault();
    const text = replyText.trim();
    if (!text || sending || !selectedSessionId) return;

    setSending(true);
    setReplyText('');

    // Optimistic UI
    const optimisticMsg = {
      id: 'opt_' + Date.now(),
      sender_type: 'staff',
      sender_name: user?.first_name ? `${user.first_name} ${user.last_name || ''}`.trim() : user?.username,
      message: text,
      message_type: 'text',
      created_at: new Date().toISOString(),
    };
    setMessages(prev => [...prev, optimisticMsg]);

    try {
      await adminChatAPI.replyMessage(selectedSessionId, { message: text });
      // Tải lại tin nhắn
      const res = await adminChatAPI.getSessionMessages(selectedSessionId);
      setMessages(res.data.messages || []);
      if (res.data.session) setCurrentSession(res.data.session);
      fetchSessions(true);
    } catch (err) {
      alert(err.response?.data?.detail || 'Không thể gửi tin nhắn.');
    } finally {
      setSending(false);
    }
  };

  // Hoàn thành / đóng phiên chat
  const handleResolveSession = async () => {
    if (!selectedSessionId) return;
    if (!window.confirm('Xác nhận hoàn thành và kết thúc phiên hỗ trợ này?')) return;
    try {
      await adminChatAPI.resolveSession(selectedSessionId);
      await fetchSessionMessages(selectedSessionId);
      await fetchSessions(true);
      await fetchStats();
    } catch {
      alert('Không thể kết thúc phiên hỗ trợ.');
    }
  };

  return (
    <AdminLayout title="Hỗ trợ & Live Chat trực tuyến">
      <div className="alc-container">
        {/* ── HEADER & STATS ── */}
        <div className="alc-header">
          <div>
            <h1 className="alc-title">
              💬 {isAdmin ? 'Live Chat — Khách hàng trực tuyến' : 'Live Chat — Khách hỏi về Tour của tôi'}
            </h1>
            <p className="alc-subtitle">
              {isAdmin
                ? 'Hệ thống trợ lý ảo Hybrid: Khách nhắn tin với Bot và nhân viên hỗ trợ trực tiếp thời gian thực.'
                : 'Khách hàng đang xem tour và cần hỏi thêm thông tin. Hãy trả lời để chốt đoàn sớm nhé!'}
            </p>
          </div>

          <div className="alc-stat-badges">
            <div
              className={`alc-stat-pill ${filterTab === 'waiting_staff' ? 'active' : ''}`}
              onClick={() => setFilterTab('waiting_staff')}
            >
              <span>⏱️ Cần nhân viên trả lời:</span>
              <strong style={{ color: stats.waiting_staff > 0 ? '#ef4444' : '#64748b' }}>
                {stats.waiting_staff || 0}
              </strong>
            </div>
            <div
              className={`alc-stat-pill ${filterTab === 'active' ? 'active' : ''}`}
              onClick={() => setFilterTab('active')}
            >
              <span>💬 Đang trò chuyện:</span>
              <strong>{stats.active || 0}</strong>
            </div>
            <div
              className={`alc-stat-pill ${filterTab === 'all' ? 'active' : ''}`}
              onClick={() => setFilterTab('all')}
            >
              <span>📋 Tất cả:</span>
              <strong>{stats.all || 0}</strong>
            </div>
          </div>
        </div>

        {/* ── MAIN WORKSPACE (2 CỘT) ── */}
        <div className="alc-workspace">
          {/* CỘT TRÁI: DANH SÁCH CUỘC TRÒ CHUYỆN */}
          <aside className="alc-sidebar">
            <div className="alc-search-bar">
              <input
                type="text"
                placeholder="🔍 Tìm theo tên khách, tour, SĐT..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>

            <div className="alc-session-list">
              {loadingSessions && sessions.length === 0 ? (
                <div className="alc-empty-list">Đang tải cuộc trò chuyện...</div>
              ) : sessions.length === 0 ? (
                <div className="alc-empty-list">
                  <span>💬</span>
                  <p>Không có cuộc trò chuyện nào ở trạng thái này.</p>
                </div>
              ) : (
                sessions.map(s => {
                  const isSelected = s.id === selectedSessionId;
                  const isWaiting = s.status === 'waiting_staff';
                  const isResolved = s.status === 'resolved';

                  return (
                    <div
                      key={s.id}
                      className={`alc-session-item ${isSelected ? 'selected' : ''} ${isWaiting ? 'waiting' : ''}`}
                      onClick={() => setSelectedSessionId(s.id)}
                    >
                      <div className="alc-session-avatar">
                        👤
                        {isWaiting && <span className="alc-pulse-badge" />}
                      </div>

                      <div className="alc-session-info">
                        <div className="alc-session-top">
                          <span className="alc-session-name">
                            {s.customer_name || `Khách #${s.id}`}
                          </span>
                          <span className="alc-session-time">
                            {s.updated_at ? new Date(s.updated_at).toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' }) : ''}
                          </span>
                        </div>

                        {s.current_tour_info && (
                          <div className="alc-session-tour-tag">
                            📍 {s.current_tour_info.name}
                          </div>
                        )}

                        <div className="alc-session-last-msg">
                          {s.last_message?.message || 'Chưa có tin nhắn...'}
                        </div>

                        <div className="alc-session-footer-meta">
                          <span className={`alc-status-tag alc-status-${s.status}`}>
                            {s.status_display}
                          </span>
                          {s.unread_staff_count > 0 && (
                            <span className="alc-unread-count">
                              {s.unread_staff_count} mới
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </aside>

          {/* CỘT PHẢI: KHUNG TRÒ CHUYỆN CHI TIẾT */}
          <main className="alc-chat-pane">
            {selectedSessionId && currentSession ? (
              <>
                {/* Header chi tiết khách */}
                <div className="alc-chat-header">
                  <div className="alc-chat-header-info">
                    <div className="alc-chat-header-name">
                      {currentSession.customer_name}
                      <span className={`alc-status-badge alc-status-${currentSession.status}`}>
                        {currentSession.status_display}
                      </span>
                    </div>
                    <div className="alc-chat-header-meta">
                      {currentSession.customer_phone && (
                        <span>📞 SĐT: <strong>{currentSession.customer_phone}</strong></span>
                      )}
                      {currentSession.customer_email && (
                        <span>📧 {currentSession.customer_email}</span>
                      )}
                      {currentSession.assigned_to_name && (
                        <span>👨‍💼 Phụ trách: <strong>{currentSession.assigned_to_name}</strong></span>
                      )}
                    </div>
                  </div>

                  <div className="alc-chat-header-actions">
                    {currentSession.status !== 'resolved' && (
                      <button
                        type="button"
                        className="alc-btn-resolve"
                        onClick={handleResolveSession}
                        title="Đánh dấu đã tư vấn xong"
                      >
                        ✓ Hoàn tất hỗ trợ
                      </button>
                    )}
                  </div>
                </div>

                {/* Banner Tour khách đang xem */}
                {currentSession.current_tour_info && (
                  <div className="alc-tour-context-bar">
                    <img
                      src={currentSession.current_tour_info.thumbnail || '/placeholder-tour.jpg'}
                      alt=""
                      className="alc-tour-context-thumb"
                    />
                    <div className="alc-tour-context-details">
                      <div className="alc-tour-context-label">Khách đang xem và quan tâm tour:</div>
                      <a
                        href={`/tours/${currentSession.current_tour_info.id}`}
                        target="_blank"
                        rel="noreferrer"
                        className="alc-tour-context-link"
                      >
                        {currentSession.current_tour_info.name} ↗
                      </a>
                    </div>
                  </div>
                )}

                {/* Lịch sử tin nhắn */}
                <div className="alc-messages-thread">
                  {loadingMessages && messages.length === 0 ? (
                    <div className="alc-thread-loading">Đang tải tin nhắn...</div>
                  ) : (
                    messages.map((m, idx) => {
                      const isCustomer = m.sender_type === 'customer';
                      const isBot = m.sender_type === 'bot';
                      const isStaff = m.sender_type === 'staff';

                      return (
                        <div
                          key={m.id || idx}
                          className={`alc-thread-row ${isCustomer ? 'row-customer' : isStaff ? 'row-staff' : 'row-bot'}`}
                        >
                          <div className="alc-bubble-container">
                            <div className="alc-bubble-sender">
                              {isCustomer ? `👤 ${m.sender_name || 'Khách hàng'}` : isStaff ? `👨‍💼 ${m.sender_name || 'Bạn (Nhân viên)'}` : '🤖 Trợ lý ảo Bot'}
                            </div>
                            <div className="alc-thread-bubble">
                              {m.message}
                            </div>
                            <div className="alc-bubble-time">
                              {new Date(m.created_at).toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' })}
                            </div>
                          </div>
                        </div>
                      );
                    })
                  )}
                  <div ref={messagesEndRef} />
                </div>

                {/* Form gõ trả lời */}
                <form className="alc-reply-box" onSubmit={handleSendReply}>
                  <textarea
                    rows={2}
                    className="alc-reply-input"
                    placeholder="Gõ tin nhắn trả lời khách hàng tại đây (Enter để gửi)..."
                    value={replyText}
                    onChange={(e) => setReplyText(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' && !e.shiftKey) {
                        e.preventDefault();
                        handleSendReply();
                      }
                    }}
                  />
                  <button
                    type="submit"
                    className="alc-reply-btn"
                    disabled={!replyText.trim() || sending}
                  >
                    {sending ? 'Đang gửi...' : 'Gửi trả lời ➤'}
                  </button>
                </form>
              </>
            ) : (
              <div className="alc-no-selected">
                <div style={{ fontSize: 56, marginBottom: 16 }}>💬</div>
                <h3>Chọn một cuộc trò chuyện để bắt đầu</h3>
                <p>Khách hàng nhắn tin qua Mini Chat sẽ xuất hiện tại đây theo thời gian thực.</p>
              </div>
            )}
          </main>
        </div>
      </div>
    </AdminLayout>
  );
}

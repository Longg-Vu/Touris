import { useState, useEffect, useCallback } from 'react';
import AdminLayout from '../../components/admin/AdminLayout';
import { adminConsultationAPI, adminUserAPI } from '../../api/services';
import { useAuth } from '../../context/AuthContext';
import './AdminConsultationsPage.css';

/* ─── Hằng số trạng thái ─────────────────────────────────── */
const STATUS_TABS = [
  { value: 'all',       label: 'Tất cả',          icon: '📋' },
  { value: 'pending',   label: 'Chờ gọi lại',     icon: '⏳' },
  { value: 'contacted', label: 'Đã liên hệ',      icon: '📞' },
  { value: 'resolved',  label: 'Đã chốt / Thành công', icon: '✅' },
  { value: 'cancelled', label: 'Đã huỷ',          icon: '❌' },
];

const STATUS_BADGE = {
  pending:   { label: 'Chờ gọi lại',    cls: 'acp-badge--pending',   icon: '⏳' },
  contacted: { label: 'Đã liên hệ',     cls: 'acp-badge--contacted', icon: '📞' },
  resolved:  { label: 'Đã chốt',        cls: 'acp-badge--resolved',  icon: '✅' },
  cancelled: { label: 'Đã huỷ',         cls: 'acp-badge--cancelled', icon: '❌' },
};

/* ─── Modal Cập nhật ghi chú & trạng thái tư vấn ────────── */
function ConsultationDetailModal({ item, guides, isAdmin, onClose, onSave, onClaim, loading }) {
  const [statusVal, setStatusVal]     = useState(item?.status || 'pending');
  const [adminNote, setAdminNote]     = useState(item?.admin_note || '');
  const [assignedTo, setAssignedTo]   = useState(item?.assigned_to || '');

  if (!item) return null;

  const handleSubmit = (e) => {
    e.preventDefault();
    onSave(item.id, {
      status: statusVal,
      admin_note: adminNote,
      ...(isAdmin ? { assigned_to: assignedTo ? parseInt(assignedTo, 10) : null } : {}),
    });
  };

  return (
    <div className="acp-modal-overlay" onClick={onClose}>
      <div className="acp-modal" onClick={(e) => e.stopPropagation()}>
        <div className="acp-modal-header">
          <div>
            <h2 className="acp-modal-title">
              💬 Xử lý yêu cầu tư vấn #{item.id}
            </h2>
            <span className="acp-modal-sub">
              Khách hàng: <strong>{item.customer_name}</strong> - Nhận lúc {new Date(item.created_at).toLocaleString('vi-VN')}
            </span>
          </div>
          <button className="acp-modal-close" onClick={onClose}>✕</button>
        </div>

        <form onSubmit={handleSubmit}>
          <div className="acp-modal-body">
            {/* Box thông tin tour */}
            {item.tour_name ? (
              <div className="acp-modal-tour-card">
                {item.tour_thumbnail && (
                  <img
                    src={item.tour_thumbnail}
                    alt={item.tour_name}
                    className="acp-modal-tour-thumb"
                  />
                )}
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 11, fontWeight: 700, color: '#0284c7', textTransform: 'uppercase' }}>
                    📍 {item.tour_destination || 'Việt Nam'}
                  </div>
                  <div style={{ fontSize: 14, fontWeight: 700, color: '#0f172a', margin: '2px 0 4px', lineHeight: 1.3 }}>
                    {item.tour_name}
                  </div>
                  <div style={{ fontSize: 13, color: '#64748b' }}>
                    Giá tham khảo: <strong style={{ color: '#ef4444' }}>{Number(item.tour_price || 0).toLocaleString('vi-VN')} ₫</strong>
                    {item.tour_guide_name && (
                      <span style={{ marginLeft: 10, color: '#4338ca' }}>
                        • HDV tuyến: <strong>{item.tour_guide_name}</strong>
                      </span>
                    )}
                  </div>
                </div>
              </div>
            ) : (
              <div style={{ padding: '8px 12px', background: '#f8fafc', borderRadius: 8, fontSize: 13, color: '#64748b', marginBottom: 16 }}>
                💡 Yêu cầu tư vấn chung (không chọn tour cụ thể)
              </div>
            )}

            {/* Thông tin liên hệ của khách & Quick Call */}
            <div className="acp-modal-client-info">
              <div className="acp-info-row">
                <span className="acp-info-label">👤 Khách hàng:</span>
                <span className="acp-info-val"><strong>{item.customer_name}</strong></span>
              </div>
              <div className="acp-info-row">
                <span className="acp-info-label">📞 Điện thoại:</span>
                <span className="acp-info-val">
                  <a href={`tel:${item.phone}`} className="acp-phone-link">
                    📞 {item.phone} <span>(Bấm để gọi ngay)</span>
                  </a>
                </span>
              </div>
              <div className="acp-info-row">
                <span className="acp-info-label">📧 Email:</span>
                <span className="acp-info-val">
                  <a href={`mailto:${item.email}`} style={{ color: '#0284c7' }}>
                    {item.email}
                  </a>
                </span>
              </div>
              {item.note && (
                <div className="acp-info-row" style={{ alignItems: 'flex-start' }}>
                  <span className="acp-info-label">💬 Lời nhắn khách:</span>
                  <div className="acp-client-note">
                    "{item.note}"
                  </div>
                </div>
              )}
            </div>

            {/* Phân công phụ trách */}
            <div style={{ margin: '16px 0', padding: '12px 14px', background: '#f1f5f9', borderRadius: 8 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
                <span style={{ fontSize: 12.5, fontWeight: 700, color: '#475569', textTransform: 'uppercase' }}>
                  Người nhận tư vấn:
                </span>
                {!item.assigned_to_name && (
                  <button
                    type="button"
                    className="acp-btn-claim-inline"
                    onClick={() => onClaim(item.id)}
                    disabled={loading}
                  >
                    🙋 Tôi nhận ca tư vấn này
                  </button>
                )}
              </div>

              {isAdmin ? (
                <div>
                  <select
                    className="acp-select"
                    value={assignedTo}
                    onChange={(e) => setAssignedTo(e.target.value)}
                  >
                    <option value="">— Chưa phân công (Để trống) —</option>
                    {guides.map((g) => (
                      <option key={g.id} value={g.id}>
                        {g.first_name ? `${g.first_name} ${g.last_name || ''}`.trim() : g.username}
                        {g.id === item.assigned_to ? ' (Hiện tại)' : ''}
                      </option>
                    ))}
                  </select>
                </div>
              ) : (
                <div style={{ fontSize: 13.5, color: '#1e293b', fontWeight: 600 }}>
                  {item.assigned_to_name ? `👨‍💼 ${item.assigned_to_name}` : '⚠️ Chưa có ai nhận ca'}
                </div>
              )}
            </div>

            {/* Trạng thái tư vấn */}
            <div className="acp-form-group">
              <label className="acp-form-label">
                Trạng thái tiến độ cuộc gọi <span style={{ color: '#ef4444' }}>*</span>
              </label>
              <div className="acp-status-grid">
                {STATUS_TABS.filter(t => t.value !== 'all').map((st) => (
                  <label
                    key={st.value}
                    className={`acp-status-radio-label ${statusVal === st.value ? 'selected' : ''}`}
                  >
                    <input
                      type="radio"
                      name="status"
                      value={st.value}
                      checked={statusVal === st.value}
                      onChange={(e) => setStatusVal(e.target.value)}
                    />
                    <span>{st.icon} {st.label}</span>
                  </label>
                ))}
              </div>
            </div>

            {/* Ghi chú cuộc gọi */}
            <div className="acp-form-group">
              <label className="acp-form-label">
                Ghi chú cuộc gọi / Tiến độ chăm sóc
              </label>
              <textarea
                className="acp-textarea"
                rows={4}
                placeholder="Ví dụ: Đã gọi lúc 15h, khách hỏi lịch trình 4 người. Đã gửi qua Zalo, khách hẹn tối mai chốt..."
                value={adminNote}
                onChange={(e) => setAdminNote(e.target.value)}
              />
            </div>
          </div>

          <div className="acp-modal-footer">
            <button
              type="button"
              className="acp-btn-cancel"
              onClick={onClose}
              disabled={loading}
            >
              Đóng
            </button>
            <button
              type="submit"
              className="acp-btn-save"
              disabled={loading}
            >
              {loading ? 'Đang lưu...' : '💾 Lưu cập nhật'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

/* ─── Trang chính AdminConsultationsPage ────────────────── */
export default function AdminConsultationsPage() {
  const { user, isAdmin } = useAuth();

  const [consultations, setConsultations] = useState([]);
  const [stats, setStats]                 = useState({ all: 0, pending: 0, contacted: 0, resolved: 0, cancelled: 0 });
  const [guides, setGuides]               = useState([]);
  const [loading, setLoading]             = useState(true);
  const [updating, setUpdating]           = useState(false);

  /* filter state */
  const [currentTab, setCurrentTab]       = useState('all');
  const [searchTerm, setSearchTerm]       = useState('');
  const [page, setPage]                   = useState(1);
  const [totalCount, setTotalCount]       = useState(0);

  /* modal state */
  const [selectedItem, setSelectedItem]   = useState(null);

  /* load danh sách guides nếu là admin */
  useEffect(() => {
    if (isAdmin) {
      adminUserAPI.getGuides()
        .then(res => setGuides(res.data?.results || res.data || []))
        .catch(() => {});
    }
  }, [isAdmin]);

  /* fetch stats */
  const fetchStats = useCallback(async () => {
    try {
      const res = await adminConsultationAPI.getStats();
      setStats(res.data || {});
    } catch {
      // ignore
    }
  }, []);

  /* fetch danh sách yêu cầu */
  const fetchConsultations = useCallback(async () => {
    setLoading(true);
    try {
      const params = {
        page,
        status: currentTab,
        ...(searchTerm.trim() ? { search: searchTerm.trim() } : {}),
      };
      const res = await adminConsultationAPI.getAll(params);
      const data = res.data;
      if (Array.isArray(data)) {
        setConsultations(data);
        setTotalCount(data.length);
      } else {
        setConsultations(data.results || []);
        setTotalCount(data.count || 0);
      }
    } catch (err) {
      console.error(err);
      setConsultations([]);
    } finally {
      setLoading(false);
    }
  }, [page, currentTab, searchTerm]);

  useEffect(() => {
    fetchStats();
  }, [fetchStats]);

  useEffect(() => {
    fetchConsultations();
  }, [fetchConsultations]);

  /* Handler lưu cập nhật */
  const handleSaveDetail = async (id, payload) => {
    setUpdating(true);
    try {
      await adminConsultationAPI.update(id, payload);
      setSelectedItem(null);
      await fetchConsultations();
      await fetchStats();
    } catch (err) {
      alert(err.response?.data?.detail || 'Không thể lưu thay đổi.');
    } finally {
      setUpdating(false);
    }
  };

  /* Handler tự nhận ca */
  const handleClaim = async (id) => {
    setUpdating(true);
    try {
      await adminConsultationAPI.claim(id);
      if (selectedItem && selectedItem.id === id) {
        setSelectedItem(prev => ({
          ...prev,
          status: 'contacted',
          assigned_to: user.id,
          assigned_to_name: user.first_name ? `${user.first_name} ${user.last_name || ''}`.trim() : user.username,
        }));
      }
      await fetchConsultations();
      await fetchStats();
    } catch (err) {
      alert(err.response?.data?.detail || 'Không thể nhận ca này.');
    } finally {
      setUpdating(false);
    }
  };

  /* Đổi nhanh trạng thái trên bảng */
  const handleQuickStatusChange = async (id, newStatus) => {
    try {
      await adminConsultationAPI.update(id, { status: newStatus });
      await fetchConsultations();
      await fetchStats();
    } catch (err) {
      alert('Không thể đổi trạng thái.');
    }
  };

  return (
    <AdminLayout title="Quản lý yêu cầu tư vấn">
      <div className="acp-page">
        {/* ── Header ────────────────────────────────────────── */}
        <div className="acp-header">
          <div>
            <h1 className="acp-title">
              💬 {isAdmin ? 'Quản lý Yêu cầu tư vấn' : 'Khách cần tư vấn — Tuyến của tôi'}
            </h1>
            <p className="acp-subtitle">
              {isAdmin
                ? 'Theo dõi, phân công HDV và chăm sóc các khách hàng đang cần tư vấn tour.'
                : 'Khách hàng quan tâm đến các tour bạn phụ trách. Hãy gọi lại sớm để hỗ trợ và chốt khách nhé!'}
            </p>
          </div>
          <button
            className="acp-btn-refresh"
            onClick={() => { fetchStats(); fetchConsultations(); }}
            title="Làm mới dữ liệu"
          >
            🔄 Làm mới
          </button>
        </div>

        {/* ── Stat Cards ────────────────────────────────────── */}
        <div className="acp-stats-grid">
          <div
            className={`acp-stat-card ${currentTab === 'all' ? 'active' : ''}`}
            onClick={() => { setCurrentTab('all'); setPage(1); }}
          >
            <div className="acp-stat-icon">📋</div>
            <div className="acp-stat-info">
              <div className="acp-stat-val">{stats.all || 0}</div>
              <div className="acp-stat-label">Tổng yêu cầu</div>
            </div>
          </div>

          <div
            className={`acp-stat-card acp-stat-card--pending ${currentTab === 'pending' ? 'active' : ''}`}
            onClick={() => { setCurrentTab('pending'); setPage(1); }}
          >
            <div className="acp-stat-icon">
              ⏳ {stats.pending > 0 && <span className="acp-pulse-dot" />}
            </div>
            <div className="acp-stat-info">
              <div className="acp-stat-val" style={{ color: '#d97706' }}>{stats.pending || 0}</div>
              <div className="acp-stat-label">Chờ gọi lại</div>
            </div>
          </div>

          <div
            className={`acp-stat-card acp-stat-card--contacted ${currentTab === 'contacted' ? 'active' : ''}`}
            onClick={() => { setCurrentTab('contacted'); setPage(1); }}
          >
            <div className="acp-stat-icon">📞</div>
            <div className="acp-stat-info">
              <div className="acp-stat-val" style={{ color: '#0284c7' }}>{stats.contacted || 0}</div>
              <div className="acp-stat-label">Đã liên hệ</div>
            </div>
          </div>

          <div
            className={`acp-stat-card acp-stat-card--resolved ${currentTab === 'resolved' ? 'active' : ''}`}
            onClick={() => { setCurrentTab('resolved'); setPage(1); }}
          >
            <div className="acp-stat-icon">✅</div>
            <div className="acp-stat-info">
              <div className="acp-stat-val" style={{ color: '#16a34a' }}>{stats.resolved || 0}</div>
              <div className="acp-stat-label">Đã chốt thành công</div>
            </div>
          </div>

          <div
            className={`acp-stat-card ${currentTab === 'cancelled' ? 'active' : ''}`}
            onClick={() => { setCurrentTab('cancelled'); setPage(1); }}
          >
            <div className="acp-stat-icon">❌</div>
            <div className="acp-stat-info">
              <div className="acp-stat-val" style={{ color: '#64748b' }}>{stats.cancelled || 0}</div>
              <div className="acp-stat-label">Đã huỷ</div>
            </div>
          </div>
        </div>

        {/* ── Filters & Search Toolbar ──────────────────────── */}
        <div className="acp-toolbar">
          <div className="acp-tabs">
            {STATUS_TABS.map((tab) => (
              <button
                key={tab.value}
                className={`acp-tab-btn ${currentTab === tab.value ? 'active' : ''}`}
                onClick={() => { setCurrentTab(tab.value); setPage(1); }}
              >
                <span>{tab.icon}</span>
                <span>{tab.label}</span>
                {tab.value === 'pending' && stats.pending > 0 && (
                  <span className="acp-tab-counter">{stats.pending}</span>
                )}
              </button>
            ))}
          </div>

          <div className="acp-search-box">
            <input
              type="text"
              placeholder="🔍 Tìm theo tên, SĐT, email, tour..."
              value={searchTerm}
              onChange={(e) => { setSearchTerm(e.target.value); setPage(1); }}
            />
            {searchTerm && (
              <button className="acp-search-clear" onClick={() => setSearchTerm('')}>✕</button>
            )}
          </div>
        </div>

        {/* ── Table Content ─────────────────────────────────── */}
        <div className="acp-table-container">
          {loading ? (
            <div className="acp-loading-state">
              <div className="acp-spinner" />
              <p>Đang tải danh sách yêu cầu tư vấn...</p>
            </div>
          ) : consultations.length === 0 ? (
            <div className="acp-empty-state">
              <div style={{ fontSize: 48, marginBottom: 10 }}>💬</div>
              <h3>Không tìm thấy yêu cầu tư vấn nào</h3>
              <p>
                {searchTerm
                  ? 'Thử thay đổi từ khóa tìm kiếm hoặc bỏ bộ lọc.'
                  : 'Hiện tại chưa có yêu cầu tư vấn nào ở trạng thái này.'}
              </p>
            </div>
          ) : (
            <table className="acp-table">
              <thead>
                <tr>
                  <th style={{ width: 80 }}>Mã</th>
                  <th>Khách hàng</th>
                  <th>Tour quan tâm</th>
                  <th>Lời nhắn của khách</th>
                  <th>Người phụ trách</th>
                  <th>Trạng thái</th>
                  <th>Ghi chú HDV / Admin</th>
                  <th>Thời gian</th>
                  <th style={{ width: 140, textAlign: 'center' }}>Thao tác</th>
                </tr>
              </thead>
              <tbody>
                {consultations.map((item) => {
                  const badge = STATUS_BADGE[item.status] || STATUS_BADGE.pending;
                  const isPending = item.status === 'pending';

                  return (
                    <tr key={item.id} className={isPending ? 'row-pending-highlight' : ''}>
                      {/* Mã */}
                      <td>
                        <strong style={{ color: '#0284c7' }}>#TV{item.id}</strong>
                      </td>

                      {/* Khách hàng */}
                      <td>
                        <div className="acp-client-cell">
                          <strong className="acp-client-name">{item.customer_name}</strong>
                          <div className="acp-client-actions">
                            <a
                              href={`tel:${item.phone}`}
                              className="acp-call-btn"
                              title="Bấm gọi ngay"
                            >
                              📞 {item.phone}
                            </a>
                            <span className="acp-client-email">{item.email}</span>
                          </div>
                        </div>
                      </td>

                      {/* Tour quan tâm */}
                      <td>
                        {item.tour_name ? (
                          <div className="acp-tour-cell">
                            {item.tour_thumbnail && (
                              <img
                                src={item.tour_thumbnail}
                                alt={item.tour_name}
                                className="acp-tour-thumb"
                              />
                            )}
                            <div>
                              <div className="acp-tour-title" title={item.tour_name}>
                                {item.tour_name}
                              </div>
                              <div className="acp-tour-dest">
                                📍 {item.tour_destination || 'Việt Nam'}
                              </div>
                            </div>
                          </div>
                        ) : (
                          <span style={{ color: '#94a3b8', fontStyle: 'italic', fontSize: 13 }}>
                            Yêu cầu chung
                          </span>
                        )}
                      </td>

                      {/* Lời nhắn khách */}
                      <td>
                        <div className="acp-note-cell" title={item.note}>
                          {item.note || <span style={{ color: '#cbd5e1' }}>— Không có —</span>}
                        </div>
                      </td>

                      {/* Người phụ trách */}
                      <td>
                        {item.assigned_to_name ? (
                          <div className="acp-assigned-box">
                            <span>👤 {item.assigned_to_name}</span>
                          </div>
                        ) : (
                          <button
                            type="button"
                            className="acp-btn-claim-mini"
                            onClick={() => handleClaim(item.id)}
                            title="Bấm để nhận ca tư vấn này"
                          >
                            🙋 Nhận ca
                          </button>
                        )}
                      </td>

                      {/* Trạng thái */}
                      <td>
                        <select
                          className={`acp-status-select ${badge.cls}`}
                          value={item.status}
                          onChange={(e) => handleQuickStatusChange(item.id, e.target.value)}
                        >
                          <option value="pending">⏳ Chờ gọi lại</option>
                          <option value="contacted">📞 Đã liên hệ</option>
                          <option value="resolved">✅ Đã chốt</option>
                          <option value="cancelled">❌ Đã huỷ</option>
                        </select>
                      </td>

                      {/* Ghi chú nội bộ */}
                      <td>
                        <div
                          className="acp-admin-note-cell"
                          onClick={() => setSelectedItem(item)}
                          title="Bấm để xem/sửa ghi chú"
                        >
                          {item.admin_note ? (
                            <span>📝 {item.admin_note}</span>
                          ) : (
                            <span style={{ color: '#94a3b8', fontSize: 12 }}>+ Thêm ghi chú</span>
                          )}
                        </div>
                      </td>

                      {/* Thời gian */}
                      <td>
                        <div style={{ fontSize: 12.5, color: '#64748b', whiteSpace: 'nowrap' }}>
                          {new Date(item.created_at).toLocaleDateString('vi-VN')}
                        </div>
                        <div style={{ fontSize: 11, color: '#94a3b8' }}>
                          {new Date(item.created_at).toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' })}
                        </div>
                      </td>

                      {/* Thao tác */}
                      <td style={{ textAlign: 'center' }}>
                        <div className="acp-actions-cell">
                          <a
                            href={`tel:${item.phone}`}
                            className="acp-action-btn acp-action-btn--call"
                            title="Gọi điện ngay"
                          >
                            📞
                          </a>
                          <button
                            type="button"
                            className="acp-action-btn acp-action-btn--edit"
                            onClick={() => setSelectedItem(item)}
                            title="Mở chi tiết & ghi chú"
                          >
                            ✏️
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>

        {/* ── Modal Chi tiết / Xử lý ────────────────────────── */}
        {selectedItem && (
          <ConsultationDetailModal
            item={selectedItem}
            guides={guides}
            isAdmin={isAdmin}
            onClose={() => setSelectedItem(null)}
            onSave={handleSaveDetail}
            onClaim={handleClaim}
            loading={updating}
          />
        )}
      </div>
    </AdminLayout>
  );
}

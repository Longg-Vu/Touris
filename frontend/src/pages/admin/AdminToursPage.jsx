import { useState, useEffect, useCallback } from 'react';
import { useSearchParams } from 'react-router-dom';
import AdminLayout from '../../components/admin/AdminLayout';
import { adminTourAPI, adminUserAPI, categoryAPI, destinationAPI } from '../../api/services';
import { useAuth } from '../../context/AuthContext';
import { playDingSound } from '../../components/admin/NotificationBell';
import './AdminToursPage.css';

/* ─── Helpers ──────────────────────────────────────────── */
const fmtVND = (num) =>
  new Intl.NumberFormat('vi-VN').format(Number(num)) + ' ₫';

const EMPTY_FORM = {
  name:                '',
  category:            '',
  destination:         '',
  guide:               '',
  price_adult:         '',
  thumbnail:           '',
  promo:               '',
  booked_count:        '0',
  target_participants: 20,
  tags:                '',        // chuỗi phân cách bằng dấu phẩy
  is_hot:              false,
  is_featured:         false,
  is_active:           true,
  is_priority_sale:    false,
  sale_percent:        0,
};

/* ─── Modal Thêm/Sửa Tour ──────────────────────────────── */
function TourFormModal({ tour, categories, destinations, guides = [], isAdmin, currentUser, onClose, onSaved }) {
  const isEdit = !!tour;
  const [form, setForm]       = useState(
    isEdit
      ? {
          ...tour,
          guide: tour.guide || '',
          target_participants: tour.target_participants ?? 20,
          tags: Array.isArray(tour.tags) ? tour.tags.join(', ') : '',
          is_priority_sale: tour.is_priority_sale ?? false,
          sale_percent: tour.sale_percent ?? 0,
        }
      : { ...EMPTY_FORM }
  );

  const [highlights, setHighlights] = useState(
    isEdit && Array.isArray(tour.highlights) ? tour.highlights : []
  );
  const [itinerary, setItinerary] = useState(
    isEdit && Array.isArray(tour.itinerary) ? tour.itinerary : []
  );

  const [loading, setLoading] = useState(false);
  const [error, setError]     = useState('');

  const set = (k, v) => setForm((f) => ({ ...f, [k]: v }));

  const addHighlight = () => {
    setHighlights((prev) => [...prev, { icon: '✨', text: '' }]);
  };
  const updateHighlight = (idx, field, val) => {
    setHighlights((prev) => prev.map((item, i) => i === idx ? { ...item, [field]: val } : item));
  };
  const removeHighlight = (idx) => {
    setHighlights((prev) => prev.filter((_, i) => i !== idx));
  };

  const addItinerary = () => {
    setItinerary((prev) => [...prev, { time: '', desc: '' }]);
  };
  const updateItinerary = (idx, field, val) => {
    setItinerary((prev) => prev.map((item, i) => i === idx ? { ...item, [field]: val } : item));
  };
  const removeItinerary = (idx) => {
    setItinerary((prev) => prev.filter((_, i) => i !== idx));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    if (!form.name.trim()) { setError('Tên tour không được để trống.'); return; }
    if (!form.price_adult)  { setError('Vui lòng nhập giá tour.'); return; }

    setLoading(true);
    try {
      const payload = {
        ...form,
        category:    form.category    || null,
        destination: form.destination || null,
        price_adult: Number(form.price_adult),
        booked_count: String(form.booked_count || '0'),
        target_participants: Number(form.target_participants) || 20,
        is_priority_sale: Boolean(form.is_priority_sale),
        sale_percent: form.is_priority_sale ? (Number(form.sale_percent) || 0) : 0,
        tags: form.tags
          ? form.tags.split(',').map((t) => t.trim()).filter(Boolean)
          : [],
        highlights: highlights.filter((h) => h.text && h.text.trim()),
        itinerary: itinerary.filter((it) => (it.desc && it.desc.trim()) || (it.time && it.time.trim())),
      };
      if (isAdmin) {
        payload.guide = form.guide || null;
      }
      if (isEdit) {
        await adminTourAPI.update(tour.id, payload);
      } else {
        await adminTourAPI.create(payload);
      }
      onSaved();
    } catch (err) {
      const data = err?.response?.data;
      if (data && typeof data === 'object') {
        const msgs = Object.entries(data)
          .map(([k, v]) => `${k}: ${Array.isArray(v) ? v[0] : v}`)
          .join(' | ');
        setError(msgs);
      } else {
        setError('Có lỗi xảy ra. Vui lòng thử lại.');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="atm-overlay" onClick={onClose}>
      <div className="atm-modal" onClick={(e) => e.stopPropagation()}>
        <button className="atm-close" onClick={onClose}>✕</button>
        <h2 className="atm-title">{isEdit ? '✏️ Sửa thông tin tour' : '➕ Thêm tour mới'}</h2>

        {error && <div className="atm-error">⚠️ {error}</div>}

        <form onSubmit={handleSubmit} className="atm-form">
          {/* Tên tour */}
          <div className="atm-field atm-full">
            <label>Tên tour <span>*</span></label>
            <input
              type="text"
              value={form.name}
              onChange={(e) => set('name', e.target.value)}
              placeholder="Ví dụ: Tour Đà Nẵng 3N2Đ khởi hành hàng ngày"
            />
          </div>

          {/* Danh mục + Điểm đến */}
          <div className="atm-field">
            <label>Danh mục</label>
            <select value={form.category || ''} onChange={(e) => set('category', e.target.value || null)}>
              <option value="">-- Chọn danh mục --</option>
              {categories.map((c) => (
                <option key={c.id} value={c.id}>{c.name}</option>
              ))}
            </select>
          </div>

          <div className="atm-field">
            <label>Điểm đến</label>
            <select value={form.destination || ''} onChange={(e) => set('destination', e.target.value || null)}>
              <option value="">-- Chọn điểm đến --</option>
              {destinations.map((d) => (
                <option key={d.id} value={d.id}>{d.name}</option>
              ))}
            </select>
          </div>

          {/* Hướng dẫn viên */}
          {isAdmin ? (
            <div className="atm-field">
              <label>Hướng dẫn viên phụ trách</label>
              <select value={form.guide || ''} onChange={(e) => set('guide', e.target.value || null)}>
                <option value="">-- Chưa phân công HDV --</option>
                {guides.map((g) => (
                  <option key={g.id} value={g.id}>{g.full_name} (@{g.username})</option>
                ))}
              </select>
            </div>
          ) : (
            <div className="atm-field">
              <label>Hướng dẫn viên phụ trách</label>
              <input
                type="text"
                disabled
                value={isEdit ? (tour.guide_name || 'Chính bạn') : `${currentUser?.first_name || ''} ${currentUser?.last_name || ''}`.trim() || currentUser?.username || 'Chính bạn'}
                style={{ opacity: 0.7, background: '#1e293b' }}
              />
            </div>
          )}

          {/* Giá */}
          <div className="atm-field">
            <label>Giá người lớn (VNĐ) <span>*</span></label>
            <input
              type="number"
              min="0"
              value={form.price_adult}
              onChange={(e) => set('price_adult', e.target.value)}
              placeholder="Ví dụ: 250000"
            />
          </div>

          {/* Số lượt đặt */}
          <div className="atm-field">
            <label>Số lượt đặt (hiển thị)</label>
            <input
              type="text"
              value={form.booked_count}
              onChange={(e) => set('booked_count', e.target.value)}
              placeholder="Ví dụ: 1.2k"
            />
          </div>

          {/* Số khách tiêu chuẩn / đoàn */}
          <div className="atm-field">
            <label>Số khách cần / đoàn (Mục tiêu)</label>
            <input
              type="number"
              min="1"
              value={form.target_participants ?? 20}
              onChange={(e) => set('target_participants', e.target.value)}
              placeholder="Ví dụ: 20"
            />
          </div>

          {/* Thumbnail URL */}
          <div className="atm-field atm-full">
            <label>URL ảnh thumbnail</label>
            <input
              type="text"
              value={form.thumbnail}
              onChange={(e) => set('thumbnail', e.target.value)}
              placeholder="https://..."
            />
            {form.thumbnail && (
              <img className="atm-thumb-preview" src={form.thumbnail} alt="preview"
                onError={(e) => { e.target.style.display = 'none'; }}
              />
            )}
          </div>

          {/* Nhãn khuyến mãi */}
          <div className="atm-field">
            <label>Nhãn khuyến mãi</label>
            <input
              type="text"
              value={form.promo || ''}
              onChange={(e) => set('promo', e.target.value)}
              placeholder="Ví dụ: Giảm 20%"
            />
          </div>

          {/* Tags */}
          <div className="atm-field">
            <label>Tags (phân cách bằng dấu phẩy)</label>
            <input
              type="text"
              value={form.tags}
              onChange={(e) => set('tags', e.target.value)}
              placeholder="Xác nhận tức thời, Miễn phí huỷ"
            />
          </div>

          {/* Điểm nổi bật (Highlights) */}
          <div className="atm-field atm-full atm-dynamic-section">
            <div className="atm-dynamic-header">
              <span className="atm-dynamic-title">🌟 Điểm nổi bật của tour ({highlights.length})</span>
              <button type="button" className="atm-btn-add-mini" onClick={addHighlight}>
                + Thêm điểm nổi bật
              </button>
            </div>
            {highlights.length === 0 ? (
              <p style={{ margin: 0, fontSize: '0.8rem', color: '#94a3b8' }}>
                Chưa có điểm nổi bật nào. Bấm nút trên để thêm.
              </p>
            ) : (
              <div className="atm-dynamic-list">
                {highlights.map((h, idx) => (
                  <div key={idx} className="atm-dynamic-row">
                    <input
                      type="text"
                      className="atm-input-icon"
                      value={h.icon || '✨'}
                      onChange={(e) => updateHighlight(idx, 'icon', e.target.value)}
                      placeholder="Icon"
                      title="Emoji đại diện"
                    />
                    <input
                      type="text"
                      className="atm-input-desc"
                      value={h.text}
                      onChange={(e) => updateHighlight(idx, 'text', e.target.value)}
                      placeholder="Mô tả điểm nổi bật (vd: Trải nghiệm cáp treo đạt 4 kỷ lục...)"
                    />
                    <button
                      type="button"
                      className="atm-btn-remove-row"
                      onClick={() => removeHighlight(idx)}
                      title="Xóa dòng này"
                    >
                      ✕
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Lịch trình chi tiết (Itinerary) */}
          <div className="atm-field atm-full atm-dynamic-section">
            <div className="atm-dynamic-header">
              <span className="atm-dynamic-title">🗺️ Lịch trình chi tiết ({itinerary.length} mốc giờ)</span>
              <button type="button" className="atm-btn-add-mini" onClick={addItinerary}>
                + Thêm mốc giờ
              </button>
            </div>
            {itinerary.length === 0 ? (
              <p style={{ margin: 0, fontSize: '0.8rem', color: '#94a3b8' }}>
                Chưa có lịch trình chi tiết. Bấm nút trên để thêm.
              </p>
            ) : (
              <div className="atm-dynamic-list">
                {itinerary.map((it, idx) => (
                  <div key={idx} className="atm-dynamic-row">
                    <input
                      type="text"
                      className="atm-input-time"
                      value={it.time}
                      onChange={(e) => updateItinerary(idx, 'time', e.target.value)}
                      placeholder="Giờ (vd: 08:00 - 09:30)"
                    />
                    <input
                      type="text"
                      className="atm-input-desc"
                      value={it.desc}
                      onChange={(e) => updateItinerary(idx, 'desc', e.target.value)}
                      placeholder="Mô tả hoạt động (vd: Xe và HDV đón tại khách sạn...)"
                    />
                    <button
                      type="button"
                      className="atm-btn-remove-row"
                      onClick={() => removeItinerary(idx)}
                      title="Xóa mốc giờ này"
                    >
                      ✕
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Cờ hiển thị */}
          <div className="atm-field atm-full atm-checkboxes">
            <label className="atm-checkbox">
              <input type="checkbox" checked={form.is_active}
                onChange={(e) => set('is_active', e.target.checked)} />
              <span>Đang hiển thị (is_active)</span>
            </label>
            <label className="atm-checkbox">
              <input type="checkbox" checked={form.is_featured}
                onChange={(e) => set('is_featured', e.target.checked)} />
              <span>⭐ Tour nổi bật (trang chủ)</span>
            </label>
            <label className="atm-checkbox">
              <input type="checkbox" checked={form.is_hot}
                onChange={(e) => set('is_hot', e.target.checked)} />
              <span>🔥 Tour Hot</span>
            </label>
            <label className="atm-checkbox">
              <input type="checkbox" checked={form.is_priority_sale}
                onChange={(e) => {
                  const checked = e.target.checked;
                  set('is_priority_sale', checked);
                  if (checked && (!form.sale_percent || form.sale_percent === 0)) {
                    set('sale_percent', 20);
                  }
                }} />
              <span style={{ color: '#ef4444', fontWeight: 600 }}>🚨 Cần đẩy Sale gấp (Kích hoạt Flash Sale)</span>
            </label>
            {form.is_priority_sale && (
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 6, marginLeft: 24, flexWrap: 'wrap' }}>
                <span style={{ fontSize: '0.82rem', fontWeight: 600, color: '#dc2626' }}>⚡ Mức giảm Flash Sale:</span>
                <input
                  type="number"
                  min="5"
                  max="90"
                  step="5"
                  value={form.sale_percent || 20}
                  onChange={(e) => set('sale_percent', Math.max(0, Math.min(90, Number(e.target.value) || 0)))}
                  style={{ width: 70, padding: '3px 8px', borderRadius: 6, border: '1.5px solid #f87171', fontWeight: 700, color: '#dc2626', background: '#fff' }}
                />
                <span style={{ fontSize: '0.85rem', fontWeight: 700, color: '#dc2626' }}>%</span>
                {form.price_adult && (
                  <span style={{ fontSize: '0.78rem', color: '#64748b' }}>
                    (Giá sau sale: <strong style={{ color: '#dc2626' }}>{fmtVND(Math.round(form.price_adult * (100 - (form.sale_percent || 20)) / 100))}</strong>)
                  </span>
                )}
              </div>
            )}
          </div>

          {/* Buttons */}
          <div className="atm-actions atm-full">
            <button type="button" className="atm-btn atm-btn-cancel" onClick={onClose}>
              Huỷ
            </button>
            <button type="submit" className="atm-btn atm-btn-save" disabled={loading}>
              {loading ? '⏳ Đang lưu...' : isEdit ? '💾 Lưu thay đổi' : '➕ Thêm tour'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

/* ─── Modal Tiến độ đoàn & Danh sách khách đặt ────────────── */
function TourManifestModal({ tourId, isAdmin, onClose, onShowToast, onAlertSent }) {
  const [data, setData]         = useState(null);
  const [loading, setLoading]   = useState(true);
  const [error, setError]       = useState('');
  const [copied, setCopied]     = useState(false);
  const [alerting, setAlerting] = useState(false);
  const [salePercent, setSalePercent] = useState(20);

  useEffect(() => {
    if (!tourId) return;
    setLoading(true);
    setError('');
    adminTourAPI.getManifest(tourId)
      .then(res => {
        setData(res.data);
        if (res.data?.tour?.sale_percent > 0) {
          setSalePercent(res.data.tour.sale_percent);
        }
      })
      .catch(() => setError('Không thể tải tiến độ đoàn và danh sách khách.'))
      .finally(() => setLoading(false));
  }, [tourId]);

  if (!tourId) return null;

  const handleCopySaleMsg = () => {
    if (!data?.tour) return;
    const t = data.tour;
    const msg = `Chào phòng Sale, Tour "${t.name}" (#${t.id}) hiện mới có ${t.total_booked_guests}/${t.target_participants} khách (còn thiếu ${t.remaining_needed} khách). Nhờ Sale hỗ trợ đẩy mạnh tư vấn chốt khách giúp đoàn nhé! Cảm ơn mọi người!`;
    navigator.clipboard.writeText(msg).then(() => {
      setCopied(true);
      onShowToast?.('📋 Đã sao chép tin nhắn báo Sale vào clipboard!');
      setTimeout(() => setCopied(false), 3000);
    });
  };

  const handleAlertSale = async () => {
    if (!tourId || alerting) return;
    setAlerting(true);
    try {
      const res = await adminTourAPI.alertSale(tourId);
      playDingSound();
      setData((prev) => ({
        ...prev,
        tour: {
          ...prev.tour,
          is_priority_sale: true,
          last_sale_alert_at: res.data.last_sale_alert_at,
          last_sale_alert_display: res.data.last_sale_alert_display,
        }
      }));
      onShowToast?.(res.data.message || '🚨 Đã gửi cảnh báo đến phòng Sale thành công!');
      onAlertSent?.();
    } catch {
      setError('Không thể gửi cảnh báo đến phòng Sale. Vui lòng thử lại.');
    } finally {
      setAlerting(false);
    }
  };

  const handleActivateSale = async () => {
    if (!tourId || alerting) return;
    setAlerting(true);
    try {
      const res = await adminTourAPI.activateSale(tourId, salePercent);
      playDingSound();
      setData((prev) => ({
        ...prev,
        tour: {
          ...prev.tour,
          is_priority_sale: true,
          sale_percent: res.data.sale_percent,
          sale_price: res.data.sale_price,
        }
      }));
      onShowToast?.(res.data.message || `⚡ Đã kích hoạt Flash Sale giảm ${res.data.sale_percent}% ngoài Website!`);
      onAlertSent?.();
    } catch {
      setError('Không thể kích hoạt Sale. Vui lòng thử lại.');
    } finally {
      setAlerting(false);
    }
  };

  const handleDeactivateSale = async () => {
    if (!tourId || alerting) return;
    setAlerting(true);
    try {
      const res = await adminTourAPI.deactivateSale(tourId);
      setData((prev) => ({
        ...prev,
        tour: {
          ...prev.tour,
          is_priority_sale: false,
          sale_percent: 0,
          sale_price: prev.tour.price_adult,
        }
      }));
      onShowToast?.(res.data.message || '✅ Đã tắt Sale và khôi phục giá gốc.');
      onAlertSent?.();
    } catch {
      setError('Không thể tắt Sale. Vui lòng thử lại.');
    } finally {
      setAlerting(false);
    }
  };

  const handleClearPriority = async () => {
    if (!tourId || alerting) return;
    setAlerting(true);
    try {
      await adminTourAPI.clearPrioritySale(tourId);
      setData((prev) => ({
        ...prev,
        tour: {
          ...prev.tour,
          is_priority_sale: false,
          sale_percent: 0,
        }
      }));
      onShowToast?.('✅ Đã gỡ cờ ưu tiên Sale cho đoàn này.');
      onAlertSent?.();
    } catch {
      setError('Không thể gỡ cờ ưu tiên. Vui lòng thử lại.');
    } finally {
      setAlerting(false);
    }
  };

  return (
    <div className="atm-overlay" onClick={onClose}>
      <div className="atm-modal atm-manifest-modal" onClick={(e) => e.stopPropagation()}>
        <button className="atm-close" onClick={onClose}>✕</button>

        <div className="atm-modal-header">
          <h2>👥 Tiến độ đoàn & Khách đặt tour</h2>
          {data?.tour && (
            <p style={{ margin: '4px 0 0', color: '#64748b', fontSize: '0.85rem' }}>
              #{data.tour.id} · <strong>{data.tour.name}</strong>
              {data.tour.guide_name && ` · HDV: ${data.tour.guide_name}`}
            </p>
          )}
        </div>

        {error && <div className="atm-error" style={{ margin: '1rem' }}>⚠️ {error}</div>}

        {loading ? (
          <div className="atp-loading" style={{ justifyContent: 'center', padding: '3rem' }}>
            <div className="atp-spinner" />
            <span>Đang tải thông tin đoàn...</span>
          </div>
        ) : data?.tour && (
          <div style={{ padding: '0 1.5rem 1.5rem' }}>
            {/* 4 Thống kê chính */}
            <div className="atm-manifest-summary">
              <div className="atm-manifest-stat">
                <div className="atm-manifest-stat-val" style={{ color: '#4f46e5' }}>
                  {data.tour.target_participants}
                </div>
                <div className="atm-manifest-stat-label">🎯 Khách tiêu chuẩn</div>
              </div>

              <div className="atm-manifest-stat">
                <div className="atm-manifest-stat-val" style={{ color: '#0ea5e9' }}>
                  {data.tour.total_booked_guests}
                </div>
                <div className="atm-manifest-stat-label">👥 Khách đã đặt</div>
              </div>

              <div className="atm-manifest-stat">
                <div className="atm-manifest-stat-val" style={{ color: data.tour.remaining_needed > 0 ? '#ea580c' : '#10b981' }}>
                  {data.tour.remaining_needed}
                </div>
                <div className="atm-manifest-stat-label">
                  {data.tour.remaining_needed > 0 ? '⚠️ Còn thiếu' : '✅ Đủ đoàn'}
                </div>
              </div>

              <div className="atm-manifest-stat">
                <div className="atm-manifest-stat-val" style={{ color: '#8b5cf6' }}>
                  {data.tour.fill_rate}%
                </div>
                <div className="atm-manifest-stat-label">📊 Tỉ lệ lấp đầy</div>
              </div>
            </div>

            {/* Thanh tiến độ */}
            <div style={{ marginBottom: '1.25rem' }}>
              <div className="atp-progress-track" style={{ height: 10 }}>
                <div
                  className={`atp-progress-fill ${data.tour.has_shortage ? 'shortage' : 'ready'}`}
                  style={{ width: `${data.tour.fill_rate}%` }}
                />
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.75rem', color: '#64748b', marginTop: 4 }}>
                <span>Đã xác nhận: <strong>{data.tour.confirmed_guests}</strong> · Chờ xác nhận: <strong>{data.tour.pending_guests}</strong></span>
                <span>Chỉ tiêu đoàn: <strong>{data.tour.target_participants} khách</strong></span>
              </div>
            </div>

            {/* Cảnh báo tiến độ & Báo Sale / Flash Sale */}
            {data.tour.has_shortage ? (
              <div className="atm-alert-box shortage">
                <span className="atm-alert-icon">⚠️</span>
                <div className="atm-alert-content">
                  <div className="atm-alert-title">
                    Đoàn đang thiếu {data.tour.remaining_needed} khách để khởi hành đúng chỉ tiêu
                  </div>
                  <div className="atm-alert-desc">
                    Hiện mới có <strong>{data.tour.total_booked_guests} / {data.tour.target_participants} khách</strong> đặt tour.
                    {!isAdmin ? (
                      ' Hướng dẫn viên hãy gửi đề xuất để phòng Sale và Admin kịp thời hỗ trợ đẩy mạnh tư vấn gom khách chốt đoàn.'
                    ) : (
                      ' Quản trị viên có thể kích hoạt chương trình Flash Sale giảm giá ngoài Trang chủ & Danh sách Tour để kích cầu gom khách.'
                    )}
                  </div>

                  {/* Phân quyền rõ ràng: HDV (Báo Sale) vs Admin (Công cụ Flash Sale kích cầu) */}
                  {!isAdmin ? (
                    <div className="atm-alert-actions-group">
                      {data.tour.last_sale_alert_at ? (
                        <div className="atm-alert-sent-wrapper">
                          <button
                            type="button"
                            className="atm-btn-alert-success"
                            disabled
                            title="Đề xuất đã được gửi đến phòng Sale và Admin"
                          >
                            ✅ Đã gửi đề xuất Sale {data.tour.last_sale_alert_display ? `(Lúc ${data.tour.last_sale_alert_display})` : ''}
                          </button>
                          <button
                            type="button"
                            className="atm-btn-resend-alert"
                            onClick={handleAlertSale}
                            disabled={alerting}
                            title="Gửi nhắc lại nếu cần hỗ trợ gấp hơn"
                          >
                            {alerting ? '⏳ Đang gửi...' : '🔄 Gửi nhắc lại Sale'}
                          </button>
                        </div>
                      ) : (
                        <button
                          type="button"
                          className="atm-btn-alert-sale"
                          onClick={handleAlertSale}
                          disabled={alerting}
                          title="Bấm để gửi chuông báo ngay tới phòng Sale và Admin"
                        >
                          {alerting ? '⏳ Đang gửi đề xuất...' : '🚨 Báo phòng Sale & Đề xuất giảm giá'}
                        </button>
                      )}

                      <button
                        type="button"
                        className="atm-btn-copy-sale"
                        onClick={handleCopySaleMsg}
                        title="Sao chép tin nhắn để gửi Zalo / Telegram nội bộ"
                      >
                        {copied ? '✅ Đã copy tin nhắn!' : '📋 Copy tin nhắn Zalo/Telegram'}
                      </button>
                    </div>
                  ) : (
                    /* Admin Flash Sale Tool */
                    <div className="atm-admin-sale-tool">
                      {data.tour.last_sale_alert_at && (
                        <div className="atm-admin-hdv-note">
                          📢 Hướng dẫn viên đã gửi đề xuất hỗ trợ gom khách lúc: <strong>{data.tour.last_sale_alert_display}</strong>
                        </div>
                      )}

                      <div className="atm-sale-controls">
                        <div className="atm-sale-percent-selector">
                          <span className="atm-sale-label">⚡ Mức giảm Flash Sale:</span>
                          <div className="atm-sale-preset-group">
                            {[10, 15, 20, 25, 30].map((p) => (
                              <button
                                key={p}
                                type="button"
                                className={`atm-sale-preset-btn ${salePercent === p ? 'active' : ''}`}
                                onClick={() => setSalePercent(p)}
                              >
                                -{p}%
                              </button>
                            ))}
                            <div className="atm-sale-custom-input">
                              <input
                                type="number"
                                min="5"
                                max="90"
                                value={salePercent}
                                onChange={(e) => setSalePercent(Math.max(5, Math.min(90, Number(e.target.value) || 0)))}
                              />
                              <span>%</span>
                            </div>
                          </div>
                        </div>

                        {/* Preview giá tiền */}
                        <div className="atm-sale-price-preview">
                          <div className="atm-spp-item">
                            <span>Giá gốc:</span>
                            <del>{fmtVND(data.tour.price_adult)}</del>
                          </div>
                          <div className="atm-spp-arrow">➔</div>
                          <div className="atm-spp-item">
                            <span>Giá sau Sale (-{salePercent}%):</span>
                            <strong style={{ color: '#dc2626', fontSize: '1.05rem' }}>
                              {fmtVND(Math.round(data.tour.price_adult * (100 - salePercent) / 100))}
                            </strong>
                          </div>
                        </div>
                      </div>

                      {/* Nút hành động của Admin */}
                      <div className="atm-sale-actions">
                        {data.tour.is_priority_sale && data.tour.sale_percent > 0 ? (
                          <div className="atm-sale-active-group">
                            <span className="atm-sale-status-badge">
                              🔥 Đang Flash Sale {data.tour.sale_percent}% ngoài Public
                            </span>
                            <button
                              type="button"
                              className="atm-btn-activate-sale"
                              onClick={handleActivateSale}
                              disabled={alerting}
                              title="Cập nhật mức giảm giá mới ra website"
                            >
                              {alerting ? '⏳ Đang lưu...' : `🔄 Cập nhật Sale ${salePercent}%`}
                            </button>
                            <button
                              type="button"
                              className="atm-btn-deactivate-sale"
                              onClick={handleDeactivateSale}
                              disabled={alerting}
                              title="Tắt khuyến mãi và khôi phục giá gốc"
                            >
                              {alerting ? '⏳ Đang tắt...' : '❌ Tắt Sale & Về giá gốc'}
                            </button>
                          </div>
                        ) : (
                          <div className="atm-sale-inactive-group">
                            <button
                              type="button"
                              className="atm-btn-activate-sale"
                              onClick={handleActivateSale}
                              disabled={alerting}
                              title="Bật nhãn Sale và giảm giá ra trang chủ"
                            >
                              {alerting ? '⏳ Đang kích hoạt...' : `⚡ Kích hoạt Sale ${salePercent}% ra ngoài Website`}
                            </button>
                            {data.tour.is_priority_sale && (
                              <button
                                type="button"
                                className="atm-btn-deactivate-sale"
                                onClick={handleClearPriority}
                                disabled={alerting}
                              >
                                ❌ Gỡ cờ ưu tiên
                              </button>
                            )}
                          </div>
                        )}

                        <button
                          type="button"
                          className="atm-btn-copy-sale"
                          onClick={handleCopySaleMsg}
                          title="Sao chép tin nhắn để gửi Zalo / Telegram nội bộ"
                        >
                          {copied ? '✅ Đã copy tin nhắn!' : '📋 Copy tin nhắn Zalo/Telegram'}
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            ) : (
              <div className="atm-alert-box ready">
                <span className="atm-alert-icon">✅</span>
                <div className="atm-alert-content">
                  <div className="atm-alert-title">
                    Đoàn đã đạt số lượng khách yêu cầu ({data.tour.total_booked_guests}/{data.tour.target_participants} khách)
                  </div>
                  <div className="atm-alert-desc">
                    Tour đã đủ khách tiêu chuẩn để vận hành. Hướng dẫn viên có thể chuẩn bị hồ sơ đoàn và liên hệ khách hàng.
                  </div>
                  {data.tour.is_priority_sale && (
                    <div style={{ marginTop: 10 }}>
                      <button
                        type="button"
                        className="atm-btn-resend-alert"
                        onClick={isAdmin ? handleDeactivateSale : handleClearPriority}
                        disabled={alerting}
                      >
                        ✅ Đoàn đã đủ khách - Bấm để {isAdmin ? 'tắt Flash Sale & khôi phục giá gốc' : 'gỡ cờ Sale'}
                      </button>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Danh sách hành khách trong đoàn */}
            <h4 style={{ fontSize: '0.9rem', fontWeight: 700, color: '#1e293b', margin: '1rem 0 0.5rem', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <span>📋 Danh sách khách đặt ({data.bookings.length} đơn)</span>
              <span style={{ fontSize: '0.78rem', color: '#64748b', fontWeight: 400 }}>
                Tổng {data.tour.total_booked_guests} khách ({data.bookings.reduce((s, b) => s + b.num_adults, 0)} NL + {data.bookings.reduce((s, b) => s + b.num_children, 0)} TE)
              </span>
            </h4>

            {data.bookings.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '2rem', background: '#f8fafc', borderRadius: 8, color: '#94a3b8' }}>
                📭 Chưa có khách hàng nào đặt tour này.
              </div>
            ) : (
              <div className="atm-manifest-table-wrap">
                <table className="atm-manifest-table">
                  <thead>
                    <tr>
                      <th>Mã đơn</th>
                      <th>Khách hàng</th>
                      <th>Số điện thoại</th>
                      <th>Ngày khởi hành</th>
                      <th>Khách</th>
                      <th>Trạng thái</th>
                      <th>Ghi chú</th>
                    </tr>
                  </thead>
                  <tbody>
                    {data.bookings.map((b) => (
                      <tr key={b.id}>
                        <td style={{ fontWeight: 600, color: '#4f46e5' }}>#{b.booking_code || b.id}</td>
                        <td style={{ fontWeight: 600 }}>{b.contact_name}</td>
                        <td>
                          <a href={`tel:${b.contact_phone}`} className="atm-phone-link">
                            📞 {b.contact_phone}
                          </a>
                        </td>
                        <td>{new Date(b.travel_date).toLocaleDateString('vi-VN')}</td>
                        <td>
                          <strong>{b.num_adults}</strong> NL
                          {b.num_children > 0 && ` + ${b.num_children} TE`}
                        </td>
                        <td>
                          <span style={{
                            fontSize: '0.72rem', fontWeight: 700, padding: '2px 8px', borderRadius: 4,
                            background: b.status === 'confirmed' ? '#dcfce7' : (b.status === 'completed' ? '#e0e7ff' : '#fef9c3'),
                            color: b.status === 'confirmed' ? '#166534' : (b.status === 'completed' ? '#3730a3' : '#854d0e')
                          }}>
                            {b.status === 'confirmed' ? 'Đã xác nhận' : (b.status === 'completed' ? 'Hoàn thành' : 'Chờ xác nhận')}
                          </span>
                        </td>
                        <td style={{ color: b.special_request ? '#0f172a' : '#94a3b8', fontSize: '0.78rem' }}>
                          {b.special_request || '—'}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

/* ─── Confirm Delete Modal ─────────────────────────────── */
function ConfirmModal({ tourName, onConfirm, onCancel, loading }) {
  return (
    <div className="atm-overlay" onClick={onCancel}>
      <div className="atm-confirm" onClick={(e) => e.stopPropagation()}>
        <div className="atm-confirm-icon">🗑️</div>
        <h3>Xác nhận xoá tour</h3>
        <p>Bạn có chắc muốn xoá tour <strong>"{tourName}"</strong>?<br />
           Hành động này không thể hoàn tác.</p>
        <div className="atm-confirm-btns">
          <button className="atm-btn atm-btn-cancel" onClick={onCancel}>Huỷ bỏ</button>
          <button className="atm-btn atm-btn-delete" onClick={onConfirm} disabled={loading}>
            {loading ? '...' : 'Xoá tour'}
          </button>
        </div>
      </div>
    </div>
  );
}

/* ─── Main Component ────────────────────────────────────── */
function AdminToursPage() {
  const { isAdmin, user: currentUser } = useAuth();
  const [searchParams]                = useSearchParams();
  const [tours, setTours]             = useState([]);
  const [categories, setCategories]   = useState([]);
  const [destinations, setDestinations] = useState([]);
  const [guides, setGuides]           = useState([]);
  const [loading, setLoading]         = useState(true);
  const [error, setError]             = useState('');
  const [search, setSearch]           = useState('');
  const [filterActive, setFilterActive] = useState(''); // '' | 'true' | 'false'
  const [timeFilter, setTimeFilter]   = useState(!isAdmin ? 'this_month' : 'all');
  const [guideStats, setGuideStats]   = useState(null);
  const [manifestTourId, setManifestTourId] = useState(null);
  const [page, setPage]               = useState(1);
  const [totalCount, setTotalCount]   = useState(0);
  const PAGE_SIZE = 24;
  const totalPages = Math.ceil(totalCount / PAGE_SIZE);
  const [formModal, setFormModal]     = useState(null); // null | 'add' | tour object
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [actionLoading, setActionLoading] = useState(false);
  const [toast, setToast]             = useState('');

  const showToast = (msg) => { setToast(msg); setTimeout(() => setToast(''), 3000); };

  /* ── Đồng bộ URL Search Params (Từ Dashboard hoặc Chuông) ─ */
  useEffect(() => {
    const urlSearch = searchParams.get('search');
    const urlManifest = searchParams.get('manifest') || searchParams.get('tour_id');
    const urlTimeFilter = searchParams.get('time_filter');
    const urlPriority = searchParams.get('priority') || searchParams.get('priority_sale');

    if (urlSearch !== null) {
      setSearch(urlSearch);
    }
    if (urlManifest) {
      setManifestTourId(Number(urlManifest));
    }
    if (urlPriority === 'true') {
      setTimeFilter('priority_sale');
    } else if (urlTimeFilter) {
      setTimeFilter(urlTimeFilter);
    } else if (urlSearch || urlManifest) {
      setTimeFilter('all');
    }
  }, [searchParams]);

  /* ── Fetch thống kê HDV (widget & tab badges) ──────────── */
  const fetchGuideStats = useCallback(async () => {
    try {
      const res = await adminTourAPI.getGuideStats();
      setGuideStats(res.data);
    } catch {
      // fallback im lặng
    }
  }, []);

  useEffect(() => {
    fetchGuideStats();
  }, [fetchGuideStats]);

  /* ── Fetch tour list ──────────────────────────────────── */
  const fetchTours = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const params = { page };
      if (search)       params.search      = search;
      if (filterActive) params.is_active   = filterActive;
      if (timeFilter && timeFilter !== 'all') params.time_filter = timeFilter;
      const res = await adminTourAPI.getAll(params);
      if (res.data.results !== undefined) {
        setTours(res.data.results);
        setTotalCount(res.data.count || 0);
      } else {
        setTours(res.data);
        setTotalCount(res.data.length);
      }
    } catch {
      setError('Không thể tải danh sách tour.');
    } finally {
      setLoading(false);
    }
  }, [search, filterActive, timeFilter, page]);

  /* ── Fetch categories & destinations & guides (1 lần) ── */
  useEffect(() => {
    Promise.all([categoryAPI.getAll(), destinationAPI.getAll()]).then(([cRes, dRes]) => {
      setCategories(cRes.data.results ?? cRes.data);
      setDestinations(dRes.data.results ?? dRes.data);
    });
    if (isAdmin) {
      adminUserAPI.getGuides().then((res) => {
        setGuides(res.data);
      }).catch(() => {});
    }
  }, [isAdmin]);

  // Reset về trang 1 khi đổi search/filter/timeFilter
  useEffect(() => { setPage(1); }, [search, filterActive, timeFilter]);

  useEffect(() => {
    const t = setTimeout(() => fetchTours(), 300);
    return () => clearTimeout(t);
  }, [fetchTours]);

  /* ── Toggle active ─────────────────────────────────── */
  const handleToggleActive = async (tour) => {
    try {
      await adminTourAPI.toggleActive(tour.id);
      showToast(`Tour đã ${tour.is_active ? 'ẩn' : 'hiện'} thành công!`);
      fetchTours();
      fetchGuideStats();
    } catch {
      showToast('Có lỗi xảy ra.');
    }
  };

  /* ── Toggle featured ───────────────────────────────── */
  const handleToggleFeatured = async (tour) => {
    try {
      await adminTourAPI.toggleFeatured(tour.id);
      showToast(`Tour ${tour.is_featured ? 'bỏ' : 'gắn'} nổi bật thành công!`);
      fetchTours();
    } catch {
      showToast('Có lỗi xảy ra.');
    }
  };

  /* ── Bật/tắt cờ ưu tiên Sale ────────────────────────── */
  const handleTogglePriority = async (tour) => {
    try {
      const res = await adminTourAPI.togglePrioritySale(tour.id);
      showToast(`✅ ${res.data.message || 'Cập nhật cờ Sale thành công!'}`);
      fetchTours();
      fetchGuideStats();
    } catch {
      showToast('❌ Thao tác thất bại.');
    }
  };

  /* ── Delete ─────────────────────────────────────────── */
  const handleDelete = async () => {
    if (!deleteTarget) return;
    setActionLoading(true);
    try {
      await adminTourAPI.delete(deleteTarget.id);
      showToast('✅ Đã xoá tour thành công!');
      setDeleteTarget(null);
      fetchTours();
      fetchGuideStats();
    } catch {
      showToast('❌ Xoá tour thất bại.');
    } finally {
      setActionLoading(false);
    }
  };

  /* ── After saved (add/edit) ──────────────────────── */
  const handleSaved = () => {
    setFormModal(null);
    showToast('✅ Lưu tour thành công!');
    fetchTours();
    fetchGuideStats();
  };

  return (
    <AdminLayout title={isAdmin ? "🗺️ Quản lý Tour toàn hệ thống" : "🗺️ Danh sách Tour của tôi"}>

      {/* Toast */}
      {toast && <div className="atp-toast">{toast}</div>}

      {/* ── Widget tổng hợp nhanh (HDV) ──────────────── */}
      {!isAdmin && (
        <div className="atp-guide-widgets">
          <div className="atp-widget-card">
            <div className="atp-widget-icon blue">👥</div>
            <div className="atp-widget-info">
              <span className="atp-widget-val">{guideStats?.this_month_guests ?? 0}</span>
              <span className="atp-widget-label">Khách tháng này</span>
            </div>
          </div>
          <div className="atp-widget-card">
            <div className="atp-widget-icon amber">🚀</div>
            <div className="atp-widget-info">
              <span className="atp-widget-val">{guideStats?.this_month_trips ?? 0}</span>
              <span className="atp-widget-label">Chuyến cần chuẩn bị</span>
            </div>
          </div>
          <div className="atp-widget-card">
            <div className="atp-widget-icon purple">📅</div>
            <div className="atp-widget-info">
              <span className="atp-widget-val">{guideStats?.next_month_trips ?? 0}</span>
              <span className="atp-widget-label">Chuyến tháng sau</span>
            </div>
          </div>
          <div className="atp-widget-card">
            <div className="atp-widget-icon green">🏁</div>
            <div className="atp-widget-info">
              <span className="atp-widget-val">{guideStats?.completed_trips ?? 0}</span>
              <span className="atp-widget-label">Đoàn đã hoàn thành</span>
            </div>
          </div>
        </div>
      )}

      {/* ── Thanh tab phân loại theo thời gian & Ưu tiên Sale ── */}
      <div className="atp-time-bar">
        <div className="atp-time-tabs">
          {(isAdmin ? [
            { id: 'all',           label: '🌐 Tất cả tour',                  count: guideStats?.tabs_count?.all ?? totalCount },
            { id: 'priority_sale', label: '🚨 Cần đẩy Sale gấp',            count: guideStats?.tabs_count?.priority_sale },
            { id: 'this_month',    label: '🗓️ Lịch khởi hành tháng này',     count: guideStats?.tabs_count?.this_month },
            { id: 'next_month',    label: '📅 Lịch khởi hành tháng sau',     count: guideStats?.tabs_count?.next_month },
          ] : [
            { id: 'this_month',    label: '🗓️ Tour tháng này (Đang bắt đầu)', count: guideStats?.tabs_count?.this_month },
            { id: 'next_month',    label: '📅 Tour tháng sau',                count: guideStats?.tabs_count?.next_month },
            { id: 'priority_sale', label: '🚨 Cần Sale gấp',                 count: guideStats?.tabs_count?.priority_sale },
            { id: 'completed',     label: '⏳ Lịch sử dẫn tour (Đã xong)',     count: guideStats?.tabs_count?.completed },
            { id: 'all',           label: '🌐 Tất cả tour phụ trách',         count: guideStats?.tabs_count?.all },
          ]).map(tab => (
            <button
              key={tab.id}
              className={`atp-time-tab ${timeFilter === tab.id ? 'active' : ''} ${tab.id === 'priority_sale' ? 'priority-tab' : ''}`}
              onClick={() => setTimeFilter(tab.id)}
            >
              <span>{tab.label}</span>
              {tab.count !== undefined && (
                <span className={`atp-tab-badge ${tab.id === 'priority_sale' && tab.count > 0 ? 'red' : ''}`}>
                  {tab.count}
                </span>
              )}
            </button>
          ))}
        </div>
      </div>

      {/* ── Toolbar ──────────────────────────────────── */}
      <div className="atp-toolbar">
        <div className="atp-search-wrap">
          <span className="atp-search-icon">🔍</span>
          <input
            className="atp-search"
            placeholder={isAdmin ? "Tìm theo tên tour, điểm đến, danh mục..." : "Tìm trong các tour bạn phụ trách..."}
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
          {search && <button className="atp-search-clear" onClick={() => setSearch('')}>✕</button>}
        </div>

        <div className="atp-filter-tabs">
          {[
            { value: '',      label: 'Tất cả' },
            { value: 'true',  label: '✅ Đang hiển thị' },
            { value: 'false', label: '🔒 Đã ẩn' },
          ].map((opt) => (
            <button
              key={opt.value}
              className={`atp-filter-tab ${filterActive === opt.value ? 'active' : ''}`}
              onClick={() => setFilterActive(opt.value)}
            >
              {opt.label}
            </button>
          ))}
        </div>

        <button className="atp-add-btn" onClick={() => setFormModal('add')}>
          ➕ Thêm tour mới
        </button>
      </div>

      {/* ── Error ─────────────────────────────────────── */}
      {error && <div className="atp-error">⚠️ {error}</div>}

      {/* ── Loading ───────────────────────────────────── */}
      {loading && (
        <div className="atp-loading">
          <div className="atp-spinner" />
          <span>Đang tải...</span>
        </div>
      )}

      {/* ── Tour Table ────────────────────────────────── */}
      {!loading && !error && (
        <>
          <div className="atp-table-wrap">
            <table className="atp-table">
              <thead>
                <tr>
                  <th>#</th>
                  <th>Ảnh</th>
                  <th>Tên tour</th>
                  <th>Danh mục</th>
                  <th>Điểm đến</th>
                  <th>Người dẫn tour</th>
                  <th>Giá từ</th>
                  <th>Tiến độ đoàn</th>
                  <th>Đánh giá</th>
                  <th>Trạng thái</th>
                  <th>Cờ</th>
                  <th>Hành động</th>
                </tr>
              </thead>
              <tbody>
                {tours.length === 0 ? (
                  <tr>
                    <td colSpan={12} className="atp-empty">
                      <div className="atp-empty-icon">🗺️</div>
                      <div>{isAdmin ? "Không tìm thấy tour nào" : "Không có tour nào trong danh mục này"}</div>
                    </td>
                  </tr>
                ) : (
                  tours.map((tour) => (
                    <tr key={tour.id}>
                      <td className="atp-td-id">#{tour.id}</td>
                      <td>
                        {tour.thumbnail
                          ? <img className="atp-thumb" src={tour.thumbnail} alt={tour.name}
                              onError={(e) => { e.target.style.display = 'none'; }} />
                          : <div className="atp-thumb-placeholder">🖼️</div>
                        }
                      </td>
                      <td className="atp-td-name" title={tour.name}>
                        <div className="atp-tour-name-wrap">
                          <span>{tour.name}</span>
                          {tour.is_priority_sale && (
                            <span className="atp-priority-sale-pill" title="Tour đang được yêu cầu phòng Sale đẩy mạnh gom khách">
                              {tour.sale_percent > 0 ? `⚡ Flash Sale -${tour.sale_percent}%` : '🚨 Cần Sale gấp'}
                            </span>
                          )}
                        </div>
                      </td>
                      <td className="atp-td-meta">{tour.category_name || '—'}</td>
                      <td className="atp-td-meta">{tour.destination_name || '—'}</td>
                      <td className="atp-td-meta">
                        {tour.guide_name ? (
                          <span style={{
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '4px',
                            background: 'rgba(99, 102, 241, 0.12)',
                            color: '#818cf8',
                            padding: '3px 8px',
                            borderRadius: '6px',
                            fontSize: '0.8rem',
                            fontWeight: 500
                          }}>
                            👷 {tour.guide_name}
                          </span>
                        ) : (
                          <span style={{ color: '#64748b', fontSize: '0.8rem' }}>Chưa gán</span>
                        )}
                      </td>
                      <td className="atp-td-price">
                        {tour.is_priority_sale && tour.sale_percent > 0 ? (
                          <div>
                            <div style={{ color: '#ef4444', fontWeight: 700 }}>
                              {fmtVND(tour.sale_price || Math.round(tour.price_adult * (100 - tour.sale_percent) / 100))}
                            </div>
                            <div style={{ textDecoration: 'line-through', fontSize: '0.72rem', color: '#94a3b8' }}>
                              {fmtVND(tour.price_adult)}
                            </div>
                            <span style={{ fontSize: '0.68rem', background: '#fee2e2', color: '#dc2626', padding: '1px 5px', borderRadius: 4, fontWeight: 700, display: 'inline-block' }}>
                              ⚡ -{tour.sale_percent}%
                            </span>
                          </div>
                        ) : (
                          fmtVND(tour.price_adult)
                        )}
                      </td>
                      
                      {/* Cột Tiến độ đoàn & Khách đặt */}
                      <td
                        className="atp-progress-cell"
                        onClick={() => setManifestTourId(tour.id)}
                        title="Bấm để xem chi tiết khách đặt & báo Sale nếu thiếu"
                      >
                        <div className="atp-progress-top">
                          <span className="atp-progress-count">
                            {tour.current_booked_guests || 0} / {tour.target_participants || 20} khách
                          </span>
                          <span className="atp-progress-percent">{tour.fill_rate || 0}%</span>
                        </div>
                        <div className="atp-progress-track">
                          <div
                            className={`atp-progress-fill ${tour.has_shortage ? 'shortage' : 'ready'}`}
                            style={{ width: `${tour.fill_rate || 0}%` }}
                          />
                        </div>
                        <div>
                          {tour.has_shortage ? (
                            <span className="atp-shortage-badge">
                              ⚠️ Thiếu {tour.remaining_needed}
                            </span>
                          ) : (
                            <span className="atp-ready-badge">
                              ✅ Đủ đoàn
                            </span>
                          )}
                        </div>
                      </td>

                      <td className="atp-td-rating">
                        ⭐ {Number(tour.rating).toFixed(1)}
                        <span>({tour.review_count})</span>
                      </td>
                      <td>
                        <button
                          className={`atp-toggle-btn ${tour.is_active ? 'active' : 'inactive'}`}
                          onClick={() => handleToggleActive(tour)}
                          title={tour.is_active ? 'Nhấn để ẩn tour' : 'Nhấn để hiện tour'}
                        >
                          {tour.is_active ? '✅ Hiển thị' : '🔒 Đã ẩn'}
                        </button>
                      </td>
                      <td>
                        <div className="atp-flags">
                          <button
                            className={`atp-flag-btn ${tour.is_featured ? 'on' : ''}`}
                            onClick={() => handleToggleFeatured(tour)}
                            title="Nổi bật trang chủ"
                          >⭐</button>
                          <span className={`atp-flag-tag ${tour.is_hot ? 'on' : ''}`}
                            title="Tour Hot">
                            🔥
                          </span>
                          <button
                            type="button"
                            className={`atp-flag-btn ${tour.is_priority_sale ? 'atp-flag-priority-sale' : 'atp-flag-priority-off'}`}
                            onClick={() => handleTogglePriority(tour)}
                            title={tour.is_priority_sale ? "Đang gắn cờ ưu tiên Sale! Bấm để gỡ cờ" : "Bấm để gắn cờ đẩy Sale gấp cho tour này"}
                          >
                            🚨
                          </button>
                        </div>
                      </td>
                      <td>
                        <div className="atp-action-cell">
                          <button
                            className="atp-action-btn atp-btn-manifest"
                            onClick={() => setManifestTourId(tour.id)}
                            title="Xem tiến độ đoàn & danh sách khách đặt (Báo Sale)"
                          >👥</button>
                          <button
                            className="atp-action-btn atp-edit"
                            onClick={() => setFormModal(tour)}
                            title="Sửa tour"
                          >✏️</button>
                          {isAdmin && (
                            <button
                              className="atp-action-btn atp-delete"
                              onClick={() => setDeleteTarget(tour)}
                              title="Xoá tour"
                            >🗑️</button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          <div className="atp-pagination-bar">
            <span className="atp-pagination-info">
              Hiển thị <strong>{tours.length}</strong> / <strong>{totalCount}</strong> tour
              {totalPages > 1 && ` (Trang ${page}/${totalPages})`}
            </span>

            {totalPages > 1 && (
              <div className="atp-pagination-btns">
                <button
                  className="atp-page-btn"
                  onClick={() => setPage(1)}
                  disabled={page === 1}
                  title="Trang đầu"
                >«</button>
                <button
                  className="atp-page-btn"
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                  disabled={page === 1}
                >‹ Trước</button>

                {/* Số trang */}
                {Array.from({ length: totalPages }, (_, i) => i + 1)
                  .filter((p) => p === 1 || p === totalPages || Math.abs(p - page) <= 2)
                  .reduce((acc, p, idx, arr) => {
                    if (idx > 0 && p - arr[idx - 1] > 1) acc.push('...');
                    acc.push(p);
                    return acc;
                  }, [])
                  .map((p, i) =>
                    p === '...'
                      ? <span key={`ellipsis-${i}`} className="atp-page-ellipsis">…</span>
                      : <button
                          key={p}
                          className={`atp-page-btn atp-page-num ${page === p ? 'active' : ''}`}
                          onClick={() => setPage(p)}
                        >{p}</button>
                  )
                }

                <button
                  className="atp-page-btn"
                  onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                  disabled={page === totalPages}
                >Sau ›</button>
                <button
                  className="atp-page-btn"
                  onClick={() => setPage(totalPages)}
                  disabled={page === totalPages}
                  title="Trang cuối"
                >»</button>
              </div>
            )}
          </div>
        </>
      )}

      {/* ── Modals ────────────────────────────────────── */}
      {formModal && (
        <TourFormModal
          tour={formModal === 'add' ? null : formModal}
          categories={categories}
          destinations={destinations}
          guides={guides}
          isAdmin={isAdmin}
          currentUser={currentUser}
          onClose={() => setFormModal(null)}
          onSaved={handleSaved}
        />
      )}

      {deleteTarget && (
        <ConfirmModal
          tourName={deleteTarget.name}
          loading={actionLoading}
          onConfirm={handleDelete}
          onCancel={() => setDeleteTarget(null)}
        />
      )}

      {/* ── Modal Tiến độ đoàn & Danh sách khách (Báo Sale) ── */}
      {manifestTourId && (
        <TourManifestModal
          tourId={manifestTourId}
          isAdmin={isAdmin}
          onClose={() => setManifestTourId(null)}
          onShowToast={showToast}
          onAlertSent={() => {
            fetchTours();
            fetchGuideStats();
          }}
        />
      )}
    </AdminLayout>
  );
}

export default AdminToursPage;

import { useState, useEffect, useCallback } from 'react';
import AdminLayout from '../../components/admin/AdminLayout';
import { adminTourAPI, categoryAPI, destinationAPI } from '../../api/services';
import './AdminToursPage.css';

/* ─── Helpers ──────────────────────────────────────────── */
const fmtVND = (num) =>
  new Intl.NumberFormat('vi-VN').format(Number(num)) + ' ₫';

const EMPTY_FORM = {
  name:        '',
  category:    '',
  destination: '',
  price_adult: '',
  thumbnail:   '',
  promo:       '',
  booked_count:'0',
  tags:        '',        // chuỗi phân cách bằng dấu phẩy
  is_hot:      false,
  is_featured: false,
  is_active:   true,
};

/* ─── Modal Thêm/Sửa Tour ──────────────────────────────── */
function TourFormModal({ tour, categories, destinations, onClose, onSaved }) {
  const isEdit = !!tour;
  const [form, setForm]       = useState(
    isEdit
      ? {
          ...tour,
          tags: Array.isArray(tour.tags) ? tour.tags.join(', ') : '',
        }
      : { ...EMPTY_FORM }
  );
  const [loading, setLoading] = useState(false);
  const [error, setError]     = useState('');

  const set = (k, v) => setForm((f) => ({ ...f, [k]: v }));

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
        tags: form.tags
          ? form.tags.split(',').map((t) => t.trim()).filter(Boolean)
          : [],
      };
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
  const [tours, setTours]             = useState([]);
  const [categories, setCategories]   = useState([]);
  const [destinations, setDestinations] = useState([]);
  const [loading, setLoading]         = useState(true);
  const [error, setError]             = useState('');
  const [search, setSearch]           = useState('');
  const [filterActive, setFilterActive] = useState(''); // '' | 'true' | 'false'
  const [page, setPage]               = useState(1);
  const [totalCount, setTotalCount]   = useState(0);
  const PAGE_SIZE = 24;
  const totalPages = Math.ceil(totalCount / PAGE_SIZE);
  const [formModal, setFormModal]     = useState(null); // null | 'add' | tour object
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [actionLoading, setActionLoading] = useState(false);
  const [toast, setToast]             = useState('');

  const showToast = (msg) => { setToast(msg); setTimeout(() => setToast(''), 3000); };

  /* ── Fetch tour list ──────────────────────────────────── */
  const fetchTours = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const params = { page };
      if (search)       params.search    = search;
      if (filterActive) params.is_active = filterActive;
      const res = await adminTourAPI.getAll(params);
      // API trả về { count, next, previous, results } khi có pagination
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
  }, [search, filterActive, page]);

  /* ── Fetch categories & destinations (1 lần) ────────── */
  useEffect(() => {
    Promise.all([categoryAPI.getAll(), destinationAPI.getAll()]).then(([cRes, dRes]) => {
      setCategories(cRes.data.results ?? cRes.data);
      setDestinations(dRes.data.results ?? dRes.data);
    });
  }, []);

  // Reset về trang 1 khi đổi search/filter
  useEffect(() => { setPage(1); }, [search, filterActive]);

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

  /* ── Delete ────────────────────────────────────────── */
  const handleDelete = async () => {
    if (!deleteTarget) return;
    setActionLoading(true);
    try {
      await adminTourAPI.delete(deleteTarget.id);
      showToast('✅ Đã xoá tour thành công!');
      setDeleteTarget(null);
      fetchTours();
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
  };

  return (
    <AdminLayout title="🗺️ Quản lý Tour">

      {/* Toast */}
      {toast && <div className="atp-toast">{toast}</div>}

      {/* ── Toolbar ──────────────────────────────────── */}
      <div className="atp-toolbar">
        <div className="atp-search-wrap">
          <span className="atp-search-icon">🔍</span>
          <input
            className="atp-search"
            placeholder="Tìm theo tên tour, điểm đến, danh mục..."
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
                  <th>Giá từ</th>
                  <th>Đánh giá</th>
                  <th>Trạng thái</th>
                  <th>Cờ</th>
                  <th>Hành động</th>
                </tr>
              </thead>
              <tbody>
                {tours.length === 0 ? (
                  <tr>
                    <td colSpan={10} className="atp-empty">
                      <div className="atp-empty-icon">🗺️</div>
                      <div>Không tìm thấy tour nào</div>
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
                      <td className="atp-td-name" title={tour.name}>{tour.name}</td>
                      <td className="atp-td-meta">{tour.category_name || '—'}</td>
                      <td className="atp-td-meta">{tour.destination_name || '—'}</td>
                      <td className="atp-td-price">{fmtVND(tour.price_adult)}</td>
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
                        </div>
                      </td>
                      <td>
                        <div className="atp-action-cell">
                          <button
                            className="atp-action-btn atp-edit"
                            onClick={() => setFormModal(tour)}
                            title="Sửa tour"
                          >✏️</button>
                          <button
                            className="atp-action-btn atp-delete"
                            onClick={() => setDeleteTarget(tour)}
                            title="Xoá tour"
                          >🗑️</button>
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
    </AdminLayout>
  );
}

export default AdminToursPage;

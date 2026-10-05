import { useState, useEffect } from 'react';
import {
  AreaChart, Area,
  BarChart, Bar,
  PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, Legend,
  ResponsiveContainer,
} from 'recharts';
import AdminLayout from '../../components/admin/AdminLayout';
import { statsAPI } from '../../api/services';
import './DashboardPage.css';

/* ─── Màu biểu đồ ──────────────────────────────────────── */
const STATUS_COLORS = {
  pending:   '#f59e0b',
  confirmed: '#6366f1',
  completed: '#10b981',
  cancelled: '#ef4444',
};

const PIE_LABELS = {
  pending:   'Chờ xác nhận',
  confirmed: 'Đã xác nhận',
  completed: 'Hoàn thành',
  cancelled: 'Đã huỷ',
};

/* ─── Format số tiền VNĐ ──────────────────────────────── */
const fmtVND = (num) => {
  if (num >= 1_000_000_000) return `${(num / 1_000_000_000).toFixed(1)} tỷ`;
  if (num >= 1_000_000)     return `${(num / 1_000_000).toFixed(1)} tr`;
  return new Intl.NumberFormat('vi-VN').format(num);
};

/* ─── Tooltip tuỳ chỉnh cho biểu đồ doanh thu ─────────── */
const RevenueTooltip = ({ active, payload, label }) => {
  if (active && payload && payload.length) {
    return (
      <div className="db-tooltip">
        <div className="db-tooltip-label">{label}</div>
        {payload.map((p, i) => (
          <div key={i} className="db-tooltip-row" style={{ color: p.color }}>
            <span>{p.name}:</span>
            <strong>
              {p.dataKey === 'revenue'
                ? `${fmtVND(p.value)} ₫`
                : `${p.value} đơn`}
            </strong>
          </div>
        ))}
      </div>
    );
  }
  return null;
};

/* ─── StatCard ─────────────────────────────────────────── */
function StatCard({ icon, label, value, sub, color, trend }) {
  return (
    <div className="db-stat-card" style={{ '--card-accent': color }}>
      <div className="db-stat-icon">{icon}</div>
      <div className="db-stat-body">
        <div className="db-stat-label">{label}</div>
        <div className="db-stat-value">{value}</div>
        {sub && <div className="db-stat-sub">{sub}</div>}
      </div>
      {trend !== undefined && (
        <div className={`db-stat-trend ${trend >= 0 ? 'up' : 'down'}`}>
          {trend >= 0 ? '▲' : '▼'} {Math.abs(trend)}%
        </div>
      )}
    </div>
  );
}

/* ─── Main Component ────────────────────────────────────── */
function DashboardPage() {
  const [stats, setStats]     = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError]     = useState('');

  useEffect(() => {
    (async () => {
      try {
        const res = await statsAPI.getDashboard();
        setStats(res.data);
      } catch (err) {
        console.error(err);
        setError('Không thể tải dữ liệu thống kê. Vui lòng thử lại.');
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  /* ── Chuẩn bị dữ liệu PieChart ──────────────────────── */
  const pieData = stats
    ? Object.entries(stats.status_distribution)
        .filter(([, v]) => v > 0)
        .map(([key, value]) => ({
          name:  PIE_LABELS[key] || key,
          value,
          color: STATUS_COLORS[key],
        }))
    : [];

  return (
    <AdminLayout title="📊 Tổng quan Dashboard">
      {loading && (
        <div className="db-loading">
          <div className="db-spinner" />
          <p>Đang tải dữ liệu thống kê...</p>
        </div>
      )}

      {error && (
        <div className="db-error">
          <span>⚠️</span> {error}
        </div>
      )}

      {stats && !loading && (
        <>
          {/* ── Stat Cards ─────────────────────────────── */}
          <div className="db-stats-grid">
            <StatCard
              icon="📋"
              label="Tổng đơn đặt"
              value={stats.overview.total_bookings.toLocaleString('vi-VN')}
              sub={`+${stats.overview.bookings_this_month} đơn tháng này`}
              color="#6366f1"
            />
            <StatCard
              icon="💰"
              label="Tổng doanh thu"
              value={`${fmtVND(stats.overview.total_revenue)} ₫`}
              sub={`Tháng này: ${fmtVND(stats.overview.revenue_this_month)} ₫`}
              color="#10b981"
            />
            <StatCard
              icon="🗺️"
              label="Tour đang mở"
              value={stats.overview.total_tours.toLocaleString('vi-VN')}
              color="#f59e0b"
            />
            <StatCard
              icon="👥"
              label="Khách hàng"
              value={stats.overview.total_customers.toLocaleString('vi-VN')}
              color="#ec4899"
            />
          </div>

          {/* ── Charts Row ─────────────────────────────── */}
          <div className="db-charts-row">
            {/* Doanh thu theo tháng */}
            <div className="db-chart-card db-chart-large">
              <div className="db-chart-header">
                <h3>📈 Doanh thu theo tháng</h3>
                <span className="db-chart-sub">12 tháng gần nhất</span>
              </div>
              {stats.monthly_revenue.length > 0 ? (
                <ResponsiveContainer width="100%" height={280}>
                  <AreaChart data={stats.monthly_revenue} margin={{ top: 10, right: 20, left: 10, bottom: 0 }}>
                    <defs>
                      <linearGradient id="revenueGrad" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%"  stopColor="#6366f1" stopOpacity={0.3} />
                        <stop offset="95%" stopColor="#6366f1" stopOpacity={0}   />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="#f0f4f8" />
                    <XAxis dataKey="month" tick={{ fontSize: 11, fill: '#64748b' }} />
                    <YAxis
                      tick={{ fontSize: 11, fill: '#64748b' }}
                      tickFormatter={(v) => fmtVND(v)}
                    />
                    <Tooltip content={<RevenueTooltip />} />
                    <Area
                      type="monotone"
                      dataKey="revenue"
                      name="Doanh thu"
                      stroke="#6366f1"
                      strokeWidth={2.5}
                      fill="url(#revenueGrad)"
                    />
                  </AreaChart>
                </ResponsiveContainer>
              ) : (
                <div className="db-chart-empty">Chưa có dữ liệu doanh thu</div>
              )}
            </div>

            {/* Phân bổ trạng thái đơn */}
            <div className="db-chart-card db-chart-small">
              <div className="db-chart-header">
                <h3>🍩 Trạng thái đơn</h3>
              </div>
              {pieData.length > 0 ? (
                <>
                  <ResponsiveContainer width="100%" height={200}>
                    <PieChart>
                      <Pie
                        data={pieData}
                        cx="50%"
                        cy="50%"
                        innerRadius={55}
                        outerRadius={85}
                        paddingAngle={3}
                        dataKey="value"
                      >
                        {pieData.map((entry, i) => (
                          <Cell key={i} fill={entry.color} />
                        ))}
                      </Pie>
                      <Tooltip formatter={(v, n) => [`${v} đơn`, n]} />
                    </PieChart>
                  </ResponsiveContainer>
                  <div className="db-pie-legend">
                    {pieData.map((item, i) => (
                      <div key={i} className="db-pie-legend-item">
                        <span className="db-pie-dot" style={{ background: item.color }} />
                        <span className="db-pie-name">{item.name}</span>
                        <strong>{item.value}</strong>
                      </div>
                    ))}
                  </div>
                </>
              ) : (
                <div className="db-chart-empty">Chưa có dữ liệu</div>
              )}
            </div>
          </div>

          {/* ── Đơn theo tháng (Bar) + Top Tours ──────── */}
          <div className="db-charts-row">
            {/* Số đơn theo tháng */}
            <div className="db-chart-card db-chart-medium">
              <div className="db-chart-header">
                <h3>📦 Số đơn đặt theo tháng</h3>
              </div>
              {stats.monthly_revenue.length > 0 ? (
                <ResponsiveContainer width="100%" height={220}>
                  <BarChart data={stats.monthly_revenue} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#f0f4f8" />
                    <XAxis dataKey="month" tick={{ fontSize: 11, fill: '#64748b' }} />
                    <YAxis tick={{ fontSize: 11, fill: '#64748b' }} allowDecimals={false} />
                    <Tooltip formatter={(v) => [`${v} đơn`, 'Số đơn']} />
                    <Bar dataKey="bookings" name="Số đơn" fill="#6366f1" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              ) : (
                <div className="db-chart-empty">Chưa có dữ liệu</div>
              )}
            </div>

            {/* Top 5 tour */}
            <div className="db-chart-card db-chart-medium">
              <div className="db-chart-header">
                <h3>🏆 Top tour được đặt nhiều nhất</h3>
              </div>
              {stats.top_tours.length > 0 ? (
                <div className="db-top-tours">
                  {stats.top_tours.map((tour, i) => (
                    <div key={tour.id} className="db-top-tour-row">
                      <div className="db-top-tour-rank">#{i + 1}</div>
                      <img
                        className="db-top-tour-thumb"
                        src={tour.thumbnail}
                        alt={tour.name}
                        onError={(e) => { e.target.style.display = 'none'; }}
                      />
                      <div className="db-top-tour-info">
                        <div className="db-top-tour-name">{tour.name}</div>
                        <div className="db-top-tour-meta">
                          {tour.total_bookings} đơn · {fmtVND(tour.total_revenue)} ₫
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="db-chart-empty">Chưa có dữ liệu</div>
              )}
            </div>
          </div>

          {/* ── Đơn mới nhất ───────────────────────────── */}
          <div className="db-chart-card db-recent">
            <div className="db-chart-header">
              <h3>🕒 Đơn đặt mới nhất</h3>
              <a href="/admin/bookings" className="db-view-all">Xem tất cả →</a>
            </div>
            <div className="db-recent-table-wrap">
              <table className="db-recent-table">
                <thead>
                  <tr>
                    <th>#</th>
                    <th>Khách hàng</th>
                    <th>Tour</th>
                    <th>Ngày đi</th>
                    <th>Tổng tiền</th>
                    <th>Trạng thái</th>
                  </tr>
                </thead>
                <tbody>
                  {stats.recent_bookings.map((b) => (
                    <tr key={b.id}>
                      <td className="db-table-id">#{b.id}</td>
                      <td>
                        <div className="db-table-customer">
                          <strong>{b.contact_name}</strong>
                          <span>{b.contact_phone}</span>
                        </div>
                      </td>
                      <td className="db-table-tour">{b.tour_title}</td>
                      <td>{new Date(b.travel_date).toLocaleDateString('vi-VN')}</td>
                      <td className="db-table-price">
                        {Number(b.total_price).toLocaleString('vi-VN')} ₫
                      </td>
                      <td>
                        <span className={`db-status-badge db-status-${b.status}`}>
                          {b.status_display}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}
    </AdminLayout>
  );
}

export default DashboardPage;

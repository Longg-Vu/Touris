import { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { favoriteAPI } from '../api/services';
import { useAuth } from './AuthContext';

const FavoritesContext = createContext(null);

const GUEST_STORAGE_KEY = 'tourism_tour_favorites_guest';
const LEGACY_KEYS = ['tourism_tour_favorites', 'klook_tour_favorites'];

function getStorageKey(userId) {
  if (userId) {
    return `tourism_tour_favorites_u${userId}`;
  }
  return GUEST_STORAGE_KEY;
}

function getStoredFavorites(userId) {
  try {
    const key = getStorageKey(userId);
    const raw = localStorage.getItem(key);
    if (raw) {
      const parsed = JSON.parse(raw);
      return Array.isArray(parsed) ? parsed.map(Number).filter(Boolean) : [];
    }
  } catch (err) {
    console.warn('Lỗi đọc favorites từ localStorage:', err);
  }
  return [];
}

function saveStoredFavorites(userId, ids) {
  try {
    const key = getStorageKey(userId);
    localStorage.setItem(key, JSON.stringify(ids));
  } catch (err) {
    console.warn('Lỗi lưu favorites vào localStorage:', err);
  }
}

export function FavoritesProvider({ children }) {
  const { user, isAuthenticated, loading: authLoading } = useAuth();
  const currentUserId = isAuthenticated && user?.id ? user.id : null;

  const [favoriteIds, setFavoriteIds] = useState(() => getStoredFavorites(currentUserId));
  const [loading, setLoading] = useState(false);

  // Dọn dẹp các key dùng chung cũ để tránh rò rỉ dữ liệu giữa các tài khoản
  useEffect(() => {
    try {
      LEGACY_KEYS.forEach((k) => localStorage.removeItem(k));
    } catch {
      // ignore
    }
  }, []);

  // Tải đúng danh sách yêu thích từ Database của tài khoản đang đăng nhập
  // Hoặc chuyển về danh sách riêng của khách vãng lai khi đăng xuất
  const syncWithServer = useCallback(async () => {
    if (authLoading) return;

    if (!currentUserId) {
      // Chế độ khách vãng lai: chỉ đọc từ key guest độc lập
      setFavoriteIds(getStoredFavorites(null));
      return;
    }

    // Chế độ đã đăng nhập: nạp tạm từ cache riêng của user.id, sau đó lấy chuẩn từ Database
    setFavoriteIds(getStoredFavorites(currentUserId));
    try {
      setLoading(true);
      const res = await favoriteAPI.getIds();
      const serverIds = (res.data.favorite_ids || []).map(Number).filter(Boolean);
      setFavoriteIds(serverIds);
      saveStoredFavorites(currentUserId, serverIds);
    } catch (err) {
      console.warn('Không thể tải favorites từ server:', err);
    } finally {
      setLoading(false);
    }
  }, [authLoading, currentUserId]);

  useEffect(() => {
    syncWithServer();
  }, [syncWithServer]);

  // Kiểm tra tour có nằm trong danh sách yêu thích không
  const isFavorite = useCallback((tourId) => {
    if (!tourId) return false;
    return favoriteIds.includes(Number(tourId));
  }, [favoriteIds]);

  // Thêm hoặc bớt tour khỏi danh sách
  const toggleFavorite = useCallback(async (tourId, e) => {
    if (e && e.preventDefault) {
      e.preventDefault();
      e.stopPropagation();
    }
    const idNum = Number(tourId);
    if (!idNum) return;

    // Optimistic UI update: cập nhật state & localStorage của đúng user/guest hiện tại
    setFavoriteIds((prev) => {
      const exists = prev.includes(idNum);
      const next = exists ? prev.filter(id => id !== idNum) : [...prev, idNum];
      saveStoredFavorites(currentUserId, next);
      return next;
    });

    // Nếu đã đăng nhập, gọi API để lưu vào database của tài khoản đó
    if (currentUserId) {
      try {
        const res = await favoriteAPI.toggle(idNum);
        if (typeof res.data?.is_favorite === 'boolean') {
          setFavoriteIds((prev) => {
            const has = prev.includes(idNum);
            let next = prev;
            if (res.data.is_favorite && !has) next = [...prev, idNum];
            if (!res.data.is_favorite && has) next = prev.filter(id => id !== idNum);
            saveStoredFavorites(currentUserId, next);
            return next;
          });
        }
      } catch (err) {
        console.warn('Lỗi gọi API toggle favorite:', err);
      }
    }
  }, [currentUserId]);

  // Xóa 1 tour khỏi danh sách
  const removeFavorite = useCallback(async (tourId, e) => {
    if (e && e.preventDefault) {
      e.preventDefault();
      e.stopPropagation();
    }
    const idNum = Number(tourId);
    if (!idNum) return;

    const wasInList = favoriteIds.includes(idNum);

    setFavoriteIds((prev) => {
      const next = prev.filter(id => id !== idNum);
      saveStoredFavorites(currentUserId, next);
      return next;
    });

    if (currentUserId && wasInList) {
      try {
        await favoriteAPI.toggle(idNum);
      } catch (err) {
        console.warn('Lỗi xóa favorite trên server:', err);
      }
    }
  }, [currentUserId, favoriteIds]);

  // Xóa tất cả tour yêu thích của tài khoản hiện tại (hoặc của khách vãng lai)
  const clearAllFavorites = useCallback(async () => {
    setFavoriteIds([]);
    saveStoredFavorites(currentUserId, []);
    if (currentUserId) {
      try {
        await favoriteAPI.clear();
      } catch (err) {
        console.warn('Lỗi xóa tất cả favorites trên server:', err);
      }
    }
  }, [currentUserId]);

  return (
    <FavoritesContext.Provider
      value={{
        favoriteIds,
        favoritesCount: favoriteIds.length,
        loading,
        isFavorite,
        toggleFavorite,
        removeFavorite,
        clearAllFavorites,
        syncWithServer,
      }}
    >
      {children}
    </FavoritesContext.Provider>
  );
}

export function useFavorites() {
  const context = useContext(FavoritesContext);
  if (!context) {
    throw new Error('useFavorites must be used within a FavoritesProvider');
  }
  return context;
}


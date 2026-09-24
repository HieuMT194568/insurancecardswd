import { useCallback, useEffect, useRef, useState } from 'react';
import { errorMessage } from '../utils/errors';

/**
 * Quản lý danh sách phân trang + bộ lọc.
 * fetcher(params) -> Promise<PageResponse>; đổi bộ lọc sẽ quay về trang đầu.
 */
export function usePaged(fetcher, initialFilters = {}, size = 10) {
  const fetcherRef = useRef(fetcher);
  fetcherRef.current = fetcher;
  const [filters, setFilters] = useState(initialFilters);
  const [page, setPage] = useState(0);
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetcherRef.current({ ...filters, page, size });
      // Trang hiện tại bị trống sau khi xoá bản ghi cuối -> lùi 1 trang
      if (res.content.length === 0 && page > 0) {
        setPage(page - 1);
        return;
      }
      setData(res);
    } catch (e) {
      setError(errorMessage(e));
    } finally {
      setLoading(false);
    }
  }, [filters, page, size]);

  useEffect(() => { load(); }, [load]);

  const setFilter = useCallback((key, value) => {
    setFilters((f) => ({ ...f, [key]: value }));
    setPage(0);
  }, []);

  return { data, loading, error, page, setPage, filters, setFilter, reload: load };
}

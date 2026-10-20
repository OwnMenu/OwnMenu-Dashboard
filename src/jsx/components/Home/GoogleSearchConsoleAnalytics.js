import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Line } from "react-chartjs-2";
import { useTranslation } from "react-i18next";
import { useSelector } from "react-redux";
import { toast } from "react-toastify";
import { getToken } from "../../../store/utlits";
import { formatNumber } from "./dashboardAnalyticsUtils";

/**
 * Google Search Console 搜索表现数据看板组件
 * 支持 OAuth 弹窗授权、自动验证站点与提交 Sitemap、核心搜索指标趋势图、热门搜索词与受访页面排行
 */
export default function GoogleSearchConsoleAnalytics() {
  const { t } = useTranslation();
  const restaurant = useSelector((state) => state.restaurant.restaurant);
  const restaurantId = restaurant?.id;

  const [statusData, setStatusData] = useState(null);
  const [statusLoading, setStatusLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const [connecting, setConnecting] = useState(false);

  const [preset, setPreset] = useState("28d");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [analytics, setAnalytics] = useState(null);
  const [analyticsLoading, setAnalyticsLoading] = useState(false);
  const [error, setError] = useState(null);

  const popupTimerRef = useRef(null);

  /**
   * 拉取当前餐厅的 Google Search Console 绑定与验证状态
   */
  const fetchStatus = useCallback(async () => {
    if (!restaurantId) return null;
    setStatusLoading(true);
    try {
      const token = getToken();
      const res = await fetch("/api/google-search-console/status", {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      if (res.ok) {
        setStatusData(data);
        return data;
      }
      setError(data.error || t("dashboard.gsc.failed_fetch_status"));
      return null;
    } catch {
      setError(t("dashboard.gsc.failed_fetch_status"));
      return null;
    } finally {
      setStatusLoading(false);
    }
  }, [restaurantId, t]);

  /**
   * 拉取指定时间范围的搜索表现数据
   */
  const fetchAnalyticsData = useCallback(
    async ({
      targetPreset = preset,
      customStart = startDate,
      customEnd = endDate,
      forceRefresh = false,
    } = {}) => {
      if (!restaurantId) return;
      setAnalyticsLoading(true);
      setError(null);
      try {
        const token = getToken();
        const params = new URLSearchParams();
        params.set("preset", targetPreset);
        if (targetPreset === "custom" && customStart && customEnd) {
          params.set("startDate", customStart);
          params.set("endDate", customEnd);
        }
        if (forceRefresh) {
          params.set("refresh", "1");
        }

        const res = await fetch(`/api/google-search-console/analytics?${params.toString()}`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        const data = await res.json();
        if (!res.ok) {
          setError(data.error || t("dashboard.gsc.failed_fetch_analytics"));
          return;
        }
        setAnalytics(data);
        if (data.period?.startDate && data.period?.endDate) {
          setStartDate(data.period.startDate);
          setEndDate(data.period.endDate);
        }
      } catch {
        setError(t("dashboard.gsc.failed_fetch_analytics"));
      } finally {
        setAnalyticsLoading(false);
      }
    },
    [restaurantId, preset, startDate, endDate, t]
  );

  useEffect(() => {
    fetchStatus();
  }, [fetchStatus]);

  useEffect(() => {
    if (statusData?.connected) {
      fetchAnalyticsData({ targetPreset: preset });
    }
  }, [statusData?.connected]); // eslint-disable-line react-hooks/exhaustive-deps

  /**
   * 监听 OAuth 授权弹窗的 postMessage 回调
   */
  useEffect(() => {
    const handleMessage = (event) => {
      const payload = event?.data;
      if (!payload || payload.source !== "ownmenu-gsc-oauth") return;
      if (popupTimerRef.current) {
        clearInterval(popupTimerRef.current);
        popupTimerRef.current = null;
      }
      setConnecting(false);
      if (payload.status === "connected") {
        toast.success(t("dashboard.gsc.connected_toast"));
        fetchStatus();
      } else {
        toast.error(payload.error || t("dashboard.gsc.connect_failed"));
      }
    };

    window.addEventListener("message", handleMessage);
    return () => {
      window.removeEventListener("message", handleMessage);
      if (popupTimerRef.current) {
        clearInterval(popupTimerRef.current);
      }
    };
  }, [fetchStatus, t]);

  /**
   * 发起 OAuth 弹窗连接
   */
  const handleConnect = async () => {
    setConnecting(true);
    try {
      const token = getToken();
      const res = await fetch("/api/google-search-console/connect?popup=1", {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      if (!res.ok || !data.authUrl) {
        setConnecting(false);
        toast.error(data.error || t("dashboard.gsc.connect_failed"));
        return;
      }

      const width = 560;
      const height = 680;
      const left = window.screenX + (window.outerWidth - width) / 2;
      const top = window.screenY + (window.outerHeight - height) / 2;
      const popup = window.open(
        data.authUrl,
        "ownmenu_gsc_oauth",
        `width=${width},height=${height},left=${left},top=${top},resizable=yes,scrollbars=yes`
      );

      if (!popup) {
        window.location.href = data.authUrl;
        return;
      }

      if (popupTimerRef.current) clearInterval(popupTimerRef.current);
      popupTimerRef.current = setInterval(() => {
        if (popup.closed) {
          clearInterval(popupTimerRef.current);
          popupTimerRef.current = null;
          setConnecting(false);
          fetchStatus();
        }
      }, 1000);
    } catch {
      setConnecting(false);
      toast.error(t("dashboard.gsc.connect_failed"));
    }
  };

  /**
   * 一键执行站点自动验证与 Sitemap 提交
   */
  const handleVerifyAndSync = async () => {
    setSyncing(true);
    try {
      const token = getToken();
      const res = await fetch("/api/google-search-console/verify-and-sync", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ siteUrl: statusData?.siteUrl }),
      });
      const data = await res.json();
      if (!res.ok) {
        toast.error(data.error || t("dashboard.gsc.verify_sync_failed"));
        return;
      }
      if (data.verified) {
        toast.success(t("dashboard.gsc.verify_sync_success"));
      } else {
        toast.warning(
          data.lastVerificationError ||
            data.verificationError ||
            t("dashboard.gsc.verify_pending_hint")
        );
      }
      await fetchStatus();
      fetchAnalyticsData({ targetPreset: preset, forceRefresh: true });
    } catch {
      toast.error(t("dashboard.gsc.verify_sync_failed"));
    } finally {
      setSyncing(false);
    }
  };

  /**
   * 切换当前监控的 Search Console 站点属性 URL
   */
  const handleSelectSite = async (nextSiteUrl) => {
    if (!nextSiteUrl || nextSiteUrl === statusData?.siteUrl) return;
    setSyncing(true);
    try {
      const token = getToken();
      const res = await fetch("/api/google-search-console/select-site", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ siteUrl: nextSiteUrl, autoSync: true }),
      });
      if (res.ok) {
        await fetchStatus();
        fetchAnalyticsData({ targetPreset: preset, forceRefresh: true });
      }
    } catch {
      toast.error(t("dashboard.gsc.verify_sync_failed"));
    } finally {
      setSyncing(false);
    }
  };

  /**
   * 解除 Google Search Console 绑定
   */
  const handleDisconnect = async () => {
    if (!window.confirm(t("dashboard.gsc.disconnect_confirm"))) return;
    try {
      const token = getToken();
      const res = await fetch("/api/google-search-console/unbind", {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        toast.info(t("dashboard.gsc.disconnected_toast"));
        setAnalytics(null);
        fetchStatus();
      }
    } catch {
      toast.error(t("dashboard.gsc.disconnect_failed"));
    }
  };

  const handlePresetClick = (nextPreset) => {
    setPreset(nextPreset);
    fetchAnalyticsData({ targetPreset: nextPreset });
  };

  const handleCustomSubmit = (e) => {
    e.preventDefault();
    if (!startDate || !endDate) return;
    setPreset("custom");
    fetchAnalyticsData({
      targetPreset: "custom",
      customStart: startDate,
      customEnd: endDate,
    });
  };

  const chartData = useMemo(() => {
    const series = analytics?.dailySeries || [];
    const labels = series.map((item) => item.date.slice(5));
    const clicksData = series.map((item) => item.clicks || 0);
    const impressionsData = series.map((item) => item.impressions || 0);

    return {
      labels,
      datasets: [
        {
          label: t("dashboard.gsc.clicks"),
          data: clicksData,
          borderColor: "#2563eb",
          backgroundColor: "rgba(37, 99, 235, 0.08)",
          tension: 0.35,
          fill: true,
          pointRadius: 3,
          borderWidth: 2.5,
          yAxisID: "y",
        },
        {
          label: t("dashboard.gsc.impressions"),
          data: impressionsData,
          borderColor: "#7c3aed",
          backgroundColor: "rgba(124, 58, 237, 0.06)",
          tension: 0.35,
          fill: true,
          pointRadius: 3,
          borderWidth: 2.5,
          yAxisID: "y1",
        },
      ],
    };
  }, [analytics, t]);

  const chartOptions = useMemo(
    () => ({
      responsive: true,
      maintainAspectRatio: false,
      interaction: { mode: "index", intersect: false },
      plugins: { legend: { position: "top" } },
      scales: {
        y: {
          type: "linear",
          display: true,
          position: "left",
          beginAtZero: true,
          title: { display: true, text: t("dashboard.gsc.clicks") },
        },
        y1: {
          type: "linear",
          display: true,
          position: "right",
          beginAtZero: true,
          grid: { drawOnChartArea: false },
          title: { display: true, text: t("dashboard.gsc.impressions") },
        },
      },
    }),
    [t]
  );

  const siteOptions = useMemo(() => {
    const map = new Map();
    if (statusData?.siteUrl) {
      map.set(statusData.siteUrl, {
        siteUrl: statusData.siteUrl,
        permissionLevel: statusData.verified ? "siteOwner" : "siteUnverifiedUser",
      });
    }
    (statusData?.availableSites || []).forEach((s) => {
      if (s?.siteUrl) {
        map.set(s.siteUrl, s);
      }
    });
    (statusData?.candidateSites || []).forEach((url) => {
      if (url && !map.has(url)) {
        map.set(url, { siteUrl: url, permissionLevel: "candidate" });
      }
    });
    return Array.from(map.values());
  }, [statusData]);

  if (statusLoading) {
    return (
      <div className="vd-loading">
        <span className="spinner-border spinner-border-sm text-primary" role="status" aria-hidden="true" />
        {t("dashboard.loading_analytics")}
      </div>
    );
  }

  if (!statusData?.connected) {
    return (
      <div className="vd-empty-connect">
        <h2>{t("dashboard.gsc.not_connected_title")}</h2>
        <p>{t("dashboard.gsc.not_connected_desc")}</p>
        {statusData?.resolvedSiteUrl ? (
          <p className="vd-field-hint" style={{ marginBottom: 18 }}>
            {t("dashboard.gsc.detected_site")}: <strong>{statusData.resolvedSiteUrl}</strong>
          </p>
        ) : null}
        <button
          type="button"
          className="vd-btn-apply"
          onClick={handleConnect}
          disabled={connecting}
        >
          {connecting ? t("dashboard.gsc.connecting") : t("dashboard.gsc.connect_button")}
        </button>
      </div>
    );
  }

  const kpis = analytics?.kpis || {
    totalClicks: 0,
    totalImpressions: 0,
    avgCtr: 0,
    avgPosition: 0,
  };
  const topQueries = analytics?.topQueries || [];
  const topPages = analytics?.topPages || [];
  const sitemapsCount = Array.isArray(statusData.sitemapsSubmitted)
    ? statusData.sitemapsSubmitted.length
    : 0;

  return (
    <>
      <div className="vd-connected-banner">
        <div>
          <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
            {siteOptions.length > 1 ? (
              <select
                value={statusData.siteUrl}
                onChange={(e) => handleSelectSite(e.target.value)}
                disabled={syncing}
                style={{
                  padding: "6px 10px",
                  borderRadius: 8,
                  border: "1px solid #cbd5e1",
                  fontWeight: 700,
                  fontSize: "0.9rem",
                  color: "#0f172a",
                  background: "#fff",
                }}
              >
                {siteOptions.map((opt) => (
                  <option key={opt.siteUrl} value={opt.siteUrl}>
                    {opt.siteUrl}
                    {opt.permissionLevel &&
                    opt.permissionLevel !== "siteUnverifiedUser" &&
                    opt.permissionLevel !== "candidate"
                      ? " (Verified)"
                      : ""}
                  </option>
                ))}
              </select>
            ) : (
              <strong>{statusData.siteUrl}</strong>
            )}
            <span className={`vd-gsc-badge ${statusData.verified ? "verified" : "unverified"}`}>
              {statusData.verified
                ? t("dashboard.gsc.badge_verified")
                : t("dashboard.gsc.badge_unverified")}
            </span>
            <span className="vd-gsc-badge sitemap">
              {t("dashboard.gsc.sitemaps_submitted", { count: sitemapsCount })}
            </span>
          </div>
          <div className="vd-connected-meta">
            {statusData.email ? `${t("dashboard.gsc.account")}: ${statusData.email}` : null}
            {statusData.lastSyncedAt
              ? ` · ${t("dashboard.gsc.last_synced")}: ${new Date(
                  statusData.lastSyncedAt
                ).toLocaleString()}`
              : null}
          </div>
          {statusData.lastVerificationError && !statusData.verified ? (
            <div className="vd-field-hint" style={{ color: "#b45309", marginTop: 4 }}>
              {statusData.lastVerificationError}
            </div>
          ) : null}
        </div>

        <div className="vd-connect-actions" style={{ marginTop: 0 }}>
          <button
            type="button"
            className="vd-btn-secondary"
            onClick={handleVerifyAndSync}
            disabled={syncing}
          >
            {syncing ? t("dashboard.gsc.syncing") : t("dashboard.gsc.verify_and_sync_btn")}
          </button>
          <button type="button" className="vd-btn-danger" onClick={handleDisconnect}>
            {t("dashboard.gsc.disconnect_btn")}
          </button>
        </div>
      </div>

      <section className="vd-filters" aria-label={t("dashboard.date_range_aria")}>
        <div className="vd-filters-card">
          <div className="vd-quick-pills" role="group">
            {[
              { id: "7d", label: t("dashboard.gsc.preset_7d") },
              { id: "28d", label: t("dashboard.gsc.preset_28d") },
              { id: "3m", label: t("dashboard.gsc.preset_3m") },
            ].map(({ id, label }) => (
              <button
                key={id}
                type="button"
                className={`vd-pill${preset === id ? " active" : ""}`}
                onClick={() => handlePresetClick(id)}
              >
                {label}
              </button>
            ))}
          </div>

          <form className="vd-filters-grid" onSubmit={handleCustomSubmit}>
            <div className="vd-field">
              <label htmlFor="gsc-start">{t("dashboard.start_date")}</label>
              <input
                id="gsc-start"
                type="date"
                value={startDate}
                onChange={(e) => {
                  setPreset("custom");
                  setStartDate(e.target.value);
                }}
              />
            </div>
            <div className="vd-field">
              <label htmlFor="gsc-end">{t("dashboard.end_date")}</label>
              <input
                id="gsc-end"
                type="date"
                value={endDate}
                onChange={(e) => {
                  setPreset("custom");
                  setEndDate(e.target.value);
                }}
              />
            </div>
            <button type="submit" className="vd-btn-apply" disabled={analyticsLoading}>
              {analyticsLoading ? t("dashboard.updating") : t("dashboard.apply_filter")}
            </button>
          </form>
        </div>
      </section>

      {analytics?.permissionWarning ? (
        <div
          className="vd-sync-pending"
          style={{
            background: "#fffbeb",
            borderColor: "#fde68a",
            color: "#92400e",
          }}
          role="status"
        >
          <strong>Google Search Console 提示：</strong> {analytics.permissionWarning}
        </div>
      ) : null}

      {error ? (
        <div className="vd-error" role="alert">
          {error}
        </div>
      ) : analyticsLoading ? (
        <div className="vd-loading">
          <span className="spinner-border spinner-border-sm text-primary" role="status" aria-hidden="true" />
          {t("dashboard.loading_analytics")}
        </div>
      ) : (
        <>
          <div className="vd-kpi-grid vd-kpi-grid-4">
            <div className="vd-kpi">
              <div className="vd-kpi-label">{t("dashboard.gsc.total_clicks")}</div>
              <div className="vd-kpi-value brand">{formatNumber(kpis.totalClicks)}</div>
              <div className="vd-kpi-meta">{t("dashboard.gsc.total_clicks_meta")}</div>
            </div>
            <div className="vd-kpi">
              <div className="vd-kpi-label">{t("dashboard.gsc.total_impressions")}</div>
              <div className="vd-kpi-value">{formatNumber(kpis.totalImpressions)}</div>
              <div className="vd-kpi-meta">{t("dashboard.gsc.total_impressions_meta")}</div>
            </div>
            <div className="vd-kpi">
              <div className="vd-kpi-label">{t("dashboard.gsc.avg_ctr")}</div>
              <div className="vd-kpi-value">{kpis.avgCtr}%</div>
              <div className="vd-kpi-meta">{t("dashboard.gsc.avg_ctr_meta")}</div>
            </div>
            <div className="vd-kpi">
              <div className="vd-kpi-label">{t("dashboard.gsc.avg_position")}</div>
              <div className="vd-kpi-value">
                {kpis.avgPosition > 0 ? `#${kpis.avgPosition}` : "—"}
              </div>
              <div className="vd-kpi-meta">{t("dashboard.gsc.avg_position_meta")}</div>
            </div>
          </div>

          <div className="vd-chart-card" style={{ marginBottom: 20 }}>
            <div className="vd-chart-head">
              <h2>{t("dashboard.gsc.chart_title")}</h2>
              <p>{t("dashboard.gsc.chart_subtitle")}</p>
            </div>
            <div className="vd-chart-wrap">
              <Line data={chartData} options={chartOptions} />
            </div>
          </div>

          <div className="vd-table-grid">
            <div className="vd-chart-card">
              <div className="vd-chart-head">
                <h2>{t("dashboard.gsc.top_queries_title")}</h2>
                <p>{t("dashboard.gsc.top_queries_desc")}</p>
              </div>
              {topQueries.length === 0 ? (
                <p className="vd-field-hint">{t("dashboard.gsc.no_data_yet")}</p>
              ) : (
                <div className="vd-table-scroll">
                  <table className="vd-data-table">
                    <thead>
                      <tr>
                        <th>{t("dashboard.gsc.col_query")}</th>
                        <th>{t("dashboard.gsc.clicks")}</th>
                        <th>{t("dashboard.gsc.impressions")}</th>
                        <th>{t("dashboard.gsc.col_ctr")}</th>
                        <th>{t("dashboard.gsc.col_position")}</th>
                      </tr>
                    </thead>
                    <tbody>
                      {topQueries.map((row) => (
                        <tr key={row.query}>
                          <td className="vd-cell-primary">{row.query}</td>
                          <td>{formatNumber(row.clicks)}</td>
                          <td>{formatNumber(row.impressions)}</td>
                          <td>{row.ctr}%</td>
                          <td>#{row.position}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>

            <div className="vd-chart-card">
              <div className="vd-chart-head">
                <h2>{t("dashboard.gsc.top_pages_title")}</h2>
                <p>{t("dashboard.gsc.top_pages_desc")}</p>
              </div>
              {topPages.length === 0 ? (
                <p className="vd-field-hint">{t("dashboard.gsc.no_data_yet")}</p>
              ) : (
                <div className="vd-table-scroll">
                  <table className="vd-data-table">
                    <thead>
                      <tr>
                        <th>{t("dashboard.gsc.col_page")}</th>
                        <th>{t("dashboard.gsc.clicks")}</th>
                        <th>{t("dashboard.gsc.impressions")}</th>
                        <th>{t("dashboard.gsc.col_ctr")}</th>
                        <th>{t("dashboard.gsc.col_position")}</th>
                      </tr>
                    </thead>
                    <tbody>
                      {topPages.map((row) => (
                        <tr key={row.page}>
                          <td className="vd-cell-primary" title={row.page}>
                            {row.page}
                          </td>
                          <td>{formatNumber(row.clicks)}</td>
                          <td>{formatNumber(row.impressions)}</td>
                          <td>{row.ctr}%</td>
                          <td>#{row.position}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>
        </>
      )}
    </>
  );
}

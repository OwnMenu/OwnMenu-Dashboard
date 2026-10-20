import { useEffect, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { useSearchParams } from "react-router-dom";
import WebsiteAnalytics from "./WebsiteAnalytics";
import AppStoreAnalytics from "./AppStoreAnalytics";
import GoogleSearchConsoleAnalytics from "./GoogleSearchConsoleAnalytics";
import "./HomeDashboard.css";

/**
 * Website / App Store / Google Search Console 综合分析页面
 */
export default function WebsiteAnalyticsPage() {
  const { t } = useTranslation();
  const [searchParams, setSearchParams] = useSearchParams();
  const today = useMemo(() => new Date(), []);
  const todayStr = today.toLocaleDateString("en-CA");

  const initialTab = useMemo(() => {
    const tabParam = searchParams.get("tab");
    if (tabParam === "gsc" || tabParam === "app_store" || tabParam === "website") {
      return tabParam;
    }
    return "website";
  }, [searchParams]);

  const [activeTab, setActiveTab] = useState(initialTab);

  useEffect(() => {
    const tabParam = searchParams.get("tab");
    if (tabParam && (tabParam === "gsc" || tabParam === "app_store" || tabParam === "website")) {
      setActiveTab(tabParam);
    }
  }, [searchParams]);

  const handleTabChange = (nextTab) => {
    setActiveTab(nextTab);
    setSearchParams({ tab: nextTab }, { replace: true });
  };

  const renderSubtitle = () => {
    if (activeTab === "app_store") return t("dashboard.app_store.subtitle");
    if (activeTab === "gsc") return t("dashboard.gsc.subtitle");
    return t("dashboard.subtitle");
  };

  return (
    <div className="vd-page">
      <header className="vd-header">
        <h1>{t("dashboard.analytics_title")}</h1>
        <p>{renderSubtitle()}</p>
      </header>

      <div className="vd-tabs" role="tablist">
        <button
          type="button"
          role="tab"
          aria-selected={activeTab === "website"}
          className={`vd-tab${activeTab === "website" ? " active" : ""}`}
          onClick={() => handleTabChange("website")}
        >
          {t("dashboard.tab_website")}
        </button>
        <button
          type="button"
          role="tab"
          aria-selected={activeTab === "app_store"}
          className={`vd-tab${activeTab === "app_store" ? " active" : ""}`}
          onClick={() => handleTabChange("app_store")}
        >
          {t("dashboard.tab_app_store")}
        </button>
        <button
          type="button"
          role="tab"
          aria-selected={activeTab === "gsc"}
          className={`vd-tab${activeTab === "gsc" ? " active" : ""}`}
          onClick={() => handleTabChange("gsc")}
        >
          {t("dashboard.tab_gsc")}
        </button>
      </div>

      {activeTab === "website" ? (
        <WebsiteAnalytics today={today} todayStr={todayStr} />
      ) : activeTab === "app_store" ? (
        <AppStoreAnalytics today={today} todayStr={todayStr} />
      ) : (
        <GoogleSearchConsoleAnalytics />
      )}
    </div>
  );
}

import React, { useEffect, useState, useRef } from "react";
import { useDispatch, useSelector } from "react-redux";
import { getSEOThunk, setSEOThunk, setSEO } from "../../../store/seo";
import { getRestaurantThunk } from "../../../store/restaurants";
import { Collapse, Modal, Spinner } from "react-bootstrap";
import { toast, ToastContainer } from "react-toastify";
import { getToken } from "../../../store/utlits";
import Lottie from "lottie-react";
import seoLoading from "../../../json/seoloading.json";
import SEOSummaryCard, { computeSeoScoreBreakdown } from "./SeoCard";
import swal from "sweetalert";
import { useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";

const SECTIONS = [
  {
    title: "website.seo.sections.meta",
    desc: "website.seo.sections.meta_desc",
    icon: "bi-window",
    items: [
      { field: "meta_title", label: "Meta Title", hint: "≤60 chars", editable: true },
      { field: "meta_description", label: "Meta Description", hint: "≤160 chars", editable: true },
      { field: "meta_keywords", label: "Meta Keywords", hint: "10–15 keywords", editable: true },
      { field: "og_title", label: "OG Title", hint: "Social share title", editable: true },
      { field: "og_description", label: "OG Description", hint: "Social share description", editable: true },
    ],
  },
  {
    title: "website.seo.sections.local",
    desc: "website.seo.sections.local_desc",
    icon: "bi-geo-alt",
    items: [
      { field: "geo_street_address", label: "Street Address", editable: false },
      { field: "geo_address_locality", label: "City", editable: false },
      { field: "geo_address_region", label: "State / Region", editable: false },
      { field: "geo_address_country", label: "Country", editable: false },
      { field: "geo_latitude", label: "Latitude", editable: false },
      { field: "geo_longitude", label: "Longitude", editable: false },
      { field: "opening_hours", label: "Opening Hours", editable: false },
      { field: "menu_url", label: "Menu URL", editable: false },
    ],
  },
  {
    title: "website.seo.sections.content",
    desc: "website.seo.sections.content_desc",
    icon: "bi-text-left",
    items: [
      { field: "built_in_faq", label: "FAQ Schema", editable: false },
      { field: "seo_paragraph", label: "SEO Paragraph", hint: "200–300 words", editable: true },
      { field: "h1_text", label: "H1 Heading", editable: true },
      { field: "h2_sections", label: "H2 Sections", editable: false },
      { field: "internal_links", label: "Internal Links", editable: false },
    ],
  },
];

const ADVANCED_FIELDS = [
  { field: "google_site_verification", label: "Google Search Console", hint: "meta content value", editable: true },
  { field: "bing_site_verification", label: "Bing Webmaster", hint: "msvalidate.01 value", editable: true },
];

const EDITABLE_FIELDS = [
  "meta_title", "meta_description", "meta_keywords", "og_title", "og_description",
  "seo_paragraph", "h1_text", "google_site_verification", "bing_site_verification",
];
const GEO_FIELDS = ["geo_street_address", "geo_address_locality", "geo_address_region", "geo_address_country", "geo_latitude", "geo_longitude"];
const GEO_GENERATE_FIELDS = ["geo_address_region", "geo_latitude", "geo_longitude"];
const ENHANCEABLE_NON_GEO = [...EDITABLE_FIELDS.filter((f) => !ADVANCED_FIELDS.some((a) => a.field === f)), "built_in_faq", "h2_sections", "internal_links", "opening_hours", "menu_url"];

function hasSeoValue(value) {
  if (value == null) return false;
  if (typeof value === "string") {
    const t = value.trim();
    return t !== "" && t !== "[]" && t !== "{}";
  }
  if (Array.isArray(value)) return value.length > 0;
  if (typeof value === "object") return Object.keys(value).length > 0;
  return true;
}

const css = `
  @import url('https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700;800&display=swap');

  .seo-page {
    --seo-ink: #0f172a;
    --seo-muted: #64748b;
    --seo-line: #e2e8f0;
    --seo-soft: #f8fafc;
    --seo-card: #ffffff;
    --seo-accent: #dd2f6e;
    --seo-accent-soft: #fce7f0;
    --seo-warn: #b45309;
    --seo-danger: #b91c1c;
    background:
      radial-gradient(1200px 400px at 10% -10%, #fce7f0 0%, transparent 55%),
      radial-gradient(900px 320px at 100% 0%, #fff1f6 0%, transparent 50%),
      var(--seo-soft);
    min-height: 100vh;
    font-family: 'Plus Jakarta Sans', sans-serif;
    color: var(--seo-ink);
  }
  .seo-page * { font-family: 'Plus Jakarta Sans', sans-serif; }
  .seo-shell { max-width: 980px; margin: 0 auto; padding: 2rem 1.25rem 4rem; }

  .seo-hero {
    display: grid; grid-template-columns: 1.4fr auto; gap: 1.25rem; align-items: end;
    margin-bottom: 1.5rem;
  }
  @media (max-width: 768px) { .seo-hero { grid-template-columns: 1fr; } }
  .seo-kicker {
    display: inline-flex; align-items: center; gap: 6px;
    font-size: 0.72rem; font-weight: 700; letter-spacing: 0.08em; text-transform: uppercase;
    color: var(--seo-accent); margin-bottom: 0.45rem;
  }
  .seo-page-title { font-size: 1.75rem; font-weight: 800; letter-spacing: -0.04em; margin: 0 0 0.35rem; }
  .seo-page-sub { font-size: 0.95rem; color: var(--seo-muted); margin: 0; max-width: 42rem; line-height: 1.55; }

  .btn-ai-generate {
    display: inline-flex; align-items: center; justify-content: center; gap: 8px;
    background: linear-gradient(135deg, #dd2f6e 0%, #bb1e57 100%);
    color: #fff; border: none; border-radius: 12px;
    font-size: 0.9rem; font-weight: 700; padding: 0.85rem 1.35rem;
    cursor: pointer; white-space: nowrap;
    box-shadow: 0 10px 24px rgba(15, 118, 110, 0.28);
    transition: transform 0.15s, box-shadow 0.15s, opacity 0.15s;
  }
  .btn-ai-generate:hover:not(:disabled) { transform: translateY(-1px); box-shadow: 0 14px 28px rgba(221, 47, 110, 0.32); }
  .btn-ai-generate:disabled { opacity: 0.55; cursor: not-allowed; transform: none; }
  .btn-ai-generate .btn-ai-hint { display: block; font-size: 0.7rem; font-weight: 500; opacity: 0.85; margin-top: 1px; }

  .seo-top-grid {
    display: grid; grid-template-columns: 1.1fr 0.9fr; gap: 1rem; margin-bottom: 1.25rem;
  }
  @media (max-width: 900px) { .seo-top-grid { grid-template-columns: 1fr; } }

  .seo-score-card, .seo-preview-card, .seo-panel, .seo-address-card {
    background: var(--seo-card); border: 1px solid var(--seo-line); border-radius: 16px;
    box-shadow: 0 1px 2px rgba(15, 23, 42, 0.04);
  }
  .seo-score-card {
    display: flex; gap: 1.25rem; align-items: center; padding: 1.35rem 1.4rem;
  }
  @media (max-width: 560px) { .seo-score-card { flex-direction: column; text-align: center; } }
  .seo-score-num { font-size: 1.7rem; font-weight: 800; color: var(--seo-ink); line-height: 1; }
  .seo-score-of { font-size: 0.72rem; color: var(--seo-muted); font-weight: 600; margin-top: 2px; }
  .seo-score-headline { font-size: 0.92rem; color: #334155; margin: 0 0 0.9rem; line-height: 1.5; font-weight: 500; }
  .seo-stat-row { display: grid; grid-template-columns: repeat(3, 1fr); gap: 0.55rem; }
  .seo-stat {
    border-radius: 12px; padding: 0.55rem 0.65rem; border: 1px solid var(--seo-line); background: #fff;
  }
  .seo-stat-n { display: block; font-size: 1.15rem; font-weight: 800; line-height: 1.1; }
  .seo-stat-l { font-size: 0.68rem; font-weight: 700; text-transform: uppercase; letter-spacing: 0.04em; color: var(--seo-muted); }
  .seo-stat-critical { background: #fef2f2; border-color: #fecaca; }
  .seo-stat-critical .seo-stat-n { color: var(--seo-danger); }
  .seo-stat-warn { background: #fffbeb; border-color: #fde68a; }
  .seo-stat-warn .seo-stat-n { color: var(--seo-warn); }
  .seo-stat-ok { background: var(--seo-accent-soft); border-color: #f9a8d4; }
  .seo-stat-ok .seo-stat-n { color: var(--seo-accent); }

  .seo-preview-card { padding: 1.15rem 1.25rem; }
  .seo-preview-label {
    font-size: 0.72rem; font-weight: 700; letter-spacing: 0.06em; text-transform: uppercase;
    color: var(--seo-muted); margin-bottom: 0.75rem;
  }
  .seo-serp {
    background: #fff; border: 1px solid var(--seo-line); border-radius: 12px; padding: 0.9rem 1rem;
  }
  .seo-serp-title { color: #1a0dab; font-size: 1.05rem; line-height: 1.3; font-weight: 500; margin-bottom: 2px; }
  .seo-serp-url { color: #006621; font-size: 0.8rem; margin-bottom: 4px; word-break: break-all; }
  .seo-serp-desc { color: #4b5563; font-size: 0.82rem; line-height: 1.45; }
  .seo-preview-meta {
    display: flex; flex-wrap: wrap; gap: 0.5rem; margin-top: 0.85rem; align-items: center;
  }
  .seo-pill-link {
    display: inline-flex; align-items: center; gap: 5px; font-size: 0.78rem; font-weight: 600;
    color: var(--seo-accent); text-decoration: none; background: var(--seo-accent-soft);
    border: 1px solid #a7f3d0; border-radius: 999px; padding: 0.3rem 0.7rem;
  }
  .seo-pill-link:hover { background: #fbcfe8; }
  .seo-muted-note { font-size: 0.75rem; color: var(--seo-muted); margin: 0; }

  .seo-steps {
    display: grid; grid-template-columns: repeat(3, 1fr); gap: 0.75rem; margin-bottom: 1.5rem;
  }
  @media (max-width: 720px) { .seo-steps { grid-template-columns: 1fr; } }
  .seo-step {
    background: #fff; border: 1px solid var(--seo-line); border-radius: 14px; padding: 0.9rem 1rem;
    display: flex; gap: 0.7rem; align-items: flex-start;
  }
  .seo-step-n {
    width: 28px; height: 28px; border-radius: 8px; background: var(--seo-accent-soft); color: var(--seo-accent);
    display: flex; align-items: center; justify-content: center; font-size: 0.8rem; font-weight: 800; flex-shrink: 0;
  }
  .seo-step strong { display: block; font-size: 0.84rem; margin-bottom: 2px; }
  .seo-step span { font-size: 0.76rem; color: var(--seo-muted); line-height: 1.4; }

  .seo-address-card { padding: 1rem 1.2rem; margin-bottom: 1rem; display: flex; gap: 0.9rem; align-items: flex-start; }
  .seo-address-icon {
    width: 40px; height: 40px; border-radius: 12px; background: #fce7f0; color: #dd2f6e;
    display: flex; align-items: center; justify-content: center; flex-shrink: 0;
  }
  .seo-address-title { font-size: 0.82rem; font-weight: 700; margin: 0 0 0.2rem; }
  .seo-address-line { font-size: 0.9rem; color: #334155; margin: 0; line-height: 1.45; }
  .seo-address-coords { font-size: 0.75rem; color: var(--seo-muted); margin-top: 0.35rem; }

  .section-divider {
    font-size: 0.72rem; font-weight: 800; letter-spacing: 0.08em; text-transform: uppercase;
    color: var(--seo-muted); margin: 1.75rem 0 0.75rem; display: flex; align-items: center; gap: 0.75rem;
  }
  .section-divider::after { content: ""; flex: 1; height: 1px; background: var(--seo-line); }

  .seo-panel { margin-bottom: 0.85rem; overflow: hidden; }
  .seo-panel-header {
    display: flex; align-items: center; gap: 0.8rem;
    padding: 1rem 1.15rem; border-bottom: 1px solid #f1f5f9; background: linear-gradient(180deg, #fff, #fbfdff);
  }
  .panel-icon {
    width: 36px; height: 36px; border-radius: 10px; background: var(--seo-accent-soft); color: var(--seo-accent);
    display: flex; align-items: center; justify-content: center; font-size: 0.95rem; flex-shrink: 0;
  }
  .panel-icon.blue { background: #fce7f0; color: #dd2f6e; }
  .panel-icon.amber { background: #fffbeb; color: #b45309; }
  .panel-icon.slate { background: #f1f5f9; color: #475569; }
  .panel-title { font-size: 0.95rem; font-weight: 750; color: var(--seo-ink); margin: 0 0 2px; }
  .panel-desc { font-size: 0.78rem; color: var(--seo-muted); margin: 0; }
  .panel-progress {
    margin-left: auto; font-size: 0.72rem; font-weight: 700; color: var(--seo-accent);
    background: var(--seo-accent-soft); border-radius: 999px; padding: 0.25rem 0.6rem; white-space: nowrap;
  }

  .field-item {
    display: flex; align-items: center; justify-content: space-between;
    padding: 0.85rem 1.15rem; border-bottom: 1px solid #f8fafc; gap: 0.85rem; flex-wrap: wrap;
    transition: background 0.12s;
  }
  .field-item:last-child { border-bottom: none; }
  .field-item:hover { background: #fafbfc; }
  .field-item.field-missing { background: linear-gradient(90deg, #fff7f7, #fff); }
  .field-left { display: flex; align-items: center; gap: 0.75rem; flex: 1; flex-wrap: wrap; min-width: 0; }
  .field-dot {
    width: 8px; height: 8px; border-radius: 50%; flex-shrink: 0;
  }
  .field-dot.on { background: #10b981; box-shadow: 0 0 0 3px rgba(16,185,129,0.15); }
  .field-dot.off { background: #f87171; box-shadow: 0 0 0 3px rgba(248,113,113,0.12); }
  .field-name { font-size: 0.88rem; font-weight: 650; color: #1e293b; white-space: nowrap; }
  .field-hint-text { font-size: 0.74rem; color: #94a3b8; }
  .field-right { display: flex; align-items: center; gap: 0.45rem; flex-shrink: 0; }

  .tag { display: inline-block; padding: 3px 8px; border-radius: 999px; font-size: 0.66rem; font-weight: 700; letter-spacing: 0.02em; white-space: nowrap; }
  .tag-missing { background: #fef2f2; color: #b91c1c; }
  .tag-filled { background: #fce7f0; color: #be185d; }
  .tag-edit { background: #f1f5f9; color: #475569; }

  .btn-toggle {
    background: #fff; border: 1px solid var(--seo-line); font-size: 0.78rem; font-weight: 650;
    color: #475569; cursor: pointer; padding: 0.28rem 0.65rem; border-radius: 8px;
    display: flex; align-items: center; gap: 4px; transition: all 0.15s; white-space: nowrap;
  }
  .btn-toggle:hover { border-color: #cbd5e1; color: var(--seo-ink); background: #f8fafc; }

  .btn-autofill {
    background: var(--seo-accent-soft); border: 1px solid #f9a8d4; color: var(--seo-accent);
    font-size: 0.76rem; font-weight: 700; padding: 0.28rem 0.7rem; border-radius: 8px;
    cursor: pointer; white-space: nowrap; transition: background 0.15s;
    display: inline-flex; align-items: center; gap: 4px;
  }
  .btn-autofill:hover:not(:disabled) { background: #fbcfe8; }
  .btn-autofill:disabled { opacity: 0.45; cursor: not-allowed; }

  .btn-setup-link {
    background: none; border: none; font-size: 0.76rem; font-weight: 700;
    color: var(--seo-danger); cursor: pointer; padding: 0;
    text-decoration: underline; text-underline-offset: 2px;
  }

  .field-expand { padding: 0.75rem 1.15rem 1rem; background: #f8fafc; border-top: 1px solid #f1f5f9; }
  .value-display {
    background: #fff; border: 1px solid var(--seo-line); border-radius: 10px;
    padding: 0.7rem 0.9rem; font-size: 0.86rem; color: #334155; line-height: 1.55; min-height: 42px;
  }
  .value-display.clickable { cursor: pointer; }
  .value-display.clickable:hover { border-color: #94a3b8; }
  .value-placeholder { color: #cbd5e1; font-style: italic; }

  .edit-wrap textarea {
    width: 100%; background: #fff; border: 1.5px solid #dd2f6e;
    border-radius: 10px; padding: 0.7rem 0.9rem; font-size: 0.875rem;
    color: var(--seo-ink); resize: vertical; outline: none; line-height: 1.55;
  }
  .edit-actions { display: flex; justify-content: flex-end; gap: 0.5rem; margin-top: 0.55rem; }
  .btn-cancel {
    background: #f1f5f9; border: none; font-size: 0.8rem; font-weight: 650;
    padding: 0.4rem 0.85rem; border-radius: 8px; cursor: pointer; color: #64748b;
  }
  .btn-save {
    background: var(--seo-ink); border: none; color: #fff; font-size: 0.8rem; font-weight: 700;
    padding: 0.4rem 0.95rem; border-radius: 8px; cursor: pointer;
    display: inline-flex; align-items: center; gap: 5px;
  }
  .btn-save:disabled { opacity: 0.5; }

  .seo-panel-body { padding: 1.2rem 1.25rem 1.3rem; }
  .form-field-label { font-size: 0.8rem; font-weight: 750; color: #334155; margin-bottom: 0.35rem; display: block; }
  .label-row { display: flex; align-items: center; justify-content: space-between; margin-bottom: 0.35rem; }

  .seo-input {
    width: 100%; background: #fff; border: 1px solid var(--seo-line); border-radius: 10px;
    padding: 0.55rem 0.85rem; font-size: 0.875rem; color: var(--seo-ink); outline: none;
    transition: border-color 0.15s, box-shadow 0.15s;
  }
  .seo-input:focus { border-color: #dd2f6e; box-shadow: 0 0 0 3px rgba(221,47,110,0.12); }
  .seo-input::placeholder { color: #cbd5e1; }

  .btn-suggest {
    background: #f8fafc; border: 1px solid var(--seo-line); font-size: 0.75rem; font-weight: 700;
    color: #475569; cursor: pointer; padding: 0.28rem 0.65rem; border-radius: 8px;
    display: inline-flex; align-items: center; gap: 4px;
  }
  .btn-suggest:hover:not(:disabled) { background: #f1f5f9; color: var(--seo-ink); }
  .btn-suggest:disabled { opacity: 0.4; cursor: not-allowed; }

  .hero-drop {
    border: 1.5px dashed #cbd5e1; border-radius: 14px; background: #f8fafc;
    padding: 1rem; display: flex; gap: 1rem; align-items: center; flex-wrap: wrap;
  }
  .hero-thumb {
    width: 148px; height: 92px; border-radius: 12px; overflow: hidden; background: #e2e8f0;
    border: 1px solid var(--seo-line); flex-shrink: 0;
    display: flex; align-items: center; justify-content: center; color: #94a3b8; font-size: 0.78rem;
  }
  .hero-thumb img { width: 100%; height: 100%; object-fit: cover; }

  .landing-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 1rem; }
  @media (max-width: 720px) { .landing-grid { grid-template-columns: 1fr; } }

  .landing-footer { margin-top: 1.2rem; padding-top: 1rem; border-top: 1px solid #f1f5f9; display: flex; justify-content: flex-end; }
  .btn-save-strategy {
    background: var(--seo-ink); border: none; color: #fff; font-size: 0.875rem; font-weight: 700;
    padding: 0.55rem 1.3rem; border-radius: 10px; cursor: pointer;
    display: inline-flex; align-items: center; gap: 6px;
  }
  .btn-save-strategy:disabled { opacity: 0.5; cursor: not-allowed; }

  .seo-tag-row { display: flex; flex-wrap: wrap; gap: 6px; align-items: center; margin-bottom: 0.55rem; min-height: 28px; }
  .seo-chip {
    display: inline-flex; align-items: center; gap: 5px;
    background: var(--seo-accent-soft); border: 1px solid #f9a8d4; color: #9d174d;
    border-radius: 999px; padding: 0.28rem 0.55rem 0.28rem 0.7rem; font-size: 0.78rem; font-weight: 650;
  }
  .seo-chip.city {
    background: #fce7f0; border-color: #f9a8d4; color: #9d174d;
  }
  .seo-chip-remove { background: none; border: none; cursor: pointer; padding: 0 2px; color: inherit; opacity: 0.65; font-size: 1rem; line-height: 1; }
  .seo-chip-remove:hover { opacity: 1; }
  .seo-add-inline { display: flex; gap: 6px; align-items: center; flex-wrap: wrap; }
  .seo-add-inline .seo-input { flex: 1; min-width: 120px; }
  .btn-add-tag {
    font-size: 0.8rem; font-weight: 700; padding: 0.45rem 0.8rem; border-radius: 9px;
    background: #fff; border: 1px solid var(--seo-line); color: #334155; cursor: pointer;
  }
  .btn-add-tag:hover { background: #f8fafc; }

  .help-row {
    display: inline-flex; align-items: center; gap: 6px; cursor: pointer;
    color: var(--seo-muted); font-size: 0.82rem; font-weight: 600;
    background: #fff; border: 1px solid var(--seo-line); border-radius: 999px;
    padding: 0.35rem 0.75rem; margin-bottom: 1.1rem; transition: all 0.15s;
  }
  .help-row:hover { color: var(--seo-ink); border-color: #cbd5e1; }
  .help-content {
    background: #fff; border: 1px solid var(--seo-line); border-radius: 12px;
    padding: 0.95rem 1.1rem; font-size: 0.86rem; color: var(--seo-muted);
    line-height: 1.6; margin-bottom: 1.15rem;
  }

  .modal-content { border-radius: 16px !important; border: 1px solid var(--seo-line) !important; box-shadow: 0 24px 48px rgba(15,23,42,0.14) !important; }
  .modal-header { padding: 1.2rem 1.4rem 0.85rem !important; border-bottom: 1px solid #f1f5f9 !important; }
  .modal-title { font-size: 1.05rem !important; font-weight: 800 !important; color: var(--seo-ink) !important; }
  .modal-body { padding: 1.1rem 1.4rem !important; }
  .modal-footer { padding: 0.85rem 1.4rem !important; border-top: 1px solid #f1f5f9 !important; gap: 0.5rem; }
  .modal-label { font-size: 0.8rem; font-weight: 750; color: #334155; display: block; margin-bottom: 0.35rem; }
  .modal-input {
    width: 100%; background: #f8fafc; border: 1px solid var(--seo-line); border-radius: 10px;
    padding: 0.55rem 0.85rem; font-size: 0.875rem; outline: none; color: var(--seo-ink);
  }
  .modal-input:focus { border-color: #dd2f6e; background: #fff; box-shadow: 0 0 0 3px rgba(221,47,110,0.12); }
  .btn-modal-cancel {
    background: #f1f5f9; border: none; color: #334155; font-size: 0.85rem; font-weight: 700;
    padding: 0.5rem 1rem; border-radius: 9px; cursor: pointer;
  }
  .btn-modal-confirm {
    background: var(--seo-accent); border: none; color: #fff; font-size: 0.85rem; font-weight: 700;
    padding: 0.5rem 1.15rem; border-radius: 9px; cursor: pointer;
  }
  .gen-title { font-size: 1.05rem; font-weight: 800; color: var(--seo-ink); margin: 0.4rem 0 0.25rem; }
  .gen-sub { font-size: 0.85rem; color: var(--seo-muted); margin: 0; }
  .checklist-list { list-style: none; padding: 0; margin: 0; display: flex; flex-direction: column; gap: 0.7rem; }
  .checklist-item {
    display: flex; gap: 0.75rem; align-items: flex-start;
    padding: 0.9rem 1rem; background: #fffbeb; border: 1px solid #fde68a; border-radius: 12px;
  }
  .checklist-item i { color: var(--seo-warn); margin-top: 2px; flex-shrink: 0; }
  .checklist-item strong { display: block; font-size: 0.88rem; color: var(--seo-ink); margin-bottom: 2px; }
  .checklist-item span { font-size: 0.8rem; color: #78716c; line-height: 1.45; }

  .gsc-card {
    padding: 1.15rem 1.25rem;
    border-bottom: 1px solid #f1f5f9;
    background: linear-gradient(180deg, #ffffff 0%, #fcfdff 100%);
  }
  .gsc-top-row {
    display: flex; align-items: flex-start; justify-content: space-between; gap: 1rem; flex-wrap: wrap;
  }
  .gsc-badge-row {
    display: flex; align-items: center; gap: 0.45rem; flex-wrap: wrap; margin-bottom: 0.35rem;
  }
  .gsc-badge {
    display: inline-flex; align-items: center; gap: 4px;
    padding: 3px 10px; border-radius: 999px; font-size: 0.7rem; font-weight: 700;
  }
  .gsc-badge.connected { background: #dcfce7; color: #15803d; border: 1px solid #bbf7d0; }
  .gsc-badge.disconnected { background: #f1f5f9; color: #475569; border: 1px solid #e2e8f0; }
  .gsc-badge.verified { background: #dcfce7; color: #15803d; border: 1px solid #bbf7d0; }
  .gsc-badge.unverified { background: #fef3c7; color: #b45309; border: 1px solid #fde68a; }
  .gsc-badge.sitemap { background: #eff6ff; color: #1d4ed8; border: 1px solid #bfdbfe; }
  .gsc-meta-line { font-size: 0.8rem; color: var(--seo-muted); margin: 0.2rem 0 0; }
  .gsc-actions { display: flex; align-items: center; gap: 0.5rem; flex-wrap: wrap; }
  .btn-gsc-primary {
    background: linear-gradient(135deg, #dd2f6e 0%, #be185d 100%);
    color: #fff; border: none; border-radius: 9px; padding: 0.45rem 0.95rem;
    font-size: 0.8rem; font-weight: 700; cursor: pointer;
    display: inline-flex; align-items: center; gap: 6px;
  }
  .btn-gsc-primary:disabled { opacity: 0.6; cursor: not-allowed; }
  .btn-gsc-outline {
    background: #fff; color: var(--seo-ink); border: 1px solid var(--seo-line);
    border-radius: 9px; padding: 0.45rem 0.85rem; font-size: 0.8rem; font-weight: 650;
    cursor: pointer; display: inline-flex; align-items: center; gap: 6px;
  }
  .btn-gsc-outline:hover:not(:disabled) { background: #f8fafc; border-color: #cbd5e1; }
  .btn-gsc-outline:disabled { opacity: 0.6; cursor: not-allowed; }
  .btn-gsc-danger {
    background: #fef2f2; color: #b91c1c; border: 1px solid #fecaca;
    border-radius: 9px; padding: 0.45rem 0.8rem; font-size: 0.8rem; font-weight: 650;
    cursor: pointer;
  }
`;

export default function WebsiteSEO() {
  const { t } = useTranslation();
  const dispatch = useDispatch();
  const navigate = useNavigate();

  const seo = useSelector((state) => state.seo.seo);
  const restaurant = useSelector((state) => state.restaurant?.restaurant);
  const restaurantId = useSelector((state) => state.session.user?.restaurant_id);
  const plan = useSelector((state) => state.session.userPlan);

  const [showHelp, setShowHelp] = useState(false);
  const [showMissingModal, setShowMissingModal] = useState(false);
  const [missingCuisine, setMissingCuisine] = useState("");
  const [missingCity, setMissingCity] = useState("");
  const [openRows, setOpenRows] = useState({});
  const [loadingField, setLoadingField] = useState("");
  const [generating, setGenerating] = useState(false);
  const [editingField, setEditingField] = useState("");
  const [editValue, setEditValue] = useState("");
  const [savingField, setSavingField] = useState("");
  const [cuisineTagList, setCuisineTagList] = useState([]);
  const [nearbyCitiesList, setNearbyCitiesList] = useState([]);
  const [cuisineTagInput, setCuisineTagInput] = useState("");
  const [nearbyCityInput, setNearbyCityInput] = useState("");
  const [masterCuisine, setMasterCuisine] = useState("");
  const [savingLanding, setSavingLanding] = useState(false);
  const [suggestingTags, setSuggestingTags] = useState(false);
  const [suggestingCities, setSuggestingCities] = useState(false);
  const [uploadingHero, setUploadingHero] = useState(false);
  const [heroError, setHeroError] = useState("");
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [checklistItems, setChecklistItems] = useState([]);
  const [showChecklistModal, setShowChecklistModal] = useState(false);
  const [gscStatus, setGscStatus] = useState(null);
  const [gscLoading, setGscLoading] = useState(false);
  const [gscConnecting, setGscConnecting] = useState(false);
  const [gscSyncing, setGscSyncing] = useState(false);
  const heroInputRef = useRef(null);
  const gscPopupTimerRef = useRef(null);

  // All restaurants get full SEO — no plan gating on output or editing.
  const seoLocked = false;

  const fetchGscStatus = React.useCallback(async () => {
    if (!restaurantId) return;
    setGscLoading(true);
    try {
      const res = await fetch("/api/google-search-console/status", {
        headers: { Authorization: `Bearer ${getToken()}` },
      });
      if (res.ok) {
        const data = await res.json();
        setGscStatus(data);
      }
    } catch (err) {
      console.warn("Failed to load GSC status:", err);
    } finally {
      setGscLoading(false);
    }
  }, [restaurantId]);

  useEffect(() => {
    if (restaurantId) {
      dispatch(getSEOThunk(restaurantId));
      fetchGscStatus();
    }
  }, [dispatch, restaurantId, fetchGscStatus]);

  useEffect(() => {
    const onMessage = (event) => {
      const payload = event?.data;
      if (!payload || payload.source !== "ownmenu-gsc-oauth") return;
      if (gscPopupTimerRef.current) {
        clearInterval(gscPopupTimerRef.current);
        gscPopupTimerRef.current = null;
      }
      setGscConnecting(false);
      if (payload.status === "connected") {
        toast.success(t("dashboard.gsc.connected_toast"));
        fetchGscStatus();
        if (restaurantId) dispatch(getSEOThunk(restaurantId));
      } else {
        toast.error(payload.error || t("dashboard.gsc.connect_failed"));
      }
    };
    window.addEventListener("message", onMessage);
    return () => {
      window.removeEventListener("message", onMessage);
      if (gscPopupTimerRef.current) clearInterval(gscPopupTimerRef.current);
    };
  }, [dispatch, fetchGscStatus, restaurantId, t]);

  const handleGscConnect = async () => {
    setGscConnecting(true);
    try {
      const res = await fetch("/api/google-search-console/connect?popup=1", {
        headers: { Authorization: `Bearer ${getToken()}` },
      });
      const data = await res.json();
      if (!res.ok || !data.authUrl) {
        setGscConnecting(false);
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
      if (gscPopupTimerRef.current) clearInterval(gscPopupTimerRef.current);
      gscPopupTimerRef.current = setInterval(() => {
        if (popup.closed) {
          clearInterval(gscPopupTimerRef.current);
          gscPopupTimerRef.current = null;
          setGscConnecting(false);
          fetchGscStatus();
          if (restaurantId) dispatch(getSEOThunk(restaurantId));
        }
      }, 1000);
    } catch {
      setGscConnecting(false);
      toast.error(t("dashboard.gsc.connect_failed"));
    }
  };

  const handleGscVerifyAndSync = async () => {
    setGscSyncing(true);
    try {
      const res = await fetch("/api/google-search-console/verify-and-sync", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${getToken()}`,
        },
        body: JSON.stringify({ siteUrl: gscStatus?.siteUrl }),
      });
      const data = await res.json();
      if (!res.ok) {
        toast.error(data.error || t("dashboard.gsc.verify_sync_failed"));
        return;
      }
      if (data.verified) {
        toast.success(t("dashboard.gsc.verify_sync_success"));
      } else {
        toast.warning(data.verificationError || t("dashboard.gsc.verify_pending_hint"));
      }
      fetchGscStatus();
      if (restaurantId) dispatch(getSEOThunk(restaurantId));
    } catch {
      toast.error(t("dashboard.gsc.verify_sync_failed"));
    } finally {
      setGscSyncing(false);
    }
  };

  const handleGscDisconnect = async () => {
    if (!window.confirm(t("dashboard.gsc.disconnect_confirm"))) return;
    try {
      const res = await fetch("/api/google-search-console/unbind", {
        method: "POST",
        headers: { Authorization: `Bearer ${getToken()}` },
      });
      if (res.ok) {
        toast.info(t("dashboard.gsc.disconnected_toast"));
        fetchGscStatus();
      }
    } catch {
      toast.error(t("dashboard.gsc.disconnect_failed"));
    }
  };

  useEffect(() => {
    const tags = seo?.seo_cuisine_tags;
    const cities = seo?.seo_nearby_cities;
    const toLower = (v) => String(v).trim().toLowerCase();
    setCuisineTagList(Array.isArray(tags) ? tags.map(toLower).filter(Boolean) : typeof tags === "string" ? tags.split(/[\n,]+/).map(toLower).filter(Boolean) : []);
    setNearbyCitiesList(Array.isArray(cities) ? cities.map(toLower).filter(Boolean) : typeof cities === "string" ? cities.split(/[\n,]+/).map(toLower).filter(Boolean) : []);
    setMasterCuisine(seo?.seo_main_cuisine != null ? String(seo.seo_main_cuisine) : "");
  }, [seo?.seo_cuisine_tags, seo?.seo_nearby_cities, seo?.seo_main_cuisine]);

  useEffect(() => { if (restaurantId && !restaurant) dispatch(getRestaurantThunk()); }, [dispatch, restaurantId, restaurant]);

  const score = computeSeoScoreBreakdown(seo).score;

  const serpTitle = (seo?.meta_title || restaurant?.name || "").slice(0, 60);
  const serpDescription = (seo?.meta_description || "").slice(0, 160);
  const publicSiteUrl = seo?.canonical_url || (plan?.domain ? `https://${plan.domain}.ownmenu.com` : "");

  const lockAndNavigate = () => {
    swal({
      title: t('website.seo.locked_title'),
      text: t('website.seo.locked_desc'),
      icon: "warning",
      buttons: { cancel: t('orders.details.close'), confirm: { text: t('website.seo.upgrade'), value: true, closeModal: true } },
    }).then((ok) => ok && navigate("/plans"));
  };

  const needsCuisineOrCity = () => !restaurant?.cuisine?.trim() || !restaurant?.city?.trim();

  const syncLandingFromSeo = (nextSeo) => {
    const tags = nextSeo?.seo_cuisine_tags;
    const cities = nextSeo?.seo_nearby_cities;
    const toLower = (v) => String(v).trim().toLowerCase();
    setCuisineTagList(
      Array.isArray(tags)
        ? tags.map(toLower).filter(Boolean)
        : typeof tags === "string"
          ? tags.split(/[\n,]+/).map(toLower).filter(Boolean)
          : [],
    );
    setNearbyCitiesList(
      Array.isArray(cities)
        ? cities.map(toLower).filter(Boolean)
        : typeof cities === "string"
          ? cities.split(/[\n,]+/).map(toLower).filter(Boolean)
          : [],
    );
    setMasterCuisine(nextSeo?.seo_main_cuisine != null ? String(nextSeo.seo_main_cuisine) : "");
  };

  const doGenerate = async (bodyOverrides = {}) => {
    setGenerating(true);
    try {
      const res = await fetch("/api/seo/generate-and-save", {
        method: "POST",
        headers: { Authorization: `Bearer ${getToken()}`, "Content-Type": "application/json" },
        body: Object.keys(bodyOverrides).length ? JSON.stringify(bodyOverrides) : undefined,
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        if (data.code === "MISSING_CUISINE" || data.code === "MISSING_CITY") {
          setMissingCuisine(restaurant?.cuisine ?? missingCuisine ?? "");
          setMissingCity(restaurant?.city ?? missingCity ?? "");
          setShowMissingModal(true);
          return;
        }
        throw new Error(data.message || data.error || "Request failed");
      }
      const { manualChecklist, ...seoPayload } = data;
      dispatch(setSEO(seoPayload));
      syncLandingFromSeo(seoPayload);
      setShowMissingModal(false);
      if (Array.isArray(manualChecklist) && manualChecklist.length > 0) {
        setChecklistItems(manualChecklist);
        setShowChecklistModal(true);
      } else {
        toast.success(t("website.seo.gen_success"));
      }
    } catch (e) {
      toast.error(e.message || t("website.seo.gen_error"));
    } finally {
      setGenerating(false);
    }
  };

  const handleGenerate = () => {
    if (seoLocked) return lockAndNavigate();
    if (needsCuisineOrCity()) {
      setMissingCuisine(restaurant?.cuisine ?? "");
      setMissingCity(restaurant?.city ?? "");
      setShowMissingModal(true);
      return;
    }
    doGenerate();
  };

  const handleMissingModalSubmit = () => {
    const cuisine = missingCuisine.trim();
    const city = missingCity.trim();
    if (!cuisine || !city) { toast.error(t('website.seo.enter_domain_error')); return; }
    doGenerate({ cuisine, city });
  };

  const handleEnhance = async (field) => {
    if (seoLocked) return lockAndNavigate();
    setLoadingField(field);
    try {
      const res = await fetch("/api/seo/enhance-field", {
        method: "POST",
        headers: { Authorization: `Bearer ${getToken()}`, "Content-Type": "application/json" },
        body: JSON.stringify({ restaurant_id: restaurantId, field }),
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || data.message || "Request failed");
      }
      if (
        GEO_GENERATE_FIELDS.includes(field) &&
        typeof data === "object" &&
        data.geo_latitude != null &&
        data.geo_longitude != null
      ) {
        dispatch(setSEO({ ...seo, ...data }));
        toast.success(t('website.seo.updated'));
      } else if (
        GEO_GENERATE_FIELDS.includes(field) &&
        typeof data === "object" &&
        field === "geo_address_region" &&
        data.geo_address_region
      ) {
        dispatch(setSEO({ ...seo, ...data }));
        toast.success(t('website.seo.updated'));
      } else if (GEO_GENERATE_FIELDS.includes(field) && typeof data === "object") {
        dispatch(setSEO({ ...seo, ...data }));
        toast.error("Could not resolve coordinates — check street and city in Business Settings.");
      } else if (data[field] !== undefined) {
        dispatch(setSEO({ ...seo, [field]: data[field] }));
        toast.success(t('website.seo.updated'));
      } else {
        toast.error(data.error || t('common.error'));
      }
    } catch (err) {
      toast.error(err?.message || t('common.error'));
    }
    setLoadingField("");
  };

  const handleSaveEdit = async () => {
    if (!editingField) return;
    setSavingField(editingField);
    try {
      const res = await fetch("/api/seo/edit-field", {
        method: "PUT",
        headers: { Authorization: `Bearer ${getToken()}`, "Content-Type": "application/json" },
        body: JSON.stringify({ restaurant_id: restaurantId, field: editingField, value: editValue }),
      });
      const data = await res.json();
      if (data.success) {
        await dispatch(setSEOThunk({ restaurant_id: restaurantId, ...seo, [editingField]: editValue }));
        toast.success(t('website.seo.saved'));
        setEditingField("");
      }
    } catch { toast.error(t('common.error')); }
    setSavingField("");
  };

  const toggleRow = (sIdx, iIdx) => setOpenRows((p) => ({ ...p, [`${sIdx}-${iIdx}`]: !p[`${sIdx}-${iIdx}`] }));

  const normalizeEntry = (s) => String(s).trim().toLowerCase();
  const addCuisineTags = () => {
    const parts = cuisineTagInput.split(/[\n,]+/).map(normalizeEntry).filter(Boolean);
    if (parts.length === 0) return;
    setCuisineTagList((prev) => {
      const next = [...prev];
      parts.forEach((p) => { if (p && !next.includes(p)) next.push(p); });
      return next;
    });
    setCuisineTagInput("");
  };
  const addNearbyCities = () => {
    const parts = nearbyCityInput.split(/[\n,]+/).map(normalizeEntry).filter(Boolean);
    if (parts.length === 0) return;
    setNearbyCitiesList((prev) => {
      const next = [...prev];
      parts.forEach((p) => { if (p && !next.includes(p)) next.push(p); });
      return next;
    });
    setNearbyCityInput("");
  };
  const removeCuisineTag = (i) => setCuisineTagList((prev) => prev.filter((_, idx) => idx !== i));
  const removeNearbyCity = (i) => setNearbyCitiesList((prev) => prev.filter((_, idx) => idx !== i));

  const handleSaveLanding = async () => {
    if (seoLocked) return lockAndNavigate();
    setSavingLanding(true);
    try {
      const res = await fetch("/api/seo/landing-strategy", {
        method: "PUT",
        headers: { Authorization: `Bearer ${getToken()}`, "Content-Type": "application/json" },
        body: JSON.stringify({
          seo_main_cuisine: masterCuisine.trim() || null,
          seo_cuisine_tags: cuisineTagList,
          seo_nearby_cities: nearbyCitiesList,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error();
      dispatch(setSEO(data));
      toast.success(t('website.seo.landing_saved'));
    } catch { toast.error(t('common.error')); }
    finally { setSavingLanding(false); }
  };

  const handleSuggestLanding = async (type) => {
    if (seoLocked) return lockAndNavigate();
    if (type === "tags") setSuggestingTags(true); else setSuggestingCities(true);
    try {
      const res = await fetch("/api/seo/suggest-seo-landing", {
        method: "POST",
        headers: { Authorization: `Bearer ${getToken()}`, "Content-Type": "application/json" },
      });
      const data = await res.json();
      if (!res.ok) throw new Error();
      if (type === "tags" && Array.isArray(data.suggestedCuisineTags)) {
        setCuisineTagList(
          data.suggestedCuisineTags.map((s) => String(s).trim().toLowerCase()).filter(Boolean),
        );
        if (data.suggestedMainCuisine && !masterCuisine.trim()) {
          setMasterCuisine(String(data.suggestedMainCuisine));
        }
      } else if (type === "cities" && Array.isArray(data.suggestedNearbyCities)) {
        setNearbyCitiesList(
          data.suggestedNearbyCities.map((s) => String(s).trim().toLowerCase()).filter(Boolean),
        );
      }
      toast.success(t('website.seo.suggestions_updated'));
    } catch { toast.error(t('common.error')); }
    finally { setSuggestingTags(false); setSuggestingCities(false); }
  };

  const ALLOWED_HERO_TYPES = ["image/jpeg", "image/png", "image/webp"];
  const MAX_HERO_BYTES = 5 * 1024 * 1024; // 5MB

  const handleHeroFileSelect = async (e) => {
    const file = e.target?.files?.[0];
    e.target.value = "";
    setHeroError("");
    if (!file) return;
    if (!ALLOWED_HERO_TYPES.includes(file.type)) {
      setHeroError(t('website.seo.invalid_image'));
      return;
    }
    if (file.size > MAX_HERO_BYTES) {
      setHeroError(t('website.seo.image_size_error'));
      return;
    }
    if (seoLocked) return lockAndNavigate();
    setUploadingHero(true);
    try {
      const formData = new FormData();
      formData.append("heroImage", file);
      const res = await fetch("/api/seo/upload-landing-hero", {
        method: "POST",
        headers: { Authorization: `Bearer ${getToken()}` },
        body: formData,
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error(data.error || data.message || "Upload failed.");
      }
      if (data.seo_landing_hero_url) {
        dispatch(setSEO({ ...seo, seo_landing_hero_url: data.seo_landing_hero_url }));
      }
      toast.success(t('website.seo.hero_updated'));
    } catch (err) {
      setHeroError(err.message || t('website.seo.upload_failed'));
      toast.error(err.message || t('website.seo.upload_failed'));
    } finally {
      setUploadingHero(false);
    }
  };

  const sectionProgress = (items) => {
    const filled = items.filter((i) => hasSeoValue(seo?.[i.field])).length;
    return { filled, total: items.length };
  };

  const addressLine = [
    seo?.geo_street_address,
    [seo?.geo_address_locality, seo?.geo_address_region].filter(Boolean).join(", "),
    seo?.geo_address_country,
  ].filter(Boolean).join(" · ");

  const iconTone = ["", "blue", "amber"];

  return (
    <>
      <style>{css}</style>
      <div className="seo-page">
        <div className="seo-shell">

          <div className="seo-hero">
            <div>
              <div className="seo-kicker"><i className="bi bi-radar" /> SEO & Discovery</div>
              <h1 className="seo-page-title">{t("website.seo.title")}</h1>
              <p className="seo-page-sub">
                One click fills search metadata, local address details, cuisine tags, and nearby cities.
                Edit anything below — Google finds your pages through the sitemap.
              </p>
            </div>
            <button className="btn-ai-generate" onClick={handleGenerate} disabled={generating}>
              <span>
                <span style={{ display: "inline-flex", alignItems: "center", gap: 8 }}>
                  {generating ? <Spinner size="sm" /> : <i className="bi bi-stars" />}
                  {t("website.seo.gen_ai")}
                </span>
                <span className="btn-ai-hint">Autofill everything possible</span>
              </span>
            </button>
          </div>

          <button className="help-row" onClick={() => setShowHelp(!showHelp)}>
            <i className={`bi bi-chevron-${showHelp ? "down" : "right"}`} style={{ fontSize: "0.7rem" }} />
            How this works
          </button>
          <Collapse in={showHelp}>
            <div className="help-content">
              Generate with AI builds professional SEO for your public pages (home, menu, local landings).
              Cuisine tags and nearby cities power your sitemap. Search Console / Bing codes are optional under Advanced.
            </div>
          </Collapse>

          <div className="seo-steps">
            <div className="seo-step">
              <div className="seo-step-n">1</div>
              <div>
                <strong>Generate</strong>
                <span>AI fills meta, content, address, tags & cities</span>
              </div>
            </div>
            <div className="seo-step">
              <div className="seo-step-n">2</div>
              <div>
                <strong>Review</strong>
                <span>Check the checklist and tweak any field</span>
              </div>
            </div>
            <div className="seo-step">
              <div className="seo-step-n">3</div>
              <div>
                <strong>Go live</strong>
                <span>Sitemap exposes your strongest pages to Google</span>
              </div>
            </div>
          </div>

          <div className="seo-top-grid">
            <SEOSummaryCard score={score} seo={seo} />
            <div className="seo-preview-card">
              <div className="seo-preview-label">Google search preview</div>
              <div className="seo-serp">
                <div className="seo-serp-title">{serpTitle || "Page title will appear here"}</div>
                <div className="seo-serp-url">{publicSiteUrl || "https://your-restaurant.com"}</div>
                <div className="seo-serp-desc">{serpDescription || "Your meta description appears here after you generate SEO."}</div>
              </div>
              <div className="seo-preview-meta">
                {publicSiteUrl && (
                  <a
                    className="seo-pill-link"
                    href={`https://search.google.com/test/rich-results?url=${encodeURIComponent(publicSiteUrl)}`}
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    <i className="bi bi-box-arrow-up-right" /> Rich Results test
                  </a>
                )}
                {seo?.seo_auto_updated_at && (
                  <p className="seo-muted-note">
                    Updated {new Date(seo.seo_auto_updated_at).toLocaleString()}
                  </p>
                )}
              </div>
              {seo?.og_image_url && (
                <img
                  src={seo.og_image_url}
                  alt=""
                  style={{ marginTop: 12, width: "100%", maxHeight: 120, objectFit: "cover", borderRadius: 12, border: "1px solid #e2e8f0" }}
                />
              )}
            </div>
          </div>

          {addressLine && (
            <div className="seo-address-card">
              <div className="seo-address-icon"><i className="bi bi-geo-alt-fill" /></div>
              <div>
                <p className="seo-address-title">Formatted local address</p>
                <p className="seo-address-line">{addressLine}</p>
                {(seo?.geo_latitude != null || seo?.geo_longitude != null) && (
                  <p className="seo-address-coords">
                    {seo?.geo_latitude != null && seo?.geo_longitude != null
                      ? `${seo.geo_latitude}, ${seo.geo_longitude}`
                      : "Coordinates pending"}
                  </p>
                )}
              </div>
            </div>
          )}

          <p className="section-divider">{t("website.seo.fields_divider")}</p>

          {SECTIONS.map((section, sIdx) => {
            const prog = sectionProgress(section.items);
            return (
              <div key={sIdx} className="seo-panel">
                <div className="seo-panel-header">
                  <div className={`panel-icon ${iconTone[sIdx] || ""}`}>
                    <i className={`bi ${section.icon}`} />
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <p className="panel-title">{t(section.title)}</p>
                    <p className="panel-desc">{t(section.desc)}</p>
                  </div>
                  <div className="panel-progress">{prog.filled}/{prog.total} ready</div>
                </div>

                {section.items.map((item, iIdx) => {
                  const value = seo?.[item.field];
                  const hasValue = hasSeoValue(value);
                  const open = openRows[`${sIdx}-${iIdx}`];
                  const isEditable = EDITABLE_FIELDS.includes(item.field);
                  const isGeo = GEO_FIELDS.includes(item.field);
                  const isGeoGenerate = isGeo && GEO_GENERATE_FIELDS.includes(item.field);
                  const canEnhance = (ENHANCEABLE_NON_GEO.includes(item.field) || isGeoGenerate) && !hasValue;

                  return (
                    <div key={item.field}>
                      <div className={`field-item${!hasValue ? " field-missing" : ""}`}>
                        <div className="field-left">
                          <span className={`field-dot ${hasValue ? "on" : "off"}`} />
                          <span className="field-name">{item.label}</span>
                          {item.hint && <span className="field-hint-text">{item.hint}</span>}
                          {!hasValue && <span className="tag tag-missing">{t("website.seo.missing")}</span>}
                          {hasValue && <span className="tag tag-filled">{t("website.seo.filled")}</span>}
                          <span className="tag tag-edit">
                            {isEditable ? t("website.seo.editable") : t("website.seo.auto")}
                          </span>
                        </div>
                        <div className="field-right">
                          <button className="btn-toggle" onClick={() => toggleRow(sIdx, iIdx)}>
                            {open ? t("website.seo.hide") : t("website.seo.view")}
                            <i className={`bi bi-chevron-${open ? "up" : "down"}`} style={{ fontSize: "0.65rem" }} />
                          </button>
                          {canEnhance && (
                            <button className="btn-autofill" onClick={() => handleEnhance(item.field)} disabled={loadingField === item.field}>
                              {loadingField === item.field ? <Spinner size="sm" /> : <><i className="bi bi-magic" /> {t("website.seo.auto_fill")}</>}
                            </button>
                          )}
                          {isGeo && !hasValue && !isGeoGenerate && (
                            <button className="btn-setup-link" onClick={() => navigate("/business-setting")}>{t("website.seo.setup")}</button>
                          )}
                        </div>
                      </div>

                      <Collapse in={open}>
                        <div className="field-expand">
                          {isEditable ? (
                            editingField === item.field ? (
                              <div className="edit-wrap">
                                <textarea rows={3} value={editValue} onChange={(e) => setEditValue(e.target.value)} />
                                <div className="edit-actions">
                                  <button className="btn-cancel" onClick={() => setEditingField("")}>{t("orders.details.close")}</button>
                                  <button className="btn-save" disabled={savingField === item.field} onClick={handleSaveEdit}>
                                    {savingField === item.field ? <Spinner size="sm" /> : "Save"}
                                  </button>
                                </div>
                              </div>
                            ) : (
                              <div className="value-display clickable" onClick={() => { setEditingField(item.field); setEditValue(value || ""); }}>
                                {value ? String(value) : <span className="value-placeholder">{t("website.seo.click_to_add")}</span>}
                              </div>
                            )
                          ) : (
                            <div className="value-display">
                              {hasValue
                                ? (typeof value === "object" ? JSON.stringify(value) : String(value))
                                : <span className="value-placeholder">{t("website.seo.synced_notice")}</span>}
                            </div>
                          )}
                        </div>
                      </Collapse>
                    </div>
                  );
                })}
              </div>
            );
          })}

          <p className="section-divider">{t("website.seo.strategy_divider")}</p>

          <div className="seo-panel">
            <div className="seo-panel-header">
              <div className="panel-icon blue"><i className="bi bi-map" /></div>
              <div>
                <p className="panel-title">{t("website.seo.local_targeting")}</p>
                <p className="panel-desc">{t("website.seo.local_targeting_desc")}</p>
              </div>
            </div>
            <div className="seo-panel-body">
              <div className="mb-4">
                <label className="form-field-label">{t("website.seo.hero_image")}</label>
                <p className="seo-muted-note mb-2">{t("website.seo.hero_image_desc")}</p>
                <div className="hero-drop">
                  <div className="hero-thumb">
                    {seo?.seo_landing_hero_url ? (
                      <img src={seo.seo_landing_hero_url} alt="Hero preview" />
                    ) : (
                      t("website.seo.no_image")
                    )}
                  </div>
                  <div>
                    <input type="file" ref={heroInputRef} accept="image/jpeg,image/png,image/webp" onChange={handleHeroFileSelect} className="d-none" />
                    <button type="button" className="btn-autofill" disabled={uploadingHero} onClick={() => heroInputRef.current?.click()}>
                      {uploadingHero ? <><Spinner size="sm" /> {t("website.seo.uploading")}</> : <><i className="bi bi-upload" /> {t("website.seo.upload_image")}</>}
                    </button>
                    {heroError && <p className="text-danger small mt-2 mb-0">{heroError}</p>}
                  </div>
                </div>
              </div>

              <div className="mb-3">
                <label className="form-field-label">{t("website.seo.primary_cuisine")}</label>
                <input className="seo-input" value={masterCuisine} onChange={(e) => setMasterCuisine(e.target.value)} placeholder="e.g. Sushi, Italian, Burgers" />
              </div>

              <div className="landing-grid">
                <div>
                  <div className="label-row">
                    <label className="form-field-label mb-0">{t("website.seo.cuisine_tags")}</label>
                    <button className="btn-suggest" onClick={() => handleSuggestLanding("tags")} disabled={suggestingTags}>
                      {suggestingTags ? <Spinner size="sm" /> : <><i className="bi bi-lightbulb" /> {t("website.seo.suggest")}</>}
                    </button>
                  </div>
                  <p className="seo-muted-note mb-2">Up to 6 strong search intents for /tags pages</p>
                  <div className="seo-tag-row">
                    {cuisineTagList.map((tag, i) => (
                      <span key={i} className="seo-chip">
                        {tag}
                        <button type="button" className="seo-chip-remove" onClick={() => removeCuisineTag(i)} aria-label="Remove">×</button>
                      </span>
                    ))}
                    {!cuisineTagList.length && <span className="seo-muted-note">No tags yet — generate or suggest</span>}
                  </div>
                  <div className="seo-add-inline">
                    <input className="seo-input" value={cuisineTagInput} onChange={(e) => setCuisineTagInput(e.target.value)} onKeyDown={(e) => e.key === "Enter" && (e.preventDefault(), addCuisineTags())} placeholder="e.g. fried rice, sushi" />
                    <button type="button" className="btn-add-tag" onClick={addCuisineTags}>Add</button>
                  </div>
                </div>
                <div>
                  <div className="label-row">
                    <label className="form-field-label mb-0">{t("website.seo.target_cities")}</label>
                    <button className="btn-suggest" onClick={() => handleSuggestLanding("cities")} disabled={suggestingCities}>
                      {suggestingCities ? <Spinner size="sm" /> : <><i className="bi bi-crosshair2" /> {t("website.seo.detect")}</>}
                    </button>
                  </div>
                  <p className="seo-muted-note mb-2">Nearby towns for /places local landings</p>
                  <div className="seo-tag-row">
                    {nearbyCitiesList.map((city, i) => (
                      <span key={i} className="seo-chip city">
                        {city}
                        <button type="button" className="seo-chip-remove" onClick={() => removeNearbyCity(i)} aria-label="Remove">×</button>
                      </span>
                    ))}
                    {!nearbyCitiesList.length && <span className="seo-muted-note">No cities yet — generate or detect</span>}
                  </div>
                  <div className="seo-add-inline">
                    <input className="seo-input" value={nearbyCityInput} onChange={(e) => setNearbyCityInput(e.target.value)} onKeyDown={(e) => e.key === "Enter" && (e.preventDefault(), addNearbyCities())} placeholder="e.g. austin, round rock" />
                    <button type="button" className="btn-add-tag" onClick={addNearbyCities}>Add</button>
                  </div>
                </div>
              </div>

              <div className="landing-footer">
                <button className="btn-save-strategy" onClick={handleSaveLanding} disabled={savingLanding}>
                  {savingLanding ? <Spinner size="sm" /> : t("website.seo.save_strategy")}
                </button>
              </div>
            </div>
          </div>

          <p className="section-divider">Google Search Console & Webmaster Tools</p>
          <div className="seo-panel">
            <div className="seo-panel-header">
              <div className="panel-icon blue"><i className="bi bi-google" /></div>
              <div style={{ flex: 1 }}>
                <p className="panel-title">{t("dashboard.gsc.seo_card_title")}</p>
                <p className="panel-desc">{t("dashboard.gsc.seo_card_desc")}</p>
              </div>
            </div>

            <div className="gsc-card">
              {gscLoading && !gscStatus ? (
                <div style={{ display: "flex", alignItems: "center", gap: 8, color: "#64748b", fontSize: "0.85rem" }}>
                  <Spinner size="sm" /> {t("dashboard.loading_analytics")}
                </div>
              ) : gscStatus?.connected ? (
                <div className="gsc-top-row">
                  <div>
                    <div className="gsc-badge-row">
                      <span className="gsc-badge connected">
                        <i className="bi bi-check-circle-fill" /> {t("dashboard.gsc.connected")}
                      </span>
                      <span className={`gsc-badge ${gscStatus.verified ? "verified" : "unverified"}`}>
                        {gscStatus.verified ? t("dashboard.gsc.badge_verified") : t("dashboard.gsc.badge_unverified")}
                      </span>
                      <span className="gsc-badge sitemap">
                        {t("dashboard.gsc.sitemaps_submitted", {
                          count: Array.isArray(gscStatus.sitemapsSubmitted)
                            ? gscStatus.sitemapsSubmitted.length
                            : 0,
                        })}
                      </span>
                    </div>
                    <p className="gsc-meta-line">
                      <strong>{gscStatus.siteUrl}</strong>
                      {gscStatus.email ? ` · ${gscStatus.email}` : ""}
                    </p>
                    {gscStatus.lastVerificationError && !gscStatus.verified ? (
                      <p className="gsc-meta-line" style={{ color: "#b45309" }}>
                        {gscStatus.lastVerificationError}
                      </p>
                    ) : null}
                  </div>

                  <div className="gsc-actions">
                    <button
                      type="button"
                      className="btn-gsc-primary"
                      onClick={() => navigate("/website-analytics?tab=gsc")}
                    >
                      <i className="bi bi-graph-up-arrow" /> {t("dashboard.gsc.view_analytics_btn")}
                    </button>
                    <button
                      type="button"
                      className="btn-gsc-outline"
                      onClick={handleGscVerifyAndSync}
                      disabled={gscSyncing}
                    >
                      {gscSyncing ? <Spinner size="sm" /> : <i className="bi bi-arrow-repeat" />}
                      {gscSyncing ? t("dashboard.gsc.syncing") : t("dashboard.gsc.verify_and_sync_btn")}
                    </button>
                    <button
                      type="button"
                      className="btn-gsc-danger"
                      onClick={handleGscDisconnect}
                    >
                      {t("dashboard.gsc.disconnect_btn")}
                    </button>
                  </div>
                </div>
              ) : (
                <div className="gsc-top-row">
                  <div>
                    <div className="gsc-badge-row">
                      <span className="gsc-badge disconnected">{t("dashboard.gsc.not_connected_badge")}</span>
                    </div>
                    <p className="gsc-meta-line">
                      {t("dashboard.gsc.not_connected_desc")}
                      {gscStatus?.resolvedSiteUrl ? ` (${gscStatus.resolvedSiteUrl})` : ""}
                    </p>
                  </div>
                  <div className="gsc-actions">
                    <button
                      type="button"
                      className="btn-gsc-primary"
                      onClick={handleGscConnect}
                      disabled={gscConnecting}
                    >
                      {gscConnecting ? <Spinner size="sm" /> : <i className="bi bi-google" />}
                      {gscConnecting ? t("dashboard.gsc.connecting") : t("dashboard.gsc.connect_button")}
                    </button>
                  </div>
                </div>
              )}
            </div>

            <button
              type="button"
              className="seo-panel-header"
              onClick={() => setShowAdvanced(!showAdvanced)}
              style={{ width: "100%", background: "none", border: "none", cursor: "pointer", textAlign: "left" }}
            >
              <div className="panel-icon slate"><i className="bi bi-shield-check" /></div>
              <div style={{ flex: 1 }}>
                <p className="panel-title">Manual Verification Meta Tags (Google & Bing)</p>
                <p className="panel-desc">Auto-filled when connecting Google Search Console above, or paste manually.</p>
              </div>
              <i className={`bi bi-chevron-${showAdvanced ? "up" : "down"}`} style={{ color: "#94a3b8" }} />
            </button>
            <Collapse in={showAdvanced}>
              <div>
                {ADVANCED_FIELDS.map((item) => {
                  const value = seo?.[item.field];
                  const hasValue = hasSeoValue(value);
                  const open = openRows[`adv-${item.field}`];
                  return (
                    <div key={item.field}>
                      <div className={`field-item${!hasValue ? " field-missing" : ""}`}>
                        <div className="field-left">
                          <span className={`field-dot ${hasValue ? "on" : "off"}`} />
                          <span className="field-name">{item.label}</span>
                          {item.hint && <span className="field-hint-text">{item.hint}</span>}
                          {!hasValue && <span className="tag tag-missing">{t("website.seo.missing")}</span>}
                          {hasValue && <span className="tag tag-filled">{t("website.seo.filled")}</span>}
                        </div>
                        <div className="field-right">
                          <button
                            className="btn-toggle"
                            onClick={() =>
                              setOpenRows((prev) => ({
                                ...prev,
                                [`adv-${item.field}`]: !prev[`adv-${item.field}`],
                              }))
                            }
                          >
                            {open ? t("website.seo.hide") : t("website.seo.view")}
                            <i className={`bi bi-chevron-${open ? "up" : "down"}`} style={{ fontSize: "0.65rem" }} />
                          </button>
                        </div>
                      </div>
                      <Collapse in={open}>
                        <div className="field-expand">
                          {editingField === item.field ? (
                            <div className="edit-wrap">
                              <textarea rows={2} value={editValue} onChange={(e) => setEditValue(e.target.value)} />
                              <div className="edit-actions">
                                <button className="btn-cancel" onClick={() => setEditingField("")}>{t("orders.details.close")}</button>
                                <button className="btn-save" disabled={savingField === item.field} onClick={handleSaveEdit}>
                                  {savingField === item.field ? <Spinner size="sm" /> : "Save"}
                                </button>
                              </div>
                            </div>
                          ) : (
                            <div
                              className="value-display clickable"
                              onClick={() => {
                                setEditingField(item.field);
                                setEditValue(value || "");
                              }}
                            >
                              {value ? String(value) : <span className="value-placeholder">{t("website.seo.click_to_add")}</span>}
                            </div>
                          )}
                        </div>
                      </Collapse>
                    </div>
                  );
                })}
              </div>
            </Collapse>
          </div>

        </div>

        <Modal show={showMissingModal} onHide={() => setShowMissingModal(false)} centered>
          <Modal.Header closeButton>
            <Modal.Title>{t("website.seo.missing_info_title")}</Modal.Title>
          </Modal.Header>
          <Modal.Body>
            <p style={{ fontSize: "0.875rem", color: "#64748b", marginBottom: "1rem" }}>
              {t("website.seo.missing_info_desc")}
            </p>
            <div className="mb-3">
              <label className="modal-label">{t("website.seo.cuisine_type")}</label>
              <input className="modal-input" value={missingCuisine} onChange={(e) => setMissingCuisine(e.target.value)} placeholder="e.g. Mexican" />
            </div>
            <div>
              <label className="modal-label">{t("website.seo.city")}</label>
              <input className="modal-input" value={missingCity} onChange={(e) => setMissingCity(e.target.value)} placeholder="e.g. Denver, CO" />
            </div>
          </Modal.Body>
          <Modal.Footer>
            <button className="btn-modal-cancel" onClick={() => setShowMissingModal(false)}>{t("orders.details.close")}</button>
            <button className="btn-modal-confirm" onClick={handleMissingModalSubmit}>{t("website.seo.generate_now")}</button>
          </Modal.Footer>
        </Modal>

        <Modal show={showChecklistModal} onHide={() => setShowChecklistModal(false)} centered size="lg">
          <Modal.Header closeButton>
            <Modal.Title>SEO ready — finish these next</Modal.Title>
          </Modal.Header>
          <Modal.Body>
            <p style={{ fontSize: "0.875rem", color: "#64748b", marginBottom: "1rem" }}>
              We autofilled everything we could. Complete the items below if needed — you can edit any field on this page.
            </p>
            <ul className="checklist-list">
              {checklistItems.map((item) => (
                <li key={item.id || item.label} className="checklist-item">
                  <i className="bi bi-exclamation-circle" />
                  <div>
                    <strong>{item.label}</strong>
                    {item.detail && <span>{item.detail}</span>}
                  </div>
                </li>
              ))}
            </ul>
          </Modal.Body>
          <Modal.Footer>
            <button
              className="btn-modal-confirm"
              onClick={() => {
                setShowChecklistModal(false);
                toast.success(t("website.seo.gen_success"));
              }}
            >
              Got it
            </button>
          </Modal.Footer>
        </Modal>

        <Modal show={generating} centered backdrop="static" contentClassName="border-0">
          <Modal.Body className="text-center py-4">
            <Lottie animationData={seoLoading} loop style={{ height: 120, margin: "0 auto" }} />
            <p className="gen-title">{t("website.seo.generating")}</p>
            <p className="gen-sub">Filling meta, content, address, cuisine tags, and nearby cities…</p>
          </Modal.Body>
        </Modal>

        <ToastContainer position="bottom-right" theme="light" />
      </div>
    </>
  );
}

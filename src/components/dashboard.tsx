"use client";

import {
  useEffect,
  useMemo,
  useState,
  type FormEvent,
  type ReactNode,
} from "react";
import {
  Activity,
  ArrowRight,
  ArrowUpRight,
  Bell,
  BookOpen,
  CalendarDays,
  Check,
  CheckCircle2,
  ChevronDown,
  CircleAlert,
  Clock3,
  Download,
  Droplets,
  FlaskConical,
  Grid2X2,
  LayoutDashboard,
  Leaf,
  LoaderCircle,
  MapPin,
  Menu,
  Plus,
  RotateCcw,
  Search,
  Settings,
  Sprout,
  Sun,
  TrendingUp,
  UserRound,
  Wheat,
  X,
  type LucideIcon,
} from "lucide-react";
import { PlotCard, getPhStatus } from "@/components/plot-card";
import { RotationEngine } from "@/components/rotation-engine";
import { SoilForm, type SoilTestInput } from "@/components/soil-form";
import type { Crop, DashboardData, Farm, Planting, Plot } from "@/types/garden";

const NAV_ITEMS: { id: ViewName; label: string; icon: LucideIcon }[] = [
  { id: "overview", label: "Ringkasan", icon: LayoutDashboard },
  { id: "plots", label: "Petak kebun", icon: Grid2X2 },
  { id: "rotation", label: "Rotasi tanaman", icon: RotateCcw },
  { id: "history", label: "Riwayat tanam", icon: BookOpen },
  { id: "soil", label: "Kesehatan tanah", icon: FlaskConical },
];

type ViewName = "overview" | "plots" | "rotation" | "history" | "soil";
type ModalName = "farm" | "plot" | "planting" | null;
type ToastState = { message: string; tone: "success" | "error" } | null;
type PlantingDraft = {
  plotId: number;
  cropId: number;
  plantedOn: string;
  harvestedOn: string;
  notes: string;
  confirmRotation: boolean;
};
type HarvestTarget = Planting & { plotName: string };
type ActionItem = {
  icon: LucideIcon;
  title: string;
  description: string;
  action: string;
  tone: string;
  onClick: () => void;
};
type PlantingWithPlot = Planting & { plotName: string };
type DashboardSnapshot = {
  key: string;
  data: DashboardData | null;
  error: string;
};

function todayLocal() {
  const date = new Date();
  return new Date(date.getTime() - date.getTimezoneOffset() * 60000).toISOString().slice(0, 10);
}

function formatDate(value: string | null | undefined, options: Intl.DateTimeFormatOptions = {}) {
  if (!value) return "—";
  const date = new Date(`${value.slice(0, 10)}T12:00:00`);
  return new Intl.DateTimeFormat("id-ID", {
    day: "numeric",
    month: "short",
    year: "numeric",
    ...options,
  }).format(date);
}

function daysSince(value: string) {
  const date = new Date(`${value.slice(0, 10)}T00:00:00`);
  return Math.max(0, Math.floor((Date.now() - date.getTime()) / 86400000));
}

function greeting() {
  const hour = new Date().getHours();
  if (hour < 11) return "Selamat pagi";
  if (hour < 15) return "Selamat siang";
  if (hour < 19) return "Selamat sore";
  return "Selamat malam";
}

async function postJson<T>(url: string, body: unknown): Promise<T> {
  const response = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  const payload = (await response.json().catch(() => ({}))) as {
    error?: string;
    warning?: string;
  };
  if (!response.ok) {
    throw new Error(payload.warning ?? payload.error ?? "Permintaan belum dapat diproses.");
  }
  return payload as T;
}

function getPageTitle(view: ViewName, detail: boolean) {
  if (detail) return "Detail petak";
  switch (view) {
    case "plots": return "Petak kebun";
    case "rotation": return "Rotasi tanaman";
    case "history": return "Riwayat tanam";
    case "soil": return "Kesehatan tanah";
    default: return "Ringkasan";
  }
}

export function Dashboard() {
  const [snapshot, setSnapshot] = useState<DashboardSnapshot>({ key: "", data: null, error: "" });
  const [farmChoice, setFarmChoice] = useState<number | "auto">("auto");
  const [activeView, setActiveView] = useState<ViewName>("overview");
  const [plotDetailId, setPlotDetailId] = useState<number | null>(null);
  const [refreshVersion, setRefreshVersion] = useState(0);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [notificationOpen, setNotificationOpen] = useState(false);
  const [modal, setModal] = useState<ModalName>(null);
  const [plantingDefaults, setPlantingDefaults] = useState<{ plotId?: number; cropId?: number }>({});
  const [harvestTarget, setHarvestTarget] = useState<HarvestTarget | null>(null);
  const [toast, setToast] = useState<ToastState>(null);
  const [soilSaving, setSoilSaving] = useState(false);
  const [soilPreferredPlotId, setSoilPreferredPlotId] = useState<number | undefined>(undefined);
  const [historyPlotFilter, setHistoryPlotFilter] = useState<number | "all">("all");

  const dashboardUrl = farmChoice === "auto" ? "/api/dashboard" : `/api/dashboard?farmId=${farmChoice}`;
  const requestKey = `${dashboardUrl}::${refreshVersion}`;

  useEffect(() => {
    const controller = new AbortController();

    fetch(dashboardUrl, { signal: controller.signal })
      .then(async (response) => {
        const payload = await response.json();
        if (!response.ok) throw new Error(payload.error ?? "Ringkasan kebun belum dapat dimuat.");
        setSnapshot({ key: requestKey, data: payload as DashboardData, error: "" });
      })
      .catch((error: unknown) => {
        if (error instanceof Error && error.name === "AbortError") return;
        setSnapshot((current) => ({
          key: requestKey,
          data: current.data,
          error: error instanceof Error ? error.message : "Ringkasan kebun belum dapat dimuat.",
        }));
      });

    return () => controller.abort();
  }, [dashboardUrl, requestKey]);

  useEffect(() => {
    if (!toast) return;
    const timer = window.setTimeout(() => setToast(null), 4200);
    return () => window.clearTimeout(timer);
  }, [toast]);

  useEffect(() => {
    if (!modal && !harvestTarget) return;
    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        setModal(null);
        setHarvestTarget(null);
      }
    }
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [modal, harvestTarget]);

  const data = snapshot.data;
  const loading = snapshot.key !== requestKey;
  const loadError = snapshot.error;
  const plots = useMemo(() => data?.plots ?? [], [data]);
  const crops = useMemo(() => data?.crops ?? [], [data]);
  const farms = useMemo(() => data?.farms ?? [], [data]);
  const activeFarmId = farmChoice === "auto" ? (data?.selectedFarmId ?? null) : farmChoice;
  const activeFarm = farms.find((farm) => farm.id === activeFarmId) ?? farms[0] ?? null;
  const allPlantings = useMemo<PlantingWithPlot[]>(() =>
    plots
      .flatMap((plot) => plot.plantings.map((planting) => ({ ...planting, plotName: plot.name })))
      .sort((a, b) => b.plantedOn.localeCompare(a.plantedOn) || b.id - a.id),
  [plots]);
  const activePlantings = allPlantings.filter((planting) => !planting.harvestedOn);
  const soilReadings = plots.flatMap((plot) => plot.latestSoil ? [plot.latestSoil] : []);
  const averagePh = soilReadings.length
    ? soilReadings.reduce((sum, reading) => sum + reading.ph, 0) / soilReadings.length
    : null;
  const readyToCheck = activePlantings.find((planting) => daysSince(planting.plantedOn) >= 65);
  const pageTitle = getPageTitle(activeView, activeView === "plots" && plotDetailId !== null);
  const dateLabel = new Intl.DateTimeFormat("id-ID", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
  }).format(new Date());

  function showToast(message: string, tone: "success" | "error" = "success") {
    setToast({ message, tone });
  }

  function openPlanting(plotId?: number, cropId?: number) {
    if (plots.length === 0) {
      setModal("plot");
      showToast("Tambahkan petak terlebih dahulu sebelum mencatat tanaman.", "error");
      return;
    }
    setPlantingDefaults({ plotId, cropId });
    setModal("planting");
  }

  async function saveFarm(values: { name: string; location: string }) {
    const result = await postJson<{ farm: Farm }>("/api/farms", values);
    setModal(null);
    setFarmChoice(result.farm.id);
    setActiveView("overview");
    setPlotDetailId(null);
    setRefreshVersion((version) => version + 1);
    showToast(`${result.farm.name} berhasil dibuat.`);
  }

  async function savePlot(values: { name: string; area: number; soilType: string }) {
    if (!activeFarmId) throw new Error("Pilih kebun terlebih dahulu.");
    await postJson("/api/plots", { ...values, farmId: activeFarmId });
    setModal(null);
    setRefreshVersion((version) => version + 1);
    showToast(`${values.name} berhasil ditambahkan ke kebun.`);
  }

  async function savePlanting(values: PlantingDraft) {
    await postJson("/api/plantings", values);
    setModal(null);
    setRefreshVersion((version) => version + 1);
    showToast("Catatan tanam tersimpan. Semoga tumbuh subur!");
  }

  async function saveHarvest(plantingId: number, harvestedOn: string) {
    await postJson("/api/plantings/harvest", { plantingId, harvestedOn });
    setHarvestTarget(null);
    setRefreshVersion((version) => version + 1);
    showToast("Panen berhasil dicatat. Selamat menikmati hasilnya!");
  }

  async function saveSoilTest(values: SoilTestInput) {
    setSoilSaving(true);
    try {
      await postJson("/api/soil-tests", values);
      setRefreshVersion((version) => version + 1);
      showToast("Hasil uji tanah berhasil disimpan.");
    } finally {
      setSoilSaving(false);
    }
  }

  function markHarvest(planting: PlantingWithPlot) {
    setHarvestTarget(planting);
  }

  function changeView(view: ViewName) {
    setActiveView(view);
    setPlotDetailId(null);
    setMobileMenuOpen(false);
    setNotificationOpen(false);
  }

  const actionItems: ActionItem[] = [
    readyToCheck
      ? {
          icon: Wheat,
          title: "Periksa kesiapan panen",
          description: `${readyToCheck.commonName} · ${readyToCheck.plotName} · ${daysSince(readyToCheck.plantedOn)} hari`,
          action: "Catat panen",
          tone: "harvest",
          onClick: () => markHarvest(readyToCheck),
        }
      : {
          icon: Sprout,
          title: "Pantau pertumbuhan tanaman",
          description: activePlantings[0]
            ? `${activePlantings[0].commonName} tumbuh di ${activePlantings[0].plotName}`
            : "Catat tanaman pertama untuk memulai siklus kebun.",
          action: activePlantings.length ? "Lihat riwayat" : "Catat tanaman",
          tone: "growth",
          onClick: () => activePlantings.length ? changeView("history") : openPlanting(),
        },
    {
      icon: RotateCcw,
      title: "Rencanakan rotasi berikutnya",
      description: "Pilih keluarga tanaman berbeda untuk musim baru.",
      action: "Buka rekomendasi",
      tone: "rotation",
      onClick: () => changeView("rotation"),
    },
    {
      icon: FlaskConical,
      title: averagePh !== null && (averagePh < 5.5 || averagePh > 7.5) ? "Periksa keseimbangan pH" : "Catat kondisi tanah",
      description: soilReadings[0]
        ? `Pemeriksaan terakhir ${formatDate(soilReadings[0].testedOn)} · pH rata-rata ${averagePh?.toFixed(1)}`
        : "Simpan hasil uji agar kondisi tanah mudah dipantau.",
      action: "Lihat kesehatan tanah",
      tone: "soil",
      onClick: () => changeView("soil"),
    },
  ];

  if (loading && !data) {
    return (
      <main className="startup-state">
        <div className="startup-brand"><span className="brand-mark"><Sprout size={23} /></span><span>TerraSiklus</span></div>
        <LoaderCircle className="spin startup-spinner" size={26} />
        <p>Menyiapkan ruang tumbuhmu…</p>
      </main>
    );
  }

  if (!data) {
    return (
      <main className="startup-state startup-error">
        <div className="startup-brand"><span className="brand-mark"><Sprout size={23} /></span><span>TerraSiklus</span></div>
        <div className="error-emblem"><CircleAlert size={24} /></div>
        <h1>Kebun belum dapat dibuka</h1>
        <p>{loadError || "Periksa koneksi basis data, lalu coba lagi."}</p>
        <button type="button" className="button button-primary" onClick={() => setRefreshVersion((version) => version + 1)}>
          Coba lagi <ArrowRight size={16} />
        </button>
      </main>
    );
  }

  return (
    <div className="app-shell">
      {mobileMenuOpen && <button className="mobile-sidebar-scrim" aria-label="Tutup menu" onClick={() => setMobileMenuOpen(false)} />}
      <aside className={`sidebar ${mobileMenuOpen ? "sidebar-open" : ""}`}>
        <div className="sidebar-brand-row">
          <div className="brand-mark"><Sprout size={23} strokeWidth={2.1} /></div>
          <div className="brand-wordmark"><span>TerraSiklus</span><small>RUANG TUMBUH BERSAMA</small></div>
          <button className="sidebar-close mobile-only" aria-label="Tutup menu" onClick={() => setMobileMenuOpen(false)}><X size={19} /></button>
        </div>

        <div className="sidebar-current-garden">
          <span className="sidebar-garden-dot"><Leaf size={14} /></span>
          <span><small>KEBUN AKTIF</small><strong>{activeFarm?.name ?? "Kebun saya"}</strong></span>
          <span className="garden-live-dot" />
        </div>

        <div className="sidebar-nav-label">MENU UTAMA</div>
        <nav className="sidebar-nav" aria-label="Navigasi utama">
          {NAV_ITEMS.map(({ id, label, icon: Icon }) => (
            <button
              type="button"
              className={`nav-link ${activeView === id ? "nav-link-active" : ""}`}
              key={id}
              onClick={() => changeView(id)}
            >
              <Icon size={18} strokeWidth={1.8} />
              <span>{label}</span>
              {id === "plots" && <span className="nav-count">{plots.length}</span>}
              {activeView === id && <span className="nav-active-line" />}
            </button>
          ))}
        </nav>

        <div className="sidebar-season-card">
          <div className="season-card-top"><span><Sun size={15} /></span><small>MUSIM TANAM</small></div>
          <strong>Rawat hari ini,<br />panen esok hari.</strong>
          <p>Langkah kecil menjaga tanah tetap hidup.</p>
          <button type="button" onClick={() => changeView("rotation")}>Jelajahi rotasi <ArrowRight size={14} /></button>
          <div className="season-leaf-decoration"><Leaf size={57} strokeWidth={0.8} /></div>
        </div>

        <button className="sidebar-add-garden" type="button" onClick={() => setModal("farm")}>
          <span><Plus size={16} /></span><span>Tambah kebun</span><ArrowUpRight size={14} className="sidebar-add-arrow" />
        </button>

        <div className="sidebar-bottom">
          <a className="sidebar-source-link" href="/terrasiklus-source.zip" download>
            <span><Download size={14} /></span>
            <span><strong>Unduh Source Code</strong><small>Source code lengkap TerraSiklus</small></span>
          </a>
          <div className="sidebar-help-line"><span className="help-sprout"><Sprout size={17} /></span><span>Setiap musim adalah<br />kesempatan untuk tumbuh.</span></div>
          <div className="sidebar-user-row">
            <div className="user-avatar sidebar-avatar">R</div>
            <span><strong>Rani Putri</strong><small>Pekebun rumahan</small></span>
            <button type="button" aria-label="Pengaturan profil" onClick={() => showToast("Pengaturan profil akan tersedia setelah akun terhubung.", "success")}><Settings size={16} /></button>
          </div>
        </div>
      </aside>

      <div className="app-main">
        <header className="topbar">
          <div className="topbar-left">
            <button type="button" className="mobile-menu-button" aria-label="Buka menu" onClick={() => setMobileMenuOpen(true)}><Menu size={21} /></button>
            <div className="breadcrumb"><span>Ruang kebun</span><span className="breadcrumb-divider">/</span><strong>{pageTitle}</strong></div>
          </div>
          <div className="topbar-tools">
            {searchOpen ? (
              <div className="top-search-box">
                <Search size={16} />
                <input autoFocus aria-label="Cari tanaman atau petak" placeholder="Cari tanaman atau petak…" value={searchQuery} onChange={(event) => setSearchQuery(event.target.value)} />
                <button type="button" aria-label="Tutup pencarian" onClick={() => { setSearchOpen(false); setSearchQuery(""); }}><X size={15} /></button>
              </div>
            ) : (
              <button type="button" className="top-icon-button" aria-label="Cari" onClick={() => setSearchOpen(true)}><Search size={18} /></button>
            )}
            <div className="notification-wrap">
              <button type="button" className={`top-icon-button notification-button ${notificationOpen ? "top-icon-active" : ""}`} aria-label="Notifikasi kebun" onClick={() => setNotificationOpen((open) => !open)}>
                <Bell size={18} />{activePlantings.length > 0 && <span className="notification-dot" />}
              </button>
              {notificationOpen && (
                <div className="notification-popover">
                  <div className="popover-heading"><strong>Pengingat kebun</strong><span>{activePlantings.length} tanaman aktif</span></div>
                  {readyToCheck ? (
                    <button type="button" className="notification-item" onClick={() => { markHarvest(readyToCheck); setNotificationOpen(false); }}>
                      <span className="notification-item-icon"><Wheat size={16} /></span><span><strong>Periksa kesiapan panen</strong><small>{readyToCheck.commonName} · {readyToCheck.plotName}</small></span>
                    </button>
                  ) : (
                    <button type="button" className="notification-item" onClick={() => { changeView("history"); setNotificationOpen(false); }}>
                      <span className="notification-item-icon"><Sprout size={16} /></span><span><strong>Pantau tanaman aktif</strong><small>{activePlantings.length} tanaman sedang tumbuh</small></span>
                    </button>
                  )}
                  <button type="button" className="notification-item" onClick={() => { changeView("soil"); setNotificationOpen(false); }}>
                    <span className="notification-item-icon soil-notification-icon"><FlaskConical size={16} /></span><span><strong>Kesehatan tanah</strong><small>Lihat pH dan nutrisi terbaru</small></span>
                  </button>
                </div>
              )}
            </div>
            <div className="topbar-divider" />
            <button type="button" className="profile-button" onClick={() => showToast("Halo, Rani! Kebunmu tampak tumbuh baik hari ini.") }>
              <span className="user-avatar top-avatar">R</span><span className="profile-name">Rani</span><ChevronDown size={14} />
            </button>
          </div>
        </header>

        <main className="content-area">
          {loading && <div className="refreshing-strip"><LoaderCircle size={13} className="spin" /> Memperbarui data kebun…</div>}
          {loadError && data && <div className="inline-error"><CircleAlert size={18} />{loadError}</div>}
          <div className="page-heading-row">
            <div className="page-heading-copy">
              <div className="date-eyebrow"><CalendarDays size={14} />{dateLabel}</div>
              <h1>{activeView === "overview" && !plotDetailId ? <>{greeting()}, Rani <span className="heading-sprout">✳</span></> : activeView === "plots" && plotDetailId ? "Ruang tumbuhmu" : activeView === "overview" ? "Ringkasan kebun" : activeView === "plots" ? "Kebunmu, petak demi petak" : activeView === "rotation" ? "Rotasi yang menjaga kesuburan" : activeView === "history" ? "Catatan perjalanan kebun" : "Mengenal kesehatan tanah"}</h1>
              <p>{activeView === "overview" && !plotDetailId ? "Kebunmu tumbuh dengan baik. Ini kabar terbaru dari ruang hijau kecilmu." : activeView === "plots" && plotDetailId ? "Lihat cerita, kondisi tanah, dan musim tanam di setiap petak." : activeView === "overview" ? "Pantau perkembangan kebun dan pilih langkah kecil berikutnya." : activeView === "plots" ? "Semua petak, tanaman, dan kondisi tanah dalam satu tempat." : activeView === "rotation" ? "Putus siklus hama, pulihkan hara, dan rencanakan musim berikutnya." : activeView === "history" ? "Setiap catatan membantu musim berikutnya tumbuh lebih baik." : "Catat hasil uji dan jaga tanah tetap seimbang dari waktu ke waktu."}</p>
            </div>
            <div className="page-heading-actions">
              <label className="farm-select-wrap" aria-label="Pilih kebun">
                <MapPin size={16} />
                <select
                  value={activeFarm?.id ?? ""}
                  onChange={(event) => {
                    setPlotDetailId(null);
                    setSoilPreferredPlotId(undefined);
                    const nextFarmId = Number(event.target.value);
                    setFarmChoice(nextFarmId === data?.selectedFarmId ? "auto" : nextFarmId);
                  }}
                >
                  {farms.map((farm) => <option value={farm.id} key={farm.id}>{farm.name}</option>)}
                </select>
                <ChevronDown size={14} />
              </label>
              {activeView === "plots" ? (
                <button type="button" className="button button-primary" onClick={() => setModal("plot")}><Plus size={17} />Tambah petak</button>
              ) : activeView === "soil" ? (
                <button type="button" className="button button-primary" onClick={() => changeView("plots")}><Grid2X2 size={16} />Lihat petak</button>
              ) : (
                <button type="button" className="button button-primary" onClick={() => openPlanting()}><Plus size={17} />Catat penanaman</button>
              )}
            </div>
          </div>

          {activeView === "overview" && (
            <>
              <section className="hero-card">
                <div className="hero-glow hero-glow-one" />
                <div className="hero-glow hero-glow-two" />
                <div className="hero-copy">
                  <span className="hero-kicker"><span className="hero-kicker-dot" /> ROTASI CERDAS <span className="hero-kicker-separator">·</span> {plots.length} PETAK AKTIF</span>
                  <h2>Tanah sehat,<br />panen makin <em>bermakna.</em></h2>
                  <p>Rencanakan tanaman dengan bijak. Biar alam bekerja bersama kebunmu, musim demi musim.</p>
                  <button type="button" className="hero-button" onClick={() => changeView("rotation")}>Lihat rekomendasi rotasi <ArrowRight size={16} /></button>
                </div>
                <div className="hero-art" aria-hidden="true">
                  <div className="hero-sun-circle" />
                  <div className="hero-art-ring" />
                  <div className="hero-art-ground" />
                  <svg className="hero-plant-art" viewBox="0 0 340 260" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <path d="M168 250C169 210 165 166 170 121C173 96 174 72 171 48" stroke="#D6E7AE" strokeWidth="5" strokeLinecap="round" />
                    <path d="M169 182C141 164 122 149 105 126" stroke="#D6E7AE" strokeWidth="4" strokeLinecap="round" />
                    <path d="M170 154C197 139 217 122 235 99" stroke="#D6E7AE" strokeWidth="4" strokeLinecap="round" />
                    <path d="M170 120C148 105 137 88 130 67" stroke="#D6E7AE" strokeWidth="4" strokeLinecap="round" />
                    <path d="M171 88C191 76 204 59 211 38" stroke="#D6E7AE" strokeWidth="4" strokeLinecap="round" />
                    <path d="M104 127C91 103 98 83 121 77C140 91 141 111 122 127C115 131 110 130 104 127Z" fill="#B8D38D" />
                    <path d="M236 101C239 75 256 63 278 73C282 96 270 112 247 112C242 110 238 106 236 101Z" fill="#D0E4A4" />
                    <path d="M129 68C125 43 138 27 161 29C172 50 164 69 143 77C137 76 132 73 129 68Z" fill="#92B476" />
                    <path d="M210 38C214 14 232 3 252 16C253 39 238 52 216 49C213 46 211 42 210 38Z" fill="#BDD693" />
                    <path d="M170 48C153 32 154 11 174 0C195 12 196 32 179 48C176 49 173 49 170 48Z" fill="#DDEAB9" />
                    <path d="M75 255H267" stroke="#D6E7AE" strokeWidth="3" strokeLinecap="round" opacity=".55" />
                    <path d="M91 254C99 237 108 229 121 224M244 254C235 236 226 229 212 224" stroke="#D6E7AE" strokeWidth="3" strokeLinecap="round" opacity=".55" />
                    <path d="M122 224C127 214 138 213 143 222C140 232 131 235 122 224Z" fill="#B8D38D" />
                    <path d="M211 224C216 214 227 213 232 222C229 232 220 235 211 224Z" fill="#B8D38D" />
                  </svg>
                  <div className="hero-art-label"><span className="hero-art-label-icon"><Check size={13} /></span><span><strong>Siklus terjaga</strong><small>Tanah tetap berdaya</small></span></div>
                  <div className="hero-art-leaf"><Leaf size={17} /></div>
                </div>
                <div className="hero-bottom-text"><span><Sprout size={14} /> Tumbuh selaras dengan alam</span><span className="hero-bottom-line" /></div>
              </section>

              <section className="metrics-grid" aria-label="Ringkasan kebun">
                <MetricCard icon={Grid2X2} label="Petak dikelola" value={String(plots.length).padStart(2, "0")} suffix="petak" note={`${formatNumber(plots.reduce((sum, plot) => sum + plot.area, 0))} m² ruang tumbuh`} tone="green" />
                <MetricCard icon={Sprout} label="Tanaman tumbuh" value={String(activePlantings.length).padStart(2, "0")} suffix="tanaman" note="Sedang berkembang di kebun" tone="sage" />
                <MetricCard icon={Wheat} label="Siap diperiksa" value={String(activePlantings.filter((item) => daysSince(item.plantedOn) >= 65).length).padStart(2, "0")} suffix="petak" note="Lihat perkembangan panen" tone="gold" />
                <MetricCard icon={Droplets} label="pH rata-rata" value={averagePh !== null ? averagePh.toFixed(1) : "—"} suffix="pH" note={averagePh !== null ? getPhStatus(averagePh).label + " untuk sebagian besar tanaman" : "Catat uji tanah pertamamu"} tone="blue" />
              </section>

              <div className="overview-main-grid">
                <section className="panel plot-overview-panel">
                  <div className="panel-heading">
                    <div><span className="section-kicker">RUANG TUMBUH</span><h2>Petak kebunmu</h2><p>Lihat apa yang sedang tumbuh di setiap sudut.</p></div>
                    <button type="button" className="text-link" onClick={() => changeView("plots")}>Semua petak <ArrowRight size={15} /></button>
                  </div>
                  {plots.length ? (
                    <div className="plot-cards-grid">
                      {plots.slice(0, 3).map((plot, index) => (
                        <PlotCard key={plot.id} plot={plot} index={index} onClick={() => { setPlotDetailId(plot.id); setActiveView("plots"); }} />
                      ))}
                    </div>
                  ) : (
                    <EmptyState title="Belum ada petak di kebun ini" description="Tambahkan petak pertama untuk mulai mencatat tanaman dan kesehatan tanah." actionLabel="Tambah petak" onAction={() => setModal("plot")} />
                  )}
                </section>

                <section className="panel next-actions-panel">
                  <div className="panel-heading action-panel-heading">
                    <div><span className="section-kicker">LANGKAH KECIL BERIKUTNYA</span><h2>Aksi berikutnya</h2><p>Perawatan sederhana, dampak besar.</p></div>
                    <span className="action-sparkle"><Activity size={17} /></span>
                  </div>
                  <div className="action-list">
                    {actionItems.map((item, index) => {
                      const Icon = item.icon;
                      return (
                        <div className="action-row" key={`${item.tone}-${index}`}>
                          <div className={`action-icon action-icon-${item.tone}`}><Icon size={17} /></div>
                          <div className="action-content"><strong>{item.title}</strong><p>{item.description}</p><button type="button" onClick={item.onClick}>{item.action}<ArrowRight size={13} /></button></div>
                          {index === 0 && <span className="action-priority">SEGERA</span>}
                        </div>
                      );
                    })}
                  </div>
                  <div className="action-panel-footer"><span className="footer-check"><Check size={13} /></span> Semua langkah, dimulai dari merawat tanah.</div>
                </section>
              </div>

              <div className="overview-bottom-grid">
                <section className="panel recent-activity-panel">
                  <div className="panel-heading">
                    <div><span className="section-kicker">JEJAK MUSIM</span><h2>Aktivitas terbaru</h2><p>Perjalanan kecil yang membentuk kebunmu.</p></div>
                    <button type="button" className="text-link" onClick={() => changeView("history")}>Lihat riwayat <ArrowRight size={15} /></button>
                  </div>
                  {allPlantings.length ? (
                    <div className="activity-timeline">
                      {allPlantings.slice(0, 4).map((planting, index) => (
                        <div className="activity-row" key={planting.id}>
                          <span className={`activity-timeline-icon timeline-tone-${index % 3}`}><Leaf size={14} /></span>
                          <div className="activity-main"><strong>{planting.harvestedOn ? `Panen ${planting.commonName}` : `Menanam ${planting.commonName}`}</strong><span>{planting.plotName} <i /> {planting.familyName}</span></div>
                          <span className="activity-date">{formatDate(planting.harvestedOn ?? planting.plantedOn)}</span>
                          {!planting.harvestedOn && <span className="activity-status">Tumbuh</span>}
                        </div>
                      ))}
                    </div>
                  ) : <p className="small-empty-copy">Belum ada aktivitas. Catat penanaman pertamamu.</p>}
                </section>

                <section className="soil-spotlight-card">
                  <div className="soil-spotlight-orb" />
                  <div className="spotlight-top"><span className="spotlight-icon"><FlaskConical size={17} /></span><span>KESEHATAN TANAH</span><button type="button" aria-label="Lihat kesehatan tanah" onClick={() => changeView("soil")}><ArrowUpRight size={16} /></button></div>
                  <div className="spotlight-value-row"><strong>{averagePh !== null ? averagePh.toFixed(1) : "—"}</strong><span>pH rata-rata</span><span className={`soil-good-pill ${averagePh !== null && (averagePh < 5.5 || averagePh > 7.5) ? "soil-pill-warning" : ""}`}><span />{averagePh !== null ? getPhStatus(averagePh).label : "Belum diuji"}</span></div>
                  <div className="ph-scale"><span className="ph-scale-marker" style={{ left: `${averagePh === null ? 50 : Math.max(4, Math.min(96, (averagePh / 14) * 100))}%` }} /></div>
                  <div className="ph-scale-labels"><span>Asam</span><span>Ideal 6–7</span><span>Basa</span></div>
                  <div className="spotlight-footer"><span><CheckCircle2 size={14} /> Dirawat dengan baik</span><button type="button" onClick={() => changeView("soil")}>Lihat laporan <ArrowRight size={14} /></button></div>
                </section>
              </div>
            </>
          )}

          {activeView === "plots" && (
            plotDetailId ? (
              <PlotDetail
                plot={plots.find((plot) => plot.id === plotDetailId) ?? null}
                onBack={() => setPlotDetailId(null)}
                onPlan={(plotId) => openPlanting(plotId)}
                onPlanCrop={(crop, plotId) => openPlanting(plotId, crop.id)}
                onSoil={(plotId) => { setSoilPreferredPlotId(plotId); changeView("soil"); }}
                onHarvest={markHarvest}
              />
            ) : (
              <section className="page-section plots-page-section">
                <div className="section-toolbar">
                  <div><span className="section-kicker">{activeFarm?.location ?? "KEBUN AKTIF"}</span><h2>Setiap petak punya cerita</h2><p>{plots.length} petak · {formatNumber(plots.reduce((sum, plot) => sum + plot.area, 0))} m² area tanam</p></div>
                  <div className="section-toolbar-actions"><span className="quiet-stat"><Sprout size={15} /> {activePlantings.length} tanaman tumbuh</span><button type="button" className="button button-outline" onClick={() => setModal("farm")}><Plus size={16} />Kebun baru</button></div>
                </div>
                {plots.length ? (
                  <div className="plots-page-grid">
                    {plots
                      .filter((plot) => !searchQuery || `${plot.name} ${plot.soilType} ${plot.plantings.map((planting) => planting.commonName).join(" ")}`.toLowerCase().includes(searchQuery.toLowerCase()))
                      .map((plot, index) => <PlotCard key={plot.id} plot={plot} index={index} onClick={() => setPlotDetailId(plot.id)} />)}
                    <button type="button" className="add-plot-card" onClick={() => setModal("plot")}><span><Plus size={20} /></span><strong>Tambah petak baru</strong><small>Catat luas dan jenis tanah petak</small></button>
                  </div>
                ) : (
                  <EmptyState title="Kebunmu siap diisi" description="Buat petak pertama untuk mulai membangun riwayat tanam dan merawat tanah." actionLabel="Tambah petak pertama" onAction={() => setModal("plot")} />
                )}
              </section>
            )
          )}

          {activeView === "rotation" && (
            <section className="page-section rotation-page-section">
              <div className="rotation-intro-banner">
                <div className="rotation-intro-icon"><RotateCcw size={20} /></div>
                <div><strong>Rotasi yang cermat, tanah yang lebih kuat.</strong><p>Mesin kami membandingkan keluarga tanaman dan riwayat dua tahun terakhir di setiap petak.</p></div>
                <span className="rotation-intro-stamp"><Sprout size={16} /> BERDASARKAN RIWAYATMU</span>
              </div>
              <RotationEngine plots={plots} onPlan={(crop, plotId) => openPlanting(plotId, crop.id)} />
            </section>
          )}

          {activeView === "history" && (
            <section className="page-section history-page-section">
              <div className="section-toolbar history-toolbar">
                <div><span className="section-kicker">CATATAN MUSIM</span><h2>Semua perjalanan tanam</h2><p>{allPlantings.length} catatan tersimpan di {plots.length} petak.</p></div>
                <div className="history-filter-controls">
                  <label className="history-plot-filter"><MapPin size={15} /><select value={historyPlotFilter} onChange={(event) => setHistoryPlotFilter(event.target.value === "all" ? "all" : Number(event.target.value))}><option value="all">Semua petak</option>{plots.map((plot) => <option value={plot.id} key={plot.id}>{plot.name}</option>)}</select><ChevronDown size={13} /></label>
                  <button type="button" className="button button-primary" onClick={() => openPlanting()}><Plus size={16} />Catat tanam</button>
                </div>
              </div>
              <PlantingHistory
                plantings={allPlantings.filter((planting) => historyPlotFilter === "all" || planting.plotId === historyPlotFilter).filter((planting) => !searchQuery || `${planting.commonName} ${planting.familyName} ${planting.plotName} ${planting.notes ?? ""}`.toLowerCase().includes(searchQuery.toLowerCase()))}
                onHarvest={markHarvest}
                onAddPlanting={() => openPlanting()}
              />
            </section>
          )}

          {activeView === "soil" && (
            <section className="page-section soil-page-section">
              <div className="soil-intro-banner">
                <span className="soil-intro-icon"><FlaskConical size={19} /></span>
                <div><strong>Tanah sehat adalah awal panen yang baik.</strong><p>Catat hasil uji secara berkala. Nilai pH 5,5–7,5 umumnya cocok untuk beragam tanaman kebun.</p></div>
                <span className="soil-intro-badge"><Droplets size={15} /> PROFIL TANAH</span>
              </div>
              <div className="soil-page-grid">
                <div className="soil-results-column">
                  <div className="soil-results-heading"><div><span className="section-kicker">RINGKASAN TERBARU</span><h2>Profil tiap petak</h2></div><span className="last-tested-count"><FlaskConical size={14} />{soilReadings.length} dari {plots.length} diuji</span></div>
                  {plots.length ? plots.map((plot, index) => <SoilPlotCard key={plot.id} plot={plot} index={index} />) : <EmptyState title="Belum ada petak untuk diuji" description="Tambahkan petak untuk mulai mencatat kesehatan tanah." actionLabel="Lihat petak" onAction={() => changeView("plots")} />}
                </div>
                <SoilForm plots={plots} initialPlotId={soilPreferredPlotId ?? plots[0]?.id} saving={soilSaving} onSubmit={saveSoilTest} />
              </div>
              <div className="soil-note"><span><CircleAlert size={16} /></span><p><strong>Catatan:</strong> Gunakan hasil uji laboratorium atau alat ukur yang sama untuk membandingkan perubahan dari waktu ke waktu. Nilai N-P-K ditampilkan dalam mg/kg.</p></div>
            </section>
          )}

          <footer className="app-footer">
            <span>© 2026 TerraSiklus</span>
            <span><Leaf size={13} /> Tumbuh selaras dengan alam</span>
            <span className="app-footer-tagline-soft">Dirancang untuk kebun yang lebih sehat.</span>
            <span className="app-footer-open-source">Open Source oleh MZF - 2026</span>
            <a className="app-footer-download" href="/terrasiklus-source.zip" download><Download size={13} /> Unduh Source Code</a>
          </footer>
        </main>
      </div>

      {modal === "farm" && <FarmDialog onClose={() => setModal(null)} onSave={saveFarm} />}
      {modal === "plot" && <PlotDialog farmName={activeFarm?.name ?? "kebun ini"} onClose={() => setModal(null)} onSave={savePlot} />}
      {modal === "planting" && <PlantingDialog plots={plots} crops={crops} initialPlotId={plantingDefaults.plotId} initialCropId={plantingDefaults.cropId} onClose={() => setModal(null)} onSave={savePlanting} />}
      {harvestTarget && <HarvestDialog planting={harvestTarget} onClose={() => setHarvestTarget(null)} onSave={saveHarvest} />}
      {toast && <Toast toast={toast} onClose={() => setToast(null)} />}
    </div>
  );
}

function formatNumber(value: number) {
  return new Intl.NumberFormat("id-ID", { maximumFractionDigits: 1 }).format(value);
}

function MetricCard({ icon: Icon, label, value, suffix, note, tone }: { icon: LucideIcon; label: string; value: string; suffix: string; note: string; tone: string }) {
  return (
    <article className="metric-card">
      <div className="metric-card-top"><span className={`metric-icon metric-icon-${tone}`}><Icon size={18} strokeWidth={1.9} /></span><span className="metric-label">{label}</span><ArrowUpRight size={15} className="metric-arrow" /></div>
      <div className="metric-value-row"><strong>{value}</strong><span>{suffix}</span></div>
      <div className="metric-note"><span className={`metric-note-dot metric-note-dot-${tone}`} />{note}</div>
    </article>
  );
}

function EmptyState({ title, description, actionLabel, onAction }: { title: string; description: string; actionLabel: string; onAction: () => void }) {
  return (
    <div className="empty-state">
      <div className="empty-state-icon"><Sprout size={24} /></div>
      <h3>{title}</h3><p>{description}</p>
      <button type="button" className="button button-outline" onClick={onAction}><Plus size={16} />{actionLabel}</button>
    </div>
  );
}

function SoilPlotCard({ plot, index }: { plot: Plot; index: number }) {
  const reading = plot.latestSoil;
  const status = getPhStatus(reading?.ph);
  const measures = reading ? [
    { label: "N", name: "Nitrogen", value: reading.n, max: 80, unit: "mg/kg", color: "nitrogen" },
    { label: "P", name: "Fosfor", value: reading.p, max: 80, unit: "mg/kg", color: "phosphorus" },
    { label: "K", name: "Kalium", value: reading.k, max: 180, unit: "mg/kg", color: "potassium" },
  ] : [];
  return (
    <article className="soil-plot-card">
      <div className="soil-plot-card-head">
        <span className={`soil-plot-symbol soil-plot-symbol-${index % 3}`}><Sprout size={17} /></span>
        <div className="soil-plot-heading"><strong>{plot.name}</strong><span>{plot.soilType} · {plot.area} m²</span></div>
        {reading ? <span className={`ph-status ph-${status.tone}`}><Droplets size={12} />{status.label}</span> : <span className="soil-missing-badge">Belum diuji</span>}
      </div>
      {reading ? (
        <>
          <div className="soil-ph-row"><span>pH tanah</span><strong>{reading.ph.toFixed(1)}</strong><small>diuji {formatDate(reading.testedOn)}</small></div>
          <div className="soil-npk-list">
            {measures.map((measure) => <div className="soil-npk-row" key={measure.label}><span className={`npk-letter npk-${measure.color}`}>{measure.label}</span><span className="npk-name">{measure.name}</span><div className="npk-bar"><span className={`npk-fill npk-fill-${measure.color}`} style={{ width: `${Math.max(5, Math.min(100, (measure.value / measure.max) * 100))}%` }} /></div><strong>{formatNumber(measure.value)} <small>{measure.unit}</small></strong></div>)}
          </div>
          <div className="organic-matter-line"><span>Bahan organik</span><strong>{reading.organicMatter.toFixed(1)}%</strong><span className="organic-progress"><i style={{ width: `${Math.min(100, reading.organicMatter * 12)}%` }} /></span></div>
        </>
      ) : (
        <div className="soil-empty-card"><p>Tambahkan hasil uji untuk melihat pH dan nutrisi di petak ini.</p></div>
      )}
    </article>
  );
}

function PlantingHistory({ plantings, onHarvest, onAddPlanting }: { plantings: PlantingWithPlot[]; onHarvest: (planting: PlantingWithPlot) => void; onAddPlanting: () => void }) {
  if (!plantings.length) return <EmptyState title="Belum ada catatan yang cocok" description="Coba ubah filter atau tambahkan catatan tanam baru." actionLabel="Catat penanaman" onAction={onAddPlanting} />;
  return (
    <div className="history-table-wrap">
      <table className="history-table">
        <thead><tr><th>TANAMAN</th><th>PETAK</th><th>TANGGAL TANAM</th><th>TANGGAL PANEN</th><th>STATUS</th><th>CATATAN</th><th /></tr></thead>
        <tbody>
          {plantings.map((planting) => (
            <tr key={planting.id}>
              <td><div className="history-crop-cell"><span className="history-crop-icon"><Leaf size={15} /></span><span><strong>{planting.commonName}</strong><small>{planting.familyName}</small></span></div></td>
              <td><span className="table-plot-name"><Grid2X2 size={13} />{planting.plotName}</span></td>
              <td>{formatDate(planting.plantedOn)}</td>
              <td>{formatDate(planting.harvestedOn)}</td>
              <td><span className={`history-status ${planting.harvestedOn ? "history-status-harvested" : "history-status-active"}`}><span />{planting.harvestedOn ? "Sudah panen" : "Tumbuh"}</span></td>
              <td><span className="history-note-cell" title={planting.notes ?? "Belum ada catatan"}>{planting.notes || "—"}</span></td>
              <td>{!planting.harvestedOn && <button type="button" className="table-action-button" onClick={() => onHarvest(planting)}><Wheat size={14} />Panen</button>}</td>
            </tr>
          ))}
        </tbody>
      </table>
      <div className="history-mobile-list">
        {plantings.map((planting) => (
          <article className="history-mobile-card" key={planting.id}>
            <div className="history-mobile-top"><span className="history-crop-icon"><Leaf size={15} /></span><span><strong>{planting.commonName}</strong><small>{planting.familyName}</small></span><span className={`history-status ${planting.harvestedOn ? "history-status-harvested" : "history-status-active"}`}><span />{planting.harvestedOn ? "Panen" : "Tumbuh"}</span></div>
            <div className="history-mobile-meta"><span><Grid2X2 size={13} />{planting.plotName}</span><span><CalendarDays size={13} />{formatDate(planting.plantedOn)}</span></div>
            {planting.notes && <p>{planting.notes}</p>}
            {!planting.harvestedOn && <button type="button" className="table-action-button" onClick={() => onHarvest(planting)}><Wheat size={14} />Catat panen</button>}
          </article>
        ))}
      </div>
    </div>
  );
}

function PlotDetail({ plot, onBack, onPlan, onPlanCrop, onSoil, onHarvest }: { plot: Plot | null; onBack: () => void; onPlan: (plotId: number) => void; onPlanCrop: (crop: Crop, plotId: number) => void; onSoil: (plotId: number) => void; onHarvest: (planting: PlantingWithPlot) => void }) {
  if (!plot) return <EmptyState title="Petak tidak ditemukan" description="Pilih petak yang tersedia di kebun aktif." actionLabel="Kembali ke petak" onAction={onBack} />;
  const active = plot.plantings.find((planting) => !planting.harvestedOn);
  const status = getPhStatus(plot.latestSoil?.ph);
  const activity = plot.plantings;
  return (
    <section className="page-section plot-detail-section">
      <button type="button" className="back-link" onClick={onBack}><ArrowRight size={15} />Kembali ke semua petak</button>
      <div className="plot-detail-hero">
        <div className="plot-detail-title-group"><span className="plot-detail-mark"><Sprout size={25} /></span><div><span className="section-kicker">{plot.soilType.toUpperCase()} · {plot.area} M²</span><h2>{plot.name}</h2><p>{active ? `Saat ini ditanami ${active.commonName} dari keluarga ${active.familyName}.` : "Petak ini siap untuk siklus tanam berikutnya."}</p></div></div>
        <div className="plot-detail-actions"><button type="button" className="button button-outline" onClick={() => onSoil(plot.id)}><FlaskConical size={16} />Catat uji tanah</button><button type="button" className="button button-primary" onClick={() => onPlan(plot.id)}><Plus size={16} />Catat penanaman</button></div>
      </div>
      <div className="plot-detail-grid">
        <section className="panel detail-soil-panel">
          <div className="panel-heading compact-panel-heading"><div><span className="section-kicker">STATUS TERBARU</span><h3>Kondisi tanah</h3></div><span className={`ph-status ph-${status.tone}`}><Droplets size={12} />{status.label}</span></div>
          {plot.latestSoil ? (
            <>
              <div className="detail-ph-value"><strong>{plot.latestSoil.ph.toFixed(1)}</strong><span>pH</span><small>Diuji {formatDate(plot.latestSoil.testedOn)}</small></div>
              <div className="detail-soil-metrics">
                <div><span>NITROGEN</span><strong>{formatNumber(plot.latestSoil.n)}<small>mg/kg</small></strong></div>
                <div><span>FOSFOR</span><strong>{formatNumber(plot.latestSoil.p)}<small>mg/kg</small></strong></div>
                <div><span>KALIUM</span><strong>{formatNumber(plot.latestSoil.k)}<small>mg/kg</small></strong></div>
                <div><span>BAHAN ORGANIK</span><strong>{plot.latestSoil.organicMatter.toFixed(1)}<small>%</small></strong></div>
              </div>
              <div className="detail-ph-advice"><CheckCircle2 size={15} /><span>{plot.latestSoil.ph >= 5.5 && plot.latestSoil.ph <= 7.5 ? "pH berada dalam rentang yang mendukung banyak tanaman kebun." : "Pertimbangkan bahan pembenah tanah berdasarkan uji laboratorium."}</span></div>
            </>
          ) : (
            <div className="detail-no-soil"><FlaskConical size={19} /><p>Belum ada hasil uji tanah untuk petak ini.</p><button type="button" onClick={() => onSoil(plot.id)}>Catat hasil uji <ArrowRight size={14} /></button></div>
          )}
        </section>
        <section className="panel detail-history-panel">
          <div className="panel-heading compact-panel-heading"><div><span className="section-kicker">SIKLUS PETAK</span><h3>Riwayat tanam</h3></div><span className="history-total-pill">{activity.length} catatan</span></div>
          {activity.length ? (
            <div className="detail-timeline">
              {activity.map((planting, index) => (
                <div className="detail-timeline-row" key={planting.id}>
                  <span className={`detail-timeline-dot ${planting.harvestedOn ? "timeline-dot-harvested" : ""}`}>{planting.harvestedOn ? <Check size={11} /> : <Leaf size={11} />}</span>
                  <div className="detail-timeline-copy"><strong>{planting.commonName}</strong><span>{planting.familyName} · ditanam {formatDate(planting.plantedOn)}</span>{planting.notes && <small>{planting.notes}</small>}</div>
                  <div className="detail-timeline-trailing">{planting.harvestedOn ? <span>Panen {formatDate(planting.harvestedOn)}</span> : <button type="button" onClick={() => onHarvest({ ...planting, plotName: plot.name })}>Catat panen</button>}</div>
                  {index < activity.length - 1 && <span className="timeline-stem" />}
                </div>
              ))}
            </div>
          ) : <p className="small-empty-copy">Belum ada catatan tanam di petak ini.</p>}
        </section>
      </div>
      <section className="panel detail-rotation-panel"><div className="detail-rotation-heading"><span className="rotation-icon-small"><RotateCcw size={17} /></span><div><h3>Rencanakan musim berikutnya</h3><p>Saran keluarga tanaman berdasarkan riwayat petak ini.</p></div></div><RotationEngine plots={[plot]} onPlan={onPlanCrop} /></section>
    </section>
  );
}

function DialogShell({ title, subtitle, icon: Icon, onClose, children, size = "medium" }: { title: string; subtitle: string; icon: LucideIcon; onClose: () => void; children: ReactNode; size?: "medium" | "large" }) {
  return (
    <div className="modal-backdrop" onMouseDown={(event) => { if (event.target === event.currentTarget) onClose(); }}>
      <section className={`dialog-shell dialog-${size}`} role="dialog" aria-modal="true" aria-labelledby="dialog-title">
        <div className="dialog-top"><span className="dialog-icon"><Icon size={19} /></span><button type="button" className="dialog-close" aria-label="Tutup dialog" onClick={onClose}><X size={18} /></button></div>
        <h2 id="dialog-title">{title}</h2><p className="dialog-subtitle">{subtitle}</p>
        {children}
      </section>
    </div>
  );
}

function FarmDialog({ onClose, onSave }: { onClose: () => void; onSave: (values: { name: string; location: string }) => Promise<void> }) {
  const [name, setName] = useState("");
  const [location, setLocation] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); setSaving(true); setError("");
    try { await onSave({ name, location }); } catch (submitError) { setError(submitError instanceof Error ? submitError.message : "Kebun belum dapat dibuat."); } finally { setSaving(false); }
  }
  return (
    <DialogShell title="Buat kebun baru" subtitle="Beri nama ruang tumbuhmu dan tambahkan lokasinya." icon={Sprout} onClose={onClose}>
      <form className="dialog-form" onSubmit={submit}>
        <label className="form-field"><span>Nama kebun</span><input autoFocus value={name} onChange={(event) => setName(event.target.value)} placeholder="Contoh: Kebun Belakang" required minLength={2} maxLength={160} /></label>
        <label className="form-field"><span>Lokasi <small>Opsional</small></span><div className="field-with-icon"><MapPin size={16} /><input value={location} onChange={(event) => setLocation(event.target.value)} placeholder="Contoh: Bandung, Jawa Barat" maxLength={200} /></div></label>
        {error && <p className="form-error-message">{error}</p>}
        <div className="dialog-actions"><button type="button" className="button button-quiet" onClick={onClose}>Batal</button><button type="submit" className="button button-primary" disabled={saving}>{saving ? <LoaderCircle className="spin" size={16} /> : <Plus size={16} />}{saving ? "Membuat…" : "Buat kebun"}</button></div>
      </form>
    </DialogShell>
  );
}

function PlotDialog({ farmName, onClose, onSave }: { farmName: string; onClose: () => void; onSave: (values: { name: string; area: number; soilType: string }) => Promise<void> }) {
  const [name, setName] = useState("");
  const [area, setArea] = useState("6");
  const [soilType, setSoilType] = useState("Lempung berhumus");
  const [customSoil, setCustomSoil] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); setSaving(true); setError("");
    try { await onSave({ name, area: Number(area), soilType: soilType === "Lainnya" ? customSoil : soilType }); } catch (submitError) { setError(submitError instanceof Error ? submitError.message : "Petak belum dapat dibuat."); } finally { setSaving(false); }
  }
  return (
    <DialogShell title="Tambah petak kebun" subtitle={`Buat ruang tanam baru di ${farmName}.`} icon={Grid2X2} onClose={onClose}>
      <form className="dialog-form" onSubmit={submit}>
        <label className="form-field"><span>Nama petak</span><input autoFocus value={name} onChange={(event) => setName(event.target.value)} placeholder="Contoh: Bedeng rempah" required minLength={2} maxLength={120} /></label>
        <div className="form-grid two-column">
          <label className="form-field"><span>Luas petak</span><div className="input-with-unit"><input type="number" min="0.1" step="0.1" value={area} onChange={(event) => setArea(event.target.value)} required /><em>m²</em></div></label>
          <label className="form-field"><span>Jenis tanah</span><select value={soilType} onChange={(event) => setSoilType(event.target.value)}><option>Lempung berhumus</option><option>Lempung</option><option>Lempung berpasir</option><option>Humus</option><option>Pasir</option><option>Tanah liat</option><option>Lainnya</option></select></label>
        </div>
        {soilType === "Lainnya" && <label className="form-field"><span>Deskripsikan jenis tanah</span><input value={customSoil} onChange={(event) => setCustomSoil(event.target.value)} placeholder="Tulis jenis tanah" required maxLength={120} /></label>}
        {error && <p className="form-error-message">{error}</p>}
        <div className="dialog-actions"><button type="button" className="button button-quiet" onClick={onClose}>Batal</button><button type="submit" className="button button-primary" disabled={saving}>{saving ? <LoaderCircle className="spin" size={16} /> : <Plus size={16} />}{saving ? "Menyimpan…" : "Simpan petak"}</button></div>
      </form>
    </DialogShell>
  );
}

function PlantingDialog({ plots, crops, initialPlotId, initialCropId, onClose, onSave }: { plots: Plot[]; crops: Crop[]; initialPlotId?: number; initialCropId?: number; onClose: () => void; onSave: (values: PlantingDraft) => Promise<void> }) {
  const [plotId, setPlotId] = useState<number | "">(initialPlotId ?? plots[0]?.id ?? "");
  const [cropId, setCropId] = useState<number | "">(initialCropId ?? "");
  const [plantedOn, setPlantedOn] = useState(todayLocal);
  const [harvestedOn, setHarvestedOn] = useState("");
  const [notes, setNotes] = useState("");
  const [confirmRotation, setConfirmRotation] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [serverWarning, setServerWarning] = useState("");
  const selectedPlot = plots.find((plot) => plot.id === Number(plotId));
  const selectedCrop = crops.find((crop) => crop.id === Number(cropId));
  const cutoff = new Date();
  cutoff.setUTCFullYear(cutoff.getUTCFullYear() - 2);
  const cutoffDate = cutoff.toISOString().slice(0, 10);
  const matchingPlanting = selectedPlot && selectedCrop
    ? selectedPlot.plantings.find((planting) => planting.familyId === selectedCrop.familyId && planting.plantedOn >= cutoffDate)
    : undefined;
  const hasRotationRisk = Boolean(matchingPlanting || serverWarning);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); setError("");
    if (!plotId || !cropId) { setError("Pilih petak dan tanaman terlebih dahulu."); return; }
    if (hasRotationRisk && !confirmRotation) { setError("Konfirmasi peringatan rotasi sebelum melanjutkan."); return; }
    setSaving(true);
    try {
      await onSave({ plotId: Number(plotId), cropId: Number(cropId), plantedOn, harvestedOn, notes, confirmRotation });
    } catch (submitError) {
      const message = submitError instanceof Error ? submitError.message : "Catatan tanam belum dapat disimpan.";
      setError(message);
      if (message.toLowerCase().includes("keluarga") || message.toLowerCase().includes("rotasi")) setServerWarning(message);
    } finally { setSaving(false); }
  }

  return (
    <DialogShell title="Catat penanaman" subtitle="Simpan awal musim baru dan biarkan TerraSiklus membantu merawat siklusnya." icon={Sprout} onClose={onClose} size="large">
      <form className="dialog-form" onSubmit={submit}>
        <div className="form-grid two-column">
          <label className="form-field"><span>Petak kebun</span><select value={plotId} onChange={(event) => { setPlotId(Number(event.target.value)); setConfirmRotation(false); }} required>{plots.map((plot) => <option key={plot.id} value={plot.id}>{plot.name}</option>)}</select></label>
          <label className="form-field"><span>Tanaman</span><select value={cropId} onChange={(event) => { setCropId(Number(event.target.value)); setConfirmRotation(false); setServerWarning(""); }} required><option value="">Pilih tanaman…</option>{crops.map((crop) => <option key={crop.id} value={crop.id}>{crop.commonName} · {crop.familyName}</option>)}</select></label>
        </div>
        {selectedCrop && <div className="selected-crop-summary"><span className="selected-crop-leaf"><Leaf size={15} /></span><span><strong>{selectedCrop.commonName}</strong><small>{selectedCrop.familyName} · kebutuhan hara {selectedCrop.nutrientDemand.toLowerCase()}</small></span><span className={`demand-tag demand-${selectedCrop.nutrientDemand.toLowerCase()}`}>Hara {selectedCrop.nutrientDemand.toLowerCase()}</span></div>}
        {hasRotationRisk && (
          <div className="rotation-warning-box"><span className="warning-icon"><CircleAlert size={18} /></span><div><strong>Perhatian: keluarga tanaman berulang</strong><p>{serverWarning || `${selectedCrop?.familyName} pernah ditanam di ${selectedPlot?.name} dalam dua tahun terakhir (${matchingPlanting?.commonName}). Keluarga tanaman berbeda membantu mencegah hama dan penyakit.`}</p><label className="rotation-confirm-label"><input type="checkbox" checked={confirmRotation} onChange={(event) => setConfirmRotation(event.target.checked)} /><span>Saya memahami risiko dan tetap ingin melanjutkan.</span></label></div></div>
        )}
        <div className="form-grid two-column">
          <label className="form-field"><span>Tanggal mulai tanam</span><input type="date" value={plantedOn} onChange={(event) => setPlantedOn(event.target.value)} required /></label>
          <label className="form-field"><span>Tanggal panen <small>Opsional</small></span><input type="date" min={plantedOn} value={harvestedOn} onChange={(event) => setHarvestedOn(event.target.value)} /></label>
        </div>
        <label className="form-field"><span>Catatan hama, penyakit, atau perawatan <small>Opsional</small></span><textarea value={notes} onChange={(event) => setNotes(event.target.value)} rows={3} maxLength={2000} placeholder="Contoh: daun tampak sehat, disiram pagi hari…" /></label>
        {error && <p className="form-error-message">{error}</p>}
        <div className="dialog-actions"><button type="button" className="button button-quiet" onClick={onClose}>Batal</button><button type="submit" className="button button-primary" disabled={saving}>{saving ? <LoaderCircle className="spin" size={16} /> : <Check size={16} />}{saving ? "Menyimpan…" : "Simpan penanaman"}</button></div>
      </form>
    </DialogShell>
  );
}

function HarvestDialog({ planting, onClose, onSave }: { planting: HarvestTarget; onClose: () => void; onSave: (plantingId: number, harvestedOn: string) => Promise<void> }) {
  const [harvestedOn, setHarvestedOn] = useState(todayLocal);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); setSaving(true); setError("");
    try { await onSave(planting.id, harvestedOn); } catch (submitError) { setError(submitError instanceof Error ? submitError.message : "Panen belum dapat dicatat."); } finally { setSaving(false); }
  }
  return (
    <DialogShell title="Catat hasil panen" subtitle="Tutup siklus tanam ini dan simpan tanggal panennya." icon={Wheat} onClose={onClose}>
      <form className="dialog-form" onSubmit={submit}>
        <div className="harvest-summary"><span className="harvest-summary-icon"><Wheat size={20} /></span><span><strong>{planting.commonName}</strong><small>{planting.plotName} · {planting.familyName}</small></span><span className="history-status history-status-active"><span />Tumbuh</span></div>
        <label className="form-field"><span>Tanggal panen</span><input type="date" min={planting.plantedOn} value={harvestedOn} onChange={(event) => setHarvestedOn(event.target.value)} required /></label>
        {error && <p className="form-error-message">{error}</p>}
        <div className="dialog-actions"><button type="button" className="button button-quiet" onClick={onClose}>Batal</button><button type="submit" className="button button-primary" disabled={saving}>{saving ? <LoaderCircle className="spin" size={16} /> : <Check size={16} />}{saving ? "Menyimpan…" : "Simpan panen"}</button></div>
      </form>
    </DialogShell>
  );
}

function Toast({ toast, onClose }: { toast: NonNullable<ToastState>; onClose: () => void }) {
  return (
    <div className={`toast-message toast-${toast.tone}`} role="status"><span className="toast-icon">{toast.tone === "success" ? <CheckCircle2 size={18} /> : <CircleAlert size={18} />}</span><span>{toast.message}</span><button type="button" aria-label="Tutup pemberitahuan" onClick={onClose}><X size={15} /></button></div>
  );
}

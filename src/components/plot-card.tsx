import { ArrowUpRight, Droplets, Leaf, Sprout } from "lucide-react";
import type { Plot } from "@/types/garden";

interface PlotCardProps {
  plot: Plot;
  index: number;
  onClick: () => void;
}

export function getPhStatus(ph: number | null | undefined) {
  if (ph == null) return { label: "Belum diuji", tone: "muted" };
  if (ph < 5.5) return { label: "Terlalu asam", tone: "warning" };
  if (ph > 7.5) return { label: "Terlalu basa", tone: "warning" };
  return { label: "Seimbang", tone: "good" };
}

export function PlotCard({ plot, index, onClick }: PlotCardProps) {
  const activePlanting = plot.plantings.find((planting) => !planting.harvestedOn);
  const phStatus = getPhStatus(plot.latestSoil?.ph);

  return (
    <button type="button" className="plot-card" onClick={onClick}>
      <div className="plot-card-topline">
        <div className={`plot-icon plot-icon-${index % 3}`}>
          <Sprout size={19} strokeWidth={1.8} />
        </div>
        <span className="plot-number">PETAK {String(index + 1).padStart(2, "0")}</span>
        <span className="plot-card-arrow" aria-hidden="true">
          <ArrowUpRight size={17} />
        </span>
      </div>
      <div className="plot-card-heading">
        <h3>{plot.name}</h3>
        <p>{plot.soilType}</p>
      </div>
      <div className="plot-current-crop">
        <span className="crop-dot"><Leaf size={13} /></span>
        <span className="crop-text">
          <small>SAAT INI TUMBUH</small>
          <strong>{activePlanting?.commonName ?? "Belum ada tanaman"}</strong>
        </span>
        {activePlanting && <span className="active-indicator">Aktif</span>}
      </div>
      <div className="plot-card-divider" />
      <div className="plot-card-stats">
        <div>
          <span className="plot-stat-label">Luas petak</span>
          <strong>{new Intl.NumberFormat("id-ID", { maximumFractionDigits: 1 }).format(plot.area)} <small>m²</small></strong>
        </div>
        <div className="plot-ph-stat">
          <span className="plot-stat-label">pH tanah</span>
          <strong>{plot.latestSoil ? plot.latestSoil.ph.toFixed(1) : "—"}</strong>
          <span className={`ph-status ph-${phStatus.tone}`}><Droplets size={11} />{phStatus.label}</span>
        </div>
      </div>
      <div className="plot-card-footer">
        <span>Jelajahi detail petak</span>
        <ArrowUpRight size={15} />
      </div>
    </button>
  );
}

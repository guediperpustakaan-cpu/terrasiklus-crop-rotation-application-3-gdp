"use client";

import { useEffect, useState } from "react";
import {
  ArrowDown,
  ArrowRight,
  CheckCircle2,
  CircleAlert,
  Leaf,
  LoaderCircle,
  RotateCcw,
  Sparkles,
} from "lucide-react";
import type { Crop, Plot, RotationRecommendation } from "@/types/garden";

interface RotationEngineProps {
  plots: Plot[];
  onPlan: (crop: Crop, plotId: number) => void;
}

type RotationRequest = {
  plotId: number;
  status: "ready" | "error";
  data: RotationRecommendation | null;
  error: string;
};

export function RotationEngine({ plots, onPlan }: RotationEngineProps) {
  const [plotId, setPlotId] = useState<number | "">("");
  const [request, setRequest] = useState<RotationRequest | null>(null);

  const selectedPlotId = plots.some((plot) => plot.id === plotId) ? plotId : (plots[0]?.id ?? "");
  const activePlotId = Number(selectedPlotId);

  useEffect(() => {
    if (!activePlotId) return;

    const controller = new AbortController();

    fetch(`/api/rotation?plotId=${activePlotId}`, { signal: controller.signal })
      .then(async (response) => {
        const payload = await response.json();
        if (!response.ok) throw new Error(payload.error ?? "Rekomendasi belum tersedia.");
        setRequest({
          plotId: activePlotId,
          status: "ready",
          data: payload as RotationRecommendation,
          error: "",
        });
      })
      .catch((fetchError: unknown) => {
        if (fetchError instanceof Error && fetchError.name === "AbortError") return;
        setRequest({
          plotId: activePlotId,
          status: "error",
          data: null,
          error: fetchError instanceof Error ? fetchError.message : "Rekomendasi belum tersedia.",
        });
      });

    return () => controller.abort();
  }, [activePlotId]);

  const current = request && request.plotId === activePlotId ? request : null;
  const loading = Boolean(activePlotId) && !current;
  const recommendation = current?.status === "ready" ? current.data : null;
  const error = current?.status === "error" ? current.error : "";

  if (!plots.length) {
    return (
      <div className="empty-state rotation-empty">
        <div className="empty-state-icon"><Leaf size={24} /></div>
        <h3>Mulai dari petak pertama</h3>
        <p>Tambahkan petak kebun agar TerraSiklus dapat merancang rotasi yang sesuai.</p>
      </div>
    );
  }

  return (
    <section className="rotation-workspace">
      <div className="rotation-controls">
        <div>
          <span className="section-kicker">MESIN ROTASI CERDAS</span>
          <h2>Rencana musim berikutnya</h2>
          <p>Pilih petak untuk melihat saran berdasarkan riwayat tanamnya.</p>
        </div>
        <label className="select-field rotation-plot-select">
          <span>Petak yang direncanakan</span>
          <select value={selectedPlotId} onChange={(event) => setPlotId(Number(event.target.value))}>
            {plots.map((plot) => <option value={plot.id} key={plot.id}>{plot.name}</option>)}
          </select>
        </label>
      </div>

      {loading ? (
        <div className="rotation-loading"><LoaderCircle className="spin" size={22} /> Menyusun rekomendasi dari riwayat petak…</div>
      ) : error ? (
        <div className="inline-error"><CircleAlert size={18} />{error}</div>
      ) : recommendation ? (
        <>
          <div className="rotation-flow-card">
            <div className="rotation-flow-copy">
              <span className="flow-label">SIKLUS TANAM</span>
              <div className="flow-steps">
                <div className="flow-step previous-step">
                  <span className="flow-step-icon"><Leaf size={17} /></span>
                  <span><small>Musim sebelumnya</small><strong>{recommendation.lastPlanting?.commonName ?? "Belum ada catatan"}</strong></span>
                  {recommendation.lastPlanting && <em>{recommendation.lastPlanting.familyName}</em>}
                </div>
                <div className="flow-connector"><ArrowRight size={18} /></div>
                <div className="flow-step next-step">
                  <span className="flow-step-icon"><Sparkles size={17} /></span>
                  <span><small>Musim yang disarankan</small><strong>Keluarga berbeda</strong></span>
                  <em>lebih sehat</em>
                </div>
              </div>
            </div>
            <div className="rotation-rule-badge"><RotateCcw size={18} /><span><strong>Jeda keluarga</strong><small>Hindari keluarga yang sama selama 2 tahun</small></span></div>
          </div>

          <div className="rotation-reason">
            <div className="reason-icon"><CheckCircle2 size={18} /></div>
            <div><strong>Mengapa rekomendasi ini?</strong><p>{recommendation.reason}</p></div>
          </div>

          {recommendation.recentlyUsedFamilies.length > 0 && (
            <div className="family-history-row">
              <span>Sudah ditanam di petak ini:</span>
              {recommendation.recentlyUsedFamilies.map((family) => <span className="family-chip" key={family}>{family}</span>)}
            </div>
          )}

          <div className="recommendation-heading">
            <div><span className="section-kicker">PILIHAN UNTUK MUSIM BARU</span><h3>Tanaman yang direkomendasikan</h3></div>
            <span className="recommendation-count">{recommendation.recommendedCrops.length} pilihan sehat</span>
          </div>

          {recommendation.recommendedCrops.length ? (
            <div className="recommendation-grid">
              {recommendation.recommendedCrops.map((crop, index) => (
                <article className="recommendation-card" key={crop.id}>
                  <div className={`recommendation-plant-icon plant-tone-${index % 4}`}><Leaf size={19} /></div>
                  <div className="recommendation-crop-info">
                    <h4>{crop.commonName}</h4>
                    <span>{crop.familyName}</span>
                  </div>
                  <span className={`demand-tag demand-${crop.nutrientDemand.toLowerCase()}`}>Hara {crop.nutrientDemand.toLowerCase()}</span>
                  <p className="recommendation-description">
                    {crop.nutrientDemand === "Rendah" ? "Ringan bagi tanah, baik setelah tanaman rakus hara." : crop.nutrientDemand === "Tinggi" ? "Tumbuh optimal dengan tanah kaya bahan organik." : "Kebutuhan hara seimbang untuk variasi musim."}
                  </p>
                  <button type="button" className="recommendation-action" onClick={() => onPlan(crop, activePlotId)}>
                    Rencanakan tanaman <ArrowRight size={15} />
                  </button>
                </article>
              ))}
            </div>
          ) : (
            <div className="empty-state compact-empty"><p>Tambahkan lebih banyak pilihan tanaman ke katalog untuk melihat saran rotasi.</p></div>
          )}
          <div className="rotation-footnote"><ArrowDown size={15} /> Saran diperbarui otomatis mengikuti riwayat tanam petak ini.</div>
        </>
      ) : null}
    </section>
  );
}

"use client";

import { useState, type FormEvent } from "react";
import { Check, FlaskConical, LoaderCircle, Sprout } from "lucide-react";
import type { Plot } from "@/types/garden";

export interface SoilTestInput {
  plotId: number;
  testedOn: string;
  ph: number;
  n: number;
  p: number;
  k: number;
  organicMatter: number;
}

interface SoilFormProps {
  plots: Plot[];
  initialPlotId?: number;
  saving?: boolean;
  onSubmit: (values: SoilTestInput) => Promise<void>;
}

function getToday() {
  const today = new Date();
  const localDate = new Date(today.getTime() - today.getTimezoneOffset() * 60000);
  return localDate.toISOString().slice(0, 10);
}

export function SoilForm({ plots, initialPlotId, saving = false, onSubmit }: SoilFormProps) {
  const [plotId, setPlotId] = useState<number | "">(initialPlotId ?? plots[0]?.id ?? "");
  const [testedOn, setTestedOn] = useState(getToday);
  const [ph, setPh] = useState("6.5");
  const [n, setN] = useState("40");
  const [p, setP] = useState("30");
  const [k, setK] = useState("120");
  const [organicMatter, setOrganicMatter] = useState("4.5");
  const [error, setError] = useState("");

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    if (!plotId) {
      setError("Tambahkan petak sebelum mencatat hasil uji tanah.");
      return;
    }

    try {
      await onSubmit({
        plotId: Number(plotId),
        testedOn,
        ph: Number(ph),
        n: Number(n),
        p: Number(p),
        k: Number(k),
        organicMatter: Number(organicMatter),
      });
    } catch (submitError) {
      setError(submitError instanceof Error ? submitError.message : "Hasil pemeriksaan belum dapat disimpan.");
    }
  }

  if (!plots.length) {
    return (
      <div className="form-empty-state">
        <Sprout size={22} />
        <span>Tambahkan petak kebun terlebih dahulu untuk mencatat kondisi tanah.</span>
      </div>
    );
  }

  return (
    <form className="soil-form" onSubmit={handleSubmit}>
      <div className="soil-form-heading">
        <div className="form-icon-tile"><FlaskConical size={19} /></div>
        <div><h3>Catat hasil uji tanah</h3><p>Perbarui profil nutrisi petak setelah pengujian.</p></div>
      </div>
      <div className="form-grid two-column">
        <label className="form-field">
          <span>Pilih petak</span>
          <select value={plotId} onChange={(event) => setPlotId(Number(event.target.value))}>
            {plots.map((plot) => <option key={plot.id} value={plot.id}>{plot.name}</option>)}
          </select>
        </label>
        <label className="form-field">
          <span>Tanggal pemeriksaan</span>
          <input type="date" value={testedOn} onChange={(event) => setTestedOn(event.target.value)} required />
        </label>
      </div>
      <div className="soil-fields-grid">
        <label className="form-field soil-number-field">
          <span>pH tanah</span><div className="input-with-unit"><input type="number" min="0" max="14" step="0.1" value={ph} onChange={(event) => setPh(event.target.value)} required /><em>pH</em></div>
        </label>
        <label className="form-field soil-number-field">
          <span>Nitrogen (N)</span><div className="input-with-unit"><input type="number" min="0" step="0.1" value={n} onChange={(event) => setN(event.target.value)} required /><em>mg/kg</em></div>
        </label>
        <label className="form-field soil-number-field">
          <span>Fosfor (P)</span><div className="input-with-unit"><input type="number" min="0" step="0.1" value={p} onChange={(event) => setP(event.target.value)} required /><em>mg/kg</em></div>
        </label>
        <label className="form-field soil-number-field">
          <span>Kalium (K)</span><div className="input-with-unit"><input type="number" min="0" step="0.1" value={k} onChange={(event) => setK(event.target.value)} required /><em>mg/kg</em></div>
        </label>
        <label className="form-field soil-number-field organic-input-field">
          <span>Bahan organik</span><div className="input-with-unit"><input type="number" min="0" max="100" step="0.1" value={organicMatter} onChange={(event) => setOrganicMatter(event.target.value)} required /><em>%</em></div>
        </label>
      </div>
      {error && <p className="form-error-message">{error}</p>}
      <div className="soil-form-footer">
        <span><Check size={15} /> Data tersimpan sebagai riwayat uji tanah</span>
        <button className="button button-primary" type="submit" disabled={saving}>
          {saving ? <LoaderCircle className="spin" size={16} /> : <FlaskConical size={16} />}
          {saving ? "Menyimpan…" : "Simpan hasil uji"}
        </button>
      </div>
    </form>
  );
}

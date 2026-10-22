"use client";

import { useEffect, useRef, useState } from "react";
import QRCode from "react-qr-code";
import { Coffee, ExternalLink, Heart, QrCode, X } from "lucide-react";

const TRAKTEER_PAGE = "https://trakteer.id/perpus_opera";
const CREATOR_NAME = "Gue Di Perpustakaan";
const CREATOR_USERNAME = "perpus_opera";

/** Nominal traktiran: mulai Rp6.000 lalu kelipatan dua. */
const TIP_AMOUNTS = [6_000, 12_000, 24_000, 48_000, 96_000, 192_000, 384_000];

const WIDGET_LABEL = "Web app ini gratis & bebas iklan. Kopi kecil, server tetap jalan";

function formatRupiah(value: number) {
  return new Intl.NumberFormat("id-ID", {
    style: "currency",
    currency: "IDR",
    maximumFractionDigits: 0,
  }).format(value);
}

export function TrakteerWidget() {
  const [open, setOpen] = useState(false);
  const [amount, setAmount] = useState(TIP_AMOUNTS[0]);
  const panelRef = useRef<HTMLDivElement>(null);

  const paymentUrl = `${TRAKTEER_PAGE}?amount=${amount}`;

  useEffect(() => {
    if (!open) return;

    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") setOpen(false);
    }

    function onPointerDown(event: MouseEvent) {
      const target = event.target as Node;
      if (panelRef.current && !panelRef.current.contains(target)) setOpen(false);
    }

    window.addEventListener("keydown", onKeyDown);
    window.addEventListener("mousedown", onPointerDown);
    return () => {
      window.removeEventListener("keydown", onKeyDown);
      window.removeEventListener("mousedown", onPointerDown);
    };
  }, [open]);

  return (
    <div className="trakteer-widget">
      {open && (
        <div
          className="trakteer-panel"
          ref={panelRef}
          role="dialog"
          aria-modal="false"
          aria-label="Traktir TerraSiklus di Trakteer"
        >
          <div className="trakteer-panel-head">
            <span className="trakteer-panel-icon"><Coffee size={19} /></span>
            <span className="trakteer-panel-heading">
              <strong>Traktir TerraSiklus</strong>
              <small>{CREATOR_NAME} &middot; trakteer.id</small>
            </span>
            <button type="button" className="trakteer-panel-close" aria-label="Tutup panel traktiran" onClick={() => setOpen(false)}>
              <X size={16} />
            </button>
          </div>

          <p className="trakteer-panel-copy">
            {WIDGET_LABEL}. Pilih nominal, lalu scan QR-nya dari aplikasi e-wallet atau m-banking.
          </p>

          <div className="trakteer-amounts" role="group" aria-label="Pilih nominal traktiran">
            {TIP_AMOUNTS.map((value) => (
              <button
                type="button"
                key={value}
                className={`trakteer-amount ${value === amount ? "trakteer-amount-active" : ""}`}
                aria-pressed={value === amount}
                onClick={() => setAmount(value)}
              >
                {formatRupiah(value)}
              </button>
            ))}
          </div>

          <div className="trakteer-qr">
            <div className="trakteer-qr-frame">
              <QRCode
                value={paymentUrl}
                size={168}
                level="M"
                bgColor="#ffffff"
                fgColor="#14372d"
                title={`Traktir ${formatRupiah(amount)} di Trakteer`}
              />
            </div>
            <span className="trakteer-qr-caption">
              <QrCode size={13} /> Scan untuk traktir <strong>{formatRupiah(amount)}</strong>
            </span>
          </div>

          <a
            className="trakteer-open"
            href={paymentUrl}
            target="_blank"
            rel="noopener noreferrer"
          >
            <Heart size={14} /> Buka Trakteer <ExternalLink size={13} />
          </a>

          <p className="trakteer-panel-foot">
            Pembayaran diproses aman oleh Trakteer.id. TerraSiklus tidak pernah menerima data pembayaran.
          </p>
        </div>
      )}

      <button
        type="button"
        className={`trakteer-fab ${open ? "trakteer-fab-open" : ""}`}
        aria-expanded={open}
        aria-haspopup="dialog"
        onClick={() => setOpen((value) => !value)}
      >
        <span className="trakteer-fab-icon">
          {open ? <X size={17} /> : <Coffee size={17} />}
        </span>
        <span className="trakteer-fab-text">{WIDGET_LABEL}</span>
      </button>
    </div>
  );
}

export { CREATOR_NAME, CREATOR_USERNAME, TIP_AMOUNTS, TRAKTEER_PAGE, WIDGET_LABEL };

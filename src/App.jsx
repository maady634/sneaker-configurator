import { useState, useEffect, useCallback, useRef } from "react";
import { Unity, useUnityContext } from "react-unity-webgl";

// ── Palette presets per part ──────────────────────────────────────────────────
const PARTS = [
    { id: "body", label: "Body", method: "ChangeBody" },
    { id: "top", label: "Top", method: "ChangeTop" },
    { id: "cover", label: "Cover", method: "ChangeCover" },
    { id: "lace", label: "Laces", method: "ChangeLace" },
];

const SWATCHES = [
    { hex: "#F5F0EB", label: "Chalk" },
    { hex: "#1A1A1A", label: "Obsidian" },
    { hex: "#C9A84C", label: "Gold" },
    { hex: "#B33A3A", label: "Crimson" },
    { hex: "#2E4A7A", label: "Navy" },
    { hex: "#3D7A4F", label: "Forest" },
    { hex: "#8B5CF6", label: "Violet" },
    { hex: "#E07B39", label: "Ember" },
];

const FINISHES = [
    { id: "matte", label: "Matte", method: "ChangeToMatte" },
    { id: "glossy", label: "Glossy", method: "ChangeToGlossy" },
];

const INITIAL_COLORS = {
    body: "#F5F0EB",
    top: "#1A1A1A",
    cover: "#F5F0EB",
    lace: "#C9A84C",
};

// ── Component ─────────────────────────────────────────────────────────────────
export default function SneakerConfigurator() {
    const [activePart, setActivePart] = useState("body");
    const [colors, setColors] = useState(INITIAL_COLORS);
    const [finish, setFinish] = useState("matte");
    const [saveId, setSaveId] = useState(null);
    const [loadInput, setLoadInput] = useState("");
    const [saving, setSaving] = useState(false);
    const [notification, setNotification] = useState(null);
    const notifTimer = useRef(null);

    const { unityProvider, sendMessage, isLoaded, loadingProgression } = useUnityContext({
        loaderUrl: "/unity/Build.loader.js",
        dataUrl: "/unity/Build.data",
        frameworkUrl: "/unity/Build.framework.js",
        codeUrl: "/unity/Build.wasm",
    });

    // ── Notify helper ─────────────────────────────────────────────────────────
    const notify = (msg) => {
        setNotification(msg);
        clearTimeout(notifTimer.current);
        notifTimer.current = setTimeout(() => setNotification(null), 2800);
    };

    // ── Apply color to Unity ──────────────────────────────────────────────────
    const applyColor = useCallback((partId, hex) => {
        const part = PARTS.find(p => p.id === partId);
        if (!part || !isLoaded) return;
        sendMessage("Configurator", part.method, hex);
    }, [isLoaded, sendMessage]);

    const handleSwatchClick = (hex) => {
        const next = { ...colors, [activePart]: hex };
        setColors(next);
        applyColor(activePart, hex);
    };

    // ── Apply finish ──────────────────────────────────────────────────────────
    const handleFinish = (f) => {
        setFinish(f.id);
        if (!isLoaded) return;
        sendMessage("Configurator", f.method);
    };

    // ── On load — push all initial colors ─────────────────────────────────────
    useEffect(() => {
        if (!isLoaded) return;
        PARTS.forEach(p => applyColor(p.id, colors[p.id]));
    }, [isLoaded]);

    // At the top of the component, before the return
    const API = import.meta.env.VITE_API_URL;

    // ── Save config to .NET API ───────────────────────────────────────────────
    // -- Save config to .NET API
    const handleSave = async () => {
        setSaving(true);
        try {
            const res = await fetch(`${API}/configurations`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                // Field names match .NET ConfigDto exactly
                body: JSON.stringify({
                    bodyColor: colors.body,
                    topColor: colors.top,
                    coverColor: colors.cover,
                    laceColor: colors.lace,
                    finish,
                }),
            });
            if (!res.ok) throw new Error(`Server responded ${res.status}`);
            const data = await res.json();
            setSaveId(data.id);
            notify("Saved — ID copied to clipboard.");
            navigator.clipboard?.writeText(data.id).catch(() => { });
        } catch (err) {
            console.error("Save failed:", err);
            notify("Save failed — is the API running on :5000?");
        } finally {
            setSaving(false);
        }
    };

    // -- Load config from .NET API
    const handleLoad = async () => {
        if (!loadInput.trim()) return;
        try {
            const res = await fetch(`${API}/configurations/${loadInput.trim()}`);
            if (!res.ok) throw new Error(`Server responded ${res.status}`);
            const data = await res.json();

            // API returns flat fields: bodyColor, topColor, coverColor, laceColor, finish
            // Map back to the colors shape React uses internally
            const restored = {
                body: data.bodyColor,
                top: data.topColor,
                cover: data.coverColor,
                lace: data.laceColor,
            };

            setColors(restored);
            setFinish(data.finish);

            // Push every restored color into Unity
            if (isLoaded) {
                PARTS.forEach(p => {
                    sendMessage("Configurator", p.method, restored[p.id]);
                });
                // Push finish into Unity
                const f = FINISHES.find(x => x.id === data.finish);
                if (f) sendMessage("Configurator", f.method);
            }

            notify("Configuration restored.");
        } catch (err) {
            console.error("Load failed:", err);
            notify("Could not load — check the ID.");
        }
    };

    const progress = Math.round(loadingProgression * 100);

    return (
        <>
            {/* ── Global styles ──────────────────────────────────────────────── */}
            <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Bebas+Neue&family=DM+Sans:wght@300;400;500&display=swap');

        *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }

        html, body, #root {
          width: 100%;
          height: 100%;
          margin: 0;
          padding: 0;
          overflow: hidden;
        }

        body {
          background: #0C0C0C;
          color: #E8E4DC;
          font-family: 'DM Sans', sans-serif;
          font-weight: 300;
        }

        .cfg-root {
          display: flex;
          height: 100vh;
          width: 100vw;
          position: fixed;
          top: 0;
          left: 0;
        }

        /* ── Left panel ── */
        .cfg-panel {
          width: 340px;
          flex-shrink: 0;
          background: #111111;
          border-right: 1px solid #222;
          display: flex;
          flex-direction: column;
          overflow-y: auto;
          overflow-x: hidden;
          scrollbar-width: thin;
          scrollbar-color: #2a2a2a #111;
          z-index: 10;
        }

        .cfg-panel::-webkit-scrollbar { width: 4px; }
        .cfg-panel::-webkit-scrollbar-track { background: #111; }
        .cfg-panel::-webkit-scrollbar-thumb { background: #2a2a2a; border-radius: 2px; }

        .panel-header {
          padding: 28px 28px 20px;
          border-bottom: 1px solid #1e1e1e;
        }

        .brand-line {
          font-size: 10px;
          letter-spacing: 0.22em;
          text-transform: uppercase;
          color: #555;
          margin-bottom: 6px;
        }

        .product-name {
          font-family: 'Bebas Neue', sans-serif;
          font-size: 36px;
          line-height: 1;
          letter-spacing: 0.04em;
          color: #F0EBE0;
        }

        .product-sub {
          font-size: 12px;
          color: #444;
          margin-top: 4px;
          letter-spacing: 0.06em;
        }

        /* ── Section ── */
        .panel-section {
          padding: 22px 28px;
          border-bottom: 1px solid #1a1a1a;
        }

        .section-label {
          font-size: 9px;
          letter-spacing: 0.2em;
          text-transform: uppercase;
          color: #444;
          margin-bottom: 14px;
        }

        /* ── Part tabs ── */
        .part-tabs {
          display: grid;
          grid-template-columns: repeat(4, 1fr);
          gap: 6px;
        }

        .part-tab {
          background: transparent;
          border: 1px solid #222;
          color: #555;
          font-family: 'DM Sans', sans-serif;
          font-size: 11px;
          letter-spacing: 0.08em;
          padding: 8px 4px;
          cursor: pointer;
          transition: all 0.15s ease;
          border-radius: 2px;
          text-align: center;
        }

        .part-tab:hover { border-color: #444; color: #888; }

        .part-tab.active {
          background: #E8E4DC;
          border-color: #E8E4DC;
          color: #0C0C0C;
          font-weight: 500;
        }

        /* ── Color indicator ── */
        .color-indicator {
          display: flex;
          align-items: center;
          gap: 10px;
          margin-bottom: 14px;
        }

        .color-dot {
          width: 20px;
          height: 20px;
          border-radius: 50%;
          border: 1px solid rgba(255,255,255,0.1);
          flex-shrink: 0;
          transition: background 0.2s ease;
        }

        .color-label {
          font-size: 12px;
          color: #888;
        }

        /* ── Swatches ── */
        .swatch-grid {
          display: grid;
          grid-template-columns: repeat(8, 1fr);
          gap: 7px;
        }

        .swatch {
          aspect-ratio: 1;
          border-radius: 50%;
          cursor: pointer;
          border: 2px solid transparent;
          transition: transform 0.12s ease, border-color 0.12s ease;
          position: relative;
        }

        .swatch:hover { transform: scale(1.18); }

        .swatch.selected {
          border-color: #E8E4DC;
          transform: scale(1.12);
        }

        .swatch::after {
          content: '';
          position: absolute;
          inset: -4px;
          border-radius: 50%;
          border: 1px solid rgba(255,255,255,0.12);
          opacity: 0;
          transition: opacity 0.12s;
        }

        .swatch.selected::after { opacity: 1; }

        /* ── Custom hex ── */
        .hex-row {
          display: flex;
          gap: 8px;
          margin-top: 14px;
          align-items: center;
        }

        .hex-input {
          flex: 1;
          background: #181818;
          border: 1px solid #252525;
          color: #E8E4DC;
          font-family: 'DM Sans', sans-serif;
          font-size: 12px;
          padding: 8px 12px;
          border-radius: 2px;
          letter-spacing: 0.08em;
          outline: none;
          transition: border-color 0.15s;
        }

        .hex-input:focus { border-color: #444; }
        .hex-input::placeholder { color: #333; }

        .hex-apply {
          background: #1e1e1e;
          border: 1px solid #2a2a2a;
          color: #888;
          font-family: 'DM Sans', sans-serif;
          font-size: 11px;
          padding: 8px 14px;
          cursor: pointer;
          border-radius: 2px;
          letter-spacing: 0.06em;
          transition: all 0.15s;
          white-space: nowrap;
        }

        .hex-apply:hover { border-color: #444; color: #ccc; }

        /* ── Finish toggle ── */
        .finish-toggle {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 8px;
        }

        .finish-btn {
          background: transparent;
          border: 1px solid #222;
          color: #444;
          font-family: 'DM Sans', sans-serif;
          font-size: 11px;
          letter-spacing: 0.1em;
          text-transform: uppercase;
          padding: 12px;
          cursor: pointer;
          border-radius: 2px;
          transition: all 0.15s;
        }

        .finish-btn:hover { border-color: #333; color: #666; }

        .finish-btn.active {
          border-color: #E8E4DC;
          color: #E8E4DC;
        }

        /* ── Config summary ── */
        .summary-list {
          display: flex;
          flex-direction: column;
          gap: 8px;
        }

        .summary-row {
          display: flex;
          align-items: center;
          justify-content: space-between;
        }

        .summary-key {
          font-size: 11px;
          color: #444;
          letter-spacing: 0.08em;
          text-transform: uppercase;
        }

        .summary-val {
          display: flex;
          align-items: center;
          gap: 7px;
        }

        .summary-dot {
          width: 12px;
          height: 12px;
          border-radius: 50%;
          border: 1px solid rgba(255,255,255,0.08);
        }

        .summary-hex {
          font-size: 11px;
          color: #666;
          font-family: 'DM Sans', sans-serif;
          letter-spacing: 0.05em;
        }

        /* ── Save/load ── */
        .save-btn {
          width: 100%;
          background: #E8E4DC;
          border: none;
          color: #0C0C0C;
          font-family: 'DM Sans', sans-serif;
          font-size: 12px;
          font-weight: 500;
          letter-spacing: 0.12em;
          text-transform: uppercase;
          padding: 14px;
          cursor: pointer;
          border-radius: 2px;
          transition: all 0.15s;
          margin-bottom: 8px;
        }

        .save-btn:hover { background: #fff; }
        .save-btn:disabled { background: #222; color: #444; cursor: default; }

        .save-id-display {
          font-size: 10px;
          color: #444;
          letter-spacing: 0.06em;
          text-align: center;
          margin-bottom: 12px;
          font-family: 'DM Sans', sans-serif;
        }

        .save-id-val { color: #888; margin-left: 6px; }

        .load-row {
          display: flex;
          gap: 8px;
        }

        .load-input {
          flex: 1;
          background: #181818;
          border: 1px solid #252525;
          color: #E8E4DC;
          font-family: 'DM Sans', sans-serif;
          font-size: 11px;
          padding: 9px 12px;
          border-radius: 2px;
          outline: none;
          letter-spacing: 0.04em;
          transition: border-color 0.15s;
        }

        .load-input:focus { border-color: #444; }
        .load-input::placeholder { color: #2a2a2a; }

        .load-btn {
          background: transparent;
          border: 1px solid #2a2a2a;
          color: #555;
          font-family: 'DM Sans', sans-serif;
          font-size: 11px;
          letter-spacing: 0.08em;
          padding: 9px 16px;
          cursor: pointer;
          border-radius: 2px;
          transition: all 0.15s;
        }

        .load-btn:hover { border-color: #444; color: #888; }

        /* ── Right — Unity canvas area ── */
        .cfg-canvas-area {
          flex: 1;
          position: relative;
          background: #0C0C0C;
          display: flex;
          align-items: center;
          justify-content: center;
          overflow: hidden;
        }

        /* Subtle grain texture */
        .cfg-canvas-area::before {
          content: '';
          position: absolute;
          inset: 0;
          background-image: url("data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noise'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noise)' opacity='0.04'/%3E%3C/svg%3E");
          pointer-events: none;
          z-index: 1;
          opacity: 0.5;
        }

        /* Corner marks */
        .corner-mark {
          position: absolute;
          width: 20px;
          height: 20px;
          z-index: 2;
          pointer-events: none;
        }

        .corner-mark.tl { top: 24px; left: 24px; border-top: 1px solid #2a2a2a; border-left: 1px solid #2a2a2a; }
        .corner-mark.tr { top: 24px; right: 24px; border-top: 1px solid #2a2a2a; border-right: 1px solid #2a2a2a; }
        .corner-mark.bl { bottom: 24px; left: 24px; border-bottom: 1px solid #2a2a2a; border-left: 1px solid #2a2a2a; }
        .corner-mark.br { bottom: 24px; right: 24px; border-bottom: 1px solid #2a2a2a; border-right: 1px solid #2a2a2a; }

        /* Bottom hint */
        .canvas-hint {
          position: absolute;
          bottom: 28px;
          left: 50%;
          transform: translateX(-50%);
          font-size: 10px;
          letter-spacing: 0.18em;
          text-transform: uppercase;
          color: #2a2a2a;
          z-index: 2;
          pointer-events: none;
          white-space: nowrap;
        }

        /* Unity canvas */
        .unity-canvas-wrapper {
          position: absolute;
          inset: 0;
          z-index: 0;
        }

        .unity-canvas-wrapper canvas {
          width: 100% !important;
          height: 100% !important;
        }

        /* Loading overlay */
        .loading-overlay {
          position: absolute;
          inset: 0;
          background: #0C0C0C;
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          z-index: 10;
          transition: opacity 0.6s ease;
        }

        .loading-overlay.hidden {
          opacity: 0;
          pointer-events: none;
        }

        .loading-name {
          font-family: 'Bebas Neue', sans-serif;
          font-size: 48px;
          letter-spacing: 0.1em;
          color: #1e1e1e;
          margin-bottom: 48px;
        }

        .loading-bar-track {
          width: 200px;
          height: 1px;
          background: #1a1a1a;
          position: relative;
        }

        .loading-bar-fill {
          height: 100%;
          background: #E8E4DC;
          transition: width 0.3s ease;
        }

        .loading-pct {
          margin-top: 16px;
          font-size: 10px;
          letter-spacing: 0.2em;
          color: #333;
        }

        /* ── Notification ── */
        .notification {
          position: fixed;
          top: 24px;
          right: 24px;
          background: #E8E4DC;
          color: #0C0C0C;
          font-size: 12px;
          font-weight: 500;
          letter-spacing: 0.06em;
          padding: 12px 20px;
          border-radius: 2px;
          z-index: 100;
          animation: slideIn 0.2s ease;
        }

        @keyframes slideIn {
          from { opacity: 0; transform: translateY(-8px); }
          to   { opacity: 1; transform: translateY(0); }
        }

        @media (max-width: 768px) {
          .cfg-root { flex-direction: column; overflow: auto; }
          .cfg-panel { width: 100%; border-right: none; border-bottom: 1px solid #222; overflow: visible; }
          .cfg-canvas-area { height: 55vw; min-height: 300px; }
          body { overflow: auto; }
        }
      `}</style>

            {/* ── Notification ── */}
            {notification && <div className="notification">{notification}</div>}

            <div className="cfg-root">

                {/* ══ Left Panel ════════════════════════════════════════════════ */}
                <aside className="cfg-panel">

                    {/* Header */}
                    <div className="panel-header">
                        <div className="brand-line">Sneaker Configurator</div>
                        <div className="product-name">CUSTOM<br />EDITION</div>
                        <div className="product-sub">Design your own · {Object.keys(colors).length} zones</div>
                    </div>

                    {/* Part selector */}
                    <div className="panel-section">
                        <div className="section-label">Select part</div>
                        <div className="part-tabs">
                            {PARTS.map(p => (
                                <button
                                    key={p.id}
                                    className={`part-tab${activePart === p.id ? " active" : ""}`}
                                    onClick={() => setActivePart(p.id)}
                                >
                                    {p.label}
                                </button>
                            ))}
                        </div>
                    </div>

                    {/* Color picker */}
                    <div className="panel-section">
                        <div className="section-label">Color</div>

                        <div className="color-indicator">
                            <div className="color-dot" style={{ background: colors[activePart] }} />
                            <span className="color-label">
                                {SWATCHES.find(s => s.hex === colors[activePart])?.label ?? "Custom"} · {colors[activePart].toUpperCase()}
                            </span>
                        </div>

                        <div className="swatch-grid">
                            {SWATCHES.map(s => (
                                <div
                                    key={s.hex}
                                    className={`swatch${colors[activePart] === s.hex ? " selected" : ""}`}
                                    style={{ background: s.hex }}
                                    title={s.label}
                                    onClick={() => handleSwatchClick(s.hex)}
                                />
                            ))}
                        </div>

                        {/* Custom hex */}
                        <div className="hex-row">
                            <input
                                className="hex-input"
                                placeholder="#CUSTOM"
                                maxLength={7}
                                defaultValue=""
                                id="hex-custom"
                            />
                            <button
                                className="hex-apply"
                                onClick={() => {
                                    const val = document.getElementById("hex-custom").value;
                                    if (/^#[0-9A-Fa-f]{6}$/.test(val)) handleSwatchClick(val);
                                }}
                            >
                                Apply
                            </button>
                        </div>
                    </div>

                    {/* Finish */}
                    <div className="panel-section">
                        <div className="section-label">Finish</div>
                        <div className="finish-toggle">
                            {FINISHES.map(f => (
                                <button
                                    key={f.id}
                                    className={`finish-btn${finish === f.id ? " active" : ""}`}
                                    onClick={() => handleFinish(f)}
                                >
                                    {f.label}
                                </button>
                            ))}
                        </div>
                    </div>

                    {/* Summary */}
                    <div className="panel-section">
                        <div className="section-label">Configuration</div>
                        <div className="summary-list">
                            {PARTS.map(p => (
                                <div className="summary-row" key={p.id}>
                                    <span className="summary-key">{p.label}</span>
                                    <div className="summary-val">
                                        <div className="summary-dot" style={{ background: colors[p.id] }} />
                                        <span className="summary-hex">{colors[p.id].toUpperCase()}</span>
                                    </div>
                                </div>
                            ))}
                            <div className="summary-row">
                                <span className="summary-key">Finish</span>
                                <span className="summary-hex">{finish.charAt(0).toUpperCase() + finish.slice(1)}</span>
                            </div>
                        </div>
                    </div>

                    {/* Save / Load */}
                    <div className="panel-section">
                        <div className="section-label">Save & Share</div>

                        <button className="save-btn" onClick={handleSave} disabled={saving}>
                            {saving ? "Saving..." : "Save Configuration"}
                        </button>

                        {saveId && (
                            <div className="save-id-display">
                                ID <span className="save-id-val">{saveId}</span>
                            </div>
                        )}

                        <div className="load-row">
                            <input
                                className="load-input"
                                placeholder="Paste config ID..."
                                value={loadInput}
                                onChange={e => setLoadInput(e.target.value)}
                                onKeyDown={e => e.key === "Enter" && handleLoad()}
                            />
                            <button className="load-btn" onClick={handleLoad}>Load</button>
                        </div>
                    </div>

                </aside>

                {/* ══ Right — Unity Canvas ═══════════════════════════════════════ */}
                <div className="cfg-canvas-area">

                    {/* Corner marks */}
                    <div className="corner-mark tl" />
                    <div className="corner-mark tr" />
                    <div className="corner-mark bl" />
                    <div className="corner-mark br" />

                    <span className="canvas-hint">[ Drag to rotate ]</span>

                    {/* Unity */}
                    <div className="unity-canvas-wrapper">
                        <Unity unityProvider={unityProvider} style={{ width: "100%", height: "100%" }} />
                    </div>

                    {/* Loading overlay */}
                    <div className={`loading-overlay${isLoaded ? " hidden" : ""}`}>
                        <div className="loading-name">CONFIGURATOR</div>
                        <div className="loading-bar-track">
                            <div className="loading-bar-fill" style={{ width: `${progress}%` }} />
                        </div>
                        <div className="loading-pct">{progress}%</div>
                    </div>

                </div>
            </div>
        </>
    );
}

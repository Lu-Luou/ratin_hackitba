"use client";

import { useState, useEffect } from "react";

const tailwindConfig = `
  @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600&family=Manrope:wght@600;700;800&display=swap');
  @import url('https://fonts.googleapis.com/css2?family=Material+Symbols+Outlined:wght,FILL@100..700,0..1&display=swap');
`;

const Icon = ({ name, className = "" }) => (
  <span className={`material-symbols-outlined ${className}`}>{name}</span>
);

export default function CampoIA() {
  const [scrolled, setScrolled] = useState(false);
  const [sessionUser, setSessionUser] = useState(null);

  useEffect(() => {
    const handleScroll = () => setScrolled(window.scrollY > 10);
    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  useEffect(() => {
    let isMounted = true;

    const loadSessionUser = async () => {
      try {
        const response = await fetch("/api/auth/me", {
          method: "GET",
          credentials: "include",
        });

        if (!response.ok) {
          if (isMounted) {
            setSessionUser(null);
          }
          return;
        }

        const payload = await response.json().catch(() => ({}));

        if (isMounted && payload?.user) {
          setSessionUser(payload.user);
        }
      } catch {
        if (isMounted) {
          setSessionUser(null);
        }
      }
    };

    loadSessionUser();

    return () => {
      isMounted = false;
    };
  }, []);

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600&family=Manrope:wght@600;700;800&display=swap');
        @import url('https://fonts.googleapis.com/css2?family=Material+Symbols+Outlined:opsz,wght,FILL,GRAD@24,400,0,0&display=swap');

        .campoia-root {
          --color-primary: #18402f;
          --color-primary-container: #305846;
          --color-secondary: #426920;
          --color-secondary-container: #bfee95;
          --color-tertiary: #553112;
          --color-tertiary-container: #704727;
          --color-tertiary-fixed: #ffdcc5;
          --color-tertiary-fixed-dim: #f4bb92;
          --color-surface: #f7faf5;
          --color-surface-dim: #d8dbd6;
          --color-surface-variant: #e0e3df;
          --color-surface-container: #ecefea;
          --color-surface-container-low: #f1f4ef;
          --color-surface-container-high: #e6e9e4;
          --color-surface-container-highest: #e0e3df;
          --color-on-primary: #ffffff;
          --color-on-primary-container: #a1ccb5;
          --color-on-secondary: #ffffff;
          --color-on-secondary-container: #466d24;
          --color-on-tertiary: #ffffff;
          --color-on-tertiary-container: #f0b78f;
          --color-on-surface: #191c1a;
          --color-on-surface-variant: #42493e;
          --color-outline: #72796e;
          --color-outline-variant: #c2c9bb;
          --color-inverse-primary: #a5d0b9;
          --color-inverse-surface: #2d312e;
          --color-inverse-on-surface: #eff2ed;
          --color-error: #ba1a1a;
          --color-error-container: #ffdad6;
          --color-on-error: #ffffff;
          --color-on-error-container: #93000a;
          font-family: 'Inter', sans-serif;
          background: var(--color-surface);
          color: var(--color-on-surface);
          scroll-behavior: smooth;
        }

        .campoia-root .material-symbols-outlined {
          font-family: 'Material Symbols Outlined';
          font-weight: normal;
          font-style: normal;
          font-size: 24px;
          line-height: 1;
          letter-spacing: normal;
          text-transform: none;
          display: inline-block;
          white-space: nowrap;
          word-wrap: normal;
          direction: ltr;
          font-variation-settings: 'FILL' 0, 'wght' 400, 'GRAD' 0, 'opsz' 24;
          -webkit-font-feature-settings: 'liga';
          font-feature-settings: 'liga';
          -webkit-font-smoothing: antialiased;
        }

        .campoia-root .glass-nav {
          background: rgba(247, 250, 245, 0.85);
          backdrop-filter: blur(12px);
          -webkit-backdrop-filter: blur(12px);
          transition: box-shadow 0.3s ease;
        }
        .campoia-root .glass-nav.scrolled {
          box-shadow: 0 1px 0 0 var(--color-outline-variant);
        }
        .campoia-root .organic-gradient {
          background: linear-gradient(135deg, #18402f 0%, #305846 100%);
        }
        .campoia-root .font-headline {
          font-family: 'Manrope', sans-serif;
        }
        .campoia-root .bento-card {
          transition: background-color 0.2s ease;
        }
        .campoia-root .bento-card:hover {
          background-color: var(--color-surface-container);
        }
        .campoia-root ::selection {
          background: var(--color-secondary-container);
          color: var(--color-on-secondary-container);
        }
      `}</style>

      <div className="campoia-root">
        {/* Nav */}
        <nav className={`fixed top-0 w-full z-50 glass-nav ${scrolled ? "scrolled" : ""}`}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "1rem 2rem", maxWidth: "80rem", margin: "0 auto" }}>
            <div className="font-headline" style={{ fontSize: "1.5rem", fontWeight: 700, color: "var(--color-primary)", letterSpacing: "-0.025em" }}>CampoIA</div>
            <div style={{ display: "flex", alignItems: "center", gap: "2rem" }}>
              <a href="#" className="font-headline" style={{ color: "var(--color-primary)", fontWeight: 600, letterSpacing: "-0.025em", borderBottom: "2px solid var(--color-primary)", paddingBottom: "0.25rem", textDecoration: "none", fontSize: "0.95rem" }}>Features</a>
              <a href="#" className="font-headline" style={{ color: "var(--color-on-surface-variant)", fontWeight: 600, letterSpacing: "-0.025em", textDecoration: "none", fontSize: "0.95rem", transition: "color 0.2s" }}
                onMouseEnter={e => e.target.style.color = "var(--color-primary)"}
                onMouseLeave={e => e.target.style.color = "var(--color-on-surface-variant)"}>Case Studies</a>
              <a href="#" className="font-headline" style={{ color: "var(--color-on-surface-variant)", fontWeight: 600, letterSpacing: "-0.025em", textDecoration: "none", fontSize: "0.95rem", transition: "color 0.2s" }}
                onMouseEnter={e => e.target.style.color = "var(--color-primary)"}
                onMouseLeave={e => e.target.style.color = "var(--color-on-surface-variant)"}>Pricing</a>
            </div>
            {sessionUser ? (
              <button
                title={sessionUser?.email ? `Usuario: ${sessionUser.email}` : "Usuario autenticado"}
                style={{ background: "var(--color-secondary)", color: "var(--color-on-secondary)", padding: "0.625rem 1.5rem", borderRadius: "0.5rem", fontWeight: 600, border: "none", cursor: "default", fontSize: "0.95rem", transition: "transform 0.15s" }}
                onClick={() => {}}
                onMouseEnter={e => e.currentTarget.style.transform = "scale(0.97)"}
                onMouseLeave={e => e.currentTarget.style.transform = "scale(1)"}
              >
                {sessionUser?.name ? `${sessionUser.name}` : "name"}
              </button>
            ) : (
              <button style={{ background: "var(--color-primary)", color: "var(--color-on-primary)", padding: "0.625rem 1.5rem", borderRadius: "0.5rem", fontWeight: 600, border: "none", cursor: "pointer", fontSize: "0.95rem", transition: "transform 0.15s" }}
                onMouseEnter={e => e.currentTarget.style.transform = "scale(0.97)"}
                onMouseLeave={e => e.currentTarget.style.transform = "scale(1)"}>
                Get Started
              </button>
            )}
          </div>
        </nav>

        <main style={{ paddingTop: "6rem" }}>
          {/* Hero */}
          <section style={{ padding: "4rem 2rem 6rem", maxWidth: "80rem", margin: "0 auto" }}>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "3rem", alignItems: "center" }}>
              <div style={{ display: "flex", flexDirection: "column", gap: "2rem" }}>
                <h1 className="font-headline" style={{ fontSize: "clamp(2.5rem, 5vw, 4.5rem)", fontWeight: 800, color: "var(--color-primary)", lineHeight: 1.1, letterSpacing: "-0.025em", margin: 0 }}>
                  Maximize Every Hectare with Digital Intelligence.
                </h1>
                <p style={{ fontSize: "1.2rem", color: "var(--color-on-surface-variant)", maxWidth: "36rem", lineHeight: 1.7, margin: 0 }}>
                  The AI-powered platform that centralizes your field data, predicts productivity, and provides actionable financial recommendations.
                </p>
                <div>
                  <button className="organic-gradient font-headline" style={{ color: "var(--color-on-primary)", padding: "1rem 2rem", borderRadius: "0.5rem", fontWeight: 700, border: "none", cursor: "pointer", boxShadow: "0 8px 24px rgba(24,64,47,0.15)", display: "inline-flex", alignItems: "center", gap: "0.5rem", fontSize: "1rem", transition: "opacity 0.2s" }}
                    onMouseEnter={e => e.currentTarget.style.opacity = "0.9"}
                    onMouseLeave={e => e.currentTarget.style.opacity = "1"}>
                    Start Your Free Assessment
                    <Icon name="arrow_forward" />
                  </button>
                </div>
              </div>
              <div style={{ position: "relative" }}>
                <div style={{ aspectRatio: "4/5", borderRadius: "2rem", overflow: "hidden", background: "var(--color-surface-container-low)", position: "relative" }}>
                  <img
                    src="https://lh3.googleusercontent.com/aida-public/AB6AXuBDTxRW12CuVFTbwKcmaHdhYjVz1TGZzZ2PidRsHEyvIWz7X29xWwwEp3FV01YiIgZx-l5NWJiF00qghHS5mPDS_JSwFHGZSGB4tQ7aME0bg4P9vaRbCv7hVdiXmFNyAOGVTFpEv0X63C_BDhJV9Sj2FkYnFZqAzI67hn0Mngz-zm0DJpUSVDmWaMivNyRKWLaDJDlfRCh24ra7lGlddDlQgFJ7VcVBxzStboN_E3QTHt3boIzZxkfyHsF4LIe_JZhfK8Zy3PPNMac"
                    alt="AI farming visualization"
                    style={{ width: "100%", height: "100%", objectFit: "cover", filter: "grayscale(0.2) contrast(1.1)" }}
                  />
                  <div style={{ position: "absolute", inset: 0, background: "rgba(24,64,47,0.1)", mixBlendMode: "multiply" }} />
                  {/* Floating: Soil Nitrogen */}
                  <div style={{ position: "absolute", top: "2rem", left: "2rem", background: "rgba(247,250,245,0.92)", backdropFilter: "blur(8px)", padding: "1rem", borderRadius: "0.75rem", boxShadow: "0 8px 24px rgba(0,0,0,0.12)", border: "1px solid rgba(255,255,255,0.2)", display: "flex", alignItems: "center", gap: "0.75rem" }}>
                    <Icon name="eco" style={{ color: "var(--color-secondary)" }} />
                    <div>
                      <div style={{ fontSize: "0.6rem", textTransform: "uppercase", letterSpacing: "0.15em", color: "var(--color-on-surface-variant)", fontWeight: 700 }}>Soil Nitrogen</div>
                      <div className="font-headline" style={{ fontSize: "1.1rem", fontWeight: 700, color: "var(--color-primary)" }}>84% Optimal</div>
                    </div>
                  </div>
                  {/* Floating: Predicted Yield */}
                  <div style={{ position: "absolute", bottom: "2rem", right: "2rem", background: "rgba(247,250,245,0.92)", backdropFilter: "blur(8px)", padding: "1.5rem", borderRadius: "0.75rem", boxShadow: "0 8px 24px rgba(0,0,0,0.12)", border: "1px solid rgba(255,255,255,0.2)" }}>
                    <div style={{ fontSize: "0.6rem", textTransform: "uppercase", letterSpacing: "0.15em", color: "var(--color-on-surface-variant)", fontWeight: 700, marginBottom: "0.25rem" }}>Predicted Yield</div>
                    <div className="font-headline" style={{ fontSize: "1.5rem", fontWeight: 700, color: "var(--color-primary)", marginBottom: "0.5rem" }}>12.4 t/ha</div>
                    <div style={{ height: "6px", width: "100%", background: "var(--color-surface-container)", borderRadius: "999px", overflow: "hidden" }}>
                      <div style={{ height: "100%", background: "var(--color-secondary)", width: "80%" }} />
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </section>

          {/* Social Proof */}
          <section style={{ background: "var(--color-surface-container-low)", padding: "3rem 2rem" }}>
            <div style={{ maxWidth: "80rem", margin: "0 auto", display: "flex", flexWrap: "wrap", alignItems: "center", justifyContent: "space-between", gap: "2rem", opacity: 0.6, filter: "grayscale(1)" }}>
              {[
                { icon: "public", label: "NASA" },
                { icon: "satellite_alt", label: "CONAE" },
                { icon: "account_balance", label: "Global AgroBank" },
              ].map(({ icon, label }) => (
                <div key={label} style={{ display: "flex", alignItems: "center", gap: "1rem" }}>
                  <Icon name={icon} style={{ fontSize: "1.75rem" }} />
                  <span className="font-headline" style={{ fontWeight: 700, fontSize: "1.2rem", textTransform: "uppercase", letterSpacing: "-0.05em" }}>{label}</span>
                </div>
              ))}
              <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", borderLeft: "2px solid var(--color-outline-variant)", paddingLeft: "2rem" }}>
                <Icon name="encrypted" style={{ color: "var(--color-secondary)", fontSize: "1.1rem" }} />
                <span style={{ fontSize: "0.65rem", fontWeight: 700, color: "var(--color-on-surface-variant)", letterSpacing: "0.1em" }}>AES-256 MILITARY GRADE ENCRYPTION</span>
              </div>
            </div>
          </section>

          {/* Bento Grid */}
          <section style={{ padding: "6rem 2rem", maxWidth: "80rem", margin: "0 auto" }}>
            <div style={{ marginBottom: "4rem" }}>
              <h2 className="font-headline" style={{ fontSize: "clamp(2rem, 4vw, 3rem)", fontWeight: 700, color: "var(--color-primary)", marginBottom: "0.75rem" }}>Precision Intelligence</h2>
              <p style={{ color: "var(--color-on-surface-variant)", fontSize: "1.1rem" }}>Sophisticated analytics for the modern producer.</p>
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(12, 1fr)", gap: "1.5rem" }}>

              {/* Card 1: 30s Summary */}
              <div className="bento-card" style={{ gridColumn: "span 8", background: "var(--color-surface-container-low)", borderRadius: "1.5rem", padding: "2rem", display: "flex", flexDirection: "column", justifyContent: "space-between" }}>
                <div style={{ maxWidth: "32rem" }}>
                  <span style={{ background: "rgba(66,105,32,0.1)", color: "var(--color-secondary)", padding: "0.25rem 0.75rem", borderRadius: "999px", fontSize: "0.7rem", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.1em", display: "inline-block", marginBottom: "1.5rem" }}>Overview</span>
                  <h3 className="font-headline" style={{ fontSize: "1.75rem", fontWeight: 700, color: "var(--color-primary)", marginBottom: "1rem" }}>The 30-Second Summary</h3>
                  <p style={{ color: "var(--color-on-surface-variant)", lineHeight: 1.7 }}>A single, unified view of your entire operation. Instantly grasp field health, projected profit, and risk exposure without digging through spreadsheets.</p>
                </div>
                <div style={{ marginTop: "2rem", display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: "1rem" }}>
                  {[
                    { value: "92%", label: "Health", color: "var(--color-secondary)" },
                    { value: "+$142k", label: "Est. Profit", color: "var(--color-primary)" },
                    { value: "Low", label: "Risk Level", color: "var(--color-tertiary)" },
                  ].map(({ value, label, color }) => (
                    <div key={label} style={{ background: "rgba(255,255,255,0.5)", padding: "1rem", borderRadius: "0.75rem" }}>
                      <div className="font-headline" style={{ fontSize: "1.4rem", fontWeight: 700, color }}>{value}</div>
                      <div style={{ fontSize: "0.6rem", textTransform: "uppercase", fontWeight: 700, color: "var(--color-on-surface-variant)", letterSpacing: "0.1em" }}>{label}</div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Card 2: CampoScore */}
              <div style={{ gridColumn: "span 4", background: "var(--color-primary)", borderRadius: "1.5rem", padding: "2rem", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", textAlign: "center", position: "relative", overflow: "hidden" }}>
                <div style={{ position: "absolute", inset: 0, opacity: 0.1 }}>
                  <img src="https://lh3.googleusercontent.com/aida-public/AB6AXuBYeFVnlWNF_cE6Yb1dFIfj9fF3Ymm1XD9_ib6xV55KKkegKHH-HtWQb17Dod3f25io11Hxa9oDUbFQVjEKZatnf7FxpWC_T6OSYj2Sb7kZMfkapsSkAqL5CNpz05UH8VLJdA8-FiQ6dlfXVH0vGpSaFai6zcRG1R13SmUaC6TBCs3PrBmTCUnyoy4iOz9RhsrC4Yu4jZEBUByr1DRmLwIhHYrEWHM8-P8msuUymMg2vUg8a6zkUjnhvpmmTQ3M63dsD_zg0kOJiOc" alt="Texture" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                </div>
                <div style={{ position: "relative", zIndex: 1 }}>
                  <h3 className="font-headline" style={{ fontSize: "2.25rem", fontWeight: 700, color: "var(--color-on-primary)", marginBottom: "1rem" }}>CampoScore</h3>
                  <p style={{ color: "var(--color-on-primary-container)", fontSize: "0.85rem", marginBottom: "2rem", lineHeight: 1.6 }}>Your proprietary digital credit score to unlock specialized agricultural financing.</p>
                  <div className="font-headline" style={{ fontSize: "4rem", fontWeight: 800, color: "var(--color-secondary-container)" }}>842</div>
                  <div style={{ marginTop: "1rem", fontSize: "0.7rem", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.2em", color: "rgba(255,255,255,0.5)" }}>Platinum Rated</div>
                </div>
              </div>

              {/* Card 3: Digital Twin Map */}
              <div style={{ gridColumn: "span 4", background: "var(--color-surface-container-high)", borderRadius: "1.5rem", padding: "2rem", position: "relative", minHeight: "400px", overflow: "hidden" }}>
                <h3 className="font-headline" style={{ fontSize: "1.4rem", fontWeight: 700, color: "var(--color-primary)", marginBottom: "0.5rem" }}>Digital Twin Map</h3>
                <p style={{ color: "var(--color-on-surface-variant)", fontSize: "0.85rem", marginBottom: "1.5rem" }}>Lot-by-lot visualization of soil nutrients.</p>
                <div style={{ position: "absolute", bottom: 0, left: 0, width: "100%", height: "66%" }}>
                  <img src="https://lh3.googleusercontent.com/aida-public/AB6AXuAWeRtBUZmy-EMukAnm9-FYJFd-Zdoe60chAZ_7yMLmPRMYEPpzdGsxBLM7jKot8m5RJVFMj5xasvRENjefpCF3FaLa8oT5Udkw_GX-YVLGXta3c6IOYDzOhMX82kl-1QawfmikPf8P2gBdf9fniuAbu1oqJ5LZShpNYJooT7yOtSmngMDdbw-TIj56vvGrqPK58vuV3DR61ibXXNuj9DS_cCv1wVLSgkQ5UKIk67Vj_MpAiK39E0MXXGlYzUeOe9K450TeVtlTeOo" alt="Map" style={{ width: "100%", height: "100%", objectFit: "cover", borderTopLeftRadius: "3rem" }} />
                  <div style={{ position: "absolute", inset: 0, background: "linear-gradient(to top, var(--color-surface-container-high), transparent)" }} />
                </div>
              </div>

              {/* Card 4: Strategy Lab */}
              <div style={{ gridColumn: "span 8", background: "var(--color-tertiary)", borderRadius: "1.5rem", padding: "2rem", display: "grid", gridTemplateColumns: "1fr 1fr", gap: "2rem", alignItems: "center", overflow: "hidden" }}>
                <div>
                  <h3 className="font-headline" style={{ fontSize: "1.75rem", fontWeight: 700, color: "var(--color-on-tertiary)", marginBottom: "1rem" }}>Strategy Lab</h3>
                  <p style={{ color: "var(--color-tertiary-fixed-dim)", lineHeight: 1.7, marginBottom: "1.5rem" }}>Compare scenarios before you plant. Side-by-side ROI analysis of Soy vs. Wheat using 20 years of historical climate data.</p>
                  <ul style={{ listStyle: "none", padding: 0, margin: 0, display: "flex", flexDirection: "column", gap: "0.75rem" }}>
                    {["Satellite NDVI Integration", "Market Price Forecasting"].map(item => (
                      <li key={item} style={{ display: "flex", alignItems: "center", gap: "0.5rem", fontSize: "0.9rem", color: "var(--color-on-tertiary)" }}>
                        <Icon name="check_circle" style={{ color: "var(--color-secondary-container)", fontSize: "1.2rem" }} />
                        {item}
                      </li>
                    ))}
                  </ul>
                </div>
                <div style={{ background: "rgba(112,71,39,0.3)", padding: "1rem", borderRadius: "0.75rem", border: "1px solid rgba(255,255,255,0.1)" }}>
                  <div style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
                    <div>
                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-end", marginBottom: "0.5rem" }}>
                        <span style={{ fontSize: "0.7rem", fontWeight: 700, color: "var(--color-on-tertiary)" }}>SOYBEAN</span>
                        <span style={{ fontWeight: 700, color: "var(--color-secondary-container)" }}>+18.4% ROI</span>
                      </div>
                      <div style={{ height: "8px", width: "100%", background: "rgba(255,255,255,0.1)", borderRadius: "999px", overflow: "hidden" }}>
                        <div style={{ height: "100%", background: "var(--color-secondary-container)", width: "100%" }} />
                      </div>
                    </div>
                    <div>
                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-end", marginBottom: "0.5rem" }}>
                        <span style={{ fontSize: "0.7rem", fontWeight: 700, color: "var(--color-on-tertiary)" }}>WHEAT</span>
                        <span style={{ fontWeight: 700, color: "var(--color-error-container)" }}>+6.2% ROI</span>
                      </div>
                      <div style={{ height: "8px", width: "100%", background: "rgba(255,255,255,0.1)", borderRadius: "999px", overflow: "hidden" }}>
                        <div style={{ height: "100%", background: "var(--color-tertiary-fixed)", width: "33%" }} />
                      </div>
                    </div>
                  </div>
                </div>
              </div>

            </div>
          </section>

          {/* Testimonial */}
          <section style={{ padding: "6rem 2rem", background: "var(--color-surface-container-low)" }}>
            <div style={{ maxWidth: "56rem", margin: "0 auto", textAlign: "center" }}>
              <Icon name="format_quote" style={{ fontSize: "3rem", color: "var(--color-secondary)", display: "block", marginBottom: "2rem" }} />
              <blockquote className="font-headline" style={{ fontSize: "clamp(1.4rem, 2.5vw, 2.25rem)", fontWeight: 700, color: "var(--color-primary)", lineHeight: 1.3, fontStyle: "italic", marginBottom: "2.5rem" }}>
                "CampoIA transformed our decision-making process. By leveraging their smarter crop rotation models, we increased our ROI by 15% in a single season while reducing fertilizer waste."
              </blockquote>
              <div style={{ display: "flex", flexDirection: "column", alignItems: "center" }}>
                <div style={{ width: "4rem", height: "4rem", borderRadius: "50%", overflow: "hidden", marginBottom: "1rem", border: "2px solid var(--color-primary)" }}>
                  <img src="https://lh3.googleusercontent.com/aida-public/AB6AXuAqrFuyfLcHwmkkNQdF9weApEcBUx8nHD4cnIDtGE8oEr5BasJLmW1BSNcrfeUJPshjKKbNcrwsfQQTagNU_O1ER2ewdARlVwSU2dODrO7P-KW2MwIal2bXD0dTkH1XiGOHrv5cV4kocpGay_d1Pr5MsoqsLHp0f9iGuRtwycd2je77oMcVNy_0Mkl9MaUAQ-jZpV2Rn7KEDaO8jQe8P-J4fgOGzNobDJbinv59fP1WGIIZDFKYQqn80F7trmwrHSuT1ZKEr6OJHiA" alt="Eduardo Rossi" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                </div>
                <div style={{ fontWeight: 700, color: "var(--color-primary)" }}>Eduardo Rossi</div>
                <div style={{ fontSize: "0.85rem", color: "var(--color-on-surface-variant)" }}>Lead Producer, La Pampa Plains</div>
              </div>
            </div>
          </section>

          {/* Final CTA */}
          <section style={{ padding: "6rem 2rem" }}>
            <div className="organic-gradient" style={{ maxWidth: "64rem", margin: "0 auto", borderRadius: "2rem", padding: "5rem 4rem", textAlign: "center", position: "relative", overflow: "hidden", boxShadow: "0 25px 60px rgba(24,64,47,0.25)" }}>
              <div style={{ position: "absolute", top: 0, right: 0, width: "16rem", height: "16rem", background: "var(--color-secondary-container)", opacity: 0.1, borderRadius: "50%", filter: "blur(3rem)", transform: "translate(50%, -50%)" }} />
              <div style={{ position: "relative", zIndex: 1 }}>
                <h2 className="font-headline" style={{ fontSize: "clamp(2rem, 5vw, 3.75rem)", fontWeight: 800, color: "var(--color-on-primary)", marginBottom: "1.5rem", letterSpacing: "-0.025em" }}>Join the Future of Farming.</h2>
                <p style={{ fontSize: "1.2rem", color: "var(--color-on-primary-container)", marginBottom: "3rem", maxWidth: "40rem", margin: "0 auto 3rem" }}>Analyze your field today and unlock the data hidden beneath your soil.</p>
                <button className="font-headline" style={{ background: "var(--color-secondary-container)", color: "var(--color-on-secondary-container)", padding: "1.25rem 2.5rem", borderRadius: "0.5rem", fontWeight: 700, fontSize: "1.1rem", border: "none", cursor: "pointer", boxShadow: "0 8px 24px rgba(0,0,0,0.2)", transition: "transform 0.2s" }}
                  onMouseEnter={e => e.currentTarget.style.transform = "scale(1.05)"}
                  onMouseLeave={e => e.currentTarget.style.transform = "scale(1)"}>
                  Analyze Your Field Today
                </button>
              </div>
            </div>
          </section>
        </main>

        {/* Footer */}
        <footer style={{ background: "var(--color-surface-container-low)", borderTopLeftRadius: "1.5rem", borderTopRightRadius: "1.5rem" }}>
          <div style={{ display: "grid", gridTemplateColumns: "2fr 1fr 1fr 2fr", gap: "2rem", padding: "4rem 2rem", maxWidth: "80rem", margin: "0 auto", fontSize: "0.9rem", lineHeight: 1.8 }}>
            <div>
              <div className="font-headline" style={{ fontSize: "1.25rem", fontWeight: 700, color: "var(--color-primary)", marginBottom: "1.5rem" }}>CampoIA</div>
              <p style={{ color: "var(--color-on-surface-variant)", marginBottom: "1.5rem" }}>Advancing agricultural sustainability through precision artificial intelligence and financial clarity.</p>
              <div style={{ display: "flex", gap: "1rem" }}>
                {["share", "language"].map(icon => (
                  <Icon key={icon} name={icon} style={{ color: "var(--color-on-surface-variant)", cursor: "pointer", fontSize: "1.4rem" }} />
                ))}
              </div>
            </div>
            <div>
              <h4 style={{ fontWeight: 700, color: "var(--color-primary)", marginBottom: "1rem", textTransform: "uppercase", letterSpacing: "0.1em", fontSize: "0.7rem" }}>Product</h4>
              <ul style={{ listStyle: "none", padding: 0, margin: 0, display: "flex", flexDirection: "column", gap: "0.75rem" }}>
                {["Features", "Case Studies", "Pricing"].map(item => (
                  <li key={item}><a href="#" style={{ color: "var(--color-on-surface-variant)", textDecoration: "none" }}>{item}</a></li>
                ))}
              </ul>
            </div>
            <div>
              <h4 style={{ fontWeight: 700, color: "var(--color-primary)", marginBottom: "1rem", textTransform: "uppercase", letterSpacing: "0.1em", fontSize: "0.7rem" }}>Company</h4>
              <ul style={{ listStyle: "none", padding: 0, margin: 0, display: "flex", flexDirection: "column", gap: "0.75rem" }}>
                {["About Us", "Careers"].map(item => (
                  <li key={item}><a href="#" style={{ color: "var(--color-on-surface-variant)", textDecoration: "none" }}>{item}</a></li>
                ))}
              </ul>
            </div>
            <div>
              <h4 style={{ fontWeight: 700, color: "var(--color-primary)", marginBottom: "1rem", textTransform: "uppercase", letterSpacing: "0.1em", fontSize: "0.7rem" }}>Compliance</h4>
              <ul style={{ listStyle: "none", padding: 0, margin: 0, display: "flex", flexDirection: "column", gap: "0.75rem" }}>
                {["Privacy Policy", "Security"].map(item => (
                  <li key={item}><a href="#" style={{ color: "var(--color-on-surface-variant)", textDecoration: "none" }}>{item}</a></li>
                ))}
                <li style={{ paddingTop: "1rem", fontSize: "0.65rem", color: "rgba(66,73,62,0.6)" }}>© 2024 CampoIA. The Digital Agronomist. All rights reserved.</li>
              </ul>
            </div>
          </div>
        </footer>
      </div>
    </>
  );
}
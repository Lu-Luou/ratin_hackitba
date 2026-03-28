"use client";

import { useState } from "react";

const Icon = ({ name, fill = 0, size = 24, className = "", style = {} }) => (
  <span
    className="material-symbols-outlined"
    style={{ fontVariationSettings: `'FILL' ${fill}, 'wght' 400, 'GRAD' 0, 'opsz' ${size}`, ...style }}
  >
    {name}
  </span>
);

export default function CampoIALogin() {
  const [showPassword, setShowPassword] = useState(false);
  const [form, setForm] = useState({ email: "", password: "", remember: false });

  const handleSubmit = (e) => {
    e.preventDefault();
    console.log("Submit", form);
  };

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Manrope:wght@400;700;800&family=Inter:wght@400;500;600&display=swap');
        @import url('https://fonts.googleapis.com/css2?family=Material+Symbols+Outlined:opsz,wght,FILL,GRAD@20..48,100..700,0..1,-50..200&display=swap');

        .campoia-login {
          --c-primary: #18402f;
          --c-primary-container: #305846;
          --c-primary-fixed: #c1ecd4;
          --c-primary-fixed-dim: #a5d0b9;
          --c-secondary: #426920;
          --c-secondary-container: #bfee95;
          --c-on-secondary-container: #466d24;
          --c-tertiary: #553112;
          --c-surface: #f7faf5;
          --c-surface-container-low: #f1f4ef;
          --c-surface-container-highest: #e0e3df;
          --c-on-surface: #191c1a;
          --c-on-surface-variant: #42493e;
          --c-outline: #72796e;
          --c-outline-variant: #c2c9bb;
          --c-white: #ffffff;
          font-family: 'Inter', sans-serif;
          min-height: 100vh;
          background: var(--c-surface);
          color: var(--c-on-surface);
          display: flex;
          overflow: hidden;
        }

        .campoia-login .material-symbols-outlined {
          font-family: 'Material Symbols Outlined';
          font-weight: normal;
          font-style: normal;
          line-height: 1;
          letter-spacing: normal;
          text-transform: none;
          display: inline-block;
          white-space: nowrap;
          word-wrap: normal;
          direction: ltr;
          -webkit-font-smoothing: antialiased;
        }

        .campoia-login .font-headline { font-family: 'Manrope', sans-serif; }

        .campoia-login .agri-glass {
          background: rgba(247, 250, 245, 0.12);
          backdrop-filter: blur(12px);
          -webkit-backdrop-filter: blur(12px);
        }

        .campoia-login .dot-grid {
          background-image: radial-gradient(#bfee95 1px, transparent 1px);
          background-size: 40px 40px;
        }

        .campoia-login .field-input {
          width: 100%;
          background: var(--c-surface-container-low);
          border: none;
          border-bottom: 2px solid rgba(114,121,110,0.3);
          border-radius: 0.75rem 0.75rem 0 0;
          padding: 1rem 1rem 1rem 3rem;
          font-size: 0.95rem;
          font-weight: 500;
          color: var(--c-on-surface);
          transition: border-color 0.2s;
          outline: none;
          box-sizing: border-box;
          font-family: 'Inter', sans-serif;
        }
        .campoia-login .field-input::placeholder { color: var(--c-outline-variant); }
        .campoia-login .field-input:focus { border-bottom-color: var(--c-primary); }

        .campoia-login .btn-primary {
          width: 100%;
          padding: 1rem;
          background: var(--c-primary);
          color: var(--c-white);
          font-family: 'Manrope', sans-serif;
          font-weight: 700;
          font-size: 1rem;
          border: none;
          border-radius: 0.75rem;
          cursor: pointer;
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 0.5rem;
          transition: background 0.2s, box-shadow 0.2s;
          box-shadow: 0 4px 16px rgba(24,64,47,0.15);
        }
        .campoia-login .btn-primary:hover {
          background: var(--c-primary-container);
          box-shadow: 0 8px 24px rgba(24,64,47,0.25);
        }
        .campoia-login .btn-primary:hover .arrow-icon {
          transform: translateX(4px);
        }
        .campoia-login .arrow-icon { transition: transform 0.2s; }

        .campoia-login .btn-social {
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 0.75rem;
          padding: 0.75rem 1rem;
          border-radius: 0.75rem;
          border: 1px solid rgba(194,201,187,0.5);
          background: transparent;
          font-weight: 500;
          color: var(--c-on-surface);
          cursor: pointer;
          transition: background 0.2s;
          font-family: 'Inter', sans-serif;
          font-size: 0.9rem;
        }
        .campoia-login .btn-social:hover { background: var(--c-surface-container-low); }

        .campoia-login .help-btn {
          position: fixed;
          bottom: 2rem;
          right: 2rem;
          z-index: 50;
          width: 3rem;
          height: 3rem;
          border-radius: 50%;
          background: var(--c-surface-container-highest);
          border: 1px solid rgba(194,201,187,0.2);
          display: flex;
          align-items: center;
          justify-content: center;
          color: var(--c-primary);
          box-shadow: 0 8px 24px rgba(0,0,0,0.12);
          cursor: pointer;
          transition: transform 0.2s;
        }
        .campoia-login .help-btn:hover { transform: scale(1.05); }

        .campoia-login .divider-text {
          position: relative;
          display: flex;
          align-items: center;
          gap: 1rem;
          font-size: 0.7rem;
          font-weight: 700;
          text-transform: uppercase;
          letter-spacing: 0.12em;
          color: var(--c-outline);
        }
        .campoia-login .divider-text::before,
        .campoia-login .divider-text::after {
          content: '';
          flex: 1;
          height: 1px;
          background: rgba(194,201,187,0.4);
        }
      `}</style>

      <div className="campoia-login">
        {/* Left Panel */}
        <section style={{ position: "relative", display: "none", width: "40%", alignItems: "center", justifyContent: "center", overflow: "hidden", background: "var(--c-primary)", flexShrink: 0, ...(typeof window !== "undefined" && window.innerWidth >= 768 ? { display: "flex" } : {}) }}
          className="left-panel">
          <style>{`
            @media (min-width: 768px) { .campoia-login .left-panel { display: flex !important; } }
            @media (min-width: 1024px) { .campoia-login .left-panel { width: 60% !important; } }
          `}</style>
          {/* BG Image */}
          <div style={{ position: "absolute", inset: 0, zIndex: 0 }}>
            <img
              src="https://lh3.googleusercontent.com/aida-public/AB6AXuAI_D8vc-pABjRmyLA8KSR_5fHW3K5098GPzF6Vhsc9eTA31_Tyig0hEAWUWkkbh3exsoSSKDoByRE9Ev6XJWhUWmtFZEs2JsooWYpsvij9HLBfqbImhpBYqIAO96ldjJEaksLqN8_SfiB8i3agsrMfo8JZVlaa-rgnJBVsBbF9rDRB9VAaX903QJqdr6cO4JoR1e6t_IEyxIf-vZwNfzxOd9JXow0Cw6otv1u-Bt9H1yvKuF_J85VaVJWWJG9w8zylv9RNOqLHECY"
              alt="Satellite view"
              style={{ width: "100%", height: "100%", objectFit: "cover", opacity: 0.6, mixBlendMode: "luminosity" }}
            />
            <div style={{ position: "absolute", inset: 0, background: "linear-gradient(135deg, rgba(24,64,47,0.8) 0%, rgba(85,49,18,0.4) 100%)" }} />
            <div className="dot-grid" style={{ position: "absolute", inset: 0, opacity: 0.2, pointerEvents: "none" }} />
          </div>

          {/* Content */}
          <div style={{ position: "relative", zIndex: 10, padding: "3rem", maxWidth: "36rem" }}>
            <div style={{ display: "inline-flex", alignItems: "center", gap: "0.5rem", padding: "0.25rem 0.75rem", borderRadius: "999px", background: "rgba(191,238,149,0.2)", border: "1px solid rgba(191,238,149,0.3)", marginBottom: "2rem" }}>
              <Icon name="monitoring" fill={1} size={20} style={{ color: "var(--c-secondary-container)", fontSize: "1rem" }} />
              <span style={{ color: "var(--c-secondary-container)", fontSize: "0.65rem", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.15em" }}>Real-time Analysis</span>
            </div>

            <h1 className="font-headline" style={{ fontSize: "clamp(3rem, 5vw, 4.5rem)", fontWeight: 800, color: "var(--c-white)", lineHeight: 1.05, letterSpacing: "-0.03em", marginBottom: "1.5rem" }}>
              Resilient{" "}
              <span style={{ color: "var(--c-secondary-container)" }}>Harvest</span>
            </h1>
            <p style={{ color: "var(--c-primary-fixed-dim)", fontSize: "1.1rem", fontWeight: 500, maxWidth: "28rem", lineHeight: 1.7, opacity: 0.9 }}>
              Harness the precision of artificial intelligence to narrate the health of your land and maximize yields.
            </p>

            <div style={{ marginTop: "3rem", display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1.5rem" }}>
              {[{ value: "98.4%", label: "Prediction Accuracy" }, { value: "12.4k", label: "Acres Managed" }].map(({ value, label }) => (
                <div key={label} className="agri-glass" style={{ padding: "1.5rem", borderRadius: "0.75rem", border: "1px solid rgba(255,255,255,0.1)" }}>
                  <div className="font-headline" style={{ color: "var(--c-white)", fontSize: "1.5rem", fontWeight: 700, marginBottom: "0.25rem" }}>{value}</div>
                  <div style={{ color: "var(--c-primary-fixed-dim)", fontSize: "0.65rem", textTransform: "uppercase", letterSpacing: "0.12em" }}>{label}</div>
                </div>
              ))}
            </div>
          </div>

          {/* Bottom Brand */}
          <div style={{ position: "absolute", bottom: "3rem", left: "3rem", zIndex: 10, display: "flex", alignItems: "center", gap: "0.75rem" }}>
            <div style={{ width: "2.5rem", height: "2.5rem", borderRadius: "0.5rem", background: "var(--c-secondary-container)", display: "flex", alignItems: "center", justifyContent: "center" }}>
              <Icon name="potted_plant" fill={1} style={{ color: "var(--c-primary)", fontSize: "1.4rem" }} />
            </div>
            <span className="font-headline" style={{ fontSize: "1.5rem", fontWeight: 900, color: "var(--c-white)", letterSpacing: "-0.03em" }}>CampoIA</span>
          </div>
        </section>

        {/* Right Panel: Form */}
        <section style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: "3rem 1.5rem", background: "var(--c-surface)", position: "relative" }}>
          {/* Mobile Brand */}
          <div style={{ position: "absolute", top: "2rem", left: "2rem", display: "flex", alignItems: "center", gap: "0.5rem" }}>
            <Icon name="potted_plant" fill={1} style={{ color: "var(--c-primary)", fontSize: "1.75rem" }} />
            <span className="font-headline" style={{ fontSize: "1.5rem", fontWeight: 900, color: "var(--c-primary)", letterSpacing: "-0.03em" }}>CampoIA</span>
          </div>

          <div style={{ width: "100%", maxWidth: "28rem", display: "flex", flexDirection: "column", gap: "2.5rem" }}>
            {/* Header */}
            <header>
              <h2 className="font-headline" style={{ fontSize: "2.25rem", fontWeight: 800, color: "var(--c-primary)", letterSpacing: "-0.03em", marginBottom: "0.5rem" }}>Welcome back</h2>
              <p style={{ color: "var(--c-on-surface-variant)", fontSize: "1.05rem" }}>Access your digital twin dashboard</p>
            </header>

            {/* Form */}
            <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: "1.5rem" }}>
              {/* Email */}
              <div>
                <label htmlFor="email" style={{ display: "block", fontSize: "0.65rem", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.12em", color: "var(--c-on-surface-variant)", marginBottom: "0.5rem", marginLeft: "0.25rem" }}>
                  Email Address
                </label>
                <div style={{ position: "relative" }}>
                  <Icon name="mail" size={20} style={{ position: "absolute", left: "1rem", top: "50%", transform: "translateY(-50%)", color: "var(--c-outline)", fontSize: "1.2rem", pointerEvents: "none" }} />
                  <input
                    id="email"
                    type="email"
                    className="field-input"
                    placeholder="agronomist@farm.com"
                    value={form.email}
                    onChange={e => setForm(f => ({ ...f, email: e.target.value }))}
                  />
                </div>
              </div>

              {/* Password */}
              <div>
                <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "0.5rem", padding: "0 0.25rem" }}>
                  <label htmlFor="password" style={{ fontSize: "0.65rem", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.12em", color: "var(--c-on-surface-variant)" }}>
                    Password
                  </label>
                  <a href="#" style={{ fontSize: "0.75rem", fontWeight: 700, color: "var(--c-secondary)", textDecoration: "none" }}>Forgot Password?</a>
                </div>
                <div style={{ position: "relative" }}>
                  <Icon name="lock" size={20} style={{ position: "absolute", left: "1rem", top: "50%", transform: "translateY(-50%)", color: "var(--c-outline)", fontSize: "1.2rem", pointerEvents: "none" }} />
                  <input
                    id="password"
                    type={showPassword ? "text" : "password"}
                    className="field-input"
                    style={{ paddingRight: "3rem" }}
                    placeholder="••••••••"
                    value={form.password}
                    onChange={e => setForm(f => ({ ...f, password: e.target.value }))}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(v => !v)}
                    style={{ position: "absolute", right: "1rem", top: "50%", transform: "translateY(-50%)", background: "none", border: "none", cursor: "pointer", color: "var(--c-outline)", display: "flex" }}
                  >
                    <Icon name={showPassword ? "visibility_off" : "visibility"} />
                  </button>
                </div>
              </div>

              {/* Remember me */}
              <div style={{ display: "flex", alignItems: "center", gap: "0.75rem" }}>
                <input
                  id="remember"
                  type="checkbox"
                  checked={form.remember}
                  onChange={e => setForm(f => ({ ...f, remember: e.target.checked }))}
                  style={{ width: "1.1rem", height: "1.1rem", accentColor: "var(--c-primary)", cursor: "pointer" }}
                />
                <label htmlFor="remember" style={{ fontSize: "0.875rem", fontWeight: 500, color: "var(--c-on-surface-variant)", cursor: "pointer" }}>
                  Keep me logged in for 30 days
                </label>
              </div>

              <button type="submit" className="btn-primary">
                Sign In to Dashboard
                <Icon name="arrow_forward" className="arrow-icon" />
              </button>
            </form>

            {/* Divider */}
            <div className="divider-text">Or continue with</div>

            {/* Social */}
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1rem" }}>
              <button className="btn-social">
                <img
                  src="https://lh3.googleusercontent.com/aida-public/AB6AXuAt_5otPUPdDhKsROdHDFulLlHQOqXDlwf5IlrHiV4Hx2hHy9gOr0z32S0s4aBi8IBSgK2ofZbDWZydhKXwpCWvWN7wKS_39b2cahfTRreZaPqFfCigSx0mbf8TCE4AC4rYInQwLBPhq0TfzKf2ucXV52gKhCHALuEQi6a3ws2nLkpO8wu_ZzD3nKnu_LTjBINg9di4tKFLdQXUagkeO85_PE4DfBCKQ5xgpwVa5gJVMhhWhD-_JW5FGl5EHE9jKK-uAbasR5qMUeU"
                  alt="Google"
                  style={{ width: "1.25rem", height: "1.25rem" }}
                />
                Google
              </button>
              <button className="btn-social">
                <Icon name="ios" fill={1} style={{ fontSize: "1.25rem" }} />
                Apple
              </button>
            </div>

            {/* Footer */}
            <p style={{ textAlign: "center", color: "var(--c-on-surface-variant)", fontSize: "0.95rem" }}>
              New to the field?{" "}
              <a href="#" style={{ color: "var(--c-secondary)", fontWeight: 700, textDecoration: "none", marginLeft: "0.25rem" }}>
                Create an account
              </a>
            </p>
          </div>

          {/* Decorative */}
          <div style={{ position: "absolute", bottom: 0, right: 0, padding: "3rem", opacity: 0.05, pointerEvents: "none", overflow: "hidden" }}>
            <Icon name="grass" style={{ fontSize: "12rem", color: "var(--c-primary)", fontVariationSettings: "'wght' 100" }} />
          </div>
        </section>
      </div>

      {/* Help Button */}
      <button className="help-btn" aria-label="Help">
        <Icon name="help_outline" />
      </button>
    </>
  );
}
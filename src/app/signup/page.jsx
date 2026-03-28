"use client";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";

const Icon = ({ name, fill = 0, size = 24, style = {}, className = "" }) => (
  <span
    className={`material-symbols-outlined ${className}`}
    style={{ fontVariationSettings: `'FILL' ${fill}, 'wght' 400, 'GRAD' 0, 'opsz' ${size}`, ...style }}
  >
    {name}
  </span>
);

const Field = ({ label, children }) => (
  <div style={{ display: "flex", flexDirection: "column", gap: "0.35rem" }}>
    <label style={{ fontSize: "0.65rem", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.12em", color: "var(--c-on-surface-variant)", marginLeft: "0.25rem" }}>
      {label}
    </label>
    {children}
  </div>
);

export default function CampoIASignUp() {
  const router = useRouter();
  const [form, setForm] = useState({
    name: "", email: "", farm: "", password: "", confirm: "", terms: false,
  });
  const [showPass, setShowPass] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [error, setError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const set = (key) => (e) =>
    setForm((f) => ({ ...f, [key]: e.target.type === "checkbox" ? e.target.checked : e.target.value }));

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!form.name.trim() || !form.email.trim() || !form.farm.trim() || !form.password.trim()) {
      setError("Completa todos los campos obligatorios.");
      return;
    }

    if (form.password.length < 6) {
      setError("El password debe tener al menos 6 caracteres.");
      return;
    }

    if (form.password !== form.confirm) {
      setError("La confirmacion de password no coincide.");
      return;
    }

    if (!form.terms) {
      setError("Debes aceptar terminos y privacidad para continuar.");
      return;
    }

    setError("");
    setIsSubmitting(true);

    try {
      const response = await fetch("/api/auth/register", {
        method: "POST",
        credentials: "include",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          name: form.name.trim(),
          farmName: form.farm.trim(),
          email: form.email.trim(),
          password: form.password,
        }),
      });

      const payload = await response.json().catch(() => ({}));

      if (!response.ok) {
        throw new Error(payload?.error ?? "No se pudo crear la cuenta.");
      }

      router.push("/dashboard");
      router.refresh();
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : "No se pudo crear la cuenta.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Manrope:wght@400;700;800&family=Inter:wght@400;500;600;700&display=swap');
        @import url('https://fonts.googleapis.com/css2?family=Material+Symbols+Outlined:opsz,wght,FILL,GRAD@20..48,100..700,0..1,-50..200&display=swap');

        .campoia-signup {
          --c-primary: #18402f;
          --c-primary-container: #305846;
          --c-primary-fixed: #c1ecd4;
          --c-primary-fixed-dim: #a5d0b9;
          --c-on-primary: #ffffff;
          --c-on-primary-container: #a1ccb5;
          --c-secondary: #426920;
          --c-secondary-container: #bfee95;
          --c-on-secondary-container: #466d24;
          --c-tertiary: #553112;
          --c-surface: #f7faf5;
          --c-surface-container-low: #f1f4ef;
          --c-surface-container: #ecefea;
          --c-surface-container-high: #e6e9e4;
          --c-surface-container-highest: #e0e3df;
          --c-on-surface: #191c1a;
          --c-on-surface-variant: #42493e;
          --c-outline: #72796e;
          --c-outline-variant: #c2c9bb;
          font-family: 'Inter', sans-serif;
          min-height: 100vh;
          display: flex;
          background: var(--c-surface);
          color: var(--c-on-surface);
        }

        .campoia-signup .material-symbols-outlined {
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

        .campoia-signup .font-headline { font-family: 'Manrope', sans-serif; }

        .campoia-signup .organic-gradient {
          background: linear-gradient(135deg, #18402f 0%, #305846 100%);
        }

        .campoia-signup .tray-input {
          width: 100%;
          background: rgba(224,227,223,0.3);
          border: none;
          border-bottom: 2px solid rgba(114,121,110,0.3);
          padding: 0.75rem 1rem;
          font-size: 0.95rem;
          font-weight: 500;
          color: var(--c-on-surface);
          transition: border-color 0.2s;
          outline: none;
          box-sizing: border-box;
          font-family: 'Inter', sans-serif;
        }
        .campoia-signup .tray-input::placeholder { color: rgba(66,73,62,0.45); }
        .campoia-signup .tray-input:focus { border-bottom-color: var(--c-primary); }

        .campoia-signup .tray-input-icon {
          padding-left: 2.75rem;
        }

        .campoia-signup .btn-primary {
          width: 100%;
          padding: 1rem;
          background: var(--c-primary);
          color: var(--c-on-primary);
          font-family: 'Manrope', sans-serif;
          font-weight: 700;
          font-size: 1.05rem;
          border: none;
          border-radius: 0.75rem;
          cursor: pointer;
          transition: opacity 0.2s, transform 0.1s, box-shadow 0.2s;
          box-shadow: 0 4px 16px rgba(24,64,47,0.15);
          margin-top: 1rem;
        }
        .campoia-signup .btn-primary:hover { opacity: 0.94; box-shadow: 0 8px 24px rgba(24,64,47,0.25); }
        .campoia-signup .btn-primary:active { transform: scale(0.98); }

        .campoia-signup .btn-social {
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 0.6rem;
          padding: 0.75rem 1rem;
          background: var(--c-surface-container-low);
          border: none;
          border-radius: 0.5rem;
          font-weight: 600;
          font-size: 0.875rem;
          color: var(--c-on-surface-variant);
          cursor: pointer;
          transition: background 0.2s;
          font-family: 'Inter', sans-serif;
        }
        .campoia-signup .btn-social:hover { background: var(--c-surface-container-high); }

        .campoia-signup .divider {
          position: relative;
          display: flex;
          align-items: center;
          justify-content: center;
        }
        .campoia-signup .divider::before {
          content: '';
          position: absolute;
          left: 0; right: 0;
          height: 1px;
          background: rgba(114,121,110,0.2);
        }
        .campoia-signup .divider span {
          position: relative;
          background: var(--c-surface);
          padding: 0 1rem;
          font-size: 0.65rem;
          font-weight: 700;
          text-transform: uppercase;
          letter-spacing: 0.15em;
          color: rgba(66,73,62,0.55);
        }

        @media (min-width: 768px) {
          .campoia-signup .left-panel { display: flex !important; }
        }
      `}</style>

      <div className="campoia-signup">
        {/* Left Panel */}
        <section
          className="left-panel organic-gradient"
          style={{ display: "none", width: "42%", flexShrink: 0, flexDirection: "column", justifyContent: "space-between", padding: "3rem", position: "relative", overflow: "hidden", color: "var(--c-on-primary)" }}
        >
          {/* BG image */}
          <img
            src="https://lh3.googleusercontent.com/aida-public/AB6AXuDJJl7m42P6RosfAsYMNLqXFSVRch3sA2xoROlh0RpQYvxccUr6095hXzFUTV_4-ebndziKcUiuU6jY1v3i6AEO4ntYCS_En1N2c7BsDC-T2GdVBv8dLGYsEBjD9pIqXenzAzbLawLTKNQpzkmpD44IYuL41UbXnokr6fez5pCQNB4q2lnhlDpt-ZjDVGB4NUUtEs5qmbL1nII7l_FsBGkpGxooUn6A-b8M3NFUo3_d2q-SN1LqLJC2iXnvnXxvfknCxLJuphxSuO8"
            alt="Agricultural field"
            style={{ position: "absolute", inset: 0, width: "100%", height: "100%", objectFit: "cover", mixBlendMode: "overlay", opacity: 0.3 }}
          />
          {/* Blobs */}
          <div style={{ position: "absolute", bottom: "-6rem", left: "-6rem", width: "24rem", height: "24rem", background: "rgba(66,105,32,0.2)", borderRadius: "50%", filter: "blur(3rem)" }} />
          <div style={{ position: "absolute", top: "-6rem", right: "-6rem", width: "16rem", height: "16rem", background: "rgba(85,49,18,0.1)", borderRadius: "50%", filter: "blur(3rem)" }} />

          {/* Top: Brand + Headline */}
          <div style={{ position: "relative", zIndex: 1 }}>
            <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", marginBottom: "3rem" }}>
              <Icon name="potted_plant" size={24} style={{ fontSize: "2rem" }} />
              <span className="font-headline" style={{ fontSize: "1.75rem", fontWeight: 900, letterSpacing: "-0.03em" }}>CampoIA</span>
            </div>
            <div style={{ maxWidth: "26rem" }}>
              <h1 className="font-headline" style={{ fontSize: "clamp(2rem, 3.5vw, 3rem)", fontWeight: 800, lineHeight: 1.1, letterSpacing: "-0.03em", marginBottom: "1.5rem" }}>
                Empowering the next generation of resilient harvests.
              </h1>
              <p style={{ color: "var(--c-on-primary-container)", fontSize: "1.05rem", fontWeight: 500, opacity: 0.9, lineHeight: 1.7 }}>
                Join a community of data-driven agronomists. Leverage AI to optimize your soil health and financial yield.
              </p>
            </div>
          </div>

          {/* Bottom: Testimonial */}
          <div style={{ position: "relative", zIndex: 1 }}>
            <div style={{ background: "rgba(247,250,245,0.1)", backdropFilter: "blur(12px)", padding: "1.5rem", borderRadius: "0.75rem", border: "1px solid rgba(255,255,255,0.1)" }}>
              <p style={{ fontStyle: "italic", color: "rgba(255,255,255,0.8)", marginBottom: "1rem", lineHeight: 1.6, fontSize: "0.9rem" }}>
                {`"The precision of CampoIA's soil stratigraphy metrics completely changed our planting strategy this season."`}
              </p>
              <div style={{ display: "flex", alignItems: "center", gap: "0.75rem" }}>
                <div style={{ width: "2.5rem", height: "2.5rem", borderRadius: "50%", background: "var(--c-secondary-container)", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                  <Icon name="person" style={{ color: "var(--c-on-secondary-container)", fontSize: "1.2rem" }} />
                </div>
                <div>
                  <p style={{ fontWeight: 700, fontSize: "0.875rem" }}>Marcus Thorne</p>
                  <p style={{ fontSize: "0.75rem", color: "rgba(255,255,255,0.55)" }}>Lead Agronomist, Verdant Hills</p>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Right Panel: Form */}
        <main style={{ flex: 1, display: "flex", flexDirection: "column", justifyContent: "center", alignItems: "center", padding: "3rem 1.5rem", background: "var(--c-surface)" }}>
          <div style={{ width: "100%", maxWidth: "28rem" }}>
            {/* Mobile Logo */}
            <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: "0.5rem", marginBottom: "2rem" }}>
              <Icon name="potted_plant" style={{ color: "var(--c-primary)", fontSize: "1.75rem" }} />
              <span className="font-headline" style={{ fontSize: "1.5rem", fontWeight: 900, color: "var(--c-primary)", letterSpacing: "-0.03em" }}>CampoIA</span>
            </div>

            <header style={{ marginBottom: "2.5rem", textAlign: "center" }}>
              <h2 className="font-headline" style={{ fontSize: "2rem", fontWeight: 700, color: "var(--c-on-surface)", marginBottom: "0.5rem", letterSpacing: "-0.02em" }}>Create your account</h2>
              <p style={{ color: "var(--c-on-surface-variant)" }}>Start your journey toward data-driven agriculture.</p>
              {error ? (
                <p
                  style={{
                    marginTop: "0.9rem",
                    padding: "0.7rem 0.9rem",
                    borderRadius: "0.6rem",
                    border: "1px solid rgba(85,49,18,0.22)",
                    background: "rgba(85,49,18,0.08)",
                    color: "var(--c-tertiary)",
                    fontSize: "0.88rem",
                    fontWeight: 600,
                  }}
                >
                  {error}
                </p>
              ) : null}
            </header>

            {/* Form */}
            <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: "1.25rem" }}>
              <Field label="Full Name">
                <div style={{ position: "relative" }}>
                  <Icon name="person" size={20} style={{ position: "absolute", left: "0.75rem", top: "50%", transform: "translateY(-50%)", color: "var(--c-outline)", fontSize: "1.1rem", pointerEvents: "none" }} />
                  <input className="tray-input tray-input-icon" type="text" placeholder="John Doe" required disabled={isSubmitting} value={form.name} onChange={set("name")} />
                </div>
              </Field>

              <Field label="Email Address">
                <div style={{ position: "relative" }}>
                  <Icon name="mail" size={20} style={{ position: "absolute", left: "0.75rem", top: "50%", transform: "translateY(-50%)", color: "var(--c-outline)", fontSize: "1.1rem", pointerEvents: "none" }} />
                  <input className="tray-input tray-input-icon" type="email" placeholder="john@farm.com" required disabled={isSubmitting} value={form.email} onChange={set("email")} />
                </div>
              </Field>

              <Field label="Farm / Company Name">
                <div style={{ position: "relative" }}>
                  <Icon name="domain" size={20} style={{ position: "absolute", left: "0.75rem", top: "50%", transform: "translateY(-50%)", color: "var(--c-outline)", fontSize: "1.1rem", pointerEvents: "none" }} />
                  <input className="tray-input tray-input-icon" type="text" placeholder="Green Valley Estates" required disabled={isSubmitting} value={form.farm} onChange={set("farm")} />
                </div>
              </Field>

              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1rem" }}>
                <Field label="Password">
                  <div style={{ position: "relative" }}>
                    <Icon name="lock" size={20} style={{ position: "absolute", left: "0.75rem", top: "50%", transform: "translateY(-50%)", color: "var(--c-outline)", fontSize: "1.1rem", pointerEvents: "none" }} />
                    <input
                      className="tray-input tray-input-icon"
                      style={{ paddingRight: "2.5rem" }}
                      type={showPass ? "text" : "password"}
                      placeholder="••••••••"
                      required
                      minLength={6}
                      disabled={isSubmitting}
                      value={form.password}
                      onChange={set("password")}
                    />
                    <button type="button" disabled={isSubmitting} onClick={() => setShowPass(v => !v)} style={{ position: "absolute", right: "0.5rem", top: "50%", transform: "translateY(-50%)", background: "none", border: "none", cursor: "pointer", color: "var(--c-outline)", display: "flex" }}>
                      <Icon name={showPass ? "visibility_off" : "visibility"} size={20} style={{ fontSize: "1.1rem" }} />
                    </button>
                  </div>
                </Field>

                <Field label="Confirm">
                  <div style={{ position: "relative" }}>
                    <Icon name="lock_reset" size={20} style={{ position: "absolute", left: "0.75rem", top: "50%", transform: "translateY(-50%)", color: "var(--c-outline)", fontSize: "1.1rem", pointerEvents: "none" }} />
                    <input
                      className="tray-input tray-input-icon"
                      style={{ paddingRight: "2.5rem" }}
                      type={showConfirm ? "text" : "password"}
                      placeholder="••••••••"
                      required
                      minLength={6}
                      disabled={isSubmitting}
                      value={form.confirm}
                      onChange={set("confirm")}
                    />
                    <button type="button" disabled={isSubmitting} onClick={() => setShowConfirm(v => !v)} style={{ position: "absolute", right: "0.5rem", top: "50%", transform: "translateY(-50%)", background: "none", border: "none", cursor: "pointer", color: "var(--c-outline)", display: "flex" }}>
                      <Icon name={showConfirm ? "visibility_off" : "visibility"} size={20} style={{ fontSize: "1.1rem" }} />
                    </button>
                  </div>
                </Field>
              </div>

              {/* Terms */}
              <div style={{ display: "flex", alignItems: "flex-start", gap: "0.75rem", paddingTop: "0.5rem" }}>
                <input
                  id="terms"
                  type="checkbox"
                  checked={form.terms}
                  disabled={isSubmitting}
                  onChange={set("terms")}
                  required
                  style={{ width: "1.1rem", height: "1.1rem", marginTop: "0.15rem", accentColor: "var(--c-primary)", cursor: "pointer", flexShrink: 0 }}
                />
                <label htmlFor="terms" style={{ fontSize: "0.875rem", color: "var(--c-on-surface-variant)", lineHeight: 1.5, cursor: "pointer" }}>
                  I agree to the{" "}
                  <a href="#" style={{ color: "var(--c-primary)", fontWeight: 700, textDecoration: "none" }}>Terms of Service</a>
                  {" "}and{" "}
                  <a href="#" style={{ color: "var(--c-primary)", fontWeight: 700, textDecoration: "none" }}>Privacy Policy</a>.
                </label>
              </div>

              <button type="submit" className="btn-primary" disabled={isSubmitting}>
                {isSubmitting ? "Creating account..." : "Create Account"}
              </button>
            </form>

            <footer style={{ marginTop: "2.5rem", textAlign: "center" }}>
              <p style={{ color: "var(--c-on-surface-variant)" }}>
                Already have an account?{" "}
                <Link href="/login" style={{ color: "var(--c-primary)", fontWeight: 700, textDecoration: "none", marginLeft: "0.25rem" }}>Login here</Link>
              </p>
            </footer>
          </div>
        </main>
      </div>
    </>
  );
}
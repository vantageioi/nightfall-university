// Night Journey access pages: self-hosted email + password sign-in, bilingual, RTL-coherent.
import { ArrowLeft, ArrowRight, Loader2, MailCheck, ShieldCheck } from "lucide-react";
import { FormEvent, useState } from "react";
import { useLocation } from "wouter";
import { LanguageToggle, usePublicLanguage } from "@/components/LanguageToggle";

const copy = { en: { back: "Back", signIn: "Sign in", create: "Unlock my research", labelLogin: "STUDENT SIGN IN", labelSignup: "UNLOCK YOUR RESEARCH SET", titleLogin: "Welcome back to your path.", titleSignup: "Your first research set is ready.", bodyLogin: "Sign in to return to your personal Nightfall journey.", bodySignup: "Your conversation is still held in this browser session. Verify your email with a short code, create your account securely, then inspect source-linked results in your own private journey.", actionLogin: "Open my journey", actionSignup: "Send verification code", secure: "Your password is stored only as a salted hash. Nightfall never makes an admissions decision for you.", googleNote: "Google sign-in is currently limited by Google to approved test accounts. Use email verification above to enter Nightfall now.", name: "What should I call you?", email: "Email", password: "Password", promptLogin: "New to Nightfall?", promptSignup: "Already have a Nightfall journey?", otherLogin: "Create an account", otherSignup: "Sign in instead", sideLogin: "Your next step is still here.", sideSignup: "Your research should stay yours.", sideBodyLogin: "Your documents, dates, and university list stay ready when you need them.", sideBodySignup: "The account protects your saved research. You will review every source and Nightfall never makes an admissions decision." }, ar: { back: "رجوع", signIn: "تسجيل الدخول", create: "افتح بحثي", labelLogin: "دخول الطالب", labelSignup: "افتح مجموعة بحثك", titleLogin: "أهلاً برجعتك لطريقك.", titleSignup: "أول مجموعة بحث إلك جاهزة.", bodyLogin: "سجّل دخول لترجع لرحلتك الشخصية مع نايتفول.", bodySignup: "حديثك بعده محفوظ بهالجلسة على جهازك. إنشاء حساب بأمان حتى نحفظه ونفتحلك نتائج مربوطة بالمصادر برحلتك الخاصة.", actionLogin: "افتح رحلتي", actionSignup: "أرسل كود التحقق", secure: "كلمة المرور بتُخزَّن مشفّرة فقط. نايتفول ما بتاخد قرار قبول عنك.", googleNote: "الدخول عبر Google حالياً محصور بالحسابات التجريبية المعتمدة من Google. استخدم التحقق عبر الإيميل فوق لتفوت على نايتفول هلّق.", name: "شو بتحب نناديك؟", email: "الإيميل", password: "كلمة المرور", promptLogin: "جديد على نايتفول؟", promptSignup: "عندك رحلة مع نايتفول؟", otherLogin: "أنشئ حساب", otherSignup: "سجّل دخول", sideLogin: "خطوتك الجاية بعدها هون.", sideSignup: "بحثك لازم يضل إلك.", sideBodyLogin: "أوراقك ومواعيدك وقائمة جامعاتك جاهزين لما تحتاجهم.", sideBodySignup: "الحساب بحمي بحثك المحفوظ. إنت بتراجع كل مصدر ونايتفول ما بتاخد قرار قبول عنك." } } as const;

// Second-step labels for the #393939/#3e3e3e email-code gate, kept separate so the
// long single-line copy block above stays untouched.
export function getGoogleAccessNote(language: "en" | "ar") { return copy[language].googleNote; }

const codeCopy = { en: { codeTitle: "Check your inbox.", codeBody: "We sent a six-digit code to your email. It expires in ten minutes.", code: "Six-digit code", verifyCreate: "Verify and create account", verifyLogin: "Verify and sign in", changeEmail: "Use a different email" }, ar: { codeTitle: "تفقد بريدك.", codeBody: "بعتنا كود من ست أرقام على إيميلك. بينتهي بعد عشر دقايق.", code: "كود من ستة أرقام", verifyCreate: "تحقق وأنشئ الحساب", verifyLogin: "تحقق وسجّل دخولك", changeEmail: "استخدم إيميل ثاني" } } as const;

function Mark() { return <span className="relative grid h-10 w-10 place-items-center rounded-xl border border-[#bdbdbd]/45 bg-[#151515]/85 shadow-[0_10px_28px_rgba(0, 0, 0,.22)]"><span className="absolute h-5 w-px bg-[#ffffff]" /><span className="absolute h-px w-5 bg-[#ffffff]" /><span className="h-1.5 w-1.5 bg-[#f5f5f5]" /></span>; }

export function LoginPage() {
  const [, setLocation] = useLocation();
  return <AccessPage mode="login" onBack={() => setLocation("/")} onDone={(profile) => setLocation(profile?.onboardingComplete ? "/dashboard" : "/student-onboarding")} onOther={() => setLocation("/signup")} />;
}

export function SignupPage() {
  const [, setLocation] = useLocation();
  return <AccessPage mode="signup" onBack={() => setLocation("/")} onDone={() => setLocation("/student-onboarding")} onOther={() => setLocation("/login")} />;
}

function AccessPage({ mode, onBack, onDone, onOther }: { mode: "login" | "signup"; onBack: () => void; onDone: (profile?: { onboardingComplete?: boolean }) => void; onOther: () => void }) {
  const { language, isArabic, setLanguage } = usePublicLanguage();
  const toggleLanguage = () => setLanguage(isArabic ? "en" : "ar");
  const t = { ...copy[language], ...codeCopy[language] };
  const signUp = mode === "signup";
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [code, setCode] = useState("");
  const [codeStep, setCodeStep] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    setBusy(true);
    setError(null);
    try {
      if (!codeStep) {
        // Step one of the #393939/#3e3e3e gate: prove ownership of the address
        // before any account is created or opened. The server rate-limits and
        // stores only hashed codes.
        const codeResponse = await fetch("/api/auth/request-code", { method: "POST", headers: { "Content-Type": "application/json" }, credentials: "include", body: JSON.stringify({ email }) });
        const codeData = await codeResponse.json().catch(() => ({}));
        if (!codeResponse.ok) throw new Error(codeData?.error || "Could not send the verification code.");
        setCodeStep(true);
        return;
      }
      const verifyResponse = await fetch("/api/auth/verify-code", { method: "POST", headers: { "Content-Type": "application/json" }, credentials: "include", body: JSON.stringify({ email, code }) });
      const verifyData = await verifyResponse.json().catch(() => ({}));
      if (!verifyResponse.ok) throw new Error(verifyData?.error || "Verification failed.");
      const unlockToken = verifyData?.unlockToken ?? "";
      const response = await fetch(signUp ? "/api/auth/register" : "/api/auth/login", { method: "POST", headers: { "Content-Type": "application/json" }, credentials: "include", body: JSON.stringify({ name, email, password, unlockToken }) });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(data?.error || (signUp ? "Could not create the account." : "Sign-in failed."));
      let profile: { onboardingComplete?: boolean } | undefined;
      try { profile = await fetch("/api/trpc/student.profile?batch=1&input=" + encodeURIComponent(JSON.stringify({ "0": { json: null, meta: [] } })), { credentials: "include" }).then((r) => r.json()).then((j) => j?.[0]?.result?.data?.json ?? undefined); } catch { /* profile check is best-effort */ }
      onDone(profile);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong.");
    } finally {
      setBusy(false);
    }
  };

  return <div dir={isArabic ? "rtl" : "ltr"} className="night-bloom grid min-h-screen text-[#f5f5f5] lg:grid-cols-[1.05fr_.95fr]">
    <section className="relative hidden overflow-hidden border-r border-[#bdbdbd]/15 p-12 lg:block"><div className="nf-dot-field absolute inset-0 opacity-45" /><div className="absolute inset-x-0 bottom-0 h-1/2 bg-[radial-gradient(ellipse_at_bottom,rgba(255, 255, 255,.12),transparent_68%)]" /><div className="relative flex h-full flex-col"><button onClick={onBack} className="flex w-fit items-center gap-3 text-white"><Mark /><span className="text-sm font-semibold tracking-[.16em]">NIGHTFALL</span></button><div className="my-auto max-w-xl"><p className="nf-eyebrow text-[#bdbdbd]">// {signUp ? t.labelSignup : t.labelLogin}</p><h1 className="mt-5 text-6xl font-semibold leading-[.88] tracking-[-.075em] text-white">{signUp ? t.sideSignup : t.sideLogin}</h1><p className="mt-6 text-lg leading-8 text-[#a5a5a5]">{signUp ? t.sideBodySignup : t.sideBodyLogin}</p></div><div className="border-t border-white/10 pt-5"><p className="nf-mono text-[10px] text-[#898989]">YOU → YOUR PATH → YOUR NEXT STEP</p></div></div></section>
    <section className="grid place-items-center p-5 sm:p-10"><div className="w-full max-w-md"><div className="flex items-center justify-between"><button onClick={onBack} className="nf-label flex items-center gap-2 text-[#a1a1a1] lg:hidden"><ArrowLeft className={`h-3.5 w-3.5 ${isArabic ? "rotate-180" : ""}`} />{t.back}</button><LanguageToggle language={language} onToggle={toggleLanguage} /></div><div className="mt-10 lg:mt-0"><div className="flex items-center justify-between"><Mark /><span className="nf-mono text-[10px] text-[#919191]">{signUp ? "ACCESS / CREATE" : "ACCESS / SIGN IN"}</span></div><p className="nf-label mt-10 text-[#a4a4a4]">// {signUp ? t.labelSignup : t.labelLogin}</p><h2 className="mt-3 text-4xl font-semibold leading-[.95] tracking-[-.05em] text-white">{signUp ? t.titleSignup : t.titleLogin}</h2><p className="mt-4 text-sm leading-6 text-[#a5a5a5]">{signUp ? t.bodySignup : t.bodyLogin}</p>
      <form onSubmit={submit} className="mt-8 space-y-3">
        {codeStep ? (
          <>
            <p className="flex items-start gap-2 text-sm leading-6 text-[#dbdbdb]"><MailCheck className="mt-0.5 h-4 w-4 shrink-0" /><span><span className="block font-semibold text-white">{t.codeTitle}</span>{t.codeBody}</span></p>
            <label className="block border border-white/15 bg-black/20 px-4 py-3"><span className="nf-label block text-[8px] text-[#939393]">{t.code}</span><input inputMode="numeric" autoComplete="one-time-code" pattern="\d*" maxLength={6} required value={code} onChange={(event) => setCode(event.target.value.replace(/\D/g, ""))} className="mt-1 w-full bg-transparent text-lg tracking-[.4em] text-white outline-none placeholder:text-white/30" /></label>
            <button type="button" onClick={() => { setCodeStep(false); setCode(""); setError(null); }} className="text-xs text-[#a1a1a1] underline underline-offset-4 hover:text-white">{t.changeEmail}</button>
          </>
        ) : (
          <>
            {signUp && <label className="block border border-white/15 bg-black/20 px-4 py-3"><span className="nf-label block text-[8px] text-[#939393]">{t.name}</span><input value={name} onChange={(event) => setName(event.target.value)} autoComplete="name" className="mt-1 w-full bg-transparent text-sm text-white outline-none placeholder:text-white/30" /></label>}
            <label className="block border border-white/15 bg-black/20 px-4 py-3"><span className="nf-label block text-[8px] text-[#939393]">{t.email}</span><input type="email" required value={email} onChange={(event) => setEmail(event.target.value)} autoComplete="email" className="mt-1 w-full bg-transparent text-sm text-white outline-none placeholder:text-white/30" /></label>
            {!signUp && <label className="block border border-white/15 bg-black/20 px-4 py-3"><span className="nf-label block text-[8px] text-[#939393]">{t.password}</span><input type="password" required minLength={8} value={password} onChange={(event) => setPassword(event.target.value)} autoComplete="current-password" className="mt-1 w-full bg-transparent text-sm text-white outline-none placeholder:text-white/30" /></label>}
          </>
        )}
        {signUp && !codeStep && <label className="block border border-white/15 bg-black/20 px-4 py-3"><span className="nf-label block text-[8px] text-[#939393]">{t.password}</span><input type="password" required minLength={8} value={password} onChange={(event) => setPassword(event.target.value)} autoComplete="new-password" className="mt-1 w-full bg-transparent text-sm text-white outline-none placeholder:text-white/30" /></label>}
        {error && <p role="alert" className="border-l border-white/40 pl-3 text-xs leading-5 text-[#dbdbdb]">{error}</p>}
        <button type="submit" disabled={busy} className="nf-button flex w-full items-center justify-center gap-2 bg-[#f5f5f5] px-4 py-3.5 text-[10px] font-bold uppercase tracking-[.08em] text-[#080808] shadow-[0_12px_26px_rgba(255, 255, 255,.17)] hover:bg-[#ffffff] disabled:opacity-60">{busy ? <Loader2 className="h-4 w-4 animate-spin" /> : null}{codeStep ? (signUp ? t.verifyCreate : t.verifyLogin) : t.actionSignup}{!busy && <ArrowRight className={`h-4 w-4 ${isArabic ? "rotate-180" : ""}`} />}</button>
      </form>
      <p className="mt-6 flex items-start gap-2 text-xs leading-5 text-[#898989]"><ShieldCheck className="mt-0.5 h-3.5 w-3.5 shrink-0" />{t.secure}</p>
      <div className="my-6 flex items-center gap-3"><span className="h-px flex-1 bg-white/10" /><span className="nf-label text-[8px] text-[#747474]">{language === "ar" ? "أو" : "or"}</span><span className="h-px flex-1 bg-white/10" /></div>
      <a href="/api/auth/google" className="nf-button flex w-full items-center justify-center gap-3 border border-white/25 px-4 py-3.5 text-xs font-semibold text-white hover:border-white">
        <svg aria-hidden viewBox="0 0 24 24" className="h-4 w-4"><path fill="#767676" d="M12 5.04c1.62 0 3.06.56 4.2 1.64l3.12-3.12C17.46 1.8 14.96.75 12 .75 7.62.75 3.84 3.27 2.04 6.86l3.66 2.84C6.54 7.02 9 5.04 12 5.04z"/><path fill="#949494" d="M23.25 12.23c0-.79-.07-1.54-.19-2.27H12v4.51h6.47c-.29 1.48-1.14 2.73-2.4 3.58v3h3.86c2.26-2.09 3.32-5.17 3.32-8.82z"/><path fill="#949494" d="M5.7 14.71c-.23-.69-.36-1.42-.36-2.16s.13-1.47.35-2.16L2.04 7.55A11.26 11.26 0 0 0 .75 12.55c0 1.81.44 3.52 1.29 5l3.66-2.84z"/><path fill="#656565" d="M12 24c3.24 0 5.95-1.08 7.93-2.91l-3.86-3c-1.08.72-2.45 1.16-4.07 1.16-3 0-5.46-1.98-6.3-4.66l-3.66 2.84C3.84 21.28 7.62 24 12 24z"/></svg>
        {signUp ? (language === "ar" ? "التسجيل بحساب Google" : "Continue with Google") : (language === "ar" ? "الدخول بحساب Google" : "Sign in with Google")}
      </a>
      <p className="mt-3 border border-white/10 bg-white/[.03] px-3 py-2 text-[11px] leading-5 text-[#999999]">{getGoogleAccessNote(language)}</p>
      <div className="mt-8 border-t border-[#bdbdbd]/15 pt-5"><p className="text-xs text-[#bdbdbd]">{signUp ? t.promptSignup : t.promptLogin} <button onClick={onOther} className="font-semibold text-[#ffffff] underline underline-offset-4">{signUp ? t.otherSignup : t.otherLogin}</button></p></div>
    </div></div></section>
  </div>;
}

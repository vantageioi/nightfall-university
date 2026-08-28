import { BellRing, Check } from "lucide-react";

type Notice = { id: number; title: string; body: string; university: string; reason: string; read: boolean; createdAt: Date };

export function UniversityFollowUpNotifications({ language, notices, onRead }: { language: "en" | "ar"; notices: Notice[]; onRead: (id: number) => void }) {
  const ar = language === "ar";
  const t = ar ? { kicker: "متابعات جاهزة", title: "مراجعة مطلوبة—مش إرسال تلقائي.", empty: "ما في متابعات مستحقة حالياً.", reviewed: "راجعت" } : { kicker: "DUE FOLLOW-UPS", title: "Review due—never auto-send.", empty: "No follow-ups are due right now.", reviewed: "Reviewed" };
  const unread = notices.filter((notice) => !notice.read);
  return <section className="mt-5 border border-white/15 bg-[#141414] p-5"><div className="flex items-start gap-3"><BellRing className="mt-0.5 h-5 w-5" /><div><p className="nf-label text-[8px] text-[#adadad]">// {t.kicker}</p><h2 className="mt-2 text-xl font-semibold tracking-[-.04em]">{t.title}</h2></div></div><div className="mt-5 grid gap-3 md:grid-cols-2">{unread.map((notice) => <article key={notice.id} className="border border-white/10 bg-black/15 p-4"><p className="text-sm font-semibold">{notice.title}</p><p className="mt-2 text-xs leading-5 text-[#cccccc]">{notice.body}</p><p className="mt-3 nf-label text-[8px] text-[#a9a9a9]">{notice.university} · {notice.reason}</p><button type="button" onClick={() => onRead(notice.id)} className="nf-button mt-4 flex items-center gap-2 border border-white/25 px-3 py-2 text-[10px] hover:bg-white hover:text-black"><Check className="h-3.5 w-3.5" />{t.reviewed}</button></article>)}{!unread.length && <p className="border border-dashed border-white/15 p-5 text-sm text-[#a0a0a0]">{t.empty}</p>}</div></section>;
}

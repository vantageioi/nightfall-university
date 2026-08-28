import { useAuth } from "@/_core/hooks/useAuth";
import { trpc } from "@/lib/trpc";
import { Check, FileSpreadsheet, FileText, Loader2, LockKeyhole, Upload, X } from "lucide-react";
import { ChangeEvent, useEffect, useMemo, useState } from "react";
import { useLocation } from "wouter";

type IntakeProfile = {
  preferredName: string | null; contactEmail: string | null; phoneNumber: string | null; nationality: string | null;
  highSchoolDiplomaOrigin: string | null; studyDirection: string | null; academicAverage: string | null; gradeScale: string | null;
  qualifications: string | null; sourceSummary: string | null;
};

function fileToBase64(file: File) {
  return new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(new Error("The selected file could not be read."));
    reader.onload = () => resolve(String(reader.result).split(",")[1] ?? "");
    reader.readAsDataURL(file);
  });
}

function IntakeStatus({ value }: { value: string }) {
  const label = value.replaceAll("_", " ");
  return <span className="nf-label border border-white/15 px-2 py-1 text-[8px] text-white/60">{label}</span>;
}

export default function AdminIntake() {
  const { user, loading } = useAuth();
  const [, setLocation] = useLocation();
  const utils = trpc.useUtils();
  const uploads = trpc.adminIntake.uploads.useQuery(undefined, { enabled: user?.role === "admin" });
  const [selectedUploadId, setSelectedUploadId] = useState<number | null>(null);
  const records = trpc.adminIntake.records.useQuery({ uploadId: selectedUploadId ?? 0 }, { enabled: selectedUploadId !== null && user?.role === "admin" });
  const [error, setError] = useState<string | null>(null);
  const ingest = trpc.adminIntake.ingest.useMutation({ onSuccess: async (result) => { setSelectedUploadId(result.upload.id); await utils.adminIntake.uploads.invalidate(); await utils.adminIntake.records.invalidate({ uploadId: result.upload.id }); }, onError: (cause) => setError(cause.message) });
  const review = trpc.adminIntake.review.useMutation({ onSuccess: () => selectedUploadId && utils.adminIntake.records.invalidate({ uploadId: selectedUploadId }), onError: (cause) => setError(cause.message) });
  const commit = trpc.adminIntake.commit.useMutation({ onSuccess: () => selectedUploadId && utils.adminIntake.records.invalidate({ uploadId: selectedUploadId }), onError: (cause) => setError(cause.message) });

  useEffect(() => { if (!loading && !user) setLocation("/login"); }, [loading, setLocation, user]);
  useEffect(() => { if (!selectedUploadId && uploads.data?.[0]) setSelectedUploadId(uploads.data[0].id); }, [selectedUploadId, uploads.data]);

  const selectedUpload = useMemo(() => uploads.data?.find((upload) => upload.id === selectedUploadId) ?? null, [selectedUploadId, uploads.data]);

  const onFile = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;
    setError(null);
    if (file.size > 8_000_000) { setError("Keep each CV or spreadsheet under 8 MB."); return; }
    try {
      await ingest.mutateAsync({ fileName: file.name, mimeType: file.type || "application/octet-stream", dataBase64: await fileToBase64(file) });
    } catch { /* mutation state carries the displayed error */ }
  };

  if (loading) return <div className="nf-shell grid min-h-screen place-items-center text-white"><Loader2 className="h-5 w-5 animate-spin" /></div>;
  if (!user) return null;
  if (user.role !== "admin") return <main className="nf-shell grid min-h-screen place-items-center px-6 text-center text-white"><div><LockKeyhole className="mx-auto h-6 w-6 text-white/55" /><h1 className="mt-5 text-2xl font-semibold">This workspace is for Nightfall administrators.</h1><p className="mt-3 text-sm text-white/55">Source intake and candidate data are not available from a student account.</p></div></main>;

  return <main className="nf-shell min-h-screen bg-[#111111] px-4 py-6 text-[#f3f3f3] sm:px-8 lg:px-12"><div className="mx-auto max-w-6xl"><header className="flex flex-col gap-5 border-b border-white/10 pb-6 sm:flex-row sm:items-end sm:justify-between"><div><p className="nf-label text-[9px] text-white/45">NIGHTFALL / ADMIN INTAKE</p><h1 className="mt-3 text-4xl font-semibold tracking-[-.06em]">Candidate source review.</h1><p className="mt-3 max-w-2xl text-sm leading-6 text-white/55">Upload a CV or `.xlsx` file. Originals stay private. The extractor prepares drafts; nothing becomes a candidate record until an administrator reviews and commits it.</p></div><label className={`nf-button inline-flex cursor-pointer items-center justify-center gap-2 bg-[#f3f3f3] px-4 py-3 text-[10px] font-bold uppercase tracking-[.08em] text-[#111111] ${ingest.isPending ? "pointer-events-none opacity-50" : ""}`}><Upload className="h-4 w-4" />{ingest.isPending ? "Preparing review" : "Upload source"}<input className="sr-only" type="file" accept=".pdf,.docx,.txt,.xlsx,application/pdf,application/vnd.openxmlformats-officedocument.wordprocessingml.document,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet,text/plain" onChange={onFile} /></label></header>

  <div className="mt-5 grid gap-3 border-b border-white/10 pb-5 text-xs text-white/55 sm:grid-cols-3"><p><LockKeyhole className="mr-2 inline h-3.5 w-3.5" />Private source storage</p><p><FileText className="mr-2 inline h-3.5 w-3.5" />AI drafts are review-only</p><p><Check className="mr-2 inline h-3.5 w-3.5" />Commit never creates an account</p></div>
  {error && <div role="alert" className="mt-5 flex items-start justify-between gap-4 border border-white/20 bg-white/[.04] p-4 text-sm text-white/75"><span>{error}</span><button onClick={() => setError(null)} aria-label="Dismiss error"><X className="h-4 w-4" /></button></div>}

  <section className="mt-7 grid gap-7 lg:grid-cols-[.32fr_.68fr]"><aside className="border border-white/12 bg-white/[.02] p-4"><div className="flex items-center justify-between"><h2 className="text-sm font-semibold">Source files</h2><span className="nf-label text-[8px] text-white/45">{uploads.data?.length ?? 0} STORED</span></div><div className="mt-4 space-y-2">{uploads.isLoading && <p className="text-sm text-white/45">Loading sources…</p>}{!uploads.isLoading && !uploads.data?.length && <p className="border border-dashed border-white/15 p-4 text-sm leading-6 text-white/50">No intake files yet. Start with a CV or a clean spreadsheet of prospective students.</p>}{uploads.data?.map((upload) => <button key={upload.id} onClick={() => setSelectedUploadId(upload.id)} className={`w-full border p-3 text-left transition-colors ${selectedUploadId === upload.id ? "border-white bg-white text-black" : "border-white/12 hover:border-white/45"}`}><div className="flex items-start gap-2"><span className={selectedUploadId === upload.id ? "text-black" : "text-white/60"}>{upload.sourceKind === "spreadsheet" ? <FileSpreadsheet className="h-4 w-4" /> : <FileText className="h-4 w-4" />}</span><span className="min-w-0 flex-1"><span className="block truncate text-xs font-medium">{upload.fileName}</span><span className={`mt-1 block text-[10px] ${selectedUploadId === upload.id ? "text-black/60" : "text-white/45"}`}>{upload.sourceRowCount} source {upload.sourceRowCount === 1 ? "record" : "records"}</span></span></div><div className="mt-3"><IntakeStatus value={upload.status} /></div></button>)}</div></aside>

  <section className="min-w-0"><div className="flex flex-wrap items-end justify-between gap-4"><div><p className="nf-label text-[9px] text-white/45">REVIEW QUEUE</p><h2 className="mt-2 text-2xl font-semibold tracking-[-.04em]">{selectedUpload?.fileName ?? "Choose a source file"}</h2></div>{selectedUpload && <p className="text-xs text-white/45">{selectedUpload.extractionNote ?? "No extraction note yet."}</p>}</div><div className="mt-5 space-y-3">{records.isLoading && <div className="border border-white/12 p-6 text-sm text-white/45">Loading review drafts…</div>}{!records.isLoading && selectedUploadId && !records.data?.length && <div className="border border-dashed border-white/15 p-6 text-sm leading-6 text-white/50">No review drafts are available for this source yet. Check the source status or try a text-based file.</div>}{records.data?.map((record) => { const profile = JSON.parse(record.proposedProfileJson) as IntakeProfile; return <article key={record.id} className="border border-white/12 bg-white/[.02] p-5"><div className="flex flex-wrap items-start justify-between gap-3"><div><p className="nf-label text-[8px] text-white/45">SOURCE ROW {record.sourceRowNumber} / {record.extractionConfidence.toUpperCase()} CONFIDENCE</p><h3 className="mt-2 text-lg font-semibold">{profile.preferredName || "Unnamed candidate"}</h3><p className="mt-1 text-sm text-white/55">{profile.studyDirection || "Study direction not stated"}{profile.contactEmail ? ` · ${profile.contactEmail}` : ""}</p></div><IntakeStatus value={record.reviewStatus} /></div><dl className="mt-5 grid gap-x-5 gap-y-4 text-sm sm:grid-cols-2"><div><dt className="nf-label text-[8px] text-white/40">ACADEMICS</dt><dd className="mt-1 text-white/75">{[profile.academicAverage, profile.gradeScale].filter(Boolean).join(" · ") || "Not stated"}</dd></div><div><dt className="nf-label text-[8px] text-white/40">BACKGROUND</dt><dd className="mt-1 text-white/75">{[profile.nationality, profile.highSchoolDiplomaOrigin].filter(Boolean).join(" · ") || "Not stated"}</dd></div><div className="sm:col-span-2"><dt className="nf-label text-[8px] text-white/40">SOURCE SUMMARY</dt><dd className="mt-1 leading-6 text-white/65">{profile.sourceSummary || "No summary prepared."}</dd></div></dl><div className="mt-5 flex flex-wrap gap-2 border-t border-white/10 pt-4">{record.reviewStatus === "pending_review" && <><button onClick={() => review.mutate({ recordId: record.id, status: "approved" })} disabled={review.isPending} className="nf-button border border-white bg-white px-3 py-2 text-[9px] font-bold uppercase tracking-[.08em] text-black">Approve draft</button><button onClick={() => review.mutate({ recordId: record.id, status: "rejected" })} disabled={review.isPending} className="nf-button border border-white/20 px-3 py-2 text-[9px] font-bold uppercase tracking-[.08em] text-white/70">Reject</button></>}{record.reviewStatus === "approved" && <button onClick={() => commit.mutate({ recordId: record.id })} disabled={commit.isPending} className="nf-button border border-white bg-white px-3 py-2 text-[9px] font-bold uppercase tracking-[.08em] text-black">{commit.isPending ? "Committing…" : "Commit candidate"}</button>}{record.reviewStatus === "committed" && <p className="text-xs text-white/50">Committed as a prospective record. No student account was created.</p>}</div></article>; })}</div></section></section></div></main>;
}

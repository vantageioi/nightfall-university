// Nightfall Operational Matrix: direct routes preserve a shared operations shell while isolating landing and workspaces.
import { Toaster } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import NotFound from "@/pages/NotFound";
import { Route, Switch } from "wouter";
import ErrorBoundary from "./components/ErrorBoundary";
import { ThemeProvider } from "./contexts/ThemeContext";
import Home from "./pages/Home";
import Operations from "./pages/Operations";
import Waitlist from "./pages/Waitlist";
import { LoginPage, SignupPage } from "./pages/Access";
import { AcceptGate, LegalPage } from "./pages/Legal";
import Onboarding from "./pages/Onboarding";
import FamilyView from "./pages/FamilyView";
import StudentOnboarding from "./pages/StudentOnboarding";
import ConsultantOnboarding from "./pages/ConsultantOnboarding";
import JourneyTools from "./pages/JourneyTools";
import StudentSettings from "./pages/StudentSettings";
import AdminIntake from "./pages/AdminIntake";
import { useAuth } from "./_core/hooks/useAuth";
import { Loader2 } from "lucide-react";
import { useEffect } from "react";
import { useLocation } from "wouter";
import { trpc } from "./lib/trpc";
import { shouldResumePendingConsultantInterview } from "./lib/consultantResume";
import { readPendingConsultantInterview } from "./lib/pendingConsultantInterview";

function ProtectedWorkspace({ children }: { children: React.ReactNode }) {
  const { isAuthenticated, loading } = useAuth();
  const [, setLocation] = useLocation();
  useEffect(() => { if (!loading && !isAuthenticated) setLocation("/login"); }, [loading, isAuthenticated, setLocation]);
  if (loading || !isAuthenticated) return <div className="nf-shell grid min-h-screen place-items-center text-white"><Loader2 className="h-5 w-5 animate-spin" /></div>;
  return <AcceptGate>{children}</AcceptGate>;
}

function DashboardEntry() {
  const { user, loading } = useAuth();
  const profile = trpc.student.profile.useQuery(undefined, { enabled: !!user });
  const [, setLocation] = useLocation();
  const hasPendingInterview = Boolean(readPendingConsultantInterview());
  useEffect(() => {
    if (!loading && !user) setLocation("/login");
    if (!loading && user && shouldResumePendingConsultantInterview(true, hasPendingInterview)) {
      setLocation(`/student-onboarding${window.location.search}`);
      return;
    }
    if (!loading && user && !profile.isLoading && !profile.data?.onboardingComplete) setLocation(`/student-onboarding${window.location.search}`);
  }, [hasPendingInterview, loading, profile.data, profile.isLoading, setLocation, user]);
  if (loading || profile.isLoading || !user || !profile.data?.onboardingComplete) return <div className="nf-shell grid min-h-screen place-items-center text-white"><Loader2 className="h-5 w-5 animate-spin" /></div>;
  return <JourneyTools />;
}
function Router() {
  // make sure to consider if you need authentication for certain routes
  return <Switch>
    <Route path="/" component={Home} />
    <Route path="/waitlist" component={Waitlist} />
    <Route path="/login" component={LoginPage} />
    <Route path="/signup" component={SignupPage} />
    <Route path="/legal/:doc">{(params) => <LegalPage doc={(["terms", "eula", "privacy"].includes(params.doc) ? params.doc : "terms") as "terms" | "eula" | "privacy"} />}</Route>
    <Route path="/onboarding"><ConsultantOnboarding /></Route>
    <Route path="/student-onboarding"><ConsultantOnboarding /></Route>
    <Route path="/my-journey"><ProtectedWorkspace><JourneyTools /></ProtectedWorkspace></Route>
    <Route path="/family/:token" component={FamilyView} />
    <Route path="/demo" component={Operations} />
    <Route path="/dashboard" component={DashboardEntry} />
    <Route path="/operations"><ProtectedWorkspace><Operations /></ProtectedWorkspace></Route>
    <Route path="/students"><ProtectedWorkspace><Operations /></ProtectedWorkspace></Route>
    <Route path="/applications"><ProtectedWorkspace><Operations /></ProtectedWorkspace></Route>
    <Route path="/universities"><ProtectedWorkspace><Operations /></ProtectedWorkspace></Route>
    <Route path="/communications"><ProtectedWorkspace><Operations /></ProtectedWorkspace></Route>
    <Route path="/documents"><ProtectedWorkspace><Operations /></ProtectedWorkspace></Route>
    <Route path="/deadlines"><ProtectedWorkspace><Operations /></ProtectedWorkspace></Route>
    <Route path="/ai-operations"><ProtectedWorkspace><Operations /></ProtectedWorkspace></Route>
    <Route path="/reports"><ProtectedWorkspace><Operations /></ProtectedWorkspace></Route>
    <Route path="/automations"><ProtectedWorkspace><Operations /></ProtectedWorkspace></Route>
    <Route path="/settings"><ProtectedWorkspace><StudentSettings /></ProtectedWorkspace></Route>
    <Route path="/admin/intake"><ProtectedWorkspace><AdminIntake /></ProtectedWorkspace></Route>
    <Route path="/404" component={NotFound} />
    <Route component={NotFound} />
  </Switch>;
}

export default function App() {
  return <ErrorBoundary><ThemeProvider defaultTheme="dark"><TooltipProvider><Toaster position="bottom-right" richColors /><Router /></TooltipProvider></ThemeProvider></ErrorBoundary>;
}

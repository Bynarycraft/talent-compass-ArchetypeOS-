import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider, useAuth } from "@/contexts/AuthContext";

// Pages
import Auth from "./pages/Auth";
import Dashboard from "./pages/Dashboard";
import CandidateOnboarding from "./pages/CandidateOnboarding";
import Courses from "./pages/Courses";
import CourseDetail from "./pages/CourseDetail";
import Tests from "./pages/Tests";
import TakeTest from "./pages/TakeTest";
import LearningTracker from "./pages/LearningTracker";
import Roadmaps from "./pages/Roadmaps";
import SupervisorLearners from "./pages/supervisor/Learners";
import SupervisorGrading from "./pages/supervisor/Grading";
import AdminAnalytics from "./pages/admin/Analytics";
import NotFound from "./pages/NotFound";
import { Hexagon } from "lucide-react";

const queryClient = new QueryClient();

function RootRedirect() {
  const { user, role, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="animate-pulse">
          <Hexagon className="h-12 w-12 text-accent" />
        </div>
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/auth" replace />;
  }

  if (role === 'candidate') {
    return <Navigate to="/candidate" replace />;
  }

  return <Navigate to="/dashboard" replace />;
}

const App = () => (
  <QueryClientProvider client={queryClient}>
    <AuthProvider>
      <TooltipProvider>
        <Toaster />
        <Sonner />
        <BrowserRouter>
          <Routes>
            <Route path="/" element={<RootRedirect />} />
            <Route path="/auth" element={<Auth />} />
            <Route path="/candidate" element={<CandidateOnboarding />} />
            <Route path="/dashboard" element={<Dashboard />} />
            <Route path="/courses" element={<Courses />} />
            <Route path="/courses/:id" element={<CourseDetail />} />
            <Route path="/roadmaps" element={<Roadmaps />} />
            <Route path="/tests" element={<Tests />} />
            <Route path="/tests/:id/take" element={<TakeTest />} />
            <Route path="/tracker" element={<LearningTracker />} />
            <Route path="/supervisor/learners" element={<SupervisorLearners />} />
            <Route path="/supervisor/grading" element={<SupervisorGrading />} />
            <Route path="/admin/analytics" element={<AdminAnalytics />} />
            <Route path="*" element={<NotFound />} />
          </Routes>
        </BrowserRouter>
      </TooltipProvider>
    </AuthProvider>
  </QueryClientProvider>
);

export default App;

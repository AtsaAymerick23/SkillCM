import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Route, Routes } from "react-router-dom";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { I18nProvider } from "@/lib/i18n";
import { AuthProvider } from "@/hooks/useAuth";
import { ProtectedRoute } from "@/components/ProtectedRoute";
import { GridBackground } from "@/components/GridBackground";
import Index from "./pages/Index.tsx";
import Auth from "./pages/Auth.tsx";
import Dashboard from "./pages/Dashboard.tsx";
import Courses from "./pages/Courses.tsx";
import CourseDetail from "./pages/CourseDetail.tsx";
import LessonPlayer from "./pages/LessonPlayer.tsx";
import ExamPage from "./pages/ExamPage.tsx";
import ProjectPage from "./pages/ProjectPage.tsx";
import OpportunitiesPage from "./pages/OpportunitiesPage.tsx";
import ApplicationsPage from "./pages/ApplicationsPage.tsx";
import Certificate from "./pages/Certificate.tsx";
import CertificatesList from "./pages/CertificatesList.tsx";
import StartupLab from "./pages/StartupLab.tsx";
import ProfilePage from "./pages/ProfilePage.tsx";
import CVPage from "./pages/CVPage.tsx";
import CoverLetterPage from "./pages/CoverLetterPage.tsx";
import MentorsPage from "./pages/MentorsPage.tsx";
import NotFound from "./pages/NotFound.tsx";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <I18nProvider>
      <TooltipProvider>
        <Toaster />
        <Sonner />
        <BrowserRouter>
          <AuthProvider>
            <GridBackground />
            <div className="relative z-10">
              <Routes>
                <Route path="/" element={<Index />} />
                <Route path="/auth" element={<Auth />} />
                <Route path="/dashboard" element={<ProtectedRoute><Dashboard /></ProtectedRoute>} />
                <Route path="/courses" element={<Courses />} />
                <Route path="/courses/:slug" element={<CourseDetail />} />
                <Route path="/courses/:slug/lessons/:lessonId" element={<ProtectedRoute><LessonPlayer /></ProtectedRoute>} />
                <Route path="/courses/:slug/exam" element={<ProtectedRoute><ExamPage /></ProtectedRoute>} />
                <Route path="/courses/:slug/project" element={<ProtectedRoute><ProjectPage /></ProtectedRoute>} />
                <Route path="/opportunities" element={<OpportunitiesPage />} />
                <Route path="/applications" element={<ProtectedRoute><ApplicationsPage /></ProtectedRoute>} />
                <Route path="/certificates" element={<ProtectedRoute><CertificatesList /></ProtectedRoute>} />
                <Route path="/certificates/:code" element={<Certificate />} />
                <Route path="/startup-lab" element={<ProtectedRoute><StartupLab /></ProtectedRoute>} />
                <Route path="/profile" element={<ProtectedRoute><ProfilePage /></ProtectedRoute>} />
                <Route path="/cv" element={<ProtectedRoute><CVPage /></ProtectedRoute>} />
                <Route path="/cover-letter" element={<ProtectedRoute><CoverLetterPage /></ProtectedRoute>} />
                <Route path="/mentors" element={<ProtectedRoute><MentorsPage /></ProtectedRoute>} />
                <Route path="*" element={<NotFound />} />
              </Routes>
            </div>
          </AuthProvider>
        </BrowserRouter>
      </TooltipProvider>
    </I18nProvider>
  </QueryClientProvider>
);

export default App;

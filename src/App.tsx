import { lazy, Suspense } from "react";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";

const queryClient = new QueryClient();
const Index = lazy(() => import("./pages/Index"));
const SurveyPage = lazy(() => import("./pages/SurveyPage"));
const AdminPage = lazy(() => import("./pages/AdminPage"));
const ResultsPage = lazy(() => import("./pages/ResultsPage"));
const NotFound = lazy(() => import("./pages/NotFound"));

const RouteFallback = () => (
  <div className="min-h-[100svh] flex items-center justify-center bg-background px-4">
    <div className="gawad-panel px-8 py-6 text-center">
      <div className="animate-pulse text-primary font-body">Loading...</div>
    </div>
  </div>
);

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <Suspense fallback={<RouteFallback />}>
          <Routes>
            <Route path="/" element={<Index />} />
            <Route path="/survey/:eventId" element={<SurveyPage />} />
            <Route path="/admin" element={<AdminPage />} />
            <Route path="/admin/results/:eventId" element={<ResultsPage />} />
            <Route path="/:eventSlug" element={<SurveyPage />} />
            <Route path="*" element={<NotFound />} />
          </Routes>
        </Suspense>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;

import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Route, Routes } from "react-router-dom";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import Home from "./pages/Home";
import { AboutPage } from "./pages/Placeholders";
import { EventsPage } from "./pages/Events";
import { EventDetailPage } from "./pages/EventDetail";
import { SubmitPage } from "./pages/SubmitEvent";
import { SubmitThanksPage } from "./pages/SubmitThanks";
import { VerifyPage } from "./pages/Verify";
import { ManagePage } from "./pages/Manage";
import { ReportEventPage } from "./pages/ReportEvent";
import { RenewEventPage } from "./pages/Renew";
import AdminLoginPage from "./pages/admin/AdminLogin";
import AdminQueuePage from "./pages/admin/AdminQueue";
import AdminEventsPage from "./pages/admin/AdminEvents";
import AdminReportsPage from "./pages/admin/AdminReports";
import AdminSubmittersPage from "./pages/admin/AdminSubmitters";
import AdminStatsPage from "./pages/admin/AdminStats";
import { FeedsManagePage } from "./pages/FeedsManage";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/events" element={<EventsPage />} />
          <Route path="/events/:slug" element={<EventDetailPage />} />
          <Route path="/submit" element={<SubmitPage />} />
          <Route path="/submit/thanks" element={<SubmitThanksPage />} />
          <Route path="/verify" element={<VerifyPage />} />
          <Route path="/manage" element={<ManagePage />} />
          <Route path="/report/:eventId" element={<ReportEventPage />} />
          <Route path="/renew" element={<RenewEventPage />} />
          <Route path="/about" element={<AboutPage />} />
          <Route path="/feeds/manage" element={<FeedsManagePage />} />
          <Route path="/admin" element={<AdminLoginPage />} />
          <Route path="/admin/dashboard" element={<AdminQueuePage />} />
          <Route path="/admin/events" element={<AdminEventsPage />} />
          <Route path="/admin/reports" element={<AdminReportsPage />} />
          <Route path="/admin/submitters" element={<AdminSubmittersPage />} />
          <Route path="/admin/stats" element={<AdminStatsPage />} />
          {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
          <Route path="*" element={<NotFound />} />
        </Routes>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;

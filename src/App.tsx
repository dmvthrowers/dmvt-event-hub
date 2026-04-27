import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Route, Routes } from "react-router-dom";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import Home from "./pages/Home";
import { EventsPage, AboutPage } from "./pages/Placeholders";
import { SubmitPage } from "./pages/SubmitEvent";
import { SubmitThanksPage } from "./pages/SubmitThanks";
import { VerifyPage } from "./pages/Verify";
import { ManagePage } from "./pages/Manage";
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
          <Route path="/submit" element={<SubmitPage />} />
          <Route path="/submit/thanks" element={<SubmitThanksPage />} />
          <Route path="/verify" element={<VerifyPage />} />
          <Route path="/manage" element={<ManagePage />} />
          <Route path="/about" element={<AboutPage />} />
          {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
          <Route path="*" element={<NotFound />} />
        </Routes>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;

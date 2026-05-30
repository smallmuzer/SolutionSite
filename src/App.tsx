import { lazy, Suspense } from "react";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { GlobalViewProvider } from "./components/ui-customizer-context";
import { useContentSync, useSiteSettings } from "@/hooks/useSiteContent";
import { useEffect } from "react";
import { seedQueryCache } from "@/lib/seedCache";
import { queryClient } from "@/lib/queryClient";

const Index = lazy(() => import("./pages/Index"));
const NotFound = lazy(() => import("./pages/NotFound"));
const AdminLogin = lazy(() => import("./pages/AdminLogin"));
const AdminDashboard = lazy(() => import("./pages/AdminDashboard"));
const ApplicationStatus = lazy(() => import("./pages/ApplicationStatus"));

// Pre-populate cache with seed/fallback data synchronously before first render.
// Components render instantly with this data; API responses replace it in background.
seedQueryCache(queryClient);

const RouteFallback = () => <div className="min-h-screen bg-background" />;

const TrackingScripts = () => {
  const settings = useSiteSettings();
  
  useEffect(() => {
    // Google Analytics
    if (settings.google_analytics_id) {
      let script = document.getElementById("ga-script") as HTMLScriptElement;
      if (!script) {
        script = document.createElement("script");
        script.id = "ga-script";
        script.async = true;
        script.src = `https://www.googletagmanager.com/gtag/js?id=${settings.google_analytics_id}`;
        document.head.appendChild(script);

        const inlineScript = document.createElement("script");
        inlineScript.id = "ga-inline-script";
        inlineScript.innerHTML = `
          window.dataLayer = window.dataLayer || [];
          function gtag(){dataLayer.push(arguments);}
          gtag('js', new Date());
          gtag('config', '${settings.google_analytics_id}');
        `;
        document.head.appendChild(inlineScript);
      }
    }

    // Microsoft Clarity
    if (settings.microsoft_clarity_id) {
      let script = document.getElementById("clarity-script");
      if (!script) {
        const inlineScript = document.createElement("script");
        inlineScript.id = "clarity-script";
        inlineScript.type = "text/javascript";
        inlineScript.innerHTML = `
          (function(c,l,a,r,i,t,y){
              c[a]=c[a]||function(){(c[a].q=c[a].q||[]).push(arguments)};
              t=l.createElement(r);t.async=1;t.src="https://www.clarity.ms/tag/"+i;
              y=l.getElementsByTagName(r)[0];y.parentNode.insertBefore(t,y);
          })(window, document, "clarity", "script", "${settings.microsoft_clarity_id}");
        `;
        document.head.appendChild(inlineScript);
      }
    }
  }, [settings.google_analytics_id, settings.microsoft_clarity_id]);

  return null;
};

// Wrapper to ensure useContentSync is called WITHIN the QueryClientProvider
const AppContent = () => {
  useContentSync();
  return (
    <GlobalViewProvider>
      <TrackingScripts />
      <TooltipProvider>
        <Toaster />
        <Sonner />
        <BrowserRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
          <Suspense fallback={<RouteFallback />}>
            <Routes>
              <Route path="/" element={<Index />} />
              <Route path="/admin/login" element={<AdminLogin />} />
              <Route path="/admin" element={<AdminDashboard />} />
              <Route path="/applications" element={<ApplicationStatus />} />
              <Route path="*" element={<NotFound />} />
            </Routes>
          </Suspense>
        </BrowserRouter>
      </TooltipProvider>
    </GlobalViewProvider>
  );
};

const App = () => (
  <QueryClientProvider client={queryClient}>
    <AppContent />
  </QueryClientProvider>
);

export default App;

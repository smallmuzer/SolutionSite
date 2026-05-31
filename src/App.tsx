import { lazy, Suspense } from "react";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { GlobalViewProvider } from "./components/ui-customizer-context";
import { useContentSync, useSiteSettings } from "@/hooks/useSiteContent";
import { useEffect } from "react";
import { queryClient } from "@/lib/queryClient";

const Index = lazy(() => import("./pages/Index"));
const NotFound = lazy(() => import("./pages/NotFound"));
const AdminLogin = lazy(() => import("./pages/AdminLogin"));
const AdminDashboard = lazy(() => import("./pages/AdminDashboard"));
const ApplicationStatus = lazy(() => import("./pages/ApplicationStatus"));


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
      const script = document.getElementById("clarity-script");
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
    // AskKoya Chatbot
    const koyaEnabled = settings.chatbot_enabled === "true" && !!settings.chatbot_script_url && !!settings.chatbot_api_key;

    if (koyaEnabled) {
      // Inject button size style
      let chatStyle = document.getElementById("ak4-btn-style") as HTMLStyleElement;
      if (!chatStyle) {
        chatStyle = document.createElement("style");
        chatStyle.id = "ak4-btn-style";
        document.head.appendChild(chatStyle);
      }
      const btnSize = settings.chatbot_btn_size || "32";
      chatStyle.textContent = `.ak4-btn { width: ${btnSize}px !important; height: ${btnSize}px !important; z-index: 100 !important; animation: float 4s ease-in-out infinite !important; }`;

      // Inject AskKoyaConfig
      let configScript = document.getElementById("askkoya-config") as HTMLScriptElement;
      if (!configScript) {
        configScript = document.createElement("script");
        configScript.id = "askkoya-config";
        document.head.appendChild(configScript);
      }
      configScript.textContent = `window.AskKoyaConfig = { name: "", empID: "", domain: "" };`;

      // Inject embed script
      let embedScript = document.getElementById("askkoya-embed") as HTMLScriptElement;
      if (!embedScript) {
        embedScript = document.createElement("script");
        embedScript.id = "askkoya-embed";
        embedScript.src = settings.chatbot_script_url;
        embedScript.setAttribute("data-api-key", settings.chatbot_api_key);
        embedScript.setAttribute("data-name", "");
        embedScript.setAttribute("data-emp-id", "");
        embedScript.setAttribute("data-domain", "");
        embedScript.setAttribute("data-session-id", "");
        embedScript.setAttribute("data-title", settings.chatbot_title || "HR Assistant");
        embedScript.setAttribute("data-subtitle", settings.chatbot_subtitle || "AI Assistant");
        embedScript.setAttribute("data-accent", settings.chatbot_accent || "#7c3aed");
        embedScript.setAttribute("data-accent2", settings.chatbot_accent2 || "#0498e9");
        embedScript.setAttribute("data-bot-bubble", settings.chatbot_bot_bubble || "#ffffff");
        embedScript.setAttribute("data-user-color", settings.chatbot_user_color || "#ffffff");
        embedScript.setAttribute("data-position", settings.chatbot_position || "right");
        embedScript.setAttribute("data-open", "false");
        embedScript.setAttribute("data-hide-button", "false");

        // On successful load → hide default bot
        embedScript.onload = () => {
          window.dispatchEvent(new CustomEvent("ss:koyaBotStatus", { detail: "active" }));
        };
        // On failure → show default bot
        embedScript.onerror = () => {
          // Clean up failed script
          embedScript.remove();
          window.dispatchEvent(new CustomEvent("ss:koyaBotStatus", { detail: "inactive" }));
        };

        document.body.appendChild(embedScript);
      } else {
        // Script already present → koya is active
        window.dispatchEvent(new CustomEvent("ss:koyaBotStatus", { detail: "active" }));
      }
    } else {
      // Remove chatbot elements when disabled
      ["ak4-btn-style", "askkoya-config", "askkoya-embed"].forEach(id => {
        const el = document.getElementById(id);
        if (el) el.remove();
      });
      // Remove any injected chatbot UI elements
      document.querySelectorAll('[class*="ak4-"]').forEach(el => el.remove());
      // Signal default bot to show
      window.dispatchEvent(new CustomEvent("ss:koyaBotStatus", { detail: "inactive" }));
    }
  }, [
    settings.google_analytics_id,
    settings.microsoft_clarity_id,
    settings.chatbot_enabled,
    settings.chatbot_script_url,
    settings.chatbot_api_key,
    settings.chatbot_title,
    settings.chatbot_subtitle,
    settings.chatbot_accent,
    settings.chatbot_accent2,
    settings.chatbot_bot_bubble,
    settings.chatbot_user_color,
    settings.chatbot_position,
    settings.chatbot_btn_size,
  ]);

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
        <Sonner duration={2500} />
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

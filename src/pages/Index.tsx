import { lazy, Suspense, useEffect } from "react";
import Header from "@/components/Header";
import HeroSection from "@/components/HeroSection";
import UICustomizer from "@/components/UICustomizer";
import ScrollProgress from "@/components/ScrollProgress";
import { useSiteSettings } from "@/hooks/useSiteSettings";
import { useDbQuery } from "@/hooks/useDbQuery";
import { useSEO } from "@/hooks/useSEO";

// Lazy load all below-fold sections — improves initial load dramatically
const AboutSection       = lazy(() => import("@/components/AboutSection"));
const ServicesSection    = lazy(() => import("@/components/ServicesSection"));
const ProductsSection    = lazy(() => import("@/components/ProductsSection"));
const ClientsSection     = lazy(() => import("@/components/ClientsSection"));
const WorldMap           = lazy(() => import("@/components/WorldMap"));
const TestimonialsSection= lazy(() => import("@/components/TestimonialsSection"));
const CareersSection     = lazy(() => import("@/components/CareersSection"));
const TechnologiesSection = lazy(() => import("@/components/TechnologiesSection"));
const ContactSection     = lazy(() => import("@/components/ContactSection"));
const Footer             = lazy(() => import("@/components/Footer"));
const WhatsAppButton     = lazy(() => import("@/components/WhatsAppButton"));
const ScrollToTop        = lazy(() => import("@/components/ScrollToTop"));
const CookieConsent      = lazy(() => import("@/components/CookieConsent"));
const GuidedTour         = lazy(() => import("@/components/GuidedTour"));

// Smooth Skeleton fallback to prevent layout shift (CLS)
const SkeletonSection = () => (
  <div className="w-full bg-muted/20 animate-pulse" style={{ minHeight: "350px" }} />
);

const Index = () => {
  useSiteSettings(); // Preloads site_content
  useSEO();
  
  // Preload common data — fires once, stores in React Query cache
  const { data: _c } = useDbQuery("client_logos", { is_visible: true }, { order: "sort_order" });
  const { data: _s } = useDbQuery("services", { is_visible: true }, { order: "sort_order" });
  const { data: _t } = useDbQuery("technologies", { is_visible: true }, { order: "sort_order" });
  const { data: _p } = useDbQuery("products", { is_visible: true }, { order: "sort_order" });
  const { data: _j } = useDbQuery("career_jobs", { is_visible: true }, { order: "sort_order" });

  useEffect(() => {
    // Force scroll to top on refresh and clear hash targeting
    window.scrollTo({ top: 0, behavior: "instant" });
    if (window.location.hash) {
      window.history.replaceState(null, '', window.location.pathname);
    }
  }, []);

  return (
    <div className="min-h-screen bg-background">
      <ScrollProgress />
      <Header />
      <HeroSection />

      <Suspense fallback={<SkeletonSection />}>
        <AboutSection />
      </Suspense>

      <Suspense fallback={<SkeletonSection />}>
        <ServicesSection />
      </Suspense>

      <Suspense fallback={<SkeletonSection />}>
        <ProductsSection />
      </Suspense>

      <Suspense fallback={<SkeletonSection />}>
        <ClientsSection />
      </Suspense>

      <Suspense fallback={<SkeletonSection />}>
        <WorldMap />
      </Suspense>

      <Suspense fallback={<SkeletonSection />}>
        <TestimonialsSection />
      </Suspense>

      <Suspense fallback={<SkeletonSection />}>
        <CareersSection />
      </Suspense>

      <Suspense fallback={<SkeletonSection />}>
        <TechnologiesSection />
      </Suspense>

      <Suspense fallback={<SkeletonSection />}>
        <ContactSection />
      </Suspense>

      <Suspense fallback={<SkeletonSection />}>
        <Footer />
      </Suspense>

      <Suspense fallback={null}>
        <WhatsAppButton />
        <ScrollToTop />
        <CookieConsent />
        <GuidedTour />
      </Suspense>

      <UICustomizer />
    </div>
  );
};

export default Index;

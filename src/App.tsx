import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import Index from "./pages/Index";
import NotFound from "./pages/NotFound";
import { ProductDetail } from "./pages/ProductDetail";
import { BrandDetail } from "./pages/BrandDetail";
import CataloguePage from "./pages/CataloguePage";
import CategoriesPage from "./pages/CategoriesPage";
import CategoryDetail from "./pages/CategoryDetail";
import BrandsPage from "./pages/BrandsPage";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<Index />} />
          <Route path="/catalogue" element={<CataloguePage />} />
          <Route path="/categories" element={<CategoriesPage />} />
          <Route path="/categories/:categorySlug" element={<CategoryDetail />} />
          <Route path="/marques" element={<BrandsPage />} />
          <Route path="/parfums/:brand/:name" element={<ProductDetail />} />
          <Route path="/marques/:brandId" element={<BrandDetail />} />
          <Route path="*" element={<NotFound />} />
        </Routes>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;

import { Header } from "@/components/Header";
import { Hero } from "@/components/Hero";
import { Catalogue } from "@/components/Catalogue";
import { Contact } from "@/components/Contact";
import { Footer } from "@/components/Footer";
import { MobileContactBar } from "@/components/MobileContactBar";

const Index = () => {
  return (
    <div className="min-h-screen bg-background">
      <Header />
      <main>
        <Hero />
        <Catalogue />
        <Contact />
      </main>
      <Footer />
      <MobileContactBar />
    </div>
  );
};

export default Index;

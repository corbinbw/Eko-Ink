import Navigation from "./components-marketing/Navigation";
import Hero from "./components-marketing/Hero";
import DirectBenefits from "./components-marketing/DirectBenefits";
import HowItWorks from "./components-marketing/HowItWorks";
import ExampleNotes from "./components-marketing/ExampleNotes";
import RealityCheck from "./components-marketing/RealityCheck";
import Testimonial from "./components-marketing/Testimonial";
import CTA from "./components-marketing/CTA";
import Footer from "./components-marketing/Footer";

export default function LandingPage() {
  return (
    <div className="min-h-screen">
      <Navigation />
      <Hero />
      <DirectBenefits />
      <HowItWorks />
      <ExampleNotes />
      <RealityCheck />
      <Testimonial />
      <CTA />
      <Footer />
    </div>
  );
}

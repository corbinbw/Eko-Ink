import { Info } from "lucide-react";

export default function RealityCheck() {
  return (
    <section className="py-16 bg-accent/5">
      <div className="container mx-auto px-4">
        <div className="max-w-3xl mx-auto">
          <div className="flex items-start gap-4 p-6 rounded-xl bg-card border-2 border-accent/30">
            <Info className="h-6 w-6 text-accent flex-shrink-0 mt-1" />
            <div>
              <h3 className="font-semibold text-lg mb-2">Where We Are Today</h3>
              <p className="text-muted-foreground">
                Manual upload today. CRM automation coming Q2 2025. We're building this alongside our pilot customers to get it right.
              </p>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

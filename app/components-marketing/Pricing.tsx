import { DollarSign } from "lucide-react";

export default function Pricing() {
  return (
    <section className="py-24 bg-gradient-subtle">
      <div className="container mx-auto px-4">
        <div className="max-w-3xl mx-auto text-center">
          <div className="inline-flex items-center gap-2 mb-6 px-4 py-2 bg-accent/10 rounded-full">
            <DollarSign className="h-4 w-4 text-accent" />
            <span className="text-sm font-medium text-accent">Simple Pricing</span>
          </div>
          <h2 className="text-4xl lg:text-5xl font-bold mb-4">
            $10 per note
          </h2>
          <p className="text-xl text-muted-foreground mb-8">
            Pay only for what you send
          </p>
          <div className="mt-8 p-6 rounded-xl bg-card border border-border">
            <p className="text-muted-foreground">
              Team & volume discounts available • Monthly plans and enterprise options coming soon
            </p>
          </div>
        </div>
      </div>
    </section>
  );
}

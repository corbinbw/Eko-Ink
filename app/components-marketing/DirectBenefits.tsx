import { CheckCircle2 } from "lucide-react";

const benefits = [
  "Handwritten notes get opened. Emails get deleted.",
  "Personal touches build trust faster than any follow-up email",
  "Customers remember the ones who made them feel valued",
  "A $10 note can save a $10,000 deal from falling through",
  "Referrals come from people who feel appreciated, not sold to",
];

export default function DirectBenefits() {
  return (
    <section className="py-24 bg-background">
      <div className="container mx-auto px-4">
        <div className="max-w-4xl mx-auto">
          <div className="text-center mb-12 animate-fade-in">
            <h2 className="text-4xl lg:text-5xl font-bold mb-6">
              Why handwritten notes work
            </h2>
          </div>
          <div className="grid md:grid-cols-2 gap-6">
            {benefits.map((benefit, index) => (
              <div
                key={index}
                className="flex items-start gap-4 p-6 rounded-xl bg-card border border-border hover:border-accent transition-all duration-300 animate-slide-up"
                style={{ animationDelay: `${index * 100}ms` }}
              >
                <CheckCircle2 className="h-6 w-6 text-accent flex-shrink-0 mt-1" />
                <p className="text-lg">{benefit}</p>
              </div>
            ))}
          </div>
          <p className="text-center text-xl text-muted-foreground mt-12 max-w-2xl mx-auto">
            Nothing builds loyalty faster than a handwritten thank you.
          </p>
        </div>
      </div>
    </section>
  );
}

import { X } from "lucide-react";

const problems = [
  "Follow-ups feel automated and cold",
  "Reps don't have time to write handwritten cards",
  "Customers know when messages are mass-generated",
  "Deals fall through when the human touch fades",
];

export default function Pain() {
  return (
    <section className="py-24 bg-background">
      <div className="container mx-auto px-4">
        <div className="max-w-3xl mx-auto">
          <div className="text-center mb-12 animate-fade-in">
            <h2 className="text-3xl lg:text-4xl font-bold mb-4">
              You closed the deal. Now what?
            </h2>
            <p className="text-xl text-muted-foreground">
              Most sales teams struggle with post-sale follow-up
            </p>
          </div>
          <div className="grid md:grid-cols-2 gap-6">
            {problems.map((problem, index) => (
              <div
                key={index}
                className="flex items-start gap-3 p-6 rounded-xl bg-card border border-border animate-slide-up"
                style={{ animationDelay: `${index * 100}ms` }}
              >
                <div className="flex-shrink-0 w-6 h-6 rounded-full bg-red-100 dark:bg-red-900/20 flex items-center justify-center">
                  <X className="h-4 w-4 text-red-600 dark:text-red-400" />
                </div>
                <p className="text-muted-foreground">{problem}</p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}

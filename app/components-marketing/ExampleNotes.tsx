import { Sparkles } from "lucide-react";

export default function ExampleNotes() {
  return (
    <section className="py-24 bg-background">
      <div className="container mx-auto px-4">
        <div className="max-w-5xl mx-auto">
          <div className="text-center mb-16 animate-fade-in">
            <h2 className="text-4xl lg:text-5xl font-bold mb-4">
              See the Magic
            </h2>
            <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
              Real handwritten notes that customers actually keep
            </p>
          </div>

          <div className="grid md:grid-cols-2 gap-8 items-center">
            {/* Example Note Card */}
            <div className="bg-gradient-subtle rounded-2xl p-8 border-2 border-accent/20 shadow-large">
              <div className="bg-white dark:bg-gray-100 p-8 rounded-xl shadow-medium">
                <div className="font-handwriting text-royal-ink text-lg leading-relaxed space-y-4">
                  <p>Hi Sarah!</p>
                  <p>
                    Thank you for trusting me with your F-150 purchase. I loved hearing about your camping trips — this truck is going to be perfect for those adventures.
                  </p>
                  <p>
                    Excited to see you at pickup!
                  </p>
                  <p className="mt-6">– Mike</p>
                </div>
              </div>
              <div className="mt-4 flex items-center gap-2 text-sm text-muted-foreground">
                <Sparkles className="h-4 w-4" />
                <span>Written with real ink • Mailed automatically</span>
              </div>
            </div>

            {/* AI Text Example */}
            <div className="space-y-6">
              <div className="p-6 rounded-xl bg-card border border-border">
                <h3 className="font-semibold text-lg mb-3">What EkoInk Picked Up:</h3>
                <div className="space-y-3 text-muted-foreground">
                  <p className="flex items-start gap-2">
                    <span className="text-accent">•</span>
                    <span>Camping trips mentioned</span>
                  </p>
                  <p className="flex items-start gap-2">
                    <span className="text-accent">•</span>
                    <span>F-150 purchase</span>
                  </p>
                  <p className="flex items-start gap-2">
                    <span className="text-accent">•</span>
                    <span>Pickup scheduled</span>
                  </p>
                </div>
              </div>

              <div className="p-6 rounded-xl bg-accent/5 border border-accent/20">
                <h3 className="font-semibold text-lg mb-3 flex items-center gap-2">
                  <Sparkles className="h-5 w-5 text-accent" />
                  Why It Works
                </h3>
                <p className="text-muted-foreground">
                  EkoInk learns your writing style and uses real details from your conversation — making every note personal and authentic.
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

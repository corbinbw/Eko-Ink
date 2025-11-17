import { Upload, Sparkles, Mail, Check } from "lucide-react";

const benefits = [
  {
    icon: Upload,
    title: "1. Upload Your Deal",
    description: "Submit customer info and your call recording (MP3 or transcript). Quick and simple.",
  },
  {
    icon: Sparkles,
    title: "2. AI Learns Your Style",
    description: "You get a personalized thank-you note that sounds like you. Over your first 25 notes, EkoInk adapts to your tone and preferences.",
  },
  {
    icon: Mail,
    title: "3. Real Ink. Real Mail.",
    description: "We write your note by hand with real ink — not a printed font — and mail it to your customer.",
  },
  {
    icon: Check,
    title: "4. Pay Per Note",
    description: "$10 per note during early access. Only pay for notes you approve and send. No subscription.",
  },
];

export default function Benefits() {
  return (
    <section className="py-24 bg-background">
      <div className="container mx-auto px-4">
        <div className="text-center mb-16 animate-fade-in">
          <h2 className="text-4xl lg:text-5xl font-bold mb-4">
            How It Works
          </h2>
          <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
            Four simple steps to send handwritten notes that customers actually keep
          </p>
        </div>
        <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-8">
          {benefits.map((benefit, index) => (
            <div
              key={index}
              className="p-6 rounded-2xl bg-card border border-border shadow-soft hover:shadow-medium transition-all duration-300 hover:-translate-y-1 animate-slide-up"
              style={{ animationDelay: `${index * 100}ms` }}
            >
              <div className="w-12 h-12 rounded-xl bg-gradient-primary flex items-center justify-center mb-4">
                <benefit.icon className="h-6 w-6 text-primary-foreground" />
              </div>
              <h3 className="text-xl font-semibold mb-3">{benefit.title}</h3>
              <p className="text-muted-foreground">{benefit.description}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

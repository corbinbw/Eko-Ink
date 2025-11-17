import { Link2, Brain, Mail } from "lucide-react";

const steps = [
  {
    icon: Link2,
    step: "01",
    title: "Upload Your Deal",
    description: "Submit customer info and your call recording. MP3 or transcript works.",
  },
  {
    icon: Brain,
    step: "02",
    title: "AI Writes in Your Voice",
    description: "EkoInk analyzes your call and writes a thank you note in your tone. The system learns your style over your first 25 notes. You review before sending.",
  },
  {
    icon: Mail,
    step: "03",
    title: "We Handwrite and Mail It",
    description: "Your note is written by a robotic pen using real ink. Then it's mailed directly to your customer.",
  },
];

export default function HowItWorks() {
  return (
    <section className="py-24 bg-gradient-subtle">
      <div className="container mx-auto px-4">
        <div className="text-center mb-16 animate-fade-in">
          <h2 className="text-4xl lg:text-5xl font-bold mb-4">
            How It Works
          </h2>
          <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
            Call → AI → Handwritten note → Mailbox
          </p>
        </div>
        <div className="max-w-5xl mx-auto">
          <div className="grid md:grid-cols-3 gap-8">
            {steps.map((step, index) => (
              <div key={index} className="relative animate-slide-up" style={{ animationDelay: `${index * 150}ms` }}>
                <div className="flex flex-col items-center text-center">
                  <div className="relative mb-6">
                    <div className="w-20 h-20 rounded-full bg-gradient-primary flex items-center justify-center shadow-medium">
                      <step.icon className="h-10 w-10 text-primary-foreground" />
                    </div>
                    <div className="absolute -top-2 -right-2 w-10 h-10 rounded-full bg-accent flex items-center justify-center font-bold text-accent-foreground shadow-soft">
                      {step.step}
                    </div>
                  </div>
                  <h3 className="text-2xl font-semibold mb-3">{step.title}</h3>
                  <p className="text-muted-foreground">{step.description}</p>
                </div>
                {index < steps.length - 1 && (
                  <div className="hidden md:block absolute top-10 left-full w-full h-0.5 bg-gradient-to-r from-primary to-transparent -translate-x-1/2 -z-10" />
                )}
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}

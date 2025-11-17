import { Building2, Home, Briefcase, Users, Wrench } from "lucide-react";

const audiences = [
  {
    icon: Building2,
    title: "Auto Sales Teams",
    description: "Boost referrals and post-sale relationships.",
  },
  {
    icon: Wrench,
    title: "Solar, Roofing & Home Services",
    description: "Stand out from competitors and reduce cancellations.",
  },
  {
    icon: Home,
    title: "Real Estate Agents",
    description: "Stay memorable long after closing day.",
  },
  {
    icon: Briefcase,
    title: "Financial & Insurance Advisors",
    description: "Build trust with high-value clients.",
  },
  {
    icon: Users,
    title: "Customer Success Teams",
    description: "Celebrate wins, onboard new customers, and strengthen retention.",
  },
];

export default function WhoItsFor() {
  return (
    <section className="py-24 bg-background">
      <div className="container mx-auto px-4">
        <div className="text-center mb-16 animate-fade-in">
          <h2 className="text-4xl lg:text-5xl font-bold mb-4">
            Built for Sales Professionals Who Win With Relationships
          </h2>
          <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
            Perfect for roles where trust and follow-up matter
          </p>
        </div>
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6 max-w-5xl mx-auto">
          {audiences.map((audience, index) => (
            <div
              key={index}
              className="group p-6 rounded-xl bg-card border border-border hover:border-accent transition-all duration-300 hover:shadow-medium animate-scale-in"
              style={{ animationDelay: `${index * 100}ms` }}
            >
              <div className="w-14 h-14 rounded-lg bg-gradient-warm flex items-center justify-center mb-4 group-hover:scale-110 transition-transform duration-300">
                <audience.icon className="h-7 w-7 text-accent-foreground" />
              </div>
              <h3 className="text-lg font-semibold mb-2">{audience.title}</h3>
              <p className="text-sm text-muted-foreground">{audience.description}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

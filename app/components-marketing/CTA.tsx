"use client";

import { ArrowRight } from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/ui/button";

export default function CTA() {
  return (
    <section className="py-24 bg-background">
      <div className="container mx-auto px-4">
        <div className="max-w-4xl mx-auto text-center animate-fade-in">
          <h2 className="text-4xl lg:text-5xl font-bold mb-6">
            Ready to make follow-ups personal again?
          </h2>
          <p className="text-xl text-muted-foreground mb-10 max-w-2xl mx-auto">
            Join our pilot program. Your feedback shapes the product. Early pricing locked in.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Button
              variant="hero"
              size="lg"
              className="text-lg px-8 py-6 h-auto"
              asChild
            >
              <a href="https://calendly.com/corbinbrandonwilliams" target="_blank" rel="noopener noreferrer">
                Book a Demo
                <ArrowRight className="ml-2 h-6 w-6" />
              </a>
            </Button>
            <Button
              variant="hero-outline"
              size="lg"
              className="text-lg px-8 py-6 h-auto"
              asChild
            >
              <Link href="/signup">
                Join the Pilot
              </Link>
            </Button>
          </div>
          <p className="mt-8 text-sm text-muted-foreground">
            Early access • Custom pricing for teams • Built by sales reps
          </p>
        </div>
      </div>
    </section>
  );
}

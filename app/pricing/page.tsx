"use client";

import Navigation from "../components-marketing/Navigation";
import { DollarSign } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function PricingPage() {
  return (
    <div className="min-h-screen bg-gradient-subtle">
      <Navigation />
      <div className="container mx-auto px-4 py-20 pt-32">
        <div className="max-w-3xl mx-auto">

          <div className="text-center mb-12">
            <div className="inline-flex items-center gap-2 mb-6 px-4 py-2 bg-accent/10 rounded-full">
              <DollarSign className="h-4 w-4 text-accent" />
              <span className="text-sm font-medium text-accent">Volume Pricing</span>
            </div>
            <h1 className="text-5xl lg:text-6xl font-bold mb-6">
              Starting at $4.75/note
            </h1>
            <p className="text-xl text-muted-foreground mb-8">
              Buy credits, send notes. The more you buy, the less you pay.
            </p>
          </div>

          <div className="space-y-6 mb-12">
            {/* Pricing Tiers */}
            <div className="grid md:grid-cols-2 gap-4">
              <div className="p-6 rounded-xl bg-card border-2 border-border hover:border-accent transition-all">
                <div className="text-center">
                  <div className="text-4xl font-bold mb-2">10 notes</div>
                  <div className="text-2xl font-semibold text-accent mb-1">$59.90</div>
                  <div className="text-sm text-muted-foreground">$5.99 per note</div>
                </div>
              </div>

              <div className="p-6 rounded-xl bg-card border-2 border-border hover:border-accent transition-all">
                <div className="text-center">
                  <div className="text-4xl font-bold mb-2">25 notes</div>
                  <div className="text-2xl font-semibold text-accent mb-1">$149.75</div>
                  <div className="text-sm text-muted-foreground">$5.99 per note</div>
                </div>
              </div>

              <div className="p-6 rounded-xl bg-card border-2 border-accent shadow-lg">
                <div className="absolute -top-3 left-1/2 -translate-x-1/2 px-3 py-1 bg-accent text-accent-foreground text-xs font-bold rounded-full">
                  POPULAR
                </div>
                <div className="text-center">
                  <div className="text-4xl font-bold mb-2">50 notes</div>
                  <div className="text-2xl font-semibold text-accent mb-1">$274.50</div>
                  <div className="text-sm text-muted-foreground">$5.49 per note</div>
                </div>
              </div>

              <div className="p-6 rounded-xl bg-card border-2 border-border hover:border-accent transition-all">
                <div className="text-center">
                  <div className="text-4xl font-bold mb-2">100 notes</div>
                  <div className="text-2xl font-semibold text-accent mb-1">$499.00</div>
                  <div className="text-sm text-muted-foreground">$4.99 per note</div>
                </div>
              </div>

              <div className="p-6 rounded-xl bg-gradient-to-br from-accent/10 to-accent/5 border-2 border-accent col-span-full">
                <div className="text-center">
                  <div className="text-4xl font-bold mb-2">250+ notes</div>
                  <div className="text-2xl font-semibold text-accent mb-1">$4.75/note</div>
                  <div className="text-sm text-muted-foreground">Best value for teams</div>
                </div>
              </div>
            </div>

            <div className="p-8 rounded-2xl bg-card border border-border shadow-large">
              <h2 className="text-2xl font-bold mb-4">What's Included</h2>
              <ul className="grid md:grid-cols-2 gap-3 text-muted-foreground">
                <li className="flex items-start gap-2">
                  <span className="text-accent mt-1">✓</span>
                  <span>AI note generation in your voice</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-accent mt-1">✓</span>
                  <span>Real ink handwriting</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-accent mt-1">✓</span>
                  <span>Learning system (adapts over 25 notes)</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-accent mt-1">✓</span>
                  <span>Postage and mailing included</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-accent mt-1">✓</span>
                  <span>Human review before sending</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-accent mt-1">✓</span>
                  <span>Credits never expire</span>
                </li>
              </ul>
            </div>

            <div className="p-6 rounded-xl bg-accent/5 border border-accent/20">
              <p className="text-muted-foreground text-center">
                Need 500+ notes? Email <a href="mailto:corbinbrandonwilliams@gmail.com" className="text-accent hover:underline">corbinbrandonwilliams@gmail.com</a> for custom pricing
              </p>
            </div>
          </div>

          <div className="text-center">
            <Button
              variant="hero"
              size="lg"
              className="text-lg px-8"
              onClick={() => window.open("https://calendly.com/corbinbrandonwilliams", "_blank")}
            >
              Book a Demo
            </Button>
            <p className="mt-4 text-sm text-muted-foreground">
              Questions? Email{" "}
              <a href="mailto:corbinbrandonwilliams@gmail.com" className="text-accent hover:underline">
                corbinbrandonwilliams@gmail.com
              </a>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

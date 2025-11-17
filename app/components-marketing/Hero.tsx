"use client";

import { ArrowRight } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { Button } from "@/components/ui/button";

export default function Hero() {
  return (
    <section className="relative min-h-screen flex items-center justify-center overflow-hidden bg-gradient-subtle pt-16">
      <div className="container mx-auto px-4 py-20">
        <div className="grid lg:grid-cols-2 gap-12 items-center">
          <div className="animate-fade-in">
            <h1 className="text-5xl lg:text-7xl font-bold mb-6 leading-tight text-gray-900 dark:text-gray-100">
              Handwritten thank you notes after every sales call
            </h1>
            <p className="text-xl text-muted-foreground mb-8 max-w-xl">
              Real ink. Real handwriting. Automated from your call recordings.
            </p>
            <div className="flex flex-col sm:flex-row gap-4">
              <Button
                variant="hero"
                size="lg"
                className="text-lg px-8"
                asChild
              >
                <a href="https://calendly.com/corbinbrandonwilliams" target="_blank" rel="noopener noreferrer">
                  Book a Demo
                  <ArrowRight className="ml-2 h-5 w-5" />
                </a>
              </Button>
              <Button
                variant="hero-outline"
                size="lg"
                className="text-base"
                asChild
              >
                <Link href="/signup">
                  Get Early Access
                </Link>
              </Button>
            </div>
          </div>
          <div className="relative animate-scale-in">
            <div className="absolute inset-0 bg-gradient-primary opacity-20 blur-3xl rounded-full" />
            <Image
              src="/images/hero-handwriting.jpg"
              alt="Robotic pen writing a handwritten thank you note"
              width={800}
              height={600}
              className="relative rounded-2xl shadow-large w-full"
              priority
            />
          </div>
        </div>
      </div>
    </section>
  );
}

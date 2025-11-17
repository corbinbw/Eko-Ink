"use client";

import Link from "next/link";
import { Mail, Calendar } from "lucide-react";

export default function Footer() {
  return (
    <footer className="py-12 bg-royal-ink text-white">
      <div className="container mx-auto px-4">
        <div className="grid md:grid-cols-3 gap-8 mb-8">
          <div className="text-center md:text-left">
            <div className="text-2xl font-serif font-bold italic mb-2 text-antique-gold">EkoInk</div>
            <p className="text-sm text-gray-300">Let your voice leave a mark.</p>
            <p className="text-xs text-gray-400 mt-2">Built by sales reps who were tired of generic follow-ups</p>
          </div>

          <div>
            <h3 className="font-semibold mb-3 text-antique-gold">Quick Links</h3>
            <div className="flex flex-col gap-2 text-sm">
              <Link href="/pricing" className="text-gray-300 hover:text-antique-gold transition-colors">
                Pricing
              </Link>
              <Link href="/contact" className="text-gray-300 hover:text-antique-gold transition-colors">
                Contact
              </Link>
              <a
                href="https://calendly.com/corbinbrandonwilliams"
                target="_blank"
                rel="noopener noreferrer"
                className="text-gray-300 hover:text-antique-gold transition-colors text-left"
              >
                Demo
              </a>
              <Link href="/signup" className="text-gray-300 hover:text-antique-gold transition-colors">
                Pilot Signup
              </Link>
              <Link href="/dashboard" className="text-gray-300 hover:text-antique-gold transition-colors">
                Dashboard
              </Link>
              <Link href="/login" className="text-gray-300 hover:text-antique-gold transition-colors">
                Sign In
              </Link>
            </div>
          </div>

          <div>
            <h3 className="font-semibold mb-3 text-antique-gold">Get in Touch</h3>
            <div className="flex flex-col gap-3 text-sm">
              <a
                href="mailto:corbinbrandonwilliams@gmail.com"
                className="flex items-center gap-2 text-gray-300 hover:text-antique-gold transition-colors"
              >
                <Mail className="h-4 w-4" />
                <span>corbinbrandonwilliams@gmail.com</span>
              </a>
              <a
                href="https://calendly.com/corbinbrandonwilliams"
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-2 text-gray-300 hover:text-antique-gold transition-colors text-left"
              >
                <Calendar className="h-4 w-4" />
                <span>Book a Demo</span>
              </a>
            </div>
          </div>
        </div>

        <div className="pt-8 border-t border-white/10 text-center text-sm text-gray-400">
          © 2025 EkoInk. All rights reserved.
        </div>
      </div>
    </footer>
  );
}

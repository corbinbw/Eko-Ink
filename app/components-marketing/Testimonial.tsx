import { Users } from "lucide-react";

export default function Testimonial() {
  return (
    <section className="py-24 bg-royal-ink dark:bg-gray-900">
      <div className="container mx-auto px-4">
        <div className="max-w-4xl mx-auto text-center animate-fade-in">
          <Users className="h-16 w-16 mx-auto mb-8 text-antique-gold opacity-75" />
          <h2 className="text-3xl lg:text-4xl font-bold mb-6 leading-relaxed text-white">
            Built for Early Adopters
          </h2>
          <p className="text-xl text-gray-200 mb-12 max-w-2xl mx-auto">
            Working with our first 5 pilot customers to build this right.
          </p>
          <div className="grid md:grid-cols-3 gap-6">
            <div className="bg-white/10 dark:bg-white/5 backdrop-blur-sm rounded-xl p-6 border border-antique-gold/20">
              <div className="text-3xl font-bold mb-2 text-antique-gold">Real ink</div>
              <div className="text-sm text-gray-300">not printed fonts</div>
            </div>
            <div className="bg-white/10 dark:bg-white/5 backdrop-blur-sm rounded-xl p-6 border border-antique-gold/20">
              <div className="text-3xl font-bold mb-2 text-antique-gold">Learns your tone</div>
              <div className="text-sm text-gray-300">in 25 notes</div>
            </div>
            <div className="bg-white/10 dark:bg-white/5 backdrop-blur-sm rounded-xl p-6 border border-antique-gold/20">
              <div className="text-3xl font-bold mb-2 text-antique-gold">Human-reviewed</div>
              <div className="text-sm text-gray-300">before sending</div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

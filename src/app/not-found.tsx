import React from 'react';
import Link from 'next/link';
import { ShoppingBag, ArrowLeft } from 'lucide-react';

export default function NotFound() {
  return (
    <div className="min-h-[70vh] bg-festive-obsidian text-slate-100 flex items-center justify-center py-16 px-4">
      <div className="max-w-md w-full bg-festive-surface rounded-3xl border border-amber-500/30 p-8 text-center space-y-6 shadow-2xl">
        <div className="w-20 h-20 rounded-3xl bg-amber-500/10 text-amber-400 flex items-center justify-center mx-auto border border-amber-500/20 text-4xl">
          🎆
        </div>
        <div className="space-y-2">
          <span className="px-3 py-1 rounded-full text-[11px] font-black uppercase tracking-wider bg-rose-500/20 text-rose-300 border border-rose-500/30">
            404 • Page Not Found
          </span>
          <h1 className="font-heading font-black text-2xl sm:text-3xl text-white">
            Looking for Fireworks?
          </h1>
          <p className="text-xs sm:text-sm text-slate-400 leading-relaxed">
            The page you are looking for doesn&apos;t exist or has moved. Explore our catalog of Diwali fireworks and festive hampers.
          </p>
        </div>

        <div className="flex flex-col sm:flex-row items-center justify-center gap-3 pt-2">
          <Link
            href="/#catalog"
            className="w-full sm:w-auto px-5 py-3 rounded-2xl bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-400 hover:to-orange-400 text-slate-950 font-black text-xs shadow-spark transition-all flex items-center justify-center gap-2"
          >
            <ShoppingBag className="w-4 h-4 text-slate-950" />
            <span>Browse Catalog</span>
          </Link>
          <Link
            href="/"
            className="w-full sm:w-auto px-5 py-3 rounded-2xl bg-slate-900 hover:bg-slate-800 text-slate-300 hover:text-white font-bold text-xs border border-slate-800 transition-colors flex items-center justify-center gap-2"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Go Home</span>
          </Link>
        </div>
      </div>
    </div>
  );
}

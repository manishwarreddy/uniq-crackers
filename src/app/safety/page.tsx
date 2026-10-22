import React from 'react';
import Link from 'next/link';
import { Flame, ShieldAlert, Sparkles, CheckCircle2, AlertOctagon, HeartHandshake, PhoneCall, ArrowLeft } from 'lucide-react';
import { STORE_DEFAULTS } from '@/lib/constants';

export const metadata = {
  title: 'Fireworks Safety Guidelines & Disclaimer | Uniq Crackers Hyderabad',
  description: 'Essential Diwali fireworks safety guidelines, reduced smoke disclosures, outdoor handling instructions, and emergency procedures.',
};

export default function SafetyGuidelinesPage() {
  return (
    <div className="min-h-screen bg-festive-obsidian text-slate-100 py-12 sm:py-16">
      <div className="container-custom max-w-4xl space-y-10">
        {/* Back Link */}
        <Link
          href="/"
          className="inline-flex items-center gap-2 text-xs font-bold text-amber-400 hover:text-amber-300 transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Back to Fireworks Catalog</span>
        </Link>

        {/* Header */}
        <div className="space-y-3 border-b border-amber-500/20 pb-6">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-amber-500/10 border border-amber-500/30 text-amber-400 text-xs font-bold">
            <Flame className="w-4 h-4 text-amber-400" />
            <span>Safe Festivities First</span>
          </div>
          <h1 className="font-heading font-black text-3xl sm:text-4xl text-white">
            Fireworks Safety Disclaimer &amp; Guidelines
          </h1>
          <p className="text-xs sm:text-sm text-slate-400 leading-relaxed">
            Essential safety guidelines for family celebrations in Hyderabad • Velmala Dispatch Hub
          </p>
          <p className="text-xs text-slate-300">
            Diwali is a festival of illumination, joy, and togetherness. At <strong>{STORE_DEFAULTS.NAME}</strong>, the physical safety of your family, neighbors, pets, and property is our paramount priority. Please review these essential guidelines prior to enjoying any pyrotechnic fireworks.
          </p>
        </div>

        {/* Reduced Smoke Disclaimer Banner */}
        <div className="p-4 rounded-2xl bg-slate-900 border border-amber-500/30 text-xs text-slate-300 space-y-1.5">
          <div className="font-bold text-amber-400 flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-amber-400" />
            <span>Product Formulation &amp; Reduced Smoke Disclosure</span>
          </div>
          <p className="text-[11px] text-slate-300 leading-relaxed">
            Fireworks in our catalog feature <strong>reduced smoke formulations</strong> manufactured without added barium chemical salts, designed to minimize airborne particulate matter. However, all fireworks are inherently <strong>combustion-based pyrotechnic devices</strong>. They produce heat, sparks, and chemical combustion byproducts and must strictly be treated with caution.
          </p>
        </div>

        {/* Safety Guidelines Sections */}
        <div className="space-y-8 text-xs sm:text-sm text-slate-300 leading-relaxed">
          {/* Section 1: Pre-Celebration Preparation Checklist */}
          <section className="p-6 rounded-3xl bg-slate-900/60 border border-slate-800 space-y-3">
            <h2 className="font-heading font-black text-lg text-white flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-400" />
              <span>1. Pre-Celebration Preparation Checklist</span>
            </h2>
            <ul className="list-disc list-inside space-y-2 pl-2 text-slate-300">
              <li>
                <strong>Always Keep Water &amp; Sand Nearby:</strong> Place two buckets of water and a bucket of sand or an active garden hose in the immediate ignition area before lighting any firework.
              </li>
              <li>
                <strong>Appropriate Festive Clothing:</strong> Wear close-fitting, 100% natural cotton garments and closed footwear. Avoid loose synthetic garments (such as nylon, polyester, or rayon) that ignite rapidly and melt upon contact with sparks.
              </li>
              <li>
                <strong>Store in a Cool, Dry Place:</strong> Keep cracker boxes in their original moisture-resistant packaging away from direct sunlight, gas cylinders, electrical panels, and children&apos;s reach.
              </li>
              <li>
                <strong>Adult Supervision is Mandatory:</strong> Children must never handle, carry, or ignite fireworks without direct, focused adult supervision.
              </li>
            </ul>
          </section>

          {/* Section 2: Outdoor Ignition & Clearance Rules */}
          <section className="p-6 rounded-3xl bg-slate-900/60 border border-slate-800 space-y-3">
            <h2 className="font-heading font-black text-lg text-white flex items-center gap-2">
              <ShieldAlert className="w-4 h-4 text-amber-400" />
              <span>2. Outdoor Ignition &amp; Minimum Clearance Distances</span>
            </h2>
            <div className="p-3.5 rounded-2xl bg-rose-950/40 border border-rose-500/30 text-rose-200 text-xs">
              🚫 <strong>Strict Prohibition:</strong> NEVER light fireworks indoors, inside balconies, verandas, covered parking garages, or near parked motor vehicles, dry foliage, overhead power cables, or flammable liquids.
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
              <div className="p-4 rounded-2xl bg-slate-950 border border-slate-800 space-y-1 text-xs">
                <div className="text-amber-400 font-bold">Ground Fireworks &amp; Sparklers</div>
                <div className="text-white font-black text-sm">Minimum 5 Meters Distance</div>
                <p className="text-[11px] text-slate-400">
                  Flower pots (anars), ground wheels (chakkars), and pencil sparklers must be placed on flat, non-flammable concrete or hard ground.
                </p>
              </div>
              <div className="p-4 rounded-2xl bg-slate-950 border border-slate-800 space-y-1 text-xs">
                <div className="text-amber-400 font-bold">Aerial Sky Cakes &amp; Rockets</div>
                <div className="text-white font-black text-sm">Minimum 15 Meters Distance</div>
                <p className="text-[11px] text-slate-400">
                  Ensure clear vertical airspace without tree branches or balconies. Never lean over the top of an aerial tube while lighting the fuse.
                </p>
              </div>
            </div>
          </section>

          {/* Section 3: Handling Duds and Misfires */}
          <section className="p-6 rounded-3xl bg-slate-900/60 border border-slate-800 space-y-3">
            <h2 className="font-heading font-black text-lg text-white flex items-center gap-2">
              <AlertOctagon className="w-4 h-4 text-rose-400" />
              <span>3. What to Do with Misfires (&quot;Duds&quot;)</span>
            </h2>
            <p>
              If a firework fails to ignite or stops functioning after the fuse burns down:
            </p>
            <ol className="list-decimal list-inside space-y-1.5 pl-2 text-slate-300">
              <li><strong>DO NOT approach the firework immediately.</strong> Delayed internal smoldering can cause sudden explosion.</li>
              <li>Wait for a full <strong>15 minutes</strong> from a safe distance of at least 15 meters.</li>
              <li><strong>NEVER attempt to re-ignite a dud or misfired product.</strong></li>
              <li>Carefully douse the misfired item completely with a bucket of water to neutralize the chemical composition before disposal.</li>
            </ol>
          </section>

          {/* Section 4: Noise Regulations & Community Respect */}
          <section className="p-6 rounded-3xl bg-slate-900/60 border border-slate-800 space-y-3">
            <h2 className="font-heading font-black text-lg text-white flex items-center gap-2">
              <HeartHandshake className="w-4 h-4 text-emerald-400" />
              <span>4. Community Decibel Guidelines &amp; Pet Care</span>
            </h2>
            <ul className="list-disc list-inside space-y-2 pl-2 text-slate-300">
              <li>
                <strong>Respect Quiet Hours:</strong> Adhere to municipal and court guidelines regarding noise pollution. Refrain from igniting loud sound crackers between <strong>10:00 PM and 6:00 AM IST</strong>.
              </li>
              <li>
                <strong>Protect Pets &amp; Elderly Residents:</strong> Animals experience severe auditory distress during loud bursts. Keep pets indoors in quiet rooms with closed windows.
              </li>
              <li>
                <strong>Post-Celebration Cleanup:</strong> After fireworks have completely cooled, collect burnt residues and douse them with water before bagging them for municipal sanitation pickup.
              </li>
            </ul>
          </section>

          {/* Section 5: Emergency Contacts */}
          <section className="p-6 rounded-3xl bg-slate-900/60 border border-slate-800 space-y-3">
            <h2 className="font-heading font-black text-lg text-white flex items-center gap-2">
              <PhoneCall className="w-4 h-4 text-amber-400" />
              <span>5. Emergency Services &amp; Store Contact</span>
            </h2>
            <p>In case of any accidental injury or fire outbreak, act immediately:</p>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-1 text-center">
              <div className="p-3 rounded-xl bg-slate-950 border border-slate-800">
                <div className="text-[10px] text-slate-400 uppercase font-bold">Fire Emergency</div>
                <div className="text-base font-black text-rose-400 font-mono">101</div>
              </div>
              <div className="p-3 rounded-xl bg-slate-950 border border-slate-800">
                <div className="text-[10px] text-slate-400 uppercase font-bold">Medical Ambulance</div>
                <div className="text-base font-black text-emerald-400 font-mono">108</div>
              </div>
              <div className="p-3 rounded-xl bg-slate-950 border border-slate-800">
                <div className="text-[10px] text-slate-400 uppercase font-bold">Police Helpline</div>
                <div className="text-base font-black text-sky-400 font-mono">100</div>
              </div>
              <div className="p-3 rounded-xl bg-slate-950 border border-slate-800">
                <div className="text-[10px] text-slate-400 uppercase font-bold">Uniq Dispatch Help</div>
                <div className="text-xs font-black text-amber-400 font-mono truncate">{STORE_DEFAULTS.SUPPORT_PHONE}</div>
              </div>
            </div>
          </section>
        </div>
      </div>
    </div>
  );
}

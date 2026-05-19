"use client";

import React, { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { Play, Target, Sparkles, TrendingUp } from "lucide-react";

type CountryCardProposalProps = {
  country: string;
  flag: string;
  watched: number;
  total: number;
};

// --- Model 1: The Cinematic Glass (Closest to original, enhanced) ---
const ModelOne = ({ country, flag, watched, total }: CountryCardProposalProps) => {
  const percentage = Math.round((watched / total) * 100);
  
  return (
    <motion.div 
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="relative w-full max-w-sm rounded-[28px] overflow-hidden bg-black/40 backdrop-blur-xl border border-white/10 p-5 shadow-2xl group cursor-pointer"
    >
      {/* Subtle glow effect on hover */}
      <div className="absolute inset-0 bg-gradient-to-tr from-blue-500/0 via-transparent to-purple-500/0 group-hover:to-purple-500/10 transition-colors duration-500" />
      
      <div className="relative flex items-center gap-4 mb-5">
        <div className="flex-shrink-0 w-14 h-14 rounded-full bg-zinc-900/80 border border-white/5 flex items-center justify-center shadow-inner relative overflow-hidden group-hover:scale-105 transition-transform duration-300">
          <span className="text-2xl">{flag}</span>
          <div className="absolute inset-0 ring-1 ring-inset ring-white/10 rounded-full" />
        </div>
        
        <div className="flex-1 min-w-0">
          <h3 className="text-xl font-semibold text-white truncate tracking-tight">{country}</h3>
          <p className="text-zinc-400 text-sm font-medium mt-0.5">
            {watched} de {total} videos vistos
          </p>
        </div>
      </div>

      <div className="relative mb-5">
        <div className="flex items-center gap-3">
          <div className="h-2 flex-1 bg-zinc-800/80 rounded-full overflow-hidden shadow-inner">
            <motion.div 
              initial={{ width: 0 }}
              animate={{ width: `${percentage}%` }}
              transition={{ duration: 1, ease: "easeOut", delay: 0.2 }}
              className="h-full bg-gradient-to-r from-zinc-500 to-zinc-300 rounded-full"
            />
          </div>
          <span className="text-emerald-400 font-bold text-sm tracking-wider w-8 text-right">
            {percentage}%
          </span>
        </div>
      </div>

      <div className="text-center">
        <p className="text-zinc-500 text-sm font-medium group-hover:text-zinc-300 transition-colors duration-300">
          Vota para que el creador viaje.
        </p>
      </div>
    </motion.div>
  );
};

// --- Model 2: The Gamified Neon (Focus on action and energy) ---
const ModelTwo = ({ country, flag, watched, total }: CountryCardProposalProps) => {
  const percentage = Math.round((watched / total) * 100);
  const [isHovered, setIsHovered] = useState(false);
  
  return (
    <motion.div 
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      onHoverStart={() => setIsHovered(true)}
      onHoverEnd={() => setIsHovered(false)}
      className="relative w-full max-w-sm rounded-3xl bg-[#0F1115] border border-zinc-800 p-6 overflow-hidden"
      style={{
        boxShadow: isHovered ? "0 0 40px -10px rgba(16, 185, 129, 0.15)" : "none",
        transition: "box-shadow 0.3s ease"
      }}
    >
      {/* Decorative top accent */}
      <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-emerald-500/20 via-emerald-400 to-emerald-500/20" />

      <div className="flex justify-between items-start mb-6">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="text-xl">{flag}</span>
            <h3 className="text-lg font-bold text-white tracking-wide uppercase">{country}</h3>
          </div>
          <div className="flex items-center gap-1.5 text-xs font-semibold text-zinc-500 uppercase tracking-widest">
            <Target size={12} />
            <span>Misión de viaje</span>
          </div>
        </div>
        
        <div className="flex items-baseline gap-1 bg-emerald-500/10 px-3 py-1.5 rounded-xl border border-emerald-500/20">
          <span className="text-xl font-black text-emerald-400 leading-none">{percentage}</span>
          <span className="text-xs font-bold text-emerald-500 leading-none">%</span>
        </div>
      </div>

      <div className="space-y-2 mb-6">
        <div className="flex justify-between text-sm font-medium">
          <span className="text-zinc-400 flex items-center gap-1.5">
            <Play size={14} className="text-zinc-500" /> 
            Progreso actual
          </span>
          <span className="text-white font-bold">{watched} / {total} <span className="text-zinc-600 font-normal">vistas</span></span>
        </div>
        
        <div className="h-3 w-full bg-zinc-900 rounded-full overflow-hidden p-0.5 border border-zinc-800">
          <motion.div 
            initial={{ width: 0 }}
            animate={{ width: `${percentage}%` }}
            transition={{ duration: 1.5, type: "spring", stiffness: 50 }}
            className="h-full bg-emerald-500 rounded-full relative"
          >
            <div className="absolute inset-0 bg-[linear-gradient(90deg,transparent_0%,rgba(255,255,255,0.3)_50%,transparent_100%)] animate-[shimmer_2s_infinite]" />
          </motion.div>
        </div>
      </div>

      <button className="w-full relative overflow-hidden group bg-zinc-900 hover:bg-zinc-800 text-white font-semibold py-3.5 px-4 rounded-xl border border-zinc-800 transition-all duration-300 flex items-center justify-center gap-2">
        <Sparkles size={16} className="text-emerald-400 group-hover:scale-110 transition-transform" />
        <span className="relative z-10 group-hover:text-emerald-300 transition-colors">Votar por el destino</span>
      </button>
    </motion.div>
  );
};

// --- Model 3: The Spatial Minimal (Clean, typography-driven, Apple-like) ---
const ModelThree = ({ country, flag, watched, total }: CountryCardProposalProps) => {
  const percentage = Math.round((watched / total) * 100);
  
  return (
    <motion.div 
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="w-full max-w-sm rounded-[32px] bg-white dark:bg-[#1C1C1E] p-6 shadow-sm border border-zinc-200 dark:border-zinc-800/80 transition-all duration-300 hover:shadow-xl dark:hover:shadow-black/50"
    >
      <div className="flex flex-col items-center text-center mb-8 mt-2">
        <div className="text-5xl mb-4 drop-shadow-md">{flag}</div>
        <h3 className="text-2xl font-bold text-zinc-900 dark:text-white tracking-tight mb-1">{country}</h3>
        <p className="text-zinc-500 dark:text-zinc-400 font-medium text-sm">
          Faltan {total - watched} videos para desbloquear
        </p>
      </div>

      <div className="bg-zinc-50 dark:bg-[#2C2C2E] rounded-2xl p-4 mb-6">
        <div className="flex justify-between items-end mb-3">
          <div className="flex flex-col">
            <span className="text-xs font-semibold text-zinc-400 dark:text-zinc-500 uppercase tracking-wider mb-1">Completado</span>
            <span className="text-3xl font-bold text-zinc-900 dark:text-white leading-none">{percentage}%</span>
          </div>
          <div className="text-right">
            <span className="text-sm font-semibold text-zinc-900 dark:text-white">{watched}</span>
            <span className="text-sm text-zinc-400 dark:text-zinc-500"> / {total}</span>
          </div>
        </div>
        
        <div className="h-1.5 w-full bg-zinc-200 dark:bg-zinc-700/50 rounded-full overflow-hidden">
          <motion.div 
            initial={{ width: 0 }}
            animate={{ width: `${percentage}%` }}
            transition={{ duration: 1, ease: "circOut", delay: 0.1 }}
            className="h-full bg-blue-500 dark:bg-blue-500 rounded-full"
          />
        </div>
      </div>

      <button className="w-full flex items-center justify-between bg-zinc-100 hover:bg-zinc-200 dark:bg-[#2C2C2E] dark:hover:bg-zinc-700 text-zinc-900 dark:text-white font-semibold py-4 px-5 rounded-2xl transition-colors duration-200 group">
        <span>Votar para viajar</span>
        <div className="w-8 h-8 rounded-full bg-white dark:bg-zinc-600 flex items-center justify-center shadow-sm group-hover:scale-105 transition-transform">
          <TrendingUp size={16} className="text-blue-500 dark:text-blue-400" />
        </div>
      </button>
    </motion.div>
  );
};
// --- Model 4: The Micro-Pill (Ultra Compact) ---
const ModelFour = ({ country, flag, watched, total }: CountryCardProposalProps) => {
  const percentage = Math.round((watched / total) * 100);
  
  return (
    <motion.div 
      initial={{ opacity: 0, y: 15 }}
      animate={{ opacity: 1, y: 0 }}
      className="w-full max-w-sm bg-zinc-950/60 border border-zinc-900 rounded-full py-2 pl-3 pr-4 flex items-center justify-between gap-4 cursor-pointer hover:border-zinc-800 hover:bg-zinc-900/20 transition-all duration-300"
    >
      <div className="flex items-center gap-2 flex-1 min-w-0">
        <span className="text-lg flex-shrink-0 leading-none">{flag}</span>
        <span className="text-xs font-semibold text-zinc-300 truncate tracking-wide">{country}</span>
      </div>
      
      <div className="flex items-center gap-2 flex-shrink-0">
        <span className="text-[10px] font-mono text-zinc-500">
          {watched}/{total}
        </span>
        <div className="w-10 h-0.5 bg-zinc-900 rounded-full overflow-hidden">
          <div 
            className="h-full bg-zinc-600 rounded-full"
            style={{ width: `${percentage}%` }}
          />
        </div>
        <span className="text-[11px] font-mono font-bold text-zinc-400 w-8 text-right">
          {percentage}%
        </span>
      </div>
    </motion.div>
  );
};

// --- Model 5: The Swiss Editorial (Typographic & Raw) ---
const ModelFive = ({ country, flag, watched, total }: CountryCardProposalProps) => {
  const percentage = Math.round((watched / total) * 100);
  
  return (
    <motion.div 
      initial={{ opacity: 0, y: 15 }}
      animate={{ opacity: 1, y: 0 }}
      className="w-full max-w-sm bg-transparent border-t border-b border-zinc-900 py-3.5 flex flex-col gap-2.5 group cursor-pointer"
    >
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="text-base leading-none">{flag}</span>
          <span className="text-xs font-bold tracking-widest text-zinc-300 uppercase">{country}</span>
        </div>
        <span className="text-[10px] font-mono text-zinc-500 uppercase tracking-wider">{watched}/{total} vids</span>
      </div>

      <div className="h-[1px] w-full bg-zinc-950">
        <div 
          className="h-full bg-zinc-400 transition-all duration-500"
          style={{ width: `${percentage}%` }}
        />
      </div>

      <div className="flex justify-between items-center text-[10px] text-zinc-600">
        <span className="group-hover:text-zinc-400 transition-colors uppercase tracking-widest font-medium">Votar destino</span>
        <span className="font-mono text-zinc-400 font-bold">{percentage}%</span>
      </div>
    </motion.div>
  );
};

// --- Model 6: The Wireframe Dot (Minimalist Line Art) ---
const ModelSix = ({ country, flag, watched, total }: CountryCardProposalProps) => {
  const percentage = Math.round((watched / total) * 100);
  
  return (
    <motion.div 
      initial={{ opacity: 0, y: 15 }}
      animate={{ opacity: 1, y: 0 }}
      className="w-full max-w-sm bg-zinc-950/20 border border-zinc-900 rounded-xl p-3 flex flex-col gap-3 hover:border-zinc-800 transition-all duration-300 cursor-pointer"
    >
      <div className="flex items-center gap-2.5">
        <div className="w-7 h-7 rounded-lg bg-zinc-950 border border-zinc-900 flex items-center justify-center text-xs">
          {flag}
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex justify-between items-baseline mb-1">
            <h4 className="text-xs font-bold text-zinc-300 tracking-wide truncate uppercase">{country}</h4>
            <span className="text-[10px] font-mono font-bold text-zinc-500">{percentage}%</span>
          </div>
          <div className="w-full bg-zinc-900 h-[2px] rounded-full overflow-hidden">
            <div 
              className="bg-zinc-500 h-full transition-all duration-500"
              style={{ width: `${percentage}%` }}
            />
          </div>
        </div>
      </div>
      
      <div className="flex justify-between items-center text-[9px] text-zinc-600 uppercase tracking-widest pt-2 border-t border-zinc-950">
        <span>{watched} / {total} videos</span>
        <span className="text-[8px] font-bold px-1.5 py-0.5 rounded bg-zinc-950 text-zinc-400 border border-zinc-900 hover:text-white hover:border-zinc-800 transition-colors">Votar</span>
      </div>
    </motion.div>
  );
};

export default function ProposalsPage() {
  const [data, setData] = useState({
    country: "Venezuela",
    flag: "🇻🇪",
    watched: 0,
    total: 15
  });

  // Simulator for the progress
  useEffect(() => {
    const timer = setTimeout(() => {
      setData(prev => ({ ...prev, watched: 7 }));
    }, 1000);
    return () => clearTimeout(timer);
  }, []);

  return (
    <div className="min-h-screen bg-[#060608] text-white p-8 md:p-12 font-sans selection:bg-emerald-500/30">
      
      <div className="max-w-6xl mx-auto">
        <header className="mb-16 border-b border-white/5 pb-8">
          <div className="flex items-center gap-2.5 mb-2">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
            <span className="text-xs font-bold uppercase tracking-wider text-zinc-500">Creative Direction / Proposals</span>
          </div>
          <h1 className="text-3xl font-extrabold tracking-tight mb-2">Prototipos de Tarjetas</h1>
          <p className="text-zinc-400 text-sm">Explorando direcciones estéticas para el widget de progreso y votación.</p>
        </header>

        {/* Section 1: Visual-Heavy & Premium */}
        <section className="mb-20">
          <div className="mb-8">
            <h2 className="text-xs font-bold text-zinc-500 uppercase tracking-widest mb-1">Conceptos 01–03</h2>
            <h3 className="text-xl font-bold text-white">Modelos Premium y Visuales</h3>
          </div>
          
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-10 items-start">
            {/* Proposal 1 */}
            <div className="flex flex-col gap-5">
              <div>
                <span className="text-[10px] font-mono text-zinc-500 tracking-wider">Concepto 01 — Cinematic Glass</span>
                <p className="text-xs text-zinc-400 mt-1.5 leading-relaxed">
                  Basado en tu diseño original. Perfecciona el efecto de desenfoque de fondo y bordes delgados translúcidos para una integración perfecta en interfaces oscuras.
                </p>
              </div>
              <div className="flex justify-center p-8 bg-zinc-950/40 rounded-3xl border border-zinc-900/60 backdrop-blur-sm">
                <ModelOne {...data} />
              </div>
            </div>

            {/* Proposal 2 */}
            <div className="flex flex-col gap-5">
              <div>
                <span className="text-[10px] font-mono text-zinc-500 tracking-wider">Concepto 02 — Gamified Neon</span>
                <p className="text-xs text-zinc-400 mt-1.5 leading-relaxed">
                  Estilo dinámico y centrado en la acción. Incorpora destellos y gradientes neón que guían el ojo del usuario directamente hacia el llamado a la acción.
                </p>
              </div>
              <div className="flex justify-center p-8 bg-[#090A0C]/40 rounded-3xl border border-zinc-900/60 backdrop-blur-sm">
                <ModelTwo {...data} />
              </div>
            </div>

            {/* Proposal 3 */}
            <div className="flex flex-col gap-5">
              <div>
                <span className="text-[10px] font-mono text-zinc-500 tracking-wider">Concepto 03 — Spatial Bento</span>
                <p className="text-xs text-zinc-400 mt-1.5 leading-relaxed">
                  Inspirado en la simplicidad de Apple. Una disposición tipo Bento con gran jerarquía tipográfica, fondo claro/oscuro y bordes sumamente suaves.
                </p>
              </div>
              <div className="flex justify-center p-8 bg-[#0c0c0e]/40 rounded-3xl border border-zinc-900/60 backdrop-blur-sm">
                <ModelThree {...data} />
              </div>
            </div>
          </div>
        </section>

        {/* Section 2: Ultra-Minimalist */}
        <section className="mb-20 pt-16 border-t border-zinc-900">
          <div className="mb-8">
            <h2 className="text-xs font-bold text-zinc-500 uppercase tracking-widest mb-1">Conceptos 04–06</h2>
            <h3 className="text-xl font-bold text-white">Modelos Ultra-Minimalistas</h3>
          </div>
          
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-10 items-start">
            {/* Proposal 4 */}
            <div className="flex flex-col gap-5">
              <div>
                <span className="text-[10px] font-mono text-zinc-500 tracking-wider">Concepto 04 — The Micro-Pill</span>
                <p className="text-xs text-zinc-400 mt-1.5 leading-relaxed">
                  Diseño de píldora horizontal hipercompacto. Integra barra, bandera y progreso de manera compacta, perfecto para listados o componentes secundarios.
                </p>
              </div>
              <div className="flex justify-center p-8 bg-zinc-950/40 rounded-3xl border border-zinc-900/60 backdrop-blur-sm">
                <ModelFour {...data} />
              </div>
            </div>

            {/* Proposal 5 */}
            <div className="flex flex-col gap-5">
              <div>
                <span className="text-[10px] font-mono text-zinc-500 tracking-wider">Concepto 05 — Swiss Editorial</span>
                <p className="text-xs text-zinc-400 mt-1.5 leading-relaxed">
                  Basado puramente en tipografía estricta y líneas finas (estilo suizo). Elimina bordes curvos y tarjetas para lograr un aspecto editorial muy crudo y premium.
                </p>
              </div>
              <div className="flex justify-center p-8 bg-zinc-950/40 rounded-3xl border border-zinc-900/60 backdrop-blur-sm">
                <ModelFive {...data} />
              </div>
            </div>

            {/* Proposal 6 */}
            <div className="flex flex-col gap-5">
              <div>
                <span className="text-[10px] font-mono text-zinc-500 tracking-wider">Concepto 06 — Wireframe Dot</span>
                <p className="text-xs text-zinc-400 mt-1.5 leading-relaxed">
                  Estructura alámbrica con bordes definidos pero fondo transparente. Balance perfecto entre diseño funcional, modernidad y simplicidad absoluta.
                </p>
              </div>
              <div className="flex justify-center p-8 bg-zinc-950/40 rounded-3xl border border-zinc-900/60 backdrop-blur-sm">
                <ModelSix {...data} />
              </div>
            </div>
          </div>
        </section>
        
        {/* Interactive Controls */}
        <div className="mt-20 p-6 bg-zinc-900/20 rounded-2xl border border-zinc-900 max-w-xl mx-auto backdrop-blur-sm">
          <h3 className="text-xs font-semibold text-zinc-400 uppercase tracking-wider mb-4 flex items-center justify-center gap-2">
            <Target size={14} className="text-zinc-500" /> Panel de Simulación
          </h3>
          <div className="flex items-center justify-center gap-4">
            <button 
              onClick={() => setData(prev => ({ ...prev, watched: Math.max(0, prev.watched - 1) }))}
              className="px-4 py-2 rounded-lg bg-zinc-950 border border-zinc-900 hover:border-zinc-800 text-zinc-300 font-medium text-xs tracking-wide transition-colors"
            >
              - Quitar Vistas
            </button>
            <div className="text-lg font-bold font-mono w-16 text-center text-zinc-300">{data.watched} / {data.total}</div>
            <button 
              onClick={() => setData(prev => ({ ...prev, watched: Math.min(prev.total, prev.watched + 1) }))}
              className="px-4 py-2 rounded-lg bg-zinc-950 border border-zinc-900 hover:border-zinc-800 text-zinc-300 font-medium text-xs tracking-wide transition-colors"
            >
              + Agregar Vistas
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

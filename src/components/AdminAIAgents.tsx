import React from 'react';
import { Bot, Sparkles, CheckCircle2, Shield, Users, Lock, Zap, ArrowRight, BarChart3, Database } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

interface AIAgentMeta {
  id: string;
  name: string;
  model: string;
  role: string;
  description: string;
  status: 'Active' | 'Planned';
  capabilities: string[];
}

const activeAgents: AIAgentMeta[] = [
  {
    id: 'seo-marketing',
    name: 'SEO Marketing Agent',
    model: 'Gemini 2.5 Flash',
    role: 'Automated Meta & OpenGraph Generator',
    description: 'Generates SEO-optimized titles, meta descriptions, focus keywords, and schema markup for products.',
    status: 'Active',
    capabilities: ['Meta Tag Optimization', 'Keyword Extraction', 'Schema Generation']
  },
  {
    id: 'kbeauty-consultant',
    name: 'WhatsApp K-Beauty Consultant',
    model: 'Gemini 2.5 Flash',
    role: 'Conversational Skin Assistant',
    description: 'Provides personalized Korean skincare recommendations in Bangla and English via WhatsApp.',
    status: 'Active',
    capabilities: ['Skin Type Analysis', 'Routine Builder', 'Bilingual Chat']
  },
  {
    id: 'barcode-identifier',
    name: 'Barcode & Product Agent',
    model: 'Gemini 2.5 Flash + ZXing',
    role: 'Catalog & Scanner Intelligence',
    description: 'Identifies Korean cosmetics from barcodes, EAN numbers, and catalog product lookups.',
    status: 'Active',
    capabilities: ['EAN/UPC Normalization', 'Duplicate Detection', 'Catalog Matching']
  },
  {
    id: 'product-vision',
    name: 'Product Vision & Image Agent',
    model: 'Gemini 2.5 Flash Vision',
    role: 'Visual Skin Product Analyzer',
    description: 'Extracts product names, Korean text, key ingredients, and usage instructions directly from product images.',
    status: 'Active',
    capabilities: ['OCR Text Extraction', 'Ingredient Analysis', 'Visual Classification']
  },
  {
    id: 'skincare-search',
    name: 'AI Skincare Search Agent',
    model: 'Gemini 2.5 Flash',
    role: 'Semantic & Concern Matcher',
    description: 'Powers natural language search for skincare concerns (e.g. "redness calyx, acne sensitive skin").',
    status: 'Active',
    capabilities: ['Concern Matching', 'Ingredient Filtering', 'Semantic Search']
  },
  {
    id: 'bangla-localization',
    name: 'Bangla Translation Agent',
    model: 'Gemini 2.5 Flash',
    role: 'Local Language Specialist',
    description: 'Translates skincare product benefits, ingredients, and instructions into natural conversational Bangla.',
    status: 'Active',
    capabilities: ['Bangla Translation', 'Cultural Contextualization', 'Beauty Terminology']
  },
  {
    id: 'pricing-advisor',
    name: 'Pricing & Inventory Advisor',
    model: 'Gemini 2.5 Flash',
    role: 'Margin & Stock Optimization',
    description: 'Analyzes inventory levels, profit margins, and competitor positioning to suggest optimal retail prices.',
    status: 'Active',
    capabilities: ['Margin Optimization', 'Stock Velocity Analysis', 'Price Recommendations']
  }
];

export const AdminAIAgents: React.FC = () => {
  const navigate = useNavigate();

  return (
    <div className="space-y-6 pb-12">
      {/* Header Banner */}
      <section className="relative overflow-hidden rounded-[28px] border border-pink-100 bg-gradient-to-br from-slate-900 via-slate-950 to-pink-950 p-6 text-white shadow-lg">
        <div className="absolute -right-16 -top-16 h-64 w-64 rounded-full bg-pink-500/20 blur-3xl" />
        <div className="relative flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <div className="mb-2 flex items-center gap-2 text-[10px] font-black uppercase tracking-[0.18em] text-pink-400">
              <Sparkles size={14} /> KSF BD Admin · AI Agent Hub
            </div>
            <h1 className="text-2xl font-black tracking-tight sm:text-3xl">AI Agent Workforce Manager</h1>
            <p className="mt-1 max-w-xl text-xs text-slate-300 leading-relaxed">
              Overview of all active Gemini 2.5 Flash AI agents powering catalog intelligence, SEO, multi-lingual search, and customer consultations.
            </p>
          </div>
          <div className="flex items-center gap-2">
            <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-500/20 px-3 py-1.5 text-xs font-bold text-emerald-300 border border-emerald-500/30">
              <span className="h-2 w-2 rounded-full bg-emerald-400 animate-pulse" /> 7 Active Agents
            </span>
          </div>
        </div>
      </section>

      {/* Active System Agents Grid */}
      <section className="space-y-3">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-base font-black text-slate-900">Active AI Agents in Production</h2>
            <p className="text-xs text-slate-500">Integrated Gemini-powered intelligent modules</p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {activeAgents.map((agent) => (
            <div key={agent.id} className="rounded-2xl border border-pink-100 bg-white p-5 shadow-sm space-y-3 flex flex-col justify-between hover:border-pink-200 transition">
              <div>
                <div className="flex items-start justify-between gap-2 mb-2">
                  <div className="flex items-center gap-2">
                    <div className="p-2 rounded-xl bg-pink-50 text-[#E91E8C]">
                      <Bot size={18} />
                    </div>
                    <div>
                      <h3 className="text-sm font-extrabold text-slate-900">{agent.name}</h3>
                      <span className="text-[10px] font-mono text-pink-600 font-bold">{agent.model}</span>
                    </div>
                  </div>
                  <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2.5 py-0.5 text-[9px] font-black text-emerald-700 uppercase tracking-wider border border-emerald-100">
                    <CheckCircle2 size={10} /> Active
                  </span>
                </div>

                <p className="text-xs text-slate-600 leading-relaxed mb-3">{agent.description}</p>

                <div className="flex flex-wrap gap-1">
                  {agent.capabilities.map((cap) => (
                    <span key={cap} className="text-[9px] font-extrabold bg-slate-100 text-slate-600 px-2 py-0.5 rounded-md">
                      {cap}
                    </span>
                  ))}
                </div>
              </div>

              <div className="pt-3 border-t border-slate-100 flex items-center justify-between text-[11px] text-slate-500 font-medium">
                <span>Role: {agent.role}</span>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Architecture Architecture Expansion Card */}
      <section className="rounded-2xl border border-dashed border-pink-200 bg-gradient-to-r from-pink-50/50 to-purple-50/50 p-6 space-y-4">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-2xl bg-white text-[#E91E8C] shadow-sm border border-pink-100">
              <Shield size={22} />
            </div>
            <div>
              <h3 className="text-sm font-extrabold text-slate-900">User-Agent Permissions & Quota Management</h3>
              <p className="text-xs text-slate-500">Upcoming feature layer to assign specific AI agents to staff roles with per-agent usage tracking.</p>
            </div>
          </div>
          <span className="inline-flex items-center gap-1 rounded-full bg-amber-100 px-3 py-1 text-[10px] font-black uppercase text-amber-800 tracking-wider">
            Planned Architecture
          </span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-2">
          <div className="bg-white/80 p-3.5 rounded-xl border border-pink-100/60 text-xs space-y-1">
            <div className="flex items-center gap-1.5 font-bold text-slate-800">
              <Users size={14} className="text-pink-600" />
              <span>Role-Based Assignments</span>
            </div>
            <p className="text-[11px] text-slate-500">Assign agents to Super Admins, Product Managers, or Support Staff.</p>
          </div>

          <div className="bg-white/80 p-3.5 rounded-xl border border-pink-100/60 text-xs space-y-1">
            <div className="flex items-center gap-1.5 font-bold text-slate-800">
              <Zap size={14} className="text-pink-600" />
              <span>Usage Limits & Quotas</span>
            </div>
            <p className="text-[11px] text-slate-500">Set daily token or API invocation limits per agent and user.</p>
          </div>

          <div className="bg-white/80 p-3.5 rounded-xl border border-pink-100/60 text-xs space-y-1">
            <div className="flex items-center gap-1.5 font-bold text-slate-800">
              <Database size={14} className="text-pink-600" />
              <span>Agent Run History</span>
            </div>
            <p className="text-[11px] text-slate-500">Audit AI execution logs, prompt costs, and execution times.</p>
          </div>
        </div>
      </section>
    </div>
  );
};

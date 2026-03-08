import { useNavigate } from 'react-router-dom';
import { Shield, Lock, Camera, Eye, BarChart3, FileText, ArrowRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { motion } from 'framer-motion';

const LandingPage = () => {
  const navigate = useNavigate();

  const features = [
    { icon: Lock, title: 'Locked Exam Environment', desc: 'Fullscreen mode with disabled copy, paste, right-click, and DevTools detection.' },
    { icon: Eye, title: 'Tab & Visibility Monitoring', desc: 'Real-time tracking of tab switches, window blur events, and time spent outside.' },
    { icon: Camera, title: 'AI Camera Proctoring', desc: 'Face detection with face-api.js — detects no face, multiple faces, and off-center positioning.' },
    { icon: BarChart3, title: 'Credibility Scoring', desc: 'Automated 0–100 credibility score with risk classification and detailed violation logs.' },
    { icon: FileText, title: 'PDF Reports', desc: 'Export credibility certificates and detailed violation timelines as professional PDFs.' },
    { icon: Shield, title: 'Admin Dashboard', desc: 'Full oversight with proctoring snapshots, violation logs, and risk-level filtering.' },
  ];

  return (
    <div className="min-h-screen security-grid relative overflow-hidden">
      {/* Background effects */}
      <div className="absolute inset-0 bg-gradient-to-b from-background via-background to-secondary/10" />
      <div className="absolute top-20 left-1/2 -translate-x-1/2 w-[600px] h-[600px] bg-primary/5 rounded-full blur-3xl" />

      {/* Header */}
      <header className="relative z-10 border-b border-border/50 bg-card/40 backdrop-blur-xl">
        <div className="container mx-auto flex items-center justify-between px-6 py-4">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg gradient-primary glow-primary">
              <Shield className="w-5 h-5 text-primary-foreground" />
            </div>
            <span className="font-bold text-lg text-foreground">Exam Guardrail</span>
          </div>
          <Button onClick={() => navigate('/auth')} className="gradient-primary text-primary-foreground">
            Get Started <ArrowRight className="w-4 h-4 ml-2" />
          </Button>
        </div>
      </header>

      {/* Hero */}
      <section className="relative z-10 container mx-auto px-6 pt-20 pb-16 text-center">
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.7 }}>
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-primary/10 border border-primary/20 text-primary text-sm font-mono mb-6">
            <Shield className="w-4 h-4" />
            INTEGRITY-FIRST ARCHITECTURE
          </div>
          <h1 className="text-5xl md:text-7xl font-black text-foreground mb-6 leading-tight">
            Exam Guardrail<br />
            <span className="text-gradient-primary">System</span>
          </h1>
          <p className="text-xl text-muted-foreground max-w-2xl mx-auto mb-8">
            The most secure online exam platform with AI proctoring, real-time violation monitoring, and automated credibility scoring.
          </p>
          <div className="flex gap-4 justify-center">
            <Button onClick={() => navigate('/auth')} size="lg" className="gradient-primary text-primary-foreground glow-primary text-lg px-8 h-14">
              Start Now <ArrowRight className="w-5 h-5 ml-2" />
            </Button>
          </div>
        </motion.div>
      </section>

      {/* Features */}
      <section className="relative z-10 container mx-auto px-6 pb-20">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {features.map((feature, i) => (
            <motion.div
              key={i}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 + i * 0.1 }}
              className="glass-card p-6 hover:glow-primary transition-shadow group"
            >
              <div className="p-3 rounded-xl bg-primary/10 w-fit mb-4 group-hover:bg-primary/20 transition-colors">
                <feature.icon className="w-6 h-6 text-primary" />
              </div>
              <h3 className="text-lg font-semibold text-foreground mb-2">{feature.title}</h3>
              <p className="text-sm text-muted-foreground">{feature.desc}</p>
            </motion.div>
          ))}
        </div>
      </section>

      {/* Footer */}
      <footer className="relative z-10 border-t border-border/50 py-8 text-center">
        <p className="text-sm text-muted-foreground">
          © 2026 Exam Guardrail System — Integrity-First Architecture
        </p>
      </footer>
    </div>
  );
};

export default LandingPage;

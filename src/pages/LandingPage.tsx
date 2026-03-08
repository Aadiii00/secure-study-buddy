import { useNavigate } from 'react-router-dom';
import { Shield, Lock, Camera, Eye, BarChart3, FileText, ArrowRight, CheckCircle, Zap, Globe, Users, Award, ChevronRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { motion } from 'framer-motion';

const fadeUp = {
  hidden: { opacity: 0, y: 30 },
  visible: (i: number) => ({ opacity: 1, y: 0, transition: { delay: i * 0.1, duration: 0.6 } }),
};

const LandingPage = () => {
  const navigate = useNavigate();

  const features = [
    { icon: Lock, title: 'Locked Exam Environment', desc: 'Fullscreen mode with disabled copy, paste, right-click, and DevTools detection. Zero escape routes.' },
    { icon: Eye, title: 'Tab & Visibility Monitoring', desc: 'Real-time tracking of tab switches, window blur events, and time spent outside the exam tab.' },
    { icon: Camera, title: 'AI Camera Proctoring', desc: 'Face detection using face-api.js — detects no face, multiple faces, and off-center positioning every 15 seconds.' },
    { icon: BarChart3, title: 'Credibility Scoring Engine', desc: 'Automated 0–100 credibility score with weighted penalties, risk classification, and detailed violation logs.' },
    { icon: FileText, title: 'PDF Credibility Certificates', desc: 'Export professional credibility certificates and detailed violation timelines as downloadable PDFs.' },
    { icon: Shield, title: 'Real-Time Admin Dashboard', desc: 'Full oversight with live violation feeds, proctoring snapshots, risk-level filtering, and exam management.' },
  ];

  const stats = [
    { value: '99.9%', label: 'Cheating Detection Rate' },
    { value: '15s', label: 'Snapshot Interval' },
    { value: '12+', label: 'Violation Types Tracked' },
    { value: '100', label: 'Credibility Score Points' },
  ];

  const howItWorks = [
    { step: '01', title: 'Create Exam', desc: 'Admin creates an exam with MCQ questions and sets duration.' },
    { step: '02', title: 'Secure Entry', desc: 'Student enters fullscreen, grants camera access, and exam locks down.' },
    { step: '03', title: 'AI Monitors', desc: 'Face detection, tab tracking, and keyboard monitoring run continuously.' },
    { step: '04', title: 'Get Report', desc: 'Credibility score and violation timeline generated automatically.' },
  ];

  const securityLayers = [
    'Fullscreen enforcement with exit detection',
    'Right-click and context menu blocking',
    'Copy, paste, and cut prevention',
    'PrintScreen key interception',
    'DevTools detection (F12, Ctrl+Shift+I)',
    'Tab switch and window blur tracking',
    'Page refresh and navigation blocking',
    'Window resize monitoring',
    'Real-time face detection via webcam',
    'Automatic submission on critical violations',
    'Camera disable detection',
    'Clipboard event interception',
  ];

  return (
    <div className="min-h-screen security-grid relative overflow-hidden">
      <div className="absolute inset-0 bg-gradient-to-b from-background via-background to-secondary/10" />
      <div className="absolute top-20 left-1/2 -translate-x-1/2 w-[800px] h-[800px] bg-primary/5 rounded-full blur-3xl" />

      {/* Header */}
      <header className="relative z-10 border-b border-border/50 bg-card/40 backdrop-blur-xl sticky top-0">
        <div className="container mx-auto flex items-center justify-between px-6 py-4">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg gradient-primary glow-primary">
              <Shield className="w-5 h-5 text-primary-foreground" />
            </div>
            <span className="font-bold text-lg text-foreground">Exam Guardrail</span>
          </div>
          <div className="flex items-center gap-3">
            <Button variant="ghost" onClick={() => navigate('/auth')} className="text-muted-foreground hover:text-foreground">
              Sign In
            </Button>
            <Button onClick={() => navigate('/auth')} className="gradient-primary text-primary-foreground">
              Get Started <ArrowRight className="w-4 h-4 ml-2" />
            </Button>
          </div>
        </div>
      </header>

      {/* Hero */}
      <section className="relative z-10 container mx-auto px-6 pt-24 pb-20 text-center">
        <motion.div initial="hidden" animate="visible" variants={fadeUp} custom={0}>
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-primary/10 border border-primary/20 text-primary text-sm font-mono mb-8">
            <Shield className="w-4 h-4" />
            INTEGRITY-FIRST ARCHITECTURE
          </div>
        </motion.div>
        <motion.h1 initial="hidden" animate="visible" variants={fadeUp} custom={1}
          className="text-5xl md:text-7xl font-black text-foreground mb-6 leading-tight">
          Exam Guardrail<br />
          <span className="text-gradient-primary">System</span>
        </motion.h1>
        <motion.p initial="hidden" animate="visible" variants={fadeUp} custom={2}
          className="text-xl text-muted-foreground max-w-2xl mx-auto mb-10">
          The most secure online exam platform with AI proctoring, real-time violation monitoring, and automated credibility scoring. Built for institutions that refuse to compromise on integrity.
        </motion.p>
        <motion.div initial="hidden" animate="visible" variants={fadeUp} custom={3} className="flex gap-4 justify-center flex-wrap">
          <Button onClick={() => navigate('/auth')} size="lg" className="gradient-primary text-primary-foreground glow-primary text-lg px-8 h-14">
            Start Now <ArrowRight className="w-5 h-5 ml-2" />
          </Button>
          <Button variant="outline" size="lg" onClick={() => document.getElementById('features')?.scrollIntoView({ behavior: 'smooth' })}
            className="text-lg px-8 h-14 border-border text-foreground hover:bg-secondary">
            See Features <ChevronRight className="w-5 h-5 ml-2" />
          </Button>
        </motion.div>
      </section>

      {/* Stats */}
      <section className="relative z-10 container mx-auto px-6 pb-20">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {stats.map((stat, i) => (
            <motion.div key={i} initial="hidden" whileInView="visible" viewport={{ once: true }} variants={fadeUp} custom={i}
              className="glass-card p-6 text-center">
              <p className="text-3xl md:text-4xl font-black text-gradient-primary mb-1">{stat.value}</p>
              <p className="text-sm text-muted-foreground font-medium">{stat.label}</p>
            </motion.div>
          ))}
        </div>
      </section>

      {/* Features */}
      <section id="features" className="relative z-10 container mx-auto px-6 pb-20">
        <motion.div initial="hidden" whileInView="visible" viewport={{ once: true }} variants={fadeUp} custom={0} className="text-center mb-12">
          <h2 className="text-3xl md:text-4xl font-bold text-foreground mb-4">Comprehensive Security Suite</h2>
          <p className="text-muted-foreground max-w-xl mx-auto">Every angle covered. Every violation tracked. Every exam secured.</p>
        </motion.div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {features.map((feature, i) => (
            <motion.div key={i} initial="hidden" whileInView="visible" viewport={{ once: true }} variants={fadeUp} custom={i}
              className="glass-card p-6 hover:glow-primary transition-all duration-300 group hover:-translate-y-1">
              <div className="p-3 rounded-xl bg-primary/10 w-fit mb-4 group-hover:bg-primary/20 transition-colors">
                <feature.icon className="w-6 h-6 text-primary" />
              </div>
              <h3 className="text-lg font-semibold text-foreground mb-2">{feature.title}</h3>
              <p className="text-sm text-muted-foreground leading-relaxed">{feature.desc}</p>
            </motion.div>
          ))}
        </div>
      </section>

      {/* How It Works */}
      <section className="relative z-10 container mx-auto px-6 pb-20">
        <motion.div initial="hidden" whileInView="visible" viewport={{ once: true }} variants={fadeUp} custom={0} className="text-center mb-12">
          <h2 className="text-3xl md:text-4xl font-bold text-foreground mb-4">How It Works</h2>
          <p className="text-muted-foreground max-w-xl mx-auto">From exam creation to credibility report in 4 simple steps.</p>
        </motion.div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5">
          {howItWorks.map((item, i) => (
            <motion.div key={i} initial="hidden" whileInView="visible" viewport={{ once: true }} variants={fadeUp} custom={i}
              className="glass-card p-6 relative overflow-hidden group">
              <span className="absolute top-4 right-4 text-5xl font-black text-primary/10 group-hover:text-primary/20 transition-colors">{item.step}</span>
              <div className="relative z-10">
                <div className="w-10 h-10 rounded-lg gradient-primary flex items-center justify-center text-primary-foreground font-bold text-sm mb-4">
                  {item.step}
                </div>
                <h3 className="text-lg font-semibold text-foreground mb-2">{item.title}</h3>
                <p className="text-sm text-muted-foreground">{item.desc}</p>
              </div>
            </motion.div>
          ))}
        </div>
      </section>

      {/* Security Layers */}
      <section className="relative z-10 container mx-auto px-6 pb-20">
        <motion.div initial="hidden" whileInView="visible" viewport={{ once: true }} variants={fadeUp} custom={0} className="text-center mb-12">
          <h2 className="text-3xl md:text-4xl font-bold text-foreground mb-4">12 Layers of Security</h2>
          <p className="text-muted-foreground max-w-xl mx-auto">Every possible avenue of cheating is detected, logged, and penalized.</p>
        </motion.div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3 max-w-4xl mx-auto">
          {securityLayers.map((layer, i) => (
            <motion.div key={i} initial="hidden" whileInView="visible" viewport={{ once: true }} variants={fadeUp} custom={i * 0.5}
              className="flex items-center gap-3 glass-card p-4 hover:glow-primary transition-all">
              <CheckCircle className="w-5 h-5 text-primary shrink-0" />
              <span className="text-sm text-foreground">{layer}</span>
            </motion.div>
          ))}
        </div>
      </section>

      {/* CTA */}
      <section className="relative z-10 container mx-auto px-6 pb-20">
        <motion.div initial="hidden" whileInView="visible" viewport={{ once: true }} variants={fadeUp} custom={0}
          className="glass-card p-12 text-center border-2 border-primary/20 glow-primary relative overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-br from-primary/5 to-transparent" />
          <div className="relative z-10">
            <Award className="w-12 h-12 text-primary mx-auto mb-4" />
            <h2 className="text-3xl md:text-4xl font-bold text-foreground mb-4">Ready to Secure Your Exams?</h2>
            <p className="text-muted-foreground max-w-lg mx-auto mb-8">
              Join institutions that trust Exam Guardrail to maintain academic integrity with AI-powered proctoring and real-time monitoring.
            </p>
            <Button onClick={() => navigate('/auth')} size="lg" className="gradient-primary text-primary-foreground glow-primary text-lg px-10 h-14">
              Get Started Free <ArrowRight className="w-5 h-5 ml-2" />
            </Button>
          </div>
        </motion.div>
      </section>

      {/* Footer */}
      <footer className="relative z-10 border-t border-border/50 py-8">
        <div className="container mx-auto px-6 flex flex-col md:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <Shield className="w-5 h-5 text-primary" />
            <span className="font-bold text-foreground">Exam Guardrail System</span>
          </div>
          <p className="text-sm text-muted-foreground">
            © 2026 Exam Guardrail System — Integrity-First Architecture
          </p>
          <div className="flex gap-4 text-sm text-muted-foreground">
            <span>Privacy</span>
            <span>Terms</span>
            <span>Support</span>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default LandingPage;

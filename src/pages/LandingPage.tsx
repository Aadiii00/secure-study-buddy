import { useNavigate } from 'react-router-dom';
import { Shield, ArrowRight, Lock, Eye, Brain, BarChart3, FileText, Monitor, Camera, Fingerprint, Globe, Zap, CheckCircle2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { motion } from 'framer-motion';

const LandingPage = () => {
  const navigate = useNavigate();

  const features = [
  { icon: Lock, title: 'Locked Environment', desc: 'Fullscreen lockdown with disabled copy, paste, right-click, and DevTools. No cheating loopholes.' },
  { icon: Eye, title: 'Tab Monitoring', desc: 'Real-time tracking of tab switches and window blur events with timestamped logs.' },
  { icon: Camera, title: 'AI Proctoring', desc: 'Face detection every 15 seconds — no face, multiple faces, and off-center alerts using face-api.js.' },
  { icon: BarChart3, title: 'Credibility Score', desc: 'Automated 0–100 score with weighted penalties and risk classification (low, medium, high).' },
  { icon: FileText, title: 'PDF Reports', desc: 'Exportable credibility certificates and violation timelines with screenshot evidence.' },
  { icon: Monitor, title: 'Admin Dashboard', desc: 'Live violation feeds, snapshots, risk filtering, charts, and full exam management.' }];


  const highlights = [
  { icon: Brain, title: 'AI Face Detection', desc: 'TinyFaceDetector model with 5-second grace period to prevent false positives.' },
  { icon: Fingerprint, title: 'Evidence Capture', desc: 'Automatic webcam screenshots on violations, stored as Base64 with metadata.' },
  { icon: Globe, title: 'Browser Lockdown', desc: 'Keyboard shortcuts, print screen, drag-drop, and clipboard all blocked during exams.' },
  { icon: Zap, title: 'Real-time Alerts', desc: 'Instant violation warnings with auto-submission after excessive infractions.' }];


  const steps = [
  { step: '01', title: 'Create an Exam', desc: 'Set up questions, duration, and activate your exam from the admin dashboard.' },
  { step: '02', title: 'Students Join', desc: 'Students sign in, grant camera access, and enter the secure exam environment.' },
  { step: '03', title: 'AI Monitors', desc: 'Face detection, tab tracking, and behavior analysis run throughout the exam.' },
  { step: '04', title: 'Get Results', desc: 'View scores, credibility reports, violation timelines, and export PDF certificates.' }];


  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b border-border sticky top-0 bg-background/90 backdrop-blur-md z-50">
        <div className="max-w-6xl mx-auto flex items-center justify-between px-6 h-14">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded bg-foreground flex items-center justify-center">
              <Shield className="w-4 h-4 text-background" />
            </div>
            <span className="font-semibold text-foreground">Tracxn<span className="text-red-500">Labs</span></span>
          </div>
          <nav className="hidden md:flex items-center gap-6 text-sm text-muted-foreground">
            <button onClick={() => document.getElementById('features')?.scrollIntoView({ behavior: 'smooth' })} className="hover:text-foreground transition-colors">Features</button>
            <button onClick={() => document.getElementById('how-it-works')?.scrollIntoView({ behavior: 'smooth' })} className="hover:text-foreground transition-colors">How It Works</button>
            <button onClick={() => document.getElementById('highlights')?.scrollIntoView({ behavior: 'smooth' })} className="hover:text-foreground transition-colors">Technology</button>
          </nav>
          <div className="flex items-center gap-2">
            <Button variant="ghost" size="sm" onClick={() => navigate('/auth')}>Sign In</Button>
            <Button size="sm" onClick={() => navigate('/auth')}>
              Sign Up <ArrowRight className="w-3.5 h-3.5 ml-1" />
            </Button>
          </div>
        </div>
      </header>

      {/* Hero */}
      <section className="max-w-6xl mx-auto px-6 pt-20 pb-24">
        <div className="max-w-2xl">
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }}>
            <span className="inline-block text-xs font-medium px-3 py-1 rounded-full border border-border text-muted-foreground mb-6">
              AI-Powered Exam Proctoring
            </span>
            <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold text-foreground leading-[1.1] tracking-tight mb-5">
              Secure online exams,<br />done right.
            </h1>
            <p className="text-lg text-muted-foreground mb-8 max-w-lg leading-relaxed">
              Real-time face detection, browser lockdown, and automated credibility scoring for institutions that value academic integrity.
            </p>
            <div className="flex flex-wrap gap-3">
              <Button onClick={() => navigate('/auth')} size="lg">
                Get Started Free <ArrowRight className="w-4 h-4 ml-1.5" />
              </Button>
              <Button variant="outline" size="lg" onClick={() => document.getElementById('features')?.scrollIntoView({ behavior: 'smooth' })}>
                See Features
              </Button>
            </div>
          </motion.div>
        </div>

        {/* Stats */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.2 }}
          className="grid grid-cols-3 gap-6 mt-16 max-w-lg">
          
          {[
          { value: '15s', label: 'Detection interval' },
          { value: '0–100', label: 'Credibility score' },
          { value: '6+', label: 'Violation types' }].
          map((stat, i) =>
          <div key={i}>
              <div className="text-2xl font-bold text-foreground">{stat.value}</div>
              <div className="text-xs text-muted-foreground mt-0.5">{stat.label}</div>
            </div>
          )}
        </motion.div>
      </section>

      {/* Features Grid */}
      <section id="features" className="border-t border-border bg-card">
        <div className="max-w-6xl mx-auto px-6 py-20">
          <div className="mb-12">
            <h2 className="text-2xl font-bold text-foreground mb-2">Everything you need</h2>
            <p className="text-muted-foreground">A complete proctoring system built into every exam.</p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            {features.map((feature, i) =>
            <motion.div
              key={i}
              initial={{ opacity: 0, y: 15 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.3, delay: i * 0.05 }}
              className="border border-border rounded-lg p-5 bg-background hover:border-foreground/20 transition-colors">
              
                <feature.icon className="w-5 h-5 text-foreground mb-3" />
                <h3 className="font-semibold text-foreground text-sm mb-1.5">{feature.title}</h3>
                <p className="text-sm text-muted-foreground leading-relaxed">{feature.desc}</p>
              </motion.div>
            )}
          </div>
        </div>
      </section>

      {/* How It Works */}
      <section id="how-it-works" className="border-t border-border">
        <div className="max-w-6xl mx-auto px-6 py-20">
          <div className="mb-12">
            <h2 className="text-2xl font-bold text-foreground mb-2">How it works</h2>
            <p className="text-muted-foreground">Four simple steps from exam creation to results.</p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {steps.map((item, i) =>
            <motion.div
              key={i}
              initial={{ opacity: 0, y: 15 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.3, delay: i * 0.08 }}>
              
                <span className="text-3xl font-bold text-border">{item.step}</span>
                <h3 className="font-semibold text-foreground mt-2 mb-1">{item.title}</h3>
                <p className="text-sm text-muted-foreground leading-relaxed">{item.desc}</p>
              </motion.div>
            )}
          </div>
        </div>
      </section>

      {/* Technology Highlights */}
      <section id="highlights" className="border-t border-border bg-card">
        <div className="max-w-6xl mx-auto px-6 py-20">
          <div className="mb-12">
            <h2 className="text-2xl font-bold text-foreground mb-2">Under the hood</h2>
            <p className="text-muted-foreground">Built with modern technology for reliability and speed.</p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            {highlights.map((item, i) =>
            <motion.div
              key={i}
              initial={{ opacity: 0, y: 15 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.3, delay: i * 0.05 }}
              className="flex gap-4 border border-border rounded-lg p-5 bg-background">
              
                <div className="w-10 h-10 rounded-lg bg-muted flex items-center justify-center flex-shrink-0">
                  <item.icon className="w-5 h-5 text-foreground" />
                </div>
                <div>
                  <h3 className="font-semibold text-foreground text-sm mb-1">{item.title}</h3>
                  <p className="text-sm text-muted-foreground leading-relaxed">{item.desc}</p>
                </div>
              </motion.div>
            )}
          </div>
        </div>
      </section>

      {/* Checklist CTA */}
      <section className="border-t border-border">
        <div className="max-w-6xl mx-auto px-6 py-20">
          <div className="max-w-xl mx-auto text-center">
            <h2 className="text-2xl font-bold text-foreground mb-3">Ready to secure your exams?</h2>
            <p className="text-muted-foreground mb-6">Join institutions using ExamGuard for integrity-first assessments.</p>
            <div className="flex flex-col items-start gap-2 mb-8 mx-auto w-fit text-sm text-muted-foreground">
              {['No credit card required', 'Free to get started', 'Full proctoring included'].map((item, i) =>
              <div key={i} className="flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-success" />
                  <span>{item}</span>
                </div>
              )}
            </div>
            <Button onClick={() => navigate('/auth')} size="lg">
              Create Your First Exam <ArrowRight className="w-4 h-4 ml-1.5" />
            </Button>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-border py-6">
        <div className="max-w-6xl mx-auto px-6 flex items-center justify-between text-sm text-muted-foreground">
          <div className="flex items-center gap-2">
            <Shield className="w-3.5 h-3.5" />
            <span>© 2026 ExamGuard</span>
          </div>
          <div className="flex gap-4">
            <span>Privacy</span>
            <span>Terms</span>
          </div>
        </div>
      </footer>
    </div>);

};

export default LandingPage;
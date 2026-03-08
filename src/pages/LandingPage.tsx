import { useNavigate } from 'react-router-dom';
import { Shield, ArrowRight } from 'lucide-react';
import { Button } from '@/components/ui/button';

const LandingPage = () => {
  const navigate = useNavigate();

  const features = [
    { title: 'Locked Environment', desc: 'Fullscreen lockdown with disabled copy, paste, right-click, and DevTools.' },
    { title: 'Tab Monitoring', desc: 'Real-time tracking of tab switches and window blur events.' },
    { title: 'AI Proctoring', desc: 'Face detection every 15 seconds — no face, multiple faces, off-center alerts.' },
    { title: 'Credibility Score', desc: 'Automated 0–100 score with weighted penalties and risk classification.' },
    { title: 'PDF Reports', desc: 'Exportable credibility certificates and violation timelines.' },
    { title: 'Admin Dashboard', desc: 'Live violation feeds, snapshots, risk filtering, and exam management.' },
  ];

  return (
    <div className="min-h-screen">
      {/* Header */}
      <header className="border-b border-border sticky top-0 bg-background/80 backdrop-blur-sm z-10">
        <div className="container mx-auto flex items-center justify-between px-6 py-4">
          <div className="flex items-center gap-2">
            <Shield className="w-5 h-5" />
            <span className="font-semibold text-foreground">Exam Guardrail</span>
          </div>
          <div className="flex items-center gap-3">
            <Button variant="ghost" onClick={() => navigate('/auth')}>Sign In</Button>
            <Button onClick={() => navigate('/auth')}>
              Get Started <ArrowRight className="w-4 h-4 ml-1" />
            </Button>
          </div>
        </div>
      </header>

      {/* Hero */}
      <section className="container mx-auto px-6 pt-24 pb-20 text-center max-w-2xl">
        <h1 className="text-4xl md:text-5xl font-bold text-foreground mb-4 leading-tight tracking-tight">
          Secure Online Exams,<br />Done Right.
        </h1>
        <p className="text-lg text-muted-foreground mb-8">
          AI-powered proctoring, real-time monitoring, and automated credibility scoring for institutions that value integrity.
        </p>
        <div className="flex gap-3 justify-center">
          <Button onClick={() => navigate('/auth')} size="lg">
            Start Now <ArrowRight className="w-4 h-4 ml-1" />
          </Button>
          <Button variant="outline" size="lg" onClick={() => document.getElementById('features')?.scrollIntoView({ behavior: 'smooth' })}>
            Learn More
          </Button>
        </div>
      </section>

      {/* Features */}
      <section id="features" className="container mx-auto px-6 pb-20 max-w-4xl">
        <h2 className="text-2xl font-semibold text-foreground mb-8 text-center">Features</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {features.map((feature, i) => (
            <div key={i} className="border border-border rounded-lg p-5">
              <h3 className="font-medium text-foreground mb-2">{feature.title}</h3>
              <p className="text-sm text-muted-foreground">{feature.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* CTA */}
      <section className="container mx-auto px-6 pb-20 max-w-xl text-center">
        <h2 className="text-2xl font-semibold text-foreground mb-3">Ready to get started?</h2>
        <p className="text-muted-foreground mb-6">Create your first exam in minutes.</p>
        <Button onClick={() => navigate('/auth')} size="lg">
          Get Started Free <ArrowRight className="w-4 h-4 ml-1" />
        </Button>
      </section>

      {/* Footer */}
      <footer className="border-t border-border py-6">
        <div className="container mx-auto px-6 flex items-center justify-between text-sm text-muted-foreground">
          <span>© 2026 Exam Guardrail</span>
          <div className="flex gap-4">
            <span>Privacy</span>
            <span>Terms</span>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default LandingPage;

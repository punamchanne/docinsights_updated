import { Link } from "wouter";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { ThemeToggle } from "@/components/theme-toggle";
import {
  FileText,
  Brain,
  MessageSquare,
  BarChart3,
  Upload,
  Search,
  Shield,
  Zap,
  CheckCircle2,
  ArrowRight,
  Users,
  Target,
  Globe,
  Lightbulb
} from "lucide-react";

export default function Landing() {
  const features = [
    {
      icon: Upload,
      title: "Smart Upload",
      description: "Drag and drop PDFs with intelligent processing and progress tracking"
    },
    {
      icon: FileText,
      title: "Text Extraction",
      description: "Advanced OCR technology extracts text from any PDF document"
    },
    {
      icon: Brain,
      title: "AI Analysis",
      description: "Automatic entity recognition, keyword extraction, and summarization"
    },
    {
      icon: MessageSquare,
      title: "Document Q&A",
      description: "Ask questions about your documents and get contextual answers"
    },
    {
      icon: Search,
      title: "Smart Search",
      description: "Find information across all your documents instantly"
    },
    {
      icon: BarChart3,
      title: "Visual Reports",
      description: "Generate beautiful reports with charts and insights"
    },
  ];

  return (
    <div className="min-h-screen bg-background">
      <header className="sticky top-0 z-50 border-b bg-background">
        <div className="max-w-7xl mx-auto px-6 lg:px-8 h-16 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-lg bg-primary/10 flex items-center justify-center border border-primary/20">
              <FileText className="w-5 h-5 text-primary" />
            </div>
            <span className="font-bold text-xl tracking-tight text-foreground">DocInsight</span>
          </div>
          <nav className="hidden md:flex items-center gap-8">
            <a href="#features" className="text-sm font-medium text-muted-foreground hover:text-primary transition-colors">
              Features
            </a>
            <a href="#how-it-works" className="text-sm font-medium text-muted-foreground hover:text-primary transition-colors">
              How it Works
            </a>
            <a href="#about" className="text-sm font-medium text-muted-foreground hover:text-primary transition-colors">
              About
            </a>
            <div className="flex items-center gap-4 ml-4">
              <Link href="/auth">
                <Button variant="ghost" size="sm" className="hover:bg-primary/10 hover:text-primary">
                  Sign In
                </Button>
              </Link>
              <Link href="/auth">
                <Button size="sm" className="bg-primary hover:bg-primary/90 text-primary-foreground">
                  Get Started
                </Button>
              </Link>
            </div>
          </nav>
        </div>
      </header>

      <main>
        <section className="relative pt-24 pb-32 lg:pt-36 lg:pb-40 border-b">
          <div className="max-w-7xl mx-auto px-6 lg:px-8 relative z-10">
            <div className="max-w-4xl mx-auto text-center">
              <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-primary/10 border border-primary/20 text-sm font-medium mb-8 text-primary">
                <Zap className="w-4 h-4" />
                <span>Next-Gen Context-Aware AI</span>
              </div>

              <h1 className="text-5xl sm:text-6xl lg:text-7xl font-extrabold tracking-tight mb-8 leading-tight">
                Transform Documents into <br />
                <span className="text-primary">
                  Intelligent Insights
                </span>
              </h1>

              <p className="text-xl text-muted-foreground mb-12 max-w-2xl mx-auto leading-relaxed">
                Unlock the power of your PDFs with advanced AI. Extract data, visualize trends,
                and chat with your documents in seconds.
              </p>

              <div className="flex flex-col sm:flex-row gap-4 justify-center">
                <Link href="/auth">
                  <Button size="lg" className="h-12 px-8 text-base bg-primary hover:bg-primary/90">
                    Start Processing Free
                    <ArrowRight className="ml-2 w-5 h-5" />
                  </Button>
                </Link>
                <Link href="#demo">
                  <Button variant="outline" size="lg" className="h-12 px-8 text-base">
                    Watch Demo
                  </Button>
                </Link>
              </div>

              {/* Stats / trust indicators */}
              <div className="mt-16 pt-8 border-t grid grid-cols-2 md:grid-cols-4 gap-8">
                {[
                  { label: "Documents Processed", value: "10k+" },
                  { label: "Entities Extracted", value: "1M+" },
                  { label: "Accuracy Rate", value: "99.9%" },
                  { label: "Active Users", value: "2k+" },
                ].map((stat, i) => (
                  <div key={i}>
                    <div className="text-2xl font-bold text-foreground mb-1">{stat.value}</div>
                    <div className="text-sm text-muted-foreground">{stat.label}</div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </section>

        {/* Features Grid */}
        <section id="features" className="py-24 relative">
          <div className="max-w-7xl mx-auto px-6 lg:px-8">
            <div className="text-center mb-16">
              <h2 className="text-3xl font-bold mb-4 tracking-tight">Powerful Features</h2>
              <p className="text-muted-foreground max-w-2xl mx-auto text-lg">
                Everything you need to process, analyze, and understand your documents
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {features.map((feature, index) => (
                <div key={index} className="card-flat p-6 group">
                  <CardContent className="p-0">
                    <div className="w-12 h-12 rounded-lg bg-primary/10 flex items-center justify-center mb-4 transition-transform duration-300">
                      <feature.icon className="w-6 h-6 text-primary" />
                    </div>
                    <h3 className="text-xl font-semibold mb-3 text-foreground group-hover:text-primary transition-colors">
                      {feature.title}
                    </h3>
                    <p className="text-muted-foreground leading-relaxed">
                      {feature.description}
                    </p>
                  </CardContent>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* How it Works Section */}
        <section id="how-it-works" className="py-24 relative bg-muted/5">
          <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,_var(--tw-gradient-stops))] from-primary/5 via-transparent to-transparent pointer-events-none" />
          <div className="max-w-7xl mx-auto px-6 lg:px-8 relative z-10">
            <div className="text-center mb-16">
              <h2 className="text-3xl font-bold mb-4 tracking-tight">How DocInsight Works</h2>
              <p className="text-muted-foreground max-w-2xl mx-auto text-lg">
                Three simple steps to unlock the potential of your documents
              </p>
            </div>

            <div className="grid md:grid-cols-3 gap-8">
              <div className="relative text-center group">
                <div className="w-24 h-24 rounded-2xl bg-card border flex items-center justify-center mx-auto mb-6 relative">
                  <Upload className="w-10 h-10 text-primary" />
                </div>
                <h3 className="text-xl font-semibold mb-3">1. Upload</h3>
                <p className="text-muted-foreground">
                  Drag & drop your PDF documents. We securely process and encrypt them instantly.
                </p>
              </div>

              <div className="relative text-center group">
                <div className="w-24 h-24 rounded-2xl bg-card border flex items-center justify-center mx-auto mb-6 relative">
                  <Brain className="w-10 h-10 text-primary" />
                </div>
                <h3 className="text-xl font-semibold mb-3">2. Analyze</h3>
                <p className="text-muted-foreground">
                  Our AI engine extracts text, entities, and insights, creating a knowledge base.
                </p>
              </div>

              <div className="relative text-center group">
                <div className="w-24 h-24 rounded-2xl bg-card border flex items-center justify-center mx-auto mb-6 relative">
                  <MessageSquare className="w-10 h-10 text-primary" />
                </div>
                <h3 className="text-xl font-semibold mb-3">3. Interact</h3>
                <p className="text-muted-foreground">
                  Chat with your documents, ask questions, and get cited answers immediately.
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* Security Section */}
        <section className="py-24 relative overflow-hidden">
          <div className="absolute inset-0 bg-primary/5 -skew-y-3 transform origin-left scale-110" />

          <div className="max-w-7xl mx-auto px-6 lg:px-8 relative z-10">
            <div className="grid lg:grid-cols-2 gap-16 items-center">
              <div>
                <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-primary/10 text-primary text-sm font-medium mb-6">
                  <Shield className="w-4 h-4" />
                  <span>Enterprise Grade</span>
                </div>
                <h2 className="text-4xl font-bold mb-6 tracking-tight">
                  Security You Can Trust
                </h2>
                <p className="text-lg text-muted-foreground mb-8 leading-relaxed">
                  Your documents are protected with industry-leading security measures.
                  We prioritize your data privacy with state-of-the-art encryption.
                </p>

                <div className="space-y-4">
                  {[
                    "End-to-end encryption for all documents",
                    "Role-based access control (RBAC)",
                    "Secure authentication with Passport.js",
                    "Comprehensive audit logging & tracking"
                  ].map((item, index) => (
                    <div key={index} className="flex items-center gap-3">
                      <CheckCircle2 className="w-5 h-5 text-primary flex-shrink-0" />
                      <span className="text-foreground">{item}</span>
                    </div>
                  ))}
                </div>
              </div>

              <div className="relative">
                <Card className="card-flat p-8 relative z-10 shadow-lg">
                  <div className="text-center">
                    <div className="w-20 h-20 rounded-2xl bg-primary/10 flex items-center justify-center mx-auto mb-6 border border-primary/20">
                      <Shield className="w-10 h-10 text-primary" />
                    </div>
                    <h3 className="text-2xl font-semibold mb-3">Secure by Design</h3>
                    <p className="text-muted-foreground leading-relaxed">
                      Built with a security-first architecture to protect your most sensitive data attributes.
                    </p>
                  </div>
                </Card>
              </div>
            </div>
          </div>
        </section>

        {/* About Section */}
        <section id="about" className="py-24 relative">
          <div className="max-w-7xl mx-auto px-6 lg:px-8">
            <div className="grid lg:grid-cols-2 gap-16 items-center">
              <div className="order-2 lg:order-1 relative">
                <div className="absolute inset-0 bg-gradient-to-r from-primary/20 to-purple-500/20 blur-3xl rounded-full transform -rotate-12" />
                <div className="grid grid-cols-2 gap-4 relative z-10">
                  <div className="space-y-4 pt-8">
                    <div className="card-flat p-6 rounded-2xl">
                      <Users className="w-8 h-8 text-primary mb-4" />
                      <h4 className="font-semibold mb-1">User Focused</h4>
                      <p className="text-sm text-muted-foreground">Built for intuitive document interaction.</p>
                    </div>
                    <div className="card-flat p-6 rounded-2xl">
                      <Globe className="w-8 h-8 text-primary mb-4" />
                      <h4 className="font-semibold mb-1">Global Scale</h4>
                      <p className="text-sm text-muted-foreground">Processing documents in multiple languages.</p>
                    </div>
                  </div>
                  <div className="space-y-4">
                    <div className="card-flat p-6 rounded-2xl">
                      <Target className="w-8 h-8 text-primary mb-4" />
                      <h4 className="font-semibold mb-1">Precision</h4>
                      <p className="text-sm text-muted-foreground">99% accuracy in data extraction.</p>
                    </div>
                    <div className="card-flat p-6 rounded-2xl">
                      <Lightbulb className="w-8 h-8 text-primary mb-4" />
                      <h4 className="font-semibold mb-1">Innovation</h4>
                      <p className="text-sm text-muted-foreground">Constantly evolving AI models.</p>
                    </div>
                  </div>
                </div>
              </div>

              <div className="order-1 lg:order-2">
                <h2 className="text-3xl font-bold mb-6 tracking-tight">About DocInsight</h2>
                <p className="text-lg text-muted-foreground mb-6 leading-relaxed">
                  DocInsight was born from a simple mission: to make document intelligence accessible to everyone. We believe that valuable information shouldn't be locked away in static files.
                </p>
                <p className="text-lg text-muted-foreground mb-8 leading-relaxed">
                  Our team of engineers and data scientists have built a platform that combines the latest in Computer Vision and Large Language Models to transform how organizations handle their data.
                </p>
                <div className="flex items-center gap-4">
                  <div className="flex -space-x-4">
                    {[1, 2, 3, 4].map(i => (
                      <div key={i} className="w-10 h-10 rounded-full bg-muted border-2 border-background flex items-center justify-center text-xs font-medium">
                        <Users className="w-4 h-4 text-muted-foreground" />
                      </div>
                    ))}
                  </div>
                  <div className="text-sm text-muted-foreground">
                    <span className="font-semibold text-foreground">Trusted by teams</span> around the world
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        <section className="py-24 border-t">
          <div className="max-w-4xl mx-auto px-6 lg:px-8 text-center relative z-10">
            <h2 className="text-4xl font-bold mb-6 tracking-tight">
              Ready to Transform Your Workflow?
            </h2>
            <p className="text-xl text-muted-foreground mb-10 max-w-2xl mx-auto">
              Join thousands of professionals who save hours every week with DocInsight's intelligent features.
            </p>
            <Link href="/auth">
              <Button size="lg" className="h-14 px-10 text-lg bg-primary hover:bg-primary/90">
                Get Started Now
              </Button>
            </Link>
          </div>
        </section>
      </main>

      <footer className="border-t py-12 bg-muted/20">
        <div className="max-w-7xl mx-auto px-6 lg:px-8">
          <div className="flex flex-col md:flex-row justify-between items-center gap-6">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center border border-primary/20">
                <FileText className="w-4 h-4 text-primary" />
              </div>
              <span className="font-semibold text-lg">DocInsight</span>
            </div>
            <p className="text-sm text-muted-foreground">
              © 2024 DocInsight. Intelligent Document Processing System.
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
}

import { useQuery } from "@tanstack/react-query";
import { Link } from "wouter";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  FileText,
  Upload,
  Clock,
  CheckCircle2,
  AlertCircle,
  ArrowRight,
  TrendingUp,
  Brain,
  MessageSquare,
  Loader2,
  Sparkles
} from "lucide-react";
import type { Document } from "@shared/mongo-schema";
import { format } from "date-fns";

interface DashboardStats {
  totalDocuments: number;
  processingCount: number;
  completedCount: number;
  errorCount: number;
  recentDocuments: Document[];
}

function StatCard({
  title,
  value,
  icon: Icon,
  trend,
  loading,
  className
}: {
  title: string;
  value: number | string;
  icon: React.ComponentType<{ className?: string }>;
  trend?: string;
  loading?: boolean;
  className?: string;
}) {
  return (
    <div className={`card-flat p-6 relative overflow-hidden group ${className}`}>
      <div className="relative z-10 flex items-center justify-between gap-4">
        <div>
          <p className="text-sm text-muted-foreground font-medium mb-1">{title}</p>
          {loading ? (
            <Skeleton className="h-9 w-20" />
          ) : (
            <p className="text-3xl font-bold text-foreground">{value}</p>
          )}
          {trend && (
            <p className="text-xs text-muted-foreground mt-1 flex items-center gap-1">
              <TrendingUp className="w-3 h-3 text-chart-2" />
              {trend}
            </p>
          )}
        </div>
        <div className="w-12 h-12 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0">
          <Icon className="w-6 h-6 text-primary" />
        </div>
      </div>
    </div>
  );
}

function getStatusBadge(status: string) {
  switch (status) {
    case "completed":
      return (
        <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">
          <CheckCircle2 className="w-3 h-3 mr-1" />
          Completed
        </Badge>
      );
    case "processing":
      return (
        <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-200">
          <Loader2 className="w-3 h-3 mr-1 animate-spin" />
          Processing
        </Badge>
      );
    case "error":
      return (
        <Badge variant="outline" className="bg-red-50 text-red-700 border-red-200">
          <AlertCircle className="w-3 h-3 mr-1" />
          Error
        </Badge>
      );
    default:
      return <Badge variant="secondary">Pending</Badge>;
  }
}

export default function Dashboard() {
  const { data: stats, isLoading } = useQuery<DashboardStats>({
    queryKey: ["/api/dashboard/stats"],
  });

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight" data-testid="text-dashboard-title">Dashboard</h1>
          <p className="text-muted-foreground mt-1 text-base">
            Overview of your document intelligence
          </p>
        </div>
        <Link href="/upload">
          <Button data-testid="button-upload-new" className="bg-primary hover:bg-primary/90">
            <Upload className="w-4 h-4 mr-2" />
            Upload Document
          </Button>
        </Link>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <StatCard
          title="Total Documents"
          value={stats?.totalDocuments ?? 0}
          icon={FileText}
          loading={isLoading}
        />
        <StatCard
          title="Processing"
          value={stats?.processingCount ?? 0}
          icon={Clock}
          loading={isLoading}
        />
        <StatCard
          title="Completed"
          value={stats?.completedCount ?? 0}
          icon={CheckCircle2}
          loading={isLoading}
        />
        <StatCard
          title="Errors"
          value={stats?.errorCount ?? 0}
          icon={AlertCircle}
          loading={isLoading}
        />
      </div>

      <div className="grid lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 card-flat p-6">
          <div className="flex flex-row items-center justify-between gap-4 pb-4 border-b mb-4">
            <div className="flex items-center gap-2">
              <Sparkles className="w-5 h-5 text-primary" />
              <h2 className="text-lg font-semibold">Recent Activity</h2>
            </div>
            <Link href="/documents">
              <Button variant="ghost" size="sm" className="hover:bg-primary/10 hover:text-primary">
                View All
                <ArrowRight className="w-4 h-4 ml-1" />
              </Button>
            </Link>
          </div>

          {isLoading ? (
            <div className="space-y-4">
              {[1, 2, 3].map((i) => (
                <div key={i} className="flex items-center gap-4 p-4 rounded-lg bg-muted/50">
                  <Skeleton className="w-10 h-10 rounded-lg" />
                  <div className="flex-1 space-y-2">
                    <Skeleton className="h-4 w-48" />
                    <Skeleton className="h-3 w-32" />
                  </div>
                  <Skeleton className="h-6 w-20" />
                </div>
              ))}
            </div>
          ) : stats?.recentDocuments && stats.recentDocuments.length > 0 ? (
            <div className="space-y-3">
              {stats.recentDocuments.map((doc) => (
                <Link key={doc._id} href={`/documents/${doc._id}`}>
                  <div
                    className="flex items-center gap-4 p-4 rounded-lg bg-muted/30 hover:bg-muted/50 border border-transparent hover:border-border cursor-pointer transition-all group"
                    data-testid={`document-card-${doc._id}`}
                  >
                    <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0 group-hover:bg-primary/20 transition-colors">
                      <FileText className="w-5 h-5 text-primary" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-medium truncate transition-colors">{doc.originalName}</p>
                      <p className="text-sm text-muted-foreground">
                        {doc.uploadDate && format(new Date(doc.uploadDate), "MMM d, yyyy 'at' h:mm a")}
                      </p>
                    </div>
                    {getStatusBadge(doc.status)}
                  </div>
                </Link>
              ))}
            </div>
          ) : (
            <div className="text-center py-12">
              <div className="w-16 h-16 rounded-2xl bg-muted/50 flex items-center justify-center mx-auto mb-4 border border-border">
                <FileText className="w-8 h-8 text-muted-foreground" />
              </div>
              <h3 className="font-medium mb-2">No documents yet</h3>
              <p className="text-sm text-muted-foreground mb-4">
                Upload your first PDF to get started with AI analysis
              </p>
              <Link href="/upload">
                <Button size="sm" className="bg-primary/90 hover:bg-primary">
                  <Upload className="w-4 h-4 mr-2" />
                  Upload Document
                </Button>
              </Link>
            </div>
          )}
        </div>

        <div className="card-flat p-6 h-fit">
          <div className="pb-4 border-b mb-4">
            <div className="flex items-center gap-2">
              <TrendingUp className="w-5 h-5 text-primary" />
              <h2 className="text-lg font-semibold">Quick Actions</h2>
            </div>
          </div>
          <div className="space-y-3">
            <Link href="/upload">
              <Button variant="outline" className="w-full justify-start h-12" data-testid="quick-action-upload">
                <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center mr-3">
                  <Upload className="w-4 h-4 text-primary" />
                </div>
                Upload New Document
              </Button>
            </Link>
            <Link href="/documents">
              <Button variant="outline" className="w-full justify-start h-12" data-testid="quick-action-chat">
                <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center mr-3">
                  <MessageSquare className="w-4 h-4 text-primary" />
                </div>
                Ask Questions
              </Button>
            </Link>
            <Link href="/reports">
              <Button variant="outline" className="w-full justify-start h-12" data-testid="quick-action-reports">
                <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center mr-3">
                  <Brain className="w-4 h-4 text-primary" />
                </div>
                View Reports
              </Button>
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}

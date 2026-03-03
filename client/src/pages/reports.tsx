import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  LineElement,
  PointElement,
  ArcElement,
  Title,
  Tooltip,
  Legend
} from 'chart.js';
import { Bar, Line, Pie } from 'react-chartjs-2';
import {
  FileText,
  Brain,
  TrendingUp,
  FileDown,
  CheckCircle2
} from "lucide-react";
import type { ReportsData } from "@shared/mongo-schema";
import { exportToPdf, exportToWord } from '@/lib/exporter';
import { useRef } from "react";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";

ChartJS.register(
  CategoryScale,
  LinearScale,
  BarElement,
  LineElement,
  PointElement,
  ArcElement,
  Title,
  Tooltip,
  Legend
);

function StatCard({
  title,
  value,
  icon: Icon,
  loading
}: {
  title: string;
  value: number | string;
  icon: React.ComponentType<{ className?: string }>;
  loading?: boolean;
}) {
  return (
    <Card className="card-flat">
      <CardContent className="p-6">
        <div className="flex items-center justify-between gap-4">
          <div>
            <p className="text-sm text-muted-foreground font-medium mb-1">{title}</p>
            {loading ? (
              <Skeleton className="h-9 w-20" />
            ) : (
              <p className="text-3xl font-bold">{value}</p>
            )}
          </div>
          <div className="w-12 h-12 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0">
            <Icon className="w-6 h-6 text-primary" />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

export default function Reports() {
  const { data: reports, isLoading } = useQuery<ReportsData>({
    queryKey: ["/api/reports"],
  });

  const charts = {
    documentsOverTime: useRef<any>(null),
    entityDistribution: useRef<any>(null),
    topKeywords: useRef<any>(null),
    statusDistribution: useRef<any>(null),
  }

  const documentsOverTimeData = {
    labels: reports?.documentsOverTime?.map(d => d.date) || [],
    datasets: [
      {
        label: 'Documents',
        data: reports?.documentsOverTime?.map(d => d.count) || [],
        borderColor: 'hsl(var(--primary))',
        backgroundColor: 'hsl(var(--primary))',
      },
    ],
  };

  const entityDistributionData = {
    labels: reports?.entityDistribution?.map(e => e.name) || [],
    datasets: [
      {
        data: reports?.entityDistribution?.map(e => e.value) || [],
        backgroundColor: [
          'hsl(var(--chart-1))',
          'hsl(var(--chart-2))',
          'hsl(var(--chart-3))',
          'hsl(var(--chart-4))',
          'hsl(var(--chart-5))',
        ],
      },
    ],
  };

  const topKeywordsData = {
    labels: reports?.topKeywords?.slice(0, 8).map(k => k.keyword) || [],
    datasets: [
      {
        label: 'Count',
        data: reports?.topKeywords?.slice(0, 8).map(k => k.count) || [],
        backgroundColor: 'hsl(var(--primary))',
      },
    ],
  };

  const statusDistributionData = {
    labels: reports?.statusDistribution?.map(s => s.status) || [],
    datasets: [
      {
        label: 'Count',
        data: reports?.statusDistribution?.map(s => s.count) || [],
        backgroundColor: 'hsl(var(--chart-2))',
      },
    ],
  };

  const chartOptions = (title: string) => ({
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        position: 'top' as const,
      },
      title: {
        display: true,
        text: title,
      },
    },
  });

  const handleExport = (format: 'pdf' | 'word') => {
    if (!reports) return;

    const chartInstances = {
      documentsOverTime: charts.documentsOverTime.current,
      entityDistribution: charts.entityDistribution.current,
      topKeywords: charts.topKeywords.current,
      statusDistribution: charts.statusDistribution.current,
    };

    if (format === 'pdf') {
      exportToPdf(reports, chartInstances);
    } else {
      exportToWord(reports, chartInstances);
    }
  };

  return (
    <div className="space-y-8">
      <div className="flex flex-col space-y-4 sm:flex-row sm:justify-between sm:items-start sm:space-y-0">
        <div className="flex-1 min-w-0">
          <h1 className="text-3xl font-bold tracking-tight mb-2" data-testid="text-reports-title">
            Reports & Analytics
          </h1>
          <p className="text-muted-foreground text-sm max-w-2xl font-medium uppercase tracking-tight">
            Visual highlights from all your images and documents
          </p>
        </div>
        <div className="flex flex-col sm:flex-row gap-2 flex-shrink-0">
          <Button variant="outline" size="sm" onClick={() => handleExport('pdf')}>
            <FileDown className="w-4 h-4 mr-2" />
            PDF Export
          </Button>
          <Button variant="outline" size="sm" onClick={() => handleExport('word')}>
            <FileDown className="w-4 h-4 mr-2" />
            Word Export
          </Button>
        </div>
      </div>

      {/* Quick Recap / Highlights */}
      {!isLoading && reports && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Card className="bg-primary/5 border-primary/20 shadow-none">
            <CardContent className="p-4 flex items-center gap-4">
              <div className="w-10 h-10 rounded-full bg-primary/20 flex items-center justify-center">
                <Brain className="w-5 h-5 text-primary" />
              </div>
              <div className="flex-1">
                <p className="text-sm font-medium">Top Keyword</p>
                <p className="text-lg font-bold">
                  {reports.topKeywords?.[0]?.keyword || "N/A"}
                </p>
              </div>
              <Badge variant="outline" className="bg-background">Most used term</Badge>
            </CardContent>
          </Card>
          <Card className="bg-primary/5 border-primary/20 shadow-none">
            <CardContent className="p-4 flex items-center gap-4">
              <div className="w-10 h-10 rounded-full bg-primary/20 flex items-center justify-center">
                <FileText className="w-5 h-5 text-primary" />
              </div>
              <div className="flex-1">
                <p className="text-sm font-medium">Most Active Entity</p>
                <p className="text-lg font-bold">
                  {reports.entityDistribution?.[0]?.name || "N/A"}
                </p>
              </div>
              <Badge variant="outline" className="bg-background">Top Organization/Person</Badge>
            </CardContent>
          </Card>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <StatCard title="Total Documents" value={reports?.totalDocuments?.toLocaleString() ?? 0} icon={FileText} loading={isLoading} />
        <StatCard title="Total Pages" value={reports?.totalPages?.toLocaleString() ?? 0} icon={Brain} loading={isLoading} />
        <StatCard title="Total Words" value={reports?.totalWords?.toLocaleString() ?? 0} icon={TrendingUp} loading={isLoading} />
        <StatCard title="Avg Words/Doc" value={reports?.totalDocuments && reports?.totalWords ? Math.round(reports.totalWords / reports.totalDocuments).toLocaleString() : 0} icon={FileText} loading={isLoading} />
      </div>

      <div className="grid lg:grid-cols-2 gap-6">
        <Card className="card-flat border-primary/10">
          <CardHeader>
            <CardTitle className="text-lg font-semibold flex items-center gap-2">
              <TrendingUp className="w-5 h-5 text-primary" />
              Recent Activity
            </CardTitle>
            <p className="text-sm text-muted-foreground">Daily upload summary.</p>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {isLoading ? (
                Array(4).fill(0).map((_, i) => <Skeleton key={i} className="h-10 w-full" />)
              ) : reports?.documentsOverTime?.length ? (
                reports.documentsOverTime.slice(-5).reverse().map((d) => (
                  <div key={d.date} className="flex justify-between items-center p-3 rounded-lg bg-muted/30">
                    <span className="font-medium">{new Date(d.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}</span>
                    <Badge variant="outline" className="bg-background text-primary font-bold">
                      {d.count} {d.count === 1 ? 'Document' : 'Documents'}
                    </Badge>
                  </div>
                ))
              ) : (
                <p className="text-muted-foreground italic">No activity yet.</p>
              )}
            </div>
          </CardContent>
        </Card>

        <Card className="card-flat border-primary/10">
          <CardHeader>
            <CardTitle className="text-lg font-semibold flex items-center gap-2">
              <Brain className="w-5 h-5 text-primary" />
              Detected Entities
            </CardTitle>
            <p className="text-sm text-muted-foreground">Identifying Key People & Organizations.</p>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {isLoading ? (
                Array(5).fill(0).map((_, i) => <Skeleton key={i} className="h-10 w-full" />)
              ) : reports?.entityDistribution?.length ? (
                reports.entityDistribution.slice(0, 6).map((e) => (
                  <div key={e.name} className="flex items-center gap-3 p-2 border-b last:border-0">
                    <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                      <FileText className="w-4 h-4 text-primary" />
                    </div>
                    <span className="flex-1 truncate font-medium text-sm">{e.name}</span>
                    <Badge variant="secondary" className="font-bold">{e.value}</Badge>
                  </div>
                ))
              ) : (
                <p className="text-muted-foreground italic">No entities detected yet.</p>
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid lg:grid-cols-2 gap-6">
        <Card className="card-flat border-primary/10">
          <CardHeader>
            <CardTitle className="text-lg font-semibold flex items-center gap-2">
              <FileDown className="w-5 h-5 text-primary" />
              Top Keywords
            </CardTitle>
            <p className="text-sm text-muted-foreground">Most important terms found by AI.</p>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-2">
              {isLoading ? (
                Array(10).fill(0).map((_, i) => <Skeleton key={i} className="h-8 w-20 rounded-full" />)
              ) : reports?.topKeywords?.length ? (
                reports.topKeywords.slice(0, 15).map((k) => (
                  <Badge
                    key={k.keyword}
                    variant="secondary"
                    className="h-10 px-4 text-sm font-medium hover:bg-primary/20 transition-colors"
                  >
                    {k.keyword}
                    <span className="ml-2 py-0.5 px-1.5 rounded-full bg-primary/10 text-[10px] font-bold">
                      {k.count}
                    </span>
                  </Badge>
                ))
              ) : (
                <p className="text-muted-foreground italic">No keywords extracted yet.</p>
              )}
            </div>
          </CardContent>
        </Card>

        <Card className="card-flat border-primary/10">
          <CardHeader>
            <CardTitle className="text-lg font-semibold flex items-center gap-2">
              <CheckCircle2 className="w-5 h-5 text-primary" />
              Processing Status
            </CardTitle>
            <p className="text-sm text-muted-foreground">Current status of all file uploads.</p>
          </CardHeader>
          <CardContent>
            <div className="space-y-6">
              {isLoading ? (
                Array(3).fill(0).map((_, i) => (
                  <div key={i} className="space-y-2">
                    <Skeleton className="h-4 w-1/4" />
                    <Skeleton className="h-2 w-full" />
                  </div>
                ))
              ) : reports?.statusDistribution?.length ? (
                reports.statusDistribution.map((s) => {
                  const percentage = Math.round((s.count / reports.totalDocuments) * 100);
                  const isError = s.status === 'error';
                  return (
                    <div key={s.status} className="space-y-2">
                      <div className="flex justify-between items-center text-sm">
                        <span className="capitalize font-semibold flex items-center gap-2">
                          <CheckCircle2 className={`w-4 h-4 ${isError ? 'text-destructive' : 'text-primary'}`} />
                          {s.status}
                        </span>
                        <span className="text-muted-foreground font-medium">{s.count} docs ({percentage}%)</span>
                      </div>
                      <Progress
                        value={percentage}
                        className={`h-2 ${isError ? 'bg-destructive/10' : 'bg-primary/10'}`}
                        //@ts-ignore
                        indicatorClassName={isError ? 'bg-destructive' : 'bg-primary'}
                      />
                    </div>
                  );
                })
              ) : (
                <p className="text-muted-foreground italic">No documents processed yet.</p>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

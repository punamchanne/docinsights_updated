import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useParams, Link } from "wouter";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  ArrowLeft,
  FileText,
  Clock,
  CheckCircle2,
  AlertCircle,
  Loader2,
  MessageSquare,
  Download,
  User,
  Building,
  MapPin,
  Calendar,
  Banknote,
  RefreshCw,
  Lightbulb,
  TrendingUp,
  TrendingDown,
  FileCheck,
} from "lucide-react";
import type { Document, Extraction, DocumentAnalysis, ExtractedEntity, ExtractedTable } from "@shared/mongo-schema";
import { format } from "date-fns";
import { toast } from "sonner";

function getStatusBadge(status: string) {
  switch (status) {
    case "completed":
      return <Badge variant="secondary" className="bg-chart-2/10 text-chart-2 border-0">Completed</Badge>;
    case "processing":
      return (
        <Badge variant="secondary" className="bg-chart-4/10 text-chart-4 border-0">
          <Loader2 className="w-3 h-3 mr-1 animate-spin" />
          Processing
        </Badge>
      );
    case "error":
      return <Badge variant="destructive">Error</Badge>;
    default:
      return <Badge variant="secondary">Pending</Badge>;
  }
}

function EntityIcon({ type }: { type: string }) {
  switch (type) {
    case "person":
      return <User className="w-4 h-4" />;
    case "organization":
      return <Building className="w-4 h-4" />;
    case "location":
      return <MapPin className="w-4 h-4" />;
    case "date":
      return <Calendar className="w-4 h-4" />;
    case "money":
      return <Banknote className="w-4 h-4" />;
    default:
      return <FileText className="w-4 h-4" />;
  }
}

function EntityBadgeColor(type: string) {
  switch (type) {
    case "person":
      return "bg-chart-1/10 text-chart-1 border-0";
    case "organization":
      return "bg-chart-2/10 text-chart-2 border-0";
    case "location":
      return "bg-chart-3/10 text-chart-3 border-0";
    case "date":
      return "bg-chart-4/10 text-chart-4 border-0";
    case "money":
      return "bg-chart-5/10 text-chart-5 border-0";
    default:
      return "";
  }
}

interface DocumentWithExtraction extends Document {
  extractions?: Extraction[];
  extractedText?: string;
}

export default function DocumentViewer() {
  const params = useParams<{ id: string }>();
  const queryClient = useQueryClient();

  const { data: document, isLoading } = useQuery<DocumentWithExtraction>({
    queryKey: ["/api/documents", params.id],
    enabled: !!params.id,
  });

  const reprocessMutation = useMutation({
    mutationFn: async () => {
      const response = await fetch(`/api/documents/${params.id}/reprocess`, {
        method: "POST",
      });
      if (!response.ok) throw new Error("Failed to reprocess document");
      return response.json();
    },
    onSuccess: () => {
      toast.success("Document reprocessing started");
      queryClient.invalidateQueries({ queryKey: ["/api/documents", params.id] });
    },
    onError: () => {
      toast.error("Failed to reprocess document");
    },
  });

  const formatFileSize = (bytes: number) => {
    if (bytes < 1024) return bytes + " B";
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + " KB";
    return (bytes / (1024 * 1024)).toFixed(1) + " MB";
  };

  const analysisExtraction = document?.extractions?.find(e => e.extractionType === "analysis");
  const analysis = analysisExtraction?.data as DocumentAnalysis | undefined;

  const tableExtraction = document?.extractions?.find(e => e.extractionType === "tables");
  const tables = (tableExtraction?.data as ExtractedTable[] | undefined) || analysis?.tables || [];

  if (isLoading) {
    return (
      <div className="space-y-8">
        <div className="flex items-center gap-4">
          <Skeleton className="h-9 w-9" />
          <div className="space-y-2">
            <Skeleton className="h-8 w-64" />
            <Skeleton className="h-4 w-48" />
          </div>
        </div>
        <div className="grid lg:grid-cols-3 gap-6">
          <Card className="lg:col-span-2">
            <CardContent className="p-6">
              <Skeleton className="h-96 w-full" />
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-6">
              <Skeleton className="h-64 w-full" />
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  if (!document) {
    return (
      <div className="text-center py-16">
        <div className="w-16 h-16 rounded-2xl bg-muted flex items-center justify-center mx-auto mb-4">
          <AlertCircle className="w-8 h-8 text-muted-foreground" />
        </div>
        <h3 className="font-medium mb-2">Document not found</h3>
        <p className="text-sm text-muted-foreground mb-4">
          The document you're looking for doesn't exist or has been deleted
        </p>
        <Link href="/documents">
          <Button variant="outline">Back to Documents</Button>
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <Link href="/documents">
            <Button variant="ghost" size="icon">
              <ArrowLeft className="w-5 h-5" />
            </Button>
          </Link>
          <div>
            <div className="flex items-center gap-3 flex-wrap">
              <h1 className="text-2xl font-semibold" data-testid="text-document-name">
                {document.originalName}
              </h1>
              {getStatusBadge(document.status)}
            </div>
            <p className="text-sm text-muted-foreground mt-1">
              {formatFileSize(document.fileSize)}
              {document.pageCount && ` • ${document.pageCount} pages`}
              {document.uploadDate && ` • Uploaded ${format(new Date(document.uploadDate), "MMM d, yyyy")}`}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            onClick={() => reprocessMutation.mutate()}
            disabled={reprocessMutation.isPending || document.status === "processing"}
          >
            <RefreshCw className={`w-4 h-4 mr-2 ${reprocessMutation.isPending ? "animate-spin" : ""}`} />
            Reprocess
          </Button>
          <Link href={`/chat?document=${(document as any)._id}`}>
            <Button variant="outline" data-testid="button-ask-questions">
              <MessageSquare className="w-4 h-4 mr-2" />
              Ask Questions
            </Button>
          </Link>
        </div>
      </div>

      <div className="grid lg:grid-cols-3 gap-6">
        <Card className="lg:col-span-2">
          <CardContent className="p-0">
            <Tabs defaultValue="text" className="w-full">
              <div className="border-b px-6 pt-4">
                <TabsList className="bg-transparent p-0 h-auto gap-4">
                  <TabsTrigger
                    value="text"
                    className="data-[state=active]:bg-transparent data-[state=active]:shadow-none border-b-2 border-transparent data-[state=active]:border-primary rounded-none pb-3"
                  >
                    Extracted Text
                  </TabsTrigger>
                  <TabsTrigger
                    value="entities"
                    className="data-[state=active]:bg-transparent data-[state=active]:shadow-none border-b-2 border-transparent data-[state=active]:border-primary rounded-none pb-3"
                  >
                    Entities
                  </TabsTrigger>
                  <TabsTrigger
                    value="tables"
                    className="data-[state=active]:bg-transparent data-[state=active]:shadow-none border-b-2 border-transparent data-[state=active]:border-primary rounded-none pb-3"
                  >
                    Tables
                  </TabsTrigger>
                </TabsList>
              </div>

              <TabsContent value="text" className="mt-0">
                <ScrollArea className="h-[500px] p-6">
                  {document.status === "processing" ? (
                    <div className="text-center py-12">
                      <Loader2 className="w-8 h-8 animate-spin mx-auto mb-4 text-primary" />
                      <p className="text-muted-foreground">Processing document...</p>
                    </div>
                  ) : document.extractedText ? (
                    <div
                      className="prose prose-sm dark:prose-invert max-w-none whitespace-pre-wrap font-mono text-sm leading-relaxed"
                      data-testid="text-extracted-content"
                    >
                      {document.extractedText}
                    </div>
                  ) : (
                    <div className="text-center py-12">
                      <FileText className="w-8 h-8 mx-auto mb-4 text-muted-foreground" />
                      <p className="text-muted-foreground">No text extracted yet</p>
                    </div>
                  )}
                </ScrollArea>
              </TabsContent>

              <TabsContent value="entities" className="mt-0">
                <ScrollArea className="h-[500px] p-6">
                  {document.status === "processing" ? (
                    <div className="text-center py-12">
                      <Loader2 className="w-8 h-8 animate-spin mx-auto mb-4 text-primary" />
                      <p className="text-muted-foreground">Processing document...</p>
                    </div>
                  ) : analysis?.entities ? (
                    (() => {
                      const entitySections = [
                        { key: 'persons', label: 'person', icon: 'person' },
                        { key: 'organizations', label: 'organization', icon: 'organization' },
                        { key: 'locations', label: 'location', icon: 'location' },
                        { key: 'dates', label: 'date', icon: 'date' },
                        { key: 'money', label: 'money', icon: 'money' },
                        { key: 'emails', label: 'email', icon: 'other' },
                        { key: 'phones', label: 'phone', icon: 'other' }
                      ].map(({ key, label, icon }) => {
                        const items = analysis.entities[key as keyof typeof analysis.entities] || [];
                        if (!Array.isArray(items) || items.length === 0) return null;

                        return (
                          <div key={key}>
                            <h4 className="text-sm font-medium capitalize mb-2 flex items-center gap-2">
                              <EntityIcon type={icon} />
                              {label}s ({items.length})
                            </h4>
                            <div className="flex flex-wrap gap-2">
                              {items.map((text: string, index: number) => (
                                <Badge
                                  key={index}
                                  variant="secondary"
                                  className={EntityBadgeColor(icon)}
                                >
                                  {text}
                                </Badge>
                              ))}
                            </div>
                          </div>
                        );
                      }).filter(Boolean);

                      return entitySections.length > 0 ? (
                        <div className="space-y-4">{entitySections}</div>
                      ) : (
                        <div className="text-center py-12">
                          <User className="w-8 h-8 mx-auto mb-4 text-muted-foreground" />
                          <p className="text-muted-foreground">No entities found in this document</p>
                          <p className="text-xs text-muted-foreground mt-2">
                            Try uploading a document with names, organizations, locations, dates, or contact information
                          </p>
                        </div>
                      );
                    })()
                  ) : (
                    <div className="text-center py-12">
                      <User className="w-8 h-8 mx-auto mb-4 text-muted-foreground" />
                      <p className="text-muted-foreground">No entities extracted yet</p>
                    </div>
                  )}
                </ScrollArea>
              </TabsContent>

              <TabsContent value="tables" className="mt-0">
                <ScrollArea className="h-[500px] p-6">
                  {document.status === "processing" ? (
                    <div className="text-center py-12">
                      <Loader2 className="w-8 h-8 animate-spin mx-auto mb-4 text-primary" />
                      <p className="text-muted-foreground">Processing document...</p>
                    </div>
                  ) : tables && tables.length > 0 ? (
                    <div className="space-y-6">
                      {tables.map((table, tableIndex) => (
                        <div key={tableIndex}>
                          <h4 className="text-sm font-medium mb-3">
                            Table {tableIndex + 1}
                            {table.confidence && (
                              <span className="ml-2 text-xs text-muted-foreground">
                                ({Math.round(table.confidence * 100)}% confidence)
                              </span>
                            )}
                          </h4>
                          <div className="border rounded-lg overflow-hidden">
                            <Table>
                              <TableHeader>
                                <TableRow className="bg-muted/50">
                                  {table.headers.map((header: string, i: number) => (
                                    <TableHead key={i} className="font-semibold text-foreground border-r last:border-r-0 h-10">
                                      {header}
                                    </TableHead>
                                  ))}
                                </TableRow>
                              </TableHeader>
                              <TableBody>
                                {table.rows.map((row: string[], rowIndex: number) => (
                                  <TableRow key={rowIndex} className="border-b last:border-b-0">
                                    {row.map((cell: string, cellIndex: number) => (
                                      <TableCell key={cellIndex} className="border-r last:border-r-0 py-3 align-top">
                                        {cell}
                                      </TableCell>
                                    ))}
                                  </TableRow>
                                ))}
                              </TableBody>
                            </Table>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="text-center py-12">
                      <FileText className="w-8 h-8 mx-auto mb-4 text-muted-foreground" />
                      <p className="text-muted-foreground">No tables found in this document</p>
                      <p className="text-xs text-muted-foreground mt-2">
                        Try uploading a document with tabular data or structured information
                      </p>
                    </div>
                  )}
                </ScrollArea>
              </TabsContent>

              <TabsContent value="insights" className="mt-0">
                <ScrollArea className="h-[500px] p-6">
                  {document.status === "processing" ? (
                    <div className="text-center py-12">
                      <Loader2 className="w-8 h-8 animate-spin mx-auto mb-4 text-primary" />
                      <p className="text-muted-foreground">Processing document...</p>
                    </div>
                  ) : analysis?.structuredData ? (
                    <div className="space-y-6">
                      {/* Document Type Badge */}
                      <div className="flex items-center gap-2">
                        <Badge variant="outline" className="px-3 py-1 text-sm bg-primary/5 border-primary/20 text-primary">
                          <FileCheck className="w-3 h-3 mr-2" />
                          {analysis.structuredData.documentType || "Analyzed Document"}
                        </Badge>
                      </div>

                      {/* Insights List */}
                      {analysis.structuredData.insights && analysis.structuredData.insights.length > 0 && (
                        <div className="bg-muted/30 p-4 rounded-lg border">
                          <h4 className="text-sm font-medium mb-3 flex items-center gap-2">
                            <Lightbulb className="w-4 h-4 text-amber-500" />
                            Key Insights
                          </h4>
                          <ul className="space-y-2">
                            {analysis.structuredData.insights.map((insight: string, i: number) => (
                              <li key={i} className="text-sm text-muted-foreground flex gap-2">
                                <span className="text-primary">•</span>
                                {insight}
                              </li>
                            ))}
                          </ul>
                        </div>
                      )}

                      {/* Weak/Strong Areas for Marksheets */}
                      {(analysis.structuredData.fields?.["Strong Areas"] || analysis.structuredData.fields?.["Weak Areas"]) && (
                        <div className="grid sm:grid-cols-2 gap-4">
                          {analysis.structuredData.fields?.["Strong Areas"] && (
                            <div className="p-4 rounded-lg bg-green-500/5 border border-green-500/10">
                              <h4 className="text-sm font-semibold mb-2 flex items-center gap-2 text-green-700 dark:text-green-400">
                                <TrendingUp className="w-4 h-4" />
                                Strong Areas
                              </h4>
                              <p className="text-sm text-muted-foreground">
                                {Array.isArray(analysis.structuredData.fields["Strong Areas"])
                                  ? analysis.structuredData.fields["Strong Areas"].join(", ")
                                  : analysis.structuredData.fields["Strong Areas"]}
                              </p>
                            </div>
                          )}
                          {analysis.structuredData.fields?.["Weak Areas"] && (
                            <div className="p-4 rounded-lg bg-red-500/5 border border-red-500/10">
                              <h4 className="text-sm font-semibold mb-2 flex items-center gap-2 text-red-700 dark:text-red-400">
                                <TrendingDown className="w-4 h-4" />
                                Areas for Improvement
                              </h4>
                              <p className="text-sm text-muted-foreground">
                                {Array.isArray(analysis.structuredData.fields["Weak Areas"])
                                  ? analysis.structuredData.fields["Weak Areas"].join(", ")
                                  : analysis.structuredData.fields["Weak Areas"]}
                              </p>
                            </div>
                          )}
                        </div>
                      )}

                      {/* Data Fields */}
                      {analysis.structuredData.fields && Object.keys(analysis.structuredData.fields).length > 0 && (
                        <div>
                          <h4 className="text-sm font-medium mb-3">Extracted Data</h4>
                          <div className="grid gap-2">
                            {Object.entries(analysis.structuredData.fields).map(([key, value], i) => {
                              if (key === "Strong Areas" || key === "Weak Areas") return null;
                              // Skip complex objects/arrays in the simple list, handle specifically if needed
                              if (typeof value === 'object' && value !== null) return null;

                              return (
                                <div key={i} className="flex justify-between items-center py-2 border-b last:border-0 border-border/50">
                                  <span className="text-sm text-muted-foreground capitalize">{key.replace(/_/g, ' ')}</span>
                                  <span className="text-sm font-medium">{String(value)}</span>
                                </div>
                              );
                            })}
                          </div>
                        </div>
                      )}
                    </div>
                  ) : (
                    <div className="text-center py-12">
                      <Lightbulb className="w-8 h-8 mx-auto mb-4 text-muted-foreground" />
                      <p className="text-muted-foreground">No specific insights available</p>
                      <p className="text-xs text-muted-foreground mt-2">
                        AI analysis did not detect structured data for this document
                      </p>
                    </div>
                  )}
                </ScrollArea>
              </TabsContent>
            </Tabs>
          </CardContent>
        </Card>

        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="text-base font-medium">Document Info</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex justify-between">
                <span className="text-sm text-muted-foreground">Status</span>
                {getStatusBadge(document.status)}
              </div>
              <div className="flex justify-between">
                <span className="text-sm text-muted-foreground">Size</span>
                <span className="text-sm font-medium">{formatFileSize(document.fileSize)}</span>
              </div>
              {document.pageCount && (
                <div className="flex justify-between">
                  <span className="text-sm text-muted-foreground">Pages</span>
                  <span className="text-sm font-medium">{document.pageCount}</span>
                </div>
              )}
              {document.uploadDate && (
                <div className="flex justify-between">
                  <span className="text-sm text-muted-foreground">Uploaded</span>
                  <span className="text-sm font-medium">
                    {format(new Date(document.uploadDate), "MMM d, yyyy")}
                  </span>
                </div>
              )}
            </CardContent>
          </Card>

          {analysis && (
            <>
              <Card>
                <CardHeader>
                  <CardTitle className="text-base font-medium">Summary</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-muted-foreground leading-relaxed">
                    {analysis.summary || "No summary available"}
                  </p>
                </CardContent>
              </Card>

              {analysis.keywords && analysis.keywords.length > 0 && (
                <Card>
                  <CardHeader>
                    <CardTitle className="text-base font-medium">Keywords</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="flex flex-wrap gap-2">
                      {analysis.keywords.map((keyword, index) => (
                        <Badge key={index} variant="secondary">
                          {keyword}
                        </Badge>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              )}

              <Card>
                <CardHeader>
                  <CardTitle className="text-base font-medium">Statistics</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="flex justify-between">
                    <span className="text-sm text-muted-foreground">Words</span>
                    <span className="text-sm font-medium">
                      {analysis.statistics?.wordCount?.toLocaleString() || 0}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm text-muted-foreground">Characters</span>
                    <span className="text-sm font-medium">
                      {analysis.statistics?.charCount?.toLocaleString() || 0}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm text-muted-foreground">Entities</span>
                    <span className="text-sm font-medium">
                      {analysis.entities ? Object.values(analysis.entities).flat().length : 0}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm text-muted-foreground">Tables</span>
                    <span className="text-sm font-medium">{analysis.tables?.length || 0}</span>
                  </div>
                </CardContent>
              </Card>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

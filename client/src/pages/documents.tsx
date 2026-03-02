import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Link, useLocation } from "wouter";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Progress } from "@/components/ui/progress";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle
} from "@/components/ui/alert-dialog";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  FileText,
  Search,
  Upload,
  Clock,
  CheckCircle2,
  AlertCircle,
  Loader2,
  Filter,
  MessageCircle,
  Trash2,
  Eye,
  Table as TableIcon,
  Users,
  Calendar,
  Building,
  MapPin,
} from "lucide-react";
import type { Document, ExtractedEntity, ExtractedTable } from "@shared/mongo-schema";
import { format } from "date-fns";
import { toast } from "sonner";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

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

function getStatusIcon(status: string) {
  switch (status) {
    case "completed":
      return <CheckCircle2 className="w-5 h-5 text-green-600" />;
    case "processing":
      return <Loader2 className="w-5 h-5 text-blue-600 animate-spin" />;
    case "error":
      return <AlertCircle className="w-5 h-5 text-destructive" />;
    default:
      return <Clock className="w-5 h-5 text-muted-foreground" />;
  }
}

function DocumentAnalysisDialog({
  documentId,
  isOpen,
  onClose
}: {
  documentId: string | null,
  isOpen: boolean,
  onClose: () => void
}) {
  const { data: analysis, isLoading } = useQuery<Document & { extractions: any[] }>({
    queryKey: [`/api/documents/${documentId}/analysis`],
    enabled: !!documentId && isOpen,
  });

  const getEntityIcon = (type: string) => {
    switch (type.toLowerCase()) {
      case 'person': return <Users className="w-4 h-4" />;
      case 'date': return <Calendar className="w-4 h-4" />;
      case 'organization': return <Building className="w-4 h-4" />;
      case 'location': return <MapPin className="w-4 h-4" />;
      default: return <FileText className="w-4 h-4" />;
    }
  };

  console.log('[DEBUG Frontend] Analysis Data received:', analysis);
  console.log('[DEBUG Frontend] Extractions:', analysis?.extractions);

  const entities = analysis?.extractions?.find(e => e.extractionType === 'entities')?.data as ExtractedEntity[] || [];
  const tables = analysis?.extractions?.find(e => e.extractionType === 'tables')?.data as ExtractedTable[] || [];
  const summary = analysis?.extractions?.find(e => e.extractionType === 'summary')?.data as string || "No summary available for this document.";

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[85vh] flex flex-col">
        <DialogHeader>
          <DialogTitle>Document Analysis</DialogTitle>
          <DialogDescription>
            View extracted entities, tables, and summary from {analysis?.originalName}
          </DialogDescription>
        </DialogHeader>

        {isLoading ? (
          <div className="flex items-center justify-center p-8">
            <Loader2 className="w-8 h-8 animate-spin text-primary" />
          </div>
        ) : (
          <Tabs defaultValue="summary" className="flex-1 overflow-hidden flex flex-col">
            <TabsList>
              <TabsTrigger value="summary">Summary</TabsTrigger>
              <TabsTrigger value="entities">Entities ({entities.length})</TabsTrigger>
              <TabsTrigger value="tables">Tables ({tables.length})</TabsTrigger>
            </TabsList>

            <ScrollArea className="flex-1 mt-4">
              <TabsContent value="summary" className="mt-0">
                <div className="p-4 bg-muted/30 rounded-lg">
                  <h3 className="font-medium mb-2 flex items-center gap-2">
                    <FileText className="w-4 h-4 text-primary" />
                    Document Summary
                  </h3>
                  <p className="text-sm leading-relaxed text-muted-foreground">
                    {summary}
                  </p>
                </div>
              </TabsContent>

              <TabsContent value="entities" className="mt-0">
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
                  {entities.length > 0 ? (
                    entities.map((entity, i) => (
                      <div key={i} className="flex items-center gap-3 p-3 rounded border bg-card">
                        <div className="p-2 rounded-full bg-primary/10 text-primary">
                          {getEntityIcon(entity.type)}
                        </div>
                        <div>
                          <p className="font-medium text-sm">{entity.text}</p>
                          <p className="text-xs text-muted-foreground capitalize">{entity.type}</p>
                        </div>
                      </div>
                    ))
                  ) : (
                    <div className="col-span-full text-center py-8 text-muted-foreground">
                      No entities found in this document.
                    </div>
                  )}
                </div>
              </TabsContent>

              <TabsContent value="tables" className="mt-0">
                <div className="space-y-6">
                  {tables.length > 0 ? (
                    tables.map((table, i) => (
                      <div key={i} className="border rounded-lg overflow-hidden">
                        <div className="bg-muted p-2 text-xs font-medium text-muted-foreground border-b uppercase tracking-wider">
                          Table {i + 1}
                        </div>
                        <div className="overflow-x-auto">
                          <table className="w-full text-sm">
                            <thead>
                              <tr className="bg-muted/50">
                                {table.headers?.map((header, h) => (
                                  <th key={h} className="text-left p-3 font-medium text-muted-foreground whitespace-nowrap">
                                    {header}
                                  </th>
                                ))}
                              </tr>
                            </thead>
                            <tbody className="divide-y">
                              {table.rows?.map((row, r) => (
                                <tr key={r} className="hover:bg-muted/50">
                                  {row.map((cell, c) => (
                                    <td key={c} className="p-3 whitespace-nowrap">
                                      {cell}
                                    </td>
                                  ))}
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      </div>
                    ))
                  ) : (
                    <div className="text-center py-8 text-muted-foreground">
                      No tables found in this document.
                    </div>
                  )}
                </div>
              </TabsContent>
            </ScrollArea>
          </Tabs>
        )}
      </DialogContent>
    </Dialog>
  );
}

function DocumentRow({
  doc,
  openDeleteDialog,
  onViewAnalysis
}: {
  doc: Document,
  openDeleteDialog: (doc: Document) => void,
  onViewAnalysis: (doc: Document) => void
}) {
  const formatFileSize = (bytes: number) => {
    if (bytes < 1024) return bytes + " B";
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + " KB";
    return (bytes / (1024 * 1024)).toFixed(1) + " MB";
  };

  return (
    <Link href={`/documents/${(doc as any)._id}`} className="block">
      <div
        key={(doc as any)._id}
        className="flex flex-col sm:flex-row items-start sm:items-center gap-4 p-4 rounded-xl bg-card border hover:border-border hover:bg-muted/50 cursor-pointer transition-all group relative overflow-hidden"
        data-testid={`document-row-${(doc as any)._id}`}
      >
        <div className="w-12 h-12 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0 z-10 border border-transparent">
          <FileText className="w-6 h-6 text-primary" />
        </div>

        <div className="flex-1 min-w-0 z-10">
          <p className="font-medium truncate mb-1 text-lg group-hover:text-primary transition-colors">{doc.originalName}</p>
          <div className="flex items-center flex-wrap gap-x-4 gap-y-1 text-sm text-muted-foreground">
            <span className="flex items-center gap-1">
              <span className="w-1.5 h-1.5 rounded-full bg-primary/40" />
              {formatFileSize(doc.fileSize)}
            </span>
            {doc.pageCount && (
              <span className="flex items-center gap-1">
                <span className="w-1.5 h-1.5 rounded-full bg-primary/40" />
                {doc.pageCount} {doc.pageCount === 1 ? "page" : "pages"}
              </span>
            )}
            <span className="flex items-center gap-1">
              <span className="w-1.5 h-1.5 rounded-full bg-primary/40" />
              {doc.uploadDate && format(new Date(doc.uploadDate), "MMM d, yyyy")}
            </span>
          </div>
        </div>
        <div className="flex items-center gap-3 flex-shrink-0 w-full sm:w-auto z-10">
          <div className="flex-1 sm:flex-none">
            {doc.status === 'processing' && doc.processingProgress ? (
              <div className="flex flex-col gap-1 min-w-[120px]">
                <div className="flex items-center gap-2">
                  <Progress value={doc.processingProgress} className="w-24 h-2 bg-primary/20" />
                  <span className="text-xs text-muted-foreground">{doc.processingProgress}%</span>
                </div>
                {doc.statusMessage && (
                  <span className="text-[10px] text-primary/80 animate-pulse">
                    {doc.statusMessage}
                  </span>
                )}
              </div>
            ) : getStatusBadge(doc.status)}
          </div>
          {getStatusIcon(doc.status)}

          {doc.status === 'completed' && (
            <div className="flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
              <Button
                variant="ghost"
                size="sm"
                className="hover:bg-primary/10 hover:text-primary"
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  onViewAnalysis(doc);
                }}
              >
                <Eye className="w-4 h-4 mr-2" />
                View
              </Button>
              <Link href={`/chat/${(doc as any)._id}`} onClick={(e) => e.stopPropagation()}>
                <Button variant="ghost" size="sm" className="hover:bg-primary/10 hover:text-primary">
                  <MessageCircle className="w-4 h-4 mr-2" />
                  Chat
                </Button>
              </Link>
            </div>
          )}
          <Button
            variant="ghost"
            size="icon"
            className="text-muted-foreground hover:text-destructive hover:bg-destructive/10"
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              openDeleteDialog(doc);
            }}
          >
            <Trash2 className="w-4 h-4" />
          </Button>
        </div>
      </div>
    </Link>
  );
}

export default function Documents() {
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [documentToDelete, setDocumentToDelete] = useState<Document | null>(null);

  // Analysis Dialog State
  const [analysisDocId, setAnalysisDocId] = useState<string | null>(null);
  const [isAnalysisOpen, setIsAnalysisOpen] = useState(false);

  const queryClient = useQueryClient();

  const { data: documents, isLoading } = useQuery<Document[]>({
    queryKey: ["/api/documents"],
    refetchInterval: 5000,
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => fetch(`/api/documents/${id}`, { method: "DELETE" }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/documents"] });
      toast.success("Document deleted successfully");
    },
    onError: () => {
      toast.error("Failed to delete document");
    },
    onSettled: () => {
      setIsDeleteDialogOpen(false);
      setDocumentToDelete(null);
    }
  });

  const openDeleteDialog = (doc: Document) => {
    setDocumentToDelete(doc);
    setIsDeleteDialogOpen(true);
  };

  const handleViewAnalysis = (doc: Document) => {
    setAnalysisDocId((doc as any)._id);
    setIsAnalysisOpen(true);
  };

  const handleDeleteConfirm = () => {
    if (documentToDelete) {
      deleteMutation.mutate((documentToDelete as any)._id);
    }
  };

  const filteredDocuments = documents?.filter(doc => {
    const matchesSearch = doc.originalName.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesStatus = statusFilter === "all" || doc.status === statusFilter;
    return matchesSearch && matchesStatus;
  }).sort((a, b) => new Date(b.uploadDate).getTime() - new Date(a.uploadDate).getTime());

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight" data-testid="text-documents-title">Documents</h1>
          <p className="text-muted-foreground mt-1 text-base">
            Browse and manage your uploaded documents
          </p>
        </div>
        <Link href="/upload">
          <Button data-testid="button-upload-document" className="bg-primary hover:bg-primary/90">
            <Upload className="w-4 h-4 mr-2" />
            Upload Document
          </Button>
        </Link>
      </div>

      <Card className="border shadow-sm">
        <CardHeader className="pb-4 border-b">
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="relative flex-1 group">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                placeholder="Search documents..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10 bg-background border-border"
                data-testid="input-search-documents"
              />
            </div>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-full sm:w-40 bg-background border-border" data-testid="select-status-filter">
                <Filter className="w-4 h-4 mr-2 text-primary" />
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Status</SelectItem>
                <SelectItem value="pending">Pending</SelectItem>
                <SelectItem value="processing">Processing</SelectItem>
                <SelectItem value="completed">Completed</SelectItem>
                <SelectItem value="error">Error</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardHeader>
        <CardContent className="pt-6">
          {isLoading ? (
            <div className="space-y-4">
              {[1, 2, 3, 4, 5].map((i) => (
                <div key={i} className="flex items-center gap-4 p-4 rounded-lg bg-muted/50 animate-pulse">
                  <Skeleton className="w-12 h-12 rounded-lg" />
                  <div className="flex-1 space-y-2">
                    <Skeleton className="h-5 w-64" />
                    <Skeleton className="h-4 w-40" />
                  </div>
                  <Skeleton className="h-6 w-24" />
                </div>
              ))}
            </div>
          ) : filteredDocuments && filteredDocuments.length > 0 ? (
            <div className="space-y-3">
              {filteredDocuments.map((doc) => (
                <DocumentRow
                  key={doc._id}
                  doc={doc}
                  openDeleteDialog={openDeleteDialog}
                  onViewAnalysis={handleViewAnalysis}
                />
              ))}
            </div>
          ) : (
            <div className="text-center py-16">
              <div className="w-20 h-20 rounded-2xl bg-muted/30 flex items-center justify-center mx-auto mb-6 border border-border shadow-[0_0_15px_rgba(0,0,0,0.1)]">
                <FileText className="w-10 h-10 text-muted-foreground" />
              </div>
              <h3 className="text-xl font-medium mb-2">
                {searchQuery || statusFilter !== "all"
                  ? "No documents found"
                  : "No documents yet"
                }
              </h3>
              <p className="text-muted-foreground mb-6 max-w-sm mx-auto">
                {searchQuery || statusFilter !== "all"
                  ? "Try adjusting your search or filter criteria"
                  : "Upload your first PDF to start extracting text and analyzing content"
                }
              </p>
              {!searchQuery && statusFilter === "all" && (
                <Link href="/upload">
                  <Button size="lg" className="bg-primary hover:bg-primary/90">
                    <Upload className="w-5 h-5 mr-2" />
                    Upload Document
                  </Button>
                </Link>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      <AlertDialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <AlertDialogContent className="border shadow-lg">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-red-400">Delete Document?</AlertDialogTitle>
            <AlertDialogDescription>
              This action cannot be undone. This will permanently delete <span className="font-medium text-foreground">"{documentToDelete?.originalName}"</span> and all associated data.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="border-primary/20 hover:bg-primary/10">Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteConfirm}
              disabled={deleteMutation.isPending}
              className="bg-red-500/10 text-red-400 hover:bg-red-500/20 border border-red-500/20"
            >
              {deleteMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : "Delete"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <DocumentAnalysisDialog
        documentId={analysisDocId}
        isOpen={isAnalysisOpen}
        onClose={() => setIsAnalysisOpen(false)}
      />
    </div>
  );
}

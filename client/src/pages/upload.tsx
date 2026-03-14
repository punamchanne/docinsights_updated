import { useState, useCallback } from "react";
import { useDropzone } from "react-dropzone";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { useToast } from "@/hooks/use-toast";
import { isUnauthorizedError } from "@/lib/authUtils";
import {
  Upload as UploadIcon,
  FileText,
  X,
  CheckCircle2,
  AlertCircle,
  Loader2,
  Cloud,
} from "lucide-react";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { useQuery } from "@tanstack/react-query";
import type { Document, ExtractedEntity, ExtractedTable, DocumentAnalysis } from "@shared/mongo-schema";
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
import { Badge } from "@/components/ui/badge";
import { Building, MapPin, Calendar, Banknote, User, Lightbulb, TrendingUp, TrendingDown, FileCheck } from "lucide-react";

interface UploadingFile {
  file: File;
  progress: number;
  status: "uploading" | "processing" | "completed" | "error";
  error?: string;
  documentId?: string;
}

export default function Upload() {
  const [, navigate] = useLocation();
  const [files, setFiles] = useState<UploadingFile[]>([]);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const [showPasswordAlert, setShowPasswordAlert] = useState(false);

  const uploadMutation = useMutation({
    mutationFn: async (file: File) => {
      const formData = new FormData();
      formData.append("file", file);

      const response = await fetch("/api/documents/upload", {
        method: "POST",
        body: formData,
        credentials: "include",
      });

      if (!response.ok) {
        const error = await response.json();
        // Pass the error code if available, otherwise just message
        const err = new Error(error.message || "Upload failed");
        (err as any).code = error.code;
        throw err;
      }

      return response.json();
    },
    onError: (error: Error) => {
      if (isUnauthorizedError(error)) {
        toast({
          title: "Unauthorized",
          description: "You are logged out. Logging in again...",
          variant: "destructive",
        });
        setTimeout(() => {
          window.location.href = "/api/login";
        }, 500);
      }
    },
  });

  const onDrop = useCallback(async (acceptedFiles: File[]) => {
    // Basic validations
    const validFiles = acceptedFiles.filter(file =>
      file.type === "application/pdf" ||
      file.type.startsWith("image/")
    );

    if (validFiles.length === 0) {
      toast({
        title: "Invalid file type",
        description: "Please upload PDF or Image files",
        variant: "destructive",
      });
      return;
    }

    const newFiles: UploadingFile[] = validFiles.map(file => ({
      file,
      progress: 0,
      status: "uploading",
    }));

    setFiles(prev => [...prev, ...newFiles]);

    for (let i = 0; i < validFiles.length; i++) {
      const file = validFiles[i];
      const fileIndex = files.length + i;

      try {
        setFiles(prev => prev.map((f, idx) =>
          idx === fileIndex ? { ...f, progress: 30 } : f
        ));

        const result = await uploadMutation.mutateAsync(file);

        setFiles(prev => prev.map((f, idx) =>
          idx === fileIndex ? {
            ...f,
            progress: 100,
            status: "completed",
            documentId: result._id || result.id, // backend returns _id
          } : f
        ));

        // Use setTimeout to ensure state is updated before invalidating queries
        setTimeout(() => {
          queryClient.invalidateQueries({ queryKey: ["/api/documents"] });
          queryClient.invalidateQueries({ queryKey: ["/api/dashboard/stats"] });
        }, 1000);

        toast({
          title: "Upload successful",
          description: `${file.name} has been uploaded and is being processed`,
        });
      } catch (error: any) {
        setFiles(prev => prev.map((f, idx) =>
          idx === fileIndex ? {
            ...f,
            status: "error",
            error: error instanceof Error ? error.message : "Upload failed",
          } : f
        ));

        if (error?.code === "PASSWORD_PROTECTED" || error?.message?.toLowerCase().includes("password")) {
          setShowPasswordAlert(true);
        }
      }
    }
  }, [files.length, uploadMutation, queryClient, toast]);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      "application/pdf": [".pdf"],
      "image/jpeg": [".jpg", ".jpeg"],
      "image/png": [".png"],
      "image/webp": [".webp"],
    },
    multiple: true,
  });

  const removeFile = (index: number) => {
    setFiles(prev => prev.filter((_, i) => i !== index));
  };

  const formatFileSize = (bytes: number) => {
    if (bytes < 1024) return bytes + " B";
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + " KB";
    return (bytes / (1024 * 1024)).toFixed(1) + " MB";
  };

  return (
    <div className="max-w-4xl mx-auto space-y-8">
      <div className="text-center">
        <h1 className="text-4xl font-bold tracking-tight mb-4" data-testid="text-upload-title">
          Upload Documents
        </h1>
        <p className="text-base text-muted-foreground max-w-2xl mx-auto">
          Upload PDF or Image files to extract text, analyze content, and enable smart Q&A
        </p>
      </div>

      <Card className="card-flat overflow-hidden relative border-dashed">
        <CardContent className="p-8">
          <div
            {...getRootProps()}
            className={`
              relative border-2 border-dashed rounded-xl p-16 text-center cursor-pointer
              transition-all duration-200
              ${isDragActive
                ? "border-primary bg-primary/5"
                : "border-border hover:border-primary/50 hover:bg-muted/50"
              }
            `}
            data-testid="dropzone"
          >
            <input {...getInputProps()} data-testid="input-file" />
            <div className="max-w-md mx-auto relative">
              <div className={`
                w-24 h-24 rounded-2xl mx-auto mb-8 flex items-center justify-center relative z-10
                transition-all duration-200
                ${isDragActive ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground"}
              `}>
                {isDragActive ? (
                  <Cloud className="w-12 h-12" />
                ) : (
                  <UploadIcon className="w-10 h-10" />
                )}
              </div>
              <h3 className="text-xl font-semibold mb-3">
                {isDragActive ? "Drop files now" : "Drag & drop PDF or Image files"}
              </h3>
              <p className="text-muted-foreground mb-8">
                or click to browse from your computer
              </p>
              <Button variant={isDragActive ? "secondary" : "default"} size="lg" type="button">
                Select Files
              </Button>
              <div className="flex items-center justify-center gap-6 mt-8 text-xs text-muted-foreground/60 font-medium">
                <span className="flex items-center gap-1"><CheckCircle2 className="w-3 h-3" /> Max 50MB</span>
                <span className="flex items-center gap-1"><CheckCircle2 className="w-3 h-3" /> PDF, Images</span>
                <span className="flex items-center gap-1"><CheckCircle2 className="w-3 h-3" /> Secure</span>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {files.length > 0 && (
        <Card className="card-flat">
          <CardHeader className="border-b">
            <CardTitle className="text-lg font-medium flex items-center gap-2">
              <Cloud className="w-5 h-5 text-primary" />
              Upload Queue
            </CardTitle>
          </CardHeader>
          <CardContent className="p-6">
            <div className="space-y-4">
              {files.map((uploadFile, index) => (
                <div
                  key={index}
                  className="flex items-center gap-4 p-4 rounded-lg bg-muted/30 border border-transparent hover:border-border transition-all group"
                  data-testid={`upload-item-${index}`}
                >
                  <div className="w-12 h-12 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0">
                    <FileText className="w-6 h-6 text-primary" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-2 mb-2">
                      <p className="font-medium truncate text-foreground">{uploadFile.file.name}</p>
                      <span className="text-xs text-muted-foreground flex-shrink-0 px-2 py-0.5 rounded-full bg-muted">
                        {formatFileSize(uploadFile.file.size)}
                      </span>
                    </div>
                    {uploadFile.status === "uploading" && (
                      <div className="space-y-1.5">
                        <Progress value={uploadFile.progress} className="h-2 bg-muted" />
                        <div className="flex justify-between text-xs">
                          <span className="text-primary">Uploading...</span>
                          <span className="text-muted-foreground">{uploadFile.progress}%</span>
                        </div>
                      </div>
                    )}
                    {uploadFile.status === "processing" && (
                      <div className="flex items-center gap-2 text-xs text-primary font-medium animate-pulse">
                        <Loader2 className="w-3 h-3 animate-spin" />
                        Processing document...
                      </div>
                    )}
                    {uploadFile.status === "completed" && (
                      <div className="flex items-center gap-2 text-xs text-green-400 font-medium">
                        <CheckCircle2 className="w-3 h-3" />
                        Uploaded & Processed
                      </div>
                    )}
                    {uploadFile.status === "error" && (
                      <div className="flex items-center gap-2 text-xs text-red-400 font-medium">
                        <AlertCircle className="w-3 h-3" />
                        {uploadFile.error}
                      </div>
                    )}
                  </div>
                  <div className="flex items-center gap-2 flex-shrink-0">
                    {uploadFile.status === "completed" && uploadFile.documentId && (
                      <Button
                        size="sm"
                        variant="outline"
                        className="hover:bg-primary/10 hover:text-primary transition-colors border-primary/20"
                        onClick={() => navigate(`/documents/${uploadFile.documentId}`)}
                      >
                        Open Full View
                      </Button>
                    )}
                    <Button
                      size="icon"
                      variant="ghost"
                      onClick={() => removeFile(index)}
                      className="text-muted-foreground hover:text-destructive hover:bg-destructive/10 rounded-full"
                    >
                      <X className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Render Inline Analysis for uploaded documents */}
      {files.map((file, index) => {
        if (file.status === "completed" && file.documentId) {
          return (
            <div key={`analysis-${index}`} className="mt-8 animate-in fade-in slide-in-from-bottom-4">
              <InlineDocumentAnalysis documentId={file.documentId} />
            </div>
          );
        }
        return null;
      })}

      {/* Password Protection Warning Dialog */}
      <AlertDialog open={showPasswordAlert} onOpenChange={setShowPasswordAlert}>
        <AlertDialogContent className="border shadow-lg">
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2 text-red-500">
              <AlertCircle className="h-5 w-5" />
              Password Protected File
            </AlertDialogTitle>
            <AlertDialogDescription className="text-base text-muted-foreground">
              The PDF file you are trying to upload is password protected or encrypted.
              <br /><br />
              <span className="text-foreground font-medium">Docinsight cannot process encrypted files</span> for security reasons. Please remove the password protection from the file and try uploading it again.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogAction onClick={() => setShowPasswordAlert(false)} className="bg-destructive hover:bg-destructive/90 text-destructive-foreground">
              Understood
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

// Sub-component to fetch and display the inline analysis
function InlineDocumentAnalysis({ documentId }: { documentId: string }) {
  const { data: document, isLoading } = useQuery<Document & { extractions?: any[], extractedText?: string }>({
    queryKey: [`/api/documents/${documentId}/analysis`],
    refetchInterval: (query) => {
      // Poll every 2 seconds until it's no longer processing
      return (query.state.data?.status === "processing" || !query.state.data) ? 2000 : false;
    },
    enabled: !!documentId,
  });

  console.log(`[Inline Analysis] DocID: ${documentId}, isLoading: ${isLoading}, status: ${document?.status}`);

  if (isLoading || document?.status === "processing") {
    return (
      <Card className="border shadow-sm border-primary/20 bg-primary/5">
        <CardContent className="p-8 text-center space-y-4">
          <Loader2 className="w-8 h-8 animate-spin mx-auto text-primary" />
          <p className="text-primary font-medium animate-pulse">DocInsight is reading and analyzing your document...</p>
        </CardContent>
      </Card>
    );
  }

  if (!document || document.status === "error") {
    return null;
  }

  const analysisExtraction = document.extractions?.find(e => e.extractionType === "analysis");
  const analysis = analysisExtraction?.data as DocumentAnalysis | undefined;
  const tableExtraction = document.extractions?.find(e => e.extractionType === "tables");
  const tables = (tableExtraction?.data as ExtractedTable[] | undefined) || analysis?.tables || [];

  return (
    <Card className="border shadow-lg overflow-hidden">
      <CardHeader className="bg-muted/30 border-b pb-4">
        <div className="flex items-center gap-2">
          <CheckCircle2 className="w-5 h-5 text-green-500" />
          <CardTitle className="text-lg">Extracted Data: {document.originalName}</CardTitle>
        </div>
      </CardHeader>
      <CardContent className="p-0">
        <Tabs defaultValue="insights" className="w-full">
          <div className="border-b px-6 pt-4 bg-muted/10">
            <TabsList className="bg-transparent p-0 h-auto gap-4">
              <TabsTrigger
                value="insights"
                className="data-[state=active]:bg-transparent data-[state=active]:shadow-none border-b-2 border-transparent data-[state=active]:border-primary rounded-none pb-3"
              >
                Key Information
              </TabsTrigger>
              <TabsTrigger
                value="text"
                className="data-[state=active]:bg-transparent data-[state=active]:shadow-none border-b-2 border-transparent data-[state=active]:border-primary rounded-none pb-3"
              >
                Raw Text
              </TabsTrigger>
              <TabsTrigger
                value="tables"
                className="data-[state=active]:bg-transparent data-[state=active]:shadow-none border-b-2 border-transparent data-[state=active]:border-primary rounded-none pb-3"
              >
                Tables ({tables.length})
              </TabsTrigger>
            </TabsList>
          </div>

          <TabsContent value="insights" className="mt-0 p-6">
            {analysis?.structuredData ? (
              <div className="space-y-6">
                <div className="flex items-center gap-2">
                  <Badge variant="outline" className="px-3 py-1 text-sm bg-primary/5 border-primary/20 text-primary">
                    <FileCheck className="w-3 h-3 mr-2" />
                    {analysis.structuredData.documentType || "Analyzed Document"}
                  </Badge>
                </div>

                {analysis.structuredData.insights && analysis.structuredData.insights.length > 0 && (
                  <div className="bg-muted/30 p-4 rounded-lg border border-border/50">
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

                {(analysis.structuredData.fields?.["Strong Areas"] || analysis.structuredData.fields?.["Weak Areas"]) && (
                  <div className="grid sm:grid-cols-2 gap-4">
                    {analysis.structuredData.fields?.["Strong Areas"] && (
                      <div className="p-4 rounded-lg bg-green-500/5 border border-green-500/10">
                        <h4 className="text-sm font-semibold mb-2 flex items-center gap-2 text-green-700 dark:text-green-400">
                          <TrendingUp className="w-4 h-4" /> Strong Areas
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
                          <TrendingDown className="w-4 h-4" /> Areas for Improvement
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

                {analysis.structuredData.fields && Object.keys(analysis.structuredData.fields).length > 0 && (
                  <div className="bg-card border rounded-lg overflow-hidden">
                    <table className="w-full text-sm">
                      <tbody className="divide-y divide-border">
                        {Object.entries(analysis.structuredData.fields).map(([key, value], i) => {
                          if (key === "Strong Areas" || key === "Weak Areas" || typeof value === 'object') return null;
                          return (
                            <tr key={i} className="hover:bg-muted/30">
                              <td className="p-3 font-medium text-muted-foreground w-1/3 bg-muted/10 border-r">{key.replace(/_/g, ' ')}</td>
                              <td className="p-3 text-foreground">{String(value)}</td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            ) : (
              <p className="text-muted-foreground text-center py-8">No structured data found for this document types.</p>
            )}
          </TabsContent>

          <TabsContent value="text" className="mt-0">
            <ScrollArea className="h-[400px] p-6 bg-muted/5">
              <div className="prose prose-sm dark:prose-invert max-w-none whitespace-pre-wrap font-mono text-sm leading-relaxed">
                {document.extractedText || "No text extracted."}
              </div>
            </ScrollArea>
          </TabsContent>
          
          <TabsContent value="tables" className="mt-0">
            <ScrollArea className="h-[400px] p-6">
              {tables && tables.length > 0 ? (
                <div className="space-y-6">
                  {tables.map((table, tableIndex) => (
                    <div key={tableIndex} className="border rounded-lg overflow-hidden">
                      <div className="bg-muted p-2 font-medium text-xs uppercase tracking-wider text-muted-foreground">
                        Table {tableIndex + 1}
                      </div>
                      <div className="overflow-x-auto">
                        <Table>
                          <TableHeader>
                            <TableRow className="bg-muted/30">
                              {table.headers.map((header: string, i: number) => (
                                <TableHead key={i} className="border-r last:border-r-0 whitespace-nowrap">{header}</TableHead>
                              ))}
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            {table.rows.map((row: string[], rowIndex: number) => (
                              <TableRow key={rowIndex}>
                                {row.map((cell: string, cellIndex: number) => (
                                  <TableCell key={cellIndex} className="border-r last:border-r-0 min-w-[120px]">{cell}</TableCell>
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
                <p className="text-muted-foreground text-center py-8">No tables detected in this document.</p>
              )}
            </ScrollArea>
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
}

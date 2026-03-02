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
            documentId: result.id,
          } : f
        ));

        queryClient.invalidateQueries({ queryKey: ["/api/documents"] });
        queryClient.invalidateQueries({ queryKey: ["/api/dashboard/stats"] });

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
          Upload PDF or Image files to extract text, analyze content, and enable AI-powered Q&A
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
                        Processing document AI...
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
                        View
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

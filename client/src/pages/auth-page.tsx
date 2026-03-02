import { useAuth } from "@/hooks/useAuth";
import { useEffect } from "react";
import { useLocation } from "wouter";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { z } from "zod";
import {
    Card,
    CardContent,
    CardDescription,
    CardHeader,
    CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
    Form,
    FormControl,
    FormField,
    FormItem,
    FormLabel,
    FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { InsertUserSchema } from "@shared/mongo-schema";
import { useToast } from "@/hooks/use-toast";
import { Loader2, Shield, FileText, CheckCircle2 } from "lucide-react";

export default function AuthPage() {
    const { user, loginMutation, registerMutation } = useAuth();
    const [, setLocation] = useLocation();

    useEffect(() => {
        if (user) {
            setLocation("/dashboard");
        }
    }, [user, setLocation]);

    const formSchema = InsertUserSchema;
    type FormData = z.infer<typeof formSchema>;

    const loginForm = useForm<FormData>({
        resolver: zodResolver(formSchema),
        defaultValues: {
            username: "",
            password: "",
        },
    });

    const registerForm = useForm<FormData>({
        resolver: zodResolver(formSchema),
        defaultValues: {
            username: "",
            password: "",
            email: "",
            firstName: "",
            lastName: "",
        },
    });

    const onLogin = (data: FormData) => {
        loginMutation.mutate(data);
    };

    const onRegister = (data: FormData) => {
        registerMutation.mutate(data);
    };

    if (user) {
        return null; // Redirecting...
    }

    return (
        <div className="min-h-screen grid lg:grid-cols-2 relative overflow-hidden bg-background">
            <div className="flex items-center justify-center p-8 relative z-10">
                <Card className="w-full max-w-md border shadow-lg">
                    <CardHeader className="space-y-1">
                        <CardTitle className="text-2xl font-bold tracking-tight text-center">
                            Welcome back
                        </CardTitle>
                        <CardDescription className="text-center">
                            Enter your credentials to access your account
                        </CardDescription>
                    </CardHeader>
                    <CardContent>
                        <Tabs defaultValue="login" className="w-full">
                            <TabsList className="grid w-full grid-cols-2 mb-6 bg-muted">
                                <TabsTrigger value="login">Login</TabsTrigger>
                                <TabsTrigger value="register">Register</TabsTrigger>
                            </TabsList>

                            <TabsContent value="login">
                                <Form {...loginForm}>
                                    <form
                                        onSubmit={loginForm.handleSubmit(onLogin)}
                                        className="space-y-4"
                                    >
                                        <FormField
                                            control={loginForm.control}
                                            name="username"
                                            render={({ field }) => (
                                                <FormItem>
                                                    <FormLabel>Username</FormLabel>
                                                    <FormControl>
                                                        <Input placeholder="Enter your username" {...field} className="bg-background/50" />
                                                    </FormControl>
                                                    <FormMessage />
                                                </FormItem>
                                            )}
                                        />
                                        <FormField
                                            control={loginForm.control}
                                            name="password"
                                            render={({ field }) => (
                                                <FormItem>
                                                    <FormLabel>Password</FormLabel>
                                                    <FormControl>
                                                        <Input
                                                            type="password"
                                                            placeholder="••••••••"
                                                            {...field}
                                                            className="bg-background/50"
                                                        />
                                                    </FormControl>
                                                    <FormMessage />
                                                </FormItem>
                                            )}
                                        />
                                        <Button
                                            type="submit"
                                            className="w-full bg-primary hover:bg-primary/90"
                                            disabled={loginMutation.isPending}
                                        >
                                            {loginMutation.isPending && (
                                                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                            )}
                                            Sign In
                                        </Button>
                                    </form>
                                </Form>
                            </TabsContent>

                            <TabsContent value="register">
                                <Form {...registerForm}>
                                    <form
                                        onSubmit={registerForm.handleSubmit(onRegister)}
                                        className="space-y-4"
                                    >
                                        <FormField
                                            control={registerForm.control}
                                            name="username"
                                            render={({ field }) => (
                                                <FormItem>
                                                    <FormLabel>Username</FormLabel>
                                                    <FormControl>
                                                        <Input placeholder="Choose a username" {...field} className="bg-background/50" />
                                                    </FormControl>
                                                    <FormMessage />
                                                </FormItem>
                                            )}
                                        />
                                        <div className="grid grid-cols-2 gap-4">
                                            <FormField
                                                control={registerForm.control}
                                                name="firstName"
                                                render={({ field }) => (
                                                    <FormItem>
                                                        <FormLabel>First Name</FormLabel>
                                                        <FormControl>
                                                            <Input placeholder="John" {...field} value={field.value || ''} className="bg-background/50" />
                                                        </FormControl>
                                                        <FormMessage />
                                                    </FormItem>
                                                )}
                                            />
                                            <FormField
                                                control={registerForm.control}
                                                name="lastName"
                                                render={({ field }) => (
                                                    <FormItem>
                                                        <FormLabel>Last Name</FormLabel>
                                                        <FormControl>
                                                            <Input placeholder="Doe" {...field} value={field.value || ''} className="bg-background/50" />
                                                        </FormControl>
                                                        <FormMessage />
                                                    </FormItem>
                                                )}
                                            />
                                        </div>
                                        <FormField
                                            control={registerForm.control}
                                            name="email"
                                            render={({ field }) => (
                                                <FormItem>
                                                    <FormLabel>Email</FormLabel>
                                                    <FormControl>
                                                        <Input
                                                            type="email"
                                                            placeholder="john@example.com"
                                                            {...field}
                                                            value={field.value || ''}
                                                            className="bg-background/50"
                                                        />
                                                    </FormControl>
                                                    <FormMessage />
                                                </FormItem>
                                            )}
                                        />
                                        <FormField
                                            control={registerForm.control}
                                            name="password"
                                            render={({ field }) => (
                                                <FormItem>
                                                    <FormLabel>Password</FormLabel>
                                                    <FormControl>
                                                        <Input
                                                            type="password"
                                                            placeholder="Create a password"
                                                            {...field}
                                                            className="bg-background/50"
                                                        />
                                                    </FormControl>
                                                    <FormMessage />
                                                </FormItem>
                                            )}
                                        />
                                        <Button
                                            type="submit"
                                            className="w-full bg-primary hover:bg-primary/90 shadow-[0_0_15px_rgba(124,58,237,0.3)]"
                                            disabled={registerMutation.isPending}
                                        >
                                            {registerMutation.isPending && (
                                                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                            )}
                                            Create Account
                                        </Button>
                                    </form>
                                </Form>
                            </TabsContent>
                        </Tabs>
                    </CardContent>
                </Card>
            </div>

            <div className="hidden lg:flex flex-col justify-center bg-muted/20 p-12 relative overflow-hidden border-l">
                <div className="relative z-10 max-w-lg mx-auto">
                    <div className="flex items-center gap-3 mb-8">
                        <div className="w-10 h-10 rounded-xl bg-primary/20 flex items-center justify-center border border-primary/20">
                            <FileText className="w-6 h-6 text-primary" />
                        </div>
                        <h1 className="text-3xl font-bold tracking-tight">DocInsight</h1>
                    </div>

                    <h2 className="text-4xl font-extrabold mb-6 leading-tight">
                        Context-Aware Document <br />
                        <span className="text-primary">
                            Intelligence
                        </span>
                    </h2>

                    <p className="text-lg text-muted-foreground mb-10 leading-relaxed">
                        Join the platform that transforms static documents into interactive knowledge bases.
                        Secure, fast, and powered by advanced AI.
                    </p>

                    <div className="space-y-6">
                        <div className="flex items-start gap-4 p-4 rounded-xl border bg-card hover:bg-muted/50 transition-colors">
                            <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center shrink-0 mt-0.5">
                                <Shield className="w-5 h-5 text-primary" />
                            </div>
                            <div>
                                <h3 className="font-semibold mb-1">Enterprise Security</h3>
                                <p className="text-sm text-muted-foreground">
                                    Bank-grade encryption and strict access controls for your data.
                                </p>
                            </div>
                        </div>

                        <div className="flex items-start gap-4 p-4 rounded-xl border bg-card hover:bg-muted/50 transition-colors">
                            <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center shrink-0 mt-0.5">
                                <CheckCircle2 className="w-5 h-5 text-primary" />
                            </div>
                            <div>
                                <h3 className="font-semibold mb-1">99% Accuracy</h3>
                                <p className="text-sm text-muted-foreground">
                                    State-of-the-art OCR and NLP models ensure precise extraction.
                                </p>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}

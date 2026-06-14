
"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { Eye, EyeOff, Loader2 } from "lucide-react";

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
import { useToast } from "@/hooks/use-toast";
import type { Student } from "@/lib/types";
import { getDb } from "@/lib/firebase";
import { doc, getDoc } from "firebase/firestore";

const studentLoginSchema = z.object({
  studentId: z.string().min(1, { message: "Voter ID is required." }),
});

const adminLoginSchema = z.object({
  username: z.string().min(1, { message: "Username is required." }),
  password: z.string().min(1, { message: "Password is required." }),
});

type AuthFormProps = {
  mode: "student" | "admin";
};

export function AuthForm({ mode }: AuthFormProps) {
  const router = useRouter();
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  const formSchema = mode === "student" ? studentLoginSchema : adminLoginSchema;
  type FormValues = z.infer<typeof formSchema>;

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues:
      mode === "student"
        ? { studentId: "" }
        : { username: "", password: "" },
  });

  const onSubmit = async (values: FormValues) => {
    setIsLoading(true);
    
    try {
        const db = await getDb();
        if (mode === "student") {
            const studentValues = values as z.infer<typeof studentLoginSchema>;
            
            const studentRef = doc(db, "students", studentValues.studentId);
            const studentSnap = await getDoc(studentRef);

            if (studentSnap.exists()) {
              const student = { id: studentSnap.id, ...studentSnap.data() } as Student;
              localStorage.setItem("akhss-evoting-user", JSON.stringify(student));
              toast({
                title: "Login Successful",
                description: `Welcome, Voter ${student.id}!`,
              });
              router.push("/student/dashboard");
            } else {
              toast({
                variant: "destructive",
                title: "Login Failed",
                description: "Invalid Voter ID. Please try again.",
              });
              setIsLoading(false);
            }
        } else { // admin mode
            const adminValues = values as z.infer<typeof adminLoginSchema>;
            
            const adminCredRef = doc(db, "credentials", "admin");
            const adminCredSnap = await getDoc(adminCredRef);

            let passwordIsValid = false;
            // Check if the credentials document exists in Firestore
            if (adminCredSnap.exists()) {
                const adminData = adminCredSnap.data();
                if (adminValues.username.toLowerCase() === adminData.username && adminValues.password === adminData.password) {
                    passwordIsValid = true;
                }
            } else {
                // Fallback to default credentials if the document doesn't exist
                if (adminValues.username.toLowerCase() === 'admin' && adminValues.password === 'password123') {
                    passwordIsValid = true;
                }
            }
            
            if (passwordIsValid) {
              const adminUser = { id: 'A001', name: 'Admin User', classId: 'admin' };
              localStorage.setItem("akhss-evoting-user", JSON.stringify(adminUser));
              toast({
                title: "Admin Login Successful",
                description: "Welcome, Admin!",
              });
              router.push("/admin/dashboard");
            } else {
              toast({
                variant: "destructive",
                title: "Login Failed",
                description: "Invalid username or password.",
              });
              setIsLoading(false);
            }
        }
    } catch (error) {
        console.error("Login error:", error);
        toast({
            variant: "destructive",
            title: "Login Error",
            description: "Could not connect to the server. Please try again later.",
        });
        setIsLoading(false);
    }
  };

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
        {mode === "student" ? (
          <FormField
              control={form.control}
              name="studentId"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Voter ID</FormLabel>
                  <FormControl>
                    <Input placeholder="e.g., AKHSS-12345" {...field} disabled={isLoading}/>
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
        ) : (
          <>
            <FormField
              control={form.control}
              name="username"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Username</FormLabel>
                  <FormControl>
                    <Input placeholder="admin" {...field} disabled={isLoading} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="password"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Password</FormLabel>
                  <FormControl>
                    <div className="relative">
                      <Input
                        type={showPassword ? "text" : "password"}
                        placeholder="••••••••"
                        {...field}
                        disabled={isLoading}
                      />
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        className="absolute inset-y-0 right-0 h-full text-muted-foreground hover:text-foreground"
                        onClick={() => setShowPassword(!showPassword)}
                        disabled={isLoading}
                      >
                        {showPassword ? (
                          <EyeOff className="h-4 w-4" />
                        ) : (
                          <Eye className="h-4 w-4" />
                        )}
                      </Button>
                    </div>
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </>
        )}
        <Button type="submit" className="w-full font-bold" disabled={isLoading}>
          {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
          {isLoading ? "Verifying..." : "Login"}
        </Button>
      </form>
    </Form>
  );
}

    
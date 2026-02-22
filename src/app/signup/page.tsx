"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { signIn } from "next-auth/react";
import { Button } from "~/app/_components/button";

export default function SignUp() {
  const router = useRouter();
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    password: "",
  });
  const [error, setError] = useState("");
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [isLoading, setIsLoading] = useState(false);
  const [touched, setTouched] = useState<Record<string, boolean>>({});

  const validateField = (name: string, value: string): string => {
    switch (name) {
      case "name":
        if (!value.trim()) return "Name is required";
        if (value.trim().length < 2) return "Name must be at least 2 characters";
        return "";
      case "email":
        if (!value) return "Email is required";
        if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)) return "Invalid email format";
        return "";
      case "password":
        if (!value) return "Password is required";
        if (value.length < 6) return "Password must be at least 6 characters";
        if (!/[A-Za-z]/.test(value)) return "Password must contain at least one letter";
        if (!/[0-9]/.test(value)) return "Password should contain at least one number";
        return "";
      default:
        return "";
    }
  };

  const getPasswordStrength = (password: string): { strength: string; color: string } => {
    if (password.length === 0) return { strength: "", color: "" };
    if (password.length < 6) return { strength: "Weak", color: "text-red-600" };
    
    let score = 0;
    if (password.length >= 8) score++;
    if (/[A-Z]/.test(password)) score++;
    if (/[a-z]/.test(password)) score++;
    if (/[0-9]/.test(password)) score++;
    if (/[^A-Za-z0-9]/.test(password)) score++;
    
    if (score >= 4) return { strength: "Strong", color: "text-green-600" };
    if (score >= 2) return { strength: "Medium", color: "text-yellow-600" };
    return { strength: "Weak", color: "text-red-600" };
  };

  const handleBlur = (name: string) => {
    setTouched({ ...touched, [name]: true });
    const error = validateField(name, formData[name as keyof typeof formData]);
    setFieldErrors({ ...fieldErrors, [name]: error });
  };

  const handleChange = (name: string, value: string) => {
    setFormData({ ...formData, [name]: value });
    if (touched[name]) {
      const error = validateField(name, value);
      setFieldErrors({ ...fieldErrors, [name]: error });
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError("");

    // Validate all fields
    const errors: Record<string, string> = {};
    Object.keys(formData).forEach((key) => {
      const error = validateField(key, formData[key as keyof typeof formData]);
      if (error) errors[key] = error;
    });

    if (Object.keys(errors).length > 0) {
      setFieldErrors(errors);
      setTouched({ name: true, email: true, password: true });
      setIsLoading(false);
      return;
    }

    try {
      const response = await fetch("/api/auth/signup", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(formData),
      });

      const data = await response.json();
      console.log("Signup response:", { status: response.ok, statusCode: response.status, data });

      if (response.ok) {
        // Auto-login after successful signup
        const signInResult = await signIn("credentials", {
          redirect: false,
          email: formData.email,
          password: formData.password,
          callbackUrl: "/generator",
        });

        console.log("Auto-login result:", signInResult);

        if (signInResult?.ok) {
          // Wait a moment for session to be properly established
          await new Promise(resolve => setTimeout(resolve, 500));
          // Login successful, redirect to generator
          router.push("/generator");
        } else {
          // Login failed after signup, redirect to login page for manual login
          console.error("Auto-login failed after signup:", signInResult?.error);
          router.push("/login?registered=true");
        }
      } else {
        setError(data.details || data.error || "Failed to create account");
      }
    } catch (err) {
      console.error("Signup error:", err);
      setError("Something went wrong. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <main className="min-h-screen bg-gray-50">
      {/* Navigation */}
      <nav className="border-b border-gray-200 bg-white">
        <div className="container mx-auto flex items-center justify-between px-4 py-3 sm:px-6 sm:py-4">
          <Link href="/" className="flex items-center gap-3">
            <img
              src="/StudyForge-logo.png"
              alt="StudyForge"
              className="h-8 w-8"
            />
            <span className="text-xl font-semibold text-gray-900">StudyForge</span>
          </Link>
          <Link
            href="/login"
            className="text-sm font-medium text-gray-600 transition hover:text-gray-900"
          >
            Already have an account? Log in
          </Link>
        </div>
      </nav>

      {/* Signup Form */}
      <div className="container mx-auto flex min-h-[calc(100vh-80px)] items-center justify-center px-4 py-8 sm:px-6 sm:py-12">
        <div className="w-full max-w-md">
          <div className="mb-8 text-center">
            <h1 className="mb-2 text-3xl font-bold text-gray-900">
              Create your account
            </h1>
            <p className="text-gray-600">
              Start studying smarter with StudyForge
            </p>
          </div>

          <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm sm:p-8">
            <form onSubmit={handleSubmit} className="space-y-6">
              {/* Name */}
              <div>
                <label className="mb-2 block text-sm font-semibold text-gray-900">
                  Name
                </label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => handleChange("name", e.target.value)}
                  onBlur={() => handleBlur("name")}
                  placeholder="John Doe"
                  className={`w-full rounded-lg border px-4 py-3 text-gray-900 focus:outline-none focus:ring-1 ${
                    fieldErrors.name && touched.name
                      ? "border-red-300 focus:border-red-500 focus:ring-red-500"
                      : "border-gray-300 focus:border-blue-500 focus:ring-blue-500"
                  }`}
                />
                {fieldErrors.name && touched.name && (
                  <p className="mt-1 text-sm text-red-600">{fieldErrors.name}</p>
                )}
              </div>

              {/* Email */}
              <div>
                <label className="mb-2 block text-sm font-semibold text-gray-900">
                  Email
                </label>
                <input
                  type="email"
                  value={formData.email}
                  onChange={(e) => handleChange("email", e.target.value)}
                  onBlur={() => handleBlur("email")}
                  placeholder="you@example.com"
                  className={`w-full rounded-lg border px-4 py-3 text-gray-900 focus:outline-none focus:ring-1 ${
                    fieldErrors.email && touched.email
                      ? "border-red-300 focus:border-red-500 focus:ring-red-500"
                      : "border-gray-300 focus:border-blue-500 focus:ring-blue-500"
                  }`}
                />
                {fieldErrors.email && touched.email && (
                  <p className="mt-1 text-sm text-red-600">{fieldErrors.email}</p>
                )}
              </div>

              {/* Password */}
              <div>
                <label className="mb-2 block text-sm font-semibold text-gray-900">
                  Password
                </label>
                <input
                  type="password"
                  value={formData.password}
                  onChange={(e) => handleChange("password", e.target.value)}
                  onBlur={() => handleBlur("password")}
                  placeholder="••••••••"
                  className={`w-full rounded-lg border px-4 py-3 text-gray-900 focus:outline-none focus:ring-1 ${
                    fieldErrors.password && touched.password
                      ? "border-red-300 focus:border-red-500 focus:ring-red-500"
                      : "border-gray-300 focus:border-blue-500 focus:ring-blue-500"
                  }`}
                />
                {fieldErrors.password && touched.password && (
                  <p className="mt-1 text-sm text-red-600">{fieldErrors.password}</p>
                )}
                {formData.password && !fieldErrors.password && (
                  <p className={`mt-1 text-sm font-medium ${getPasswordStrength(formData.password).color}`}>
                    Strength: {getPasswordStrength(formData.password).strength}
                  </p>
                )}
                {!fieldErrors.password && (
                  <p className="mt-1 text-xs text-gray-500">
                    At least 6 characters, include letters and numbers
                  </p>
                )}
              </div>

              {/* Error Message */}
              {error && (
                <div className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-800">
                  {error}
                </div>
              )}

              {/* Submit Button */}
              <Button
                type="submit"
                disabled={isLoading}
                loading={isLoading}
                fullWidth
                size="lg"
              >
                {isLoading ? "Creating account..." : "Sign up"}
              </Button>
            </form>
          </div>

          <p className="mt-6 text-center text-sm text-gray-600">
            By signing up, you agree to our Terms of Service and Privacy Policy
          </p>
        </div>
      </div>
    </main>
  );
}

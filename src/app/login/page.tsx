"use client";

import { Suspense, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { signIn } from "next-auth/react";
import { Button } from "~/app/_components/button";

export default function Login() {
  return (
    <Suspense fallback={<LoginSkeleton />}> 
      <LoginContent />
    </Suspense>
  );
}

function LoginContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const registered = searchParams.get("registered") === "true";
  const fromParam = searchParams.get("from");
  const redirectTarget = fromParam?.startsWith("/") ? fromParam : "/generator";
  const [formData, setFormData] = useState({
    email: "",
    password: "",
  });
  const [error, setError] = useState("");
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [isLoading, setIsLoading] = useState(false);
  const [touched, setTouched] = useState<Record<string, boolean>>({});

  const validateField = (name: string, value: string): string => {
    switch (name) {
      case "email":
        if (!value) return "Email is required";
        if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)) return "Invalid email format";
        return "";
      case "password":
        if (!value) return "Password is required";
        return "";
      default:
        return "";
    }
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
      setTouched({ email: true, password: true });
      setIsLoading(false);
      return;
    }

    try {
      const result = await signIn("credentials", {
        redirect: false,
        email: formData.email,
        password: formData.password,
        callbackUrl: redirectTarget,
      });

      if (result?.ok) {
        router.push(redirectTarget);
        return;
      }

      if (result?.error === "CredentialsSignin") {
        setError("Invalid email or password");
        return;
      }

      if (result?.error === "Configuration") {
        setError("Login configuration error. Please try again later.");
        return;
      }

      setError(result?.error ?? "Unable to log in. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <main className="min-h-screen bg-gray-50">
      <nav className="border-b border-gray-200 bg-white">
        <div className="container mx-auto flex items-center justify-between px-6 py-4">
          <Link href="/" className="flex items-center gap-3">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src="/StudyForge-logo.png"
              alt="StudyForge"
              className="h-8 w-8"
            />
            <span className="text-xl font-semibold text-gray-900">StudyForge</span>
          </Link>
          <Link
            href="/signup"
            className="text-sm font-medium text-gray-600 transition hover:text-gray-900"
          >
            Need an account? Sign up
          </Link>
        </div>
      </nav>

      <div className="container mx-auto flex min-h-[calc(100vh-80px)] items-center justify-center px-6 py-12">
        <div className="w-full max-w-md">
          <div className="mb-8 text-center">
            <h1 className="mb-2 text-3xl font-bold text-gray-900">
              Log in
            </h1>
            <p className="text-gray-600">
              Continue studying with StudyForge
            </p>
          </div>

          {registered && (
            <div className="mb-6 rounded-lg border border-green-200 bg-green-50 p-3 text-sm text-green-800">
              Account created. Please log in.
            </div>
          )}

          <div className="rounded-xl border border-gray-200 bg-white p-8 shadow-sm">
            <form onSubmit={handleSubmit} className="space-y-6">
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
              </div>

              {error && (
                <div className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-800">
                  {error}
                </div>
              )}

              <Button
                type="submit"
                disabled={isLoading}
                loading={isLoading}
                fullWidth
                size="lg"
              >
                {isLoading ? "Logging in..." : "Log in"}
              </Button>
            </form>
          </div>
        </div>
      </div>
    </main>
  );
}

function LoginSkeleton() {
  return (
    <main className="min-h-screen bg-gray-50">
      <nav className="border-b border-gray-200 bg-white">
        <div className="container mx-auto flex items-center justify-between px-6 py-4">
          <div className="flex items-center gap-3">
            <div className="h-8 w-8 rounded-full bg-gray-200" />
            <div className="h-5 w-28 rounded bg-gray-200" />
          </div>
          <div className="h-4 w-36 rounded bg-gray-200" />
        </div>
      </nav>
      <div className="container mx-auto flex min-h-[calc(100vh-80px)] items-center justify-center px-6 py-12">
        <div className="w-full max-w-md">
          <div className="mb-8 space-y-2 text-center">
            <div className="mx-auto h-8 w-32 rounded bg-gray-200" />
            <div className="mx-auto h-4 w-48 rounded bg-gray-200" />
          </div>
          <div className="rounded-xl border border-gray-200 bg-white p-8 shadow-sm">
            <div className="space-y-6">
              <div className="h-11 w-full rounded bg-gray-100" />
              <div className="h-11 w-full rounded bg-gray-100" />
              <div className="h-11 w-full rounded bg-gray-200" />
            </div>
          </div>
        </div>
      </div>
    </main>
  );
}

import AuthForm from "@/components/AuthForm";

export const metadata = { title: "Sign In | Kingdom Companion" };

export default function LoginPage() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-peach-50 to-coral-50 dark:from-zinc-950 dark:to-zinc-900 p-4">
      <AuthForm mode="login" />
    </div>
  );
}

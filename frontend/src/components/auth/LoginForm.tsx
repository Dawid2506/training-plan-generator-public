import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { Link, useNavigate } from "react-router-dom";
import axios from "axios";
import { z } from "zod";

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
import { useAuth } from "@/contexts/AuthContext";
import { useNotifications } from "@/lib/notify";

const FormSchema = z.object({
  username: z.string().min(2, { message: "Username must be at least 2 characters." }),
  password: z.string().min(1, { message: "Password is required." }),
});

export default function LoginForm() {
  const navigate = useNavigate();
  const { notify } = useNotifications();
  const { login } = useAuth();

  const form = useForm<z.infer<typeof FormSchema>>({
    resolver: zodResolver(FormSchema),
    defaultValues: { username: "", password: "" },
  });

  const onSubmit = async (data: z.infer<typeof FormSchema>) => {
    try {
      await login(data.username, data.password);
      notify("Signed in.", "Success");
      navigate("/dashboard");
    } catch (error: unknown) {
      console.error(error);
      const message =
        axios.isAxiosError(error) && error.response?.status === 401
          ? "Invalid username or password"
          : "An error occurred during login";
      notify(message, "Error");
    }
  };

  return (
    <div className="space-y-7">
      <div className="space-y-1.5">
        <h1 className="text-[26px] leading-tight font-semibold tracking-[-0.02em]">
          Welcome back
        </h1>
        <p className="text-[13.5px] text-muted-foreground">
          Sign in to pick up your training where you left off.
        </p>
      </div>

      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
          <FormField
            control={form.control}
            name="username"
            render={({ field }) => (
              <FormItem className="space-y-2">
                <FormLabel>Username</FormLabel>
                <FormControl>
                  <Input
                    data-testid="username"
                    placeholder="you@example.com"
                    autoComplete="username"
                    className="h-10"
                    {...field}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="password"
            render={({ field }) => (
              <FormItem className="space-y-2">
                <FormLabel>Password</FormLabel>
                <FormControl>
                  <Input
                    data-testid="password"
                    type="password"
                    placeholder="••••••••"
                    autoComplete="current-password"
                    className="h-10"
                    {...field}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <Button
            type="submit"
            variant="primary"
            size="lg"
            className="w-full"
            data-testid="login-button"
            disabled={form.formState.isSubmitting}
          >
            {form.formState.isSubmitting ? "Signing in…" : "Sign in"}
          </Button>
        </form>
      </Form>

      <p className="text-center text-[13px] text-muted-foreground">
        Don't have an account?{" "}
        <Link
          data-testid="sign-up-button"
          to="/register"
          className="font-medium text-primary underline-offset-4 hover:underline"
        >
          Create one
        </Link>
      </p>
    </div>
  );
}

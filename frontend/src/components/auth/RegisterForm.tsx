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
import { API_CONFIG, buildApiUrl } from "@/lib/api";
import { useNotifications } from "@/lib/notify";

const FormSchema = z
  .object({
    username: z.string().min(2, { message: "Username must be at least 2 characters." }),
    email: z.string().min(2, { message: "Email must be at least 2 characters." }),
    password: z.string().min(1, { message: "Password is required." }),
    passwordConfirmation: z
      .string()
      .min(1, { message: "Password confirmation is required." }),
  })
  .refine((data) => data.password === data.passwordConfirmation, {
    message: "Passwords must match.",
    path: ["passwordConfirmation"],
  });

export default function RegisterForm() {
  const navigate = useNavigate();
  const { notify } = useNotifications();

  const form = useForm<z.infer<typeof FormSchema>>({
    resolver: zodResolver(FormSchema),
    defaultValues: {
      username: "",
      email: "",
      password: "",
      passwordConfirmation: "",
    },
  });

  const onSubmit = async (data: z.infer<typeof FormSchema>) => {
    try {
      await axios.post(
        buildApiUrl(API_CONFIG.endpoints.auth.register),
        { username: data.username, email: data.email, password: data.password },
        { withCredentials: true },
      );
      navigate("/dashboard");
    } catch (error: unknown) {
      console.error(error);
      const message = axios.isAxiosError(error)
        ? (error.response?.data?.message ?? "Registration failed")
        : "Registration failed";
      notify(message, "Error");
    }
  };

  return (
    <div className="space-y-7">
      <div className="space-y-1.5">
        <h1 className="text-[26px] leading-tight font-semibold tracking-[-0.02em]">
          Create your account
        </h1>
        <p className="text-[13.5px] text-muted-foreground">
          Connect Strava or drop in a FIT file, and start generating plans.
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
                    placeholder="yourname"
                    autoComplete="username"
                    className="h-10"
                    data-testid="register-username"
                    {...field}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="email"
            render={({ field }) => (
              <FormItem className="space-y-2">
                <FormLabel>Email</FormLabel>
                <FormControl>
                  <Input
                    placeholder="you@example.com"
                    autoComplete="email"
                    className="h-10"
                    data-testid="register-email"
                    {...field}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <div className="grid gap-4 sm:grid-cols-2">
            <FormField
              control={form.control}
              name="password"
              render={({ field }) => (
                <FormItem className="space-y-2">
                  <FormLabel>Password</FormLabel>
                  <FormControl>
                    <Input
                      type="password"
                      placeholder="••••••••"
                      autoComplete="new-password"
                      className="h-10"
                      data-testid="register-password"
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="passwordConfirmation"
              render={({ field }) => (
                <FormItem className="space-y-2">
                  <FormLabel>Confirm</FormLabel>
                  <FormControl>
                    <Input
                      type="password"
                      placeholder="••••••••"
                      autoComplete="new-password"
                      className="h-10"
                      data-testid="register-passwordConfirmation"
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>

          <Button
            type="submit"
            variant="primary"
            size="lg"
            className="w-full"
            data-testid="register-submit"
            disabled={form.formState.isSubmitting}
          >
            {form.formState.isSubmitting ? "Creating account…" : "Create account"}
          </Button>
        </form>
      </Form>

      <p className="text-center text-[13px] text-muted-foreground">
        Already have an account?{" "}
        <Link
          to="/login"
          className="font-medium text-primary underline-offset-4 hover:underline"
        >
          Sign in
        </Link>
      </p>
    </div>
  );
}

import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
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
import { Link, useNavigate } from "react-router-dom";
import axios from "axios";
import { useNotifications } from "../common/NotificationsProvider";
import { useAuth } from "@/contexts/AuthContext";

const FormSchema = z.object({
  username: z.string().min(2, {
    message: "Username must be at least 2 characters.",
  }),
  password: z.string().min(1, {
    message: "Password is required.",
  }),
});

const LoginForm: React.FC = () => {
  const navigate = useNavigate();
  const { notify } = useNotifications();
  const { login } = useAuth();

  const form = useForm<z.infer<typeof FormSchema>>({
    resolver: zodResolver(FormSchema),
    defaultValues: {
      username: "",
      password: "",
    },
  });

  async function onSubmit(data: z.infer<typeof FormSchema>) {
    try {
      await login(data.username, data.password);
      notify("Signed in successfully!", "Success");
      navigate("/main");
    } catch (err: unknown) {
      console.error(err);
      let msg = "An error occurred during login";
      if (axios.isAxiosError(err) && err.response?.status === 401) {
        msg = "Invalid username or password";
      }
      notify(msg, "Error");
    }
  }

  return (
    <div className="flex flex-col justify-center items-center h-full w-full">
      <div className="flex justify-center items-center pb-10 w-full">
        <p className="text-4xl">Login</p>
      </div>
      <div className="w-full">
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            <FormField
              control={form.control}
              name="username"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Username</FormLabel>
                  <FormControl>
                    <Input
                      data-testid="username"
                      placeholder="Username"
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
                <FormItem>
                  <FormLabel>Password</FormLabel>
                  <FormControl>
                    <Input
                      data-testid="password"
                      type="password"
                      placeholder="Password"
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <div className="flex justify-end">
              <a href="#" className="text-sm" tabIndex={0}>
                Forgot password?
              </a>
            </div>
            <Button
              variant={"secondary"}
              type="submit"
              className="w-full"
              data-testid="login-button"
            >
              Login
            </Button>
            <div className="flex justify-center">
              <p className="text-sm pr-2">Don't have an account?</p>
              <Link data-testid="sign-up-button" to="/register">
                Sign up
              </Link>
            </div>
          </form>
        </Form>
      </div>
    </div>
  );
};

export default LoginForm;

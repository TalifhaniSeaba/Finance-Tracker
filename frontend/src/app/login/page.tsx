"use client";

import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";

import { login } from "../services/authServices";
import { validateLogin } from "../utils/validators";

export default function LoginPage() {

    const router = useRouter();

    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");

    const [errors, setErrors] = useState({
        email: "",
        password: "",
    });

    const [serverError, setServerError] = useState("");

    const [loading, setLoading] = useState(false);

    async function handleSubmit(
        e: FormEvent<HTMLFormElement>
    ) {
        e.preventDefault();

        setServerError("");

        const validation = validateLogin(
            email,
            password
        );

        setErrors({
            email: validation.email || "",
            password: validation.password || "",
        });

        if (
            validation.email ||
            validation.password
        ) {
            return;
        }

        try {

            setLoading(true);

            const data = await login({
                email,
                password,
            });

            if (data.session?.access_token) {

                localStorage.setItem(
                    "access_token",
                    data.session.access_token
                );

                router.push("/dashboard");
            }

        } catch (error: unknown) {

            const message =
                error instanceof Error
                    ? error.message
                    : "An unknown error occurred";

            setServerError(message);

        } finally {

            setLoading(false);

        }
    }

    return (

        <main>

            <h1>Login</h1>

            <form onSubmit={handleSubmit}>

                <div>
                    <label>Email</label>

                    <input
                        type="email"
                        value={email}
                        onChange={(e) =>
                            setEmail(e.target.value)
                        }
                    />

                    {errors.email && (
                        <p>{errors.email}</p>
                    )}

                </div>

                <div>

                    <label>Password</label>

                    <input
                        type="password"
                        value={password}
                        onChange={(e) =>
                            setPassword(e.target.value)
                        }
                    />

                    {errors.password && (
                        <p>{errors.password}</p>
                    )}

                </div>

                {serverError && (
                    <p>{serverError}</p>
                )}

                <button
                    type="submit"
                    disabled={loading}
                >

                    {loading
                        ? "Logging in..."
                        : "Login"}

                </button>

            </form>

        </main>

    );
}
"use client";

import { FormEvent, useState } from "react";
import Link from "next/link";
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
        <main className="auth-layout">
            <aside className="auth-aside">
                <Link className="brand" href="/">
                    <span className="brand-mark" aria-hidden="true"><span /><span /><span /></span>
                    <span>Finance<span className="brand-accent">.</span></span>
                </Link>
                <div className="auth-aside__content">
                    <p className="eyebrow"><span className="eyebrow__dot" /> Your money, in focus</p>
                    <h2>Good to see you<br /><em>again.</em></h2>
                    <p>Pick up where you left off and keep making confident decisions with a clearer view of your money.</p>
                </div>
                <p className="auth-aside__footer">Track today. Plan tomorrow.</p>
            </aside>

            <section className="auth-page">
                <Link className="auth-mobile-brand brand" href="/">
                    <span className="brand-mark" aria-hidden="true"><span /><span /><span /></span>
                    <span>Finance<span className="brand-accent">.</span></span>
                </Link>
                <div className="auth-heading">
                    <p className="auth-kicker">Welcome back</p>
                    <h1>Log in to your account</h1>
                    <p>Enter your details to access your financial overview.</p>
                </div>

                <form className="auth-form" onSubmit={handleSubmit}>

                <div className="auth-field">
                    <label htmlFor="login-email">Email</label>

                    <input
                        id="login-email"
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

                <div className="auth-field">

                    <label htmlFor="login-password">Password</label>

                    <input
                        id="login-password"
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

                {serverError && <p className="auth-error">{serverError}</p>}

                <button
                    type="submit"
                    disabled={loading}
                >

                    {loading
                        ? "Logging in..."
                        : "Login"}

                </button>

                </form>

                <p className="auth-switch">
                    Don&apos;t have an account? <Link href="/signup">Create one</Link>
                </p>
                <Link className="auth-back" href="/">← Back to home</Link>
            </section>
        </main>
    );
}

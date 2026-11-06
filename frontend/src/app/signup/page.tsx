"use client";

import Link from "next/link";
import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";

import { signup } from "../services/authServices";
import { SignupErrors, validateSignup } from "../utils/validators";

export default function SignupPage() {
    const router = useRouter();

    const [firstName, setFirstName] = useState("");
    const [lastName, setLastName] = useState("");
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [confirmPassword, setConfirmPassword] = useState("");
    const [errors, setErrors] = useState<SignupErrors>({});
    const [serverError, setServerError] = useState("");
    const [loading, setLoading] = useState(false);

    async function handleSubmit(e: FormEvent<HTMLFormElement>) {
        e.preventDefault();
        setServerError("");

        const validation = validateSignup(
            firstName,
            lastName,
            email,
            password,
            confirmPassword
        );
        setErrors(validation);

        if (Object.keys(validation).length > 0) {
            return;
        }

        try {
            setLoading(true);
            await signup({
                first_name: firstName.trim(),
                last_name: lastName.trim(),
                email: email.trim(),
                password,
            });
            router.push("/login?registered=true");
        } catch (error: unknown) {
            setServerError(
                error instanceof Error
                    ? error.message
                    : "Unable to create your account."
            );
        } finally {
            setLoading(false);
        }
    }

    return (
        <main className="auth-layout">
            <aside className="auth-aside auth-aside--signup">
                <Link className="brand" href="/">
                    <span className="brand-mark" aria-hidden="true"><span /><span /><span /></span>
                    <span>FINATS</span>
                </Link>
                <div className="auth-aside__content">
                    <p className="eyebrow"><span className="eyebrow__dot" /> A clearer start</p>
                    <h2>Build a better<br /><em>money habit.</em></h2>
                    <p>Bring your income, spending, goals, and plans together in one calm place.</p>
                </div>
                <p className="auth-aside__footer">Simple tools. Stronger direction.</p>
            </aside>

            <section className="auth-page">
                <Link className="auth-mobile-brand brand" href="/">
                    <span className="brand-mark" aria-hidden="true"><span /><span /><span /></span>
                    <span>FINATS</span>
                </Link>
                <div className="auth-heading">
                    <p className="auth-kicker">Start with clarity</p>
                    <h1>Create your account</h1>
                    <p>Set up your free account and make your money easier to understand.</p>
                </div>

                <form className="auth-form" onSubmit={handleSubmit}>
                <div className="auth-field">
                    <label htmlFor="first-name">First name</label>
                    <input
                        id="first-name"
                        type="text"
                        value={firstName}
                        onChange={(e) => setFirstName(e.target.value)}
                        autoComplete="given-name"
                    />
                    {errors.first_name && <p>{errors.first_name}</p>}
                </div>

                <div className="auth-field">
                    <label htmlFor="last-name">Last name</label>
                    <input
                        id="last-name"
                        type="text"
                        value={lastName}
                        onChange={(e) => setLastName(e.target.value)}
                        autoComplete="family-name"
                    />
                    {errors.last_name && <p>{errors.last_name}</p>}
                </div>

                <div className="auth-field">
                    <label htmlFor="signup-email">Email</label>
                    <input
                        id="signup-email"
                        type="email"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        autoComplete="email"
                    />
                    {errors.email && <p>{errors.email}</p>}
                </div>

                <div className="auth-field">
                    <label htmlFor="signup-password">Password</label>
                    <input
                        id="signup-password"
                        type="password"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        autoComplete="new-password"
                    />
                    {errors.password && <p>{errors.password}</p>}
                </div>

                <div className="auth-field">
                    <label htmlFor="confirm-password">Confirm password</label>
                    <input
                        id="confirm-password"
                        type="password"
                        value={confirmPassword}
                        onChange={(e) => setConfirmPassword(e.target.value)}
                        autoComplete="new-password"
                    />
                </div>

                {serverError && <p className="auth-error">{serverError}</p>}

                <button type="submit" disabled={loading}>
                    {loading ? "Creating account..." : "Sign up"}
                </button>
                </form>

                <p className="auth-switch">
                    Already have an account? <Link href="/login">Log in</Link>
                </p>
                <Link className="auth-back" href="/">← Back to home</Link>
            </section>
        </main>
    );
}

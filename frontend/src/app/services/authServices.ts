import { apiFetch } from "../lib/api";
import {
    LoginRequest,
    loginResponse,
    SignupRequest,
    SignupResponse,
} from "../types/auth";

export async function login(
    credentials: LoginRequest
): Promise<loginResponse> {

    return apiFetch("/api/auth/login", {
        method: "POST",
        body: JSON.stringify(credentials),
    });
}

export async function signup(
    credentials: SignupRequest
): Promise<SignupResponse> {
    return apiFetch("/api/auth/register", {
        method: "POST",
        body: JSON.stringify(credentials),
    });
}

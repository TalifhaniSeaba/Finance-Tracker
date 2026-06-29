import { apiFetch } from "../lib/api";
import { LoginRequest, loginResponse } from "../types/auth";

export async function login(
    credentials: LoginRequest
): Promise<loginResponse> {

    return apiFetch("/auth/login", {
        method: "POST",
        body: JSON.stringify(credentials),
    });
}
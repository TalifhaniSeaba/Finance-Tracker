const BASE_URL = "http://localhost:5000";

export async function apiFetch(
    endpoint: string,
    options?: RequestInit
) {
    const accessToken = typeof window !== "undefined"
        ? localStorage.getItem("access_token")
        : null;

    const response = await fetch(`${BASE_URL}${endpoint}`, {
        headers: {
            "Content-Type": "application/json",
            ...(accessToken ? { Authorization: `Bearer ${accessToken}` } : {}),
            ...(options?.headers || {}),
        },
        ...options,
    });

    const data = await response.json();

    if (!response.ok) {
        throw new Error(data.error || "Something went wrong.");
    }

    return data;
}

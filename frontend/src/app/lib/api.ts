const BASE_URL = "http://localhost:5000";

export async function apiFetch(
    endpoint: string,
    options?: RequestInit
) {
    const response = await fetch(`${BASE_URL}${endpoint}`, {
        headers: {
            "Content-Type": "application/json",
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
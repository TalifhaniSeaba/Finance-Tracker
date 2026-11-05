import { apiFetch } from "../lib/api";
import { login, signup } from "./authServices";

jest.mock("../lib/api", () => ({ apiFetch: jest.fn() }));

const mockedApiFetch = jest.mocked(apiFetch);

describe("auth services", () => {
    beforeEach(() => mockedApiFetch.mockReset());

    it("sends login credentials to the login endpoint", async () => {
        mockedApiFetch.mockResolvedValue({ message: "Login successful" });
        await login({ email: "tali@gmail.com", password: "password123" });
        expect(mockedApiFetch).toHaveBeenCalledWith("/api/auth/login", {
            method: "POST",
            body: JSON.stringify({ email: "tali@gmail.com", password: "password123" }),
        });
    });

    it("sends signup details to the register endpoint", async () => {
        mockedApiFetch.mockResolvedValue({ message: "User registered successfully" });
        await signup({ first_name: "Tali", last_name: "Seaba", email: "tali@gmail.com", password: "password123" });
        expect(mockedApiFetch).toHaveBeenCalledWith("/api/auth/register", {
            method: "POST",
            body: JSON.stringify({ first_name: "Tali", last_name: "Seaba", email: "tali@gmail.com", password: "password123" }),
        });
    });

    it("propagates API errors", async () => {
        mockedApiFetch.mockRejectedValue(new Error("Email address is invalid"));
        await expect(signup({ first_name: "Tali", last_name: "Seaba", email: "invalid", password: "password123" })).rejects.toThrow("Email address is invalid");
    });
});

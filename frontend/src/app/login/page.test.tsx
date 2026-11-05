import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import LoginPage from "./page";
import { login } from "../services/authServices";

const push = jest.fn();

jest.mock("next/navigation", () => ({ useRouter: () => ({ push }) }));
jest.mock("../services/authServices", () => ({ login: jest.fn() }));

const mockedLogin = jest.mocked(login);

describe("LoginPage", () => {
    beforeEach(() => {
        push.mockReset();
        mockedLogin.mockReset();
        window.localStorage.clear();
    });

    it("shows validation errors without calling the API", () => {
        render(<LoginPage />);
        fireEvent.click(screen.getByRole("button", { name: "Login" }));
        expect(screen.getByText("Email is required.")).toBeInTheDocument();
        expect(screen.getByText("Password is required.")).toBeInTheDocument();
        expect(mockedLogin).not.toHaveBeenCalled();
    });

    it("stores the token and redirects after a successful login", async () => {
        mockedLogin.mockResolvedValue({ message: "Login successful", session: { access_token: "access-token", refresh_token: "refresh-token" } });
        render(<LoginPage />);
        fireEvent.change(screen.getByLabelText("Email"), { target: { value: "tali@gmail.com" } });
        fireEvent.change(screen.getByLabelText("Password"), { target: { value: "password123" } });
        fireEvent.click(screen.getByRole("button", { name: "Login" }));
        await waitFor(() => expect(push).toHaveBeenCalledWith("/dashboard"));
        expect(window.localStorage.getItem("access_token")).toBe("access-token");
    });

    it("shows an API error", async () => {
        mockedLogin.mockRejectedValue(new Error("Invalid login credentials"));
        render(<LoginPage />);
        fireEvent.change(screen.getByLabelText("Email"), { target: { value: "tali@gmail.com" } });
        fireEvent.change(screen.getByLabelText("Password"), { target: { value: "password123" } });
        fireEvent.click(screen.getByRole("button", { name: "Login" }));
        expect(await screen.findByText("Invalid login credentials")).toBeInTheDocument();
    });
});

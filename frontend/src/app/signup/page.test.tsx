import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import SignupPage from "./page";
import { signup } from "../services/authServices";

const push = jest.fn();

jest.mock("next/navigation", () => ({ useRouter: () => ({ push }) }));
jest.mock("../services/authServices", () => ({ signup: jest.fn() }));

const mockedSignup = jest.mocked(signup);

describe("SignupPage", () => {
    beforeEach(() => {
        push.mockReset();
        mockedSignup.mockReset();
    });

    it("shows validation errors without calling the API", () => {
        render(<SignupPage />);
        fireEvent.click(screen.getByRole("button", { name: "Sign up" }));
        expect(screen.getByText("First name is required.")).toBeInTheDocument();
        expect(screen.getByText("Last name is required.")).toBeInTheDocument();
        expect(mockedSignup).not.toHaveBeenCalled();
    });

    it("submits signup details and redirects to login", async () => {
        mockedSignup.mockResolvedValue({ message: "User registered successfully" });
        render(<SignupPage />);
        fireEvent.change(screen.getByLabelText("First name"), { target: { value: "Tali" } });
        fireEvent.change(screen.getByLabelText("Last name"), { target: { value: "Seaba" } });
        fireEvent.change(screen.getByLabelText("Email"), { target: { value: "tali@gmail.com" } });
        fireEvent.change(screen.getByLabelText("Password"), { target: { value: "password123" } });
        fireEvent.change(screen.getByLabelText("Confirm password"), { target: { value: "password123" } });
        fireEvent.click(screen.getByRole("button", { name: "Sign up" }));
        await waitFor(() => expect(push).toHaveBeenCalledWith("/login?registered=true"));
        expect(mockedSignup).toHaveBeenCalledWith({ first_name: "Tali", last_name: "Seaba", email: "tali@gmail.com", password: "password123" });
    });

    it("shows an API error", async () => {
        mockedSignup.mockRejectedValue(new Error("Email address is invalid"));
        render(<SignupPage />);
        fireEvent.change(screen.getByLabelText("First name"), { target: { value: "Tali" } });
        fireEvent.change(screen.getByLabelText("Last name"), { target: { value: "Seaba" } });
        fireEvent.change(screen.getByLabelText("Email"), { target: { value: "tali@gmail.com" } });
        fireEvent.change(screen.getByLabelText("Password"), { target: { value: "password123" } });
        fireEvent.change(screen.getByLabelText("Confirm password"), { target: { value: "password123" } });
        fireEvent.click(screen.getByRole("button", { name: "Sign up" }));
        expect(await screen.findByText("Email address is invalid")).toBeInTheDocument();
    });
});

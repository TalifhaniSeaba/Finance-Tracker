import { validateLogin, validateSignup } from "./validators";

describe("validateLogin", () => {
    it("accepts a valid email and password", () => {
        expect(validateLogin("tali@gmail.com", "password123")).toEqual({});
    });

    it("reports invalid login fields", () => {
        expect(validateLogin("not-an-email", "short")).toEqual({
            email: "Please enter a valid email.",
            password: "Password must be at least 8 characters.",
        });
    });
});

describe("validateSignup", () => {
    it("accepts a complete signup form", () => {
        expect(validateSignup("Tali", "Seaba", "tali@gmail.com", "password123", "password123")).toEqual({});
    });

    it("reports missing names and mismatched passwords", () => {
        expect(validateSignup("", "", "tali@gmail.com", "password123", "different")).toEqual({
            first_name: "First name is required.",
            last_name: "Last name is required.",
            password: "Passwords do not match.",
        });
    });
});

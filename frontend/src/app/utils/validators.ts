export interface LoginErrors {
    email?: string;
    password?: string;
}

export function validateLogin(
    email: string,
    password: string
): LoginErrors {

    const errors: LoginErrors = {};

    if (!email.trim()) {
        errors.email = "Email is required.";
    } else if (
        !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)
    ) {
        errors.email = "Please enter a valid email.";
    }

    if (!password) {
        errors.password = "Password is required.";
    } else if (password.length < 8) {
        errors.password =
            "Password must be at least 8 characters.";
    }

    return errors;
}
export interface LoginErrors {
    email?: string;
    password?: string;
}

export interface SignupErrors extends LoginErrors {
    first_name?: string;
    last_name?: string;
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

export function validateSignup(
    firstName: string,
    lastName: string,
    email: string,
    password: string,
    confirmPassword: string
): SignupErrors {
    const errors: SignupErrors = {};

    if (!firstName.trim()) {
        errors.first_name = "First name is required.";
    }

    if (!lastName.trim()) {
        errors.last_name = "Last name is required.";
    }

    const loginErrors = validateLogin(email, password);
    Object.assign(errors, loginErrors);

    if (password && confirmPassword !== password) {
        errors.password = "Passwords do not match.";
    } else if (!confirmPassword) {
        errors.password = errors.password || "Please confirm your password.";
    }

    return errors;
}

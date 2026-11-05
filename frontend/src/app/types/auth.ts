export interface LoginRequest{
    email: string;
    password:string;
}

export interface SignupRequest {
    email: string;
    password: string;
    first_name: string;
    last_name: string;
}

export interface loginResponse{
    message: string;

    user?: {
        id: string;
        email:string;
    };

    session?:{
        access_token:string;
        refresh_token:string;
    };

    error?: string;
    
}

export interface SignupResponse {
    message: string;
    user?: {
        id: string;
        email: string;
    };
    error?: string;
}

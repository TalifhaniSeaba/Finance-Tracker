export interface LoginRequest{
    email: string;
    password:string;
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
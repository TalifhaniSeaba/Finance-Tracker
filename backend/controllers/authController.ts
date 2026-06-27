import { Request, Response } from "express";
import { supabase } from "../src/config/supabase";


export const register = async (req: Request, res: Response) => {
  const { email, password, first_name, last_name } = req.body;

  try {
    if (!email || !password) {
      return res.status(400).json({
        error: "Email and password are required",
      });
    }

    const { data, error } = await supabase.auth.signUp({
      email,
      password,
    });

    if (error || !data.user) {
      return res.status(400).json({
        error: error?.message || "User creation failed",
      });
    }

    const user = data.user;

    const { error: profileError } = await supabase.from("profiles").insert([
      {
        id: user.id,
        first_name: first_name || "",
        last_name: last_name || "",
        role: "user",
      },
    ]);

    if (profileError) {
      return res.status(500).json({
        error: profileError.message,
      });
    }

    return res.status(201).json({
      message: "User registered successfully",
      user: {
        id: user.id,
        email: user.email,
      },
    });
  } catch (err: any) {
    return res.status(500).json({
      error: err.message,
    });
  }
};

export const login = async (req: Request, res: Response) => {
  const { email, password } = req.body;

  try {
    if (!email || !password) {
      return res.status(400).json({
        error: "Email and password are required",
      });
    }

    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (error) {
      return res.status(401).json({
        error: error.message,
      });
    }

    return res.status(200).json({
      message: "Login successful",
      user: data.user,
      session: data.session,
    });
  } catch (err: any) {
    return res.status(500).json({
      error: err.message,
    });
  }
};

export const logout = async (_req: Request, res: Response) => {
  try {
    const { error } = await supabase.auth.signOut();

    if (error) {
      return res.status(400).json({
        error: error.message,
      });
    }

    return res.status(200).json({
      message: "Logged out successfully",
    });
  } catch (err: any) {
    return res.status(500).json({
      error: err.message,
    });
  }
};


export const getCurrentUser = async (req: Request, res: Response) => {
  try {
    const authHeader = req.headers.authorization;

    if (!authHeader) {
      return res.status(401).json({
        error: "Authorization header missing",
      });
    }

    const token = authHeader.replace("Bearer ", "");

    const { data, error } = await supabase.auth.getUser(token);

    if (error || !data.user) {
      return res.status(401).json({
        error: error?.message || "Invalid token",
      });
    }

    return res.status(200).json({
      user: data.user,
    });
  } catch (err: any) {
    return res.status(500).json({
      error: err.message,
    });
  }
};
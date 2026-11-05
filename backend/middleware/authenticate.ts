import { Request, Response, NextFunction } from "express";
import { supabase } from "../src/config/supabase";
import type { User } from "@supabase/supabase-js";


export interface AuthRequest extends Request {
  user?: User;
}

export const authenticate = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
) => {
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
        error: "Invalid or expired token",
      });
    }

  
    req.user = data.user;

    next();
  } catch (err: unknown) {

    const errorMessage =
      err instanceof Error ? err.message : "An unknown error occurred";
    return res.status(500).json({
      message: errorMessage,
    });
  }
};
import jwt from "jsonwebtoken";
import bcrypt from "bcryptjs";
import { env, UserRole } from "../config";

export interface IJwtPayload {
  userId: string;
  phone: string;
  role: UserRole;
  iat?: number;
  exp?: number;
}

export const hashPassword = async (password: string): Promise<string> => {
  const saltRounds = 10;
  return bcrypt.hash(password, saltRounds);
};

export const comparePassword = async (
  plainPassword: string,
  hashedPassword: string,
): Promise<boolean> => {
  return bcrypt.compare(plainPassword, hashedPassword);
};

export const generateToken = (payload: IJwtPayload): string => {
  return jwt.sign(
    {
      userId: payload.userId,
      phone: payload.phone,
      role: payload.role,
    },
    env.jwtSecret,
    {
      expiresIn: env.jwtExpiresIn as any,
    },
  );
};

export const verifyToken = (token: string): IJwtPayload | null => {
  try {
    const decoded = jwt.verify(token, env.jwtSecret) as IJwtPayload;
    return decoded;
  } catch (error) {
    console.error("Token verification error:", error);
    return null;
  }
};

export const extractTokenFromHeader = (
  authHeader: string | undefined,
): string | null => {
  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return null;
  }
  return authHeader.slice(7);
};

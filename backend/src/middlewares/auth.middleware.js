import jwt from "jsonwebtoken";
import prisma from "../config/prisma.js";
import ApiError from "../utils/ApiError.js";

const JWT_SECRET = process.env.JWT_SECRET;

/**
 * authenticate — verifies JWT from httpOnly cookie, attaches req.user.
 * Throws ApiError(401) if token is missing, invalid, or user is inactive.
 */
export const authenticate = async (req, _res, next) => {
  try {
    const token = req.cookies?.token;

    if (!token) {
      throw new ApiError(401, "Authentication required. Please log in.");
    }

    let decoded;
    try {
      decoded = jwt.verify(token, JWT_SECRET);
    } catch {
      throw new ApiError(401, "Invalid or expired token. Please log in again.");
    }

    const user = await prisma.user.findUnique({
      where: { id: decoded.id },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        isActive: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    if (!user) {
      throw new ApiError(401, "User not found. Please log in again.");
    }

    if (!user.isActive) {
      throw new ApiError(401, "Account is deactivated. Contact an administrator.");
    }

    req.user = user;
    next();
  } catch (err) {
    next(err);
  }
};

/**
 * authorize — restricts access to specific roles.
 * Must be used AFTER authenticate middleware.
 * @param  {...string} allowedRoles - Roles that are permitted access
 */
export const authorize = (...allowedRoles) => {
  return (req, _res, next) => {
    if (!req.user) {
      return next(new ApiError(401, "Authentication required."));
    }

    if (!allowedRoles.includes(req.user.role)) {
      return next(
        new ApiError(403, `Access denied. Required role(s): ${allowedRoles.join(", ")}`)
      );
    }

    next();
  };
};

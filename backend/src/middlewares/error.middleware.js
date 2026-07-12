import ApiError from "../utils/ApiError.js";

const errorHandler = (err, req, res, next) => {
    let error = err;

    // PRISMA ERRORS
    if (err.code) {
        switch (err.code) {
            case "P2002": {
                const field = err.meta?.target?.[0] || "field";
                error = new ApiError(409, `A record with this ${field} already exists`);
                break;
            }
            case "P2025":
                error = new ApiError(404, err.meta?.cause || "Record not found");
                break;
            case "P2003":
                error = new ApiError(400, "Related record does not exist");
                break;
            case "P2011":
                error = new ApiError(400, "Required field is missing");
                break;
            default:
                error = new ApiError(500, "Database error. Please try again later.");
                break;
        }
    }

    // CORS ERRORS
    if (err.message?.startsWith("CORS:")) {
        error = new ApiError(403, err.message);
    }

    // MULTER ERRORS
    if (err.name === "MulterError") {
        error = err.code === "LIMIT_FILE_SIZE"
            ? new ApiError(400, "File is too large. Maximum size is 5MB.")
            : new ApiError(400, `Upload error: ${err.message}`);
    }

    if (!(error instanceof ApiError)) {
        error = new ApiError(error.statusCode || 500, error.message || "Internal Server Error");
    }

    if (process.env.NODE_ENV === "development") {
        console.error(`[ERROR] ${req.method} ${req.originalUrl}:`, err);
    }

    return res.status(error.statusCode).json({
        success: false,
        message: error.message,
        errors:  error.errors?.length ? error.errors : undefined,
        stack:   process.env.NODE_ENV === "development" ? error.stack : undefined,
    });
};

export default errorHandler;
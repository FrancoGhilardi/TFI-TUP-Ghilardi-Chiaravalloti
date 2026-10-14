import { libreria } from "./libreria.schema.js";

export const userRole = libreria.enum("user_role", ["ADMIN", "SELLER"]);
export const imageStatus = libreria.enum("image_status", ["PENDING", "PROCESSED", "FAILED"]);

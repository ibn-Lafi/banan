export class ApiError extends Error {
  status: number;
  code: string;

  constructor(status: number, code: string, message: string) {
    super(message);
    this.status = status;
    this.code = code;
  }

  static badRequest(message: string, code = "bad_request") {
    return new ApiError(400, code, message);
  }
  static unauthorized(message = "غير مصرح بالدخول") {
    return new ApiError(401, "unauthorized", message);
  }
  static forbidden(message = "لا تملك صلاحية القيام بهذا الإجراء") {
    return new ApiError(403, "forbidden", message);
  }
  static notFound(message = "العنصر غير موجود") {
    return new ApiError(404, "not_found", message);
  }
  static conflict(message: string) {
    return new ApiError(409, "conflict", message);
  }
}

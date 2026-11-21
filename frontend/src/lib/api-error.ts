export class ApiError extends Error {
  constructor(
    public status: number,
    public code: string,
    message: string,
  ) {
    super(message);
    this.name = "ApiError";
  }
}
export function toApiError(error: unknown): ApiError {
  if (error instanceof ApiError) return error;
  if (error instanceof SyntaxError)
    return new ApiError(
      0,
      "INVALID_RESPONSE",
      "Phản hồi từ máy chủ không đúng định dạng JSON.",
    );
  if (error instanceof Error)
    return new ApiError(
      0,
      "NETWORK_ERROR",
      error.message || "Không thể kết nối đến máy chủ.",
    );
  return new ApiError(
    0,
    "UNKNOWN_ERROR",
    "Có lỗi không xác định. Vui lòng thử lại.",
  );
}

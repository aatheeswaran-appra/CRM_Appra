import logging
from http import HTTPStatus

from fastapi import FastAPI, Request
from fastapi.exceptions import RequestValidationError
from fastapi.responses import JSONResponse
from sqlalchemy.exc import DBAPIError, IntegrityError
from starlette.exceptions import HTTPException

logger = logging.getLogger("appra.errors")


def error_response(status: int, message: str | list[str]) -> JSONResponse:
    return JSONResponse(
        status_code=status,
        content={"statusCode": status, "message": message, "error": HTTPStatus(status).phrase},
    )


def register_errors(app: FastAPI) -> None:
    @app.exception_handler(RequestValidationError)
    async def validation_error(_request: Request, exc: RequestValidationError) -> JSONResponse:
        messages = [
            f"{'.'.join(str(part) for part in item['loc'])}: {item['msg']}" for item in exc.errors()
        ]
        return error_response(400, messages)

    @app.exception_handler(HTTPException)
    async def http_error(_request: Request, exc: HTTPException) -> JSONResponse:
        response = error_response(exc.status_code, str(exc.detail))
        if exc.headers:
            response.headers.update(exc.headers)
        return response

    @app.exception_handler(DBAPIError)
    async def database_error(_request: Request, exc: DBAPIError) -> JSONResponse:
        sqlstate = getattr(exc.orig, "sqlstate", None)
        if sqlstate in {"40001", "40P01"}:
            return error_response(
                409, "The record changed concurrently. Please retry the operation."
            )
        if isinstance(exc, IntegrityError) and sqlstate == "23503":
            return error_response(404, "The related customer was not found.")
        if isinstance(exc, IntegrityError) and sqlstate == "23505":
            return error_response(409, "The operation conflicts with an existing record.")
        logger.error("Database operation failed (%s).", type(exc).__name__)
        return error_response(500, "An unexpected server error occurred.")

    @app.exception_handler(Exception)
    async def unexpected_error(_request: Request, exc: Exception) -> JSONResponse:
        # Never include exception text, SQL, connection URLs, or stack traces in responses/logs.
        logger.error("Request failed (%s).", type(exc).__name__)
        return error_response(500, "An unexpected server error occurred.")

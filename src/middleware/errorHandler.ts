import { Request, Response, NextFunction } from 'express';

// Меняем тип err на any (или Error | CustomError), так как ошибка может быть системной
export const errorHandler = (err: any, req: Request, res: Response, next: NextFunction) => {
  // 1. Пытаемся взять статус из CustomError. Если его нет - ставим 500
  const status = err.HttpStatusCode || 500;

  // 2. Пытаемся взять красивый JSON из CustomError. Если его нет - собираем вручную
  const responseData = err.JSON || {
    message: err.message || 'Произошла непредвиденная ошибка на сервере',
    error: err, // Опционально: выводит детали ошибки в Postman для удобства дебага
  };

  return res.status(status).json(responseData);
};

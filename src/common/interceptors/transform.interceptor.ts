import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
} from '@nestjs/common';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import { ApiResponse } from '../interfaces/api-response.interface';

@Injectable()
export class TransformInterceptor<T>
  implements NestInterceptor<T, ApiResponse<T>>
{
  intercept(
    context: ExecutionContext,
    next: CallHandler,
  ): Observable<ApiResponse<T>> {
    return next.handle().pipe(
      map((response) => {
        // If already structured with success, return directly
        if (
          response &&
          typeof response === 'object' &&
          'success' in response &&
          typeof response.success === 'boolean'
        ) {
          return response;
        }

        // If returned object has { message, data }, preserve message and unpack data
        if (
          response &&
          typeof response === 'object' &&
          'message' in response &&
          'data' in response
        ) {
          return {
            success: true,
            message: response.message,
            data: response.data,
          };
        }

        // If returned object has only message
        if (
          response &&
          typeof response === 'object' &&
          'message' in response &&
          Object.keys(response).length === 1
        ) {
          return {
            success: true,
            message: response.message,
          };
        }

        return {
          success: true,
          message: 'Operation completed successfully',
          data: response,
        };
      }),
    );
  }
}

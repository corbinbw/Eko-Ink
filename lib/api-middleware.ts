import { NextRequest, NextResponse } from 'next/server';
import { validateApiKey, hasScope, checkMonthlyLimit } from './api-keys';

export interface ApiContext {
  accountId: string;
  userId: string | null;
  scopes: string[];
  account: {
    company_name: string;
    billing_type: string;
    api_monthly_limit: number;
  };
}

export type ApiHandler = (
  request: NextRequest,
  context: ApiContext,
  params?: any
) => Promise<Response>;

/**
 * Middleware to authenticate and authorize API requests
 */
export async function withApiAuth(
  request: NextRequest,
  handler: ApiHandler,
  options: {
    requiredScope?: string;
    params?: any;
  } = {}
): Promise<Response> {
  // 1. Extract API key from Authorization header
  const authHeader = request.headers.get('Authorization');
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return NextResponse.json(
      {
        error: 'Unauthorized',
        message: 'Missing or invalid Authorization header. Use: Authorization: Bearer sk_live_xxx',
      },
      { status: 401 }
    );
  }

  const apiKey = authHeader.replace('Bearer ', '').trim();

  // 2. Validate API key
  const validation = await validateApiKey(apiKey);
  if (!validation.valid || !validation.apiKey) {
    return NextResponse.json(
      {
        error: 'Unauthorized',
        message: validation.error || 'Invalid API key',
      },
      { status: 401 }
    );
  }

  const { apiKey: keyData } = validation;

  // 3. Check required scope if specified
  if (options.requiredScope && !hasScope(keyData.scopes, options.requiredScope)) {
    return NextResponse.json(
      {
        error: 'Forbidden',
        message: `This API key does not have the required scope: ${options.requiredScope}`,
        available_scopes: keyData.scopes,
      },
      { status: 403 }
    );
  }

  // 4. Check monthly usage limit (only for card-sending operations)
  if (options.requiredScope === 'notes:send') {
    const limitCheck = await checkMonthlyLimit(keyData.account_id);
    if (!limitCheck.withinLimit) {
      return NextResponse.json(
        {
          error: 'Monthly limit exceeded',
          message: `You have reached your monthly limit of ${limitCheck.limit} cards. Current usage: ${limitCheck.usage}`,
          limit: limitCheck.limit,
          usage: limitCheck.usage,
        },
        { status: 429 }
      );
    }
  }

  // 5. Build context
  const context: ApiContext = {
    accountId: keyData.account_id,
    userId: keyData.user_id,
    scopes: keyData.scopes,
    account: keyData.account,
  };

  // 6. Call the handler
  try {
    return await handler(request, context, options.params);
  } catch (error) {
    console.error('API handler error:', error);
    return NextResponse.json(
      {
        error: 'Internal server error',
        message: error instanceof Error ? error.message : 'An unexpected error occurred',
      },
      { status: 500 }
    );
  }
}

/**
 * Get the required scope for a given endpoint and method
 */
export function getRequiredScope(path: string, method: string): string {
  // Map routes to required scopes
  const scopeMap: Record<string, string> = {
    'POST /api/v1/deals': 'deals:create',
    'GET /api/v1/deals': 'deals:read',
    'GET /api/v1/deals/:id': 'deals:read',
    'PATCH /api/v1/deals/:id': 'deals:write',

    'GET /api/v1/notes/:id': 'notes:read',
    'PATCH /api/v1/notes/:id': 'notes:write',
    'POST /api/v1/notes/:id/approve': 'notes:write',
    'POST /api/v1/notes/:id/send': 'notes:send',

    'GET /api/v1/account/usage': 'account:read',
    'GET /api/v1/account/credits': 'account:read',
  };

  // Normalize path (remove IDs)
  const normalizedPath = path.replace(/\/[0-9a-f-]{36}/gi, '/:id');
  const key = `${method} ${normalizedPath}`;

  return scopeMap[key] || 'unknown';
}

/**
 * Standard API error response
 */
export function apiError(message: string, status: number = 400, details?: any): Response {
  return NextResponse.json(
    {
      error: true,
      message,
      ...(details && { details }),
    },
    { status }
  );
}

/**
 * Standard API success response
 */
export function apiSuccess(data: any, status: number = 200): Response {
  return NextResponse.json(
    {
      success: true,
      data,
    },
    { status }
  );
}

/**
 * Validate request body against a schema
 */
export async function validateRequestBody<T>(
  request: NextRequest,
  validator: (data: any) => { success: boolean; data?: T; error?: any }
): Promise<{ valid: true; data: T } | { valid: false; response: Response }> {
  try {
    const body = await request.json();
    const result = validator(body);

    if (!result.success) {
      return {
        valid: false,
        response: apiError('Invalid request body', 400, result.error),
      };
    }

    return {
      valid: true,
      data: result.data!,
    };
  } catch (error) {
    return {
      valid: false,
      response: apiError('Invalid JSON in request body', 400),
    };
  }
}

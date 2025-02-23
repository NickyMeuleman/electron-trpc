import type { AnyRouter, inferRouterContext, inferRouterError, ProcedureType } from '@trpc/server';
import { callProcedure, getErrorFromUnknown, transformTRPCResponse, TRPCError } from '@trpc/server';
import { TRPCResponse, TRPCErrorResponse, TRPCResultResponse } from '@trpc/server/rpc';

export async function resolveIPCResponse<TRouter extends AnyRouter>({
  createContext,
  type,
  input,
  path,
  router,
}: {
  createContext?: () => inferRouterContext<TRouter> | Promise<inferRouterContext<TRouter>>;
  input?: unknown;
  type: ProcedureType;
  path: string;
  router: TRouter;
}): Promise<TRPCResponse> {
  type TRouterResponse = TRPCErrorResponse<inferRouterError<TRouter>> | TRPCResultResponse<unknown>;

  let ctx: inferRouterContext<TRouter> | undefined = undefined;

  let json: TRouterResponse;
  try {
    if (type === 'subscription') {
      throw new TRPCError({
        message: `Unexpected operation ${type}`,
        code: 'METHOD_NOT_SUPPORTED',
      });
    }

    ctx = await createContext?.();

    const deserializedInput =
      typeof input !== 'undefined' ? router._def.transformer.input.deserialize(input) : input;

    const output = await callProcedure({
      ctx,
      router: router as any,
      path,
      input: deserializedInput,
      type,
    });

    json = {
      id: null,
      result: {
        type: 'data',
        data: output,
      },
    };
  } catch (cause) {
    const error = getErrorFromUnknown(cause);

    json = {
      id: null,
      error: router.getErrorShape({
        error,
        type,
        path,
        input,
        ctx,
      }),
    };
  }

  return transformTRPCResponse(router, json) as TRPCResponse;
}

import { ACTIONS_CORS_HEADERS, type ActionsJson } from "@solana/actions";

const payload: ActionsJson = {
  rules: [
    {
      pathPattern: "/p/*",
      apiPath: "/api/actions/tip/*",
    },
    {
      pathPattern: "/api/actions/**",
      apiPath: "/api/actions/**",
    },
  ],
};

export function GET() {
  return Response.json(payload, { headers: ACTIONS_CORS_HEADERS });
}

export const OPTIONS = GET;

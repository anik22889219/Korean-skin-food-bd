# Korean Skin Food BD — Express MCP Server

This MCP endpoint is hosted by the existing Express application at `POST /mcp` (Streamable HTTP, stateless).

## Security
- Requires `Authorization: Bearer <MCP_API_KEY>`.
- Set `MCP_API_KEY` to a random secret with at least 32 characters in the Express hosting environment.
- Never commit the key or paste it into GitHub issues/chat.
- Optional `MCP_ALLOWED_ORIGINS`: comma-separated exact browser origins. Requests without an Origin header are accepted for server-to-server MCP clients.
- Rate limited to 60 requests/minute per IP using the existing in-memory limiter.
- The first version is read-only. Order phone, email and address fields are never returned. Finance and import-cost fields are not exposed.

## Tools
- `list_products`
- `get_product`
- `get_stock_summary`
- `list_orders` (personal data redacted)

## Install and run
From the repository root:
```bash
npm install
npm run lint
npm run build
```
The MCP SDK and Zod dependencies are declared in the root package manifest. Run `npm install` to regenerate `package-lock.json` before CI/deployment.

## Endpoint
`https://<your-existing-express-host>/mcp`

Configure the MCP client with the endpoint URL and Bearer token. Keep the server secret in the host's environment-variable/secret manager.

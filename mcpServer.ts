import type { Express, Request, Response, NextFunction } from "express";
import crypto from "crypto";
import { collection, getDocs, limit, query } from "firebase/firestore";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StreamableHTTPServerTransport } from "@modelcontextprotocol/sdk/server/streamableHttp.js";
import { z } from "zod";

type LimiterFactory = (options: { windowMs: number; max: number; message: string; prefix?: string }) =>
  (req: Request, res: Response, next: NextFunction) => void;

const MAX_LIMIT = 50;

function safeEqual(a: string, b: string): boolean {
  const left = Buffer.from(a);
  const right = Buffer.from(b);
  return left.length === right.length && crypto.timingSafeEqual(left, right);
}

function asIso(value: any): string | null {
  if (!value) return null;
  if (typeof value?.toDate === "function") return value.toDate().toISOString();
  if (value instanceof Date) return value.toISOString();
  if (typeof value === "string") return value;
  return null;
}

function publicProduct(id: string, data: Record<string, any>) {
  return {
    id,
    name: data.name ?? data.productName ?? null,
    nameBN: data.nameBN ?? null,
    sku: data.sku ?? null,
    barcode: data.barcode ?? null,
    category: data.category ?? null,
    brand: data.brand ?? null,
    price: typeof data.price === "number" ? data.price : null,
    stock: typeof data.stock === "number" ? data.stock : null,
    volume: data.volume ?? null,
    description: data.description ?? null,
    image: data.image ?? data.imageUrl ?? null,
    isActive: typeof data.isActive === "boolean" ? data.isActive : null
  };
}

function publicOrder(id: string, data: Record<string, any>) {
  const items = Array.isArray(data.items) ? data.items : [];
  return {
    id,
    status: data.status ?? null,
    orderSource: data.order_source ?? data.orderSource ?? null,
    totalAmount: typeof data.totalAmount === "number" ? data.totalAmount :
      (typeof data.total === "number" ? data.total : null),
    itemCount: items.reduce((sum: number, item: any) => sum + Math.max(0, Number(item.quantity) || 0), 0),
    createdAt: asIso(data.createdAt ?? data.created_at)
  };
}

export function registerMcpEndpoint(
  app: Express,
  getDb: () => any,
  createRateLimiter: LimiterFactory
) {
  const auth = (req: Request, res: Response, next: NextFunction) => {
    const expected = process.env.MCP_API_KEY;
    if (!expected || expected.length < 32) {
      return res.status(503).json({ error: "MCP endpoint is not configured" });
    }
    const authorization = req.header("authorization") || "";
    const token = authorization.startsWith("Bearer ") ? authorization.slice(7) : "";
    if (!token || !safeEqual(token, expected)) {
      return res.status(401).json({ error: "Unauthorized" });
    }
    const origin = req.header("origin");
    const allowedOrigins = (process.env.MCP_ALLOWED_ORIGINS || "")
      .split(",").map((item) => item.trim()).filter(Boolean);
    if (origin && !allowedOrigins.includes(origin)) {
      return res.status(403).json({ error: "Origin not allowed" });
    }
    next();
  };

  app.all("/mcp", auth, createRateLimiter({
    windowMs: 60_000,
    max: 60,
    message: "MCP request limit exceeded",
    prefix: "mcp"
  }), async (req: Request, res: Response) => {
    if (!["POST", "GET", "DELETE"].includes(req.method)) {
      res.setHeader("Allow", "POST, GET, DELETE");
      return res.status(405).end();
    }
    const db = getDb();
    if (!db) return res.status(503).json({ error: "Firestore is not initialized" });

    const server = new McpServer({ name: "korean-skin-food-bd", version: "1.0.0" });

    server.tool(
      "list_products",
      "List active Korean Skin Food BD products. Returns only public catalog fields.",
      { search: z.string().optional(), category: z.string().optional(), limit: z.number().int().min(1).max(MAX_LIMIT).optional() },
      async ({ search, category, limit: requestedLimit }) => {
        const take = Math.min(MAX_LIMIT, Math.max(1, requestedLimit || 20));
        const snapshot = await getDocs(query(collection(db, "products"), limit(take)));
        let products = snapshot.docs.map((item: any) => publicProduct(item.id, item.data()));
        if (category) products = products.filter((p: any) => String(p.category || "").toLowerCase() === category.toLowerCase());
        if (search) {
          const needle = search.toLowerCase();
          products = products.filter((p: any) => [p.name, p.nameBN, p.sku, p.barcode, p.brand]
            .some((v) => String(v || "").toLowerCase().includes(needle)));
        }
        return { content: [{ type: "text", text: JSON.stringify({ count: products.length, products }) }] };
      }
    );

    server.tool(
      "get_product",
      "Get one product by Firestore document ID. Returns public catalog fields only.",
      { product_id: z.string().min(1).max(128) },
      async ({ product_id }) => {
        const { doc, getDoc } = await import("firebase/firestore");
        const snapshot = await getDoc(doc(db, "products", product_id));
        if (!snapshot.exists()) return { content: [{ type: "text", text: "Product not found." }], isError: true };
        return { content: [{ type: "text", text: JSON.stringify(publicProduct(snapshot.id, snapshot.data())) }] };
      }
    );

    server.tool(
      "get_stock_summary",
      "Summarize stock from the product catalog. Does not expose purchase cost or financial fields.",
      {},
      async () => {
        const snapshot = await getDocs(query(collection(db, "products"), limit(500)));
        let productCount = 0;
        let totalUnits = 0;
        let outOfStock = 0;
        let lowStock = 0;
        snapshot.forEach((item: any) => {
          const data = item.data();
          const stock = Number(data.stock);
          if (!Number.isFinite(stock)) return;
          productCount += 1;
          totalUnits += stock;
          if (stock <= 0) outOfStock += 1;
          else if (stock <= 5) lowStock += 1;
        });
        return { content: [{ type: "text", text: JSON.stringify({ productCount, totalUnits, outOfStock, lowStock, scannedLimit: 500 }) }] };
      }
    );

    server.tool(
      "list_orders",
      "List recent orders with customer phone, address, email and other personal data excluded.",
      { status: z.string().optional(), limit: z.number().int().min(1).max(30).optional() },
      async ({ status, limit: requestedLimit }) => {
        const take = Math.min(30, Math.max(1, requestedLimit || 10));
        const snapshot = await getDocs(query(collection(db, "orders"), limit(take)));
        let orders = snapshot.docs.map((item: any) => publicOrder(item.id, item.data()));
        if (status) orders = orders.filter((order: any) => String(order.status || "").toLowerCase() === status.toLowerCase());
        return { content: [{ type: "text", text: JSON.stringify({ count: orders.length, orders, personalData: "redacted" }) }] };
      }
    );

    const transport = new StreamableHTTPServerTransport({ sessionIdGenerator: undefined });
    res.on("close", () => { void transport.close(); void server.close(); });
    try {
      await server.connect(transport);
      await transport.handleRequest(req, res, req.method === "POST" ? req.body : undefined);
    } catch (error) {
      console.error("[MCP] Request failed:", error);
      if (!res.headersSent) res.status(500).json({ error: "MCP request failed" });
    }
  });

  console.log("🔌 Authenticated read-only MCP endpoint mounted at /mcp");
}

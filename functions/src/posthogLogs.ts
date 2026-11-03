import { logs } from "@opentelemetry/api-logs";
import { OTLPLogExporter } from "@opentelemetry/exporter-logs-otlp-http";
import { resourceFromAttributes } from "@opentelemetry/resources";
import { BatchLogRecordProcessor } from "@opentelemetry/sdk-logs";
import { NodeSDK } from "@opentelemetry/sdk-node";

export function createPostHogFunctionLogExporter(posthogKey?: string, posthogHost?: string) {
  if (!posthogKey || !posthogHost) {
    return null;
  }

  const sdk = new NodeSDK({
    resource: resourceFromAttributes({
      "service.name": "korean-skin-food-firebase-functions",
      "deployment.environment": process.env.NODE_ENV || "production",
    }),
    logRecordProcessors: [
      new BatchLogRecordProcessor(
        new OTLPLogExporter({
          url: new URL("/i/v1/logs", posthogHost).toString(),
          headers: { Authorization: `Bearer ${posthogKey}` },
        }),
      ),
    ],
  });

  sdk.start();
  return { logger: logs.getLogger("posthog-exporter"), sdk };
}

export async function flushPostHogFunctionLogs(exporter: ReturnType<typeof createPostHogFunctionLogExporter>) {
  try {
    await exporter?.sdk.forceFlush();
  } catch {
    // Logging must not change the Cloud Function's outcome.
  }
}

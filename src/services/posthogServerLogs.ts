import { logs } from "@opentelemetry/api-logs";
import { OTLPLogExporter } from "@opentelemetry/exporter-logs-otlp-http";
import { resourceFromAttributes } from "@opentelemetry/resources";
import { BatchLogRecordProcessor } from "@opentelemetry/sdk-logs";
import { NodeSDK } from "@opentelemetry/sdk-node";

interface PostHogLogExporterOptions {
  posthogKey?: string;
  posthogHost?: string;
  serviceName: string;
}

export function createPostHogLogExporter({
  posthogKey,
  posthogHost,
  serviceName,
}: PostHogLogExporterOptions) {
  if (!posthogKey || !posthogHost) {
    return null;
  }

  const sdk = new NodeSDK({
    resource: resourceFromAttributes({
      "service.name": serviceName,
      "deployment.environment": process.env.NODE_ENV || "development",
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

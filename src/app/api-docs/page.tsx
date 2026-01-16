"use client";

import dynamic from "next/dynamic";
import "swagger-ui-react/swagger-ui.css";

// Dynamically import SwaggerUI to avoid SSR issues
const SwaggerUI = dynamic(() => import("swagger-ui-react"), { ssr: false });

export default function ApiDocsPage() {
  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <div className="border-b bg-card">
        <div className="container mx-auto px-4 py-6">
          <h1 className="text-3xl font-bold">API Documentation</h1>
          <p className="mt-2 text-muted-foreground">
            Explore and test the Rel-Mon Public API endpoints
          </p>
        </div>
      </div>

      {/* Swagger UI */}
      <div className="container mx-auto px-4 py-8">
        <SwaggerUI url="/openapi.json" />
      </div>
    </div>
  );
}

import * as functions from "firebase-functions";

/**
 * Environment Configuration
 * 
 * This file manages environment variables and configuration settings
 * for the LTI Connector application.
 */

export interface AppConfig {
  // Firebase Configuration
  firebase: {
    projectId: string;
    databaseUrl: string;
  };

  // Qualtrics Configuration
  qualtrics: {
    apiToken: string;
    baseUrl: string;
    brandId?: string;
    libraryId?: string;
    webhookSecret?: string;
  };

  // Agilix Configuration
  agilix: {
    domain: string;
    username: string;
    password: string;
    baseUrl: string;
    webhookSecret?: string;
  };

  // LTI Configuration
  lti: {
    issuer: string;
    keyId: string;
    privateKeyPath?: string;
    publicKeyPath?: string;
  };

  // Application Configuration
  app: {
    nodeEnv: string;
    logLevel: string;
    sessionTimeoutHours: number;
    maxGradeDefault: number;
  };

  // Security Configuration
  security: {
    jwtSecret: string;
    encryptionKey: string;
  };

  // Optional Email Configuration
  email?: {
    smtpHost: string;
    smtpPort: number;
    smtpUser: string;
    smtpPass: string;
  };

  // Optional Monitoring Configuration
  monitoring?: {
    sentryDsn?: string;
    googleAnalyticsId?: string;
  };
}

/**
 * Load configuration from environment variables
 */
export function loadConfig(): AppConfig {
  // Helper function to get environment variable with fallback
  const getEnvVar = (key: string, defaultValue?: string): string => {
    // Try Firebase Functions config first, then process.env
    const value = functions.config()?.[key.toLowerCase().replace(/_/g, "")]?.value ||
                  process.env[key] ||
                  defaultValue;
    
    if (!value && !defaultValue) {
      throw new Error(`Missing required environment variable: ${key}`);
    }
    
    return value || defaultValue!;
  };

  const getOptionalEnvVar = (key: string): string | undefined => {
    return functions.config()?.[key.toLowerCase().replace(/_/g, "")]?.value ||
           process.env[key];
  };

  const config: AppConfig = {
    firebase: {
      projectId: process.env.GCLOUD_PROJECT || process.env.PROJECT_ID || "qualtrics-lti-connector",
      databaseUrl: getOptionalEnvVar("FIREBASE_DATABASE_URL") || "",
    },

    qualtrics: {
      apiToken: getEnvVar("QUALTRICS_API_TOKEN"),
      baseUrl: getEnvVar("QUALTRICS_BASE_URL", "https://iad1.qualtrics.com"),
      brandId: getOptionalEnvVar("QUALTRICS_BRAND_ID"),
      libraryId: getOptionalEnvVar("QUALTRICS_LIBRARY_ID"),
      webhookSecret: getOptionalEnvVar("QUALTRICS_WEBHOOK_SECRET"),
    },

    agilix: {
      domain: getEnvVar("AGILIX_DOMAIN"),
      username: getEnvVar("AGILIX_USERNAME"),
      password: getEnvVar("AGILIX_PASSWORD"),
      baseUrl: getEnvVar("AGILIX_BASE_URL", "https://api.agilix.com"),
      webhookSecret: getOptionalEnvVar("AGILIX_WEBHOOK_SECRET"),
    },

    lti: {
      issuer: getEnvVar("LTI_ISSUER"),
      keyId: getEnvVar("LTI_KEY_ID"),
      privateKeyPath: getOptionalEnvVar("LTI_PRIVATE_KEY_PATH"),
      publicKeyPath: getOptionalEnvVar("LTI_PUBLIC_KEY_PATH"),
    },

    app: {
      nodeEnv: getEnvVar("NODE_ENV", "development"),
      logLevel: getEnvVar("LOG_LEVEL", "info"),
      sessionTimeoutHours: parseInt(getEnvVar("SESSION_TIMEOUT_HOURS", "1"), 10),
      maxGradeDefault: parseInt(getEnvVar("MAX_GRADE_DEFAULT", "100"), 10),
    },

    security: {
      jwtSecret: getEnvVar("JWT_SECRET"),
      encryptionKey: getEnvVar("ENCRYPTION_KEY"),
    },
  };

  // Optional email configuration
  const smtpHost = getOptionalEnvVar("SMTP_HOST");
  if (smtpHost) {
    config.email = {
      smtpHost,
      smtpPort: parseInt(getOptionalEnvVar("SMTP_PORT") || "587", 10),
      smtpUser: getEnvVar("SMTP_USER"),
      smtpPass: getEnvVar("SMTP_PASS"),
    };
  }

  // Optional monitoring configuration
  const sentryDsn = getOptionalEnvVar("SENTRY_DSN");
  const googleAnalyticsId = getOptionalEnvVar("GOOGLE_ANALYTICS_ID");
  if (sentryDsn || googleAnalyticsId) {
    config.monitoring = {
      sentryDsn,
      googleAnalyticsId,
    };
  }

  return config;
}

/**
 * Validate configuration
 */
export function validateConfig(config: AppConfig): void {
  const errors: string[] = [];

  // Validate required Firebase settings
  if (!config.firebase.projectId) {
    errors.push("Firebase project ID is required");
  }

  // Validate required Qualtrics settings
  if (!config.qualtrics.apiToken) {
    errors.push("Qualtrics API token is required");
  }
  if (!config.qualtrics.baseUrl) {
    errors.push("Qualtrics base URL is required");
  }

  // Validate required Agilix settings
  if (!config.agilix.domain) {
    errors.push("Agilix domain is required");
  }
  if (!config.agilix.username) {
    errors.push("Agilix username is required");
  }
  if (!config.agilix.password) {
    errors.push("Agilix password is required");
  }

  // Validate required LTI settings
  if (!config.lti.issuer) {
    errors.push("LTI issuer is required");
  }
  if (!config.lti.keyId) {
    errors.push("LTI key ID is required");
  }

  // Validate security settings
  if (!config.security.jwtSecret) {
    errors.push("JWT secret is required");
  }
  if (!config.security.encryptionKey || config.security.encryptionKey.length < 32) {
    errors.push("Encryption key must be at least 32 characters long");
  }

  // Validate session timeout
  if (config.app.sessionTimeoutHours < 1 || config.app.sessionTimeoutHours > 24) {
    errors.push("Session timeout must be between 1 and 24 hours");
  }

  // Validate max grade
  if (config.app.maxGradeDefault < 1 || config.app.maxGradeDefault > 1000) {
    errors.push("Max grade default must be between 1 and 1000");
  }

  if (errors.length > 0) {
    throw new Error(`Configuration validation failed:\n${errors.join("\n")}`);
  }
}

/**
 * Get configuration with validation
 */
export function getValidatedConfig(): AppConfig {
  const config = loadConfig();
  validateConfig(config);
  return config;
}

/**
 * Check if running in development mode
 */
export function isDevelopment(): boolean {
  return process.env.NODE_ENV === "development" || 
         functions.config().app?.node_env === "development";
}

/**
 * Check if running in production mode
 */
export function isProduction(): boolean {
  return process.env.NODE_ENV === "production" || 
         functions.config().app?.node_env === "production";
}

/**
 * Get log level for the application
 */
export function getLogLevel(): string {
  return process.env.LOG_LEVEL || 
         functions.config().app?.log_level || 
         (isDevelopment() ? "debug" : "info");
}

/**
 * Configuration constants
 */
export const CONFIG_CONSTANTS = {
  // Session configuration
  SESSION_COOKIE_NAME: "lti_session",
  SESSION_TIMEOUT_MS: 60 * 60 * 1000, // 1 hour in milliseconds
  
  // LTI configuration
  LTI_VERSION: "1.3.0",
  LTI_MESSAGE_TYPE: "LtiResourceLinkRequest",
  
  // API configuration
  API_TIMEOUT_MS: 30000, // 30 seconds
  MAX_RETRY_ATTEMPTS: 3,
  
  // Grade configuration
  MIN_GRADE: 0,
  MAX_GRADE: 100,
  
  // File upload limits
  MAX_FILE_SIZE_MB: 10,
  ALLOWED_FILE_TYPES: ["json", "csv", "txt"],
  
  // Rate limiting
  RATE_LIMIT_WINDOW_MS: 15 * 60 * 1000, // 15 minutes
  RATE_LIMIT_MAX_REQUESTS: 100,
} as const;

// Export singleton config instance
let configInstance: AppConfig | null = null;

export function getConfig(): AppConfig {
  if (!configInstance) {
    configInstance = getValidatedConfig();
  }
  return configInstance;
}
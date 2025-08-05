/**
 * Jest setup file for Firebase Functions tests
 */

import * as admin from "firebase-admin";

// Initialize Firebase Admin for testing
if (!admin.apps.length) {
  admin.initializeApp({
    projectId: "test-project",
    databaseURL: "https://test-project.firebaseio.com",
  });
}

// Mock Firebase Functions config
jest.mock("firebase-functions", () => ({
  config: jest.fn(() => ({
    qualtrics: {
      api_token: "test-token",
      base_url: "https://test.qualtrics.com",
      brand_id: "test-brand",
      library_id: "test-library",
    },
    agilix: {
      domain: "test-domain",
      username: "test-user",
      password: "test-pass",
      base_url: "https://test.agilix.com",
    },
  })),
  https: {
    onRequest: jest.fn((handler) => handler),
  },
  firestore: {
    document: jest.fn(() => ({
      onCreate: jest.fn(),
      onUpdate: jest.fn(),
      onDelete: jest.fn(),
    })),
  },
  pubsub: {
    schedule: jest.fn(() => ({
      onRun: jest.fn(),
    })),
  },
  logger: {
    info: jest.fn(),
    error: jest.fn(),
    warn: jest.fn(),
    debug: jest.fn(),
  },
}));

// Set test environment variables
process.env.NODE_ENV = "test";
process.env.FIREBASE_PROJECT_ID = "test-project";
process.env.QUALTRICS_API_TOKEN = "test-token";
process.env.AGILIX_DOMAIN = "test-domain";
process.env.AGILIX_USERNAME = "test-user";
process.env.AGILIX_PASSWORD = "test-pass";
process.env.LTI_ISSUER = "https://test.example.com";
process.env.LTI_KEY_ID = "test-key-id";
process.env.JWT_SECRET = "test-jwt-secret";
process.env.ENCRYPTION_KEY = "test-encryption-key-32-chars-long";

// Global test timeout
jest.setTimeout(30000);
export interface LTIPlatform {
  id: string;
  name: string;
  clientId: string;
  authEndpoint: string;
  tokenEndpoint: string;
  keysetEndpoint: string;
  deploymentIds: string[];
  isActive: boolean;
  createdAt: FirebaseFirestore.Timestamp;
  updatedAt: FirebaseFirestore.Timestamp;
}

export interface LTIKey {
  keyId: string;
  publicKey: string;
  privateKey: string;
  algorithm: string;
  isActive: boolean;
  createdAt: FirebaseFirestore.Timestamp;
}

export interface UserSession {
  id: string;
  userId: string; // Now contains email address
  userEmail: string; // Explicit email field
  ltiLaunchId: string;
  platformId: string;
  contextId: string;
  resourceLinkId: string;
  roles: string[];
  isActive: boolean;
  createdAt: FirebaseFirestore.Timestamp;
  expiresAt: FirebaseFirestore.Timestamp;
}

export interface LTILaunch {
  id: string;
  userId: string; // Now contains email address as primary identifier
  lmsUserId: string; // Original LMS subject ID for reference
  platformId: string;
  deploymentId: string;
  contextId: string;
  contextTitle?: string;
  resourceLinkId: string;
  resourceLinkTitle?: string;
  roles: string[];
  customParams?: Record<string, string>;
  launchTime: FirebaseFirestore.Timestamp;
  userInfo: {
    name?: string;
    email?: string;
    givenName?: string;
    familyName?: string;
  };
}

export interface SurveyConfig {
  id: string;
  instructorId: string;
  contextId: string;
  resourceLinkId: string;
  qualtricsDetails: {
    surveyId: string;
    brandId?: string;
    libraryId?: string;
    distributionId?: string;
  };
  settings: {
    surveyName: string;
    isActive: boolean;
    allowMultipleResponses: boolean;
    gradePassbackEnabled: boolean;
    maxGrade: number;
    isExtraCredit: boolean;
    scoringType: 'completion' | 'percentage' | 'manual';
    dueDate?: FirebaseFirestore.Timestamp;
  };
  createdAt: FirebaseFirestore.Timestamp;
  updatedAt: FirebaseFirestore.Timestamp;
  lastPollTime?: FirebaseFirestore.Timestamp;
}

export interface GradePassback {
  id: string;
  userId: string; // Now contains email address
  userEmail: string; // Explicit email field for clarity
  lmsUserId?: string; // Original LMS ID if needed for passback
  ltiLaunchId: string;
  surveyConfigId: string;
  qualtricsResponseId: string;
  grade: number;
  maxGrade: number;
  timestamp: FirebaseFirestore.Timestamp;
  processed: boolean;
  processedAt?: FirebaseFirestore.Timestamp;
  error?: string;
  agilixDetails?: {
    itemId: string;
    domainId: string;
    enrollmentId: string;
  };
}

export interface QualtricsResponse {
  responseId: string;
  surveyId: string;
  recorded: string;
  finished: boolean;
  progress: number;
  duration: number;
  values: Record<string, any>;
}

export interface AgilixGradeItem {
  itemId: string;
  title: string;
  maxPoints: number;
  weight?: number;
  category?: string;
}

// LTI 1.3 Token Claims
export interface LTITokenClaims {
  iss: string;
  aud: string | string[];
  sub: string;
  exp: number;
  iat: number;
  nonce: string;
  "https://purl.imsglobal.org/spec/lti/claim/deployment_id": string;
  "https://purl.imsglobal.org/spec/lti/claim/target_link_uri": string;
  "https://purl.imsglobal.org/spec/lti/claim/context": {
    id: string;
    title?: string;
    type?: string[];
  };
  "https://purl.imsglobal.org/spec/lti/claim/resource_link": {
    id: string;
    title?: string;
    description?: string;
  };
  "https://purl.imsglobal.org/spec/lti/claim/roles": string[];
  "https://purl.imsglobal.org/spec/lti/claim/custom"?: Record<string, string>;
  "https://purl.imsglobal.org/spec/lti/claim/lis"?: {
    person_sourcedid?: string;
    course_offering_sourcedid?: string;
  };
  name?: string;
  given_name?: string;
  family_name?: string;
  email?: string;
}

// API Response Types
export interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
}

export interface QualtricsApiConfig {
  apiToken: string;
  baseUrl: string;
  brandId?: string;
  libraryId?: string;
}

export interface AgilixApiConfig {
  domain: string;
  username: string;
  password: string;
  baseUrl: string;
}

// Import type declarations
import "./ltijs";
import "./express";
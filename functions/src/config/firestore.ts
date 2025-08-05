import * as admin from "firebase-admin";

/**
 * Firestore Collections Structure and Utilities
 * 
 * This file defines the Firestore collections structure and provides
 * utility functions for database operations.
 */

export const COLLECTIONS = {
  LTI_PLATFORMS: "lti_platforms",
  LTI_KEYS: "lti_keys",
  USER_SESSIONS: "user_sessions",
  LTI_LAUNCHES: "lti_launches",
  SURVEY_CONFIGS: "survey_configs",
  GRADE_PASSBACKS: "grade_passbacks",
} as const;

/**
 * Initialize Firestore collections with proper structure
 */
export class FirestoreCollections {
  private db: admin.firestore.Firestore;

  constructor() {
    this.db = admin.firestore();
  }

  /**
   * Get reference to LTI Platforms collection
   * 
   * Collection: lti_platforms
   * Purpose: Store LTI platform configurations (Agilix Buzz instances)
   * 
   * Document Structure:
   * {
   *   id: string,
   *   name: string,
   *   clientId: string,
   *   authEndpoint: string,
   *   tokenEndpoint: string,
   *   keysetEndpoint: string,
   *   deploymentIds: string[],
   *   isActive: boolean,
   *   createdAt: Timestamp,
   *   updatedAt: Timestamp
   * }
   */
  get ltiPlatforms(): admin.firestore.CollectionReference {
    return this.db.collection(COLLECTIONS.LTI_PLATFORMS);
  }

  /**
   * Get reference to LTI Keys collection
   * 
   * Collection: lti_keys
   * Purpose: Store LTI signing keys for JWT verification
   * 
   * Document Structure:
   * {
   *   keyId: string,
   *   publicKey: string,
   *   privateKey: string,
   *   algorithm: string,
   *   isActive: boolean,
   *   createdAt: Timestamp
   * }
   */
  get ltiKeys(): admin.firestore.CollectionReference {
    return this.db.collection(COLLECTIONS.LTI_KEYS);
  }

  /**
   * Get reference to User Sessions collection
   * 
   * Collection: user_sessions
   * Purpose: Store active user sessions from LTI launches
   * 
   * Document Structure:
   * {
   *   id: string,
   *   userId: string,
   *   ltiLaunchId: string,
   *   platformId: string,
   *   contextId: string,
   *   resourceLinkId: string,
   *   roles: string[],
   *   isActive: boolean,
   *   createdAt: Timestamp,
   *   expiresAt: Timestamp
   * }
   */
  get userSessions(): admin.firestore.CollectionReference {
    return this.db.collection(COLLECTIONS.USER_SESSIONS);
  }

  /**
   * Get reference to LTI Launches collection
   * 
   * Collection: lti_launches
   * Purpose: Store LTI launch data for audit and reference
   * 
   * Document Structure:
   * {
   *   id: string,
   *   userId: string,
   *   platformId: string,
   *   deploymentId: string,
   *   contextId: string,
   *   contextTitle?: string,
   *   resourceLinkId: string,
   *   resourceLinkTitle?: string,
   *   roles: string[],
   *   customParams?: Record<string, string>,
   *   launchTime: Timestamp,
   *   userInfo: {
   *     name?: string,
   *     email?: string,
   *     givenName?: string,
   *     familyName?: string
   *   }
   * }
   */
  get ltiLaunches(): admin.firestore.CollectionReference {
    return this.db.collection(COLLECTIONS.LTI_LAUNCHES);
  }

  /**
   * Get reference to Survey Configs collection
   * 
   * Collection: survey_configs
   * Purpose: Store Qualtrics survey configurations linked to LTI resources
   * 
   * Document Structure:
   * {
   *   id: string,
   *   instructorId: string,
   *   contextId: string,
   *   resourceLinkId: string,
   *   qualtricsDetails: {
   *     surveyId: string,
   *     brandId?: string,
   *     libraryId?: string,
   *     distributionId?: string
   *   },
   *   settings: {
   *     isActive: boolean,
   *     allowMultipleResponses: boolean,
   *     gradePassbackEnabled: boolean,
   *     maxGrade: number,
   *     dueDate?: Timestamp
   *   },
   *   createdAt: Timestamp,
   *   updatedAt: Timestamp
   * }
   */
  get surveyConfigs(): admin.firestore.CollectionReference {
    return this.db.collection(COLLECTIONS.SURVEY_CONFIGS);
  }

  /**
   * Get reference to Grade Passbacks collection
   * 
   * Collection: grade_passbacks
   * Purpose: Store grade passback records to Agilix Buzz
   * 
   * Document Structure:
   * {
   *   id: string,
   *   userId: string,
   *   ltiLaunchId: string,
   *   surveyConfigId: string,
   *   qualtricsResponseId: string,
   *   grade: number,
   *   maxGrade: number,
   *   timestamp: Timestamp,
   *   processed: boolean,
   *   processedAt?: Timestamp,
   *   error?: string,
   *   agilixDetails?: {
   *     itemId: string,
   *     domainId: string,
   *     enrollmentId: string
   *   }
   * }
   */
  get gradePassbacks(): admin.firestore.CollectionReference {
    return this.db.collection(COLLECTIONS.GRADE_PASSBACKS);
  }

  /**
   * Create initial platform configuration
   */
  async createPlatformConfig(platformConfig: {
    name: string;
    clientId: string;
    authEndpoint: string;
    tokenEndpoint: string;
    keysetEndpoint: string;
    deploymentIds: string[];
  }): Promise<string> {
    const platformData = {
      ...platformConfig,
      isActive: true,
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
    };

    const docRef = await this.ltiPlatforms.add(platformData);
    return docRef.id;
  }

  /**
   * Create LTI key pair
   */
  async createLTIKey(keyData: {
    keyId: string;
    publicKey: string;
    privateKey: string;
    algorithm: string;
  }): Promise<void> {
    const keyDocument = {
      ...keyData,
      isActive: true,
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
    };

    await this.ltiKeys.doc(keyData.keyId).set(keyDocument);
  }

  /**
   * Clean up expired sessions
   */
  async cleanupExpiredSessions(): Promise<number> {
    const now = admin.firestore.Timestamp.now();
    const expiredSessions = await this.userSessions
      .where("expiresAt", "<", now)
      .limit(100)
      .get();

    if (expiredSessions.empty) {
      return 0;
    }

    const batch = this.db.batch();
    expiredSessions.docs.forEach((doc) => {
      batch.delete(doc.ref);
    });

    await batch.commit();
    return expiredSessions.size;
  }

  /**
   * Get active surveys for a context
   */
  async getActiveSurveys(contextId: string): Promise<admin.firestore.QuerySnapshot> {
    return this.surveyConfigs
      .where("contextId", "==", contextId)
      .where("settings.isActive", "==", true)
      .orderBy("createdAt", "desc")
      .get();
  }

  /**
   * Get pending grade passbacks
   */
  async getPendingGradePassbacks(limit: number = 50): Promise<admin.firestore.QuerySnapshot> {
    return this.gradePassbacks
      .where("processed", "==", false)
      .orderBy("timestamp", "asc")
      .limit(limit)
      .get();
  }

  /**
   * Get user's recent launches
   */
  async getUserRecentLaunches(userId: string, limit: number = 10): Promise<admin.firestore.QuerySnapshot> {
    return this.ltiLaunches
      .where("userId", "==", userId)
      .orderBy("launchTime", "desc")
      .limit(limit)
      .get();
  }

  /**
   * Initialize default collections and indexes
   * This should be run during initial setup
   */
  async initializeCollections(): Promise<void> {
    // Create a sample document in each collection to ensure they exist
    // These will be deleted after indexes are created
    
    const timestamp = admin.firestore.FieldValue.serverTimestamp();
    
    const sampleDocs = [
      { collection: this.ltiPlatforms, data: { _sample: true, createdAt: timestamp } },
      { collection: this.ltiKeys, data: { _sample: true, createdAt: timestamp } },
      { collection: this.userSessions, data: { _sample: true, createdAt: timestamp } },
      { collection: this.ltiLaunches, data: { _sample: true, launchTime: timestamp } },
      { collection: this.surveyConfigs, data: { _sample: true, createdAt: timestamp } },
      { collection: this.gradePassbacks, data: { _sample: true, timestamp: timestamp } },
    ];

    // Create sample documents
    const batch = this.db.batch();
    const docRefs: admin.firestore.DocumentReference[] = [];

    sampleDocs.forEach(({ collection, data }) => {
      const docRef = collection.doc();
      batch.set(docRef, data);
      docRefs.push(docRef);
    });

    await batch.commit();

    // Wait a bit for the documents to be indexed
    await new Promise(resolve => setTimeout(resolve, 2000));

    // Clean up sample documents
    const cleanupBatch = this.db.batch();
    docRefs.forEach(docRef => {
      cleanupBatch.delete(docRef);
    });

    await cleanupBatch.commit();
  }
}

// Export singleton instance
export const firestoreCollections = new FirestoreCollections();
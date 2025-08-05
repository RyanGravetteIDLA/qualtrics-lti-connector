import { Router } from "express";
import * as admin from "firebase-admin";
import * as functions from "firebase-functions";
import { SurveyConfig, UserSession, ApiResponse } from "../types";
import { QualtricsService } from "../services/qualtricsService";
import { v4 as uuidv4 } from "uuid";

const router = Router();
let db: admin.firestore.Firestore;
const qualtricsService = new QualtricsService();

// Get Firestore instance
const getDb = (): admin.firestore.Firestore => {
  if (!db) {
    db = admin.firestore();
  }
  return db;
};

// Middleware to verify session
const verifySession = async (req: any, res: any, next: any): Promise<void> => {
  try {
    const sessionId = req.headers["x-session-id"] || req.body.sessionId || req.query.sessionId;
    
    if (!sessionId) {
      return res.status(401).json({
        success: false,
        error: "Session ID required",
      });
    }

    const sessionDoc = await getDb().collection("user_sessions").doc(sessionId).get();
    if (!sessionDoc.exists) {
      return res.status(404).json({
        success: false,
        error: "Session not found",
      });
    }

    const session = sessionDoc.data() as UserSession;
    
    // Check if session is expired
    if (session.expiresAt.toMillis() < Date.now()) {
      return res.status(401).json({
        success: false,
        error: "Session expired",
      });
    }

    req.userSession = session;
    next();
  } catch (error) {
    functions.logger.error("Session verification error:", error);
    return res.status(500).json({
      success: false,
      error: "Session verification failed",
    });
  }
};

// Check if user is instructor
const requireInstructor = (req: any, res: any, next: any): void => {
  const session = req.userSession as UserSession;
  const isInstructor = session.roles.some(role => 
    role.includes("Instructor") || role.includes("TeachingAssistant")
  );

  if (!isInstructor) {
    return res.status(403).json({
      success: false,
      error: "Instructor role required",
    });
  }

  next();
};

// Get all surveys for a context
router.get("/", verifySession, async (req, res) => {
  try {
    const session = req.userSession as UserSession;
    
    const surveysQuery = await getDb().collection("survey_configs")
      .where("contextId", "==", session.contextId)
      .where("settings.isActive", "==", true)
      .orderBy("createdAt", "desc")
      .get();

    const surveys = surveysQuery.docs.map(doc => ({
      id: doc.id,
      ...doc.data(),
    }));

    return res.json({
      success: true,
      data: surveys,
    } as ApiResponse);
  } catch (error) {
    functions.logger.error("Error fetching surveys:", error);
    return res.status(500).json({
      success: false,
      error: "Failed to fetch surveys",
    } as ApiResponse);
  }
});

// Get specific survey config
router.get("/:surveyId", verifySession, async (req, res) => {
  try {
    const { surveyId } = req.params;
    const session = req.userSession as UserSession;
    
    const surveyDoc = await getDb().collection("survey_configs").doc(surveyId).get();
    if (!surveyDoc.exists) {
      return res.status(404).json({
        success: false,
        error: "Survey not found",
      } as ApiResponse);
    }

    const survey = surveyDoc.data() as SurveyConfig;
    
    // Check if user has access to this survey
    if (survey.contextId !== session.contextId) {
      return res.status(403).json({
        success: false,
        error: "Access denied",
      } as ApiResponse);
    }

    return res.json({
      success: true,
      data: survey,
    } as ApiResponse);
  } catch (error) {
    functions.logger.error("Error fetching survey:", error);
    return res.status(500).json({
      success: false,
      error: "Failed to fetch survey",
    } as ApiResponse);
  }
});

// Create new survey configuration
router.post("/", verifySession, requireInstructor, async (req, res) => {
  try {
    const session = req.userSession as UserSession;
    const {
      qualtricsDetails,
      settings,
    } = req.body;

    // Validate required fields
    if (!qualtricsDetails || !qualtricsDetails.surveyId) {
      return res.status(400).json({
        success: false,
        error: "Qualtrics survey ID is required",
      } as ApiResponse);
    }

    // Verify survey exists in Qualtrics
    const surveyExists = await qualtricsService.verifySurvey(qualtricsDetails.surveyId);
    if (!surveyExists) {
      return res.status(400).json({
        success: false,
        error: "Survey not found in Qualtrics",
      } as ApiResponse);
    }

    const surveyConfig: SurveyConfig = {
      id: uuidv4(),
      instructorId: session.userId,
      contextId: session.contextId,
      resourceLinkId: session.resourceLinkId,
      qualtricsDetails: {
        surveyId: qualtricsDetails.surveyId,
        brandId: qualtricsDetails.brandId,
        libraryId: qualtricsDetails.libraryId,
        distributionId: qualtricsDetails.distributionId,
      },
      settings: {
        surveyName: settings?.surveyName || "Untitled Survey",
        isActive: settings?.isActive ?? true,
        allowMultipleResponses: settings?.allowMultipleResponses ?? false,
        gradePassbackEnabled: settings?.gradePassbackEnabled ?? true,
        maxGrade: settings?.maxGrade ?? 100,
        isExtraCredit: settings?.isExtraCredit ?? false,
        scoringType: settings?.scoringType || "completion",
        dueDate: settings?.dueDate ? admin.firestore.Timestamp.fromDate(new Date(settings.dueDate)) : undefined,
      },
      createdAt: admin.firestore.Timestamp.now(),
      updatedAt: admin.firestore.Timestamp.now(),
    };

    // Create distribution in Qualtrics if not provided
    if (!surveyConfig.qualtricsDetails.distributionId) {
      const distributionId = await qualtricsService.createDistribution(
        qualtricsDetails.surveyId,
        `LTI Distribution - ${session.contextId}`,
        {}
      );
      surveyConfig.qualtricsDetails.distributionId = distributionId;
    }

    // Save to Firestore
    await getDb().collection("survey_configs").doc(surveyConfig.id).set(surveyConfig);

    functions.logger.info(`Survey configuration created: ${surveyConfig.id}`);

    return res.status(201).json({
      success: true,
      data: surveyConfig,
      message: "Survey configuration created successfully",
    } as ApiResponse);
  } catch (error) {
    functions.logger.error("Error creating survey config:", error);
    return res.status(500).json({
      success: false,
      error: "Failed to create survey configuration",
    } as ApiResponse);
  }
});

// Update survey configuration
router.put("/:surveyId", verifySession, requireInstructor, async (req, res) => {
  try {
    const { surveyId } = req.params;
    const session = req.userSession as UserSession;
    const updates = req.body;

    const surveyDoc = await getDb().collection("survey_configs").doc(surveyId).get();
    if (!surveyDoc.exists) {
      return res.status(404).json({
        success: false,
        error: "Survey not found",
      } as ApiResponse);
    }

    const survey = surveyDoc.data() as SurveyConfig;
    
    // Check if user owns this survey
    if (survey.instructorId !== session.userId) {
      return res.status(403).json({
        success: false,
        error: "Access denied",
      } as ApiResponse);
    }

    // Update survey configuration
    const updatedSurvey = {
      ...survey,
      ...updates,
      updatedAt: admin.firestore.Timestamp.now(),
    };

    await getDb().collection("survey_configs").doc(surveyId).update(updatedSurvey);

    functions.logger.info(`Survey configuration updated: ${surveyId}`);

    return res.json({
      success: true,
      data: updatedSurvey,
      message: "Survey configuration updated successfully",
    } as ApiResponse);
  } catch (error) {
    functions.logger.error("Error updating survey config:", error);
    return res.status(500).json({
      success: false,
      error: "Failed to update survey configuration",
    } as ApiResponse);
  }
});

// Delete survey configuration
router.delete("/:surveyId", verifySession, requireInstructor, async (req, res) => {
  try {
    const { surveyId } = req.params;
    const session = req.userSession as UserSession;

    const surveyDoc = await getDb().collection("survey_configs").doc(surveyId).get();
    if (!surveyDoc.exists) {
      return res.status(404).json({
        success: false,
        error: "Survey not found",
      } as ApiResponse);
    }

    const survey = surveyDoc.data() as SurveyConfig;
    
    // Check if user owns this survey
    if (survey.instructorId !== session.userId) {
      return res.status(403).json({
        success: false,
        error: "Access denied",
      } as ApiResponse);
    }

    // Soft delete by marking as inactive
    await getDb().collection("survey_configs").doc(surveyId).update({
      "settings.isActive": false,
      updatedAt: admin.firestore.Timestamp.now(),
    });

    functions.logger.info(`Survey configuration deleted: ${surveyId}`);

    return res.json({
      success: true,
      message: "Survey configuration deleted successfully",
    } as ApiResponse);
  } catch (error) {
    functions.logger.error("Error deleting survey config:", error);
    return res.status(500).json({
      success: false,
      error: "Failed to delete survey configuration",
    } as ApiResponse);
  }
});

// Get survey responses
router.get("/:surveyId/responses", verifySession, requireInstructor, async (req, res) => {
  try {
    const { surveyId } = req.params;
    const session = req.userSession as UserSession;

    const surveyDoc = await getDb().collection("survey_configs").doc(surveyId).get();
    if (!surveyDoc.exists) {
      return res.status(404).json({
        success: false,
        error: "Survey not found",
      } as ApiResponse);
    }

    const survey = surveyDoc.data() as SurveyConfig;
    
    // Check if user owns this survey
    if (survey.instructorId !== session.userId) {
      return res.status(403).json({
        success: false,
        error: "Access denied",
      } as ApiResponse);
    }

    // Get responses from Qualtrics
    const responses = await qualtricsService.getSurveyResponses(
      survey.qualtricsDetails.surveyId
    );

    return res.json({
      success: true,
      data: responses,
    } as ApiResponse);
  } catch (error) {
    functions.logger.error("Error fetching survey responses:", error);
    return res.status(500).json({
      success: false,
      error: "Failed to fetch survey responses",
    } as ApiResponse);
  }
});

// Generate survey link for student
router.post("/:surveyId/link", verifySession, async (req, res) => {
  try {
    const { surveyId } = req.params;
    const session = req.userSession as UserSession;

    const surveyDoc = await getDb().collection("survey_configs").doc(surveyId).get();
    if (!surveyDoc.exists) {
      return res.status(404).json({
        success: false,
        error: "Survey not found",
      } as ApiResponse);
    }

    const survey = surveyDoc.data() as SurveyConfig;
    
    // Check if survey is active and accessible
    if (!survey.settings.isActive || survey.contextId !== session.contextId) {
      return res.status(403).json({
        success: false,
        error: "Survey not accessible",
      } as ApiResponse);
    }

    // Generate personalized survey link
    const surveyLink = await qualtricsService.generateSurveyLink(
      survey.qualtricsDetails.surveyId,
      survey.qualtricsDetails.distributionId || "",
      {
        userId: session.userId,
        contextId: session.contextId,
        resourceLinkId: session.resourceLinkId,
      }
    );

    return res.json({
      success: true,
      data: { surveyLink },
      message: "Survey link generated successfully",
    } as ApiResponse);
  } catch (error) {
    functions.logger.error("Error generating survey link:", error);
    return res.status(500).json({
      success: false,
      error: "Failed to generate survey link",
    } as ApiResponse);
  }
});

export { router as surveyHandlers };
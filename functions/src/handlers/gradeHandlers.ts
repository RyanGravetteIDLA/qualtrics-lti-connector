import { Router } from "express";
import * as admin from "firebase-admin";
import * as functions from "firebase-functions";
import { GradePassback, UserSession, SurveyConfig, ApiResponse } from "../types";
import { QualtricsService } from "../services/qualtricsService";
import { AgilixService } from "../services/agilixService";
import { v4 as uuidv4 } from "uuid";

const router = Router();
let db: admin.firestore.Firestore;
const qualtricsService = new QualtricsService();
const agilixService = new AgilixService();

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

// Get grade passback records for a survey
router.get("/survey/:surveyId", verifySession, requireInstructor, async (req, res) => {
  try {
    const { surveyId } = req.params;
    const session = req.userSession as UserSession;

    // Verify survey ownership
    const surveyDoc = await getDb().collection("survey_configs").doc(surveyId).get();
    if (!surveyDoc.exists) {
      return res.status(404).json({
        success: false,
        error: "Survey not found",
      } as ApiResponse);
    }

    const survey = surveyDoc.data() as SurveyConfig;
    if (survey.instructorId !== session.userId) {
      return res.status(403).json({
        success: false,
        error: "Access denied",
      } as ApiResponse);
    }

    // Get grade passback records
    const gradeQuery = await getDb().collection("grade_passbacks")
      .where("surveyConfigId", "==", surveyId)
      .orderBy("timestamp", "desc")
      .get();

    const grades = gradeQuery.docs.map(doc => ({
      id: doc.id,
      ...doc.data(),
    }));

    return res.json({
      success: true,
      data: grades,
    } as ApiResponse);
  } catch (error) {
    functions.logger.error("Error fetching grade passbacks:", error);
    return res.status(500).json({
      success: false,
      error: "Failed to fetch grade passbacks",
    } as ApiResponse);
  }
});

// Get grade passback records for a user
router.get("/user/:userId", verifySession, async (req, res) => {
  try {
    const { userId } = req.params;
    const session = req.userSession as UserSession;

    // Users can only see their own grades, instructors can see all
    const isInstructor = session.roles.some(role => 
      role.includes("Instructor") || role.includes("TeachingAssistant")
    );

    if (!isInstructor && session.userId !== userId) {
      return res.status(403).json({
        success: false,
        error: "Access denied",
      } as ApiResponse);
    }

    // Get grade passback records (userId is now email)
    const gradeQuery = await getDb().collection("grade_passbacks")
      .where("userEmail", "==", userId) // Query by email field
      .orderBy("timestamp", "desc")
      .get();

    const grades = gradeQuery.docs.map(doc => ({
      id: doc.id,
      ...doc.data(),
    }));

    return res.json({
      success: true,
      data: grades,
    } as ApiResponse);
  } catch (error) {
    functions.logger.error("Error fetching user grades:", error);
    return res.status(500).json({
      success: false,
      error: "Failed to fetch user grades",
    } as ApiResponse);
  }
});

// Process survey completion and create grade passback
router.post("/process-completion", async (req, res) => {
  try {
    const {
      responseId,
      surveyId,
      userId,
      contextId,
      resourceLinkId,
    } = req.body;

    // Validate required fields
    if (!responseId || !surveyId || !userId) {
      return res.status(400).json({
        success: false,
        error: "Missing required fields: responseId, surveyId, userId",
      } as ApiResponse);
    }

    // Find survey configuration
    const surveyQuery = await getDb().collection("survey_configs")
      .where("qualtricsDetails.surveyId", "==", surveyId)
      .where("contextId", "==", contextId)
      .where("resourceLinkId", "==", resourceLinkId)
      .limit(1)
      .get();

    if (surveyQuery.empty) {
      return res.status(404).json({
        success: false,
        error: "Survey configuration not found",
      } as ApiResponse);
    }

    const surveyConfig = surveyQuery.docs[0].data() as SurveyConfig;

    // Check if grade passback is enabled
    if (!surveyConfig.settings.gradePassbackEnabled) {
      return res.json({
        success: true,
        message: "Grade passback is disabled for this survey",
      } as ApiResponse);
    }

    // Get survey response from Qualtrics
    const response = await qualtricsService.getSurveyResponse(surveyId, responseId);
    if (!response) {
      return res.status(404).json({
        success: false,
        error: "Survey response not found",
      } as ApiResponse);
    }

    // Calculate grade based on response
    const grade = calculateGradeFromResponse(response, surveyConfig);

    // Find associated LTI launch (userId in launches is now email)
    const launchQuery = await getDb().collection("lti_launches")
      .where("userId", "==", userId) // userId is email in LTI launches
      .where("contextId", "==", contextId)
      .where("resourceLinkId", "==", resourceLinkId)
      .orderBy("launchTime", "desc")
      .limit(1)
      .get();

    const ltiLaunchId = launchQuery.empty ? "" : launchQuery.docs[0].id;

    // Create grade passback record
    const gradePassback: GradePassback = {
      id: uuidv4(),
      userId, // This should be an email address
      userEmail: userId, // Explicit email field
      ltiLaunchId,
      surveyConfigId: surveyQuery.docs[0].id,
      qualtricsResponseId: responseId,
      grade,
      maxGrade: surveyConfig.settings.maxGrade,
      timestamp: admin.firestore.Timestamp.now(),
      processed: false,
    };

    // Store grade passback record (this will trigger the Cloud Function)
    await getDb().collection("grade_passbacks").doc(gradePassback.id).set(gradePassback);

    functions.logger.info(`Grade passback created: ${gradePassback.id}`);

    return res.json({
      success: true,
      data: gradePassback,
      message: "Grade passback created successfully",
    } as ApiResponse);
  } catch (error) {
    functions.logger.error("Error processing survey completion:", error);
    return res.status(500).json({
      success: false,
      error: "Failed to process survey completion",
    } as ApiResponse);
  }
});

// Manual grade passback (instructor only)
router.post("/passback/:gradeId", verifySession, requireInstructor, async (req, res) => {
  try {
    const { gradeId } = req.params;
    const session = req.userSession as UserSession;

    const gradeDoc = await getDb().collection("grade_passbacks").doc(gradeId).get();
    if (!gradeDoc.exists) {
      return res.status(404).json({
        success: false,
        error: "Grade record not found",
      } as ApiResponse);
    }

    const grade = gradeDoc.data() as GradePassback;

    // Verify instructor has access
    const surveyDoc = await getDb().collection("survey_configs").doc(grade.surveyConfigId).get();
    if (!surveyDoc.exists) {
      return res.status(404).json({
        success: false,
        error: "Survey configuration not found",
      } as ApiResponse);
    }

    const survey = surveyDoc.data() as SurveyConfig;
    if (survey.instructorId !== session.userId) {
      return res.status(403).json({
        success: false,
        error: "Access denied",
      } as ApiResponse);
    }

    // Process grade passback to Agilix
    const success = await processGradePassbackToAgilix(grade);

    if (success) {
      // Update grade record
      await getDb().collection("grade_passbacks").doc(gradeId).update({
        processed: true,
        processedAt: admin.firestore.Timestamp.now(),
      });

      return res.json({
        success: true,
        message: "Grade passed back successfully",
      } as ApiResponse);
    } else {
      return res.status(500).json({
        success: false,
        error: "Failed to pass back grade",
      } as ApiResponse);
    }
  } catch (error) {
    functions.logger.error("Error processing manual grade passback:", error);
    return res.status(500).json({
      success: false,
      error: "Failed to process grade passback",
    } as ApiResponse);
  }
});

// Bulk grade passback for survey
router.post("/bulk-passback/:surveyId", verifySession, requireInstructor, async (req, res) => {
  try {
    const { surveyId } = req.params;
    const session = req.userSession as UserSession;

    // Verify survey ownership
    const surveyDoc = await getDb().collection("survey_configs").doc(surveyId).get();
    if (!surveyDoc.exists) {
      return res.status(404).json({
        success: false,
        error: "Survey not found",
      } as ApiResponse);
    }

    const survey = surveyDoc.data() as SurveyConfig;
    if (survey.instructorId !== session.userId) {
      return res.status(403).json({
        success: false,
        error: "Access denied",
      } as ApiResponse);
    }

    // Get unprocessed grade records
    const gradeQuery = await getDb().collection("grade_passbacks")
      .where("surveyConfigId", "==", surveyId)
      .where("processed", "==", false)
      .get();

    if (gradeQuery.empty) {
      return res.json({
        success: true,
        message: "No grades to process",
        data: { processed: 0 },
      } as ApiResponse);
    }

    // Process grades in batches
    let processedCount = 0;
    const batch = getDb().batch();

    for (const doc of gradeQuery.docs) {
      const grade = doc.data() as GradePassback;
      
      try {
        const success = await processGradePassbackToAgilix(grade);
        
        if (success) {
          batch.update(doc.ref, {
            processed: true,
            processedAt: admin.firestore.Timestamp.now(),
          });
          processedCount++;
        } else {
          batch.update(doc.ref, {
            processed: false,
            error: "Failed to pass back to Agilix",
            processedAt: admin.firestore.Timestamp.now(),
          });
        }
      } catch (error) {
        functions.logger.error(`Error processing grade ${doc.id}:`, error);
        batch.update(doc.ref, {
          processed: false,
          error: error instanceof Error ? error.message : "Unknown error",
          processedAt: admin.firestore.Timestamp.now(),
        });
      }
    }

    await batch.commit();

    return res.json({
      success: true,
      message: `Processed ${processedCount} out of ${gradeQuery.size} grades`,
      data: { processed: processedCount, total: gradeQuery.size },
    } as ApiResponse);
  } catch (error) {
    functions.logger.error("Error processing bulk grade passback:", error);
    return res.status(500).json({
      success: false,
      error: "Failed to process bulk grade passback",
    } as ApiResponse);
  }
});

// Helper function to calculate grade from Qualtrics response
function calculateGradeFromResponse(response: any, surveyConfig: SurveyConfig): number {
  // Basic implementation - can be customized based on survey structure
  // This is a simple completion-based grading
  
  if (response.finished) {
    // Full credit for completed surveys
    return surveyConfig.settings.maxGrade;
  } else if (response.progress > 50) {
    // Partial credit based on progress
    return Math.round((response.progress / 100) * surveyConfig.settings.maxGrade);
  } else {
    // No credit for minimal progress
    return 0;
  }
}

// Helper function to process grade passback to Agilix
async function processGradePassbackToAgilix(grade: GradePassback): Promise<boolean> {
  try {
    // Get LTI launch details for Agilix context
    const launchDoc = await getDb().collection("lti_launches").doc(grade.ltiLaunchId).get();
    if (!launchDoc.exists) {
      functions.logger.error("LTI launch not found for grade passback");
      return false;
    }

    const launch = launchDoc.data();
    if (!launch) {
      functions.logger.error("LTI launch data is undefined");
      return false;
    }
    
    // Use Agilix service to pass back grade
    const success = await agilixService.passbackGrade({
      userId: grade.lmsUserId || launch.lmsUserId || grade.userId, // Try to use original LMS ID, fallback to email
      userEmail: grade.userEmail, // Pass email for reference
      contextId: launch.contextId,
      resourceLinkId: launch.resourceLinkId,
      grade: grade.grade,
      maxGrade: grade.maxGrade,
      timestamp: grade.timestamp.toDate(),
    });

    return success;
  } catch (error) {
    functions.logger.error("Error passing back grade to Agilix:", error);
    return false;
  }
}

// Check if student has submitted survey
router.get("/submission-status/:surveyId", verifySession, async (req, res) => {
  try {
    const { surveyId } = req.params;
    const session = req.userSession as UserSession;
    const userId = session.userId;
    
    // Check if grade passback exists for this user and survey
    const gradeQuery = await getDb().collection("grade_passbacks")
      .where("surveyConfigId", "==", surveyId)
      .where("userEmail", "==", userId) // userId is email from session
      .orderBy("timestamp", "desc")
      .limit(1)
      .get();
    
    if (gradeQuery.empty) {
      return res.json({
        success: true,
        data: {
          submitted: false,
          message: "No submission found",
        },
      } as ApiResponse);
    }
    
    const gradeData = gradeQuery.docs[0].data() as GradePassback;
    
    return res.json({
      success: true,
      data: {
        submitted: true,
        submittedAt: gradeData.timestamp.toDate(),
        grade: gradeData.grade,
        maxGrade: gradeData.maxGrade,
        processed: gradeData.processed,
        responseId: gradeData.qualtricsResponseId,
      },
    } as ApiResponse);
  } catch (error) {
    functions.logger.error("Error checking submission status:", error);
    return res.status(500).json({
      success: false,
      error: "Failed to check submission status",
    } as ApiResponse);
  }
});

export { router as gradeHandlers };
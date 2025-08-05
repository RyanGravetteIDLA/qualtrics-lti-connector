import * as functions from "firebase-functions";
import * as admin from "firebase-admin";
import express from "express";
import cors from "cors";
import { ltiHandlers } from "./handlers/ltiHandlers";
import { surveyHandlers } from "./handlers/surveyHandlers";
import { gradeHandlers } from "./handlers/gradeHandlers";
import { SurveyConfig, GradePassback } from "./types";

// Initialize Firebase Admin
admin.initializeApp();

const app = express();

// Configure CORS
app.use(cors({
  origin: true,
  credentials: true,
}));

// Parse JSON bodies
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Health check endpoint
app.get("/health", (req, res) => {
  res.status(200).json({ status: "healthy", timestamp: new Date().toISOString() });
});

// LTI endpoints
app.use("/lti", ltiHandlers);

// Survey management endpoints
app.use("/surveys", surveyHandlers);

// Grade passback endpoints
app.use("/grades", gradeHandlers);

// Export the Express app as a Firebase Function
export const api = functions.https.onRequest(app);

// Scheduled function to clean up expired sessions
export const cleanupSessions = functions.pubsub.schedule("every 24 hours").onRun(async (_context) => {
  const db = admin.firestore();
  const now = admin.firestore.Timestamp.now();
  const oneDayAgo = new admin.firestore.Timestamp(now.seconds - 86400, now.nanoseconds);

  try {
    const expiredSessions = await db.collection("user_sessions")
      .where("createdAt", "<", oneDayAgo)
      .limit(100)
      .get();

    const batch = db.batch();
    expiredSessions.docs.forEach((doc) => {
      batch.delete(doc.ref);
    });

    await batch.commit();
    functions.logger.info(`Cleaned up ${expiredSessions.size} expired sessions`);
  } catch (error) {
    functions.logger.error("Error cleaning up sessions:", error);
  }
});

// Function to handle grade passback notifications
export const processGradePassback = functions.firestore
  .document("grade_passbacks/{passbackId}")
  .onCreate(async (snap, context) => {
    const passbackId = context.params.passbackId;

    try {
      functions.logger.info(`Processing grade passback: ${passbackId}`);
      
      // Implementation would handle actual grade passback to Agilix Buzz
      // This is a placeholder for the actual implementation
      
      // Update the document to mark as processed
      await snap.ref.update({
        processed: true,
        processedAt: admin.firestore.FieldValue.serverTimestamp(),
      });

      functions.logger.info(`Grade passback processed successfully: ${passbackId}`);
    } catch (error) {
      functions.logger.error(`Error processing grade passback ${passbackId}:`, error);
      
      // Update document to mark as failed
      await snap.ref.update({
        processed: false,
        error: error instanceof Error ? error.message : "Unknown error",
        processedAt: admin.firestore.FieldValue.serverTimestamp(),
      });
    }
  });


// Scheduled function to poll Qualtrics for survey responses
export const pollQualtricsResponses = functions.pubsub.schedule("every 5 minutes").onRun(async (_context) => {
  const db = admin.firestore();
  
  try {
    // Get all active survey configurations
    const activeSurveys = await db.collection("survey_configs")
      .where("settings.isActive", "==", true)
      .where("settings.gradePassbackEnabled", "==", true)
      .get();
    
    if (activeSurveys.empty) {
      functions.logger.info("No active surveys to poll");
      return;
    }
    
    const { QualtricsService } = await import("./services/qualtricsService");
    const qualtricsService = new QualtricsService();
    
    for (const surveyDoc of activeSurveys.docs) {
      const surveyConfig = surveyDoc.data() as SurveyConfig;
      
      try {
        // Get the last poll timestamp
        const lastPollTime = surveyConfig.lastPollTime || 
          admin.firestore.Timestamp.fromDate(new Date(Date.now() - 24 * 60 * 60 * 1000)); // Default to 24 hours ago
        
        // Fetch responses since last poll
        const responses = await qualtricsService.getResponses(
          surveyConfig.qualtricsDetails.surveyId,
          {
            startDate: lastPollTime.toDate().toISOString(),
            finished: true, // Only get completed responses
          }
        );
        
        functions.logger.info(`Found ${responses.length} new responses for survey ${surveyConfig.id}`);
        
        // Process each response
        for (const response of responses) {
          // Check if we already processed this response
          const existingGrade = await db.collection("grade_passbacks")
            .where("qualtricsResponseId", "==", response.responseId)
            .limit(1)
            .get();
          
          if (!existingGrade.empty) {
            continue; // Already processed
          }
          
          // Extract user ID from embedded data
          const userId = response.values.ltiUserId || response.values.QID_userId;
          if (!userId) {
            functions.logger.warn(`No user ID found in response ${response.responseId}`);
            continue;
          }
          
          // Calculate grade based on scoring type
          let grade = 0;
          if (surveyConfig.settings.scoringType === "completion") {
            grade = surveyConfig.settings.maxGrade; // Full points for completion
          } else if (surveyConfig.settings.scoringType === "percentage" && response.values.score) {
            grade = (response.values.score / 100) * surveyConfig.settings.maxGrade;
          }
          // Manual scoring will be handled separately
          
          // Create grade passback record
          const gradePassback: GradePassback = {
            id: admin.firestore().collection("grade_passbacks").doc().id,
            userId,
            ltiLaunchId: response.values.ltiLaunchId || "",
            surveyConfigId: surveyConfig.id,
            qualtricsResponseId: response.responseId,
            grade,
            maxGrade: surveyConfig.settings.maxGrade,
            timestamp: admin.firestore.Timestamp.now(),
            processed: false,
          };
          
          await db.collection("grade_passbacks").doc(gradePassback.id).set(gradePassback);
          functions.logger.info(`Created grade passback ${gradePassback.id} for user ${userId}`);
        }
        
        // Update last poll time
        await surveyDoc.ref.update({
          lastPollTime: admin.firestore.Timestamp.now(),
        });
        
      } catch (error) {
        functions.logger.error(`Error polling responses for survey ${surveyConfig.id}:`, error);
      }
    }
  } catch (error) {
    functions.logger.error("Error in pollQualtricsResponses:", error);
  }
});
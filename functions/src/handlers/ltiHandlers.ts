import { Router } from "express";
import * as admin from "firebase-admin";
import * as functions from "firebase-functions";
import { Provider, LTIToken } from "ltijs";
import { LTILaunch, UserSession, LTITokenClaims, SurveyConfig } from "../types";
import { v4 as uuidv4 } from "uuid";

const router = Router();
let db: admin.firestore.Firestore;

// Get Firestore instance
const getDb = (): admin.firestore.Firestore => {
  if (!db) {
    db = admin.firestore();
  }
  return db;
};

// Initialize LTI Provider
let lti: Provider;

const initializeLTI = async (): Promise<Provider> => {
  if (lti) {
    return lti;
  }

  try {
    // Create LTI provider instance
    lti = new Provider("FIREBASE", {
      appRoute: "/lti",
      loginRoute: "/login",
      keysetRoute: "/keys",
      staticPath: "/static",
      cookies: {
        secure: process.env.NODE_ENV === "production",
        sameSite: "None",
      },
      devMode: process.env.NODE_ENV !== "production",
    });

    // Configure Firebase adapter for ltijs
    lti.setup("", {
      url: "",
    }, {
      // Firestore will be used for data persistence
    });

    // Set up event handlers
    lti.onConnect(async (token: LTIToken, req, res, _next) => {
      functions.logger.info("LTI Connection established");
      
      try {
        const launch = await handleLTILaunch(token);
        const session = await createUserSession(launch, token);
        
        // Store launch and session info in response locals for use in routes
        res.locals.ltiLaunch = launch;
        res.locals.userSession = session;
        
        // Check if user is instructor/teacher
        const isInstructor = launch.roles.some(role => 
          role.includes('Instructor') || 
          role.includes('Teacher') || 
          role.includes('Administrator')
        );
        
        // Check if survey config exists
        const surveyConfig = await getDb().collection("survey_configs")
          .where("contextId", "==", launch.contextId)
          .where("resourceLinkId", "==", launch.resourceLinkId)
          .where("settings.isActive", "==", true)
          .limit(1)
          .get();
        
        if (isInstructor && surveyConfig.empty) {
          // Instructor needs to configure survey
          return res.redirect(`/teacher-config.html?session=${session.id}&context=${launch.contextId}&resource=${launch.resourceLinkId}`);
        } else if (isInstructor) {
          // Instructor dashboard
          return res.redirect(`/teacher-dashboard.html?session=${session.id}&survey=${surveyConfig.docs[0].id}`);
        } else if (!surveyConfig.empty) {
          // Student - redirect to Qualtrics with SSO
          const survey = surveyConfig.docs[0].data() as SurveyConfig;
          const qualtricsUrl = await generateQualtricsSSO(launch, survey);
          return res.redirect(qualtricsUrl);
        } else {
          // No survey configured
          return res.status(404).send("Survey not configured. Please contact your instructor.");
        }
      } catch (error) {
        functions.logger.error("Error handling LTI launch:", error);
        return res.status(500).send("Error processing LTI launch");
      }
    });

    lti.onDeepLinking(async (token: LTIToken, req, res, _next) => {
      functions.logger.info("Deep linking request received");
      
      try {
        // Handle deep linking for content selection
        const deepLinkingSettings = token.platformContext?.deep_linking_settings;
        
        // Return deep linking response with available surveys
        const message = {
          type: "ltiDeepLinkingResponse",
          data: [{
            type: "ltiResourceLink",
            title: "Qualtrics Survey",
            text: "Create and distribute a Qualtrics survey",
            url: `${req.protocol}://${req.get("host")}/lti/launch`,
            custom: {
              survey_type: "new",
            },
          }],
        };

        if (!deepLinkingSettings) {
          return res.status(400).send("Deep linking settings not found");
        }

        return lti.redirect(res, deepLinkingSettings.deep_link_return_url, {
          message: JSON.stringify(message),
        });
      } catch (error) {
        functions.logger.error("Error handling deep linking:", error);
        return res.status(500).send("Error processing deep linking");
      }
    });

    await lti.deploy({ serverless: true });
    functions.logger.info("LTI Provider initialized successfully");
    
    return lti;
  } catch (error) {
    functions.logger.error("Error initializing LTI provider:", error);
    throw error;
  }
};

// Handle LTI launch and store launch data
const handleLTILaunch = async (token: LTIToken): Promise<LTILaunch> => {
  const claims = token as LTITokenClaims;
  
  // Validate email is present
  if (!claims.email) {
    throw new Error("Email address is required for user identification");
  }

  const launch: LTILaunch = {
    id: uuidv4(),
    userId: claims.email, // Using email as primary identifier
    lmsUserId: claims.sub, // Store original LMS ID for reference
    platformId: claims.iss,
    deploymentId: claims["https://purl.imsglobal.org/spec/lti/claim/deployment_id"],
    contextId: claims["https://purl.imsglobal.org/spec/lti/claim/context"].id,
    contextTitle: claims["https://purl.imsglobal.org/spec/lti/claim/context"].title,
    resourceLinkId: claims["https://purl.imsglobal.org/spec/lti/claim/resource_link"].id,
    resourceLinkTitle: claims["https://purl.imsglobal.org/spec/lti/claim/resource_link"].title,
    roles: claims["https://purl.imsglobal.org/spec/lti/claim/roles"],
    customParams: claims["https://purl.imsglobal.org/spec/lti/claim/custom"],
    launchTime: admin.firestore.Timestamp.now(),
    userInfo: {
      name: claims.name,
      email: claims.email,
      givenName: claims.given_name,
      familyName: claims.family_name,
    },
  };

  // Store launch in Firestore
  await getDb().collection("lti_launches").doc(launch.id).set(launch);
  
  functions.logger.info(`LTI Launch stored: ${launch.id}`);
  return launch;
};

// Create user session
const createUserSession = async (launch: LTILaunch, _token: LTIToken): Promise<UserSession> => {
  const session: UserSession = {
    id: uuidv4(),
    userId: launch.userId, // This is now the email address
    userEmail: launch.userInfo.email || launch.userId, // Explicit email field with fallback
    ltiLaunchId: launch.id,
    platformId: launch.platformId,
    contextId: launch.contextId,
    resourceLinkId: launch.resourceLinkId,
    roles: launch.roles,
    isActive: true,
    createdAt: admin.firestore.Timestamp.now(),
    expiresAt: new admin.firestore.Timestamp(
      admin.firestore.Timestamp.now().seconds + 3600, // 1 hour
      0
    ),
  };

  // Store session in Firestore
  await getDb().collection("user_sessions").doc(session.id).set(session);
  
  functions.logger.info(`User session created: ${session.id}`);
  return session;
};

// LTI Login endpoint
router.get("/login", async (req, res) => {
  try {
    const provider = await initializeLTI();
    return provider.loginRequest(req, res);
  } catch (error) {
    functions.logger.error("LTI login error:", error);
    return res.status(500).send("Login failed");
  }
});

// LTI Launch endpoint
router.post("/launch", async (req, res) => {
  try {
    const provider = await initializeLTI();
    return provider.appLaunch(req, res);
  } catch (error) {
    functions.logger.error("LTI launch error:", error);
    return res.status(500).send("Launch failed");
  }
});

// JWKS endpoint for public keys
router.get("/keys", async (req, res) => {
  try {
    const provider = await initializeLTI();
    return provider.keysetRequest(req, res);
  } catch (error) {
    functions.logger.error("JWKS error:", error);
    return res.status(500).send("Key retrieval failed");
  }
});

// Pre-flight check and help endpoint
router.get("/help", async (req, res) => {
  try {
    const baseUrl = `${req.protocol}://${req.get("host")}`;
    
    return res.json({
      status: "ready",
      service: "Qualtrics LTI Connector",
      version: "1.0.0",
      ltiVersion: "1.3",
      endpoints: {
        launch: `${baseUrl}/api/lti/launch`,
        login: `${baseUrl}/api/lti/login`,
        jwks: `${baseUrl}/api/lti/keys`,
        deepLinking: `${baseUrl}/api/lti/launch`,
      },
      features: {
        gradePassback: true,
        deepLinking: true,
        namesRoles: false,
        extraCredit: true,
        emailBasedIdentity: true,
      },
      configuration: {
        instructions: "Configure your LMS with the endpoints above",
        requiredClaims: ["sub", "email", "name"],
        sessionTimeout: "1 hour",
        pollingInterval: "5 minutes",
      },
      healthCheck: {
        firebase: true,
        timestamp: new Date().toISOString(),
      },
    });
  } catch (error) {
    functions.logger.error("Help endpoint error:", error);
    return res.status(500).json({
      status: "error",
      message: "Service health check failed",
    });
  }
});

// Main application endpoint after successful launch
router.get("/app", async (req, res) => {
  try {
    const provider = await initializeLTI();
    
    // Verify LTI token
    const token = await provider.verifyIdToken(req.body.id_token);
    if (!token) {
      return res.status(401).send("Invalid LTI token");
    }

    const launch = res.locals.ltiLaunch as LTILaunch;
    const session = res.locals.userSession as UserSession;

    // Check if user is instructor to show different interface
    const isInstructor = launch.roles.some(role => 
      role.includes("Instructor") || role.includes("TeachingAssistant")
    );

    // Return appropriate interface based on role
    if (isInstructor) {
      return res.json({
        success: true,
        userType: "instructor",
        contextId: launch.contextId,
        resourceLinkId: launch.resourceLinkId,
        sessionId: session.id,
        message: "Welcome, Instructor! You can create and manage Qualtrics surveys.",
      });
    } else {
      return res.json({
        success: true,
        userType: "student",
        contextId: launch.contextId,
        resourceLinkId: launch.resourceLinkId,
        sessionId: session.id,
        message: "Welcome, Student! Available surveys will be displayed here.",
      });
    }
  } catch (error) {
    functions.logger.error("App route error:", error);
    return res.status(500).json({
      success: false,
      error: "Failed to load application",
    });
  }
});

// Get session info
router.get("/session/:sessionId", async (req, res) => {
  try {
    const { sessionId } = req.params;
    
    const sessionDoc = await db.collection("user_sessions").doc(sessionId).get();
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

    return res.json({
      success: true,
      data: {
        sessionId: session.id,
        userId: session.userId,
        contextId: session.contextId,
        resourceLinkId: session.resourceLinkId,
        roles: session.roles,
        isActive: session.isActive,
      },
    });
  } catch (error) {
    functions.logger.error("Session retrieval error:", error);
    return res.status(500).json({
      success: false,
      error: "Failed to retrieve session",
    });
  }
});

// Generate Qualtrics SSO URL for student
async function generateQualtricsSSO(launch: LTILaunch, survey: SurveyConfig): Promise<string> {
  const { getValidatedConfig } = await import("../config/environment");
  const config = getValidatedConfig();
  
  // Generate SSO token for Qualtrics (for future use)
  // const ssoData = {
  //   timestamp: new Date().toISOString(),
  //   userId: launch.userId,
  //   email: launch.userInfo.email || `${launch.userId}@lti.local`,
  //   firstName: launch.userInfo.givenName || "Student",
  //   lastName: launch.userInfo.familyName || "User",
  //   extRef: launch.id, // External reference to link back to LTI
  // };
  
  // Create embedded data for the survey
  const embeddedData = new URLSearchParams({
    userEmail: launch.userId, // userId is now the email
    ltiUserId: launch.lmsUserId || "", // Original LMS ID for reference
    ltiContextId: launch.contextId,
    ltiResourceId: launch.resourceLinkId,
    ltiLaunchId: launch.id,
    courseName: launch.contextTitle || "",
    userName: launch.userInfo.name || "",
  });
  
  // Build Qualtrics survey URL
  const baseUrl = config.qualtrics.baseUrl || "https://iad1.qualtrics.com";
  const surveyUrl = `${baseUrl}/jfe/form/${survey.qualtricsDetails.surveyId}?${embeddedData.toString()}`;
  
  return surveyUrl;
}

export { router as ltiHandlers };
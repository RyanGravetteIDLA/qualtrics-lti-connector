import axios, { AxiosInstance } from "axios";
import * as functions from "firebase-functions";
import { AgilixApiConfig, AgilixGradeItem } from "../types";

export class AgilixService {
  private api: AxiosInstance;
  private config: AgilixApiConfig;
  private authToken: string | null = null;
  private tokenExpiry: number = 0;

  constructor() {
    this.config = {
      domain: functions.config().agilix?.domain || process.env.AGILIX_DOMAIN || "",
      username: functions.config().agilix?.username || process.env.AGILIX_USERNAME || "",
      password: functions.config().agilix?.password || process.env.AGILIX_PASSWORD || "",
      baseUrl: functions.config().agilix?.base_url || process.env.AGILIX_BASE_URL || "https://api.agilix.com",
    };

    this.api = axios.create({
      baseURL: this.config.baseUrl,
      headers: {
        "Content-Type": "application/json",
      },
      timeout: 30000,
    });

    this.api.interceptors.response.use(
      (response) => response,
      (error) => {
        functions.logger.error("Agilix API Error:", {
          status: error.response?.status,
          data: error.response?.data,
          url: error.config?.url,
        });
        throw error;
      }
    );
  }

  /**
   * Authenticate with Agilix API
   */
  private async authenticate(): Promise<string> {
    try {
      // Check if current token is still valid
      if (this.authToken && Date.now() < this.tokenExpiry) {
        return this.authToken;
      }

      const response = await this.api.post("/auth/login", {
        domain: this.config.domain,
        username: this.config.username,
        password: this.config.password,
      });

      if (response.data.response && response.data.response.token) {
        this.authToken = response.data.response.token;
        // Set token expiry to 30 minutes from now
        this.tokenExpiry = Date.now() + (30 * 60 * 1000);
        
        functions.logger.info("Agilix authentication successful");
        return this.authToken!; // Non-null assertion since we verified it exists
      } else {
        throw new Error("Authentication failed: No token received");
      }
    } catch (error) {
      functions.logger.error("Agilix authentication error:", error);
      throw error;
    }
  }

  /**
   * Make authenticated request to Agilix API
   */
  private async makeAuthenticatedRequest(
    endpoint: string,
    data: any,
    method: "GET" | "POST" | "PUT" | "DELETE" = "POST"
  ): Promise<any> {
    const token = await this.authenticate();
    
    const config = {
      headers: {
        "Authorization": `Bearer ${token}`,
      },
    };

    switch (method) {
    case "GET":
      return this.api.get(endpoint, config);
    case "POST":
      return this.api.post(endpoint, data, config);
    case "PUT":
      return this.api.put(endpoint, data, config);
    case "DELETE":
      return this.api.delete(endpoint, config);
    default:
      return this.api.post(endpoint, data, config);
    }
  }

  /**
   * Pass back grade to Agilix Buzz
   */
  async passbackGrade(gradeData: {
    userId: string;
    contextId: string;
    resourceLinkId: string;
    grade: number;
    maxGrade: number;
    timestamp: Date;
  }): Promise<boolean> {
    try {
      functions.logger.info("Attempting grade passback to Agilix", gradeData);

      // Note: This is a simplified implementation
      // The actual Agilix API endpoints and data structure may vary
      // You'll need to adjust based on Agilix's specific API documentation

      const passbackData = {
        cmd: "putgrades2",
        domain: this.config.domain,
        userid: gradeData.userId,
        contextid: gradeData.contextId,
        resourcelinkid: gradeData.resourceLinkId,
        grades: [{
          score: gradeData.grade,
          maxscore: gradeData.maxGrade,
          timestamp: gradeData.timestamp.toISOString(),
        }],
      };

      const response = await this.makeAuthenticatedRequest("/cmd", passbackData);

      if (response.data.response && response.data.response.code === "OK") {
        functions.logger.info("Grade passback successful", {
          userId: gradeData.userId,
          grade: gradeData.grade,
        });
        return true;
      } else {
        functions.logger.error("Grade passback failed", response.data);
        return false;
      }
    } catch (error) {
      functions.logger.error("Error passing back grade to Agilix:", error);
      return false;
    }
  }

  /**
   * Get user information from Agilix
   */
  async getUser(userId: string): Promise<any> {
    try {
      const userData = {
        cmd: "getuser",
        domain: this.config.domain,
        userid: userId,
      };

      const response = await this.makeAuthenticatedRequest("/cmd", userData);
      return response.data.response;
    } catch (error) {
      functions.logger.error(`Error fetching user ${userId} from Agilix:`, error);
      throw error;
    }
  }

  /**
   * Get course/context information
   */
  async getCourse(courseId: string): Promise<any> {
    try {
      const courseData = {
        cmd: "getcourse",
        domain: this.config.domain,
        courseid: courseId,
      };

      const response = await this.makeAuthenticatedRequest("/cmd", courseData);
      return response.data.response;
    } catch (error) {
      functions.logger.error(`Error fetching course ${courseId} from Agilix:`, error);
      throw error;
    }
  }

  /**
   * Get grade items for a course
   */
  async getGradeItems(courseId: string): Promise<AgilixGradeItem[]> {
    try {
      const gradeItemsData = {
        cmd: "listgradeitems",
        domain: this.config.domain,
        courseid: courseId,
      };

      const response = await this.makeAuthenticatedRequest("/cmd", gradeItemsData);
      
      if (response.data.response && response.data.response.gradeitems) {
        return response.data.response.gradeitems.map((item: any) => ({
          itemId: item.id,
          title: item.title,
          maxPoints: item.maxpoints || 100,
          weight: item.weight,
          category: item.category,
        }));
      }
      
      return [];
    } catch (error) {
      functions.logger.error(`Error fetching grade items for course ${courseId}:`, error);
      return [];
    }
  }

  /**
   * Create a new grade item
   */
  async createGradeItem(courseId: string, gradeItem: {
    title: string;
    maxPoints: number;
    weight?: number;
    category?: string;
  }): Promise<string | null> {
    try {
      const gradeItemData = {
        cmd: "putgradeitem",
        domain: this.config.domain,
        courseid: courseId,
        title: gradeItem.title,
        maxpoints: gradeItem.maxPoints,
        ...(gradeItem.weight && { weight: gradeItem.weight }),
        ...(gradeItem.category && { category: gradeItem.category }),
      };

      const response = await this.makeAuthenticatedRequest("/cmd", gradeItemData);
      
      if (response.data.response && response.data.response.itemid) {
        functions.logger.info(`Grade item created: ${response.data.response.itemid}`);
        return response.data.response.itemid;
      }
      
      return null;
    } catch (error) {
      functions.logger.error(`Error creating grade item in course ${courseId}:`, error);
      return null;
    }
  }

  /**
   * Get user grades for a course
   */
  async getUserGrades(courseId: string, userId: string): Promise<any[]> {
    try {
      const gradesData = {
        cmd: "getgrades2",
        domain: this.config.domain,
        courseid: courseId,
        userid: userId,
      };

      const response = await this.makeAuthenticatedRequest("/cmd", gradesData);
      return response.data.response?.grades || [];
    } catch (error) {
      functions.logger.error(`Error fetching grades for user ${userId} in course ${courseId}:`, error);
      return [];
    }
  }

  /**
   * Get enrollment information
   */
  async getEnrollment(courseId: string, userId: string): Promise<any> {
    try {
      const enrollmentData = {
        cmd: "getenrollment",
        domain: this.config.domain,
        courseid: courseId,
        userid: userId,
      };

      const response = await this.makeAuthenticatedRequest("/cmd", enrollmentData);
      return response.data.response;
    } catch (error) {
      functions.logger.error(`Error fetching enrollment for user ${userId} in course ${courseId}:`, error);
      return null;
    }
  }

  /**
   * List course enrollments
   */
  async getCourseEnrollments(courseId: string): Promise<any[]> {
    try {
      const enrollmentsData = {
        cmd: "listenrollments",
        domain: this.config.domain,
        courseid: courseId,
      };

      const response = await this.makeAuthenticatedRequest("/cmd", enrollmentsData);
      return response.data.response?.enrollments || [];
    } catch (error) {
      functions.logger.error(`Error fetching enrollments for course ${courseId}:`, error);
      return [];
    }
  }

  /**
   * Validate Agilix connection and credentials
   */
  async validateConnection(): Promise<boolean> {
    try {
      const token = await this.authenticate();
      return !!token;
    } catch (error) {
      functions.logger.error("Agilix connection validation failed:", error);
      return false;
    }
  }

  /**
   * Get domain information
   */
  async getDomainInfo(): Promise<any> {
    try {
      const domainData = {
        cmd: "getdomain",
        domain: this.config.domain,
      };

      const response = await this.makeAuthenticatedRequest("/cmd", domainData);
      return response.data.response;
    } catch (error) {
      functions.logger.error("Error fetching domain info:", error);
      return null;
    }
  }

  /**
   * Log activity in Agilix (for tracking purposes)
   */
  async logActivity(activityData: {
    userId: string;
    courseId: string;
    activity: string;
    description: string;
  }): Promise<boolean> {
    try {
      const logData = {
        cmd: "putactivity",
        domain: this.config.domain,
        userid: activityData.userId,
        courseid: activityData.courseId,
        activity: activityData.activity,
        description: activityData.description,
        timestamp: new Date().toISOString(),
      };

      const response = await this.makeAuthenticatedRequest("/cmd", logData);
      return response.data.response?.code === "OK";
    } catch (error) {
      functions.logger.error("Error logging activity to Agilix:", error);
      return false;
    }
  }
}
import axios, { AxiosInstance } from "axios";
import * as functions from "firebase-functions";
import { QualtricsResponse, QualtricsApiConfig } from "../types";

export class QualtricsService {
  private api: AxiosInstance;
  private config: QualtricsApiConfig;

  constructor() {
    this.config = {
      apiToken: functions.config().qualtrics?.api_token || process.env.QUALTRICS_API_TOKEN || "",
      baseUrl: functions.config().qualtrics?.base_url || process.env.QUALTRICS_BASE_URL || "https://iad1.qualtrics.com",
      brandId: functions.config().qualtrics?.brand_id || process.env.QUALTRICS_BRAND_ID,
      libraryId: functions.config().qualtrics?.library_id || process.env.QUALTRICS_LIBRARY_ID,
    };

    this.api = axios.create({
      baseURL: `${this.config.baseUrl}/API/v3`,
      headers: {
        "X-API-TOKEN": this.config.apiToken,
        "Content-Type": "application/json",
      },
      timeout: 30000,
    });

    this.api.interceptors.response.use(
      (response) => response,
      (error) => {
        functions.logger.error("Qualtrics API Error:", {
          status: error.response?.status,
          data: error.response?.data,
          url: error.config?.url,
        });
        throw error;
      }
    );
  }

  /**
   * Verify that a survey exists and is accessible
   */
  async verifySurvey(surveyId: string): Promise<boolean> {
    try {
      const response = await this.api.get(`/surveys/${surveyId}`);
      return response.status === 200 && response.data.result;
    } catch (error) {
      functions.logger.error(`Error verifying survey ${surveyId}:`, error);
      return false;
    }
  }

  /**
   * Get survey details
   */
  async getSurvey(surveyId: string): Promise<any> {
    try {
      const response = await this.api.get(`/surveys/${surveyId}`);
      return response.data.result;
    } catch (error) {
      functions.logger.error(`Error fetching survey ${surveyId}:`, error);
      throw error;
    }
  }

  /**
   * Create a distribution for a survey
   */
  async createDistribution(
    surveyId: string,
    description: string,
    options: {
      surveyLinkType?: string;
      linkExpirationDate?: string;
      linkSecurityThreatProtection?: boolean;
    } = {}
  ): Promise<string> {
    try {
      const distributionData = {
        surveyId,
        linkType: options.surveyLinkType || "Individual",
        description,
        action: "CreateDistribution",
        expirationDate: options.linkExpirationDate,
        linkSecurityThreatProtection: options.linkSecurityThreatProtection ?? true,
      };

      const response = await this.api.post("/distributions", distributionData);
      
      if (response.data.result && response.data.result.id) {
        functions.logger.info(`Distribution created: ${response.data.result.id}`);
        return response.data.result.id;
      } else {
        throw new Error("Failed to create distribution: No ID returned");
      }
    } catch (error) {
      functions.logger.error(`Error creating distribution for survey ${surveyId}:`, error);
      throw error;
    }
  }

  /**
   * Generate a survey link for a specific user
   */
  async generateSurveyLink(
    surveyId: string,
    distributionId: string,
    embeddedData: Record<string, string> = {}
  ): Promise<string> {
    try {
      const linkData = {
        surveyId,
        distributionId,
        embeddedData: {
          ...embeddedData,
          source: "LTI",
          timestamp: new Date().toISOString(),
        },
        linkType: "Individual",
      };

      const response = await this.api.post(`/distributions/${distributionId}/links`, linkData);
      
      if (response.data.result && response.data.result.link) {
        return response.data.result.link;
      } else {
        // Fallback to basic survey link if distribution link fails
        const baseUrl = `${this.config.baseUrl}/jfe/form/${surveyId}`;
        const params = new URLSearchParams();
        
        Object.entries(embeddedData).forEach(([key, value]) => {
          params.append(key, value);
        });
        
        return params.toString() ? `${baseUrl}?${params.toString()}` : baseUrl;
      }
    } catch (error) {
      functions.logger.error(`Error generating survey link for ${surveyId}:`, error);
      
      // Fallback to basic survey link
      const baseUrl = `${this.config.baseUrl}/jfe/form/${surveyId}`;
      const params = new URLSearchParams();
      
      Object.entries(embeddedData).forEach(([key, value]) => {
        params.append(key, value);
      });
      
      return params.toString() ? `${baseUrl}?${params.toString()}` : baseUrl;
    }
  }

  /**
   * Get survey responses
   */
  async getSurveyResponses(
    surveyId: string,
    options: {
      limit?: number;
      skipInProgress?: boolean;
      format?: "json" | "csv";
    } = {}
  ): Promise<QualtricsResponse[]> {
    try {
      const params = new URLSearchParams({
        format: options.format || "json",
        ...(options.limit && { limit: options.limit.toString() }),
        ...(options.skipInProgress && { skipInProgress: "true" }),
      });

      const response = await this.api.get(`/surveys/${surveyId}/responses?${params.toString()}`);
      
      if (response.data.result && response.data.result.responses) {
        return response.data.result.responses.map((resp: any) => ({
          responseId: resp.responseId,
          surveyId: resp.surveyId,
          recorded: resp.recordedDate,
          finished: resp.finished === 1 || resp.finished === true,
          progress: resp.progress || 0,
          duration: resp.duration || 0,
          values: resp.values || {},
        }));
      }
      
      return [];
    } catch (error) {
      functions.logger.error(`Error fetching responses for survey ${surveyId}:`, error);
      throw error;
    }
  }

  /**
   * Get a specific survey response
   */
  async getSurveyResponse(surveyId: string, responseId: string): Promise<QualtricsResponse | null> {
    try {
      const response = await this.api.get(`/surveys/${surveyId}/responses/${responseId}`);
      
      if (response.data.result) {
        const resp = response.data.result;
        return {
          responseId: resp.responseId,
          surveyId: resp.surveyId,
          recorded: resp.recordedDate,
          finished: resp.finished === 1 || resp.finished === true,
          progress: resp.progress || 0,
          duration: resp.duration || 0,
          values: resp.values || {},
        };
      }
      
      return null;
    } catch (error) {
      functions.logger.error(`Error fetching response ${responseId} for survey ${surveyId}:`, error);
      return null;
    }
  }

  /**
   * Get multiple survey responses
   */
  async getResponses(
    surveyId: string,
    options: {
      startDate?: string;
      endDate?: string;
      finished?: boolean;
      limit?: number;
    } = {}
  ): Promise<QualtricsResponse[]> {
    try {
      const params = new URLSearchParams();
      if (options.startDate) params.append("startDate", options.startDate);
      if (options.endDate) params.append("endDate", options.endDate);
      if (options.finished !== undefined) params.append("finished", options.finished.toString());
      if (options.limit) params.append("limit", options.limit.toString());
      
      const response = await this.api.get(`/surveys/${surveyId}/responses?${params.toString()}`);
      
      if (response.data.result && response.data.result.elements) {
        return response.data.result.elements.map((resp: any) => ({
          responseId: resp.responseId,
          surveyId: resp.surveyId,
          recorded: resp.recordedDate,
          finished: resp.finished === 1 || resp.finished === true,
          progress: resp.progress || 0,
          duration: resp.duration || 0,
          values: resp.values || {},
        }));
      }
      
      return [];
    } catch (error) {
      functions.logger.error(`Error fetching responses for survey ${surveyId}:`, error);
      throw error;
    }
  }

  /**
   * Create a new survey from template
   */
  async createSurveyFromTemplate(
    templateId: string,
    name: string,
    options: {
      brandId?: string;
      libraryId?: string;
    } = {}
  ): Promise<string> {
    try {
      const surveyData = {
        SurveyName: name,
        Language: "EN",
        ProjectCategory: "CORE",
        ...(options.brandId && { BrandId: options.brandId }),
        ...(options.libraryId && { LibraryId: options.libraryId }),
      };

      const response = await this.api.post("/survey-definitions", surveyData);
      
      if (response.data.result && response.data.result.SurveyID) {
        functions.logger.info(`Survey created: ${response.data.result.SurveyID}`);
        return response.data.result.SurveyID;
      } else {
        throw new Error("Failed to create survey: No ID returned");
      }
    } catch (error) {
      functions.logger.error(`Error creating survey from template ${templateId}:`, error);
      throw error;
    }
  }

  /**
   * Get survey questions
   */
  async getSurveyQuestions(surveyId: string): Promise<any[]> {
    try {
      const response = await this.api.get(`/surveys/${surveyId}/questions`);
      return response.data.result?.elements || [];
    } catch (error) {
      functions.logger.error(`Error fetching questions for survey ${surveyId}:`, error);
      throw error;
    }
  }

  /**
   * Update survey status (activate/deactivate)
   */
  async updateSurveyStatus(surveyId: string, isActive: boolean): Promise<boolean> {
    try {
      const response = await this.api.put(`/surveys/${surveyId}`, {
        isActive,
      });
      
      return response.status === 200;
    } catch (error) {
      functions.logger.error(`Error updating survey status ${surveyId}:`, error);
      return false;
    }
  }

  /**
   * Delete a survey
   */
  async deleteSurvey(surveyId: string): Promise<boolean> {
    try {
      const response = await this.api.delete(`/surveys/${surveyId}`);
      return response.status === 200;
    } catch (error) {
      functions.logger.error(`Error deleting survey ${surveyId}:`, error);
      return false;
    }
  }

  /**
   * Get distribution history
   */
  async getDistributionHistory(surveyId: string): Promise<any[]> {
    try {
      const response = await this.api.get(`/surveys/${surveyId}/distributions`);
      return response.data.result?.elements || [];
    } catch (error) {
      functions.logger.error(`Error fetching distribution history for survey ${surveyId}:`, error);
      return [];
    }
  }

  /**
   * Get response export file
   */
  async exportSurveyResponses(
    surveyId: string,
    format: "csv" | "json" | "spss" = "csv"
  ): Promise<string> {
    try {
      // Start export process
      const exportResponse = await this.api.post(`/surveys/${surveyId}/export-responses`, {
        format,
        compress: false,
      });

      const progressId = exportResponse.data.result.progressId;

      // Poll for completion
      let isComplete = false;
      
      while (!isComplete) {
        await new Promise(resolve => setTimeout(resolve, 1000)); // Wait 1 second
        
        const progressResponse = await this.api.get(`/surveys/${surveyId}/export-responses/${progressId}`);
        const status = progressResponse.data.result.status;
        
        if (status === "complete") {
          isComplete = true;
        } else if (status === "failed") {
          throw new Error("Export failed");
        }
      }

      // Get download URL
      const fileResponse = await this.api.get(`/surveys/${surveyId}/export-responses/${progressId}/file`);
      return fileResponse.data.result.downloadUrl;
      
    } catch (error) {
      functions.logger.error(`Error exporting responses for survey ${surveyId}:`, error);
      throw error;
    }
  }
}
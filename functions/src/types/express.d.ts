import { UserSession } from "./index";

declare global {
  namespace Express {
    interface Request {
      userSession?: UserSession;
    }
  }
}
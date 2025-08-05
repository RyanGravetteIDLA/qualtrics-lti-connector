declare module "ltijs" {
  import { Request, Response, NextFunction } from "express";

  export interface LTIProviderOptions {
    appRoute?: string;
    loginRoute?: string;
    keysetRoute?: string;
    staticPath?: string;
    cookies?: {
      secure?: boolean;
      sameSite?: "Strict" | "Lax" | "None";
    };
    devMode?: boolean;
  }

  export interface LTISetupOptions {
    url?: string;
  }

  export interface LTIToken {
    platformContext?: {
      deep_linking_settings?: {
        deep_link_return_url: string;
      };
    };
    [key: string]: any;
  }

  export type LTIConnectCallback = (
    token: LTIToken,
    req: Request,
    res: Response,
    next: NextFunction
  ) => Promise<any> | any;
  export type LTIDeepLinkingCallback = (
    token: LTIToken,
    req: Request,
    res: Response,
    next: NextFunction
  ) => Promise<any> | any;

  export interface LTIRedirectOptions {
    message?: string;
    [key: string]: any;
  }

  export class Provider {
    constructor(encryptionKey: string, options?: LTIProviderOptions);

    setup(databaseUrl: string, setupOptions?: LTISetupOptions, dbOptions?: any): void;

    onConnect(callback: LTIConnectCallback): void;

    onDeepLinking(callback: LTIDeepLinkingCallback): void;

    deploy(options?: { serverless?: boolean }): Promise<void>;

    loginRequest(req: Request, res: Response): any;

    appLaunch(req: Request, res: Response): any;

    keysetRequest(req: Request, res: Response): any;

    verifyIdToken(idToken: string): Promise<LTIToken | null>;

    redirect(res: Response, url: string, options?: LTIRedirectOptions): any;
  }
}
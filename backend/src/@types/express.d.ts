declare namespace Express {
  export interface Request {
    admin: {
      id: string;
      email: string;
    };
    user: {
      id: string;
      email: string;
      store_id: string;
      profile_id: string;
    };
  }
}

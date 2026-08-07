import { DefaultSession } from "next-auth";

declare module "next-auth" {
  interface Session {
    user: {
      id: string;
      role: "ADMIN" | "SHARED" | "STAFF";
    } & DefaultSession["user"];
  }

  interface User {
    role?: "ADMIN" | "SHARED" | "STAFF";
  }
}

declare module "@auth/core/jwt" {
  interface JWT {
    id: string;
    role: "ADMIN" | "SHARED" | "STAFF";
  }
}

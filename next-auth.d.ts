import { DefaultSession } from "next-auth";

declare module "next-auth" {
  interface Session {
    user: {
      id: string;
      role: "ADMIN" | "SHARED";
    } & DefaultSession["user"];
  }

  interface User {
    role?: "ADMIN" | "SHARED";
  }
}

declare module "@auth/core/jwt" {
  interface JWT {
    id: string;
    role: "ADMIN" | "SHARED";
  }
}

"use server";
import { signIn } from "@/auth";



export async function sing_gogel() {
  await signIn("google", { redirectTo: "/dashboard" });
}



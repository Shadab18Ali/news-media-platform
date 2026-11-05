"use client";
import { useEffect } from "react";
import { recordView } from "@/app/(site)/actions";

export function ViewCounter({ articleId }: { articleId: string }) {
  useEffect(() => {
    void recordView(articleId).catch(() => {});
  }, [articleId]);
  return null;
}

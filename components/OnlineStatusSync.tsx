"use client";

import { useUser } from "@clerk/nextjs";
import { useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import { useEffect } from "react";

export default function OnlineStatusSync() {
  const { user, isLoaded } = useUser();
  const setOnlineStatus = useMutation(api.users.setOnlineStatus);

  useEffect(() => {
    if (!isLoaded || !user) return;

    // Mark as online when component mounts
    setOnlineStatus({ clerkId: user.id, isOnline: true });

    // Mark as offline when tab closes or user navigates away
    const handleOffline = () => {
      setOnlineStatus({ clerkId: user.id, isOnline: false });
    };

    window.addEventListener("beforeunload", handleOffline);
    document.addEventListener("visibilitychange", () => {
      if (document.visibilityState === "hidden") handleOffline();
      else setOnlineStatus({ clerkId: user.id, isOnline: true });
    });

    return () => {
      window.removeEventListener("beforeunload", handleOffline);
    };
  }, [isLoaded, user, setOnlineStatus]);

  return null;
}
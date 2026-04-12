import React from "react";
import { toast } from "sonner";

export const openViber = (phoneNumbers: string = "9489477144", shareMessage: string = "Check this out") => {
  const fullText = shareMessage;
  const encodedMessage = encodeURIComponent(fullText);
  const isMobile = /Android|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);

  // Safe clipboard copy — works on HTTPS; silently skips on HTTP
  const tryCopy = () => {
    try {
      if (navigator.clipboard?.writeText) {
        navigator.clipboard.writeText(fullText).catch(() => {});
      } else {
        // Fallback for HTTP / non-secure contexts
        const el = document.createElement("textarea");
        el.value = fullText;
        el.style.position = "fixed";
        el.style.opacity = "0";
        document.body.appendChild(el);
        el.select();
        document.execCommand("copy");
        document.body.removeChild(el);
      }
    } catch { }
  };

  const numbersArray = phoneNumbers.split(",").map(n => n.trim().replace("+", "")).filter(Boolean);

  if (phoneNumbers && phoneNumbers.length >= 10) {
    if (isMobile) {
      window.location.href = `viber://forward?text=${encodedMessage}&contacts=${numbersArray.join(",")}`;
    } else {
      window.location.href = `viber://chat?number=${phoneNumbers.replace("+", "")}`;
      tryCopy();
      setTimeout(() => {
        toast.info("Message copied! Paste it in the Viber window that just opened.");
      }, 800);
    }
  } else {
    window.location.href = `viber://forward?text=${encodedMessage}`;
    tryCopy();
    toast.info("Viber should open now.");
  }
};

export const VIBER_COLOR = "#7360F2";

export const ViberIcon: React.FC<{ size?: number, className?: string }> = ({ size = 18, className = "" }) => {
  return (
    <img
      src="/logo.png"
      alt="Website Logo"
      style={{ width: size, height: size, objectFit: "contain" }}
      className={className}
    />
  );
};

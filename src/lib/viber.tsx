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
    <svg 
      width={size} 
      height={size} 
      viewBox="0 0 24 24" 
      fill="currentColor" 
      xmlns="http://www.w3.org/2000/svg" 
      className={className}
    >
      <path d="M19.982 11.238c-.027-.333-.087-.665-.181-.989-.838-2.884-3.155-5.011-6.101-5.617a8.472 8.472 0 0 0-1.639-.148c-.282 0-.399.117-.399.397 0 .285.004.571.01.856.009.431.258.683.66.758a6.568 6.568 0 0 1 2.825 1.096 6.368 6.368 0 0 1 2.502 3.011c.211.533.328 1.099.366 1.674.025.378.307.65.688.66.275.007.551.01.825.006.312-.005.454-.127.444-.704zm-3.087.037c-.015-.298-.052-.593-.119-.882-.444-1.921-1.925-3.324-3.874-3.668-.358-.063-.728-.093-1.094-.108-.28-.011-.422.096-.425.385-.005.289-.001.579-.001.868 0 .275.086.376.353.407a4.673 4.673 0 0 1 2.376 1.019 4.664 4.664 0 0 1 1.634 2.155 4.965 4.965 0 0 1 .23 1.255c.012.274.125.381.396.384.28.003.559.001.839 0 .281-.001.391-.12.385-.386V11.275zm-3.023.019c0-.442-.093-.846-.285-1.22-.529-1.03-1.428-1.558-2.585-1.553-.338.001-.473.111-.474.444-.002.327.001.654-.005.981-.004.225.076.324.316.347 1.066.1 1.705.803 1.688 1.849-.004.269.112.383.385.386.32.003.639.001.959 0 .265-.001.365-.1.385-.363.007-.093.008-.186.008-.28v-.591zm6.059-1.206c-.156-1.572-.733-2.996-1.745-4.161A9.799 9.799 0 0 0 14.1 2.684a10.605 10.605 0 0 0-5.111-1.026c-3.13.253-5.592 1.838-7.228 4.629-1.421 2.424-1.787 5.163-1.077 7.915.275 1.065.736 2.054 1.34 2.969.317.48.337 1.039.213 1.583-.178.784-.448 1.545-.694 2.309-.166.516-.341 1.029-.533 1.536-.07.185-.157.363-.223.549-.074.208-.046.417.118.577.164.16.37.195.572.128 1.306-.43 2.583-.923 3.844-1.455.518-.219.996-.134 1.488.066 3.161 1.285 6.416 1.155 9.479-.313 3.197-1.533 5.183-4.17 5.76-7.66.195-1.18.232-2.378.114-3.565v-.817z" />
    </svg>
  );
};

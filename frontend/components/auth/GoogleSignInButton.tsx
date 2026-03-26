"use client";

import { useEffect, useRef } from "react";

interface Props {
  onCredential: (idToken: string) => void;
}

declare global {
  interface Window {
    google?: {
      accounts: {
        id: {
          initialize: (config: object) => void;
          renderButton: (element: HTMLElement, config: object) => void;
        };
      };
    };
  }
}

export function GoogleSignInButton({ onCredential }: Props) {
  const divRef = useRef<HTMLDivElement>(null);
  const clientId = process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID;
  const onCredentialRef = useRef(onCredential);
  useEffect(() => {
    onCredentialRef.current = onCredential;
  }, [onCredential]);

  useEffect(() => {
    if (!clientId) return;

    function initButton() {
      if (!window.google || !divRef.current) return;
      window.google.accounts.id.initialize({
        client_id: clientId,
        callback: (response: { credential: string }) => {
          onCredentialRef.current(response.credential);
        },
      });
      window.google.accounts.id.renderButton(divRef.current, {
        theme: "filled_black",
        size: "large",
        width: 320,
        text: "continue_with",
      });
    }

    // If GSI script already loaded, init immediately
    if (window.google) {
      initButton();
      return;
    }

    // Otherwise load the script then init
    const script = document.createElement("script");
    script.src = "https://accounts.google.com/gsi/client";
    script.async = true;
    script.defer = true;
    script.onload = initButton;
    document.head.appendChild(script);

    return () => {
      // Script stays in DOM for page reuse — no cleanup needed
    };
  }, [clientId]); // onCredential intentionally excluded — ref above handles updates

  if (!clientId) return null;

  return <div ref={divRef} />;
}

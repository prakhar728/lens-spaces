"use client";

import Link from "next/link";
import { Button } from "@/components/ui/button";
import { LensSpacesLogo } from "@/components/lens-spaces-logo";
import { getLensClient } from "@/lib/lens/client";
import { fetchAccount } from "@lens-protocol/client/actions";
import { Login } from "./login";
import { useEffect, useState } from "react";

interface NavbarProps {
  showWalletConnect?: boolean;
}

export function Navbar({ showWalletConnect = false }: NavbarProps) {
  const [account, setAccount] = useState(null);

  useEffect(() => {
    async function getAuthenticatedAccount() {
      const client = await getLensClient();
      if (!client.isSessionClient()) return;

      const user = client.getAuthenticatedUser().unwrapOr(null);
      if (!user) return;

      const account = fetchAccount(client, {
        address: user.address,
      }).unwrapOr(null);

      setAccount(account);
    }

    getAuthenticatedAccount();
  }, []);

  return (
    <header className="fixed top-0 left-0 right-0 z-50 bg-background/80 backdrop-blur-md border-b">
      <div className="container flex h-16 items-center justify-between">
        <Link href="/" className="flex items-center gap-2">
          <LensSpacesLogo className="h-8 w-8" />
          <span className="font-semibold text-lg hidden sm:inline-block">
            Lens Spaces
          </span>
        </Link>

        <Login />
      </div>
    </header>
  );
}

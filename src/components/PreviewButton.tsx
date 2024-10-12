"use client";

import Link from "next/link";
import { Button } from "./ui/button";

export const PreviewButton = () => {
  return (
    <Button asChild className="bg-orange-500 w-fit">
      <Link href="/dashboard">Preview</Link>
    </Button>
  );
};

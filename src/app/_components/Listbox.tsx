import dynamic from "next/dynamic";
import React from "react";

const ListboxClient = dynamic(() => import("./Listbox.client").then((m) => m.default || m), {
  ssr: false,
  // Render a minimal placeholder while the client bundle loads to avoid invalid element types
  loading: () => <div className="w-full" />,
});

export default function Listbox(props: any) {
  // Defensive: if dynamic loader somehow returns null/undefined, render a harmless placeholder
  if (!ListboxClient) return <div className="w-full" />;
  return <ListboxClient {...props} />;
}

import dynamic from "next/dynamic";
import React from "react";

const ListboxClient = dynamic(() => import("./Listbox.client").then((m) => m.default || m), {
  ssr: false,
  // Render a minimal placeholder while the client bundle loads to avoid invalid element types
  loading: () => <div className="w-full" />,
});

export default function Listbox(props: any) {
  const dropdownListStyle = { position: "absolute" as const, zIndex: 9999, top: "100%", left: 0, right: 0 };

  // Defensive: if dynamic loader somehow returns null/undefined, render a harmless placeholder
  if (!ListboxClient) return <div className="relative w-full" style={{ position: "relative" }} />;
  return (
    <div className="relative w-full" style={{ position: "relative" }}>
      <ListboxClient {...props} dropdownListStyle={dropdownListStyle} />
    </div>
  );
}

import dynamic from "next/dynamic";

const ListboxClient = dynamic(() => import("./Listbox.client"), { ssr: false });

export default function Listbox(props: any) {
  return <ListboxClient {...props} />;
}

import { LoaderCircle } from "lucide-react";

export default function Loader () {

  return <div className="p-2 rounded-md border-2 row space-x-4 w-32 justify-center mx-auto my-16">
    <LoaderCircle className="animate-spin" />
    <p>Loading</p>
  </div>
}

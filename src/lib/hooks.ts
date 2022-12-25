import { useEffect, useState } from "react";
import { useRouter } from "./provider";

export const useLocation = () => {
  const router = useRouter();
  const [location, setLocation] = useState(router.location);
  useEffect(() => router.listen(loc => setLocation(loc)), [router]);
  return location;
};

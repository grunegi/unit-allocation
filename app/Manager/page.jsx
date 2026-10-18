import { AuthProvider } from "../components/AuthProvider";
import UnitAllocationApp from "../components/UnitAllocationApp";
import { getInitialData } from "../Js/actions";

export const dynamic = "force-dynamic";

export default async function ManagerPage() {
  const initialData = await getInitialData();

  return (
    <AuthProvider>
      <UnitAllocationApp initialData={initialData} />
    </AuthProvider>
  );
}
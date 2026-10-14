import { getInitialData } from "../Js/actions";
import UnitAllocationApp from "../components/UnitAllocationApp";

export const dynamic = "force-dynamic";

export default async function Managerpage() {

  const result = await getInitialData();
  return <UnitAllocationApp initialData={result} />;
}
import { useAppSelector } from "../redux/hooks";
import { RootState } from "../redux/store";

export const Home = () => {
  const userData = useAppSelector((state: RootState) => state.auth.user);
  return (
    <div className="container mx-auto p-4">
      <h3 className="text-base/7 font-semibold text-gray-900">Home</h3>
      <div className="flex justify-between items-center mb-4">
        <p className="mt-1 max-w-2xl text-sm/6 text-gray-500">
          Hi, {userData?.email}!
        </p>
      </div>
    </div>
  );
};

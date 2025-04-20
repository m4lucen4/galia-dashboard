import { useAppSelector } from "../redux/hooks";
import { RootState } from "../redux/store";

export const Home = () => {
  const user = useAppSelector((state: RootState) => state.auth.user);
  console.log(user);
  return <div>Este es el home</div>;
};

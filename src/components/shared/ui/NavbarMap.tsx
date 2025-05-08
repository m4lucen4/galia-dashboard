import { Disclosure } from "@headlessui/react";
import { RootState } from "../../../redux/store";
import { Link } from "react-router-dom";
import { useAppSelector } from "../../../redux/hooks";

import logoImage from "../../../assets/mocklab-bw.png";

export default function NavbarMap() {
  const userData = useAppSelector((state: RootState) => state.auth.user);

  return (
    <Disclosure as="nav" className="bg-black">
      <div className="mx-auto container px-2 sm:px-6 lg:px-8">
        <div className="relative flex h-16 items-center justify-between">
          <div className="flex flex-1 items-center justify-center sm:items-stretch sm:justify-start">
            <div className="flex shrink-0 items-center justify-center mr-16">
              <img src={logoImage} alt="Logo" className="h-8 w-auto" />
            </div>
          </div>
          <div className="absolute inset-y-0 right-0 flex items-center pr-2 sm:static sm:inset-auto sm:ml-6 sm:pr-0">
            {userData ? (
              <Link
                to="/projects"
                className="text-gray-300 hover:bg-gray-700 hover:text-white rounded-md px-3 py-2 text-sm font-medium"
              >
                Go projects
              </Link>
            ) : (
              <Link
                to="/login"
                className="text-gray-300 hover:bg-gray-700 hover:text-white rounded-md px-3 py-2 text-sm font-medium"
              >
                Login
              </Link>
            )}
          </div>
        </div>
      </div>
    </Disclosure>
  );
}

import { useEffect } from "react";
import { useAppDispatch, useAppSelector } from "../redux/hooks";
import {
  checkInstagramConnection,
} from "../redux/actions/SocialNetworksActions";

// Connection health and pages come from social_connections (no tokens in the browser).
export const useInstagramPages = () => {
  const dispatch = useAppDispatch();
  const { instagram, facebook, checkInstagramRequest, fetchInstagramPagesRequest } =
    useAppSelector((state) => state.socialNetworks);

  useEffect(() => {
    dispatch(checkInstagramConnection());
  }, [dispatch]);

  return {
    instagram,
    facebook,
    isCheckingConnection: checkInstagramRequest.inProgress,
    isFetchingInstagramPages: fetchInstagramPagesRequest.inProgress,
    connectionError: checkInstagramRequest.messages,
    pagesError: fetchInstagramPagesRequest.messages,
  };
};

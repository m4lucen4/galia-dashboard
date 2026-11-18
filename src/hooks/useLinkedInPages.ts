import { useEffect } from "react";
import { useAppDispatch, useAppSelector } from "../redux/hooks";
import {
  checkLinkedInConnection,
} from "../redux/actions/SocialNetworksActions";

// Connection health and pages come from social_connections (no tokens in the browser).
export const useLinkedInPages = () => {
  const dispatch = useAppDispatch();
  const { linkedin, checkLinkedInRequest, fetchLinkedInPagesRequest } =
    useAppSelector((state) => state.socialNetworks);

  useEffect(() => {
    dispatch(checkLinkedInConnection());
  }, [dispatch]);

  return {
    linkedin,
    isCheckingConnection: checkLinkedInRequest.inProgress,
    isFetchingLinkedinPages: fetchLinkedInPagesRequest.inProgress,
    connectionError: checkLinkedInRequest.messages,
    pagesError: fetchLinkedInPagesRequest.messages,
  };
};

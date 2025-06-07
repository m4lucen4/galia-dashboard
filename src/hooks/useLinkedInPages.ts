import { useEffect } from "react";
import { useAppDispatch, useAppSelector } from "../redux/hooks";
import {
  checkLinkedInConnection,
  fetchLinkedInPages,
} from "../redux/actions/SocialNetworksActions";

export const useLinkedInPages = () => {
  const dispatch = useAppDispatch();
  const { linkedin, checkLinkedInRequest, fetchLinkedInPagesRequest } =
    useAppSelector((state) => state.socialNetworks);

  useEffect(() => {
    dispatch(checkLinkedInConnection());
  }, [dispatch]);

  useEffect(() => {
    if (
      linkedin.isConnected &&
      (!linkedin.adminPages || linkedin.adminPages.length === 0)
    ) {
      dispatch(fetchLinkedInPages({ isConnected: linkedin.isConnected }));
    }
  }, [dispatch, linkedin.isConnected, linkedin.adminPages]);

  return {
    linkedin,
    isCheckingConnection: checkLinkedInRequest.inProgress,
    isFetchingLinkedinPages: fetchLinkedInPagesRequest.inProgress,
    connectionError: checkLinkedInRequest.messages,
    pagesError: fetchLinkedInPagesRequest.messages,
  };
};

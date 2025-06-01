import { useEffect } from "react";
import { useAppDispatch, useAppSelector } from "../redux/hooks";
import {
  checkInstagramConnection,
  fetchInstagramPages,
} from "../redux/actions/SocialNetworksActions";

export const useInstagramPages = () => {
  const dispatch = useAppDispatch();
  const { instagram, checkInstagramRequest, fetchInstagramPagesRequest } =
    useAppSelector((state) => state.socialNetworks);

  useEffect(() => {
    dispatch(checkInstagramConnection());
  }, [dispatch]);

  useEffect(() => {
    if (
      instagram.isConnected &&
      (!instagram.businessPages || instagram.businessPages.length === 0)
    ) {
      dispatch(fetchInstagramPages({ isConnected: instagram.isConnected }));
    }
  }, [dispatch, instagram.isConnected, instagram.businessPages]);

  return {
    instagram,
    isCheckingConnection: checkInstagramRequest.inProgress,
    isFetchingPages: fetchInstagramPagesRequest.inProgress,
    connectionError: checkInstagramRequest.messages,
    pagesError: fetchInstagramPagesRequest.messages,
  };
};

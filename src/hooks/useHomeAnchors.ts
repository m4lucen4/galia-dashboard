import { useEffect } from "react";
import { useAppDispatch, useAppSelector } from "../redux/hooks";
import { fetchHomeAnchors } from "../redux/actions/SiteComponentActions";

export function useHomeAnchors(siteId: string) {
  const dispatch = useAppDispatch();
  const { components, homeAnchors, homeAnchorSiteId, homeAnchorRequest } = useAppSelector((state) => state.siteComponent);
  // Editing, hiding, adding or deleting a block refreshes options without fetching
  // into the active editor's components array. Request IDs discard late responses.
  useEffect(() => {
    if (siteId) dispatch(fetchHomeAnchors(siteId));
  }, [dispatch, siteId, components]);
  return {
    anchors: homeAnchorSiteId === siteId ? homeAnchors : [],
    request: homeAnchorRequest,
    refresh: () => dispatch(fetchHomeAnchors(siteId)),
  };
}

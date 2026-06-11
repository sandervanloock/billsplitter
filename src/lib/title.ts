import { useEffect } from 'react';

const APP = 'BillSplit';
const DEFAULT_TITLE = 'BillSplit — Split a restaurant bill in seconds';

/** Sets document.title for the screen; restores the default on unmount.
 *  Pass undefined while data is loading to keep the default title. */
export function usePageTitle(title: string | undefined) {
  useEffect(() => {
    document.title = title ? `${title} · ${APP}` : DEFAULT_TITLE;
    return () => {
      document.title = DEFAULT_TITLE;
    };
  }, [title]);
}

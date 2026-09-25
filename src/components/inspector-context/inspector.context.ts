import { createContext, useContext } from 'react';
import { InspectorContextValue } from './inspector-context.types';

export const InspectorContext = createContext<InspectorContextValue>({
  viewLogs: () => {},
  describePod: () => {},
});

export const useInspectorContext = () => useContext(InspectorContext);

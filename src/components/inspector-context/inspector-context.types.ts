export interface InspectorContextValue {
  viewLogs: (pod: string, container?: string) => void;
  describePod: (pod: string) => void;
}

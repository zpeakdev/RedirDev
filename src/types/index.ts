export interface RuleConfig {
  id: string;
  matchUrl: string;
  redirectUrl: string;
}

export interface StoredState {
  enabled: boolean;
  rules: RuleConfig[];
}

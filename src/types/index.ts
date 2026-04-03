export interface RuleConfig {
  id: string;
  matchUrl: string;
  redirectUrl: string;
  enabled: boolean;
}

export interface StoredState {
  enabled: boolean;
  rules: RuleConfig[];
}

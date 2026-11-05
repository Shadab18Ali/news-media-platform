export interface ActionState {
  ok?: boolean;
  message?: string;
  errors?: Record<string, string[] | undefined>;
  /** Id of the created/updated record, when relevant. */
  id?: string;
}
export const idleState: ActionState = {};

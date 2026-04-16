/**
 * Public barrel for application-layer error helpers. These depend on
 * application/presentation types (Notice, WorkflowResult) and should not
 * be imported from `core/`.
 *
 * @category Application
 */
export { presentAppError } from "./present";
export { catchApiError } from "./catchApiError";

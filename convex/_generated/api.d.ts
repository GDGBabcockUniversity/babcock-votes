/* eslint-disable */
/**
 * Generated `api` utility.
 *
 * THIS CODE IS AUTOMATICALLY GENERATED.
 *
 * To regenerate, run `npx convex dev`.
 * @module
 */

import type * as admin from "../admin.js";
import type * as analytics from "../analytics.js";
import type * as auth from "../auth.js";
import type * as candidates from "../candidates.js";
import type * as elections from "../elections.js";
import type * as eligibleVoters from "../eligibleVoters.js";
import type * as files from "../files.js";
import type * as http from "../http.js";
import type * as identitySignIn from "../identitySignIn.js";
import type * as lib_access from "../lib/access.js";
import type * as lib_analyticsSummary from "../lib/analyticsSummary.js";
import type * as lib_authCallbacks from "../lib/authCallbacks.js";
import type * as lib_ballot from "../lib/ballot.js";
import type * as lib_election from "../lib/election.js";
import type * as lib_identitySignIn from "../lib/identitySignIn.js";
import type * as lib_tally from "../lib/tally.js";
import type * as lib_validate from "../lib/validate.js";
import type * as ops from "../ops.js";
import type * as positions from "../positions.js";
import type * as registration from "../registration.js";
import type * as users from "../users.js";
import type * as votes from "../votes.js";

import type {
  ApiFromModules,
  FilterApi,
  FunctionReference,
} from "convex/server";

declare const fullApi: ApiFromModules<{
  admin: typeof admin;
  analytics: typeof analytics;
  auth: typeof auth;
  candidates: typeof candidates;
  elections: typeof elections;
  eligibleVoters: typeof eligibleVoters;
  files: typeof files;
  http: typeof http;
  identitySignIn: typeof identitySignIn;
  "lib/access": typeof lib_access;
  "lib/analyticsSummary": typeof lib_analyticsSummary;
  "lib/authCallbacks": typeof lib_authCallbacks;
  "lib/ballot": typeof lib_ballot;
  "lib/election": typeof lib_election;
  "lib/identitySignIn": typeof lib_identitySignIn;
  "lib/tally": typeof lib_tally;
  "lib/validate": typeof lib_validate;
  ops: typeof ops;
  positions: typeof positions;
  registration: typeof registration;
  users: typeof users;
  votes: typeof votes;
}>;

/**
 * A utility for referencing Convex functions in your app's public API.
 *
 * Usage:
 * ```js
 * const myFunctionReference = api.myModule.myFunction;
 * ```
 */
export declare const api: FilterApi<
  typeof fullApi,
  FunctionReference<any, "public">
>;

/**
 * A utility for referencing Convex functions in your app's internal API.
 *
 * Usage:
 * ```js
 * const myFunctionReference = internal.myModule.myFunction;
 * ```
 */
export declare const internal: FilterApi<
  typeof fullApi,
  FunctionReference<any, "internal">
>;

export declare const components: {};
